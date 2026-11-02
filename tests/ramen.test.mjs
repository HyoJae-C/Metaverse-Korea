import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ramenScore, noodleState, potClock, COOK_TARGET } from '../src/core/ramen-game.js';
import { medalFor } from '../src/core/grill-game.js';

test('perfect ramen gets gold; mistakes lower the medal', () => {
  const ok = { boiled: true, soup: true, cook: COOK_TARGET };
  assert.equal(medalFor(ramenScore(ok)), 'gold');
  assert.equal(medalFor(ramenScore({ ...ok, cook: COOK_TARGET + 0.5 })), 'silver');
  assert.equal(medalFor(ramenScore({ ...ok, boiled: false })), 'bronze');
  assert.equal(medalFor(ramenScore({ ...ok, soup: false, boiled: false })), null);
  assert.equal(medalFor(ramenScore({ ...ok, cook: 7 })), null);
  assert.ok(ramenScore({ ...ok, cook: COOK_TARGET + 0.3, toppings: 2 }) > ramenScore({ ...ok, cook: COOK_TARGET + 0.3 }));
  assert.equal(ramenScore({ ...ok, toppings: 2 }), 100);
});

test('noodle state and the pot clock', () => {
  assert.equal(noodleState(2), 'firm');
  assert.equal(noodleState(4.2), 'perfect');
  assert.equal(noodleState(5.5), 'soggy');
  assert.equal(potClock(4.5), '4:30');
  assert.equal(potClock(0), '0:00');
});
