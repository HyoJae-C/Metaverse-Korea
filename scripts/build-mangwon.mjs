// Mangwon-dong (districts/mangwon.json) at 1/4 on its real place: the real
// streets from OpenStreetMap (scripts/data/mangwon-osm.json), Mangwon Market
// on its real alley under its arcade roof, and Mangwon Han River Park on the
// real bank. scripts/build-mapo.mjs writes the map and puts the shops on it.
//
// The map is drawn in the bank's frame: u along the river (south-east, down
// the river), v across it (v > 0 is the river). The bank there runs straight
// to within 3 m, so it is the line v = 0 from u -280 to 225. ORIGIN, the frame's
// origin on the bank, is the district's offset in region.json.
//
//        Worldcup-ro (Mangwon Station)            ↗ Hapjeong, Hongdae
//      Mangwon Market (alley under its roof)
//     Poeun-ro (Mangridan-gil)       Mangwon-ro, Donggyo-ro cross them
//    Huiujeong-ro
//   Gangbyeon-buk-ro
//  Mangwon Han River Park (path, lawn, pier, Seoul Battleship Park)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Han River ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'mangwon-osm.json'), 'utf8'));
// The river in front of the park: the south bank, Seonyudo, Yanghwa Han River
// Park and the two bridges, lat/lon from OpenStreetMap.
const RIVER = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'mangwon-river-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

export const ORIGIN = [-3400, -150]; // on the bank (world)
export const ANGLE = (42 * Math.PI) / 180; // the bank's direction
const U = [Math.cos(ANGLE), Math.sin(ANGLE)], V = [-U[1], U[0]];
export const at = (u, v) => [r1(u * U[0] + v * V[0]), r1(u * U[1] + v * V[1])]; // local
const local = ([x, z]) => [x - ORIGIN[0], z - ORIGIN[1]];
const toUV = ([x, z]) => [x * U[0] + z * U[1], x * V[0] + z * V[1]]; // from local
export const U_WEST = -280, U_EAST = 225; // the district along the river
export const EAST_X = -3197; // and nothing east of this (world x): Yeonnam and Hongdae are there
const V_NORTH = -335; // past Worldcup-ro
// Rotations (ry) for things turned with the frame.
const ROT = -ANGLE; // a thing drawn facing +z on an axis-aligned map
const along = (dx, dz) => r1(Math.atan2(dx, dz));

// Gangbyeon-buk-ro: its two carriageways run along the park at v -27 and
// -36 … -50; drawn here as one road down the middle.
export const GANGBYEON_V = -38, GANGBYEON_W = 18;
export const PATH_V = -12; // the Han River path, 12 m in from the water
export const PARK_BACK = GANGBYEON_V + GANGBYEON_W / 2 + 1; // where the park's trees start (v)
const TOWN = GANGBYEON_V - GANGBYEON_W / 2 - 3; // houses stay north of this (v)

// Seeded random numbers, so the map comes out the same every time.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- geometry
const segDist = (q, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L)) : 0;
  return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz);
};
const lineDist = (q, p) => p.reduce((m, _, i) => (i ? Math.min(m, segDist(q, p[i - 1], p[i])) : m), Infinity);
function inPoly(x, z, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
// Two convex quads overlap (separating axes).
function overlap(a, b) {
  for (const p of [a, b]) {
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], nx = z2 - z1, nz = x1 - x2;
      const pa = a.map(([x, z]) => x * nx + z * nz), pb = b.map(([x, z]) => x * nx + z * nz);
      if (Math.max(...pa) <= Math.min(...pb) + 0.3 || Math.max(...pb) <= Math.min(...pa) + 0.3) return false;
    }
  }
  return true;
}

// ---- streets (local metres)
const ROAD_N = {
  'Worldcup-ro': name('Worldcup-ro', '월드컵로', 'ワールドカップ路', '世界杯路'),
  'Poeun-ro (Mangridan-gil)': name('Poeun-ro (Mangridan-gil)', '포은로 (망리단길)', '圃隠路（望理団通り）', '圃隐路（望理团路）'),
  'Huiujeong-ro': name('Huiujeong-ro', '희우정로', '喜雨亭路', '喜雨亭路'),
  'Mangwon-ro': name('Mangwon-ro', '망원로', '望遠路', '望远路'),
  'Bangullae-ro': name('Bangullae-ro', '방울내로', 'パンウルレ路', '方蔚内路'),
  'Donggyo-ro': name('Donggyo-ro', '동교로', '東橋路', '东桥路'),
  'Seongsan-ro': name('Seongsan-ro', '성산로', '城山路', '城山路'),
  'Mangwon lane': name('Mangwon lane', '망원동 골목', '望遠洞の路地', '望远洞小巷'),
};
const MARKET = (() => {
  // The real market's alley: its outline's two far ends.
  const m = OSM.market.map(local);
  let best = [m[0], m[1], 0];
  for (const a of m) for (const b of m) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > best[2]) best = [a, b, d]; }
  const [a, b] = toUV(best[0])[1] < toUV(best[1])[1] ? [best[0], best[1]] : [best[1], best[0]]; // a: the north end (Worldcup-ro side)
  return { a: a.map(r1), b: b.map(r1), len: best[2] };
})();

export function mangwon() {
  const rand = rng(621);
  const roads = [
    ...OSM.roads.map((r) => ({ k: r.k, w: r.w, p: r.p.map(local).map((q) => q.map(r1)), n: ROAD_N[r.en] })),
    { k: 'primary', w: GANGBYEON_W, p: [at(U_WEST, GANGBYEON_V), at(U_EAST, GANGBYEON_V)], n: name('Gangbyeon-buk-ro', '강변북로', '江辺北路', '江边北路') },
  ];
  // Mangwon Market's alley, carried on to the streets at both ends. The
  // little lanes that cross it stop at its stalls (they would cut the rows).
  const [ma, mb] = [MARKET.a, MARKET.b];
  for (let i = roads.length - 1; i >= 0; i--) {
    const r = roads[i];
    if (r.n?.en !== 'Mangwon lane') continue;
    const pieces = [];
    let cur = [];
    for (let j = 1; j < r.p.length; j++) {
      const [a, b] = [r.p[j - 1], r.p[j]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let k = j === 1 ? 0 : 1; k <= n; k++) {
        const q = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
        if (segDist(q, ma, mb) < 20) { if (cur.length) pieces.push(cur); cur = []; } else cur.push(q);
      }
    }
    if (cur.length) pieces.push(cur);
    roads.splice(i, 1, ...pieces.filter((c) => c.length > 6).map((c) => ({ ...r, p: [c[0], c.at(-1)].map((q) => q.map(r1)) })));
  }
  const mdir = [(mb[0] - ma[0]) / MARKET.len, (mb[1] - ma[1]) / MARKET.len];
  const reach = (from, dir) => { // walk from a point along dir until a street
    for (let s = 1; s < 80; s += 0.5) {
      const q = [from[0] + dir[0] * s, from[1] + dir[1] * s];
      const r = roads.find((x) => x.k !== 'walk' && lineDist(q, x.p) < x.w / 2);
      if (r) return q.map(r1);
    }
    return null;
  };
  const north = reach(ma, [-mdir[0], -mdir[1]]), south = reach(mb, mdir);
  roads.push({ k: 'walk', w: 8, p: [north || ma, ma, mb, south || mb], n: name('Mangwon Market', '망원시장', '望遠市場', '望远市场') });
  // The way down to the river: Mangwon-ro's south end, across Gangbyeon-buk-ro
  // (the Mangwon underpass) to the river path.
  const mangwonRo = roads.find((r) => r.n?.en === 'Mangwon-ro');
  const mEnd = mangwonRo.p.reduce((a, q) => (toUV(q)[1] > toUV(a)[1] ? q : a));
  const WAY_U = r1(toUV(mEnd)[0]);
  roads.push({ k: 'walk', w: 6, p: [mEnd, at(WAY_U, PATH_V)], n: name('Way to the Han River', '한강공원 가는 길', '漢江公園への道', '去汉江公园的路') });
  roads.push({ k: 'walk', w: 5, p: [at(U_WEST, PATH_V), at(U_EAST, PATH_V)], n: name('Han River path', '한강 산책로', '漢江の散歩道', '汉江步道') });

  // ---- buildings: rows along the streets, then houses filling the blocks
  const buildings = [], lots = {};
  const solidRoads = roads;
  const clearOf = (q, gap) => solidRoads.every((r) => lineDist(q, r.p) > r.w / 2 + gap);
  const seongsan = roads.find((r) => r.n?.en === 'Seongsan-ro').p;
  // east of Seongsan-ro (it crosses the map's west end towards Seongsan Bridge)
  const eastOfSeongsan = (q) => { const [u, v] = toUV(q); const i = seongsan.findIndex((p, k) => k && (toUV(p)[1] - v) * (toUV(seongsan[k - 1])[1] - v) <= 0); if (i < 0) return true; const [a, b] = [toUV(seongsan[i - 1]), toUV(seongsan[i])]; return u > a[0] + ((b[0] - a[0]) * (v - a[1])) / (b[1] - a[1] || 1); };
  const inTown = (q) => { const [u, v] = toUV(q); return eastOfSeongsan(q) && u > U_WEST + 4 && u < U_EAST - 4 && v > V_NORTH + 4 && v < TOWN && q[0] + ORIGIN[0] < EAST_X; };
  const fits = (p) => {
    const probe = [...p, ...p.map((q, i) => { const n = p[(i + 1) % 4]; return [(q[0] + n[0]) / 2, (q[1] + n[1]) / 2]; }), [(p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2]];
    return probe.every((q) => inTown(q) && clearOf(q, 1.2)) && buildings.every((b) => !overlap(b.p, p));
  };
  // A row along one side of a street (side +1: to the left going along it).
  function row(id, line, side, { off, depth = 11, w = [8, 13], h = [6, 12], from = 0, to = Infinity } = {}) {
    const list = (lots[id] ||= []);
    let s0 = 0;
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1] * side, d[0] * side];
      let s = 2;
      while (s + w[0] < L - 2) {
        const len = Math.min(w[0] + rand() * (w[1] - w[0]), L - 2 - s);
        if (s0 + s >= from && s0 + s + len <= to) {
          const q = (t, o) => [r1(a[0] + d[0] * t + n[0] * o), r1(a[1] + d[1] * t + n[1] * o)];
          const p = [q(s, off), q(s + len, off), q(s + len, off + depth), q(s, off + depth)];
          if (fits(p)) {
            buildings.push({ h: Math.round(h[0] + rand() * (h[1] - h[0])), p });
            list.push(q(s + len / 2, off - 2.5)); // the shop's spot: the middle of the front, out on the pavement
          }
        }
        s += len;
      }
      s0 += L;
    }
  }
  const road = (en) => roads.filter((r) => r.n?.en === en);
  const longest = (en) => road(en).reduce((a, r) => (r.p.length > a.p.length || (r.p.length === a.p.length && Math.hypot(r.p.at(-1)[0] - r.p[0][0], r.p.at(-1)[1] - r.p[0][1]) > Math.hypot(a.p.at(-1)[0] - a.p[0][0], a.p.at(-1)[1] - a.p[0][1])) ? r : a));
  const H = { w: [10, 15], h: [6, 13], depth: 13 };
  const STALL = { w: [6, 8], h: [4, 5], depth: 10 };
  // (stall fronts 1.5 m off the alley, under the roof's edge)
  // Mangwon Market: stalls both sides of the alley (west: to its right going south).
  const alley = [ma, mb];
  row('marketW', alley, -1, { off: 5.5, ...STALL });
  row('marketE', alley, 1, { off: 5.5, ...STALL });
  // Poeun-ro (Mangridan-gil): cafés both sides, along its long run.
  const poeun = longest('Poeun-ro (Mangridan-gil)').p;
  row('poeunN', poeun, -1, { off: 6.5, ...H });
  row('poeunS', poeun, 1, { off: 6.5, ...H });
  // Worldcup-ro: both sides (a wide pavement for Mangwon Station's exits).
  const worldcup = road('Worldcup-ro')[0].p;
  row('worldcupN', worldcup, -1, { off: 12, depth: 12, w: [10, 16], h: [9, 16] });
  row('worldcupS', worldcup, 1, { off: 12, depth: 12, ...H });
  // Huiujeong-ro: the Information Center and houses.
  const huiu = road('Huiujeong-ro')[0].p;
  row('huiujeongN', huiu, -1, { off: 7, ...H });
  for (const en of ['Mangwon-ro', 'Donggyo-ro', 'Bangullae-ro']) for (const r of road(en)) { row(en, r.p, 1, { off: 7, ...H }); row(en, r.p, -1, { off: 7, ...H }); }
  // Nothing fills the blocks behind the rows: open and light, like Seongsu
  // (Yozi 2026-11-10: the full blocks were too dense).

  // ---- areas
  const rect = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  const LAWN = [PARK_U - PARK_LAWN[1], PARK_U - PARK_LAWN[0]]; // (u) the picnic lawn
  const areas = [
    { k: 'park', trees: true, p: rect(U_WEST, PARK_BACK, U_EAST, PATH_V - 3) },
    { k: 'grass', p: rect(U_WEST, PATH_V + 3, U_EAST, 0) },
    // The picnic lawn by the water east of the pier (no trees): mats and frisbees.
    { k: 'grass', lawn: true, p: rect(Math.min(...LAWN), -9, Math.max(...LAWN), -1.2) },
    ...RIVER_AREAS.areas,
  ];
  const blockers = [{ p: RIVER_AREAS.block }];
  const mid = [(ma[0] + mb[0]) / 2, (ma[1] + mb[1]) / 2];
  const mry = along(mdir[0], mdir[1]); // the alley's direction (south-east)
  const poeunMid = poeun[Math.floor(poeun.length / 2)];
  const pd = (() => { const i = Math.floor(poeun.length / 2), a = poeun[i - 1] || poeun[i], b = poeun[i]; return along(b[0] - a[0], b[1] - a[1]); })();
  const wayTop = at(WAY_U, PARK_BACK);
  const landmarks = [
    { type: 'arch', ...xz(ma), w: 10, ry: r1(mry + Math.PI), title: 'MANGWON MARKET', sub: '망원시장', color: '#c0392b' },
    { type: 'arch', ...xz(mb), w: 10, ry: mry, title: 'MANGWON MARKET', sub: '망원시장', color: '#c0392b' },
    { type: 'arcade', ...xz(mid), ry: mry, len: r1(MARKET.len - 4), w: 12, h: 6.2, gap: 12 },
    { type: 'arch', ...xz(poeunMid), w: 10, ry: pd, title: 'MANGRIDAN-GIL', sub: '망리단길 · 포은로', color: '#6a4c93' },
    { type: 'arch', ...xz(wayTop), w: 8, ry: r1(ROT + Math.PI), title: 'MANGWON HAN RIVER PARK', sub: '망원한강공원', color: '#2f78b0' },
    { type: 'sign', ...xz(at(WAY_U + 12, PATH_V - 4)), ry: r1(ROT),
      title: name('Mangwon Han River Park', '망원한강공원', '望遠漢江公園', '望远汉江公园'),
      text: {
        en: 'A riverside park on the north bank of the Han River. Walk or cycle along the water, spread a mat on the grass, or try your luck at the fishing pier: some fish only bite here.',
        ko: '한강 북쪽 강변의 공원이에요. 강을 따라 걷거나 자전거를 타고, 잔디에 돗자리를 펴거나, 낚시 선착장에서 낚시를 해 보세요. 여기서만 잡히는 물고기도 있어요.',
        ja: '漢江の北岸にある川辺の公園です。川沿いを歩いたり自転車に乗ったり、芝生にシートを広げたり、釣り桟橋で釣りをしてみましょう。ここでしか釣れない魚もいます。',
        zh: '汉江北岸的江边公园。沿着江边散步、骑车，在草地上铺开野餐垫，或者去钓鱼码头碰碰运气：有些鱼只在这里咬钩。',
      } },
    // Seoul Battleship Park: the warship moored off the bank (core/han-park.js draws it), at its real spot.
    { type: 'sign', ...xz(at(SHIP_U + 10, PATH_V - 4)), ry: r1(ROT),
      title: name('Seoul Battleship Park', '서울함 공원', 'ソウル艦公園', '首尔舰公园'),
      text: {
        en: 'Three retired Korean Navy ships are moored at Mangwon Han River Park: a frigate, a patrol boat and a submarine. Since 2017 you can go aboard and see how sailors lived. In the game, the grey frigate is just to look at from the bank.',
        ko: '망원한강공원에는 퇴역한 해군 함정 세 척이 정박해 있어요. 호위함, 고속정, 잠수함이에요. 2017년부터 배에 올라가 수병들이 어떻게 지냈는지 볼 수 있어요. 게임에서는 회색 호위함을 강가에서 구경만 할 수 있어요.',
        ja: '望遠漢江公園には、退役した韓国海軍の艦艇3隻が停泊しています。護衛艦、高速艇、潜水艦です。2017年から船に乗って、水兵の暮らしを見学できます。ゲームでは灰色の護衛艦を岸から眺めるだけです。',
        zh: '望远汉江公园停泊着三艘退役的韩国海军舰艇：一艘护卫舰、一艘快艇和一艘潜艇。从2017年起可以登船参观水兵的生活。在游戏里，灰色的护卫舰只能在岸边观看。',
      } },
  ];
  for (const u of [WAY_U - 110, WAY_U + 90, WAY_U + 130, WAY_U + 170, WAY_U + 210]) landmarks.push({ type: 'bench', ...xz(at(u, -7)), ry: r1(ROT + Math.PI) }); // facing the river
  landmarks.push(...BRIDGES);
  // The park itself (game/han-parks.js): at the bank's edge, turned to face the river.
  landmarks.push({ type: 'hanpark', store: 'mangwon-hangang', ...xz(at(PARK_U, 0)), ry: r1(Math.PI - ANGLE), bounds: PARK.bounds, layout: PARK.layout });
  const pois = [
    { kind: 'landmark', ...xz(mid), name: name('Mangwon Market', '망원시장', '望遠市場', '望远市场') },
    { kind: 'landmark', ...xz(poeunMid), name: name('Mangridan-gil', '망리단길', '望理団通り', '望理团路') },
    { kind: 'landmark', ...xz(at(WAY_U, -20)), name: name('Mangwon Han River Park', '망원한강공원', '望遠漢江公園', '望远汉江公园') },
  ];
  return {
    map: {
      meta: { district: 'mangwon', source: 'scripts/build-mangwon.mjs, at 1/4 on the real place: streets, Mangwon Market\'s alley and Mangwon Station from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/mangwon-osm.json); the bank drawn straight (within 3 m of the real one). Gangbyeon-buk-ro is drawn as one road. Every building, stall and shop is fictional.' },
      roads, buildings, rail: [], areas, blockers, pois, landmarks,
    },
    lots,
    fixed: { 'mangwon-hangang': at(WAY_U, PATH_V) }, // where the way down meets the river path (where a taxi or the map drops you)
    stamp: { at: at(WAY_U + 4, -4), ry: Number((Math.PI * 1.5 - ANGLE).toFixed(4)) },
    market: { south: south || mb, north: north || ma, mid, gate: [r1(mb[0] + mdir[0] * 4 + mdir[1] * 7), r1(mb[1] + mdir[1] * 4 - mdir[0] * 7)] },
    exits: stationExits(worldcup),
    path: [at(U_WEST, PATH_V), at(U_EAST, PATH_V)],
    wayU: WAY_U,
  };
}
const xz = ([x, z]) => ({ x, z });

// Mangwon Station's two exits, on Worldcup-ro's pavements either side of the
// real station (local), stairs going down along the road.
function stationExits(line) {
  const st = local(OSM.station);
  let best = null;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((st[0] - a[0]) * dx + (st[1] - a[1]) * dz) / (L * L)));
    const q = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(st[0] - q[0], st[1] - q[1]);
    if (!best || d < best.d) best = { d, q, dir: [dx / L, dz / L] };
  }
  // (6 m south-west of the station along the road: a lane meets Worldcup-ro
  // right by it on the north-west side)
  const { dir } = best, q = [best.q[0] - dir[0] * 6, best.q[1] - dir[1] * 6], off = 9.6; // past the road's edge (7 m), short of the houses (12 m)
  return [-1, 1].map((side, i) => ({ n: i + 1, at: [r1(q[0] - dir[1] * off * side), r1(q[1] + dir[0] * off * side)], ry: Number(Math.atan2(dir[0] * side, dir[1] * side).toFixed(4)) }));
}

// ---- the river in front of the park (from scripts/data/mangwon-river-osm.json)
// The north bank is the straight line v = 0; across the river, the real south
// bank (Yanghwa Han River Park), Seonyudo in the river, and Seongsan and
// Yanghwa Bridges over it. Nothing over there can be walked to: they are the
// view from the park, west to the sunset behind Seongsan Bridge's arches.
const geoUV = ([lat, lon]) => toUV(local(toGame(lat, lon)));
const RIVER_W = U_WEST - 20, RIVER_E = U_EAST + 20; // the district's stretch of river (u)
const rUV = (q) => q.map(r1);
// The south bank's water edge: v at u (straight between its points; the
// last point's v past the east end).
const SOUTH = RIVER.south.map(geoUV).sort((a, b) => a[0] - b[0]);
const southV = (u) => {
  const i = SOUTH.findIndex((q) => q[0] >= u);
  if (i <= 0) return SOUTH[i < 0 ? SOUTH.length - 1 : 0][1];
  const [a, b] = [SOUTH[i - 1], SOUTH[i]];
  return a[1] + ((b[1] - a[1]) * (u - a[0])) / (b[0] - a[0]);
};
// A polygon cut to the river's stretch (RIVER_W <= u <= RIVER_E).
function clipU(poly, lo, hi) {
  let out = poly;
  for (const [edge, keep] of [[lo, (q) => q[0] >= lo], [hi, (q) => q[0] <= hi]]) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length];
      if (keep(a)) out.push(a);
      if (keep(a) !== keep(b)) { const t = (edge - a[0]) / (b[0] - a[0]); out.push([edge, a[1] + (b[1] - a[1]) * t]); }
    }
  }
  return out;
}
export const RIVER_AREAS = (() => {
  const isle = RIVER.seonyudo.map(geoUV);
  // The water: north bank, east edge, the south bank back west; Seonyudo
  // is a hole in it (core/world.js area `holes`). Past the east edge, a
  // piece up to where the region's water from Yeouido begins (region.json
  // water[0] starts on a slant there and left a corner of dry land).
  const bank = SOUTH.filter((q) => q[0] > RIVER_W && q[0] < RIVER_E).reverse();
  const water = [[RIVER_W, 0], [RIVER_E, 0], [RIVER_E, southV(RIVER_E)], ...bank, [RIVER_W, southV(RIVER_W)]];
  const corner = [[RIVER_E - 5, 0], [410, 148], [SOUTH.at(-1)[0], SOUTH.at(-1)[1]], ...SOUTH.filter((q) => q[0] > RIVER_E - 5).reverse(), [RIVER_E - 5, southV(RIVER_E - 5)]];
  const ring = isle;
  const park = clipU(RIVER.yanghwaPark.map(geoUV), RIVER_W, RIVER_E);
  const toLocal = (p) => p.map(rUV).map(([u, v]) => at(u, v));
  return {
    areas: [
      { k: 'water', p: toLocal(water), holes: [toLocal(ring)] }, // the real river's banks (the north one drawn straight)
      { k: 'water', p: toLocal(corner) },
      { k: 'park', trees: true, p: toLocal(ring) }, // Seonyudo (선유도), only to look at
      { k: 'park', trees: true, p: toLocal(park) }, // Yanghwa Han River Park on the south bank
    ],
    block: [at(RIVER_W, 0), at(RIVER_E, 0), at(RIVER_E, 300), at(RIVER_W, 300)], // the river and the far bank
    southV,
  };
})();

// Seongsan Bridge (성산대교, west: the sunset goes down behind its red arches)
// and Yanghwa Bridge (양화대교, east: over the end of Seonyudo, its one arch
// over the north channel), on their real lines at 1/4, only to look at
// (core/banpo-bridge.js). Each starts on Gangbyeon-buk-ro, high over the park
// with no piers on it, and comes down past the south bank. The real bridges
// carry both ways on two decks; drawn as one.
const BRIDGE_V0 = GANGBYEON_V + 4; // (v) where each starts
function bridgeLine(ko) {
  const pts = RIVER.bridges[ko].flatMap((w) => w.p.map(geoUV));
  // the carriageways' middle: the average u every 20 m across the river
  const end = Math.max(...pts.map((q) => q[1])), line = [];
  for (let v = BRIDGE_V0; v < end + 10; v += 20) {
    const near = pts.filter((q) => Math.abs(q[1] - v) < 14);
    if (near.length) line.push([near.reduce((s, q) => s + q[0], 0) / near.length, v]);
  }
  // to 25 m past the south bank, no further
  const stop = (q) => q[1] > southV(q[0]) + 25;
  const i = line.findIndex(stop);
  return i > 0 ? line.slice(0, i + 1) : line;
}
export const BRIDGES = [
  ['seongsan', '성산대교', { archColor: '#b5473a', arches: (len) => [0.2, 0.34, 0.48, 0.62, 0.76, 0.9].map((k) => r1(k * len)).reduce((a, s, i, l) => (i ? [...a, [l[i - 1], s]] : a), []) }],
  ['yanghwa', '양화대교', { archColor: '#e6eaee', arches: (len) => [[r1(0.3 * len), r1(0.48 * len)]] }],
].map(([which, ko, o]) => {
  const line = bridgeLine(ko).map(([u, v]) => at(u, v));
  const [x0, z0] = line[0];
  const pts = line.map(([x, z]) => [r1(x - x0), r1(z - z0)]);
  const len = pts.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), 0);
  return { type: 'banpobridge', which, x: x0, z: z0, pts, w: 10, top: 6, ramp: [20, 25], pipes: false, archColor: o.archColor, arches: o.arches(len), noPiers: [[0, 0, -BRIDGE_V0 + 4]] };
});

// Mangwon Han River Park, laid straight on the street (game/han-parks.js;
// core/han-park.js builds what the map can't draw). Its own frame faces the
// river: X runs up the river (u = PARK_U - X), Z inland from the bank's edge
// (the river Z < 0). At 1/4, along the real park, east to west:
//  - a picnic lawn, then the fishing pier and the fish buyer;
//  - where the way down from Mangwon-ro meets the river path (X 60): the
//    kiosk with its ramen machine, and a few riverside stalls;
//  - Seoul Battleship Park's grey warship moored off the bank (its real place);
//  - the boat dock.
export const PARK_U = -115; // the park frame's origin (u): the way down is at X 60
export const SHIP_U = -138; // Seoul Battleship Park (real)
export const PARK = {
  bounds: [-195, -45, 155, 13], // bank to path, and out on its water (X -195 … 155: u 80 … -270)
  layout: {
    paving: [[30, 0.4, 82, 9.2, '#d9c7a6']],
    rail: [-188, 150],
    pier: { x: -20, len: 9 },
    fishBuy: [-12, 4.2, 0],
    fishing: [[-46, 0.75], [-26, 0.75], [-20, -8.2], [-60, 0.75]],
    kiosk: [42, 6.6, Math.PI], // MANGWON 24, facing the river
    tables: [[33.6, 3.4], [49.6, 3.4]],
    market: {
      spots: [[66.4, 7.6, Math.PI], [69.2, 7.6, Math.PI], [72, 7.6, Math.PI], [74.8, 7.6, Math.PI]],
      tables: [[70.6, 3.6], [78.4, 4.6]],
      board: [79.6, 8.2, Math.PI],
    },
    dock: 104,
    duckWater: { minX: 86, maxX: 126, minZ: -38 },
    ships: [[PARK_U - SHIP_U, -13, 40]], // Seoul Battleship Park (서울함 공원)
    lamps: [[-40, 2.6], [-4, 2.6], [28, 2.6], [56, 2.6], [88, 2.6], [120, 2.6], [148, 2.6]],
    benches: [[118, 3.4], [138, 3.4], [146, 3.4]],
    beds: [[-6, 6.4, 3], [56, 8.6, 2.6], [88, 6.4, 3]],
    trees: [[-84, 7.2], [128, 7.4], [150, 7]],
    bushes: [[-34, 7.6], [24, 8], [92, 8.2]],
    // The sunset steps: turned to face Seongsan Bridge, where the sun goes
    // down (core/sunset-sky.js), with the open water in front.
    steps: [{ x: -50, z: 6, w: 9, rows: 3, gap: 1.5, ry: -0.66, sunset: true }],
  },
};
const PARK_LAWN = [-150, -36]; // the picnic lawn (X): east of the pier

// Which lot each shop takes: [row, index along the row].
export const SHOPS = {
  'info-mangwon': ['huiujeongN', 2],
  'bongbong-croquette': ['marketW', 0],
  'baksak-dakgangjeong': ['marketE', 1],
  'bomnal-tteokjip': ['marketW', 2],
  'saebyeok-fruit': ['marketE', 3],
  'eomma-banchan': ['marketW', 4],
  'sonmat-kalguksu': ['marketE', 5],
  'ttukttak-eomuk': ['marketW', 6],
  'kkoma-kimbap': ['marketE', 7],
  'dalkom-bangatgan': ['marketW', 8],
  'slow-morning': ['poeunS', 2],
  'bbang-gulttuk': ['poeunN', 0],
  'dongne-record': ['poeunS', 5],
};
