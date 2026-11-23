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
import { blockersOf, holeOf, outsideOf } from '../src/core/subway.js';

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
// paths that cross them (the real footbridges) cut out. The streams are shut
// the same way, further down.
// A made-up lookout deck: from the lakeside path nearest the water straight
// out over the lake (DECK_OUT m past the bank).
export const DECK_W = 3.2, DECK_OUT = 9;
let deck = null;
{
  let best = null;
  for (const b of resample(close(lake), 2)) {
    if (!inPoly(b[0], b[1], gardenRaw)) continue;
    for (const q of paths) for (const a of resample(q.p, 2)) {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d < 2.5 || d > 14 || inPoly(a[0], a[1], lake)) continue;
      const u = [(b[0] - a[0]) / d, (b[1] - a[1]) / d], end = [b[0] + u[0] * DECK_OUT, b[1] + u[1] * DECK_OUT];
      // the whole deck over open water, clear of the bank and of the footbridges
      const far = Math.min(lineDist(end[0], end[1], close(lake)), ...paths.map((p2) => (p2 === q ? 99 : lineDist(end[0], end[1], p2.p))));
      if (!inPoly(end[0], end[1], lake) || far < 6) continue;
      const score = far - d * 0.5;
      if (!best || score > best.score) best = { a, end, score };
    }
  }
  if (best) deck = [best.a, best.end];
}
// The real footbridges: the stretches of path over the lake and the wetland.
const bridges = [];
for (const q of paths) { let run = []; const flush = () => { if (run.length > 2) bridges.push(simplify(run, 0.3)); run = []; }; for (const a of resample(q.p, 1.5)) { if ([lake, wetland].some((w) => inPoly(a[0], a[1], w))) run.push(a); else flush(); } flush(); }
const cuts = paths.map((q) => [close(strip(q.p, PATH_W + 1.2))]).concat(deck ? [[close(strip(deck, DECK_W + 0.6))]] : []);
const blockers = [];
for (const w of [lake, wetland, pond]) {
  const left = cuts.length ? polygonClipping.difference([close(w)], ...cuts) : [[close(w)]];
  for (const poly of left) { const p = open(poly[0]); if (area(p) > 12) blockers.push({ p: R1(p), low: true }); }
}
// The streams too (Yozi 2026-11-21: no walking through the water): shut, and
// open only where a path crosses. Their crossings get footbridge rails as well.
const streamCuts = cuts.concat(ringRuns.map((p) => [close(strip(p, PATH_W + 1.2))]), paths.flatMap((q) => [q.p[0], q.p[q.p.length - 1]]).map(([x, z]) => [close(Array.from({ length: 10 }, (_, i) => [x + Math.cos(i / 10 * Math.PI * 2) * (PATH_W / 2 + 0.7), z + Math.sin(i / 10 * Math.PI * 2) * (PATH_W / 2 + 0.7)]))])); // (round at each path's end)
for (const w of streams) {
  for (const poly of polygonClipping.difference([close(w)], ...streamCuts)) { const p = open(poly[0]); if (area(p) > 1.5) blockers.push({ p: R1(p), low: true, stream: true }); }
}
for (const q of paths.map((o) => o.p)) { let run = []; const flush = () => { if (run.length > 1 && lineLen(run) >= 1.2) bridges.push(simplify(run, 0.2)); run = []; }; for (const a of resample(q, 0.5)) { if (streams.some((w) => inPoly(a[0], a[1], w)) && ![lake, wetland].some((w) => inPoly(a[0], a[1], w))) run.push(a); else flush(); } flush(); }

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
// The Cactus & Succulent House (made up, Yozi 2026-11-21: themed plants in one
// of the garden's empty buildings): the forest school's real building with a
// shop door on it. The door goes on its long wall nearest a path; the shop's
// spot (stores.json "botanic-cactus-house") is just outside that wall.
export const CACTUS = (() => {
  let best = null;
  const q = close(school), c = centroid(school);
  for (let i = 1; i < q.length; i++) {
    const [a, b] = [q[i - 1], q[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 5.5) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len;
    if ((mx - c[0]) * nx + (mz - c[1]) * nz < 0) { nx = -nx; nz = -nz; }
    const p = [mx + nx * 1.6, mz + nz * 1.6];
    if (inPoly(p[0], p[1], school) || !inPoly(p[0], p[1], gardenRaw) || waters.some((w) => inPoly(p[0], p[1], w))) continue;
    const toPath = Math.min(...paths.map((o) => lineDist(p[0], p[1], o.p)));
    if (!best || toPath < best.toPath) best = { at: [r1(p[0]), r1(p[1])], face: Math.round(Math.atan2(nx, nz) * 1000) / 1000, toPath: r1(toPath), wall: r1(len) };
  }
  if (!best) throw new Error('no wall for the cactus house door');
  return best;
})();
const free = (x, z, pad) => inPoly(x, z, gardenRaw) && !waters.some((w) => inPoly(x, z, w) || lineDist(x, z, close(w)) < pad) && !solid.some((b) => inPoly(x, z, b) || lineDist(x, z, close(b)) < pad + 1)
  && !paths.some((q) => lineDist(x, z, q.p) < PATH_W / 2 + pad) && Math.hypot(x - GH[0], z - GH[1]) > GH_R + 6 && lineDist(x, z, close(gardenRaw)) > 2 && Math.hypot(x - CACTUS.at[0], z - CACTUS.at[1]) > 4.5;
const rnd = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const trees = [], beds = [], reeds = [], benches = [];
// The theme garden's flower field (made up: the real beds are not in OSM): a
// wide round of flowers between the pond and the greenhouse, with the paths
// through it left open. The game fills it with the season's flowers.
const pondC = centroid(pond), lakeC = centroid(lake), wetC = centroid(wetland);
export const FIELD = { at: [(pondC[0] + GH[0]) / 2 - 8, (pondC[1] + GH[1]) / 2 + 6], r: 46 };
const offPaths = (deck ? [...paths, { p: deck }] : paths);
let fields = [];
{
  const round = Array.from({ length: 40 }, (_, i) => [FIELD.at[0] + Math.cos(i / 40 * Math.PI * 2) * FIELD.r, FIELD.at[1] + Math.sin(i / 40 * Math.PI * 2) * FIELD.r]);
  const ghClear = Array.from({ length: 32 }, (_, i) => at(i / 32 * Math.PI * 2, GH_R + 7));
  const edge = (p, w) => { const q = close(p); return q.slice(1).map((b, i) => [close(strip([q[i], b], w))]); }; // a band w wide along an outline, a piece a side
  let left = polygonClipping.intersection([close(round)], [close(gardenRaw)]);
  left = polygonClipping.difference(left, [close(ghClear)], ...waters.flatMap((w) => [[close(w)], ...edge(w, 5)]), ...solid.flatMap((b) => [[close(b)], ...edge(b, 6)]), ...paths.map((q) => [close(strip(q.p, PATH_W + 2.2))]), ...paths.flatMap((q) => [q.p[0], q.p[q.p.length - 1]]).map(([x, z]) => [close(Array.from({ length: 10 }, (_, i) => [x + Math.cos(i / 10 * Math.PI * 2) * (PATH_W / 2 + 1.4), z + Math.sin(i / 10 * Math.PI * 2) * (PATH_W / 2 + 1.4)]))]), ...ringRuns.map((p) => [close(strip(p, PATH_W + 2.2))]), ...(deck ? [[close(strip([deck[0], deck[0].map((v, i) => v + (deck[1][i] - v) * 1.3)], DECK_W + 2.4))]] : []));
  // (a thin spike can be left where two cut-outs meet at a corner: drop any corner sharper than 25 degrees)
  const noSpikes = (p) => { for (let again = true; again && p.length > 3;) { again = false; for (let i = 0; i < p.length; i++) { const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length], ux = a[0] - b[0], uz = a[1] - b[1], vx = c[0] - b[0], vz = c[1] - b[1]; if (Math.acos(Math.max(-1, Math.min(1, (ux * vx + uz * vz) / ((Math.hypot(ux, uz) || 1) * (Math.hypot(vx, vz) || 1))))) < 25 * Math.PI / 180) { p.splice(i, 1); again = true; break; } } } return p; };
  fields = left.map((poly) => noSpikes(ring(open(poly[0]), 0.12))).filter((p) => p.length > 3 && area(p) > 30 && lineDist(...centroid(p), close(gardenRaw)) > 4);
}
const inField = (x, z, pad = 0) => Math.hypot(x - FIELD.at[0], z - FIELD.at[1]) < FIELD.r + pad;
{
  const x0 = Math.min(...gx), x1 = Math.max(...gx), z0 = Math.min(...gz), z1 = Math.max(...gz);
  let i = 0;
  const STEP = 4.6;
  for (let x = x0; x < x1; x += STEP) for (let z = z0; z < z1; z += STEP) {
    i++;
    const px = x + (rnd(i, 1) - 0.5) * 3.8, pz = z + (rnd(i, 2) - 0.5) * 3.8;
    if (!free(px, pz, 1.4) || inField(px, pz, 2) || (deck && lineDist(px, pz, deck) < 4)) continue;
    const forest = pz > pondC[1] + 12; // the open forest: south of the pond
    const byLake = Math.hypot(px - lakeC[0], pz - lakeC[1]) < 75 && !forest;
    const wet = pz < wetC[1] + 45;
    if (forest ? rnd(i, 3) < 0.72 : wet ? rnd(i, 3) < 0.5 : byLake ? rnd(i, 3) < 0.45 : rnd(i, 3) < 0.4) trees.push([r1(px - GH[0]), r1(pz - GH[1]), Math.round((0.8 + rnd(i, 4) * 0.5) * 100) / 100, rnd(i, 5) < (forest ? 0.25 : 0.1) ? 1 : 0]); // [x, z, size, conifer]
  }
  const nearTree = (x, z, d) => trees.some((t) => Math.hypot(t[0] + GH[0] - x, t[1] + GH[1] - z) < d);
  // Round flower beds and benches beside the paths (outside the flower field), a bed
  // or a bench every so often, on alternate sides.
  let k = 0;
  for (const q of paths) {
    const pts = resample(q.p, 1);
    for (let j = 10; j < pts.length - 6; j += 15) {
      k++;
      const a = pts[j - 1], b = pts[j + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, side = k % 2 ? 1 : -1, nx = -(b[1] - a[1]) / d * side, nz = (b[0] - a[0]) / d * side;
      if (k % 3 === 0) { // a bench, its back to the grass, facing the path
        const off = PATH_W / 2 + 0.75, px = pts[j][0] + nx * off, pz = pts[j][1] + nz * off;
        if (!free(px, pz, 0.45) || waters.some((w) => lineDist(px, pz, close(w)) < 1.6) || paths.some((o) => o !== q && lineDist(px, pz, o.p) < PATH_W / 2 + 1.2) || nearTree(px, pz, 1.6) || benches.some((o) => Math.hypot(o[0] + GH[0] - px, o[1] + GH[1] - pz) < 12)) continue;
        benches.push([r1(px - GH[0]), r1(pz - GH[1]), Math.round(Math.atan2(-nx, -nz) * 1000) / 1000]); // [x, z, the way you face sitting on it]
      } else {
        const r = 1.3 + rnd(k, 8) * 0.9, off = PATH_W / 2 + r + 0.9, px = pts[j][0] + nx * off, pz = pts[j][1] + nz * off;
        if (inField(px, pz, r + 1) || !free(px, pz, r + 0.6) || beds.some((o) => Math.hypot(o[0] + GH[0] - px, o[1] + GH[1] - pz) < 7)) continue;
        beds.push([r1(px - GH[0]), r1(pz - GH[1]), r1(r), beds.length % 5]); // [x, z, radius, colour]
      }
    }
  }
  for (let j = trees.length - 1; j >= 0; j--) { const [tx, tz] = trees[j]; if (beds.some((b) => Math.hypot(b[0] - tx, b[1] - tz) < b[2] + 1.8)) trees.splice(j, 1); }
  // reeds along the wetland's water
  const wl = resample(close(wetland), 4);
  wl.forEach(([x, z], j) => { const c = wetC, d = Math.hypot(x - c[0], z - c[1]) || 1, px = x + ((x - c[0]) / d) * 1.6, pz = z + ((z - c[1]) / d) * 1.6; if (j % 2 === 0 && free(px, pz, 0.4)) reeds.push([r1(px - GH[0]), r1(pz - GH[1])]); });
}
const rel = (p) => p.map(([x, z]) => [r1(x - GH[0]), r1(z - GH[1])]);

// The stamp stand: outside the main door, to one side of the walk in.
const mainDoor = DOORS.find((d) => d.main);
export const STAMP_AT = (() => { const a = mainDoor.a + 0.19, p = at(a, GH_R + 2.4); return { at: [r1(p[0] + OX), r1(p[1] + OZ)], ry: Math.round(Math.atan2(Math.cos(a), Math.sin(a)) * 1000) / 1000 }; })();

// --- Magongnaru Station (Line 9, 905; the airport railroad stops here too) -------
// Under Magokjungang 5-ro along the garden's west edge. Exits at the real 3
// and 4 (OSM 5968926277, 5968926278), the garden-side ones, each on the nearest open
// ground inside the garden: off the paths, the water and the buildings.
export const STATION_EXITS = { 3: [37.5657219, 126.8280119], 4: [37.5649268, 126.8279046] };
export function stationExits() {
  const hard = [...solid, ...waters];
  const ok = (e) => blockersOf(e).flatMap((w) => w.p).concat(holeOf(e), [e.at]).map(([x, z]) => [x - OX, z - OZ]).every(([x, z]) => inPoly(x, z, gardenRaw) && lineDist(x, z, close(gardenRaw)) > 1.5 && !hard.some((b) => inPoly(x, z, b) || lineDist(x, z, close(b)) < 1) && !paths.some((q) => lineDist(x, z, q.p) < PATH_W / 2 + 0.8) && lineDist(x, z, j10line) > J10_W / 2 + 1);
  return Object.entries(STATION_EXITS).map(([n, ll]) => {
    const real = toGame(...ll);
    let best = null;
    for (let dx = -14; dx <= 14; dx += 0.5) for (let dz = -14; dz <= 14; dz += 0.5) {
      const d = Math.hypot(dx, dz);
      if (d > 14 || (best && d >= best.d)) continue;
      let turn = null; // the mouth opens into the garden: the turn whose way out is furthest from the edge
      for (let t = 0; t < 8; t++) {
        const e = { at: [r1(real[0] + dx), r1(real[1] + dz)], ry: Number((t * Math.PI / 4 - Math.PI).toFixed(4)) };
        if (!ok(e)) continue;
        const o = outsideOf(e), x = o.x - OX, z = o.z - OZ, room = inPoly(x, z, gardenRaw) ? lineDist(x, z, close(gardenRaw)) : -1;
        if (!turn || room > turn.room) turn = { ...e, room };
      }
      if (turn) best = { ...turn, d };
    }
    if (!best) throw new Error('no room for exit ' + n);
    return { n: Number(n), at: best.at, ry: best.ry, off: r1(best.d) };
  });
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
      { what: 'the flower field', why: `A round of flowers ${FIELD.r * 2} m across in the theme garden between the pond and the greenhouse (${fields.length} pieces, ${Math.round(fields.reduce((t, p) => t + area(p), 0))} m2), made up: the real theme garden's beds are not in OSM. The flowers change with the season.` },
      { what: 'the lookout deck', why: deck ? `A wooden deck ${DECK_OUT} m out over the lake from the lakeside path, made up. The footbridges (${bridges.length}) are the real paths over the water, with made-up rails.` : 'none' },
      { what: 'what is planted', why: 'Trees, flower beds and reeds are scattered by rule (the open forest thick, the lake side thin); the real beds are not in OSM. Everything inside the greenhouse is made up.' },
      { what: 'paths', why: "OSM's footways of 20 m or longer; shorter ones are left out, and the footbridges are flat paths over the water." },
      { what: 'Magokjungang 10-ro as one road', why: 'OSM has two carriageways in short pieces; drawn as one 8 m road through them.' },
      { what: 'Magok Information Center', why: "A game-size building on the spot of the park's real visitor centre by Magongnaru Station (" + INFO.off + ' m from it, to stand clear of the paths).' },
      { what: 'the arts centre, the research greenhouse', why: 'Real outlines (OSM), drawn as plain unnamed buildings; you cannot go in.' },
      { what: 'the Cactus & Succulent House', why: `The forest school's real outline (OSM) with a made-up shop in it: a cactus and succulent room that sells four pot plants. Its door is on the ${CACTUS.wall} m wall, ${CACTUS.toPath} m from the nearest path.` },
    ],
    parts: [{ box: [Math.floor(Math.min(...gx) - 8), Math.floor(Math.min(...gz) - 8), Math.ceil(Math.max(...gx, GH[0] + GH_R) + 8), Math.ceil(south + 14)] }],
  },
  roads: [
    { k: 'tertiary', w: J10_W, p: R1(simplify(j10line, 0.5)), n: N('마곡중앙10로', 'Magokjungang 10-ro', '麻谷中央10路', '麻谷中央10路') },
    ...paths.map((q) => ({ k: 'walk', w: PATH_W, p: R1(q.p) })),
    ...ringRuns.map((p) => ({ k: 'walk', w: PATH_W, p: R1(p), approx: true })),
    ...doors.map((d) => ({ k: 'walk', w: d.w, p: R1([at(d.a, GH_R - 1), at(d.a, GH_R + 2.6)]), approx: true })),
    ...(deck ? [{ k: 'walk', w: DECK_W, p: R1([deck[0], [deck[1][0] - (deck[1][0] - deck[0][0]) * 0.07, deck[1][1] - (deck[1][1] - deck[0][1]) * 0.07]]), approx: true, deck: true }] : []), // (stops short of the end rail)
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
      trees, beds, reeds, benches, // (metres from the greenhouse's middle)
      fields: fields.map(rel), bridges: bridges.map(rel), ...(deck ? { deck: rel(deck) } : {}),
    },
  ],
};

const span = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [r1(Math.max(...xs) - Math.min(...xs)), r1(Math.max(...zs) - Math.min(...zs))]; };
console.log({
  OFFSET, garden: span(garden), gardenPts: garden.length, greenhouse: { real14: r1(ghR14 * 2), game: r1(GH_R * 2), shift, at: GH, toRoad: r1(roadGap(GH[0], GH[1]) - GH_R - DONGRO_W / 2) },
  lake: span(lake), wetland: span(wetland), pond: span(pond), paths: paths.length, pathM: Math.round(paths.reduce((s, q) => s + lineLen(q.p), 0)),
  blockers: blockers.length, trees: trees.length, beds: beds.length, reeds: reeds.length, benches: benches.length, fields: fields.map((p) => Math.round(area(p))), bridges: bridges.map((p) => Math.round(lineLen(p))), deck, stamp: STAMP_AT, exits: stationExits(), info: INFO.at, cactus: { ...CACTUS, world: [r1(CACTUS.at[0] + OX), r1(CACTUS.at[1] + OZ)] }, j10: j10line.length, doors: doors.map((d) => d.out),
});
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'magok.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/magok.json', Math.round(JSON.stringify(map).length / 1024 * 10) / 10, 'KB');
}
