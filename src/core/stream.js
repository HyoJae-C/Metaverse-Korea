// A sunken city stream you can walk down to (e.g. Cheonggyecheon): a stone
// channel below the street with a walkway on both banks, water in the middle,
// stepping stones, bridges overhead and stairs down from the sidewalk.
//
// Map data ("streams" in a district map, local metres; the district offset
// moves `at`). The channel runs east (+x) from `at` (its west end, centre
// line) for `len` metres, or, with a `path`, along that centre line instead
// (corners as [dx, dz] from `at`, the first [0, 0]; `len` is its length):
//   { "id": "cheonggyecheon", "at": [120, 409], "len": 330, "w": 24,
//     "water": 8, "depth": 4, "name": { "ko": "청계천", "en": "…" },
//     "falls": true,                                  // waterfall at the west end
//     "bridges": [{ "u": 80, "w": 8, "style": "arch" }], // u: metres from the west end
//     "stairs": [{ "u": 4, "side": -1, "dir": 1 }],   // side -1 north bank, 1 south; dir: way down (±x)
//     "stones": [{ "u": 125 }],                       // stepping stones across the water
//     "path": [[0, 0], [120, 8], [330, -20]],         // optional: a bending stream
//     "heron": true,                                  // a grey heron (core/heron.js)
//     "lanterns": { … } }                             // the lantern festival (core/lanterns.js)
//
// The ground is flat and collision is 2D, so the stream has two layers.
// On the street the whole channel is a wall (only bridge decks cross it);
// down by the water the banks' walls are what you bump into. Each stair is a
// trench cut into the sidewalk next to the channel wall, open at its top end
// (the mouth) and into the channel at its bottom (the landing). Halfway down
// you switch from the street layer to the low one.
import * as THREE from 'three';
import { buildHeron } from './heron.js';
import { mergeStatic } from './merge-static.js';
import { buildLanternFestival, WishLanterns } from './lanterns.js';

export const STAIR = { w: 2.4, run: 9, landing: 3 };
const WALL = 0.3;


// ---------- the stream's frame ----------
// Everything is laid out along the channel in (u, v): u along the centre
// line from the west end, v across it (+ on the right going downstream:
// south for a stream running east). frameOf(s) maps that onto the ground.
// A straight stream is just shifted by `at`. A bending one is drawn stretch
// by stretch: neighbouring stretches meet on the line that halves the corner
// (mitred, like a picture frame), and points along a stretch are spread
// evenly between its two mitres, so the map is exact on the centre line,
// has no seams, and a box in (u, v) stays a box (sheared a hair at corners).
const EPS = 1e-6;
const frames = new WeakMap();
export function frameOf(s) {
  const key = s.at[0] + ',' + s.at[1];
  const hit = frames.get(s);
  if (hit?.key === key) return hit;
  const pts = (s.path || [[0, 0], [s.len, 0]]).map(([x, z]) => [s.at[0] + x, s.at[1] + z]);
  const segs = [];
  let s0 = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < EPS) continue;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    segs.push({ a, d, n: [-d[1], d[0]], s0, L, ang: Math.atan2(d[1], d[0]), k0: 0, k1: 0 });
    s0 += L;
  }
  for (let i = 0; i + 1 < segs.length; i++) { // the mitre: how far along each side's end moves per metre across
    const p = segs[i].d, q = segs[i + 1].d;
    const t = Math.tan(Math.atan2(p[0] * q[1] - p[1] * q[0], p[0] * q[0] + p[1] * q[1]) / 2);
    segs[i].k1 = -t;
    segs[i + 1].k0 = t;
  }
  const last = segs.length - 1;
  const segAt = (u) => { let i = 0; while (i < last && u > segs[i].s0 + segs[i].L) i++; return segs[i]; };
  const f = {
    key, segs, bent: segs.length > 1,
    joints: segs.slice(1).map((S) => S.s0),
    segAt,
    angAt: (u) => segAt(u).ang,
    toWorld(u, v) {
      const S = segAt(u), tau = v * S.k0 + (u - S.s0) * (1 + v * (S.k1 - S.k0) / S.L);
      return [S.a[0] + S.d[0] * tau + S.n[0] * v, S.a[1] + S.d[1] * tau + S.n[1] * v];
    },
    // (u, v) of a point on the ground: the stretch it falls in nearest the line.
    toStream(x, z) {
      let best = null;
      for (let i = 0; i <= last; i++) {
        const S = segs[i], rx = x - S.a[0], rz = z - S.a[1];
        const v = rx * S.n[0] + rz * S.n[1], tau = rx * S.d[0] + rz * S.d[1];
        if (i > 0 && tau < v * S.k0 - EPS) continue;
        if (i < last && tau > S.L + v * S.k1 + EPS) continue;
        if (best && Math.abs(best[1]) <= Math.abs(v)) continue;
        best = [S.s0 + (tau - v * S.k0) / (1 + v * (S.k1 - S.k0) / S.L), v];
      }
      return best || [-Infinity, Infinity];
    },
    // A rectangle in (u, v) on the ground: one quad per stretch it crosses.
    quads(u0, u1, v0, v1) {
      const a = Math.min(u0, u1), b = Math.max(u0, u1), lo = Math.min(v0, v1), hi = Math.max(v0, v1);
      const cuts = [a, ...f.joints.filter((j) => j > a + EPS && j < b - EPS), b];
      const out = [];
      for (let i = 0; i + 1 < cuts.length; i++) out.push([f.toWorld(cuts[i], lo), f.toWorld(cuts[i + 1], lo), f.toWorld(cuts[i + 1], hi), f.toWorld(cuts[i], hi)]);
      return out;
    },
  };
  frames.set(s, f);
  return f;
}
// (u, v) of a point for stream s (main.js: the lantern festival).
export const streamUV = (s, x, z) => frameOf(s).toStream(x, z);

// A stair's lane in the stream's frame: u from the mouth to the far end,
// v from the channel wall outwards.
function lane(s, st) {
  const u0 = st.u, u1 = st.u + st.dir * (STAIR.run + STAIR.landing);
  const v0 = st.side * (s.w / 2), v1 = st.side * (s.w / 2 + STAIR.w);
  return { u0, u1, v0, v1, uLand: st.u + st.dir * STAIR.run };
}

// u ranges along the channel that something covers, sorted.
const cut = (len, gaps) => {
  const out = [];
  let a = 0;
  for (const [g0, g1] of gaps.map(([x, y]) => [Math.min(x, y), Math.max(x, y)]).sort((p, q) => p[0] - q[0])) {
    if (g0 > a) out.push([a, g0]);
    a = Math.max(a, g1);
  }
  if (a < len) out.push([a, len]);
  return out;
};

// The street layer's walls: the channel between bridges, and each stair's
// outer wall and far end.
const walls = (F, u0, u1, v0, v1) => F.quads(u0, u1, v0, v1).map((p) => ({ p }));
export function streetBlockers(s) {
  const F = frameOf(s), hw = s.w / 2;
  const out = cut(s.len, (s.bridges || []).map((b) => [b.u - b.w / 2, b.u + b.w / 2])).flatMap(([a, b]) => walls(F, a, b, -hw, hw));
  for (const st of s.stairs || []) out.push(...laneWalls(s, st));
  return out;
}
function laneWalls(s, st) {
  const F = frameOf(s), L = lane(s, st), out = st.side;
  return [
    ...walls(F, L.u0, L.u1 + st.dir * WALL, L.v1, L.v1 + out * WALL), // outer wall
    ...walls(F, L.u1, L.u1 + st.dir * WALL, L.v0, L.v1), // far end
  ];
}

// The low layer's walls: both banks (open at each landing), the two ends,
// the water (but for the stepping stones) and the stairs' walls.
export function lowBlockers(s) {
  const F = frameOf(s), hw = s.w / 2, out = [];
  for (const side of [-1, 1]) {
    const gaps = (s.stairs || []).filter((st) => st.side === side).map((st) => { const L = lane(s, st); return [L.uLand, L.u1]; });
    for (const [a, b] of cut(s.len, gaps)) out.push(...walls(F, a, b, side * hw, side * (hw - WALL)));
  }
  out.push(...walls(F, -WALL, 0, -hw, hw), ...walls(F, s.len, s.len + WALL, -hw, hw));
  const ww = (s.water || 8) / 2;
  for (const [a, b] of cut(s.len, (s.stones || []).map((t) => [t.u - 0.9, t.u + 0.9]))) out.push(...walls(F, a, b, -ww, ww));
  for (const st of s.stairs || []) out.push(...laneWalls(s, st));
  return out;
}

// The hole in the ground: the channel and its stairs as one outline (the
// channel with a notch out for each stair). Separate holes that touch or
// overlap break the ground's triangulation and leave the channel covered.
export function holesOf(s) {
  const F = frameOf(s), hw = s.w / 2, uv = [];
  const span = (side) => (s.stairs || []).filter((st) => st.side === side).map((st) => { const L = lane(s, st); return [Math.min(L.u0, L.u1), Math.max(L.u0, L.u1)]; }).sort((p, q) => p[0] - q[0]);
  uv.push([0, -hw]);
  for (const [a, b] of span(-1)) uv.push([a, -hw], [a, -hw - STAIR.w], [b, -hw - STAIR.w], [b, -hw]);
  uv.push([s.len, -hw], [s.len, hw]);
  for (const [a, b] of span(1).reverse()) uv.push([b, hw], [b, hw + STAIR.w], [a, hw + STAIR.w], [a, hw]);
  uv.push([0, hw]);
  // Drop repeated points (a stair that starts right at the west end), and
  // put a point on each corner of a bending stream along the banks.
  const out = [];
  uv.forEach((p, i) => {
    const q = uv[i - 1];
    if (q && p[0] === q[0] && p[1] === q[1]) return;
    if (q && p[1] === q[1]) for (const j of (p[0] > q[0] ? F.joints : [...F.joints].reverse())) if ((j - q[0]) * (p[0] - j) > 0) out.push(F.toWorld(j, p[1]));
    out.push(F.toWorld(p[0], p[1]));
  });
  return [out];
}

// Places to sit on the stone edge of the water, your legs out over it, as
// people do on the real Cheonggyecheon: every 1.5 m along both banks, but not
// under a bridge, by the stepping stones or at the falls. Seats as main.js
// uses them ({ x, z, ry, stand }), plus y (how low the body sits, so the hips
// rest on the edge) and standY. `edge: true` tells them from park benches.
export const EDGE_SEAT = { every: 1.5, sink: 0.22 };
export function edgeSeats(streams) {
  const out = [];
  for (const s of streams) {
    const ww = (s.water || 8) / 2, D = s.depth || 4, F = frameOf(s);
    const clear = (u) => u > 3 && u < s.len - 1
      && !(s.bridges || []).some((b) => Math.abs(u - b.u) < b.w / 2 + 0.8)
      && !(s.stones || []).some((st) => Math.abs(u - st.u) < 1.6);
    for (let u = EDGE_SEAT.every; u < s.len; u += EDGE_SEAT.every) {
      if (!clear(u)) continue;
      for (const sd of [-1, 1]) {
        const [x, z] = F.toWorld(u, sd * (ww + 0.18));
        out.push({ x, z, y: -D - EDGE_SEAT.sink, ry: (sd > 0 ? Math.PI : 0) - F.angAt(u), stand: F.toWorld(u, sd * (ww + 1)), standY: -D, street: true, edge: true });
      }
    }
  }
  return out;
}

// Where (x, z) is: on a stair (how far down), in the channel or on the
// street. `low` is whether you were down by the water a moment ago, which
// decides whether a spot under a bridge is on the deck or below it.
export function streamAt(streams, x, z, low) {
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i], hw = s.w / 2, D = s.depth || 4;
    const F = frameOf(s), [u, v] = F.bent ? F.toStream(x, z) : [x - s.at[0], z - s.at[1]];
    for (const st of s.stairs || []) {
      const L = lane(s, st);
      if (u < Math.min(L.u0, L.u1) || u > Math.max(L.u0, L.u1) || st.side * v < hw || st.side * v > hw + STAIR.w) continue;
      const frac = Math.min(1, Math.max(0, ((u - L.u0) * st.dir) / STAIR.run));
      return { i, y: -D * frac, low: frac > 0.5, stair: true };
    }
    if (u < 0 || u > s.len || Math.abs(v) > hw) continue;
    const onDeck = (s.bridges || []).some((b) => Math.abs(u - b.u) <= b.w / 2);
    if (onDeck && !low) return { i, y: 0, low: false };
    return { i, y: -D, low: true };
  }
  return null;
}

// ---------- 3D ----------
const mats = {};
const mat = (c, o = {}) => (mats[c + JSON.stringify(o)] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const C = { wall: '#aaa59b', wallDark: '#8f8a80', walk: '#cdc9c0', edge: '#9d988d', bed: '#56717c', water: '#6fb7d6', foam: '#eef8fb', step: '#c9c0b0', rail: '#5d6470', granite: '#c7c1b6', grass: '#8fc27a' };

export function buildStreams(streams, scene) {
  const root = new THREE.Group();
  root.name = 'streams';
  const ticks = [];
  for (const s of streams) {
    const g = new THREE.Group();
    const F = frameOf(s);
    if (!F.bent) g.position.set(s.at[0], 0, s.at[1]); // a bending one is built in (u, v) and bent onto the ground
    ticks.push(buildOne(g, s, F.bent ? F : null));
    if (g.userData.wish && !root.userData.wish) root.userData.wish = g.userData.wish; // core/lanterns.js
    root.add(g);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  scene.add(root);
  root.userData.tick = (t) => { for (const f of ticks) f?.(t); };
  return root;
}

function buildOne(g, s, F) {
  const { len, w } = s, hw = w / 2, D = s.depth || 4, ww = (s.water || 8) / 2;
  // Boxes are given by their u (x), y and v (z) ranges. On a bending stream
  // a long one is cut at each corner, so that it bends there.
  const box = (u0, u1, y0, y1, v0, v1, c, o) => {
    const a = Math.min(u0, u1), b = Math.max(u0, u1);
    const cuts = F ? F.joints.filter((j) => j > a + 0.01 && j < b - 0.01) : [];
    const ends = [a, ...cuts, b];
    let m;
    for (let i = 0; i + 1 < ends.length; i++) {
      m = new THREE.Mesh(new THREE.BoxGeometry(ends[i + 1] - ends[i], Math.abs(y1 - y0), Math.abs(v1 - v0)), typeof c === 'string' ? mat(c, o) : c);
      m.position.set((ends[i] + ends[i + 1]) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
      g.add(m);
    }
    return m;
  };
  // Walkways on both banks, a grass strip at the foot of each wall, the
  // stone edge down to the water, the stream bed and the water.
  for (const sd of [-1, 1]) {
    box(0, len, -D - 0.3, -D, sd * ww, sd * hw, C.walk);
    box(0, len, -D, -D + 0.04, sd * (hw - 1.3), sd * (hw - WALL), C.grass);
    box(0, len, -D - 0.6, -D + 0.02, sd * ww, sd * (ww + 0.35), C.edge);
  }
  box(0, len, -D - 0.8, -D - 0.6, -ww, ww, C.bed);
  const water = box(0, len, -D - 0.32, -D - 0.3, -ww, ww, mat(C.water, { transparent: true, opacity: 0.85 }));
  water.userData.noShadow = true;
  // Ripples: pale streaks drifting downstream (east).
  const streaks = [];
  for (let k = 0; k < Math.floor(len / 6); k++) {
    const m = box(-0.8, 0.8, -D - 0.29, -D - 0.285, -0.06, 0.06, mat('#d8f0f8', { transparent: true, opacity: 0.7 }));
    m.userData.noShadow = true;
    m.userData.mover = true;
    m.position.z = ((k * 37) % 13) / 13 * (ww * 2 - 1) - ww + 0.5;
    streaks.push({ m, v: m.position.z, u: (k * 6 + (k * 17) % 5) % len, sp: 0.6 + ((k * 7) % 5) / 10 });
  }
  // Clumps of reeds and water plants along the edges of the water.
  const spots = [];
  for (let u = 5; u < len - 3; u += 4.5) {
    if ((s.stones || []).some((t) => Math.abs(u - t.u) < 3) || (s.bridges || []).some((b) => Math.abs(u - b.u) < b.w / 2 + 1)) continue;
    const k = Math.round(u * 7) % 5;
    if (k === 1) continue;
    spots.push([u, (k % 2 ? 1 : -1) * (ww - 0.5 - (k % 3) * 0.25)]);
  }
  if (spots.length) {
    const reed = new THREE.ConeGeometry(0.22, 1.1, 4).translate(0, 0.55, 0);
    const reeds = new THREE.InstancedMesh(reed, mat('#6fa85a', { flatShading: true }), spots.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let n = 0;
    for (const [u, v] of spots) {
      for (let j = 0; j < 3; j++) {
        const sz = 0.7 + ((n * 13) % 7) / 15;
        m4.compose(p.set(u + (j - 1) * 0.35, -D - 0.32, v + ((j * 5) % 3 - 1) * 0.15), q.setFromAxisAngle(up, n), sc.set(sz, sz * (0.8 + (j % 2) * 0.5), sz));
        reeds.setMatrixAt(n++, m4);
      }
    }
    g.add(reeds);
  }
  // Stepping stones (징검다리).
  for (const t of s.stones || []) {
    for (let v = -ww + 0.5; v <= ww - 0.4; v += 1.1) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.75, 8), mat(C.granite, { flatShading: true }));
      st.position.set(t.u + Math.sin(v * 3) * 0.1, -D - 0.32, v);
      st.rotation.y = v;
      g.add(st);
    }
  }
  // The banks' walls, with railings on top, open where a stair lands, and
  // stepping down beside each stair.
  const stairs = (s.stairs || []).map((st) => ({ st, L: lane(s, st) }));
  const decks = (s.bridges || []).map((b) => [b.u - b.w / 2, b.u + b.w / 2]);
  for (const sd of [-1, 1]) {
    const mine = stairs.filter((q) => q.st.side === sd);
    for (const [a, b] of cut(len, mine.map(({ L }) => [L.u0, L.u1]))) {
      box(a, b, -D, 0, sd * (hw - WALL), sd * hw, C.wall);
      box(a, b, -D, -D + 0.5, sd * (hw - WALL - 0.02), sd * (hw - WALL - 0.05), C.wallDark); // a darker foot
      for (const [r0, r1] of cut(len, decks).filter(([r0, r1]) => r1 > a && r0 < b)) railing(Math.max(a, r0), Math.min(b, r1), sd * (hw - 0.15));
    }
    // Beside a stair: a parapet that follows the steps down; open at the landing.
    for (const { st, L } of mine) {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const ua = L.u0 + st.dir * (STAIR.run * k) / n, ub = L.u0 + st.dir * (STAIR.run * (k + 1)) / n;
        const top = -D * (k + 1) / n + 1;
        box(ua, ub, -D, Math.min(0.9, top), sd * (hw - WALL), sd * hw, C.wall);
      }
    }
  }
  function railAcross(u, v0, v1) {
    const a = Math.min(v0, v1), b = Math.max(v0, v1);
    box(u - 0.04, u + 0.04, 1.0, 1.06, a, b, C.rail);
    for (let v = a; v <= b + 0.01; v += 2.4) box(u - 0.04, u + 0.04, 0, 1.05, v - 0.04, v + 0.04, C.rail);
  }
  function railing(a, b, v) {
    if (b - a < 0.5) return;
    box(a, b, 1.0, 1.06, v - 0.04, v + 0.04, C.rail);
    box(a, b, 0.5, 0.54, v - 0.03, v + 0.03, C.rail);
    for (let u = a; u <= b + 0.01; u += 2.5) box(u - 0.04, u + 0.04, 0, 1.05, v - 0.04, v + 0.04, C.rail);
  }
  // Stairs: steps, landing, the outer wall (with a railing at street level)
  // and the far end.
  for (const { st, L } of stairs) {
    const n = 20, run = STAIR.run / n, rise = D / n;
    for (let k = 0; k < n; k++) {
      const ua = L.u0 + st.dir * run * k, ub = ua + st.dir * run;
      box(ua, ub, -(k + 1) * rise - 0.3, -(k + 1) * rise, L.v0, L.v1, C.step);
      box(ua, ua + st.dir * 0.06, -(k + 1) * rise, -(k + 1) * rise + 0.01, L.v0, L.v1, C.edge); // step edge
    }
    box(L.uLand, L.u1, -D - 0.3, -D, L.v0, L.v1, C.walk);
    box(L.u0, L.u1 + st.dir * WALL, -D, 0, L.v1, L.v1 + st.side * WALL, C.wall);
    box(L.u1, L.u1 + st.dir * WALL, -D, 0, L.v0, L.v1, C.wall);
    railing(Math.min(L.u0, L.u1), Math.max(L.u0, L.u1), L.v1 + st.side * 0.15);
    railAcross(L.u1 + st.dir * 0.15, L.v0, L.v1); // and across the far end
    // A handrail down the wall side.
    const rl = Math.hypot(STAIR.run, D);
    const hr = new THREE.Mesh(new THREE.BoxGeometry(rl, 0.06, 0.06), mat(C.rail));
    hr.position.set(L.u0 + st.dir * STAIR.run / 2, -D / 2 + 0.9, L.v1 - st.side * 0.15);
    hr.rotation.z = -st.dir * Math.atan2(D, STAIR.run);
    g.add(hr);
  }
  // The west end: a wall with a two-step waterfall into a small pool.
  box(-WALL, 0, -D, 0, -hw, hw, C.wall);
  railAcross(-0.15, -hw, hw);
  let fallTex = null;
  if (s.falls !== false) {
    const fw = Math.min(ww * 2, 6);
    box(0, 1.4, -D / 2 - 0.2, -D / 2, -fw / 2 - 0.4, fw / 2 + 0.4, C.wallDark); // the ledge halfway down
    // Falling water: white and pale blue streaks that slide down.
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const x = cv.getContext('2d');
    x.fillStyle = '#bfe6f5'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 26; i++) {
      x.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(120,190,220,0.6)';
      x.fillRect((i * 23) % 64, (i * 41) % 64, 2 + (i % 3), 14 + (i * 7) % 20);
    }
    fallTex = new THREE.CanvasTexture(cv);
    fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
    fallTex.repeat.set(fw / 1.5, 1.2);
    fallTex.colorSpace = THREE.SRGBColorSpace;
    const fallMat = new THREE.MeshLambertMaterial({ map: fallTex, transparent: true, opacity: 0.9 });
    for (const [y0, y1, u] of [[-D / 2, 0, 0.02], [-D - 0.3, -D / 2, 1.42]]) box(u, u + 0.05, y0, y1, -fw / 2, fw / 2, fallMat).userData.noShadow = true;
    for (const u of [1.6, 2.8]) box(u - 0.6, u + 0.6, -D - 0.3, -D - 0.24, -fw / 2, fw / 2, mat(C.foam, { transparent: true, opacity: 0.8 })).userData.noShadow = true;
  }
  box(len, len + WALL, -D, 0, -hw, hw, C.wall); // east end (the stream goes on in real life)
  // Bridges overhead.
  for (const b of s.bridges || []) bridge(g, s, b, D);
  // Walls, railing posts, steps, stones and bridges never move: one mesh per
  // colour (core/merge-static.js). Hundreds of draw calls became a handful.
  mergeStatic(g);
  const heron = s.heron ? buildHeron(g, s, F) : null; // a grey heron fishing in the water (core/heron.js)
  // The lantern festival and the wish lanterns (core/lanterns.js).
  const fest = s.lanterns ? buildLanternFestival(g, s) : null;
  if (s.lanterns) g.userData.wish = new WishLanterns(g, s, F);
  if (F) bend(g, F);
  return (t) => {
    heron?.();
    fest?.tick(t);
    g.userData.wish?.tick(Date.now() / 1000);
    for (const q of streaks) {
      const u = (q.u + t * q.sp * 2) % len;
      if (!F) { q.m.position.x = u; continue; }
      const [x, z] = F.toWorld(u, q.v);
      q.m.position.x = x; q.m.position.z = z;
      q.m.rotation.y = -F.angAt(u);
    }
    if (fallTex) fallTex.offset.y = (t * 1.6) % 1;
  };
}

// Bend a stream built straight (in u, y, v) onto its path: every mesh that
// stays put has its points moved onto the ground (frameOf), and each copy in
// an instanced mesh is moved and turned with the stretch it stands in.
// Things that move (`userData.mover`) place themselves each frame instead.
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _r = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
function bend(g, F) {
  g.updateMatrixWorld(true);
  const toG = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const list = [];
  const walk = (o) => {
    if (o.userData.mover) return;
    if (o.isMesh) list.push(o);
    for (const c of o.children) walk(c);
  };
  walk(g);
  for (const m of list) {
    const full = new THREE.Matrix4().multiplyMatrices(toG, m.matrixWorld); // mesh → stream (u, y, v)
    if (m.isInstancedMesh) {
      for (let i = 0; i < m.count; i++) {
        m.getMatrixAt(i, _m);
        _m.premultiply(full);
        _p.setFromMatrixPosition(_m);
        const [x, z] = F.toWorld(_p.x, _p.z);
        _r.makeRotationAxis(_up, -F.angAt(_p.x));
        _m.setPosition(0, 0, 0).premultiply(_r).setPosition(x, _p.y, z);
        m.setMatrixAt(i, _m);
      }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere?.();
      m.computeBoundingBox?.();
    } else {
      const geo = m.geometry.clone().applyMatrix4(full);
      const pos = geo.attributes.position, nor = geo.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getZ(i), a = -F.angAt(u), c = Math.cos(a), sn = Math.sin(a);
        const [x, z] = F.toWorld(u, v);
        pos.setXYZ(i, x, pos.getY(i), z);
        if (nor) { const nx = nor.getX(i), nz = nor.getZ(i); nor.setXYZ(i, nx * c + nz * sn, nor.getY(i), -nx * sn + nz * c); }
      }
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      m.geometry = geo;
    }
    // Undo the mesh's own place: its points (or copies) are now in g's frame.
    _m.copy(m.matrix).multiply(full.invert());
    _m.decompose(m.position, m.quaternion, m.scale);
    m.updateMatrix();
  }
  g.updateMatrixWorld(true);
}

// A bridge across the channel at street level: "arch" (a stone arch, like
// the first bridges below the plaza) or "slab" (granite slabs on stone
// piers, like Gwangtonggyo).
function bridge(g, s, b, D) {
  const hw = s.w / 2, half = b.w / 2;
  const stone = mat(b.style === 'slab' ? C.granite : '#d9d2c4', { flatShading: true });
  if (b.style === 'slab') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.7, s.w + 1.2), stone);
    deck.position.set(b.u, -0.3, 0);
    g.add(deck);
    const ww = (s.water || 8) / 2;
    for (const v of [-ww + 1.2, 0, ww - 1.2]) {
      for (const du of [-half + 0.8, half - 0.8]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.9, D, 0.9), mat(C.granite, { flatShading: true }));
        pier.position.set(b.u + du, -D / 2 - 0.5, v);
        g.add(pier);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1, 0.5, 0.7), stone);
      beam.position.set(b.u, -0.9, v);
      g.add(beam);
    }
    // Low stone balustrade with posts.
    for (const du of [-half + 0.25, half - 0.25]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, s.w + 1.2), stone);
      rail.position.set(b.u + du, 0.3, 0);
      g.add(rail);
      for (let v = -hw; v <= hw + 0.01; v += 3) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.45), stone);
        post.position.set(b.u + du, 0.4, v);
        g.add(post);
      }
    }
    return;
  }
  // Arch: the deck and spandrels as one shape in (v, y), extruded along u.
  const shape = new THREE.Shape();
  const ext = hw + 0.6;
  shape.moveTo(-ext, 0.1);
  shape.lineTo(ext, 0.1);
  shape.lineTo(ext, -D - 0.3);
  shape.lineTo(hw - 0.3, -D - 0.3);
  const span = hw - 0.3, rise = D - 1.0 + 0.3;
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI;
    shape.lineTo(Math.cos(a) * span, -D - 0.3 + Math.sin(a) * rise);
  }
  shape.lineTo(-ext, -D - 0.3);
  shape.lineTo(-ext, 0.1);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: b.w, bevelEnabled: false });
  geo.rotateY(Math.PI / 2); // extrude along +x; shape x → -z
  const m = new THREE.Mesh(geo, stone);
  m.position.set(b.u - half, 0, 0);
  g.add(m);
  // Railings on both edges of the deck.
  for (const du of [-half + 0.15, half - 0.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, s.w + 1.2), mat(C.rail));
    rail.position.set(b.u + du, 1.05, 0);
    g.add(rail);
    for (let v = -ext; v <= ext + 0.01; v += 2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), mat(C.rail));
      post.position.set(b.u + du, 0.6, v);
      g.add(post);
    }
  }
}
