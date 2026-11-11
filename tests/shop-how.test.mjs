import { test } from 'node:test';
import assert from 'node:assert/strict';
import { howToGet, coinsFor, comingSoon } from '../src/ui/shop-ui.js';
import { heldFor } from '../src/ui/counter-ui.js';
import { cleanEntry } from '../src/core/bag.js';

test('no won prices: restaurants order at the table, cafés at the counter, fashion is coming soon, the rest sells for won', () => {
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
  assert.equal(coinsFor(26000), 26000);
  assert.equal(coinsFor(6500), 6500);
  assert.equal(coinsFor(0), 100);
});

test('café orders become a cup or a snack box; bar drinks a glass; bought goods fit in the bag', () => {
  assert.equal(heldFor({ model: 'cup' }, { category: 'cafe' }), 'coffee');
  assert.equal(heldFor({ model: 'bread' }, { category: 'cafe' }), 'food');
  assert.equal(heldFor({ model: 'cocktail' }, { category: 'bar' }), 'glass');
  assert.deepEqual(cleanEntry({ kind: 'gift', name: 'Soy candle', icon: '🕯️' }), { kind: 'gift', sips: 1, name: 'Soy candle', icon: '🕯️' });
});

test('things you could only carry around are not sold: those shops are coming soon', async () => {
  const { readFile } = await import('node:fs/promises');
  const { usable, itemSoon } = await import('../src/ui/shop-ui.js');
  const stores = JSON.parse(await readFile(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8')).stores;
  const byId = (id) => stores.find((s) => s.id === id);
  // A candle shop, a stationery shop, a record shop: nothing to do with what they sell.
  for (const id of ['scent-factory', 'stationery-den', 'indie-record', 'page-atlas', 'glow-lab']) {
    assert.ok(comingSoon(byId(id)), id);
    assert.equal(howToGet(byId(id)), 'soon');
  }
  // Food, drinks, clothes, perfume, pets, ingredients: still sold.
  assert.ok(usable({ model: 'bowl' }) && usable({ model: 'cup' }) && usable({ model: 'tee', item: 'x' }) && usable({ model: 'bottle', perfume: 'sweet' }));
  assert.ok(!usable({ model: 'candle' }) && !usable({ model: 'cup', goods: true }));
  // A market keeps its food but stops selling a plush or a jar of spices.
  const park = byId('ttukseom-hangang');
  assert.ok(!comingSoon(park));
  assert.ok(itemSoon(park, park.products.find((p) => p.id === 'mk-duck-plush')));
  assert.ok(!itemSoon(park, park.products.find((p) => p.id === 'picnic-mat')));
  // Workshops stay open for their activity even if their souvenirs aren't sold.
  assert.ok(!comingSoon(byId('sonmat-kimchi')));
  // So do Bukchon's craft studios (a knot charm, a hanji lantern with the teacher).
  for (const id of ['maeum-knot', 'saekji-paper', 'gahoe-silver']) assert.ok(!comingSoon(byId(id)), id);
  // A café's bag of beans isn't a drink.
  const roast = byId('warehouse-roasters');
  assert.ok(itemSoon(roast, roast.products.find((p) => p.id === 'beans')));
  assert.ok(!itemSoon(roast, roast.products.find((p) => p.id === 'flat-white')));
  // Every open shop that sells to take home still has something to use.
  for (const s of stores) {
    if (howToGet(s) !== 'buy' || s.workshop || s.craft || !s.products?.length) continue;
    assert.ok(s.products.some(usable), s.id + ' sells nothing usable but is open');
  }
});

test('coming-soon shops are hidden from the street while HIDE_COMING_SOON is on', async () => {
  const { readFile } = await import('node:fs/promises');
  const { HIDE_COMING_SOON, shownStores } = await import('../src/ui/shop-ui.js');
  const stores = JSON.parse(await readFile(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8')).stores;
  const shown = shownStores(stores);
  if (!HIDE_COMING_SOON) return assert.equal(shown.length, stores.length);
  assert.ok(shown.every((s) => !comingSoon(s)));
  assert.equal(shown.length + stores.filter(comingSoon).length, stores.length);
  for (const id of ['popup-station', 'k-goods', 'scent-factory']) assert.ok(!shown.some((s) => s.id === id), id);
  for (const id of ['maeum-knot', 'sonmat-kimchi']) assert.ok(shown.some((s) => s.id === id), id);
});
