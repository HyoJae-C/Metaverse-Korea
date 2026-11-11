#!/usr/bin/env node
// Builds Cheonggyecheon and the strip along it, on the stream's real line at
// 1/4 (scripts/cheonggyecheon-line.mjs, from OpenStreetMap), into the
// Gyeongbokgung map (districts/gyeongbokgung.json):
//
//   - the stream (core/stream.js), bending along its real centre line from
//     its source at Cheonggye Plaza to just past Hwanghakgyo, with its 16
//     bridges at their real spots (all within 4 m but Mojeongyo, nudged 8 m
//     off the stairs at the falls), stairs down between them, stepping stones,
//     the heron and the lantern festival;
//   - Cheonggyecheon-ro either side (game distance from the water: the
//     channel is game size), a walk over each bridge, Cheonggye Plaza between
//     Sejong-daero and the falls, and Sejong-daero from Jongno to the plaza on
//     its real line;
//   - one row of buildings along the north road, and along the south road
//     west of Changgyeonggung-ro (east of it is Euljiro's: build-euljiro.mjs).
//     Office towers at the west end, lower buildings east of Sewoon.
//
// Everything it writes carries "cg": 1 (and replaces what has it), so the
// rest of the Gyeongbokgung map (the palace, the square) is left alone and
// the strip stays put in the world when the district's offset changes.
//
//   node scripts/build-euljiro.mjs && node scripts/build-cheonggyecheon.mjs
//
// (Euljiro first: the rows here keep off its streets.)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadRegionMap } from '../src/core/districts.js';
import { STAIR } from '../src/core/stream.js';
import { r1, town, nearestOn, strips } from './street-rows.mjs';
import { HEUNG } from './build-euljiro.mjs';
import { CG, STREAM, F, LEN, at, ROAD, WEST, U_EAST, NORTH, SOUTH, BRIDGES, zAt, alongside } from './cheonggyecheon-line.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const FILE = path.join(R, 'districts', 'gyeongbokgung.json');
const gb = JSON.parse(readFileSync(FILE, 'utf8'));
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

// ---------- What this script owns in the Gyeongbokgung map ----------
// "cg": 1, or (the first time) the hand-made strip it replaces: everything
// south of Jongno (local z 146) east of Sejong-daero, and Sejong-daero there.
const south = (p) => p.every(([, z]) => z >= 146);
const ours = {
  roads: (r) => r.cg || (south(r.p) && (['Cheonggyecheon-ro', 'Cheonggye Plaza', 'Sejong-daero', 'Sejong-ro side street'].includes(r.n?.en) || /Bridge/.test(r.n?.en || ''))),
  buildings: (b) => b.cg || b.p.every(([x, z]) => x >= 50 && z >= 160 && z <= 300),
  areas: (a) => a.cg || (a.k === 'water' && a.sunk) || (a.k === 'plaza' && a.p.every(([x, z]) => x >= 45 && z >= 200 && z <= 250)),
  pois: (p) => p.cg || ['Cheonggye Plaza', 'Cheonggyecheon Stream'].includes(p.name?.en),
};
const nameOf = (en) => gb.roads.find((r) => r.n?.en === en)?.n;

// ---------- The streets (world metres) ----------
const roads = [];
const SEJONG = CG.places['Sejong-daero (south of Jongno)'];
const JONGNO_Z = 146 + oz; // Jong-ro, the Gyeongbokgung map's own
roads.push({ k: 'primary', w: 16, p: [[SEJONG.x, JONGNO_Z], [SEJONG.x, -615]], n: nameOf('Sejong-daero'), note: 'Sejong-daero from Jongno south past Cheonggye Plaza, on its real line (the link goes on to Sungnyemun).' });
const CGRO = nameOf('Cheonggyecheon-ro');
roads.push({ k: 'tertiary', w: ROAD.w, p: NORTH, n: CGRO }, { k: 'tertiary', w: ROAD.w, p: SOUTH, n: CGRO });
roads.push({ k: 'tertiary', w: ROAD.w, p: [at(U_EAST, -ROAD.off), at(U_EAST, ROAD.off)], n: CGRO }); // across, past the east end
// The Sejong-ro side street from Jongno down to the north road.
roads.push({ k: 'tertiary', w: 9, p: [[-1541, JONGNO_Z], [-1541, zAt(NORTH, -1541)]], n: nameOf('Sejong-ro side street') });
// A walk over each bridge, from road to road.
const edge = ROAD.off - ROAD.w / 2;
for (const b of BRIDGES) roads.push({ k: 'walk', w: b.w - 2, p: [at(b.u, -edge), at(b.u, edge)], n: { ko: b.name.ko, en: b.name.en } });

// Cheonggye Plaza: from Sejong-daero's east side to the falls.
let uPlaza = -10;
while (F.toWorld(uPlaza, 0)[0] > SEJONG.x + 8) uPlaza -= 0.1;
uPlaza = r1(uPlaza);
const areas = [
  { k: 'plaza', p: [at(uPlaza, -edge), at(0, -edge), at(0, edge), at(uPlaza, edge)] },
  { k: 'water', sunk: true, p: [...alongside(-4, 0, LEN), ...alongside(4, 0, LEN).reverse()] }, // (for the map: the stream draws its own)
];
roads.push({ k: 'walk', w: 10, p: [at(uPlaza, 0), at(-1, 0)], n: nameOf('Cheonggye Plaza') });
const pois = [
  { kind: 'landmark', ...xz(at(uPlaza / 2, 0)), name: N('청계광장', 'Cheonggye Plaza', '清渓広場', '清溪广场') },
  { kind: 'landmark', ...xz(at(283, 0)), name: N('청계천', 'Cheonggyecheon Stream', '清渓川', '清溪川') },
];
function xz([x, z]) { return { x, z }; }

// ---------- The stream ----------
// Between each pair of bridges ("gaps"): the clear stretch of water.
const gaps = BRIDGES.slice(0, -1).map((b, i) => {
  const c = BRIDGES[i + 1];
  return { lo: r1(b.u + b.w / 2), hi: r1(c.u - c.w / 2), between: [b.name.en, c.name.en] };
});
const mid = (g) => r1((g.lo + g.hi) / 2);
// The lantern festival: figures and strings of lanterns at the west end (the
// real festival is there), the tunnel of light between Sewoongyo and
// Baeogae, the procession mural on a straight 92 m of wall between Naraegyo
// and Ogansugyo, and the wish lantern corner between Ogansugyo and Dasangyo.
const FIG = [[0, 'carp', { v: -1, ry: 0.25, color: '#e8452c' }], [1, 'carp', { v: 1, ry: 3.4, color: '#f2a33a' }], [2, 'tiger', { ry: 1.57 }], [3, 'lotus', {}], [4, 'tiger', { ry: -1.57 }], [5, 'lotus', { ry: 2 }]];
const figures = [{ u: 10, kind: 'moon' }, ...FIG.map(([g, kind, o]) => ({ u: mid(gaps[g]), kind, ...o }))];
const strings = gaps.slice(0, 7).flatMap((g) => [r1(g.lo + 5), r1(g.hi - 5)]);
const TUNNEL_GAP = 7, MURAL_GAP = 11, WISH_GAP = 12;
const tunnel = { from: r1(gaps[TUNNEL_GAP].lo + 2), to: r1(gaps[TUNNEL_GAP].lo + 46), side: 1 };
const muralFrom = r1(mid(gaps[MURAL_GAP]) - 46);
const mural = { from: muralFrom, to: r1(muralFrom + 92), side: -1 };
const wish = { from: r1(gaps[WISH_GAP].lo + 8), to: r1(gaps[WISH_GAP].lo + 78) };
if (tunnel.to > gaps[TUNNEL_GAP].hi - 1 || mural.from < gaps[MURAL_GAP].lo + 2 || mural.to > gaps[MURAL_GAP].hi - 2) throw new Error('the festival does not fit between its bridges');
if (F.joints.some((j) => j > mural.from - 1 && j < mural.to + 1)) throw new Error('the mural would bend round a corner');
// Stepping stones in the middle of four gaps east of the festival.
const stones = [8, 9, 11, 13].map((g) => ({ u: r1(mid(gaps[g]) + (g === 13 ? 6 : 0)) }));
// Stairs: both sides at the falls, then one in each gap, sides taking turns
// (never through the mural's wall or under the tunnel), the lane clear of
// the bridges and of the channel's corners.
const LANE = STAIR.run + STAIR.landing;
const stairs = [{ u: 4, side: -1, dir: 1 }, { u: 4, side: 1, dir: 1 }];
gaps.forEach((g, i) => {
  const lo = g.lo + 1.5, hi = g.hi - 1.5;
  if (hi - lo < LANE + 1) return;
  let side = i % 2 ? 1 : -1;
  if (i === MURAL_GAP) side = 1;
  if (i === TUNNEL_GAP) side = -1;
  const dir = i % 4 < 2 ? 1 : -1;
  for (let k = 0; k <= hi - lo - LANE; k += 0.5) {
    for (const s0 of [(lo + hi - LANE) / 2 + k, (lo + hi - LANE) / 2 - k]) {
      if (s0 < lo || s0 + LANE > hi) continue;
      if (F.joints.some((j) => j > s0 - 1 && j < s0 + LANE + 1)) continue;
      stairs.push({ u: r1(dir > 0 ? s0 : s0 + LANE), side, dir });
      return;
    }
  }
});
const old = gb.streams?.[0] || {};
const stream = {
  id: 'cheonggyecheon', cg: 1,
  at: [r1(STREAM.at[0] - ox), r1(STREAM.at[1] - oz)], path: STREAM.path, len: LEN,
  w: STREAM.w, water: 8, depth: 4, falls: true,
  name: old.name || N('청계천', 'Cheonggyecheon Stream', '清渓川', '清溪川'),
  note: 'Built by scripts/build-cheonggyecheon.mjs: from the source at Cheonggye Plaza along the real centre line (within 3 m) to just past Hwanghakgyo, every bridge at its real spot. The real stream goes on about 2 km to Jungnangcheon.',
  bridges: BRIDGES.map((b) => ({ u: b.u, w: b.w, style: b.style, name: { ko: b.name.ko, en: b.name.en } })),
  stairs, stones, heron: true,
  lanterns: { figures, strings, railing: 8, bridges: true, tunnel, mural, wish },
};

// ---------- One row of buildings along each road ----------
// Kept off every street, park, plaza and building of the other districts
// and the links (the merged map, without the strip itself).
const read = async (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const merged = await loadRegionMap(region, read);
const W = (p) => p.map(([x, z]) => [x + ox, z + oz]);
const keepGb = (k, it) => !ours[k](it);
const others = (k) => [
  ...merged[k].filter((it) => it.d !== 'gyeongbokgung'),
  ...gb[k].filter((it) => keepGb(k, it)).map((it) => ({ ...it, p: W(it.p) })),
];
const near = (p) => p.some(([x, z]) => x > WEST - 60 && x < at(U_EAST)[0] + 60 && z > -900 && z < -560);
const obstacleRoads = others('roads').filter((r) => near(r.p));
const open = [...others('buildings'), ...others('areas').filter((a) => !a.sunk)].filter((o) => near(o.p)).map((o) => ({ p: o.p })).concat(areas.slice(0, 1));
const CHANGG_X = -1285; // the south row stops short of Changgyeonggung-ro
const inside = (q) => {
  const [u, v] = F.toStream(q[0], q[1]);
  if (q[0] < SEJONG.x + 9 || u > U_EAST - 6) return false;
  return (v < -ROAD.off && v > -ROAD.off - 40) || (v > ROAD.off && v < ROAD.off + 40 && q[0] < CHANGG_X);
};
const t = town(11, { inside, roads: [...roads, ...obstacleRoads], open });
const sAt = (line, x) => nearestOn([x, zAt(line, x)], line).s;
const TOWER = { depth: 20, w: [30, 46], h: [40, 110], gap: 6 };
const OFFICE = { depth: 18, w: [22, 34], h: [20, 48], gap: 5 };
const LOW = { depth: 16, w: [14, 24], h: [10, 26], gap: 2 };
// (each size, then a smaller one in the gaps it leaves at corners and side streets)
t.row('north', NORTH, -1, { off: 8, ...TOWER, to: sAt(NORTH, -1440) });
t.row('north', NORTH, -1, { off: 8, ...OFFICE, to: sAt(NORTH, -1280) });
t.row('north', NORTH, -1, { off: 8, ...LOW });
// South of the stream Eulji-ro is close (30-40 m): shallower blocks.
t.row('south', SOUTH, 1, { off: 8, ...TOWER, depth: 14, to: sAt(SOUTH, -1440) });
t.row('south', SOUTH, 1, { off: 8, ...OFFICE, depth: 13, to: sAt(SOUTH, CHANGG_X) });
t.row('south', SOUTH, 1, { off: 8, ...LOW, depth: 12, to: sAt(SOUTH, CHANGG_X) });
// Round Heunginjimun the row stays low (at most HEUNG_LOW.h m within
// HEUNG_LOW.r m of the gate): the tall blocks either side hid it, and the
// real gate stands among low buildings (Yozi, 2026-11-11).
const HEUNG_LOW = { r: 90, h: 7 };
const lowNearGate = (b) => {
  const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length, cz = b.p.reduce((s, q) => s + q[1], 0) / b.p.length;
  return Math.hypot(cx - HEUNG.x, cz - HEUNG.z) < HEUNG_LOW.r ? { ...b, h: Math.min(b.h, HEUNG_LOW.h) } : b;
};
const buildings = t.buildings.map((b) => ({ ...lowNearGate(b), cg: 1 }));

// ---------- Into the Gyeongbokgung map ----------
const L = (p) => p.map(([x, z]) => [r1(x - ox), r1(z - oz)]);
const mine = {
  roads: roads.map((r) => ({ ...r, p: L(r.p), cg: 1 })),
  buildings: buildings.map((b) => ({ ...b, p: L(b.p) })),
  areas: areas.map((a) => ({ ...a, p: L(a.p), cg: 1 })),
  pois: pois.map((p) => ({ ...p, x: r1(p.x - ox), z: r1(p.z - oz), cg: 1 })),
};
for (const k of Object.keys(mine)) gb[k] = [...gb[k].filter((it) => keepGb(k, it)), ...mine[k]];
gb.streams = [stream];
const STRIP_WHY = 'Cheonggyecheon and the streets along it';
gb.meta.parts = [
  ...gb.meta.parts.filter((p) => !/Cheonggyecheon|Hwanghakgyo/.test(p.why)),
  ...strips({ buildings: mine.buildings, roads: mine.roads.filter((r) => r.n?.en !== 'Sejong-daero'), areas: mine.areas }, 25, STRIP_WHY),
];

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // (written as scripts/build-gyeongbokgung.mjs writes it: leaf arrays on one line)
  const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
  writeFileSync(FILE, pretty(gb) + '\n');
  console.log(`cheonggyecheon: ${LEN} m along ${STREAM.path.length - 1} stretches, ${BRIDGES.length} bridges, ${stairs.length} stairs, ${buildings.length} buildings (${t.lots.north?.length || 0} north, ${t.lots.south?.length || 0} south)`);
  for (const b of BRIDGES) console.log(`  ${b.name.en}: u ${b.u}, ${b.off} m from its real spot${b.nudge ? ` (nudged ${b.nudge} m: ${b.why})` : ''}`);
  console.log(`  plaza from u ${uPlaza}; mural ${mural.from}-${mural.to}, tunnel ${tunnel.from}-${tunnel.to}, wish ${wish.from}-${wish.to}`);
  console.log(`  north road ${JSON.stringify(NORTH)}`);
  console.log(`  south road ${JSON.stringify(SOUTH)}`);
}
export { stream, buildings, roads, NORTH, SOUTH };
