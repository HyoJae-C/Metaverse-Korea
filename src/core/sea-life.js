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
function finish(geo, color, keepUv = false) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color' && !(k === 'uv' && keepUv)) g.deleteAttribute(k);
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
// Bodies made while a species builds: their skins are painted into one
// texture (species()), so colour patterns stay crisp instead of blurring
// between vertices.
let painting = null;
// One skin texel's worth of colour: TEX_W along the body, TEX_H around it.
const TEX_W = 256, TEX_H = 128;

function body({ x0 = -0.3, x1 = 0.5, H, W, peak = 0.5, ped = 0.25, nose = 2, cy = () => 0, hf = () => 1, under = 1, color, rings = 48, seg = 32 }) {
  const prof = (t) => { const e = envelope(t, peak, ped, nose) * hf(t); return [H * e / 2, W * e / 2, cy(t)]; };
  const at = (t, a) => { const x = lerp(x0, x1, t), [h, w, y0] = prof(t), u = Math.cos(a); return [x, y0 + h * u * (u < 0 ? under : 1), w * Math.sin(a), u]; };
  const pos = [], col = [], uv = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j <= seg; j++) { // (the seam vertex twice, for the texture)
      const [x, y, z, u] = at(t, (j / seg) * Math.PI * 2);
      pos.push(x, y, z);
      c.set(color(x, y, z, u, t));
      col.push(c.r, c.g, c.b);
      uv.push(t, j / seg);
    }
  }
  const S = seg + 1;
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * S + j, b = a + 1, d = a + S, e = b + S;
    idx.push(a, d, b, b, d, e);
  }
  const ci = pos.length / 3, [, , yc] = prof(0); // close the tail end
  pos.push(x0, yc, 0);
  c.set(color(x0, yc, 0, 0, 0));
  col.push(c.r, c.g, c.b);
  uv.push(0, 0.5);
  for (let j = 0; j < seg; j++) idx.push(ci, j + 1, j);
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo = geo.toNonIndexed();
  const skin = { geo, paint(img, row) { // fill TEX_W x TEX_H texels from `row` down
    for (let j = 0; j < TEX_H; j++) for (let i = 0; i < TEX_W; i++) {
      const t = (i + 0.5) / TEX_W, [x, y, z, u] = at(t, ((j + 0.5) / TEX_H) * Math.PI * 2);
      c.set(color(x, y, z, u, t));
      const k = ((row + j) * TEX_W + i) * 4, s = c.getRGB({}, THREE.SRGBColorSpace);
      img[k] = s.r * 255; img[k + 1] = s.g * 255; img[k + 2] = s.b * 255; img[k + 3] = 255;
    }
  } };
  painting?.push(skin);
  return {
    geo,
    // a point on the skin: at x, at height u (1 top .. -1 bottom), on one side
    surf(x, u, side = 1) {
      const [h, w, y0] = prof(clamp01((x - x0) / (x1 - x0)));
      return [x, y0 + h * u * (u < 0 ? under : 1), w * side * Math.sqrt(Math.max(0, 1 - u * u))];
    },
  };
}

// A fin from an outline [[x, y], ...] in the side view, root first and last
// (the edge that joins the body): rounded off, given a little thickness, and
// shaded from `color` at the root to `tip` at the edge with faint rays.
// Turned by (rx, ry, rz), then moved to `at`. `edge`: a darker rim.
function fin(pts, color, { rx = 0, ry = 0, rz = 0, at = [0, 0, 0], edge = null, tip = null, sharp = false, rays = true, thick = 0.007, lift = 0 } = {}) {
  const outline = sharp ? pts.map(([x, y]) => new THREE.Vector2(x, y))
    : new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal', 0.5).getPoints(Math.max(24, pts.length * 6)).map((p) => new THREE.Vector2(p.x, p.y));
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: thick, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -thick / 2 + lift);
  const g = finish(geo);
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], rx0 = (ax + bx) / 2, ry0 = (ay + by) / 2;
  let far = 1e-6;
  for (const [x, y] of pts) far = Math.max(far, Math.hypot(x - rx0, y - ry0));
  const c0 = new THREE.Color(color), c1 = new THREE.Color(tip || mix(color, '#ffffff', 0.15)), ce = edge ? new THREE.Color(edge) : null;
  const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i) - rx0, dy = p.getY(i) - ry0, k = clamp01(Math.hypot(dx, dy) / far);
    c.copy(c0).lerp(c1, smooth(0.15, 1, k));
    if (rays && k > 0.25 && Math.sin(Math.atan2(dy, dx) * 26) > 0.55) c.multiplyScalar(0.88);
    if (ce && k > 0.86) c.copy(ce);
    a.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(...at));
  return [g];
}

// A fin lying flat (flukes, flippers): outline in the top view [[x, z], ...].
function flatFin(pts, color, at = [0, 0, 0], opts = {}) {
  return fin(pts.map(([x, z]) => [x, -z]), color, { rx: -Math.PI / 2, at, rays: false, ...opts });
}

function ball(r, color, [x, y, z], s = [1, 1, 1], seg = 10) {
  return finish(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.7)).scale(...s).translate(x, y, z), color);
}

function rod([ax, ay, az], [bx, by, bz], r0, r1, color) {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz), d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return finish(g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), color);
}

// Both eyes, on the skin at (x, u): big and round, the friendly way the
// game's people are drawn: a white, a coloured ring, a dark pupil and a
// highlight that catches the light.
function eyes(b, x, u, r, ring = '#3a2a1a', pupil = '#0d0f12') {
  const out = [];
  for (const side of [-1, 1]) {
    const [px, py, pz] = b.surf(x, u, side), o = side * r;
    out.push(ball(r, '#f7f8f6', [px, py, pz - o * 0.3], [1, 1, 0.75], 14),
      ball(r * 0.74, ring, [px + r * 0.08, py, pz + o * 0.2], [1, 1, 0.6], 12),
      ball(r * 0.48, pupil, [px + r * 0.12, py, pz + o * 0.34], [1, 1, 0.5], 10),
      ball(r * 0.2, '#ffffff', [px + r * 0.32, py + r * 0.3, pz + o * 0.5], [1, 1, 0.5], 6));
  }
  return out;
}

// A small smiling mouth at the nose: a dark crescent either side.
function mouth(b, x, u, w = 0.04, color = '#3a2420') {
  const out = [];
  for (const side of [-1, 1]) {
    const [px, py, pz] = b.surf(x, u, side);
    out.push(rod([px + w * 0.15, py, pz], [px - w * 0.6, py + w * 0.18, pz - side * w * 0.2], w * 0.09, w * 0.06, color));
  }
  return out;
}

// Pectoral fins: an outline hanging from the shoulder (side view, relative
// to the root), splayed out from the body by `spread`.
function pectorals(pts, color, x, y, z, spread = 0.7, opts = {}) {
  return [-1, 1].flatMap((s) => fin(pts, color, { thick: 0.005, ...opts, rx: -s * spread, ry: s * 0.35, rz: 0.35, at: [x, y, s * z] }));
}
// A soft-edged band test: 1 inside (a, c), fading over `soft` at the edges.
const inBand = (v, a, c, soft = 0.012) => smooth(a - soft, a + soft, v) * (1 - smooth(c - soft, c + soft, v));

// For core/tank-species.js, which draws the rest of the fishing catalogue
// the same way.
export const parts = { lerp, clamp01, smooth, mix, finish, body, fin, flatFin, ball, rod, eyes, mouth, pectorals, inBand };

// ---- the species ----
// Each builds its parts; `mode` is how it swims (see BEND), `hz` how fast
// its tail beats and `amp` how far. Drawn a little rounder than life, with
// big eyes and soft colour edges, to sit with the game's people (Yozi
// 2026-11-17: the first models looked rough).
const SPECIES = {
  // Clownfish (Amphiprion ocellaris): orange, three white bands edged in
  // black (behind the eye, mid-body, at the tail stalk), black-rimmed fins.
  clownfish: { mode: 'fish', hz: 9, amp: 0.07, build() {
    const bands = [[0.17, 0.27], [-0.05, 0.07], [-0.28, -0.21]];
    const b = body({ x0: -0.3, H: 0.46, W: 0.26, peak: 0.55, ped: 0.34, nose: 2.4, color: (x, y, z, u) => {
      const xc = x + 0.05 * u * u; // the bands bow forward at the middle
      let white = 0, black = 0;
      for (const [a, c] of bands) { white = Math.max(white, inBand(xc, a, c, 0.006)); black = Math.max(black, inBand(xc, a - 0.022, c + 0.022, 0.005)); }
      const base = mix('#ff6f0a', '#ffa64d', smooth(0.1, -0.9, u));
      return base.lerp(new THREE.Color('#1a1210'), black - white).lerp(new THREE.Color('#fdfdf8'), white);
    } });
    return [b.geo, ...eyes(b, 0.36, 0.28, 0.062, '#e8661a'), ...mouth(b, 0.47, -0.2, 0.05),
      ...fin([[-0.22, 0.12], [-0.2, 0.24], [-0.1, 0.28], [-0.02, 0.24], [0.06, 0.3], [0.18, 0.25], [0.22, 0.17]], '#ff7a12', { edge: '#1a1210' }),
      ...fin([[-0.2, -0.1], [-0.17, -0.23], [-0.07, -0.24], [-0.02, -0.11]], '#ff7a12', { edge: '#1a1210' }),
      ...fin([[-0.26, 0.04], [-0.4, 0.16], [-0.5, 0.13], [-0.53, 0], [-0.5, -0.13], [-0.4, -0.16], [-0.26, -0.04]], '#ff7a12', { edge: '#1a1210' }),
      ...pectorals([[0, 0], [0.02, -0.12], [-0.07, -0.15], [-0.09, -0.04]], '#ff8a2a', 0.22, -0.06, 0.1, 0.7, { edge: '#1a1210' })];
  } },
  // Blue tang (Paracanthurus hepatus): royal blue, the black "palette" band
  // from the eye to the tail with its loop, a yellow tail.
  bluetang: { mode: 'fish', hz: 7, amp: 0.06, build() {
    const b = body({ x0: -0.28, H: 0.56, W: 0.2, peak: 0.5, ped: 0.24, nose: 1.8, color: (x, y) => {
      const base = mix('#3a86ff', '#1d55d0', smooth(-0.1, 0.25, y));
      const yc = 0.04 + 0.1 * Math.sin(Math.PI * clamp01((x + 0.26) / 0.6));
      let k = inBand(y - yc, -0.04, 0.04, 0.01) * inBand(x, -0.25, 0.3, 0.02);
      const e = Math.sqrt(((x + 0.02) / 0.15) ** 2 + ((y - 0.08) / 0.09) ** 2);
      if (y < yc) k = Math.max(k, inBand(e, 0.72, 1.08, 0.05));
      return base.lerp(new THREE.Color('#10183a'), k);
    } });
    return [b.geo, ...eyes(b, 0.35, 0.22, 0.06, '#2a4a9a'), ...mouth(b, 0.46, -0.15, 0.045),
      ...fin([[-0.24, 0.1], [-0.22, 0.22], [-0.02, 0.34], [0.2, 0.3], [0.28, 0.15]], '#2a6cf0', { edge: '#10183a' }),
      ...fin([[-0.22, -0.08], [-0.2, -0.2], [0, -0.32], [0.12, -0.26], [0.15, -0.12]], '#2a6cf0', { edge: '#10183a' }),
      ...fin([[-0.26, 0.04], [-0.48, 0.18], [-0.43, 0], [-0.48, -0.18], [-0.26, -0.04]], '#ffd21f', { edge: '#10183a', sharp: true }),
      ...pectorals([[0, 0], [0.01, -0.11], [-0.07, -0.13], [-0.08, -0.03]], '#ffd84a', 0.22, -0.06, 0.08)];
  } },
  // Yellow tang (Zebrasoma flavescens): a tall bright-yellow disc with high
  // fins, a pointed snout and a white spine by the tail.
  yellowtang: { mode: 'fish', hz: 6, amp: 0.05, build() {
    const b = body({ x0: -0.25, H: 0.72, W: 0.17, peak: 0.45, ped: 0.22, nose: 1.5, cy: (t) => -0.05 * smooth(0.75, 1, t), color: (x, y, z, u) => {
      const base = mix('#ffd60a', '#fff2a8', smooth(-0.3, -0.9, u));
      return base.lerp(new THREE.Color('#ffffff'), inBand(x, -0.235, -0.18, 0.01) * inBand(y, -0.02, 0.04, 0.01));
    } });
    return [b.geo, ...eyes(b, 0.29, 0.38, 0.06, '#3a2a10'), ...mouth(b, 0.47, -0.1, 0.04),
      ...fin([[-0.22, 0.12], [-0.2, 0.32], [0, 0.48], [0.15, 0.4], [0.25, 0.22]], '#ffcf00'),
      ...fin([[-0.2, -0.12], [-0.18, -0.3], [0, -0.44], [0.12, -0.33], [0.15, -0.16]], '#ffcf00'),
      ...fin([[-0.23, 0.04], [-0.45, 0.16], [-0.42, 0], [-0.45, -0.16], [-0.23, -0.04]], '#ffcf00'),
      ...pectorals([[0, 0], [0.01, -0.1], [-0.06, -0.12], [-0.07, -0.03]], '#fff1a0', 0.18, -0.07, 0.07)];
  } },
  // Sardine (Sardinops melanostictus): a slim silver fish, dark blue back,
  // a row of dark spots, a deeply forked tail.
  sardine: { mode: 'fish', hz: 12, amp: 0.06, build() {
    const b = body({ x0: -0.32, H: 0.22, W: 0.16, peak: 0.52, ped: 0.24, nose: 2, color: (x, y, z, u) => {
      const base = u < -0.2 ? mix('#dfe6ec', '#f8fafc', smooth(-0.2, -0.6, u)) : mix('#dfe6ec', '#2a5a8c', smooth(0.15, 0.55, u));
      const spot = Math.sqrt(((((x + 0.12) % 0.07) + 0.07) % 0.07 - 0.035) ** 2 / 0.0003 + (u - 0.15) ** 2 / 0.012);
      return x > -0.12 && x < 0.28 ? base.lerp(new THREE.Color('#203556'), 1 - smooth(0.7, 1, spot)) : base;
    } });
    return [b.geo, ...eyes(b, 0.39, 0.12, 0.05, '#7a8a9a'), ...mouth(b, 0.48, -0.1, 0.03),
      ...fin([[-0.02, 0.08], [0.04, 0.17], [0.12, 0.08]], '#6f8daa'),
      ...fin([[-0.3, 0.02], [-0.51, 0.14], [-0.43, 0], [-0.51, -0.14], [-0.3, -0.02]], '#6f8aa5', { sharp: true, tip: '#a8bccc' }),
      ...pectorals([[0, 0], [-0.02, -0.07], [-0.08, -0.07]], '#c6d2dc', 0.3, -0.04, 0.06, 1.1)];
  } },
  // Yellowtail amberjack (Seriola, 부시리): blue-grey back, silver belly, a
  // yellow stripe nose to tail and a yellow forked tail.
  yellowtail: { mode: 'fish', hz: 8, amp: 0.05, build() {
    const b = body({ x0: -0.3, H: 0.25, W: 0.17, peak: 0.48, ped: 0.18, nose: 2.1, color: (x, y, z, u) => {
      const base = u < -0.3 ? mix('#e8edf1', '#f8fafb', smooth(-0.3, -0.7, u)) : mix('#d4dde4', '#3f6488', smooth(0.25, 0.6, u));
      return base.lerp(new THREE.Color('#f5c534'), inBand(u, 0.0, 0.22, 0.05) * (x < 0.42 ? 1 : 0));
    } });
    return [b.geo, ...eyes(b, 0.39, 0.2, 0.048, '#6a5a2a'), ...mouth(b, 0.48, -0.12, 0.035),
      ...fin([[0.08, 0.1], [0.11, 0.15], [0.17, 0.1]], '#4a6178'),
      ...fin([[-0.25, 0.07], [-0.22, 0.13], [0.06, 0.16], [0.08, 0.1]], '#8a9a8a', { tip: '#f5c534' }),
      ...fin([[-0.24, -0.06], [-0.21, -0.12], [-0.04, -0.14], [-0.02, -0.08]], '#d9c060'),
      ...fin([[-0.29, 0.02], [-0.53, 0.19], [-0.44, 0], [-0.53, -0.19], [-0.29, -0.02]], '#f2c230', { sharp: true }),
      ...pectorals([[0, 0], [-0.03, -0.07], [-0.1, -0.07]], '#e0ca70', 0.26, -0.04, 0.07, 1.1)];
  } },
  // Carp (잉어): bronze, a darker back and golden belly, a long dorsal fin,
  // reddish-brown fins and the whiskers (barbels) by the mouth.
  carp: { mode: 'fish', hz: 5, amp: 0.06, build() {
    const b = body({ x0: -0.28, H: 0.32, W: 0.23, peak: 0.55, ped: 0.32, nose: 1.9, color: (x, y, z, u, t) => {
      const c = u > 0 ? mix('#c4963e', '#6a5022', smooth(0.1, 0.8, u)) : mix('#c4963e', '#f0d488', smooth(0, -0.7, u));
      const sc = Math.sin(t * 70 + (u > 0 ? 0 : 1.5)) * Math.sin(u * 8 + t * 20); // the big scales, a soft net
      return c.multiplyScalar(1 + 0.07 * smooth(0.4, 0.9, Math.abs(sc)) * (x < 0.3 ? 1 : 0));
    } });
    const out = [b.geo, ...eyes(b, 0.37, 0.25, 0.05, '#c9a050'), ...mouth(b, 0.48, -0.12, 0.04),
      ...fin([[-0.18, 0.12], [-0.14, 0.22], [0.12, 0.27], [0.16, 0.15]], '#9a6430'),
      ...fin([[-0.2, -0.1], [-0.17, -0.19], [-0.1, -0.18], [-0.08, -0.08]], '#b0603a'),
      ...fin([[-0.27, 0.03], [-0.5, 0.17], [-0.43, 0], [-0.5, -0.17], [-0.27, -0.03]], '#9a6430', { sharp: true, tip: '#c08050' }),
      ...pectorals([[0, 0], [-0.02, -0.1], [-0.09, -0.1]], '#b0603a', 0.26, -0.09, 0.09, 1)];
    for (const s of [-1, 1]) out.push(rod([0.47, -0.05, s * 0.04], [0.52, -0.11, s * 0.06], 0.008, 0.004, '#7a5a28'));
    return out;
  } },
  // Pale chub (피라미, Zacco platypus): silver with blue-green bars down the
  // sides and the breeding male's pink-orange fins.
  chub: { mode: 'fish', hz: 11, amp: 0.07, build() {
    const b = body({ x0: -0.3, H: 0.22, W: 0.15, peak: 0.5, ped: 0.24, nose: 2, color: (x, y, z, u) => {
      const base = mix('#d8e0e4', '#5f8486', smooth(0.3, 0.8, u));
      const bar = smooth(0.15, 0.55, Math.sin((x + 0.2) * 45)) * inBand(x, -0.27, 0.3, 0.03) * inBand(u, -0.55, 0.75, 0.15);
      return base.lerp(new THREE.Color('#4d8ca8'), 0.65 * bar).lerp(new THREE.Color('#f6c4b4'), 0.5 * smooth(-0.4, -0.7, u));
    } });
    return [b.geo, ...eyes(b, 0.38, 0.18, 0.048, '#d89080'), ...mouth(b, 0.48, -0.12, 0.03),
      ...fin([[-0.02, 0.08], [0.02, 0.17], [0.1, 0.08]], '#9fb0b4'),
      ...fin([[-0.22, -0.06], [-0.2, -0.18], [-0.06, -0.15], [-0.04, -0.07]], '#f08a70'),
      ...fin([[-0.29, 0.02], [-0.5, 0.14], [-0.43, 0], [-0.5, -0.14], [-0.29, -0.02]], '#b6c0c4', { sharp: true }),
      ...pectorals([[0, 0], [-0.02, -0.08], [-0.08, -0.08]], '#f0a088', 0.28, -0.05, 0.06, 1)];
  } },
  // Chum salmon (연어) back in the river to spawn: olive back, purple-red
  // tiger bars, dark fins, a hooked jaw and the little adipose fin.
  salmon: { mode: 'fish', hz: 6, amp: 0.06, build() {
    const b = body({ x0: -0.3, H: 0.27, W: 0.18, peak: 0.5, ped: 0.2, nose: 2, cy: (t) => -0.02 * smooth(0.85, 1, t), color: (x, y, z, u) => {
      const base = u > 0.2 ? mix('#94a48e', '#465a3a', smooth(0.2, 0.8, u)) : mix('#94a48e', '#eeeee4', smooth(-0.2, -0.8, u));
      const bar = smooth(0.1, 0.6, Math.sin((x + 0.1) * 32 + u * 2)) * inBand(x, -0.25, 0.3, 0.03) * inBand(u, -0.55, 0.45, 0.12);
      return base.lerp(new THREE.Color('#a24a68'), 0.7 * bar);
    } });
    return [b.geo, ...eyes(b, 0.39, 0.22, 0.044, '#a89a70'), ...mouth(b, 0.48, -0.15, 0.04),
      ...fin([[-0.04, 0.12], [0.01, 0.22], [0.1, 0.12]], '#4a5248'),
      ...fin([[-0.24, 0.08], [-0.22, 0.13], [-0.19, 0.08]], '#4a5248'), // the adipose fin
      ...fin([[-0.22, -0.07], [-0.19, -0.17], [-0.1, -0.16], [-0.09, -0.07]], '#545a54', { edge: '#e8e8e0' }),
      ...fin([[-0.29, 0.03], [-0.5, 0.17], [-0.45, 0], [-0.5, -0.17], [-0.29, -0.03]], '#56625a', { sharp: true }),
      ...pectorals([[0, 0], [-0.02, -0.09], [-0.09, -0.09]], '#545a54', 0.28, -0.07, 0.07, 1)];
  } },
  // Threadfin butterflyfish (Chaetodon auriga): a white-and-yellow disc, a
  // black band through the eye, a black eyespot on the dorsal fin, a snout.
  butterfly: { mode: 'fish', hz: 6, amp: 0.05, build() {
    const b = body({ x0: -0.24, H: 0.62, W: 0.16, peak: 0.48, ped: 0.25, nose: 1.45, cy: (t) => -0.04 * smooth(0.8, 1, t), color: (x, y) => {
      const c = mix('#ffcf2e', '#f8f4ea', smooth(-0.12, 0.12, x));
      const chev = smooth(0.6, 0.9, Math.sin((x + y) * 38)) * (1 - smooth(0.2, 0.3, x));
      return c.multiplyScalar(1 - 0.12 * chev).lerp(new THREE.Color('#17140f'), inBand(x - 0.33 - 0.05 * y, -0.028, 0.028, 0.008));
    } });
    return [b.geo, ...eyes(b, 0.33, 0.3, 0.05, '#17140f'), ...mouth(b, 0.47, -0.08, 0.035),
      ...fin([[-0.2, 0.12], [-0.18, 0.33], [0.05, 0.38], [0.22, 0.24], [0.24, 0.18]], '#ffcf2e'),
      ...fin([[-0.17, 0.25], [-0.15, 0.29], [-0.11, 0.27], [-0.13, 0.23]], '#17140f', { lift: 0.006, rays: false }),
      ...fin([[-0.17, 0.25], [-0.15, 0.29], [-0.11, 0.27], [-0.13, 0.23]], '#17140f', { lift: -0.006, rays: false }),
      ...fin([[-0.2, -0.12], [-0.18, -0.29], [0, -0.34], [0.12, -0.22], [0.14, -0.14]], '#ffcf2e'),
      ...fin([[-0.22, 0.04], [-0.38, 0.13], [-0.4, 0], [-0.38, -0.13], [-0.22, -0.04]], '#ffe07a'),
      ...pectorals([[0, 0], [0.01, -0.09], [-0.06, -0.1]], '#f6f2e6', 0.2, -0.07, 0.07)];
  } },
  // Blacktip reef shark: grey above, white below, a tall swept dorsal fin
  // with a black tip, big pectorals and the long upper lobe of the tail.
  shark: { mode: 'fish', hz: 2.6, amp: 0.07, build() {
    const b = body({ x0: -0.25, H: 0.21, W: 0.2, peak: 0.58, ped: 0.18, nose: 2.6, color: (x, y, z, u) => {
      const base = mix('#f2f4f5', '#7a8894', smooth(-0.3, 0.05, u));
      const gill = smooth(0.4, 0.8, Math.sin(x * 160)) * inBand(x, 0.24, 0.33, 0.005) * inBand(u, -0.3, 0.35, 0.05);
      return base.lerp(new THREE.Color('#4e5962'), 0.8 * gill);
    } });
    const grey = '#7a8894', tip = '#15181b';
    return [b.geo, ...eyes(b, 0.37, 0.22, 0.03, '#2a2f33'), ...mouth(b, 0.42, -0.45, 0.06, '#5a5258'),
      ...fin([[0.16, 0.08], [0.02, 0.3], [-0.01, 0.29], [0.02, 0.17], [-0.04, 0.08]], grey, { tip: '#15181b', rays: false }),
      ...fin([[-0.19, 0.05], [-0.21, 0.1], [-0.15, 0.05]], grey, { rays: false }),
      ...fin([[-0.17, -0.05], [-0.19, -0.09], [-0.13, -0.05]], '#c9d0d5', { rays: false }),
      ...fin([[-0.22, 0.03], [-0.5, 0.22], [-0.46, 0.14], [-0.4, 0.01], [-0.44, -0.12], [-0.3, -0.04]], grey, { tip, rays: false, sharp: true }),
      ...pectorals([[0, 0], [-0.1, -0.22], [-0.14, -0.2], [-0.1, 0]], '#8a96a0', 0.2, -0.06, 0.07, 1.1, { tip: '#3a4248', rays: false })];
  } },
  // Manta ray: wide swept wings, black on top with white shoulder patches,
  // white below; the two horn-like head fins and a whip of a tail.
  manta: { mode: 'ray', hz: 1.1, amp: 0.4, build() {
    // Grid over the disc: v across (-1 left tip .. 1 right tip), p from the
    // trailing edge (concave) to the leading edge (convex, the head in front).
    const P = 20, V = 40, pos = [], col = [], idx = [], c = new THREE.Color();
    for (const top of [true, false]) {
      const o = pos.length / 3;
      for (let i = 0; i <= P; i++) {
        const p = i / P;
        for (let j = 0; j <= V; j++) {
          const v = (j / V) * 2 - 1, av = Math.abs(v);
          const xl = 0.32 - 0.42 * Math.pow(av, 1.25), xt = -0.22 + 0.12 * Math.sqrt(av);
          const x = lerp(xt, xl, p), z = v * 0.62;
          const k = Math.pow(Math.max(0, 1 - v * v), 1.5) * Math.pow(Math.sin(Math.PI * p), 0.5);
          const y = (top ? 0.08 : -0.04) * k - 0.03 * v ** 4;
          pos.push(x, y, z);
          const patch = smooth(0.3, 0.45, p) * inBand(av, 0.16, 0.16 + 0.3 * Math.max(0, p - 0.35), 0.03);
          if (top) c.set('#1e2530').lerp(new THREE.Color('#e3e8ec'), patch);
          else c.set('#f2f4f6').lerp(new THREE.Color('#5a636b'), Math.max(smooth(0.8, 0.95, av), 1 - smooth(0.02, 0.1, p)));
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
    const out = [finish(geo), rod([-0.18, 0, 0], [-0.62, 0.01, 0], 0.014, 0.003, '#1e2530')];
    for (const s of [-1, 1]) {
      out.push(...fin([[0, 0.012], [0.1, 0.01], [0.13, -0.03], [0.1, -0.05], [0.02, -0.045]], '#1e2530', { at: [0.31, 0, s * 0.1], ry: -s * 0.3, rays: false }));
      out.push(ball(0.026, '#f7f8f6', [0.27, 0.025, s * 0.14], [1, 1, 0.8], 12), ball(0.016, '#0d0f12', [0.282, 0.03, s * 0.152], [1, 1, 0.6], 8), ball(0.006, '#ffffff', [0.29, 0.04, s * 0.162], [1, 1, 1], 6));
    }
    return out;
  } },
  // Green sea turtle: a domed shell of scutes, a pale underside, a small
  // head and long front flippers.
  turtle: { mode: 'turtle', hz: 1.2, amp: 0.25, build() {
    const shell = body({ x0: -0.3, x1: 0.3, H: 0.26, W: 0.5, peak: 0.45, ped: 0.3, nose: 1.6, under: 0.35, color: (x, y, z, u) => {
      if (u < -0.1) return mix('#cdbb7a', '#efe2a8', smooth(-0.1, -0.3, u));
      const a = Math.atan2(z, y);
      const seam = Math.max(1 - smooth(0.08, 0.2, Math.abs(Math.sin(x * 19))), 1 - smooth(0.06, 0.16, Math.abs(Math.sin(a * 4.5))));
      const rim = 1 - smooth(-0.05, 0.12, u);
      return mix('#6f5e34', '#a48c50', 0.5 + 0.5 * Math.sin(x * 30 + a * 6)).lerp(new THREE.Color('#3e341f'), 0.85 * seam).lerp(new THREE.Color('#cdbb7a'), rim);
    } });
    const head = body({ x0: 0.22, x1: 0.48, H: 0.14, W: 0.14, peak: 0.55, ped: 0.75, nose: 2.6, cy: () => 0.01, color: (x, y, z, u) => (u < -0.3 ? '#dcd49e' : mix('#6a7840', '#4a5628', smooth(0.3, 0.7, Math.sin(x * 110) * Math.sin(u * 12)))) });
    const skin = '#627040';
    return [shell.geo, head.geo, ...eyes(head, 0.42, 0.25, 0.026, '#3a3020'), ...mouth(head, 0.475, -0.2, 0.03),
      ...[-1, 1].flatMap((s) => flatFin([[0.18, s * 0.2], [0.12, s * 0.62], [0.04, s * 0.67], [0.05, s * 0.5], [0.08, s * 0.2]], skin, [0, -0.02, 0], { thick: 0.02 })),
      ...[-1, 1].flatMap((s) => flatFin([[-0.2, s * 0.15], [-0.3, s * 0.3], [-0.37, s * 0.25], [-0.28, s * 0.12]], skin, [0, -0.02, 0], { thick: 0.02 })),
      rod([-0.29, -0.01, 0], [-0.36, -0.02, 0], 0.025, 0.006, skin)];
  } },
  // Bottlenose dolphin: grey, darker cape, pale belly; the melon and short
  // beak, a curved dorsal fin, flippers and flat tail flukes.
  dolphin: { mode: 'whale', hz: 2.2, amp: 0.07, build() {
    const b = body({ x0: -0.32, H: 0.21, W: 0.2, peak: 0.48, ped: 0.15, nose: 1.7,
      hf: (t) => lerp(1, 0.45, smooth(0.86, 0.92, t)), cy: (t) => -0.025 * smooth(0.86, 1, t),
      color: (x, y, z, u) => (u < -0.3 ? mix('#93a3b2', '#eef1f4', smooth(-0.3, -0.6, u)) : mix('#93a3b2', '#5a6c80', smooth(0.3, 0.8, u))) });
    const grey = '#63748a';
    return [b.geo, ...eyes(b, 0.36, 0.06, 0.024, '#2a3036'), ...mouth(b, 0.47, -0.25, 0.06, '#4a5866'),
      ...fin([[0.06, 0.08], [-0.04, 0.21], [-0.09, 0.21], [-0.05, 0.14], [-0.09, 0.08]], grey, { rays: false, thick: 0.014 }),
      ...flatFin([[-0.3, 0], [-0.43, 0.16], [-0.5, 0.17], [-0.45, 0.05], [-0.47, 0], [-0.45, -0.05], [-0.5, -0.17], [-0.43, -0.16]], grey, [0, 0, 0], { thick: 0.014 }),
      ...pectorals([[0, 0], [-0.05, -0.12], [-0.09, -0.11], [-0.05, 0]], grey, 0.22, -0.06, 0.08, 0.9, { rays: false, thick: 0.012 })];
  } },
  // Orca: black with the white eye patch, white chin and belly, a grey
  // saddle behind the very tall dorsal fin, paddle-shaped flippers.
  orca: { mode: 'whale', hz: 1.8, amp: 0.06, build() {
    const W2 = new THREE.Color('#f4f6f7');
    const b = body({ x0: -0.3, H: 0.25, W: 0.22, peak: 0.5, ped: 0.15, nose: 1.9, rings: 56, seg: 32, color: (x, y, z, u) => {
      let w = 1 - smooth(0.8, 1.05, Math.sqrt(((x - 0.29) / 0.07) ** 2 + ((u - 0.24) / 0.2) ** 2)); // eye patch
      w = Math.max(w, smooth(-0.38, -0.5, u) * smooth(-0.12, -0.08, x)); // chin and belly
      w = Math.max(w, smooth(-0.02, -0.12, u + 0.6 * smooth(-0.24, -0.1, x) * smooth(-0.02, -0.12, x)) * inBand(x, -0.24, -0.02, 0.02)); // the flank lobe
      const saddle = smooth(0.66, 0.78, u) * inBand(x, -0.14, 0.0, 0.03);
      return new THREE.Color('#15181c').lerp(new THREE.Color('#5d6670'), saddle).lerp(W2, w);
    } });
    return [b.geo, ...eyes(b, 0.355, 0.1, 0.02, '#15181c'), ...mouth(b, 0.47, -0.25, 0.06, '#2a2a30'),
      ...fin([[0.08, 0.11], [0.015, 0.42], [-0.015, 0.42], [-0.06, 0.11]], '#15181c', { rays: false, thick: 0.014, tip: '#22262c' }),
      ...flatFin([[-0.28, 0], [-0.42, 0.17], [-0.49, 0.18], [-0.44, 0.05], [-0.46, 0], [-0.44, -0.05], [-0.49, -0.18], [-0.42, -0.17]], '#15181c', [0, 0, 0], { thick: 0.014, tip: '#22262c' }),
      ...pectorals([[0, 0], [-0.02, -0.15], [-0.08, -0.17], [-0.11, -0.1], [-0.06, 0]], '#15181c', 0.22, -0.08, 0.09, 0.9, { rays: false, thick: 0.014, tip: '#22262c' })];
  } },
  // Ocean sunfish (mola): a tall round disc cut off behind, the long dorsal
  // and anal fins it swims with, and the frilly clavus for a tail.
  sunfish: { mode: 'mola', hz: 1.1, amp: 0.22, build() {
    const b = body({ x0: -0.38, H: 0.85, W: 0.24, peak: 0.4, ped: 0.75, nose: 1.8, color: (x, y, z, u) => {
      const c = mix('#c4ced4', '#7e8c96', smooth(0.2, 0.9, u));
      return c.multiplyScalar(1 + 0.06 * Math.sin(x * 26 + u * 7) * Math.sin(u * 11));
    } });
    return [b.geo, ...eyes(b, 0.3, 0.16, 0.05, '#7a8a96'), ...mouth(b, 0.48, -0.02, 0.04, '#5a6670'),
      ...fin([[-0.25, 0.28], [-0.33, 0.8], [-0.22, 0.82], [-0.08, 0.33]], '#8d9aa2', { rays: false }),
      ...fin([[-0.25, -0.28], [-0.33, -0.8], [-0.22, -0.82], [-0.08, -0.33]], '#9aa6ad', { rays: false }),
      ...fin([[-0.36, 0.3], [-0.45, 0.26], [-0.49, 0.15], [-0.47, 0.05], [-0.5, -0.05], [-0.48, -0.15], [-0.45, -0.26], [-0.36, -0.3]], '#a3aeb5', { thick: 0.03 }),
      ...pectorals([[0, 0], [-0.02, -0.08], [-0.08, -0.07]], '#9aa6ad', 0.22, 0.0, 0.1, 1.2)];
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
  // something on the sand (a crab, a starfish): only breathes a little
  still: (A) => `transformed.y += sin(ph) * ${A} * 0.02;`,
  // a water plant, standing up from y = 0: sways more toward the top
  sway: (A) => `transformed.x += sin(ph + transformed.y * 3.0) * ${A} * transformed.y * transformed.y;`,
  // a jellyfish's bell squeezes and its tentacles trail
  jelly: (A) => `float top = smoothstep(-0.1, 0.1, transformed.y);
    transformed.xz *= 1.0 + sin(ph) * ${A} * top;
    transformed.x += sin(ph - transformed.y * 5.0) * ${A} * 0.3 * (1.0 - top);`,
  // an octopus's arms (below y = 0) wave
  octo: (A) => `float k = clamp(-transformed.y / 0.45, 0.0, 1.0);
    transformed.x += sin(ph + transformed.z * 9.0 - transformed.y * 8.0) * ${A} * k;
    transformed.z += cos(ph + transformed.x * 9.0 - transformed.y * 8.0) * ${A} * k;`,
};

// One clock for all the swimmers (seconds); the aquarium sets it each frame.
export const SWIM_TIME = { value: 0 };

// More kinds (core/tank-species.js, the fishing catalogue) join here.
export function addSpecies(more) { Object.assign(SPECIES, more); }
export const hasSpecies = (name) => !!SPECIES[name];

const built = new Map();
// The geometry and material for one species (built once, shared).
export function species(name) {
  if (built.has(name)) return built.get(name);
  const sp = SPECIES[name];
  if (!sp) throw new Error('unknown species ' + name);
  const skins = painting = [];
  let parts;
  try { parts = sp.build(); } finally { painting = null; }
  // One texture for the skins, one row of TEX_H texels each, and a white
  // strip at the bottom that every other part (fins, eyes) reads, so they
  // keep their vertex colours.
  const H = skins.length * TEX_H + 4;
  let map = null;
  if (globalThis.document) {
    const cv = document.createElement('canvas');
    cv.width = TEX_W; cv.height = H;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(TEX_W, H);
    img.data.fill(255);
    skins.forEach((sk, i) => sk.paint(img.data, i * TEX_H));
    ctx.putImageData(img, 0, 0);
    map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false;
    map.wrapS = THREE.ClampToEdgeWrapping;
  }
  const white = (H - 2) / H;
  for (const g of parts) {
    const k = skins.findIndex((sk) => sk.geo === g);
    const n = g.attributes.position.count;
    if (k < 0) { g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2).map((_, i) => (i % 2 ? white : 0.5)), 2)); continue; }
    const uv = g.attributes.uv;
    for (let i = 0; i < n; i++) uv.setY(i, (k * TEX_H + 0.5 + uv.getY(i) * (TEX_H - 1)) / H);
    if (map) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3)); // (the texture has the colour)
  }
  const geo = mergeGeometries(parts);
  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, map, side: THREE.DoubleSide, shininess: 45, specular: 0x2a2a2a });
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
