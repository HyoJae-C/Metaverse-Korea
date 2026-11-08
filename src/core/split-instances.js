// Split big InstancedMeshes (street trees, reeds, park flowers…) into tiles.
//
// three.js culls an InstancedMesh as one object, with a bounding sphere around
// all of its instances. Trees spread over the whole map therefore always
// "intersect" the view and every tree is drawn every frame, even the ones
// kilometres behind the camera. Cut into tiles, each tile gets its own small
// bounding sphere and the ones out of view are skipped. The picture is the
// same; only work that was never visible is dropped.
//
// Only static meshes are touched: ones that turn culling off
// (frustumCulled = false, e.g. the wish lanterns and the route dots, which are
// refilled every frame) or ask to be left alone (userData.noSplit) are kept.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

// Which tile (in the mesh's own space) each instance falls in.
export function tileInstances(mesh, tile) {
  const tiles = new Map();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, _m);
    _p.setFromMatrixPosition(_m);
    const key = Math.floor(_p.x / tile) + ',' + Math.floor(_p.z / tile);
    let list = tiles.get(key);
    if (!list) tiles.set(key, (list = []));
    list.push(i);
  }
  return tiles;
}

function splitOne(mesh, tile) {
  const tiles = tileInstances(mesh, tile);
  if (tiles.size < 2) return null;
  const parts = [];
  for (const ids of tiles.values()) {
    const part = new THREE.InstancedMesh(mesh.geometry, mesh.material, ids.length);
    ids.forEach((id, k) => {
      mesh.getMatrixAt(id, _m);
      part.setMatrixAt(k, _m);
      if (mesh.instanceColor) part.setColorAt(k, mesh.getColorAt(id, _c));
    });
    part.name = mesh.name;
    part.castShadow = mesh.castShadow;
    part.receiveShadow = mesh.receiveShadow;
    part.renderOrder = mesh.renderOrder;
    part.layers.mask = mesh.layers.mask;
    part.visible = mesh.visible;
    part.userData = { ...mesh.userData };
    part.position.copy(mesh.position);
    part.quaternion.copy(mesh.quaternion);
    part.scale.copy(mesh.scale);
    part.computeBoundingSphere();
    part.computeBoundingBox();
    parts.push(part);
  }
  return parts;
}

/**
 * Split every static InstancedMesh under root with at least `min` instances
 * spread over more than one `tile` (metres). Returns how many meshes were
 * split and how many tiles they became.
 */
export function splitInstances(root, { tile = 80, min = 24 } = {}) {
  const found = [];
  root.traverse((o) => {
    if (o.isInstancedMesh && o.frustumCulled !== false && !o.userData.noSplit && o.count >= min && o.parent) found.push(o);
  });
  let split = 0, tiles = 0;
  for (const mesh of found) {
    const parts = splitOne(mesh, tile);
    if (!parts) continue;
    const parent = mesh.parent;
    parent.remove(mesh);
    parent.add(...parts);
    split++;
    tiles += parts.length;
  }
  return { split, tiles };
}
