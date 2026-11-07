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

test('ride shops: each sells its own skins; the Hunminjeongeum line only by the palace', async () => {
  const { RIDE_SHOPS, SKIN_PATTERNS, shopOf, skinPrice } = await import('../src/core/bike-garage.js');
  const { TILE_PATTERNS } = await import('../src/core/ride-patterns.js');
  const sold = { colors: [], patterns: [] };
  for (const shop of Object.values(RIDE_SHOPS)) { sold.colors.push(...shop.colors); sold.patterns.push(...shop.patterns); }
  // Every skin is sold by exactly one shop.
  assert.deepEqual([...sold.colors].sort(), Object.keys(SKIN_COLORS).sort());
  assert.deepEqual([...sold.patterns].sort(), [...SKIN_PATTERNS].sort());
  assert.ok(RIDE_SHOPS.hangul.limited && RIDE_SHOPS.hangul.patterns.length >= 8, 'lots of Hangul patterns');
  // Shop patterns are drawn as whole tiles (ride-patterns.js).
  for (const p of SKIN_PATTERNS) if (shopOf('pattern', p) !== 'pedal') assert.ok(TILE_PATTERNS.includes(p), p);
  const g = new Garage(memory());
  const w = walletOf(500);
  assert.equal(g.buySkin('pattern', 'hunmin', w, 'lab'), 'elsewhere');
  assert.equal(w.coins, 500);
  assert.equal(g.buySkin('pattern', 'hunmin', w, 'hangul'), 'bought');
  assert.equal(w.coins, 500 - skinPrice('pattern', 'hunmin'));
  assert.ok(skinPrice('pattern', 'hunmin') > skinPrice('pattern', 'flame') && skinPrice('pattern', 'flame') > SKIN_PRICE.pattern);
  // Once bought it goes on anywhere, and others see it.
  assert.equal(g.rideSpec().pattern, 'hunmin');
  assert.deepEqual(parseRide(rideCode(g.rideSpec())), g.rideSpec());
});

test('tune-ups make an owned ride a little faster; long-ride kits make it wear slower', async () => {
  const { UPGRADE_MAX, TUNE_STEP, KIT_WEAR } = await import('../src/core/bike-garage.js');
  const st = memory();
  const g = new Garage(st);
  const w = walletOf(1000);
  assert.equal(g.upgrade('tune', 'road', w), 'unknown'); // not owned
  assert.equal(g.upgrade('nitro', 'basic', w), 'unknown');
  const base = g.speed();
  for (let i = 0; i < UPGRADE_MAX; i++) assert.equal(g.upgrade('tune', 'basic', w), 'upgraded');
  assert.equal(g.upgrade('tune', 'basic', w), 'max');
  assert.ok(Math.abs(g.speed() - base - UPGRADE_MAX * TUNE_STEP) < 1e-9);
  // Still under the next tier's top speed step: small on purpose.
  assert.ok(UPGRADE_MAX * TUNE_STEP < 1);
  assert.equal(g.upgrade('kit', 'basic', w), 'upgraded');
  g.ride(500);
  assert.ok(Math.abs(g.durability() - (100 - 500 * WEAR_PER_M * KIT_WEAR[1])) < 1e-9);
  const again = new Garage(st);
  assert.equal(again.level('tune', 'basic'), UPGRADE_MAX);
  assert.equal(again.level('kit', 'basic'), 1);
  assert.equal(again.level('kit', 'city'), 0);
  const poor = walletOf(0);
  assert.equal(again.upgrade('kit', 'basic', poor), 'poor');
});

test('Hongdae, Itaewon and Gyeongbokgung each have a ride shop of their own', async () => {
  const { readFileSync } = await import('node:fs');
  const { RIDE_SHOPS } = await import('../src/core/bike-garage.js');
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  const shops = stores.filter((s) => s.workshop === 'bike');
  const by = Object.fromEntries(shops.map((s) => [s.rideShop || 'pedal', s]));
  assert.deepEqual(Object.keys(by).sort(), Object.keys(RIDE_SHOPS).sort());
  assert.equal(by.lab.name.ko, '자전거연구소');
  assert.equal(by.rwm.name.en, 'RIDE WITH ME');
  assert.equal(by.hangul.name.ko, '한글미학');
  // Roughly where each district is (region.json offsets).
  assert.ok(by.lab.at[0] < -2750, 'Hongdae');
  assert.ok(by.rwm.at[0] > -1650 && by.rwm.at[0] < -1000 && by.rwm.at[1] > 0, 'Itaewon');
  assert.ok(by.hangul.at[1] < -560 && by.hangul.at[0] < -1480 && by.hangul.at[0] > -2000, 'Gyeongbokgung');
});
