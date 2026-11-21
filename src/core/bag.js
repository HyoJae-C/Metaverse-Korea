// The bag: things you carry around but don't hold in your hand (a book, a
// takeaway drink, the umbrella). It has a fixed number of slots (20 to start);
// `expand` adds more later (e.g. a bigger bag from a shop).
//
// Entries are small plain objects:
//   { kind: 'book', book: '<id>' }
//   { kind: 'coffee' | 'glass' | 'food', sips: 1-5, name: '<drink name>' }
//   { kind: 'umbrella' }
//   { kind: 'duckmold' } (the snow duck maker, given when it first snows)
//   { kind: 'ginkgo', n } (ginkgo nuts from shaking a ginkgo: they only stink)
//   { kind: 'perfume', p: '<perfume id>', sips: 1-5 (sprays left), name }
//   { kind: 'lipstick' | 'blush', c: '<shade>', sips: 1-5 (uses left) } (core/lipstick.js)
//   { kind: 'gift', name, icon, g?: 'kimchi', q?: 0-100 } (a shop bag, or homemade kimchi)
//   { kind: 'bait', b: '<bait id>', sips: 1-5 (left) } (fishing bait, core/bait.js)
//   { kind: 'photo', ph: '<photo id>' } (a ride photo, core/ride-photos.js)
//   { kind: 'wrap', w, s, p, c, op, lt? } (a gift-wrapped box, core/wrap.js)
//   { kind: 'letter', sips: sheets } (letter paper, core/wrap.js)

import { isStick, stickEntry } from './lipstick.js';
import { baitEntry } from './bait.js';
import { recipeOf } from './recipe-book.js';
import { isKimchi } from './kimchi-market.js';
import { photoEntry } from './ride-photos.js';
import { letterEntry, wrapEntry } from './wrap.js';

export const BAG_KEY = 'mk.bag';
export const BASE_CAP = 20;
export const MAX_CAP = 60;
// Perfume and lipstick live in the wardrobe, not in the bag's slots: kept
// apart in `vanity` (up to VANITY_MAX), saved with the bag.
export const COSMETICS = ['perfume', 'lipstick', 'blush'];
export const VANITY_MAX = 60;
export const isCosmetic = (e) => COSMETICS.includes(e?.kind);
// Dishes from the cooking classes (core/recipe-book.js) have their own food
// bag, not counted in the bag's slots. One slot holds every dish of a kind
// (all the kimbap, whatever the medal), up to STACK_MAX of it; DISH_CAP
// kinds fit. They stay in `items` one entry each (so a slot index still
// means the same thing everywhere); only the food bag's view stacks them.
export const DISH_CAP = 20;
export const STACK_MAX = 99;
export const isDish = (e) => !!recipeOf(e);
// The food-bag slot a dish goes in (bibim and mul naengmyeon are two).
export const dishKind = (e) => (isKimchi(e) ? 'kimchi' : e.g);
// Its slot in the food bag: one per kind, and one per upgrade level (Yozi
// 2026-11-17: a +12 kimbap doesn't stack with plain ones).
export const dishSlot = (e) => dishKind(e) + ((e.lv | 0) > 0 ? '+' + Math.min(30, e.lv | 0) : '');
// Can one more of this dish go in a food bag whose kinds are counted in `n`?
const roomFor = (n, e) => { const k = dishSlot(e), c = n.get(k) || 0; return c ? c < STACK_MAX : n.size < DISH_CAP; };

// A carried thing (kind 'gift'). Homemade goods also keep what they are
// (g, e.g. 'kimchi') and how well they were made (q, 0-100), so they can be
// sold at the market (core/kimchi-market.js).
export function giftEntry(e) {
  const out = { kind: 'gift', sips: 1, name: String(e.name || '').slice(0, 40), icon: String(e.icon || '🛍️').slice(0, 4) };
  if (typeof e.g === 'string' && /^[a-z]{1,16}$/.test(e.g)) {
    out.g = e.g;
    if (Number.isFinite(e.q)) out.q = Math.max(0, Math.min(100, Math.round(e.q)));
    // An upgraded dish (core/dish-upgrade.js): its level, the gauge saved up,
    // its id on the server, and who made it.
    if ((e.lv | 0) > 0) out.lv = Math.min(30, e.lv | 0);
    if ((e.gz | 0) > 0) out.gz = Math.min(100, e.gz | 0);
    if (typeof e.u === 'string' && /^[0-9a-f-]{36}$/.test(e.u)) out.u = e.u;
    if (typeof e.by === 'string' && e.by) out.by = e.by.slice(0, 24);
  }
  return out;
}

// Keep only entries the game understands. isBook(id) tells whether a book id
// still exists in the library.
export function cleanEntry(e, { isBook = () => true, maxSips = 5, isPerfume = () => true, maxSprays = 5 } = {}) {
  if (!e || typeof e !== 'object') return null;
  if (e.kind === 'umbrella') return { kind: 'umbrella' };
  if (e.kind === 'duckmold') return { kind: 'duckmold' };
  if (e.kind === 'ginkgo') return { kind: 'ginkgo', n: Math.max(1, Math.min(99, e.n | 0)) }; // ginkgo nuts (game/ginkgo.js), one slot for them all
  if (e.kind === 'book') return typeof e.book === 'string' && isBook(e.book) ? { kind: 'book', book: e.book } : null;
  if (e.kind === 'perfume') {
    const sips = Math.min(maxSprays, e.sips | 0);
    return sips > 0 && typeof e.p === 'string' && isPerfume(e.p) ? { kind: 'perfume', p: e.p, sips, name: String(e.name || '').slice(0, 60) } : null;
  }
  if (isStick(e.kind)) return stickEntry(e); // lipstick, blush
  if (e.kind === 'bait') return baitEntry(e);
  if (e.kind === 'photo') return photoEntry(e);
  if (e.kind === 'wrap') return wrapEntry(e);
  if (e.kind === 'letter') return letterEntry(e);
  if (e.kind === 'gift') return giftEntry(e); // a shop purchase, or homemade goods
  if (e.kind === 'coffee' || e.kind === 'food' || e.kind === 'glass') {
    const sips = Math.min(maxSips, e.sips | 0);
    if (sips <= 0) return null;
    const out = { kind: e.kind, sips, name: String(e.name || '').slice(0, 40) };
    if (e.kind === 'food' && e.ramen) out.ramen = true; // a Han River ramen bowl stays one
    if (e.kind === 'food' && ['icecream', 'churro', 'hotdog'].includes(e.snack)) out.snack = e.snack; // Modu Land's snacks (held.js SNACKS)
    return out;
  }
  return null;
}

export class Bag {
  constructor(storage = globalThis.localStorage, opts = {}) {
    this.storage = storage;
    this.opts = opts;
    let raw = null;
    try { raw = JSON.parse(storage?.getItem(BAG_KEY) || 'null'); } catch { /* broken save */ }
    const cap = Number.isFinite(raw?.cap) ? raw.cap | 0 : BASE_CAP;
    this.cap = Math.max(BASE_CAP, Math.min(MAX_CAP, cap));
    this.items = (Array.isArray(raw?.items) ? raw.items : []).map((e) => cleanEntry(e, opts)).filter((e) => e && !isCosmetic(e))
      .filter((e, i, all) => e.kind !== 'book' || all.findIndex((x) => x.kind === 'book') === i) // one library book at most (old saves had a pile)
      .filter(((n, d) => (e) => (isDish(e) ? roomFor(d, e) && !!d.set(dishSlot(e), (d.get(dishSlot(e)) || 0) + 1) : ++n <= this.cap))(0, new Map())); // (slots and food bag each up to their size)
    // (old saves kept perfume in a slot: it moves to the wardrobe)
    const old = (Array.isArray(raw?.items) ? raw.items : []).map((e) => cleanEntry(e, opts)).filter(isCosmetic);
    this.vanity = [...old, ...(Array.isArray(raw?.vanity) ? raw.vanity : []).map((e) => cleanEntry(e, opts)).filter(isCosmetic)].slice(0, VANITY_MAX);
    this.listeners = [];
  }

  // Things in the slots (dishes are in the food bag, not counted).
  get size() { return this.items.filter((e) => !isDish(e)).length; }
  get full() { return this.size >= this.cap; }
  get dishes() { return this.items.filter(isDish).length; }
  // How many of each dish kind (the food bag's slots, in bag order).
  dishCounts() { const n = new Map(); for (const e of this.items) if (isDish(e)) n.set(dishSlot(e), (n.get(dishSlot(e)) || 0) + 1); return n; }
  get dishFull() { return this.dishCounts().size >= DISH_CAP; }
  // Is there no room for this entry (a dish: its food-bag slot; anything else: the slots)?
  fullFor(e) { return isDish(e) ? !roomFor(this.dishCounts(), e) : !isCosmetic(e) && this.full; }
  // { n, cap } of the part of the bag this entry goes in.
  slotsFor(e) { return isDish(e) ? { n: this.dishCounts().size, cap: DISH_CAP } : { n: this.size, cap: this.cap }; }
  list() { return this.items.slice(); }
  has(kind) { return this.items.some((e) => e.kind === kind); }
  onChange(fn) { this.listeners.push(fn); }

  // Put something in. Returns false when the bag is full or it isn't an
  // item the bag can hold.
  add(entry) {
    const e = cleanEntry(entry, this.opts);
    if (e && isCosmetic(e)) return this.addVanity(e);
    if (!e || this.fullFor(e)) return false;
    if (e.kind === 'umbrella' && this.has('umbrella')) return false; // one is enough
    if (e.kind === 'book' && this.has('book')) return false; // one library book out at a time
    this.items.push(e);
    this._save();
    return true;
  }

  // Take the entry at slot i out (null if empty).
  take(i) {
    if (!(i >= 0 && i < this.items.length)) return null;
    const [e] = this.items.splice(i, 1);
    this._save();
    return e;
  }

  // Take out every entry of one kind (e.g. library books going back to the
  // shelf). Returns how many were removed.
  removeKind(kind) {
    const n = this.items.length;
    this.items = this.items.filter((e) => e.kind !== kind);
    if (this.items.length !== n) this._save();
    return n - this.items.length;
  }

  // Swap slot i for another entry (take something out, put the held thing
  // in its place). Returns what was in the slot.
  swap(i, entry) {
    const e = cleanEntry(entry, this.opts);
    if (!e || !(i >= 0 && i < this.items.length)) return null;
    if (isCosmetic(e)) { // (it goes to the wardrobe; the slot's thing comes out)
      if (this.vanity.length >= VANITY_MAX) return null;
      this.vanity.push(e);
      return this.take(i);
    }
    const old = this.items[i];
    if (isDish(old) || isDish(e)) { // (a dish in or out: only if its part of the bag has room once the old one is out)
      this.items.splice(i, 1);
      if (this.fullFor(e)) { this.items.splice(i, 0, old); return null; }
      this.items.splice(i, 0, e);
      this._save();
      return old;
    }
    this.items[i] = e;
    this._save();
    return old;
  }

  // The wardrobe's perfume and lipsticks.
  vanityList() { return this.vanity.slice(); }
  addVanity(entry) {
    const e = cleanEntry(entry, this.opts);
    if (!isCosmetic(e) || this.vanity.length >= VANITY_MAX) return false;
    this.vanity.push(e);
    this._save();
    return true;
  }
  // Replace wardrobe entry i (after a use), or take it out with null.
  // Returns what was there.
  setVanity(i, entry) {
    if (!(i >= 0 && i < this.vanity.length)) return null;
    const old = this.vanity[i];
    const e = entry && cleanEntry(entry, this.opts);
    if (isCosmetic(e)) this.vanity[i] = e;
    else this.vanity.splice(i, 1);
    this._save();
    return old;
  }

  // More slots (later: a bigger bag). Returns the new size.
  expand(n) {
    this.cap = Math.max(BASE_CAP, Math.min(MAX_CAP, this.cap + (n | 0)));
    this._save();
    return this.cap;
  }

  _save() {
    try { this.storage?.setItem(BAG_KEY, JSON.stringify({ cap: this.cap, items: this.items, vanity: this.vanity })); } catch { /* storage blocked */ }
    for (const fn of this.listeners) fn(this);
  }
}
