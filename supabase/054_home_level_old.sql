-- 054: who keeps the old home (level 2, 14×11 m) — a narrower list than 053.
-- Run once in the Supabase dashboard after 053: SQL Editor → New query →
-- paste → Run. Safe to run again (it only adds people, never removes).
--
-- Yozi 2026-11-18: an account made before levels keeps level 2 only if it
-- has opened (decorated) its home, or played in the last 7 days. Anyone
-- else (away 7+ days and never opened their home) starts at level 1 like a
-- new player. Most of those are guest accounts that opened the page once.
--   "Opened its home": the account save has a home layout (mk.home.*).
--   "Played": the latest of sign-in, account save and wallet times.
-- The list is fixed when this is run (home_level_old); home_level_of()
-- (053) now reads it instead of the account's creation time.

create table if not exists public.home_level_old (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.home_level_old enable row level security;
revoke all on public.home_level_old from anon, authenticated;

insert into public.home_level_old (user_id)
select u.id
from auth.users u
left join public.saves s on s.user_id = u.id
left join public.wallets w on w.user_id = u.id
where u.created_at < (select at from public.home_level_since)
  and (
    s.data ? 'mk.home.forest-lane-apt' or s.data ? 'mk.home.sunny-villa'
    or greatest(u.last_sign_in_at, s.updated_at, w.updated_at) > now() - interval '7 days'
  )
on conflict (user_id) do nothing;

create or replace function public.home_level_of(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(
    case when exists (select 1 from public.home_level_old o where o.user_id = p_user) then 2 else 1 end,
    coalesce((select max(substr(note, 6)::int) from public.coin_ledger
              where user_id = p_user and kind = 'home' and status = 'ok' and note ~ '^home:[0-9]$'), 1));
$$;
revoke all on function public.home_level_of(uuid) from public, anon, authenticated;

-- How many keep level 2:
--   select count(*) from public.home_level_old;

notify pgrst, 'reload schema';
