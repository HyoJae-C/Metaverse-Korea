#!/usr/bin/env node
// Builds Hongdae (districts/hongdae.json) at 1/4 on its real streets, like
// the rest of the Seoul map, and puts its shops on the street.
//
// The streets are OpenStreetMap's (scripts/data/hongdae-osm.json): Yanghwa-ro
// running south-west from Hongik Univ. Station to Hapjeong, Hongik-ro at
// right angles to it, Hongdae Walking Street (Eoulmadang-ro) leaving
// Hongik-ro south-south-west past the busking zone to Jandari-ro, Wausan-ro
// and Jandari-ro round the south, Dongmak-ro at Hapjeong. North-west of
// Yanghwa-ro is Yeonnam-dong (scripts/build-yeonnam.mjs). The few lanes
// inside the blocks are made up, in line with the real blocks; every
// building and shop is fictional.
//
// The busking zone keeps its game size (its steps and acts are 30 m long):
// an open plaza round it on the walking street. The stage stands on the
// street 11 m from the anchor's spot (the anchor is the zone's real place).
//
//   node scripts/build-hongdae.mjs          writes the map and sets the "at"
//                                           of the shops in SHOPS (stores.json)
//   node scripts/build-hongdae.mjs --lots   also prints the lots of each row

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, name, town, inPoly, sideOf, clip, reach, nearestOn, pointAt, lengthOf, facing, strips, lineDist } from './street-rows.mjs';
import { BANK, CROWD, SINGER, GIRLS, BOYS } from '../src/core/busking-layout.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const readJson = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'hongdae-osm.json'), 'utf8'));
const region = readJson('region.json');
export const OFFSET = region.districts.find((x) => x.id === 'hongdae').offset;
const local = (p) => p.map(([x, z]) => [r1(x - OFFSET[0]), r1(z - OFFSET[1])]);
const street = (en) => local(OSM.roads.find((r) => r.en === en).p);

// ---- the real streets (local metres from the anchor)
export const YANGHWA = street('Yanghwa-ro');
// South-east of Yanghwa-ro is Hongdae, north-west of it Yeonnam.
export const hongdaeSide = (q) => sideOf(q, YANGHWA) > 0;
const N = {
  yanghwa: name('Yanghwa-ro', '양화로', '楊花路', '杨花路'),
  hongik: name('Hongik-ro', '홍익로', '弘益路', '弘益路'),
  walk: name('Hongdae Walking Street', '홍대 걷고싶은거리', '弘大 歩きたい通り', '弘大步行街'),
  wausan: name('Wausan-ro', '와우산로', '臥牛山路', '卧牛山路'),
  jandari: name('Jandari-ro', '잔다리로', 'チャンダリ路', '盏达里路'),
  dongmak: name('Dongmak-ro', '독막로', '独幕路', '独幕路'),
  lane: name('Hongdae lane', '홍대 골목', '弘大の路地', '弘大小巷'),
  perfume: name('Perfume Alley', '향수 골목', '香水横丁', '香水小巷'),
};
const hongik = street('Hongik-ro');
const wausan = street('Wausan-ro');
const jandari = clip(street('Jandari-ro'), (q) => sideOf(q, YANGHWA) > -4); // to the middle of Yanghwa-ro
const dongmak = [...street('Dongmak-ro'), wausan[0]]; // on to Sangsu Station, where it meets Wausan-ro (the export stops 100 m short)
// The walking street: Eoulmadang-ro from Hongik-ro, carried on south to
// Jandari-ro (the last 30 m are made up).
const eoul = street('Eoulmadang-ro').reverse(); // north to south
const walkEnd = (() => {
  const [a, b] = eoul.slice(-2), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return reach(b, [(b[0] - a[0]) / L, (b[1] - a[1]) / L], [{ p: jandari, w: 1.2 }]);
})();
const walk = [...eoul, walkEnd];

const roads = [
  { k: 'primary', w: 14, p: YANGHWA, n: N.yanghwa },
  { k: 'secondary', w: 10, p: hongik, n: N.hongik },
  { k: 'walk', w: 12, p: walk, n: N.walk },
  { k: 'tertiary', w: 9, p: wausan, n: N.wausan },
  { k: 'tertiary', w: 8, p: jandari, n: N.jandari },
  { k: 'secondary', w: 10, p: dongmak, n: N.dongmak },
];
const main = roads.slice();
// Yanghwa-ro's direction (south-west to north-east) and the one at right angles (south-east).
const U = (() => { const [a, b] = [YANGHWA[0], YANGHWA.at(-1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; })();
const SE = [-U[1], U[0]];
const HONGIK_FOOT = nearestOn(hongik[0], YANGHWA).at; // where Hongik-ro leaves Yanghwa-ro
const alongY = (t) => [HONGIK_FOOT[0] + U[0] * t, HONGIK_FOOT[1] + U[1] * t];
// Made-up lanes in the real blocks, in line with them (at right angles to
// Yanghwa-ro, like Hongik-ro), from a street to the next one.
const lane = (from, dir, k = 'residential', w = 6, n = N.lane) => {
  const to = main.filter((r) => lineDist(from, r.p) > r.w / 2 + 1); // not the street(s) it leaves
  const end = reach(from, dir, to.concat(roads.slice(main.length)), 200);
  if (!end) throw new Error(`lane from ${from} reaches no street`);
  const r = { k, w, p: [from.map(r1), end], n };
  roads.push(r);
  return r;
};
lane(alongY(-72), SE); // between Yanghwa-ro and the walking street (meets it south of the plaza)
lane(alongY(-135), SE); // south of Jandari-ro, down to Dongmak-ro
lane(alongY(-170), SE);
lane(walkEnd, (() => { const [a, b] = walk.slice(-2), L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; })()); // the walking street's line, on to Dongmak-ro
// The perfume alley: off the walking street south of the plaza, east to Wausan-ro.
const PERF = nearestOn([1, 40], walk);
const perfume = lane(PERF.at, [PERF.dir[1], -PERF.dir[0]], 'residential', 6, N.perfume); // at right angles, east

// ---- the busking zone: the stage on the walking street, the plaza round it
export const STAGE = [5.5, 10];
const B = { x0: BANK.back - 3, x1: Math.max(...[SINGER, ...GIRLS, ...BOYS].map((q) => q[0])) + 3.5, z0: BANK.z0 - 3, z1: BANK.z1 + 3 };
const PLAZA = [[B.x0, B.z0], [B.x1, B.z0], [B.x1, B.z1], [B.x0, B.z1]].map(([x, z]) => [r1(STAGE[0] + x), r1(STAGE[1] + z)]);

// ---- the area: south-east of Yanghwa-ro, west of Hongik Univ. (south of
// Wausan-ro's east end and east of its south end is the campus, left open).
const AREA = [[-176, 117], [118, -153], [140, -153], [140, 0], [62, 24], [42, 62], [38, 162], [-69, 159], [-180, 122]];
const inside = (q) => inPoly(q[0], q[1], AREA) && hongdaeSide(q);
// The station's exits (stationExits below) stay clear: 4 m round each.
const EXIT_SPOTS = ['9', '3'].map((ref) => exitAt(ref));
const open = [{ p: PLAZA }, ...EXIT_SPOTS.map(({ at: [x, z] }) => ({ p: [[x - 4, z - 4], [x + 4, z - 4], [x + 4, z + 4], [x - 4, z + 4]] }))];
const t = town(239, { inside, roads, open }); // (Hongik Univ. is station 239)
const { row } = t;
const SHOP = { w: [10, 16], h: [6, 14], depth: 15 };
const BIG = { w: [14, 20], h: [10, 22] };
const SMALL = { w: [7, 10], h: [6, 12], depth: 9 }; // round the plaza: narrow shop fronts
const fr = (r, pave = 3) => r.w / 2 + pave; // a front: the road's edge plus the pavement
// The busking plaza first: shops face it from its west and east edges
// (the west ones 3.5 m clear of the audience's steps), then the walking
// street both sides (north to south: west is on the right).
const [[px0, pz0], , [px1, pz1]] = PLAZA;
row('plazaW', [[px0, pz0], [px0, pz1]], 1, { off: 2.5, ...SMALL });
row('plazaE', [[px1, pz0], [px1, pz1]], -1, { off: 2.5, ...SMALL });
// The perfume alley, both sides (it runs east: north is on the left).
row('alleyN', perfume.p, -1, { off: fr(perfume, 1.5), depth: 9, w: [8, 10], h: [5, 9] });
row('alleyS', perfume.p, 1, { off: fr(perfume, 1.5), depth: 9, w: [8, 10], h: [5, 9] });
row('walkW', walk, 1, { off: fr(roads[2], 1.5), ...SMALL });
row('walkE', walk, -1, { off: fr(roads[2], 1.5), ...SMALL });
// Hongik-ro, both sides (it runs south-east from Yanghwa-ro).
row('hongikW', hongik, 1, { off: fr(roads[1]), ...SMALL });
row('hongikE', hongik, -1, { off: fr(roads[1]), ...SMALL });
// Yanghwa-ro's south-east side: big buildings, the station's corner by Hongik-ro.
row('yanghwa', YANGHWA, 1, { off: fr(roads[0]), depth: 18, ...BIG });
// Wausan-ro (from the south end north, then east): both sides.
row('wausanW', wausan, -1, { off: fr(roads[3]), ...SHOP });
row('wausanE', wausan, 1, { off: fr(roads[3]), ...SHOP });
// Jandari-ro (from Wausan-ro west, then north-west to Yanghwa-ro): restaurants.
row('jandariN', jandari, 1, { off: fr(roads[4]), ...SHOP });
row('jandariS', jandari, -1, { off: fr(roads[4]), ...SHOP });
row('dongmak', dongmak, -1, { off: fr(roads[5]), ...SHOP });
// The made-up lanes: a row of houses either side.
roads.slice(main.length).forEach((r, i) => {
  if (r === perfume) return;
  row(`lane${i}W`, r.p, 1, { off: fr(r, 1.5), depth: 12, w: [10, 14], h: [5, 10] });
  row(`lane${i}E`, r.p, -1, { off: fr(r, 1.5), depth: 12, w: [10, 14], h: [5, 10] });
});
// One row along each street and nothing filling the blocks behind (like
// Seongsu: open and light, Yozi 2026-11-10).

// ---- landmarks
const walkLen = lengthOf(walk);
const arch = (s, out) => { const { at, dir } = pointAt(walk, s); return { type: 'arch', x: r1(at[0]), z: r1(at[1]), w: 13, ry: facing(dir[0] * out, dir[1] * out), title: 'HONGDAE WALKING STREET', sub: '홍대 걷고싶은거리', color: '#e0457b' }; };
const landmarks = [
  arch(9, -1), // at the top, by Hongik-ro (facing north-east, up the street)
  arch(walkLen - 8, 1), // at the bottom, by Jandari-ro
  { type: 'busking', x: STAGE[0], z: STAGE[1] },
];
const areas = [{ k: 'plaza', p: PLAZA }];
const walkTop = pointAt(walk, 16).at;
const pois = [
  { kind: 'landmark', x: STAGE[0], z: r1(STAGE[1] - 18), name: name('Hongdae Busking Zone', '홍대 버스킹존', '弘大バスキングゾーン', '弘大街头表演区') },
  { kind: 'landmark', x: r1(walkTop[0]), z: r1(walkTop[1]), name: N.walk },
];
const map = {
  meta: {
    district: 'hongdae',
    source: 'scripts/build-hongdae.mjs, at 1/4 on the real place: Yanghwa-ro, Hongik-ro, Eoulmadang-ro (Hongdae Walking Street), Wausan-ro, Jandari-ro and Dongmak-ro from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/hongdae-osm.json). The busking plaza keeps its game size; the lanes in the blocks are made up. Every building and shop is fictional.',
  },
  roads: roads.map((r) => ({ ...r, p: r.p.map((q) => q.map(r1)) })), buildings: t.buildings, rail: [], areas, blockers: [], pois, landmarks,
};
map.meta.parts = strips(map, 25, 'Hongdae, south-east of Yanghwa-ro');

// Which shops go where: each group takes the free lots of its rows, in
// order. Kept together the way they were: the info centre and name tags by
// the station, salons, tarot and clothes round the busking plaza, the
// perfume alley, animal cafés and desserts down the walking street, the big
// rooms (sauna, gym, yoga, climbing) on Wausan-ro, and the Korean
// restaurants facing each other on Jandari-ro.
const GROUPS = [
  // By the station: the top of Hongik-ro, and Yanghwa-ro by it.
  [['hongikE', 'hongikW'], ['info-hongdae', 'hongdae-name-tags', 'stage-idol-hair']],
  [['yanghwa'], ['soda24-mart', 'bike-research-lab', 'graffiti-caps'], { near: 'HONGIK_FOOT' }],
  // Round the busking plaza.
  [['plazaW', 'plazaE', 'walkW', 'walkE', 'hongikE', 'hongikW'], ['groove-hair', 'indie-hair-room', 'croffle-house', 'neon-punk-hair', 'lucky-piggy-tarot', 'indie-record', 'stripe-alley', 'wild-neon', 'sorimaru-lp', 'cheongchima']],
  // The perfume alley.
  [['alleyN', 'alleyS'], ['kkeung-sanghoe', 'heart-ppyong', 'oops-parfum', 'moai-scent-lab', 'punggyeong-scent']],
  // Animal cafés and desserts, down the walking street and the lane by it.
  [['walkW', 'walkE', 'hongikW', 'hongikE', 'jandariN'], ['gogo-cat-cafe', 'neoguri-raccoon-cafe', 'big-paws-dog-cafe', 'haemjji-hamster-cafe', 'bingsu-lab', 'moonbeam-dessert', 'starlight-tarot', 'street-kick', 'ear-candy', 'nyang-meong-to-pan']],
  // Wausan-ro: the big rooms and the shops by the campus.
  [['wausanW', 'dongmak'], ['onsaem-jjimjil', 'boulder-bloc', 'muscle-gym', 'sum-yoga', 'vintage-garage', 'glow-lab', 'indie-beans', 'sticker-planet', 'byeolbit-mart', 'gil-coffee']],
  // Korean restaurants on Jandari-ro, facing each other.
  [['jandariS', 'jandariN', 'lane3W', 'lane3E', 'lane1W', 'dongmak'], ['baro-imat-galbitang', 'siwon-kalguksu', 'chuncheon-dakgalbi', 'mujeok-samgyeopsal', 'haengbok-gopchang', 'masitda-chadolbagi', 'deumppuk-yukhoe', 'chammat-gejang', 'tojong-sundae-gukbap', 'gungmin-seolleongtang']],
];

// Hongik Univ. Station's two exits at their real places (OSM), moved out to
// the pavement: 9 on the Hongdae side, 3 by the forest park (Yeonnam).
function exitAt(ref, out = 9.6) {
  const real = local([OSM.exits[ref]])[0];
  const { at, dir, d } = nearestOn(real, YANGHWA), side = Math.sign(sideOf(real, YANGHWA));
  const n = [-dir[1] * side, dir[0] * side];
  const off = Math.max(d, out);
  return { n: Number(ref), at: [r1(at[0] + n[0] * off), r1(at[1] + n[1] * off)], ry: facing(dir[0] * side, dir[1] * side), real }; // stairs going down along the road
}
export const stationExits = () => ['9', '3'].map((ref) => exitAt(ref));

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writeFileSync(path.join(R, 'districts', 'hongdae.json'), JSON.stringify(map) + '\n');
  const [ox, oz] = OFFSET;
  // stores.json is hand-formatted, so only the "at" of each placed shop is
  // rewritten in the text.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const setAt = (sid, at) => {
    const i = stores.indexOf(`"id": "${sid}"`);
    if (i < 0) throw new Error(`${sid}: not in stores.json`);
    let end = stores.indexOf('\n    {', i);
    if (end < 0) end = stores.length;
    const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${at[0]}, ${at[1]}]`);
    stores = stores.slice(0, i) + part + stores.slice(end);
  };
  if (process.argv.includes('--lots')) for (const [k, v] of Object.entries(t.lots)) console.log('  ', k, v.length, JSON.stringify(v));
  const used = new Set();
  const bank = [];
  for (let x = BANK.back; x <= BANK.front; x += 0.5) for (let z = BANK.z0; z <= BANK.z1; z += 0.5) bank.push([STAGE[0] + x, STAGE[1] + z]);
  const ok = (at) => !bank.some((q) => Math.hypot(q[0] - at[0], q[1] - at[1]) <= 3.2)
    && !main.some((r) => r.k !== 'walk' && lineDist(at, r.p) < r.w / 2 + 0.5);
  for (const [rows, ids, opt] of GROUPS) {
    // every free lot of the rows, in row order (or nearest a spot first)
    let free = rows.flatMap((rowId) => (t.lots[rowId] || []).map((at, i) => ({ key: `${rowId}:${i}`, at }))).filter((l) => !used.has(l.key) && ok(l.at));
    if (opt?.near === 'HONGIK_FOOT') free.sort((a, b) => Math.hypot(a.at[0] - HONGIK_FOOT[0], a.at[1] - HONGIK_FOOT[1]) - Math.hypot(b.at[0] - HONGIK_FOOT[0], b.at[1] - HONGIK_FOOT[1]));
    if (free.length < ids.length) throw new Error(`${rows}: ${free.length} free lots for ${ids.length} shops`);
    ids.forEach((sid, i) => { used.add(free[i].key); setAt(sid, [r1(free[i].at[0] + ox), r1(free[i].at[1] + oz)]); if (process.argv.includes('--lots')) console.log('  ', sid, free[i].key); });
  }
  writeFileSync(path.join(R, 'stores.json'), stores);
  console.log(`hongdae: ${t.buildings.length} buildings, ${used.size} shops placed; stage at [${STAGE[0] + ox}, ${STAGE[1] + oz}]`);
  for (const e of stationExits()) console.log(`  Hongik Univ. exit ${e.n}: [${r1(e.at[0] + ox)}, ${r1(e.at[1] + oz)}], ry ${e.ry} (${r1(Math.hypot(e.at[0] - e.real[0], e.at[1] - e.real[1]))} m from the real one)`);
  console.log(`  Yanghwa-ro ends: [${YANGHWA[0].map((v, k) => r1(v + OFFSET[k]))}] [${YANGHWA.at(-1).map((v, k) => r1(v + OFFSET[k]))}]; Wausan-ro south end [${wausan[0].map((v, k) => r1(v + OFFSET[k]))}]`);
}
