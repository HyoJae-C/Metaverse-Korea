import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GiftBox, giftMsg, parseGift, GIFT_WAIT, GIFT_SHOW, GIFTS_PER_DAY, MAX_OUT, MAX_IN, SNOOZE } from '../src/core/gifts.js';
import { GIFT_TEXT } from '../src/ui/gift-ui.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const box = (clock = { t: 1000 }, day = { d: 'Mon' }, storage = mem()) => new GiftBox(storage, () => clock.t, () => day.d);

test('gift messages round-trip and reject anything else', () => {
  assert.deepEqual(parseGift(giftMsg('offer', 'bob', 'g1', 'daily-closet', 'denim')), { verb: 'offer', to: 'bob', gid: 'g1', store: 'daily-closet', product: 'denim' });
  assert.deepEqual(parseGift(giftMsg('ok', 'amy', 'g1')), { verb: 'ok', to: 'amy', gid: 'g1' });
  assert.deepEqual(parseGift(giftMsg('no', 'amy', 'g1', 'full')), { verb: 'no', to: 'amy', gid: 'g1', reason: 'full' });
  assert.equal(parseGift(giftMsg('no', 'amy', 'g1', 'weird')).reason, 'no');
  for (const bad of ['gift:offer:bob:g1', 'gift:give:bob:g1', 'gift:offer:bob:g1:a b:c', 'wave', 'gift:ok:bob:g1:extra', null]) assert.equal(parseGift(bad), null, String(bad));
});

test('an accepted gift is paid for; a no gives the coins back; only the friend can answer', () => {
  const b = box();
  const gid = b.send({ to: 'bob', name: 'Bob', store: 's', product: 'p', coins: 30 });
  assert.equal(b.answer('eve', gid, 'no'), null); // someone else can't cancel it
  assert.deepEqual(b.answer('bob', gid, 'ok').refund, 0);
  assert.equal(b.answer('bob', gid, 'ok'), null); // answered once
  const g2 = b.send({ to: 'bob', name: 'Bob', store: 's', product: 'p', coins: 12 });
  assert.equal(b.answer('bob', g2, 'no').refund, 12);
  assert.equal(b.left(), GIFTS_PER_DAY - 1); // only accepted gifts count
});

test('waiting offers: one per friend, a few at a time, refunded on time out or when they leave', () => {
  const clock = { t: 0 };
  const b = box(clock);
  b.send({ to: 'a', coins: 1 });
  assert.equal(b.why('a'), 'waiting');
  for (let i = 1; i < MAX_OUT; i++) b.send({ to: 'p' + i, coins: 1 });
  assert.equal(b.why('z'), 'busy');
  assert.deepEqual(b.expire((id) => id === 'a').map((g) => g.to), ['a']);
  clock.t = GIFT_WAIT + 1;
  assert.equal(b.expire().length, MAX_OUT - 1);
  assert.equal(b.why('a'), null);
});

test('daily cap resets the next day', () => {
  const day = { d: 'Mon' };
  const storage = mem();
  const b = box({ t: 0 }, day, storage);
  for (let i = 0; i < GIFTS_PER_DAY; i++) b.answer('f' + i, b.send({ to: 'f' + i, coins: 1 }), 'ok');
  assert.equal(b.why('x'), 'limit');
  assert.equal(box({ t: 0 }, day, storage).why('x'), 'limit'); // kept after a reload
  day.d = 'Tue';
  assert.equal(b.why('x'), null);
});

test('the friend: one card per giver, a few at a time, a no keeps that giver away for a while', () => {
  const clock = { t: 0 };
  const b = box(clock);
  assert.equal(b.heard('amy', 'Amy', { gid: 'g1', store: 's', product: 'p' }), 'show');
  assert.equal(b.heard('amy', 'Amy', { gid: 'g1', store: 's', product: 'p' }), null); // a repeat
  assert.equal(b.heard('amy', 'Amy', { gid: 'g2', store: 's', product: 'p' }), 'busy');
  for (let i = 1; i < MAX_IN; i++) b.heard('g' + i, 'G', { gid: 'x' + i, store: 's', product: 'p' });
  assert.equal(b.heard('new', 'N', { gid: 'n1', store: 's', product: 'p' }), 'busy');
  assert.equal(b.reply('g1', false).from, 'amy');
  assert.equal(b.heard('amy', 'Amy', { gid: 'g3', store: 's', product: 'p' }), 'no');
  clock.t = SNOOZE + 1;
  assert.equal(b.stale().length, MAX_IN - 1); // the others ran out
  assert.equal(b.heard('amy', 'Amy', { gid: 'g4', store: 's', product: 'p' }), 'show');
  assert.equal(b.cards().length, 1);
});

test('a card goes before the giver gives up, so a late Accept is not also refunded', () => {
  assert.ok(GIFT_SHOW < GIFT_WAIT);
});

test('gift texts come in every language, with the same {placeholders}', () => {
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  const all = { ...GIFT_TEXT, ...Object.fromEntries(Object.entries(GIFT_TEXT.back).map(([k, v]) => ['back.' + k, v])) };
  delete all.back;
  for (const [k, o] of Object.entries(all)) {
    for (const lang of ['en', 'ko', 'ja', 'zh', 'es', 'ar', 'vi', 'hi', 'id']) {
      assert.ok(o[lang], `${k} ${lang}`);
      assert.equal(vars(o[lang]), vars(o.en), `${k} ${lang}`);
    }
  }
});
