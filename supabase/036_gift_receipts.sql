-- 036: receipts for clothes received as a gift (run once, after
-- 035_old_clothes_refund.sql). Run in the Supabase dashboard: SQL Editor →
-- New query → paste → Run. Safe to run again.
--
-- Before this, a gift was only the giver's purchase on the ledger ("X · 🎁
-- Gift"); nothing said who got it, so the friend couldn't sell it. Yozi
-- (2026-11-11): every way to get clothes keeps a record. Now:
--   - when the friend accepts, the giver's game binds the purchase to the
--     friend (gift_bind): the friend is found by their player id
--     (chat_ids, 019), so a game can't say someone else got it;
--   - the friend's game asks my_gifts and keeps the purchase's op id as the
--     receipt;
--   - the shops and Potato Market accept a gift bound to the seller as their
--     purchase (buy_line), and no longer accept it from the giver; the giver
--     can't take the money back after it was given (wallet_apply refund).
--
-- To see gifts: select * from public.gift_binds order by at desc;

create table if not exists public.gift_binds (
  op uuid primary key,                      -- the giver's purchase (coin_ledger.op_id)
  giver uuid not null references auth.users (id) on delete cascade,
  to_uid uuid not null references auth.users (id) on delete cascade,
  item text not null check (item ~ '^[A-Za-z0-9_-]{1,64}$'),
  price bigint not null,                    -- won the giver paid
  at timestamptz not null default now()
);
create index if not exists gift_binds_to on public.gift_binds (to_uid);
alter table public.gift_binds enable row level security; -- only the functions below touch it
revoke all on public.gift_binds from anon, authenticated;

-- What p_uid paid for the thing bought with p_ref (negative, as on the
-- ledger), or null: their own purchase not given away, or a gift bound to them.
create or replace function public.buy_line(p_uid uuid, p_ref uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select l.n from public.coin_ledger l where l.user_id = p_uid and l.op_id = p_ref and l.kind = 'spend' and l.n < 0
       and not exists (select 1 from public.gift_binds g where g.op = p_ref and g.giver = p_uid)),
    (select l.n from public.gift_binds g join public.coin_ledger l on l.user_id = g.giver and l.op_id = g.op
       where g.op = p_ref and g.to_uid = p_uid and l.kind = 'spend' and l.n < 0));
$$;
-- How much of it was given back (refunds by p_uid, or by the giver of a gift).
create or replace function public.buy_back(p_uid uuid, p_ref uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(l.n), 0) from public.coin_ledger l
    where l.ref = p_ref and l.kind = 'refund'
      and (l.user_id = p_uid or l.user_id = (select g.giver from public.gift_binds g where g.op = p_ref and g.to_uid = p_uid));
$$;
revoke all on function public.buy_line(uuid, uuid) from public, anon, authenticated;
revoke all on function public.buy_back(uuid, uuid) from public, anon, authenticated;

-- The giver: my purchase p_op was a gift that player p_to (their page's
-- player id) accepted. 'ok', 'wait' (the purchase hasn't reached the server
-- yet: ask again), 'who' (that player id isn't signed in), 'noref' (given
-- back or sold), 'bad', 'signin'.
create or replace function public.gift_bind(p_op uuid, p_to text, p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_to uuid;
  l public.coin_ledger;
  g public.gift_binds;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_op is null or coalesce(p_item, '') !~ '^[A-Za-z0-9_-]{1,64}$' then return jsonb_build_object('status', 'bad'); end if;
  select * into g from public.gift_binds where op = p_op;
  if found then
    return jsonb_build_object('status', case when g.giver = uid and g.item = p_item then 'ok' else 'bad' end);
  end if;
  select * into l from public.coin_ledger
    where user_id = uid and op_id = p_op and kind = 'spend' and status = 'ok' and n < 0;
  if not found then return jsonb_build_object('status', 'wait'); end if;
  if coalesce(l.note, '') not like '%🎁%' or l.at < now() - interval '3 days' then return jsonb_build_object('status', 'bad'); end if;
  if exists (select 1 from public.coin_ledger r where r.user_id = uid and r.ref = p_op and r.kind in ('refund', 'resell')) then
    return jsonb_build_object('status', 'noref');
  end if;
  select c.user_id into v_to from public.chat_ids c where c.net_id = p_to;
  if v_to is null then return jsonb_build_object('status', 'who'); end if;
  if v_to = uid then return jsonb_build_object('status', 'bad'); end if;
  insert into public.gift_binds (op, giver, to_uid, item, price) values (p_op, uid, v_to, p_item, -l.n)
    on conflict (op) do nothing;
  return jsonb_build_object('status', 'ok');
end $$;
revoke all on function public.gift_bind(uuid, text, text) from public, anon;
grant execute on function public.gift_bind(uuid, text, text) to authenticated;

-- The friend: clothes given to me and not taken back: [{ item, op, price }].
create or replace function public.my_gifts() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('item', x.item, 'op', x.op, 'price', x.price) order by x.at), '[]'::jsonb)
  from (select g.item, g.op, g.price, g.at from public.gift_binds g
        where g.to_uid = auth.uid() and public.buy_back(g.to_uid, g.op) < g.price
        order by g.at desc limit 200) x;
$$;
revoke all on function public.my_gifts() from public, anon;
grant execute on function public.my_gifts() to authenticated;

-- used_list_price from 034, with gifts.
create or replace function public.used_list_price(p_uid uuid, p_ref uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.list from public.market_listings m where m.buyer = p_uid and m.buy_op = p_ref),
    (select k.list from public.shop_stock k where k.buyer = p_uid and k.buy_op = p_ref),
    -public.buy_line(p_uid, p_ref));
$$;
revoke all on function public.used_list_price(uuid, uuid) from public, anon, authenticated;

-- old_receipt_known from 035, with gifts.
create or replace function public.old_receipt_known(p_uid uuid, p_ref text, p_bn text, p_paid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p_ref, '') ~ '^[0-9a-fA-F-]{36}$' then public.buy_line(p_uid, p_ref::uuid) is not null
    when coalesce(p_bn, '') <> '' then exists (
      select 1 from public.coin_ledger l where l.user_id = p_uid and l.kind = 'spend' and l.status = 'ok'
        and l.note = left(p_bn, 80) and l.n = -abs(coalesce(p_paid, 0)))
    else false end;
$$;
revoke all on function public.old_receipt_known(uuid, text, text, bigint) from public, anon, authenticated;

-- market_list from 034, with gifts (buy_line, buy_back).
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
  if v_ref is not null then v_orig := public.buy_line(uid, v_ref); end if;
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
  v_back := public.buy_back(uid, v_ref);
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
revoke all on function public.market_list(text, bigint, uuid, text, bigint) from public, anon;
grant execute on function public.market_list(text, bigint, uuid, text, bigint) to authenticated;

-- wallet_apply as it is now (018), with gifts: a gift given away can't be
-- refunded by the giver, and a shop buys back a gift from the friend.
create or replace function public.wallet_apply(p_ops jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  v_free boolean;
  v_today bigint;
  op jsonb;
  v_id uuid;
  v_ref uuid;
  v_k text;
  v_asked int;
  v_n int;
  v_st text;
  v_orig int;
  v_back int;
  v_sold boolean;
  v_row public.coin_ledger;
  v_changed boolean := false;
  v_out jsonb := '[]'::jsonb;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if jsonb_typeof(p_ops) is distinct from 'array' or jsonb_array_length(p_ops) > 50 then
    return jsonb_build_object('status', 'bad');
  end if;
  select * into s from public.wallet_settings where id = 1;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'open'); end if;
  v_free := exists (select 1 from public.operators o where o.user_id = uid);
  select coalesce(sum(l.n), 0) into v_today from public.coin_ledger l
    where l.user_id = uid and l.kind = 'earn' and l.at >= public.kst_day_start();

  for op in select value from jsonb_array_elements(p_ops) loop
    begin
      v_id := (op ->> 'id')::uuid;
    exception when others then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', op ->> 'id', 'n', 0, 'status', 'bad'));
      continue;
    end;
    if v_id is null then continue; end if;

    -- Sent before (a retry): report what happened then, move nothing.
    select * into v_row from public.coin_ledger where user_id = uid and op_id = v_id;
    if found then
      v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'n', v_row.n, 'status', v_row.status));
      continue;
    end if;

    v_k := coalesce(op ->> 'k', '');
    v_asked := 0;
    v_ref := null;
    begin
      v_asked := least(greatest(round((op ->> 'n')::numeric), -1000000), 1000000)::int;
    exception when others then
      v_asked := 0;
    end;
    v_n := 0;
    v_st := 'ok';

    if v_k = 'spend' and v_asked < 0 then
      if w.coins >= -v_asked then v_n := v_asked; else v_st := 'poor'; end if;
    elsif v_k = 'take' and v_asked < 0 then
      v_n := -least(-v_asked, w.coins)::int;
    elsif v_k = 'refund' and v_asked > 0 then
      begin v_ref := (op ->> 'ref')::uuid; exception when others then v_ref := null; end;
      v_orig := null;
      select l.n into v_orig from public.coin_ledger l
        where l.user_id = uid and l.op_id = v_ref and l.n < 0 and l.at > now() - interval '1 day'
          and not exists (select 1 from public.gift_binds g where g.op = v_ref and g.giver = uid);
      if v_orig is null then
        v_st := 'noref';
      else
        select coalesce(sum(l.n), 0) into v_back from public.coin_ledger l
          where l.user_id = uid and l.ref = v_ref and l.kind in ('refund', 'resell');
        v_n := greatest(0, least(v_asked, -v_orig - v_back));
        if v_n < v_asked then v_st := 'cap'; end if;
      end if;
    elsif v_k = 'resell' and v_asked > 0 then
      -- Selling something back: the purchase it comes from is on the ledger.
      begin v_ref := (op ->> 'ref')::uuid; exception when others then v_ref := null; end;
      if v_ref is null and coalesce(op ->> 'bn', '') <> '' then
        -- Bought before receipts kept the purchase's id: the oldest purchase
        -- with that note and price that hasn't been sold back yet.
        begin
          select l.op_id into v_ref from public.coin_ledger l
            where l.user_id = uid and l.kind = 'spend' and l.status = 'ok'
              and l.note = left(op ->> 'bn', 80) and l.n = -abs(round((op ->> 'paid')::numeric))::int
              and not exists (select 1 from public.coin_ledger r
                              where r.user_id = uid and r.ref = l.op_id and r.kind = 'resell')
            order by l.at limit 1;
        exception when others then v_ref := null;
        end;
      end if;
      v_orig := null;
      if v_ref is not null then v_orig := public.buy_line(uid, v_ref); end if;
      if v_orig is null then
        v_st := 'noref';
      else
        select exists (select 1 from public.coin_ledger r
                       where r.user_id = uid and r.ref = v_ref and r.kind = 'resell') into v_sold;
        if v_sold then
          v_st := 'sold';
        else
          v_back := public.buy_back(uid, v_ref);
          v_n := greatest(0, least(v_asked, floor((-v_orig - v_back) * s.resell_pct / 100.0)))::int;
          if v_n < v_asked then v_st := 'cap'; end if;
        end if;
      end if;
    elsif v_k = 'earn' and v_asked > 0 then
      if v_free then
        v_n := v_asked;
      else
        v_n := greatest(0, least(v_asked, s.earn_op_max, s.earn_day_max - v_today))::int;
        if v_n < v_asked then v_st := 'cap'; end if;
        v_today := v_today + v_n;
      end if;
    else
      v_st := 'bad';
    end if;

    w.coins := w.coins + v_n;
    if v_n <> 0 then v_changed := true; end if;
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
      values (uid, v_id, left(v_k, 12), v_asked, v_n, v_st, left(op ->> 'note', 80), v_ref, w.coins);
    v_out := v_out || jsonb_build_array(jsonb_build_object('id', v_id, 'n', v_n, 'status', v_st));
  end loop;

  if v_changed then
    update public.wallets set coins = w.coins, ver = ver + 1, updated_at = now()
      where user_id = uid returning * into w;
  end if;
  return jsonb_build_object('status', 'ok', 'coins', w.coins, 'ver', w.ver, 'results', v_out);
end $$;
revoke all on function public.wallet_apply(jsonb) from public, anon;
grant execute on function public.wallet_apply(jsonb) to authenticated;
