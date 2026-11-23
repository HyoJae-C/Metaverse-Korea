import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { startTimed, dueTimed, daysLeft, loadTimed, saveTimed } from '../src/core/timed-wear.js';
import { ITEMS } from '../src/core/inventory.js';
import { TIMED_SECS } from '../src/data/wearables.js';
import { sellable } from '../src/core/resale.js';
import { listable } from '../src/core/market.js';

const DAY = 24 * 3600 * 1000;
const ONESIES = ['outfit-onesie-bear', 'outfit-onesie-bunny', 'outfit-onesie-dino'];

test('animal onesies are limited-time (one number for all), cheaper than other clothes', () => {
  for (const id of ONESIES) {
    assert.equal(ITEMS[id].secs, TIMED_SECS, id);
    assert.equal(ITEMS[id].price, 50000, id);
  }
  // (and Pop-up A's autumn line, tests/popup-a.test.mjs)
  assert.ok(Object.entries(ITEMS).filter(([, it]) => it.secs).every(([id]) => ONESIES.includes(id) || /^(acc-(newsboy|flatcap)|outfit-trench)-/.test(id)), 'only the onesies and the autumn pop-up');
});

test('a limited item is gone 7 days after buying; days left count down', () => {
  const t0 = Date.UTC(2026, 10, 20);
  let map = startTimed({}, 'outfit-onesie-bear', 7 * 24 * 3600, t0);
  assert.equal(daysLeft(map, 'outfit-onesie-bear', t0), 7);
  assert.equal(daysLeft(map, 'outfit-onesie-bear', t0 + 6.5 * DAY), 1);
  let r = dueTimed(map, ['outfit-onesie-bear', 'pants-denim'], ITEMS, t0 + 7 * DAY - 1);
  assert.deepEqual(r.gone, []);
  r = dueTimed(map, ['outfit-onesie-bear', 'pants-denim'], ITEMS, t0 + 7 * DAY);
  assert.deepEqual(r.gone, ['outfit-onesie-bear']);
  assert.deepEqual(r.map, {});
  // one owned with no record (lost save) gets its time from now, not forever
  r = dueTimed({}, ['outfit-onesie-dino'], ITEMS, t0);
  assert.deepEqual(r.gone, []);
  assert.equal(r.map['outfit-onesie-dino'], t0 + TIMED_SECS * 1000);
  // a record for one no longer owned is dropped
  assert.deepEqual(dueTimed(map, [], ITEMS, t0).map, {});
});

test('saved on the device; junk is ignored', () => {
  const box = new Map();
  const storage = { getItem: (k) => box.get(k) ?? null, setItem: (k, v) => box.set(k, v) };
  saveTimed({ a: 5 }, storage);
  assert.deepEqual(loadTimed(storage), { a: 5 });
  box.set('mk.timed', '{"a":"x","b":3}');
  assert.deepEqual(loadTimed(storage), { b: 3 });
  box.set('mk.timed', 'nope');
  assert.deepEqual(loadTimed(storage), {});
});

test('limited items can\'t be sold back or put on a Potato Market mat', () => {
  const receipts = { paid: () => 50000, get: () => ({}) };
  const owned = ['outfit-onesie-bear', 'outfit-knit-grey'];
  assert.deepEqual(sellable(owned, ITEMS, receipts).map((r) => r.id), ['outfit-knit-grey']);
  assert.deepEqual(listable(owned, ITEMS, receipts).map((r) => r.id), ['outfit-knit-grey']);
});

test('the server knows every limited item and its time (supabase/058, 059, 070)', () => {
  const rowsOf = (f) => {
    const sql = readFileSync(new URL('../supabase/' + f, import.meta.url), 'utf8');
    return Object.fromEntries([...sql.matchAll(/\('([a-z0-9-]+)', (\d+)\)/g)].map((m) => [m[1], Number(m[2])]));
  };
  const timed = Object.fromEntries(Object.entries(ITEMS).filter(([, it]) => it.secs).map(([id, it]) => [id, it.secs]));
  // 059 lists the Christmas accessories ahead of the game (PR #818).
  const rows = { ...rowsOf('058_timed_clothes.sql'), ...rowsOf('070_autumn_popup_timed.sql') };
  assert.deepEqual(rows, timed);
  for (const id of Object.keys(rowsOf('059_christmas_timed.sql'))) assert.ok(!ITEMS[id] || ITEMS[id].secs === TIMED_SECS, id);
});

test('a bag worn but not in the closet is found; owned ones and free looks are not', async () => {
  const { unownedWorn } = await import('../src/core/inventory.js');
  const look = { model: 'basic', back: 'tote-forest', head: 'towel' };
  assert.deepEqual(unownedWorn(look, ITEMS, () => false), ['acc-tote-forest']);
  assert.deepEqual(unownedWorn(look, ITEMS, (id) => id === 'acc-tote-forest'), []);
  assert.deepEqual(unownedWorn({ model: 'basic' }, ITEMS, () => false), []);
});
