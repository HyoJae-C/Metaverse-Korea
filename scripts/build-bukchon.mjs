#!/usr/bin/env node
// Builds Bukchon's district map (public/regions/seongsu/districts/bukchon.json)
// from the hand-made layout below.
//
// Bukchon Hanok Village sits between Gyeongbokgung and Changdeokgung, uphill
// from Anguk Station. The game makes it a small walled village on a hill,
// loosely after the real streets (OpenStreetMap, © OpenStreetMap
// contributors): the gate on Bukchon-ro by Anguk Station, a street of shops
// and the Open House at the bottom (after Bukchon-ro 5-gil), then the hanok
// alleys of Gahoe-dong climbing north, the main one after Bukchon-ro 11-gil,
// to a lookout at the top: the famous view down the alley to the city. The
// alleys up the hill are homes (the Quiet Zone).
//
//   node scripts/build-bukchon.mjs
//
// Coordinates are metres: x east, z south. (0, 0) is on Yulgok-ro's centre
// line in front of Anguk Station (the district's anchor in region.json).
// Buildings with "hanok": 1 are drawn as hanok (core/hanok.js), not boxes.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BUKCHON, ground } from '../src/data/bukchon.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/regions/seongsu/districts/bukchon.json');

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const roads = [
  { k: 'primary', w: 16, p: [[60, 0], [310, 0]], n: N('율곡로', 'Yulgok-ro', '栗谷路', '栗谷路') },
  { k: 'secondary', w: 8, p: [[24, -8], [24, -40]], n: N('북촌로', 'Bukchon-ro', '北村路', '北村路') },
  { k: 'tertiary', w: 7, p: [[-6, -40], [126, -40]], n: N('북촌로5길', 'Bukchon-ro 5-gil', '北村路5ギル', '北村路5街') },
  // Up the hill: the main alley to the top, two alleys across, two side alleys.
  // Narrow, like the real alleys: the house walls stand right at the edge.
  { k: 'walk', w: 3.2, p: [[60, -43], [60, -168]], n: N('북촌로11길', 'Bukchon-ro 11-gil', '北村路11ギル', '北村路11街') },
  { k: 'walk', w: 2.6, p: [[-6, -112], [126, -112]] },
  { k: 'walk', w: 2.6, p: [[-6, -140], [126, -140]] },
  { k: 'walk', w: 2.6, p: [[18, -66], [18, -158]] },
  { k: 'walk', w: 2.6, p: [[102, -84], [102, -158]] },
];

const areas = [
  { k: 'plaza', p: rect(88, -50, 120, -72) }, // the Open House courtyard (madang)
];

// Shops (hanok fronts) on the street at the bottom, listed so stores.json can
// stand in front of them.
const buildings = [];
const add = (p, extra) => buildings.push({ h: 6, hanok: 1, p, ...extra });
for (let x = 31; x + 22 <= 126; x += 24) add(rect(x, -18, x + 22, -34), { fr: [0, -1] }); // south side of 5-gil
add(rect(-6, -18, 18, -34), { fr: [0, -1] });
for (const [x0, x1] of [[-6, 16], [20, 42], [64, 80]]) add(rect(x0, -46, x1, -62), { fr: [0, 1] }); // north side

// Everything up the hill is homes: blocks between the alleys, filled with
// small hanok side by side whose walls line the alleys (as in the real
// Gahoe-dong lanes), kept out of the Open House and the lookout at the top.
const OPEN = BUKCHON.openHouse.box; // [x0, z0, x1, z1]
const segDist = (x, z, [x1, z1], [x2, z2]) => {
  const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)) : 0;
  return Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
};
const overlaps = (x0, z0, x1, z1) => buildings.some((b) => {
  const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
  return x0 < Math.max(...xs) + 1 && x1 > Math.min(...xs) - 1 && z1 < Math.max(...zs) + 1 && z0 > Math.min(...zs) - 1;
});
const inOpen = (x0, z0, x1, z1) => x1 > OPEN[0] - 2 && x0 < OPEN[2] + 2 && z1 < OPEN[1] + 2 && z0 > OPEN[3] - 2;
const LOOK = { x0: 47, x1: 73, z: -159 }; // the lookout at the top (terrace, 24 m wide)
const inLookout = (x0, z0, x1, z1) => x1 > LOOK.x0 && x0 < LOOK.x1 && z1 < LOOK.z;
// Splits [a, b] into n parts of slightly different sizes, a gap between them.
const split = (a, b, n, gap, seed) => {
  const wts = Array.from({ length: n }, (_, i) => 1 + 0.22 * Math.sin(seed * 1.7 + i * 2.3));
  const sum = wts.reduce((s, w) => s + w, 0), free = b - a - gap * (n - 1), out = [];
  let x = a;
  for (const w of wts) { const len = (free * w) / sum; out.push([x, x + len]); x += len + gap; }
  return out;
};
const walkX = roads.filter((r) => r.k === 'walk' && r.p[0][0] === r.p[1][0]).map((r) => ({ x: r.p[0][0], hw: r.w / 2 }));
const walkZ = roads.filter((r) => r.k === 'walk' && r.p[0][1] === r.p[1][1]).map((r) => ({ z: r.p[0][1], hw: r.w / 2 }));
const EDGE = 0.15; // from a house wall to the alley's edge
const cols = [], bands = [];
{
  let x = -8;
  for (const w of [...walkX].sort((a, b) => a.x - b.x)) { cols.push([x, w.x - w.hw - EDGE]); x = w.x + w.hw + EDGE; }
  cols.push([x, 128]);
  let z = -66;
  for (const w of [...walkZ].sort((a, b) => b.z - a.z)) { bands.push([z, w.z + w.hw + EDGE]); z = w.z - w.hw - EDGE; }
  bands.push([z, -184]);
}
const r1 = (v) => Math.round(v * 10) / 10;
cols.forEach(([cx0, cx1], ci) => bands.forEach(([bz0, bz1], bi) => {
  const xs = split(cx0, cx1, Math.max(1, Math.round((cx1 - cx0) / 12)), 0.4, ci * 5 + bi);
  const zs = split(bz1, bz0, Math.max(1, Math.round((bz0 - bz1) / 11)), 0.4, ci + bi * 3);
  for (const [x0, x1] of xs) for (const [z1, z0] of zs) {
    if (overlaps(x0, z0, x1, z1) || inOpen(x0, z0, x1, z1) || inLookout(x0, z0, x1, z1)) continue;
    add(rect(r1(x0), r1(z0), r1(x1), r1(z1)), { h: 5 });
  }
}));

// Which way each hanok faces: towards its nearest street (fr, a unit step on
// the map), and how high it stands on its stone terrace up the hill (lv, m:
// the ground at its uphill edge, so the terrace shows on the downhill side).
for (const b of buildings) {
  if (!b.hanok || b.fr) continue;
  const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const long = Math.max(x1 - x0, z1 - z0) / Math.min(x1 - x0, z1 - z0) > 1.1 ? (x1 - x0 > z1 - z0 ? 'x' : 'z') : null;
  // Each side's middle: how far to the nearest street (a long side and a real
  // street, not a footpath, are preferred).
  let best = Infinity, f = [0, 1];
  for (const [mx, mz, dir, along] of [[cx, z1, [0, 1], 'x'], [cx, z0, [0, -1], 'x'], [x1, cz, [1, 0], 'z'], [x0, cz, [-1, 0], 'z']]) {
    let d = Infinity;
    for (const r of roads) for (let i = 1; i < r.p.length; i++) d = Math.min(d, segDist(mx, mz, r.p[i - 1], r.p[i]) - r.w / 2 + (r.k === 'walk' ? 4 : 0));
    if (long && along !== long) d += 8;
    if (d < best) { best = d; f = dir; }
  }
  b.fr = f;
}
for (const b of buildings) {
  const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
  const lv = ground((Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...zs));
  if (lv > 0.05) b.lv = Math.round(lv * 100) / 100;

}

// A few homes open their courtyard to visitors (출입 가능): a sign by the
// gate, the gate open, and you can walk into the yard. They are always ㄷ
// shaped with the gate in the middle of the front (core/hanok.js), so the
// solid parts can be listed here: the three wings and the front wall.
const VISIT = N('출입 가능', 'Visitors welcome', '見学できます', '欢迎参观');
const VISIT_TEXT = N(
  '이 집은 마당을 방문객에게 열어 두었어요. 조용히 둘러봐 주시고, 방 안이나 장독대는 만지지 말아 주세요.',
  'This home opens its courtyard to visitors. Look round quietly, and please don\'t go into the rooms or touch the jars.',
  'この家は中庭を見学者に開放しています。静かに見て回り、部屋に入ったり甕に触れたりしないでください。',
  '这户人家向游客开放院子。请安静参观，不要进入房间或触碰酱缸。',
);
const visitBlockers = [], visitMarks = [];
{
  const main = walkX.find((w) => w.x === 60);
  const cands = buildings.filter((b) => {
    if (b.h >= 6 || !b.fr || b.fr[1] !== 0) return false;
    const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
    const near = b.fr[0] < 0 ? Math.min(...xs) : Math.max(...xs);
    return Math.abs(Math.abs(near - main.x) - main.hw - EDGE) < 0.3 && Math.max(...zs) - Math.min(...zs) >= 10 && Math.max(...xs) - Math.min(...xs) >= 9;
  }).sort((a, b) => b.p[0][1] - a.p[0][1]);
  const pickAt = [0, Math.floor(cands.length / 2), cands.length - 1];
  for (const b of [...new Set(pickAt.map((i) => cands[i]).filter(Boolean))]) {
    b.visit = 1;
    const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const L = Math.max(...zs) - Math.min(...zs), D = Math.max(...xs) - Math.min(...xs); // faces along x
    const ry = Math.atan2(b.fr[0], b.fr[1]), c = Math.cos(ry), sn = Math.sin(ry);
    const W = (lx, lz) => [r1(cx + lx * c + lz * sn), r1(cz - lx * sn + lz * c)];
    const box = (ax, az, bx, bz) => ({ p: [W(ax, az), W(bx, az), W(bx, bz), W(ax, bz)] });
    // (the same sizes as home() in core/hanok.js)
    const back = Math.min(5.5, D * 0.48), side = Math.min(4.6, L * 0.34), zb = -D / 2 + back / 2 + 0.4, len = D - back - 1.6, zf = D / 2 - 0.3;
    visitBlockers.push(box(-L / 2, -D / 2, L / 2, zb + back / 2 + 0.35)); // the main wing along the back
    for (const sx of [-1, 1]) {
      const x = sx * (L / 2 - side / 2 - 0.4);
      visitBlockers.push(box(x - side / 2 - 0.4, zb + back / 2, x + side / 2 + 0.4, zb + back / 2 + 0.4 + len + 0.2)); // the side wings
      visitBlockers.push(box(sx * 1.4, zf - 0.3, sx * L / 2, zf + 0.3)); // the front wall either side of the gate
    }
    const [sx, sz] = W(2.6, D / 2 + 0.25); // on the front wall, beside the gate
    visitMarks.push({ type: 'sign', x: sx, z: sz, ry, y: r1(ground(sx, sz)), title: VISIT, text: VISIT_TEXT, visit: 1 });
  }
}

// Little gardens by the houses: stone planters with a small tree or clipped
// shrubs where a street corner or a gap between houses leaves room.
const planters = [];
{
  const free = (x, z, r) => !buildings.some((b) => {
    const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
    return x + r > Math.min(...xs) && x - r < Math.max(...xs) && z + r > Math.min(...zs) && z - r < Math.max(...zs);
  }) && !roads.some((rd) => rd.p.some((_, i) => i && segDist(x, z, rd.p[i - 1], rd.p[i]) < rd.w / 2 + r));
  const spots = [[18, -51], [44, -48], [53, -48], [-3, -65], [123, -65], [46, -164], [74, -164], [8, -183], [112, -183], [33, -183], [87, -183]];
  spots.forEach(([x, z], i) => { if (free(x, z, 1.1)) planters.push({ type: 'planter', x, z, y: r1(ground(x, z)), kind: i % 3 === 1 ? 'bush' : 'tree' }); });
}

// The Open House: a ㄷ-shaped hanok round a courtyard, a gate in the south
// wall. Its walls and wings are blockers (drawn by the landmark).
const [ox0, oz0, ox1, oz1] = OPEN; // x0 < x1, z0 > z1 (z0 is the south side)
const blockers = [
  { p: rect(ox0, oz1 + 12, ox1, oz1) }, // main hall (anchae) along the north side
  { p: rect(ox0, oz0 - 4, ox0 + 9, oz1 + 12) }, // west wing (anbang)
  { p: rect(ox1 - 9, oz0 - 4, ox1, oz1 + 12) }, // east wing (sarangbang)
  { p: rect(ox0, oz0, BUKCHON.openHouse.gate[0] - 2.5, oz0 - 1) }, // south wall, left of the gate
  { p: rect(BUKCHON.openHouse.gate[0] + 2.5, oz0, ox1, oz0 - 1) }, // and right of it
  { p: rect(58.5, -179.5, 61.5, -182.5) }, // the lookout's coin telescope
  ...visitBlockers, // the homes open to visitors: their wings and front walls (not the yard)
  ...planters.map((l) => ({ p: rect(l.x - 0.8, l.z + 0.8, l.x + 0.8, l.z - 0.8) })),
];

// A low granite retaining wall (chukdae) round the village holds up the hill
// (data/bukchon.js "area"); the village itself is open to see from the street.
// The gate is on Bukchon-ro by Anguk Station. Up the hill the wall steps up
// with the ground.
const [AX0, AZ0, AX1, AZ1] = BUKCHON.area; // x0, z0 (south), x1, z1 (north)
const GATES = BUKCHON.gates;
const wallMarks = [];
const wallRun = (fixed, from, to, alongX) => { // a straight run with gaps for the gates on it
  const cuts = GATES.filter((g) => (alongX ? g.at[1] === fixed : g.at[0] === fixed)).map((g) => { const c = alongX ? g.at[0] : g.at[1]; return [c - g.w / 2, c + g.w / 2]; }).sort((a, b) => a[0] - b[0]);
  let a = Math.min(from, to);
  const end = Math.max(from, to);
  for (const [c0, c1] of [...cuts, [end, end]]) {
    // (along the slope, in short steps that follow the ground)
    for (let s0 = a; c0 - s0 > 0.5;) {
      const s1 = alongX ? c0 : Math.min(c0, s0 + 8), mid = (s0 + s1) / 2, len = s1 - s0;
      const y = alongX ? ground(mid, fixed + (fixed < -100 ? 1 : -1)) : ground(fixed + 1, Math.min(s0, s1) + 0.01);
      wallMarks.push(alongX ? { x: mid, z: fixed, len, ry: 0, y } : { x: fixed, z: mid, len: len + 0.3, ry: Math.PI / 2, y });
      s0 = s1;
    }
    if (c0 - a > 0.5) {
      blockers.push({ p: alongX ? rect(a, fixed + 0.5, c0, fixed - 0.5) : rect(fixed - 0.5, a, fixed + 0.5, c0) });
    }
    a = c1;
  }
};
wallRun(AZ0, AX0, AX1, true);
wallRun(AZ1, AX0, AX1, true);
wallRun(AX0, AZ1, AZ0, false);
wallRun(AX1, AZ1, AZ0, false);
for (const g of GATES) for (const s of [-1, 1]) { // the gate posts are solid
  const [x, z] = g.at, k = g.w / 2 + 0.2;
  blockers.push({ p: g.ry ? rect(x - 0.6, z + s * k - 0.6, x + 0.6, z + s * k + 0.6) : rect(x + s * k - 0.6, z - 0.6, x + s * k + 0.6, z + 0.6) });
}

// The Quiet Zone signs at the alley entrances (the real rule, checked on
// 2026-11-07: Seoul Metropolitan Government / Jongno-gu).
const QUIET = {
  title: N('조용히 걸어 주세요', 'Quiet Zone', '静かにお歩きください', '请安静行走'),
  text: {
    ko: '주민이 사는 한옥 골목이에요. 뛰지 말고 조용히 걸어 주세요. 실제 북촌로11길 일대는 관광객 방문 시간이 오전 10시~오후 5시예요.',
    en: 'People live in these hanok. Please walk, and keep your voice down. In the real Bukchon-ro 11-gil area, visitors are welcome 10:00 to 17:00.',
    ja: '人が暮らす韓屋の路地です。走らず静かにお歩きください。実際の北村路11ギル一帯の観光客の訪問時間は10時〜17時です。',
    zh: '这里是居民居住的韩屋小巷，请勿奔跑，安静行走。现实中北村路11街一带的游客参观时间为10:00至17:00。',
  },
};

const landmarks = [
  { type: 'hanokwalls', x: (AX0 + AX1) / 2, z: (AZ0 + AZ1) / 2, segs: wallMarks.map((w) => ({ ...w, x: w.x - (AX0 + AX1) / 2, z: w.z - (AZ0 + AZ1) / 2 })) }, // one mesh for the whole wall (segs relative to it)
  ...BUKCHON.signs.map(({ at: [x, z], ry }) => ({ type: 'sign', x, z, ry, title: BUKCHON.welcome.title, text: { ...Object.fromEntries(Object.entries(BUKCHON.welcome.rules).map(([k, v]) => [k, v])) } })),
  ...GATES.map((g) => ({ type: 'bukchongate', x: g.at[0], z: g.at[1], ry: g.ry || 0, w: g.w, main: !!g.main })),
  { type: 'openhouse', x: (ox0 + ox1) / 2, z: (oz0 + oz1) / 2, w: ox1 - ox0, d: oz0 - oz1 },
  { type: 'terrace', x: 60, z: -172, y: ground(60, -172) }, // the lookout at the top, the photo spot in its gap
  ...visitMarks, // 출입 가능 by the open homes' gates
  ...planters,
  ...[[55, -86, 0], [14.5, -86, 0], [106, -86, 0]].map(([x, z, ry]) => ({ type: 'sign', x, z, ry, y: ground(x, z), title: QUIET.title, text: QUIET.text })),
];

const pois = [
  { kind: 'landmark', x: 60, z: -120, name: N('북촌한옥마을', 'Bukchon Hanok Village', '北村韓屋村', '北村韩屋村') },
  { kind: 'landmark', x: 104, z: -64, name: N('북촌 열린 한옥', 'Bukchon Open House', '北村 オープンハウス', '北村开放韩屋') },
  { kind: 'landmark', x: 60, z: -168, name: N('북촌로11길 언덕', 'Bukchon-ro 11-gil Hilltop', '北村路11ギルの丘', '北村路11街坡顶') },
];

const map = {
  meta: {
    district: 'bukchon',
    // For the overlap check: the lane down to Samcheong-ro reaches into
    // Gyeongbokgung on purpose (scripts/place-districts.mjs).
    parts: [{ why: 'the hill village, Anguk Station to the hilltop', box: [-10, -186, 130, 0] }],
    source: 'hand-made (game map, not to scale; loosely after Bukchon, Jongno-gu, street lines from OpenStreetMap © OpenStreetMap contributors, ODbL). Built by scripts/build-bukchon.mjs',
  },
  roads, buildings, rail: [], areas, blockers, pois, landmarks,
};
await writeFile(out, JSON.stringify(map, null, 1) + '\n');
console.log(`bukchon.json: ${roads.length} roads, ${buildings.length} buildings (${buildings.filter((b) => b.hanok).length} hanok)`);
