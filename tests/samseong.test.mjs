import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import { STAMPS } from '../src/data/stamps.js';
import { MALL, PAVILION, TEHERAN, YEONGDONG, TANCHEON } from '../scripts/build-samseong.mjs';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const seoul = read('seoul.json');
const stores = read('stores.json').stores;
const zones = read('zones.json').zones;
const district = region.districts.find((d) => d.id === 'samseong');
const map = read(district.map);
const [ox, oz] = district.offset;
const world = ([x, z]) => [x + ox, z + oz];
const local = ([x, z]) => [x - ox, z - oz];

test('Samseong-dong opens Gangnam-gu, its station corner on the real spot', () => {
  const gu = seoul.gu.find((g) => g.id === 'gangnam');
  assert.ok(gu.open && gu.districts.includes('samseong'), 'Gangnam-gu is open');
  assert.ok(inPolygon(...world([0, 0]), gu.p), 'Samseong Station is in Gangnam-gu');
  assert.match(map.meta.source, /OpenStreetMap/, 'street lines credited to OpenStreetMap');
});

test('Samseong-dong stays on land, south of the Han River', () => {
  const river = Array.isArray(seoul.river[0][0]) ? seoul.river : [seoul.river];
  const wet = ([x, z]) => river.some((p) => inPolygon(...world([x, z]), p));
  for (const list of [map.roads, map.areas, map.buildings]) {
    for (const o of list) for (const q of o.p) assert.ok(!wet(q), `${o.n?.en || o.k || 'building'} at ${q} is in the river`);
  }
});

test('KONEXT: a big mall seen from outside, with the aquarium pavilion closed for now', () => {
  const mall = map.buildings.find((b) => b.custom && b.h === MALL.h);
  assert.ok(mall, 'the mall is a wall drawn by its landmark');
  assert.ok(MALL.x1 - MALL.x0 >= 150 && MALL.z1 - MALL.z0 >= 80, 'the biggest building around');
  assert.ok(map.landmarks.some((l) => l.type === 'konext'));
  assert.ok(map.landmarks.some((l) => l.type === 'aquariumsoon'), 'KONEXT Aquarium pavilion, "Coming soon"');
  assert.ok(map.buildings.some((b) => b.custom && b.h === PAVILION.h));
  // Nothing in the game calls it COEX: the real mall's name is a trademark.
  const text = JSON.stringify(map) + JSON.stringify(stores.filter((s) => s.district === 'samseong'));
  assert.doesNotMatch(text, /COEX|코엑스/i);
  // The media wall: two wave screens on the mall's walls round its corner.
  const screens = (region.screens || []).filter((s) => s.wave);
  assert.equal(screens.length, 2);
  for (const s of screens) {
    const [x, z] = local(s.at);
    assert.ok(x >= MALL.x0 - 2 && x <= MALL.x1 + 2 && z >= MALL.z0 - 2 && z <= MALL.z1 + 2, 'on the mall');
  }
});

test('Samseong Station (Line 2) on the Teheran-ro / Yeongdong-daero corner, before Jamsil on the loop', () => {
  const list = region.subway.stations;
  const i = list.findIndex((s) => s.id === 'samseong-station');
  assert.ok(i >= 0);
  assert.equal(list[i].code, '219');
  assert.equal(list[i + 1].id, 'jamsil-station', 'the train goes Samseong -> Jamsil');
  for (const e of list[i].exits) {
    const [x, z] = local(e.at);
    assert.ok(Math.hypot(x, z) < 30, `exit ${e.n} at the corner`);
    assert.ok(Math.abs(z - TEHERAN.z) > TEHERAN.w / 2 && Math.abs(x - YEONGDONG.x) > YEONGDONG.w / 2, `exit ${e.n} off the road`);
    for (const b of map.buildings) assert.ok(!inPolygon(x, z, b.p), `exit ${e.n} is not in a building`);
  }
});

test('Teheran-ro crosses Tancheon and runs on to Songpa\'s Olympic-ro', () => {
  const tx = (TANCHEON.x0 + TANCHEON.x1) / 2;
  for (let z = -TEHERAN.w / 2 + 1; z <= TEHERAN.w / 2 - 1; z += 1) for (const bl of map.blockers) assert.ok(!inPolygon(tx, z, bl.p), `bridge open at z ${z}`);
  assert.ok(map.blockers.some((bl) => inPolygon(tx, -100, bl.p)), 'the stream blocks elsewhere');
  const link = region.links.find((l) => l.n?.en === 'Olympic-ro');
  const end = world([TEHERAN.x1, TEHERAN.z]);
  assert.deepEqual(link.p[0], end, 'starts at Teheran-ro\'s east end');
  const songpa = region.districts.find((d) => d.id === 'songpa');
  const olympic = read(songpa.map).roads.find((r) => r.n?.en === 'Olympic-ro');
  assert.deepEqual(link.p.at(-1), [olympic.p[0][0] + songpa.offset[0], olympic.p[0][1] + songpa.offset[1]], 'ends on Olympic-ro');
});

test('meeting zone U on KONEXT Square, an Information Center and a stamp', () => {
  const zone = zones.find((z) => z.id === 'U');
  assert.ok(zone);
  const [zx, zz] = local(zone.at);
  const plaza = map.areas.find((a) => a.k === 'plaza');
  assert.ok(inPolygon(zx, zz, plaza.p), 'on the plaza');
  const info = stores.find((s) => s.id === 'info-samseong');
  assert.equal(info.district, 'samseong');
  const [ix, iz] = local(info.at);
  assert.ok(Math.abs(iz - TEHERAN.z) > TEHERAN.w / 2, 'the door is on the sidewalk, not the road');
  for (const b of map.buildings) assert.ok(!inPolygon(ix, iz, b.p), 'the door is outside its building');
  const stamp = STAMPS.find((s) => s.id === 'konext');
  assert.ok(stamp && stamp.gu.en === 'Gangnam-gu');
});
