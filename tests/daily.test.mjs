import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Daily, missionsFor, dayKey, REWARD, CHECK_IN, HARD_MISSIONS, VISIT_FARE, missionPay } = await import('../src/core/daily.js');

const pool = { npcs: ['민지', '지훈', '서연'], stores: [{ id: 'a' }, { id: 'b' }, { id: 'cats', pets: 'cats' }] };
const wallet = () => ({ coins: 0, add(n) { this.coins += n; } });
const at = (y, m, d) => () => new Date(y, m - 1, d, 12);

test('same day gives the same five missions: three easy, two challenges', () => {
  const a = missionsFor('2026-11-02', pool), b = missionsFor('2026-11-02', pool);
  assert.deepEqual(a, b);
  assert.equal(a.length, 5);
  assert.equal(a.filter((m) => m.hard).length, 2);
  assert.ok(a.slice(0, 3).every((m) => !m.hard), 'the easy three come first');
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
  assert.equal(w.coins, CHECK_IN[0] + CHECK_IN[1] + CHECK_IN[0], 'day 1, day 2, then day 1 again');
});

test('travel support money grows each day of a streak, ₩10,000 to ₩70,000, then starts over', () => {
  for (const k of Object.keys(store)) delete store[k];
  const w = wallet();
  let day = 1;
  const d = new Daily(w, pool, () => new Date(2026, 10, day, 12));
  for (; day <= 7; day++) d.checkIn();
  assert.equal(w.coins, 280000);
  // (day is 8 now)
  assert.equal(d.checkIn(), 10000, 'day 8 is day 1 again');
});

test('every mission pays ₩30,000, no all-done bonus, then a new day rolls', () => {
  for (const k of Object.keys(store)) delete store[k];
  const w = wallet();
  let now = at(2026, 11, 2);
  const d = new Daily(w, pool, () => now());
  assert.equal(REWARD.mission, 30000);
  assert.equal(d.record('talk', 'nobody'), null);
  for (const m of d.missions) {
    let r = null;
    for (let i = 0; i < m.need; i++) r = d.record(m.type, m.target || '');
    assert.equal(r.coins, 30000, m.type);
  }
  assert.ok(d.allDone());
  assert.equal(w.coins, 150000, 'five missions');
  now = at(2026, 11, 3);
  assert.ok(!d.allDone(), 'new missions the next day');
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('challenge missions: two different kinds a day, never the easy third kind', () => {
  const kinds = new Set(HARD_MISSIONS.map(([k]) => k));
  for (let d = 1; d <= 30; d++) {
    const list = missionsFor(`2026-12-${String(d).padStart(2, '0')}`, pool);
    const hard = list.filter((m) => m.hard);
    assert.equal(hard.length, 2);
    assert.notEqual(hard[0].type, hard[1].type);
    for (const m of hard) {
      assert.ok(kinds.has(m.type));
      assert.notEqual(m.type, list[2].type);
      assert.equal(m.need, Object.fromEntries(HARD_MISSIONS)[m.type]);
    }
  }
});

test('a delivery run counts for the part-time shifts challenge', () => {
  for (const k of Object.keys(store)) delete store[k];
  let day = 1;
  for (; day <= 31; day++) if (missionsFor(`2026-12-${String(day).padStart(2, '0')}`, pool).some((m) => m.type === 'job')) break;
  const d = new Daily(wallet(), pool, () => new Date(2026, 11, day, 12));
  const job = d.missions.find((m) => m.type === 'job');
  d.record('delivery');
  assert.equal(job.n, 1);
});

test('visiting a paid place pays its fare on top: the cable car mission is ₩45,000', async () => {
  const { CABLE } = await import('../src/core/cablecar.js');
  assert.equal(VISIT_FARE['namsan-sky-cable'], CABLE.fare);
  assert.equal(missionPay({ type: 'visit', target: 'namsan-sky-cable' }), 45000);
  assert.equal(missionPay({ type: 'visit', target: 'a' }), 30000);
  assert.equal(missionPay({ type: 'fish', need: 30, hard: true }), 30000);
});

test('today saved with the old three missions gets today\'s two challenges added', () => {
  for (const k of Object.keys(store)) delete store[k];
  const three = missionsFor('2026-11-20', pool).filter((m) => !m.hard);
  three[0].n = three[0].need;
  store['mk.daily'] = JSON.stringify({ day: '2026-11-20', missions: three, bonus: false });
  const d = new Daily(wallet(), pool, at(2026, 11, 20));
  assert.equal(d.missions.length, 5);
  assert.equal(d.missions[0].n, d.missions[0].need, 'progress kept');
  assert.equal(d.missions.filter((m) => m.hard).length, 2);
});
