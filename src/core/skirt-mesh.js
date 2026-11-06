// Skirts (data/skirts.js) built in code: a flared tube from the waist to the
// hem, skinned to the hips and the upper legs so it swings when you walk and
// drapes over the lap when you sit, painted with the skirt's pattern.
//
// Measured in the rig's rest pose like core/outfit-mesh.js: metres before
// PACK.scale, hips ~0.41 m up, legs at x ±0.171, toes +z, left side +x.
import * as THREE from 'three';
import { skirtById } from '../data/skirts.js';

const WAIST_Y = 0.62; // tucked just under the top's hem
const SHAPE = {
  mini: { hem: 0.3, rings: 7, waist: [0.293, 0.224], flare: [0.37, 0.31], repeat: [6, 1] },
  long: { hem: 0.13, rings: 11, waist: [0.293, 0.224], flare: [0.43, 0.36], repeat: [4, 1.5] },
  // A hanbok chima: tied high under the short jeogori, full, to the floor.
  chima: { top: 0.88, hem: 0.07, rings: 14, waist: [0.312, 0.242], flare: [0.5, 0.44], repeat: [6, 1.5] },
};
const SEG = 48;
const PLEATS = 24;

// Points, normals, uv and bone weights of a skirt in the rig's rest pose.
// o: the outfit's shape options: a long coat (o.coat) keeps the skirt
// inside it above the coat's hem, so it only shows below.
function skirtRig(length, pleated, o = {}) {
  const S = SHAPE[length] || SHAPE.mini;
  const bulk = o.bulk || 0;
  const pos = [], uv = [], wts = [], index = [];
  for (let i = 0; i < S.rings; i++) {
    const t = i / (S.rings - 1);
    const top = S.top ?? WAIST_Y;
    const y = top + (S.hem - top) * t;
    const k = 1 - (1 - t) ** 1.4; // flares quickly over the hips, then falls straight
    let rx = S.waist[0] + (S.flare[0] - S.waist[0]) * k;
    let rz = S.waist[1] + (S.flare[1] - S.waist[1]) * k;
    if (o.coat && y >= o.coat - 0.02) { rx = Math.min(rx, 0.285 + bulk); rz = Math.min(rz, 0.235 + bulk); }
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const cx = Math.sin(a), cz = Math.cos(a); // a = 0 at the front (+z)
      let r = 1;
      if (pleated) { const f = (j / SEG) * PLEATS; r += 0.05 * t * Math.abs(2 * (f - Math.floor(f + 0.5))); }
      pos.push(cx * rx * r, y, cz * rz * r);
      uv.push(j / SEG, 1 - t);
      // The lower skirt follows the legs: the front most (it lies on the lap
      // when sitting), each side its own leg.
      const follow = Math.min(0.92, t ** 1.2 * (0.3 + 0.62 * Math.max(0, cz)));
      const left = 0.5 + 0.5 * cx;
      wts.push([['hips', 1 - follow], ['upperlegl', follow * left], ['upperlegr', follow * (1 - left)]]);
    }
  }
  for (let i = 0; i < S.rings - 1; i++) for (let j = 0; j < SEG; j++) {
    const a = i * (SEG + 1) + j, b = a + SEG + 1;
    index.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return { pos, uv, wts, index };
}

function rigGeometry(rig) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(rig.pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(rig.uv, 2));
  geo.setIndex(rig.index);
  geo.computeVertexNormals();
  return geo;
}

// ── Patterns ────────────────────────────────────────────────────────────
const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
function drawPattern(g, n, s) {
  const base = hex(s.color), acc = hex(s.accent ?? s.color);
  g.fillStyle = base;
  g.fillRect(0, 0, n, n);
  const circle = (x, y, r, fill) => {
    g.fillStyle = fill;
    for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill(); }
  };
  switch (s.pattern) {
    case 'pleats': { // a fold every few centimetres: light on one side, shadow on the other
      const per = s.length === 'long' ? 6 : 4, w = n / per;
      for (let i = 0; i < per; i++) {
        const gr = g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0.14)');
        gr.addColorStop(0.5, 'rgba(0,0,0,0)');
        gr.addColorStop(1, 'rgba(0,0,0,0.2)');
        g.fillStyle = gr;
        g.fillRect(i * w, 0, w, n);
      }
      break;
    }
    case 'tartan': {
      g.globalAlpha = 0.6;
      g.fillStyle = acc;
      g.fillRect(0, n * 0.1, n, n * 0.32);
      g.fillRect(n * 0.1, 0, n * 0.32, n);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, n * 0.22, n, n * 0.08);
      g.fillRect(n * 0.22, 0, n * 0.08, n);
      g.fillStyle = 'rgba(255,236,150,0.8)';
      g.fillRect(0, n * 0.7, n, n * 0.025);
      g.fillRect(n * 0.7, 0, n * 0.025, n);
      break;
    }
    case 'gingham': {
      g.globalAlpha = 0.55;
      g.fillStyle = acc;
      for (const x of [0, n / 2]) { g.fillRect(x, 0, n / 4, n); g.fillRect(0, x, n, n / 4); }
      g.globalAlpha = 1;
      break;
    }
    case 'dots':
      for (const [x, y] of [[0.25, 0.25], [0.75, 0.75], [0.75, 0.25], [0.25, 0.75]]) circle(x * n, y * n, n * 0.07, acc);
      break;
    case 'floral': {
      const flower = (x, y, r, petal) => {
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, petal);
        }
        circle(x, y, r * 0.55, '#f5c842');
      };
      for (const [x, y, r] of [[0.2, 0.25, 0.07], [0.68, 0.18, 0.05], [0.45, 0.62, 0.075], [0.88, 0.7, 0.055], [0.12, 0.85, 0.045]]) {
        circle(x * n + r * n * 1.7, y * n + r * n * 0.9, r * n * 0.45, 'rgba(70,130,70,0.85)');
        flower(x * n, y * n, r * n, acc);
      }
      break;
    }
    case 'stripe':
      g.fillStyle = acc;
      for (let i = 0; i < 4; i++) g.fillRect(0, (i + 0.5) * (n / 4), n, n / 9);
      break;
    case 'denim': { // diagonal twill and a stitched seam
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.lineWidth = 2;
      for (let x = -n; x < n; x += 6) { g.beginPath(); g.moveTo(x, n); g.lineTo(x + n, 0); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      for (let x = -n + 3; x < n; x += 9) { g.beginPath(); g.moveTo(x, n); g.lineTo(x + n, 0); g.stroke(); }
      g.strokeStyle = acc;
      g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(n * 0.5, 0); g.lineTo(n * 0.5, n); g.stroke();
      g.setLineDash([]);
      break;
    }
    case 'leopard': {
      const spots = [[0.15, 0.2], [0.5, 0.12], [0.82, 0.3], [0.3, 0.55], [0.68, 0.62], [0.1, 0.85], [0.9, 0.9], [0.5, 0.88]];
      for (const [x, y] of spots) {
        circle(x * n, y * n, n * 0.05, 'rgba(150,85,30,0.55)');
        g.strokeStyle = acc;
        g.lineWidth = n * 0.022;
        g.lineCap = 'round';
        for (let p = 0; p < 4; p++) {
          const a0 = p * (Math.PI / 2) + 0.35;
          g.beginPath(); g.arc(x * n, y * n, n * 0.065, a0, a0 + 1.0); g.stroke();
        }
      }
      break;
    }
    default: // solid: a soft fold shadow so it doesn't look flat
      g.fillStyle = 'rgba(0,0,0,0.06)';
      g.fillRect(0, 0, n / 2, n);
  }
}

const mats = new Map();
export function skirtMaterial(id) {
  if (mats.has(id)) return mats.get(id);
  const s = skirtById(id);
  if (!s || typeof document === 'undefined') return null;
  const n = 256;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  drawPattern(c.getContext('2d'), n, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...(SHAPE[s.length] || SHAPE.mini).repeat);
  tex.anisotropy = 4;
  const m = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  mats.set(id, m);
  return m;
}

// Puts the skirt on a character model (a fresh clone, still in its rest
// pose, already scaled). o: the outfit's shape options. Returns the mesh.
const rigs = new Map();
export function addSkirt(model, id, o) {
  const s = skirtById(id);
  const material = s && skirtMaterial(id);
  if (!material) return null;
  model.updateMatrixWorld(true);
  const bones = [];
  let parent = null;
  model.traverse((b) => {
    if (b.isBone) bones.push(b);
    if (!parent && b.isSkinnedMesh && /^Outfit_/.test(b.name)) parent = b.parent;
  });
  if (!bones.length) return null;
  parent ||= model;
  const key = [s.length, s.pattern === 'pleats', o?.coat || 0, o?.bulk || 0].join('|');
  if (!rigs.has(key)) rigs.set(key, skirtRig(s.length, s.pattern === 'pleats', o || {}));
  const rig = rigs.get(key);
  const at = new Map(bones.map((b, i) => [b.name, i]));
  const geo = rigGeometry(rig);
  const si = [], sw = [];
  for (const w of rig.wts) for (let j = 0; j < 4; j++) { si.push(w[j] ? at.get(w[j][0]) ?? 0 : 0); sw.push(w[j] ? w[j][1] : 0); }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  // Rig space -> the model's world (its scale) -> the parent's space.
  geo.applyMatrix4(parent.matrixWorld.clone().invert().multiply(model.matrixWorld));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = 'Skirt';
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  mesh.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  mesh.bind(skeleton, mesh.matrixWorld.clone());
  return mesh;
}

// A skirt on a shop rail: the same shape, smaller, hanging by its waist.
export function skirtDisplay(id) {
  const s = skirtById(id);
  const material = s && skirtMaterial(id);
  if (!material) return null;
  const geo = rigGeometry(skirtRig(s.length, s.pattern === 'pleats'));
  geo.translate(0, -(SHAPE[s.length]?.top ?? WAIST_Y), 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.setScalar(s.length === 'chima' ? 0.75 : 0.9); // a chima is floor length
  mesh.position.y = 0.68; // the waist where trousers on a rail hang from
  return mesh;
}
