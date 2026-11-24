// A wood drawn whole (the map's "woodmass" landmark): for a wood you look at
// but don't walk in (Seonjeongneung's, Yozi 2026-11-24). One instanced mesh
// of a few big crowns that reach the ground, so it reads as a thick wood from
// the path with nothing under it to see; no trunks, no wall round its foot.
// Loaded with import().
//   l.crowns   [[x, z, radius], ...]
import * as THREE from 'three';
import { SEASON, MIX, leafColor, leafHash } from './season.js';

export function buildWoodMass(g, l) {
  const n = l.crowns.length;
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: SEASON === 'autumn' ? '#e6e6e6' : '#ffffff', flatShading: true }), n);
  const greens = ['#4f8045', '#5d8f4a', '#46733f', '#6a9550', '#3c6b3e'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  l.crowns.forEach(([x, z, r], i) => {
    const sy = Math.min(4.6, r * (0.85 + ((i * 29) % 9) / 30));
    crowns.setMatrixAt(i, m4.compose(v.set(x, sy * 0.72, z), q.setFromAxisAngle(up, i * 0.7), sc.set(r * 1.12, sy, r * 1.12))); // (its foot just under the ground; a little wide, so the crowns close up)
    crowns.setColorAt(i, i % 5 === 4 ? greens[4] : leafColor(greens[i % 4], leafHash(i, 5), MIX.wood)); // (one in five a pine: green all year)
  });
  crowns.castShadow = true;
  g.add(crowns);
}
