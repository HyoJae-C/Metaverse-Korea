// Cropping and simplifying a map (see scripts/crop-map.mjs). Pure functions,
// unit-tested in tests/crop-map.test.mjs.

const r1 = (v) => Math.round(v * 10) / 10;

// Cut a polyline to the box: the pieces inside (Liang–Barsky per segment).
export function clipLine(p, [x0, z0, x1, z1]) {
  const pieces = [];
  let cur = [];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const dx = bx - ax, dz = bz - az;
    let t0 = 0, t1 = 1, ok = true;
    for (const [q, r] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (q === 0) { if (r < 0) { ok = false; break; } continue; }
      const t = r / q;
      if (q < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; }
    }
    if (!ok) { if (cur.length > 1) pieces.push(cur); cur = []; continue; }
    const s = [r1(ax + dx * t0), r1(az + dz * t0)], e = [r1(ax + dx * t1), r1(az + dz * t1)];
    if (!cur.length) cur.push(s);
    else { const l = cur[cur.length - 1]; if (l[0] !== s[0] || l[1] !== s[1]) { if (cur.length > 1) pieces.push(cur); cur = [s]; } }
    cur.push(e);
    if (t1 < 1) { if (cur.length > 1) pieces.push(cur); cur = []; }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

// Clip a polygon to the box (Sutherland–Hodgman); [] when nothing is left.
export function clipPoly(p, [x0, z0, x1, z1]) {
  let out = p;
  const edges = [[(q) => q[0] >= x0, (a, b) => at(a, b, 0, x0)], [(q) => q[0] <= x1, (a, b) => at(a, b, 0, x1)],
    [(q) => q[1] >= z0, (a, b) => at(a, b, 1, z0)], [(q) => q[1] <= z1, (a, b) => at(a, b, 1, z1)]];
  for (const [inside, cross] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[(i + src.length - 1) % src.length], b = src[i];
      if (inside(b)) { if (!inside(a)) out.push(cross(a, b)); out.push(b); } else if (inside(a)) out.push(cross(a, b));
    }
    if (!out.length) return [];
  }
  return out.length >= 3 ? out.map(([x, z]) => [r1(x), r1(z)]) : [];
}
function at(a, b, k, v) {
  const t = (v - a[k]) / (b[k] - a[k]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export const polyArea = (p) => Math.abs(p.reduce((s, [x, z], i) => { const [px, pz] = p[(i + p.length - 1) % p.length]; return s + px * z - x * pz; }, 0)) / 2;
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const inBox = ([x, z], [x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
const lineLen = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const near = (p, pts, d) => pts.some(([x, z]) => p.some(([px, pz]) => Math.hypot(px - x, pz - z) < d));

export const DROP_ROADS = new Set(['service', 'unclassified', 'track', 'steps', 'corridor']);
export const MIN_BUILDING = 100; // m²
export const MIN_ALLEY = 30; // m: shorter residential pieces are dropped

export function cropMap(map, box, { keepNear = [], minBuilding = MIN_BUILDING, minAlley = MIN_ALLEY } = {}) {
  const out = { ...map };
  // Buildings: whole ones inside the box; small ones only next to a shop.
  out.buildings = (map.buildings || []).filter((b) => b.p.every((q) => inBox(q, box))
    && (polyArea(b.p) >= minBuilding || near(b.p, keepNear, 25)));
  out.roads = [];
  for (const r of map.roads || []) {
    if (DROP_ROADS.has(r.k)) continue;
    for (const p of clipLine(r.p, box)) {
      if ((r.k === 'residential' || r.k === 'living_street') && lineLen(p) < minAlley) continue;
      out.roads.push({ ...r, p });
    }
  }
  out.rail = [];
  for (const r of map.rail || []) for (const p of clipLine(r.p, box)) out.rail.push({ ...r, p });
  out.areas = (map.areas || []).map((a) => ({ ...a, p: clipPoly(a.p, box) })).filter((a) => a.p.length >= 3 && polyArea(a.p) > 50);
  if (map.blockers) out.blockers = map.blockers.map((a) => ({ ...a, p: clipPoly(a.p, box) })).filter((a) => a.p.length >= 3);
  out.pois = (map.pois || []).filter((q) => inBox([q.x, q.z], box));
  return out;
}

// Where things are placed on a region (stores, homes, zones, bike stations),
// in map metres: cropMap keeps the buildings next to them. docs: the parsed
// stores.json, homes.json, zones.json and bikes.json (any may be missing).
export function placedPoints(region, docs = {}) {
  const c = region.center, mLat = (Math.PI / 180) * 6378137, mLon = mLat * Math.cos((c.lat * Math.PI) / 180);
  const pos = (s) => (Array.isArray(s.at) ? s.at : s.anchor ? [(s.anchor.lon - c.lon) * mLon, -(s.anchor.lat - c.lat) * mLat] : null);
  const out = [];
  for (const [f, k] of [['stores', 'stores'], ['homes', 'homes'], ['zones', 'zones'], ['bikes', 'stations']]) {
    for (const s of docs[f]?.[k] || []) { const p = pos(s); if (p) out.push(p); }
  }
  return out;
}

export { centroid };
