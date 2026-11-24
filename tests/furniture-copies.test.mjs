import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GiftReceipts } from '../src/core/gift-receipts.js';
import { Receipts } from '../src/core/resale.js';

// Same furniture more than once (Yozi 2026-11-24: "×2"): counts in mk.itemN,
// a receipt for each copy, not for tanks, appliances or clothes.
const mem = () => { const m = new Map(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
globalThis.localStorage = mem();
const { Inventory, ITEMS, canHaveMany } = await import('../src/core/inventory.js');
const { TANK_IDS } = await import('../src/core/furniture.js');
const plant = Object.keys(ITEMS).find((id) => id.startsWith('plant-'));
const lamp = Object.keys(ITEMS).find((id) => ITEMS[id].lamp);
const shirt = Object.keys(ITEMS).find((id) => ITEMS[id].wear);
const tank = TANK_IDS[0][0];

test('home pieces can be had more than once; tanks, appliances, wallpaper and clothes cannot', () => {
  assert.ok(canHaveMany(plant) && canHaveMany(lamp));
  assert.ok(!canHaveMany(tank) && !canHaveMany('f-fridge') && !canHaveMany('f-washer') && !canHaveMany(shirt));
  assert.ok(!canHaveMany(Object.keys(ITEMS).find((id) => ITEMS[id].finish)));
});

test('a second copy is counted and saved, and taken out one at a time', () => {
  globalThis.localStorage = mem();
  const inv = new Inventory();
  assert.equal(inv.count(plant), 0);
  assert.ok(inv.addCopy(plant));
  assert.ok(inv.addCopy(plant));
  assert.equal(inv.count(plant), 2);
  assert.deepEqual(JSON.parse(localStorage.getItem('mk.items')), [plant]); // (old games still see one)
  assert.deepEqual(JSON.parse(localStorage.getItem('mk.itemN')), { [plant]: 1 });
  assert.equal(new Inventory().count(plant), 2); // (loaded back)
  inv.add(shirt);
  assert.ok(!inv.canAdd(shirt) && !inv.addCopy(shirt));
  assert.equal(inv.count(shirt), 1);
  inv.addCopy(tank);
  assert.ok(!inv.canAdd(tank) && !inv.addCopy(tank));
  inv.remove(plant);
  assert.equal(inv.count(plant), 1);
  assert.equal(localStorage.getItem('mk.itemN'), null);
  inv.remove(plant);
  assert.ok(!inv.has(plant));
});

test('copies stop at 20, and a broken or made-up count is ignored', () => {
  globalThis.localStorage = mem();
  localStorage.setItem('mk.items', JSON.stringify([plant]));
  localStorage.setItem('mk.itemN', JSON.stringify({ [plant]: 999, [shirt]: 3, nope: 2 }));
  const inv = new Inventory();
  assert.equal(inv.count(plant), 20);
  assert.equal(inv.count(shirt), 0);
  assert.ok(!inv.canAdd(plant));
  localStorage.setItem('mk.itemN', '{broken');
  assert.equal(new Inventory().count(plant), 1);
});

test('each copy keeps its own receipt, kept across loads, one per purchase', () => {
  const s = mem();
  const r = new Receipts(s);
  r.recordCopy(plant, 9000, 'op-1');
  r.recordCopy(plant, 9000, 'op-2');
  r.recordCopy(plant, 9000, 'op-2'); // (the same purchase twice: once)
  assert.equal(r.copies(plant), 2);
  assert.deepEqual(new Receipts(s).ops(plant), ['op-1', 'op-2']);
  assert.equal(new Receipts(s).paid(plant), 9000);
});

test('a gift of a piece I have already gets a second receipt from the server', async () => {
  globalThis.localStorage = mem();
  const inv = new Inventory();
  inv.addCopy(plant); inv.addCopy(plant);
  const receipts = new Receipts(mem());
  receipts.record(plant, 9000, 'mine');
  const rows = [{ op: 'mine', item: plant, price: 9000 }, { op: 'gift', item: plant, price: 9000 }];
  const g = new GiftReceipts({ wallet: { server: true, flush: async () => true, client: { rpc: async () => ({ data: rows }) } }, storage: mem() });
  assert.equal(await g.sync(inv, receipts, ITEMS), 1);
  assert.deepEqual(receipts.ops(plant), ['mine', 'gift']);
  assert.equal(await g.sync(inv, receipts, ITEMS), 0); // (no more than I have)
});
