// Olympic Park (Songpa) landmarks, stylised and not to scale:
//   peacegate: a great winged roof on four pillars over the Peace Plaza,
//              after the World Peace Gate (its painted underside here is an
//              original pattern in palace colours, not the real mural).
//   lonetree:  a single tree on a low grassy mound (the park's "lone tree").
// Collision for the gate's pillars comes from the map's blockers
// (PEACE_GATE_PILLARS), so these are only visual.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

// Pillar centres from the gate's centre (x along the wing, z across it) and
// their half-size: shared with the map's blockers.
export const PEACE_GATE_PILLARS = { at: [[-13, -3], [-13, 3], [13, -3], [13, 3]], half: 0.9 };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function peaceGate(g) {
  const W = 40, D = 9, Y = 17; // wing span, depth, height of the underside
  // Pillars: tall and square, light stone.
  for (const [x, z] of PEACE_GATE_PILLARS.at) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, Y, 1.6), mat('#e7e1d6'));
    p.position.set(x, Y / 2, z);
    g.add(p);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 2.2), mat('#cfc7b8'));
    foot.position.set(x, 0.3, z);
    g.add(foot);
  }
  // The wing: thick in the middle, thin and lifted at the tips (seen from
  // the front), pushed across its depth.
  const sh = new THREE.Shape();
  const pts = [];
  for (let k = 0; k <= 20; k++) { const u = k / 20 * 2 - 1; pts.push([u * W / 2, Y + Math.pow(Math.abs(u), 2.2) * 3.2]); } // underside, curving up to the tips
  for (let k = 20; k >= 0; k--) { const u = k / 20 * 2 - 1; pts.push([u * W / 2, Y + Math.pow(Math.abs(u), 2.2) * 3.2 + 0.5 + (1 - Math.abs(u)) * 2.6]); } // top
  sh.moveTo(...pts[0]);
  for (const p of pts.slice(1)) sh.lineTo(...p);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false });
  geo.translate(0, 0, -D / 2);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mat('#f1ece2')));
  // Painted underside: bands of palace colours with cloud swirls.
  const under = canvasTex(1024, 256, (x, w, h) => {
    const cols = ['#c0392b', '#2e6b4f', '#2e4a7d', '#e3a92b', '#f3eee4'];
    for (let i = 0; i < 8; i++) { x.fillStyle = cols[i % 4]; x.fillRect(0, (i * h) / 8, w, h / 8); }
    x.strokeStyle = '#f3eee4'; x.lineWidth = 6;
    for (let i = 0; i < 18; i++) {
      const cx = (i + 0.5) * (w / 18), cy = h / 2 + Math.sin(i) * 40;
      x.beginPath(); x.arc(cx, cy, 18, 0, Math.PI * 1.6); x.stroke();
      x.beginPath(); x.arc(cx + 14, cy + 10, 9, Math.PI, Math.PI * 2.6); x.stroke();
    }
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.82, D * 0.9), new THREE.MeshBasicMaterial({ map: under, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = Y - 0.05;
  ceil.userData.noShadow = true;
  g.add(ceil);
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
