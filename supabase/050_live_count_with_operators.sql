-- 050: the game's "N online" (and Metamoa's number) counts operators too.
-- live_count in the database had an extra "not an operator" filter, so the
-- game showed one less than admin.html "Online now". This puts back the rule
-- in supabase/022_live_count.sql: everyone in the game right now.
-- Run once: Supabase → SQL Editor → New query → paste → Run. Safe to run again.

create or replace function public.live_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.player_where w
  where w.updated_at > now() - interval '90 seconds';
$$;
revoke all on function public.live_count() from public;
grant execute on function public.live_count() to anon, authenticated;
