#!/usr/bin/env node
// Mokdong (목동, Yangcheon-gu): Mokdong Ice Rink (목동아이스링크) in the Mokdong
// sports complex, at 1/4 on its real place (Yozi 2026-11-21). The first
// place in Yangcheon-gu.
//
//   The rink: OSM's outline at 1/4 (the hall about 17 x 25 m, the low
//     entrance building on its south side). Its footprint is a "custom"
//     building (a wall and nothing drawn); game/mokdong-site.js draws the
//     hall from the same outline when you come near. Inside is a room
//     (core/ice-rink-hall.js), bigger than 1/4 so there is room to skate.
//   The baseball stadium and the main stadium next to it: their OSM outlines
//     and fields, drawn as stands round a lawn (you can't go in).
//   Gukhoe-daero (north) and Mokdongdong-ro (past the rink's front) on their
//     OSM lines; the other big roads round the complex come from the base map.
//
// Data: scripts/data/mokdong-osm.json (© OpenStreetMap contributors, ODbL).
// Made-up things are listed in meta.approx.
//
//   node scripts/build-mokdong.mjs           writes districts/mokdong.json
//   node scripts/build-mokdong.mjs --check   prints the numbers only
// then: place-districts.mjs, build-base.mjs, build-closed.mjs, build-seoul.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame, anchorOffset } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/mokdong-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

// The district's anchor: the middle of the rink's hall.
export const ANCHOR = { place: 'Mokdong Ice Rink, the middle of the hall (Yangcheon-gu)', lat: 37.530766, lon: 126.879227, local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const way = (k) => osm.ways[k].p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);
const open = (p) => (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p);

function simplify(p, tol) { // Douglas-Peucker (open line)
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, az] = p[a], [bx, bz] = p[b], dx = bx - ax, dz = bz - az, ll = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / ll; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
const ring = (p, tol) => { // a closed ring, simplified in two halves
  const q = open(p);
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
};
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];

// --- The rink ----------------------------------------------------------------
// OSM draws the hall and the entrance building as one outline (38 corners):
// 37, 0..6 and 35, 36 are the hall, 6..35 the low building in front of it
// and the neck that joins them.
const rinkAll = open(way('rink'));
if (rinkAll.length !== 38) throw new Error('the rink outline changed: check the hall / lobby split');
const hall = [rinkAll[37], ...rinkAll.slice(0, 7), rinkAll[35], rinkAll[36]]; // from the south-west corner round by the north
const lobby = ring(rinkAll.slice(6, 36).concat([rinkAll[6]]), 0.25);
const rinkFoot = ring(rinkAll, 0.25);
// The hall's long axis (its west wall), for the door's direction.
const axis = Math.atan2(hall[1][0] - hall[0][0], -(hall[1][1] - hall[0][1])); // radians east of north
const south = [-Math.sin(axis), Math.cos(axis)]; // out of the front, in map metres
const lobbyC = centroid(lobby);
const lobbyFront = Math.max(...lobby.map(([x, z]) => (x - lobbyC[0]) * south[0] + (z - lobbyC[1]) * south[1]));
export const DOOR_OUT = 1.9; // m in front of the entrance building's wall: the ring you step on
const door = [lobbyC[0] + south[0] * (lobbyFront + DOOR_OUT), lobbyC[1] + south[1] * (lobbyFront + DOOR_OUT)];
const face = Math.atan2(south[0], south[1]); // the way you face coming out

// --- The stadiums --------------------------------------------------------------
const ballpark = ring(way('ballpark'), 0.6), ballfield = ring(way('ballfield'), 0.6);
const stadium = ring(way('stadium'), 0.6), pitch = ring(way('pitch'), 0.6);

// --- Roads -----------------------------------------------------------------------
// Gukhoe-daero: OSM has three carriageways side by side here (the road and
// the lanes down to its underpass); one road on the middle of them. The
// rink's north wall and the stadiums stay clear of it.
const gN = way('gukhoeN').reverse(), gS = way('gukhoeS').reverse(); // west to east
const at = (p, x) => { for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return null; };
export const GUKHOE_W = 12;
const gukhoe = [];
for (let x = -17; x <= 118; x += 9) { const a = at(gN, x), b = at(gS, x); if (a != null && b != null) gukhoe.push([x, a * 0.7 + b * 0.3]); } // (nearer the north lanes: off the stadiums)
const dongro = simplify(way('dongroW').concat(way('dongro').reverse().slice(1)), 0.4); // west to east, to Anyangcheon-ro
export const DONGRO_W = 8;

// The complex's ground: paving from Gukhoe-daero's kerb to Mokdongdong-ro
// and Anyangcheon-ro, round the rink and both stadiums.
const anyang = way('anyangE'); // east to west, ends where Mokdongdong-ro does
const plaza = [
  ...gukhoe.map(([x, z]) => [x, z + GUKHOE_W / 2 + 0.5]),
  ...simplify(anyang, 1).map(([x, z]) => [x, z - 8]).filter(([x]) => x < 112),
  ...dongro.slice().reverse().filter(([x]) => x > -17 && x < 20).map(([x, z]) => [x, z - DONGRO_W / 2 - 0.3]),
  [-22, at(dongro, -22) - DONGRO_W / 2 - 0.3], [-24, gukhoe[0][1] + GUKHOE_W / 2 + 1.5], // (west of the entrance building)
];
// A lawn with shrubs east of the entrance (OSM has shrubbery there).
const lawn = [[13.5, -2.5], [20, 4], [21.5, 11], [16.5, 14.5], [12.5, 9]];

// The information centre: a small made-up building on the forecourt, east of the rink's door.
export const INFO = { at: [12, 22], w: 7, d: 4.5, h: 3.4 };
const infoBox = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [INFO.at[0] + a * INFO.w / 2, INFO.at[1] + c * INFO.d / 2]);

const map = {
  meta: {
    district: 'mokdong',
    source: 'scripts/build-mokdong.mjs, at 1/4 on the real place: the outlines of Mokdong Ice Rink, the baseball stadium and the main stadium, Gukhoe-daero and Mokdongdong-ro from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/mokdong-osm.json). Inside the rink is a game room, bigger than 1/4.',
    approx: [
      { what: 'Gukhoe-daero as one road', why: 'OSM has three carriageways here (the road and its underpass lanes); drawn as one 12 m road between them, nearer the north ones, clear of the stadiums.' },
      { what: 'the paved ground of the complex', why: 'From Gukhoe-daero to Mokdongdong-ro and Anyangcheon-ro, drawn as one plaza; the real car parks and paths are left out.' },
      { what: 'the lawn east of the entrance', why: 'OSM has shrubs there; drawn as one small lawn.' },
      { what: 'Mokdong Information Center', why: 'A made-up small building on the forecourt (the district needs one); nothing stands there in OSM.' },
      { what: 'the stadiums', why: 'Outlines and fields are OSM; the stands are a plain ring, and you cannot go in.' },
    ],
  },
  roads: [
    { k: 'primary', w: GUKHOE_W, p: R1(gukhoe), n: { ko: '국회대로', en: 'Gukhoe-daero', ja: '国会大路', zh: '国会大路' } },
    { k: 'tertiary', w: DONGRO_W, p: R1(dongro), n: { ko: '목동동로', en: 'Mokdongdong-ro', ja: '木洞東路', zh: '木洞东路' } },
  ],
  buildings: [
    { h: 7, p: R1(rinkFoot), n: { ko: '목동아이스링크', en: 'Mokdong Ice Rink' }, custom: true },
    { h: 5, p: R1(ballpark), n: { ko: '목동야구장', en: 'Mokdong Baseball Stadium' }, custom: true },
    { h: 5, p: R1(stadium), n: { ko: '목동주경기장', en: 'Mokdong Main Stadium' }, custom: true },
    { h: INFO.h, p: R1(infoBox), n: 'info' },
  ],
  areas: [
    { k: 'plaza', p: R1(plaza), n: { ko: '목동종합운동장', en: 'Mokdong Sports Complex' } },
    { k: 'grass', p: lawn },
  ],
  blockers: [],
  pois: [
    { kind: 'landmark', x: 0, z: -10, name: { ko: '목동아이스링크', en: 'Mokdong Ice Rink', ja: '木洞アイスリンク', zh: '木洞滑冰场' } },
  ],
  landmarks: [
    {
      type: 'mokdongrink', x: 0, z: 0, axis: Math.round(axis * 1000) / 1000,
      hall: R1(hall), lobby: R1(lobby), door: R1([door])[0], face: Math.round(face * 1000) / 1000,
      doorOut: DOOR_OUT,
      stadiums: [
        { out: R1(ballpark), stands: R1(ballfield), kind: 'baseball' }, // (OSM's inner way here is the stands: a C round the field)
        { out: R1(stadium), field: R1(pitch), kind: 'track' },
      ],
    },
  ],
};

const span = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [r1(Math.max(...xs) - Math.min(...xs)), r1(Math.max(...zs) - Math.min(...zs))]; };
console.log({
  OFFSET, axisDeg: r1(axis * 180 / Math.PI), hallSpan: span(hall), hallWall: r1(Math.hypot(hall[1][0] - hall[0][0], hall[1][1] - hall[0][1])),
  lobbySpan: span(lobby), door: map.landmarks[0].door, face: map.landmarks[0].face, rinkPts: rinkFoot.length,
  ballparkPts: ballpark.length, stadiumPts: stadium.length, gukhoe: gukhoe.length, dongro: dongro.length, plaza: plaza.length,
});
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'mokdong.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/mokdong.json', Math.round(JSON.stringify(map).length / 1024 * 10) / 10, 'KB');
}
