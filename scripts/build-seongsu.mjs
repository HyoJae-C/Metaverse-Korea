#!/usr/bin/env node
// Builds Seongsu's game map (public/regions/another-seoul/map.json) from the
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
const dir = path.join(root, 'public/regions/another-seoul');

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

// Seongsu at 1/4 of the real size, like the rest of the map (docs/WORLD.md):
// Seongsu Station (the Achasan-ro / Seongsui-ro crossing) is at (0, 0), its
// real place on the Seoul grid. As in Seoul: Yeonmujang-gil a short walk
// south of the station, Ttukseom-ro running south-east along the Han River,
// and Seoul Forest west of Seoulsup-gil, south of Achasan-ro by Ttukseom.
export const WEST = -465;
export const BOUNDS = [WEST, -100, 260, 410];
const name = (ko, en, ja, zh) => ({ ko, en, ...(ja ? { ja } : {}), ...(zh ? { zh } : {}) });

// ── Streets ───────────────────────────────────────────────────────────────
// h: runs east-west at z; v: runs north-south at x. `bend` points come
// before the straight part (Achasan-ro rises north-west to Ttukseom Station,
// Ttukseom-ro runs north-west along the river to Seoul Forest).
const TTUK_W = [-240, 134], TTUK_E = [10, 352]; // where Ttukseom-ro's slanted part starts and ends
const STREETS = [
  { id: 'achasan', h: 0, from: -160, to: 260, bend: [[WEST, -78], [-240, -78]], k: 'secondary', w: 16, n: name('아차산로', 'Achasan-ro', '峨嵯山路', '峨嵯山路') },
  { id: 'cafe', h: 34, from: -110, to: 195, k: 'residential', w: 7, n: name('성수 카페거리', 'Café Street', 'カフェ通り', '咖啡街') },
  { id: 'yeonmujang', h: 80, from: -110, to: 260, k: 'residential', w: 9, n: name('연무장길', 'Yeonmujang-gil', 'ヨンムジャンギル', '练武场路') },
  { id: 'south', h: 115, from: -110, to: 260, k: 'residential', w: 7 },
  { id: 'mid', h: 190, from: -110, to: 195, k: 'residential', w: 7 },
  { id: 'lane', h: 270, from: 65, to: 195, k: 'residential', w: 7 },
  { id: 'ttukseom', h: TTUK_E[1], from: TTUK_E[0], to: 260, bend: [TTUK_W], k: 'tertiary', w: 12, n: name('뚝섬로', 'Ttukseom-ro', 'トゥクソム路', '纛岛路') },
  { id: 'seoulsup', v: -240, from: -78, to: TTUK_W[1], k: 'tertiary', w: 10, n: name('서울숲길', 'Seoulsup-gil', 'ソウルの森通り', '首尔林路') },
  { id: 'west', v: -175, from: -15, to: 176, k: 'residential', w: 8 },
  { id: 'seongsuil', v: -110, from: 0, to: 217, k: 'tertiary', w: 10, n: name('성수일로', 'Seongsuil-ro', '聖水一路', '圣水一路') },
  { id: 'brick', v: -60, from: 34, to: 190, k: 'walk', w: 5, n: name('붉은 벽돌 골목', 'Red Brick Lane', '赤レンガ路地', '红砖小巷') },
  { id: 'seongsui', v: 0, from: 0, to: 343, k: 'secondary', w: 14, n: name('성수이로', 'Seongsui-ro', '聖水二路', '圣水二路') },
  { id: 'east1', v: 65, from: 0, to: 352, k: 'residential', w: 7 },
  { id: 'east2', v: 130, from: 0, to: 352, k: 'residential', w: 8 },
  { id: 'east3', v: 195, from: 0, to: 352, k: 'residential', w: 7 },
];
const S = Object.fromEntries(STREETS.map((s) => [s.id, s]));
const SIDEWALK = 2.5;
const CENTER = [0, 60]; // the middle of the shop streets, between the station and Yeonmujang-gil

// Ttukseom-ro's centre line at x, and the lowest z a building north of it may reach.
const ttukZ = (x) => {
  if (x <= TTUK_W[0]) return TTUK_W[1];
  if (x >= TTUK_E[0]) return TTUK_E[1];
  return TTUK_W[1] + ((TTUK_E[1] - TTUK_W[1]) * (x - TTUK_W[0])) / (TTUK_E[0] - TTUK_W[0]);
};
const TTUK_EDGE = (x) => ttukZ(x) - S.ttukseom.w / 2 - SIDEWALK;

// ── Seoul Forest ─────────────────────────────────────────────────────────
// The park keeps its size (about 1/4 of the real one already) and all that
// is in it; it is drawn below in its own old frame and moved as one piece by
// FOREST_SHIFT onto its real place: north-west of the shop streets, with its
// north edge on Achasan-ro by Ttukseom Station and its east edge on
// Seoulsup-gil (Seoul Forest Station on the corner).
export const FOREST_SHIFT = [-130, -154];
const OLD_WEST = -335;
const shift = ([x, z]) => [r1(x + FOREST_SHIFT[0]), r1(z + FOREST_SHIFT[1])];
const OLD_FOREST_EDGE = [[OLD_WEST, 159], [-260, 204], [-200, 240.5], [-155, 267.5], [-115, 291.5]]; // the forest's south edge, west to east (old frame)
const OLD_RIVER_EDGE = [[OLD_WEST, 173], [-260, 218], [-200, 254.5], [-155, 281.5], [-110, 308.5]];
const FOREST_EDGE = OLD_FOREST_EDGE.map(shift);

// The Han River's north bank: along Seoul Forest, then south-east with
// Ttukseom-ro, then straight past Ttukseom Han River Park. Along it, from the
// water up: a strip of riverside grass with the Han River path, then
// Ttukseom-ro (or Seoul Forest).
const RIVER_EDGE = [...OLD_RIVER_EDGE.map(shift), [-5, 378], [10, 386], [260, 386]];
// How far south the game's water reaches (east to west), about the real Han's width from the bank;
// Songpa's Han River bank and region.json water[1] carry on from here.
const RIVER_SOUTH = [[260, 410], [20, 410], [-30, 465], [-150, 420], [-240, 385], [WEST, 250]];
const RIVER_PATH = [...OLD_RIVER_EDGE.map(([x, z]) => shift([x, z - 7])), [-5, 371], [10, 372], [260, 372]];

// Paths through Seoul Forest (old frame; moved with the forest below).
const WALKS = [
  // From Seongsuil-ro (now Seoulsup-gil) by the forest's corner, round the greenhouse and the rose garden, to the south end.
  { w: 4, p: [[-115, 125], [-165, 150], [-182, 200], [-180, 245], [-116, 284]], n: name('서울숲 산책길', 'Seoul Forest Trail', 'ソウルの森散策路', '首尔林步道') },
  { w: 3, p: [[-185, 84], [-165, 150]] },
  { w: 3, p: [[-198, 200], [-182, 200]] }, // Metasequoia Avenue to the trail
];

// ── Blocks ────────────────────────────────────────────────────────────────
// Each block lies between four streets (or the map edge) and says what each
// side holds: 'shop' (small shop buildings), 'plain' (a few long buildings)
// or 'open' (nothing). `area` paints the ground (plaza, park, grass).
// `depth` is the depth of its shop rows (12 m unless the block is shallow).
// Blocks south of Ttukseom-ro's slanted part are cut back to the road.
const E = (v) => ({ edge: v }); // map edge: no street
const B = [
  // North of Achasan-ro: offices along the Line 2 viaduct, and right across
  // from Seongsu Station a 60 m screen tower (region.json "screens").
  { x: [E(-150), -35], z: [E(-40), 'achasan'], sides: { s: 'plain' }, tall: true },
  { x: [-35, 35], z: [E(-40), 'achasan'], sides: { s: 'plain' }, h: 60 },
  { x: [35, E(260)], z: [E(-40), 'achasan'], sides: { s: 'plain' }, tall: true },
  // West of Seongsuil-ro: the clinics, and the bike shop by Seoul Forest.
  { x: ['west', 'seongsuil'], z: ['achasan', 'yeonmujang'], sides: { e: 'shop', w: 'plain', n: 'plain' } },
  { x: ['west', 'seongsuil'], z: ['yeonmujang', 'ttukseom'], sides: { e: 'shop', w: 'shop', n: 'plain' } },
  // Station blocks along Achasan-ro (two shallow rows, back to back).
  { x: ['seongsuil', 'brick'], z: ['achasan', 'cafe'], sides: { n: 'shop', s: 'shop' }, depth: 8.3 },
  { x: ['brick', 'seongsui'], z: ['achasan', 'cafe'], sides: { n: 'shop', s: 'shop' }, depth: 8.3, cut: { ne: 16 } },
  { x: ['seongsui', 'east1'], z: ['achasan', 'cafe'], sides: { n: 'shop', s: 'shop' }, depth: 8.3, cut: { nw: 16 } },
  { x: ['east1', 'east2'], z: ['achasan', 'cafe'], sides: { n: 'shop', s: 'shop' }, depth: 8.3 },
  { x: ['east2', 'east3'], z: ['achasan', 'cafe'], sides: { n: 'plain' } },
  { x: ['east3', E(260)], z: ['achasan', 'yeonmujang'], sides: {}, area: 'park' },
  // Café Street to Yeonmujang-gil, with Seongsu Square.
  { x: ['seongsuil', 'brick'], z: ['cafe', 'yeonmujang'], sides: { n: 'shop', e: 'shop', s: 'shop', w: 'plain' } },
  { x: ['brick', 'seongsui'], z: ['cafe', 'yeonmujang'], sides: { n: 'shop' }, depth: 8, area: 'plaza', square: true },
  { x: ['seongsui', 'east1'], z: ['cafe', 'yeonmujang'], sides: { n: 'shop', w: 'shop', s: 'shop' } },
  { x: ['east1', 'east2'], z: ['cafe', 'yeonmujang'], sides: { n: 'shop', s: 'shop', e: 'plain' } },
  { x: ['east2', 'east3'], z: ['cafe', 'yeonmujang'], sides: { n: 'plain', s: 'shop', w: 'plain' } },
  // Yeonmujang-gil to the south lane (two rows, back to back), with the pop-up square.
  { x: ['seongsuil', 'brick'], z: ['yeonmujang', 'south'], sides: { n: 'shop', s: 'shop' }, depth: 10.6 },
  { x: ['brick', 'seongsui'], z: ['yeonmujang', 'south'], sides: { n: 'shop', s: 'shop' }, depth: 10.6 },
  { x: ['seongsui', 'east1'], z: ['yeonmujang', 'south'], sides: { n: 'shop' }, depth: 10.6, area: 'plaza', popup: true },
  { x: ['east1', 'east2'], z: ['yeonmujang', 'south'], sides: { n: 'shop', s: 'shop' }, depth: 10.6 },
  { x: ['east2', 'east3'], z: ['yeonmujang', 'south'], sides: { n: 'shop', s: 'shop' }, depth: 10.6 },
  { x: ['east3', E(260)], z: ['yeonmujang', 'south'], sides: { n: 'plain' } },
  // South lane to the middle lane.
  { x: ['seongsuil', 'brick'], z: ['south', 'mid'], sides: { n: 'shop', e: 'shop', w: 'plain', s: 'plain' } },
  { x: ['brick', 'seongsui'], z: ['south', 'mid'], sides: { n: 'shop', w: 'shop', e: 'plain', s: 'plain' } },
  { x: ['seongsui', 'east1'], z: ['south', 'mid'], sides: { n: 'shop', s: 'shop', w: 'plain', e: 'plain' } },
  { x: ['east1', 'east2'], z: ['south', 'mid'], sides: { n: 'shop', s: 'shop', e: 'plain', w: 'plain' } },
  { x: ['east2', 'east3'], z: ['south', 'mid'], sides: { n: 'shop', w: 'plain', e: 'plain', s: 'plain' } },
  { x: ['east3', E(260)], z: ['south', 'ttukseom'], sides: { w: 'plain', n: 'plain', s: 'plain' }, tall: true },
  // The middle lane down to Ttukseom-ro: quieter streets by the river.
  { x: ['seongsuil', 'seongsui'], z: ['mid', 'ttukseom'], sides: { n: 'plain' }, area: 'grass' },
  { x: ['seongsui', 'east1'], z: ['mid', 'ttukseom'], sides: { n: 'shop', w: 'plain' } },
  { x: ['east1', 'east2'], z: ['mid', 'lane'], sides: { n: 'shop', w: 'plain', e: 'plain', s: 'plain' } },
  { x: ['east2', 'east3'], z: ['mid', 'lane'], sides: { n: 'plain', s: 'plain' } },
  { x: ['east1', 'east2'], z: ['lane', 'ttukseom'], sides: { n: 'plain', s: 'plain' } },
  { x: ['east2', 'east3'], z: ['lane', 'ttukseom'], sides: { n: 'plain', s: 'plain' } },
];

// Parks and the river (not blocks: no buildings).
const OLD_FOREST = [[OLD_WEST, 84], [-115, 84], ...OLD_FOREST_EDGE.slice().reverse()];
const AREAS = [
  { k: 'park', trees: true, p: OLD_FOREST.map(shift) }, // Seoul Forest (wooded), down to the riverside grass
  // Between Seoulsup-gil, Achasan-ro and the west lane: a small wooded corner by Seoul Forest Station.
  { k: 'park', trees: true, p: [[-232.5, -63], [-187, -18], [-179.5, -9], [-179.5, 160], [-232.5, 140]] },
  // Riverside grass (Han River park): under the forest, then under Ttukseom-ro.
  { k: 'grass', p: [...FOREST_EDGE, [TTUK_W[0], TTUK_W[1] + 8.5], [TTUK_E[0] - 10, TTUK_E[1] + 6], [TTUK_E[0], TTUK_E[1] + 6], [260, TTUK_E[1] + 6], ...RIVER_EDGE.slice().reverse()] },
  { k: 'water', p: [...RIVER_EDGE, ...RIVER_SOUTH] }, // Han River
];
// Ttukseom Han River Park, laid straight on the street (game/han-parks.js;
// core/han-park.js builds what the map can't draw) on the straight bank
// (z 386) between the river and the Han River path. It faces south over the
// river, so its own frame is turned half round: x = PARK_X - X, z = 386 - Z
// (the bank's edge at z = 0, the river z < 0), x growing west. West to east:
//  - the fishing pier and the fish buyer;
//  - where the walk down from Ttukseom-ro (X 60) meets the river path: the
//    DAILY MART kiosk with its ramen machine and parasol tables, then the
//    Riverside Market's six stalls;
//  - the open lawn for the drone light show (core/drone-show.js), with the
//    launch barge out on the water in front of it and the show's board by
//    the railing (picnic mats and frisbees go here too);
//  - the duck boat dock by the other walk down (X 200), and a quiet end
//    with benches under trees.
export const PARK_X = 135, PARK_BANK = 386;
const DRONES_X = -4; // the barge and the drones' sky (X 139)
export const PARK = {
  bounds: [-123, -52, 123, 17], // bank to the path, and out on its water to the barge
  layout: {
    paving: [[26, 0.4, 112, 9.2, '#d9c7a6']],
    rail: [-122, 122],
    pier: { x: 100, len: 9 },
    fishBuy: [92, 4.2, 0],
    fishing: [[114, 0.75], [106, 0.75], [100, -8.2], [84, 0.75]],
    kiosk: [68, 6.6, Math.PI], // DAILY MART, facing the river
    tables: [[59.6, 3.4], [76.4, 3.4]],
    market: {
      spots: [[32, 7.6, Math.PI], [34.8, 7.6, Math.PI], [37.6, 7.6, Math.PI], [40.4, 7.6, Math.PI], [43.2, 7.6, Math.PI], [46, 7.6, Math.PI]],
      tables: [[36.4, 3.6], [44.2, 4.6]],
      board: [50.8, 8.2, Math.PI],
    },
    drones: {
      x: DRONES_X,
      sign: [DRONES_X - 4.6, 0.75, 0],
      // (in the show's own metres: 4 m towards the river from the park's)
      mats: [{ x: -8.6, z: 4.6, color: '#3f7fd0' }, { x: 9.4, z: 3.6, color: '#e8708f' }],
      rail: [[-14.5, -2.5], [14.8, -2.4]],
    },
    skyline: { z: -150, x0: DRONES_X - 95 }, // Cheongdam across the water (lit at night)
    dock: -78,
    duckWater: { minX: -100, maxX: -56, minZ: -38 },
    lamps: [[110, 2.6], [80, 2.6], [54, 2.6], [24, 2.6], [-36, 2.6], [-60, 2.6], [-96, 2.6]],
    benches: [[-46, 3.4], [-100, 3.4], [-112, 3.4]],
    beds: [[20, 6.4, 3], [-32, 6.4, 3], [-62, 6.4, 2.6]],
    trees: [[118, 7.2], [-92, 7.4], [-106, 7], [-118, 7.4]],
    bushes: [[24, 9.2], [-34, 9.4], [-88, 8.2]],
  },
};
const PARK_LAWN = [-30, 22]; // the drone show's lawn (x): picnic mats and frisbees
// (the lawn in the street's metres: no trees, the picnic lawn)
const lawnArea = { k: 'grass', lawn: true, p: [[PARK_X - PARK_LAWN[1], PARK_BANK - 11.4], [PARK_X - PARK_LAWN[0], PARK_BANK - 11.4], [PARK_X - PARK_LAWN[0], PARK_BANK - 1.2], [PARK_X - PARK_LAWN[1], PARK_BANK - 1.2]] };
AREAS.push(lawnArea);
// A building placed by hand: the Seoul Forest Culture Center (old frame).
const EXTRA = [
  { h: 6, p: [[-232, 120], [-216, 120], [-216, 132], [-232, 132]], tag: 'forest' }, // Seoul Forest Culture Center (stores.json seoul-forest-culture; door on the north side)
];
const BLOCKERS = [];

// ── Seoul Forest decor ──────────────────────────────────────────────────
// A round rose garden off the trail, benches along the paths, and ice cream
// sculptures (art by Yozi, public/models/icecream): one of each flavour, all
// the same size, each at its own spot in the park.
// Landmarks are drawn by core/landmarks.js + core/park-art.js; "clear" keeps
// the park's trees away; the sculptures and benches also get blockers.
const FOREST_TRAIL = WALKS[0].p;
const LANDMARKS = [];
const r2 = (v) => Math.round(v * 100) / 100;
const faceTo = (x, z, tx, tz) => r2(Math.atan2(tx - x, tz - z));
// A w × d box turned by ry (the same turn as a three.js group's rotation.y).
function rotBox(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([lx, lz]) => [r2(x + lx * c + lz * s), r2(z - lx * s + lz * c)]);
}
function bench(x, z, ry) {
  LANDMARKS.push({ type: 'bench', x: r2(x), z: r2(z), ry: r2(ry), clear: 2.2 });
  BLOCKERS.push({ p: rotBox(x, z, 2.3, 0.6, ry) }); // (core/park-art.js: a 2.2 m bench, three seats)
}
const ICE_S = 1.6; // every sculpture this many times the 2.8 m model
function sculpture(model, x, z, ry, s = ICE_S) {
  LANDMARKS.push({ type: 'icecream', model, x: r2(x), z: r2(z), ry: r2(ry), s, clear: 2 + s });
  BLOCKERS.push({ p: rotBox(x, z, 1.25 * s, 1.25 * s, ry) });
}
// A point on the trail (segment i, t along it) and its sideways normal.
function onTrail(i, t, side) {
  const [x1, z1] = FOREST_TRAIL[i], [x2, z2] = FOREST_TRAIL[i + 1];
  const len = Math.hypot(x2 - x1, z2 - z1), ux = (x2 - x1) / len, uz = (z2 - z1) / len;
  const px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
  return { px, pz, x: px - uz * side, z: pz + ux * side };
}
// Rose garden: beds in two rings, cross paths, arches, a sculpture in the middle.
const GARDEN = { x: -158, z: 238, r: 14 };
LANDMARKS.push({ type: 'rosegarden', x: GARDEN.x, z: GARDEN.z, r: GARDEN.r, clear: GARDEN.r + 3, label: name('장미정원', 'Rose Garden', 'バラ園', '玫瑰园') });
WALKS.push({ w: 3, p: [[-179, GARDEN.z], [GARDEN.x - GARDEN.r - 0.5, GARDEN.z]] }); // from the trail to the garden's west arch
sculpture('strawberry', GARDEN.x, GARDEN.z, faceTo(GARDEN.x, GARDEN.z, GARDEN.x - 20, GARDEN.z)); // the garden's middle, facing its path in
for (let k = 0; k < 4; k++) { // benches in the ring path, on the diagonals, facing the middle
  const a = Math.PI / 4 + (k * Math.PI) / 2, x = GARDEN.x + Math.cos(a) * 9.1, z = GARDEN.z + Math.sin(a) * 9.1;
  bench(x, z, faceTo(x, z, GARDEN.x, GARDEN.z));
}
// Benches along the trail, facing it, alternating sides.
[[0, 0.35, 1], [0, 0.75, -1], [1, 0.3, 1], [1, 0.7, -1], [2, 0.25, -1], [2, 0.6, 1], [3, 0.4, 1], [3, 0.8, -1]].forEach(([i, t, side]) => {
  const p = onTrail(i, t, side * 3.4);
  bench(p.x, p.z, faceTo(p.x, p.z, p.px, p.pz));
});
// The chocolate one greets you at the north end of Metasequoia Avenue (below):
// at the very front on the right as you walk in from Seoulsup-gil, across the
// path from the avenue's sign (mirrored), facing the street.
sculpture('chocolate', -203.4, 86.6, Math.PI);
// A grassy hill with wooden stairs up to a look-out deck, south of the
// culture center (walkable: core/park-art.js hillY). The stairs face
// Metasequoia Avenue, with a path across to it.
// A wide flat top with a big round deck, and the soft serve sculpture on it.
const HILL = { x: -240, z: 170, r: 18, h: 4.5, top: 8.5, deck: 7 };
LANDMARKS.push({ type: 'hill', x: HILL.x, z: HILL.z, r: HILL.r, h: HILL.h, top: HILL.top, deck: HILL.deck, ry: faceTo(HILL.x, HILL.z, -200, HILL.z), clear: HILL.r + 2 });
LANDMARKS.push({ type: 'icecream', model: 'soft-serve', x: HILL.x, z: HILL.z, y: HILL.h + 0.12, ry: faceTo(HILL.x, HILL.z, -200, HILL.z), s: ICE_S, clear: 2 + ICE_S });
BLOCKERS.push({ p: rotBox(HILL.x, HILL.z, 1.25 * ICE_S, 1.25 * ICE_S, 0) });
WALKS.push({ w: 3, p: [[-202, HILL.z], [HILL.x + HILL.r + 0.5, HILL.z]] }); // from the avenue to the foot of the stairs
// 소프트콘언덕 (Soft Cone Hill): named after the soft serve on top; a sign by the stairs.
const HILL_NAME = name('소프트콘언덕', 'Soft Cone Hill', 'ソフトクリームの丘', '甜筒山丘');
LANDMARKS.find((l) => l.type === 'hill').label = HILL_NAME;
LANDMARKS.push({ type: 'sign', x: HILL.x + HILL.r + 1.5, z: HILL.z + 3.2, ry: Math.PI / 2, clear: 1.5, title: HILL_NAME,
  text: name('나무 계단을 올라가면 넓은 전망 데크와 하얀 소프트콘 조각이 있어요. 서울숲이 한눈에 보여요!',
    'Climb the wooden stairs to a wide look-out deck and the white soft serve sculpture. You can see all of Seoul Forest!',
    '木の階段を上ると、広い展望デッキと白いソフトクリームの彫刻があります。ソウルの森が一望できます！',
    '登上木台阶，就是宽敞的观景台和白色甜筒雕塑，可以一览首尔林！') });
// Metasequoia Avenue: a long straight path north to south through the wood,
// lined both sides with tall trees in autumn orange (core/park-art.js
// avenue). Its walk keeps the other trees back ("clear"); the avenue's own
// trees skip the spots where something else stands (benches, the trail).
{
  const AX = -200, Z0 = 85, Z1 = 232, OFF = 4.5, GAP = 6;
  WALKS.push({ w: 4, clear: 5, p: [[AX, Z0], [AX, Z1]], n: name('메타세쿼이아길', 'Metasequoia Avenue', 'メタセコイア並木', '水杉大道') });
  LANDMARKS.push({ type: 'sign', x: AX + 3.4, z: Z0 + 1.6, ry: Math.PI, clear: 1.5, // at the north end, facing people coming in
    title: name('메타세쿼이아길', 'Metasequoia Avenue', 'メタセコイア並木', '水杉大道'),
    text: name('키 큰 메타세쿼이아가 양옆으로 늘어선 숲길이에요. 가을에는 주황빛 나무 터널이 돼요. 길 끝에서 서울숲 스탬프를 찍어 보세요!',
      'A forest walk lined with tall metasequoia trees, an orange tree tunnel in autumn. Get the Seoul Forest stamp at the far end!',
      '背の高いメタセコイアが両側に並ぶ森の道。秋にはオレンジ色の木のトンネルに。道の先でソウルの森のスタンプを押してね！',
      '两旁种满高大水杉的林间小路，秋天会变成橙色的树木隧道。到路尽头盖个首尔林印章吧！') });
  const avoid = [...LANDMARKS.filter((l) => l.clear && Number.isFinite(l.x)).map((l) => [l.x, l.z, l.clear]), [-190, 215, 3], [-210, 93, 5.5], [-196.6, 224, 1.6]]; // (+ the meeting sign, Seoul Forest Station's exit 2 (region.json), the stamp stand (data/stamps.js))
  const nearWalk = (x, z) => WALKS.some((w) => w.p.some((q, i) => {
    const r = w.p[i + 1];
    if (!r || (w.p[0][0] === AX && w.p.length === 2)) return false;
    const dx = r[0] - q[0], dz = r[1] - q[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - q[0]) * dx + (z - q[1]) * dz) / l2));
    return Math.hypot(q[0] + t * dx - x, q[1] + t * dz - z) < w.w / 2 + 1.5;
  }));
  const trees = [];
  for (let z = Z0 + 3; z < Z1 - 1; z += GAP) {
    for (const side of [-1, 1]) {
      const x = AX + side * OFF;
      if (avoid.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr) || nearWalk(x, z)) continue;
      trees.push([r2(x), r2(z)]);
    }
  }
  LANDMARKS.push({ type: 'avenue', trees });
}
// A butterfly greenhouse on the lawn east of the trail (glass walls, plants,
// butterflies, the mint chocolate sculpture in the middle), its door on the
// north side where the path comes in; outside it to the south, a round pond
// with a fountain and benches to sit by it.
const GH = { x: -138, z: 184, w: 14, d: 10, door: 2.6 };
LANDMARKS.push({ type: 'greenhouse', x: GH.x, z: GH.z, w: GH.w, d: GH.d, door: GH.door, clear: 10, label: name('나비 온실', 'Butterfly Greenhouse', '蝶の温室', '蝴蝶温室') });
WALKS.push({ w: 3, p: [[-170, 165], [GH.x, GH.z - GH.d / 2 - 0.5]] }); // from the trail to the door
{ // glass walls (the north one with the door gap)
  const { x, z, w, d, door } = GH, t = 0.3;
  const wall = (cx, cz, sx, sz) => BLOCKERS.push({ p: rotBox(cx, cz, sx, sz, 0) });
  wall(x, z + d / 2, w, t); wall(x - w / 2, z, t, d); wall(x + w / 2, z, t, d);
  const side = (w - door) / 2;
  wall(x - w / 2 + side / 2, z - d / 2, side, t); wall(x + w / 2 - side / 2, z - d / 2, side, t);
}
const POND = { x: GH.x, z: GH.z + GH.d / 2 + 9, r: 5.5 };
LANDMARKS.push({ type: 'pond', x: POND.x, z: POND.z, r: POND.r, statue: true, clear: POND.r + 3 });
// The mint chocolate sculpture stands on top of the fountain, turned a quarter to the right (clockwise seen from above).
LANDMARKS.push({ type: 'icecream', model: 'mint-chocolate', x: POND.x, z: POND.z, y: 1.3, ry: -Math.PI / 2, s: ICE_S, reach: POND.r + 1.5, clear: 2 + ICE_S });
// Signs (core/park-signs.js): Korean, or the player's language with signs translated.
LANDMARKS.push({ type: 'sign', x: GH.x + 3.6, z: GH.z - GH.d / 2 - 2.2, ry: Math.PI, clear: 1.5,
  title: name('나비 온실', 'Butterfly Greenhouse', '蝶の温室', '蝴蝶温室'),
  text: name('따뜻한 유리 온실 안에서 나비들이 꽃 사이를 날아다녀요. 천천히 걸으며 구경해 보세요. 밖에는 분수 연못이 있어요.',
    'Butterflies flutter among the flowers in this warm glass house. Walk in slowly and enjoy them. The fountain pond is just outside.',
    '暖かいガラスの温室で、蝶が花のあいだを飛んでいます。ゆっくり歩いて眺めてね。外には噴水の池があります。',
    '在温暖的玻璃温室里，蝴蝶在花丛间飞舞。慢慢走，好好欣赏吧。外面还有喷泉池。') });
BLOCKERS.push({ p: Array.from({ length: 12 }, (_, k) => [r2(POND.x + Math.cos((k * Math.PI) / 6) * (POND.r + 0.3)), r2(POND.z + Math.sin((k * Math.PI) / 6) * (POND.r + 0.3))]) });
for (const a of [Math.PI * 0.15, Math.PI * 0.5, Math.PI * 0.85]) { // benches round the pond, facing the fountain
  const bx = POND.x + Math.cos(a) * (POND.r + 2.2), bz = POND.z + Math.sin(a) * (POND.r + 2.2);
  bench(bx, bz, faceTo(bx, bz, POND.x, POND.z));
}

// ── The west wood (x WEST…-260) and round the culture center ────────────
// The river cuts the forest's south-west corner off, so what stood there
// (the galleries, the hill, two flower gardens) is round the culture center
// now. A trail from Metasequoia Avenue past the center into the west wood
// and up to Seoulsup-gil, three small forest galleries (stores.json
// forest-gallery-1…3, interiors from core/culture.js) and four themed flower
// gardens (core/park-art.js flowergarden), each with a sign.
const WEST_TRAIL = [[-202, 145], [-238, 145], [-255, 145], [-292, 135], [-300, 110], [-296, 84]];
WALKS.push({ w: 3, p: WEST_TRAIL, n: name('서쪽 숲길', 'West Wood Trail', '西の森の小道', '西林小径') });
WALKS.push({ w: 3, p: [[-238, 84], [-238, 145]] }); // Seoulsup-gil to the trail, between gallery 3 and the culture center
// Galleries: a 12 × 9 m pavilion each, door on the side facing the trail.
const GALLERIES = [
  { id: 'forest-gallery-1', x0: -328, z0: 108, face: 'e', to: [-299, 112.5] },
  { id: 'forest-gallery-2', x0: -332, z0: 130, face: 'e', to: [-292, 134.5] },
  { id: 'forest-gallery-3', x0: -262, z0: 96, face: 'e', to: [-238, 100.5] },
];
for (const gl of GALLERIES) {
  const [w, d] = [12, 9];
  EXTRA.push({ h: 5.5, p: [[gl.x0, gl.z0], [gl.x0 + w, gl.z0], [gl.x0 + w, gl.z0 + d], [gl.x0, gl.z0 + d]], tag: gl.id });
  const doorX = gl.face === 'e' ? gl.x0 + w : gl.x0, doorZ = gl.z0 + d / 2;
  WALKS.push({ w: 2.5, p: [[doorX + (gl.face === 'e' ? 0.5 : -0.5), doorZ], gl.to] }); // door to the trail
}
// Flower gardens: round beds of one kind of flower, a path across, a sign.
const FLOWER_GARDENS = [
  { kind: 'tulip', x: -280, z: 120, r: 9, ry: 0.3,
    n: name('튤립 정원', 'Tulip Garden', 'チューリップガーデン', '郁金香花园'),
    t: name('빨강, 노랑, 분홍 튤립이 줄지어 피어 있어요. 봄 사진 찍기 좋은 곳이에요.', 'Rows of red, yellow and pink tulips. A lovely spot for spring photos.', '赤、黄、ピンクのチューリップが並んで咲いています。春の写真にぴったり。', '红、黄、粉色的郁金香排排开放，很适合拍春天的照片。') },
  { kind: 'sunflower', x: -275, z: 158, r: 8, ry: -0.4,
    n: name('해바라기 정원', 'Sunflower Garden', 'ひまわりガーデン', '向日葵花园'),
    t: name('키 큰 해바라기 사이를 걸어 보세요. 모두 해를 보고 있어요.', 'Walk among the tall sunflowers, all turned to the sun.', '背の高いひまわりの間を歩いてみて。みんな太陽を向いています。', '在高高的向日葵间走走吧，它们都朝着太阳。') },
  { kind: 'hydrangea', x: -312, z: 155, r: 8, ry: 0.8,
    n: name('수국 정원', 'Hydrangea Garden', 'アジサイガーデン', '绣球花园'),
    t: name('파랑, 보라, 분홍 수국이 동그랗게 피어 있어요. 초여름의 서울숲이에요.', 'Round blue, purple and pink hydrangeas: Seoul Forest in early summer.', '青、紫、ピンクのアジサイがまあるく咲いています。初夏のソウルの森。', '蓝、紫、粉色的绣球圆圆地开着，是初夏的首尔林。') },
  { kind: 'lavender', x: -130, z: 245, r: 8, ry: -0.2, // east of the rose garden
    n: name('라벤더 정원', 'Lavender Garden', 'ラベンダーガーデン', '薰衣草花园'),
    t: name('보랏빛 라벤더 줄 사이로 은은한 향기가 나요. 벤치에 앉아 쉬어 가세요.', 'A soft scent between the purple lavender rows. Sit on the bench and rest a while.', '紫のラベンダーの列からやさしい香り。ベンチでひと休みしてね。', '紫色薰衣草间飘着淡淡的香气，坐在长椅上歇一会儿吧。') },
];
for (const fg of FLOWER_GARDENS) {
  LANDMARKS.push({ type: 'flowergarden', kind: fg.kind, x: fg.x, z: fg.z, r: fg.r, ry: fg.ry, clear: fg.r + 2, label: fg.n });
  const sx = fg.x + Math.sin(fg.ry) * (fg.r + 1.6), sz = fg.z + Math.cos(fg.ry) * (fg.r + 1.6); // on the garden's path, outside
  LANDMARKS.push({ type: 'sign', x: r2(sx + Math.cos(fg.ry) * 2.2), z: r2(sz - Math.sin(fg.ry) * 2.2), ry: fg.ry, clear: 1.5, title: fg.n, text: fg.t });
  const bx = fg.x - Math.sin(fg.ry) * (fg.r + 1.8), bz = fg.z - Math.cos(fg.ry) * (fg.r + 1.8); // a bench at the far end
  bench(bx, bz, faceTo(bx, bz, fg.x, fg.z));
}

// ── Move the forest onto its place ──────────────────────────────────────
// Everything above was drawn in the forest's old frame: move it as one piece.
for (const w of WALKS) w.p = w.p.map(shift);
for (const x of EXTRA) x.p = x.p.map(shift);
for (const bl of BLOCKERS) bl.p = bl.p.map(shift);
for (const l of LANDMARKS) {
  if (Number.isFinite(l.x)) [l.x, l.z] = shift([l.x, l.z]);
  if (l.trees) l.trees = l.trees.map(shift);
}
// The park itself (game/han-parks.js): at the bank's edge, turned half round (not part of the forest).
LANDMARKS.push({ type: 'hanpark', store: 'ttukseom-hangang', x: PARK_X, z: PARK_BANK, ry: +Math.PI.toFixed(4), bounds: PARK.bounds, layout: PARK.layout });
BLOCKERS.unshift({ p: [...RIVER_EDGE.map(([x, z]) => [x, z + 2]), ...RIVER_SOUTH] }); // the river
// The Han River path, and paths from Ttukseom-ro down to it.
WALKS.unshift(
  { w: 4, p: RIVER_PATH, n: name('한강 산책로', 'Han River Path', '漢江遊歩道', '汉江步道') },
  { w: 4, p: [[TTUK_W[0], TTUK_W[1] + 9], [TTUK_W[0], RIVER_PATH[4][1]]] },
  { w: 4, p: [[60, 358], [60, 372]] }, // (Ttukseom Han River Park's two ways down)
  { w: 4, p: [[200, 358], [200, 372]] },
);

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

const DEPTH_SHOP = 12, GAP = 0.8;
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
  const DEPTH = b.depth || DEPTH_SHOP;
  const cut = b.cut || {};
  // Taller towards the middle of the neighbourhood (CENTER): a skyline that
  // rises to the square and Seongsu-ro and falls off to the edges. One pick
  // per building, so the lot layout stays the same.
  const ring = (poly) => {
    const xs = poly.map((q) => q[0]), zs = poly.map((q) => q[1]);
    const d = Math.hypot((Math.min(...xs) + Math.max(...xs)) / 2 - CENTER[0], (Math.min(...zs) + Math.max(...zs)) / 2 - CENTER[1]);
    return d < 110 ? 0 : d < 190 ? 1 : 2;
  };
  const SHOP_H = [[14, 24], [10, 17], [7.5, 13.5]], PLAIN_H = [[32, 52], [18, 30], [9, 16]];
  const hShop = (r) => r1(pick(...SHOP_H[r]));
  const hPlain = (r) => b.h || r1(pick(...(b.tall ? [28, 48] : PLAIN_H[r])));
  const add = (kind, poly, face) => {
    const r = ring(poly);
    const h = kind === 'shop' ? hShop(r) : hPlain(r);
    const bld = { h, p: poly };
    // Shop lots keep the direction their front faces (f: [nx, nz]), so the
    // game can find the ones no shop took and hang ad posters there.
    if (kind === 'shop') bld.f = [face.nx, face.nz];
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

// ── Seongsu Square ───────────────────────────────────────────────────────
// Behind the Café Street row, a row of shops facing south onto the square,
// so arriving there it is already lined with shop fronts; the square opens
// onto Yeonmujang-gil. These lots come after the block lots and use their
// own random numbers.
const SQUARE_LOT = 10.2; // narrow lots: more shop fronts round the square
const sqRand = rng(20261105);
const extraLots = [];
function addLot(poly, face, h) {
  const bld = { h, p: poly, f: [face.nx, face.nz] };
  buildings.push(bld);
  const lot = { b: bld, face };
  lots.push(lot);
  extraLots.push(lot);
}
// Lots of about SQUARE_LOT along [a0, a1].
function evenRow(a0, a1, place) {
  const n = Math.max(1, Math.round((a1 + GAP - a0) / (SQUARE_LOT + GAP)));
  const w = (a1 - a0 - GAP * (n - 1)) / n;
  for (let i = 0; i < n; i++) place(a0 + i * (w + GAP), a0 + i * (w + GAP) + w);
}
const sqH = () => r1(14 + sqRand() * 8);
{
  const sq = B.find((b) => b.square);
  const [x0, z0, x1] = sq.box, D = sq.depth || DEPTH_SHOP;
  const nz0 = z0 + D + GAP, nz1 = nz0 + 9;
  evenRow(x0, x1, (s, e) => addLot(rect(s, nz0, e, nz1), { x: (s + e) / 2, z: nz1, nx: 0, nz: 1 }, sqH()));
}

// ── Ttukseom-ro ──────────────────────────────────────────────────────────
// The blocks run down to Ttukseom-ro's straight east end; along its slanted
// part they are cut back to the road: buildings end before its sidewalk (or
// go, if too little is left, as do shops that would face the road at a
// slant), and the ground stops at the road too.
{
  const lowest = (x0, x1) => Math.min(TTUK_EDGE(x0), TTUK_EDGE(x1)) - 0.5;
  for (let i = buildings.length - 1; i >= 0; i--) {
    const q = buildings[i];
    const xs = q.p.map((v) => v[0]), zs = q.p.map((v) => v[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), bz0 = Math.min(...zs), bz1 = Math.max(...zs);
    if (bx1 <= S.seoulsup.v || bx0 >= TTUK_E[0] || bz1 <= lowest(bx0, bx1)) continue;
    const z1 = lowest(bx0, bx1);
    const facesRoad = q.f && q.f[1] === 1;
    if (facesRoad || z1 - bz0 < 8) {
      buildings.splice(i, 1);
      const li = lots.findIndex((l) => l.b === q);
      if (li >= 0) { const [l] = lots.splice(li, 1); const ei = extraLots.indexOf(l); if (ei >= 0) extraLots.splice(ei, 1); }
      continue;
    }
    q.p = rect(bx0, bz0, bx1, z1);
    const lot = lots.find((l) => l.b === q);
    if (lot && lot.face.nx) lot.face.z = (bz0 + z1) / 2;
  }
  for (const b of B) {
    if (!b.areaPoly) continue;
    const [bx0, bz0, bx1, bz1] = b.box;
    if (bz1 <= TTUK_EDGE(bx0) || bx0 >= TTUK_E[0]) continue;
    const xs = [bx0, ...[TTUK_W[0], TTUK_E[0]].filter((x) => x > bx0 && x < bx1), bx1];
    b.areaPoly = [[r1(bx0), r1(bz0)], [r1(bx1), r1(bz0)], ...xs.slice().reverse().map((x) => [r1(x), r1(Math.min(bz1, TTUK_EDGE(x)))])];
  }
}

const roads = STREETS.map((s) => ({
  k: s.k, w: s.w,
  p: s.h !== undefined ? [...(s.bend || []), [s.from, s.h], [s.to, s.h]] : [[s.v, s.from], [s.v, s.to]],
  ...(s.n ? { n: s.n } : {}),
}));
for (const w of WALKS) roads.push({ k: 'walk', w: w.w, p: w.p, ...(w.n ? { n: w.n } : {}), ...(w.clear ? { clear: w.clear } : {}) });

const areas = [...AREAS];
for (const b of B) if (b.area) areas.push({ k: b.area, p: b.areaPoly });
for (const x of EXTRA) buildings.push({ h: x.h, p: x.p });

const map = {
  meta: {
    region: 'seongsu',
    source: 'hand-made game map (scripts/build-seongsu.mjs), loosely inspired by Seongsu-dong at 1/4 of the real size; not a survey map',
    center: { lat: 37.5446, lon: 127.0557 },
  },
  roads,
  buildings,
  rail: [{ e: 1, p: [[WEST, -78], [-240, -78], [-160, 0], [260, 0]] }], // Line 2 viaduct over Achasan-ro
  areas,
  blockers: BLOCKERS,
  landmarks: LANDMARKS,
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
  craftCafe: [-77, -2], craftBrick: [-22, 137], craftSup: [67, 137], craftSouth: [188, 266],
  perfPopup: [67, 250], funnyStation: [114, -78], funnyMid: [67, 22],
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
// (Some of these later moved next to Seongsu Square: see TO_SQUARE / --square.)
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
  ['heart-ppyong', 'perfYmj'], ['atelier-noir', 'perfYmj'], ['laundry-parfum', 'perfYmj'],
  ['basic-mood', 'perfYmjE'],
  ['clear-lab', 'perfSquare'],
  // The funny perfumes on their own, away from the perfume streets: one by the
  // station on Achasan-ro, one on Seongsu-ro between the square and Seoul Forest Park.
  ['kkeung-sanghoe', 'funnyStation'], ['oops-parfum', 'funnyMid'],
  // Handmade perfume workshops, spread over the neighbourhood.
  ['aran-distillery', 'craftCafe'], ['punggyeong-scent', 'craftBrick'], ['hut-hedgehog', 'craftSup'], ['moai-scent-lab', 'craftSouth'],
  // The perfume pop-up (limited editions) by the pop-up square.
  ['scent-popup', 'perfPopup'],
];

// Perfume shops that later moved to Hongdae's perfume alley: --place and
// --square leave them where they are now.
export const MOVED_AWAY = new Set(['kkeung-sanghoe', 'oops-parfum', 'heart-ppyong', 'moai-scent-lab', 'punggyeong-scent']);

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
  for (const [id, spot] of [...PLACE, ...PLACE_NEW]) if (!MOVED_AWAY.has(id)) placeOne(id, spot);
  text.stores = setAt(text.stores, 'ttukseom-hangang', [60, 372]); // where the walk down from Ttukseom-ro meets the river path (where a taxi or the map drops you)
  await writeFile(files.stores, text.stores);
  await writeFile(files.homes, text.homes);
  console.log(`placed ${used.size} shops; ${lots.length - used.size} shop lots left empty`);
}
// --square: move the shops listed in TO_SQUARE from the outskirts (the south
// end of the Red Brick Lane, the east end of Yeonmujang-gil and the south
// lane) onto the free lots around Seongsu Square (extraLots above). Each
// takes the free lot nearest its target spot. Other shops keep their place.
export const SQUARE_SPOTS = {
  sqN: [15, 25], sqW: [-1, 45], sqE: [31, 45], lane: [-22, 45], road: [52, 45],
  supW: [10, 84], supE: [100, 84],
};
export const TO_SQUARE = [
  // food and the market, looking onto the square
  ['sinjeon-pocha', 'sqN'], ['golmok-chicken', 'sqN'], ['son-kalguksu', 'sqN'], ['dal-tteok', 'sqN'], ['sandgrain-bakery', 'sqN'],
  ['seongsu-fishmarket', 'supW'],
  // the perfume alley moves to the square's east side
  ['ohu-perfume', 'sqE'], ['maison-seoulsup', 'sqE'], ['monggeul-parfum', 'sqE'], ['plain-note', 'sqE'],
  ['heart-ppyong', 'road'], ['basic-mood', 'road'], ['scent-factory', 'road'], ['moai-scent-lab', 'road'],
  // knits, caps, pets and things for home on the west side
  ['tteugae-knit', 'sqW'], ['cap-yard', 'sqW'], ['mungnyang-petshop', 'sqW'], ['heuk-ceramics', 'sqW'],
  ['chorok-plants', 'lane'],
  // the two homes, just across Seoulsup-gil
  ['forest-lane-apt', 'supE'], ['sunny-villa', 'supE'],
];
if (process.argv.includes('--square')) {
  const files = { stores: path.join(dir, 'stores.json'), homes: path.join(dir, 'homes.json') };
  const text = { stores: await readFile(files.stores, 'utf8'), homes: await readFile(files.homes, 'utf8') };
  const all = [...JSON.parse(text.stores).stores, ...JSON.parse(text.homes).homes];
  const moving = new Set(TO_SQUARE.map(([id]) => id).filter((id) => !MOVED_AWAY.has(id)));
  const pts = all.filter((s) => Array.isArray(s.at) && !moving.has(s.id)).map((s) => s.at);
  // A lot is taken when a shop stands in front of it (same rule as the ad posters).
  const taken = (l) => pts.some(([x, z]) => {
    const dx = x - l.face.x, dz = z - l.face.z;
    const ahead = dx * l.face.nx + dz * l.face.nz, along = Math.abs(dx * l.face.nz - dz * l.face.nx);
    return ahead > -1 && ahead < 7 && along <= 6.5;
  });
  // Two shops on the same line across x (same z) need 7 m between them.
  const clash = ([x, z]) => pts.some(([px, pz]) => Math.abs(pz - z) <= 0.5 && Math.abs(px - x) < 7);
  for (const [id, spot] of TO_SQUARE.filter(([id]) => !MOVED_AWAY.has(id))) {
    const [tx, tz] = SQUARE_SPOTS[spot];
    let best = null, bd = Infinity;
    for (const l of extraLots) {
      const at = [r1(l.face.x + l.face.nx * 2), r1(l.face.z + l.face.nz * 2)];
      if (taken(l) || clash(at)) continue;
      const d = Math.hypot(l.face.x - tx, l.face.z - tz);
      if (d < bd) { bd = d; best = at; }
    }
    if (!best) throw new Error('no free lot by the square for ' + id);
    pts.push(best);
    const key = text.homes.includes(`"id": "${id}"`) ? 'homes' : 'stores';
    text[key] = setAt(text[key], id, best);
  }
  await writeFile(files.stores, text.stores);
  await writeFile(files.homes, text.homes);
  console.log(`moved ${TO_SQUARE.length} shops to the square; ${extraLots.filter((l) => !pts.some(([x, z]) => Math.hypot(x - l.face.x - l.face.nx * 2, z - l.face.z - l.face.nz * 2) < 0.2)).length} square lots left for ads`);
}
export { lots, buildings };
// --stats: shop lots per block.
if (process.argv.includes('--stats')) {
  const c = {};
  B.forEach((b, i) => { const [x0, z0, x1, z1] = b.box; c[i + ':' + JSON.stringify(b.x) + JSON.stringify(b.z)] = lots.filter((l) => l.face.x >= x0 - 1 && l.face.x <= x1 + 1 && l.face.z >= z0 - 1 && l.face.z <= z1 + 1).length; });
  console.log(c);
}
