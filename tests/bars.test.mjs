import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BAR_STYLES, barStyleOf, matchState, goalsBetween, MATCH_LEN, MATCH_GOALS, GOAL_SHOW, seatPatron } from '../src/core/bar-styles.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const stores = read('stores.json').stores;
const region = read('region.json');
const itaewon = read('districts/itaewon.json');
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;

test('Itaewon has four bars, each a different style, all alcohol-free', () => {
  const bars = stores.filter((s) => s.category === 'bar');
  assert.equal(bars.length, 4);
  assert.deepEqual(bars.map(barStyleOf).sort(), [...BAR_STYLES].sort());
  for (const b of bars) {
    const [x, z] = b.at;
    assert.ok(x - ox > -640 && x - ox < 340 && z - oz > -182 && z - oz < 246, b.id + ' is in Itaewon');
    assert.ok(b.products.length >= 4, b.id);
    for (const p of b.products) assert.ok(!/\b(soju|wine|whisky|vodka|rum|gin)\b/i.test(p.name.en) || /alcohol-free/i.test(p.name.en), p.id);
  }
  // The speakeasy's board says "coin laundry", in every language it has.
  const hidden = bars.find((b) => barStyleOf(b) === 'speakeasy');
  assert.ok(hidden.signAs?.en && hidden.signAs?.ko);
});

test('the new bars stand on open ground on Itaewon-ro, a shop front apart', () => {
  const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const here = stores.filter((s) => s.at[1] === 276 && s.at[0] > ox - 300 && s.at[0] < ox + 300);
  for (const s of here) for (const b of itaewon.buildings) assert.ok(!inPoly(s.at[0] - ox, s.at[1] - oz, b.p), s.id + ' inside a building');
  for (const a of here) for (const b of here) if (a !== b) assert.ok(Math.abs(a.at[0] - b.at[0]) >= 7, `${a.id} and ${b.id} overlap`);
});

test('the sports pub match: same score for everyone, goals counted in order', () => {
  assert.deepEqual(matchState(0).score, [0, 0]);
  assert.equal(matchState(0).minute, 0);
  const [m0, side0] = MATCH_GOALS[0];
  assert.deepEqual(matchState(m0 * 2 - 0.5).score, [0, 0]);
  const s = matchState(m0 * 2 + 1);
  assert.equal(s.score[side0], 1);
  assert.equal(s.goal.side, side0);
  assert.equal(matchState(m0 * 2 + GOAL_SHOW + 1).goal, null);
  const end = matchState(MATCH_LEN - 0.01);
  assert.equal(end.minute, 90);
  assert.equal(end.score[0] + end.score[1], MATCH_GOALS.length);
  assert.deepEqual(matchState(MATCH_LEN * 1000 + 1).score, [0, 0]); // loops
});

test('the crowd cheers once per goal, across loops', () => {
  assert.deepEqual(goalsBetween(0, MATCH_LEN).map((g) => g.at), MATCH_GOALS.map(([m]) => m * 2));
  assert.equal(goalsBetween(MATCH_LEN * 5 - 1, MATCH_LEN * 7 - 1).length, MATCH_GOALS.length * 2);
  const at = MATCH_GOALS[1][0] * 2;
  assert.equal(goalsBetween(at - 0.1, at).length, 1);
  assert.equal(goalsBetween(at, at + 0.1).length, 0); // (not twice)
  assert.deepEqual(goalsBetween(5, 5), []);
});

test('a patron takes a seat away from the players', () => {
  const seats = [{ x: 0, z: 0, ry: 0 }, { x: 2, z: 0, ry: 1 }];
  const stations = {};
  seatPatron({ seats, stations }, 1.9, 0.1);
  assert.deepEqual(seats.map((s) => s.x), [0]);
  assert.deepEqual(stations.patrons, [{ x: 2, z: 0, ry: 1, sit: true }]);
});
