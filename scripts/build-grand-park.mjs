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

// The zoo loop: a rectangle of paths, a main path along z 0 and a cross path.
const LOOP = { x0: 60, x1: 180, z0: -44, z1: 44, cx: 120 };

// Pens: centre (local metres), size, fence, and who lives there.
export const PENS = [
  {
    id: 'monkeys', x: 90, z: -22, w: 36, d: 30, fence: 'mesh', ground: 'grass', board: 's',
    name: L('원숭이마을', 'Monkey Village', 'サル村', '猴子村'),
    props: [['log', -6, -4], ['log', 8, 5], ['tree', -13, 9], ['tree', 13, -9], ['rock', 0, 10]],
    groups: [{ kind: 'macaque', n: 8 }],
  },
  {
    id: 'petting', x: 90, z: 22, w: 36, d: 30, fence: 'low', ground: 'grass', board: 'n', pet: true,
    gate: { side: 'n', at: 0, w: 4 },
    name: L('꼬마동물마을', 'Little Animal Village', 'こども動物村', '小动物村'),
    props: [['barn', 11, 8], ['hay', 3, 10], ['hay', 5, 12, 0.6], ['hutch', -12, 9], ['hutch', -15, 4, 0.4], ['tree', -15, -11]],
    groups: [
      { kind: 'goat', n: 3, box: [0, -12, 16, 4] },
      { kind: 'sheep', n: 3, box: [0, -12, 16, 4] },
      { kind: 'rabbit', n: 4, box: [-16, -2, -3, 13] },
      { kind: 'guineapig', n: 5, box: [-16, -2, -3, 13] },
    ],
  },
  {
    id: 'birds', x: 100, z: 62, w: 44, d: 20, fence: 'aviary', ground: 'grass', board: 'n',
    name: L('새장', 'Bird House', '鳥の家', '鸟舍'),
    pond: [-9, 1, 6],
    props: [['tree', 16, 3], ['rock', 6, 5]],
    groups: [
      { kind: 'flamingo', n: 8, box: [-16, -5, -3, 7] },
      { kind: 'pelican', n: 3, box: [-18, -7, 2, 7] },
      { kind: 'peacock', n: 2, box: [5, -7, 20, 7] },
    ],
  },
];

const r1 = (v) => Math.round(v * 10) / 10;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// A fence line as a thin blocker (0.4 m thick).
function lineBlocker([x1, z1, x2, z2], ox, oz) {
  const t = 0.2;
  const [ax, bx] = [Math.min(x1, x2), Math.max(x1, x2)], [az, bz] = [Math.min(z1, z2), Math.max(z1, z2)];
  return { p: rect(r1(ax - t + ox), r1(az - t + oz), r1(bx + t + ox), r1(bz + t + oz)) };
}

export function buildMap() {
  const { x0, x1, z0, z1, cx } = LOOP;
  const map = {
    meta: {
      district: 'grand-park',
      source: "hand-made (game map, not to scale): Seoul Children's Grand Park in Gwangjin-gu (opened 1973, free entry). Simplified to the zoo: the main gate on Neungdong-ro by Children's Grand Park Station (Line 7), a gate plaza and the zoo loop with its pens, wrapped in a strip of woods. The animals are the game's choice and may differ from the real zoo. Built by scripts/build-grand-park.mjs; placed by its anchor, Children's Grand Park Station (region.json).",
    },
    roads: [
      { k: 'secondary', w: 14, p: [[0, -80], [0, 95]], n: L('능동로', 'Neungdong-ro', '陵洞路', '陵洞路') },
      { k: 'walk', w: 6, p: [[50, 0], [x1, 0]] },
      { k: 'walk', w: 5, p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]] },
      { k: 'walk', w: 5, p: [[cx, z0], [cx, z1]] },
    ],
    buildings: [{ h: 8, p: rect(14, -46, 36, -32), n: L('서울어린이대공원 안내센터', "Children's Grand Park Information Center", '子供大公園インフォメーションセンター', '儿童大公园信息中心') }],
    rail: [],
    areas: [
      // The park ground round the zoo, leaving the gate plaza out.
      { k: 'park', p: [[7, -80], [200, -80], [200, 95], [7, 95], [7, 22], [50, 22], [50, -22], [7, -22]] },
      { k: 'plaza', p: rect(7, -22, 50, 22) },
      // Woods: a strip round the outside.
      { k: 'park', trees: true, p: rect(50, -80, 200, -52) },
      { k: 'park', trees: true, p: rect(188, -52, 200, 95) },
      { k: 'park', trees: true, p: rect(126, 52, 188, 95) },
      { k: 'park', trees: true, p: rect(50, 76, 126, 95) },
      { k: 'park', trees: true, p: rect(7, -80, 50, -52) },
      { k: 'park', trees: true, p: rect(7, 30, 52, 95) },
      // Lawns in the two quarters still waiting for their pens.
      { k: 'grass', p: rect(cx + 6, z0 + 6, x1 - 6, -6) },
      { k: 'grass', p: rect(cx + 6, 6, x1 - 6, z1 - 6) },
    ],
    blockers: [{ p: [[29.2, -7.8], [30.8, -7.8], [30.8, -6.2], [29.2, -6.2]] }, { p: [[29.2, 6.2], [30.8, 6.2], [30.8, 7.8], [29.2, 7.8]] }],
    pois: [
      { kind: 'landmark', x: cx, z: 0, name: L('서울어린이대공원', "Seoul Children's Grand Park", 'ソウル子供大公園', '首尔儿童大公园') },
      ...PENS.map((p) => ({ kind: 'landmark', x: p.x, z: p.z, name: p.name })),
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
    ],
  };
  for (const pen of PENS) for (const line of fenceLines(pen)) map.blockers.push(lineBlocker(line, pen.x, pen.z));
  return map;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  writeFileSync(OUT, JSON.stringify(buildMap(), null, 1) + '\n');
  console.log('wrote', path.relative(root, OUT));
}
