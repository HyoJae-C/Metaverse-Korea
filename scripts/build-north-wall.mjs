#!/usr/bin/env node
// Builds the north and west of the Seoul City Wall (한양도성): Inwangsan
// (인왕산) and Bugaksan (북악산) as wooded hills with the wall on their
// crest, Changuimun (창의문) and Sukjeongmun (숙정문), and, where the wall
// is gone in the city (Inwangsan's foot to Donuimun, Sowuimun and
// Sungnyemun, and on to Namsan), a line of stones in the ground. Into the
// Gyeongbokgung map (districts/gyeongbokgung.json, items marked `bw`), its
// `northwall` landmark (core/north-ground.js, game/north-wall.js).
//
// The wall's line is OpenStreetMap's at 1/4 (scripts/data/north-wall-osm.json,
// export of 2026-11-13, © OpenStreetMap contributors, ODbL). Sizes (Yozi,
// 2026-11-13): the route at 1/4, the wall 50% high (about 3.5 m), the small
// gates 43.75% like Hyehwamun and Gwanghuimun, so you walk through them.
// The hills' heights are a game approximation of the real ones above the
// plain, at 1/4 (Bugaksan 342 m and Inwangsan 338 m above the sea: about
// 77 m), not a survey; they come down to the plain before the city's
// districts, so near the palace and Hyoja-ro the wall stands on the hill's
// foot. The old cone behind the palace (the `mountain` landmark) goes.
//
//   node scripts/build-north-wall.mjs
//
// What it writes: the `northwall` landmark (the crest, the slopes' reach,
// the flat city boxes, the wall's stretches, the gates, the stone line and
// the gate sites), the wall's and the gates' blockers, and the place names.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { mergeDistricts, districtBoxes } from '../src/core/districts.js';
import { northHeight } from '../src/core/north-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const FILE = path.join(R, 'districts', 'gyeongbokgung.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const OSM = readJson(path.join(root, 'scripts', 'data', 'north-wall-osm.json'));
const region = readJson(path.join(R, 'region.json'));
const gb = readJson(FILE);
const [OX, OZ] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

export const NORTH = {
  thick: 1.4, // m: the wall's thickness (its blocker)
  H: 3.5, // m: 50% high
  reach: [40, 3.4], // m: the slopes reach a + b * h from the crest (at most about 21°)
  grade: 0.24, // the climb along the crest at most (13.5°: with its bends, the wall's foot stays under about 20°)
  wallK: 0.33, // on the wall, the rise from the city's edge at most (20°)
  k: 0.53, // the steepest rise from the city's edge (28°: a wooded mountainside; the wall's trail along the crest stays under 20°)
  margin: 8, // m: kept flat round the districts' boxes
  gate: 0.4375, // the small gates (Yozi: like Hyehwamun)
  gateReal: [11.7, 7.5], // m: a small gate's base (Hyehwamun's, an approximation)
  open: 3, // m: the wall opens this far round a gate
  markW: 1.2, // m: the stone line where the wall is gone
};
const C = NORTH;

// Drop what this script wrote before, and the old cone.
for (const k of ['blockers', 'pois']) gb[k] = (gb[k] || []).filter((it) => !it.bw);
gb.landmarks = gb.landmarks.filter((l) => l.type !== 'northwall' && l.type !== 'mountain');

const map = mergeDistricts(region.districts.map((d) => ({ id: d.id, map: d.id === 'gyeongbokgung' ? gb : readJson(path.join(R, d.map)), offset: d.offset })), region.links);
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineDist = (x, z, p) => { let b = Infinity; for (let i = 1; i < p.length; i++) b = Math.min(b, segDist(x, z, p[i - 1], p[i])); return b; };
const length = (p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
function simplify(p, tol) { // Douglas-Peucker, metres
  if (p.length < 3) return p;
  const a = p[0], b = p.at(-1);
  let best = 0, k = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = segDist(p[i][0], p[i][1], a, b); if (d > best) { best = d; k = i; } }
  return best > tol ? [...simplify(p.slice(0, k + 1), tol).slice(0, -1), ...simplify(p.slice(k), tol)] : [a, b];
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
const byId = new Map(OSM.elements.map((e) => [e.id, e]));
const geom = (id) => byId.get(id).geometry.map((q) => toGame(q.lat, q.lon));
const streets = map.roads.filter((r) => !r.hill && r.k !== 'walk');
const onStreet = (x, z, m) => streets.some((r) => lineDist(x, z, r.p) < r.w / 2 + m);
const onBuilding = (x, z, m) => map.buildings.some((b) => inPoly(x, z, b.p) || (m > 0 && lineDist(x, z, [...b.p, b.p[0]]) < m));

// ---------- The wall's ways, from Inwangsan's foot to Waryong Park ----------
// Each group is chained into one line; the gaps between groups are real
// (Changuimun's road, and the city east of Waryong Park towards Hyehwamun).
const WAYS = [
  [777900313, 777900306], // the stretch at the foot of Inwangsan, above Sajik-ro
  [608932946, 78503356, 382251769], // up over Inwangsan to Changuimun
  [771695714, 1569043399, 54264684, 1495041634], // Changuimun over Bugaksan past Sukjeongmun
  [607913403], // by Waryong Park
];
let prevEnd = [-2000, -700];
const full = WAYS.map((ids) => {
  const left = ids.map(geom);
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

// ---------- The crest and its heights ----------
// The wall's line, gaps and all, every ~15 m, with the height (m above the
// plain) at named points, by distance along it.
const crestLine = simplify(full.flat(), 6);
const along = (p) => { const s = [0]; for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return s; };
const S = along(crestLine);
const at = ([x, z]) => { // the distance along the crest of its point nearest (x, z)
  let best = Infinity, s = 0;
  for (let i = 1; i < crestLine.length; i++) {
    const a = crestLine[i - 1], b = crestLine[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (L * L)));
    const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (d < best) { best = d; s = S[i - 1] + L * t; }
  }
  return s;
};
const inwang = full[1].reduce((m, q) => (q[0] < m[0] ? q : m)); // Inwangsan's top: where the wall is furthest west
const sukjeong = OSM.elements.find((e) => e.type === 'node' && e.tags?.name === '숙정문');
const sukjeongAt = toGame(sukjeong.lat, sukjeong.lon);
const changui = full[2][0]; // the wall's end east of Changuimun's road
const PROFILE = [ // [where, height]: real heights above the sea, less the plain (about 35 m), at 1/4
  [full[0][0], 0], // Sajik-ro
  [full[1][0], 8], // the foot of the Inwangsan stretch
  [inwang, 76], // Inwangsan (338 m)
  [changui, 40], // Changuimun's pass (about 195 m)
  [[changui[0] + (sukjeongAt[0] - changui[0]) * 0.3, changui[1] + (sukjeongAt[1] - changui[1]) * 0.3], 77], // Bugaksan (342 m), a third of the way to Sukjeongmun
  [full[2].reduce((m, q) => (q[1] < m[1] ? q : m)), 70], // Gokjang-dae, the wall's furthest north (about 315 m)
  [sukjeongAt, 52], // Sukjeongmun (about 245 m)
  [full[3][0], 20], // Waryong Park (about 115 m)
  [full[3].at(-1), 16],
].map(([q, h]) => [at(q), h]).sort((a, b) => a[0] - b[0]);
const hAt = (s) => {
  if (s <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) if (s <= PROFILE[i][0]) { const [a, ya] = PROFILE[i - 1], [b, yb] = PROFILE[i]; return ya + ((yb - ya) * (s - a)) / (b - a || 1); }
  return PROFILE.at(-1)[1];
};
// past Waryong Park the hill comes down to Hyehwamun's side (Naksan's map)
// ---------- Where the city is: the ground stays flat there ----------
const flat = districtBoxes(map).map((b) => [b.x0 - C.margin, b.z0 - C.margin, b.x1 + C.margin, b.z1 + C.margin]);
// and round anything outside the districts' boxes (a road between them)
{
  const m = C.reach[0] + C.reach[1] * 80;
  const xs = crestLine.map((p) => p[0]), zs = crestLine.map((p) => p[1]);
  const [bx0, bz0, bx1, bz1] = [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m];
  const inFlat = (x, z) => flat.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  for (const it of [...map.roads, ...map.buildings, ...(map.areas || []).filter((a) => a.k !== 'water')]) {
    if (it.bw || !it.p?.some(([x, z]) => x > bx0 && x < bx1 && z > bz0 && z < bz1)) continue;
    if (it.p.every(([x, z]) => inFlat(x, z))) continue;
    const xs2 = it.p.map((q) => q[0]), zs2 = it.p.map((q) => q[1]), w = (it.w || 0) / 2 + C.margin;
    flat.push([Math.min(...xs2) - w, Math.min(...zs2) - w, Math.max(...xs2) + w, Math.max(...zs2) + w]);
  }
}
// Along the wall the ground climbs no steeper than `grade` (it is the trail),
// and near the city no higher than the slope up from its edge allows.
const dFlat = (x, z) => Math.min(...flat.map(([x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1))));
const crestD = dense(crestLine, 5);
const SD = along(crestD);
const hD = crestD.map((q, i) => Math.min(hAt(SD[i]), C.wallK * dFlat(q[0], q[1])));
for (let i = 1; i < hD.length; i++) hD[i] = Math.min(hD[i], hD[i - 1] + C.grade * (SD[i] - SD[i - 1]));
for (let i = hD.length - 2; i >= 0; i--) hD[i] = Math.min(hD[i], hD[i + 1] + C.grade * (SD[i + 1] - SD[i]));
const crest = [...crestD.map((q, i) => [q[0], q[1], hD[i]]).filter((q, i) => i % 2 === 0 || i === crestD.length - 1), [-1185, -1262, 0]];


const L = { type: 'northwall', x: 0, z: -640 }; // (where the cone stood, Gyeongbokgung's metres)
const LX = OX + L.x, LZ = OZ + L.z;
const local = ([x, z]) => [r1(x - LX), r1(z - LZ)];
Object.assign(L, {
  line: crest.map(([x, z, h]) => [...local([x, z]), r1(h)]),
  reach: C.reach, k: C.k,
  flat: flat.map(([x0, z0, x1, z1]) => [...local([x0, z0]), ...local([x1, z1])]),
});
const LW = { ...L, x: LX, z: LZ }; // (in world metres, as the game has it)
const y = (x, z) => northHeight(LW, x, z);

// ---------- The gates ----------
function gateAt([x, z], line, n) { // on the wall's line nearest (x, z), along it
  let best = Infinity, ux = 1, uz = 0, px = x, pz = z;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (len * len)));
    const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (d < best) { best = d; ux = dx / len; uz = dz / len; px = a[0] + dx * t; pz = a[1] + dz * t; }
  }
  const W = r1(C.gateReal[0] * C.gate), D = r1(C.gateReal[1] * C.gate);
  const H = r1(Math.max(1.4, W * 0.34)), A = r1(W * 0.11), Sp = r1(H * 0.55);
  return { x: r1(px), z: r1(pz), ry: +(-Math.atan2(uz, ux)).toFixed(3), W, D, H, A, S: Sp, n };
}
// Changuimun: at the wall's end west of its road, the gate itself on the
// wall (its road goes round it, by Jahamun tunnel's mouth).
const gates = [
  gateAt([full[1].at(-1)[0] + 3, full[1].at(-1)[1] - 6], full[1], N('창의문', 'Changuimun', '彰義門', '彰义门')),
  gateAt(sukjeongAt, full[2], N('숙정문', 'Sukjeongmun', '粛靖門', '肃靖门')),
];
const gateUV = (g, [x, z]) => { const c = Math.cos(g.ry), s = Math.sin(g.ry), dx = x - g.x, dz = z - g.z; return [dx * c - dz * s, dx * s + dz * c]; };
const inGate = (q, m) => gates.some((g) => { const [u, v] = gateUV(g, q); return Math.abs(u) < g.W / 2 + m && Math.abs(v) < g.D / 2 + m; });

// ---------- The wall's stretches: open at the gates, the streets and the buildings ----------
const runs = [];
for (const p of full) {
  let cur = null;
  for (const q of dense(p, 0.5)) {
    const open = inGate(q, 0.2) || onStreet(q[0], q[1], C.thick / 2 + 0.5) || onBuilding(q[0], q[1], C.thick / 2 + 0.5);
    if (open) { cur = null; continue; }
    if (!cur) runs.push((cur = []));
    cur.push(q);
  }
}
const wallRuns = runs.filter((r) => length(r) > 2).map((r) => simplify(r, 0.4));

// ---------- The stone line where the wall is gone ----------
// From the Inwangsan stretch's foot down past Donuimun's site and
// Sowuimun's to Sungnyemun, and from Sungnyemun's east stub up to the
// Namsan stretch (approximate: the real line went through what are blocks
// now). Where it would cross a building, it stops.
const donui = OSM.elements.find((e) => e.type === 'node' && /돈의문/.test(e.tags?.wikipedia || ''));
const donuiAt = toGame(donui.lat, donui.lon);
const eul = readJson(path.join(R, 'districts', 'euljiro.json'));
const [EX, EZ] = region.districts.find((d) => d.id === 'euljiro').offset;
const sungnye = eul.landmarks.find((l) => l.type === 'sungnyemun');
const SX = sungnye.x + EX, SZ = sungnye.z + EZ;
const itaewon = readJson(path.join(R, 'districts', 'itaewon.json'));
const [IX, IZ] = region.districts.find((d) => d.id === 'itaewon').offset;
const ns = itaewon.landmarks.find((l) => l.type === 'namsan');
const namsanWall = ns.wall.runs.map((r) => r.map(([x, z]) => [x + IX + ns.x, z + IZ + ns.z])).sort((a, b) => a[0][0] - b[0][0])[0][0];
export const SOWUIMUN = [37.5625, 126.9715]; // its site (approximate, from the historic maps; OSM has no node)
const sowuiAt = toGame(...SOWUIMUN);
const markRoute = [
  [full[0][0], donuiAt, sowuiAt, [SX - 34, SZ]], // Inwangsan's foot to Sungnyemun's west stub
  [[SX + 30, SZ], namsanWall], // Sungnyemun's east stub to the Namsan stretch
];
const marks = [];
for (const route of markRoute) {
  let cur = null;
  for (const q of dense(route, 1)) {
    if (onBuilding(q[0], q[1], C.markW / 2 + 0.3) || y(q[0], q[1]) > 0.05) { cur = null; continue; }
    if (!cur) marks.push((cur = []));
    cur.push(q);
  }
}
const markRuns = marks.filter((r) => r.length > 3).map((r) => simplify(r, 0.3));
const sites = [
  { x: donuiAt[0], z: donuiAt[1], n: N('돈의문 터', 'Donuimun site', '敦義門跡', '敦义门遗址') },
  { x: sowuiAt[0], z: sowuiAt[1], n: N('소의문 터', 'Sowuimun site', '昭義門跡', '昭义门遗址') },
];
// (a site's stone on a building is moved to the nearest open ground beside it)
for (const s of sites) {
  for (let r = 0; onBuilding(s.x, s.z, 1.2) && r < 40; r += 0.5) {
    const k = [...Array(16)].map((_, i) => [s.x + Math.cos(i * Math.PI / 8) * r, s.z + Math.sin(i * Math.PI / 8) * r]).find(([x, z]) => !onBuilding(x, z, 1.2) && !onStreet(x, z, 0.5));
    if (k) { s.moved = r1(Math.hypot(k[0] - s.x, k[1] - s.z)); [s.x, s.z] = k; }
  }
}

Object.assign(L, {
  thick: C.thick, H: C.H,
  runs: wallRuns.map((r) => r.map(local)),
  gates: gates.map((g) => ({ ...g, x: local([g.x, g.z])[0], z: local([g.x, g.z])[1] })),
  marks: markRuns.map((r) => r.map(local)), markW: C.markW,
  sites: sites.map((s) => ({ x: local([s.x, s.z])[0], z: local([s.x, s.z])[1], n: s.n })),
});
gb.landmarks.push(L);

// ---------- Blockers: the wall, and each gate's base either side of its arch ----------
const dist = ([x, z]) => [r1(x - OX), r1(z - OZ)];
const quad = (a, b, w) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
  const nx = -uz * w / 2, nz = ux * w / 2, e = 0.2;
  return [[a[0] - ux * e + nx, a[1] - uz * e + nz], [b[0] + ux * e + nx, b[1] + uz * e + nz], [b[0] + ux * e - nx, b[1] + uz * e - nz], [a[0] - ux * e - nx, a[1] - uz * e - nz]].map(dist);
};
for (const p of wallRuns) for (let i = 1; i < p.length; i++) gb.blockers.push({ p: quad(p[i - 1], p[i], C.thick), bw: 1 });
for (const g of gates) {
  const c = Math.cos(g.ry), s = Math.sin(g.ry), P = (u, v) => dist([g.x + u * c + v * s, g.z - u * s + v * c]);
  for (const [u0, u1] of [[-g.W / 2, -g.A], [g.A, g.W / 2]]) gb.blockers.push({ p: [P(u0, -g.D / 2), P(u1, -g.D / 2), P(u1, g.D / 2), P(u0, g.D / 2)], bw: 1 });
}

// ---------- Place names ----------
const poi = ([x, z], name) => gb.pois.push({ kind: 'landmark', x: dist([x, z])[0], z: dist([x, z])[1], bw: 1, name });
poi(inwang, N('인왕산', 'Inwangsan', '仁王山', '仁王山'));
poi(PROFILE && [changui[0] + (sukjeongAt[0] - changui[0]) * 0.3, changui[1] + (sukjeongAt[1] - changui[1]) * 0.3], N('북악산', 'Bugaksan', '北岳山', '北岳山'));
for (const g of gates) poi([g.x, g.z + 6], g.n);
for (const s of sites) poi([s.x, s.z], s.n);
if (!gb.meta.source.includes('build-north-wall')) gb.meta.source += '. Inwangsan, Bugaksan and the city wall on them: scripts/build-north-wall.mjs (OpenStreetMap, scripts/data/north-wall-osm.json)';
const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']'); // (the file's layout: short arrays on one line)
writeFileSync(FILE, pretty(gb) + '\n');

const wl = wallRuns.reduce((s, r) => s + length(r), 0);
console.log(`north wall: ${Math.round(wl)} m of wall in ${wallRuns.length} stretches (OSM ${Math.round(full.reduce((s, r) => s + length(r), 0))} m); crest ${crest.length} points, top ${Math.max(...crest.map((p) => p[2]))} m; ${flat.length} flat boxes; gates ${gates.map((g) => `${g.n.en} (${g.x}, ${g.z}) on ${r1(y(g.x, g.z))} m`).join(', ')}; stone line ${Math.round(markRuns.reduce((s, r) => s + length(r), 0))} m in ${markRuns.length}; sites ${sites.map((s) => `${s.n.en}${s.moved ? ` moved ${s.moved} m` : ''}`).join(', ')}`);
