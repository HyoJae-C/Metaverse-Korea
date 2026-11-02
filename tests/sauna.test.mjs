import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaunaLog, DAILY_ROUNDS, HOT_PAY, COMBO_PAY, COMBO_WINDOW } from '../src/core/sauna.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('kiln pays a few rounds a day, then nothing', () => {
  let t = new Date(2026, 10, 2, 10).getTime();
  const log = new SaunaLog(memory(), () => new Date(t));
  for (let i = 0; i < DAILY_ROUNDS; i++) assert.equal(log.finishHot(), HOT_PAY);
  assert.equal(log.finishHot(), 0);
  assert.equal(log.left, 0);
  t += 24 * 3600 * 1000; // next day
  assert.equal(log.left, DAILY_ROUNDS);
});

test('ice room bonus only right after a paid kiln session', () => {
  let t = new Date(2026, 10, 2, 10).getTime();
  const log = new SaunaLog(memory(), () => new Date(t));
  assert.deepEqual(log.finishIce(), { combo: false, coins: 0 });
  log.finishHot();
  t += 30 * 1000;
  assert.deepEqual(log.finishIce(), { combo: true, coins: COMBO_PAY });
  assert.deepEqual(log.finishIce(), { combo: false, coins: 0 }); // once per kiln
  log.finishHot();
  t += (COMBO_WINDOW + 1) * 1000;
  assert.equal(log.finishIce().combo, false);
});
