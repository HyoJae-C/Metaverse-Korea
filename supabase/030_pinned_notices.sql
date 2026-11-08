-- Pinned notices (공지 고정): an operator's notice stays on everyone's screen
-- until an operator deletes it, and players who join later see it too.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 012_announcements.sql and 013_announcement_delete.sql.
--
-- Notices sent before this file stay unpinned (they don't all come back).
-- Every notice sent after it is pinned. Delete it on the operator page
-- (admin.html → Announce → Delete) and it leaves every screen at once.
-- Automatic event notices (drone show and so on) are not stored here and
-- are not affected.

alter table public.announcements add column if not exists pinned boolean not null default false;

-- Send a notice (operators only), pinned. Returns { id, body, at, pinned }.
create or replace function public.ops_announce(msg text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b text := left(btrim(regexp_replace(coalesce(msg, ''), '[[:cntrl:]]', ' ', 'g')), 300);
  r public.announcements;
  payload jsonb;
begin
  perform public.ops_check();
  if b = '' then raise exception 'empty notice' using errcode = '22023'; end if;
  if (select count(*) from public.announcements where created_at > now() - interval '1 minute') >= 5 then
    raise exception 'too many notices, wait a minute' using errcode = '54000';
  end if;
  insert into public.announcements (body, sender, pinned) values (b, auth.uid(), true) returning * into r;
  payload := jsonb_build_object('id', r.id, 'body', r.body, 'at', r.created_at, 'pinned', true);
  begin
    perform realtime.send(payload, 'n', 'announce', true);
  exception when others then
    null; -- still stored: late joiners and the next reload pick it up
  end;
  return payload;
end $$;
revoke all on function public.ops_announce(text) from public, anon;
grant execute on function public.ops_announce(text) to authenticated;

-- Notices still pinned (not deleted), newest first, at most 5: for players joining now.
create or replace function public.pinned_announcements()
returns table (id bigint, body text, at timestamptz, pinned boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.body, a.created_at, a.pinned from public.announcements a
  where a.pinned
  order by a.id desc limit 5;
$$;
grant execute on function public.pinned_announcements() to anon, authenticated;

-- The operator page's list, now saying which notices are pinned.
drop function if exists public.ops_announcements(int);
create function public.ops_announcements(lim int default 30)
returns table (id bigint, body text, at timestamptz, sender_name text, pinned boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return query
    select a.id, a.body, a.created_at, n.name, a.pinned from public.announcements a
    left join public.player_names n on n.user_id = a.sender
    order by a.id desc
    limit least(greatest(coalesce(lim, 30), 1), 200);
end $$;
revoke all on function public.ops_announcements(int) from public, anon;
grant execute on function public.ops_announcements(int) to authenticated;
