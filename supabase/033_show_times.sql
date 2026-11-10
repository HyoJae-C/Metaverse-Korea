-- Show times (드론쇼 · 불꽃놀이 시간): operators choose when the Ttukseom
-- drone light show and the Yeouido fireworks start (1 to 4 times a day
-- each, Korean time). Every game reads the same setting
-- (src/core/drone-show.js, src/core/fireworks-show.js), so everyone still
-- sees the same show at the same moment.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 005_operators.sql and 009_admin.sql (ops_check).
--
-- Set it from the operator page (admin.html → Shows).
-- Without this file (or with a list left empty) the games keep the
-- defaults: drones 06:00 and 18:00, fireworks 09:00 and 21:00 KST.

create table if not exists public.show_times (
  id int primary key default 1 check (id = 1),
  drone int[],     -- minutes after midnight KST; null = the game's default
  fireworks int[], -- the same
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.show_times (id) values (1) on conflict (id) do nothing;
alter table public.show_times enable row level security;
revoke all on public.show_times from anon, authenticated;

create or replace function public.show_times_payload() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'drone', to_jsonb(s.drone),
    'fireworks', to_jsonb(s.fireworks),
    'at', s.updated_at,
    'by', n.name)
  from public.show_times s
  left join public.player_names n on n.user_id = s.updated_by
  where s.id = 1;
$$;
revoke all on function public.show_times_payload() from public, anon, authenticated;

-- Every game reads this on start (and every few minutes).
create or replace function public.show_times() returns jsonb
language sql stable security definer set search_path = public as $$
  select public.show_times_payload() - 'by';
$$;
grant execute on function public.show_times() to anon, authenticated;

-- One show's list: sorted, 1 to 4 times, 00:00 … 23:59, at least `gap`
-- minutes apart round the clock. null or empty → null (the default).
create or replace function public.show_times_clean(starts int[], gap int, what text)
returns int[]
language plpgsql immutable set search_path = public as $$
declare
  s int[];
  n int;
  d int;
begin
  if starts is null or cardinality(starts) = 0 then return null; end if;
  if array_position(starts, null) is not null then
    raise exception '% times must be 00:00 to 23:59', what using errcode = '22023';
  end if;
  select array_agg(x order by x) into s from unnest(starts) x;
  n := cardinality(s);
  if n > 4 then raise exception 'at most 4 % shows a day', what using errcode = '22023'; end if;
  if s[1] < 0 or s[n] > 1439 then
    raise exception '% times must be 00:00 to 23:59', what using errcode = '22023';
  end if;
  if n > 1 then
    for i in 1 .. n loop
      d := case when i < n then s[i + 1] - s[i] else s[1] + 1440 - s[n] end;
      if d < gap then raise exception '% shows must be at least % minutes apart', what, gap using errcode = '22023'; end if;
    end loop;
  end if;
  return s;
end $$;
revoke all on function public.show_times_clean(int[], int, text) from public, anon, authenticated;

-- Change them (operators only). Each list: minutes after midnight KST, or
-- null / empty for the default. Shows at least 60 minutes apart, and a
-- drone show (10 minutes before to 23 after its start) never overlaps the
-- fireworks (20 minutes: also 10 before to 23 after).
create or replace function public.ops_set_show_times(drone_starts int[], fireworks_starts int[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  dr int[];
  fw int[];
  payload jsonb;
begin
  perform public.ops_check();
  dr := public.show_times_clean(drone_starts, 60, 'drone');
  fw := public.show_times_clean(fireworks_starts, 60, 'fireworks');
  if exists (
    select 1
    from unnest(coalesce(dr, array[360, 1080])) a,
         unnest(coalesce(fw, array[540, 1260])) b,
         unnest(array[-1440, 0, 1440]) k
    where a - 10 < b + k + 23 and b + k - 10 < a + 23
  ) then
    raise exception 'the drone show and the fireworks overlap' using errcode = '22023';
  end if;
  update public.show_times set
    drone = dr,
    fireworks = fw,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  payload := public.show_times_payload();
  begin
    perform realtime.send(payload - 'by', 's', 'showtimes', true); -- games change at once
  exception when others then
    null; -- they still pick it up on their next check
  end;
  return payload;
end $$;
revoke all on function public.ops_set_show_times(int[], int[]) from public, anon;
grant execute on function public.ops_set_show_times(int[], int[]) to authenticated;

-- The operator page reads who changed it last.
create or replace function public.ops_show_times() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return public.show_times_payload();
end $$;
grant execute on function public.ops_show_times() to authenticated;

-- Everyone may listen on the show times channel; nobody may send on it.
drop policy if exists "showtimes read" on realtime.messages;
create policy "showtimes read" on realtime.messages
  for select to anon, authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'showtimes');
