import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SquareQuests, pickQuest, QUESTS_PER_DAY, QUEST_REWARD, STARTER, STARTER_REWARD } from '../src/core/quests.js';

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

test('dance needs three emotes on the square; a saved high five still works but is never handed out', () => {
  const q = new SquareQuests(memory(), () => 'd1');
  q.s.active = { kind: 'dance', need: 3, n: 0 };
  assert.equal(q.event('emote'), false); // anywhere else doesn't count
  q.event('squareEmote'); q.event('squareEmote'); q.event('squareEmote');
  assert.equal(q.claim({}), QUEST_REWARD);
  q.s.active = { kind: 'highfive', need: 1, n: 0 };
  assert.equal(q.event('highfive'), true);
  assert.ok(q.ready());
  for (let r = 0; r < 1; r += 0.05) assert.notEqual(pickQuest({ stores: [] }, () => r).kind, 'highfive'); // never a random one
  for (let r = 0; r < 1; r += 0.05) { // not even the first of the day (it repeated the welcome high five)
    const day = new SquareQuests(memory(), () => 'd2');
    assert.notEqual(day.start({ stores: ['a'] }, () => r).kind, 'highfive');
  }
});

test('new players get the first path in order, outside the daily limit', () => {
  const store = memory();
  const q = new SquareQuests(store, () => 'd1');
  q.skipHighFive();
  q.beginStarter();
  assert.equal(q.onStarter, true);
  const ctx = { held: 'coffee', pet: true };
  for (let i = 0; i < STARTER.length; i++) {
    const a = q.start(pool, () => 0);
    assert.equal(a.kind, STARTER[i].kind);
    assert.equal(a.target, STARTER[i].target);
    const type = { visit: 'visit', taxi: 'taxi', subway: 'subway', eat: 'eat', pat: 'pet', talk: 'talk', dance: 'squareEmote' }[a.kind];
    if (type) for (let k = 0; k < a.need; k++) q.event(type, a.target);
    assert.equal(q.claim(ctx), STARTER_REWARD);
  }
  assert.equal(q.onStarter, false);
  assert.equal(q.left, QUESTS_PER_DAY); // the day's errands are all still there
  assert.equal(new SquareQuests(store, () => 'd1').onStarter, false); // saved
});

test('the first path starts with a subway ride, then nine errands near the square', () => {
  assert.equal(STARTER.length, 10);
  assert.equal(STARTER[0].kind, 'subway');
  assert.ok(STARTER.every((s) => s.tip));
});

test('the subway errand is done by riding to another station; "Later" skips it without coins', () => {
  const q = new SquareQuests(memory(), () => 'd1');
  q.beginStarter();
  assert.equal(q.start(pool).kind, 'subway');
  assert.equal(q.event('taxi'), false);
  assert.equal(q.event('subway'), true);
  assert.equal(q.claim({}), STARTER_REWARD);
  assert.equal(q.start(pool).kind, STARTER[1].kind);
  const r = new SquareQuests(memory(), () => 'd1');
  r.beginStarter();
  r.start(pool);
  assert.equal(r.skipStarter(), true);
  assert.equal(r.active, null);
  assert.equal(r.start(pool).target, STARTER[1].target);
  r.drop();
  r.s.active = { kind: 'talk', need: 3, n: 0 }; // not a first-path errand: nothing to skip
  assert.equal(r.skipStarter(), false);
});

test('a first-path step saved before the subway errand keeps its place', () => {
  const st = memory();
  st.setItem('mk.quests', JSON.stringify({ day: 'd1', starter: 2, active: { kind: 'coffee', target: 'meta-coffee', need: 1, n: 0, starter: 2 } }));
  const q = new SquareQuests(st, () => 'd1');
  assert.equal(q.starterStep, 3);
  assert.equal(STARTER[q.active.starter].kind, 'coffee');
  assert.equal(new SquareQuests(st, () => 'd1').starterStep, 3); // moved once, not on every load
});

test('players from before never get the first path', () => {
  const q = new SquareQuests(memory(), () => 'd1');
  assert.equal(q.onStarter, false);
});
