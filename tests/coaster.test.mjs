import { test } from 'node:test';
import assert from 'node:assert/strict';

// The park's builders draw signs on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const C = await import('../src/core/coaster.js');
const { buildThemePark, RIDES, RIDE_PRICE, RIDE_PASS } = await import('../src/core/themepark.js');
const { ROOM_SIZES, exitOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { BUMPER_COST } = await import('../src/core/bumper-cars.js');
const { DayPasses } = await import('../src/core/day-pass.js');

const { readFileSync } = await import('node:fs');
const { inPoly } = await import('../src/core/geom.js');

// The rides under the island (the "another-land" room)...
const room = ROOM_SIZES.themepark, box = roomBox(room);
const park = buildThemePark({}, room, exitOf(room));
const col = new CollisionMap(park.colliders);
// ...and the island in Seokchon Lake with the coaster on it, open to the street.
const STORES = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const islandStore = STORES.find((s) => s.id === 'another-land-island');
const iRoom = ROOM_SIZES.island, iBox = roomBox(iRoom);
const island = buildThemePark(islandStore, iRoom, exitOf(iRoom));
const iCol = new CollisionMap(island.colliders);
const R = 0.35;
function reachable(a, b, step = 0.5, { col: c = col, box: bx = box } = {}) {
  const col = c, box = bx;
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const seen = new Set([key(a.x, a.z)]), q = [[a.x, a.z]];
  while (q.length) {
    const [x, z] = q.shift();
    if (Math.hypot(x - b.x, z - b.z) < 0.7) return true;
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < box.x0 + 0.5 || nx > box.x1 - 0.5 || nz < box.z0 + 0.5 || nz > box.z1 - 0.5 || seen.has(key(nx, nz)) || col.blocked(nx, nz, R)) continue;
      seen.add(key(nx, nz));
      q.push([nx, nz]);
    }
  }
  return false;
}

test('one lap is a minute: board, lift, two seconds stopped at the top, drop, home', () => {
  const P = C.PHASES;
  assert.equal(P.board, 0);
  assert.ok(Math.abs(P.depart - C.BOARD_S) < 0.05);
  const lift = P.hold - P.lift;
  assert.ok(lift > 12 && lift < 18, `lift ${lift.toFixed(1)} s`);
  assert.ok(Math.abs(P.drop - P.hold - C.HOLD_S) < 0.05, 'stopped 2 s at the top');
  assert.ok(P.unload > 48 && P.unload < C.CYCLE - 2, `back at ${P.unload.toFixed(1)} s`);
  // Stopped at the top with the front car past the crest, looking down.
  const top = C.trainAt(P.hold + 1, 0);
  assert.equal(top.v, 0);
  assert.ok(C.heightAt(top.s) < C.TOP_Y && C.heightAt(top.s + 3) < C.heightAt(top.s), 'front over the edge');
  assert.ok(C.TOP_Y > 17 && C.TOP_Y < 20);
});

test('the first drop reaches about 65 km/h, and it never stalls', () => {
  assert.ok(C.TOP_SPEED * 3.6 > 58 && C.TOP_SPEED * 3.6 < 75, `${(C.TOP_SPEED * 3.6).toFixed(0)} km/h`);
  // The fastest moment is right after the first drop.
  let best = 0, at = 0;
  for (let t = 0; t < C.CYCLE; t += 0.05) { const r = C.trainAt(t); if (r.v > best) { best = r.v; at = t; } }
  assert.ok(at > C.PHASES.drop && at < C.PHASES.drop + 8, `fastest at ${at.toFixed(1)} s`);
  for (let t = C.PHASES.drop + 0.5; t < C.PHASES.brake; t += 0.1) assert.ok(C.trainAt(t).v >= 2, `rolling at ${t.toFixed(1)}`);
  // Stopped in the station to get on and off.
  assert.equal(C.trainAt(2).v, 0);
  assert.ok(Math.abs(C.trainAt(2).s - C.S_STOP) < 1e-6);
  assert.ok(Math.abs(C.trainAt(C.CYCLE - 1).s - C.S_STOP) < 0.1);
});

test('two trains on the shared clock, never in the same place', () => {
  for (let t = 0; t < 120; t += 0.25) {
    const a = C.trainAt(t, 0).s, b = C.trainAt(t, 1).s;
    const gap = Math.min(Math.abs(a - b), C.LENGTH - Math.abs(a - b));
    assert.ok(gap > 10, `trains ${gap.toFixed(1)} m apart at ${t}`);
  }
  // Somebody is always about to board: never more than half a lap to wait.
  for (let t = 0; t < 120; t += 0.5) {
    const b = C.boarding(t);
    assert.ok(b.train >= 0 || (b.wait > 0 && b.wait <= C.CYCLE / C.TRAINS), `wait ${b.wait} at ${t}`);
  }
  assert.equal(C.boarding(1).train, 0);
  assert.equal(C.boarding(31).train, 1);
  assert.ok(Math.abs(C.rideEnds(1, 0) - (C.PHASES.unload + 0.6)) < 1e-6);
});

test('the track stays on the island, off the ground, and clear of itself', () => {
  const pts = C.trackPoints();
  const { lawn } = islandStore.open;
  for (const p of pts) {
    assert.ok(p.x > iBox.x0 + 1 && p.x < iBox.x1 - 1 && p.z > iBox.z0 + 1 && p.z < iBox.z1 - 1, `in the room ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    // (and over the island's land, a metre in from its shore all round)
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(inPoly(p.x + dx, p.z + dz, lawn), `on the island ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    assert.ok(p.y > 0.3);
  }
  for (let i = 0; i < pts.length; i += 4) for (let j = i + 80; j < pts.length; j += 4) {
    if (pts.length - j + i < 80) continue;
    const a = pts[i], b = pts[j];
    if (Math.hypot(a.x - b.x, a.z - b.z) < 2.5) assert.ok(Math.abs(a.y - b.y) > 3, `crossing at ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
  }
});

test('the coaster keeps clear of the stairs down, and its helix is tucked inside the island', () => {
  const pts = C.trackPoints();
  const { stairs } = islandStore.open;
  for (const p of pts) assert.ok(Math.hypot(p.x - stairs.x, p.z - stairs.z) > 6, `stairs pavilion at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  // (the helix sits south of the long run, east of the station: the track
  // reaches no further east than the island's old north tip)
  assert.ok(Math.max(...pts.map((p) => p.x)) < 0, 'no wider than it needs to be');
});

test('from the bridge you walk to the platform and to the stairs down; the shore holds you in', () => {
  const on = { col: iCol, box: iBox };
  const bridge = { x: island.exit.x, z: island.exit.z - 1.4 }; // (where enterStore puts you)
  const [st] = island.stations.coaster;
  assert.ok(island.island && island.themepark);
  assert.ok(!iCol.blocked(bridge.x, bridge.z, R), 'stepping off the bridge is free');
  assert.ok(inPoly(bridge.x, bridge.z, islandStore.open.lawn), 'and on the island');
  assert.ok(!iCol.blocked(st.x, st.z, R), 'boarding spot is free');
  assert.ok(reachable(bridge, st, 0.5, on), 'bridge → coaster');
  const [down] = island.stations.underground;
  assert.ok(!iCol.blocked(down.x, down.z, R) && reachable(bridge, down, 0.5, on), 'bridge → the stairs down');
  assert.ok(!iCol.blocked(C.OFF.x, C.OFF.z, R), 'where you step off is free');
  for (const s of island.seats) assert.ok(!iCol.blocked(s.stand[0], s.stand[1], R), `bench at ${s.x},${s.z}`);
  for (const s of island.stations.patrons) assert.ok(!iCol.blocked(s.x, s.z, 0.2) && inPoly(s.x, s.z, islandStore.open.lawn), `guest at ${s.x},${s.z}`);
  const [staff] = island.stations.coasterStaff;
  assert.ok(!iCol.blocked(staff.x, staff.z, 0.3) && Math.hypot(staff.x - st.x, staff.z - st.z) < 2.5, 'the attendant stands by the gate');
  assert.ok(Math.hypot(staff.x - st.x, staff.z - st.z) > 1, 'not on the boarding spot');
  // Only the bridge leads off: walking from the bridge's end, the one place
  // you step past the island's edge (open.out, where you're back on the
  // street) is at the bridge.
  const { out, bridge: [bx, bz] } = islandStore.open;
  const key = (x, z) => `${Math.round(x * 2)},${Math.round(z * 2)}`;
  const seen = new Set([key(bridge.x, bridge.z)]), q = [[bridge.x, bridge.z]], leave = [];
  while (q.length) {
    const [x, z] = q.shift();
    if (!inPoly(x, z, out)) { leave.push([x, z]); continue; }
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < iBox.x0 || nx > iBox.x1 || nz < iBox.z0 || nz > iBox.z1 || seen.has(key(nx, nz)) || iCol.blocked(nx, nz, R)) continue;
      seen.add(key(nx, nz)); q.push([nx, nz]);
    }
  }
  assert.ok(seen.size > 2000 && leave.length, 'the island is walkable, and you can walk back off');
  for (const [x, z] of leave) assert.ok(Math.hypot(x - bx, z - bz) < 6, `off the island at ${x},${z}, not by the bridge`);
  // The ride-all pass is still sold at the gate under the island.
  const gate = { x: exitOf(room).x, z: exitOf(room).z - 1.4 };
  const [b] = park.stations.booth;
  assert.ok(!col.blocked(b.x, b.z, R) && reachable(gate, b), 'ticket window');
});

test('ticket prices and the ride-all day pass', () => {
  assert.deepEqual(RIDE_PRICE, { coaster: 7000, flume: 5000, gyro: 5000, drop: 4000, viking: 4000, swing: 3000, wheel: 3000, carousel: 2000, teacups: 2000, train: 2000 });
  assert.equal(BUMPER_COST, 4000);
  assert.equal(RIDE_PASS, 20000);
  const all = Object.values(RIDE_PRICE).reduce((a, b) => a + b, 0) + BUMPER_COST;
  assert.ok(RIDE_PASS < all, 'cheaper than one of everything');
  const m = new Map(), st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  let day = new Date(2026, 10, 9, 10);
  const purse = { coins: 25000, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } };
  const p = new DayPasses(st, () => day);
  assert.equal(p.has('rides'), false);
  assert.ok(p.buy('rides', RIDE_PASS, purse));
  assert.equal(purse.coins, 5000);
  assert.ok(p.buy('rides', RIDE_PASS, purse), 'already held: free');
  assert.equal(purse.coins, 5000);
  assert.ok(new DayPasses(st, () => day).has('rides'), 'kept on this device');
  assert.equal(p.feeFor({ workshop: 'themepark' }), 0, 'no fee at the park gate');
  day = new Date(2026, 10, 10, 10);
  assert.equal(p.has('rides'), false, 'only for the day it was bought');
});

test('ride effects follow the speed, gentler when asked', () => {
  const slow = C.rideFx(0.1, 'run'), fast = C.rideFx(1, 'run'), soft = C.rideFx(1, 'run', true);
  assert.ok(C.rideFx(0.2, 'lift').fov < 62, 'narrow on the lift');
  assert.ok(fast.fov > 80 && slow.fov < 66);
  assert.ok(fast.shake > slow.shake * 20, 'shake grows with k²');
  assert.equal(slow.lines, 0);
  assert.ok(fast.lines > 0.9);
  assert.ok(soft.fov < fast.fov && soft.shake < fast.shake);
  // Seats: eight a train, side by side, all above the rails.
  const a = C.seatPose(100, 0), b = C.seatPose(100, 1), c = C.seatPose(100, 7);
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - 0.6) < 0.1, 'side by side');
  assert.ok(Math.hypot(a.x - c.x, a.z - c.z) > 4, 'front to back');
  assert.ok(a.y > C.heightAt(100 - 0.9));
});

test('the old square: every ride has a fenced yard you reach by its gate, with its attendant there', async () => {
  const { RIDE_GATES, RIDE_NAME } = await import('../src/core/park-rides.js');
  const gate = { x: exitOf(room).x, z: exitOf(room).z - 1.4 };
  for (const r of park.rides) {
    assert.ok(!col.blocked(r.x, r.z, R), `${r.kind}: boarding spot is free`);
    assert.ok(reachable(gate, r), `gate → ${r.kind}`);
    assert.deepEqual([r.x, r.z], [RIDE_GATES[r.kind].x, RIDE_GATES[r.kind].z]);
  }
  const kinds = park.stations.rideStaff.map((s) => s.kind).sort();
  assert.deepEqual(kinds, ['bumper', 'carousel', 'flume', 'teacups', 'train', 'viking']);
  for (const s of park.stations.rideStaff) {
    assert.ok(RIDE_NAME[s.kind].ko && RIDE_NAME[s.kind].en, `${s.kind} has a name`);
    assert.ok(!col.blocked(s.x, s.z, 0.3), `${s.kind} attendant stands free`);
    const g = s.kind === 'bumper' ? park.bumper.gate : RIDE_GATES[s.kind];
    const d = Math.hypot(s.x - g.x, s.z - g.z);
    assert.ok(d > 1 && d < 2.6, `${s.kind} attendant by the gate (${d.toFixed(2)})`);
  }
  // You can't walk into a ride: the middle of each yard is fenced off from the plaza.
  for (const k of ['carousel', 'viking']) assert.ok(!reachable(gate, { x: RIDES[k].x, z: RIDES[k].z + (k === 'carousel' ? 0 : 2) }), `${k}: fenced`);
  assert.ok(!reachable(gate, { x: RIDES.teacups.x + 3.4, z: RIDES.teacups.z + 1 }), 'teacups: fenced');
});

test('the island\'s rides: the wheel, the drop tower, the swing ride and the gyro swing, each fenced, its gate a walk from the bridge', async () => {
  const { RIDE_GATES, ISLAND_RIDES, RIDE_NAME } = await import('../src/core/park-rides.js');
  const { YARDS, inYard } = await import('../src/core/park-yards.js');
  const on = { col: iCol, box: iBox }, bridge = { x: island.exit.x, z: island.exit.z - 1.4 }, { lawn } = islandStore.open;
  assert.deepEqual(island.rides.map((r) => r.kind), ISLAND_RIDES);
  assert.deepEqual(park.rides.filter((r) => ISLAND_RIDES.includes(r.kind)), [], 'none of them left in the room below');
  for (const r of island.rides) {
    assert.ok(!iCol.blocked(r.x, r.z, R), `${r.kind}: boarding spot is free`);
    assert.ok(reachable(bridge, r, 0.5, on), `bridge → ${r.kind}`);
    assert.ok(RIDE_NAME[r.kind].ko && RIDE_NAME[r.kind].en, `${r.kind} has a name`);
    // its yard on the island, a few metres in from the shore
    const Y = YARDS[r.kind], ring = Y.ring ? Array.from({ length: 24 }, (_, i) => [RIDES[r.kind].x + Math.cos(i / 3.82) * (Y.ring + 1), RIDES[r.kind].z + Math.sin(i / 3.82) * (Y.ring + 1)]) : [[Y.box[0] - 1, Y.box[1] - 1], [Y.box[2] + 1, Y.box[1] - 1], [Y.box[2] + 1, Y.box[3] + 1], [Y.box[0] - 1, Y.box[3] + 1]];
    for (const [x, z] of ring) assert.ok(inPoly(x, z, lawn), `${r.kind}: yard on the island (${x.toFixed(1)}, ${z.toFixed(1)})`);
    // fenced: the middle of the yard isn't a walk from the bridge
    const mid = r.kind === 'swing' ? { x: RIDES.swing.x + 3.4, z: RIDES.swing.z + 1 } : r.kind === 'wheel' ? { x: RIDES.wheel.x, z: RIDES.wheel.z + 2 } : r.kind === 'gyro' ? { x: RIDES.gyro.x + 4, z: RIDES.gyro.z } : { x: RIDES.drop.x, z: RIDES.drop.z }; // (the drop tower's yard is open at its gate, like the carousel's)
    assert.ok(!reachable(bridge, mid, 0.5, on), `${r.kind}: fenced`);
  }
  for (let i = 0; i < ISLAND_RIDES.length; i++) for (let j = i + 1; j < ISLAND_RIDES.length; j++) {
    const a = ISLAND_RIDES[i], b = ISLAND_RIDES[j];
    assert.ok(!inYard(a, RIDES[b].x, RIDES[b].z, 8), `${a} ↔ ${b}: apart`);
  }
  for (const s of island.stations.rideStaff) {
    assert.ok(!iCol.blocked(s.x, s.z, 0.3), `${s.kind} attendant stands free`);
    const g = RIDE_GATES[s.kind], d = Math.hypot(s.x - g.x, s.z - g.z);
    assert.ok(d > 1 && d < 2.6, `${s.kind} attendant by the gate (${d.toFixed(2)})`);
  }
  // Nothing that moves comes near the coaster's track: the wheel's rim, the
  // drop tower's ring, the swing ride's chairs flying out, the gyro swing's
  // arm and ring at the top of its swing.
  const { seatAt, RIDE_CYCLE } = await import('../src/core/park-rides.js');
  const track = C.trackPoints();
  const clear = (p, d, what) => { for (const q of track) assert.ok(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > d, `${what} at ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} hits the track`); };
  for (const k of ISLAND_RIDES) {
    const c = RIDE_CYCLE[k], len = c ? c.load + c.run + c.stop : 90;
    for (let t = 0; t < len; t += 0.5) for (let i = 0; i < RIDES[k].seats; i += 3) { const s = seatAt(k, i, 1e6 + t); clear({ x: s.x, y: s.y + 0.8, z: s.z }, 2.2, k); }
  }
});

test('the park is a handful of draw calls: still meshes are merged', () => {
  let meshes = 0;
  park.scene.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes < 400, `${meshes} meshes`);
  // (the island is drawn over the street whenever you're near it: fewer still)
  meshes = 0;
  island.scene.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes < 120, `island: ${meshes} meshes`);
});
