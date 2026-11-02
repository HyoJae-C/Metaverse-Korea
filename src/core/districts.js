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
  const out = { meta: { ...(parts[0]?.map.meta || {}), districts: [] }, pois: [], landmarks: [] };
  for (const k of LISTS) out[k] = [];
  for (const { id, map, offset = [0, 0] } of parts) {
    const [dx, dz] = offset;
    for (const k of LISTS) for (const item of map[k] || []) out[k].push({ ...item, p: shiftPoly(item.p, dx, dz), d: id });
    for (const poi of map.pois || []) out.pois.push({ ...poi, x: poi.x + dx, z: poi.z + dz, d: id });
    for (const l of map.landmarks || []) out.landmarks.push(l.p ? { ...l, p: shiftPoly(l.p, dx, dz) } : { ...l, x: l.x + dx, z: l.z + dz });
    out.meta.districts.push({ id, offset: [dx, dz] });
  }
  for (const r of links) out.roads.push({ ...r, d: 'link' });
  return out;
}

// Loads a region's map: a single file, or its districts joined together.
export async function loadRegionMap(region, fetchJson) {
  if (!region.districts?.length) return fetchJson(region.mapFile || 'map.json');
  const maps = await Promise.all(region.districts.map((d) => fetchJson(d.map)));
  return mergeDistricts(region.districts.map((d, i) => ({ ...d, map: maps[i] })), region.links || []);
}

// Where something stands: local metres ("at": [x, z], for hand-made
// districts) or a lat/lon anchor (for maps made from OpenStreetMap).
export function placeOf(item, center, latLonToLocal) {
  if (Array.isArray(item.at) && item.at.length === 2 && item.at.every(Number.isFinite)) return item.at;
  return latLonToLocal(center, item.anchor.lat, item.anchor.lon);
}
