#!/usr/bin/env node
// Builds Changdeokgung and Huwon, its rear garden
// (public/regions/another-seoul/districts/changdeokgung.json), from the real
// map: scripts/data/changdeokgung-osm.json (OpenStreetMap, © OpenStreetMap
// contributors, ODbL; scripts/extract-changdeokgung-osm.mjs), at a quarter of
// the real distances like the rest of the game's Seoul (docs/WORLD.md).
// (0, 0) is the middle of Donhwamun, the main gate.
//
// Sizes (Yozi, 2026-11-21):
//   - The palace: the site at 1/4, every building's middle on its real spot;
//     halls and gates at 50% of the real footprint where they fit, heights
//     at half, the roofed corridors at the 1/4 map (as at Gyeongbokgung,
//     scripts/lib/palace-plan.mjs).
//   - Huwon: each garden (a pond with its pavilions) is drawn whole at 50%
//     (2 × the 1/4 map), so a pavilion is bigger than the people and still
//     stands where it stands by its pond. Four gardens at twice their size
//     don't fit on their real spots in the valley, so they are moved apart
//     along it, in their real order (GARDENS: "to", with the distance moved
//     in the log and in meta.gardens). The forest paths between them follow.
//
// Not in OpenStreetMap, drawn from the path round it and its recorded size
// (34.5 × 29.4 m): Buyongji, the square pond ("approx": 1).
// Left out for now: the hills (the garden is drawn flat), the yard walls
// inside the palace, the stream at Ongnyucheon.
//
//   node scripts/build-changdeokgung.mjs            writes the district
//   node scripts/build-changdeokgung.mjs --svg F    also draws the plan to F
//   node scripts/build-changdeokgung.mjs --dry      writes nothing
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame, anchorOffset } from '../src/core/seoul-grid.js';
import { obb, rect, sat, inside, area, rectangles, planPalace } from './lib/palace-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGION = path.join(root, 'public', 'regions', 'another-seoul', 'region.json');
const MAP = path.join(root, 'public', 'regions', 'another-seoul', 'districts', 'changdeokgung.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'changdeokgung-osm.json'), 'utf8'));

export const FOOT = 2; // footprints: 50% of the real size = 2 × the 1/4 map
export const UP = 1; // heights: the palace models are drawn at half the real height
export const GARDEN = 2; // a Huwon garden, whole: 2 × the 1/4 map = 50%
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

// ---------- Real coordinates -> the district's metres (Donhwamun at (0, 0)) ----------
const byName = (n) => osm.elements.find((e) => e.name === n && e.kind === 'building');
const centre = (pts) => pts.slice(0, -1).reduce((a, p, _, l) => [a[0] + p[0] / l.length, a[1] + p[1] / l.length], [0, 0]);
export const GATE_AT = centre(byName('돈화문').pts); // [lat, lon]
const [gx, gz] = toGame(GATE_AT[0], GATE_AT[1]);
export const local = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - gx, z - gz]; };
const mid = (P) => { const Q = P.length > 2 && P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1] ? P.slice(0, -1) : P; return [Q.reduce((s, p) => s + p[0], 0) / Q.length, Q.reduce((s, p) => s + p[1], 0) / Q.length]; };
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};
const polyDist = (x, z, P, closed = true) => { let d = 1e9; for (let i = closed ? 0 : 1; i < P.length; i++) d = Math.min(d, segDist(x, z, P[(i + P.length - 1) % P.length], P[i])); return d; };

// ---------- The palace wall ----------
// OSM's outline of the palace grounds, opened at Donhwamun (the gate stands
// in the gap). The other gates in it (Geumhomun, Danbongmun) stay shut.
const GATE = obb(byName('돈화문').pts.map(local));
const RAW = osm.elements.find((e) => e.kind === 'palace').pts.slice(0, -1).map(local);
export const OUTLINE = (() => {
  const cs = Math.cos(GATE.a), sn = Math.sin(GATE.a), hw = (GATE.w * FOOT) / 2;
  const u = ([x, z]) => x * cs + z * sn, v = ([x, z]) => -x * sn + z * cs;
  const inGate = (p) => Math.abs(u(p)) < hw + 0.3 && Math.abs(v(p)) < GATE.d * FOOT;
  const k = RAW.findIndex((p, i) => !inGate(p) && inGate(RAW[(i + RAW.length - 1) % RAW.length]));
  const W = RAW.slice(k).concat(RAW.slice(0, k)).filter((p) => !inGate(p));
  const end = (s) => [s * hw * cs, s * hw * sn];
  const s0 = Math.sign(u(W[0])) || 1;
  return [end(s0), ...W, end(-s0)];
})();
const inPalace = (x, z) => inside(RAW, x, z);

// ---------- The palace's buildings (south of Huwon, and Seonwonjeon's yards in the north-west) ----------
export const HUWON_Z = -84; // north of this line (and east of x -20) is the garden
const inHuwon = (x, z) => z < HUWON_Z && x > -20;
const SKIP = /매표소|측간|목욕탕/; // ticket booths, toilets, a bath house
const front = osm.elements.filter((e) => { if (e.kind !== 'building' || SKIP.test(e.name || '')) return false; const [x, z] = mid(e.pts.map(local)); return !inHuwon(x, z); });
const OWN = { 돈화문: 'palacegate', 인정문: 'palacegate', 인정전: 'throne' };
const BOARDS = { 선정전: '宣政殿', 희정당: '熙政堂', 대조전: '大造殿', 낙선재: '樂善齋', 성정각: '誠正閣', 구선원전: '璿源殿', 규장각: '奎章閣', 신선원전: '璿源殿' };
export const COUNT = Number(process.env.COUNT) || 30;
const KEEP = [ // the way in and the throne hall's line first, then the king's and queen's halls, Nakseonjae, the offices
  '진선문', '숙장문', '선정전', '희정당', '대조전', '성정각', '낙선재', '석복헌', '수강재', '구선원전', '규장각', '경훈각', '관물헌',
  '승화루', '내의원', '신선원전', '의효전', '선정문', '금호문', '단봉문', '옥당(홍문관)', '검서청', '한정당', '상량정', '취운정', '예문관', '정청', '내병조'];
const plan = planPalace({ elements: front, local, inPalace, OUTLINE: RAW, OWN, NO_RIDGE: new Set(['대조전']), BOARDS, KEEP, COUNT, FOOT, HALLS: new Set(['낙선재', '석복헌', '수강재']) });
const { own, halls, runs, blockers, yards, sides, corridorP } = plan;

// ---------- Doors ----------
// Changdeokgung's quarters are small rings inside rings (Nakseonjae, the
// queen's kitchens), and OSM draws their little gates as part of the
// corridors, so the planner's doors on each ring's middle line leave some
// yards shut. From just inside Donhwamun, every hall and yard that cannot be
// walked to gets a door (GAP wide) where the way to it crosses the fewest
// corridors. A hall with no free ground at any side (jammed between
// corridors) is left out. Recorded in meta.doors: the doors are made up.
export const doors = [];
{
  const GAP = 1.8, R = 0.4, xs = RAW.map((q) => q[0]), zs = RAW.map((q) => q[1]);
  const X0 = Math.min(...xs) - 1, Z0 = Math.min(...zs) - 1, nx = Math.ceil((Math.max(...xs) - X0 + 1) / R), nz = Math.ceil((Math.max(...zs) - Z0 + 1) / R);
  const cell = (x, z) => Math.floor((z - Z0) / R) * nx + Math.floor((x - X0) / R);
  const HARD = 65535;
  let grid;
  const paint = () => { // 0 free; n + 1: corridor run n; HARD: a hall, a block, outside the wall
    grid = new Uint16Array(nx * nz);
    blockers.forEach((b, n) => {
      const bx = b.p.map((q) => q[0]), bz = b.p.map((q) => q[1]);
      for (let i = Math.max(0, Math.floor((Math.min(...bx) - 0.4 - X0) / R)); i <= Math.min(nx - 1, Math.ceil((Math.max(...bx) + 0.4 - X0) / R)); i++)
        for (let j = Math.max(0, Math.floor((Math.min(...bz) - 0.4 - Z0) / R)); j <= Math.min(nz - 1, Math.ceil((Math.max(...bz) + 0.4 - Z0) / R)); j++) {
          const x = X0 + (i + 0.5) * R, z = Z0 + (j + 0.5) * R, k = j * nx + i;
          if (grid[k] === HARD) continue;
          if (inside(b.p, x, z) || [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(([dx, dz]) => inside(b.p, x + dx, z + dz))) grid[k] = n < runs.length ? n + 1 : HARD;
        }
    });
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = X0 + (i + 0.5) * R, z = Z0 + (j + 0.5) * R; if (!inPalace(x, z)) grid[j * nx + i] = HARD; }
  };
  const flood = () => { // cost[k]: corridor cells crossed on the way from the gate; from[k]: the cell before
    const cost = new Float32Array(nx * nz).fill(1e9), from = new Int32Array(nx * nz).fill(-1), dq = [cell(0, -6)];
    cost[dq[0]] = 0;
    while (dq.length) {
      const c = dq.shift(), i = c % nx, j = (c - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj, k = jj * nx + ii;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || grid[k] === HARD) continue;
        const w = grid[k] ? 1 : 0;
        if (cost[c] + w < cost[k]) { cost[k] = cost[c] + w; from[k] = c; if (w) dq.push(k); else dq.unshift(k); }
      }
    }
    return { cost, from };
  };
  const near = (x, z, far) => { const out = []; for (let r = 0; r <= far; r += 0.4) for (let a = 0; a < 8; a++) { const k = cell(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r); if (grid[k] === 0) out.push(k); } return out; };
  const goals = () => { // each hall and yard: the free cells that count as "at it"
    const out = [];
    for (const h of halls) if (h.kind === 'h' || h.kind === 'n') {
      const cs = Math.cos(-h.ry), sn = Math.sin(-h.ry), at = (u, v) => [h.x + u * cs - v * sn, h.z + u * sn + v * cs];
      out.push({ h, cells: [at(0, h.d / 2 + 1.2), at(0, -h.d / 2 - 1.2), at(h.w / 2 + 1.2, 0), at(-h.w / 2 - 1.2, 0)].flatMap(([x, z]) => near(x, z, 1.2)) });
    }
    for (const y of yards) {
      const cs = Math.cos(y.a), sn = Math.sin(y.a), cells = [];
      for (let u = -y.w / 2 + 1.5; u < y.w / 2 - 1.5; u += 0.8) for (let v = -y.d / 2 + 1.5; v < y.d / 2 - 1.5; v += 0.8) { const k = cell(y.x + u * cs - v * sn, y.z + u * sn + v * cs); if (grid[k] === 0) cells.push(k); }
      out.push({ y, cells });
    }
    return out;
  };
  const cut = (n, x, z) => { // a GAP in run n at the point nearest (x, z)
    const [x0, z0, x1, z1, side, D] = runs[n], L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L;
    const t = Math.max(GAP / 2, Math.min(L - GAP / 2, (x - x0) * ux + (z - z0) * uz)), pieces = [];
    for (const [a, b] of [[0, t - GAP / 2], [t + GAP / 2, L]]) if (b - a > 0.8) pieces.push([r1(x0 + ux * a), r1(z0 + uz * a), r1(x0 + ux * b), r1(z0 + uz * b), side, D]);
    runs.splice(n, 1, ...pieces);
    const P = pieces.map(([a, b, c, d]) => ({ p: rect((a + c) / 2, (b + d) / 2, Math.hypot(c - a, d - b), D, Math.atan2(d - b, c - a)) }));
    blockers.splice(n, 1, ...P);
    corridorP.splice(n, 1, ...P.map((b) => b.p));
    doors.push([r1(x0 + ux * t), r1(z0 + uz * t)]);
  };
  for (let turn = 0; turn < 60; turn++) {
    paint();
    const { cost, from } = flood();
    const shut = goals().filter((g) => g.cells.length && !g.cells.some((k) => cost[k] === 0)).map((g) => g.cells.reduce((a, k) => (cost[k] < cost[a] ? k : a))).filter((k) => cost[k] < 1e9);
    if (!shut.length) break;
    let k = shut.reduce((a, b) => (cost[b] < cost[a] ? b : a)), first = -1; // the nearest shut place: the first corridor on the way to it
    for (; k >= 0; k = from[k]) if (grid[k]) first = k;
    const i = first % nx, j = (first - i) / nx;
    cut(grid[first] - 1, X0 + (i + 0.5) * R, Z0 + (j + 0.5) * R);
  }
  paint();
  const { cost } = flood();
  for (let n = halls.length - 1; n >= 0; n--) { // a hall with no free ground beside it, or still shut in: left out
    const h = halls[n];
    if (h.kind !== 'h' && h.kind !== 'n') continue;
    const g = goals().find((q) => q.h === h);
    if (g.cells.some((k) => cost[k] === 0)) continue;
    const bi = blockers.findIndex((b, m) => m >= runs.length && Math.abs((b.p[0][0] + b.p[2][0]) / 2 - h.x) < 0.02 && Math.abs((b.p[0][1] + b.p[2][1]) / 2 - h.z) < 0.02);
    console.log('left out (no way to it):', h.name || `hall at ${r1(h.x)},${r1(h.z)}`);
    halls.splice(n, 1);
    if (bi >= 0) blockers.splice(bi, 1);
  }
  for (let n = yards.length - 1; n >= 0; n--) { const g = goals().find((q) => q.y === yards[n]); if (!g.cells.some((k) => cost[k] === 0)) yards.splice(n, 1); } // (a yard with no free ground: no paving)
  console.log('doors cut:', doors.length);
}
const O = Object.fromEntries(own.map((o) => [o.name, o]));
const lm = [], pois = [], areas = [], roads = [];

// Donhwamun (seen from the street) and Injeongmun: palacegate, w and d at s, drawn at 50%.
const GATES = { 돈화문: N('돈화문', 'Donhwamun', '敦化門', '敦化门'), 인정문: N('인정문', 'Injeongmun', '仁政門', '仁政门') };
const HAN = { 돈화문: '敦化門', 인정문: '仁政門' };
for (const n of ['돈화문', '인정문']) {
  const o = O[n], s = 0.5;
  lm.push({ type: 'palacegate', x: r1(o.x), z: r1(o.z), ry: r2(-o.a), w: r1((o.w * FOOT) / s), d: r1((o.d * FOOT) / s), s, sc: [FOOT / 2, UP], name: { ko: n, en: GATES[n].en, han: HAN[n] }, ...(n === '돈화문' ? {} : { inner: 1 }) });
  const W = o.w * FOOT, D = o.d * FOOT, cs = Math.cos(o.a), sn = Math.sin(o.a);
  for (const k of [-1.5, -0.5, 0.5, 1.5]) { const u = (k * W) / 3; blockers.push({ p: rect(o.x + u * cs, o.z + u * sn, 0.5, D, o.a) }); } // its posts (three passages)
}
// Injeongjeon, the throne hall, on its two terraces: the "throne" model (its
// hall is 30 × 20 at hs 1; the hall's middle sits 2.6 hs behind the
// landmark's), as big as leaves room to walk round it in its court.
{
  const o = O['인정전'], hs = (o.w * FOOT) / 30, cs = Math.cos(o.a), sn = Math.sin(o.a), WALK = 1.3, MIN = 0.6;
  const at = (ts) => { const back = 2.6 * hs * ts, x = o.x - sn * back, z = o.z + cs * back; return { x, z, T1: [56 * hs * ts, 40 * hs * ts] }; };
  let ts = FOOT / 2;
  const hit = (ts) => { const t = at(ts), P = rect(t.x, t.z, t.T1[0] + 2 * WALK, t.T1[1] + 2 * WALK, o.a); return corridorP.some((K) => sat(P, K)); };
  while (ts > MIN + 1e-6 && hit(ts)) ts = Math.max(MIN, ts - 0.025);
  const { x, z, T1 } = at(ts);
  sides.push(['인정전', Math.round(ts * 50)]);
  lm.push({ type: 'throne', x: r1(x), z: r1(z), ry: r2(-o.a), hs: r2(hs), sc: [r2(ts), UP], name: { ko: '인정전', en: 'Injeongjeon', han: '仁政殿' }, inner: 1 });
  blockers.push({ p: rect(o.x, o.z, o.w * FOOT * ts + 1, o.d * FOOT * ts + 1, o.a) });
  yards.push({ x, z, w: T1[0], d: T1[1], a: o.a, terrace: 1 });
  pois.push({ kind: 'landmark', x: r1(o.x), z: r1(o.z + 6), name: N('인정전', 'Injeongjeon Hall', '仁政殿', '仁政殿') });
}
console.log('hall sizes (% of real):', sides.map(([n, p]) => `${n} ${p}`).join(', '));

// ---------- Huwon: the gardens ----------
// box: what belongs to the garden, on the 1/4 map [x0, z0, x1, z1] (z0 the
// south edge). The garden is drawn GARDEN times as big about the box's
// middle, which moves to "to" (x: as far east as keeps it inside the wall).
export const GAP = 5; // forest left between two gardens
export const GARDENS = [
  { id: 'buyongji', name: N('부용지', 'Buyongji Pond', '芙蓉池', '芙蓉池'), box: [52, -98.5, 75, -122.5] },
  { id: 'aeryeonji', name: N('애련지와 연경당', 'Aeryeonji Pond and Yeongyeongdang', '愛蓮池・演慶堂', '爱莲池与演庆堂'), box: [44.5, -135.5, 74, -158.5] },
  { id: 'gwallamji', name: N('관람지와 존덕정', 'Gwallamji Pond and Jondeokjeong', '観纜池・尊徳亭', '观缆池与尊德亭'), box: [59.5, -159, 78.5, -176.5] },
  { id: 'ongnyucheon', name: N('옥류천', 'Ongnyucheon Stream', '玉流川', '玉流川'), box: [42, -234, 58.5, -247.5], alone: 1 },
];
// Buyongji is not in OSM: a square pond 34.5 × 29.4 m (8.6 × 7.4 on the 1/4
// map) inside the path that goes round it, Buyongjeong on its south bank.
export const BUYONGJI = { at: [64.6, -106.6], w: 8.6, d: 7.4, a: (-19 * Math.PI) / 180, isle: 1.1 };
{
  // What stands in each garden (buildings, ponds), to keep it inside the wall
  // and clear of the garden before it. The first garden stays where it is;
  // each next one starts GAP north of the one before; Ongnyucheon, at the
  // far end, stays as near its real spot as the north wall lets it.
  const inBox = (g, [x, z]) => x >= g.box[0] && x <= g.box[2] && z <= g.box[1] && z >= g.box[3];
  let north = null;
  for (const g of GARDENS) {
    const [x0, z0, x1, z1] = g.box;
    g.c = [(x0 + x1) / 2, (z0 + z1) / 2];
    g.half = [(x1 - x0) / 2, (z0 - z1) / 2];
    const pts = [];
    for (const e of osm.elements) if (e.kind === 'building' || e.kind === 'water') { const P = e.pts.map(local); if (inBox(g, mid(P))) pts.push(...P); }
    if (g.id === 'buyongji') pts.push(...rect(BUYONGJI.at[0], BUYONGJI.at[1], BUYONGJI.w + 2, BUYONGJI.d + 2, BUYONGJI.a)); // (and the path round it)
    const s = Math.max(...pts.map((q) => q[1] - g.c[1])) * GARDEN, n = Math.min(...pts.map((q) => q[1] - g.c[1])) * GARDEN;
    const fits = (cx, cz) => pts.every(([px, pz]) => { const x = cx + (px - g.c[0]) * GARDEN, z = cz + (pz - g.c[1]) * GARDEN; return inPalace(x, z) && polyDist(x, z, RAW) > 3; });
    let best = null;
    const z0s = g.alone || north === null ? g.c[1] : Math.min(g.c[1], north - GAP - s);
    for (let dz = 0; dz <= 30 && !best; dz += 0.5) for (const sz of g.alone ? [1, -1] : [-1]) { // (north first; Ongnyucheon either way)
      for (let dx = 0; dx <= 40 && !best; dx += 0.5) for (const sx of [1, -1]) if (!best && fits(g.c[0] + sx * dx, z0s + sz * dz)) best = [g.c[0] + sx * dx, z0s + sz * dz];
    }
    g.to = best;
    g.moved = Math.hypot(g.to[0] - g.c[0], g.to[1] - g.c[1]);
    g.span = [g.to[1] + s, g.to[1] + n]; // its south and north ends
    if (north !== null && g.span[0] > north - GAP + 1e-6 && g.alone) console.log('!! ' + g.id + ' runs into the garden south of it');
    north = g.span[1];
  }
}
const gardenOf = (x, z, m = 0) => GARDENS.find((g) => Math.abs(x - g.c[0]) <= g.half[0] + m && Math.abs(z - g.c[1]) <= g.half[1] + m);
const inGarden = (g, [x, z]) => [g.to[0] + (x - g.c[0]) * GARDEN, g.to[1] + (z - g.c[1]) * GARDEN];
// Everything else in Huwon (the forest paths, a lone pavilion) moves with
// the gardens near it: each garden's edge pulls by 1 / distance³, and the
// wall and the palace hold still.
const pulls = [];
for (const g of GARDENS) for (let i = 0; i < 32; i++) {
  const t = (i / 32) * 4, s = Math.floor(t), f = (t - s) * 2 - 1;
  const [ux, uz] = [[f, -1], [1, f], [-f, 1], [-1, -f]][s], q = [g.c[0] + ux * g.half[0], g.c[1] + uz * g.half[1]], p = inGarden(g, q);
  pulls.push([q[0], q[1], p[0] - q[0], p[1] - q[1]]);
}
for (let i = 0; i < RAW.length; i++) { // (the wall, every 6 m)
  const a = RAW[i], b = RAW[(i + 1) % RAW.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
  for (let k = 0; k < n; k++) pulls.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, 0, 0]);
}
for (let x = -20; x <= 95; x += 5) pulls.push([x, HUWON_Z + 4, 0, 0]);
export function warp([x, z]) {
  if (!inHuwon(x, z)) return [x, z];
  const g = gardenOf(x, z);
  if (g) return inGarden(g, [x, z]);
  let sw = 0, dx = 0, dz = 0;
  for (const [px, pz, ex, ez] of pulls) { const d = Math.hypot(x - px, z - pz); if (d < 0.05) return [x + ex, z + ez]; const w = 1 / (d * d * d); sw += w; dx += w * ex; dz += w * ez; }
  return [x + dx / sw, z + dz / sw];
}

// Buildings in Huwon: at GARDEN times the 1/4 map, on their warped spot.
// The small open pavilions (정자) have their own model (core/huwon-model.js).
const JEONGJA = {
  부용정: ['cross', N('부용정', 'Buyongjeong Pavilion', '芙蓉亭', '芙蓉亭')], 애련정: ['square', N('애련정', 'Aeryeonjeong Pavilion', '愛蓮亭', '爱莲亭')],
  관람정: ['fan', N('관람정', 'Gwallamjeong Pavilion', '観纜亭', '观缆亭')], 존덕정: ['hex', N('존덕정', 'Jondeokjeong Pavilion', '尊徳亭', '尊德亭')],
  승재정: ['square'], 농수정: ['square'], 소요정: ['square'], 태극정: ['square'], 취한정: ['square'], 취규정: ['square'], 청심정: ['square'], 능허정: ['square'],
  청의정: ['thatch', N('청의정', 'Cheonguijeong Pavilion', '清漪亭', '清漪亭')],
};
const HUWON_BOARDS = { 주합루: '宙合樓', 영화당: '暎花堂', 연경당: '演慶堂', 서향각: '書香閣', 의두합: '倚斗閤', 선향재: '善香齋' };
const jeongja = [], leftOut = [];
const huwonHalls = [];
for (const e of osm.elements) {
  if (e.kind !== 'building' || SKIP.test(e.name || '')) continue;
  const P = e.pts.map(local), [mx, mz] = mid(P);
  if (!inHuwon(mx, mz)) continue;
  const o = obb(P), [x, z] = warp([o.x, o.z]);
  if (rect(x, z, o.w * GARDEN + 3, o.d * GARDEN + 3, o.a).some(([px, pz]) => !inPalace(px, pz))) { leftOut.push(e.name || 'a building'); continue; } // (at twice its size it would stand on the wall)
  const J = JEONGJA[e.name];
  if (J) { // (a pavilion's size: its longer side, never under 2.4 m, so you can see into it)
    const s = Math.max(2.4, Math.max(o.w, o.d) * GARDEN);
    jeongja.push({ x: r1(x), z: r1(z), ry: r2(-o.a), s: r1(s), kind: J[0], name: e.name });
    blockers.push({ p: rect(x, z, s + 0.3, s + 0.3, o.a) });
    if (J[1]) pois.push({ kind: 'landmark', x: r1(x), z: r1(z), name: J[1] });
    continue;
  }
  const fill = area(P) / o.A, parts = fill > 0.9 ? [{ x: o.x, z: o.z, w: o.w, d: o.d, a: o.a }] : rectangles(P, o);
  for (const r of parts) {
    const [hx, hz] = [x + (r.x - o.x) * GARDEN, z + (r.z - o.z) * GARDEN], w = r.w * GARDEN, d = r.d * GARDEN;
    if (Math.min(w, d) < 1.2) continue;
    huwonHalls.push({ x: hx, z: hz, w, d, ry: -r.a, kind: e.name ? 'h' : 'r', han: r === parts[0] ? HUWON_BOARDS[e.name] : undefined, name: e.name || '' });
    blockers.push({ p: rect(hx, hz, w + 0.7, d + 0.7, r.a) });
  }
}
halls.push(...huwonHalls);
lm.push({ type: 'palacehalls', x: 0, z: 0, v: UP, halls: halls.map((h) => { const e = [r1(h.x), r1(h.z), r1(h.w), r1(h.d), r2(h.ry), h.kind]; if (h.han) e.push(h.han); return e; }), inner: 1 });
lm.push({ type: 'cloister', x: 0, z: 0, h: 2.6, runs, inner: 1 });
lm.push({ type: 'jeongja', x: 0, z: 0, list: jeongja.map((j) => [j.x, j.z, j.ry, j.s, j.kind]), inner: 1 });

// ---------- Water ----------
const water = [];
for (const e of osm.elements) if (e.kind === 'water') water.push({ name: e.name || '', p: e.pts.slice(0, -1).map(local).map(warp).map(([x, z]) => [r1(x), r1(z)]) });
// Buyongji (BUYONGJI above), with a round island in it.
{
  const g = GARDENS[0], b = BUYONGJI, [x, z] = inGarden(g, b.at);
  const p = rect(x, z, b.w * GARDEN, b.d * GARDEN, b.a).map(([px, pz]) => [r1(px), r1(pz)]);
  water.push({ name: '부용지', p, approx: 1 });
  lm.push({ type: 'pondisle', x: r1(x), z: r1(z), ry: r2(-b.a), w: r1(b.w * GARDEN), d: r1(b.d * GARDEN), r: r1(b.isle * GARDEN), inner: 1 });
  blockers.push({ p });
  pois.push({ kind: 'landmark', x: r1(x), z: r1(z), name: g.name });
}
for (const w of water) {
  areas.push({ k: 'water', p: w.p, why: w.name + (w.approx ? ' (approx: not in OSM; from the path round it and its recorded size)' : ''), ...(w.approx ? { approx: 1 } : {}) });
  if (!w.approx) blockers.push({ p: w.p });
}
// Geumcheon, the stream inside the gate (북영천): a ribbon of water, open
// where a path crosses it (Geumcheongyo, the stone bridge).
const paths = osm.elements.filter((e) => e.kind === 'path').map((e) => ({ e, p: e.pts.map(local) }));
{
  const W = 1.4, line = osm.elements.find((e) => e.kind === 'stream').pts.map(local);
  const dense = [];
  for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5)); for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); }
  dense.push(line.at(-1));
  const crossed = (p) => paths.some((q) => polyDist(p[0], p[1], q.p, false) < 2.2);
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      const L = [], R = [];
      run.forEach((p, i) => { const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l; L.push([r1(p[0] + (nx * W) / 2), r1(p[1] + (nz * W) / 2)]); R.push([r1(p[0] - (nx * W) / 2), r1(p[1] - (nz * W) / 2)]); });
      const p = L.concat(R.reverse());
      areas.push({ k: 'water', p, why: '금천 (북영천)' });
      blockers.push({ p });
    }
    run = [];
  };
  for (const p of dense) { if (crossed(p) || !inPalace(p[0], p[1])) flush(); else run.push(p); }
  flush();
}

// ---------- Paths ----------
// OSM's footpaths, warped with the gardens in Huwon. Each is cut where it
// would run through a hall.
{
  const solid = blockers.map((b) => b.p);
  const blocked = ([x, z]) => solid.some((P) => inside(P, x, z));
  for (const { e, p } of paths) {
    const dense = [];
    for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); }
    dense.push(p.at(-1));
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        // (drop the points a straight line already covers)
        const keep = [run[0]];
        for (let i = 1; i < run.length - 1; i++) if (segDist(run[i][0], run[i][1], keep.at(-1), run[i + 1]) > 0.15) keep.push(run[i]);
        keep.push(run.at(-1));
        roads.push({ k: 'walk', w: e.highway === 'service' ? 3 : e.highway === 'pedestrian' ? 3.4 : 2.2, p: keep.map(([x, z]) => [r1(x), r1(z)]) });
      }
      run = [];
    };
    for (const q of dense) { if (!inPalace(q[0], q[1])) { flush(); continue; } const w = warp(q); if (blocked(w) || !inPalace(w[0], w[1]) || polyDist(w[0], w[1], RAW) < 1.2) flush(); // (a path the gardens' move would push through the wall stops there)
       else run.push(w); }
    flush();
  }
}

// ---------- Ground ----------
// The garden is wooded ground (park); the palace's yards are packed earth
// (OSM: sand), the courts inside the corridors paved.
const clipZ = (P, zMax, zMin) => { // the part of a polygon between two east-west lines
  const cut = (P, keep, at) => { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ia = keep(a[1]), ib = keep(b[1]); if (ia) out.push(a); if (ia !== ib) { const t = (at - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, at]); } } return out; };
  return cut(cut(P, (z) => z <= zMax, zMax), (z) => z >= zMin, zMin);
};
{
  const zs = RAW.map((p) => p[1]), top = Math.floor(Math.min(...zs)) - 1;
  for (let z = HUWON_Z; z > top; z -= 45) { // (in strips: one polygon this size makes long thin triangles that flicker on a phone)
    const p = clipZ(RAW, z, Math.max(top, z - 45)).map(([x, zz]) => [r1(x), r1(zz)]);
    if (p.length > 2) areas.push({ k: 'park', p, why: 'Huwon: the wooded garden' });
  }
}
for (const e of osm.elements) if (e.kind === 'sand') { const p = e.pts.slice(0, -1).map(local); if (p.every(([x, z]) => !inHuwon(x, z))) areas.push({ k: 'sand', p: p.map(([x, z]) => [r1(x), r1(z)]) }); }
for (const y of yards) areas.push({ k: 'stone', p: rect(y.x, y.z, y.w, y.d, y.a) });

// ---------- In front of the gate ----------
// Donhwamun's forecourt, down to Yulgok-ro. The game's Yulgok-ro runs 20 to
// 26 m south of the real one here (it joins Gyeongbokgung's frame), so the
// forecourt is that much deeper than in Seoul; the road is carried on east
// from where Gyeongbokgung's map ends it to the top of Donhwamun-ro (the
// base map). The Information Center is a hanok on the forecourt's east
// side, its door on Yulgok-ro's pavement (stores.json stands it there).
export const FORECOURT = { z: 28, road: { z: 35, x0: -30, x1: 24, w: 14 }, info: { id: 'info-changdeokgung', box: [12, 26.5, 23, 16.5] } };
const buildings = [];
{
  const F = FORECOURT, wall = OUTLINE.filter(([x, z], i) => i < 5 && x < 24 && z > -3); // (the wall east of the gate, to Danbongmun)
  areas.push({ k: 'plaza', why: 'Donhwamun\'s forecourt (deeper than the real one: the game\'s Yulgok-ro is 20-26 m south of its real line)', p: [[-12, 2.6], OUTLINE.at(-1), ...wall, [24, 4], [24, F.z], [-12, F.z]].map(([x, z]) => [r1(x), r1(z)]) });
  roads.push({ k: 'primary', w: F.road.w, p: [[F.road.x0, F.road.z], [F.road.x1, F.road.z]], n: N('율곡로', 'Yulgok-ro', '栗谷路', '栗谷路'), why: 'carried on from Gyeongbokgung\'s map to Donhwamun-ro; 20-26 m south of the real road, like the stretch west of it' });
  const [x0, z0, x1, z1] = F.info.box;
  buildings.push({ h: 6, hanok: 1, fr: [0, 1], p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
}

// ---------- The wall ----------
const wallPts = OUTLINE.map(([x, z]) => [r1(x), r1(z)]);
lm.push({ type: 'wall', h: 3.2, p: wallPts, why: 'the palace wall on its real line (OSM: the palace grounds, way ' + osm.elements.find((e) => e.kind === 'palace').id + ')' });
for (let i = 0; i < wallPts.length - 1; i++) {
  const [x0, z0] = wallPts[i], [x1, z1] = wallPts[i + 1];
  blockers.push({ p: rect((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + 0.8, 1.6, Math.atan2(z1 - z0, x1 - x0)) });
}

// ---------- The woods ----------
// Trees all over the garden, off the paths, the buildings, the water and
// the gardens' open ground.
const trees = [];
{
  const solid = blockers.map((b) => b.p), wet = water.map((w) => w.p);
  const lines = roads.map((r) => r.p);
  const hash = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
  const zs = RAW.map((p) => p[1]), xs = RAW.map((p) => p[0]);
  for (let z = HUWON_Z - 3; z > Math.min(...zs); z -= 5.6) for (let x = Math.min(...xs); x < Math.max(...xs); x += 5.6) {
    const jx = x + (hash(x, z) - 0.5) * 3.4, jz = z + (hash(z, x) - 0.5) * 3.4;
    if (!inPalace(jx, jz) || polyDist(jx, jz, RAW) < 3) continue;
    if (lines.some((L) => polyDist(jx, jz, L, false) < 3.2)) continue;
    if (solid.some((P) => inside(P, jx, jz) || polyDist(jx, jz, P) < 2.6) || wet.some((P) => inside(P, jx, jz) || polyDist(jx, jz, P) < 2.2)) continue;
    const g = GARDENS.find((g) => Math.abs(jx - g.to[0]) < g.half[0] * GARDEN && Math.abs(jz - g.to[1]) < g.half[1] * GARDEN);
    if (g && solid.concat(wet).some((P) => polyDist(jx, jz, P) < 7)) continue; // (a garden's open ground)
    trees.push([r1(jx), r1(jz)]);
  }
}
lm.push({ type: 'shrinetrees', x: 0, z: 0, spots: trees, inner: 1 });

// ---------- Names and signs ----------
pois.push(
  { kind: 'landmark', x: 6, z: -8, name: N('창덕궁', 'Changdeokgung Palace', '昌徳宮', '昌德宫') },
  ...GARDENS.slice(1).map((g) => ({ kind: 'landmark', x: r1(g.to[0]), z: r1(g.to[1]), name: g.name })),
);
for (const [n, name] of [['낙선재', N('낙선재', 'Nakseonjae', '楽善斎', '乐善斋')], ['대조전', N('대조전', 'Daejojeon Hall', '大造殿', '大造殿')], ['희정당', N('희정당', 'Huijeongdang Hall', '熙政堂', '熙政堂')]]) {
  const h = halls.find((q) => q.name === n);
  if (h) pois.push({ kind: 'landmark', x: r1(h.x), z: r1(h.z), name });
}
const SIGNS = [
  { at: [5.5, -6.5], ry: 0, title: N('창덕궁', 'Changdeokgung Palace', '昌徳宮', '昌德宫'),
    text: N('1405년에 지은 조선의 궁궐. 산자락을 따라 자연스럽게 앉힌 건물과 뒤뜰 후원으로 1997년 유네스코 세계유산이 되었다. 인정전을 지나 북쪽 길로 가면 후원이다.',
      'A Joseon palace first built in 1405. Its halls follow the foot of the hill instead of a straight line, and with its rear garden, Huwon, it became a UNESCO World Heritage site in 1997. Go past Injeongjeon and take the path north to the garden.',
      '1405年に建てられた朝鮮の宮殿。山すそに沿って自然に配された建物と裏庭「後苑」で、1997年にユネスコ世界遺産となった。仁政殿を過ぎて北の道を行くと後苑。',
      '始建于1405年的朝鲜王宫。殿阁顺着山脚自然布置，与后院“后苑”一起于1997年列入联合国教科文组织世界遗产。经过仁政殿向北走就是后苑。') },
  { at: [69, -88], ry: 0, title: N('후원', 'Huwon, the Secret Garden', '後苑（秘苑）', '后苑（秘苑）'),
    text: N('왕실의 뒤뜰. 숲길을 따라 부용지와 주합루, 애련지와 연경당, 관람지와 존덕정, 옥류천이 차례로 나온다. 이 게임에서는 연못과 정자를 실제의 절반 크기로 키워서, 정원 사이가 실제보다 가깝다.',
      'The royal family\'s garden behind the palace. Along the forest path come Buyongji Pond and Juhamnu, Aeryeonji Pond and Yeongyeongdang, Gwallamji Pond and Jondeokjeong, then Ongnyucheon Stream. In this game the ponds and pavilions are half their real size, so the gardens stand closer together than in Seoul.',
      '王室の裏庭。森の道に沿って芙蓉池と宙合楼、愛蓮池と演慶堂、観纜池と尊徳亭、玉流川の順に現れる。このゲームでは池と東屋を実物の半分の大きさにしたので、庭どうしが実際より近い。',
      '王室的后花园。沿着林间小路依次是芙蓉池与宙合楼、爱莲池与演庆堂、观缆池与尊德亭、玉流川。游戏里池塘和亭子是实际的一半大小，所以各个园子比实际更近。') },
];
for (const s of SIGNS) { lm.push({ type: 'sign', x: s.at[0], z: s.at[1], ry: s.ry, title: s.title, text: s.text, ...(s.at[1] < -20 ? { inner: 1 } : {}) }); blockers.push({ p: rect(s.at[0], s.at[1], 1.6, 0.5, 0) }); }

// ---------- Write ----------
const xs = RAW.map((p) => p[0]), zs = RAW.map((p) => p[1]);
const box = [Math.floor(Math.min(...xs)), Math.ceil(Math.max(...zs)), Math.ceil(Math.max(...xs)), Math.floor(Math.min(...zs))];
const map = {
  meta: {
    district: 'changdeokgung',
    parts: [
      { why: 'the palace: Donhwamun to Daejojeon and Nakseonjae', box: [-14, 8, Math.ceil(Math.max(...xs)), HUWON_Z] },
      { why: 'the forecourt and Yulgok-ro in front of the gate', box: [-12, FORECOURT.road.z + FORECOURT.road.w / 2, 24, 8] },
      { why: 'Huwon, the garden behind it', box: [-20, HUWON_Z, Math.ceil(Math.max(...xs)), Math.floor(Math.min(...zs.filter((_, i) => xs[i] > -20)))] },
      { why: 'Seonwonjeon\'s yards, in the garden\'s north-west corner', box: [Math.floor(Math.min(...xs)), Math.ceil(Math.max(...zs.filter((_, i) => xs[i] < -22))), -20, Math.floor(Math.min(...zs.filter((_, i) => xs[i] < -22)))] },
    ],
    enclosure: { why: 'inside the palace wall: the halls, the garden and its woods are drawn once you walk in through Donhwamun (core/enclosure.js)', box, poly: RAW.map(([x, z]) => [r1(x), r1(z)]) },
    gardens: GARDENS.map((g) => ({ id: g.id, real: g.c.map(r1), at: g.to.map(r1), scale: GARDEN, moved: r1(g.moved), why: 'a garden at 50% is twice the 1/4 map: moved along the valley so the four stand clear of each other and of the wall, in their real order' })),
    doors, // made up: gaps cut in corridors so every yard can be walked into (OSM draws the small gates as corridor)
    halls: { foot: FOOT / 4, sizes: Object.fromEntries(sides), why: 'halls at 50% where they fit between the corridors (kept at 1/4, they are the yards\' edges); in these tight yards most stay at 30%' },
    source: 'OpenStreetMap © OpenStreetMap contributors, ODbL (the wall, buildings, ponds and paths), at 1/4. Built by scripts/build-changdeokgung.mjs',
  },
  roads, buildings, rail: [], areas, blockers, pois, landmarks: lm,
};
const pretty = (o) => JSON.stringify(o, null, 1).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
const dry = process.argv.includes('--dry');
if (!dry) writeFileSync(MAP, pretty(map) + '\n');
// The district's place in the region: Donhwamun on its real spot.
{
  // (region.json is hand-formatted: the entry is put in as text, after Jongmyo's)
  let text = readFileSync(REGION, 'utf8');
  const anchor = { place: 'Donhwamun, Changdeokgung\'s main gate', lat: +GATE_AT[0].toFixed(6), lon: +GATE_AT[1].toFixed(6), local: [0, 0], why: 'No nudge: the gate on its real spot and the palace on its real ground (scripts/build-changdeokgung.mjs).' };
  const entry = { id: 'changdeokgung', map: 'districts/changdeokgung.json', offset: anchorOffset(anchor), anchor };
  const block = `    {\n      "id": "changdeokgung",\n      "map": "${entry.map}",\n      "offset": [\n        ${entry.offset[0]},\n        ${entry.offset[1]}\n      ],\n      "anchor": ${JSON.stringify(anchor).replace(/([{,])"/g, '$1 "').replace(/":/g, '": ').replace(/}$/, ' }').replace(/\[0,0\]/, '[0, 0]')}\n    },\n`;
  const old = text.match(/    \{\n      "id": "changdeokgung",[\s\S]*?\n    \},\n/);
  if (old) text = text.replace(old[0], block);
  else { const at = text.indexOf('    {\n      "id": "itaewon"'); text = text.slice(0, at) + block + text.slice(at); }
  if (!dry && process.argv.includes('--region')) writeFileSync(REGION, text);
  // stores.json is hand-formatted too: only the Information Center's "at" is rewritten.
  const STORES = path.join(root, 'public', 'regions', 'another-seoul', 'stores.json');
  let stores = readFileSync(STORES, 'utf8');
  const [x0, z0, x1] = FORECOURT.info.box, at = stores.indexOf(`"id": "${FORECOURT.info.id}"`);
  if (at < 0) console.log(FORECOURT.info.id + ': not in stores.json');
  else {
    const end = stores.indexOf('\n', at);
    stores = stores.slice(0, at) + stores.slice(at, end).replace(/"at": \[[^\]]*\]/, `"at": [${(x0 + x1) / 2 + entry.offset[0]}, ${z0 + 2 + entry.offset[1]}]`) + stores.slice(end);
    if (!dry && process.argv.includes('--region')) writeFileSync(STORES, stores);
  }
  console.log('offset', entry.offset);
}
console.log(`halls ${halls.length} (Huwon ${huwonHalls.length}), pavilions ${jeongja.length}, corridor runs ${runs.length}, blockers ${blockers.length}, paths ${roads.length}, trees ${trees.length}, water ${water.length}`);
if (leftOut.length) console.log('left out of Huwon (no room by the wall):', leftOut.join(', '));
for (const g of GARDENS) console.log(`garden ${g.id}: real (${g.c.map(r1)}) -> (${g.to.map(r1)}), moved ${r1(g.moved)} m (${Math.round(g.moved * 4)} m in Seoul)`);

// ---------- Can you walk to everything? ----------
// Flood from just inside Donhwamun on a 40 cm grid (blocked: the blockers,
// grown by a body's half width; outside the wall) and check every named
// place, every pavilion's side, every paved yard and along every path.
{
  const R = 0.4, X0 = box[0] - 1, Z0 = box[3] - 1, nx = Math.ceil((box[2] - box[0] + 2) / R), nz = Math.ceil((box[1] - box[3] + 2) / R);
  const bad = new Uint8Array(nx * nz);
  for (const b of blockers) {
    const bx = b.p.map((q) => q[0]), bz = b.p.map((q) => q[1]);
    for (let i = Math.max(0, Math.floor((Math.min(...bx) - 0.4 - X0) / R)); i <= Math.min(nx - 1, Math.ceil((Math.max(...bx) + 0.4 - X0) / R)); i++)
      for (let j = Math.max(0, Math.floor((Math.min(...bz) - 0.4 - Z0) / R)); j <= Math.min(nz - 1, Math.ceil((Math.max(...bz) + 0.4 - Z0) / R)); j++) {
        const x = X0 + (i + 0.5) * R, z = Z0 + (j + 0.5) * R;
        if (inside(b.p, x, z) || [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(([dx, dz]) => inside(b.p, x + dx, z + dz))) bad[j * nx + i] = 1;
      }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (!inPalace(X0 + (i + 0.5) * R, Z0 + (j + 0.5) * R)) bad[j * nx + i] = 1;
  const seen = new Uint8Array(nx * nz), cell = (x, z) => Math.floor((z - Z0) / R) * nx + Math.floor((x - X0) / R);
  const q = [cell(0, -6)];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj, k = jj * nx + ii;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || seen[k] || bad[k]) continue;
      seen[k] = 1; q.push(k);
    }
  }
  const reach = (x, z, far = 1.2) => { for (let r = 0; r <= far; r += 0.4) for (let a = 0; a < 8; a++) if (seen[cell(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r)]) return true; return false; };
  const shut = [];
  for (const p of pois) if (!reach(p.x, p.z, 9)) shut.push(p.name.ko);
  for (const j of jeongja) if (!reach(j.x, j.z, j.s / 2 + 1.6)) shut.push(j.name);
  for (const h of halls) if (h.kind === 'h' || h.kind === 'n') {
    const cs = Math.cos(-h.ry), sn = Math.sin(-h.ry), at = (u, v) => [h.x + u * cs - v * sn, h.z + u * sn + v * cs];
    if (![at(0, h.d / 2 + 1.2), at(0, -h.d / 2 - 1.2), at(h.w / 2 + 1.2, 0), at(-h.w / 2 - 1.2, 0)].some(([x, z]) => reach(x, z))) shut.push(h.name || `hall at ${r1(h.x)},${r1(h.z)}`);
  }
  for (const y of yards) {
    if (y.terrace) continue;
    const cs = Math.cos(y.a), sn = Math.sin(y.a);
    let ok = false;
    for (let u = -y.w / 2 + 1.5; u < y.w / 2 - 1.5 && !ok; u += 0.8) for (let v = -y.d / 2 + 1.5; v < y.d / 2 - 1.5 && !ok; v += 0.8) ok = !!seen[cell(y.x + u * cs - v * sn, y.z + u * sn + v * cs)];
    if (!ok) shut.push(`yard at ${r1(y.x)},${r1(y.z)}`);
  }
  let cut = 0;
  for (const r of roads) if (r.k === 'walk') for (const [x, z] of r.p) if (!reach(x, z, 1.6)) { cut++; if (process.env.DBG) console.log('shut path point', x, z, r.k); }
  console.log(shut.length ? 'cannot walk to: ' + shut.join('; ') : 'every hall, yard, pavilion and garden can be walked to', cut ? `; ${cut} path points are shut in` : '');
  if (process.argv.includes('--check') && (shut.length || cut)) process.exitCode = 1;
  const ri = process.argv.indexOf('--reach');
  if (ri > 0) { // (debug: where you can walk, green)
    const K = 10, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
    let t = `<svg xmlns="http://www.w3.org/2000/svg" width="${nx * R * K}" height="${nz * R * K}"><rect width="100%" height="100%" fill="#fff"/>`;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (seen[j * nx + i]) t += `<rect x="${i * R * K}" y="${j * R * K}" width="${R * K}" height="${R * K}" fill="#bfe3b4"/>`;
    for (const b of blockers) t += `<polygon points="${b.p.map(P).join(' ')}" fill="#1f5fbf" fill-opacity="0.6"/>`;
    for (const h of halls) t += `<text x="${(h.x - X0) * K}" y="${(h.z - Z0) * K}" font-size="10">${h.name || ''}</text>`;
    writeFileSync(process.argv[ri + 1], t + '</svg>');
  }
}

// ---------- A plan, to compare with the real map ----------
const si = process.argv.indexOf('--svg');
if (si > 0) {
  const X0 = -75, Z0 = -265, K = 6, W = 180 * K, Hh = 280 * K, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}"><rect width="100%" height="100%" fill="#f4f1ea"/>`;
  s += `<polygon points="${RAW.map(P).join(' ')}" fill="#e3ecd6" stroke="none"/>`;
  for (const a of areas) s += `<polygon points="${a.p.map(P).join(' ')}" fill="${{ park: '#cfe6c0', sand: '#eadfbd', stone: '#d9d0bd', water: a.approx ? '#c9a3e8' : '#8cc0ea' }[a.k]}"/>`;
  for (const r of roads) s += `<polyline points="${r.p.map(P).join(' ')}" fill="none" stroke="#fff" stroke-width="${r.w * K}" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (const t of trees) s += `<circle cx="${(t[0] - X0) * K}" cy="${(t[1] - Z0) * K}" r="${1.6 * K}" fill="#6fa35c" fill-opacity=".45"/>`;
  if (process.argv.includes('--real')) for (const e of osm.elements) if (e.kind === 'building' || e.kind === 'water') s += `<polygon points="${e.pts.map(local).map(P).join(' ')}" fill="none" stroke="${e.kind === 'water' ? '#1f6fbf' : '#b5562f'}" stroke-width="1.2"/>`;
  for (const b of blockers) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#1f5fbf" fill-opacity="0.5"/>`;
  for (const h of halls) if (h.kind === 'r') s += `<polygon points="${rect(h.x, h.z, h.w, h.d, -h.ry).map(P).join(' ')}" fill="#e08a1e" fill-opacity="0.85"/>`;
  for (const j of jeongja) s += `<circle cx="${(j.x - X0) * K}" cy="${(j.z - Z0) * K}" r="${(j.s / 2) * K}" fill="#d0342c"/>`;
  s += `<polyline points="${wallPts.map(P).join(' ')}" fill="none" stroke="#444" stroke-width="3"/>`;
  for (const g of GARDENS) {
    s += `<rect x="${(g.to[0] - g.half[0] * GARDEN - X0) * K}" y="${(g.to[1] - g.half[1] * GARDEN - Z0) * K}" width="${g.half[0] * 2 * GARDEN * K}" height="${g.half[1] * 2 * GARDEN * K}" fill="none" stroke="#d0342c" stroke-dasharray="6 4"/>`;
    s += `<rect x="${(g.c[0] - g.half[0] - X0) * K}" y="${(g.c[1] - g.half[1] - Z0) * K}" width="${g.half[0] * 2 * K}" height="${g.half[1] * 2 * K}" fill="none" stroke="#777" stroke-dasharray="3 3"/>`;
    s += `<line x1="${(g.c[0] - X0) * K}" y1="${(g.c[1] - Z0) * K}" x2="${(g.to[0] - X0) * K}" y2="${(g.to[1] - Z0) * K}" stroke="#d0342c" stroke-width="2"/>`;
  }
  for (const p of pois) s += `<text x="${(p.x - X0) * K + 4}" y="${(p.z - Z0) * K}" font-size="13" font-family="sans-serif">${p.name.ko}</text>`;
  writeFileSync(process.argv[si + 1], s + '</svg>');
}
if (process.env.RUNS) { const [x0, z0, x1, z1] = process.env.RUNS.split(',').map(Number); for (const r of runs) if ((r[0] + r[2]) / 2 > x0 && (r[0] + r[2]) / 2 < x1 && (r[1] + r[3]) / 2 > z1 && (r[1] + r[3]) / 2 < z0) console.log('run', r.join(' ')); for (const h of halls) if (h.x > x0 && h.x < x1 && h.z > z1 && h.z < z0) console.log('hall', h.name, r1(h.x), r1(h.z), r1(h.w), r1(h.d), h.kind); }
