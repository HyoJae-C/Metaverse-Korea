#!/usr/bin/env node
// Builds the Banpo-Jamwon Han River Park district (districts/banpo-jamwon.json)
// on the south bank of the Han River in Seocho-gu, and puts its places on it.
//
// Banpo and Jamwon Han River Parks sit side by side on the south bank, so the
// game joins them into one riverside park at the south end of Banpo Bridge.
// The river (region.json water[1], scripts/han-bank.mjs), the bank and the
// bridge are on their real lines at 1/4 (OpenStreetMap): the park runs along
// the real bank from the bay west of the bridge (where Sebitseom floats) east
// to Jamwon's inlet. Jamsu Bridge (the low deck under Banpo Bridge) crosses
// on Banpo Bridge's line from the north bank, where a link road comes down
// Noksapyeong-daero from Itaewon. Only Moonlight Square at the bridge's foot
// is laid out in detail; the rest is a lawn, the river path and trees.
//
// Near the bridge the bank runs straight, at right angles to the bridge, so
// the park there is drawn in the bridge's frame (han-bank.mjs): u along the
// bank from the bridge (towards Jamwon, east), v inland from the bank.
//
//   node scripts/build-banpo.mjs   writes the map, the district's offset
//                                  and anchor, the link road to the bridge,
//                                  and the "at" of the places in SPOTS in
//                                  stores.json (world metres)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toLatLon } from '../src/core/seoul-grid.js';
import { BANPO_FOOT, BANPO_V, fromBanpo, TERRACE, JAMSU_NORTH, JAMSU_W, BANPO_BRIDGE } from './han-bank.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// The district's offset: the bridge's foot on the bank, rounded.
export const OFFSET = BANPO_FOOT.map(Math.round);
const loc = ([x, z]) => [r1(x - OFFSET[0]), r1(z - OFFSET[1])];
export const at = (u, v) => loc(fromBanpo(u, v));
const rect = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
// Rotations (ry) for things that face the river, or face away from it.
const V = BANPO_V;
const FACE_RIVER = Math.atan2(-V[0], -V[1]);
const ALONG_V = Math.atan2(V[0], V[1]);

export const BANK = 0; // the bank's edge at the bridge (v)
const PATH = 12; // the Han River path, metres in from the bank
const BRIDGE = 0; // where Jamsu Bridge lands (u)
const BRIDGE_W = JAMSU_W;

// The bank the lawn and the path follow (world metres, west to east): the
// real bank round the bay west of the bridge (straight, from the terrace's
// back corner), the straight stretch at the bridge, then the real bank on
// to the mouth of Jamwon's inlet.
const BAY = [-1400.6, 1006]; // a real bank point down the bay (OpenStreetMap)
const EAST = [[-1212.8, 867.4], [-1162.8, 820.2]]; // the real bank east of the bridge
const LINE = (() => {
  const J = TERRACE[1], d = [BAY[0] - J[0], BAY[1] - J[1]], L = Math.hypot(...d);
  // where the bay's line meets the bridge's straight bank (v = 0)
  const a = fromBanpo(0, 0), b = fromBanpo(100, 0);
  const den = d[0] * (b[1] - a[1]) - d[1] * (b[0] - a[0]);
  const t = ((a[0] - J[0]) * (b[1] - a[1]) - (a[1] - J[1]) * (b[0] - a[0])) / den;
  const X0 = [r1(J[0] + d[0] * t), r1(J[1] + d[1] * t)];
  const W0 = [r1(J[0] + (d[0] / L) * 70), r1(J[1] + (d[1] / L) * 70)]; // 70 m down the bay from the terrace
  return [W0, X0, ...EAST];
})();
// A line `d` metres inland of LINE (mitred at the bends).
function inland(d) {
  const n = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
  return LINE.map((q, i) => {
    const n0 = i > 0 ? n(LINE[i - 1], q) : null, n1 = i < LINE.length - 1 ? n(q, LINE[i + 1]) : null;
    if (!n0 || !n1) { const m = n0 || n1; return [q[0] + m[0] * d, q[1] + m[1] * d]; }
    const m = [n0[0] + n1[0], n0[1] + n1[1]], k = d / (1 + n0[0] * n1[0] + n0[1] * n1[1]);
    return [q[0] + m[0] * k, q[1] + m[1] * k];
  });
}
// The point s metres along LINE from the bridge's foot (west negative), d
// metres inland.
const S0 = (() => { let s = 0; for (let i = 1; i < 2; i++) s += Math.hypot(LINE[i][0] - LINE[i - 1][0], LINE[i][1] - LINE[i - 1][1]); return s; })()
  + Math.hypot(BANPO_FOOT[0] - LINE[1][0], BANPO_FOOT[1] - LINE[1][1]);
function along(s, d) {
  let left = s + S0;
  for (let i = 1; i < LINE.length; i++) {
    const a = LINE[i - 1], b = LINE[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= L || i === LINE.length - 1) {
      const t = left / L, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      return loc([a[0] + (b[0] - a[0]) * t - uz * d, a[1] + (b[1] - a[1]) * t + ux * d]);
    }
    left -= L;
  }
}
const quad = (s0, s1, d0, d1) => [along(s0, d0), along(s1, d0), along(s1, d1), along(s0, d1)];
const facing = (s) => { // ry facing the river at s along the bank
  const [a, b] = [along(s - 1, 0), along(s + 1, 0)];
  return +Math.atan2(b[1] - a[1], -(b[0] - a[0])).toFixed(4);
};
// The point on polyline p nearest q.
function nearest(p, q) {
  let best = null, bd = Infinity;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / (dx * dx + dz * dz)));
    const c = [a[0] + dx * t, a[1] + dz * t], dd = Math.hypot(c[0] - q[0], c[1] - q[1]);
    if (dd < bd) { bd = dd; best = c; }
  }
  return best.map(r1);
}

// The Han River park, laid straight on the street (game/han-parks.js,
// core/han-park.js builds what the map can't draw). Its own frame: x along
// the bank from Jamsu Bridge (x = u), z inland from the bank's edge (z = v),
// so the river is z < 0. At 1/4, as the real parks are:
//  - Banpo (west of the bridge, downstream): Moonlight Square at the foot of
//    Banpo Bridge, where people sit on the stone steps to watch the Moonlight
//    Rainbow Fountain and the food trucks of the night market park, with the
//    convenience store under the bridge. It stands on a terrace out over the
//    bay where Sebitseom's floating islands are (han-bank.mjs TERRACE).
//  - Jamwon (east, upstream): the fishing pier, the boat dock and the open
//    lawn by the water.
const PX = (x) => x + BRIDGE; // the park's x back to u
const PZ = (z) => z + BANK; // its z back to v
export const PARK = {
  bounds: [-50, -45, 84, 13], // the park (x0, z0, x1, z1): bank to path, and out on its water
  layout: {
    // Moonlight Square: stone paving between the bridge and the river path.
    paving: [[-47, 0.4, -8.4, 9.3, '#cdbfa8'], [8.4, 0.4, 24, 6.2, '#d9c7a6']],
    rail: [-48, 82], railGaps: [[-7.6, 7.6]], // (Jamsu Bridge crosses the bank)
    steps: [{ x: -31, z: 1.8, w: 18, rows: 2 }], // facing the fountain on the bridge
    market: {
      spots: [[-42.6, 8.2, Math.PI], [-39.8, 8.2, Math.PI], [-37, 8.2, Math.PI], [-34.2, 8.2, Math.PI]], // the food trucks, facing the river
      tables: [[-29.4, 6.6], [-25.2, 6.6]],
      board: [-46.4, 6.2, Math.PI / 2],
    },
    kiosk: [-14.6, 7.3, Math.PI], // BANPO 24 under the bridge, facing the square
    tables: [[-20.2, 2.1], [-16.2, 2.1]],
    pier: { x: 16, len: 9 },
    fishBuy: [21, 3.6, 0],
    dock: 31,
    duckWater: { minX: 9, maxX: 60, minZ: -40 },
    fishing: [[-45, 0.75], [11.5, 0.75], [16, -8.2], [44, 0.75]],
    lamps: [[-44, 2.6], [-24, 4.4], [12, 3], [26, 2.6], [40, 2.6], [54, 2.6], [68, 2.6], [80, 2.6]],
    benches: [[48, 3.2], [58, 3.2], [72, 3.2]],
    beds: [[13, 5.4, 3], [45.5, 5.2, 4], [63, 5.2, 4]],
    trees: [[-47.4, 9.2], [52, 7.6], [66, 7.4], [78, 7]],
    bushes: [[-8.9, 8.6], [9.2, 8.4], [36, 7.4], [76, 4.4]],
  },
};
// Where on the street the park's things go.
const park = (x, z) => at(PX(x), PZ(z));

const PATH_LINE = inland(PATH).map(loc);

function build() {
  const buildings = [
    // The Information Center, in the park across the path.
    { h: 5, p: quad(92, 104, 18, 27) },
    // Two small park buildings further along.
    { h: 3, p: quad(128, 136, 18, 24) },
    { h: 3, p: quad(-110, -102, 18, 24) },
  ];
  const north = loc(JAMSU_NORTH), south = at(BRIDGE, PATH);
  const roads = [
    { k: 'walk', w: 5, p: PATH_LINE, n: name('Han River path', '한강 산책로', '漢江の散歩道', '汉江步道') },
    // On Banpo Bridge's line, from the north bank's bike path (han-bank.mjs)
    { k: 'primary', w: BRIDGE_W, p: [north, south], n: name('Jamsu Bridge', '잠수교', '潜水橋', '潜水桥') },
    { k: 'walk', w: 4, p: [nearest(PATH_LINE, along(-90, PATH)), along(-90, 44)], n: name('Park lane', '공원 산책길', '公園の小道', '公园小路') },
    { k: 'walk', w: 4, p: [nearest(PATH_LINE, along(110, PATH)), along(110, 44)], n: name('Park lane', '공원 산책길', '公園の小道', '公园小路') },
  ];
  // The lawn from the bank (with Moonlight Square's terrace) to the path, and
  // the trees beyond it, back to where Olympic-daero runs.
  const bank = [LINE[0], TERRACE[1], TERRACE[0], BANPO_FOOT, ...EAST].map(loc);
  const areas = [
    { k: 'grass', p: [...bank, ...inland(PATH - 2.5).reverse().map(loc)] },
    { k: 'park', trees: true, p: [...inland(PATH + 3).map(loc), ...inland(46).reverse().map(loc)] },
    // Jamwon's open lawn on the bank, for picnic mats (no trees).
    { k: 'grass', lawn: true, p: [park(40, 4.3), park(84, 4.3), park(84, 9.2), park(40, 9.2)] },
  ];
  // (The river is the region's water, scripts/han-bank.mjs: its blocker has
  // a gap for Jamsu Bridge.)
  const blockers = [];
  // Banpo Bridge overhead, the whole bridge on its real line (core/banpo-bridge.js),
  // with no piers in the park at its foot.
  const b0 = loc(BANPO_BRIDGE[0]), rel = ([x, z]) => [r1(x - b0[0]), r1(z - b0[1])];
  const banpo = { type: 'banpobridge', x: b0[0], z: b0[1], pts: BANPO_BRIDGE.map((q) => rel(loc(q))), w: BRIDGE_W + 8, wRamp: BRIDGE_W, top: 9, ramp: [80, 55],
    clear: [[...rel(at(BRIDGE, 6)), 18]] };
  // Dongjak Bridge downstream (west), only to look at for now: the real line
  // of its middle (Line 4's viaduct, OpenStreetMap), 40 m wide at 1/4, with
  // its arches over the river and the subway down the middle.
  const d0 = loc(DONGJAK[0]), drel = ([x, z]) => [r1(x - d0[0]), r1(z - d0[1])];
  const dLen = Math.hypot(DONGJAK[1][0] - DONGJAK[0][0], DONGJAK[1][1] - DONGJAK[0][1]);
  const dongjak = { type: 'banpobridge', name: 'dongjak', x: d0[0], z: d0[1], pts: DONGJAK.map((q) => drel(loc(q))), w: 10, top: 6, ramp: [30, 30], pipes: false, mid: true,
    arches: [[0.3, 0.45], [0.45, 0.6], [0.6, 0.75]].map(([a, b]) => [r1(a * dLen), r1(b * dLen)]) };
  const landmarks = [
    banpo,
    dongjak,
    { type: 'jamsu', x: r1((north[0] + south[0]) / 2), z: r1((north[1] + south[1]) / 2), ry: +ALONG_V.toFixed(4), len: r1(Math.hypot(south[0] - north[0], south[1] - north[1])), w: BRIDGE_W },
    { type: 'arch', ...xz(at(BRIDGE, BANK + 2)), ry: ALONG_V, w: BRIDGE_W + 2, title: 'BANPO-JAMWON HAN RIVER PARK', sub: '반포·잠원 한강공원', color: '#2f6fb0' },
    { type: 'sign', ...xz(at(PX(36), 17)), ry: FACE_RIVER, // (across the path from Jamwon's lawn)
      title: name('Banpo-Jamwon Han River Park', '반포·잠원 한강공원', '盤浦・蚕院漢江公園', '盘浦·蚕院汉江公园'),
      text: {
        en: 'Banpo and Jamwon Han River Parks lie side by side on the south bank of the Han River. Walk across Jamsu Bridge under Banpo Bridge, spread a mat on the grass, or fish from the bank: the manta ray, a legend, only bites here.',
        ko: '반포한강공원과 잠원한강공원은 한강 남쪽 강변에 나란히 있어요. 반포대교 아래 잠수교를 걸어서 건너고, 잔디에 돗자리를 펴거나, 강가에서 낚시를 해 보세요. 전설의 만타가오리는 여기서만 잡혀요.',
        ja: '盤浦漢江公園と蚕院漢江公園は、漢江の南岸に並んでいます。盤浦大橋の下の潜水橋を歩いて渡り、芝生にシートを広げたり、川辺で釣りをしてみましょう。伝説のマンタはここでしか釣れません。',
        zh: '盘浦汉江公园和蚕院汉江公园并排位于汉江南岸。从盘浦大桥下的潜水桥走过江，在草地上铺开野餐垫，或者在江边钓鱼：传说中的蝠鲼只在这里咬钩。',
      } },
  ];
  // The Moonlight Rainbow Fountain on Banpo Bridge (core/rainbow-fountain.js:
  // the show; the jets come out of the bridge's upper deck). A board by the
  // path, looking out at the bridge, with the real fountain's season.
  landmarks.push({ type: 'sign', ...xz(at(BRIDGE + 22, 17)), ry: FACE_RIVER,
    title: name('Moonlight Rainbow Fountain', '달빛무지개분수', '月光レインボー噴水', '月光彩虹喷泉'),
    text: {
      en: 'Banpo Bridge\'s fountain pours water lit in rainbow colours from both sides of the bridge into the Han River. In 2008 Guinness World Records named it the world\'s longest bridge fountain. In real life it runs from spring to autumn (roughly April to October): several shows of about 20 minutes each evening and one at noon, none in rain or strong wind. Times change every year, so check the Han River Park website before you go. In the game, a show starts at half past most hours (Korean time).',
      ko: '반포대교 분수는 다리 양옆에서 무지개빛 물줄기를 한강으로 쏟아 내요. 2008년 기네스 세계기록에 세계에서 가장 긴 교량 분수로 올랐어요. 실제로는 봄부터 가을까지(대략 4월~10월) 저녁마다 약 20분짜리 공연을 여러 번, 낮 12시에 한 번 하고, 비가 오거나 바람이 세면 쉬어요. 시간은 해마다 바뀌니 가기 전에 한강공원 누리집에서 확인하세요. 게임에서는 대부분의 시간 매시 30분(한국 시간)에 공연이 시작돼요.',
      ja: '盤浦大橋の噴水は、橋の両側から虹色にライトアップされた水を漢江へ流し落とします。2008年、世界一長い橋の噴水としてギネス世界記録に認定されました。実際には春から秋（だいたい4月〜10月）、毎晩約20分のショーが数回と正午に1回あり、雨や強風の日は休みます。時間は毎年変わるので、行く前に漢江公園のサイトで確認してください。ゲームでは、ほとんどの時間帯で毎時30分（韓国時間）にショーが始まります。',
      zh: '盘浦大桥喷泉从桥的两侧把彩虹色灯光照亮的水洒进汉江。2008年它被吉尼斯世界纪录认定为世界最长的桥梁喷泉。现实中从春天到秋天（大约4月到10月）运行：每晚有几场约20分钟的表演，中午还有一场，下雨或大风时暂停。时间每年都会变，出发前请在汉江公园网站上确认。在游戏里，大多数时段每小时30分（韩国时间）开始一场表演。',
    } });
  for (const u of [-125, -100, -75, 100, 118, 136]) landmarks.push({ type: 'bench', ...xz(along(u, 5)), ry: facing(u) }); // (the park has its own by the water)
  // The park itself (game/han-parks.js): set at the bank's edge under the bridge.
  landmarks.push({ type: 'hanpark', store: 'banpo-jamwon-hangang', ...xz(at(BRIDGE, BANK)), ry: +ALONG_V.toFixed(4), bounds: PARK.bounds, layout: PARK.layout });
  const pois = [
    { kind: 'landmark', ...xz(along(60, 30)), name: name('Banpo-Jamwon Han River Park', '반포·잠원 한강공원', '盤浦・蚕院漢江公園', '盘浦·蚕院汉江公园') },
    { kind: 'landmark', ...xz(at(BRIDGE, -90)), name: name('Jamsu Bridge', '잠수교', '潜水橋', '潜水桥') },
  ];
  return {
    meta: {
      district: 'banpo-jamwon',
      source: 'scripts/build-banpo.mjs: Banpo and Jamwon Han River Parks, Seocho-gu, joined into one riverside park at the south end of Banpo Bridge. The bank and the bridge are on their real lines at 1/4 (OpenStreetMap, scripts/han-bank.mjs); Moonlight Square stands on a terrace over the bay where Sebitseom floats (up to 16 m off the real bank). The kiosks and market are fictional.',
      credit: '© OpenStreetMap contributors (ODbL)',
    },
    roads, buildings, rail: [], areas, blockers, pois, landmarks,
  };
}
function xz([x, z]) { return { x, z }; }

// Where each place's door is, in the district's own metres.
const SPOTS = {
  'banpo-jamwon-hangang': park(-24, 11.5), // on the lawn behind Moonlight Square, off the river path (where a taxi or the map drops you)
  'info-banpo-jamwon': along(98, 15.5),
};

// The link road from Itaewon: down Noksapyeong-daero's real line (from where
// it crosses Itaewon's Seobinggo-ro, through Yongsan Park, past the
// Seobinggo-ro junction) onto Banpo Bridge, to Jamsu Bridge's north end.
// Banpo Bridge's north ramp comes down onto Noksapyeong-daero at its first
// point, so the road to Jamsu Bridge keeps beside it (west, SIDE metres from
// its middle) and goes in under the deck once it is high. West: Itaewon's
// houses stand close on the east.
const SIDE = 16;
// Dongjak Bridge: Line 4's viaduct over the river, north to south (OpenStreetMap).
const DONGJAK = [[-1599, 795.5], [-1666, 1115.7]];
function besideRamp(s) {
  const [a, b] = BANPO_BRIDGE, L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  return [r1(a[0] + d[0] * s - d[1] * SIDE), r1(a[1] + d[1] * s + d[0] * SIDE)];
}
// The link road from Itaewon (its north part is Itaewon's, kept as it is):
// up to the last point before Banpo Bridge's ramp, then beside the ramp to
// Jamsu Bridge's north end.
export function linkRoad(old) {
  const k = old.findIndex(([x, z]) => z >= BANPO_BRIDGE[0][1] - 1);
  return [...old.slice(0, k), besideRamp(15), besideRamp(68), JAMSU_NORTH];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const map = build();
  writeFileSync(path.join(R, 'districts', 'banpo-jamwon.json'), JSON.stringify(map) + '\n');
  // region.json (hand-formatted): the district's offset and anchor, and the link road.
  let text = readFileSync(path.join(R, 'region.json'), 'utf8');
  const sub = (re, to) => { if (!re.test(text)) throw new Error('not found: ' + re); text = text.replace(re, to); };
  const local = loc(BANPO_FOOT), ll = toLatLon(...BANPO_FOOT);
  const anchor = { place: 'South end of Banpo Bridge on the Han River bank (Jamsu Bridge lands here)', lat: +ll.lat.toFixed(6), lon: +ll.lon.toFixed(6), local };
  sub(/("id": "banpo-jamwon",\s*"map": "districts\/banpo-jamwon.json",\s*"offset": \[\s*)-?[\d.]+,\s*-?[\d.]+(\s*\],\s*"anchor": )\{[^\n]*\}/, `$1${OFFSET[0]},\n        ${OFFSET[1]}$2${JSON.stringify(anchor).replace(/,/g, ', ').replace(/":/g, '": ').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`);
  const linkRe = /("p": )(\[\[[^\n]*\]\])(,\s*"n": \{ "ko": "반포대교 가는 길")/;
  const old = JSON.parse(text.match(linkRe)[2]);
  sub(linkRe, `$1${JSON.stringify(linkRoad(old)).replace(/,/g, ', ')}$3`);
  writeFileSync(path.join(R, 'region.json'), text);
  // stores.json is hand-formatted, so only the "at" of each place is rewritten.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const [ox, oz] = OFFSET;
  for (const [sid, [x, z]] of Object.entries(SPOTS)) {
    const i = stores.indexOf(`"id": "${sid}"`);
    if (i < 0) { console.log(`${sid}: not in stores.json`); continue; }
    let end = stores.indexOf('\n    {', i);
    if (end < 0) end = stores.length;
    const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${r1(x + ox)}, ${r1(z + oz)}]`);
    stores = stores.slice(0, i) + part + stores.slice(end);
  }
  writeFileSync(path.join(R, 'stores.json'), stores);
  // The stamp stand at the west end of Moonlight Square (src/data/stamps.js).
  const [sx, sz] = park(-45, 4.6);
  const stampFile = path.join(root, 'src', 'data', 'stamps.js');
  const stamps = readFileSync(stampFile, 'utf8').replace(/(id: 'banpo-jamwon', place: \{ at: )\[[^\]]*\], ry: -?[\d.]+/, `$1[${r1(sx + ox)}, ${r1(sz + oz)}], ry: ${(ALONG_V + Math.PI / 2).toFixed(4)}`);
  writeFileSync(stampFile, stamps);
  const jamsu = map.landmarks.find((l) => l.type === 'jamsu'), [jx, jz] = [jamsu.x + ox, jamsu.z + oz];
  console.log(`offset ${OFFSET}; Jamsu Bridge middle (core/rainbow-fountain.js BRIDGE): { x: ${r1(jx)}, z: ${r1(jz)} }, ${jamsu.len} m long`);
  console.log(`banpo-jamwon: ${map.buildings.length} buildings`);
}
