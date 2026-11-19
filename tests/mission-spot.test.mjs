import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionSpot } from '../src/game/mission-spot.js';

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
