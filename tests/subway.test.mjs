import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loopOrder, stationAt, PIT, ENTER_AT, toLocal, toWorld, holeOf, blockersOf, outsideOf, streetStairs, hallStairs, hallStairsAt, HALL, HALL_EXIT_AT, trainPhase, HEADWAY, DOORS, stopsBetween, lineAhead, gateAt, GATE_X, TRACKS } from '../src/core/subway.js';

const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
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

test('a train every 15 s per track, doors open for 5 s, tracks 7.5 s apart', () => {
  assert.equal(HEADWAY, 15);
  assert.deepEqual(TRACKS.map((t) => t.offset), [0, 7.5]);
  assert.equal(DOORS, 5);
  let open = 0;
  for (let t = 0; t < HEADWAY; t += 0.01) if (trainPhase(t).phase === 'open') open += 0.01;
  assert.ok(Math.abs(open - DOORS) < 0.05);
  assert.equal(trainPhase(0, 0).phase, 'in');
  assert.equal(trainPhase(0, 7.5).phase, 'out');
  assert.equal(trainPhase(0, 3).phase, 'open');
  assert.equal(trainPhase(-3).phase, trainPhase(12).phase); // any clock value works
  assert.deepEqual(TRACKS.map((t) => t.dir).sort(), [-1, 1]);
});

test('riding: up goes forward round the loop, down goes back', () => {
  assert.deepEqual(lineAhead(0, 1, 4), [1, 2, 3]);
  assert.deepEqual(lineAhead(0, -1, 4), [3, 2, 1]);
  assert.equal(stopsBetween(0, 3, 1, 4), 3);
  assert.equal(stopsBetween(0, 3, -1, 4), 1);
  assert.equal(stopsBetween(2, 1, 1, 4), 3);
});

test('gates: the concourse is west of the gate row, the platform east', () => {
  assert.equal(gateAt(GATE_X - 1, 0).inside, false);
  assert.equal(gateAt(GATE_X + 1, 0).inside, true);
  assert.equal(gateAt(GATE_X + 5, 0), null);
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
    const m = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + d.map, import.meta.url)));
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

test('Dongmyo (Line 1, 127): exits within 15 m of the real 3 and 4, by the market and the shrine', async () => {
  const { toGame } = await import('../src/core/seoul-grid.js');
  const real = { 3: [37.5732778, 127.017254], 4: [37.5729272, 127.015949] }; // OSM 3401297193, 3401296590
  const st = stations.find((s) => s.id === 'dongmyo-station');
  assert.ok(st);
  assert.equal(st.code, '127');
  assert.equal(st.line.name.en, 'Line 1');
  assert.deepEqual(st.exits.map((e) => e.n).sort(), [3, 4]);
  for (const e of st.exits) {
    const [x, z] = toGame(...real[e.n]);
    assert.ok(Math.hypot(e.at[0] - x, e.at[1] - z) <= 15, `exit ${e.n}`);
  }
  const d = region.districts.find((x) => x.id === 'dongmyo');
  const gate = [d.anchor.local[0] + d.offset[0], d.anchor.local[1] + d.offset[1]];
  for (const e of st.exits) assert.ok(Math.hypot(e.at[0] - gate[0], e.at[1] - gate[1]) < 70, `exit ${e.n} near Dongmyo Shrine`);
});

test('Mongchontoseong Station sits by Olympic Park, right after Jamsil on the loop, exits within 15 m of the real 1 and 2', async () => {
  const { toGame } = await import('../src/core/seoul-grid.js');
  const real = { 1: [37.5177063, 127.1132863], 2: [37.5170369, 127.1127931] }; // OSM 5873076167, 3401171485
  const i = stations.findIndex((s) => s.id === 'mongchontoseong-station');
  assert.ok(i > 0 && stations[i - 1].id === 'jamsil-station');
  const st = stations[i];
  assert.equal(st.line.name.en, 'Line 8');
  assert.deepEqual(st.exits.map((e) => e.n).sort(), [1, 2]);
  for (const e of st.exits) {
    const [x, z] = toGame(...real[e.n]);
    assert.ok(Math.hypot(e.at[0] - x, e.at[1] - z) <= 15, `exit ${e.n}`);
  }
  const park = region.districts.find((d) => d.id === 'olympic-park');
  const gate = [park.anchor.local[0] + park.offset[0], park.anchor.local[1] + park.offset[1]];
  for (const e of st.exits) assert.ok(Math.hypot(e.at[0] - gate[0], e.at[1] - gate[1]) < 120, `exit ${e.n} near the Peace Gate`);
});

test("Children's Grand Park (Line 7, 726): exits within 15 m of the real 1 and 2, either side of the main gate", async () => {
  const { toGame } = await import('../src/core/seoul-grid.js');
  const real = { 1: [37.5489426, 127.0754075], 2: [37.5472505, 127.0746953] }; // OSM 3401334030, 3401334028
  const st = stations.find((s) => s.id === 'childrens-grand-park-station');
  assert.deepEqual(st.exits.map((e) => e.n).sort(), [1, 2]);
  for (const e of st.exits) {
    const [x, z] = toGame(...real[e.n]);
    assert.ok(Math.hypot(e.at[0] - x, e.at[1] - z) <= 15, `exit ${e.n}`);
  }
});

test('the loop follows the map: every station once, starting at Seongsu, clockwise, no long jumps back and forth', () => {
  const list = stations.filter((s) => s.exits?.length);
  const loop = loopOrder(list);
  assert.equal(loop.length, list.length);
  assert.deepEqual(new Set(loop.map((s) => s.id)), new Set(list.map((s) => s.id)));
  assert.equal(loop[0].id, list[0].id);
  const P = loop.map(stationAt);
  let area = 0, len = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length];
    area += p[0] * q[1] - q[0] * p[1];
    len += Math.hypot(q[0] - p[0], q[1] - p[1]);
  }
  assert.ok(area > 0, 'clockwise on a north-up map');
  // Shorter than the order in region.json, which jumps across the city.
  const L0 = list.map(stationAt).reduce((a, p, i, A) => a + Math.hypot(A[(i + 1) % A.length][0] - p[0], A[(i + 1) % A.length][1] - p[1]), 0);
  assert.ok(len <= L0 + 1e-6);
  // Seoul Forest is next to Seongsu (the first errand is one stop).
  const f = loop.findIndex((s) => s.id === 'seoul-forest-station');
  assert.ok(f === 1 || f === loop.length - 1);
  // A new station is placed by where it is: one near Gyeongbokgung lands next to it.
  const g = list.find((s) => s.id === 'gyeongbokgung-station');
  const extra = { id: 'test-station', exits: [{ at: [stationAt(g)[0] + 60, stationAt(g)[1] + 120] }] };
  const loop2 = loopOrder([...list, extra]);
  const k = loop2.indexOf(extra), n = loop2.length;
  assert.ok([loop2[(k + 1) % n].id, loop2[(k - 1 + n) % n].id].includes('gyeongbokgung-station'));
});

test('Gwanghwamun (Line 5) and Sinchon (Line 2): exits within 15 m of the real ones (OSM, at 1/4)', async () => {
  const { toGame } = await import('../src/core/seoul-grid.js');
  const real = {
    'gwanghwamun-station': { 1: [37.5718764, 126.9748938], 2: [37.5724998, 126.9773857], 9: [37.5713027, 126.9769417] },
    'sinchon-station': { 1: [37.5554764, 126.9364458], 4: [37.5554545, 126.9372855] },
  };
  for (const [id, exits] of Object.entries(real)) {
    const st = stations.find((s) => s.id === id);
    assert.ok(st, id);
    for (const e of st.exits) {
      const [x, z] = toGame(...exits[e.n]);
      assert.ok(Math.hypot(e.at[0] - x, e.at[1] - z) <= 15, `${id} exit ${e.n}`);
    }
  }
  assert.equal(stations.find((s) => s.id === 'gwanghwamun-station').line.name.en, 'Line 5');
  assert.equal(stations.find((s) => s.id === 'sinchon-station').code, '240');
});

test('Myeongdong (Line 4, 424): exits within 15 m of the real 6 and 4, either side of Toegye-ro by the shopping street', async () => {
  const { toGame } = await import('../src/core/seoul-grid.js');
  const real = { 6: [37.5609256, 126.984915], 4: [37.5606753, 126.9848244] }; // OSM 3403067532, 3403067533
  const st = stations.find((s) => s.id === 'myeongdong-station');
  assert.ok(st);
  assert.equal(st.code, '424');
  assert.equal(st.line.name.en, 'Line 4');
  assert.deepEqual(st.exits.map((e) => e.n).sort(), [4, 6]);
  for (const e of st.exits) {
    const [x, z] = toGame(...real[e.n]);
    assert.ok(Math.hypot(e.at[0] - x, e.at[1] - z) <= 15, `exit ${e.n}`);
  }
  // The same spots the build script works out (scripts/build-myeongdong.mjs).
  const { stationExits } = await import('../scripts/build-myeongdong.mjs');
  for (const e of stationExits()) assert.deepEqual(st.exits.find((x) => x.n === e.n), { n: e.n, at: e.at, ry: e.ry });
});

test('Yeouinaru (Line 5, 527): exits within 15 m of the real 2 and 3, on the river side of Yeouidong-ro by the park', async () => {
  const { toGame } = await import('../src/core/seoul-grid.js');
  const real = { 2: [37.5270678, 126.932426], 3: [37.5267199, 126.9328776] }; // OSM 3403232529, 3403232528
  const st = stations.find((s) => s.id === 'yeouinaru-station');
  assert.ok(st);
  assert.equal(st.code, '527');
  assert.equal(st.line.name.en, 'Line 5');
  assert.deepEqual(st.exits.map((e) => e.n).sort(), [2, 3]);
  for (const e of st.exits) {
    const [x, z] = toGame(...real[e.n]);
    assert.ok(Math.hypot(e.at[0] - x, e.at[1] - z) <= 15, `exit ${e.n}`);
  }
  // The same spots the build script works out (scripts/build-yeouido.mjs), between the road and the Han River path.
  const { stationExits, toUV, PATH } = await import('../scripts/build-yeouido.mjs');
  for (const e of stationExits()) {
    assert.deepEqual(st.exits.find((x) => x.n === e.n), { n: e.n, at: e.at, ry: e.ry });
    const v = toUV(e.at)[1];
    assert.ok(v > PATH + 4 && v < PATH + 8, `exit ${e.n} on the pavement`);
  }
});
