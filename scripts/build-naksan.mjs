#!/usr/bin/env node
// Builds Naksan (낙산) and its stretch of the Seoul City Wall (한양도성),
// from Heunginjimun up over the hill to Hyehwamun, into the Dongmyo district
// (public/regions/another-seoul/districts/dongmyo.json, items marked `nk`),
// the way Namsan is part of Itaewon's map.
//
// The wall's line is OpenStreetMap's at 1/4 (scripts/data/naksan-osm.json,
// export of 2026-11-13, © OpenStreetMap contributors, ODbL), with its real
// gaps: by the top of the hill (where the path goes through) and where
// Changgyeonggung-ro cuts it just south of Hyehwamun. Sizes (Yozi,
// 2026-11-13): the route and the hill at 1/4; the wall 50% high on its
// outer face (about 3.5 m) and chest high (1.3 m) from inside, where the
// ground is higher, as on the real Naksan; Hyehwamun 37.5% of its real
// outline.
//
// The hill's heights are a game approximation of the real ones (the plain
// is 0; Naksan's top, 125 m above the sea and about 95 m above Jongno,
// is 23 m), not a survey. Two paths follow the wall: outside along its
// foot (the famous view of the wall with Bukhansan behind) and inside along
// the top; a row of small houses stands along each (Ihwa-dong inside,
// Changsin-dong outside), fictional.
//
//   node scripts/build-naksan.mjs        (after build-dongmyo.mjs)
//
// What it writes into dongmyo.json: meta.ridge (core/ridge-ground.js and
// game/naksan.js), a meta.parts box, the wall's blockers, the paths
// (roads, k walk), the houses (buildings) and the place names (pois).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { ridgeHeightRel, ridgeNear } from '../src/core/ridge-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'naksan-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const FILE = path.join(R, 'districts', 'dongmyo.json');
const map = JSON.parse(readFileSync(FILE, 'utf8'));
const [OX, OZ] = region.districts.find((d) => d.id === 'dongmyo').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

export const NAKSAN = {
  start: -776, // world z: the wall starts north of Jong-ro's north road round Heunginjimun (its edge is z -773)
  thick: 1.4, // m: the wall's thickness (its blocker)
  step: 2.2, // m: how much lower the ground is at the outer foot (outer face 2.2 + 1.3 m)
  parapet: 1.3, // m: the wall above the inside ground
  ramp: 14, // m: the step fades to 0 this far from a gap or an end
  wi: [22, 3.6], wo: [18, 3.2], // the slope's reach inside / outside: a + b * h m
  pathW: 2.5,
  outPath: 3.4, // m from the wall's middle to the outer path's middle
  inPath: 2.9, // and to the inner path's
  gate: 0.375, // Hyehwamun's size
};

// The hill's height (m above the plain) by latitude along the wall: a game
// approximation from the real heights above the sea, less the plain round
// it, at 1/4.
const PROFILE = [
  [37.5726, 0], // the wall's first stone north of Jongno, by Heunginjimun (about 28 m above the sea)
  [37.5738, 4], // the City Wall Museum, Heunginjimun Park's top
  [37.5760, 10],
  [37.5785, 17], // Ihwa-dong
  [37.5804, 23], // Naksan's top (125 m), the gap where the path goes through
  [37.5830, 16],
  [37.5855, 8],
  [37.5866, 2],
  [37.5871, 0], // down to Changgyeonggung-ro, south of Hyehwamun
  [37.5900, 0],
];
const lerp = (pts, v) => {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [a, ya] = pts[i - 1], [b, yb] = pts[i]; return ya + ((yb - ya) * (v - a)) / (b - a); }
  return pts.at(-1)[1];
};

// The wall's ways, south to north.
const ways = OSM.elements.filter((e) => e.tags?.historic === 'citywalls' || e.tags?.barrier === 'city_wall')
  .map((e) => { const g = e.geometry.map((q) => [q.lat, q.lon]); return g[0][0] > g.at(-1)[0] ? g.reverse() : g; })
  .sort((a, b) => a[0][0] - b[0][0]);
const gateWay = OSM.elements.find((e) => e.tags?.historic === 'city_gate');

// Douglas-Peucker, in metres.
function simplify(p, tol) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p.at(-1)];
  let best = 0, k = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
    const d = Math.abs(dx * (a[1] - p[i][1]) - dz * (a[0] - p[i][0])) / len;
    if (d > best) { best = d; k = i; }
  }
  return best > tol ? [...simplify(p.slice(0, k + 1), tol).slice(0, -1), ...simplify(p.slice(k), tol)] : [a, b];
}

// Each way in district metres, with its latitude kept for the profile;
// the first one starts north of Jong-ro.
const pieces = ways.map((g, wi) => {
  let pts = g.map(([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ, lat]; });
  if (wi === 0) pts = pts.filter((q) => q[1] + OZ <= NAKSAN.start);
  return simplify(pts, 0.6);
});
// The ways after the road gap are short pieces round Hyehwamun: one piece.
const walls = [pieces[0], pieces[1], pieces.slice(2).flat()];
const line = walls.flat();
// Which points start a gap (the wall stops before the next one).
const gapAfter = new Set();
{ let n = 0; for (const w of walls.slice(0, -1)) { n += w.length; gapAfter.add(n - 1); } }
// Distance along the line, and how far each point is from a gap or an end.
const sAt = [0];
for (let i = 1; i < line.length; i++) sAt.push(sAt[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
const ends = [0, sAt.at(-1)];
for (const i of gapAfter) ends.push(sAt[i], sAt[i + 1]);
const ridgeLine = line.map(([x, z, lat], i) => {
  const near = Math.min(...ends.map((s) => Math.abs(s - sAt[i])));
  const h = lerp(PROFILE, lat);
  const step = Math.min(NAKSAN.step, h * 0.4) * Math.min(1, near / NAKSAN.ramp);
  return [r1(x), r1(z), r1(h), r1(step)];
});
// Inside the old city: west of the wall here, i.e. left going north.
const ridge = { line: ridgeLine, ins: 1, wi: NAKSAN.wi, wo: NAKSAN.wo, walls: [], gate: null, parapet: NAKSAN.parapet, thick: NAKSAN.thick };
{ let i0 = 0; for (const w of walls) { ridge.walls.push([i0, i0 + w.length - 1]); i0 += w.length; } }

// Hyehwamun: its OSM outline's long side across the road, 37.5%.
{
  const pts = gateWay.geometry.map((q) => toGame(q.lat, q.lon)).map(([x, z]) => [x - OX, z - OZ]);
  const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  let best = null; // the smallest box round it, by turning
  for (let a = 0; a < Math.PI; a += Math.PI / 180) {
    const ux = Math.cos(a), uz = Math.sin(a);
    const us = pts.map(([x, z]) => (x - cx) * ux + (z - cz) * uz), vs = pts.map(([x, z]) => -(x - cx) * uz + (z - cz) * ux);
    const L = Math.max(...us) - Math.min(...us), D = Math.max(...vs) - Math.min(...vs);
    if (!best || L * D < best.L * best.D) best = { a, L: Math.max(L, D), D: Math.min(L, D), along: L >= D ? a : a + Math.PI / 2 };
  }
  // The real outline is at 1/4 in game metres: back to real, then 37.5%.
  const W = r1(best.L * 4 * NAKSAN.gate), D = r1(best.D * 4 * NAKSAN.gate);
  ridge.gate = { x: r1(cx), z: r1(cz), ry: +(-best.along).toFixed(3), W, D, n: N('혜화문', 'Hyehwamun', '恵化門', '惠化门') };
}

// The wall's blockers: a thin box per stretch.
const blockers = [];
const quad = (a, b, w) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
  const nx = -uz * w / 2, nz = ux * w / 2, e = 0.3;
  return [[a[0] - ux * e + nx, a[1] - uz * e + nz], [b[0] + ux * e + nx, b[1] + uz * e + nz], [b[0] + ux * e - nx, b[1] + uz * e - nz], [a[0] - ux * e - nx, a[1] - uz * e - nz]].map(([x, z]) => [r1(x), r1(z)]);
};
for (const [i0, i1] of ridge.walls) for (let i = i0 + 1; i <= i1; i++) blockers.push({ p: quad(ridgeLine[i - 1], ridgeLine[i], NAKSAN.thick), nk: 1 });
{ // Hyehwamun: you can't walk through at 37.5% (its arch is lower than you).
  const { x, z, ry, W, D } = ridge.gate, c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, v) => [r1(x + u * c + v * s), r1(z - u * s + v * c)];
  blockers.push({ p: [P(-W / 2, -D / 2), P(W / 2, -D / 2), P(W / 2, D / 2), P(-W / 2, D / 2)], nk: 1 });
}

// The paths: the line moved sideways (smoothed a little), from the start to
// the road gap south of Hyehwamun.
function offsetLine(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    out.push([pts[i][0] + uz * d, pts[i][1] - ux * d]); // d > 0: left of the direction (inside)
  }
  return out;
}
const smooth = (p) => p.map((q, i) => (i === 0 || i === p.length - 1 ? q : [(p[i - 1][0] + 2 * q[0] + p[i + 1][0]) / 4, (p[i - 1][1] + 2 * q[1] + p[i + 1][1]) / 4]));
const lastSouth = ridge.walls[1][1]; // the end of the stretch before the road gap
const pathBase = ridgeLine.slice(0, lastSouth + 1).map(([x, z]) => [x, z]);
// Every 2 m, and pushed off the wall where a sharp bend brought it close.
const wallSegs = ridge.walls.flatMap(([i0, i1]) => ridgeLine.slice(i0, i1 + 1).map((q, k, a) => (k ? [a[k - 1], q] : null)).filter(Boolean));
const CLEAR = NAKSAN.thick / 2 + NAKSAN.pathW / 2 + 0.5;
function clearOfWall(p) {
  const dense = [];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
    for (let k = 0; k < n; k++) dense.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  dense.push(p.at(-1));
  return dense.map(([x, z]) => {
    for (let it = 0; it < 4; it++) {
      let best = Infinity, px = 0, pz = 0;
      for (const [a, b] of wallSegs) {
        const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        const qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(x - qx, z - qz);
        if (d < best) { best = d; px = qx; pz = qz; }
      }
      if (best >= CLEAR) break;
      const k = (CLEAR + 0.05) / (best || 0.01);
      x = px + (x - px) * k; z = pz + (z - pz) * k;
    }
    return [r1(x), r1(z)];
  });
}
const outer = clearOfWall(smooth(offsetLine(pathBase, -NAKSAN.outPath)));
const inner = clearOfWall(smooth(offsetLine(pathBase, NAKSAN.inPath)));
const roads = [
  { k: 'walk', w: NAKSAN.pathW, p: outer, hill: 1, nk: 1, n: N('낙산 성곽길 (바깥)', 'Naksan Wall Trail (outside)', '駱山城郭道（外側）', '骆山城郭路（外侧）') },
  { k: 'walk', w: NAKSAN.pathW, p: inner, hill: 1, nk: 1, n: N('낙산 성곽길 (안쪽)', 'Naksan Wall Trail (inside)', '駱山城郭道（内側）', '骆山城郭路（内侧）') },
];

// A row of small houses along each path, set back from it, on the slope.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const H = (x, z) => ridgeHeightRel(ridge, x, z);
const houses = [];
const polyHit = (a, b) => { // two convex quads overlap (separating axis)
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length], nx = z2 - z1, nz = x1 - x2;
    const pa = a.map(([x, z]) => x * nx + z * nz), pb = b.map(([x, z]) => x * nx + z * nz);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
};
const pad = (poly, m) => { const cx = poly.reduce((s, q) => s + q[0], 0) / 4, cz = poly.reduce((s, q) => s + q[1], 0) / 4; return poly.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz) || 1; return [x + ((x - cx) / d) * m, z + ((z - cz) / d) * m]; }); };
const nearPath = (x, z, m) => roads.some((r) => r.p.some((q, i) => i > 0 && segDist(x, z, r.p[i - 1], q) < m));
function segDist(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
const rows = [
  // [path, side (+1 inside / -1 outside), latitude band, set-back]
  [inner, 1, [37.5745, 37.5800], 9], // Ihwa-dong's mural village, inside
  [inner, 1, [37.5812, 37.5862], 9], // down to Hyehwa, inside
  [outer, -1, [37.5728, 37.5795], 13], // Changsin-dong, outside (a strip of woods first)
  [outer, -1, [37.5815, 37.5865], 13], // Samseon-dong, outside
];
const latAt = (x, z) => { let b = 0, bd = Infinity; line.forEach((q, i) => { const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; b = i; } }); return line[b][2]; };
for (const [p, side, [la0, la1], back] of rows) {
  let next = 0, run = 0; // distance along the path, and where the next house may start
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
    run += len;
    if (run < next || len < 0.5) continue;
    const lat = latAt(ax, az);
    if (lat < la0 || lat > la1) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len, nx = uz * side, nz = -ux * side;
    const w = 5.5 + rnd() * 2, d = 5 + rnd() * 2, set = NAKSAN.pathW / 2 + back + rnd() * 2;
    const poly = [[ax + nx * set, az + nz * set], [ax + ux * w + nx * set, az + uz * w + nz * set], [ax + ux * w + nx * (set + d), az + uz * w + nz * (set + d)], [ax + nx * (set + d), az + nz * (set + d)]];
    const cx = poly.reduce((q, v) => q + v[0], 0) / 4, cz = poly.reduce((q, v) => q + v[1], 0) / 4;
    if (nearPath(cx, cz, NAKSAN.pathW / 2 + 5) || Math.abs(ridgeNear(ridge, cx, cz).d) < 8) continue;
    if (houses.some((hq) => polyHit(pad(hq.p, 1.2), poly))) continue;
    const ys = poly.map(([x, z]) => H(x, z));
    const y = H(cx, cz), y0 = Math.min(...ys);
    houses.push({ p: poly.map(([x, z]) => [r1(x), r1(z)]), h: 3 + Math.round(rnd() * 3), y: r1(y), y0: r1(y0 - 0.2), nk: 1 });
    next = run + w + 3 + rnd() * 3;
  }
}

// Place names on the map.
const peakI = ridgeLine.reduce((b, q, i) => (q[2] > ridgeLine[b][2] ? i : b), 0);
const inPt = (i, d) => { const [x, z] = offsetLine(ridgeLine.map((q) => [q[0], q[1]]), d)[i]; return [r1(x), r1(z)]; };
const [px, pz] = inPt(peakI, 18), [tx, tz] = inPt(Math.round(peakI * 0.45), -12);
const pois = [
  { kind: 'landmark', x: px, z: pz, nk: 1, name: N('낙산공원', 'Naksan Park', '駱山公園', '骆山公园') },
  { kind: 'landmark', x: tx, z: tz, nk: 1, name: N('낙산 성곽길', 'Naksan Wall Trail', '駱山城郭道', '骆山城郭路') },
  { kind: 'landmark', x: ridge.gate.x, z: ridge.gate.z - 8, nk: 1, name: ridge.gate.n },
];

// Into dongmyo.json: drop what this script wrote before, add it again.
const old = (it) => !it.nk;
for (const k of ['roads', 'buildings', 'blockers', 'pois']) map[k] = (map[k] || []).filter(old);
map.roads.push(...roads);
map.buildings.push(...houses);
map.blockers.push(...blockers);
map.pois.push(...pois);
const xs = [], zs = [];
for (const q of [...ridgeLine, ...outer, ...inner, ...houses.flatMap((b) => b.p)]) { xs.push(q[0]); zs.push(q[1]); }
map.meta.parts = map.meta.parts.filter((p) => !p.nk);
map.meta.parts.push({ why: 'Naksan and its stretch of the Seoul City Wall, Heunginjimun to Hyehwamun (scripts/build-naksan.mjs)', box: [Math.floor(Math.min(...xs)), Math.floor(Math.min(...zs)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...zs))], nk: 1 });
map.meta.ridge = ridge;
if (!map.meta.source.includes('Naksan')) map.meta.source += '. Naksan and the city wall: scripts/build-naksan.mjs (OpenStreetMap, scripts/data/naksan-osm.json)';
writeFileSync(FILE, JSON.stringify(map, null, 1) + '\n');
console.log(`naksan: wall ${Math.round(sAt.at(-1))} m in ${ridge.walls.length} stretches (${ridgeLine.length} points), top ${ridgeLine[peakI][2]} m, ${houses.length} houses, gate ${ridge.gate.W} x ${ridge.gate.D} m`);
