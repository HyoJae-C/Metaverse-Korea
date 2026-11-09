#!/usr/bin/env node
// Builds Gyeongnidan-gil (경리단길) into the Itaewon district from the real
// road map:
//
//   - the roads: Hoenamu-ro (회나무로, the street people call Gyeongnidan-gil)
//     from Noksapyeong-daero up the hill, and the lanes off it, from
//     OpenStreetMap (scripts/data/gyeongnidan-osm.json, © OpenStreetMap
//     contributors, ODbL). Real shape and real size: 1 m is 1 m.
//   - the hill: the street climbs east; the lanes north climb on towards
//     Namsan and the lanes south go down towards Itaewon (meta.hill, read by
//     src/core/hill-ground.js). The heights are a game approximation of the
//     slope, not surveyed.
//   - small buildings along every street, standing on the slope, and a few of
//     Itaewon's own restaurants, a café and the taproom moved up onto it.
//
// The foot of the street (where Hoenamu-ro leaves Noksapyeong-daero) is put
// at FOOT in Itaewon's metres; everything else keeps its real place from
// there. Between districts the game map is squeezed (docs/WORLD.md), so the
// walk from Itaewon-ro up Noksapyeong-daero to the foot is short.
//
//   node scripts/build-gyeongnidan.mjs   rewrites districts/itaewon.json
//                                        (only its Gyeongnidan part, marked
//                                        "gy") and the "at" of SHOPS in
//                                        stores.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hillHeightRel } from '../src/core/hill-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const r1 = (v) => Math.round(v * 10) / 10;
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'gyeongnidan-osm.json'), 'utf8'));

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
const rand = rng(1974);

// ---------- Real coordinates -> metres from the foot of the street ----------
const FOOT_LL = [37.538417, 126.986824]; // Hoenamu-ro meets Noksapyeong-daero (OSM node shared by both)
export const FOOT = [172, -80]; // ... in Itaewon's metres: at the top of the short Noksapyeong-daero stub
const M_LAT = 110960, M_LON = 111320 * Math.cos((FOOT_LL[0] * Math.PI) / 180);
const rel = ([lat, lon]) => [(lon - FOOT_LL[1]) * M_LON, -(lat - FOOT_LL[0]) * M_LAT]; // east +x, north -z

// The part of the real map that is built (metres from the foot):
// x from just west of the foot to the top of the café strip, where
// Hoenamu-ro 32-gil and 35-gil cross it; z from the Namsan side down to just
// above the shops on Itaewon-ro.
const WIN = { x0: -45, x1: 606, z0: -250, z1: 30 };

// ---------- Roads ----------
// Clip a polyline to the window: the pieces inside, each at least `min` long.
function clip(pts, { x0, x1, z0, z1 }, min = 12) {
  const out = [];
  let cur = [];
  const inside = ([x, z]) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  const cut = (a, b) => { // the point where a (inside) -> b (outside) leaves the window
    let t = 1;
    const [ax, az] = a, dx = b[0] - ax, dz = b[1] - az;
    if (b[0] > x1) t = Math.min(t, (x1 - ax) / dx);
    if (b[0] < x0) t = Math.min(t, (x0 - ax) / dx);
    if (b[1] > z1) t = Math.min(t, (z1 - az) / dz);
    if (b[1] < z0) t = Math.min(t, (z0 - az) / dz);
    return [ax + dx * t, az + dz * t];
  };
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (inside(p)) {
      if (!cur.length && i > 0) cur.push(cut(p, pts[i - 1]));
      cur.push(p);
    } else if (cur.length) {
      cur.push(cut(pts[i - 1], p));
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  const len = (l) => l.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0);
  return out.filter((l) => l.length > 1 && len(l) >= min);
}

const ways = new Map(osm.ways.map((w) => [w.id, w]));
const relPts = (id) => ways.get(id).geometry.map(rel);
const nm = (w, extra = {}) => (w.name ? { ko: w.name, en: w['name:en'] || w.name, ...extra } : { ko: '경리단길 골목', en: 'Gyeongnidan-gil lane', ja: '経理団通りの路地', zh: '经理团路小巷' });

// The main street: the two Hoenamu-ro ways joined, cut at the top of the strip.
const mainRel = clip([...relPts(37403459), ...relPts(1346149787).slice(1)], WIN, 50)[0];
const roadsRel = [{ k: 'secondary', w: 10, p: mainRel, n: { ko: '경리단길 (회나무로)', en: 'Gyeongnidan-gil (Hoenamu-ro)', ja: '経理団通り（フェナム路）', zh: '经理团路（会那木路）' }, main: true }];
// Sinheung-ro goes north from the foot to Haebangchon; it is cut where it
// meets Sowol-ro (z = -182 in Itaewon's metres) and joined to it there.
const SOWOL_Z = -182 - FOOT[1];
roadsRel.push({ k: 'tertiary', w: 7, p: clip(relPts(37403309), { ...WIN, z0: SOWOL_Z }, 20)[0], n: { ko: '신흥로', en: 'Sinheung-ro', ja: '新興路', zh: '新兴路' } });
// The lanes: narrow (4 to 6 m), the way they are.
const LANES = [
  [228799557, 5], [228799561, 5], [350782157, 5], [330306028, 5], [318750932, 4.5], [350782168, 5],
  [464464373, 4.5], [1147820244, 4.5], [350782175, 5], [228799562, 5], [486778186, 4], [822891097, 4], [822891098, 4.5],
];
// The lanes south run on down to Itaewon-ro (flat ground there), so you can
// walk up from Itaewon by the back lanes too.
const LANE_WIN = { ...WIN, z1: -7 - FOOT[1] };
for (const [id, w] of LANES) {
  const way = ways.get(id);
  for (const p of clip(relPts(id), LANE_WIN)) roadsRel.push({ k: way.highway === 'pedestrian' ? 'walk' : 'residential', w, p, n: nm(way) });
}

// ---------- The hill ----------
// Height of the main street going east (m above its foot), and where it is.
// Gently up from the foot, steadiest through the café strip, easing at the top.
const PROF = [[0, 0], [40, 0.6], [120, 4], [250, 10], [400, 15], [WIN.x1, 18]];
const roadZ = [];
{ // the main street's z for each x (it only ever heads east)
  let last = -Infinity;
  for (const [x, z] of mainRel) if (x > last + 0.5) { roadZ.push([r1(x), r1(z)]); last = x; }
}
export const HILL = {
  at: FOOT, prof: PROF, road: roadZ, flat: 6, kN: 0.07, zs: WIN.z1, ramp: [20, 80],
  win: [WIN.x0, WIN.z0, WIN.x1, WIN.z1], fade: 60,
  credit: 'Roads: © OpenStreetMap contributors (ODbL). Slope: game approximation.',
};
const ground = (x, z) => hillHeightRel(HILL, x - FOOT[0], z - FOOT[1]); // (x, z) in Itaewon's metres

// ---------- Itaewon's old made-up east side ----------
const itaewon = JSON.parse(readFileSync(MAP, 'utf8'));
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const OLD_ROADS = new Set(['Itaewon alley@100', 'Sinheung-ro', 'Gyeongnidan-gil']);
itaewon.roads = itaewon.roads.filter((r) => !r.gy && !OLD_ROADS.has(r.n?.en) && !OLD_ROADS.has(`${r.n?.en}@${r.p[0][0]}`));
itaewon.buildings = itaewon.buildings.filter((b) => {
  if (b.gy) return false;
  const [x, z] = centroid(b.p);
  if (x > 97 && z < -62) return false; // the made-up blocks between the old alley and the old Gyeongnidan-gil
  return !(x > 285 && x < 310 && z < -10 && z > -52); // two small ones where Hoenamu-ro 6-gil comes down
});
itaewon.landmarks = itaewon.landmarks.filter((l) => !l.gy && !(l.type === 'arch' && ['GYEONGNIDAN-GIL', 'HAEBANGCHON'].includes(l.title)));
itaewon.pois = itaewon.pois.filter((p) => !p.gy && p.name?.en !== 'Haebangchon');
for (const r of itaewon.roads) {
  // Noksapyeong-daero now runs north from Itaewon-ro to the foot of the hill too.
  if (r.n?.en === 'Noksapyeong-daero') { r.p = [[FOOT[0], FOOT[1]], [FOOT[0], 0], [FOOT[0], 164]]; r.w = 7; }
  // Sowol-ro and the back alley stop where they meet Sinheung-ro.
  if (r.n?.en === 'Sowol-ro') r.p = [r.p[0], [r1(roadsRel[1].p.at(-1)[0] + FOOT[0]), -182]];
  if (r.n?.en === 'Itaewon back alley') r.p = [r.p[0], [160, r.p[1][1]]];
  // The made-up "Hoenamu-ro" along Itaewon's south edge was in the wrong
  // place (the real one is Gyeongnidan-gil): the road past the museum is
  // Seobinggo-ro.
  if (r.n?.en === 'Hoenamu-ro' && r.p[0][1] > 0) r.n = { ko: '서빙고로', en: 'Seobinggo-ro', ja: '西氷庫路', zh: '西冰库路' };
}

// ---------- Put the new roads in ----------
const roads = roadsRel.map((r) => ({ k: r.k, w: r.w, p: r.p.map(([x, z]) => [r1(x + FOOT[0]), r1(z + FOOT[1])]), n: r.n, gy: 1, ...(r.main ? { main: 1 } : {}) }));
// Join Sinheung-ro's foot to the foot of the street exactly.
roads[1].p[0] = [FOOT[0], FOOT[1]];
roads[0].p[0] = [FOOT[0], FOOT[1]];
// Old buildings a new road runs into make way for it.
{
  const pip = (x, z, p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, zi] = p[i], [xj, zj] = p[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  const onRoad = [];
  for (const r of roads) for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s <= len; s += 1) for (const o of [-r.w / 2, 0, r.w / 2]) onRoad.push([ax + ((bx - ax) * s) / len - ((bz - az) / len) * o, az + ((bz - az) * s) / len + ((bx - ax) / len) * o]);
  }
  itaewon.buildings = itaewon.buildings.filter((b) => !onRoad.some(([x, z]) => pip(x, z, b.p)));
}

// ---------- Buildings along the streets ----------
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const links = region.links.map((l) => ({ w: l.w, p: l.p.map(([x, z]) => [x - ox, z - oz]) })); // (the roads between districts, in Itaewon's metres)
const allRoads = () => [...itaewon.roads, ...roads, ...links];
const clearOfRoads = (pts) => {
  for (const r of allRoads()) for (let i = 1; i < r.p.length; i++) for (const [x, z] of pts) if (segDist(x, z, r.p[i - 1], r.p[i]) < r.w / 2 + 0.9) return false;
  return true;
};
const inPoly = (x, z, p) => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
// Two convex polygons overlap (separating axis test, with a gap).
function overlap(a, b, gap = 0.6) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length];
    const nx = z2 - z1, nz = x1 - x2, l = Math.hypot(nx, nz) || 1;
    const pa = a.map(([x, z]) => (x * nx + z * nz) / l), pb = b.map(([x, z]) => (x * nx + z * nz) / l);
    if (Math.max(...pa) + gap <= Math.min(...pb) || Math.max(...pb) + gap <= Math.min(...pa)) return false;
  }
  return true;
}
const bbox = (p) => [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))];
const solids = [...itaewon.buildings, ...(itaewon.blockers || [])].map((b) => ({ p: b.p, box: bbox(b.p) }));
const hits = (p) => {
  const [x0, z0, x1, z1] = bbox(p);
  for (const s of solids) {
    if (s.box[0] > x1 + 1 || s.box[2] < x0 - 1 || s.box[1] > z1 + 1 || s.box[3] < z0 - 1) continue;
    if (s.p.length <= 6 ? overlap(p, s.p) : p.some(([x, z]) => inPoly(x, z, s.p)) || s.p.some(([x, z]) => inPoly(x, z, p))) return true;
  }
  return false;
};
// Lots are kept off Namsan's park and off the War Memorial grounds; only
// inside this box (Itaewon's metres) and inside the hill's window.
const LOTS = { x0: 97, x1: FOOT[0] + WIN.x1 - 4, z0: FOOT[1] + WIN.z0 + 4, z1: -12 };
const lotOk = (p) => p.every(([x, z]) => x >= LOTS.x0 && x <= LOTS.x1 && z >= LOTS.z0 && z <= LOTS.z1)
  && !(itaewon.areas || []).some((a) => a.k === 'park' && p.some(([x, z]) => inPoly(x, z, a.p)));

const buildings = [], lots = []; // lots: the main street's shop fronts
for (const r of roads) {
  if (r.k === 'walk' && r.w < 4.5) continue; // the stepped footpaths: no fronts of their own
  const main = !!r.main;
  for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 6) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const side of [1, -1]) {
      const nx = -uz * side, nz = ux * side;
      const off = r.w / 2 + (main ? 1.8 : 0.9); // a pavement along the main street
      let s = 0.5;
      while (s < len - 4) {
        const w = main ? 7 + rand() * 4 : 5.5 + rand() * 4;
        const d = main ? 9 + rand() * 4 : 7 + rand() * 4;
        const e = Math.min(len, s + w);
        if (e - s < 4.5) break;
        const at = (t, o) => [r1(ax + ux * t + nx * o), r1(az + uz * t + nz * o)];
        const p = [at(s, off), at(e, off), at(e, off + d), at(s, off + d)];
        const mid = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
        const probe = [...p, mid, [(p[2][0] + p[3][0]) / 2, (p[2][1] + p[3][1]) / 2], [(mid[0] + p[2][0]) / 2, (mid[1] + p[2][1]) / 2]];
        if (lotOk(p) && clearOfRoads(probe) && !hits(p)) {
          const y = ground(mid[0] - nx * 1, mid[1] - nz * 1); // the floor: level with the street at the door
          const y0 = Math.min(...p.map(([x, z]) => ground(x, z)), y) - 0.4;
          const storeys = main ? 2 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2.6);
          const b = { h: r1(storeys * 3.2 + rand() * 1.2), p, gy: 1 };
          if (y > 0.05 || y0 < -0.05) { b.y = r1(y); b.y0 = r1(Math.min(y0, b.y)); }
          buildings.push(b);
          solids.push({ p, box: bbox(p) });
          if (main) lots.push({ b, front: [r1(mid[0] - nx * 1.5), r1(mid[1] - nz * 1.5)], x: mid[0] - FOOT[0], side, w: e - s });
          s = e + 0.6 + rand() * 1.2;
        } else s += 2;
      }
    }
  }
}

// Homes in the blocks between the lanes: Gyeongnidan's hillside is packed
// with small houses and villas, so the land behind the street fronts is
// filled too (off the streets, so every lane stays open).
const nearestDir = (x, z) => {
  let best = Infinity, dir = [1, 0];
  for (const r of roads) for (let i = 1; i < r.p.length; i++) {
    const d = segDist(x, z, r.p[i - 1], r.p[i]);
    if (d < best) { best = d; const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], l = Math.hypot(bx - ax, bz - az) || 1; dir = [(bx - ax) / l, (bz - az) / l]; }
  }
  return dir;
};
const clearOfRoadsBy = (pts, pad) => {
  for (const r of allRoads()) for (let i = 1; i < r.p.length; i++) for (const [x, z] of pts) if (segDist(x, z, r.p[i - 1], r.p[i]) < r.w / 2 + pad) return false;
  return true;
};
let homes = 0;
for (let x = FOOT[0] + 4; x < LOTS.x1; x += 8) for (let z = LOTS.z0; z < LOTS.z1; z += 8) {
  if (rand() < 0.2) continue;
  const cx = x + (rand() - 0.5) * 3, cz = z + (rand() - 0.5) * 3;
  if (ground(cx, cz) < 0.3) continue; // only on the hill
  const [ux, uz] = nearestDir(cx, cz), w = 6 + rand() * 3, d = 6 + rand() * 3;
  const c = (a, b) => [r1(cx + ux * a - uz * b), r1(cz + uz * a + ux * b)];
  const p = [c(-w / 2, -d / 2), c(w / 2, -d / 2), c(w / 2, d / 2), c(-w / 2, d / 2)];
  if (!lotOk(p) || !clearOfRoadsBy([...p, [cx, cz]], 2.2) || hits(p)) continue;
  const gs = p.map(([px, pz]) => ground(px, pz));
  const b = { h: r1((2 + Math.floor(rand() * 2)) * 3.2 + rand()), p, gy: 1, y: r1(Math.max(...gs) - 0.3), y0: r1(Math.min(...gs) - 0.4) };
  buildings.push(b);
  solids.push({ p, box: bbox(p) });
  homes++;
}

// ---------- Shops moved up from Itaewon-ro and the food street ----------
// Gyeongnidan-gil is small restaurants, cafés and bars, so a few of
// Itaewon's own move up here (no new ones): the American diner near the
// foot, the Italian kitchen and the old-style café on the way up, and the
// taproom at the top.
const SHOPS = [['sunny-side-diner', 70, 1], ['nonna-lucia', 210, -1], ['dalgona-dabang', 330, 1], ['hilltop-taproom', 520, -1]];
const storesFile = path.join(R, 'stores.json');
let storesText = readFileSync(storesFile, 'utf8');
const taken = new Set();
for (const [id, x, side] of SHOPS) {
  const lot = lots.filter((l) => !taken.has(l) && l.w >= 7.5).sort((a, b) => (Math.abs(a.x - x) + (a.side === side ? 0 : 40)) - (Math.abs(b.x - x) + (b.side === side ? 0 : 40)))[0];
  taken.add(lot);
  lot.b.shop = id; // (for the record: which front is a shop)
  const at = [r1(lot.front[0] + ox), r1(lot.front[1] + oz)];
  const re = new RegExp(`("id":\\s*"${id}",[\\s\\S]*?"at":\\s*\\[)[^\\]]*(\\])`);
  if (!re.test(storesText)) throw new Error('no store ' + id);
  storesText = storesText.replace(re, `$1${at[0]}, ${at[1]}$2`);
}
writeFileSync(storesFile, storesText);

// ---------- Signs, places, the hill ----------
const dirAt = (p, i = 0) => [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]];
const archRy = ([dx, dz]) => Math.round(Math.atan2(-dx, -dz) * 100) / 100; // an arch spans across a road heading (dx, dz)
const landmarks = [
  { type: 'arch', x: r1(FOOT[0] + 16), z: r1(FOOT[1] + 2), w: 12, ry: archRy(dirAt(roads[0].p, 1)), title: 'GYEONGNIDAN-GIL', sub: '경리단길', color: '#2f6f8f', gy: 1 },
  { type: 'arch', x: r1(FOOT[0] - 3), z: r1(FOOT[1] - 12), w: 9, ry: archRy(dirAt(roads[1].p)), title: 'HAEBANGCHON', sub: '해방촌', color: '#7a4fa0', gy: 1 },
];
const mainAt = (x) => { const p = roads[0].p.find((q) => q[0] - FOOT[0] >= x) || roads[0].p.at(-1); return p; };
const pois = [
  { kind: 'landmark', x: mainAt(260)[0], z: mainAt(260)[1], name: { ko: '경리단길', en: 'Gyeongnidan-gil', ja: '経理団通り', zh: '经理团路' }, gy: 1 },
  { kind: 'landmark', x: r1(FOOT[0] - 25), z: -150, name: { ko: '해방촌', en: 'Haebangchon', ja: '解放村', zh: '解放村' }, gy: 1 },
];
itaewon.roads.push(...roads);
itaewon.buildings.push(...buildings);
itaewon.landmarks.push(...landmarks);
itaewon.pois.push(...pois);
itaewon.meta = { ...itaewon.meta, source: 'hand-made (game map, not to scale); Gyeongnidan-gil from OpenStreetMap (scripts/build-gyeongnidan.mjs)', credit: '© OpenStreetMap contributors (ODbL)', hill: HILL };
writeFileSync(MAP, JSON.stringify(itaewon));
console.log(`Gyeongnidan-gil: ${roads.length} roads, ${buildings.length} buildings (${lots.length} on the main street, ${homes} homes behind), top of the street ${PROF.at(-1)[1]} m up.`);
