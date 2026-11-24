// Banpo Bridge's upper deck (반포대교), the whole bridge on its real line at
// 1/4 (scripts/han-bank.mjs BANPO_BRIDGE): from the north bank's junction
// with Noksapyeong-daero, high over Jamsu Bridge (the low deck you walk on,
// core/landmarks.js jamsu) and the river, to the south bank, with a ramp
// down at each end. Only to look at: nobody drives up here.
//
// l.pts: the bridge's middle line, metres from (l.x, l.z), north to south.
// l.w: deck width (l.wRamp: narrower up the north ramp, to Jamsu Bridge's
// width, where houses stand close); l.top: deck height; l.ramp: [north, south] ramp lengths;
// l.noPiers: [[dx, dz, r]] spots kept free of piers (the park under it).
// l.pipes: false for no fountain pipes; l.arches: [[s0, s1]] arch spans
// (Dongjak Bridge's); l.mid: a strip down the middle (its subway track).
// A mesh per colour (deck, parapets, pipes, arches, track) and one for the
// piers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { matCache } from './three-kit.js';
import { bridgeY } from './han-bridges.js';

const mat = matCache({ flatShading: true });
const STEP = 6; // metres per piece along the bridge
const PIER_EVERY = 30;

// Points every STEP metres along the line: [x, z, s, dirX, dirZ].
function sample(pts) {
  const out = [];
  let s0 = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
    const n = Math.max(1, Math.round(L / STEP));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([ax + dx * (L * k) / n, az + dz * (L * k) / n, s0 + (L * k) / n, dx, dz]);
    s0 += L;
  }
  return { out, len: s0 };
}

// A strip swept along the samples: a box section sx(s) wide and sy tall,
// `across(s)` to the side and `rise` over the deck at y(s). Its edges are
// continuous (mitred at the bends, the width eased between samples), so a
// deck that bends or narrows has no steps or wedges at its joints (Yozi
// 2026-11-24: boxes per piece made the Han bridges' edges jagged).
// on(a, b): false where the strip is left out (split into runs).
function strip(list, out, y, { across = () => 0, rise = 0, sx, sy, on = null }) {
  let run = [];
  const flush = () => { if (run.length > 1) list.push(sweep(run, y, across, rise, sx, sy)); run = []; };
  for (let i = 0; i < out.length; i++) {
    if (on && i > 0 && !on(out[i - 1], out[i])) { flush(); continue; }
    if (on && i < out.length - 1 && !run.length && !on(out[i], out[i + 1])) continue;
    run.push(i);
  }
  flush();
  function sweep(idx, yAt, acr, up, wAt, h) {
    const pos = [], index = [];
    for (let k = 0; k < idx.length; k++) {
      const q = out[idx[k]], prev = out[idx[Math.max(0, k - 1)]], next = out[idx[Math.min(idx.length - 1, k + 1)]];
      // mitred side: the mean of the two pieces' directions
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const own = Math.max(0.5, dx * q[3] + dz * q[4]); // (cos of the half bend)
      const nx = dz / own, nz = -dx / own; // side = up x forward
      const w = typeof wAt === 'function' ? wAt(q[2]) : wAt, c = acr(q[2]), yy = yAt(q[2]) + up;
      for (const [u, v] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) pos.push(q[0] + nx * (c + u), yy + v, q[1] + nz * (c + u));
    }
    // four sides between each pair of rings (0 1 2 3: bottom-left, bottom-right, top-right, top-left), and the two ends
    for (let k = 1; k < idx.length; k++) {
      const a = (k - 1) * 4, b = k * 4;
      for (let e = 0; e < 4; e++) {
        const e1 = (e + 1) % 4;
        index.push(a + e, b + e1, b + e, a + e, a + e1, b + e1);
      }
    }
    const last = (idx.length - 1) * 4;
    index.push(0, 2, 1, 0, 3, 2, last, last + 1, last + 2, last, last + 2, last + 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(index);
    const flat = geo.toNonIndexed();
    flat.computeVertexNormals();
    return flat;
  }
}

// The line with its corners rounded off (a curve ROUND m either side of
// each bend, less on a short piece): the real lines bend a few degrees at
// each OpenStreetMap point, and a deck turning sharp there showed a corner.
const ROUND = 8;
function rounded(pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, pz] = pts[i - 1], [cx, cz] = pts[i], [nx, nz] = pts[i + 1];
    const la = Math.hypot(cx - px, cz - pz), lb = Math.hypot(nx - cx, nz - cz);
    const c = Math.min(ROUND, la * 0.4, lb * 0.4);
    if (c < 0.5) { out.push(pts[i]); continue; }
    const a = [cx - ((cx - px) / la) * c, cz - ((cz - pz) / la) * c], b = [cx + ((nx - cx) / lb) * c, cz + ((nz - cz) / lb) * c];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cz + t * t * b[1]]);
    }
  }
  out.push(pts.at(-1));
  return out;
}

export function banpoBridge(g, l) {
  const w = l.w || 22, top = l.top || 9, half = w / 2;
  const [rampN, rampS] = l.ramp || [80, 55];
  const { out, len } = sample(rounded(l.pts));
  // The deck's height s metres along: up the north ramp, level, down the south one.
  const smoothstep = (k) => k * k * (3 - 2 * k);
  const y = l.y || ((s) => top * Math.min(smoothstep(Math.min(1, s / rampN)), smoothstep(Math.min(1, (len - s) / rampS)))); // (l.y(s): a deck of its own shape, core/han-bridges.js)
  const parts = { deck: [], parapet: [], pipe: [], arch: [], mid: [] };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), nrm = new THREE.Vector3(), basis = new THREE.Matrix4();
  const wAt = (s) => (l.wRamp && s < rampN ? l.wRamp + (w - l.wRamp) * smoothstep(Math.max(0, (s - rampN + 20) / 20)) : w);
  strip(parts.deck, out, y, { rise: -0.7, sx: wAt, sy: 1.4 });
  for (const k of [-1, 1]) {
    strip(parts.parapet, out, y, { across: (s) => k * (wAt(s) / 2 - 0.15), rise: 0.45, sx: 0.3, sy: 0.9 });
    // The Moonlight Rainbow Fountain's pipe of nozzles under each edge,
    // where the deck is level (the water: core/rainbow-jets.js).
    if (l.pipes !== false) strip(parts.pipe, out, y, { across: () => k * (half + 0.05), rise: -1.2, sx: 0.35, sy: 0.35, on: (a, b) => y(a[2]) > top - 0.05 && y(b[2]) > top - 0.05 });
  }
  if (l.mid) strip(parts.mid, out, y, { rise: 0.06, sx: w * 0.22, sy: 0.12 });
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    // Arch ribs over the deck, a little in from each edge.
    for (const [s0, s1] of l.arches || []) {
      const ha = (s1 - s0) * 0.16, arch = (s) => (s <= s0 || s >= s1 ? 0 : ha * Math.sin((Math.PI * (s - s0)) / (s1 - s0)));
      if (b[2] <= s0 || a[2] >= s1) continue;
      for (const sx of [-1, 1]) {
        const ya = arch(a[2]), yb = arch(b[2]);
        const len2 = Math.hypot(b[0] - a[0], b[1] - a[1], yb - ya);
        const mx = (a[0] + b[0]) / 2 + b[4] * sx * (half - 0.6) * 1, mz = (a[1] + b[1]) / 2 - b[3] * sx * (half - 0.6);
        const base = (y(a[2]) + y(b[2])) / 2; // (on the deck where it is: a level deck's top, or a raised road's)
        fwd.set(b[0] - a[0], yb - ya, b[1] - a[1]).normalize();
        side.crossVectors(up, fwd).normalize(); nrm.crossVectors(fwd, side).normalize();
        q.setFromRotationMatrix(basis.makeBasis(side, nrm, fwd));
        parts.arch.push(box.clone().applyMatrix4(m4.compose(p.set(mx, base + (ya + yb) / 2 + 0.4, mz), q, sc.set(0.7, 0.7, len2 + 0.3))));
        // hangers down to the deck
        const h = (ya + yb) / 2;
        if (h > 1) parts.arch.push(new THREE.BoxGeometry(0.12, h, 0.12).applyMatrix4(m4.makeTranslation(mx, base + h / 2, mz)));
      }
    }
  }
  const colors = { deck: l.deckColor || '#d9dde2', parapet: '#b8bec6', pipe: '#6f7a86', arch: l.archColor || '#5d8fb5', mid: '#7d7466' };
  for (const [k, list] of Object.entries(parts)) if (list.length) g.add(new THREE.Mesh(mergeGeometries(list), mat(colors[k])));
  // Piers in pairs, where the deck is high enough to need them (l.piers
  // false: none of its own, it rests on the deck over it: Jamsu Bridge).
  // l.lower: a bridge under this one (core/han-bridges.js, Jamsu under
  // Banpo): the piers stand clear of it, and where it is up off the water a
  // beam between each pair carries it, as the real piers carry both decks.
  const piers = [];
  const clear = l.noPiers || [];
  const ox = l.x || 0, oz = l.z || 0;
  let next = PIER_EVERY / 2;
  for (const [x, z, s, dx, dz] of l.piers === false ? [] : out) {
    if (s < next) continue;
    next = s + PIER_EVERY;
    const h = y(s) - 1.4;
    if (h < 2) continue;
    const ph = wAt(s) / 2 - (l.lower ? 1.2 : 1.8);
    let pair = 0;
    for (const sx of [-1, 1]) {
      const px = x + dz * sx * ph, pz = z - dx * sx * ph;
      if (clear.some(([cx, cz, r]) => Math.hypot(px - cx, pz - cz) < r)) continue;
      const geo = new THREE.BoxGeometry(1.6, h, 2.2);
      geo.applyMatrix4(m4.compose(p.set(px, h / 2, pz), q.setFromAxisAngle(up, Math.atan2(dx, dz)), sc.set(1, 1, 1)));
      piers.push(geo);
      pair++;
    }
    const low = l.lower && pair === 2 ? bridgeY([l.lower], x + ox, z + oz) : 0;
    if (low > 2) piers.push(new THREE.BoxGeometry(ph * 2 + 1.6, 0.9, 1.8).applyMatrix4(m4.compose(p.set(x, low - 1.4 - 0.45, z), q.setFromAxisAngle(up, Math.atan2(dx, dz)), sc.set(1, 1, 1))));
  }
  if (piers.length) g.add(new THREE.Mesh(mergeGeometries(piers), mat('#c3c8ce')));
}
