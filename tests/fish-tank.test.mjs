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
  // in proportion to the real length (Yozi 2026-11-18: 0.4 of it)
  assert.ok(Math.abs(shownLength('orca') - 2.8) < 1e-9);
  assert.ok(Math.abs(shownLength('crab') / shownLength('ricefish') - 0.15 / 0.035) < 1e-9);
  const order = ['ricefish', 'clownfish', 'crucian', 'carp', 'shark', 'orca', 'whale'].map(shownLength);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], 'longer in life, longer in the tank');
});

test('the biggest fish a tank takes fits inside its water', () => {
  for (const t of TANKS) {
    const W = waterOf(t);
    const biggest = Math.max(...FISH.filter((f) => !blockedBy(t, [], f.id)).map((f) => shownLength(f.id)));
    assert.ok(biggest < W.hx * 2, `${t.id}: ${biggest} m in ${W.hx * 2} m`);
  }
});

test('the five tanks: bought as furniture, any home takes any tank that fits the room', () => {
  assert.deepEqual(TANKS.map((t) => t.id), ['tank-mini', 'tank-s', 'tank-m', 'tank-l', 'tank-wall']);
  assert.deepEqual(TANKS.map((t) => t.needsHomeLevel), [1, 1, 1, 1, 1]); // (Yozi 2026-11-18: no home level lock)
  for (const t of TANKS) {
    assert.ok(furnitureById(t.id)?.item === t.id, t.id);
    assert.equal(furnitureById(t.id).needsHomeLevel, t.needsHomeLevel);
    assert.ok(ITEMS[t.id]?.furniture, t.id);
  }
});

test('size and space: small fish go many to a tank, big ones only in big tanks', () => {
  const s = tankById('tank-s'), wall = tankById('tank-wall');
  assert.equal(blockedBy(s, [], 'carp'), 'size');
  assert.deepEqual(TANKS.map((t) => t.fish), [3, 10, 25, 40, 60]);
  assert.equal(blockedBy(s, Array(9).fill('ricefish'), 'ricefish'), null);
  assert.equal(blockedBy(s, Array(10).fill('ricefish'), 'ricefish'), 'full', 'ten fish at most');
  assert.equal(blockedBy(wall, ['orca'], 'orca'), 'one', 'one of each big kind');
  assert.equal(blockedBy(wall, ['orca', 'beluga', 'manta', 'shark', 'dolphin'], 'tuna'), null);
  assert.equal(blockedBy(wall, Array(15).fill('carp').concat(['orca', 'beluga', 'manta', 'shark', 'dolphin', 'tuna', 'marlin', 'sunfish', 'dugong', 'electric-eel', 'sea-turtle']), 'carp'), null);
  assert.equal(blockedBy(wall, [], 'orca'), null);
  assert.equal(blockedBy(wall, [], 'whale'), 'size', 'the blue whale stays in the aquarium');
  assert.equal(blockedBy(wall, [], 'giant-squid'), 'size');
  assert.equal(used(['orca', 'carp', 'ricefish']), 11);
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

test('home tanks use the light drawings: a full wall aquarium stays inside the triangle budget', async () => {
  const { species } = await import('../src/core/sea-life.js');
  const { drawingOf } = await import('../src/core/tank-species.js');
  let full = 0, lite = 0;
  for (const f of FISH) {
    full += species(drawingOf(f.id)).geo.attributes.position.count / 3;
    lite += species(drawingOf(f.id), true).geo.attributes.position.count / 3;
  }
  assert.ok(lite < full / 4, `${lite} vs ${full}`);
  assert.ok((lite / FISH.length) * 150 < 150000, 'even 150 fish on average under 150k triangles');
});

test('an octopus in a tank rests, now and then inks and jets up, and stays in the water', async () => {
  const THREE = await import('three');
  const { fillTank } = await import('../src/core/tank-fish.js');
  const tank = tankById('tank-m'), W = waterOf(tank), g = new THREE.Group();
  const f = fillTank(g, tank, ['octopus']);
  const mesh = g.children.find((c) => c.isInstancedMesh), ink = g.children.find((c) => c.isMesh && !c.isInstancedMesh);
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  let low = 0, high = 0, inked = 0;
  for (let t = 0; t < 120; t += 0.1) {
    f.tick(t);
    mesh.getMatrixAt(0, m);
    p.setFromMatrixPosition(m);
    assert.ok(Math.abs(p.x) <= W.hx && Math.abs(p.z) <= W.hz && p.y >= W.y0 - 1e-6 && p.y < W.y1, `in the water at ${t.toFixed(1)}s`);
    if (p.y < W.y0 + 0.01) low++; else if (p.y > W.y0 + (W.y1 - W.y0) * 0.5) high++;
    if (ink.visible) inked++;
  }
  assert.ok(low > 600, 'mostly resting on the sand');
  assert.ok(high > 10 && high < 300, `now and then up in the water (${high})`);
  assert.ok(inked > 0, 'puffs ink sometimes');
  f.dispose();
  assert.equal(g.children.length, 0);
});
