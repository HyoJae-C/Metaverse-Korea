// Fishing places: some fish in the journal only bite at one place. At
// Mangwon Fishing Pier (the park store with "fishPlace": "mangwon") a share
// of bites are Mangwon fish; the rest are the usual Han River catch, rolled
// exactly as at Ttukseom (core/fishing.js). Ttukseom is unchanged.
//
// Some usual kinds never bite at a place (`noBite`): the blue whale lives
// only in the Ttukseom Han River catch, so at Mangwon a bite that would have
// been a whale is rolled again among the other usual fish.
//
// Place fish stay "released": false in FISH, so the usual odds, the lucky
// spot and the "available collection" count don't change; the journal shows
// them as found only at their place.
import { fishById, rollCatch, rollAutoCatch, isRare, AVAILABLE_FISH, luckyChance } from './fishing.js';
import { pendingCatch } from './fish-luck.js';

export const FISH_PLACES = {
  mangwon: {
    name: { ko: '망원', en: 'Mangwon', ja: '望遠', zh: '望远' },
    // ★1 shrimp, wakame · ★2 rockfish, webfoot octopus · ★3 cuttlefish,
    // seahorse · ★5 giant squid (the legend of the pier: about 1 in 500 bites)
    kinds: ['shrimp', 'wakame', 'rockfish', 'webfoot-octopus', 'cuttlefish', 'seahorse', 'giant-squid'],
    share: 0.2, // a fifth of the bites (hand fishing) are Mangwon fish
    noBite: ['whale'], // the blue whale only bites at Ttukseom
  },
};
// Within a place's own fish, how often each rarity bites (per kind).
const LOCAL_WEIGHT = [0, 1, 0.4, 0.15, 0.08, 0.03];
const localWeight = (f) => LOCAL_WEIGHT[f.rarity] ?? 0.05;

export const placeFish = (place) => (FISH_PLACES[place]?.kinds || []).map(fishById).filter(Boolean);
// The place a fish only bites at, or null.
export const fishPlaceOf = (id) => Object.keys(FISH_PLACES).find((k) => FISH_PLACES[k].kinds.includes(id)) || null;
export const PLACE_FISH_IDS = new Set(Object.values(FISH_PLACES).flatMap((p) => p.kinds));
// Fish you can catch somewhere now: released ones and place fish.
export const catchable = (f) => f.released || PLACE_FISH_IDS.has(f.id);

// True when the usual kind `f` never bites at `place`.
export const noBiteAt = (place, f) => !!FISH_PLACES[place]?.noBite?.includes(f.id);
// A usual (released) kind's chance at `place`, in % of fish like f.chance
// (before the place's own share): kinds that never bite there drop out and
// the rest grow to fill their part.
export function usualChance(f, place, lucky = false) {
  const w = (q) => (lucky ? luckyChance(q) : q.chance);
  if (!f.released || noBiteAt(place, f)) return 0;
  const left = AVAILABLE_FISH.filter((q) => !noBiteAt(place, q)).reduce((a, q) => a + w(q), 0);
  return w(f) / left * 100;
}

function pick(list, weight, r) {
  const total = list.reduce((a, f) => a + weight(f), 0);
  let x = r * total;
  for (const f of list) { x -= weight(f); if (x < 0) return f; }
  return list.at(-1);
}

// A place fish's chance in % of hand-fishing bites at its place.
export function placeChance(f, place = fishPlaceOf(f.id)) {
  const p = FISH_PLACES[place], list = placeFish(place);
  if (!p || !list.includes(f)) return 0;
  return p.share * localWeight(f) / list.reduce((a, q) => a + localWeight(q), 0) * 100;
}

// A bite while fishing by hand at `place` (null: anywhere else).
export function rollPlaceCatch(place, rand = Math.random, lucky = false) {
  const p = FISH_PLACES[place], list = placeFish(place);
  if (p && list.length && !pendingCatch() && rand() < p.share) return pick(list, localWeight, rand());
  const f = rollCatch(rand, lucky);
  // A kind that never bites here: another usual fish instead (the old boot
  // keeps its odds; a developer code's fish still comes).
  if (p && !f.trash && !f.sure && noBiteAt(place, f)) {
    return pick(AVAILABLE_FISH.filter((q) => !noBiteAt(place, q)), (q) => usualChance(q, place, lucky), rand());
  }
  return f;
}

// Auto fishing at `place`: the place's common (★1–★2) fish come in too.
export function rollPlaceAuto(place, rand = Math.random) {
  const p = FISH_PLACES[place], list = placeFish(place).filter((f) => !isRare(f));
  if (p && list.length && rand() < p.share) return pick(list, localWeight, rand());
  return rollAutoCatch(rand);
}
