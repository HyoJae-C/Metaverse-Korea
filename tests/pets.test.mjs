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
  assert.equal(ITEMS['pet-poodle'].price, 400000); // ~₩400,000
  assert.ok(ITEMS['pet-maltese'].price > 48000 * 5); // a puppy is far more than a perfume (₩48,000)
  assert.ok(FINE >= 30000 && FINE < Math.min(...prices));
  for (const r of [0, 0.5, 0.999]) {
    const d = nextPoopAt(() => r);
    assert.ok(d >= POOP_EVERY[0] && d <= POOP_EVERY[1]);
  }
});

test('pets have adoption fees (old ones too, for owners); the monkey comes from a code', async () => {
  for (const id of ['pet-maltese', 'pet-poodle', 'pet-shiba', 'pet-cheesecat', 'pet-bluecat', 'pet-chinchilla', 'pet-guineapig']) assert.ok(isPet(id) && ITEMS[id].price > 0, id);
  for (const id of ['pet-monkey']) assert.ok(isPet(id) && !ITEMS[id].price, id);
  assert.equal(await redeemCode('pets'), null);
  for (const it of Object.values(ITEMS)) if (it.pet) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(it.name[l] && it.desc[l]);
});

test('dogs and cats are adopted at animal cafés, not sold on shelves', async () => {
  const { readFileSync } = await import('node:fs');
  const { BREEDS } = await import('../src/core/pets.js');
  const { stores } = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url)));
  // No animal sits on a display table anywhere.
  for (const s of stores) for (const p of s.products || []) assert.ok(!String(p.model).startsWith('pet:'), `${s.id} ${p.id}`);
  const adopt = (id) => stores.find((s) => s.id === id).adopt.map((a) => a.pet);
  assert.deepEqual(adopt('mungnyang-petshop'), ['pet-maltese', 'pet-poodle']);
  assert.deepEqual(adopt('nyang-cat-cafe'), ['pet-cheesecat', 'pet-bluecat']);
  for (const id of [...adopt('mungnyang-petshop'), ...adopt('nyang-cat-cafe')]) assert.ok(ITEMS[id].price > 0, id);
  assert.deepEqual(adopt('mungnyang-petshop').map((id) => ITEMS[id].pet.kind), ['dog', 'dog']);
  assert.deepEqual(adopt('nyang-cat-cafe').map((id) => ITEMS[id].pet.kind), ['cat', 'cat']);
  // The old pet shop is now a retriever café: two retrievers a bit bigger than the small dogs.
  const shop = stores.find((s) => s.id === 'mungnyang-petshop');
  assert.equal(shop.category, 'cafe');
  assert.equal(shop.pets, 'retrievers');
  assert.equal(BREEDS.retrievers.length, 2);
  for (const r of BREEDS.retrievers) assert.ok(r.scale > ITEMS['pet-maltese'].pet.scale && r.scale < 1.6, r.name);
  // Taken off sale, but pets players already own (or get by code) still exist.
  for (const id of ['pet-shiba', 'pet-chinchilla', 'pet-guineapig']) assert.ok(isPet(id), id);
});
