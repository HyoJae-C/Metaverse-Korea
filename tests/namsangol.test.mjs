import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { SITE, NAMSANGOL, HOUSE_TOL, DIFF } from '../scripts/build-namsangol.mjs';
import { CollisionMap } from '../src/core/collision.js';

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const [OX, OZ] = JSON.parse(readFileSync(new URL('region.json', R))).districts.find((d) => d.id === 'euljiro').offset;
const map = JSON.parse(readFileSync(new URL('districts/euljiro.json', R)));
const osm = JSON.parse(readFileSync(new URL('../scripts/data/namsangol-osm.json', import.meta.url)));
const G = ([lat, lon]) => { const g = toGame(lat, lon); return Array.isArray(g) ? g : [g.x, g.z]; };
const way = (name) => osm.ways.find((w) => w.name === name).g.map(G);
const mid = (p) => [p.reduce((m, q) => m + q[0], 0) / p.length, p.reduce((m, q) => m + q[1], 0) / p.length];
const mine = (k) => map[k].filter((o) => o.ng === 1);
const world = (p) => p.map(([x, z]) => [x + OX, z + OZ]);

test('Namsangol is on its real ground at 1/4', () => {
  // The real park (OSM, 1/4): 58 x 88 m.
  assert.equal(SITE.e - SITE.w, 58);
  assert.equal(SITE.s - SITE.n, 88);
  // Everything the real map names lies inside the wall.
  for (const w of osm.ways) for (const [x, z] of w.g.map(G)) assert.ok(x > SITE.w - 1 && x < SITE.e + 1 && z > SITE.n - 1 && z < SITE.s + 1, w.name + ' inside the wall');
  assert.ok(DIFF.gate <= 10, 'the gate within 10 m of the real one');
});

test('real things are on their real places; game-size houses within the tolerance', () => {
  // Pavilions and the Time Capsule Plaza: within 1 m (real lines).
  const list = map.landmarks.find((l) => l.type === 'jeongja' && l.ng).list;
  for (const name of ['남산골한옥마을 천우각', '남산골한옥마을 청류정', '관어정', '피금정', '망북루']) {
    const p = way(name), [rx, rz] = mid(p.slice(0, -1));
    assert.ok(list.some(([x, z]) => Math.hypot(x + OX - rx, z + OZ - rz) < 1), name);
  }
  const cap = map.landmarks.find((l) => l.type === 'timecapsule'), [cx, cz] = mid(way('embankment').slice(0, -1));
  assert.ok(Math.hypot(cap.x + OX - cx, cap.z + OZ - cz) < 1);
  // The stream: every point of the ribbon within 1 m of the real line's width.
  const stream = mine('areas').find((a) => a.why?.startsWith('the stream')), line = way('stream');
  for (const q of world(stream.p)) assert.ok(Math.min(...line.map((r) => Math.hypot(q[0] - r[0], q[1] - r[1]))) < 1.8, 'stream on its real line');
  // The houses: game size, near their real middles; the yard round the real folk games ground.
  for (const [n, d] of DIFF.houses) assert.ok(d <= HOUSE_TOL, `${n}: ${d} m`);
  assert.ok(DIFF.yard <= 15 && DIFF.hall <= 15);
  assert.equal(NAMSANGOL.houses.length, 5);
});

test('what is invented is marked approx', () => {
  assert.ok(mine('areas').find((a) => a.k === 'water' && a.why.startsWith('Cheonghakji')).approx, 'the pond that is not in OSM');
  assert.ok(map.landmarks.find((l) => l.type === 'wall' && l.ng).approx, 'the straightened wall');
  assert.equal(mine('areas').filter((a) => a.k === 'park').every((a) => a.approx), true);
  assert.equal(mine('roads').filter((r) => r.approx).length, 3);
});

test('nothing overlaps, and you can walk from the gate to every place', () => {
  const solid = new CollisionMap(map.buildings.concat(map.blockers));
  const gate = map.landmarks.find((l) => l.type === 'hanokgate');
  // A flood fill on a 1 m grid from just inside the gate.
  const key = (x, z) => x + ',' + z, seen = new Set(), todo = [[Math.round(gate.x), Math.round(gate.z + 3)]];
  while (todo.length) {
    const [x, z] = todo.pop();
    if (seen.has(key(x, z)) || x + OX < SITE.w || x + OX > SITE.e || z + OZ < SITE.n - 2 || z + OZ > SITE.s || solid.blocked(x, z, 0.4)) continue;
    seen.add(key(x, z));
    todo.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
  }
  const yard = map.landmarks.find((l) => l.type === 'folkyard'), cap = map.landmarks.find((l) => l.type === 'timecapsule');
  const reach = (x, z, what) => assert.ok(seen.has(key(Math.round(x), Math.round(z))), 'walk to ' + what);
  reach(yard.x - 10, yard.z - 5, 'the folk games yard');
  reach(cap.x + 3, cap.z + 3, 'the Time Capsule Plaza');
  reach(NAMSANGOL.quarter[0] + 5 - OX, NAMSANGOL.quarter[3] - 4 - OZ, 'the hanok quarter');
  reach(-1369 - OX, -344 - OZ, 'Mangbungnu');
  // Buildings keep off each other and off the water.
  const b = mine('buildings').map((o) => o.p), box = (p) => [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
  const hit = (a, c) => a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];
  for (let i = 0; i < b.length; i++) for (let k = i + 1; k < b.length; k++) assert.ok(!hit(box(b[i]), box(b[k])), 'two buildings overlap');
  for (const w of mine('areas').filter((a) => a.k === 'water')) for (const p of b) assert.ok(!hit(box(p), box(w.p)), 'a building in the water');
});
