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
  assert.ok(segDist(store.at, sopa.p) < 20, 'the door is by Sopa-ro');
  const path = itaewon.roads.find((r) => r.cc); // (scripts/build-namsan-cable.mjs: a footpath from the road round the bay)
  assert.ok(path && dist([path.p[0][0] + ox, path.p[0][1] + oz], store.at) < 0.5 && segDist([path.p.at(-1)[0] + ox, path.p.at(-1)[1] + oz], sopa.p) < 0.5, 'a footpath leads from Sopa-ro to the door');
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

test('the hill follows the real ground (scripts/build-namsan-terrain.mjs): level top, foot at the street', () => {
  const dem = JSON.parse(readFileSync(new URL('../scripts/data/namsan-dem.json', import.meta.url), 'utf8'));
  assert.match(dem.source, /SRTM/);
  const { n, k } = hill.dem;
  assert.equal(k.length, hill.rad.length * (n + 1));
  for (let i = 0; i < hill.rad.length; i++) { assert.equal(k[i * (n + 1)], 1000); assert.equal(k[i * (n + 1) + n], 0); }
});

test('the cable car keeps off the city wall trail: its stations at 1/4, two pylons on OSM\'s line', () => {
  // (scripts/build-namsan-cable.mjs; Yozi 2026-11-19: the old upper station stood on the trail)
  const L = (p) => [cable.x + ox + p[0], cable.z + oz + p[1]];
  const H = (p) => [hill.x + ox + p[0], hill.z + oz + p[1]];
  const trails = [...hill.wtrail.map((r) => ({ p: r.map(H), w: hill.wtrailW })), { p: hill.trail.map(H), w: hill.trailW }];
  const gap = (q) => Math.min(...trails.map((t) => segDist(q, t.p) - t.w / 2));
  const top = L(cable.path.at(-1)), low = L(cable.path[0]), a = Math.atan2(top[0] - low[0], top[1] - low[1]);
  const f = [Math.sin(a), Math.cos(a)], s = [Math.cos(a), -Math.sin(a)];
  // The upper station (8.4 m across for two cabins, 4.4 m bay and a 1.2 m booth) and its cabins clear every trail.
  for (const [u, v] of [[-2.2, -4.2], [3.4, -4.2], [3.4, 4.2], [-2.2, 4.2], [0.6, -4.2], [0.6, 4.2]]) {
    assert.ok(gap([top[0] + f[0] * u + s[0] * v, top[1] + f[1] * u + s[1] * v]) > 0.5, 'the upper station is off the trail');
  }
  assert.ok(dist(top, mid(osm.upperStation.slice(0, -1))) < 5, 'the upper station is on the real one');
  // Two pylons, near OSM's two middle points of the line, each off the trail.
  const real = osm.cable.map((p) => toGame(...p)).slice(1, -1);
  assert.equal(cable.path.length, 4);
  cable.path.slice(1, -1).forEach((p, i) => {
    const q = L(p);
    assert.ok(Math.min(...real.map((r) => dist(q, r))) < 5, `pylon ${i + 1} on OSM's line`);
    assert.ok(gap(q) > 2, `pylon ${i + 1} off the trail`);
  });
  assert.ok(Array.isArray(cable.door) && cable.why, 'the upper door, and why it moved');
  // The lower station is about the real one's size at 1/4, not a big building.
  const xs = station.p.map((q) => q[0]), zs = station.p.map((q) => q[1]);
  assert.ok((Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs)) < 150, 'the ticket hall is small');
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

test('Palgakjeong stands on its real spot on the summit, the whole place at 50% (Yozi 2026-11-19), and you walk up onto it', async () => {
  const { NAMSAN_WALK, PALGAK, palgakStep } = await import('../src/game/namsan-walk.js');
  const top = [hill.x + ox + hill.px, hill.z + oz + hill.pz];
  const real = mid(osm.palgakjeong);
  const at = [top[0] + NAMSAN_WALK.palgak[0], top[1] + NAMSAN_WALK.palgak[1]];
  assert.ok(dist(at, real) < 1, `${dist(at, real).toFixed(2)} m from the real one (OSM way 1555991263)`);
  // 50%: the pavilion ~6 m real → ~3 m; the base ~18 m real → ~9 m.
  assert.ok(Math.abs(PALGAK.colR * 2 - 3.2) < 0.3 && Math.abs(PALGAK.steps[0][0] * 2 - 9.2) < 0.5);
  // On the plaza: clear of the tower's terrace and inside the railing.
  const d = Math.hypot(...NAMSAN_WALK.palgak);
  assert.ok(d - PALGAK.steps[0][0] > NAMSAN_WALK.towerR + 2 && d + PALGAK.steps[0][0] < NAMSAN_WALK.plazaR - 1);
  // Steps of at most 0.15 m from the plaza up to the floor.
  let prev = 0;
  for (let r = 6; r >= 0; r -= 0.05) { const y = palgakStep(r, 0); assert.ok(y - prev <= 0.151, `step at ${r.toFixed(2)}`); prev = y; }
  assert.equal(palgakStep(0, 0), PALGAK.steps.at(-1)[1]);
  assert.equal(palgakStep(5, 0), 0);
});

test('the tower is a quarter of the real one\'s OSM heights: the deck 88–112 m, the antenna to 236.7 m', async () => {
  const { NAMSAN_TOWER: T } = await import('../src/core/namsan-tower.js');
  // (units of T.unit real metres: drawn at 0.75 game metres each, a quarter)
  const P = osm.towerParts, real = (u) => u * T.unit;
  assert.ok(Math.abs(real(T.head) - P.deck[0]) < 4, `the deck starts ${real(T.head)} m up`);
  assert.ok(Math.abs(real(T.top) - P.upper[1]) < 4, `the deck's top ${real(T.top)} m`);
  assert.ok(Math.abs(real(T.tip) - P.top) < 2, `the tip ${real(T.tip)} m`);
  assert.ok(Math.abs(real(T.deckR * 2) - P.deckD) < 1.5);
});
