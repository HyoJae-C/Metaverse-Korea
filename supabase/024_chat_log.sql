-- Chat log (채팅 기록): public chat is kept for 90 days so operators can
-- check reports of abuse. Players are told in the privacy policy and in the
-- game's chat notice. Friend messages are not touched here (006_friends.sql
-- keeps them already).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 004_chat.sql, 009_admin.sql (ops_check) and 019_chat_names.sql.
--
-- What changes: room_chat_send (019) also writes each line it sends into
-- chat_log. Lines older than 90 days are deleted now and then.
-- To keep them for a different time, change the two "90 days" below.
-- The operator page (admin.html → Chat) shows the log and can search it.

create table if not exists public.chat_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  room text not null,
  net_id text not null,
  user_id uuid references auth.users (id) on delete cascade,
  name text,
  msg text not null
);
create index if not exists chat_log_at_idx on public.chat_log (at);
create index if not exists chat_log_user_idx on public.chat_log (user_id, at);
alter table public.chat_log enable row level security;
revoke all on public.chat_log from anon, authenticated;

-- 019's room_chat_send, plus one insert into chat_log.
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
  insert into public.chat_log (room, net_id, user_id, name, msg) values (room_chat_send.room, rec.net_id, me, my_name, clean);
  if random() < 0.001 then delete from public.chat_log where at < now() - interval '90 days'; end if;
  perform realtime.send(
    jsonb_build_object('id', rec.net_id, 't', clean, 'n', my_name),
    'c', 'chat:' || room, true);
  return 'ok';
end $$;
revoke all on function public.room_chat_send(text, text, text) from public, anon;
grant execute on function public.room_chat_send(text, text, text) to authenticated;

-- The log for the operator page, newest first. q: words in the line, the
-- player's name or email (empty = everything); before_id: only lines older
-- than that id (for "load older"). Operators only.
create or replace function public.ops_chat_log(q text default '', before_id bigint default null, lim int default 200)
returns table (id bigint, at timestamptz, room text, net_id text, uid uuid, name text, msg text, guest boolean, banned boolean)
language plpgsql stable security definer set search_path = public as $$
declare k text := lower(btrim(coalesce(q, '')));
begin
  perform public.ops_check();
  return query
    select l.id, l.at, l.room, l.net_id, l.user_id, coalesce(n.name, l.name), l.msg,
           coalesce(u.is_anonymous, true), b.user_id is not null
    from public.chat_log l
    left join public.player_names n on n.user_id = l.user_id
    left join auth.users u on u.id = l.user_id
    left join public.chat_bans b on b.user_id = l.user_id
    where l.at > now() - interval '90 days'
      and (before_id is null or l.id < before_id)
      and (k = '' or lower(l.msg) like '%' || k || '%' or lower(coalesce(n.name, l.name, '')) like '%' || k || '%'
           or lower(coalesce(u.email, '')) like '%' || k || '%')
    order by l.id desc
    limit least(greatest(coalesce(lim, 200), 1), 500);
end $$;
revoke all on function public.ops_chat_log(text, bigint, int) from public, anon;
grant execute on function public.ops_chat_log(text, bigint, int) to authenticated;

-- The account behind a player id seen in live chat (for the ban button).
create or replace function public.ops_chat_owner(net_id text) returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return (select c.user_id from public.chat_ids c where c.net_id = ops_chat_owner.net_id);
end $$;
revoke all on function public.ops_chat_owner(text) from public, anon;
grant execute on function public.ops_chat_owner(text) to authenticated;

-- How big the log is, for the operator page's warning: rows, bytes on disk
-- (with indexes), lines in the last 7 days, the oldest line, and the whole
-- database's size (the free plan allows 500 MB).
create or replace function public.ops_chat_log_size() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return jsonb_build_object(
    'rows', (select count(*) from public.chat_log),
    'bytes', pg_total_relation_size('public.chat_log'),
    'week', (select count(*) from public.chat_log where at > now() - interval '7 days'),
    'oldest', (select min(at) from public.chat_log),
    'db_bytes', pg_database_size(current_database()));
end $$;
revoke all on function public.ops_chat_log_size() from public, anon;
grant execute on function public.ops_chat_log_size() to authenticated;
