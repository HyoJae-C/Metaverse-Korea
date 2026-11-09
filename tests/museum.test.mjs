import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { PAINTINGS, CREDIT, DISCLAIMER, HALLS, FLOORS } from '../src/data/paintings.js';
import { hallSlots, hallPaintings, displaySize, nearestPainting, museumFloorStore, floorOf, HALL_CAPACITY, ROOM_MUSEUM, LIFT } from '../src/core/museum.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

test('every painting is a National Museum of Korea item with Korean and English text', () => {
  assert.ok(PAINTINGS.length >= 10 && PAINTINGS.length <= 60, `${PAINTINGS.length} paintings`);
  const ids = new Set();
  for (const p of PAINTINGS) {
    assert.ok(!ids.has(p.id), `${p.id} twice`);
    ids.add(p.id);
    assert.match(p.page, /^https:\/\/www\.museum\.go\.kr\/.*relicId=\d+$/, p.id);
    assert.match(p.src, /^https:\/\/www\.museum\.go\.kr\/relic_image\//, p.id);
    assert.equal(p.file, `museum/${p.id}.jpg`);
    for (const k of ['title', 'artist', 'era', 'desc']) {
      assert.ok(p[k].ko && p[k].en, `${p.id} ${k} needs ko and en`);
    }
    assert.ok(p.no && p.w > 0 && p.h > 0, p.id);
  }
  assert.equal(CREDIT.ko, '국립중앙박물관, 공공누리 제1유형');
  for (const l of ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar']) assert.ok(DISCLAIMER[l], l);
});

test('image files, once fetched, stay small (about 100 KB)', () => {
  for (const p of PAINTINGS) {
    const f = new URL('../public/' + p.file, import.meta.url);
    if (existsSync(f)) assert.ok(statSync(f).size < 160 * 1024, `${p.file} is ${statSync(f).size} bytes`);
  }
});

test('every painting hangs in exactly one hall, and each floor has Hall A and Hall B', () => {
  const seen = new Map();
  for (const h of HALLS) {
    assert.ok(FLOORS.includes(h.floor) && ['A', 'B'].includes(h.side), h.id);
    assert.ok(h.name.ko && h.name.en, h.id);
    assert.equal(hallPaintings(h).length, h.paintings.length, `${h.id} names a painting that doesn't exist`);
    assert.ok(h.paintings.length <= HALL_CAPACITY, `${h.id} is too full`);
    for (const id of h.paintings) { assert.ok(!seen.has(id), `${id} in two halls`); seen.set(id, h.id); }
  }
  for (const p of PAINTINGS) assert.ok(seen.has(p.id), `${p.id} is in no hall`);
  for (const f of FLOORS) assert.deepEqual(HALLS.filter((h) => h.floor === f).map((h) => h.side).sort(), ['A', 'B'], `floor ${f}`);
});

test('hall spots stay inside their hall, frames have wide gaps and never touch', () => {
  const { w, d } = ROOM_MUSEUM;
  const widest = Math.max(...PAINTINGS.map((p) => displaySize(p).W)) + 0.34;
  for (const side of ['A', 'B']) {
    const slots = hallSlots(side, HALL_CAPACITY);
    assert.equal(slots.length, HALL_CAPACITY);
    const s = side === 'A' ? -1 : 1;
    for (const sl of slots) {
      assert.ok(s * sl.look.x > 8.5 && s * sl.look.x < w / 2 - 1, `${side} look x ${sl.look.x}`);
      assert.ok(sl.look.z > -d / 2 + 1 && sl.look.z < 8 - 1, `${side} look z ${sl.look.z}`);
    }
    for (const a of slots) for (const b of slots) {
      if (a === b || a.ry !== b.ry || Math.abs(a.x - b.x) > 0.01 && Math.abs(a.z - b.z) > 0.01) continue;
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= widest + 1.5, 'frames too close');
    }
  }
  assert.equal(nearestPainting([{ x: 0, z: 0, painting: 1 }], 0.5, 0.5).painting, 1);
  assert.equal(nearestPainting([{ x: 0, z: 0, painting: 1 }], 3, 0), null);
});

test('each floor is its own store, and the lift is in the central hall', () => {
  const base = { id: 'national-museum', category: 'museum', name: { ko: '국립중앙미술관', en: 'National Central Art Museum' } };
  assert.equal(museumFloorStore(base, 1), base);
  const two = museumFloorStore(base, 2);
  assert.equal(two.id, 'national-museum-2f');
  assert.equal(floorOf(two), 2);
  assert.equal(floorOf(base), 1);
  assert.equal(museumFloorStore(two, 3).id, 'national-museum-3f');
  assert.equal(museumFloorStore(two, 1), base);
  assert.equal(museumFloorStore(base, 2), two, 'one store per floor');
  assert.match(two.name.en, /2F$/);
  assert.ok(Math.abs(LIFT.x) < 8 && LIFT.z < 0);
});

test('the museum stands just south of Itaewon, on open ground by its building', () => {
  const store = read('stores.json').stores.find((s) => s.id === 'national-museum');
  assert.equal(store.category, 'museum');
  const region = read('region.json');
  const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
  const map = read('districts/itaewon.json');
  const seobinggo = map.roads.find((r) => r.n?.en === 'Seobinggo-ro'); // Itaewon's southern edge
  const [x, z] = [store.at[0] - ox, store.at[1] - oz];
  assert.ok(z > seobinggo.p[0][1], 'south of Seobinggo-ro');
  assert.ok(Math.abs(x) < 60, 'below the middle of Itaewon');
  const inPoly = (px, pz, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c; } return c; };
  for (const b of map.buildings) assert.ok(!inPoly(x, z, b.p), 'not inside a building');
  assert.ok(map.buildings.some((b) => b.p.some(([, bz]) => Math.abs(bz - z) < 3)), 'next to the museum building');
});
