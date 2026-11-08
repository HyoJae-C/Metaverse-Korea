-- 028: Seoul Bank (서울은행) transfers: send won to another player.
-- Run once, after 025_referrals.sql. Safe to run again.
-- Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- For now only operators (005_operators.sql) can send. Everyone else finds
-- the bank and its teller, and the teller says transfers are coming soon.
-- The server checks this, so nobody can send by calling bank_send by hand.
--
-- How a transfer works: everything happens here, in one go.
--   bank_status()                    can I send? { open, min, max }
--   bank_send(op, to, n, memo)       moves n won from me to the player named
--                                    `to`, both wallets at once. op is the
--                                    transfer's id: sending it twice moves
--                                    nothing the second time.
--   bank_news()                      transfers sent to me that I haven't been
--                                    told about yet ("🏦 Mina sent you ₩5,000").
-- Each transfer is one row in bank_transfers and a line in each player's
-- coin_ledger (kind bank_out / bank_in), so it isn't counted as earning.
--
-- Before opening it to everyone (bank_open = true), add limits first: guest
-- accounts are free, so without a daily cap per sender and receiver, many
-- accounts could pour their travel money into one.
--
-- To change the amounts:
--   update public.wallet_settings set bank_min = 1000, bank_max = 500000 where id = 1;
-- Recent transfers:
--   select t.at, a.name as sender, b.name as receiver, t.n, t.memo from public.bank_transfers t
--   left join public.player_names a on a.user_id = t.from_user
--   left join public.player_names b on b.user_id = t.to_user
--   order by t.at desc limit 50;

alter table public.wallet_settings add column if not exists bank_open boolean not null default false; -- false: operators only
alter table public.wallet_settings add column if not exists bank_min bigint not null default 1000;
alter table public.wallet_settings add column if not exists bank_max bigint not null default 500000;

create table if not exists public.bank_transfers (
  id uuid primary key,                -- the sender's op id
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  n bigint not null check (n > 0),    -- won
  memo text not null,
  seen boolean not null default false, -- the receiver has been told
  at timestamptz not null default now()
);
create index if not exists bank_transfers_to on public.bank_transfers (to_user, at) where not seen;
create index if not exists bank_transfers_from on public.bank_transfers (from_user, at);
alter table public.bank_transfers enable row level security;
revoke all on public.bank_transfers from anon, authenticated;

-- Can I send? { status: 'ok', open, min, max } (open: bank_open, or I'm an operator).
create or replace function public.bank_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  return jsonb_build_object('status', 'ok',
    'open', coalesce(s.bank_open, false) or exists (select 1 from public.operators o where o.user_id = uid),
    'min', s.bank_min, 'max', s.bank_max);
end $$;
revoke all on function public.bank_status() from public, anon;
grant execute on function public.bank_status() to authenticated;

-- Send p_n won to the player named p_to. Returns { status, coins, ver, name }:
-- status is ok, closed (not open to me), amount (outside min..max), poor
-- (not enough won), nobody (no player has that name), self, nowallet (they
-- haven't opened a server wallet yet), open (I haven't), bad, signin.
create or replace function public.bank_send(p_op uuid, p_to text, p_n bigint, p_memo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  k text := public.name_key(p_to);
  v_to uuid;
  v_name text;
  v_memo text := case when p_memo in ('thanks', 'food', 'coffee', 'birthday', 'payback', 'trip') then p_memo else 'thanks' end;
  w public.wallets;
  w2 public.wallets;
  v_old public.bank_transfers;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_op is null then return jsonb_build_object('status', 'bad'); end if;
  select * into s from public.wallet_settings where id = 1;
  if not (coalesce(s.bank_open, false) or exists (select 1 from public.operators o where o.user_id = uid)) then
    return jsonb_build_object('status', 'closed');
  end if;

  -- Sent before (a retry): report it again, move nothing.
  select * into v_old from public.bank_transfers where id = p_op;
  if found then
    if v_old.from_user <> uid then return jsonb_build_object('status', 'bad'); end if;
    select * into w from public.wallets where user_id = uid;
    select p.name into v_name from public.player_names p where p.user_id = v_old.to_user;
    return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'name', coalesce(v_name, ''), 'n', v_old.n);
  end if;

  if p_n is null or p_n < s.bank_min or p_n > s.bank_max then return jsonb_build_object('status', 'amount'); end if;
  if k = '' or char_length(k) > 16 then return jsonb_build_object('status', 'nobody'); end if;
  select p.user_id, p.name into v_to, v_name from public.player_names p where p.name_key = k;
  if v_to is null then return jsonb_build_object('status', 'nobody'); end if;
  if v_to = uid then return jsonb_build_object('status', 'self'); end if;

  -- Lock both wallets, always in the same order (two people sending to each
  -- other at once can't wait on each other forever).
  perform 1 from public.wallets where user_id in (uid, v_to) order by user_id for update;
  select * into w from public.wallets where user_id = uid;
  if not found then return jsonb_build_object('status', 'open'); end if;
  select * into w2 from public.wallets where user_id = v_to;
  if not found then return jsonb_build_object('status', 'nowallet'); end if;
  if w.coins < p_n then return jsonb_build_object('status', 'poor', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - p_n, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  update public.wallets set coins = coins + p_n, ver = ver + 1, updated_at = now()
    where user_id = v_to returning * into w2;
  insert into public.bank_transfers (id, from_user, to_user, n, memo) values (p_op, uid, v_to, p_n, v_memo);
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal, r)
    values (uid, p_op, 'bank_out', -p_n, -p_n, 'ok', left('bank to ' || v_name, 80), w.coins, 'bank');
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal, r)
    values (v_to, p_op, 'bank_in', p_n, p_n, 'ok', 'bank transfer', w2.coins, 'bank');
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'name', v_name, 'n', p_n);
exception when unique_violation then
  return jsonb_build_object('status', 'bad'); -- the same op id at the same moment
end $$;
revoke all on function public.bank_send(uuid, text, bigint, text) from public, anon;
grant execute on function public.bank_send(uuid, text, bigint, text) to authenticated;

-- Transfers sent to me that I haven't been told about (marks them told).
-- Returns { status: 'ok', items: [{ name, n, memo }], coins, ver }.
create or replace function public.bank_news() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_items jsonb;
  w public.wallets;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  with picked as (
    select t.id from public.bank_transfers t
    where t.to_user = uid and not t.seen
    order by t.at limit 20
  ), told as (
    update public.bank_transfers t set seen = true
    from picked where t.id = picked.id
    returning t.from_user, t.n, t.memo, t.at
  )
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, ''), 'n', told.n, 'memo', told.memo) order by told.at), '[]'::jsonb)
    into v_items
    from told left join public.player_names p on p.user_id = told.from_user;
  select * into w from public.wallets where user_id = uid;
  return jsonb_build_object('status', 'ok', 'items', v_items, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.bank_news() from public, anon;
grant execute on function public.bank_news() to authenticated;
