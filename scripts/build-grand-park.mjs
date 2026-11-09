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
const r1 = (v) => Math.round(v * 10) / 10;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// Is the zoo open? While it isn't, a hoarding ("opening soon") runs round
// the whole zoo with a sign at the end of the main path; the gate plaza,
// the information center and the station stay open.
export const ZOO_OPEN = false;
export const DOGHOLE = [55, -34]; // on the hoarding's west side
export const HOARDING = [[55, -80], [200, -80], [200, 95], [55, 95], [55, -80]]; // (between the plaza's blossom trees, x 52 and 58)

// The zoo in four themed quarters round a round flower plaza (PLAZA), where
// the main path from the gate meets the cross path, wrapped in a ring road
// the zoo carts drive round (game/zoo-carts.js):
//   north-west  waterside: Sea Animals hall, hippos, the bird house
//   north-east  big cats and birds of prey: tigers, lions, bears, vultures
//   south-west  little ones (by the gate): petting village, reptiles, monkeys
//   south-east  herbivores: zebras, elephants and giraffes, a pen each
// A path across each north quarter and the south-west one gives the back row
// of pens a front to face. No path runs straight: each is a smooth curve
// through the gaps between the pens (smooth()), and flower beds line them
// and fill the open lawn (flowerBeds(), drawn by core/grand-park.js).
// Like every district, the park is real Seoul at 1/4 (docs/WORLD.md): the
// real park's 53 ha are about 3.4 ha here.
export const PLAZA = { x: 128, z: 0, r: 6.5, bed: 2.8 };

// A smooth path through control points (Catmull-Rom), as points about
// `step` metres apart, rounded to 0.1 m. closed: a loop back to the start.
export function smooth(pts, { closed = false, step = 2.5 } = {}) {
  const n = pts.length, out = [];
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const k = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([r1(f(p0[0], p1[0], p2[0], p3[0])), r1(f(p0[1], p1[1], p2[1], p3[1]))]);
    }
  }
  out.push(closed ? out[0].slice() : pts[n - 1].slice());
  return out;
}

// The paths (local metres): control points, smoothed. The ring road wanders
// in and out of the woods; the others weave between the pens.
export const PATHS = {
  ring: { w: 6, closed: true, pts: [[63, -60], [72, -71], [88, -72.5], [106, -70], [125, -73], [146, -71], [166, -73.5], [182, -72], [192.5, -60], [191, -40], [186, -21], [190, 0], [191, 25], [189.5, 50], [191.5, 76], [184.5, 88], [164, 88.5], [144, 86], [125, 89], [104, 84], [84, 85.5], [68, 82], [62, 68], [60.5, 48], [63.5, 30], [62, 10], [61, -8], [64, -24], [60, -44]] },
  main: { w: 6, pts: [[50, 0], [62, 0], [78, -1.6], [94, 1], [110, -1.5], [PLAZA.x - PLAZA.r, 0]] },
  east: { w: 6, pts: [[PLAZA.x + PLAZA.r, 0], [145, 1.6], [161, -1], [176, 1.6], [190, 0]] },
  crossNorth: { w: 5, pts: [[PLAZA.x, PLAZA.z - PLAZA.r], [125.5, -14], [126.5, -26], [124.5, -38], [127, -53], [125, -73]] },
  crossSouth: { w: 5, pts: [[PLAZA.x, PLAZA.z + PLAZA.r], [129.5, 11], [127, 25], [121.5, 40], [124, 60], [120.5, 75], [125, 89]] },
  north: { w: 4, pts: [[64, -38], [80, -40], [95, -38.5], [110, -40.5], [124.5, -38], [140, -37.5], [155, -38.5], [170, -37.5], [191, -39]] },
  herdA: { w: 4, pts: [[129, 31.5], [145, 31.25], [160, 31.75], [175, 31.25], [190.5, 31.5]] }, // between the zebras and the elephants
  herdB: { w: 4, pts: [[123.5, 57.5], [145, 57.25], [160, 57.75], [175, 57.25], [190, 57.5]] }, // between the elephants and the giraffes
  south: { w: 4, pts: [[62, 44], [80, 41], [95, 43.5], [110, 40.5], [121.5, 40]] },
};
export const WALKS = Object.fromEntries(Object.entries(PATHS).map(([k, p]) => [k, { w: p.w, p: smooth(p.pts, { closed: p.closed }) }]));

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
    id: 'reptiles', x: 117, z: 10, w: 10, d: 7, fence: 'house', ground: 'stone', board: 's',
    name: L('파충류관', 'Reptile House', '爬虫類館', '爬行动物馆'),
    props: [['rock', 2.5, -1.5]],
    groups: [{ kind: 'snake', n: 1, box: [-3.6, -2.2, 3.6, 2.2] }],
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
  // South-east: the herbivores, three pens down the cross path, each small
  // enough to see across, with a walk between them: zebras by the plaza,
  // the elephants (a mother and her calf) in the middle, the giraffes at the
  // back among tall trees. A low glass wall all round to watch over.
  {
    id: 'zebras', x: 159.5, z: 18.5, w: 51, d: 21, fence: 'glass', ground: 'dirt', board: 'n',
    name: L('얼룩말', 'Zebras', 'シマウマ', '斑马'),
    pond: [-15, 3, 3.5],
    props: [['tree', 18, -4], ['tree', -4, 6], ['rock', 8, 4], ['rock', -21, -5]],
    groups: [{ kind: 'zebra', n: 7 }],
  },
  {
    id: 'elephants', x: 159.5, z: 44.5, w: 51, d: 21, fence: 'glass', ground: 'dirt', board: 'n',
    name: L('코끼리', 'Elephants', 'ゾウ', '大象'),
    pond: [-14, 2, 5.5],
    props: [['tree', 19, 5], ['tree', 6, -5], ['rock', 12, 4], ['rock', -22, -6]],
    groups: [{ kind: 'elephant', n: 2 }],
    feed: { at: [4, -6.5], offset: 540, food: 'greens' },
  },
  {
    id: 'giraffes', x: 159.5, z: 70.5, w: 51, d: 21, fence: 'glass', ground: 'dirt', board: 'n',
    name: L('기린', 'Giraffes', 'キリン', '长颈鹿'),
    pond: [14, 3, 3.5],
    props: [['tree', -16, 3], ['tree', -4, -4], ['tree', 6, 5], ['tree', 20, -5], ['rock', -22, 6]],
    groups: [{ kind: 'giraffe', n: 3 }],
  },
];

// The cart station just inside the gate, between the ring road's west side
// and the little animal village: three four-seat carts (game/zoo-carts.js).
// Carts stay in the zoo: `area` is where they may go, from the station.
export const CARTS = { x: 71.5, z: 17, carts: [[0, -7], [0, 0], [0, 7]], sign: [-1.6, -11], area: [55 - 71.5, -80 - 17, 200 - 71.5, 95 - 17] };

// The Sea Animals hall's walls (its pen "sea", 24 × 28 m round x 81, z -21).
export const SEA_HALL = { h: 7.5, custom: true, p: rect(69, -35, 93, -7) };

// A fence line as a thin blocker (0.4 m thick).
function lineBlocker([x1, z1, x2, z2], ox, oz) {
  const t = 0.2;
  const [ax, bx] = [Math.min(x1, x2), Math.max(x1, x2)], [az, bz] = [Math.min(z1, z2), Math.max(z1, z2)];
  return { p: rect(r1(ax - t + ox), r1(az - t + oz), r1(bx + t + ox), r1(bz + t + oz)) };
}

// Flower beds (local [x, z, r]): small round beds along both sides of every
// path, then bigger ones in the open lawn, biggest gaps first. They keep off
// the paths, the pens (and their name boards), the buildings, the cart
// station, the woods and the gate plaza. Low, so you can walk over them.
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
};
const boxDist = (x, z, [x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
// Where a pen's name board (and the gate beside it) stands: a box in front of its board side.
function boardSpot(p) {
  const s = p.board || 'n', hw = p.w / 2, hd = p.d / 2;
  const shift = p.gate?.side === s ? (p.gate.at || 0) + (p.gate.w || 4) / 2 + 2 : p.boardAt || 0;
  const g = p.gate ? [p.gate.side, p.gate.at || 0, (p.gate.w || 4) / 2 + 1] : null;
  const along = (side, at, half) => ({
    n: [p.x + at - half, p.z - hd - 3, p.x + at + half, p.z - hd], s: [p.x + at - half, p.z + hd, p.x + at + half, p.z + hd + 3],
    w: [p.x - hw - 3, p.z + at - half, p.x - hw, p.z + at + half], e: [p.x + hw, p.z + at - half, p.x + hw + 3, p.z + at + half],
  })[side];
  return g && g[0] === s ? (() => { const a = along(s, shift, 2.5), b = along(g[0], g[1], g[2]); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; })() : along(s, shift, 2.5);
}

// Flower borders along the pens' fences (outside, 0.9 m out), except on the
// side you look in from, cut where a path or a building runs past: segments
// [x1, z1, x2, z2] for core/grand-park.js to plant.
export function flowerBorders() {
  const out = [], step = 0.5, off = 0.9;
  const blocked = (x, z) => x < 64 || x > 196 || z < -76 || z > 91
    || Object.values(WALKS).some((r) => r.p.some((q, i) => i > 0 && segDist(x, z, r.p[i - 1], q) < r.w / 2 + 0.5))
    || PENS.some((q) => boxDist(x, z, [q.x - q.w / 2, q.z - q.d / 2, q.x + q.w / 2, q.z + q.d / 2]) < 0.5)
    || boxDist(x, z, [CARTS.x - 3, CARTS.z - 13, CARTS.x + 2, CARTS.z + 9]) < 0.5;
  for (const p of PENS) {
    const hw = p.w / 2 + off, hd = p.d / 2 + off, front = p.board || 'n';
    const sides = { n: [[-hw, -hd], [hw, -hd]], s: [[-hw, hd], [hw, hd]], w: [[-hw, -hd], [-hw, hd]], e: [[hw, -hd], [hw, hd]] };
    for (const [k, [[ax, az], [bx, bz]]] of Object.entries(sides)) {
      if (k === front || (p.gate && p.gate.side === k)) continue;
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / step);
      let run = null;
      for (let i = 0; i <= n; i++) {
        const x = p.x + ax + ((bx - ax) * i) / n, z = p.z + az + ((bz - az) * i) / n;
        if (!blocked(x, z)) { run ||= [x, z]; run[2] = x; run[3] = z; continue; }
        if (run && Math.hypot(run[2] - run[0], run[3] - run[1]) >= 1.5) out.push(run.map(r1));
        run = null;
      }
      if (run && Math.hypot(run[2] - run[0], run[3] - run[1]) >= 1.5) out.push(run.map(r1));
    }
  }
  return out;
}

export function flowerBeds(woods = []) {
  const walls = [
    ...PENS.map((p) => [p.x - p.w / 2 - 1.6, p.z - p.d / 2 - 1.6, p.x + p.w / 2 + 1.6, p.z + p.d / 2 + 1.6]),
    ...PENS.map(boardSpot),
    [CARTS.x - 4, CARTS.z - 14, CARTS.x + 3, CARTS.z + 10], // the cart station
  ];
  const inWoods = (x, z, r) => woods.some((w) => x > w[0][0] - r && x < w[2][0] + r && z > w[0][1] - r && z < w[2][1] + r);
  // How far a bed at (x, z) could reach before it touched something.
  const room = (x, z) => {
    let d = Math.min(x - 64, 196 - x, z + 76, 91 - z, Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r - 1);
    for (const b of walls) d = Math.min(d, boxDist(x, z, b));
    for (const r of Object.values(WALKS)) for (let i = 1; i < r.p.length; i++) d = Math.min(d, segDist(x, z, r.p[i - 1], r.p[i]) - r.w / 2 - 0.6);
    return d;
  };
  const beds = [];
  const free = (x, z, r, gap) => room(x, z) >= r && !inWoods(x, z, r) && beds.every(([bx, bz, br]) => Math.hypot(x - bx, z - bz) > r + br + gap);
  for (const r of Object.values(WALKS)) {
    let run = 5;
    for (let i = 1; i < r.p.length; i++) {
      const [[ax, az], [bx, bz]] = [r.p[i - 1], r.p[i]];
      const len = Math.hypot(bx - ax, bz - az);
      if ((run += len) < 8) continue;
      run = 0;
      const nx = -(bz - az) / len, nz = (bx - ax) / len, off = r.w / 2 + 0.6 + 0.9;
      for (const sd of [-1, 1]) {
        const x = r1(bx + nx * off * sd), z = r1(bz + nz * off * sd);
        if (free(x, z, 0.9, 1.5)) beds.push([x, z, 0.9]);
      }
    }
  }
  const spots = [];
  for (let x = 66; x < 196; x += 2) for (let z = -74; z < 90; z += 2) { const d = room(x, z); if (d >= 2) spots.push([x, z, d]); }
  spots.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
  for (const [x, z, d] of spots) {
    const r = r1(Math.min(d - 0.3, 4.5));
    if (r >= 1.2 && free(x, z, r, 2)) beds.push([x, z, r]);
  }
  return beds;
}

export function buildMap() {
  const map = {
    meta: {
      district: 'grand-park',
      source: "hand-made (game map, not to scale): Seoul Children's Grand Park in Gwangjin-gu (opened 1973, free entry). Simplified to the zoo: the main gate on Neungdong-ro by Children's Grand Park Station (Line 7), a gate plaza and the zoo loop with its pens, wrapped in a strip of woods. The animals are the game's choice and may differ from the real zoo. Built by scripts/build-grand-park.mjs; placed by its anchor, Children's Grand Park Station (region.json).",
    },
    roads: [
      { k: 'secondary', w: 14, p: [[0, -80], [0, 95]], n: L('능동로', 'Neungdong-ro', '陵洞路', '陵洞路') },
      ...Object.values(WALKS).map((r) => ({ k: 'walk', w: r.w, p: r.p })),
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
      { kind: 'landmark', x: ZOO_OPEN ? PLAZA.x : 40, z: 0, name: L('서울어린이대공원', "Seoul Children's Grand Park", 'ソウル子供大公園', '首尔儿童大公园') },
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
      // The round plaza where the paths meet, and every flower bed (core/grand-park.js).
      { type: 'zooflowers', x: PLAZA.x, z: PLAZA.z, plaza: [PLAZA.r, PLAZA.bed], beds: [], borders: [] },
    ],
  };
  const woods = map.areas.filter((a) => a.trees).map((a) => a.p);
  const fl = map.landmarks.find((l) => l.type === 'zooflowers');
  fl.beds = flowerBeds(woods).map(([x, z, r]) => [r1(x - PLAZA.x), r1(z - PLAZA.z), r]);
  fl.borders = flowerBorders().map(([a, b, c, d]) => [r1(a - PLAZA.x), r1(b - PLAZA.z), r1(c - PLAZA.x), r1(d - PLAZA.z)]);
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
