#!/usr/bin/env node
// Builds Seoul City Hall and Seoul Plaza (서울시청, 서울광장) into
// districts/gyeongbokgung.json, at the south end of Sejong-daero, from
// OpenStreetMap (scripts/data/city-hall-osm.json, © OpenStreetMap
// contributors, ODbL).
//
// The whole place is drawn at 37.5% of the real one, not the map's 1/4
// (Yozi 2026-11-24, card "통째로 37.5%": at 1/4 the lawn is 17 × 21 m beside a
// 16 m road and reads as a traffic island). "Whole" means one scale for the
// plaza, the lawn, the old hall (now Seoul Metropolitan Library), the glass
// new hall and the paving between them, so they keep their real places
// relative to each other (CH.S = 1.5 × the 1/4 map; heights CH.UP of the
// real ones).
//
// What stays put: the plaza's kerb on Sejong-daero (the game's Sejong-daero
// is on its real line), and the new hall's north face, 9 m south of its real
// line: the buildings along Cheonggyecheon stand right behind it. Everything
// else grows south and east from there, over land with nothing built:
//   - the lawn's middle ends up about 15 m south-east of the real one,
//   - Sogong-ro (the plaza's south side) about 21 m south of its real line,
//   - Eulji-ro along the plaza's east side moves out with it and is back on
//     its real line (3 m) by Namdaemun-ro, where it meets Myeongdong's.
// The numbers are written to meta.cityhall.moved, and everything that is not
// on OSM's line is marked `approx` with a `why`.
//
// Also built: a lane behind the new hall through to Cheonggyecheon-ro (made
// up: the real Mugyo-ro runs where the hall now stands), and across
// Sejong-daero Daehanmun (대한문, Deoksugung's gate, at 50% like the other
// palace gates) with the palace wall on OSM's outline all the way round.
// Deoksugung itself is not built: trees inside, and no way in. Sejong-daero
// past the plaza is region.json's link road from Sungnyemun; region.json's
// Eulji-ro link starts where this script's Eulji-ro ends (kept by hand, with
// City Hall station's exits CH.exits: tests/city-hall.test.mjs checks both).
//
// Run after scripts/build-cheonggyecheon.mjs (it redraws Sejong-daero and
// the blocks south of Jongno), then scripts/build-base.mjs and
// scripts/build-closed.mjs. What it writes is marked "sp": 1, so it can be
// run again.
//
//   node scripts/build-city-hall.mjs            rewrites the City Hall part
//   node scripts/build-city-hall.mjs --svg F    also draws the plan on the real map to F
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame } from '../src/core/seoul-grid.js';
import { strips } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const FILE = path.join(R, 'districts', 'gyeongbokgung.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'city-hall-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const [OX, OZ] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

export const CH = {
  S: 1.5, // across: 1.5 × the 1/4 map = 37.5% of the real size
  UP: 0.375, // heights: 37.5% of the real ones
  // The fixed point (district metres): the plaza's kerb on Sejong-daero × the new hall's north face.
  real: [11.5, 250], // where OSM has it at 1/4
  game: [16, 241], // where the game puts it (the kerb of the game's 16 m Sejong-daero; 9 m south, clear of Cheonggyecheon's buildings)
  sejongX: 8, sejongW: 16, // the game's Sejong-daero (scripts/build-cheonggyecheon.mjs)
  roadW: 12, // Sogong-ro, Eulji-ro
  kerb: 0.8, // m kept between the plaza and a road's edge
  hallH: 56, // m, the new hall's real height (13 floors; OSM has levels only: an estimate)
  gate: { w: 15, d: 8, s: 0.5 }, // Daehanmun at 50% (core/palace-model.js palacegate)
  wallH: 3, wallBack: 3.2, // Deoksugung's wall: this far behind Sejong-daero's kerb (the pavement)
  lane: 4, // m: the lane behind the new hall
  // City Hall Station's exits (region.json "subway", world metres = these + the district's offset): the real
  // exit's number, where it stands, which way its stairs go down. Each within 15 m of where the real one is in
  // the enlarged place (tests/city-hall.test.mjs).
  exits: [{ n: 4, at: [20.5, 249], ry: 0 }, { n: 5, at: [20.5, 280], ry: 3.1416 }, { n: 6, at: [27, 316.2], ry: 1.5708 }],
};

export const local = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
// A real spot (district metres at 1/4) → where it stands in the enlarged place.
export const grow = ([x, z]) => [CH.game[0] + CH.S * (x - CH.real[0]), CH.game[1] + CH.S * (z - CH.real[1])];
const els = (k) => osm.elements.filter((e) => e.kind === k);
const byId = (id) => osm.elements.find((e) => e.id === id);
const ring = (P) => [[...P, P[0]]];
const open = (Rg) => Rg.slice(0, -1).map(([x, z]) => [r1(x), r1(z)]);
const unclose = (P) => (P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1] ? P.slice(0, -1) : P);
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
const centre = (P) => { const xs = P.map((p) => p[0]), zs = P.map((p) => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]; };
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineDist = (x, z, P) => { let b = Infinity; for (let i = 1; i < P.length; i++) b = Math.min(b, segDist(x, z, P[i - 1], P[i])); return b; };
const biggest = (M) => M.slice().sort((a, b) => area(open(b[0])) - area(open(a[0])))[0];
const band = (P, half) => { // a road's ribbon as polygons (to cut paving back from it)
  const out = [];
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], l = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / l, uz = (bz - az) / l, nx = -uz * half, nz = ux * half, ex = ux * half, ez = uz * half;
    out.push([[[ax - ex + nx, az - ez + nz], [bx + ex + nx, bz + ez + nz], [bx + ex - nx, bz + ez - nz], [ax - ex - nx, az - ez - nz], [ax - ex + nx, az - ez + nz]]]);
  }
  return out;
};

const gb = JSON.parse(readFileSync(FILE, 'utf8'));
for (const k of ['roads', 'areas', 'blockers', 'landmarks', 'pois', 'buildings']) gb[k] = (gb[k] || []).filter((it) => !it.sp);

// ---------- The place, grown ----------
const G = (e) => unclose(e.pts.map(local).map(grow));
const lawn = G(byId(370019676)).map(([x, z]) => [r1(x), r1(z)]);
const hallOut = G(byId(198561926)), libOut = G(byId(198561929));
const lawnReal = centre(unclose(byId(370019676).pts.map(local))), lawnAt = centre(lawn);

// ---------- Roads ----------
const SX = CH.sejongX, kerbX = SX + CH.sejongW / 2, W = CH.roadW;
const plazaReal = G(byId(344644130));
const southZ = Math.max(...plazaReal.map((p) => p[1])), sogongZ = r1(southZ + CH.kerb + W / 2);
// Eulji-ro along the plaza's east side: the side's long straight edge, moved out by the kerb and half the road.
const east = (() => { // the plaza outline's longest edge that faces east
  let best = null;
  for (let i = 0; i < plazaReal.length; i++) {
    const a = plazaReal[i], b = plazaReal[(i + 1) % plazaReal.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (Math.min(a[0], b[0]) > 50 && Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) && (!best || l > best.l)) best = { a: a[1] > b[1] ? a : b, b: a[1] > b[1] ? b : a, l }; // a: its south end
  }
  return best;
})();
const off = CH.kerb + W / 2;
const ed = [(east.b[0] - east.a[0]) / east.l, (east.b[1] - east.a[1]) / east.l], en = [-ed[1], ed[0]]; // along it northwards; its normal, to the east
const eA = [east.a[0] + en[0] * off, east.a[1] + en[1] * off], eB = [east.b[0] + en[0] * off, east.b[1] + en[1] * off];
const J = [r1(eA[0] + (ed[0] * (sogongZ - eA[1])) / ed[1]), sogongZ]; // where it meets Sogong-ro
// The real Eulji-ro: its turn at the plaza's north-east corner, and its line east to Namdaemun-ro.
const euljiEast = byId(218923160).pts.map(local); // (the north carriageway, west to east)
const turnReal = byId(198564930).pts.map(local).sort((a, b) => a[1] - b[1])[0]; // the diagonal's north end
const turn = grow(turnReal);
const eastEnd = euljiEast.reduce((a, b) => (b[0] > a[0] ? b : a)); // on Namdaemun-ro (Eulji-ro 1-ga)
const NAMDAEMUN_END = (() => { // Myeongdong's Namdaemun-ro: its north end, in this district's metres
  const my = region.districts.find((d) => d.id === 'myeongdong'), m = JSON.parse(readFileSync(path.join(R, my.map), 'utf8'));
  const r = m.roads.find((q) => q.n?.ko === '남대문로'), p = r.p.reduce((a, b) => (b[1] < a[1] ? b : a));
  return [r1(p[0] + my.offset[0] - OX), r1(p[1] + my.offset[1] - OZ)];
})();
const euljiP = [J, [r1(eB[0]), r1(eB[1])], [r1(turn[0] - 6), r1(turn[1] - 4)], [r1(turn[0] + 4), r1(turn[1] - 5.5)], [r1((turn[0] + NAMDAEMUN_END[0]) / 2), r1(lineAt(euljiEast, (turn[0] + NAMDAEMUN_END[0]) / 2))], NAMDAEMUN_END];
function lineAt(P, x) { for (let i = 1; i < P.length; i++) { const [a, b] = [P[i - 1], P[i]]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); } return P.at(-1)[1]; }
const SEJONG = N('세종대로', 'Sejong-daero', '世宗大路', '世宗大路'), SOGONG = N('소공로', 'Sogong-ro', '小公路', '小公路'), EULJI = N('을지로', 'Eulji-ro', '乙支路', '乙支路'), MUGYO = N('무교로', 'Mugyo-ro', '武橋路', '武桥路');
const ROADS = [
  // (Sejong-daero past the plaza is region.json's link road from Sungnyemun, already on its real line)
  { k: 'primary', w: W, p: [[SX, sogongZ], J, [r1(J[0] + 2.5), r1(J[1] + 5)]], n: SOGONG, sp: 1, approx: 1, why: `Sogong-ro along the enlarged plaza's south side: ${r1(sogongZ - lineAt(byId(198564935).pts.map(local).sort((a, b) => a[0] - b[0]), 30))} m south of its real line (the place is 37.5%, not 1/4)` },
  { k: 'primary', w: W, p: euljiP, n: EULJI, sp: 1, approx: 1, why: 'Eulji-ro along the enlarged plaza\'s east side, then east to Namdaemun-ro: moved out with the plaza, back on its real line by Namdaemun-ro' },
];
// The lane behind the new hall and up through the gap in Cheonggyecheon's blocks to Cheonggyecheon-ro.
const cgr = gb.roads.find((r) => r.n?.en === 'Cheonggyecheon-ro');
const hallN = Math.min(...hallOut.map((p) => p[1])), hallE = Math.max(...hallOut.map((p) => p[0]));
const cgB = gb.buildings.filter((b) => b.cg && b.p.some(([x, z]) => x > 10 && x < 100 && z > 210 && z < hallN));
const gapX = (() => { // the gap between the first two blocks south of the stream (where the real Mugyo-ro runs)
  const xs = cgB.map((b) => [Math.min(...b.p.map((p) => p[0])), Math.max(...b.p.map((p) => p[0]))]).sort((a, b) => a[0] - b[0]);
  return r1((xs[0][1] + xs[1][0]) / 2);
})();
const laneZ = r1(hallN - 0.6 - CH.lane / 2), laneE = r1(hallE + 1.2 + 2.5);
const cgZ = lineAt(cgr.p, gapX);
ROADS.push({ k: 'walk', w: CH.lane, p: [[kerbX - 1, laneZ], [gapX, laneZ], [laneE, laneZ], [laneE, r1(euljiP[3][1])]], sp: 1, approx: 1, why: 'a lane behind and beside the new hall (made up: the hall at 37.5% stands on the real Sejong-daero 20-gil and Mugyo-ro)' });
ROADS.push({ k: 'walk', w: CH.lane, p: [[gapX, laneZ], [gapX, r1(cgZ)]], n: MUGYO, sp: 1, approx: 1, why: 'Mugyo-ro between Cheonggyecheon\'s blocks, as a lane (a street in real life), ' + r1(Math.abs(gapX - lineAt(byId(469260694).pts.map(local).map(([x, z]) => [z, x]), 225))) + ' m from its real line' });

// ---------- The ground ----------
// The paving: the plaza, the walks round the old and the new hall, the square between them, and under both halls.
const pavedReal = [344644130, 768397718, 768397720, 768397716, 768397717, 768397714, 768397715, 768397719, 198561926, 198561929].map((id) => ring(G(byId(id))));
let site = biggest(polygonClipping.union(...pavedReal));
// (small gaps between OSM's pieces: close them with a 1 m skin)
{
  const skin = [];
  for (const [Rg] of pavedReal) for (let i = 1; i < Rg.length; i++) skin.push(...band([Rg[i - 1], Rg[i]], 1));
  site = biggest(polygonClipping.union([site], ...skin));
}
const roadBands = ROADS.filter((r) => r.k !== 'walk').flatMap((r) => band(r.p, r.w / 2 + 0.1));
site = biggest(polygonClipping.difference([[site[0]]], ...roadBands, [[[-50, 0], [kerbX + 0.1, 0], [kerbX + 0.1, 400], [-50, 400], [-50, 0]]]));
const simplify = (P, tol) => { // Douglas-Peucker on a ring (the skin above leaves small teeth)
  const dp = (Q) => { if (Q.length < 3) return Q; let best = 0, k = 0; for (let i = 1; i < Q.length - 1; i++) { const d = segDist(Q[i][0], Q[i][1], Q[0], Q.at(-1)); if (d > best) { best = d; k = i; } } return best > tol ? [...dp(Q.slice(0, k + 1)).slice(0, -1), ...dp(Q.slice(k))] : [Q[0], Q.at(-1)]; };
  const far = P.reduce((m, q, i) => (Math.hypot(q[0] - P[0][0], q[1] - P[0][1]) > Math.hypot(P[m][0] - P[0][0], P[m][1] - P[0][1]) ? i : m), 0);
  return [...dp(P.slice(0, far + 1)).slice(0, -1), ...dp([...P.slice(far), P[0]]).slice(0, -1)];
};
const paving = simplify(open(site[0]), 0.7);
// Trees: OSM's three patches (beside the new hall, in front of it either side of the square), cut back from the buildings.
const solidRings = [ring(hallOut), ring(libOut)];
const trees = [768397714, 768397715, 768397719].flatMap((id) => polygonClipping.difference(polygonClipping.intersection(ring(G(byId(id))), [[...paving, paving[0]]]), ...solidRings.map((s) => [band(s[0], 1).flat(), s].flat()))).filter((p) => area(open(p[0])) > 12).map((p) => open(p[0]));

// ---------- The two halls ----------
const frame = (P) => { const [cx, cz] = centre(P); return { cx, cz, out: P.map(([x, z]) => [r2(x - cx), r2(z - cz)]) }; };
const H = (m) => r2(m * CH.UP);
// The new hall (2012): glass, its south face swelling out over the old hall like a wave.
const hf = frame(hallOut);
const newHall = {
  type: 'cityhall', x: r1(hf.cx), z: r1(hf.cz), ry: 0, sp: 1, clear: 0,
  outline: hf.out, h: H(CH.hallH),
  name: N('서울특별시청', 'Seoul City Hall', 'ソウル特別市庁', '首尔市政府'),
  why: `the glass new hall at 37.5% (footprint OSM way 198561926 × ${CH.S}); height ${CH.hallH} m real is an estimate (OSM: 12 levels)`,
};
// The old hall (1926), now Seoul Metropolitan Library: stone, a clock tower with a green dome.
const lf = frame(libOut);
const part = (id) => { const P = G(byId(id)).map(([x, z]) => [x - lf.cx, z - lf.cz]), xs = P.map((p) => p[0]), zs = P.map((p) => p[1]); return [r2((Math.min(...xs) + Math.max(...xs)) / 2), r2((Math.min(...zs) + Math.max(...zs)) / 2), r2(Math.max(...xs) - Math.min(...xs)), r2(Math.max(...zs) - Math.min(...zs))]; };
const oldHall = {
  type: 'oldcityhall', x: r1(lf.cx), z: r1(lf.cz), ry: 0, sp: 1, clear: 0,
  outline: lf.out, h: H(byId(1203368741).height), // the body: OSM's 22 m
  tower: [...part(1203368740), H(byId(1203368740).height)], // u, v, w, d, top of its walls (OSM's 30 m; the dome and lantern go on top)
  colour: byId(1203368741).colour,
  name: N('서울도서관 (옛 시청)', 'Seoul Metropolitan Library (old City Hall)', 'ソウル図書館 (旧市庁舎)', '首尔图书馆 (旧市政厅)'),
  why: `the 1926 stone hall (now Seoul Metropolitan Library) at 37.5% (footprint OSM way 198561929 × ${CH.S}; heights OSM's 22 m and 30 m)`,
};
const hallFoot = hallOut.map(([x, z]) => [r1(x), r1(z)]), libFoot = libOut.map(([x, z]) => [r1(x), r1(z)]);

// ---------- Across Sejong-daero: Daehanmun and the palace wall ----------
const gateReal = centre(unclose(byId(377289797).pts.map(local)));
const gw = CH.gate.w * CH.gate.s, gd = CH.gate.d * CH.gate.s;
const wallX = r1(SX - CH.sejongW / 2 - CH.wallBack);
const gate = { type: 'palacegate', x: r1(wallX - gd / 2 + 0.7), z: r1(gateReal[1]), ry: Math.PI / 2, ...CH.gate, sp: 1, name: { ko: '대한문', en: 'Daehanmun', ja: '大漢門', zh: '大汉门', han: '大漢門' }, why: `Deoksugung's main gate at 50% like the other palace gates, ${r1(Math.hypot(wallX - gd / 2 + 0.7 - gateReal[0], 0))} m from its real spot (behind the pavement of the game's wider Sejong-daero)` };
const wallReal = byId(381941854).pts.map(local); // the wall north of the gate, along Sejong-daero
const wallN = Math.min(...wallReal.map((p) => p[1]));
// The wall goes all the way round on OSM's outline (way 26658458) so nobody walks in behind the gate: the palace
// is not built, only trees stand inside. On the west it shuts against the plain block that already stands there.
const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const palace = unclose(byId(26658458).pts.map(local));
const near = (q) => palace.reduce((b, p, i) => (Math.hypot(p[0] - q[0], p[1] - q[1]) < Math.hypot(palace[b][0] - q[0], palace[b][1] - q[1]) ? i : b), 0);
const chain = (i, j, step) => { const out = []; for (let k = i; ; k = (k + step + palace.length) % palace.length) { out.push(palace[k]); if (k === j) break; } return out; };
const thin = (P, tol) => P.filter((p, i) => i === 0 || i === P.length - 1 || Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) > tol);
const block = gb.buildings.find((bd) => !bd.sp && bd.p.some(([x, z]) => inPoly(palace, x, z))); // the plain block on the palace's west part
const bx1 = Math.max(...block.p.map((p) => p[0])), bz1 = Math.max(...block.p.map((p) => p[1]));
const northReal = thin(chain(near([wallX, wallN]), near([bx1, wallN - 11]), 1), 3).filter(([x]) => x < wallX - 4 && x > bx1); // west from Sejong-daero
const southReal = thin(chain(near([-26, gate.z + 2]), near([bx1 - 16, bz1 + 3]), -1), 3); // west along Deoksugung-gil, round the corner
const wallNorth = { type: 'wall', h: CH.wallH, p: [[r1(bx1 - 0.5), r1(northReal.at(-1)[1])], ...northReal.reverse().map(([x, z]) => [r1(x), r1(z)]), [wallX, r1(wallN)], [wallX, r1(gate.z - gw / 2 - 1.2)]], sp: 1, why: 'Deoksugung\'s wall on OSM\'s line (ways 26658458, 381941854): along Sejong-daero behind the pavement and west along the palace\'s north side, shut against the plain block on the west' };
const wallSouth = { type: 'wall', h: CH.wallH, p: [[wallX, r1(gate.z + gw / 2 + 1.2)], [wallX, r1(gate.z + gw / 2 + 3.4)], southReal[0].map(r1)], sp: 1, approx: 1, why: 'Deoksugung\'s wall south of Daehanmun back to its real line (the gate is 50%, so the wall starts further south than it really does)' };
const wallWest = { type: 'wall', h: CH.wallH, p: [...southReal.map(([x, z]) => [r1(x), r1(z)]), [r1(southReal.at(-1)[0]), r1(bz1 - 0.5)]], sp: 1, why: 'Deoksugung\'s wall along Deoksugung-gil (the stone wall road) on OSM\'s line (way 381941848), shut against the plain block' };
const wallTrees = { type: 'blossoms', seasonal: true, gap: 6, sp: 1, why: 'the palace\'s trees over the wall', p: [[r1(wallX - 3.5), r1(wallN + 3)], [r1(wallX - 3.5), r1(gate.z - gw / 2 - 4)]] };
const inPalace = [...wallNorth.p.slice(0, -1), [wallX, r1(gate.z + gw / 2 + 3.4)], ...wallWest.p, [r1(bx1), r1(bz1)]]; // the ground inside the wall
const WALLS = [wallNorth, wallSouth, wallWest];

// ---------- Write ----------
gb.roads.push(...ROADS.map((r) => ({ ...r, p: r.p.map(([x, z]) => [r1(x), r1(z)]) })));
gb.areas.push({ k: 'plaza', p: paving, sp: 1, why: 'Seoul Plaza\'s paving and the walks round the old and the new hall (OSM ways 344644130, 768397716-20) at 37.5%, cut back from the roads' });
gb.areas.push({ k: 'grass', p: lawn, sp: 1, lawn: 1, oval: 1, why: 'Seoul Plaza\'s oval lawn (OSM way 370019676) at 37.5%; a picnic lawn (lawn: mats and frisbee, main.js streetLawns; oval: inside its outline)' });
for (const p of trees) gb.areas.push({ k: 'park', p, trees: true, sp: 1, why: 'trees beside the halls (OSM landuse=forest patches) at 37.5%' });
gb.areas.push({ k: 'stone', p: [[r1(wallX + 0.7), r1(wallN)], [1, r1(wallN)], [1, r1(gate.z + gw / 2 + 5)], [r1(wallX + 0.7), r1(gate.z + gw / 2 + 5)]], sp: 1, approx: 1, why: 'the pavement in front of Daehanmun and the wall' });
gb.landmarks.push(newHall, oldHall, gate, ...WALLS, wallTrees);
gb.areas.push({ k: 'park', p: inPalace, trees: true, sp: 1, approx: 1, why: 'inside Deoksugung\'s wall: trees only (the palace is not built, and nobody can get in)' });
const lawnS = lawn.reduce((a, b) => (b[1] > a[1] ? b : a));
gb.landmarks.push({ type: 'sign', x: r1(lawnS[0] - 9), z: r1(lawnS[1] + 3.5), ry: 0, sp: 1,
  title: N('서울광장', 'Seoul Plaza', 'ソウル広場', '首尔广场'),
  text: N('시청 앞 타원형 잔디 광장이에요. 2002년 월드컵 거리 응원으로 유명해졌고 2004년에 잔디 광장이 됐어요. 뒤의 돌 건물은 1926년에 지은 옛 시청(지금은 서울도서관), 그 뒤 유리 건물이 2012년에 문을 연 새 시청이에요.',
    'The oval lawn in front of City Hall. It became famous for street cheering during the 2002 World Cup and was turned into a lawn in 2004. The stone building behind is the old City Hall of 1926 (now Seoul Metropolitan Library); the glass one behind it is the new City Hall, opened in 2012.',
    '市庁前の楕円形の芝生広場です。2002年ワールドカップの街頭応援で有名になり、2004年に芝生の広場になりました。後ろの石造りの建物は1926年に建てられた旧市庁舎（現在はソウル図書館）、その後ろのガラスの建物が2012年に開いた新庁舎です。',
    '市政厅前的椭圆形草坪广场。因2002年世界杯街头助威而闻名，2004年改建为草坪广场。后面的石造建筑是1926年建的旧市政厅（现为首尔图书馆），再后面的玻璃建筑是2012年启用的新市政厅。'),
});
gb.blockers.push({ p: hallFoot, sp: 1 }, { p: libFoot, sp: 1 });
// Daehanmun is shut behind (the palace is not built): the wall, the gate's back, its sides.
const seg = (a, b, t = 1.4) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; return [[-L / 2 - 0.2, -t / 2], [L / 2 + 0.2, -t / 2], [L / 2 + 0.2, t / 2], [-L / 2 - 0.2, t / 2]].map(([u, v]) => [r2(mx + u * c - v * s), r2(mz + u * s + v * c)]); };
for (const wl of WALLS) for (let i = 1; i < wl.p.length; i++) gb.blockers.push({ p: seg(wl.p[i - 1], wl.p[i]), sp: 1 });
gb.blockers.push({ p: [[r1(gate.x - gd / 2 - 1), r1(gate.z - gw / 2 - 1.4)], [r1(gate.x - gd / 2 + 0.6), r1(gate.z - gw / 2 - 1.4)], [r1(gate.x - gd / 2 + 0.6), r1(gate.z + gw / 2 + 1.4)], [r1(gate.x - gd / 2 - 1), r1(gate.z + gw / 2 + 1.4)]], sp: 1 }); // (the gate's back: shut)
for (const s of [-1, 1]) gb.blockers.push({ p: seg([gate.x - gd / 2, gate.z + s * (gw / 2 + 0.6)], [wallX, gate.z + s * (gw / 2 + 0.6)], 1.2), sp: 1 });
gb.pois.push({ kind: 'landmark', x: r1(lawnAt[0]), z: r1(lawnAt[1]), name: N('서울광장', 'Seoul Plaza', 'ソウル広場', '首尔广场'), sp: 1 });
gb.pois.push({ kind: 'landmark', x: newHall.x, z: r1(Math.max(...hallFoot.map((p) => p[1])) + 2), name: newHall.name, sp: 1 });
gb.pois.push({ kind: 'landmark', x: oldHall.x, z: r1(Math.max(...libFoot.map((p) => p[1])) + 2), name: oldHall.name, sp: 1 });
gb.pois.push({ kind: 'landmark', x: r1(wallX + 2), z: gate.z, name: N('대한문 (덕수궁)', 'Daehanmun (Deoksugung)', '大漢門 (徳寿宮)', '大汉门 (德寿宫)'), sp: 1 });

// Base roads (scripts/build-base.mjs) keep out of the place: the real Sogong-ro, Eulji-ro and Sejong-daero 20-gil cross it.
const keepOut = [[kerbX, laneZ - CH.lane / 2], [laneE + 3, laneZ - CH.lane / 2], [laneE + 3, euljiP[2][1]], [J[0] + 4, sogongZ - W / 2], [kerbX, sogongZ - W / 2]].map(([x, z]) => [r1(x), r1(z)]);
gb.meta.cityhall = {
  why: 'Seoul City Hall and Seoul Plaza, the whole place at 37.5% (Yozi 2026-11-24): scripts/build-city-hall.mjs',
  scale: CH.S, real: CH.real, game: CH.game,
  lawn: { real: lawnReal.map(r1), at: lawnAt.map(r1), size: [r1(Math.max(...lawn.map((p) => p[0])) - Math.min(...lawn.map((p) => p[0]))), r1(Math.max(...lawn.map((p) => p[1])) - Math.min(...lawn.map((p) => p[1])))] },
  moved: {
    lawn: r1(Math.hypot(lawnAt[0] - lawnReal[0], lawnAt[1] - lawnReal[1])),
    'new hall': r1(Math.hypot(...centre(hallOut).map((v, i) => v - centre(unclose(byId(198561926).pts.map(local)))[i]))),
    'old hall': r1(Math.hypot(...centre(libOut).map((v, i) => v - centre(unclose(byId(198561929).pts.map(local)))[i]))),
    'sogong-ro': r1(sogongZ - lineAt(byId(198564935).pts.map(local).sort((a, b) => a[0] - b[0]), 30)),
    'eulji-ro at namdaemun-ro': r1(Math.hypot(NAMDAEMUN_END[0] - eastEnd[0], NAMDAEMUN_END[1] - eastEnd[1])),
    daehanmun: r1(Math.hypot(gate.x - gateReal[0], gate.z - gateReal[1])),
  },
  noBase: [keepOut],
  approx: ['Sogong-ro and Eulji-ro round the enlarged plaza (off their real lines: meta.cityhall.moved)', 'the lane behind the new hall and Mugyo-ro as a lane', 'the new hall\'s height (56 m real: an estimate)', 'Deoksugung is its wall and Daehanmun only: trees inside, the palace is not built; the wall just south of the gate is off its real line'],
};
const STRIP_WHY = 'Seoul City Hall and Seoul Plaza';
const mine = (k) => gb[k].filter((it) => it.sp);
gb.meta.parts = [
  ...gb.meta.parts.filter((p) => p.why !== STRIP_WHY),
  ...strips({ buildings: [...mine('blockers')], roads: [], areas: mine('areas') }, 25, STRIP_WHY),
];
const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
writeFileSync(FILE, pretty(gb) + '\n');
console.log('lawn', gb.meta.cityhall.lawn, '| moved (m):', JSON.stringify(gb.meta.cityhall.moved), '| paving pts', paving.length, '| trees', trees.length, '| sogong z', sogongZ, '| J', J, '| lane z', laneZ, 'gap x', gapX);

// ---------- A plan on the real map (OSM at 1/4) ----------
const si = process.argv.indexOf('--svg');
if (si > 0) {
  const X0 = -90, Z0 = 190, X1 = 140, Z1 = 350, K = 6, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${(X1 - X0) * K}" height="${(Z1 - Z0) * K + 64}" font-family="sans-serif"><rect width="100%" height="100%" fill="#f4f1ea"/>`;
  const base = JSON.parse(readFileSync(path.join(R, 'base.json'), 'utf8')).roads;
  for (const r of base) s += `<polyline points="${r.p.map(([x, z]) => [x - OX, z - OZ]).map(P).join(' ')}" fill="none" stroke="#b9b2a4" stroke-width="${r.w * K}" stroke-opacity="0.5"/>`;
  s += `<polygon points="${paving.map(P).join(' ')}" fill="#e8dfc6"/>`;
  for (const t of trees) s += `<polygon points="${t.map(P).join(' ')}" fill="#9cc98a"/>`;
  s += `<polygon points="${lawn.map(P).join(' ')}" fill="#86cf6a"/>`;
  for (const r of gb.roads) s += `<polyline points="${r.p.map(P).join(' ')}" fill="none" stroke="${r.sp ? (r.approx ? '#e0a040' : '#555') : '#999'}" stroke-width="${(r.w || 6) * K}" stroke-opacity="0.55"/>`;
  for (const r of region.links || []) s += `<polyline points="${r.p.map(([x, z]) => [x - OX, z - OZ]).map(P).join(' ')}" fill="none" stroke="#999" stroke-width="${r.w * K}" stroke-opacity="0.55"/>`;
  s += `<polygon points="${inPalace.map(P).join(' ')}" fill="#b9dba9"/>`;
  for (const b of gb.buildings) s += `<polygon points="${b.p.map(P).join(' ')}" fill="#8b8b8b"/>`;
  s += `<polygon points="${libFoot.map(P).join(' ')}" fill="#c4b598" stroke="#6b6250"/>`;
  s += `<polygon points="${hallFoot.map(P).join(' ')}" fill="#6fb3c9" stroke="#2f6f86"/>`;
  for (const w of WALLS) s += `<polyline points="${w.p.map(P).join(' ')}" fill="none" stroke="${w.approx ? '#e0a040' : '#7a6a50'}" stroke-width="5"/>`;
  s += `<rect x="${(gate.x - gd / 2 - X0) * K}" y="${(gate.z - gw / 2 - Z0) * K}" width="${gd * K}" height="${gw * K}" fill="#a8392b"/>`;
  for (const st of (region.subway?.stations || []).filter((q) => q.id === 'city-hall-station')) for (const e of st.exits) s += `<circle cx="${(e.at[0] - OX - X0) * K}" cy="${(e.at[1] - OZ - Z0) * K}" r="7" fill="#0052a4"/><text x="${(e.at[0] - OX - X0) * K + 9}" y="${(e.at[1] - OZ - Z0) * K + 4}" font-size="13" fill="#0052a4">${e.n}</text>`;
  // the real map on top, in red (OSM at 1/4)
  for (const e of osm.elements) {
    const q = e.pts.map(local);
    if (e.kind === 'exit') { s += `<circle cx="${(q[0][0] - X0) * K}" cy="${(q[0][1] - Z0) * K}" r="3" fill="#d1403a"/>`; continue; }
    if (['hall-roof', 'library-part', 'library-tower', 'paving', 'trees', 'square', 'grass', 'daehanmun-yard', 'plaza-hotel', 'press-center', 'architecture-hall', 'council'].includes(e.kind)) continue;
    s += `<poly${e.kind === 'road' || e.kind === 'deoksugung-wall' ? 'line' : 'gon'} points="${q.map(P).join(' ')}" fill="none" stroke="#d1403a" stroke-width="${e.kind === 'road' ? 1.5 : 2}"${e.kind === 'plaza' ? ' stroke-dasharray="5 4"' : ''}/>`;
  }
  const Y = (Z1 - Z0) * K;
  s += `<text x="10" y="${Y + 24}" font-size="16">red = real (OSM at 1/4) · grey roads = game, on real lines · orange = moved or made up · brown = palace wall · the place is 37.5% (1.5 × the red)</text>`;
  s += `<text x="10" y="${Y + 48}" font-size="16">off the real spot (m): ${Object.entries(gb.meta.cityhall.moved).map(([k, v]) => `${k} ${v}`).join(', ')}</text>`;
  writeFileSync(process.argv[si + 1], s + '</svg>');
}
