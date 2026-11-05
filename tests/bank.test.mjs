import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Bank, bankMsg, parseBank, SEND_MIN, SEND_MAX, FEE, DAY_OUT, DAY_IN, SENDS_PER_DAY, MIN_AGE_DAYS, WAIT, SHOW, SNOOZE, MEMOS } from '../src/core/bank.js';
import { BANK_TEXT } from '../src/ui/bank-ui.js';

const DAY = 864e5;
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
// An account that has played long enough to send.
const old = (clock = { t: 10 * DAY }, day = { d: 'Mon' }, storage = mem()) => new Bank(storage, () => clock.t, () => day.d, 1);

test('transfer messages round-trip and reject anything else', () => {
  assert.deepEqual(parseBank(bankMsg('offer', 'bob', 't1', 120, 'coffee')), { verb: 'offer', to: 'bob', tid: 't1', coins: 120, memo: 'coffee' });
  assert.deepEqual(parseBank(bankMsg('ok', 'amy', 't1')), { verb: 'ok', to: 'amy', tid: 't1' });
  assert.deepEqual(parseBank(bankMsg('no', 'amy', 't1', 'limit')), { verb: 'no', to: 'amy', tid: 't1', reason: 'limit' });
  assert.equal(parseBank(bankMsg('no', 'amy', 't1', 'weird')).reason, 'no');
  assert.equal(parseBank(bankMsg('offer', 'bob', 't1', 50, 'hello <b>')).memo, MEMOS[0]); // memos are a fixed list
  for (const bad of ['bank:offer:bob:t1:50', 'bank:offer:bob:t1:-5:thanks', 'bank:offer:bob:t1:50000:thanks', 'bank:offer:bob:t1:50:free text', 'bank:give:bob:t1', 'gift:ok:bob:g1', null]) {
    assert.equal(parseBank(bad), null, String(bad));
  }
});

test('a new account has to play for a few days before it can send', () => {
  const clock = { t: 1000 };
  const s = mem();
  const b = new Bank(s, () => clock.t, () => 'Mon');
  assert.equal(b.daysToGo(), MIN_AGE_DAYS);
  assert.equal(b.why(50, 999), 'new');
  clock.t += (MIN_AGE_DAYS - 1) * DAY;
  assert.equal(new Bank(s, () => clock.t, () => 'Mon').daysToGo(), 1); // the start day is kept
  clock.t += DAY;
  assert.equal(new Bank(s, () => clock.t, () => 'Mon').why(50, 999), null);
  // Players from before the bank: their oldest budget book entry counts.
  assert.equal(new Bank(mem(), () => 20 * DAY, () => 'Mon', 5 * DAY).daysToGo(), 0);
});

test('amounts, the fee and the balance are checked before sending', () => {
  const b = old();
  assert.equal(b.why(SEND_MIN - 1, 999), 'amount');
  assert.equal(b.why(SEND_MAX + 1, 999), 'amount');
  assert.equal(b.why(12.5, 999), 'amount');
  assert.equal(b.why(100, 100 + FEE - 1), 'poor'); // the fee is on top
  assert.equal(b.why(100, 100 + FEE), null);
  assert.equal(b.maxSend(60), 60 - FEE);
  assert.equal(b.maxSend(SEND_MIN + FEE - 1), 0);
});

test('an accepted transfer counts toward today; a no gives back the coins and the fee', () => {
  const b = old();
  const t1 = b.send({ to: 'bob', name: 'Bob', coins: 100, memo: 'food' });
  assert.equal(b.why(50, 999), 'waiting'); // one at a time
  assert.equal(b.answer('eve', t1, 'no'), null); // only Bob can answer
  assert.equal(b.answer('bob', t1, 'ok').refund, 0);
  assert.equal(b.answer('bob', t1, 'ok'), null); // answered once
  const t2 = b.send({ to: 'bob', name: 'Bob', coins: 40, memo: 'food' });
  assert.equal(b.answer('bob', t2, 'no').refund, 40 + FEE);
  assert.deepEqual(b.left(), { coins: DAY_OUT - 100, sends: SENDS_PER_DAY - 1, inCoins: DAY_IN });
});

test('daily send limits: coins and number of transfers; a new day starts fresh', () => {
  const day = { d: 'Mon' };
  const b = old(undefined, day);
  for (const n of [SEND_MAX, DAY_OUT - SEND_MAX]) b.answer('bob', b.send({ to: 'bob', coins: n }), 'ok');
  assert.equal(b.why(SEND_MIN, 9999), 'limit');
  day.d = 'Tue';
  assert.equal(b.why(SEND_MIN, 9999), null);
  for (let i = 0; i < SENDS_PER_DAY; i++) b.answer('bob', b.send({ to: 'bob', coins: SEND_MIN }), 'ok');
  assert.equal(b.why(SEND_MIN, 9999), 'sends');
  assert.equal(b.maxSend(9999), 0);
});

test('anyone can receive at most DAY_IN a day, however many people send', () => {
  const b = old();
  let got = 0, i = 0;
  for (; i < 10; i++) {
    const r = b.heard('alt' + i, 'Alt', { tid: 'x' + i, coins: SEND_MAX, memo: 'thanks' });
    if (r !== 'show') { assert.equal(r, 'limit'); continue; }
    const a = b.reply('x' + i, true);
    if (a.ok) got += a.t.coins;
    else assert.equal(a.reason, 'limit');
  }
  assert.ok(got <= DAY_IN, `${got}`);
  assert.equal(b.left().inCoins, DAY_IN - got);
  // Two cards waiting that together go over: the second is turned back on Accept.
  const c = old();
  assert.equal(c.heard('a', 'A', { tid: 'a1', coins: SEND_MAX, memo: 'trip' }), 'show');
  assert.equal(c.heard('b', 'B', { tid: 'b1', coins: SEND_MAX, memo: 'trip' }), 'show');
  assert.equal(c.reply('a1', true).ok, true);
  assert.deepEqual(c.reply('b1', true).reason, 'limit');
});

test('incoming cards: one per sender, a few at a time, ignored repeats, snoozed after a no', () => {
  const clock = { t: 10 * DAY };
  const b = old(clock);
  const offer = (tid, coins = 50) => ({ tid, coins, memo: 'thanks' });
  assert.equal(b.heard('amy', 'Amy', offer('a1')), 'show');
  assert.equal(b.heard('amy', 'Amy', offer('a1')), null); // the same message twice
  assert.equal(b.heard('amy', 'Amy', offer('a2')), 'busy');
  assert.equal(b.heard('bob', 'Bob', offer('b1', 5000)), 'no'); // out of range: never shown
  assert.equal(b.heard('bob', 'Bob', offer('b1')), 'show');
  assert.equal(b.heard('cat', 'Cat', offer('c1')), 'busy'); // two cards at a time
  assert.equal(b.reply('a1', false).reason, 'no');
  assert.equal(b.heard('amy', 'Amy', offer('a3')), 'no'); // snoozed
  clock.t += SNOOZE + 1;
  assert.equal(b.heard('amy', 'Amy', offer('a3')), 'show');
  clock.t += SHOW + 1;
  assert.deepEqual(b.stale().map((t) => t.tid).sort(), ['a3', 'b1']);
});

test('a waiting transfer is refunded on time out, when the friend leaves, or when I leave', () => {
  const clock = { t: 10 * DAY };
  const b = old(clock);
  b.send({ to: 'bob', name: 'Bob', coins: 30 });
  assert.equal(b.expire(), null);
  assert.equal(b.expire((id) => id === 'bob').coins, 30); // Bob left
  b.send({ to: 'bob', name: 'Bob', coins: 30 });
  clock.t += WAIT + 1;
  assert.equal(b.expire().to, 'bob');
  b.send({ to: 'bob', name: 'Bob', coins: 30 });
  assert.equal(b.cancelAll().coins, 30);
  assert.equal(b.cancelAll(), null);
  assert.deepEqual(b.left(), { coins: DAY_OUT, sends: SENDS_PER_DAY, inCoins: DAY_IN }); // nothing was sent
});

test('a broken save starts clean', () => {
  const s = mem();
  s.setItem('mk.bank', '{nope');
  const b = new Bank(s, () => 5, () => 'Mon');
  assert.deepEqual(b.left(), { coins: DAY_OUT, sends: SENDS_PER_DAY, inCoins: DAY_IN });
  assert.equal(b.s.since, 5);
});

test('the bank speaks every language, with the same {placeholders}', () => {
  const langs = ['en', 'ko', 'ja', 'zh', 'es', 'ar', 'vi', 'hi', 'id'];
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  const walk = (o, path) => {
    if (o.en) { for (const l of langs) { assert.ok(o[l], `${path} ${l}`); assert.equal(vars(o[l]), vars(o.en), `${path} ${l}`); } return; }
    for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  walk(BANK_TEXT, 'BANK_TEXT');
  for (const m of MEMOS) assert.ok(BANK_TEXT.memos[m], m);
});

test('Seongsu has a bank, with its own map icon and category name', () => {
  const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url))).stores;
  const banks = stores.filter((s) => s.workshop === 'bank');
  assert.equal(banks.length, 1);
  assert.equal(banks[0].category, 'bank');
});
