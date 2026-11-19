#!/usr/bin/env node
// Namsan on its real ground (Yozi 2026-11-19: "원래 지형모양대로"): the hill
// keeps its real outline (l.rad), its height (56 m, the relief above the city
// at 1/4: tests/namsan.test.mjs) and the level summit plaza, but its slopes
// now follow the real ground, from an elevation model
// (scripts/data/namsan-dem.json: SRTM via AWS Terrain Tiles), instead of a
// round dome: the ridge from the summit down past the beacon mounds to the
// cable car, the long ridge east, the steep west side.
//
// Along each of the outline's angles, the real height between the foot (on
// the outline: ground 0 in the game) and the summit plaza's edge (the
// game's 56 m) is scaled to fit, so the foot meets the streets everywhere
// and the top stays where it is; the outline and the height are 1/4 of the
// real ones, so a slope is as steep as the real one.
//
// The trails' ways up (l.spur: the city wall trail from Baekbeom Square and
// the trail from Sowol-ro) then follow the new ground along them, smoothed
// and kept under MAX_DEG, instead of an even climb.
//
// Run after build-namsan-wall.mjs, before build-namsan-cable.mjs:
//   node scripts/build-namsan-terrain.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toLatLon } from '../src/core/seoul-grid.js';
import { namsanRadius, namsanShapeY, namsanGround, onNamsan } from '../src/core/namsan-shape.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const DEM = readJson(path.join(root, 'scripts', 'data', 'namsan-dem.json'));
const region = readJson(path.join(R, 'region.json'));
const itaewon = readJson(MAP);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const r1 = (v) => Math.round(v * 10) / 10;

export const NAMSAN_TERRAIN = {
  rings: 24, // rings from the plaza's edge to the foot
  smoothA: 2, // the foot's and the plaza edge's real heights, averaged over this many angles either side
  steepDeg: 32, // the hill's sides, ring to ring, no steeper than this (unless a side is too short for it)
  maxDeg: 18, // the trails' ways up are kept under this (the test allows 22°)
};
const C = NAMSAN_TERRAIN;

// The real height (m above the sea) at a world point, bilinear on the grid.
function elev(x, z) {
  const { lat, lon } = toLatLon(x, z);
  const fi = (DEM.lat1 - lat) / DEM.step, fj = (lon - DEM.lon0) / DEM.step;
  const i = Math.max(0, Math.min(DEM.rows - 2, Math.floor(fi))), j = Math.max(0, Math.min(DEM.cols - 2, Math.floor(fj)));
  const u = Math.min(1, Math.max(0, fi - i)), v = Math.min(1, Math.max(0, fj - j)), m = DEM.m;
  return (m[i][j] * (1 - v) + m[i][j + 1] * v) * (1 - u) + (m[i + 1][j] * (1 - v) + m[i + 1][j + 1] * v) * u;
}

const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
const HX = hill.x + ox, HZ = hill.z + oz, TX = HX + hill.px, TZ = HZ + hill.pz; // the foot's centre and the top, world metres
const N = hill.rad.length, n = C.rings, f = hill.flat || 0;
const at = (i, j) => { const a = (2 * Math.PI * i) / N, d = f + (j / n) * (namsanRadius(hill, a) - f); return [TX + Math.cos(a) * d, TZ + Math.sin(a) * d]; };
const raw = Array.from({ length: N }, (_, i) => Array.from({ length: n + 1 }, (_, j) => elev(...at(i, j))));
const avg = (col) => Array.from({ length: N }, (_, i) => { let s = 0; for (let k = -C.smoothA; k <= C.smoothA; k++) s += raw[(i + k + N) % N][col]; return s / (2 * C.smoothA + 1); });
const foot = avg(n), edge = avg(0), eTop = elev(TX, TZ); // (heights scaled between this angle's foot and the real top)
const k = [];
for (let i = 0; i < N; i++) for (let j = 0; j <= n; j++) {
  const t = j === 0 ? 1 : j === n ? 0 : (raw[i][j] - foot[i]) / Math.max(1, eTop - foot[i]);
  k.push(Math.round(Math.max(0, Math.min(1, t)) * 1000));
}
// No slope steeper than steepDeg (or than this angle's side needs, plus 3°:
// the west side is short), ring to ring, the top's edge held at 1 and the foot at 0.
for (let i = 0; i < N; i++) {
  const a = (2 * Math.PI * i) / N, dr = (namsanRadius(hill, a) - f) / n;
  const need = Math.atan(hill.h / (dr * n)) + (3 * Math.PI) / 180;
  const cap = (Math.tan(Math.max((C.steepDeg * Math.PI) / 180, need)) * dr * 1000) / hill.h; // (in thousandths, per ring)
  const v = (j) => i * (n + 1) + j;
  for (let it = 0; it < 200; it++) {
    let moved = false;
    for (let j = 1; j < n; j++) { const c = Math.max(k[v(j - 1)] - cap, Math.min(k[v(j - 1)] + cap, k[v(j)])); if (c !== k[v(j)]) { k[v(j)] = c; moved = true; } }
    for (let j = n - 1; j >= 1; j--) { const c = Math.max(k[v(j + 1)] - cap, Math.min(k[v(j + 1)] + cap, k[v(j)])); if (c !== k[v(j)]) { k[v(j)] = c; moved = true; } }
    if (!moved) break;
  }
  for (let j = 0; j <= n; j++) k[v(j)] = Math.round(Math.max(0, Math.min(1000, k[v(j)])));
}
hill.dem = { n, k };
delete hill.e; // (the dome's shape: unused with dem)

// ---------- The trails' ways up, on the new ground ----------
const bare = { ...hill, spur: null }; // the hill without them
const groundBare = (lx, lz) => { // (the hill's metres)
  const dx = lx - hill.px, dz = lz - hill.pz, a = Math.atan2(dz, dx), Rr = namsanRadius(hill, a);
  const r = Math.max(0, Math.hypot(dx, dz) - f) / (Rr - f);
  return r < 1 ? namsanShapeY(bare, r, a) : 0;
};
const maxRise = Math.tan((C.maxDeg * Math.PI) / 180);
let steepBefore = 0, cut = 0;
function fit(line, y0, y1) { // y0, y1: its height at each end (y0 null: 0 or lower)
  // the line's own points and every metre between them (a coarser line cuts
  // the bends' corners, and is steeper there)
  const pts = [line[0].slice(0, 2)];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(len));
    for (let q = 1; q <= k; q++) pts.push([a[0] + ((b[0] - a[0]) * q) / k, a[1] + ((b[1] - a[1]) * q) / k]);
  }
  const ds = pts.map((p, i) => (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0));
  const off = pts.map((p) => !onNamsan(hill, p[0], p[1]));
  const top = pts.map((p) => Math.hypot(p[0] - hill.px, p[1] - hill.pz) <= f); // (on the level plaza: h)
  let y = pts.map((p, i) => (off[i] ? 0 : groundBare(...p)));
  for (let i = 1; i < y.length; i++) if (ds[i] > 0.3) steepBefore = Math.max(steepBefore, Math.abs(y[i] - y[i - 1]) / ds[i]);
  y = y.map((_, i) => { let a = 0, c = 0; for (let q = Math.max(0, i - 4); q <= Math.min(y.length - 1, i + 4); q++) { a += y[q]; c++; } return a / c; });
  y[y.length - 1] = y1;
  // no steeper than maxDeg: clamp each metre to its neighbour, both ways, the
  // two ends held (the foot at 0, the plaza's edge at h), until it holds
  const last = y.length - 1, m = (i) => maxRise * ds[i]; // (between point i - 1 and i)
  if (Math.abs(y1 - (y0 ?? 0)) > maxRise * ds.reduce((t, d, i) => t + (off[i] ? 0 : d), 0)) throw new Error('a way up is too short for its climb');
  for (let it = 0; it < 2000; it++) {
    let moved = 0;
    for (let i = 1; i <= last; i++) { if (off[i] || top[i]) { y[i] = off[i] ? 0 : hill.h; continue; } const v = Math.max(y[i - 1] - m(i), Math.min(y[i - 1] + m(i), y[i])); moved = Math.max(moved, Math.abs(v - y[i])); y[i] = v; }
    y[last] = y1;
    for (let i = last - 1; i >= 0; i--) { if (off[i] || top[i]) { y[i] = off[i] ? 0 : hill.h; continue; } const v = Math.max(y[i + 1] - m(i + 1), Math.min(y[i + 1] + m(i + 1), y[i])); moved = Math.max(moved, Math.abs(v - y[i])); y[i] = v; }
    y[0] = y0 == null ? Math.min(y[0], 0) : y0;
    off.forEach((o, i) => { if (o) y[i] = 0; else if (top[i]) y[i] = hill.h; }); // (off the hill the street is at 0)
    if (moved < 1e-4) break;
    if (it === 1999) throw new Error('a way up could not be kept under maxDeg');
  }
  y = y.map((v) => Math.max(0, Math.min(hill.h, v)));
  let worst = 0;
  pts.forEach((p, i) => { worst = Math.max(worst, Math.abs(y[i] - (off[i] ? 0 : groundBare(...p)))); });
  cut = Math.max(cut, worst);
  console.log(`  a way of ${Math.round(ds.reduce((t, d) => t + d, 0))} m: cut or filled at most ${r1(worst)} m`);
  const out = [];
  pts.forEach((p, i) => out.push([r1(p[0]), r1(p[1]), Math.round(y[i] * 100) / 100]));
  return out;
}
// The trails on the hill (their decks: the summit trail and the city wall
// trail's runs): the ones that reach the summit plaza first, from the foot to
// its edge; then the others, between the heights at their two ends.
{
  const toPlaza = (run) => Math.hypot(run.at(-1)[0] - hill.px, run.at(-1)[1] - hill.pz) <= f + 1;
  const runs = [hill.trail, ...hill.wtrail];
  hill.spur.lines = runs.filter(toPlaza).map((run) => fit(run, null, hill.h));
  const G = (p) => namsanGround(hill, p[0], p[1]);
  for (const run of runs.filter((r) => !toPlaza(r))) hill.spur.lines.push(fit(run, G(run[0]), G(run.at(-1))));
}
writeFileSync(MAP, JSON.stringify(itaewon));

// ---------- Report ----------
const realTop = elev(TX, TZ);
console.log(`Namsan terrain: ${N} angles x ${n + 1} rings from the real ground; the real top ${Math.round(realTop)} m, foot ${Math.round(Math.min(...foot))}-${Math.round(Math.max(...foot))} m, plaza edge ${Math.round(Math.min(...edge))}-${Math.round(Math.max(...edge))} m above the sea`);
console.log(`  trails' ways up: the ground along them was up to ${Math.round((Math.atan(steepBefore) * 180) / Math.PI)}°, kept under ${C.maxDeg}°; cut or filled at most ${r1(cut)} m`);
