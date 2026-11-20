import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS } from '../src/core/inventory.js';
import { accessory, sanitizeLook } from '../src/data/appearance.js';
import { Garage, BODY_SKINS, rideCode, parseRide } from '../src/core/bike-garage.js';

const DAY = 24 * 3600 * 1000;
const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8')).stores;

test('Santa Pop-up sells the four Christmas accessories, each one a wearable', () => {
  const s = stores.find((x) => x.id === 'santa-popup');
  assert.ok(s, 'the shop');
  assert.deepEqual(s.products.map((p) => p.item).sort(), ['acc-antlers', 'acc-rudolph-nose', 'acc-santa-beard', 'acc-santa-hat']);
  for (const p of s.products) {
    const it = ITEMS[p.item];
    assert.equal(p.price, it.price, p.id);
    const [slot, id] = Object.entries(p.tryOn)[0];
    assert.equal(it.wear[slot], id, p.id);
    assert.ok(accessory(slot, id), p.id);
    assert.equal(sanitizeLook({ [slot]: id })[slot], id, p.id);
  }
  // a Santa hat with a beard, antlers with a Rudolph nose: different slots
  assert.notEqual(Object.keys(ITEMS['acc-santa-hat'].wear)[0], Object.keys(ITEMS['acc-santa-beard'].wear)[0]);
  assert.notEqual(Object.keys(ITEMS['acc-antlers'].wear)[0], Object.keys(ITEMS['acc-rudolph-nose'].wear)[0]);
});

const box = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const rich = { spend: () => true }, poor = { spend: () => false };

test('the sleigh: bought for 7 days, bikes only, red unless a colour is picked, then gone', () => {
  const t0 = Date.UTC(2026, 11, 1), st = box();
  const g = new Garage(st);
  assert.equal(g.buyBody('sleigh', poor, t0), 'poor');
  assert.equal(g.buyBody('sleigh', rich, t0), 'bought');
  assert.equal(g.buyBody('sleigh', rich, t0 + 1), 'owned');
  let spec = g.rideSpec(t0 + DAY);
  assert.equal(spec.body, 'sleigh');
  assert.equal(spec.color, BODY_SKINS.sleigh.color);
  // saved and loaded
  assert.equal(new Garage(st).rideSpec(t0 + DAY).body, 'sleigh');
  // not on a skateboard
  g.s.own.push('skate1'); g.use('skate1');
  assert.equal(g.rideSpec(t0 + DAY).body, undefined);
  g.use('basic');
  // seven days later it's gone
  assert.equal(g.rideSpec(t0 + 7 * DAY).body, undefined);
  assert.deepEqual(g.expireBodies(t0 + 7 * DAY - 1), []);
  assert.deepEqual(g.expireBodies(t0 + 7 * DAY), ['sleigh']);
  assert.equal(g.s.skin.body, null);
  assert.equal(g.setBody('sleigh', t0 + 7 * DAY), false);
});

test('others see the sleigh; old ride codes stay the same', () => {
  assert.equal(rideCode({ type: 'bike', tier: 0, color: '#3fb59a', pattern: null }), 'bike.0.#3fb59a.-');
  const code = rideCode({ type: 'bike', tier: 1, color: '#c8102e', pattern: 'star', body: 'sleigh' });
  assert.equal(parseRide(code).body, 'sleigh');
  assert.equal(parseRide('bike.0.#c8102e.-.nope').body, undefined);
  assert.equal(parseRide('skate.0.#c8102e.-.sleigh').body, undefined);
});
