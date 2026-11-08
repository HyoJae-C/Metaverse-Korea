// Bag goods taken out into the hand still count (holding takes them out of
// the bag), and are held as themselves, not as a shopping bag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftKind, heldBase, HELD_KINDS, GIFT_LOOKS } from '../src/core/held.js';
import { hasMat } from '../src/game/picnic.js';

const bag = (items) => ({ items, list() { return this.items; }, take(i) { return this.items.splice(i, 1)[0]; } });
const gift = (g) => ({ kind: 'gift', sips: 1, name: g, icon: '🛍️', g });

test('goods are held as themselves, and older clients still see a shopping bag', () => {
  for (const g of ['frisbee', 'mat', 'ramyeon', 'egg', 'kimchi', 'japchae', 'kimbap']) {
    assert.equal(giftKind(gift(g)), 'gift:' + g);
    assert.ok(HELD_KINDS.includes(heldBase(giftKind(gift(g)))), 'passes the held-kind check other players run');
  }
  assert.equal(giftKind({ kind: 'gift', name: 'Tote', icon: '👜' }), 'gift', 'a shop bag is still a shop bag');
  assert.equal(giftKind(gift('rock')), 'gift');
  assert.ok(GIFT_LOOKS.length >= 7);
});

test('a picnic mat in the hand can still be spread', () => {
  assert.ok(hasMat(bag([gift('mat')])));
  assert.ok(hasMat(bag([]), gift('mat')));
  assert.ok(!hasMat(bag([gift('frisbee')]), gift('egg')));
});

test('the ramen machine takes the pack and the egg from your hand too', async () => {
  const { RamenUI } = await import('../src/ui/ramen-ui.js');
  let held = gift('ramyeon');
  const b = bag([gift('egg')]);
  const ui = new RamenUI({ root: null, bag: b, hand: { get held() { return held; }, take: () => { held = null; } } });
  assert.equal(ui._items().length, 2);
  assert.ok(ui._use('ramyeon') && held === null, 'the pack in the hand goes in the pot');
  assert.ok(ui._use('egg') && b.items.length === 0, 'the egg from the bag');
  assert.ok(!ui._use('egg'), 'none left');
});
