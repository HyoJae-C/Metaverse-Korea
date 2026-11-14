// Myeongdong's night food carts (game/night-carts.js, core/night-carts-model.js,
// scripts/build-myeongdong.mjs cartSpots): 16 carts along both sides of the
// shopping street, out from sunset to morning, each with a small lamp and
// one kind of food. (Yozi 2026-11-11)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { buildNightCarts, CART, BUY_Z } = await import('../src/core/night-carts-model.js');
const { cartsOut } = await import('../src/game/night-carts.js');
const { CYCLE_MS, NIGHT_FROM, CYCLE, cycleNumber } = await import('../src/core/show-clock.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { CART: BUILD_CART, CART_COUNT, cartSpots, stationExits, STREET_DOORS } = await import('../scripts/build-myeongdong.mjs');

const R = 'public/regions/another-seoul/';
const read = (f) => JSON.parse(readFileSync(new URL('../' + R + f, import.meta.url)));
const stores = read('stores.json').stores;
const store = stores.find((s) => s.id === 'myeongdong-night-carts');
const region = read('region.json');
const [ox, oz] = region.districts.find((d) => d.id === 'myeongdong').offset;
const map = read('districts/myeongdong.json');
const land = map.landmarks.find((l) => l.type === 'nightcarts');
const spots = land.carts.map(([x, z, ry]) => [land.x + x + ox, land.z + z + oz, ry]); // world metres
const buildings = map.buildings.map((b) => ({ ...b, p: b.p.map(([x, z]) => [x + ox, z + oz]) }));

test('16 carts in the map, where the builder puts them', () => {
  assert.equal(CART_COUNT, 16);
  assert.equal(spots.length, 16);
  assert.equal(land.store, store?.id);
  cartSpots(STREET_DOORS).forEach(([x, z, ry], i) => {
    assert.ok(Math.hypot(x - spots[i][0], z - spots[i][1]) < 0.15, `cart ${i}`);
    assert.equal(ry, spots[i][2]);
  });
  assert.deepEqual([BUILD_CART.len, BUILD_CART.depth], [CART.len, CART.depth]);
  // eight a side, none on top of another
  for (const [i, a] of spots.entries()) for (const b of spots.slice(i + 1)) assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 3, `cart ${i}`);
});

test('along the shop fronts, the middle of the street open, room to buy', () => {
  const b = buildNightCarts(store, spots);
  const col = new CollisionMap(buildings);
  const carts = new CollisionMap(b.colliders.map((p) => ({ p })));
  for (const [i, [x, z, ry]] of spots.entries()) {
    assert.ok(!col.blocked(x, z, 1.4), `cart ${i} clear of the buildings`);
    // In front of it, towards the middle of the street: open for 4 m (other carts too).
    const nx = Math.sin(ry), nz = Math.cos(ry); // its front
    const edge = CART.depth / 2 + 0.55; // (past its own footprint)
    for (let s = edge; s <= edge + 4; s += 0.25) assert.ok(!col.blocked(x + nx * s, z + nz * s, 0.3) && !carts.blocked(x + nx * s, z + nz * s, 0.3), `cart ${i}: ${s.toFixed(2)} m in front`);
    // Where you stand to look at its food: off the cart and off the buildings.
    const [bx, bz] = [x + nx * BUY_Z, z + nz * BUY_Z];
    assert.ok(!col.blocked(bx, bz, 0.35) && !carts.blocked(bx, bz, 0.35), `cart ${i}: its customer's spot`);
  }
  // Not on a station exit or a shop's door.
  for (const e of stationExits()) for (const [x, z] of spots) assert.ok(Math.hypot(x - e.at[0], z - e.at[1]) > 6, 'clear of the station exit');
  assert.ok(STREET_DOORS.length >= 4, 'the shops on the street');
  for (const d of STREET_DOORS) for (const [x, z] of spots) assert.ok(Math.hypot(x - d[0], z - d[1]) > 4.5, `clear of the door at ${d}`);
});

test('each cart sells one Myeongdong food, named in every sign language', () => {
  assert.ok(store.carts && store.district === 'myeongdong');
  assert.equal(store.market.stalls.length, 16);
  for (const stall of store.market.stalls) {
    const goods = store.products.filter((p) => p.stall === stall.id);
    assert.equal(goods.length, 1, stall.id);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(stall.name[l] && goods[0].name[l] && goods[0].desc[l], `${stall.id} ${l}`);
    assert.ok(goods[0].price > 0);
  }
  // Not the Han River market's food again (Yozi: rare things in the right place).
  const river = stores.find((s) => s.id === 'ttukseom-hangang').products.map((p) => p.name.en);
  for (const p of store.products) assert.ok(!river.includes(p.name.en), p.name.en);
});

test('a lamp on each cart, all of them in a handful of draw calls', () => {
  const b = buildNightCarts(store, spots);
  assert.equal(b.bulbs.count, 16);
  assert.equal(b.products.length, 16);
  assert.equal(b.vendors.length, 16);
  let meshes = 0;
  b.group.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes <= 32, `${meshes} meshes`); // (the parts: about a dozen for all 16; the rest their food)
  b.setNight(1);
  b.setNight(0);
});

test('out from sunset to morning, in again for the day', () => {
  const C0 = cycleNumber(Date.UTC(2026, 10, 11)) * CYCLE_MS, MIN = 60e3;
  const sunset = (CYCLE.morning + CYCLE.day) * MIN;
  assert.equal(cartsOut(C0 + 30 * MIN), false, 'morning');
  assert.equal(cartsOut(C0 + sunset - MIN), false, 'the end of the day');
  assert.equal(cartsOut(C0 + sunset + MIN), true, 'sunset');
  assert.equal(cartsOut(C0 + NIGHT_FROM + 30 * MIN), true, 'night');
  assert.equal(cartsOut(C0 + CYCLE_MS - MIN), true, 'just before morning');
  // a cycle's share out: sunset and night, 82.5 of 180 minutes
  let out = 0;
  for (let m = 0; m < 180; m++) out += cartsOut(C0 + (m + 0.5) * MIN);
  assert.ok(Math.abs(out - 82.5) <= 1, `${out} minutes`);
});

test('a cart blocks only while it is out', () => {
  let shown = false;
  const col = new CollisionMap([]);
  col.add([{ p: [[-1, -1], [1, -1], [1, 1], [-1, 1]], low: true, off: () => !shown }]);
  assert.equal(col.blocked(0, 0, 0.3), false);
  shown = true;
  assert.equal(col.blocked(0, 0, 0.3), true);
});
