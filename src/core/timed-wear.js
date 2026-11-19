// Limited-time clothes (an item's `secs` in data/wearables.js): gone that
// many seconds after you buy them, for seasonal sales (Halloween, Christmas).
// The end time of each is saved on this device ('mk.timed', synced like the
// other mk.* keys): { itemId: end time in ms }. Pure functions, tested
// without a browser.
export const TIMED_KEY = 'mk.timed';
const DAY = 24 * 3600 * 1000;

export function loadTimed(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage?.getItem(TIMED_KEY) || '{}');
    return Object.fromEntries(Object.entries(raw && typeof raw === 'object' ? raw : {}).filter(([, v]) => Number.isFinite(v)));
  } catch { return {}; }
}
export function saveTimed(map, storage = globalThis.localStorage) {
  try { storage?.setItem(TIMED_KEY, JSON.stringify(map)); } catch { /* storage blocked */ }
}
// Bought now: ends `secs` seconds from now.
export const startTimed = (map, id, secs, now = Date.now()) => ({ ...map, [id]: now + secs * 1000 });
// Owned limited items whose time is up. An owned limited item with no end
// time (its record lost) gets one now, counted from today.
export function dueTimed(map, owned, items, now = Date.now()) {
  let out = map;
  const gone = [];
  for (const id of owned) {
    const secs = items[id]?.secs;
    if (!secs) continue;
    if (!Number.isFinite(out[id])) out = startTimed(out, id, secs, now);
    else if (now >= out[id]) gone.push(id);
  }
  for (const id of Object.keys(out)) if (gone.includes(id) || !owned.includes(id)) { out = { ...out }; delete out[id]; }
  return { map: out, gone };
}
// Whole days left (rounded up), 0 when none.
export const daysLeft = (map, id, now = Date.now()) => (Number.isFinite(map[id]) ? Math.max(0, Math.ceil((map[id] - now) / DAY)) : 0);
