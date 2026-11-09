-- Lifetime play time per account, kept after the 180-day cleanup.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 011_play_sessions.sql.
--
-- play_sessions rows are still removed after 180 days (they hold device,
-- region and per-session counts). Just before a row goes, its length is added
-- to this one small row per account: total seconds, session count and the
-- first play. Lifetime play time = this total + the sessions still in
-- play_sessions.
--
-- Players can't read it. Deleting an account (auth.users) removes its total.

create table if not exists public.play_time_totals (
  user_id uuid primary key,
  seconds bigint not null default 0,
  sessions int not null default 0,
  first_at timestamptz
);
alter table public.play_time_totals enable row level security;
revoke all on public.play_time_totals from anon, authenticated;

-- Before a session row is deleted, fold it into the account's total. Skipped
-- when the account itself is being deleted (the cascade from auth.users).
create or replace function public.keep_play_time() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from auth.users where id = old.user_id) then
    insert into public.play_time_totals as t (user_id, seconds, sessions, first_at)
    values (old.user_id, greatest(extract(epoch from old.last_at - old.started_at), 0)::bigint, 1, old.started_at)
    on conflict (user_id) do update
      set seconds = t.seconds + excluded.seconds,
          sessions = t.sessions + 1,
          first_at = least(t.first_at, excluded.first_at);
  end if;
  return old;
end $$;
revoke all on function public.keep_play_time() from public, anon, authenticated;
drop trigger if exists keep_play_time on public.play_sessions;
create trigger keep_play_time before delete on public.play_sessions
  for each row execute function public.keep_play_time();

-- An account's total disappears with the account.
create or replace function public.drop_play_time() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.play_time_totals where user_id = old.id;
  return old;
end $$;
revoke all on function public.drop_play_time() from public, anon, authenticated;
drop trigger if exists drop_play_time on auth.users;
create trigger drop_play_time after delete on auth.users
  for each row execute function public.drop_play_time();
