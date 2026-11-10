#!/usr/bin/env node
// Puts Namsan (남산) on its real place at a quarter of the real size, like
// the rest of the game's Seoul (docs/WORLD.md):
//
//   - the hill: its top, with the look-out tower, on N Seoul Tower's real
//     spot; 65 m high (262 m / 4); its foot an ellipse that fits between
//     Sopa-ro and Sowol-ro (west), Namsangol Hanok Village (north) and
//     Itaewon (south). Real Namsan's summit is near its west end and its
//     ridge runs on east, so the hill leans west (core/namsan-shape.js).
//   - the cable car (Namsan Sky Cable): the lower station on the real one
//     by Sopa-ro, above Myeongdong and Hoehyeon, and the cable up to the
//     real upper station by the tower.
//   - Sopa-ro (소파로): the real road past the lower station, from
//     Toegye-ro by Myeongdong round to Sowol-ro, so you can walk there.
//   - the Namsan trail from Itaewon runs on up Sowol-ro's far side to the
//     new foot of the hill.
//
// Real data: scripts/data/namsan-osm.json (© OpenStreetMap contributors,
// ODbL). Everything here is world metres (x east, z south) unless it says
// Itaewon's (the district map's own) metres.
//
//   node scripts/build-namsan.mjs   rewrites the Namsan part of
//                                   districts/itaewon.json (marked "ns"),
//                                   the cable car's "at" in stores.json and
//                                   the Sopa-ro link in region.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { namsanGround, onNamsan } from '../src/core/namsan-shape.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const REGION = path.join(R, 'region.json');
const STORES = path.join(R, 'stores.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'namsan-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const g = ([lat, lon]) => toGame(lat, lon);
const mid = (pts) => { const q = pts.map(g); return [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length]; };
const NAME = { ko: '남산', en: 'Namsan', ja: '南山', zh: '南山' };

const itaewon = JSON.parse(readFileSync(MAP, 'utf8'));
const regionText = readFileSync(REGION, 'utf8');
const region = JSON.parse(regionText);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const loc = ([x, z]) => [r1(x - ox), r1(z - oz)]; // world -> Itaewon's metres

// ---------- Real places ----------
const TOWER = g(osm.tower);
const LOW = mid(osm.lowerStation); // the lower station's real centre
const TOP = mid(osm.upperStation);

// ---------- The hill ----------
// The foot's centre is east of the tower (the ridge runs east), as far as
// the roads round it allow; see the checks at the end.
// (scripts/build-itaewon.mjs pulled the south side 10 m north so the foot
// clears the real Sowol-ro: it was [-1400, -190] with rz 170.)
const FOOT = [-1400, -200];
const HILL = { rx: 190, rz: 160, h: 65, px: r1(TOWER[0] - FOOT[0]), pz: r1(TOWER[1] - FOOT[1]) };
const ellipse = (k, n = 32) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return loc([FOOT[0] + Math.cos(a) * HILL.rx * k, FOOT[1] + Math.sin(a) * HILL.rz * k]);
});

// ---------- Sopa-ro ----------
const links = region.links;
const linkNamed = (en) => links.find((l) => l.n?.en === en);
const near = (p, line) => { // nearest point on a polyline
  let best = null;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / (dx * dx + dz * dz || 1)));
    const q = [ax + dx * t, az + dz * t], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (!best || d < best.d) best = { q, d };
  }
  return best;
};
function simplify(pts, tol) { // Douglas-Peucker
  if (pts.length < 3) return pts;
  let worst = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = near(pts[i], [pts[0], pts.at(-1)]).d; if (d > worst) { worst = d; at = i; } }
  return worst < tol ? [pts[0], pts.at(-1)] : [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}
const sowol = linkNamed('Sowol-ro').p, toegye = linkNamed('Toegye-ro').p;
let sopa = osm.sopaRo.flatMap((w, i) => (i ? w.slice(1) : w)).map(g);
// The game's Sowol-ro runs a little east of the real one here: stop where
// Sopa-ro meets it, and start it on Toegye-ro.
const westOfSowol = (p) => p[0] < near(p, sowol).q[0];
sopa = sopa.filter((p) => !westOfSowol(p));
sopa = [near(sopa[0], toegye).q, ...sopa, near(sopa.at(-1), sowol).q];
sopa = simplify(sopa, 2).map(([x, z]) => [r1(x), r1(z)]);
const SOPA = { k: 'tertiary', w: 8, p: sopa, n: { ko: '소파로', en: 'Sopa-ro', ja: '素坡路', zh: '素坡路' }, note: 'Sopa-ro, the road up past the Namsan cable car\'s lower station, from Toegye-ro by Myeongdong round to Sowol-ro, on its real line (OpenStreetMap, scripts/build-namsan.mjs).' };

// ---------- The lower station ----------
// A normal-size station (only distances shrink), on its real spot, moved
// just far enough off Sopa-ro to clear it.
const W = 30, D = 16, H = 9;
const clear = (c) => Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0], [0, 0]].map(([a, b]) => near([c[0] + (a * W) / 2, c[1] + (b * D) / 2], sopa).d)) - SOPA.w / 2;
let st = [...LOW];
for (let i = 0; i < 60 && clear(st) < 2; i++) { // step away from the road
  const q = near(st, sopa).q, d = Math.hypot(st[0] - q[0], st[1] - q[1]) || 1;
  st = [st[0] + (st[0] - q[0]) / d, st[1] + (st[1] - q[1]) / d];
}
st = st.map(r1);
const stLoc = loc(st);
const station = { h: H, p: [[stLoc[0] - W / 2, stLoc[1] - D / 2], [stLoc[0] + W / 2, stLoc[1] - D / 2], [stLoc[0] + W / 2, stLoc[1] + D / 2], [stLoc[0] - W / 2, stLoc[1] + D / 2]].map(([x, z]) => [r1(x), r1(z)]), n: { ko: '남산 하늘 케이블카 승강장', en: 'Namsan Sky Cable lower station' }, ns: 1 };
// The door: the middle of the side that faces Sopa-ro.
const sides = [[0, -D / 2, 0, -1], [W / 2, 0, 1, 0], [0, D / 2, 0, 1], [-W / 2, 0, -1, 0]];
const roadQ = near(st, sopa).q;
const side = sides.sort((a, b) => ((roadQ[0] - st[0]) * b[2] + (roadQ[1] - st[1]) * b[3]) - ((roadQ[0] - st[0]) * a[2] + (roadQ[1] - st[1]) * a[3]))[0];
const door = [r1(st[0] + side[0] + side[2] * 1.5), r1(st[1] + side[1] + side[3] * 1.5)];

// ---------- The cable ----------
const rel = (p) => [p[0] - FOOT[0], p[1] - FOOT[1]];
const ground = (p) => namsanGround(HILL, ...rel(p));
const topG = ground(TOP), topY = topG + 7.5;
const path3 = [[0, 0, H + 1.5, H]];
for (const t of [0.25, 0.5, 0.75]) {
  const p = [st[0] + (TOP[0] - st[0]) * t, st[1] + (TOP[1] - st[1]) * t];
  const gy = ground(p);
  const y = Math.max(H + 1.5 + (topY - H - 1.5) * t - 4 * Math.sin(Math.PI * t), gy + 14); // a little sag, but cabins clear the trees
  path3.push([r1(p[0] - st[0]), r1(p[1] - st[1]), r1(y), r1(gy)]);
}
path3.push([r1(TOP[0] - st[0]), r1(TOP[1] - st[1]), r1(topY), r1(topG)]);

// ---------- Write the Itaewon map ----------
const old = (it) => it.ns
  || (it.type === 'namsan' || it.type === 'cablecar')
  || it.n?.en === 'Namsan' || it.n?.en === 'Namsan Sky Cable lower station'
  || ['Namsan Lookout Tower', 'Namsan Sky Cable'].includes(it.name?.en)
  || (it.k === 'park' && it.p?.length > 20 && it.p[0][0] === 170 && it.p[0][1] === -320); // the old hill's park
for (const k of ['landmarks', 'blockers', 'areas', 'pois', 'buildings']) itaewon[k] = itaewon[k].filter((it) => !old(it));
const trail = itaewon.roads.find((r) => r.n?.en === 'Namsan trail');
const towerLoc = loc(TOWER), footLoc = loc(FOOT);
const trailX = trail.p[0][0];
const footZ = footLoc[1] + HILL.rz * Math.sqrt(1 - ((trailX - footLoc[0]) / HILL.rx) ** 2); // where the trail meets the hill
trail.p = [trail.p[0], [trailX, r1(footZ - 4)]];
itaewon.landmarks.push(
  { type: 'namsan', x: footLoc[0], z: footLoc[1], ...HILL, trees: 260, ns: 1 },
  { type: 'cablecar', x: stLoc[0], z: stLoc[1], path: path3, ns: 1 },
);
itaewon.blockers.push({ p: ellipse(0.95), n: NAME, ns: 1 });
itaewon.areas.push(
  { k: 'park', p: ellipse(1), ns: 1 },
  { k: 'park', p: [[trailX - 40, r1(footZ - 8)], [trailX + 40, r1(footZ - 8)], [trailX + 40, -212], [trailX - 40, -212]], ns: 1 }, // the woods between Sowol-ro and the foot
);
itaewon.buildings.push(station);
itaewon.pois.push(
  { kind: 'landmark', x: towerLoc[0], z: towerLoc[1], name: { ko: '남산 전망타워', en: 'Namsan Lookout Tower', ja: '南山展望タワー', zh: '南山观景塔' }, ns: 1 },
  { kind: 'landmark', x: loc(door)[0], z: loc(door)[1], name: { ko: '남산 하늘 케이블카', en: 'Namsan Sky Cable', ja: '南山スカイケーブル', zh: '南山天空缆车' }, ns: 1 },
);
itaewon.meta = { ...itaewon.meta, source: 'hand-made (game map, not to scale); Gyeongnidan-gil (scripts/build-gyeongnidan.mjs) and Namsan with its cable car (scripts/build-namsan.mjs) from OpenStreetMap at 1/4 scale' };
writeFileSync(MAP, JSON.stringify(itaewon));

// ---------- The store's door, the Sopa-ro link ----------
let storesText = readFileSync(STORES, 'utf8');
const re = /("id":\s*"namsan-sky-cable",[\s\S]*?"at":\s*\[)[^\]]*(\])/;
if (!re.test(storesText)) throw new Error('no store namsan-sky-cable');
writeFileSync(STORES, storesText.replace(re, `$1${door[0]}, ${door[1]}$2`));
const line = '    ' + JSON.stringify(SOPA, null, 0).replace(/,"/g, ', "').replace(/":/g, '": ');
const lines = regionText.split('\n');
const at = lines.findIndex((l) => l.includes('"en": "Sopa-ro"'));
if (at >= 0) lines[at] = line + (lines[at].trimEnd().endsWith(',') ? ',' : '');
else { const s = lines.findIndex((l) => l.includes('"en": "Sowol-ro"') && l.includes('Namsan')); lines.splice(s + 1, 0, line + ','); }
writeFileSync(REGION, lines.join('\n'));

// ---------- Checks ----------
const off = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]));
const towerAt = [FOOT[0] + HILL.px, FOOT[1] + HILL.pz];
const footClear = (pts) => Math.min(...pts.flatMap((p, i) => (i ? Array.from({ length: 20 }, (_, k) => {
  const q = [pts[i - 1][0] + ((p[0] - pts[i - 1][0]) * k) / 20, pts[i - 1][1] + ((p[1] - pts[i - 1][1]) * k) / 20];
  const [x, z] = rel(q); return Math.hypot(x / HILL.rx, z / HILL.rz);
}) : [])));
console.log(`Namsan: tower ${off(towerAt, TOWER)} m from real, ${HILL.h} m high, foot ${2 * HILL.rx} x ${2 * HILL.rz} m`);
console.log(`Cable car: lower station ${off(st, LOW)} m from real (door ${door}), cable ${Math.round(Math.hypot(TOP[0] - st[0], TOP[1] - st[1]))} m to the upper station at ${Math.round(topG)} m`);
console.log(`Sopa-ro: ${sopa.length} points; nearest foot ratio Sopa-ro ${footClear(sopa).toFixed(2)}, Sowol-ro ${footClear(sowol).toFixed(2)}, Toegye-ro ${footClear(toegye).toFixed(2)} (over 1 = clear)`);
if (station.p.some(([x, z]) => onNamsan(HILL, ...rel([x + ox, z + oz])))) throw new Error('the lower station is on the hill');
for (let i = 1; i < path3.length; i++) for (let k = 0; k <= 20; k++) { // the cabins (4 m under the cable) clear the treetops on the way
  const t = k / 20, [ax, az, ay] = path3[i - 1], [bx, bz, by] = path3[i];
  const p = [st[0] + ax + (bx - ax) * t, st[1] + az + (bz - az) * t];
  if (Math.hypot(p[0] - TOP[0], p[1] - TOP[1]) < 12) continue; // pulling in to the upper station
  const free = ay + (by - ay) * t - ground(p);
  if (free < 8) throw new Error(`the cable is only ${free.toFixed(1)} m over the hill at ${p.map(Math.round)}`);
}
