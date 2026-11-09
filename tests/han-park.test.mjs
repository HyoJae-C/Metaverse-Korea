import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Han River parks laid straight on the street (game/han-parks.js, core/han-park.js).
// The builders draw their signs on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { buildHanPark } = await import('../src/core/han-park.js');
const { CollisionMap, pointInPoly } = await import('../src/core/collision.js');
const { onWater, DuckRide } = await import('../src/core/duck-boat.js');
const { createHanParks } = await import('../src/game/han-parks.js');
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const stores = read('stores.json').stores;
const region = read('region.json');
const R = 0.35; // about a player

// Every park laid on the street: [store, landmark (world metres), district map].
const streetParks = region.districts.flatMap((d) => {
  const map = read(d.map);
  return (map.landmarks || []).filter((l) => l.type === 'hanpark').map((l) => ({ l: { ...l, x: l.x + d.offset[0], z: l.z + d.offset[1] }, map, d, store: stores.find((s) => s.id === l.store) }));
});

test('Banpo-Jamwon is laid on the street: no room, no door, no open-air overlay', () => {
  const banpo = streetParks.find((p) => p.store?.id === 'banpo-jamwon-hangang');
  assert.ok(banpo, 'its hanpark landmark');
  assert.equal(banpo.store.open, undefined, 'not the old room drawn over the street');
  assert.equal(banpo.store.hanpark, true);
});

for (const { l, store, map, d } of streetParks) {
  test(`${store.id}: everything has room, on land or on its pier, and each spot can be reached`, () => {
    const b = buildHanPark(store, l.layout);
    const col = new CollisionMap(b.colliders);
    const [x0, z0, x1, z1] = l.bounds;
    const inside = (x, z) => x > x0 && x < x1 && z > z0 && z < z1;
    const onPier = (x, z) => b.decks.some((p) => pointInPoly(x, z, p));
    // Where you stand to do things: on land (z > 0) or the pier, not in a wall.
    const spots = [...b.fishing.map((f) => ['fish', f]), ['ramen', b.ramen], ['fish buyer', b.fishBuy], ...b.products.map((p) => [p.product.id, p.pos]), ...b.seats.map((s, i) => ['stand ' + i, { x: s.stand[0], z: s.stand[1] }])];
    for (const [what, q] of spots) {
      assert.ok(q && inside(q.x, q.z), `${what} in the park`);
      assert.ok(q.z > 0.3 || onPier(q.x, q.z), `${what} on land (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`);
      assert.ok(!col.blocked(q.x, q.z, R), `${what} not in a wall (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`);
    }
    // The goods on the counters can each be looked at: none blocked, kiosk and stalls all there.
    assert.equal(b.products.filter((p) => p.product.kiosk).length, Math.min(3, store.products.filter((p) => p.kiosk).length));
    assert.equal(b.vendors.length, store.market.stalls.length, 'a seller at each stall');
    assert.ok(b.fishing.filter((f) => f.lucky).length === 1, 'one lucky spot');
    // The boats stay on their water, off the pier, and come home.
    if (b.ducks.length) {
      for (const dk of b.ducks) assert.ok(dk.home.z < -1, 'moored on the water');
      for (const [x, z] of [[-200, -5], [200, -30], [b.ducks[0].home.x, 5]]) {
        const [wx, wz] = onWater(x, z, b.duckArea);
        assert.ok(wz <= b.duckArea.water.maxZ && wx >= b.duckArea.water.minX, 'on the water');
      }
      const ride = new DuckRide(b.ducks[0].home, 60, b.duckArea);
      for (let i = 0; i < 300; i++) ride.steer(-1, -1, 0.05);
      ride.goBack();
      for (let i = 0; i < 2000 && !ride.docked; i++) ride.steer(0, 0, 0.05);
      assert.ok(ride.docked, 'pedals itself back to the dock');
    }
  });

  test(`${store.id}: it sits on its district's bank, clear of roads, buildings and the bridge`, () => {
    const b = buildHanPark(store, l.layout);
    const c = Math.cos(l.ry), s = Math.sin(l.ry);
    const toWorld = ([x, z]) => [l.x - d.offset[0] + x * c + z * s, l.z - d.offset[1] - x * s + z * c]; // (the district's own metres)
    const roadHit = (x, z, r) => map.roads.some((rd) => rd.k !== 'walk' && rd.p.some((q, i) => i > 0 && segDist(x, z, rd.p[i - 1], q) < rd.w / 2 + r));
    for (const k of b.colliders) for (const q of k.p) {
      const [x, z] = toWorld(q);
      assert.ok(!roadHit(x, z, 0.2), `a keep-out box on a road at (${q[0].toFixed(1)}, ${q[1].toFixed(1)})`);
      assert.ok(!map.buildings.some((bd) => pointInPoly(x, z, bd.p)), 'not in a building');
    }
    // A taxi or the map drops you in the park, where you can stand.
    const [ax, az] = [store.at[0] - d.offset[0], store.at[1] - d.offset[1]];
    const [alx, alz] = [(ax - (l.x - d.offset[0])) * c - (az - (l.z - d.offset[1])) * s, (ax - (l.x - d.offset[0])) * s + (az - (l.z - d.offset[1])) * c];
    const [bx0, bz0, bx1, bz1] = l.bounds;
    assert.ok(alx > bx0 && alx < bx1 && alz > 0 && alz < bz1, `dropped in the park (${alx.toFixed(1)}, ${alz.toFixed(1)})`);
    assert.ok(!map.buildings.some((bd) => pointInPoly(ax, az, bd.p)) && !b.colliders.some((k) => pointInPoly(alx, alz, k.p)), 'where you can stand');
    // You can step onto the pier from the bank: the river's edge doesn't block its deck.
    if (b.decks.length) {
      // (the river's blockers: the district's own and the region's water between districts, in world metres)
      const shift = (p) => p.map(([x, z]) => [x + d.offset[0], z + d.offset[1]]);
      const river = [...(map.blockers || []).map((bk) => ({ p: shift(bk.p) })), ...(region.water || []).flatMap((w) => (w.blockers || [w]).map((bk) => ({ p: bk.p || bk })))];
      const W = (q) => shift([toWorld(q)])[0];
      const world = new CollisionMap(river);
      for (const p of b.decks) world.addDeck(p.map(W));
      world.add(b.colliders.map((k) => ({ p: k.p.map(W) })));
      const px = l.layout.pier.x;
      for (let z = 1; z > -l.layout.pier.len + 0.6; z -= 0.5) { const [x, wz] = W([px, z]); assert.ok(!world.blocked(x, wz, R), `on the pier at z ${z}`); }
      const [ox, oz] = W([px + 6, -3]);
      assert.ok(world.blocked(ox, oz, R), 'off the pier is still the river');
    }
  });
}

function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(ax + t * dx - x, az + t * dz - z);
}

test('a park on the street turns its spots into the street\'s metres, and back', () => {
  const l = { type: 'hanpark', store: 'p', x: 100, z: -50, ry: 0.7, bounds: [-10, -10, 10, 10], layout: {} };
  const hp = createHanParks({ landmarks: [l], store: () => ({ id: 'p' }) });
  for (const [x, z] of [[0, 0], [3, -4], [-7.5, 2]]) {
    const [wx, wz] = hp.toWorld(hp.parks[0], x, z), [lx, lz] = hp.toLocal(hp.parks[0], wx, wz);
    assert.ok(Math.abs(lx - x) < 1e-9 && Math.abs(lz - z) < 1e-9);
  }
  // Like three.js: the park's +x (along the bank) turned by ry.
  const [ax, az] = hp.toWorld(hp.parks[0], 1, 0);
  assert.ok(Math.abs(ax - 100 - Math.cos(0.7)) < 1e-9 && Math.abs(az + 50 + Math.sin(0.7)) < 1e-9);
});

test('a deck lets you walk over what was there before, but not over what comes after', () => {
  const col = new CollisionMap([{ p: [[0, 0], [10, 0], [10, 10], [0, 10]] }]);
  assert.ok(col.blocked(5, 5, 0.3));
  col.addDeck([[4, -1], [6, -1], [6, 11], [4, 11]]);
  assert.ok(!col.blocked(5, 5, 0.3), 'on the deck');
  col.add([{ p: [[4.9, 4.9], [5.1, 4.9], [5.1, 5.1], [4.9, 5.1]] }]);
  assert.ok(col.blocked(5, 5, 0.3), 'a post put on the deck later still counts');
  assert.ok(col.blocked(8, 5, 0.3), 'beside the deck: still blocked');
});
