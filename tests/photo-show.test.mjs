// Seoul Forest's photo show (data/photo-show.js, core/photo-show.js): the
// main photo plus 30 photos, 10 to a floor on three floors, every image in
// public/, and every wall spot inside the room.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PHOTO_SHOW, PHOTO_FLOORS, photosOn, mainPhoto } from '../src/data/photo-show.js';
import { photoSlots, ROOM_PHOTO, PHOTO_LIFT } from '../src/core/photo-show.js';

test('30 photos, 10 on each of three floors, no repeats', () => {
  assert.equal(PHOTO_SHOW.photos.length, 30);
  assert.deepEqual(PHOTO_FLOORS, [1, 2, 3]);
  const all = PHOTO_FLOORS.flatMap((f) => photosOn(f).map((p) => p.id));
  for (const f of PHOTO_FLOORS) assert.equal(photosOn(f).length, 10);
  assert.equal(new Set(all).size, 30);
  assert.ok(!all.includes(mainPhoto().id));
});

test('every image is in public/', () => {
  for (const p of [mainPhoto(), ...PHOTO_FLOORS.flatMap(photosOn)]) assert.ok(existsSync('public/' + p.file), p.file);
});

test('10 wall spots on a floor, inside the room, the lift in the foyer', () => {
  const slots = photoSlots();
  assert.equal(slots.length, PHOTO_SHOW.perFloor);
  const { w, d } = ROOM_PHOTO;
  for (const s of slots) {
    assert.ok(Math.abs(s.x) <= w / 2 && Math.abs(s.z) <= d / 2);
    assert.ok(Math.abs(s.look.x) < w / 2 - 1 && Math.abs(s.look.z) < d / 2 - 1);
  }
  assert.ok(PHOTO_LIFT.z > 0 && PHOTO_LIFT.z < d / 2);
});

test('the culture center is the photo show', () => {
  const store = JSON.parse(readFileSync('public/regions/another-seoul/stores.json', 'utf8')).stores.find((s) => s.id === PHOTO_SHOW.store);
  assert.equal(store.workshop, 'photo-show');
  assert.equal(store.size, 'photoshow');
});
