-- 075: stamps and courses pay only for real ones (Yozi 2026-11-24).
-- Run once in the SQL Editor, after 074_market_age.sql. Safe to run again.
--
-- A stamp (30k) and a course (30k) are paid once each: the game sends a
-- fixed op id made from 'stamp:<id>' (onceId in src/core/wallet.js) and the
-- ledger takes each op id once per account. But the server never checked
-- the id was a real stamp, so a changed browser could send made-up ids:
-- up to 100 stamps a day (1,000,000) and 2 courses (60,000), every day.
-- Checked before this file: all 30 stamp and course payments on the ledger
-- are real ones (no made-up id used).
--
-- Now the server keeps the real op ids (reward_once_ids) and wallet_apply
-- pays a reward that has a list only for an op id on it ('bad' otherwise).
-- Completing every stamp pays no money (only the gold map border).
--
-- Adding a stamp or a course: add its row here in a new file
-- (tests/reward-once-ids.test.mjs fails until you do; it prints the row).

create table if not exists public.reward_once_ids (
  op_id uuid primary key,
  r text not null,
  what text not null
);
alter table public.reward_once_ids enable row level security;
revoke all on public.reward_once_ids from public, anon, authenticated;

insert into public.reward_once_ids (r, what, op_id) values
  ('stamp', 'namsan', '6fa2f31a-be5b-47fc-b2b5-57134a2b64ed'),
  ('stamp', 'museum', 'b907346c-74d2-4528-aad7-e0f6361260c8'),
  ('stamp', 'war-memorial', 'fa99f296-14b9-444c-9ad7-3c42e6dff99a'),
  ('stamp', 'hongdae', 'db5d11ac-8a44-4a32-aaa2-1be9e2e46299'),
  ('stamp', 'seongsu', '41399bac-ccd0-47bb-9239-1c494eda0af2'),
  ('stamp', 'seoul-forest', '7b481d32-84fc-4eb0-9aa0-be517625d430'),
  ('stamp', 'hangang', 'e338d4f4-584c-4feb-a21e-98a416ada72a'),
  ('stamp', 'drone-show', 'a14f3a2c-0a32-497d-a2e5-09a0c2819707'),
  ('stamp', 'gyeongbokgung', 'd96376ce-0685-41ea-9a66-ee2092f0ee48'),
  ('stamp', 'bukchon', '2fdac834-0616-400e-9a5b-64bcd269f946'),
  ('stamp', 'jongmyo', 'd88452f6-9c38-47b8-926c-80a1c6c3e9ed'),
  ('stamp', 'heunginjimun', 'c4a1591b-bc65-4749-8a3c-1f68d6c8c166'),
  ('stamp', 'igansumun', '26dc0709-bcf3-4dce-a214-00754ee2a0f3'),
  ('stamp', 'sungnyemun', '72998d91-3ec9-488f-b2be-d7fa02b94c07'),
  ('stamp', 'myeongdong-cathedral', '1bfa4022-18b4-47d4-aa86-219dd631ee23'),
  ('stamp', 'ddp', '03467980-a86c-467d-824e-04d7defcd5c3'),
  ('stamp', 'suragan', '167e20ce-6843-4876-92e4-c77eb63a1d4d'),
  ('stamp', 'seokchon', '09368131-8e56-47b4-9291-53797a1a9952'),
  ('stamp', 'hyojae', '1965af4f-7ee6-4c75-82c8-00a34260cfe8'),
  ('stamp', 'yeonnam', 'e6ddac47-3e4f-46d8-baff-e88bea4c8020'),
  ('stamp', 'mangwon-market', '373e3525-b282-4370-b25c-df597aaae6f5'),
  ('stamp', 'mangwon-pier', '272262b2-ec0f-46e8-8a4b-6295567f9ac8'),
  ('stamp', 'banpo-jamwon', '1a8c0573-dace-4254-a2ca-85cd1ae5bc7c'),
  ('stamp', 'yeouido', 'df91152b-20b6-485a-9263-af69ce16c089'),
  ('stamp', 'seoul-dal', 'cfc6c767-98f8-4e34-b233-8d3a6635eaae'),
  ('stamp', 'grand-park', 'b4ce2fb1-d4d2-4cab-9a4f-069d66c682d9'),
  ('stamp', 'konext', '1a5a4e05-9e05-4a41-b25e-f1e9427ad9fa'),
  ('stamp', 'bongeunsa', 'a76647a4-fc8f-4c37-a27a-6bdbf6264b7b'),
  ('stamp', 'dongmyo-market', '7df3f6ef-6a5a-4672-82ff-8188d2a0d877'),
  ('stamp', 'another-dome', 'f0a2d882-da3c-466d-8214-c42cbaa5019a'),
  ('stamp', 'botanic', '556e5c91-7679-4ee2-9a13-c0685295cc1c'),
  ('trail', 'royal', '2f0e4fec-bc92-450c-b214-1f6476e4ac7a')
on conflict (op_id) do update set r = excluded.r, what = excluded.what;

-- 069's wallet_apply, with the check above added.
create or replace function public.wallet_apply(p_ops jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  v_free boolean;
  v_today bigint;
  op jsonb;
  v_id uuid;
  v_ref uuid;
  v_k text;
  v_asked int;
  v_n int;
  v_st text;
  v_orig int;
  v_back int;
  v_sold boolean;
  v_row public.coin_ledger;
  v_r text;
  v_rule public.reward_rules;
  v_rsum bigint;
  v_rcnt int;
  v_changed boolean := false;
  v_out jsonb := '[]'::jsonb;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if jsonb_typeof(p_ops) is distinct from 'array' or jsonb_array_length(p_ops) > 50 then
    return jsonb_build_object('status', 'bad');
  end if;
  select * into s from public.wallet_settings where id = 1;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'open'); end if;
  v_free := exists (select 1 from public.operators o where o.user_id = uid);
  select coalesce(sum(l.n), 0) into v_today from public.coin_ledger l
    where l.user_id = uid and l.kind = 'earn' and l.at >= public.kst_day_start();

  for op in select value from jsonb_array_elements(p_ops) loop
    begin
      v_id := (op ->> 'id')::uuid;
    exception when others then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', op ->> 'id', 'n', 0, 'status', 'bad'));
      continue;
    end;
    if v_id is null then continue; end if;

    -- Sent before (a retry): report what happened then, move nothing.
    select * into v_row from public.coin_ledger where user_id = uid and op_id = v_id;
    if found then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'n', v_row.n, 'status', v_row.status));
      continue;
    end if;

    v_k := coalesce(op ->> 'k', '');
    v_asked := 0;
    v_ref := null;
    begin
      v_asked := least(greatest(round((op ->> 'n')::numeric), -1000000), 1000000)::int;
    exception when others then
      v_asked := 0;
    end;
    v_n := 0;
    v_st := 'ok';
    v_r := null;

    if v_k = 'spend' and v_asked < 0 then
      if w.coins >= -v_asked then v_n := v_asked; else v_st := 'poor'; end if;
    elsif v_k = 'take' and v_asked < 0 then
      v_n := -least(-v_asked, w.coins)::int;
    elsif v_k = 'refund' and v_asked > 0 then
      begin v_ref := (op ->> 'ref')::uuid; exception when others then v_ref := null; end;
      v_orig := null;
      select l.n into v_orig from public.coin_ledger l
        where l.user_id = uid and l.op_id = v_ref and l.n < 0 and l.at > now() - interval '1 day'
          and not exists (select 1 from public.gift_binds g where g.op = v_ref and g.giver = uid);
      if v_orig is null then
        v_st := 'noref';
      else
        select coalesce(sum(l.n), 0) into v_back from public.coin_ledger l
          where l.user_id = uid and l.ref = v_ref and l.kind in ('refund', 'resell');
        v_n := greatest(0, least(v_asked, -v_orig - v_back));
        if v_n < v_asked then v_st := 'cap'; end if;
      end if;
    elsif v_k = 'resell' and v_asked > 0 then
      -- Selling something back: the purchase it comes from is on the ledger.
      begin v_ref := (op ->> 'ref')::uuid; exception when others then v_ref := null; end;
      if v_ref is null and coalesce(op ->> 'bn', '') <> '' then
        -- Bought before receipts kept the purchase's id: the oldest purchase
        -- with that note and price that hasn't been sold back yet.
        begin
          select l.op_id into v_ref from public.coin_ledger l
            where l.user_id = uid and l.kind = 'spend' and l.status = 'ok'
              and l.note = left(op ->> 'bn', 80) and l.n = -abs(round((op ->> 'paid')::numeric))::int
              and not exists (select 1 from public.coin_ledger r
                              where r.user_id = uid and r.ref = l.op_id and r.kind = 'resell')
            order by l.at limit 1;
        exception when others then v_ref := null;
        end;
      end if;
      v_orig := null;
      if v_ref is not null then v_orig := public.buy_line(uid, v_ref); end if;
      if v_orig is null then
        v_st := 'noref';
      else
        select exists (select 1 from public.coin_ledger r
                       where r.user_id = uid and r.ref = v_ref and r.kind = 'resell') into v_sold;
        if v_sold then
          v_st := 'sold';
        else
          v_back := public.buy_back(uid, v_ref);
          v_n := greatest(0, least(v_asked, floor((-v_orig - v_back) * s.resell_pct / 100.0)))::int;
          if v_n < v_asked then v_st := 'cap'; end if;
        end if;
      end if;
    elsif v_k = 'earn' and v_asked > 0 then
      -- Which reward it is: each pays up to its own limits (reward_rules).
      -- A game that names none: 'old'. A name the server doesn't know: 'bad'.
      v_r := left(coalesce(nullif(op ->> 'r', ''), 'old'), 16);
      if v_free then
        v_n := v_asked;
      else
        select * into v_rule from public.reward_rules where r = v_r;
        if not found then
          v_st := 'bad';
        elsif exists (select 1 from public.reward_once_ids o where o.r = v_r)
              and not exists (select 1 from public.reward_once_ids o where o.r = v_r and o.op_id = v_id) then
          -- A reward paid once per real thing (a stamp, a course): only the
          -- op ids the game really sends (075). A made-up id gets nothing.
          v_st := 'bad';
        else
          select coalesce(sum(l.n), 0), count(*) into v_rsum, v_rcnt from public.coin_ledger l
            where l.user_id = uid and l.kind = 'earn' and l.r = v_r and l.n > 0
              and l.at >= public.kst_day_start();
          if v_rcnt >= v_rule.day_n then
            v_st := 'cap';
          else
            v_n := greatest(0, least(v_asked, v_rule.op_max, s.earn_op_max,
                                     v_rule.day_max - v_rsum, s.earn_day_max - v_today))::int;
            if v_n < v_asked then v_st := 'cap'; end if;
            v_today := v_today + v_n;
          end if;
        end if;
      end if;
    else
      v_st := 'bad';
    end if;

    w.coins := w.coins + v_n;
    if v_n <> 0 then v_changed := true; end if;
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal, r)
      values (uid, v_id, left(v_k, 12), v_asked, v_n, v_st, left(op ->> 'note', 80), v_ref, w.coins, v_r);
    v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'n', v_n, 'status', v_st));
  end loop;

  if v_changed then
    update public.wallets set coins = w.coins, ver = ver + 1, updated_at = now()
      where user_id = uid returning * into w;
  end if;
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'results', v_out);
end $$;
revoke all on function public.wallet_apply(jsonb) from public, anon;
grant execute on function public.wallet_apply(jsonb) to authenticated;
