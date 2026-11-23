-- 068: which of my friends are online now (Yozi 2026-11-22), shown as a dot
-- in the chat bar's "send to" picker and the 👥 friends panel:
--   🟢 online   in the game, touched the screen or keys in the last 30 min
--   🟡 away     in the game, but no tap, key or mouse for 30 min or more
--               (by input, not position: fishing on one spot is online)
--   ⚪ offline  not in the game, or hides it
--
-- No new realtime traffic: "online" is the spot every game already reports
-- (player_where, 008_player_where.sql) being newer than 90 seconds, the
-- same rule as the "N online" count (live_count). The game asks only while
-- the chat bar or the friends panel is open, once a minute.
--
-- Each player can hide it ("Let friends see when I'm online" in the 👥
-- panel, on by default): an account listed in online_hidden looks offline
-- to everyone. Only friends (both accepted) are ever told; strangers never.
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 006_friends.sql and 008_player_where.sql.
-- Before this is run the game shows no dots and no switch, and reports
-- its spot without "away", as before.

create table if not exists public.online_hidden (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.online_hidden enable row level security;
revoke all on public.online_hidden from anon, authenticated;

-- Away: the game says so with each spot report (a 5th argument; the old
-- 4-argument report_where stays for games that haven't updated yet).
alter table public.player_where add column if not exists away boolean not null default false;

create or replace function public.report_where(p_name text, p_place text, p_x real, p_z real, p_away boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_x is null or p_z is null then return; end if;
  if abs(p_x) > 100000 or abs(p_z) > 100000 or p_x = 'NaN'::real or p_z = 'NaN'::real then return; end if;
  insert into public.player_where as w (user_id, name, place, x, z, away, updated_at)
  values (auth.uid(), left(coalesce(p_name, ''), 16), left(coalesce(p_place, ''), 48), p_x, p_z, coalesce(p_away, false), now())
  on conflict (user_id) do update
    set name = excluded.name, place = excluded.place, x = excluded.x, z = excluded.z, away = excluded.away, updated_at = now()
    where w.updated_at < now() - interval '1 second';
end $$;
revoke all on function public.report_where(text, text, real, real, boolean) from public, anon;
grant execute on function public.report_where(text, text, real, real, boolean) to authenticated;

-- { shown: is my own status shown to my friends,
--   online / away: ids of my friends in the game right now who show theirs }
create or replace function public.friends_online() returns jsonb
language sql stable security definer set search_path = public as $$
  with here as (
    select w.user_id as uid, w.away
    from public.my_friends(auth.uid()) f (uid)
    join public.player_where w on w.user_id = f.uid
    where w.updated_at > now() - interval '90 seconds'
      and not exists (select 1 from public.online_hidden h where h.user_id = f.uid)
  )
  select jsonb_build_object(
    'shown', not exists (select 1 from public.online_hidden h where h.user_id = auth.uid()),
    'online', coalesce((select jsonb_agg(uid) from here where not away), '[]'::jsonb),
    'away', coalesce((select jsonb_agg(uid) from here where away), '[]'::jsonb));
$$;
revoke all on function public.friends_online() from public, anon;
grant execute on function public.friends_online() to authenticated;

-- The switch. Returns what is now set, or null without an account.
create or replace function public.set_online_shown(p_show boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_show is null then return null; end if;
  if p_show then
    delete from public.online_hidden where user_id = auth.uid();
  else
    insert into public.online_hidden (user_id) values (auth.uid()) on conflict do nothing;
  end if;
  return p_show;
end $$;
revoke all on function public.set_online_shown(boolean) from public, anon;
grant execute on function public.set_online_shown(boolean) to authenticated;
