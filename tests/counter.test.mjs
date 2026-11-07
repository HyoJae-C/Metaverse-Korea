import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coinPrice, heldFor } from '../src/ui/counter-ui.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;

test('counter prices are coins: 1 per ₩1,000, rounded up', () => {
  assert.equal(coinPrice(4500), 5);
  assert.equal(coinPrice(2000), 2);
  assert.equal(coinPrice(0), 1);
});

test('META COFFEE hands over coffee (stamina); bars and clubs a glass', () => {
  const meta = stores.find((s) => s.id === 'meta-coffee');
  for (const p of meta.products) assert.equal(heldFor(p, meta), 'coffee', p.id);
  for (const s of stores.filter((x) => x.category === 'bar' || x.category === 'club')) {
    for (const p of s.products) assert.ok(['glass', 'food'].includes(heldFor(p, s)), p.id);
  }
});
