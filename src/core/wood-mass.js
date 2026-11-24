// A wood drawn whole (the map's "woodmass" landmark): for a wood you look at
// but don't walk in (Seonjeongneung's, Yozi 2026-11-24). One instanced mesh
// of crowns over each patch and one dark wall round the patches' feet, so it
// reads as a thick wood from the path; no trunks. Loaded with import().
//   l.crowns   [[x, z, radius], ...]   l.patches   [[[x, z], ...], ...]
import * as THREE from 'three';
import { SEASON, MIX, leafColor, leafHash } from './season.js';

export function buildWoodMass(g, l) {
  const n = l.crowns.length;
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: SEASON === 'autumn' ? '#e6e6e6' : '#ffffff', flatShading: true }), n);
  const greens = ['#4f8045', '#5d8f4a', '#46733f', '#6a9550', '#3c6b3e'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  l.crowns.forEach(([x, z, r], i) => {
    const sy = Math.min(2.7, r * (0.72 + ((i * 29) % 9) / 30)); // (flat crowns: their undersides stay above your head)
    crowns.setMatrixAt(i, m4.compose(v.set(x, 3.3 + sy * 0.35, z), q.setFromAxisAngle(up, i * 0.7), sc.set(r, sy, r)));
    crowns.setColorAt(i, i % 5 === 4 ? greens[4] : leafColor(greens[i % 4], leafHash(i, 5), MIX.wood)); // (one in five a pine: green all year)
  });
  crowns.castShadow = true;
  // the wood's foot: a dark wall round each patch, up to the crowns
  const pos = [], H = 3;
  for (const p of l.patches) for (let i = 0; i < p.length; i++) {
    const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length];
    pos.push(x0, 0, z0, x1, 0, z1, x1, H, z1, x0, 0, z0, x1, H, z1, x0, H, z0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  g.add(crowns, new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#2f4a2c', side: THREE.DoubleSide })));
}
