import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoBikeStairs, NO_BIKE_EVERY } from '../src/game/no-bike-stairs.js';
import { EN } from '../src/i18n/en.js';

test('riding into stairs says why, once every few seconds, not every frame', () => {
  let t = 1000;
  const said = [];
  const nudge = createNoBikeStairs({ toast: (m) => said.push(m), text: () => EN['stairs.noBike'], now: () => t });
  assert.equal(nudge(), true);
  for (let k = 0; k < 60; k++) { t += 16; nudge(); } // pushing against the stairs for a second
  assert.equal(said.length, 1);
  t += NO_BIKE_EVERY;
  nudge();
  assert.equal(said.length, 2);
  assert.match(said[0], /stairs/);
});
