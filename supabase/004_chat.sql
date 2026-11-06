-- Chat on the server's terms: chat travels on private realtime channels
-- ('chat:<room>'), and the server decides who may send.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Before this is run the game simply chats on the public room channels.
--
-- Switches (Table Editor):
--   chat_settings → google_only: true = only players signed in with Google
--     can send chat; guests can still read it. Starts false (everyone chats).
--     Also set chatGoogleOnly: true in src/config.js so guests see the
--     "sign in to chat" prompt instead of typing into the void.
--   chat_bans → add a row with someone's user_id to stop that account
--     chatting. Find the user_id from their player name in player_names
--     (003_names.sql), and the account's email, sign-up and last sign-in in
--     Authentication → Users. A ban applies the next time they join a room
--     (moving to another area or reloading).

create table if not exists public.chat_settings (
  id boolean primary key default true check (id), -- exactly one row
  google_only boolean not null default false
);
insert into public.chat_settings (id) values (true) on conflict do nothing;

create table if not exists public.chat_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

-- Nobody reads or writes these from the game; only the checks below do.
alter table public.chat_settings enable row level security;
alter table public.chat_bans enable row level security;
revoke all on public.chat_settings, public.chat_bans from anon, authenticated;

-- May the person asking send chat right now?
create or replace function public.can_chat() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and not exists (select 1 from public.chat_bans where user_id = auth.uid())
    and (
      not coalesce((select google_only from public.chat_settings limit 1), false)
      or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false
    );
$$;
grant execute on function public.can_chat() to anon, authenticated;

-- Realtime authorization for the private chat channels. Reading is open
-- (guests and players without an account too); sending needs can_chat().
drop policy if exists "chat read" on realtime.messages;
create policy "chat read" on realtime.messages
  for select to anon, authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() like 'chat:%');

drop policy if exists "chat send" on realtime.messages;
create policy "chat send" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'chat:%'
    and public.can_chat()
  );
