import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LEVELS, PER_MIN, STD_SEC, MIN_SEC, FIRST_N, FIRST_PAY, CHANGE_DAYS,
  levelOf, skillOf, hourly, shiftPayFor, xpFor, nextChange, LocalCareer,
} from '../src/core/career.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const fakeWallet = () => { const w = { got: [], add(n, note, opt) { w.got.push({ n, opt }); } }; return w; };

test('hourly pay follows the curve Yozi approved: base 25k, Lv1 30k, Lv3 40k, Lv5 50k, Lv10 60k', () => {
  const near = (a, b) => Math.abs(a - b) <= 1000;
  assert.ok(near(hourly(null), 25000));
  assert.ok(near(hourly(1), 30000));
  assert.ok(near(hourly(3), 40000));
  assert.ok(near(hourly(5), 50000));
  assert.ok(near(hourly(10), 60000));
});

test('levels: first ones come fast, Lv10 takes a month of an hour a day', () => {
  // a shift is about 1.5 minutes and gives 2 points on average: 40 shifts an hour
  const hoursTo = (lv) => LEVELS.find((l) => l.lv === lv).xp / 2 / 40;
  assert.ok(hoursTo(3) <= 1, 'Lv3 within the first hour');
  assert.ok(hoursTo(5) >= 4 && hoursTo(5) <= 8, 'Lv5 in about a week');
  assert.ok(hoursTo(10) >= 30, 'Lv10 takes 30+ hours');
  assert.equal(levelOf(0).lv, 1);
  assert.equal(levelOf(59).lv, 2);
  assert.equal(levelOf(60).lv, 3);
  assert.equal(levelOf(99999).lv, 10);
  assert.deepEqual(skillOf(70), { lv: 3, mult: 1.6, xp: 70, into: 10, need: 140 });
  assert.equal(skillOf(2500).need, 0);
});

test('shift pay: first five of the day pay 5,000, then time x level, too fast pays nothing', () => {
  assert.equal(shiftPayFor({ job: 'mart', sec: 90, score: 1, mine: false, todayN: 0 }), FIRST_PAY);
  assert.equal(shiftPayFor({ job: 'mart', sec: 90, score: 1, mine: false, todayN: FIRST_N }), Math.round(PER_MIN * 1.5 / 10) * 10);
  const lv10 = shiftPayFor({ job: 'mart', sec: 90, score: 1, mine: true, xp: 2500, todayN: 9 });
  assert.equal(lv10, Math.round(PER_MIN * 1.5 * 2.4 / 10) * 10);
  // dawdling is not paid: time counts up to the job's standard
  assert.equal(shiftPayFor({ job: 'mart', sec: 600, score: 1, mine: false, todayN: 9 }), shiftPayFor({ job: 'mart', sec: STD_SEC.mart, score: 1, mine: false, todayN: 9 }));
  assert.equal(shiftPayFor({ job: 'mart', sec: MIN_SEC.mart - 1, score: 1, mine: true, todayN: 0 }), 0);
  assert.ok(shiftPayFor({ job: 'serving', sec: 90, score: 0, mine: false, todayN: 9 }) > 0, 'showing up still pays');
  assert.equal(xpFor(0), 1); assert.equal(xpFor(1), 3);
});

test('LocalCareer: no daily limit, skill only for my job, change once a week', async () => {
  let now = Date.UTC(2026, 10, 21, 3);
  const w = fakeWallet();
  const c = new LocalCareer(w, memStore(), () => now);
  assert.equal((await c.choose('mart')).job, 'mart');
  assert.equal((await c.choose('serving')).error, 'wait');
  for (let i = 0; i < 12; i++) {
    const { run } = await c.start('mart');
    now += 60e3;
    const r = await c.finish(run, 1, null);
    assert.ok(r.paid > 0, `shift ${i + 1} pays`);
  }
  assert.equal(w.got.length, 12, 'no five-a-day limit');
  assert.ok(w.got.slice(0, 5).every((g) => g.n === FIRST_PAY));
  const { run } = await c.start('serving');
  now += 60e3;
  assert.equal((await c.finish(run, 1, null)).xp, 0, 'not my job: no skill');
  const info = await c.info();
  assert.equal(info.skills.mart.xp, 36);
  assert.equal(info.skills.serving.shifts, 1);
  const fast = await c.start('mart');
  now += 5e3;
  assert.equal((await c.finish(fast.run, 1, null)).error, 'fast');
  now += CHANGE_DAYS * 864e5;
  assert.equal((await c.choose('serving')).job, 'serving');
  assert.equal(nextChange(0, now), 0);
});

test('the SQL has the same numbers as the game', () => {
  const sql = readFileSync(new URL('../supabase/065_jobs.sql', import.meta.url), 'utf8');
  for (const l of LEVELS) assert.match(sql, new RegExp(`\\(${l.lv}, ${l.xp}, ${l.mult}(\\.0)?\\)`), `level ${l.lv}`);
  for (const [job, sec] of Object.entries(STD_SEC)) assert.match(sql, new RegExp(`\\('${job}', ${sec}, ${MIN_SEC[job]},`), job);
  assert.match(sql, new RegExp(`per_min int not null default ${PER_MIN}`));
  assert.match(sql, new RegExp(`first_n int not null default ${FIRST_N}`));
  assert.match(sql, new RegExp(`first_pay int not null default ${FIRST_PAY}`));
  assert.match(sql, new RegExp(`change_days int not null default ${CHANGE_DAYS}`));
});
