#!/usr/bin/env node
// Builds Gyeongbokgung's palace (inside its wall) into districts/gyeongbokgung.json
// from the real map: every hall, gate and roofed corridor (행각) stands where it
// stands in OpenStreetMap (scripts/data/gyeongbokgung-osm.json, © OpenStreetMap
// contributors, ODbL), at a quarter of the real distances like the rest of the
// game's Seoul (docs/WORLD.md).
//
//   - The site is the real one at 1/4: every building's middle is on its
//     real spot (measured from Gwanghwamun, the district's (0, 0)).
//   - The buildings' footprints are 30% of the real ones (FOOT: 1.2 × the
//     1/4 map), so the yards between them keep almost their real shape.
//   - Their heights are half the real ones, so a hall stands taller than
//     Bukchon's houses and the gates are higher than the people (Yozi's
//     choice, 2026-11-09).
//   - Halls are drawn by core/palace-model.js: the gates, Yeongjegyo,
//     Geunjeongjeon, Gyeonghoeru and Hyangwonjeong have their own models;
//     all other buildings are one merged "palacehalls" landmark and the
//     corridors one "cloister".
//
// What it writes is marked "gb": 1 (landmarks, blockers, areas), so it can
// be run again; everything else in the district map is left alone.
//
//   node scripts/build-gyeongbokgung.mjs            rewrites the palace part
//   node scripts/build-gyeongbokgung.mjs --svg F    also draws the plan to F
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = path.join(root, 'public', 'regions', 'another-seoul', 'districts', 'gyeongbokgung.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'gyeongbokgung-osm.json'), 'utf8'));

export const FOOT = 1.2; // footprints: 30% of the real size = 1.2 × the 1/4 map
export const UP = 1; // heights: the palace models are drawn at half the real height (UP 1 = 50%)
const SC = [FOOT / 2, UP]; // the models with their own builders are drawn at 50%: scale them to 30% across
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

// ---------- Real coordinates -> the district's metres (Gwanghwamun at (0, 0)) ----------
const byName = (n) => osm.elements.find((e) => e.name === n);
const centre = (pts) => pts.slice(0, -1).reduce((a, p, _, l) => [a[0] + p[0] / l.length, a[1] + p[1] / l.length], [0, 0]);
const G = centre(byName('광화문').pts), [gx, gz] = toGame(G[0], G[1]);
export const local = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - gx, z - gz]; };

// The smallest box round a footprint: middle, size along its own axes, and
// its angle a (u = x cos a + z sin a), turned so a is within ±45°.
export function obb(P) {
  let best = null;
  for (let a = -45; a < 45; a += 0.25) {
    const r = (a * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const [x, z] of P) { const u = x * cs + z * sn, v = -x * sn + z * cs; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const A = (u1 - u0) * (v1 - v0);
    if (!best || A < best.A - 1e-6) { const u = (u0 + u1) / 2, v = (v0 + v1) / 2; best = { A, a: r, w: u1 - u0, d: v1 - v0, x: u * cs - v * sn, z: u * sn + v * cs }; }
  }
  return best;
}
const area = (P) => { let s = 0; for (let i = 0; i < P.length - 1; i++) s += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1]; return Math.abs(s / 2); };
function inside(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
// A rectangle (middle x, z; size w along angle a, d across) as a polygon.
export function rect(x, z, w, d, a) {
  const cs = Math.cos(a), sn = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [r2(x + u * cs - v * sn), r2(z + u * sn + v * cs)]);
}

// An ㄱ, ㄷ or ㅁ shaped footprint (a hall with wings, a ring of corridors)
// split into rectangles: the biggest one first, then the biggest of what is
// left, on a 20 cm grid in the footprint's own axes.
function rectangles(P, o) {
  const cs = Math.cos(o.a), sn = Math.sin(o.a), Q = P.map(([x, z]) => [x * cs + z * sn, -x * sn + z * cs]);
  const R = 0.2, u0 = Math.min(...Q.map((q) => q[0])), v0 = Math.min(...Q.map((q) => q[1]));
  const nu = Math.ceil(o.w / R) + 1, nv = Math.ceil(o.d / R) + 1;
  const cell = Array.from({ length: nv }, (_, j) => Array.from({ length: nu }, (_, i) => inside(Q, u0 + (i + 0.5) * R, v0 + (j + 0.5) * R)));
  const out = [];
  for (;;) {
    // largest rectangle of true cells (histogram method)
    const h = new Array(nu).fill(0);
    let best = null;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) h[i] = cell[j][i] ? h[i] + 1 : 0;
      const st = [];
      for (let i = 0; i <= nu; i++) {
        const hi = i < nu ? h[i] : 0;
        let s = i;
        while (st.length && st.at(-1)[1] >= hi) {
          const [si, sh] = st.pop();
          const A = sh * (i - si);
          if (!best || A > best.A) best = { A, i0: si, i1: i, j0: j - sh + 1, j1: j + 1 };
          s = si;
        }
        st.push([s, hi]);
      }
    }
    if (!best || best.A * R * R < 0.5) break;
    for (let j = best.j0; j < best.j1; j++) for (let i = best.i0; i < best.i1; i++) cell[j][i] = false;
    const w = (best.i1 - best.i0) * R, d = (best.j1 - best.j0) * R;
    if (Math.min(w, d) < 0.5) continue;
    const u = u0 + ((best.i0 + best.i1) / 2) * R, v = v0 + ((best.j0 + best.j1) / 2) * R;
    out.push({ x: u * cs - v * sn, z: u * sn + v * cs, w, d, a: o.a, cx: o.x, cz: o.z });
  }
  return out;
}

// ---------- Which buildings ----------
// Modern buildings inside the wall (the National Palace Museum, offices,
// the ticket booth, sheds, toilets) and the outdoor exhibits of the Folk
// Museum in the north-east are left out; so are the separate roof outlines
// OSM draws over some gates.
const MODERN = new Set([633165623, 1279065116, 1279065117, 1279065118, 446778285, 1279065120, 301276778, 301276771, 609871494, 447795865, 447795866, 447795867, 447795868, 447795869, 370282533, 301276783, 447794881, 447794882, 447794883, 1426254040, 1279997267, 1426254034, 1426254035, 1351186570, 1351186571, 446676117, 1350696295, 301276764]);
// The palace wall: OSM's outline of the palace grounds (relation 5501517),
// opened at Gwanghwamun (the gate stands in the gap).
export const OUTLINE = (() => {
  const P = osm.elements.find((e) => e.kind === 'palace').pts.slice(0, -1).map(local);
  let k = 0; // start just east of the gate, so the line runs round and ends just west of it
  for (let i = 0; i < P.length; i++) if (Math.abs(P[i][1]) < 4 && P[i][0] > 0 && (P[k][0] <= 0 || Math.abs(P[k][1]) >= 4 || P[i][0] < P[k][0])) k = i;
  const R = P.slice(k).concat(P.slice(0, k));
  const W = R.filter(([x, z]) => !(Math.abs(x) < 5 && Math.abs(z) < 4));
  const hw = 3.9 * FOOT; // the wall meets the gate's sides (Gwanghwamun: 7.8 m wide on the 1/4 map)
  return [[hw, W[0][1] * (hw / W[0][0])], ...W, [-hw, W.at(-1)[1] * (hw / -W.at(-1)[0])]];
})(); // the palace wall, in the district's metres
const inPalace = (x, z) => inside(OUTLINE, x, z) && !(x > 45 && z < -95 && x > 45 + (-95 - z) * 0.1); // (the Folk Museum's grounds)
// Buildings with their own model: name -> how.
const OWN = { 광화문: 'gwanghwamun', 흥례문: 'palacegate', 근정문: 'palacegate', 근정전: 'throne', 경회루: 'pavilion', 향원정: 'hexpavilion' };
const NO_RIDGE = new Set(['강녕전', '교태전']);
const BOARDS = { 사정전: '思政殿', 강녕전: '康寧殿', 교태전: '交泰殿', 자경전: '慈慶殿', 수정전: '修政殿', 흥복전: '興福殿', 집옥재: '集玉齋', 태원전: '泰元殿' };

// A quarter of the real buildings (Yozi, 2026-11-09: not all 150): every
// hall and gate on the middle line, the big and well-known ones either side,
// and the biggest of the rest up to COUNT. The roofed corridors round the
// yards are kept whole (without them the yards lose their shape).
export const COUNT = Number(process.env.COUNT) || 30;
const KEEP = [ // in order: the middle line, the big halls either side, the gates in the wall, then the smaller halls
  '사정문', '사정전', '강녕전', '교태전', '흥복전', '장안당', '곤녕합',
  '수정전', '자경전', '자선당', '태원전', '집옥재', '신무문', '경복궁 건춘문',
  '천추전', '만춘전', '연생전', '경성전', '함원전', '흠경각', '비현각', '복수당', '함화당', '집경당', '계조당', '유화문', '협길당', '팔우정'];
const thin = (r) => { const s = Math.min(r.w, r.d), L = Math.max(r.w, r.d); return s <= 2.8 && L / s >= 2.4; };
const units = [];
for (const e of osm.elements) {
  if (e.kind !== 'building' || MODERN.has(e.id)) continue;
  if (e.roof && !e.name) continue;
  const P = e.pts.map(local), o = obb(P);
  if (!inPalace(o.x, o.z) && !OWN[e.name] && !/문$/.test(e.name || "")) continue; // (gates stand on the wall line)
  const gate = !!e.gate || /문$/.test(e.name || '');
  const fill = area(P) / o.A;
  const parts = fill > 0.9 ? [{ x: o.x, z: o.z, w: o.w, d: o.d, a: o.a, cx: o.x, cz: o.z }] : rectangles(P, o);
  const thinA = parts.filter((r) => !gate && thin(r)).reduce((a, r) => a + r.w * r.d, 0), allA = parts.reduce((a, r) => a + r.w * r.d, 0);
  units.push({ e, P, o, gate, fill, parts, corridor: thinA > 0.6 * allA, size: area(P) });
}
const chosen = new Set(units.filter((u) => u.corridor || OWN[u.e.name]));
const counted = () => [...chosen].filter((u) => !u.corridor).length;
for (const n of KEEP) for (const u of units) if (u.e.name === n && counted() < COUNT) chosen.add(u);
for (const u of units.filter((u) => !chosen.has(u)).sort((a, b) => b.size - a.size)) { if (counted() >= COUNT) break; chosen.add(u); }

const own = [], halls = [], runs = [], blockers = [], yards = [];
// A corridor rectangle -> a run along its middle line, and its blocker.
function addRun(r) {
  const s = Math.min(r.w, r.d), L = Math.max(r.w, r.d);
  const along = r.w >= r.d ? r.a : r.a + Math.PI / 2, cs = Math.cos(along), sn = Math.sin(along);
  const x0 = r.x - (cs * L) / 2, z0 = r.z - (sn * L) / 2, x1 = r.x + (cs * L) / 2, z1 = r.z + (sn * L) / 2;
  // inward: towards the middle of its building (the yard); (x0,z0)->(x1,z1) turned left is +1
  const side = Math.sign(-sn * (r.cx - r.x) + cs * (r.cz - r.z)) || 1;
  const D = s; // (the corridors are the yards' edges: kept at the 1/4 map's size, so the yards keep theirs)
  runs.push([r1(x0), r1(z0), r1(x1), r1(z1), side, r1(D)]);
  blockers.push({ p: rect(r.x, r.z, L, D, along) });
}
// The doors of a ring of corridors: a gap in each side across the ring's
// middle line (south and north), and in the east and west sides too when
// the ring is a wide one. Real rings have their gates about there; OSM draws
// most of them as part of the corridor.
export const DOOR = 2.6;
function cutDoors(r, o) {
  const cs = Math.cos(o.a), sn = Math.sin(o.a);
  const ru = (r.x - o.x) * cs + (r.z - o.z) * sn, rv = -(r.x - o.x) * sn + (r.z - o.z) * cs; // the rectangle's middle in the ring's axes
  const ew = r.w >= r.d; // runs across (east-west) or along (north-south)
  const L = Math.max(r.w, r.d);
  const across = ew ? Math.abs(rv) > o.d * 0.3 : Math.abs(ru) > o.w * 0.3 && o.d > 9;
  const at = ew ? -ru : -rv; // where the ring's middle line crosses the run, from the run's middle
  if (!across || Math.abs(at) > L / 2 - DOOR / 2 - 0.6) return [r];
  const lo = -L / 2, hi = L / 2, g0 = at - DOOR / 2, g1 = at + DOOR / 2, out = [];
  const piece = (a, b) => { const m = (a + b) / 2, ux = ew ? cs : -sn, uz = ew ? sn : cs; return { ...r, x: r.x + ux * m, z: r.z + uz * m, w: ew ? b - a : r.w, d: ew ? r.d : b - a }; };
  if (g0 - lo > 0.8) out.push(piece(lo, g0));
  if (hi - g1 > 0.8) out.push(piece(g1, hi));
  return out;
}
for (const u of units) {
  if (!chosen.has(u)) continue;
  const { e, o, gate, fill, parts } = u;
  if (OWN[e.name]) { own.push({ name: e.name, ...o }); continue; }
  const doors = u.corridor ? [] : null; // a ring of corridors gets a door in its south and north sides, on its middle line
  for (const r of parts) {
    if (!gate && thin(r) && doors) { // (a corridor of a ring: cut later)
      doors.push(r);
      continue;
    }
    if (!gate && thin(r)) { // a corridor: a run along its middle line
      const s = Math.min(r.w, r.d), L = Math.max(r.w, r.d);
      const along = r.w >= r.d ? r.a : r.a + Math.PI / 2, cs = Math.cos(along), sn = Math.sin(along);
      const x0 = r.x - (cs * L) / 2, z0 = r.z - (sn * L) / 2, x1 = r.x + (cs * L) / 2, z1 = r.z + (sn * L) / 2;
      // inward: towards the middle of its building (the yard); (x0,z0)->(x1,z1) turned left is +1
      const side = Math.sign(-sn * (r.cx - r.x) + cs * (r.cz - r.z)) || 1;
      const D = s;
      runs.push([r1(x0), r1(z0), r1(x1), r1(z1), side, r1(D)]);
      blockers.push({ p: rect(r.x, r.z, L, D, along) });
      continue;
    }
    // a hall (or a gate): the footprint at 30%, its front to the south
    const a = r.a;
    const H = { x: r.x, z: r.z, w: r.w * FOOT, d: r.d * FOOT, ry: -a, kind: gate ? 'g' : NO_RIDGE.has(e.name) ? 'n' : 'h', han: r === parts[0] ? BOARDS[e.name] : undefined, name: e.name };
    halls.push(H);
    if (gate) { // posts at the two ends; the middle is open
      const cs = Math.cos(a), sn = Math.sin(a), q = Math.min(0.5, H.w * 0.15);
      for (const s2 of [-1, 1]) blockers.push({ p: rect(H.x + s2 * cs * (H.w / 2 - q / 2), H.z + s2 * sn * (H.w / 2 - q / 2), q, H.d, a) });
    } else blockers.push({ p: rect(H.x, H.z, H.w + 0.7, H.d + 0.7, a) });
  }
  if (doors) for (const r of doors) for (const piece of cutDoors(r, o)) addRun(piece);
  if (fill < 0.5 && u.corridor) yards.push({ x: o.x, z: o.z, w: o.w, d: o.d, a: o.a }); // a ring of corridors: its yard is paved
}
console.log('buildings', counted(), 'of', units.filter((u) => !u.corridor).length, '; corridor rings', units.filter((u) => u.corridor).length);

// ---------- The left-out buildings: a few plain blocks ----------
// Where a real building was left out, a plain block stands instead: walls
// and a big tiled roof, no posts, doors or brackets (Yozi, 2026-11-09: "a
// few big roofs, not every detail"). Neighbours that line up (same angle,
// under BLOCK_GAP apart) share one block, when their joined box is mostly
// building; else each keeps its own. Nothing is put where it would touch a
// hall, a corridor or a pond kept above.
export const BLOCK_GAP = 3;
const blocks = [];
{
  const sat = (A, B) => { // two convex polygons overlap
    for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
      const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length], nx = z0 - z1, nz = x1 - x0;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      for (const [x, z] of A) { const t = x * nx + z * nz; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
      for (const [x, z] of B) { const t = x * nx + z * nz; b0 = Math.min(b0, t); b1 = Math.max(b1, t); }
      if (a1 <= b0 || b1 <= a0) return false;
    }
    return true;
  };
  const ponds = osm.elements.filter((e) => e.kind === 'water').map((e) => e.pts.map(local));
  const kept = blockers.map((b) => b.p);
  const free = (r) => { // (r: {x, z, w, d, a}, with its walk-round margin)
    const P = rect(r.x, r.z, r.w + 0.7, r.d + 0.7, r.a);
    if (kept.some((K) => sat(P, K))) return false;
    const cs = Math.cos(r.a), sn = Math.sin(r.a);
    for (let u = -r.w / 2; u <= r.w / 2 + 1e-6; u += Math.max(0.5, r.w / 6)) for (let v = -r.d / 2; v <= r.d / 2 + 1e-6; v += Math.max(0.5, r.d / 6)) {
      const x = r.x + u * cs - v * sn, z = r.z + u * sn + v * cs;
      if (!inPalace(x, z) || ponds.some((W) => inside(W, x, z))) return false;
    }
    return true;
  };
  const pieces = [];
  for (const u of units) {
    if (chosen.has(u) || u.corridor || u.gate) continue;
    if (!u.e.name && u.o.x > 25 && u.o.z < -150) continue; // (unnamed, beside the Folk Museum: Yozi wants its grounds left empty)
    for (const r of u.parts) pieces.push({ x: r.x, z: r.z, w: r.w * FOOT, d: r.d * FOOT, a: r.a, name: u.e.name, A: r.w * r.d * FOOT * FOOT });
  }
  // Join neighbours that line up.
  const up = pieces.map((_, i) => i), find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  const turn = (a, b) => { const d = Math.abs(a - b) % (Math.PI / 2); return Math.min(d, Math.PI / 2 - d); };
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const p = pieces[i], q = pieces[j];
    if (turn(p.a, q.a) > (6 * Math.PI) / 180) continue;
    if (sat(rect(p.x, p.z, p.w + BLOCK_GAP, p.d + BLOCK_GAP, p.a), rect(q.x, q.z, q.w, q.d, q.a))) up[find(i)] = find(j);
  }
  const groups = new Map();
  pieces.forEach((p, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
  const boxOf = (ps) => { // the box round some pieces, in the biggest one's axes
    const a = ps.reduce((m, p) => (p.A > m.A ? p : m)).a, cs = Math.cos(a), sn = Math.sin(a);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const p of ps) for (const [x, z] of rect(p.x, p.z, p.w, p.d, p.a)) { const u = x * cs + z * sn, v = -x * sn + z * cs; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const u = (u0 + u1) / 2, v = (v0 + v1) / 2;
    return { x: u * cs - v * sn, z: u * sn + v * cs, w: u1 - u0, d: v1 - v0, a, fill: ps.reduce((s, p) => s + p.A, 0) / ((u1 - u0) * (v1 - v0)), n: ps.length };
  };
  const place = (r) => { blocks.push(r); kept.push(rect(r.x, r.z, r.w + 0.7, r.d + 0.7, r.a)); };
  for (const ps of [...groups.values()].sort((a, b) => b.reduce((s, p) => s + p.A, 0) - a.reduce((s, p) => s + p.A, 0))) {
    const b = boxOf(ps);
    if (ps.length > 1 && b.fill >= 0.55 && free(b)) { place(b); continue; }
    for (const p of ps) { // one by one, at 30% or else at the 1/4 map's size
      const q = { ...p, n: 1 };
      if (free(q)) place(q);
      else { const s = { ...q, w: q.w / FOOT, d: q.d / FOOT }; if (Math.min(s.w, s.d) >= 1.5 && free(s)) place(s); }
    }
  }
  for (const r of blocks) {
    const H = { x: r.x, z: r.z, w: r.w, d: r.d, ry: -r.a, kind: 'r', name: '' };
    halls.push(H);
    blockers.push({ p: rect(r.x, r.z, r.w + 0.7, r.d + 0.7, r.a) });
  }
  if (process.env.DEBUG_BLOCKS) for (const p of pieces) if (!blocks.some((b) => Math.hypot(b.x - p.x, b.z - p.z) < Math.max(b.w, b.d))) console.log('  not placed', p.name, r1(p.x), r1(p.z), r1(p.w), r1(p.d));
  console.log('left-out buildings', pieces.length, 'pieces ->', blocks.length, 'plain blocks (', blocks.filter((b) => b.n > 1).length, 'joined )');
}

// ---------- The buildings with their own models ----------
const O = Object.fromEntries(own.map((o) => [o.name, o]));
const lm = [];
const g = O['광화문'];
lm.push({ type: 'gwanghwamun', x: 0, z: 0, ry: r2(-g.a), w: r1((g.w * 2)), sc: SC, gb: 1 }); // (drawn at 50%: w is the 50% width)
// Gwanghwamun's solid parts either side of the three arches (the arches: |x| < 1.5 and 3.0..5.2 at 50%)
{
  const W = g.w * FOOT, D = 7 * SC[0], cs = Math.cos(g.a), sn = Math.sin(g.a);
  for (const [u0, u1] of [[1.5, 3.0], [5.2, g.w]]) for (const s of [-1, 1]) {
    const a = u0 * SC[0], b = Math.min(W / 2, u1 * SC[0]), u = (s * (a + b)) / 2;
    blockers.push({ p: rect(u * cs, u * sn, b - a, D, g.a) });
  }
}
for (const n of ['흥례문', '근정문']) {
  const o = O[n], s = 0.5; // palacegate: w, d at s; drawn at 50%
  lm.push({ type: 'palacegate', x: r1(o.x), z: r1(o.z), ry: r2(-o.a), w: r1((o.w * 2) / s), d: r1((o.d * 2) / s), s, sc: SC, name: { ko: n, en: n === '흥례문' ? 'Heungnyemun' : 'Geunjeongmun', han: n === '흥례문' ? '興禮門' : '勤政門' }, gb: 1 });
  const W = o.w * FOOT, D = o.d * FOOT, cs = Math.cos(o.a), sn = Math.sin(o.a);
  for (const k of [-1.5, -0.5, 0.5, 1.5]) { const u = (k * W) / 3; blockers.push({ p: rect(o.x + u * cs, o.z + u * sn, 0.5, D, o.a) }); } // its posts (three passages)
}
// Geunjeongjeon: the hall on its two terraces. throne's hall is 30 × 20 at
// hs 1 (W1 = 30 hs); the hall's middle sits 2.6 hs behind the landmark's.
{
  const o = O['근정전'], hs = (o.w * 2) / 30, cs = Math.cos(o.a), sn = Math.sin(o.a);
  const back = (2 + 0.6) * hs * SC[0]; // the hall's offset from the terraces' middle, scaled
  const x = o.x - sn * back, z = o.z + cs * back; // the terraces' middle: in front of the hall
  lm.push({ type: 'throne', x: r1(x), z: r1(z), ry: r2(-o.a), hs: r2(hs), sc: SC, name: { ko: '근정전', en: 'Geunjeongjeon' }, gb: 1 });
  const T1 = [56 * hs * SC[0], 40 * hs * SC[0]];
  blockers.push({ p: rect(o.x, o.z, o.w * FOOT + 1, o.d * FOOT + 1, o.a) }); // the hall (the terraces are walked on: their steps)
  // The rank stones: rows down the court from the lower terrace's steps to Geunjeongmun.
  const gate = O['근정문'], front = z + T1[1] / 2 + 1.2, rows = 12, gap = Math.max(1, (gate.z - gate.d * FOOT / 2 - 1.5 - front) / (rows - 1));
  lm.push({ type: 'rankstones', x: r1(x + (front - z) * Math.tan(o.a) * -1), z: r1(front), ry: r2(-o.a), rows, gap: r2(gap), off: 3.2, gb: 1 });
  // The terraces themselves block (you go up the front steps only in view): keep them walkable round the hall.
  yards.push({ x, z, w: T1[0], d: T1[1], a: o.a, terrace: 1 });
}
// Yeongjegyo: the palace stream across Heungnyemun's yard, halfway between the two gates.
{
  const a = O['흥례문'], b = O['근정문'], x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, W = 27, ch = 2.2; // (W: the yard's width between its corridors)
  lm.push({ type: 'yeongjegyo', x: r1(x), z: r1(z), ry: r2(-a.a), w: r1(W / SC[0]), ch: r1(ch / SC[0]), bridge: r1(4 / SC[0]), sc: SC, name: { ko: '영제교', en: 'Yeongjegyo Bridge' }, gb: 1 });
  const cs = Math.cos(a.a), sn = Math.sin(a.a);
  for (const s of [-1, 1]) { const u = s * (2 + (W / 2 - 2) / 2) + 0; blockers.push({ p: rect(x + u * cs, z + u * sn, W / 2 - 2, ch, a.a) }); } // the water either side of the bridge
}
// Gyeonghoeru on its pond, Hyangwonjeong on its island.
{
  const o = O['경회루'];
  lm.push({ type: 'pavilion', x: r1(o.x), z: r1(o.z), ry: r2(Math.PI / 2 - o.a), sc: [0.3, 0.5], name: { ko: '경회루', en: 'Gyeonghoeru' }, gb: 1 });
  const h = O['향원정'];
  lm.push({ type: 'hexpavilion', x: r1(h.x), z: r1(h.z), sc: SC, bridge: 6, name: { ko: '향원정', en: 'Hyangwonjeong Pavilion' }, gb: 1 });
}
// Amisan: the garden terraces behind Gyotaejeon (between its corridors and Heungbokjeon's).
{
  const k = halls.find((h) => h.name === '교태전');
  lm.push({ type: 'amisan', x: r1(k.x), z: r1(k.z - 7.5), ry: r2(k.ry), w: 16, sc: SC, name: { ko: '아미산', en: 'Amisan Garden' }, gb: 1 });
}
lm.push({ type: 'palacehalls', x: 0, z: 0, v: UP, halls: halls.map((h) => { const e = [r1(h.x), r1(h.z), r1(h.w), r1(h.d), r2(h.ry), h.kind]; if (h.han) e.push(h.han); return e; }), gb: 1 });
lm.push({ type: 'cloister', x: 0, z: 0, h: 2.6, runs, gb: 1 });

// ---------- The ponds ----------
const water = osm.elements.filter((e) => e.kind === 'water').map((e) => ({ name: e.name, p: e.pts.map(local).map(([x, z]) => [r1(x), r1(z)]) }));


// ---------- Write ----------
const map = JSON.parse(readFileSync(MAP, 'utf8'));
const OLD = new Set(['gwanghwamun', 'palacegate', 'yeongjegyo', 'cloister', 'throne', 'rankstones', 'pavilion', 'palacehall', 'palacehalls', 'amisan', 'hexpavilion']);
const inOld = (p) => p.every(([x, z]) => x > -80 && x < 90 && z > -280 && z < 1.5);
map.landmarks = map.landmarks.filter((l) => !l.gb && !OLD.has(l.type) && !(l.type === 'wall' && inOld(l.p)) && !(l.type === 'blossoms' && inOld(l.p)));
map.blockers = map.blockers.filter((b) => !b.gb && !inOld(b.p));
map.areas = map.areas.filter((a) => !a.gb && !inOld(a.p) && !(a.k === 'park' && /palace site/.test(a.why || '')));
const wallH = 3.5;
const gaps = []; // the wall's gates: Gwanghwamun (south), Geonchunmun (east), Sinmumun (north), Yeongchumun (west)
const wallPts = OUTLINE.map(([x, z]) => [r1(x), r1(z)]);
map.landmarks.push({ type: 'wall', h: wallH, p: wallPts, gb: 1, why: 'the palace wall on its real line (OSM: the palace grounds, relation 5501517)' });
for (let i = 0; i < wallPts.length - 1; i++) {
  const [x0, z0] = wallPts[i], [x1, z1] = wallPts[i + 1];
  const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0);
  blockers.push({ p: rect((x0 + x1) / 2, (z0 + z1) / 2, L + 0.8, 1.6, a) });
}
map.landmarks.push(...lm);
map.blockers.push(...blockers.map((b) => ({ ...b, gb: 1 })));
// (the palace grounds are the bare ground, packed earth; the yards inside the corridors are paved, 박석)
// Round the palace: the lawn and trees (the park's outline goes round the wall).
// (in pieces: one polygon reaching far round the wall makes long thin
// triangles that flicker on a phone)
{
  const xs = wallPts.map((p) => p[0]), zs = wallPts.map((p) => p[1]);
  const X0 = Math.floor(Math.min(...xs)) - 1, X1 = Math.ceil(Math.max(...xs)) + 1, Z1 = Math.floor(Math.min(...zs)) - 1;
  map.areas.push({ k: 'park', gb: 1, why: 'lawn and trees round the palace wall', p: [[-170, -440], [X0, -440], [X0, 0.9], [-170, 0.9]] });
  map.areas.push({ k: 'park', gb: 1, p: [[X1, -440], [100, -440], [100, 0.9], [X1, 0.9]] });
  map.areas.push({ k: 'park', gb: 1, p: [[X0, -440], [X1, -440], [X1, Z1], [X0, Z1]] });
  map.areas.push({ k: 'park', gb: 1, p: [[r1(wallPts.at(-1)[0]), 0.9], [X0, 0.9], [X0, Z1], [X1, Z1], [X1, 0.9], [r1(wallPts[0][0]), 0.9], ...wallPts] });
}
// Lawns inside the wall, where the old halls stood (most were pulled down in
// the 1910s; today they are grass between gravel paths).
export const LAWNS = [
  [-56, -30, -18, -83], // west of the throne hall's courts (the old government offices, 궐내각사)
  [23, -30, 52, -76], // east of them, before the crown prince's quarters
  [-45, -126, -14, -200], // north of Gyeonghoeru's pond
  [20, -132, 52, -200], // north of Jagyeongjeon
];
for (const [x0, z0, x1, z1] of LAWNS) {
  const P = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  map.areas.push({ k: 'grass', gb: 1, p: P });
}
// The palace woods: trees inside the wall round the north half (green in
// summer, red in autumn), every 7 m along a line 4.5 m in from the wall,
// leaving out the spots on a building (so the woods come in a few runs).
{
  const line = [];
  for (const [x, z] of wallPts) if (z < -105) { const dx = x - 2, dz = z + 110, l = Math.hypot(dx, dz) || 1; line.push([x - (dx / l) * 4.5, z - (dz / l) * 4.5]); }
  const near = (x, z) => blockers.some((b) => [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([dx, dz]) => inside(b.p, x + dx, z + dz))) || water.some((w) => inside(w.p, x, z));
  let run = [];
  const runs2 = [];
  for (let i = 1; i < line.length; i++) {
    const [x0, z0] = line[i - 1], [x1, z1] = line[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 7));
    for (let k = 0; k < n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n;
      if (near(x, z)) { if (run.length > 1) runs2.push(run); run = []; } else run.push([r1(x), r1(z)]);
    }
  }
  if (run.length > 1) runs2.push(run);
  for (const p of runs2) map.landmarks.push({ type: 'blossoms', seasonal: true, gap: 7, inner: true, gb: 1, why: 'the palace woods along the wall', p });
}
for (const y of yards) map.areas.push({ k: 'stone', p: rect(y.x, y.z, y.w, y.d, y.a), gb: 1 });
for (const w of water) {
  map.areas.push({ k: 'water', p: w.p, gb: 1, why: w.name });
  map.blockers.push({ p: w.p, gb: 1 });
}
const xs = wallPts.map((p) => p[0]), zs = wallPts.map((p) => p[1]);
map.meta.enclosure.box = [Math.floor(Math.min(...xs)), 0, Math.ceil(Math.max(...xs)), Math.floor(Math.min(...zs))];
// (leaf arrays such as a point [x, z] or a box on one line, the rest indented)
const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
if (!process.argv.includes('--dry')) writeFileSync(MAP, pretty(map) + '\n');
console.log(`halls ${halls.length}, corridor runs ${runs.length}, own models ${own.length}, blockers ${blockers.length}, yards ${yards.length}, water ${water.length}`);

// ---------- A plan, to compare with the real map ----------
const si = process.argv.indexOf('--svg');
if (si > 0) {
  const X0 = -75, Z0 = -230, K = 5, W = 165 * K, Hh = 240 * K, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}"><rect width="100%" height="100%" fill="#f4f1ea"/>`;
  s += `<polygon points="${wallPts.map(P).join(' ')}" fill="#e9e2d2" stroke="#555" stroke-width="4"/>`;
  for (const y of yards) s += `<polygon points="${rect(y.x, y.z, y.w, y.d, y.a).map(P).join(' ')}" fill="#d9d0bd"/>`;
  for (const w of water) s += `<polygon points="${w.p.map(P).join(' ')}" fill="#9cc7e8"/>`;
  for (const e of osm.elements) if (e.kind === 'building') s += `<polygon points="${e.pts.map(local).map(P).join(' ')}" fill="none" stroke="#b5562f" stroke-width="1.5"/>`;
  for (const b of blockers) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#1f5fbf" fill-opacity="0.55"/>`;
  for (const h of halls) if (h.kind === 'r') s += `<polygon points="${rect(h.x, h.z, h.w, h.d, -h.ry).map(P).join(' ')}" fill="#e08a1e" fill-opacity="0.85"/>`; // the plain blocks
  s += '</svg>';
  writeFileSync(process.argv[si + 1], s);
}

// ---------- Can you walk to every hall? ----------
// Flood from just inside Gwanghwamun on a 40 cm grid (blocked: the
// blockers, grown by a body's half width) and check the ground in front of
// each hall and in each paved yard.
{
  const R = 0.4, X0 = -80, Z0 = -230, nx = Math.ceil(170 / R), nz = Math.ceil(235 / R);
  const bad = new Uint8Array(nx * nz);
  const all = blockers.concat(water.map((w) => ({ p: w.p })));
  for (const b of all) {
    const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
    for (let i = Math.max(0, Math.floor((Math.min(...xs) - 0.4 - X0) / R)); i <= Math.min(nx - 1, Math.ceil((Math.max(...xs) + 0.4 - X0) / R)); i++)
      for (let j = Math.max(0, Math.floor((Math.min(...zs) - 0.4 - Z0) / R)); j <= Math.min(nz - 1, Math.ceil((Math.max(...zs) + 0.4 - Z0) / R)); j++) {
        const x = X0 + (i + 0.5) * R, z = Z0 + (j + 0.5) * R;
        if (inside(b.p, x, z) || [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(([dx, dz]) => inside(b.p, x + dx, z + dz))) bad[j * nx + i] = 1;
      }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (!inside(wallPts, X0 + (i + 0.5) * R, Z0 + (j + 0.5) * R)) bad[j * nx + i] = 1;
  const seen = new Uint8Array(nx * nz), cell = (x, z) => Math.floor((z - Z0) / R) * nx + Math.floor((x - X0) / R);
  const q = [cell(0, -8)];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj, k = jj * nx + ii;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || seen[k] || bad[k]) continue;
      seen[k] = 1; q.push(k);
    }
  }
  const reach = (x, z) => { for (let r = 0; r <= 1.2; r += 0.4) for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (seen[cell(x + dx, z + dz)]) return true; return false; };
  const shut = [];
  for (const h of halls) if (h.kind !== 'g' && h.kind !== 'r') { // some side of it (most halls are reached from the front; some only from a side yard)
    const cs = Math.cos(-h.ry), sn = Math.sin(-h.ry), at = (u, v) => [h.x + u * cs - v * sn, h.z + u * sn + v * cs];
    const sides = [at(0, h.d / 2 + 1.2), at(0, -h.d / 2 - 1.2), at(h.w / 2 + 1.2, 0), at(-h.w / 2 - 1.2, 0)];
    if (!sides.some(([x, z]) => reach(x, z))) shut.push(h.name || `hall at ${r1(h.x)},${r1(h.z)}`);
  }
  for (const y of yards) { // somewhere inside its corridors
    if (y.terrace) continue;
    const cs = Math.cos(y.a), sn = Math.sin(y.a);
    let ok = false;
    for (let u = -y.w / 2 + 2.5; u < y.w / 2 - 2.5 && !ok; u += 0.8) for (let v = -y.d / 2 + 2.5; v < y.d / 2 - 2.5 && !ok; v += 0.8) ok = !!seen[cell(y.x + u * cs - v * sn, y.z + u * sn + v * cs)];
    if (!ok) shut.push(`yard at ${r1(y.x)},${r1(y.z)}`);
  }
  console.log(shut.length ? 'cannot walk to: ' + shut.join('; ') : 'every hall and yard can be walked to');
  if (process.argv.includes('--check') && shut.length) process.exitCode = 1;
  const ri = process.argv.indexOf('--reach');
  if (ri > 0) { // (debug: where you can walk, green)
    const K = 5, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${170 * K}" height="${235 * K}"><rect width="100%" height="100%" fill="#fff"/>`;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (seen[j * nx + i]) s += `<rect x="${i * R * K}" y="${j * R * K}" width="${R * K}" height="${R * K}" fill="#bfe3b4"/>`;
    for (const b of all) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#1f5fbf" fill-opacity="0.6"/>`;
    for (const h of halls) s += `<text x="${(h.x - X0) * K}" y="${(h.z - Z0) * K}" font-size="9">${h.name || ''}</text>`;
    writeFileSync(process.argv[ri + 1], s + '</svg>');
  }
}
