// Sitting on the seat's real top (game/seat-fit.js): the body's underside
// rests on the top found under the hips and along the thighs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seatLift, seatAhead } from '../src/game/seat-fit.js';
import kaykit from '../src/data/characters/kaykit2.js';

const UNDER = [[0, 0.33], [0.16, 0.29], [0.28, 0.35]];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('a 0.38 m chair that ends before the knees: the hips rest on it', () => {
  near(seatLift([0.38, null, null], UNDER), 0.05);
});

test('a deep 0.42 m step: the legs lie on it too, not in it', () => {
  near(seatLift([0.42, 0.42, 0.42], UNDER), 0.42 - 0.29 - 0.03);
});

test('a table top in front (higher than the seat) is not the seat', () => {
  near(seatLift([0.38, 0.72, 0.72], UNDER), 0.05);
});

test('nothing under the hips: keep the seat as drawn', () => {
  assert.equal(seatLift([null, 0.4, 0.4], UNDER), null);
});

test('the character pack gives the sitting underside from the spot forward', () => {
  const u = kaykit.sitUnder;
  assert.ok(Array.isArray(u) && u[0][0] === 0 && u.every(([d, y]) => d >= 0 && y > 0.2 && y < 0.45));
});

test('a deep step: sit forward so its front edge is just in front of the knees', () => {
  near(seatAhead(0.3, 0.22), 0.08);
  assert.equal(seatAhead(0.18, 0.22), 0); // a chair that already ends there
  assert.equal(seatAhead(null, 0.22), 0);
  near(seatAhead(0.6, 0.22), 0.2); // (never far off the seat's spot)
});
