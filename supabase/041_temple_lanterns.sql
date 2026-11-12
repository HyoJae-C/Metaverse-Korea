-- 041: my lantern on Jogyesa's canopy (내 연등 달기). A player picks a
-- colour and a wish from the game's list, pays ₩5,000 and the lantern hangs
-- in a free spot of the canopy over the temple yard, with their name, for
-- 3 days. Everyone can see the lanterns hanging now.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 003_names.sql, 015_wallet.sql and 018_won.sql.
-- Before this is run the game says the lanterns are being set up.
--
-- How it works (like the Namsan love locks, 007/018):
--   hang_temple_lantern(...) takes the money from the player's wallet,
--   writes the receipt in coin_ledger (kind 'lantern', note 'temple
--   lantern') and hangs the lantern, in one transaction. Each lantern carries
--   a request id made by the game: sending the same one again (a double tap,
--   a retry after a dropped connection) returns the lantern already hung and
--   takes no more money.
--   The spot is the lowest one no lantern hanging now uses (0 … slots-1,
--   the front rows by Daeungjeon first). Lanterns past their 3 days stay in
--   the table (as receipts) but are no longer shown, and their spot is free.
--   The colour and the wish are numbers (the game's lists), so there is no
--   free text to moderate; the name is the one the account claimed.
--
-- Operator:
--   Price: Table Editor → temple_lantern_settings → "price" (won). Also
--     change TEMPLE_LANTERN.price in src/core/temple-lanterns.js for offline play.
--   Days, daily limit per player: "days", "daily_limit" in the same row.
--   Take one down: Table Editor → temple_lanterns → set "hidden" to true.
--   See what was paid:
--     select count(*), sum(price) from public.temple_lanterns;

create table if not exists public.temple_lantern_settings (
  id int primary key default 1 check (id = 1),
  price int not null default 5000 check (price between 0 and 10000000),
  days int not null default 3 check (days between 1 and 365),
  daily_limit int not null default 3 check (daily_limit >= 0),
  slots int not null default 400 check (slots between 1 and 400) -- the canopy's spots (data/jogyesa.js canopySlots)
);
insert into public.temple_lantern_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.temple_lanterns (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  slot int not null check (slot >= 0),
  color smallint not null check (color between 0 and 6), -- core/lanterns.js WISH_COLORS
  wish smallint not null check (wish between 0 and 7),   -- core/lanterns.js WISHES
  name text not null check (char_length(name) between 1 and 16),
  price int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  hidden boolean not null default false, -- taken down by the operator
  unique (user_id, request_id)
);
create index if not exists temple_lanterns_user_day on public.temple_lanterns (user_id, created_at);
create index if not exists temple_lanterns_expires on public.temple_lanterns (expires_at);

-- The game reads only these columns (no account IDs) and never writes the
-- table directly: hang_temple_lantern below is the only way in.
alter table public.temple_lanterns enable row level security;
alter table public.temple_lantern_settings enable row level security;
revoke all on public.temple_lanterns from anon, authenticated;
revoke all on public.temple_lantern_settings from anon, authenticated;
grant select (id, slot, color, wish, name, created_at, expires_at) on public.temple_lanterns to anon, authenticated;

drop policy if exists "read hanging lanterns" on public.temple_lanterns;
create policy "read hanging lanterns" on public.temple_lanterns for select using (not hidden and expires_at > now());

create or replace function public.temple_lantern_price() returns int
language sql stable security definer set search_path = public as $$
  select price from public.temple_lantern_settings where id = 1;
$$;
grant execute on function public.temple_lantern_price() to anon, authenticated;

-- Which of the lanterns hanging now are mine (ids), to mark them in the list.
create or replace function public.my_temple_lanterns() returns setof bigint
language sql stable security definer set search_path = public as $$
  select id from public.temple_lanterns
  where user_id = auth.uid() and not hidden and expires_at > now();
$$;
revoke all on function public.my_temple_lanterns() from public, anon;
grant execute on function public.my_temple_lanterns() to authenticated;

-- Returns { status: 'ok', lantern, charged, price, coins, ver } or
-- { status: <why not> }: signin, color, wish, price (the price changed:
-- { price }), limit (daily limit), full (no free spot), nosave (no wallet
-- yet), coins (not enough).
create or replace function public.hang_temple_lantern(
  p_request_id uuid, p_color int, p_wish int, p_name text, p_price int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.temple_lantern_settings;
  w public.wallets;
  v_slot int;
  v_who text;
  v_l public.temple_lanterns;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_color is null or p_color not between 0 and 6 then return jsonb_build_object('status', 'color'); end if;
  if p_wish is null or p_wish not between 0 and 7 then return jsonb_build_object('status', 'wish'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Hand back the same lantern and take nothing.
  select * into v_l from public.temple_lanterns where user_id = uid and request_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', v_l.price, 'coins', w.coins, 'ver', w.ver,
      'lantern', jsonb_build_object('id', v_l.id, 'slot', v_l.slot, 'color', v_l.color, 'wish', v_l.wish, 'name', v_l.name, 'created_at', v_l.created_at, 'expires_at', v_l.expires_at));
  end if;

  select * into cfg from public.temple_lantern_settings where id = 1;
  if p_price is distinct from cfg.price then return jsonb_build_object('status', 'price', 'price', cfg.price); end if;
  if (select count(*) from public.temple_lanterns where user_id = uid
      and created_at >= public.kst_day_start()) >= cfg.daily_limit then
    return jsonb_build_object('status', 'limit');
  end if;
  if w.coins < cfg.price then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  -- One buyer at a time picks a spot, so two can't take the same one.
  perform pg_advisory_xact_lock(hashtext('temple_lanterns'));
  select min(s) into v_slot from generate_series(0, cfg.slots - 1) s
    where not exists (select 1 from public.temple_lanterns l where l.slot = s and not l.hidden and l.expires_at > now());
  if v_slot is null then return jsonb_build_object('status', 'full'); end if;

  update public.wallets set coins = coins - cfg.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'lantern', -cfg.price, -cfg.price, 'ok', 'temple lantern', w.coins)
    on conflict (user_id, op_id) do nothing;

  -- The name this account claimed (003_names.sql), else the one sent.
  v_who := coalesce(nullif(left((select name from public.player_names where user_id = uid), 16), ''), nullif(btrim(left(coalesce(p_name, ''), 16)), ''), '?');
  insert into public.temple_lanterns (user_id, request_id, slot, color, wish, name, price, expires_at)
    values (uid, p_request_id, v_slot, p_color, p_wish, v_who, cfg.price, now() + make_interval(days => cfg.days))
    returning * into v_l;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', v_l.price, 'coins', w.coins, 'ver', w.ver,
    'lantern', jsonb_build_object('id', v_l.id, 'slot', v_l.slot, 'color', v_l.color, 'wish', v_l.wish, 'name', v_l.name, 'created_at', v_l.created_at, 'expires_at', v_l.expires_at));
end $$;
revoke all on function public.hang_temple_lantern(uuid, int, int, text, int) from public, anon;
grant execute on function public.hang_temple_lantern(uuid, int, int, text, int) to authenticated;

notify pgrst, 'reload schema';
