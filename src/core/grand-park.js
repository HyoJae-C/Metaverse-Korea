// Seoul Children's Grand Park (Gwangjin-gu), stylised and not to scale:
//   cgpgate: the main gate on the plaza by Neungdong-ro: two round pillars in
//            bright stripes under a rainbow arch with balloons on top.
// Collision for the pillars comes from the map's blockers
// (CGP_GATE_PILLARS), so this is only visual.
import * as THREE from 'three';
import { matCache } from './three-kit.js';

const mat = matCache();

// Pillar centres from the gate's centre (x across the path) and their radius:
// shared with the map's blockers (districts/grand-park.json).
export const CGP_GATE_PILLARS = { at: [[-7, 0], [7, 0]], r: 0.8 };

const STRIPES = ['#f2c94c', '#ef6f6c', '#56b4e9', '#7bc96f'];
const ARCH = ['#ef6f6c', '#f2a65a', '#f2c94c', '#7bc96f', '#56b4e9', '#8e7cc3'];

export function cgpGate(g) {
  const H = 6.5; // pillar height
  for (const [x, z] of CGP_GATE_PILLARS.at) {
    for (let i = 0; i < 6; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(CGP_GATE_PILLARS.r, CGP_GATE_PILLARS.r, H / 6, 16), mat(STRIPES[i % STRIPES.length]));
      band.position.set(x, H / 12 + (i * H) / 6, z);
      g.add(band);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 10), mat('#ffffff'));
    cap.position.set(x, H + 0.6, z);
    g.add(cap);
  }
  // The rainbow: thin half-rings, one per colour, from pillar top to pillar top.
  const R = CGP_GATE_PILLARS.at[1][0];
  ARCH.forEach((c, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1 - i * 0.28, 0.16, 6, 28, Math.PI), mat(c));
    ring.position.y = H + 0.6;
    g.add(ring);
  });
  // Balloons over the arch, tied with thin strings.
  const balloons = [[-3.5, 4.6, '#ef6f6c'], [-1.2, 5.6, '#56b4e9'], [1.3, 5.4, '#f2c94c'], [3.6, 4.4, '#7bc96f']];
  for (const [x, dy, c] of balloons) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(c));
    b.scale.y = 1.2;
    b.position.set(x, H + dy + 1.4, 0);
    g.add(b);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), mat('#ffffff'));
    s.position.set(x, H + dy + 0.4, 0);
    g.add(s);
  }
}
