import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The builders draw on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { buildCathedralHall, HALL_LAYOUT } = await import('../src/core/cathedral-hall.js');
const { buildConfessionRoom, ROOM_CONFESSION, CONFESSION_LAYOUT, CONFESSION_STORE, CONFESSION_TEXT, replyFor, replyOrder } = await import('../src/core/confession-room.js');
const { ROOM_SIZES, exitOf, roomOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');

const R = 0.35; // the player's radius
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const stores = JSON.parse(read('public/regions/another-seoul/stores.json')).stores;
const cathedral = stores.find((s) => s.id === 'myeongdong-cathedral');

function reachable(col, room, a, b, step = 0.1) {
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const snap = (v) => Math.round(v / step) * step; // (start on the grid: no rounding ties)
  const seen = new Set([key(snap(a.x), snap(a.z))]), q = [[snap(a.x), snap(a.z)]];
  const bx = roomBox(room);
  while (q.length) {
    const [x, z] = q.shift();
    if (Math.hypot(x - b.x, z - b.z) < 0.3) return true;
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < bx.x0 + R || nx > bx.x1 - R || nz < bx.z0 + R || nz > bx.z1 - R || seen.has(key(nx, nz)) || col.blocked(nx, nz, R)) continue;
      seen.add(key(nx, nz));
      q.push([nx, nz]);
    }
  }
  return false;
}

test('the confessional in the nave can be walked up to from the door', () => {
  const room = roomOf(cathedral), exit = exitOf(room);
  const h = buildCathedralHall(cathedral, room, exit);
  const col = new CollisionMap(h.colliders);
  const [st] = h.stations.confessional;
  assert.ok(!col.blocked(st.x, st.z, R), 'the spot in front of it is clear');
  assert.ok(reachable(col, room, exit, st, 0.25), 'reachable from the cathedral door');
  const K = HALL_LAYOUT.confessional;
  assert.ok(col.blocked(K.x, K.z, R), 'the booth itself is solid');
  assert.ok(K.x + K.w / 2 <= HALL_LAYOUT.aisle + 0.01, 'against the aisle wall, not through it');
  for (const z of HALL_LAYOUT.bays) assert.ok(Math.abs(z - K.z) > K.d / 2 + 0.4 || K.x - K.w / 2 > HALL_LAYOUT.nave + 0.5, 'clear of the columns');
});

test('the confession room: alone, a seat by the lattice, the priest out of reach', () => {
  assert.equal(CONFESSION_STORE.solo, true, 'nobody else is ever in it');
  assert.equal(roomOf(CONFESSION_STORE), ROOM_CONFESSION);
  assert.equal(ROOM_SIZES.confession, ROOM_CONFESSION);
  const room = ROOM_CONFESSION, exit = exitOf(room);
  const h = buildConfessionRoom(CONFESSION_STORE, room, exit);
  const col = new CollisionMap(h.colliders);
  const spawn = { x: exit.x, z: exit.z - 1.4 }; // where enterStore puts you
  assert.ok(!col.blocked(spawn.x, spawn.z, R), 'you come in on a clear spot');
  assert.equal(h.seats.length, 1);
  const s = h.seats[0];
  assert.equal(s.ry, Math.PI, 'the seat faces the lattice');
  assert.ok(!col.blocked(s.stand[0], s.stand[1], R), 'you can stand up from it');
  assert.ok(reachable(col, room, spawn, { x: s.stand[0], z: s.stand[1] }), 'the seat is reachable');
  assert.ok(reachable(col, room, { x: s.stand[0], z: s.stand[1] }, exit), 'and the door from it');
  const P = h.stations.confession.priest;
  assert.ok(P.z < CONFESSION_LAYOUT.screen && s.z > CONFESSION_LAYOUT.screen, 'the lattice is between you');
  assert.ok(!reachable(col, room, spawn, P), "his side can't be walked into");
  assert.ok(h.camBlocked(0, CONFESSION_LAYOUT.screen - 0.2) && !h.camBlocked(0, 1), 'the camera stays on your side');
  let calls = 0;
  h.scene.traverse((o) => { if (o.isMesh) calls++; });
  assert.ok(calls <= 16, `${calls} draw calls`);
});

test('the priest answers in every main language, a blessing every fourth line', () => {
  for (const [k, v] of Object.entries(CONFESSION_TEXT)) {
    for (const o of k === 'replies' ? v : [v]) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(o[l], `${k}.${l}`);
  }
  for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(CONFESSION_STORE.name[l] && CONFESSION_STORE.tagline[l], l);
  const order = replyOrder(CONFESSION_TEXT.replies.length, () => 0.5);
  assert.deepEqual([...order].sort(), [...CONFESSION_TEXT.replies.keys()]);
  const said = [];
  for (let k = 1; k <= 12; k++) said.push(replyFor(k, order));
  assert.equal(said[3], CONFESSION_TEXT.blessing);
  assert.equal(said[7], CONFESSION_TEXT.blessing);
  const answers = said.filter((x) => x !== CONFESSION_TEXT.blessing);
  assert.equal(new Set(answers.slice(0, CONFESSION_TEXT.replies.length)).size, CONFESSION_TEXT.replies.length, 'no answer twice before all have come');
});

test('nothing typed in the confession room leaves the device', () => {
  // The room's code has no way out: no network, no storage.
  const room = read('src/core/confession-room.js').replace(/\/\/.*$/gm, '');
  for (const w of ['fetch(', 'localStorage', 'sessionStorage', 'indexedDB', 'supabase', '.rpc(', 'sendChat', 'WebSocket', 'cloud']) assert.ok(!room.includes(w), `confession-room.js has no ${w}`);
  // hear() keeps only a count, never the words.
  assert.match(room, /hear\(text\) \{\s*if \(!String\(text \?\? ''\)\.trim\(\)\) return;\s*this\.heard\+\+;/);
  // The chat bar hands the line to the priest before anything that sends,
  // logs or counts it.
  const chat = read('src/game/chat.js');
  const submit = chat.indexOf("chatBar.addEventListener('submit'");
  const booth = chat.indexOf('if (booth) {', submit);
  const end = chat.indexOf('return;', booth);
  assert.ok(submit > 0 && booth > submit, 'the confession branch is in the submit handler');
  for (const w of ['sendNotice', 'sendFriend(', 'game.net.sendChat', 'addChatLine(game.nickname', 'onChatSent', 'redeemCode']) {
    const at = chat.indexOf(w, submit);
    assert.ok(at > end, `${w} comes after the confession branch returns`);
  }
  assert.ok(!chat.slice(booth, end).includes('addChatLine') && !chat.slice(booth, end).includes('net'), 'not logged, not sent');
  // Inside, the game is out of multiplayer, and reports only "the cathedral".
  const main = read('src/main.js');
  assert.match(main, /else if \(store\.solo\) goSolo\(built\.scene\);/);
  assert.match(main, /interior\?\.store\?\.solo \? interior\.front\?\.parkFront\?\.store\?\.id/);
});
