import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANCE, LEVEL_OPEN, DAILY_SEASONING, START_SEASONING, MISSION_SEASONING, CLASS_SEASONING, chanceFor, costFor, gaugeStep, rollUpgrade, dishKindOf, startLevel } from '../src/core/dish-upgrade.js';
import { LocalUpgradeStore } from '../src/core/dish-upgrade-store.js';
import { giftEntry } from '../src/core/bag.js';
import { giftKind } from '../src/core/held.js';
import { kimchiJar } from '../src/core/kimchi-market.js';

const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d }; };
const kimbap = (q = 50, more = {}) => ({ kind: 'gift', sips: 1, name: 'Kimbap', icon: '🍙', g: 'kimbap', q, ...more });

test('the odds: 20 open levels, falling, published in full', () => {
  assert.equal(CHANCE.length, LEVEL_OPEN);
  assert.equal(CHANCE[0], 100);
  for (let i = 1; i < CHANCE.length; i++) assert.ok(CHANCE[i] < CHANCE[i - 1]);
  assert.equal(chanceFor(LEVEL_OPEN, 0), 0);
  assert.equal(chanceFor(10, 7), CHANCE[10] + 7);
  assert.equal(chanceFor(1, 500), 100);
});

test('cost: 1 seasoning up to +10, then the level tried for', () => {
  assert.equal(costFor(1), 1);
  assert.equal(costFor(10), 1);
  assert.equal(costFor(11), 11);
  assert.equal(costFor(20), 20);
  assert.equal(gaugeStep(10), 5);
  assert.equal(gaugeStep(11), 2);
});

test('a failed try keeps the level and fills the gauge; a success empties it', () => {
  const fail = rollUpgrade(12, 4, () => 0.999);
  assert.deepEqual([fail.ok, fail.lv, fail.gauge], [false, 12, 6]);
  const ok = rollUpgrade(12, 4, () => 0);
  assert.deepEqual([ok.ok, ok.lv, ok.gauge, ok.cost], [true, 13, 0, 13]);
});

test('dishes that can be upgraded, and a gold medal starting at +1', () => {
  assert.equal(dishKindOf(kimbap()), 'kimbap');
  assert.equal(dishKindOf(kimchiJar(80)), 'kimchi');
  assert.equal(dishKindOf({ kind: 'coffee', sips: 3 }), null);
  assert.equal(startLevel(kimbap(95)), 1);
  assert.equal(startLevel(kimbap(40)), 0);
});

test('local store: 10 seasoning to start, daily claims once, tries limited', async () => {
  const s = new LocalUpgradeStore(mem(), () => 0);
  const now = Date.UTC(2026, 10, 17, 3);
  let info = await s.info(now);
  assert.equal(info.n, START_SEASONING);
  assert.equal((await s.claim('mission', null, now)).granted, MISSION_SEASONING);
  assert.equal((await s.claim('mission', null, now)).granted, 0);
  assert.equal((await s.claim('class', 'kimbap', now)).granted, CLASS_SEASONING);
  assert.equal((await s.claim('class', 'kimbap', now)).granted, 0);
  info = await s.info(now);
  assert.equal(info.n, START_SEASONING + MISSION_SEASONING + CLASS_SEASONING);
  const r = await s.upgrade({ requestId: 'a', lv: 0 }, now);
  assert.equal(r.lv, 1);
  assert.equal(r.n, info.n - 1);
  assert.equal((await s.upgrade({ requestId: 'a', lv: 0 }, now)).error, 'network'); // (the same try twice counts once)
  assert.equal((await s.claim('daily', null, now)).granted, DAILY_SEASONING); // the check-in's 5
  assert.equal((await s.claim('daily', null, now)).granted, 0);
  for (let i = 0; i < 14; i++) await s.upgrade({ requestId: 'b' + i, lv: 1 }, now);
  info = await s.info(now);
  assert.equal(info.tries, 15); // no daily limit on tries
  assert.ok(info.daily >= 1000);
  assert.equal((await s.info(now + 86400000)).tries, 0); // a new day
  assert.equal((await s.claim('daily', null, now + 86400000)).granted, DAILY_SEASONING);
});

test('local store: not enough seasoning, and the highest level', async () => {
  const s = new LocalUpgradeStore(mem(), () => 0);
  assert.equal((await s.upgrade({ requestId: 'x', lv: 15 })).error, 'seasoning');
  assert.equal((await s.upgrade({ requestId: 'y', lv: LEVEL_OPEN })).error, 'max');
});

test('a bag entry keeps its level, gauge, server id and maker', () => {
  const u = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const e = giftEntry(kimbap(70, { lv: 12, gz: 6, u, by: 'Mina' }));
  assert.deepEqual([e.lv, e.gz, e.u, e.by], [12, 6, u, 'Mina']);
  const bad = giftEntry(kimbap(70, { lv: 99, gz: -3, u: 'nope' }));
  assert.equal(bad.lv, 30);
  assert.equal(bad.gz, undefined);
  assert.equal(bad.u, undefined);
});

test('held: an upgraded dish carries its level from +5', () => {
  assert.equal(giftKind(kimbap(50, { lv: 4 })), 'gift:kimbap');
  assert.equal(giftKind(kimbap(50, { lv: 12 })), 'gift:kimbap.12');
});
