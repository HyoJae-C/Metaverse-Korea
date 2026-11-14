import test from 'node:test';
import assert from 'node:assert/strict';
import { CRAFT, craftWear } from '../src/ui/bukchon-ui.js';
import { WEARABLES, RETIRED } from '../src/data/wearables.js';
import { ACCESSORIES, sanitizeLook, KNOT_COLORS, KNOTS } from '../src/data/appearance.js';
import { Bag } from '../src/core/bag.js';
import { Inventory } from '../src/core/inventory.js';
import { Receipts } from '../src/core/resale.js';
import { noteText } from '../src/core/wallet.js';
import { charmBracelet, braceletsFromCharms, OLD_CHARM_NOTE } from '../src/game/knot-bracelets.js';

const mem = () => { const s = {}; return { getItem: (k) => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: (k) => { delete s[k]; } }; };

test('every knot bracelet the studio makes is worn in the glove slot, at the studio price', () => {
  const k = CRAFT.knot;
  for (let ci = 0; ci < k.colors.length; ci++) for (let si = 0; si < k.shapes.length; si++) {
    const id = craftWear('knot', ci, si);
    const it = WEARABLES[id];
    assert.ok(it, id);
    assert.equal(it.price, k.price, id);
    assert.deepEqual(it.off, { hand: null });
    const a = ACCESSORIES.hand.find((x) => x.id === it.wear.hand);
    assert.equal(a?.shape, 'bracelet', id);
    assert.equal(sanitizeLook({ hand: it.wear.hand }).hand, it.wear.hand, 'kept on a look (and seen by others)');
    assert.ok(it.name.ko.endsWith('팔찌'), it.name.ko);
  }
});

test('the old knot charms in the bag become bracelets, with a receipt for the studio payment', () => {
  const storage = mem();
  const bag = new Bag(storage);
  bag.add({ kind: 'gift', sips: 1, name: 'red butterfly knot charm', icon: '🎀' });
  bag.add({ kind: 'gift', sips: 1, name: 'blue double coin knot charm', icon: '🎀' });
  bag.add({ kind: 'gift', sips: 1, name: 'red butterfly knot charm', icon: '🎀' }); // a second one stays
  bag.add({ kind: 'gift', sips: 1, name: 'white hanji lantern (plum)', icon: '🏮' });
  const inventory = new Inventory();
  const receipts = new Receipts(storage);
  const note = { name: { en: 'Tie a maedeup knot charm', ko: '매듭 노리개 만들기' }, at: { en: 'Maeum Knot Studio', ko: '마음매듭' } };
  const log = [{ n: -8000, note }, { n: -10000, note: { name: { en: 'Make a hanji lantern' } } }];
  const added = braceletsFromCharms({ bag, inventory, receipts, log, price: CRAFT.knot.price });
  assert.deepEqual(added.sort(), ['acc-knot-blue-double-coin', 'acc-knot-red-butterfly']);
  assert.ok(inventory.has('acc-knot-red-butterfly') && inventory.has('acc-knot-blue-double-coin'));
  assert.deepEqual(bag.list().map((e) => e.name), ['red butterfly knot charm', 'white hanji lantern (plum)']);
  for (const id of added) {
    assert.equal(receipts.paid(id), 8000);
    assert.equal(receipts.get(id).bn, noteText(OLD_CHARM_NOTE), 'the note the server finds the payment by');
  }
  assert.deepEqual(braceletsFromCharms({ bag, inventory, receipts, log, price: 8000 }), [], 'once');
});

test('only the studio\'s charms are bracelets', () => {
  assert.equal(charmBracelet({ kind: 'gift', name: 'purple chrysanthemum knot charm' }), 'acc-knot-purple-chrysanthemum');
  assert.equal(charmBracelet({ kind: 'gift', name: 'pink hanji lantern (cloud)' }), null);
  assert.equal(charmBracelet({ kind: 'coffee', name: 'red butterfly knot charm' }), null);
  for (const c of Object.keys(KNOT_COLORS)) for (const s of Object.keys(KNOTS)) assert.ok(WEARABLES[charmBracelet({ kind: 'gift', name: `${c} ${s.replace('-', ' ')} knot charm` })], 'every old charm colour');
});

test('the studio makes two colours per knot; the other old colours are retired, still wearable', () => {
  assert.deepEqual(CRAFT.knot.colors.map(([, c]) => c), ['red', 'blue']);
  assert.equal(CRAFT.knot.colors.length * CRAFT.knot.shapes.length, 6);
  for (const c of Object.keys(KNOT_COLORS)) for (const k of Object.keys(KNOTS)) {
    const id = `acc-knot-${c}-${k}`;
    assert.equal(RETIRED.has(id), !['red', 'blue'].includes(c), id);
  }
});
