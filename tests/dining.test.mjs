import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coinPrice, isDining, takeoutKind, Meal, FOOD_BITES, SERVE_MS } from '../src/core/dining.js';
import { cleanEntry } from '../src/core/bag.js';

test('menu prices: 1 coin per 1,000 won, rounded, at least 1', () => {
  assert.equal(coinPrice(6500), 7);
  assert.equal(coinPrice(4000), 4);
  assert.equal(coinPrice(4400), 4);
  assert.equal(coinPrice(300), 1);
  assert.equal(coinPrice(18000), 18);
});

test('which restaurants use the menu', () => {
  assert.ok(isDining({ category: 'restaurant', products: [{}] }));
  assert.ok(!isDining({ category: 'restaurant', workshop: 'pocha', products: [{}] }));
  assert.ok(!isDining({ category: 'cafe', products: [{}] }));
  assert.ok(!isDining({ category: 'restaurant', products: [] }));
});

test('takeout: drinks as a cup, food as a box', () => {
  assert.equal(takeoutKind({ model: 'cup' }), 'coffee');
  assert.equal(takeoutKind({ model: 'bowl' }), 'food');
});

test('a dish is served after a few seconds and eaten in 5 bites', () => {
  const m = new Meal({}, { id: 'x' }, 1000);
  assert.ok(!m.ready(1000));
  assert.equal(m.bite(1500), FOOD_BITES); // not on the table yet
  const t = 1000 + SERVE_MS;
  assert.ok(m.ready(t));
  for (let i = FOOD_BITES - 1; i >= 0; i--) assert.equal(m.bite(t), i);
  assert.equal(m.bite(t), 0);
});

test('the bag keeps a takeout box', () => {
  assert.deepEqual(cleanEntry({ kind: 'food', sips: 9, name: 'Pho' }), { kind: 'food', sips: 5, name: 'Pho' });
  assert.equal(cleanEntry({ kind: 'food', sips: 0 }), null);
});

test('a served dish syncs as seat.product.bites and parses back', async () => {
  const { Meal, mealSync, parseMealSync, FOOD_BITES } = await import('../src/core/dining.js');
  const seats = [{ plate: [0, 0] }, { plate: [1, 0] }, { x: 0 }];
  const products = [{ id: 'a' }, { id: 'b' }];
  const meal = new Meal(seats[1], products[1], 0);
  assert.equal(mealSync(meal, seats, products), `1.1.${FOOD_BITES}`);
  const back = parseMealSync(mealSync(meal, seats, products), seats, products);
  assert.equal(back.seat, seats[1]);
  assert.equal(back.product, products[1]);
  assert.equal(back.bites, FOOD_BITES);
  assert.equal(parseMealSync('2.0.3', seats, products), null); // seat with no plate
  assert.equal(parseMealSync('0.9.3', seats, products), null); // no such dish
  assert.equal(parseMealSync('0.0.0', seats, products), null); // eaten up
  assert.equal(parseMealSync('<b>', seats, products), null);
  assert.equal(mealSync(null, seats, products), undefined);
});

test('bite messages name the dish owner', async () => {
  const { biteMsg, parseBite } = await import('../src/core/dining.js');
  assert.equal(parseBite(biteMsg('abc-12')), 'abc-12');
  assert.equal(parseBite('bite:'), null);
  assert.equal(parseBite('hi5:abc'), null);
});
