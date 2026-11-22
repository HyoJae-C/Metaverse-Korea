import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CookPairs, COOK_PAID_PER_DAY, TOGETHER_COINS } from '../src/core/together.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('cooking together pays each person once a day, up to 5 people', () => {
  let day = 'Sun';
  const st = mem();
  const p = new CookPairs(st, () => day);
  const a = p.cooked('Mina');
  assert.deepEqual([a.coins, a.first], [TOGETHER_COINS.cook, true]);
  const again = p.cooked('Mina');
  assert.deepEqual([again.coins, again.first], [0, false], 'the same person again: nothing');
  for (const n of ['B', 'C', 'D', 'E']) assert.equal(p.cooked(n).coins, TOGETHER_COINS.cook);
  assert.equal(COOK_PAID_PER_DAY, 5);
  assert.equal(p.cooked('F').coins, 0, 'a sixth person: nothing');
  assert.equal(new CookPairs(st, () => day).cooked('Mina').coins, 0, 'kept after a reload');
  day = 'Mon';
  const next = p.cooked('Mina');
  assert.deepEqual([next.coins, next.first], [TOGETHER_COINS.cook, true], 'a new day');
});
