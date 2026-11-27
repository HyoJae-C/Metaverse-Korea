#!/usr/bin/env node
// Builds Gyeongbokgung's palace (inside its wall) into districts/gyeongbokgung.json
// from the real map: every hall, gate and roofed corridor (행각) stands where it
// stands in OpenStreetMap (scripts/data/gyeongbokgung-osm.json, © OpenStreetMap
// contributors, ODbL), at a quarter of the real distances like the rest of the
// game's Seoul (docs/WORLD.md).
//
//   - The site is the real one at 1/4: every building's middle is on its
//     real spot (measured from Gwanghwamun, the district's (0, 0)).
//   - The buildings' footprints are 50% of the real ones (FOOT: 2 × the
//     1/4 map; Yozi, 2026-11-11, was 30%) where they fit: the roofed
//     corridors stay at the 1/4 map so the yards keep their real shape, and
//     a hall too big for its yard is drawn as big as fits (never under 30%).
//   - Their heights are half the real ones, so a hall stands taller than
//     Bukchon's houses and the gates are higher than the people (Yozi's
//     choice, 2026-11-09).
//   - Halls are drawn by core/palace-model.js: the gates, Yeongjegyo,
//     Geunjeongjeon, Gyeonghoeru and Hyangwonjeong have their own models;
//     all other buildings are one merged "palacehalls" landmark and the
//     corridors one "cloister".
//   - The green is the real one too (scripts/lib/palace-grounds.mjs): the
//     lawns and woods on OSM's outlines, OSM's trees on their spots and
//     made-up ones inside the woods and along the lawns' edges; you walk
//     over Chwihyanggyo to Hyangwonjeong's island.
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
import { obb, rect, sat, inside, planPalace, terraceEdges } from './lib/palace-plan.mjs';
import { planGrounds, KIND } from './lib/palace-grounds.mjs';
import { ROYAL_ROUTE, ROYAL_ORDER, PALACE_VISITORS } from '../src/core/palace-show.js';
import { FAN_AT, FAN_KEEP } from '../src/core/palace-fan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = path.join(root, 'public', 'regions', 'another-seoul', 'districts', 'gyeongbokgung.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'gyeongbokgung-osm.json'), 'utf8'));
const green = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'gyeongbokgung-grounds-osm.json'), 'utf8'));
const canopy = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'gyeongbokgung-canopy.json'), 'utf8')); // where a satellite photo shows trees

export const FOOT = 2; // footprints: 50% of the real size = 2 × the 1/4 map (Yozi, 2026-11-11; was 30%)
export const UP = 1; // heights: the palace models are drawn at half the real height (UP 1 = 50%)
const SC = [FOOT / 2, UP]; // the models with their own builders are drawn at 50%: SC[0] 1 keeps them at 50% across
// Gwanghwamun alone is 50% across, like its height: at 30% its stone base
// came out narrower than its roofs, cramped at the sides (Yozi, 2026-11-10).
export const GATE = 2; // its width: 2 × the 1/4 map = 50% of the real gate
const GATE_SC = [GATE / 2, UP];
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

// ---------- Real coordinates -> the district's metres (Gwanghwamun at (0, 0)) ----------
const byName = (n) => osm.elements.find((e) => e.name === n);
const centre = (pts) => pts.slice(0, -1).reduce((a, p, _, l) => [a[0] + p[0] / l.length, a[1] + p[1] / l.length], [0, 0]);
const G = centre(byName('광화문').pts), [gx, gz] = toGame(G[0], G[1]);
export const local = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - gx, z - gz]; };

export { obb, rect, sat };


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
  const hw = 3.9 * GATE; // the wall meets the gate's sides (Gwanghwamun: 7.8 m wide on the 1/4 map)
  const W = R.filter(([x, z]) => !(Math.abs(x) < hw + 0.5 && Math.abs(z) < 4));
  return [[hw, W[0][1] * (hw / W[0][0])], ...W, [-hw, W.at(-1)[1] * (hw / -W.at(-1)[0])]];
})(); // the palace wall, in the district's metres
const inPalace = (x, z) => inside(OUTLINE, x, z) && !(x > 45 && z < -95 && x > 45 + (-95 - z) * 0.1); // (the Folk Museum's grounds)
// Buildings with their own model: name -> how.
const OWN = { 광화문: 'gwanghwamun', 흥례문: 'palacegate', 근정문: 'palacegate', 근정전: 'throne', 경회루: 'pavilion', 향원정: 'hyangwonjeong' };
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
// (and the royal procession's way round the east lawn: two abreast, a guard on each flank)
const routeClear = (() => {
  const wide = Math.max(...ROYAL_ORDER.map((o) => Math.abs(o.side))) + 0.6;
  return ROYAL_ROUTE.links.map(([i, j]) => { const [ax, az] = ROYAL_ROUTE.stops[i], [bx, bz] = ROYAL_ROUTE.stops[j]; return rect((ax + bx) / 2, (az + bz) / 2, Math.hypot(bx - ax, bz - az) + 2 * wide, 2 * wide, Math.atan2(bz - az, bx - ax)); });
})();
// Which buildings become halls, corridors and plain blocks: scripts/lib/palace-plan.mjs.
export const DOOR = 2.6, FOOT_MIN = 1.2, WALK = 1.3, BLOCK_GAP = 3;
const { own, halls, runs, blockers, yards, sides, corridorP } = planPalace({
  elements: osm.elements, local, inPalace, OUTLINE, OWN, NO_RIDGE, BOARDS, KEEP, COUNT, modern: MODERN, FOOT, FOOT_MIN, WALK, DOOR, BLOCK_GAP,
  keepClear: routeClear,
  ponds: osm.elements.filter((e) => e.kind === 'water').map((e) => e.pts.map(local)),
  skipBlock: (u) => !u.e.name && u.o.x > 25 && u.o.z < -150, // (unnamed, beside the Folk Museum: Yozi wants its grounds left empty)
  // Untangled (Yozi 2026-11-27: "buildings overlap"): the gates are drawn at
  // 50%, wider than their plots, so corridors stop at them and the wing
  // beside Heungnyemun is cut back; Geunjeongjeon's west corridor is a
  // corridor, not a 40 m hall; a building OSM maps twice is drawn once.
  ownSolid: (n, o) => (n === '광화문' ? rect(0, 0, o.w * 2 * GATE_SC[0] + 0.6, 7 * GATE_SC[0] + 0.6, o.a) : n === '흥례문' || n === '근정문' ? rect(o.x, o.z, o.w * FOOT + 1.2, o.d * FOOT + 1.2, o.a) : null),
  LONG: 8, dedupe: true, gateBays: true,
});
const logSizes = () => console.log('hall sizes (% of real):', sides.map(([n, p]) => `${n} ${p}`).join(', '));

// ---------- The buildings with their own models ----------
const O = Object.fromEntries(own.map((o) => [o.name, o]));
const lm = [];
const g = O['광화문'];
lm.push({ type: 'gwanghwamun', x: 0, z: 0, ry: r2(-g.a), w: r1((g.w * 2)), sc: GATE_SC, gb: 1, clear: 11 }); // (drawn at 50%: w is the 50% width; clear: no Sajik-ro street tree in front of the arches)
// Gwanghwamun's solid parts either side of the three arches (the arches: |x| < 1.5 and 3.0..5.2 at 50%)
{
  const W = g.w * GATE, D = 7 * GATE_SC[0], cs = Math.cos(g.a), sn = Math.sin(g.a);
  for (const [u0, u1] of [[1.5, 3.0], [5.2, g.w]]) for (const s of [-1, 1]) {
    const a = u0 * GATE_SC[0], b = Math.min(W / 2, u1 * GATE_SC[0]), u = (s * (a + b)) / 2;
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
  // At 50% its lower terrace (56 hs across) is wider than its court on the
  // 1/4 map: the whole model is drawn as big as leaves WALK free to the
  // court's corridors, never under 30%.
  const at = (ts) => { const back = (2 + 0.6) * hs * ts, x = o.x - sn * back, z = o.z + cs * back; return { x, z, T1: [56 * hs * ts, 40 * hs * ts] }; };
  let ts = SC[0];
  const hit = (ts) => { const t = at(ts), P = rect(t.x, t.z, t.T1[0] + 2 * WALK, t.T1[1] + 2 * WALK, o.a); return corridorP.some((K) => sat(P, K)); };
  while (ts > FOOT_MIN / 2 + 1e-6 && hit(ts)) ts = Math.max(FOOT_MIN / 2, ts - 0.025);
  const { x, z, T1 } = at(ts), tsc = [r2(ts), UP];
  sides.push(['근정전', Math.round(ts * 50)]);
  lm.push({ type: 'throne', x: r1(x), z: r1(z), ry: r2(-o.a), hs: r2(hs), sc: tsc, name: { ko: '근정전', en: 'Geunjeongjeon' }, gb: 1 });
  blockers.push({ p: rect(o.x, o.z, o.w * 2 * ts + 1, o.d * 2 * ts + 1, o.a) }); // the hall (the terraces are walked on: their steps)
  blockers.push(...terraceEdges({ x: r1(x), z: r1(z), a: -r2(-o.a), hs: r2(hs), ts: tsc[0] })); // (up by the front steps only: your feet rise with them, core/temple-terrace.js)
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
// Gyeonghoeru on its pond (Hyangwonjeong on its island: the grounds, below).
{
  const o = O['경회루'];
  lm.push({ type: 'pavilion', x: r1(o.x), z: r1(o.z), ry: r2(Math.PI / 2 - o.a), sc: [r2(FOOT / 4), 0.5], name: { ko: '경회루', en: 'Gyeonghoeru' }, gb: 1 });
}
logSizes();
// Amisan (kept at 30%: it fills the gap between two rings of corridors): the garden terraces behind Gyotaejeon (between its corridors and Heungbokjeon's).
{
  const k = halls.find((h) => h.name === '교태전');
  lm.push({ type: 'amisan', x: r1(k.x), z: r1(k.z - 7.5), ry: r2(k.ry), w: 16, sc: [FOOT_MIN / 2, UP], name: { ko: '아미산', en: 'Amisan Garden' }, gb: 1 });
  // Its flower terraces are beds, not steps (they had no blocker: you walked through them): 16 wide, 9.6 deep from 1.2 in front of the landmark back.
  const f = FOOT_MIN / 2, a = -k.ry;
  blockers.push({ p: rect(k.x + Math.sin(a) * 3.6 * f, k.z - 7.5 - Math.cos(a) * 3.6 * f, 16 * f, 9.6 * f, a) });
}
lm.push({ type: 'palacehalls', x: 0, z: 0, v: UP, halls: halls.map((h) => { const e = [r1(h.x), r1(h.z), r1(h.w), r1(h.d), r2(h.ry), h.kind]; if (h.han) e.push(h.han); return e; }), gb: 1 });
lm.push({ type: 'cloister', x: 0, z: 0, h: 2.6, runs, gb: 1 });

// ---------- The ponds ----------
const water = osm.elements.filter((e) => e.kind === 'water').map((e) => ({ name: e.name, p: e.pts.map(local).map(([x, z]) => [r1(x), r1(z)]) }));


// ---------- Write ----------
const map = JSON.parse(readFileSync(MAP, 'utf8'));
for (const k of ['landmarks', 'blockers', 'areas']) map[k] = map[k].filter((it) => !it.gb); // (only its own: Deoksugung's gate and Cheong Wa Dae are other scripts')
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
// ---------- The grounds: lawns, woods, trees, Hyangwonjeong's island ----------
// Hyangwonjeong is 37.5% of the real one across and 45% high, not 50% like
// the other halls: at 50% it filled its island, and in Seoul the island is
// two and a half times as wide as the pavilion's roof (Yozi's photos,
// 2026-11-26). The island is drawn a little bigger than the 1/4 map too
// (OSM: 3.45 m in radius), and the bridge wider (0.4 m at 1/4: you could not
// walk over it).
export const ISLE = [5.4, 0.4], BRIDGE = [1.5, 0.48], HYANG_SC = [1.2, 1.08]; // [radius, its top above the water], [width, the arch's rise], the pavilion [across, up] (1 = 50%)
const amisan = lm.find((l) => l.type === 'amisan');
// The two lawns the shows stand on, either side of the corridors round
// Heungnyemun and Geunjeongjeon (Yozi, 2026-11-10): drawn as plain
// rectangles. Made up: OSM has packed earth, smaller lawns and a grove here.
export const SHOW_LAWNS = { fan: [-56, -30, -18, -83], king: [23, -30, 52, -76] };
const grounds = planGrounds({
  grounds: green, canopy, local, wall: wallPts, solids: blockers.map((b) => b.p), yards: yards.map((y) => rect(y.x, y.z, y.w, y.d, y.a)), ponds: water,
  keepRects: [...routeClear, (() => { const xs = ROYAL_ROUTE.stops.map((q) => q[0]), zs = ROYAL_ROUTE.stops.map((q) => q[1]); return [[Math.min(...xs), Math.min(...zs)], [Math.max(...xs), Math.min(...zs)], [Math.max(...xs), Math.max(...zs)], [Math.min(...xs), Math.max(...zs)]]; })()], // the king's way, and the lawn inside it (he stays in sight)
  keepCircles: [[FAN_AT[0], FAN_AT[1], FAN_KEEP + 1.5], ...PALACE_VISITORS.map(([x, z]) => [x, z, 2.2]), [0, -79, 3], [amisan.x, amisan.z - 3, 7]],
  stages: Object.entries(SHOW_LAWNS).map(([show, [x0, z0, x1, z1]]) => ({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], show, approx: 1, why: `the ${show === 'fan' ? 'fan dance' : 'royal procession'}'s lawn (Yozi 2026-11-10): a made-up rectangle, not OSM's lawns` })),
  hyang: { x: r1(O['향원정'].x), z: r1(O['향원정'].z) }, ISLE, BRIDGE, SC: HYANG_SC,
});
export { KIND };
map.areas.push(...grounds.areas);
map.landmarks.push(...grounds.landmarks);
for (const y of yards) map.areas.push({ k: 'stone', p: rect(y.x, y.z, y.w, y.d, y.a), gb: 1 });
const hyangji = water.find((w) => inside(w.p, O['향원정'].x, O['향원정'].z));
for (const w of water) {
  map.areas.push({ k: 'water', p: w.p, gb: 1, why: w.name });
  if (w !== hyangji) map.blockers.push({ p: w.p, gb: 1 });
}
map.blockers.push(...grounds.blockers.map((b) => ({ ...b, gb: 1 }))); // Hyangwonji with the island and the bridge cut out, the pavilion, the spring
const xs = wallPts.map((p) => p[0]), zs = wallPts.map((p) => p[1]);
map.meta.enclosure.box = [Math.floor(Math.min(...xs)), 0, Math.ceil(Math.max(...xs)), Math.floor(Math.min(...zs))];
// (leaf arrays such as a point [x, z] or a box on one line, the rest indented)
const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
if (!process.argv.includes('--dry')) writeFileSync(MAP, pretty(map) + '\n');
console.log(`halls ${halls.length}, corridor runs ${runs.length}, own models ${own.length}, blockers ${blockers.length}, yards ${yards.length}, water ${water.length}`);
console.log('grounds:', JSON.stringify(grounds.stats));

// ---------- A plan, to compare with the real map ----------
const si = process.argv.indexOf('--svg');
if (si > 0) {
  const X0 = -75, Z0 = -230, K = 5, W = 165 * K, Hh = 240 * K, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}"><rect width="100%" height="100%" fill="#f4f1ea"/>`;
  s += `<polygon points="${wallPts.map(P).join(' ')}" fill="#e9e2d2" stroke="#555" stroke-width="4"/>`;
  for (const y of yards) s += `<polygon points="${rect(y.x, y.z, y.w, y.d, y.a).map(P).join(' ')}" fill="#d9d0bd"/>`;
  const holed = (a) => [a.p, ...(a.holes || [])].map((r) => 'M' + r.map(P).join('L') + 'Z').join('');
  for (const a of grounds.lawns) s += `<path d="${holed(a)}" fill="#cfe8a8" fill-rule="evenodd"/>`;
  for (const a of grounds.woods) s += `<path d="${holed(a)}" fill="#9cc98a" fill-rule="evenodd"/>`;
  for (const w of water) s += `<polygon points="${w.p.map(P).join(' ')}" fill="#9cc7e8"/>`;
  for (const b of grounds.pondBlockers) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#5aa0d6"/>`;
  for (const e of osm.elements) if (e.kind === 'building') s += `<polygon points="${e.pts.map(local).map(P).join(' ')}" fill="none" stroke="#b5562f" stroke-width="1.5"/>`;
  for (const b of blockers) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#1f5fbf" fill-opacity="0.55"/>`;
  for (const h of halls) if (h.kind === 'r') s += `<polygon points="${rect(h.x, h.z, h.w, h.d, -h.ry).map(P).join(' ')}" fill="#e08a1e" fill-opacity="0.85"/>`; // the plain blocks
  grounds.trees.forEach(([x, z, sz, kind], i) => { s += `<circle cx="${(x - X0) * K}" cy="${(z - Z0) * K}" r="${(kind === KIND.bush ? 0.6 : 1.25) * sz * K}" fill="${i < grounds.real ? '#1f7a36' : '#e0559a'}" fill-opacity="0.7"/>`; }); // green: OSM's trees; pink: made up
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
  const all = blockers.concat(water.filter((w) => w !== hyangji).map((w) => ({ p: w.p })), grounds.blockers);
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
  { // over Chwihyanggyo to the island, beside the pavilion
    const [sx, sz] = grounds.span, L = Math.hypot(sx, sz), h = O['향원정'], d = ISLE[0] - 0.7;
    if (!reach(h.x + (sz / L) * d, h.z - (sx / L) * d)) shut.push("Hyangwonjeong's island");
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
