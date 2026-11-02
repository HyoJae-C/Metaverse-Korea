// Come back where you left off: the last spot on the street is saved every
// few seconds. Inside a shop it isn't updated, so you come back by its door.
// A spot that's off the map, inside something, or very old is ignored and
// you start at the usual place.
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
