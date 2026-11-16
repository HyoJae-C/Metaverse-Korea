-- 049: 개인 공지창 (한 사람에게만 보이는 안내 팝업) (2026-11-16)
--
-- player_notices에 한 줄 넣으면 그 사람이 다음에 접속할 때(또는 접속 중이면
-- 다음 접속 때) 팝업으로 한 번 보임. 확인을 누르면 seen_at이 찍히고 다시 안 뜸.
-- body: 언어별 글 {"ko": "...", "en": "...", "ja": "...", "zh": "..."}
--       (없는 언어는 en으로, en도 없으면 ko로 보임)
-- won: 같이 지급한 돈(이미 coin_ledger로 따로 지급한 것; 여기선 표시용 + 지갑 새로고침)

create table if not exists public.player_notices (
  id bigserial primary key,
  user_id uuid not null,
  body jsonb not null,
  won bigint not null default 0,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists player_notices_unseen on public.player_notices (user_id) where seen_at is null;
alter table public.player_notices enable row level security; -- 직접 읽기·쓰기 없음, 아래 함수로만

-- 내 안 본 공지 + 지금 지갑(돈이 바뀐 걸 바로 보이게)
create or replace function public.my_notices()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w public.wallets;
begin
  if uid is null then return jsonb_build_object('notices', '[]'::jsonb); end if;
  select * into w from public.wallets where user_id = uid;
  return jsonb_build_object(
    'notices', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'body', body, 'won', won, 'at', created_at) order by id)
                         from public.player_notices where user_id = uid and seen_at is null), '[]'::jsonb),
    'coins', w.coins, 'ver', w.ver);
end $$;

create or replace function public.notice_seen(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.player_notices set seen_at = now() where id = p_id and user_id = auth.uid() and seen_at is null;
$$;

revoke all on function public.my_notices() from public, anon;
revoke all on function public.notice_seen(bigint) from public, anon;
grant execute on function public.my_notices() to authenticated;
grant execute on function public.notice_seen(bigint) to authenticated;
notify pgrst, 'reload schema';

-- 케이블카 미션 오류 보상 안내 (048로 지급한 5명)
insert into public.player_notices (user_id, body, won)
select uid, jsonb_build_object(
  'ko', '남산 하늘 케이블카 방문 미션 오류 안내' || chr(10) || chr(10) ||
        '케이블카를 타도 「남산 하늘 케이블카 방문하기」 미션이 완료되지 않는 오류가 있었어요. 불편을 드려 죄송합니다.' || chr(10) ||
        '지금은 고쳐서 케이블카를 타면 미션이 완료돼요.' || chr(10) || chr(10) ||
        '보상: ₩' || to_char(won, 'FM999,999') || ' (' || detail_ko || ')' || chr(10) || '여행 지갑에 넣어 드렸어요.',
  'en', 'Namsan Sky Cable mission fix' || chr(10) || chr(10) ||
        'Riding the cable car did not finish the "Visit Namsan Sky Cable" mission. Sorry for the trouble.' || chr(10) ||
        'It''s fixed now: getting in the cable car finishes the mission.' || chr(10) || chr(10) ||
        'Compensation: ₩' || to_char(won, 'FM999,999') || ' (' || detail_en || ')' || chr(10) || 'It''s in your travel wallet.'
), won
from (values
  ('4f193bba-c8c7-455f-ba5a-919623532e67'::uuid, 75000, '미션 보상 10,000 + 완료 보너스 50,000 + 케이블카 요금 1회 환불 15,000', 'mission 10,000 + all-done bonus 50,000 + 1 cable car fare back 15,000'), -- 다람쥐4
  ('20492803-b8e0-4a0f-8740-dcecf668fb3e'::uuid, 75000, '미션 보상 10,000 + 완료 보너스 50,000 + 케이블카 요금 1회 환불 15,000', 'mission 10,000 + all-done bonus 50,000 + 1 cable car fare back 15,000'), -- Pig
  ('55dea061-89d0-4232-bcbe-a21cb154fb8f'::uuid, 90000, '미션 보상 10,000 + 완료 보너스 50,000 + 케이블카 요금 2회 환불 30,000', 'mission 10,000 + all-done bonus 50,000 + 2 cable car fares back 30,000'), -- 공쥬님
  ('a7af6230-6d28-45d8-bdd3-e556e43efb74'::uuid, 60000, '미션 보상 10,000 + 완료 보너스 50,000', 'mission 10,000 + all-done bonus 50,000'), -- 예헤
  ('70d78a65-525a-408c-91d2-050d21806543'::uuid, 10000, '미션 보상 10,000', 'mission 10,000') -- 11월의대구
) as t(uid, won, detail_ko, detail_en)
where not exists (select 1 from public.player_notices p where p.user_id = t.uid and p.body->>'en' like 'Namsan Sky Cable mission fix%');

-- 확인: 누가 봤는지
select (select string_agg(distinct name, '/') from public.player_names n where n.user_id = p.user_id) as name, won, created_at, seen_at
from public.player_notices p order by id;
