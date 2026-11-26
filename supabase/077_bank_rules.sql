-- 077: rules for sending money at Seoul Bank, so side accounts can't pour
-- their money into one main account (Yozi 2026-11-27). Run once, after
-- 028_bank.sql and 073_gift_age.sql: Supabase → SQL Editor → New query →
-- paste → Run. Safe to run again.
--
-- The sender needs (operators are not held back):
--   * an account at least 7 days old that has done 35 daily missions: the
--     same rule as gifts and Potato Market (gift_ready, 073; one setting,
--     wallet_settings.gift_min_days / gift_min_missions)
--   * at least bank_keep (1,000,000) left after sending
--   * at most bank_day_max (250,000) sent per day (Korean time, 00:00 KST)
--   * bank_friends_only: only to friends (both accepted, 006_friends.sql)
-- One transfer is also at most 250,000 now (bank_max), the same as a day.
-- So a side account must play a week, keep a million and send a quarter of a
-- million a day at most: not worth making.
--
-- Change them without a release:
--   update public.wallet_settings set bank_keep = 1000000, bank_day_max = 250000,
--     bank_friends_only = true, bank_max = 250000 where id = 1;
--   (bank_keep 0 / bank_day_max 0 turn that rule off; friends_only false lets
--    anyone be sent money.)
-- The bank still opens to everyone only with bank_open = true (028).
--
-- bank_send answers, besides 028's: young (7 days / 35 missions not done),
-- keep (would leave less than bank_keep), daylimit (over today's limit),
-- notfriend. bank_status tells the game the rules and how far I am, for the
-- form and its "not yet" message.

alter table public.wallet_settings add column if not exists bank_keep bigint not null default 1000000;
alter table public.wallet_settings add column if not exists bank_day_max bigint not null default 250000;
alter table public.wallet_settings add column if not exists bank_friends_only boolean not null default true;
-- One transfer can't be more than a day's limit (028 made it 500,000).
update public.wallet_settings set bank_max = 250000 where id = 1 and bank_max = 500000;

-- Won p_uid has sent today (Korean day).
create or replace function public.bank_sent_today(p_uid uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(t.n), 0)::bigint from public.bank_transfers t
  where t.from_user = p_uid
    and t.at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
$$;
revoke all on function public.bank_sent_today(uuid) from public, anon, authenticated;

-- Can I send? { status: 'ok', open, min, max, op, ready, days, missions,
-- min_days, min_missions, keep, day_max, left, friends_only }.
--   open: bank_open, or I'm an operator (028)
--   ready: 7 days and 35 missions done (always for operators)
--   left: how much more I may send today (null: no daily limit for me)
create or replace function public.bank_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  v_op boolean;
  v_created timestamptz;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  v_op := exists (select 1 from public.operators o where o.user_id = uid);
  select u.created_at into v_created from auth.users u where u.id = uid;
  return jsonb_build_object('status', 'ok',
    'open', coalesce(s.bank_open, false) or v_op,
    'min', s.bank_min, 'max', s.bank_max, 'op', v_op,
    'ready', public.gift_ready(uid),
    'days', floor(extract(epoch from now() - v_created) / 86400)::int,
    'missions', public.mission_count(uid),
    'min_days', s.gift_min_days, 'min_missions', s.gift_min_missions,
    'keep', case when v_op then 0 else s.bank_keep end,
    'day_max', case when v_op then 0 else s.bank_day_max end,
    'left', case when v_op or s.bank_day_max <= 0 then null
                 else greatest(0, s.bank_day_max - public.bank_sent_today(uid)) end,
    'friends_only', s.bank_friends_only and not v_op);
end $$;
revoke all on function public.bank_status() from public, anon;
grant execute on function public.bank_status() to authenticated;

-- 028's bank_send with the rules above. Returns { status, coins, ver, name }.
create or replace function public.bank_send(p_op uuid, p_to text, p_n bigint, p_memo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  k text := public.name_key(p_to);
  v_to uuid;
  v_name text;
  v_memo text := case when p_memo in ('thanks', 'food', 'coffee', 'birthday', 'payback', 'trip') then p_memo else 'thanks' end;
  v_op boolean;
  w public.wallets;
  w2 public.wallets;
  v_old public.bank_transfers;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_op is null then return jsonb_build_object('status', 'bad'); end if;
  select * into s from public.wallet_settings where id = 1;
  v_op := exists (select 1 from public.operators o where o.user_id = uid);
  if not (coalesce(s.bank_open, false) or v_op) then
    return jsonb_build_object('status', 'closed');
  end if;

  -- Sent before (a retry): report it again, move nothing.
  select * into v_old from public.bank_transfers where id = p_op;
  if found then
    if v_old.from_user <> uid then return jsonb_build_object('status', 'bad'); end if;
    select * into w from public.wallets where user_id = uid;
    select p.name into v_name from public.player_names p where p.user_id = v_old.to_user;
    return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'name', coalesce(v_name, ''), 'n', v_old.n);
  end if;

  if p_n is null or p_n < s.bank_min or p_n > s.bank_max then return jsonb_build_object('status', 'amount'); end if;
  if not v_op and not public.gift_ready(uid) then return jsonb_build_object('status', 'young'); end if; -- 077
  if k = '' or char_length(k) > 16 then return jsonb_build_object('status', 'nobody'); end if;
  select p.user_id, p.name into v_to, v_name from public.player_names p where p.name_key = k;
  if v_to is null then return jsonb_build_object('status', 'nobody'); end if;
  if v_to = uid then return jsonb_build_object('status', 'self'); end if;
  if not v_op and s.bank_friends_only and not public.are_friends(uid, v_to) then
    return jsonb_build_object('status', 'notfriend'); -- 077
  end if;

  -- Lock both wallets, always in the same order (two people sending to each
  -- other at once can't wait on each other forever). The sender's lock also
  -- keeps two sends at once from both fitting under today's limit.
  perform 1 from public.wallets where user_id in (uid, v_to) order by user_id for update;
  select * into w from public.wallets where user_id = uid;
  if not found then return jsonb_build_object('status', 'open'); end if;
  select * into w2 from public.wallets where user_id = v_to;
  if not found then return jsonb_build_object('status', 'nowallet'); end if;
  if w.coins < p_n then return jsonb_build_object('status', 'poor', 'coins', w.coins, 'ver', w.ver); end if;
  if not v_op then -- 077
    if s.bank_keep > 0 and w.coins - p_n < s.bank_keep then
      return jsonb_build_object('status', 'keep', 'coins', w.coins, 'ver', w.ver);
    end if;
    if s.bank_day_max > 0 and public.bank_sent_today(uid) + p_n > s.bank_day_max then
      return jsonb_build_object('status', 'daylimit', 'coins', w.coins, 'ver', w.ver);
    end if;
  end if;

  update public.wallets set coins = coins - p_n, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  update public.wallets set coins = coins + p_n, ver = ver + 1, updated_at = now()
    where user_id = v_to returning * into w2;
  insert into public.bank_transfers (id, from_user, to_user, n, memo) values (p_op, uid, v_to, p_n, v_memo);
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal, r)
    values (uid, p_op, 'bank_out', -p_n, -p_n, 'ok', left('bank to ' || v_name, 80), w.coins, 'bank');
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal, r)
    values (v_to, p_op, 'bank_in', p_n, p_n, 'ok', 'bank transfer', w2.coins, 'bank');
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'name', v_name, 'n', p_n);
exception when unique_violation then
  return jsonb_build_object('status', 'bad'); -- the same op id at the same moment
end $$;
revoke all on function public.bank_send(uuid, text, bigint, text) from public, anon;
grant execute on function public.bank_send(uuid, text, bigint, text) to authenticated;

-- Check (as a player): select public.bank_status();
-- Who could send now: select count(*) from auth.users u where public.gift_ready(u.id);
