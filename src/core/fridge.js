// What's kept in my fridge at home (Yozi 2026-11-22: put a coffee in the
// fridge for later). Drinks, takeout food and cooked dishes move between the
// bag (or my hand) and the fridge: each entry is moved as it is, sips, medal
// and upgrade level included, so nothing is ever made here and nothing is
// lost. Kept in mk.fridge (it rides in the cloud save), apart from the room
// layout, so a fridge put away keeps what's in it. Pure logic: no three.js.
import { cleanEntry, isDish } from './bag.js';
import { FRIDGE_MAX } from './appliances.js';

export { FRIDGE_MAX };
const KEY = 'mk.fridge';
// What can go in: drinks, food and dishes (not books, perfume or umbrellas).
export const fridgeable = (e) => !!e && (['coffee', 'glass', 'food'].includes(e.kind) || isDish(e));

export class FridgeStore {
  // opts: the bag's own cleaning rules (core/bag.js cleanEntry).
  constructor(storage = globalThis.localStorage, opts = {}) {
    this.storage = storage;
    this.opts = opts;
    let raw = [];
    try { raw = JSON.parse(storage?.getItem(KEY) || '[]'); } catch { /* broken save */ }
    this.items = (Array.isArray(raw) ? raw : []).map((e) => cleanEntry(e, opts)).filter(fridgeable).slice(0, FRIDGE_MAX);
  }
  list() { return this.items.slice(); }
  get full() { return this.items.length >= FRIDGE_MAX; }
  // Bag slot i → fridge. Returns null when done, or why not: 'full', 'kind', 'none'.
  putFromBag(bag, i) {
    const e = bag.list()[i];
    if (!e) return 'none';
    if (!fridgeable(e)) return 'kind';
    if (this.full) return 'full';
    const out = bag.take(i);
    if (!out) return 'none';
    this.items.push(out);
    this._save();
    return null;
  }
  // The thing in my hand → fridge (hand: { held, setHeld }).
  putFromHand(hand) {
    const e = hand.held;
    if (!e) return 'none';
    if (!fridgeable(e)) return 'kind';
    if (this.full) return 'full';
    const clean = cleanEntry(e, this.opts);
    if (!clean) return 'kind';
    this.items.push(clean);
    hand.setHeld(null);
    this._save();
    return null;
  }
  // Fridge entry i → bag. Returns null when done, or 'bagFull' / 'none'.
  take(bag, i) {
    const e = this.items[i];
    if (!e) return 'none';
    if (!bag.add(e)) return 'bagFull';
    this.items.splice(i, 1);
    this._save();
    return null;
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.items)); } catch { /* storage blocked */ } }
}
