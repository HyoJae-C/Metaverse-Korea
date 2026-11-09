// Another Land's Candy Carousel, Choco Viking, Rainbow Wheel and Lollipop
// Drop (themepark.js places them;
// the motion is park-rides.js, on everyone's shared clock).
// The carousel: a scalloped platform, a mirrored centre column, twelve
// horses on gold poles (eight outside, four inside), a striped canopy with a
// fringe of bulbs. The pirate ship: a chocolate hull with icing trim, candy
// shields, a curling bow and stern with pennants, four benches whose lap
// bars swing down before it starts, on two tall A-frames. Each ride's still
// parts are merged inside its own moving group, so a ride is a few draw calls.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { mergeStatic } from './merge-static.js';
import { RIDES, barDown, carouselAngle, carouselPace, dropY, horseSpot, vikingAngle, wheelAngle, wheelDoorOpen } from './park-rides.js';

const mat = matCache({ flatShading: true });
const ICING = '#fffaf3', HOT = '#ff5f9e', PINK = '#ff8fb8', GOLD = '#e8b84a', CHOC = '#6b3f2a', CHOC2 = '#8a5536', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff';
const part = (parent, geo, color, x, y, z) => { const m = new THREE.Mesh(geo, color.isMaterial ? color : mat(color)); m.position.set(x, y, z); parent.add(m); return m; };
const box = (parent, sx, sy, sz, x, y, z, c) => part(parent, new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
const cyl = (parent, rt, rb, h, x, y, z, c, seg = 12) => part(parent, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);

// A carousel horse facing +z, standing on y = 0 (its saddle about 0.62 up).
function horse(coat, saddle) {
  const g = new THREE.Group();
  box(g, 0.34, 0.34, 0.9, 0, 0.5, 0, coat); // body
  box(g, 0.36, 0.08, 0.42, 0, 0.7, -0.02, saddle); // saddle
  const neck = box(g, 0.24, 0.5, 0.24, 0, 0.82, 0.42, coat);
  neck.rotation.x = 0.45;
  const head = box(g, 0.22, 0.24, 0.42, 0, 1.06, 0.62, coat);
  head.rotation.x = 0.35;
  for (const s of [-0.07, 0.07]) box(g, 0.05, 0.12, 0.05, s, 1.24, 0.5, coat); // ears
  box(g, 0.06, 0.34, 0.3, 0, 0.98, 0.36, saddle).rotation.x = 0.45; // mane
  const tail = box(g, 0.08, 0.36, 0.08, 0, 0.5, -0.52, saddle);
  tail.rotation.x = -0.5;
  for (const [x, z, rx] of [[-0.11, 0.33, -0.9], [0.11, 0.33, -0.6], [-0.11, -0.33, 0.35], [0.11, -0.33, 0.25]]) { // front legs prance
    const l = box(g, 0.08, 0.42, 0.08, x, 0.2, z, coat);
    l.position.y = 0.38 - Math.cos(rx) * 0.18;
    l.position.z = z + Math.sin(rx) * 0.18;
    l.rotation.x = rx;
  }
  return g;
}

export function buildCarousel(scene, block) {
  const C = RIDES.carousel;
  const root = new THREE.Group();
  root.position.set(C.x, 0, C.z);
  scene.add(root);
  // The base that stays still: a step all round.
  cyl(root, C.r + 1.1, C.r + 1.2, 0.18, 0, 0, 0, '#f2c6a0', 32);
  const spin = new THREE.Group();
  root.add(spin);
  // Platform: cream boards with a pink scalloped skirt.
  cyl(spin, C.r + 0.85, C.r + 0.85, 0.22, 0, 0.18, 0, '#fff3d6', 32);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    part(spin, new THREE.SphereGeometry(0.2, 8, 6), i % 2 ? PINK : ICING, Math.sin(a) * (C.r + 0.85), 0.3, Math.cos(a) * (C.r + 0.85)).scale.y = 0.7;
  }
  // The centre column: mirrored panels in pink and gold.
  cyl(spin, 0.95, 0.95, 3.2, 0, 0.4, 0, ICING, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const p = box(spin, 0.7, 2.1, 0.06, Math.sin(a) * 0.93, 1.75, Math.cos(a) * 0.93, i % 2 ? '#bfe6f5' : PINK);
    p.rotation.y = a;
  }
  cyl(spin, 1.05, 1.05, 0.25, 0, 3.6, 0, GOLD, 12);
  // Canopy: a striped cone, a gold band and a fringe of bulbs.
  const R = C.r + 1.15;
  for (let i = 0; i < 16; i++) {
    const seg = new THREE.Mesh(new THREE.ConeGeometry(R, 1.5, 1, 1, true, (i / 16) * Math.PI * 2, Math.PI / 8), mat(i % 2 ? ICING : HOT));
    seg.material.side = THREE.DoubleSide;
    seg.position.set(0, 4.75, 0);
    spin.add(seg);
  }
  cyl(spin, R, R, 0.36, 0, 3.82, 0, GOLD, 32);
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    const flap = box(spin, 1.3, 0.34, 0.05, Math.sin(a) * (R + 0.02), 3.66, Math.cos(a) * (R + 0.02), i % 2 ? PINK : MINT);
    flap.rotation.y = a;
  }
  const bulb = new THREE.MeshBasicMaterial({ color: '#fff4c4' });
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    part(spin, new THREE.SphereGeometry(0.07, 6, 4), bulb, Math.sin(a) * (R + 0.06), 4.02, Math.cos(a) * (R + 0.06));
  }
  cyl(spin, 0.06, 0.06, 0.7, 0, 5.4, 0, GOLD, 6);
  part(spin, new THREE.SphereGeometry(0.22, 10, 8), HOT, 0, 6.15, 0);
  // Horses on gold poles (the poles turn with the platform, the horses bob).
  const coats = ['#ffffff', '#ffe0ef', '#fff2c4', '#e2f6ff', '#efe4ff', '#ffffff'], saddles = [HOT, MINT, LILAC, LEMON, '#8fd0ff', PINK];
  const horses = [];
  for (let i = 0; i < C.seats; i++) {
    const h = horseSpot(i);
    cyl(spin, 0.035, 0.035, 3.45, Math.sin(h.a) * h.r, 0.4, Math.cos(h.a) * h.r, GOLD, 6);
    const g = horse(coats[i % coats.length], saddles[i % saddles.length]);
    g.position.set(Math.sin(h.a) * h.r, 0.3, Math.cos(h.a) * h.r);
    g.rotation.y = h.a + Math.PI / 2;
    mergeStatic(g);
    spin.add(g);
    horses.push(g);
  }
  mergeStatic(spin, horses);
  mergeStatic(root, [spin]);
  block(C.x, C.z, (C.r + 1.2) * 2, (C.r + 1.2) * 2);
  const tick = (now) => {
    spin.rotation.y = carouselAngle(now);
    const pace = carouselPace(now);
    horses.forEach((g, i) => { g.position.y = 0.3 + 0.22 * pace * Math.sin(now * 2.4 + i * 1.7) - 0.04; });
  };
  return { root, spin, tick };
}

export function buildViking(scene, block) {
  const V = RIDES.viking;
  const root = new THREE.Group();
  root.position.set(V.x, 0, V.z);
  scene.add(root);
  // Two A-frames (one each side of the ship), a beam between them, a
  // boarding deck on the plaza side.
  const legH = Math.hypot(V.pivot, 3.4);
  for (const sz of [-1.75, 1.75]) for (const sx of [-1, 1]) {
    const leg = box(root, 0.32, legH, 0.32, sx * 1.7, V.pivot / 2, sz, ICING);
    leg.rotation.z = sx * Math.atan2(3.4, V.pivot);
    for (let k = 1; k < 4; k++) { // pink candy bands
      const t = k / 4;
      const b = box(root, 0.36, 0.3, 0.36, sx * 3.4 * (1 - t), V.pivot * t, sz, HOT);
      b.rotation.z = leg.rotation.z;
    }
  }
  for (const sz of [-1.75, 1.75]) box(root, 5.2, 0.22, 0.22, 0, 1.1, sz, ICING); // ties low across each frame
  const axle = part(root, new THREE.CylinderGeometry(0.18, 0.18, 3.9, 10), CHOC, 0, V.pivot, 0);
  axle.rotation.x = Math.PI / 2;
  for (const sz of [-2, 2]) part(root, new THREE.SphereGeometry(0.34, 10, 8), HOT, 0, V.pivot, sz);
  box(root, 2.4, 0.9, 1.2, 0, 0.45, 2.1, '#f2c6a0'); // boarding deck
  box(root, 2.5, 0.08, 1.3, 0, 0.92, 2.1, ICING);
  for (let i = 0; i < 3; i++) box(root, 0.7, 0.3 * (i + 1), 1.2, 1.6 + (2 - i) * 0.35 - 0.35, 0.15 * (i + 1), 2.1, '#e6b48c'); // steps
  mergeStatic(root);

  // The ship, hanging from the pivot.
  const swing = new THREE.Group();
  swing.position.set(V.x, V.pivot, V.z);
  scene.add(swing);
  const y0 = -V.arm; // the deck
  for (const sz of [-1.25, 1.25]) for (const sx of [-1, 1]) { // arms: a V each side, from the pivot to the hull
    const arm = box(swing, 0.16, Math.hypot(V.arm, 1.6), 0.16, sx * 0.8, -V.arm / 2, sz, '#c9c9d4');
    arm.rotation.z = sx * Math.atan2(1.6, V.arm);
  }
  for (const sz of [-1.25, 1.25]) box(swing, 3.4, 0.14, 0.14, 0, y0 + 0.3, sz, '#c9c9d4');
  // Hull: a deep middle and ends that sweep up into a curl.
  box(swing, 5.4, 0.9, 2.3, 0, y0 - 0.3, 0, CHOC);
  box(swing, 4.6, 0.4, 2.0, 0, y0 - 0.85, 0, CHOC);
  box(swing, 5.6, 0.18, 2.44, 0, y0 + 0.18, 0, ICING); // icing gunwale
  box(swing, 5.42, 0.14, 2.34, 0, y0 - 0.5, 0, HOT); // pink stripe
  for (const sx of [-1, 1]) {
    let px = sx * 2.6, py = y0 - 0.25; // the bow / stern: sweeps up and curls back in
    for (let k = 0; k < 5; k++) {
      const th = 0.45 + k * 0.38, L = 0.62, dx = sx * Math.cos(th) * L, dy = Math.sin(th) * L;
      const seg = box(swing, L + 0.08, 0.5 - k * 0.05, 2.1 - k * 0.3, px + dx / 2, py + dy / 2, 0, k % 2 ? CHOC2 : CHOC);
      seg.rotation.z = sx * th;
      px += dx; py += dy;
    }
    part(swing, new THREE.SphereGeometry(0.3, 12, 8), HOT, px, py, 0); // a gumdrop on each curl
    part(swing, new THREE.SphereGeometry(0.12, 8, 6), ICING, px, py + 0.32, 0);
  }
  for (const sz of [-1, 1]) for (let i = 0; i < 5; i++) { // candy shields along each side
    const sh = part(swing, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 14), [HOT, MINT, LEMON, LILAC, PINK][i], -2 + i, y0 - 0.15, sz * 1.18);
    sh.rotation.x = Math.PI / 2;
  }
  for (const sx of [-1, 1]) { // a pennant on each curl
    cyl(swing, 0.03, 0.03, 0.9, sx * 3.75, y0 + 2.2, 0, CHOC2, 6);
    box(swing, 0.5, 0.3, 0.03, sx * 3.75 - sx * 0.27, y0 + 2.9, 0, HOT);
  }
  // Benches (riders face the middle) and their lap bars.
  const bars = [];
  V.rows.forEach((off, k) => {
    const out = Math.sign(off), h = V.bench[k];
    if (h > 0.8) box(swing, 0.62, h - 0.2, 2.1, off, y0 + (h - 0.2) / 2, 0, CHOC2); // the raised end benches' step
    box(swing, 0.5, 0.12, 2.1, off, y0 + h - 0.06, 0, '#ffd36e'); // seat
    box(swing, 0.12, 0.36, 2.1, off + out * 0.3, y0 + h + 0.12, 0, HOT); // back
    const bar = new THREE.Group(); // hinged at the back; down = across the laps
    bar.position.set(off + out * 0.3, y0 + h + 0.36, 0);
    box(bar, 0.08, 0.08, 1.9, -out * 0.55, 0, 0, '#d9dde2');
    for (const sz of [-0.95, 0.95]) box(bar, 0.6, 0.07, 0.07, -out * 0.27, 0, sz, '#d9dde2');
    bar.userData.out = out;
    mergeStatic(bar);
    swing.add(bar);
    bars.push(bar);
  });
  mergeStatic(swing, bars);
  block(V.x, V.z, 12, 4.4);
  block(V.x, V.z + 2.1, 2.6, 1.4);
  const tick = (now) => {
    swing.rotation.z = vikingAngle(now);
    const d = barDown('viking', now);
    for (const b of bars) b.rotation.z = -b.userData.out * (1 - d) * 1.35; // up: tipped back over the bench
  };
  return { root, swing, bars, tick };
}

// The Rainbow Wheel: two candy A-frames, a double rim in rainbow arcs with a
// ring of bulbs, and eight gondolas of two, each with a roof, a bench at the
// back and a safety bar across the front that swings shut once it leaves
// the boarding deck at the bottom.
export function buildWheel(scene, block) {
  const W = RIDES.wheel, Z = W.z + 0.2;
  const root = new THREE.Group();
  root.position.set(W.x, 0, Z);
  scene.add(root);
  const spread = 3.3, legH = Math.hypot(W.hub, spread);
  for (const sz of [-1.7, 1.7]) for (const sx of [-1, 1]) {
    const leg = box(root, 0.3, legH, 0.3, sx * spread / 2, W.hub / 2, sz, ICING);
    leg.rotation.z = sx * Math.atan2(spread, W.hub);
    for (let k = 1; k < 4; k++) { const t = k / 4, b = box(root, 0.34, 0.3, 0.34, sx * spread * (1 - t), W.hub * t, sz, HOT); b.rotation.z = leg.rotation.z; }
  }
  for (const sz of [-1.7, 1.7]) box(root, spread * 1.6, 0.2, 0.2, 0, 1.4, sz, ICING);
  const axle = part(root, new THREE.CylinderGeometry(0.22, 0.22, 3.6, 10), GOLD, 0, W.hub, 0);
  axle.rotation.x = Math.PI / 2;
  // The boarding deck under the bottom gondola, with steps to the gate.
  box(root, 3.4, 0.5, 2.6, 0, 0.25, 0, '#f2c6a0');
  box(root, 3.5, 0.08, 2.7, 0, 0.52, 0, ICING);
  for (let i = 0; i < 2; i++) box(root, 1.4, 0.17 * (i + 1), 0.5, -1.4, 0.085 * (i + 1), 1.55 + (1 - i) * 0.45, '#e6b48c');
  mergeStatic(root);

  const wheel = new THREE.Group();
  wheel.position.set(W.x, W.hub, Z);
  scene.add(wheel);
  const RAIN = ['#ff5a5f', '#ffad6b', '#ffe27a', '#a6e3a1', '#8fd0ff', '#86a8f0', '#c9a8ff', '#ff8fb8'];
  for (const rz of [-0.55, 0.55]) {
    RAIN.forEach((c, i) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(W.r, 0.13, 6, 10, (Math.PI * 2) / 8), mat(c));
      arc.rotation.z = (i / 8) * Math.PI * 2;
      arc.position.z = rz;
      wheel.add(arc);
    });
    const inner = new THREE.Mesh(new THREE.TorusGeometry(W.r * 0.45, 0.08, 6, 24), mat(ICING));
    inner.position.z = rz;
    wheel.add(inner);
    for (let i = 0; i < 16; i++) {
      const sp = box(wheel, 0.07, W.r, 0.07, 0, 0, rz, '#d9dde2');
      const a = (i / 16) * Math.PI * 2;
      sp.position.set(Math.sin(a) * W.r / 2, -Math.cos(a) * W.r / 2, rz);
      sp.rotation.z = a;
    }
  }
  for (let i = 0; i < W.cabins; i++) { // cross bars where the gondolas hang
    const a = (i / W.cabins) * Math.PI * 2;
    box(wheel, 0.1, 0.1, 1.2, Math.sin(a) * W.r, -Math.cos(a) * W.r, 0, ICING);
  }
  part(wheel, new THREE.CylinderGeometry(0.85, 0.85, 1.3, 16), HOT, 0, 0, 0).rotation.x = Math.PI / 2;
  for (const rz of [-0.68, 0.68]) part(wheel, new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16), ICING, 0, 0, rz).rotation.x = Math.PI / 2;
  const bulb = new THREE.MeshBasicMaterial({ color: '#fff4c4' });
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    part(wheel, new THREE.SphereGeometry(0.08, 6, 4), bulb, Math.sin(a) * (W.r + 0.2), -Math.cos(a) * (W.r + 0.2), 0.62);
  }
  mergeStatic(wheel);

  // Gondolas: the group's origin is where it hangs from the rim.
  const cabins = [], bars = [];
  for (let i = 0; i < W.cabins; i++) {
    const c = new THREE.Group();
    const col = RAIN[i % RAIN.length], fl = -W.drop;
    const ceil = fl + 1.5; // (room for a seated rider's head)
    box(c, 0.08, -ceil, 0.08, 0, ceil / 2, 0, '#d9dde2'); // hanger
    part(c, new THREE.CylinderGeometry(0.2, 0.95, 0.36, 8), col, 0, ceil + 0.22, 0).rotation.y = Math.PI / 8; // roof
    box(c, 1.7, 0.08, 1.5, 0, ceil, 0, ICING);
    for (const sx of [-0.78, 0.78]) for (const sz of [-0.66, 0.66]) box(c, 0.07, 1.44, 0.07, sx, fl + 0.78, sz, '#d9dde2');
    box(c, 1.7, 0.12, 1.5, 0, fl, 0, '#fffaf3'); // floor
    box(c, 1.7, 0.42, 0.08, 0, fl + 0.27, -0.72, col); // back wall
    for (const sx of [-0.83, 0.83]) box(c, 0.08, 0.42, 1.5, sx, fl + 0.27, 0, col); // sides
    box(c, 1.5, 0.1, 0.45, 0, fl + 0.45, -0.45, '#ffd36e'); // bench
    const bar = new THREE.Group(); // the front bar, hinged at the left post
    bar.position.set(-0.78, fl + 0.55, 0.7);
    box(bar, 1.56, 0.08, 0.08, 0.78, 0, 0, HOT);
    c.add(bar);
    mergeStatic(c, [bar]);
    scene.add(c);
    cabins.push(c);
    bars.push(bar);
  }
  block(W.x, Z, spread * 2 + 0.6, 4);
  const tick = (now) => {
    wheel.rotation.z = now * W.speed;
    cabins.forEach((c, i) => {
      const a = wheelAngle(i, now);
      c.position.set(W.x + Math.sin(a) * W.r, W.hub - Math.cos(a) * W.r, Z);
      bars[i].rotation.y = wheelDoorOpen(i, now) ? -1.3 : 0; // swung open at the deck
    });
  };
  return { root, wheel, cabins, tick };
}

// The Lollipop Drop: a candy-striped tower with a giant lollipop on top, and
// a ring of eight seats facing out that climbs, hangs at the top and falls.
// Each seat's over-the-shoulder harness comes down before it climbs.
export function buildDrop(scene, block) {
  const D = RIDES.drop, H = D.top + 2.6;
  const root = new THREE.Group();
  root.position.set(D.x, 0, D.z);
  scene.add(root);
  cyl(root, D.r + 1.1, D.r + 1.3, 0.45, 0, 0, 0, '#f2c6a0', 24); // base deck
  cyl(root, D.r + 1.15, D.r + 1.15, 0.06, 0, 0.45, 0, ICING, 24);
  const n = Math.round(H / 1.4);
  for (let i = 0; i < n; i++) cyl(root, 0.62, 0.62, H / n, 0, 0.45 + (i * H) / n, 0, i % 2 ? '#ff5a5f' : ICING, 12);
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) box(root, 0.12, H, 0.12, Math.sin(a) * 0.66, H / 2 + 0.45, Math.cos(a) * 0.66, GOLD); // the rails the ring rides
  const topY = H + 0.45;
  cyl(root, 1.2, 1.2, 0.5, 0, topY, 0, LEMON, 16);
  cyl(root, 0.12, 0.12, 1.4, 0, topY + 0.5, 0, ICING, 8);
  const pop = part(root, new THREE.CylinderGeometry(1.5, 1.5, 0.4, 24), HOT, 0, topY + 3.2, 0);
  pop.rotation.x = Math.PI / 2;
  for (const [r, c] of [[1.1, ICING], [0.7, MINT], [0.35, LEMON]]) { // swirl rings on both faces
    for (const s of [-1, 1]) { const ring = part(root, new THREE.TorusGeometry(r, 0.1, 6, 24), c, 0, topY + 3.2, s * 0.21); ring.rotation.z = r; }
  }
  mergeStatic(root);

  const ring = new THREE.Group();
  ring.position.set(D.x, D.low, D.z);
  scene.add(ring);
  cyl(ring, D.r + 0.45, D.r + 0.45, 0.22, 0, -0.3, 0, MINT, 24);
  cyl(ring, 0.85, 0.85, 1.6, 0, -0.3, 0, ICING, 12); // the carriage round the tower
  cyl(ring, D.r + 0.5, D.r + 0.5, 0.14, 0, 1.5, 0, PINK, 24); // its top band
  const harness = [];
  for (let i = 0; i < D.seats; i++) {
    const a = (i / D.seats) * Math.PI * 2;
    const seat = new THREE.Group();
    seat.position.set(Math.sin(a) * (D.r - 0.15), 0, Math.cos(a) * (D.r - 0.15));
    seat.rotation.y = a; // facing out (+z of the seat)
    box(seat, 0.6, 0.1, 0.5, 0, 0.45, 0.05, ['#ff8fb8', '#ffe27a', '#c9a8ff', '#8fe3c7'][i % 4]); // seat
    box(seat, 0.6, 1.2, 0.12, 0, 1.0, -0.22, ['#ff8fb8', '#ffe27a', '#c9a8ff', '#8fe3c7'][i % 4]); // back
    const h = new THREE.Group(); // hinged above the head; down = over the shoulders
    h.position.set(0, 1.55, -0.1);
    for (const sx of [-0.2, 0.2]) box(h, 0.08, 0.08, 0.5, sx, 0, 0.25, '#d9dde2');
    for (const sx of [-0.2, 0.2]) box(h, 0.08, 0.6, 0.08, sx, -0.3, 0.48, '#d9dde2');
    box(h, 0.48, 0.08, 0.08, 0, -0.58, 0.48, HOT);
    mergeStatic(h);
    seat.add(h);
    ring.add(seat);
    harness.push(h);
  }
  mergeStatic(ring, harness);
  block(D.x, D.z, 2.2, 2.2);
  const tick = (now) => {
    ring.position.y = dropY(now);
    const d = barDown('drop', now);
    for (const h of harness) h.rotation.x = -(1 - d) * 1.4; // up: tipped back over the seat
  };
  return { root, ring, harness, tick };
}
