-- 072: "today N visitors" next to the online count (Yozi 2026-11-23).
-- Run once: Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Needs 008_player_where.sql.
--
-- live_counts() answers both numbers in one request, so the game still asks
-- once a minute (no extra Realtime messages):
--   now   = accounts whose game reported its spot in the last 90 seconds
--           (the same rule as live_count, operators included)
--   today = accounts whose game reported its spot since midnight Korea time
-- player_where keeps one row per account with its last report, so "today" is
-- every account seen since 00:00 KST. Real people only: nothing is added.
-- Only the two numbers leave the database.

create or replace function public.live_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'now', count(*) filter (where w.updated_at > now() - interval '90 seconds'),
    'today', count(*))
  from public.player_where w
  where w.updated_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
$$;
revoke all on function public.live_counts() from public;
grant execute on function public.live_counts() to anon, authenticated;

notify pgrst, 'reload schema';
