// The farmer's journal (농부 일지) in the notebook: a stamp for every kind
// of crop you harvested yourself at the weekend farm (game/farm.js), with
// how many, and a gold mark once you brought one in fresh (watered every
// day). Saved on this device under "mk.", so the cloud save carries it.
// Small on purpose: this is in the first download (the notebook's button
// shows the count); the page itself is ui/farm-journal-ui.js.
const KEY = 'mk.farmlog';

export class FarmJournal {
  // kinds: the crop ids there are (core/farm.js CROPS, or the server's).
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.c = {}; // id → [harvested, of them fresh]
    let raw = null;
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    for (const [id, v] of Object.entries(raw || {})) {
      const n = Math.floor(Number(v?.[0]) || 0), f = Math.floor(Number(v?.[1]) || 0);
      if (/^[a-z]{2,20}$/.test(id) && n > 0) this.c[id] = [n, Math.max(0, Math.min(n, f))];
    }
  }
  count(id) { return this.c[id]?.[0] || 0; }
  fresh(id) { return this.c[id]?.[1] || 0; }
  has(id) { return !!this.c[id]; }
  get kinds() { return Object.keys(this.c).length; }
  get total() { return Object.values(this.c).reduce((a, v) => a + v[0], 0); }
  // A harvest; returns true the first time this kind is harvested.
  add(id, fresh = false) {
    if (!/^[a-z]{2,20}$/.test(String(id))) return false;
    const isNew = !this.c[id];
    const [n, f] = this.c[id] || [0, 0];
    this.c[id] = [n + 1, f + (fresh ? 1 : 0)];
    try { this.storage?.setItem(KEY, JSON.stringify(this.c)); } catch { /* storage blocked */ }
    return isNew;
  }
}
