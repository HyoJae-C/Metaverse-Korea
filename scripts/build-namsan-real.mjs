#!/usr/bin/env node
// Namsan on its real outline at 1/4 (Yozi 2026-11-11: "산은 엄청 디테일하게
// 안 그려도 돼"), with its trail from Sowol-ro up past the tower.
//
//   - The foot: the real hill's edge (OpenStreetMap's 남산공원 wood, way
//     244397333), as radii round the top (namsan landmark `rad`,
//     core/namsan-shape.js), smoothed, and pulled in wherever it would
//     reach a road, a building or a shop door of the game (they are where
//     the real ones are, but wider). Top, height (65 m) and tower stay.
//   - The profile: e = 1.5, a mountain whose slope eases off at its foot
//     (the old dome was a wall there), so a trail can start up it.
//   - The trail (남산 산책로, with --trail): the real steps and paths from
//     Sowol-ro above Gyeongnidan-gil up to beside the tower (OSM ways
//     369969790, 1069104064-6, 1544980094), the namsan landmark's `trail`
//     (game/namsan-walk.js walks it, core/landmarks.js draws it), and a walk
//     road (marked "nw") for the map and guides. Its top comes out on the
//     summit plaza by its back gate.
//   - The cable car's pylons stand on the new ground; the made-up trail from
//     Itaewon stops at the new foot.
//
// Real data: scripts/data/namsan-outline-osm.json (© OpenStreetMap
// contributors, ODbL). Run after scripts/build-namsan.mjs and
// scripts/build-itaewon.mjs:
//   node scripts/build-namsan-real.mjs [--trail]   rewrites districts/itaewon.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { namsanGround, onNamsan } from '../src/core/namsan-shape.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const region = readJson(path.join(R, 'region.json'));
const stores = readJson(path.join(R, 'stores.json')).stores;
const osm = readJson(path.join(root, 'scripts', 'data', 'namsan-outline-osm.json'));
const itaewon = readJson(MAP);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const WITH_TRAIL = process.argv.includes('--trail');

export const E = 1.5; // the hill's profile (0.5 was the dome)
export const FLAT = 28; // m round the top kept level: the summit plaza (26 m) and its edge
export const N = 120; // radii round the top (every 3°)
const CLEAR = 4; // m: the foot keeps this far off road edges, buildings and doors
const TRAIL_W = 3;

const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
const top = [hill.x + ox + hill.px, hill.z + oz + hill.pz]; // world: the tower
const ang = (i) => (i / N) * Math.PI * 2;

// ---------- The real outline as radii round the top ----------
const park = osm.park.map((p) => toGame(...p));
function farthestHit(a) {
  const d = [Math.cos(a), Math.sin(a)];
  let best = 0;
  for (let i = 1; i < park.length; i++) {
    const [p, q] = [park[i - 1], park[i]], e = [q[0] - p[0], q[1] - p[1]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-9) continue;
    const w = [p[0] - top[0], p[1] - top[1]];
    const t = (w[0] * e[1] - w[1] * e[0]) / den, s = (w[0] * d[1] - w[1] * d[0]) / den;
    if (t > 0 && s >= 0 && s <= 1) best = Math.max(best, t);
  }
  return best;
}
const real = Array.from({ length: N }, (_, i) => farthestHit(ang(i)));
// Smoothed (a hill, not the wood's every corner): a circular average over ±12°.
const W = 4;
const smooth = (a) => a.map((_, i) => { let s = 0; for (let k = -W; k <= W; k++) s += a[(i + k + N) % N]; return s / (2 * W + 1); });
const want = smooth(real);

// ---------- What the foot must keep clear of (world metres) ----------
const isTrail = (r) => r.nw || (r.it && r.n?.en === 'Namsan trail');
const obstacles = []; // [x, z, r]: points with a radius
const addLine = (p, w) => {
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 2));
    for (let k = 0; k <= n; k++) obstacles.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, w / 2 + CLEAR]);
  }
};
for (const d of region.districts) {
  let m;
  try { m = readJson(path.join(R, 'districts', `${d.id}.json`)); } catch { continue; }
  if (d.id === 'itaewon') m = itaewon;
  const [dx, dz] = d.offset, w = (p) => p.map(([x, z]) => [x + dx, z + dz]);
  for (const r of m.roads || []) if (!isTrail(r)) addLine(w(r.p), r.w || 6);
  for (const b of m.buildings || []) { const p = w(b.p); addLine([...p, p[0]], 0); }
  for (const l of m.landmarks || []) if (!['namsan', 'cablecar'].includes(l.type) && Number.isFinite(l.x)) obstacles.push([l.x + dx, l.z + dz, 12]);
}
for (const r of region.links || []) addLine(r.p, r.w || 6);
for (const s of stores) if (Array.isArray(s.at)) obstacles.push([s.at[0], s.at[1], 6 + CLEAR]);
// The nearest obstacle along each ray (anything within a 3° wedge's width).
const free = Array.from({ length: N }, (_, i) => {
  const a = ang(i), d = [Math.cos(a), Math.sin(a)];
  let best = Infinity;
  for (const [x, z, rad] of obstacles) {
    const v = [x - top[0], z - top[1]], t = v[0] * d[0] + v[1] * d[1];
    if (t <= 0) continue;
    const off = Math.abs(v[0] * d[1] - v[1] * d[0]);
    const halfWedge = t * Math.tan(Math.PI / N) + rad;
    if (off < halfWedge) best = Math.min(best, t - Math.sqrt(Math.max(0, rad * rad - off * off)) - (off < rad ? 0 : 0));
  }
  return best;
});
const rad = want.map((r, i) => r1(Math.max(30, Math.min(r, free[i]))));

// ---------- Write the hill ----------
hill.rad = rad;
hill.e = E;
hill.flat = FLAT; // the summit plaza's level top (game/namsan-walk.js, namsan-summit.js)
hill.trees = 360; // (the bigger foot: about as dense as the old 260)
delete hill.rx; delete hill.rz;
const ring = (k) => rad.map((r, i) => [r1(hill.px + hill.x + Math.cos(ang(i)) * r * k), r1(hill.pz + hill.z + Math.sin(ang(i)) * r * k)]);
itaewon.blockers.find((b) => b.ns && b.n?.en === 'Namsan').p = ring(0.95);
const parkArea = itaewon.areas.find((a) => a.ns && a.k === 'park' && a.p.length >= 32 && !a.wood);
parkArea.p = ring(1);
// The woods between Sowol-ro and the old foot: the hill covers them now.
itaewon.areas = itaewon.areas.filter((a) => !(a.ns && a.k === 'park' && a !== parkArea));

// The made-up trail from Itaewon stops just onto the new foot.
const local = ([x, z]) => [x - hill.x, z - hill.z];
const fromItaewon = itaewon.roads.find((r) => r.it && r.n?.en === 'Namsan trail');
if (fromItaewon) {
  const [a, b] = fromItaewon.p.slice(-2), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let end = a;
  for (let s = 0; s <= L + 300; s += 0.5) {
    const q = [a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L];
    end = q;
    if (onNamsan(hill, ...local(q), -3)) break;
  }
  fromItaewon.p = [...fromItaewon.p.slice(0, -1), end.map(r1)];
}

// ---------- The trail ----------
itaewon.roads = itaewon.roads.filter((r) => !r.nw);
delete hill.trail; delete hill.trailW;
if (WITH_TRAIL) {
  const line = osm.trail.map((p) => toGame(...p)).map(([x, z]) => [x - ox, z - oz]); // Itaewon's metres
  // Its first steps leave Sowol-ro (the game's road is wider): on from the
  // nearest point of a road's edge.
  let best = null;
  for (const r of itaewon.roads) {
    if (isTrail(r)) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [a, b] = [r.p[i - 1], r.p[i]], dx = b[0] - a[0], dz = b[1] - a[1], q = line[0];
      const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      const c = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(q[0] - c[0], q[1] - c[1]);
      if (!best || d < best.d) best = { d, c, r };
    }
  }
  if (best.d > 1) {
    const q = line[0], k = Math.max(0, best.d - best.r.w / 2 + 0.5) / best.d; // (to just inside the road's edge)
    line.unshift([q[0] + (best.c[0] - q[0]) * k, q[1] + (best.c[1] - q[1]) * k]);
    console.log(`  trail starts ${Math.round(best.d)} m from ${best.r.n?.en} (its middle): joined to it`);
  }
  hill.trail = line.map((q) => local(q).map(r1));
  hill.trailW = TRAIL_W;
  itaewon.roads.push({
    k: 'walk', w: TRAIL_W, hill: 1, nw: 1, p: line.map((q) => q.map(r1)),
    n: { ko: '남산 산책로 (정상 가는 길)', en: 'Namsan trail to the summit', ja: '南山散策路（山頂へ）', zh: '南山步道（往山顶）' },
  });
}

// The cable car's pylons on the new ground; the top station keeps its height over it.
const cable = itaewon.landmarks.find((l) => l.type === 'cablecar');
cable.path.forEach((q, i) => {
  if (!i) return;
  const g = r1(namsanGround(hill, cable.x + q[0] - hill.x, cable.z + q[1] - hill.z));
  if (i === cable.path.length - 1) { q[2] = r1(g + 7.5); q[3] = g; } else q[3] = g;
});
writeFileSync(MAP, JSON.stringify(itaewon));

// ---------- Checks: how far from the real outline ----------
const diff = rad.map((r, i) => Math.abs(r - real[i]));
const pulled = rad.map((r, i) => want[i] - r).filter((d) => d > 1);
const area = (rs) => rs.reduce((s, r) => s + 0.5 * r * r * ((2 * Math.PI) / N), 0);
const sorted = [...diff].sort((a, b) => a - b);
console.log(`Namsan foot: ${N} radii, ${Math.round(Math.min(...rad))}-${Math.round(Math.max(...rad))} m from the top; area ${Math.round(area(rad) / 1000)}k m² (real 1/4 ${Math.round(area(real) / 1000)}k m², was ${Math.round((Math.PI * 190 * 160) / 1000)}k)`);
console.log(`  off the real edge: median ${Math.round(sorted[N >> 1])} m, 90% within ${Math.round(sorted[Math.floor(N * 0.9)])} m; pulled in for roads/buildings on ${pulled.length} of ${N} rays (most ${Math.round(Math.max(0, ...pulled))} m)`);
if (hill.trail) {
  let len = 0, steep = 0;
  const P = hill.trail;
  for (let i = 1; i < P.length; i++) {
    const [a, b] = [P[i - 1], P[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    len += L;
    for (let s = 0; s + 2 <= L; s += 2) {
      const q = (t) => [a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L];
      steep = Math.max(steep, Math.abs(namsanGround(hill, ...q(s + 2)) - namsanGround(hill, ...q(s))) / 2);
    }
  }
  const t = P.at(-1);
  console.log(`  trail: ${Math.round(len)} m (real ${Math.round(len * 4)} m), climbs ${Math.round(namsanGround(hill, ...t))} m, steepest ${Math.round(steep * 100)}%, top ${Math.round(Math.hypot(t[0] - hill.px, t[1] - hill.pz))} m from the tower`);
}
// Nothing of the city on the hill.
const onHill = obstacles.filter(([x, z]) => onNamsan(hill, x - hill.x, z - hill.z, -1));
if (onHill.length) console.log(`  WARNING: ${onHill.length} road/building points on the hill, e.g. ${onHill.slice(0, 3).map((q) => q.slice(0, 2).map(Math.round)).join(' ')}`);
