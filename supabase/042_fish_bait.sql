-- 042: fishing bait (미끼) at the Han River parks' bait stalls. Three baits
-- (good, fine, premium) in packs of five; one pack of each kind a day per
-- player, the day turning over at 00:00 KST. A bait makes the rarer fish
-- bite more often (the odds are in src/core/bait.js).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 015_wallet.sql and 018_won.sql.
-- Before this is run the game says the bait stall is being set up.
--
-- How it works (like the Jogyesa lanterns, 041):
--   buy_bait(request, bait, price) takes the money from the player's
--   wallet and writes the receipt in coin_ledger (kind 'bait', note
--   'bait:<id>') in one transaction. Today's receipts are the daily count,
--   so clearing the browser doesn't buy more. Each purchase carries a
--   request id made by the game: sending the same one again (a double tap,
--   a retry after a dropped connection) takes no more money.
--   bait_info() gives the prices, the daily limit and what I bought today.
--
-- Operator:
--   Price or daily limit: Table Editor → bait_settings (one row a bait).
--     Also change BAITS / BAIT_DAILY in src/core/bait.js for offline play.
--   See what was sold today:
--     select note, count(*), -sum(n) from public.coin_ledger
--     where kind = 'bait' and at >= public.kst_day_start() group by note;

create table if not exists public.bait_settings (
  id text primary key check (id in ('mid', 'high', 'top')),
  price int not null check (price between 0 and 10000000),
  daily int not null default 1 check (daily >= 0),
  pack int not null default 5 check (pack between 1 and 99)
);
insert into public.bait_settings (id, price) values ('mid', 2500), ('high', 7500), ('top', 15000)
  on conflict (id) do nothing;
alter table public.bait_settings enable row level security;
revoke all on public.bait_settings from anon, authenticated;

-- { prices: { id: won }, daily, pack, bought: { id: packs today } }
create or replace function public.bait_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'prices', (select jsonb_object_agg(id, price) from public.bait_settings),
    'daily', (select min(daily) from public.bait_settings),
    'pack', (select min(pack) from public.bait_settings),
    'bought', coalesce((select jsonb_object_agg(substr(note, 6), n) from (
      select note, count(*) n from public.coin_ledger
      where user_id = auth.uid() and kind = 'bait' and at >= public.kst_day_start()
      group by note) t), '{}'::jsonb));
$$;
grant execute on function public.bait_info() to anon, authenticated;

-- Returns { status: 'ok', charged, price, coins, ver } or { status: <why
-- not> }: signin, bait, price (the price changed: { price }), limit (one
-- pack of this kind today already), nosave (no wallet yet), coins (not enough).
create or replace function public.buy_bait(p_request_id uuid, p_bait text, p_price int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.bait_settings;
  w public.wallets;
  v_row public.coin_ledger;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.bait_settings where id = p_bait;
  if not found then return jsonb_build_object('status', 'bait'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Say so and take nothing.
  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', -v_row.n, 'coins', w.coins, 'ver', w.ver);
  end if;

  if p_price is distinct from cfg.price then return jsonb_build_object('status', 'price', 'price', cfg.price); end if;
  if (select count(*) from public.coin_ledger where user_id = uid and kind = 'bait'
      and note = 'bait:' || cfg.id and at >= public.kst_day_start()) >= cfg.daily then
    return jsonb_build_object('status', 'limit');
  end if;
  if w.coins < cfg.price then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - cfg.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'bait', -cfg.price, -cfg.price, 'ok', 'bait:' || cfg.id, w.coins);
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', cfg.price, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.buy_bait(uuid, text, int) from public, anon;
grant execute on function public.buy_bait(uuid, text, int) to authenticated;

notify pgrst, 'reload schema';
