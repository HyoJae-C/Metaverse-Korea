import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DayPasses, DAY_PASS } from '../src/core/day-pass.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const purse = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } });

test('the jjimjilbang and the pool charge once a day at the door', () => {
  let day = new Date(2026, 10, 8, 10);
  const st = memory();
  const p = new DayPasses(st, () => day);
  const w = purse(20000);
  const sauna = { workshop: 'sauna' }, pool = { workshop: 'pool' }, cafe = { category: 'cafe' };
  assert.equal(p.feeFor(cafe), 0);
  assert.ok(p.enter(cafe, w));
  assert.ok(p.enter(sauna, w));
  assert.equal(w.coins, 20000 - DAY_PASS.sauna);
  assert.ok(new DayPasses(st, () => day).enter(sauna, w), 'back in later the same day');
  assert.equal(w.coins, 20000 - DAY_PASS.sauna);
  assert.equal(p.enter(pool, purse(1000)), false, 'not enough money: stays outside');
  day = new Date(2026, 10, 9, 10);
  assert.equal(p.feeFor(sauna), DAY_PASS.sauna, 'a new day needs a new pass');
});

test('the ride-all pass lasts 24 hours from buying, past midnight', async () => {
  let now = new Date(2026, 10, 10, 23, 0);
  const st = memory();
  const p = new DayPasses(st, () => now);
  assert.ok(p.buy('rides', 20000, purse(20000)));
  now = new Date(2026, 10, 11, 22, 59);
  assert.ok(new DayPasses(st, () => now).has('rides'), 'still good the next evening');
  now = new Date(2026, 10, 11, 23, 1);
  assert.equal(p.has('rides'), false, 'gone after 24 hours');
  st.setItem('mk.daypass', JSON.stringify({ rides: '2026-11-11' }));
  assert.ok(new DayPasses(st, () => now).has('rides'), 'one saved as a day still lasts that day');
});
