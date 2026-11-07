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
