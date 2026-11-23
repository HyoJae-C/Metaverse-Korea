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
// autumn line is newsboy caps, flat caps and trench coats in beige, brown and
// navy, ₩30,000.
test('Pop-up A sells the autumn line on Yeonmujang-gil, ₩30,000 each, limited-time', () => {
  assert.ok(popA && popA.category === 'popup' && !popA.district, 'in Seongsu');
  // on Yeonmujang-gil: within 10 m of its line in map.json
  const [a, b] = [[-138.6, 8], [163, 120.7]];
  const [x, z] = popA.at;
  const d = Math.abs((x - a[0]) * (b[1] - a[1]) - (z - a[1]) * (b[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  assert.ok(d < 10, `${d.toFixed(1)} m from Yeonmujang-gil`);
  const ids = popA.products.map((p) => p.item).sort();
  assert.deepEqual(ids, ['acc-flatcap-beige', 'acc-flatcap-brown', 'acc-flatcap-navy', 'acc-newsboy-beige', 'acc-newsboy-brown', 'acc-newsboy-navy', 'outfit-trench-beige', 'outfit-trench-brown', 'outfit-trench-navy']);
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
  const tops = ['beige', 'brown', 'navy'].map((c) => pack.models['trench-' + c]);
  // the hats come in the coats' colours (Yozi 2026-11-23)
  for (const [i, c] of ['beige', 'brown', 'navy'].entries()) {
    for (const shape of ['newsboy', 'flatcap']) {
      const a = accessory('head', `${shape}-${c}`);
      assert.equal(a?.shape, shape);
      assert.equal(a.color, tops[i].wear.colors.top, `${shape}-${c}`);
    }
  }
  for (const m of tops) {
    assert.ok(m, 'model');
    assert.ok(m.wear.outfit.belt && m.wear.outfit.buttons.double && m.wear.outfit.coat, 'belted, double-breasted, long');
  }
  assert.equal(new Set(tops.map((m) => m.wear.colors.top)).size, 3);
});
