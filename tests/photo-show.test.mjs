// Photo shows on several floors (data/photo-show.js, core/photo-show.js):
// Gallery A, Sai e's main photo plus 30 photos on three floors; Gallery D,
// JH's main photo plus 20 photos on two floors; 10 to a floor, every image in
// public/, every wall spot inside the room, and the galleries named A to D.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PHOTO_SHOWS, showOf, floorsOf, photosOn, mainPhoto } from '../src/data/photo-show.js';
import { photoSlots, photoFloors, ROOM_PHOTO, PHOTO_LIFT } from '../src/core/photo-show.js';
import { museumFloorStore } from '../src/core/museum.js';

const STORES = JSON.parse(readFileSync('public/regions/another-seoul/stores.json', 'utf8')).stores;
const store = (id) => STORES.find((s) => s.id === id);

test('Gallery A: 30 photos on three floors; Gallery D: 20 on two; 10 a floor, no repeats', () => {
  for (const [id, n, floors] of [['seoul-forest-culture', 30, 3], ['forest-gallery-3', 20, 2]]) {
    const show = PHOTO_SHOWS[id];
    assert.equal(show.photos.length, n);
    assert.deepEqual(floorsOf(show), Array.from({ length: floors }, (_, i) => i + 1));
    assert.equal(show.photos.length, show.floors * show.perFloor);
    const all = floorsOf(show).flatMap((f) => photosOn(show, f).map((p) => p.id));
    for (const f of floorsOf(show)) assert.equal(photosOn(show, f).length, 10);
    assert.equal(new Set(all).size, n);
    assert.ok(!all.includes(mainPhoto(show).id));
    assert.equal(photoFloors(true, store(id)).length, floors);
  }
  assert.equal(PHOTO_SHOWS['forest-gallery-3'].title.ko, '모두와 함께한 모두서울');
  assert.equal(PHOTO_SHOWS['forest-gallery-3'].artist.en, 'JH');
  assert.equal(PHOTO_SHOWS['forest-gallery-3'].look, 'pastel'); // (bright, like the game's own pictures)
});

test('every image is in public/', () => {
  for (const show of Object.values(PHOTO_SHOWS)) {
    for (const p of [mainPhoto(show), ...floorsOf(show).flatMap((f) => photosOn(show, f))]) assert.ok(existsSync('public/' + p.file), p.file);
  }
});

test('10 wall spots on a floor, inside the room, the lift in the foyer', () => {
  const slots = photoSlots();
  assert.equal(slots.length, 10);
  const { w, d } = ROOM_PHOTO;
  for (const s of slots) {
    assert.ok(Math.abs(s.x) <= w / 2 && Math.abs(s.z) <= d / 2);
    assert.ok(Math.abs(s.look.x) < w / 2 - 1 && Math.abs(s.look.z) < d / 2 - 1);
  }
  assert.ok(PHOTO_LIFT.z > 0 && PHOTO_LIFT.z < d / 2);
});

test('Galleries A and D are photo shows, and an upper floor finds its own show', () => {
  for (const id of Object.keys(PHOTO_SHOWS)) {
    assert.equal(store(id).workshop, 'photo-show');
    assert.equal(store(id).size, 'photoshow');
    assert.equal(showOf(museumFloorStore(store(id), 2)), PHOTO_SHOWS[id]);
  }
});

test('the galleries are named A to D', () => {
  const names = ['seoul-forest-culture', 'forest-gallery-1', 'forest-gallery-2', 'forest-gallery-3'].map((id) => store(id).name);
  assert.deepEqual(names.map((n) => n.ko), ['전시관 A', '전시관 B', '전시관 C', '전시관 D']);
  assert.deepEqual(names.map((n) => n.en), ['Gallery A', 'Gallery B', 'Gallery C', 'Gallery D']);
});

test('forest galleries: ACIRE "colorful" and KimPD "Cinematic", 10 works each, 4 + 4 + 2 on the walls', async () => {
  const { EXHIBITIONS, showWork } = await import('../src/data/exhibitions.js');
  const { showSlots } = await import('../src/core/culture.js');
  const a = EXHIBITIONS['forest-gallery-1'], k = EXHIBITIONS['forest-gallery-2'];
  assert.equal(a.theme, 'colorful');
  assert.equal(k.theme, 'dark');
  assert.equal(k.title.ko, '시네마틱');
  for (const show of [a, k]) {
    assert.equal(show.works.length, 10);
    show.works.forEach((raw, i) => assert.ok(existsSync('public/' + show.dir + raw[0] + '.webp'), raw[0]));
    assert.ok(show.works.every((raw, i) => showWork(show, raw, i).photo));
  }
  assert.ok(a.works.every((raw) => !raw[3])); // ACIRE: no titles
  assert.deepEqual(k.works.map((raw) => raw[3].ko), Array.from({ length: 10 }, (_, i) => `시네마틱${String(i + 1).padStart(2, '0')}`));
  const room = { w: 14, d: 11, h: 4 };
  const slots = showSlots(room);
  assert.equal(slots.length, 10);
  assert.equal(slots.filter((s) => s.x < -6).length, 4);
  assert.equal(slots.filter((s) => s.x > 6).length, 4);
  assert.equal(slots.filter((s) => s.z < -5).length, 2);
});
