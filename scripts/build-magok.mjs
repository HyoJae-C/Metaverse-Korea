#!/usr/bin/env node
// Magok (마곡, Gangseo-gu): Seoul Botanic Park (서울식물원) at 1/4 on its real
// place (Yozi 2026-11-21). The first place in Gangseo-gu.
//
//   The garden: OSM's outline at 1/4 (about 400 x 221 m), with the lake
//     (호수원), the wetland's water (습지원), the theme garden's pond and
//     streams, and the park's own paths (the ones 20 m or longer).
//   The greenhouse (식물문화센터): the dish-shaped glass house, the one thing
//     here at 50% of real (Yozi chose it: "땅 1/4, 온실 50% 오픈형"), about
//     46 m across, and walked straight into from the park (no room: an open
//     building on the street). At that size it would reach Magokdong-ro, so
//     its middle is moved away from the road (meta.approx). game/botanic-site.js draws it
//     and what grows in it when you come near.
//   The arts centre in the garden's south-west corner, the forest school and
//     the research greenhouse: OSM's outlines at 1/4, plain and unnamed.
//   Magokjungang 10-ro along the south side on its OSM line; the bigger roads
//     round the garden (Magokdong-ro, Yangcheon-ro, Magokjungang-ro) come
//     from the base map.
//
// Data: scripts/data/magok-osm.json (© OpenStreetMap contributors, ODbL).
// Made-up things are listed in meta.approx.
//
//   node scripts/build-magok.mjs           writes districts/magok.json
//   node scripts/build-magok.mjs --check   prints the numbers only
// then: place-districts.mjs, build-base.mjs, build-closed.mjs, build-seoul.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, anchorOffset } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/magok-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

export const IDS = {
  garden: 465318366, greenhouse: 643248046, annex: 643248047, arts: 643261411, school: 1160626398, lab: 1160626400,
  lake: 646325095, wetland: 465317447, pond: 646325105, streams: [646325096, 1160626397],
};
// The district's anchor: the middle of the real greenhouse.
export const ANCHOR = { place: "Seoul Botanic Park, the middle of the greenhouse (식물문화센터) on OpenStreetMap (Gangseo-gu)", lat: 37.56936917, lon: 126.835027305, local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const byId = new Map(osm.ways.map((w) => [w.id, w]));
const way = (id) => byId.get(id).p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);
const open = (p) => (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p);
const close = (p) => p.concat([p[0]]);

function simplify(p, tol) { // Douglas-Peucker (open line)
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, az] = p[a], [bx, bz] = p[b], dx = bx - ax, dz = bz - az, ll = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / ll; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
const ring = (p, tol) => { // a closed ring, simplified in two halves
  const q = open(p);
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
};
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const lineLen = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const area = (p) => Math.abs(p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0) / 2);
const resample = (p, step) => { const out = [p[0]]; for (let i = 1; i < p.length; i++) { const [a, b] = [p[i - 1], p[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out; };
// A line as a strip w wide (a polygon), for cutting paths out of water.
const strip = (p, w) => { const l = [], r = []; for (let i = 0; i < p.length; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, nz = (b[0] - a[0]) / d; l.push([p[i][0] + nx * w / 2, p[i][1] + nz * w / 2]); r.push([p[i][0] - nx * w / 2, p[i][1] - nz * w / 2]); } return [...l, ...r.reverse()]; };

// --- The garden --------------------------------------------------------------
const gardenRaw = open(way(IDS.garden));
const garden = ring(gardenRaw, 0.6);

// --- The greenhouse ------------------------------------------------------------
// OSM's outline is a 20-corner round; at 1/4 it is about 23 m across. Drawn
// at 50% of real: a circle twice that. Magokdong-ro passes close by its east
// side, so the middle moves west until the glass is CLEAR metres off the kerb.
const ghReal = open(way(IDS.greenhouse));
const ghC = centroid(ghReal);
const ghR14 = ghReal.reduce((s, [x, z]) => s + Math.hypot(x - ghC[0], z - ghC[1]), 0) / ghReal.length;
export const GH_SCALE = 2; // times the 1/4 size: 50% of real
const GH_R = Math.round(ghR14 * GH_SCALE * 10) / 10;
const dongro = osm.ways.filter((w) => w.k === 'hw' && w.tags.name === '마곡동로').map((w) => w.p.map(L));
export const DONGRO_W = 10; // the base map's secondary roads
const CLEAR = 4; // m from Magokdong-ro's kerb to the glass
const roadGap = (x, z) => Math.min(...dongro.map((p) => lineDist(x, z, p)));
// Straight away from the road (north-west), not due west: the shortest move.
const nearRoad = dongro.flatMap((p) => resample(p, 1)).reduce((b, q) => (Math.hypot(q[0] - ghC[0], q[1] - ghC[1]) < Math.hypot(b[0] - ghC[0], b[1] - ghC[1]) ? q : b));
const away = [ghC[0] - nearRoad[0], ghC[1] - nearRoad[1]].map((v, _, a) => v / Math.hypot(a[0], a[1]));
let shift = 0; while (roadGap(ghC[0] + away[0] * shift, ghC[1] + away[1] * shift) < GH_R + DONGRO_W / 2 + CLEAR && shift < 30) shift += 0.5;
const GH = [r1(ghC[0] + away[0] * shift), r1(ghC[1] + away[1] * shift)]; // the middle of the game's greenhouse
const GH_N = 32; // the wall is a 32-sided ring
// Doors: the main one faces the theme garden and the lake (south-west), a
// second one the lake's north end (north-west). Angles from +x toward +z.
const DOORS = [{ a: Math.PI * 0.82, w: 4.4, main: true }, { a: -Math.PI * 0.72, w: 3.2 }];
const at = (a, r) => [GH[0] + Math.cos(a) * r, GH[1] + Math.sin(a) * r];
const ghRing = Array.from({ length: GH_N }, (_, i) => at((i / GH_N) * Math.PI * 2, GH_R));
const doors = DOORS.map((d) => ({ ...d, at: R1([at(d.a, GH_R)])[0], out: R1([at(d.a, GH_R + 2.2)])[0], face: Math.round(Math.atan2(Math.cos(d.a), Math.sin(d.a)) * 1000) / 1000 }));

// --- Water ---------------------------------------------------------------------
const lake = ring(way(IDS.lake), 0.5), wetland = ring(way(IDS.wetland), 0.5), pond = ring(way(IDS.pond), 0.35);
const streams = IDS.streams.map((id) => ring(way(id), 0.3));

// --- Buildings (real outlines) ---------------------------------------------------
const arts = ring(way(IDS.arts), 0.4), school = ring(way(IDS.school), 0.3), lab = ring(way(IDS.lab), 0.3);

// --- Paths ---------------------------------------------------------------------
// The park's own footways (OSM), the ones mostly inside the garden and 20 m
// or longer; pieces under the greenhouse or against a building are cut away.
const inGh = ([x, z], pad = 1.5) => Math.hypot(x - GH[0], z - GH[1]) < GH_R + pad
  || [arts, school, lab].some((b) => inPoly(x, z, b) || lineDist(x, z, close(b)) < 1.7); // (or at a building: a path ends at its wall)
const paths = [];
for (const w of osm.ways) {
  if (w.k !== 'hw' || !['footway', 'path', 'pedestrian'].includes(w.tags.highway) || w.tags.area === 'yes') continue;
  const p = w.p.map(L);
  if (p.filter(([x, z]) => inPoly(x, z, gardenRaw)).length < p.length / 2 || lineLen(p) < 20) continue;
  let run = [];
  const flush = () => { if (run.length > 1 && lineLen(run) >= 8) paths.push({ id: w.id, p: simplify(run, 0.35) }); run = []; };
  for (const q of resample(p, 2)) { if (inGh(q)) flush(); else run.push(q); }
  flush();
}
export const PATH_W = 2.2;
// A made-up ring path round the greenhouse, and short walks from each door to it.
// (only where the garden has room for it: not on the Magokdong-ro side)
const ringRuns = [];
{
  const pts = Array.from({ length: 49 }, (_, i) => at((i / 48) * Math.PI * 2 + Math.PI * 0.25, GH_R + 2.6));
  let run = [];
  for (const q of pts) { if (inPoly(q[0], q[1], gardenRaw) && lineDist(q[0], q[1], close(gardenRaw)) > 2.5) run.push(q); else { if (run.length > 2) ringRuns.push(run); run = []; } }
  if (run.length > 2) ringRuns.push(run);
}

// Water you can't walk into: the lake, the wetland and the pond, with the
// paths that cross them (the real footbridges) cut out. The thin streams are
// drawn only: you step over them.
const cuts = paths.map((q) => [close(strip(q.p, PATH_W + 1.2))]);
const blockers = [];
for (const w of [lake, wetland, pond]) {
  const left = cuts.length ? polygonClipping.difference([close(w)], ...cuts) : [[close(w)]];
  for (const poly of left) { const p = open(poly[0]); if (area(p) > 12) blockers.push({ p: R1(p), low: true }); }
}

// --- Buildings -----------------------------------------------------------------
// The visitor centre by Magongnaru Station (OSM's information point): the
// district's Information Center, a small game-size building on that spot.
const visitor = osm.nodes.find((n) => n.tags.name === '방문자 센터');
const [vx, vz] = L([visitor.lat, visitor.lon]);
export const INFO = { at: [r1(vx), r1(vz)], w: 7, d: 4.5, h: 3.4 };
let infoBox = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [INFO.at[0] + a * INFO.w / 2, INFO.at[1] + c * INFO.d / 2]);

// --- Roads ---------------------------------------------------------------------
// Magokjungang 10-ro along the garden's south side: OSM has it in many short
// pieces and two carriageways; one road through the middle of them.
const j10 = osm.ways.filter((w) => w.k === 'hw' && w.tags.name === '마곡중앙10로').map((w) => w.p.map(L));
const gx = garden.map((p) => p[0]), gz = garden.map((p) => p[1]);
const south = Math.max(...gz);
const j10pts = j10.flat().filter(([x, z]) => z > south - 12 && x > Math.min(...gx) - 25 && x < Math.max(...gx) + 25);
const j10line = [];
for (let x = Math.min(...j10pts.map((p) => p[0])); x <= Math.max(...j10pts.map((p) => p[0])); x += 12) {
  const near = j10pts.filter((p) => Math.abs(p[0] - x) < 12);
  if (near.length) j10line.push([x, near.reduce((s, p) => s + p[1], 0) / near.length]);
}
export const J10_W = 8;

// --- What grows where (for game/botanic-site.js) --------------------------------
// Trees in the open forest (열린숲, the south part) and along the lake: on a
// grid, off the paths, water and buildings. Flower beds in the theme garden
// (주제원, between the pond and the greenhouse). Reeds by the wetland.
const waters = [lake, wetland, pond, ...streams];
{ // the Information Center: the free spot nearest the real visitor centre (off the paths and the stream)
  const ok = (x, z) => inPoly(x, z, gardenRaw) && lineDist(x, z, close(gardenRaw)) > 5 && !waters.some((w) => inPoly(x, z, w) || lineDist(x, z, close(w)) < 4.5) && !paths.some((q) => lineDist(x, z, q.p) < PATH_W / 2 + 4.6) && lineDist(x, z, close(arts)) > 6;
  let best = null;
  for (let dx = -16; dx <= 16; dx += 0.5) for (let dz = -16; dz <= 16; dz += 0.5) { const d = Math.hypot(dx, dz); if ((!best || d < best[2]) && ok(vx + dx, vz + dz)) best = [vx + dx, vz + dz, d]; }
  if (!best) throw new Error('no room for the Information Center');
  INFO.at = [r1(best[0]), r1(best[1])]; INFO.off = r1(best[2]);
  infoBox = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [INFO.at[0] + a * INFO.w / 2, INFO.at[1] + c * INFO.d / 2]);
}
const solid = [arts, school, lab, infoBox];
const free = (x, z, pad) => inPoly(x, z, gardenRaw) && !waters.some((w) => inPoly(x, z, w) || lineDist(x, z, close(w)) < pad) && !solid.some((b) => inPoly(x, z, b) || lineDist(x, z, close(b)) < pad + 1)
  && !paths.some((q) => lineDist(x, z, q.p) < PATH_W / 2 + pad) && Math.hypot(x - GH[0], z - GH[1]) > GH_R + 6 && lineDist(x, z, close(gardenRaw)) > 2;
const rnd = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const trees = [], beds = [], reeds = [];
{
  const x0 = Math.min(...gx), x1 = Math.max(...gx), z0 = Math.min(...gz), z1 = Math.max(...gz);
  const pondC = centroid(pond), lakeC = centroid(lake), wetC = centroid(wetland);
  let i = 0;
  for (let x = x0; x < x1; x += 6) for (let z = z0; z < z1; z += 6) {
    i++;
    const px = x + (rnd(i, 1) - 0.5) * 5, pz = z + (rnd(i, 2) - 0.5) * 5;
    if (!free(px, pz, 1.4)) continue;
    const forest = pz > pondC[1] + 12; // the open forest: south of the pond
    const byLake = Math.hypot(px - lakeC[0], pz - lakeC[1]) < 75 && !forest;
    const wet = pz < wetC[1] + 45;
    if (forest ? rnd(i, 3) < 0.7 : wet ? rnd(i, 3) < 0.4 : byLake ? rnd(i, 3) < 0.4 : rnd(i, 3) < 0.3) trees.push([r1(px - GH[0]), r1(pz - GH[1]), Math.round((0.8 + rnd(i, 4) * 0.5) * 100) / 100, rnd(i, 5) < (forest ? 0.25 : 0.1) ? 1 : 0]); // [x, z, size, conifer]
  }
  // flower beds: round the theme garden, between the pond and the greenhouse
  const tc = [(pondC[0] + GH[0]) / 2 - 6, (pondC[1] + GH[1]) / 2 + 8];
  for (let k = 0; k < 400 && beds.length < 22; k++) {
    const a = rnd(k, 6) * Math.PI * 2, d = 4 + rnd(k, 7) * 42, px = tc[0] + Math.cos(a) * d, pz = tc[1] + Math.sin(a) * d;
    if (!free(px, pz, 1.9) || beds.some((b) => Math.hypot(b[0] + GH[0] - px, b[1] + GH[1] - pz) < 5) || trees.some((t) => Math.hypot(t[0] + GH[0] - px, t[1] + GH[1] - pz) < 3)) continue;
    beds.push([r1(px - GH[0]), r1(pz - GH[1]), r1(1.3 + rnd(k, 8) * 0.9), beds.length % 5]); // [x, z, radius, colour]
  }
  // reeds along the wetland's water
  const wl = resample(close(wetland), 4);
  wl.forEach(([x, z], k) => { const c = wetC, d = Math.hypot(x - c[0], z - c[1]) || 1, px = x + ((x - c[0]) / d) * 1.6, pz = z + ((z - c[1]) / d) * 1.6; if (k % 2 === 0 && free(px, pz, 0.4)) reeds.push([r1(px - GH[0]), r1(pz - GH[1])]); });
}

const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const map = {
  meta: {
    district: 'magok',
    source: 'scripts/build-magok.mjs, at 1/4 on the real place: the outline of Seoul Botanic Park, its lake, wetland, pond, streams and paths, the buildings in it and Magokjungang 10-ro from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/magok-osm.json). The greenhouse alone is 50% of real, on purpose.',
    approx: [
      { what: 'the greenhouse', why: `50% of real on purpose (Yozi 2026-11-21: the land 1/4, the greenhouse 50% and open to walk into): ${r1(GH_R * 2)} m across instead of ${r1(ghR14 * 2)} m. Its middle is ${r1(shift)} m north-west of the real one (straight away from the road), so the glass stays ${CLEAR} m off Magokdong-ro's kerb.` },
      { what: "the greenhouse's support building", why: 'The low building on its north-west side (OSM) is left out: the bigger glass house stands over it.' },
      { what: "the greenhouse's doors and the ring path round it", why: 'Two doors (south-west toward the theme garden, north-west toward the lake) and a path round the glass, made up; the real doors are through the support building.' },
      { what: 'what is planted', why: 'Trees, flower beds and reeds are scattered by rule (the open forest thick, the lake side thin); the real beds are not in OSM. Everything inside the greenhouse is made up.' },
      { what: 'paths', why: "OSM's footways of 20 m or longer; shorter ones are left out, and the footbridges are flat paths over the water." },
      { what: 'Magokjungang 10-ro as one road', why: 'OSM has two carriageways in short pieces; drawn as one 8 m road through them.' },
      { what: 'Magok Information Center', why: "A game-size building on the spot of the park's real visitor centre by Magongnaru Station (" + INFO.off + ' m from it, to stand clear of the paths).' },
      { what: 'the arts centre, the forest school, the research greenhouse', why: 'Real outlines (OSM), drawn as plain unnamed buildings; you cannot go in.' },
    ],
    parts: [{ box: [Math.floor(Math.min(...gx) - 8), Math.floor(Math.min(...gz) - 8), Math.ceil(Math.max(...gx, GH[0] + GH_R) + 8), Math.ceil(south + 14)] }],
  },
  roads: [
    { k: 'tertiary', w: J10_W, p: R1(simplify(j10line, 0.5)), n: N('마곡중앙10로', 'Magokjungang 10-ro', '麻谷中央10路', '麻谷中央10路') },
    ...paths.map((q) => ({ k: 'walk', w: PATH_W, p: R1(q.p) })),
    ...ringRuns.map((p) => ({ k: 'walk', w: PATH_W, p: R1(p), approx: true })),
    ...doors.map((d) => ({ k: 'walk', w: d.w, p: R1([at(d.a, GH_R - 1), at(d.a, GH_R + 2.6)]), approx: true })),
  ],
  buildings: [
    { h: 8, p: R1(arts) },
    { h: 3.5, p: R1(school) },
    { h: 3, p: R1(lab) },
    { h: INFO.h, p: R1(infoBox), n: 'info' },
  ],
  areas: [
    { k: 'park', p: R1(garden), n: N('서울식물원', 'Seoul Botanic Park', 'ソウル植物園', '首尔植物园') },
    { k: 'water', p: R1(lake), n: N('호수원', 'Lake Garden', '湖水園', '湖水园') },
    { k: 'water', p: R1(wetland), n: N('습지원', 'Wetland Garden', '湿地園', '湿地园') },
    { k: 'water', p: R1(pond) },
    ...streams.map((p) => ({ k: 'water', p: R1(p) })),
  ],
  blockers,
  pois: [
    { kind: 'landmark', x: GH[0], z: GH[1], name: N('서울식물원 온실', 'Seoul Botanic Park Greenhouse', 'ソウル植物園 温室', '首尔植物园温室') },
  ],
  landmarks: [
    {
      type: 'botanic', x: GH[0], z: GH[1], r: GH_R, sides: GH_N, real: R1([ghC])[0], realR: r1(ghR14), store: 'seoul-botanic-greenhouse',
      doors: doors.map(({ a, w, at: p, out, face, main }) => ({ a: Math.round(a * 1000) / 1000, w, at: p, out, face, ...(main ? { main: true } : {}) })),
      trees, beds, reeds, // (metres from the greenhouse's middle)
    },
  ],
};

const span = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [r1(Math.max(...xs) - Math.min(...xs)), r1(Math.max(...zs) - Math.min(...zs))]; };
console.log({
  OFFSET, garden: span(garden), gardenPts: garden.length, greenhouse: { real14: r1(ghR14 * 2), game: r1(GH_R * 2), shift, at: GH, toRoad: r1(roadGap(GH[0], GH[1]) - GH_R - DONGRO_W / 2) },
  lake: span(lake), wetland: span(wetland), pond: span(pond), paths: paths.length, pathM: Math.round(paths.reduce((s, q) => s + lineLen(q.p), 0)),
  blockers: blockers.length, trees: trees.length, beds: beds.length, reeds: reeds.length, info: INFO.at, j10: j10line.length, doors: doors.map((d) => d.out),
});
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'magok.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/magok.json', Math.round(JSON.stringify(map).length / 1024 * 10) / 10, 'KB');
}
