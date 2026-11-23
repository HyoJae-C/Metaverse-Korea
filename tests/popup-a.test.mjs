import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS } from '../src/core/inventory.js';
import { TIMED_SECS } from '../src/data/wearables.js';
import { accessory } from '../src/data/appearance.js';
import pack from '../src/data/characters/kaykit2.js';
import { sellable } from '../src/core/resale.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const popA = stores.find((s) => s.id === 'popup-a');

// Yozi 2026-11-23: season goods sell at the Seongsu pop-ups; Pop-up A's
// autumn line is three fedoras, three berets and three trench coats, ₩30,000.
test('Pop-up A sells the autumn line on Yeonmujang-gil, ₩30,000 each, limited-time', () => {
  assert.ok(popA && popA.category === 'popup' && !popA.district, 'in Seongsu');
  // on Yeonmujang-gil: within 10 m of its line in map.json
  const [a, b] = [[-138.6, 8], [163, 120.7]];
  const [x, z] = popA.at;
  const d = Math.abs((x - a[0]) * (b[1] - a[1]) - (z - a[1]) * (b[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  assert.ok(d < 10, `${d.toFixed(1)} m from Yeonmujang-gil`);
  const ids = popA.products.map((p) => p.item).sort();
  assert.deepEqual(ids, ['acc-beret-burgundy', 'acc-beret-camel', 'acc-beret-olive', 'acc-fedora-beige', 'acc-fedora-brown', 'acc-fedora-charcoal', 'outfit-trench-beige', 'outfit-trench-brown', 'outfit-trench-navy']);
  for (const p of popA.products) {
    const it = ITEMS[p.item];
    assert.equal(p.price, 30000, p.id);
    assert.equal(it.price, 30000, p.id);
    assert.equal(it.secs, TIMED_SECS, p.id);
    assert.ok(p.name.ko && p.name.en && p.name.ja && p.name.zh && p.desc.ko, p.id);
  }
  assert.deepEqual(sellable(ids, ITEMS, { paid: () => 30000, get: () => ({}) }), [], 'not sold back');
});

test('the hats and coats have their shapes and colours', () => {
  for (const c of ['brown', 'beige', 'charcoal']) assert.equal(accessory('head', 'fedora-' + c)?.shape, 'fedora');
  for (const c of ['burgundy', 'camel', 'olive']) assert.equal(accessory('head', 'beret-' + c)?.shape, 'beret');
  const tops = ['beige', 'brown', 'navy'].map((c) => pack.models['trench-' + c]);
  for (const m of tops) {
    assert.ok(m, 'model');
    assert.ok(m.wear.outfit.belt && m.wear.outfit.buttons.double && m.wear.outfit.coat, 'belted, double-breasted, long');
  }
  assert.equal(new Set(tops.map((m) => m.wear.colors.top)).size, 3);
});
