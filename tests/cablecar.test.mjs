import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABLE, cabinAt, doorsOpen, arrivesIn, cableLine, CABIN_S, CABIN_ROPE } from '../src/core/cablecar.js';

test('the two cabins are always at opposite ends', () => {
  for (let t = 0; t < CABLE.cycle * 2; t += 0.5) {
    const a = cabinAt(0, t), b = cabinAt(1, t);
    assert.ok(Math.abs(a.k + b.k - 1) < 1e-9, `t=${t}`);
    if (a.at) assert.equal(b.at, a.at === 'low' ? 'top' : 'low');
  }
});

test('a cabin waits, climbs, waits at the top and comes back', () => {
  assert.deepEqual([cabinAt(0, 1).at, cabinAt(0, 1).k], ['low', 0]);
  const mid = cabinAt(0, CABLE.dwell + CABLE.trip / 2);
  assert.equal(mid.at, null);
  assert.ok(Math.abs(mid.k - 0.5) < 1e-9);
  assert.equal(cabinAt(0, CABLE.half + 1).at, 'top');
  assert.equal(cabinAt(0, CABLE.cycle + 1).at, 'low');
});

test('doors close just before leaving', () => {
  assert.ok(doorsOpen(cabinAt(0, 0)));
  assert.ok(!doorsOpen(cabinAt(0, CABLE.dwell - 0.5)));
  assert.ok(!doorsOpen(cabinAt(0, CABLE.dwell + 1)));
});

test('arrivesIn counts down to the next open doors', () => {
  assert.equal(arrivesIn(0, 'low', 2), 0);
  assert.equal(arrivesIn(0, 'top', 0), CABLE.half);
  // Cabin 1 starts at the top.
  assert.equal(arrivesIn(1, 'top', 0), 0);
  assert.equal(arrivesIn(1, 'low', 0), CABLE.half);
  // Doors just closed: wait a full cycle.
  assert.equal(arrivesIn(0, 'low', CABLE.dwell - 0.5), CABLE.cycle - CABLE.dwell + 0.5);
  for (let t = 0; t < CABLE.cycle; t += 0.7) for (const i of [0, 1]) for (const st of ['low', 'top']) {
    const w = arrivesIn(i, st, t);
    assert.ok(w >= 0 && w <= CABLE.cycle, `${i} ${st} ${t}`);
    if (w > 0) assert.equal(cabinAt(i, t + w + 0.01).at, st);
  }
});

test('a cabin hangs under its cable, from one end of the line to the other', () => {
  const l = { x: 100, z: 200, path: [[0, 0, 10, 9], [10, 20, 30, 5], [20, 40, 50, 45]] };
  const line = cableLine(l), drop = CABIN_ROPE * CABIN_S;
  for (const i of [0, 1]) {
    const lo = line.cabin(i, 0), hi = line.cabin(i, 1);
    assert.ok(Math.abs(lo.y - (10 - drop)) < 1e-9 && Math.abs(hi.y - (50 - drop)) < 1e-9);
    assert.ok(Math.hypot(lo.x - 100, lo.z - 200) < 2.01 && Math.hypot(hi.x - 120, hi.z - 240) < 2.01, 'at the stations');
    for (let k = 0.05; k <= 1; k += 0.05) assert.ok(line.cabin(i, k).y > line.cabin(i, k - 0.05).y, 'always climbing');
  }
  const a = line.cabin(0, 0.5), b = line.cabin(1, 0.5);
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - 4) < 1e-9, 'two cables 4 m apart');
});
