import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { EXHIBITS, HALLS, CREDIT, DISCLAIMER, VISIT, MEMORIAL_FLOORS, GUIDE_LOOK } from '../src/data/war-memorial.js';
import { photoSlots, fitSize, FLOWER_SPOT, ROOM_MEMORIAL, hallPhotos, MEMORIAL_LIFT } from '../src/core/war-memorial.js';
import { sanitizeLook } from '../src/data/appearance.js';
import { nearestPainting } from '../src/core/museum.js';
import { STAMPS } from '../src/data/stamps.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

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
  // (a photo on hold is not hung)
  assert.deepEqual(new Set(hung), new Set(EXHIBITS.filter((p) => !p.hold).map((p) => p.id)));
  const slots = [...photoSlots(1), ...photoSlots(2)];
  assert.equal(slots.length, EXHIBITS.filter((p) => !p.hold).length);
  const { w, d } = ROOM_MEMORIAL;
  for (const sl of slots) {
    assert.ok(Math.abs(sl.x) <= w / 2 && Math.abs(sl.z) <= d / 2, sl.photo.id);
    assert.ok(Math.abs(sl.look.x) < w / 2 - 0.5 && Math.abs(sl.look.z) < d / 2 - 0.5, `${sl.photo.id}: look spot inside`);
    assert.ok(Math.hypot(sl.look.x - MEMORIAL_LIFT.x, sl.look.z - MEMORIAL_LIFT.z) > 2.5, `${sl.photo.id}: not at the lift`);
  }
  for (const k of ['A', 'B']) assert.ok(hallPhotos(k).length <= 5, `hall ${k} has five spots`);
  for (const k of ['C', 'D']) assert.ok(hallPhotos(k).length <= 8, `hall ${k} has eight spots`);
  // The lift lists every hall, each on its own floor.
  for (const { floor, halls } of MEMORIAL_FLOORS) for (const k of halls) assert.equal(HALLS[k].floor || 1, floor, k);
  assert.deepEqual(new Set(MEMORIAL_FLOORS.flatMap((f) => f.halls)), new Set(Object.keys(HALLS).filter((k) => k !== 'lobby')));
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

test('the guide wears a suit, a skirt and black shoes, hair in a bun', () => {
  const look = sanitizeLook(GUIDE_LOOK);
  for (const k of ['model', 'hairStyle', 'skirt', 'shoes']) assert.equal(look[k], GUIDE_LOOK[k], k);
});

test('the lobby boards: about the museum, and a dated Korean War timeline in Korean and English', async () => {
  const { ABOUT, TIMELINE } = await import('../src/data/war-memorial.js');
  assert.equal(ABOUT.ko.length, ABOUT.en.length);
  assert.ok(ABOUT.en.some((l) => /not run by or linked to/.test(l)), 'the disclaimer is on the board');
  const dates = TIMELINE.events.map((e) => e.d);
  assert.equal(dates[0], '1950.6.25');
  assert.equal(dates.at(-1), '1953.7.27');
  for (const e of TIMELINE.events) assert.ok(e.ko && e.en, e.d);
});

test('the month board over the altar: the heroes for an announced month, days for every month', async () => {
  const { monthBoard, MONTH_DAYS } = await import('../src/data/war-memorial.js');
  const nov = monthBoard(new Date(2026, 10, 7));
  assert.equal(nov.heroes.length, 2);
  assert.match(nov.days[0].en, /Turn Toward Busan/);
  assert.equal(monthBoard(new Date(2030, 4, 1)).heroes.length, 0, 'no heroes before they are added');
  for (const days of Object.values(MONTH_DAYS)) for (const x of days) assert.ok(x.d && x.ko && x.en);
});

test('the history text is in Korean, English, Japanese and Chinese; other game languages get a notice', async () => {
  const m = await import('../src/data/war-memorial.js');
  const { LANGUAGES } = await import('../src/i18n/strings.js');
  for (const p of m.EXHIBITS) for (const k of ['title', 'era', 'artist', 'desc']) for (const l of m.MEMORIAL_LANGS) assert.ok(p[k][l], `${p.id} ${k} ${l}`);
  for (const l of m.MEMORIAL_LANGS) {
    assert.ok(m.ABOUT[l]?.length === m.ABOUT.ko.length && m.TIMELINE.events.every((e) => e[l]) && m.VISIT[l], l);
    for (const h of Object.values(m.HALLS)) if (h.name) assert.ok(h.name[l], l);
  }
  for (const { code } of LANGUAGES) {
    if (!['ko', 'en', 'ja', 'zh', 'zht'].includes(code)) assert.ok(m.NOT_TRANSLATED[code], `notice in ${code}`);
  }
});

test('every store category has a name on the map (no raw "cat.xxx" key)', async () => {
  const { STRINGS } = await import('../src/i18n/strings.js');
  const { stores } = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url)));
  for (const c of new Set(stores.map((s) => s.category))) {
    for (const l of ['en', 'ko']) assert.ok(STRINGS[l]['cat.' + c], `cat.${c} (${l})`);
  }
});
