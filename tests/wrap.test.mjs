import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WrapDesk, WRAP_WAIT, cleanLetter, LETTER_MAX, letterEntry, parseWrap, wrapEntry, wrapMsg, SHEETS_MAX } from '../src/core/wrap.js';
import { Bag } from '../src/core/bag.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('messages carry only ids, and read back', () => {
  assert.deepEqual(parseWrap(wrapMsg('offer', 'p2', 'w1', 'daily-closet', 'hoodie-1', true)), { verb: 'offer', to: 'p2', wid: 'w1', store: 'daily-closet', product: 'hoodie-1', letter: true });
  assert.deepEqual(parseWrap(wrapMsg('ok', 'p1', 'w1')), { verb: 'ok', to: 'p1', wid: 'w1' });
  assert.deepEqual(parseWrap(wrapMsg('no', 'p1', 'w1', 'weird')), { verb: 'no', to: 'p1', wid: 'w1', reason: 'no' });
  assert.equal(parseWrap('wrap:offer:p2:w1:s:p:hello'), null); // no letter text travels this way
  assert.equal(parseWrap('gift:ok:p1:w1'), null);
});

test('a box and letter paper survive the bag; broken ones are dropped', () => {
  const op = '0123abcd-0000-4000-8000-000000000000';
  assert.deepEqual(wrapEntry({ w: 'w1', s: 'st', p: 'pr', c: 39000, op, lt: ' hi\nthere ' }), { kind: 'wrap', w: 'w1', s: 'st', p: 'pr', c: 39000, op, lt: 'hi there' });
  assert.equal(wrapEntry({ w: 'w 1', s: 'st', p: 'pr' }), null);
  assert.equal(letterEntry({ sips: 99 }).sips, SHEETS_MAX);
  assert.equal(letterEntry({ sips: 0 }), null);
  assert.equal(cleanLetter('x'.repeat(500)).length, LETTER_MAX);
  const st = mem();
  const bag = new Bag(st);
  assert.ok(bag.add({ kind: 'wrap', w: 'w1', s: 'st', p: 'pr', c: 5000, op: null, lt: 'Happy birthday!' }));
  assert.ok(bag.add({ kind: 'letter', sips: 5 }));
  const again = new Bag(st);
  assert.deepEqual(again.list().map((e) => e.kind), ['wrap', 'letter']);
  assert.equal(again.list()[0].lt, 'Happy birthday!');
});

test('the desk: one box at a time per friend, only that friend settles it, no answer runs out', () => {
  let now = 0;
  const d = new WrapDesk(() => now);
  d.offer('w1', 'p2', 'Mina');
  assert.equal(d.why('w1', 'p3'), 'waiting');
  assert.equal(d.why('w2', 'p2'), 'waiting');
  assert.equal(d.why('w2', 'p3'), null);
  assert.equal(d.answer('p3', 'w1'), null); // someone else can't take it
  assert.equal(d.answer('p2', 'w1').name, 'Mina');
  d.offer('w2', 'p2', 'Mina');
  now += WRAP_WAIT + 1;
  assert.deepEqual(d.expire().map((g) => g.wid), ['w2']);
  assert.equal(d.pending('w2'), false);
});

test('cards: a repeat is ignored, a no snoozes that giver', () => {
  let now = 0;
  const d = new WrapDesk(() => now);
  const m = { wid: 'w1', store: 's', product: 'p', letter: false };
  assert.equal(d.heard('p1', 'Jun', m), 'show');
  assert.equal(d.heard('p1', 'Jun', m), null);
  assert.equal(d.heard('p1', 'Jun', { ...m, wid: 'w2' }), 'busy');
  assert.equal(d.reply('w1', false).from, 'p1');
  assert.equal(d.heard('p1', 'Jun', { ...m, wid: 'w3' }), 'no');
});
