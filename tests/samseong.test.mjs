import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import { STAMPS } from '../src/data/stamps.js';
import { MALL, PAVILION, TEHERAN, YEONGDONG, OLYMPIC, ASEM, BONGEUNSA, TANCHEON, toGrid, lineDist } from '../scripts/build-samseong.mjs';

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

test('Streets on their real lines at 1/4: Teheran-ro and Yeongdong-daero slant, as in Seoul', () => {
  // Points on the real roads at 1/4 (OpenStreetMap, half-way between the two
  // carriageways, map metres from the station): each street passes within 10 m.
  const near = (name, p, pts) => { for (const q of pts) assert.ok(lineDist(q, p) < 10, `${name} within 10 m of the real line at ${q}`); };
  near('Teheran-ro', TEHERAN.p, [[-142, 54.5], [0, 2], [74.5, -30]]);
  near('Yeongdong-daero', YEONGDONG.p, [[-62, -151.5], [0, 2], [38, 81]]);
  // Teheran-ro runs east-north-east, Yeongdong-daero north-north-west (about 21° off the compass).
  const angle = ([ax, az], [bx, bz]) => (Math.atan2(az - bz, bx - ax) * 180) / Math.PI;
  const t = angle(TEHERAN.p[0], TEHERAN.p.at(-1)), y = angle(YEONGDONG.p.at(-1), YEONGDONG.p[0]);
  assert.ok(t > 15 && t < 28, `Teheran-ro heads ${t.toFixed(0)}° north of east`);
  assert.ok(y > 100 && y < 120, `Yeongdong-daero heads ${y.toFixed(0)}° from east`);
  // Asem-ro meets Teheran-ro and Bongeunsa-ro; KONEXT's block is between them and Yeongdong-daero.
  assert.ok(lineDist(ASEM.p[0], TEHERAN.p) < 1 && lineDist(ASEM.p.at(-1), BONGEUNSA.p) < 1);
});

test('KONEXT: a big mall seen from outside, with the aquarium pavilion on the plaza', () => {
  const mall = map.buildings.find((b) => b.custom && b.h === MALL.h);
  assert.ok(mall, 'the mall is a wall drawn by its landmark');
  const [w, d] = [MALL.u1 - MALL.u0, MALL.v1 - MALL.v0];
  assert.ok(Math.max(w, d) >= 80 && Math.min(w, d) >= 50, 'the biggest building around');
  // On the real exhibition centre (OpenStreetMap: its middle at map (-85, -85)), inside its block.
  const [gx, gz] = toGrid([-85, -85]);
  assert.ok(gx > MALL.u0 && gx < MALL.u1 && gz > MALL.v0 && gz < MALL.v1, 'on the real exhibition centre');
  for (const q of mall.p) {
    assert.ok(lineDist(q, ASEM.p) > ASEM.w / 2 && lineDist(q, YEONGDONG.p) > YEONGDONG.w / 2, 'between Asem-ro and Yeongdong-daero');
    assert.ok(lineDist(q, TEHERAN.p) > TEHERAN.w / 2 && lineDist(q, BONGEUNSA.p) > BONGEUNSA.w / 2, 'between Teheran-ro and Bongeunsa-ro');
  }
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
    const [x, z] = toGrid(local(s.at));
    assert.ok(x >= MALL.u0 - 2 && x <= MALL.u1 + 2 && z >= MALL.v0 - 2 && z <= MALL.v1 + 2, 'on the mall');
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
    assert.ok(lineDist([x, z], TEHERAN.p) > TEHERAN.w / 2 && lineDist([x, z], YEONGDONG.p) > YEONGDONG.w / 2, `exit ${e.n} off the road`);
    for (const b of map.buildings) assert.ok(!inPolygon(x, z, b.p), `exit ${e.n} is not in a building`);
  }
});

test('Teheran-ro turns into Olympic-ro, crosses Tancheon and runs on to Songpa\'s Olympic-ro', () => {
  assert.deepEqual(OLYMPIC.p[0], TEHERAN.p.at(-1), 'Olympic-ro goes on from Teheran-ro\'s end');
  // On the bridge, the whole width of the road is open; the stream blocks elsewhere.
  const bridge = map.landmarks.find((l) => l.type === 'samseongbridge');
  const ux = Math.cos(bridge.ry), uz = -Math.sin(bridge.ry);
  for (let a = -bridge.len / 2; a <= bridge.len / 2; a += 1) for (let s = -OLYMPIC.w / 2 + 1; s <= OLYMPIC.w / 2 - 1; s += 1) {
    const x = bridge.x + ux * a - uz * s, z = bridge.z + uz * a + ux * s;
    for (const bl of map.blockers) assert.ok(!inPolygon(x, z, bl.p), `bridge open at ${x.toFixed(0)}, ${z.toFixed(0)}`);
  }
  const north = TANCHEON.p.find((q) => q[1] < -100);
  assert.ok(map.blockers.some((bl) => inPolygon(...north, bl.p)), 'the stream blocks elsewhere');
  const link = region.links.find((l) => l.n?.en === 'Olympic-ro');
  assert.deepEqual(link.p[0], world(OLYMPIC.p.at(-1)).map((v) => Math.round(v * 10) / 10), 'the link starts at Olympic-ro\'s east end');
  const songpa = region.districts.find((d) => d.id === 'songpa');
  const olympic = read(songpa.map).roads.find((r) => r.n?.en === 'Olympic-ro');
  // (the link ends on Olympic-ro, at its end or on the way)
  const [ex, ez] = [link.p.at(-1)[0] - songpa.offset[0], link.p.at(-1)[1] - songpa.offset[1]];
  const onSeg = ([px, pz], [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(ax + t * dx - px, az + t * dz - pz) < 0.05;
  };
  assert.ok(olympic.p.some((q, i) => i && onSeg([ex, ez], olympic.p[i - 1], q)), 'ends on Olympic-ro');
});

test('meeting zone J-1 on KONEXT Square, an Information Center and a stamp', () => {
  const zone = zones.find((z) => z.id === 'J-1');
  assert.ok(zone);
  const [zx, zz] = local(zone.at);
  const plaza = map.areas.find((a) => a.k === 'plaza');
  assert.ok(inPolygon(zx, zz, plaza.p), 'on the plaza');
  const info = stores.find((s) => s.id === 'info-samseong');
  assert.equal(info.district, 'samseong');
  const [ix, iz] = local(info.at);
  assert.ok(lineDist([ix, iz], TEHERAN.p) > TEHERAN.w / 2, 'the door is on the sidewalk, not the road');
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
  const [u, v] = toGrid([x, z]);
  assert.ok(u > PAVILION.u1 && u - PAVILION.u1 < 6 && v > PAVILION.v0 && v < PAVILION.v1, 'its door is on the pavilion\'s plaza side');
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
