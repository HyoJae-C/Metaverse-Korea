import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { namsanGround, namsanPoint, onNamsan } from '../src/core/namsan-shape.js';

// Namsan on its real place at a quarter of the real size
// (scripts/build-namsan.mjs).
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const itaewon = read('districts/itaewon.json');
const store = read('stores.json').stores.find((s) => s.id === 'namsan-sky-cable');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/namsan-osm.json', import.meta.url), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
const cable = itaewon.landmarks.find((l) => l.type === 'cablecar');
const station = itaewon.buildings.find((b) => b.n?.en === 'Namsan Sky Cable lower station');
const mid = (pts) => [pts.reduce((s, p) => s + toGame(...p)[0], 0) / pts.length, pts.reduce((s, p) => s + toGame(...p)[1], 0) / pts.length];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segDist = (p, line) => Math.min(...line.slice(1).map((b, i) => {
  const a = line[i], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}));

test('the tower stands on N Seoul Tower\'s real spot, on top of a hill a quarter of real Namsan\'s height', () => {
  assert.match(osm.license, /OpenStreetMap contributors/);
  const top = [hill.x + ox + hill.px, hill.z + oz + hill.pz];
  assert.ok(dist(top, toGame(...osm.tower)) < 15, `tower ${Math.round(dist(top, toGame(...osm.tower)))} m off`);
  assert.equal(hill.h, 56); // 262 m above the sea, about 225 m above the city round it: / 4 (Yozi 2026-11-13)
  // The leaning hill's highest point is where the tower is.
  assert.ok(Math.abs(namsanGround(hill, hill.px, hill.pz) - hill.h) < 0.5);
  assert.ok(namsanGround(hill, hill.px + 30, hill.pz) < hill.h && namsanGround(hill, hill.px - 30, hill.pz) < hill.h);
  const [x, y, z] = namsanPoint(hill, 0, 0);
  assert.deepEqual([x, y, z], [hill.px, hill.h, hill.pz]);
  // A blocker keeps you off it.
  assert.ok(itaewon.blockers.some((b) => b.n?.en === 'Namsan' && b.ns));
});

test('the cable car\'s lower station is on the real one by Sopa-ro, and you can walk to its door', () => {
  const c = [(station.p[0][0] + station.p[2][0]) / 2 + ox, (station.p[0][1] + station.p[2][1]) / 2 + oz];
  assert.ok(dist(c, mid(osm.lowerStation)) < 15, `station ${Math.round(dist(c, mid(osm.lowerStation)))} m off`);
  assert.ok(dist(store.at, c) < 20, 'the store door is at the station');
  assert.ok(station.p.every(([x, z]) => !onNamsan(hill, x - hill.x, z - hill.z)), 'the station is off the hill');
  const sopa = region.links.find((l) => l.n?.en === 'Sopa-ro');
  assert.ok(sopa, 'Sopa-ro leads there');
  assert.ok(segDist(store.at, sopa.p) < 15, 'the door is by Sopa-ro');
  for (const [x, z] of station.p) assert.ok(segDist([x + ox, z + oz], sopa.p) > sopa.w / 2, 'the station is off the road');
  // Sopa-ro joins Toegye-ro and Sowol-ro.
  for (const n of ['Toegye-ro', 'Sowol-ro']) {
    const l = region.links.find((r) => r.n?.en === n);
    assert.ok([sopa.p[0], sopa.p.at(-1)].some((p) => segDist(p, l.p) < 1), n);
  }
});

test('the cable runs up to the real upper station, over the trees', () => {
  const end = cable.path.at(-1);
  const top = [cable.x + ox + end[0], cable.z + oz + end[1]];
  assert.ok(dist(top, mid(osm.upperStation)) < 15);
  for (let i = 1; i < cable.path.length - 1; i++) {
    const [x, z, y] = cable.path[i];
    assert.ok(y - namsanGround(hill, cable.x + x - hill.x, cable.z + z - hill.z) >= 8, `pylon ${i} high enough`);
  }
});

test('the hill\'s foot follows the real Namsan outline at 1/4 and keeps off the roads', () => {
  const real = JSON.parse(readFileSync(new URL('../scripts/data/namsan-outline-osm.json', import.meta.url), 'utf8'));
  assert.match(real.license, /OpenStreetMap contributors/);
  assert.ok(Array.isArray(hill.rad) && hill.rad.length >= 60, 'the foot is the real outline (radii round the top)');
  // The foot's ring, in world metres, is near the real wood's edge on most of its way round.
  const park = real.park.map((p) => toGame(...p));
  const top = [hill.x + ox + hill.px, hill.z + oz + hill.pz];
  const ring = hill.rad.map((r, i) => { const a = (i / hill.rad.length) * Math.PI * 2; return [top[0] + Math.cos(a) * r, top[1] + Math.sin(a) * r]; });
  const off = ring.map((p) => segDist(p, park)).sort((a, b) => a - b);
  assert.ok(off[off.length >> 1] < 25, `median ${Math.round(off[off.length >> 1])} m off the real edge`);
  // No road of the district runs over the hill (the trails up it aside).
  for (const r of itaewon.roads) {
    if (r.nw || r.hw || r.n?.en === 'Namsan trail') continue; // (and the city wall's trail: tests/namsan-wall.test.mjs)
    for (const [x, z] of r.p) assert.ok(!onNamsan(hill, x - hill.x, z - hill.z), `${r.n?.en} on the hill`);
  }
});

test('the Namsan trail runs from Sowol-ro up to beside the tower', () => {
  if (!hill.trail) return;
  const road = itaewon.roads.find((r) => r.nw);
  assert.ok(road && road.k === 'walk', 'on the map as a walk');
  const top = hill.trail.at(-1);
  assert.ok(Math.hypot(top[0] - hill.px, top[1] - hill.pz) < 30, 'its top is by the tower');
  const sowol = itaewon.roads.find((r) => r.n?.en === 'Sowol-ro');
  assert.ok(segDist(road.p[0], sowol.p) <= sowol.w / 2 + 1, 'it starts on Sowol-ro');
});
