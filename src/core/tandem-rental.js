// Renting a tandem bike at Seoul Forest: the rules, as plain functions so
// they can be tested without a browser (game/tandem-rental*.js use them).
//
// A metered rental: the base fare is paid when you take the bike and covers
// the first minutes; after that the meter keeps running per minute, and the
// rest is paid when the bike goes back: getting off, the meter reaching what
// you can pay, or the page closing (then it is settled the next time the game
// opens, up to the last moment you were seen riding). Saved on this device
// ('mktandem.rent', on this device only): { start, seen } in ms.
//
// Only inside Seoul Forest: its park areas on the map, plus a margin so the
// roads between its pieces (Ttukseom-ro, Gosanja-ro) can be crossed.

export const RENT_KEY = 'mktandem.rent'; // not "mk.": stays on this device, out of the cloud save (a copy coming back from it would be settled twice)
export const BASE = 3000; // won: taking the bike, the first BASE_MIN minutes included
export const BASE_MIN = 30; // (generous on purpose: Yozi 2026-11-12)
export const PER_MIN = 100; // won for each minute (started) after that
export const SEEN_EVERY = 10000; // ms between saves of `seen` while riding
export const TOGETHER = 3000; // won, once ever: riding it with someone else
export const FOREST_BOX = [-650, -260, -200, 200]; // [x0, z0, x1, z1]: where Seoul Forest's park areas are
export const FOREST_MARGIN = 14; // m past a park area's edge: the roads between its pieces

// What a ride of `ms` costs in all, base fare included.
export function rentCost(ms) {
  const min = Math.ceil(Math.max(0, ms) / 60000);
  return BASE + Math.max(0, min - BASE_MIN) * PER_MIN;
}
// Still owed on top of the base fare paid at the start.
export const owed = (ms) => rentCost(ms) - BASE;
// What to settle for a rental left behind when the page closed: up to the
// last moment it was seen riding.
export const leftOwed = (rent) => (rent ? owed(rent.seen - rent.start) : 0);
export function loadRent(storage = globalThis.localStorage) {
  try {
    const r = JSON.parse(storage?.getItem(RENT_KEY) || 'null');
    if (!r || !Number.isFinite(r.start) || !Number.isFinite(r.seen) || r.seen < r.start) return null;
    return { start: r.start, seen: r.seen };
  } catch { return null; }
}
export function saveRent(rent, storage = globalThis.localStorage) {
  try {
    if (rent) storage?.setItem(RENT_KEY, JSON.stringify(rent));
    else storage?.removeItem(RENT_KEY);
  } catch { /* storage blocked */ }
}

// Seoul Forest's park areas (map.areas with trees, inside FOREST_BOX).
export function forestAreas(areas = []) {
  const [x0, z0, x1, z1] = FOREST_BOX;
  return areas.filter((a) => a.k === 'park' && a.trees && a.p?.length > 2 && a.p.every(([x, z]) => x >= x0 && x <= x1 && z >= z0 && z <= z1));
}
function inPoly(x, z, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distSqToEdge(x, z, p) {
  let best = Infinity;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, az] = p[j], [bx, bz] = p[i];
    const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
    const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0;
    const ex = ax + dx * t - x, ez = az + dz * t - z;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return best;
}
// Can the rented bike be here? Inside a park area, or within the margin of one.
export function inForest(x, z, areas, margin = FOREST_MARGIN) {
  for (const a of areas) if (inPoly(x, z, a.p)) return true;
  for (const a of areas) if (distSqToEdge(x, z, a.p) <= margin * margin) return true;
  return false;
}
