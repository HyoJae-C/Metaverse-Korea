// The Macaron Gyro Swing on Modu Land's island (park-island.js places
// it; the motion is park-rides.js gyroAngle / gyroSpin, on everyone's
// shared clock): two candy-striped A-frames hold an axle up high; a long
// lilac arm hangs from it with a giant macaron at its end, sixteen seats
// round its rim facing out. The macaron turns slowly while the arm swings
// like a pendulum, higher each time, up past level. Each seat's
// over-the-shoulder harness comes down before it starts. The still parts
// of each moving group are baked into one mesh per group (bakeColors), and
// the harnesses are one instanced mesh, so the whole ride is a few draw calls.
import * as THREE from 'three';
import { bakeColors, mergeStatic } from './merge-static.js';
import { RIDES, barDown, gyroAngle, gyroSpin } from './park-rides.js';

const ICING = '#fffaf3', PINK = '#ff8fb8', GOLD = '#e8b84a', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff', SKY = '#8fd0ff', BISCUIT = '#f2c6a0';
const TEAL = '#3fc4a0'; // (the gyro swing is the mint one)

export function buildGyro(scene, block, mat) {
  const G = RIDES.gyro;
  const part = (parent, geo, c, x, y, z) => { const m = new THREE.Mesh(geo, c.isMaterial ? c : mat(c)); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (parent, sx, sy, sz, x, y, z, c) => part(parent, new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
  const cyl = (parent, rt, rb, h, x, y, z, c, seg = 16) => part(parent, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);

  // The frame: a round boarding deck, two A-frames (legs spread along x,
  // the swing's plane) either side of it, and the axle across the top.
  const root = new THREE.Group();
  root.position.set(G.x, 0, G.z);
  scene.add(root);
  cyl(root, 3.2, 3.4, 0.22, 0, 0, 0, BISCUIT, 28);
  cyl(root, 3.25, 3.25, 0.05, 0, 0.22, 0, ICING, 28);
  for (let i = 0; i < 2; i++) box(root, 1.6, 0.11 * (i + 1), 0.5, 0, 0.055 * (i + 1), 3.6 - i * 0.45, '#e6b48c'); // steps up from the gate (south)
  const legL = Math.hypot(G.legs, G.pivot), lean = Math.atan2(G.legs, G.pivot);
  for (const sz of [-G.frame, G.frame]) {
    for (const sx of [-1, 1]) {
      const leg = box(root, 0.36, legL, 0.36, (sx * G.legs) / 2, G.pivot / 2, sz, ICING);
      leg.rotation.z = sx * lean;
      for (let k = 1; k < 5; k++) { const t = k / 5, b = box(root, 0.42, 0.34, 0.42, sx * G.legs * (1 - t), G.pivot * t, sz, k % 2 ? TEAL : MINT); b.rotation.z = leg.rotation.z; }
      cyl(root, 0.5, 0.6, 0.3, sx * G.legs, 0, sz, BISCUIT, 10); // its foot
      block(G.x + sx * G.legs, G.z + sz, 0.9, 0.9);
    }
    box(root, G.legs * 1.1, 0.22, 0.22, 0, 2.2, sz, ICING); // cross bar
    box(root, 0.8, 0.8, 0.8, 0, G.pivot, sz, LEMON); // the bearing at the top
    part(root, new THREE.SphereGeometry(0.42, 12, 8), LEMON, 0, G.pivot + 0.7, sz); // a candy on top
  }
  const axle = part(root, new THREE.CylinderGeometry(0.26, 0.26, G.frame * 2 + 0.4, 12), GOLD, 0, G.pivot, 0);
  axle.rotation.x = Math.PI / 2;
  bakeColors(root);

  // The arm, swinging about the axle (rotation.z), with the macaron at its end.
  const swing = new THREE.Group();
  swing.position.set(G.x, G.pivot, G.z);
  scene.add(swing);
  const hub = part(swing, new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16), TEAL, 0, 0, 0);
  hub.rotation.x = Math.PI / 2;
  for (const sz of [-0.42, 0.42]) box(swing, 0.32, G.arm - 0.4, 0.22, 0, -(G.arm - 0.4) / 2, sz, LILAC);
  for (let k = 1; k < 6; k++) box(swing, 0.36, 0.14, 1.06, 0, -(k / 6) * G.arm, 0, ICING); // rungs
  const bulb = new THREE.MeshBasicMaterial({ color: '#fff4c4' });
  for (let k = 0; k < 9; k++) for (const sz of [-0.56, 0.56]) part(swing, new THREE.SphereGeometry(0.07, 6, 4), bulb, 0.18, -0.6 - k * 0.62, sz);

  // The macaron: pink shells round a cream filling, a lemon deck on top
  // with the seats round its rim, a striped column up to the arm.
  const spinner = new THREE.Group();
  spinner.position.y = -G.arm;
  swing.add(spinner);
  const R = G.ring + 0.4;
  cyl(spinner, R - 0.1, R - 0.35, 0.22, 0, -0.62, 0, MINT, 32);
  cyl(spinner, R - 0.05, R - 0.05, 0.14, 0, -0.4, 0, ICING, 32);
  cyl(spinner, R, R - 0.1, 0.12, 0, -0.26, 0, SKY, 32);
  cyl(spinner, R, R, 0.14, 0, -0.14, 0, LEMON, 32);
  for (let i = 0; i < 4; i++) cyl(spinner, 0.55, 0.55, 0.4, 0, i * 0.4, 0, i % 2 ? ICING : TEAL, 14);
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; part(spinner, new THREE.SphereGeometry(0.07, 6, 4), bulb, Math.sin(a) * (R + 0.02), -0.33, Math.cos(a) * (R + 0.02)); }
  const COLS = [PINK, MINT, LEMON, SKY, LILAC];
  for (let i = 0; i < G.seats; i++) {
    const a = (i / G.seats) * Math.PI * 2, s = new THREE.Group(); // the seat faces out: its +z
    s.position.set(Math.sin(a) * (G.ring - 0.15), 0, Math.cos(a) * (G.ring - 0.15));
    s.rotation.y = a;
    box(s, 0.55, 0.1, 0.5, 0, 0.45, 0.05, COLS[i % 5]); // seat
    box(s, 0.55, 1.15, 0.12, 0, 0.95, -0.22, COLS[i % 5]); // back
    box(s, 0.12, 0.45, 0.12, 0, 0.2, 0, '#d9dde2'); // its post
    spinner.add(s);
  }
  // The harnesses: one instanced mesh (a bar over each shoulder joined in
  // front), hinged above the head, set when they go up or down.
  const hg = new THREE.BoxGeometry(0.48, 0.08, 0.56).translate(0, 0, 0.26);
  const harness = new THREE.InstancedMesh(hg, mat(LILAC), G.seats);
  harness.frustumCulled = false;
  spinner.add(harness);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  let bar = -1;
  const setBars = (d) => {
    for (let i = 0; i < G.seats; i++) {
      const a = (i / G.seats) * Math.PI * 2;
      q.setFromAxisAngle(Y, a).multiply(qa.setFromAxisAngle(X, 0.55 - (1 - d) * 1.5)); // (down: tipped forward over the shoulders)
      v.set(Math.sin(a) * (G.ring - 0.25), 1.5, Math.cos(a) * (G.ring - 0.25));
      harness.setMatrixAt(i, m4.compose(v, q, one));
    }
    harness.instanceMatrix.needsUpdate = true;
  };
  bakeColors(spinner);
  mergeStatic(spinner, [harness]); // (and the bulbs into one)
  bakeColors(swing); // (the spinner's parts are baked already, so only the arm's)
  mergeStatic(swing, [spinner]);
  block(G.x, G.z, 5.6, 5.6); // (the deck)

  const tick = (now) => {
    swing.rotation.z = gyroAngle(now);
    spinner.rotation.y = gyroSpin(now);
    const d = Math.round(barDown('gyro', now) * 20) / 20;
    if (d !== bar) { bar = d; setBars(d); }
  };
  tick(Date.now() / 1000);
  return { root, swing, spinner, keep: [root, swing, spinner, harness], tick };
}
