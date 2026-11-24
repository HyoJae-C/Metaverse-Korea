#!/usr/bin/env node
// Seoul National Cemetery (국립서울현충원, Dongjak-gu) at 1/4 on its real
// place (Yozi 2026-11-24). A place of remembrance: you walk and pay your
// respects; there is nothing to play and nothing to win.
//
//   The grounds: OSM's cemetery outline. Its ground is the real one (SRTM,
//     scripts/data/hyeonchungwon-dem.json) at 1/4 above the valley floor,
//     where the main gate, the fountain, the lawn, Hyeonchungmun and the
//     tower stand ([[hill-slope-rule]]). The valley floor is level (0).
//   The ways: every OSM road, path and stair inside, one network: where two
//     meet they are at one height, each under its own climb.
//   The burial plots (묘역): OSM's outlines. Rows of plain white headstones
//     with no names; no single grave is marked, the presidents' graves
//     neither (Yozi 2026-11-24).
//   Hyeonchungmun (현충문) and the Memorial Tower (현충탑) with the court
//     between them: the whole court at 50% (Yozi 2026-11-24: at 1/4 the
//     tower would be 3 m across), about the gate's middle, which stays on
//     its real spot. The court reaches back into plots 14, 16 and 18, which
//     are cut where it stands (meta.approx says by how much).
//   The entrance (the main gate on Hyeonchung-ro, the visitor office, the
//     Chungseong Fountain): level ground outside the hill's blocker, with
//     plain roads and buildings. The visitor office (종합민원실) is the
//     district's Information Center.
//
// Data: scripts/data/hyeonchungwon-osm.json (© OpenStreetMap contributors,
// ODbL) and scripts/data/hyeonchungwon-dem.json. Made-up things are listed
// in meta.approx.
//
//   node scripts/build-hyeonchungwon.mjs           writes districts/hyeonchungwon.json
//   node scripts/build-hyeonchungwon.mjs --check   prints the numbers only
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, toLatLon, anchorOffset } from '../src/core/seoul-grid.js';
import { inPoly } from '../src/core/skypark-ground.js';
import { hyeonchungHeight } from '../src/core/hyeonchung-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/hyeonchungwon-osm.json'), 'utf8'));
const dem = JSON.parse(readFileSync(path.join(root, 'scripts/data/hyeonchungwon-dem.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export const HC = {
  court: 2, // the gate, the tower and the court between them: 50% of real (2 x the map's 1/4)
  base: 17, // m above the sea: the valley floor (SRTM 15-20 m from the main gate to the tower)
  bias: 0.6, // game m taken off, so SRTM's noise on the valley floor is level ground
  fade: 10, // m inside the outline over which the ground comes down to 0
  roadMax: 0.25, // a road's climb: at most this rise per metre (about 14°)
  pathMax: 0.33, // a path (about 18°)
  stairMax: 0.6, // stairs (about 31°)
  w: { service: 3.2, pedestrian: 4, footway: 2.4, path: 2.4, steps: 2.4 }, // m: game-size (1/4 of a 7 m road is too narrow to walk)
  terraceH: 1.2, // m: the tower's terrace above the court
  terraceFront: 9, // m in front of the tower's middle where the terrace starts
  stairRun: 3, // m: the terrace's stairs
  stairW: 10,
  forecourt: [30, 9], // m: the paved court in front of the gate (across, deep)
  towerH: 15.5, fountainR: 3.4, fountainH: 8.4, flagH: 11, memorialScale: 0.5, back: { cell: 10, reach: 90, edge: 35, street: 26, ease: 30 }, // m: 31 m at 50%
  gateH: 6.5, // m to the ridge (about 13 m at 50%)
  buildingH: 3.4, // m: OSM gives no heights; game-size
};

// --- Coordinates -------------------------------------------------------------
const centroid = (p) => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };
const GATE_WAY = 154112554, TOWER_NAME = '현충탑';
const gateB = osm.buildings.find((b) => b.id === GATE_WAY), towerB = osm.buildings.find((b) => b.name === TOWER_NAME);
const gateLL = centroid(gateB.p.slice(0, -1));
// The district's anchor: the middle of Hyeonchungmun (OSM 154112554).
export const ANCHOR = { place: 'The middle of Hyeonchungmun, the gate before the Memorial Tower (Seoul National Cemetery, Dongjak-gu)', lat: +gateLL[0].toFixed(7), lon: +gateLL[1].toFixed(7), local: [0, 0], why: 'No nudge: the gate, the grounds, the roads and the plots are on their real places. The gate, the tower and the court between them are at 50% about the gate (Yozi 2026-11-24), so the tower stands 21 m behind its real spot.' };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const LP = (p) => p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);
const open = (p) => (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p.slice());
const closed = (p) => [...p, p[0]];

// --- Helpers -----------------------------------------------------------------
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
  const q = open(p);
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [a, b] = p[i], [c, d] = p[(i + 1) % p.length]; s += a * d - c * b; } return s / 2; };
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const polyDist = (x, z, p) => { let d = Infinity; for (let i = 0; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i], p[(i + 1) % p.length])); return d; };
const lineLen = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
function resample(p, step) {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}
const biggest = (mp) => mp.map((q) => q[0]).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
const bbox = (p) => [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];

// --- The court's frame ---------------------------------------------------------
// u: from the gate back to the tower; v: across (to the gate's left, seen
// from the front). The gate's middle is the origin.
const tower0 = centroid(LP(open(towerB.p)));
const AX = Math.hypot(tower0[0], tower0[1]);
const U = [tower0[0] / AX, tower0[1] / AX], V = [-U[1], U[0]];
const uv = (u, v) => [u * U[0] + v * V[0], u * U[1] + v * V[1]];
const toUV = ([x, z]) => [x * U[0] + z * U[1], x * V[0] + z * V[1]];
const rect = (u0, v0, u1, v1) => [uv(u0, v0), uv(u1, v0), uv(u1, v1), uv(u0, v1)];
const S = HC.court;
const T = ([x, z]) => [x * S, z * S];
const FRONT = Math.atan2(-U[0], -U[1]); // ry of things that face the front (the lawn and the main gate)

// --- The outline ---------------------------------------------------------------
const outline = LP(open(osm.boundary.outer));
// The entrance: level ground round the main gate, the visitor office and the
// fountain, outside the hill's blocker (world metres, then local).
const ENTRANCE = [[-1815, 1140], [-1800, 1118], [-1778, 1106], [-1728, 1166], [-1750, 1180], [-1775, 1171], [-1790, 1166], [-1808, 1153]].map(([x, z]) => [x - OX, z - OZ]);
// The big streets along the grounds (Hyeonchung-ro, Dongjak-daero: the base
// map's, scripts/data/seoul/roads.json) are 14 m wide in the game, wider than
// 1/4: the hill stops 16 m from their middle, so they run whole beside it.
const STREET_PAD = 16;
const streets = JSON.parse(readFileSync(path.join(root, 'scripts/data/seoul/roads.json'), 'utf8')).roads
  .map((w) => LP(w.p)).filter((p) => p.some(([x, z]) => x > -300 && x < 260 && z > -160 && z < 260));
const streetBands = streets.flatMap((p) => p.slice(1).map((q, i) => {
  const a = p[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, w = STREET_PAD, ex = ((q[0] - a[0]) / len) * w, ez = ((q[1] - a[1]) / len) * w, nx = -ez, nz = ex;
  return [[[a[0] - ex + nx, a[1] - ez + nz], [q[0] + ex + nx, q[1] + ez + nz], [q[0] + ex - nx, q[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz], [a[0] - ex + nx, a[1] - ez + nz]]];
}));
const foot = R1(simplifyRing(biggest(polygonClipping.difference([closed(outline)], [closed(ENTRANCE)], ...streetBands)), 0.4));
const inEntrance = (x, z) => inPoly(x, z, ENTRANCE) && inPoly(x, z, outline) && !streets.some((p) => p.slice(1).some((q, i) => segDist(x, z, p[i], q) < 12));

// --- The court at 50% ------------------------------------------------------------
// OSM's court (a hole in the cemetery's landuse, behind the gate) and the
// gate, scaled about the gate's middle; a paved forecourt in front.
const hole = osm.boundary.inner.map((r) => LP(open(r))).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
const gate0 = LP(open(gateB.p)).map(toUV);
const gateBox0 = [Math.min(...gate0.map((q) => q[0])), Math.min(...gate0.map((q) => q[1])), Math.max(...gate0.map((q) => q[0])), Math.max(...gate0.map((q) => q[1]))];
const gate = { at: [0, 0], ry: r2(FRONT), w: r1((gateBox0[3] - gateBox0[1]) * S), d: r1((gateBox0[2] - gateBox0[0]) * S), h: HC.gateH };
const tower = { at: R1([T(tower0)])[0], ry: r2(FRONT), h: HC.towerH, w: r1(Math.hypot(...[0, 1].map((k) => bbox(LP(open(towerB.p)))[k + 2] - bbox(LP(open(towerB.p)))[k])) / Math.SQRT2 * S) };
const uT = AX * S; // the tower's u
const [fw, fd] = HC.forecourt;
const courtAll = biggest(polygonClipping.union(
  [closed(hole.map(T))],
  [closed(rect(-gate.d / 2 - fd, -fw / 2, gate.d / 2 + 2, fw / 2))],
));
const uStair0 = uT - HC.terraceFront - HC.stairRun, uStair1 = uT - HC.terraceFront;
const BIG = 400;
const cut = (poly, u0, u1) => polygonClipping.intersection([closed(poly)], [closed(rect(u0, -BIG, u1, BIG))]);
const stairRect = rect(uStair0, -HC.stairW / 2, uStair1, HC.stairW / 2);
// the court (level, 0) up to the foot of the stairs
const courtLow = R1(simplifyRing(biggest(cut(open(courtAll), -BIG, uStair0)), 0.2));
const terrace = R1(simplifyRing(biggest(cut(open(courtAll), uStair1, BIG)), 0.2));
const courtRing = R1(simplifyRing(open(courtAll), 0.2));
// The lawn in front of the gate (겨레얼마당): the ground between OSM's roads
// from the fountain to the forecourt, level and open to walk on.
const lawn = R1(simplifyRing(biggest(polygonClipping.difference([closed([[-4, -31], [19, -45.5], [40, -37], [35, -3], [31, 3], [20, -1], [-4, -20]])], [closed(open(courtAll))])), 0.2));
const flats = [
  { k: 'court', y: 0, p: courtLow },
  { k: 'terrace', y: HC.terraceH, p: terrace },
  { k: 'lawn', y: 0, p: lawn },
];
const stairs = { id: 'terrace-stairs', k: 'steps', n: 'steps', w: HC.stairW, steps: true, court: true, p: [[...R1([uv(uStair0, 0)])[0], 0], [...R1([uv(uStair1, 0)])[0], HC.terraceH]] };
// The terrace's front wall, either side of the stairs (you go up by the stairs only).
const walls = (() => {
  const vs = terrace.map(toUV).filter(([u]) => Math.abs(u - uStair1) < 0.3).map(([, v]) => v);
  const v0 = Math.min(...vs), v1 = Math.max(...vs);
  return [[uv(uStair1, v0), uv(uStair1, -HC.stairW / 2)], [uv(uStair1, HC.stairW / 2), uv(uStair1, v1)]].map((s) => R1(s));
})();
// The altar and its incense burner in front of the tower; where you stand to pay your respects.
const altar = { at: R1([uv(uT - 5.2, 0)])[0], ry: r2(FRONT) };
const tribute = { at: R1([uv(uT - 7.4, 0)])[0], r: 2.6, face: r2(FRONT + Math.PI), y: HC.terraceH };

// --- The ground ------------------------------------------------------------------
const LLw = (x, z) => toLatLon(x + OX, z + OZ);
function realY(x, z) {
  const { lat, lon } = LLw(x, z);
  const r = (dem.lat1 - lat) / dem.step, c = (lon - dem.lon0) / dem.step;
  const i = Math.max(0, Math.min(dem.rows - 2, Math.floor(r))), j = Math.max(0, Math.min(dem.cols - 2, Math.floor(c))), fr = r - i, fc = c - j;
  const m = dem.m, at = (a, b) => Math.max(0, m[a][b]);
  return (at(i, j) * (1 - fc) + at(i, j + 1) * fc) * (1 - fr) + (at(i + 1, j) * (1 - fc) + at(i + 1, j + 1) * fc) * fr;
}
const [fx0, fz0, fx1, fz1] = bbox(foot);
const RES = 3; // m: the working grid
const BX0 = Math.floor(fx0 - 12), BZ0 = Math.floor(fz0 - 12), BX1 = Math.ceil(fx1 + 12), BZ1 = Math.ceil(fz1 + 12);
const GW = Math.ceil((BX1 - BX0) / RES) + 1, GH = Math.ceil((BZ1 - BZ0) / RES) + 1;
let raw = new Float64Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) raw[j * GW + i] = realY(BX0 + i * RES, BZ0 + j * RES);
for (let pass = 0; pass < 3; pass++) { // smoothed (SRTM's 30 m cells and the trees)
  const o = new Float64Array(raw.length);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    let s = 0, n = 0;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue; s += raw[jj * GW + ii]; n++; }
    o[j * GW + i] = s / n;
  }
  raw = o;
}
const rawAt = (x, z) => { const u = (x - BX0) / RES, v = (z - BZ0) / RES; const i = Math.max(0, Math.min(GW - 2, Math.floor(u))), j = Math.max(0, Math.min(GH - 2, Math.floor(v))), fu = u - i, fv = v - j; return (raw[j * GW + i] * (1 - fu) + raw[j * GW + i + 1] * fu) * (1 - fv) + (raw[(j + 1) * GW + i] * (1 - fu) + raw[(j + 1) * GW + i + 1] * fu) * fv; };
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const courtBox = bbox(courtRing);
const nearCourt = (x, z) => (x < courtBox[0] - 14 || x > courtBox[2] + 14 || z < courtBox[1] - 14 || z > courtBox[3] + 14 ? 99 : inPoly(x, z, courtRing) ? 0 : polyDist(x, z, courtRing));
const hSrtm = (x, z) => Math.max(0, (rawAt(x, z) - HC.base) / 4 - HC.bias);
// the ground: 0 at the outline, the court's own height at the court (eased over 12 m round it)
function hFoot(x, z) {
  if (!inPoly(x, z, foot)) return 0;
  let y = hSrtm(x, z) * Math.min(1, polyDist(x, z, foot) / HC.fade);
  const dc = nearCourt(x, z);
  if (inPoly(x, z, lawn)) return 0;
  const dl = x < -20 || x > 56 || z < -62 || z > 20 ? 99 : polyDist(x, z, lawn);
  if (dl < 10) y *= smooth(dl / 10);
  if (dc < 12) { const flatY = inPoly(x, z, terrace) || toUV([x, z])[0] > uStair1 ? HC.terraceH : 0; y = flatY + (y - flatY) * smooth(dc / 12); }
  return y;
}
let peak = { y: 0 };
for (let x = BX0; x <= BX1; x += 2) for (let z = BZ0; z <= BZ1; z += 2) { const y = hFoot(x, z); if (y > peak.y) peak = { x, z, y }; }

// --- The ways --------------------------------------------------------------------
// One network (as in build-oksu.mjs): OSM ways cut into 2 m steps, joined
// where they share a point; each point starts at the ground's height, then
// no step climbs more than its way allows; a point off the hill (the
// entrance, the streets) stays at 0, a point in the court at the court's.
const STEP = 2;
const key = ([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`;
const nodes = new Map();
const node = (q) => { const k = key(q); if (!nodes.has(k)) nodes.set(k, { x: q[0], z: q[1], edges: [] }); return nodes.get(k); };
const ways = [];
const inHole = (p) => p.every(([x, z]) => inPoly(x, z, hole) || polyDist(x, z, hole) < 1.5);
let courtWays = 0;
for (const t of osm.roads) {
  if (t.service === 'parking_aisle') continue;
  if (t.name === '현충로') continue; // (the pavement of Hyeonchung-ro: the base map has the road)
  const p = LP(t.p);
  if (lineLen(p) < 0.5) continue;
  if (inHole(p)) { courtWays++; continue; } // (the court's own paths: the court at 50% has its own paving)
  const max = t.k === 'steps' ? HC.stairMax : t.k === 'service' || t.k === 'pedestrian' ? HC.roadMax : HC.pathMax;
  const pts = [p[0]];
  for (let i = 1; i < p.length; i++) { const seg = resample([p[i - 1], p[i]], STEP); pts.push(...seg.slice(1, -1), p[i]); }
  const ns = pts.map(node);
  for (let i = 1; i < ns.length; i++) { const a = ns[i - 1], b = ns[i], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 1e-6) continue; a.edges.push([b, len, max]); b.edges.push([a, len, max]); }
  ways.push({ id: t.id, k: t.k, name: t.name || null, steps: t.k === 'steps', w: HC.w[t.k], ns });
}
for (const n of nodes.values()) {
  const inside = inPoly(n.x, n.z, foot) && polyDist(n.x, n.z, foot) > 0.3;
  const onCourt = inPoly(n.x, n.z, courtRing);
  n.out = !inside;
  n.court = onCourt;
  const onLawn = inPoly(n.x, n.z, lawn);
  n.fixed = !inside || onCourt || onLawn;
  n.y = !inside || onLawn ? 0 : onCourt ? (inPoly(n.x, n.z, terrace) ? HC.terraceH : 0) : hFoot(n.x, n.z);
}
for (let pass = 0; pass < 8; pass++) { // smoothed along the network, so SRTM's bumps don't become steps
  const next = new Map();
  for (const n of nodes.values()) { if (n.fixed) continue; let s = n.y * 2, w = 2; for (const [m] of n.edges) { s += m.y; w++; } next.set(n, s / w); }
  for (const [n, v] of next) n.y = v;
}
for (let changed = true; changed;) { // the lower envelope (Bellman-Ford)
  changed = false;
  for (const n of nodes.values()) for (const [m, len, max] of n.edges) {
    if (m.fixed) continue;
    const lim = Math.min(max, m.edges.find((e) => e[0] === n)?.[2] ?? max);
    if (m.y > n.y + lim * len + 1e-6) { m.y = n.y + lim * len; changed = true; }
  }
}
const trails = [stairs], walks = [];
const shared = new Set([...nodes.values()].filter((n) => n.edges.length > 2));
for (const w of ways) {
  const ins = w.ns.map((n) => !n.out && !n.court); // (not across the court: it is level paving, a deck of its own)
  let i = 0;
  while (i < w.ns.length) {
    if (!ins[i]) { i++; continue; }
    let e = i; while (e < w.ns.length && ins[e]) e++;
    const run = w.ns.slice(Math.max(0, i - 1), Math.min(w.ns.length, e + 1));
    const sAt = [0]; for (let k = 1; k < run.length; k++) sAt.push(sAt[k - 1] + Math.hypot(run[k].x - run[k - 1].x, run[k].z - run[k - 1].z));
    const flat = new Set(simplify(run.map((n, k) => [n.x, n.z, k]), 0.15).map((q) => q[2]));
    const even = new Set(simplify(run.map((n, k) => [sAt[k], n.y, k]), 0.06).map((q) => q[2]));
    const keep = run.filter((n, k) => flat.has(k) || even.has(k) || shared.has(n));
    if (run.length >= 2) trails.push({ id: w.id, k: w.k, n: w.name || w.k, w: w.w, ...(w.steps ? { steps: true } : {}), p: keep.map((n) => [r1(n.x), r1(n.z), r1(Math.max(0, n.y))]) });
    i = e;
  }
  i = 0;
  while (i < w.ns.length) { // outside the hill (the entrance): plain roads on the flat
    if (!w.ns[i].out) { i++; continue; }
    let e = i; while (e < w.ns.length && w.ns[e].out) e++;
    const run = w.ns.slice(i, Math.min(w.ns.length, e + 1)).map((n) => [n.x, n.z]);
    // (only the entrance's: a path that runs outside the grounds is not ours)
    const ours = run.filter(([x, z]) => inPoly(x, z, outline) || polyDist(x, z, outline) < 4).length >= run.length * 0.7;
    if (ours && lineLen(run) > 3) {
      const loop = Math.hypot(run[0][0] - run.at(-1)[0], run[0][1] - run.at(-1)[1]) < 0.5 && run.length > 4, h = Math.floor(run.length / 2);
      // (a round road is kept as two halves, so thinning its points keeps its shape)
      const p = loop ? [...simplify(run.slice(0, h + 1), 0.3), ...simplify(run.slice(h), 0.3).slice(1)] : simplify(run, 0.3);
      walks.push({ id: w.id, k: w.k, w: w.w, name: w.name, p: R1(p) });
    }
    i = e;
  }
}

// --- The plots ---------------------------------------------------------------------
// OSM's plot outlines (named 제N묘역 and the like). A plot inside a bigger
// one (the police plot lies over numbered ones) is kept once: smaller ones
// first, the rest of a bigger one only where nothing is yet. Nothing where
// the court stands. The presidents' graves and the single graves OSM marks
// are not drawn (Yozi 2026-11-24).
const SKIP_PLOT = /대통령/;
const courtCut = [closed(courtRing)];
const plots = [];
let taken = [], plotArea0 = 0, plotArea1 = 0;
const cutByCourt = [];
for (const pl of osm.plots.filter((q) => !SKIP_PLOT.test(q.name || '')).map((q) => ({ ...q, lp: LP(open(q.p)) })).sort((a, b) => Math.abs(area(a.lp)) - Math.abs(area(b.lp)))) {
  const a0 = Math.abs(area(pl.lp));
  if (!pl.lp.some(([x, z]) => inPoly(x, z, foot))) continue;
  let rest = polygonClipping.difference([closed(pl.lp)], ...(taken.length ? [taken] : []));
  const aOwn = rest.reduce((s, q) => s + Math.abs(area(q[0])), 0);
  if (aOwn < a0 * 0.3) continue; // (it is the plots already in it)
  plotArea0 += aOwn;
  const less = polygonClipping.difference(rest, courtCut);
  const aLeft = less.reduce((s, q) => s + Math.abs(area(q[0])), 0);
  if (aLeft < aOwn - 0.5) cutByCourt.push({ name: pl.name, was: Math.round(aOwn), now: Math.round(aLeft) });
  for (const q of less) {
    const ring = R1(simplifyRing(open(q[0]), 0.2));
    if (Math.abs(area(ring)) < 12) continue;
    plotArea1 += Math.abs(area(ring));
    // the rows run along the plot's longest side
    let best = 0, ang = 0;
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > best) { best = d; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    plots.push({ n: pl.name, p: ring, a: r2(ang) });
  }
  taken = polygonClipping.union(taken.length ? taken : [closed(pl.lp)], [closed(pl.lp)]);
}

// --- Water, lawns, buildings ----------------------------------------------------------
const yAt = (x, z) => hFoot(x, z);
const water = osm.water.map((w) => { const p = R1(simplifyRing(LP(open(w.p)), 0.3)); const ys = p.map(([x, z]) => yAt(x, z)); return { n: w.name || null, p, y: r1(Math.min(...ys)) }; });
const lawns = osm.grass.filter((g) => !SKIP_PLOT.test(g.name || '')).map((g) => R1(simplifyRing(LP(open(g.p)), 0.3))).filter((p) => p.some(([x, z]) => inPoly(x, z, foot)) && !p.some(([x, z]) => inPoly(x, z, courtRing)));
const INFO_NAME = '종합민원실';
const buildings = [], hillBuildings = [];
let info = null;
for (const b of osm.buildings) {
  if (b.id === GATE_WAY || b.name === TOWER_NAME || b.historic === 'tomb') continue;
  const p = R1(LP(open(b.p))), [cx, cz] = centroid(p);
  if (inPoly(cx, cz, courtRing) || Math.abs(area(p)) < 6) continue;
  const h = b.tourism === 'museum' || b.name === '현충관' ? 4.6 : HC.buildingH;
  if (inPoly(cx, cz, foot)) hillBuildings.push({ p, h, y: r1(Math.min(...p.map(([x, z]) => yAt(x, z)))), ...(b.name ? { n: b.name } : {}) });
  else if (inEntrance(cx, cz)) {
    if (b.name === INFO_NAME) { info = { p, at: [r1(cx), r1(cz)] }; buildings.push({ h: 3.6, p, n: 'info-hyeonchungwon' }); }
    else buildings.push({ h: HC.buildingH, p });
  }
}
// The Chungseong Fountain (충성분수대): OSM has its spot; the round road round it is OSM's.
const fountainN = osm.pois.find((n) => n.tags.name === '충성분수대');
const fountain = { at: R1([L([fountainN.lat, fountainN.lon])])[0], r: HC.fountainR, h: HC.fountainH };
// The Taegeukgi on a tall pole beside the forecourt (the real flags stand on the lawn's edge left of the gate).
const flagAt = (() => { // on the lawn, 2.5 m out from the forecourt's front edge and 5 m in from its end
  const e = lawn.map((p, i) => [p, lawn[(i + 1) % lawn.length]]).filter(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 10).sort((m, n) => segDist(0, 0, ...m) - segDist(0, 0, ...n))[0];
  const [p, q] = e, len = Math.hypot(q[0] - p[0], q[1] - p[1]), d = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
  return [1, -1].flatMap((s) => [5, len - 5].map((t) => [p[0] + d[0] * t - d[1] * 2.5 * s, p[1] + d[1] * t + d[0] * 2.5 * s])).find(([x, z]) => inPoly(x, z, lawn));
})();
const flag = { at: R1([flagAt])[0], h: HC.flagH, ry: r2(FRONT) };
// Memorials on their OSM spots (Yozi 2026-11-24, from the photos): each is set just off the way it stands by,
// facing that way (OSM has a point only), and drawn at HC.memorialScale of its real size (at 1/4 an arch 6 m
// high would be shorter than you). `size` is its footprint in game m (across, deep).
const NM = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const waySegs = trails.flatMap((t) => t.p.slice(1).map((q, i) => [t.p[i], q]));
const MEMORIALS = [
  { id: 'student-unknown', osm: '학도의용군무명용사탑', size: [6.2, 4.2], n: NM('학도의용군 무명용사탑', 'Tower of the Unknown Student Volunteer Soldiers', '学徒義勇軍無名勇士塔', '学徒义勇军无名勇士塔') },
  { id: 'chungyeoldae', osm: '충열대', size: [8, 6.4], n: NM('충열대', 'Chungyeoldae (altar of the patriots)', '忠烈台', '忠烈台') },
];
const memorials = MEMORIALS.map((m) => {
  const poi = osm.pois.find((q) => q.tags.name === m.osm);
  const real = LP([[poi.lat, poi.lon]])[0];
  const gap = (x, z) => Math.min(...trails.flatMap((t) => t.p.slice(1).map((q, i) => segDist(x, z, t.p[i], q) - t.w / 2))); // m to the nearest way's edge
  const half = Math.max(m.size[0], m.size[1]) / 2;
  let best = null;
  // every spot just off a way near the OSM point, on either side: the nearest one that is clear of all ways, the court and the lawn
  for (const t of trails) for (let i = 1; i < t.p.length; i++) {
    const a = t.p[i - 1], b = t.p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    if (segDist(real[0], real[1], a, b) > 16) continue;
    for (let k = 0; k <= len; k += 0.5) for (const sgn of [1, -1]) {
      const off = t.w / 2 + m.size[1] / 2 + 0.8, nx = -dz * sgn, nz = dx * sgn;
      const x = a[0] + dx * k + nx * off, z = a[1] + dz * k + nz * off, d = Math.hypot(x - real[0], z - real[1]);
      if (best && d >= best.d) continue;
      if (gap(x, z) < m.size[1] / 2 + 0.6 || !inPoly(x, z, foot) || polyDist(x, z, foot) < half || inPoly(x, z, courtRing) || polyDist(x, z, courtRing) < half + 1 || inPoly(x, z, lawn)) continue;
      // (its ends must clear the ways too)
      if ([1, -1].some((e) => gap(x + dx * e * m.size[0] / 2, z + dz * e * m.size[0] / 2) < 0.3)) continue;
      best = { d, at: [x, z], n: [nx, nz] };
    }
  }
  return { id: m.id, n: m.n, at: R1([best.at])[0], ry: r2(Math.atan2(-best.n[0], -best.n[1])), s: HC.memorialScale, size: m.size, nudge: r1(best.d) };
});

// The main gate on Hyeonchung-ro: on the entrance road (OSM 154112497), 9 m in from the street's middle.
const ENTRY_WAY = 154112497;
const mainGate = (() => {
  const p = resample(LP(osm.roads.find((r) => r.id === ENTRY_WAY).p), 1), a = p[9], b = p[7];
  return { at: R1([a])[0], ry: r2(Math.atan2(b[0] - a[0], b[1] - a[1])), w: 12 }; // (facing the street)
})();

// The ground the game keeps: a grid eased into the ways (core/hyeonchung-ground.js).
const CELL = 4;
const gw = Math.ceil((BX1 - BX0) / CELL) + 1, gh = Math.ceil((BZ1 - BZ0) / CELL) + 1;
const gm = [];
for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) gm.push(Math.max(0, Math.round(hFoot(BX0 + i * CELL, BZ0 + j * CELL) * 10)));
const grid = { x0: BX0, z0: BZ0, cell: CELL, w: gw, h: gh, m: gm };

// --- The ridge behind ----------------------------------------------------------------
// Past the grounds the land is closed (nothing built, you can't walk there).
// It is drawn as the wooded ridge that stands round the cemetery (Seodalsan):
// SRTM at 1/4 like the hill, out to BACK.reach m from the hill's foot, sinking
// to 0 at its far edge, at the big streets, at the entrance and at any way
// that runs along the foot. Seen only (game/hyeonchungwon-park.js draws it as
// one mesh of treetops); nothing stands on it.
const BACK = HC.back;
const trailSegs = trails.flatMap((t) => t.p.slice(1).map((q, i) => [t.p[i], q]));
function hBack(x, z) {
  if (inPoly(x, z, foot)) return 0;
  const dOut = polyDist(x, z, foot);
  if (dOut > BACK.reach) return 0;
  let k = smooth((BACK.reach - dOut) / BACK.edge);
  let ds = Infinity;
  for (const p of streets) for (let i = 1; i < p.length; i++) ds = Math.min(ds, segDist(x, z, p[i - 1], p[i]));
  k *= smooth((ds - BACK.street) / BACK.ease);
  if (!k) return 0;
  k *= inPoly(x, z, ENTRANCE) ? 0 : smooth((polyDist(x, z, ENTRANCE) - 6) / 20);
  let dt = Infinity;
  for (const [p0, p1] of trailSegs) { if (Math.abs(p0[0] - x) > 14 && Math.abs(p1[0] - x) > 14) continue; dt = Math.min(dt, segDist(x, z, p0, p1)); }
  k *= smooth((dt - 3) / 8);
  if (!k) return 0;
  let y = 0;
  for (const [a, b] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]) y += realY(x + a, z + b) / 5; // (SRTM's cells, smoothed)
  return Math.max(0, (y - HC.base) / 4 - HC.bias) * k;
}
const KX0 = Math.floor(fx0 - BACK.reach), KZ0 = Math.floor(fz0 - BACK.reach);
const kw = Math.ceil((fx1 + BACK.reach - KX0) / BACK.cell) + 1, kh = Math.ceil((fz1 + BACK.reach - KZ0) / BACK.cell) + 1;
const km = [];
for (let j = 0; j < kh; j++) for (let i = 0; i < kw; i++) km.push(Math.round(hBack(KX0 + i * BACK.cell, KZ0 + j * BACK.cell)));
const ridge = { x0: KX0, z0: KZ0, cell: BACK.cell, w: kw, h: kh, m: km }; // (whole metres)

// --- The map -----------------------------------------------------------------------
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const roads = walks.map((w) => ({ k: 'walk', w: w.w, p: w.p, n: N('현충원 길', 'Cemetery road', '顕忠院の道', '显忠院道路') }));
const landmark = {
  type: 'hyeonchung', x: 0, z: 0, grid, foot, trails, flats, court: courtRing, walls, gate, tower, altar, tribute, stairs: { w: HC.stairW, p: stairs.p },
  plots: plots.map(({ p, a }) => ({ p, a })), water, lawns, buildings: hillBuildings, fountain, mainGate,
  ridge, flag, memorials,
  note: 10, // m: how near the main gate the note shows
  peak: { at: [r1(peak.x), r1(peak.z)], y: r1(peak.y) },
};
const pad = 6;
const box = (p, m = pad) => { const [a, b, c, d] = bbox(p); return [Math.floor(a - m), Math.floor(b - m), Math.ceil(c + m), Math.ceil(d + m)]; };
const map = {
  meta: {
    district: 'hyeonchungwon',
    source: "scripts/build-hyeonchungwon.mjs, at 1/4 on the real place: the cemetery's outline, roads, paths, stairs, burial plots, water, lawns and buildings from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/hyeonchungwon-osm.json); the ground from SRTM (scripts/data/hyeonchungwon-dem.json). Roads are game-size wide (3.2 m), buildings game-size high (OSM has no heights).",
    approx: [
      { what: 'Hyeonchungmun, the Memorial Tower and the court between them at 50%', why: `Yozi 2026-11-24: the whole court at 50% about the gate's middle (at 1/4 the tower is 3 m across). The gate is on its real spot; the tower stands ${r1(AX * (S - 1))} m behind its real one, and the court covers ${Math.round(Math.abs(area(courtRing)))} m² (OSM's court at 1/4: ${Math.round(Math.abs(area(hole)))} m²).` },
      { what: 'plots cut by the court', why: cutByCourt.map((c) => `${c.name} ${c.was} -> ${c.now} m²`).join(', ') },
      { what: 'forecourt, terrace, stairs, altar', why: "OSM has the court's outline, the gate and the tower only. The paved forecourt in front of the gate, the tower's terrace (1.2 m up), its stairs, the altar and the incense burner are laid out from Yozi's photos." },
      { what: 'gate and tower shapes', why: "From Yozi's photos (the gate: blue-green tiled roof on white columns with two low wings; the tower: a tall granite shaft on a stepped base): outlines and heights are approximate (tower 31 m real, 15.5 m here)." },
      { what: 'Chungseong Fountain', why: `OSM has its spot and the round road; the two basins, the jets and the bronze figures with the flag are from Yozi's photos. ${HC.fountainR * 2} m across (it fills the island inside the round road) and ${HC.fountainH} m high.` },
      { what: 'ridge behind the grounds', why: `The closed land within ${HC.back.reach} m of the hill is drawn as a wooded ridge (SRTM at 1/4, sinking to 0 at its far edge and at the streets). The real ridge is there, but its far slope is homes, not wood; you see it only, nothing stands on it.` },
      { what: 'wood inside the grounds and the trees round the court', why: 'Every slope that is not a plot, a lawn, a way or a building is drawn as wood (one mesh of treetops; the aerial photo shows wood round the plots, OSM has no outline for it). Two rows of tall trees stand along the court behind the gate, as in the photos; their spots are made up, and no headstones are drawn within 9 m of the court there.' },
      ...memorials.map((m) => ({ what: `memorial: ${m.n.en}`, why: `OSM has its point only. It stands ${m.nudge} m from that point, just off the way, facing the way (its real bearing is not in OSM), at ${HC.memorialScale * 100}% of its real size (estimated from Yozi's photo, not measured); its shape is from the photo.` })),
      { what: 'Taegeukgi', why: `One flag on a ${HC.flagH} m pole beside the forecourt; the real flags stand on the lawn's edge, their exact spots are not in OSM.` },
      { what: 'headstones', why: 'Rows of plain white stones on a 2.6 x 2 m grid inside each OSM plot: the real rows and their number are not in OSM. No names, no single graves.' },
      { what: 'lawn in front of the gate (겨레얼마당)', why: `The ground between OSM's roads from the fountain to the forecourt (${Math.round(Math.abs(area(lawn)))} m²), level and open to walk on; OSM has no outline for it.` },
      { what: 'entrance', why: 'The ground round the main gate, the visitor office and the fountain is drawn level (the real ground there is within about 1 m).' },
      { what: 'bank at the edge road', why: 'The hill fades to 0 over 4 m at its foot, but a road keeps its own height: where the ring road runs on the foot (9 places on the Hyeonchung-ro side, where the foot is cut 16 m back from the street) a bank of 0.7 to 3.2 m is left. Kept as an exception (Yozi 2026-11-24): fix later if needed by lowering those stretches.' },
    ],
    parts: [{ box: box(outline) }],
  },
  roads,
  buildings,
  areas: [
    { k: 'park', p: R1(simplifyRing(outline, 0.4)), n: N('국립서울현충원', 'Seoul National Cemetery', '国立ソウル顕忠院', '国立首尔显忠院') },
  ],
  blockers: [{ p: foot, low: true, hill: 'hyeonchung' }],
  pois: [],
  landmarks: [landmark],
};

// --- Checks ------------------------------------------------------------------------
const check = () => {
  const out = { OFFSET, axis: r1(AX), gate, tower, court: Math.round(Math.abs(area(courtRing))), hole: Math.round(Math.abs(area(hole))), courtWays, peak: landmark.peak, footPts: foot.length, trails: trails.length, trailPts: trails.reduce((s, t) => s + t.p.length, 0), walks: walks.length, plots: plots.length, plotArea: [Math.round(plotArea0), Math.round(plotArea1)], cutByCourt, hillBuildings: hillBuildings.length, buildings: buildings.length, info, water: water.map((w) => `${w.n} y${w.y}`), lawns: lawns.length, gridCells: gm.length, fountain, mainGate };
  let steepRoad = 0, steepPath = 0, steepStair = 0;
  for (const t of trails) for (let i = 1; i < t.p.length; i++) {
    const d = Math.hypot(t.p[i][0] - t.p[i - 1][0], t.p[i][1] - t.p[i - 1][1]); if (d < 1.5) continue;
    const s = Math.abs(t.p[i][2] - t.p[i - 1][2]) / d;
    if (t.steps) steepStair = Math.max(steepStair, s); else if (t.k === 'service' || t.k === 'pedestrian') steepRoad = Math.max(steepRoad, s); else steepPath = Math.max(steepPath, s);
  }
  const deg = (s) => `${(Math.atan(s) * 180 / Math.PI).toFixed(1)}°`;
  out.steepest = { road: deg(steepRoad), path: deg(steepPath), stairs: deg(steepStair) };
  let top = 0; for (const t of trails) for (const q of t.p) top = Math.max(top, hyeonchungHeight(landmark, q[0], q[1]));
  out.highestWalk = r1(top);
  out.trailLen = Math.round(trails.reduce((s, t) => s + lineLen(t.p), 0));
  return out;
};
console.log(JSON.stringify(check(), null, 1));
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'hyeonchungwon.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/hyeonchungwon.json', Math.round(JSON.stringify(map).length / 1024), 'KB');
}
