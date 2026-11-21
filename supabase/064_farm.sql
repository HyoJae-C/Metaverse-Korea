-- 064: the weekend farm (주말농장) at the Yongsan Family Park allotments
-- (Yozi 2026-11-21). Everyone has twelve beds in the glasshouse: buy a seed
-- and plant it, water it once in its second half, pick it when it is grown,
-- sell what you picked at the stand. Crops grow in real time, also while
-- you are away, and never die.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 015_wallet.sql and 018_won.sql.
-- Before this is run the game says the farm is being set up.
--
-- How it works (src/core/farm.js has the same numbers for showing them):
--   farm_info()                     my beds, my barn, the crops and the clock
--   farm_plant(request, bed, crop, price)
--                                   takes the seed's price and plants it
--   farm_water(bed)                 waters a bed that is past half grown
--   farm_pick(bed)                  a grown bed goes into the barn
--   farm_sell(request)              sells the whole barn
-- The server's clock decides how grown a bed is, so changing the phone's
-- clock does nothing. Money moves with a receipt in coin_ledger (kind
-- 'farm': note 'seed:<crop>' or 'farm:sell'); a request id sent twice (a
-- double tap, a retry) moves money once. There is no daily limit on
-- purpose (Yozi 2026-11-21: effort is not capped); the beds and the growing
-- time are the limit, and 'farm' receipts don't count towards
-- wallet_settings.earn_day_max.
--
-- Operator:
--   Prices and growing times: Table Editor → farm_crops (also change CROPS
--     in src/core/farm.js so the game shows the same before it asks).
--   Beds a player and the watered bonus: farm_settings.
--   What the farm paid out today:
--     select note, count(*), sum(n) from public.coin_ledger
--     where kind = 'farm' and at >= public.kst_day_start() group by note;

create table if not exists public.farm_crops (
  id text primary key,
  grow_min int not null check (grow_min between 1 and 100000),
  seed int not null check (seed between 0 and 10000000),
  sell int not null check (sell between 0 and 10000000)
);
insert into public.farm_crops (id, grow_min, seed, sell) values
  ('lettuce', 20, 200, 500),
  ('tomato', 60, 400, 1200),
  ('potato', 180, 600, 2000),
  ('chili', 360, 800, 3000),
  ('cabbage', 720, 1000, 3400)
  on conflict (id) do nothing;
alter table public.farm_crops enable row level security;
revoke all on public.farm_crops from anon, authenticated;

create table if not exists public.farm_settings (
  id int primary key default 1 check (id = 1),
  beds int not null default 12 check (beds between 1 and 100),
  fresh numeric not null default 1.5 check (fresh between 1 and 10)
);
insert into public.farm_settings (id) values (1) on conflict (id) do nothing;
alter table public.farm_settings enable row level security;
revoke all on public.farm_settings from anon, authenticated;

create table if not exists public.farm_beds (
  user_id uuid not null references auth.users (id) on delete cascade,
  bed int not null check (bed between 0 and 99),
  crop text not null references public.farm_crops (id),
  planted_at timestamptz not null default now(),
  watered_at timestamptz,
  primary key (user_id, bed)
);
alter table public.farm_beds enable row level security;
revoke all on public.farm_beds from anon, authenticated;

create table if not exists public.farm_barn (
  user_id uuid not null references auth.users (id) on delete cascade,
  crop text not null references public.farm_crops (id),
  fresh boolean not null,
  n int not null check (n >= 0),
  primary key (user_id, crop, fresh)
);
alter table public.farm_barn enable row level security;
revoke all on public.farm_barn from anon, authenticated;

-- Milliseconds since 1970, as the game counts time.
create or replace function public.farm_ms(p timestamptz) returns bigint
language sql immutable as $$ select (extract(epoch from p) * 1000)::bigint $$;

-- { status: 'ok', now, beds, fresh, crops: { id: { grow, seed, sell } },
--   mine: [{ bed, crop, at, wet }], barn: { '<crop>' | '<crop>+': n } }
-- (times in ms; '+' = watered) or { status: 'signin' }.
create or replace function public.farm_info() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.farm_settings;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.farm_settings where id = 1;
  return jsonb_build_object(
    'status', 'ok', 'now', public.farm_ms(now()), 'beds', cfg.beds, 'fresh', cfg.fresh,
    'crops', (select jsonb_object_agg(id, jsonb_build_object('grow', grow_min, 'seed', seed, 'sell', sell)) from public.farm_crops),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('bed', bed, 'crop', crop, 'at', public.farm_ms(planted_at),
                        'wet', case when watered_at is null then null else public.farm_ms(watered_at) end) order by bed)
                      from public.farm_beds where user_id = uid), '[]'::jsonb),
    'barn', coalesce((select jsonb_object_agg(crop || case when fresh then '+' else '' end, n)
                      from public.farm_barn where user_id = uid and n > 0), '{}'::jsonb));
end $$;
revoke all on function public.farm_info() from public, anon;
grant execute on function public.farm_info() to authenticated;

-- Plant a seed. Returns { status: 'ok', charged, price, coins, ver, bed:
-- { bed, crop, at, wet } } or { status: <why not> }: signin, crop, bed (no
-- such bed), busy (something grows there), price (it changed: { price }),
-- nosave (no wallet yet), coins (not enough).
create or replace function public.farm_plant(p_request_id uuid, p_bed int, p_crop text, p_price int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.farm_settings;
  c public.farm_crops;
  w public.wallets;
  b public.farm_beds;
  v_row public.coin_ledger;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.farm_settings where id = 1;
  select * into c from public.farm_crops where id = p_crop;
  if not found then return jsonb_build_object('status', 'crop'); end if;
  if p_bed is null or p_bed < 0 or p_bed >= cfg.beds then return jsonb_build_object('status', 'bed'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Say so and take nothing.
  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
  if found then
    select * into b from public.farm_beds where user_id = uid and bed = p_bed;
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', -v_row.n, 'coins', w.coins, 'ver', w.ver,
      'bed', case when b.user_id is null then null else jsonb_build_object('bed', b.bed, 'crop', b.crop,
        'at', public.farm_ms(b.planted_at), 'wet', case when b.watered_at is null then null else public.farm_ms(b.watered_at) end) end);
  end if;

  if exists (select 1 from public.farm_beds where user_id = uid and bed = p_bed) then
    return jsonb_build_object('status', 'busy');
  end if;
  if p_price is distinct from c.seed then return jsonb_build_object('status', 'price', 'price', c.seed); end if;
  if w.coins < c.seed then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - c.seed, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'farm', -c.seed, -c.seed, 'ok', 'seed:' || c.id, w.coins);
  insert into public.farm_beds (user_id, bed, crop) values (uid, p_bed, c.id) returning * into b;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', c.seed, 'coins', w.coins, 'ver', w.ver,
    'bed', jsonb_build_object('bed', b.bed, 'crop', b.crop, 'at', public.farm_ms(b.planted_at), 'wet', null));
end $$;
revoke all on function public.farm_plant(uuid, int, text, int) from public, anon;
grant execute on function public.farm_plant(uuid, int, text, int) to authenticated;

-- Water a bed. Counts from half grown until it is grown. Returns { status:
-- 'ok', wet } or signin, empty (nothing there), early (not half grown yet),
-- late (already grown), wet (already watered: { wet }).
create or replace function public.farm_water(p_bed int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b public.farm_beds;
  c public.farm_crops;
  v_span interval;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into b from public.farm_beds where user_id = uid and bed = p_bed for update;
  if not found then return jsonb_build_object('status', 'empty'); end if;
  select * into c from public.farm_crops where id = b.crop;
  v_span := make_interval(mins => c.grow_min);
  if b.watered_at is not null then return jsonb_build_object('status', 'wet', 'wet', public.farm_ms(b.watered_at)); end if;
  if now() < b.planted_at + v_span / 2 then return jsonb_build_object('status', 'early'); end if;
  if now() > b.planted_at + v_span then return jsonb_build_object('status', 'late'); end if;
  update public.farm_beds set watered_at = now() where user_id = uid and bed = p_bed returning * into b;
  return jsonb_build_object('status', 'ok', 'wet', public.farm_ms(b.watered_at));
end $$;
revoke all on function public.farm_water(int) from public, anon;
grant execute on function public.farm_water(int) to authenticated;

-- Pick a grown bed into the barn. Returns { status: 'ok', crop, fresh, barn }
-- or signin, empty, unripe ({ left: ms }).
create or replace function public.farm_pick(p_bed int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b public.farm_beds;
  c public.farm_crops;
  v_ripe timestamptz;
  v_fresh boolean;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into b from public.farm_beds where user_id = uid and bed = p_bed for update;
  if not found then return jsonb_build_object('status', 'empty'); end if;
  select * into c from public.farm_crops where id = b.crop;
  v_ripe := b.planted_at + make_interval(mins => c.grow_min);
  if now() < v_ripe then
    return jsonb_build_object('status', 'unripe', 'left', public.farm_ms(v_ripe) - public.farm_ms(now()));
  end if;
  v_fresh := b.watered_at is not null;
  delete from public.farm_beds where user_id = uid and bed = p_bed;
  insert into public.farm_barn (user_id, crop, fresh, n) values (uid, b.crop, v_fresh, 1)
    on conflict (user_id, crop, fresh) do update set n = public.farm_barn.n + 1;
  return jsonb_build_object('status', 'ok', 'crop', b.crop, 'fresh', v_fresh,
    'barn', coalesce((select jsonb_object_agg(crop || case when fresh then '+' else '' end, n)
                      from public.farm_barn where user_id = uid and n > 0), '{}'::jsonb));
end $$;
revoke all on function public.farm_pick(int) from public, anon;
grant execute on function public.farm_pick(int) to authenticated;

-- Sell everything in the barn. Returns { status: 'ok', paid, sold (how
-- many), coins, ver } or signin, nosave, none (the barn is empty).
create or replace function public.farm_sell(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.farm_settings;
  w public.wallets;
  v_row public.coin_ledger;
  v_paid bigint;
  v_sold bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.farm_settings where id = 1;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'paid', v_row.n, 'sold', 0, 'coins', w.coins, 'ver', w.ver);
  end if;

  select coalesce(sum(round(c.sell * case when b.fresh then cfg.fresh else 1 end) * b.n), 0), coalesce(sum(b.n), 0)
    into v_paid, v_sold
    from public.farm_barn b join public.farm_crops c on c.id = b.crop
    where b.user_id = uid and b.n > 0;
  if v_sold = 0 then return jsonb_build_object('status', 'none'); end if;

  delete from public.farm_barn where user_id = uid;
  update public.wallets set coins = coins + v_paid, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'farm', v_paid, v_paid, 'ok', 'farm:sell', w.coins);
  return jsonb_build_object('status', 'ok', 'paid', v_paid, 'sold', v_sold, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.farm_sell(uuid) from public, anon;
grant execute on function public.farm_sell(uuid) to authenticated;

notify pgrst, 'reload schema';
