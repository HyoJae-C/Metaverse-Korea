#!/usr/bin/env node
// Builds Hongdae (districts/hongdae.json) at a quarter of the real size, like
// the rest of the Seoul map, and puts its shops on the street.
//
// Real Hongdae, from north to south: the Gyeongui Line Forest Park
// (Yeonnam) ends at Yanghwa-ro, where Hongik Univ. Station is; Hongdae
// Walking Street starts across the road from the station and runs south
// past the busking zone. In Seoul the busking zone is about 400 m from the
// station; here it is about 85 m. Streets are drawn straight, like the other
// hand-made districts; road widths and buildings stay normal size.
//
// The busking zone is the district's origin (its anchor in region.json):
// the stage, the low steps and the open plaza around them keep the size
// they had in the full-size map, since the crowd is what the street is for.
//
//   node scripts/build-hongdae.mjs          writes the map and sets the "at"
//                                           of the shops in SHOPS (stores.json)
//   node scripts/build-hongdae.mjs --lots   also prints how many lots each row has

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
const rand = rng(239); // (Hongik Univ. is station 239)
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// x east, z south, metres from the busking stage.
const PLAZA = { x: 22, z0: -54, z1: 22 }; // the open plaza round the stage
const Y = -80; // Yanghwa-ro
const MID = 40; // the cross street south of the plaza
const S = 100; // the south street
const DONGGYO = -90, EAST = 55, WAUSAN = 110, WEST = -120;
const ALLEY = -20; // the perfume alley, east of the plaza

const roads = [
  { k: 'primary', w: 16, p: [[WEST, Y], [WAUSAN, Y]], n: name('Yanghwa-ro', '양화로', '楊花路', '杨花路') },
  { k: 'walk', w: 12, p: [[0, Y], [0, S]], n: name('Hongdae Walking Street', '홍대 걷고싶은거리', '弘大 歩きたい通り', '弘大步行街') },
  { k: 'tertiary', w: 9, p: [[DONGGYO, Y], [DONGGYO, S]], n: name('Donggyo-ro', '동교로', '東橋路', '东桥路') },
  { k: 'tertiary', w: 9, p: [[EAST, Y], [EAST, S]] },
  { k: 'primary', w: 14, p: [[WAUSAN, Y], [WAUSAN, S]], n: name('Wausan-ro', '와우산로', '臥牛山路', '卧牛山路') },
  { k: 'tertiary', w: 9, p: [[WEST, S], [WAUSAN, S]] },
  { k: 'residential', w: 7, p: [[WEST, MID], [WAUSAN, MID]] },
  { k: 'residential', w: 6, p: [[PLAZA.x, ALLEY], [EAST, ALLEY]] },
];
// Where a building front stands: the road's edge plus a 3 m pavement.
const front = (c, w, side) => c + side * (w / 2 + 3);

const buildings = [], lots = {};
// A row of buildings along one side of a street. The fronts run from a to b
// (along x when `axis` is 'x', else along z) at `at`; the buildings go `dir`
// (+1 or -1) away from the street, `depth` deep.
function row(id, axis, a, b, at, dir, depth = 12, { w = [9, 14], h = [7, 16] } = {}) {
  const list = (lots[id] ||= []);
  let s = Math.min(a, b);
  const end = Math.max(a, b);
  while (end - s >= w[0] - 0.01) {
    let len = w[0] + rand() * (w[1] - w[0]);
    if (end - s - len < w[0]) len = end - s; // the last one fills the gap
    const t0 = s, t1 = s + len, f0 = at, f1 = at + dir * depth;
    const p = axis === 'x' ? [[t0, f0], [t1, f0], [t1, f1], [t0, f1]] : [[f0, t0], [f1, t0], [f1, t1], [f0, t1]];
    buildings.push({ h: Math.round(h[0] + rand() * (h[1] - h[0])), p: p.map(([x, z]) => [r1(x), r1(z)]) });
    // The shop's spot: the middle of the front, 2.5 m out on the pavement.
    const mid = (t0 + t1) / 2, out = at - dir * 2.5;
    list.push(axis === 'x' ? [r1(mid), r1(out)] : [r1(out), r1(mid)]);
    s = t1;
  }
}

const yS = front(Y, 16, 1); // -69
const midN = front(MID, 7, -1), midS = front(MID, 7, 1); // 33.5, 46.5
const sN = front(S, 9, -1); // 92.5
const dW = front(DONGGYO, 9, -1), dE = front(DONGGYO, 9, 1); // -97.5, -82.5
const eW = front(EAST, 9, -1), eE = front(EAST, 9, 1); // 47.5, 62.5
const wW = front(WAUSAN, 14, -1); // 100
const walkW = front(0, 12, -1), walkE = front(0, 12, 1); // -9, 9
const alleyN = front(ALLEY, 6, -1), alleyS = front(ALLEY, 6, 1); // -26, -14
const plazaW = -PLAZA.x - 2, plazaE = PLAZA.x + 2; // fronts 2 m back from the plaza
const D = 12;

// West of Donggyo-ro: a row of Korean restaurants facing the street.
row('yWestW', 'x', WEST, dW, yS, 1);
row('donggyoW', 'z', yS + D, midN, dW, -1);
row('midWestN', 'x', WEST, dW, midN, -1, 11);
row('midWestS', 'x', WEST, dW, midS, 1);
row('donggyoWS', 'z', midS + D, sN - D, dW, -1);
row('sWest', 'x', WEST, dW, sN, -1);

// Between Donggyo-ro and the walking street, north of the cross street.
row('yNW', 'x', dE, walkW, yS, 1);
row('donggyoE', 'z', yS + D, midN - 11, dE, 1);
row('plazaW', 'z', yS + D, midN - 11, plazaW, -1);
row('midNW', 'x', dE, walkW, midN, -1, 11);
// ... and south of it.
row('midSW', 'x', dE, walkW, midS, 1);
row('donggyoES', 'z', midS + D, sN - D, dE, 1);
row('walkWS', 'z', midS + D, sN - D, walkW, -1);
row('sSW', 'x', dE, walkW, sN, -1);

// East of the walking street: the station square by Yanghwa-ro (open), the
// plaza's east side, the perfume alley, the street at x 55.
row('plazaEN', 'z', PLAZA.z0, alleyN - 10, plazaE, 1, 11.5);
row('eastWN', 'z', yS, alleyN - 10, eW, -1);
row('alleyN', 'x', plazaE, eW, alleyN, -1, 10, { w: [9, 12] });
row('alleyS', 'x', plazaE, eW, alleyS, 1, 10, { w: [9, 12] });
row('plazaES', 'z', alleyS + 10, midN - 11, plazaE, 1, 11.5);
row('eastWS', 'z', alleyS + 10, midN - 11, eW, -1);
row('midNE', 'x', walkE, eW, midN, -1, 11);
row('midSE', 'x', walkE, eW, midS, 1);
row('walkES', 'z', midS + D, sN - D, walkE, 1);
row('eastWSS', 'z', midS + D, sN - D, eW, -1);
row('sSE', 'x', walkE, eW, sN, -1);

// Between the street at x 55 and Wausan-ro.
row('yE', 'x', eE, wW, yS, 1);
row('eastE', 'z', yS + D, midN - 11, eE, 1);
row('wausanW', 'z', yS + D, midN - 11, wW, -1);
row('midNEE', 'x', eE, wW, midN, -1, 11);
row('midSEE', 'x', eE, wW, midS, 1);
row('eastES', 'z', midS + D, sN - D, eE, 1);
row('wausanWS', 'z', midS + D, sN - D, wW, -1);
row('sE', 'x', eE, wW, sN, -1);

const areas = [{ k: 'plaza', p: [[-PLAZA.x, PLAZA.z0], [PLAZA.x, PLAZA.z0], [PLAZA.x, PLAZA.z1], [-PLAZA.x, PLAZA.z1]] }];
const landmarks = [
  { type: 'arch', x: 0, z: Y + 16, w: 13, ry: 3.14159, title: 'HONGDAE WALKING STREET', sub: '홍대 걷고싶은거리', color: '#e0457b' },
  { type: 'arch', x: 0, z: S - 10, w: 13, title: 'HONGDAE WALKING STREET', sub: '홍대 걷고싶은거리', color: '#e0457b' },
  { type: 'busking', x: 0, z: 0 },
];
const pois = [
  { kind: 'landmark', x: 0, z: -18, name: name('Hongdae Busking Zone', '홍대 버스킹존', '弘大バスキングゾーン', '弘大街头表演区') },
  { kind: 'landmark', x: 0, z: -15.5, name: name('Hongdae Walking Street', '홍대 걷고싶은거리', '弘大 歩きたい通り', '弘大步行街') },
];
const map = {
  meta: { district: 'hongdae', source: 'hand-made (scripts/build-hongdae.mjs; game map at about 1/4 of the real size, loosely after Hongdae, Mapo-gu). Street names are real; every shop is fictional.' },
  roads, buildings, rail: [], areas, blockers: [], pois, landmarks,
};

// Which lot each shop takes: [row, index along the row]. Kept together the
// way they were: the info centre and name tags by the station, salons, tarot
// and clothes round the plaza, the perfume alley, the restaurants on
// Donggyo-ro, the big rooms (sauna, gym, yoga, climbing) down the street.
const SHOPS = {
  // By the station, at the top of the walking street.
  'info-hongdae': ['plazaW', 0],
  'hongdae-name-tags': ['eastWN', 0],
  'bike-research-lab': ['yE', 0],
  'graffiti-caps': ['yE', 2],
  'soda24-mart': ['yNW', 5],
  'stage-idol-hair': ['eastWN', 1],
  // Round the plaza.
  'groove-hair': ['plazaW', 1],
  'croffle-house': ['plazaW', 2],
  'lucky-piggy-tarot': ['plazaW', 3],
  'stripe-alley': ['plazaW', 4],
  'sorimaru-lp': ['plazaW', 5],
  'indie-hair-room': ['plazaEN', 0],
  'wild-neon': ['eastE', 0],
  'neon-punk-hair': ['plazaES', 0],
  'indie-record': ['plazaES', 1],
  'cheongchima': ['plazaW', 6],
  // The perfume alley.
  'kkeung-sanghoe': ['alleyN', 0],
  'oops-parfum': ['alleyN', 1],
  'heart-ppyong': ['alleyS', 0],
  'moai-scent-lab': ['alleyS', 1],
  'punggyeong-scent': ['eastWS', 0],
  // The cross street south of the plaza.
  'neoguri-raccoon-cafe': ['midNE', 0],
  'haemjji-hamster-cafe': ['midNE', 1],
  'gogo-cat-cafe': ['midNW', 5],
  'big-paws-dog-cafe': ['midNW', 4],
  'bingsu-lab': ['midSW', 4],
  'street-kick': ['midSE', 2],
  'moonbeam-dessert': ['midNW', 2],
  'starlight-tarot': ['midNW', 1],
  'ear-candy': ['midNEE', 0],
  // Down the walking street.
  'onsaem-jjimjil': ['walkWS', 0],
  'muscle-gym': ['walkES', 0],
  'vintage-garage': ['midSW', 5],
  'glow-lab': ['midSE', 1],
  'boulder-bloc': ['walkWS', 1],
  'sum-yoga': ['midSE', 0],
  'indie-beans': ['sSW', 5],
  'sticker-planet': ['sSE', 0],
  'byeolbit-mart': ['sSE', 1],
  'gil-coffee': ['sE', 1],
  // Korean restaurants on Donggyo-ro, facing each other.
  'baro-imat-galbitang': ['donggyoW', 0],
  'chuncheon-dakgalbi': ['donggyoW', 1],
  'haengbok-gopchang': ['donggyoW', 2],
  'deumppuk-yukhoe': ['donggyoW', 3],
  'tojong-sundae-gukbap': ['donggyoW', 4],
  'siwon-kalguksu': ['donggyoE', 0],
  'mujeok-samgyeopsal': ['donggyoE', 1],
  'masitda-chadolbagi': ['donggyoE', 2],
  'chammat-gejang': ['donggyoE', 3],
  'gungmin-seolleongtang': ['donggyoE', 4],
};

writeFileSync(path.join(R, 'districts', 'hongdae.json'), JSON.stringify(map) + '\n');
const region = readJson('region.json');
const [ox, oz] = region.districts.find((x) => x.id === 'hongdae').offset;
// stores.json is hand-formatted, so only the "at" of each placed shop is
// rewritten in the text.
let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
function setAt(sid, at) {
  const i = stores.indexOf(`"id": "${sid}"`);
  if (i < 0) throw new Error(`${sid}: not in stores.json`);
  let end = stores.indexOf('\n    {', i);
  if (end < 0) end = stores.length;
  const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${at[0]}, ${at[1]}]`);
  stores = stores.slice(0, i) + part + stores.slice(end);
}
if (process.argv.includes('--lots')) for (const [k, v] of Object.entries(lots)) console.log('  ', k, v.length, JSON.stringify(v));
const used = new Set();
for (const [sid, [rowId, i]] of Object.entries(SHOPS)) {
  const at = lots[rowId]?.[i];
  if (!at) throw new Error(`${sid}: no lot ${rowId}[${i}] (row has ${lots[rowId]?.length || 0})`);
  if (used.has(`${rowId}:${i}`)) throw new Error(`${sid}: lot ${rowId}[${i}] is taken`);
  used.add(`${rowId}:${i}`);
  setAt(sid, [r1(at[0] + ox), r1(at[1] + oz)]);
}
writeFileSync(path.join(R, 'stores.json'), stores);
console.log(`hongdae: ${buildings.length} buildings, ${Object.keys(SHOPS).length} shops placed`);
