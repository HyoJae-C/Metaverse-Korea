// The fish tanks as furniture (core/fish-tank.js TANKS): a cabinet, the
// glass and water, sand, a few stones and a lit lid. The fish themselves
// swim in later (core/tank-fish.js, loaded when a home has a tank).
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { TANKS, waterOf } from './fish-tank.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const water = new THREE.MeshLambertMaterial({ color: '#8fd4f0', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
const lightMat = new THREE.MeshBasicMaterial({ color: '#e8f8ff' });
const STONES = ['#8a8a80', '#a89a88', '#6a7068'];

export function buildTank(g, t) {
  const [w, d] = t.size, W = waterOf(t), top = t.stand + t.h;
  const wood = t.id === 'tank-wall' ? '#2a2e34' : '#3a2a20';
  box(g, w, t.stand, d, 0, t.stand / 2, 0, wood); // the cabinet
  if (t.stand > 0.4) for (const s of [-1, 1]) box(g, 0.012, t.stand - 0.12, 0.01, s * 0.02, t.stand / 2, d / 2 + 0.003, '#c9a227'); // door handles
  box(g, w - 0.02, 0.05, d - 0.02, 0, t.stand + 0.025, 0, '#e8dcb8'); // sand
  for (let i = 0; i < 3 + Math.round(w * 2); i++) { // stones on the sand
    const r = 0.03 + ((i * 37) % 7) * 0.008, x = (((i * 0.618) % 1) - 0.5) * (w - 0.15), z = (((i * 0.382) % 1) - 0.5) * (d - 0.12);
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(STONES[i % 3]));
    s.position.set(x, t.stand + 0.05 + r * 0.4, z); s.scale.y = 0.6; g.add(s);
  }
  // (no back panel: you see the room through the glass, Yozi 2026-11-18)
  const wv = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, W.y1 - t.stand - 0.05, d - 0.02), water);
  wv.position.y = (W.y1 + t.stand + 0.05) / 2; wv.renderOrder = 2; g.add(wv);
  // the frame: corner posts and rims
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.025, t.h, 0.025, sx * (w / 2 - 0.0125), t.stand + t.h / 2, sz * (d / 2 - 0.0125), '#20242a');
  for (const y of [t.stand + 0.01, top - 0.01]) { box(g, w, 0.02, 0.025, 0, y, d / 2 - 0.0125, '#20242a'); box(g, w, 0.02, 0.025, 0, y, -d / 2 + 0.0125, '#20242a'); }
  box(g, w, 0.04, d, 0, top + 0.02, 0, '#20242a'); // the lid
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.01, 0.06), lightMat);
  lamp.position.set(0, top - 0.002, 0); g.add(lamp);
  g.userData.tank = t.id;
}
export { TANKS };
