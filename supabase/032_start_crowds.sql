-- 032: how many people are near each start spot, for "Anywhere" on the start
-- screen (src/game/first-stop.js): a new player who picks it starts where
-- most people are right now, so the town doesn't feel empty.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 008_player_where.sql. Safe to run again: it replaces the function.
--
-- The game passes the spots (street metres) and gets one count per spot:
-- accounts whose game reported a spot in the last 90 seconds (the same rule
-- as live_count, 022) within r metres of it. Only counts leave the database:
-- no names, ids or positions. At most 8 spots and r of at least 60 m, so the
-- counts stay coarse.

create or replace function public.start_crowds(xs float8[], zs float8[], r float8 default 150)
returns int[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(n order by i), '{}')
  from (
    select s.i, (
      select count(*)::int
      from public.player_where w
      where w.updated_at > now() - interval '90 seconds'
        and w.x is not null and w.z is not null
        and (w.x - s.x) * (w.x - s.x) + (w.z - s.z) * (w.z - s.z) <= greatest(r, 60) * greatest(r, 60)
    ) as n
    from unnest(xs[1:8], zs[1:8]) with ordinality as s(x, z, i)
  ) t;
$$;
revoke all on function public.start_crowds(float8[], float8[], float8) from public;
grant execute on function public.start_crowds(float8[], float8[], float8) to anon, authenticated;
