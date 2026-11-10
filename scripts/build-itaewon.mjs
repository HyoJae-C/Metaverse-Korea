#!/usr/bin/env node
// Builds Itaewon (districts/itaewon.json) at 1/4 on its real streets, like
// the rest of the Seoul map, and puts its shops on them.
//
// The streets are OpenStreetMap's (scripts/data/itaewon-osm.json, from the
// itaewon-namsan export): Itaewon-ro from Samgakji past Noksapyeong and
// Itaewon Station to Hangangjin; Noksapyeong-daero south from the foot of
// Gyeongnidan-gil to the road to Banpo Bridge; Bogwang-ro and Usadan-ro south
// of the station; Sinheung-ro up through Haebangchon; Sowol-ro round
// Namsan's foot; Seobinggo-ro along the south. Gyeongnidan-gil (Hoenamu-ro)
// and three of its lanes are from scripts/data/gyeongnidan-osm.json, on the
// hill (meta.hill, src/core/hill-ground.js). Before this, Itaewon was a
// hand-made map: about 1.4 times too wide and mirrored east to west.
//
// Made up, inside the real blocks: the World Food Street lane north from
// Itaewon-ro (it carries on as Hoenamu-ro 26-gil), Yongmaru Market's lane
// south of it and the lane across its end. Every building and shop is
// fictional; buildings are a normal size (only the distances shrink), one row
// along each street.
//
// The museums: the War History Museum (modelled on the War Memorial of Korea)
// and the National Central Art Museum (a made-up museum on the National
// Museum of Korea's spot) are both at the real 1/4, site and building (Yozi,
// 2026-11-11: "부지랑 박물관 전부 4분의1로"). Namsan (marked "ns",
// scripts/build-namsan.mjs) is left as it is.
//
// It also moves what stands in world metres with the streets: the shops'
// "at" in stores.json, Itaewon Station's exits, and the ends of the link
// roads (Itaewon-ro east, Sowol-ro north to Namdaemun, Sopa-ro's end on
// Sowol-ro, the road to Banpo Bridge).
//
//   node scripts/build-itaewon.mjs   rewrites districts/itaewon.json, the
//                                    shops' "at" and region.json

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { hillHeightRel } from '../src/core/hill-ground.js';
import { namsanGround } from '../src/core/namsan-shape.js';
import { outsideOf } from '../src/core/subway.js';
import { r1, name, inPoly, sideOf, clip, nearestOn, pointAt, lengthOf, facing, lineDist, simplify, town, rng, overlap, segDist } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const OSM = readJson(path.join(root, 'scripts', 'data', 'itaewon-osm.json'));
const GY_OSM = readJson(path.join(root, 'scripts', 'data', 'gyeongnidan-osm.json'));
const NAMSAN_OSM = readJson(path.join(root, 'scripts', 'data', 'namsan-osm.json'));
const regionText = readFileSync(path.join(R, 'region.json'), 'utf8');
const region = JSON.parse(regionText);
export const OFFSET = region.districts.find((d) => d.id === 'itaewon').offset;
const [ox, oz] = OFFSET;
const loc = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - ox, z - oz]; };
const toWorld = ([x, z]) => [r1(x + ox), r1(z + oz)];
const toLocal = ([x, z]) => [x - ox, z - oz];

// ---------- The real streets (Itaewon's metres) ----------
const ways = new Map([...OSM.ways, ...GY_OSM.ways].map((w) => [w.id, w]));
const pts = (id) => { const w = ways.get(id); if (!w) throw new Error(`no way ${id}`); return w.geometry.map(loc); };
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// Ways joined end to end in the order given, each turned to carry on from
// the last.
function chain(ids) {
  let out = pts(ids[0]);
  if (ids.length > 1) {
    const n = pts(ids[1]);
    if (Math.min(d2(out[0], n[0]), d2(out[0], n.at(-1))) < Math.min(d2(out.at(-1), n[0]), d2(out.at(-1), n.at(-1)))) out.reverse();
  }
  for (const id of ids.slice(1)) {
    let p = pts(id);
    if (d2(out.at(-1), p.at(-1)) < d2(out.at(-1), p[0])) p = p.reverse();
    out = out.concat(d2(out.at(-1), p[0]) < 0.5 ? p.slice(1) : p);
  }
  return out;
}
const cutAt = (p, keep) => clip(p, keep); // the longest run where keep(q)

const ITAEWON = simplify(chain([908588079, 37402381, 493442599, 1537015261, 1537015328, 516166423, 516166429, 218655244, 184441591, 521770126, 516154523, 516154524]), 0.8);
const FOOT = loc(GY_OSM.ways.find((w) => w.id === 37403459).geometry[0]).map(r1); // Hoenamu-ro leaves Noksapyeong-daero (and Sinheung-ro goes on north)
// Noksapyeong-daero from the foot of the hill south, past Noksapyeong
// Station and down to where the road to Banpo Bridge carries on.
const BANPO_LINK = region.links.find((l) => l.n?.en === 'To Banpo Bridge');
const NOKSA_END_Z = toLocal(BANPO_LINK.p[0])[1];
const NOKSA = simplify(cutAt(chain([184441590, 516163752, 229955888, 229955889, 37400628, 218907632]), (q) => q[1] <= NOKSA_END_Z), 0.8);
NOKSA[0] = FOOT;
const BOGWANG = simplify(chain([37400823, 516154518, 516154519, 469351613]), 0.8);
const USADAN = simplify(chain([516154522, 516154520, 33727174]), 0.8);
// Sowol-ro round Namsan's south foot, west to east.
const SOWOL = simplify(chain([1536056052, 218910332, 1536056051, 1536056050]).reverse(), 0.8);
if (SOWOL[0][0] > SOWOL.at(-1)[0]) SOWOL.reverse();
// ... and on north-west to Namdaemun (a link road between districts).
const SOWOL_NORTH = simplify(chain([1454603297, 1454603285, 1454603281, 379943749, 379943751, 1339697074, 1339697075, 1339697076, 379943753, 379943755, 550625240, 78628775]), 2);
const SEOBINGGO = simplify(cutAt(chain([619137651, 333972429, 246253105, 1465273768, 246253106, 1465802239, 1465273767, 1212097837, 246253107, 544047340, 913514045, 183272492]), (q) => q[0] >= -440 && q[0] <= 138), 3);
// Sinheung-ro, Haebangchon's street, from the foot up to Sowol-ro.
const sinheungTop = pts(97936003).slice(0, 7);
const SINHEUNG0 = simplify([...pts(37403309), ...sinheungTop.slice(1)], 0.8);
const SINHEUNG = [...SINHEUNG0, nearestOn(SINHEUNG0.at(-1), SOWOL_NORTH).at.map(r1)];
SINHEUNG[0] = FOOT;

// ---------- Gyeongnidan-gil (Hoenamu-ro) ----------
const lane35 = pts(228799562).reverse(); // from the main street north
const mainAll = [...pts(37403459), ...pts(1346149787).slice(1)];
const MAIN = simplify([...mainAll.filter(([x]) => x < lane35[0][0] - 0.5), lane35[0]], 1.2).map((q) => q.map(r1));
MAIN[0] = FOOT;
// Straight on from a lane's end until it meets Sowol-ro.
const toRoad = (p, road, w, north = false) => {
  const [a, b] = p.slice(-2), L = d2(a, b), dir = north ? [0, -1] : [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  for (let s = 0; s < 200; s += 0.5) { const q = [b[0] + dir[0] * s, b[1] + dir[1] * s]; if (lineDist(q, road) < w / 2) return [...p, q.map(r1)]; }
  throw new Error('a lane reaches no road');
};
const L13 = toRoad(simplify(pts(228799561).reverse(), 1.2), SOWOL, 8, true); // Hoenamu-ro 13-gil, on north to Sowol-ro (the real lane stops 70 m short)
const L35 = toRoad(simplify(lane35, 1.2), SOWOL, 8); // Hoenamu-ro 35-gil at the top, north to Sowol-ro too
const L26 = simplify(pts(330306028).reverse().filter((_, i) => i !== 1), 1.2); // Hoenamu-ro 26-gil, south down towards Itaewon-ro
// The World Food Street: a made-up lane from Itaewon-ro straight up to the
// foot of 26-gil, so you come up from Itaewon to Gyeongnidan by the back way.
const WFS_X = r1(L26.at(-1)[0]);
const itaewonZ = (x) => { const q = nearestOn([x, 0], ITAEWON); return q.at[1]; };
const WFS = [[WFS_X, r1(itaewonZ(WFS_X))], L26.at(-1).map(r1)];

// ---------- The hill ----------
// Height of the main street going east (m above its foot). Gently up from the
// foot, steadiest through the café strip, easing at the top: about 5 m in all
// (the real street climbs more, but over four times the distance).
const rel = ([x, z]) => [x - FOOT[0], z - FOOT[1]];
const TOPX = r1(rel(MAIN.at(-1))[0]);
const PROF = [[0, 0], [10, 0.2], [30, 1.2], [62, 2.8], [100, 4.2], [TOPX, 5]];
// The built part: from just west of the foot to the top of the café strip;
// north until the ground eases back down before Sowol-ro (FADE m); south to
// just above Itaewon-ro's shops.
const FADE = 42;
const WIN = { x0: -12, x1: TOPX, z0: -60, z1: 25 };
const roadZ = [];
{ let last = -Infinity; for (const q of MAIN) { const [x, z] = rel(q); if (x > last + 0.5) { roadZ.push([r1(x), r1(z)]); last = x; } } }
export const HILL = {
  at: FOOT, prof: PROF, road: roadZ, flat: 6, kN: 0.03, zs: WIN.z1, ramp: [5, 20],
  win: [WIN.x0, WIN.z0, WIN.x1, WIN.z1], fade: FADE,
  credit: 'Roads: © OpenStreetMap contributors (ODbL). Slope: game approximation.',
};
const ground = (x, z) => hillHeightRel(HILL, x - FOOT[0], z - FOOT[1]);
// Where the hill's houses go (the rest of the town is flat): east of the foot,
// south of Sowol-ro, north of Itaewon-ro's shops, west of where the hill has
// eased back down.
const GY = { x0: FOOT[0] + 3.5, x1: FOOT[0] + WIN.x1 + FADE, z0: FOOT[1] + WIN.z0 - FADE, z1: FOOT[1] + WIN.z1 };
const inGy = ([x, z]) => x > GY.x0 && x < GY.x1 && z > GY.z0 && z < GY.z1;

// ---------- Names ----------
const N = {
  itaewon: name('Itaewon-ro', '이태원로', '梨泰院路', '梨泰院路'),
  noksa: name('Noksapyeong-daero', '녹사평대로', '緑莎坪大路', '绿莎坪大路'),
  bogwang: name('Bogwang-ro', '보광로', '普光路', '普光路'),
  usadan: name('Usadan-ro', '우사단로', 'ウサダン路', '宇司坛路'),
  sowol: name('Sowol-ro', '소월로', '素月路', '素月路'),
  sinheung: name('Sinheung-ro', '신흥로', '新興路', '新兴路'),
  seobinggo: name('Seobinggo-ro', '서빙고로', '西氷庫路', '西冰库路'),
  food: name('World Food Street', '세계음식거리', '世界グルメ通り', '世界美食街'),
  market: name('Yongmaru Market Alley', '용마루시장 골목', 'ヨンマル市場通り', '龙脊市场小巷'),
  trail: name('Namsan trail', '남산 산책로', '南山散策路', '南山步道'),
  main: { ko: '경리단길 (회나무로)', en: 'Gyeongnidan-gil (Hoenamu-ro)', ja: '経理団通り（フェナム路）', zh: '经理团路（会那木路）' },
};
const gyName = (id) => { const w = ways.get(id); return { ko: w.name, en: w['name:en'] || w.name }; };

// ---------- Yongmaru Market's made-up lane ----------
// North from Itaewon-ro, west of exit 1, between the World Food Street and
// Itaewon Square, up to where Gyeongnidan's hill starts. Itaewon's shops are
// all north of Itaewon-ro and on Gyeongnidan-gil (Yozi 2026-11-11: the south
// side isn't needed); south of it only the real roads with plain buildings.
const MKT_X = -55;
const MKT_TOP = r1(itaewonZ(MKT_X)); // (where it leaves Itaewon-ro)
const MKT_END = -82;
const MARKET = [[MKT_X, MKT_TOP], [MKT_X, MKT_END]];

// ---------- Itaewon-ro 27-gil and 27ga-gil, north of the station ----------
// Real Itaewon has no square by the station: buildings, with 27-gil winding
// up north from Itaewon-ro east of exit 1 (it leads on to the Namsan trail)
// and 27ga-gil, the club alley, behind the first row of Itaewon-ro's shops.
// Both on their real lines (OpenStreetMap); 27ga-gil moved 9 m north, because
// the game's Itaewon-ro is twice its real width and the row between them
// would not fit; it runs from the market lane east until it meets 27-gil.
const L27 = (() => { const p = simplify(chain([33727132, 350284523]), 0.8); const k = p.findIndex(([x, z]) => z < -44 && x > 5); return p.slice(0, k + 1); })();
const CLUB_SHIFT = 9;
const CLUB = (() => {
  const p = pts(239289181).map(([x, z]) => [x, z - CLUB_SHIFT]).filter(([x]) => x > MKT_X);
  const w = [MKT_X, p[0][1] + ((p[1][1] - p[0][1]) * (MKT_X - p[0][0])) / (p[1][0] - p[0][0])];
  return simplify([w, ...p, nearestOn(p.at(-1), L27).at], 0.8);
})();

// ---------- The museums' real places ----------
const WM_SITE = OSM.ways.find((w) => w.id === 229891123).geometry.map(loc); // the War Memorial's grounds
const MUSEUM_HALL = OSM.ways.find((w) => w.id === 168364800).geometry.map(loc); // the National Museum of Korea's building
const box = (p) => [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];

// ---------- Start from the map without its streets ----------
const itaewon = readJson(MAP);
const keep = (it) => it.ns || it.ym;
const oldTrail = itaewon.roads.find((r) => r.n?.en === 'Namsan trail');
for (const k of ['roads', 'buildings', 'areas', 'blockers', 'pois', 'landmarks']) itaewon[k] = (itaewon[k] || []).filter(keep);

// ---------- Namsan's foot clears the real Sowol-ro ----------
// Real Sowol-ro runs along the hill's south-west foot; the game hill's
// ellipse (scripts/build-namsan.mjs) reached 10 m over it west of the trail.
// Pull the south side in: the centre goes north by d and the half-depth
// shrinks by d (the north rim stays put), the tower stays where it is.
const NAMSAN = itaewon.landmarks.find((l) => l.type === 'namsan');
{
  const out = (h, [x, z]) => ((x - h.x) / h.rx) ** 2 + ((z - h.z) / h.rz) ** 2 >= 1;
  const edge = SOWOL.flatMap((q, i) => {
    const [a, b] = i ? [SOWOL[i - 1], q] : [q, SOWOL[1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l; // left of travel: north
    return [[q[0] + nx * 5, q[1] + nz * 5]];
  });
  let d = 0;
  while (!edge.every((q) => out({ ...NAMSAN, z: NAMSAN.z - d, rz: NAMSAN.rz - d }, q))) d++;
  if (d) {
    NAMSAN.z -= d; NAMSAN.rz -= d; NAMSAN.pz = r1(NAMSAN.pz + d);
    const ell = (k, n = 32) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [r1(NAMSAN.x + Math.cos(a) * NAMSAN.rx * k), r1(NAMSAN.z + Math.sin(a) * NAMSAN.rz * k)]; });
    itaewon.blockers.find((b) => b.ns && b.n?.en === 'Namsan').p = ell(0.95);
    itaewon.areas.find((a) => a.ns && a.k === 'park' && a.p.length === 32).p = ell(1);
    // The cable's pylons stand on the (lower) ground; the top station keeps its height over it.
    const cable = itaewon.landmarks.find((l) => l.type === 'cablecar');
    cable.path.forEach((q, i) => {
      const g = r1(namsanGround(NAMSAN, cable.x + q[0] - NAMSAN.x, cable.z + q[1] - NAMSAN.z));
      if (i === cable.path.length - 1) { q[2] = r1(g + 7.5); q[3] = g; } else if (i) q[3] = g;
    });
    console.log(`  Namsan's foot pulled ${d} m north on its south side to clear Sowol-ro`);
  }
}
const footZ = (x) => NAMSAN.z + NAMSAN.rz * Math.sqrt(1 - ((x - NAMSAN.x) / NAMSAN.rx) ** 2);
const TRAIL_END = [oldTrail.p.at(-1)[0], r1(footZ(oldTrail.p.at(-1)[0]) - 4)]; // just onto the hill (as scripts/build-namsan.mjs)

// ---------- The War History Museum: the real site at 1/4 ----------
// It was 40% round the main building (heights 50%, PR #536);
// now 25% (heights 25%), with the plaza in front still reaching Itaewon-ro.
if (itaewon.landmarks.find((l) => l.type === 'warmemorial').sc?.[0] !== 0.25) {
  const K = 0.25 / 0.4, UPK = 0.25 / 0.5;
  const isWm = (it) => it.ym && [...(it.p || []), ...(Number.isFinite(it.x) ? [[it.x, it.z]] : [])].every(([, z]) => z < 50);
  const wm = itaewon.landmarks.find((l) => l.type === 'warmemorial');
  const hall = itaewon.buildings.find((b) => b.wall === '#cfcac0');
  const [cx, cz] = [wm.x, wm.z];
  const front = Math.max(...hall.p.map((q) => q[1]));
  const front2 = cz + (front - cz) * K;
  const all = [...itaewon.roads, ...itaewon.areas, ...itaewon.blockers, ...itaewon.buildings].filter(isWm);
  const end = Math.max(...all.flatMap((it) => it.p.map((q) => q[1]))); // the plaza's edge by the road
  const roadEdge = itaewonZ(cx) - 7 + 1.1;
  const sx = (x) => cx + (x - cx) * K;
  const sz = (z) => (z <= front ? cz + (z - cz) * K : front2 + ((z - front) * (roadEdge - front2)) / (end - front));
  const f = ([x, z]) => [r1(sx(x)), r1(sz(z))];
  for (const k of ['buildings', 'areas', 'blockers', 'landmarks', 'pois', 'roads']) for (const it of itaewon[k]) {
    if (!isWm(it)) continue;
    if (it.p) it.p = it.p.map(f);
    if (Number.isFinite(it.x)) [it.x, it.z] = f([it.x, it.z]);
    if (k === 'buildings') it.h = r1(it.h * UPK);
    if (k === 'roads') it.w = Math.max(3, r1(it.w * K));
    if (k === 'landmarks') { it.sc = [0.25, 0.25]; if (it.clear) it.clear = r1(it.clear * K); }
  }
  // The path to the outdoor exhibition starts at the road again.
  const path0 = itaewon.roads.find((r) => r.n?.en === 'Outdoor Exhibition Path');
  path0.p[0] = [path0.p[0][0], r1(itaewonZ(path0.p[0][0]) - 7)];
}

// ---------- The National Central Art Museum: its grounds at 1/4 ----------
// A made-up museum on the National Museum of Korea's spot. Its building is
// already the real one at 1/4 (100 m). Its grounds are the real ones at 1/4,
// from the building down to Seobinggo-ro; you come in from Seobinggo-ro, as at
// the real one, to the door on the building's south side.
const MUSEUM = (() => {
  const hall = itaewon.buildings.find((b) => b.ym && b.h === 11);
  const [x0, z0, x1, z1] = box(hall.p);
  const mx = r1((x0 + x1) / 2);
  const roadZ = nearestOn([mx, z1 + 80], SEOBINGGO).at[1];
  const door = [mx, r1(z1 + 2)];
  // Remove what was there: the park round it, its plaza, the way and the sign.
  itaewon.areas = itaewon.areas.filter((a) => !(a.ym && box(a.p)[1] > 150));
  itaewon.roads = itaewon.roads.filter((r) => r.n?.en !== 'Art Museum Way');
  itaewon.landmarks = itaewon.landmarks.filter((l) => !(l.ym && l.type === 'arch'));
  const grounds = [[r1(x0 - 30), r1(z0 - 16)], [r1(x1 + 30), r1(z0 - 16)], [r1(x1 + 30), r1(roadZ - 9)], [r1(x0 - 30), r1(roadZ - 9)]];
  const plaza = [[r1(mx - 34), r1(z1 + 1)], [r1(mx + 34), r1(z1 + 1)], [r1(mx + 34), r1(z1 + 22)], [r1(mx - 34), r1(z1 + 22)]];
  itaewon.areas.push({ k: 'park', p: grounds, ym: 1 }, { k: 'plaza', p: plaza, ym: 1 });
  itaewon.roads.push({ k: 'walk', w: 10, p: [[mx, r1(roadZ - 6)], [mx, r1(door[1])]], n: name('Art Museum Way', '미술관 가는 길', '美術館への道', '美术馆之路'), ym: 1 });
  itaewon.landmarks.push({ type: 'arch', x: mx, z: r1(roadZ - 14), w: 12, title: 'NATIONAL CENTRAL ART MUSEUM', sub: '국립중앙미술관', color: '#3a3633', ym: 1 });
  const poi = itaewon.pois.find((p) => p.name?.en === 'National Central Art Museum');
  [poi.x, poi.z] = [mx, r1(z1 + 26)];
  return { door, grounds };
})();

// ---------- Roads ----------
const ROAD = {
  itaewon: { k: 'primary', w: 14, p: ITAEWON, n: N.itaewon },
  noksa: { k: 'primary', w: 12, p: NOKSA, n: N.noksa },
  bogwang: { k: 'secondary', w: 9, p: BOGWANG, n: N.bogwang },
  usadan: { k: 'tertiary', w: 7, p: USADAN, n: N.usadan },
  sowol: { k: 'secondary', w: 8, p: SOWOL, n: N.sowol },
  sinheung: { k: 'tertiary', w: 7, p: SINHEUNG, n: N.sinheung },
  seobinggo: { k: 'primary', w: 14, p: SEOBINGGO, n: N.seobinggo },
  food: { k: 'walk', w: 10, p: WFS, n: N.food },
  market: { k: 'walk', w: 8, p: MARKET, n: N.market },
  l27: { k: 'residential', w: 5, p: L27, n: name('Itaewon-ro 27-gil', '이태원로27길', '梨泰院路27ギル', '梨泰院路27街') },
  club: { k: 'residential', w: 5, p: CLUB, n: name('Itaewon-ro 27ga-gil', '이태원로27가길', '梨泰院路27カギル', '梨泰院路27Ga街') },
  trail: { k: 'walk', w: 5, p: [L27.at(-1), [TRAIL_END[0], -58], TRAIL_END], n: N.trail }, // (on from 27-gil's top, then straight up as before)
};
const GYROADS = [
  { k: 'secondary', w: 10, p: MAIN, n: N.main, gy: 1, main: 1 },
  { k: 'residential', w: 5, p: L13, n: gyName(228799561), gy: 1 },
  { k: 'residential', w: 5, p: L35, n: gyName(228799562), gy: 1 },
  { k: 'residential', w: 5, p: L26, n: gyName(330306028), gy: 1 },
];
const roads = [...Object.values(ROAD), ...GYROADS].map((r) => ({ ...r, p: r.p.map((q) => q.map(r1)) }));
const links = region.links.map((l) => ({ w: l.w, p: l.p.map(toLocal) }));

// ---------- Open places (kept clear of buildings) ----------
const keptAreas = itaewon.areas.map((a) => ({ p: a.p }));
const solidsKept = [...itaewon.buildings, ...itaewon.blockers].map((b) => ({ p: b.p }));
const pad = (p, m) => { const [x0, z0, x1, z1] = box(p); return [[x0 - m, z0 - m], [x1 + m, z0 - m], [x1 + m, z1 + m], [x0 - m, z1 + m]]; };
const WM_GROUNDS = pad(WM_SITE, 4);
const EXITS = [
  { n: 1, at: [-21, -10], ry: -1.5708, real: OSM.exits.find((e) => e.station.startsWith('이태원') && e.ref === '1') },
  { n: 4, at: [-24, 11], ry: 1.5708, real: OSM.exits.find((e) => e.station.startsWith('이태원') && e.ref === '4') },
];
// Clear round each exit and where you come up out of it (the stairs face along the pavement).
const exitClear = EXITS.map(({ at: [x, z], ry }) => {
  const o = outsideOf({ at: [x, z], ry });
  const x0 = Math.min(x - 4, o.x - 2.5), x1 = Math.max(x + 4, o.x + 2.5), z0 = Math.min(z - 4, o.z - 2.5), z1 = Math.max(z + 4, o.z + 2.5);
  return { p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] };
});
// The old army ground west of Noksapyeong-daero and south of Itaewon-ro
// (Yongsan Garrison, being turned into Yongsan Park): open land, no houses.
const BASE = [
  ...ITAEWON.filter(([x]) => x < NOKSA[0][0] + 10).map(([x, z]) => [x, z + 8]),
  ...NOKSA.filter(([, z]) => z > 0).map(([x, z]) => [x - 7, z]),
  ...BANPO_LINK.p.map(toLocal).filter(([, z]) => z > NOKSA_END_Z).map(([x, z]) => [x - 8, z]),
  ...SEOBINGGO.filter(([x]) => x < -10).reverse().map(([x, z]) => [x, z - 8]),
];
const AREA = { x0: -460, x1: 143, z0: -335, z1: 420 };
const northOfSowol = (q) => q[0] > SOWOL[0][0] && q[0] < SOWOL.at(-1)[0] && sideOf(q, SOWOL) < 0;
const southOfSeobinggo = (q) => q[0] > SEOBINGGO[0][0] && q[0] < SEOBINGGO.at(-1)[0] && sideOf(q, SEOBINGGO) > -9;
const inside = (q) => q[0] > AREA.x0 && q[0] < AREA.x1 && q[1] > AREA.z0 && q[1] < AREA.z1
  && !northOfSowol(q) && !southOfSeobinggo(q) && !inPoly(q[0], q[1], BASE) && !inGy(q)
  && !inPoly(q[0], q[1], WM_GROUNDS) && !inPoly(q[0], q[1], MUSEUM.grounds)
  && !(q[0] < -191 && q[1] < -300); // (Namsan's west foot)
const open = [...exitClear, ...keptAreas, ...solidsKept, ...links.map((l) => ({ line: l.p, w: l.w }))];

// ---------- Rows of buildings ----------
const t = town(630, { inside, roads, open }); // (Itaewon is station 630)
const { row } = t;
const SHOP = { w: [10, 16], h: [8, 16], depth: 14 };
const BIG = { w: [14, 20], h: [12, 22], depth: 18 };
const SMALL = { w: [7, 10], h: [6, 12], depth: 10 };
const fr = (r, pave = 3) => r.w / 2 + pave;
const part = (p, keep) => clip(p, keep);
const ITW = part(ITAEWON, ([x]) => x < NOKSA[0][0] - 12); // Samgakji to Noksapyeong
const ITC = part(ITAEWON, ([x]) => x > -150 && x < 20); // Noksapyeong to the station
const ITE = part(ITAEWON, ([x]) => x > 26); // the station to Hangangjin
// (Rows: side +1 is the right going along the line, -1 the left. Itaewon-ro
// runs east: north is the left.)
// The club alley first: its fronts face it, the backs of the south row to Itaewon-ro.
row('club-N', CLUB, -1, { off: fr(ROAD.club, 2), ...SMALL, spot: 1 });
row('club-S', CLUB, 1, { off: fr(ROAD.club, 2), ...SMALL, depth: 8, spot: 1 });
row('itW-N', ITW, -1, { off: fr(ROAD.itaewon), ...SHOP });
row('itC-N', ITC, -1, { off: fr(ROAD.itaewon), ...SHOP });
row('itC-S', ITC, 1, { off: fr(ROAD.itaewon), ...SHOP });
row('itE-N', ITE, -1, { off: fr(ROAD.itaewon), ...BIG });
row('itE-S', ITE, 1, { off: fr(ROAD.itaewon), ...BIG });
// The World Food Street (north from Itaewon-ro): small restaurant fronts both sides.
row('food-W', WFS, -1, { off: fr(ROAD.food, 1.5), ...SMALL, depth: 12 });
row('food-E', WFS, 1, { off: fr(ROAD.food, 1.5), ...SMALL, depth: 12 });
// Yongmaru Market: the stalls stand under the arcade; houses behind them.
row('market-W', MARKET, -1, { off: 9, ...SMALL });
row('market-E', MARKET, 1, { off: 9, ...SMALL });
row('noksa-E', NOKSA, -1, { off: fr(ROAD.noksa), ...SHOP });
row('bogwang-W', BOGWANG, 1, { off: fr(ROAD.bogwang), ...SHOP });
row('bogwang-E', BOGWANG, -1, { off: fr(ROAD.bogwang), ...SHOP });
row('usadan-W', USADAN, 1, { off: fr(ROAD.usadan), ...SMALL, depth: 11 });
row('usadan-E', USADAN, -1, { off: fr(ROAD.usadan), ...SMALL, depth: 11 });
row('sinheung-W', SINHEUNG, 1, { off: fr(ROAD.sinheung, 1.5), ...SMALL, depth: 11 });
row('sowol-S', SOWOL, 1, { off: fr(ROAD.sowol, 1.5), ...SMALL, depth: 11 });
row('seobinggo-N', SEOBINGGO, -1, { off: fr(ROAD.seobinggo), ...SHOP });
const buildings = t.buildings.map((b) => ({ ...b, it: 1 }));

// ---------- The hill's houses (Gyeongnidan-gil, Haebangchon) ----------
// One row along each street, standing on the slope: the floor level with the
// street at the door, the walls down to the ground on the low side.
const rand = rng(1974);
const solids = [...buildings, ...itaewon.buildings, ...itaewon.blockers].map((b) => ({ p: b.p, box: box(b.p) }));
const hits = (p) => { const [x0, z0, x1, z1] = box(p); return solids.some((s) => !(s.box[0] > x1 + 1 || s.box[2] < x0 - 1 || s.box[1] > z1 + 1 || s.box[3] < z0 - 1) && (s.p.length <= 8 ? overlap(p, s.p) : p.some(([x, z]) => inPoly(x, z, s.p)) || s.p.some(([x, z]) => inPoly(x, z, p)))); };
const allRoads = [...roads, ...links];
const clearOfRoads = (probe) => allRoads.every((r) => probe.every((q) => lineDist(q, r.p) >= r.w / 2 + 0.9));
const lotOk = (p) => p.every((q) => inGy(q) && !northOfSowol(q)) && !itaewon.areas.some((a) => a.k === 'park' && p.some(([x, z]) => inPoly(x, z, a.p)));
const gyBuildings = [], gyLots = [];
for (const r of [GYROADS[0], ...GYROADS.slice(1), ROAD.sinheung, ROAD.sowol, ROAD.food]) {
  const main = !!r.main;
  for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 6) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const side of [1, -1]) {
      const nx = -uz * side, nz = ux * side;
      const off = r.w / 2 + (main ? 1.8 : 1.2);
      let s = 0.5;
      while (s < len - 4) {
        const w = main ? 10 + rand() * 5 : 9 + rand() * 4;
        const d = main ? 12 + rand() * 4 : 10 + rand() * 3;
        const e = Math.min(len, s + w);
        if (e - s < 7) break;
        const at = (tt, o) => [r1(ax + ux * tt + nx * o), r1(az + uz * tt + nz * o)];
        const p = [at(s, off), at(e, off), at(e, off + d), at(s, off + d)];
        const mid = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
        const probe = [...p, mid, [(p[2][0] + p[3][0]) / 2, (p[2][1] + p[3][1]) / 2], [(mid[0] + p[2][0]) / 2, (mid[1] + p[2][1]) / 2]];
        if (lotOk(p) && clearOfRoads(probe) && !hits(p)) {
          const y = ground(mid[0] - nx, mid[1] - nz); // the floor: level with the street at the door
          const y0 = Math.min(...p.map(([x, z]) => ground(x, z)), y) - 0.4;
          const storeys = main ? 3 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 3);
          const b = { h: r1(storeys * 3.2 + rand() * 1.2), p, gy: 1 };
          if (y > 0.05 || y0 < -0.05) { b.y = r1(y); b.y0 = r1(Math.min(y0, b.y)); }
          gyBuildings.push(b);
          solids.push({ p, box: box(p) });
          if (main) gyLots.push({ b, front: [r1(mid[0] - nx * 1.5), r1(mid[1] - nz * 1.5)], x: mid[0] - FOOT[0], side, w: e - s });
          s = e + 1.5 + rand() * 2;
        } else s += 2;
      }
    }
  }
}

// ---------- Landmarks, places, areas ----------
const archRy = ([dx, dz]) => Math.round(Math.atan2(-dx, -dz) * 100) / 100; // an arch spans across a road heading (dx, dz)
const dirOf = (p, i = 0) => [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]];
const MKT_C = r1(MKT_TOP - 46); // the arcade's middle (66 m long, from Itaewon-ro north)
const sowolAt = (x) => atXonLine(SOWOL, x);
function atXonLine(p, x) {
  for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); }
  return null;
}
const trailGate = r1(sowolAt(0) + 12);
const landmarks = [
  { type: 'arch', x: 0, z: trailGate, w: 7, title: 'NAMSAN TRAIL', sub: '남산 산책로', color: '#3f8a4f', it: 1 },
  { type: 'arch', x: WFS_X, z: r1(WFS[0][1] - 9), w: 12, title: 'WORLD FOOD STREET', sub: '이태원 세계음식거리', color: '#c0392b', it: 1 },
  { type: 'arch', x: WFS_X, z: r1(WFS[1][1] + 6), w: 12, ry: 3.14159, title: 'WORLD FOOD STREET', sub: '이태원 세계음식거리', color: '#c0392b', it: 1 },
  { type: 'arch', x: MKT_X, z: r1(MKT_TOP - 10), w: 10, ry: 3.14159, title: 'YONGMARU MARKET', sub: '용마루시장', color: '#2f6f4f', it: 1 },
  { type: 'arch', x: MKT_X, z: r1(MKT_TOP - 80), w: 10, title: 'YONGMARU MARKET', sub: '용마루시장', color: '#2f6f4f', it: 1 },
  { type: 'arcade', x: MKT_X, z: MKT_C, len: 66, w: 12, h: 6.2, gap: 13, it: 1 },
  { type: 'arch', x: r1(FOOT[0] + 14), z: r1(atXonLine(MAIN, FOOT[0] + 14) ?? FOOT[1]), w: 12, ry: archRy(dirOf(MAIN, 1)), title: 'GYEONGNIDAN-GIL', sub: '경리단길', color: '#2f6f8f', gy: 1 },
  { type: 'arch', x: r1(nearestOn([FOOT[0], FOOT[1] - 14], SINHEUNG).at[0]), z: r1(FOOT[1] - 14), w: 9, ry: archRy(dirOf(SINHEUNG, 0)), title: 'HAEBANGCHON', sub: '해방촌', color: '#7a4fa0', gy: 1 },
];
const mainAt = (x) => MAIN.find((q) => q[0] - FOOT[0] >= x) || MAIN.at(-1);
const hbc = pointAt(SINHEUNG, lengthOf(SINHEUNG) * 0.55).at;
const pois = [
  { kind: 'landmark', x: r1(WFS_X), z: r1((WFS[0][1] + WFS[1][1]) / 2), name: name('Itaewon World Food Street', '이태원 세계음식거리', '梨泰院 世界グルメ通り', '梨泰院世界美食街'), it: 1 },
  { kind: 'landmark', ...(([x, z]) => ({ x: r1(x), z: r1(z - 4) }))(pointAt(CLUB, lengthOf(CLUB) / 2).at), name: name('Itaewon club street', '이태원 클럽 거리', '梨泰院クラブ通り', '梨泰院夜店街'), it: 1 },
  { kind: 'landmark', x: 0, z: r1(trailGate + 6), name: name('Namsan trail entrance', '남산 산책로 입구', '南山散策路入口', '南山步道入口'), it: 1 },
  { kind: 'landmark', x: MKT_X, z: MKT_C, name: name('Yongmaru Market', '용마루시장', 'ヨンマル市場', '龙脊市场'), it: 1 },
  { kind: 'landmark', x: mainAt(70)[0], z: mainAt(70)[1], name: name('Gyeongnidan-gil', '경리단길', '経理団通り', '经理团路'), gy: 1 },
  { kind: 'landmark', x: r1(hbc[0] - 22), z: r1(hbc[1]), name: name('Haebangchon', '해방촌', '解放村', '解放村'), gy: 1 },
];
const areas = [
  { k: 'grass', p: BASE.map((q) => q.map(r1)), it: 1 }, // the old army ground
];
// Namsan's woods start across Sowol-ro (they reached over it before).
{
  const woods = itaewon.areas.find((a) => a.ns && a.k === 'park' && box(a.p)[2] - box(a.p)[0] <= 100);
  const [x0, , x1] = box(woods.p);
  const z0 = r1(footZ(TRAIL_END[0]) - 4); // from the foot of the hill
  const edge = [];
  for (let x = x1; x >= x0 - 0.01; x -= 5) edge.push([r1(x), r1(sowolAt(x) - ROAD.sowol.w / 2 - 2)]);
  woods.p = [[x0, z0], [x1, z0], ...edge];
}

// ---------- Write the map ----------
itaewon.roads = [...roads.map((r) => (r.gy ? r : { ...r, it: 1 })), ...itaewon.roads];
itaewon.buildings = [...buildings, ...gyBuildings, ...itaewon.buildings];
itaewon.landmarks = [...landmarks, ...itaewon.landmarks];
itaewon.pois = [...pois, ...itaewon.pois];
itaewon.areas = [...areas, ...itaewon.areas];
itaewon.meta = {
  ...itaewon.meta,
  source: 'scripts/build-itaewon.mjs, at 1/4 on the real place: Itaewon-ro, Noksapyeong-daero, Bogwang-ro, Usadan-ro, Sinheung-ro, Sowol-ro, Seobinggo-ro and Gyeongnidan-gil (Hoenamu-ro) from OpenStreetMap (scripts/data/itaewon-osm.json, gyeongnidan-osm.json); Namsan with its cable car (scripts/build-namsan.mjs). The World Food Street, Yongmaru Market\'s lanes and every building and shop are made up; the museums are at the real 1/4.',
  credit: '© OpenStreetMap contributors (ODbL)',
  hill: HILL,
};
delete itaewon.meta.parts;

// ---------- Shops ----------
let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
const setAt = (sid, at) => {
  const re = new RegExp(`("id":\\s*"${sid}",[\\s\\S]*?"at":\\s*\\[)[^\\]]*(\\])`);
  if (!re.test(stores)) throw new Error(`${sid}: not in stores.json`);
  stores = stores.replace(re, `$1${at[0]}, ${at[1]}$2`);
};
const storeAt = (sid) => { const m = stores.match(new RegExp(`"id":\\s*"${sid}",[\\s\\S]*?"at":\\s*\\[([^\\]]*)\\]`)); return m[1].split(',').map(Number); };
const used = new Set();
const ok = (at) => roads.every((r) => r.k === 'walk' || lineDist(at, r.p) >= r.w / 2 + 0.5);
// Each group takes the free lots of its rows: nearest a spot first if given, else in row order.
const GROUPS = [
  // By the station, north of Itaewon-ro: the information centre, the barber and the bike workshop.
  [['itC-N'], ['info-itaewon', 'itaewon-barbershop', 'ride-with-me'], [0, 0]],
  // The clubs and bars in the club alley (Itaewon-ro 27ga-gil), behind Itaewon-ro's shops.
  [['club-N', 'club-S'], ['club-heartbeat', 'full-time-pub', 'bar-hush', 'club-orbit', 'spin-cycle', 'club-808'], pointAt(CLUB, lengthOf(CLUB) / 2).at],
  // The World Food Street, with the halal grocer.
  [['food-W', 'food-E'], ['masala-ghar', 'kebapci-lale', 'warung-kuy', 'khammak-padthai', 'tulip-tea', 'pho-nang', 'globe-coffee', 'tortilla-feliz', 'churro-corner', 'beit-hummus', 'salam-halal'], WFS[0]],
];
if (process.env.LOTS) for (const [k, v] of Object.entries(t.lots)) console.log("  lots", k, v.length);
for (const [rowIds, ids, near] of GROUPS) {
  let free = rowIds.flatMap((rid) => (t.lots[rid] || []).map((at, i) => ({ key: `${rid}:${i}`, at }))).filter((l) => !used.has(l.key) && ok(l.at));
  if (near) free.sort((a, b) => d2(a.at, near) - d2(b.at, near));
  // a shop front apart
  const picked = [];
  for (const l of free) { if (picked.length === ids.length) break; if (picked.every((p) => d2(p.at, l.at) >= 7)) picked.push(l); }
  if (picked.length < ids.length) throw new Error(`${rowIds}: ${picked.length} lots for ${ids.length} shops`);
  ids.forEach((sid, i) => { used.add(picked[i].key); setAt(sid, toWorld(picked[i].at)); });
}
// Yongmaru Market's stalls keep their places under the arcade, which moved
// from south of Itaewon-ro to north of it: the one nearest the road stays nearest.
{
  const OLD_C = r1(MKT_TOP + 46); // the arcade's middle when the lane ran south
  for (const sid of ['jangdok-banchan', 'saebit-fruit', 'dalmaji-tteok', 'badabit-dried', 'gosohan-mill', 'onggi-story']) {
    const [x, z] = toLocal(storeAt(sid));
    if (Math.abs(x - MKT_X) > 10) throw new Error(`${sid} is not on the market lane`);
    if (z > MKT_TOP) setAt(sid, toWorld([x, r1(MKT_C - (z - OLD_C))])); // (else built already)
  }
}
// Gyeongnidan-gil: the old-style café on the way up, clothes, books and
// antiques along it (they were on Bogwang-ro) and the taproom at the top.
for (const [sid, x, side] of [['dalgona-dabang', 82, 1], ['hilltop-taproom', 135, -1], ['golden-needle', 30, 1], ['big-step', 45, -1], ['gaeul-vintage', 60, 1], ['page-atlas', 100, -1], ['old-oak-antiques', 115, 1]]) {
  const lot = gyLots.filter((l) => !l.taken && l.w >= 7.5).sort((a, b) => (Math.abs(a.x - x) + (a.side === side ? 0 : 20)) - (Math.abs(b.x - x) + (b.side === side ? 0 : 20)))[0];
  lot.taken = true;
  lot.b.shop = sid;
  setAt(sid, toWorld(lot.front));
}
// The museums' doors.
{
  const wm = toLocal(storeAt('war-memorial'));
  const hall = itaewon.buildings.find((b) => b.wall === '#cfcac0');
  const [x0, , x1, z1] = box(hall.p);
  setAt('war-memorial', toWorld([r1((x0 + x1) / 2), r1(z1 + 2)]));
  void wm;
  setAt('national-museum', toWorld(MUSEUM.door));
}

// ---------- region.json: the station's exits and the link roads ----------
let rt = regionText;
const fmtP = (p) => `[${p.map((q) => `[${r1(q[0])}, ${r1(q[1])}]`).join(', ')}]`;
// Replace a link's points in the hand-formatted text: find the "p" array that
// holds exactly its old points.
const replaceLinkAt = (idx, p) => {
  const old = JSON.stringify(region.links[idx].p);
  let from = rt.indexOf('"links"');
  for (;;) {
    const s = rt.indexOf('"p"', from);
    if (s < 0) throw new Error(`link ${idx} not found`);
    const a = rt.indexOf('[', s);
    let depth = 0, e = a;
    for (; e < rt.length; e++) { if (rt[e] === '[') depth++; else if (rt[e] === ']' && --depth === 0) break; }
    if (JSON.stringify(JSON.parse(rt.slice(a, e + 1))) === old) { rt = rt.slice(0, a) + fmtP(p) + rt.slice(e + 1); return; }
    from = e;
  }
};
const linkIdx = (en, test = () => true) => { const i = region.links.findIndex((l) => l.n?.en === en && test(l)); if (i < 0) throw new Error(`no link ${en}`); return i; };
const replaceLink = (en, p, test) => replaceLinkAt(linkIdx(en, test), p);
const linkP = (en, test) => region.links[linkIdx(en, test)].p;
// Itaewon-ro: on east from Hangangjin as before.
{ const p = linkP('Itaewon-ro'); const k = p.findIndex(([x, z]) => x - ox < 420 && Math.abs(z - oz) < 40); replaceLink('Itaewon-ro', [...p.slice(0, k + 1), toWorld([250, -55]), toWorld(ITAEWON.at(-1))]); }
// Sowol-ro: from Itaewon's end of it north-west round Namsan to Namdaemun, on
// its real line, as far as the road round Sungnyemun (Euljiro's map), where
// Toegye-ro starts on the ring's east side.
const RING = (() => {
  const d = region.districts.find((q) => q.id === 'euljiro');
  const m = JSON.parse(readFileSync(path.join(R, d.map), 'utf8'));
  const r = m.roads.find((q) => q.n?.en === 'Sejong-daero' && d2(q.p[0], q.p.at(-1)) < 1);
  return r.p.map(([x, z]) => [x + d.offset[0], z + d.offset[1]]);
})();
const cross = (a, b, c, e) => {
  const den = (b[0] - a[0]) * (e[1] - c[1]) - (b[1] - a[1]) * (e[0] - c[0]);
  if (!den) return null;
  const t = ((c[0] - a[0]) * (e[1] - c[1]) - (c[1] - a[1]) * (e[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] : null;
};
const toRing = (p) => {
  for (let i = 1; i < p.length; i++) {
    for (let j = 1; j < RING.length; j++) { const q = cross(p[i - 1], p[i], RING[j - 1], RING[j]); if (q) return [...p.slice(0, i), q]; }
  }
  return p;
};
const SOWOL_LINK = toRing([SOWOL[0], ...SOWOL_NORTH.filter((q) => q[1] < SOWOL[0][1] - 5)].map(toWorld));
replaceLink('Sowol-ro', SOWOL_LINK);
// Sopa-ro from Toegye-ro round to Sowol-ro, on its real line (as scripts/build-namsan.mjs draws it).
{
  const g = ([lat, lon]) => toGame(lat, lon);
  const toegye = linkP('Toegye-ro', (l) => d2(l.p[0], RING[0]) < 200);
  let sopa = NAMSAN_OSM.sopaRo.flatMap((w, i) => (i ? w.slice(1) : w)).map(g);
  const westOf = (q) => q[0] < nearestOn(q, SOWOL_LINK).at[0];
  sopa = sopa.filter((q) => !westOf(q));
  sopa = [nearestOn(sopa[0], toegye).at, ...sopa, nearestOn(sopa.at(-1), SOWOL_LINK).at];
  replaceLink('Sopa-ro', simplify(sopa, 2));
}
// The road to Banpo Bridge starts at Noksapyeong-daero's end.
{ const p = linkP('To Banpo Bridge'); replaceLink('To Banpo Bridge', [toWorld(NOKSA.at(-1)), ...p.slice(1)]); }
// Their notes.
const note = (from, to) => { if (rt.includes(from)) rt = rt.replace(from, to); };
note('north to Sungnyemun, where Toegye-ro starts. Itaewon', "north to the road round Sungnyemun, where Toegye-ro starts, on its real line (OpenStreetMap, scripts/build-itaewon.mjs). Itaewon");
note("From Itaewon's Seobinggo-ro down Noksapyeong-daero,", "From the south end of Itaewon's Noksapyeong-daero");
// Itaewon Station's exits.
{
  const i = rt.indexOf('"id": "itaewon-station"');
  const s = rt.indexOf('"exits"', i), a = rt.indexOf('[', s);
  let depth = 0, e = a;
  for (; e < rt.length; e++) { if (rt[e] === '[') depth++; else if (rt[e] === ']' && --depth === 0) break; }
  rt = rt.slice(0, a) + `[${EXITS.map(({ n, at, ry }) => `{"n": ${n}, "at": [${toWorld(at).join(', ')}], "ry": ${ry}}`).join(', ')}]` + rt.slice(e + 1);
}

writeFileSync(MAP, JSON.stringify(itaewon));
writeFileSync(path.join(R, 'stores.json'), stores);
writeFileSync(path.join(R, 'region.json'), rt);

// ---------- How close to the real map ----------
const len = (p) => Math.round(lengthOf(p));
console.log(`itaewon: ${buildings.length} town buildings + ${gyBuildings.length} on the hill; ${used.size} shops placed`);
console.log(`  Itaewon-ro ${len(ITAEWON)} m (Samgakji to Hangangjin at 1/4), Gyeongnidan-gil ${len(MAIN)} m`);
for (const e of EXITS) console.log(`  Itaewon Station exit ${e.n}: ${r1(d2(e.at, loc(e.real.at)))} m from the real one`);
const wmHall = itaewon.buildings.find((b) => b.wall === '#cfcac0');
const [hx0, hz0, hx1, hz1] = box(wmHall.p);
console.log(`  War History Museum: ${r1(hx1 - hx0)} x ${r1(hz1 - hz0)} m, h ${wmHall.h} m; middle ${r1(d2([(hx0 + hx1) / 2, (hz0 + hz1) / 2], loc([37.5370942, 126.9770518])))} m from the real hall`);
const mh = box(MUSEUM_HALL);
console.log(`  Art museum building middle ${r1(d2([(mh[0] + mh[2]) / 2, (mh[1] + mh[3]) / 2], (() => { const b = box(itaewon.buildings.find((q) => q.ym && q.h === 11).p); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; })()))} m from the real one`);
void segDist; void facing;
