import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeOrder, orderLine, rightBowl, servePoints, tipFor, PATIENCE, CUSTOMERS } from '../src/core/pocha-game.js';
import { pickDelivery, timeFor, deliveryPay } from '../src/core/delivery.js';
import { chartFor, judge, karaokeScore, karaokeMsg, parseKaraoke, LEAD_BEATS } from '../src/core/karaoke-game.js';
import { layPrizes, drop, clawX, PRIZES } from '../src/core/claw-game.js';
import { DuckBoat, COURSE, duckPay, duckMsg, parseDuck } from '../src/core/duck-boat.js';
import { ITEMS } from '../src/core/inventory.js';
import { furnitureById } from '../src/core/furniture.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('stall: orders read as Korean and only the exact bowl counts', () => {
  const o = { spice: 'medium', toppings: ['cheese', 'egg'] };
  assert.equal(orderLine(o).ko, '떡볶이 보통맛에 치즈랑 계란 추가해 주세요');
  assert.equal(orderLine({ spice: 'mild', toppings: [] }).ko, '떡볶이 안 맵게 주세요');
  assert.ok(rightBowl(o, { spice: 'medium', toppings: ['egg', 'cheese'] }));
  assert.ok(!rightBowl(o, { spice: 'hot', toppings: ['egg', 'cheese'] }));
  assert.ok(!rightBowl(o, { spice: 'medium', toppings: ['egg'] }));
  assert.equal(servePoints(true, PATIENCE) * CUSTOMERS, 100);
  assert.equal(servePoints(false, PATIENCE), 0);
  assert.equal(tipFor(true, PATIENCE), 2);
  assert.equal(tipFor(true, 1), 1);
  for (let i = 0; i < 50; i++) { const r = makeOrder(); assert.ok(r.toppings.length <= 2 && new Set(r.toppings).size === r.toppings.length); }
});

test('delivery: a shop at a fair distance, time for a bike, pay for speed', () => {
  const stores = [{ id: 'near', x: 10, z: 0 }, { id: 'mid', x: 200, z: 0 }, { id: 'far', x: 2000, z: 0 }];
  assert.equal(pickDelivery(stores, { x: 0, z: 0 }, () => 0).id, 'mid');
  assert.equal(timeFor(200), Math.round(200 * 1.6 / 16 + 25));
  assert.equal(deliveryPay(-1), 0);
  assert.equal(deliveryPay(0), 4);
  assert.equal(deliveryPay(100), 8);
});

test('noraebang: the same chart for everyone, judged by timing', () => {
  const a = chartFor('jazz', 100), b = chartFor('jazz', 100);
  assert.deepEqual(a, b);
  assert.ok(a.length > 30 && a[0] >= LEAD_BEATS * 0.6);
  const hit = a.map(() => false);
  assert.equal(judge(a, hit, a[0] + 0.03).label, 'perfect');
  assert.equal(judge(a, hit, a[0] + 0.12).label, 'great');
  assert.equal(judge([1], [false], 1.5), null);
  assert.equal(karaokeScore(a.length * 3, a.length), 100);
  assert.equal(parseKaraoke(karaokeMsg(87)), 87);
  assert.equal(parseKaraoke('karaoke:999'), null);
});

test('claw: lined up grabs, off to the side misses; prizes are real items', () => {
  const pit = layPrizes(seq(0.1, 0.5));
  assert.equal(pit.length, 5);
  assert.equal(drop(pit, pit[2].x, () => 0.99).slipped, false);
  assert.equal(drop([{ x: 0.5, prize: PRIZES[0] }], 0.9), null);
  assert.ok(clawX(0) >= 0.08 && clawX(0) <= 0.92);
  for (const p of PRIZES) if (p.item) { assert.ok(ITEMS[p.item]?.plush, p.item); assert.ok(furnitureById(p.item), p.item); }
});

test('duck boat: alternate pedals, a friend adds strokes', () => {
  const b = new DuckBoat();
  b.pedal('L'); b.pedal('L'); b.pedal('R');
  assert.equal(b.mine, 2);
  const solo = b.dist;
  b.heard(10);
  b.heard(8); // old news
  assert.ok(b.dist > solo + 15);
  while (!b.done) b.pedal(b.last === 'L' ? 'R' : 'L');
  assert.ok(b.dist >= COURSE);
  assert.equal(duckPay(false, 10), 0);
  assert.equal(duckPay(true, 30), 6);
  assert.deepEqual(parseDuck(duckMsg('ab-1', 12)), { to: 'ab-1', strokes: 12 });
});
