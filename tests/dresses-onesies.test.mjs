import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import PACK from '../src/data/characters/kaykit2.js';
import { ITEMS, isWorn } from '../src/core/inventory.js';
import { sanitizeLook, DEFAULT_LOOK } from '../src/data/appearance.js';
import { skirtById, SKIRTS } from '../src/data/skirts.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
// Each kind in a shop of its own (Yozi 2026-11-20: "가게는 구분했으면").
const SHOPS = {
  'bomnal-dress': ['dress-floral-navy', 'dress-floral-yellow'],
  'pogeun-onesies': ['onesie-bear', 'onesie-bunny', 'onesie-dino'],
};

test('floral dresses and onesies: each kind sold in its own shop, at a clothes price', () => {
  for (const [sid, models] of Object.entries(SHOPS)) {
    const s = stores.find((x) => x.id === sid);
    assert.ok(s && s.category === 'fashion', sid);
    assert.deepEqual(s.products.map((p) => p.tryOn.model), models);
    for (const p of s.products) {
      const it = ITEMS[p.item];
      assert.equal(p.item, 'outfit-' + p.tryOn.model);
      assert.equal(it.price, p.price);
      assert.ok(p.price >= 40000 && p.price <= 100000, `${p.id} ₩${p.price}`);
      assert.ok(isWorn(it, sanitizeLook({ ...DEFAULT_LOOK, skirt: 'pleats-mini-navy', ...it.wear })), `${p.item} takes a skirt off`);
    }
  }
  const sold = stores.flatMap((s) => (s.products || []).map((p) => p.tryOn?.model)).filter(Boolean);
  for (const models of Object.values(SHOPS)) for (const m of models) assert.equal(sold.filter((x) => x === m).length, 1, `${m} in one shop only`);
});

test('a floral dress wears its own skirt, the top in the same print; never a skirt you buy alone', () => {
  for (const id of SHOPS['bomnal-dress']) {
    assert.equal(PACK.models[id].skirt, id);
    assert.equal(PACK.models[id].wear.outfit.print, true);
    assert.equal(skirtById(id).pattern, 'floral');
    assert.ok(skirtById(id), id);
    assert.ok(!Object.hasOwn(SKIRTS, id));
    assert.equal(PACK.models[id].url, PACK.models.basic.url, 'keeps your face');
  }
});

test('onesies: a hood with ears and one colour top to bottom', () => {
  for (const id of SHOPS['pogeun-onesies']) {
    const m = PACK.models[id];
    assert.ok(m.hood && m.ears && m.url.endsWith('rogue_hooded.glb'), id);
    assert.equal(m.wear.colors.top, m.wear.colors.bottom);
  }
});
