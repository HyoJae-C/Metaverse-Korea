// Everyone behind a counter shows their face (Yozi 2026-11-13: "모든 상점이나
// 가판의 카운터 형식은 사람 얼굴이 보이게"). For every shop room, Han River
// park, night cart and stand with someone behind it, the camera of a player
// standing where you buy must see their eyes (and, unless almost level, the
// mouth) past the counter, the goods on it, its sign and its awning
// (tests/face-view.mjs; the rule's numbers are core/counter-face.js).
// A new stall or shop with a clerk is checked here as soon as its builder
// returns where they stand (clerk, barkeep, vendors, stations.*Guide...).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : /Gradient|Pattern/.test(k) ? () => grad : /ImageData/.test(k) ? () => ({ data: new Uint8ClampedArray(4 * 64 * 64) }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const el = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {} } });
globalThis.document = { createElement: el, createElementNS: el, getElementById: () => null, body: el() };

const { hiddenFace } = await import('./face-view.mjs');
const { COUNTER_H, FACE, liftFor } = await import('../src/core/counter-face.js');
const I = await import('../src/core/interior.js');
I.setParkBuilder((await import('../src/core/themepark.js')).buildThemePark);
I.setDomeBuilder((await import('../src/core/dome.js')).buildDome);
I.setZooBuilders(await import('../src/core/zoo-park.js'));
const { buildHanPark } = await import('../src/core/han-park.js');
const { buildNightCarts } = await import('../src/core/night-carts-model.js');

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const stores = read('stores.json').stores;
const region = read('region.json');

// Who stands behind something to serve you. (Ride attendants stand by their
// gates, not behind a counter.)
const SERVES = /staff|guide|reader|teacher|seller|clerk|keeper|vendor|cashier/i;
const staffOf = (r) => {
  const out = [['clerk', r.clerk], ['barkeep', r.barkeep], ['trainer', r.trainer], ...(r.vendors || []).map((v, i) => ['vendor ' + (v.stall || i), v])];
  for (const [k, l] of Object.entries(r.stations || {})) if (SERVES.test(k) && !/ride|coaster/i.test(k)) [l].flat().forEach((s, i) => s && Number.isFinite(s.x) && out.push([k + i, s]));
  return out.filter(([, s]) => s && Number.isFinite(s.x));
};
const check = (where, scene, list) => {
  for (const [who, s] of list) {
    const bad = hiddenFace(scene, s);
    assert.equal(bad.length, 0, `${where}: the ${who}'s face is hidden from where you buy (${bad.length} views, e.g. ${JSON.stringify(bad[0])})`);
  }
};

test('the face sits over a counter of the right height', () => {
  assert.ok(COUNTER_H <= FACE.chin - 0.05, 'a counter tops out under the chin, with room to spare');
  assert.equal(liftFor(COUNTER_H), 0);
  assert.ok(Math.abs(liftFor(0.76) - (0.76 - COUNTER_H)) < 1e-9, 'a bar: a step behind it');
});

test('every shop room: the clerk, the bartender and the guides show their faces', () => {
  let n = 0;
  for (const s of stores) {
    let r;
    try { r = I.buildInterior(s); } catch { continue; } // (a room that needs the browser: the aquarium's video tank)
    const list = staffOf(r);
    n += list.length;
    check(s.id, r.scene, list);
  }
  assert.ok(n > 100, `checked ${n} people`);
});

test('the Han River parks on the street: the kiosk clerk, the bait stall grandpa, the market sellers', () => {
  let parks = 0;
  for (const d of region.districts) for (const l of (read(d.map).landmarks || []).filter((x) => x.type === 'hanpark')) {
    const store = stores.find((s) => s.id === l.store);
    const b = buildHanPark(store, l.layout || {});
    const list = [['kiosk clerk', b.clerk], ['bait seller', b.baitSeller], ...b.vendors.map((v, i) => ['seller ' + i, v])].filter(([, s]) => s);
    check(store.id, b.group, list);
    if (b.baitSeller) parks++;
  }
  assert.equal(parks, 4, 'a bait stall at each of the four fishing parks');
});

test("Myeongdong's night carts: each seller's face over the cart", () => {
  const store = stores.find((s) => s.id === 'myeongdong-night-carts');
  const land = read('districts/myeongdong.json').landmarks.find((l) => l.type === 'nightcarts');
  const b = buildNightCarts(store, land.carts);
  assert.ok(b.vendors.length >= 16);
  check('night carts', b.group, b.vendors.map((v, i) => ['seller ' + i, v]));
});
