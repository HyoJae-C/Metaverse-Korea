import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { streamAt, streetBlockers, lowBlockers, holesOf, STAIR, edgeSeats, EDGE_SEAT, frameOf } from '../src/core/stream.js';
import { CollisionMap } from '../src/core/collision.js';
import { mergeDistricts } from '../src/core/districts.js';

const s = {
  at: [100, 0], len: 200, w: 24, water: 8, depth: 4,
  bridges: [{ u: 80, w: 8 }], stairs: [{ u: 4, side: -1, dir: 1 }, { u: 160, side: 1, dir: -1 }], stones: [{ u: 120 }],
};
const R = 0.35;

test('walking down a stair: street at the mouth, low layer past halfway, the bank at the bottom', () => {
  const z = -12 - STAIR.w / 2; // north stair, mid-lane
  const top = streamAt([s], 104.1, z, false);
  assert.ok(top.stair && !top.low && top.y > -0.1);
  const half = streamAt([s], 104 + STAIR.run * 0.6, z, false);
  assert.ok(half.low && half.y < -2 && half.y > -3);
  assert.equal(streamAt([s], 104 + STAIR.run + 1, z, true).y, -4);
  assert.equal(streamAt([s], 150, 0, true).y, -4); // on the bank
  assert.equal(streamAt([s], 50, 0, false), null); // the plaza
});

test('a bridge is a deck from the street and a roof from below', () => {
  assert.deepEqual(streamAt([s], 180, 0, false), { i: 0, y: 0, low: false });
  assert.deepEqual(streamAt([s], 180, 0, true), { i: 0, y: -4, low: true });
});

test('on the street the channel is a wall except the bridge; below, the water is except the stones', () => {
  const street = new CollisionMap(streetBlockers(s));
  assert.ok(street.blocked(150, -5, R));
  assert.ok(!street.blocked(180, -5, R)); // the bridge deck
  const low = new CollisionMap(lowBlockers(s));
  assert.ok(!low.blocked(150, -8, R)); // north bank walkway
  assert.ok(low.blocked(150, 0, R)); // the water
  assert.ok(!low.blocked(220, 0, R)); // stepping stones
  assert.ok(low.blocked(150, -12.2, R)); // the bank's wall
  // The wall opens where the stair lands, and the stair's lane is free in both layers.
  const land = 104 + STAIR.run + STAIR.landing / 2, laneZ = -12 - STAIR.w / 2;
  assert.ok(!low.blocked(land, -11.5, R) && !low.blocked(land, laneZ, R));
  assert.ok(!street.blocked(105, laneZ, R));
  assert.ok(street.blocked(105, laneZ - STAIR.w / 2 - 0.1, R)); // the stair's outer wall
});

test('one hole for the channel and all its stairs on the Cheonggyecheon map', () => {
  const g = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
  const m = mergeDistricts([{ id: 'gyeongbokgung', map: g, offset: [-1737, -920] }]);
  assert.equal(m.streams.length, 1);
  const c = m.streams[0];
  assert.deepEqual(c.at, [g.streams[0].at[0] - 1737, g.streams[0].at[1] - 920]);
  assert.ok(c.stairs.length >= 6);
  const holes = holesOf(c);
  assert.equal(holes.length, 1); // touching holes break the ground's triangulation
  assert.equal(holes[0].length, 4 + 4 * c.stairs.length + 2 * frameOf(c).joints.length); // (a point on each bank at each bend)
  // Stairs stay clear of the bridges, and every road stays out of the channel (but the bridges' walks).
  for (const st of c.stairs) for (const b of c.bridges) assert.ok(Math.min(Math.abs(st.u - b.u), Math.abs(st.u + st.dir * (STAIR.run + STAIR.landing) - b.u)) > b.w / 2 + 1);
  const walls = new CollisionMap(streetBlockers(c));
  for (const r of m.roads) {
    for (const [x, z] of r.p) assert.ok(!walls.blocked(x, z, 0.1), `${r.n?.en} ${x},${z}`);
  }
});

test('seats on the edge of the water: both banks, down by the water, facing it, never under a bridge or at the stepping stones', () => {
  const g = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
  const st = g.streams[0];
  const seats = edgeSeats([st]);
  const D = st.depth || 4, ww = st.water / 2;
  assert.ok(seats.length > 300);
  const F = frameOf(st);
  for (const q of seats) {
    const [u, v] = F.toStream(q.x, q.z);
    assert.ok(Math.abs(Math.abs(v) - ww) < 0.3, 'on the edge');
    assert.equal(q.y, -D - EDGE_SEAT.sink);
    assert.equal(q.standY, -D);
    assert.ok(q.street && q.edge);
    assert.ok(Math.abs(q.ry - ((v < 0 ? 0 : Math.PI) - F.angAt(u))) < 1e-9); // facing the water
    for (const b of st.bridges || []) assert.ok(Math.abs(u - b.u) >= b.w / 2 + 0.8 - 1e-6);
    for (const s2 of st.stones || []) assert.ok(Math.abs(u - s2.u) >= 1.6 - 1e-6);
    // You stand up on the walkway, not in the water.
    const at = streamAt([st], q.stand[0], q.stand[1], true);
    assert.ok(at.low && at.y === -D && Math.abs(F.toStream(...q.stand)[1]) > ww);
  }
});

test('a bending stream: (u, v) maps onto the ground and back, with no seam at the corners', () => {
  const b = { at: [100, 0], path: [[0, 0], [100, 0], [200, 30], [300, 30]], len: 0, w: 24, stairs: [{ u: 150, side: -1, dir: 1 }], bridges: [{ u: 250, w: 8 }] };
  const F = frameOf(b);
  b.len = F.segs.reduce((m, S) => m + S.L, 0);
  for (const [u, v] of [[50, 5], [100, 10], [100, -12], [150, -14], [204.4, 3], [250, 12], [-0.3, 0], [b.len + 0.3, -5]]) {
    const [x, z] = F.toWorld(u, v), [u2, v2] = F.toStream(x, z);
    assert.ok(Math.abs(u2 - u) < 1e-6 && Math.abs(v2 - v) < 1e-6, `${u},${v} -> ${u2},${v2}`);
  }
  // On the middle line it is the path itself; just either side of a corner the banks meet.
  assert.deepEqual(F.toWorld(100, 0), [200, 0]);
  for (const j of F.joints) for (const v of [-12, 12]) {
    const a = F.toWorld(j - 1e-6, v), c = F.toWorld(j + 1e-6, v);
    assert.ok(Math.hypot(a[0] - c[0], a[1] - c[1]) < 1e-4);
  }
  // Down by the water anywhere along it; the street layer is a wall but at the bridge.
  assert.equal(streamAt([b], ...F.toWorld(180, 0), true).y, -4);
  const walls = new CollisionMap(streetBlockers(b));
  assert.ok(walls.blocked(...F.toWorld(180, 5), R));
  assert.ok(!walls.blocked(...F.toWorld(250, 5), R));
  assert.equal(holesOf(b).length, 1);
});

test('Cheonggyecheon follows its real line, its bridges on their real spots', async () => {
  const { CG, F, LEN, BRIDGES } = await import('../scripts/cheonggyecheon-line.mjs');
  const g = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
  const c = g.streams[0];
  assert.ok(Math.abs(frameOf(c).segs.reduce((m, S) => m + S.L, 0) - c.len) < 0.01, 'len is the length of the path');
  assert.equal(c.len, LEN);
  for (const q of CG.line) { // every OSM point along it within 3 m of the middle (rules: 10 m for a stream)
    const [u, v] = F.toStream(q[0], q[1]);
    if (u >= 0 && u <= LEN) assert.ok(Math.abs(v) < 3.5, `${q}: ${v}`);
  }
  for (const b of BRIDGES) assert.ok(b.off < 4.5 || (b.nudge && b.off < 15 && b.why), `${b.name.en} ${b.off} m off`);
  assert.deepEqual(c.bridges.map((b) => b.u), BRIDGES.map((b) => b.u));
});

// "Can't get down to Cheonggyecheon" (2026-11-10): when districts, roads or
// landmarks move, a building, a wall or a new blocker can land on a stair's
// mouth or fence it in, and you can no longer walk down. On the joined Seoul
// map every stair's lane must be free from the pavement in front of it to the
// landing, and the pavement in front must lead out into the city.
test('every Cheonggyecheon stair can be walked down from the city', async () => {
  const { loadRegionMap } = await import('../src/core/districts.js');
  const R = new URL('../public/regions/another-seoul/', import.meta.url);
  const readJson = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
  const map = await loadRegionMap(readJson('region.json'), async (f) => readJson(f));
  const c = map.streams.find((q) => q.id === 'cheonggyecheon') || map.streams[0];
  const F = frameOf(c), hw = c.w / 2, PLAYER = 0.35;
  // What the game collides with on the street (main.js: buildings, blockers, the channel's walls).
  const street = new CollisionMap(map.buildings.filter((b) => !b.visit).concat(map.blockers || [], streetBlockers(c)));
  const low = new CollisionMap(lowBlockers(c));
  for (const st of c.stairs) {
    const v = st.side * (hw + STAIR.w / 2), at = (du) => F.toWorld(st.u + st.dir * du, v), name = `stair at u ${st.u} (${st.side < 0 ? 'north' : 'south'})`;
    for (let du = -2; du <= STAIR.run / 2; du += 0.25) assert.ok(!street.blocked(...at(du), PLAYER), `${name}: blocked ${du} m from the mouth`);
    for (let du = STAIR.run / 2; du <= STAIR.run + STAIR.landing / 2; du += 0.25) assert.ok(!low.blocked(...at(du), PLAYER), `${name}: blocked ${du} m down`);
    assert.equal(streamAt([c], ...at(STAIR.run + 1), true).y, -(c.depth || 4), `${name}: the landing is down by the water`);
    // From the pavement in front, a walk (0.5 m steps) gets 30 m away: not fenced in.
    const [mx, mz] = at(-1), seen = new Set(['0,0']), q = [[0, 0]];
    let out = false;
    while (q.length && !out) {
      const [i, j] = q.shift();
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
        const k = a + ',' + b;
        if (seen.has(k) || street.blocked(mx + a * 0.5, mz + b * 0.5, PLAYER)) continue;
        seen.add(k);
        if (Math.hypot(a, b) * 0.5 > 30) { out = true; break; }
        q.push([a, b]);
      }
    }
    assert.ok(out, `${name}: the pavement in front is fenced in`);
  }
});
