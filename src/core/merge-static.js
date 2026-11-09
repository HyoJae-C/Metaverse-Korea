// Fewer draw calls for a room built from many small still meshes (an open
// Han River park is drawn over the street, so its ~200 boxes cost on top of
// the city). Every plain mesh that never moves is baked into one mesh per
// material: same picture, a handful of draw calls. Left alone: anything in
// `keep` (and what's inside it), instanced or skinned meshes, see-through
// or textured ones (signs, glows that fade) and hidden ones.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStatic(root, keep = []) {
  const skip = new Set(keep.filter(Boolean));
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map(); // material → [mesh]
  const walk = (o) => {
    if (skip.has(o) || !o.visible) return;
    for (const c of o.children) walk(c);
    const m = o.material;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(m) || m.map || m.transparent) return;
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(o);
  };
  walk(root);
  const m4 = new THREE.Matrix4();
  let removed = 0;
  for (const [material, meshes] of groups) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((mesh) => {
      let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
      g = g.applyMatrix4(m4.multiplyMatrices(toRoot, mesh.matrixWorld));
      return g;
    });
    const geo = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    if (!geo) continue;
    const one = new THREE.Mesh(geo, material);
    one.castShadow = meshes.some((x) => x.castShadow);
    one.receiveShadow = meshes.some((x) => x.receiveShadow);
    if (meshes.every((x) => x.userData.noShadow)) one.userData.noShadow = true; // (stream.js sets shadows after building)
    one.name = 'merged';
    root.add(one);
    for (const mesh of meshes) { mesh.parent.remove(mesh); removed++; }
  }
  return removed;
}
