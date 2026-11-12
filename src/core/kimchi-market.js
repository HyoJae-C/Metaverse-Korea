// Selling homemade food at the market (no DOM, so it can be unit-tested).
// A jar from the kimjang class at Sonmat Kimchi School, a box of japchae from the Royal Japchae Class or
// a roll of kimbap from the Kimbap Making Class carries its dish and score
// (bag entry { kind: 'gift', g: 'kimchi' | 'japchae' | 'kimbap', q: 0-100 }).
// The side-dish stall at Yongmaru Market in Itaewon buys them: the better
// the dish, the more coins. Only a few a day in all, so cooking can't farm
// coins.
import { dayKey } from './daily.js';
import { medalFor } from './grill-game.js';

export const KIMCHI_GOODS = 'kimchi';
export const SELL_PER_DAY = 3;
// Coins for a jar by its medal (no medal still sells, cheaply).
export const KIMCHI_PRICE = { gold: 24000, silver: 18000, bronze: 12000, none: 6000 };
// Every dish the stall buys: its icon and coins by medal. Kimbap is quicker
// to make, so it fetches a little less.
export const DISHES = {
  kimchi: { icon: '🫙', price: KIMCHI_PRICE },
  japchae: { icon: '🍝', price: { gold: 24000, silver: 18000, bronze: 12000, none: 6000 } },
  kimbap: { icon: '🍙', price: { gold: 20000, silver: 16000, bronze: 10000, none: 4000 } },
};
const KEY = 'mk.kimchiSold';

// Jars made before jars kept their score: the same name and icon.
const OLD_NAME = 'Homemade kimchi';
export function isKimchi(e) {
  return !!e && e.kind === 'gift' && (e.g === KIMCHI_GOODS || (e.g == null && e.icon === '🫙' && e.name === OLD_NAME));
}
// A jar's score, 0-100 (an old jar without one counts as a bronze).
export const kimchiScore = (e) => (Number.isFinite(e?.q) ? Math.max(0, Math.min(100, Math.round(e.q))) : 55);
// Any homemade dish the stall buys (kimchi, japchae, kimbap); its dish id.
export const dishOf = (e) => (isKimchi(e) ? KIMCHI_GOODS : e?.kind === 'gift' && Object.hasOwn(DISHES, e.g) ? e.g : null);
export const isHomemade = (e) => dishOf(e) != null;
export const kimchiPrice = (e) => (DISHES[dishOf(e)]?.price ?? KIMCHI_PRICE)[medalFor(kimchiScore(e)) || 'none'];

// The bag entry for a fresh jar.
export function kimchiJar(score, name = OLD_NAME) {
  return { kind: 'gift', sips: 1, name, icon: '🫙', g: KIMCHI_GOODS, q: Math.max(0, Math.min(100, Math.round(score) || 0)) };
}

// How many dishes were sold today: { day, n }, saved on this device.
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
  // Sell the dish at bag slot i: takes it out of the bag and returns the
  // coins (0 when it isn't homemade food or today's limit is reached).
  sell(bag, i) {
    const e = bag.list()[i];
    if (!isHomemade(e) || this.left() <= 0) return 0;
    if (!bag.take(i)) return 0;
    this.s.n++;
    try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return kimchiPrice(e);
  }
}
