import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUKCHON, ViewBook, PartBook, VIEW_REWARD, ALL_VIEWS_REWARD, inside, nearestAt } from '../src/data/bukchon.js';
import { craftEntry, CRAFT } from '../src/ui/bukchon-ui.js';
import { districtBoxes, districtAt, mergeDistricts } from '../src/core/districts.js';
import { cleanEntry } from '../src/core/bag.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));
const region = read('region.json');
const map = read('districts/bukchon.json');
const stores = read('stores.json').stores;
const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };
const solids = map.buildings.map((b) => b.p).concat(map.blockers.map((b) => b.p));

test('Bukchon sits on its real spot at Anguk Station, next to Gyeongbokgung', () => {
  const d = region.districts.find((x) => x.id === 'bukchon');
  assert.ok(d?.anchor && d.anchor.place.includes('Anguk'));
  assert.ok(!d.anchor.nudge, 'no nudge: Anguk Station is on its real 1/4 spot');
  const st = region.subway.stations.find((s) => s.id === 'anguk-station');
  assert.equal(st.code, '328');
  assert.equal(st.prev.en, 'Gyeongbokgung');
});

test('the 8 Views are the official eight, in order, each on open ground', () => {
  assert.deepEqual(BUKCHON.views.map((v) => v.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(BUKCHON.views[0].name.ko, '창덕궁 전경');
  assert.equal(BUKCHON.views[7].name.ko, '삼청동 돌계단길');
  for (const v of BUKCHON.views) {
    assert.ok(v.name.en && v.name.ko && v.text.en && v.text.ko, v.n);
    for (const p of solids) assert.ok(!inside(v.at[0], v.at[1], p), `view ${v.n} is inside a building`);
  }
  // Views 4 to 7 are in the hanok alleys up the hill: the Quiet Zone.
  for (const n of [4, 5, 6, 7]) { const v = BUKCHON.views[n - 1]; assert.ok(inside(v.at[0], v.at[1], BUKCHON.quiet), n); }
  assert.ok(!inside(...BUKCHON.views[7].at, BUKCHON.quiet));
});

test('the Open House spots are in its courtyard, reachable through the gate', () => {
  const [x0, z0, x1, z1] = BUKCHON.openHouse.box;
  for (const p of [...BUKCHON.openHouse.parts, BUKCHON.openHouse.tree]) {
    assert.ok(p.at[0] > x0 && p.at[0] < x1 && p.at[1] < z0 && p.at[1] > z1, p.id || 'tree');
    for (const s of solids) assert.ok(!inside(p.at[0], p.at[1], s), `${p.id || 'tree'} is inside a wall`);
  }
  const [gx, gz] = BUKCHON.openHouse.gate;
  for (const s of solids) assert.ok(!inside(gx, gz - 1, s) && !inside(gx, gz + 1, s), 'the gate is open');
  assert.equal(BUKCHON.openHouse.parts.length, 5);
});

test('hanok houses keep off the streets', () => {
  const hanok = map.buildings.filter((b) => b.hanok);
  assert.ok(hanok.length > 150);
  const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
  for (const b of hanok) {
    const cx = b.p.reduce((s, q) => s + q[0], 0) / 4, cz = b.p.reduce((s, q) => s + q[1], 0) / 4;
    for (const r of map.roads) for (let i = 1; i < r.p.length; i++) assert.ok(segDist(cx, cz, r.p[i - 1], r.p[i]) > r.w / 2, `a hanok on ${r.n?.en || r.k}`);
  }
});

test('Bukchon shops stand in Bukchon, with hanok fronts', () => {
  const ids = ['info-bukchon', 'gahoe-hanbok', 'noeul-teahouse', 'giwa-photo', 'maeum-knot', 'saekji-paper'];
  const parts = region.districts.map((d) => ({ ...d, map: read(d.map) }));
  const boxes = districtBoxes(mergeDistricts(parts));
  for (const id of ids) {
    const s = stores.find((x) => x.id === id);
    assert.ok(s, id);
    assert.equal(s.front, 'hanok', id);
    assert.equal(districtAt(boxes, ...s.at), 'bukchon', id);
  }
  // Gyeongbokgung's shops on Samcheong-ro stay in Gyeongbokgung.
  for (const id of ['sonmat-kimchi', 'suragan-cooking', 'dano-hanbok']) assert.equal(districtAt(boxes, ...stores.find((x) => x.id === id).at), 'gyeongbokgung', id);
  // A second hanbok rental: the same sets as by the palace.
  const a = stores.find((x) => x.id === 'dano-hanbok').products.map((p) => p.rent);
  assert.deepEqual(stores.find((x) => x.id === 'gahoe-hanbok').products.map((p) => p.rent), a);
});

test('the 8 Views book pays once per view, and a bonus for all eight', () => {
  const st = mem();
  const book = new ViewBook(st);
  let total = 0;
  for (const n of [1, 2, 3, 4, 5, 6, 7]) total += book.take(n);
  assert.equal(total, 7 * VIEW_REWARD);
  assert.equal(book.take(3), 0);
  assert.equal(book.take(8), VIEW_REWARD + ALL_VIEWS_REWARD);
  assert.ok(book.done);
  assert.equal(new ViewBook(st).count, 8); // saved
  assert.equal(book.take(9), 0);
  const parts = new PartBook(mem());
  const ids = BUKCHON.openHouse.parts.map((p) => p.id);
  assert.deepEqual(ids.map((id) => parts.read(id)), [false, false, false, false, true]);
  assert.equal(parts.read(ids[0]), false);
});

test('spots are found near their place, with the district offset', () => {
  const off = [-1547, -891];
  const v = BUKCHON.views[2];
  assert.equal(nearestAt(BUKCHON.views, v.at[0] + off[0] + 1, v.at[1] + off[1], off, 2.4), v);
  assert.equal(nearestAt(BUKCHON.views, v.at[0] + off[0] + 5, v.at[1] + off[1], off, 2.4), null);
});

test('workshop pieces are bag goods', () => {
  for (const kind of Object.keys(CRAFT)) {
    const e = craftEntry(kind, 0, 0);
    assert.deepEqual(cleanEntry(e), e);
    assert.ok(e.name.length <= 40);
  }
  assert.equal(craftEntry('knot', 9, 0), null);
  assert.equal(craftEntry('knot', 0, 0).name, 'red butterfly knot charm');
});
