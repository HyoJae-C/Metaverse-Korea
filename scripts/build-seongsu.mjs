#!/usr/bin/env node
// Builds Seongsu's game map (public/regions/seongsu/map.json) from the
// hand-made layout below. It is not a copy of a real map: only the big lines
// of the neighbourhood are kept (Achasan-ro under Line 2, Seongsui-ro,
// Yeonmujang-gil, Seoul Forest to the west, the Han River to the south), and
// the blocks are drawn so that the streets are lined with shops.
//
// Every block side that faces a shopping street gets small shop buildings
// ("lots"); the other sides get a few plain buildings. Shops in stores.json
// stand in front of a lot ("at": [x, z]); `--place` assigns free lots to the
// shops listed in PLACE below and writes those spots into stores.json.
//
//   node scripts/build-seongsu.mjs           # map.json only
//   node scripts/build-seongsu.mjs --place   # also re-place the shops
//
// Coordinates are metres: x east, z south, (0, 0) near Seongsu Station.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/regions/seongsu');

// Deterministic "random" so the map only changes when the layout does.
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
const rand = rng(20261104);
const pick = (lo, hi) => lo + rand() * (hi - lo);
const r1 = (v) => Math.round(v * 10) / 10;

export const BOUNDS = [-260, -110, 260, 410];
const name = (ko, en, ja, zh) => ({ ko, en, ...(ja ? { ja } : {}), ...(zh ? { zh } : {}) });

// ── Streets ───────────────────────────────────────────────────────────────
// h: runs east-west at z; v: runs north-south at x.
const STREETS = [
  { id: 'achasan', h: -86, from: -260, to: 260, k: 'secondary', w: 16, n: name('아차산로', 'Achasan-ro', '峨嵯山路', '峨嵯山路') },
  { id: 'cafe', h: -6, from: -110, to: 130, k: 'residential', w: 7, n: name('성수 카페거리', 'Café Street', 'カフェ通り', '咖啡街') },
  { id: 'seoulsup', h: 79, from: -260, to: 260, k: 'tertiary', w: 10, n: name('서울숲길', 'Seoulsup-gil', 'ソウルの森通り', '首尔林路') },
  { id: 'yeonmujang', h: 170, from: -110, to: 200, k: 'residential', w: 9, n: name('연무장길', 'Yeonmujang-gil', 'ヨンムジャンギル', '练武场路') },
  { id: 'south', h: 262, from: -110, to: 200, k: 'residential', w: 7 },
  { id: 'ttukseom', h: 352, from: -260, to: 260, k: 'tertiary', w: 12, n: name('뚝섬로', 'Ttukseom-ro', 'トゥクソム路', '纛岛路') },
  { id: 'west', v: -185, from: -86, to: 79, k: 'residential', w: 8 },
  { id: 'seongsuil', v: -110, from: -86, to: 352, k: 'tertiary', w: 10, n: name('성수일로', 'Seongsuil-ro', '聖水一路', '圣水一路') },
  { id: 'brick', v: -25, from: -6, to: 262, k: 'walk', w: 5, n: name('붉은 벽돌 골목', 'Red Brick Lane', '赤レンガ路地', '红砖小巷') },
  { id: 'seongsui', v: 60, from: -86, to: 352, k: 'secondary', w: 14, n: name('성수이로', 'Seongsui-ro', '聖水二路', '圣水二路') },
  { id: 'east1', v: 130, from: -86, to: 262, k: 'residential', w: 7 },
  { id: 'east2', v: 200, from: -86, to: 352, k: 'residential', w: 8 },
];
const S = Object.fromEntries(STREETS.map((s) => [s.id, s]));
const SIDEWALK = 2.5;

// Paths through Seoul Forest and along the river.
const WALKS = [
  { w: 4, p: [[-260, 372], [260, 372]], n: name('한강 산책로', 'Han River Path', '漢江遊歩道', '汉江步道') },
  { w: 4, p: [[-110, 352], [-110, 372]] },
  { w: 4, p: [[60, 352], [60, 372]] },
  { w: 4, p: [[200, 352], [200, 372]] },
  { w: 4, p: [[-115, 125], [-170, 150], [-225, 215], [-190, 290], [-115, 318]], n: name('서울숲 산책길', 'Seoul Forest Trail', 'ソウルの森散策路', '首尔林步道') },
  { w: 3, p: [[-185, 84], [-170, 150]] },
  { w: 3, p: [[-190, 290], [-200, 347]] },
  { w: 3, p: [[-225, 215], [-260, 205]] },
];

// ── Blocks ────────────────────────────────────────────────────────────────
// Each block lies between four streets (or the map edge) and says what each
// side holds: 'shop' (small shop buildings), 'plain' (a few long buildings)
// or 'open' (nothing). `area` paints the ground (plaza, park, grass).
const E = (v) => ({ edge: v }); // map edge: no street
const B = [
  // North of Achasan-ro: offices along the Line 2 viaduct, and right across
  // from Seongsu Station a 60 m screen tower (region.json "screens").
  { x: [E(-260), 25], z: [E(-110), 'achasan'], sides: { s: 'plain' }, tall: true },
  { x: [25, 95], z: [E(-110), 'achasan'], sides: { s: 'plain' }, h: 60 },
  { x: [95, E(260)], z: [E(-110), 'achasan'], sides: { s: 'plain' }, tall: true },
  // West of Seongsuil-ro, between Achasan-ro and Seoulsup-gil: a pocket park and a big building.
  { x: [E(-260), 'west'], z: ['achasan', 'seoulsup'], sides: {}, area: 'park' },
  { x: ['west', 'seongsuil'], z: ['achasan', 'seoulsup'], sides: { n: 'plain' } },
  // Station blocks along Achasan-ro.
  { x: ['seongsuil', 'brick'], z: ['achasan', 'cafe'], sides: { n: 'plain', s: 'shop', w: 'plain', e: 'plain' } },
  { x: ['brick', 'seongsui'], z: ['achasan', 'cafe'], sides: { n: 'shop', e: 'shop', s: 'shop', w: 'plain' }, cut: { ne: 16 } },
  { x: ['seongsui', 'east1'], z: ['achasan', 'cafe'], sides: { n: 'shop', w: 'shop', s: 'plain', e: 'plain' }, cut: { nw: 16 } },
  { x: ['east1', 'east2'], z: ['achasan', 'seoulsup'], sides: { n: 'plain', w: 'plain', s: 'plain', e: 'plain' } },
  { x: ['east2', E(260)], z: ['achasan', 'seoulsup'], sides: {}, area: 'park' },
  // Café Street to Seoulsup-gil.
  { x: ['seongsuil', 'brick'], z: ['cafe', 'seoulsup'], sides: { n: 'shop', e: 'shop', s: 'plain', w: 'plain' } },
  { x: ['brick', 'seongsui'], z: ['cafe', 'seoulsup'], sides: { n: 'shop' }, back: 14, area: 'plaza', square: true },
  { x: ['seongsui', 'east1'], z: ['cafe', 'seoulsup'], sides: { n: 'shop', w: 'shop', s: 'plain', e: 'plain' } },
  // Seoulsup-gil to Yeonmujang-gil.
  { x: ['seongsuil', 'brick'], z: ['seoulsup', 'yeonmujang'], sides: { n: 'plain', e: 'shop', s: 'shop', w: 'plain' } },
  { x: ['brick', 'seongsui'], z: ['seoulsup', 'yeonmujang'], sides: { n: 'plain', e: 'plain', s: 'shop', w: 'shop' } },
  { x: ['seongsui', 'east1'], z: ['seoulsup', 'yeonmujang'], sides: { n: 'plain', w: 'shop', s: 'shop', e: 'plain' } },
  { x: ['east1', 'east2'], z: ['seoulsup', 'yeonmujang'], sides: { n: 'plain', s: 'shop', w: 'plain', e: 'plain' } },
  { x: ['east2', E(260)], z: ['seoulsup', 'ttukseom'], sides: { w: 'plain', n: 'plain', s: 'plain' }, tall: true },
  // Yeonmujang-gil to the south lane.
  { x: ['seongsuil', 'brick'], z: ['yeonmujang', 'south'], sides: { n: 'shop', e: 'shop', s: 'plain', w: 'plain' } },
  { x: ['brick', 'seongsui'], z: ['yeonmujang', 'south'], sides: { n: 'shop', e: 'plain', w: 'shop', s: 'plain' } },
  { x: ['seongsui', 'east1'], z: ['yeonmujang', 'south'], sides: { n: 'shop', w: 'shop' }, area: 'plaza', popup: true },
  { x: ['east1', 'east2'], z: ['yeonmujang', 'south'], sides: { n: 'shop', w: 'plain', s: 'plain', e: 'plain' } },
  // South lane to Ttukseom-ro.
  { x: ['seongsuil', 'seongsui'], z: ['south', 'ttukseom'], sides: { n: 'plain' }, area: 'grass' },
  { x: ['seongsui', 'east2'], z: ['south', 'ttukseom'], sides: { n: 'shop', w: 'plain', s: 'plain', e: 'plain' } },
];

// Parks and the river (not blocks: no buildings).
const AREAS = [
  { k: 'park', trees: true, p: [[-260, 84], [-115, 84], [-115, 347], [-260, 347]] }, // Seoul Forest (wooded)
  { k: 'grass', p: [[-260, 358], [260, 358], [260, 386], [-260, 386]] }, // Han River park
  { k: 'water', p: [[-260, 386], [260, 386], [260, 410], [-260, 410]] }, // Han River
];
// A few buildings placed by hand: the Han River park gate and a café pavilion.
const EXTRA = [
  { h: 4.5, p: [[-70, 362], [-50, 362], [-50, 368], [-70, 368]], tag: 'ttukseom' }, // park gate (Ttukseom Han River Park shop)
  { h: 5, p: [[-232, 120], [-216, 120], [-216, 132], [-232, 132]], tag: 'forest' }, // Seoul Forest visitor hut
];
const BLOCKERS = [{ p: [[-260, 388], [260, 388], [260, 410], [-260, 410]] }]; // the river

// ── Geometry helpers ─────────────────────────────────────────────────────
function line(ref, axis) {
  if (ref && typeof ref === 'object') return { at: ref.edge, inset: 1 };
  if (typeof ref === 'number') return { at: ref, inset: GAP / 2 }; // a split inside one strip
  const s = S[ref];
  if (!s) throw new Error('no street ' + ref);
  const at = axis === 'x' ? s.v : s.h;
  if (at === undefined) throw new Error(`${ref} is not a ${axis === 'x' ? 'north-south' : 'east-west'} street`);
  return { at, inset: s.w / 2 + SIDEWALK };
}
const rect = (x0, z0, x1, z1) => [[r1(x0), r1(z0)], [r1(x1), r1(z0)], [r1(x1), r1(z1)], [r1(x0), r1(z1)]];

const DEPTH = 12, GAP = 0.8;
const buildings = [], lots = [];

function shopRow(a0, a1, along, place) {
  // Split [a0, a1] into shop lots 10–15 m wide, separated by a small gap.
  let a = a0;
  const out = [];
  while (a1 - a >= 10) {
    let w = pick(13, 19);
    if (a1 - a - w < 11) w = a1 - a; // last lot takes the rest
    out.push([a, a + w]);
    a += w + GAP;
  }
  for (const [s, e] of out) place(s, e);
}
function plainRow(a0, a1, place) {
  const n = Math.max(1, Math.round((a1 - a0) / 40));
  const w = (a1 - a0 - GAP * (n - 1)) / n;
  for (let i = 0; i < n; i++) place(a0 + i * (w + GAP), a0 + i * (w + GAP) + w);
}

function fillBlock(b) {
  const L = line(b.x[0], 'x'), R = line(b.x[1], 'x'), T = line(b.z[0], 'z'), Bo = line(b.z[1], 'z');
  const x0 = L.at + L.inset, x1 = R.at - R.inset, z0 = T.at + T.inset, z1 = Bo.at - Bo.inset;
  const sides = b.sides || {};
  const cut = b.cut || {};
  const hShop = () => r1(pick(7.5, 13.5));
  const hPlain = () => b.h || r1(b.tall ? pick(28, 48) : pick(9, 16));
  const add = (kind, poly, face) => {
    const h = kind === 'shop' ? hShop() : hPlain();
    const bld = { h, p: poly };
    buildings.push(bld);
    if (kind === 'shop') lots.push({ b: bld, face });
  };
  // Shop sides get a row of small lots; everything else in the block is one
  // big plain building (or nothing, for squares and parks).
  const on = (k) => sides[k] === 'shop';
  const nOn = on('n'), sOn = on('s');
  const zIn0 = nOn ? z0 + DEPTH + GAP : z0, zIn1 = sOn ? z1 - DEPTH - GAP : z1;
  if (nOn) shopRow(x0 + (cut.nw || 0), x1 - (cut.ne || 0), null, (s, e) => add('shop', rect(s, z0, e, z0 + DEPTH), { x: (s + e) / 2, z: z0, nx: 0, nz: -1 }));
  if (sOn) shopRow(x0, x1, null, (s, e) => add('shop', rect(s, z1 - DEPTH, e, z1), { x: (s + e) / 2, z: z1, nx: 0, nz: 1 }));
  if (on('w')) shopRow(nOn && cut.nw ? z0 + DEPTH + GAP : zIn0, zIn1, null, (s, e) => add('shop', rect(x0, s, x0 + DEPTH, e), { x: x0, z: (s + e) / 2, nx: -1, nz: 0 }));
  if (on('e')) shopRow(zIn0, zIn1, null, (s, e) => add('shop', rect(x1 - DEPTH, s, x1, e), { x: x1, z: (s + e) / 2, nx: 1, nz: 0 }));
  // A tall wall behind the north row, closing the square.
  if (b.back) buildings.push({ h: 24, p: rect(x0, zIn0, x1, zIn0 + b.back) });
  const plain = ['n', 's', 'e', 'w'].some((k) => sides[k] === 'plain');
  if (plain) {
    const bx0 = on('w') ? x0 + DEPTH + GAP : x0, bx1 = on('e') ? x1 - DEPTH - GAP : x1;
    // Long blocks get two buildings with a passage between them.
    if (bx1 - bx0 > 90) { const m = (bx0 + bx1) / 2; add('plain', rect(bx0, zIn0, m - 2, zIn1)); add('plain', rect(m + 2, zIn0, bx1, zIn1)); }
    else if (zIn1 - zIn0 > 110) { const m = (zIn0 + zIn1) / 2; add('plain', rect(bx0, zIn0, bx1, m - 2)); add('plain', rect(bx0, m + 2, bx1, zIn1)); }
    else if (bx1 - bx0 > 6 && zIn1 - zIn0 > 6) add('plain', rect(bx0, zIn0, bx1, zIn1));
  }
  if (b.area) b.areaPoly = rect(x0, z0, x1, z1);
  b.box = [x0, z0, x1, z1];
}

// ── Build ────────────────────────────────────────────────────────────────
for (const b of B) fillBlock(b);

const roads = STREETS.map((s) => ({
  k: s.k, w: s.w,
  p: s.h !== undefined ? [[s.from, s.h], [s.to, s.h]] : [[s.v, s.from], [s.v, s.to]],
  ...(s.n ? { n: s.n } : {}),
}));
for (const w of WALKS) roads.push({ k: 'walk', w: w.w, p: w.p, ...(w.n ? { n: w.n } : {}) });

const areas = [...AREAS];
for (const b of B) if (b.area) areas.push({ k: b.area, p: b.areaPoly });
for (const x of EXTRA) buildings.push({ h: x.h, p: x.p });

const map = {
  meta: {
    region: 'seongsu',
    source: 'hand-made game map (scripts/build-seongsu.mjs), loosely inspired by Seongsu-dong; not a survey map',
    center: { lat: 37.5446, lon: 127.0557 },
  },
  roads,
  buildings,
  rail: [{ e: 1, p: [[-260, -86], [260, -86]] }], // Line 2 viaduct over Achasan-ro
  areas,
  blockers: BLOCKERS,
  pois: [],
};

await writeFile(path.join(dir, 'map.json'), JSON.stringify(map) + '\n');
console.log(`map.json: ${roads.length} roads, ${buildings.length} buildings (${lots.length} shop lots), ${areas.length} areas`);

// ── Shops ────────────────────────────────────────────────────────────────
// Where each shop should go: a target spot; it takes the nearest free lot.
// The order matters: earlier shops pick first.
export const SPOTS = {
  station: [60, -75], cafe: [-30, -6], square: [17, 30], ymj: [20, 170], ymjW: [-70, 170], ymjE: [140, 170],
  brick: [-25, 200], brickN: [-25, 110], clinic: [-150, -20], west: [-220, 20], forest: [-110, 120],
  popup: [95, 215], east: [165, 40], fish: [130, 300], achasan: [-20, -95], seoulsup: [-60, 79], sup2: [100, 79],
  perfAlley: [-25, 240], perfYmj: [90, 170], perfYmjE: [182, 170], perfSquare: [42, -10],
};
export const PLACE = [
  // station & Achasan-ro
  ['info-center', 'station'], ['haru-mart', 'station'], ['star-noraebang', 'achasan'], ['lucky-claw', 'achasan'],
  ['nemo-photo', 'achasan'], ['chueok-photo', 'achasan'],
  // café street
  ['ongi-cafe', 'cafe'], ['meta-coffee', 'cafe'], ['play-kpop-cafe', 'cafe'], ['haneul-drip', 'cafe'], ['stationery-den', 'cafe'],
  // Seongsu Square
  ['petal-lip', 'square'], ['gawison-hair', 'square'], ['name-studio', 'square'],
  // Seoulsup-gil and the brick lane
  ['sorimaru-lp', 'brickN'], ['nyang-cat-cafe', 'brickN'], ['onsaem-jjimjil', 'seoulsup'], ['muscle-gym', 'seoulsup'],
  ['neoguri-raccoon-cafe', 'sup2'], ['haemjji-hamster-cafe', 'sup2'],
  // Yeonmujang-gil
  ['monoroom', 'ymj'], ['denim-lab', 'ymj'], ['cloud-steps', 'ymj'], ['moonlight-beauty', 'ymj'], ['lens-village', 'ymj'],
  ['hat-atelier', 'ymjW'], ['memories-photo', 'ymjW'], ['ddeok-bunsik', 'ymjW'], ['dwaejimaru-bbq', 'ymjW'],
  ['big-paws-dog-cafe', 'ymjE'], ['mungnyang-petshop', 'ymjE'],
  ['scent-factory', 'brick'], ['sandgrain-bakery', 'brick'],
  // pop-up square
  ['popup-station', 'popup'], ['costume-atelier', 'popup'],
  // west: clinics, bikes by the forest
  ['bitna-clinic', 'clinic'], ['saebom-clinic', 'clinic'], ['pedal-lab', 'forest'],
  // south
  ['seongsu-fishmarket', 'fish'], ['sinjeon-pocha', 'fish'],
];
// Shops added with the hand-made map, and the two homes (homes.json).
export const PLACE_NEW = [
  ['sudo-shoes', 'ymjW'], ['soga-leather', 'ymjW'], ['gaeul-vintage', 'ymj'], ['wide-pants', 'ymj'], ['tteugae-knit', 'ymjE'],
  ['cap-yard', 'ymjE'], ['canvas-room', 'ymj'], ['ohu-perfume', 'brick'], ['heuk-ceramics', 'brick'], ['chorok-plants', 'brick'],
  ['sonkkeut-nail', 'square'], ['mulbangul-skin', 'square'], ['butterfold', 'cafe'], ['matcha-garden', 'cafe'],
  ['honey-croffle', 'station'], ['k-goods', 'station'], ['sagye-gelato', 'brickN'], ['pan-records', 'brickN'],
  ['slow-brunch', 'sup2'], ['hotteok-stand', 'achasan'], ['warehouse-roasters', 'achasan'], ['snowflake-bingsu', 'ymjE'],
  ['kkot-flowers', 'seoulsup'], ['bal-socks', 'seoulsup'], ['mallang-popup', 'popup'], ['pixel-popup', 'popup'],
  ['son-kalguksu', 'fish'], ['golmok-chicken', 'fish'], ['dal-tteok', 'fish'], ['seongsu-mandu', 'sup2'],
  ['forest-lane-apt', 'fish'], ['sunny-villa', 'fish'],
  // Perfume shops (3 perfumes each): a perfume alley at the south end of the
  // brick lane next to Ohu Perfume Lab, a row on Yeonmujang-gil, and one by
  // Seongsu Square for people coming from the station.
  ['monggeul-parfum', 'perfAlley'], ['maison-seoulsup', 'perfAlley'], ['plain-note', 'perfAlley'],
  ['kkeung-sanghoe', 'perfYmj'], ['heart-ppyong', 'perfYmj'], ['atelier-noir', 'perfYmj'], ['laundry-parfum', 'perfYmj'],
  ['oops-parfum', 'perfYmjE'], ['basic-mood', 'perfYmjE'],
  ['clear-lab', 'perfSquare'],
];

// Writes "at" into a hand-formatted JSON file without reformatting it: the
// store's "anchor" or "at" line is replaced in place.
function setAt(text, id, at) {
  const start = text.indexOf(`      "id": "${id}",`);
  if (start < 0) throw new Error('no store ' + id);
  const next = text.indexOf('\n      "id": ', start + 10);
  const end = next < 0 ? text.length : next;
  const block = text.slice(start, end);
  const re = /^      "(anchor": \{[^}]*\}|at": \[[^\]]*\]),$/m;
  if (!re.test(block)) throw new Error('no anchor/at line for ' + id);
  return text.slice(0, start) + block.replace(re, `      "at": [${at[0]}, ${at[1]}],`) + text.slice(end);
}

if (process.argv.includes('--place')) {
  const files = { stores: path.join(dir, 'stores.json'), homes: path.join(dir, 'homes.json') };
  const text = { stores: await readFile(files.stores, 'utf8'), homes: await readFile(files.homes, 'utf8') };
  const used = new Set();
  const placeOne = (id, spot) => {
    const [tx, tz] = SPOTS[spot];
    let best = -1, bd = Infinity;
    lots.forEach((l, i) => {
      if (used.has(i)) return;
      const d = Math.hypot(l.face.x - tx, l.face.z - tz);
      if (d < bd) { bd = d; best = i; }
    });
    used.add(best);
    const f = lots[best].face;
    const at = [r1(f.x + f.nx * 2), r1(f.z + f.nz * 2)];
    const key = text.homes.includes(`"id": "${id}"`) ? 'homes' : 'stores';
    text[key] = setAt(text[key], id, at);
  };
  for (const [id, spot] of [...PLACE, ...PLACE_NEW]) placeOne(id, spot);
  text.stores = setAt(text.stores, 'ttukseom-hangang', [-60, 360]); // by the Han River park gate
  await writeFile(files.stores, text.stores);
  await writeFile(files.homes, text.homes);
  console.log(`placed ${used.size} shops; ${lots.length - used.size} shop lots left empty`);
}
export { lots, buildings };
// --stats: shop lots per block.
if (process.argv.includes('--stats')) {
  const c = {};
  B.forEach((b, i) => { const [x0, z0, x1, z1] = b.box; c[i + ':' + JSON.stringify(b.x) + JSON.stringify(b.z)] = lots.filter((l) => l.face.x >= x0 - 1 && l.face.x <= x1 + 1 && l.face.z >= z0 - 1 && l.face.z <= z1 + 1).length; });
  console.log(c);
}
