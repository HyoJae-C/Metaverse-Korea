#!/usr/bin/env node
// Builds the Euljiro & Dongdaemun district map
// (public/regions/seongsu/districts/euljiro.json) from the hand-made layout
// below.
//
// Jung-gu between Cheonggyecheon and Namsan, loosely after the real streets
// (OpenStreetMap, © OpenStreetMap contributors): Euljiro (Eulji-ro) along the
// north edge, just south of the Cheonggyecheon strip; Toegye-ro along the
// south; Changgyeonggung-ro and Jangchungdan-ro crossing north to south. Kept small on purpose: Dongdaemun Design Plaza (DDP) with
// Dongdaemun History & Culture Park and a stretch of the Seoul City Wall on
// its west side, Changgyeonggung-ro along the west edge, and the Dongdaemun
// fashion malls across Jangchungdan-ro. (Euljiro's old alleys further west
// were left out: the game has plenty of streets of small shops already.)
// South of Toegye-ro, Namsangol Hanok Village (moved in from Pil-dong, not to
// scale): five hanok round a yard, inside a wall. Away to the west, on
// its own part of the map (at its real spot, where Toegye-ro starts),
// Sungnyemun (Namdaemun) on its lawn island inside a ring of road.
//
//   node scripts/build-euljiro.mjs
//
// Coordinates are metres: x east, z south. (0, 0) is the centre of DDP (the
// district's anchor in region.json).

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/regions/seongsu/districts/euljiro.json');

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const r1 = (v) => Math.round(v * 10) / 10;

// Street lines.
export const EULJIRO = {
  euljiro: -72, toegye: 85, // z of the two east-west roads
  // x of the north-south roads. Changgyeonggung-ro is the west edge; it goes
  // on north (a region link) through the gap in the Cheonggyecheon towers to
  // Baeogae Bridge (world x -1133).
  changgyeong: -133, jangchung: 65,
  west: -133, east: 160,
  ddp: { x: -8, z: 0, rx: 52, rz: 36 },
  park: [-124, -62, -72, 76], // Dongdaemun History & Culture Park
  wall: { x: -104, z0: -50, z1: 40 }, // the Seoul City Wall stretch in the park
  hanok: { box: [-128, 97, -24, 152], gate: -76, yard: [-100, 104, -52, 124] }, // Namsangol, south of the park
  mall: [74, -62, 156, 75],
  // Sungnyemun: its own part, at the gate's real spot on the Seoul grid
  // (37.5600, 126.9753 is world -1774, -429; this district's offset is
  // -1000, -525).
  gate: { x: -774, z: 96, ring: [-828, 60, -720, 132] },
  // Heunginjimun: its own part north of the Cheonggyecheon strip. Its real
  // spot (37.5711, 127.0095: world -1019, -737) is under the strip's north
  // row of towers, so it stands just north of them, straight up from
  // Ogansugyo Bridge (world x -1004). Jongno runs east-west through it.
  heung: { x: -4, z: -318, ring: [-70, -275, 62, -360] },
};
const E = EULJIRO;

const roads = [
  { k: 'primary', w: 16, p: [[E.west, E.euljiro], [E.east, E.euljiro]], n: N('을지로', 'Eulji-ro', '乙支路', '乙支路') },
  { k: 'primary', w: 16, p: [[E.west, E.toegye], [E.east, E.toegye]], n: N('퇴계로', 'Toegye-ro', '退渓路', '退溪路') },
  { k: 'tertiary', w: 9, p: [[E.changgyeong, E.euljiro], [E.changgyeong, E.toegye]], n: N('창경궁로', 'Changgyeonggung-ro', '昌慶宮路', '昌庆宫路') },
  { k: 'secondary', w: 12, p: [[E.jangchung, E.euljiro], [E.jangchung, E.toegye]], n: N('장충단로', 'Jangchungdan-ro', '奨忠壇路', '奖忠坛路') },
  // Into Namsangol through its gate.
  { k: 'walk', w: 6, p: [[E.hanok.gate, E.toegye + 8], [E.hanok.gate, E.hanok.yard[1]]] },
  // Between the two fashion malls.
  { k: 'walk', w: 6, p: [[E.jangchung + 6, 6], [E.east, 6]], n: N('패션타운길', 'Fashion Town Lane', 'ファッションタウン通り', '时装城小路') },
  // Through the park, round DDP's front.
  { k: 'walk', w: 6, p: [[E.park[2] - 6, -40], [E.park[2] - 6, 60], [E.jangchung - 6, 60]] },
];

const buildings = [];
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function row(x0, x1, z0, z1, hMin, hMax) {
  for (let x = x0; x < x1 - 7;) {
    const w = Math.min(9 + Math.floor(rnd() * 6), x1 - x);
    buildings.push({ h: Math.round(hMin + rnd() * (hMax - hMin)), p: rect(r1(x), z0, r1(x + w), z1) });
    x += w + 1.2;
  }
}
// South of Toegye-ro, east of Namsangol: one row facing the road.
row(E.hanok.box[2] + 6, E.jangchung - 6, 95, 110, 14, 26);
// The fashion malls: two big blocks east of Jangchungdan-ro, open late.
const [mx0, mz0, mx1, mz1] = E.mall;
buildings.push({ h: 38, p: rect(mx0, mz0, mx1, 2), n: N('패션몰', 'Fashion mall', 'ファッションモール', '时装商场') });
buildings.push({ h: 30, p: rect(mx0, 10, mx1, mz1), n: N('패션몰', 'Fashion mall', 'ファッションモール', '时装商场') });

// Namsangol Hanok Village: five hanok round the yard.
const [hx0, hz0, hx1, hz1] = E.hanok.box;
for (const p of [rect(-120, 130, -96, 144), rect(-88, 132, -64, 146), rect(-56, 130, -32, 144), rect(-122, 104, -108, 124), rect(-44, 104, -30, 124)]) {
  buildings.push({ h: 5, hanok: 1, p });
}

const areas = [
  { k: 'park', p: rect(...E.park) },
  { k: 'plaza', p: rect(E.park[2], 46, E.jangchung - 7, 76) }, // DDP's front plaza
  { k: 'plaza', p: rect(...E.hanok.yard) }, // the folk games yard
  { k: 'grass', p: rect(hx0 + 2, hz0 + 2, hx1 - 2, hz1 - 2) },
];

// DDP is one long, curved silver building, running a little south-west to
// north-east like the real one: a superellipse, fuller at its east end, and
// turned. The landmark is drawn from this same outline.
const { ddp } = E;
const ddpLocal = [];
for (let i = 0; i < 32; i++) {
  const a = (i / 32) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  const k = 1 + 0.16 * Math.cos(a) - 0.06 * Math.cos(2 * a + 0.8);
  const x = ddp.rx * k * Math.sign(c) * Math.abs(c) ** 0.7, z = ddp.rz * k * Math.sign(s) * Math.abs(s) ** 0.7;
  const t = -0.18;
  ddpLocal.push([r1(x * Math.cos(t) - z * Math.sin(t)), r1(x * Math.sin(t) + z * Math.cos(t))]);
}
const ddpOutline = ddpLocal.map(([x, z]) => [r1(ddp.x + x), r1(ddp.z + z)]);

// DDP is a building drawn by its landmark (custom): it is still a wall, and
// its shop can have a front on it.
buildings.push({ h: 16, custom: 1, p: ddpOutline, n: N('동대문디자인플라자', 'Dongdaemun Design Plaza', '東大門デザインプラザ', '东大门设计广场') });

// Walls you can't walk through: the city wall, Namsangol's wall (a gap
// at the gate).
const g = E.hanok.gate;
const blockers = [
  { p: rect(E.wall.x - 1.5, E.wall.z0, E.wall.x + 1.5, E.wall.z1) },
  { p: rect(hx0, hz0 - 0.8, g - 3, hz0 + 0.8) }, { p: rect(g + 3, hz0 - 0.8, hx1, hz0 + 0.8) },
  { p: rect(hx0 - 0.8, hz0, hx0 + 0.8, hz1) }, { p: rect(hx1 - 0.8, hz0, hx1 + 0.8, hz1) },
  { p: rect(hx0, hz1 - 0.8, hx1, hz1 + 0.8) },
];

// The board by Heunginjimun (facts checked 2026-11-07).
const HEUNGINJIMUN = {
  title: N('흥인지문', 'Heunginjimun', '興仁之門', '兴仁之门'),
  text: {
    ko: '한양도성의 동쪽 정문, 흔히 동대문이라고 불러요. 지금의 문은 1869년에 다시 지은 것이에요. 사대문 가운데 유일하게 문 앞을 반달 모양 성벽(옹성)이 감싸고 있어요.',
    en: 'The great east gate of Seoul\'s old city wall, often called Dongdaemun. The gate standing today was rebuilt in 1869. It is the only one of the four great gates with an ongseong, the half-moon wall that wraps round its front.',
    ja: '漢陽都城の東の正門で、よく東大門と呼ばれます。今の門は1869年に建て直されたものです。四大門の中で唯一、門の前を半月形の城壁（甕城）が囲んでいます。',
    zh: '汉阳都城的东正门，常被称为东大门。现在的城门是1869年重建的。它是四大门中唯一一座门前有半月形瓮城环绕的城门。',
  },
};

// The board by Sungnyemun (facts checked 2026-11-07: Cultural Heritage
// Administration / Korea Heritage Service).
const SUNGNYEMUN = {
  title: N('숭례문', 'Sungnyemun', '崇礼門', '崇礼门'),
  text: {
    ko: '한양도성의 남쪽 정문으로 1398년에 처음 세워졌어요. 2008년 화재로 크게 불탔고 2013년에 복구됐어요. 국보로 지정된 첫 문화유산이에요.',
    en: 'The south gate of Seoul\'s old city wall, first built in 1398. A fire badly burned it in 2008, and it was restored in 2013. It was the first site named a National Treasure of Korea.',
    ja: '漢陽都城の南の正門で、1398年に建てられました。2008年の火災で大きく焼け、2013年に復元されました。韓国の国宝に最初に指定された文化遺産です。',
    zh: '汉阳都城的南正门，始建于1398年。2008年遭大火严重焚毁，2013年修复。它是韩国第一个被指定为国宝的文化遗产。',
  },
};

const landmarks = [
  { type: 'ddp', x: ddp.x, z: ddp.z, outline: ddpLocal }, // (not "p": that would be moved as world points)
  { type: 'citywall', x: E.wall.x, z: (E.wall.z0 + E.wall.z1) / 2, len: E.wall.z1 - E.wall.z0 },
  { type: 'wall', p: [[g + 3, hz0], [hx1, hz0], [hx1, hz1], [hx0, hz1], [hx0, hz0], [g - 3, hz0]], h: 2.6 },
  { type: 'hanokgate', x: g, z: hz0 },
  { type: 'arch', x: E.jangchung + 9, z: 6, w: 6, ry: Math.PI / 2, title: 'DONGDAEMUN FASHION TOWN', sub: '동대문 패션타운', color: '#c2185b' },
];

const pois = [
  { kind: 'landmark', x: ddp.x, z: ddp.z, name: N('동대문디자인플라자 (DDP)', 'Dongdaemun Design Plaza (DDP)', '東大門デザインプラザ（DDP）', '东大门设计广场 (DDP)') },
  { kind: 'landmark', x: -104, z: 60, name: N('동대문역사문화공원', 'Dongdaemun History & Culture Park', '東大門歴史文化公園', '东大门历史文化公园') },
  { kind: 'landmark', x: E.wall.x, z: E.wall.z0 - 4, name: N('한양도성 성곽', 'Seoul City Wall', '漢陽都城の城壁', '汉阳都城城墙') },
  { kind: 'landmark', x: 115, z: 6, name: N('동대문 패션타운', 'Dongdaemun Fashion Town', '東大門ファッションタウン', '东大门时装城') },
  { kind: 'landmark', x: E.hanok.gate, z: 114, name: N('남산골 한옥마을', 'Namsangol Hanok Village', '南山コル韓屋村', '南山谷韩屋村') },
];

// Sungnyemun (숭례문, Namdaemun): the south gate of the old city wall. A ring
// road round a lawn island; the gate in the middle with short stretches of
// the restored wall either side; a path through its arch (people walk
// through it today).
{
  const { x, z, ring: [rx0, rz0, rx1, rz1] } = E.gate;
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

// Heunginjimun (흥인지문, Dongdaemun): on an island in Jongno, which splits
// round it. The arch runs east-west; the half-moon ongseong wraps its east
// side, open to the north. A walk comes from the south road (the link from
// Ogansugyo Bridge), crosses the lawn, goes through the arch and out of the
// ongseong.
{
  const { x, z, ring: [rx0, rz0, rx1, rz1] } = E.heung;
  roads.push({ k: 'primary', w: 14, p: [[rx0, rz0], [rx1, rz0], [rx1, rz1], [rx0, rz1], [rx0, rz0]], n: N('종로', 'Jongno', '鍾路', '钟路') });
  areas.push({ k: 'park', p: rect(rx0 + 9, rz1 + 9, rx1 - 9, rz0 - 9) });
  roads.push({ k: 'walk', w: 4, p: [[x, rz0 - 7], [x, z + 14], [x - 20, z + 14], [x - 20, z], [x + 10, z], [x + 10, rz1 + 7]] });
  // The base: piers north and south of the arch; the ongseong's ring of wall
  // (east of the base, open on its north side).
  blockers.push({ p: rect(x - 6, z - 12, x + 6, z - 2.5) }, { p: rect(x - 6, z + 2.5, x + 6, z + 12) });
  const R = 20, cx = x + 6;
  const arc = [];
  for (let a = -Math.PI / 2; a <= Math.PI / 2 - 0.5; a += Math.PI / 14) arc.push([r1(cx + Math.cos(a) * R * 0.9), r1(z - Math.sin(a) * R)]);
  for (let i = 1; i < arc.length; i++) {
    const [ax, az] = arc[i - 1], [bx, bz] = arc[i];
    const nx = (az - bz), nz = (bx - ax), l = Math.hypot(nx, nz) || 1, t = 1.4 / l;
    blockers.push({ p: [[ax + nx * t, az + nz * t], [bx + nx * t, bz + nz * t], [bx - nx * t, bz - nz * t], [ax - nx * t, az - nz * t]] });
  }
  landmarks.push({ type: 'heunginjimun', x, z, ry: Math.PI / 2 }); // the name board faces east, into the ongseong
  landmarks.push({ type: 'wall', p: arc, h: 6 });
  landmarks.push({ type: 'citywall', x, z: z - 22, len: 20, gates: 0 });
  landmarks.push({ type: 'citywall', x, z: z + 22, len: 20, gates: 0 });
  blockers.push({ p: rect(x - 2, z - 32, x + 2, z - 12) }, { p: rect(x - 2, z + 12, x + 2, z + 32) });
  landmarks.push({ type: 'sign', x: x - 12, z: z + 20, ry: 0, title: HEUNGINJIMUN.title, text: HEUNGINJIMUN.text });
  pois.push({ kind: 'landmark', x, z: z - 14, name: N('흥인지문 (동대문)', 'Heunginjimun (Dongdaemun)', '興仁之門（東大門）', '兴仁之门（东大门）') });
}

const map = {
  meta: {
    district: 'euljiro',
    // For the overlap check: Sungnyemun is a part of its own, far to the west.
    parts: [
      { why: 'DDP, the park, the fashion malls and Namsangol', box: [E.west, E.euljiro, E.east, 152] },
      { why: 'Sungnyemun on its island', box: E.gate.ring },
      { why: 'Heunginjimun on its island, north of the Cheonggyecheon strip', box: [E.heung.ring[0], E.heung.ring[2], E.heung.ring[1], E.heung.ring[3]] },
    ],
    source: 'hand-made (game map, not to scale; loosely after Euljiro, Dongdaemun and Pil-dong, Jung-gu, street lines from OpenStreetMap © OpenStreetMap contributors, ODbL). Built by scripts/build-euljiro.mjs',
  },
  roads, buildings, rail: [], areas, blockers, pois, landmarks,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(out, JSON.stringify(map, null, 1) + '\n');
  console.log(`euljiro.json: ${roads.length} roads, ${buildings.length} buildings`);
}
