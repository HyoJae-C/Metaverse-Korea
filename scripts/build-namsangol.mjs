#!/usr/bin/env node
// Namsangol Hanok Village (남산골 한옥마을, Pil-dong) in the Euljiro district
// (public/regions/another-seoul/districts/euljiro.json, a part of its own):
// the whole park on its real ground at 1/4, from the gate on Toegye-ro 34-gil
// south to the Time Capsule Plaza, between the stream on the west and the
// east wall (Yozi, 2026-11-24: redrawn from OSM; it was a 104 x 55 m box at
// game size with five invented hanok round a yard).
//
// Real lines (scripts/data/namsangol-osm.json: © OpenStreetMap contributors,
// ODbL, from the 2026-11-14 national extract; world metres through
// src/core/seoul-grid.js toGame): the main gate, Cheonugak, the stream,
// Gwaneoji and its pavilion, Cheongnyujeong, Pigeumjeong, the Time Capsule
// Plaza's ring, Mangbungnu, the folk games ground and the five houses' places.
//
// Not at 1/4, and why (rule 1: small houses keep game size):
//   - The five hanok are 5-8 m across in the game; at 1/4 they would be
//     3-7 m, smaller than a shop. Each stands within HOUSE_TOL of its real
//     middle, so the hanok quarter is about 2 m wider than the real one.
//   - Seoul Namsan Gugakdang is one hanok hall (the real one is a ring of
//     halls round a sunken yard), on its real place.
//   - The folk games yard is 24 x 14 m round the real folk games ground
//     (9 x 9 m at 1/4): four games need the room (src/data/folk-yard.js).
// Invented or estimated (marked approx: 1, listed in APPROX below):
//   - Cheonghakji, the pond north of Cheonugak: not in OSM; from Yozi's
//     Naver and Google captures (/mnt/project-files/namsangol/ref/).
//   - The outer wall is straightened: the real fence wanders up to 4 m.
//   - The paths: the real ones wind; these keep their order and ends.
//   - The woods' outlines.
//
// What this adds is marked "ng": 1, so running it again replaces it.
//
//   node scripts/build-namsangol.mjs
//
// Run it after scripts/build-euljiro.mjs (which rewrites the district), then
// scripts/build-closed.mjs so the land round it opens and closes.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { FOLK_GAMES_ON, folkBlockers } from '../src/data/folk-yard.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'namsangol-osm.json'), 'utf8'));
const EUL = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'euljiro-osm.json'), 'utf8'));
const file = path.join(R, 'districts', 'euljiro.json');
const [OX, OZ] = region.districts.find((d) => d.id === 'euljiro').offset;

const r1 = (v) => Math.round(v * 10) / 10 + 0;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const G = ([lat, lon]) => { const g = toGame(lat, lon); return Array.isArray(g) ? g : [g.x, g.z]; };
const mid = (p) => [p.reduce((m, q) => m + q[0], 0) / p.length, p.reduce((m, q) => m + q[1], 0) / p.length];
const real = (name) => { const w = OSM.ways.find((x) => x.name === name); if (!w) throw new Error(name + ': not in namsangol-osm.json'); return w.g.map(G); };
const realMid = (name) => { const p = real(name); return mid(p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1] ? p.slice(0, -1) : p); };
const circle = (cx, cz, rx, rz, n = 16) => Array.from({ length: n }, (_, i) => [r1(cx + Math.cos((i / n) * Math.PI * 2) * rx), r1(cz + Math.sin((i / n) * Math.PI * 2) * rz)]);

// ---------- The ground (world metres) ----------
// The real park at 1/4 is x -1390..-1332, z -425..-337 (58 x 88 m); the
// hanok quarter's east wall stands 6 m in from the rest.
export const SITE = { w: -1390, e: -1332, n: -425, s: -337, notch: [-1338, -392] };
const GATE = realMid('gate'); // the main gate on Toegye-ro 34-gil
export const NAMSANGOL = {
  gate: [r1(GATE[0]), SITE.n],
  // The hanok: [name (ko, for the notes only), real middle or null, box]. The
  // two the map gives no name stand where its unnamed houses are.
  houses: [
    ['제기동 해풍부원군 윤택영 재실', realMid('제기동 해풍부원군 윤택영 재실'), [-1348, -419.5, -1340.5, -414.5]],
    ['관훈동 민씨 가옥', realMid('관훈동 민씨 가옥'), [-1348, -409.5, -1340.5, -404.5]],
    ['삼청동 오위장 김춘영 가옥', realMid('삼청동 오위장 김춘영 가옥'), [-1347, -398.5, -1341, -393.5]],
    ['(west house)', realMid('house-west'), [-1358, -413, -1353, -405]],
    ['(north house)', realMid('house-north'), [-1358, -423.5, -1350.5, -419.5]],
  ],
  hall: [-1375, -391, -1366, -382.5], // Seoul Namsan Gugakdang
  plaza: [-1381, -413, -1359, -396], // Cheonugak's plaza
  quarter: [-1359, -424, -1339, -391], // the hanok quarter's yard
  yard: [-1358, -390, -1334, -376], // the folk games yard
};
export const HOUSE_TOL = 3; // metres: a house's middle from its real one

const wallLine = [[NAMSANGOL.gate[0] + 3, SITE.n], [SITE.notch[0], SITE.n], SITE.notch, [SITE.e, SITE.notch[1]], [SITE.e, SITE.s], [SITE.w, SITE.s], [SITE.w, SITE.n], [NAMSANGOL.gate[0] - 3, SITE.n]];
const inside = [[SITE.w + 1, SITE.n + 1], [SITE.notch[0] - 1, SITE.n + 1], [SITE.notch[0] - 1, SITE.notch[1] + 1], [SITE.e - 1, SITE.notch[1] + 1], [SITE.e - 1, SITE.s - 1], [SITE.w + 1, SITE.s - 1]];

// Toegye-ro at the gate's x: the walk up to it is Toegye-ro 34-gil's real line.
const toegye = EUL.roads.find((r) => r.en === 'Toegye-ro').p;
const gx = NAMSANGOL.gate[0];
const toegyeZ = toegye.reduce((best, _, i, p) => {
  if (!i) return best; const [a, b] = [p[i - 1], p[i]];
  return (a[0] - gx) * (b[0] - gx) <= 0 ? r1(a[1] + ((b[1] - a[1]) * (gx - a[0])) / (b[0] - a[0])) : best;
}, null);

// The stream down the west side: a ribbon along its real line.
const STREAM_W = 1.4;
const streamLine = real('stream').filter((_, i, p) => i % 3 === 0 || i === p.length - 1).map(([x, z]) => [r1(x), r1(z)]);
function ribbon(line, w) {
  const side = (s) => line.map((q, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [r1(q[0] - ((b[1] - a[1]) / len) * (w / 2) * s), r1(q[1] + ((b[0] - a[0]) / len) * (w / 2) * s)];
  });
  return [...side(1), ...side(-1).reverse()];
}
const stream = ribbon(streamLine, STREAM_W);
const gwaneoji = real('관어지').slice(0, -1).map(([x, z]) => [r1(x), r1(z)]);
const capsule = realMid('embankment'); // the Time Capsule Plaza's ring
const CAPSULE_R = 4.5; // (its real ring is 9 m across at 1/4)
const cheonghakji = circle(-1367, -418, 6, 3.1, 14); // approx
const games = realMid('games');

// The pavilions: [name, real middle, size, kind]. On their real places.
const PAVILIONS = [
  ['천우각', realMid('남산골한옥마을 천우각'), 5.5, 'square'],
  ['청류정', realMid('남산골한옥마을 청류정'), 2.3, 'square'],
  ['관어정', realMid('관어정'), 2.2, 'square'],
  ['피금정', realMid('피금정'), 2, 'square'],
  ['망북루', realMid('망북루'), 3.2, 'square'],
].map(([n, [x, z], s, kind]) => ({ n, x: r1(x), z: r1(z), s, kind }));

const [yx0, yz0, yx1, yz1] = NAMSANGOL.yard;
const yardAt = { x: (yx0 + yx1) / 2, z: (yz0 + yz1) / 2 };
const [px0, pz0, px1, pz1] = NAMSANGOL.plaza;

const roads = [
  { k: 'walk', w: 5, p: [[gx, toegyeZ + 8], [gx, SITE.n]], why: 'Toegye-ro 34-gil, on its real line' },
  { k: 'walk', w: 5, p: [[gx, SITE.n], [gx, pz0]] },
  // Down the west side, between the hall and the stream, to the Time Capsule Plaza.
  { k: 'walk', w: 2, p: [[-1377.8, pz1], [-1377.8, -384], [-1376.5, -380.5], [-1375, -372], [-1371, -362], [r1(capsule[0] - 4.2), r1(capsule[1] - 3.2)]], approx: 1 },
  // From the folk games yard down through the wood to the plaza.
  { k: 'walk', w: 2.5, p: [[-1349, yz1], [-1350, -366], [-1356, -359.5], [r1(capsule[0] + 3.6), r1(capsule[1] - 3.6)]], approx: 1 },
  // On to Mangbungnu at the south end.
  { k: 'walk', w: 2.5, p: [[r1(capsule[0] - 1.5), r1(capsule[1] + 4.6)], [-1367, -344.5]], approx: 1 },
];
const buildings = [
  ...NAMSANGOL.houses.map(([, , b]) => ({ h: 4, hanok: 1, p: rect(...b) })),
  { h: 6, hanok: 1, p: rect(...NAMSANGOL.hall), why: 'Seoul Namsan Gugakdang as one hall (the real one is a ring of halls round a sunken yard)' },
];
const areas = [
  // (The lawn lies over plazas and sand, so it is cut round them.)
  { k: 'grass', p: inside, holes: [rect(px0, pz0, px1, pz1), rect(NAMSANGOL.quarter[0] + 0.2, NAMSANGOL.quarter[1], NAMSANGOL.quarter[2], NAMSANGOL.quarter[3]), rect(yx0, yz0, yx1, yz1), circle(capsule[0], capsule[1], CAPSULE_R + 1, CAPSULE_R + 1)] },
  { k: 'plaza', p: rect(px0, pz0, px1, pz1), why: "Cheonugak's plaza" },
  { k: 'sand', p: rect(...NAMSANGOL.quarter), why: 'the hanok quarter (about 2 m wider than the real one: the houses are game size)' },
  { k: 'plaza', p: rect(yx0, yz0, yx1, yz1), why: 'the folk games yard, round the real folk games ground (9 x 9 m at 1/4)' },
  { k: 'stone', p: circle(capsule[0], capsule[1], CAPSULE_R + 1, CAPSULE_R + 1), why: 'Seoul Millennium Time Capsule Plaza' },
  { k: 'water', p: cheonghakji, approx: 1, why: 'Cheonghakji (approx: not in OSM; from the Naver and Google captures)' },
  { k: 'water', p: gwaneoji, why: 'Gwaneoji' },
  { k: 'water', p: stream, why: 'the stream, 1.4 m wide along its real line' },
  // The woods (outlines approx).
  { k: 'park', trees: 1, p: rect(-1368, -374, -1353, -361), approx: 1 },
  { k: 'park', trees: 1, p: rect(-1345, -373, -1334, -342), approx: 1 },
  { k: 'park', trees: 1, p: rect(-1382, -361, -1372, -341), approx: 1 },
  { k: 'park', trees: 1, p: rect(-1358, -347, -1347, -339), approx: 1 },
];
const seg = (a, b, t = 0.8) => rect(Math.min(a[0], b[0]) - t, Math.min(a[1], b[1]) - t, Math.max(a[0], b[0]) + t, Math.max(a[1], b[1]) + t);
const blockers = [
  ...wallLine.slice(1).map((q, i) => ({ p: seg(wallLine[i], q) })),
  { p: cheonghakji }, { p: gwaneoji }, { p: stream },
  ...PAVILIONS.map((v) => ({ p: rect(v.x - v.s / 2, v.z - v.s / 2, v.x + v.s / 2, v.z + v.s / 2) })),
  { p: rect(capsule[0] - 1.3, capsule[1] - 1.3, capsule[0] + 1.3, capsule[1] + 1.3) }, // the capsule's lid
];
const L = ([x, z]) => [r1(x - OX), r1(z - OZ)]; // world -> district metres
const landmarks = [
  { type: 'wall', p: wallLine.map(L), h: 2.6, approx: 1, why: 'straightened: the real fence wanders up to 4 m' },
  { type: 'hanokgate', x: r1(gx - OX), z: r1(SITE.n - OZ) },
  { type: 'jeongja', x: 0, z: 0, list: PAVILIONS.map((v) => [r1(v.x - OX), r1(v.z - OZ), 0, v.s, v.kind]) },
  { type: 'timecapsule', x: r1(capsule[0] - OX), z: r1(capsule[1] - OZ), r: CAPSULE_R },
  { type: 'folkyard', x: r1(yardAt.x - OX), z: r1(yardAt.z - OZ) }, // yutnori, tuho, jegichagi, neolttwigi
];
const P = (x, z, name) => ({ kind: 'landmark', x: r1(x - OX), z: r1(z - OZ), name });
const cheonugak = PAVILIONS[0];
const pois = [
  P((px0 + px1) / 2, pz1 - 3, N('남산골 한옥마을', 'Namsangol Hanok Village', '南山コル韓屋村', '南山谷韩屋村')),
  P(cheonugak.x, cheonugak.z, N('천우각', 'Cheonugak Pavilion', '泉雨閣', '泉雨阁')),
  P((NAMSANGOL.hall[0] + NAMSANGOL.hall[2]) / 2, (NAMSANGOL.hall[1] + NAMSANGOL.hall[3]) / 2, N('서울남산국악당', 'Seoul Namsan Gugakdang', 'ソウル南山国楽堂', '首尔南山国乐堂')),
  P(capsule[0], capsule[1], N('서울천년타임캡슐광장', 'Seoul Millennium Time Capsule Plaza', 'ソウル千年タイムカプセル広場', '首尔千年时间胶囊广场')),
];

// How far each thing is from the real one (printed, and kept in the part's note).
const off = (a, b) => r1(Math.hypot(a[0] - b[0], a[1] - b[1]));
export const DIFF = {
  gate: off(NAMSANGOL.gate, GATE),
  houses: NAMSANGOL.houses.map(([n, at, b]) => [n, off(at, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2])]),
  yard: off([yardAt.x, yardAt.z], games),
  hall: off(realMid('gugakdang'), [(NAMSANGOL.hall[0] + NAMSANGOL.hall[2]) / 2, (NAMSANGOL.hall[1] + NAMSANGOL.hall[3]) / 2]),
};
export const APPROX = ['Cheonghakji pond', 'outer wall (straightened)', 'three paths', 'four woods'];

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const district = JSON.parse(readFileSync(file, 'utf8'));
  // What was there before: this script's own things, and the old box (drawn
  // by build-euljiro.mjs until 2026-11-24, unmarked).
  const OLD = [-1421, -455, -1315, -372];
  const inOld = (p) => p.every(([x, z]) => x + OX >= OLD[0] && x + OX <= OLD[2] && z + OZ >= OLD[1] && z + OZ <= OLD[3]);
  for (const k of ['roads', 'buildings', 'areas', 'blockers']) district[k] = district[k].filter((o) => o.ng !== 1 && !inOld(o.p));
  district.landmarks = district.landmarks.filter((l) => l.ng !== 1 && !['hanokgate', 'folkyard'].includes(l.type) && !(l.type === 'wall' && inOld(l.p)));
  district.pois = district.pois.filter((o) => o.ng !== 1 && o.name?.ko !== '남산골 한옥마을');
  const mark = (o) => ({ ...o, ng: 1 });
  const local = (o) => mark({ ...o, p: o.p.map(L), ...(o.holes ? { holes: o.holes.map((h) => h.map(L)) } : {}) });
  district.roads.push(...roads.map(local));
  district.buildings.push(...buildings.map(local));
  district.areas.push(...areas.map(local));
  district.blockers.push(...blockers.map((b) => mark({ p: b.p.map(L) })));
  district.landmarks.push(...landmarks.map(mark));
  district.pois.push(...pois.map(mark));
  // The folk games' solid props, round the yard as the game places them.
  if (FOLK_GAMES_ON) district.blockers.push(...folkBlockers(district.landmarks.find((l) => l.type === 'folkyard')).map(mark));
  const PART = 'Namsangol Hanok Village';
  // Its own part, in strips 25 m deep: Itaewon's map (one box, with Namsan)
  // reaches up beside it, and the layout check compares boxes.
  const why = `${PART} and its walk up to Toegye-ro, on its real ground at 1/4 (scripts/build-namsangol.mjs). Houses at game size, each within ${HOUSE_TOL} m of its real middle; approx: ${APPROX.join(', ')}`;
  const boxes = [];
  for (let z = toegyeZ + 8; z < SITE.s + 1; z += 25) boxes.push({ why, box: [...L([SITE.w - 1, z]), ...L([SITE.e + 1, Math.min(z + 25, SITE.s + 1)])] });
  district.meta.parts = district.meta.parts.filter((p) => !p.why.startsWith(PART)).concat(boxes);
  district.meta.source = district.meta.source.replace('DDP and Namsangol at game size', 'DDP at game size').replace(/ Namsangol Hanok Village: scripts\/build-namsangol\.mjs.*?\(ODbL\)\./, '')
    + ' Namsangol Hanok Village: scripts/build-namsangol.mjs, from scripts/data/namsangol-osm.json (ODbL).';
  writeFileSync(file, JSON.stringify(district, null, 1) + '\n');
  console.log(`namsangol: gate [${NAMSANGOL.gate}] ${DIFF.gate} m from the real one; yard [${yardAt.x}, ${yardAt.z}] ${DIFF.yard} m from the real folk games ground; hall ${DIFF.hall} m`);
  for (const [n, d] of DIFF.houses) console.log(`  ${n}: ${d} m from its real middle`);
  for (const v of PAVILIONS) console.log(`  ${v.n}: [${v.x}, ${v.z}] (real)`);
}
