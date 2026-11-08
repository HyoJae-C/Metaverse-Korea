// Stamp book (스탬프 노트): which tour stamps you have and the day you got
// each. Saved under mk.stamps, so it follows you to other devices.
export const STAMP_REWARD = 20000; // 🪙 for each new stamp; no prize for a full book (places keep being added)
export const STAMP_NEAR = 1.6; // metres from the stand to use it

// The stamps that exist on this map: a stand beside a shop needs that shop.
export function availableStamps(stamps, hasStore) {
  return stamps.filter((s) => (s.place?.store ? hasStore(s.place.store) : Array.isArray(s.place?.at)));
}

const KEY = 'mk.stamps';
const today = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class StampBook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.got = {};
    for (const [k, v] of Object.entries(raw || {})) if (typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v)) this.got[k] = v;
  }
  has(id) { return !!this.got[id]; }
  date(id) { return this.got[id] || null; }
  // How many of these stamps you have (stamps for removed places don't count).
  count(stamps) { return stamps.filter((s) => this.got[s.id]).length; }
  // Stamp it; true the first time (that's when the coins are paid).
  stamp(id, now = Date.now()) {
    if (!id || this.got[id]) return false;
    this.got[id] = today(now);
    try { this.storage?.setItem(KEY, JSON.stringify(this.got)); } catch { /* storage blocked */ }
    return true;
  }
}
