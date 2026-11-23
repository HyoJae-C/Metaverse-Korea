// How big a home is (Forest Lane Apartments): level 1 (the old Sunny Villa
// size) is where a new player starts; players from before levels existed
// keep the home they had, level 2 (Yozi 2026-11-17). Saving up game money
// makes it bigger (game/home-grow.js).
// The room grows to the back and both sides; the door wall stays where it is
// (core/home-grow.js moves the furniture with the walls).
//
// Furniture can need a bigger home: a piece with needsHomeLevel: n can only
// be placed from level n (the big fish tanks).
//
// The server keeps the receipts (supabase/053_home_levels.sql, coin_ledger
// kind 'home', note 'home:<level>'); keep the prices here and in
// home_level_settings the same.
export const HOME_LEVELS = [
  { level: 1, w: 9, d: 8, h: 3.6, price: 0, people: 3 },
  { level: 2, w: 14, d: 11, h: 4, price: 1000000, people: 5 },
  { level: 3, w: 18, d: 13, h: 4, price: 2500000, people: 7 },
  { level: 4, w: 22, d: 15, h: 4.2, price: 8000000, people: 7 },
];
export const HOME_LEVEL_KEY = 'mk.homeLevel'; // (an mk.* key: rides in the account save)
export const MAX_HOME_LEVEL = HOME_LEVELS.length;
export const homeLevelOf = (n) => HOME_LEVELS[Math.min(MAX_HOME_LEVEL, Math.max(1, Math.floor(Number(n)) || 1)) - 1];
export const nextHomeLevel = (n) => HOME_LEVELS[homeLevelOf(n).level] || null;
// How many people fit in a home at this level for a visit, host included
// (game/home-visits.js; Yozi 2026-11-23: 3 / 5 / 7, level 4 stays at 7).
export const homePeople = (n) => homeLevelOf(n).people;
// The room's size for a home store at this level (core/interior.js roomOf).
export const homeRoom = (n) => { const l = homeLevelOf(n); return { w: l.w, d: l.d, h: l.h }; };
// The level this browser knows. Not set yet: a home already decorated here
// (from before levels) is level 2, otherwise 1. The server's answer
// (home_level_info) wins when there is one.
export const OLD_HOME_LEVEL = 2;
export function readHomeLevel(storage = globalThis.localStorage) {
  try {
    const v = storage.getItem(HOME_LEVEL_KEY);
    if (v != null) return homeLevelOf(v).level;
    return ['mk.home.forest-lane-apt', 'mk.home.sunny-villa'].some((k) => storage.getItem(k) != null) ? OLD_HOME_LEVEL : 1;
  } catch { return 1; }
}
export function writeHomeLevel(n, storage = globalThis.localStorage) {
  try { storage.setItem(HOME_LEVEL_KEY, String(homeLevelOf(n).level)); } catch { /* storage blocked */ }
}
// May this piece go in a home at this level?
export const fitsHome = (def, level) => !(def?.needsHomeLevel > level);
