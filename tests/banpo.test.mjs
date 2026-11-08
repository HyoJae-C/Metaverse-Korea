import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fishById, chanceAt, legendPark, rollCatch, PARK_LEGENDS } from '../src/core/fishing.js';
import { inPolygon } from '../src/core/seoul-grid.js';
import { STAMPS } from '../src/data/stamps.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const seoul = read('seoul.json');
const stores = read('stores.json').stores;
const district = region.districts.find((d) => d.id === 'banpo-jamwon');
const map = read(district.map);
const world = ([x, z]) => [x + district.offset[0], z + district.offset[1]];

test('Banpo-Jamwon: one riverside park on the south bank, in Seocho-gu', () => {
  const gu = seoul.gu.find((g) => g.id === 'seocho');
  assert.ok(gu.open && gu.districts.includes('banpo-jamwon'), 'Seocho-gu is open');
  for (const a of map.areas.filter((x) => x.k !== 'water')) for (const p of a.p) assert.ok(inPolygon(...world(p), gu.p), `${a.k} ${world(p)} is in Seocho-gu`);
  assert.ok(map.areas.some((a) => a.k === 'park' && a.trees), 'a wooded lawn (picnic mats and frisbees go there)');
  assert.ok(map.areas.some((a) => a.k === 'water') && map.blockers.length === 2, 'the river, which you cannot walk into');
  assert.ok(map.landmarks.filter((l) => l.type === 'bench').length >= 6, 'benches facing the river');
});

test('Jamsu Bridge crosses the river from Itaewon, through a gap in the river', () => {
  const bridge = map.roads.find((r) => r.n?.en === 'Jamsu Bridge');
  assert.ok(bridge, 'the bridge is a road');
  const link = region.links.find((l) => l.n?.en === 'To Banpo Bridge');
  const north = world(bridge.p[0]);
  assert.ok(Math.hypot(link.p.at(-1)[0] - north[0], link.p.at(-1)[1] - north[1]) < 1, 'the link road meets the bridge');
  const itaewon = region.districts.find((d) => d.id === 'itaewon');
  const hoenamu = read(itaewon.map).roads.find((r) => r.n?.en === 'Hoenamu-ro');
  assert.equal(link.p[0][1], hoenamu.p[0][1] + itaewon.offset[1], 'it starts on Hoenamu-ro');
  // Walk the bridge: no river blocker on its middle.
  const [a, b] = bridge.p;
  for (let t = 0; t <= 1; t += 0.05) {
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    for (const bl of map.blockers) assert.ok(!inPolygon(x, z, bl.p), `bridge at ${t.toFixed(2)} is open`);
  }
  assert.ok(map.landmarks.some((l) => l.type === 'jamsu'), 'railings, lamps and Banpo Bridge overhead');
});

test('the park door and the Information Center stand in front of their buildings', () => {
  const park = stores.find((s) => s.id === 'banpo-jamwon-hangang');
  const info = stores.find((s) => s.id === 'info-banpo-jamwon');
  assert.equal(park.category, 'park');
  assert.equal(info.workshop, 'info');
  assert.equal(info.district, 'banpo-jamwon');
  const polys = map.buildings.map((b) => b.p.map(world));
  for (const s of [park, info]) {
    assert.ok(!polys.some((p) => inPolygon(...s.at, p)), `${s.id} is not inside a building`);
    const near = Math.min(...polys.flat().map(([x, z]) => Math.hypot(x - s.at[0], z - s.at[1])));
    assert.ok(near < 12, `${s.id} is next to its building (${near.toFixed(1)} m)`);
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
  assert.ok(STAMPS.some((s) => s.place.store === 'banpo-jamwon-hangang'), 'a stamp in the park');
});

test('the manta ray is Banpo-Jamwon\'s legend, and only bites there', () => {
  const manta = fishById('manta');
  assert.ok(manta.released);
  for (const id of ['kelp', 'octopus', 'sea-urchin', 'dolphin']) assert.ok(fishById(id).released, `${id} opens with the park`);
  assert.equal(legendPark('manta').name.en, 'Banpo-Jamwon');
  assert.ok(Math.abs(chanceAt(manta, 'banpo-jamwon-hangang') - 0.4) < 1e-9);
  for (const park of Object.keys(PARK_LEGENDS).filter((p) => p !== 'banpo-jamwon-hangang')) assert.equal(chanceAt(manta, park), 0, park);
  assert.equal(chanceAt(fishById('whale'), 'banpo-jamwon-hangang'), 0);
  assert.equal(chanceAt(fishById('giant-squid'), 'banpo-jamwon-hangang'), 0);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 50000; i++) {
    const id = rollCatch(rand, i % 2 === 0, 'banpo-jamwon-hangang').id;
    assert.ok(id !== 'whale' && id !== 'giant-squid', id);
  }
});
