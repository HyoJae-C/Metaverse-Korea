-- 공지 고정 고치기 (030 다시 적용 + 기능 이후 보낸 공지 고정)
-- Supabase SQL Editor → New query → 전체 붙여 넣기 → Run. 여러 번 실행해도 안전해요.
-- 맨 아래 결과표의 pinned 열이 true인 공지가 화면에 고정돼요.

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

-- 고정 기능이 머지된 뒤(2026-11-08 22:20 UTC)에 보낸 공지인데 고정이 안 된 것들을 고정해요.
-- (SQL을 실행하기 전에 보낸 공지는 고정 표시 없이 저장됐기 때문이에요.)
update public.announcements set pinned = true
where created_at > timestamptz '2026-11-08 22:20:00+00' and not pinned;

notify pgrst, 'reload schema';

-- 확인: 최근 공지 10개와 고정 여부
select id, left(body, 40) as body, created_at, pinned
from public.announcements order by id desc limit 10;
