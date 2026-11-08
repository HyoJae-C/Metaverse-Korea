-- Selling clothes back at second-hand shops (Hongdae's VINTAGE GARAGE,
-- Seongsu's Gaeul Vintage), paid from the server wallet.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 015_wallet.sql. Safe to run again.
--
-- How it works:
--   A shop pays resell_pct percent (10 to start) of what the purchase
--   really cost, as the coin ledger has it. The game sends one op with
--   k: 'resell' and the purchase's op id (ref); clothes bought before the
--   game kept that id send the purchase's note (bn) and price (paid)
--   instead, and the oldest matching purchase not sold yet is used.
--   Each purchase can be sold back once ('sold' after that), and a
--   purchase that isn't on the ledger pays nothing ('noref'), so selling
--   the same thing twice or something never bought gets no coins.
--   Selling back doesn't count towards the daily earning cap
--   (earn_day_max): it only returns part of coins already spent, never
--   more than was paid.
--   wallet_settings.resell_pct can be changed in the Table Editor (0 to 90;
--   0 means shops pay nothing).
--
-- Until this runs, the game shows "not buying clothes yet" at the shops
-- for players with a server wallet.

alter table public.wallet_settings add column if not exists resell_pct int not null default 10;
alter table public.wallet_settings drop constraint if exists wallet_settings_resell_pct;
alter table public.wallet_settings add constraint wallet_settings_resell_pct check (resell_pct between 0 and 90);

-- The share shops pay (the game asks once, to show prices).
create or replace function public.wallet_resell_pct() returns int
language sql stable security definer set search_path = public as $$
  select resell_pct from public.wallet_settings where id = 1;
$$;
revoke all on function public.wallet_resell_pct() from public, anon;
grant execute on function public.wallet_resell_pct() to authenticated;

-- wallet_apply from 015_wallet.sql, with 'resell' added (and refunds now
-- also count what was sold back).
-- A batch of up to 50 ops: [{ id: uuid, n: int, k: 'earn'|'spend'|'take'|'refund'|'resell',
-- note?: text, ref?: uuid, paid?: int, bn?: text }]. (resell: see the top of 017_resale.sql.) Returns { status, coins, ver, results: [{ id, n, status }] }
-- where n is what really moved. status 'open': call wallet_open first.
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
        where l.user_id = uid and l.op_id = v_ref and l.n < 0 and l.at > now() - interval '1 day';
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
      if v_ref is not null then
        select l.n into v_orig from public.coin_ledger l
          where l.user_id = uid and l.op_id = v_ref and l.kind = 'spend' and l.n < 0;
      end if;
      if v_orig is null then
        v_st := 'noref';
      else
        select exists (select 1 from public.coin_ledger r
                       where r.user_id = uid and r.ref = v_ref and r.kind = 'resell') into v_sold;
        if v_sold then
          v_st := 'sold';
        else
          select coalesce(sum(l.n), 0) into v_back from public.coin_ledger l
            where l.user_id = uid and l.ref = v_ref and l.kind = 'refund';
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
