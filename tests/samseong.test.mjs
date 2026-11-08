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

test('KONEXT: a big mall seen from outside, with the aquarium pavilion on the plaza', () => {
  const mall = map.buildings.find((b) => b.custom && b.h === MALL.h);
  assert.ok(mall, 'the mall is a wall drawn by its landmark');
  assert.ok(MALL.x1 - MALL.x0 >= 150 && MALL.z1 - MALL.z0 >= 80, 'the biggest building around');
  assert.ok(map.landmarks.some((l) => l.type === 'konext'));
  assert.ok(map.landmarks.some((l) => l.type === 'aquarium'), 'KONEXT Aquarium pavilion');
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
  // (Olympic-ro runs on west past the junction to the dome, so the link ends on the road, not at its end)
  const [ex, ez] = [link.p.at(-1)[0] - songpa.offset[0], link.p.at(-1)[1] - songpa.offset[1]];
  const [a, b] = olympic.p;
  assert.ok(ez === a[1] && ez === b[1] && ex >= Math.min(a[0], b[0]) && ex <= Math.max(a[0], b[0]), 'ends on Olympic-ro');
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

test('KONEXT Aquarium: you walk in through the pavilion, and on to the ocean tunnel', async () => {
  const { AQUA_ROOM, OCEAN, TUNNEL, PENGUINS, REEF, RIVER, SEAFLOOR, JELLIES, WHALE } = await import('../src/core/aquarium.js');
  const store = stores.find((s) => s.id === 'konext-aquarium');
  assert.ok(store, 'the aquarium is a store you can enter');
  assert.equal(store.workshop, 'aquarium');
  assert.equal(store.district, 'samseong');
  const [x, z] = local(store.at);
  assert.ok(x > PAVILION.x1 && x - PAVILION.x1 < 6 && z > PAVILION.z0 && z < PAVILION.z1, 'its door is on the pavilion\'s plaza side');
  for (const b of map.buildings) assert.ok(!inPolygon(x, z, b.p), 'the door is outside the building');
  // Inside: the walk from the front door to the end of the tunnel is clear.
  const tanks = [OCEAN, PENGUINS, REEF, RIVER, SEAFLOOR];
  const exitZ = AQUA_ROOM.d / 2 - 0.9;
  for (let zz = exitZ - 1.4; zz > TUNNEL.end + 0.5; zz -= 0.5) {
    for (const xx of [-1, 0, 1]) {
      const inTank = tanks.some((a) => xx > a.x0 && xx < a.x1 && zz > a.z0 && zz < a.z1) && !(Math.abs(xx) < TUNNEL.w / 2 && zz > TUNNEL.end);
      assert.ok(!inTank, `path open at ${xx}, ${zz}`);
      for (const [jx, jz] of JELLIES) assert.ok(Math.abs(xx - jx) > 1.2 || Math.abs(zz - jz) > 1.2, `no jellyfish column on the path at ${zz}`);
    }
  }
  // The whale model is half the real length, and the line on the floor is the real 25 m.
  assert.equal(WHALE.len, 25);
  assert.equal(WHALE.scale, 2);
  assert.ok(WHALE.z0 + WHALE.len < exitZ && WHALE.z0 > OCEAN.z1, 'the floor line fits in the hall');
});

test('KONEXT Aquarium: a real-size giant squid in the hall, a diver keeper in the ocean tank', async () => {
  const { SQUID, DIVER, OCEAN, TUNNEL, PENGUINS, JELLIES, AQUA_ROOM } = await import('../src/core/aquarium.js');
  assert.equal(SQUID.len, 12, 'a giant squid is about 12 m long');
  assert.ok(SQUID.x - 1.5 > PENGUINS.x1 && SQUID.z0 > OCEAN.z1 && SQUID.z0 + SQUID.len < AQUA_ROOM.d / 2, 'hangs in the hall, clear of the penguin room');
  for (const [jx] of JELLIES) assert.ok(Math.abs(jx - SQUID.x) > 3, 'not right over a jellyfish column');
  // The diver's whole round stays inside the tank and off the tunnel.
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const x = DIVER.cx + Math.cos(a) * DIVER.rx, z = DIVER.cz + Math.sin(a) * DIVER.rz;
    assert.ok(x > OCEAN.x0 + 1 && x < -TUNNEL.w / 2 - 1 && z > OCEAN.z0 + 1 && z < OCEAN.z1 - 1, `diver in the water at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }
  assert.ok(DIVER.y > 1 && DIVER.y < OCEAN.h - 1.5, 'swims in mid-water');
});
