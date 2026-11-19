// "Spend ₩60,000?" before every payment (Yozi 2026-11-19). A player tapped
// the bike tune-up button 13 times in 43 seconds and paid ₩1,420,000: the
// button comes back in the same spot after each buy, so taps ran on.
//
// It hooks the wallet (wallet.askSpend), so every wallet.spend() in the game
// asks, in every shop, without each one changing. The question is a small
// panel in the game (not the browser's pop-up, which felt like a real
// payment). spend() has to answer at once, so the first tap pays nothing:
// spend() returns false (the "not enough money" toast is hidden, see
// wallet.justDeclined) and the panel opens. "OK" then plays that same tap
// again, and while it plays, spend() pays.
//
// A payment that doesn't come from a tap or a key (a timer, a message from
// another player) can't be played again, so it isn't asked.
import { getLanguage, localName, t } from '../core/i18n.js';

// What the money is for, in the player's language: the budget-book note
// ({ k, v } and/or { name, at }), or the shop you are in.
export function spendLabel(note, context, lang = getLanguage()) {
  const n = note || {};
  const at = n.at || (!n.name && context?.at) || null;
  return [n.k && t(n.k, n.v), n.name && localName(n.name, lang), at && localName(at, lang)].filter(Boolean).join(' · ');
}

export const wonText = (n) => '₩' + Math.round(n).toLocaleString('en-US');

// The decision, without the page (tests use it as it is).
// input(): the tap or key being handled now, or null. show(n, note, ok):
// open the question; ok() when the player says yes. replay(input): play
// the tap again.
export function createSpendGate({ input, show, replay }) {
  let open = false, replaying = false;
  return {
    get open() { return open; },
    close() { open = false; },
    ask(n, note) {
      if (replaying) return true;
      const now = input();
      if (!now) return true; // (nothing to play again)
      if (open) return false; // one question at a time
      open = true;
      show(n, note, () => {
        open = false;
        replaying = true;
        try { replay(now); } finally { replaying = false; }
      });
      return false;
    },
    // Ask, then run yes() on OK (no tap to play again). For a payment whose
    // tap hides or redraws what was tapped (the map closes when you pick a
    // taxi's destination), where playing the tap again would do nothing.
    // false: another question is already open.
    confirm(n, note, yes) {
      if (open) return false;
      open = true;
      show(n, note, () => { open = false; yes(); });
      return true;
    },
  };
}

const KINDS = ['click', 'pointerup', 'touchend', 'keydown'];
const COPY = ['key', 'code', 'keyCode', 'which', 'shiftKey', 'ctrlKey', 'altKey', 'metaKey', 'clientX', 'clientY', 'screenX', 'screenY', 'button', 'buttons', 'pointerId', 'pointerType', 'isPrimary'];

// The same tap or key press again, on the same thing. (A button the shop
// has redrawn since still runs its own handler.)
function playAgain({ type, ctor, target, init }) {
  let ev;
  try { ev = new ctor(type, init); } catch { ev = new Event(type, init); }
  const on = target?.isConnected === false && type === 'keydown' ? document : target || document;
  on.dispatchEvent(ev);
}

export function createSpendAsk({ wallet, shop }) {
  // The tap or key being handled right now (cleared once it is done).
  let now = null;
  const box = document.createElement('div');
  box.className = 'spend-ask';
  box.hidden = true;
  const card = document.createElement('div');
  card.className = 'spend-ask-card';
  const amount = document.createElement('strong');
  const what = document.createElement('small');
  const btns = document.createElement('div');
  btns.className = 'spend-ask-btns';
  const no = document.createElement('button');
  no.className = 'chip';
  const yes = document.createElement('button');
  yes.className = 'primary';
  btns.append(no, yes);
  card.append(amount, what, btns);
  box.append(card);
  document.body.append(box);

  for (const type of KINDS) {
    addEventListener(type, (e) => {
      if (box.contains(e.target)) return;
      const init = { bubbles: true, cancelable: true, composed: true };
      for (const k of COPY) if (k in e) init[k] = e[k];
      now = { type, ctor: e.constructor, target: e.target, init };
      setTimeout(() => { now = null; }, 0);
    }, true);
  }

  let ok = null;
  const close = () => { box.hidden = true; ok = null; gate.close(); };
  const gate = createSpendGate({
    input: () => now,
    show: (n, note, yesFn) => {
      amount.textContent = t('spend.ask', { n: wonText(n) });
      what.textContent = spendLabel(note, wallet.context?.());
      what.hidden = !what.textContent;
      no.textContent = t('spend.no');
      yes.textContent = t('spend.yes');
      ok = yesFn;
      box.hidden = false;
    },
    replay: playAgain,
  });
  yes.onclick = () => { const f = ok; box.hidden = true; ok = null; f?.(); };
  no.onclick = close;
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); yes.click(); }
  }, true);

  wallet.askSpend = (n, note) => gate.ask(n, note);
  wallet.confirmSpend = (n, note, yes) => gate.confirm(n, note, yes);
  if (shop?.toast) {
    const toast = shop.toast.bind(shop);
    shop.toast = (...a) => (wallet.justDeclined ? undefined : toast(...a));
  }
  return { get open() { return gate.open; } };
}
