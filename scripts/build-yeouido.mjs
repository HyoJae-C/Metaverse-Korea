#!/usr/bin/env node
// Builds Yeouido (districts/yeouido.json): an island in the middle of the Han
// River, in Yeongdeungpo-gu, with Yeouido Han River Park along its north
// shore. It also rewrites the Han River's water from Mangwon to Banpo-Jamwon
// (region.json "water"[0]) so the river opens around the island, with a gap in
// its blocker for Seogang Bridge.
//
// Real Yeouido is a long island lying along the river: the main channel of
// the Han flows past its north shore (Mapo and Hongdae on the far bank), and
// a narrow arm, the Saetgang, runs along its south side. So the island is
// drawn in its own frame: u along the river (east-south-east), v across it
// (0 on the north shore, growing south into the island).
//
//   north bank (Han River Bike Path, Hongdae)
//   ~~~~~~~~~~~ main channel ~~~~~ Seogang Bridge ║ ~~~~~~~~~~~~~~~~~~~
//   shore  fishing corner │ fireworks lawn │ Mul-bit Square │ info  ── v 0..37
//   ── Han River path ─────────────────────────────────────────────── v 40
//   trees ............................................................
//   ══ Yunjung-ro, cherry trees on both sides ════════════════════════ v 66
//   office towers   [ Yeouido Park, Seoul Dal ]   office towers    63 tower
//   ~~~~~~~~~~~~~~~~~~~~~~ Saetgang ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ v 175..220
//
// Game map, not to scale (see docs/WORLD.md).
//
//   node scripts/build-yeouido.mjs   writes the map and the river, and sets
//                                    the "at" of the places in SPOTS in
//                                    stores.json (world metres)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BARGES } from '../src/core/fireworks-show.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// Where the island sits (world metres): the middle of its north shore. The
// region's district offset is this point, so the map's own metres are
// measured from it.
export const ORIGIN = [-2715, 284];
// The river's direction past Yeouido, along the north bank from Hongdae's
// corner (-2780, -5) to (-2432, 252).
const L = Math.hypot(348, 257);
export const U = [348 / L, 257 / L]; // along the river (x east, z south)
export const V = [-U[1], U[0]]; // across it, away from the north bank
export const at = (u, v) => [r1(u * U[0] + v * V[0]), r1(u * U[1] + v * V[1])];
const world = ([x, z]) => [r1(x + ORIGIN[0]), r1(z + ORIGIN[1])];
const toUV = ([x, z]) => {
  const dx = x - ORIGIN[0], dz = z - ORIGIN[1];
  return [dx * U[0] + dz * U[1], dx * V[0] + dz * V[1]];
};
const rect = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
const FACE_RIVER = Math.atan2(-V[0], -V[1]); // (rotation for something facing the river)
const ALONG_V = Math.atan2(V[0], V[1]);
const ALONG_U = Math.atan2(U[0], U[1]);

// The island's outline (u, v): a long hexagon, pointed at both ends.
export const ISLAND = [[-270, 0], [270, 0], [330, 90], [260, 175], [-260, 175], [-330, 90]];
export const PATH = 40; // the Han River path
const YUNJUNG = 66; // Yunjung-ro, the cherry blossom road
// Seoul Dal's pad in Yeouido Park, south of Yunjung-ro in the middle of the
// island (the real one is on Yeouido Park's lawn, by its management office).
export const DAL_U = -20, DAL_V = 108;
// The Saetgang: the narrow arm of the river along the south side.
const SAETGANG = [[-330, 90], [-260, 175], [260, 175], [330, 90], [310, 232], [-300, 222], [-372, 70]];
// Seogang Bridge: from the Han River Bike Path at Hongdae's corner (where
// "To the Han River" comes down from Hongdae) straight across the main
// channel to the island.
export const BRIDGE_NORTH = [-2776.7, -16.7]; // world
const [BRIDGE_U, BRIDGE_V] = toUV(BRIDGE_NORTH);
export const BRIDGE_W = 12;

// The Han River from Mangwon to Banpo-Jamwon (world metres): the old north
// bank, and on the south side the island's north shore, so the main channel
// flows past Yeouido and the Saetgang joins it at both ends.
function river() {
  const north = [[-3142, -52], [-2780, -5], [-2570, 90], [-2432, 252], [-2312, 452], [-2160, 640], [-1905, 790], [-1602, 840], [-1393, 791], [-1312, 880]];
  const south = [[-1620, 950], [-1960, 900], [-2240, 730],
    world(at(...SAETGANG[4])), // where the Saetgang comes back in, east of the island
    ...[3, 2, 1, 0, 5].map((i) => world(at(...ISLAND[i]))), // round the island's east tip, along its north shore, to its west tip
    [-3142, 48]];
  const p = [...north, ...south];
  // Its blocker, cut on both sides of Seogang Bridge.
  const gap = BRIDGE_W / 2 + 1;
  const blockers = [clip(p, (q) => BRIDGE_U - gap - toUV(q)[0]), clip(p, (q) => toUV(q)[0] - (BRIDGE_U + gap))];
  return { p, blockers, note: 'Han River from Mangwon Han River Park east to Banpo-Jamwon, round the north shore of Yeouido (scripts/build-yeouido.mjs writes this). Its blocker has a gap for Seogang Bridge.' };
}
// The part of polygon p where side(point) >= 0 (side is linear).
function clip(p, side) {
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push([r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)]);
    }
  }
  return out;
}

function build() {
  const buildings = [
    // The park house by the path: the way in to the park room and its
    // fishing spots (the fishing corner, at the west end of the lawn).
    { h: 4, p: rect(-192, 28, -172, 36) },
    // The Information Center, east of Mul-bit Square.
    { h: 5, p: rect(196, 27, 210, 36) },
    // Yeouido's office towers south of Yunjung-ro (plain, no shops).
    // (none from u -95 to 40: Yeouido Park, round Seoul Dal)
    ...[[-235, 82, -205, 112, 48], [-185, 80, -150, 105, 72], [-130, 84, -100, 118, 56], [45, 80, 80, 104, 110], [95, 86, 125, 120, 58], [140, 80, 175, 108, 84],
      [-185, 125, -150, 160, 40], [-90, 130, -55, 160, 44], [150, 128, 185, 158, 50]]
      .map(([u0, v0, u1, v1, h]) => ({ h, p: rect(u0, v0, u1, v1) })),
  ];
  const roads = [
    { k: 'primary', w: BRIDGE_W, p: [[r1(BRIDGE_NORTH[0] - ORIGIN[0]), r1(BRIDGE_NORTH[1] - ORIGIN[1])], at(BRIDGE_U, YUNJUNG)], n: name('Seogang Bridge', '서강대교', '西江大橋', '西江大桥') },
    { k: 'walk', w: 5, p: [at(-292, PATH), at(290, PATH)], n: name('Han River path', '한강 산책로', '漢江の散歩道', '汉江步道') },
    { k: 'tertiary', w: 10, p: [at(-300, YUNJUNG), at(300, YUNJUNG)], n: name('Yunjung-ro', '윤중로', '輪中路', '轮中路') },
    { k: 'walk', w: 4, p: [at(-40, PATH), at(-40, YUNJUNG)], n: name('Park lane', '공원 산책길', '公園の小道', '公园小路') },
    { k: 'walk', w: 4, p: [at(185, PATH), at(185, YUNJUNG)], n: name('Park lane', '공원 산책길', '公園の小道', '公园小路') },
    // On across Yunjung-ro into Yeouido Park, to Seoul Dal's gate.
    { k: 'walk', w: 4, p: [at(-40, YUNJUNG), at(-40, DAL_V - 18), at(DAL_U, DAL_V - 18), at(DAL_U, DAL_V - 9)], n: name('Yeouido Park path', '여의도공원 길', '汝矣島公園の小道', '汝矣岛公园小路') },
    { k: 'walk', w: 5, p: [at(-140, YUNJUNG), at(-140, 168)], n: name('Office lane', '빌딩 사잇길', 'オフィス街の道', '写字楼小路') },
    { k: 'walk', w: 5, p: [at(132, YUNJUNG), at(132, 168)], n: name('Office lane', '빌딩 사잇길', 'オフィス街の道', '写字楼小路') },
  ];
  const lawn = rect(-150, 2, 118, PATH - 3); // the fireworks lawn
  const areas = [
    { k: 'grass', p: rect(-262, 2, -150, PATH - 3) }, // the fishing corner
    { k: 'grass', lawn: true, p: lawn }, // picnic mats and frisbees, no trees: the view across the river stays open
    { k: 'plaza', p: rect(118, 2, 172, PATH - 3) }, // Mul-bit Square
    { k: 'water', p: rect(126, 9, 164, 30) }, // its shallow pool: walk right in (no blocker)
    { k: 'grass', p: rect(172, 2, 262, PATH - 3) },
    { k: 'park', trees: true, p: rect(-285, PATH + 3, 285, YUNJUNG - 8) },
    // Yeouido Park, across Yunjung-ro from the river park: an open lawn
    // round Seoul Dal's pad, trees along its far side.
    { k: 'grass', p: rect(-95, 76, 40, 128) },
    { k: 'park', trees: true, p: rect(-50, 132, 40, 162) },
    { k: 'grass', p: rect(-250, 166, 250, 173) }, // the Saetgang bank
    { k: 'water', p: SAETGANG.map(([u, v]) => at(u, v)) },
  ];
  const blockers = [
    { p: SAETGANG.map(([u, v]) => at(u, v)) },
    { p: rect(262, 96, 292, 122) }, // the 63 tower (drawn by its landmark)
  ];
  const len = PATH - BRIDGE_V; // (v from the bridge's north end to the path)
  const landmarks = [
    { type: 'seogang', ...xz(at(BRIDGE_U, BRIDGE_V / 2)), ry: ALONG_V, len: -BRIDGE_V, w: BRIDGE_W },
    { type: 'arch', ...xz(at(BRIDGE_U, 3)), ry: ALONG_V, w: BRIDGE_W + 2, title: 'YEOUIDO HAN RIVER PARK', sub: '여의도 한강공원', color: '#1f7a8c' },
    { type: 'tower63', ...xz(at(277, 109)), ry: ALONG_U },
    // The fireworks' launch barges in the main channel, facing the lawn
    // (the same spots as BARGES in src/core/fireworks-show.js).
    ...BARGES.map(([u, v]) => ({ type: 'fwbarge', ...xz(at(u, v)), ry: ALONG_U + Math.PI / 2 })),
    { type: 'mulbit', ...xz(at(145, 19.5)), ry: ALONG_U, w: 34, d: 17 },
    // Seoul Dal, the tethered balloon (drawn and ridden by game/seoul-dal.js,
    // loaded when you come near; its gate faces the river, towards the path).
    { type: 'seouldal', ...xz(at(DAL_U, DAL_V)), ry: FACE_RIVER },
    { type: 'sign', ...xz(at(DAL_U - 9, DAL_V - 12)), ry: FACE_RIVER,
      title: name('Seoul Dal', '서울달', 'ソウルダル', '首尔月亮'),
      text: {
        en: 'Seoul Dal ("Seoul Moon") is a real tethered gas balloon in Yeouido Park, flying since 2024. A ring-shaped gondola under the balloon carries up to 20 people about 130 m above Yeouido for around 15 minutes, with the Han River, the National Assembly and the 63 tower below. At night it glows like a full moon. It is open every day from 12:00 to 22:00, and stops in strong wind or rain; the adult ticket was 25,000 won in 2026 (check before you go). In the game it goes up every 3 minutes, a little lower, for 25,000 game won.',
        ko: '서울달은 여의도공원에 실제로 있는 계류식 가스기구로, 2024년부터 날고 있어요. 기구 아래 고리 모양 곤돌라에 최대 20명이 타고 여의도 위 약 130m까지 올라 15분쯤 머물러요. 아래로 한강, 국회의사당, 63빌딩이 보여요. 밤에는 보름달처럼 빛나요. 매일 12시부터 22시까지 운영하고, 강풍이나 비가 오면 쉬어요. 성인 요금은 2026년 기준 25,000원이에요(가기 전에 확인하세요). 게임에서는 3분마다, 조금 낮게 올라가고 게임 머니 25,000원이에요.',
        ja: 'ソウルダル（「ソウルの月」）は汝矣島公園に実在する係留式ガス気球で、2024年から飛んでいます。気球の下のリング形ゴンドラに最大20人が乗り、汝矣島の上空約130mまで上がって15分ほど過ごします。眼下には漢江、国会議事堂、63ビル。夜は満月のように光ります。毎日12時から22時まで運行し、強風や雨の日は休みます。大人料金は2026年時点で25,000ウォンです（行く前に確認してください）。ゲームでは3分ごとに、少し低めに上がり、ゲーム内25,000ウォンです。',
        zh: '首尔月亮（서울달）是汝矣岛公园里真实存在的系留式气球，2024年起开始飞行。气球下方的环形吊舱最多载20人，升到汝矣岛上空约130米，停留约15分钟，下方是汉江、国会议事堂和63大厦。夜晚它像满月一样发光。每天12:00至22:00运营，大风或下雨时停飞；2026年成人票价为25,000韩元（出发前请确认）。游戏里每3分钟升空一次，高度稍低，票价为游戏币25,000韩元。',
      } },
    { type: 'blossoms', seasonal: true, p: [at(-290, YUNJUNG - 6.5), at(290, YUNJUNG - 6.5)], gap: 9 },
    { type: 'blossoms', seasonal: true, p: [at(-290, YUNJUNG + 6.5), at(290, YUNJUNG + 6.5)], gap: 9 },
    { type: 'sign', ...xz(at(-205, PATH - 3)), ry: FACE_RIVER,
      title: name('Yeouido Han River Park', '여의도 한강공원', '汝矣島漢江公園', '汝矣岛汉江公园'),
      text: {
        en: 'Yeouido is an island in the middle of the Han River. Its riverside park has the widest lawn on the river: spread a mat and look across the water to Mapo. In spring, cherry trees bloom all along Yunjung-ro. In the game, fireworks light up the sky here every day at 9:00 and 21:00 Korean time, for an hour, from three barges on the river. The real Seoul International Fireworks Festival is held here once a year, in autumn. The blobfish, a legend, only bites here.',
        ko: '여의도는 한강 한가운데 있는 섬이에요. 강변 공원에는 한강에서 가장 넓은 잔디밭이 있어요. 돗자리를 펴고 강 건너 마포를 바라보세요. 봄이면 윤중로를 따라 벚꽃이 피어요. 게임에서는 매일 한국시간 9시와 21시에 한 시간씩, 강 위 바지선 세 척에서 불꽃놀이가 열려요. 실제 서울세계불꽃축제는 1년에 한 번, 가을에 여기서 열려요. 전설의 블롭피시는 여기서만 잡혀요.',
        ja: '汝矣島は漢江の真ん中にある島です。川辺の公園には漢江でいちばん広い芝生があります。シートを広げて、川の向こうの麻浦を眺めてみましょう。春には輪中路に沿って桜が咲きます。ゲームでは毎日、韓国時間の9時と21時に1時間、川に浮かぶ3隻の台船から花火が上がります。本物のソウル世界花火祭りは、年に一度、秋にここで開かれます。伝説のブロブフィッシュはここでしか釣れません。',
        zh: '汝矣岛是汉江正中的一座岛。江边公园有汉江上最大的草坪：铺开野餐垫，眺望对岸的麻浦。春天，轮中路两旁樱花盛开。游戏里每天韩国时间9点和21点，江上三艘驳船会放一小时烟花。真实的首尔世界烟花节每年秋天在这里举办一次。传说中的水滴鱼只在这里咬钩。',
      } },
  ];
  // Benches on the shore facing the river (none on the bridge's landing).
  for (const u of [-255, -200, -175, -150, -125, -95, -65, -35, -5, 25, 55, 85, 110, 185, 215, 245]) landmarks.push({ type: 'bench', ...xz(at(u, 4.5)), ry: FACE_RIVER });
  const pois = [
    { kind: 'landmark', ...xz(at(-20, 20)), name: name('Yeouido Han River Park', '여의도 한강공원', '汝矣島漢江公園', '汝矣岛汉江公园') },
    { kind: 'landmark', ...xz(at(BRIDGE_U, BRIDGE_V / 2)), name: name('Seogang Bridge', '서강대교', '西江大橋', '西江大桥') },
    { kind: 'landmark', ...xz(at(145, 19.5)), name: name('Mul-bit Square', '물빛광장', '水光広場', '水光广场') },
    { kind: 'landmark', ...xz(at(277, 128)), name: name('63 Tower', '63빌딩', '63ビル', '63大厦') },
    { kind: 'landmark', ...xz(at(DAL_U, DAL_V)), name: name('Seoul Dal', '서울달', 'ソウルダル', '首尔月亮') },
    { kind: 'landmark', ...xz(at(-50, 125)), name: name('Yeouido Park', '여의도공원', '汝矣島公園', '汝矣岛公园') },
  ];
  return {
    meta: {
      district: 'yeouido',
      source: 'hand-made (scripts/build-yeouido.mjs; game map, not to scale): Yeouido, an island in the Han River, Yeongdeungpo-gu, with Yeouido Han River Park on its north shore. The office towers, park house, kiosk and stalls are fictional.',
    },
    roads, buildings, rail: [], areas, blockers, pois, landmarks,
  };
}
function xz([x, z]) { return { x, z }; }

// Where each place's door is, in the district's own metres.
export const SPOTS = {
  'yeouido-hangang': at(-182, PATH - 2.5), // in front of the park house, on the path
  'info-yeouido': at(203, PATH - 2.5),
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const map = build();
  writeFileSync(path.join(R, 'districts', 'yeouido.json'), JSON.stringify(map) + '\n');
  const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
  const d = region.districts.find((x) => x.id === 'yeouido');
  if (!d) console.log('yeouido: not in region.json yet');
  else if (d.offset[0] !== ORIGIN[0] || d.offset[1] !== ORIGIN[1]) console.log(`yeouido: offset ${d.offset} should be ${ORIGIN}`);
  // region.json is hand-formatted: only the first river line is rewritten.
  const text = readFileSync(path.join(R, 'region.json'), 'utf8');
  const i = text.indexOf('"water": [\n') + '"water": [\n'.length;
  const j = text.indexOf('\n', i);
  writeFileSync(path.join(R, 'region.json'), text.slice(0, i) + '    ' + JSON.stringify(river()) + ',' + text.slice(j + 0).replace(/^,?/, ''));
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  for (const [sid, p] of Object.entries(SPOTS)) {
    const [x, z] = world(p);
    const i = stores.indexOf(`"id": "${sid}"`);
    if (i < 0) { console.log(`${sid}: not in stores.json`); continue; }
    let end = stores.indexOf('\n    {', i);
    if (end < 0) end = stores.length;
    const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${x}, ${z}]`);
    stores = stores.slice(0, i) + part + stores.slice(end);
  }
  writeFileSync(path.join(R, 'stores.json'), stores);
  console.log(`yeouido: ${map.buildings.length} buildings; bridge ${r1(-BRIDGE_V)} m over the water at u ${r1(BRIDGE_U)}; park house door ${world(SPOTS['yeouido-hangang'])}, local ${SPOTS['yeouido-hangang']}`);
}
