import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStoreDescs } from '../src/game/store-descs.js';
import { splitStoreDescs } from '../vite.config.js';

test('the build moves shop product descriptions out, the first door puts them back', async () => {
  const data = { stores: [
    { id: 'a', products: [{ id: 'p1', desc: { en: 'Soft tee' } }, { id: 'p2' }] },
    { id: 'park', hanpark: true, products: [{ id: 'k', desc: { en: 'Ramyeon' } }] },
  ] };
  const descs = splitStoreDescs(data);
  assert.equal(data.stores[0].products[0].desc, undefined);
  assert.deepEqual(data.stores[1].products[0].desc, { en: 'Ramyeon' }); // looked at from the street
  let fetched = 0;
  const sd = createStoreDescs({ url: 'x', stores: () => data.stores, fetchJson: async () => { fetched++; return descs; } });
  assert.equal(sd.ready(), false);
  await sd.load();
  await sd.load();
  assert.equal(fetched, 1);
  assert.equal(sd.ready(), true);
  assert.deepEqual(data.stores[0].products[0].desc, { en: 'Soft tee' });
});

test('offline: ready anyway (the shop opens), and the next door tries again', async () => {
  const stores = [{ id: 'a', products: [{ id: 'p1' }] }];
  let n = 0, clock = 0;
  const sd = createStoreDescs({ url: 'x', stores: () => stores, now: () => clock, fetchJson: async () => { if (n++ === 0) throw new Error('offline'); return { a: { p1: { en: 'Hi' } } }; } });
  await sd.load();
  assert.equal(sd.ready(), true);
  assert.equal(stores[0].products[0].desc, undefined);
  await sd.load(); // (too soon: no new try)
  assert.equal(n, 1);
  clock = 31000;
  await sd.load();
  assert.deepEqual(stores[0].products[0].desc, { en: 'Hi' });
});
