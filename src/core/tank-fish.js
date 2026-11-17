// The fish in a fish tank (core/fish-tank.js): each kind one InstancedMesh
// (core/sea-life.js, core/tank-species.js), drawn at its tank length
// (shownLength), swimming loops inside the water, sitting on the sand or
// planted at the back. Loaded with import() when a room has a tank.
import * as THREE from 'three';
import { species, SWIM_TIME } from './sea-life.js';
import { drawingOf } from './tank-species.js';
import { shownLength, waterOf, zoneOf } from './fish-tank.js';

// Fill the tank piece `g` (built by core/fish-tank-pieces.js, in its own
// frame) with `list` (fish ids). Returns { tick(t), dispose() }.
export function fillTank(g, tank, list) {
  const W = waterOf(tank), groups = new Map();
  list.forEach((id, i) => { if (!groups.has(id)) groups.set(id, []); groups.get(id).push(i); });
  const meshes = [], movers = [];
  let floorSlot = 0, plantSlot = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const [id, idx] of groups) {
    let sp;
    try { sp = species(drawingOf(id)); } catch { continue; } // (a kind with no drawing yet: left out, not a crash)
    const mesh = new THREE.InstancedMesh(sp.geo, sp.mat, idx.length);
    mesh.frustumCulled = false;
    g.add(mesh);
    meshes.push(mesh);
    const zone = zoneOf(id), L = shownLength(id);
    idx.forEach((n, k) => {
      const r = ((n + 1) * 0.618034) % 1;
      if (zone === 'swim') {
        const rx = Math.max(0.02, W.hx - L * 0.55), rz = Math.max(0.015, W.hz - L * 0.35);
        const yLo = Math.min(W.y0 + L * 0.3 + 0.03, (W.y0 + W.y1) / 2), yHi = Math.max(yLo, W.y1 - L * 0.3);
        movers.push({ mesh, k, swim: true, L, rx: rx * (0.6 + 0.4 * r), rz: rz * (0.6 + 0.4 * ((r * 7) % 1)), y: yLo + (yHi - yLo) * ((n * 0.381966) % 1),
          ph: r * Math.PI * 2, sp: (0.25 + 0.3 * ((r * 3) % 1)) / Math.max(0.3, rx), dir: n % 2 ? 1 : -1, ray: sp.mode === 'ray' });
      } else if (zone === 'floor') {
        const s = floorSlot++, x = ((((s * 0.618034) + 0.15) % 1) - 0.5) * 2 * Math.max(0.01, W.hx - L * 0.5), z = (((s * 0.381966 + 0.3) % 1) - 0.5) * 2 * Math.max(0.01, W.hz - L * 0.4);
        m4.compose(v.set(x, W.y0, z), q.setFromEuler(e.set(0, r * Math.PI * 2, 0)), sc.set(L, L, L));
        mesh.setMatrixAt(k, m4);
      } else { // plants along the back, as tall as the water lets them be
        const s = plantSlot++, H = (W.y1 - W.y0) * (id === 'kelp' ? 0.9 : 0.55);
        m4.compose(v.set(((((s * 0.618034) + 0.1) % 1) - 0.5) * 2 * (W.hx - 0.05), W.y0 - 0.01, -W.hz + 0.06), q.setFromEuler(e.set(0, r * Math.PI, 0)), sc.set(H, H, H));
        mesh.setMatrixAt(k, m4);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  function tick(t) {
    SWIM_TIME.value = t;
    for (const f of movers) {
      const a = f.ph + t * f.sp * f.dir;
      v.set(Math.cos(a) * f.rx, f.y + Math.sin(a * 2 + f.ph) * 0.02, Math.sin(a) * f.rz);
      const dx = -Math.sin(a) * f.rx * f.dir, dz = Math.cos(a) * f.rz * f.dir; // facing along the loop
      e.set(0, Math.atan2(-dz, dx), f.ray ? Math.sin(t * 0.7 + f.k) * 0.1 : 0);
      m4.compose(v, q.setFromEuler(e), sc.set(f.L, f.L, f.L));
      f.mesh.setMatrixAt(f.k, m4);
    }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }
  tick(0);
  return {
    tick,
    dispose() { for (const m of meshes) { m.removeFromParent(); m.dispose(); } }, // (the shared geometry stays: other tanks use it)
  };
}
