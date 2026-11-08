// Square missions (광장 미션): a guide on the central square hands out one
// small errand at a time. You go and do it, then come back to the square to
// report and get coins. Coming back is the point: squares stay busy, which is
// also where the big screen (ads) is. No DOM, so it can be unit-tested.
//
// Kinds:
//   visit  go into a shop (target: store id)
//   coffee bring back a coffee (checked when you report; the guide takes it)
//   fish   catch any fish
//   cook   finish the grill or ramen game
//   pet    come back walking your pet (checked when you report)
//   talk   say hi to 3 passers-by
//   dance  do 3 emotes on the square (in front of the big screen)
//   highfive  high-five the guide (no longer handed out: it repeated the
//             welcome high five; kept so a saved one can still be finished)
//   taxi   take a taxi anywhere
//   subway ride the subway to another station (the first errand: other
//          districts are only a train ride away)
//   eat    sit down in a restaurant and finish a meal
//   pat    pat an animal in an animal café
//
// New players get a fixed first path (STARTER) after the welcome high five:
// errands close to the square (within ~300 m) that each teach one thing.
// They don't count towards the daily limit and pay a bit more.
export const QUEST_REWARD = 10000;
export const STARTER_REWARD = 20000;
export const STARTER = [
  { kind: 'subway', tip: 'subway' }, // other districts: a train ride away (an early "there's more" moment)
  { kind: 'visit', target: 'nyang-cat-cafe', tip: 'map' }, // the map: tap a place, walk there by itself; or ride a bike
  { kind: 'taxi', tip: 'taxi' }, // fast, but it costs
  { kind: 'coffee', target: 'meta-coffee', tip: 'coffee' }, // order from the staff
  { kind: 'eat', target: 'ddeok-bunsik', tip: 'eat' }, // sit down and order
  { kind: 'talk', need: 3, tip: 'talk' },
  { kind: 'dance', need: 3, tip: 'dance' },
  { kind: 'visit', target: 'gawison-hair', tip: 'hair' },
  { kind: 'visit', target: 'name-studio', tip: 'name' },
  { kind: 'pat', target: 'nyang-cat-cafe', tip: 'pat' },
];
export const QUESTS_PER_DAY = 5;
const KEY = 'mk.quests';
// Saved first-path steps count from 0. Version 2 put the subway errand in
// front: a step saved before that is one later now.
const VERSION = 2;

export function pickQuest(pool, rand = Math.random, last = null) {
  const kinds = ['visit', 'coffee', 'talk', 'cook', 'fish', 'pet', 'dance'].filter((k) => k !== last && (k !== 'visit' || pool.stores.length) && (!pool.has || pool.has(k)));
  const kind = kinds[Math.floor(rand() * kinds.length)] || 'talk';
  const q = { kind, need: kind === 'talk' || kind === 'dance' ? 3 : 1, n: 0 };
  if (kind === 'visit') q.target = pool.stores[Math.floor(rand() * pool.stores.length)];
  return q;
}

export class SquareQuests {
  constructor(storage = globalThis.localStorage, today = () => new Date().toDateString()) {
    this.storage = storage;
    this.today = today;
    let s = {};
    try { s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* ignore */ }
    this.s = { day: s.day, done: s.done | 0, active: s.active && typeof s.active.kind === 'string' ? s.active : null, last: s.last || null, starter: Number.isInteger(s.starter) ? s.starter : null, v: VERSION };
    if ((s.v | 0) < VERSION && this.s.starter != null) { // saved before the subway errand
      this.s.starter++;
      if (Number.isInteger(this.s.active?.starter)) this.s.active.starter++;
      this._save();
    }
    this._roll();
  }
  _roll() {
    if (this.s.day !== this.today()) { this.s.day = this.today(); this.s.done = 0; }
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }

  get active() { return this.s.active; }
  get left() { this._roll(); return this.onStarter ? STARTER.length - this.s.starter : Math.max(0, QUESTS_PER_DAY - this.s.done); }
  // On the new player's first path (and how far along it).
  get onStarter() { return this.s.starter != null && this.s.starter < STARTER.length; }
  get starterStep() { return this.s.starter; }
  beginStarter() { this.s.starter = 0; this._save(); }

  // Take a new errand (one at a time, a few a day).
  start(pool, rand) {
    if (this.s.active || !this.left) return null;
    if (this.onStarter) {
      const st = STARTER[this.s.starter];
      this.s.active = { kind: st.kind, target: st.target, need: st.need || 1, n: 0, starter: this.s.starter };
    } else this.s.active = pickQuest(pool, rand, this.s.last);
    this._save();
    return this.s.active;
  }

  // Something happened in the game (same events as the daily missions).
  event(type, target) {
    const q = this.s.active;
    if (!q || q.n >= q.need) return false;
    const hit = (q.kind === 'visit' && type === 'visit' && target === q.target)
      || (q.kind === 'fish' && type === 'fish') || (q.kind === 'cook' && type === 'cook') || (q.kind === 'talk' && type === 'talk')
      || (q.kind === 'dance' && type === 'squareEmote') || (q.kind === 'highfive' && type === 'highfive')
      || (q.kind === 'taxi' && type === 'taxi') || (q.kind === 'subway' && type === 'subway') || (q.kind === 'eat' && type === 'eat') || (q.kind === 'pat' && type === 'pet');
    if (!hit) return false;
    q.n++;
    this._save();
    return true;
  }

  // Ready to report? ctx: { held, pet } for the ones checked on the spot.
  ready(ctx = {}) {
    const q = this.s.active;
    if (!q) return false;
    if (q.kind === 'coffee') return ctx.held === 'coffee';
    if (q.kind === 'pet') return !!ctx.pet;
    return q.n >= q.need;
  }

  // Report back: returns the coins (0 if not done yet).
  claim(ctx) {
    if (!this.ready(ctx)) return 0;
    const starter = this.s.active.starter != null;
    this.s.last = this.s.active.kind;
    this.s.active = null;
    if (starter) this.s.starter++; // the first path doesn't use up the day's errands
    else this.s.done++;
    this._save();
    return starter ? STARTER_REWARD : QUEST_REWARD;
  }

  drop() { this.s.active = null; this._save(); }
  // "Later" on a first-path errand: on to the next one, without the coins.
  skipStarter() {
    if (this.s.active?.starter == null) return false;
    this.s.active = null;
    this.s.starter++;
    this._save();
    return true;
  }
  // New players already high-fived the guide while getting started.
  skipHighFive() { this.s.last = 'highfive'; this._save(); }
}
