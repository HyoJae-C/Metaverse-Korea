// The bumper car rink in Modu Land (themepark.js places it): a dark
// starry floor inside a rubber rail, candy-striped corner posts with strings
// of twinkling bulbs, a "BUMPER CARS · 범퍼카" sign over the gate, a little
// queue lane, and six cars, each its own colour. The game is game/bumper.js.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { RINK, RAIL, GATE, HOMES, CAR_COLORS } from './bumper-cars.js';
import { bakeColors } from './merge-static.js';

const mat = matCache({ flatShading: true });
const CANDY = ['#ff8fb8', '#8fe3c7', '#ffe27a', '#c9a8ff', '#8fd0ff', '#ffad6b'];

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#2d3561'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  // Little stars and dots, like a night sky to drive on.
  const star = (x, y, r, col) => {
    g.fillStyle = col; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) star(rnd() * 512, rnd() * 512, 8 + rnd() * 10, ['#ffe27a', '#ff8fb8', '#8fe3c7', '#ffffff'][i % 4]);
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(rnd() * 512, rnd() * 512, 3, 3); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = '#ff5f9e'; g.fillRect(0, 0, 512, 192);
  g.fillStyle = '#fffaf3';
  for (let i = 0; i < 512; i += 40) { g.beginPath(); g.arc(i + 20, 0, 18, 0, Math.PI); g.fill(); } // frosting drips
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 70px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  g.lineWidth = 10; g.strokeStyle = '#b8336e'; g.strokeText('BUMPER CARS', 256, 92);
  g.fillText('BUMPER CARS', 256, 92);
  g.font = '800 34px system-ui, sans-serif';
  g.fillStyle = '#ffe27a'; g.fillText('범퍼카', 256, 154);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// One car, its nose towards +z (a rider at ry faces the same way).
export function makeBumperCar(color) {
  const g = new THREE.Group();
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  // Low enough that a sitting rider's seat is at chair height (0.38 with the floor).
  const rubber = add(new THREE.CylinderGeometry(0.72, 0.72, 0.22, 20), '#2a2a33', 0, 0.13, 0);
  rubber.scale.set(0.82, 1, 1);
  const body = add(new THREE.CylinderGeometry(0.64, 0.66, 0.1, 20), color, 0, 0.22, 0);
  body.scale.set(0.82, 1, 1);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.24, 1.0), color, s * 0.47, 0.38, -0.02); // sides
  add(new THREE.BoxGeometry(0.86, 0.3, 0.3), color, 0, 0.4, 0.5); // nose
  add(new THREE.BoxGeometry(0.88, 0.05, 0.1), '#fffaf3', 0, 0.56, 0.5); // racing stripe
  add(new THREE.BoxGeometry(0.72, 0.04, 0.6), '#fffaf3', 0, 0.27, -0.12); // cushion
  add(new THREE.BoxGeometry(0.78, 0.46, 0.12), '#fffaf3', 0, 0.5, -0.46); // seat back
  // The wheel on a short column, close enough for a driver sat back.
  const wheel = add(new THREE.TorusGeometry(0.13, 0.03, 6, 14), '#2a2a33', 0, 0.62, 0.2);
  wheel.rotation.x = -0.9;
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), '#2a2a33', 0, 0.5, 0.3).rotation.x = -0.6;
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.07, 8, 6), '#fff6b0', s * 0.28, 0.45, 0.66); // headlights
  // The pole at the back with a star-shaped light on top.
  add(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), '#d9dde2', 0, 1.05, -0.55);
  const light = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshBasicMaterial({ color }));
  light.position.set(0, 1.86, -0.55);
  g.add(light);
  add(new THREE.BoxGeometry(0.02, 0.18, 0.28), '#fffaf3', 0, 1.65, -0.41); // pennant
  g.userData.light = light;
  return bakeColors(g); // (one draw call for the car, one for its light)
}

// Builds the rink into `scene`; block(x, z, sx, sz) adds a walking collider.
// Returns { cars: [{ g, i, home }], tick(dt) }.
export function buildBumperRink(scene, block) {
  const R = RINK, root = new THREE.Group();
  scene.add(root);
  const add = (geo, c, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, typeof c === 'string' ? mat(c) : c); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, c, parent) => add(new THREE.BoxGeometry(sx, sy, sz), c, x, y, z, parent);

  // Floor, a step up from the grass.
  const ow = R.hx * 2 + RAIL * 2, od = R.hz * 2 + RAIL * 2;
  box(ow + 0.3, 0.1, od + 0.3, R.x, 0.05, R.z, '#c9a8ff');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(R.hx * 2, R.hz * 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: floorTexture() }));
  floor.position.set(R.x, 0.11, R.z);
  root.add(floor);

  // Rubber rail all round (a gap on the west side is the gate), candy top.
  const x0 = R.x - R.hx - RAIL / 2, x1 = R.x + R.hx + RAIL / 2, z0 = R.z - R.hz - RAIL / 2, z1 = R.z + R.hz + RAIL / 2;
  const railRun = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.9)), along = Math.abs(bx - ax) > Math.abs(bz - az);
    box(along ? len : RAIL, 0.5, along ? RAIL : len, (ax + bx) / 2, 0.35, (az + bz) / 2, '#2a2a33');
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      box(along ? len / n : RAIL + 0.06, 0.12, along ? RAIL + 0.06 : len / n, ax + (bx - ax) * t, 0.66, az + (bz - az) * t, i % 2 ? '#fffaf3' : '#ff5f9e');
    }
  };
  const gap = 0.9;
  railRun(x0 - RAIL / 2, z0, x1 + RAIL / 2, z0);
  railRun(x0 - RAIL / 2, z1, x1 + RAIL / 2, z1);
  railRun(x1, z0, x1, z1);
  railRun(x0, z0, x0, R.z - gap);
  railRun(x0, R.z + gap, x0, z1);
  // A candy bar across the gate (you get in with the button, not by walking).
  box(0.12, 0.12, gap * 2, x0, 0.6, R.z, '#ffe27a');
  // Nobody walks onto the floor.
  block(R.x, R.z, ow, od);

  // Corner posts with gumdrop tops, and strings of bulbs between them.
  const H = 3.4;
  const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  for (const [cx, cz] of corners) {
    for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.16, 0.16, H / 6, 10), i % 2 ? '#fffaf3' : '#ff5a5f', cx, (i + 0.5) * (H / 6), cz);
    add(new THREE.SphereGeometry(0.32, 12, 8), CANDY[corners.findIndex((c) => c[0] === cx && c[1] === cz) % CANDY.length], cx, H + 0.2, cz);
  }
  const bulbA = new THREE.MeshBasicMaterial({ color: '#ffe27a' }), bulbB = new THREE.MeshBasicMaterial({ color: '#ff8fb8' });
  const bulbGeo = new THREE.SphereGeometry(0.09, 6, 4);
  let k = 0;
  for (let c = 0; c < 4; c++) {
    const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.6);
    for (let i = 1; i < n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * 0.45;
      const m = new THREE.Mesh(bulbGeo, k++ % 2 ? bulbA : bulbB);
      m.position.set(ax + (bx - ax) * t, H - 0.05 - sag, az + (bz - az) * t);
      root.add(m);
    }
  }

  // The sign over the gate, on two candy posts.
  const gx = x0 - 0.15;
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 8), i % 2 ? '#fffaf3' : '#8fe3c7', gx, 0.31 + i * 0.62, R.z + s * 1.3);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.09), new THREE.MeshBasicMaterial({ map: signTexture(), side: THREE.DoubleSide }));
  sign.rotation.y = -Math.PI / 2; // reads from the plaza (west)
  sign.position.set(gx - 0.02, 3.55, R.z);
  root.add(sign);
  box(0.1, 1.25, 3.05, gx + 0.05, 3.55, R.z, '#b8336e');

  // A queue lane beside the gate: candy posts and a rope, and a sign.
  const qx = GATE.x, qz0 = R.z + 1.6;
  for (let i = 0; i < 4; i++) for (const s of [-0.55, 0.55]) {
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), '#d4a73a', qx + s, 0.42, qz0 + i * 1.1);
    add(new THREE.SphereGeometry(0.08, 8, 6), '#ffe27a', qx + s, 0.88, qz0 + i * 1.1);
  }
  for (const s of [-0.55, 0.55]) box(0.04, 0.04, 3.3, qx + s, 0.78, qz0 + 1.65, '#ff5f9e');

  // The six cars, parked along the long rails.
  const cars = HOMES.map((h, i) => {
    const g = makeBumperCar(CAR_COLORS[i]);
    g.position.set(h.x, 0.11, h.z);
    g.rotation.y = h.ry;
    scene.add(g);
    return { g, i, home: h };
  });

  let time = 0, blink = 0;
  const tick = (dt) => {
    time += dt;
    blink += dt;
    if (blink > 0.45) { // bulbs chase each other
      blink = 0;
      const c = bulbA.color.getHex();
      bulbA.color.copy(bulbB.color);
      bulbB.color.setHex(c);
    }
    for (const c of cars) {
      const l = c.g.userData.light;
      l.rotation.y = time * 2 + c.i;
    }
  };
  return { cars, tick, gate: GATE };
}
