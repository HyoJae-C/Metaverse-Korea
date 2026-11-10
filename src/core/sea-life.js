// Sea life for the aquarium (core/aquarium.js): each species drawn after
// the real animal — its body shape, colour pattern (painted per vertex),
// fins and eyes — and a swimming motion bent in the vertex shader (a fish's
// tail sweeps side to side, a dolphin's flukes beat up and down, a manta
// flaps its wings), so a whole school is still one instanced draw.
//
// Every model is one unit long, nose along +x (x from -0.5 at the tail tip
// to 0.5 at the nose), centred on the body's axis. Scale it to the
// animal's length.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const k = clamp01((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k));

// How thick the body is along its length, 0..1: t = 0 at the tail stalk
// (`ped` of the full height), widest at `peak`, rounding to the nose
// (`nose` > 2 blunter, < 2 more pointed).
export function envelope(t, peak = 0.5, ped = 0.25, nose = 2) {
  if (t < peak) return ped + (1 - ped) * Math.sin((t / peak) * Math.PI / 2);
  const s = (t - peak) / (1 - peak);
  return Math.sqrt(Math.max(0, 1 - Math.pow(s, nose)));
}

// Every part ends up with the same attributes (position, normal, colour) so
// they merge into one geometry.
function finish(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (color !== undefined) {
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
  return g;
}

// The body: rings round the axis from the tail stalk (x0) to the nose (x1),
// H tall and W wide at the widest; cy(t) bends the axis up or down, hf(t)
// pinches the outline (a dolphin's beak), under < 1 flattens the belly.
// color(x, y, z, u, t) paints each vertex (u: 1 on top, -1 underneath).
function body({ x0 = -0.3, x1 = 0.5, H, W, peak = 0.5, ped = 0.25, nose = 2, cy = () => 0, hf = () => 1, under = 1, color, rings = 26, seg = 16 }) {
  const prof = (t) => { const e = envelope(t, peak, ped, nose) * hf(t); return [H * e / 2, W * e / 2, cy(t)]; };
  const pos = [], col = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, x = lerp(x0, x1, t), [h, w, y0] = prof(t);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2, u = Math.cos(a), v = Math.sin(a);
      const y = y0 + h * u * (u < 0 ? under : 1), z = w * v;
      pos.push(x, y, z);
      c.set(color(x, y, z, u, t));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + ((j + 1) % seg), d = a + seg, e = b + seg;
    idx.push(a, d, b, b, d, e);
  }
  const ci = pos.length / 3, [, , yc] = prof(0); // close the tail end
  pos.push(x0, yc, 0);
  c.set(color(x0, yc, 0, 0, 0));
  col.push(c.r, c.g, c.b);
  for (let j = 0; j < seg; j++) idx.push(ci, (j + 1) % seg, j);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return {
    geo: finish(geo),
    // a point on the skin: at x, at height u (1 top .. -1 bottom), on one side
    surf(x, u, side = 1) {
      const [h, w, y0] = prof(clamp01((x - x0) / (x1 - x0)));
      return [x, y0 + h * u * (u < 0 ? under : 1), w * side * Math.sqrt(Math.max(0, 1 - u * u))];
    },
  };
}

// A flat fin from an outline [[x, y], ...] in the side view: drawn round
// the origin, turned by (rx, ry, rz), then moved to `at`. `edge`: a darker
// rim (a slightly smaller copy of the fin either side of the rim colour).
function fin(pts, color, { rx = 0, ry = 0, rz = 0, at = [0, 0, 0], edge = null, inset = 0.82, lift = 0.006 } = {}) {
  const shape = (p) => new THREE.ShapeGeometry(new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y))));
  const parts = [];
  if (edge) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const inner = pts.map(([x, y]) => [cx + (x - cx) * inset, cy + (y - cy) * inset]);
    parts.push(finish(shape(pts), edge), finish(shape(inner).translate(0, 0, lift), color), finish(shape(inner).translate(0, 0, -lift), color));
  } else parts.push(finish(shape(pts), color));
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(...at);
  for (const p of parts) p.applyMatrix4(m);
  return parts;
}

// A fin lying flat (flukes, flippers): outline in the top view [[x, z], ...].
function flatFin(pts, color, at = [0, 0, 0]) {
  return fin(pts.map(([x, z]) => [x, -z]), color, { rx: -Math.PI / 2, at });
}

function ball(r, color, [x, y, z], s = [1, 1, 1]) {
  return finish(new THREE.SphereGeometry(r, 10, 7).scale(...s).translate(x, y, z), color);
}

function rod([ax, ay, az], [bx, by, bz], r0, r1, color) {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz), d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return finish(g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), color);
}

// Both eyes, on the skin at (x, u): a ring and a pupil looking out.
function eyes(b, x, u, r, ring = '#e9eef0', pupil = '#0d0f12') {
  const out = [];
  for (const side of [-1, 1]) {
    const [px, py, pz] = b.surf(x, u, side);
    out.push(ball(r, ring, [px, py, pz - side * r * 0.35]), ball(r * 0.62, pupil, [px + r * 0.1, py, pz + side * r * 0.3]));
  }
  return out;
}

// Pectoral fins: an outline hanging from the shoulder (side view, relative
// to the root), splayed out from the body by `spread`.
function pectorals(pts, color, x, y, z, spread = 0.7, opts = {}) {
  return [-1, 1].flatMap((s) => fin(pts, color, { ...opts, rx: -s * spread, at: [x, y, s * z] }));
}

// ---- the species ----
// Each builds its parts; `mode` is how it swims (see BEND), `hz` how fast
// its tail beats and `amp` how far.
const SPECIES = {
  // Clownfish (Amphiprion ocellaris): orange, three white bands edged in
  // black (behind the eye, mid-body, at the tail stalk), black-rimmed fins.
  clownfish: { mode: 'fish', hz: 9, amp: 0.07, build() {
    const bands = [[0.2, 0.29], [-0.04, 0.08], [-0.28, -0.21]];
    const b = body({ x0: -0.3, H: 0.42, W: 0.21, peak: 0.55, ped: 0.32, nose: 2.2, color: (x, y, z, u) => {
      const xc = x + 0.04 * u; // the bands bow forward at the top
      for (const [a, c] of bands) {
        if (xc > a && xc < c) return '#fbfbf7';
        if (xc > a - 0.02 && xc < c + 0.02) return '#15110f';
      }
      return mix('#ff7a12', '#ffa040', smooth(0, -0.9, u));
    } });
    return [b.geo, ...eyes(b, 0.37, 0.3, 0.035, '#ff9b3d'),
      ...fin([[-0.22, 0.08], [-0.2, 0.2], [-0.08, 0.27], [0.02, 0.23], [0.08, 0.28], [0.19, 0.21], [0.22, 0.12]], '#ff7a12', { edge: '#15110f' }),
      ...fin([[-0.2, -0.06], [-0.17, -0.21], [-0.07, -0.22], [-0.02, -0.08]], '#ff7a12', { edge: '#15110f' }),
      ...fin([[-0.26, 0.03], [-0.41, 0.14], [-0.5, 0.09], [-0.53, 0], [-0.5, -0.09], [-0.41, -0.14], [-0.26, -0.03]], '#ff7a12', { edge: '#15110f' }),
      ...pectorals([[0, 0], [0.02, -0.12], [-0.06, -0.15], [-0.08, -0.04]], '#ff8a2a', 0.22, -0.05, 0.08, 0.7, { edge: '#15110f' })];
  } },
  // Blue tang (Paracanthurus hepatus): royal blue, the black "palette" band
  // from the eye to the tail with its loop, a yellow tail.
  bluetang: { mode: 'fish', hz: 7, amp: 0.06, build() {
    const b = body({ x0: -0.28, H: 0.52, W: 0.15, peak: 0.5, ped: 0.24, nose: 1.6, color: (x, y) => {
      const yc = 0.03 + 0.11 * Math.sin(Math.PI * clamp01((x + 0.26) / 0.62));
      if (x > -0.26 && x < 0.34 && Math.abs(y - yc) < 0.035) return '#0e1530';
      const e = ((x + 0.02) / 0.15) ** 2 + ((y - 0.06) / 0.085) ** 2;
      if (e > 0.55 && e < 1.25 && y < yc) return '#0e1530';
      return mix('#2f73f0', '#1b4fc4', smooth(-0.1, 0.25, y));
    } });
    return [b.geo, ...eyes(b, 0.36, 0.25, 0.034, '#203a7a'),
      ...fin([[-0.24, 0.06], [-0.22, 0.2], [-0.02, 0.33], [0.2, 0.28], [0.28, 0.12]], '#1f5ce0', { edge: '#0e1530' }),
      ...fin([[-0.22, -0.05], [-0.2, -0.19], [0, -0.32], [0.12, -0.24], [0.15, -0.1]], '#1f5ce0', { edge: '#0e1530' }),
      ...fin([[-0.26, 0.03], [-0.49, 0.17], [-0.42, 0], [-0.49, -0.17], [-0.26, -0.03]], '#ffd21f', { edge: '#0e1530', inset: 0.75 }),
      ...pectorals([[0, 0], [0.01, -0.11], [-0.07, -0.13], [-0.08, -0.03]], '#ffd84a', 0.22, -0.05, 0.06)];
  } },
  // Yellow tang (Zebrasoma flavescens): a tall bright-yellow disc with high
  // fins, a pointed snout and a white spine by the tail.
  yellowtang: { mode: 'fish', hz: 6, amp: 0.05, build() {
    const b = body({ x0: -0.25, H: 0.72, W: 0.13, peak: 0.45, ped: 0.22, nose: 1.35, cy: (t) => -0.05 * smooth(0.75, 1, t), color: (x, y, z, u) => {
      if (x > -0.235 && x < -0.18 && Math.abs(y - 0.01) < 0.03) return '#ffffff';
      return mix('#ffd60a', '#fff1a0', smooth(-0.3, -0.9, u));
    } });
    return [b.geo, ...eyes(b, 0.3, 0.42, 0.034, '#2a2310'),
      ...fin([[-0.22, 0.06], [-0.2, 0.3], [0, 0.47], [0.15, 0.39], [0.25, 0.18]], '#ffcf00'),
      ...fin([[-0.2, -0.06], [-0.18, -0.28], [0, -0.43], [0.12, -0.31], [0.15, -0.12]], '#ffcf00'),
      ...fin([[-0.23, 0.04], [-0.45, 0.15], [-0.42, 0], [-0.45, -0.15], [-0.23, -0.04]], '#ffcf00'),
      ...pectorals([[0, 0], [0.01, -0.1], [-0.06, -0.12], [-0.07, -0.03]], '#fff1a0', 0.18, -0.06, 0.05)];
  } },
  // Sardine (Sardinops melanostictus): a slim silver fish, dark blue back,
  // a row of dark spots, a deeply forked tail.
  sardine: { mode: 'fish', hz: 12, amp: 0.06, build() {
    const b = body({ x0: -0.32, H: 0.19, W: 0.13, peak: 0.5, ped: 0.24, nose: 1.8, rings: 30, color: (x, y, z, u) => {
      if (x > -0.12 && x < 0.28 && Math.abs(u - 0.15) < 0.12 && Math.sin(x * 70) > 0.2) return '#203556';
      if (u < -0.4) return '#f4f7fa';
      return mix('#d3dde6', '#1f4a78', smooth(0.15, 0.5, u));
    } });
    return [b.geo, ...eyes(b, 0.4, 0.15, 0.032),
      ...fin([[-0.02, 0.06], [0.04, 0.15], [0.11, 0.07]], '#5f7d9a'),
      ...fin([[-0.3, 0.02], [-0.51, 0.13], [-0.42, 0], [-0.51, -0.13], [-0.3, -0.02]], '#6f8aa5'),
      ...pectorals([[0, 0], [-0.02, -0.07], [-0.08, -0.07]], '#c6d2dc', 0.3, -0.03, 0.05, 1.1)];
  } },
  // Yellowtail amberjack (Seriola, 부시리): blue-grey back, silver belly, a
  // yellow stripe nose to tail and a yellow forked tail.
  yellowtail: { mode: 'fish', hz: 8, amp: 0.05, build() {
    const b = body({ x0: -0.3, H: 0.23, W: 0.15, peak: 0.48, ped: 0.18, nose: 2, rings: 30, color: (x, y, z, u) => {
      if (Math.abs(u - 0.12) < 0.13 && x < 0.42) return '#f2c230';
      if (u < -0.3) return '#f2f5f7';
      return mix('#cfd8df', '#43627f', smooth(0.25, 0.55, u));
    } });
    return [b.geo, ...eyes(b, 0.4, 0.22, 0.03),
      ...fin([[0.08, 0.08], [0.1, 0.13], [0.16, 0.09]], '#4a6178'),
      ...fin([[-0.25, 0.05], [-0.22, 0.11], [0.06, 0.14], [0.08, 0.08]], '#9a9a6a'),
      ...fin([[-0.24, -0.04], [-0.21, -0.1], [-0.04, -0.12], [-0.02, -0.06]], '#c9b35a'),
      ...fin([[-0.29, 0.02], [-0.53, 0.18], [-0.43, 0], [-0.53, -0.18], [-0.29, -0.02]], '#f2c230'),
      ...pectorals([[0, 0], [-0.03, -0.07], [-0.1, -0.07]], '#d8c26a', 0.26, -0.03, 0.06, 1.1)];
  } },
  // Carp (잉어): bronze, a darker back and golden belly, a long dorsal fin,
  // reddish-brown fins and the whiskers (barbels) by the mouth.
  carp: { mode: 'fish', hz: 5, amp: 0.06, build() {
    const b = body({ x0: -0.28, H: 0.3, W: 0.2, peak: 0.55, ped: 0.3, nose: 1.7, color: (x, y, z, u, t) => {
      const scale = 0.06 * Math.sin(t * 90) * Math.sin(u * 9); // a hint of the big scales
      const c = u > 0 ? mix('#b5893a', '#5e4720', smooth(0.1, 0.8, u)) : mix('#b5893a', '#e8c97e', smooth(0, -0.7, u));
      return c.multiplyScalar(1 + scale);
    } });
    const out = [b.geo, ...eyes(b, 0.38, 0.25, 0.03, '#d9b25a'),
      ...fin([[-0.18, 0.1], [-0.14, 0.21], [0.12, 0.26], [0.16, 0.13]], '#8d5a2b'),
      ...fin([[-0.2, -0.08], [-0.17, -0.18], [-0.1, -0.17], [-0.08, -0.06]], '#a0582f'),
      ...fin([[-0.27, 0.03], [-0.5, 0.16], [-0.42, 0], [-0.5, -0.16], [-0.27, -0.03]], '#8d5a2b'),
      ...pectorals([[0, 0], [-0.02, -0.1], [-0.09, -0.1]], '#a0582f', 0.26, -0.08, 0.07, 1)];
    for (const s of [-1, 1]) out.push(rod([0.47, -0.04, s * 0.03], [0.5, -0.1, s * 0.05], 0.008, 0.003, '#7a5a28'));
    return out;
  } },
  // Pale chub (피라미, Zacco platypus): silver with blue-green bars down the
  // sides and the breeding male's pink-orange fins.
  chub: { mode: 'fish', hz: 11, amp: 0.07, build() {
    const b = body({ x0: -0.3, H: 0.2, W: 0.12, peak: 0.5, ped: 0.24, nose: 1.8, rings: 32, color: (x, y, z, u) => {
      const base = mix('#cfd8dc', '#5f7f80', smooth(0.3, 0.8, u));
      if (x > -0.27 && x < 0.3 && u > -0.55 && u < 0.75 && Math.sin((x + 0.2) * 45) > 0.35) return base.lerp(new THREE.Color('#4d86a0'), 0.65);
      return u < -0.5 ? mix(base, '#f2c0b0', 0.5) : base;
    } });
    return [b.geo, ...eyes(b, 0.39, 0.2, 0.03, '#e8b0a0'),
      ...fin([[-0.02, 0.07], [0.02, 0.16], [0.09, 0.07]], '#9fb0b4'),
      ...fin([[-0.22, -0.05], [-0.2, -0.17], [-0.06, -0.14], [-0.04, -0.06]], '#f08a70'),
      ...fin([[-0.29, 0.02], [-0.5, 0.13], [-0.42, 0], [-0.5, -0.13], [-0.29, -0.02]], '#b6c0c4'),
      ...pectorals([[0, 0], [-0.02, -0.08], [-0.08, -0.08]], '#f0a088', 0.28, -0.05, 0.05, 1)];
  } },
  // Chum salmon (연어) back in the river to spawn: olive back, purple-red
  // tiger bars, dark fins, a hooked jaw and the little adipose fin.
  salmon: { mode: 'fish', hz: 6, amp: 0.06, build() {
    const b = body({ x0: -0.3, H: 0.25, W: 0.15, peak: 0.5, ped: 0.2, nose: 1.9, cy: (t) => -0.02 * smooth(0.85, 1, t), rings: 30, color: (x, y, z, u) => {
      const base = u > 0.2 ? mix('#8a9a86', '#3f4e36', smooth(0.2, 0.8, u)) : mix('#8a9a86', '#e6e6dc', smooth(-0.2, -0.8, u));
      if (x > -0.25 && x < 0.3 && u > -0.55 && u < 0.45 && Math.sin((x + 0.1) * 32 + u * 2) > 0.25) return base.lerp(new THREE.Color('#8e3f5a'), 0.7);
      return base;
    } });
    return [b.geo, ...eyes(b, 0.4, 0.25, 0.026, '#c9c3a0'),
      ...fin([[-0.04, 0.1], [0.01, 0.21], [0.1, 0.1]], '#3d4440'),
      ...fin([[-0.24, 0.07], [-0.22, 0.12], [-0.19, 0.07]], '#3d4440'), // the adipose fin
      ...fin([[-0.22, -0.06], [-0.19, -0.16], [-0.1, -0.15], [-0.09, -0.06]], '#4a4f4a', { edge: '#e8e8e0', inset: 0.75 }),
      ...fin([[-0.29, 0.03], [-0.5, 0.16], [-0.45, 0], [-0.5, -0.16], [-0.29, -0.03]], '#4f5a52'),
      ...pectorals([[0, 0], [-0.02, -0.09], [-0.09, -0.09]], '#4a4f4a', 0.28, -0.06, 0.06, 1)];
  } },
  // Threadfin butterflyfish (Chaetodon auriga): a white-and-yellow disc, a
  // black band through the eye, a black eyespot on the dorsal fin, a snout.
  butterfly: { mode: 'fish', hz: 6, amp: 0.05, build() {
    const b = body({ x0: -0.24, H: 0.62, W: 0.12, peak: 0.48, ped: 0.25, nose: 1.3, cy: (t) => -0.04 * smooth(0.8, 1, t), color: (x, y) => {
      if (Math.abs(x - 0.33 - 0.04 * y) < 0.03) return '#15130f';
      const c = mix('#ffcf2e', '#f6f2e6', smooth(-0.1, 0.12, x));
      return Math.sin((x + y) * 40) > 0.75 && x < 0.28 ? c.multiplyScalar(0.8) : c; // the fine chevrons
    } });
    return [b.geo, ...eyes(b, 0.33, 0.3, 0.03, '#15130f'),
      ...fin([[-0.2, 0.08], [-0.18, 0.32], [0.05, 0.37], [0.22, 0.22], [0.24, 0.15]], '#ffcf2e'),
      ...fin([[-0.17, 0.25], [-0.15, 0.29], [-0.11, 0.27], [-0.13, 0.23]], '#15130f', { at: [0, 0, 0.007] }),
      ...fin([[-0.17, 0.25], [-0.15, 0.29], [-0.11, 0.27], [-0.13, 0.23]], '#15130f', { at: [0, 0, -0.007] }),
      ...fin([[-0.2, -0.08], [-0.18, -0.28], [0, -0.33], [0.12, -0.2], [0.14, -0.1]], '#ffcf2e'),
      ...fin([[-0.22, 0.04], [-0.38, 0.12], [-0.4, 0], [-0.38, -0.12], [-0.22, -0.04]], '#ffe07a'),
      ...pectorals([[0, 0], [0.01, -0.09], [-0.06, -0.1]], '#f6f2e6', 0.2, -0.06, 0.05)];
  } },
  // Blacktip reef shark: grey above, white below, a tall swept dorsal fin
  // with a black tip, big pectorals and the long upper lobe of the tail.
  shark: { mode: 'fish', hz: 2.6, amp: 0.07, build() {
    const b = body({ x0: -0.25, H: 0.2, W: 0.19, peak: 0.6, ped: 0.18, nose: 2.6, rings: 30, color: (x, y, z, u) => {
      if (x > 0.25 && x < 0.33 && Math.abs(u) < 0.35 && Math.sin(x * 160) > 0.5) return '#525d66'; // gill slits
      return mix('#eef1f3', '#76838e', smooth(-0.35, 0.05, u));
    } });
    const grey = '#76838e', tip = '#15181b';
    return [b.geo, ...eyes(b, 0.36, 0.25, 0.017, '#2a2f33'),
      ...fin([[0.16, 0.07], [0.02, 0.3], [-0.01, 0.29], [0.02, 0.17], [-0.04, 0.07]], grey),
      ...[-1, 1].flatMap((s) => fin([[0.06, 0.25], [0.02, 0.305], [-0.012, 0.295], [0.015, 0.24]], tip, { at: [0, 0, s * 0.006] })),
      ...fin([[-0.19, 0.04], [-0.21, 0.1], [-0.15, 0.04]], grey),
      ...fin([[-0.17, -0.04], [-0.19, -0.09], [-0.13, -0.04]], '#c9d0d5'),
      ...fin([[-0.22, 0.03], [-0.5, 0.22], [-0.46, 0.14], [-0.4, 0.01], [-0.44, -0.12], [-0.3, -0.04]], grey),
      ...[-1, 1].flatMap((s) => fin([[-0.48, 0.2], [-0.5, 0.22], [-0.47, 0.155]], tip, { at: [0, 0, s * 0.005] })),
      ...pectorals([[0, 0], [-0.1, -0.22], [-0.14, -0.2], [-0.1, 0]], '#8a96a0', 0.2, -0.05, 0.06, 1.1)];
  } },
  // Manta ray: wide swept wings, black on top with white shoulder patches,
  // white below; the two horn-like head fins and a whip of a tail.
  manta: { mode: 'ray', hz: 1.1, amp: 0.4, build() {
    // Grid over the disc: v across (-1 left tip .. 1 right tip), p from the
    // trailing edge (concave) to the leading edge (convex, the head in front).
    const P = 16, V = 28, pos = [], col = [], idx = [], c = new THREE.Color();
    for (const top of [true, false]) {
      const o = pos.length / 3;
      for (let i = 0; i <= P; i++) {
        const p = i / P;
        for (let j = 0; j <= V; j++) {
          const v = (j / V) * 2 - 1, av = Math.abs(v);
          const xl = 0.32 - 0.42 * Math.pow(av, 1.25), xt = -0.22 + 0.12 * Math.sqrt(av);
          const x = lerp(xt, xl, p), z = v * 0.62;
          const k = Math.pow(Math.max(0, 1 - v * v), 1.5) * Math.pow(Math.sin(Math.PI * p), 0.5);
          const y = (top ? 0.07 : -0.035) * k - 0.03 * v ** 4;
          pos.push(x, y, z);
          const patch = p > 0.35 && av > 0.16 && av < 0.16 + 0.3 * (p - 0.35);
          c.set(top ? (patch ? '#e3e8ec' : '#1b2027') : av > 0.85 || p < 0.06 ? '#5a636b' : '#eef1f3');
          col.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < P; i++) for (let j = 0; j < V; j++) {
        const a = o + i * (V + 1) + j, b = a + 1, d = a + V + 1, e = d + 1;
        if (top) idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const out = [finish(geo), rod([-0.25, 0, 0], [-0.7, 0.01, 0], 0.012, 0.003, '#1b2027')];
    for (const s of [-1, 1]) {
      out.push(...fin([[0, 0.01], [0.12, 0.0], [0.13, -0.04], [0.02, -0.05]], '#1b2027', { at: [0.33, 0, s * 0.11], ry: -s * 0.25 }));
      out.push(ball(0.016, '#0d0f12', [0.31, 0.015, s * 0.13]));
    }
    return out;
  } },
  // Green sea turtle: a domed shell of scutes, a pale underside, a small
  // head and long front flippers.
  turtle: { mode: 'turtle', hz: 1.2, amp: 0.25, build() {
    const shell = body({ x0: -0.3, x1: 0.3, H: 0.24, W: 0.5, peak: 0.45, ped: 0.3, nose: 1.6, under: 0.35, rings: 28, seg: 20, color: (x, y, z, u) => {
      if (u < -0.15) return '#e6d9a0';
      if (u < 0.05) return '#cdbb7a'; // the rim
      const a = Math.atan2(z, y);
      const seam = Math.abs(Math.sin(x * 21)) < 0.22 || Math.abs(Math.sin(a * 4.5)) < 0.18;
      return seam ? '#3a301c' : mix('#6b5a32', '#9a8248', 0.5 + 0.5 * Math.sin(x * 40 + a * 7));
    } });
    const head = body({ x0: 0.24, x1: 0.48, H: 0.12, W: 0.12, peak: 0.55, ped: 0.75, nose: 2.4, cy: () => 0.01, color: (x, y, z, u) => (u < -0.3 ? '#d8d09a' : Math.sin(x * 120) * Math.sin(u * 14) > 0.3 ? '#3f4a26' : '#62703c') });
    const skin = '#5d6b3a';
    return [shell.geo, head.geo, ...eyes(head, 0.43, 0.25, 0.014, '#2a2a20'),
      ...[-1, 1].flatMap((s) => flatFin([[0.18, s * 0.2], [0.12, s * 0.62], [0.04, s * 0.67], [0.05, s * 0.5], [0.08, s * 0.2]], skin, [0, -0.02, 0])),
      ...[-1, 1].flatMap((s) => flatFin([[-0.2, s * 0.15], [-0.3, s * 0.3], [-0.37, s * 0.25], [-0.28, s * 0.12]], skin, [0, -0.02, 0])),
      rod([-0.29, -0.01, 0], [-0.36, -0.02, 0], 0.025, 0.006, skin)];
  } },
  // Bottlenose dolphin: grey, darker cape, pale belly; the melon and short
  // beak, a curved dorsal fin, flippers and flat tail flukes.
  dolphin: { mode: 'whale', hz: 2.2, amp: 0.07, build() {
    const b = body({ x0: -0.32, H: 0.2, W: 0.19, peak: 0.48, ped: 0.15, nose: 1.6, rings: 32,
      hf: (t) => lerp(1, 0.45, smooth(0.86, 0.92, t)), cy: (t) => -0.025 * smooth(0.86, 1, t),
      color: (x, y, z, u) => (u < -0.3 ? mix('#8c9cab', '#e8ecef', smooth(-0.3, -0.6, u)) : mix('#8c9cab', '#56677a', smooth(0.3, 0.8, u))) });
    const grey = '#5f6f7e';
    return [b.geo, ...eyes(b, 0.37, 0.05, 0.014, '#2a3036'),
      ...fin([[0.06, 0.07], [-0.04, 0.2], [-0.09, 0.2], [-0.05, 0.14], [-0.09, 0.07]], grey),
      ...flatFin([[-0.3, 0], [-0.43, 0.16], [-0.5, 0.17], [-0.45, 0.05], [-0.47, 0], [-0.45, -0.05], [-0.5, -0.17], [-0.43, -0.16]], grey),
      ...pectorals([[0, 0], [-0.05, -0.12], [-0.09, -0.11], [-0.05, 0]], grey, 0.22, -0.05, 0.07, 0.9)];
  } },
  // Orca: black with the white eye patch, white chin and belly, a grey
  // saddle behind the very tall dorsal fin, paddle-shaped flippers.
  orca: { mode: 'whale', hz: 1.8, amp: 0.06, build() {
    const b = body({ x0: -0.3, H: 0.24, W: 0.21, peak: 0.5, ped: 0.15, nose: 1.8, rings: 44, seg: 24, color: (x, y, z, u) => {
      if (((x - 0.3) / 0.065) ** 2 + ((u - 0.22) / 0.2) ** 2 < 1) return '#f4f6f7'; // eye patch
      if (u < -0.45 && x > -0.1) return '#f4f6f7'; // chin and belly
      if (u < -0.05 && x > -0.24 && x < -0.02 && u < -0.05 - 0.6 * smooth(-0.24, -0.1, x) * smooth(-0.02, -0.12, x)) return '#f4f6f7'; // the flank lobe
      if (u > 0.72 && x > -0.14 && x < 0.0) return '#59616a'; // the grey saddle
      return '#14171a';
    } });
    return [b.geo, ...eyes(b, 0.36, 0.1, 0.012, '#14171a'),
      ...fin([[0.08, 0.1], [0.015, 0.42], [-0.015, 0.42], [-0.06, 0.1]], '#14171a'),
      ...flatFin([[-0.28, 0], [-0.42, 0.17], [-0.49, 0.18], [-0.44, 0.05], [-0.46, 0], [-0.44, -0.05], [-0.49, -0.18], [-0.42, -0.17]], '#14171a'),
      ...pectorals([[0, 0], [-0.02, -0.15], [-0.08, -0.17], [-0.11, -0.1], [-0.06, 0]], '#14171a', 0.22, -0.07, 0.08, 0.9)];
  } },
  // Ocean sunfish (mola): a tall round disc cut off behind, the long dorsal
  // and anal fins it swims with, and the frilly clavus for a tail.
  sunfish: { mode: 'mola', hz: 1.1, amp: 0.22, build() {
    const b = body({ x0: -0.38, H: 0.85, W: 0.2, peak: 0.4, ped: 0.75, nose: 1.7, seg: 18, color: (x, y, z, u) => {
      const c = mix('#b9c4cb', '#7c8a93', smooth(0.2, 0.9, u));
      return c.multiplyScalar(1 + 0.08 * Math.sin(x * 30 + u * 9) * Math.sin(u * 13));
    } });
    return [b.geo, ...eyes(b, 0.3, 0.18, 0.03, '#c9d2d8'),
      ...fin([[-0.25, 0.25], [-0.33, 0.8], [-0.22, 0.82], [-0.08, 0.3]], '#8d9aa2'),
      ...fin([[-0.25, -0.25], [-0.33, -0.8], [-0.22, -0.82], [-0.08, -0.3]], '#9aa6ad'),
      ...fin([[-0.36, 0.3], [-0.45, 0.26], [-0.49, 0.15], [-0.47, 0.05], [-0.5, -0.05], [-0.48, -0.15], [-0.45, -0.26], [-0.36, -0.3]], '#a3aeb5'),
      ...pectorals([[0, 0], [-0.02, -0.08], [-0.08, -0.07]], '#9aa6ad', 0.22, 0.0, 0.08, 1.2)];
  } },
};

// The swimming motion, in the model's own units (bent before the instance
// matrix places it): `ph` runs with time and differs per fish.
const BEND = {
  // a wave down the body, growing toward the tail, side to side
  fish: (A) => `float k = clamp((0.22 - transformed.x) / 0.72, 0.0, 1.0);
    transformed.z += sin(ph - transformed.x * 6.0) * ${A} * k * k;`,
  // whales and dolphins beat their flukes up and down
  whale: (A) => `float k = clamp((0.1 - transformed.x) / 0.6, 0.0, 1.0);
    transformed.y += sin(ph - transformed.x * 4.0) * ${A} * k * k;`,
  // a manta's wings flap in a wave from front to back
  ray: (A) => `float s = abs(transformed.z);
    transformed.y += sin(ph - transformed.x * 2.5) * ${A} * pow(s, 1.4);`,
  // a turtle's front flippers stroke, the back ones steer
  turtle: (A) => `float s = max(abs(transformed.z) - 0.22, 0.0);
    transformed.y += sin(ph + (transformed.x > 0.0 ? 0.0 : 1.8)) * ${A} * s * (transformed.x > 0.0 ? 1.0 : 0.35);`,
  // a sunfish sculls with its tall dorsal and anal fins
  mola: (A) => `float s = max(abs(transformed.y) - 0.33, 0.0);
    transformed.z += sin(ph) * ${A} * s * 2.0;`,
};

// One clock for all the swimmers (seconds); the aquarium sets it each frame.
export const SWIM_TIME = { value: 0 };

const built = new Map();
// The geometry and material for one species (built once, shared).
export function species(name) {
  if (built.has(name)) return built.get(name);
  const sp = SPECIES[name];
  if (!sp) throw new Error('unknown species ' + name);
  const geo = mergeGeometries(sp.build());
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const w = (sp.hz * Math.PI * 2).toFixed(3), A = sp.amp.toFixed(3);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSwim = SWIM_TIME;
    sh.vertexShader = 'uniform float uSwim;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>\n  { float ph = uSwim * ${w} + float(gl_InstanceID) * 2.39996;\n    ${BEND[sp.mode](A)} }`);
  };
  mat.customProgramCacheKey = () => `swim:${sp.mode}:${w}:${A}`;
  const out = { geo, mat, mode: sp.mode };
  built.set(name, out);
  return out;
}
