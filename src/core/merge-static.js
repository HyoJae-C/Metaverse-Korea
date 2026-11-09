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

// One mesh for a whole moving group (a teacup, a train car, a gondola):
// every plain Lambert mesh in it baked together, each part keeping its
// colour as a vertex colour, so the group is one draw call however many
// colours it has. One- and two-sided parts make one mesh each; anything
// else (glows, signs, see-through) is left as it is, and so is anything in
// `keep` (and what's inside it: a part that moves on its own).
const tinted = {};
const tintMat = (flat, side) => (tinted[flat + ':' + side] ||= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat, side }));
export function bakeColors(group, keep = []) {
  group.updateMatrixWorld(true);
  const toGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const sets = new Map(); // "flat:side" → [mesh]
  const skip = new Set(keep);
  const walk = (o) => {
    if (skip.has(o)) return;
    for (const c of o.children) walk(c);
    const m = o.material;
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || Array.isArray(m) || !m.isMeshLambertMaterial || m.map || m.transparent || m.vertexColors) return;
    const k = !!m.flatShading + ':' + m.side;
    if (!sets.has(k)) sets.set(k, []);
    sets.get(k).push(o);
  };
  walk(group);
  const m4 = new THREE.Matrix4();
  for (const [k, meshes] of sets) {
    const geos = meshes.map((mesh) => {
      let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
      g = g.applyMatrix4(m4.multiplyMatrices(toGroup, mesh.matrixWorld));
      const c = mesh.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    });
    const geo = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    if (!geo) continue;
    const [flat, side] = k.split(':');
    const one = new THREE.Mesh(geo, tintMat(flat === 'true', +side));
    one.name = 'baked';
    group.add(one);
    for (const mesh of meshes) mesh.parent.remove(mesh);
  }
  return group;
}
