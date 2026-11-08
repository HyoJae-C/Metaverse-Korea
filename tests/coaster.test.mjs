import { test } from 'node:test';
import assert from 'node:assert/strict';

// The park's builders draw signs on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const C = await import('../src/core/coaster.js');
const { buildThemePark, RIDES, RIDE_PRICE, RIDE_PASS } = await import('../src/core/themepark.js');
const { ROOM_SIZES, exitOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { RINK, BUMPER_COST } = await import('../src/core/bumper-cars.js');
const { HAUNT } = await import('../src/core/haunted.js');
const { DayPasses } = await import('../src/core/day-pass.js');

const room = ROOM_SIZES.themepark, box = roomBox(room);
const park = buildThemePark({}, room, exitOf(room));
const col = new CollisionMap(park.colliders);
const R = 0.35;
function reachable(a, b, step = 0.5) {
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

test('the track stays in the park, off the ground, and clear of itself', () => {
  const pts = C.trackPoints();
  for (const p of pts) {
    assert.ok(p.x > box.x0 + 1 && p.x < box.x1 - 1 && p.z > box.z0 + 1 && p.z < box.z1 - 1, `in the park ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    assert.ok(p.y > 0.3);
  }
  for (let i = 0; i < pts.length; i += 4) for (let j = i + 80; j < pts.length; j += 4) {
    if (pts.length - j + i < 80) continue;
    const a = pts[i], b = pts[j];
    if (Math.hypot(a.x - b.x, a.z - b.z) < 2.5) assert.ok(Math.abs(a.y - b.y) > 3, `crossing at ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
  }
});

test('the coaster keeps out of the old square and its rides', () => {
  const pts = C.trackPoints();
  const clear = (x, z, r, what) => { for (const p of pts) assert.ok(Math.hypot(p.x - x, p.z - z) > r, what); };
  clear(RIDES.wheel.x, RIDES.wheel.z, 9, 'Ferris wheel');
  clear(RIDES.viking.x, RIDES.viking.z, 6, 'pirate ship');
  clear(RIDES.drop.x, RIDES.drop.z, 4, 'drop tower');
  clear(RIDES.carousel.x, RIDES.carousel.z, 6, 'carousel');
  clear(HAUNT.x, HAUNT.z, 6, 'haunted house');
  for (const p of pts) assert.ok(!(p.x > RINK.x - RINK.hx - 2 && p.z > RINK.z - RINK.hz - 2), 'bumper cars');
  for (const p of pts) assert.ok(!(p.x > -25 && p.z > -15), 'the old square stays as it was');
});

test('you can walk from the gate to the platform, and under the track to the north field', () => {
  const gate = { x: exitOf(room).x, z: exitOf(room).z - 1.4 };
  const [st] = park.stations.coaster;
  assert.ok(!col.blocked(st.x, st.z, R), 'boarding spot is free');
  assert.ok(reachable(gate, st), 'gate → coaster');
  assert.ok(reachable(gate, { x: -21, z: -22.4 }), 'gate → the north pond bench');
  assert.ok(!col.blocked(C.OFF.x, C.OFF.z, R), 'where you step off is free');
  for (const s of park.seats) assert.ok(!col.blocked(s.stand[0], s.stand[1], R), `bench at ${s.x},${s.z}`);
  for (const s of park.stations.patrons) assert.ok(!col.blocked(s.x, s.z, 0.2), `guest at ${s.x},${s.z}`);
  const [staff] = park.stations.coasterStaff;
  assert.ok(!col.blocked(staff.x, staff.z, 0.3) && Math.hypot(staff.x - st.x, staff.z - st.z) < 2.5, 'the attendant stands by the gate');
  assert.ok(Math.hypot(staff.x - st.x, staff.z - st.z) > 1, 'not on the boarding spot');
  const [b] = park.stations.booth;
  assert.ok(!col.blocked(b.x, b.z, R) && reachable(gate, b), 'ticket window');
});

test('ticket prices and the ride-all day pass', () => {
  assert.deepEqual(RIDE_PRICE, { coaster: 7000, drop: 4000, viking: 4000, wheel: 3000, carousel: 2000 });
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
