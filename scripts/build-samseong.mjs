#!/usr/bin/env node
// Builds the Samseong-dong district (districts/samseong.json) in Gangnam-gu
// and puts its places on it.
//
// Samseong Station (Line 2) sits where Teheran-ro meets Yeongdong-daero. The
// big block north-west of that corner is KONEXT, a fictional shopping mall
// (only its outside for now) on the real exhibition centre's ground: a long,
// low building running north from KONEXT Square (the plaza on the station
// corner) towards Bongeunsa-ro, a media wall wrapped round its corner, a
// glass tower on the Teheran-ro / Asem-ro corner and the small glass pavilion
// of KONEXT Aquarium on the square (its door leads into the aquarium,
// core/aquarium.js). Bongeunsa's trees stand north of Bongeunsa-ro. Tancheon,
// the stream between Gangnam and Songpa, runs along the east edge;
// Teheran-ro turns into Olympic-ro, crosses it on Samseong Bridge and runs on
// towards Jamsil.
//
// Street lines and Tancheon are the real ones at 1/4 (scripts/data/
// samseong-osm.json, from Yozi's OpenStreetMap export; © OpenStreetMap
// contributors, ODbL). The streets here don't run north-south: the whole
// grid of Samseong-dong is turned 21.5° (Teheran-ro runs east-north-east,
// Yeongdong-daero north-north-west). So the buildings, the plaza and KONEXT
// are laid out in that grid ("grid" metres: u along Teheran-ro to the east,
// v along Yeongdong-daero to the south, Samseong Station's corner at (0, 0))
// and turned onto the map with fromGrid(). The buildings are made up, inside
// the real blocks, at a quarter of the real footprint (KONEXT 52 x 82 m on
// the real exhibition centre's 59 x 87 m); heights stay real so a person
// still fits a door. Map metres: local x east, z south, the station's corner
// at (0, 0).
//
//   node scripts/build-samseong.mjs   writes the map and sets the "at" of the
//                                     places in SPOTS in stores.json (world
//                                     metres, using the district's offset);
//                                     prints the exits, zone, stamp, screens
//                                     and Olympic-ro link for region.json,
//                                     zones.json and data/stamps.js

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'samseong-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
export const OFFSET = region.districts.find((d) => d.id === 'samseong')?.offset || [163, 996];
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// The street grid's turn, and the way between grid and map metres.
export const THETA = (21.5 * Math.PI) / 180;
const C = Math.cos(THETA), S = Math.sin(THETA);
export const fromGrid = ([u, v]) => [r1(u * C + v * S), r1(-u * S + v * C)];
export const toGrid = ([x, z]) => [x * C - z * S, x * S + z * C];
const grect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(fromGrid);
const local = (pts) => pts.map(([x, z]) => [r1(x - OFFSET[0]), r1(z - OFFSET[1])]);

// Distances (map metres).
const segDist = ([px, pz], [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
};
export const lineDist = (q, p) => Math.min(...p.slice(1).map((b, i) => segDist(q, p[i], b)));
const inPoly = ([x, z], poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
// Points every metre or so round a polygon's edge, and its corners.
const edgePoints = (p) => p.flatMap((a, i) => {
  const b = p[(i + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
});
// Where two polylines cross (first crossing), or null.
function crossing(p, q) {
  for (let i = 1; i < p.length; i++) for (let j = 1; j < q.length; j++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], [cx, cz] = q[j - 1], [dx, dz] = q[j];
    const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
    if (!den) continue;
    const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den;
    const s = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, i, j };
  }
  return null;
}
// A strip w wide round a centre line (polygon).
function strip(p, w0, w1) {
  const side = (off) => p.map((q, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    return [r1(q[0] + nx * off), r1(q[1] + nz * off)];
  });
  return [...side(w0), ...side(w1).reverse()];
}
// The part of a polygon on one side of a line (through o, along u): keep
// points whose side (u x (q - o)) * sign >= d.
function clip(poly, o, u, sign, d) {
  const f = ([x, z]) => sign * (u[0] * (z - o[1]) - u[1] * (x - o[0])) - d;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)]); }
  }
  return out;
}

// --- Streets (map metres, the real centre lines) ---
export const TEHERAN = { w: 20, p: local(OSM.teheran) };
export const YEONGDONG = { w: 20, p: local(OSM.yeongdong) };
export const OLYMPIC = { w: 20, p: [TEHERAN.p.at(-1), ...local(OSM.olympic)] }; // on from Teheran-ro's east end, over Tancheon
export const BONGEUNSA = { w: 14, p: local(OSM.bongeunsa) };
export const SAMSEONG_RO = { w: 14, p: local(OSM.samseong) };
// Asem-ro: 88 m (real 350 m) west of Yeongdong-daero, from Teheran-ro to
// Bongeunsa-ro (cut where it meets each).
const asemLine = [fromGrid([-88, 10]), fromGrid([-88, -200])];
const asemS = crossing(asemLine, TEHERAN.p), asemN = crossing(asemLine, BONGEUNSA.p);
export const ASEM = { w: 12, p: [[r1(asemS.x), r1(asemS.z)], [r1(asemN.x), r1(asemN.z)]] };
// Tancheon: 26 m of water (the real stream at 1/4) with grass banks.
export const TANCHEON = { w: 26, bank: 12, p: local(OSM.tancheon) };
const ROADS = [TEHERAN, OLYMPIC, YEONGDONG, BONGEUNSA, SAMSEONG_RO, ASEM];

// KONEXT (grid metres): the mall, the aquarium pavilion on the square and the
// glass tower on the corner of Teheran-ro and Asem-ro.
export const MALL = { u0: -78, v0: -148, u1: -26, v1: -66, h: 22 };
export const PAVILION = { u0: -48, v0: -56, u1: -28, v1: -40, h: 6 };
export const TOWER = { u0: -78, v0: -46, u1: -54, v1: -16, h: 88 };
export const SQUARE = { u0: -50, v0: -62, u1: -12, v1: -12 }; // KONEXT Square, on the station corner
const mid = (b) => fromGrid([(b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2]);

// Bongeunsa's grounds north of Bongeunsa-ro (the real temple's outline,
// kept off the streets): trees.
const TEMPLE = [[-177, -183], [-177, -169], [-150, -160], [-147, -147], [-107, -153], [-101, -166], [-100, -186], [-96, -196], [-104, -218], [-142, -206], [-161, -198]];

// Is a polygon clear of every street (by its half width plus a pavement) and
// of Tancheon and its banks?
const water = strip(TANCHEON.p, -TANCHEON.w / 2, TANCHEON.w / 2);
const banks = strip(TANCHEON.p, -TANCHEON.w / 2 - TANCHEON.bank, TANCHEON.w / 2 + TANCHEON.bank);
function clash(p, pave = 2) {
  const pts = edgePoints(p);
  for (const r of ROADS) if (pts.some((q) => lineDist(q, r.p) < r.w / 2 + pave)) return r;
  if (pts.some((q) => inPoly(q, banks))) return TANCHEON;
  return null;
}

function build() {
  const custom = [
    // KONEXT and its aquarium pavilion are drawn by their landmarks
    // (core/konext.js); here they are walls you can't walk through.
    { h: MALL.h, custom: true, p: grect(MALL.u0, MALL.v0, MALL.u1, MALL.v1) },
    { h: PAVILION.h, custom: true, p: grect(PAVILION.u0, PAVILION.v0, PAVILION.u1, PAVILION.v1) },
    // The glass tower on the corner (no name: just the skyline).
    { h: TOWER.h, wall: '#9fb6c8', roof: '#5d6b78', p: grect(TOWER.u0, TOWER.v0, TOWER.u1, TOWER.v1) },
  ];
  for (const b of custom) { const r = clash(b.p); if (r) throw new Error(`KONEXT building on a street (${JSON.stringify(b.p)})`); }
  // One row of buildings along the streets (grid metres: u0, v0, u1, v1, h).
  const rows = [
    // Between Samseong-ro and Asem-ro, on Teheran-ro: a hotel and offices.
    [-140, -40, -118, -16, 30], [-112, -40, -96, -16, 24],
    // North-east of the station: offices and a department store, both sides of a lane.
    [14, -44, 44, -16, 36], [52, -44, 84, -16, 30],
    [14, -100, 44, -56, 48], [52, -100, 84, -56, 18],
    [14, -142, 44, -108, 30], [52, -138, 84, -108, 24],
    // South of Teheran-ro: a row of office towers along the street.
    [-140, 16, -122, 56, 42], [-118, 16, -92, 56, 56], [-80, 16, -48, 56, 34], [-42, 16, -16, 56, 62], [26, 16, 56, 56, 46], [60, 20, 92, 56, 52],
  ];
  const buildings = [...custom];
  for (const [u0, v0, u1, v1, h] of rows) {
    const p = grect(u0, v0, u1, v1);
    if (clash(p)) { console.log(`  (left out: building at grid ${u0},${v0} on a street or the stream)`); continue; }
    buildings.push({ h, p });
  }
  const roads = [
    { k: 'primary', w: TEHERAN.w, p: TEHERAN.p, n: name('Teheran-ro', '테헤란로', 'テヘラン路', '德黑兰路') },
    { k: 'primary', w: OLYMPIC.w, p: OLYMPIC.p, n: name('Olympic-ro', '올림픽로', 'オリンピック路', '奥林匹克路') },
    { k: 'primary', w: YEONGDONG.w, p: YEONGDONG.p, n: name('Yeongdong-daero', '영동대로', '永東大路', '永东大路') },
    { k: 'secondary', w: BONGEUNSA.w, p: BONGEUNSA.p, n: name('Bongeunsa-ro', '봉은사로', '奉恩寺路', '奉恩寺路') },
    { k: 'secondary', w: SAMSEONG_RO.w, p: SAMSEONG_RO.p, n: name('Samseong-ro', '삼성로', '三成路', '三成路') },
    { k: 'tertiary', w: ASEM.w, p: ASEM.p, n: name('Asem-ro', '아셈로', 'アセム路', '亚欧路') },
    // The lane between the offices north-east of the station (Yeongdong-daero 96-gil).
    { k: 'residential', w: 8, p: [fromGrid([10, -50]), fromGrid([88, -50])] },
  ];
  const planters = [[-46, -28], [-20, -28], [-20, -54], [-18, -80], [-18, -92]];
  const areas = [
    // KONEXT Square: the plaza on the corner, in front of the mall and round to its entrance.
    { k: 'plaza', p: grect(SQUARE.u0, SQUARE.v0, SQUARE.u1, SQUARE.v1) },
    { k: 'plaza', p: grect(-26, -150, -12, SQUARE.v0) }, // along the mall's entrance side
    { k: 'plaza', p: grect(-82, -62, SQUARE.u0, -12) }, // round the tower to Asem-ro
    // Planters with trees on the plaza, leaving the middle and the way to the doors open.
    ...planters.map(([u, v]) => ({ k: 'park', trees: true, p: grect(u - 3, v - 3, u + 3, v + 3) })),
    // Bongeunsa's grounds (the temple itself is not built yet).
    { k: 'park', trees: true, p: TEMPLE },
    // Tancheon and its banks.
    { k: 'grass', p: strip(TANCHEON.p, -TANCHEON.w / 2 - TANCHEON.bank, -TANCHEON.w / 2) },
    { k: 'grass', p: strip(TANCHEON.p, TANCHEON.w / 2, TANCHEON.w / 2 + TANCHEON.bank) },
    { k: 'water', p: water },
  ];
  if (clash(TEMPLE, 1)) throw new Error('Bongeunsa\'s trees on a street');
  // You can't walk into Tancheon, except over Samseong Bridge (Olympic-ro).
  const br = crossing(OLYMPIC.p, TANCHEON.p);
  const [ax, az] = OLYMPIC.p[br.i - 1], [bx, bz] = OLYMPIC.p[br.i];
  const L = Math.hypot(bx - ax, bz - az), u = [(bx - ax) / L, (bz - az) / L];
  const gap = OLYMPIC.w / 2 + 1;
  const blockers = [{ p: clip(water, [br.x, br.z], u, 1, gap) }, { p: clip(water, [br.x, br.z], u, -1, gap) }];
  // (the bridge's length: across the water at the road's slant)
  const [rx, rz] = TANCHEON.p[br.j - 1], [sx, sz] = TANCHEON.p[br.j];
  const rl = Math.hypot(sx - rx, sz - rz), sin = Math.abs(u[0] * (sz - rz) / rl - u[1] * (sx - rx) / rl);
  const [cx, cz] = mid({ u0: MALL.u0, v0: MALL.v0, u1: MALL.u1, v1: MALL.v1 });
  const [px, pz] = mid(PAVILION);
  const landmarks = [
    { type: 'konext', x: cx, z: cz, ry: THETA, w: MALL.u1 - MALL.u0, d: MALL.v1 - MALL.v0, h: MALL.h },
    { type: 'aquarium', x: px, z: pz, ry: THETA, w: PAVILION.u1 - PAVILION.u0, d: PAVILION.v1 - PAVILION.v0, h: PAVILION.h },
    { type: 'samseongbridge', x: r1(br.x), z: r1(br.z), ry: Math.atan2(-u[1], u[0]), len: Math.round(TANCHEON.w / sin + 4), w: OLYMPIC.w },
    { type: 'sign', ...xz([-32, -16]), ry: Math.PI + THETA,
      title: name('KONEXT', '코넥스트', 'コネクスト', 'KONEXT'),
      text: {
        en: 'KONEXT is a big shopping mall by Samseong Station (made up for the game). Its media wall shows the sea, and KONEXT Aquarium is opening soon under the mall: walk with sharks and rays in an undersea tunnel.',
        ko: '코넥스트는 삼성역 옆의 대형 쇼핑몰이에요(게임 속 가상 장소). 미디어 월에는 바다가 펼쳐지고, 몰 지하에는 곧 코넥스트 아쿠아리움이 열려요. 해저터널에서 상어와 가오리와 함께 걸어 보세요.',
        ja: 'コネクストはサムソン駅のそばの大型ショッピングモールです（ゲームの架空の場所）。メディアウォールには海が広がり、モールの地下にはまもなくコネクスト・アクアリウムがオープンします。海底トンネルでサメやエイと一緒に歩いてみましょう。',
        zh: 'KONEXT是三成站旁的大型购物中心（游戏中的虚构地点）。媒体墙上是一片大海，商场地下的KONEXT水族馆即将开放：在海底隧道里和鲨鱼、鳐鱼一起漫步吧。',
      } },
  ];
  for (const [u, v, ry] of [[-44, -22, 0], [-20, -22, 0], [-38, -32, Math.PI], [-18, -66, -Math.PI / 2], [-58, -54, Math.PI], [-70, -54, Math.PI]]) landmarks.push({ type: 'bench', ...xz([u, v]), ry: ry + THETA });
  const tc = TANCHEON.p.reduce((a, q) => (Math.abs(q[1] + 102) < Math.abs(a[1] + 102) ? q : a));
  const pois = [
    { kind: 'landmark', x: cx, z: cz, name: name('KONEXT', '코넥스트', 'コネクスト', 'KONEXT') },
    { kind: 'landmark', ...xz([-32, -40]), name: name('KONEXT Square', '코넥스트 광장', 'コネクスト広場', 'KONEXT广场') },
    { kind: 'landmark', x: tc[0], z: tc[1], name: name('Tancheon', '탄천', '炭川', '炭川') },
    { kind: 'landmark', x: -135, z: -185, name: name('Bongeunsa', '봉은사', '奉恩寺', '奉恩寺') },
  ];
  return {
    meta: {
      district: 'samseong',
      source: 'hand-made (scripts/build-samseong.mjs; game map at 1/4 of the real size): Samseong-dong, Gangnam-gu, around Samseong Station. Street lines and Tancheon from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/samseong-osm.json). KONEXT and KONEXT Aquarium are fictional; the other buildings are generic.',
    },
    roads, buildings, rail: [], areas, blockers, pois, landmarks,
  };
}
const xz = (g) => { const [x, z] = fromGrid(g); return { x, z }; };

// Where each place is, in grid metres (turned onto the map below).
export const SPOTS = {
  'info-samseong': [34, -13], // the office on the station's north-east corner, facing Teheran-ro
  'konext-aquarium': [-25, -48], // the pavilion's door, on the square side
};
// Also in world metres (printed for region.json): the station exits (next to
// the real exits 5/6 and 2), the meeting zone on KONEXT Square, the stamp by
// the mall's entrance and the media wall round the mall's corner.
export const EXITS = [
  { n: 1, at: [-16, -16], ry: -Math.PI / 2 }, // KONEXT Square side
  { n: 2, at: [19, 16], ry: Math.PI / 2 }, // south-east corner
];
export const ZONE = [-32, -28];
export const STAMP = { at: [-18, -100], ry: Math.PI / 2 };
export const SCREENS = [[-26, -78], [-37, -66]]; // on the mall's square side by the corner, then its south side

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const map = build();
  writeFileSync(path.join(R, 'districts', 'samseong.json'), JSON.stringify(map) + '\n');
  // stores.json is hand-formatted, so only the "at" of each place is rewritten.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const [ox, oz] = OFFSET;
  const w = (g) => { const [x, z] = fromGrid(g); return [r1(x + ox), r1(z + oz)]; };
  for (const [sid, p] of Object.entries(SPOTS)) {
    const i = stores.indexOf(`"id": "${sid}"`);
    if (i < 0) { console.log(`${sid}: not in stores.json`); continue; }
    let end = stores.indexOf('\n    {', i);
    if (end < 0) end = stores.length;
    const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${w(p).join(', ')}]`);
    stores = stores.slice(0, i) + part + stores.slice(end);
  }
  writeFileSync(path.join(R, 'stores.json'), stores);
  const ry = (a) => Math.round((a + THETA) * 1e4) / 1e4;
  console.log('exits:', JSON.stringify(EXITS.map((e) => ({ n: e.n, at: w(e.at), ry: ry(e.ry) }))));
  console.log('zone J-1 at', JSON.stringify(w(ZONE)), ' stamp at', JSON.stringify(w(STAMP.at)), 'ry', ry(STAMP.ry));
  console.log('screens at', JSON.stringify(SCREENS.map(w)));
  const end = OLYMPIC.p.at(-1);
  console.log('Olympic-ro east end (link to Songpa):', JSON.stringify([r1(end[0] + ox), r1(end[1] + oz)]));
  console.log(`samseong: ${map.buildings.length} buildings`);
}
