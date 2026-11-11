#!/usr/bin/env node
// Builds Yeouido (districts/yeouido.json): the island in the Han River, in
// Yeongdeungpo-gu, at the game's 1/4 on its real spot, with Yeouido Han River
// Park along its north shore. It also rewrites the Han River's water from
// Mangwon to Banpo-Jamwon (region.json "water"[0]) so the river's south bank
// is the island's real north shore, with a gap in its blocker for Seogang
// Bridge.
//
// The island's outline, the Saetgang (the narrow arm of the river along its
// south side), Yeouido Park and the main roads come from OpenStreetMap
// (scripts/data/yeouido-osm.json: an Overpass export Yozi made, turned into
// game metres with toGame and simplified; © OpenStreetMap contributors, ODbL).
//
// The riverside park lies along the north shore in its own frame: u along
// the shore (down the river, east-south-east), v across it (0 on the shore,
// growing south into the island). The real shore bows a little; along the
// park (u -215..215) the game's shore is the straight line that stays within
// 7 m of it, so the park can be straight.
//
//   north bank (Han River Bike Path, Hongdae)
//   ~~~~~~~~ main channel ~~~~~~~~~~~~~~~~~ fireworks barges ~~~~~~~~~~~~~~
//   ║ Seogang Bridge   info · Mul-bit Square │ fireworks lawn │ ramen corner 
//   ╚═ Gukhoe-daero    ─────────── Han River path (v 40) ───────────────────
//      Yunjung-ro's cherry trees       Yeouidong-ro            63 tower
//      National Assembly · Yeouido Park · Yeoui-daero · office towers
//   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Saetgang ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
//   node scripts/build-yeouido.mjs   writes the map and the river, and sets
//                                    the "at" of the places in SPOTS in
//                                    stores.json (world metres)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BARGES } from '../src/core/fireworks-show.js';
import { inPolygon, toGame } from '../src/core/seoul-grid.js';
import { northBetween, southBetween, RIVER_CUT, BRIDGE_NORTH, SAETGANG_BIKE } from './han-bank.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'yeouido-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// The park's frame (world metres): the middle of the straight stretch of
// north shore the park lies along, and the shore's direction there. The
// region's district offset is this point, so the map's own metres are
// measured from it.
export const ORIGIN = [-2606.5, 528.6];
const ANGLE = (46 * Math.PI) / 180;
export const U = [Math.cos(ANGLE), Math.sin(ANGLE)]; // along the shore, down the river
export const V = [-U[1], U[0]]; // across it, into the island
export const at = (u, v) => [r1(u * U[0] + v * V[0]), r1(u * U[1] + v * V[1])];
const world = ([x, z]) => [r1(x + ORIGIN[0]), r1(z + ORIGIN[1])];
const local = ([x, z]) => [r1(x - ORIGIN[0]), r1(z - ORIGIN[1])];
export const toUV = ([x, z]) => {
  const dx = x - ORIGIN[0], dz = z - ORIGIN[1];
  return [dx * U[0] + dz * U[1], dx * V[0] + dz * V[1]];
};
const rect = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
const FACE_RIVER = Math.atan2(-V[0], -V[1]); // (rotation for something facing the river)
const ALONG_V = Math.atan2(V[0], V[1]);
const ALONG_U = Math.atan2(U[0], U[1]);

export const SHORE = 215; // the park's straight stretch of shore: u -SHORE..SHORE at v 0
export const PATH = 40; // the Han River path

// The island's outline (u, v), from OpenStreetMap, with the park's stretch
// of north shore made straight.
export const ISLAND = (() => {
  const uv = OSM.island.map((p) => toUV(p).map(r1));
  const onShore = ([u, v]) => Math.abs(u) <= SHORE && v < 30;
  let i0 = uv.findIndex(onShore);
  while (onShore(uv[(i0 + uv.length - 1) % uv.length])) i0 = (i0 + uv.length - 1) % uv.length;
  let n = 0;
  while (onShore(uv[(i0 + n) % uv.length])) n++;
  const run = Array.from({ length: n }, (_, k) => uv[(i0 + k) % uv.length]);
  const chord = run[0][0] > run.at(-1)[0] ? [[SHORE, 0], [-SHORE, 0]] : [[-SHORE, 0], [SHORE, 0]];
  const rest = Array.from({ length: uv.length - n }, (_, k) => uv[(i0 + n + k) % uv.length]);
  // (less the west tip's little spit and the inlet behind it, each a few
  // metres wide at 1/4: the tip is drawn round)
  return [...chord, ...rest.filter(([u, v]) => !(u > -612 && u < -565 && v > 200 && v < 250))];
})();
// Where the Han's water meets the island: from the east end of the park's
// straight shore, round the north shore to the west tip. The rest of the
// outline, the east tip and the south shore, faces the Saetgang.
const SHORE_EAST = ISLAND.findIndex(([u, v]) => u === SHORE && v === 0);
const WEST_TIP = ISLAND.reduce((best, q, i) => (q[0] < ISLAND[best][0] ? i : best), 0);
const islandW = ISLAND.map(([u, v]) => world(at(u, v)));
const saetgang = OSM.saetgang; // world

// Seogang Bridge: from the Han River Bike Path at Hongdae's corner (where
// "To the Han River" comes down from Hongdae) across the main channel to
// Gukhoe-daero, as the real bridge runs (Gukhoe-daero carries it on south).
export { BRIDGE_NORTH }; // world (scripts/han-bank.mjs: where the real bridge meets the bike path)
export const BRIDGE_W = 12;
const gukhoe = OSM.roads.filter((r) => r.en === 'Gukhoe-daero').flatMap((r) => r.p);
const BRIDGE_SOUTH = gukhoe.reduce((a, q) => (q[1] < a[1] ? q : a)); // its northernmost point on the island
const BRIDGE_DIR = (() => { const dx = BRIDGE_SOUTH[0] - BRIDGE_NORTH[0], dz = BRIDGE_SOUTH[1] - BRIDGE_NORTH[1], L = Math.hypot(dx, dz); return [dx / L, dz / L]; })();
const across = ([x, z]) => (x - BRIDGE_NORTH[0]) * -BRIDGE_DIR[1] + (z - BRIDGE_NORTH[1]) * BRIDGE_DIR[0];
// Where the bridge reaches the island's shore (metres from its north end).
const BRIDGE_LAND = (() => {
  const L = Math.hypot(BRIDGE_SOUTH[0] - BRIDGE_NORTH[0], BRIDGE_SOUTH[1] - BRIDGE_NORTH[1]);
  for (let s = 0; s < L; s += 0.5) if (inPolygon(BRIDGE_NORTH[0] + BRIDGE_DIR[0] * s, BRIDGE_NORTH[1] + BRIDGE_DIR[1] * s, islandW)) return s;
  return L;
})();

// Yeouido Han River Park, laid straight on the street (game/han-parks.js;
// core/han-park.js builds what the map can't draw). Its own frame is the
// park's: x = u, z = v (the shore's edge at z = 0, the river z < 0). At
// 1/4, as the real park is along the north shore, west to east:
//  - the boat dock and the Information Center;
//  - Mul-bit Square by Yeouinaru Station, where the night market's stalls
//    stand round its pool;
//  - the wide fireworks lawn, open to the river (picnic mats, frisbees),
//    across from the barges;
//  - the corner towards the 63 tower: a pier to look out from and the kiosk
//    with its ramen machine (Han River ramen is a Yeouido thing). No fishing:
//    the real park is a no-fishing area (Yozi); its fish went to Banpo.
export const PARK = {
  bounds: [-SHORE, -45, SHORE, 43], // the whole shore, from the water to the path
  layout: {
    paving: [[121.6, 0.4, 160, 7, '#d9c7a6'], [94.4, 14, 121.6, 37, '#d6ccb8']],
    rail: [-210, 210],
    pier: { x: 149, len: 10 },
    kiosk: [108.8, 30.5, Math.PI], // YEOUIDO 24, at the corner of the lawn, facing the river
    tables: [[116.8, 23.6], [112, 20.6], [104.8, 20.6], [100, 23.6]],
    market: {
      spots: [[-99.6, 34.2, Math.PI], [-102.6, 34.2, Math.PI], [-127.8, 34.2, Math.PI], [-130.8, 34.2, Math.PI]], // round Mul-bit Square's pool, facing it
      tables: [[-97.2, 14], [-97.2, 21.5]],
      board: [-95.4, 33.4, -Math.PI / 2],
    },
    dock: -152,
    duckWater: { minX: -200, maxX: -137.6, minZ: -38 },
    lamps: [[196, 2.6], [172, 2.6], [136, 2.6], [120, 9], [-140, 2.6], [-164, 2.6], [-188, 2.6]],
    benches: [[192, 3.4], [156.8, 9.2], [131.2, 9.2], [-182.4, 3.4]],
    beds: [[160, 9.6, 4], [120, 12.4, 3], [-144.8, 5.6, 3]],
    trees: [[206.4, 30], [197.6, 33], [130.4, 32], [125.6, 22]],
    bushes: [[136, 12], [164, 13], [-171.2, 6]],
  },
};
const LAWN = [-94.4, 120]; // u
// Seoul Dal, the tethered balloon (game/seoul-dal.js draws it, loaded when
// you come near): the real pad is on Yeouido Park's lawn, north of the
// flagpole in Culture Square (the middle of the park; Seoul city's guide).
// OpenStreetMap has no point for it, so it sits 35% of the way down the
// park's long axis from its north end (the end towards the river park), in
// the middle of the park's width. Its gate faces north, the way you come in
// from the river park over Yunjung-ro.
export const DAL_T = 0.35;
const SQUARE = [-137.6, -94.4]; // Mul-bit Square, u

// The Han River from Mangwon to x -1420, west of Banpo Bridge (world metres;
// han-bank.mjs draws on east of it): the real north bank, and on the south
// side the real bank east of the island, the island's north shore, and on
// west of it to Mangwon's river.
function river() {
  // the real north bank (scripts/han-bank.mjs) from Mangwon's map (its own
  // river reaches x -3218 on the bank) to x -1420, then straight across
  const north = northBetween(-3300, RIVER_CUT);
  const shore = []; // the east end of the park round the north shore to the west tip
  for (let i = SHORE_EAST; ; i = (i + 1) % ISLAND.length) { shore.push(world(at(...ISLAND[i]))); if (i === WEST_TIP) break; }
  const south = [...southBetween(-2020, RIVER_CUT).slice(0, -1), ...OSM.southBankEast.slice().reverse(), ...shore,
    [-3240, 276], [-3300, 225]]; // (west of the island: the real south bank, then up the edge of Mangwon's river)
  const p = [...north, ...south];
  // Its blocker, cut on both sides of Seogang Bridge.
  const gap = BRIDGE_W / 2 + 1;
  const blockers = [clip(p, (q) => across(q) - gap), clip(p, (q) => -across(q) - gap)];
  return { p, blockers, note: 'Han River from Mangwon Han River Park east to just west of Banpo Bridge, on its real banks; its south bank by the island is Yeouido\'s real north shore (scripts/build-yeouido.mjs writes this). Its blocker has a gap for Seogang Bridge.' };
}
// The Saetgang's edge: a strip of water 2-10 m off the island's south
// shore, from the west tip round the east tip to where the Han's water
// starts. It keeps you on the island (the Saetgang's own OpenStreetMap water
// leaves gaps by the shore), except where a street crosses (the bridges to
// Yeongdeungpo and Daebang).
function saetgangEdge(streets) {
  const chain = [];
  for (let i = WEST_TIP; ; i = (i + 1) % ISLAND.length) { chain.push(world(at(...ISLAND[i]))); if (i === SHORE_EAST) break; }
  // densify so street gaps cut cleanly
  const pts = [];
  for (let i = 1; i < chain.length; i++) {
    const [a, b] = [chain[i - 1], chain[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let k = 0; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  pts.push(chain.at(-1));
  const outward = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    const q = [pts[i][0] + nx, pts[i][1] + nz];
    return inPolygon(q[0], q[1], islandW) ? [-nx, -nz] : [nx, nz];
  };
  const open = (q) => streets.some((r) => r.p.some((_, i) => i > 0 && segDist(q, r.p[i - 1], r.p[i]) < r.w / 2 + 5));
  const pieces = [];
  let cur = [];
  pts.forEach((q, i) => {
    if (open(q)) { if (cur.length > 1) pieces.push(cur); cur = []; return; }
    const [nx, nz] = outward(i);
    cur.push([q, nx, nz]);
  });
  if (cur.length > 1) pieces.push(cur);
  return pieces.map((c) => [...c.map(([q, nx, nz]) => [r1(q[0] + nx * 2), r1(q[1] + nz * 2)]), ...c.slice().reverse().map(([q, nx, nz]) => [r1(q[0] + nx * 10), r1(q[1] + nz * 10)])]);
}

// The south-bank Han River bike path (scripts/build-bike-paths.mjs) crosses
// the Saetgang's mouth from the island's east tip to the Dongjak bank, as
// the real one does on its bridge (OpenStreetMap): the Saetgang's blockers
// (world) are cut BIKE_GAP m either side of that line (han-bank.mjs SAETGANG_BIKE).
const BIKE_GAP = 4;
function bikeGap(p) {
  const [a, b] = SAETGANG_BIKE, L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const side = ([x, z]) => (x - a[0]) * -d[1] + (z - a[1]) * d[0];
  const along = ([x, z]) => (x - a[0]) * d[0] + (z - a[1]) * d[1];
  // (only the pieces of water the crossing goes over)
  if (!p.some((q) => Math.abs(side(q)) < 40 && along(q) > -30 && along(q) < L + 30)) return [p];
  return [clip(p, (q) => side(q) - BIKE_GAP), clip(p, (q) => -side(q) - BIKE_GAP)].filter((q) => q.length >= 3);
}

// The part of polygon p where side(point) >= 0 (side is linear).
function clip(p, side) {
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push([r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)]);
    }
  }
  return out;
}

// A street (world points) without the parts that reach into the riverside
// park, v < vMin (OpenStreetMap's ends run on to the bridges' ramps).
function clipOut(p, vMin) {
  const out = [];
  let cur = [];
  for (let i = 0; i < p.length; i++) {
    const vi = toUV(p[i])[1];
    if (i > 0) {
      const vp = toUV(p[i - 1])[1];
      if ((vp < vMin) !== (vi < vMin)) {
        const k = (vMin - vp) / (vi - vp);
        cur.push([r1(p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k), r1(p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k)]);
        if (vi < vMin) { out.push(cur); cur = []; }
      }
    }
    if (vi >= vMin) cur.push(p[i]);
  }
  out.push(cur);
  return out.filter((q) => q.length > 1 && Math.hypot(q.at(-1)[0] - q[0][0], q.at(-1)[1] - q[0][1]) > 5);
}

// Seeded random numbers, so the towers come out the same every time.
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
const segDist = ([px, pz], [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
const edgeDist = (q, poly) => { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(q, poly[i], poly[(i + 1) % poly.length])); return d; };

// The 63 tower, 7 m west of its real spot so Yeouidong-ro (drawn at its
// full 1/4 width) passes its east side without touching it.
const TOWER63 = [OSM.tower63[0] - 6, OSM.tower63[1] - 4]; // world
// Its footprint, turned with the shore: 20 m along it, 14 m across.
const TOWER63_BOX = [[-10, -7], [10, -7], [10, 7], [-10, 7]].map(([a, b]) => [r1(TOWER63[0] + a * U[0] + b * V[0]), r1(TOWER63[1] + a * U[1] + b * V[1])]);
const ASSEMBLY = toGame(37.5319, 126.9139).map(r1); // the National Assembly's main building (world)
const ROAD_K = { 'Yeoui-daero': 'primary', 'Gukhoe-daero': 'primary', 'Yeouidaebang-ro': 'primary', 'Uisadang-daero': 'secondary', 'Yeouidong-ro': 'secondary', 'Yeouiseo-ro': 'secondary' };
const ROAD_N = {
  'Yeoui-daero': name('Yeoui-daero', '여의대로', '汝矣大路', '汝矣大路'),
  'Yeouidong-ro': name('Yeouidong-ro', '여의동로', '汝矣東路', '汝矣东路'),
  'Yeouiseo-ro': name('Yunjung-ro (Yeouiseo-ro)', '윤중로 (여의서로)', '輪中路（汝矣西路）', '轮中路（汝矣西路）'),
  'Uisadang-daero': name('Uisadang-daero', '의사당대로', '議事堂大路', '议事堂大路'),
  'Gukhoe-daero': name('Gukhoe-daero', '국회대로', '国会大路', '国会大路'),
  'Yeouidaebang-ro': name('Yeouidaebang-ro', '여의대방로', '汝矣大方路', '汝矣大方路'),
  'Gukjegeumyung-ro': name('Gukjegeumyung-ro', '국제금융로', '国際金融路', '国际金融路'),
  'Yeouinaru-ro': name('Yeouinaru-ro', '여의나루로', '汝矣ナル路', '汝矣渡口路'),
  'Yeouigongwon-ro': name('Yeouigongwon-ro', '여의공원로', '汝矣公園路', '汝矣公园路'),
  '63-ro': name('63-ro', '63로', '63路', '63路'),
};

function build() {
  // Roads: the real ones on the island, and Seogang Bridge.
  const roads = [
    { k: 'primary', w: BRIDGE_W, p: [local(BRIDGE_NORTH), local(BRIDGE_SOUTH)], n: name('Seogang Bridge', '서강대교', '西江大橋', '西江大桥') },
    ...OSM.roads.flatMap((r) => clipOut(r.p, PATH + 6).map((p) => ({ k: ROAD_K[r.en] || 'tertiary', w: r.w, p: p.map(local), n: ROAD_N[r.en] }))),
    // The Han River path: from the bridge along the shore and the length of the park.
    { k: 'walk', w: 5, p: [local([BRIDGE_SOUTH[0] + 8, BRIDGE_SOUTH[1] - 6]), at(-330, 58), at(-250, PATH + 2), at(-SHORE, PATH), at(SHORE, PATH)], n: name('Han River path', '한강 산책로', '漢江の散歩道', '汉江步道') },
  ];
  const roadsW = roads.map((r) => ({ ...r, p: r.p.map(world) }));

  const edge = saetgangEdge(roadsW.filter((r) => r.k !== 'walk'));
  const blockers = [
    ...saetgang.flatMap(bikeGap).map((p) => ({ p: p.map(local) })),
    ...edge.flatMap(bikeGap).map((p) => ({ p: p.map(local) })),
    { p: TOWER63_BOX.map(local) }, // the 63 tower (drawn by its landmark)
  ];
  const parkW = OSM.park;
  const assembly = [[-16, -13], [16, -13], [16, 13], [-16, 13]].map(([x, z]) => [ASSEMBLY[0] + x, ASSEMBLY[1] + z]);
  const assemblyLawn = [[-30, -26], [30, -26], [30, 34], [-30, 34]].map(([x, z]) => [ASSEMBLY[0] + x, ASSEMBLY[1] + z]);
  const buildings = [
    { h: 5, p: rect(-168, 27, -156.8, 36) }, // the Information Center, west of Mul-bit Square
    { h: 22, p: assembly.map(local) }, // the National Assembly (a plain block here)
  ];
  // Yeouido's office towers (plain, no shops), on a grid turned with the
  // shore, wherever a block leaves room: on the island, off the roads, out
  // of Yeouido Park and the Assembly's lawn, south of the riverside park.
  const rand = rng(20261109);
  for (let u = -600; u <= 220; u += 38) {
    for (let v = 60; v <= 430; v += 34) {
      const w = 18 + rand() * 10, d = 15 + rand() * 9, h = Math.round(36 + rand() * 80);
      const cu = u + (rand() - 0.5) * 8, cv = v + (rand() - 0.5) * 6;
      const pw = rect(cu - w / 2, cv - d / 2, cu + w / 2, cv + d / 2).map(world);
      // The corners, the middle of each side and the centre, so that no road runs through it.
      const probe = [...pw, ...pw.map((q, i) => { const n = pw[(i + 1) % 4]; return [(q[0] + n[0]) / 2, (q[1] + n[1]) / 2]; }), world(at(cu, cv))];
      const offRoad = (q) => roadsW.every((r) => r.p.every((_, i) => i === 0 || segDist(q, r.p[i - 1], r.p[i]) > r.w / 2 + 4));
      const clear = (q) => inPolygon(q[0], q[1], islandW) && edgeDist(q, islandW) > 14
        && !inPolygon(q[0], q[1], parkW) && edgeDist(q, parkW) > 4
        && !inPolygon(q[0], q[1], assemblyLawn) && edgeDist(q, assemblyLawn) > 4
        && Math.hypot(q[0] - TOWER63[0], q[1] - TOWER63[1]) > 24;
      const box = buildings.length ? buildings.map((b) => b.p.map(world)) : [];
      const apart = box.every((b) => !b.some((q) => inPolygon(q[0], q[1], pw)) && !pw.some((q) => inPolygon(q[0], q[1], b)));
      if (pw.every(clear) && probe.every(offRoad) && apart) buildings.push({ h, p: pw.map(local) });
    }
  }
  const lawn = rect(LAWN[0], 2, LAWN[1], PATH - 3); // the fireworks lawn
  const areas = [
    { k: 'grass', p: rect(LAWN[1], 2, 210, PATH - 3) }, // the ramen corner by the pier
    { k: 'grass', lawn: true, p: lawn }, // picnic mats and frisbees, no trees: the view across the river stays open
    { k: 'plaza', p: rect(SQUARE[0], 2, SQUARE[1], PATH - 3) }, // Mul-bit Square
    { k: 'water', p: rect(-131.2, 9, -100.8, 30) }, // its shallow pool: walk right in (no blocker)
    { k: 'grass', p: rect(-210, 2, SQUARE[0], PATH - 3) },
    { k: 'park', trees: true, p: parkW.map(local) }, // Yeouido Park
    { k: 'grass', p: assemblyLawn.map(local) }, // the National Assembly's lawn
    ...saetgang.map((p) => ({ k: 'water', p: p.map(local) })),
    ...edge.map((p) => ({ k: 'water', p: p.map(local) })), // the Saetgang by the shore
  ];
  // Yunjung-ro's cherry trees, both sides of the road.
  const yunjung = OSM.roads.find((r) => r.en === 'Yeouiseo-ro').p;
  const side = (s) => yunjung.map((q, i) => {
    const a = yunjung[Math.max(0, i - 1)], b = yunjung[Math.min(yunjung.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    return local([q[0] - (dz / L) * s, q[1] + (dx / L) * s]);
  });
  const bridgeAt = (s) => local([BRIDGE_NORTH[0] + BRIDGE_DIR[0] * s, BRIDGE_NORTH[1] + BRIDGE_DIR[1] * s]);
  const bridgeRy = Math.round(Math.atan2(BRIDGE_DIR[0], BRIDGE_DIR[1]) * 1e4) / 1e4;
  const landmarks = [
    { type: 'seogang', ...xz(bridgeAt(BRIDGE_LAND / 2)), ry: bridgeRy, len: r1(BRIDGE_LAND), w: BRIDGE_W },
    { type: 'arch', ...xz(bridgeAt(BRIDGE_LAND + 3)), ry: bridgeRy, w: BRIDGE_W + 2, title: 'YEOUIDO HAN RIVER PARK', sub: '여의도 한강공원', color: '#1f7a8c' },
    { type: 'tower63', ...xz(local(TOWER63)), ry: ALONG_U, len: 20, w: 14 }, // at 1/4 (the real one is about 80 x 55 m with its plinth)
    // The fireworks' launch barges in the main channel, facing the lawn
    // (the same spots as BARGES in src/core/fireworks-show.js).
    ...BARGES.map(([u, v]) => ({ type: 'fwbarge', ...xz(at(u, v)), ry: ALONG_U + Math.PI / 2 })),
    { type: 'mulbit', ...xz(at(-116, 19.5)), ry: ALONG_U, w: 27, d: 17 },
    { type: 'blossoms', seasonal: true, p: side(9), gap: 9 },
    { type: 'blossoms', seasonal: true, p: side(-9), gap: 9 },
    { type: 'sign', ...xz(at(164, PATH - 3)), ry: FACE_RIVER,
      title: name('Yeouido Han River Park', '여의도 한강공원', '汝矣島漢江公園', '汝矣岛汉江公园'),
      text: {
        en: 'Yeouido is an island in the middle of the Han River. Its riverside park has the widest lawn on the river: spread a mat and look across the water to Mapo. In spring, cherry trees bloom all along Yunjung-ro. In the game, fireworks light up the sky here every day at 9:00 and 21:00 Korean time, for an hour, from three barges on the river. The real Seoul International Fireworks Festival is held here once a year, in autumn. Fishing is not allowed here, as in the real park: fish at Banpo or Jamwon Han River Park.',
        ko: '여의도는 한강 한가운데 있는 섬이에요. 강변 공원에는 한강에서 가장 넓은 잔디밭이 있어요. 돗자리를 펴고 강 건너 마포를 바라보세요. 봄이면 윤중로를 따라 벚꽃이 피어요. 게임에서는 매일 한국시간 9시와 21시에 한 시간씩, 강 위 바지선 세 척에서 불꽃놀이가 열려요. 실제 서울세계불꽃축제는 1년에 한 번, 가을에 여기서 열려요. 실제 공원처럼 여기는 낚시 금지 구역이에요. 낚시는 반포나 잠원 한강공원에서 하세요.',
        ja: '汝矣島は漢江の真ん中にある島です。川辺の公園には漢江でいちばん広い芝生があります。シートを広げて、川の向こうの麻浦を眺めてみましょう。春には輪中路に沿って桜が咲きます。ゲームでは毎日、韓国時間の9時と21時に1時間、川に浮かぶ3隻の台船から花火が上がります。本物のソウル世界花火祭りは、年に一度、秋にここで開かれます。実際の公園と同じく、ここは釣り禁止です。釣りは盤浦か蚕院の漢江公園でどうぞ。',
        zh: '汝矣岛是汉江正中的一座岛。江边公园有汉江上最大的草坪：铺开野餐垫，眺望对岸的麻浦。春天，轮中路两旁樱花盛开。游戏里每天韩国时间9点和21点，江上三艘驳船会放一小时烟花。真实的首尔世界烟花节每年秋天在这里举办一次。和真实的公园一样，这里禁止钓鱼：请去盘浦或蚕院汉江公园钓鱼。',
      } },
  ];
  // Seoul Dal (see DAL_T) and its board with the real facts.
  const dal = dalAt(parkW);
  landmarks.push({ type: 'seouldal', ...xz(local(dal)), ry: +FACE_RIVER.toFixed(4), clear: 15 }); // (clear: no trees on the pad or under the balloon)
  landmarks.push({ type: 'sign', ...xz(local(dalOff(dal, -9, 12))), ry: +FACE_RIVER.toFixed(4),
    title: name('Seoul Dal', '서울달', 'ソウルダル', '首尔月亮'),
    text: {
      en: 'Seoul Dal ("Seoul Moon") is a real tethered gas balloon on this lawn in Yeouido Park, flying since 2024. A ring-shaped gondola under the balloon carries up to 20 people about 130 m above Yeouido for around 15 minutes, with the Han River, the National Assembly and the 63 tower below. At night it glows like a full moon. It is open every day from 12:00 to 22:00, and stops in strong wind or rain; the adult ticket was 25,000 won in 2026 (check before you go). In the game it goes up every 3 minutes, to the same 130 m, with 5 people a flight (take a waiting ticket when it is full), for 25,000 game won.',
      ko: '서울달은 여의도공원 이 잔디마당에 실제로 있는 계류식 가스기구로, 2024년부터 날고 있어요. 기구 아래 고리 모양 곤돌라에 최대 20명이 타고 여의도 위 약 130m까지 올라 15분쯤 머물러요. 아래로 한강, 국회의사당, 63빌딩이 보여요. 밤에는 보름달처럼 빛나요. 매일 12시부터 22시까지 운영하고, 강풍이나 비가 오면 쉬어요. 성인 요금은 2026년 기준 25,000원이에요(가기 전에 확인하세요). 게임에서는 3분마다 똑같이 130m까지 올라가고 한 번에 5명이 타요(다 차면 대기표를 받아요). 요금은 게임 머니 25,000원이에요.',
      ja: 'ソウルダル（「ソウルの月」）は汝矣島公園のこの芝生に実在する係留式ガス気球で、2024年から飛んでいます。気球の下のリング形ゴンドラに最大20人が乗り、汝矣島の上空約130mまで上がって15分ほど過ごします。眼下には漢江、国会議事堂、63ビル。夜は満月のように光ります。毎日12時から22時まで運行し、強風や雨の日は休みます。大人料金は2026年時点で25,000ウォンです（行く前に確認してください）。ゲームでは3分ごとに、同じ130mまで上がり、1回5人までです（満員なら整理券を取ります）。料金はゲーム内25,000ウォンです。',
      zh: '首尔月亮（서울달）是汝矣岛公园这片草坪上真实存在的系留式气球，2024年起开始飞行。气球下方的环形吊舱最多载20人，升到汝矣岛上空约130米，停留约15分钟，下方是汉江、国会议事堂和63大厦。夜晚它像满月一样发光。每天12:00至22:00运营，大风或下雨时停飞；2026年成人票价为25,000韩元（出发前请确认）。游戏里每3分钟升空一次，同样升到130米，每次5人（满员时领取排队号），票价为游戏币25,000韩元。',
    } });
  // Benches on the shore facing the river (the park has its own by the pier and by the dock).
  for (const u of [100, 76, 52, 28, 4, -20, -44, -68, -88, -196]) landmarks.push({ type: 'bench', ...xz(at(u, 4.5)), ry: FACE_RIVER });
  // The park itself (game/han-parks.js): its frame is the park's.
  landmarks.push({ type: 'hanpark', store: 'yeouido-hangang', ...xz(at(0, 0)), ry: +ALONG_V.toFixed(4), bounds: PARK.bounds, layout: PARK.layout });
  const pois = [
    { kind: 'landmark', ...xz(at(13, 20)), name: name('Yeouido Han River Park', '여의도 한강공원', '汝矣島漢江公園', '汝矣岛汉江公园') },
    { kind: 'landmark', ...xz(bridgeAt(BRIDGE_LAND / 2)), name: name('Seogang Bridge', '서강대교', '西江大橋', '西江大桥') },
    { kind: 'landmark', ...xz(at(-116, 19.5)), name: name('Mul-bit Square', '물빛광장', '水光広場', '水光广场') },
    { kind: 'landmark', ...xz(local([TOWER63[0], TOWER63[1] + 16])), name: name('63 Tower', '63빌딩', '63ビル', '63大厦') },
    { kind: 'landmark', ...xz(local(centroid(parkW))), name: name('Yeouido Park', '여의도공원', '汝矣島公園', '汝矣岛公园') },
    { kind: 'landmark', ...xz(local(dalAt(parkW))), name: name('Seoul Dal', '서울달', 'ソウルダル', '首尔月亮') },
    { kind: 'landmark', ...xz(local([ASSEMBLY[0], ASSEMBLY[1] + 20])), name: name('National Assembly', '국회의사당', '国会議事堂', '国会议事堂') },
  ];
  return {
    meta: {
      district: 'yeouido',
      source: 'scripts/build-yeouido.mjs, at 1/4 on the real island: the outline, the Saetgang, Yeouido Park and the main roads from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/yeouido-osm.json). Yeouido Han River Park on the north shore; the office towers, kiosk and stalls are fictional.',
    },
    roads, buildings, rail: [], areas, blockers, pois, landmarks,
  };
}
function xz([x, z]) { return { x, z }; }
// Seoul Dal's pad (world): DAL_T of the way along Yeouido Park's long axis
// (along v, across the island) from its north end, in the middle of its width.
export function dalAt(parkW) {
  const uv = parkW.map((q) => toUV(q));
  const vs = uv.map((q) => q[1]), v0 = Math.min(...vs), v1 = Math.max(...vs);
  const v = v0 + (v1 - v0) * DAL_T;
  // The park's width at v: where its outline crosses that line.
  const us = [];
  for (let i = 0; i < uv.length; i++) {
    const [ua, va] = uv[i], [ub, vb] = uv[(i + 1) % uv.length];
    if ((va - v) * (vb - v) <= 0 && va !== vb) us.push(ua + ((v - va) / (vb - va)) * (ub - ua));
  }
  return world(at((Math.min(...us) + Math.max(...us)) / 2, v));
}
// A point beside the pad, in its frame (x across, z towards its gate).
function dalOff([x, z], dx, dz) {
  const ry = FACE_RIVER, c = Math.cos(ry), s = Math.sin(ry);
  return [r1(x + dx * c + dz * s), r1(z - dx * s + dz * c)];
}
function centroid(p) { return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]; }

// Where each place's door is, in the district's own metres.
export const SPOTS = {
  'yeouido-hangang': at(120, PATH), // on the river path at the corner of the lawn, by the kiosk (where a taxi or the map drops you)
  'info-yeouido': at(-162.4, PATH - 2.5),
};
// The park's stamp stand and meeting zone K-1 (world), for data/stamps.js and zones.json.
export const STAMP_AT = world(at(171, 5));
export const LAWN_AT = world(at(13, 20));

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const map = build();
  writeFileSync(path.join(R, 'districts', 'yeouido.json'), JSON.stringify(map) + '\n');
  const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
  const d = region.districts.find((x) => x.id === 'yeouido');
  if (!d) console.log('yeouido: not in region.json yet');
  else if (d.offset[0] !== ORIGIN[0] || d.offset[1] !== ORIGIN[1]) console.log(`yeouido: offset ${d.offset} should be ${ORIGIN}`);
  // region.json is hand-formatted: only the first river line is rewritten.
  const text = readFileSync(path.join(R, 'region.json'), 'utf8');
  const i = text.indexOf('"water": [\n') + '"water": [\n'.length;
  const j = text.indexOf('\n', i);
  writeFileSync(path.join(R, 'region.json'), text.slice(0, i) + '    ' + JSON.stringify(river()) + ',' + text.slice(j + 0).replace(/^,?/, ''));
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  for (const [sid, p] of Object.entries(SPOTS)) {
    const [x, z] = world(p);
    const i = stores.indexOf(`"id": "${sid}"`);
    if (i < 0) { console.log(`${sid}: not in stores.json`); continue; }
    let end = stores.indexOf('\n    {', i);
    if (end < 0) end = stores.length;
    const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${x}, ${z}]`);
    stores = stores.slice(0, i) + part + stores.slice(end);
  }
  writeFileSync(path.join(R, 'stores.json'), stores);
  console.log(`park stamp stand: [${STAMP_AT}], ry ${(ALONG_V + Math.PI / 2).toFixed(4)}; meeting zone K-1 on the lawn: [${LAWN_AT}]`);
  console.log(`yeouido: ${map.buildings.length} buildings; bridge ${r1(BRIDGE_LAND)} m over the water; park drop-off ${world(SPOTS['yeouido-hangang'])}`);
  const a = local(toGame(37.5271, 126.9329));
  console.log(`anchor: Yeouinaru Station, local [${a}]`);
}
