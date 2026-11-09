// Ride models: bikes, the tandem, motorbike, cars and helmets. Everyone has a
// bike of their own (core/bike-garage.js), so there are no rental stations.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const FRAME = '#3fb59a', DARK = '#2b2f36';

// A small bike, wheels on the ground, front towards +z.
export function makeBike(color = FRAME) {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(0.27, 0.045, 6, 18).rotateY(Math.PI / 2);
  for (const z of [-0.48, 0.48]) {
    const w = new THREE.Mesh(wheelGeo, mat(DARK));
    w.position.set(0, 0.3, z);
    g.add(w);
  }
  const bar = (sx, sy, sz, x, y, z, rx = 0, c = color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  };
  bar(0.06, 0.06, 0.8, 0, 0.5, 0); // top tube
  bar(0.06, 0.45, 0.06, 0, 0.42, -0.2, 0.25); // seat tube
  bar(0.06, 0.55, 0.06, 0, 0.55, 0.45, -0.25); // fork
  bar(0.2, 0.06, 0.28, 0, 0.64, -0.24, 0, DARK); // seat
  bar(0.55, 0.05, 0.05, 0, 0.86, 0.5, 0, DARK); // handlebar
  bar(0.3, 0.16, 0.22, 0, 0.72, 0.62, 0, '#ffffff'); // basket
  return g;
}

// A red sports motorbike (fairing, tank, a low windscreen), front towards
// +z. The rider sits where a bike's rider sits, leaning on the tank.
export function makeMoto(color = '#d8262e') {
  const g = new THREE.Group();
  const box = (sx, sy, sz, x, y, z, c = color, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.09, 8, 20).rotateY(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14).rotateZ(Math.PI / 2);
  for (const z of [-0.62, 0.66]) {
    const w = new THREE.Mesh(wheelGeo, mat(DARK));
    w.position.set(0, 0.36, z);
    g.add(w);
    const hub = new THREE.Mesh(hubGeo, mat('#c9ccd1'));
    hub.position.set(0, 0.36, z);
    g.add(hub);
  }
  box(0.36, 0.34, 0.95, 0, 0.62, 0.08); // body
  box(0.4, 0.42, 0.5, 0, 0.72, 0.5, color, -0.35); // front fairing
  box(0.32, 0.2, 0.42, 0, 0.9, 0.18); // tank
  box(0.3, 0.1, 0.5, 0, 0.82, -0.32, DARK); // seat
  box(0.26, 0.14, 0.4, 0, 0.84, -0.66, color, 0.25); // tail
  box(0.3, 0.2, 0.04, 0, 1.0, 0.68, '#2c3440', -0.5); // windscreen
  box(0.28, 0.2, 0.36, 0, 0.42, -0.05, '#3a3d44'); // engine
  box(0.08, 0.08, 0.6, 0.16, 0.36, -0.45, '#9aa0a8'); // exhaust
  box(0.06, 0.5, 0.06, 0, 0.55, 0.62, '#9aa0a8', -0.3); // fork
  box(0.6, 0.05, 0.05, 0, 0.98, 0.42, DARK); // handlebar
  box(0.14, 0.07, 0.03, 0, 0.82, 0.76, '#fff6c9'); // headlight
  box(0.16, 0.05, 0.03, 0, 0.86, -0.87, '#ff4040'); // tail light
  box(0.37, 0.05, 0.5, 0, 0.6, 0.08, '#ffffff'); // white stripe
  g.scale.setScalar(0.85); // seat at a bike's height, so riders sit the same way
  return g;
}

// A full-face helmet that matches the motorbike, sized for the chibi head
// (it sits in the head-accessory group, like hats).
export function makeHelmet(color = '#d8262e') {
  // A sleek full-face helmet: a shell drawn out to the back, a dark visor
  // facing forward (+z), a fin on top at the back and angled ear vents.
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 16), mat(color));
  shell.scale.set(1.0, 1.02, 1.12);
  shell.position.set(0, 0.05, 0.01);
  g.add(shell);
  // Visor: a band of a slightly larger sphere, centred on the front.
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.375, 24, 10, Math.PI / 2 - 0.78, 1.56, 1.25, 0.6), mat('#1d2129'));
  visor.scale.copy(shell.scale);
  visor.position.copy(shell.position);
  g.add(visor);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.378, 12, 4, Math.PI / 2 - 0.55, 0.5, 1.28, 0.1), new THREE.MeshBasicMaterial({ color: '#9fb4c8' }));
  shine.scale.copy(shell.scale);
  shine.position.copy(shell.position);
  g.add(shine);
  // Fin: a wedge along the top, rising towards the back.
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.16, 0.42, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), mat('#ffffff'));
  fin.scale.set(0.35, 1, 1);
  fin.position.set(0, 0.36, -0.2);
  fin.rotation.x = -0.35;
  g.add(fin);
  // Angled vents over the ears.
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 3).rotateX(-Math.PI / 2), mat('#1d2129'));
    ear.position.set(0.37 * s, 0.04, -0.14);
    ear.rotation.y = 0.25 * s;
    ear.scale.set(0.55, 1, 1);
    g.add(ear);
  }
  return g;
}

// A tandem: the front seat is where a normal bike's seat is (so the driver
// sits the same way), and a second seat 0.8 m behind for the passenger.
export const TANDEM_GAP = 0.8;
export function makeTandem(color = '#e0604d') {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(0.27, 0.045, 6, 18).rotateY(Math.PI / 2);
  for (const z of [-0.48 - TANDEM_GAP, 0.48]) {
    const w = new THREE.Mesh(wheelGeo, mat(DARK));
    w.position.set(0, 0.3, z);
    g.add(w);
  }
  const bar = (sx, sy, sz, x, y, z, rx = 0, c = color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  };
  bar(0.06, 0.06, 0.8 + TANDEM_GAP, 0, 0.5, -TANDEM_GAP / 2); // long top tube
  for (const z of [-0.2, -0.2 - TANDEM_GAP]) bar(0.06, 0.45, 0.06, 0, 0.42, z, 0.25); // seat tubes
  bar(0.06, 0.55, 0.06, 0, 0.55, 0.45, -0.25); // fork
  for (const z of [-0.24, -0.24 - TANDEM_GAP]) bar(0.2, 0.06, 0.28, 0, 0.64, z, 0, DARK); // seats
  bar(0.55, 0.05, 0.05, 0, 0.86, 0.5, 0, DARK); // handlebar
  bar(0.45, 0.05, 0.05, 0, 0.8, -0.3, 0, DARK); // back rider's handle
  return g;
}

// Shared car parts. Glass is see-through so the people inside stay visible.
const glassMat = (tint = '#a9d4ea', opacity = 0.35) => (mats['glass' + tint + opacity] ||= new THREE.MeshLambertMaterial({ color: tint, transparent: true, opacity, depthWrite: false }));
const shiny = (c) => (mats['s' + c] ||= new THREE.MeshPhongMaterial({ color: c, shininess: 80, specular: '#ffffff' }));
// Car wheel: a dark tyre with its whole face filled white (spokes looked
// like they stood still while driving), and a small silver hub cap.
function carWheel(r, w) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 20).rotateZ(Math.PI / 2), mat('#1c1d22'));
  g.add(tyre);
  for (const sx of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.74, r * 0.74, 0.02, 20).rotateZ(Math.PI / 2), shiny('#f6f6f3'));
    disc.position.x = sx * (w / 2 + 0.005);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.03, 12).rotateZ(Math.PI / 2), shiny('#b9bec6'));
    hub.position.x = sx * (w / 2 + 0.02);
    g.add(disc, hub);
  }
  return g;
}

// A sharp "M" badge: a chrome M on a dark round plate, facing +z.
function mBadge(size = 0.2) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.62, size * 0.62, 0.02, 24).rotateX(Math.PI / 2), shiny('#16181d'));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.62, size * 0.06, 8, 28), shiny('#e9ecf0'));
  const sh = new THREE.Shape();
  const P = [[-0.5, -0.45], [-0.5, 0.45], [-0.26, 0.45], [0, 0.06], [0.26, 0.45], [0.5, 0.45], [0.5, -0.45], [0.3, -0.45], [0.3, 0.06], [0, -0.32], [-0.3, 0.06], [-0.3, -0.45]];
  sh.moveTo(P[0][0], P[0][1]);
  for (const [x, y] of P.slice(1)) sh.lineTo(x, y);
  sh.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }), shiny('#ffd34a'));
  m.scale.setScalar(size * 0.75);
  m.position.z = 0.012;
  g.add(plate, ring, m);
  return g;
}

function seatPair(g, x, z, c, trim) {
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), mat(c));
  cushion.position.set(x, 0.57, z - 0.12);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.1), mat(c));
  back.position.set(x, 0.86, z - 0.4);
  back.rotation.x = -0.18;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.08), mat(c));
  head.position.set(x, 1.2, z - 0.47);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.105), mat(trim));
  stripe.position.copy(back.position);
  stripe.rotation.x = back.rotation.x;
  g.add(cushion, back, head, stripe);
}

// A car body from its side profile: pts are [z, y] going round the outline
// from the rear bottom over the top to the front bottom; arches are
// [z, radius] wheel cut-outs along the bottom (y of their centre = r * 0.8).
// The profile is extruded across the width and its edges rounded.
function sideBody(pts, arches, width, cx, material, bottom = 0.2) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (const [z, y] of pts.slice(1)) sh.lineTo(z, y);
  // Along the bottom from the front to the back, arching over each wheel.
  for (const [z, r] of [...arches].sort((a, b) => b[0] - a[0])) {
    sh.lineTo(z + r, bottom);
    sh.absarc(z, bottom + 0.06, r, 0, Math.PI, false);
    sh.lineTo(z - r, bottom);
  }
  sh.lineTo(pts[0][0], pts[0][1]);
  const bevel = 0.07;
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.05, bevelSegments: 3, curveSegments: 14 });
  geo.translate(0, 0, -(width - bevel * 2) / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.position.x = cx;
  return m;
}

// A low two-seat open sports car (roadster): long bonnet, round haunches,
// black cabin with two seats, five-spoke wheels. The driver sits on the
// left (Korea drives on the right), the passenger at -x.
export function makeCar(color = '#ff4d22') {
  const g = new THREE.Group();
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    g.add(o);
    return o;
  };
  const B = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
  const body = shiny(color);
  const cx = -0.45, W = 1.86;
  // Body from its side profile: short rear deck, low doors at the cockpit,
  // a long bonnet sloping down to a pointed nose.
  g.add(sideBody([
    [-2.38, 0.24], [-2.46, 0.5], [-2.36, 0.7], [-1.7, 0.78], [-1.05, 0.76], [-0.95, 0.66],
    [0.42, 0.64], [0.62, 0.74], [1.25, 0.69], [1.7, 0.56], [1.98, 0.4], [1.96, 0.26],
  ], [[1.18, 0.4], [-1.42, 0.4]], W, cx, body));
  add(B(W + 0.02, 0.08, 1.9), mat('#1d1f24'), cx, 0.26, -0.12); // black side skirts
  add(B(1.0, 0.07, 0.06), mat('#15161a'), cx, 0.33, 1.99); // grille slot
  for (const s of [-1, 1]) {
    // Slim swept-back headlights on the bonnet's front corners
    add(B(0.4, 0.04, 0.2), shiny('#fdf6dc'), cx + s * 0.6, 0.53, 1.78, 0.45, s * 0.3);
    // Side mirrors
    add(B(0.16, 0.08, 0.07), body, cx + s * 1.0, 0.86, 0.48);
    // Twin round tail lights
    for (const dx of [0.42, 0.68]) add(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 14).rotateX(Math.PI / 2), shiny('#ff3b30'), cx + s * dx, 0.6, -2.47);
    // Exhausts
    for (const dx of [0.2, 0.34]) add(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10).rotateX(Math.PI / 2), shiny('#c8ccd2'), cx + s * dx, 0.3, -2.45);
    // Fairings behind the seats
    const f = add(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), body, s < 0 ? 0 : -0.9, 0.74, -1.05);
    f.scale.set(0.85, 0.9, 1.9);
  }
  add(B(W - 0.2, 0.1, 0.16), mat('#1d1f24'), cx, 0.28, -2.4); // rear diffuser
  // "M" badges: on the nose, the tail and both front wings
  const nose = mBadge(0.2);
  nose.position.set(cx, 0.47, 2.02);
  nose.rotation.x = -0.55;
  const tail = mBadge(0.18);
  tail.position.set(cx, 0.64, -2.5);
  tail.rotation.y = Math.PI;
  g.add(nose, tail);
  for (const s of [-1, 1]) {
    const b = mBadge(0.15);
    b.position.set(cx + s * 0.99, 0.6, 0.85);
    b.rotation.y = s * Math.PI / 2;
    g.add(b);
  }
  // Black cabin tub with two seats
  add(B(W - 0.24, 0.04, 1.3), mat('#16171b'), cx, 0.655, -0.25); // cockpit floor line
  seatPair(g, 0, 0, '#22232a', color);
  seatPair(g, -0.9, 0, '#22232a', color);
  // Raked windscreen in a thin black frame
  add(B(1.62, 0.36, 0.03), glassMat('#8fc4e0', 0.4), cx, 0.86, 0.55, -0.75);
  add(B(1.66, 0.04, 0.05), mat('#16171b'), cx, 1.0, 0.43, -0.75);
  add(B(0.34, 0.34, 0.04), mat('#16171b'), 0, 0.85, 0.36, -0.9); // steering wheel
  // Wheels: white faces
  for (const s of [-1, 1]) for (const z of [1.18, -1.42]) {
    const w = carWheel(0.34, 0.26);
    w.position.set(cx + s * 0.8, 0.34, z);
    g.add(w);
  }
  return g;
}

// A grand four-door limousine: tall upright chrome grille, long bonnet,
// pearl white with a silver lower body, big side windows so the four
// people inside stay visible, and a silver winged crest on the nose.
// Seats: driver (front left), front passenger, and two in the back.
export function makeLimo(color = '#f8f8f5') {
  const g = new THREE.Group();
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    g.add(o);
    return o;
  };
  const B = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
  const body = shiny(color), silver = shiny('#b9bec6'), chrome = shiny('#e6e8ec');
  const cx = -0.475, W = 1.98, front = 2.45, back = -3.05;
  const len = front - back, mid = (front + back) / 2;
  // Body from its side profile: upright tail, flat boot, tall belt line,
  // a long flat bonnet and an upright front.
  g.add(sideBody([
    [back, 0.26], [back - 0.05, 0.56], [back + 0.05, 0.86], [-1.95, 0.88], [0.55, 0.88],
    [2.3, 0.86], [front, 0.8], [front + 0.04, 0.3],
  ], [[1.6, 0.44], [-2.15, 0.44]], W, cx, body));
  add(B(W + 0.03, 0.12, len - 1.9), silver, cx, 0.3, mid - 0.25); // silver sills
  add(B(W + 0.03, 0.03, len - 0.4), chrome, cx, 0.87, mid); // chrome belt line
  // Tall chrome grille with vertical bars
  add(B(0.78, 0.48, 0.08), chrome, cx, 0.58, front + 0.06);
  for (let k = -5; k <= 5; k++) add(B(0.025, 0.4, 0.03), mat('#2a2c31'), cx + k * 0.062, 0.58, front + 0.105);
  add(B(0.84, 0.06, 0.12), chrome, cx, 0.84, front + 0.06); // grille top
  for (const s of [-1, 1]) {
    add(B(0.4, 0.11, 0.05), shiny('#fffbe8'), cx + s * 0.68, 0.7, front + 0.04); // slim headlights
    add(B(0.06, 0.34, 0.05), shiny('#c4202a'), cx + s * 0.9, 0.66, back - 0.07); // tall tail lights
    add(B(0.14, 0.1, 0.08), body, cx + s * 1.05, 1.02, 0.62); // mirrors
  }
  add(B(W - 0.1, 0.1, 0.12), chrome, cx, 0.32, front + 0.08); // front bumper
  // Silver crest on the bonnet's nose: a faceted jewel on a fluted stem
  // with two swept wings, plus a round winged badge on the grille.
  const crest = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.09, 8), chrome);
  stem.position.y = 0.045;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), shiny('#f4f6fa'));
  gem.position.y = 0.13;
  gem.scale.set(0.8, 1.3, 0.8);
  crest.add(stem, gem);
  const wing = new THREE.Shape();
  wing.moveTo(0, 0);
  wing.quadraticCurveTo(0.09, 0.06, 0.2, 0.05);
  wing.quadraticCurveTo(0.12, 0.02, 0.17, -0.01);
  wing.quadraticCurveTo(0.08, 0.0, 0.11, -0.05);
  wing.quadraticCurveTo(0.05, -0.03, 0, -0.03);
  const wingGeo = new THREE.ExtrudeGeometry(wing, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 8 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wingGeo, chrome);
    w.position.set(0, 0.1, -0.006);
    w.scale.set(s, 1, 1);
    w.rotation.y = s * 0.45;
    crest.add(w);
  }
  crest.position.set(cx, 0.86, front - 0.02);
  g.add(crest);
  const badge = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24).rotateX(Math.PI / 2), shiny('#1b2a4a'));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 28), chrome);
  badge.add(disc, rim);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wingGeo, chrome);
    w.scale.set(s * 0.9, 0.9, 1);
    w.position.set(s * 0.06, 0.005, 0);
    badge.add(w);
  }
  badge.position.set(cx, 0.9, front + 0.13);
  g.add(badge);
  add(B(W - 0.1, 0.1, 0.12), chrome, cx, 0.32, back - 0.08); // rear bumper
  // Cabin: pillars, glass all round, and a closed roof
  const top = 1.5;
  for (const s of [-1, 1]) {
    const x = cx + s * (W / 2 - 0.05);
    add(B(0.06, 0.66, 0.08), body, x, 1.17, 0.55, -0.45); // A pillar
    add(B(0.06, 0.62, 0.12), body, x, 1.19, -0.62); // B pillar
    add(B(0.06, 0.62, 0.14), body, x, 1.19, -1.88, 0.25); // C pillar
    add(B(0.02, 0.56, 2.25), glassMat('#bcd9e8', 0.28), x, 1.19, -0.66); // side windows
    add(B(0.07, 0.07, 2.6), body, x, top, -0.68); // roof rail
  }
  add(B(W - 0.16, 0.6, 0.03), glassMat('#bcd9e8', 0.3), cx, 1.17, 0.5, -0.45); // windscreen
  add(B(W - 0.16, 0.55, 0.03), glassMat('#bcd9e8', 0.3), cx, 1.19, -1.92, 0.3); // rear window
  add(B(W - 0.06, 0.08, 2.62), body, cx, top + 0.03, -0.68); // closed roof
  add(B(W - 0.1, 0.06, 0.1), body, cx, top, 0.58); // roof front edge
  add(B(W - 0.1, 0.06, 0.1), body, cx, top, -1.95); // roof back edge
  // Cream leather seats, wood-trimmed dash
  add(B(W - 0.2, 0.12, 0.3), mat('#6b4428'), cx, 0.9, 0.3); // dashboard wood
  add(B(0.34, 0.34, 0.04), mat('#2a2c31'), 0, 0.92, 0.22, -0.9); // steering wheel
  for (const [x, z] of [[0, 0], [-0.95, 0], [0, -1.3], [-0.95, -1.3]]) seatPair(g, x, z, '#e9dcc4', '#b08a5a');
  // Wheels: big flat silver discs
  for (const s of [-1, 1]) for (const z of [1.6, -2.15]) {
    const w = carWheel(0.38, 0.28);
    w.position.set(cx + s * 0.86, 0.38, z);
    g.add(w);
  }
  return g;
}

// The zoo's four-seat electric cart (Children's Grand Park): two benches of
// two under a striped canopy in the park's colours, a cream body and a
// green bumper. Driver's seat at the origin, front towards +z, like the cars.
export function makeZooCart() {
  const g = new THREE.Group();
  const add = (geo, m, x, y, z, rx = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.x = rx;
    g.add(o);
    return o;
  };
  const B = (sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz);
  const cx = -0.45, W = 1.6, body = shiny('#f6efdc'), green = mat('#3f9b5a');
  add(B(W, 0.18, 3.0), body, cx, 0.36, -0.35); // floor
  add(B(W, 0.5, 0.7), body, cx, 0.6, 0.95, -0.15); // the nose (cowl)
  add(B(W - 0.1, 0.06, 0.5), mat('#2f3338'), cx, 0.88, 0.7, -0.5); // dash
  add(B(W + 0.08, 0.14, 0.14), green, cx, 0.34, 1.33); // front bumper
  add(B(W + 0.08, 0.14, 0.14), green, cx, 0.34, -1.88); // back bumper
  add(B(0.34, 0.34, 0.04), mat('#2a2c31'), 0, 0.98, 0.42, -0.9); // steering wheel
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12).rotateX(Math.PI / 2), shiny('#fffbe0'), cx + s * 0.55, 0.66, 1.31); // headlights
  // Two benches: cushion and back, green
  for (const z of [0, -1.2]) {
    add(B(W - 0.12, 0.14, 0.52), green, cx, 0.58, z - 0.1);
    add(B(W - 0.12, 0.48, 0.1), green, cx, 0.86, z - 0.4, -0.15);
  }
  // Canopy: four posts and a striped roof
  for (const sx of [-1, 1]) for (const z of [0.45, -1.75]) add(B(0.06, 1.6, 0.06), mat('#d9d4c7'), cx + sx * (W / 2 - 0.05), 1.15, z);
  const STRIPE = ['#ef6f6c', '#f6efdc', '#f2c94c', '#f6efdc', '#56b4e9', '#f6efdc', '#7bc96f'];
  STRIPE.forEach((c, i) => add(B(W + 0.16, 0.07, 2.5 / STRIPE.length + 0.01), mat(c), cx, 1.97, 0.55 - (i + 0.5) * (2.5 / STRIPE.length)));
  for (const s of [-1, 1]) for (const z of [0.95, -1.5]) {
    const w = carWheel(0.27, 0.2);
    w.position.set(cx + s * 0.72, 0.27, z);
    g.add(w);
  }
  return g;
}

// Passenger seats relative to the driver ([x, z], driver facing +z).
export const SEATS = {
  2: [[0, -TANDEM_GAP]], // tandem back seat
  4: [[-0.9, 0]], // open sports car: one passenger beside the driver
  5: [[0, -0.5]], // motorbike: one passenger behind the rider
  6: [[-0.95, 0], [0, -1.3], [-0.95, -1.3]], // limousine: front passenger + two in the back
  7: [[-0.9, 0], [0, -1.2], [-0.9, -1.2]], // the zoo cart: beside the driver + the back bench
};

// Where seat n of the driver's vehicle is in the world.
export function seatPosition(front, kind, seat) {
  const [ox, oz] = SEATS[kind]?.[seat] || SEATS[2][0];
  const s = Math.sin(front.rotation.y), c = Math.cos(front.rotation.y);
  return [front.position.x + ox * c + oz * s, front.position.z - ox * s + oz * c];
}
