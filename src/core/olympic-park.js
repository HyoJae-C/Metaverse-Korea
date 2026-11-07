// Olympic Park (Songpa) landmarks, stylised and not to scale:
//   peacegate: a simple sketch of the World Peace Gate on the Peace Plaza:
//              four pillars under a long roof slab with lifted ends.
//   lonetree:  a single tree on a low grassy mound (the park's "lone tree").
// Collision for the gate's pillars comes from the map's blockers
// (PEACE_GATE_PILLARS), so these are only visual.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

// Pillar centres from the gate's centre (x along the wing, z across it) and
// their half-size: shared with the map's blockers.
export const PEACE_GATE_PILLARS = { at: [[-13, -3], [-13, 3], [13, -3], [13, 3]], half: 0.9 };

export function peaceGate(g) {
  // A quick sketch for now: four plain pillars and a flat roof slab whose
  // ends tip up a little, like the gate's wings.
  const W = 40, D = 9, Y = 17; // span, depth, height of the slab's underside
  for (const [x, z] of PEACE_GATE_PILLARS.at) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, Y, 1.6), mat('#e7e1d6'));
    p.position.set(x, Y / 2, z);
    g.add(p);
  }
  const mid = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 1.6, D), mat('#f1ece2'));
  mid.position.y = Y + 0.8;
  g.add(mid);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.22, 1, D), mat('#f1ece2'));
    tip.position.set(s * W * 0.4, Y + 1.2, 0);
    tip.rotation.z = s * 0.18;
    g.add(tip);
  }
}

export function loneTree(g) {
  // A low, wide mound of grass with one big round tree on top.
  const mound = new THREE.Mesh(new THREE.SphereGeometry(14, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#8fcf6e'));
  mound.scale.set(1, 0.035, 1); // low enough to walk over
  g.add(mound);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 5, 10), mat('#7a5434'));
  trunk.position.y = 3.2;
  g.add(trunk);
  for (const [x, y, z, r] of [[0, 7.5, 0, 3.6], [2.2, 6.6, 0.6, 2.4], [-2.1, 6.8, -0.4, 2.5], [0.4, 6.4, 2.2, 2.2], [-0.5, 6.5, -2.2, 2.3]]) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshLambertMaterial({ color: '#4f9a45', flatShading: true }));
    c.position.set(x, y, z);
    g.add(c);
  }
}

// Olympic Park Pool (the hall inside: core/pool-hall.js): a long glass hall
// under a blue barrel roof, white columns, and a sign over the entrance on
// the plaza side (-z). Its footprint is a building in the map with
// "custom": true (collision and the shop door), drawn here instead of the
// usual windowed block. w, d, h: footprint and wall height (map units).
export function poolHall(g, l) {
  const w = l.w || 48, d = l.d || 36, h = l.h || 10;
  const glass = new THREE.MeshLambertMaterial({ color: '#9fd8f2' });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glass);
  walls.position.y = h / 2;
  g.add(walls);
  // Columns round the hall and a white band at the top.
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 8) for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), mat('#f4f1ea'));
    c.position.set(x, h / 2, s * (d / 2 + 0.1));
    g.add(c);
  }
  for (let z = -d / 2; z <= d / 2 + 0.01; z += d / 4) for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), mat('#f4f1ea'));
    c.position.set(s * (w / 2 + 0.1), h / 2, z);
    g.add(c);
  }
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.2, d + 1), mat('#f4f1ea'));
  band.position.y = h - 0.6;
  g.add(band);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1, d + 0.6), mat('#2f7fc1'));
  base.position.y = 0.5;
  g.add(base);
  // The barrel roof, running along the hall (x).
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(d / 2 + 0.6, d / 2 + 0.6, w + 1.4, 28, 1, false, 0, Math.PI), mat('#2f7fc1'));
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.32, 1, 1); // a low arch: squash the height (x before the turn)
  roof.position.y = h;
  g.add(roof);
  // The sign over the entrance (Korean and English), facing the plaza.
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#2f7fc1'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 104px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif'; x.fillText('올림픽공원 수영장', 512, 92);
  x.font = '800 62px system-ui, sans-serif'; x.fillText('OLYMPIC PARK POOL', 512, 196);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, h - 2.6, -d / 2 - 0.25);
  sign.rotation.y = Math.PI;
  g.add(sign);
}
