import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isFood } from '../src/core/food-dex.js';

const data = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url)));
const park = data.stores.find((s) => s.id === 'ttukseom-hangang');

test('the Han River park has a market with stalls and goods', () => {
  const { market, products } = park;
  assert.ok(market.name.ko && market.name.en);
  assert.ok(market.stalls.length >= 4 && market.stalls.length <= 6, 'six stall spots in the park');
  const ids = new Set(market.stalls.map((s) => s.id));
  assert.equal(ids.size, market.stalls.length);
  for (const st of market.stalls) {
    assert.ok(st.name.ko && st.name.en, st.id);
    const goods = products.filter((p) => p.stall === st.id);
    assert.ok(goods.length >= 1 && goods.length <= 2, `${st.id}: one or two kinds on the counter`);
  }
  for (const p of products) {
    assert.ok(ids.has(p.stall), `${p.id} belongs to a stall`);
    assert.ok(p.price > 0 && p.name.en && p.name.ko && p.desc.en, p.id);
  }
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
});

test('market food goes in the food dex', () => {
  const food = park.products.filter((p) => isFood(park, p));
  assert.ok(food.length >= 8);
  assert.ok(!isFood(park, park.products.find((p) => p.model === 'tote')));
});
