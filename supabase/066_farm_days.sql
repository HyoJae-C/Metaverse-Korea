-- 066: the weekend farm grows by the day (Yozi 2026-11-21: ten crops, days
-- rather than hours, and a crop is as hard as it is long).
-- Ten crops of 1, 2, 4, 5, 7, 10, 15 and 30 days. A crop wants water once a
-- Korean day; watered on enough days (every day; 10 days or more forgive one
-- missed day in ten) it sells fresh, at its own fresh price, otherwise plain.
-- Plain, every crop earns 3,000 won a day; fresh, 4,000 (lettuce) to 9,000
-- (ginseng). Strawberries take the potato's place.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 064_farm.sql.
-- Before this is run the game shows the new crops but planting says the
-- price has changed (old crops) or that the farm is being set up (new ones);
-- run it right after the game update.
--
-- Beds planted under the old rules keep growing: their crop now takes its
-- new time from when it was planted, and a watering already given counts
-- as one. Potatoes in a bed or a barn become strawberries.

alter table public.farm_crops add column if not exists fresh_sell int check (fresh_sell between 0 and 10000000);
insert into public.farm_crops (id, grow_min, seed, sell, fresh_sell) values
  ('lettuce', 1440, 500, 3500, 4500),
  ('spinach', 1440, 700, 3700, 4800),
  ('tomato', 2880, 1000, 7000, 10000),
  ('cucumber', 2880, 1200, 7200, 10300),
  ('strawberry', 5760, 2000, 14000, 22000),
  ('carrot', 7200, 2500, 17500, 30000),
  ('chili', 10080, 3500, 24500, 45500),
  ('corn', 14400, 5000, 35000, 75000),
  ('cabbage', 21600, 7500, 52500, 127500),
  ('ginseng', 43200, 15000, 105000, 285000)
  on conflict (id) do update set grow_min = excluded.grow_min, seed = excluded.seed, sell = excluded.sell, fresh_sell = excluded.fresh_sell;

-- Potatoes become strawberries (the same place in the list).
update public.farm_beds set crop = 'strawberry' where crop = 'potato';
insert into public.farm_barn (user_id, crop, fresh, n)
  select user_id, 'strawberry', fresh, n from public.farm_barn where crop = 'potato'
  on conflict (user_id, crop, fresh) do update set n = public.farm_barn.n + excluded.n;
delete from public.farm_barn where crop = 'potato';
delete from public.farm_crops where id = 'potato';

-- How many times a bed was watered (watered_at is the last time).
alter table public.farm_beds add column if not exists waters int not null default 0;
update public.farm_beds set waters = 1 where watered_at is not null and waters = 0;

-- How many waterings make a crop fresh: one for each day it grows, less one
-- for every ten days.
create or replace function public.farm_need(p_grow_min int) returns int
language sql immutable as $$
  select d - d / 10 from (select greatest(1, round(p_grow_min / 1440.0)::int) as d) q
$$;

-- The Korean date of a moment.
create or replace function public.farm_kst(p timestamptz) returns date
language sql immutable as $$ select (p at time zone 'Asia/Seoul')::date $$;

-- { status: 'ok', now, beds, crops: { id: { grow, seed, sell, fresh } },
--   mine: [{ bed, crop, at, wet, n }], barn: { '<crop>' | '<crop>+': n } }
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
    'crops', (select jsonb_object_agg(id, jsonb_build_object('grow', grow_min, 'seed', seed, 'sell', sell, 'fresh', coalesce(fresh_sell, sell))) from public.farm_crops),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('bed', bed, 'crop', crop, 'at', public.farm_ms(planted_at),
                        'wet', case when watered_at is null then null else public.farm_ms(watered_at) end, 'n', waters) order by bed)
                      from public.farm_beds where user_id = uid), '[]'::jsonb),
    'barn', coalesce((select jsonb_object_agg(crop || case when fresh then '+' else '' end, n)
                      from public.farm_barn where user_id = uid and n > 0), '{}'::jsonb));
end $$;
revoke all on function public.farm_info() from public, anon;
grant execute on function public.farm_info() to authenticated;

-- Water a bed: once a Korean day, until it has had all it needs or is grown.
-- Returns { status: 'ok', wet, n, need } or signin,
-- empty (nothing there), late (already grown), wet (already watered today,
-- or it has had them all: { wet, n, need }).
create or replace function public.farm_water(p_bed int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b public.farm_beds;
  c public.farm_crops;
  v_need int;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into b from public.farm_beds where user_id = uid and bed = p_bed for update;
  if not found then return jsonb_build_object('status', 'empty'); end if;
  select * into c from public.farm_crops where id = b.crop;
  v_need := public.farm_need(c.grow_min);
  if now() >= b.planted_at + make_interval(mins => c.grow_min) then return jsonb_build_object('status', 'late'); end if;
  if b.waters >= v_need or (b.watered_at is not null and public.farm_kst(b.watered_at) = public.farm_kst(now())) then
    return jsonb_build_object('status', 'wet', 'wet', public.farm_ms(b.watered_at), 'n', b.waters, 'need', v_need);
  end if;
  update public.farm_beds set watered_at = now(), waters = waters + 1 where user_id = uid and bed = p_bed returning * into b;
  return jsonb_build_object('status', 'ok', 'wet', public.farm_ms(b.watered_at), 'n', b.waters, 'need', v_need);
end $$;
revoke all on function public.farm_water(int) from public, anon;
grant execute on function public.farm_water(int) to authenticated;

-- Pick a grown bed into the barn: fresh if it had all the waterings it
-- needs. Returns
-- { status: 'ok', crop, fresh, barn } or signin, empty, unripe ({ left: ms }).
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
  v_fresh := b.waters >= public.farm_need(c.grow_min);
  delete from public.farm_beds where user_id = uid and bed = p_bed;
  insert into public.farm_barn (user_id, crop, fresh, n) values (uid, b.crop, v_fresh, 1)
    on conflict (user_id, crop, fresh) do update set n = public.farm_barn.n + 1;
  return jsonb_build_object('status', 'ok', 'crop', b.crop, 'fresh', v_fresh,
    'barn', coalesce((select jsonb_object_agg(crop || case when fresh then '+' else '' end, n)
                      from public.farm_barn where user_id = uid and n > 0), '{}'::jsonb));
end $$;
revoke all on function public.farm_pick(int) from public, anon;
grant execute on function public.farm_pick(int) to authenticated;

-- Sell everything in the barn, each at its own plain or fresh price. Returns
-- { status: 'ok', paid, sold, coins, ver } or signin, nosave, none.
create or replace function public.farm_sell(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w public.wallets;
  v_row public.coin_ledger;
  v_paid bigint;
  v_sold bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'paid', v_row.n, 'sold', 0, 'coins', w.coins, 'ver', w.ver);
  end if;

  select coalesce(sum((case when b.fresh then coalesce(c.fresh_sell, c.sell) else c.sell end)::bigint * b.n), 0), coalesce(sum(b.n), 0)
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
