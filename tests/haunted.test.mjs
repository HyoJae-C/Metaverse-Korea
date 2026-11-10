import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The builders draw their signs on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { HAUNT, HAUNT_SPOT, HAUNT_STORE, LAYOUT, buildHauntedFacade, buildHauntedHouse, nearPortraits, ghostTrigger } = await import('../src/core/haunted.js');
const { buildThemePark } = await import('../src/core/themepark.js');
const { ROOM_SIZES, exitOf, roomOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { saveRecord, loadRecords } = await import('../src/core/arcade.js');

const R = 0.35; // the player's radius
const cost = (root) => {
  let calls = 0, tris = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    calls++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return { calls, tris };
};
// Can you walk from a to b? (a grid flood fill over the walkable floor)
function reachable(col, room, a, b, step = 0.25) {
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const seen = new Set([key(a.x, a.z)]), q = [[a.x, a.z]];
  while (q.length) {
    const [x, z] = q.shift();
    if (Math.hypot(x - b.x, z - b.z) < 0.6) return true;
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      const bx = roomBox(room);
      if (nx < bx.x0 + 0.5 || nx > bx.x1 - 0.5 || nz < bx.z0 + 0.5 || nz > bx.z1 - 0.5 || seen.has(key(nx, nz)) || col.blocked(nx, nz, R)) continue;
      seen.add(key(nx, nz));
      q.push([nx, nz]);
    }
  }
  return false;
}

test('the house fits its outline and stays light for phones', () => {
  const { group } = buildHauntedFacade();
  const { calls, tris } = cost(group);
  assert.ok(calls <= 12, `draw calls ${calls}`);
  assert.ok(tris <= 2500, `triangles ${tris}`);
});

test('in the park: the door spot is free, in bounds, and you can walk there from the gate', () => {
  const room = ROOM_SIZES.themepark;
  const park = buildThemePark({}, room, exitOf(room));
  const col = new CollisionMap(park.colliders);
  assert.deepEqual(park.stations.hauntedHouse, [HAUNT_SPOT]);
  assert.ok(!col.blocked(HAUNT_SPOT.x, HAUNT_SPOT.z, R));
  assert.ok(HAUNT.x - HAUNT.w / 2 > roomBox(room).x0 && HAUNT.z + HAUNT.d / 2 < roomBox(room).z1);
  const spawn = { x: exitOf(room).x, z: exitOf(room).z - 1.4 };
  assert.ok(reachable(col, room, spawn, HAUNT_SPOT), 'gate → haunted house');
  // Not on top of a bench seat or a ride's boarding spot.
  for (const s of park.seats) assert.ok(Math.hypot(s.stand[0] - HAUNT_SPOT.x, s.stand[1] - HAUNT_SPOT.z) > 1.5);
  for (const r of park.rides) assert.ok(Math.hypot(r.x - HAUNT_SPOT.x, r.z - HAUNT_SPOT.z) > 4);
});

test('inside: foyer → corridor → lantern room, and back out; within budget', () => {
  const room = roomOf(HAUNT_STORE);
  assert.equal(room, ROOM_SIZES.medium);
  const exit = exitOf(room);
  const h = buildHauntedHouse(HAUNT_STORE, room, exit);
  const col = new CollisionMap(h.colliders);
  const spawn = { x: exit.x, z: exit.z - 1.4 };
  const st = h.stations.hauntGallery[0];
  assert.ok(!col.blocked(st.x, st.z, R));
  assert.ok(reachable(col, room, spawn, st), 'entrance → lantern room');
  assert.ok(reachable(col, room, st, exit), 'lantern room → exit');
  // The walk really bends: straight ahead from the door is a partition.
  assert.ok(col.blocked(0, LAYOUT.a.z, R) && col.blocked(0, LAYOUT.b.z, R));
  const { calls, tris } = cost(h.scene);
  assert.ok(calls <= 35, `draw calls ${calls}`);
  assert.ok(tris <= 8000, `triangles ${tris}`);
  assert.deepEqual(h.products, []);
  assert.deepEqual(h.seats, []);
});

test('each scare runs once per visit, and again on the next visit', () => {
  const room = ROOM_SIZES.medium;
  const h = buildHauntedHouse(HAUNT_STORE, room, exitOf(room));
  const heard = [];
  h.onScare = (k) => heard.push(k);
  const walk = [[0, 3.2], [5, 2.5], [5, 0], [2, 0], [-1, 0], [-4, 0], [-5, -1], [-5, -3], [0, -3]];
  for (let lap = 0; lap < 2; lap++) {
    h.resetVisit();
    for (const [x, z] of walk) for (let i = 0; i < 10; i++) h.tick(0.1, { x, z });
  }
  assert.deepEqual(heard, ['eyes', 'ghost', 'eyes', 'ghost']);
  assert.ok(h.scene.children.some((o) => o.isGroup && o.position.y > 0.5), 'the ghost is up');
  h.resetVisit();
  assert.ok(!h.scene.children.some((o) => o.isGroup && o.position.y > -1), 'and hidden again');
});

test('scare spots: the portraits along the corridor, the ghost round its far end', () => {
  assert.ok(nearPortraits({ x: 3, z: 0 }) && !nearPortraits({ x: 0, z: 3 }) && !nearPortraits({ x: 0, z: -3 }));
  assert.ok(ghostTrigger({ x: -4, z: 0 }) && !ghostTrigger({ x: 2, z: 0 }) && !ghostTrigger({ x: -4, z: 3 }));
});

test('the ghost lantern keeps its own record next to the balloon booth', () => {
  const mem = new Map();
  const s = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.ok(saveRecord(s, 'gallery', 120));
  assert.ok(saveRecord(s, 'hauntGallery', 60));
  assert.ok(!saveRecord(s, 'hauntGallery', 40));
  assert.deepEqual(loadRecords(s), { gallery: 120, hauntGallery: 60 });
  const ui = readFileSync(new URL('../src/ui/gallery-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /record: 'gallery'/);
  assert.match(ui, /record: 'hauntGallery'/);
});

test('the arcade opens the ghost lantern with its own panel (not the darts one)', () => {
  const src = readFileSync(new URL('../src/game/arcade.js', import.meta.url), 'utf8');
  assert.match(src, /kind === 'hauntGallery'[\s\S]{0,200}\$\('haunt-panel'\)/);
  assert.match(src, /else if \(kind === 'darts'\)/);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /id="haunt-panel"/);
});

test('Another Land spread out: every ride gate, food truck and the clown is a walk from the gate, and the rides stand apart', async () => {
  const { RIDE_GATES, UNDER_RIDES, FOOD_TRUCKS, CLOWN, truckWindow, RIDES } = await import('../src/core/park-rides.js');
  const { GATE: BUMPER_GATE } = await import('../src/core/bumper-cars.js');
  const room = ROOM_SIZES.themepark;
  const park = buildThemePark({ workshop: 'themepark' }, room, exitOf(room));
  const col = new CollisionMap(park.colliders);
  const spawn = exitOf(room);
  const spots = {
    ...Object.fromEntries(UNDER_RIDES.map((k) => [k, RIDE_GATES[k]])),
    bumper: BUMPER_GATE, // (the coaster and four rides are up on the island: coaster.test.mjs)
    ...Object.fromEntries(FOOD_TRUCKS.map((f) => [f.id, truckWindow(f)])),
    clown: { x: CLOWN.x - 1.6, z: CLOWN.z },
  };
  for (const [name, s] of Object.entries(spots)) {
    assert.ok(!col.blocked(s.x, s.z, R), `${name} spot is free`);
    assert.ok(reachable(col, room, spawn, s), `gate → ${name}`);
  }
  // Not bunched up: the rides round the plaza are at least 18 m apart.
  const ks = ['carousel', 'viking', 'teacups'];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = RIDES[ks[i]], b = RIDES[ks[j]];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 18, `${ks[i]} ↔ ${ks[j]}`);
  }
});
