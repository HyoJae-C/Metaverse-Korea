// The Seoul grid: one fixed scale for the whole city, so every area has a
// known place and a known amount of room before it is built.
//
// The game's Seoul is real Seoul shrunk to 1/4 around Seongsu Station (the
// game's origin). An area is placed by naming one real spot in it (its
// anchor: lat/lon plus the local metres of that spot in the area's own map),
// and its offset follows from that; see scripts/place-districts.mjs and
// docs/WORLD.md. Each gu then has a fixed budget: its real outline at 1/4
// (public/regions/another-seoul/seoul.json). Buildings inside an area stay
// full size; only the distances between areas are shrunk.
//
// Game metres: x east, z south.

export const ORIGIN = { lat: 37.5446, lon: 127.0557 }; // Seongsu Station
export const SCALE = 1 / 4;

const M_LAT = (Math.PI / 180) * 6378137;
const M_LON = M_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);

// Real lat/lon -> game metres at the Seoul scale.
export function toGame(lat, lon) {
  return [(lon - ORIGIN.lon) * M_LON * SCALE, -(lat - ORIGIN.lat) * M_LAT * SCALE];
}

// Game metres -> real lat/lon (the inverse of toGame).
export function toLatLon(x, z) {
  return { lat: ORIGIN.lat - z / SCALE / M_LAT, lon: ORIGIN.lon + x / SCALE / M_LON };
}

// The offset that puts a district's anchor spot on its real place. A
// "nudge" ([dx, dz] metres, with a "why") moves it off that place on
// purpose, e.g. to keep the Han River in one line across districts.
export function anchorOffset(anchor) {
  const [x, z] = toGame(anchor.lat, anchor.lon);
  const [ax, az] = anchor.local || [0, 0];
  const [nx, nz] = anchor.nudge || [0, 0];
  return [Math.round(x - ax + nx), Math.round(z - az + nz)];
}

// Bounding box of a district map in world metres (buildings, roads, land
// areas; not water, which neighbours share, like the Han River), placed at an
// offset.
export function mapBox(map, [dx, dz] = [0, 0]) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const k of ['buildings', 'roads', 'areas']) {
    for (const item of map[k] || []) if (item.k !== 'water') for (const [x, z] of item.p) {
      x0 = Math.min(x0, x + dx); x1 = Math.max(x1, x + dx); z0 = Math.min(z0, z + dz); z1 = Math.max(z1, z + dz);
    }
  }
  return { x0, x1, z0, z1 };
}

// The parts of a district that other districts must keep out of: its
// meta.parts boxes ([x0, z0, x1, z1] in its own metres) when it lists them,
// e.g. an L-shaped district whose one bounding box would cover a neighbour
// tucked into its corner, else its whole bounding box.
export function mapParts(map, [dx, dz] = [0, 0]) {
  const parts = map.meta?.parts;
  if (!parts?.length) return [mapBox(map, [dx, dz])];
  return parts.map(({ box: [x0, z0, x1, z1] }) => ({ x0: x0 + dx, x1: x1 + dx, z0: z0 + dz, z1: z1 + dz }));
}

// How much two boxes overlap (0 when they don't): [width, depth] in metres.
export function boxOverlap(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), d = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
  return w > 0 && d > 0 ? [w, d] : [0, 0];
}

export function inPolygon(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}
