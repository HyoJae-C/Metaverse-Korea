-- Where players are right now, for operators only (admin.html).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 003_names.sql (player_names) and 005_operators.sql (operators).
--
-- How it works: while playing, each game reports its own spot on the map
-- (x, z in metres, and "street" or the id of the shop it is in) every few
-- seconds while walking and every 20 seconds while standing still. One row
-- per account, overwritten each time, so the table never grows past the
-- number of players. Before this is run the game simply doesn't report.
--
-- Only accounts listed in "operators" can read it, through ops_where();
-- players can't read anyone's spot, not even their own.
-- To see it: open /admin.html in the browser where you play with your
-- operator account.

create table if not exists public.player_where (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  place text not null default '',
  x real not null,
  z real not null,
  updated_at timestamptz not null default now()
);
alter table public.player_where enable row level security;
revoke all on public.player_where from anon, authenticated;

-- Called by the game: "I am here". Ignored without an account, for silly
-- coordinates, or when the same account reported less than a second ago.
create or replace function public.report_where(p_name text, p_place text, p_x real, p_z real) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_x is null or p_z is null then return; end if;
  if abs(p_x) > 100000 or abs(p_z) > 100000 or p_x = 'NaN'::real or p_z = 'NaN'::real then return; end if;
  insert into public.player_where as w (user_id, name, place, x, z, updated_at)
  values (auth.uid(), left(coalesce(p_name, ''), 16), left(coalesce(p_place, ''), 48), p_x, p_z, now())
  on conflict (user_id) do update
    set name = excluded.name, place = excluded.place, x = excluded.x, z = excluded.z, updated_at = now()
    where w.updated_at < now() - interval '1 second';
end $$;
revoke all on function public.report_where(text, text, real, real) from public, anon;
grant execute on function public.report_where(text, text, real, real) to authenticated;

-- Called by admin.html: everyone seen in the last `within_seconds` seconds
-- (default 90 = online now). Operators only; anyone else gets an error.
create or replace function public.ops_where(within_seconds int default 90)
returns table (uid uuid, player text, place text, px real, pz real, age_s real, guest boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.operators o where o.user_id = auth.uid()) then
    raise exception 'operators only' using errcode = '42501';
  end if;
  return query
    select w.user_id, coalesce(n.name, nullif(w.name, ''), '?'), w.place, w.x, w.z,
           extract(epoch from now() - w.updated_at)::real,
           coalesce(u.is_anonymous, true)
    from public.player_where w
    left join public.player_names n on n.user_id = w.user_id
    left join auth.users u on u.id = w.user_id
    where w.updated_at > now() - make_interval(secs => least(greatest(coalesce(within_seconds, 90), 10), 604800))
    order by w.updated_at desc;
end $$;
revoke all on function public.ops_where(int) from public, anon;
grant execute on function public.ops_where(int) to authenticated;
