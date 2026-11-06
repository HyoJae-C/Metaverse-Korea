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
const CENTER = [40, 90]; // the middle of the shop streets, between the square and Yeonmujang-gil

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
  // Seongsu Square: the shops around it are added after the blocks (see
  // "Seongsu Square ring" below), so they face the square.
  { x: ['brick', 'seongsui'], z: ['cafe', 'seoulsup'], sides: { n: 'shop' }, area: 'plaza', square: true },
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

// ── Seongsu Square ring ──────────────────────────────────────────────────
// The square used to be an open plaza behind a tall blank wall, so arriving
// there felt empty. Now shops stand all around it: a row behind the Café
// Street shops facing the square, and on the west and east sides two rows
// back to back (one facing the square, one facing the Red Brick Lane or
// Seongsui-ro), with a passage in the middle of each side. Across
// Seoulsup-gil, the blocks facing the square get a row of shops too.
// These lots come after all the block lots and use their own random numbers,
// so the lots elsewhere (and the ad spot numbers "L-07") stay the same.
const SQUARE_LOT = 10.2; // narrow lots: more shop fronts around the square
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
  const [x0, z0, x1, z1] = B.find((b) => b.square).box;
  const IN = 10, OUT = 8; // depth of the rows facing the square / the street
  // Behind the Café Street row, between the side rows: shops facing south
  // onto the square.
  const nz0 = z0 + DEPTH + GAP, nz1 = nz0 + IN;
  const wx = x0 + OUT + GAP + IN + GAP, ex = x1 - OUT - GAP - IN - GAP;
  // A walkway in the middle runs from the square through both rows to Café
  // Street, so the square opens to the north instead of ending in a wall.
  const NPASS = 7, nmid = (wx + ex) / 2, pa = r1(nmid - NPASS / 2), pb = r1(nmid + NPASS / 2);
  evenRow(wx, pa, (s, e) => addLot(rect(s, nz0, e, nz1), { x: (s + e) / 2, z: nz1, nx: 0, nz: 1 }, sqH()));
  evenRow(pb, ex, (s, e) => addLot(rect(s, nz0, e, nz1), { x: (s + e) / 2, z: nz1, nx: 0, nz: 1 }, sqH()));
  sqRand(); // the lot the walkway replaced: keeps the other lots' heights
  for (const lot of lots) {
    const xs = lot.b.p.map((q) => q[0]), zs = lot.b.p.map((q) => q[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs);
    if (Math.min(...zs) !== r1(z0) || Math.max(...zs) > nz0 || bx1 <= pa || bx0 >= pb) continue;
    const cut = (bx0 + bx1) / 2 < nmid ? (x) => Math.min(x, pa) : (x) => Math.max(x, pb);
    for (const q of lot.b.p) q[0] = cut(q[0]);
    lot.face.x = (Math.min(...lot.b.p.map((q) => q[0])) + Math.max(...lot.b.p.map((q) => q[0]))) / 2;
  }
  WALKS.push({ w: NPASS, p: [[r1(nmid), -2.5], [r1(nmid), nz1]] });
  // West and east sides, from the Café Street row down to Seoulsup-gil, with
  // a passage in the middle.
  // The street rows start right behind the Café Street row; the rows facing
  // the square start below the north row (the corners between are plain).
  const PASS = 5, mid = (nz1 + z1) / 2, iz0 = nz1 + GAP;
  for (const [a, b, inner] of [[nz0, mid - PASS / 2, false], [iz0, mid - PASS / 2, true], [mid + PASS / 2, z1, false], [mid + PASS / 2, z1, true]]) {
    if (inner) {
      evenRow(a, b, (s, e) => addLot(rect(x0 + OUT + GAP, s, x0 + OUT + GAP + IN, e), { x: x0 + OUT + GAP + IN, z: (s + e) / 2, nx: 1, nz: 0 }, sqH())); // square
      evenRow(a, b, (s, e) => addLot(rect(x1 - OUT - GAP - IN, s, x1 - OUT - GAP, e), { x: x1 - OUT - GAP - IN, z: (s + e) / 2, nx: -1, nz: 0 }, sqH())); // square
    } else {
      evenRow(a, b, (s, e) => addLot(rect(x0, s, x0 + OUT, e), { x: x0, z: (s + e) / 2, nx: -1, nz: 0 }, sqH())); // Red Brick Lane
      evenRow(a, b, (s, e) => addLot(rect(x1 - OUT, s, x1, e), { x: x1, z: (s + e) / 2, nx: 1, nz: 0 }, sqH())); // Seongsui-ro
    }
  }
  buildings.push({ h: 16, p: rect(x0 + OUT + GAP, nz0, x0 + OUT + GAP + IN, nz1) }, { h: 16, p: rect(x1 - OUT - GAP - IN, nz0, x1 - OUT - GAP, nz1) });
}
// Across Seoulsup-gil: the plain buildings facing the square give their
// north side to a row of shops.
for (const key of [['brick', 'seongsui'], ['seongsui', 'east1']]) {
  const b = B.find((q) => q.x[0] === key[0] && q.x[1] === key[1] && q.z[0] === 'seoulsup');
  const [bx0, bz0, bx1] = b.box;
  const plain = buildings.filter((q) => !q.f && q.p.some(([, z]) => z === r1(bz0)) && q.p.every(([x]) => x >= bx0 - 0.1 && x <= bx1 + 0.1));
  if (plain.length !== 1) throw new Error('expected one plain building north in block ' + key);
  const xs = plain[0].p.map((q) => q[0]);
  const px0 = Math.min(...xs), px1 = Math.max(...xs);
  for (const q of plain[0].p) if (q[1] === r1(bz0)) q[1] = r1(bz0 + DEPTH + GAP);
  evenRow(px0, px1, (s, e) => addLot(rect(s, bz0, e, bz0 + DEPTH), { x: (s + e) / 2, z: bz0, nx: 0, nz: -1 }, sqH()));
}

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
  text.stores = setAt(text.stores, 'ttukseom-hangang', [-60, 360]); // by the Han River park gate
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
