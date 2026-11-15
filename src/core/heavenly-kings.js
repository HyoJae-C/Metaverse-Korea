// The Four Heavenly Kings (사천왕) who guard a temple's gate: Jogyesa's
// Iljumun (core/jogyesa-model.js) and Bongeunsa's Jinyeomun
// (core/bongeunsa-model.js). Each wears our characters' face (core/statue-face.js,
// Yozi 2026-11-15).
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { statueFace } from './statue-face.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const cyl = (g, rt, rb, h, x, y, z, c, seg = 8) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
};
const blob = (g, r, x, y, z, c, sy = 0.8) => {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(c));
  m.position.set(x, y, z);
  m.scale.y = sy;
  g.add(m);
  return m;
};
const GOLD = '#d9ac3e', STONE = '#b1a690', SKIN = '#e9c9a1', BROW = '#2a1d17';

// The four kings in the order they stand: colour and what each holds.
export const KINGS = [
  { name: { ko: '다문천왕', en: 'King of the North' }, color: '#3f6f9a', holds: 'pagoda' },
  { name: { ko: '지국천왕', en: 'King of the East' }, color: '#2f8a68', holds: 'lute' },
  { name: { ko: '증장천왕', en: 'King of the South' }, color: '#b2402f', holds: 'sword' },
  { name: { ko: '광목천왕', en: 'King of the West' }, color: '#d4a73a', holds: 'dragon' },
];

// A Heavenly King: a big armoured guardian on a plinth, about 2.6 m tall
// (× scale), facing +z, with what he holds (a pagoda, a lute, a sword or a
// dragon). k: { x, z, ry, color, holds }; y: what he stands on.
export function heavenlyKing(k, scale = 1, y = 0.35) {
  const g = new THREE.Group();
  box(g, 0.9, 0.3, 0.8, 0, 0.15, 0, STONE);
  cyl(g, 0.38, 0.5, 1.2, 0, 0.9, 0, k.color, 8); // robe
  box(g, 0.9, 0.75, 0.55, 0, 1.85, 0, k.color); // armoured chest
  box(g, 0.95, 0.12, 0.6, 0, 1.5, 0, GOLD); // belt
  box(g, 1.25, 0.22, 0.5, 0, 2.2, 0, GOLD); // shoulder guards
  statueFace(g, { width: 0.68, at: [0, 2.55, 0.04], colors: { skin: SKIN, hair: BROW, eyes: BROW } });
  cyl(g, 0.22, 0.3, 0.3, 0, 2.93, -0.02, GOLD, 6); // crown
  for (const sx of [-1, 1]) box(g, 0.22, 0.75, 0.22, sx * 0.6, 1.75, 0.15, k.color); // arms
  const hand = [0.6, 1.4, 0.35];
  if (k.holds === 'pagoda') { box(g, 0.24, 0.24, 0.24, ...hand, GOLD); cyl(g, 0.02, 0.1, 0.25, hand[0], hand[1] + 0.25, hand[2], GOLD, 6); } else if (k.holds === 'lute') box(g, 0.3, 0.8, 0.12, 0, 1.6, 0.42, '#8a5a2b');
  else if (k.holds === 'sword') box(g, 0.08, 1.2, 0.05, hand[0], 1.95, hand[2], '#c9ced6');
  else { const d = cyl(g, 0.07, 0.07, 1.1, hand[0], 1.85, hand[2], '#2f8a68', 6); d.rotation.z = 0.5; blob(g, 0.13, 0.9, 2.35, hand[2], '#d4a73a'); }
  g.scale.setScalar(scale);
  g.position.set(k.x, y, k.z);
  g.rotation.y = k.ry;
  return g;
}

// The four kings in a gate's side bays, two in each, facing the way
// through: gate = [x, z, w, d, ry] (the passage along the gate's local z,
// its middle third open). bay: the side bays' middle, from the gate's axis.
export function gateKings(gate, { scale = 1, y = 0.35, bay = gate[2] / 3 } = {}) {
  const [x, z, , d, ry] = gate;
  const g = new THREE.Group();
  g.name = 'heavenly-kings';
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  KINGS.forEach((k, i) => {
    const sx = i < 2 ? -1 : 1, sz = i % 2 ? 1 : -1;
    g.add(heavenlyKing({ ...k, x: sx * bay, z: sz * d / 4, ry: -sx * Math.PI / 2 }, scale, y));
  });
  return g;
}
