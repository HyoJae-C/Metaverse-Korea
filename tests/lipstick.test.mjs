import test from 'node:test';
import assert from 'node:assert/strict';
import { lipPrice, LIPSTICK_USES, LIPSTICK_PRICE, LIPSTICK_TEXT, applyLipstick, lipstickEntry, shadeName } from '../src/core/lipstick.js';
import { LIPS, menuFor } from '../src/core/beauty.js';
import { Bag } from '../src/core/bag.js';
import { HELD_KINDS } from '../src/core/held.js';

const mem = () => { const d = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } }; };

test('a lipstick: five uses at road-shop prices, each lip shop its own', () => {
  assert.equal(LIPSTICK_USES, 5);
  assert.equal(LIPSTICK_PRICE, 15000);
  assert.equal(lipPrice({ lipPrice: 19000 }), 19000);
  assert.equal(lipPrice({}), 15000);
  assert.equal(menuFor('lips', { lipFamily: 'green', lipPrice: 11000 })[0].price, 11000);
  assert.equal(LIPS[0].price, LIPSTICK_PRICE);
  assert.ok(LIPS[0].stick);
  assert.ok(HELD_KINDS.includes('lipstick'));
});

test('only real shades with uses left are kept', () => {
  assert.deepEqual(lipstickEntry({ c: 'scarlet', sips: 9 }), { kind: 'lipstick', c: 'scarlet', sips: 5 });
  assert.equal(lipstickEntry({ c: 'scarlet', sips: 0 }), null);
  assert.equal(lipstickEntry({ c: 'constructor', sips: 3 }), null);
  assert.equal(lipstickEntry({ c: '#ff0000', sips: 3 }), null);
  assert.equal(shadeName('hotpink'), 'Hotpink');
});

test('each use puts the colour on and it stays after the last one', () => {
  let held = { kind: 'lipstick', c: 'mint', sips: LIPSTICK_USES };
  let look = { lip: 'cherry', hair: 'black' };
  for (let n = LIPSTICK_USES - 1; n >= 0; n--) {
    const r = applyLipstick(held, look);
    assert.equal(r.left, n);
    assert.equal(r.look.lip, 'mint');
    assert.equal(r.look.hair, 'black');
    ({ held, look } = r);
  }
  assert.equal(held, null); // used up, the lipstick is gone
  assert.equal(look.lip, 'mint'); // the colour is still on
  assert.equal(applyLipstick(null, look), null);
});

test('the wardrobe keeps several lipsticks to switch between', () => {
  const s = mem();
  const b = new Bag(s);
  assert.ok(b.add({ kind: 'lipstick', c: 'scarlet', sips: 5 }));
  assert.ok(b.add({ kind: 'lipstick', c: 'sky', sips: 2 }));
  assert.ok(!b.add({ kind: 'lipstick', c: 'nope', sips: 2 }));
  assert.deepEqual(new Bag(s).vanityList().map((e) => e.c), ['scarlet', 'sky']);
  assert.equal(b.size, 0); // (in the wardrobe, not the bag's slots)
});

test('lipstick text: English and Korean, same placeholders everywhere', () => {
  const vars = (x) => (String(x).match(/\{\w+\}/g) || []).sort().join();
  for (const [k, p] of Object.entries(LIPSTICK_TEXT)) {
    assert.ok(p.en && p.ko, k);
    for (const [lang, x] of Object.entries(p)) assert.equal(vars(x), vars(p.en), `${k} ${lang}`);
  }
});
