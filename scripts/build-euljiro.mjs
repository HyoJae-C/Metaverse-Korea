#!/usr/bin/env node
// Builds Euljiro & Dongdaemun (districts/euljiro.json) at 1/4 on its real
// streets, like the rest of the Seoul map, and puts its shops on the street.
//
// The streets are OpenStreetMap's (scripts/data/euljiro-osm.json): Eulji-ro
// running east-north-east to Gwanghuimun, where it meets Toegye-ro, which
// goes on east to Sindang; Jangchungdan-ro coming up from the south across
// Eulji-ro at Dongdaemun History & Culture Park Station (the district's
// anchor) and on north-east to Cheonggyecheon; Dasan-ro going south-east from
// Toegye-ro. Every building and shop is fictional.
//
//   - DDP keeps its game size (Yozi, 2026-11-10: bigger than its real block
//     at 1/4), north of Eulji-ro like the real one, between Jangchungdan-ro
//     and the fashion malls. Its middle stands DDP.why east of the real one:
//     the Cheonggyecheon strip (gyeongbokgung map) is still south of its
//     real line, so the block is shallower than it should be.
//   - Dongdaemun History & Culture Park: the corner between DDP,
//     Jangchungdan-ro and Eulji-ro, with a stretch of the city wall and its
//     water gate (Igansumun).
//   - The fashion malls: across Jangchungdan-ro (like Migliore and its
//     neighbours) and east of DDP round Fashion Town Lane.
//   - Elsewhere one row of buildings along each street (Yozi, 2026-11-10).
//   - Namsangol Hanok Village at its real place south of Toegye-ro by
//     Chungmuro (a part of its own), at game size: five hanok round a yard.
//   - Sungnyemun on its lawn island where Toegye-ro starts, and Heunginjimun
//     north of the Cheonggyecheon strip: parts of their own.
//
//   node scripts/build-euljiro.mjs          writes the map and sets the "at"
//                                           of the shops in SHOPS (stores.json)
//
// Coordinates here are world metres (x east, z south; src/core/seoul-grid.js);
// the map is written in the district's own metres (minus OFFSET).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { folkBlockers } from '../src/data/folk-yard.js';
import { r1, name as N4, town, nearestOn, pointAt, lengthOf, strips, lineDist, inPoly } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'euljiro-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
export const OFFSET = region.districts.find((x) => x.id === 'euljiro').offset;

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const street = (en) => OSM.roads.find((r) => r.en === en).p;
// The part of a line between two x values (cut where it crosses them).
function between(p, xa, xb) {
  const out = [];
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb), at = (a, b, x) => [x, r1(a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]))];
  for (let i = 0; i < p.length; i++) {
    const q = p[i];
    if (i) {
      const a = p[i - 1];
      for (const x of [lo, hi]) if ((a[0] - x) * (q[0] - x) < 0) out.push(at(a, q, x));
    }
    if (q[0] >= lo && q[0] <= hi) out.push(q);
  }
  return out;
}
// The part of a line between two z values.
function betweenZ(p, za, zb) {
  const sw = p.map(([x, z]) => [z, x]);
  return between(sw, za, zb).map(([z, x]) => [x, z]);
}

// ---------- The streets (world metres) ----------
export const EDGE = { west: -1133, east: -842, north: -657, south: -468 }; // the main part; north: the Cheonggyecheon strip's south road
const STRIP_ROAD = -663; // its middle
export const EULJI = between(street('Eulji-ro'), EDGE.west, -974.2);
const toegyeAll = street('Toegye-ro');
export const TOEGYE = [...between(toegyeAll, EDGE.west, -871), [-840, -581]]; // on east towards Sindang (the export stops at Dasan-ro)
// Jangchungdan-ro: from the south up to the strip's south road.
export const JANG = [...betweenZ(street('Jangchungdan-ro'), -475, -656.5), [-1022.7, STRIP_ROAD]];
export const DASAN = betweenZ(street('Dasan-ro'), -577, -470);
// Changgyeonggung-ro is drawn at x -1133, the district's west edge, not on
// its real line (x -1270, by Euljiro 4-ga): it goes on north to Baeogae
// Bridge, which is also still east of its real spot. Both move with the
// Cheonggyecheon strip.
export const CHANGG = [[EDGE.west, EULJI[0][1]], [EDGE.west, TOEGYE[0][1]]];

const NAME = {
  eulji: N('을지로', 'Eulji-ro', '乙支路', '乙支路'),
  toegye: N('퇴계로', 'Toegye-ro', '退渓路', '退溪路'),
  jang: N('장충단로', 'Jangchungdan-ro', '奨忠壇路', '奖忠坛路'),
  dasan: N('다산로', 'Dasan-ro', '茶山路', '茶山路'),
  changg: N('창경궁로', 'Changgyeonggung-ro', '昌慶宮路', '昌庆宫路'),
  lane: N('패션타운길', 'Fashion Town Lane', 'ファッションタウン通り', '时装城小路'),
};
const roads = [
  { k: 'primary', w: 16, p: EULJI, n: NAME.eulji },
  { k: 'primary', w: 16, p: TOEGYE, n: NAME.toegye },
  { k: 'secondary', w: 12, p: JANG, n: NAME.jang },
  { k: 'tertiary', w: 10, p: DASAN, n: NAME.dasan },
  { k: 'tertiary', w: 9, p: CHANGG, n: NAME.changg },
];

const buildings = [], areas = [], blockers = [], landmarks = [], pois = [];

// ---------- DDP ----------
// One long, curved silver building: a superellipse, fuller at its east end.
// Kept at its game size; its middle is as close to the real one as fits
// between Jangchungdan-ro, Eulji-ro and the strip (2 m clear of each).
export const DDP = { x: -984, z: -619, rx: 52, rz: 36, real: OSM.places.DDP.at };
DDP.why = `${r1(Math.hypot(DDP.x - DDP.real[0], DDP.z - DDP.real[1]))} m`;
const ddpOutline = [];
for (let i = 0; i < 32; i++) {
  const a = (i / 32) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  const k = 1 + 0.16 * Math.cos(a) - 0.06 * Math.cos(2 * a + 0.8);
  ddpOutline.push([r1(DDP.rx * k * Math.sign(c) * Math.abs(c) ** 0.7), r1(DDP.rz * k * Math.sign(s) * Math.abs(s) ** 0.7)]);
}
const ddpWorld = ddpOutline.map(([x, z]) => [r1(DDP.x + x), r1(DDP.z + z)]);
// DDP is a building drawn by its landmark (custom): it is still a wall, and
// its hall has a front on it.
buildings.push({ h: 16, custom: 1, p: ddpWorld, n: N('동대문디자인플라자', 'Dongdaemun Design Plaza', '東大門デザインプラザ', '东大门设计广场') });
// The model's way in faces south (its +z), onto Eulji-ro's pavement: the
// way most people come, from the station.
const ddpSouth = r1(DDP.z + Math.max(...ddpOutline.filter(([x]) => Math.abs(x) < 6).map(([, z]) => z)));
// A small plaza between the way in and Eulji-ro.
areas.push({ k: 'plaza', p: [[DDP.x - 16, ddpSouth - 4], [DDP.x + 16, ddpSouth - 4], [DDP.x + 16, -574], [DDP.x - 16, -581]] }); // (to Eulji-ro's pavement)

// ---------- Dongdaemun History & Culture Park ----------
// The corner west of DDP: from Jangchungdan-ro's east side to DDP, from
// Eulji-ro up to the strip. The city wall runs north-south through it, with
// its two-arch water gate (Igansumun) near the south end.
const jangEast = (z) => { const p = JANG; for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]]; if ((a[1] - z) * (b[1] - z) <= 0) return r1(a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + 7.5); } return null; };
const euljiNorth = (x) => { const p = EULJI; for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]]; if ((a[0] - x) * (b[0] - x) <= 0) return r1(a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) - 9); } return null; };
const PARK = [[jangEast(-603), -603], [-992, euljiNorth(-992)], [-992, -630], [-1012, EDGE.north + 1], [jangEast(EDGE.north + 1), EDGE.north + 1]];
areas.push({ k: 'park', p: PARK });
const WALL = { x: -1033, z0: -626, z1: -597 };
const WALL_LEN = WALL.z1 - WALL.z0;
blockers.push({ p: rect(WALL.x - 1.5, WALL.z0, WALL.x + 1.5, WALL.z1) });
landmarks.push({ type: 'citywall', x: WALL.x, z: (WALL.z0 + WALL.z1) / 2, len: WALL_LEN });
// The water gate is the south end's two arches (core/euljiro-models.js).
const IGANSUMUN = [WALL.x, WALL.z1 - 11];

// ---------- The fashion malls east of DDP, round Fashion Town Lane ----------
const LANE_Z = -619;
const toegyeNorth = (x) => { const p = TOEGYE; for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]]; if ((a[0] - x) * (b[0] - x) <= 0) return r1(a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) - 9.5); } return null; };
const MX0 = -914, MX1 = EDGE.east - 2;
const MALL_N = rect(MX0, EDGE.north + 2, MX1, LANE_Z - 4);
const MALL_S = [[MX0, LANE_Z + 4], [MX1, LANE_Z + 4], [MX1, toegyeNorth(MX1)], [MX0, toegyeNorth(MX0)]];
buildings.push({ h: 38, p: MALL_N, n: N('패션몰', 'Fashion mall', 'ファッションモール', '时装商场') });
buildings.push({ h: 30, p: MALL_S, n: N('패션몰', 'Fashion mall', 'ファッションモール', '时装商场') });
roads.push({ k: 'walk', w: 6, p: [[MX0 - 8, LANE_Z], [EDGE.east, LANE_Z]], n: NAME.lane });
landmarks.push({ type: 'arch', x: MX0 - 3, z: LANE_Z, w: 6, ry: Math.PI / 2, title: 'DONGDAEMUN FASHION TOWN', sub: '동대문 패션타운', color: '#c2185b' });
// Their shops face each other across the lane.
const MALL_SHOPS = {
  'midnight-rack': [-902, LANE_Z - 2], 'button-thread': [-874, LANE_Z - 2],
  'gentle-floor': [-905, LANE_Z + 2], 'gwajam-club': [-883, LANE_Z + 2], 'byeollan-hair': [-861, LANE_Z + 2],
};

// Dongdaemun History & Culture Park Station's exits 1 and 10 (region.json
// "subway"): at their real places either side of Eulji-ro, east of
// Jangchungdan-ro (OSM), moved out of the road onto the pavement, the stairs
// going down along the road. (Exit 2, further east, is under DDP's edge.)
export const STATION_EXITS = { 1: { real: [-1026.4, -588.5], side: -1 }, 10: { real: [-1051.6, -584.7], side: 1, along: 3.5 } }; // (10: 3.5 m east, clear of Jangchungdan-ro)
export function stationExits(out = 10.5) {
  return Object.entries(STATION_EXITS).map(([n, { real, side, along = 0 }]) => {
    const { at: on, dir } = nearestOn(real, EULJI), at = [on[0] + dir[0] * along, on[1] + dir[1] * along];
    const nx = -dir[1] * side, nz = dir[0] * side; // side +1: south of the road
    return { n: Number(n), at: [r1(at[0] + nx * out), r1(at[1] + nz * out)], ry: Number(Math.atan2(dir[0], dir[1]).toFixed(4)), real };
  });
}
const exitSquares = stationExits().map(({ at: [x, z] }) => ({ p: rect(x - 5, z - 5, x + 5, z + 5) }));

// ---------- Rows along the streets ----------
const inside = ([x, z]) => x > EDGE.west + 0.5 && x < EDGE.east && z > EDGE.north && z < EDGE.south;
const open = [{ p: PARK }, { p: ddpWorld }, { p: MALL_N }, { p: MALL_S }, ...exitSquares];
const t = town(7, { inside, roads, open });
t.buildings.push(...buildings.filter((b) => b.p !== ddpWorld)); // (DDP and the malls are in `open`)
const SHOP = { w: [10, 16], h: [6, 14], depth: 15 };
const MALL = { w: [20, 30], h: [24, 40], depth: 26 };
// Across Jangchungdan-ro from DDP: big fashion malls up to the strip.
t.row('jangW', JANG.filter(([, z]) => z <= -594), -1, { off: 7.5, ...MALL, gap: 2 });
t.row('euljiN', between(EULJI, EDGE.west, -1057), -1, { off: 9.5, ...MALL, gap: 2 });
// South of Eulji-ro, between it and Toegye-ro, and on.
t.row('euljiS', EULJI, 1, { off: 9.5, ...SHOP });
t.row('toegyeN', between(TOEGYE, EDGE.west, -1000), -1, { off: 9.5, ...SHOP });
t.row('toegyeS', TOEGYE, 1, { off: 9.5, ...SHOP });
t.row('jangE', JANG.filter(([, z]) => z >= -596), 1, { off: 7.5, ...SHOP });
t.row('jangWs', JANG.filter(([, z]) => z >= -596), -1, { off: 7.5, ...SHOP });
t.row('dasanE', DASAN, -1, { off: 6.5, ...SHOP });
t.row('dasanW', DASAN, 1, { off: 6.5, ...SHOP });
t.row('changgE', CHANGG, -1, { off: 6, ...SHOP });
for (const b of t.buildings) if (!b.n && (b.h > 20)) b.n = N('패션몰', 'Fashion mall', 'ファッションモール', '时装商场');
// (the malls round the lane are already in t.buildings: keep DDP first)
const allBuildings = [buildings[0], ...t.buildings];

// Shops along the rows: the info centre by the station, the bank on Toegye-ro.
const GROUPS = [
  [['euljiS', 'jangE'], ['info-euljiro'], { near: OSM.places['Dongdaemun History & Culture Park Station (Eulji-ro x Jangchungdan-ro)'].at }],
  [['toegyeS'], ['seoul-bank'], { near: [-1000, -560] }],
];

// ---------- Namsangol Hanok Village (its real place, by Chungmuro) ----------
// Game size (104 x 55 m) round the real hanok village's middle, the gate on
// the north side with a walk up to Toegye-ro.
export const HANOK = { box: [-1420, -428, -1316, -373], gate: -1368, yard: [-1392, -421, -1344, -401] };
const [hx0, hz0, hx1, hz1] = HANOK.box, g = HANOK.gate;
const toegyeAtGate = toegyeAll.reduce((best, _, i, p) => {
  if (!i) return best; const [a, b] = [p[i - 1], p[i]];
  return (a[0] - g) * (b[0] - g) <= 0 ? r1(a[1] + ((b[1] - a[1]) * (g - a[0])) / (b[0] - a[0])) : best;
}, null);
roads.push({ k: 'walk', w: 6, p: [[g, toegyeAtGate + 8], [g, HANOK.yard[1]]] });
// The five hanok, as they were drawn round the box (corner -128, 97 in the
// old hand-made map).
for (const [x0, z0, x1, z1] of [[-120, 130, -96, 144], [-88, 132, -64, 146], [-56, 130, -32, 144], [-122, 104, -108, 124], [-44, 104, -30, 124]]) {
  const dx = hx0 + 128, dz = hz0 - 97;
  allBuildings.push({ h: 5, hanok: 1, p: rect(x0 + dx, z0 + dz, x1 + dx, z1 + dz) });
}
areas.push({ k: 'plaza', p: rect(...HANOK.yard) }); // the folk games yard
areas.push({ k: 'grass', p: rect(hx0 + 2, hz0 + 2, hx1 - 2, hz1 - 2) });
// Namsangol's wall, a gap at the gate.
blockers.push(
  { p: rect(hx0, hz0 - 0.8, g - 3, hz0 + 0.8) }, { p: rect(g + 3, hz0 - 0.8, hx1, hz0 + 0.8) },
  { p: rect(hx0 - 0.8, hz0, hx0 + 0.8, hz1) }, { p: rect(hx1 - 0.8, hz0, hx1 + 0.8, hz1) },
  { p: rect(hx0, hz1 - 0.8, hx1, hz1 + 0.8) },
);
const [yx0, yz0, yx1, yz1] = HANOK.yard;
const folkYardAt = { x: (yx0 + yx1) / 2, z: (yz0 + yz1) / 2 };
landmarks.push({ type: 'wall', p: [[g + 3, hz0], [hx1, hz0], [hx1, hz1], [hx0, hz1], [hx0, hz0], [g - 3, hz0]], h: 2.6 });
landmarks.push({ type: 'hanokgate', x: g, z: hz0 });

// The boards by the gates (facts checked 2026-11-07).
const HEUNGINJIMUN = {
  title: N('흥인지문', 'Heunginjimun', '興仁之門', '兴仁之门'),
  text: {
    ko: '한양도성의 동쪽 정문, 흔히 동대문이라고 불러요. 지금의 문은 1869년에 다시 지은 것이에요. 사대문 가운데 유일하게 문 앞을 반달 모양 성벽(옹성)이 감싸고 있어요.',
    en: 'The great east gate of Seoul\'s old city wall, often called Dongdaemun. The gate standing today was rebuilt in 1869. It is the only one of the four great gates with an ongseong, the half-moon wall that wraps round its front.',
    ja: '漢陽都城の東の正門で、よく東大門と呼ばれます。今の門は1869年に建て直されたものです。四大門の中で唯一、門の前を半月形の城壁（甕城）が囲んでいます。',
    zh: '汉阳都城的东正门，常被称为东大门。现在的城门是1869年重建的。它是四大门中唯一一座门前有半月形瓮城环绕的城门。',
  },
};
// (Cultural Heritage Administration / Korea Heritage Service)
const SUNGNYEMUN = {
  title: N('숭례문', 'Sungnyemun', '崇礼門', '崇礼门'),
  text: {
    ko: '한양도성의 남쪽 정문으로 1398년에 처음 세워졌어요. 2008년 화재로 크게 불탔고 2013년에 복구됐어요. 국보로 지정된 첫 문화유산이에요.',
    en: 'The south gate of Seoul\'s old city wall, first built in 1398. A fire badly burned it in 2008, and it was restored in 2013. It was the first site named a National Treasure of Korea.',
    ja: '漢陽都城の南の正門で、1398年に建てられました。2008年の火災で大きく焼け、2013年に復元されました。韓国の国宝に最初に指定された文化遺産です。',
    zh: '汉阳都城的南正门，始建于1398年。2008年遭大火严重焚毁，2013年修复。它是韩国第一个被指定为国宝的文化遗产。',
  },
};

landmarks.unshift({ type: 'ddp', x: DDP.x, z: DDP.z, outline: ddpOutline }); // (not "p": that would be moved as world points)
landmarks.push({ type: 'folkyard', x: folkYardAt.x, z: folkYardAt.z }); // yutnori, tuho, jegichagi, neolttwigi

const parkMid = [r1(PARK.reduce((m, q) => m + q[0], 0) / PARK.length), r1(PARK.reduce((m, q) => m + q[1], 0) / PARK.length)];
pois.push(
  { kind: 'landmark', x: DDP.x, z: DDP.z, name: N('동대문디자인플라자 (DDP)', 'Dongdaemun Design Plaza (DDP)', '東大門デザインプラザ（DDP）', '东大门设计广场 (DDP)') },
  { kind: 'landmark', x: parkMid[0], z: parkMid[1], name: N('동대문역사문화공원', 'Dongdaemun History & Culture Park', '東大門歴史文化公園', '东大门历史文化公园') },
  { kind: 'landmark', x: WALL.x, z: WALL.z0 - 4, name: N('한양도성 성곽', 'Seoul City Wall', '漢陽都城の城壁', '汉阳都城城墙') },
  { kind: 'landmark', x: (MX0 + MX1) / 2, z: LANE_Z, name: N('동대문 패션타운', 'Dongdaemun Fashion Town', '東大門ファッションタウン', '东大门时装城') },
  { kind: 'landmark', x: g, z: folkYardAt.z, name: N('남산골 한옥마을', 'Namsangol Hanok Village', '南山コル韓屋村', '南山谷韩屋村') },
);

// ---------- Sungnyemun (숭례문, Namdaemun) ----------
// A ring road round a lawn island where Toegye-ro starts; the gate in the
// middle with short stretches of the restored wall either side; a path
// through its arch (people walk through it today).
export const GATE = { x: -1774, z: -429, ring: [-1828, -465, -1720, -393] };
{
  const { x, z, ring: [rx0, rz0, rx1, rz1] } = GATE;
  roads.push({ k: 'primary', w: 14, p: [[rx0, rz0], [rx1, rz0], [rx1, rz1], [rx0, rz1], [rx0, rz0]], n: N('세종대로', 'Sejong-daero', '世宗大路', '世宗大路') });
  roads.push({ k: 'walk', w: 4, p: [[x, rz0 + 7], [x, rz1 - 7]] });
  areas.push({ k: 'park', p: rect(rx0 + 9, rz0 + 9, rx1 - 9, rz1 - 9) });
  // The stone base: two piers either side of the arch (5 m wide), and the
  // wall stubs.
  blockers.push({ p: rect(x - 14, z - 6, x - 2.5, z + 6) }, { p: rect(x + 2.5, z - 6, x + 14, z + 6) });
  blockers.push({ p: rect(x - 34, z - 1.5, x - 14, z + 1.5) }, { p: rect(x + 14, z - 1.5, x + 30, z + 1.5) });
  landmarks.push({ type: 'sungnyemun', x, z });
  landmarks.push({ type: 'citywall', x: x - 24, z, len: 20, ry: Math.PI / 2, gates: 0 });
  landmarks.push({ type: 'citywall', x: x + 22, z, len: 16, ry: Math.PI / 2, gates: 0 });
  landmarks.push({ type: 'sign', x: x + 8, z: z + 16, ry: 0, title: SUNGNYEMUN.title, text: SUNGNYEMUN.text });
  pois.push({ kind: 'landmark', x, z: z + 10, name: N('숭례문 (남대문)', 'Sungnyemun (Namdaemun)', '崇礼門（南大門）', '崇礼门（南大门）') });
}

// ---------- Heunginjimun (흥인지문, Dongdaemun) ----------
// On an island in Jongno, which splits round it, north of the Cheonggyecheon
// strip. Its real spot (world -1019, -737) is under the strip's north row
// of towers, so it stands just north of them, straight up from Ogansugyo
// Bridge (world x -1004); it moves with the strip. The arch runs east-west;
// the half-moon ongseong wraps its east side, open to the north. A walk
// comes from the south road (the link from Ogansugyo Bridge), crosses the
// lawn, goes through the arch and out of the ongseong.
export const HEUNG = { x: -1004, z: -843, ring: [-1070, -800, -938, -885] };
{
  const { x, z, ring: [rx0, rz0, rx1, rz1] } = HEUNG;
  roads.push({ k: 'primary', w: 14, p: [[rx0, rz0], [rx1, rz0], [rx1, rz1], [rx0, rz1], [rx0, rz0]], n: N('종로', 'Jongno', '鍾路', '钟路') });
  areas.push({ k: 'park', p: rect(rx0 + 9, rz1 + 9, rx1 - 9, rz0 - 9) });
  roads.push({ k: 'walk', w: 4, p: [[x, rz0 - 7], [x, z + 14], [x - 20, z + 14], [x - 20, z], [x + 10, z], [x + 10, rz1 + 7]] });
  // The base: piers north and south of the arch; the ongseong's ring of wall
  // (east of the base, open on its north side).
  blockers.push({ p: rect(x - 6, z - 12, x + 6, z - 2.5) }, { p: rect(x - 6, z + 2.5, x + 6, z + 12) });
  const Rr = 20, cx = x + 6;
  const arc = [];
  for (let a = -Math.PI / 2; a <= Math.PI / 2 - 0.5; a += Math.PI / 14) arc.push([r1(cx + Math.cos(a) * Rr * 0.9), r1(z - Math.sin(a) * Rr)]);
  for (let i = 1; i < arc.length; i++) {
    const [ax, az] = arc[i - 1], [bx, bz] = arc[i];
    const nx = (az - bz), nz = (bx - ax), l = Math.hypot(nx, nz) || 1, k = 1.4 / l;
    blockers.push({ p: [[ax + nx * k, az + nz * k], [bx + nx * k, bz + nz * k], [bx - nx * k, bz - nz * k], [ax - nx * k, az - nz * k]] });
  }
  landmarks.push({ type: 'heunginjimun', x, z, ry: Math.PI / 2 }); // the name board faces east, into the ongseong
  landmarks.push({ type: 'wall', p: arc, h: 6 });
  landmarks.push({ type: 'citywall', x, z: z - 22, len: 20, gates: 0 });
  landmarks.push({ type: 'citywall', x, z: z + 22, len: 20, gates: 0 });
  blockers.push({ p: rect(x - 2, z - 32, x + 2, z - 12) }, { p: rect(x - 2, z + 12, x + 2, z + 32) });
  landmarks.push({ type: 'sign', x: x - 12, z: z + 20, ry: 0, title: HEUNGINJIMUN.title, text: HEUNGINJIMUN.text });
  pois.push({ kind: 'landmark', x, z: z - 14, name: N('흥인지문 (동대문)', 'Heunginjimun (Dongdaemun)', '興仁之門（東大門）', '兴仁之门（东大门）') });
}

// ---------- Into the district's own metres ----------
const [ox, oz] = OFFSET;
const L = (p) => p.map(([x, z]) => [r1(x - ox), r1(z - oz)]);
const Lx = (o) => ({ ...o, x: r1(o.x - ox), z: r1(o.z - oz), ...(o.p ? { p: L(o.p) } : {}) });
const map = {
  meta: {
    district: 'euljiro',
    parts: [],
    source: 'OpenStreetMap streets at 1/4 (© OpenStreetMap contributors, ODbL; scripts/data/euljiro-osm.json); buildings and shops are fictional, DDP and Namsangol at game size. Built by scripts/build-euljiro.mjs',
  },
  roads: roads.map((r) => ({ ...r, p: L(r.p) })),
  buildings: allBuildings.map((b) => ({ ...b, p: L(b.p) })),
  rail: [],
  areas: areas.map((a) => ({ ...a, p: L(a.p) })),
  blockers: blockers.map((b) => ({ p: L(b.p) })),
  pois: pois.map(Lx),
  landmarks: landmarks.map((l) => (l.type === 'wall' ? { ...l, p: L(l.p) } : Lx(l))),
};
// The folk games' solid props, round the yard as the game places them.
map.blockers.push(...folkBlockers(map.landmarks.find((l) => l.type === 'folkyard')));
// For the overlap check: the main part in strips (its north edge follows
// the streets), and the three parts of their own.
const inMain = (p) => p.every(([x, z]) => x + ox >= EDGE.west - 1 && x + ox <= EDGE.east + 3 && z + oz > -700 && z + oz < -400);
const main = { buildings: map.buildings.filter((b) => inMain(b.p)), roads: map.roads.filter((r) => inMain(r.p)), areas: map.areas.filter((a) => inMain(a.p)) };
map.meta.parts = [
  ...strips(main, 25, 'DDP, the park, the fashion malls and the streets round them'),
  { why: 'Namsangol Hanok Village and its walk up to Toegye-ro', box: L([[hx0 - 1, toegyeAtGate + 8], [hx1 + 1, hz1 + 1]]).flat() },
  { why: 'Sungnyemun on its island', box: L([[GATE.ring[0], GATE.ring[1]], [GATE.ring[2], GATE.ring[3]]]).flat() },
  { why: 'Heunginjimun on its island, north of the Cheonggyecheon strip', box: L([[HEUNG.ring[0], HEUNG.ring[1]], [HEUNG.ring[2], HEUNG.ring[3]]]).flat() },
];

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writeFileSync(path.join(R, 'districts', 'euljiro.json'), JSON.stringify(map, null, 1) + '\n');
  // stores.json is hand-formatted, so only the "at" of each placed shop is
  // rewritten in the text.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const setAt = (sid, at) => {
    const m = new RegExp(`"id":\\s*"${sid}"`).exec(stores);
    if (!m) throw new Error(`${sid}: not in stores.json`);
    const i = m.index;
    let end = stores.indexOf('{"id"', i + 5), end2 = stores.indexOf('\n    {', i);
    end = Math.min(...[end, end2, stores.length].filter((v) => v > 0));
    const part = stores.slice(i, end).replace(/"at":\s*\[[^\]]*\]/, (s) => (s.includes(': ') ? `"at": [${at[0]}, ${at[1]}]` : `"at":[${at[0]},${at[1]}]`));
    stores = stores.slice(0, i) + part + stores.slice(end);
  };
  const used = new Set();
  for (const [rows, ids, opt] of GROUPS) {
    let free = rows.flatMap((rowId) => (t.lots[rowId] || []).map((at, i) => ({ key: `${rowId}:${i}`, at }))).filter((l) => !used.has(l.key));
    if (opt?.near) free.sort((a, b) => Math.hypot(a.at[0] - opt.near[0], a.at[1] - opt.near[1]) - Math.hypot(b.at[0] - opt.near[0], b.at[1] - opt.near[1]));
    if (free.length < ids.length) throw new Error(`${rows}: ${free.length} free lots for ${ids.length} shops`);
    ids.forEach((sid, i) => { used.add(free[i].key); setAt(sid, free[i].at); });
  }
  for (const [sid, at] of Object.entries(MALL_SHOPS)) setAt(sid, at);
  // DDP Hall: its way in, on Eulji-ro's side.
  setAt('ddp-hall', [DDP.x, r1(ddpSouth + 1.5)]);
  writeFileSync(path.join(R, 'stores.json'), stores);
  console.log(`euljiro: ${map.roads.length} roads, ${map.buildings.length} buildings; DDP's middle ${DDP.why} from the real one`);
  console.log(`  park middle [${parkMid}], Igansumun [${IGANSUMUN}], DDP's way in [${DDP.x}, ${ddpSouth}], Namsangol gate [${g}, ${hz0}]`);
  for (const [k, v] of Object.entries(t.lots)) console.log('  ', k, v.length);
  for (const e of stationExits()) console.log(`  station exit ${e.n}: [${e.at}], ry ${e.ry} (${r1(Math.hypot(e.at[0] - e.real[0], e.at[1] - e.real[1]))} m from the real one)`);
}
