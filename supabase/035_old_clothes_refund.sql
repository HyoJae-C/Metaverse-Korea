-- 035: money back for clothes bought before the server kept purchases (run
-- once, after 034_player_market.sql). Run in the Supabase dashboard: SQL
-- Editor → New query → paste → Run. Safe to run again.
--
-- Clothes bought before the server wallet (before an account's wallet was
-- made) have no line in coin_ledger, so the server can't tell they were paid
-- for: they can't go to the shops or on a Potato Market mat. Yozi
-- (2026-11-11): pay them back twice their price and take them out of the
-- closet, once per account, at most old_refund_cap (₩300,000) in all.
--
-- The game takes the clothes out first, then asks here. Their receipts are
-- only on the player's device, so a made-up receipt could ask too: that is
-- why there is one refund per account, a cap, and only accounts whose wallet
-- was made before old_refund_before (new accounts never had such clothes).
--
-- Settings (Table Editor → wallet_settings): old_refund_mult (2),
-- old_refund_cap (300000, 0 stops it), old_refund_before.
--
-- To see what was paid:
--   select user_id, sum(price), count(*), max(at) from public.old_clothes_refunds group by user_id;

alter table public.wallet_settings add column if not exists old_refund_mult int not null default 2;
alter table public.wallet_settings add column if not exists old_refund_cap bigint not null default 300000;
alter table public.wallet_settings add column if not exists old_refund_before timestamptz not null default '2026-11-11 03:00:00+09';
alter table public.wallet_settings drop constraint if exists wallet_settings_old_refund;
alter table public.wallet_settings add constraint wallet_settings_old_refund
  check (old_refund_mult between 0 and 5 and old_refund_cap between 0 and 5000000);

create table if not exists public.old_clothes_refunds (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null check (item ~ '^[A-Za-z0-9_-]{1,64}$'),
  price bigint not null,  -- the clothes' price the game sent (won)
  op uuid not null,       -- the refund's coin_ledger line
  at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.old_clothes_refunds enable row level security; -- only the function below touches it
revoke all on public.old_clothes_refunds from anon, authenticated;

-- Whether a receipt is on the ledger (the same checks as market_list): its
-- purchase is found by op id, or by note and price for older receipts.
create or replace function public.old_receipt_known(p_uid uuid, p_ref text, p_bn text, p_paid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p_ref, '') ~ '^[0-9a-fA-F-]{36}$' then exists (
      select 1 from public.coin_ledger l where l.user_id = p_uid and l.op_id = p_ref::uuid and l.kind = 'spend' and l.n < 0)
    when coalesce(p_bn, '') <> '' then exists (
      select 1 from public.coin_ledger l where l.user_id = p_uid and l.kind = 'spend' and l.status = 'ok'
        and l.note = left(p_bn, 80) and l.n = -abs(coalesce(p_paid, 0)))
    else false end;
$$;
revoke all on function public.old_receipt_known(uuid, text, text, bigint) from public, anon, authenticated;

-- p_items: [{ item, price, ref, bn, paid }] (the clothes with a receipt on
-- this device, at most 200). p_dry true: only say which are old (nothing
-- paid). Returns { status, items (the old ones), n (won paid), coins, ver }:
-- ok, done (paid before), none (nothing old), late (account too new),
-- closed, signin.
create or replace function public.old_clothes_refund(p_items jsonb, p_op uuid, p_dry boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  r jsonb;
  v_items text[] := '{}';
  v_prices bigint[] := '{}';
  v_sum bigint := 0;
  v_n bigint;
  v_price bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  if s.unit is distinct from 'krw' or s.old_refund_cap <= 0 or s.old_refund_mult <= 0 then
    return jsonb_build_object('status', 'closed');
  end if;
  -- Asked again (the answer was lost): the same answer.
  if p_op is not null and exists (select 1 from public.old_clothes_refunds where user_id = uid and op = p_op) then
    select * into w from public.wallets where user_id = uid;
    return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver,
      'n', (select n from public.coin_ledger where user_id = uid and op_id = p_op),
      'items', (select jsonb_agg(item) from public.old_clothes_refunds where user_id = uid and op = p_op));
  end if;
  if exists (select 1 from public.old_clothes_refunds where user_id = uid) then return jsonb_build_object('status', 'done'); end if;
  select * into w from public.wallets where user_id = uid;
  if not found then return jsonb_build_object('status', 'signin'); end if;
  if w.created_at >= s.old_refund_before then return jsonb_build_object('status', 'late'); end if;
  if jsonb_typeof(p_items) is distinct from 'array' then return jsonb_build_object('status', 'none'); end if;

  for r in select * from jsonb_array_elements(p_items) limit 200 loop
    if coalesce(r->>'item', '') !~ '^[A-Za-z0-9_-]{1,64}$' or r->>'item' = any(v_items) then continue; end if;
    v_price := least(coalesce(nullif(r->>'price', '')::numeric, 0), 200000)::bigint;
    if v_price <= 0 then continue; end if;
    if public.old_receipt_known(uid, r->>'ref', r->>'bn', nullif(r->>'paid', '')::numeric::bigint) then continue; end if;
    v_items := v_items || (r->>'item');
    v_prices := v_prices || v_price;
    v_sum := v_sum + v_price;
  end loop;
  if cardinality(v_items) = 0 then return jsonb_build_object('status', 'none'); end if;
  v_n := least(v_sum * s.old_refund_mult, s.old_refund_cap);
  if p_dry then return jsonb_build_object('status', 'ok', 'items', to_jsonb(v_items), 'n', v_n, 'dry', true); end if;
  if p_op is null or exists (select 1 from public.coin_ledger where user_id = uid and op_id = p_op) then
    return jsonb_build_object('status', 'bad');
  end if;

  select * into w from public.wallets where user_id = uid for update;
  if exists (select 1 from public.old_clothes_refunds where user_id = uid) then return jsonb_build_object('status', 'done'); end if;
  update public.wallets set coins = coins + v_n, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
    values (uid, p_op, 'refund', v_n, v_n, 'ok', 'ledger.oldClothes', null, w.coins);
  insert into public.old_clothes_refunds (user_id, item, price, op)
    select uid, i, p, p_op from unnest(v_items, v_prices) as x(i, p);
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'n', v_n, 'items', to_jsonb(v_items));
end $$;

revoke all on function public.old_clothes_refund(jsonb, uuid, boolean) from public, anon;
grant execute on function public.old_clothes_refund(jsonb, uuid, boolean) to authenticated;
