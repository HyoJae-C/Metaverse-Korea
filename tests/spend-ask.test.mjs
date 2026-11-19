import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Wallet, WELCOME_COINS } = await import('../src/core/wallet.js');
const { createSpendGate, spendLabel, wonText } = await import('../src/game/spend-ask.js');

const cfg = { reward: 20, dailyLimit: 5, seconds: 0 };
// A wallet with the in-game question: tap() runs a handler as a tap would
// (and the gate plays it again on OK).
function setup() {
  for (const k of Object.keys(store)) delete store[k];
  const wallet = new Wallet(cfg);
  wallet.welcome();
  let current = null, pending = null;
  const shown = [];
  const gate = createSpendGate({
    input: () => current,
    show: (n, note, ok) => { shown.push([n, note]); pending = ok; },
    replay: (tap) => { const was = current; current = tap; try { tap.run(); } finally { current = was; } },
  });
  wallet.askSpend = (n, note) => gate.ask(n, note);
  const tap = (run) => { current = { run }; try { return run(); } finally { current = null; } };
  return { wallet, gate, shown, tap, ok: () => { const f = pending; pending = null; f(); }, no: () => { pending = null; gate.close(); } };
}

test('a tap that spends asks first and pays nothing until OK; OK plays the tap again and pays', () => {
  const { wallet, shown, tap, ok } = setup();
  const results = [];
  const buy = () => { const r = wallet.spend(60000, { name: { en: 'Tune-up' } }); results.push(r); return r; };
  assert.equal(tap(buy), false);
  assert.equal(wallet.coins, WELCOME_COINS, 'nothing paid yet');
  assert.equal(wallet.justDeclined, true, 'so the shop hides its "not enough money" toast');
  assert.deepEqual(shown, [[60000, { name: { en: 'Tune-up' } }]]);
  ok();
  assert.deepEqual(results, [false, true]);
  assert.equal(wallet.coins, WELCOME_COINS - 60000);
});

test('cancel keeps the money; rapid taps while asking pay nothing and ask once', () => {
  const { wallet, shown, tap, no } = setup();
  const buy = () => wallet.spend(110000);
  for (let i = 0; i < 5; i++) assert.equal(tap(buy), false);
  assert.equal(shown.length, 1);
  no();
  assert.equal(wallet.coins, WELCOME_COINS);
  assert.equal(tap(buy), false, 'asks again after a cancel');
  assert.equal(shown.length, 2);
});

test('two payments in one tap: one question, both paid on OK', () => {
  const { wallet, shown, tap, ok } = setup();
  tap(() => wallet.spend(1000) && wallet.spend(2000));
  ok();
  assert.equal(shown.length, 1);
  assert.equal(wallet.coins, WELCOME_COINS - 3000);
});

test('no question when short of money, for free things, outside a tap, or with ask: false', () => {
  const { wallet, shown, tap } = setup();
  assert.equal(tap(() => wallet.spend(wallet.coins + 1)), false);
  assert.equal(wallet.justDeclined, false, 'short, not declined');
  assert.equal(tap(() => wallet.spend(0)), true);
  assert.equal(wallet.spend(1500), true, 'a timer or a message from another player: nothing to play again');
  assert.equal(tap(() => wallet.spend(1000, { k: 'ledger.taxi' }, { ask: false })), true);
  assert.equal(shown.length, 0);
});

test('the question and what the money is for', async () => {
  assert.equal(wonText(1420000), '₩1,420,000');
  assert.equal(spendLabel(null, { at: { en: 'Bike Research Lab' } }), 'Bike Research Lab', 'no note: the shop you are in');
  assert.equal(spendLabel({ k: 'ledger.taxi' }, null), 'Taxi');
  assert.equal(spendLabel({ name: { en: 'Americano' }, at: { en: 'META COFFEE' } }, { at: { en: 'Other' } }), 'Americano · META COFFEE');
  const { STRINGS } = await import('../src/i18n/strings.js');
  for (const [lang, s] of Object.entries(STRINGS)) {
    assert.match(s['spend.ask'] || '', /\{n\}/, lang + ' has spend.ask');
    assert.ok(s['spend.yes'] && s['spend.no'], lang + ' has spend.yes / spend.no');
    assert.doesNotMatch(s['spend.ask'], /결제/, 'not worded like a real payment');
  }
});
