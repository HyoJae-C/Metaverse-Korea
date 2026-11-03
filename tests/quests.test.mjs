import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SquareQuests, pickQuest, QUESTS_PER_DAY, QUEST_REWARD } from '../src/core/quests.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const pool = { stores: ['meta-coffee', 'chaekmaru-library'] };

test('an errand is done out there and reported back on the square', () => {
  const q = new SquareQuests(memory(), () => 'd1');
  q.skipHighFive(); // (the day's high five is covered below)
  const a = q.start(pool, () => 0); // first kind: visit
  assert.equal(a.kind, 'visit');
  assert.equal(q.start(pool), null); // one at a time
  assert.equal(q.claim({}), 0);
  assert.equal(q.event('visit', 'somewhere-else'), false);
  assert.equal(q.event('visit', a.target), true);
  assert.equal(q.claim({}), QUEST_REWARD);
  assert.equal(q.active, null);
});

test('coffee and pet are checked when you report; talk needs three', () => {
  const q = new SquareQuests(memory(), () => 'd1');
  q.s.active = { kind: 'coffee', need: 1, n: 0 };
  assert.equal(q.ready({}), false);
  assert.equal(q.claim({ held: 'coffee' }), QUEST_REWARD);
  q.s.active = { kind: 'pet', need: 1, n: 0 };
  assert.equal(q.claim({ pet: true }), QUEST_REWARD);
  q.s.active = { kind: 'talk', need: 3, n: 0 };
  q.event('talk'); q.event('talk');
  assert.equal(q.ready(), false);
  q.event('talk');
  assert.equal(q.ready(), true);
});

test('a few a day, back again tomorrow; never the same kind twice in a row', () => {
  let day = 'd1';
  const st = memory();
  const q = new SquareQuests(st, () => day);
  for (let i = 0; i < QUESTS_PER_DAY; i++) { q.s.active = { kind: 'pet', need: 1, n: 0 }; q.claim({ pet: true }); }
  assert.equal(q.left, 0);
  assert.equal(q.start(pool), null);
  day = 'd2';
  assert.equal(new SquareQuests(st, () => day).left, QUESTS_PER_DAY);
  for (let r = 0; r < 1; r += 0.1) assert.notEqual(pickQuest(pool, () => r, 'visit').kind, 'visit');
});

test('dance needs three emotes on the square; the day starts with a high five with the guide', () => {
  const q = new SquareQuests(memory(), () => 'd1');
  q.s.active = { kind: 'dance', need: 3, n: 0 };
  assert.equal(q.event('emote'), false); // anywhere else doesn't count
  q.event('squareEmote'); q.event('squareEmote'); q.event('squareEmote');
  assert.equal(q.claim({}), QUEST_REWARD);
  q.s.active = { kind: 'highfive', need: 1, n: 0 };
  assert.equal(q.event('highfive'), true);
  assert.ok(q.ready());
  for (let r = 0; r < 1; r += 0.05) assert.notEqual(pickQuest({ stores: [] }, () => r).kind, 'highfive'); // never a random one
  const day = new SquareQuests(memory(), () => 'd2');
  assert.equal(day.start({ stores: ['a'] }).kind, 'highfive'); // first of the day
  day.event('highfive');
  day.claim({});
  assert.notEqual(day.start({ stores: ['a'] }).kind, 'highfive');
});
