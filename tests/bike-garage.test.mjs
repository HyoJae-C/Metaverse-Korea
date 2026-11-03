import test from 'node:test';
import assert from 'node:assert/strict';
import { Garage, BIKE_MODELS, RIDE_TYPES, SKIN_COLORS, SKIN_PRICE, rideCode, parseRide, wornSpeed, repairCost, WEAR_PER_M } from '../src/core/bike-garage.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const walletOf = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } });
const RUN = 12;

test('the basic bike is a little faster than running; the others step up gently', () => {
  assert.equal(BIKE_MODELS[0].price, 0);
  assert.ok(BIKE_MODELS[0].speed > RUN && BIKE_MODELS[0].speed < RUN * 1.2);
  for (const type of RIDE_TYPES) {
    const line = BIKE_MODELS.filter((m) => m.type === type);
    assert.ok(line.length >= 3, type);
    assert.ok(line[0].speed > RUN && line[0].speed < RUN * 1.2, type);
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      assert.ok(b.speed > a.speed && b.speed - a.speed <= 1.5, b.id);
      assert.ok(b.price > a.price && b.price <= 400, b.id);
      assert.ok(b.tier >= a.tier, b.id);
    }
    assert.equal(line.at(-1).tier, 2, type);
  }
});

test('skins: buy a colour or pattern once, put it on or off, and others see it', () => {
  const st = memory();
  const g = new Garage(st);
  const w = walletOf(SKIN_PRICE.color + SKIN_PRICE.pattern + 5);
  assert.equal(g.rideSpec().pattern, null);
  assert.equal(g.buySkin('color', 'pink', w), 'bought');
  assert.equal(g.buySkin('color', 'pink', w), 'owned');
  assert.equal(g.buySkin('pattern', 'hangul', w), 'bought');
  assert.equal(g.buySkin('pattern', 'star', w), 'poor');
  assert.equal(g.buySkin('pattern', 'nope', w), 'unknown');
  assert.equal(w.coins, 5);
  assert.deepEqual(g.rideSpec(), { type: 'bike', tier: 0, color: SKIN_COLORS.pink, pattern: 'hangul' });
  assert.ok(!g.setSkin('pattern', 'star'));
  assert.ok(g.setSkin('pattern', null));
  const again = new Garage(st);
  assert.equal(again.s.skin.color, 'pink');
  assert.equal(again.s.skin.pattern, null);
  assert.ok(again.hasSkin('pattern', 'hangul'));
  // What others receive.
  const spec = { type: 'kick', tier: 2, color: '#ff8fc7', pattern: 'bolt' };
  assert.deepEqual(parseRide(rideCode(spec)), spec);
  assert.deepEqual(parseRide('skate.1.-.-'), { type: 'skate', tier: 1, color: null, pattern: null });
  assert.equal(parseRide('rocket.9.x.y'), null);
  assert.equal(parseRide('bike.7.red;.<b>').tier, 2);
  assert.equal(parseRide('bike.7.red;.<b>').color, null);
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
