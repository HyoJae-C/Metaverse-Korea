-- 021: the game's "N online" counts the same people as admin.html (run once,
-- after 008_player_where.sql and 009_admin.sql).
--
-- Until now the game counted open connections to one realtime room, with a
-- fresh random key on every page load. The operator page counts accounts in
-- player_where that reported their spot in the last 90 seconds. So the same
-- account on a phone and a PC, a tab that died without saying goodbye (still
-- held for a while by the server), or a test build with ?debug counted in
-- the game but not on admin.html: 5 online in the game while admin showed 2.
--
-- Now both read the same number: accounts seen in the last 90 seconds, one
-- per account. Only the count comes out, never who or where.
-- Until this is run the game keeps its old count.

create or replace function public.online_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.player_where
  where updated_at > now() - interval '90 seconds';
$$;
revoke all on function public.online_count() from public;
grant execute on function public.online_count() to anon, authenticated;
