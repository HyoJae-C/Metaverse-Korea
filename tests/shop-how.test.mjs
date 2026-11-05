import { test } from 'node:test';
import assert from 'node:assert/strict';
import { howToGet, coinsFor, comingSoon } from '../src/ui/shop-ui.js';
import { heldFor } from '../src/ui/counter-ui.js';
import { cleanEntry } from '../src/core/bag.js';

test('no won prices: restaurants order at the table, cafés at the counter, fashion is coming soon, the rest sells for coins', () => {
  assert.equal(howToGet({ category: 'restaurant' }), 'table');
  for (const c of ['cafe', 'bar', 'club']) assert.equal(howToGet({ category: c }), 'counter');
  assert.equal(howToGet({ category: 'lifestyle', takeaway: true }), 'counter');
  for (const st of [{ category: 'fashion' }, { category: 'popup' }, { category: 'fashion', products: [{ id: 'tee', model: 'tee' }] }]) {
    assert.equal(howToGet(st), 'soon');
    assert.ok(comingSoon(st));
  }
  // Shops selling things to wear (clothes, shoes, accessories) are open,
  // and so is the hat workshop.
  assert.ok(!comingSoon({ category: 'fashion', products: [{ id: 'g', item: 'acc-glasses' }] }));
  assert.ok(!comingSoon({ category: 'workshop', workshop: 'hat' }));
  for (const c of ['lifestyle', 'beauty', 'market', 'petshop']) assert.equal(howToGet({ category: c }), 'buy');
  assert.equal(coinsFor(26000), 26);
  assert.equal(coinsFor(6500), 7);
  assert.equal(coinsFor(0), 1);
});

test('café orders become a cup or a snack box; bar drinks a glass; bought goods fit in the bag', () => {
  assert.equal(heldFor({ model: 'cup' }, { category: 'cafe' }), 'coffee');
  assert.equal(heldFor({ model: 'bread' }, { category: 'cafe' }), 'food');
  assert.equal(heldFor({ model: 'cocktail' }, { category: 'bar' }), 'glass');
  assert.deepEqual(cleanEntry({ kind: 'gift', name: 'Soy candle', icon: '🕯️' }), { kind: 'gift', sips: 1, name: 'Soy candle', icon: '🕯️' });
});
