// "Pay ₩60,000?" before every payment (Yozi 2026-11-19). A player tapped
// the bike tune-up button 13 times in 43 seconds and paid ₩1,420,000: the
// button comes back in the same spot after each buy, so taps ran on.
//
// It hooks the wallet (wallet.askSpend), so every wallet.spend() in the game
// asks, in every shop, without each one changing. The question is the
// browser's own confirm(): it waits for the answer before the code goes on,
// which is what lets one hook cover them all.
//
// A "no" makes spend() return false, as if short of money. The "not enough
// money" toast that shops show then is hidden (wallet.justDeclined).
import { getLanguage, localName, t } from '../core/i18n.js';

// What the money is for, in the player's language: the budget-book note
// ({ k, v } and/or { name, at }), or the shop you are in.
export function spendLabel(note, context, lang = getLanguage()) {
  const n = note || {};
  const at = n.at || (!n.name && context?.at) || null;
  return [n.k && t(n.k, n.v), n.name && localName(n.name, lang), at && localName(at, lang)].filter(Boolean).join(' · ');
}

export function spendQuestion(n, label) {
  return t('spend.ask', { n: '₩' + Math.round(n).toLocaleString('en-US') }) + (label ? '\n' + label : '');
}

// ask(text) → true/false; now() in ms. Both swappable for tests.
export function createSpendAsk({ wallet, shop, ask = (s) => globalThis.confirm(s), now = () => performance.now() }) {
  // Some app browsers answer confirm() with "no" at once and show nothing.
  // No person answers in under 100 ms, so then stop asking on this page
  // rather than make buying impossible there.
  let noDialogs = false;
  wallet.askSpend = (n, note) => {
    if (noDialogs) return true;
    const start = now();
    let yes;
    try { yes = ask(spendQuestion(n, spendLabel(note, wallet.context?.()))); } catch { noDialogs = true; return true; }
    if (!yes && now() - start < 100) { noDialogs = true; return true; }
    return !!yes;
  };
  if (shop?.toast) {
    const toast = shop.toast.bind(shop);
    shop.toast = (...a) => (wallet.justDeclined ? undefined : toast(...a));
  }
  return { get asking() { return !noDialogs; } };
}
