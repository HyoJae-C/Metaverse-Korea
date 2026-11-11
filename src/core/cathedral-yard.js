// Myeongdong Cathedral's hill (map landmark "cathedralyard"): the yard up on
// its terrace with red-brick retaining walls, the wide straight stairs from
// Myeongdong-gil up to the bell tower (a hand rail and lamp posts on their
// west side, a brick wall with a hedge on their east, like the real ones),
// and the grassy bank west of them with the ramp up it. The heights are
// core/cathedral-yard-ground.js (main.js walks you on them from the start);
// this is only what you see, loaded with import() when the city is built.
import * as THREE from 'three';
import { mergeStatic } from './bukchon-models.js';
import { addSnowCover } from './snow-cover.js';
import { addBrickPattern } from './brick-pattern.js';
import { yardFrame, yardHeightAt } from './cathedral-yard-ground.js';
import { pointInPoly } from './collision.js';

const mats = {};
const mat = (c, snow) => (mats[c + (snow ? 's' : '')] ||= snow ? addSnowCover(new THREE.MeshLambertMaterial({ color: c })) : bricks(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })));
const bricks = (c, m) => (c === C.brick ? addBrickPattern(m, { w: 0.48, h: 0.2, mortar: 0.035 }) : m); // the retaining walls
const C = { paving: '#d6cfc0', grass: '#8fbf6c', ramp: '#cfc6b4', brick: '#a9573f', coping: '#bdb6a8', step: '#c4beb2', metal: '#4d5156', lamp: '#2e3135', glow: '#ffe2a0', hedge: '#4f7f3f', trunk: '#6b4a32', leaf: '#5d8f4a' };

// One step on the stairs' slope (repeated n times up it): the stone tread
// lit, its front edge in shadow.
let stepTex;
function stepTexture() {
  if (stepTex) return stepTex;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = C.step; x.fillRect(0, 0, 4, 32);
  x.fillStyle = '#ddd8cd'; x.fillRect(0, 21, 4, 3);
  x.fillStyle = '#8f897d'; x.fillRect(0, 24, 4, 8);
  stepTex = new THREE.CanvasTexture(c);
  stepTex.wrapS = stepTex.wrapT = THREE.RepeatWrapping;
  stepTex.magFilter = THREE.NearestFilter;
  stepTex.colorSpace = THREE.SRGBColorSpace;
  return stepTex;
}

// Keep the part of a polygon where keep(pt) >= 0 (keep is linear in x, z).
function clip(poly, keep) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ka = keep(a), kb = keep(b);
    if (ka >= 0) out.push(a);
    if ((ka >= 0) !== (kb >= 0)) { const t = ka / (ka - kb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

export function buildYard(g, l) {
  const { h: H, cut, stairs: { a0, a1, w, n }, ramp } = l, hw = w / 2;
  const [fx, fz] = l.f, sx = -fz, sz = fx; // along the axis (towards the street), and east across it
  const P = (a, s) => [a * fx + s * sx, a * fz + s * sz];
  const A = (q) => yardFrame(l, q[0], q[1]);
  // (points cut at the kerb sit on it: a hair past it, rounding would
  // drop them to the street, tilting the terrace's corner down)
  const Y = (q) => { const [a, s] = A(q); return yardHeightAt(l, Math.min(a, cut - 1e-4), s); };
  const ry = Math.atan2(fx, fz); // turns a box's +z along the axis
  const along = (v) => (q) => v - A(q)[0], after = (v) => (q) => A(q)[0] - v; // (keep: before / after `v` along)
  const west = (v) => (q) => v - A(q)[1], east = (v) => (q) => A(q)[1] - v;

  // ---- The ground: the grounds cut into pieces, each a surface on the heights.
  const base = clip(l.yard, along(cut));
  const pieces = [
    [clip(base, along(ramp.r0)), C.paving, false], // the yard round the church
    [clip(clip(clip(base, after(ramp.r0)), along(a0)), east(-hw)), C.paving, false], // in front of the bell tower
    [clip(clip(base, after(a0)), east(hw)), C.paving, false], // the terrace east of the stairs
    [clip(clip(clip(base, after(ramp.r0)), west(-hw)), east(-hw - ramp.blend)), C.grass, true], // the bank beside the stairs
    [clip(clip(base, after(ramp.r0)), west(-hw - ramp.blend)), C.grass, true], // the bank west of them
  ];
  const surf = { [C.paving]: [], [C.grass]: [] };
  const push = (arr, q, lift) => arr.push(q[0], Y(q) + lift, q[1]);
  const tri = (arr, a, b, c, fine) => {
    const L = Math.max(Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(c[0] - a[0], c[1] - a[1]));
    if (fine && L > 1.5) { // smaller, so the slope is followed
      const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ab = m(a, b), bc = m(b, c), ca = m(c, a);
      for (const t of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) tri(arr, ...t, fine);
      return;
    }
    // (counter-clockwise from above)
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (const q of cross < 0 ? [a, b, c] : [a, c, b]) push(arr, q, 0.03);
  };
  for (const [poly, c, fine] of pieces) {
    if (poly.length < 3) continue;
    const v2 = poly.map(([x, z]) => new THREE.Vector2(x, z));
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(v2, [])) tri(surf[c], poly[i], poly[j], poly[k], fine);
  }
  for (const [c, pos] of Object.entries(surf)) {
    if (!pos.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(c, true));
    m.receiveShadow = true;
    g.add(m);
  }
  if (l.green) { // The little lawn behind the church, on the terrace, with low shrubs round it.
    const { a0: g0, a1: g1, w: gw } = l.green, lo = Math.min(g0, g1), hi = Math.max(g0, g1);
    const poly = clip(clip(clip(clip(base, after(lo)), along(hi)), east(-gw / 2)), west(gw / 2));
    if (poly.length >= 3) {
      const pos = [];
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(poly.map(([x, z]) => new THREE.Vector2(x, z)), [])) {
        const [a, b, c] = [poly[i], poly[j], poly[k]], cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        for (const q of cross < 0 ? [a, b, c] : [a, c, b]) pos.push(q[0], H + 0.06, q[1]);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat(C.grass, true));
      m.receiveShadow = true;
      g.add(m);
    }
    for (const [a, s] of [[lo + 0.8, -gw / 2 + 0.8], [lo + 0.8, gw / 2 - 0.8], [hi - 0.8, -gw / 2 + 0.8], [hi - 0.8, gw / 2 - 0.8], [(lo + hi) / 2, -gw / 2 + 0.8], [(lo + hi) / 2, gw / 2 - 0.8]]) {
      const p = P(a, s);
      if (pointInPoly(p[0], p[1], base)) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(C.hedge));
        bush.position.set(p[0], H + 0.5, p[1]);
        g.add(bush);
      }
    }
  }
  { // The ramp up the bank: paving on the real service road's line.
    const pos = [], q = (a, s) => { const p = P(a, s); return [p[0], Y(p) + 0.06, p[1]]; };
    for (let a = ramp.r0; a < cut - 0.01; a += 1) {
      const b = Math.min(cut, a + 1), s0 = ramp.side - ramp.w / 2, s1 = ramp.side + ramp.w / 2;
      const c = [q(a, s0), q(a, s1), q(b, s1), q(b, s0)];
      for (const k of [0, 2, 1, 0, 3, 2]) pos.push(...c[k]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(C.ramp, true));
    m.material.side = THREE.DoubleSide;
    m.receiveShadow = true;
    g.add(m);
  }

  // ---- Boxes (merged at the end): walls, stairs, rail, lamps, trees.
  const box = (sxz, sy, x, y, z, c, yaw = ry, pitch = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sxz[0], sy, sxz[1]), mat(c));
    m.position.set(x, y, z);
    m.rotation.set(pitch, yaw, 0, 'YXZ');
    g.add(m);
    return m;
  };
  // A wall piece from p to q (world-axis local metres), up to height top.
  const wallPiece = (p, q, top, t = 0.45) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 0.05 || top < 0.05) return;
    const yaw = Math.atan2(q[0] - p[0], q[1] - p[1]);
    box([t, L + 0.02], top, (p[0] + q[0]) / 2, top / 2, (p[1] + q[1]) / 2, C.brick, yaw);
    box([t + 0.12, L + 0.06], 0.12, (p[0] + q[0]) / 2, top + 0.06, (p[1] + q[1]) / 2, C.coping, yaw); // the stone coping
  };
  // The terrace's walls round the grounds (and along Myeongdong-gil), a
  // metre at a time, as high as the ground inside.
  for (let i = 0; i < base.length; i++) {
    const a = base[i], b = base[(i + 1) % base.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L));
    const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    for (let j = 0; j < k; j++) {
      const p = [a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k], q = [a[0] + ((b[0] - a[0]) * (j + 1)) / k, a[1] + ((b[1] - a[1]) * (j + 1)) / k];
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const inner = pointInPoly(m[0] + nx * 0.6, m[1] + nz * 0.6, base) ? [m[0] + nx * 0.6, m[1] + nz * 0.6] : [m[0] - nx * 0.6, m[1] - nz * 0.6];
      const top = Y(inner);
      if (top > 0.3) wallPiece(p, q, top + 0.15);
    }
  }
  // The stairs' east side: the tall brick wall with the hedge on top.
  wallPiece(P(a0, hw + 0.22), P(cut, hw + 0.22), H + 0.15);
  for (let a = a0 + 0.5; a < cut - 0.4; a += 1.2) box([1, 1.15], 0.8, ...xyz(P(a + 0.1, hw + 1.1), H + 0.4), C.hedge);
  function xyz([x, z], y) { return [x, y, z]; }
  // The stairs: one smooth stone slope (you walk up it without jolting),
  // the n steps painted on it; from the side, a plain diagonal.
  {
    const q = (a, s, y) => { const [x, z] = P(a, s); return [x, y, z]; };
    const tl = q(a0, -hw, H), tr = q(a0, hw, H), bl = q(a1, -hw, 0), br = q(a1, hw, 0);
    // (counter-clockwise from above, so the face looks up)
    const up = (bl[0] - tl[0]) * (br[2] - tl[2]) - (bl[2] - tl[2]) * (br[0] - tl[0]) < 0;
    const [B, Bu, R, Ru] = up ? [bl, [0, 0], br, [1, 0]] : [br, [1, 0], bl, [0, 0]];
    const T2 = up ? tr : tl, T2u = up ? [1, n] : [0, n], T1 = up ? tl : tr, T1u = up ? [0, n] : [1, n];
    const top = new THREE.BufferGeometry();
    top.setAttribute('position', new THREE.Float32BufferAttribute([...T1, ...B, ...R, ...T1, ...R, ...T2], 3));
    top.setAttribute('uv', new THREE.Float32BufferAttribute([...T1u, ...Bu, ...Ru, ...T1u, ...Ru, ...T2u], 2));
    top.computeVertexNormals();
    const m = new THREE.Mesh(top, new THREE.MeshLambertMaterial({ map: stepTexture() }));
    m.position.y = 0.02;
    g.add(m);
    // The two sides under the slope, down to the street.
    const fl = q(a0, -hw, 0), fr = q(a0, hw, 0), side = new THREE.BufferGeometry();
    side.setAttribute('position', new THREE.Float32BufferAttribute([...tl, ...fl, ...bl, ...tr, ...br, ...fr], 3));
    side.computeVertexNormals();
    const sm = new THREE.Mesh(side, mat(C.step));
    sm.material.side = THREE.DoubleSide;
    g.add(sm);
  }
  // The hand rail up their west side: posts and a sloping rail.
  const slope = Math.atan2(H, a1 - a0), railS = -hw + 0.08;
  for (let a = a0 + 0.2; a <= a1 - 0.1; a += 1.6) {
    const y = yardHeightAt(l, a, 0);
    box([0.06, 0.06], 0.95, ...xyz(P(a, railS), y + 0.47), C.metal);
  }
  {
    const len = Math.hypot(H, a1 - a0), m = P((a0 + a1) / 2, railS);
    box([0.07, len], 0.07, m[0], H / 2 + 0.92, m[1], C.metal, ry, slope);
    const m2 = P((a0 + a1) / 2, railS);
    box([0.04, len], 0.04, m2[0], H / 2 + 0.5, m2[1], C.metal, ry, slope);
  }
  // Lamp posts on the bank beside the rail, and old trees on it.
  for (const a of [a0 + 0.8, (a0 + a1) / 2, a1 - 0.6]) {
    const p = P(a, -hw - 0.9), y = Y(p);
    box([0.14, 0.14], 3.4, p[0], y + 1.7, p[1], C.lamp);
    box([0.5, 0.5], 0.12, p[0], y + 3.45, p[1], C.lamp);
    box([0.34, 0.34], 0.42, p[0], y + 3.2, p[1], C.glow).userData.noShadow = true;
  }
  for (const [a, s, sc] of [[l.ramp.r0 + 2.5, -12.5, 1], [a0 + 2, -4.2, 0.8], [(a0 + a1) / 2 + 1, -13, 1.1], [a1 - 1, -4.3, 0.75], [a1 - 2, -12, 0.9]]) {
    const p = P(a, s);
    if (!pointInPoly(p[0], p[1], base)) continue;
    const y = Y(p);
    box([0.4 * sc, 0.4 * sc], 3 * sc, p[0], y + 1.5 * sc, p[1], C.trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1 * sc, 0), mat(C.leaf));
    crown.position.set(p[0], y + 3.9 * sc, p[1]);
    g.add(crown);
  }
  mergeStatic(g);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
}
