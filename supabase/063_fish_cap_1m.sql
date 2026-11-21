-- 063: 낚시 판매 상한 50만 → 100만 (Yozi 2026-11-21, #840 희귀종 가격 인상과 함께)
-- 물고기는 브라우저에서 뽑으니 서버는 상한으로만 막음(서버 뽑기는 나중에).
-- 정상 낚시로 하루 약 14시간 걸려야 닿는 금액. 한 번 판매 상한도 100만(전설 여러 마리 든 가방).
update public.reward_rules
   set op_max = 1000000, day_max = 1000000, day_n = 120,
       what = 'selling fish: about 70k an hour of steady fishing (2026-11-21 rare prices up)'
 where r = 'fish';

select r, op_max, day_max, day_n from public.reward_rules where r = 'fish';
