import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Daily, missionsFor, dayKey, REWARD } = await import('../src/core/daily.js');

const pool = { npcs: ['민지', '지훈', '서연'], stores: [{ id: 'a' }, { id: 'b' }, { id: 'cats', pets: 'cats' }] };
const wallet = () => ({ coins: 0, add(n) { this.coins += n; } });
const at = (y, m, d) => () => new Date(y, m - 1, d, 12);

test('same day gives the same three missions', () => {
  const a = missionsFor('2026-11-02', pool), b = missionsFor('2026-11-02', pool);
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  assert.equal(a[0].type, 'talk');
  assert.equal(a[1].type, 'visit');
  const days = new Set(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].map((d) => JSON.stringify(missionsFor(d, pool))));
  assert.ok(days.size > 1, 'missions change between days');
});

test('check-in once a day, streak grows and resets after a gap', () => {
  for (const k of Object.keys(store)) delete store[k];
  const w = wallet();
  let now = at(2026, 11, 1);
  const d = new Daily(w, pool, () => now());
  assert.equal(d.checkIn(), REWARD.checkIn);
  assert.equal(d.checkIn(), 0);
  now = at(2026, 11, 2);
  d.checkIn();
  assert.equal(d.streak, 2);
  now = at(2026, 11, 4); // missed the 3rd
  d.checkIn();
  assert.equal(d.streak, 1);
  assert.equal(w.coins, REWARD.checkIn * 3);
});

test('day 7 of a streak pays the weekly reward', () => {
  for (const k of Object.keys(store)) delete store[k];
  const w = wallet();
  let day = 1;
  const d = new Daily(w, pool, () => new Date(2026, 10, day, 12));
  for (; day <= 7; day++) d.checkIn();
  assert.equal(w.coins, REWARD.checkIn * 6 + REWARD.week);
});

test('finishing missions pays, all three add a bonus, then a new day rolls', () => {
  for (const k of Object.keys(store)) delete store[k];
  const w = wallet();
  let now = at(2026, 11, 2);
  const d = new Daily(w, pool, () => now());
  const [talk, visit, extra] = d.missions;
  assert.equal(d.record('talk', 'nobody'), null);
  assert.equal(d.record('talk', talk.target).coins, REWARD.mission);
  assert.equal(d.record('visit', visit.target).coins, REWARD.mission);
  let r = null;
  for (let i = 0; i < extra.need; i++) r = d.record(extra.type);
  assert.equal(r.coins, REWARD.mission + REWARD.allDone);
  assert.ok(d.allDone());
  assert.equal(w.coins, REWARD.mission * 3 + REWARD.allDone);
  now = at(2026, 11, 3);
  assert.ok(!d.allDone(), 'new missions the next day');
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});
