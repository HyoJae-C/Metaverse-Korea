// Myeongdong's night food carts (game/night-carts.js, core/night-carts-model.js,
// scripts/build-myeongdong.mjs cartSpots): 8 carts down the middle of the
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
const { CART: BUILD_CART, CART_COUNT, cartSpots, stationExits } = await import('../scripts/build-myeongdong.mjs');

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

test('8 carts in the map, where the builder puts them', () => {
  assert.equal(CART_COUNT, 8);
  assert.equal(spots.length, 8);
  assert.equal(land.store, store?.id);
  cartSpots().forEach(([x, z, ry], i) => {
    assert.ok(Math.hypot(x - spots[i][0], z - spots[i][1]) < 0.15, `cart ${i}`);
    assert.equal(ry, spots[i][2]);
  });
  assert.deepEqual([BUILD_CART.len, BUILD_CART.depth], [CART.len, CART.depth]);
  for (let i = 1; i < spots.length; i++) {
    const d = Math.hypot(spots[i][0] - spots[i - 1][0], spots[i][1] - spots[i - 1][1]);
    assert.ok(d > 7 && d < 11, `cart ${i}: ${d.toFixed(1)} m from the one before`);
  }
});

test('on the shopping street, with room to walk past on both sides and to buy', () => {
  const b = buildNightCarts(store, spots);
  const col = new CollisionMap(buildings);
  const carts = new CollisionMap(b.colliders.map((p) => ({ p })));
  for (const [i, [x, z, ry]] of spots.entries()) {
    assert.ok(!col.blocked(x, z, 1.4), `cart ${i} clear of the buildings`);
    // Across the street from its middle: free for 2 m beyond the cart on each side.
    const nx = Math.sin(ry), nz = Math.cos(ry); // its front
    for (const side of [1, -1]) {
      const edge = CART.depth / 2 + 0.25;
      for (let s = edge; s <= edge + 2; s += 0.25) assert.ok(!col.blocked(x + nx * side * s, z + nz * side * s, 0.3), `cart ${i}: ${side > 0 ? 'front' : 'back'} ${s.toFixed(2)} m`);
    }
    // Where you stand to look at its food: off the cart and off the buildings.
    const [bx, bz] = [x + nx * BUY_Z, z + nz * BUY_Z];
    assert.ok(!col.blocked(bx, bz, 0.35) && !carts.blocked(bx, bz, 0.35), `cart ${i}: its customer's spot`);
  }
  // Not on a station exit or a shop's door.
  for (const e of stationExits()) for (const [x, z] of spots) assert.ok(Math.hypot(x - e.at[0], z - e.at[1]) > 6, 'clear of the station exit');
  for (const s of stores.filter((q) => q.district === 'myeongdong' && q.id !== store.id && q.at)) for (const [x, z] of spots) assert.ok(Math.hypot(x - s.at[0], z - s.at[1]) > 3, `clear of ${s.id}'s door`);
});

test('each cart sells one Myeongdong food, named in every sign language', () => {
  assert.ok(store.carts && store.district === 'myeongdong');
  assert.equal(store.market.stalls.length, 8);
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
  assert.equal(b.bulbs.count, 8);
  assert.equal(b.products.length, 8);
  assert.equal(b.vendors.length, 8);
  let meshes = 0;
  b.group.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes <= 24, `${meshes} meshes`);
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
