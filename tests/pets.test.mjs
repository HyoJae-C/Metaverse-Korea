import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PoopTimers, CLEAN_SECONDS, FINE, nextPoopAt, POOP_EVERY } from '../src/core/companion.js';
import { ITEMS, isPet, redeemCode } from '../src/core/inventory.js';

test('poop cleaned in time is fine; left too long gets fined once', () => {
  const t = new PoopTimers();
  const a = t.add(), b = t.add();
  assert.equal(t.step(CLEAN_SECONDS - 1).length, 0);
  assert.equal(t.clean(a.id), true);
  const late = t.step(2);
  assert.deepEqual(late.map((p) => p.id), [b.id]);
  assert.equal(t.step(100).length, 0); // never fined twice
});

test('pets cost real pet-shop prices, the fine stings, and poops are spaced out', () => {
  const prices = Object.values(ITEMS).filter((i) => i.pet && i.price).map((i) => i.price);
  assert.ok(prices.length >= 5);
  assert.equal(ITEMS['pet-poodle'].price, 400); // ~₩400,000
  assert.ok(ITEMS['pet-maltese'].price > 48 * 5); // a puppy is far more than a perfume (🪙 48)
  assert.ok(FINE >= 30 && FINE < Math.min(...prices));
  for (const r of [0, 0.5, 0.999]) {
    const d = nextPoopAt(() => r);
    assert.ok(d >= POOP_EVERY[0] && d <= POOP_EVERY[1]);
  }
});

test('dogs, cats, chinchilla and guinea pig are for sale; the monkey comes from a code', async () => {
  for (const id of ['pet-maltese', 'pet-poodle', 'pet-shiba', 'pet-cheesecat', 'pet-bluecat', 'pet-chinchilla', 'pet-guineapig']) assert.ok(isPet(id) && ITEMS[id].price > 0, id);
  for (const id of ['pet-monkey']) assert.ok(isPet(id) && !ITEMS[id].price, id);
  assert.equal(await redeemCode('pets'), null);
  for (const it of Object.values(ITEMS)) if (it.pet) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(it.name[l] && it.desc[l]);
});

test('the pet shop sells only two dogs and two cats; old pets still work', async () => {
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url)));
  const shop = (data.stores || data).find((s) => s.id === 'mungnyang-petshop');
  const sold = shop.products.map((p) => p.adopt);
  assert.deepEqual(sold, ['pet-maltese', 'pet-poodle', 'pet-cheesecat', 'pet-bluecat']);
  assert.deepEqual(shop.products.map((p) => p.model).sort(), ['pet:cat', 'pet:cat', 'pet:dog', 'pet:dog']);
  // Taken off sale, but pets players already own (or get by code) still exist.
  for (const id of ['pet-shiba', 'pet-chinchilla', 'pet-guineapig']) assert.ok(isPet(id), id);
});
