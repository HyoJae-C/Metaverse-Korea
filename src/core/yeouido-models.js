// Yeouido (Yeongdeungpo-gu): models on the island in the Han River
// (scripts/build-yeouido.mjs). Only visual: the map's blockers and buildings
// give the walls you bump into.
//   seogang:  Seogang Bridge from Hongdae's bank to the island, along z: kerbs,
//             railings and lamps on the deck you walk across, piers down into
//             the river and a tied arch over the middle of the crossing.
//             l.len: length over the water, l.w: deck width (the road under it).
//   tower63:  the 63 tower at the island's east tip: a tall gold-glass tower
//             that steps in towards the top, seen on the skyline (you can't go
//             in). Its long side runs along z.
//   mulbit:   Mul-bit Square's fountain: rows of low jets that rise and fall
//             over the shallow pool you can walk through (animated).
//             l.len along z, l.w along x.
import * as THREE from 'three';
import { matCache, addBox, canvasTex } from './three-kit.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);

export function seogang(g, l) {
  const len = l.len || 200, w = l.w || 12, half = w / 2;
  for (const s of [-1, 1]) {
    const x = s * (half + 0.3);
    box(g, 0.6, 0.35, len, x, 0.175, 0, '#c9cdd2'); // kerb
    box(g, 0.08, 0.08, len, x, 1.2, 0, '#5a6470'); // hand rail
    const posts = Math.floor(len / 3);
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), mat('#5a6470'), posts + 1);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i <= posts; i++) post.setMatrixAt(i, m4.makeTranslation(x, 0.77, -len / 2 + (i * len) / posts));
    g.add(post);
    for (let z = -len / 2 + 12; z < len / 2; z += 26) { // lamps
      box(g, 0.14, 5, 0.14, x, 2.85, z, '#5a6470');
      box(g, 0.9, 0.18, 0.36, s * (half - 0.1), 5.3, z, '#f4f1e6');
    }
  }
  // The deck's edge beams and the piers standing in the water.
  for (const s of [-1, 1]) box(g, 0.5, 1.1, len, s * (half + 0.6), -0.45, 0, '#b8bec6');
  for (let z = -len / 2 + 25; z < len / 2 - 10; z += 40) box(g, w * 0.7, 3, 3, 0, -1.6, z, '#a9afb7');
  // A tied arch over the middle: two red ribs leaning in, with hangers down
  // to the deck and braces across the top.
  const span = Math.min(110, len * 0.55), rise = 22, n = 14;
  const at = (t) => [(t - 0.5) * span, Math.sin(Math.PI * t) * rise];
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const [z0, y0] = at(i / n), [z1, y1] = at((i + 1) / n);
      const seg = box(g, 0.9, 0.9, Math.hypot(z1 - z0, y1 - y0) + 0.3, s * (half + 0.6) * (1 - 0.18 * Math.sin((Math.PI * (i + 0.5)) / n)), (y0 + y1) / 2 + 1, (z0 + z1) / 2, '#d4553a');
      seg.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
      const [hz, hy] = at((i + 1) / n);
      if (i < n - 1) box(g, 0.1, hy, 0.1, s * (half + 0.4), hy / 2 + 1, hz, '#e9e6df'); // hanger
    }
  }
  for (const t of [0.3, 0.5, 0.7]) { const [z, y] = at(t); box(g, w * 0.95, 0.5, 0.5, 0, y + 1, z, '#d4553a'); }
}

// The 63 tower: tiers of gold glass, narrowing towards the top.
export function tower63(g, l) {
  const L = l.len || 30, W = l.w || 26;
  const glass = (h) => new THREE.MeshLambertMaterial({
    map: canvasTex(64, 256, (x, w, hh) => {
      x.fillStyle = '#d9b04f'; x.fillRect(0, 0, w, hh);
      x.fillStyle = '#b88a2e';
      for (let y = 0; y < hh; y += 8) x.fillRect(0, y, w, 2); // floors
      x.fillStyle = 'rgba(255,240,190,0.45)';
      for (let c = 4; c < w; c += 16) x.fillRect(c, 0, 3, hh); // mullions catching the light
    }, { repeat: [1, h / 32] }),
  });
  for (const [k, y, h] of [[1, 0, 70], [0.86, 70, 40], [0.7, 110, 18]]) box(g, W * k, h, L * k, 0, y + h / 2, 0, glass(h));
  box(g, W * 0.5, 4, L * 0.5, 0, 130, 0, '#c99a3a'); // the top
  box(g, 0.4, 10, 0.4, 0, 137, 0, '#e9e6df'); // mast
  box(g, W + 6, 0.6, L + 6, 0, 0.3, 0, '#cfc8b8'); // its plinth
}

// Mul-bit Square: low jets in rows over the pool, rising and falling in waves.
export function mulbit(g, l) {
  const len = l.len || 34, w = l.w || 17;
  const cols = Math.max(2, Math.floor(len / 3)), rows = Math.max(2, Math.floor(w / 3));
  const jet = new THREE.CylinderGeometry(0.06, 0.16, 1, 6).translate(0, 0.5, 0);
  const water = new THREE.MeshBasicMaterial({ color: '#e8f7ff', transparent: true, opacity: 0.75 });
  const mesh = new THREE.InstancedMesh(jet, water, cols * rows);
  mesh.userData.noShadow = true;
  const spots = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) spots.push([(j - (rows - 1) / 2) * 3, (i - (cols - 1) / 2) * 3, i, j]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const set = (t) => {
    spots.forEach(([x, z, i, j], k) => {
      const h = 0.25 + 1.4 * Math.max(0, Math.sin(t * 1.6 - i * 0.55 + j * 0.3)) ** 2;
      mesh.setMatrixAt(k, m4.compose(p.set(x, 0.03, z), q, s.set(1, h, 1)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  set(0);
  g.add(mesh);
  // Little round nozzles in the paving.
  const noz = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 8), mat('#9aa3ab'), spots.length);
  spots.forEach(([x, z], k) => noz.setMatrixAt(k, m4.makeTranslation(x, 0.03, z)));
  g.add(noz);
  let last = -1;
  return (t) => { if (t - last > 1 / 20) { last = t; set(t); } };
}

export const YEOUIDO_BUILD = { seogang, tower63, mulbit };
