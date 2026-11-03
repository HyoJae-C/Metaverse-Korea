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

test('the fine costs more than a pet, and poops are spaced out', () => {
  const prices = Object.values(ITEMS).filter((i) => i.pet && i.price).map((i) => i.price);
  assert.ok(prices.length >= 4);
  assert.ok(FINE > Math.max(...prices));
  for (const r of [0, 0.5, 0.999]) {
    const d = nextPoopAt(() => r);
    assert.ok(d >= POOP_EVERY[0] && d <= POOP_EVERY[1]);
  }
});

test('dogs and cats are for sale; chinchilla, guinea pig and monkey come from a code', async () => {
  for (const id of ['pet-maltese', 'pet-shiba', 'pet-cheesecat', 'pet-bluecat']) assert.ok(isPet(id) && ITEMS[id].price > 0, id);
  for (const id of ['pet-chinchilla', 'pet-guineapig', 'pet-monkey']) assert.ok(isPet(id) && !ITEMS[id].price, id);
  assert.equal(await redeemCode('pets'), null);
  for (const it of Object.values(ITEMS)) if (it.pet) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(it.name[l] && it.desc[l]);
});
