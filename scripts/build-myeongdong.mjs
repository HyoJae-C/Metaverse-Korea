#!/usr/bin/env node
// Builds Myeongdong (public/regions/another-seoul/districts/myeongdong.json):
// Myeongdong Cathedral on its hill-top yard and part of the Myeongdong
// shopping streets, between Eulji-ro (north), Toegye-ro (south),
// Namdaemun-ro (west) and Samil-daero (east).
//
// The streets and the cathedral grounds are OpenStreetMap's at 1/4
// (scripts/data/myeongdong-osm.json, from Yozi's export of 2026-11-11,
// © OpenStreetMap contributors, ODbL):
//   - Samil-daero and Namdaemun-ro, the big roads either side, on their real
//     lines; Namdaemun-ro runs on south-west to Sungnyemun's ring road.
//   - The shopping street north-south through the middle (Myeongdong 9-gil,
//     2-gil and 8-gil in OSM), Myeongdong-gil across it from Namdaemun-ro to
//     the cathedral's front yard and Samil-daero, and Myeongdong 10-gil from
//     Myeongdong Station up past the cathedral's west side.
//   - Buildings: one row along each street (Yozi 2026-11-10, like Seongsu);
//     the blocks behind stay open. Every building and shop is fictional.
//   - The cathedral: its grounds at 1/4, the church itself at 50% (Yozi
//     2026-11-11, like Gwanghwamun: at 1/4 the bell tower would be lower
//     than the shops round it). Its middle is the real main hall's middle,
//     turned like the real one: the bell tower north-north-west onto the
//     front yard and Myeongdong-gil, the round apse south-south-east.
//
//   node scripts/build-myeongdong.mjs     writes the map and sets the "at" of
//                                          the shops in SHOPS (stores.json)
//
// The district's (0, 0) is the cathedral's middle (its anchor in
// region.json). Coordinates here are world metres (x east, z south;
// src/core/seoul-grid.js); the map is written in the district's own metres.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, town, nearestOn, strips, lineDist, facing, simplify } from './street-rows.mjs';
import { toLatLon } from '../src/core/seoul-grid.js';
import { CATHEDRAL } from '../src/data/myeongdong.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'myeongdong-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const street = (en) => OSM.roads.find((r) => r.en === en);
const linkRoad = (en) => region.links.find((l) => l.n?.en === en);

// ---------- The cathedral (world metres) ----------
// Its axis from the real main hall's outline: the long way across it
// (principal axis), pointing from the apse to the bell tower (north-north-
// west), and its middle half way between the two ends.
export const HALL = (() => {
  const p = OSM.cathedral.p;
  const cx = p.reduce((t, q) => t + q[0], 0) / p.length, cz = p.reduce((t, q) => t + q[1], 0) / p.length;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z] of p) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); }
  const a = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  let f = [Math.cos(a), Math.sin(a)];
  if (f[1] > 0) f = [-f[0], -f[1]]; // towards the bell tower: north (z down)
  const s = p.map(([x, z]) => (x - cx) * f[0] + (z - cz) * f[1]);
  const lo = Math.min(...s), hi = Math.max(...s), mid = (lo + hi) / 2;
  const at = [r1(cx + f[0] * mid), r1(cz + f[1] * mid)];
  return { at, front: [Number(f[0].toFixed(4)), Number(f[1].toFixed(4))], realLen: r1((hi - lo) * 4) };
})();
const F = HALL.front, S = [-F[1], F[0]]; // S: to the church's right as you face its front
const onHall = (along, side) => [r1(HALL.at[0] + F[0] * along + S[0] * side), r1(HALL.at[1] + F[1] * along + S[1] * side)];
const hallRect = (a0, a1, half) => [onHall(a1, -half), onHall(a1, half), onHall(a0, half), onHall(a0, -half)];
const K = CATHEDRAL; // the model's sizes (game metres, 50% of the real church)
// Collision: the nave with its aisles, the bell tower in front, the transept
// and the apse round the back (each a convex outline; drawn by the landmark).
const halfW = K.width / 2, L2 = K.length / 2;
const hallParts = [
  hallRect(-L2 + K.apse, L2 - K.tower.d, halfW),
  hallRect(L2 - K.tower.d, L2, K.tower.w / 2),
  hallRect(K.transept.a0, K.transept.a1, halfW + K.transept.out),
  // the apse: half a ten-sided ring round its middle
  (() => {
    const c = -L2 + K.apse, pts = [];
    for (let i = 0; i <= 5; i++) { const t = Math.PI / 2 + (i / 5) * Math.PI; pts.push(onHall(c + Math.cos(t) * K.apse, Math.sin(t) * halfW)); }
    return pts;
  })(),
];
const ry = facing(F[0], F[1]); // the model faces +z: its front along F

// ---------- Roads ----------
const ROAD = {
  'Samil-daero': { k: 'primary', w: 14 },
  'Namdaemun-ro': { k: 'secondary', w: 12 },
  'Myeongdong 9-gil': { k: 'walk', w: 6 },
  'Myeongdong 2-gil': { k: 'walk', w: 6 },
  'Myeongdong 8-gil': { k: 'walk', w: 6 },
  'Myeongdong-gil': { k: 'walk', w: 6 },
  'Myeongdong 10-gil': { k: 'walk', w: 5 },
};
const roads = Object.entries(ROAD).map(([en, o]) => ({ ...o, p: street(en).p, n: street(en).n }));
const SAMIL = street('Samil-daero').p, MAIN = [...street('Myeongdong 9-gil').p, ...street('Myeongdong 2-gil').p.slice(1), ...street('Myeongdong 8-gil').p.slice(1)];
const MDGIL = street('Myeongdong-gil').p, GIL10 = street('Myeongdong 10-gil').p;
// The link roads round it (region.json): Eulji-ro, Toegye-ro and Sopa-ro.
const LINKS = ['Eulji-ro', 'Toegye-ro', 'Sopa-ro'].map((en) => { const l = linkRoad(en); return { k: l.k, w: l.w, p: l.p, n: l.n }; });

const buildings = [], areas = [], blockers = [], landmarks = [], pois = [];

// The yard: the real grounds, paved; the church on it.
const GROUNDS = OSM.grounds.p;
areas.push({ k: 'plaza', p: GROUNDS });
for (const p of hallParts) buildings.push({ h: K.eave, custom: 1, p, n: N('명동대성당', 'Myeongdong Cathedral', '明洞大聖堂', '明洞大教堂') });
landmarks.push({ type: 'cathedral', x: HALL.at[0], z: HALL.at[1], ry });
// Old trees round the yard's edge, off the front yard and the church.
const TREES = [];
{
  const n = GROUNDS.length;
  for (let i = 0; i < n; i++) {
    const [a, b] = [GROUNDS[i], GROUNDS[(i + 1) % n]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 3; s < L - 2; s += 7) {
      const q = [a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L];
      // 2.5 m in from the edge (towards the yard's middle)
      const c = HALL.at, d = Math.hypot(c[0] - q[0], c[1] - q[1]);
      const t = [r1(q[0] + ((c[0] - q[0]) * 2.5) / d), r1(q[1] + ((c[1] - q[1]) * 2.5) / d)];
      const along = (t[0] - HALL.at[0]) * F[0] + (t[1] - HALL.at[1]) * F[1], side = (t[0] - HALL.at[0]) * S[0] + (t[1] - HALL.at[1]) * S[1];
      const clearOfHall = Math.abs(side) > halfW + K.transept.out + 3 || along < -L2 - 3 || along > L2 + 3;
      const offFrontYard = !(along > L2 && Math.abs(side) < halfW + 4); // keep the view of the front open
      const offRoads = roads.every((r) => lineDist(t, r.p) > r.w / 2 + 2.5);
      if (clearOfHall && offFrontYard && offRoads) TREES.push(t);
    }
  }
}
landmarks.push({ type: 'shrinetrees', x: 0, z: 0, spots: TREES }); // (spots in the district's metres: moved below)

// The board on the front yard, to the left of the bell tower (facts checked
// 2026-11-11: Archdiocese of Seoul, Korea Heritage Service).
const BOARD = onHall(L2 + 7, -halfW + 1);
landmarks.push({
  type: 'sign', x: BOARD[0], z: BOARD[1], ry,
  title: N('명동대성당', 'Myeongdong Cathedral', '明洞大聖堂', '明洞大教堂'),
  text: {
    ko: '1898년에 완공된 한국 최초의 고딕 양식 벽돌 성당이에요. 천주교 서울대교구의 주교좌 성당이고, 사적으로 지정돼 있어요. 지금도 매일 미사를 드리는 곳이니 조용히 둘러봐 주세요.',
    en: 'Finished in 1898, it was the first Gothic-style brick church in Korea. It is the cathedral of the Catholic Archdiocese of Seoul and a Historic Site of Korea. Mass is still said here every day, so please look round quietly.',
    ja: '1898年に完成した、韓国で最初のゴシック様式のれんがの聖堂です。カトリック・ソウル大司教区の司教座聖堂で、史跡に指定されています。今も毎日ミサが行われているので、静かに見学してください。',
    zh: '建于1898年，是韩国第一座哥特式砖造教堂。它是天主教首尔总教区的主教座堂，被列为韩国史迹。这里至今每天都有弥撒，请安静参观。',
  },
});
pois.push({ kind: 'landmark', x: onHall(L2 + 4, 0)[0], z: onHall(L2 + 4, 0)[1], name: N('명동대성당', 'Myeongdong Cathedral', '明洞大聖堂', '明洞大教堂') });
// The shopping street's name on the map, half way along.
pois.push({ kind: 'landmark', x: -1569, z: -515, name: N('명동거리', 'Myeongdong shopping street', '明洞ショッピングストリート', '明洞购物街') });

// ---------- Rows along the streets ----------
// The district: from Namdaemun-ro to just past Samil-daero, from Eulji-ro's
// south side to Toegye-ro's north side (the links are kept clear as roads).
const inside = ([x, z]) => x > -1700 && x < -1440 && z > -596 && z < -446;
const open = [{ p: GROUNDS }, ...hallParts.map((p) => ({ p }))];
const t = town(11, { inside, roads: [...roads, ...LINKS], open });
const SHOP = { w: [7, 11], h: [8, 18], depth: 7 }; // (the real blocks are small: 15-25 m between lanes at 1/4)
const between = (p, from, to) => p.filter(([x]) => x >= Math.min(from, to) && x <= Math.max(from, to));
// Rows go along each straight piece of a street, and the lanes bend every
// few metres, so they follow the streets straightened (within 1 m).
const straight = (p) => simplify(p, 1);
// The shopping street, both sides; Myeongdong-gil and 10-gil, both sides.
t.row('mainW', straight(MAIN), 1, { off: 5.3, ...SHOP });
t.row('mainE', straight(MAIN), -1, { off: 5.3, ...SHOP });
t.row('gilN', straight(MDGIL), -1, { off: 5.3, ...SHOP });
t.row('gilS', straight(MDGIL), 1, { off: 5.3, ...SHOP });
t.row('gil10W', straight(GIL10), -1, { off: 4.8, ...SHOP });
t.row('gil10E', straight(GIL10), 1, { off: 4.8, ...SHOP });
// The big streets: offices and hotels, taller (Yozi: shops where it is busy, quiet buildings outside).
const BIG = { w: [14, 22], h: [18, 34], depth: 16, gap: 2 };
t.row('samilW', straight(SAMIL), -1, { off: 9.5, ...BIG });
t.row('samilE', straight(SAMIL), 1, { off: 9.5, ...BIG });
const EULJI = LINKS[0].p, TOEGYE = LINKS[1].p;
t.row('euljiS', between(EULJI, -1606, -1500), 1, { off: 10.5, ...BIG }); // (east of Namdaemun-ro: west of it is not Myeongdong)
t.row('toegyeN', between(TOEGYE, -1662, -1470), -1, { off: 10.5, ...SHOP });
buildings.push(...t.buildings);

// Shops: Myeongdong's skincare and lip-tint shops along the shopping street,
// by the crossing with Myeongdong-gil (moved from Seongsu, which stood in for
// Myeongdong until it was on the map: memory shop-distribution-ratios).
export const SHOPS = ['mulbangul-skin', 'moonlight-beauty', 'lip-red', 'lip-pink'];
const CROSSING = [-1571.7, -533.5];
// The Information Center by the real Myeongdong Tourist Information Center
// (OSM), on the shopping street's north part.
const INFO = { id: 'info-myeongdong', near: [-1561.2, -571.8] };
// The cathedral's door (its inside: core/cathedral-hall.js): the ring 1.7 m in
// front of the bell tower's main door; "face" in stores.json is the hall's ry.
export const DOOR = { id: 'myeongdong-cathedral', at: onHall(L2 + 1.7, 0) };

// ---------- Into the district's own metres ----------
const anchor = toLatLon(...HALL.at);
const OFFSET = region.districts.find((d) => d.id === 'myeongdong')?.offset || HALL.at.map(Math.round);
const [ox, oz] = OFFSET;
const Lp = (p) => p.map(([x, z]) => [r1(x - ox), r1(z - oz)]);
const Lx = (o) => ({ ...o, x: r1(o.x - ox), z: r1(o.z - oz), ...(o.spots ? { spots: Lp(o.spots), x: 0, z: 0 } : {}) });
const map = {
  meta: {
    district: 'myeongdong',
    parts: [],
    source: 'OpenStreetMap streets and cathedral grounds at 1/4 (© OpenStreetMap contributors, ODbL; scripts/data/myeongdong-osm.json); the cathedral at 50% (Yozi 2026-11-11); other buildings and shops are fictional. Built by scripts/build-myeongdong.mjs',
  },
  roads: roads.map((r) => ({ ...r, p: Lp(r.p) })),
  buildings: buildings.map((b) => ({ ...b, p: Lp(b.p) })),
  rail: [],
  areas: areas.map((a) => ({ ...a, p: Lp(a.p) })),
  blockers: blockers.map((b) => ({ p: Lp(b.p) })),
  pois: pois.map(Lx),
  landmarks: landmarks.map(Lx),
};
// For the overlap check: the map in 25 m strips (its edges follow the streets).
map.meta.parts = strips(map, 25, 'Myeongdong: the cathedral and the streets round it');

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writeFileSync(path.join(R, 'districts', 'myeongdong.json'), JSON.stringify(map, null, 1) + '\n');
  // stores.json is hand-formatted, so only the "at" of each placed shop is
  // rewritten in the text.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const setAt = (sid, at) => {
    const m = new RegExp(`"id":\\s*"${sid}"`).exec(stores);
    if (!m) throw new Error(`${sid}: not in stores.json`);
    const i = m.index;
    let end = stores.indexOf('{"id"', i + 5), end2 = stores.indexOf('\n    {', i);
    end = Math.min(...[end, end2, stores.length].filter((v) => v > 0));
    const part = stores.slice(i, end).replace(/"at":\s*\[[^\]]*\]/, (s) => (s.includes(': ') ? `"at": [${at[0]}, ${at[1]}]` : `"at":[${at[0]},${at[1]}]`));
    stores = stores.slice(0, i) + part + stores.slice(end);
  };
  const lots = ['mainW', 'mainE'].flatMap((id) => t.lots[id] || []);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const info = lots.splice(lots.indexOf(lots.reduce((m, q) => (dist(q, INFO.near) < dist(m, INFO.near) ? q : m))), 1)[0];
  setAt(INFO.id, info);
  console.log(`  ${INFO.id}: [${info}], ${r1(dist(info, INFO.near))} m from the real one`);
  lots.sort((a, b) => Math.hypot(a[0] - CROSSING[0], a[1] - CROSSING[1]) - Math.hypot(b[0] - CROSSING[0], b[1] - CROSSING[1]));
  if (lots.length < SHOPS.length) throw new Error(`only ${lots.length} lots for ${SHOPS.length} shops`);
  SHOPS.forEach((sid, i) => setAt(sid, lots[i]));
  setAt(DOOR.id, DOOR.at);
  writeFileSync(path.join(R, 'stores.json'), stores);
  const front = onHall(L2, 0);
  console.log(`myeongdong: ${map.roads.length} roads, ${map.buildings.length} buildings (${hallParts.length} of them the cathedral), ${TREES.length} trees`);
  console.log(`  cathedral middle [${HALL.at}] (lat ${anchor.lat.toFixed(6)}, lon ${anchor.lon.toFixed(6)}), front towards [${F}], ry ${ry}; real hall ${HALL.realLen} m long in OSM`);
  console.log(`  bell tower front [${front}], ${r1(nearestOn(front, MDGIL).d)} m from Myeongdong-gil; east side ${r1(Math.min(...hallParts.flat().map((q) => lineDist(q, SAMIL))) - 7)} m from Samil-daero's kerb`);
  for (const [k, v] of Object.entries(t.lots)) console.log('  ', k, v.length);
  SHOPS.forEach((sid, i) => console.log(`  ${sid}: [${lots[i]}]`));
  console.log(`  ${DOOR.id}: door [${DOOR.at}], face ${ry.toFixed(3)}`);
}
