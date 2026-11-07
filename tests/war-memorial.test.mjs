import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { EXHIBITS, HALLS, CREDIT, DISCLAIMER, VISIT } from '../src/data/war-memorial.js';
import { photoSlots, fitSize, FLOWER_SPOT, ROOM_MEMORIAL, hallPhotos } from '../src/core/war-memorial.js';
import { nearestPainting } from '../src/core/museum.js';
import { STAMPS } from '../src/data/stamps.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));

test('every photo is a War Memorial item on the KOGL portal, with Korean and English text', () => {
  const ids = new Set();
  for (const p of EXHIBITS) {
    assert.ok(!ids.has(p.id), `${p.id} twice`);
    ids.add(p.id);
    assert.match(p.page, /^https:\/\/www\.kogl\.or\.kr\/recommend\/recommendDivView\.do\?division=img&recommendIdx=\d+$/, p.id);
    assert.equal(p.file, `memorial/${p.id}.jpg`);
    for (const k of ['title', 'artist', 'era', 'desc']) assert.ok(p[k].ko && p[k].en, `${p.id} ${k} needs ko and en`);
    assert.equal(p.credit, CREDIT);
  }
  assert.equal(CREDIT.ko, '전쟁기념관, 공공누리 제1유형');
  for (const l of ['en', 'ko']) assert.ok(DISCLAIMER[l] && VISIT[l].length, l);
});

test('every photo hangs somewhere, once, inside the room', () => {
  const hung = Object.values(HALLS).flatMap((h) => h.photos);
  assert.equal(new Set(hung).size, hung.length);
  assert.deepEqual(new Set(hung), new Set(EXHIBITS.map((p) => p.id)));
  const slots = photoSlots();
  assert.equal(slots.length, EXHIBITS.length);
  const { w, d } = ROOM_MEMORIAL;
  for (const sl of slots) {
    assert.ok(Math.abs(sl.x) <= w / 2 && Math.abs(sl.z) <= d / 2, sl.photo.id);
    assert.ok(Math.abs(sl.look.x) < w / 2 - 0.5 && Math.abs(sl.look.z) < d / 2 - 0.5, `${sl.photo.id}: look spot inside`);
  }
  for (const k of ['A', 'B']) assert.ok(hallPhotos(k).length <= 5, `hall ${k} has five spots`);
});

test('the altar spot is its own: no photo is picked there', () => {
  const looks = photoSlots().map((sl) => ({ ...sl.look, painting: sl.photo }));
  assert.equal(nearestPainting(looks, FLOWER_SPOT.x, FLOWER_SPOT.z), null);
});

test('photos fit the frame whatever their shape', () => {
  for (const [w, h] of [[4, 3], [3, 4], [16, 9], [1, 1], [700, 1000]]) {
    const { W, H } = fitSize(w, h);
    assert.ok(W <= 2.4 + 1e-9 && H <= 1.8 + 1e-9, `${w}x${h}`);
    assert.ok(Math.abs(W / H - w / h) < 1e-9);
  }
});

test('image files, once added, stay small', () => {
  for (const p of EXHIBITS) {
    const f = new URL('../public/' + p.file, import.meta.url);
    if (existsSync(f)) assert.ok(statSync(f).size < 200 * 1024, `${p.file} is ${statSync(f).size} bytes`);
  }
});

test('the memorial is on the Itaewon map, west along Itaewon-ro, with its store and stamp', () => {
  const store = read('stores.json').stores.find((s) => s.id === 'war-memorial');
  assert.ok(store, 'store');
  assert.equal(store.category, 'memorial');
  const map = read('districts/itaewon.json');
  assert.ok(map.landmarks.some((l) => l.type === 'warmemorial'));
  assert.ok(map.landmarks.some((l) => l.type === 'outdoorexhibits'));
  const road = map.roads.find((r) => r.n?.en === 'Itaewon-ro');
  assert.ok(road.p[0][0] <= -600, 'Itaewon-ro reaches the memorial');
  // The entrance faces the plaza: the store's spot is just south of the
  // building's front, in district coordinates.
  const offset = read('region.json').districts.find((x) => x.id === 'itaewon').offset;
  const [lx, lz] = [store.at[0] - offset[0], store.at[1] - offset[1]];
  const b = map.buildings.find((x) => x.wall === '#cfcac0');
  const maxZ = Math.max(...b.p.map((q) => q[1]));
  assert.ok(lz > maxZ && lz - maxZ < 5 && Math.abs(lx + 460) < 1, `entrance at ${lx}, ${lz}`);
  assert.ok(STAMPS.some((s) => s.id === 'war-memorial' && s.place.store === 'war-memorial'));
});
