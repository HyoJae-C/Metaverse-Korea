import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { streamAt, streetBlockers, lowBlockers, holesOf, STAIR, edgeSeats, EDGE_SEAT } from '../src/core/stream.js';
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
  const g = JSON.parse(readFileSync(new URL('../public/regions/seongsu/districts/gyeongbokgung.json', import.meta.url)));
  const m = mergeDistricts([{ id: 'gyeongbokgung', map: g, offset: [-1737, -920] }]);
  assert.equal(m.streams.length, 1);
  const c = m.streams[0];
  assert.deepEqual(c.at, [g.streams[0].at[0] - 1737, g.streams[0].at[1] - 920]);
  assert.ok(c.stairs.length >= 6);
  const holes = holesOf(c);
  assert.equal(holes.length, 1); // touching holes break the ground's triangulation
  assert.equal(holes[0].length, 4 + 4 * c.stairs.length);
  // Stairs stay clear of the bridges, and every road stays out of the channel (but the bridges' walks).
  for (const st of c.stairs) for (const b of c.bridges) assert.ok(Math.min(Math.abs(st.u - b.u), Math.abs(st.u + st.dir * (STAIR.run + STAIR.landing) - b.u)) > b.w / 2 + 1);
  const walls = new CollisionMap(streetBlockers(c));
  for (const r of m.roads) {
    for (const [x, z] of r.p) assert.ok(!walls.blocked(x, z, 0.1), `${r.n?.en} ${x},${z}`);
  }
});

test('seats on the edge of the water: both banks, down by the water, facing it, never under a bridge or at the stepping stones', () => {
  const g = JSON.parse(readFileSync(new URL('../public/regions/seongsu/districts/gyeongbokgung.json', import.meta.url)));
  const st = g.streams[0];
  const seats = edgeSeats([st]);
  const D = st.depth || 4, ww = st.water / 2;
  assert.ok(seats.length > 300);
  for (const q of seats) {
    const u = q.x - st.at[0], v = q.z - st.at[1];
    assert.ok(Math.abs(Math.abs(v) - ww) < 0.3, 'on the edge');
    assert.equal(q.y, -D - EDGE_SEAT.sink);
    assert.equal(q.standY, -D);
    assert.ok(q.street && q.edge);
    assert.equal(q.ry, v < 0 ? 0 : Math.PI); // facing the water
    for (const b of st.bridges || []) assert.ok(Math.abs(u - b.u) >= b.w / 2 + 0.8);
    for (const s2 of st.stones || []) assert.ok(Math.abs(u - s2.u) >= 1.6);
    // You stand up on the walkway, not in the water.
    const at = streamAt([st], q.stand[0], q.stand[1], true);
    assert.ok(at.low && at.y === -D && Math.abs(q.stand[1] - st.at[1]) > ww);
  }
});
