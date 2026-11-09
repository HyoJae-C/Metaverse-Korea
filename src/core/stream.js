// A sunken city stream you can walk down to (e.g. Cheonggyecheon): a stone
// channel below the street with a walkway on both banks, water in the middle,
// stepping stones, bridges overhead and stairs down from the sidewalk.
//
// Map data ("streams" in a district map, local metres; the district offset
// moves `at`). The channel runs east (+x) from `at` (its west end, centre
// line) for `len` metres:
//   { "id": "cheonggyecheon", "at": [120, 409], "len": 330, "w": 24,
//     "water": 8, "depth": 4, "name": { "ko": "청계천", "en": "…" },
//     "falls": true,                                  // waterfall at the west end
//     "bridges": [{ "u": 80, "w": 8, "style": "arch" }], // u: metres from the west end
//     "stairs": [{ "u": 4, "side": -1, "dir": 1 }],   // side -1 north bank, 1 south; dir: way down (±x)
//     "stones": [{ "u": 125 }],                       // stepping stones across the water
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

const rect = (x0, z0, x1, z1) => [[Math.min(x0, x1), Math.min(z0, z1)], [Math.max(x0, x1), Math.min(z0, z1)], [Math.max(x0, x1), Math.max(z0, z1)], [Math.min(x0, x1), Math.max(z0, z1)]];

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
export function streetBlockers(s) {
  const [X, Z] = s.at, hw = s.w / 2;
  const out = cut(s.len, (s.bridges || []).map((b) => [b.u - b.w / 2, b.u + b.w / 2]))
    .map(([a, b]) => ({ p: rect(X + a, Z - hw, X + b, Z + hw) }));
  for (const st of s.stairs || []) out.push(...laneWalls(s, st));
  return out;
}
function laneWalls(s, st) {
  const [X, Z] = s.at, L = lane(s, st), out = st.side;
  return [
    { p: rect(X + L.u0, Z + L.v1, X + L.u1 + st.dir * WALL, Z + L.v1 + out * WALL) }, // outer wall
    { p: rect(X + L.u1, Z + L.v0, X + L.u1 + st.dir * WALL, Z + L.v1) }, // far end
  ];
}

// The low layer's walls: both banks (open at each landing), the two ends,
// the water (but for the stepping stones) and the stairs' walls.
export function lowBlockers(s) {
  const [X, Z] = s.at, hw = s.w / 2, out = [];
  for (const side of [-1, 1]) {
    const gaps = (s.stairs || []).filter((st) => st.side === side).map((st) => { const L = lane(s, st); return [L.uLand, L.u1]; });
    for (const [a, b] of cut(s.len, gaps)) out.push({ p: rect(X + a, Z + side * hw, X + b, Z + side * (hw - WALL)) });
  }
  out.push({ p: rect(X - WALL, Z - hw, X, Z + hw) }, { p: rect(X + s.len, Z - hw, X + s.len + WALL, Z + hw) });
  const ww = (s.water || 8) / 2;
  for (const [a, b] of cut(s.len, (s.stones || []).map((t) => [t.u - 0.9, t.u + 0.9]))) out.push({ p: rect(X + a, Z - ww, X + b, Z + ww) });
  for (const st of s.stairs || []) out.push(...laneWalls(s, st));
  return out;
}

// The hole in the ground: the channel and its stairs as one outline (the
// channel with a notch out for each stair). Separate holes that touch or
// overlap break the ground's triangulation and leave the channel covered.
export function holesOf(s) {
  const [X, Z] = s.at, hw = s.w / 2, pts = [];
  const span = (side) => (s.stairs || []).filter((st) => st.side === side).map((st) => { const L = lane(s, st); return [Math.min(L.u0, L.u1), Math.max(L.u0, L.u1)]; }).sort((p, q) => p[0] - q[0]);
  pts.push([X, Z - hw]);
  for (const [a, b] of span(-1)) pts.push([X + a, Z - hw], [X + a, Z - hw - STAIR.w], [X + b, Z - hw - STAIR.w], [X + b, Z - hw]);
  pts.push([X + s.len, Z - hw], [X + s.len, Z + hw]);
  for (const [a, b] of span(1).reverse()) pts.push([X + b, Z + hw], [X + b, Z + hw + STAIR.w], [X + a, Z + hw + STAIR.w], [X + a, Z + hw]);
  pts.push([X, Z + hw]);
  // Drop repeated points (a stair that starts right at the west end).
  return [pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1])];
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
    const ww = (s.water || 8) / 2, D = s.depth || 4;
    const clear = (u) => u > 3 && u < s.len - 1
      && !(s.bridges || []).some((b) => Math.abs(u - b.u) < b.w / 2 + 0.8)
      && !(s.stones || []).some((st) => Math.abs(u - st.u) < 1.6);
    for (let u = EDGE_SEAT.every; u < s.len; u += EDGE_SEAT.every) {
      if (!clear(u)) continue;
      for (const sd of [-1, 1]) {
        const x = s.at[0] + u, z = s.at[1] + sd * (ww + 0.18);
        out.push({ x, z, y: -D - EDGE_SEAT.sink, ry: sd > 0 ? Math.PI : 0, stand: [x, s.at[1] + sd * (ww + 1)], standY: -D, street: true, edge: true });
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
    const s = streams[i], u = x - s.at[0], v = z - s.at[1], hw = s.w / 2, D = s.depth || 4;
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
    g.position.set(s.at[0], 0, s.at[1]);
    ticks.push(buildOne(g, s));
    if (g.userData.wish && !root.userData.wish) root.userData.wish = g.userData.wish; // core/lanterns.js
    root.add(g);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  scene.add(root);
  root.userData.tick = (t) => { for (const f of ticks) f?.(t); };
  return root;
}

function buildOne(g, s) {
  const { len, w } = s, hw = w / 2, D = s.depth || 4, ww = (s.water || 8) / 2;
  // Boxes are given by their u (x), y and v (z) ranges.
  const box = (u0, u1, y0, y1, v0, v1, c, o) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0)), typeof c === 'string' ? mat(c, o) : c);
    m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    g.add(m);
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
    const m = box(0, 1.6, -D - 0.29, -D - 0.285, 0, 0.12, mat('#d8f0f8', { transparent: true, opacity: 0.7 }));
    m.userData.noShadow = true;
    m.position.z = ((k * 37) % 13) / 13 * (ww * 2 - 1) - ww + 0.5;
    streaks.push({ m, u: (k * 6 + (k * 17) % 5) % len, sp: 0.6 + ((k * 7) % 5) / 10 });
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
  const heron = s.heron ? buildHeron(g, s) : null; // a grey heron fishing in the water (core/heron.js)
  // The lantern festival and the wish lanterns (core/lanterns.js).
  const fest = s.lanterns ? buildLanternFestival(g, s) : null;
  if (s.lanterns) g.userData.wish = new WishLanterns(g, s);
  return (t) => {
    heron?.();
    fest?.tick(t);
    g.userData.wish?.tick(Date.now() / 1000);
    for (const q of streaks) q.m.position.x = (q.u + t * q.sp * 2) % len;
    if (fallTex) fallTex.offset.y = (t * 1.6) % 1;
  };
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
