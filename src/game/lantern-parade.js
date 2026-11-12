// The lantern parade (연등행렬), drawn: the marchers with their lotus
// lanterns on poles, the big lantern floats, and Jogyesa's canopy lighting
// up row by row as the first marchers come in through Iljumun. When and
// where: core/lantern-parade.js. Loaded by game/lantern-parade-near.js.
//
// game: { scene, stream (Cheonggyecheon, world metres), off (the
// Gyeongbokgung district's offset), darkness() (0 day … 1 night) }.
import * as THREE from 'three';
import { paradeAt, paradeRoutes, paradeState, ROWS, PER_ROW, LIGHT_SECONDS, SHOW_SECONDS, AFTER_SECONDS, SPEED, FLOATS as FLOAT_KINDS } from '../core/lantern-parade.js';
import { FIGURES, lightUp } from '../core/lanterns.js';
import { JOGYESA as J } from '../data/jogyesa.js';

const N = ROWS * PER_ROW;
const ROBES = ['#8f8a80', '#8f8a80', '#e8b4c8', '#f4d35e', '#8ecae6', '#f28482', '#cdb4db', '#90be6d', '#ffffff', '#f6bd60'];
const LANTERNS = ['#ff8fb1', '#ffd84d', '#ff6f91', '#fff4ea', '#ef4f5f', '#ffb3c6'];
const DIM = 0.16; // the canopy before it lights up, at night

export function createLanternParade(game) {
  const { scene, stream, off } = game;
  const R = paradeRoutes(stream, off);
  const root = new THREE.Group();
  root.name = 'lantern-parade';
  root.visible = false;
  scene.add(root);
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const parts = [
    new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.32, 1.05, 8).translate(0, 0.53, 0), lam('#ffffff'), N), // robe (tinted)
    new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8).translate(0, 1.25, 0), lam('#e9c9a1'), N), // head
    new THREE.InstancedMesh(new THREE.SphereGeometry(0.175, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.28, -0.015), lam('#2b2220'), N), // hair
    new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4).translate(0.22, 1.2, 0.18), lam('#6a4a2a'), N), // the pole
    new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0).scale(1, 0.85, 1).translate(0.22, 1.98, 0.32), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N), // its lotus lantern (lit)
  ];
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / PER_ROW), monk = row < 2;
    parts[0].setColorAt(i, col.set(monk ? '#8f8a80' : ROBES[(i * 7 + 3) % ROBES.length]));
    parts[4].setColorAt(i, col.set(LANTERNS[(i * 5 + row) % LANTERNS.length]));
  }
  for (const p of parts) { p.frustumCulled = false; p.userData.noShadow = true; root.add(p); }
  // The floats: a low cart with the figure on it, glowing at night.
  const floats = FLOAT_KINDS.map((kind) => {
    const g = new THREE.Group();
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 4.2), lam('#7a2c22'));
    cart.position.y = 0.45;
    g.add(cart);
    for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 10), lam('#2b2220'));
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 1.15, 0.3, sz);
      g.add(w);
    }
    const fig = FIGURES[kind]();
    fig.scale.setScalar(0.85);
    fig.rotation.y = -Math.PI / 2; // (the figures face +x; the cart goes +z)
    fig.position.y = kind === 'moon' ? 0.3 : 0.7;
    lightUp(fig);
    g.add(fig);
    root.add(g);
    return g;
  });

  // Jogyesa's canopy (core/jogyesa-model.js), found once the city has built it.
  let canopy = null, base = null, litTo = -1;
  const findCanopy = () => {
    canopy = scene.getObjectByName('jogyesa-canopy');
    if (!canopy?.instanceColor) { canopy = null; return; }
    base = canopy.instanceColor.array.slice(); // the lanterns' own colours
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  // How lit each canopy column is (0 dim … 1 lit) at t, from the gate side west.
  const canopyLight = (t, arrive) => {
    const x0 = J.canopy.x0 + off[0], x1 = J.canopy.x1 + off[0];
    return (x) => (arrive == null ? 0 : Math.min(1, Math.max(0, (t - arrive - ((x1 - x) / (x1 - x0)) * LIGHT_SECONDS) / 3)));
  };
  const setCanopy = (fn) => {
    if (!canopy) findCanopy();
    if (!canopy) return;
    const a = canopy.instanceColor.array, p = new THREE.Vector3();
    for (let i = 0; i < canopy.count; i++) {
      canopy.getMatrixAt(i, m4);
      p.setFromMatrixPosition(m4).applyMatrix4(canopy.matrixWorld);
      const k = DIM + (1 - DIM) * fn(p.x);
      a[i * 3] = base[i * 3] * k; a[i * 3 + 1] = base[i * 3 + 1] * k; a[i * 3 + 2] = base[i * 3 + 2] * k;
    }
    canopy.instanceColor.needsUpdate = true;
  };
  const restore = () => { if (canopy && base) { canopy.instanceColor.array.set(base); canopy.instanceColor.needsUpdate = true; } litTo = -1; };

  let wasOn = false, arrive = null;
  return {
    root,
    update(now = Date.now()) {
      const P = paradeAt(now);
      if (!P) { if (wasOn) { root.visible = false; restore(); wasOn = false; arrive = null; } return; }
      wasOn = true;
      root.visible = true;
      const S = paradeState(R, off, P.t);
      S.walkers.forEach((w, i) => {
        const bob = w.walking ? Math.abs(Math.sin(P.t * 4.2 + i * 0.7)) * 0.06 : 0;
        q.setFromAxisAngle(up, w.ry + (w.walking ? Math.sin(P.t * 2.1 + i) * 0.05 : 0));
        m4.compose(v.set(w.x, w.y + bob, w.z), q, one);
        for (const part of parts) part.setMatrixAt(i, m4);
      });
      for (const part of parts) part.instanceMatrix.needsUpdate = true;
      S.floats.forEach((f, i) => { if (floats[i]) { floats[i].position.set(f.x, f.y, f.z); floats[i].rotation.y = f.ry; } });
      // The canopy: dim at night until the first row is in, then row by row.
      if (arrive == null && S.lead <= 0) arrive = P.t + S.lead / SPEED; // (when they came in: exact even if we arrive late)
      const dark = game.darkness?.() ?? 1;
      if (dark < 0.5 || P.t > SHOW_SECONDS + AFTER_SECONDS - 1) { if (litTo !== -2) { restore(); litTo = -2; } return; }
      const step = Math.floor(P.t * 4); // (four colour updates a second while it changes)
      const done = arrive != null && P.t > arrive + LIGHT_SECONDS + 4;
      if (step !== litTo && !(done && litTo === -3)) {
        setCanopy(canopyLight(P.t, arrive));
        litTo = done ? -3 : step;
      }
    },
    dispose() { restore(); scene.remove(root); },
  };
}
