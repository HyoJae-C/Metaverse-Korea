import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HighFives, HI5_WINDOW, HI5_COINS, HI5_PAID_PER_DAY, hi5Msg, parseHi5, crowdBonus } from '../src/core/together.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('a high five needs both to press within a few seconds', () => {
  let now = 1000;
  const a = new HighFives(memory(), () => 'd1', () => now);
  assert.equal(a.press('b', 'Bora'), null); // waiting for them
  now += 2000;
  assert.deepEqual(a.heard('b', 'Bora'), { coins: HI5_COINS, who: 'Bora', day: 'd1' });
  // too slow: their press arrives after the window
  a.press('c', 'Chan');
  now += HI5_WINDOW + 1;
  assert.equal(a.heard('c', 'Chan'), null);
  assert.ok(a.waiting('c'));
  assert.deepEqual(a.press('c', 'Chan'), { coins: HI5_COINS, who: 'Chan', day: 'd1' }); // pressing back now works
});

test('coins once per person a day, a few people a day', () => {
  let day = 'd1';
  const st = memory();
  const a = new HighFives(st, () => day, () => 0);
  a.press('b', 'Bora');
  assert.equal(a.heard('b', 'Bora').coins, HI5_COINS);
  a.press('b2', 'Bora'); // same person, rejoined
  assert.equal(a.heard('b2', 'Bora').coins, 0);
  for (let i = 0; i < HI5_PAID_PER_DAY + 2; i++) { a.press('p' + i); a.heard('p' + i); }
  assert.equal(new HighFives(st, () => day).s.with.length, HI5_PAID_PER_DAY);
  day = 'd2';
  a.press('b', 'Bora');
  assert.equal(a.heard('b', 'Bora').coins, HI5_COINS);
});

test('messages, together and crowd bonuses', () => {
  assert.equal(parseHi5(hi5Msg('abc-1')), 'abc-1');
  assert.equal(parseHi5('tandem:invite:x'), null);
  assert.equal(crowdBonus(0), 0);
  assert.equal(crowdBonus(3), 6000);
  assert.equal(crowdBonus(40), 10000);
});
