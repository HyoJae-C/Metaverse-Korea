#!/usr/bin/env node
// Builds the Samseong-dong district (districts/samseong.json) in Gangnam-gu
// and puts its places on it.
//
// Samseong Station (Line 2) sits where Teheran-ro meets Yeongdong-daero. The
// big block north-west of that corner is KONEXT, a fictional shopping mall
// (only its outside for now): a long, low building along Teheran-ro with a
// wide plaza in front of its main entrance on the Yeongdong-daero side, a
// media wall wrapped round its corner, a glass office tower behind it and
// the small glass pavilion of KONEXT Aquarium (its door leads into the
// aquarium, core/aquarium.js). Tancheon, the
// stream between Gangnam and Songpa, runs along the east edge; Teheran-ro
// crosses it on Samseong Bridge and runs on towards Jamsil as Olympic-ro.
//
// Street lines follow OpenStreetMap (© OpenStreetMap contributors, ODbL);
// the buildings and KONEXT are made up. Game map, not to scale: local x east,
// z south, metres, Samseong Station's corner at (0, 0).
//
//   node scripts/build-samseong.mjs   writes the map and sets the "at" of the
//                                     places in SPOTS in stores.json (world
//                                     metres, using the district's offset)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// Street lines (local metres).
export const TEHERAN = { z: 0, w: 20, x0: -330, x1: 285 }; // east-west, the south edge of KONEXT
export const YEONGDONG = { x: 0, w: 20, z0: -250, z1: 90 }; // north-south, KONEXT's east side
export const BONGEUNSA = { z: -235, w: 14, x0: -330, x1: 110 }; // east-west, KONEXT's north side
export const ASEM = { x: -310, w: 12, z0: -235, z1: 0 }; // north-south, KONEXT's west side
export const TANCHEON = { x0: 205, x1: 250 }; // the stream along the east edge
// KONEXT: the mall (a long box along Teheran-ro), its plaza and the aquarium pavilion.
export const MALL = { x0: -265, z0: -150, x1: -100, z1: -58, h: 22 };
export const PAVILION = { x0: -78, z0: -150, x1: -58, z1: -134, h: 6 };
export const TOWER = { x0: -240, z0: -215, x1: -196, z1: -172, h: 88 };

function build() {
  const buildings = [
    // KONEXT and its aquarium pavilion are drawn by their landmarks
    // (core/konext.js); here they are walls you can't walk through.
    { h: MALL.h, custom: true, p: rect(MALL.x0, MALL.z0, MALL.x1, MALL.z1) },
    { h: PAVILION.h, custom: true, p: rect(PAVILION.x0, PAVILION.z0, PAVILION.x1, PAVILION.z1) },
    // The office tower behind the mall (no name: just the skyline).
    { h: TOWER.h, wall: '#9fb6c8', roof: '#5d6b78', p: rect(TOWER.x0, TOWER.z0, TOWER.x1, TOWER.z1) },
    { h: 30, p: rect(-298, -222, -252, -170) }, // a hotel on Asem-ro
    // North-east of the station: offices and a department store.
    { h: 48, p: rect(14, -222, 60, -170) },
    { h: 24, p: rect(14, -160, 92, -96) },
    { h: 36, p: rect(14, -86, 60, -16) },
    { h: 18, p: rect(104, -160, 186, -96) },
    { h: 30, p: rect(72, -86, 120, -16) },
    { h: 22, p: rect(132, -86, 188, -16) },
    // South of Teheran-ro: a row of office towers along the street.
    ...[[-322, -270], [-258, -206], [-194, -142], [-130, -80], [-68, -16], [16, 64], [76, 124], [136, 188]].map(([x0, x1], i) => (
      { h: [42, 56, 34, 62, 46, 52, 38, 44][i], p: rect(x0, 18, x1, 66) }
    )),
  ];
  const roads = [
    { k: 'primary', w: TEHERAN.w, p: [[TEHERAN.x0, TEHERAN.z], [TEHERAN.x1, TEHERAN.z]], n: name('Teheran-ro', '테헤란로', 'テヘラン路', '德黑兰路') },
    { k: 'primary', w: YEONGDONG.w, p: [[YEONGDONG.x, YEONGDONG.z0], [YEONGDONG.x, YEONGDONG.z1]], n: name('Yeongdong-daero', '영동대로', '永東大路', '永东大路') },
    { k: 'secondary', w: BONGEUNSA.w, p: [[BONGEUNSA.x0, BONGEUNSA.z], [BONGEUNSA.x1, BONGEUNSA.z]], n: name('Bongeunsa-ro', '봉은사로', '奉恩寺路', '奉恩寺路') },
    { k: 'tertiary', w: ASEM.w, p: [[ASEM.x, ASEM.z0], [ASEM.x, ASEM.z1]], n: name('Asem-ro', '아셈로', 'アセム路', '亚欧路') },
    // Walks across the KONEXT block: past the mall's north side and its west end.
    { k: 'walk', w: 5, p: [[-304, -163], [-6, -163]], n: name('KONEXT Walk', '코넥스트 산책길', 'コネクスト散歩道', 'KONEXT步道') },
    { k: 'walk', w: 5, p: [[-282, -163], [-282, -6]], n: name('KONEXT Walk', '코넥스트 산책길', 'コネクスト散歩道', 'KONEXT步道') },
    // A lane between the offices north-east of the station.
    { k: 'residential', w: 8, p: [[6, -91], [196, -91]] },
  ];
  const areas = [
    // KONEXT Square: the plaza in front of the main entrance, up to the corner.
    { k: 'plaza', p: rect(-96, -156, -10, -10) },
    { k: 'plaza', p: rect(-275, -50, -96, -10) }, // along the mall's Teheran-ro side
    // North of the plaza, a grove up to Bongeunsa-ro (shade, and the square doesn't feel empty).
    { k: 'park', trees: true, p: rect(-96, -226, -10, -168) },
    // Planters with trees on the plaza, in rows, leaving the middle and the
    // way to the doors open.
    ...[[-88, -40], [-88, -78], [-30, -40], [-30, -78], [-30, -116], [-250, -40], [-200, -40], [-150, -40]].map(([x, z]) => ({ k: 'park', trees: true, p: rect(x - 3, z - 3, x + 3, z + 3) })),
    { k: 'grass', p: rect(-300, -228, -270, -170) },
    // North of Bongeunsa-ro: trees (a temple stands here in real life; not built yet).
    { k: 'park', trees: true, p: rect(-330, -320, -120, -244) },
    { k: 'park', trees: true, p: rect(-110, -320, 110, -244) },
    // Tancheon and its banks.
    { k: 'grass', p: rect(TANCHEON.x0 - 12, -250, TANCHEON.x0, 90) },
    { k: 'grass', p: rect(TANCHEON.x1, -250, TANCHEON.x1 + 12, 90) },
    { k: 'water', p: rect(TANCHEON.x0, -250, TANCHEON.x1, 90) },
  ];
  // You can't walk into Tancheon, except over Samseong Bridge (Teheran-ro).
  const gap = TEHERAN.w / 2 + 1;
  const blockers = [
    { p: rect(TANCHEON.x0, -250, TANCHEON.x1, TEHERAN.z - gap) },
    { p: rect(TANCHEON.x0, TEHERAN.z + gap, TANCHEON.x1, 90) },
  ];
  const cx = (MALL.x0 + MALL.x1) / 2, cz = (MALL.z0 + MALL.z1) / 2;
  const landmarks = [
    { type: 'konext', x: cx, z: cz, ry: 0, w: MALL.x1 - MALL.x0, d: MALL.z1 - MALL.z0, h: MALL.h },
    { type: 'aquarium', x: (PAVILION.x0 + PAVILION.x1) / 2, z: (PAVILION.z0 + PAVILION.z1) / 2, ry: 0, w: PAVILION.x1 - PAVILION.x0, d: PAVILION.z1 - PAVILION.z0, h: PAVILION.h },
    { type: 'samseongbridge', x: (TANCHEON.x0 + TANCHEON.x1) / 2, z: TEHERAN.z, ry: 0, len: TANCHEON.x1 - TANCHEON.x0 + 4, w: TEHERAN.w },
    { type: 'sign', x: -40, z: -24, ry: Math.PI,
      title: name('KONEXT', '코넥스트', 'コネクスト', 'KONEXT'),
      text: {
        en: 'KONEXT is a big shopping mall by Samseong Station (made up for the game). Its media wall shows the sea, and KONEXT Aquarium is opening soon under the mall: walk with sharks and rays in an undersea tunnel.',
        ko: '코넥스트는 삼성역 옆의 대형 쇼핑몰이에요(게임 속 가상 장소). 미디어 월에는 바다가 펼쳐지고, 몰 지하에는 곧 코넥스트 아쿠아리움이 열려요. 해저터널에서 상어와 가오리와 함께 걸어 보세요.',
        ja: 'コネクストはサムソン駅のそばの大型ショッピングモールです（ゲームの架空の場所）。メディアウォールには海が広がり、モールの地下にはまもなくコネクスト・アクアリウムがオープンします。海底トンネルでサメやエイと一緒に歩いてみましょう。',
        zh: 'KONEXT是三成站旁的大型购物中心（游戏中的虚构地点）。媒体墙上是一片大海，商场地下的KONEXT水族馆即将开放：在海底隧道里和鲨鱼、鳐鱼一起漫步吧。',
      } },
  ];
  for (const [x, z, ry] of [[-88, -50, 0], [-30, -50, 0], [-88, -68, Math.PI], [-30, -68, Math.PI], [-200, -30, Math.PI], [-150, -30, Math.PI]]) landmarks.push({ type: 'bench', x, z, ry });
  const pois = [
    { kind: 'landmark', x: cx, z: cz, name: name('KONEXT', '코넥스트', 'コネクスト', 'KONEXT') },
    { kind: 'landmark', x: -50, z: -70, name: name('KONEXT Square', '코넥스트 광장', 'コネクスト広場', 'KONEXT广场') },
    { kind: 'landmark', x: (TANCHEON.x0 + TANCHEON.x1) / 2, z: -120, name: name('Tancheon', '탄천', '炭川', '炭川') },
  ];
  return {
    meta: {
      district: 'samseong',
      source: 'hand-made (scripts/build-samseong.mjs; game map, not to scale): Samseong-dong, Gangnam-gu, around Samseong Station. Street lines after OpenStreetMap (© OpenStreetMap contributors, ODbL). KONEXT and KONEXT Aquarium are fictional; the other buildings are generic.',
    },
    roads, buildings, rail: [], areas, blockers, pois, landmarks,
  };
}

// Where each place is, in the district's own metres.
export const SPOTS = {
  'info-samseong': [40, -13], // the office on the station's north-east corner, facing Teheran-ro
};
// Also in world metres (printed for region.json): the station exits, the
// meeting zone on KONEXT Square and the stamp.
export const EXITS = [
  { n: 1, at: [-16, -14], ry: -Math.PI / 2 }, // KONEXT Square side
  { n: 2, at: [16, 14], ry: Math.PI / 2 }, // south-east corner
];
export const ZONE = [-58, -92];
export const STAMP = [-48, -128];

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const map = build();
  writeFileSync(path.join(R, 'districts', 'samseong.json'), JSON.stringify(map) + '\n');
  const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
  const d = region.districts.find((x) => x.id === 'samseong');
  if (!d) console.log('samseong: not in region.json yet, places not set');
  else {
    // stores.json is hand-formatted, so only the "at" of each place is rewritten.
    let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
    const [ox, oz] = d.offset;
    const w = ([x, z]) => [r1(x + ox), r1(z + oz)];
    for (const [sid, p] of Object.entries(SPOTS)) {
      const i = stores.indexOf(`"id": "${sid}"`);
      if (i < 0) { console.log(`${sid}: not in stores.json`); continue; }
      let end = stores.indexOf('\n    {', i);
      if (end < 0) end = stores.length;
      const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${w(p).join(', ')}]`);
      stores = stores.slice(0, i) + part + stores.slice(end);
    }
    writeFileSync(path.join(R, 'stores.json'), stores);
    console.log('exits:', JSON.stringify(EXITS.map((e) => ({ n: e.n, at: w(e.at), ry: r1(e.ry * 1e4) / 1e4 }))));
    console.log('zone U at', JSON.stringify(w(ZONE)), ' stamp at', JSON.stringify(w(STAMP)));
    console.log('Teheran-ro east end (link to Olympic-ro):', JSON.stringify(w([TEHERAN.x1, TEHERAN.z])));
  }
  console.log(`samseong: ${map.buildings.length} buildings`);
}
