// A palace's green from the real map (scripts/data/gyeongbokgung-grounds-osm.json,
// © OpenStreetMap contributors, ODbL: scripts/extract-gyeongbokgung-grounds.mjs):
//   - the lawns and the woods on their real outlines (map areas),
//   - the trees: OSM's own single trees on their real spots first, then the
//     made-up ones (OSM draws a wood's outline, not its trees): the woods
//     filled on a loose grid, clumps along the lawns' edges with the middles
//     left open, a ring round Hyangwonji that leaves the view from the south
//     bank open (Yozi 2026-11-24: clumps at the edges, never rows),
//   - Hyangwonjeong's island and Chwihyanggyo: the pond's blocker with the
//     island and the bridge cut out of it, so you walk over to the pavilion,
//   - the ponds' stone banks, lotus leaves and Yeolsangjinwon spring.
// Used by scripts/build-gyeongbokgung.mjs; drawn by core/palace-garden.js.
import polygonClipping from 'polygon-clipping';
import { inside } from './palace-plan.mjs';

const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
export const KIND = { round: 0, pine: 1, maple: 2, willow: 3, ginkgo: 4, bush: 5 }; // (core/palace-garden.js KIND)
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
// hyang: Hyangwonjeong's middle { x, z }; ISLE = [r, top], BRIDGE = [w, rise];
// stages: lawns that stay as they are drawn, whatever OSM has there
// ([{ p, ... }]: where the shows are).
export function planGrounds({ grounds, local, wall, solids, yards, ponds, keepRects = [], keepCircles = [], stages = [], hyang, ISLE, BRIDGE, SIMPLIFY = 0.4 }) {
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
  const inArea = (a, x, z) => inside(a.p, x, z) && !(a.holes || []).some((h) => inside(h, x, z));

  // ---------- Trees ----------
  const boxOf = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
  const S = solids.map((p) => ({ p, b: boxOf(p) }));
  const trees = []; // [x, z, size, kind]
  const from = { osm: 0, rows: 0, woods: 0, rims: 0, pond: 0, isle: 0 }, dropped = [];
  const ok = (x, z, { wet = false, gap = 2.2, off = 1.5 } = {}) => {
    if (!inside(wall, x, z) || edgeDist(wall, x, z) < 1.6) return false;
    if (!wet && ponds.some((w) => inside(w.p, x, z) || edgeDist(w.p, x, z) < 0.8)) return false;
    for (const s of S) if (x > s.b[0] - off && x < s.b[2] + off && z > s.b[1] - off && z < s.b[3] + off && (inside(s.p, x, z) || edgeDist(s.p, x, z) < off)) return false;
    if (yards.some((p) => inside(p, x, z) || edgeDist(p, x, z) < 0.6)) return false;
    if (keepRects.some((p) => inside(p, x, z))) return false;
    if (keepCircles.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) return false;
    return trees.every((t) => Math.hypot(t[0] - x, t[1] - z) >= gap);
  };
  const SIZE = { [KIND.round]: [1.0, 1.4], [KIND.pine]: [0.95, 1.3], [KIND.maple]: [0.85, 1.15], [KIND.willow]: [1.05, 1.3], [KIND.ginkgo]: [0.85, 1.1], [KIND.bush]: [0.7, 1.1] };
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
    plant(at[0], at[1], kind, onIslet ? 0.8 : 1.08);
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
  // The woods, filled: a loose grid, each tree thrown off its spot (a big wood wider apart, with bigger trees).
  for (const a of woods) {
    const b = boxOf(a.p), wide = Math.abs(signed(a.p)) > 500, step = wide ? 5.4 : 4.2;
    for (let x = b[0] + pick(0, step); x < b[2]; x += step) for (let z = b[1] + pick(0, step); z < b[3]; z += step) {
      const tx = x + pick(-1.5, 1.5), tz = z + pick(-1.5, 1.5);
      if (!inArea(a, tx, tz) || edgeDist(a.p, tx, tz) < 0.5 || !ok(tx, tz, { gap: 2.6 })) continue;
      plant(tx, tz, mix([[KIND.round, 0.46], [KIND.pine, 0.38], [KIND.maple, 0.16]]), wide ? 1.2 : 1);
      from.woods++;
    }
  }
  // Round Hyangwonji: maples, pines and a willow or two on the bank, the
  // south bank left open (where you stand to look at the pavilion).
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
  const spring = grounds.spring && local(grounds.spring.pt);
  const zs = hy.p.map((q) => q[1]), south = Math.max(...zs);
  {
    const o = outward(hy.p);
    walk(hy.p, (x, z, nx, nz) => {
      const out = pick(2.0, 3.6), tx = x + nx * o * out + pick(-0.6, 0.6), tz = z + nz * o * out + pick(-0.6, 0.6);
      const view = tz > south - 1 && tx > hyang.x - 6.5 && tx < hyang.x + 6.5; // the south bank, in front of the pavilion
      const landing = offBridge(tx, tz) < 4.5 && (tx - hyang.x) * ux + (tz - hyang.z) * uz > 0; // (the way up to the bridge stays open)
      if (!view && !landing && !(spring && Math.hypot(tx - spring[0], tz - spring[1]) < 2.2) && rand() < 0.9 && ok(tx, tz, { gap: 2.4 })) {
        plant(tx, tz, mix([[KIND.maple, 0.46], [KIND.pine, 0.22], [KIND.round, 0.2], [KIND.willow, 0.12]]));
        from.pond++;
      }
      return pick(3.4, 6.2);
    });
  }
  // Along the lawns' edges: a clump of one to three every so often, the
  // middle of each lawn left open.
  for (const a of lawns) {
    if (Math.abs(signed(a.p)) < 70) continue;
    const o = -outward(a.p);
    let first = true;
    walk(a.p, (x, z, nx, nz) => {
      if (first) { first = false; return pick(2, 14); }
      if (rand() < 0.36) return pick(6, 11); // a gap
      const cx = x + nx * o * pick(1.4, 2.8), cz = z + nz * o * pick(1.4, 2.8), n = 1 + Math.floor(rand() * 2.6);
      const kind = mix([[KIND.round, 0.42], [KIND.pine, 0.28], [KIND.maple, 0.22], [KIND.ginkgo, 0.08]]);
      for (let k = 0; k < n; k++) {
        const tx = cx + (k ? pick(-2.6, 2.6) : 0), tz = cz + (k ? pick(-2.6, 2.6) : 0);
        if (!inArea(a, tx, tz) || edgeDist(a.p, tx, tz) < 0.9 || edgeDist(a.p, tx, tz) > 4.5 || !ok(tx, tz, { gap: 2.3 })) continue;
        plant(tx, tz, k && rand() < 0.3 ? KIND.bush : rand() < 0.75 ? kind : mix([[KIND.round, 0.5], [KIND.maple, 0.5]]));
        from.rims++;
      }
      return pick(7, 14);
    });
  }

  // ---------- Hyangwonjeong's island and Chwihyanggyo ----------
  const [isleR, top] = ISLE, [bw, rise] = BRIDGE;
  const span = [r2(ux * L), r2(uz * L), bw, rise];
  const corridor = (w, more = 0) => { const a = ISLE[0] - 0.6, b = L + more, px = uz, pz = -ux; return [[a, -w / 2], [b, -w / 2], [b, w / 2], [a, w / 2]].map(([u, v]) => [hyang.x + ux * u + px * v, hyang.z + uz * u + pz * v]); };
  const cut = polygonClipping.difference([closed(hy.p)], [closed(circle(hyang.x, hyang.z, isleR, 24))], [closed(corridor(bw + 0.2, 1.5))]);
  if (cut.some((pg) => pg.length > 1)) throw new Error('Hyangwonji: the bridge does not reach the bank (the island is still a hole in the water)');
  const pondBlockers = cut.map((pg) => ({ p: opened(pg[0]).map(([x, z]) => [r2(x), r2(z)]) }));
  const th = Math.atan2(ux, uz), hexR = 2.6; // the pavilion's stone base (core/palace-garden.js), its flat side to the bridge
  const blockers = [...pondBlockers, { p: Array.from({ length: 6 }, (_, k) => [r2(hyang.x + Math.sin(th + Math.PI / 6 + (k * Math.PI) / 3) * hexR), r2(hyang.z + Math.cos(th + Math.PI / 6 + (k * Math.PI) / 3) * hexR)]) }];
  // the island's own small trees and bushes, clear of the bridge's end (made up)
  for (const [deg, kind, s] of [[100, KIND.maple, 0.6], [-128, KIND.maple, 0.55], [48, KIND.bush, 0.6], [-62, KIND.bush, 0.7], [172, KIND.bush, 0.65]]) { const a = th + (deg * Math.PI) / 180, r = isleR - 0.55; trees.push([r2(hyang.x + Math.sin(a) * r), r2(hyang.z + Math.cos(a) * r), s, kind]); from.isle++; }
  const hyangwonjeong = {
    type: 'hyangwonjeong', x: r1(hyang.x), z: r1(hyang.z), isle: ISLE, span, inner: true, gb: 1,
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
    approx: `the other ${trees.length - real} are made up inside the real woods and lawns: OSM draws their outlines, not their trees (woods ${from.woods}, lawn edges ${from.rims}, round Hyangwonji ${from.pond}, on its island ${from.isle})`,
  };
  return {
    areas: [...lawns, ...woods], lawns, woods, trees, real, landmarks: [hyangwonjeong, pondbank, palacetrees], blockers, pondBlockers, span, L,
    stats: { lawns: lawns.length, woods: woods.length, trees: trees.length, from, dropped: dropped.length, kinds: Object.fromEntries(Object.entries(KIND).map(([n, k]) => [n, count(k)])), kerbs: kerbs.length, pads: pads.length, bridge: r1(L - isleR) },
  };
}
