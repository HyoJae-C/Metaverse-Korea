-- 038: receipts for the clothes players already had (run once, after
-- 037_update_bonus.sql). Run in the Supabase dashboard: SQL Editor → New
-- query → paste → Run. Safe to run again.
--
-- 2026-11-11 the game took clothes with no receipt out of the closet once
-- (gifts, code items, prizes, the starting outfit). Yozi (13:38 KST): stop
-- that, and give the clothes players have a receipt at their real shop price
-- instead ("making a few people happy beats upsetting a few"). So:
--   - every account's clothes in the save backup taken 2026-11-10 22:04 UTC
--     (saves_backup_20261111) get a receipt (item_grants), unless the account
--     paid for that piece itself on the ledger (it has a real receipt), had it
--     refunded (035) or got it as a bound gift (036);
--   - buy_line counts a receipt like a purchase, so the shops and Potato
--     Market take it at the shop price (refunds don't: there was no payment);
--   - my_item_grants gives the game its receipts; clothes the game took out
--     after the backup come back (restore), on the accounts it swept then.
-- Clothes swept before the backup (2 accounts) aren't in it and can't come back.
--
-- To see them: select user_id, count(*), sum(price) from public.item_grants group by 1;

-- Shop prices of the clothes (src/core/inventory.js ITEMS: wear, price > 0).
create table if not exists public.item_prices (
  item text primary key,
  price bigint not null check (price > 0),
  name_en text not null
);
alter table public.item_prices enable row level security;
revoke all on public.item_prices from anon, authenticated;
insert into public.item_prices (item, price, name_en) values
  ('outfit-rogue', 60000, 'Denim jacket'),
  ('outfit-ranger', 60000, 'Linen shirt & bandana'),
  ('outfit-barbarian', 80000, 'Sleeveless top & shorts'),
  ('outfit-hooded', 100000, 'Grey hoodie'),
  ('outfit-knight', 120000, 'Puffer jacket'),
  ('outfit-mage', 150000, 'Long padded coat'),
  ('outfit-jacket-black', 70000, 'Black denim jacket'),
  ('outfit-jacket-indigo', 70000, 'Indigo denim jacket'),
  ('outfit-jacket-cocoa', 70000, 'Brown corduroy jacket'),
  ('outfit-jacket-olive', 70000, 'Olive field jacket'),
  ('outfit-hoodie-black', 60000, 'Black hoodie'),
  ('outfit-hoodie-wine', 60000, 'Burgundy hoodie'),
  ('outfit-hoodie-orange', 60000, 'Orange hoodie'),
  ('outfit-shirt-white', 50000, 'White shirt'),
  ('outfit-shirt-denim', 50000, 'Denim shirt'),
  ('outfit-shirt-olive', 50000, 'Olive shirt'),
  ('outfit-puffer-black', 110000, 'Black puffer jacket'),
  ('outfit-puffer-mustard', 110000, 'Mustard puffer jacket'),
  ('outfit-padding-white', 140000, 'White long padded coat'),
  ('outfit-suit-charcoal', 150000, 'Charcoal suit jacket'),
  ('outfit-suit-navy', 150000, 'Navy suit jacket'),
  ('outfit-coat-camel', 180000, 'Camel wool coat'),
  ('outfit-coat-charcoal', 180000, 'Charcoal wool coat'),
  ('outfit-varsity-navy', 90000, 'Navy varsity jacket'),
  ('outfit-varsity-black', 90000, 'Black varsity jacket'),
  ('outfit-varsity-green', 90000, 'Green varsity jacket'),
  ('outfit-knit-grey', 55000, 'Grey crew-neck knit'),
  ('outfit-knit-navy', 55000, 'Navy crew-neck knit'),
  ('outfit-knit-cream', 55000, 'Cream crew-neck knit'),
  ('outfit-sweat-pistachio', 50000, 'Pistachio sweatshirt'),
  ('outfit-cardigan-brown', 55000, 'Brown cardigan'),
  ('outfit-vest-denim', 50000, 'Denim vest'),
  ('outfit-rugby-green', 50000, 'Green rugby shirt'),
  ('outfit-polo-mint', 45000, 'Mint polo shirt'),
  ('outfit-jersey-red', 60000, 'Red baseball jersey'),
  ('outfit-track-blue', 60000, 'Blue track jacket'),
  ('outfit-fleece-orange', 70000, 'Orange fleece jacket'),
  ('outfit-breton-navy', 40000, 'Striped long-sleeve tee'),
  ('outfit-turtle-camel', 50000, 'Camel turtleneck'),
  ('outfit-windbreaker-yellow', 75000, 'Yellow windbreaker'),
  ('outfit-vest-padded', 80000, 'Sky blue padded vest'),
  ('pants-indigo', 40000, 'Indigo jeans'),
  ('pants-lightwash', 40000, 'Light-wash jeans'),
  ('pants-black', 40000, 'Black jeans'),
  ('pants-sand', 40000, 'Beige wide pants'),
  ('pants-charcoal', 40000, 'Charcoal slacks'),
  ('pants-cream', 40000, 'Cream wide pants'),
  ('pants-olive', 40000, 'Olive cargo pants'),
  ('pants-cocoa', 40000, 'Brown cotton pants'),
  ('pants-denim', 40000, 'Classic blue jeans'),
  ('shoes-white', 45000, 'White sneakers'),
  ('shoes-black', 45000, 'Black sneakers'),
  ('shoes-pink', 45000, 'Pink sneakers'),
  ('shoes-sky', 45000, 'Sky blue sneakers'),
  ('shoes-butter', 45000, 'Butter yellow sneakers'),
  ('shoes-red', 50000, 'Red high-tops'),
  ('shoes-lime', 50000, 'Lime high-tops'),
  ('shoes-brown', 60000, 'Brown leather loafers'),
  ('shoes-tan', 60000, 'Tan leather loafers'),
  ('shoes-burgundy', 60000, 'Burgundy leather shoes'),
  ('acc-cap-red', 25000, 'Red cap'),
  ('acc-cap-sky', 25000, 'Sky blue cap'),
  ('acc-cap-black', 25000, 'Black cap'),
  ('acc-cap-orange', 25000, 'Orange graffiti cap'),
  ('acc-bucket-cream', 30000, 'Cream bucket hat'),
  ('acc-bucket-denim', 30000, 'Denim bucket hat'),
  ('acc-beanie-grey', 20000, 'Grey beanie'),
  ('acc-beanie-cream', 20000, 'Cream knit beanie'),
  ('acc-beanie-mustard', 20000, 'Mustard knit beanie'),
  ('acc-beret-black', 30000, 'Black beret'),
  ('acc-ribbon-red', 10000, 'Red hair ribbon'),
  ('acc-glasses', 30000, 'Brown round glasses'),
  ('acc-glasses-black', 30000, 'Black round glasses'),
  ('acc-glasses-gold', 35000, 'Gold wire glasses'),
  ('acc-glasses-pink', 30000, 'Pink round glasses'),
  ('acc-sunglasses', 35000, 'Black sunglasses'),
  ('acc-sunglasses-brown', 35000, 'Brown tinted sunglasses'),
  ('acc-sunglasses-pink', 35000, 'Pink tinted sunglasses'),
  ('acc-sunglasses-blue', 35000, 'Blue tinted sunglasses'),
  ('acc-hoops-gold', 20000, 'Gold hoop earrings'),
  ('acc-hoops-silver', 20000, 'Silver hoop earrings'),
  ('acc-pearls', 25000, 'Pearl studs'),
  ('acc-stars', 15000, 'Star drop earrings'),
  ('acc-hearts', 15000, 'Heart drop earrings'),
  ('acc-cherries', 15000, 'Cherry earrings'),
  ('acc-scarf', 25000, 'Coral knit scarf'),
  ('acc-scarf-mint', 25000, 'Mint knit scarf'),
  ('acc-scarf-cream', 25000, 'Cream knit scarf'),
  ('acc-pendant-silver-moon', 25000, 'Silver moon pendant'),
  ('acc-pendant-silver-plum', 25000, 'Silver plum blossom pendant'),
  ('acc-pendant-silver-bok', 25000, 'Silver 복 (luck) pendant'),
  ('acc-pendant-gold-moon', 25000, 'Gold moon pendant'),
  ('acc-pendant-gold-plum', 25000, 'Gold plum blossom pendant'),
  ('acc-pendant-gold-bok', 25000, 'Gold 복 (luck) pendant'),
  ('acc-tote-forest', 25000, 'Forest green tote bag'),
  ('acc-tote-river', 25000, 'River blue tote bag'),
  ('acc-tote-brick', 25000, 'Brick red tote bag'),
  ('acc-backpack-graffiti', 45000, 'Graffiti backpack'),
  ('acc-ears-cat-black', 20000, 'Black cat ears headband'),
  ('acc-paws-cat-black', 25000, 'Black cat paw gloves'),
  ('acc-ears-cat-ginger', 20000, 'Ginger cat ears headband'),
  ('acc-paws-cat-ginger', 25000, 'Ginger cat paw gloves'),
  ('acc-ears-dog', 20000, 'Puppy ears headband'),
  ('acc-paws-dog', 25000, 'Puppy paw gloves'),
  ('acc-ears-bunny-white', 20000, 'White bunny ears headband'),
  ('acc-paws-bunny-white', 25000, 'White bunny paw gloves'),
  ('acc-ears-bunny-pink', 20000, 'Pink bunny ears headband'),
  ('acc-paws-bunny-pink', 25000, 'Pink bunny paw gloves'),
  ('acc-ears-panda', 20000, 'Panda ears headband'),
  ('acc-paws-panda', 25000, 'Panda paw gloves'),
  ('skirt-pleats-mini-navy', 45000, 'Navy pleated mini skirt'),
  ('skirt-pleats-mini-pink', 45000, 'Pink pleated mini skirt'),
  ('skirt-pleats-mini-white', 45000, 'White pleated mini skirt'),
  ('skirt-pleats-long-black', 55000, 'Black pleated long skirt'),
  ('skirt-pleats-long-sage', 55000, 'Sage green pleated long skirt'),
  ('skirt-tartan-mini-red', 45000, 'Red tartan mini skirt'),
  ('skirt-tartan-mini-green', 45000, 'Green tartan mini skirt'),
  ('skirt-gingham-mini-sky', 45000, 'Sky blue gingham mini skirt'),
  ('skirt-gingham-long-butter', 55000, 'Butter yellow gingham long skirt'),
  ('skirt-tartan-long-camel', 55000, 'Camel tartan long skirt'),
  ('skirt-dots-mini-black', 45000, 'Black polka-dot mini skirt'),
  ('skirt-dots-mini-red', 45000, 'Red polka-dot mini skirt'),
  ('skirt-dots-long-navy', 55000, 'Navy polka-dot long skirt'),
  ('skirt-dots-long-pink', 55000, 'Pink polka-dot long skirt'),
  ('skirt-floral-mini-cream', 45000, 'Cream floral mini skirt'),
  ('skirt-floral-mini-sky', 45000, 'Sky blue floral mini skirt'),
  ('skirt-floral-long-butter', 55000, 'Butter yellow floral long skirt'),
  ('skirt-floral-long-black', 55000, 'Black floral long skirt'),
  ('skirt-floral-long-lilac', 55000, 'Lilac floral long skirt'),
  ('skirt-solid-mini-black', 45000, 'Black mini skirt'),
  ('skirt-solid-mini-camel', 45000, 'Camel mini skirt'),
  ('skirt-solid-long-cream', 55000, 'Cream long skirt'),
  ('skirt-solid-long-lilac', 55000, 'Lilac long skirt'),
  ('skirt-solid-long-butter', 55000, 'Butter yellow long skirt'),
  ('skirt-denim-mini-dark', 45000, 'Dark denim mini skirt'),
  ('skirt-denim-mini-light', 45000, 'Light denim mini skirt'),
  ('skirt-denim-long-dark', 55000, 'Dark denim long skirt'),
  ('skirt-denim-long-light', 55000, 'Light denim long skirt'),
  ('skirt-stripe-mini-navy', 45000, 'Navy striped mini skirt'),
  ('skirt-stripe-mini-red', 45000, 'Red striped mini skirt'),
  ('skirt-stripe-long-black', 55000, 'Black striped long skirt'),
  ('skirt-stripe-long-mint', 55000, 'Mint striped long skirt'),
  ('skirt-leopard-mini', 45000, 'Leopard mini skirt'),
  ('skirt-leopard-long', 55000, 'Leopard long skirt'),
  ('skirt-solid-mini-neonpink', 45000, 'Neon pink mini skirt'),
  ('skirt-solid-mini-lime', 45000, 'Lime mini skirt'),
  ('skirt-pleats-mini-black', 45000, 'Black pleated mini skirt')
on conflict (item) do update set price = excluded.price, name_en = excluded.name_en;

create table if not exists public.item_grants (
  op uuid primary key default gen_random_uuid(), -- the receipt's id (as a purchase's op id)
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null,
  price bigint not null check (price > 0),
  at timestamptz not null default now(),
  unique (user_id, item)
);
alter table public.item_grants enable row level security; -- only the functions below touch it
revoke all on public.item_grants from anon, authenticated;

insert into public.item_grants (user_id, item, price)
select b.user_id, p.item, p.price
from public.saves_backup_20261111 b
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(b.data -> 'mk.items') = 'string' and (b.data ->> 'mk.items') ~ '^\[.*\]$'
       then (b.data ->> 'mk.items')::jsonb else '[]'::jsonb end) e(item)
join public.item_prices p on p.item = e.item
where exists (select 1 from auth.users u where u.id = b.user_id)
  and not exists (select 1 from public.old_clothes_refunds r where r.user_id = b.user_id and r.item = p.item)
  and not exists (select 1 from public.gift_binds g where g.to_uid = b.user_id and g.item = p.item)
  and not exists (select 1 from public.coin_ledger l where l.user_id = b.user_id and l.kind = 'spend' and l.status = 'ok'
                    and l.n = -p.price and l.note like p.name_en || ' · %' and l.note not like '%🎁%')
on conflict (user_id, item) do nothing;

-- buy_line from 036, with these receipts: what p_uid "paid" (negative).
create or replace function public.buy_line(p_uid uuid, p_ref uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select l.n from public.coin_ledger l where l.user_id = p_uid and l.op_id = p_ref and l.kind = 'spend' and l.n < 0
       and not exists (select 1 from public.gift_binds g where g.op = p_ref and g.giver = p_uid)),
    (select l.n from public.gift_binds g join public.coin_ledger l on l.user_id = g.giver and l.op_id = g.op
       where g.op = p_ref and g.to_uid = p_uid and l.kind = 'spend' and l.n < 0),
    (select -i.price from public.item_grants i where i.op = p_ref and i.user_id = p_uid));
$$;
revoke all on function public.buy_line(uuid, uuid) from public, anon, authenticated;

-- My receipts not sold yet: [{ item, op, price, restore }]. restore: the game
-- took it out after the backup (the account's save says it swept, the backup
-- doesn't, and it isn't in the save now), so it goes back in the closet.
create or replace function public.my_item_grants() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (
    select s.data as now_data, b.data as old_data
    from public.saves s left join public.saves_backup_20261111 b on b.user_id = s.user_id
    where s.user_id = auth.uid()
  )
  select coalesce(jsonb_agg(jsonb_build_object('item', i.item, 'op', i.op, 'price', i.price,
    'restore', coalesce((select coalesce((me.now_data ->> 'mk.noReceiptSweep') ~ '^[1-9]', false)
                           and me.old_data ->> 'mk.noReceiptSweep' is null
                           and position('"' || i.item || '"' in coalesce(me.now_data ->> 'mk.items', '')) = 0
                         from me), false)) order by i.item), '[]'::jsonb)
  from public.item_grants i
  where i.user_id = auth.uid()
    and not exists (select 1 from public.coin_ledger r where r.user_id = i.user_id and r.ref = i.op and r.kind = 'resell');
$$;
revoke all on function public.my_item_grants() from public, anon;
grant execute on function public.my_item_grants() to authenticated;
