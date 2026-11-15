// Our characters' face on the city's statues (Yozi 2026-11-15: every statue
// with a face, except the Seoul Forest ice creams, gets our character's face).
// The head of the pack's basic model (the same eyes, brows, nose and mouth
// every player has), without its scalp hair (a statue's crown, helmet or
// curls sits on top), cast in the statue's own material: each part of the
// face keeps its atlas cell's light-to-dark shading, painted in the
// statue's colours (skin: the metal or paint, hair: brows and lashes, eyes).
// The model file is the one every player already downloads, so this costs
// no extra download; the statues that use it load with import() anyway.
import * as THREE from 'three';
import { PACK } from '../data/characters/index.js';
import { loadPackModel } from './model-pack.js';
import { isScalpHair, buildHair } from './hair-styles.js';

// The unit head (1 m across, its middle at the origin, the face toward +z).
// Measured once from the model (it is 0.845 m tall and 1.006 m deep at
// this size): where the features are, so a beard or a crown can be placed
// without waiting for the file.
export const FACE = { top: 0.42, chin: -0.42, front: 0.5, eyes: -0.08, mouth: -0.22 };

let unit = null; // Promise<{ geo, cell: Float32Array, shade: Float32Array } | null>
const cellOf = (u, v, A) => [Math.min(A.cols - 1, Math.floor(u * A.cols)), Math.min(A.rows - 1, Math.floor(v * A.rows))];

// Each vertex's shade (0..1) inside its atlas cell, read from the model's
// own texture: the cell's brightest pixel is 1. Without a readable image
// (tests, an old browser), every vertex is 1.
function shadesFrom(image, uvs, A) {
  const out = new Float32Array(uvs.length / 2).fill(1);
  try {
    const w = image?.width, h = image?.height;
    if (!w || !h || typeof document === 'undefined') return out;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(image, 0, 0);
    const px = x.getImageData(0, 0, w, h).data;
    const lum = (u, v) => {
      const i = (Math.min(h - 1, Math.max(0, Math.floor(v * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(u * w)))) * 4;
      return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    };
    const best = new Map();
    const L = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) {
      const u = uvs[i * 2], v = uvs[i * 2 + 1], k = cellOf(u, v, A).join();
      L[i] = lum(u, v);
      best.set(k, Math.max(best.get(k) || 1, L[i]));
    }
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0.3, L[i] / best.get(cellOf(uvs[i * 2], uvs[i * 2 + 1], A).join()));
  } catch { /* keep the flat shade */ }
  return out;
}

// The head as plain float geometry in unit size: the model's own head with
// its scalp hair and earrings left out and the monks' smooth shaved cap
// (core/hair-styles.js 'shaved') closing the skull, in the skin's colour.
export function unitHeadGeometry(mesh, image = null) {
  const A = PACK.atlas, src = mesh.geometry;
  const pos = src.attributes.position, uv = src.attributes.uv;
  const cellAt = (a, i) => cellOf(a.getX(i), a.getY(i), A);
  const same = (c, d) => c[0] === d[0] && c[1] === d[1];
  let ey = 0, ne = 0;
  for (let i = 0; i < pos.count; i++) if (same(cellAt(uv, i), A.eyes)) { ey += pos.getY(i); ne++; }
  ey = ne ? ey / ne : 0;
  // Parts in the head mesh's units: [geometry, matrix, keep(a, b, c)].
  const parts = [[src, new THREE.Matrix4(), (a, b, c) => {
    const ca = cellAt(uv, a), cb = cellAt(uv, b), cc = cellAt(uv, c);
    if (same(ca, [3, 0]) || same(cb, [3, 0]) || same(cc, [3, 0])) return false; // earrings
    if (same(ca, A.hair) && same(cb, A.hair) && same(cc, A.hair)) {
      const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      if (cy > ey + 0.3) return false; // a strand over the forehead
      if (isScalpHair((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, cy, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3, ey)) return false;
    }
    return true;
  }]];
  buildHair('shaved', null, A, ey)?.traverse((o) => { if (o.isMesh) { o.updateMatrix(); parts.push([o.geometry, o.matrix.clone(), () => true]); } });
  const P = [], N = [], T = [], C = [], I = [];
  const v = new THREE.Vector3();
  for (const [geo, m, keep] of parts) {
    const base = P.length / 3, gp = geo.attributes.position, gn = geo.attributes.normal, gu = geo.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < gp.count; i++) {
      v.fromBufferAttribute(gp, i).applyMatrix4(m); P.push(v.x, v.y, v.z);
      if (gn) v.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize(); else v.set(0, 0, 1);
      N.push(v.x, v.y, v.z);
      const c = gu ? cellAt(gu, i) : A.skin;
      T.push(gu ? gu.getX(i) : 0, gu ? gu.getY(i) : 0);
      C.push(same(c, A.eyes) ? 2 : same(c, A.hair) ? 1 : 0);
    }
    const idx = geo.index, n = idx ? idx.count : gp.count, tri = (k) => (idx ? idx.getX(k) : k);
    for (let k = 0; k < n; k += 3) {
      const a = tri(k), b = tri(k + 1), c = tri(k + 2);
      if (keep(a, b, c)) I.push(base + a, base + b, base + c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
  geo.setIndex(I);
  mesh.updateWorldMatrix(true, false);
  geo.applyMatrix4(mesh.matrixWorld);
  // Centre it and make it 1 m across.
  const box = new THREE.Box3();
  for (const i of I) box.expandByPoint(v.fromBufferAttribute(geo.attributes.position, i));
  const mid = box.getCenter(new THREE.Vector3()), w = box.max.x - box.min.x || 1;
  geo.translate(-mid.x, -mid.y, -mid.z);
  geo.scale(1 / w, 1 / w, 1 / w);
  return { geo, cell: new Float32Array(C), shade: shadesFrom(image, T, A) };
}

function loadUnit() {
  unit ||= loadPackModel('basic').then((gltf) => {
    let head = null;
    gltf?.scene.traverse((o) => { if (!head && o.isMesh && /head/i.test(o.name)) head = o; });
    if (!head) { unit = null; return null; }
    const mat = Array.isArray(head.material) ? head.material[0] : head.material;
    return unitHeadGeometry(head, mat?.map?.image);
  }).catch(() => { unit = null; return null; });
  return unit;
}

// The head painted in a statue's colours: { skin, hair, eyes } (hex or CSS).
const painted = new Map();
export function paintHead(u, colors) {
  const key = [colors.skin, colors.hair, colors.eyes].join('|');
  if (painted.has(key)) return painted.get(key);
  const pal = [colors.skin, colors.hair ?? colors.skin, colors.eyes ?? colors.hair ?? colors.skin].map((c) => new THREE.Color(c));
  const n = u.cell.length, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = pal[u.cell[i]], s = u.shade[i];
    col[i * 3] = c.r * s; col[i * 3 + 1] = c.g * s; col[i * 3 + 2] = c.b * s;
  }
  const geo = u.geo.clone();
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  painted.set(key, mesh);
  return mesh;
}

// Puts our face on a statue: `width` m across, its middle at `at` in
// parent's space, facing +z (turn: extra rotation [x, y, z]). Resolves
// to the mesh, or null if the model could not load (the statue then stays
// without a face rather than breaking).
export function statueFace(parent, { width, at = [0, 0, 0], turn = [0, 0, 0], colors }) {
  return loadUnit().then((u) => {
    if (!u) return null;
    const m = paintHead(u, colors).clone();
    m.scale.setScalar(width);
    m.position.set(...at);
    m.rotation.set(...turn);
    m.castShadow = true;
    m.name = 'statue-face';
    parent.add(m);
    return m;
  });
}
