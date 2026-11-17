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

// ---- The look of the wall and its trail on Namsan (Yozi 2026-11-17: like
// the real Namsan stretch, photos): grey granite in big blocks, a parapet
// that runs on with cap stones, an earth trail with stone steps where it
// climbs. Namsan first; the other stretches follow if it is liked.
export const GRANITE = '#a9aaa6';
// The parapet (여장): blocks set close, each with a cap stone (지붕돌).
export const PARAPET = { len: 1.6, gap: 0.12, h: 0.45, t: 0.6, cap: 0.1, over: 0.06 };

// Big dressed granite blocks, irregular lengths, grey with a little warmth.
// Scale it 1/3.2 along and 1/1.6 up: courses 0.4 m high, blocks 0.5-1 m long.
export function graniteTexture() {
  const c = typeof document !== 'undefined' && document.createElement('canvas');
  if (!c?.getContext) return null;
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#7d7f7f'; x.fillRect(0, 0, 256, 128);
  const tones = ['#b4b6b5', '#a7a9a8', '#bfc0bd', '#9fa2a2', '#b0b0ab', '#b9b7b0'];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < 4; row++) {
    let u = -rnd() * 40;
    while (u < 256) {
      const w = 40 + rnd() * 40;
      x.fillStyle = tones[Math.floor(rnd() * tones.length)];
      x.fillRect(u + 1.5, row * 32 + 1.5, w - 3, 29);
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(u + 1.5, row * 32 + 1.5, w - 3, 4); // (a lit top edge)
      u += w;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Packed earth with fine gravel, for the trail (1 repeat per 2 m).
export function earthTexture() {
  const c = typeof document !== 'undefined' && document.createElement('canvas');
  if (!c?.getContext) return null;
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#cdb48a'; x.fillRect(0, 0, 64, 64);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 220; i++) {
    x.fillStyle = ['#bda27a', '#d9c39c', '#b39874', '#e0cfad'][i % 4];
    x.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
