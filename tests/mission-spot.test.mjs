import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionSpot, cornerSpot } from '../src/game/mission-spot.js';

test('the mission bar sits right under the notices box, on its left edge', () => {
  const s = missionSpot({ left: 64, width: 440, bottom: 112, height: 100 }, 1366, 74);
  assert.equal(s.left, 64);
  assert.equal(s.top, 118);
  assert.equal(s.maxWidth, 460);
});

test('narrow phones: the bar stays on screen', () => {
  const s = missionSpot({ left: 12, width: 298, bottom: 212, height: 96 }, 390, 74);
  assert.equal(s.top, 218);
  assert.ok(s.left + s.maxWidth <= 390 - 12);
});

test('no notices box to measure: under the top chips', () => {
  assert.deepEqual(missionSpot(null, 800, 74), { left: 12, top: 74, maxWidth: 460 });
});

test('phones: the bar sits under the lowest top-left button, clear of bag and notes', () => {
  const eye = { left: 12, top: 12, bottom: 52, height: 40 }, map = { left: 64, top: 10, bottom: 54, height: 44 };
  const s = cornerSpot([eye, map, null], 393, 64);
  assert.deepEqual(s, { left: 12, top: 60, maxWidth: 251 });
  const minimap = { left: 12, top: 12, bottom: 100, height: 88 };
  assert.equal(cornerSpot([eye, null, minimap], 393, 64).top, 106);
  assert.equal(cornerSpot([null, null, null], 393, 64).top, 64);
});
