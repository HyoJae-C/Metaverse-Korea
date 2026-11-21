// Watering a pot plant at home: a few drops fall on it (game/decor.js
// plantAct, loaded with the first watering). Rules: core/plant-growth.js.
import * as THREE from 'three';

let geo = null, mat = null;
// parent: the room's furniture group; (x, y, z): the top of the plant.
export function waterDrops(parent, x, y, z, spread = 0.2) {
  geo ||= new THREE.SphereGeometry(0.022, 6, 5);
  mat ||= new THREE.MeshBasicMaterial({ color: '#7cc4f0' });
  const N = 10, mesh = new THREE.InstancedMesh(geo, mat, N), m = new THREE.Matrix4();
  const drops = Array.from({ length: N }, (_, i) => ({ a: i * 2.4, r: spread * (0.25 + ((i * 7) % 10) / 13), t0: i * 0.035 }));
  mesh.frustumCulled = false;
  parent.add(mesh);
  const start = performance.now(), fall = Math.max(0.5, y * 0.6);
  const step = () => {
    const t = (performance.now() - start) / 1000;
    if (t > 0.8 || mesh.parent !== parent) { mesh.removeFromParent(); mesh.dispose(); return; } // (done, or the room was rebuilt)
    drops.forEach((d, i) => {
      const u = Math.max(0, t - d.t0), s = u > 0.45 ? 0.001 : 1;
      m.makeScale(s, s * 1.5, s).setPosition(x + Math.cos(d.a) * d.r, y + 0.25 - Math.min(fall, 4.9 * u * u * 2), z + Math.sin(d.a) * d.r);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    requestAnimationFrame(step);
  };
  step();
}
