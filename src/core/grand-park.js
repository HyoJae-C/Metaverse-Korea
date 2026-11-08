// Seoul Children's Grand Park (Gwangjin-gu), stylised and not to scale:
//   cgpgate: the main gate on the plaza by Neungdong-ro: two round pillars in
//            bright stripes under a rainbow arch with balloons on top.
//   hoarding: the fence round the zoo while it isn't open yet: panels in the
//            park's colours, every other one painted "Opening soon"
//            (polyline l.p; its collision is the map's blockers).
// Collision for the pillars comes from the map's blockers
// (CGP_GATE_PILLARS), so this is only visual.
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';

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

// The zoo's "opening soon" hoarding along a polyline (l.p, map coords).
let soonTex = null;
function openingSoon() {
  return (soonTex ||= canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#fff6df'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ef6f6c'; c.fillRect(0, 0, w, 28); c.fillRect(0, h - 28, w, 28);
    c.textAlign = 'center'; c.fillStyle = '#4a3020';
    c.font = 'bold 56px sans-serif'; c.fillText('동물원 개장 준비 중', w / 2, 104, w - 40);
    c.font = '38px sans-serif'; c.fillText('The zoo is opening soon', w / 2, 162, w - 40);
    c.font = '28px sans-serif'; c.fillText('近日オープン · 即将开放', w / 2, 210, w - 40);
  }));
}
export function hoarding(g, l) {
  const H = 2.6, PANEL = 4;
  const painted = new THREE.MeshLambertMaterial({ map: openingSoon() });
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i];
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    const n = Math.max(1, Math.round(len / PANEL));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(len / n - 0.05, H, 0.12),
        k % 2 ? mat(STRIPES[(i + k) % STRIPES.length]) : [mat('#e9e2d3'), mat('#e9e2d3'), mat('#e9e2d3'), mat('#e9e2d3'), painted, painted]);
      panel.position.set(x0 + (x1 - x0) * u, H / 2, z0 + (z1 - z0) * u);
      panel.rotation.y = -ang;
      g.add(panel);
    }
  }
}

// A gap at the foot of the hoarding (l: x, z, ry: its face along local z): a
// dark hole where a board is broken off, small enough to crawl through.
// Only operators can (main.js), to look round before the zoo opens.
export function doghole(g, l) {
  const d = new THREE.Group();
  d.position.set(l.x, 0, l.z);
  d.rotation.y = l.ry || 0;
  const dark = mat('#1d1a18');
  for (const s of [-1, 1]) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16, 0, Math.PI), dark);
    hole.scale.y = 1.3;
    hole.position.set(0, 0.01, 0.075 * s);
    if (s < 0) hole.rotation.y = Math.PI;
    d.add(hole);
  }
  for (const [x, z, ry] of [[0.6, 0.35, 0.4], [-0.5, 0.45, -0.8]]) { // the broken-off bits of board
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.16), mat('#e9e2d3'));
    b.position.set(x, 0.02, z); b.rotation.y = ry;
    d.add(b);
  }
  for (const x of [-0.55, 0.5]) { // grass at the foot
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), mat('#5f9f48'));
    t.position.set(x, 0.15, 0.2);
    d.add(t);
  }
  g.add(d);
}
