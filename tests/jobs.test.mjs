import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHIFTS_PER_DAY, MAX_PAY, shiftsLeft, takeShift, shiftPay, jobOf, hiringLines, JOB_TEXT,
  makeMartCustomer, MART_ITEMS, makeServeTurn, serveRight, SERVE_DISHES, SERVE_ASKS,
} from '../src/core/jobs.js';
import { assignSpots } from '../src/core/hiring-ads.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));

test('part-time jobs: delivery in Seongsu (2), convenience stores in Hongdae (2), serving in Itaewon (1)', () => {
  const region = read('region.json');
  const stores = read('stores.json').stores;
  const off = Object.fromEntries(region.districts.map((d) => [d.id, d.offset]));
  const district = (s) => Object.entries(off).sort(([, a], [, b]) => Math.hypot(s.at[0] - a[0], s.at[1] - a[1]) - Math.hypot(s.at[0] - b[0], s.at[1] - b[1]))[0][0];
  const jobs = stores.filter((s) => jobOf(s)).map((s) => `${district(s)}:${s.job}`).sort();
  assert.deepEqual(jobs, ['hongdae:mart', 'hongdae:mart', 'itaewon:serving', 'seongsu:delivery', 'seongsu:delivery']);
  for (const s of stores.filter((q) => q.job === 'mart')) assert.equal(s.category, 'market');
});

test('shifts: a few a day for all jobs together, counted again the next day', () => {
  let s = null;
  for (let i = 0; i < SHIFTS_PER_DAY; i++) { s = takeShift(s, '2026-11-05'); assert.ok(s); }
  assert.equal(shiftsLeft(s, '2026-11-05'), 0);
  assert.equal(takeShift(s, '2026-11-05'), null);
  assert.equal(shiftsLeft(s, '2026-11-06'), SHIFTS_PER_DAY);
  assert.equal(shiftPay(0, 8), 2);
  assert.equal(shiftPay(8, 8), MAX_PAY);
  assert.equal(shiftPay(0, 0), 0);
});

test('convenience store: the right change is always one of the options', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 200; i++) {
    const c = makeMartCustomer(rand);
    assert.ok(c.items.length >= 1 && c.items.length <= 3);
    assert.equal(new Set(c.items.map((x) => x.id)).size, c.items.length);
    assert.equal(c.total, c.items.reduce((s, x) => s + x.price, 0));
    assert.ok(c.paid > c.total && c.change === c.paid - c.total);
    assert.equal(c.options.length, 3);
    assert.ok(c.options.includes(c.change) && c.options.every((v) => v > 0));
    assert.equal(new Set(c.options).size, 3);
    if (c.ask === 'warm') assert.ok(c.items.some((x) => x.warm), 'heat up only food that can be heated');
  }
  assert.ok(MART_ITEMS.every((x) => x.ko && x.price > 0 && x.name.en));
});

test('serving: a dish goes to its table, a request needs the right thing', () => {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const kinds = new Set();
  for (let i = 0; i < 100; i++) {
    const t = makeServeTurn(rand);
    kinds.add(t.kind);
    assert.ok(t.ko && t.rom && t.mean.en);
    assert.ok([...SERVE_DISHES, ...SERVE_ASKS].some((x) => x.id === t.item));
    assert.ok(serveRight(t, { table: t.table, item: t.item }));
    assert.ok(!serveRight(t, { table: (t.table % 4) + 1, item: t.item }));
  }
  assert.deepEqual([...kinds].sort(), ['ask', 'dish']);
});

test('hiring posters: "알바급구!", the shop, the job, where and the pay, in each language', () => {
  const en = hiringLines('delivery', 'en', { shopNames: { en: 'Golmok Chicken', ko: '골목 치킨' }, district: 'seongsu', meters: 123 });
  assert.equal(en.flavor, '알바급구!');
  assert.equal(en.head, 'HELP WANTED');
  assert.equal(en.shop, 'Golmok Chicken');
  assert.equal(en.where, '📍 Seongsu · 120 m from here');
  assert.ok(en.pay.includes(String(MAX_PAY)));
  const ko = hiringLines('mart', 'ko', { shopNames: { en: 'SODA 24', ko: '소다24' }, district: 'hongdae' });
  assert.equal(ko.shop, '소다24');
  assert.equal(ko.where, '📍 홍대');
  for (const l of ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar']) {
    assert.ok(JOB_TEXT.help[l] && JOB_TEXT.pay[l] && JOB_TEXT.walkIn[l] && JOB_TEXT.sticker[l], l);
    for (const k of ['delivery', 'mart', 'serving']) assert.ok(JOB_TEXT.role[k][l], `${k} ${l}`);
  }
});

test('hiring posters take the nearest free ad spot, one shop per spot', () => {
  const shops = [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 5, z: 0 }, { id: 'far', x: 5000, z: 0 }];
  const spots = [{ id: 'L-01', front: { x: 10, z: 0 } }, { id: 'L-02', front: { x: 50, z: 0 } }];
  const got = assignSpots(shops, spots, 260);
  assert.equal(got.b.spot, 'L-01');
  assert.equal(got.a.spot, 'L-02');
  assert.equal(got.far, undefined);
});
