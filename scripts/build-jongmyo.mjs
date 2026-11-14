#!/usr/bin/env node
// Builds the Jongmyo district map (public/regions/another-seoul/districts/jongmyo.json)
// from the hand-made layout in src/data/jongmyo.js.
//
// Jongmyo Shrine, Jongno-gu, loosely after the real streets
// (OpenStreetMap, © OpenStreetMap contributors): Jongno along the south, the
// shrine's main gate (Oedaemun) on it behind Jongmyo Square, the walled
// shrine in the woods with Jeongjeon and Yeongnyeongjeon in their yards, and
// a grove outside the west wall with the Information Center's hanok on
// Jongno. Seosunra-gil (the lane along the west wall, with hanok shops) was
// taken out for now: it felt too much like Bukchon. To bring it back, see
// commit e4ebd13 (this script, data/jongmyo.js, stores.json). Squeezed into the room between Jongno and Yulgok-ro
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
const J = JONGMYO.jongno;

const roads = [
  { k: 'secondary', w: 12, p: [[-120, J], [86, J]], n: N('종로', 'Jongno', '鍾路', '钟路') },
];

// The Information Center: one hanok at the west corner, facing Jongno (its
// door on the pavement, so stores.json stands it there).
const INFO = { id: 'info-jongmyo', box: [-78, 14, -66, 3] }; // x0, z0 (south, the front), x1, z1
// Jongno Geumeunbang, a gold and silver workshop in a plain three-storey
// block west of it: the real jewellery quarter (Jongno 3-ga, Bongik-dong)
// starts right here. Not a hanok, so it doesn't feel like Bukchon.
const JEWEL = { id: 'jongno-geumeun', box: [-97, 14, -85, 3] };
const buildings = [{ h: 6, hanok: 1, fr: [0, 1], p: rect(...INFO.box) }, { h: 9, fr: [0, 1], p: rect(...JEWEL.box) }];
// Outside the west wall: a grove from the Information Center to the north
// end, so the shrine's woods spill over the wall (no lane here for now).
const GROVE = [-84, 1, WX0 - 2, WZ1];

const areas = [
  { k: 'park', p: rect(WX0, WZ0, WX1, WZ1) }, // the shrine's woods
  { k: 'park', p: rect(GROVE[0], GROVE[1], WX0, GROVE[3]) }, // the grove outside the west wall
  { k: 'plaza', p: rect(WX0, J - 6, WX1, WZ0) }, // Jongmyo Square, between Jongno and the gate
  { k: 'sand', p: rect(...JONGMYO.jeongjeon.yard) }, // the yards: fine gravel
  { k: 'sand', p: rect(...JONGMYO.yeongnyeongjeon.yard) },
  { k: 'water', p: rect(...JONGMYO.pond) },
];

// Walls: the outer stone wall (a gap for Oedaemun) and each hall's yard wall
// (a gap for its south gate). Blockers are 1 m thick along each run.
const blockers = [];
const landmarks = [];
const wallLine = (pts, h, inner) => {
  landmarks.push({ type: 'wall', p: pts, h, ...(inner ? { inner: 1 } : {}) });
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    blockers.push({ p: ax === bx ? rect(ax - 0.6, Math.min(az, bz), ax + 0.6, Math.max(az, bz)) : rect(Math.min(ax, bx), az - 0.6, Math.max(ax, bx), az + 0.6) });
  }
};
const GW = JONGMYO.gate.w / 2;
wallLine([[-GW, WZ0], [WX0, WZ0], [WX0, WZ1], [WX1, WZ1], [WX1, WZ0], [GW, WZ0]], 3.4);
for (const yard of [JONGMYO.jeongjeon, JONGMYO.yeongnyeongjeon]) {
  const [x0, z0, x1, z1] = yard.yard, gx = yard.gate[0];
  wallLine([[gx - 2.5, z0], [x0, z0], [x0, z1], [x1, z1], [x1, z0], [gx + 2.5, z0]], 2.4, true);
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
  // Inside the wall ("inner": built on the first visit).
  { type: 'jongmyogate', x: jj.gate[0], z: jj.gate[1], w: 5, small: true, inner: 1 }, // Namsinmun
  { type: 'jongmyogate', x: yn.gate[0], z: yn.gate[1], w: 5, small: true, inner: 1 },
  { type: 'shrinehall', x: cx(jj.hall), z: cz(jj.hall), w: jj.hall[2] - jj.hall[0], d: jj.hall[1] - jj.hall[3], bays: 19, name: '正殿', inner: 1 },
  { type: 'shrinehall', x: cx(yn.hall), z: cz(yn.hall), w: yn.hall[2] - yn.hall[0], d: yn.hall[1] - yn.hall[3], bays: 16, mid: 4, name: '永寧殿', inner: 1 },
  { type: 'woldae', x: cx(jj.woldae), z: cz(jj.woldae), w: jj.woldae[2] - jj.woldae[0], d: jj.woldae[1] - jj.woldae[3], inner: 1 },
  { type: 'woldae', x: cx(yn.woldae), z: cz(yn.woldae), w: yn.woldae[2] - yn.woldae[0], d: yn.woldae[1] - yn.woldae[3], inner: 1 },
  { type: 'samdo', x: 0, z: 0, segs: JONGMYO.samdo, w: JONGMYO.samdoW, mid: JONGMYO.sindoW, inner: 1 },
  { type: 'squarepond', x: cx(JONGMYO.pond), z: cz(JONGMYO.pond), w: JONGMYO.pond[2] - JONGMYO.pond[0], d: JONGMYO.pond[1] - JONGMYO.pond[3], inner: 1 },
  { type: 'jeryeband', x: (JONGMYO.rite.band.x0 + JONGMYO.rite.band.x1) / 2, z: JONGMYO.rite.band.z, w: JONGMYO.rite.band.x1 - JONGMYO.rite.band.x0, inner: 1 },
  ...JONGMYO.janggi.map(({ at: [x, z] }) => ({ type: 'janggitable', x, z })),
);

// Trees: the shrine's woods (kept off the paths, yards and pond) plus a row
// on Jongmyo Square, so the treetops over the wall show from the street.
const seg = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};
const inR = (x, z, [ax, az, bx, bz], m = 0) => x > Math.min(ax, bx) - m && x < Math.max(ax, bx) + m && z > Math.min(az, bz) - m && z < Math.max(az, bz) + m;
const trees = []; // inside the wall
for (let z = -5; z > WZ1 + 3; z -= 6.5) {
  for (let x = WX0 + 3.5; x < WX1 - 3; x += 6.5) {
    const jx = x + (((x * 7 + z * 13) % 5) + 5) % 5 * 0.4 - 0.8, jz = z + (((x * 3 + z * 11) % 5) + 5) % 5 * 0.4 - 0.8;
    if (inR(jx, jz, jj.yard, 2.5) || inR(jx, jz, yn.yard, 2.5) || inR(jx, jz, JONGMYO.pond, 3)) continue;
    if (JONGMYO.samdo.some(([a, b]) => seg(jx, jz, a, b) < 4.5)) continue;
    if (Math.hypot(jx - JONGMYO.guide.at[0], jz - JONGMYO.guide.at[1]) < 4 || Math.abs(jx) < 7 && jz > -8) continue;
    trees.push([Math.round(jx * 10) / 10, Math.round(jz * 10) / 10]);
  }
}
const outTrees = []; // the grove and the square
for (let z = GROVE[1] - 3; z > GROVE[3] + 3; z -= 7) {
  for (let x = GROVE[0] + 3; x < GROVE[2] - 2; x += 7) {
    const jx = x + (((x * 5 + z * 7) % 5) + 5) % 5 * 0.5 - 1, jz = z + (((x * 11 + z * 3) % 5) + 5) % 5 * 0.5 - 1;
    outTrees.push([Math.round(jx * 10) / 10, Math.round(jz * 10) / 10]);
  }
}
for (let x = WX0 + 4; x < WX1 - 2; x += 9) if (Math.abs(x) > 8 && !JONGMYO.janggi.some(({ at }) => Math.abs(at[0] - x) < 3)) outTrees.push([x, 3]);
landmarks.push({ type: 'shrinetrees', x: 0, z: 0, spots: trees, inner: 1 }, { type: 'shrinetrees', x: 0, z: 0, spots: outTrees });

// Signs: Jongmyo by the gate, the music and dances below Jeongjeon's terrace.
const rs = JONGMYO.riteSign;
landmarks.push(
  { type: 'sign', x: rs.at[0], z: rs.at[1], ry: rs.ry, title: rs.title, text: rs.text, inner: 1 },
  { type: 'sign', x: 8, z: 6, ry: 0, title: JONGMYO.welcome.title, text: { en: JONGMYO.welcome.text.en + ' ' + JONGMYO.welcome.rules.en, ko: JONGMYO.welcome.text.ko + ' ' + JONGMYO.welcome.rules.ko, ja: JONGMYO.welcome.text.ja + ' ' + JONGMYO.welcome.rules.ja, zh: JONGMYO.welcome.text.zh + ' ' + JONGMYO.welcome.rules.zh } },
);

const pois = [
  { kind: 'landmark', x: 20, z: -30, name: N('종묘', 'Jongmyo Shrine', '宗廟', '宗庙') },
  { kind: 'landmark', x: cx(jj.hall), z: cz(jj.hall) + 4, name: N('정전', 'Jeongjeon', '正殿', '正殿') },
  { kind: 'landmark', x: cx(yn.hall), z: cz(yn.hall) + 4, name: N('영녕전', 'Yeongnyeongjeon', '永寧殿', '永宁殿') },
  { kind: 'landmark', x: 20, z: 6, name: N('종묘광장', 'Jongmyo Square', '宗廟広場', '宗庙广场') },
];

const map = {
  meta: {
    district: 'jongmyo',
    // For the overlap check.
    parts: [{ why: 'the Information Center, the gold and silver workshop and the grove, Jongmyo Square and the shrine', box: [JEWEL.box[0] - 2, WZ1 - 2, 86, J + 6] }],
    enclosure: { why: 'inside the shrine wall: the halls, the stone path, the woods are drawn once you walk in through Oedaemun (core/enclosure.js)', box: [WX0, WZ0, WX1, WZ1] },
    source: 'hand-made (game map, not to scale; loosely after Jongmyo, Jongno-gu, street lines from OpenStreetMap © OpenStreetMap contributors, ODbL). Built by scripts/build-jongmyo.mjs',
  },
  roads, buildings, rail: [], areas, blockers, pois, landmarks,
};
await writeFile(out, JSON.stringify(map, null, 1) + '\n');

// Stand the Information Center at its door on Jongno (world metres: the
// district offset from region.json).
const region = JSON.parse(await readFile(regionFile, 'utf8'));
const off = region.districts.find((d) => d.id === 'jongmyo')?.offset;
if (off) {
  // stores.json is hand-formatted, so only the "at" of each shop is
  // rewritten in the text (as scripts/build-mapo.mjs does).
  let stores = await readFile(storesFile, 'utf8');
  for (const B of [INFO, JEWEL]) {
    const at = stores.indexOf(`"id": "${B.id}"`);
    if (at < 0) { console.log(`${B.id}: not in stores.json`); continue; }
    let end = stores.indexOf('\n    {', at);
    if (end < 0) end = stores.length;
    const x = (B.box[0] + B.box[2]) / 2 + off[0], z = B.box[1] + 2 + off[1];
    stores = stores.slice(0, at) + stores.slice(at, end).replace(/"at": \[[^\]]*\]/, `"at": [${x}, ${z}]`) + stores.slice(end);
    console.log(`stores.json: ${B.id} placed`);
  }
  await writeFile(storesFile, stores);
}
console.log(`jongmyo.json: ${roads.length} roads, ${buildings.length} buildings, ${trees.length + outTrees.length} trees`);
