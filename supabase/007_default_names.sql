-- Numbered default names: a player who leaves the name empty used to be
-- called just "여행자" / "Traveler", and that name was never reserved, so a
-- friend request to "여행자" found nobody (or the one account that typed it
-- by hand). Now an empty name becomes the next free number, 여행자100,
-- 여행자101, … (Traveler102 in English, and so on), reserved like any other
-- name, so friend requests by name reach the right person.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 003_names.sql (player_names, claim_name).

create sequence if not exists public.default_name_seq start with 100;

-- Gives this account the next numbered default name and returns it.
-- An account that already has a numbered default name keeps it.
-- Returns the name, or null when not signed in.
create or replace function public.claim_default_name(prefix text) returns text
language plpgsql security definer set search_path = public as $$
declare
  p text := case when prefix in ('여행자', 'Traveler', 'Viajero', 'Pelancong') then prefix else 'Traveler' end;
  current_name text;
  candidate text;
begin
  if auth.uid() is null then return null; end if;
  select n.name into current_name from public.player_names n where n.user_id = auth.uid();
  if current_name ~ ('^' || p || '[0-9]+$') then return current_name; end if;
  for i in 1..20 loop
    candidate := p || nextval('public.default_name_seq')::text;
    if public.claim_name(candidate) = 'ok' then return candidate; end if; -- someone typed it by hand: try the next one
  end loop;
  return null;
end $$;
revoke all on function public.claim_default_name(text) from public, anon;
grant execute on function public.claim_default_name(text) to authenticated;

-- The bare default names themselves can't be claimed any more, so nobody
-- ends up as "the" 여행자 who gets everyone's friend requests.
create or replace function public.claim_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  k text := public.name_key(new_name);
  n text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then return 'signin'; end if;
  if k = '' or char_length(n) > 16 then return 'invalid'; end if;
  if k in ('여행자', 'traveler', 'viajero', 'pelancong') then return 'taken'; end if;
  if exists (select 1 from public.player_names where name_key = k and user_id <> auth.uid()) then
    return 'taken';
  end if;
  insert into public.player_names (user_id, name, name_key, updated_at)
  values (auth.uid(), n, k, now())
  on conflict (user_id) do update set name = excluded.name, name_key = excluded.name_key, updated_at = now();
  return 'ok';
exception when unique_violation then
  return 'taken';
end $$;
grant execute on function public.claim_name(text) to anon, authenticated;

-- Anyone who already holds a bare default name keeps playing, but the name
-- is freed so a request to "여행자" no longer lands on them; they get a
-- number the next time they start the game.
delete from public.player_names where name_key in ('여행자', 'traveler', 'viajero', 'pelancong');
