#!/usr/bin/env node
// Builds the two Mapo-gu districts west and north of Hongdae, and
// puts their shops on the street:
//
//   Yeonnam-dong (districts/yeonnam.json): the Gyeongui Line Forest Park
//     ("Yeontral Park") running north from Hongdae Walking Street, with
//     small shops, cafés and a Chinese restaurant in the lanes either side.
//   Mangwon-dong (districts/mangwon.json): drawn at 1/4 on its real
//     streets by scripts/build-mangwon.mjs (Mangwon Market, Poeun-ro, the
//     Han River park); this script writes it and places its shops.
//
// Yeonnam is a game map, not to scale (see docs/WORLD.md). Street names are
// the real ones; every shop is fictional (sample data).
//
//   node scripts/build-mapo.mjs   writes both maps and sets the "at" of the
//                                 shops listed in SHOPS in stores.json
//                                 (world metres, using each district's offset
//                                 in region.json)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mangwon, SHOPS as MANGWON_SHOPS } from './build-mangwon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const readJson = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

// Seeded random numbers, so the map comes out the same every time.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// A district under construction: buildings in rows, and the shop lots
// (one per building front) by row name.
function district(seed) {
  const rand = rng(seed);
  const buildings = [], lots = {};
  // A row of buildings along one side of a street. The front runs from a to
  // b (along x when `axis` is 'x', else along z) at `front`; the buildings
  // go `dir` (+1 or -1) away from the street, `depth` deep.
  function row(id, axis, a, b, front, dir, depth, { w = [8, 13], h = [6, 12] } = {}) {
    const list = (lots[id] ||= []);
    let s = Math.min(a, b);
    const end = Math.max(a, b);
    while (end - s >= w[0]) {
      let len = w[0] + rand() * (w[1] - w[0]);
      if (end - s - len < w[0]) len = end - s; // the last one fills the gap
      const t0 = s, t1 = s + len, f0 = front, f1 = front + dir * depth;
      const p = axis === 'x'
        ? [[t0, f0], [t1, f0], [t1, f1], [t0, f1]]
        : [[f0, t0], [f1, t0], [f1, t1], [f0, t1]];
      const height = Math.round(h[0] + rand() * (h[1] - h[0]));
      buildings.push({ h: height, p: p.map(([x, z]) => [r1(x), r1(z)]) });
      // The shop's spot: the middle of the front, 2.5 m out on the pavement.
      const mid = (t0 + t1) / 2, out = front - dir * 2.5;
      list.push(axis === 'x' ? [r1(mid), r1(out)] : [r1(out), r1(mid)]);
      s = t1;
    }
  }
  return { buildings, lots, row };
}

// ---------------------------------------------------------------- Yeonnam
// x east, z south. The forest path runs north–south at x 50, straight on
// from Hongdae Walking Street; Seongmisan-ro crosses it at z -30.
function yeonnam() {
  const d = district(239);
  const { row } = d;
  const H = { w: [8, 12], h: [5, 11] }; // low houses turned into shops
  // West of the park, between Donggyo-ro and the park: shops face both ways.
  row('parkWestS', 'z', -24, 97, 30, -1, 11, H); // facing the park (south of Seongmisan-ro)
  row('parkWestN', 'z', -97, -36, 30, -1, 11, H);
  row('donggyoES', 'z', -24, 97, -34, 1, 11, H); // facing Donggyo-ro
  row('donggyoEN', 'z', -97, -36, -34, 1, 11, H);
  // East of the park, between the park and the east lane.
  row('parkEastS', 'z', -24, 97, 70, 1, 11, H);
  row('parkEastN', 'z', -97, -36, 70, 1, 11, H);
  row('laneW', 'z', -97, -36, 103, -1, 12, H); // west side of the east lane
  row('laneW2', 'z', -24, 97, 103, -1, 12, H);
  row('laneE', 'z', -97, -36, 115, 1, 12, H); // east side of the east lane (gap for Seongmisan-ro)
  row('laneE2', 'z', -24, 97, 115, 1, 12, H);
  // West of Donggyo-ro: a row facing it, then the back lanes.
  row('donggyoWS', 'z', -24, 36, -46, -1, 12, H);
  row('donggyoWS2', 'z', 44, 97, -46, -1, 12, H);
  row('donggyoWN', 'z', -97, -36, -46, -1, 12, H);
  // The west lane's rows leave gaps where Seongmisan-ro (z -30) and the
  // alley (z 40) cross it, so no building stands on either street.
  row('westLane', 'z', -97, -36, -104, 1, 11, H); // east side of the west lane
  row('westLane2', 'z', -24, 36, -104, 1, 11, H);
  row('westLane3', 'z', 44, 97, -104, 1, 11, H);
  row('westEdge', 'z', -97, -36, -116, -1, 12, H); // west side of the west lane
  row('westEdge2', 'z', -24, 36, -116, -1, 12, H);
  row('westEdge3', 'z', 44, 97, -116, -1, 12, H);
  // Along Seongmisan-ro and the alley (fronts facing them, between the rows).
  row('seongmisanS', 'x', -92, -59, -25, 1, 10, H);
  row('seongmisanN', 'x', -92, -59, -35, -1, 10, H);
  row('alleyN', 'x', -92, -59, 36, -1, 10, H);
  row('alleyS', 'x', -92, -59, 44, 1, 10, H);
  row('eastLaneS', 'x', 128, 148, -25, 1, 10, H);
  row('eastLaneN', 'x', 128, 148, -35, -1, 10, H);

  const roads = [
    { k: 'walk', w: 5, p: [[50, 100], [50, -100]], n: name('Gyeongui Line Forest Path', '경의선숲길', '京義線森の道', '京义线林荫路') },
    { k: 'tertiary', w: 9, p: [[-150, -30], [150, -30]], n: name('Seongmisan-ro', '성미산로', '城美山路', '城美山路') },
    { k: 'tertiary', w: 9, p: [[-40, 100], [-40, -100]], n: name('Donggyo-ro', '동교로', '東橋路', '东桥路') },
    { k: 'residential', w: 6, p: [[-110, 100], [-110, -100]], n: name('Yeonnam lane', '연남동 골목', '延南洞の路地', '延南洞小巷') },
    { k: 'residential', w: 6, p: [[-150, 40], [-40, 40]], n: name('Yeonnam lane', '연남동 골목', '延南洞の路地', '延南洞小巷') },
    { k: 'residential', w: 6, p: [[109, 100], [109, -100]], n: name('Yeonnam lane', '연남동 골목', '延南洞の路地', '延南洞小巷') },
  ];
  const areas = [
    // The forest park: a long, narrow strip of lawn and trees on the old
    // railway, with the path down the middle (picnic mats go on the grass).
    { k: 'park', trees: true, p: [[32, -100], [68, -100], [68, 100], [32, 100]] },
    { k: 'plaza', p: [[34, 84], [66, 84], [66, 100], [34, 100]] },
  ];
  const landmarks = [
    { type: 'arch', x: 50, z: 96, w: 9, title: 'GYEONGUI LINE FOREST PARK', sub: '경의선숲길 · 연남동', color: '#3f7a4f' },
    { type: 'arch', x: 50, z: -96, w: 9, ry: Math.PI, title: 'GYEONGUI LINE FOREST PARK', sub: '경의선숲길 · 연남동', color: '#3f7a4f' },
    { type: 'tracks', x: 61, z: 0, len: 180 }, // a stretch of the old railway, kept in the grass
    { type: 'sign', x: 42, z: 80, ry: Math.PI / 2,
      title: name('Gyeongui Line Forest Park', '경의선숲길', '京義線森の道', '京义线林荫路'),
      text: {
        en: 'Trains on the old Gyeongui Line ran here. When the line went underground, the track bed became a long, narrow park. People call this stretch "Yeontral Park". Bring a picnic mat!',
        ko: '옛 경의선 기차가 달리던 길이에요. 철길이 지하로 들어간 뒤 그 자리가 길고 좁은 공원이 됐어요. 이 구간을 사람들은 "연트럴파크"라고 불러요. 돗자리를 챙겨 오세요!',
        ja: 'かつて京義線の列車が走っていた道です。線路が地下に移ったあと、跡地が細長い公園になりました。この区間は「ヨントラルパーク」と呼ばれています。レジャーシートを持ってきてね！',
        zh: '这里曾是旧京义线火车经过的地方。铁路转入地下后，原来的路基变成了一条细长的公园。人们把这一段叫作“延特尔公园”。记得带野餐垫！',
      } },
  ];
  // Benches along the path, facing it.
  for (const z of [-80, -55, 10, 35, 60]) {
    landmarks.push({ type: 'bench', x: 44, z, ry: Math.PI / 2 });
    landmarks.push({ type: 'bench', x: 56, z: z + 12, ry: -Math.PI / 2 });
  }
  const pois = [
    { kind: 'landmark', x: 50, z: 0, name: name('Gyeongui Line Forest Park', '경의선숲길', '京義線森の道', '京义线林荫路') },
    { kind: 'landmark', x: -40, z: 30, name: name('Yeonnam-dong Chinese restaurants', '연남동 중식당 거리', '延南洞の中華料理店', '延南洞中餐馆') },
  ];
  return {
    map: {
      meta: { district: 'yeonnam', source: 'hand-made (game map, not to scale; loosely after Yeonnam-dong, Mapo-gu). Street names are real; all shops are fictional.' },
      roads, buildings: d.buildings, rail: [], areas, blockers: [], pois, landmarks,
    },
    lots: d.lots,
  };
}

// Which lot each shop takes: [row, index along the row].
const SHOPS = {
  yeonnam: {
    'info-yeonnam': ['parkWestS', 7],
    'sopung-picnic': ['parkWestS', 5],
    'cheolgil-coffee': ['parkEastS', 2],
    'gureum-bakery': ['parkEastS', 5],
    'small-things-room': ['parkWestN', 2],
    'chaekgalpi-books': ['parkEastN', 1],
    'film-day-photo': ['parkWestS', 2],
    'munbang-vintage': ['donggyoES', 3],
    'wolhwa-banjeom': ['donggyoES', 6],
  },
};

const mw = mangwon();
SHOPS.mangwon = MANGWON_SHOPS;
const FIXED = { mangwon: mw.fixed };
const built = { yeonnam: yeonnam(), mangwon: mw };
const region = readJson('region.json');
// stores.json is hand-formatted, so only the "at" of each placed shop is
// rewritten in the text.
let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
function setAt(sid, at) {
  const i = stores.indexOf(`"id": "${sid}"`);
  if (i < 0) { console.log(`${sid}: not in stores.json`); return; }
  let end = stores.indexOf('\n    {', i);
  if (end < 0) end = stores.length;
  const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${at[0]}, ${at[1]}]`);
  stores = stores.slice(0, i) + part + stores.slice(end);
}
for (const [id, { map, lots }] of Object.entries(built)) {
  writeFileSync(path.join(R, 'districts', id + '.json'), JSON.stringify(map) + '\n');
  const d = region.districts.find((x) => x.id === id);
  if (!d) { console.log(`${id}: not in region.json yet, shops not placed`); continue; }
  const [ox, oz] = d.offset;
  const spots = { ...FIXED[id] };
  for (const [sid, [rowId, i]] of Object.entries(SHOPS[id])) {
    const at = lots[rowId]?.[i];
    if (!at) throw new Error(`${sid}: no lot ${rowId}[${i}] (row has ${lots[rowId]?.length || 0})`);
    spots[sid] = at;
  }
  for (const [sid, [x, z]] of Object.entries(spots)) setAt(sid, [r1(x + ox), r1(z + oz)]);
  if (id === 'mangwon') console.log(`park stamp stand: [${r1(mw.stamp.at[0] + ox)}, ${r1(mw.stamp.at[1] + oz)}], ry ${mw.stamp.ry}; market south gate [${r1(mw.market.south[0] + ox)}, ${r1(mw.market.south[1] + oz)}]`);
  console.log(`${id}: ${map.buildings.length} buildings, ${Object.keys(spots).length} shops placed`);
  if (process.argv.includes('--lots')) for (const [k, v] of Object.entries(lots)) console.log('  ', k, v.length);
}
writeFileSync(path.join(R, 'stores.json'), stores);
