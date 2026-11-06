import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingredientAt, ingredientCount, canCook, chewy, RAMEN_TAPS } from '../src/core/ramen-game.js';

const pack = { kind: 'gift', name: 'Ramyeon', icon: '🍜', g: 'ramyeon' };
const egg = { kind: 'gift', name: 'Egg', icon: '🥚', g: 'egg' };

test('the machine needs a ramyeon pack from the bag; the egg is optional', () => {
  assert.equal(canCook([]), false);
  assert.equal(canCook([egg]), false);
  assert.equal(canCook([{ kind: 'umbrella' }, pack]), true);
  assert.equal(ingredientAt([{ kind: 'umbrella' }, egg, pack], 'ramyeon'), 2);
  assert.equal(ingredientAt([pack], 'egg'), -1);
  assert.equal(ingredientCount([pack, egg, pack], 'ramyeon'), 2);
});

test('cheering fills the chewiness bar, never past full', () => {
  assert.equal(chewy(0), 0);
  assert.equal(chewy(RAMEN_TAPS), 1);
  assert.equal(chewy(RAMEN_TAPS + 3), 1);
  assert.ok(chewy(2) > chewy(1));
});
