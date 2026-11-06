import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeOrder, orderLine, rightBowl, servePoints, PATIENCE, CUSTOMERS } from '../src/core/pocha-game.js';
import { pickDelivery, timeFor, deliveryPay, reachable, BIKE_MS, MAX_ROAD, MAX_SECONDS } from '../src/core/delivery.js';
import { chartFor, judge, karaokeScore, karaokeMsg, parseKaraoke, LEAD_BEATS } from '../src/core/karaoke-game.js';
import { layPrizes, drop, clawX, PRIZES } from '../src/core/claw-game.js';
import { DuckRide, RIDE_SECONDS, WATER, PIER, BOAT_R, onWater, clock } from '../src/core/duck-boat.js';
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
  for (let i = 0; i < 50; i++) { const r = makeOrder(); assert.ok(r.toppings.length <= 2 && new Set(r.toppings).size === r.toppings.length); }
});

test('delivery: only shops reachable within a minute, time for a bike, pay for speed', () => {
  const stores = [{ id: 'near', x: 10, z: 0 }, { id: 'mid', x: 200, z: 0, road: 260 }, { id: 'far', x: 2000, z: 0 }, { id: 'winding', x: 300, z: 0, road: 900 }];
  assert.equal(pickDelivery(stores, { x: 0, z: 0 }, () => 0).id, 'mid');
  assert.equal(pickDelivery(stores, { x: 0, z: 0 }, () => 0.99).id, 'mid', 'the far and winding ones take over a minute');
  assert.equal(pickDelivery([{ id: 'far', x: 2000, z: 0 }], { x: 0, z: 0 }), null);
  assert.equal(timeFor(260), Math.round(260 / BIKE_MS + 20));
  assert.ok(timeFor(MAX_ROAD) <= MAX_SECONDS && timeFor(5000) === MAX_SECONDS);
  assert.ok(reachable(MAX_ROAD) && !reachable(MAX_ROAD + 20));
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

test('duck boat: a free minute on the water, then back to the dock', () => {
  const home = { x: 10, z: -5.7 };
  const r = new DuckRide(home);
  for (let t = 0; t < 5; t += 0.05) r.steer(0, -1, 0.05); // straight out
  assert.ok(r.z < home.z - 10, 'out on the river');
  for (let t = 0; t < 20; t += 0.05) r.steer(-1, 0, 0.05); // hard left, past the pier
  assert.ok(r.x < PIER.minX, 'went past the pier');
  for (let t = 0; t < 60; t += 0.05) r.steer(0, -1, 0.05); // keep going: the far side stops it
  assert.ok(r.z >= WATER.minZ && r.x >= WATER.minX, 'stays on the water');
  assert.ok(r.returning && r.left === 0, 'a minute at most');
  r.steer(1, 1, 0.05); // the stick does nothing now
  for (let t = 0; t < 120 && !r.docked; t += 0.05) {
    r.steer(0, 0, 0.05);
    const inPier = r.x > PIER.minX - BOAT_R + 0.01 && r.x < PIER.maxX + BOAT_R - 0.01 && r.z > PIER.minZ - BOAT_R + 0.01;
    assert.ok(!inPier, `through the pier at ${r.x},${r.z}`);
  }
  assert.ok(r.docked, 'brought back');
  assert.deepEqual([r.x, r.z, r.ry], [home.x, home.z, 0]);
  const early = new DuckRide(home);
  early.steer(0, -1, 1); early.goBack();
  assert.ok(early.returning && early.left > RIDE_SECONDS - 2);
  assert.deepEqual(onWater(0.5, -6), [PIER.maxX + BOAT_R, -6]); // off the pier
  assert.ok(onWater(0, 5)[1] <= WATER.maxZ); // off the land
  assert.equal(clock(42.2), '0:43');
  assert.equal(clock(60), '1:00');
});
