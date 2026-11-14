import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { outfitSlots, randomLook, outfitCode, runOutfitCode } = await import('../src/game/random-outfit.js');
const { ITEMS, isWorn } = await import('../src/core/inventory.js');

test('every outfit slot gets one item, skirt and trousers share a slot', () => {
  const slots = outfitSlots();
  for (const s of ['model', 'bottom', 'shoes', 'head', 'face', 'ear', 'neck', 'back', 'hand']) assert.ok(slots[s]?.length, s);
  assert.equal(slots.pants, undefined);
  assert.equal(slots.skirt, undefined);
});

test('a random look wears one item of each slot and keeps hair and the rest', () => {
  for (const r of [0, 0.5, 0.999]) {
    const base = { model: 'basic', hair: 'bob', pants: 'pants-indigo' };
    const look = randomLook(base, ITEMS, () => r);
    assert.equal(look.hair, 'bob');
    for (const [slot, ids] of Object.entries(outfitSlots())) assert.ok(ids.some((id) => isWorn(ITEMS[id], look)), slot);
  }
});

test('codes: random, back, and nothing else', async () => {
  assert.equal(await outfitCode('랜덤복장789'), 'random');
  assert.equal(await outfitCode('원래복장789'), 'back');
  assert.equal(await outfitCode('랜덤복장'), null);
});

test('back puts the look from before the first random one on', async () => {
  const toasts = [];
  const game = { myLook: { model: 'basic', hair: 'bob' }, setLook: () => {}, shop: { toast: (m) => toasts.push(m) } };
  assert.equal(await runOutfitCode(game, '랜덤복장789'), true);
  await runOutfitCode(game, '랜덤복장789');
  assert.equal(await runOutfitCode(game, '원래복장789'), true);
  assert.deepEqual(game.myLook, { model: 'basic', hair: 'bob' });
  await runOutfitCode(game, '원래복장789');
  assert.equal(toasts.length, 4);
  assert.equal(await runOutfitCode(game, 'nope'), false);
});
