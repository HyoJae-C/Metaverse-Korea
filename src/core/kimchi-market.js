// Selling homemade kimchi at the market (no DOM, so it can be unit-tested).
// A jar from the kimjang class at Sonmat Kimchi School carries its score
// (bag entry { kind: 'gift', g: 'kimchi', q: 0-100 }). The side-dish stall
// at Yongmaru Market in Itaewon buys it: the better the kimchi, the more
// coins. Only a few jars a day, so making kimchi can't farm coins.
import { dayKey } from './daily.js';
import { medalFor } from './grill-game.js';

export const KIMCHI_GOODS = 'kimchi';
export const SELL_PER_DAY = 3;
// Coins for a jar by its medal (no medal still sells, cheaply).
export const KIMCHI_PRICE = { gold: 12, silver: 9, bronze: 6, none: 3 };
const KEY = 'mk.kimchiSold';

// Jars made before jars kept their score: the same name and icon.
const OLD_NAME = 'Homemade kimchi';
export function isKimchi(e) {
  return !!e && e.kind === 'gift' && (e.g === KIMCHI_GOODS || (e.g == null && e.icon === '🫙' && e.name === OLD_NAME));
}
// A jar's score, 0-100 (an old jar without one counts as a bronze).
export const kimchiScore = (e) => (Number.isFinite(e?.q) ? Math.max(0, Math.min(100, Math.round(e.q))) : 55);
export const kimchiPrice = (e) => KIMCHI_PRICE[medalFor(kimchiScore(e)) || 'none'];

// The bag entry for a fresh jar.
export function kimchiJar(score, name = OLD_NAME) {
  return { kind: 'gift', sips: 1, name, icon: '🫙', g: KIMCHI_GOODS, q: Math.max(0, Math.min(100, Math.round(score) || 0)) };
}

// How many jars were sold today: { day, n }, saved on this device.
export class KimchiSales {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    let s = null;
    try { s = JSON.parse(storage?.getItem(KEY) || 'null'); } catch { /* broken save */ }
    this.s = s && typeof s.day === 'string' && Number.isInteger(s.n) ? s : { day: '', n: 0 };
  }
  _roll() {
    const today = dayKey(this.now());
    if (this.s.day !== today) this.s = { day: today, n: 0 };
  }
  left() { this._roll(); return Math.max(0, SELL_PER_DAY - this.s.n); }
  // Sell the jar at bag slot i: takes it out of the bag and returns the
  // coins (0 when it isn't kimchi or today's limit is reached).
  sell(bag, i) {
    const e = bag.list()[i];
    if (!isKimchi(e) || this.left() <= 0) return 0;
    if (!bag.take(i)) return 0;
    this.s.n++;
    try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return kimchiPrice(e);
  }
}
