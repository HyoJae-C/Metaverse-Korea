#!/usr/bin/env node
// Builds Children's Grand Park (public/regions/another-seoul/districts/
// grand-park.json): a hand-made district, not to scale. The park is only as
// big as the zoo needs; the zoo is the point of the place.
//
//   Neungdong-ro (x 0) ── gate plaza ── rainbow main gate ── zoo loop
//
// Pens (core/zoo.js) sit in the four quarters of the loop and south of it.
// Their fences are written twice from the same layout: as "zoopen"
// landmarks (drawn by the zoo) and as blockers (you can't walk through).
//
//   node scripts/build-grand-park.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fenceLines } from '../src/core/zoo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'regions', 'another-seoul', 'districts', 'grand-park.json');
const L = (ko, en, ja, zh) => ({ ko, en, ja, zh });

// Is the zoo open? While it isn't, a hoarding ("opening soon") runs round
// the whole zoo with a sign at the end of the main path; the gate plaza,
// the information center and the station stay open.
export const ZOO_OPEN = false;
export const DOGHOLE = [55, -34]; // on the hoarding's west side
export const HOARDING = [[55, -80], [200, -80], [200, 95], [55, 95], [55, -80]]; // (between the plaza's blossom trees, x 52 and 58)

// The zoo in four themed quarters round a cross of paths (the main path
// from the gate along z 0 and a cross path along x 128), wrapped in a ring
// road the zoo carts drive round (game/zoo-carts.js):
//   north-west  waterside: Sea Animals hall, hippos, the bird house
//   north-east  big cats and birds of prey: tigers, lions, bears, vultures
//   south-west  little ones (by the gate): petting village, reptiles, monkeys
//   south-east  savanna: elephants, giraffes and zebras on one big plain
// A path across each north quarter (z -38) and the south-west one (z 44)
// gives the back row of pens a front to face.
export const RING = { x0: 66, x1: 190, z0: -70, z1: 86, w: 6 };
const CROSS = 128, NORTH_PATH = -38, SOUTH_PATH = 44;

// A pen turned to face the other way (its board and gate from north to
// south or back): every pen-local z is mirrored.
function flip(pen) {
  const fz = ([x, z, ...r]) => [x, -z, ...r];
  const side = { n: 's', s: 'n', e: 'e', w: 'w' };
  return {
    ...pen,
    board: side[pen.board || 'n'],
    ...(pen.gate ? { gate: { ...pen.gate, side: side[pen.gate.side] } } : {}),
    ...(pen.props ? { props: pen.props.map(([k, x, z, ...r]) => [k, x, -z, ...r]) } : {}),
    ...(pen.pond ? { pond: fz(pen.pond) } : {}),
    ...(pen.feed ? { feed: { ...pen.feed, at: fz(pen.feed.at) } } : {}),
    ...(pen.groups ? { groups: pen.groups.map((g) => (g.box ? { ...g, box: [g.box[0], -g.box[3], g.box[2], -g.box[1]] } : g)) } : {}),
  };
}

// Pens: centre (local metres), size, fence, and who lives there.
export const PENS = [
  // South-west: the little ones, by the gate.
  flip({
    id: 'monkeys', x: 95, z: 62, w: 36, d: 30, fence: 'mesh', ground: 'grass', board: 's',
    name: L('원숭이마을', 'Monkey Village', 'サル村', '猴子村'),
    props: [['log', -6, -4], ['log', 8, 5], ['tree', -13, 9], ['tree', 13, -9], ['rock', 0, 10]],
    groups: [{ kind: 'macaque', n: 6 }],
    feed: { at: [5, 11], offset: 480, food: 'fruit' },
  }),
  {
    id: 'petting', x: 92, z: 20, w: 36, d: 30, fence: 'low', ground: 'grass', board: 'n', pet: true,
    gate: { side: 'n', at: 0, w: 4 },
    name: L('꼬마동물마을', 'Little Animal Village', 'こども動物村', '小动物村'),
    props: [['barn', 11, 8], ['hay', 3, 10], ['hay', 5, 12, 0.6], ['hutch', -12, 9], ['hutch', -15, 4, 0.4], ['tree', -15, -11]],
    // The red barn is solid; at its door you buy a cup of animal food.
    solid: [[8.4, 5.9, 13.6, 10.1]],
    shop: { at: [11, 11.6], price: 1000 },
    // The keeper by the gate, who tells you about the animals.
    keeper: { at: [-4, -11], ry: Math.PI },
    groups: [
      { kind: 'goat', n: 3, box: [0, -12, 16, 4] },
      { kind: 'sheep', n: 6, box: [0, -12, 16, 4] },
      { kind: 'rabbit', n: 4, box: [-16, -2, -3, 13] },
      { kind: 'guineapig', n: 5, box: [-16, -2, -3, 13] },
    ],
  },
  flip({
    id: 'reptiles', x: 118, z: 10, w: 14, d: 10, fence: 'house', ground: 'stone', board: 's',
    name: L('파충류관', 'Reptile House', '爬虫類館', '爬行动物馆'),
    props: [['rock', 3, -2]],
    groups: [{ kind: 'snake', n: 1, box: [-5, -3, 5, 3] }],
  }),
  // North-west: the waterside.
  flip({
    id: 'birds', x: 95, z: -55, w: 44, d: 20, fence: 'aviary', ground: 'grass', board: 'n',
    name: L('새장', 'Bird House', '鳥の家', '鸟舍'),
    pond: [-9, 1, 6],
    props: [['tree', 16, 3], ['rock', 6, 5]],
    groups: [
      { kind: 'flamingo', n: 8, box: [-16, -5, -3, 7] },
      { kind: 'pelican', n: 3, box: [-18, -7, 2, 7] },
      { kind: 'peacock', n: 2, box: [5, -7, 20, 7] },
    ],
  }),
  // Sea Animals: a closed building on the path. Its door is a storefront
  // (stores.json "cgp-sea-hall") and inside is a room of its own, the
  // interior map in core/zoo-sea-hall.js: seals, a walrus and a polar bear.
  {
    id: 'sea', x: 81, z: -21, w: 24, d: 28, fence: 'hall', closed: true, ground: 'stone', board: 'n', boardAt: 7,
    name: L('바다동물관', 'Sea Animals', '海の動物館', '海洋动物馆'),
  },
  {
    id: 'hippos', x: 108, z: -21, w: 21, d: 28, fence: 'glass', ground: 'dirt', board: 'n', boardAt: 6,
    name: L('하마', 'Hippos', 'カバ', '河马'),
    pond: [0, 4, 7], props: [['tree', 7, 11]],
    groups: [{ kind: 'hippo', n: 2 }],
    melon: [-3, -15.8], melonIn: [0, 1],
  },
  // North-east: big cats and birds of prey.
  {
    id: 'tigers', x: 143, z: -20, w: 21, d: 28, fence: 'mesh', ground: 'grass', board: 's',
    name: L('호랑이', 'Tigers', 'トラ', '老虎'),
    pond: [4, -7, 3], props: [['rock', -5, -2], ['tree', -6, -10]],
    groups: [{ kind: 'tiger', n: 2 }],
    feed: { at: [0, 10], offset: 0, food: 'meat' },
  },
  {
    id: 'lions', x: 168, z: -20, w: 21, d: 28, fence: 'mesh', ground: 'dirt', board: 's',
    name: L('사자', 'Lions', 'ライオン', '狮子'),
    props: [['rock', 3, -6], ['rock', -4, -9, 1], ['tree', -6, 2]],
    groups: [{ kind: 'lion', n: 3 }],
    feed: { at: [0, 10], offset: 120, food: 'meat' },
  },
  {
    id: 'bears', x: 150, z: -50, w: 32, d: 16, fence: 'mesh', ground: 'dirt', board: 's',
    name: L('곰', 'Bears', 'クマ', '熊'),
    pond: [11, -1, 4], props: [['rock', -9, -3], ['tree', -14, -4], ['log', 2, -3]],
    groups: [{ kind: 'bear', n: 2 }],
    feed: { at: [-4, 5], offset: 240, food: 'fish' },
  },
  // Cinereous vultures (독수리: what Koreans call "doksuri"; they winter in
  // Korea): a tall aviary with dead trees to perch on. They fly from tree to
  // tree round it.
  {
    id: 'eagles', x: 177, z: -52, w: 19, d: 16, fence: 'aviary', tall: 9, ground: 'grass', board: 's',
    name: L('독수리', 'Cinereous Vultures', 'クロハゲワシ', '秃鹫'),
    props: [['perch', -6, -3, 0, 4.2], ['perch', 5, -4, 2, 5.4], ['perch', 1, 3.5, 1, 2.4], ['perch', -6.5, 4, 0.5, 3], ['rock', 3, -1]],
    groups: [{ kind: 'vulture', n: 3 }],
    feed: { at: [-2, 2], offset: 300, food: 'meat' },
  },
  // South-east: the savanna, elephants (a mother and her calf), giraffes and
  // zebras together on one big plain with a waterhole and trees to browse.
  // A low glass wall all round so you can watch them over it.
  {
    id: 'savanna', x: 158, z: 45, w: 54, d: 74, fence: 'glass', ground: 'dirt', board: 'n',
    name: L('초식동물마을', 'Savanna', '草食動物の村', '草食动物村'),
    pond: [-12, 8, 7],
    props: [['tree', 20, -20], ['tree', 22, 6], ['tree', 8, 26], ['tree', -20, 28], ['tree', 14, -30], ['tree', -6, 18], ['tree', 23, 30], ['tree', -23, -8], ['rock', -4, -14], ['rock', -21, -24], ['rock', 12, 12]],
    groups: [
      { kind: 'elephant', n: 2, box: [-24, -30, -4, 30] },
      { kind: 'giraffe', n: 3, box: [4, -32, 25, 32] },
      { kind: 'zebra', n: 7, box: [-24, -34, 25, 34] },
    ],
    feed: { at: [0, -32], offset: 540, food: 'greens' },
  },
];

// The cart station just inside the gate, between the ring road's west side
// and the little animal village: three four-seat carts (game/zoo-carts.js).
// Carts stay in the zoo: `area` is where they may go, from the station.
export const CARTS = { x: 71.5, z: 17, carts: [[0, -7], [0, 0], [0, 7]], sign: [-1.6, -11], area: [55 - 71.5, -80 - 17, 200 - 71.5, 95 - 17] };

const r1 = (v) => Math.round(v * 10) / 10;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
// The Sea Animals hall's walls (its pen "sea", 24 × 28 m round x 81, z -21).
export const SEA_HALL = { h: 7.5, custom: true, p: rect(69, -35, 93, -7) };

// A fence line as a thin blocker (0.4 m thick).
function lineBlocker([x1, z1, x2, z2], ox, oz) {
  const t = 0.2;
  const [ax, bx] = [Math.min(x1, x2), Math.max(x1, x2)], [az, bz] = [Math.min(z1, z2), Math.max(z1, z2)];
  return { p: rect(r1(ax - t + ox), r1(az - t + oz), r1(bx + t + ox), r1(bz + t + oz)) };
}

export function buildMap() {
  const { x0, x1, z0, z1, w } = RING;
  const map = {
    meta: {
      district: 'grand-park',
      source: "hand-made (game map, not to scale): Seoul Children's Grand Park in Gwangjin-gu (opened 1973, free entry). Simplified to the zoo: the main gate on Neungdong-ro by Children's Grand Park Station (Line 7), a gate plaza and the zoo loop with its pens, wrapped in a strip of woods. The animals are the game's choice and may differ from the real zoo. Built by scripts/build-grand-park.mjs; placed by its anchor, Children's Grand Park Station (region.json).",
    },
    roads: [
      { k: 'secondary', w: 14, p: [[0, -80], [0, 95]], n: L('능동로', 'Neungdong-ro', '陵洞路', '陵洞路') },
      { k: 'walk', w: 6, p: [[50, 0], [x1, 0]] },
      { k: 'walk', w, p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]] }, // the ring road (carts)
      { k: 'walk', w: 5, p: [[CROSS, z0], [CROSS, z1]] },
      { k: 'walk', w: 4, p: [[x0, NORTH_PATH], [x1, NORTH_PATH]] },
      { k: 'walk', w: 4, p: [[x0, SOUTH_PATH], [CROSS, SOUTH_PATH]] },
    ],
    buildings: [
      { h: 8, p: rect(14, -46, 36, -32), n: L('서울어린이대공원 안내센터', "Children's Grand Park Information Center", '子供大公園インフォメーションセンター', '儿童大公园信息中心') },
      // The Sea Animals hall: drawn by its pen (core/zoo.js), a wall you bump
      // into here, and the facade its door (the storefront) sits on.
      SEA_HALL,
    ],
    rail: [],
    areas: [
      // The park ground round the zoo, leaving the gate plaza out.
      { k: 'park', p: [[7, -80], [200, -80], [200, 95], [7, 95], [7, 22], [50, 22], [50, -22], [7, -22]] },
      { k: 'plaza', p: rect(7, -22, 50, 22) },
      // Woods: a strip between the ring road and the zoo's edge (a gap on the
      // west side by the hole in the hoarding), and the corner by the monkeys.
      { k: 'park', trees: true, p: rect(55, -80, 200, -73) },
      { k: 'park', trees: true, p: rect(55, 89, 200, 95) },
      { k: 'park', trees: true, p: rect(193, -73, 200, 89) },
      { k: 'park', trees: true, p: rect(55, -73, 63, -40) },
      { k: 'park', trees: true, p: rect(55, -28, 63, 89) },
      { k: 'park', trees: true, p: rect(113, 47, 125, 83) },
      { k: 'park', trees: true, p: rect(7, -80, 50, -52) },
      { k: 'park', trees: true, p: rect(7, 30, 52, 95) },
    ],
    blockers: [{ p: [[29.2, -7.8], [30.8, -7.8], [30.8, -6.2], [29.2, -6.2]] }, { p: [[29.2, 6.2], [30.8, 6.2], [30.8, 7.8], [29.2, 7.8]] }],
    pois: [
      // (while the zoo is closed, the park's pin is the gate plaza: taxis can't go in)
      { kind: 'landmark', x: ZOO_OPEN ? CROSS : 40, z: 0, name: L('서울어린이대공원', "Seoul Children's Grand Park", 'ソウル子供大公園', '首尔儿童大公园') },
      ...PENS.filter((p) => !p.in).map((p) => ({ kind: 'landmark', x: p.x, z: p.z, name: p.name })),
    ],
    landmarks: [
      { type: 'cgpgate', x: 30, z: 0, ry: 1.5708, label: L('정문', 'Main Gate', '正門', '正门') },
      { type: 'blossoms', p: [[52, -6], [58, -6]], gap: 6 },
      { type: 'blossoms', p: [[52, 6], [58, 6]], gap: 6 },
      {
        type: 'sign', x: 42, z: -15, ry: -1.5708,
        title: { ko: '서울어린이대공원', en: "Seoul Children's Grand Park", ja: 'ソウル子供大公園', zh: '首尔儿童大公园', es: 'Gran Parque Infantil de Seúl', id: 'Taman Anak Raya Seoul', vi: 'Công viên Thiếu nhi Seoul', hi: 'सियोल चिल्ड्रन्स ग्रैंड पार्क', fr: 'Grand Parc des enfants de Séoul', th: 'สวนสาธารณะเด็กโซล', ar: 'حديقة الأطفال الكبرى في سيول' },
        text: {
          ko: '1973년 어린이날에 문을 연 공원이에요. 실제 공원과 동물원은 입장료가 없어요. 게임 속 동물은 실제 동물원과 다를 수 있어요.',
          en: "Opened on Children's Day 1973. The real park and its zoo are free to enter. Animals in the game may differ from the real zoo.",
          ja: '1973年のこどもの日に開園した公園です。実際の公園と動物園は入場無料。ゲームの動物は実際の動物園と違うことがあります。',
          zh: '1973年儿童节开园。真实的公园和动物园免费入场。游戏中的动物可能与真实动物园不同。',
          es: 'Abrió el Día del Niño de 1973. El parque real y su zoo son gratuitos. Los animales del juego pueden ser distintos a los del zoo real.',
          id: 'Dibuka pada Hari Anak 1973. Taman dan kebun binatang aslinya gratis. Hewan di game bisa berbeda dari kebun binatang aslinya.',
          vi: 'Mở cửa vào Ngày Thiếu nhi năm 1973. Công viên và sở thú thật đều miễn phí vào cửa. Động vật trong game có thể khác sở thú thật.',
          hi: '1973 के बाल दिवस पर खुला। असली पार्क और चिड़ियाघर में प्रवेश मुफ़्त है। गेम के जानवर असली चिड़ियाघर से अलग हो सकते हैं।',
          fr: 'Ouvert le jour des enfants 1973. Le vrai parc et son zoo sont gratuits. Les animaux du jeu peuvent différer du vrai zoo.',
          th: 'เปิดในวันเด็กปี 1973 สวนและสวนสัตว์จริงเข้าชมฟรี สัตว์ในเกมอาจต่างจากสวนสัตว์จริง',
          ar: 'افتُتحت في يوم الطفل عام 1973. الحديقة الحقيقية وحديقة الحيوان فيها مجانيتان. قد تختلف الحيوانات في اللعبة عن حديقة الحيوان الحقيقية.',
        },
      },
      ...PENS.map((p) => ({ type: 'zoopen', ...p })),
      { type: 'zoocarts', ...CARTS },
    ],
  };
  for (const pen of PENS) for (const line of fenceLines(pen)) map.blockers.push(lineBlocker(line, pen.x, pen.z));
  for (const pen of PENS) for (const [a, b, c, d] of pen.solid || []) map.blockers.push({ p: rect(r1(pen.x + a), r1(pen.z + b), r1(pen.x + c), r1(pen.z + d)) });
  if (!ZOO_OPEN) {
    map.landmarks.push({ type: 'hoarding', closes: 'zoo', p: HOARDING }, {
      type: 'sign', x: 48, z: 5, ry: -1.5708,
      title: { ko: '동물원 개장 준비 중', en: 'The zoo is opening soon', ja: '動物園はまもなくオープン', zh: '动物园即将开放', es: 'El zoo abrirá pronto', id: 'Kebun binatang segera dibuka', vi: 'Sở thú sắp mở cửa', hi: 'चिड़ियाघर जल्द खुलेगा', fr: 'Le zoo ouvre bientôt', th: 'สวนสัตว์ใกล้เปิดแล้ว', ar: 'حديقة الحيوان ستفتح قريبًا' },
      text: {
        ko: '동물 친구들이 이사 오는 중이에요. 곧 문을 열게요!',
        en: 'The animals are moving in. We open soon!',
        ja: '動物たちが引っ越してきています。もうすぐオープン！',
        zh: '动物们正在搬进来。很快就开放！',
        es: 'Los animales se están mudando. ¡Abrimos pronto!',
        id: 'Para hewan sedang pindah ke sini. Segera dibuka!',
        vi: 'Các bạn thú đang chuyển đến. Sắp mở cửa rồi!',
        hi: 'जानवर यहाँ आ रहे हैं। हम जल्द खुलेंगे!',
        fr: 'Les animaux emménagent. Ouverture bientôt !',
        th: 'สัตว์ต่างๆ กำลังย้ายเข้ามา เร็วๆ นี้จะเปิดแล้ว!',
        ar: 'الحيوانات تنتقل إلى هنا. سنفتح قريبًا!',
      },
    });
    for (let i = 1; i < HOARDING.length; i++) map.blockers.push(lineBlocker([...HOARDING[i - 1], ...HOARDING[i]], 0, 0));
    // A gap at the foot of the west side, out of sight of the plaza: only
    // operators can crawl through it (main.js), to look round before it opens.
    map.landmarks.push({ type: 'doghole', closes: 'zoo', x: DOGHOLE[0], z: DOGHOLE[1], ry: Math.PI / 2 });
  }
  return map;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  writeFileSync(OUT, JSON.stringify(buildMap(), null, 1) + '\n');
  console.log('wrote', path.relative(root, OUT));
}
