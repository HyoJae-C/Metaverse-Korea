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
//     at game size it only fits east of the park and Jangchungdan-ro.
//   - Dongdaemun History & Culture Park: the corner between DDP,
//     Jangchungdan-ro and Eulji-ro, with a stretch of the city wall and its
//     water gate (Igansumun).
//   - The fashion malls: across Jangchungdan-ro (like Migliore and its
//     neighbours) and east of DDP round Fashion Town Lane.
//   - Elsewhere one row of buildings along each street (Yozi, 2026-11-10),
//     west to Changgyeonggung-ro (by Euljiro 4-ga) and north to
//     Cheonggyecheon-ro's south road (scripts/cheonggyecheon-line.mjs).
//   - Namsangol Hanok Village at its real place south of Toegye-ro by
//     Chungmuro (a part of its own), at game size: five hanok round a yard.
//   - Sungnyemun on its lawn island where Toegye-ro starts, and Heunginjimun
//     just north of Cheonggyecheon-ro: parts of their own.
//
// Run scripts/build-cheonggyecheon.mjs after this one: it keeps its rows
// off these streets.
//
//   node scripts/build-euljiro.mjs          writes the map and sets the "at"
//                                           of the shops in SHOPS (stores.json)
//
// Coordinates here are world metres (x east, z south; src/core/seoul-grid.js);
// the map is written in the district's own metres (minus OFFSET).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { folkBlockers, FOLK_GAMES_ON } from '../src/data/folk-yard.js';
import { r1, name as N4, town, nearestOn, pointAt, lengthOf, strips, lineDist, inPoly } from './street-rows.mjs';
import { SOUTH as CG_SOUTH, NORTH as CG_NORTH, zAt, BRIDGES, at as cgAt } from './cheonggyecheon-line.mjs';

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
// The main part: from Changgyeonggung-ro east to Sindang, from Toegye-ro and
// Dasan-ro north to Cheonggyecheon-ro's south road.
export const EDGE = { west: -1273, east: -842, south: -468 };
const southRoadZ = (x) => zAt(CG_SOUTH, x); // its middle
// A street coming up from the south, up to the south road (cut where it meets it).
function upToSouthRoad(p) {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], fa = a[1] - southRoadZ(a[0]), fb = b[1] - southRoadZ(b[0]);
    if (fa > 0 && fb <= 0) { const k = fa / (fa - fb); out.push([r1(a[0] + (b[0] - a[0]) * k), r1(a[1] + (b[1] - a[1]) * k)]); return out; }
    out.push(b);
  }
  return out;
}
// Changgyeonggung-ro: from Toegye-ro north across Eulji-ro to the south road
// at Baeogae Bridge (the export starts 22 m north of Toegye-ro).
export const CHANGG = upToSouthRoad([[-1263.5, -490], ...street('Changgyeonggung-ro')]);
const changgX = (z) => { const p = CHANGG; for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]]; if ((a[1] - z) * (b[1] - z) <= 0) return a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]); } return EDGE.west; };
export const EULJI = between(street('Eulji-ro'), -1271, -974.2);
const toegyeAll = street('Toegye-ro');
export const TOEGYE = [...between(toegyeAll, -1263.5, -871), [-840, -581]]; // on east towards Sindang (the export stops at Dasan-ro)
// Jangchungdan-ro: from the south up to the south road, at Ogansugyo Bridge.
export const JANG = upToSouthRoad(betweenZ(street('Jangchungdan-ro'), -475, -720));
export const DASAN = betweenZ(street('Dasan-ro'), -577, -470);

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
  { k: 'secondary', w: 10, p: CHANGG, n: NAME.changg },
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
const PARK_N = -656; // (level with DDP's north side)
const PARK = [[jangEast(-603), -603], [-992, euljiNorth(-992)], [-992, -630], [-1012, PARK_N], [jangEast(PARK_N), PARK_N]];
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
const MALL_N = rect(MX0, -655, MX1, LANE_Z - 4);
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
const inside = ([x, z]) => x > changgX(z) + 0.5 && x < EDGE.east && z > southRoadZ(x) && z < EDGE.south;
const open = [{ p: PARK }, { p: ddpWorld }, { p: MALL_N }, { p: MALL_S }, ...exitSquares];
// (Cheonggyecheon-ro's south road is in the Gyeongbokgung map; kept clear too)
const t = town(7, { inside, roads: [...roads, { w: 9, p: CG_SOUTH }], open });
t.buildings.push(...buildings.filter((b) => b.p !== ddpWorld)); // (DDP and the malls are in `open`)
const SHOP = { w: [10, 16], h: [6, 14], depth: 15 };
const MALL = { w: [20, 30], h: [24, 40], depth: 26 };
// Across Jangchungdan-ro from DDP: big fashion malls up to the strip.
t.row('jangW', JANG.filter(([, z]) => z <= -594), -1, { off: 7.5, ...MALL, gap: 2 });
t.row('euljiNw', between(EULJI, -1271, -1133), -1, { off: 9.5, ...SHOP });
t.row('euljiN', between(EULJI, -1133, -1057), -1, { off: 9.5, ...MALL, gap: 2 });
// South of Eulji-ro, between it and Toegye-ro, and on.
t.row('euljiS', EULJI, 1, { off: 9.5, ...SHOP });
t.row('toegyeN', between(TOEGYE, -1263.5, -1000), -1, { off: 9.5, ...SHOP });
t.row('toegyeS', TOEGYE, 1, { off: 9.5, ...SHOP });
t.row('jangE', JANG.filter(([, z]) => z >= -596), 1, { off: 7.5, ...SHOP });
t.row('jangWs', JANG.filter(([, z]) => z >= -596), -1, { off: 7.5, ...SHOP });
t.row('dasanE', DASAN, -1, { off: 6.5, ...SHOP });
t.row('dasanW', DASAN, 1, { off: 6.5, ...SHOP });
t.row('changgE', CHANGG, 1, { off: 7, ...SHOP });
// Facing Cheonggyecheon across its south road: Euljiro's lighting shops,
// and small fashion shops in front of the malls.
t.row('stripS', between(CG_SOUTH, -1273, EDGE.east), 1, { off: 8, ...SHOP, depth: 12 });
for (const b of t.buildings) if (!b.n && (b.h > 20)) b.n = N('패션몰', 'Fashion mall', 'ファッションモール', '时装商场');
// (the malls round the lane are already in t.buildings: keep DDP first)
const allBuildings = [buildings[0], ...t.buildings];

// Shops along the rows: the info centre by the station, the bank on Toegye-ro.
const GROUPS = [
  [['euljiS', 'jangE'], ['info-euljiro'], { near: OSM.places['Dongdaemun History & Culture Park Station (Eulji-ro x Jangchungdan-ro)'].at }],
  [['toegyeS'], ['seoul-bank'], { near: [-1000, -560] }],
  [['stripS'], ['bitdam-hanji', 'dalbit-lighting', 'neon-golmok', 'mojeon-lamp', 'banjjak-bulbs'], { near: [-1240, -655] }],
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

// The boards by the gates (facts checked 2026-11-07; the four boards and King Yeongjo's 1743 poem from Yozi, 2026-11-11).
const HEUNGINJIMUN = {
  title: N('흥인지문', 'Heunginjimun', '興仁之門', '兴仁之门'),
  text: {
    ko: '한양도성의 동쪽 정문, 흔히 동대문이라고 불러요. 지금의 문은 1869년에 다시 지은 것이에요. 사대문 가운데 유일하게 문 앞을 반달 모양 성벽(옹성)이 감싸고 있어요. 편액은 네 개예요. "흥인지문" 현판 두 개(글씨는 퇴계 이황이 썼다고 전해져요), 1869년에 다시 지은 기록, 그리고 1743년 영조가 정릉에 다녀오다 이 문에 올라 지은 시예요. "마음은 오직 백성을 위한 정성에 있네."',
    en: 'The great east gate of Seoul\'s old city wall, often called Dongdaemun. The gate standing today was rebuilt in 1869. It is the only one of the four great gates with an ongseong, the half-moon wall that wraps round its front. Four boards hang on it: two name boards (the writing is said to be by the scholar Yi Hwang, called Toegye), a record of the 1869 rebuilding, and a poem King Yeongjo wrote in 1743 when he climbed the gate on his way back from Jeongneung: "My heart lies only in sincerity for the people."',
    ja: '漢陽都城の東の正門で、よく東大門と呼ばれます。今の門は1869年に建て直されたものです。四大門の中で唯一、門の前を半月形の城壁（甕城）が囲んでいます。扁額は四つあります。「興仁之門」の額が二つ（字は学者・李滉（退渓）の筆と伝わります）、1869年の再建の記録、そして1743年に英祖が貞陵からの帰りにこの門に登って詠んだ詩です。「心はただ民のための誠にあり」。',
    zh: '汉阳都城的东正门，常被称为东大门。现在的城门是1869年重建的。它是四大门中唯一一座门前有半月形瓮城环绕的城门。城门上有四块匾额：两块“兴仁之门”匾（字传为学者李滉（退溪）所写）、一块1869年重建的记录，还有一块是1743年英祖从贞陵回来时登上此门所作的诗：“一心惟在为民诚。”',
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
// At half the real size (Yozi, 2026-11-11; the model is heungGate in
// src/core/euljiro-models.js, these sizes are its HEUNG_GATE): the base
// 13 m along the wall and 8 m through, stepped wing walls 3.6 m either side,
// and the ongseong, a half-moon wall 11.5 m out round its east front, open
// to the north. Its real spot (OSM.places.Heunginjimun) is only 37 m north
// of the stream and Cheonggyecheon is game width here
// (scripts/cheonggyecheon-line.mjs), so the gate stands HEUNG.why m north of
// it: as far south as it goes with the ongseong's hedge clear of
// Cheonggyecheon-ro's north road and the walk round it. Jongno splits round
// it like the real one, in a U: the island's south side is the north road
// itself. A walk comes up from the north road (the link from Ogansugyo
// Bridge), round the west side, through the arch, across the ongseong's
// yard and out of its open north side. The wall goes on north of the gate
// (the real one south of it is gone). Pines, trees and wild flowers round
// the lawn, like the real Heunginjimun Park beside it.
export const HEUNG_SIZE = { W: 13, D: 8, A: 1.3, wing: 3.6, R: 11.5, rx: 10.4 };
export const HEUNG = (() => {
  const real = OSM.places.Heunginjimun, w = 12, { R } = HEUNG_SIZE;
  const x = real[0];
  const bx = Math.round(cgAt(BRIDGES.find((b) => b.name.en.startsWith('Ogansugyo')).u)[0]);
  const lawnS = (q) => zAt(CG_NORTH, q) - 4.5; // the north road's north edge
  let edge = Infinity;
  for (let q = x - 20; q <= x + 20; q += 2) edge = Math.min(edge, lawnS(q));
  const z = Math.floor(edge - 4 - R - 1.5); // the walk (4 m), the ongseong, its hedge
  const rx0 = x - 32, rx1 = x + 34, rz1 = z - 24; // the ring road's middle: west, east, north (6 m clear of the wall north of the gate)
  return { x, z, w, bx, edge, ring: [rx0, z, rx1, rz1], south: [zAt(CG_NORTH, rx0), zAt(CG_NORTH, rx1)], real, why: r1(Math.hypot(x - real[0], z - real[1])) };
})();
// Jongno's real line (OSM, euljiro-ddp export) comes in from the west at
// about z -740 and leaves east-south-east past z -764 towards Dongmyo. The
// gate here is game size, so Jongno can't run on its real line right past
// it: it goes up round the gate's north side, cutting the corners to stay
// near the real line (median 10 m, at most 33 m at the north side, where
// the wall north of the gate is), and on east to Dongmyo's Jong-ro
// (DONGMYO_JONGNO, the start of the link in region.json). The island's east
// side down to Cheonggyecheon-ro is a road of its own without a name (the
// real Jongno doesn't go there).
const DONGMYO_JONGNO = [-948, -767];
{
  const { x, z, w, ring: [rx0, , rx1, rz1], south: [s0, s1] } = HEUNG;
  const nw = [rx0, z + 3], ne = [x + 10, rz1], turn = [rx1, -767]; // where the west side turns up, the end of the north side, where the east side meets it
  roads.push({ k: 'primary', w, p: [[rx0, s0], nw, [rx0 + 19, rz1], ne, turn, [-960, -764], DONGMYO_JONGNO], n: N('종로', 'Jongno', '鍾路', '钟路') });
  roads.push({ k: 'primary', w, p: [turn, [rx1, s1]] });
  const lawnS = Math.floor(Math.max(s0, s1) - 4.5 - 1); // (z south: the north road's north edge, less 1 m)
  const e = w / 2 + 2, lx0 = rx0 + e, lx1 = rx1 - e, lz1 = rz1 + e, lzS = Math.min(lawnS, zAt(CG_NORTH, x) - 5.5);
  // The lawn: only round the gate and its ongseong, the rest of the island
  // paved, like the real one (mostly road and paving, green in the yard;
  // Yozi 2026-11-11, the whole island green was too much).
  const { W: GW, D: GD, wing: GWING, rx: GRX } = HEUNG_SIZE;
  const gz0 = Math.max(lz1, z - GW / 2 - GWING - 3), gx0 = x - 11, gx1 = Math.min(lx1, x + GD / 2 + GRX + 3);
  areas.push({ k: 'park', p: rect(gx0, gz0, gx1, lzS) });
  // The walk: up from the bridge, west along the lawn's south edge, up the
  // west side, through the arch, across the ongseong's yard and out north.
  const { W, D, A, wing, R: OR, rx: ORX } = HEUNG_SIZE, half = W / 2, wz = HEUNG.edge - 2.5;
  roads.push({ k: 'walk', w: 4, p: [[HEUNG.bx, HEUNG.edge], [HEUNG.bx, wz], [x - 13, wz], [x - 13, z], [x + D / 2 + 3, z], [x + D / 2 + 3, z - OR - 3], [x + D / 2 + 3, rz1 + w / 2 + 1]] });
  // The base (two piers either side of the arch) and its wing walls.
  blockers.push({ p: rect(x - D / 2, z - half, x + D / 2, z - A) }, { p: rect(x - D / 2, z + A, x + D / 2, z + half) });
  blockers.push({ p: rect(x - D * 0.4, z - half - wing, x + D * 0.4, z - half) }, { p: rect(x - D * 0.4, z + half, x + D * 0.4, z + half + wing) });
  // The ongseong: from the south wing's end round the east front, open on
  // the north (its west end stops 5 m short of the north wing).
  const cx = x + D / 2, arc = [];
  for (let a = -Math.PI / 2; a <= Math.PI / 2 - 0.45; a += Math.PI / 16) arc.push([r1(Math.cos(a) * ORX), r1(-Math.sin(a) * OR)]);
  for (let i = 1; i < arc.length; i++) {
    const [ax, az] = arc[i - 1].map((v, k) => v + [cx, z][k]), [bx, bz] = arc[i].map((v, k) => v + [cx, z][k]);
    const nx = (az - bz), nz = (bx - ax), l = Math.hypot(nx, nz) || 1, k = 0.85 / l;
    blockers.push({ p: [[ax + nx * k, az + nz * k], [bx + nx * k, bz + nz * k], [bx - nx * k, bz - nz * k], [ax - nx * k, az - nz * k]] });
  }
  landmarks.push({ type: 'heunginjimun', x, z, ry: Math.PI / 2 }); // the name board faces east, into the ongseong
  landmarks.push({ type: 'ongseong', x: cx, z, arc, h: 3.4 });
  // The wall going on north (at 60%, like the gate).
  landmarks.push({ type: 'citywall', x, z: z - half - wing - 3, len: 10, gates: 0, sc: [0.6, 0.6] });
  blockers.push({ p: rect(x - 1.2, z - half - wing - 6, x + 1.2, z - half - wing) });
  landmarks.push({ type: 'sign', x: x - 9, z: wz - 5, ry: 0, title: HEUNGINJIMUN.title, text: HEUNGINJIMUN.text });
  pois.push({ kind: 'landmark', x, z: z - 14, name: N('흥인지문 (동대문)', 'Heunginjimun (Dongdaemun)', '興仁之門（東大門）', '兴仁之门（东大门）') });
  // Green round it: trees along the island's west edge (pines among
  // them), off the walks.
  const spots = [];
  const tree = (tx, tz) => {
    const offWalk = Math.abs(tx - (x - 13)) > 4 && Math.abs(tz - wz) > 4 && !(Math.abs(tx - (x + D / 2 + 3)) < 4 && tz < z);
    const offGate = Math.hypot(tx - cx, tz - z) > OR + 4 && !(tx > x - D / 2 - 4 && tx < x + D / 2 + 4 && tz > z - half - wing - 9 && tz < z + half + wing + 2);
    if (offWalk && offGate && Math.hypot(tx - (x - 9), tz - (wz - 5)) > 4) spots.push([r1(tx), r1(tz)]);
  };
  for (let tz = lzS - 4; tz > nw[1] - 2; tz -= 6.5) tree(lx0 + 3, tz); // the west side
  // (none on the north side now the lawn stops short of it)
  // (none on the east side: they hid the gate and its ongseong, Yozi 2026-11-11)
  landmarks.push({ type: 'shrinetrees', x, z, spots: spots.map(([tx, tz]) => [r1(tx - x), r1(tz - z)]) });
  // (no wild-flower patches: they sat on the paving now)
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
if (FOLK_GAMES_ON) map.blockers.push(...folkBlockers(map.landmarks.find((l) => l.type === 'folkyard'))); // (hidden for now: no solid props)
// For the overlap check: the main part in strips (its north edge follows
// the streets), and the three parts of their own.
const inMain = (p) => p.every(([x, z]) => x + ox >= EDGE.west - 6 && x + ox <= EDGE.east + 3 && z + oz > -700 && z + oz < -400);
const main = { buildings: map.buildings.filter((b) => inMain(b.p)), roads: map.roads.filter((r) => inMain(r.p)), areas: map.areas.filter((a) => inMain(a.p)) };
map.meta.parts = [
  ...strips(main, 25, 'DDP, the park, the fashion malls and the streets round them'),
  { why: 'Namsangol Hanok Village and its walk up to Toegye-ro', box: L([[hx0 - 1, toegyeAtGate + 8], [hx1 + 1, hz1 + 1]]).flat() },
  { why: 'Sungnyemun on its island', box: L([[GATE.ring[0], GATE.ring[1]], [GATE.ring[2], GATE.ring[3]]]).flat() },
  { why: `Heunginjimun on its island, north of the Cheonggyecheon strip (${HEUNG.why} m north of the real gate: the stream is game width)`, box: L([[HEUNG.ring[0] - HEUNG.w / 2, Math.max(...HEUNG.south) - 4.5], [HEUNG.ring[2] + HEUNG.w / 2, HEUNG.ring[3] - HEUNG.w / 2]]).flat() },
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
