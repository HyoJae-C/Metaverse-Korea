import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
};
const { Wallet, WELCOME_COINS } = await import('../src/core/wallet.js');
const { createSpendAsk, spendLabel, spendQuestion } = await import('../src/game/spend-ask.js');

const cfg = { reward: 20, dailyLimit: 5, seconds: 0 };
function setup(answers, ms = 500) {
  for (const k of Object.keys(store)) delete store[k];
  const wallet = new Wallet(cfg);
  wallet.welcome();
  const asked = [], toasts = [];
  let clock = 0;
  const shop = { toast: (s) => toasts.push(s) };
  createSpendAsk({
    wallet, shop,
    ask: (s) => { asked.push(s); clock += ms; return answers.shift(); },
    now: () => clock,
  });
  return { wallet, shop, asked, toasts };
}

test('every payment asks first; yes pays, no keeps the money', () => {
  const { wallet, asked } = setup([true, false]);
  assert.equal(wallet.spend(60000, { name: { en: 'Tune-up' }, at: { en: 'Bike Research Lab' } }), true);
  assert.equal(wallet.coins, WELCOME_COINS - 60000);
  assert.equal(wallet.spend(110000), false);
  assert.equal(wallet.coins, WELCOME_COINS - 60000, 'no: nothing taken');
  assert.equal(wallet.justDeclined, true);
  assert.equal(asked.length, 2);
  assert.match(asked[0], /₩60,000/);
  assert.match(asked[0], /Tune-up · Bike Research Lab/);
});

test('a no hides the "not enough money" toast the shop shows next', () => {
  const { wallet, shop, toasts } = setup([false]);
  if (!wallet.spend(5000)) shop.toast('You need ₩5,000.');
  assert.deepEqual(toasts, []);
  wallet.declinedAt = 0;
  shop.toast('Bought!');
  assert.deepEqual(toasts, ['Bought!']);
});

test('no question when short of money, for free things, or with ask: false', () => {
  const { wallet, asked } = setup([]);
  assert.equal(wallet.spend(wallet.coins + 1), false);
  assert.equal(wallet.justDeclined, false, 'short, not declined');
  assert.equal(wallet.spend(0), true);
  assert.equal(wallet.spend(1000, { k: 'ledger.taxi' }, { ask: false }), true);
  assert.equal(asked.length, 0);
});

test('a browser that answers "no" at once (shows nothing) stops asking instead of blocking buys', () => {
  const { wallet, asked } = setup([false], 20);
  assert.equal(wallet.spend(4500), true);
  assert.equal(wallet.spend(4500), true);
  assert.equal(asked.length, 1);
});

test('the question and what the money is for', async () => {
  assert.equal(spendQuestion(1420000, 'Bike Research Lab'), 'Spend ₩1,420,000?\nBike Research Lab');
  assert.equal(spendLabel(null, { at: { en: 'Bike Research Lab' } }), 'Bike Research Lab', 'no note: the shop you are in');
  assert.equal(spendLabel({ k: 'ledger.taxi' }, null), 'Taxi');
  assert.equal(spendLabel({ name: { en: 'Americano' }, at: { en: 'META COFFEE' } }, { at: { en: 'Other' } }), 'Americano · META COFFEE');
  const { STRINGS } = await import('../src/i18n/strings.js');
  for (const [lang, s] of Object.entries(STRINGS)) assert.match(s['spend.ask'] || '', /\{n\}/, lang + ' has spend.ask');
});
