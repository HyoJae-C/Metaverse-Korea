-- Friends and friend chat: messages between friends are kept, like a phone
-- messenger, so you can read them again later. Public chat is still not
-- stored anywhere.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 003_names.sql (player_names) and 004_chat.sql (can_chat).
-- Before this is run the friends panel says it is being set up.
--
-- How it works:
--   friends: one row per direction. You send a request by adding the row
--     (me → them); they accept by adding theirs (them → me). Two rows = friends.
--     Friends are found by their player name (player_names), so the game
--     never needs another player's account ID.
--   friend_messages: recipient = a friend's account, or empty (null) for
--     "All friends", which every friend of the sender can read.
--   The game reads and writes only through the functions below; the tables
--   themselves are closed to it.
--   New messages are pushed on a private realtime channel per account
--   ('friend:<account id>') that only that account can listen to.
--
-- Rules the server checks: sending needs can_chat() (Google-only and chat
-- bans in 004_chat.sql apply here too), only to friends, up to 200
-- characters, at most 5 messages in 10 seconds. Messages older than 180 days
-- are deleted.
--
-- Operator: Table Editor → friend_messages shows every message (sender and
-- recipient are account IDs; find the names in player_names).

create table if not exists public.friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friends_friend_idx on public.friends (friend_id);

create table if not exists public.friend_messages (
  id bigint generated always as identity primary key,
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid references auth.users (id) on delete cascade, -- null = all of the sender's friends
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists friend_messages_recipient_idx on public.friend_messages (recipient, id);
create index if not exists friend_messages_sender_idx on public.friend_messages (sender, id);
create index if not exists friend_messages_created_idx on public.friend_messages (created_at);

alter table public.friends enable row level security;
alter table public.friend_messages enable row level security;
revoke all on public.friends, public.friend_messages from anon, authenticated;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friends where user_id = a and friend_id = b)
     and exists (select 1 from public.friends where user_id = b and friend_id = a);
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- Everyone this account is friends with (both rows exist).
create or replace function public.my_friends(me uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.friend_id from public.friends a
  join public.friends r on r.user_id = a.friend_id and r.friend_id = me
  where a.user_id = me;
$$;
revoke all on function public.my_friends(uuid) from public, anon, authenticated;

-- A small "something changed" push to one account's private channel.
-- Never fails the caller (e.g. if realtime.send isn't available).
create or replace function public.friend_push(target uuid, event text, payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(payload, event, 'friend:' || target::text, true);
exception when others then
  null;
end $$;
revoke all on function public.friend_push(uuid, text, jsonb) from public, anon, authenticated;

-- My friends, requests to me and my requests, with their current names.
-- state: 'friend', 'incoming' (they asked me) or 'outgoing' (I asked them).
create or replace function public.friend_list()
returns table (user_id uuid, name text, state text)
language sql stable security definer set search_path = public as $$
  with mine as (select f.friend_id as other from public.friends f where f.user_id = auth.uid()),
       theirs as (select f.user_id as other from public.friends f where f.friend_id = auth.uid()),
       everyone as (
         select m.other, case when m.other in (select t.other from theirs t) then 'friend' else 'outgoing' end as state from mine m
         union all
         select t.other, 'incoming' from theirs t where t.other not in (select m.other from mine m)
       )
  select e.other, coalesce(n.name, '?'), e.state
  from everyone e left join public.player_names n on n.user_id = e.other
  order by e.state, n.name;
$$;
grant execute on function public.friend_list() to authenticated;

-- Ask someone to be friends by their player name (or accept their request).
-- Returns 'friends', 'requested', 'notfound', 'self', 'full' or 'signin'.
create or replace function public.friend_add(player_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  them uuid;
begin
  if me is null then return 'signin'; end if;
  select n.user_id into them from public.player_names n where n.name_key = public.name_key(player_name);
  if them is null then return 'notfound'; end if;
  if them = me then return 'self'; end if;
  if (select count(*) from public.friends where user_id = me) >= 200 then return 'full'; end if;
  insert into public.friends (user_id, friend_id) values (me, them) on conflict do nothing;
  perform public.friend_push(them, 'f', '{}'::jsonb);
  return case when public.are_friends(me, them) then 'friends' else 'requested' end;
end $$;
grant execute on function public.friend_add(text) to authenticated;

-- Accept a request from this account. Returns 'friends' or 'none'.
create or replace function public.friend_accept(other uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.friends where user_id = other and friend_id = me) then return 'none'; end if;
  insert into public.friends (user_id, friend_id) values (me, other) on conflict do nothing;
  perform public.friend_push(other, 'f', '{}'::jsonb);
  return 'friends';
end $$;
grant execute on function public.friend_accept(uuid) to authenticated;

-- Unfriend, decline a request or cancel mine: removes both directions.
create or replace function public.friend_remove(other uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signin'; end if;
  delete from public.friends where (user_id = me and friend_id = other) or (user_id = other and friend_id = me);
  perform public.friend_push(other, 'f', '{}'::jsonb);
  return 'ok';
end $$;
grant execute on function public.friend_remove(uuid) to authenticated;

-- Send to one friend (to_user) or to all my friends (to_user null).
-- Returns { ok: true, id, at } or { error: 'chat' | 'notfriend' | 'nofriends' | 'empty' | 'rate' }.
create or replace function public.friend_send(to_user uuid, msg text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  clean text := btrim(regexp_replace(coalesce(msg, ''), '[[:cntrl:]]', ' ', 'g'));
  my_name text;
  rec public.friend_messages;
  target uuid;
begin
  if me is null or not public.can_chat() then return jsonb_build_object('error', 'chat'); end if;
  if clean = '' then return jsonb_build_object('error', 'empty'); end if;
  clean := left(clean, 200);
  if (select count(*) from public.friend_messages where sender = me and created_at > now() - interval '10 seconds') >= 5 then
    return jsonb_build_object('error', 'rate');
  end if;
  if to_user is not null and not public.are_friends(me, to_user) then return jsonb_build_object('error', 'notfriend'); end if;
  if to_user is null and not exists (select 1 from public.my_friends(me)) then return jsonb_build_object('error', 'nofriends'); end if;

  insert into public.friend_messages (sender, recipient, body) values (me, to_user, clean) returning * into rec;
  select n.name into my_name from public.player_names n where n.user_id = me;
  for target in
    select to_user where to_user is not null
    union all
    select x from public.my_friends(me) x where to_user is null
  loop
    perform public.friend_push(target, 'm', jsonb_build_object(
      'id', rec.id, 'from', me, 'to', rec.recipient, 'name', coalesce(my_name, '?'), 'body', rec.body, 'at', rec.created_at));
  end loop;
  -- Now and then, tidy up old messages.
  if random() < 0.02 then delete from public.friend_messages where created_at < now() - interval '180 days'; end if;
  return jsonb_build_object('ok', true, 'id', rec.id, 'at', rec.created_at);
end $$;
grant execute on function public.friend_send(uuid, text) to authenticated;

-- The last 50 messages (before before_id, if given) with one friend
-- (other), or in "All friends" (other null), newest first.
create or replace function public.friend_history(other uuid, before_id bigint default null)
returns table (id bigint, sender uuid, recipient uuid, name text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.sender, m.recipient, coalesce(n.name, '?'), m.body, m.created_at
  from public.friend_messages m left join public.player_names n on n.user_id = m.sender
  where auth.uid() is not null
    and (before_id is null or m.id < before_id)
    and case
      when other is not null then public.are_friends(auth.uid(), other) and (
        (m.sender = auth.uid() and m.recipient = other) or (m.sender = other and m.recipient = auth.uid()))
      else m.recipient is null and (m.sender = auth.uid() or public.are_friends(m.sender, auth.uid()))
    end
  order by m.id desc
  limit 50;
$$;
grant execute on function public.friend_history(uuid, bigint) to authenticated;

-- Only you can listen to your own friend channel. Nobody can send on it
-- from the game: the functions above push to it on the server.
drop policy if exists "friend inbox read" on realtime.messages;
create policy "friend inbox read" on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'friend:' || auth.uid()::text);
