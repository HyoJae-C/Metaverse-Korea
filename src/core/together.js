// Things to do with other players. No DOM, so it can be unit-tested.
//
// High five: stand next to someone and both press 🙌 within a few seconds of
// each other. Each side sends 'hi5:<their id>'; whoever presses second sees
// the other's message already waiting, so both sides finish on their own.
// The first high five with each person pays a few coins, a few times a day.
//
// Cooking together: finishing a dish (the grill, the ramen, a cooking class)
// with another player close by pays a little extra, once a day for each
// person and for up to COOK_PAID_PER_DAY people (Yozi 2026-11-22: paying
// every dish made ~400k an hour). A class has to end with a medal. The first
// dish together each day also gives a seasoning. Fishing has none.

export const HI5_WINDOW = 6000; // ms
export const HI5_COINS = 5000;
export const HI5_PAID_PER_DAY = 5;
export const TOGETHER_RADIUS = 4; // m
const KEY = 'mk.hi5';

export const hi5Msg = (to) => `hi5:${to}`;
export function parseHi5(e) {
  const m = /^hi5:([\w-]{1,64})$/.exec(String(e));
  return m ? m[1] : null;
}

export const TOGETHER_COINS = { cook: 6000 };
export const COOK_PAID_PER_DAY = 5;
const COOK_KEY = 'mk.cookpair';

// Who I've cooked with today. cooked(name) → { coins, first, day }: coins
// for someone new today (up to COOK_PAID_PER_DAY people); first: my first
// dish together today (the seasoning). The server takes each person once a
// day too (reward 'cook', op id from the day and the name).
export class CookPairs {
  constructor(storage = globalThis.localStorage, today = () => new Date().toDateString()) {
    this.storage = storage;
    this.today = today;
    let s = {};
    try { s = JSON.parse(storage?.getItem(COOK_KEY) || '{}') || {}; } catch { /* ignore */ }
    this.s = { day: s.day, with: Array.isArray(s.with) ? s.with : [], any: !!s.any };
  }
  cooked(name) {
    if (this.s.day !== this.today()) this.s = { day: this.today(), with: [], any: false };
    const first = !this.s.any;
    this.s.any = true;
    let coins = 0;
    if (name && !this.s.with.includes(name) && this.s.with.length < COOK_PAID_PER_DAY) {
      this.s.with.push(name);
      coins = TOGETHER_COINS.cook;
    }
    try { this.storage?.setItem(COOK_KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return { coins, first, day: this.s.day };
  }
}

export class HighFives {
  constructor(storage = globalThis.localStorage, today = () => new Date().toDateString(), now = () => Date.now()) {
    this.storage = storage;
    this.today = today;
    this.now = now;
    this.mine = new Map(); // id -> when I pressed
    this.theirs = new Map(); // id -> when they pressed
    let s = {};
    try { s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* ignore */ }
    this.s = { day: s.day, with: Array.isArray(s.with) ? s.with : [] };
  }
  _roll() { if (this.s.day !== this.today()) { this.s.day = this.today(); this.s.with = []; } }
  _recent(map, id) { const at = map.get(id); return at != null && this.now() - at < HI5_WINDOW; }

  // They asked and are waiting for me?
  waiting(id) { return this._recent(this.theirs, id); }

  // I press 🙌 towards someone: returns the result if they already pressed.
  press(id, name) {
    this.mine.set(id, this.now());
    return this.waiting(id) ? this._done(id, name) : null;
  }

  // Their 'hi5:<me>' arrived: returns the result if I already pressed.
  heard(id, name) {
    this.theirs.set(id, this.now());
    return this._recent(this.mine, id) ? this._done(id, name) : null;
  }

  // { coins }: coins only for someone new today, a few times a day. People
  // are told apart by name too, so rejoining doesn't pay twice (and the
  // server takes each name once a day: main.js gives a fixed op id).
  _done(id, name) {
    this.mine.delete(id);
    this.theirs.delete(id);
    this._roll();
    const who = name || id;
    let coins = 0;
    if (!this.s.with.includes(who) && this.s.with.length < HI5_PAID_PER_DAY) {
      this.s.with.push(who);
      coins = HI5_COINS;
      try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    }
    return { coins, who, day: this.s.day };
  }
}

// Square crowd bonus: +1 coin for every other player near the guide when you
// report a mission, up to 5. Busy squares pay more.
export const crowdBonus = (people) => Math.min(5, Math.max(0, people | 0)) * 2000;
