// My places (⭐) on the map: shops, landmarks, stations, zones or any spot
// you saved. Kept in this browser under an "mk." key, so the cloud save
// carries them to your other devices. Pure list helpers; the map draws them
// (ui/map-view.js).

export const FAV_KEY = 'mk.mapFavs';
export const FAV_MAX = 30;

// One place, one key: a shop by its id, a saved spot by its own id.
export const favKey = (f) => `${f.kind}:${f.id}`;

const valid = (f) => !!f && typeof f.kind === 'string' && f.id != null && Number.isFinite(f.x) && Number.isFinite(f.z);

export function loadFavs(storage = globalThis.localStorage) {
  try {
    const list = JSON.parse(storage?.getItem(FAV_KEY) || '[]');
    return Array.isArray(list) ? list.filter(valid).slice(0, FAV_MAX) : [];
  } catch { return []; }
}

export function saveFavs(list, storage = globalThis.localStorage) {
  try {
    if (list.length) storage?.setItem(FAV_KEY, JSON.stringify(list));
    else storage?.removeItem(FAV_KEY);
  } catch { /* storage blocked: kept until the page closes */ }
}

export const hasFav = (list, place) => list.some((f) => favKey(f) === favKey(place));

// Add the place (newest first) or take it off again.
// Returns { list, added, full }: full when the list had no room.
export function toggleFav(list, place) {
  if (hasFav(list, place)) return { list: list.filter((f) => favKey(f) !== favKey(place)), added: false, full: false };
  if (list.length >= FAV_MAX) return { list, added: false, full: true };
  const { kind, id, x, z, icon } = place;
  return { list: [{ kind, id: String(id), x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, ...(icon ? { icon } : {}) }, ...list], added: true, full: false };
}

// Save the spot you're standing on (a fishing pier, a bench, a view).
export function addSpot(list, x, z, now = Date.now()) {
  return toggleFav(list, { kind: 'spot', id: now.toString(36), x, z, icon: '📍' });
}

export function removeFav(list, f) {
  return list.filter((g) => favKey(g) !== favKey(f));
}
