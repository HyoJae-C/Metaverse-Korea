// A region can be one map (map.json) or several districts joined into one
// compressed city: each district is its own map file, shifted by an offset in
// metres. This lets a hand-made district (a landmark or two, a few streets,
// easy to walk) sit next to others, e.g. Gyeongbokgung, Hongdae, Seongsu and
// the Han River in one Seoul map. See docs/WORLD.md.
//
// region.json:
//   "districts": [
//     { "id": "seongsu", "map": "map.json", "offset": [0, 0] },
//     { "id": "hongdae", "map": "districts/hongdae.json", "offset": [-900, 0] }
//   ],
//   "links": [ { "k": "primary", "w": 16, "p": [[-500, 0], [-400, 0]] } ]
//
// Map files may also have "blockers": polygons you can't walk into (a river,
// a palace wall) that are not buildings.
const LISTS = ['roads', 'buildings', 'rail', 'areas', 'blockers'];

const shiftPoly = (p, dx, dz) => p.map(([x, z]) => [Math.round((x + dx) * 10) / 10, Math.round((z + dz) * 10) / 10]);

export function mergeDistricts(parts, links = []) {
  const out = { meta: { ...(parts[0]?.map.meta || {}), districts: [] }, pois: [], landmarks: [], streams: [] };
  for (const k of LISTS) out[k] = [];
  for (const { id, map, offset = [0, 0] } of parts) {
    const [dx, dz] = offset;
    for (const k of LISTS) for (const item of map[k] || []) out[k].push({ ...item, p: shiftPoly(item.p, dx, dz), d: id });
    for (const poi of map.pois || []) out.pois.push({ ...poi, x: poi.x + dx, z: poi.z + dz, d: id });
    for (const l of map.landmarks || []) out.landmarks.push(l.p ? { ...l, p: shiftPoly(l.p, dx, dz) } : { ...l, x: l.x + dx, z: l.z + dz });
    for (const s of map.streams || []) out.streams.push({ ...s, at: [s.at[0] + dx, s.at[1] + dz], d: id }); // core/stream.js
    out.meta.districts.push({ id, offset: [dx, dz], ...(map.meta?.parts ? { parts: map.meta.parts } : {}), ...(map.meta?.enclosure ? { enclosure: map.meta.enclosure } : {}) });
  }
  for (const r of links) out.roads.push({ ...r, d: 'link' });
  return out;
}

// Loads a region's map: a single file, or its districts joined together.
export async function loadRegionMap(region, fetchJson) {
  if (!region.districts?.length) return liftStations(await fetchJson(region.mapFile || 'map.json'));
  const maps = await Promise.all(region.districts.map((d) => fetchJson(d.map)));
  return liftStations(mergeDistricts(region.districts.map((d, i) => ({ ...d, map: maps[i] })), region.links || []));
}

// Elevated stations that come from map data (e.g. OpenStreetMap) as
// ordinary buildings, so they were solid blocks across the streets below.
// A building that an elevated railway runs through for 20 m or more is a
// station deck: raise it so people walk underneath (like other overhangs).
export const DECK_HEIGHT = 4.5;
export function liftStations(map) {
  const elevated = (map.rail || []).filter((r) => r.e);
  if (!elevated.length) return map;
  for (const b of map.buildings || []) {
    if (b.m) continue;
    let inside = 0;
    for (const r of elevated) {
      for (let i = 1; i < r.p.length; i++) {
        const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i];
        const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(len / 2));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          if (inPoly(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, b.p)) inside += len / n;
        }
      }
    }
    if (inside >= 20) b.m = Math.min(DECK_HEIGHT, b.h - 1);
  }
  return map;
}
function inPoly(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

// Where something stands: local metres ("at": [x, z], for hand-made
// districts) or a lat/lon anchor (for maps made from real coordinates).
export function placeOf(item, center, latLonToLocal) {
  if (Array.isArray(item.at) && item.at.length === 2 && item.at.every(Number.isFinite)) return item.at;
  return latLonToLocal(center, item.anchor.lat, item.anchor.lon);
}

// Which district a point is in: the smallest box (its buildings and land
// areas, not water) that holds it, else the smallest within a margin, else
// the one with the nearest box centre. A small district beside a big one
// (Olympic Park next to Songpa) wins inside its own box. `map` is a joined
// map (mergeDistricts); a single-file map has no districts (null).
export function districtBoxes(map) {
  const out = [];
  const items = [...(map?.buildings || []), ...(map?.areas || []).filter((a) => a.k !== 'water')];
  for (const { id, offset = [0, 0], parts } of map?.meta?.districts || []) {
    // A district that lists meta.parts (boxes in its own metres, see
    // scripts/place-districts.mjs) uses those: e.g. Gyeongbokgung's palace and
    // stream, with Bukchon tucked into the corner between them.
    if (parts?.length) {
      for (const { box: [x0, z0, x1, z1] } of parts) out.push({ id, x0: x0 + offset[0], x1: x1 + offset[0], z0: z0 + offset[1], z1: z1 + offset[1] });
      continue;
    }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const b of items) {
      if (b.d !== id) continue;
      for (const [x, z] of b.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    }
    if (x0 < x1) out.push({ id, x0, x1, z0, z1 });
  }
  return out;
}
// A district tucked into another's corner (Bukchon beside Gyeongbokgung)
// sits inside the bigger box: the smallest box holding the point wins.
export function districtAt(boxes, x, z, margin = 40) {
  const area = (b) => (b.x1 - b.x0) * (b.z1 - b.z0);
  const hold = (m) => boxes.filter((b) => x >= b.x0 - m && x <= b.x1 + m && z >= b.z0 - m && z <= b.z1 + m).sort((a, b) => area(a) - area(b));
  const hit = hold(0)[0] || hold(margin)[0];
  if (hit) return hit.id;
  let best = null, bd = Infinity;
  for (const b of boxes) {
    const d = Math.hypot(x - (b.x0 + b.x1) / 2, z - (b.z0 + b.z1) / 2);
    if (d < bd) { bd = d; best = b.id; }
  }
  return best;
}
