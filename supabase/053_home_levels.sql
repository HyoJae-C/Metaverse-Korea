-- 053: bigger homes (집 넓히기) at Forest Lane Apartments. A home has a level
-- (src/core/home-stages.js): 1 = 9×8 m (a new player's home), 2 = 14×11 m
-- (the home everyone had before levels), 3 = 18×13 m, 4 = 22×15 m. Players
-- save up game money and buy the next level, one at a time.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 015_wallet.sql, 018_won.sql and 047_home_visits.sql.
-- Before this is run the game keeps homes the size this browser knows and
-- says bigger homes are getting ready.
--
-- How it works (like the fishing bait, 042):
--   buy_home_level(request, level, price) takes the money from the wallet
--   and writes the receipt in coin_ledger (kind 'home', note 'home:<level>')
--   in one transaction. A home's level is the highest receipt, and at least
--   2 for an account made before this file was first run (Yozi 2026-11-17:
--   players who were already here keep the home they had; only new players
--   start small). The time of that first run is kept in home_level_since.
--   Each purchase carries a request id: sending the same one again (a double
--   tap, a retry) takes no more money.
--   open_homes() (047) now also says each open home's level, so a visitor's
--   room is the host's size.
--
-- Operator:
--   Prices: Table Editor → home_level_settings (one row a level).
--     Also change HOME_LEVELS in src/core/home-stages.js for offline play.
--   Give someone a level: insert a receipt of 0 won, e.g.
--     insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
--     select '<user id>', gen_random_uuid(), 'home', 0, 0, 'ok', 'home:3', coins
--     from public.wallets where user_id = '<user id>';
--   Who bought what:
--     select note, count(*), -sum(n) from public.coin_ledger where kind = 'home' group by note;

create table if not exists public.home_level_settings (
  level int primary key check (level between 2 and 9),
  price int not null check (price between 0 and 100000000)
);
insert into public.home_level_settings (level, price) values (2, 1000000), (3, 2500000), (4, 8000000)
  on conflict (level) do nothing;
alter table public.home_level_settings enable row level security;
revoke all on public.home_level_settings from anon, authenticated;

-- One row: accounts made before this time keep level 2.
create table if not exists public.home_level_since (
  id int primary key default 1 check (id = 1),
  at timestamptz not null default now()
);
insert into public.home_level_since (id) values (1) on conflict (id) do nothing;
alter table public.home_level_since enable row level security;
revoke all on public.home_level_since from anon, authenticated;

-- A player's home level.
create or replace function public.home_level_of(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(
    case when exists (select 1 from auth.users u, public.home_level_since s
                      where u.id = p_user and u.created_at < s.at) then 2 else 1 end,
    coalesce((select max(substr(note, 6)::int) from public.coin_ledger
              where user_id = p_user and kind = 'home' and status = 'ok' and note ~ '^home:[0-9]$'), 1));
$$;
revoke all on function public.home_level_of(uuid) from public, anon, authenticated;

-- { level, prices: { "2": won, ... } }
create or replace function public.home_level_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'level', case when auth.uid() is null then null else public.home_level_of(auth.uid()) end,
    'prices', (select jsonb_object_agg(level::text, price) from public.home_level_settings));
$$;
revoke all on function public.home_level_info() from public;
grant execute on function public.home_level_info() to anon, authenticated;

-- Returns { status: 'ok', charged, level, price, coins, ver } or { status:
-- <why not> }: signin, level (not the next level: { level } is mine now),
-- price (the price changed: { price }), nosave (no wallet yet), coins (not enough).
create or replace function public.buy_home_level(p_request_id uuid, p_level int, p_price int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.home_level_settings;
  w public.wallets;
  v_row public.coin_ledger;
  cur int;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Say so and take nothing.
  select * into v_row from public.coin_ledger where user_id = uid and op_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'level', public.home_level_of(uid), 'price', -v_row.n, 'coins', w.coins, 'ver', w.ver);
  end if;

  cur := public.home_level_of(uid);
  if p_level is distinct from cur + 1 then return jsonb_build_object('status', 'level', 'level', cur); end if;
  select * into cfg from public.home_level_settings where level = p_level;
  if not found then return jsonb_build_object('status', 'level', 'level', cur); end if;
  if p_price is distinct from cfg.price then return jsonb_build_object('status', 'price', 'price', cfg.price); end if;
  if w.coins < cfg.price then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - cfg.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'home', -cfg.price, -cfg.price, 'ok', 'home:' || p_level, w.coins);
  return jsonb_build_object('status', 'ok', 'charged', true, 'level', p_level, 'price', cfg.price, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.buy_home_level(uuid, int, int) from public, anon;
grant execute on function public.buy_home_level(uuid, int, int) to authenticated;

-- 047's list of open homes, now with each home's level (the return type
-- changes, so the old one goes first).
drop function if exists public.open_homes();
create function public.open_homes()
returns table (net_id text, name text, friend boolean, level int)
language sql stable security definer set search_path = public as $$
  select h.net_id, coalesce(n.name, '?'), public.are_friends(h.user_id, auth.uid()), public.home_level_of(h.user_id)
  from public.home_open h left join public.player_names n on n.user_id = h.user_id
  where auth.uid() is not null
    and h.user_id <> auth.uid()
    and h.updated_at > now() - interval '2 minutes'
    and (h.visit = 'all' or public.are_friends(h.user_id, auth.uid()))
  order by 3 desc, h.updated_at desc
  limit 20;
$$;
revoke all on function public.open_homes() from public, anon;
grant execute on function public.open_homes() to authenticated;

notify pgrst, 'reload schema';
