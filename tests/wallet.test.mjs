import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Wallet, WELCOME_COINS, LOG_MAX } = await import('../src/core/wallet.js');
const cfg = { reward: 20, dailyLimit: 5, seconds: 0 };
const fresh = () => { for (const k of Object.keys(store)) delete store[k]; return new Wallet(cfg); };

test('welcome travel money comes once, and is in the budget book', () => {
  const w = fresh();
  assert.equal(w.welcome(), WELCOME_COINS);
  assert.equal(w.welcome(), 0);
  assert.equal(new Wallet(cfg).welcome(), 0, 'saved: not again after a reload');
  assert.equal(w.coins, WELCOME_COINS);
  assert.deepEqual(w.log.map((e) => [e.n, e.bal, e.note]), [[WELCOME_COINS, WELCOME_COINS, { k: 'ledger.welcome' }]]);
});

test('players from before the gift get it too, on top of what they had', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 42, day: '', ads: 0 });
  const w = new Wallet(cfg);
  assert.equal(w.welcome(), WELCOME_COINS);
  assert.equal(w.coins, 42 + WELCOME_COINS);
});

test('players who got the old 500 get the rest once when the gift goes up', () => {
  fresh();
  store['mk.wallet'] = JSON.stringify({ coins: 120, day: '', ads: 0, gift: 1 });
  const w = new Wallet(cfg);
  assert.equal(w.welcome(), WELCOME_COINS - 500);
  assert.equal(w.coins, 120 + WELCOME_COINS - 500);
  assert.equal(new Wallet(cfg).welcome(), 0, 'only once');
});

test('every coin in and out is logged with a note, or the current context', () => {
  const w = fresh();
  w.context = () => ({ at: { en: 'Cafe' } });
  w.add(30, { k: 'ledger.quest' });
  assert.equal(w.spend(100), false, 'not enough: nothing paid, nothing logged');
  assert.equal(w.spend(10), true);
  assert.equal(w.take(50, { k: 'ledger.fine' }), 20);
  w.context = null;
  w.add(5);
  assert.deepEqual(w.log.map((e) => [e.n, e.bal, e.note]), [
    [30, 30, { k: 'ledger.quest' }],
    [-10, 20, { at: { en: 'Cafe' } }],
    [-20, 0, { k: 'ledger.fine' }],
    [5, 5, null],
  ]);
  assert.equal(new Wallet(cfg).log.length, 4, 'the book is saved');
  const day = w.dayTotals();
  assert.deepEqual(day, { in: 35, out: 30 });
});

test('the budget book keeps only the latest entries', () => {
  const w = fresh();
  for (let i = 1; i <= LOG_MAX + 20; i++) w.add(1);
  assert.equal(w.log.length, LOG_MAX);
  assert.equal(w.log.at(-1).bal, LOG_MAX + 20);
});
