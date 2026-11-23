#!/usr/bin/env node
// Oksu (옥수, Seongdong-gu): Dalmaji Park (달맞이근린공원, also 달맞이봉공원),
// the wooded hill over the Han by Oksu Station, at 1/4 on its real place
// (Yozi 2026-11-23).
//
//   The hill: OSM's wood outline (the park itself is only a stub in OSM),
//     its height from the real ground (SRTM, scripts/data/oksu-dem.json) at
//     1/4 above Ttukseom-ro (the peak is about 80 m above the sea, the road
//     about 10 m: [[hill-slope-rule]]).
//   The ways up: every OSM footway, path, park road and stair inside the
//     wood. They are one network: where two meet they are at one height,
//     each kept under its own climb (paths about 19°, stairs about 32°).
//     The entrance stairs from Ttukseom-ro (the one Yozi marked, with the
//     park's name stone) and the stairs down to Oksu Station's side.
//   On the hill, from OSM: Photo Island A and B (포토아일랜드, the look-outs
//     over the Han), the gazebos (정자), the public toilet, the exercise
//     corners, the badminton court, the playground, the drinking fountains.
//   Ttukseom-ro (뚝섬로) along the hill's foot on its OSM line, from the
//     Seongsu side to Oksu Station.
//
// Data: scripts/data/oksu-osm.json (© OpenStreetMap contributors, ODbL) and
// scripts/data/oksu-dem.json. Made-up things are listed in meta.approx.
//
//   node scripts/build-oksu.mjs           writes districts/oksu.json
//   node scripts/build-oksu.mjs --check   prints the numbers only
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, toLatLon, anchorOffset } from '../src/core/seoul-grid.js';
import { inPoly, trailNear } from '../src/core/skypark-ground.js';
import { dalmajiHeight } from '../src/core/dalmaji-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/oksu-osm.json'), 'utf8'));
const dem = JSON.parse(readFileSync(path.join(root, 'scripts/data/oksu-dem.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

// The district's anchor: the park's entrance on Ttukseom-ro (the bottom of
// the entrance stairs, OSM 1548280367; Yozi marked it on the map).
const ENTRY_WAY = 1548280367;
const entryEnd = (() => { const w = osm.trails.find((t) => t.id === ENTRY_WAY).p; return w[w.length - 1]; })();
export const ANCHOR = { place: "Dalmaji Park's entrance stairs on Ttukseom-ro (Seongdong-gu)", lat: entryEnd[0], lon: entryEnd[1], local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const LP = (p) => p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);

export const OKSU = {
  pathMax: 0.34, // a path's climb: at most this rise per metre (about 19°)
  stairMax: 0.62, // the stairs (about 32°)
  trailW: 2.4, // m: the ways up (game-size, like Haneul Park's stairs)
  roadW: 12, // m: Ttukseom-ro
  islandSize: [5, 4], // m: a photo island's deck (game-size)
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
const band = (p, w) => p.slice(1).map((q, i) => { const a = p[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, nx = (-(q[1] - a[1]) / len) * w, nz = ((q[0] - a[0]) / len) * w, ex = ((q[0] - a[0]) / len) * w, ez = ((q[1] - a[1]) / len) * w; return [[[a[0] - ex + nx, a[1] - ez + nz], [q[0] + ex + nx, q[1] + ez + nz], [q[0] + ex - nx, q[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz], [a[0] - ex + nx, a[1] - ez + nz]]]; });

// --- Ttukseom-ro -------------------------------------------------------------
// Its OSM ways joined end to end: from the Seongsu side (east) past the
// entrance and Photo Island's foot to Oksu Station (west).
const ROAD_IDS = [83339274, 405486061, 519060517, 519060516, 519060515];
const roadLine = (() => {
  let line = [];
  for (const id of ROAD_IDS) {
    const p = LP(osm.road.find((r) => r.id === id).p);
    line = line.length ? line.concat(p.slice(1)) : p;
  }
  // from just east of the entrance (8 m: farther east, its box would cut
  // into Jungnangcheon's mouth, where base water stops 12 m short of a
  // district) past Oksu Station to Dongho-ro (world x -853), where the base
  // map's roads go on
  let cut = line.findIndex(([x]) => x + OX < -853);
  if (cut < 0) cut = line.length - 1;
  line = line.slice(0, cut + 1);
  let s = 0; while (line[s + 1] && line[s + 1][0] > 8) s++;
  const [a, b] = [line[s], line[s + 1]], t = (8 - a[0]) / (b[0] - a[0]);
  return R1(simplify([[8, a[1] + (b[1] - a[1]) * t], ...line.slice(s + 1)], 0.4));
})();

// --- The hill's outline ------------------------------------------------------
// OSM's wood (233523904), less Ttukseom-ro along its south-east foot.
const wood = LP(osm.wood.outer);
const footCut = polygonClipping.difference([wood.concat([wood[0]])], ...band(roadLine, OKSU.roadW / 2 + 2));
const foot = R1(simplifyRing(footCut.sort((q, r) => Math.abs(area(r[0])) - Math.abs(area(q[0])))[0][0], 0.4));

// --- The ground ----------------------------------------------------------------
const LL = (x, z) => toLatLon(x + OX, z + OZ);
function realY(x, z) {
  const { lat, lon } = LL(x, z);
  const r = (dem.lat1 - lat) / dem.step, c = (lon - dem.lon0) / dem.step;
  const i = Math.max(0, Math.min(dem.rows - 2, Math.floor(r))), j = Math.max(0, Math.min(dem.cols - 2, Math.floor(c))), fr = r - i, fc = c - j;
  const m = dem.m;
  return (m[i][j] * (1 - fc) + m[i][j + 1] * fc) * (1 - fr) + (m[i + 1][j] * (1 - fc) + m[i + 1][j + 1] * fc) * fr;
}
const xs = foot.map((p) => p[0]), zs = foot.map((p) => p[1]);
const RES = 2; // m: the working grid
const BX0 = Math.floor(Math.min(...xs) - 12), BZ0 = Math.floor(Math.min(...zs) - 12), BX1 = Math.ceil(Math.max(...xs) + 12), BZ1 = Math.ceil(Math.max(...zs) + 12);
const GW = Math.ceil((BX1 - BX0) / RES) + 1, GH = Math.ceil((BZ1 - BZ0) / RES) + 1;
let raw = new Float64Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) raw[j * GW + i] = realY(BX0 + i * RES, BZ0 + j * RES);
for (let pass = 0; pass < 3; pass++) { // smoothed (SRTM's 30 m cells, the trees and the flats next door)
  const o = new Float64Array(raw.length);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    let s = 0, n = 0;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue; s += raw[jj * GW + ii]; n++; }
    o[j * GW + i] = s / n;
  }
  raw = o;
}
const rawAt = (x, z) => { const u = (x - BX0) / RES, v = (z - BZ0) / RES; const i = Math.max(0, Math.min(GW - 2, Math.floor(u))), j = Math.max(0, Math.min(GH - 2, Math.floor(v))), fu = u - i, fv = v - j; return (raw[j * GW + i] * (1 - fu) + raw[j * GW + i + 1] * fu) * (1 - fv) + (raw[(j + 1) * GW + i] * (1 - fu) + raw[(j + 1) * GW + i + 1] * fu) * fv; };
// The road's height: along Ttukseom-ro below the hill.
const roadY = resample(roadLine, 3).filter(([x, z]) => polyDist(x, z, foot) < 25).map(([x, z]) => realY(x, z)).sort((a, b) => a - b);
const BASE = roadY[Math.floor(roadY.length / 2)];
const FADE = 6; // m inside the outline over which the ground comes down to 0
const hRaw = (x, z) => Math.max(0, (rawAt(x, z) - BASE) / 4);
const hFoot = (x, z) => (inPoly(x, z, foot) ? hRaw(x, z) * Math.min(1, polyDist(x, z, foot) / FADE) : 0);
let peak = { y: 0 };
for (let x = BX0; x <= BX1; x += 1) for (let z = BZ0; z <= BZ1; z += 1) { const y = hFoot(x, z); if (y > peak.y) peak = { x, z, y }; }

// --- The ways up -------------------------------------------------------------
// One network: OSM ways cut into 1.5 m steps, joined where they share a
// point; each point starts at the ground's height, then no step climbs
// more than its way allows (the lower envelope over the network), and a
// point off the hill stays at 0.
const STEP = 1.5;
const key = ([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`;
const nodes = new Map(); // key -> { x, z, y, fixed, edges: [[node, len, max]] }
const node = (q) => { const k = key(q); if (!nodes.has(k)) nodes.set(k, { x: q[0], z: q[1], edges: [] }); return nodes.get(k); };
const ways = [];
for (const t of osm.trails) {
  const p = LP(t.p);
  if (lineLen(p) < 0.5) continue;
  const steps = t.k === 'steps';
  const max = steps ? OKSU.stairMax : OKSU.pathMax;
  // (resampled between its own OSM points, so shared points stay shared)
  const pts = [p[0]];
  for (let i = 1; i < p.length; i++) { const seg = resample([p[i - 1], p[i]], STEP); pts.push(...seg.slice(1, -1), p[i]); }
  const ns = pts.map(node);
  for (let i = 1; i < ns.length; i++) { const a = ns[i - 1], b = ns[i], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 1e-6) continue; a.edges.push([b, len, max]); b.edges.push([a, len, max]); }
  ways.push({ id: t.id, k: t.k, name: t.name || null, boardwalk: t.surface === 'boardwalk', steps, ns });
}
for (const n of nodes.values()) {
  const inside = inPoly(n.x, n.z, foot) && polyDist(n.x, n.z, foot) > 0.3;
  n.fixed = !inside;
  n.y = inside ? hFoot(n.x, n.z) : 0;
}
// (smoothed along the network first, so the bumps of SRTM don't become steps)
for (let pass = 0; pass < 8; pass++) {
  const next = new Map();
  for (const n of nodes.values()) { if (n.fixed) continue; let s = n.y * 2, w = 2; for (const [m] of n.edges) { s += m.y; w++; } next.set(n, s / w); }
  for (const [n, v] of next) n.y = v;
}
for (let changed = true; changed;) { // the lower envelope (Bellman-Ford)
  changed = false;
  for (const n of nodes.values()) for (const [m, len, max] of n.edges) {
    const lim = Math.min(max, m.edges.find((e) => e[0] === n)?.[2] ?? max);
    if (m.y > n.y + lim * len + 1e-6) { m.y = n.y + lim * len; changed = true; }
  }
}

// The ways as trails (inside the outline; a little past it so they meet the
// ground below), and their bits outside it as walks on the flat.
const trails = [], walks = [];
const shared = new Set([...nodes.values()].filter((n) => n.edges.length > 2 || ways.filter((w) => w.ns.includes(n)).length > 1));
for (const w of ways) {
  const ins = w.ns.map((n) => !n.fixed);
  let i = 0;
  while (i < w.ns.length) {
    if (!ins[i]) { i++; continue; }
    let e = i; while (e < w.ns.length && ins[e]) e++;
    const run = w.ns.slice(Math.max(0, i - 1), Math.min(w.ns.length, e + 1));
    // (fewer points where the way is straight and its climb even; every
    // point another way meets is kept, so both are at one height there)
    const sAt = [0]; for (let k = 1; k < run.length; k++) sAt.push(sAt[k - 1] + Math.hypot(run[k].x - run[k - 1].x, run[k].z - run[k - 1].z));
    const flat = new Set(simplify(run.map((n, k) => [n.x, n.z, k]), 0.15).map((q) => q[2]));
    const even = new Set(simplify(run.map((n, k) => [sAt[k], n.y, k]), 0.05).map((q) => q[2]));
    const keep = run.filter((n, k) => flat.has(k) || even.has(k) || shared.has(n));
    if (run.length >= 2) trails.push({ id: w.id, n: w.name || w.k, w: OKSU.trailW, ...(w.steps ? { steps: true } : {}), ...(w.boardwalk ? { deck: true } : {}), p: keep.map((n) => [r1(n.x), r1(n.z), r1(Math.max(0, n.y))]) });
    i = e;
  }
  // outside: runs of fixed points longer than 4 m become walks (roads in the map)
  i = 0;
  while (i < w.ns.length) {
    if (ins[i]) { i++; continue; }
    let e = i; while (e < w.ns.length && !ins[e]) e++;
    const run = w.ns.slice(i, e).map((n) => [n.x, n.z]);
    // (not the pavements along Ttukseom-ro: the road is there already)
    const byRoad = run.filter(([x, z]) => lineDist(x, z, roadLine) < OKSU.roadW / 2 + 6).length > run.length / 3;
    if (lineLen(run) > 4 && !byRoad) walks.push({ id: w.id, name: w.name, p: R1(simplify(run, 0.4)) });
    i = e;
  }
}

// --- On the hill ---------------------------------------------------------------
const poi = (pred) => osm.pois.filter((n) => pred(n.tags)).map((n) => ({ id: n.id, at: R1([L([n.lat, n.lon])])[0], tags: n.tags }));
const trailAt = (x, z) => { let best = { d: Infinity, y: 0 }; for (const t of trails) { const n = trailNear(t, x, z); if (n.d < best.d) best = n; } return best; };
// Photo Island A and B: look-outs over the Han. OSM has their spots (and
// B's little roof); the decks' shape is game-size, facing the river.
const islands = poi((t) => t.tourism === 'viewpoint').map((v) => {
  const [x, z] = v.at, near = trailAt(x, z);
  const face = Math.atan2(1, 0.75); // (to the south-east: the Han and Dongho Bridge)
  return { name: v.tags.name, at: [x, z], y: r1(near.y), ry: r1(face), size: OKSU.islandSize };
});
const roofB = (() => { const b = osm.buildings.find((q) => q.id === 1563949913); return b ? R1(LP(b.p).slice(0, -1)) : null; })();
const gazebos = poi((t) => t.amenity === 'shelter').map((g) => ({ at: g.at, y: r1(Math.max(hFoot(...g.at), trailAt(...g.at).y)) }));
const toiletB = osm.buildings.find((q) => q.id === 1555874821);
const toilet = toiletB ? R1(LP(toiletB.p).slice(0, -1)) : null;
const fitness = [...poi((t) => t.leisure === 'fitness_station').map((f) => f.at), ...osm.areas.filter((a) => a.tags.leisure === 'fitness_station').map((a) => { const p = LP(a.p); return R1([[p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]])[0]; })];
const fountains = poi((t) => t.amenity === 'drinking_water').map((f) => f.at);
const pitch = osm.areas.filter((a) => a.tags.leisure === 'pitch').map((a) => R1(LP(a.p).slice(0, -1)))[0] || null;
const playground = osm.areas.filter((a) => a.tags.leisure === 'playground').map((a) => R1(LP(a.p).slice(0, -1)))[0] || null;
const benches = poi((t) => t.amenity === 'bench').map((b) => b.at);
// The name stone (달맞이 근린공원) by the entrance stairs, on the left going
// up (Yozi's photo): a little up the stairs and beside them.
const entry = trails.find((t) => t.id === ENTRY_WAY);
const stone = (() => {
  const p = entry.p, a = p[p.length - 1], b = p[p.length - 2], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len; // (up the stairs)
  const x = a[0] + ux * 3 - uz * 2.6, z = a[1] + uz * 3 + ux * 2.6; // 3 m up, 2.6 m to the left
  return { at: [r1(x), r1(z)], ry: r1(Math.atan2(-ux, -uz)) }; // (facing down the stairs, to the road)
})();

// The ground the game keeps: a grid eased into the ways.
const CELL = 4;
const gx0 = BX0, gz0 = BZ0, gw = Math.ceil((BX1 - BX0) / CELL) + 1, gh = Math.ceil((BZ1 - BZ0) / CELL) + 1;
const gm = [];
for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
  const x = gx0 + i * CELL, z = gz0 + j * CELL;
  let y = hFoot(x, z);
  for (const t of trails) { const n = trailNear(t, x, z); if (n.d < t.w / 2 + CELL) y = n.y + (y - n.y) * Math.min(1, Math.max(0, (n.d - t.w / 2) / (CELL * 1.5))); }
  gm.push(Math.max(0, Math.round(y * 10)));
}
const grid = { x0: gx0, z0: gz0, cell: CELL, w: gw, h: gh, m: gm };

// The Information Center: a small kiosk on Ttukseom-ro's north side by Oksu
// Station, where you come from the station to the park (made up: the real
// park has none; every district has one in the game).
const kiosk = (() => {
  const want = -78; let i = 1; while (roadLine[i + 1] && roadLine[i][0] > want) i++;
  const [a, b] = [roadLine[i - 1], roadLine[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
  const t = (want - a[0]) / (b[0] - a[0]), mx = a[0] + (b[0] - a[0]) * t, mz = a[1] + (b[1] - a[1]) * t;
  let nx = uz, nz = -ux; if (nz > 0) { nx = -nx; nz = -nz; } // (the side away from the river: north)
  const c = [mx + nx * (OKSU.roadW / 2 + 4.5), mz + nz * (OKSU.roadW / 2 + 4.5)], w = 7, d = 4.5;
  const p = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [c[0] + u * ux + v * nx, c[1] + u * uz + v * nz]);
  return { at: R1([c])[0], p: R1(p) };
})();

// --- The map ---------------------------------------------------------------------
const roads = [
  { k: 'secondary', w: OKSU.roadW, p: roadLine, n: { ko: '뚝섬로', en: 'Ttukseom-ro', ja: '纛島路', zh: '纛岛路' } },
  ...walks.map((w) => ({ k: 'walk', w: 3, p: w.p, ...(w.name ? { n: { ko: w.name, en: w.name } } : { n: { ko: '달맞이공원 산책로', en: 'Dalmaji Park path' } }) })),
];
const landmark = {
  type: 'dalmaji', x: 0, z: 0, grid, top: [], topH: 0, foot, trails, islands, roofB, gazebos, toilet, fitness, fountains, pitch, playground, benches, stone,
  peak: { at: [r1(peak.x), r1(peak.z)], y: r1(peak.y) },
};
const pad = 8;
const hillBox = [Math.floor(Math.min(...xs) - pad), Math.floor(Math.min(...zs) - pad), Math.ceil(Math.max(...xs) + pad), Math.ceil(Math.max(...zs) + pad)];
const map = {
  meta: {
    district: 'oksu',
    source: "scripts/build-oksu.mjs, at 1/4 on the real place: the wood's outline, the ways up, the look-outs, gazebos, toilet, exercise corners and Ttukseom-ro from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/oksu-osm.json); the hill from SRTM (scripts/data/oksu-dem.json). Gazebos, toilet and look-out decks are game-size.",
    approx: [
      { what: 'photo island decks', why: 'OSM has the two look-out spots (and a 7 m roof at B), not the decks: drawn as game-size decks facing the Han until Yozi sends photos.' },
      { what: 'name stone', why: "Placed from Yozi's photo of the entrance stairs (on the left going up); not in OSM." },
      { what: 'Information Center kiosk', why: 'Every district has one in the game; the real park has none. Put by Oksu Station on the way to the park.' },
      { what: 'forsythia', why: "Along the stairs on the river side, from Yozi's photo; where exactly they grow is not in OSM." },
    ],
    parts: [{ box: hillBox }],
  },
  roads,
  buildings: [{ h: 3.4, p: kiosk.p, n: 'info-oksu' }],
  areas: [{ k: 'park', p: foot, n: { ko: '달맞이근린공원', en: 'Dalmaji Park' } }],
  blockers: [{ p: foot, low: true, hill: 'dalmaji' }],
  pois: [],
  landmarks: [landmark],
};
// the road's parts: boxes along Ttukseom-ro, kept off the Han (the base
// river stops 12 m short of a district's boxes)
for (let i = 0; i < roadLine.length - 1;) {
  let e = i + 1, s = 0;
  while (e < roadLine.length - 1 && s < 30) { s += Math.hypot(roadLine[e + 1][0] - roadLine[e][0], roadLine[e + 1][1] - roadLine[e][1]); e++; }
  const pts = roadLine.slice(i, e + 1), h = OKSU.roadW / 2;
  map.meta.parts.push({ box: [Math.floor(Math.min(...pts.map((p) => p[0])) - h), Math.floor(Math.min(...pts.map((p) => p[1])) - h), Math.ceil(Math.max(...pts.map((p) => p[0])) + h), Math.ceil(Math.max(...pts.map((p) => p[1])) + h)] });
  i = e;
}
{ const xs2 = kiosk.p.map((q) => q[0]), zs2 = kiosk.p.map((q) => q[1]); map.meta.parts.push({ box: [Math.floor(Math.min(...xs2) - 2), Math.floor(Math.min(...zs2) - 2), Math.ceil(Math.max(...xs2) + 2), Math.ceil(Math.max(...zs2) + 2)] }); }
for (const w of walks) map.meta.parts.push({ box: [Math.floor(Math.min(...w.p.map((p) => p[0])) - 2), Math.floor(Math.min(...w.p.map((p) => p[1])) - 2), Math.ceil(Math.max(...w.p.map((p) => p[0])) + 2), Math.ceil(Math.max(...w.p.map((p) => p[1])) + 2)] });

// --- Checks --------------------------------------------------------------------
const check = () => {
  const out = { OFFSET, BASE: r1(BASE), peak: landmark.peak, footPts: foot.length, trails: trails.length, walks: walks.length, gridCells: gm.length };
  let steepPath = 0, steepStair = 0;
  for (const t of trails) for (let i = 1; i < t.p.length; i++) {
    const d = Math.hypot(t.p[i][0] - t.p[i - 1][0], t.p[i][1] - t.p[i - 1][1]); if (d < 1.5) continue;
    const s = Math.abs(t.p[i][2] - t.p[i - 1][2]) / d;
    if (t.steps) steepStair = Math.max(steepStair, s); else steepPath = Math.max(steepPath, s);
  }
  out.steepestPath = `${(Math.atan(steepPath) * 180 / Math.PI).toFixed(1)}°`;
  out.steepestStairs = `${(Math.atan(steepStair) * 180 / Math.PI).toFixed(1)}°`;
  let top = 0; for (let x = BX0; x < BX1; x += 1) for (let z = BZ0; z < BZ1; z += 1) top = Math.max(top, dalmajiHeight(landmark, x, z));
  out.highestWalk = r1(top);
  out.islands = islands.map((i) => `${i.name} ${i.at} y${i.y}`);
  out.gazebos = gazebos.length; out.fitness = fitness.length; out.parts = map.meta.parts.length;
  out.road = `${roadLine.length} pts, ${Math.round(lineLen(roadLine))} m`;
  out.kiosk = [r1(kiosk.at[0] + OX), r1(kiosk.at[1] + OZ)];
  return out;
};
console.log(check());
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'oksu.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/oksu.json', Math.round(JSON.stringify(map).length / 1024), 'KB');
}
