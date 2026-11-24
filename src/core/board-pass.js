// The board game café's pass (Yozi 2026-11-24): ₩5,000 at the counter buys
// three hours of play (real time). Inside that time, walking out and back in
// costs nothing more. Watching is free; sitting down to a game needs the pass.
// A game under way is played to its end after the pass runs out; the next
// game asks again. A board game set at home needs no pass.
//
// The payment is in the server's ledger like any other (wallet.spend); the
// time left is kept in this browser, as the daily missions are.
export const BOARD_PASS = { fee: 5000, ms: 3 * 60 * 60 * 1000, store: 'dice-and-tea' };
const KEY = 'mk.boardPass';

// ms of play left (0: no pass, or it ran out).
export function passLeft(now = Date.now(), store = globalThis.localStorage) {
  try {
    const s = JSON.parse(store?.getItem(KEY) || 'null');
    const until = Number(s?.until);
    // (a clock set back, or a made-up far date: never more than one pass's time)
    return Number.isFinite(until) && until > now ? Math.min(until - now, BOARD_PASS.ms) : 0;
  } catch { return 0; }
}

// A pass just paid for (op: the payment's id in the ledger).
export function startPass(op = null, now = Date.now(), store = globalThis.localStorage) {
  const until = now + BOARD_PASS.ms;
  try { store?.setItem(KEY, JSON.stringify({ until, op })); } catch { /* (private mode: the pass lasts until the page closes) */ }
  return until;
}
