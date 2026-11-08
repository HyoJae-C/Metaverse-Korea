// Money is Korean won (₩), game money only (no cash value). Prices are what
// things cost in Seoul; 1 won in the game is 1 won.
//
// Before November 2026 the game counted "coins" (1 coin was about ₩1,000).
// Saved balances, budget books and queued wallet ops from then are turned
// into won with OLD_COIN_WON when they are read.
export const OLD_COIN_WON = 1000;

// "₩4,500" (and "-₩1,550" for money going out).
export function won(n) {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? '-' : ''}₩${Math.abs(v).toLocaleString('en-US')}`;
}
