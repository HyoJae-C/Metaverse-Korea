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


test('the drop tower: load, the harness comes down, a slow climb, a hold, then a fast drop', async () => {
  const { dropY, RIDE_CYCLE, barDown, canBoard } = await import('../src/core/park-rides.js');
  const R = RIDES.drop, c = RIDE_CYCLE.drop, len = c.load + c.run + c.stop, t0 = len * 3000, run = t0 + c.load;
  assert.equal(dropY(t0 + 1), R.low);
  assert.ok(canBoard('drop', t0 + 2) && !canBoard('drop', run + 1));
  assert.equal(barDown('drop', t0 + 2), 0);
  assert.equal(barDown('drop', run + 0.1), 1);
  assert.ok(dropY(run + 4) > R.low + 3 && dropY(run + 4) < R.top, 'climbing');
  assert.equal(dropY(run + 9), R.top);
  const { DROP_T, rideSpeed } = await import('../src/core/park-rides.js');
  assert.equal(dropY(run + DROP_T.hold - 0.1), R.top, 'a long hold at the top');
  assert.ok(DROP_T.fall < 1.6 && dropY(run + DROP_T.hold + DROP_T.fall + 0.1) < R.top / 3, 'free fall: down in a second and a half');
  assert.ok(DROP_T.v > 18, `fast at the bottom (${DROP_T.v.toFixed(1)} m/s)`);
  for (let s = 0; s < c.run; s += 0.05) assert.ok(dropY(run + s) >= R.low - 1e-9, 'never below the floor');
  assert.equal(rideSpeed('drop', run + 9).phase, 'hold');
  assert.ok(rideSpeed('drop', run + DROP_T.hold + DROP_T.fall - 0.05).k > 0.9, 'top speed at the end of the fall');
  assert.ok(Math.abs(seatAt('drop', 0, run + 9).y - R.top - 0.12) < 1e-9);
  assert.equal(dropY(run + c.run + 0.5), R.low);
  assert.equal(rideUntil('drop', t0 + 2), run + c.run + 0.6);
});

test('the wheel: board the gondola at the bottom, ride one turn, held in while up', async () => {
  const { wheelBottom, wheelDoorOpen, rideLocked, RIDE_SECONDS } = await import('../src/core/park-rides.js');
  const W = RIDES.wheel;
  for (let t = 1000; t < 1040; t += 0.7) {
    const i = wheelBottom(t), s = seatAt('wheel', i * 2, t);
    if (wheelDoorOpen(i, t)) assert.ok(s.y < 1.6, `boarding low (${s.y.toFixed(2)})`);
    // One turn later the same gondola is back at the bottom.
    assert.ok(Math.abs(seatAt('wheel', i * 2, t + RIDE_SECONDS.wheel).y - s.y) < 1e-6);
  }
  let hi = 0, locked = 0, n = 0;
  for (let t = 0; t < RIDE_SECONDS.wheel; t += 0.25, n++) { hi = Math.max(hi, seatAt('wheel', 0, t).y); if (rideLocked('wheel', 0, t)) locked++; }
  assert.ok(hi > W.hub + W.r - W.drop - 0.5, `the top (${hi})`);
  assert.ok(locked / n > 0.8, 'held in most of the turn');
  assert.ok(Math.abs(seatAt('wheel', 0, 3).x - seatAt('wheel', 1, 3).x - -0.76) < 1e-9, 'two side by side');
});

test('ride guests only sit in the theme park, not in a Han River park', async () => {
  const { createParkRiders } = await import('../src/game/park-riders.js');
  const riders = createParkRiders(null);
  const hanPark = { hanRiver: true, rides: [{ kind: 'viking' }], scene: { add() { throw new Error('no guests here'); } } };
  assert.equal(riders.spawn(hanPark) ?? null, null);
  assert.equal(hanPark.riderNpcs, undefined);
});

test('Modu Land and the Han River parks have their own flags, no shared `park`', async () => {
  const { readFileSync } = await import('node:fs');
  const src = (f) => readFileSync(new URL('../src/core/' + f, import.meta.url), 'utf8');
  assert.match(src('themepark.js'), /themepark: true/);
  assert.doesNotMatch(src('park.js'), /themepark/);
  assert.match(src('park.js'), /hanRiver: true/);
  for (const f of ['themepark.js', 'park.js']) assert.doesNotMatch(src(f), /\bpark: true/, f);
  // Theme-park-only code keys on `themepark`, never on a park flag.
  assert.doesNotMatch(readFileSync(new URL('../src/game/park-riders.js', import.meta.url), 'utf8'), /\.park\b/);
});

// Seokchon Lake is at the real 1/4 scale like the rest of Seoul: the real
// lakes hold 217,850 m2 of water, so 1/16 of it here. Modu Land's island
// (stores.json "open", in the coaster's metres) lies on the map's island,
// its bridge landing on Modu Land Bridge.
test('Seokchon Lake: real 1/4 water, Modu Land open on its island', async () => {
  const { readFileSync } = await import('node:fs');
  const { inPoly } = await import('../src/core/geom.js');
  const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
  const map = read('districts/songpa.json'), stores = read('stores.json').stores;
  const area = (p) => Math.abs(p.reduce((s, [x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; return s + x * z2 - x2 * z; }, 0)) / 2;
  const water = map.areas.filter((a) => a.k === 'water' && a.sunk);
  const lake = water.reduce((s, a) => s + area(a.p), 0);
  assert.ok(Math.abs(lake / (217850 / 16) - 1) < 0.05, `lake water ${Math.round(lake)} m2`);
  // The island in the street's metres (as main.js parkWorld turns it).
  const isl = stores.find((s) => s.id === 'another-land-island'), { at: [ox, oz], ry } = isl.open;
  const [sx, sz] = read('region.json').districts.find((d) => d.id === 'songpa').offset;
  const world = ([x, z]) => [ox + x * Math.cos(ry) + z * Math.sin(ry) - sx, oz - x * Math.sin(ry) + z * Math.cos(ry) - sz];
  const lawn = isl.open.lawn.map(world);
  // Not over the water: a step in from each corner and each edge's middle is dry.
  const cx = lawn.reduce((s, [x]) => s + x, 0) / lawn.length, cz = lawn.reduce((s, [, z]) => s + z, 0) / lawn.length;
  for (let i = 0; i < lawn.length; i++) {
    const [x1, z1] = lawn[i], [x2, z2] = lawn[(i + 1) % lawn.length];
    for (const [x, z] of [[x1, z1], [(x1 + x2) / 2, (z1 + z2) / 2]]) {
      const d = Math.hypot(cx - x, cz - z), px = x + ((cx - x) / d) * 1.2, pz = z + ((cz - z) / d) * 1.2;
      assert.ok(!water.some((a) => inPoly(px, pz, a.p)), `island dry at ${px.toFixed(1)},${pz.toFixed(1)}`);
    }
  }
  // And it fills its island: a step out from the shore is water.
  let wet = 0;
  for (const [x, z] of lawn) { const d = Math.hypot(x - cx, z - cz); if (water.some((a) => inPoly(x + ((x - cx) / d) * 3, z + ((z - cz) / d) * 3, a.p))) wet++; }
  assert.ok(wet / lawn.length > 0.8, `water round the island (${wet}/${lawn.length})`);
  // The bridge lands on it: Modu Land Bridge's end is at the gap in the shore.
  const road = map.roads.find((r) => r.n?.en === 'Modu Land Bridge');
  assert.ok(road, 'Modu Land Bridge');
  const [bx, bz] = world(isl.open.bridge);
  const ends = [road.p[0], road.p[road.p.length - 1]];
  assert.ok(ends.some(([x, z]) => Math.hypot(x - bx, z - bz) < 4), `bridge lands at ${bx.toFixed(1)},${bz.toFixed(1)}`);
  // The stairs down are on the island, and the rides' room under it is entered there.
  const under = stores.find((s) => s.below === isl.id);
  assert.ok(under && under.id === 'another-land');
  const [ux, uz] = [under.at[0] - sx, under.at[1] - sz];
  assert.ok(inPoly(ux, uz, lawn), 'the stairs down are on the island');
});
