import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTowel, toggleTowel, TOWEL_OUT_MS } from '../src/core/sauna-towel.js';

test('the sheep towel goes back a game day after you walk out in it', () => {
  let { look, rec } = toggleTowel({ model: 'basic', head: 'cap-red' }, null);
  assert.equal(look.head, 'towel');
  let r = checkTowel(look, rec, true, 1000);
  assert.equal(r.rec.out, null, 'no clock while in the jjimjilbang');
  r = checkTowel(look, r.rec, false, 5000);
  assert.equal(r.rec.out, 5000, 'the clock starts as you walk out');
  r = checkTowel(look, r.rec, false, 5000 + TOWEL_OUT_MS - 1);
  assert.equal(r.taken, false);
  r = checkTowel(look, r.rec, false, 5000 + TOWEL_OUT_MS);
  assert.equal(r.taken, true);
  assert.equal(r.look.head, 'cap-red', 'your own hat comes back');
  assert.equal(r.rec, null);
});

test('going back in stops the clock; taking it off brings the hat back', () => {
  let { look, rec } = toggleTowel({ model: 'basic' }, null);
  let r = checkTowel(look, rec, false, 0);
  r = checkTowel(look, r.rec, true, TOWEL_OUT_MS - 10);
  assert.equal(r.rec.out, null);
  r = checkTowel(look, r.rec, false, TOWEL_OUT_MS * 2);
  assert.equal(r.taken, false, 'a fresh day from the second walk out');
  const off = toggleTowel(look, r.rec);
  assert.equal(off.look.head, undefined);
  assert.equal(off.rec, null);
});

test('a towel worn before this rule starts its clock when first seen outside', () => {
  const r = checkTowel({ head: 'towel' }, null, false, 42);
  assert.deepEqual(r.rec, { prev: null, out: 42 });
  assert.equal(checkTowel({ head: 'cap' }, r.rec, false, 99).rec, null, 'not wearing it: nothing to track');
});
