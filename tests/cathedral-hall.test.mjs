import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The builders draw their glass on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { buildCathedralHall, ROOM_CATHEDRAL, HALL_LAYOUT } = await import('../src/core/cathedral-hall.js');
const { MASS_CYCLE, CATHEDRAL_TEXT } = await import('../src/core/cathedral-mass.js');
const { ROOM_SIZES, exitOf, roomOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { trackById } = await import('../src/data/tracks.js');
const { DOOR } = await import('../scripts/build-myeongdong.mjs');

const R = 0.35; // the player's radius
const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const store = stores.find((s) => s.id === 'myeongdong-cathedral');

// Can you walk from a to b? (a grid flood fill over the walkable floor)
function reachable(col, room, a, b, step = 0.25) {
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const seen = new Set([key(a.x, a.z)]), q = [[a.x, a.z]];
  const bx = roomBox(room);
  while (q.length) {
    const [x, z] = q.shift();
    if (Math.hypot(x - b.x, z - b.z) < 0.6) return true;
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < bx.x0 + 0.5 || nx > bx.x1 - 0.5 || nz < bx.z0 + 0.5 || nz > bx.z1 - 0.5 || seen.has(key(nx, nz)) || col.blocked(nx, nz, R)) continue;
      seen.add(key(nx, nz));
      q.push([nx, nz]);
    }
  }
  return false;
}

test('the cathedral is a room entered by its own door', () => {
  assert.ok(store, 'myeongdong-cathedral is in stores.json');
  assert.equal(store.workshop, 'cathedral');
  assert.equal(store.front, 'landmark'); // no shop sign on the bell tower
  assert.equal(roomOf(store), ROOM_CATHEDRAL);
  assert.equal(ROOM_SIZES.cathedral, ROOM_CATHEDRAL);
  assert.deepEqual(store.at, DOOR.at, 'the door is where the build script puts it');
  assert.ok(Math.abs(store.face - -2.628) < 0.01, 'you come out facing away from the church');
  for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(store.name[l] && store.tagline[l], l);
  for (const k of Object.keys(CATHEDRAL_TEXT)) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(CATHEDRAL_TEXT[k][l], `${k}.${l}`);
});

test('every pew seat can be reached from the door and stood up from', () => {
  const room = roomOf(store), exit = exitOf(room);
  const h = buildCathedralHall(store, room, exit);
  const col = new CollisionMap(h.colliders);
  const P = HALL_LAYOUT.pews;
  assert.ok(h.seats.length >= 70, `${h.seats.length} free seats`);
  assert.equal(h.seats.length + h.stations.patrons.length, P.rows * P.xs.length * 2, 'every place on the pews is a seat or a worshipper');
  assert.ok(h.stations.patrons.length >= 10, `${h.stations.patrons.length} people already sitting`);
  assert.ok(!col.blocked(exit.x, exit.z, R), 'the door is clear');
  const ends = new Set();
  for (const s of h.seats) {
    assert.ok(!col.blocked(s.stand[0], s.stand[1], R), `stand spot of the seat at ${s.x}, ${s.z} is clear`);
    assert.equal(s.ry, Math.PI, 'seats face the altar');
    // (one per row half is enough for the flood fill: the rest share its walkway)
    const k = `${Math.sign(s.x)},${s.z}`;
    if (ends.has(k)) continue;
    ends.add(k);
    assert.ok(reachable(col, room, exit, { x: s.stand[0], z: s.stand[1] }), `seat row at ${s.x}, ${s.z} reachable`);
  }
  // The sanctuary is closed off (the priest's), and the camera stays inside.
  assert.ok(col.blocked(0, HALL_LAYOUT.altar.z, R) && col.blocked(0, HALL_LAYOUT.sanctuary - 0.5, R));
  assert.ok(h.camBlocked(ROOM_CATHEDRAL.w / 2 + 1, 0) && !h.camBlocked(0, 0));
});

test('the cathedral stays light: few draw calls', () => {
  const room = roomOf(store);
  const h = buildCathedralHall(store, room, exitOf(room));
  let calls = 0, tris = 0;
  h.scene.traverse((o) => { if (o.isMesh) { calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  assert.ok(calls <= 40, `${calls} draw calls`);
  assert.ok(tris <= 60000, `${tris} triangles`);
});

test('the Mass fits its cycle and the organ is quiet, slow and has no words', () => {
  assert.ok(MASS_CYCLE >= 120 && MASS_CYCLE <= 240);
  const organ = trackById('organ');
  assert.equal(organ.id, 'organ');
  assert.ok(organ.hidden, 'not in the record list');
  assert.ok(organ.organ && organ.bpm <= 70 && !organ.kick.length && !organ.snare.length && !organ.hat);
  const secs = (organ.steps / 2) * (60 / organ.bpm);
  assert.ok(secs >= 60 && secs <= 90, `${secs.toFixed(0)} s loop`);
});
