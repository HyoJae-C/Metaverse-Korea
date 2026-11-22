// The fish in a fish tank (core/fish-tank.js): each kind one InstancedMesh
// (core/sea-life.js, core/tank-species.js), drawn at its tank length
// (shownLength), swimming loops inside the water, sitting on the sand or
// planted at the back. An octopus sits on the sand and now and then puffs a
// cloud of ink, shoots up mantle first and glides back down, arms spread,
// to a new spot. Loaded with import() when a room has a tank.
import * as THREE from 'three';
import { species, SWIM_TIME } from './sea-life.js';
import { drawingOf } from './tank-species.js';
import { shownLength, waterOf, zoneOf } from './fish-tank.js';

// Fill the tank piece `g` (built by core/fish-tank-pieces.js, in its own
// frame) with `list` (fish ids). Returns { tick(t), dispose() }.
export function fillTank(g, tank, list) {
  const W = waterOf(tank), groups = new Map();
  list.forEach((id, i) => { if (!groups.has(id)) groups.set(id, []); groups.get(id).push(i); });
  const meshes = [], movers = [], octos = [];
  let floorSlot = 0, plantSlot = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const [id, idx] of groups) {
    let sp;
    try { sp = species(drawingOf(id), true); } catch { continue; } // (a kind with no drawing yet: left out, not a crash)
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
      } else if (zone === 'floor' && sp.mode === 'octo') {
        octos.push(octopus(g, W, mesh, k, L, r, floorSlot++));
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
    for (const o of octos) o.tick(t);
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }
  tick(0);
  return {
    tick,
    dispose() {
      for (const m of meshes) { m.removeFromParent(); m.dispose(); }
      for (const o of octos) o.dispose();
    }, // (the shared geometry stays: other tanks use it)
  };
}

// The ink: a few dark puffs, one mesh per octopus, hidden until it inks.
let inkGeo = null;
function inkCloud() {
  if (!inkGeo) {
    const parts = [[0, 0, 0, 1], [0.7, 0.3, 0.2, 0.7], [-0.6, 0.4, -0.3, 0.75], [0.1, 0.8, -0.5, 0.6], [-0.2, 0.2, 0.7, 0.65]];
    const gs = parts.map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z)); // (80 triangles each)
    const pos = gs.flatMap((g) => Array.from(g.attributes.position.array));
    inkGeo = new THREE.BufferGeometry() // merged by hand: positions only (MeshBasic needs nothing else)
      .setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  }
  const m = new THREE.Mesh(inkGeo, new THREE.MeshBasicMaterial({ color: '#141018', transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false;
  return m;
}

// Where on the sand an octopus sits on its n-th rest: spread over the floor.
function spot(W, L, n, out) {
  const h = (k) => { const s = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
  return out.set((h(1) - 0.5) * 2 * Math.max(0.01, W.hx - L * 0.5), W.y0, (h(2) - 0.5) * 2 * Math.max(0.01, W.hz - L * 0.4));
}

// One octopus: rests for a while, then (all worked out from the time, so it
// costs one matrix a frame) jets up and glides down to the next spot. About
// two jets in five start with a puff of ink left behind on the sand.
const JET = 0.9, GLIDE = 3.6;
function octopus(g, W, mesh, k, L, r, slot) {
  const P = 10 + 8 * ((r * 5) % 1), off = slot * 3.7 + r * P; // seconds between jets, and where in that it starts
  const ink = inkCloud();
  g.add(ink);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4();
  const top = Math.max(W.y0 + 0.02, W.y1 - L * 0.55), rise = Math.min(top - W.y0, (W.y1 - W.y0) * 0.75);
  const inks = (n) => { const s = Math.sin(n * 7.13 + slot * 3.1) * 9341.17; return s - Math.floor(s) < 0.4; };
  return {
    tick(t) {
      const T = t + off, n = Math.floor(T / P), u = T - n * P, j = u - (P - JET - GLIDE); // j: seconds into this jet (< 0: resting)
      spot(W, L, n, a);
      let yaw = r * 6.28 + n * 1.3, lean = 0, sx = 1, sy = 1;
      if (j < 0) {
        v.copy(a);
        sy = 1 + 0.03 * Math.sin(t * 1.6 + r * 6); // breathing
      } else {
        spot(W, L, n + 1, b);
        const s = Math.min(1, j / (JET + GLIDE)), mv = s * s * (3 - 2 * s);
        v.lerpVectors(a, b, mv);
        if (j < JET) { // the jet: mantle first, arms squeezed into a streamline
          const k1 = j / JET;
          v.y = W.y0 + rise * (1 - (1 - k1) * (1 - k1));
          sx = 0.72; sy = 1.3; lean = 0.25;
        } else { // the glide: arms spread like a parachute, a gentle sway
          const k2 = (j - JET) / GLIDE;
          v.y = W.y0 + rise * (1 - k2 * k2 * (3 - 2 * k2));
          v.x += Math.sin(k2 * Math.PI * 2) * L * 0.15;
          const open = Math.sin(Math.min(1, k2 * 3) * Math.PI / 2) * (1 - k2 * k2 * k2);
          sx = 0.72 + 0.46 * open; sy = 1.3 - 0.42 * open;
          if (k2 > 0.85) { const f = (k2 - 0.85) / 0.15; sx += (1 - sx) * f; sy += (1 - sy) * f; }
          lean = 0.25 * (1 - k2);
          yaw += k2 * 0.8;
        }
        yaw += mv * 0.5;
      }
      m4.compose(v, q.setFromEuler(e.set(lean, yaw, 0, 'YXZ')), sc.set(L * sx, L * sy, L * sx));
      mesh.setMatrixAt(k, m4);
      // the ink: puffs out where the jet starts, spreads and fades
      const ik = j / 3.2;
      ink.visible = j >= 0 && ik < 1 && inks(n);
      if (ink.visible) {
        ink.position.set(a.x, W.y0 + L * (0.15 + 0.35 * ik), a.z);
        ink.scale.setScalar(L * (0.12 + 0.38 * Math.sqrt(ik)));
        ink.material.opacity = 0.85 * Math.min(1, ik * 8) * (1 - ik);
      }
    },
    dispose() { ink.removeFromParent(); ink.material.dispose(); },
  };
}
