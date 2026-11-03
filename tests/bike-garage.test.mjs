import test from 'node:test';
import assert from 'node:assert/strict';
import { Garage, BIKE_MODELS, wornSpeed, repairCost, WEAR_PER_M } from '../src/core/bike-garage.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const walletOf = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } });
const RUN = 12;

test('the basic bike is a little faster than running; the others step up gently', () => {
  assert.equal(BIKE_MODELS[0].price, 0);
  assert.ok(BIKE_MODELS[0].speed > RUN && BIKE_MODELS[0].speed < RUN * 1.2);
  for (let i = 1; i < BIKE_MODELS.length; i++) {
    const a = BIKE_MODELS[i - 1], b = BIKE_MODELS[i];
    assert.ok(b.speed > a.speed && b.speed - a.speed <= 1, b.id);
    assert.ok(b.price > a.price && b.price <= 400, b.id);
  }
});

test('buying, choosing and remembering bikes', () => {
  const st = memory();
  const g = new Garage(st);
  assert.equal(g.current.id, 'basic');
  const w = walletOf(100);
  assert.equal(g.buy('road', w), 'poor');
  assert.equal(g.buy('city', w), 'bought');
  assert.equal(w.coins, 20);
  assert.equal(g.current.id, 'city');
  assert.equal(g.buy('city', w), 'owned');
  assert.ok(g.use('basic'));
  assert.ok(!g.use('road'));
  const again = new Garage(st);
  assert.ok(again.has('city') && again.current.id === 'basic');
});

test('bikes wear very slowly and the shop repairs them for a few coins', () => {
  const g = new Garage(memory());
  assert.equal(g.durability(), 100);
  g.ride(500);
  assert.ok(Math.abs(g.durability() - (100 - 500 * WEAR_PER_M)) < 1e-9);
  assert.ok(g.durability() > 98.9);
  let low = false;
  for (let i = 0; i < 100 && !low; i++) low = g.ride(500);
  assert.ok(low, 'warns once when it gets low');
  assert.ok(g.speed() < BIKE_MODELS[0].speed && g.speed() >= BIKE_MODELS[0].speed * 0.9);
  const w = walletOf(50);
  const cost = repairCost(g.durability());
  assert.ok(cost > 0 && cost <= 10);
  assert.equal(g.repair('basic', w), 'fixed');
  assert.equal(w.coins, 50 - cost);
  assert.equal(g.durability(), 100);
  assert.equal(g.repair('basic', w), 'fine');
  assert.equal(wornSpeed(10, 0), 9);
});

test('broken saves fall back to the basic bike', () => {
  const st = memory();
  st.setItem('mk.bikes', '{"own":["rocket"],"use":"rocket","dur":{"basic":"x"}}');
  const g = new Garage(st);
  assert.deepEqual(g.s.own, ['basic']);
  assert.equal(g.current.id, 'basic');
  assert.equal(g.durability(), 100);
});
