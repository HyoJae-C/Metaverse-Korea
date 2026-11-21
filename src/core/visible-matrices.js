// Phones got hot (Yozi, 2026-11-21). Before every frame three.js rebuilds the
// position of every object in the scene, hidden or not: on the street that
// is ~18,500 objects, and ~69% of them sit under something hidden (far-culled
// districts, closed shops, props of places you're not at). Nothing hidden is
// drawn, so its position isn't needed until it shows again.
//
//   skipHiddenMatrices(scene);   // once, after the scene is made
//
// The scene then only walks into visible objects. A hidden object that missed
// an update is marked, so the frame it shows again it is rebuilt from its
// parent's current place (it never appears where it was). Code that needs a
// hidden object's place uses getWorldPosition / updateWorldMatrix, which
// rebuild it on the spot.
import * as THREE from 'three';

const base = THREE.Object3D.prototype.updateMatrixWorld;

function walk(o, force) {
  if (o.matrixAutoUpdate) o.updateMatrix();
  if (o.matrixWorldNeedsUpdate || force) {
    if (o.matrixWorldAutoUpdate === true) {
      if (o.parent === null) o.matrixWorld.copy(o.matrix);
      else o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix);
    }
    o.matrixWorldNeedsUpdate = false;
    force = true;
  }
  const children = o.children;
  for (let i = 0, l = children.length; i < l; i++) {
    const c = children[i];
    if (!c.visible) { if (force) c.matrixWorldNeedsUpdate = true; continue; }
    if (c.updateMatrixWorld !== base) c.updateMatrixWorld(force); // (cameras and the like keep their own)
    else walk(c, force);
  }
}

export function skipHiddenMatrices(scene) {
  scene.updateMatrixWorld = function (force) { walk(this, force); };
  return scene;
}
