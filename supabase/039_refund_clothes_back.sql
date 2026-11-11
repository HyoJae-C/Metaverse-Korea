-- 039: clothes refunded by 035 come back too, and the money stays (run once,
-- after 038_item_grants.sql). Run in the Supabase dashboard: SQL Editor →
-- New query → paste → Run. Safe to run again.
--
-- Yozi (2026-11-11 13:45 KST): "give the clothes back and the money too".
-- 035 paid twice the price for clothes bought before the server kept
-- purchases and took them out of the closet. Now each refunded piece gets a
-- receipt at its shop price (item_grants) and goes back in the closet; the
-- refund isn't taken back. my_item_grants makes these receipts as it is
-- asked, so a refund paid later comes back the same way.
--
-- To see them: select r.user_id, r.item, g.op from public.old_clothes_refunds r
--   join public.item_grants g using (user_id, item);

insert into public.item_grants (user_id, item, price)
select r.user_id, r.item, p.price
from public.old_clothes_refunds r join public.item_prices p on p.item = r.item
on conflict (user_id, item) do nothing;

-- My receipts not sold yet: [{ item, op, price, restore }]. restore: it goes
-- back in the closet: the game took it out after the save backup (the
-- account's save says the old sweep ran, the backup doesn't), or 035
-- refunded it. (Not checked against the save here: it may not have caught up
-- with the closet yet. The game asks once and adds only what's missing.)
create or replace function public.my_item_grants() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_now jsonb;
  v_old jsonb;
  v_swept boolean;
begin
  if uid is null then return '[]'::jsonb; end if;
  insert into public.item_grants (user_id, item, price)
    select r.user_id, r.item, p.price from public.old_clothes_refunds r join public.item_prices p on p.item = r.item
    where r.user_id = uid
    on conflict (user_id, item) do nothing;
  select s.data, b.data into v_now, v_old
    from public.saves s left join public.saves_backup_20261111 b on b.user_id = s.user_id
    where s.user_id = uid;
  v_swept := coalesce((v_now ->> 'mk.noReceiptSweep') ~ '^[1-9]', false) and v_old ->> 'mk.noReceiptSweep' is null;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('item', i.item, 'op', i.op, 'price', i.price,
      'restore', v_swept or exists (select 1 from public.old_clothes_refunds r where r.user_id = uid and r.item = i.item))
      order by i.item), '[]'::jsonb)
    from public.item_grants i
    where i.user_id = uid
      and not exists (select 1 from public.coin_ledger l where l.user_id = uid and l.ref = i.op and l.kind = 'resell'));
end $$;
revoke all on function public.my_item_grants() from public, anon;
grant execute on function public.my_item_grants() to authenticated;
