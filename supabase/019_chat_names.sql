-- Chat that can't be sent in someone else's name, and a slower name change.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 003_names.sql, 004_chat.sql, 005_operators.sql, 007_default_names.sql.
--
-- 1. Chat. Before this, a message on the region chat channel carried the
--    sender's player id written by the sender, so anyone could make a line
--    look like it came from the person next to them. Now:
--      - each page claims its player id for its account (chat_claim) before
--        it joins a room, and nobody else can claim that id;
--      - chat goes through room_chat_send, which checks the id belongs to the
--        caller, checks bans (chat_bans) and Google-only (chat_settings) on
--        every message, limits each account to 5 messages per 10 seconds,
--        and puts the account's real player name on the message;
--      - nobody can send on the chat channels directly any more.
--    Until this is run the game keeps chatting the old way.
--
-- 2. Names. The first change after picking a name is free and immediate;
--    after that, one change per 7 days (claim_name answers 'wait').
--    Also restores the "no official-looking names" check (005), which the
--    claim_name in 007 had dropped.

-- 1. Chat ---------------------------------------------------------------

create table if not exists public.chat_ids (
  net_id text primary key check (char_length(net_id) between 1 and 64),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  win_start timestamptz not null default now(), -- rate limit window
  win_count int not null default 0
);
create index if not exists chat_ids_created_idx on public.chat_ids (created_at);
alter table public.chat_ids enable row level security;
revoke all on public.chat_ids from anon, authenticated;

-- This page's player id is mine. 'ok', 'taken' (another account has it) or 'signin'.
create or replace function public.chat_claim(net_id text) returns text
language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  if auth.uid() is null then return 'signin'; end if;
  if net_id is null or char_length(net_id) not between 1 and 64 then return 'taken'; end if;
  insert into public.chat_ids (net_id, user_id) values (chat_claim.net_id, auth.uid())
  on conflict on constraint chat_ids_pkey do nothing;
  select c.user_id into owner from public.chat_ids c where c.net_id = chat_claim.net_id;
  -- A page id lives for one visit: tidy up old ones now and then.
  if random() < 0.01 then delete from public.chat_ids where created_at < now() - interval '3 days'; end if;
  return case when owner = auth.uid() then 'ok' else 'taken' end;
end $$;
revoke all on function public.chat_claim(text) from public, anon;
grant execute on function public.chat_claim(text) to authenticated;

-- Say something in a region (room) as player id net_id.
-- 'ok', or 'chat' (may not chat), 'id' (net_id isn't mine), 'empty', 'rate'.
create or replace function public.room_chat_send(room text, net_id text, msg text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  clean text := btrim(regexp_replace(coalesce(msg, ''), '[[:cntrl:]]', ' ', 'g'));
  rec public.chat_ids;
  my_name text;
begin
  if me is null or not public.can_chat() then return 'chat'; end if;
  if room is null or char_length(room) not between 1 and 64 then return 'empty'; end if;
  if clean = '' then return 'empty'; end if;
  clean := left(clean, 120);
  select * into rec from public.chat_ids c where c.net_id = room_chat_send.net_id for update;
  if not found or rec.user_id <> me then return 'id'; end if;
  if rec.win_start > now() - interval '10 seconds' then
    if rec.win_count >= 5 then return 'rate'; end if;
    update public.chat_ids set win_count = win_count + 1 where chat_ids.net_id = rec.net_id;
  else
    update public.chat_ids set win_start = now(), win_count = 1 where chat_ids.net_id = rec.net_id;
  end if;
  select n.name into my_name from public.player_names n where n.user_id = me;
  perform realtime.send(
    jsonb_build_object('id', rec.net_id, 't', clean, 'n', my_name),
    'c', 'chat:' || room, true);
  return 'ok';
end $$;
revoke all on function public.room_chat_send(text, text, text) from public, anon;
grant execute on function public.room_chat_send(text, text, text) to authenticated;

-- Only room_chat_send (on the server) sends on the chat channels now.
-- Reading stays open ("chat read" in 004_chat.sql).
drop policy if exists "chat send" on realtime.messages;

-- 2. Names --------------------------------------------------------------

alter table public.player_names add column if not exists renames int not null default 0;
alter table public.player_names add column if not exists renamed_at timestamptz;

-- Days (rounded up) before this account may change its name; 0 = now.
-- The first change after picking a name never waits.
create or replace function public.name_wait_days(renames int, renamed_at timestamptz) returns int
language sql stable as $$
  select case
    when coalesce(renames, 0) = 0 or renamed_at is null then 0
    else greatest(0, ceil(extract(epoch from (renamed_at + interval '7 days' - now())) / 86400.0))::int
  end;
$$;

-- { has_name, free (the next change is the free first one), wait_days }.
create or replace function public.name_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'has_name', n.user_id is not null,
    'free', coalesce(n.renames, 0) = 0,
    'wait_days', public.name_wait_days(n.renames, n.renamed_at))
  from (select 1) one
  left join public.player_names n on n.user_id = auth.uid();
$$;
revoke all on function public.name_status() from public, anon;
grant execute on function public.name_status() to authenticated;

-- 'ok', 'taken', 'invalid', 'signin', or 'wait' (changed too recently).
-- Picking the first name, or claiming the name you already have (any
-- upper/lower case or spacing), never counts as a change.
create or replace function public.claim_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  k text := public.name_key(new_name);
  n text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
  cur public.player_names;
begin
  if auth.uid() is null then return 'signin'; end if;
  if k = '' or char_length(n) > 16 then return 'invalid'; end if;
  if k in ('여행자', 'traveler', 'viajero', 'pelancong') then return 'taken'; end if;
  -- Operators may keep any name; everyone else can't look official.
  if public.reserved_name(n) and not exists (select 1 from public.operators where user_id = auth.uid()) then
    return 'taken';
  end if;
  if exists (select 1 from public.player_names where name_key = k and user_id <> auth.uid()) then
    return 'taken';
  end if;
  select * into cur from public.player_names where user_id = auth.uid() for update;
  if not found then
    insert into public.player_names (user_id, name, name_key, updated_at) values (auth.uid(), n, k, now());
  elsif cur.name_key = k then
    update public.player_names set name = n, updated_at = now() where user_id = auth.uid();
  else
    if public.name_wait_days(cur.renames, cur.renamed_at) > 0 then return 'wait'; end if;
    update public.player_names
      set name = n, name_key = k, updated_at = now(), renames = cur.renames + 1, renamed_at = now()
      where user_id = auth.uid();
  end if;
  return 'ok';
exception when unique_violation then
  return 'taken'; -- someone took it at the same moment
end $$;
grant execute on function public.claim_name(text) to anon, authenticated;

-- An empty name on the start screen: an account that already has a name
-- keeps it (handing out a new number would count as a change).
create or replace function public.claim_default_name(prefix text) returns text
language plpgsql security definer set search_path = public as $$
declare
  p text := case when prefix in ('여행자', 'Traveler', 'Viajero', 'Pelancong') then prefix else 'Traveler' end;
  current_name text;
  candidate text;
begin
  if auth.uid() is null then return null; end if;
  select n.name into current_name from public.player_names n where n.user_id = auth.uid();
  if current_name is not null then return current_name; end if;
  for i in 1..20 loop
    candidate := p || nextval('public.default_name_seq')::text;
    if public.claim_name(candidate) = 'ok' then return candidate; end if; -- someone typed it by hand: try the next one
  end loop;
  return null;
end $$;
revoke all on function public.claim_default_name(text) from public, anon;
grant execute on function public.claim_default_name(text) to authenticated;
