#!/usr/bin/env node
// Puts Itaewon's two museums on their real places at a quarter of the real
// size, like the rest of the game's Seoul (docs/WORLD.md). Both are seen
// mostly from inside, so their grounds shrink to the real 1/4 (Yozi
// 2026-11-10: "박물관은 어차피 안에서 보는 거니까").
//
//   - The War History Museum (modelled on the War Memorial of Korea, on
//     Itaewon-ro at Samgakji): the whole site (building, corridors,
//     outdoor exhibition, lawns, fence) shrinks to 40% round the main
//     building's middle, which moves onto the real main hall. The plaza in
//     front still reaches Itaewon-ro (z = 0 in Itaewon's metres): from the
//     building's front to the road it stretches to fit, as the real Peace
//     Plaza is deeper than the game's. Heights shrink to 50%, like
//     Gwanghwamun's, so it doesn't look squashed.
//   - The National Central Art Museum (on the real National Museum of
//     Korea's spot, south of Yongsan Park): its building is already 100 m,
//     the real one at 1/4, so it only moves onto the real building, with
//     the park and a path north to Seobinggo-ro.
//
// Real places from OpenStreetMap (the itaewon-namsan export, © OpenStreetMap
// contributors, ODbL): the War Memorial's main building and the National
// Museum of Korea's building (REAL below).
//
//   node scripts/build-yongsan-museums.mjs   rewrites both sites in
//                                            districts/itaewon.json (marked
//                                            "ym") and the two stores' "at"
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const STORES = path.join(R, 'stores.json');
const r1 = (v) => Math.round(v * 10) / 10;

const REAL = {
  warMemorial: [37.5370942, 126.9770518], // the middle of the main hall (전시실, OSM way 229891120's bounds)
  museum: [37.5239253, 126.9803733], // the middle of the museum's building (OSM way 168364800's bounds)
};

const itaewon = JSON.parse(readFileSync(MAP, 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const loc = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - ox, z - oz]; };
let storesText = readFileSync(STORES, 'utf8');
const setAt = (id, [x, z]) => {
  const re = new RegExp(`("id":\\s*"${id}",[\\s\\S]*?"at":\\s*\\[)[^\\]]*(\\])`);
  if (!re.test(storesText)) throw new Error('no store ' + id);
  storesText = storesText.replace(re, `$1${r1(x + ox)}, ${r1(z + oz)}$2`);
};
const storeAt = (id) => { const m = storesText.match(new RegExp(`"id":\\s*"${id}",[\\s\\S]*?"at":\\s*\\[([^\\]]*)\\]`)); return m[1].split(',').map(Number); };
const pts = (it) => it.p || (Number.isFinite(it.x) ? [[it.x, it.z]] : []);
const move = (it, f) => {
  if (it.p) it.p = it.p.map((p) => f(p).map(r1));
  if (Number.isFinite(it.x)) [it.x, it.z] = f([it.x, it.z]).map(r1);
  it.ym = 1;
};

if (itaewon.landmarks.some((l) => l.ym)) {
  console.log('Already built (items marked "ym"); start from the map before it to build again.');
  process.exit(0);
}

// ---------- The War History Museum ----------
// Its site is everything west of x -330 in Itaewon's metres, but the road.
const S = 0.4, UP = 0.5;
const wm = itaewon.landmarks.find((l) => l.type === 'warmemorial');
const wmb = itaewon.buildings.find((b) => b.wall === '#cfcac0');
const front = Math.max(...wmb.p.map((p) => p[1])); // the entrance block's front (z -94): the building keeps its shape
const [rx, rz] = loc(REAL.warMemorial);
const [wx, wz] = [wm.x, wm.z]; // (before it moves)
const front2 = rz + (front - wz) * S;
const shrink = ([x, z]) => [rx + (x - wx) * S, z <= front ? rz + (z - wz) * S : front2 + ((z - front) * (0 - front2)) / (0 - front)];
const onSite = (it) => pts(it).length && pts(it).every(([x]) => x < -330);
for (const k of ['buildings', 'areas', 'blockers', 'landmarks', 'pois', 'roads']) {
  for (const it of itaewon[k]) {
    if (!onSite(it) || it.n?.en === 'Itaewon-ro') continue;
    move(it, shrink);
    if (k === 'buildings') it.h = r1(it.h * UP);
    if (k === 'roads') it.w = Math.max(4, r1(it.w * S * 1.5));
    if (k === 'landmarks') { it.sc = [S, UP]; if (it.clear) it.clear = r1(it.clear * S); }
  }
}
setAt('war-memorial', shrink((([x, z]) => [x - ox, z - oz])(storeAt('war-memorial'))));

// ---------- The National Central Art Museum ----------
const hall = itaewon.buildings.find((b) => b.h === 11 && b.p.length === 4 && b.p[0][0] === -50 && b.p[0][1] === 220);
if (!hall) throw new Error('no museum building');
const mid = [(hall.p[0][0] + hall.p[2][0]) / 2, (hall.p[0][1] + hall.p[2][1]) / 2];
const [mx, mz] = loc(REAL.museum);
const dx = mx - mid[0], dz = mz - mid[1];
const shift = ([x, z]) => [x + dx, z + dz];
const plaza = itaewon.areas.find((a) => a.k === 'plaza' && a.p[0][0] === -54 && a.p[0][1] === 194);
const arch = itaewon.landmarks.find((l) => l.type === 'arch' && l.title === 'NATIONAL MUSEUM OF KOREA');
const poi = itaewon.pois.find((p) => p.name?.en === 'National Central Art Museum');
const way = itaewon.roads.find((r) => r.n?.en === 'Art Museum Way');
const seobinggo = itaewon.roads.find((r) => r.n?.en === 'Seobinggo-ro');
for (const it of [hall, plaza, poi, way]) move(it, shift);
// The way runs north to Seobinggo-ro, with the sign where it leaves the road.
const roadZ = seobinggo.p[0][1];
way.p[0] = [way.p[0][0], r1(roadZ + 4)];
[arch.x, arch.z] = [r1(mx), r1(roadZ + 10)];
arch.ym = 1;
// Yongsan Park round it, from Seobinggo-ro down past the museum (the old
// park east of here stays: it's Yongsan Park too).
const park = itaewon.areas.find((a) => a.k === 'park' && a.p[0][0] === -96 && a.p[0][1] === 170);
itaewon.areas.push({ k: 'park', p: [[r1(mx - 96), r1(roadZ + 6)], [r1(mx + 96), r1(roadZ + 6)], [r1(mx + 96), r1(park.p[2][1] + dz)], [r1(mx - 96), r1(park.p[2][1] + dz)]], ym: 1 });
setAt('national-museum', shift((([x, z]) => [x - ox, z - oz])(storeAt('national-museum'))));

writeFileSync(MAP, JSON.stringify(itaewon));
writeFileSync(STORES, storesText);

const off = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]));
const wb = itaewon.buildings.find((b) => b.wall === '#cfcac0');
const wmid = [(Math.min(...wb.p.map((p) => p[0])) + Math.max(...wb.p.map((p) => p[0]))) / 2, (Math.min(...wb.p.map((p) => p[1])) + Math.max(...wb.p.map((p) => p[1]))) / 2];
console.log(`War History Museum: building ${off(wmid, loc(REAL.warMemorial))} m from the real War Memorial, ${Math.round(Math.max(...wb.p.map((p) => p[0])) - Math.min(...wb.p.map((p) => p[0])))} m wide`);
console.log(`National Central Art Museum: building ${off([(hall.p[0][0] + hall.p[2][0]) / 2, (hall.p[0][1] + hall.p[2][1]) / 2], loc(REAL.museum))} m from the real National Museum of Korea`);
