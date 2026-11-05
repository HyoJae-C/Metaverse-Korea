import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HANBOK, RENT_HOURS } from '../src/data/hanbok.js';
import { CHIMAS, SKIRTS, skirtById } from '../src/data/skirts.js';
import { sanitizeLook, MODELS } from '../src/data/appearance.js';
import { loadRental, saveRental, startRental, endRental, checkRental, timeLeft, isRenting, formatLeft, RENT_MS, RENT_KEY } from '../src/core/hanbok-rental.js';
import { comingSoon, howToGet } from '../src/ui/shop-ui.js';
import { ITEMS } from '../src/core/inventory.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url), 'utf8')).stores;
const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d };
};
const H = 3600 * 1000;

test('the hanbok shop by Gyeongbokgung is open and rents every set', () => {
  const shop = stores.find((s) => s.id === 'dano-hanbok');
  assert.ok(shop && !comingSoon(shop));
  assert.equal(howToGet(shop), 'buy');
  assert.equal(shop.products.length, Object.keys(HANBOK).length);
  for (const p of shop.products) {
    assert.ok(HANBOK[p.rent], p.id);
    assert.equal(p.price, HANBOK[p.rent].coins * 1000, p.id);
    assert.ok(p.name.en && p.name.ko && p.desc.en, p.id);
    if (p.skirt) assert.equal(p.skirt, HANBOK[p.rent].wear.skirt, p.id);
  }
  // Kimchi school and tea house are its neighbours on the same street.
  const kimchi = stores.find((s) => s.id === 'sonmat-kimchi');
  assert.ok(Math.hypot(shop.at[0] - kimchi.at[0], shop.at[1] - kimchi.at[1]) < 400);
});

test('hanbok looks are real models and chimas, kept out of the skirt shops', () => {
  assert.equal(RENT_HOURS, 2);
  for (const [id, set] of Object.entries(HANBOK)) {
    assert.ok(MODELS.includes(set.wear.model), id);
    if (set.wear.skirt) assert.ok(skirtById(set.wear.skirt), id);
    const look = sanitizeLook({ model: set.wear.model, skirt: set.wear.skirt });
    assert.equal(look.model, set.wear.model);
    if (set.wear.skirt) assert.equal(look.skirt, set.wear.skirt);
  }
  for (const id of Object.keys(CHIMAS)) {
    assert.ok(!SKIRTS[id] && !ITEMS['skirt-' + id], `${id} is not for sale`);
  }
});

test('renting puts the hanbok on; time up brings your own clothes back', () => {
  const mine = { model: 'rogue', skirt: 'pleats-mini-navy', tee: 'simurugi', shirt: 'coral' };
  const { look, rental } = startRental(mine, 'yellow-red', 1000);
  assert.equal(look.model, 'hanbok-yellow');
  assert.equal(look.skirt, 'chima-red');
  assert.equal(look.tee, null);
  assert.equal(rental.until, 1000 + 2 * H);
  assert.equal(timeLeft(rental, 1000 + H), H);
  assert.ok(isRenting(rental, 'yellow-red', 1000 + H));
  assert.ok(!isRenting(rental, 'yellow-red', 1000 + 2 * H));
  // Still on halfway through.
  assert.equal(checkRental(look, rental, 1000 + H).look, look);
  // Time up.
  const r = checkRental(look, rental, 1000 + 2 * H);
  assert.equal(r.rental, null);
  assert.ok(r.ended);
  assert.deepEqual(r.look, mine);
});

test('swapping sets keeps your own clothes, and parts you changed stay', () => {
  const mine = { model: 'basic', shirt: 'mint' };
  const a = startRental(mine, 'pink-navy', 0);
  const b = startRental(a.look, 'baji-blue', 10, a.rental);
  assert.equal(b.look.model, 'hanbok-baji');
  assert.equal(b.look.skirt, null);
  assert.deepEqual(b.rental.prev, { model: 'basic', skirt: null, tee: null });
  assert.equal(b.rental.until, 10 + RENT_MS);
  const back = endRental(b.look, b.rental);
  assert.equal(back.model, 'basic');
  assert.ok(!('skirt' in back) && !('tee' in back));
  // Put on a jacket while renting: the jacket stays, only the chima comes off.
  const c = startRental({ model: 'basic', skirt: 'solid-long-cream' }, 'mint-pink', 0);
  const changed = { ...c.look, model: 'jacket-black' };
  const end = endRental(changed, c.rental);
  assert.equal(end.model, 'jacket-black');
  assert.equal(end.skirt, 'solid-long-cream');
  // A trousers set gives the old skirt back too.
  const d = startRental({ model: 'basic', skirt: 'solid-long-cream' }, 'durumagi-lilac', 0);
  assert.equal(endRental(d.look, d.rental).skirt, 'solid-long-cream');
});

test('the rental survives a reload; a hanbok with no rental comes off', () => {
  const store = mem();
  const { look, rental } = startRental({ model: 'hooded' }, 'mint-pink', 5);
  saveRental(rental, store);
  assert.deepEqual(loadRental(store), rental);
  const later = checkRental(look, loadRental(store), 5 + RENT_MS + 1);
  assert.equal(later.look.model, 'hooded');
  saveRental(null, store);
  assert.equal(store.getItem(RENT_KEY), null);
  assert.equal(loadRental(mem({ [RENT_KEY]: '{"id":"nope","until":1,"prev":{}}' })), null);
  assert.equal(loadRental(mem({ [RENT_KEY]: 'not json' })), null);
  // e.g. a look synced from another device without its rental
  const stray = checkRental({ model: 'hanbok-pink', skirt: 'chima-navy' }, null, 0);
  assert.ok(stray.ended);
  assert.equal(stray.look.model, 'basic');
  assert.ok(!stray.look.skirt);
  // Changed out of it yourself: the rental just ends.
  assert.equal(checkRental({ model: 'rogue' }, rental, 6).rental, null);
});

test('time left reads as minutes, then hours:minutes', () => {
  assert.equal(formatLeft(12 * 60000), '12m');
  assert.equal(formatLeft(2 * H), '2:00');
  assert.equal(formatLeft(H + 42 * 60000 - 1), '1:42');
});
