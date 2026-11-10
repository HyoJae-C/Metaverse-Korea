// Stamp book (스탬프 노트): which tour stamps you have and the day you got
// each. Saved under mk.stamps, so it follows you to other devices.
export const STAMP_REWARD = 10000; // 🪙 for each new stamp; no prize for a full book (places keep being added)
export const STAMP_NEAR = 1.6; // metres from the stand to use it

// The stamps that exist on this map: a stand beside a shop needs that shop.
// The stamp note goes district by district (구별, Yozi 2026-11-11), so a page
// holds one neighbourhood: from Seongsu out over the old city, west along
// Mapo, the south bank, then the south-east. Within a district, the order in
// data/stamps.js. A district not listed here goes at the end: add it.
export const STAMP_GU_ORDER = ['성동구', '광진구', '종로구', '중구', '용산구', '마포구', '서대문구', '영등포구', '동작구', '서초구', '강남구', '송파구'];
const guRank = (s) => { const i = STAMP_GU_ORDER.indexOf(s.gu?.ko); return i < 0 ? STAMP_GU_ORDER.length : i; };
export const byGu = (stamps) => stamps.map((s, i) => [s, i]).sort((a, b) => guRank(a[0]) - guRank(b[0]) || a[1] - b[1]).map(([s]) => s);

export function availableStamps(stamps, hasStore) {
  return byGu(stamps.filter((s) => (s.place?.store ? hasStore(s.place.store) : Array.isArray(s.place?.at))));
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
