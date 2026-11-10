-- 037: travel money for accounts made before the server kept purchases (run
-- once, after 036_gift_receipts.sql). Run in the Supabase dashboard: SQL
-- Editor → New query → paste → Run. Safe to run again.
--
-- The update took out clothes with no record (and reset the collections),
-- so the time spent going to buy them was lost. Yozi (2026-11-11): every
-- account made before old_refund_before (035) gets ₩300,000 once (Yozi first said ₩500,000). The
-- server decides from the account's own sign-up time, so a new account
-- can't ask. Paid as ledger kind 'bonus' (not 'earn', so it doesn't use up
-- the day's earning limit).
--
-- Settings (Table Editor → wallet_settings): update_bonus (300000, 0 stops it).
-- To see what was paid:
--   select count(*), sum(n) from public.coin_ledger where kind = 'bonus' and note = 'ledger.updateBonus';

alter table public.wallet_settings add column if not exists update_bonus bigint not null default 300000;
alter table public.wallet_settings drop constraint if exists wallet_settings_update_bonus;
alter table public.wallet_settings add constraint wallet_settings_update_bonus check (update_bonus between 0 and 5000000);

-- Once per account: { status, n (won paid), coins, ver }. ok (paid now),
-- done (paid before), late (account too new), closed, signin.
create or replace function public.update_bonus() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  v_op uuid;
  v_made timestamptz;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into s from public.wallet_settings where id = 1;
  if s.unit is distinct from 'krw' or s.update_bonus <= 0 then return jsonb_build_object('status', 'closed'); end if;
  select created_at into v_made from auth.users where id = uid;
  if v_made is null or v_made >= s.old_refund_before then return jsonb_build_object('status', 'late'); end if;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'signin'); end if;
  -- One fixed op id per account: never paid twice.
  v_op := md5('update-bonus-2026-11-11:' || uid::text)::uuid;
  if exists (select 1 from public.coin_ledger where user_id = uid and op_id = v_op) then
    return jsonb_build_object('status', 'done', 'coins', w.coins, 'ver', w.ver);
  end if;
  update public.wallets set coins = coins + s.update_bonus, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
    values (uid, v_op, 'bonus', s.update_bonus, s.update_bonus, 'ok', 'ledger.updateBonus', null, w.coins);
  return jsonb_build_object('status', 'ok', 'n', s.update_bonus, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.update_bonus() from public, anon;
grant execute on function public.update_bonus() to authenticated;
