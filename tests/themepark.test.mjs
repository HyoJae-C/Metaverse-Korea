import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatAt, RIDES, rideUntil } from '../src/core/themepark.js';

test('carousel horses go round at their ring and bob only while it turns', async () => {
  const { horseSpot, carouselPace, RIDE_CYCLE } = await import('../src/core/park-rides.js');
  const R = RIDES.carousel, c = RIDE_CYCLE.carousel, len = c.load + c.run + c.stop;
  const t0 = len * 1000; // a cycle's start
  for (const i of [0, 9]) {
    const r = horseSpot(i).r;
    for (let t = t0; t < t0 + len; t += 0.5) { const s = seatAt('carousel', i, t); assert.ok(Math.abs(Math.hypot(s.x - R.x, s.z - R.z) - r) < 1e-6); }
  }
  // Still while loading, turning in the run, still again at the end.
  const at = (t) => seatAt('carousel', 0, t);
  assert.equal(at(t0 + 1).x.toFixed(6), at(t0 + c.load - 0.1).x.toFixed(6));
  assert.equal(carouselPace(t0 + 2), 0);
  assert.ok(carouselPace(t0 + c.load + 10) === 1);
  assert.notEqual(at(t0 + c.load + 5).x.toFixed(3), at(t0 + c.load + 8).x.toFixed(3));
  assert.equal(at(t0 + c.load + c.run + 0.5).x.toFixed(6), at(t0 + len - 0.1).x.toFixed(6));
  // The angle carries on smoothly from one cycle to the next.
  assert.ok(Math.abs(at(t0 + len - 0.001).x - at(t0 + len + 0.001).x) < 1e-3);
});

test('the pirate ship: board while it loads, the bars come down, it swings and stops', async () => {
  const { RIDE_CYCLE, canBoard, barDown, vikingAngle, ridePhase } = await import('../src/core/park-rides.js');
  const c = RIDE_CYCLE.viking, len = c.load + c.run + c.stop, t0 = len * 2000;
  assert.ok(canBoard('viking', t0 + 1));
  assert.ok(!canBoard('viking', t0 + c.load - 0.5), 'not as the bars come down');
  assert.ok(!canBoard('viking', t0 + c.load + 3), 'not while it swings');
  assert.equal(barDown('viking', t0 + 2), 0);
  assert.equal(barDown('viking', t0 + c.load), 1);
  assert.equal(barDown('viking', t0 + len - 0.2), 0, 'up again after it stops');
  let hi = 0;
  for (let t = t0; t < t0 + len; t += 0.05) hi = Math.max(hi, Math.abs(vikingAngle(t)));
  assert.ok(hi > 1.1, `swings high (${hi})`);
  assert.equal(vikingAngle(t0 + 3), 0);
  assert.ok(Math.abs(vikingAngle(t0 + c.load + c.run - 0.05)) < 0.02, 'dies down');
  // Riders face the middle of the ship, and rise and fall with it.
  assert.ok(seatAt('viking', 0, t0).ry > 0 && seatAt('viking', 7, t0).ry < 0);
  const ys = [];
  for (let t = t0 + c.load; t < t0 + c.load + c.run; t += 0.1) ys.push(seatAt('viking', 0, t).y);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 4, 'the end rows go high');
  // A ride bought while it loads ends with this cycle.
  assert.equal(rideUntil('viking', t0 + 2), t0 + c.load + c.run + 0.6);
  assert.equal(ridePhase('viking', t0 + c.load + 1).phase, 'run');
});

test('Ferris wheel cabins reach the top and come back near the ground', () => {
  let lo = Infinity, hi = -Infinity;
  for (let t = 0; t < 40; t += 0.25) { const s = seatAt('wheel', 0, t); lo = Math.min(lo, s.y); hi = Math.max(hi, s.y); }
  assert.ok(lo < 1 && lo > -0.5, `lowest ${lo}`);
  assert.ok(hi > 13, `highest ${hi}`);
});


test('the drop tower climbs to the top, holds, then drops fast', async () => {
  const { dropY, rideUntil } = await import('../src/core/themepark.js');
  const R = RIDES.drop;
  assert.equal(dropY(1), R.low);
  assert.equal(dropY(12), R.top);
  assert.ok(dropY(13.9) < R.top / 3, 'falls within a second');
  assert.ok(Math.abs(seatAt('drop', 0, 12).y - R.top) < 1e-9);
  // Board while it loads: ride this cycle; board mid-climb: wait for the next one.
  assert.equal(rideUntil('drop', 17), 32);
  assert.equal(rideUntil('drop', 20), 48);
  assert.equal(rideUntil('wheel', 5), 37);
});

test('Another Land outside: wheel and drop tower are tall, the coaster loops', async () => {
  const { WHEEL, DROP, dropHeight, COASTER, PARK_SCALE } = await import('../src/core/anotherland.js');
  assert.ok((WHEEL.hub + WHEEL.r) * PARK_SCALE > 40, 'wheel still seen over the lakeside trees and rooftops');
  assert.equal(dropHeight(12), DROP.top);
  assert.equal(dropHeight(1), DROP.low);
  assert.ok(COASTER.every(([, y]) => y >= 4), 'track stays off the ground');
});
