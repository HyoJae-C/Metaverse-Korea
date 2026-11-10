// Come back where you left off: the last spot on the street is saved every
// few seconds. Inside a shop it isn't updated, so you come back by its door.
// A spot that's off the map, inside something, or very old is ignored and
// you start at the usual place.
import { inPoly } from './geom.js';

const KEY = 'mk.lastSpot';
export const MAX_AGE_DAYS = 30;

export function saveLastSpot(x, z, ry, storage = globalThis.localStorage, now = Date.now()) {
  if (![x, z, ry].every(Number.isFinite)) return;
  try { storage?.setItem(KEY, JSON.stringify({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, ry: Math.round(ry * 100) / 100, t: now })); } catch { /* storage blocked */ }
}

export function loadLastSpot(storage = globalThis.localStorage) {
  try { return JSON.parse(storage?.getItem(KEY) || 'null'); } catch { return null; }
}

// bounds: { minX, maxX, minZ, maxZ }; blocked(x, z): true inside a building,
// wall or water.
export function usableSpot(s, bounds, blocked, now = Date.now()) {
  if (!s || typeof s !== 'object' || ![s.x, s.z, s.ry, s.t].every(Number.isFinite)) return false;
  if (now - s.t > MAX_AGE_DAYS * 86400000) return false;
  if (s.x < bounds.minX || s.x > bounds.maxX || s.z < bounds.minZ || s.z > bounds.maxZ) return false;
  return !blocked(s.x, s.z);
}

// The district that spot was in (e.g. 'bukchon'), so the start screen can say
// "Last location: Bukchon" before the map has loaded. Only while the saved
// spot itself is fresh enough to be used.
const PLACE_KEY = 'mk.lastPlace';
export function saveLastPlace(id, storage = globalThis.localStorage) {
  if (typeof id !== 'string' || !id) return;
  try { storage?.setItem(PLACE_KEY, id); } catch { /* storage blocked */ }
}

export function loadLastPlace(storage = globalThis.localStorage, now = Date.now()) {
  const s = loadLastSpot(storage);
  if (!s || !Number.isFinite(s.t) || now - s.t > MAX_AGE_DAYS * 86400000) return null;
  try { return storage?.getItem(PLACE_KEY) || null; } catch { return null; }
}

// Somewhere the map has something: near a district's box, on a road (the
// long roads joining districts too) or in a park or square. Not the empty
// land between districts (a spot saved before a district moved). A spot on
// a joining road used to fail the box test alone, so a refresh there sent
// you back to the start in Seongsu.
// map: { boxes: districtBoxes(), areas: [{ k, p }], onRoad(x, z) }
export function onMap(x, z, { boxes = [], areas = [], onRoad = () => false }, margin = 40) {
  if (!boxes.length) return true; // a single-file map: its bounds are enough
  if (boxes.some((b) => x >= b.x0 - margin && x <= b.x1 + margin && z >= b.z0 - margin && z <= b.z1 + margin)) return true;
  if (onRoad(x, z)) return true;
  return areas.some((a) => a.k !== 'water' && inPoly(x, z, a.p));
}
