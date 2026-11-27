// How a palace's real buildings (OpenStreetMap footprints at 1/4) become what
// the game draws: roofed corridors (행각) as runs round their yards, a chosen
// number of halls and gates at FOOT times the 1/4 map where they fit, and
// plain blocks where a building was left out. Shared by
// scripts/build-gyeongbokgung.mjs and scripts/build-changdeokgung.mjs.
import { gateMid, throneTerraces } from '../../src/core/temple-terrace.js';

const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

// The smallest box round a footprint: middle, size along its own axes, and
// its angle a (u = x cos a + z sin a), turned so a is within ±45°.
export function obb(P) {
  let best = null;
  for (let a = -45; a < 45; a += 0.25) {
    const r = (a * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const [x, z] of P) { const u = x * cs + z * sn, v = -x * sn + z * cs; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const A = (u1 - u0) * (v1 - v0);
    if (!best || A < best.A - 1e-6) { const u = (u0 + u1) / 2, v = (v0 + v1) / 2; best = { A, a: r, w: u1 - u0, d: v1 - v0, x: u * cs - v * sn, z: u * sn + v * cs }; }
  }
  return best;
}
export const area = (P) => { let s = 0; for (let i = 0; i < P.length - 1; i++) s += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1]; return Math.abs(s / 2); };
export function inside(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
// A rectangle (middle x, z; size w along angle a, d across) as a polygon.
export function rect(x, z, w, d, a) {
  const cs = Math.cos(a), sn = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [r2(x + u * cs - v * sn), r2(z + u * sn + v * cs)]);
}

// An ㄱ, ㄷ or ㅁ shaped footprint (a hall with wings, a ring of corridors)
// split into rectangles: the biggest one first, then the biggest of what is
// left, on a 20 cm grid in the footprint's own axes.
export function rectangles(P, o) {
  const cs = Math.cos(o.a), sn = Math.sin(o.a), Q = P.map(([x, z]) => [x * cs + z * sn, -x * sn + z * cs]);
  const R = 0.2, u0 = Math.min(...Q.map((q) => q[0])), v0 = Math.min(...Q.map((q) => q[1]));
  const nu = Math.ceil(o.w / R) + 1, nv = Math.ceil(o.d / R) + 1;
  const cell = Array.from({ length: nv }, (_, j) => Array.from({ length: nu }, (_, i) => inside(Q, u0 + (i + 0.5) * R, v0 + (j + 0.5) * R)));
  const out = [];
  for (;;) {
    // largest rectangle of true cells (histogram method)
    const h = new Array(nu).fill(0);
    let best = null;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) h[i] = cell[j][i] ? h[i] + 1 : 0;
      const st = [];
      for (let i = 0; i <= nu; i++) {
        const hi = i < nu ? h[i] : 0;
        let s = i;
        while (st.length && st.at(-1)[1] >= hi) {
          const [si, sh] = st.pop();
          const A = sh * (i - si);
          if (!best || A > best.A) best = { A, i0: si, i1: i, j0: j - sh + 1, j1: j + 1 };
          s = si;
        }
        st.push([s, hi]);
      }
    }
    if (!best || best.A * R * R < 0.5) break;
    for (let j = best.j0; j < best.j1; j++) for (let i = best.i0; i < best.i1; i++) cell[j][i] = false;
    const w = (best.i1 - best.i0) * R, d = (best.j1 - best.j0) * R;
    if (Math.min(w, d) < 0.5) continue;
    const u = u0 + ((best.i0 + best.i1) / 2) * R, v = v0 + ((best.j0 + best.j1) / 2) * R;
    out.push({ x: u * cs - v * sn, z: u * sn + v * cs, w, d, a: o.a, cx: o.x, cz: o.z });
  }
  return out;
}

export const sat = (A, B) => { // two convex polygons overlap
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length], nx = z0 - z1, nz = x1 - x0;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const [x, z] of A) { const t = x * nx + z * nz; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
    for (const [x, z] of B) { const t = x * nx + z * nz; b0 = Math.min(b0, t); b1 = Math.max(b1, t); }
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
};

// elements: OSM elements ({ kind: 'building', id, name, pts, roof, gate });
// local: its pts -> the district's metres; inPalace(x, z); OUTLINE: the wall.
// OWN: names drawn by their own model (returned in own, not as halls).
// KEEP: names kept first, then the biggest, up to COUNT halls and gates.
// HALLS: names of small halls with wings, drawn as one hall.
// keepClear: polygons no hall may grow into; ponds: polygons no block stands on.
// Untangling (Yozi 2026-11-27: "buildings overlap"), each opt-in:
// ownSolid(name, o): the ground an own model really covers (a gate drawn at
//   50% is wider than its plot): corridors stop at it, a hall is cut back
//   from it, no block stands on it.
// LONG: a footprint this many times longer than deep (and under 3.6 m deep)
//   is a corridor too (Geunjeongjeon's west corridor is 2.83 m deep, just
//   over the 2.8 m line, and was drawn as a 40 m hall across two gates).
// dedupe: a hall whose middle is inside another building's hall already down
//   is dropped (OSM maps a few buildings twice). gateBays: a gate of three bays blocks its
//   two shut side bays (core/temple-terrace.js gateMid).
export function planPalace({ elements, local, inPalace, OUTLINE, OWN = {}, NO_RIDGE = new Set(), BOARDS = {}, KEEP = [], COUNT = 30, modern = new Set(), FOOT = 2, FOOT_MIN = 1.2, WALK = 1.3, DOOR = 2.6, BLOCK_GAP = 3, keepClear = [], ponds = [], skipBlock = () => false, HALLS = new Set(), ownSolid = null, LONG = 0, dedupe = false, gateBays = false }) {
  const thin = (r) => { if (r.hall) return false; const s = Math.min(r.w, r.d), L = Math.max(r.w, r.d); return (s <= 2.8 && L / s >= 2.4) || (LONG > 0 && s <= 3.6 && L / s >= LONG); };
  const units = [];
  for (const e of elements) {
    if (e.kind !== 'building' || modern.has(e.id)) continue;
    if (e.roof && !e.name) continue;
    const P = e.pts.map(local), o = obb(P);
    if (!inPalace(o.x, o.z) && !OWN[e.name] && !/문$/.test(e.name || "")) continue; // (gates stand on the wall line)
    const gate = !!e.gate || /문$/.test(e.name || '');
    const fill = area(P) / o.A;
    let parts = fill > 0.9 ? [{ x: o.x, z: o.z, w: o.w, d: o.d, a: o.a, cx: o.x, cz: o.z }] : rectangles(P, o);
    // HALLS: a small hall with wings that reads as a corridor (long and under 2.8 m deep on the 1/4 map): its main part is the hall, the wings are dropped.
    if (HALLS.has(e.name) && parts.length) { parts = [{ ...parts[0], d: Math.max(parts[0].d, 1.6), hall: true }]; }
    const thinA = parts.filter((r) => !gate && thin(r)).reduce((a, r) => a + r.w * r.d, 0), allA = parts.reduce((a, r) => a + r.w * r.d, 0);
    units.push({ e, P, o, gate, fill, parts, corridor: thinA > 0.6 * allA, size: area(P) });
  }
  const chosen = new Set(units.filter((u) => u.corridor || OWN[u.e.name]));
  const counted = () => [...chosen].filter((u) => !u.corridor).length;
  for (const n of KEEP) for (const u of units) if (u.e.name === n && counted() < COUNT) chosen.add(u);
  for (const u of units.filter((u) => !chosen.has(u)).sort((a, b) => b.size - a.size)) { if (counted() >= COUNT) break; chosen.add(u); }

  const own = [], halls = [], runs = [], blockers = [], yards = [], pending = [], placed = [];
  const solids = ownSolid ? [...chosen].filter((u) => OWN[u.e.name]).map((u) => ownSolid(u.e.name, u.o)).filter(Boolean) : [];
  // A corridor rectangle cut where it runs into an own model: the pieces outside.
  function outside(r) {
    if (!solids.length) return [r];
    const ew = r.w >= r.d, L = Math.max(r.w, r.d), S = Math.min(r.w, r.d), a = ew ? r.a : r.a + Math.PI / 2, cs = Math.cos(a), sn = Math.sin(a);
    const hit = (t) => [-S / 2, 0, S / 2].some((v) => solids.some((K) => inside(K, r.x + t * cs - v * sn, r.z + t * sn + v * cs)));
    const out = [], piece = (t0, t1) => { const m = (t0 + t1) / 2; return { ...r, x: r.x + cs * m, z: r.z + sn * m, w: ew ? t1 - t0 : r.w, d: ew ? r.d : t1 - t0 }; };
    let start = null;
    for (let t = -L / 2; t <= L / 2 + 1e-6; t += 0.1) {
      const free = !hit(t);
      if (free && start === null) start = t;
      if ((!free || t + 0.1 > L / 2 + 1e-6) && start !== null) { const end = free ? L / 2 : t - 0.1; if (end - start >= 0.8) out.push(start <= -L / 2 + 1e-6 && end >= L / 2 - 1e-6 ? r : piece(start, end)); start = null; }
    }
    return out;
  }
  // A corridor rectangle -> a run along its middle line, and its blocker.
  function addRun(r0) {
    for (const r of outside(r0)) addRunPiece(r);
  }
  function addRunPiece(r) {
    const s = Math.min(r.w, r.d), L = Math.max(r.w, r.d);
    const along = r.w >= r.d ? r.a : r.a + Math.PI / 2, cs = Math.cos(along), sn = Math.sin(along);
    const x0 = r.x - (cs * L) / 2, z0 = r.z - (sn * L) / 2, x1 = r.x + (cs * L) / 2, z1 = r.z + (sn * L) / 2;
    // inward: towards the middle of its building (the yard); (x0,z0)->(x1,z1) turned left is +1
    const side = Math.sign(-sn * (r.cx - r.x) + cs * (r.cz - r.z)) || 1;
    const D = s; // (the corridors are the yards' edges: kept at the 1/4 map's size, so the yards keep theirs)
    runs.push([r1(x0), r1(z0), r1(x1), r1(z1), side, r1(D)]);
    blockers.push({ p: rect(r.x, r.z, L, D, along) });
  }
  // The doors of a ring of corridors: a gap in each side across the ring's
  // middle line (south and north), and in the east and west sides too when
  // the ring is a wide one. Real rings have their gates about there; OSM draws
  // most of them as part of the corridor.
  function cutDoors(r, o) {
    const cs = Math.cos(o.a), sn = Math.sin(o.a);
    const ru = (r.x - o.x) * cs + (r.z - o.z) * sn, rv = -(r.x - o.x) * sn + (r.z - o.z) * cs; // the rectangle's middle in the ring's axes
    const ew = r.w >= r.d; // runs across (east-west) or along (north-south)
    const L = Math.max(r.w, r.d);
    const across = ew ? Math.abs(rv) > o.d * 0.3 : Math.abs(ru) > o.w * 0.3 && o.d > 9;
    const at = ew ? -ru : -rv; // where the ring's middle line crosses the run, from the run's middle
    if (!across || Math.abs(at) > L / 2 - DOOR / 2 - 0.6) return [r];
    const lo = -L / 2, hi = L / 2, g0 = at - DOOR / 2, g1 = at + DOOR / 2, out = [];
    const piece = (a, b) => { const m = (a + b) / 2, ux = ew ? cs : -sn, uz = ew ? sn : cs; return { ...r, x: r.x + ux * m, z: r.z + uz * m, w: ew ? b - a : r.w, d: ew ? r.d : b - a }; };
    if (g0 - lo > 0.8) out.push(piece(lo, g0));
    if (hi - g1 > 0.8) out.push(piece(g1, hi));
    return out;
  }
  for (const u of units) {
    if (!chosen.has(u)) continue;
    const { e, o, gate, fill, parts } = u;
    if (OWN[e.name]) { own.push({ name: e.name, ...o }); continue; }
    const doors = u.corridor ? [] : null; // a ring of corridors gets a door in its south and north sides, on its middle line
    for (const r of parts) {
      if (!gate && thin(r) && doors) { // (a corridor of a ring: cut later)
        doors.push(r);
        continue;
      }
      if (!gate && thin(r)) { addRun(r); continue; } // a corridor: a run along its middle line
      // a hall (or a gate): placed below, once every corridor is down
      pending.push({ r, gate, e, han: r === parts[0] ? BOARDS[e.name] : undefined, rank: KEEP.indexOf(e.name) });
    }
    if (doors) for (const r of doors) for (const piece of cutDoors(r, o)) addRun(piece);
    if (fill < 0.5 && u.corridor) yards.push({ x: o.x, z: o.z, w: o.w, d: o.d, a: o.a }); // a ring of corridors: its yard is paved
  }
  // The halls and gates: their footprints at FOOT (50%), its front to the
  // south. The corridors stay at the 1/4 map (they are the yards' edges), so a
  // hall at 50% can be wider than its yard: then it is drawn as big as fits,
  // with WALK metres free round it to the corridors and the halls already
  // down (the middle line first), and never under the old 30% (FOOT_MIN).
  const sides = []; // (each hall's final size, for the log)
  const corridorP = blockers.map((b) => b.p); // the corridors
  {
    const fixed = corridorP.concat(keepClear, solids), exact = []; // (exact: each hall's own rectangle and its OSM building)
    const order = pending.slice().sort((p, q) => (p.rank < 0) - (q.rank < 0) || p.rank - q.rank || q.r.w * q.r.d - p.r.w * p.r.d);
    for (const { r: r0, gate, e, han } of order) {
      // A gate is walked through across its short side (three bays wide, two
      // deep). One mapped longer front to back stands in a wall or a corridor
      // that runs north-south: it is turned a quarter, to open east-west.
      const r = gate && r0.d > r0.w * 1.15 ? { ...r0, w: r0.d, d: r0.w, a: r0.a + Math.PI / 2 } : r0;
      const a = r.a;
      let f = FOOT;
      const hits = (k) => { const P = rect(r.x, r.z, r.w * k + 0.7 + 2 * WALK, r.d * k + 0.7 + 2 * WALK, a); return fixed.concat(placed).some((K) => sat(P, K)) || P.some(([x, z]) => !inside(OUTLINE, x, z)); };
      while (f > FOOT_MIN + 1e-6 && hits(f)) f = Math.max(FOOT_MIN, f - 0.05);
      const H = { x: r.x, z: r.z, w: r.w * f, d: r.d * f, ry: -a, kind: gate ? 'g' : NO_RIDGE.has(e.name) ? 'n' : 'h', han, name: e.name };
      if (dedupe && exact.some(([K, id]) => id !== e.id && inside(K, H.x, H.z))) { console.log('  dropped (inside a hall already down):', e.name || '-', r1(H.x), r1(H.z)); continue; }
      // Still in an own model at the smallest size: cut back from it, keeping the bigger part.
      let gone = false;
      for (const K of solids) {
        if (!sat(rect(H.x, H.z, H.w, H.d, a), K)) continue;
        const cs = Math.cos(a), sn = Math.sin(a), pu = K.map(([x, z]) => (x - H.x) * cs + (z - H.z) * sn), pv = K.map(([x, z]) => -(x - H.x) * sn + (z - H.z) * cs), G = 0.15;
        const cuts = [[Math.max(...pu) + G, H.w / 2, -H.d / 2, H.d / 2], [-H.w / 2, Math.min(...pu) - G, -H.d / 2, H.d / 2], [-H.w / 2, H.w / 2, Math.max(...pv) + G, H.d / 2], [-H.w / 2, H.w / 2, -H.d / 2, Math.min(...pv) - G]]
          .map(([u0, u1, v0, v1]) => [Math.max(u0, -H.w / 2), Math.min(u1, H.w / 2), Math.max(v0, -H.d / 2), Math.min(v1, H.d / 2)]).filter(([u0, u1, v0, v1]) => u1 - u0 >= 1.2 && v1 - v0 >= 1.2)
          .sort((p, q) => (q[1] - q[0]) * (q[3] - q[2]) - (p[1] - p[0]) * (p[3] - p[2]));
        if (!cuts.length) { gone = true; break; }
        const [u0, u1, v0, v1] = cuts[0], u = (u0 + u1) / 2, v = (v0 + v1) / 2;
        console.log('  cut back from an own model:', e.name || '-', r1(H.x), r1(H.z), `${r1(H.w)}x${r1(H.d)} -> ${r1(u1 - u0)}x${r1(v1 - v0)}`);
        H.x += u * cs - v * sn; H.z += u * sn + v * cs; H.w = u1 - u0; H.d = v1 - v0;
      }
      if (gone) { console.log('  dropped (inside an own model):', e.name || '-', r1(H.x), r1(H.z)); continue; }
      halls.push(H);
      exact.push([rect(H.x, H.z, H.w, H.d, a), e.id]);
      sides.push([e.name || '-', Math.round(f * 25)]);
      placed.push(rect(H.x, H.z, H.w + 0.7, H.d + 0.7, a));
      if (gate) { // posts at the two ends; the middle is open
        const cs = Math.cos(a), sn = Math.sin(a), mid = gateMid(H.w), q = gateBays && mid < H.w ? (H.w - mid) / 2 : Math.min(0.5, H.w * 0.15);
        for (const s2 of [-1, 1]) blockers.push({ p: rect(H.x + s2 * cs * (H.w / 2 - q / 2), H.z + s2 * sn * (H.w / 2 - q / 2), q, H.d, a) });
      } else blockers.push({ p: rect(H.x, H.z, H.w + 0.7, H.d + 0.7, a) });
    }
  }
  console.log('buildings', counted(), 'of', units.filter((u) => !u.corridor).length, '; corridor rings', units.filter((u) => u.corridor).length);

  // ---------- The left-out buildings: a few plain blocks ----------
  // Where a real building was left out, a plain block stands instead: walls
  // and a big tiled roof, no posts, doors or brackets (Yozi, 2026-11-09: "a
  // few big roofs, not every detail"). Neighbours that line up (same angle,
  // under BLOCK_GAP apart) share one block, when their joined box is mostly
  // building; else each keeps its own. Nothing is put where it would touch a
  // hall, a corridor or a pond kept above.
  const blocks = [];
  {
    const kept = blockers.map((b) => b.p).concat(solids);
    const free = (r) => { // (r: {x, z, w, d, a}, with its walk-round margin)
      const P = rect(r.x, r.z, r.w + 0.7, r.d + 0.7, r.a);
      if (kept.some((K) => sat(P, K))) return false;
      const cs = Math.cos(r.a), sn = Math.sin(r.a);
      for (let u = -r.w / 2; u <= r.w / 2 + 1e-6; u += Math.max(0.5, r.w / 6)) for (let v = -r.d / 2; v <= r.d / 2 + 1e-6; v += Math.max(0.5, r.d / 6)) {
        const x = r.x + u * cs - v * sn, z = r.z + u * sn + v * cs;
        if (!inPalace(x, z) || ponds.some((W) => inside(W, x, z))) return false;
      }
      return true;
    };
    const pieces = [];
    for (const u of units) {
      if (chosen.has(u) || u.corridor || u.gate) continue;
      if (skipBlock(u)) continue;
      for (const r of u.parts) pieces.push({ x: r.x, z: r.z, w: r.w * FOOT, d: r.d * FOOT, a: r.a, name: u.e.name, A: r.w * r.d * FOOT * FOOT });
    }
    // Join neighbours that line up.
    const up = pieces.map((_, i) => i), find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
    const turn = (a, b) => { const d = Math.abs(a - b) % (Math.PI / 2); return Math.min(d, Math.PI / 2 - d); };
    for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
      const p = pieces[i], q = pieces[j];
      if (turn(p.a, q.a) > (6 * Math.PI) / 180) continue;
      if (sat(rect(p.x, p.z, p.w + BLOCK_GAP, p.d + BLOCK_GAP, p.a), rect(q.x, q.z, q.w, q.d, q.a))) up[find(i)] = find(j);
    }
    const groups = new Map();
    pieces.forEach((p, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
    const boxOf = (ps) => { // the box round some pieces, in the biggest one's axes
      const a = ps.reduce((m, p) => (p.A > m.A ? p : m)).a, cs = Math.cos(a), sn = Math.sin(a);
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (const p of ps) for (const [x, z] of rect(p.x, p.z, p.w, p.d, p.a)) { const u = x * cs + z * sn, v = -x * sn + z * cs; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      const u = (u0 + u1) / 2, v = (v0 + v1) / 2;
      return { x: u * cs - v * sn, z: u * sn + v * cs, w: u1 - u0, d: v1 - v0, a, fill: ps.reduce((s, p) => s + p.A, 0) / ((u1 - u0) * (v1 - v0)), n: ps.length };
    };
    const place = (r) => { blocks.push(r); kept.push(rect(r.x, r.z, r.w + 0.7, r.d + 0.7, r.a)); };
    for (const ps of [...groups.values()].sort((a, b) => b.reduce((s, p) => s + p.A, 0) - a.reduce((s, p) => s + p.A, 0))) {
      const b = boxOf(ps);
      if (ps.length > 1 && b.fill >= 0.55 && free(b)) { place(b); continue; }
      for (const p of ps) { // one by one, at FOOT or else at the 1/4 map's size
        const q = { ...p, n: 1 };
        if (free(q)) place(q);
        else { const s = { ...q, w: q.w / FOOT, d: q.d / FOOT }; if (Math.min(s.w, s.d) >= 1.5 && free(s)) place(s); }
      }
    }
    for (const r of blocks) {
      const H = { x: r.x, z: r.z, w: r.w, d: r.d, ry: -r.a, kind: 'r', name: '' };
      halls.push(H);
      blockers.push({ p: rect(r.x, r.z, r.w + 0.7, r.d + 0.7, r.a) });
    }
    if (process.env.DEBUG_BLOCKS) for (const p of pieces) if (!blocks.some((b) => Math.hypot(b.x - p.x, b.z - p.z) < Math.max(b.w, b.d))) console.log('  not placed', p.name, r1(p.x), r1(p.z), r1(p.w), r1(p.d));
    console.log('left-out buildings', pieces.length, 'pieces ->', blocks.length, 'plain blocks (', blocks.filter((b) => b.n > 1).length, 'joined )');
  }
  return { units, own, halls, runs, blockers, yards, sides, corridorP, blocks };
}

// The throne hall's terraces as blockers: thin walls along their edges, open
// only at the front steps, so you go up by the steps and cannot step off (or
// on) through a railing. (x, z): the "throne" landmark; a: the hall's angle;
// hs, ts: its l.hs and l.sc[0]. The heights: core/temple-terrace.js.
export function terraceEdges({ x, z, a, hs, ts }) {
  const { T1, T2, zT, sw } = throneTerraces(hs), cs = Math.cos(a), sn = Math.sin(a), t = 0.3, out = [];
  const at = (u, v, w, d) => out.push({ p: rect(x + (u * cs - v * sn) * ts, z + (u * sn + v * cs) * ts, Math.max(t, w * ts), Math.max(t, d * ts), a) });
  for (const [T, v0] of [[T1, 0], [T2, zT]]) {
    at(0, v0 - T.d / 2, T.w, 0); // the back
    for (const s of [-1, 1]) at((s * T.w) / 2, v0, 0, T.d); // the sides
    for (const s of [-1, 1]) at((s * (sw + T.w / 2)) / 2, v0 + T.d / 2, T.w / 2 - sw, 0); // the front, either side of the steps
  }
  return out;
}
