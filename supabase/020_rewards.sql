-- 020: the server knows every reward (run once, after 018_won.sql).
--
-- Until now the server took the amount the game asked for and only checked
-- the overall caps (earn_op_max, earn_day_max), so anyone could call
-- wallet_apply by hand and take the whole day's cap. Now the game names the
-- reward (r: job, fish, checkin, ...) and the server pays each one only up to
-- its own limits: the most one payment may give (op_max), the most per day
-- (day_max) and how many payments per day (day_n), counted on the Korean
-- day. A reward the server doesn't know pays nothing (status 'bad'), so the
-- developer coin code and the test hooks pay only operators.
--
-- Rewards given once (a medal, a stamp, the daily check-in) come with a fixed
-- op id, and the ledger takes an op id once per account: clearing the
-- browser's storage no longer earns them again.
--
-- To change a limit later:
--   update public.reward_rules set day_max = 200000 where r = 'job';
-- To see what each reward paid today:
--   select r, count(*), sum(n) from public.coin_ledger
--   where kind = 'earn' and at >= public.kst_day_start() group by r order by 3 desc;

create table if not exists public.reward_rules (
  r text primary key,
  op_max bigint not null check (op_max >= 0),  -- the most one payment gives (won)
  day_max bigint not null check (day_max >= 0), -- the most per Korean day
  day_n int not null check (day_n >= 0),        -- payments per Korean day
  what text
);
alter table public.reward_rules enable row level security; -- only the wallet functions read it

insert into public.reward_rules (r, op_max, day_max, day_n, what) values
  ('checkin',  70000,   70000,  1, 'daily travel money: 10k..70k by streak, once a day'),
  ('mission',  60000,   80000,  3, 'daily missions: 10k each, +50k when all three are done'),
  ('job',       5000,   25000,  5, 'part-time shift: 5k, 5 shifts a day'),
  ('delivery',  3500,   17500,  5, 'delivery run: 3.5k (shares the 5 shifts)'),
  ('fish',    500000,  500000, 60, 'selling fish: about 160k an hour of steady fishing'),
  ('kimchi',   24000,   72000,  3, 'selling kimchi: 6k..24k, 3 a day'),
  ('medal',    22000,  300000, 40, 'minigame medals 5k/7k/10k, once per game and medal (gold at once pays all three: 22k)'),
  ('stamp',    10000,  400000, 40, 'tour stamps 10k, once each'),
  ('trail',   100000,  300000,  4, 'finishing a stamp trail, once each'),
  ('view',     60000,  400000, 20, 'Bukchon views, Hanok Explorer, Jongmyo manners and rite, once each'),
  ('order',    10000,  100000, 10, 'first time ordering a menu mission 10k, once each'),
  ('quest',    30000,  300000, 15, 'guide quests: 10k (+crowd up to 10k), starter path 20k, welcome high five 20k'),
  ('academy',  24000,  200000, 20, 'Korean lessons: 4k a first pass, 20k a certificate'),
  ('together',  6000,   40000, 10, 'cooking with someone near 6k, a high five 5k (each person once a day)'),
  ('event',   100000,  200000,  2, 'event codes (each code once per account)'),
  ('late',    100000,  100000,  1, 'money earned while the wallet was first opening'),
  ('old',      30000,  100000, 20, 'a game from before rewards were named')
on conflict (r) do update set op_max = excluded.op_max, day_max = excluded.day_max,
  day_n = excluded.day_n, what = excluded.what;

-- Rewarded ads pay ₩5,000 until the ad network approves the game; then
--   update public.wallet_settings set ad_reward = 10000 where id = 1;
update public.wallet_settings set ad_reward = 5000, updated_at = now() where id = 1;

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
  v_f int;
  v_asked bigint;
  v_n bigint;
  v_st text;
  v_orig bigint;
  v_back bigint;
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
    v_f := case when op ->> 'u' = 'krw' then 1 else 1000 end;
    v_asked := 0;
    v_ref := null;
    begin
      v_asked := least(greatest(round((op ->> 'n')::numeric) * v_f, -1000000000), 1000000000)::bigint;
    exception when others then
      v_asked := 0;
    end;
    v_n := 0;
    v_st := 'ok';
    v_r := null;

    if v_k = 'spend' and v_asked < 0 then
      if w.coins >= -v_asked then v_n := v_asked; else v_st := 'poor'; end if;
    elsif v_k = 'take' and v_asked < 0 then
      v_n := -least(-v_asked, w.coins);
    elsif v_k = 'refund' and v_asked > 0 then
      begin v_ref := (op ->> 'ref')::uuid; exception when others then v_ref := null; end;
      v_orig := null;
      select l.n into v_orig from public.coin_ledger l
        where l.user_id = uid and l.op_id = v_ref and l.n < 0 and l.at > now() - interval '1 day';
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
              and l.note = left(op ->> 'bn', 80) and l.n = -abs(round((op ->> 'paid')::numeric) * v_f)::bigint
              and not exists (select 1 from public.coin_ledger r
                              where r.user_id = uid and r.ref = l.op_id and r.kind = 'resell')
            order by l.at limit 1;
        exception when others then v_ref := null;
        end;
      end if;
      v_orig := null;
      if v_ref is not null then
        select l.n into v_orig from public.coin_ledger l
          where l.user_id = uid and l.op_id = v_ref and l.kind = 'spend' and l.n < 0;
      end if;
      if v_orig is null then
        v_st := 'noref';
      else
        select exists (select 1 from public.coin_ledger r
                       where r.user_id = uid and r.ref = v_ref and r.kind = 'resell') into v_sold;
        if v_sold then
          v_st := 'sold';
        else
          select coalesce(sum(l.n), 0) into v_back from public.coin_ledger l
            where l.user_id = uid and l.ref = v_ref and l.kind = 'refund';
          v_n := greatest(0, least(v_asked, floor((-v_orig - v_back) * s.resell_pct / 100.0)))::bigint;
          if v_n < v_asked then v_st := 'cap'; end if;
        end if;
      end if;
    elsif v_k = 'earn' and v_asked > 0 then
      -- Which reward it is: each pays up to its own limits (reward_rules).
      -- A game from before rewards were named sends none: 'old'.
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
                                     v_rule.day_max - v_rsum, s.earn_day_max - v_today));
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
