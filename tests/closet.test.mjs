import test from 'node:test';
import assert from 'node:assert/strict';
import { closetKind, sortCloset } from '../src/core/closet.js';
import { ITEMS } from '../src/core/inventory.js';

test('wardrobe kinds: tops, bottoms, shoes, hats, accessories and bags', () => {
  assert.equal(closetKind(ITEMS['outfit-rogue']), 'top');
  assert.equal(closetKind(ITEMS['tee-simurugi']), 'top');
  assert.equal(closetKind(ITEMS['pants-indigo']), 'bottom');
  assert.equal(closetKind(ITEMS[Object.keys(ITEMS).find((id) => id.startsWith('skirt-'))]), 'bottom');
  assert.equal(closetKind(ITEMS['shoes-white']), 'shoes');
  assert.equal(closetKind(ITEMS['acc-cap-red']), 'hat');
  assert.equal(closetKind(ITEMS['acc-scarf']), 'acc');
  assert.equal(closetKind(ITEMS['acc-glasses']), 'acc');
  assert.equal(closetKind(ITEMS['acc-tote-river']), 'bag');
  assert.equal(closetKind({ kind: 'dress', wear: { model: 'x' } }), 'dress');
});

test('every piece of clothing has a wardrobe kind', () => {
  const clothes = Object.entries(ITEMS).filter(([, it]) => it.wear || it.tee);
  assert.ok(clothes.length > 50);
  for (const [id, it] of clothes) assert.ok(closetKind(it), id);
});

test('wardrobe sort: newest, name, price', () => {
  const names = { a: 'Cap', b: 'Apron', c: 'Boots' }, prices = { a: 10, b: 30, c: 20 };
  const opt = { nameOf: (id) => names[id], priceOf: (id) => prices[id] };
  assert.deepEqual(sortCloset(['a', 'b', 'c'], 'new', opt), ['c', 'b', 'a']);
  assert.deepEqual(sortCloset(['a', 'b', 'c'], 'name', opt), ['b', 'c', 'a']);
  assert.deepEqual(sortCloset(['a', 'b', 'c'], 'price', opt), ['b', 'c', 'a']);
});
