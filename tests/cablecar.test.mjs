import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABLE, CC, cabinAt, doorsOpen, arrivesIn, cabinPos, boardSpot, cableFloor } from '../src/core/cablecar.js';

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

test('cabins run between the two platforms, on the right floors', () => {
  const lo = cabinPos(0, 0), hi = cabinPos(1, 1);
  assert.equal(lo.y, 0);
  assert.equal(hi.y, CC.top);
  assert.equal(cableFloor(boardSpot(0, 'low').x, boardSpot(0, 'low').z), 0);
  assert.equal(cableFloor(boardSpot(1, 'top').x, boardSpot(1, 'top').z), CC.top);
  // Always climbing on the way up.
  for (let k = 0.05; k <= 1; k += 0.05) assert.ok(cabinPos(0, k).y > cabinPos(0, k - 0.05).y);
});
