#!/usr/bin/env node
// Nanji (난지, Mapo-gu): Haneul Park (하늘공원) on its hill and the Nanji
// Campground (난지캠핑장) in Nanji Han River Park below it, west of Mangwon,
// at 1/4 on their real places (Yozi 2026-11-21).
//
//   Haneul Park: the old landfill's grassy hill, its height from the real
//     ground (SRTM, scripts/data/nanji-dem.json) at 1/4 above the riverside;
//     the level top is silver grass (억새) with the pink muhly (핑크뮬리) field
//     in its north-west corner (from the park's own map), wider than the real
//     one on purpose (Yozi chose it: the field only, the hill stays 1/4).
//     Ways up: 하늘길 (the electric car road) from the west foot round the
//     north side to the top and down to the river side, the stairs from
//     World Cup Park in the south-east, and the west steps.
//   Nanji Campground: on OSM's outline; tents, fire pits with camp chairs
//     round them (불멍) and the campground's office and showers are game-size.
//   The Han's north bank, Gangbyeon-buk-ro, the riverside road and
//     Haneulgongwon-ro on their OSM lines.
//
// Data: scripts/data/nanji-osm.json (© OpenStreetMap contributors, ODbL) and
// scripts/data/nanji-dem.json. Made-up lines are listed in meta.approx.
//
//   node scripts/build-nanji.mjs   writes districts/nanji.json
//   node scripts/build-nanji.mjs --check   prints the numbers only
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, toLatLon, anchorOffset } from '../src/core/seoul-grid.js';
import { skyparkHeight, inPoly, trailNear } from '../src/core/skypark-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/nanji-osm.json'), 'utf8'));
const dem = JSON.parse(readFileSync(path.join(root, 'scripts/data/nanji-dem.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

// The district's anchor: the middle of Haneul Park's top.
export const ANCHOR = { place: "Haneul Park's level top, in the middle of its silver grass field (Mapo-gu)", lat: 37.5674, lon: 126.8855, local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const LP = (p) => p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);

// Mangwon's map (offset -3400,-150): where its Gangbyeon-buk-ro, riverside
// path and river end, in this map's metres.
const MW = { road: [-3583 - OX, -366 - OZ], path: [-3600 - OX, -346 - OZ], bankA: [-3622.9 - OX, -350.7 - OZ], bankB: [-3777.2 - OX, -179.4 - OZ] };

export const NANJI = {
  topH: null, // m: worked out from the ground (printed)
  slopeMax: 0.34, // the ways up: at most this rise per metre (about 19°)
  stairMax: 0.7, // the stairs (about 35°)
  trailW: 3, // m
  stairW: 2.4, // m
  muhly: { at: [-58, -30], size: [44, 30], why: "The park's map puts the pink muhly in the top's north-west corner; its size is about 3x the real field's, on purpose (Yozi 2026-11-21: the field only bigger, the hill 1/4)." },
};

// --- Helpers ---------------------------------------------------------------
function simplify(p, tol) { // Douglas-Peucker (open line)
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, az] = p[a], [bx, bz] = p[b], dx = bx - ax, dz = bz - az, ll = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / ll; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
// (a closed ring: the two halves either side of the point farthest from the first)
function simplifyRing(p, tol) {
  const q = p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p.slice();
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [a, b] = p[i], [c, d] = p[(i + 1) % p.length]; s += a * d - c * b; } return s / 2; };
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const polyDist = (x, z, p) => { let d = Infinity; for (let i = 0; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i], p[(i + 1) % p.length])); return d; };
const lineDist = (x, z, p) => { let d = Infinity; for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i - 1], p[i])); return d; };
const lineLen = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
function resample(p, step) {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}
// Chain ways that share end points into one line, starting from `first`.
function chain(ways, first) {
  const left = ways.filter((w) => w !== first).map((w) => w.p.slice());
  let line = first.p.slice();
  for (let more = true; more;) {
    more = false;
    for (let i = 0; i < left.length; i++) {
      const q = left[i], e = line[line.length - 1], s = line[0], same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
      if (same(q[0], e)) line = line.concat(q.slice(1));
      else if (same(q[q.length - 1], e)) line = line.concat(q.slice(0, -1).reverse());
      else if (same(q[q.length - 1], s)) line = q.slice(0, -1).concat(line);
      else if (same(q[0], s)) line = q.slice(1).reverse().concat(line);
      else continue;
      left.splice(i, 1); more = true; break;
    }
  }
  return line;
}
const W = osm.ways;

// --- The campground ----------------------------------------------------------
const campOsm = R1(simplifyRing(LP(osm.areas.camp.outer), 0.3));
const camp = (() => {
  const [cx, cz] = centroid(campOsm);
  // its long side runs along Gangbyeon-buk-ro
  let best = 0, bl = 0; for (let i = 1; i < campOsm.length; i++) { const dx = campOsm[i][0] - campOsm[i - 1][0], dz = campOsm[i][1] - campOsm[i - 1][1], l = Math.hypot(dx, dz); if (l > bl) { bl = l; best = Math.atan2(dz, dx); } }
  const c = Math.cos(best), s = Math.sin(best);
  const to = (u, v) => [r1(cx + u * c - v * s), r1(cz + u * s + v * c)];
  const inside = (x, z, m) => inPoly(x, z, campOsm) && polyDist(x, z, campOsm) > m;
  // fire pits (불멍) with camp chairs: three, in the east half (the real campfire zone is in the south-east)
  const fires = [];
  for (const [u, v] of [[14, -4], [22, 3], [8, 6], [26, -6]]) { const p = to(u, v); if (inside(p[0], p[1], 4)) fires.push(p); if (fires.length === 3) break; }
  // tent pitches on a grid, kept off the fires and the edge
  const pitches = [];
  for (let u = -40; u <= 40; u += 6) for (let v = -14; v <= 14; v += 6.5) {
    const p = to(u, v);
    if (!inside(p[0], p[1], 2.6)) continue;
    if (fires.some((f) => Math.hypot(f[0] - p[0], f[1] - p[1]) < 6)) continue;
    pitches.push([...p, r1(best + ((Math.round(u + v) % 2) ? Math.PI : 0)), pitches.length % 3]);
  }
  return { at: [r1(cx), r1(cz)], ry: r1(best), fires, pitches };
})();

// --- Roads, water, areas -----------------------------------------------------
// Gangbyeon-buk-ro: its two carriageways averaged into one line, from
// Mangwon's end west along the hill.
const trunkPts = W.trunk.flatMap((w) => LP(w.p));
const roadDir = Math.cos(camp.ry) > 0 ? [Math.cos(camp.ry), Math.sin(camp.ry)] : [-Math.cos(camp.ry), -Math.sin(camp.ry)]; // (pointing east-south-east, to Mangwon)
const along = (q) => (q[0] - MW.road[0]) * roadDir[0] + (q[1] - MW.road[1]) * roadDir[1];
const bins = new Map();
for (const q of trunkPts) { const s = along(q); if (s > 20 || s < -820) continue; const k = Math.round(s / 30); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(q); }
const gangbyeon = [MW.road].concat([...bins.entries()].sort((a, b) => b[0] - a[0]).map(([, l]) => centroid(l)).filter((q) => along(q) < -15));
const nanjiRoad = R1(simplify(LP(chain(W.nanjiRoad, W.nanjiRoad[0])), 0.8));
const haneulRoad = R1(simplify(LP(chain(W.haneulRoad, W.haneulRoad[0])), 0.8)).filter(([, z]) => z > -320);
const hp0 = haneulRoad[0];
// (Haneulgongwon-ro meets Gangbyeon-buk-ro at a ramp; a made-up walk down to it.)
const gbNear = (() => { let b = null, bd = Infinity; for (const q of gangbyeon) { const d = Math.hypot(q[0] - hp0[0], q[1] - hp0[1]); if (d < bd) { bd = d; b = q; } } return b; })();

// --- The ground ------------------------------------------------------------
// this map's metres -> lat/lon (inverse of L)
const LL = (x, z) => toLatLon(x + OX, z + OZ);
// The real ground (m above the sea) at a point of this map (bilinear on the DEM).
function realY(x, z) {
  const { lat, lon } = LL(x, z);
  const r = (dem.lat1 - lat) / dem.step, c = (lon - dem.lon0) / dem.step;
  const i = Math.max(0, Math.min(dem.rows - 2, Math.floor(r))), j = Math.max(0, Math.min(dem.cols - 2, Math.floor(c))), fr = r - i, fc = c - j;
  const m = dem.m;
  return (m[i][j] * (1 - fc) + m[i][j + 1] * fc) * (1 - fr) + (m[i + 1][j] * (1 - fc) + m[i + 1][j + 1] * fc) * fr;
}

const hillOsm = LP(osm.areas.haneul.outer);
const xs = hillOsm.map((p) => p[0]), zs = hillOsm.map((p) => p[1]);
const RES = 3; // m: the working grid
const BX0 = Math.floor(Math.min(...xs) - 20), BZ0 = Math.floor(Math.min(...zs) - 20), BX1 = Math.ceil(Math.max(...xs) + 20), BZ1 = Math.ceil(Math.max(...zs) + 20);
const GW = Math.ceil((BX1 - BX0) / RES) + 1, GH = Math.ceil((BZ1 - BZ0) / RES) + 1;
let raw = new Float64Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) raw[j * GW + i] = realY(BX0 + i * RES, BZ0 + j * RES);
for (let pass = 0; pass < 3; pass++) { // smoothed (SRTM's 30 m cells and the trees on it)
  const o = new Float64Array(raw.length);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    let s = 0, n = 0;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue; s += raw[jj * GW + ii]; n++; }
    o[j * GW + i] = s / n;
  }
  raw = o;
}
const rawAt = (x, z) => { const u = (x - BX0) / RES, v = (z - BZ0) / RES; const i = Math.max(0, Math.min(GW - 2, Math.floor(u))), j = Math.max(0, Math.min(GH - 2, Math.floor(v))), fu = u - i, fv = v - j; return (raw[j * GW + i] * (1 - fu) + raw[j * GW + i + 1] * fu) * (1 - fv) + (raw[(j + 1) * GW + i] * (1 - fu) + raw[(j + 1) * GW + i + 1] * fu) * fv; };
// The riverside's height: round the park's outline, a little outside it.
const ringPts = resample(hillOsm.concat([hillOsm[0]]), 4).map(([x, z]) => { const [cx, cz] = centroid(hillOsm), d = Math.hypot(x - cx, z - cz); return [x + ((x - cx) / d) * 12, z + ((z - cz) / d) * 12]; });
const ringY = ringPts.map(([x, z]) => rawAt(x, z)).sort((a, b) => a - b);
const BASE = ringY[Math.floor(ringY.length * 0.3)];
const FOOT = 0.6; // m (game): the outline is where the hill is this high, and the ground there is 0
const hRaw = (x, z) => Math.max(0, (rawAt(x, z) - BASE) / 4 - FOOT);

// The level top: the loop path round it (OSM 38170561), 3 m out.
const loop = LP(osm.ways.top.find((w) => w.id === 38170561).p);
const [tcx, tcz] = centroid(loop);
const topPoly = R1(simplify(loop.map(([x, z]) => { const d = Math.hypot(x - tcx, z - tcz); return [x + ((x - tcx) / d) * 3, z + ((z - tcz) / d) * 3]; }), 0.8));
const loopY = loop.map(([x, z]) => hRaw(x, z)).sort((a, b) => a - b);
const TOPH = r1(loopY[Math.floor(loopY.length / 2)]);
NANJI.topH = TOPH;

// The hill's outline: where the eased ground reaches 0 (marching squares).
function contour(f, lev) {
  const segs = [];
  for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) {
    const C = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [BX0 + a * RES, BZ0 + b * RES]);
    const V = C.map(([x, z]) => f(x, z)); const pts = [];
    for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; if ((V[k] > lev) !== (V[n] > lev)) { const t = (lev - V[k]) / (V[n] - V[k]); pts.push([C[k][0] + (C[n][0] - C[k][0]) * t, C[k][1] + (C[n][1] - C[k][1]) * t]); } }
    if (pts.length === 2) segs.push(pts); else if (pts.length === 4) segs.push([pts[0], pts[1]], [pts[2], pts[3]]);
  }
  const key = ([x, z]) => `${x.toFixed(3)},${z.toFixed(3)}`;
  const ends = new Map();
  segs.forEach((s, k) => { for (const e of [0, 1]) { const q = key(s[e]); if (!ends.has(q)) ends.set(q, []); ends.get(q).push(k); } });
  const used = new Uint8Array(segs.length), loops = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue; used[k] = 1;
    const line = [segs[k][0], segs[k][1]];
    for (;;) { const q = key(line[line.length - 1]); const nx = (ends.get(q) || []).find((m) => !used[m]); if (nx == null) break; used[nx] = 1; const s = segs[nx]; line.push(key(s[0]) === q ? s[1] : s[0]); }
    loops.push(line);
  }
  return loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
}
// The hill's outline: the park's (OSM), where the ground comes down to 0.
// (kept off Gangbyeon-buk-ro and Haneulgongwon-ro, which run along its foot)
const band = (p, w) => p.slice(1).map((q, i) => { const a = p[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, nx = (-(q[1] - a[1]) / len) * w, nz = ((q[0] - a[0]) / len) * w, ex = ((q[0] - a[0]) / len) * w, ez = ((q[1] - a[1]) / len) * w; return [[[a[0] - ex + nx, a[1] - ez + nz], [q[0] + ex + nx, q[1] + ez + nz], [q[0] + ex - nx, q[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz], [a[0] - ex + nx, a[1] - ez + nz]]]; });
const footCut = polygonClipping.difference([hillOsm.concat([hillOsm[0]])], ...band(gangbyeon, 18 / 2 + 1.5), ...band(haneulRoad, 9 / 2 + 1.5));
const foot = R1(simplifyRing(footCut.sort((q, r) => Math.abs(area(r[0])) - Math.abs(area(q[0])))[0][0], 1));
void contour;
const FADE = 10; // m inside the outline over which the ground comes down to 0
const hFoot = (x, z) => (inPoly(x, z, foot) ? hRaw(x, z) * Math.min(1, polyDist(x, z, foot) / FADE) : 0);

// --- The ways up -----------------------------------------------------------
// 하늘길 (OSM 38170527): from the west foot by Haneulgongwon-ro, round the
// north side up to the top's east entrance, then down to the riverside.
const haneulgil = LP(W.slope.find((w) => w.id === 38170527).p);
const link = LP(W.top.find((w) => w.id === 474186258).p); // the short way from 하늘길 onto the top's loop
const stairsSE = LP(W.steps.find((w) => w.id === 304169302).p);
const stairsW = LP(W.steps.find((w) => w.id === 327926004).p);

// A way's own climb: the ground along it, smoothed, then kept under `max`
// rise per metre (the lower envelope), with fixed heights at some points.
function profile(p, max, fixed = []) {
  const pts = resample(p, 1.5);
  const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let y = pts.map(([x, z]) => (inPoly(x, z, topPoly) ? TOPH : hFoot(x, z)));
  for (let pass = 0; pass < 6; pass++) y = y.map((v, i) => { let t = 0, n = 0; for (let k = Math.max(0, i - 5); k <= Math.min(y.length - 1, i + 5); k++) { t += y[k]; n++; } return t / n; });
  for (const [i, v] of fixed) y[i < 0 ? y.length + i : i] = v;
  // the lower envelope: y_i = min_j (y_j + max |s_i - s_j|)
  const out = y.slice();
  for (let i = 1; i < out.length; i++) out[i] = Math.min(out[i], out[i - 1] + max * (s[i] - s[i - 1]));
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] + max * (s[i + 1] - s[i]));
  const keep = simplify(pts.map((q, i) => [s[i], out[i], i]), 0.05).map((q) => q[2]); // (fewer points where the climb is even)
  const thin = simplify(pts, 0.4); const tset = new Set(thin.map((q) => pts.indexOf(q)));
  return pts.map((q, i) => [r1(q[0]), r1(q[1]), r1(Math.max(0, out[i]))]).filter((_, i) => tset.has(i) || keep.includes(i) || i === 0 || i === pts.length - 1);
}
// 하늘길 split at the point nearest the top's link, so each half climbs to the top.
const linkEnd = link[0];
let cut = 0, cd = Infinity; haneulgil.forEach(([x, z], i) => { const d = Math.hypot(x - linkEnd[0], z - linkEnd[1]); if (d < cd) { cd = d; cut = i; } });
const upNorth = haneulgil.slice(0, cut + 1).concat(link.slice(link[0] === haneulgil[cut] ? 1 : 0));
const upSouth = haneulgil.slice(cut).reverse().concat(link);
const toTop = (p) => { // run the way on until it is inside the level top
  const q = p.slice(); const a = q[q.length - 1];
  if (!inPoly(a[0], a[1], topPoly)) { const [cx, cz] = centroid(topPoly); const d = Math.hypot(cx - a[0], cz - a[1]); q.push([a[0] + ((cx - a[0]) / d) * 8, a[1] + ((cz - a[1]) / d) * 8]); }
  return q;
};
const trails = [
  { n: '하늘길 (north)', w: NANJI.trailW, p: profile(toTop(upNorth), NANJI.slopeMax, [[0, 0], [-1, TOPH]]) },
  { n: '하늘길 (south)', w: NANJI.trailW, p: profile(toTop(upSouth), NANJI.slopeMax, [[0, 0], [-1, TOPH]]) },
  { n: '하늘공원계단 (stairs)', w: NANJI.stairW, steps: true, p: null },
  { n: 'west steps', w: NANJI.stairW, steps: true, p: profile(toTop(stairsW), NANJI.stairMax, [[0, 0], [-1, TOPH]]) },
];

// The stairs from World Cup Park end on the lower loop road (not built here):
// they go on up to 하늘길, the last stretch made up (meta.approx).
{
  const south = trails[1], top = stairsSE[stairsSE.length - 1];
  let best = null, bd = Infinity;
  for (const q of resample(south.p.map(([x, z]) => [x, z]), 1)) { const d = Math.hypot(q[0] - top[0], q[1] - top[1]); if (d < bd) { bd = d; best = q; } }
  const meet = trailNear(south, best[0], best[1]).y;
  trails[2].p = profile(stairsSE.concat([best]), NANJI.stairMax, [[0, 0], [-1, meet]]);
  trails[2].joinLen = Math.round(bd);
}

// The grid the game keeps: the ground eased into the ways and level on top.
const CELL = 6;
const gx0 = BX0, gz0 = BZ0, gw = Math.ceil((BX1 - BX0) / CELL) + 1, gh = Math.ceil((BZ1 - BZ0) / CELL) + 1;
const gm = [];
for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
  const x = gx0 + i * CELL, z = gz0 + j * CELL;
  let y = hFoot(x, z);
  if (polyDist(x, z, topPoly) < CELL || inPoly(x, z, topPoly)) y = Math.max(TOPH - (inPoly(x, z, topPoly) ? 0 : 0.5), Math.min(y, TOPH));
  y = Math.min(y, TOPH);
  for (const t of trails) { const n = trailNear(t, x, z); if (n.d < t.w / 2 + CELL) y = n.y + (y - n.y) * Math.min(1, Math.max(0, (n.d - t.w / 2) / (CELL * 1.5))); }
  gm.push(Math.max(0, Math.round(y * 10)));
}
const grid = { x0: gx0, z0: gz0, cell: CELL, w: gw, h: gh, m: gm };

// --- The top's fields --------------------------------------------------------
const topPaths = W.topPaths.map((w) => R1(simplify(LP(w.p), 0.6))).filter((p) => p.length > 1 && lineLen(p) > 6 && p.every(([x, z]) => inPoly(x, z, topPoly)));
const [mx, mz] = NANJI.muhly.at, [mw, md] = NANJI.muhly.size;
// (the field lies along the top's long axis, north-west to south-east)
const ax = Math.atan2(loop[0][1] - tcz, loop[0][0] - tcx);
const axis = (() => { let best = 0, bl = 0; for (let i = 1; i < topPoly.length; i++) { const dx = topPoly[i][0] - topPoly[i - 1][0], dz = topPoly[i][1] - topPoly[i - 1][1], l = Math.hypot(dx, dz); if (l > bl) { bl = l; best = Math.atan2(dz, dx); } } return best; })();
void ax;
const ca = Math.cos(axis), sa = Math.sin(axis);
const muhlyBox = [[-mw / 2, -md / 2], [mw / 2, -md / 2], [mw / 2, md / 2], [-mw / 2, md / 2]].map(([u, v]) => [mx + u * ca - v * sa, mz + u * sa + v * ca]);
// (cut to the top, 1 m in from its edge)
const topIn = topPoly.map(([x, z]) => { const d = Math.hypot(x - tcx, z - tcz); return [x - ((x - tcx) / d) * 1, z - ((z - tcz) / d) * 1]; });
const muhly = R1(simplifyRing(polygonClipping.intersection([muhlyBox.concat([muhlyBox[0]])], [topIn.concat([topIn[0]])])[0][0], 0.3));
NANJI.muhlyArea = Math.round(Math.abs(area(muhly)));
// Kochia (댑싸리) bushes in a row along the muhly field's south-east side.
const kochia = [];
for (let k = -4; k <= 4; k++) { const u = mw / 2 + 3, v = k * 3; kochia.push([r1(mx + u * ca - v * sa), r1(mz + u * sa + v * ca)]); }
// Five wind turbines along the top's south-west edge (the park's map).
const sw = topPoly.slice().sort((a, b) => (b[0] * Math.sin(axis) - b[1] * Math.cos(axis)) - (a[0] * Math.sin(axis) - a[1] * Math.cos(axis)));
void sw;
const turbines = [];
{
  // along the long axis, 9 m in from the south-west edge
  const [cx, cz] = centroid(topPoly);
  let far = 0; for (const [x, z] of topPoly) far = Math.max(far, (x - cx) * -sa + (z - cz) * ca);
  for (let k = -2; k <= 2; k++) { const u = k * 16 + 10, v = far - 9; turbines.push([r1(cx + u * ca - v * sa), r1(cz + u * sa + v * ca)]); }
}
// 하늘을 담는 그릇 (the bowl look-out) at the top's south corner (approximate).
const bowl = (() => { const [cx, cz] = centroid(topPoly); let far = 0; for (const [x, z] of topPoly) far = Math.max(far, (x - cx) * ca + (z - cz) * sa); const u = far - 14, v = 8; return [r1(cx + u * ca - v * sa), r1(cz + u * sa + v * ca)]; })();

// The Han: OSM's water west of Mangwon's own stretch.
const han = osm.han.map((poly) => poly.map(LP));
const A = MW.bankA, B = MW.bankB, ext = (p, q, t) => [p[0] + (p[0] - q[0]) * t, p[1] + (p[1] - q[1]) * t];
const A2 = ext(A, B, 0.4), B2 = ext(B, A, 1.2);
const clip = [[A2, B2, [-900, B2[1]], [-900, A2[1]], A2]];
const water = polygonClipping.intersection(han, clip).map((q) => R1(simplify(q[0].slice(0, -1), 0.8)));

const parkP = R1(simplifyRing(LP(osm.areas.nanjiPark.outer), 1));
const roads = [
  { k: 'primary', w: 18, p: R1(simplify(gangbyeon, 1)), n: { ko: '강변북로', en: 'Gangbyeon-buk-ro', ja: '江辺北路', zh: '江边北路' } },
  { k: 'walk', w: 5, p: [R1([MW.path])[0], ...nanjiRoad.slice().reverse()].reverse(), n: { ko: '한강난지로', en: 'Hangangnanji-ro' } },
  { k: 'tertiary', w: 9, p: haneulRoad, n: { ko: '하늘공원로', en: 'Haneulgongwon-ro' } },
  { k: 'walk', w: 5, p: R1([gbNear, hp0]), approx: true, n: { ko: '하늘공원 가는 길', en: 'To Haneul Park' } },
];
const buildings = [];
{ // the campground's office and showers, game-size, by its road side
  const c = Math.cos(camp.ry), s = Math.sin(camp.ry), [cx, cz] = camp.at;
  const box = (u, v, w, d, h) => ({ h, p: R1([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [cx + (u + a) * c - (v + b) * s, cz + (u + a) * s + (v + b) * c])) });
  buildings.push({ ...box(30, -12, 8, 5, 3.6), n: 'camp-office' }, { ...box(-12, -13, 7, 4, 3.2), n: 'camp-shower' });
}

const map = {
  meta: {
    district: 'nanji',
    source: 'scripts/build-nanji.mjs, at 1/4 on the real place: the Han bank, Gangbyeon-buk-ro, the park roads, Haneul Park\'s outline, ways up and top paths and the campground from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/nanji-osm.json); the hill from SRTM (scripts/data/nanji-dem.json). The campground\'s tents, fires, office and showers are game-size and made up.',
    approx: [
      { what: 'pink muhly field', why: NANJI.muhly.why },
      { what: 'To Haneul Park (walk from Gangbyeon-buk-ro)', why: 'The real way is an underpass at the ramp; drawn as a short walk.' },
      { what: 'top of the World Cup Park stairs', why: 'OSM ends them on the lower loop road (not built); a made-up stretch takes them on up to 하늘길.' },
      { what: 'bowl look-out (하늘을 담는 그릇) and wind turbines', why: "Spots from the park's map, not OSM." },
      { what: 'campground tents, fire pits, office, showers', why: 'Laid out in OSM\'s campground outline on a grid; the real pitches are not in OSM.' },
    ],
    parts: [
      { box: [Math.floor(Math.min(...foot.map((p) => p[0])) - 6), Math.floor(Math.min(...foot.map((p) => p[1]), ...haneulRoad.map((p) => p[1])) - 6), Math.ceil(Math.max(...foot.map((p) => p[0])) + 6), Math.ceil(Math.max(...foot.map((p) => p[1])) + 6)] },
    ],
  },
  roads,
  buildings,
  areas: [
    ...water.map((p) => ({ k: 'water', p })),
    { k: 'park', p: parkP, n: { ko: '난지한강공원', en: 'Nanji Hangang Park' } },
    { k: 'grass', p: campOsm, n: { ko: '난지캠핑장', en: 'Nanji Campground' } },
  ],
  blockers: [
    ...water.map((p) => ({ p })),
    { p: foot, low: true, hill: 'skypark' }, // (the top and the ways up are decks through it: game/nanji-walk.js)
  ],
  pois: [],
  landmarks: [
    { type: 'skypark', x: 0, z: 0, grid, top: topPoly, topH: TOPH, foot, trails, paths: topPaths, muhly, kochia, turbines, bowl },
    { type: 'nanjicamp', x: camp.at[0], z: camp.at[1], ry: camp.ry, fires: camp.fires.map(([x, z]) => [r1(x - camp.at[0]), r1(z - camp.at[1])]), pitches: camp.pitches.map(([x, z, ry, k]) => [r1(x - camp.at[0]), r1(z - camp.at[1]), ry, k]) },
  ],
};
// the land parts: the hill box, and boxes along the park strip (kept off Mangwon's)
{
  // (west of x -360 the park's tip runs on to Gayang Bridge: left out of the
  // boxes, so the base map, 200 m round them, doesn't take in half of the
  // bridge into Gangseo, where nothing is built: tests/base.test.mjs)
  const land = [...resample(parkP.concat([parkP[0]]), 5), ...resample(gangbyeon, 5), ...haneulRoad].filter(([x]) => x > -360);
  const step = 80; let s0 = Infinity, s1 = -Infinity;
  for (const q of land) { const s = along(q); s0 = Math.min(s0, s); s1 = Math.max(s1, s); }
  for (let s = Math.floor(s0); s < s1; s += step) {
    const pts = land.filter((q) => { const a = along(q); return a >= s && a < s + step; });
    if (pts.length < 2) continue;
    const b = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))].map(Math.round);
    map.meta.parts.push({ box: b });
  }
}

// --- Checks --------------------------------------------------------------------
const check = () => {
  const l = map.landmarks[0];
  const out = { BASE: r1(BASE), topH: TOPH, footPts: foot.length, gridCells: gm.length, OFFSET };
  for (const t of trails) {
    let max = 0; for (let i = 0; i < t.p.length; i++) for (let k = i + 1; k < t.p.length; k++) { const d = lineLen(t.p.slice(i, k + 1)); if (d >= 2) { max = Math.max(max, Math.abs(t.p[k][2] - t.p[i][2]) / d); break; } }
    const last = t.p[t.p.length - 1];
    out[t.n] = `${t.p.length} pts, ${Math.round(lineLen(t.p))} m, top ${last[2]} m, steepest ${(Math.atan(max) * 180 / Math.PI).toFixed(1)}°`;
  }
  let top = 0; for (let x = -200; x < 200; x += 2) for (let z = -200; z < 200; z += 2) top = Math.max(top, skyparkHeight(l, x, z));
  out.highest = r1(top);
  out.muhlyArea = NANJI.muhlyArea; out.pitches = camp.pitches.length; out.fires = camp.fires.length;
  out.water = water.length; out.parts = map.meta.parts.length;
  return out;
};
console.log(check());
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'nanji.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/nanji.json', Math.round(JSON.stringify(map).length / 1024), 'KB');
}
