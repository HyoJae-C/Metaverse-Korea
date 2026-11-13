#!/usr/bin/env node
// Builds Bukchon's district map (public/regions/another-seoul/districts/bukchon.json)
// on its real streets at 1/4, from OpenStreetMap (scripts/data/bukchon-osm.json,
// made by scripts/extract-bukchon-osm.mjs; © OpenStreetMap contributors, ODbL)
// and the real ground height (SRTM 30 m), also at 1/4.
//
// Bukchon Hanok Village sits between Gyeongbokgung and Changdeokgung, uphill
// from Anguk Station. The streets are the real ones: Bukchon-ro north from
// Anguk Station, Gyedong-gil, Changdeokgung-gil along the palace wall,
// Yunboseon-gil, and the Gahoe-dong alleys round Gahoe-dong 31 (Bukchon-ro
// 11-gil and its branches, the famous views). Every alley gets a row of
// hanok (game size, as many as fit: Bukchon stays dense, Yozi 2026-11-10);
// the big modern buildings, schools and halls are OSM's outlines. The shops
// stand at the foot of the hill, on Bukchon-ro 2-gil, lower Gyedong-gil and
// lower Bukchon-ro. Four of the city's Bukchon 8 Views are photo spots on
// their real places.
//
// The ground: real height above Anguk Station's street at 1/4 (so slopes
// are as steep as the real ones), flat at the foot where the shops are
// (data/bukchon-ground.js, written here).
//
//   node scripts/build-bukchon.mjs          writes bukchon.json, data/bukchon-ground.js,
//                                           the Bukchon shops' "at" (stores.json) and
//                                           Gyeongbokgung's map edge (gyeongbokgung.json)
//
// Coordinates are metres: x east, z south. (0, 0) is Anguk Station's anchor
// (region.json). Buildings with "hanok": 1 are drawn as hanok (core/hanok.js).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, inPoly, overlap, lineDist, segSegDist, clip, simplify, lengthOf, town, nearestOn } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const readJson = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'bukchon-osm.json'), 'utf8'));
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// ---- the area: Yulgok-ro (the game's) to the top of Bukchon-ro, the palace
// park strip on the west (Gyeongbokgung's map) to Changdeokgung-gil on the east.
export const AREA = [-92, 6, 95, -240]; // x0, z0 (south), x1, z1 (north)
const [AX0, AZ0, AX1, AZ1] = AREA;
const inArea = ([x, z], m = 0) => x > AX0 + m && x < AX1 - m && z < AZ0 - m && z > AZ1 + m;

// ---- the ground (real metres above Anguk Station's street, OSM.grid) ----
const G = OSM.grid;
const realH = (x, z) => {
  const fx = Math.max(0, Math.min(G.nx - 1.001, (x - G.x0) / G.step)), fz = Math.max(0, Math.min(G.nz - 1.001, (z - G.z0) / G.step));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, a = (ii, jj) => G.h[jj * G.nx + ii];
  return (a(i, j) * (1 - u) + a(i + 1, j) * u) * (1 - v) + (a(i, j + 1) * (1 - u) + a(i + 1, j + 1) * u) * v;
};
// Game height: 1/4 of the real rise above FLAT m (the foot, where the shops
// are, stays level), and down to 0 at the area's edge (the world round it is
// flat) no steeper than EDGE_SLOPE: the north edge is ~7 m up, so it ramps
// down over its last ~45 m instead of a 50% bank.
const FLAT = 6, EDGE_SLOPE = 0.15;
function gameH(x, z) {
  const rise = Math.max(0, realH(x, z) - FLAT) / 4;
  const soft = rise < 1 ? rise * rise * 0.5 + rise * 0.5 : rise; // (no kink where the slope starts)
  const d = Math.min(x - AX0, AX1 - x, AZ0 - z, z - AZ1);
  return Math.max(0, Math.min(soft, d * EDGE_SLOPE));
}
const STEP = 6; // the ground grid written for the game (district metres)
const GROUND = { x0: AX0, z0: AZ1, step: STEP, nx: Math.ceil((AX1 - AX0) / STEP) + 1, nz: Math.ceil((AZ0 - AZ1) / STEP) + 1, h: [] };
for (let j = 0; j < GROUND.nz; j++) for (let i = 0; i < GROUND.nx; i++) GROUND.h.push(Math.round(gameH(AX0 + i * STEP, AZ1 + j * STEP) * 10));
writeFileSync(path.join(root, 'src', 'data', 'bukchon-ground.js'), `// Bukchon's ground, written by scripts/build-bukchon.mjs (do not edit): the
// real height (SRTM 30 m) above Anguk Station's street at 1/4, flat at the
// foot. A grid from (x0, z0) in district metres, step m apart, h in decimetres.
export const GROUND = ${JSON.stringify({ ...GROUND, h: undefined })};
GROUND.h = ${JSON.stringify(GROUND.h)};
`);
const { ground } = await import('../src/data/bukchon.js?' + Date.now()); // (the game's own reading of that grid)

// ---- streets ----
const BASE = {
  '북촌로': ['Bukchon-ro', '北村路', '北村路'],
  '계동길': ['Gyedong-gil', '桂洞キル', '桂洞街'],
  '계동': ['Gyedong', '桂洞', '桂洞'],
  '창덕궁길': ['Changdeokgung-gil', '昌徳宮キル', '昌德宫街'],
  '창덕궁': ['Changdeokgung', '昌徳宮', '昌德宫'],
  '윤보선길': ['Yunboseon-gil', 'ユンボソンキル', '尹潽善街'],
  '율곡로': ['Yulgok-ro', '栗谷路', '栗谷路'],
  '삼청로': ['Samcheong-ro', '三清路', '三清路'],
};
const SUFFIX = { 가: 'ga', 나: 'na', 다: 'da', 라: 'ra' };
function streetName(ko) {
  if (BASE[ko]) return N(ko, ...BASE[ko]);
  const m = ko.match(/^(.+?)(\d+)([가나다라]?)길$/);
  if (!m || !BASE[m[1]]) return null;
  const [en, ja, zh] = BASE[m[1]], s = m[2] + (m[3] ? SUFFIX[m[3]] : '');
  return N(ko, `${en} ${s}-gil`, `${ja}${m[2]}${m[3]}ギル`, `${zh}${m[2]}${m[3]}街`);
}
const width = (r) => {
  if (r.n === '북촌로') return 7;
  if (r.n === '계동길' || r.n === '창덕궁길') return 6;
  if (r.n === '윤보선길' || r.k === 'pedestrian') return 5;
  // The lanes round Gahoe-dong 31 are close together (8-10 m apart at 1/4):
  // narrow, like the real ones, so a row of small hanok fits between them
  // (still four people abreast: a person is 0.7 m across).
  const mid = r.p[Math.floor(r.p.length / 2)];
  if (inPoly(mid[0], mid[1], QUIET_ZONE) || /^북촌로(11|5나|15)/.test(r.n)) return 3;
  return r.n ? 4.4 : 4.2; // (six people abreast)
};
const { BUKCHON } = await import('../src/data/bukchon.js?' + Date.now());
const QUIET_ZONE = BUKCHON.quiet;
const roads = [];
for (const r of OSM.roads) {
  if (r.n === '율곡로' || r.n === '삼청로' || r.k === 'primary' || /link$/.test(r.k)) continue; // (Samcheong-ro: its pavements; the road is Gyeongbokgung's map) // (the game's own Yulgok-ro runs along the south edge)
  if (r.n === '북촌로' && r.k !== 'tertiary' && r.k !== 'pedestrian') continue; // (its pavements)
  let p = clip(r.p, (q) => inArea(q, 0.5));
  if (p.length < 2 || lengthOf(p) < 8) continue;
  p = simplify(p, 0.4);
  // Detail where it counts (Yozi 2026-11-09: the signature places in full,
  // the rest simple): every named street, and the small unnamed paths only
  // round Gahoe-dong 31 (the Quiet Zone) or when they are long.
  const mid = p[Math.floor(p.length / 2)];
  if (!r.n && !inPoly(mid[0], mid[1], QUIET_ZONE) && lengthOf(p) < 40) continue;
  roads.push({ k: 'walk', w: width({ ...r, p }), p, ...(r.n && streetName(r.n) ? { n: streetName(r.n) } : {}), ko: r.n });
}
// (OSM also draws pavements and squares as unnamed ways beside a street:
// those go, and so do closed loops and Bukchon-ro's paved corner at 2-gil)
for (let i = roads.length - 1; i >= 0; i--) {
  const r = roads[i], a = r.p[0], b = r.p.at(-1);
  if ((r.ko === '북촌로' && lengthOf(r.p) < 20) || (r.ko === '북촌로2길' && lengthOf(r.p) < 12)) { roads.splice(i, 1); continue; }
  if (r.ko) continue;
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1) { roads.splice(i, 1); continue; }
  const pts = [];
  for (let k = 1; k < r.p.length; k++) for (let t = 0; t < 1; t += 0.1) pts.push([r.p[k - 1][0] + (r.p[k][0] - r.p[k - 1][0]) * t, r.p[k - 1][1] + (r.p[k][1] - r.p[k - 1][1]) * t]);
  const near = pts.filter((q) => roads.some((o) => o.ko && lineDist(q, o.p) < o.w / 2 + 3)).length;
  if (near > 0.7 * pts.length) roads.splice(i, 1);
}
// Bukchon-ro and Gyedong-gil run on down to the game's Yulgok-ro (which is
// south of the real one here: the city's Yulgok-ro is Gyeongbokgung's map).
const longest = (ko) => roads.filter((r) => r.ko === ko).sort((a, b) => lengthOf(b.p) - lengthOf(a.p))[0];
const BUKCHON_RO = longest('북촌로'), GYEDONG = longest('계동길');
for (const r of [BUKCHON_RO, GYEDONG]) {
  const s = r.p[0][1] > r.p.at(-1)[1] ? 0 : r.p.length - 1; // its south end
  const q = r.p[s], to = [r1(q[0] + 2), AZ0 + 2];
  if (s === 0) r.p.unshift(to); else r.p.push(to);
}
// Joins: a way that stops just short of another ends on its middle line.
for (const r of roads) for (const end of [0, r.p.length - 1]) {
  const q = r.p[end];
  let best = null;
  for (const o of roads) {
    if (o === r) continue;
    const n = nearestOn(q, o.p);
    if (n.d > 0.05 && n.d < o.w / 2 + 2.5 && (!best || n.d < best.d)) best = n;
  }
  if (best) r.p[end] = best.at.map(r1);
}
for (const r of roads) delete r.ko;

// The neighbours' streets that cross Bukchon's ground (Gyeongbokgung's
// Yulgok-ro along the south edge, its Samcheong-ro in the north-west corner):
// nothing is built on them.
const region = readJson('region.json');
const [ox, oz] = region.districts.find((d) => d.id === 'bukchon').offset;
const outside = [];
for (const d of region.districts) {
  if (d.id === 'bukchon') continue;
  let m;
  try { m = readJson(d.map); } catch { continue; }
  for (const r of m.roads || []) {
    const p = r.p.map(([x, z]) => [r1(x + d.offset[0] - ox), r1(z + d.offset[1] - oz)]);
    if (p.some((q, i) => inArea(q, -20) || (i && inArea([(q[0] + p[i - 1][0]) / 2, (q[1] + p[i - 1][1]) / 2], -20)))) outside.push({ k: r.k, w: r.w, p });
  }
}

// ---- big buildings (OSM outlines): schools, offices, halls ----
const roadHit = (p, gap, list = [...roads, ...outside]) => list.some((r) => {
  for (let i = 1; i < r.p.length; i++) for (let k = 0; k < p.length; k++) if (segSegDist(r.p[i - 1], r.p[i], p[k], p[(k + 1) % p.length]) < r.w / 2 + gap) return true;
  return r.p.some((q) => inPoly(q[0], q[1], p));
});
const convex = (pts) => { // (the outline's hull: overlap() and hanok.js want convex shapes)
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of s) { while (lo.length > 1 && cross(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); }
  for (const q of s.reverse()) { while (hi.length > 1 && cross(hi.at(-2), hi.at(-1), q) <= 0) hi.pop(); hi.push(q); }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
};
const bigs = [];
let dropped = 0;
for (const b of OSM.big) {
  const p = convex(b.p);
  if (!p.every((q) => inArea(q, 1))) continue;
  // (streets are drawn wider than 1/4, so a big building beside one shrinks
  // round its middle until it clears it; one a street runs through is left out)
  let k = 1;
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length;
  while (k >= 0.6 && roadHit(p.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]), 0.6)) k -= 0.05;
  if (k < 0.6) { dropped++; continue; }
  p.splice(0, p.length, ...p.map(([x, z]) => [r1(cx + (x - cx) * k), r1(cz + (z - cz) * k)]));
  const floors = b.lv || (b.k === 'school' ? 3 : 2);
  const lift = Math.max(...p.map(([x, z]) => ground(x, z)));
  bigs.push({ h: r1(Math.max(5, (floors * 3.3) / 4 + 3) + lift), p, ...(b.n ? { name: b.n } : {}) });
}

if (process.env.PROBE) { // (where a W x D compound fits: PROBE=40x36)
  const [W, D] = process.env.PROBE.split('x').map(Number), hits = [];
  for (let x = AX0 + 2; x + W < AX1 - 2; x += 2) for (let z = AZ0 - 2; z - D > AZ1 + 2; z -= 2) {
    const p = rect(x - 1, z + 1, x + W + 1, z - D - 1);
    const named = roads.filter((r) => r.n), cut = roads.filter((r) => !r.n && r.p.some((q) => inPoly(q[0], q[1], p))).length;
    const hit = named.some((r) => r.p.some((q) => inPoly(q[0], q[1], p)) || r.p.some((q, i) => i && p.some((c, k) => segSegDist(r.p[i - 1], q, c, p[(k + 1) % 4]) < r.w / 2 + 0.3)));
    if (!hit && !bigs.some((b) => overlap(b.p, p))) hits.push([x, z, x + W, z - D, cut]);
  }
  console.log(hits.length, JSON.stringify(hits.filter((_, i) => i % 5 === 0).slice(0, 80)));
  process.exit(0);
}
// ---- open places ----
// The Open House: a hanok round a courtyard you can walk into, on
// the real Bukchon Culture Center's spot (Gyedong-gil, below Jaedong
// Elementary School, on Naver Map; Yozi 2026-11-13), at 43% of its old
// size (data/bukchon.js openHouse.sc: the real block is small), its gate on
// Bukchon-ro 2-gil. The small unnamed paths that crossed its ground go.
const OPEN = BUKCHON.openHouse.box; // [x0, z0 (south), x1, z1 (north)]
const OSC = BUKCHON.openHouse.sc;
const openP = rect(OPEN[0] - 0.5, OPEN[1] + 0.5, OPEN[2] + 0.5, OPEN[3] - 0.5);
const yardP = rect(OPEN[0], OPEN[1] + 4, OPEN[2], OPEN[1]); // the forecourt (마당) between the gate and Bukchon-ro 2-gil
for (let i = roads.length - 1; i >= 0; i--) {
  const r = roads[i];
  if (!r.n && [openP, yardP].some((P) => r.p.some((q) => inPoly(q[0], q[1], P)) || r.p.some((q, k) => k && P.some((c, m) => segSegDist(r.p[k - 1], q, c, P[(m + 1) % 4]) < r.w / 2 + 0.3)))) roads.splice(i, 1);
}
for (let i = bigs.length - 1; i >= 0; i--) if (overlap(bigs[i].p, openP) || overlap(bigs[i].p, yardP)) { console.log('on the Open House ground, left out:', bigs[i].name || 'a building'); bigs.splice(i, 1); }
{
  const hits = roads.filter((r) => roadHit.call(null, openP, 0.3, [r]));
  if (hits.length) throw new Error(`the Open House ${JSON.stringify(openP)} is on ${hits.map((r) => r.n?.en || 'a path').join(', ')}: move it (data/bukchon.js OH)`);
}
const viewClear = BUKCHON.views.map((v) => ({ line: [v.at, [v.at[0] + 0.01, v.at[1]]], w: 7 }));
const open = [{ p: openP }, { p: yardP }, ...bigs.map((b) => ({ p: b.p })), ...viewClear];

// ---- hanok rows along every street ----
// (town() keeps every house 1.2 m off a street's edge; Bukchon's walls
// stand right at the alley, so it is given the streets 2 m narrower)
const fitRoads = [...roads.map((r) => ({ ...r, w: r.w - 2 })), ...outside];
const t = town(9, { inside: (q) => inArea(q, 0.8), roads: fitRoads, open });
// The shops: at the foot of the hill (Bukchon-ro 2-gil, lower Gyedong-gil and
// lower Bukchon-ro), hanok shop fronts.
const SHOP_Z = -130;
const order = [...roads].sort((a, b) => b.w - a.w || lengthOf(b.p) - lengthOf(a.p));
const shopLots = [];
const twoGil = roads.find((r) => r.n?.en === 'Bukchon-ro 2-gil');
for (const r of [twoGil, GYEDONG, BUKCHON_RO, ...['Yunboseon-gil', 'Bukchon-ro 5-gil', 'Changdeokgung 1-gil', 'Bukchon-ro 4-gil'].map((en) => roads.filter((r) => r.n?.en === en).sort((a, b) => lengthOf(b.p) - lengthOf(a.p))[0])].filter(Boolean)) {
  for (const side of [1, -1]) {
    const id = `shop:${r.n.en}:${side}`, before = t.buildings.length;
    t.row(id, simplify(r.p, 1.5), side, { off: r.w / 2 + 0.3, depth: 9, w: [11.6, 13], h: [6, 6], spot: 1.6, gap: 0.6, from: 0, to: Infinity });
    // (only the foot of the hill: drop the ones further up)
    for (let i = t.buildings.length - 1; i >= before; i--) {
      const b = t.buildings[i];
      if (Math.min(...b.p.map((q) => q[1])) < SHOP_Z) { t.buildings.splice(i, 1); t.lots[id].splice(i - before, 1); continue; }
      b.shop = 1;
    }
    for (let i = before; i < t.buildings.length; i++) shopLots.push({ b: t.buildings[i], road: r });
  }
}
// Homes: every street, the wide ones first (their rows are the long, even ones).
for (const r of order) for (const side of [1, -1]) {
  t.row(`home:${roads.indexOf(r)}:${side}`, simplify(r.p, 1.5), side, { off: r.w / 2 + 0.3, depth: 8, w: [7.5, 11], h: [5, 5], spot: 1.6, gap: 0.3 });
}
// Then small hanok in the gaps left (the alleys of Gahoe-dong are close
// together: real lots there are tiny), only on the quiet alleys and the
// small streets.
for (const r of order) for (const side of [1, -1]) {
  t.row(`small:${roads.indexOf(r)}:${side}`, simplify(r.p, 1.5), side, { off: r.w / 2 + 0.3, depth: 4.2, w: [4.5, 6.5], h: [5, 5], spot: 1.6, gap: 0.3 });
}
const hanok = t.buildings;
// Which way each hanok faces (fr, a unit step on the map, front to the street:
// town() lays the front edge p[0]-p[1] along the street) and how high it
// stands on its stone terrace (lv: the ground at its highest corner).
for (const b of hanok) {
  const [a, c, d, e] = b.p, fx = (a[0] + c[0] - d[0] - e[0]) / 2, fz = (a[1] + c[1] - d[1] - e[1]) / 2, l = Math.hypot(fx, fz);
  b.fr = [Number((fx / l).toFixed(4)), Number((fz / l).toFixed(4))];
  b.hanok = 1;
  const lv = Math.max(...b.p.map(([x, z]) => ground(x, z)));
  if (lv > 0.05) b.lv = r1(lv * 10) / 10;
  delete b.shop;
}

// ---- the shops' doors (stores.json): the middle of a front bay ----
const { shopBays } = await import('../src/core/hanok.js');
const SHOPS = [ // the five cooking classes (west to east), then nearest Anguk Station first
  'bibimbap-class', 'sonmat-kimchi', 'tteok-class', 'suragan-cooking', 'kimbap-class',
  'info-bukchon', 'matcha-garden', 'gahoe-hanbok', 'noeul-teahouse', 'giwa-photo', 'maeum-knot', 'saekji-paper',
];
const lotFront = (b) => {
  const [a, c] = b.p, L = Math.hypot(c[0] - a[0], c[1] - a[1]), u = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
  return { a, u, L, mid: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2] };
};
const doors = [];
for (const { b } of shopLots) {
  const f = lotFront(b), bays = shopBays(f.L);
  for (const m of bays) doors.push({ b, at: [r1(f.mid[0] + f.u[0] * m + b.fr[0] * 1.6), r1(f.mid[1] + f.u[1] * m + b.fr[1] * 1.6)] });
}
// A door in the middle of each bay: two or three shops share a long hanok
// front, as before. The five cooking classes take the five doors closest
// together (they stay side by side, west to east); the information centre
// the door nearest Anguk Station (the first stop of a visit); the rest go
// nearest Anguk first.
const dd = (a, b) => Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]);
const cluster = doors.map((d) => [...doors].sort((a, b) => dd(a, d) - dd(b, d)).slice(0, 5))
  .sort((a, b) => a.reduce((t, x) => t + dd(x, a[0]), 0) + 2 * Math.hypot(...a[0].at) - b.reduce((t, x) => t + dd(x, b[0]), 0) - 2 * Math.hypot(...b[0].at))[0] || []; // (close together, and near Anguk Station)
cluster.sort((a, b) => a.at[0] - b.at[0]);
const rest = doors.filter((d) => !cluster.includes(d)).sort((a, b) => Math.hypot(...a.at) - Math.hypot(...b.at));
const perLot = [...cluster, ...rest];
if (perLot.length < SHOPS.length) { console.warn(`only ${perLot.length} shop lots for ${SHOPS.length} shops`); if (!process.env.DRAFT) process.exit(1); }
// (stores.json is hand-formatted, so only each shop's "at" is rewritten in the text)
const storesFile = path.join(R, 'stores.json');
let storesText = readFileSync(storesFile, 'utf8');
SHOPS.slice(0, perLot.length).forEach((id, i) => {
  const k = storesText.indexOf(`"id": "${id}"`);
  if (k < 0) throw new Error('no shop ' + id);
  let end = storesText.indexOf('\n    {', k);
  if (end < 0) end = storesText.length;
  const [x, z] = perLot[i].at;
  storesText = storesText.slice(0, k) + storesText.slice(k, end).replace(/"at": \[[^\]]*\]/, `"at": [${r1(x + ox)}, ${r1(z + oz)}]`) + storesText.slice(end);
});
if (!process.env.DRAFT) writeFileSync(storesFile, storesText);

// ---- a few homes open their courtyard to visitors (출입 가능) ----
// Always ㄷ shaped with the gate in the middle of the front (core/hanok.js
// home()), so the solid parts can be listed: the three wings and the front wall.
const VISIT = N('출입 가능', 'Visitors welcome', '見学できます', '欢迎参观');
const VISIT_TEXT = N(
  '이 집은 마당을 방문객에게 열어 두었어요. 조용히 둘러봐 주시고, 방 안이나 장독대는 만지지 말아 주세요.',
  'This home opens its courtyard to visitors. Look round quietly, and please don\'t go into the rooms or touch the jars.',
  'この家は中庭を見学者に開放しています。静かに見て回り、部屋に入ったり甕に触れたりしないでください。',
  '这户人家向游客开放院子。请安静参观，不要进入房间或触碰酱缸。',
);
const visitBlockers = [], visitMarks = [];
{
  const quiet = BUKCHON.quiet;
  const cands = hanok.filter((b) => {
    if (b.h >= 6) return false;
    const f = lotFront(b), D = Math.hypot(b.p[3][0] - b.p[0][0], b.p[3][1] - b.p[0][1]);
    const c = [(b.p[0][0] + b.p[2][0]) / 2, (b.p[0][1] + b.p[2][1]) / 2];
    return f.L >= 9 && D >= 7.5 && (inPoly(c[0], c[1], quiet) || Math.hypot(c[0] + 40, c[1] + 170) < 70);
  });
  const pickAt = [0, Math.floor(cands.length / 2), cands.length - 1];
  for (const b of [...new Set(pickAt.map((i) => cands[i]).filter(Boolean))]) {
    b.visit = 1;
    const f = lotFront(b), L = f.L, D = Math.hypot(b.p[3][0] - b.p[0][0], b.p[3][1] - b.p[0][1]);
    const cx = (b.p[0][0] + b.p[2][0]) / 2, cz = (b.p[0][1] + b.p[2][1]) / 2;
    // local frame: lx along the front (f.u), lz towards the front (fr)
    const W = (lx, lz) => [r1(cx + lx * f.u[0] + lz * b.fr[0]), r1(cz + lx * f.u[1] + lz * b.fr[1])];
    const box = (ax, az, bx, bz) => ({ p: [W(ax, az), W(bx, az), W(bx, bz), W(ax, bz)] });
    // (the same sizes as home() in core/hanok.js)
    const back = Math.min(5.5, D * 0.48), side = Math.min(4.6, L * 0.34), zb = -D / 2 + back / 2 + 0.4, len = D - back - 1.6, zf = D / 2 - 0.3;
    visitBlockers.push(box(-L / 2, -D / 2, L / 2, zb + back / 2 + 0.35)); // the main wing along the back
    for (const sx of [-1, 1]) {
      const x = sx * (L / 2 - side / 2 - 0.4);
      visitBlockers.push(box(x - side / 2 - 0.4, zb + back / 2, x + side / 2 + 0.4, zb + back / 2 + 0.4 + len + 0.2)); // the side wings
      visitBlockers.push(box(sx * 1.4, zf - 0.3, sx * L / 2, zf + 0.3)); // the front wall either side of the gate
    }
    const [sx, sz] = W(2.6, D / 2 + 0.25); // on the front wall, beside the gate
    visitMarks.push({ type: 'sign', x: sx, z: sz, ry: Number(Math.atan2(b.fr[0], b.fr[1]).toFixed(4)), y: r1(ground(sx, sz)), title: VISIT, text: VISIT_TEXT, visit: 1 });
  }
}

// ---- little gardens: stone planters where a corner leaves room ----
const planters = [];
{
  const solid = [...hanok.map((b) => b.p), ...bigs.map((b) => b.p), openP, yardP];
  const free = (q, rr) => inArea(q, 2) && !solid.some((p) => inPoly(q[0], q[1], p) || lineDist(q, [...p, p[0]]) < rr)
    && [...roads, ...outside].every((r) => lineDist(q, r.p) > r.w / 2 + rr) && BUKCHON.views.every((v) => Math.hypot(q[0] - v.at[0], q[1] - v.at[1]) > 4);
  let k = 0;
  for (const r of order) {
    if (planters.length >= 14) break;
    for (const end of [0, r.p.length - 1]) {
      const q = r.p[end], q2 = r.p[end ? end - 1 : 1], L = Math.hypot(q2[0] - q[0], q2[1] - q[1]), u = [(q2[0] - q[0]) / L, (q2[1] - q[1]) / L];
      for (const s of [1, -1]) {
        const at = [r1(q[0] + u[0] * 5 - u[1] * s * (r.w / 2 + 1.3)), r1(q[1] + u[1] * 5 + u[0] * s * (r.w / 2 + 1.3))];
        if (planters.length < 14 && free(at, 1.1)) planters.push({ type: 'planter', x: at[0], z: at[1], y: r1(ground(...at)), kind: k++ % 3 === 1 ? 'bush' : 'tree' });
      }
    }
  }
}

// ---- the Open House: a ㄷ-shaped hanok round a courtyard, a gate in the south wall ----
// (its walls at full size round the middle, times OSC: core/bukchon-models.js openhouse)
const [ox0, oz0, ox1, oz1] = OPEN; // x0 < x1, z0 > z1 (z0 is the south side)
const ocx = (ox0 + ox1) / 2, ocz = (oz0 + oz1) / 2;
const orect = (ax, az, bx, bz) => rect(r1(ocx + ax * OSC), r1(ocz + az * OSC), r1(ocx + bx * OSC), r1(ocz + bz * OSC));
const blockers = [
  { p: orect(-20, -6, 20, -18) }, // main hall (anchae) along the north side
  { p: orect(-20, 14, -11, -6) }, // west wing (anbang)
  { p: orect(11, 14, 20, -6) }, // east wing (sarangbang)
  { p: orect(-20, 18, -2.5, 17) }, // south wall, left of the gate
  { p: orect(2.5, 18, 20, 17) }, // and right of it
  ...visitBlockers, // the homes open to visitors: their wings and front walls (not the yard)
  ...planters.map((l) => ({ p: rect(l.x - 0.8, l.z + 0.8, l.x + 0.8, l.z - 0.8) })),
];

// The Quiet Zone signs where the alleys of Gahoe-dong begin (the real rule,
// checked on 2026-11-07: Seoul Metropolitan Government / Jongno-gu).
const QUIET = {
  title: N('조용히 걸어 주세요', 'Quiet Zone', '静かにお歩きください', '请安静行走'),
  text: {
    ko: '주민이 사는 한옥 골목이에요. 뛰지 말고 조용히 걸어 주세요. 실제 북촌로11길 일대는 관광객 방문 시간이 오전 10시~오후 5시예요.',
    en: 'People live in these hanok. Please walk, and keep your voice down. In the real Bukchon-ro 11-gil area, visitors are welcome 10:00 to 17:00.',
    ja: '人が暮らす韓屋の路地です。走らず静かにお歩きください。実際の北村路11ギル一帯の観光客の訪問時間は10時〜17時です。',
    zh: '这里是居民居住的韩屋小巷，请勿奔跑，安静行走。现实中北村路11街一带的游客参观时间为10:00至17:00。',
  },
};
const quietSigns = [];
for (const r of roads) {
  if (!/^Bukchon-ro 11/.test(r.n?.en || '')) continue;
  for (const end of [0, r.p.length - 1]) {
    const q = r.p[end];
    if (inPoly(q[0], q[1], BUKCHON.quiet) && roads.some((o) => o !== r && !/^Bukchon-ro 11/.test(o.n?.en || '') && lineDist(q, o.p) < o.w / 2 + 3)) {
      const q2 = r.p[end ? end - 1 : 1], L = Math.hypot(q2[0] - q[0], q2[1] - q[1]), u = [(q2[0] - q[0]) / L, (q2[1] - q[1]) / L];
      const at = [r1(q[0] + u[0] * 4 + u[1] * (r.w / 2 + 0.4)), r1(q[1] + u[1] * 4 - u[0] * (r.w / 2 + 0.4))];
      if (!quietSigns.some((s) => Math.hypot(s.x - at[0], s.z - at[1]) < 12)) quietSigns.push({ type: 'sign', x: at[0], z: at[1], ry: Number(Math.atan2(-u[0], -u[1]).toFixed(4)), y: r1(ground(...at)), title: QUIET.title, text: QUIET.text });
    }
  }
}

const landmarks = [
  ...BUKCHON.signs.map(({ at: [x, z], ry }) => ({ type: 'sign', x, z, ry, y: r1(ground(x, z)), title: BUKCHON.welcome.title, text: { ...BUKCHON.welcome.rules } })),
  { type: 'openhouse', x: ocx, z: ocz, w: 40, d: 36, sc: [OSC, 1] }, // (drawn at full size, scaled across: landmarks.js sc)
  ...visitMarks, // 출입 가능 by the open homes' gates
  ...(planters.length ? [{ type: 'planters', x: r1(planters.reduce((t, l) => t + l.x, 0) / planters.length), z: r1(planters.reduce((t, l) => t + l.z, 0) / planters.length), items: planters.map(({ x, z, y, kind }) => ({ x, z, y, kind })) }] : []), // (one landmark: a few draw calls for all of them)
  ...quietSigns,
];

const pois = [
  { kind: 'landmark', x: -40, z: -175, name: N('북촌한옥마을', 'Bukchon Hanok Village', '北村韓屋村', '北村韩屋村') },
  { kind: 'landmark', x: (ox0 + ox1) / 2, z: (oz0 + oz1) / 2, name: N('북촌 열린 한옥', 'Bukchon Open House', '北村 オープンハウス', '北村开放韩屋') },
  ...BUKCHON.views.map((v) => ({ kind: 'landmark', x: v.at[0], z: v.at[1], name: v.name })),
];

const map = {
  meta: {
    district: 'bukchon',
    parts: [{ why: 'Bukchon on its real streets at 1/4: Anguk Station (Yulgok-ro) to the top of Bukchon-ro, the palace park to Changdeokgung-gil', box: [AX0, AZ1, AX1, AZ0] }],
    source: 'OpenStreetMap © OpenStreetMap contributors, ODbL (streets, big buildings, the Bukchon 8 Views), SRTM heights, at 1/4; hanok laid along the alleys (game size). Built by scripts/build-bukchon.mjs',
  },
  roads, buildings: [...hanok, ...bigs.map(({ name: _n, ...b }) => b)], rail: [], areas: [{ k: 'plaza', p: yardP }], blockers, pois, landmarks,
};
writeFileSync(path.join(R, 'districts', 'bukchon.json'), JSON.stringify(map, null, 1) + '\n');

// ---- Gyeongbokgung's map: its box stops at Bukchon's west edge north of
// Yulgok-ro, and its old placeholder row on Bukchon's ground goes ----
{
  const file = path.join(R, 'districts', 'gyeongbokgung.json'), gb = JSON.parse(readFileSync(file, 'utf8'));
  const gd = region.districts.find((d) => d.id === 'gyeongbokgung').offset, dx = ox - gd[0], dz = oz - gd[1];
  const before = gb.buildings.length;
  gb.buildings = gb.buildings.filter((b) => { const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length - dx, cz = b.p.reduce((s, q) => s + q[1], 0) / b.p.length - dz; return !inArea([cx, cz]); });
  const main = gb.meta.parts.find((p) => /^the palace, Gwanghwamun Square/.test(p.why));
  if (main && main.box[2] > AX0 + dx) {
    const [x0, z0, x1, z1] = main.box, split = AZ0 + dz;
    main.box = [x0, split, x1, z1];
    gb.meta.parts.unshift({ why: 'the palace and Samcheong-ro, north of Yulgok-ro, up to Bukchon', box: [x0, z0, AX0 + dx, split] });
    main.why = 'Gwanghwamun Square, Yulgok-ro and the blocks south of it';
  }
  const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
  writeFileSync(file, pretty(gb) + '\n');
  if (before !== gb.buildings.length) console.log(`gyeongbokgung.json: ${before - gb.buildings.length} buildings on Bukchon's ground removed`);
}
console.log(`bukchon.json: ${roads.length} streets, ${hanok.length} hanok (${shopLots.length} shop lots), ${bigs.length} big buildings (${dropped} on a street, left out), ${planters.length} planters, ${quietSigns.length} quiet signs, ${visitMarks.length} open homes`);
