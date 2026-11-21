import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS, FARM_BEDS, FRESH, barnCount, barnKey, barnWorth, bedAct, bedState, cropById, hourly, sellPrice, timeLeft } from '../src/core/farm.js';

const MIN = 60e3;

test('five crops, all open, twelve beds (Yozi 2026-11-21)', () => {
  assert.deepEqual(CROPS.map((c) => [c.id, c.grow, c.seed, c.sell]), [
    ['lettuce', 20, 200, 500], ['tomato', 60, 400, 1200], ['potato', 180, 600, 2000], ['chili', 360, 800, 3000], ['cabbage', 720, 1000, 3400],
  ]);
  assert.equal(FARM_BEDS, 12);
  assert.equal(FRESH, 1.5);
  assert.equal(new Set(CROPS.map((c) => c.emoji)).size, CROPS.length, 'each crop has its own emoji');
});

test('a longer crop earns more a visit and less an hour', () => {
  for (let i = 1; i < CROPS.length; i++) {
    const a = CROPS[i - 1], b = CROPS[i];
    assert.ok(b.grow > a.grow);
    assert.ok(sellPrice(b, true) - b.seed > sellPrice(a, true) - a.seed, `${b.id} earns more a harvest than ${a.id}`);
    assert.ok(hourly(b, true) < hourly(a, true), `${b.id} earns less an hour than ${a.id}`);
  }
});

test('every crop pays for its seed even unwatered', () => {
  for (const c of CROPS) assert.ok(sellPrice(c, false) > c.seed, c.id);
});

test('tending all twelve beds non-stop stays under the daily missions an hour (about 100,000) and near fishing (10,000-50,000)', () => {
  const best = Math.max(...CROPS.map((c) => hourly(c, true))) * FARM_BEDS;
  assert.ok(best <= 30000, `best hour is ${best}`);
  assert.ok(best >= 10000, `best hour is ${best}`);
});

test('a bed: sprout, thirsty at half time, growing once watered, ripe at the end', () => {
  const at = 1e12, c = cropById('tomato'), span = c.grow * MIN;
  assert.equal(bedState(null).stage, 'empty');
  assert.equal(bedState({ crop: 'nope', at }).stage, 'empty');
  assert.equal(bedState({ crop: 'tomato', at }, at + span * 0.2).stage, 'sprout');
  assert.equal(bedState({ crop: 'tomato', at }, at + span * 0.6).stage, 'thirsty');
  const wet = at + span * 0.6;
  const g = bedState({ crop: 'tomato', at, wet }, at + span * 0.7);
  assert.equal(g.stage, 'growing');
  assert.equal(g.fresh, true);
  assert.equal(g.left, span * 0.3);
  const r = bedState({ crop: 'tomato', at, wet }, at + span + 5);
  assert.deepEqual([r.stage, r.fresh, r.t, r.left], ['ripe', true, 1, 0]);
  assert.equal(bedState({ crop: 'tomato', at }, at + span * 3).fresh, false, 'never watered: plain');
});

test('water counts only in the second half', () => {
  const at = 1e12, span = cropById('potato').grow * MIN;
  assert.equal(bedState({ crop: 'potato', at, wet: at + span * 0.1 }, at + span).fresh, false, 'too early');
  assert.equal(bedState({ crop: 'potato', at, wet: at + span * 1.2 }, at + span * 2).fresh, false, 'too late');
  assert.equal(bedState({ crop: 'potato', at, wet: at + span * 0.5 }, at + span).fresh, true);
});

test('what to do at a bed', () => {
  const at = 1e12, span = cropById('lettuce').grow * MIN;
  assert.equal(bedAct(null), 'plant');
  assert.equal(bedAct({ crop: 'lettuce', at }, at + 1), null);
  assert.equal(bedAct({ crop: 'lettuce', at }, at + span * 0.5), 'water');
  assert.equal(bedAct({ crop: 'lettuce', at, wet: at + span * 0.5 }, at + span * 0.6), null);
  assert.equal(bedAct({ crop: 'lettuce', at }, at + span), 'pick');
});

test('the barn', () => {
  const barn = { lettuce: 2, 'lettuce+': 1, 'cabbage+': 3, nope: 9, tomato: 0 };
  assert.equal(barnKey('chili', true), 'chili+');
  assert.equal(barnWorth(barn), 2 * 500 + 750 + 3 * 5100);
  assert.equal(barnCount(barn), 15);
  assert.equal(barnWorth(null), 0);
});

test('time left rounds up to the minute', () => {
  assert.deepEqual(timeLeft(1), { h: 0, m: 1 });
  assert.deepEqual(timeLeft(80 * MIN), { h: 1, m: 20 });
  assert.deepEqual(timeLeft(-5), { h: 0, m: 0 });
});

test('the server has the same crops and prices (supabase/064_farm.sql)', () => {
  const sql = readFileSync(new URL('../supabase/064_farm.sql', import.meta.url), 'utf8');
  for (const c of CROPS) {
    assert.ok(sql.includes(`('${c.id}', ${c.grow}, ${c.seed}, ${c.sell})`), `${c.id} row`);
  }
  assert.ok(sql.includes(`beds int not null default ${FARM_BEDS}`));
  assert.ok(sql.includes(`fresh numeric not null default ${FRESH}`));
});
