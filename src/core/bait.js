// Fishing bait (미끼): bought in packs of five at the bait stall by each Han
// River park's fish buyer, carried in the bag, and put on the hook from the
// hand (like spraying perfume). Each bite then uses one, and while it lasts
// the rarer fish bite more often.
//
// The plain bait is free and endless (the odds in core/fishing.js). A bait
// sets how often ★3 and up bite in all (`rare`, % of fish) and how much of
// that is the park's ★5 legend (`legend`); the rest of `rare` is shared by ★3
// and ★4 as it is today, ★2 keeps its share and ★1 gives up the difference.
// It doesn't change the old boot, the escapes, auto fishing (never a rare
// fish) or the legend pity. (Yozi 2026-11-12: four kinds counting the plain
// one, five a pack, one pack of each a day, reset at 00:00 KST.)
//
// The prices and the daily limit are also kept on the server
// (supabase/042_fish_bait.sql, bait_settings), which wins when online.
export const BAIT_PACK = 5;
export const BAIT_DAILY = 1; // packs of each kind a day (Korean day)
export const BAITS = [
  { id: 'mid', rare: 4, legend: 0.1, price: 2500, color: '#c98b4f' },
  { id: 'high', rare: 6, legend: 0.2, price: 7500, color: '#5fb0de' },
  { id: 'top', rare: 9, legend: 1, price: 15000, color: '#e2b53c' },
];
export const baitById = (id) => BAITS.find((b) => b.id === id) || null;

// A bag or hand entry: { kind: 'bait', b: '<bait id>', sips: 1-5 (left) }.
export function baitEntry(e) {
  const b = baitById(e?.b), sips = Math.min(BAIT_PACK, e?.sips | 0);
  return b && sips > 0 ? { kind: 'bait', b: b.id, sips } : null;
}

// The bait on the hook now (mk.baiton: { b, n }), saved on this device and
// in the cloud save.
const HOOK_KEY = 'mk.baiton';
export class BaitHook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = null;
    try { raw = JSON.parse(storage?.getItem(HOOK_KEY) || 'null'); } catch { /* broken save */ }
    const e = baitEntry({ b: raw?.b, sips: raw?.n });
    this.b = e?.b || null;
    this.n = e?.sips || 0;
  }
  get bait() { return this.n > 0 ? baitById(this.b) : null; }
  get left() { return this.bait ? this.n : 0; }
  // Put a bait on (an entry); returns what was on before, as an entry (or null).
  put(entry) {
    const e = baitEntry(entry);
    if (!e) return null;
    const old = this.bait ? { kind: 'bait', b: this.b, sips: this.n } : null;
    this.b = e.b; this.n = e.sips;
    this._save();
    return old;
  }
  // One bite: uses one bait. Returns the bait used (null: the plain one).
  use() {
    const b = this.bait;
    if (!b) return null;
    this.n -= 1;
    if (this.n <= 0) { this.b = null; this.n = 0; }
    this._save();
    return b;
  }
  _save() {
    try {
      if (this.n > 0) this.storage?.setItem(HOOK_KEY, JSON.stringify({ b: this.b, n: this.n }));
      else this.storage?.removeItem(HOOK_KEY);
    } catch { /* storage blocked */ }
  }
}

// The Korean day (YYYY-MM-DD) a time falls on: the daily limit turns over at 00:00 KST.
export const kstDay = (now = Date.now()) => new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
