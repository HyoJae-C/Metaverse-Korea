-- 067: where the weekend farm's seeds come from (Yozi 2026-11-21).
--   'farm'  lettuce, strawberry, carrot: bought at the bed, as before
--   'shop'  bean sprouts, spinach, tomato, cucumber, broccoli, corn,
--           pumpkin: bought at the seed shop
--           by Heunginjimun, kept in a seed pouch here (not a bag item, so
--           it can't be traded or given), planted from the pouch for free
--   'rare'  napa cabbage, ginseng: not sold; to be found some rare way later
-- Twelve crops now, each with its own number of days so that no two are
-- alike (Yozi: "bean sprouts, lettuce and spinach are the same"): bean
-- sprouts (2 days), pumpkin (15) and broccoli (7, in the chili's place) are
-- new; spinach 3, tomato 6, cucumber 8 and napa cabbage 20 days. Beds
-- already planted take their crop's new time from when they were planted.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 064_farm.sql and 066_farm_days.sql.
-- Before this is run the seed shop says the farm is being set up and the
-- shop's crops can't be planted; run it right after the game update.

insert into public.farm_crops (id, grow_min, seed, sell, fresh_sell) values
  ('lettuce', 1440, 500, 3500, 4500),
  ('sprout', 2880, 1000, 7000, 10000),
  ('spinach', 4320, 1500, 10500, 15800),
  ('strawberry', 5760, 2000, 14000, 22000),
  ('carrot', 7200, 2500, 17500, 30000),
  ('tomato', 8640, 3000, 21000, 37500),
  ('broccoli', 10080, 3500, 24500, 45500),
  ('cucumber', 11520, 4000, 28000, 55200),
  ('corn', 14400, 5000, 35000, 75000),
  ('pumpkin', 21600, 7500, 52500, 127500),
  ('cabbage', 28800, 10000, 70000, 180000),
  ('ginseng', 43200, 15000, 105000, 285000)
  on conflict (id) do update set grow_min = excluded.grow_min, seed = excluded.seed, sell = excluded.sell, fresh_sell = excluded.fresh_sell;

-- Chilies become broccoli (the same place in the list).
update public.farm_beds set crop = 'broccoli' where crop = 'chili';
insert into public.farm_barn (user_id, crop, fresh, n)
  select user_id, 'broccoli', fresh, n from public.farm_barn where crop = 'chili'
  on conflict (user_id, crop, fresh) do update set n = public.farm_barn.n + excluded.n;
delete from public.farm_barn where crop = 'chili';
delete from public.farm_crops where id = 'chili';

alter table public.farm_crops add column if not exists src text not null default 'farm' check (src in ('farm', 'shop', 'rare'));
update public.farm_crops set src = 'farm' where id in ('lettuce', 'strawberry', 'carrot');
update public.farm_crops set src = 'shop' where id in ('sprout', 'spinach', 'tomato', 'broccoli', 'cucumber', 'corn', 'pumpkin');
update public.farm_crops set src = 'rare' where id in ('cabbage', 'ginseng');

-- The seed pouch: seeds bought (or found) and not planted yet.
create table if not exists public.farm_seeds (
  user_id uuid not null references auth.users (id) on delete cascade,
  crop text not null references public.farm_crops (id),
  n int not null check (n >= 0),
  primary key (user_id, crop)
);
alter table public.farm_seeds enable row level security;
revoke all on public.farm_seeds from anon, authenticated;

-- { '<crop>': n } for one player.
create or replace function public.farm_pouch(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_object_agg(crop, n) from public.farm_seeds where user_id = p_user and n > 0), '{}'::jsonb)
$$;
revoke all on function public.farm_pouch(uuid) from public, anon, authenticated;

-- { status: 'ok', now, beds, crops: { id: { grow, seed, sell, fresh, from } },
--   mine: [{ bed, crop, at, wet, n }], barn: { '<crop>' | '<crop>+': n },
--   seeds: { '<crop>': n } }
-- (times in ms; n: times watered; '+' = fresh) or { status: 'signin' }.
create or replace function public.farm_info() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.farm_settings;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.farm_settings where id = 1;
  return jsonb_build_object(
    'status', 'ok', 'now', public.farm_ms(now()), 'beds', cfg.beds,
    'crops', (select jsonb_object_agg(id, jsonb_build_object('grow', grow_min, 'seed', seed, 'sell', sell, 'fresh', coalesce(fresh_sell, sell), 'from', src)) from public.farm_crops),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('bed', bed, 'crop', crop, 'at', public.farm_ms(planted_at),
                        'wet', case when watered_at is null then null else public.farm_ms(watered_at) end, 'n', waters) order by bed)
                      from public.farm_beds where user_id = uid), '[]'::jsonb),
    'barn', coalesce((select jsonb_object_agg(crop || case when fresh then '+' else '' end, n)
                      from public.farm_barn where user_id = uid and n > 0), '{}'::jsonb),
    'seeds', public.farm_pouch(uid));
end $$;
revoke all on function public.farm_info() from public, anon;
grant execute on function public.farm_info() to authenticated;

-- Buy seeds at the seed shop: p_n of one crop for p_price in all. Returns
-- { status: 'ok', charged, price, coins, ver, seeds } or { status: <why
-- not> }: signin, crop (not sold at the shop, or a bad count), price (it
-- changed: { price }), nosave (no wallet yet), coins (not enough).
create or replace function public.farm_seed_buy(p_request_id uuid, p_crop text, p_n int, p_price int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c public.farm_crops;
  w public.wallets;
  v_row public.coin_ledger;
  v_cost int;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into c from public.farm_crops where id = p_crop;
  if not found or c.src <> 'shop' or p_n is null or p_n < 1 or p_n > 99 then return jsonb_build_object('status', 'crop'); end if;
  v_cost := c.seed * p_n;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Say so and take nothing.
  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', -v_row.n, 'coins', w.coins, 'ver', w.ver, 'seeds', public.farm_pouch(uid));
  end if;

  if p_price is distinct from v_cost then return jsonb_build_object('status', 'price', 'price', v_cost); end if;
  if w.coins < v_cost then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - v_cost, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'farm', -v_cost, -v_cost, 'ok', 'seeds:' || c.id || 'x' || p_n, w.coins);
  insert into public.farm_seeds (user_id, crop, n) values (uid, c.id, p_n)
    on conflict (user_id, crop) do update set n = public.farm_seeds.n + excluded.n;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', v_cost, 'coins', w.coins, 'ver', w.ver, 'seeds', public.farm_pouch(uid));
end $$;
revoke all on function public.farm_seed_buy(uuid, text, int, int) from public, anon;
grant execute on function public.farm_seed_buy(uuid, text, int, int) to authenticated;

-- Plant a seed. A crop sold at the farm is paid for here; any other comes
-- out of the seed pouch (p_price is not looked at). Returns { status: 'ok',
-- charged, price, coins, ver, bed: { bed, crop, at, wet }, seeds } or
-- { status: <why not> }: signin, crop, bed (no such bed), busy (something
-- grows there), price (it changed: { price }), nosave (no wallet yet), coins
-- (not enough), noseed (none of it in the pouch).
create or replace function public.farm_plant(p_request_id uuid, p_bed int, p_crop text, p_price int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.farm_settings;
  c public.farm_crops;
  w public.wallets;
  b public.farm_beds;
  v_row public.coin_ledger;
  v_bed jsonb;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.farm_settings where id = 1;
  select * into c from public.farm_crops where id = p_crop;
  if not found then return jsonb_build_object('status', 'crop'); end if;
  if p_bed is null or p_bed < 0 or p_bed >= cfg.beds then return jsonb_build_object('status', 'bed'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  select * into b from public.farm_beds where user_id = uid and bed = p_bed;
  v_bed := case when b.user_id is null then null else jsonb_build_object('bed', b.bed, 'crop', b.crop,
    'at', public.farm_ms(b.planted_at), 'wet', case when b.watered_at is null then null else public.farm_ms(b.watered_at) end) end;

  if c.src = 'farm' then
    -- Sent before? Say so and take nothing.
    select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
    if found then
      return jsonb_build_object('status', 'ok', 'charged', false, 'price', -v_row.n, 'coins', w.coins, 'ver', w.ver, 'bed', v_bed, 'seeds', public.farm_pouch(uid));
    end if;
    if v_bed is not null then return jsonb_build_object('status', 'busy'); end if;
    if p_price is distinct from c.seed then return jsonb_build_object('status', 'price', 'price', c.seed); end if;
    if w.coins < c.seed then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;
    update public.wallets set coins = coins - c.seed, ver = ver + 1, updated_at = now()
      where user_id = uid returning * into w;
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
      values (uid, p_request_id, 'farm', -c.seed, -c.seed, 'ok', 'seed:' || c.id, w.coins);
    insert into public.farm_beds (user_id, bed, crop) values (uid, p_bed, c.id) returning * into b;
    return jsonb_build_object('status', 'ok', 'charged', true, 'price', c.seed, 'coins', w.coins, 'ver', w.ver,
      'bed', jsonb_build_object('bed', b.bed, 'crop', b.crop, 'at', public.farm_ms(b.planted_at), 'wet', null), 'seeds', public.farm_pouch(uid));
  end if;

  -- From the pouch. The same tap sent twice (this crop went into this bed
  -- within the last minute): say so and take no second seed.
  if v_bed is not null then
    if b.crop = c.id and b.planted_at > now() - interval '1 minute' then
      return jsonb_build_object('status', 'ok', 'charged', false, 'price', 0, 'bed', v_bed, 'seeds', public.farm_pouch(uid));
    end if;
    return jsonb_build_object('status', 'busy');
  end if;
  update public.farm_seeds set n = n - 1 where user_id = uid and crop = c.id and n > 0;
  if not found then return jsonb_build_object('status', 'noseed'); end if;
  insert into public.farm_beds (user_id, bed, crop) values (uid, p_bed, c.id) returning * into b;
  return jsonb_build_object('status', 'ok', 'charged', false, 'price', 0,
    'bed', jsonb_build_object('bed', b.bed, 'crop', b.crop, 'at', public.farm_ms(b.planted_at), 'wet', null), 'seeds', public.farm_pouch(uid));
end $$;
revoke all on function public.farm_plant(uuid, int, text, int) from public, anon;
grant execute on function public.farm_plant(uuid, int, text, int) to authenticated;

notify pgrst, 'reload schema';
