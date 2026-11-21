#!/usr/bin/env node
// The Namsan summit plaza on its real outline (Yozi 2026-11-19: "남산 타워
// 위쪽은 실제로 원 모양이 아닌데"). It was a level disc 28 m round the
// tower; the real one (OpenStreetMap, scripts/data/namsan-osm.json summit)
// is the tower's block with the wooden deck and paving east of it, the
// plaza north of it, and a strip running north-west past Palgakjeong to the
// beacon mounds and the cable car, with the buildings on its west side: at
// 1/4, about 7 m from the tower to the south, 20 m west and up to 33 m
// north-west.
//
// It writes the namsan landmark's `flatRad` (the level top's edge, N radii
// at the angles of `rad`: core/namsan-shape.js namsanFlat), the farthest
// part of the plaza along each angle plus a margin, never closer than the
// tower's terrace needs (MIN). Where OSM has no area (the north-west strip
// and the west side) the plaza is the hull of what stands there and the
// footways between them: `plazaApprox` lists those angles.
//
// The trails that came up to the old disc's edge are carried on, straight
// at the tower, to the new edge (`trailWhy`).
//
// Run after build-namsan-wall.mjs, before build-namsan-terrain.mjs:
//   node scripts/build-namsan-plaza.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const OSM = readJson(path.join(root, 'scripts', 'data', 'namsan-osm.json'));
const region = readJson(path.join(R, 'region.json'));
const itaewon = readJson(MAP);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const r1 = (v) => Math.round(v * 10) / 10;

export const NAMSAN_PLAZA = {
  margin: 1.5, // m past the plaza's farthest part along an angle (the railing stands inside it)
  min: 12, // m: never closer to the tower than this (its terrace and step reach 10.2 m: game/namsan-walk.js)
  path: 0.7, // m either side of a footway (2.8 m real)
  close: 1, // m: gaps narrower than twice this are filled
  palgak: 4.6, // m: Palgakjeong's stone base (game/namsan-walk.js PALGAK.steps[0])
};
const C = NAMSAN_PLAZA;

const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
const TX = hill.x + ox + hill.px, TZ = hill.z + oz + hill.pz; // the tower, world metres
const S = OSM.summit;
const rel = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - TX, z - TZ]; }; // (m from the tower)
const areas = Object.values(S.areas).map((w) => w.map(rel));
const near = Object.values(S.near).map((w) => w.map(rel));
const paths = S.paths.map((w) => w.map(rel));
const pg = OSM.palgakjeong.map(rel), pc = [pg.reduce((t, p) => t + p[0], 0) / pg.length, pg.reduce((t, p) => t + p[1], 0) / pg.length];

// Hulls where OSM has no area: the north-west strip (Palgakjeong's base, the
// beacon mounds, the love-lock kiosk and the footways among them) and the
// west side (its buildings and the tower block's west corner).
function hull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
const ring = (c, r, n = 16) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((2 * Math.PI * i) / n) * r, c[1] + Math.sin((2 * Math.PI * i) / n) * r]);
const block = areas[0]; // (the tower's block)
const nw = hull([...ring(pc, C.palgak), ...S.near.beacon.map(rel), ...S.near.lockShop.map(rel), ...paths.slice(0, 6).flat()]);
const west = hull([...S.near.commTower.map(rel), ...S.near.westBldg.map(rel), ...S.near.westBldg2.map(rel), block[0], block[1]]);

// The plaza on a 0.25 m grid round the tower.
const G = 0.25, H = 60, M = Math.round((2 * H) / G);
let mask = new Uint8Array(M * M);
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const polys = [...areas, nw, west];
for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
  const x = -H + (i + 0.5) * G, z = -H + (j + 0.5) * G;
  let on = polys.some((p) => inPoly(x, z, p));
  if (!on) for (const w of paths) { for (let k = 1; k < w.length && !on; k++) on = segD(x, z, w[k - 1], w[k]) < C.path; if (on) break; }
  if (on) mask[j * M + i] = 1;
}
// close: grow by C.close, then shrink by it (gaps between the parts fill in)
const morph = (src, grow) => {
  const k = Math.round(C.close / G), out = new Uint8Array(M * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    let v = grow ? 0 : 1;
    for (let dj = -k; dj <= k && v === (grow ? 0 : 1); dj++) for (let di = -k; di <= k; di++) {
      if (di * di + dj * dj > k * k) continue;
      const a = i + di, b = j + dj, s = a >= 0 && a < M && b >= 0 && b < M ? src[b * M + a] : 0;
      if (grow && s) { v = 1; break; }
      if (!grow && !s) { v = 0; break; }
    }
    out[j * M + i] = v;
  }
  return out;
};
mask = morph(morph(mask, true), false);

// Along each angle of the hill's outline: the plaza's farthest part.
const N = hill.rad.length, far = new Array(N).fill(0), approx = new Array(N).fill(false);
for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
  if (!mask[j * M + i]) continue;
  const x = -H + (i + 0.5) * G, z = -H + (j + 0.5) * G, d = Math.hypot(x, z);
  const k = Math.round((((Math.atan2(z, x) / (2 * Math.PI)) % 1 + 1) % 1) * N) % N;
  if (d > far[k]) { far[k] = d; approx[k] = !areas.some((p) => inPoly(x, z, p)); }
}
// a little smoothing (the largest of each angle and its neighbours, then an
// average of three), the margin, and the floor
const mx = far.map((_, i) => Math.max(far[(i + N - 1) % N], far[i], far[(i + 1) % N]));
const flatRad = mx.map((_, i) => r1(Math.max(C.min, (mx[(i + N - 1) % N] + mx[i] + mx[(i + 1) % N]) / 3 + C.margin)));
for (let i = 0; i < N; i++) {
  const a = (2 * Math.PI * i) / N;
  if (flatRad[i] > hill.rad[i] - 20) throw new Error(`the plaza at ${Math.round((a * 180) / Math.PI)}° leaves under 20 m of slope`);
}
const flatAt = (a) => { const t = ((((a / (2 * Math.PI)) % 1) + 1) % 1) * N, i = Math.floor(t) % N, f = t - Math.floor(t); return flatRad[i] * (1 - f) + flatRad[(i + 1) % N] * f; };

// The trails that reached the old disc: on, straight at the tower, to the new edge.
const was = hill.flatRad ? 'its last outline' : `${hill.flat || 28} m all round`, oldF = hill.flat || 28;
const trailWhy = [];
const carry = (run, name) => {
  const [ex, ez] = [run.at(-1)[0] - hill.px, run.at(-1)[1] - hill.pz], d = Math.hypot(ex, ez), a = Math.atan2(ez, ex), f = flatAt(a);
  if (d > oldF + 1 || d <= f - 0.5) return;
  const to = f - 1, n = Math.ceil((d - to) / 2);
  for (let q = 1; q <= n; q++) { const r = d - ((d - to) * q) / n; run.push([r1(hill.px + Math.cos(a) * r), r1(hill.pz + Math.sin(a) * r)]); }
  trailWhy.push(`${name}: carried on ${r1(d - to)} m straight at the tower, from the old plaza's edge (${r1(d)} m) to the real one`);
};
carry(hill.trail, 'the summit trail');
hill.wtrail.forEach((run, i) => run.length && carry(run, `the city wall trail run ${i}`));

hill.flatRad = flatRad;
hill.flat = Math.max(...flatRad); // (the farthest it reaches: things that only need a bound)
hill.plazaApprox = approx.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
hill.plazaWhy = `The summit plaza's level top follows the real plaza (OSM, scripts/data/namsan-osm.json summit) at 1/4, its farthest part along each angle plus ${C.margin} m, never under ${C.min} m (the tower's terrace). plazaApprox: angles (of ${N}) where it is a hull of the buildings and footways, as OSM has no area there.`;
if (trailWhy.length) hill.trailWhy = trailWhy;
writeFileSync(MAP, JSON.stringify(itaewon));

// ---------- Report ----------
const deg = (i) => Math.round((360 * i) / N);
const rs = flatRad.map((r, i) => [r, i]);
console.log(`Namsan plaza: the level top ${Math.min(...flatRad)}-${Math.max(...flatRad)} m from the tower (was ${was}); area ${Math.round(flatRad.reduce((t, r) => t + (Math.PI * r * r) / N, 0))} m²`);
console.log(`  south ${flatAt(Math.PI / 2).toFixed(1)} m, east ${flatAt(0).toFixed(1)}, north ${flatAt(-Math.PI / 2).toFixed(1)}, west ${flatAt(Math.PI).toFixed(1)}; farthest ${rs.reduce((b, q) => (q[0] > b[0] ? q : b))[0]} m at ${deg(rs.reduce((b, q) => (q[0] > b[0] ? q : b))[1])}°`);
console.log(`  approx (no OSM area): ${hill.plazaApprox.length} of ${N} angles`);
for (const w of trailWhy) console.log(`  ${w}`);
