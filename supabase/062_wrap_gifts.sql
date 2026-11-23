-- 062: wrapped gifts (game/wrap-gifts.js). Run once in the Supabase SQL editor.
--
-- A gift-wrapped box is paid in the shop (ledger note "… · 🎁🎀 Gift-wrapped")
-- and can wait in the bag for days before it is handed to a friend. gift_bind
-- (036) only bound purchases up to 3 days old, so clothes handed over later
-- would have no receipt. This is gift_bind from 036 with one change: a wrapped
-- purchase (🎀 in its note) can be bound up to 60 days after it was paid.
-- Everything else (shop gifts 3 days, friends found by chat_ids, no refunds
-- after binding) stays the same.
--
-- Letters in a box are sent as friend messages (friend_messages, 90 days), so
-- they already show in the admin Chat tab with everything else.

create or replace function public.gift_bind(p_op uuid, p_to text, p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_to uuid;
  l public.coin_ledger;
  g public.gift_binds;
  v_keep interval;
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
  -- (worked out first: inside an IF, plpgsql would stop at a CASE's THEN)
  v_keep := case when coalesce(l.note, '') like '%🎀%' then interval '60 days' else interval '3 days' end;
  if coalesce(l.note, '') not like '%🎁%' or l.at < now() - v_keep then
    return jsonb_build_object('status', 'bad');
  end if;
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

-- To see wrapped gifts handed over:
--   select g.*, l.note from public.gift_binds g join public.coin_ledger l on l.op_id = g.op and l.user_id = g.giver
--   where l.note like '%🎀%' order by g.at desc;
