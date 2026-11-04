// The bag: things you carry around but don't hold in your hand (a book, a
// takeaway drink, the umbrella). It has a fixed number of slots (20 to start);
// `expand` adds more later (e.g. a bigger bag from a shop).
//
// Entries are small plain objects:
//   { kind: 'book', book: '<id>' }
//   { kind: 'coffee' | 'glass' | 'food', sips: 1-5, name: '<drink name>' }
//   { kind: 'umbrella' }
//   { kind: 'perfume', p: '<perfume id>', sips: 1-5 (sprays left), name }

export const BAG_KEY = 'mk.bag';
export const BASE_CAP = 20;
export const MAX_CAP = 60;

// Keep only entries the game understands. isBook(id) tells whether a book id
// still exists in the library.
export function cleanEntry(e, { isBook = () => true, maxSips = 5, isPerfume = () => true, maxSprays = 5 } = {}) {
  if (!e || typeof e !== 'object') return null;
  if (e.kind === 'umbrella') return { kind: 'umbrella' };
  if (e.kind === 'book') return typeof e.book === 'string' && isBook(e.book) ? { kind: 'book', book: e.book } : null;
  if (e.kind === 'perfume') {
    const sips = Math.min(maxSprays, e.sips | 0);
    return sips > 0 && typeof e.p === 'string' && isPerfume(e.p) ? { kind: 'perfume', p: e.p, sips, name: String(e.name || '').slice(0, 60) } : null;
  }
  if (e.kind === 'gift') return { kind: 'gift', sips: 1, name: String(e.name || '').slice(0, 40), icon: String(e.icon || '🛍️').slice(0, 4) }; // a shop purchase
  if (e.kind === 'coffee' || e.kind === 'food' || e.kind === 'glass') {
    const sips = Math.min(maxSips, e.sips | 0);
    return sips > 0 ? { kind: e.kind, sips, name: String(e.name || '').slice(0, 40) } : null;
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
    this.items = (Array.isArray(raw?.items) ? raw.items : []).map((e) => cleanEntry(e, opts)).filter(Boolean).slice(0, this.cap);
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
    if (!e || this.full) return false;
    if (e.kind === 'umbrella' && this.has('umbrella')) return false; // one is enough
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

  // Swap slot i for another entry (take something out, put the held thing
  // in its place). Returns what was in the slot.
  swap(i, entry) {
    const e = cleanEntry(entry, this.opts);
    if (!e || !(i >= 0 && i < this.items.length)) return null;
    const old = this.items[i];
    this.items[i] = e;
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
    try { this.storage?.setItem(BAG_KEY, JSON.stringify({ cap: this.cap, items: this.items })); } catch { /* storage blocked */ }
    for (const fn of this.listeners) fn(this);
  }
}
