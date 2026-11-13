#!/usr/bin/env node
// The Seoul City Wall (한양도성) on Namsan, from Baekbeom Square up over the
// summit and down through Jangchung-dong to Gwanghuimun, with its trail
// (서울한양도성 남산구간), into the Itaewon district's map (items marked `hw`)
// and its namsan landmark (`wall`, `wtrail`), the way the summit trail is.
//
// The wall's line is OpenStreetMap's at 1/4 (scripts/data/namsan-wall-osm.json,
// export of 2026-11-13, © OpenStreetMap contributors, ODbL), with its real
// gaps: OSM has no wall up the west slope from Baekbeom Square, none round
// the summit plaza, none across Jangchungdan-ro by the National Theater and
// little between Jangchung-dong and Gwanghuimun. The short stretch at
// Baekbeom Square is left out (the game's Sowol-ro runs on it). Sizes
// (Yozi, 2026-11-13): the route at 1/4; the wall 50% high (about 3.5 m;
// the trail here is mostly at its foot, so you look up at it); Gwanghuimun
// 43.75% like Hyehwamun, so you walk through its arch (OSM has no outline
// of it: its real size is taken as Hyehwamun's, an approximation).
//
// The trail is OSM's 서울한양도성 남산구간 ways (and the paths joining them),
// from Baekbeom Square to Gwanghuimun, the outside way where there are two.
// On the hill it is decks through the hill's blocker (game/namsan-walk.js),
// drawn on the slope (core/landmarks.js); off it, a walk road. Where the
// summit trail from Sowol-ro shares its way (east of the summit plaza), the
// summit trail is kept and this one joins it. Both are kept off the wall,
// and the wall opens where a trail goes through it.
//
//   node scripts/build-namsan-wall.mjs   (after build-namsan-real.mjs --trail)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { onNamsan } from '../src/core/namsan-shape.js';
import { mergeDistricts } from '../src/core/districts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const EMAP = path.join(R, 'districts', 'euljiro.json'); // (Jangchung-dong and Gwanghuimun, east of Itaewon's box)
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const OSM = readJson(path.join(root, 'scripts', 'data', 'namsan-wall-osm.json'));
const region = readJson(path.join(R, 'region.json'));
const itaewon = readJson(MAP);
const euljiro = readJson(EMAP);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const [ex, ez] = region.districts.find((d) => d.id === 'euljiro').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

export const NAMSAN_WALL = {
  thick: 1.4, // m: the wall's thickness (its blocker off the hill)
  H: 3.5, // m: the wall's height above the ground (50%)
  pathW: 2.5,
  park: 9, // m either side of the trail through Jangchung-dong: a strip of park
  plaza: 29, // m round the tower: no wall (the summit plaza, 26 m, and its railing)
  open: 3, // m either side of where a trail goes through the wall
  gate: 0.4375, // Gwanghuimun (Yozi: like Hyehwamun)
  gateRoom: 3, // m kept open round it (made-up buildings are narrowed)
  gateReal: [11.7, 7.5], // m: its real base along the wall and through, taken as Hyehwamun's (OSM way 348885649)
  start: [-1736, -315], // world: the trail starts at Baekbeom Square, by Sowol-ro
  end: [-1007, -548], // world: and ends at Gwanghuimun
};
const C = NAMSAN_WALL;

// Drop what this script wrote before.
for (const k of ['roads', 'blockers', 'pois', 'areas']) for (const m of [itaewon, euljiro]) m[k] = (m[k] || []).filter((it) => !it.hw);
euljiro.meta.parts = euljiro.meta.parts.filter((p) => !p.hw);
const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
delete hill.wall; delete hill.wtrail; delete hill.wtrailW;
const HX = ox + hill.x, HZ = oz + hill.z; // the hill's origin, world metres
const onHill = (x, z, m = 0) => onNamsan(hill, x - HX, z - HZ, m);
const tower = [HX + hill.px, HZ + hill.pz];

// The rest of the city's roads (the wall and the gate keep off them).
const map = mergeDistricts(region.districts.map((d) => ({ id: d.id, map: { itaewon, euljiro }[d.id] || readJson(path.join(R, d.map)), offset: d.offset })), region.links);
// Itaewon's box ends here (world x): east of it, things go into Euljiro's map.
const EAST = Math.max(...itaewon.roads.filter((r) => !r.hw).flatMap((r) => r.p.map((q) => q[0]))) + ox;
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineDist = (x, z, p) => { let b = Infinity; for (let i = 1; i < p.length; i++) b = Math.min(b, segDist(x, z, p[i - 1], p[i])); return b; };
const streets = map.roads.filter((r) => !r.hill && r.k !== 'walk');
const onStreet = (x, z, m) => streets.some((r) => lineDist(x, z, r.p) < r.w / 2 + m);

function simplify(p, tol, bad = null) { // Douglas-Peucker, metres (bad(a, b): a straight piece that must not be, e.g. cutting a corner round the wall)
  if (p.length < 3) return p;
  const a = p[0], b = p.at(-1);
  let best = 0, k = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = segDist(p[i][0], p[i][1], a, b); if (d > best) { best = d; k = i; } }
  return best > tol || bad?.(a, b) ? [...simplify(p.slice(0, k + 1), tol, bad).slice(0, -1), ...simplify(p.slice(k), tol, bad)] : [a, b];
}
const dense = (p, step) => {
  const out = [];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  out.push(p.at(-1));
  return out;
};
const length = (p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const geom = (e) => e.geometry.map((q) => toGame(q.lat, q.lon));

// ---------- The wall's ways, from Sungnyemun's side to Gwanghuimun ----------
const WAYS = [[764899029], [764899030], [764899031, 1279010529], [764899033, 1279010525], [608835316], [776758647], [382250981, 1279010550, 1279010554]];
const byId = new Map(OSM.elements.map((e) => [e.id, e]));
let prevEnd = C.start;
const full = WAYS.map((ids) => { // each group chained into one line, starting at its end nearest the last one
  const left = ids.map((id) => geom(byId.get(id)));
  const d = (p) => Math.hypot(p[0] - prevEnd[0], p[1] - prevEnd[1]);
  left.sort((a, b) => Math.min(d(a[0]), d(a.at(-1))) - Math.min(d(b[0]), d(b.at(-1))));
  let line = left.shift();
  if (d(line.at(-1)) < d(line[0])) line.reverse();
  while (left.length) {
    const e = line.at(-1), dd = (p) => Math.hypot(p[0] - e[0], p[1] - e[1]);
    left.sort((a, b) => Math.min(dd(a[0]), dd(a.at(-1))) - Math.min(dd(b[0]), dd(b.at(-1))));
    const w = left.shift();
    line = [...line, ...(dd(w.at(-1)) < dd(w[0]) ? w.reverse() : w).slice(1)];
  }
  prevEnd = line.at(-1);
  return simplify(line, 0.4);
});
const wallSegs = full.flatMap((p) => p.slice(1).map((q, i) => [p[i], q]));

// ---------- The trail: OSM's ways, the course's ways cheaper ----------
function course() {
  const key = (q) => q.lat.toFixed(7) + ',' + q.lon.toFixed(7);
  const at = new Map(), adj = new Map();
  for (const e of OSM.elements) {
    if (!e.tags?.highway || !e.geometry) continue;
    const n = e.tags.name || '';
    const f = /한양도성|남산구간/.test(n) ? (/내부/.test(n) ? 0.5 : 0.3) : 1; // (the outside way where there are two)
    for (let i = 1; i < e.geometry.length; i++) {
      const a = key(e.geometry[i - 1]), b = key(e.geometry[i]), A = toGame(e.geometry[i - 1].lat, e.geometry[i - 1].lon), B = toGame(e.geometry[i].lat, e.geometry[i].lon);
      at.set(a, A); at.set(b, B);
      const w = Math.hypot(A[0] - B[0], A[1] - B[1]) * f;
      for (const [u, v] of [[a, b], [b, a]]) { if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, w]); }
    }
  }
  const nearest = ([x, z]) => [...adj.keys()].reduce((b, k) => (Math.hypot(at.get(k)[0] - x, at.get(k)[1] - z) < Math.hypot(at.get(b)[0] - x, at.get(b)[1] - z) ? k : b));
  const s = nearest(C.start), t = nearest(C.end);
  const dist = new Map([[s, 0]]), prev = new Map(), open = new Set([s]);
  while (open.size) {
    let u = null, ud = Infinity;
    for (const q of open) if (dist.get(q) < ud) { ud = dist.get(q); u = q; }
    open.delete(u);
    if (u === t) break;
    for (const [v, w] of adj.get(u)) if (ud + w < (dist.get(v) ?? Infinity)) { dist.set(v, ud + w); prev.set(v, u); open.add(v); }
  }
  const out = [];
  for (let c = t; c; c = prev.get(c)) out.push(at.get(c));
  return out.reverse();
}
const way = simplify(course(), 0.5);
const inPlaza = (q, m = 0) => Math.hypot(q[0] - tower[0], q[1] - tower[1]) < 26 + m;
const firstIn = way.findIndex((q) => inPlaza(q, -1)), lastIn = way.length - 1 - [...way].reverse().findIndex((q) => inPlaza(q, -1));
const west = way.slice(0, firstIn + 1);
let east = way.slice(lastIn);
// The summit trail from Sowol-ro (world metres), and where this one leaves it.
// (from its OSM points, scripts/build-namsan-real.mjs, so running this again
// gives the same; its first point, joining Sowol-ro, as that script left it)
const summitOsm = readJson(path.join(root, 'scripts', 'data', 'namsan-outline-osm.json')).trail.map((q) => toGame(...q));
const summit = [...(hill.trail.length > summitOsm.length ? [[HX + hill.trail[0][0], HZ + hill.trail[0][1]]] : []), ...summitOsm];
{
  // (the last point near it in the first half of the way, then on)
  let k = 1;
  east.forEach((q, i) => { if (i < east.length / 2 && lineDist(q[0], q[1], summit) < 8) k = i + 1; });
  const j = summit.reduce((b, q, i) => (Math.hypot(q[0] - east[k][0], q[1] - east[k][1]) < Math.hypot(summit[b][0] - east[k][0], summit[b][1] - east[k][1]) ? i : b), 0);
  east = [summit[j], ...east.slice(k)];
}

// ---------- Gwanghuimun ----------
// Its real spot (the OSM nodes), moved along the wall away from Toegye-ro
// until its base is clear of it.
const gate = (() => {
  const nodes = OSM.elements.filter((e) => e.type === 'node' && /광희문/.test(e.tags?.name || '')).map((e) => toGame(e.lat, e.lon));
  let x = nodes.reduce((s, q) => s + q[0], 0) / nodes.length, z = nodes.reduce((s, q) => s + q[1], 0) / nodes.length;
  const last = full.at(-1), [ax, az] = last.at(-2), [bx, bz] = last.at(-1), len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len, uz = (bz - az) / len; // the wall's way into the gate (north)
  const W = r1(C.gateReal[0] * C.gate), D = r1(C.gateReal[1] * C.gate);
  const corners = (x, z) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + ux * a * W / 2 - uz * b * D / 2, z + uz * a * W / 2 + ux * b * D / 2]);
  const real = [x, z];
  while (corners(x, z).some(([cx, cz]) => onStreet(cx, cz, 0.5))) { x -= ux * 0.25; z -= uz * 0.25; }
  // Its arch (as Hyehwamun's, from photos): A half its width, the round top from S.
  const H = r1(Math.max(1.4, W * 0.34)), A = r1(W * 0.11), S = r1(H * 0.55);
  return { x: r1(x), z: r1(z), ry: +(-Math.atan2(uz, ux)).toFixed(3), W, D, H, A, S, moved: r1(Math.hypot(x - real[0], z - real[1])), n: N('광희문', 'Gwanghuimun', '光熙門', '光熙门') };
})();
const gc = Math.cos(gate.ry), gs = Math.sin(gate.ry);
const gateUV = ([x, z]) => { const dx = x - gate.x, dz = z - gate.z; return [dx * gc - dz * gs, dx * gs + dz * gc]; };
const inGate = (q, m) => { const [u, v] = gateUV(q); return Math.abs(u) < gate.W / 2 + m && Math.abs(v) < gate.D / 2 + m; };
// The trail stops at the gate's side.
while (east.length > 2 && inGate(east.at(-1), 1.5)) east.pop();

// ---------- Trails off the wall; where one goes through it ----------
const cross = (a, b, c, d) => { // segments ab, cd: the crossing point or null
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
};
const throughs = []; // where a trail goes through the wall
const CLEAR = C.thick / 2 + C.pathW / 2 + 0.6;
function offWall(p, keep = false) { // (keep: move the points only, no new ones: the summit trail stays as it is where it is clear)
  const hits = [];
  for (let i = 1; i < p.length; i++) for (const [a, b] of wallSegs) { const q = cross(p[i - 1], p[i], a, b); if (q) hits.push(q); }
  throughs.push(...hits);
  const out = (keep ? p : dense(p, 0.5)).map(([x, z]) => {
    if (hits.some((q) => Math.hypot(q[0] - x, q[1] - z) < C.open + 1) || inGate([x, z], 2)) return [x, z];
    for (let it = 0; it < 4; it++) {
      let best = Infinity, px = 0, pz = 0;
      for (const [a, b] of wallSegs) {
        const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
        if (d < best) { best = d; px = a[0] + dx * t; pz = a[1] + dz * t; }
      }
      if (best >= CLEAR) break;
      const k = (CLEAR + 0.05) / (best || 0.01);
      x = px + (x - px) * k; z = pz + (z - pz) * k;
    }
    return [x, z];
  });
  const free = (x, z) => hits.some((q) => Math.hypot(q[0] - x, q[1] - z) < C.open + 1) || inGate([x, z], 2);
  const cuts = (a, b) => dense([a, b], 0.5).some(([x, z]) => !free(x, z) && wallSegs.some(([c, d]) => segDist(x, z, c, d) < CLEAR - 0.2));
  return (keep ? out : simplify(out, 0.3, cuts)).map(([x, z]) => [r1(x), r1(z)]);
}
const westP = offWall(west), eastP = offWall(east), summitP = offWall(summit, true);

// ---------- The wall's stretches: the gaps ----------
const runs = [];
for (const p of full) {
  let run = [];
  const flush = () => { if (run.length > 1 && length(run) >= 3) runs.push(simplify(run, 0.25).map(([x, z]) => [r1(x), r1(z)])); run = []; };
  for (const q of dense(p, 0.5)) {
    const gap = inPlaza(q, C.plaza - 26) || inGate(q, 0.3) || throughs.some((t) => Math.hypot(t[0] - q[0], t[1] - q[1]) < C.open)
      || onStreet(q[0], q[1], C.thick / 2 + 0.3)
      || [westP, eastP, summitP].some((t) => lineDist(q[0], q[1], t) < CLEAR - 0.4); // (where a trail rounds a stretch's end; elsewhere they are kept CLEAR - 0.2 off)
    if (gap) flush(); else run.push(q);
  }
  flush();
}

// ---------- Room for the gate and the trail ----------
// Euljiro's made-up buildings stand where the wall, Gwanghuimun and the
// trail now are: each is narrowed from its side nearer them until it is
// clear (a shop in it keeps its door in the middle of the front), or, if
// little would be left, taken away.
const stores = readJson(path.join(R, 'stores.json'));
let narrowed = 0, removed = 0;
const moved = [];
{
  const trailsW = [westP, eastP];
  const clash = (poly) => {
    const edge = poly.flatMap((a, i) => dense([a, poly[(i + 1) % poly.length]], 0.5));
    return edge.some((q) => inGate(q, C.gateRoom) || runs.some((r) => lineDist(q[0], q[1], r) < C.thick / 2 + 0.8) || trailsW.some((t) => lineDist(q[0], q[1], t) < C.pathW / 2 + 0.8));
  };
  const keep = [];
  for (const b of euljiro.buildings) {
    const W = b.p.map(([x, z]) => [x + ex, z + ez]);
    if (b.hw || W.length !== 4 || !clash(W)) { keep.push(b); continue; }
    // its sides: 3-0 and 1-2 (0-1 its front, 2-3 its back); move the nearer one
    const mid = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], gpt = [gate.x, gate.z];
    const dA = Math.hypot(...mid(W[3], W[0]).map((v, k) => v - gpt[k])), dB = Math.hypot(...mid(W[1], W[2]).map((v, k) => v - gpt[k]));
    const [i0, i1, j0, j1] = dA < dB ? [0, 3, 1, 2] : [1, 2, 0, 3]; // moving i0/i1 towards j0/j1
    const width = Math.hypot(W[j0][0] - W[i0][0], W[j0][1] - W[i0][1]), ux = (W[j0][0] - W[i0][0]) / width, uz = (W[j0][1] - W[i0][1]) / width;
    let m = 0, P = W;
    while (clash(P) && width - m > 5) { m += 0.5; P = W.map((q, k) => (k === i0 || k === i1 ? [q[0] + ux * m, q[1] + uz * m] : q)); }
    const shop = stores.stores.find((st) => st.at && Math.hypot(st.at[0] - mid(W[0], W[1])[0], st.at[1] - mid(W[0], W[1])[1]) < 4);
    if (clash(P)) {
      if (shop) throw new Error(`${shop.id}'s building is where the wall is`);
      removed++;
      continue;
    }
    b.p = P.map(([x, z]) => [r1(x - ex), r1(z - ez)]);
    if (shop) { shop.at = [r1(shop.at[0] + (ux * m) / 2), r1(shop.at[1] + (uz * m) / 2)]; moved.push(shop); }
    narrowed++;
    keep.push(b);
  }
  euljiro.buildings = keep;
}

// ---------- Into itaewon.json ----------
const local = ([x, z]) => [r1(x - HX), r1(z - HZ)]; // the hill's metres
const dist = ([x, z]) => [r1(x - ox), r1(z - oz)]; // the district's
// On the hill: the trail's decks (with a point past the foot each end).
const hillRuns = (p) => {
  const out = [];
  let cur = null;
  p.forEach((q, i) => {
    if (onHill(q[0], q[1], 3)) { if (!cur) { cur = i ? [p[i - 1]] : []; out.push(cur); } cur.push(q); }
    else if (cur) { cur.push(q); cur = null; }
  });
  return out.filter((r) => r.length > 1);
};
hill.wtrail = [...hillRuns(westP), ...hillRuns(eastP)].map((r) => r.map(local));
hill.wtrailW = C.pathW;
hill.trail = summitP.map(local);
const summitRoad = itaewon.roads.find((r) => r.nw);
if (summitRoad) summitRoad.p = summitP.map(dist);
hill.wall = { thick: C.thick, H: C.H, runs: runs.map((r) => r.map(local)), gate: { ...gate, ...Object.fromEntries([['x', r1(gate.x - HX)], ['z', r1(gate.z - HZ)]]) } };
delete hill.wall.gate.moved;

const name = N('남산 성곽길', 'Namsan City Wall Trail', '南山城郭道', '南山城郭路');
const edist = ([x, z]) => [r1(x - ex), r1(z - ez)]; // Euljiro's metres
// The east way: on Itaewon's map to the edge of its box, then on Euljiro's.
const cut = eastP.findIndex((q) => q[0] > EAST);
const [a, b] = [eastP[cut - 1], eastP[cut]], t = (EAST - a[0]) / (b[0] - a[0]), edge = [r1(EAST), r1(a[1] + (b[1] - a[1]) * t)];
itaewon.roads.push(
  { k: 'walk', w: C.pathW, hill: 1, hw: 1, p: westP.map(dist), n: name },
  { k: 'walk', w: C.pathW, hill: 1, hw: 1, p: [...eastP.slice(0, cut), edge].map(dist), n: name },
);
euljiro.roads.push({ k: 'walk', w: C.pathW, hw: 1, p: [edge, ...eastP.slice(cut)].map(edist), n: name });
{ // The strip of park along it (the real wall runs through woods and a park here).
  const p = simplify([edge, ...eastP.slice(cut)], 3), side = (d) => p.map((q, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [q[0] + ((b[1] - a[1]) / l) * d, q[1] - ((b[0] - a[0]) / l) * d];
  });
  euljiro.areas.push({ k: 'park', hw: 1, p: [...side(C.park), ...side(-C.park).reverse()].map(edist) });
}
// The wall's blockers off the hill (on it, the hill is one), and the gate's base.
const quad = (a, b, w, to) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
  const nx = -uz * w / 2, nz = ux * w / 2, e = 0.2;
  return [[a[0] - ux * e + nx, a[1] - uz * e + nz], [b[0] + ux * e + nx, b[1] + uz * e + nz], [b[0] + ux * e - nx, b[1] + uz * e - nz], [a[0] - ux * e - nx, a[1] - uz * e - nz]].map(to);
};
for (const p of runs) for (let i = 1; i < p.length; i++) {
  const m = [(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2];
  if (!onHill(m[0], m[1])) (m[0] > EAST ? euljiro : itaewon).blockers.push({ p: quad(p[i - 1], p[i], C.thick, m[0] > EAST ? edist : dist), hw: 1 });
}
{
  const P = (u, v) => edist([gate.x + u * gc + v * gs, gate.z - u * gs + v * gc]);
  for (const [u0, u1] of [[-gate.W / 2, -gate.A], [gate.A, gate.W / 2]]) euljiro.blockers.push({ p: [P(u0, -gate.D / 2), P(u1, -gate.D / 2), P(u1, gate.D / 2), P(u0, gate.D / 2)], hw: 1 });
}
const mid = westP[Math.floor(westP.length * 0.45)];
itaewon.pois.push({ kind: 'landmark', x: dist(mid)[0], z: dist(mid)[1], hw: 1, name });
euljiro.pois.push({ kind: 'landmark', x: edist([gate.x, gate.z])[0], z: r1(gate.z - ez + 6), hw: 1, name: gate.n });
{ // Euljiro's box for Jangchung-dong (it lists its parts): from Itaewon's edge to the DDP's part.
  const pts = [edge, ...eastP.slice(cut), ...runs.flat().filter((q) => q[0] > EAST)].map(edist);
  const ddp = Math.max(...euljiro.meta.parts.filter((p) => /DDP/.test(p.why)).map((p) => Math.max(p.box[1], p.box[3])));
  euljiro.meta.parts.push({ why: 'The city wall from Namsan to Gwanghuimun through Jangchung-dong (scripts/build-namsan-wall.mjs)', box: [Math.floor(Math.min(...pts.map((q) => q[0])) - 4), Math.floor(ddp), Math.ceil(Math.max(...pts.map((q) => q[0])) + 4), Math.ceil(Math.max(...pts.map((q) => q[1])) + 4)], hw: 1 });
}
if (!euljiro.meta.source.includes('build-namsan-wall')) euljiro.meta.source += '. The city wall in Jangchung-dong and Gwanghuimun: scripts/build-namsan-wall.mjs';
if (!itaewon.meta.source.includes('city wall on Namsan')) itaewon.meta.source += '. The city wall on Namsan and Gwanghuimun: scripts/build-namsan-wall.mjs (OpenStreetMap, scripts/data/namsan-wall-osm.json)';
writeFileSync(MAP, JSON.stringify(itaewon));
writeFileSync(EMAP, JSON.stringify(euljiro, null, 1) + '\n');
// (the shops' doors: only the "at" lines change, the file keeps its layout)
for (const st of moved) {
  const SF = path.join(R, 'stores.json'), txt = readFileSync(SF, 'utf8');
  const i = txt.search(new RegExp(`"id": ?"${st.id}"`)), m = /"at": ?\[[^\]]*\]/.exec(txt.slice(i));
  const sp = m[0].includes(': ') ? ', ' : ',';
  writeFileSync(SF, txt.slice(0, i + m.index) + m[0].replace(/\[[^\]]*\]/, `[${st.at.join(sp)}]`) + txt.slice(i + m.index + m[0].length));
}

const wallLen = runs.reduce((s, r) => s + length(r), 0);
console.log(`namsan wall: ${Math.round(wallLen)} m of wall in ${runs.length} stretches (OSM ${Math.round(full.reduce((s, r) => s + length(r), 0))} m), ${throughs.length} trail openings; trail ${Math.round(length(westP))} + ${Math.round(length(eastP))} m (${hill.wtrail.length} runs on the hill); Gwanghuimun ${gate.W} x ${gate.D} m, moved ${gate.moved} m off Toegye-ro; ${narrowed} buildings narrowed, ${removed} taken away`);
