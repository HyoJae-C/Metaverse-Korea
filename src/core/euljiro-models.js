// Euljiro & Dongdaemun landmarks (map "landmarks" in districts/euljiro.json):
// Dongdaemun Design Plaza (one long, curved silver building with a grass
// roof walk), the stretch of the Seoul City Wall in Dongdaemun History &
// Culture Park with its two-arch water gate, and Namsangol's hanok gate.
// Low-poly and stylised. Visual only: collision comes from the map's
// blockers.
import * as THREE from 'three';
import { hipRoofGeometry } from './landmarks.js';

const mats = {};
const mat = (c, smooth = false) => (mats[c + smooth] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: !smooth }));
function box(g, sx, sy, sz, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// A closed outline ([[x, z], …], metres) as a shape in the x / -z plane,
// pulled in towards its centre by `inset` metres (an extrusion's bevel grows
// it back out).
function outlineShape(p, inset = 0) {
  const cx = p.reduce((t, q) => t + q[0], 0) / p.length, cz = p.reduce((t, q) => t + q[1], 0) / p.length;
  const s = new THREE.Shape();
  p.forEach(([x, z], i) => {
    const d = Math.hypot(x - cx, z - cz) || 1, k = Math.max(0.1, 1 - inset / d);
    const px = cx + (x - cx) * k, py = -(cz + (z - cz) * k);
    if (i === 0) s.moveTo(px, py); else s.lineTo(px, py);
  });
  s.closePath();
  return s;
}

export const EULJIRO_BUILD = {
  // DDP: a silver body with rounded edges (the map outline l.outline, relative to x, z, extruded
  // with a deep bevel), dark panel seams, a strip of green on the roof walk,
  // and a glass-fronted way in facing the plaza (south).
  ddp(g, l) {
    const p = l.outline, H = 15, bev = 6;
    const zMax = Math.max(...p.map((q) => q[1]));
    const geo = new THREE.ExtrudeGeometry(outlineShape(p, bev), { depth: H - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 12 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bev, 0);
    g.add(new THREE.Mesh(geo, mat('#c9ced6', true)));
    // Panel seams: thin dark bands round the body (on the straight part of the wall).
    for (const y of [bev + 0.2, H - bev - 0.2]) {
      const band = new THREE.Mesh(new THREE.ExtrudeGeometry(outlineShape(p, -0.08), { depth: 0.16, bevelEnabled: false }), mat('#9aa1ab'));
      band.rotation.x = -Math.PI / 2;
      band.position.y = y;
      g.add(band);
    }
    // The roof walk: a green strip along the top with a pale path.
    const roof = new THREE.Mesh(new THREE.ShapeGeometry(outlineShape(p.map(([x, z]) => [x * 0.75, z * 0.35 - 6]))), mat('#86b56f'));
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = H + 0.3;
    g.add(roof);
    // The way in on the plaza side: a dark glass gap under a lip.
    const front = zMax - 1.2;
    box(g, 14, 5, 3, 0, 2.5, front, '#2f3a48');
    box(g, 16, 0.5, 4, 0, 5.3, front + 0.6, '#aeb4bd');
  },
  // The Seoul City Wall (한양도성) in the park, running north-south: granite
  // courses, a stepped parapet on top, and the two-arch water gate
  // (이간수문) near its south end. l.len: length along z.
  citywall(g, l) {
    const len = l.len || 90, H = 5.5;
    box(g, 4, H, len, 0, H / 2, 0, '#cbbfa6');
    for (let y = 1.1; y < H; y += 1.1) box(g, 4.06, 0.06, len, 0, y, 0, '#b3a78f'); // courses
    const n = Math.floor(len / 2.4);
    for (let i = 0; i < n; i++) if (i % 2 === 0) box(g, 1.2, 1, 2.2, 0, H + 0.5, -len / 2 + 1.2 + i * 2.4, '#bfb298'); // parapet
    // The water gate: two dark arches through the wall (seen from both sides).
    for (const z of [len / 2 - 14, len / 2 - 8]) {
      for (const sx of [-1, 1]) {
        const arch = new THREE.Mesh(new THREE.CircleGeometry(1.8, 12, 0, Math.PI), mat('#3b3a36'));
        arch.position.set(sx * 2.04, 1.6, z);
        arch.rotation.y = sx * Math.PI / 2;
        g.add(arch);
        box(g, 0.04, 1.6, 3.6, sx * 2.04, 0.8, z, '#3b3a36');
      }
    }
  },
  // Namsangol's gate: two posts, a beam and a small tiled roof over a gap
  // in the wall.
  hanokgate(g) {
    for (const sx of [-1, 1]) box(g, 0.45, 3.4, 0.45, sx * 2.6, 1.7, 0, '#6b4630');
    box(g, 5.8, 0.45, 0.6, 0, 3.3, 0, '#6b4630');
    const r = new THREE.Mesh(hipRoofGeometry(7.4, 3.2, 1.3), new THREE.MeshLambertMaterial({ color: '#4a5059', flatShading: true, side: THREE.DoubleSide }));
    r.position.y = 3.5;
    g.add(r);
  },
};
