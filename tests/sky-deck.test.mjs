import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The builders draw on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { buildSkyDeck, ROOM_SKYDECK, SKYDECK_LAYOUT, SHOW_LEN, VIEW, skyAt, showAt, insideDeck, bearingOf, groundAt } = await import('../src/core/sky-deck.js');
const { roomOf, exitOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { CYCLE_MS, SHOW_FROM, FIREWORKS, DRONES, showOf } = await import('../src/core/show-clock.js');

const R = 0.35;
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const stores = JSON.parse(read('public/regions/another-seoul/stores.json')).stores;
const deck = stores.find((s) => s.id === 'modu-sky');

function reachable(col, room, a, b, step = 0.1) {
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const snap = (v) => Math.round(v / step) * step;
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

test('Modu Sky is a room at Modu Tower in Songpa', () => {
  assert.ok(deck, 'in stores.json');
  assert.equal(deck.workshop, 'skydeck');
  assert.equal(roomOf(deck), ROOM_SKYDECK);
  // Modu Tower (songpa.json landmark at 595, 120, district offset 438, 771): the door is at its foot.
  assert.ok(Math.hypot(deck.at[0] - 1033, deck.at[1] - 891) < 22, 'by the tower');
  for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(deck.name[k] && deck.tagline[k], k);
  assert.ok(!/lotte|롯데/i.test(JSON.stringify(deck)), 'no real brand');
});

test('from the lift you walk straight to the glass floor, every bench and window', () => {
  const room = roomOf(deck), exit = exitOf(room);
  const d = buildSkyDeck(deck, room, exit);
  const col = new CollisionMap(d.colliders);
  const start = { x: exit.x, z: exit.z - 1.4 };
  assert.ok(insideDeck(start.x, start.z, 0.5) && !col.blocked(start.x, start.z, R), 'you arrive on the open floor');
  // Nothing in the way right in front of the lift.
  for (let z = start.z; z > start.z - 4; z -= 0.2) assert.ok(!col.blocked(0, z, R), `clear at z ${z.toFixed(1)}`);
  const G = SKYDECK_LAYOUT.glass;
  assert.ok(reachable(col, room, start, { x: (G.x0 + G.x1) / 2, z: (G.z0 + G.z1) / 2 }), 'glass floor');
  for (const s of d.seats) assert.ok(reachable(col, room, start, { x: s.stand[0], z: s.stand[1] }), 'bench');
  for (let k = 1; k < 8; k++) {
    const phi = (k * Math.PI) / 4, r = 12 - 1.0;
    assert.ok(reachable(col, room, start, { x: Math.sin(phi) * r, z: Math.cos(phi) * r }), `window ${bearingOf(phi)}°`);
  }
  // Nobody walks out through the glass.
  assert.ok(col.blocked(-12.2, 0, R) && col.blocked(0, -12.2, R));
});

test('people are already at the windows, not in walls or on benches', () => {
  const room = roomOf(deck), d = buildSkyDeck(deck, room, exitOf(room));
  const col = new CollisionMap(d.colliders);
  assert.ok(d.stations.visitors.length >= 6);
  for (const v of d.stations.visitors) {
    assert.ok(insideDeck(v.x, v.z, 0.5), `${v.x},${v.z} inside`);
    assert.ok(!col.blocked(v.x, v.z, 0.25), `${v.x},${v.z} free`);
  }
  const G = SKYDECK_LAYOUT.glass;
  assert.ok(d.stations.visitors.some((v) => v.x > G.x0 && v.x < G.x1 && v.z > G.z0 && v.z < G.z1), 'someone on the glass floor');
});

test('the view follows the game day', () => {
  const at = (min) => skyAt(min * 60e3 + 10 * CYCLE_MS);
  assert.equal(at(5).phase, 'morning');
  assert.equal(at(50).phase, 'day');
  assert.equal(at(110).phase, 'sunset');
  assert.equal(at(150).phase, 'night');
  assert.ok(at(150).lights > 0.9 && at(50).lights === 0, 'windows lit at night only');
  assert.ok(at(150).city.r < 0.3 && at(50).city.r > 0.95, 'dark city at night, bright by day');
  assert.ok(at(112).hor.r > at(112).hor.b, 'a warm horizon at sunset');
});

test('the shows show at the real shows\' times, in their real directions', () => {
  assert.equal(SHOW_LEN[FIREWORKS], Number(/SHOW_SECONDS = (\d+)/.exec(read('src/core/fireworks-show.js'))[1]));
  assert.equal(SHOW_LEN[DRONES], Number(/const SHOW_LEN = (\d+)/.exec(read('src/core/drone-sky.js'))[1]));
  let fw = null, dr = null, quiet = null;
  for (let n = 1000; n < 1100 && (fw === null || dr === null || quiet === null); n++) {
    const k = showOf(n);
    if (k === FIREWORKS && fw === null) fw = n; else if (k === DRONES && dr === null) dr = n; else if (k !== FIREWORKS && k !== DRONES && quiet === null) quiet = n;
  }
  const start = (n) => n * CYCLE_MS + SHOW_FROM;
  assert.equal(showAt(start(fw) + 60e3)?.kind, FIREWORKS);
  assert.equal(showAt(start(fw) - 1000), null);
  assert.equal(showAt(start(fw) + (SHOW_LEN[FIREWORKS] + 1) * 1000), null);
  assert.equal(showAt(start(dr) + 600e3)?.kind, DRONES);
  assert.equal(showAt(start(quiet) + 60e3), null);
  // Yeouido to the west, Ttukseom north-west, the Han to the north.
  assert.ok(VIEW.yeouido > 260 && VIEW.yeouido < 290 && VIEW.ttukseom > 290 && VIEW.ttukseom < 330);
  assert.equal(groundAt(0, 1300), 'water', 'the Han, north');
  assert.equal(groundAt(-300, -400), 'water', 'Seokchon Lake, below to the south');
  assert.equal(groundAt(0, 4000), 'city');
});

test('the lift counts every floor, slowly, up and down', async () => {
  const { LIFT, LIFT_MARKS, liftAlong, liftFloor } = await import('../src/core/sky-deck.js');
  assert.ok(LIFT.up >= 6 && LIFT.down >= 4, 'slow enough to watch');
  assert.equal(liftAlong(0), 0);
  assert.equal(liftAlong(1), 1);
  let prev = -1, prevFloor = 0;
  const steps = LIFT.up * 60; // one step a frame
  for (let i = 0; i <= steps; i++) {
    const a = liftAlong(i / steps), f = liftFloor(a);
    assert.ok(a >= prev - 1e-12, 'never goes back');
    assert.ok(f - prevFloor <= 2, `no big jumps (${prevFloor} → ${f})`);
    prev = a; prevFloor = f;
  }
  assert.equal(liftFloor(0), 1);
  assert.equal(liftFloor(1), LIFT.floors);
  for (const [, at] of LIFT_MARKS) assert.ok(at > 0 && at <= LIFT.top);
  const room = roomOf(deck), d = buildSkyDeck(deck, room, exitOf(room));
  assert.equal(typeof d.onLeave, 'function', 'the ride down when leaving');
});

// Namsan Tower's deck (Yozi 2026-11-19): the same room, its own view.
const nDeck = stores.find((s) => s.id === 'namsan-deck');

test('Namsan Tower\'s deck is the same room at the foot of the tower on the summit, free, its view from Namsan', async () => {
  const { SITES, siteOf, wallFor } = await import('../src/core/sky-deck.js');
  assert.ok(nDeck, 'in stores.json');
  assert.equal(nDeck.workshop, 'skydeck');
  assert.equal(siteOf(nDeck), SITES.namsan);
  assert.equal(siteOf(deck), SITES.modu);
  assert.equal(roomOf(nDeck), ROOM_SKYDECK);
  assert.ok(!nDeck.price && nDeck.products.length === 0, 'free, like Modu Sky');
  for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(nDeck.name[k] && nDeck.tagline[k], k);
  // The door: on the summit plaza beside the tower (itaewon.json namsan: the tower at -1488.8, -182.8, the plaza 56 m up).
  const d = Math.hypot(nDeck.at[0] + 1488.8, nDeck.at[1] + 182.8);
  assert.ok(d > 9.5 && d < 13, `the door ${d.toFixed(1)} m from the tower, off its terrace`);
  assert.ok(Math.abs(nDeck.y - 56.06) < 0.2);
  // What's out there, in its real directions from Namsan.
  const S = SITES.namsan;
  assert.equal(groundAt(0, -3800, S), 'water', 'the Han, south');
  assert.equal(groundAt(0, 0, S), 'park', 'Namsan\'s woods below');
  assert.equal(groundAt(0, 2000, S), 'city', 'downtown, north');
  assert.ok(S.view.modu > 100 && S.view.modu < 125 && S.view.yeouido > 225 && S.view.yeouido < 255 && S.view.palace > 330);
  // Every plaque is on a glass wall (not the lift wall), and the lift wall hides none of the famous views.
  for (const [b] of S.plaques) assert.ok(wallFor(b, S.turn) > 0.1, `plaque at ${b}° on glass`);
  for (const b of Object.values(S.view)) assert.notEqual(wallFor(b, S.turn), 0, `${b}° not behind the lift`);
  assert.equal(wallFor(0, 0), Math.PI, 'Modu Sky: north is the wall across from the lift');
});

test('Namsan\'s deck: walk from the lift to every bench and window; no glass floor; people at the windows', async () => {
  const room = roomOf(nDeck), exit = exitOf(room);
  const d = buildSkyDeck(nDeck, room, exit);
  const col = new CollisionMap(d.colliders);
  const start = { x: exit.x, z: exit.z - 1.4 };
  for (const s of d.seats) assert.ok(reachable(col, room, start, { x: s.stand[0], z: s.stand[1] }), 'bench');
  for (let k = 1; k < 8; k++) {
    const phi = (k * Math.PI) / 4, r = 12 - 1.0;
    assert.ok(reachable(col, room, start, { x: Math.sin(phi) * r, z: Math.cos(phi) * r }), `window ${k}`);
  }
  assert.ok(d.stations.visitors.length >= 6);
  for (const v of d.stations.visitors) assert.ok(!col.blocked(v.x, v.z, 0.25) && insideDeck(v.x, v.z, 0.5));
  assert.ok(!d.scene.children.some((o) => o.material?.opacity === 0.12), 'no glass floor');
  const { SITES } = await import('../src/core/sky-deck.js');
  const L = SITES.namsan.lift;
  assert.ok(L.up >= 5 && L.down >= 4 && L.top > L.from && L.marks.every(([, m]) => m > L.from && m <= L.top));
});
