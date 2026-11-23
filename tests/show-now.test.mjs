// Operators' "/드론쇼": one extra drone show on top of the timetable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setExtraShow, showStarts, DRONES, FIREWORKS, droneNumber, cycleNumber } from '../src/core/show-clock.js';
import { droneShowAt, nextDroneShow, LIFT_SECONDS, SHOW_SECONDS } from '../src/core/drone-show.js';
import { applyShowNow } from '../src/core/show-now.js';
import { fireworksAt } from '../src/core/fireworks-show.js';
import { showAt } from '../src/core/sky-deck.js';

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
  assert.equal(droneNumber(n + 1), here); // an extra in a quiet cycle repeats the show before it
  assert.equal(droneNumber(n + 15), here); // still that one the night before the next regular show
  assert.equal(droneNumber(n + 16), here + 1); // the next regular show gets its own turn
});

test('an extra fireworks start, and Modu Sky sees both', () => {
  assert.equal(fireworksAt(NOW), null);
  const start = NOW + 180e3;
  applyShowNow({ fireworks_at: new Date(start).toISOString() });
  assert.equal(fireworksAt(NOW).start, start);
  assert.ok(fireworksAt(NOW).night > 0 || fireworksAt(NOW + 60e3).night > 0);
  assert.equal(showAt(start + 10e3).kind, FIREWORKS);
  assert.equal(droneShowAt(NOW), null); // the drones are left alone
  applyShowNow({ fireworks_at: null });
  assert.equal(fireworksAt(NOW), null);
  // regular shows still show on the deck: 2026-11-20 23:10 KST was a drone night
  assert.equal(showAt(Date.parse('2026-11-20T14:15:00Z')).kind, DRONES);
});
