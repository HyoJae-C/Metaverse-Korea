import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { PAINTINGS, CREDIT, DISCLAIMER } from '../src/data/paintings.js';
import { gallerySlots, displaySize, nearestPainting, ROOM_MUSEUM } from '../src/core/museum.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));

test('every painting is a National Museum of Korea item with Korean and English text', () => {
  assert.ok(PAINTINGS.length >= 10 && PAINTINGS.length <= 20, `${PAINTINGS.length} paintings`);
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

test('the gallery has a spot for every painting and frames never touch', () => {
  const slots = gallerySlots(ROOM_MUSEUM);
  assert.ok(slots.length >= PAINTINGS.length, `${slots.length} spots`);
  const { w, d } = ROOM_MUSEUM;
  for (const s of slots) {
    assert.ok(Math.abs(s.look.x) < w / 2 - 1 && Math.abs(s.look.z) < d / 2 - 1, 'look spot inside the room');
    assert.ok(s.look.z < d / 2 - 3, 'not in the doorway');
  }
  // Frames on the same wall are further apart than the widest frame.
  const widest = Math.max(...PAINTINGS.map((p) => displaySize(p).W)) + 0.34;
  for (const a of slots) for (const b of slots) {
    if (a === b || a.ry !== b.ry) continue;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > widest, 'frames overlap');
  }
  assert.equal(nearestPainting([{ x: 0, z: 0, painting: 1 }], 0.5, 0.5).painting, 1);
  assert.equal(nearestPainting([{ x: 0, z: 0, painting: 1 }], 3, 0), null);
});

test('the museum stands just south of Itaewon, on open ground by its building', () => {
  const store = read('stores.json').stores.find((s) => s.id === 'national-museum');
  assert.equal(store.category, 'museum');
  const region = read('region.json');
  const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
  const map = read('districts/itaewon.json');
  const hoenamu = map.roads.find((r) => r.n?.en === 'Hoenamu-ro'); // Itaewon's southern edge
  const [x, z] = [store.at[0] - ox, store.at[1] - oz];
  assert.ok(z > hoenamu.p[0][1], 'south of Hoenamu-ro');
  assert.ok(Math.abs(x) < 60, 'below the middle of Itaewon');
  const inPoly = (px, pz, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c; } return c; };
  for (const b of map.buildings) assert.ok(!inPoly(x, z, b.p), 'not inside a building');
  assert.ok(map.buildings.some((b) => b.p.some(([, bz]) => Math.abs(bz - z) < 3)), 'next to the museum building');
});
