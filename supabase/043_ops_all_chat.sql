-- Every chat for the operator page (모든 채팅 확인): so an abusive player
-- can be found and stopped, the operator page's Chat tab now shows all the
-- text players write to each other, not only public chat:
--   public chat      chat_log (024), 90 days
--   friend chat      friend_messages (006), one friend or "All friends", 180 days
--   love-lock notes  love_locks (007), hanging on the wall until hidden
--   board posts      board_posts (002), free board and inquiries
-- The confession room in Myeongdong Cathedral is left out on purpose: it
-- sends and saves nothing (core/confession-room.js), so there is nothing to
-- show. Voice in the Sinchon live café goes browser to browser and is not
-- recorded either.
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 002, 006, 007, 009 (ops_check), 019 and 024.
--
-- Also closes a gap in public chat: for the first few seconds in a new area
-- (before the private chat channel is open), or if that channel can't be
-- opened, the game says chat on the room channel, which never went through
-- room_chat_send and so was not logged. room_chat_log below logs those lines
-- (and refuses players banned from chat) without sending anything over
-- realtime, so the month's realtime messages don't grow.

-- Log a line the game says on the room channel. 'ok' (logged: say it),
-- 'chat' (not allowed to chat: don't), 'id', 'empty' or 'rate'.
create or replace function public.room_chat_log(room text, net_id text, msg text) returns text
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
  select * into rec from public.chat_ids c where c.net_id = room_chat_log.net_id for update;
  if not found or rec.user_id <> me then return 'id'; end if;
  -- The same 5 lines in 10 seconds as room_chat_send (one shared window).
  if rec.win_start > now() - interval '10 seconds' then
    if rec.win_count >= 5 then return 'rate'; end if;
    update public.chat_ids set win_count = win_count + 1 where chat_ids.net_id = rec.net_id;
  else
    update public.chat_ids set win_start = now(), win_count = 1 where chat_ids.net_id = rec.net_id;
  end if;
  select n.name into my_name from public.player_names n where n.user_id = me;
  insert into public.chat_log (room, net_id, user_id, name, msg) values (room_chat_log.room, rec.net_id, me, my_name, clean);
  return 'ok';
end $$;
revoke all on function public.room_chat_log(text, text, text) from public, anon;
grant execute on function public.room_chat_log(text, text, text) to authenticated;

-- Does a line match the search words k (already lower case)? Text, the
-- writer's or recipient's name, or the writer's email.
create or replace function public.ops_chat_match(p_k text, p_msg text, p_name text, p_to text, p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_k = '' or lower(p_msg) like '%' || p_k || '%' or lower(coalesce(p_name, '')) like '%' || p_k || '%'
      or lower(coalesce(p_to, '')) like '%' || p_k || '%'
      or exists (select 1 from auth.users u where u.id = p_uid and lower(coalesce(u.email, '')) like '%' || p_k || '%');
$$;
revoke all on function public.ops_chat_match(text, text, text, text, uuid) from public, anon, authenticated;

-- Everything players wrote, newest first. Operators only.
--   which: 'all', 'room' (public chat), 'friend', 'lock' or 'board'.
--   q: words in the text, the writer's or recipient's name, or the writer's
--      email (empty = everything).
--   before_at: only lines older than this (for "load older").
-- Rows: kind, ref (the row's id in its own table), at, place (public chat:
-- the room; love lock: its shape; board: 'free' or 'ask'), the writer's
-- account, name, text, the recipient (friend chat: their account and name;
-- both empty = "All friends"), guest, banned (from chat) and state
-- ('hidden', 'deleted' or '').
create or replace function public.ops_all_chat(which text default 'all', q text default '',
  before_at timestamptz default null, lim int default 200)
returns table (kind text, ref bigint, at timestamptz, place text, uid uuid, name text, msg text,
               to_uid uuid, to_name text, guest boolean, banned boolean, state text)
language plpgsql stable security definer set search_path = public as $$
declare
  k text := lower(btrim(coalesce(q, '')));
  want text := coalesce(nullif(which, ''), 'all');
  n int := least(greatest(coalesce(lim, 200), 1), 500);
begin
  perform public.ops_check();
  return query
    with lines as (
      (select 'room'::text as kind, l.id as ref, l.at, l.room as place, l.user_id as uid,
              coalesce(pn.name, l.name) as name, l.msg, null::uuid as to_uid, null::text as to_name, '' as state
       from public.chat_log l
       left join public.player_names pn on pn.user_id = l.user_id
       where want in ('all', 'room') and l.at > now() - interval '90 days'
         and (before_at is null or l.at < before_at)
         and public.ops_chat_match(k, l.msg, coalesce(pn.name, l.name), null, l.user_id)
       order by l.at desc limit n)
      union all
      (select 'friend', m.id, m.created_at, null, m.sender, pn.name, m.body, m.recipient,
              case when m.recipient is null then null else coalesce(rn.name, '?') end, ''
       from public.friend_messages m
       left join public.player_names pn on pn.user_id = m.sender
       left join public.player_names rn on rn.user_id = m.recipient
       where want in ('all', 'friend') and (before_at is null or m.created_at < before_at)
         and public.ops_chat_match(k, m.body, pn.name, rn.name, m.sender)
       order by m.created_at desc limit n)
      union all
      (select 'lock', c.id, c.created_at, c.shape, c.user_id, c.name, c.body, null, null,
              case when c.hidden then 'hidden' else '' end
       from public.love_locks c
       where want in ('all', 'lock') and (before_at is null or c.created_at < before_at)
         and public.ops_chat_match(k, c.body, c.name, null, c.user_id)
       order by c.created_at desc limit n)
      union all
      (select 'board', p.id, p.created_at, p.board, p.user_id, p.name, p.body, null, null,
              case when p.deleted then 'deleted' when p.hidden then 'hidden' else '' end
       from public.board_posts p
       where want in ('all', 'board') and (before_at is null or p.created_at < before_at)
         and public.ops_chat_match(k, p.body, p.name, null, p.user_id)
       order by p.created_at desc limit n)
    )
    select x.kind, x.ref, x.at, x.place, x.uid, coalesce(x.name, '?'), x.msg, x.to_uid, x.to_name,
           coalesce(u.is_anonymous, true), b.user_id is not null, x.state
    from lines x
    left join auth.users u on u.id = x.uid
    left join public.chat_bans b on b.user_id = x.uid
    order by x.at desc
    limit n;
end $$;
revoke all on function public.ops_all_chat(text, text, timestamptz, int) from public, anon;
grant execute on function public.ops_all_chat(text, text, timestamptz, int) to authenticated;

-- Hide (or show again) a love-lock note on the wall.
create or replace function public.ops_set_lock_hidden(lock_id bigint, on_off boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check();
  update public.love_locks set hidden = coalesce(on_off, false) where id = lock_id;
end $$;
revoke all on function public.ops_set_lock_hidden(bigint, boolean) from public, anon;
grant execute on function public.ops_set_lock_hidden(bigint, boolean) to authenticated;
