import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('the fridge only moves things: what goes in leaves the bag or hand, what comes out goes back, nothing is made', async () => {
  const { Bag } = await import('../src/core/bag.js');
  const { FridgeStore, FRIDGE_MAX } = await import('../src/core/fridge.js');
  const storage = mem();
  const bag = new Bag(storage);
  bag.add({ kind: 'coffee', sips: 3, name: 'Latte' });
  bag.add({ kind: 'umbrella' });
  bag.add({ kind: 'food', sips: 2, name: 'Tteokbokki' });
  const fridge = new FridgeStore(storage);
  assert.equal(fridge.putFromBag(bag, 1), 'kind', 'an umbrella stays in the bag');
  assert.equal(fridge.putFromBag(bag, 0), null);
  assert.deepEqual(bag.list().map((e) => e.kind), ['umbrella', 'food']);
  assert.deepEqual(fridge.list(), [{ kind: 'coffee', sips: 3, name: 'Latte' }], 'sips kept as they were');
  // From the hand.
  let held = { kind: 'glass', sips: 5, name: 'Ade' };
  const hand = { get held() { return held; }, setHeld: (h) => { held = h; } };
  assert.equal(fridge.putFromHand(hand), null);
  assert.equal(held, null);
  // Saved, and read back the same.
  const again = new FridgeStore(storage);
  assert.equal(again.list().length, 2);
  // Out again: into the bag, gone from the fridge.
  assert.equal(again.take(bag, 0), null);
  assert.equal(again.list().length, 1);
  assert.equal(bag.list().filter((e) => e.kind === 'coffee').length, 1);
  assert.equal(again.take(bag, 5), 'none');
  // Full is full.
  const f2 = new FridgeStore(mem());
  for (let i = 0; i < FRIDGE_MAX + 3; i++) { let h = { kind: 'coffee', sips: 1, name: 'x' }; f2.putFromHand({ get held() { return h; }, setHeld: (v) => { h = v; } }); }
  assert.equal(f2.list().length, FRIDGE_MAX);
});

test('a full bag keeps the thing in the fridge', async () => {
  const { Bag, BASE_CAP } = await import('../src/core/bag.js');
  const { FridgeStore } = await import('../src/core/fridge.js');
  const storage = mem();
  storage.setItem('mk.fridge', JSON.stringify([{ kind: 'coffee', sips: 2, name: 'Mocha' }, { kind: 'book', book: 'x' }]));
  const fridge = new FridgeStore(storage);
  assert.equal(fridge.list().length, 1, 'only fridge things load');
  const bag = new Bag(mem());
  for (let i = 0; i < BASE_CAP; i++) bag.add({ kind: 'coffee', sips: 1, name: 'c' + i });
  assert.equal(fridge.take(bag, 0), 'bagFull');
  assert.equal(fridge.list().length, 1);
});

test('fridge, washer and microwave: shop furniture with doors on hinges, sold at Sewoon Electronics', async () => {
  const { buildFurniture, furnitureById, isSmall } = await import('../src/core/furniture.js');
  const { ITEMS } = await import('../src/core/inventory.js');
  const { fridgeSlots, FRIDGE_MAX } = await import('../src/core/appliances.js');
  const want = { 'f-fridge': ['fridge', 2], 'f-washer': ['washer', 1], 'f-microwave': ['microwave', 1] };
  for (const [id, [kind, doors]] of Object.entries(want)) {
    assert.equal(furnitureById(id)?.appliance, kind, id);
    assert.ok(ITEMS[id]?.furniture, `${id} is an item`);
    const g = buildFurniture(id), hinges = [];
    g.traverse((o) => o.userData.door && hinges.push(o));
    assert.equal(hinges.length, doors, `${id} doors`);
  }
  let drum = 0;
  buildFurniture('f-washer').traverse((o) => { if (o.userData.drum) drum++; });
  assert.equal(drum, 1);
  assert.ok(isSmall('f-microwave'), 'a microwave goes on a table');
  // Every slot inside the fridge's footprint.
  const [w, d] = furnitureById('f-fridge').size;
  assert.equal(fridgeSlots().length, FRIDGE_MAX);
  for (const [x, , z] of fridgeSlots()) assert.ok(Math.abs(x) < w / 2 - 0.05 && Math.abs(z) < d / 2, `${x},${z}`);
  const shop = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores.find((s) => s.id === 'sewoon-electronics');
  assert.deepEqual(shop.products.map((p) => p.furniture), Object.keys(want));
  for (const p of shop.products) assert.ok(p.price > 0);
});
