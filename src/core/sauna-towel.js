// The jjimjilbang's sheep towel (양머리 수건) is the house's: you can sneak
// out wearing it for a while, but one game day (3 h real time, core/weather.js
// cycle) after you walk out, the jjimjilbang takes it back (Yozi 2026-11-15).
// It is a look (head: 'towel'), not a bag item, so no server receipt.
// Saved on this device ('mk.towel', synced like other mk.* keys):
//   { prev, out }  prev: the hat the towel replaced (or null);
//                  out: when you walked out wearing it (ms), null while inside.
// Pure functions on plain looks, so they can be tested without a browser.

export const TOWEL_KEY = 'mk.towel';
export const TOWEL = 'towel';
export const TOWEL_OUT_MS = 3 * 3600 * 1000; // one game day

export function loadTowel(storage = globalThis.localStorage) {
  try {
    const r = JSON.parse(storage?.getItem(TOWEL_KEY) || 'null');
    if (!r || typeof r !== 'object') return null;
    return { prev: typeof r.prev === 'string' && r.prev !== TOWEL ? r.prev : null, out: Number.isFinite(r.out) ? r.out : null };
  } catch { return null; }
}
export function saveTowel(rec, storage = globalThis.localStorage) {
  try {
    if (rec) storage?.setItem(TOWEL_KEY, JSON.stringify(rec));
    else storage?.removeItem(TOWEL_KEY);
  } catch { /* storage blocked */ }
}

// The towel button: put it on (remembering your hat) or take it off (the
// hat comes back).
export function toggleTowel(look, rec) {
  if (look.head === TOWEL) return { look: withHead(look, rec?.prev), rec: null };
  return { look: { ...look, head: TOWEL }, rec: { prev: look.head || null, out: null } };
}

// Where you are and the time: is the towel taken back?
//   inSauna: standing in a jjimjilbang (the clock stops, it's back home).
// Returns { look, rec, taken } (look/rec are the same objects if unchanged).
export function checkTowel(look, rec, inSauna, now = Date.now()) {
  if (look.head !== TOWEL) return { look, rec: null, taken: false };
  if (inSauna) return { look, rec: rec?.out == null && rec ? rec : { prev: rec?.prev ?? null, out: null }, taken: false };
  if (rec?.out == null) return { look, rec: { prev: rec?.prev ?? null, out: now }, taken: false }; // just walked out (or worn from before this rule)
  if (now - rec.out < TOWEL_OUT_MS) return { look, rec, taken: false };
  return { look: withHead(look, rec.prev), rec: null, taken: true };
}

function withHead(look, head) {
  const out = { ...look };
  if (head) out.head = head;
  else delete out.head;
  return out;
}
