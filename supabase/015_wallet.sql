-- Coins on the server: the balance can no longer be changed from the browser.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 001_saves.sql, 003_names.sql, 005_operators.sql and 007_love_locks.sql.
-- Safe to run again.
--
-- How it works:
--   wallets       one row per account: the balance and today's ad count.
--   coin_ledger   every coin in and out (what the game asked, what moved).
--   wallet_settings  one row of numbers the operator can change (Table
--                 Editor → wallet_settings): welcome money, ad reward and
--                 daily ad limit, the most one reward may give, the most a
--                 player may earn in one day (Korean time), and the most
--                 coins one account may bring over from its browser.
--
-- Players can read their own wallet and ledger, but can't write either.
-- Coins only move through these functions:
--   wallet_open(local, gift)  first call per account brings over the coins
--                             the browser had (once, at most migrate_max),
--                             then tops up the welcome money if it went up.
--   wallet_apply(ops)         a batch of coins in and out from the game.
--                             Spending never goes below 0. Earning is capped
--                             per reward and per day. A refund gives back at
--                             most what that payment took, within a day. Each op has an id,
--                             so sending the same batch twice moves nothing.
--   wallet_ad(op)             one rewarded ad: the server counts the daily
--                             limit and the time between ads.
--   hang_love_lock(...)       now takes the price from this wallet.
-- Operators (005_operators.sql) are not capped, for testing.
--
-- Until this runs, the game keeps the coins in the browser as before.

create table if not exists public.wallet_settings (
  id int primary key default 1 check (id = 1),
  welcome int not null default 1000,      -- travel money every account gets once
  ad_reward int not null default 20,      -- coins per rewarded ad
  ad_daily int not null default 5,        -- rewarded ads per day
  ad_gap_sec int not null default 5,      -- at least this long between ads
  earn_op_max int not null default 2000,  -- the most one reward may give
  earn_day_max int not null default 5000, -- the most earned per day (ads, welcome, refunds not counted)
  migrate_max int not null default 30000, -- the most brought over from the browser, once
  updated_at timestamptz not null default now()
);
insert into public.wallet_settings (id) values (1) on conflict (id) do nothing;
alter table public.wallet_settings enable row level security;
revoke all on public.wallet_settings from anon, authenticated;

create table if not exists public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins bigint not null default 0 check (coins >= 0),
  ver bigint not null default 0,          -- goes up on every change (the game keeps the newest)
  welcome int not null default 0,         -- welcome money given so far
  migrated int,                           -- coins brought over from the browser
  ad_day date,
  ad_count int not null default 0,
  last_ad_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
revoke insert, update, delete on public.wallets from anon, authenticated;
drop policy if exists "read own wallet" on public.wallets;
create policy "read own wallet" on public.wallets for select using (auth.uid() = user_id);

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  op_id uuid not null,
  kind text not null,     -- migrate, welcome, earn, spend, take, refund, ad, lock
  asked int not null,     -- what the game asked for
  n int not null,         -- what really moved (+in, -out)
  status text not null,   -- ok, cap (earning cut to the cap), poor (not enough), noref, bad
  note text,
  ref uuid,               -- refund: the payment it gives back
  bal bigint not null,    -- balance after
  at timestamptz not null default now(),
  unique (user_id, op_id)
);
create index if not exists coin_ledger_user_at on public.coin_ledger (user_id, at desc);
create index if not exists coin_ledger_ref on public.coin_ledger (user_id, ref) where ref is not null;
alter table public.coin_ledger enable row level security;
revoke insert, update, delete on public.coin_ledger from anon, authenticated;
drop policy if exists "read own ledger" on public.coin_ledger;
create policy "read own ledger" on public.coin_ledger for select using (auth.uid() = user_id);

-- Start of today in Korean time.
create or replace function public.kst_day_start() returns timestamptz
language sql stable as $$
  select date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;

create or replace function public.wallet_ads_left(w public.wallets, s public.wallet_settings) returns int
language sql stable as $$
  select case when w.ad_day = (now() at time zone 'Asia/Seoul')::date
    then greatest(0, s.ad_daily - w.ad_count) else s.ad_daily end;
$$;

-- Opens this account's wallet. Returns { status, coins, ver, created,
-- migrated, welcome (given just now), ads_left }.
create or replace function public.wallet_open(p_local int default 0, p_gift int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  v_created boolean := false;
  v_mig int := 0;
  v_welcome int := 0;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  insert into public.wallets (user_id) values (uid) on conflict (user_id) do nothing;
  v_created := found;
  select * into w from public.wallets where user_id = uid for update;

  if v_created then
    -- Bring over what the browser had, once. The browser could have been
    -- edited, so it is capped.
    v_mig := least(greatest(coalesce(p_local, 0), 0), s.migrate_max);
    w.coins := v_mig;
    w.migrated := v_mig;
    w.welcome := least(greatest(coalesce(p_gift, 0), 0), s.welcome); -- already given in the browser
    if v_mig > 0 then
      insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, bal)
        values (uid, gen_random_uuid(), 'migrate', greatest(coalesce(p_local, 0), 0), v_mig,
                case when v_mig < coalesce(p_local, 0) then 'cap' else 'ok' end, w.coins);
    end if;
  end if;

  if w.welcome < s.welcome then
    v_welcome := s.welcome - w.welcome;
    w.coins := w.coins + v_welcome;
    w.welcome := s.welcome;
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, bal)
      values (uid, gen_random_uuid(), 'welcome', v_welcome, v_welcome, 'ok', w.coins);
  end if;

  if v_created or v_welcome > 0 then
    update public.wallets set coins = w.coins, migrated = w.migrated, welcome = w.welcome,
      ver = ver + 1, updated_at = now() where user_id = uid returning * into w;
  end if;
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'created', v_created,
    'migrated', w.migrated, 'welcome', v_welcome, 'ads_left', public.wallet_ads_left(w, s));
end $$;
revoke all on function public.wallet_open(int, int) from public, anon;
grant execute on function public.wallet_open(int, int) to authenticated;

-- A batch of up to 50 ops: [{ id: uuid, n: int, k: 'earn'|'spend'|'take'|'refund',
-- note?: text, ref?: uuid }]. Returns { status, coins, ver, results: [{ id, n, status }] }
-- where n is what really moved. status 'open': call wallet_open first.
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
  v_row public.coin_ledger;
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

    if v_k = 'spend' and v_asked < 0 then
      if w.coins >= -v_asked then v_n := v_asked; else v_st := 'poor'; end if;
    elsif v_k = 'take' and v_asked < 0 then
      v_n := -least(-v_asked, w.coins)::int;
    elsif v_k = 'refund' and v_asked > 0 then
      begin v_ref := (op ->> 'ref')::uuid; exception when others then v_ref := null; end;
      select l.n into v_orig from public.coin_ledger l
        where l.user_id = uid and l.op_id = v_ref and l.n < 0 and l.at > now() - interval '1 day';
      if v_orig is null then
        v_st := 'noref';
      else
        select coalesce(sum(l.n), 0) into v_back from public.coin_ledger l
          where l.user_id = uid and l.ref = v_ref and l.kind = 'refund';
        v_n := greatest(0, least(v_asked, -v_orig - v_back));
        if v_n < v_asked then v_st := 'cap'; end if;
      end if;
    elsif v_k = 'earn' and v_asked > 0 then
      if v_free then
        v_n := v_asked;
      else
        v_n := greatest(0, least(v_asked, s.earn_op_max, s.earn_day_max - v_today))::int;
        if v_n < v_asked then v_st := 'cap'; end if;
        v_today := v_today + v_n;
      end if;
    else
      v_st := 'bad';
    end if;

    w.coins := w.coins + v_n;
    if v_n <> 0 then v_changed := true; end if;
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
      values (uid, v_id, left(v_k, 12), v_asked, v_n, v_st, left(op ->> 'note', 80), v_ref, w.coins);
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

-- One rewarded ad, after the game has shown it. Returns { status: 'ok' |
-- 'limit' | 'early' | 'open', coins, ver, granted, ads_left }.
create or replace function public.wallet_ad(p_op uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_row public.coin_ledger;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'open'); end if;
  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_op;
  if found then
    return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'granted', v_row.n,
      'ads_left', public.wallet_ads_left(w, s));
  end if;
  if w.ad_day is distinct from v_day then w.ad_count := 0; end if;
  if w.ad_count >= s.ad_daily then
    return jsonb_build_object('status', 'limit', 'coins', w.coins, 'ver', w.ver, 'granted', 0, 'ads_left', 0);
  end if;
  if w.last_ad_at is not null and w.last_ad_at > now() - make_interval(secs => s.ad_gap_sec) then
    return jsonb_build_object('status', 'early', 'coins', w.coins, 'ver', w.ver, 'granted', 0,
      'ads_left', public.wallet_ads_left(w, s));
  end if;
  update public.wallets set coins = coins + s.ad_reward, ad_day = v_day, ad_count = w.ad_count + 1,
    last_ad_at = now(), ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, bal)
    values (uid, p_op, 'ad', s.ad_reward, s.ad_reward, 'ok', w.coins);
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'granted', s.ad_reward,
    'ads_left', public.wallet_ads_left(w, s));
end $$;
revoke all on function public.wallet_ad(uuid) from public, anon;
grant execute on function public.wallet_ad(uuid) to authenticated;

-- Love locks (007_love_locks.sql) now pay from the wallet above. Same
-- answers as before, plus ver; 'nosave' now means the wallet isn't open yet.
create or replace function public.hang_love_lock(
  p_request_id uuid, p_shape text, p_name text, p_body text, p_price int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.love_lock_settings;
  w public.wallets;
  v_body text := regexp_replace(coalesce(p_body, ''), E'\r\n?', E'\n', 'g');
  v_who text;
  v_lock public.love_locks;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_shape not in ('heart', 'circle', 'square', 'star') then return jsonb_build_object('status', 'shape'); end if;
  if btrim(v_body, E' \t\n') = '' then return jsonb_build_object('status', 'empty'); end if;
  if array_length(string_to_array(v_body, E'\n'), 1) > 20 then return jsonb_build_object('status', 'lines'); end if;
  if char_length(v_body) > 1000 then return jsonb_build_object('status', 'chars'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Hand back the same lock and take nothing.
  select * into v_lock from public.love_locks where user_id = uid and request_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', v_lock.price, 'coins', w.coins, 'ver', w.ver,
      'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'body', v_lock.body, 'created_at', v_lock.created_at));
  end if;

  select * into cfg from public.love_lock_settings where id = 1;
  if p_price is distinct from cfg.price then return jsonb_build_object('status', 'price', 'price', cfg.price); end if;
  if (select count(*) from public.love_locks where user_id = uid
      and created_at >= public.kst_day_start()) >= cfg.daily_limit then
    return jsonb_build_object('status', 'limit');
  end if;
  if w.coins < cfg.price then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - cfg.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'lock', -cfg.price, -cfg.price, 'ok', 'love lock', w.coins)
    on conflict (user_id, op_id) do nothing;

  -- The name this account claimed (003_names.sql), else the one sent.
  v_who := coalesce((select name from public.player_names where user_id = uid), nullif(btrim(left(coalesce(p_name, ''), 16)), ''), '?');
  insert into public.love_locks (user_id, request_id, shape, name, body, price)
    values (uid, p_request_id, p_shape, v_who, v_body, cfg.price)
    returning * into v_lock;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', v_lock.price, 'coins', w.coins, 'ver', w.ver,
    'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'body', v_lock.body, 'created_at', v_lock.created_at));
end $$;
revoke all on function public.hang_love_lock(uuid, text, text, text, int) from public, anon;
grant execute on function public.hang_love_lock(uuid, text, text, text, int) to authenticated;
