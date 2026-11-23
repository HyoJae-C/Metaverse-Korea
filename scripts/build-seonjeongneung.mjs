#!/usr/bin/env node
// Seonjeongneung (서울 선릉과 정릉, Samseong-dong, Gangnam-gu): the Joseon
// royal tombs in a pine wood among the towers, a UNESCO World Heritage site
// (Yozi 2026-11-24).
//
// Sizes (Yozi 2026-11-24: "부지는 그대로하고 내부 장식물 선릉정릉만 50%"):
//   The grounds, the wall's line, the paths and the streets round it at 1/4
//     (OpenStreetMap), like the rest of the map.
//   What stands at the tombs at 50%, each on its real (1/4) spot: the red
//     gates (홍살문), the stone paths' width (참도), the shrine halls
//     (정자각) and their stone platforms, the stele sheds (비각), the
//     guards' and kitchen halls (수복방, 수라간), the mounds, the curved
//     walls behind them (곡장) and the stone figures. Each is twice its 1/4
//     size round its own middle, so the spaces between them stay real.
//   The hills the tombs stand on: twice the 1/4 hill (OSM's foot) round the
//     mound, but kept short of the shrine hall in front (on the real map the
//     hall stands at the hill's foot; a hill grown to 50% all round would
//     bury it). `meta.tombs` gives each hill's front, real and drawn.
//   The ancestral hall (재실) at 50% too (at 1/4 it would be 3 m long).
//
// Made up or estimated, and marked in meta.approx: the hills' height, the
// stone figures' places (OSM has the mounds and walls, not the figures: laid
// out as at every Joseon royal tomb, from Yozi's photos), the wall's height,
// the Information Center (in the history hall's place).
//
//   node scripts/build-seonjeongneung.mjs            writes districts/seonjeongneung.json
//   node scripts/build-seonjeongneung.mjs --region   also region.json and the Information Center in stores.json
//   node scripts/build-seonjeongneung.mjs --check    numbers only; fails if something overlaps or can't be walked to
//   node scripts/build-seonjeongneung.mjs --svg f    a plan over the real map's lines
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, anchorOffset } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'seonjeongneung.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/seonjeongneung-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export const SJN = {
  scale: 2, // the tombs' things: 50% of real = twice the 1/4 map
  streetW: 8, // m: Seolleung-ro 100-gil, Samseong-ro 95-gil
  laneW: 7, // m: Bongeunsa-ro 68-gil
  seolleungRoW: 10, // m: the base map's Seolleung-ro (secondary)
  pathW: 2.2, // m: the park's ways
  wallH: 1.8, // m: the stone wall with a tiled top round the grounds
  gateW: 4.4, // m: the opening of the main gate
  hillH: 3.5, // m: a tomb's hill (about 7 m in Seoul, halved: its top a little over the shrine hall's ridge, as in Yozi's photos)
  hillGap: 2.5, // m kept between a hill's foot and the shrine hall's platform
  chamdoW: 1.6, // m: the stone path (about 3.2 m in Seoul, halved)
  infoBox: [10, 6], // m: the Information Center (game size, in the history hall's place)
  tree: 3.9, // m between trees in the wood (it is a dense wood)
};

// The district's anchor: the main gate by the ticket office (삼릉공원 입구).
export const ANCHOR = { place: 'Seonjeongneung main gate by the ticket office (Seolleung-ro 100-gil, Gangnam-gu)', lat: osm.entrance[0], lon: osm.entrance[1], local: [0, 0], why: 'No nudge: the gate on its real spot (scripts/build-seonjeongneung.mjs).' };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const LP = (p) => p.map(L);

// --- Geometry helpers ------------------------------------------------------
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [a, b] = p[i], [c, d] = p[(i + 1) % p.length]; s += a * d - c * b; } return s / 2; };
const centroid = (p) => { let a = 0, x = 0, z = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], c = x1 * z2 - x2 * z1; a += c; x += (x1 + x2) * c; z += (z1 + z2) * c; } return a ? [x / (3 * a), z / (3 * a)] : [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]; };
const open = (p) => (p.length > 2 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1] ? p.slice(0, -1) : p);
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineDist = (x, z, p) => { let d = Infinity; for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i - 1], p[i])); return d; };
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);
function inside(p, x, z) { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r; } return r; }
const grow = (p, c, s) => p.map(([x, z]) => [c[0] + (x - c[0]) * s, c[1] + (z - c[1]) * s]);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);
const rect = (cx, cz, w, d, a) => { const c = Math.cos(a), s = Math.sin(a); return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [cx + u * c - v * s, cz + u * s + v * c]); };
const band = (p, w) => p.slice(1).map((q, i) => { const a = p[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, nx = (-(q[1] - a[1]) / len) * w, nz = ((q[0] - a[0]) / len) * w, ex = ((q[0] - a[0]) / len) * w, ez = ((q[1] - a[1]) / len) * w; return [[[a[0] - ex + nx, a[1] - ez + nz], [q[0] + ex + nx, q[1] + ez + nz], [q[0] + ex - nx, q[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz], [a[0] - ex + nx, a[1] - ez + nz]]]; });
const lineLen = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
function simplify(p, tol) {
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = segDist(p[i][0], p[i][1], p[a], p[b]); if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
const polysOverlap = (a, b) => { try { return polygonClipping.intersection([[...a, a[0]]], [[...b, b[0]]]).reduce((s, P) => s + Math.abs(area(P[0])), 0); } catch { return 0; } };
const polyGap = (a, b) => { if (polysOverlap(a, b) > 0.01) return 0; let d = Infinity; for (const [x, z] of a) d = Math.min(d, ringDist(x, z, b)); for (const [x, z] of b) d = Math.min(d, ringDist(x, z, a)); return d; };

// --- The streets -----------------------------------------------------------
const streets = osm.streets.map((s) => ({ ...s, p: R1(simplify(LP(s.p), 0.3)) }));
const seolleungRo = LP(osm.seolleungRo);

// --- The grounds -----------------------------------------------------------
// OSM's outline, less the streets round it (OSM draws the park to the
// streets' middle on the south and east), less Seolleung-ro.
const RAW = LP(osm.outline);
const cuts = [
  ...streets.flatMap((s) => band(s.p, (s.n === '봉은사로68길' ? SJN.laneW : SJN.streetW) / 2 + 0.6)),
  ...band(seolleungRo, SJN.seolleungRoW / 2 + 0.8),
];
const cut = polygonClipping.difference([[...RAW, RAW[0]]], ...cuts).sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))[0][0];
const OUTLINE = R1(simplify(open(cut), 0.35));
const inPark = (x, z) => inside(OUTLINE, x, z);
// The grounds less a strip inside the wall (what stands at a tomb keeps off it).
const INNER = (() => { const ring = [...OUTLINE, OUTLINE[0]]; return polygonClipping.difference([ring], ...band(ring, 2.6)).sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))[0][0]; })();
const clipIn = (p) => { const r = polygonClipping.intersection([[...p, p[0]]], [INNER]); return r.length ? open(r.sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))[0][0]) : p; };

// --- The tombs ---------------------------------------------------------------
const S = SJN.scale;
const blockers = [], lm = [], approx = [], nudges = [];
const things = []; // every footprint at 50%, for the overlap check: { name, p }
function hall(name, ring, kind, extra = {}) {
  const p = open(LP(ring)), c = centroid(p);
  const g = grow(p, c, S);
  return { name, kind, c, p: g, ...extra };
}
// The front of a footprint: the side facing `to`.
const facing = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]); // (ry: +z turned to face `to`)

// The stone screen (병풍석, carved with the twelve zodiac guardians) round the
// mound: King Seongjong's and King Jungjong's mounds have one; Queen
// Jeonghyeon's has only the railing (난간석) (Cultural Heritage Administration).
const SCREEN = { seolleung: 1, jeonghyeon: 0, jeongneung: 1 };
function tomb(id, name, d, jjC, jjHalf) {
  const ring = open(LP(d.tomb)), c = centroid(ring);
  const r = ring.reduce((s, q) => s + Math.hypot(q[0] - c[0], q[1] - c[1]), 0) / ring.length;
  const wall = LP(d.wall);
  const rw = wall.reduce((s, q) => Math.max(s, Math.hypot(q[0] - c[0], q[1] - c[1])), 0);
  const ry = facing(c, jjC); // the tomb faces its shrine hall
  const fx = Math.sin(ry), fz = Math.cos(ry);
  const toHall = Math.hypot(jjC[0] - c[0], jjC[1] - c[1]);
  // The hill's foot in front: OSM's embankment (the 1/4 hill) twice as far
  // from the mound, kept SJN.hillGap short of the shrine hall's platform.
  const footReal = d.hill ? Math.max(...LP(d.hill).map(([x, z]) => (x - c[0]) * fx + (z - c[1]) * fz)) : rw * 1.3;
  const front = Math.min(footReal * S, toHall - jjHalf - SJN.hillGap);
  const side = rw * S + 3.5, back = rw * S + 4;
  const hillP = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, u = Math.cos(a) * side, v = Math.sin(a) * (Math.sin(a) > 0 ? front : back);
    // (local u across, v forward; a little squarer than an ellipse)
    const k = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 3) + Math.pow(Math.abs(Math.sin(a)), 3), 1 / 3);
    hillP.push([c[0] + (u * k) * Math.cos(ry) + (v * k) * fx, c[1] - (u * k) * Math.sin(ry) + (v * k) * fz]);
  }
  const clipped = clipIn(hillP);
  const cutBack = r1(Math.abs(area(hillP)) - Math.abs(area(clipped)));
  hillP.length = 0; hillP.push(...clipped);
  const t = {
    cutBack, id, name, c, ry, mound: 2 * r * S, wall: rw * S, hill: { front, side, back, h: SJN.hillH, p: R1(hillP) },
    real: { front: r1(footReal * 4), toHall: r1(toHall * 4) },
  };
  things.push({ name: name.en + ' hill', p: hillP, hill: true });
  blockers.push({ p: R1(hillP), low: true, why: name.en + ': its hill, fenced (you look at the tomb from below)' });
  lm.push({ type: 'royaltomb', x: r1(c[0]), z: r1(c[1]), ry: r2(ry), mound: r1(2 * r * S), wall: r1(rw * S), hill: { front: r1(front), side: r1(side), back: r1(back), h: SJN.hillH, p: R1(hillP).map(([x, z]) => [r1(x - c[0]), r1(z - c[1])]) }, ...(SCREEN[id] ? {} : { screen: 0 }), inner: 1 });
  return t;
}

const groups = [];
for (const [id, d, name] of [['seolleung', osm.seolleung, { ko: '선릉', en: 'Seolleung' }], ['jeongneung', osm.jeongneung, { ko: '정릉', en: 'Jeongneung' }]]) {
  const jj = hall(name.en + ' Jeongjagak', d.jeongjagak, 'jeongjagak');
  const plat = hall(name.en + ' platform', d.platform, 'platform');
  const gate = L(d.gate);
  const chamdo = LP(d.chamdo);
  const ry = facing(jj.c, gate); // the hall faces down its stone path to the red gate
  // its size: the platform's (OSM, the 1/4 stone base) twice; the hall on it
  const pp = plat.p, pc = centroid(pp);
  const dims = (p, a) => { const c = Math.cos(a), s = Math.sin(a); let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity; for (const [x, z] of p) { const u = (x - pc[0]) * c - (z - pc[1]) * s, v = (x - pc[0]) * s + (z - pc[1]) * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } return { w: u1 - u0, d: v1 - v0 }; };
  const pd = dims(pp, ry), hd = dims(jj.p, ry);
  const half = Math.max(pd.d, hd.d) / 2;
  groups.push({ id, name, jj, plat, gate, chamdo, ry, pc, pd, hd, half, d });
  things.push({ name: name.en + ' Jeongjagak platform', p: rect(pc[0], pc[1], pd.w, pd.d, -ry) });
  blockers.push({ p: R1(rect(pc[0], pc[1], pd.w, pd.d, -ry)), why: name.en + ' Jeongjagak on its stone platform' });
  lm.push({ type: 'jeongjagak', x: r1(pc[0]), z: r1(pc[1]), ry: r2(ry), base: [r1(pd.w), r1(pd.d)], hall: [r1(hd.w), r1(hd.d)], inner: 1 });
}
const [SL, JN] = groups;
const tombs = [
  tomb('seolleung', { ko: '선릉 (성종)', en: 'Seolleung (King Seongjong)' }, osm.seolleung, SL.pc, SL.half),
  tomb('jeonghyeon', { ko: '선릉 (정현왕후)', en: 'Seolleung (Queen Jeonghyeon)' }, osm.jeonghyeon, SL.pc, SL.half),
  tomb('jeongneung', { ko: '정릉 (중종)', en: 'Jeongneung (King Jungjong)' }, osm.jeongneung, JN.pc, JN.half),
];

// The red gates and the stone paths up to the halls.
for (const g of groups) {
  // 홍살문: across the path, on OSM's spot (Jeongneung's moved in along the
  // path if its posts would stand on the street).
  const dir = Math.atan2(g.pc[0] - g.gate[0], g.pc[1] - g.gate[1]);
  let at = g.gate.slice(); const w = 4; // m (about 8 m in Seoul)
  const ux = Math.cos(dir), uz = -Math.sin(dir); // (across the path)
  const posts = () => [[at[0] + ux * w / 2, at[1] + uz * w / 2], [at[0] - ux * w / 2, at[1] - uz * w / 2]];
  // (the nearest spot where both posts stand inside the wall: in along the
  // path, or a little to one side of it)
  const fit = () => posts().every(([x, z]) => inPark(x, z) && ringDist(x, z, OUTLINE) >= 0.6);
  let moved = 0;
  if (!fit()) {
    const g0 = at.slice(); let best = null;
    for (let a = 0; a <= 10; a += 0.25) for (let b = -2.5; b <= 2.5; b += 0.25) {
      at = [g0[0] + Math.sin(dir) * a + ux * b, g0[1] + Math.cos(dir) * a + uz * b];
      if (fit() && (!best || Math.hypot(a, b) < best.d)) best = { d: Math.hypot(a, b), at: at.slice() };
    }
    at = best ? best.at : g0; moved = best ? r2(best.d) : 0;
  }
  if (moved) nudges.push({ what: g.name.en + ' Hongsalmun', m: moved, real: moved * 4, why: 'moved in along its stone path so the posts stand inside the wall (OSM puts it right by the street)' });
  g.gateAt = at;
  for (const [x, z] of posts()) blockers.push({ p: R1(rect(x, z, 0.5, 0.5, -dir)) });
  things.push({ name: g.name.en + ' Hongsalmun', p: rect(at[0], at[1], w, 0.5, -dir) });
  lm.push({ type: 'hongsalmun', x: r1(at[0]), z: r1(at[1]), ry: r2(dir), w, inner: 1 });
  // 참도: from the gate to the platform's front edge, on OSM's line.
  const front = [g.pc[0] + Math.sin(g.ry) * (g.pd.d / 2), g.pc[1] + Math.cos(g.ry) * (g.pd.d / 2)];
  const along = ([x, z]) => (x - at[0]) * Math.sin(dir) + (z - at[1]) * Math.cos(dir); // (metres from the gate towards the hall)
  const line = [at, ...g.chamdo.slice(1, -1).filter((q) => along(q) > 1 && along(q) < along(front) - 0.5), front];
  g.chamdoLine = R1(simplify(line, 0.2));
  lm.push({ type: 'chamdo', x: 0, z: 0, p: g.chamdoLine, w: SJN.chamdoW, inner: 1 });
}

// The small halls round the shrine halls, and the ancestral hall by the south wall.
const smalls = [
  hall('Seolleung stele shed', osm.seolleung.bigak, 'bigak'),
  hall('Seolleung guards\' hall', osm.seolleung.subokbang, 'tombhall'),
  hall('Seolleung kitchen hall', osm.seolleung.suragan, 'tombhall'),
  hall('Jeongneung stele shed', osm.jeongneung.bigak, 'bigak'),
  hall('Jaesil (ancestral hall)', osm.jaesil, 'tombhall', { big: 1 }),
];
// Push a small hall away from what it touches (its middle moved out from the
// other's) until there is a body's width between them.
const firmP = () => [...things.map((t) => t.p)];
for (const h of smalls) {
  let moved = 0, step = 0.2;
  const hitting = () => firmP().find((P) => polyGap(h.p, P) < 0.9);
  for (let hit = hitting(); hit && moved < 8; hit = hitting()) {
    const oc = centroid(hit), d = Math.hypot(h.c[0] - oc[0], h.c[1] - oc[1]) || 1;
    const dx = ((h.c[0] - oc[0]) / d) * step, dz = ((h.c[1] - oc[1]) / d) * step;
    h.c = [h.c[0] + dx, h.c[1] + dz]; h.p = h.p.map(([x, z]) => [x + dx, z + dz]); moved += step;
  }
  if (moved) nudges.push({ what: h.name, m: r1(moved), real: r1(moved * 4), why: 'at 50% it touched its neighbour: moved straight out from it' });
  things.push({ name: h.name, p: h.p });
  blockers.push({ p: R1(h.p) });
  const a = (() => { let best = 0, bl = 0; for (let i = 0; i < h.p.length; i++) { const [x0, z0] = h.p[i], [x1, z1] = h.p[(i + 1) % h.p.length], l = Math.hypot(x1 - x0, z1 - z0); if (l > bl) { bl = l; best = Math.atan2(z1 - z0, x1 - x0); } } return best; })();
  const cs = Math.cos(a), sn = Math.sin(a);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, z] of h.p) { const u = (x - h.c[0]) * cs + (z - h.c[1]) * sn, v = -(x - h.c[0]) * sn + (z - h.c[1]) * cs; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  lm.push({ type: h.kind, x: r1(h.c[0]), z: r1(h.c[1]), ry: r2(-a), w: r1(u1 - u0), d: r1(v1 - v0), ...(h.big ? { big: 1 } : {}), inner: 1 });
}

// --- The Information Center ---------------------------------------------------
// In the place of the history hall (선릉·정릉 역사문화관, by the south wall),
// its door on Seolleung-ro 100-gil. Game size; moved in from the street.
const museum = L(osm.museum);
const south = streets[0].p;
const info = (() => {
  // the street's direction there, and the side towards the park
  let best = { d: Infinity }; for (let i = 1; i < south.length; i++) { const d = segDist(museum[0], museum[1], south[i - 1], south[i]); if (d < best.d) best = { d, a: south[i - 1], b: south[i] }; }
  const ang = Math.atan2(best.b[1] - best.a[1], best.b[0] - best.a[0]);
  const [w, dd] = SJN.infoBox;
  let nx = -Math.sin(ang), nz = Math.cos(ang); if (!inPark(museum[0] + nx * 4, museum[1] + nz * 4)) { nx = -nx; nz = -nz; }
  // the front face on the park's edge (just in from the wall), the rest inside
  let c = museum.slice(), moved = 0;
  const fits = () => rect(c[0], c[1], w, dd, ang).every(([x, z]) => inPark(x, z) && ringDist(x, z, OUTLINE) > 0.4 || lineDist(x, z, south) > SJN.streetW / 2 + 0.6);
  const foot = () => rect(c[0], c[1], w, dd, ang);
  // slide it towards the street until its front is 0.6 m off the pavement
  for (let k = 0; k < 80; k++) { const near = Math.min(...foot().map(([x, z]) => lineDist(x, z, south))); if (near < SJN.streetW / 2 + 0.6) { c = [c[0] + nx * 0.2, c[1] + nz * 0.2]; moved += 0.2; } else if (near > SJN.streetW / 2 + 1) { c = [c[0] - nx * 0.2, c[1] - nz * 0.2]; moved -= 0.2; } else break; }
  void fits;
  const p = foot();
  const door = [c[0] - nx * (dd / 2 + 0.6), c[1] - nz * (dd / 2 + 0.6)];
  return { c, p, ang, door, moved: Math.abs(moved), nx, nz };
})();
nudges.push({ what: 'Information Center', m: r1(Math.hypot(info.c[0] - museum[0], info.c[1] - museum[1])), real: r1(Math.hypot(info.c[0] - museum[0], info.c[1] - museum[1]) * 4), why: 'stands in the history hall\'s place with its door on the street' });
things.push({ name: 'Information Center', p: info.p });

// --- The wall and the main gate ------------------------------------------------
// The wall round the grounds, with one opening: the main gate by the ticket
// office (OSM's 삼릉공원 입구, the district's 0, 0).
const ENTR = [0, 0];
const wallLine = (() => {
  // the outline from just past the gate all the way round to just before it
  let bi = 0, bd = Infinity, bt = 0;
  for (let i = 0; i < OUTLINE.length; i++) { const a = OUTLINE[i], b = OUTLINE[(i + 1) % OUTLINE.length]; const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((ENTR[0] - a[0]) * dx + (ENTR[1] - a[1]) * dz) / (dx * dx + dz * dz))); const d = Math.hypot(a[0] + dx * t - ENTR[0], a[1] + dz * t - ENTR[1]); if (d < bd) { bd = d; bi = i; bt = t; } }
  const a = OUTLINE[bi], b = OUTLINE[(bi + 1) % OUTLINE.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const at = (s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
  const g0 = Math.max(0, bt - SJN.gateW / 2 / len), g1 = Math.min(1, bt + SJN.gateW / 2 / len);
  const pts = [at(g1)];
  for (let k = 1; k <= OUTLINE.length; k++) pts.push(OUTLINE[(bi + k) % OUTLINE.length]);
  pts.push(at(g0));
  return { pts: R1(pts), gateAt: at(bt), off: bd };
})();
lm.push({ type: 'wall', h: SJN.wallH, p: wallLine.pts, why: 'the stone wall round the grounds, on the park\'s OSM outline less the streets (height made up)' });
for (let i = 0; i < wallLine.pts.length - 1; i++) {
  const [x0, z0] = wallLine.pts[i], [x1, z1] = wallLine.pts[i + 1];
  blockers.push({ p: R1(rect((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + 0.8, 1.4, Math.atan2(z1 - z0, x1 - x0))) });
}
blockers.push({ p: R1(info.p) });

// --- The paths ------------------------------------------------------------------
// Every OSM way inside (fee=yes), at 1/4; not under the halls or the hills.
const solid = () => blockers.filter((b) => !b.wallSeg).map((b) => b.p);
const roads = [
  { k: 'tertiary', w: SJN.streetW, p: [...streets[0].p, ...streets[1].p.slice(1)], n: { ko: '선릉로100길', en: 'Seolleung-ro 100-gil' }, why: 'Seolleung-ro 100-gil and Samseong-ro 95-gil from Seolleung-ro past the main gate to Samseong-ro (OSM)' },
  { k: 'tertiary', w: SJN.laneW, p: streets[2].p, n: { ko: '봉은사로68길', en: 'Bongeunsa-ro 68-gil' }, why: 'along the east side, up to Bongeunsa-ro (OSM)' },
];
const hillPolys = tombs.map((t) => t.hill.p);
const CHAMDO_IDS = new Set([369687314, 369687320, 369687315, 369687321]); // (the stone paths: drawn as the chamdo landmark)
for (const w of osm.paths) {
  if (CHAMDO_IDS.has(w.id)) continue;
  const p = LP(w.p);
  if (lineLen(p) < 1.5) continue;
  // cut where it runs into a hill or a hall (the ways up to a tomb end at the fence)
  const runs = []; let run = [];
  const pts = []; for (let i = 0; i < p.length; i++) { if (i) { const [ax, az] = p[i - 1], [bx, bz] = p[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1)); for (let k = 1; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); } pts.push(p[i]); }
  for (const q of pts) {
    const bad = !inPark(q[0], q[1]) || ringDist(q[0], q[1], OUTLINE) < 1.2 || hillPolys.some((P) => inside(P, q[0], q[1])) || things.filter((t) => !t.hill).some((t) => inside(t.p, q[0], q[1]));
    if (bad) { if (run.length > 1) runs.push(run); run = []; } else run.push(q);
  }
  if (run.length > 1) runs.push(run);
  for (const rn of runs) if (lineLen(rn) > 2) roads.push({ k: 'walk', w: SJN.pathW, p: R1(simplify(rn, 0.3)), why: 'OSM way ' + w.id });
}
// The way in: from the gate onto the park's main path.
roads.push({ k: 'walk', w: 3.4, p: R1([[wallLine.gateAt[0] + 0.4, wallLine.gateAt[1] + 0.4], [-3.5, -4], [-6.5, -9]]), why: 'from the main gate in to the first fork (OSM: the gate node to way 239953119)' });

// --- Lawns and the wood ---------------------------------------------------------
const lawns = [osm.seolleung.lawn, osm.jeonghyeon.lawn, osm.jeongneung.lawn].map((q) => { const p = open(LP(q)); const r = polygonClipping.intersection([[...p, p[0]]], [[...OUTLINE, OUTLINE[0]]]); return R1(open(r.sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))[0][0])); }); // (inside the wall)
const areas = [
  { k: 'park', p: OUTLINE, n: { ko: '선릉과 정릉', en: 'Seonjeongneung' } },
  ...lawns.map((p) => ({ k: 'grass', p })),
];
const ginkgo = L(osm.ginkgo);
lm.push({ type: 'oldginkgo', x: r1(ginkgo[0]), z: r1(ginkgo[1]), why: 'the 500-year-old ginkgo, a natural monument (OSM 3734588276); about 9 m tall here', inner: 1 });
blockers.push({ p: R1(rect(ginkgo[0], ginkgo[1], 1.4, 1.4, 0)) });
const trees = [];
{
  const hash = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
  const xs = OUTLINE.map((q) => q[0]), zs = OUTLINE.map((q) => q[1]);
  const lines = roads.map((r) => ({ p: r.p, w: r.w }));
  const chamdos = groups.map((g) => g.chamdoLine);
  for (let z = Math.min(...zs); z < Math.max(...zs); z += SJN.tree) for (let x = Math.min(...xs); x < Math.max(...xs); x += SJN.tree) {
    const jx = x + (hash(x, z) - 0.5) * 2.8, jz = z + (hash(z, x) - 0.5) * 2.8;
    if (!inPark(jx, jz) || ringDist(jx, jz, OUTLINE) < 2.2) continue;
    if (lawns.some((P) => inside(P, jx, jz) || ringDist(jx, jz, P) < 1.2)) continue;
    if (lines.some((L2) => lineDist(jx, jz, L2.p) < L2.w / 2 + 1.3) || chamdos.some((C) => lineDist(jx, jz, C) < 3)) continue;
    if (things.some((t) => inside(t.p, jx, jz) || ringDist(jx, jz, t.p) < (t.hill ? 1.4 : 2.4))) continue;
    if (Math.hypot(jx - ginkgo[0], jz - ginkgo[1]) < 6 || Math.hypot(jx - ENTR[0], jz - ENTR[1]) < 8) continue;
    trees.push([r1(jx), r1(jz)]);
  }
}
lm.push({ type: 'shrinetrees', x: 0, z: 0, spots: trees });

// --- Visitors, names and signs ------------------------------------------------
// Where a few people stand looking at the tombs (game/seonjeongneung-near.js).
const front = (g, k) => [r1(g.pc[0] + Math.sin(g.ry) * (g.pd.d / 2 + k)), r1(g.pc[1] + Math.cos(g.ry) * (g.pd.d / 2 + k))];
const sideOf = (g, k, s) => { const f = front(g, k); return [r1(f[0] + Math.cos(g.ry) * s), r1(f[1] - Math.sin(g.ry) * s)]; };
const visitors = [
  { at: sideOf(SL, 3, 2.2), look: tombs[0].c.map(r1) }, { at: sideOf(SL, 3.6, 3.2), look: tombs[0].c.map(r1) },
  { at: sideOf(SL, 6, -2.6), look: SL.pc.map(r1) },
  { at: sideOf(JN, 3, -2.2), look: tombs[2].c.map(r1) }, { at: sideOf(JN, 5, 2.4), look: JN.pc.map(r1) },
];
// two walking the long paths (there and back)
const walks = roads.filter((r) => r.k === 'walk').sort((a, b) => lineLen(b.p) - lineLen(a.p)).slice(0, 2).map((r) => r.p);
const pois = [
  { kind: 'landmark', x: r1(tombs[0].c[0]), z: r1(tombs[0].c[1]), name: { ko: '선릉', en: 'Seolleung', ja: '宣陵', zh: '宣陵' } },
  { kind: 'landmark', x: r1(tombs[2].c[0]), z: r1(tombs[2].c[1]), name: { ko: '정릉', en: 'Jeongneung', ja: '靖陵', zh: '靖陵' } },
];
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const SIGNS = [
  { at: [-6, -11.5], ry: Math.PI * 0.18, title: N('서울 선릉과 정릉', 'Seonjeongneung Royal Tombs', 'ソウル宣陵と靖陵', '首尔宣陵和靖陵'),
    text: N('조선 9대 성종과 정현왕후의 선릉, 11대 중종의 정릉. 2009년 유네스코 세계유산(조선왕릉). 홍살문에서 참도를 따라 정자각까지 걸어가 언덕 위 능을 올려다본다. 능 언덕에는 올라갈 수 없다. 이 게임에서 능의 건물과 석물은 실제의 절반 크기다.',
      'Seolleung, the tomb of King Seongjong (the 9th Joseon king) and Queen Jeonghyeon, and Jeongneung, the tomb of King Jungjong (the 11th). UNESCO World Heritage since 2009 (Royal Tombs of the Joseon Dynasty). Walk from the red gate along the stone path to the shrine hall and look up at the tomb on its hill; the hills are fenced off. In this game the halls and stone figures are half their real size.',
      '朝鮮9代成宗と貞顕王后の宣陵、11代中宗の靖陵。2009年ユネスコ世界遺産（朝鮮王陵）。紅箭門から参道を歩いて丁字閣まで行き、丘の上の陵を見上げる。陵の丘には上れない。このゲームでは陵の建物と石像は実物の半分の大きさ。',
      '朝鲜第9代成宗与贞显王后的宣陵、第11代中宗的靖陵。2009年列入联合国教科文组织世界遗产（朝鲜王陵）。从红箭门沿参道走到丁字阁，仰望山丘上的陵墓。陵丘不能攀登。游戏里陵墓的建筑和石像是实际的一半大小。') },
];
for (const s of SIGNS) { lm.push({ type: 'sign', x: s.at[0], z: s.at[1], ry: r2(s.ry), title: s.title, text: s.text }); blockers.push({ p: R1(rect(s.at[0], s.at[1], 1.6, 0.5, -s.ry)) }); }
lm.push({ type: 'tombvisitors', x: 0, z: 0, spots: visitors, walks, inner: 1 });

approx.push(
  { what: 'tomb hills', why: `OSM has each hill's front foot, not its height: ${SJN.hillH} m here (about 7 m in Seoul, halved). The hills are twice the 1/4 hill round the mound, kept ${SJN.hillGap} m short of the shrine hall's platform (meta.tombs).` },
  { what: 'stone figures and lanterns', why: 'Not in OSM: the sheep and tigers inside the curved wall, the civil and military officials, the stone lantern and the offering table kinds and counts as the public records give them (each mound: 2 pairs of stone sheep and of tigers, a pair of pillars, an offering table; a lantern, a pair of civil officials and of military officials, each with a horse), the set laid down in the Gukjo Orye-ui; their exact places along each mound are not in OSM, laid out from one aerial photo.' },
  { what: 'wall height and coping', why: `${SJN.wallH} m stone wall with a tiled top on the OSM outline; the real fence varies.` },
  { what: 'Information Center', why: 'Every district has one: put in the place of the history hall (선릉·정릉 역사문화관), game size.' },
  { what: 'the way in from the gate', why: 'A short paved way from the gate to the first fork (OSM has the gate and the ticket office, not a path between them).' },
);

// --- Write ------------------------------------------------------------------------
const xs = OUTLINE.map((q) => q[0]), zs = OUTLINE.map((q) => q[1]);
const box = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...zs)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...zs))];
const parts = [{ why: 'the grounds', box }];
for (const r of roads.filter((q) => q.k !== 'walk')) {
  for (let i = 0; i < r.p.length - 1;) {
    let e = i + 1, s = 0;
    while (e < r.p.length - 1 && s < 30) { s += Math.hypot(r.p[e + 1][0] - r.p[e][0], r.p[e + 1][1] - r.p[e][1]); e++; }
    const pts = r.p.slice(i, e + 1), h = r.w / 2;
    parts.push({ box: [Math.floor(Math.min(...pts.map((p) => p[0])) - h), Math.floor(Math.min(...pts.map((p) => p[1])) - h), Math.ceil(Math.max(...pts.map((p) => p[0])) + h), Math.ceil(Math.max(...pts.map((p) => p[1])) + h)] });
    i = e;
  }
}
const map = {
  meta: {
    district: 'seonjeongneung',
    source: 'scripts/build-seonjeongneung.mjs: the grounds, the paths, the streets, the tombs, the halls, the gates and the stone paths from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/seonjeongneung-osm.json). Grounds and paths at 1/4; what stands at the tombs at 50% on its real spot (Yozi 2026-11-24).',
    scale: { grounds: '1/4', tombs: '50%', why: 'Yozi 2026-11-24: 부지는 그대로, 내부 장식물(선릉·정릉)만 50%' },
    tombs: tombs.map((t) => ({ id: t.id, at: t.c.map(r1), mound: r1(t.mound), wall: r1(t.wall), hillFront: r1(t.hill.front), hillFrontAt50: r1(t.real.front / 4 * S), toHall: r1(t.real.toHall / 4), why: 'hill front kept short of the shrine hall where 50% would reach it' })),
    nudges,
    approx,
    parts,
    enclosure: { why: 'inside the wall: the tombs, halls and gates are built when you first walk in through the main gate (core/enclosure.js); the wood shows over the wall', box: [box[0], box[3], box[2], box[1]], poly: OUTLINE },
  },
  roads,
  buildings: [{ h: 4.2, p: R1(info.p), n: 'info-seonjeongneung' }],
  areas,
  blockers: blockers.filter((b) => !things.find((t) => t.name === 'Information Center' && t.p === b.p)),
  pois,
  landmarks: lm,
};

// --- Checks ------------------------------------------------------------------------
const report = { OFFSET, outlinePts: OUTLINE.length, areaRaw: Math.round(Math.abs(area(RAW))), area: Math.round(Math.abs(area(OUTLINE))), trees: trees.length, paths: roads.filter((r) => r.k === 'walk').length, blockers: blockers.length };
report.areaLost = `${Math.round((1 - report.area / report.areaRaw) * 100)}% (the streets OSM's outline runs to)`;
report.tombs = tombs.map((t) => `${t.id}: hill cut ${t.cutBack} m² at the wall, mound ${r1(t.mound)} m across, wall ${r1(t.wall)} m, hill front ${r1(t.hill.front)} m (50% would be ${r1(t.real.front / 2)}), to hall ${r1(t.real.toHall / 4)} m`);
report.halls = groups.map((g) => `${g.id}: platform ${r1(g.pd.w)} x ${r1(g.pd.d)} m, hall ${r1(g.hd.w)} x ${r1(g.hd.d)} m, path ${r1(lineLen(g.chamdoLine))} m`);
report.nudges = nudges.map((n) => `${n.what} ${n.m} m (${n.real} m in Seoul)`);
report.gateOffWall = r1(wallLine.off);
const clash = [];
for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
  const o = polysOverlap(things[i].p, things[j].p);
  if (o > 0.05) clash.push(`${things[i].name} x ${things[j].name} (${r1(o)} m²)`);
}
for (const t of things) if (t.name !== 'Information Center' && t.p.some(([x, z]) => !inPark(x, z))) clash.push(`${t.name} sticks out of the grounds`); // (the Information Center stands in the wall's line, its door on the street)
report.clash = clash.length ? clash : 'none';

// Can you walk to everything? Flood from inside the gate on a 40 cm grid.
{
  const Rg = 0.4, X0 = box[0] - 2, Z0 = box[1] - 2, nx = Math.ceil((box[2] - box[0] + 4) / Rg), nz = Math.ceil((box[3] - box[1] + 4) / Rg);
  const bad = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = X0 + (i + 0.5) * Rg, z = Z0 + (j + 0.5) * Rg;
    if (!inPark(x, z)) { bad[j * nx + i] = 1; continue; }
    for (const b of map.blockers) if ([[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(([dx, dz]) => inside(b.p, x + dx, z + dz))) { bad[j * nx + i] = 1; break; }
  }
  const seen = new Uint8Array(nx * nz), cell = (x, z) => Math.floor((z - Z0) / Rg) * nx + Math.floor((x - X0) / Rg);
  const st = [cell(-3, -4)]; seen[st[0]] = 1;
  while (st.length) { const c = st.pop(), i = c % nx, j = (c - i) / nx; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj, k = jj * nx + ii; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || seen[k] || bad[k]) continue; seen[k] = 1; st.push(k); } }
  const reach = (x, z, far = 1.6) => { for (let r = 0; r <= far; r += 0.4) for (let a = 0; a < 8; a++) if (seen[cell(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r)]) return true; return false; };
  const shut = [];
  for (const g of groups) { if (!reach(...g.gateAt, 2)) shut.push(g.name.en + ' gate'); const f = front(g, 1.2); if (!reach(...f)) shut.push(g.name.en + ' hall front'); }
  for (let i = visitors.length - 1; i >= 0; i--) if (!reach(...visitors[i].at, 0.4)) visitors.splice(i, 1); // (a spot on a hill or a hall: no one stands there)
  let cutPts = 0; for (const r of roads) if (r.k === 'walk') for (const [x, z] of r.p) if (!reach(x, z, 1.4)) cutPts++;
  report.walk = shut.length || cutPts ? `cannot walk to: ${shut.join('; ')} (${cutPts} path points shut in)` : 'every gate, hall front, visitor spot and path point can be walked to from the main gate';
  if (process.argv.includes('--check') && (shut.length || cutPts || clash.length)) process.exitCode = 1;
}
console.log(report);

const pretty = (o) => JSON.stringify(o, null, 1).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
if (!process.argv.includes('--check') && !process.argv.includes('--svg')) {
  writeFileSync(MAP, pretty(map) + '\n');
  console.log('wrote districts/seonjeongneung.json', Math.round(pretty(map).length / 1024), 'KB');
}
if (process.argv.includes('--region')) {
  let text = readFileSync(path.join(R, 'region.json'), 'utf8');
  const block = `    {\n      "id": "seonjeongneung",\n      "map": "districts/seonjeongneung.json",\n      "offset": [\n        ${OFFSET[0]},\n        ${OFFSET[1]}\n      ],\n      "anchor": ${JSON.stringify(ANCHOR).replace(/([{,])"/g, '$1 "').replace(/":/g, '": ').replace(/}$/, ' }').replace(/\[0,0\]/, '[0, 0]')}\n    },\n`;
  const old = text.match(/    \{\n      "id": "seonjeongneung",[\s\S]*?\n    \},\n/);
  if (old) text = text.replace(old[0], block);
  else { const at = text.indexOf('    {\n      "id": "samseong"'); text = text.slice(0, at) + block + text.slice(at); }
  writeFileSync(path.join(R, 'region.json'), text);
  const SP = path.join(R, 'stores.json');
  let stores = readFileSync(SP, 'utf8');
  const at = stores.indexOf('"id": "info-seonjeongneung"');
  const door = [r1(info.door[0] + OX), r1(info.door[1] + OZ)];
  if (at >= 0) { const end = stores.indexOf('\n', at); stores = stores.slice(0, at) + stores.slice(at, end).replace(/"at": \[[^\]]*\]/, `"at": [${door[0]}, ${door[1]}]`) + stores.slice(end); writeFileSync(SP, stores); }
  console.log('region.json: offset', OFFSET, '; info door', door, at >= 0 ? '(stores.json updated)' : '(add info-seonjeongneung to stores.json)');
}

// --- A plan over the real map's lines ------------------------------------------
const si = process.argv.indexOf('--svg');
if (si > 0) {
  const X0 = box[0] - 15, Z0 = box[1] - 15, K = 6, W = (box[2] - box[0] + 30) * K, H = (box[3] - box[1] + 30) * K;
  const P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f4f1ea"/>`;
  for (const a of areas) s += `<polygon points="${a.p.map(P).join(' ')}" fill="${a.k === 'grass' ? '#c4e3a6' : '#dbe9cc'}"/>`;
  for (const r of roads) s += `<polyline points="${r.p.map(P).join(' ')}" fill="none" stroke="${r.k === 'walk' ? '#fff' : '#bbb'}" stroke-width="${r.w * K}" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (const t of trees) s += `<circle cx="${(t[0] - X0) * K}" cy="${(t[1] - Z0) * K}" r="${1.4 * K}" fill="#5f9a4f" fill-opacity=".35"/>`;
  for (const b of map.blockers) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#1f5fbf" fill-opacity="0.35"/>`;
  for (const t of things) s += `<polygon points="${t.p.map(P).join(' ')}" fill="${t.hill ? 'none' : '#e08a1e'}" stroke="#a24d00" stroke-width="1.5"/>`;
  s += `<polyline points="${wallLine.pts.map(P).join(' ')}" fill="none" stroke="#444" stroke-width="3"/>`;
  // the real (1/4) OSM lines on top, red: outline, tombs, walls, halls, gates
  const red = (p, closed = true) => `<poly${closed ? 'gon' : 'line'} points="${p.map(P).join(' ')}" fill="none" stroke="#d0342c" stroke-width="1.6" stroke-dasharray="5 3"/>`;
  s += red(RAW);
  for (const d of [osm.seolleung, osm.jeonghyeon, osm.jeongneung]) { s += red(open(LP(d.tomb))); s += red(LP(d.wall), false); if (d.hill) s += red(LP(d.hill), false); if (d.jeongjagak) s += red(open(LP(d.jeongjagak))); if (d.bigak) s += red(open(LP(d.bigak))); if (d.chamdo) s += red(LP(d.chamdo), false); if (d.gate) { const [x, z] = L(d.gate); s += `<circle cx="${(x - X0) * K}" cy="${(z - Z0) * K}" r="5" fill="#d0342c"/>`; } }
  for (const p of pois) s += `<text x="${(p.x - X0) * K + 6}" y="${(p.z - Z0) * K}" font-size="15" font-family="sans-serif">${p.name.ko}</text>`;
  writeFileSync(process.argv[si + 1], s + '</svg>');
}
