import test from 'node:test';
import assert from 'node:assert/strict';
import { snowDepth, SETTLE_MS, MELT_MS } from '../src/core/snow-cover.js';

const SLOT = 30 * 60 * 1000;
// A fake weather: slot 1 and 2 snow, the rest clear.
const rolled = (ms) => ([1, 2].includes(Math.floor(ms / SLOT)) ? 'snow' : 'clear');
const depth = (ms) => snowDepth(ms, rolled);
const near = (a, b) => Math.abs(a - b) < 0.02;

test('snow settles from bare ground once it starts', () => {
  assert.equal(depth(SLOT), 0);
  assert.ok(near(depth(SLOT + SETTLE_MS / 2), 0.5));
  assert.equal(depth(SLOT + SETTLE_MS * 2), 1);
});

test('a second snowy slot keeps the street white', () => {
  assert.equal(depth(2 * SLOT + 1000), 1);
});

test('snow melts away after it stops', () => {
  assert.equal(depth(3 * SLOT), 1);
  assert.ok(near(depth(3 * SLOT + MELT_MS / 2), 0.5));
  assert.ok(depth(3 * SLOT + MELT_MS) < 1e-9);
  assert.equal(depth(5 * SLOT), 0);
});
