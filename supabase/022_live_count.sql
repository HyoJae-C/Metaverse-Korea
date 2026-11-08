-- 022: a public "how many people are playing right now" number for Metamoa
-- (metamoa.com lists metaverses with their live player count).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 005_operators.sql and 008_player_where.sql.
--
-- Metamoa reads one https address that answers with a bare number. Supabase
-- already serves every function at /rest/v1/rpc/<name>, so no server, edge
-- function or timer is needed. The address is:
--
--   https://qiefmpxiiercqfazigjv.supabase.co/rest/v1/rpc/live_count?apikey=<publishable key>
--
-- The publishable key is the same public key the game ships in its page
-- (VITE_REALTIME_PUBLIC_KEY), so putting it in the address shares nothing new.
-- The answer is just a number such as 3.
--
-- Who counts: accounts whose game reported its spot in the last 90 seconds,
-- one per account (the same rule as "online now" on admin.html), minus the
-- accounts listed in "operators" (we play to test). Test rooms and ?debug
-- builds never report a spot, so they are not counted either.
-- Only the count leaves the database: no names, ids, places or countries.

create or replace function public.live_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.player_where w
  where w.updated_at > now() - interval '90 seconds'
    and not exists (select 1 from public.operators o where o.user_id = w.user_id);
$$;
revoke all on function public.live_count() from public;
grant execute on function public.live_count() to anon, authenticated;
