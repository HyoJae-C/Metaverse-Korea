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
//   - Toegye-ro 20-gil, south of Toegye-ro, up to Sopa-ro and the Namsan
//     cable car (the real way there on foot), with plain rows along it.
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
import { r1, town, nearestOn, strips, lineDist, facing, simplify, overlap } from './street-rows.mjs';
import { toLatLon, toGame } from '../src/core/seoul-grid.js';
import { CATHEDRAL } from '../src/data/myeongdong.js';
import { yardHeight, yardFrame } from '../src/core/cathedral-yard-ground.js';

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
// The walk up to the Namsan cable car, the way people really go: out of
// Myeongdong Station's exit 4 (or down 10-gil from the cathedral), across
// Toegye-ro and up Toegye-ro 20-gil past the hillside hotels to Sopa-ro,
// where the lower station is (scripts/build-namsan.mjs). Its real line, from
// Toegye-ro's middle to Sopa-ro's so it joins both.
export const GIL20 = (() => {
  const real = street('Toegye-ro 20-gil').p;
  return simplify([nearestOn(real[0], LINKS[1].p).at, ...real, nearestOn(real.at(-1), LINKS[2].p).at], 0.5).map(([x, z]) => [r1(x), r1(z)]);
})();
roads.push({ k: 'walk', w: 6, p: GIL20, n: street('Toegye-ro 20-gil').n });

const buildings = [], areas = [], blockers = [], landmarks = [], pois = [];

// The yard: the real grounds, paved; the church on it.
const GROUNDS = OSM.grounds.p;
areas.push({ k: 'plaza', p: GROUNDS });

// ---------- The hill: the yard up on its terrace, the stairs ----------
// The real church stands on a hill (종현) above Myeongdong-gil: its yard is
// a terrace held up by brick walls, reached by the wide straight stairs on
// the church's axis in front of the bell tower (OSM 1193247326 and the
// steps below it; Yozi 2026-11-11: "a key feature") or by the service road
// west of them (OSM 1537435146), a ramp. Heights at 50% like the church: the
// yard about 8 m above the street for real -> 4 m; the stairs 25 steps of
// 16 cm (people-sized), 4.5 m wide (real about 9 m; 1/4 would be narrower
// than one person's door). Height maths: src/core/cathedral-yard-ground.js.
// why: the church at 50% reaches 9 m further towards the street than the
// real one, so the yard in front of it and the stairs move with it: the
// real flight runs 17-21 m along the axis from the hall's middle, ours 21-29
// (its top 4 m, its foot 8 m from the real ones); the ramp is on its real
// line.
const YH = 4, STEPS = 25, TREAD = 0.32;
const axisRoad = (() => { // where Myeongdong-gil crosses the church's axis (metres along it)
  let best = null;
  for (let a = L2; a < L2 + 30; a += 0.1) { const d = nearestOn(onHall(a, 0), MDGIL).d; if (!best || d < best.d) best = { a, d }; }
  return best.a;
})();
const CUT = r1(axisRoad - ROAD['Myeongdong-gil'].w / 2 - 0.4); // the terrace stops at the street's kerb
const A1 = r1(CUT - 0.5), A0 = r1(A1 - STEPS * TREAD);
export const YARD = {
  type: 'cathedralyard', x: HALL.at[0], z: HALL.at[1], f: F, h: YH, cut: CUT,
  stairs: { a0: A0, a1: A1, w: 4.5, n: STEPS },
  ramp: { r0: L2, blend: 3, side: -8.3, w: 3 }, // (side, w: the paved ramp, on the real service road's line)
  // A small lawn behind the apse, where trees stood (Yozi 2026-11-11: no
  // trees behind the church, a little green there instead): along the axis
  // from a0 to a1, w across.
  green: { a0: r1(-L2 - 1.5), a1: r1(-L2 - 11), w: 14 },
  yard: GROUNDS.map(([x, z]) => [r1(x - HALL.at[0]), r1(z - HALL.at[1])]),
};
const yardAt = ([x, z]) => yardHeight(YARD, x - HALL.at[0], z - HALL.at[1]);
landmarks.push({ ...YARD, why: 'Stairs and yard moved 4-8 m towards the street with the 50% church (its front is 9 m past the real one); heights at 50% (yard 4 m).' });
// The terrace's walls are walls: you can't walk off the yard or climb it
// from the street, except up the stairs or the ramp (low: the camera may
// look over them).
{
  const wall = (a, b, t = 0.4) => { // a thin box from a to b, t thick, to the right of a->b
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[1] - a[1]) / L * t, nz = -(b[0] - a[0]) / L * t;
    blockers.push({ low: 1, p: [a, b, [r1(b[0] + nx), r1(b[1] + nz)], [r1(a[0] + nx), r1(a[1] + nz)]].map(([x, z]) => [r1(x), r1(z)]) });
  };
  const n = GROUNDS.length, cx = HALL.at[0], cz = HALL.at[1];
  const local = ([x, z]) => yardFrame(YARD, x - cx, z - cz);
  // The grounds' edge, a metre at a time, where the ground inside is above a step.
  for (let i = 0; i < n; i++) {
    const a = GROUNDS[i], b = GROUNDS[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(L)), at = (j) => [a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k];
    let run = -1; // the walled pieces in a row make one wall
    for (let j = 0; j <= k; j++) {
      let up = false;
      if (j < k) {
        const p0 = at(j), p1 = at(j + 1), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], d = Math.hypot(cx - m[0], cz - m[1]);
        const inner = [m[0] + ((cx - m[0]) * 0.5) / d, m[1] + ((cz - m[1]) * 0.5) / d];
        up = local(m)[0] <= CUT && yardAt(inner) > 0.4;
      }
      if (up && run < 0) run = j;
      if (!up && run >= 0) { wall(at(run), at(j)); run = -1; }
    }
  }
  // Along the kerb, east of the stairs (the brick wall over Myeongdong-gil),
  // and up the stairs' east side; the hand rail up their west side.
  const hw = YARD.stairs.w / 2;
  let east = hw;
  while (yardAt(onHall(CUT - 0.3, east + 0.5)) > 0.4) east += 0.5;
  wall(onHall(CUT + 0.4, east), onHall(CUT + 0.4, hw));
  wall(onHall(A0, hw), onHall(CUT + 0.4, hw));
  wall(onHall(A1, -hw), onHall(A0, -hw), 0.15);
}

for (const p of hallParts) buildings.push({ h: K.eave, y: YH, custom: 1, p, n: N('명동대성당', 'Myeongdong Cathedral', '明洞大聖堂', '明洞大教堂') });
landmarks.push({ type: 'cathedral', x: HALL.at[0], z: HALL.at[1], y: YH, ry });
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
      const offBack = along > -L2 + K.apse; // (none behind the church: the lawn is there)
      if (clearOfHall && offFrontYard && offBack && offRoads && yardAt(t) === YH) TREES.push(t); // (up on the terrace, where they stand)
    }
  }
}
landmarks.push({ type: 'shrinetrees', x: 0, z: 0, y: YH, spots: TREES }); // (spots in the district's metres: moved below)

// The board on the front yard, beside the bell tower on its east (facts
// checked 2026-11-11: Archdiocese of Seoul, Korea Heritage Service).
const BOARD = onHall(A0 - 1.3, halfW - 1);
landmarks.push({
  type: 'sign', x: BOARD[0], z: BOARD[1], y: YH, ry,
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

// A board at the foot of Toegye-ro 20-gil, on its east pavement just up
// from Toegye-ro (by exit 4), facing people coming across the road.
{
  const d = nearestOn(GIL20[0], GIL20).dir, at = [r1(GIL20[0][0] + d[0] * 14 + d[1] * 4.6), r1(GIL20[0][1] + d[1] * 14 - d[0] * 4.6)];
  landmarks.push({
    type: 'sign', x: at[0], z: at[1], ry: facing(-d[0], -d[1]),
    title: N('남산 하늘 케이블카 →', 'Namsan Sky Cable →', '南山スカイケーブル →', '南山天空缆车 →'),
    text: {
      ko: '이 길(퇴계로20길)을 따라 올라가면 소파로에 남산 하늘 케이블카 승강장이 있어요.',
      en: 'Walk up this lane (Toegye-ro 20-gil) to Sopa-ro: the Namsan Sky Cable lower station is just there.',
      ja: 'この道(退渓路20キル)を上ると、素坡路に南山スカイケーブルの乗り場があります。',
      zh: '沿这条小路(退溪路20街)往上走到素坡路，就是南山天空缆车的乘车处。',
    },
  });
}

// ---------- Myeongdong Station (Line 4, 424) ----------
// Two exits, from the real 6 and 4 (OSM 3403067532, 3403067533), moved out
// of Toegye-ro onto its pavements (at 1/4 the real ones fall in the road),
// the stairs going down along the road:
//   6: north side, just west of the foot of the shopping street (Myeongdong
//      8-gil, where the real one is), its mouth east onto the lane;
//   4: south side, across the road, towards Namsan and its cable car, its
//      mouth west.
export const STATION_EXITS = {
  6: { real: toGame(37.5609256, 126.984915), side: -1, along: -6, flip: true },
  4: { real: toGame(37.5606753, 126.9848244), side: 1, along: 3 },
};
export function stationExits(out = 11) {
  const TG = linkRoad('Toegye-ro').p;
  return Object.entries(STATION_EXITS).map(([n, { real, side, along = 0, flip }]) => {
    const { at: on, dir } = nearestOn(real, TG), at = [on[0] + dir[0] * along, on[1] + dir[1] * along];
    const nx = -dir[1] * side, nz = dir[0] * side; // side +1: south of the road
    return { n: Number(n), at: [r1(at[0] + nx * out), r1(at[1] + nz * out)], ry: Number((Math.atan2(dir[0], dir[1]) + (flip ? -Math.PI : 0)).toFixed(4)), real: real.map(r1) };
  });
}
const exitSquares = stationExits().map(({ at: [x, z] }) => ({ p: [[x - 5, z - 5], [x + 5, z - 5], [x + 5, z + 5], [x - 5, z + 5]] }));

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
// (The station exits' squares are cleared afterwards, so the rest of the
// rows stay as they were before the station.)
// Behind the church, the tall block right on its axis is left out, so the
// apse stands clear against the sky from Toegye-ro (Yozi 2026-11-11).
const BEHIND = onHall(-45, -4.5);
const inPoly = ([x, z], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
buildings.push(...t.buildings.filter((b) => !exitSquares.some((q) => overlap(q.p, b.p)) && !inPoly(BEHIND, b.p)));
// Toegye-ro 20-gil: one row of quiet buildings (hotels, offices) each side,
// south of Toegye-ro, stopping short of Sopa-ro and the cable car's station
// (its own town, so the rows above stay as they were). Plain: Yozi
// 2026-11-11 "가는길 건물까지 완전하게 할필요없고".
const SOPA = LINKS[2].p;
const insideGil = ([x, z]) => x > -1600 && x < -1480 && z > -460 && z < -340 && lineDist([x, z], SOPA) > LINKS[2].w / 2 + 4;
const t20 = town(20, { inside: insideGil, roads: [...roads, ...LINKS], open: exitSquares });
const QUIET = { off: 5, w: [8, 13], h: [10, 22], depth: 11, gap: 2.5 };
t20.row('gil20E', GIL20, -1, QUIET); // (the lane runs south from Toegye-ro: -1 is its left, east)
t20.row('gil20W', GIL20, 1, QUIET);
buildings.push(...t20.buildings);

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
  blockers: blockers.map((b) => ({ ...b, p: Lp(b.p) })),
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
  if (!new RegExp(`"id": "${DOOR.id}"[^\n]*"y": ${YH}[,}]`).test(stores)) throw new Error(`${DOOR.id}: set "y": ${YH} in stores.json (the door is up on the yard)`);
  writeFileSync(path.join(R, 'stores.json'), stores);
  const front = onHall(L2, 0);
  console.log(`myeongdong: ${map.roads.length} roads, ${map.buildings.length} buildings (${hallParts.length} of them the cathedral), ${TREES.length} trees`);
  console.log(`  cathedral middle [${HALL.at}] (lat ${anchor.lat.toFixed(6)}, lon ${anchor.lon.toFixed(6)}), front towards [${F}], ry ${ry}; real hall ${HALL.realLen} m long in OSM`);
  console.log(`  bell tower front [${front}], ${r1(nearestOn(front, MDGIL).d)} m from Myeongdong-gil; east side ${r1(Math.min(...hallParts.flat().map((q) => lineDist(q, SAMIL))) - 7)} m from Samil-daero's kerb`);
  for (const [k, v] of Object.entries(t.lots)) console.log('  ', k, v.length);
  SHOPS.forEach((sid, i) => console.log(`  ${sid}: [${lots[i]}]`));
  console.log(`  ${DOOR.id}: door [${DOOR.at}], face ${ry.toFixed(3)}`);
  console.log(`  yard ${YH} m up; stairs ${A0}-${A1} m along the axis (kerb ${CUT}), ${blockers.length} wall pieces`);
  for (const e of stationExits()) console.log(`  station exit ${e.n}: [${e.at}], ry ${e.ry} (${r1(Math.hypot(e.at[0] - e.real[0], e.at[1] - e.real[1]))} m from the real one)`);
}
