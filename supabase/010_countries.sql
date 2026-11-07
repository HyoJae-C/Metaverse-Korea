-- Which countries players play from, for operators only (admin.html →
-- Overview → Countries).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 005_operators.sql (operators) and 009_admin.sql (ops_check).
--
-- How it works: once a day the game sends a two-letter country code guessed
-- from the browser's time zone setting (src/core/country.js). No IP address
-- is read or stored. One row per account per Korean day, so a player counts
-- once a day however often they come back. Rows older than 400 days are
-- removed as new ones come in. 'XX' means the time zone didn't say (UTC).
-- `source` is 'tz' for now; a more exact guess (e.g. 'ip', from a server
-- lookup that keeps only the country) can be added later and counted the
-- same way.
--
-- Players can't read any of it, not even their own row.

create table if not exists public.player_country_days (
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  country text not null check (country ~ '^[A-Z]{2}$'),
  source text not null default 'tz',
  primary key (day, user_id)
);
create index if not exists player_country_days_user on public.player_country_days (user_id);
alter table public.player_country_days enable row level security;
revoke all on public.player_country_days from anon, authenticated;

-- Called by the game: "I'm probably playing from here today". Bad codes
-- count as unknown. The first report of the day wins, except that a later
-- known country replaces an unknown one.
create or replace function public.report_country(p_country text, p_source text default 'tz') returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  cc text := upper(coalesce(p_country, ''));
begin
  if auth.uid() is null then return; end if;
  if cc !~ '^[A-Z]{2}$' then cc := 'XX'; end if;
  insert into public.player_country_days as d (day, user_id, country, source)
  values (today, auth.uid(), cc, left(coalesce(nullif(p_source, ''), 'tz'), 8))
  on conflict (day, user_id) do update
    set country = excluded.country, source = excluded.source
    where d.country = 'XX' and excluded.country <> 'XX';
  -- Keep about a year: tidy a little on each new day's first reports.
  delete from public.player_country_days where day < today - 400;
end $$;
revoke all on function public.report_country(text, text) from public, anon;
grant execute on function public.report_country(text, text) to authenticated;

-- Called by admin.html: players per country over the last `days` Korean
-- days (1 = today), most first. A player seen from two countries in that
-- time counts in both; `players` is distinct accounts, `visits` is
-- account-days. Operators only.
create or replace function public.ops_countries(days int default 7)
returns table (country text, players bigint, visits bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  first_day date := (now() at time zone 'Asia/Seoul')::date - (least(greatest(coalesce(days, 7), 1), 400) - 1);
begin
  perform public.ops_check();
  return query
    select d.country, count(distinct d.user_id), count(*)
    from public.player_country_days d
    where d.day >= first_day
    group by d.country
    order by 2 desc, 1;
end $$;
revoke all on function public.ops_countries(int) from public, anon;
grant execute on function public.ops_countries(int) to authenticated;
