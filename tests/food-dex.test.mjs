import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FoodDex, isFood, allFoods } from '../src/core/food-dex.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const cafe = { id: 'c', category: 'cafe', products: [{ id: 'latte', model: 'cup' }, { id: 'mug', model: 'jar' }] };
const shop = { id: 'f', category: 'fashion', products: [{ id: 'tee', model: 'tee' }] };
const bunsik = { id: 'b', category: 'restaurant', products: [{ id: 'tteok', model: 'bowl' }] };

test('only food from food shops counts', () => {
  assert.ok(isFood(cafe, cafe.products[0]));
  assert.ok(!isFood(cafe, cafe.products[1]));
  assert.ok(!isFood(shop, shop.products[0]));
  assert.deepEqual(allFoods([cafe, shop, bunsik]).map((f) => f.key), ['c/latte', 'b/tteok']);
});

test('kinds and total count, remembered', () => {
  const st = memory();
  const d = new FoodDex(st);
  assert.equal(d.add(cafe, cafe.products[0]), true);
  assert.equal(d.add(cafe, cafe.products[0], 2), false);
  d.add(bunsik, bunsik.products[0]);
  d.add(shop, shop.products[0]); // not food
  const again = new FoodDex(st);
  assert.equal(again.kinds, 2);
  assert.equal(again.total, 4);
  assert.equal(again.count('c/latte'), 3);
});
