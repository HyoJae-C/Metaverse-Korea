-- Keep operators out of the statistics (admin.html → Overview countries and
-- the Retention tab). Operators play to test and to help people, which
-- would skew retention, session length, ads and errors.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 005_operators.sql, 010_countries.sql, 011_play_sessions.sql and
-- 014_retention_more.sql.
--
-- How it works: a check before each new row in the statistics tables drops
-- the row when it comes from an account listed in "operators", so the game
-- needs no change and the report functions stay as they are. Rows already
-- recorded for operator accounts are removed once below. Error messages have
-- no account id, so only new ones from operators are skipped.
-- Only the accounts in "operators" are left out: playing on another account
-- (a guest on a second phone, say) still counts as a player.

create or replace function public.stats_skip_operator() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who uuid := coalesce(auth.uid(), (to_jsonb(new) ->> 'user_id')::uuid); -- client_errors has no user_id
begin
  if who is not null and exists (select 1 from public.operators o where o.user_id = who) then
    return null; -- not recorded (an upsert's update is skipped too)
  end if;
  return new;
end $$;
revoke all on function public.stats_skip_operator() from public, anon, authenticated;

drop trigger if exists skip_operator on public.play_sessions;
create trigger skip_operator before insert on public.play_sessions
  for each row execute function public.stats_skip_operator();
drop trigger if exists skip_operator on public.play_visits;
create trigger skip_operator before insert on public.play_visits
  for each row execute function public.stats_skip_operator();
drop trigger if exists skip_operator on public.player_country_days;
create trigger skip_operator before insert on public.player_country_days
  for each row execute function public.stats_skip_operator();
drop trigger if exists skip_operator on public.client_errors;
create trigger skip_operator before insert on public.client_errors
  for each row execute function public.stats_skip_operator();

-- What operators already left in the statistics.
delete from public.play_sessions where user_id in (select user_id from public.operators);
delete from public.play_visits where user_id in (select user_id from public.operators);
delete from public.player_country_days where user_id in (select user_id from public.operators);
