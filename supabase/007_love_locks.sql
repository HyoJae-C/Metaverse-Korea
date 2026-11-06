-- Love locks (사랑의 자물쇠) at the Namsan summit: a player picks a lock,
-- writes a note (up to 20 lines) and pays game coins to hang it. Everyone
-- can read the notes, newest first.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 001_saves.sql (the coins live in the cloud save) and 003_names.sql.
-- Before this is run the game says the love locks are being set up.
--
-- How it works:
--   hang_love_lock(...) takes the coins from the player's save and saves the
--   note in one transaction (the save row is locked while it runs), so the
--   coins and the notes can never disagree. Each note carries a request id
--   made by the game: sending the same one again (a double tap, a retry
--   after a dropped connection) returns the lock already hung and takes no
--   more coins.
--   The game reads the notes straight from the table (no account IDs).
--
-- Operator:
--   Price: Table Editor → love_lock_settings → change "price" (coins).
--     Also change LOVE_LOCK.price in src/core/love-locks.js for offline play.
--   Daily limit per player: "daily_limit" in the same row.
--   Hide a note: Table Editor → love_locks → set "hidden" to true.

create table if not exists public.love_lock_settings (
  id int primary key default 1 check (id = 1),
  price int not null default 30 check (price between 0 and 100000),
  daily_limit int not null default 10 check (daily_limit >= 0)
);
insert into public.love_lock_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.love_locks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  shape text not null check (shape in ('heart', 'circle', 'square', 'star')),
  name text not null check (char_length(name) between 1 and 16),
  body text not null check (
    char_length(body) between 1 and 1000
    and array_length(string_to_array(body, E'\n'), 1) <= 20
  ),
  price int not null,
  created_at timestamptz not null default now(),
  hidden boolean not null default false, -- hidden by the operator
  unique (user_id, request_id)
);
create index if not exists love_locks_user_day on public.love_locks (user_id, created_at);

-- The game reads only these columns (no account IDs) and never writes the
-- table directly: hang_love_lock below is the only way in.
alter table public.love_locks enable row level security;
alter table public.love_lock_settings enable row level security;
revoke all on public.love_locks from anon, authenticated;
revoke all on public.love_lock_settings from anon, authenticated;
grant select (id, shape, name, body, created_at) on public.love_locks to anon, authenticated;

drop policy if exists "read love locks" on public.love_locks;
create policy "read love locks" on public.love_locks for select using (not hidden);

create or replace function public.love_lock_price() returns int
language sql stable security definer set search_path = public as $$
  select price from public.love_lock_settings where id = 1;
$$;
grant execute on function public.love_lock_price() to anon, authenticated;

-- Returns { status: 'ok', lock, charged, coins, price } or { status: <why not> }:
--   signin, shape, empty, lines, chars, price (the price changed: { price }),
--   limit (daily limit), nosave (no cloud save yet), coins (not enough).
create or replace function public.hang_love_lock(
  p_request_id uuid, p_shape text, p_name text, p_body text, p_price int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.love_lock_settings;
  v_save jsonb;
  v_wallet jsonb;
  v_coins bigint;
  v_body text := regexp_replace(coalesce(p_body, ''), E'\r\n?', E'\n', 'g');
  v_who text;
  v_lock public.love_locks;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_shape not in ('heart', 'circle', 'square', 'star') then return jsonb_build_object('status', 'shape'); end if;
  if btrim(v_body, E' \t\n') = '' then return jsonb_build_object('status', 'empty'); end if;
  if array_length(string_to_array(v_body, E'\n'), 1) > 20 then return jsonb_build_object('status', 'lines'); end if;
  if char_length(v_body) > 1000 then return jsonb_build_object('status', 'chars'); end if;

  -- Lock this player's save row: two taps at once run one after the other.
  select data into v_save from public.saves where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Hand back the same lock and take nothing.
  select * into v_lock from public.love_locks where user_id = uid and request_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', v_lock.price,
      'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'body', v_lock.body, 'created_at', v_lock.created_at));
  end if;

  select * into cfg from public.love_lock_settings where id = 1;
  if p_price is distinct from cfg.price then return jsonb_build_object('status', 'price', 'price', cfg.price); end if;
  if (select count(*) from public.love_locks where user_id = uid
      and created_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')) >= cfg.daily_limit then
    return jsonb_build_object('status', 'limit');
  end if;

  -- The wallet is the save's "mk.wallet" entry: a JSON text like {"coins":120,...}.
  begin
    v_wallet := coalesce((v_save ->> 'mk.wallet')::jsonb, '{}'::jsonb);
  exception when others then
    v_wallet := '{}'::jsonb;
  end;
  v_coins := greatest(0, floor(coalesce((v_wallet ->> 'coins')::numeric, 0)));
  if v_coins < cfg.price then return jsonb_build_object('status', 'coins', 'coins', v_coins); end if;
  v_wallet := v_wallet || jsonb_build_object('coins', v_coins - cfg.price);
  update public.saves
    set data = jsonb_set(v_save, '{mk.wallet}', to_jsonb(v_wallet::text)), updated_at = now()
    where user_id = uid;

  -- The name this account claimed (003_names.sql), else the one sent.
  v_who := coalesce((select name from public.player_names where user_id = uid), nullif(btrim(left(coalesce(p_name, ''), 16)), ''), '?');
  insert into public.love_locks (user_id, request_id, shape, name, body, price)
    values (uid, p_request_id, p_shape, v_who, v_body, cfg.price)
    returning * into v_lock;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', v_lock.price, 'coins', v_coins - cfg.price,
    'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'body', v_lock.body, 'created_at', v_lock.created_at));
end $$;
revoke all on function public.hang_love_lock(uuid, text, text, text, int) from public, anon;
grant execute on function public.hang_love_lock(uuid, text, text, text, int) to authenticated;
