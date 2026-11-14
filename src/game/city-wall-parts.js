// Parts of the Seoul City Wall shared by its stretches (game/naksan.js,
// game/namsan-wall.js; both loaded with import() when you come near): the
// stone face's texture and a small gate (Hyehwamun, Gwanghuimun).
import * as THREE from 'three';
import { hipRoofGeometry } from '../core/landmarks.js';

export const WALL_STONE = '#cdc5b3';
// The parapet's blocks (여장), on the wall's top.
export const MERLON = { len: 1.5, gap: 0.4, h: 0.8, t: 0.55 };

// A stone-block face: rows of blocks in staggered courses (u along, v up).
// Scale it 1/2.4 along and 1/1.2 up: blocks 0.6 m long, a course every 0.3 m.
export function stoneTexture() {
  const c = typeof document !== 'undefined' && document.createElement('canvas');
  if (!c?.getContext) return null;
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#b8af9c'; x.fillRect(0, 0, 128, 64);
  const tones = ['#d6cebd', '#cbc2ae', '#dfd8c8', '#c4bba7', '#d2c9b6'];
  for (let row = 0; row < 4; row++) for (let i = -1; i < 5; i++) {
    const off = row % 2 ? 16 : 0;
    x.fillStyle = tones[(row * 5 + i * 3 + 7) % tones.length];
    x.fillRect(i * 32 + off + 1.5, row * 16 + 1.5, 29, 13);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A small gate: a granite base with one round-topped arch you walk through
// and a small pavilion with a hipped roof. g: { W across, D through, H the
// base's height, A the arch's half width, S where its round top starts }.
// Its own group, at (0, 0, 0), the arch along z.
export function smallGate({ W, D, H: Hb, A, S }, name) {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: '#cfc6b2' });
  const box = (w, hh, d, px, py, pz, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), color ? new THREE.MeshLambertMaterial({ color }) : stone); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
  for (const sx of [-1, 1]) box(W / 2 - A, Hb, D, sx * (A + (W / 2 - A) / 2), Hb / 2, 0); // either side of the arch
  const sh = new THREE.Shape(); // over the arch: its round top
  sh.moveTo(-A, S); sh.lineTo(-A, Hb); sh.lineTo(A, Hb); sh.lineTo(A, S);
  sh.absarc(0, S, A, 0, Math.PI, false);
  const top = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -D / 2);
  const over = new THREE.Mesh(top, stone);
  over.castShadow = true;
  g.add(over);
  const pw = W * 0.78, pd = D * 0.72, ph = Math.max(0.9, W * 0.2);
  box(pw * 0.92, ph, pd * 0.86, 0, Hb + ph / 2, 0, '#f1e7d2');
  for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) box(0.14, ph, 0.14, -pw / 2 + (i * pw) / 3, Hb + ph / 2, sz * pd / 2, '#a23a2c');
  box(pw + 0.2, 0.18, pd + 0.2, 0, Hb + ph + 0.09, 0, '#2f8f6b');
  const roof = new THREE.Mesh(hipRoofGeometry(pw + 1.2, pd + 1.0, Math.max(0.7, W * 0.16)), new THREE.MeshLambertMaterial({ color: '#3d4450', flatShading: true, side: THREE.DoubleSide }));
  roof.position.y = Hb + ph + 0.18;
  roof.castShadow = true;
  g.add(roof);
  g.name = name;
  return g;
}
