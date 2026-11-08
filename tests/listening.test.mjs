import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { LISTEN_TRACKS, listenTrackById, clock } from '../src/data/listening.js';
import { nearestStation, STATION_REACH, CABLE } from '../src/game/listening-bar.js';
import { listenPose } from '../src/core/headphones.js';

test('every listening-bar song has its file, cover and names', () => {
  assert.ok(LISTEN_TRACKS.length >= 1);
  const ids = new Set();
  for (const tr of LISTEN_TRACKS) {
    assert.ok(!ids.has(tr.id), 'unique id ' + tr.id); ids.add(tr.id);
    for (const f of [tr.file, tr.cover]) {
      assert.ok(existsSync('public/' + f), f);
      assert.ok(statSync('public/' + f).size < 6e6, f + ' stays small enough for phones');
    }
    assert.ok(tr.title.en && tr.title.ko, tr.id);
    assert.ok(tr.seconds > 30, tr.id);
  }
  assert.equal(listenTrackById(LISTEN_TRACKS[0].id), LISTEN_TRACKS[0]);
  assert.equal(listenTrackById('nope'), null);
});

test('clock shows m:ss', () => {
  assert.equal(clock(168), '2:48');
  assert.equal(clock(65), '1:05');
});

test('you use the nearest free station, within reach', () => {
  const st = [{ x: 0, z: 0, taken: true }, { x: 0, z: 1.4 }, { x: 0, z: 2.8 }];
  assert.equal(nearestStation(st, 0.2, 0), null); // someone is already there, the next is too far
  assert.equal(nearestStation(st, 0.2, 1.2), st[1]);
  assert.equal(nearestStation(st, 0.2, 2.5), st[2]);
  assert.equal(nearestStation(st, 5, 5), null);
  assert.ok(CABLE > STATION_REACH, 'the cable reaches further than you need to stand');
});

test('the listening nod stays small', () => {
  for (let t = 0; t < 3; t += 0.1) {
    const p = listenPose(t);
    assert.ok(Math.abs(p.head[0]) <= 0.15 && Math.abs(p.spine[2]) <= 0.05 && p.bob >= 0 && p.bob < 0.02);
  }
});
