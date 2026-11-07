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
  { k: 'walk', w: 4, p: [[60, -43], [60, -168]], n: N('북촌로11길', 'Bukchon-ro 11-gil', '北村路11ギル', '北村路11街') },
  { k: 'walk', w: 3.5, p: [[-6, -112], [126, -112]] },
  { k: 'walk', w: 3.5, p: [[-6, -140], [126, -140]] },
  { k: 'walk', w: 3.5, p: [[18, -66], [18, -158]] },
  { k: 'walk', w: 3.5, p: [[102, -84], [102, -158]] },
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

// Everything up the hill is homes: a grid of small hanok, kept off the alleys
// and out of the Open House and the lookout at the top.
const OPEN = BUKCHON.openHouse.box; // [x0, z0, x1, z1]
const segDist = (x, z, [x1, z1], [x2, z2]) => {
  const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)) : 0;
  return Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
};
const clearOfRoads = (x0, z0, x1, z1) => {
  for (const r of roads) {
    const keep = r.w / 2 + (r.k === 'walk' ? 0.8 : 1.6);
    for (let i = 1; i < r.p.length; i++) {
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1], [x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2], [(x0 + x1) / 2, (z0 + z1) / 2]]) {
        if (segDist(x, z, r.p[i - 1], r.p[i]) < keep) return false;
      }
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      for (let k = 0; k <= 20; k++) {
        const x = ax + ((bx - ax) * k) / 20, z = az + ((bz - az) * k) / 20;
        if (x > x0 - keep && x < x1 + keep && z < z0 + keep && z > z1 - keep) return false;
      }
    }
  }
  return true;
};
const overlaps = (x0, z0, x1, z1) => buildings.some((b) => {
  const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
  return x0 < Math.max(...xs) + 1 && x1 > Math.min(...xs) - 1 && z1 < Math.max(...zs) + 1 && z0 > Math.min(...zs) - 1;
});
const inOpen = (x0, z0, x1, z1) => x1 > OPEN[0] - 2 && x0 < OPEN[2] + 2 && z1 < OPEN[1] + 2 && z0 > OPEN[3] - 2;
const LOOK = { x0: 18, x1: 102, z: -159 }; // the lookout at the top (terrace)
const inLookout = (x0, z0, x1, z1) => x1 > LOOK.x0 && x0 < LOOK.x1 && z1 < LOOK.z;
const D = 10, GAP = 1;
for (let iz = 0, z = -66; z - D >= -184; iz++, z -= D + GAP) {
  for (let ix = 0, x = -8; x + 10 <= 128; ix++) {
    const W = 10 + ((ix * 7 + iz * 3) % 4); // 10-13 m wide: not all the same
    const x0 = x, x1 = Math.min(x + W, 128), z0 = z, z1 = z - D;
    x += W + GAP;
    if (!clearOfRoads(x0, z0, x1, z1) || overlaps(x0, z0, x1, z1) || inOpen(x0, z0, x1, z1) || inLookout(x0, z0, x1, z1)) continue;
    const r = Math.round;
    add(rect(r(x0 * 10) / 10, r(z0 * 10) / 10, r(x1 * 10) / 10, r(z1 * 10) / 10), { h: 5 });
  }
}

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
