#!/usr/bin/env node
// Builds Bukchon's district map (public/regions/seongsu/districts/bukchon.json)
// from the hand-made layout below.
//
// Bukchon Hanok Village sits between Gyeongbokgung and Changdeokgung, uphill
// from Anguk Station. The game keeps its big lines, loosely after the real
// streets (OpenStreetMap, © OpenStreetMap contributors): Yulgok-ro along the
// south edge with Anguk Station, Bukchon-ro climbing north from the station,
// Gyedong-gil to the east, Bukchon-ro 5na-gil running west down the stone
// stairs to Samcheong-dong, and the hanok alleys of Gahoe-dong (Bukchon-ro
// 11-gil) on the hill, with a rooftop view at the top. Shops are on the lower
// streets; the alleys up the hill are homes (the Quiet Zone).
//
//   node scripts/build-bukchon.mjs
//
// Coordinates are metres: x east, z south. (0, 0) is on Yulgok-ro's centre
// line in front of Anguk Station (the district's anchor in region.json).
// Buildings with "hanok": 1 are drawn as hanok (core/hanok.js), not boxes.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BUKCHON } from '../src/data/bukchon.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/regions/seongsu/districts/bukchon.json');

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const roads = [
  { k: 'primary', w: 16, p: [[60, 0], [310, 0]], n: N('율곡로', 'Yulgok-ro', '栗谷路', '栗谷路') },
  { k: 'secondary', w: 10, p: [[24, -8], [24, -130], [94, -200], [94, -342]], n: N('북촌로', 'Bukchon-ro', '北村路', '北村路') },
  { k: 'tertiary', w: 8, p: [[244, -8], [244, -332]], n: N('계동길', 'Gyedong-gil', '桂洞キル', '桂洞街') },
  { k: 'tertiary', w: 7, p: [[24, -72], [244, -72]], n: N('북촌로5길', 'Bukchon-ro 5-gil', '北村路5ギル', '北村路5街') },
  { k: 'walk', w: 4, p: [[28, -39], [240, -39]] }, // the back lane between the two shop rows
  // West down the stone stairs to Samcheong-ro (Gyeongbokgung's east side).
  { k: 'walk', w: 5, p: [[-72, -188], [82, -188]], n: N('북촌로5나길', 'Bukchon-ro 5na-gil', '北村路5ナギル', '北村路5Na街') },
  { k: 'walk', w: 5, p: [[165, -72], [165, -102]] }, // up to the Open House gate
  { k: 'walk', w: 4, p: [[64, -170], [244, -170]] }, // through the homes behind the Open House
  // Samcheong-dong side homes
  { k: 'walk', w: 4, p: [[40, -188], [40, -330]] },
  { k: 'walk', w: 4, p: [[-6, -255], [89, -255]] },
  // Gahoe-dong hanok alleys (the Quiet Zone)
  { k: 'walk', w: 4, p: [[94, -215], [244, -215]], n: N('북촌로11길', 'Bukchon-ro 11-gil', '北村路11ギル', '北村路11街') },
  { k: 'walk', w: 4, p: [[94, -268], [244, -268]] },
  { k: 'walk', w: 4, p: [[134, -215], [134, -324]] },
  { k: 'walk', w: 4, p: [[184, -215], [184, -324]] },
  { k: 'walk', w: 4, p: [[94, -324], [214, -324]] },
  // Wonseo-dong side (east of Gyedong-gil): the craft alley, and the lane
  // to the spot that looks over at Changdeokgung.
  { k: 'walk', w: 4, p: [[244, -150], [302, -150]] },
  { k: 'walk', w: 4, p: [[244, -250], [302, -250]], n: N('원서동 공방길', 'Wonseo-dong Craft Alley', '苑西洞 工房通り', '苑西洞工坊街') },
];

const areas = [
  { k: 'plaza', p: rect(118, -327, 202, -350) }, // the rooftop view terrace
  { k: 'plaza', p: rect(150, -104, 180, -140) }, // the Open House courtyard (madang)
  { k: 'plaza', p: rect(292, -142, 306, -158) }, // the Changdeokgung viewpoint
];

// Shop rows (hanok fronts), listed so stores.json can stand in front of them.
const buildings = [];
const add = (p, extra) => buildings.push({ h: 6, hanok: 1, p, ...extra });
for (let x = 31; x + 22 <= 240; x += 24) add(rect(x, -45, x + 22, -64)); // row B on 5-gil (south side)
for (let x = 31; x + 22 <= 142; x += 24) add(rect(x, -79, x + 22, -98)); // row C on 5-gil (north side)
for (let x = 192; x + 22 <= 240; x += 24) add(rect(x, -79, x + 22, -98));
for (let z = -16; z - 22 >= -130; z -= 24) add(rect(-8, z, 17, z - 22)); // west of Bukchon-ro

// Gyedong-gil's east side: more shop hanok (bigger, on the street).
for (let z = -16; z - 18 >= -138; z -= 21) add(rect(251, z, 300, z - 18), { fr: [-1, 0] });
for (let z = -160; z - 18 >= -238; z -= 21) add(rect(251, z, 300, z - 18), { fr: [-1, 0] });

// Everything else is homes: a grid of small hanok, kept off the streets and
// out of the Open House compound.
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
      // the rectangle's distance to the segment: check corners, mid points and centre
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1], [x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2], [(x0 + x1) / 2, (z0 + z1) / 2]]) {
        if (segDist(x, z, r.p[i - 1], r.p[i]) < keep) return false;
      }
      // and a road crossing right through it
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
const inTerrace = (x0, z0, x1, z1) => x1 > 116 && x0 < 204 && z1 < -325;
const D = 11, GAP = 1.2;
for (let iz = 0, z = -100; z - D >= -350; iz++, z -= D + GAP) {
  for (let ix = 0, x = -8; x + 12 <= 306; ix++) {
    const W = 12 + ((ix * 7 + iz * 3) % 4); // 12-15 m wide: not all the same
    const x0 = x, x1 = Math.min(x + W, 306), z0 = z, z1 = z - D;
    x += W + GAP;
    if (x0 > 247 && z0 > -150) continue; // (the modern buildings)
    if (!clearOfRoads(x0, z0, x1, z1) || overlaps(x0, z0, x1, z1) || inOpen(x0, z0, x1, z1) || inTerrace(x0, z0, x1, z1)) continue;
    const r = Math.round;
    add(rect(r(x0 * 10) / 10, r(z0 * 10) / 10, r(x1 * 10) / 10, r(z1 * 10) / 10), { h: 5 });
  }
}

// Which way each hanok faces: towards its nearest street (f, a unit step on
// the map), and how high it stands on its stone terrace up the hill (lv, m):
// Bukchon climbs north from Anguk Station.
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
  if (b.h < 6) b.lv = Math.round(Math.max(0, Math.min(1, (-cz - 120) / 210)) * 12) / 10;
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
  { p: rect(158.5, -346.5, 161.5, -349.5) }, // the terrace's coin telescope
];

// Bukchon is a walled village you enter through a gate: from the street you
// see its stone wall and gates, and the village appears once you are inside
// (core/enclosure.js; data/bukchon.js "area"). Gates: the main one on
// Bukchon-ro by Anguk Station, one on Gyedong-gil, and the west gate down the
// stone stairs to Samcheong-ro.
const [AX0, AZ0, AX1, AZ1] = BUKCHON.area; // x0, z0 (south), x1, z1 (north)
const GATES = BUKCHON.gates;
const wallMarks = [];
const wallRun = (fixed, from, to, alongX) => { // a straight run with gaps for the gates on it
  const cuts = GATES.filter((g) => (alongX ? g.at[1] === fixed : g.at[0] === fixed)).map((g) => { const c = alongX ? g.at[0] : g.at[1]; return [c - g.w / 2, c + g.w / 2]; }).sort((a, b) => a[0] - b[0]);
  let a = Math.min(from, to);
  const end = Math.max(from, to);
  for (const [c0, c1] of [...cuts, [end, end]]) {
    if (c0 - a > 0.5) {
      const mid = (a + c0) / 2, len = c0 - a;
      wallMarks.push(alongX ? { type: 'hanokwall', x: mid, z: fixed, len, ry: 0 } : { type: 'hanokwall', x: fixed, z: mid, len, ry: Math.PI / 2 });
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
  ...wallMarks,
  ...GATES.map((g) => ({ type: 'bukchongate', x: g.at[0], z: g.at[1], ry: g.ry || 0, w: g.w, main: !!g.main })),
  { type: 'openhouse', x: (ox0 + ox1) / 2, z: (oz0 + oz1) / 2, w: ox1 - ox0, d: oz0 - oz1 },
  { type: 'terrace', x: 160, z: -340 },
  ...[[98, -210, -Math.PI / 2], [240, -210, Math.PI / 2], [98, -263, -Math.PI / 2]].map(([x, z, ry]) => ({ type: 'sign', x, z, ry, title: QUIET.title, text: QUIET.text })),
  { type: 'stonestairs', x: -40, z: -188, len: 30, ry: 0 },
  { type: 'farpalace', x: 350, z: -150 }, // Changdeokgung, seen from the viewpoint (not walkable yet)
];

const pois = [
  { kind: 'landmark', x: 160, z: -268, name: N('북촌한옥마을', 'Bukchon Hanok Village', '北村韓屋村', '北村韩屋村') },
  { kind: 'landmark', x: 165, z: -122, name: N('북촌 열린 한옥', 'Bukchon Open House', '北村 オープンハウス', '北村开放韩屋') },
  { kind: 'landmark', x: 160, z: -338, name: N('기와지붕 전망대', 'Rooftop View', '瓦屋根の展望台', '瓦顶观景台') },
  { kind: 'landmark', x: -40, z: -188, name: N('삼청동 돌계단길', 'Samcheong-dong Stone Stairs', '三清洞 石段の道', '三清洞石阶路') },
];

const map = {
  meta: {
    district: 'bukchon',
    // For the overlap check: the lane down to Samcheong-ro reaches into
    // Gyeongbokgung on purpose (scripts/place-districts.mjs).
    parts: [{ why: 'the village, Anguk Station to the rooftop view', box: [-10, -352, 310, 0] }],
    enclosure: { why: 'inside the village wall: the hanok are drawn once you walk in through a gate (core/enclosure.js)', box: BUKCHON.area },
    source: 'hand-made (game map, not to scale; loosely after Bukchon, Jongno-gu, street lines from OpenStreetMap © OpenStreetMap contributors, ODbL). Built by scripts/build-bukchon.mjs',
  },
  roads, buildings, rail: [], areas, blockers, pois, landmarks,
};
await writeFile(out, JSON.stringify(map, null, 1) + '\n');
console.log(`bukchon.json: ${roads.length} roads, ${buildings.length} buildings (${buildings.filter((b) => b.hanok).length} hanok)`);
