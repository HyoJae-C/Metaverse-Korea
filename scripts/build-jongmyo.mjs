#!/usr/bin/env node
// Builds the Jongmyo district map (public/regions/another-seoul/districts/jongmyo.json)
// from the hand-made layout in src/data/jongmyo.js.
//
// Jongmyo Shrine and Seosunra-gil, Jongno-gu, loosely after the real streets
// (OpenStreetMap, © OpenStreetMap contributors): Jongno along the south, the
// shrine's main gate (Oedaemun) on it behind Jongmyo Square, the walled
// shrine in the woods with Jeongjeon and Yeongnyeongjeon in their yards, and
// Seosunra-gil, the lane along the west stone wall, with a row of hanok
// shops facing the wall. Squeezed into the room between Jongno and Yulgok-ro
// (the real shrine is much bigger than its 1/4 share).
//
//   node scripts/build-jongmyo.mjs
//
// Coordinates are metres: x east, z south. (0, 0) is the middle of Oedaemun
// (the district's anchor in region.json). Buildings with "hanok": 1 are drawn
// as hanok (core/hanok.js).

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JONGMYO } from '../src/data/jongmyo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/regions/another-seoul/districts/jongmyo.json');
const storesFile = path.join(root, 'public/regions/another-seoul/stores.json');
const regionFile = path.join(root, 'public/regions/another-seoul/region.json');

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const [WX0, WZ0, WX1, WZ1] = JONGMYO.wall; // x0, z0 (south), x1, z1 (north)
const J = JONGMYO.jongno, LANE = JONGMYO.lane;

const roads = [
  { k: 'secondary', w: 12, p: [[-120, J], [86, J]], n: N('종로', 'Jongno', '鍾路', '钟路') },
  { k: 'tertiary', w: 6, p: [[LANE, J - 6], [LANE, -104]], n: N('서순라길', 'Seosunra-gil', '西巡邏キル', '西巡逻路') },
  // An alley west from Seosunra-gil to the Sejong-ro side street (Ikseon-dong's way).
  { k: 'walk', w: 4, p: [[-176, -46], [LANE - 3, -46]] },
];

// Seosunra-gil's shops: one row of hanok facing the wall (east), the lots
// listed so stores.json can stand in front of them. Then small hanok homes
// behind them, either side of the alley.
const SHOP_X = [-80, -67]; // the row's back and front (x)
const LOTS = [[12, -1], [-4, -17], [-20, -33], [-49, -62], [-65, -78], [-81, -93]]; // z south..north (the alley passes between 3 and 4)
const SHOPS = ['info-jongmyo', 'sunra-silver', 'sunra-jumak', 'doldam-cafe', 'yakgwa-dang', 'jongno-goldsmith'];
const buildings = [];
LOTS.forEach(([a, b]) => buildings.push({ h: 6, hanok: 1, fr: [1, 0], p: rect(SHOP_X[0], a, SHOP_X[1], b) }));
for (const [x0, x1] of [[-117, -101], [-98, -83]]) {
  for (const [a, b] of [[12, 1], [-2, -13], [-16, -27], [-30, -42], [-50, -62], [-65, -77], [-80, -92]]) {
    buildings.push({ h: 5, hanok: 1, fr: b === -42 ? [0, -1] : [0, 1], p: rect(x0, a, x1, b) }); // the pair by the alley face it
  }
}

const areas = [
  { k: 'park', p: rect(WX0, WZ0, WX1, WZ1) }, // the shrine's woods
  { k: 'plaza', p: rect(WX0, J - 6, WX1, WZ0) }, // Jongmyo Square, between Jongno and the gate
  { k: 'sand', p: rect(...JONGMYO.jeongjeon.yard) }, // the yards: fine gravel
  { k: 'sand', p: rect(...JONGMYO.yeongnyeongjeon.yard) },
  { k: 'water', p: rect(...JONGMYO.pond) },
];

// Walls: the outer stone wall (a gap for Oedaemun) and each hall's yard wall
// (a gap for its south gate). Blockers are 1 m thick along each run.
const blockers = [];
const landmarks = [];
const wallLine = (pts, h) => {
  landmarks.push({ type: 'wall', p: pts, h });
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    blockers.push({ p: ax === bx ? rect(ax - 0.6, Math.min(az, bz), ax + 0.6, Math.max(az, bz)) : rect(Math.min(ax, bx), az - 0.6, Math.max(ax, bx), az + 0.6) });
  }
};
const GW = JONGMYO.gate.w / 2;
wallLine([[-GW, WZ0], [WX0, WZ0], [WX0, WZ1], [WX1, WZ1], [WX1, WZ0], [GW, WZ0]], 3.4);
for (const yard of [JONGMYO.jeongjeon, JONGMYO.yeongnyeongjeon]) {
  const [x0, z0, x1, z1] = yard.yard, gx = yard.gate[0];
  wallLine([[gx - 2.5, z0], [x0, z0], [x0, z1], [x1, z1], [x1, z0], [gx + 2.5, z0]], 2.4);
}
// The halls stand on a stone base; the pond is water.
blockers.push({ p: rect(...JONGMYO.jeongjeon.hall) }, { p: rect(...JONGMYO.yeongnyeongjeon.hall) }, { p: rect(...JONGMYO.pond) });
// Gate posts and the janggi tables (with their stools).
for (const s of [-1, 1]) blockers.push({ p: rect(s * GW - 0.7, -1.2, s * GW + 0.7, 1.2) });
for (const { at: [x, z] } of JONGMYO.janggi) blockers.push({ p: rect(x - 0.7, z - 0.7, x + 0.7, z + 0.7) });

const cx = (b) => (b[0] + b[2]) / 2, cz = (b) => (b[1] + b[3]) / 2;
const jj = JONGMYO.jeongjeon, yn = JONGMYO.yeongnyeongjeon;
landmarks.push(
  { type: 'jongmyogate', x: 0, z: 0, w: JONGMYO.gate.w },
  { type: 'jongmyogate', x: jj.gate[0], z: jj.gate[1], w: 5, small: true }, // Namsinmun
  { type: 'jongmyogate', x: yn.gate[0], z: yn.gate[1], w: 5, small: true },
  { type: 'shrinehall', x: cx(jj.hall), z: cz(jj.hall), w: jj.hall[2] - jj.hall[0], d: jj.hall[1] - jj.hall[3], bays: 19, name: '正殿' },
  { type: 'shrinehall', x: cx(yn.hall), z: cz(yn.hall), w: yn.hall[2] - yn.hall[0], d: yn.hall[1] - yn.hall[3], bays: 16, mid: 4, name: '永寧殿' },
  { type: 'woldae', x: cx(jj.woldae), z: cz(jj.woldae), w: jj.woldae[2] - jj.woldae[0], d: jj.woldae[1] - jj.woldae[3] },
  { type: 'woldae', x: cx(yn.woldae), z: cz(yn.woldae), w: yn.woldae[2] - yn.woldae[0], d: yn.woldae[1] - yn.woldae[3] },
  { type: 'samdo', x: 0, z: 0, segs: JONGMYO.samdo, w: JONGMYO.samdoW, mid: JONGMYO.sindoW },
  { type: 'squarepond', x: cx(JONGMYO.pond), z: cz(JONGMYO.pond), w: JONGMYO.pond[2] - JONGMYO.pond[0], d: JONGMYO.pond[1] - JONGMYO.pond[3] },
  { type: 'jeryeband', x: (JONGMYO.rite.band.x0 + JONGMYO.rite.band.x1) / 2, z: JONGMYO.rite.band.z, w: JONGMYO.rite.band.x1 - JONGMYO.rite.band.x0 },
  ...JONGMYO.janggi.map(({ at: [x, z] }) => ({ type: 'janggitable', x, z })),
  // Lanterns along the wall on Seosunra-gil.
  { type: 'walllamps', x: LANE + 4.2, z: -46, len: 108, gap: 12 },
);

// Trees: the shrine's woods (kept off the paths, yards and pond) plus a row
// on Jongmyo Square, so the treetops over the wall show from the street.
const seg = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};
const inR = (x, z, [ax, az, bx, bz], m = 0) => x > Math.min(ax, bx) - m && x < Math.max(ax, bx) + m && z > Math.min(az, bz) - m && z < Math.max(az, bz) + m;
const trees = [];
for (let z = -5; z > WZ1 + 3; z -= 6.5) {
  for (let x = WX0 + 3.5; x < WX1 - 3; x += 6.5) {
    const jx = x + (((x * 7 + z * 13) % 5) + 5) % 5 * 0.4 - 0.8, jz = z + (((x * 3 + z * 11) % 5) + 5) % 5 * 0.4 - 0.8;
    if (inR(jx, jz, jj.yard, 2.5) || inR(jx, jz, yn.yard, 2.5) || inR(jx, jz, JONGMYO.pond, 3)) continue;
    if (JONGMYO.samdo.some(([a, b]) => seg(jx, jz, a, b) < 4.5)) continue;
    if (Math.hypot(jx - JONGMYO.guide.at[0], jz - JONGMYO.guide.at[1]) < 4 || Math.abs(jx) < 7 && jz > -8) continue;
    trees.push([Math.round(jx * 10) / 10, Math.round(jz * 10) / 10]);
  }
}
for (let x = WX0 + 4; x < WX1 - 2; x += 9) if (Math.abs(x) > 8 && !JONGMYO.janggi.some(({ at }) => Math.abs(at[0] - x) < 3)) trees.push([x, 3]);
landmarks.push({ type: 'shrinetrees', x: 0, z: 0, spots: trees });

// Signs: Seosunra-gil at its south end, Jongmyo by the gate.
const sl = JONGMYO.laneSign;
landmarks.push(
  { type: 'sign', x: sl.at[0], z: sl.at[1], ry: sl.ry, title: sl.title, text: sl.text },
  { type: 'sign', x: 8, z: 6, ry: 0, title: JONGMYO.welcome.title, text: { en: JONGMYO.welcome.text.en + ' ' + JONGMYO.welcome.rules.en, ko: JONGMYO.welcome.text.ko + ' ' + JONGMYO.welcome.rules.ko, ja: JONGMYO.welcome.text.ja + ' ' + JONGMYO.welcome.rules.ja, zh: JONGMYO.welcome.text.zh + ' ' + JONGMYO.welcome.rules.zh } },
);

const pois = [
  { kind: 'landmark', x: 20, z: -30, name: N('종묘', 'Jongmyo Shrine', '宗廟', '宗庙') },
  { kind: 'landmark', x: cx(jj.hall), z: cz(jj.hall) + 4, name: N('정전', 'Jeongjeon', '正殿', '正殿') },
  { kind: 'landmark', x: cx(yn.hall), z: cz(yn.hall) + 4, name: N('영녕전', 'Yeongnyeongjeon', '永寧殿', '永宁殿') },
  { kind: 'landmark', x: 20, z: 6, name: N('종묘광장', 'Jongmyo Square', '宗廟広場', '宗庙广场') },
  { kind: 'landmark', x: LANE, z: -70, name: N('서순라길', 'Seosunra-gil', '西巡邏キル', '西巡逻路') },
];

const map = {
  meta: {
    district: 'jongmyo',
    // For the overlap check: the alley west reaches the Sejong-ro side
    // street, inside Gyeongbokgung's corner, on purpose.
    parts: [{ why: 'Seosunra-gil, its shops and homes, Jongmyo Square and the shrine', box: [-118, -102, 86, J + 6] }],
    enclosure: { why: 'inside the shrine wall: the halls, the stone path, the woods are drawn once you walk in through Oedaemun (core/enclosure.js)', box: [WX0, WZ0, WX1, WZ1] },
    source: 'hand-made (game map, not to scale; loosely after Jongmyo and Seosunra-gil, Jongno-gu, street lines from OpenStreetMap © OpenStreetMap contributors, ODbL). Built by scripts/build-jongmyo.mjs',
  },
  roads, buildings, rail: [], areas, blockers, pois, landmarks,
};
await writeFile(out, JSON.stringify(map, null, 1) + '\n');

// Stand each shop in front of its lot (world metres: the district offset
// from region.json).
const region = JSON.parse(await readFile(regionFile, 'utf8'));
const off = region.districts.find((d) => d.id === 'jongmyo')?.offset;
if (off) {
  // stores.json is hand-formatted, so only the "at" of each shop is
  // rewritten in the text (as scripts/build-mapo.mjs does).
  let stores = await readFile(storesFile, 'utf8');
  let moved = 0;
  SHOPS.forEach((id, i) => {
    const at = stores.indexOf(`"id": "${id}"`);
    if (at < 0) { console.log(`${id}: not in stores.json`); return; }
    let end = stores.indexOf('\n    {', at);
    if (end < 0) end = stores.length;
    const [a, b] = LOTS[i];
    const x = SHOP_X[1] + 2 + off[0], z = Math.round(((a + b) / 2) * 10) / 10 + off[1];
    stores = stores.slice(0, at) + stores.slice(at, end).replace(/"at": \[[^\]]*\]/, `"at": [${x}, ${z}]`) + stores.slice(end);
    moved++;
  });
  await writeFile(storesFile, stores);
  console.log(`stores.json: ${moved} Seosunra-gil shops placed`);
}
console.log(`jongmyo.json: ${roads.length} roads, ${buildings.length} buildings, ${trees.length} trees`);
