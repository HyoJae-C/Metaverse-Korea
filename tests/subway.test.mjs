import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PIT, ENTER_AT, toLocal, toWorld, holeOf, blockersOf, outsideOf, streetStairs, hallStairs, hallStairsAt, HALL, HALL_EXIT_AT } from '../src/core/subway.js';

const region = JSON.parse(readFileSync(new URL('../public/regions/seongsu/region.json', import.meta.url)));
const stations = region.subway.stations;
const ex = { at: [10, 20], ry: 0.7 };

test('exit frame round-trips', () => {
  const [x, z] = toWorld(ex, 1.1, -2.5);
  const [a, b] = toLocal(ex, x, z);
  assert.ok(Math.abs(a - 1.1) < 1e-9 && Math.abs(b + 2.5) < 1e-9);
});

test('street stairs go down from the mouth and lead below', () => {
  const at = (b, a = 0) => streetStairs({ exits: [ex] }, ...toWorld(ex, a, b));
  assert.equal(at(-PIT.l / 2 - 0.5), null); // in front of the mouth: street level
  assert.equal(at(-PIT.l / 2 + 0.01).y > -0.05, true);
  const deep = at(-PIT.l / 2 + PIT.run * ENTER_AT + 0.01);
  assert.ok(deep.frac >= ENTER_AT && deep.y < -2);
  assert.equal(at(0, PIT.w / 2 + 0.2), null); // beside the stairwell, not in it
  // Coming out: outside the mouth, facing away from the stairs.
  const out = outsideOf(ex);
  assert.equal(streetStairs({ exits: [ex] }, out.x, out.z), null);
  assert.ok(Math.abs(Math.cos(out.ry - ex.ry) + 1) < 1e-9);
});

test('the side and far walls close the stairwell, the mouth stays open', () => {
  const walls = blockersOf(ex);
  assert.equal(walls.length, 3);
  assert.equal(holeOf(ex).length, 4);
});

test('hall stairs: arrive at the foot, climb to leave', () => {
  const stairs = hallStairs(2);
  for (const st of stairs) {
    assert.equal(hallStairsAt(stairs, st.arrive.x, st.arrive.z), null); // you arrive beside them, not on them
    assert.ok(Math.abs(st.top) < HALL.w / 2);
    const x = st.foot + st.sgn * 7 * HALL_EXIT_AT + st.sgn * 0.05;
    const on = hallStairsAt(stairs, x, st.z);
    assert.equal(on.i, st.i);
    assert.ok(on.frac >= HALL_EXIT_AT && on.y > 2);
  }
});

// The stairwells cut holes in the ground: they must not sit on a road or in a building,
// in whichever district they are (district maps are placed at their offsets).
test('station exits are clear of roads and buildings', () => {
  const segDist = (px, pz, [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
    return Math.hypot(px - ax - t * dx, pz - az - t * dz);
  };
  const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const roads = [], solids = [];
  for (const d of region.districts) {
    const m = JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + d.map, import.meta.url)));
    const sh = (p) => p.map(([x, z]) => [x + d.offset[0], z + d.offset[1]]);
    for (const r of m.roads) roads.push({ ...r, p: sh(r.p) });
    for (const b of m.buildings) if (!(b.m > 2)) solids.push(sh(b.p));
    for (const b of m.blockers || []) solids.push(sh(b.p));
    for (const a of m.areas || []) if (a.k === 'water') solids.push(sh(a.p));
  }
  assert.ok(stations.length >= 1);
  const ids = new Set();
  for (const st of stations) {
    assert.ok(st.id && !ids.has(st.id), 'unique id');
    ids.add(st.id);
    assert.ok(st.name?.en && st.name?.ko && st.line?.color, 'name and line');
    for (const e of st.exits) {
      for (const [x, z] of blockersOf(e).flatMap((w) => w.p).concat(holeOf(e))) {
        for (const r of roads) for (let i = 1; i < r.p.length; i++) assert.ok(segDist(x, z, r.p[i - 1], r.p[i]) > r.w / 2 + 0.5, `${st.id} exit ${e.n} on ${r.n?.en || r.k}`);
        for (const p of solids) assert.ok(!inPoly(x, z, p), `${st.id} exit ${e.n} in a building or water`);
      }
    }
  }
});
