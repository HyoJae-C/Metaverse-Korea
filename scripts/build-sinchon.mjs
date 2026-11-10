#!/usr/bin/env node
// Builds Sinchon (districts/seodaemun.json) at 1/4 on its real streets, like
// Hongdae next door, and puts its shops on the street.
//
// The streets are OpenStreetMap's (scripts/data/sinchon-osm.json): Sinchon-ro
// from Hongik Univ. Station past Sinchon Station to Ewha Womans Univ.
// Station, Yonsei-ro north from Sinchon Station to Seongsan-ro (the
// signature street: buses only on weekdays, car-free at weekends; here a
// walking street), Myeongmul-gil and Sinchonyeok-ro to Sinchon train
// station, Ewhayeodae-gil, Seongsan-ro in front of the campus gate,
// Seogang-ro south-west toward Seogang Bridge, and Baekyang-ro, the campus
// avenue. The campus is Hyojae University (fictional), on the real campus's
// ground north of Seongsan-ro. Every building and shop is fictional.
//
// One row of buildings along each street, the blocks behind left open (like
// Seongsu, Yozi 2026-11-10).
//
//   node scripts/build-sinchon.mjs          writes the map, sets the "at" of
//                                           the shops in GROUPS (stores.json),
//                                           Sinchon Station's exits and the
//                                           Sinchon zone (zones.json)
//   node scripts/build-sinchon.mjs --lots   also prints the lots of each row

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, name, inPoly, sideOf, nearestOn, pointAt, lengthOf, facing, strips, lineDist, town } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const readJson = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'sinchon-osm.json'), 'utf8'));
const region = readJson('region.json');
export const OFFSET = region.districts.find((x) => x.id === 'seodaemun').offset;
const local = (p) => p.map(([x, z]) => [r1(x - OFFSET[0]), r1(z - OFFSET[1])]);
const street = (en) => local(OSM.roads.find((r) => r.en === en).p);
// A street carried on to the middle of the one it leaves (OSM stops at the kerb).
const from = (p, other) => [nearestOn(p[0], other).at.map(r1), ...p];

// ---- the real streets (local metres from the anchor: Yonsei-ro at Seongsan-ro)
const N = {
  sinchon: name('Sinchon-ro', '신촌로', '新村路', '新村路'),
  yonsei: name('Yonsei-ro', '연세로', '延世路', '延世路'),
  seongsan: name('Seongsan-ro', '성산로', '城山路', '城山路'),
  myeongmul: name('Myeongmul-gil', '명물길', 'ミョンムル通り', '名物街'),
  station: name('Sinchonyeok-ro', '신촌역로', '新村駅路', '新村站路'),
  ewha: name('Ewhayeodae-gil', '이화여대길', '梨花女大通り', '梨花女大街'),
  seogang: name('Seogang-ro', '서강로', '西江路', '西江路'),
  baekyang: name('Baekyang-ro', '백양로', '白楊路', '白杨路'),
};
// Sinchon-ro: from where Yanghwa-ro ends at Hongik Univ. Station (Hongdae's
// map) east to 120 m past Ewha Womans Univ. Station, where the link road on to
// Gwanghwamun starts (region.json links).
const EAST_END = -2300 - OFFSET[0];
const sinchonAll = [[-2842.6 - OFFSET[0], -392.3 - OFFSET[1]], ...street('Sinchon-ro')];
const SINCHON = (() => {
  const out = [];
  for (let i = 0; i < sinchonAll.length; i++) {
    const q = sinchonAll[i];
    if (q[0] <= EAST_END) { out.push(q); continue; }
    const a = sinchonAll[i - 1], t = (EAST_END - a[0]) / (q[0] - a[0]);
    out.push([r1(EAST_END), r1(a[1] + (q[1] - a[1]) * t)]);
    break;
  }
  return out;
})();
const SEONGSAN = street('Seongsan-ro');
const YONSEI = from(street('Yonsei-ro'), SINCHON);
YONSEI[YONSEI.length - 1] = nearestOn(YONSEI.at(-1), SEONGSAN).at.map(r1); // on to the middle of Seongsan-ro
const MYEONGMUL = street('Myeongmul-gil');
const STATION_RO = street('Sinchonyeok-ro');
const EWHA = street('Ewhayeodae-gil');
const SEOGANG = from(street('Seogang-ro'), SINCHON);
const BAEKYANG = from(street('Baekyang-ro'), SEONGSAN);

const roads = [
  { k: 'primary', w: 14, p: SINCHON, n: N.sinchon },
  { k: 'walk', w: 12, p: YONSEI, n: N.yonsei },
  { k: 'primary', w: 14, p: SEONGSAN, n: N.seongsan },
  { k: 'walk', w: 8, p: MYEONGMUL, n: N.myeongmul },
  { k: 'secondary', w: 9, p: STATION_RO, n: N.station },
  { k: 'tertiary', w: 9, p: EWHA, n: N.ewha },
  { k: 'primary', w: 12, p: SEOGANG, n: N.seogang },
  { k: 'walk', w: 10, p: BAEKYANG, n: N.baekyang },
];
const [rSinchon, rYonsei, rSeongsan, rMyeongmul, rStation, rEwha, rSeogang, rBaekyang] = roads;

// ---- open places
// The campus gate plaza: north of Seongsan-ro round the foot of Baekyang-ro.
const GATE = [[-22, -12], [22, -12], [22, -36], [-22, -36]];
// Sinchon Square: the corner between Yonsei-ro and Myeongmul-gil.
const SQUARE = [[8, -72], [26, -72], [26, -56], [8, -56]];
const PARK = local(OSM.park.p);
// The campuses keep their green: Hyojae University north of Seongsan-ro (only
// its halls along Baekyang-ro), Ewha north of Ewhayeodae-gil.
const campus = (q) => sideOf(q, SEONGSAN) < 0 && lineDist(q, BAEKYANG) > 34; // left of Seongsan-ro going east = north
const ewhaCampus = (q) => q[0] > -2488 - OFFSET[0] && q[1] < -410 - OFFSET[1];

// ---- the district's area: near its streets, east of Hongdae
const inside = (q) => {
  if (q[0] < -2828 - OFFSET[0] || q[0] > EAST_END + 4) return false;
  if (campus(q) || ewhaCampus(q)) return false;
  return roads.some((r) => lineDist(q, r.p) < r.w / 2 + 26);
};

// Sinchon Station's exits at their real places (OSM), moved out of Sinchon-ro
// onto the pavement: 1 west of Yonsei-ro, 4 east of it (the two the game has).
// Each slides a few metres along the road, so its stairs stay off Yonsei-ro.
const SLIDE = { 1: -5, 4: 3 };
function exitAt(ref, out = 11) {
  const real = local([OSM.exits.sinchon[ref]])[0];
  const near = nearestOn(real, SINCHON), side = Math.sign(sideOf(real, SINCHON));
  const { at, dir } = pointAt(SINCHON, near.s + (SLIDE[ref] || 0)), d = near.d;
  const n = [-dir[1] * side, dir[0] * side];
  const off = Math.max(d, out);
  return { n: Number(ref), at: [r1(at[0] + n[0] * off), r1(at[1] + n[1] * off)], ry: facing(dir[0] * side, dir[1] * side), real };
}
export const stationExits = () => ['1', '4'].map((ref) => exitAt(ref));
const EXITS = stationExits();
const box = ([x, z], h) => [[x - h, z - h], [x + h, z - h], [x + h, z + h], [x - h, z + h]];

const open = [{ p: GATE }, { p: SQUARE }, { p: PARK }, ...EXITS.map((e) => ({ p: box(e.at, 4) }))];
const t = town(240, { inside, roads, open }); // (Sinchon is station 240)
const { row } = t;
const SHOP = { w: [10, 15], h: [6, 14], depth: 14, gap: 2 };
const BIG = { w: [14, 20], h: [12, 26], depth: 18, gap: 3 };
const SMALL = { w: [7, 10], h: [6, 12], depth: 10 };
const HALL = { w: [18, 26], h: [10, 18], depth: 16, gap: 8 };
const fr = (r, pave = 3) => r.w / 2 + pave;
// Yonsei-ro first (it runs north from Sinchon-ro: west is on the left), then
// Myeongmul-gil, then the big streets.
row('yonseiW', YONSEI, -1, { off: fr(rYonsei, 1.5), ...SMALL });
row('yonseiE', YONSEI, 1, { off: fr(rYonsei, 1.5), ...SMALL });
row('myeongmulN', MYEONGMUL, -1, { off: fr(rMyeongmul, 1.5), ...SMALL });
row('myeongmulS', MYEONGMUL, 1, { off: fr(rMyeongmul, 1.5), ...SMALL });
// Sinchon-ro runs west to east: north is on the left.
row('sinchonN', SINCHON, -1, { off: fr(rSinchon), ...BIG });
row('sinchonS', SINCHON, 1, { off: fr(rSinchon), ...BIG });
row('ewhaW', EWHA, -1, { off: fr(rEwha), ...SMALL }); // north from Ewha Station, then west
row('ewhaE', EWHA, 1, { off: fr(rEwha), ...SMALL });
row('stationW', STATION_RO, 1, { off: fr(rStation), ...SHOP }); // south from Seongsan-ro
row('stationE', STATION_RO, -1, { off: fr(rStation), ...SHOP });
row('seongsanS', SEONGSAN, 1, { off: fr(rSeongsan), ...BIG });
row('seongsanN', SEONGSAN, -1, { off: fr(rSeongsan), ...BIG });
row('seogangW', SEOGANG, 1, { off: fr(rSeogang), ...SHOP });
row('seogangE', SEOGANG, -1, { off: fr(rSeogang), ...SHOP });
// The campus avenue: halls set back on both sides.
row('hallsW', BAEKYANG, -1, { off: fr(rBaekyang, 6), ...HALL, from: 30 });
row('hallsE', BAEKYANG, 1, { off: fr(rBaekyang, 6), ...HALL, from: 30 });

// ---- landmarks and labels
const yonseiLen = lengthOf(YONSEI);
const archAt = (line, s, out, title, sub, color, w) => { const { at, dir } = pointAt(line, s); return { type: 'arch', x: r1(at[0]), z: r1(at[1]), w, ry: facing(dir[0] * out, dir[1] * out), title, sub, color }; };
const landmarks = [
  archAt(YONSEI, 16, -1, 'SINCHON YONSEI-RO', '신촌 연세로', '#2f5d46', 13), // by Sinchon-ro, facing south down to the station
  archAt(YONSEI, yonseiLen - 14, 1, 'SINCHON YONSEI-RO', '신촌 연세로', '#2f5d46', 13), // by the campus gate
  archAt(SINCHON, 40, -1, 'TO HONGDAE', '홍대 방면', '#7a4fa0', 15), // the west end, facing Hongdae
];
const centroid = (p) => [r1(p.reduce((m, q) => m + q[0], 0) / p.length), r1(p.reduce((m, q) => m + q[1], 0) / p.length)];
const areas = [{ k: 'plaza', p: GATE }, { k: 'plaza', p: SQUARE }, { k: 'park', p: PARK }];
const yonseiMid = pointAt(YONSEI, yonseiLen / 2).at;
const pois = [
  { kind: 'landmark', x: r1(0), z: -26, name: name('Hyojae University Gate', '효재대학교 정문', 'ヒョジェ大学 正門', '孝在大学正门') },
  { kind: 'landmark', x: centroid(SQUARE)[0], z: centroid(SQUARE)[1], name: name('Sinchon Square', '신촌 광장', '新村広場', '新村广场') },
  { kind: 'landmark', x: r1(yonseiMid[0]), z: r1(yonseiMid[1]), name: N.yonsei },
  { kind: 'landmark', ...(([x, z]) => ({ x, z }))(centroid(PARK)), name: name('Changcheon Park', '창천근린공원', '滄川近隣公園', '沧川近邻公园') },
];
const map = {
  meta: {
    district: 'seodaemun',
    source: 'scripts/build-sinchon.mjs, at 1/4 on the real place: Sinchon-ro, Yonsei-ro, Seongsan-ro, Myeongmul-gil, Sinchonyeok-ro, Ewhayeodae-gil, Seogang-ro and Baekyang-ro from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/sinchon-osm.json). Hyojae University (its Korean Academy and Library) is fictional, on the real campus ground north of Seongsan-ro. Every building and shop is fictional.',
  },
  roads: roads.map((r) => ({ ...r, p: r.p.map((q) => q.map(r1)) })), buildings: t.buildings, rail: [], areas, blockers: [], pois, landmarks,
};
map.meta.parts = strips(map, 25, 'Sinchon, east of Hongdae');

// Which shops go where: each group takes the free lots of its rows, in order
// (or nearest a spot first).
const SPOT = {
  exits: [r1((EXITS[0].at[0] + EXITS[1].at[0]) / 2), r1((EXITS[0].at[1] + EXITS[1].at[1]) / 2)],
  gate: [0, -14],
  square: centroid(SQUARE),
  cinemas: nearestOn([-2560 - OFFSET[0], -330 - OFFSET[1]], SINCHON).at,
};
const GROUPS = [
  // The information centre by the station's exits, at the foot of Yonsei-ro.
  [['yonseiE', 'yonseiW'], ['info-seodaemun'], { near: 'exits' }],
  // Hyojae University: the academy and the library on the campus avenue.
  [['hallsW', 'hallsE'], ['hyojae-academy', 'chaekmaru-library']],
  // Cafés and restaurants up Yonsei-ro.
  [['yonseiW', 'yonseiE'], ['slow-morning', 'nonna-lucia', 'honey-croffle', 'dal-tteok', 'bingsu-lab', 'moonbeam-dessert', 'chuncheon-dakgalbi', 'mujeok-samgyeopsal']],
  // Things to do round Sinchon Square and down Myeongmul-gil.
  [['myeongmulN', 'myeongmulS', 'yonseiE'], ['open-mic-live-cafe', 'mic-drop-noraebang', 'gotcha-claw', 'snap-frame-photo', 'level-up-pc', 'strike-lane-bowling'], { near: 'square' }],
  // The three cinemas together on Sinchon-ro, east of the station.
  [['sinchonN', 'sinchonS'], ['byeolbit-cinema', 'doodle-cinema', 'silver-screen-theater'], { near: 'cinemas' }],
  // A hair salon on the Ewha shopping street.
  [['ewhaW', 'ewhaE'], ['gareuma-hair']],
];

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writeFileSync(path.join(R, 'districts', 'seodaemun.json'), JSON.stringify(map) + '\n');
  const [ox, oz] = OFFSET;
  const W = (q) => [r1(q[0] + ox), r1(q[1] + oz)];
  // stores.json is hand-formatted, so only the "at" of each placed shop is
  // rewritten in the text. A shop not (yet) in stores.json is skipped.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const setAt = (sid, at) => {
    const i = stores.indexOf(`"id": "${sid}"`);
    if (i < 0) return false;
    let end = stores.indexOf('\n    {', i);
    if (end < 0) end = stores.length;
    const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${at[0]}, ${at[1]}]`);
    stores = stores.slice(0, i) + part + stores.slice(end);
    return true;
  };
  if (process.argv.includes('--lots')) for (const [k, v] of Object.entries(t.lots)) console.log('  ', k, v.length, JSON.stringify(v));
  const used = new Set();
  const ok = (at) => roads.every((r) => r.k === 'walk' || lineDist(at, r.p) >= r.w / 2 + 0.5);
  let placed = 0;
  for (const [rows, ids, opt] of GROUPS) {
    const want = ids.filter((sid) => stores.includes(`"id": "${sid}"`));
    // every free lot of the rows, taking the rows in turn (both sides of a street)
    const lists = rows.map((rowId) => (t.lots[rowId] || []).map((at, i) => ({ key: `${rowId}:${i}`, at })));
    let free = [];
    for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) free.push(l[i]);
    free = free.filter((l) => !used.has(l.key) && ok(l.at));
    if (opt?.near) { const s = SPOT[opt.near]; free.sort((a, b) => Math.hypot(a.at[0] - s[0], a.at[1] - s[1]) - Math.hypot(b.at[0] - s[0], b.at[1] - s[1])); }
    if (free.length < want.length) throw new Error(`${rows}: ${free.length} free lots for ${want.length} shops`);
    want.forEach((sid, i) => { used.add(free[i].key); setAt(sid, W(free[i].at)); placed++; if (process.argv.includes('--lots')) console.log('  ', sid, free[i].key); });
  }
  writeFileSync(path.join(R, 'stores.json'), stores);

  // Sinchon Station's exits (region.json subway) and the Sinchon zone (zones.json).
  let reg = readFileSync(path.join(R, 'region.json'), 'utf8');
  const st = reg.indexOf('"id": "sinchon-station"');
  const exS = reg.indexOf('"exits"', st), exE = reg.indexOf(']\n      }', exS);
  const exitsText = `"exits": [\n${EXITS.map((e) => `          {\n            "n": ${e.n},\n            "at": [\n              ${W(e.at)[0]},\n              ${W(e.at)[1]}\n            ],\n            "ry": ${e.ry}\n          }`).join(',\n')}\n        `;
  reg = reg.slice(0, exS) + exitsText + reg.slice(exE);
  const noteRe = /("id": "sinchon-station"[\s\S]*?"note": ")[^"]*(")/;
  reg = reg.replace(noteRe, `$1At its real place (OSM): exits 1 and 4 moved straight out from the real ones onto Sinchon-ro's south pavement, either side of Yonsei-ro (scripts/build-sinchon.mjs).$2`);
  writeFileSync(path.join(R, 'region.json'), reg);
  let zones = readFileSync(path.join(R, 'zones.json'), 'utf8');
  const gz = W(centroid(GATE)); // the gate plaza
  zones = zones.replace(/(\{ "id": "D-1"[^\n]*?"at": \[)[^\]]*(\])/, `$1${gz[0]}, ${gz[1]}$2`);
  writeFileSync(path.join(R, 'zones.json'), zones);

  console.log(`sinchon: ${t.buildings.length} buildings, ${placed} shops placed`);
  for (const e of EXITS) console.log(`  Sinchon exit ${e.n}: [${W(e.at)}], ry ${e.ry} (${r1(Math.hypot(e.at[0] - e.real[0], e.at[1] - e.real[1]))} m from the real one)`);
  console.log(`  Sinchon-ro ends: [${W(SINCHON[0])}] [${W(SINCHON.at(-1))}]; zone D-1 at [${gz}]`);
}
