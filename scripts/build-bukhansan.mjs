#!/usr/bin/env node
// Bukhansan (북한산, Gangbuk-gu): the Baegundae course from Bukhansan Ui
// Station, at 1/4 on its real place (Yozi 2026-11-26).
//
//   The way: Bukhansan Ui Station → Samyang-ro 173-gil (the road up the
//     valley to Doseonsa's car park) → Baegundae Visitor Support Center →
//     Harujae (the saddle) → Baegun Hut → Baegunbongammun (위문, the city
//     wall's gate) → Baegundae (835.6 m). Every stretch is on its OSM line
//     (the open ways only: scripts/data/bukhansan-osm.json `legs`).
//   The mountain: the real ground (scripts/data/bukhansan-dem.json) at 1/4
//     above the station ([[hill-slope-rule]]: the height above the town
//     around, not above the sea), so Baegundae stands 192 m over the station.
//     Baegundae, Insubong, Mangyeongdae and Yeongbong are lifted to OSM's
//     surveyed heights (the terrain tiles round a sharp peak off).
//   You walk on the way only (the mountain is a blocker; the way is decks
//     through it: game/bukhansan-walk.js). Paths climb at most about 18°;
//     the last stretch, from the gate up the bare rock to the top, is steps
//     with a handrail, as it really is (about 26°).
//
// Data: scripts/data/bukhansan-osm.json (© OpenStreetMap contributors, ODbL)
// and scripts/data/bukhansan-dem.json (AWS Terrain Tiles; SRTM), both made by
// /mnt/project-files/bukhansan/data-prep/ (ex.py, prep.py). Made-up things are
// listed in meta.approx.
//
//   node scripts/build-bukhansan.mjs           writes districts/bukhansan.json
//   node scripts/build-bukhansan.mjs --check   prints the numbers only
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, toLatLon, anchorOffset } from '../src/core/seoul-grid.js';
import { inPoly, trailNear } from '../src/core/skypark-ground.js';
import { bukhanHeight } from '../src/core/bukhan-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/bukhansan-osm.json'), 'utf8'));
const dem = JSON.parse(readFileSync(path.join(root, 'scripts/data/bukhansan-dem.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

// The district's anchor: Bukhansan Ui Station (OSM node 9459739627).
export const ANCHOR = { place: 'Bukhansan Ui Station, the end of the Ui-Sinseol Line (Gangbuk-gu)', lat: osm.spots.station.at[0], lon: osm.spots.station.at[1], local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const LP = (p) => p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);

export const BUKHAN = {
  roadMax: 0.27, // the valley road's climb: at most this rise per metre (about 15°)
  pathMax: 0.33, // a path's (about 18°; under 20° after rounding)
  stairMax: 0.6, // the steps up the rock (about 31°)
  roadW: 6, // m: Samyang-ro 173-gil (game-size, a two-lane road)
  trailW: 2.6, // m: the paths (game-size)
  east: -24, // local x: the mountain's ground starts this far west of the station
  band: 70, // m each side of the valley road: the mountain's ground there
  edge: 45, // m inside the outline over which the ground comes down to 0 (made up: the far sides are cut)
  lift: 22, // m: how far round a peak the lift to its surveyed height reaches
  // Level places (game-size, m across): where you stop on the way.
  pads: { center: 9, haru: 5, hut: 5, gate: 3, peak: 4.5 },
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
function simplifyRing(p, tol) {
  const q = p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p.slice();
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [a, b] = p[i], [c, d] = p[(i + 1) % p.length]; s += a * d - c * b; } return s / 2; };
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
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const band = (p, w) => p.slice(1).map((q, i) => { const a = p[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, nx = (-(q[1] - a[1]) / len) * w, nz = ((q[0] - a[0]) / len) * w, ex = ((q[0] - a[0]) / len) * w, ez = ((q[1] - a[1]) / len) * w; return [[[a[0] - ex + nx, a[1] - ez + nz], [q[0] + ex + nx, q[1] + ez + nz], [q[0] + ex - nx, q[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz], [a[0] - ex + nx, a[1] - ez + nz]]]; });

// --- The way's line --------------------------------------------------------
// Each leg's OSM ways joined end to end (local metres).
const LEGS = osm.legs.map((leg) => {
  let line = [];
  for (const w of leg.ways) { const p = LP(w.p); line = line.length ? line.concat(p.slice(1)) : p; }
  return { from: leg.from, to: leg.to, real: leg.len, line, ids: leg.ways.map((w) => w.id) };
});
const spot = Object.fromEntries(Object.entries(osm.spots).map(([k, v]) => [k, L(v.at)]));
const peaks = osm.peaks.map((p) => ({ name: p.name, ele: p.ele, at: L(p.at) }));
const TOP = peaks[0]; // Baegundae

// --- The mountain's outline ---------------------------------------------------
// Made up (the real mountain has no edge here: it goes on into Goyang and to
// Dobongsan): a band along the valley road, then a box round the course and
// the three peaks. The ground comes down to 0 along it.
const road0 = LEGS[0].line;
const all = LEGS.flatMap((l) => l.line).concat(peaks.slice(0, 4).map((p) => p.at));
const centerX = spot.center[0];
const BOX = [Math.floor(TOP.at[0] - 115), Math.floor(Math.min(...all.filter((q) => q[0] < centerX + 40).map((q) => q[1])) - 75), Math.ceil(centerX + 40), Math.ceil(Math.max(...all.filter((q) => q[0] < centerX + 40).map((q) => q[1])) + 75)];
const roadIn = road0.filter(([x]) => x < BUKHAN.east + 30);
const union = polygonClipping.union(
  [[[BOX[0], BOX[1]], [BOX[2], BOX[1]], [BOX[2], BOX[3]], [BOX[0], BOX[3]], [BOX[0], BOX[1]]]],
  ...band(simplify(roadIn, 6), BUKHAN.band),
);
const east = [[[BUKHAN.east, -9999], [9999, -9999], [9999, 9999], [BUKHAN.east, 9999], [BUKHAN.east, -9999]]];
const cut = polygonClipping.difference(union, east).sort((q, r) => Math.abs(area(r[0])) - Math.abs(area(q[0])))[0][0];
const foot = R1(simplifyRing(cut, 3));

// --- The ground ----------------------------------------------------------------
const LL = (x, z) => toLatLon(x + OX, z + OZ);
function realY(x, z) {
  const { lat, lon } = LL(x, z);
  const r = (dem.lat1 - lat) / dem.step, c = (lon - dem.lon0) / dem.step;
  const i = Math.max(0, Math.min(dem.rows - 2, Math.floor(r))), j = Math.max(0, Math.min(dem.cols - 2, Math.floor(c))), fr = Math.max(0, Math.min(1, r - i)), fc = Math.max(0, Math.min(1, c - j));
  const m = dem.m;
  return (m[i][j] * (1 - fc) + m[i][j + 1] * fc) * (1 - fr) + (m[i + 1][j] * (1 - fc) + m[i + 1][j + 1] * fc) * fr;
}
const BASE = realY(0, 0); // the station
// The peaks' lift: each named peak up to its surveyed height.
const lifts = peaks.filter((p) => p.ele && inPoly(p.at[0], p.at[1], foot)).map((p) => ({ at: p.at, d: Math.max(0, (p.ele - realY(...p.at)) / 4), name: p.name, y: (p.ele - BASE) / 4 }));
const hReal = (x, z) => {
  let y = (realY(x, z) - BASE) / 4;
  for (const l of lifts) { const d = Math.hypot(x - l.at[0], z - l.at[1]) / BUKHAN.lift; if (d < 2.5) y += l.d * Math.exp(-d * d * 2); }
  return Math.max(0, y);
};
// (down to 0 along the outline; along the east edge, by the town, over a longer run)
const hFoot = (x, z) => (inPoly(x, z, foot) ? hReal(x, z) * smooth(polyDist(x, z, foot) / BUKHAN.edge) : 0);

// --- The way's climb -------------------------------------------------------------
// Each leg: the ground's own profile along it, between the heights of its two
// ends (the stops), eased towards an even climb until no step is steeper than
// the leg allows.
const STOP_Y = {
  station: 0,
  center: (realY(...spot.center) - BASE) / 4,
  haru: (realY(...spot.haru) - BASE) / 4,
  hut: (realY(...LEGS[2].line.at(-1)) - BASE) / 4,
  gate: (osm.spots.gate.ele - BASE) / 4,
  peak: (TOP.ele - BASE) / 4,
};
const KIND = { station: 'road', center: 'path', haru: 'path', hut: 'path', gate: 'steps' };
const MAX = { road: BUKHAN.roadMax, path: BUKHAN.pathMax, steps: BUKHAN.stairMax };
const STEP = 1.5;
const trails = [];
const report = [];
let roadFlat = null; // the valley road's start, on the flat by the station (a road in the map)
for (const leg of LEGS) {
  const kind = KIND[leg.from];
  let pts = resample(leg.line, STEP);
  let y0 = STOP_Y[leg.from];
  if (leg.from === 'station') { // from where the road comes onto the mountain's ground
    let s = 0; while (s < pts.length - 1 && !(inPoly(pts[s][0], pts[s][1], foot) && polyDist(pts[s][0], pts[s][1], foot) > 1)) s++;
    roadFlat = pts.slice(0, s + 1);
    pts = pts.slice(s);
    y0 = 0;
  }
  const y1 = STOP_Y[leg.to];
  const sAt = [0]; for (let k = 1; k < pts.length; k++) sAt.push(sAt[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const len = sAt.at(-1);
  let g = pts.map(([x, z]) => hReal(x, z));
  for (let pass = 0; pass < 12; pass++) g = g.map((v, k) => (k === 0 || k === g.length - 1 ? v : (g[k - 1] + 2 * v + g[k + 1]) / 4));
  // (between the ends' heights: what the ground does on the way, tilted to fit)
  // (level across each stop's pad: the climb is between the pads' edges)
  const r0 = BUKHAN.pads[leg.from] || 0, r1e = BUKHAN.pads[leg.to] || 0, u = (s) => Math.max(0, Math.min(1, (s - r0) / (len - r0 - r1e)));
  const lin = sAt.map((s) => y0 + (y1 - y0) * u(s));
  const kA = sAt.findIndex((s) => s >= r0), kB = sAt.length - 1 - [...sAt].reverse().findIndex((s) => s <= len - r1e);
  const fit = g.map((v, k) => (k <= kA ? y0 : k >= kB ? y1 : v + (y0 - g[kA]) + ((y1 - g[kB]) - (y0 - g[kA])) * u(sAt[k])));
  const steepest = (ys) => { let m = 0; for (let k = 1, a = 0; k < ys.length; k++) { while (sAt[k] - sAt[a + 1] >= 3) a++; if (sAt[k] - sAt[a] >= 3) m = Math.max(m, Math.abs(ys[k] - ys[a]) / (sAt[k] - sAt[a])); } return m; }; // (over 3 m of the way)
  let mix = 1, ys = fit;
  while (steepest(ys) > MAX[kind] && mix > 0) { mix = Math.max(0, mix - 0.05); ys = fit.map((v, k) => lin[k] + (v - lin[k]) * mix); }
  const run = pts.map(([x, z], k) => [x, z, ys[k], k]);
  const flat = new Set(simplify(run, 0.25).map((q) => q[3]));
  const even = new Set(simplify(run.map((q, k) => [sAt[k], q[2], k]), 0.08).map((q) => q[2]));
  const keep = run.filter((q, k) => flat.has(k) || even.has(k));
  trails.push({ n: `${leg.from}-${leg.to}`, k: kind, w: kind === 'road' ? BUKHAN.roadW : BUKHAN.trailW, ...(kind === 'steps' ? { steps: true } : {}), p: keep.map(([x, z, y]) => [r1(x), r1(z), r1(Math.max(0, y))]) });
  report.push({ leg: `${leg.from}→${leg.to}`, real: Math.round(leg.real), game: r1(len + (leg.from === 'station' ? lineLen(roadFlat) : 0)), climb: `${r1(y0)}→${r1(y1)}`, avg: `${(Math.atan((y1 - y0) / (len - r0 - r1e)) * 180 / Math.PI).toFixed(1)}°`, steepest: `${(Math.atan(steepest(ys)) * 180 / Math.PI).toFixed(1)}°`, ground: `${Math.round(mix * 100)}%` });
}

// --- The stops: level places on the way --------------------------------------------
const trailAt = (x, z) => { let best = { d: Infinity, y: 0 }; for (const t of trails) { const n = trailNear(t, x, z); if (n.d < best.d) best = n; } return best; };
const end = (name) => { const t = trails.find((q) => q.n.endsWith(`-${name}`)); return t.p.at(-1); };
const pads = Object.entries(BUKHAN.pads).map(([k, r]) => { const [x, z, y] = end(k); return { k, at: [x, z], r, y }; });

// The buildings OSM has on the way (their real spots; drawn game-size).
const mid = (p) => { const q = p.slice(0, -1); return [q.reduce((s, v) => s + v[0], 0) / q.length, q.reduce((s, v) => s + v[1], 0) / q.length]; };
const bld = (id) => { const b = osm.buildings.find((q) => q.id === id), p = LP(b.p), c = mid(p), a = p[0], q = p[1]; return { at: R1([c])[0], ry: r1(Math.atan2(q[0] - a[0], q[1] - a[1])), real: [r1(Math.hypot(q[0] - a[0], q[1] - a[1]) * 4), r1(Math.hypot(p[2][0] - q[0], p[2][1] - q[1]) * 4)] }; };
const hut = bld(1227506978), office = bld(1227704051);

// --- The ground the game keeps: a grid eased into the way ------------------------------
const CELL = 8;
const fx = foot.map((p) => p[0]), fz = foot.map((p) => p[1]);
const gx0 = Math.floor(Math.min(...fx) - CELL), gz0 = Math.floor(Math.min(...fz) - CELL), gw = Math.ceil((Math.max(...fx) + CELL - gx0) / CELL) + 1, gh = Math.ceil((Math.max(...fz) + CELL - gz0) / CELL) + 1;
const EASE = 22; // m beside the way over which the kept ground eases into it (the terrain tiles are 30 m: a gully is smeared)
const gm = [], rock = [];
const rockPolys = osm.rock.map((r) => LP(r.p)).map((p) => ({ p, b: [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))] }));
const isRock = (x, z) => rockPolys.some((r) => x >= r.b[0] && x <= r.b[2] && z >= r.b[1] && z <= r.b[3] && inPoly(x, z, r.p));
for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
  const x = gx0 + i * CELL, z = gz0 + j * CELL;
  let y = hFoot(x, z);
  if (y > 0) {
    const n = trailAt(x, z);
    if (n.d < EASE) y = n.y + (y - n.y) * smooth(n.d / EASE);
    for (const pd of pads) { const d = Math.hypot(x - pd.at[0], z - pd.at[1]) - pd.r; if (d < EASE) y = pd.y + (y - pd.y) * smooth(Math.max(0, d) / EASE); }
  }
  gm.push(Math.max(0, Math.round(y * 10)));
  rock.push(y > 0 && isRock(x, z) ? 1 : 0);
}
const grid = { x0: gx0, z0: gz0, cell: CELL, w: gw, h: gh, m: gm };
// (the bare rock, a bit a cell, as hex: four cells a letter)
let rockHex = '';
for (let k = 0; k < rock.length; k += 4) rockHex += ((rock[k] << 3) | ((rock[k + 1] || 0) << 2) | ((rock[k + 2] || 0) << 1) | (rock[k + 3] || 0)).toString(16);

// The streams by the way (OSM), inside the outline.
const streams = osm.streams.map((s) => ({ name: s.name, p: LP(s.p).filter(([x, z]) => inPoly(x, z, foot) && polyDist(x, z, foot) > 6) })).filter((s) => s.p.length > 3 && s.p.some(([x, z]) => trailAt(x, z).d < 60)).map((s) => ({ name: s.name, p: R1(simplify(s.p, 1)) }));

// --- The map ---------------------------------------------------------------------
const name = (ko, en, ja, zh) => ({ ko, en, ja, zh });
// The Information Center by the station's exit 2, where the road to the
// mountain starts (made up: every district has one in the game).
const kiosk = (() => { const c = [-11, 20], w = 7, d = 4.5; return { at: c, p: R1([[c[0] - w / 2, c[1] - d / 2], [c[0] + w / 2, c[1] - d / 2], [c[0] + w / 2, c[1] + d / 2], [c[0] - w / 2, c[1] + d / 2]]) }; })();
// (from 6 m west of the station's middle: the exits stand there, on the road's real start)
const roadStart = (() => { const p = simplify(roadFlat, 0.4); let i = 0; while (p[i + 1] && p[i + 1][0] > -6) i++; const a = p[i], b = p[i + 1], t = (-6 - a[0]) / (b[0] - a[0]); const q = [[-6, a[1] + (b[1] - a[1]) * t], ...p.slice(i + 1)], end = BUKHAN.east + 1, out = [q[0]];
  // (it stops at the mountain's edge: from there on the way is the mountain's own, a deck through its blocker)
  for (let j = 1; j < q.length; j++) { if (q[j][0] >= end) { out.push(q[j]); continue; } const c = q[j - 1], u = (end - c[0]) / (q[j][0] - c[0]); out.push([end, c[1] + (q[j][1] - c[1]) * u]); break; }
  return R1(out); })();
const roads = [
  { k: 'residential', w: BUKHAN.roadW, p: roadStart, n: name('삼양로173길', 'Samyang-ro 173-gil', '三陽路173キル', '三阳路173街') },
];
const landmark = {
  type: 'bukhansan', x: 0, z: 0, grid, rock: rockHex, top: [], topH: 0, foot, trails, pads, streams,
  peaks: lifts.map((l) => ({ name: l.name, at: R1([l.at])[0], y: r1(l.y) })),
  hut: { ...hut, y: pads.find((p) => p.k === 'hut').y },
  office: { ...office, y: pads.find((p) => p.k === 'center').y },
  summit: { at: pads.find((p) => p.k === 'peak').at, y: pads.find((p) => p.k === 'peak').y, ele: TOP.ele },
};
const pad = 6;
const map = {
  meta: {
    district: 'bukhansan',
    source: 'scripts/build-bukhansan.mjs, at 1/4 on the real place: the way from Bukhansan Ui Station to Baegundae, the peaks, the streams and the bare rock from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/bukhansan-osm.json); the ground from AWS Terrain Tiles (SRTM; scripts/data/bukhansan-dem.json), 1/4 above the station.',
    approx: [
      { what: "the mountain's outline", why: 'The real mountain has no edge here (it goes on to Goyang and Dobongsan): a 70 m band along the valley road and a box round the course and its peaks, the ground coming down to 0 over 45 m along it.' },
      { what: 'the peaks\' lift', why: 'The terrain tiles (30 m) round sharp peaks off: Baegundae, Insubong, Mangyeongdae and Yeongbong are lifted to OSM\'s surveyed heights over about 22 m round each.' },
      { what: 'the way\'s climb', why: 'Each stretch runs between the real heights of its two ends, eased to an even climb where the real one is steeper than a walk allows (paths 18°, the summit steps 31°).' },
      { what: 'the summit steps', why: 'OSM has steps for the middle of the gate-to-top stretch only; the whole stretch is drawn as steps with a handrail (really steel cables on bare rock).' },
      { what: 'level places', why: 'The plaza at the Visitor Support Center, Harujae, the hut\'s yard, the gate and the top are game-size level pads on their real spots.' },
      { what: 'Baegun Hut, the Visitor Support Center', why: 'On their OSM spots, drawn game-size and plain (no photos of them yet).' },
      { what: 'Information Center kiosk', why: 'Every district has one in the game. Put by the station where the road to the mountain starts.' },
    ],
    parts: [{ box: [Math.floor(Math.min(...fx) - pad), Math.floor(Math.min(...fz) - pad), Math.ceil(Math.max(...fx) + pad), Math.ceil(Math.max(...fz) + pad)] }],
  },
  roads,
  buildings: [{ h: 3.4, p: kiosk.p, n: 'info-bukhansan' }],
  areas: [{ k: 'park', p: foot, n: name('북한산국립공원', 'Bukhansan National Park', '北漢山国立公園', '北汉山国立公园') }],
  blockers: [{ p: foot, low: true, hill: 'bukhansan' }],
  pois: [],
  landmarks: [landmark],
};
{ const xs = roadStart.map((q) => q[0]).concat(kiosk.p.map((q) => q[0]), [14]), zs = roadStart.map((q) => q[1]).concat(kiosk.p.map((q) => q[1]), [-14, 14]); map.meta.parts.push({ box: [Math.floor(Math.min(...xs) - 6), Math.floor(Math.min(...zs) - 6), Math.ceil(Math.max(...xs) + 6), Math.ceil(Math.max(...zs) + 6)] }); }

// The station's exits (OSM), for region.json.
export const EXITS = osm.exits.map((e) => { const [x, z] = L(e.at); return { n: e.n, osm: e.id, at: [r1(x + OX), r1(z + OZ)], ry: Math.round(Math.atan2(-x, -z) * 1e4) / 1e4 }; }).sort((a, b) => a.n - b.n); // (the stairs go down towards the station's middle)

// --- Checks --------------------------------------------------------------------
const check = () => {
  const out = { OFFSET, BASE: r1(BASE), box: BOX, footPts: foot.length, grid: `${gw}×${gh}`, legs: report };
  out.walk = `${Math.round(report.reduce((s, r) => s + r.game, 0))} m (trail ${Math.round(report.slice(1).reduce((s, r) => s + r.game, 0))} m)`;
  out.peaks = landmark.peaks.map((p) => `${p.name} ${p.y}`);
  let top = 0; for (let x = gx0; x < gx0 + gw * CELL; x += 2) for (let z = gz0; z < gz0 + gh * CELL; z += 2) top = Math.max(top, bukhanHeight(landmark, x, z));
  out.highest = r1(top);
  out.summit = landmark.summit;
  out.pads = pads.map((p) => `${p.k} ${p.at} y${p.y}`);
  out.hut = hut; out.office = office;
  out.streams = streams.map((s) => `${s.name} ${s.p.length}`);
  out.rockCells = rock.reduce((s, v) => s + v, 0);
  out.exits = EXITS;
  out.roadStart = `${roadStart.length} pts, ${Math.round(lineLen(roadStart))} m`;
  return out;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(check(), null, 1));
  if (!process.argv.includes('--check')) {
    writeFileSync(path.join(R, 'districts', 'bukhansan.json'), JSON.stringify(map) + '\n');
    // The painted view from the top (game/bukhansan-view.js): the real skyline, as data.
    const hz = JSON.parse(readFileSync(path.join(root, 'scripts/data/bukhansan-horizon.json'), 'utf8'));
    writeFileSync(path.join(R, 'bukhansan-view.json'), JSON.stringify({ credit: 'Skyline from AWS Terrain Tiles (SRTM); the Han River © OpenStreetMap contributors (ODbL). scripts/data/bukhansan-horizon.json', n: hz.n, bands: hz.bands, ridge: hz.ridge, low: hz.low, han: hz.han, places: hz.places.filter((p) => p.k !== 'center') }) + '\n');
    console.log('kiosk (world)', [r1(kiosk.at[0] + OX), r1(kiosk.at[1] + OZ)]);
    console.log('wrote districts/bukhansan.json', Math.round(JSON.stringify(map).length / 1024), 'KB');
  }
}
