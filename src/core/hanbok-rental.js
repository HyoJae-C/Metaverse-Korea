// Renting a hanbok: it is worn for a few hours of real time, then your own
// clothes come back by themselves, even if the page was closed meanwhile.
// Saved on this device ('mk.hanbok', synced like other mk.* keys):
//   { id, until, prev }  id: the set (data/hanbok.js); until: end time (ms);
//   prev: what the hanbok replaced on your look ({ model, skirt }).
// Pure functions on plain looks, so they can be tested without a browser.
import { hanbokById, isHanbokModel, RENT_HOURS } from '../data/hanbok.js';
import { CHIMAS } from '../data/skirts.js';

export const RENT_KEY = 'mk.hanbok';
export const RENT_MS = RENT_HOURS * 3600 * 1000;
const PARTS = ['model', 'skirt', 'tee']; // what a hanbok changes on a look
const isChima = (id) => typeof id === 'string' && Object.hasOwn(CHIMAS, id);

export function loadRental(storage = globalThis.localStorage) {
  try {
    const r = JSON.parse(storage?.getItem(RENT_KEY) || 'null');
    if (!r || !hanbokById(r.id) || !Number.isFinite(r.until) || typeof r.prev !== 'object' || !r.prev) return null;
    const prev = {};
    for (const k of PARTS) prev[k] = typeof r.prev[k] === 'string' && !isHanbokModel(r.prev[k]) && !isChima(r.prev[k]) ? r.prev[k] : null;
    return { id: r.id, until: r.until, prev };
  } catch { return null; }
}
export function saveRental(rental, storage = globalThis.localStorage) {
  try {
    if (rental) storage?.setItem(RENT_KEY, JSON.stringify(rental));
    else storage?.removeItem(RENT_KEY);
  } catch { /* storage blocked */ }
}

// Rent a set: returns the new look and the rental. Renting another set while
// one is on keeps the clothes you had before the first one.
export function startRental(look, id, now = Date.now(), current = null) {
  const set = hanbokById(id);
  if (!set) return null;
  const prev = current?.prev || Object.fromEntries(PARTS.map((k) => [k, look[k] ?? null]));
  return { look: { ...look, ...set.wear }, rental: { id, until: now + RENT_MS, prev } };
}

// Your clothes back: each part the hanbok still has on goes back to what it
// was. Parts you changed yourself meanwhile are left as they are.
export function endRental(look, rental) {
  const out = { ...look };
  const wear = hanbokById(rental?.id)?.wear || {};
  for (const k of PARTS) {
    const v = out[k] ?? null;
    const hanbok = k === 'model' ? isHanbokModel(v) : k === 'skirt' ? isChima(v) : false;
    if (!hanbok && !(k in wear && v === wear[k])) continue; // changed it yourself
    const back = rental?.prev?.[k] ?? null;
    if (k === 'model') out.model = back || 'basic';
    else if (back) out[k] = back;
    else delete out[k];
  }
  return out;
}

export const isExpired = (rental, now = Date.now()) => !!rental && now >= rental.until;
export const timeLeft = (rental, now = Date.now()) => (rental ? Math.max(0, rental.until - now) : 0);
// Still wearing any part of the hanbok?
export const wearingHanbok = (look) => isHanbokModel(look?.model) || isChima(look?.skirt);
export const isRenting = (rental, id, now = Date.now()) => !!rental && rental.id === id && !isExpired(rental, now);

// "1:42" (hours:minutes), or "12m" under an hour.
export function formatLeft(ms) {
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

// What the look should be now: expired (or a hanbok on with no rental, e.g.
// a look copied from another device) -> your own clothes back.
// Returns { look, rental, ended } (ended: the hanbok just came off).
export function checkRental(look, rental, now = Date.now()) {
  if (rental && isExpired(rental, now)) return { look: endRental(look, rental), rental: null, ended: wearingHanbok(look) };
  if (!rental && wearingHanbok(look)) return { look: endRental(look, null), rental: null, ended: true };
  if (rental && !wearingHanbok(look)) return { look, rental: null, ended: false }; // changed out of it already
  return { look, rental, ended: false };
}
