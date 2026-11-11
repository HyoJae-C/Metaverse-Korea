// The bag: things you carry around but don't hold in your hand (a book, a
// takeaway drink, the umbrella). It has a fixed number of slots (20 to start);
// `expand` adds more later (e.g. a bigger bag from a shop).
//
// Entries are small plain objects:
//   { kind: 'book', book: '<id>' }
//   { kind: 'coffee' | 'glass' | 'food', sips: 1-5, name: '<drink name>' }
//   { kind: 'umbrella' }
//   { kind: 'duckmold' } (the snow duck maker, given when it first snows)
//   { kind: 'perfume', p: '<perfume id>', sips: 1-5 (sprays left), name }
//   { kind: 'lipstick', c: '<lip shade>', sips: 1-5 (uses left) } (core/lipstick.js)
//   { kind: 'gift', name, icon, g?: 'kimchi', q?: 0-100 } (a shop bag, or homemade kimchi)

import { lipstickEntry } from './lipstick.js';

export const BAG_KEY = 'mk.bag';
export const BASE_CAP = 20;
export const MAX_CAP = 60;
// Perfume and lipstick live in the wardrobe, not in the bag's slots: kept
// apart in `vanity` (up to VANITY_MAX), saved with the bag.
export const COSMETICS = ['perfume', 'lipstick'];
export const VANITY_MAX = 60;
export const isCosmetic = (e) => COSMETICS.includes(e?.kind);

// A carried thing (kind 'gift'). Homemade goods also keep what they are
// (g, e.g. 'kimchi') and how well they were made (q, 0-100), so they can be
// sold at the market (core/kimchi-market.js).
export function giftEntry(e) {
  const out = { kind: 'gift', sips: 1, name: String(e.name || '').slice(0, 40), icon: String(e.icon || '🛍️').slice(0, 4) };
  if (typeof e.g === 'string' && /^[a-z]{1,16}$/.test(e.g)) {
    out.g = e.g;
    if (Number.isFinite(e.q)) out.q = Math.max(0, Math.min(100, Math.round(e.q)));
  }
  return out;
}

// Keep only entries the game understands. isBook(id) tells whether a book id
// still exists in the library.
export function cleanEntry(e, { isBook = () => true, maxSips = 5, isPerfume = () => true, maxSprays = 5 } = {}) {
  if (!e || typeof e !== 'object') return null;
  if (e.kind === 'umbrella') return { kind: 'umbrella' };
  if (e.kind === 'duckmold') return { kind: 'duckmold' };
  if (e.kind === 'book') return typeof e.book === 'string' && isBook(e.book) ? { kind: 'book', book: e.book } : null;
  if (e.kind === 'perfume') {
    const sips = Math.min(maxSprays, e.sips | 0);
    return sips > 0 && typeof e.p === 'string' && isPerfume(e.p) ? { kind: 'perfume', p: e.p, sips, name: String(e.name || '').slice(0, 60) } : null;
  }
  if (e.kind === 'lipstick') return lipstickEntry(e);
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
      .slice(0, this.cap);
    // (old saves kept perfume in a slot: it moves to the wardrobe)
    const old = (Array.isArray(raw?.items) ? raw.items : []).map((e) => cleanEntry(e, opts)).filter(isCosmetic);
    this.vanity = [...old, ...(Array.isArray(raw?.vanity) ? raw.vanity : []).map((e) => cleanEntry(e, opts)).filter(isCosmetic)].slice(0, VANITY_MAX);
    this.listeners = [];
  }

  get size() { return this.items.length; }
  get full() { return this.items.length >= this.cap; }
  list() { return this.items.slice(); }
  has(kind) { return this.items.some((e) => e.kind === kind); }
  onChange(fn) { this.listeners.push(fn); }

  // Put something in. Returns false when the bag is full or it isn't an
  // item the bag can hold.
  add(entry) {
    const e = cleanEntry(entry, this.opts);
    if (e && isCosmetic(e)) return this.addVanity(e);
    if (!e || this.full) return false;
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
