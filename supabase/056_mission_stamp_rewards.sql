-- 056: 스탬프 1만 → 3만, 일일 미션 3개 → 5개, 미션 하나에 3만 (Yozi 2026-11-19)
-- 게임 배포 전에 실행 (먼저 실행해도 지금 게임엔 영향 없음: 상한만 넓어짐).
--
-- 1) 서버 보상 상한
--    mission: 5개 모두 3만씩 (다 했을 때 보너스는 없앰), 유료 장소 방문 미션은
--             요금만큼 더 (케이블카 3만 + 1.5만 = 4.5만) → 한 번에 최대 4.5만,
--             하루 최대 16.5만, 5번
--    stamp:   3만, 한 곳 한 번 (하루 40곳까지)
update public.reward_rules set op_max = 45000, day_max = 165000, day_n = 5,
  what = 'daily missions: 5 a day, 30k each; a paid place (cable car) adds its fare'
  where r = 'mission';
update public.reward_rules set op_max = 30000, day_max = 1200000, day_n = 40,
  what = 'tour stamps 30k, once each'
  where r = 'stamp';

-- 2) 이미 모은 스탬프 차액 (스탬프 하나에 2만), 한 사람에 한 줄
--    스탬프 수는 저장(saves.data 'mk.stamps')에서 실제 스탬프 30곳만 셈
--    (메뉴 주문 'order:…'과 '_all'은 빼고). 운영자 제외.
--    고정 op id라 다시 실행해도 두 번 안 줌. 받은 사람에게 개인 공지 팝업도 한 번.
do $$
declare
  g record;
  w public.wallets;
  v_op uuid;
  v_won bigint;
begin
  for g in
    with ids(id) as (select unnest(array[
      'namsan','museum','war-memorial','hongdae','seongsu','seoul-forest','hangang','drone-show',
      'gyeongbokgung','bukchon','jongmyo','heunginjimun','igansumun','sungnyemun','myeongdong-cathedral',
      'ddp','suragan','seokchon','hyojae','yeonnam','mangwon-market','mangwon-pier','banpo-jamwon',
      'yeouido','seoul-dal','grand-park','konext','bongeunsa','dongmyo-market','another-dome'])),
    s as (
      select user_id, (data->>'mk.stamps')::jsonb j from public.saves
      where data ? 'mk.stamps' and jsonb_typeof(data->'mk.stamps') = 'string'
        and user_id not in (select user_id from public.operators))
    select s.user_id uid, (select count(*) from ids where s.j ? ids.id) n from s
  loop
    continue when g.n = 0;
    v_won := g.n * 20000;
    v_op := md5('stamp-top-up-2026-11-19:' || g.uid::text)::uuid;
    continue when exists (select 1 from public.coin_ledger where user_id = g.uid and op_id = v_op);
    update public.wallets set coins = coins + v_won, ver = ver + 1, updated_at = now()
      where user_id = g.uid returning * into w;
    continue when w.user_id is null; -- no wallet yet: their next stamps pay 30k anyway
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
      values (g.uid, v_op, 'bonus', v_won, v_won, 'ok', 'Stamp top-up · ' || g.n || ' stamps × 20k', null, w.coins);
    insert into public.player_notices (user_id, body, won) values (g.uid, jsonb_build_object(
      'ko', '🔖 스탬프 보상이 1만 → 3만 원으로 올랐어요! 이미 모은 스탬프 ' || g.n || '개의 차액 🪙 ' || to_char(v_won, 'FM999,999,999') || '을 드려요.',
      'en', '🔖 Stamp rewards are now ₩30,000 (were ₩10,000)! Here''s the difference for the ' || g.n || ' stamps you already have: 🪙 ' || to_char(v_won, 'FM999,999,999') || '.',
      'ja', '🔖 スタンプ報酬が₩10,000→₩30,000に！集めたスタンプ' || g.n || '個分の差額 🪙 ' || to_char(v_won, 'FM999,999,999') || 'をどうぞ。',
      'zh', '🔖 印章奖励从₩10,000提高到₩30,000！已收集的' || g.n || '个印章补发差额 🪙 ' || to_char(v_won, 'FM999,999,999') || '。'
    ), v_won);
  end loop;
end $$;

-- 확인: 받은 사람 수와 합계
select count(*) as people, sum(n) as won
from public.coin_ledger where kind = 'bonus' and note like 'Stamp top-up%';
