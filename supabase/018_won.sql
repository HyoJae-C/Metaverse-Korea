-- Money becomes Korean won: ₩1 in the game is ₩1, priced like Seoul.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 015_wallet.sql and 017_resale.sql (and 007_love_locks.sql). Safe to
-- run again: balances are changed only the first time.
--
-- What it does:
--   1. Balances, the coin ledger and love lock prices are turned into won.
--      One old coin was about ₩1,000 (shop prices were won ÷ 1000), so
--      every amount is multiplied by 1000: nobody gains or loses anything.
--   2. New numbers in wallet_settings (all in won, still editable in the
--      Table Editor): welcome ₩1,000,000, a rewarded ad ₩10,000 and 10 a
--      day, the most one reward may give ₩1,000,000 and the most earned in a
--      day ₩1,000,000 (ads, welcome, refunds and resale not counted).
--   3. migrate_max becomes 0: a new account no longer brings over "coins
--      from this browser". The browser's number could be edited, so any new
--      guest could claim up to 30,000 coins. Everyone gets the welcome money
--      from the server instead.
--   4. wallet_open, wallet_apply and hang_love_lock now count in won. The
--      game marks its ops u: 'krw'; ops without it (a page still open from
--      before) are counted as old coins and multiplied by 1000.

alter table public.wallet_settings add column if not exists unit text not null default 'coin';
alter table public.coin_ledger alter column asked type bigint;
alter table public.coin_ledger alter column n type bigint;
alter table public.wallets alter column welcome type bigint;
alter table public.wallets alter column migrated type bigint;
alter table public.love_lock_settings drop constraint if exists love_lock_settings_price_check;
alter table public.love_lock_settings add constraint love_lock_settings_price_check check (price between 0 and 10000000);

do $$
begin
  if (select unit from public.wallet_settings where id = 1) is distinct from 'krw' then
    update public.wallets set coins = coins * 1000, welcome = welcome * 1000,
      migrated = migrated * 1000, ver = ver + 1, updated_at = now();
    update public.coin_ledger set asked = asked * 1000, n = n * 1000, bal = bal * 1000;
    update public.love_locks set price = price * 1000;
    update public.love_lock_settings set price = 15000 where id = 1;
    update public.wallet_settings set
      unit = 'krw',
      welcome = 1000000,
      ad_reward = 10000,
      ad_daily = 10,
      earn_op_max = 1000000,
      earn_day_max = 1000000,
      migrate_max = 0,
      updated_at = now()
    where id = 1;
  end if;
end $$;

-- Opens this account's wallet. p_unit 'krw': p_local and p_gift are in won
-- (anything else: old coins). Returns { status, unit: 'krw', coins, ver,
-- created, migrated, welcome (given just now), ads_left }.
drop function if exists public.wallet_open(int, int);
create or replace function public.wallet_open(p_local bigint default 0, p_gift bigint default 0, p_unit text default 'coin') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  f int := case when p_unit = 'krw' then 1 else 1000 end;
  v_created boolean := false;
  v_mig bigint := 0;
  v_welcome bigint := 0;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  insert into public.wallets (user_id) values (uid) on conflict (user_id) do nothing;
  v_created := found;
  select * into w from public.wallets where user_id = uid for update;

  if v_created then
    -- What the browser had, once, up to migrate_max (0 now: see the top).
    v_mig := least(greatest(coalesce(p_local, 0), 0) * f, s.migrate_max);
    w.coins := v_mig;
    w.migrated := v_mig;
    -- Welcome money the browser already gave counts only as far as its
    -- coins came over.
    w.welcome := least(greatest(coalesce(p_gift, 0), 0) * f, s.welcome, v_mig);
    if v_mig > 0 then
      insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, bal)
        values (uid, gen_random_uuid(), 'migrate', greatest(coalesce(p_local, 0), 0) * f, v_mig,
                case when v_mig < coalesce(p_local, 0) * f then 'cap' else 'ok' end, w.coins);
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
  return jsonb_build_object('status', 'ok', 'unit', 'krw', 'coins', w.coins, 'ver', w.ver, 'created', v_created,
    'migrated', w.migrated, 'welcome', v_welcome, 'ads_left', public.wallet_ads_left(w, s));
end $$;
revoke all on function public.wallet_open(bigint, bigint, text) from public, anon;
grant execute on function public.wallet_open(bigint, bigint, text) to authenticated;

-- wallet_apply from 017_resale.sql, in won. Each op: { id: uuid, n, k:
-- 'earn'|'spend'|'take'|'refund'|'resell', u?: 'krw', note?, ref?, paid?,
-- bn? }. n and paid are won with u: 'krw', else old coins (x1000).
-- Returns { status, coins, ver, results: [{ id, n, status }] } (n in won).
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
      if v_free then
        v_n := v_asked;
      else
        v_n := greatest(0, least(v_asked, s.earn_op_max, s.earn_day_max - v_today));
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

-- Love locks from 015_wallet.sql, in won. p_price is the price the game
-- showed: won, or old coins from a page opened before this ran.
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
  if p_price is distinct from cfg.price and p_price::bigint * 1000 is distinct from cfg.price then
    return jsonb_build_object('status', 'price', 'price', cfg.price);
  end if;
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
