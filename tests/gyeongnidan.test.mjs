import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hillGround, hillHeightRel, hillBox } from '../src/core/hill-ground.js';

// Gyeongnidan-gil (scripts/build-gyeongnidan.mjs): Itaewon's hillside street,
// on its real roads from OpenStreetMap.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const itaewon = read('districts/itaewon.json');
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const hill = itaewon.meta.hill;
const osm = JSON.parse(readFileSync(new URL('../scripts/data/gyeongnidan-osm.json', import.meta.url), 'utf8'));
const main = itaewon.roads.find((r) => r.gy && r.main);
const ground = (x, z) => hillHeightRel(hill, x - hill.at[0], z - hill.at[1]); // Itaewon's metres
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(x - ax - dx * t, z - az - dz * t); };

test('the street is the real Hoenamu-ro, at real size, with the OpenStreetMap credit', () => {
  assert.match(osm.license, /OpenStreetMap contributors/);
  assert.match(itaewon.meta.credit, /OpenStreetMap/);
  assert.equal(main.n.en, 'Gyeongnidan-gil (Hoenamu-ro)');
  // From the foot, its real end of the café strip is about 600 m east and 200 m north.
  const [x0, z0] = main.p[0], [x1, z1] = main.p.at(-1);
  assert.deepEqual([x0, z0], hill.at);
  assert.ok(Math.abs(x1 - x0 - 600) < 10 && Math.abs(z1 - z0 + 198) < 10, `ends at ${x1 - x0}, ${z1 - z0}`);
  const len = main.p.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - main.p[i - 1][0], p[1] - main.p[i - 1][1]) : 0), 0);
  assert.ok(len > 620 && len < 680, `about 650 m long (${Math.round(len)})`);
  // The lanes off it keep their real names.
  for (const n of ['Hoenamu-ro 13-gil', 'Hoenamu-ro 26-gil', 'Hoenamu-ro 28-gil', 'Sinheung-ro']) assert.ok(itaewon.roads.some((r) => r.gy && r.n?.en === n), n);
});

test('the street climbs, the lanes north climb on and the lanes south go down to Itaewon', () => {
  assert.equal(ground(...hill.at), 0, 'level with Noksapyeong-daero at the foot');
  let last = -1;
  for (const [x, z] of main.p) { const h = ground(x, z); assert.ok(h >= last - 1e-9, 'never down going east'); last = h; }
  assert.ok(last > 15, `the top is well up (${last} m)`);
  const [mx, mz] = main.p[Math.floor(main.p.length * 0.7)];
  assert.ok(ground(mx, mz - 60) > ground(mx, mz) + 3, 'up the lanes towards Namsan');
  assert.ok(ground(mx, mz + 60) < ground(mx, mz) - 3, 'down the lanes towards Itaewon');
  assert.equal(ground(mx, -7), 0, 'Itaewon-ro below is flat');
  // Off the hill the ground is the city's flat ground, and the world function agrees.
  const g = hillGround(hill, [ox, oz]);
  assert.equal(g(0, 0), 0);
  assert.equal(g(mx + ox, mz + oz), ground(mx, mz));
  const [bx0, bz0, bx1, bz1] = hillBox(hill, [ox, oz]);
  assert.equal(g(bx1 + 1, (bz0 + bz1) / 2), 0);
  assert.equal(g((bx0 + bx1) / 2, bz0 - 1), 0);
});

test('the Itaewon-ro link stays off the hill (it would be under the slope)', () => {
  const link = region.links.find((l) => l.n?.en === 'Itaewon-ro');
  const g = hillGround(hill, [ox, oz]);
  for (let i = 1; i < link.p.length; i++) {
    const [ax, az] = link.p[i - 1], [bx, bz] = link.p[i], n = Math.ceil(Math.hypot(bx - ax, bz - az));
    for (let k = 0; k <= n; k++) for (const o of [-1, 0, 1]) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n + o * link.w / 2;
      assert.ok(g(x, z) < 0.05, `link at ${Math.round(x)}, ${Math.round(z)} is ${g(x, z).toFixed(2)} m under`);
    }
  }
});

test('every lane joins another street (none starts in a field)', () => {
  const roads = itaewon.roads.filter((r) => r.gy);
  const others = (r) => itaewon.roads.filter((o) => o !== r);
  for (const r of roads) {
    const joined = [r.p[0], r.p.at(-1)].some(([x, z]) => others(r).some((o) => o.p.some((q, i) => i && segDist(x, z, o.p[i - 1], q) < o.w / 2 + 1.5)));
    assert.ok(joined, r.n?.en);
  }
});

test('houses stand on the slope with no gap under them, and their floor at the street', () => {
  const hillHouses = itaewon.buildings.filter((b) => b.gy && b.y != null);
  assert.ok(hillHouses.length > 300, 'a lived-in hillside');
  for (const b of hillHouses) {
    const low = Math.min(...b.p.map(([x, z]) => ground(x, z)));
    assert.ok(b.y0 <= low + 1e-9, 'the walls reach the ground on the low side');
    assert.ok(b.y >= b.y0);
  }
});

test('a few of Itaewon\'s own places moved up: a diner, a trattoria, a café and the taproom (no new ones)', () => {
  const stores = read('stores.json').stores;
  const up = stores.filter((s) => { const [x, z] = [s.at[0] - ox, s.at[1] - oz]; return x > hill.at[0] && z < hill.at[1] + 30 && ground(x, z) > 0 || main.p.some((q, i) => i && segDist(x, z, main.p[i - 1], q) < 8); });
  assert.deepEqual(up.map((s) => s.id).sort(), ['dalgona-dabang', 'hilltop-taproom', 'nonna-lucia', 'sunny-side-diner']);
  for (const s of up) {
    const [x, z] = [s.at[0] - ox, s.at[1] - oz];
    assert.ok(main.p.some((q, i) => i && segDist(x, z, main.p[i - 1], q) < main.w / 2 + 1), s.id + ' on the main street');
    assert.ok(!itaewon.buildings.some((b) => inPoly(x, z, b.p)), s.id + ' not inside a building');
    const front = itaewon.buildings.find((b) => b.gy && b.shop === s.id);
    assert.ok(front && front.p.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 10), s.id + ' in front of its house');
  }
  // The taproom is at the top of the hill.
  const tap = up.find((s) => s.id === 'hilltop-taproom');
  assert.ok(ground(tap.at[0] - ox, tap.at[1] - oz) > 15);
});
