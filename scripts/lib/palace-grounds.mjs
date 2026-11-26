// A palace's green from the real map (scripts/data/gyeongbokgung-grounds-osm.json,
// © OpenStreetMap contributors, ODbL: scripts/extract-gyeongbokgung-grounds.mjs):
//   - the lawns and the woods on their real outlines (map areas),
//   - the trees: OSM's own single trees on their real spots first, then the
//     made-up ones, thrown onto the places where a satellite photo shows
//     trees (scripts/data/gyeongbokgung-canopy.json), so the clumps and the
//     open ground are the real ones (Yozi 2026-11-24: as the satellite photo
//     has them, never rows),
//   - Hyangwonjeong's island and Chwihyanggyo: the pond's blocker with the
//     island and the bridge cut out of it, so you walk over to the pavilion,
//   - the ponds' stone banks, lotus leaves and Yeolsangjinwon spring.
// Used by scripts/build-gyeongbokgung.mjs; drawn by core/palace-garden.js.
import polygonClipping from 'polygon-clipping';
import { inside } from './palace-plan.mjs';

const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
export const KIND = { round: 0, pine: 1, maple: 2, willow: 3, ginkgo: 4, bush: 5 }; // (core/palace-garden.js KIND)
// How high each kind's model stands at size 1 (core/palace-garden.js; the test
// measures them), and how high it grows in the palace in real metres.
export const TREE_H = [3.75, 4.32, 3.07, 4.5, 5.23, 1.05];
export const TREE_REAL = { 0: [8, 13], 1: [7, 11], 2: [4.5, 7], 3: [8, 11], 4: [10, 14], 5: [1.5, 2.6] };
const signed = (P) => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return s / 2; };
const segDist = (x, z, [x1, z1], [x2, z2]) => {
  const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)) : 0;
  return Math.hypot(x1 + t * dx - x, z1 + t * dz - z);
};
export const edgeDist = (P, x, z) => { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, segDist(x, z, P[j], P[i])); return d; };
const closed = (P) => P.concat([P[0]]);
const opened = (R) => (String(R[0]) === String(R.at(-1)) ? R.slice(0, -1) : R);
const circle = (x, z, r, n = 20) => Array.from({ length: n }, (_, i) => [x + Math.sin((i / n) * Math.PI * 2) * r, z + Math.cos((i / n) * Math.PI * 2) * r]);

// Douglas-Peucker: a line, and a ring (cut at its two far ends).
function line(P, eps) {
  if (P.length < 3) return P;
  let k = 0, far = 0;
  for (let i = 1; i < P.length - 1; i++) { const d = segDist(P[i][0], P[i][1], P[0], P.at(-1)); if (d > far) { far = d; k = i; } }
  return far <= eps ? [P[0], P.at(-1)] : line(P.slice(0, k + 1), eps).slice(0, -1).concat(line(P.slice(k), eps));
}
function simplify(P, eps) {
  let k = 0, far = 0;
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > far) { far = d; k = i; } }
  return line(P.slice(0, k + 1), eps).slice(0, -1).concat(line(P.slice(k).concat([P[0]]), eps).slice(0, -1));
}
const tidy = (R, eps) => simplify(opened(R), eps).map(([x, z]) => [r1(x), r1(z)]).filter((p, i, l) => String(p) !== String(l[(i + l.length - 1) % l.length]));

function rng(seed) { // (mulberry32)
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// grounds: the extract; local: [lat, lon] -> the district's metres; wall:
// the palace wall's line; solids: the buildings' and walls' blockers
// (polygons); yards: the paved yards (polygons); ponds: [{ name, p }];
// keepRects, keepCircles ([x, z, r]): where the shows and visitors stand;
// canopy: { x0, z0, rows }, where the satellite photo shows trees; GAP: how
// far apart the made-up trees stand at a clump's edge, inside it and round
// Hyangwonji;
// hyang: Hyangwonjeong's middle { x, z }; ISLE = [r, top], BRIDGE = [w, rise],
// SC = [across, up]: the pavilion's size (1 = half the real one);
// stages: lawns that stay as they are drawn, whatever OSM has there
// ([{ p, ... }]: where the shows are).
export function planGrounds({ grounds, local, wall, solids, yards, ponds, keepRects = [], keepCircles = [], stages = [], canopy, GAP = [3.4, 4.4, 2.4], hyang, ISLE, BRIDGE, SC = [1, 1], SIMPLIFY = 0.4 }) {
  const rand = rng(20261126), pick = (a, b) => a + rand() * (b - a);
  const ring = (pts) => opened(pts.map(local));
  const geo = (list) => list.map((e) => [closed(ring(e.pts)), ...(e.holes || []).map((h) => closed(ring(h)))]);
  const W = [closed(wall)], water = ponds.map((w) => [closed(w.p)]), paved = yards.map((y) => [closed(y)]).concat(stages.map((t) => [closed(t.p)]));

  // ---------- Lawns and woods ----------
  const woodsMP = polygonClipping.difference(polygonClipping.intersection(polygonClipping.union(...geo(grounds.wood)), W), ...water, ...paved);
  const lawnsMP = polygonClipping.difference(polygonClipping.intersection(polygonClipping.union(...geo(grounds.grass), ...geo(grounds.garden), ...geo(grounds.scrub)), W), ...water, ...paved, woodsMP);
  const toAreas = (mp, k, why) => {
    const out = [];
    for (const [outer, ...holes] of mp) {
      const p = tidy(outer, SIMPLIFY);
      if (p.length < 3 || Math.abs(signed(p)) < 1.5) continue;
      const hs = holes.map((h) => tidy(h, SIMPLIFY)).filter((h) => h.length > 2 && Math.abs(signed(h)) >= 1.5);
      out.push({ k, p, ...(hs.length ? { holes: hs } : {}), gb: 1 });
    }
    if (out[0]) out[0].why = why;
    return out;
  };
  const lawns = [...stages.map((t) => ({ k: 'grass', ...t, gb: 1 })), ...toAreas(lawnsMP, 'grass', 'the palace lawns on their real outlines (OpenStreetMap landuse=grass: scripts/data/gyeongbokgung-grounds-osm.json)')];
  const woods = toAreas(woodsMP, 'park', 'the palace woods on their real outlines (OpenStreetMap natural=wood)');

  // ---------- Trees ----------
  const boxOf = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
  const S = solids.map((p) => ({ p, b: boxOf(p) }));
  const trees = []; // [x, z, size, kind]
  const from = { osm: 0, rows: 0, canopy: 0, isle: 0 }, dropped = [];
  const ok = (x, z, { wet = false, gap = 2.2, off = 1.5 } = {}) => {
    if (!inside(wall, x, z) || edgeDist(wall, x, z) < 1.6) return false;
    if (!wet && ponds.some((w) => inside(w.p, x, z) || edgeDist(w.p, x, z) < 0.8)) return false;
    for (const s of S) if (x > s.b[0] - off && x < s.b[2] + off && z > s.b[1] - off && z < s.b[3] + off && (inside(s.p, x, z) || edgeDist(s.p, x, z) < off)) return false;
    if (yards.some((p) => inside(p, x, z) || edgeDist(p, x, z) < 0.6)) return false;
    if (keepRects.some((p) => inside(p, x, z))) return false;
    if (keepCircles.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) return false;
    return trees.every((t) => Math.hypot(t[0] - x, t[1] - z) >= gap);
  };
  // Sizes: a tree is a quarter of its real height like everything else
  // (Yozi 2026-11-26: buildings are 1/4, trees had no rule and all stood
  // tall). TREE_REAL is how high each kind grows in the palace, in real
  // metres (typical figures, not measured tree by tree).
  const SIZE = Object.fromEntries(Object.entries(TREE_REAL).map(([kind, m]) => [kind, m.map((h) => h / 4 / TREE_H[kind])]));
  const plant = (x, z, kind, k = 1) => trees.push([r1(x), r1(z), r2(pick(...SIZE[kind]) * k), kind]);
  const mix = (table) => { let u = rand(); for (const [kind, share] of table) { if ((u -= share) < 0) return kind; } return table[0][0]; };

  // OSM's single trees, on their spots (moved up to 1.6 m off a building
  // drawn bigger than the real one). Round Gyeonghoeji they are its weeping
  // willows; on its islets, pines.
  const big = ponds.reduce((a, b) => (Math.abs(signed(a.p)) > Math.abs(signed(b.p)) ? a : b));
  const islets = [];
  for (const [lat, lon, leaf] of grounds.trees) {
    const [x, z] = local([lat, lon]);
    if (!inside(wall, x, z)) continue;
    const onIslet = inside(big.p, x, z);
    const kind = leaf === 'n' || onIslet ? KIND.pine : edgeDist(big.p, x, z) < 4.5 ? KIND.willow : mix([[KIND.round, 0.6], [KIND.maple, 0.22], [KIND.ginkgo, 0.18]]);
    let at = null;
    for (const [dx, dz] of [[0, 0], [0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.1, 1.1], [-1.1, 1.1], [1.1, -1.1], [-1.1, -1.1]]) if (ok(x + dx, z + dz, { wet: onIslet, gap: 1.3, off: 1.0 })) { at = [x + dx, z + dz]; break; }
    if (!at) { dropped.push([r1(x), r1(z)]); continue; }
    plant(at[0], at[1], kind, onIslet ? 0.9 : 1.2); // (the trees OSM maps one by one are the big old ones)
    if (onIslet) islets.push(at);
    from.osm++;
  }
  // OSM's tree rows: a tree every 3 m or so along the line.
  for (const row of grounds.rows) {
    const P = row.map(local);
    for (let i = 1; i < P.length; i++) {
      const [x0, z0] = P[i - 1], [x1, z1] = P[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3));
      for (let k = 0; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n + pick(-0.3, 0.3), z = z0 + ((z1 - z0) * k) / n + pick(-0.3, 0.3); if (ok(x, z, { gap: 1.8 })) { plant(x, z, mix([[KIND.round, 0.7], [KIND.ginkgo, 0.3]])); from.rows++; } }
    }
  }
  const real = trees.length;
  const hy = ponds.find((w) => inside(w.p, hyang.x, hyang.z));
  const walk = (P, each) => { // along a ring: each(x, z, nx, nz, d) with the normal pointing out of it; returns the next step
    const sgn = signed(P) > 0 ? 1 : -1;
    let carry = 0;
    for (let i = 0; i < P.length; i++) {
      const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length], L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 1e-6) continue;
      const ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = uz * sgn, nz = -ux * sgn;
      let d = carry;
      while (d < L) d += each(x0 + ux * d, z0 + uz * d, nx, nz);
      carry = d - L;
    }
  };
  // (which way is out: a step along the normal from the first edge's middle)
  const outward = (P) => { const [a, b] = P, L = Math.hypot(b[0] - a[0], b[1] - a[1]), sgn = signed(P) > 0 ? 1 : -1, nx = ((b[1] - a[1]) / L) * sgn, nz = (-(b[0] - a[0]) / L) * sgn; return inside(P, (a[0] + b[0]) / 2 + nx * 0.05, (a[1] + b[1]) / 2 + nz * 0.05) ? -1 : 1; };
  const [bx, bz] = local(grounds.bridge.reduce((a, b) => (Math.hypot(...local(a).map((v, i) => v - [hyang.x, hyang.z][i])) > Math.hypot(...local(b).map((v, i) => v - [hyang.x, hyang.z][i])) ? a : b))); // the bridge's shore end
  let L = Math.hypot(bx - hyang.x, bz - hyang.z);
  const ux = (bx - hyang.x) / L, uz = (bz - hyang.z) / L;
  while (inside(hy.p, hyang.x + ux * (L - 0.6), hyang.z + uz * (L - 0.6))) L += 0.1; // (its end 0.6 m up the bank)
  const offBridge = (x, z) => { const dx = x - hyang.x, dz = z - hyang.z; return Math.abs(dx * uz - dz * ux); }; // how far from the bridge's line
  const spring = grounds.spring && local(grounds.spring.pt), south = Math.max(...hy.p.map((q) => q[1]));
  // The made-up trees stand where the satellite photo shows trees
  // (scripts/data/gyeongbokgung-canopy.json, 1 m cells): thrown onto those
  // cells in a random order, each keeping its distance from the ones before.
  // So the clumps and the open ground are the real ones; a tree's own spot,
  // kind and height are not. Small ones at a clump's edge, a tall one now and
  // then inside (Yozi 2026-11-26: not all of them tall).
  {
    const { x0, z0, rows } = canopy, T = (i, j) => rows[j]?.[i] === 'T';
    const deep = (i, j) => { for (let d = 1; d <= 3; d++) for (let a = -d; a <= d; a++) for (let b = -d; b <= d; b++) if (!T(i + a, j + b)) return d; return 4; }; // 1: the clump's edge ... 4: well inside
    const cells = [];
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      if (!T(i, j)) continue;
      let n = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) n += T(i + a, j + b) ? 1 : 0;
      if (n >= 4) cells.push([i, j, rand()]); // (not a stray dark pixel)
    }
    cells.sort((a, b) => a[2] - b[2]);
    for (const [i, j] of cells) {
      const x = x0 + i + rand(), z = z0 + j + rand(), d = deep(i, j);
      if (offBridge(x, z) < 2.5 && (x - hyang.x) * ux + (z - hyang.z) * uz > 0) continue; // (the way up to the bridge stays open)
      if (spring && Math.hypot(x - spring[0], z - spring[1]) < 2) continue;
      if (z > south && z < south + 7 && Math.abs(x - hyang.x) < 5) continue; // (and the south bank in front of the pavilion: where you stand to look at it)
      const byPond = edgeDist(hy.p, x, z) < 8, tall = d >= 2 && rand() < 0.22; // (round Hyangwonji they stand close: the pond is ringed with trees)
      if (!ok(x, z, { gap: byPond ? GAP[2] : d >= 3 ? GAP[1] : GAP[0] })) continue;
      const kind = d === 1 && rand() < 0.14 ? KIND.bush : byPond ? mix([[KIND.maple, 0.45], [KIND.pine, 0.25], [KIND.round, 0.22], [KIND.ginkgo, 0.08]]) : mix([[KIND.round, 0.42], [KIND.pine, 0.32], [KIND.maple, 0.18], [KIND.ginkgo, 0.08]]);
      plant(x, z, kind, kind === KIND.bush ? 1 : tall ? 1.25 : d === 1 ? 0.85 : 1);
      from.canopy++;
    }
  }

  // ---------- Hyangwonjeong's island and Chwihyanggyo ----------
  const [isleR, top] = ISLE, [bw, rise] = BRIDGE;
  const span = [r2(ux * L), r2(uz * L), bw, rise];
  const corridor = (w, more = 0) => { const a = ISLE[0] - 0.6, b = L + more, px = uz, pz = -ux; return [[a, -w / 2], [b, -w / 2], [b, w / 2], [a, w / 2]].map(([u, v]) => [hyang.x + ux * u + px * v, hyang.z + uz * u + pz * v]); };
  const cut = polygonClipping.difference([closed(hy.p)], [closed(circle(hyang.x, hyang.z, isleR, 24))], [closed(corridor(bw + 0.2, 1.5))]);
  if (cut.some((pg) => pg.length > 1)) throw new Error('Hyangwonji: the bridge does not reach the bank (the island is still a hole in the water)');
  const pondBlockers = cut.map((pg) => ({ p: opened(pg[0]).map(([x, z]) => [r2(x), r2(z)]) }));
  const th = Math.atan2(ux, uz), hexR = 2.6 * SC[0]; // the pavilion's stone base (core/palace-garden.js), its flat side to the bridge
  const blockers = [...pondBlockers, { p: Array.from({ length: 6 }, (_, k) => [r2(hyang.x + Math.sin(th + Math.PI / 6 + (k * Math.PI) / 3) * hexR), r2(hyang.z + Math.cos(th + Math.PI / 6 + (k * Math.PI) / 3) * hexR)]) }];
  // the island's own shrubs and two small trees inside its fence, clear of the bridge's end and the steps (made up)
  for (const [deg, kind, sz] of [[52, KIND.bush, 0.55], [84, KIND.maple, 0.52], [150, KIND.bush, 0.6], [178, KIND.bush, 0.5], [-155, KIND.bush, 0.62], [-122, KIND.maple, 0.48], [-88, KIND.bush, 0.55], [-50, KIND.bush, 0.5]]) { const a = th + (deg * Math.PI) / 180, r = isleR - 0.85; trees.push([r2(hyang.x + Math.sin(a) * r), r2(hyang.z + Math.cos(a) * r), sz, kind]); from.isle++; }
  const hyangwonjeong = {
    type: 'hyangwonjeong', x: r1(hyang.x), z: r1(hyang.z), isle: ISLE, span, sc: SC, inner: true, gb: 1,
    name: { ko: '향원정', en: 'Hyangwonjeong Pavilion' },
  };

  // ---------- The ponds' banks ----------
  // A stone kerb along each pond's outline, left open where the bridge
  // lands and where a building stands in the water (Gyeonghoeru and its three bridges).
  const hole = corridor(bw + 0.5, 1.5);
  const rings = [];
  for (const w of ponds) {
    let run = [];
    const P = closed(w.p);
    for (let i = 1; i < P.length; i++) {
      const [x0, z0] = P[i - 1], [x1, z1] = P[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25));
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n;
        const open = inside(hole, x, z) || S.some((s) => x > s.b[0] - 1.2 && x < s.b[2] + 1.2 && z > s.b[1] - 1.2 && z < s.b[3] + 1.2 && (inside(s.p, x, z) || edgeDist(s.p, x, z) < 1.2));
        if (open) { if (run.length > 1) rings.push(run); run = []; } else if (k || !run.length) run.push([r2(x), r2(z)]);
      }
    }
    if (run.length > 1) rings.push(run);
  }
  // (each run: only its corners kept)
  const kerbs = rings.map((run) => line(run, 0.02));
  // The big pond's islets (OSM marks only their trees: a low square of turf under each group, made up).
  const turf = [];
  for (const [x, z] of islets) { const near = turf.find((t) => Math.hypot(t[0] - x, t[1] - z) < 5); if (near) { near[2].push([x, z]); } else turf.push([x, z, [[x, z]]]); }
  const turfs = turf.map(([, , pts]) => { const b = boxOf(pts); return [[b[0] - 1.6, b[1] - 1.6], [b[2] + 1.6, b[1] - 1.6], [b[2] + 1.6, b[3] + 1.6], [b[0] - 1.6, b[3] + 1.6]].map(([x, z]) => [r1(x), r1(z)]); });
  for (const t of turfs) kerbs.push(closed(t));
  // Lotus leaves on Hyangwonji, in a few patches off the banks (made up).
  const pads = [];
  {
    const o = outward(hy.p);
    walk(hy.p, (x, z, nx, nz) => {
      const cx = x - nx * o * pick(1.4, 2.6), cz = z - nz * o * pick(1.4, 2.6);
      for (let k = 0, n = 5 + Math.floor(rand() * 5); k < n; k++) {
        const px = cx + pick(-1.5, 1.5), pz = cz + pick(-1.1, 1.1);
        if (!inside(hy.p, px, pz) || edgeDist(hy.p, px, pz) < 0.6 || Math.hypot(px - hyang.x, pz - hyang.z) < isleR + 0.7 || (offBridge(px, pz) < bw / 2 + 0.6 && (px - hyang.x) * ux + (pz - hyang.z) * uz > 0)) continue;
        if (pads.some((q) => Math.hypot(q[0] - px, q[1] - pz) < 0.8)) continue;
        pads.push([r2(px), r2(pz), r2(pick(0.7, 1.25))]);
      }
      return pick(6, 11);
    });
  }
  const pondbank = { type: 'pondbank', x: 0, z: 0, rings: kerbs, turf: turfs, pads, inner: true, gb: 1, approx: 'the lotus leaves and the islets\' size are made up (OSM: the ponds\' outlines, the islets\' trees and the spring)' };
  if (spring) { pondbank.spring = [r1(spring[0]), r1(spring[1])]; blockers.push({ p: [[-0.7, -0.55], [0.7, -0.55], [0.7, 0.55], [-0.7, 0.55]].map(([dx, dz]) => [r2(spring[0] + dx), r2(spring[1] + dz)]), low: true }); }
  const count = (k) => trees.filter((t) => t[3] === k).length;
  const palacetrees = {
    type: 'palacetrees', x: 0, z: 0, t: trees.flat(), real, up: [[r1(hyang.x), r1(hyang.z), isleR, top]], inner: true, gb: 1,
    why: `the first ${real} trees stand where OpenStreetMap maps a tree or a tree row`,
    approx: `the other ${trees.length - real} are made up: ${from.canopy} stand where a satellite photo shows trees (scripts/data/gyeongbokgung-canopy.json: the clumps are real, each tree's spot, kind and height are not), ${from.isle} on Hyangwonjeong's island`,
  };
  return {
    areas: [...lawns, ...woods], lawns, woods, trees, real, landmarks: [hyangwonjeong, pondbank, palacetrees], blockers, pondBlockers, span, L,
    stats: { lawns: lawns.length, woods: woods.length, trees: trees.length, from, dropped: dropped.length, kinds: Object.fromEntries(Object.entries(KIND).map(([n, k]) => [n, count(k)])), kerbs: kerbs.length, pads: pads.length, bridge: r1(L - isleR) },
  };
}
