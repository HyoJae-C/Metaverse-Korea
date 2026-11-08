// Jjimjilbang (찜질방) rules, no DOM so it can be unit-tested.
// Sit out the hot kiln (불가마) until the sweat meter is full, then cool off
// in the ice room within a minute for a hot-cold bonus. A few paid rounds a
// day; after that it's just for fun.

export const HOT_SECONDS = 20;
export const ICE_SECONDS = 8;
export const HOT_PAY = 4000;
export const COMBO_PAY = 4000; // ice room right after the kiln
export const COMBO_WINDOW = 60; // seconds
export const DAILY_ROUNDS = 3;

const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const KEY = 'mk.sauna';

export class SaunaLog {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.s = raw.day === today(now()) ? { day: raw.day, rounds: raw.rounds | 0 } : { day: today(now()), rounds: 0 };
    this.hotAt = null; // when the last kiln session finished (ms)
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }
  _roll() { const d = today(this.now()); if (this.s.day !== d) this.s = { day: d, rounds: 0 }; }
  get left() { this._roll(); return Math.max(0, DAILY_ROUNDS - this.s.rounds); }

  // Kiln done: coins to pay (0 once today's rounds are used up).
  finishHot() {
    this._roll();
    this.hotAt = this.now().getTime();
    this.paidLast = this.s.rounds < DAILY_ROUNDS;
    if (!this.paidLast) return 0;
    this.s.rounds++;
    this._save();
    return HOT_PAY;
  }
  // Ice room done: the bonus if you came straight from a paid kiln session.
  finishIce() {
    const t = this.now().getTime();
    const combo = this.hotAt != null && t - this.hotAt <= COMBO_WINDOW * 1000;
    this.hotAt = null;
    return combo ? { combo: true, coins: this.paidLast ? COMBO_PAY : 0 } : { combo: false, coins: 0 };
  }
}
