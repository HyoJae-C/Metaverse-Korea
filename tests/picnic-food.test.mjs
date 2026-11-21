import test from 'node:test';
import assert from 'node:assert/strict';
import { matDish, encodeFood, parseFood, nextDish, foodInBag, foodSpots, makeFood, MAT_FOOD_MAX } from '../src/core/picnic-food.js';
import { EN } from '../src/i18n/en.js';

const dish = (g, q) => ({ kind: 'gift', sips: 1, name: g, icon: '🍱', g, q });

test('only cooking-class dishes go on a mat, with their medal', () => {
  assert.deepEqual(matDish(dish('kimbap', 95)), { g: 'kimbap', m: 'g' });
  assert.deepEqual(matDish(dish('tteok', 10)), { g: 'tteok', m: 'n' });
  assert.deepEqual(matDish({ kind: 'gift', icon: '🫙', name: 'Homemade kimchi' }), { g: 'kimchi', m: matDish(dish('kimchi', 55)).m }); // an old jar
  assert.equal(matDish(dish('mat', 0)), null);
  assert.equal(matDish(dish('frisbee', 1)), null);
  assert.equal(matDish(null), null);
});

test('the mat food state round-trips and drops junk', () => {
  const f = [{ g: 'kimbap', m: 'g' }, { g: 'kimchi', m: 's' }];
  assert.equal(encodeFood(f), 'kimbap.g,kimchi.s');
  assert.deepEqual(parseFood(encodeFood(f)), f);
  assert.deepEqual(parseFood('pizza.g,kimbap.x,japchae.b'), [{ g: 'japchae', m: 'b' }]);
  assert.equal(parseFood('kimbap.g,kimbap.g,kimbap.g,kimbap.g').length, MAT_FOOD_MAX);
  assert.deepEqual(parseFood(undefined), []);
  assert.deepEqual(parseFood('x'.repeat(100)), []);
});

test('the next dish: a new kind first, best medal first, never more than the bag holds', () => {
  const bag = [dish('kimbap', 95), dish('kimbap', 40), dish('japchae', 20), { kind: 'gift', g: 'mat' }];
  const a = nextDish(bag, []);
  assert.deepEqual(a, { g: 'kimbap', m: 'g' });
  const b = nextDish(bag, [a]);
  assert.equal(b.g, 'japchae'); // a different dish before a second kimbap
  const c = nextDish(bag, [a, b]);
  assert.equal(c.g, 'kimbap');
  assert.notEqual(c.m, 'g'); // the gold one is already out
  assert.equal(nextDish(bag, [a, b, c]), null); // full
  assert.equal(nextDish([dish('kimbap', 95)], [a]), null); // nothing more in the bag
});

test('a dish that left the bag leaves the mat', () => {
  const shown = [{ g: 'kimbap', m: 'g' }, { g: 'japchae', m: 'n' }];
  assert.deepEqual(foodInBag(shown, [dish('japchae', 10)]), [{ g: 'japchae', m: 'n' }]);
  assert.deepEqual(foodInBag(shown, []), []);
});

test('dishes sit on the mat, one plate each', () => {
  for (const n of [1, 2, 3]) {
    const spots = foodSpots(n);
    assert.equal(spots.length, n);
    for (const [x, z] of spots) assert.ok(Math.abs(x) < 1.3 - 0.2 && Math.abs(z) < 1.0 - 0.2); // inside the 2.6 × 2.0 m mat
  }
  const g = makeFood([{ g: 'kimbap', m: 'g' }, { g: 'bibimbap', m: 'n' }]);
  assert.equal(g.children.length, 2);
});

test('every dish has a name', () => {
  for (const g of ['kimchi', 'japchae', 'kimbap', 'tteok', 'bibimbap']) assert.ok(EN['matFood.d.' + g]);
  for (const k of ['put', 'off', 'look', 'putDone', 'offDone', 'picnic']) assert.ok(EN['matFood.' + k]);
});

test('an upgraded dish shows its level on the mat (older clients read the first two parts)', async () => {
  const d = matDish({ kind: 'gift', sips: 1, g: 'kimbap', q: 95, lv: 12 });
  assert.deepEqual(d, { g: 'kimbap', m: 'g', lv: 12 });
  assert.equal(encodeFood([d]), 'kimbap.g.12');
  assert.deepEqual(parseFood('kimbap.g.12,kimchi.s,tteok.n.99'), [{ g: 'kimbap', m: 'g', lv: 12 }, { g: 'kimchi', m: 's' }, { g: 'tteok', m: 'n', lv: 30 }]);
  const tier = await import('../src/core/dish-tier.js');
  const g = makeFood([{ g: 'kimbap', m: 'g', lv: 12 }, { g: 'tteok', m: 'n' }], tier);
  assert.ok(g.getObjectByName('dish-tier:dalin'));
});
