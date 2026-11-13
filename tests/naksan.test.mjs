import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { ridgeGround, ridgeHeightRel, ridgeNear } from '../src/core/ridge-ground.js';
import { mergeDistricts } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';

// Naksan and its stretch of the Seoul City Wall, Heunginjimun to Hyehwamun
// (scripts/build-naksan.mjs, in the Dongmyo district): the wall on its real
// OpenStreetMap line at 1/4, 50% high outside and chest high inside
// (Yozi, 2026-11-13), Hyehwamun at 37.5%.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const dm = read('districts/dongmyo.json');
const [ox, oz] = region.districts.find((d) => d.id === 'dongmyo').offset;
const r = dm.meta.ridge;
const osm = JSON.parse(readFileSync(new URL('../scripts/data/naksan-osm.json', import.meta.url), 'utf8'));
const ground = ridgeGround(r, [ox, oz]); // world metres
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const parts = region.districts.map((d) => ({ id: d.id, map: read(d.map), offset: d.offset }));
const map = mergeDistricts(parts, region.links);
const paths = map.roads.filter((rd) => rd.nk);
const houses = map.buildings.filter((b) => b.nk);

test('the wall is on its real OpenStreetMap line at 1/4, with its real gaps', () => {
  assert.match(osm.note, /OpenStreetMap contributors/);
  const real = osm.elements.filter((e) => e.tags.historic === 'citywalls' || e.tags.barrier === 'city_wall')
    .map((e) => e.geometry.map((q) => toGame(q.lat, q.lon)));
  let worst = 0;
  for (const [x, z] of r.line) worst = Math.max(worst, Math.min(...real.map((p) => lineDist(x + ox, z + oz, p))));
  assert.ok(worst < 1, `every point within 1 m of the real line (worst ${worst.toFixed(2)} m)`);
  // About 2.15 km of real wall from Jongno to Hyehwamun: a quarter of that.
  const len = r.line.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - r.line[i - 1][0], q[1] - r.line[i - 1][1]) : 0), 0);
  assert.ok(len > 500 && len < 600, `${Math.round(len)} m`);
  // Three stretches: the gap by Naksan's top and the road south of Hyehwamun.
  assert.equal(r.walls.length, 3);
  for (let k = 1; k < r.walls.length; k++) {
    const a = r.line[r.walls[k - 1][1]], b = r.line[r.walls[k][0]];
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 4, 'a gap wide enough to walk through');
  }
});

test('Hyehwamun is on its real spot at 37.5% of its outline, and you cannot walk through its low arch', () => {
  const gate = osm.elements.find((e) => e.tags.historic === 'city_gate');
  const pts = gate.geometry.map((q) => toGame(q.lat, q.lon));
  const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  assert.ok(Math.hypot(r.gate.x + ox - cx, r.gate.z + oz - cz) < 15, 'within 15 m of the real one');
  assert.ok(r.gate.W > 3 && r.gate.W < 6 && r.gate.D < r.gate.W, `${r.gate.W} x ${r.gate.D} m`);
  const col = new CollisionMap([...map.buildings, ...map.blockers]);
  assert.ok(col.blocked(r.gate.x + ox, r.gate.z + oz, 0.35));
});

test('the wall: 50% high outside (about 3.5 m), chest high inside, nothing where it has a gap', () => {
  assert.equal(r.parapet, 1.3);
  const maxStep = Math.max(...r.line.map((q) => q[3]));
  assert.ok(maxStep + r.parapet > 3.2 && maxStep + r.parapet < 4, `outer face up to ${maxStep + r.parapet} m`);
  // At a point in the middle of a stretch: the ground inside is at the
  // ridge's height, outside lower by the step.
  const [i0, i1] = r.walls[1], i = Math.round((i0 + i1) / 2);
  const [x, z, h, step] = r.line[i], [x2, z2] = r.line[i + 1];
  const len = Math.hypot(x2 - x, z2 - z), nx = (z2 - z) / len, nz = -(x2 - x) / len; // left: inside
  assert.ok(step > 1.5, `step ${step}`);
  assert.ok(Math.abs(ridgeHeightRel(r, x + nx, z + nz) - h) < 0.4, 'inside, just by the wall: the ridge');
  assert.ok(Math.abs(ridgeHeightRel(r, x - nx, z - nz) - (h - step)) < 0.4, 'outside, just by the wall: lower');
  // The gaps and the ends: no step, so you walk through on level ground.
  for (const k of [r.walls[0][1], r.walls[1][0], 0]) assert.equal(r.line[k][3], 0);
});

test('the hill: Naksan\'s top about 23 m up, down to the plain by Jongno and Hyehwamun', () => {
  const top = Math.max(...r.line.map((q) => q[2]));
  assert.ok(top > 20 && top < 25, `top ${top} m`);
  assert.equal(ground(-1019, -768), 0, 'Jongno by Heunginjimun is level');
  assert.ok(ground(r.gate.x + ox, r.gate.z + oz) < 0.3, 'Hyehwamun on the plain');
});

test('the hill raises no street, building or blocker of the rest of the city', () => {
  for (const k of ['roads', 'buildings', 'blockers']) for (const it of map[k]) {
    if (it.nk || it.d === 'closed') continue;
    for (const [x, z] of it.p) assert.ok(ground(x, z) < 0.05, `${k} ${it.n?.en || it.d} at ${x}, ${z}: ${ground(x, z).toFixed(2)} m`);
  }
  for (const s of read('stores.json').stores) if (s.at) assert.ok(ground(...s.at) < 0.05, s.id);
});

test('the paths are clear of the wall, the houses clear of everything', () => {
  const col = new CollisionMap(map.blockers.filter((b) => b.nk));
  for (const rd of paths) for (let i = 1; i < rd.p.length; i++) {
    for (let t = 0; t <= 1; t += 0.25) {
      const x = rd.p[i - 1][0] + (rd.p[i][0] - rd.p[i - 1][0]) * t, z = rd.p[i - 1][1] + (rd.p[i][1] - rd.p[i - 1][1]) * t;
      assert.ok(!col.blocked(x, z, 0.4), `${rd.n.en} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  assert.ok(houses.length > 20 && houses.length < 70, `${houses.length} houses: one row along each path`);
  const others = new CollisionMap([...map.buildings.filter((b) => !b.nk), ...map.blockers]);
  for (const b of houses) {
    const cx = b.p.reduce((s, q) => s + q[0], 0) / 4, cz = b.p.reduce((s, q) => s + q[1], 0) / 4;
    assert.ok(!others.blocked(cx, cz, 2), `house at ${cx}, ${cz} clear of the wall and other buildings`);
    for (const rd of [...paths, ...map.roads.filter((q) => !q.nk)]) for (const [x, z] of b.p) assert.ok(lineDist(x, z, rd.p) > rd.w / 2, `house corner ${x}, ${z} off ${rd.n?.en || rd.d}`);
    assert.ok(b.y0 <= b.y && b.y >= 0, 'walls start at the lowest ground under it');
  }
});

test('the place names: Naksan Park on the hill, Hyehwamun at its gate', () => {
  const names = dm.pois.filter((p) => p.nk).map((p) => p.name.en);
  assert.deepEqual(names.sort(), ['Hyehwamun', 'Naksan Park', 'Naksan Wall Trail']);
  const park = dm.pois.find((p) => p.name.en === 'Naksan Park');
  assert.ok(ridgeNear(r, park.x, park.z).d > 0, 'inside the wall');
});
