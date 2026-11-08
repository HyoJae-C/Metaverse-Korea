import test from 'node:test';
import assert from 'node:assert/strict';
import { snowDepth, SETTLE_MS, MELT_MS } from '../src/core/snow-cover.js';

const SLOT = 30 * 60 * 1000;
// A fake weather: slot 1 and 2 snow, the rest clear.
const rolled = (ms) => ([1, 2].includes(Math.floor(ms / SLOT)) ? 'snow' : 'clear');

test('snow settles from bare ground once it starts', () => {
  assert.equal(snowDepth(SLOT, SLOT, rolled), 0);
  assert.ok(Math.abs(snowDepth(SLOT + SETTLE_MS / 2, SLOT, rolled) - 0.5) < 1e-9);
  assert.equal(snowDepth(SLOT + SETTLE_MS * 2, SLOT, rolled), 1);
});

test('a second snowy slot keeps the street white', () => {
  assert.equal(snowDepth(2 * SLOT + 1000, SLOT, rolled), 1);
});

test('snow melts away after it stops', () => {
  assert.equal(snowDepth(3 * SLOT, SLOT, rolled), 1);
  assert.ok(Math.abs(snowDepth(3 * SLOT + MELT_MS / 2, SLOT, rolled) - 0.5) < 1e-9);
  assert.equal(snowDepth(3 * SLOT + MELT_MS, SLOT, rolled), 0);
  assert.equal(snowDepth(5 * SLOT, SLOT, rolled), 0);
});
