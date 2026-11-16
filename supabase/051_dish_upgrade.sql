-- 051: upgrading cooked dishes (음식 강화) with seasoning (정성 양념).
-- Rules: src/core/dish-upgrade.js. Plan: the "음식 강화 계획" doc.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs kst_day_start() (from the daily SQL, used by 041/042).
-- Before this is run the game keeps seasoning and levels in the browser only.
--
-- How it works:
--   seasoning_info() gives my seasoning, today's tries, the odds and my
--   upgraded dishes. The first call gives everyone the 10 to start (once,
--   with a receipt), so players from before this get them too.
--   seasoning_claim(request, kind, dish) gives the day's seasoning for
--   finishing the missions (3, once a day) or for cooking a dish (1 a day
--   for each kind), with a receipt.
--   upgrade_dish(request, dish id, dish, start, maker) takes the seasoning,
--   checks today's tries, rolls the dice here on the server and keeps the
--   dish's real level. Sending the same request again returns the first
--   answer and takes nothing more.
--   Seasoning isn't sold for now (Yozi 2026-11-17): no function adds it
--   for money.
--
-- Operator:
--   Odds, cost or which levels are open: Table Editor → upgrade_odds.
--   Daily tries / seasoning amounts: Table Editor → upgrade_config.
--     Also change src/core/dish-upgrade.js for offline play.
--   Give someone seasoning (with a receipt):
--     select public.seasoning_grant('<user uuid>', 5, 'why');
--   Today's tries:
--     select ok, count(*) from public.upgrade_tries where at >= public.kst_day_start() group by ok;

create table if not exists public.upgrade_config (
  id int primary key default 1 check (id = 1),
  daily_tries int not null default 10 check (daily_tries between 0 and 1000),
  start_n int not null default 10 check (start_n between 0 and 1000),
  mission_n int not null default 3 check (mission_n between 0 and 100),
  class_n int not null default 1 check (class_n between 0 and 100)
);
insert into public.upgrade_config (id) values (1) on conflict (id) do nothing;

-- One row a level: the chance (%) of reaching it, the seasoning a try costs,
-- the gauge a failure adds (%p), whether it's open yet.
create table if not exists public.upgrade_odds (
  lv int primary key check (lv between 1 and 30),
  chance int not null check (chance between 1 and 100),
  cost int not null check (cost between 1 and 99),
  gauge int not null default 0 check (gauge between 0 and 100),
  open boolean not null default true
);
insert into public.upgrade_odds (lv, chance, cost, gauge, open) values
  (1, 100, 1, 5, true), (2, 97, 1, 5, true), (3, 93, 1, 5, true), (4, 89, 1, 5, true), (5, 85, 1, 5, true),
  (6, 80, 1, 5, true), (7, 75, 1, 5, true), (8, 70, 1, 5, true), (9, 65, 1, 5, true), (10, 60, 1, 5, true),
  (11, 55, 11, 2, true), (12, 52, 12, 2, true), (13, 49, 13, 2, true), (14, 46, 14, 2, true), (15, 43, 15, 2, true),
  (16, 40, 16, 2, true), (17, 37, 17, 2, true), (18, 34, 18, 2, true), (19, 31, 19, 2, true), (20, 28, 20, 2, true),
  (21, 30, 21, 1, false), (22, 28, 22, 1, false), (23, 26, 23, 1, false), (24, 24, 24, 1, false), (25, 22, 25, 1, false),
  (26, 20, 26, 1, false), (27, 19, 27, 1, false), (28, 18, 28, 1, false), (29, 17, 29, 1, false), (30, 16, 30, 1, false)
  on conflict (lv) do nothing;

create table if not exists public.seasonings (
  user_id uuid primary key references auth.users on delete cascade,
  n int not null default 0 check (n >= 0),
  updated_at timestamptz not null default now()
);

-- Every change to a balance. kind: start | mission | class | upgrade | grant.
create table if not exists public.seasoning_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  op_id uuid not null,
  kind text not null check (kind in ('start', 'mission', 'class', 'upgrade', 'grant')),
  note text,
  n int not null,
  bal int not null,
  at timestamptz not null default now(),
  unique (user_id, op_id)
);
create index if not exists seasoning_ledger_day on public.seasoning_ledger (user_id, kind, at);

-- Every upgraded dish: whose, what, its real level, the gauge saved up and
-- who made it.
create table if not exists public.upgraded_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  dish text not null check (dish ~ '^[a-z]{2,24}$'),
  lv int not null default 0 check (lv between 0 and 30),
  gauge int not null default 0 check (gauge between 0 and 100),
  maker uuid,
  maker_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists upgraded_dishes_user on public.upgraded_dishes (user_id);

-- Every try (the receipt): the dice, the chance and the result.
create table if not exists public.upgrade_tries (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  op_id uuid not null,
  dish_id uuid not null,
  from_lv int not null,
  to_lv int not null,
  ok boolean not null,
  chance int not null,
  roll int not null,
  cost int not null,
  at timestamptz not null default now(),
  unique (user_id, op_id)
);
create index if not exists upgrade_tries_day on public.upgrade_tries (user_id, at);

alter table public.upgrade_config enable row level security;
alter table public.upgrade_odds enable row level security;
alter table public.seasonings enable row level security;
alter table public.seasoning_ledger enable row level security;
alter table public.upgraded_dishes enable row level security;
alter table public.upgrade_tries enable row level security;
revoke all on public.upgrade_config, public.upgrade_odds, public.seasonings, public.seasoning_ledger, public.upgraded_dishes, public.upgrade_tries from anon, authenticated;

-- Add (or take) seasoning with a receipt. Internal: called by the functions
-- below, and by an operator from the SQL editor.
create or replace function public.seasoning_add(p_user uuid, p_op uuid, p_kind text, p_n int, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into public.seasonings (user_id, n) values (p_user, 0) on conflict (user_id) do nothing;
  update public.seasonings set n = n + p_n, updated_at = now() where user_id = p_user returning n into v_n;
  insert into public.seasoning_ledger (user_id, op_id, kind, note, n, bal) values (p_user, p_op, p_kind, p_note, p_n, v_n);
  return v_n;
end $$;
revoke all on function public.seasoning_add(uuid, uuid, text, int, text) from public, anon, authenticated;

create or replace function public.seasoning_grant(p_user uuid, p_n int, p_note text) returns int
language sql security definer set search_path = public as $$
  select public.seasoning_add(p_user, gen_random_uuid(), 'grant', p_n, p_note);
$$;
revoke all on function public.seasoning_grant(uuid, int, text) from public, anon, authenticated;

-- { n, tries, daily, open, odds: [{ lv, chance, cost, gauge }], claimed: { mission, cls: [dish] },
--   dishes: [{ id, dish, lv, gauge }] }, or { status: 'signin' }.
create or replace function public.seasoning_info() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.upgrade_config;
  v_n int;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.upgrade_config where id = 1;
  perform 1 from public.seasonings where user_id = uid for update; -- (two first calls at once: one start grant)
  if not exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'start') then
    perform public.seasoning_add(uid, gen_random_uuid(), 'start', cfg.start_n, 'start');
  end if;
  select n into v_n from public.seasonings where user_id = uid;
  return jsonb_build_object(
    'status', 'ok',
    'n', coalesce(v_n, 0),
    'tries', (select count(*) from public.upgrade_tries where user_id = uid and at >= public.kst_day_start()),
    'daily', cfg.daily_tries,
    'open', coalesce((select max(lv) from public.upgrade_odds where open), 0),
    'odds', coalesce((select jsonb_agg(jsonb_build_object('lv', lv, 'chance', chance, 'cost', cost, 'gauge', gauge) order by lv) from public.upgrade_odds where open), '[]'::jsonb),
    'claimed', jsonb_build_object(
      'mission', exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'mission' and at >= public.kst_day_start()),
      'cls', coalesce((select jsonb_agg(note) from public.seasoning_ledger where user_id = uid and kind = 'class' and at >= public.kst_day_start()), '[]'::jsonb)),
    'dishes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'dish', dish, 'lv', lv, 'gauge', gauge)) from public.upgraded_dishes where user_id = uid), '[]'::jsonb));
end $$;
revoke all on function public.seasoning_info() from public, anon;
grant execute on function public.seasoning_info() to authenticated;

-- The day's seasoning: kind 'mission' (all missions done, once a day) or
-- 'class' (a dish cooked, once a day per kind). → { status: 'ok', granted, n }
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
  if p_kind = 'mission' then
    if exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'mission' and at >= public.kst_day_start()) then
      return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
    end if;
    v_n := public.seasoning_add(uid, p_request_id, 'mission', cfg.mission_n, 'mission');
    return jsonb_build_object('status', 'ok', 'granted', cfg.mission_n, 'n', v_n);
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

-- One try. p_dish_id null: the dish's first upgrade (it's written in here,
-- at p_start: 1 for a gold medal, else 0). → { status: 'ok', ok, id, lv,
-- gauge, chance, cost, n, tries } or { status: <why not> }: signin, dish
-- (not mine / bad), max (the next level isn't open), limit (no tries left
-- today), seasoning (not enough: { n }).
create or replace function public.upgrade_dish(p_request_id uuid, p_dish_id uuid, p_dish text, p_start int, p_maker text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.upgrade_config;
  d public.upgraded_dishes;
  o public.upgrade_odds;
  t public.upgrade_tries;
  v_n int;
  v_tries int;
  v_chance int;
  v_roll int;
  v_ok boolean;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.upgrade_config where id = 1;
  insert into public.seasonings (user_id, n) values (uid, 0) on conflict (user_id) do nothing;
  -- Lock this player's seasoning: two taps at once run one after the other.
  select n into v_n from public.seasonings where user_id = uid for update;

  -- Sent before? Give the same answer and take nothing.
  select * into t from public.upgrade_tries where user_id = uid and op_id = p_request_id;
  if found then
    select * into d from public.upgraded_dishes where id = t.dish_id;
    return jsonb_build_object('status', 'ok', 'ok', t.ok, 'id', t.dish_id, 'lv', coalesce(d.lv, t.to_lv), 'gauge', coalesce(d.gauge, 0), 'chance', t.chance, 'cost', t.cost, 'n', v_n,
      'tries', (select count(*) from public.upgrade_tries where user_id = uid and at >= public.kst_day_start()));
  end if;

  if p_dish_id is null then
    if p_dish !~ '^[a-z]{2,24}$' then return jsonb_build_object('status', 'dish'); end if;
    d := null;
  else
    select * into d from public.upgraded_dishes where id = p_dish_id and user_id = uid for update;
    if not found then return jsonb_build_object('status', 'dish'); end if;
  end if;

  select * into o from public.upgrade_odds where lv = coalesce(d.lv, least(greatest(p_start, 0), 1)) + 1;
  if not found or not o.open then return jsonb_build_object('status', 'max'); end if;
  v_tries := (select count(*) from public.upgrade_tries where user_id = uid and at >= public.kst_day_start());
  if v_tries >= cfg.daily_tries then return jsonb_build_object('status', 'limit'); end if;
  if v_n < o.cost then return jsonb_build_object('status', 'seasoning', 'n', v_n); end if;

  if d.id is null then
    insert into public.upgraded_dishes (user_id, dish, lv, maker, maker_name)
      values (uid, p_dish, least(greatest(p_start, 0), 1), uid, left(coalesce(p_maker, ''), 24)) returning * into d;
  end if;

  v_chance := least(100, o.chance + d.gauge);
  v_roll := floor(random() * 100)::int; -- 0 … 99
  v_ok := v_roll < v_chance;
  -- +1 … +20: a failure keeps the level. (+21 … +30 drop a level down to
  -- +20 / +25 when they open: add that here then.)
  update public.upgraded_dishes set
    lv = case when v_ok then o.lv else lv end,
    gauge = case when v_ok then 0 else least(100, gauge + o.gauge) end,
    updated_at = now()
    where id = d.id returning * into d;
  v_n := public.seasoning_add(uid, p_request_id, 'upgrade', -o.cost, d.dish || ':' || o.lv);
  insert into public.upgrade_tries (user_id, op_id, dish_id, from_lv, to_lv, ok, chance, roll, cost)
    values (uid, p_request_id, d.id, o.lv - 1, d.lv, v_ok, v_chance, v_roll, o.cost);
  return jsonb_build_object('status', 'ok', 'ok', v_ok, 'id', d.id, 'lv', d.lv, 'gauge', d.gauge, 'chance', v_chance, 'cost', o.cost, 'n', v_n, 'tries', v_tries + 1);
end $$;
revoke all on function public.upgrade_dish(uuid, uuid, text, int, text) from public, anon;
grant execute on function public.upgrade_dish(uuid, uuid, text, int, text) to authenticated;

notify pgrst, 'reload schema';
