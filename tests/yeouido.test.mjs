import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fishById, chanceAt, legendPark, rollCatch, PARK_LEGENDS, TIER_SHARE } from '../src/core/fishing.js';
import { inPolygon } from '../src/core/seoul-grid.js';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { STAMPS } from '../src/data/stamps.js';
import { at, ISLAND, ORIGIN } from '../scripts/build-yeouido.mjs';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const seoul = read('seoul.json');
const stores = read('stores.json').stores;
const district = region.districts.find((d) => d.id === 'yeouido');
const map = read(district.map);
const world = ([x, z]) => [x + district.offset[0], z + district.offset[1]];
const joined = await loadRegionMap(region, async (f) => read(f));
const solid = new CollisionMap(joined.buildings.concat(joined.blockers));
const water = joined.areas.filter((a) => a.k === 'water');
const wet = (x, z) => water.some((a) => inPolygon(x, z, a.p));
const island = ISLAND.map(([u, v]) => world(at(u, v)));

test('Yeouido is an island in the Han River, in Yeongdeungpo-gu', () => {
  assert.deepEqual(district.offset, ORIGIN, 'the offset the build script draws from');
  const gu = seoul.gu.find((g) => g.id === 'yeongdeungpo');
  assert.ok(gu.open && gu.districts.includes('yeouido'), 'Yeongdeungpo-gu is open');
  for (const a of map.areas.filter((x) => x.k !== 'water')) for (const p of a.p) assert.ok(inPolygon(...world(p), gu.p), `${a.k} ${world(p)} is in Yeongdeungpo-gu`);
  // Walk round the island 6 m off its shore: water and a blocker all the way.
  let dry = [];
  const cx = island.reduce((a, p) => a + p[0], 0) / island.length, cz = island.reduce((a, p) => a + p[1], 0) / island.length;
  for (let i = 0; i < island.length; i++) {
    const [x1, z1] = island[i], [x2, z2] = island[(i + 1) % island.length];
    for (let t = 0.02; t < 1; t += 0.04) {
      const x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
      const d = Math.hypot(x - cx, z - cz), ox = x + ((x - cx) / d) * 6, oz = z + ((z - cz) / d) * 6;
      if (!wet(ox, oz)) dry.push([Math.round(ox), Math.round(oz)]);
      else if (!solid.blocked(ox, oz, 0.5)) {
        // only Seogang Bridge's gap is open water you can stand on
        const bridge = map.roads.find((r) => r.n?.en === 'Seogang Bridge').p.map(world);
        const [a, b] = bridge, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const off = Math.abs(((b[0] - a[0]) * (oz - a[1]) - (b[1] - a[1]) * (ox - a[0])) / len);
        assert.ok(off < 8, `open water at ${Math.round(ox)},${Math.round(oz)} is the bridge`);
      }
    }
  }
  assert.deepEqual(dry, [], 'water all round the island');
  // and no river on the island itself
  for (const [u, v] of [[0, 20], [-200, 100], [200, 120], [0, 170], [-300, 90], [300, 90]]) {
    const [x, z] = world(at(u, v));
    assert.ok(!wet(x, z) && !solid.blocked(x, z, 0.5), `${u},${v} is dry land`);
  }
});

test('Seogang Bridge crosses the main channel from the Han River Bike Path at Hongdae', () => {
  const bridge = joined.roads.find((r) => r.n?.en === 'Seogang Bridge'); // (in world metres)
  const north = bridge.p[0];
  const bike = region.links.find((l) => l.n?.en === 'Han River Bike Path');
  const down = region.links.find((l) => l.n?.en === 'To the Han River');
  assert.ok(bike.p.some(([x, z]) => x === north[0] && z === north[1]), 'it starts on the bike path');
  assert.deepEqual(down.p.at(-1), north, 'where the lane from Hongdae comes down');
  const [a, b] = bridge.p;
  let overWater = 0;
  for (let t = 0; t <= 1; t += 0.01) {
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    assert.ok(!solid.blocked(x, z, 1), `bridge at ${t.toFixed(2)} is open`);
    if (wet(x, z)) overWater++;
  }
  assert.ok(overWater > 50, 'most of it is over the river');
  assert.ok(map.landmarks.some((l) => l.type === 'seogang'), 'railings, lamps and its arch');
});

test('the park: a big open lawn for mats, Mul-bit Square, Yunjung-ro\'s cherry trees and the 63 tower', () => {
  const lawn = map.areas.find((a) => a.lawn);
  assert.ok(lawn && !lawn.trees, 'an open lawn (picnic mats and frisbees) with no trees in the view');
  assert.ok(map.landmarks.filter((l) => l.type === 'bench').length >= 10, 'benches facing the river');
  assert.equal(map.landmarks.filter((l) => l.type === 'blossoms' && l.seasonal).length, 2, 'cherry trees on both sides of Yunjung-ro');
  assert.ok(map.landmarks.some((l) => l.type === 'mulbit'));
  const tower = map.landmarks.find((l) => l.type === 'tower63');
  assert.ok(map.blockers.some((b) => inPolygon(tower.x, tower.z, b.p)), 'you can\'t walk into the 63 tower');
  // Mul-bit Square's pool is shallow: you can walk in.
  const pool = map.areas.find((a) => a.k === 'water' && a.p.length === 4);
  const [px, pz] = world([pool.p.reduce((s, p) => s + p[0], 0) / 4, pool.p.reduce((s, p) => s + p[1], 0) / 4]);
  assert.ok(!solid.blocked(px, pz, 0.5), 'walk through the pool');
  const zone = read('zones.json').zones.find((z) => z.id === 'K-1');
  assert.ok(inPolygon(...zone.at, lawn.p.map(world)), 'people already on the lawn');
});

test('the Information Center stands in front of its building', () => {
  const park = stores.find((s) => s.id === 'yeouido-hangang');
  const info = stores.find((s) => s.id === 'info-yeouido');
  assert.equal(park.category, 'park');
  assert.equal(info.workshop, 'info');
  assert.equal(info.district, 'yeouido');
  const polys = map.buildings.map((b) => b.p.map(world));
  for (const s of [info]) { // (the park is laid on the street: tests/han-park.test.mjs)
    assert.ok(!polys.some((p) => inPolygon(...s.at, p)), `${s.id} is not inside a building`);
    const near = Math.min(...polys.flat().map(([x, z]) => Math.hypot(x - s.at[0], z - s.at[1])));
    assert.ok(near < 12, `${s.id} is next to its building (${near.toFixed(1)} m)`);
    assert.ok(!solid.blocked(...s.at, 0.4), `${s.id}: you can stand at its door`);
  }
  for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(park.name[l] && park.tagline[l] && park.market.name[l] && park.kiosk.name[l], l);
  const kiosk = park.products.filter((p) => p.kiosk).map((p) => p.ingredient).sort();
  assert.deepEqual(kiosk, ['egg', 'frisbee', 'mat', 'ramyeon'], 'ramen, a mat and a frisbee, like every Han River park');
  const ids = new Set(park.market.stalls.map((s) => s.id));
  for (const st of park.market.stalls) {
    const goods = park.products.filter((p) => p.stall === st.id);
    assert.ok(goods.length >= 1 && goods.length <= 2, st.id);
  }
  for (const p of park.products) assert.ok(p.kiosk || ids.has(p.stall), p.id);
  const others = new Set(stores.filter((s) => s !== park).flatMap((s) => (s.products || []).map((p) => p.id)));
  for (const p of park.products) assert.ok(!others.has(p.id), `${p.id} is the park's own`);
  assert.ok(STAMPS.some((s) => s.id === 'yeouido' && Array.isArray(s.place.at) && !s.place.room), 'a stamp in the park, on the street');
});

test('the blobfish is Yeouido\'s legend, and only bites there', () => {
  const blob = fishById('blobfish');
  assert.ok(blob.released);
  for (const id of ['sea-cucumber', 'sunfish', 'anglerfish']) assert.ok(fishById(id).released, `${id} opens with the park`);
  assert.equal(legendPark('blobfish').name.en, 'Yeouido');
  assert.ok(Math.abs(chanceAt(blob, 'yeouido-hangang') - TIER_SHARE[5]) < 1e-9);
  for (const park of Object.keys(PARK_LEGENDS).filter((p) => p !== 'yeouido-hangang')) assert.equal(chanceAt(blob, park), 0, park);
  for (const id of ['whale', 'giant-squid', 'manta']) assert.equal(chanceAt(fishById(id), 'yeouido-hangang'), 0, id);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 50000; i++) {
    const id = rollCatch(rand, i % 2 === 0, 'yeouido-hangang').id;
    assert.ok(!['whale', 'giant-squid', 'manta'].includes(id), id);
  }
});
