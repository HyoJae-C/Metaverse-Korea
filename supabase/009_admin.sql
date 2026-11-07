-- The operator page (admin.html): overview numbers, inquiry board with
-- replies, free board moderation and a player list with chat bans.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 002_board.sql, 003_names.sql, 004_chat.sql, 005_operators.sql and
-- 008_player_where.sql.
--
-- Everything here only works for accounts listed in "operators"; anyone
-- else gets an error. The game itself only gains one thing: a player sees
-- the operator's reply under their own inquiry.

-- Is the person asking an operator? (The page checks this first.)
create or replace function public.am_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.operators where user_id = auth.uid());
$$;
grant execute on function public.am_operator() to authenticated;

create or replace function public.ops_check() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.am_operator() then
    raise exception 'operators only' using errcode = '42501';
  end if;
end $$;
revoke all on function public.ops_check() from public, anon, authenticated;

-- ---------- Replies to inquiries ----------
alter table public.board_posts add column if not exists reply text check (char_length(reply) <= 2000);
alter table public.board_posts add column if not exists replied_at timestamptz;
alter table public.board_posts add column if not exists done boolean not null default false; -- handled (with or without a reply)

-- A new post never comes with a reply, whatever the writer sends.
create or replace function public.board_posts_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.hidden := false;
  new.deleted := false;
  new.reply := null;
  new.replied_at := null;
  new.done := false;
  return new;
end $$;

-- ---------- Overview ----------
create or replace function public.ops_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  perform public.ops_check();
  return jsonb_build_object(
    'online_now', (select count(*) from public.player_where where updated_at > now() - interval '90 seconds'),
    'played_today', (select count(*) from public.player_where where updated_at >= day_start),
    'played_7d', (select count(*) from public.player_where where updated_at > now() - interval '7 days'),
    'accounts', (select count(*) from auth.users),
    'accounts_google', (select count(*) from auth.users where not coalesce(is_anonymous, false)),
    'new_today', (select count(*) from auth.users where created_at >= day_start),
    'names', (select count(*) from public.player_names),
    'open_inquiries', (select count(*) from public.board_posts where board = 'ask' and not deleted and not done),
    'inquiries_today', (select count(*) from public.board_posts where board = 'ask' and created_at >= day_start),
    'free_today', (select count(*) from public.board_posts where board = 'free' and created_at >= day_start),
    'chat_bans', (select count(*) from public.chat_bans)
  );
end $$;
grant execute on function public.ops_stats() to authenticated;

-- ---------- Boards ----------
-- Posts on a board, newest first. only_open: inquiries not handled yet.
create or replace function public.ops_board(b text, only_open boolean default false, lim int default 100)
returns table (id bigint, uid uuid, name text, body text, created_at timestamptz, hidden boolean,
               deleted boolean, reply text, replied_at timestamptz, done boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return query
    select p.id, p.user_id, p.name, p.body, p.created_at, p.hidden, p.deleted, p.reply, p.replied_at, p.done
    from public.board_posts p
    where p.board = b and (not only_open or (not p.done and not p.deleted))
    order by p.created_at desc
    limit least(greatest(coalesce(lim, 100), 1), 500);
end $$;
grant execute on function public.ops_board(text, boolean, int) to authenticated;

-- Reply to an inquiry (the writer sees it in the game) and mark it handled.
-- An empty reply removes it.
create or replace function public.ops_reply(post_id bigint, reply_text text) returns void
language plpgsql security definer set search_path = public as $$
declare r text := nullif(btrim(coalesce(reply_text, '')), '');
begin
  perform public.ops_check();
  update public.board_posts
     set reply = left(r, 2000), replied_at = case when r is null then null else now() end, done = (r is not null) or done
   where id = post_id and board = 'ask';
end $$;
grant execute on function public.ops_reply(bigint, text) to authenticated;

create or replace function public.ops_set_done(post_id bigint, on_off boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check();
  update public.board_posts set done = coalesce(on_off, false) where id = post_id;
end $$;
grant execute on function public.ops_set_done(bigint, boolean) to authenticated;

create or replace function public.ops_set_hidden(post_id bigint, on_off boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check();
  update public.board_posts set hidden = coalesce(on_off, false) where id = post_id;
end $$;
grant execute on function public.ops_set_hidden(bigint, boolean) to authenticated;

-- ---------- Players ----------
-- Accounts, most recently seen first; q filters by player name or e-mail.
create or replace function public.ops_players(q text default '', lim int default 100)
returns table (uid uuid, name text, email text, guest boolean, joined timestamptz, last_seen timestamptz,
               last_save timestamptz, place text, banned boolean, ban_reason text, operator boolean, posts int)
language plpgsql stable security definer set search_path = public as $$
declare k text := lower(btrim(coalesce(q, '')));
begin
  perform public.ops_check();
  return query
    select u.id, coalesce(n.name, nullif(w.name, '')), u.email::text, coalesce(u.is_anonymous, false), u.created_at,
           w.updated_at, s.updated_at, w.place, b.user_id is not null, b.reason,
           exists (select 1 from public.operators o where o.user_id = u.id),
           (select count(*)::int from public.board_posts bp where bp.user_id = u.id)
    from auth.users u
    left join public.player_names n on n.user_id = u.id
    left join public.player_where w on w.user_id = u.id
    left join public.saves s on s.user_id = u.id
    left join public.chat_bans b on b.user_id = u.id
    where k = '' or lower(coalesce(n.name, w.name, '')) like '%' || k || '%' or lower(coalesce(u.email, '')) like '%' || k || '%'
    order by coalesce(w.updated_at, s.updated_at, u.created_at) desc nulls last
    limit least(greatest(coalesce(lim, 100), 1), 500);
end $$;
grant execute on function public.ops_players(text, int) to authenticated;

-- Stop (or let again) an account chatting (004_chat.sql chat_bans).
create or replace function public.ops_set_ban(target uuid, on_off boolean, why text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check();
  if on_off then
    insert into public.chat_bans (user_id, reason) values (target, left(why, 200))
    on conflict (user_id) do update set reason = excluded.reason;
  else
    delete from public.chat_bans where user_id = target;
  end if;
end $$;
grant execute on function public.ops_set_ban(uuid, boolean, text) to authenticated;
