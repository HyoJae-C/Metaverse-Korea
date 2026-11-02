import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatAt, RIDES } from '../src/core/themepark.js';

test('carousel seats go round at a steady radius and bob', () => {
  const R = RIDES.carousel;
  const ys = new Set();
  for (let t = 0; t < 10; t += 0.5) {
    const s = seatAt('carousel', 2, t);
    assert.ok(Math.abs(Math.hypot(s.x - R.x, s.z - R.z) - R.r) < 1e-9);
    ys.add(s.y.toFixed(2));
  }
  assert.ok(ys.size > 3);
});

test('Ferris wheel cabins reach the top and come back near the ground', () => {
  let lo = Infinity, hi = -Infinity;
  for (let t = 0; t < 40; t += 0.25) { const s = seatAt('wheel', 0, t); lo = Math.min(lo, s.y); hi = Math.max(hi, s.y); }
  assert.ok(lo < 1 && lo > -0.5, `lowest ${lo}`);
  assert.ok(hi > 13, `highest ${hi}`);
});

test('the pirate ship swings wider after the start', () => {
  const swing = (from, to) => { let m = 0; for (let t = from; t < to; t += 0.05) m = Math.max(m, Math.abs(seatAt('viking', 0, t, 0).x - seatAt('viking', 0, 0, 0).x)); return m; };
  assert.ok(swing(8, 14) > swing(0, 2) * 1.5);
});
