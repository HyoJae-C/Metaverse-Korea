#!/usr/bin/env node
// Builds the Banpo-Jamwon Han River Park district (districts/banpo-jamwon.json)
// on the south bank of the Han River in Seocho-gu, and puts its places on it.
//
// Banpo and Jamwon Han River Parks sit side by side on the south bank, so the
// game joins them into one riverside park halfway between the two. It is a
// long strip along the bank: the river to the north-west, a lawn on the bank
// with benches facing the water, the Han River path, and a park with trees.
// Jamsu Bridge (the low deck under Banpo Bridge) crosses the river from the
// north bank, towards Itaewon.
//
// Here the Han runs from south-west to north-east, so the strip is drawn in
// its own frame: u along the bank (towards Jamwon, north-east), v across it
// (negative towards the river). Game map, not to scale (see docs/WORLD.md).
//
//   node scripts/build-banpo.mjs   writes the map and sets the "at" of the
//                                  places in SPOTS in stores.json (world
//                                  metres, using the district's offset)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// The bank's direction: from Banpo towards Jamwon, as on the game's Seoul
// grid (about 42° north of east).
const ANGLE = Math.atan2(0.672, 0.74);
const U = [Math.cos(ANGLE), -Math.sin(ANGLE)]; // along the bank (x east, z south)
const V = [Math.sin(ANGLE), Math.cos(ANGLE)]; // away from the river
export const at = (u, v) => [r1(u * U[0] + v * V[0]), r1(u * U[1] + v * V[1])];
const rect = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
// Rotations (ry) for things that face the river, or face away from it.
const FACE_RIVER = Math.atan2(-V[0], -V[1]);
const ALONG_V = Math.atan2(V[0], V[1]);

const HALF = 180; // the strip runs u -180..180
export const BANK = -30; // where the lawn ends and the river starts (v)
const FAR = -150; // the river's far edge (v): the north bank is beyond
const PATH = -18; // the Han River path (v)
const BRIDGE = -100; // where Jamsu Bridge lands (u)
const BRIDGE_W = 14;
// The Han River park (core/park.js) is open to the street here: no park
// house, you walk straight onto its lawn. Its own frame is this one moved
// so its bank (z = -4) sits on BANK: x = u, z = v - (BANK + 4). It covers
// u -26..26 and v BANK..v1 (52 x 18 m of land, plus the pier and the boats
// on the water). stores.json "open" holds the same origin in world metres.
export const OPEN_PARK = { half: 26, v0: BANK + 4, v1: BANK + 18 };

function build() {
  const buildings = [
    // The Information Center, in the park across the path.
    { h: 5, p: rect(40, -12, 52, -3) },
    // Two small park buildings further along.
    { h: 3, p: rect(110, -12, 118, -6) },
    { h: 3, p: rect(-150, -12, -142, -6) },
  ];
  const roads = [
    { k: 'walk', w: 5, p: [at(-HALF, PATH), at(HALF, PATH)], n: name('Han River path', '한강 산책로', '漢江の散歩道', '汉江步道') },
    { k: 'primary', w: BRIDGE_W, p: [at(BRIDGE, FAR - 6), at(BRIDGE, PATH)], n: name('Jamsu Bridge', '잠수교', '潜水橋', '潜水桥') },
    { k: 'walk', w: 4, p: [at(-60, PATH), at(-60, 30)], n: name('Park lane', '공원 산책길', '公園の小道', '公园小路') },
    { k: 'walk', w: 4, p: [at(80, PATH), at(80, 30)], n: name('Park lane', '공원 산책길', '公園の小道', '公园小路') },
  ];
  const areas = [
    { k: 'grass', p: rect(-HALF, BANK, HALF, PATH - 2.5) },
    // The trees leave room for the open-air park (OPEN_PARK) on the bank.
    { k: 'park', trees: true, p: rect(-HALF, PATH + 3, -OPEN_PARK.half - 1, 34) },
    { k: 'park', trees: true, p: rect(OPEN_PARK.half + 1, PATH + 3, HALF, 34) },
    { k: 'park', trees: true, p: rect(-OPEN_PARK.half - 1, OPEN_PARK.v1 + 1, OPEN_PARK.half + 1, 34) },
    { k: 'water', p: rect(-HALF - 40, FAR, HALF + 40, BANK) },
  ];
  // You can't walk into the river, except over Jamsu Bridge.
  const gap = BRIDGE_W / 2;
  const blockers = [
    { p: rect(-HALF - 40, FAR, BRIDGE - gap, BANK) },
    { p: rect(BRIDGE + gap, FAR, HALF + 40, BANK) },
  ];
  const [bx, bz] = at(BRIDGE, (FAR - 6 + PATH) / 2);
  const landmarks = [
    { type: 'jamsu', x: bx, z: bz, ry: ALONG_V, len: PATH - FAR + 6, w: BRIDGE_W },
    { type: 'arch', ...xz(at(BRIDGE, BANK + 2)), ry: ALONG_V, w: BRIDGE_W + 2, title: 'BANPO-JAMWON HAN RIVER PARK', sub: '반포·잠원 한강공원', color: '#2f6fb0' },
    { type: 'sign', ...xz(at(OPEN_PARK.half + 8, -13)), ry: FACE_RIVER, // (beside the open-air park)
      title: name('Banpo-Jamwon Han River Park', '반포·잠원 한강공원', '盤浦・蚕院漢江公園', '盘浦·蚕院汉江公园'),
      text: {
        en: 'Banpo and Jamwon Han River Parks lie side by side on the south bank of the Han River. Walk across Jamsu Bridge under Banpo Bridge, spread a mat on the grass, or fish from the bank: the manta ray, a legend, only bites here.',
        ko: '반포한강공원과 잠원한강공원은 한강 남쪽 강변에 나란히 있어요. 반포대교 아래 잠수교를 걸어서 건너고, 잔디에 돗자리를 펴거나, 강가에서 낚시를 해 보세요. 전설의 만타가오리는 여기서만 잡혀요.',
        ja: '盤浦漢江公園と蚕院漢江公園は、漢江の南岸に並んでいます。盤浦大橋の下の潜水橋を歩いて渡り、芝生にシートを広げたり、川辺で釣りをしてみましょう。伝説のマンタはここでしか釣れません。',
        zh: '盘浦汉江公园和蚕院汉江公园并排位于汉江南岸。从盘浦大桥下的潜水桥走过江，在草地上铺开野餐垫，或者在江边钓鱼：传说中的蝠鲼只在这里咬钩。',
      } },
  ];
  for (const u of [-165, -135, -70, -40, 30, 60, 90, 130, 160]) landmarks.push({ type: 'bench', ...xz(at(u, -25)), ry: FACE_RIVER });
  const pois = [
    { kind: 'landmark', ...xz(at(0, 10)), name: name('Banpo-Jamwon Han River Park', '반포·잠원 한강공원', '盤浦・蚕院漢江公園', '盘浦·蚕院汉江公园') },
    { kind: 'landmark', ...xz(at(BRIDGE, (FAR + BANK) / 2)), name: name('Jamsu Bridge', '잠수교', '潜水橋', '潜水桥') },
  ];
  return {
    meta: {
      district: 'banpo-jamwon',
      source: 'hand-made (scripts/build-banpo.mjs; game map, not to scale): Banpo and Jamwon Han River Parks, Seocho-gu, joined into one riverside park. The park house, kiosks and market are fictional.',
    },
    roads, buildings, rail: [], areas, blockers, pois, landmarks,
  };
}
function xz([x, z]) { return { x, z }; }

// Where each place's door is, in the district's own metres.
const SPOTS = {
  'banpo-jamwon-hangang': at(0, OPEN_PARK.v1 + 1), // just behind the open-air park's lawn (where a taxi or the map drops you)
  'info-banpo-jamwon': at(46, -14.5),
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const map = build();
  writeFileSync(path.join(R, 'districts', 'banpo-jamwon.json'), JSON.stringify(map) + '\n');
  const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
  const d = region.districts.find((x) => x.id === 'banpo-jamwon');
  if (!d) console.log('banpo-jamwon: not in region.json yet, places not set');
  else {
    // stores.json is hand-formatted, so only the "at" of each place is rewritten.
    let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
    const [ox, oz] = d.offset;
    for (const [sid, [x, z]] of Object.entries(SPOTS)) {
      const i = stores.indexOf(`"id": "${sid}"`);
      if (i < 0) { console.log(`${sid}: not in stores.json`); continue; }
      let end = stores.indexOf('\n    {', i);
      if (end < 0) end = stores.length;
      const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${r1(x + ox)}, ${r1(z + oz)}]`);
      stores = stores.slice(0, i) + part + stores.slice(end);
    }
    writeFileSync(path.join(R, 'stores.json'), stores);
    // The bridge's north end in world metres, for the link road in region.json.
    const north = at(BRIDGE, FAR - 6);
    const [px, pz] = at(0, OPEN_PARK.v0);
    console.log(`open park origin: [${r1(px + ox)}, ${r1(pz + oz)}], ry ${ALONG_V.toFixed(4)}`);
    console.log(`Jamsu Bridge north end: [${r1(north[0] + ox)}, ${r1(north[1] + oz)}]; south end: [${r1(at(BRIDGE, PATH)[0] + ox)}, ${r1(at(BRIDGE, PATH)[1] + oz)}]`);
  }
  console.log(`banpo-jamwon: ${map.buildings.length} buildings`);
}
