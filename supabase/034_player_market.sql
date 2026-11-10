-- 034: second-hand clothes, two ways (run once, after 020_rewards.sql).
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- 1. The second-hand shops (Hongdae's VINTAGE GARAGE, Itaewon's Gaeul
--    Vintage) now pay 25% of what you paid, at once (was 10%). Same rules as
--    017_resale.sql: only clothes you bought yourself, each purchase once.
--    What they buy goes on their second-hand rack (one rack for both shops,
--    shop_stock) and anyone can buy it there for used_buy_pct (40%) of the
--    clothes' new price. Retired colours come back round this way too.
--    The coins go to the shop, not to the player who sold it, so the rack
--    can't pass coins between accounts.
--
-- 2. The player market at Dongmyo: a player spreads a mat and lays clothes
--    on it (one mat each, up to market_open_max = 6 things) for prices they
--    pick, between market_min_pct and market_max_pct (10% to 100%) of the
--    clothes' new price. Anyone else can buy from it while the seller is
--    away; the seller gets the price less market_fee_pct (5%). The mat stays
--    market_days (3) days after the seller was last in the game (the game
--    calls market_mine when it starts); after that nobody sees it and the
--    game puts the unsold clothes back in the seller's closet. The seller
--    can take things back any time before they sell.
--    Accounts younger than market_min_hours (24) can't list or buy, so a
--    fresh guest account's welcome money can't be passed to another account
--    through the market.
--
-- Why it can't make coins:
--   - Only clothes with a purchase on the ledger can be listed, each
--     purchase once (a 0-won 'resell' line marks it, so the shop won't buy it
--     too; taking the listing back turns that line into 'unlist' again).
--   - The most a listing can ask is the new price, and every sale loses 5%.
--   - Two players tapping Buy on the same listing at once: the listing row is
--     locked and only the first gets it; the other gets 'gone' and pays
--     nothing. Both wallets are locked in a fixed order (no deadlock).
--   - Selling doesn't count towards the daily earning cap: the coins come
--     from another player, not from the game.
--
-- Clothes bought on the market can be listed again (the price is still
-- counted from the new price) or sold to a shop (25% of what you paid).
--
-- Settings (Table Editor → wallet_settings): resell_pct, market_min_pct,
-- market_max_pct, market_fee_pct, market_days, market_open_max (things on a
-- mat), market_min_hours. market_max_pct 0 closes the market.
--
-- To see what is up:
--   select item, price, list, at from public.market_listings where status = 'open' order by at desc;

alter table public.wallet_settings alter column resell_pct set default 25;
update public.wallet_settings set resell_pct = 25 where id = 1 and resell_pct = 10;

alter table public.wallet_settings add column if not exists used_buy_pct int not null default 40;
alter table public.wallet_settings add column if not exists used_rack_max int not null default 30;
alter table public.wallet_settings drop constraint if exists wallet_settings_used;
alter table public.wallet_settings add constraint wallet_settings_used check (used_buy_pct between 1 and 100 and used_rack_max between 0 and 500);

alter table public.wallet_settings add column if not exists market_min_pct int not null default 10;
alter table public.wallet_settings add column if not exists market_max_pct int not null default 100;
alter table public.wallet_settings add column if not exists market_fee_pct int not null default 5;
alter table public.wallet_settings add column if not exists market_days int not null default 3;
alter table public.wallet_settings add column if not exists market_open_max int not null default 6;
alter table public.wallet_settings add column if not exists market_min_hours int not null default 24;
alter table public.wallet_settings drop constraint if exists wallet_settings_market_pct;
alter table public.wallet_settings add constraint wallet_settings_market_pct
  check (market_min_pct between 0 and 100 and market_max_pct between 0 and 100 and market_min_pct <= market_max_pct
         and market_fee_pct between 0 and 50 and market_days between 1 and 60 and market_open_max between 0 and 20
         and market_min_hours between 0 and 720);

create table if not exists public.market_listings (
  id bigint generated always as identity primary key,
  seller uuid not null references auth.users (id) on delete cascade,
  item text not null check (item ~ '^[A-Za-z0-9_-]{1,64}$'),
  list bigint not null check (list > 0),   -- the clothes' new price (won)
  price bigint not null check (price > 0), -- what the seller asks (won)
  ref uuid not null,                       -- the seller's purchase (coin_ledger.op_id)
  paid bigint not null,                    -- what the seller paid for it
  mark uuid not null,                      -- the seller's 0-won 'resell' line
  status text not null default 'open' check (status in ('open', 'sold', 'back')),
  buyer uuid references auth.users (id) on delete set null,
  buy_op uuid,                             -- the buyer's purchase (coin_ledger.op_id)
  at timestamptz not null default now(),
  fresh_at timestamptz not null default now(), -- the seller was last in the game
  got bigint,                                  -- what the seller got (price less the fee)
  sold_at timestamptz,
  back_at timestamptz
);
create index if not exists market_listings_open on public.market_listings (fresh_at desc) where status = 'open';
create index if not exists market_listings_seller on public.market_listings (seller, status);
create unique index if not exists market_listings_buy_op on public.market_listings (buyer, buy_op) where buy_op is not null;
alter table public.market_listings enable row level security; -- only the functions below touch it
revoke all on public.market_listings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The second-hand rack at the shops.

create table if not exists public.shop_stock (
  id bigint generated always as identity primary key,
  item text not null check (item ~ '^[A-Za-z0-9_-]{1,64}$'),
  list bigint not null check (list > 0),  -- the clothes' new price (won)
  seller uuid references auth.users (id) on delete set null,
  sale_op uuid not null,                  -- the seller's 'resell' line (coin_ledger.op_id)
  status text not null default 'open' check (status in ('open', 'sold')),
  buyer uuid references auth.users (id) on delete set null,
  buy_op uuid,                            -- the buyer's purchase (coin_ledger.op_id)
  at timestamptz not null default now(),
  sold_at timestamptz,
  unique (seller, sale_op)
);
create index if not exists shop_stock_open on public.shop_stock (item, at) where status = 'open';
create unique index if not exists shop_stock_buy_op on public.shop_stock (buyer, buy_op) where buy_op is not null;
alter table public.shop_stock enable row level security; -- only the functions below touch it
revoke all on public.shop_stock from anon, authenticated;

-- The new price of clothes I bought (p_ref: the purchase's op id): what I
-- paid, or for clothes bought second-hand (a mat or the rack) their new price.
create or replace function public.used_list_price(p_uid uuid, p_ref uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.list from public.market_listings m where m.buyer = p_uid and m.buy_op = p_ref),
    (select k.list from public.shop_stock k where k.buyer = p_uid and k.buy_op = p_ref),
    (select -l.n from public.coin_ledger l where l.user_id = p_uid and l.op_id = p_ref and l.kind = 'spend' and l.n < 0));
$$;
revoke all on function public.used_list_price(uuid, uuid) from public, anon, authenticated;

-- After a shop paid for clothes (wallet_apply 'resell', op p_op), they go on
-- the rack. Returns { status }: ok, noref (no such sale), full (the rack has
-- used_rack_max of them already: the shop keeps it out back).
create or replace function public.used_stock_add(p_op uuid, p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  v_ref uuid;
  v_list bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_item is null or p_item !~ '^[A-Za-z0-9_-]{1,64}$' then return jsonb_build_object('status', 'bad'); end if;
  if exists (select 1 from public.shop_stock where seller = uid and sale_op = p_op) then return jsonb_build_object('status', 'ok'); end if;
  select l.ref into v_ref from public.coin_ledger l
    where l.user_id = uid and l.op_id = p_op and l.kind = 'resell' and l.n > 0;
  if v_ref is null then return jsonb_build_object('status', 'noref'); end if;
  v_list := public.used_list_price(uid, v_ref);
  if v_list is null or v_list <= 0 then return jsonb_build_object('status', 'noref'); end if;
  select * into s from public.wallet_settings where id = 1;
  if (select count(*) from public.shop_stock where item = p_item and status = 'open') >= s.used_rack_max then
    return jsonb_build_object('status', 'full');
  end if;
  insert into public.shop_stock (item, list, seller, sale_op) values (p_item, v_list, uid, p_op);
  return jsonb_build_object('status', 'ok');
end $$;

-- What is on the rack: [{ item, list, price, n }] (n: how many).
create or replace function public.used_browse() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('item', x.item, 'list', x.list, 'n', x.n,
                                               'price', ceil(x.list * s.used_buy_pct / 100.0)::bigint) order by x.item, x.list), '[]'::jsonb)
  from (select item, list, count(*) as n from public.shop_stock where status = 'open' group by item, list) x,
       public.wallet_settings s
  where s.id = 1;
$$;

-- Buy from the rack: the oldest one of that item at that new price. Two
-- buyers at once each lock a different row (skip locked); when none is left
-- the answer is 'gone' and nothing is paid. p_op: a fixed op id (asking
-- again never pays twice). Returns { status, coins, ver, n, item, list }.
create or replace function public.used_buy(p_item text, p_list bigint, p_op uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  k public.shop_stock;
  w public.wallets;
  v_price bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_op is null then return jsonb_build_object('status', 'bad'); end if;
  select * into s from public.wallet_settings where id = 1;
  if s.unit is distinct from 'krw' then return jsonb_build_object('status', 'closed'); end if;
  select * into k from public.shop_stock where buyer = uid and buy_op = p_op;
  if found then
    select * into w from public.wallets where user_id = uid;
    return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'n', -ceil(k.list * s.used_buy_pct / 100.0)::bigint, 'item', k.item, 'list', k.list);
  end if;
  if exists (select 1 from public.coin_ledger where user_id = uid and op_id = p_op) then return jsonb_build_object('status', 'bad'); end if;

  select * into k from public.shop_stock
    where item = p_item and list = p_list and status = 'open'
    order by at limit 1 for update skip locked;
  if not found then return jsonb_build_object('status', 'gone'); end if;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'open'); end if;
  v_price := ceil(k.list * s.used_buy_pct / 100.0)::bigint;
  if w.coins < v_price then return jsonb_build_object('status', 'poor', 'coins', w.coins, 'ver', w.ver); end if;
  update public.wallets set coins = coins - v_price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
    values (uid, p_op, 'spend', -v_price, -v_price, 'ok', left(coalesce(p_note, 'second-hand · ' || k.item), 80), null, w.coins);
  update public.shop_stock set status = 'sold', buyer = uid, buy_op = p_op, sold_at = now() where id = k.id;
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'n', -v_price, 'item', k.item, 'list', k.list);
end $$;

revoke all on function public.used_stock_add(uuid, text) from public, anon;
revoke all on function public.used_browse() from public, anon;
revoke all on function public.used_buy(text, bigint, uuid, text) from public, anon;
grant execute on function public.used_stock_add(uuid, text) to authenticated;
grant execute on function public.used_browse() to authenticated;
grant execute on function public.used_buy(text, bigint, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Potato Market.

-- The market's rules, for the game to show.
create or replace function public.market_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('min_pct', market_min_pct, 'max_pct', market_max_pct, 'fee_pct', market_fee_pct,
                            'days', market_days, 'open_max', market_open_max, 'min_hours', market_min_hours,
                            'unit', unit)
  from public.wallet_settings where id = 1;
$$;

-- The mats: everything anyone can buy now, newest mats first (up to 300
-- things). mat: a number for the seller, the same for all their things
-- this visit (not their account id); name: their player name; mine: my own.
create or replace function public.market_browse() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'item', l.item, 'list', l.list, 'price', l.price,
                                               'mat', l.mat, 'name', l.name, 'mine', l.seller = auth.uid())
                            order by l.fresh_at desc, l.id), '[]'::jsonb)
  from (select m.*, n.name, dense_rank() over (order by m.seller) as mat
        from public.market_listings m
        left join public.player_names n on n.user_id = m.seller
        where m.status = 'open'
          and m.fresh_at > now() - make_interval(days => (select market_days from public.wallet_settings where id = 1))
        order by m.fresh_at desc limit 300) l;
$$;

-- My mat: what is on it (expired: shown to nobody, the game takes it back)
-- and what sold in the last 30 days (got: what I was paid). Calling it
-- means I am in the game: my mat stays another market_days days.
create or replace function public.market_mine() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_days int;
  v_out jsonb;
begin
  if uid is null then return '[]'::jsonb; end if;
  select market_days into v_days from public.wallet_settings where id = 1;
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'item', l.item, 'list', l.list, 'price', l.price,
                                               'got', l.got, 'status', l.status, 'at', l.at, 'sold_at', l.sold_at,
                                               'expired', l.status = 'open' and l.fresh_at <= now() - make_interval(days => v_days))
                            order by l.at desc), '[]'::jsonb) into v_out
  from public.market_listings l
  where l.seller = uid and (l.status = 'open' or (l.status = 'sold' and l.sold_at > now() - interval '30 days'));
  update public.market_listings set fresh_at = now()
    where seller = uid and status = 'open' and fresh_at > now() - make_interval(days => v_days);
  return v_out;
end $$;

-- Whether an account is old enough to use the market.
create or replace function public.market_old_enough(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select w.created_at <= now() - make_interval(hours => s.market_min_hours)
                   from public.wallets w, public.wallet_settings s where w.user_id = p_uid and s.id = 1), false)
      or exists (select 1 from public.operators o where o.user_id = p_uid);
$$;
revoke all on function public.market_old_enough(uuid) from public, anon, authenticated;

-- Put clothes up. p_ref: the purchase's op id; clothes bought before the
-- game kept it send its note (p_bn) and price (p_paid), as for the shops.
-- Returns { status, id }: ok, signin, closed, bad (item), price (outside the
-- range, with min and max), noref (no such purchase), sold (sold to a shop or
-- listed already), full (market_open_max things on the mat), young (account
-- younger than market_min_hours).
create or replace function public.market_list(p_item text, p_price bigint, p_ref uuid default null,
                                              p_bn text default null, p_paid bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  v_ref uuid := p_ref;
  v_orig bigint;
  v_back bigint;
  v_list bigint;
  v_mark uuid;
  v_id bigint;
  v_bal bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  if s.unit is distinct from 'krw' or s.market_max_pct <= 0 then return jsonb_build_object('status', 'closed'); end if;
  if p_item is null or p_item !~ '^[A-Za-z0-9_-]{1,64}$' then return jsonb_build_object('status', 'bad'); end if;
  select coins into v_bal from public.wallets where user_id = uid for update; -- one change at a time per player
  if not found then return jsonb_build_object('status', 'open'); end if;
  if not public.market_old_enough(uid) then return jsonb_build_object('status', 'young', 'hours', s.market_min_hours); end if;

  if v_ref is null and coalesce(p_bn, '') <> '' then
    select l.op_id into v_ref from public.coin_ledger l
      where l.user_id = uid and l.kind = 'spend' and l.status = 'ok'
        and l.note = left(p_bn, 80) and l.n = -abs(coalesce(p_paid, 0))
        and not exists (select 1 from public.coin_ledger r where r.user_id = uid and r.ref = l.op_id and r.kind = 'resell')
      order by l.at limit 1;
  end if;
  if v_ref is not null then
    select l.n into v_orig from public.coin_ledger l
      where l.user_id = uid and l.op_id = v_ref and l.kind = 'spend' and l.n < 0;
  end if;
  if v_orig is null then return jsonb_build_object('status', 'noref'); end if;

  -- Listed already (a retry): the same listing.
  select id into v_id from public.market_listings
    where seller = uid and ref = v_ref and status = 'open' and item = p_item and price = p_price;
  if found then return jsonb_build_object('status', 'ok', 'id', v_id); end if;
  if exists (select 1 from public.coin_ledger r where r.user_id = uid and r.ref = v_ref and r.kind = 'resell') then
    return jsonb_build_object('status', 'sold');
  end if;
  if (select count(*) from public.market_listings where seller = uid and status = 'open'
        and fresh_at > now() - make_interval(days => s.market_days)) >= s.market_open_max then
    return jsonb_build_object('status', 'full');
  end if;

  -- The new price: what was paid, or for clothes bought on the market the
  -- listing's own new price.
  v_list := coalesce(public.used_list_price(uid, v_ref), -v_orig);
  select coalesce(sum(l.n), 0) into v_back from public.coin_ledger l
    where l.user_id = uid and l.ref = v_ref and l.kind = 'refund';
  if v_back >= -v_orig then return jsonb_build_object('status', 'noref'); end if; -- refunded
  if p_price is null or p_price < ceil(v_list * s.market_min_pct / 100.0) or p_price > floor(v_list * s.market_max_pct / 100.0) then
    return jsonb_build_object('status', 'price', 'min', ceil(v_list * s.market_min_pct / 100.0), 'max', floor(v_list * s.market_max_pct / 100.0));
  end if;

  v_mark := gen_random_uuid();
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
    values (uid, v_mark, 'resell', 0, 0, 'listed', left('market · ' || p_item, 80), v_ref, v_bal);
  insert into public.market_listings (seller, item, list, price, ref, paid, mark)
    values (uid, p_item, v_list, p_price, v_ref, -v_orig - v_back, v_mark) returning id into v_id;
  -- One mat: everything on it stays as long as the newest thing.
  update public.market_listings set fresh_at = now() where seller = uid and status = 'open';
  return jsonb_build_object('status', 'ok', 'id', v_id);
end $$;

-- Take a listing back (before it sells). Returns { status, item, ref, paid }
-- so the game can put the clothes and their receipt back: ok, gone (sold),
-- none (not mine).
create or replace function public.market_cancel(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m public.market_listings;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into m from public.market_listings where id = p_id and seller = uid for update;
  if not found then return jsonb_build_object('status', 'none'); end if;
  if m.status = 'sold' then return jsonb_build_object('status', 'gone', 'item', m.item, 'price', m.price); end if;
  if m.status = 'open' then
    update public.market_listings set status = 'back', back_at = now() where id = m.id;
    update public.coin_ledger set kind = 'unlist' where user_id = uid and op_id = m.mark;
  end if;
  return jsonb_build_object('status', 'ok', 'item', m.item, 'ref', m.ref, 'paid', m.paid);
end $$;

-- Buy a listing. p_op: a fixed op id from the game (asking again never pays
-- twice); p_note: the budget book note. Returns { status, coins, ver, n,
-- item, list }: ok, gone (someone else got it, or taken back), own, poor,
-- young, closed.
create or replace function public.market_buy(p_id bigint, p_op uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  m public.market_listings;
  w public.wallets;
  v_sbal bigint;
  v_got bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_op is null then return jsonb_build_object('status', 'bad'); end if;
  select * into s from public.wallet_settings where id = 1;
  if s.unit is distinct from 'krw' then return jsonb_build_object('status', 'closed'); end if;

  -- Bought before (a retry).
  select * into m from public.market_listings where buyer = uid and buy_op = p_op;
  if found then
    select * into w from public.wallets where user_id = uid;
    return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'n', -m.price, 'item', m.item, 'list', m.list);
  end if;
  if exists (select 1 from public.coin_ledger where user_id = uid and op_id = p_op) then
    return jsonb_build_object('status', 'bad');
  end if;

  -- The listing first: a second buyer waits here, then finds it sold.
  select * into m from public.market_listings where id = p_id for update;
  if not found or m.status <> 'open' or m.fresh_at <= now() - make_interval(days => s.market_days) then
    return jsonb_build_object('status', 'gone');
  end if;
  if m.seller = uid then return jsonb_build_object('status', 'own'); end if;
  if not public.market_old_enough(uid) then return jsonb_build_object('status', 'young', 'hours', s.market_min_hours); end if;
  -- Both wallets, always in the same order.
  perform 1 from public.wallets where user_id in (uid, m.seller) order by user_id for update;
  select * into w from public.wallets where user_id = uid;
  if not found then return jsonb_build_object('status', 'open'); end if;
  if w.coins < m.price then
    return jsonb_build_object('status', 'poor', 'coins', w.coins, 'ver', w.ver);
  end if;

  update public.wallets set coins = coins - m.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
    values (uid, p_op, 'spend', -m.price, -m.price, 'ok', left(coalesce(p_note, 'market · ' || m.item), 80), null, w.coins);
  v_got := m.price - ceil(m.price * s.market_fee_pct / 100.0)::bigint;
  update public.wallets set coins = coins + v_got, ver = ver + 1, updated_at = now()
    where user_id = m.seller returning coins into v_sbal;
  if found and v_got > 0 then
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
      values (m.seller, gen_random_uuid(), 'sale', m.price, v_got, 'ok', left('market sale · ' || m.item, 80), m.ref, v_sbal);
  end if;
  update public.market_listings set status = 'sold', buyer = uid, buy_op = p_op, sold_at = now(), got = v_got where id = m.id;
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'n', -m.price, 'item', m.item, 'list', m.list);
end $$;

revoke all on function public.market_info() from public, anon;
revoke all on function public.market_browse() from public, anon;
revoke all on function public.market_mine() from public, anon;
revoke all on function public.market_list(text, bigint, uuid, text, bigint) from public, anon;
revoke all on function public.market_cancel(bigint) from public, anon;
revoke all on function public.market_buy(bigint, uuid, text) from public, anon;
grant execute on function public.market_info() to authenticated;
grant execute on function public.market_browse() to authenticated;
grant execute on function public.market_mine() to authenticated;
grant execute on function public.market_list(text, bigint, uuid, text, bigint) to authenticated;
grant execute on function public.market_cancel(bigint) to authenticated;
grant execute on function public.market_buy(bigint, uuid, text) to authenticated;
