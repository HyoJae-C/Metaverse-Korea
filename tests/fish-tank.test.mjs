import test from 'node:test';
import assert from 'node:assert/strict';
import { FISH, FishBag, FishDex, BAG_MAX } from '../src/core/fishing.js';
import { TANKS, TankStore, REAL_LENGTH, sizeClass, spacesOf, shownLength, blockedBy, cleanList, tankById, used, waterOf } from '../src/core/fish-tank.js';
import { furnitureById } from '../src/core/furniture.js';
import { ITEMS } from '../src/core/inventory.js';
import { layoutMsg, parseVisitMsg } from '../src/game/home-visits.js';

const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d };
};

test('every catalogue fish has a real length, a size class and a drawn length in order', () => {
  for (const f of FISH) {
    assert.ok(REAL_LENGTH[f.id] > 0, f.id);
    assert.ok(['S', 'M', 'L', 'XL'].includes(sizeClass(f.id)), f.id);
  }
  assert.equal(sizeClass('ricefish'), 'S');
  assert.equal(sizeClass('carp'), 'M');
  assert.equal(sizeClass('shark'), 'XL'); // (the catalogue's is a great white)
  assert.equal(sizeClass('salmon'), 'L');
  assert.equal(sizeClass('whale'), 'XL');
  assert.deepEqual(['ricefish', 'clownfish', 'carp', 'salmon', 'orca', 'whale'].map(spacesOf), [1, 1, 2, 4, 8, 8]);
  // the square root of the real length: four times longer, twice as long
  assert.ok(Math.abs(shownLength('crab') / shownLength('ricefish') - Math.sqrt(0.15 / 0.035)) < 1e-9);
  const order = ['ricefish', 'clownfish', 'crucian', 'carp', 'shark', 'orca', 'whale'].map(shownLength);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], 'longer in life, longer in the tank');
  assert.ok(shownLength('whale') <= 1.6);
});

test('the biggest fish a tank takes fits inside its water', () => {
  for (const t of TANKS) {
    const W = waterOf(t);
    const biggest = Math.max(...FISH.filter((f) => !blockedBy(t, [], f.id)).map((f) => shownLength(f.id)));
    assert.ok(biggest < W.hx * 2, `${t.id}: ${biggest} m in ${W.hx * 2} m`);
  }
});

test('the four tanks: bought as furniture, the big ones need a bigger home', () => {
  assert.deepEqual(TANKS.map((t) => t.id), ['tank-s', 'tank-m', 'tank-l', 'tank-wall']);
  assert.deepEqual(TANKS.map((t) => t.needsHomeLevel), [1, 1, 3, 4]);
  for (const t of TANKS) {
    assert.ok(furnitureById(t.id)?.item === t.id, t.id);
    assert.equal(furnitureById(t.id).needsHomeLevel, t.needsHomeLevel);
    assert.ok(ITEMS[t.id]?.furniture, t.id);
  }
});

test('size and space: small fish go many to a tank, big ones only in big tanks', () => {
  const s = tankById('tank-s'), wall = tankById('tank-wall');
  assert.equal(blockedBy(s, [], 'carp'), 'size');
  assert.equal(blockedBy(s, ['ricefish', 'ricefish', 'ricefish'], 'ricefish'), null);
  assert.equal(blockedBy(s, ['ricefish', 'ricefish', 'ricefish', 'ricefish'], 'ricefish'), 'full');
  assert.equal(blockedBy(wall, [], 'whale'), null);
  assert.equal(used(['whale', 'carp', 'ricefish']), 11);
  assert.deepEqual(cleanList('tank-s', ['carp', 'ricefish', 'nope', 7, 'clownfish']), ['ricefish', 'clownfish']);
  assert.deepEqual(cleanList('tank-nope', ['ricefish']), []);
});

test('fish move between the bag and a tank and stay in the fish book', () => {
  const st = mem();
  const bag = new FishBag(st), dex = new FishDex(st, bag);
  bag.add('ricefish'); bag.add('ricefish'); bag.add('carp');
  dex.record?.('ricefish');
  const tanks = new TankStore(st);
  assert.equal(tanks.put(bag, 'tank-s', 'carp'), 'size');
  assert.equal(tanks.put(bag, 'tank-s', 'ricefish'), null);
  assert.equal(bag.count('ricefish'), 1);
  assert.deepEqual(new TankStore(st).list('tank-s'), ['ricefish'], 'saved');
  assert.equal(tanks.put(bag, 'tank-s', 'shark'), 'none', 'only fish you have');
  assert.equal(tanks.take(bag, 'tank-s', 'ricefish'), null);
  assert.equal(bag.count('ricefish'), 2);
  assert.deepEqual(tanks.list('tank-s'), []);
  // a full bag: the fish stays in the tank
  tanks.put(bag, 'tank-s', 'ricefish');
  while (!bag.full) bag.add('anchovy');
  assert.equal(bag.size, BAG_MAX);
  assert.equal(tanks.take(bag, 'tank-s', 'ricefish'), 'bagFull');
  assert.deepEqual(tanks.list('tank-s'), ['ricefish']);
});

test('visitors get the fish with the layout', () => {
  const m = parseVisitMsg(layoutMsg([['tank-m', 1, 2, 0, 0, 0, ['carp', 'ricefish']], ['bed', 0, 0, 0]])).lay;
  assert.deepEqual(m, [['tank-m', 1, 2, 0, 0, 0, ['carp', 'ricefish']], ['bed', 0, 0, 0]]);
});

test('every catalogue fish has a drawing that builds', async () => {
  const { species } = await import('../src/core/sea-life.js');
  const { drawingOf } = await import('../src/core/tank-species.js');
  for (const f of FISH) {
    const sp = species(drawingOf(f.id));
    const p = sp.geo.attributes.position.array;
    assert.ok(p.length > 0 && p.every(Number.isFinite), f.id);
    assert.ok(sp.geo.attributes.color && sp.geo.attributes.uv, f.id);
  }
});
