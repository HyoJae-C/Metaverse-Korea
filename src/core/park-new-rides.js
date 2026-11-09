// Another Land's newer rides (themepark.js places them; the motion is
// park-rides.js, on everyone's shared clock):
// the Sugar Swing (a chair swing ride: chairs on chains from a spinning
// crown, flying out as it speeds up), the Teacup Party (five cups spinning
// on a turning floor round a giant teapot), the Candy Train (a little
// engine and three cars round an oval in the south-east corner), the Jelly
// Flume (a log boat up a lift and down a big drop into a splash pool) and
// the Mirror Maze (a walk-through maze of mirror panels, free).
// mat: the park's own material cache, so the still parts merge with the
// rest of the park colour by colour (themepark.js runs mergeStatic over the
// scene); each moving group is merged on its own here and handed back in
// `keep`. Repeated parts (the swing's chairs, the rails) are instanced.
import * as THREE from 'three';
import { bakeColors, mergeStatic } from './merge-static.js';
import { RIDES, FLUME_TRACK, FLUME_POOL, TRAIN_TRACK, flumeDist, swingAngle, swingTilt, teacupSpin, teacupSpot, trainDist, MAZE } from './park-rides.js';

const ICING = '#fffaf3', HOT = '#ff5f9e', PINK = '#ff8fb8', GOLD = '#e8b84a', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff', SKY = '#8fd0ff', CHOC = '#6b3f2a', BISCUIT = '#f2c6a0';
const kit = (mat) => {
  const part = (parent, geo, color, x, y, z) => { const m = new THREE.Mesh(geo, color.isMaterial ? color : mat(color)); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (parent, sx, sy, sz, x, y, z, c) => part(parent, new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
  const cyl = (parent, rt, rb, h, x, y, z, c, seg = 12) => part(parent, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);
  return { part, box, cyl };
};
// Two-sided materials of their own (an open cone or cup seen from inside),
// so the park's shared ones stay one-sided.
const twoSided = {};
const sided = (c) => (twoSided[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true, side: THREE.DoubleSide }));

// ── The Sugar Swing ──────────────────────────────────────────────────────
export function buildSwing(scene, block, mat) {
  const { part, cyl } = kit(mat);
  const S = RIDES.swing;
  const root = new THREE.Group();
  root.position.set(S.x, 0, S.z);
  scene.add(root);
  cyl(root, 1.6, 1.8, 0.3, 0, 0, 0, BISCUIT, 20); // the base
  for (let i = 0; i < 5; i++) cyl(root, 0.55, 0.55, (S.hub + 0.4) / 5, 0, (i * (S.hub + 0.4)) / 5, 0, i % 2 ? ICING : HOT, 14); // striped tower
  const crown = new THREE.Group();
  crown.position.y = S.hub;
  root.add(crown);
  cyl(crown, S.arm + 0.3, S.arm + 0.3, 0.3, 0, 0, 0, GOLD, 24);
  for (let i = 0; i < 16; i++) {
    const seg = new THREE.Mesh(new THREE.ConeGeometry(S.arm + 0.5, 1.6, 1, 1, true, (i / 16) * Math.PI * 2, Math.PI / 8), sided(i % 2 ? ICING : LILAC));
    seg.position.y = 1.1;
    crown.add(seg);
  }
  part(crown, new THREE.SphereGeometry(0.35, 10, 8), HOT, 0, 2.1, 0);
  const bulb = new THREE.MeshBasicMaterial({ color: '#fff4c4' });
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; part(crown, new THREE.SphereGeometry(0.08, 6, 4), bulb, Math.sin(a) * (S.arm + 0.32), 0.12, Math.cos(a) * (S.arm + 0.32)); }
  bakeColors(crown);
  mergeStatic(crown); // (and the bulbs into one)
  // Chairs and chains: instanced, placed every frame.
  const n = S.seats;
  const chains = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5).translate(0, -0.5, 0), mat('#d9dde2'), n);
  const tint = new THREE.MeshLambertMaterial({ flatShading: true });
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.08, 0.5), tint, n);
  const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.45, 0.06).translate(0, 0.22, -0.24), tint, n);
  const cols = [PINK, MINT, LEMON, SKY].map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) { seats.setColorAt(i, cols[i % 4]); backs.setColorAt(i, cols[i % 4]); }
  for (const im of [chains, seats, backs]) { im.frustumCulled = false; root.add(im); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), d = new THREE.Vector3();
  block(S.x, S.z, 3.6, 3.6);
  const tick = (now) => {
    const A = swingAngle(now), th = swingTilt(now);
    crown.rotation.y = A;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + A, sa = Math.sin(a), ca = Math.cos(a);
      const px = sa * S.arm, pz = ca * S.arm;
      // The chain hangs from the arm's tip, swung out by th.
      d.set(sa * Math.sin(th), -Math.cos(th), ca * Math.sin(th));
      q.setFromUnitVectors(DOWN, d);
      chains.setMatrixAt(i, m4.compose(v.set(px, S.hub, pz), q, sc.set(1, S.chain, 1)));
      // The chair at the chain's end stays level, facing the way round.
      qy.setFromAxisAngle(Y, a - Math.PI / 2);
      v.set(px + d.x * S.chain, S.hub + d.y * S.chain - 0.16, pz + d.z * S.chain);
      seats.setMatrixAt(i, m4.compose(v, qy, sc.set(1, 1, 1)));
      backs.setMatrixAt(i, m4);
    }
    chains.instanceMatrix.needsUpdate = seats.instanceMatrix.needsUpdate = backs.instanceMatrix.needsUpdate = true;
  };
  return { root, keep: [crown, chains, seats, backs], tick };
}

// ── The Teacup Party ─────────────────────────────────────────────────────
export function buildTeacups(scene, block, mat) {
  const { part, cyl } = kit(mat);
  const T = RIDES.teacups;
  const root = new THREE.Group();
  root.position.set(T.x, 0, T.z);
  scene.add(root);
  // A round floor with a cream top, and a giant teapot in the middle.
  cyl(root, T.R + T.cupR + 0.9, T.R + T.cupR + 1, 0.16, 0, 0, 0, BISCUIT, 32);
  cyl(root, T.R + T.cupR + 0.7, T.R + T.cupR + 0.7, 0.18, 0, 0.02, 0, '#fff3d6', 32);
  const pot = part(root, new THREE.SphereGeometry(1.05, 16, 12), ICING, 0, 1.15, 0);
  pot.scale.y = 0.85;
  cyl(root, 0.55, 0.85, 0.3, 0, 1.85, 0, PINK, 16); // lid
  part(root, new THREE.SphereGeometry(0.22, 10, 8), HOT, 0, 2.35, 0);
  const spout = cyl(root, 0.12, 0.22, 1, 0.95, 0.9, 0, PINK, 10);
  spout.rotation.z = -0.9;
  const handle = part(root, new THREE.TorusGeometry(0.42, 0.1, 6, 14, Math.PI * 1.2), PINK, -1.05, 1.2, 0);
  handle.rotation.z = Math.PI * 0.4;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; part(root, new THREE.SphereGeometry(0.11, 8, 6), [HOT, MINT, LEMON, LILAC, SKY][i % 5], Math.sin(a) * 0.95, 1.0, Math.cos(a) * 0.95); } // polka dots
  block(T.x, T.z, 2.4, 2.4);
  // The cups: a saucer, a flared bowl with a gold rim, a round bench inside
  // and the wheel you spin in the middle (each cup merged on its own).
  const cupCols = [PINK, MINT, LEMON, LILAC, SKY];
  const cups = [];
  for (let c = 0; c < T.cups; c++) {
    const g = new THREE.Group();
    root.add(g);
    cyl(g, T.cupR + 0.25, T.cupR + 0.2, 0.08, 0, 0.04, 0, ICING, 20); // saucer
    part(g, new THREE.CylinderGeometry(T.cupR, T.cupR * 0.72, 0.85, 20, 1, true), sided(cupCols[c]), 0, 0.55, 0); // the bowl
    cyl(g, T.cupR * 0.72, T.cupR * 0.72, 0.06, 0, 0.12, 0, cupCols[c], 20); // its floor
    part(g, new THREE.TorusGeometry(T.cupR, 0.05, 6, 24), GOLD, 0, 0.98, 0).rotation.x = Math.PI / 2;
    part(g, new THREE.TorusGeometry(T.cupR * 0.55, 0.11, 6, 20), ICING, 0, 0.52, 0).rotation.x = Math.PI / 2; // the round bench
    cyl(g, 0.05, 0.05, 0.6, 0, 0.15, 0, GOLD, 6);
    part(g, new THREE.TorusGeometry(0.22, 0.04, 6, 14), HOT, 0, 0.78, 0).rotation.x = Math.PI / 2; // the wheel you spin
    part(g, new THREE.TorusGeometry(0.25, 0.07, 6, 12, Math.PI), cupCols[c], 0, 0.6, -T.cupR - 0.12).rotation.y = Math.PI / 2; // a handle
    bakeColors(g);
    cups.push(g);
  }
  const tick = (now) => {
    for (let c = 0; c < T.cups; c++) {
      const s = teacupSpot(c, now);
      cups[c].position.set(s.x - T.x, 0, s.z - T.z);
      cups[c].rotation.y = teacupSpin(c, now);
    }
  };
  return { root, keep: cups, tick };
}

// ── The Candy Train ──────────────────────────────────────────────────────
// Rails on ties round the oval (instanced: 64 stretches), a little station
// with a striped roof, a steam engine and three open cars that follow it.
export function buildTrain(scene, block, mat) {
  const { box, cyl } = kit(mat);
  const T = RIDES.train;
  const root = new THREE.Group();
  scene.add(root);
  const pts = TRAIN_TRACK.pts, n = pts.length;
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.1, 1), mat('#9aa0a8'), n * 2);
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.08, 0.28), mat('#8a5536'), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[2] - a[2]), ry = Math.atan2(b[0] - a[0], b[2] - a[2]);
    const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2;
    q.setFromAxisAngle(Y, ry);
    [-0.45, 0.45].forEach((side, k) => rails.setMatrixAt(i * 2 + k, m4.compose(v.set(mx + Math.cos(ry) * side, 0.1, mz - Math.sin(ry) * side), q, sc.set(1, 1, len + 0.04))));
    ties.setMatrixAt(i, m4.compose(v.set(mx, 0.04, mz), q, sc.set(1, 1, 1)));
  }
  root.add(rails, ties);
  // The station: a low platform by the west straight, a striped roof on posts.
  const SX = T.x - T.rx - 1.4, SZ = T.z + 1.5;
  box(root, 1.6, 0.1, 8, SX, 0.05, SZ, BISCUIT);
  for (const z of [-3.6, 3.6]) for (const x of [-0.6, 0.6]) { cyl(root, 0.07, 0.07, 2.6, SX + x, 0.1, SZ + z, ICING, 6); block(SX + x, SZ + z, 0.25, 0.25); }
  for (let i = 0; i < 8; i++) box(root, 1.9, 0.12, 1, SX, 2.75, SZ - 3.5 + i, i % 2 ? ICING : HOT);
  // The engine and its cars: each a merged group moved along the track.
  const wheel = (g, r, x, z) => { const w = cyl(g, r, r, 0.1, 0, 0, 0, '#2b2b31', 12); w.geometry.rotateZ(Math.PI / 2); w.position.set(x, r, z); };
  const engine = new THREE.Group();
  box(engine, 1.0, 0.7, 1.9, 0, 0.55, 0, HOT); // body
  const boiler = cyl(engine, 0.38, 0.38, 1.2, 0, 0, 0, '#ff5a5f', 12);
  boiler.geometry.rotateX(Math.PI / 2); // (lying along it)
  boiler.position.set(0, 1.05, 0.35);
  box(engine, 0.95, 0.9, 0.7, 0, 1.25, -0.55, LEMON); // cab
  box(engine, 1.1, 0.1, 0.9, 0, 1.75, -0.55, ICING); // cab roof
  cyl(engine, 0.12, 0.18, 0.55, 0, 1.3, 0.75, CHOC, 8); // funnel
  for (const z of [-0.6, 0.6]) for (const x of [-0.52, 0.52]) wheel(engine, 0.26, x, z);
  bakeColors(engine);
  root.add(engine);
  const cars = [engine];
  for (let k = 0; k < T.cars; k++) {
    const c = new THREE.Group();
    box(c, 1.1, 0.4, 2.1, 0, 0.35, 0, [MINT, LILAC, SKY][k]);
    for (const z of [-0.45, 0.45]) { box(c, 1.0, 0.1, 0.4, 0, 0.6, z, ICING); box(c, 1.0, 0.4, 0.08, 0, 0.8, z - 0.22, ICING); } // benches
    for (const z of [-0.7, 0.7]) for (const x of [-0.52, 0.52]) wheel(c, 0.2, x, z);
    bakeColors(c);
    root.add(c);
    cars.push(c);
  }
  const tick = (now) => {
    const d0 = trainDist(now);
    cars.forEach((g, k) => {
      const p = TRAIN_TRACK.at(d0 - T.gap * k);
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.ry;
    });
  };
  return { root, keep: [rails, ties, ...cars], tick };
}

// ── The Jelly Flume ──────────────────────────────────────────────────────
// A trough for each stretch of the channel (on chocolate posts where it's
// up in the air), jelly-blue water in it, a splash pool at the bottom of
// the drop, a boarding platform and the log boat.
export function buildFlume(scene, block, mat) {
  const { part, box, cyl } = kit(mat);
  const root = new THREE.Group();
  scene.add(root);
  // The channel follows the smooth curve the boat does (FLUME_TRACK), a
  // short straight trough every metre or so, so it bends round with it.
  const pts = FLUME_TRACK.pts, every = Math.max(1, Math.round(1 / FLUME_TRACK.ds));
  const WATER = '#7fd6f0';
  let sincePost = 99;
  for (let i = 0; i < pts.length; i += every) {
    const a = pts[i], b = pts[(i + every) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], dh = Math.hypot(dx, dz), len = Math.hypot(dh, dy), ry = Math.atan2(dx, dz);
    const g = new THREE.Group();
    g.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    g.rotation.order = 'YXZ';
    g.rotation.set(-Math.atan2(dy, dh), ry, 0);
    box(g, 1.7, 0.12, len + 0.12, 0, -0.32, 0, BISCUIT); // the trough's bottom
    for (const s of [-1, 1]) box(g, 0.12, 0.7, len + 0.12, s * 0.85, 0, 0, BISCUIT); // its sides
    for (const s of [-1, 1]) box(g, 0.16, 0.08, len + 0.12, s * 0.85, 0.38, 0, PINK); // pink rims
    box(g, 1.58, 0.04, len + 0.12, 0, -0.04, 0, WATER);
    root.add(g);
    // Posts under the raised stretches, every couple of metres; the low ones are walls you walk round.
    sincePost += len;
    if (a[1] > 1.2 && sincePost > 2.2) { sincePost = 0; for (const s of [-0.7, 0.7]) cyl(root, 0.12, 0.14, a[1] - 0.35, a[0] + Math.cos(ry) * s, 0, a[2] - Math.sin(ry) * s, CHOC, 6); }
    block(a[0], a[2], 1.9, 1.9);
  }
  // The splash pool at the foot of the drop, with an icing rim.
  const P = FLUME_POOL;
  const pool = cyl(root, P.r, P.r, 0.1, P.x, 0.05, P.z, WATER, 24);
  pool.scale.z = P.sz;
  const rim = part(root, new THREE.TorusGeometry(P.r, 0.15, 6, 24), ICING, P.x, 0.12, P.z);
  rim.rotation.x = Math.PI / 2;
  rim.scale.y = P.sz;
  block(P.x, P.z, P.r * 1.9, P.r * P.sz * 1.9);
  // The boarding platform on the station's south side, under an awning.
  box(root, 6.6, 0.1, 1.4, 53.4, 0.05, -14.5, BISCUIT);
  for (let i = 0; i < 6; i++) box(root, 1.1, 0.1, 1.8, 50.65 + i * 1.1, 2.7, -14.6, i % 2 ? ICING : MINT); // awning
  for (const x of [50.4, 56.4]) { cyl(root, 0.07, 0.07, 2.6, x, 0.1, -14, ICING, 6); block(x, -14, 0.25, 0.25); }
  // The log boat: a hollowed log with two benches and a pink bow.
  const boat = new THREE.Group();
  const log = part(boat, new THREE.CapsuleGeometry(0.6, 1.8, 4, 10), '#a36a3f', 0, 0, 0);
  log.rotation.x = Math.PI / 2;
  log.scale.set(1, 1, 0.55);
  box(boat, 0.95, 0.12, 2.2, 0, 0.18, 0, CHOC); // the hollow
  for (const z of [-0.5, 0.5]) box(boat, 0.9, 0.1, 0.3, 0, 0.3, z, ICING);
  part(boat, new THREE.SphereGeometry(0.22, 10, 8), HOT, 0, 0.35, 1.35);
  bakeColors(boat);
  boat.rotation.order = 'YXZ';
  root.add(boat);
  const tick = (now) => {
    const p = FLUME_TRACK.at(flumeDist(now));
    boat.position.set(p.x, p.y - 0.05, p.z);
    boat.rotation.set(p.pitch, p.ry, 0);
  };
  return { root, keep: [boat], tick };
}

// ── The Mirror Maze ──────────────────────────────────────────────────────
// Mirror panels (a shiny silver-blue, pink tops) on a grid of 2 m cells,
// the walls from MAZE.walls, the way in on the south side and the way out
// on the east, a pale tiled floor. Free: just walk in. (Its gate arch and
// sign are park-grounds.js's, like the rides'.)
export function buildMirrorMaze(scene, block, mat) {
  const { box } = kit(mat);
  const root = new THREE.Group();
  scene.add(root);
  const mirror = new THREE.MeshPhongMaterial({ color: '#e3f4fc', emissive: '#5f93ad', emissiveIntensity: 0.45, shininess: 220, specular: 0xffffff, flatShading: true }); // (a cool glow, so it reads as glass)
  for (const [x0, z0, x1, z1] of MAZE.walls) {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box(root, along ? len + 0.12 : 0.12, 2.4, along ? 0.12 : len + 0.12, cx, 1.2, cz, mirror);
    box(root, along ? len + 0.2 : 0.2, 0.12, along ? 0.2 : len + 0.2, cx, 2.44, cz, PINK);
    block(cx, cz, along ? len + 0.2 : 0.3, along ? 0.3 : len + 0.2);
  }
  box(root, MAZE.w, 0.04, MAZE.d, MAZE.x, 0.02, MAZE.z, '#f3e9ff');
  return { root, keep: [], tick() {} };
}
