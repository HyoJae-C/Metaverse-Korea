// Holy water at Myeongdong Cathedral's door (game/holy-water.js) and the
// host at its Mass (core/cathedral-mass.js) (Yozi 2026-11-16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { buildCathedralHall } = await import('../src/core/cathedral-hall.js');
const { roomOf, exitOf } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { createHolyWater, HOLY_WATER_TEXT, REACH } = await import('../src/game/holy-water.js');
const { STUDIO_MOVES, HOLY_SIGN } = await import('../src/core/studio-moves.js');

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const store = stores.find((s) => s.id === 'myeongdong-cathedral');
const room = roomOf(store);
const hall = buildCathedralHall(store, room, exitOf(room));

test('a font on each side of the door, and you can stand at it', () => {
  const fonts = hall.stations.font;
  assert.equal(fonts.length, 2);
  const col = new CollisionMap(hall.colliders);
  for (const f of fonts) {
    assert.ok(col.blocked(f.x, f.z, 0.1), 'the font itself is solid');
    assert.ok(!col.blocked(f.x, f.z + REACH, 0.2), 'the spot in front of it (door side) is open');
  }
});

function setup() {
  let t = 100, toasts = 0;
  const me = { root: { position: { x: 0, z: 0 }, rotation: { y: 0 } } };
  const hw = createHolyWater({ me, mode: 'store', interior: hall, toast: () => toasts++ }, () => t);
  return { hw, me, step: (s) => { t += s; }, toasts: () => toasts };
}

test('by a font: dip your fingers, one sign of the cross, then done', () => {
  const { hw, me, step, toasts } = setup();
  const f = hall.stations.font[0], p = { x: f.x, z: f.z + 1 };
  assert.equal(hw.act({ x: 0, z: 0 }), null, 'nothing away from the fonts');
  const a = hw.act(p);
  assert.match(a.label, /Holy water/);
  a.run();
  assert.ok(Math.abs(Math.hypot(me.root.position.x - f.x, me.root.position.z - f.z) - REACH) < 1e-9, 'stepped up to the font');
  assert.ok(Math.abs(me.root.rotation.y - Math.PI) < 1e-9 || Math.abs(me.root.rotation.y + Math.PI) < 1e-9, 'facing it');
  assert.equal(hw.pose, 'holyreach', 'fingers in the water first');
  assert.equal(hw.act(p), null, 'no button while at it');
  let signed = 0;
  for (let i = 0; i < 100 && hw.pose; i++) { if (hw.pose === 'holywater') signed += 0.1; step(0.1); }
  assert.equal(hw.pose, null, 'over by itself');
  assert.ok(Math.abs(signed - HOLY_SIGN) < 0.25, 'exactly one sign of the cross');
  assert.equal(toasts(), 1, 'what it means, the first time');
  hw.act(p).run();
  assert.equal(toasts(), 1, 'not told again');
});

test('walking off ends it', () => {
  const { hw } = setup();
  const f = hall.stations.font[1], p = { x: f.x, z: f.z + 1 };
  hw.act(p).run();
  hw.tick(p, 0.8);
  assert.equal(hw.pose, null);
});

test('the gesture: poses everyone can be shown, in every language', () => {
  for (const n of ['holyreach', 'holywater']) assert.ok(STUDIO_MOVES[n](0).armR, n);
  const fh = STUDIO_MOVES.holywater(HOLY_SIGN * 1.5 / 6);
  assert.ok(fh.head[0] > 0.5 && fh.armR[0] < -1.9, 'the hand at the forehead (the head bowed to meet it)');
  for (const t of Object.values(HOLY_WATER_TEXT)) assert.ok(t.en && t.ko && t.ja && t.zh);
});

test('the host: a thin wafer, lit like bread, no magic sparkle', () => {
  const src = readFileSync(new URL('../src/core/cathedral-mass.js', import.meta.url), 'utf8');
  const lift = src.match(/\{ at: 86, k: 'lift'[^}]*\}/)[0];
  assert.ok(!lift.includes('say'), 'no bubble over the priest when he lifts it');
  assert.match(src, /this\.host = new THREE\.Mesh\(new THREE\.CylinderGeometry\(0\.085, 0\.085, 0\.012/);
  assert.match(src, /MeshLambertMaterial\(\{ color: '#efe4c8' \}\)\);/);
});
