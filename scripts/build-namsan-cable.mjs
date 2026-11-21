#!/usr/bin/env node
// The Namsan cable car (남산 하늘 케이블카) at 1/4 of the real one, on its
// real line (Yozi 2026-11-19: the old stations and pylons covered the city
// wall trail near the top).
//
//   - the line: OpenStreetMap's aerialway (scripts/data/namsan-osm.json),
//     straight from the lower station by Sopa-ro to the upper one by the
//     summit plaza. Its two middle points are taken as the two pylons (OSM
//     ways of an aerialway put a node on each pylon; the export has no
//     pylon tags, so this is not checked against a photo).
//   - the stations: about the real outlines' size at 1/4 (lower about
//     8 x 9 m, upper about 4 x 5 m), but each has to hold two game-size
//     cabins side by side (a cabin is about 3 m across, the two cables 4 m
//     apart), so both are 8.4 m across the line: the lower one 9.2 m long
//     (a ticket hall of 5.2 m, the building, and the boarding bay), the
//     upper one a 5 m bay. The cabins pull in at the ground, under a
//     canopy, instead of on a station's roof.
//   - nothing on the city wall trail: the upper station moves sideways
//     (away from the trail) just enough to clear it, and a pylon slides
//     along the line off it. How far each moved is printed and kept in
//     the landmark's `why`.
//
// Run after build-namsan.mjs, build-namsan-real.mjs, build-itaewon.mjs,
// build-namsan-wall.mjs and build-namsan-terrain.mjs (they draw the hill and the trails; this only
// rewrites the cable car's landmark, the lower station building, its door in
// stores.json and its map pin).
//
//   node scripts/build-namsan-cable.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { namsanGround, onNamsan } from '../src/core/namsan-shape.js';
import { CABLE_STATION, CABIN_S, CABIN_ROPE, CABLE_TOP_Y } from '../src/core/cablecar.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const STORES = path.join(R, 'stores.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const osm = readJson(path.join(root, 'scripts', 'data', 'namsan-osm.json'));
const region = readJson(path.join(R, 'region.json'));
const itaewon = readJson(MAP);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const g = ([lat, lon]) => toGame(lat, lon);
const mid = (pts) => { const q = pts.slice(0, -1).map(g); return [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length]; };
const segD = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
};
const lineD = (p, l) => Math.min(...l.slice(1).map((b, i) => segD(p, l[i], b)));

const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
const HX = hill.x + ox, HZ = hill.z + oz; // the hill's centre in world metres
const ground = ([x, z]) => namsanGround(hill, x - HX, z - HZ);
const onHill = ([x, z]) => onNamsan(hill, x - HX, z - HZ);
// The trails on the hill (world metres) and how wide you walk on them.
const trails = [
  ...(hill.wtrail || []).map((r) => ({ p: r.map(([x, z]) => [x + HX, z + HZ]), w: hill.wtrailW || 3.8 })),
  ...(hill.trail ? [{ p: hill.trail.map(([x, z]) => [x + HX, z + HZ]), w: hill.trailW || 3 }] : []),
];
const walls = (hill.wall?.runs || []).map((r) => r.map(([x, z]) => [x + HX, z + HZ]));
// How far a point is from the nearest trail's walkable edge (or a wall's face).
const trailGap = (p) => Math.min(...trails.map((t) => lineD(p, t.p) - t.w / 2), ...walls.map((w) => lineD(p, w) - (hill.wall.thick || 1.4) / 2));

// ---------- The real line ----------
const LOW = mid(osm.lowerStation), TOP = mid(osm.upperStation);
const realLine = osm.cable.map(g); // [top, pylon, pylon, low] in the export
const heading = Math.atan2(TOP[0] - LOW[0], TOP[1] - LOW[1]);
const fx = Math.sin(heading), fz = Math.cos(heading); // up the line
const sx = Math.cos(heading), sz = -Math.sin(heading); // across it (the right side, going up)
const { across: W, low: LS, top: TS } = CABLE_STATION;
// A rectangle along the line: centre c, `back` m down the line and `front` m up it.
const rect = (c, back, front, half = W / 2) => [[-back, -half], [front, -half], [front, half], [-back, half]].map(([f, s]) => [c[0] + fx * f + sx * s, c[1] + fz * f + sz * s]);
const corners = (pts) => { const out = [...pts]; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let k = 1; k < 4; k++) out.push([a[0] + ((b[0] - a[0]) * k) / 4, a[1] + ((b[1] - a[1]) * k) / 4]); } return out; };

// ---------- The upper station: on the real spot, slid sideways off the trail ----------
// (the bay's centre is where the cabins stop; its door is at the far end, towards the tower)
const CLEAR = 1; // m kept between the station (or a cabin in it) and a trail's edge
const topFoot = (c) => rect(c, TS.bay / 2, TS.bay / 2 + TS.booth);
const sideWay = (() => { // the side away from the trails
  const l = [TOP[0] - sx * 3, TOP[1] - sz * 3], r = [TOP[0] + sx * 3, TOP[1] + sz * 3];
  return trailGap(r) > trailGap(l) ? 1 : -1;
})();
let top = [...TOP], topMoved = 0;
while (Math.min(...corners(topFoot(top)).map(trailGap)) < CLEAR && topMoved < 15) { topMoved += 0.1; top = [TOP[0] + sx * sideWay * topMoved, TOP[1] + sz * sideWay * topMoved]; }
top = top.map(r1);

// ---------- The lower station: the real spot, off Sopa-ro ----------
const sopa = region.links.find((l) => l.n?.en === 'Sopa-ro');
const lowFoot = (c) => rect(c, LS.hall + LS.bay / 2, LS.bay / 2); // c is the bay's centre; the hall is behind it, down the line
const lowCentre = (c) => [c[0] - fx * (LS.hall / 2), c[1] - fz * (LS.hall / 2)]; // the whole station's middle
let low = [LOW[0] + fx * (LS.hall / 2), LOW[1] + fz * (LS.hall / 2)], lowMoved = 0; // (the station's middle on the real one's)
const roadGap = (c) => Math.min(...corners(lowFoot(c)).map((p) => lineD(p, sopa.p))) - sopa.w / 2;
for (let i = 0; i < 200 && roadGap(low) < 1.5; i++) { // step straight away from the road
  let best = null;
  for (let k = 1; k < sopa.p.length; k++) {
    const [a, b] = [sopa.p[k - 1], sopa.p[k]], d = segD(lowCentre(low), a, b);
    if (!best || d < best.d) best = { d, a, b };
  }
  const nx = -(best.b[1] - best.a[1]), nz = best.b[0] - best.a[0], nl = Math.hypot(nx, nz), c = lowCentre(low);
  const s = Math.sign((c[0] - best.a[0]) * nx + (c[1] - best.a[1]) * nz) || 1;
  low = [low[0] + (nx / nl) * s * 0.1, low[1] + (nz / nl) * s * 0.1];
  lowMoved += 0.1;
}
low = low.map(r1);
if (corners(lowFoot(low)).some(onHill)) throw new Error('the lower station is on the hill');

// ---------- The pylons: OSM's middle points, on the line between the stations ----------
const along = (p) => ((p[0] - low[0]) * (top[0] - low[0]) + (p[1] - low[1]) * (top[1] - low[1])) / Math.hypot(top[0] - low[0], top[1] - low[1]) ** 2;
const at = (t) => [low[0] + (top[0] - low[0]) * t, low[1] + (top[1] - low[1]) * t];
const PYLON = 2.2; // m round a pylon's foot kept off the trail (its legs spread about 1.6 m)
const pylons = realLine.slice(1, -1).map((p) => {
  const t0 = along(p);
  let t = t0, step = 0;
  const span = Math.hypot(top[0] - low[0], top[1] - low[1]);
  // slide it down the line (away from the summit and its trail) until it stands clear
  while (trailGap(at(t)) < PYLON + CLEAR && step < 400) { step++; t = t0 - (step * 0.1) / span; }
  return { t, moved: r1(step * 0.1), off: r1(Math.hypot(at(t)[0] - p[0], at(t)[1] - p[1])) };
});

// ---------- Heights ----------
const rope = CABIN_ROPE * CABIN_S; // the cable above a cabin's floor
const topG = r1(ground(top));
const y0 = r1(CABLE_TOP_Y), y1 = r1(topG + CABLE_TOP_Y); // cabins stop just above the bay floor
const yLine = (t) => y0 + (y1 - y0) * t;
const span = Math.hypot(top[0] - low[0], top[1] - low[1]);
// Each pylon starts high enough that the cabins clear the slope (and the
// trees) by 10 m there, and grows a metre at a time until, along the whole
// line, a cabin's floor stays over the ground, and at least 6 m over it
// farther than 20 m from a station (where it eases down into its bay).
const lift = pylons.map((p) => Math.max(yLine(p.t) + 6, ground(at(p.t)) + rope + 10));
const build = () => [[0, 0, y0, 0], ...pylons.map((p, i) => { const q = at(p.t); return [r1(q[0] - low[0]), r1(q[1] - low[1]), r1(lift[i]), r1(ground(q))]; }), [r1(top[0] - low[0]), r1(top[1] - low[1]), y1, topG]];
const check = (path3) => { // the first stretch (i) that's too low, and the lowest a cabin goes away from the stations
  let bad = 0, lowest = Infinity;
  for (let i = 1; i < path3.length; i++) for (let k = 0; k <= 40; k++) {
    const [ax, az, ay] = path3[i - 1], [bx, bz, by] = path3[i], t = k / 40;
    const p = [low[0] + ax + (bx - ax) * t, low[1] + az + (bz - az) * t];
    const free = ay + (by - ay) * t - rope - ground(p);
    const fromStation = Math.min(Math.hypot(p[0] - low[0], p[1] - low[1]), Math.hypot(p[0] - top[0], p[1] - top[1]));
    if (fromStation > 20) lowest = Math.min(lowest, free);
    if (!bad && (free < -0.05 || (fromStation > 20 && free < 6))) bad = i;
  }
  return { bad, lowest };
};
let path3 = build(), res = check(path3);
for (let n = 0; res.bad && n < 80; n++) {
  // raise the pylon at the low stretch's high end (or both ends' pylons)
  for (const j of [res.bad - 1, res.bad]) if (j >= 1 && j <= pylons.length) lift[j - 1] += 1;
  path3 = build(); res = check(path3);
}
if (res.bad) throw new Error('the cable can\'t clear the hill');
const lowest = res.lowest;

// ---------- Write ----------
const loc = ([x, z]) => [r1(x - ox), r1(z - oz)];
const lowLoc = loc(low);
const doorTop = [top[0] + fx * (TS.bay / 2 + TS.booth + 1.2), top[1] + fz * (TS.bay / 2 + TS.booth + 1.2)];
const cable = itaewon.landmarks.find((l) => l.type === 'cablecar');
Object.assign(cable, {
  x: lowLoc[0], z: lowLoc[1], path: path3,
  door: [r1(doorTop[0] - low[0]), r1(doorTop[1] - low[1])], // the upper station's door (game/namsan-walk.js)
  why: `1/4 on OpenStreetMap's line (Yozi 2026-11-19). Stations 8.4 m across to hold two game-size cabins (real 1/4: lower ~8 x 9 m, upper ~4 x 5 m). Upper station ${r1(topMoved)} m sideways off the city wall trail; pylons from OSM's two middle points${pylons.some((p) => p.moved) ? `, slid ${pylons.map((p) => p.moved).join(' / ')} m down the line off the trail` : ''}; lower station ${r1(lowMoved)} m off Sopa-ro.`,
});
// The ticket hall: a small building down the line from the bay, its door facing Sopa-ro.
const hall = rect(low, LS.hall + LS.bay / 2, -LS.bay / 2).map(loc);
const station = itaewon.buildings.find((b) => b.n?.en === 'Namsan Sky Cable lower station');
station.p = hall;
station.h = LS.h;
// The door: the middle of the hall's side nearest Sopa-ro.
const hallMid = [low[0] - fx * (LS.bay / 2 + LS.hall / 2), low[1] - fz * (LS.bay / 2 + LS.hall / 2)];
const sides = [[-(LS.hall / 2), 0, -1, 0], [0, W / 2, 0, 1], [0, -W / 2, 0, -1]]; // [along, across, normal along, normal across]: back, right, left
const roadPt = (() => { let best = null; for (let k = 1; k < sopa.p.length; k++) { const [a, b] = [sopa.p[k - 1], sopa.p[k]]; const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((hallMid[0] - a[0]) * dx + (hallMid[1] - a[1]) * dz) / (dx * dx + dz * dz))); const q = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(q[0] - hallMid[0], q[1] - hallMid[1]); if (!best || d < best.d) best = { q, d }; } return best.q; })();
const toRoad = [roadPt[0] - hallMid[0], roadPt[1] - hallMid[1]];
const side = sides.map((s) => ({ s, dot: (fx * s[2] + sx * s[3]) * toRoad[0] + (fz * s[2] + sz * s[3]) * toRoad[1] })).sort((a, b) => b.dot - a.dot)[0].s;
const sideAlong = side[2] ? side[0] : 0; // (the middle of a side: where core/storefronts.js puts the door)
const door = [hallMid[0] + fx * (sideAlong + side[2] * 1.5) + sx * (side[1] + side[3] * 1.5), hallMid[1] + fz * (sideAlong + side[2] * 1.5) + sz * (side[1] + side[3] * 1.5)].map(r1);
// A footpath from the door out to Sopa-ro, round the bay (the cable runs over the road to it).
const outPt = [door[0] + (fx * side[2] + sx * side[3]) * 2.5, door[1] + (fz * side[2] + sz * side[3]) * 2.5];
const roadNear = (p) => { let best = null; for (let k = 1; k < sopa.p.length; k++) { const [a, b] = [sopa.p[k - 1], sopa.p[k]]; const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))); const q = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (!best || d < best.d) best = { q, d }; } return best.q; };
const walkway = [door, outPt, roadNear(outPt)].map((q) => q.map(r1));
const inRect = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c; } return c; };
for (let i = 1; i < walkway.length; i++) for (let k = 1; k < 20; k++) {
  const q = [walkway[i - 1][0] + ((walkway[i][0] - walkway[i - 1][0]) * k) / 20, walkway[i - 1][1] + ((walkway[i][1] - walkway[i - 1][1]) * k) / 20];
  if (inRect(q, lowFoot(low))) throw new Error('the footpath to the door crosses the station');
}
itaewon.roads = itaewon.roads.filter((r) => !r.cc);
itaewon.roads.push({ k: 'walk', w: 2.5, cc: 1, p: walkway.map(loc), n: { ko: '케이블카 승강장 가는 길', en: 'Path to the cable car', ja: 'ケーブルカー乗り場への道', zh: '缆车站步道' } });
const pin = itaewon.pois.find((p) => p.name?.en === 'Namsan Sky Cable');
if (pin) [pin.x, pin.z] = loc(door);
writeFileSync(MAP, JSON.stringify(itaewon));
const storesText = readFileSync(STORES, 'utf8');
const re = /("id":\s*"namsan-sky-cable",[\s\S]*?"at":\s*\[)[^\]]*(\])/;
if (!re.test(storesText)) throw new Error('no store namsan-sky-cable');
writeFileSync(STORES, storesText.replace(re, `$1${door[0]}, ${door[1]}$2`));

// ---------- Report ----------
const off = (a, b) => r1(Math.hypot(a[0] - b[0], a[1] - b[1]));
console.log(`Line: ${r1(span)} m on the ground (real 1/4 ${r1(Math.hypot(TOP[0] - LOW[0], TOP[1] - LOW[1]))} m), heading ${Math.round((heading * 180) / Math.PI)}°`);
console.log(`Footpath to the door: ${r1(walkway.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - walkway[i][0], q[1] - walkway[i][1]), 0))} m`);
console.log(`Lower station: middle ${off(lowCentre(low), LOW)} m from the real one (${r1(lowMoved)} m off Sopa-ro), ${LS.hall + LS.bay} x ${W} m, door ${door}`);
console.log(`Upper station: ${off(top, TOP)} m from the real one (moved ${r1(topMoved)} m off the trail), ${r1(TS.bay + TS.booth)} x ${W} m; nearest trail edge ${r1(Math.min(...corners(topFoot(top)).map(trailGap)))} m`);
pylons.forEach((p, i) => console.log(`Pylon ${i + 1}: ${p.off} m from OSM's point (slid ${p.moved} m), ${r1(path3[i + 1][2] - path3[i + 1][3])} m high, ${r1(trailGap(at(p.t)))} m from a trail's edge`));
console.log(`Cabins at least ${r1(lowest)} m over the ground away from the stations`);
