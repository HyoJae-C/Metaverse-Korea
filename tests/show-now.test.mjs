// Operators' "/드론쇼": one extra drone show on top of the timetable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setExtraShow, showStarts, DRONES, FIREWORKS, droneNumber, cycleNumber } from '../src/core/show-clock.js';
import { droneShowAt, nextDroneShow, LIFT_SECONDS, SHOW_SECONDS } from '../src/core/drone-show.js';
import { applyShowNow } from '../src/core/show-now.js';

const NOW = Date.parse('2026-11-20T14:35:00Z'); // 23:35 KST, just after that night's show

test('an extra start makes the drone show run from lift-off now', () => {
  assert.equal(droneShowAt(NOW), null);
  const start = NOW + LIFT_SECONDS * 1000;
  applyShowNow({ season: 'default', drone_at: new Date(start).toISOString() });
  const s = droneShowAt(NOW);
  assert.equal(s.start, start);
  assert.equal(s.on, true);
  assert.equal(droneShowAt(start + SHOW_SECONDS * 500).start, start);
  assert.equal(nextDroneShow(NOW), start);
  assert.ok(!showStarts(NOW, FIREWORKS).includes(start)); // only the drones
  const all = showStarts(NOW, DRONES);
  assert.deepEqual(all, [...all].sort((a, b) => a - b));
  applyShowNow({ drone_at: null });
  assert.equal(droneShowAt(NOW), null);
  applyShowNow({ season: 'default' }); // an old server without the column: no change
  assert.equal(droneShowAt(NOW), null);
  setExtraShow(DRONES, null);
});

test('drone numbers of the regular shows stay the same', () => {
  const n = cycleNumber(Date.parse('2026-11-20T14:10:00Z')); // a regular drone night
  const before = droneNumber(n - 16), here = droneNumber(n);
  assert.equal(here, before + 1);
  assert.equal(droneNumber(n + 1), here + 1); // an extra in a quiet cycle counts as the next one
});
