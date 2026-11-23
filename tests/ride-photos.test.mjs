import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PHOTOS, PHOTO_CAM, PhotoStore, atSnap, filmDate, filmLook, frameId, okSrc, photoEntry, photoOfFrame } from '../src/core/ride-photos.js';
import { Bag, cleanEntry } from '../src/core/bag.js';
import { FLUME_TRACK, FLUME_POOL, flumeSpot, RIDE_CYCLE, ridePhase } from '../src/core/park-rides.js';
import { photoMsg, parseVisitMsg } from '../src/game/home-visits.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SRC = 'data:image/jpeg;base64,' + 'A'.repeat(200);

test('a photo is a bag entry that points at its picture; frames name it too', () => {
  assert.deepEqual(cleanEntry({ kind: 'photo', ph: uuid(1), junk: 1 }), { kind: 'photo', ph: uuid(1) });
  assert.equal(cleanEntry({ kind: 'photo', ph: 'nope' }), null);
  assert.equal(photoEntry({ ph: 3 }), null);
  assert.equal(photoOfFrame(frameId(uuid(2))), uuid(2));
  assert.equal(photoOfFrame('ph:../x'), null);
  assert.equal(photoOfFrame('sofa'), null);
});

test('only small JPEG data URLs are kept as pictures', () => {
  assert.ok(okSrc(SRC));
  assert.ok(!okSrc('data:image/png;base64,AAAA'));
  assert.ok(!okSrc('javascript:alert(1)'));
  assert.ok(!okSrc('data:image/jpeg;base64,' + 'A'.repeat(70000)));
});

test('the store keeps at most MAX_PHOTOS, survives a reload, and marks receipts sent', () => {
  const st = memory(), s = new PhotoStore(st);
  for (let i = 0; i < MAX_PHOTOS + 3; i++) s.add({ id: uuid(i), src: SRC, at: i, op: i === 0 ? uuid(99) : null });
  assert.equal(s.all().length, MAX_PHOTOS);
  assert.ok(s.full);
  assert.equal(s.add({ id: uuid(50), src: SRC }), false);
  assert.equal(s.unsent().length, MAX_PHOTOS);
  s.markSent(uuid(0));
  const again = new PhotoStore(st);
  assert.equal(again.all().length, MAX_PHOTOS);
  assert.equal(again.get(uuid(0)).sent, true);
  assert.equal(again.get(uuid(0)).op, uuid(99));
  assert.equal(again.unsent().length, MAX_PHOTOS - 1);
});

test('throwing a photo out of the bag deletes its picture', () => {
  const st = memory(), bag = new Bag(st), s = new PhotoStore(st);
  s.add({ id: uuid(1), src: SRC }); bag.add({ kind: 'photo', ph: uuid(1) });
  s.add({ id: uuid(2), src: SRC }); bag.add({ kind: 'photo', ph: uuid(2) });
  s.add({ id: uuid(3), src: SRC }); // (no bag entry: e.g. the bag was cleaned on another device)
  s.follow(bag);
  assert.deepEqual(s.all().map((p) => p.id), [uuid(1), uuid(2)]);
  bag.take(bag.list().findIndex((e) => e.ph === uuid(1)));
  assert.deepEqual(s.all().map((p) => p.id), [uuid(2)]);
});

test('the film date and the film look', () => {
  assert.equal(filmDate(new Date(2026, 10, 18, 14).getTime()), "'26 11 18");
  const px = new Uint8ClampedArray(4 * 4 * 4).fill(0);
  filmLook(px, 4, 4);
  assert.ok(px[0] > 0 && px[3] === 255, 'blacks fade up a little');
  const white = new Uint8ClampedArray(4 * 3 * 3).fill(255);
  filmLook(white, 3, 3);
  const mid = 4 * 4;
  assert.ok(white[mid] > white[mid + 2], 'warm: more red than blue');
  assert.ok(white[0] < white[mid], 'the edge is darker than the middle');
});

test('the flume takes its photo once a ride, partway down the big drop, in front of the camera', () => {
  // Walk one ride of the shared clock and find the frames that would snap.
  const c = RIDE_CYCLE.flume, start = 1000 * (c.load + c.run + c.stop);
  let t0 = start;
  while (ridePhase('flume', t0).phase !== 'run') t0 += 0.05;
  for (const seat of [0, 1, 2, 3]) {
    const hits = [];
    for (let t = t0; ridePhase('flume', t).phase === 'run'; t += 1 / 30) if (atSnap(flumeSpot(seat, t))) hits.push(flumeSpot(seat, t));
    assert.ok(hits.length > 0, `seat ${seat} reaches the snap point`);
    const s = hits[0];
    assert.ok(s.y > 1 && s.y < 5, `up the slope, not at the top or in the pool (${s.y.toFixed(2)})`);
    const d = Math.hypot(s.x - PHOTO_CAM.x, s.y - PHOTO_CAM.y, s.z - PHOTO_CAM.z);
    assert.ok(d > 4 && d < 9, `close enough for faces (${d.toFixed(1)} m)`);
    assert.ok(Math.abs(s.ry) < 0.2, 'heading south, toward the camera');
  }
  // The pole stands outside the splash pool.
  const P = FLUME_POOL;
  assert.ok(((PHOTO_CAM.x - P.x) / P.r) ** 2 + ((PHOTO_CAM.z - P.z) / (P.r * P.sz)) ** 2 > 1);
  // ...and off the channel.
  assert.ok(FLUME_TRACK.pts.every(([x, , z]) => Math.hypot(x - PHOTO_CAM.x, z - PHOTO_CAM.z) > 1.4));
});

test('visitors get the picture of a framed photo in one room message', () => {
  const m = parseVisitMsg(photoMsg(uuid(7), SRC));
  assert.deepEqual(m, { ph: { id: uuid(7), src: SRC } });
  assert.equal(parseVisitMsg('hv:ph:' + uuid(7) + ':javascript:x'), null);
  assert.equal(parseVisitMsg('hv:ph:short:' + SRC), null);
});
