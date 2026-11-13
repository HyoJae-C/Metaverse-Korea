import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { loadRegionMap, districtBoxes } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { northHeight, northGround } from '../src/core/north-ground.js';

// Inwangsan and Bugaksan with the Seoul City Wall on their crest
// (scripts/build-north-wall.mjs): the wall on its real OpenStreetMap line at
// 1/4, the ground no steeper than a trail along it, flat in the city,
// Changuimun and Sukjeongmun at 43.75% like Hyehwamun (Yozi, 2026-11-13),
// and stones in the ground where the wall is gone.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const rj = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = rj('region.json');
const map = await loadRegionMap(region, async (f) => rj(f));
const osm = JSON.parse(readFileSync(new URL('../scripts/data/north-wall-osm.json', import.meta.url), 'utf8'));
const l = map.landmarks.find((m) => m.type === 'northwall');
const W = (p) => p.map(([x, z]) => [l.x + x, l.z + z]);
const runs = l.runs.map(W);
const y = (x, z) => northHeight(l, x, z);
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const samples = (p, step) => p.slice(1).flatMap((b, i) => { const a = p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); });
const len = (p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const deg = (r) => (Math.atan(r) * 180) / Math.PI;

test('the old cone is gone and the hills are one northwall landmark', () => {
  assert.equal(map.landmarks.filter((m) => m.type === 'mountain').length, 0);
  assert.equal(map.landmarks.filter((m) => m.type === 'northwall').length, 1);
  assert.equal(northGround([])(0, 0), 0);
});

test('the wall is on its real OpenStreetMap line at 1/4', () => {
  assert.match(osm.note, /OpenStreetMap/);
  const real = osm.elements.filter((e) => e.type === 'way' && !e.tags?.building).map((e) => e.geometry.map((q) => toGame(q.lat, q.lon)));
  let worst = 0;
  for (const p of runs) for (const [x, z] of p) worst = Math.max(worst, Math.min(...real.map((q) => lineDist(x, z, q))));
  assert.ok(worst < 1.5, `every point within 1.5 m of the real line (worst ${worst.toFixed(2)} m)`);
  const total = runs.reduce((s, p) => s + len(p), 0);
  assert.ok(total > 1600 && total < 1900, `${Math.round(total)} m of wall (about 7 km real)`);
});

test('along the wall the ground climbs like a trail, about 20° at most', () => {
  let worst = 0, at = null;
  for (const p of runs) {
    const s = samples(p, 1);
    for (let i = 2; i < s.length; i++) {
      const [ax, az] = s[i - 2], [bx, bz] = s[i], d = Math.hypot(bx - ax, bz - az);
      if (d < 0.5) continue;
      const g = deg(Math.abs(y(bx, bz) - y(ax, az)) / d);
      if (g > worst) { worst = g; at = s[i]; }
    }
  }
  assert.ok(worst < 22, `steepest ${worst.toFixed(1)}° at ${at?.map((v) => v.toFixed(0))}`);
});

test('the hills are wooded slopes, never cliffs, and rise to about 50 m', () => {
  const C = 4;
  let worst = 0, top = 0;
  const [bx0, bz0, bx1, bz1] = [Math.min(...runs.flat().map((q) => q[0])) - 150, Math.min(...runs.flat().map((q) => q[1])) - 150, Math.max(...runs.flat().map((q) => q[0])) + 150, Math.max(...runs.flat().map((q) => q[1])) + 150];
  for (let z = bz0; z < bz1; z += C) for (let x = bx0; x < bx1; x += C) {
    const h = y(x, z);
    top = Math.max(top, h);
    worst = Math.max(worst, deg(Math.hypot(y(x + 1, z) - h, y(x, z + 1) - h)));
  }
  assert.ok(worst < 32, `steepest ground ${worst.toFixed(1)}°`);
  assert.ok(top > 40 && top < 80, `top ${top.toFixed(1)} m`);
});

test('the city stays flat: every district and its streets are at 0', () => {
  for (const b of districtBoxes(map)) for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z1], [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]]) assert.equal(y(x, z), 0, `district box corner (${x}, ${z})`);
  for (const r of map.roads.filter((q) => q.p && !q.hill)) for (const [x, z] of r.p) assert.equal(y(x, z), 0, `road point (${x}, ${z})`);
});

test('Changuimun and Sukjeongmun are 43.75% like Hyehwamun, on the wall, with their arches open', () => {
  const collision = new CollisionMap(map.buildings.filter((b) => !b.visit).concat(map.blockers || []));
  assert.deepEqual(l.gates.map((g) => g.n.en), ['Changuimun', 'Sukjeongmun']);
  for (const g of l.gates) {
    assert.equal(g.W, 5.1, `${g.n.en} width (Hyehwamun's, 43.75%)`);
    const gx = l.x + g.x, gz = l.z + g.z;
    assert.ok(Math.min(...runs.map((p) => lineDist(gx, gz, p))) < 12, `${g.n.en} sits on the wall's line`);
    assert.equal(collision.blocked(gx, gz, 0.3), false, `${g.n.en}'s arch is open`);
    const ax = Math.sin(g.ry), az = Math.cos(g.ry);
    for (const s of [-4, 4]) assert.equal(collision.blocked(gx + ax * s, gz + az * s, 0.3), false, `${g.n.en}: the way through, ${s} m`);
  }
  const sk = osm.elements.find((e) => e.id === 607913396);
  const c = toGame(sk.geometry.reduce((a, q) => a + q.lat, 0) / sk.geometry.length, sk.geometry.reduce((a, q) => a + q.lon, 0) / sk.geometry.length);
  const g = l.gates[1];
  assert.ok(Math.hypot(l.x + g.x - c[0], l.z + g.z - c[1]) < 15, 'Sukjeongmun on its real spot');
});

test('the wall blocks you except at the gates', () => {
  const collision = new CollisionMap(map.buildings.filter((b) => !b.visit).concat(map.blockers || []));
  let open = 0, n = 0;
  for (const p of runs) for (const [x, z] of samples(p, 3)) {
    if (l.gates.some((g) => Math.hypot(l.x + g.x - x, l.z + g.z - z) < 6)) continue;
    n++;
    if (!collision.blocked(x, z, 0.3)) open++;
  }
  assert.ok(open / n < 0.02, `${open} of ${n} points along the wall let you through`);
});

test('where the wall is gone: a stone line and markers at Donuimun and Sowuimun', () => {
  const total = l.marks.reduce((s, p) => s + len(p), 0);
  assert.ok(total > 300, `${Math.round(total)} m of stone line`);
  assert.deepEqual(l.sites.map((s) => s.n.en), ['Donuimun site', 'Sowuimun site']);
  const don = osm.elements.find((e) => e.id === 9345115560), [dx, dz] = toGame(don.lat, don.lon);
  const s = l.sites[0];
  assert.ok(Math.hypot(l.x + s.x - dx, l.z + s.z - dz) < 25, 'Donuimun site marker near its real spot');
  const buildings = map.buildings;
  const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
  for (const st of l.sites) assert.ok(!buildings.some((b) => inPoly(l.x + st.x, l.z + st.z, b.p)), `${st.n.en} is not inside a building`);
});
