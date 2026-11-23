-- 069: the server checks every reward again, and cooking together pays once
-- per person a day (Yozi 2026-11-22). Run once in the SQL Editor, after
-- 068_friends_online.sql. Safe to run again.
--
-- 1. Rewards. 020_rewards.sql made the server pay each reward (r: fish,
--    stamp, ...) only up to its own limits (reward_rules). 036_gift_receipts
--    later wrote wallet_apply again from an older copy and the check was
--    lost: since then the server only held "1,000,000 a payment, 1,000,000 a
--    day" (wallet_settings), so the game decided the amount, and the
--    ledger's r stayed empty. This is 036's wallet_apply with the check put
--    back, and the limits brought up to today's rewards (stamps 30k,
--    missions 5 a day, no daily limit on jobs and fishing, ...), set from
--    the most a real player earned in a day over the last 10 days.
--    tests/reward-rules.test.mjs fails if a later file loses the check again.
--
-- 2. Cooking together. Finishing a dish with someone close by paid 6,000
--    every time, with no wait: two players made 10 and 13 in nine minutes
--    (about 400k an hour, fishing makes about 70k). Now (reward 'cook'):
--    6,000 for the first dish with each person a day (the game sends a fixed
--    op id per person and day, which the ledger takes once), up to 5 people
--    a day, and only with a medal. The high five keeps 'together'.
--    And a seasoning (정성 양념) a day for cooking with someone (kind
--    'together').
--
-- To see what each reward paid today:
--   select r, count(*), sum(n) from public.coin_ledger
--   where kind = 'earn' and at >= public.kst_day_start() group by r order by 3 desc;

insert into public.reward_rules (r, op_max, day_max, day_n, what) values
  ('checkin',  70000,  140000,    2, 'daily travel money: 10k..70k by streak (2: a day abroad can start before the Korean one)'),
  ('mission',  45000,  200000,    6, 'daily missions: 5 a day, 30k each; a paid place (cable car) adds its fare'),
  ('job',       5000, 1000000, 1000, 'part-time shift 5k and tips: no daily limit (Yozi 2026-11-21)'),
  ('delivery',  3500, 1000000, 1000, 'delivery run: no daily limit'),
  ('fish',   1000000, 1000000, 1000, 'selling fish, one payment a fish: no daily limit'),
  ('kimchi',   24000,   72000,    3, 'selling kimchi: 6k..24k, 3 a day'),
  ('medal',    22000, 1000000,  100, 'minigame medals 5k/7k/10k, once per game and medal (gold at once: 22k)'),
  ('stamp',    30000, 1000000,  100, 'tour stamps 30k, once each'),
  ('trail',    30000,   60000,    2, 'finishing a walking course: 30k, once'),
  ('view',     60000,  400000,   20, 'Bukchon views, Hanok Explorer, Jongmyo manners and rite, once each'),
  ('order',    10000,  100000,   10, 'first time ordering a menu mission 10k, once each'),
  ('quest',    30000,  400000,   30, 'guide quests: 10k (+crowd), starter path 20k, welcome high five 20k'),
  ('academy',  24000,  400000,  100, 'Korean lessons: 4k a first pass, 20k a certificate'),
  ('together',  5000,   25000,    5, 'a high five: 5k, each person once a day, 5 people'),
  ('cook',      6000,   30000,    5, 'cooking with someone near (a medal): 6k, each person once a day, 5 people'),
  ('event',   100000,  200000,    2, 'event codes (each code once per account)'),
  ('late',    100000,  100000,    1, 'money earned while the wallet was first opening'),
  ('old',      30000,  100000,   20, 'a game that names no reward')
on conflict (r) do update set op_max = excluded.op_max, day_max = excluded.day_max,
  day_n = excluded.day_n, what = excluded.what;

alter table public.coin_ledger add column if not exists r text;
create index if not exists coin_ledger_reward_day on public.coin_ledger (user_id, r, at) where kind = 'earn';

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

-- A seasoning a day for cooking with someone (052's seasoning_claim, plus
-- kind 'together': once a Korean day, one seasoning).
alter table public.seasoning_ledger drop constraint if exists seasoning_ledger_kind_check;
alter table public.seasoning_ledger add constraint seasoning_ledger_kind_check check (kind in ('start', 'daily', 'mission', 'class', 'upgrade', 'grant', 'together'));

create or replace function public.seasoning_claim(p_request_id uuid, p_kind text, p_dish text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.upgrade_config;
  v_n int;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.upgrade_config where id = 1;
  insert into public.seasonings (user_id, n) values (uid, 0) on conflict (user_id) do nothing;
  perform 1 from public.seasonings where user_id = uid for update;
  select n into v_n from public.seasonings where user_id = uid;
  if exists (select 1 from public.seasoning_ledger where user_id = uid and op_id = p_request_id) then
    return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
  end if;
  if p_kind in ('daily', 'mission', 'together') then
    if exists (select 1 from public.seasoning_ledger where user_id = uid and kind = p_kind and at >= public.kst_day_start()) then
      return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
    end if;
    if p_kind = 'daily' then
      v_n := public.seasoning_add(uid, p_request_id, 'daily', cfg.daily_n, 'check-in');
      return jsonb_build_object('status', 'ok', 'granted', cfg.daily_n, 'n', v_n);
    elsif p_kind = 'mission' then
      v_n := public.seasoning_add(uid, p_request_id, 'mission', cfg.mission_n, 'mission');
      return jsonb_build_object('status', 'ok', 'granted', cfg.mission_n, 'n', v_n);
    end if;
    v_n := public.seasoning_add(uid, p_request_id, 'together', 1, 'cooking together');
    return jsonb_build_object('status', 'ok', 'granted', 1, 'n', v_n);
  elsif p_kind = 'class' and p_dish ~ '^[a-z]{2,24}$' then
    if exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'class' and note = p_dish and at >= public.kst_day_start()) then
      return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
    end if;
    v_n := public.seasoning_add(uid, p_request_id, 'class', cfg.class_n, p_dish);
    return jsonb_build_object('status', 'ok', 'granted', cfg.class_n, 'n', v_n);
  end if;
  return jsonb_build_object('status', 'kind');
end $$;
revoke all on function public.seasoning_claim(uuid, text, text) from public, anon;
grant execute on function public.seasoning_claim(uuid, text, text) to authenticated;
