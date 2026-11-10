-- Announcements (공지): an operator's notice that shows in every player's
-- chat, in every area, styled as a notice.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 005_operators.sql and 009_admin.sql (am_operator, ops_check).
--
-- How to send one: the operator page (admin.html → Announce), or in the game
-- chat type  /공지 your message  (also /notice or /announce).
-- Only accounts listed in "operators" can send; the server checks it, so
-- anyone else typing the command just gets "operators only".
--
-- How it travels: ops_announce() stores the notice and pushes it on the
-- private realtime channel 'announce'. Everyone may listen to that channel,
-- nobody may send on it from a game (there is no insert policy), so a notice
-- can't be faked. Players who join a little later get notices from the last
-- 10 minutes through recent_announcements().

create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  body text not null check (char_length(body) between 1 and 300),
  sender uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;

-- Send a notice (operators only). Returns { id, body, at }.
create or replace function public.ops_announce(msg text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b text := left(btrim(regexp_replace(coalesce(msg, ''), '[[:cntrl:]]', ' ', 'g')), 300);
  r public.announcements;
  payload jsonb;
begin
  perform public.ops_check();
  if b = '' then raise exception 'empty notice' using errcode = '22023'; end if;
  -- At most 5 notices a minute, so a slip of the finger can't flood chat.
  if (select count(*) from public.announcements where created_at > now() - interval '1 minute') >= 5 then
    raise exception 'too many notices, wait a minute' using errcode = '54000';
  end if;
  insert into public.announcements (body, sender) values (b, auth.uid()) returning * into r;
  payload := jsonb_build_object('id', r.id, 'body', r.body, 'at', r.created_at);
  begin
    perform realtime.send(payload, 'n', 'announce', true);
  exception when others then
    null; -- still stored: late joiners and the next reload pick it up
  end;
  return payload;
end $$;
revoke all on function public.ops_announce(text) from public, anon;
grant execute on function public.ops_announce(text) to authenticated;

-- Notices from the last few minutes, oldest first (for players joining now).
create or replace function public.recent_announcements(within_seconds int default 600)
returns table (id bigint, body text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.body, a.created_at from public.announcements a
  where a.created_at > now() - make_interval(secs => least(greatest(coalesce(within_seconds, 600), 0), 3600))
  order by a.id desc limit 5;
$$;
grant execute on function public.recent_announcements(int) to anon, authenticated;

-- The operator page's list: recent notices with who sent them.
create or replace function public.ops_announcements(lim int default 30)
returns table (id bigint, body text, at timestamptz, sender_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return query
    select a.id, a.body, a.created_at, n.name from public.announcements a
    left join public.player_names n on n.user_id = a.sender
    order by a.id desc
    limit least(greatest(coalesce(lim, 30), 1), 200);
end $$;
grant execute on function public.ops_announcements(int) to authenticated;

-- Everyone may listen on the announce channel; nobody may send on it.
drop policy if exists "announce read" on realtime.messages;
create policy "announce read" on realtime.messages
  for select to anon, authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'announce');
