-- Chat for 90 days, and each writer's country on the operator page
-- (Yozi 2026-11-13).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 006, 010 (player_country_days), 024 and 043.
--
-- 1. Friend messages are now kept 90 days like public chat (were 180), so
--    the privacy notice can say one thing for all chat: "kept 90 days, then
--    deleted automatically". Running this deletes friend messages older
--    than 90 days right away.
-- 2. The operator page's Chat tab shows the country each writer last
--    played from: the two-letter code the game guesses from the browser's
--    time zone once a day (010_countries.sql). No IP address is used. It is
--    a guess: a traveller or a changed time zone shows another country.
-- 3. The Players tab shows the country each account first played from
--    (about when it signed up: the first day it reported one) and the
--    latest one. Google sign-in itself gives no country.

delete from public.friend_messages where created_at < now() - interval '90 days';

-- 006's friend_send, tidying messages older than 90 days instead of 180.
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
  if random() < 0.02 then delete from public.friend_messages where created_at < now() - interval '90 days'; end if;
  return jsonb_build_object('ok', true, 'id', rec.id, 'at', rec.created_at);
end $$;
grant execute on function public.friend_send(uuid, text) to authenticated;

-- The country an account last reported (010_countries.sql): 'KR', 'JP', …,
-- 'XX' for unknown, or null if it never reported one.
create or replace function public.ops_country(p_uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select d.country from public.player_country_days d
  where d.user_id = p_uid
  order by (d.country = 'XX'), d.day desc
  limit 1;
$$;
revoke all on function public.ops_country(uuid) from public, anon, authenticated;

-- For the Players tab: each account's first known country (about its
-- sign-up) and its latest one. Unknown days ('XX') are skipped.
create or replace function public.ops_player_countries(uids uuid[])
returns table (uid uuid, first_country text, last_country text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return query
    select u.id,
      (select d.country from public.player_country_days d where d.user_id = u.id and d.country <> 'XX' order by d.day limit 1),
      (select d.country from public.player_country_days d where d.user_id = u.id and d.country <> 'XX' order by d.day desc limit 1)
    from unnest(coalesce(uids, '{}')) as u(id)
    limit 500;
end $$;
revoke all on function public.ops_player_countries(uuid[]) from public, anon;
grant execute on function public.ops_player_countries(uuid[]) to authenticated;

-- 024's ops_chat_log and 043's ops_all_chat with a country column. A
-- function's columns can't change in place, so they are made again.
drop function if exists public.ops_chat_log(text, bigint, int);
create or replace function public.ops_chat_log(q text default '', before_id bigint default null, lim int default 200)
returns table (id bigint, at timestamptz, room text, net_id text, uid uuid, name text, msg text, guest boolean, banned boolean, country text)
language plpgsql stable security definer set search_path = public as $$
declare k text := lower(btrim(coalesce(q, '')));
begin
  perform public.ops_check();
  return query
    select l.id, l.at, l.room, l.net_id, l.user_id, coalesce(n.name, l.name), l.msg,
           coalesce(u.is_anonymous, true), b.user_id is not null, public.ops_country(l.user_id)
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

drop function if exists public.ops_all_chat(text, text, timestamptz, int);
-- Everything players wrote, newest first. Operators only.
--   which: 'all', 'room' (public chat), 'friend', 'lock' or 'board'.
--   q: words in the text, the writer's or recipient's name, or the writer's
--      email (empty = everything).
--   before_at: only lines older than this (for "load older").
-- Rows: kind, ref (the row's id in its own table), at, place (public chat:
-- the room; love lock: its shape; board: 'free' or 'ask'), the writer's
-- account, name, text, the recipient (friend chat: their account and name;
-- both empty = "All friends"), guest, banned (from chat), state
-- ('hidden', 'deleted' or '') and country (the writer's latest, see ops_country).
create or replace function public.ops_all_chat(which text default 'all', q text default '',
  before_at timestamptz default null, lim int default 200)
returns table (kind text, ref bigint, at timestamptz, place text, uid uuid, name text, msg text,
               to_uid uuid, to_name text, guest boolean, banned boolean, state text, country text)
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
       where want in ('all', 'friend') and m.created_at > now() - interval '90 days' and (before_at is null or m.created_at < before_at)
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
           coalesce(u.is_anonymous, true), b.user_id is not null, x.state, public.ops_country(x.uid)
    from lines x
    left join auth.users u on u.id = x.uid
    left join public.chat_bans b on b.user_id = x.uid
    order by x.at desc
    limit n;
end $$;
revoke all on function public.ops_all_chat(text, text, timestamptz, int) from public, anon;
grant execute on function public.ops_all_chat(text, text, timestamptz, int) to authenticated;
