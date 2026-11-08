// Another Land (어나더랜드): an original candy-house theme park on the
// island in Seokchon Lake's west lake (Songpa district). This is the
// outside, seen from the lakeside: a gingerbread gate with a frosting sign (the door into the park, see themepark.js), a candy
// castle, a giant Ferris wheel, a roller coaster and a drop tower, all tall
// enough to spot from far away. Our own design, not modelled on any real park.
// District-local metres: the gate faces west (-x), the park runs east.
// Collision comes from the district's blockers; this is only visual.
// Returns tick(t) to turn the wheel, run the coaster and the drop tower.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';

const mat = matCache({ flatShading: true });
const K = {
  ginger: '#b8743f', gingerDark: '#8d5530', icing: '#fffaf3', pink: '#ff8fb8', hotPink: '#ff5f9e', mint: '#8fe3c7',
  lemon: '#ffe27a', lilac: '#c9a8ff', sky: '#8fd0ff', choco: '#6b3f2a', orange: '#ffad6b', cherry: '#ff5a5f',
};
const CANDY = [K.pink, K.mint, K.lemon, K.lilac, K.sky, K.orange, K.cherry];

const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
function cyl(g, rt, rb, h, x, y, z, c, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
  m.position.set(x, y + h / 2, z);
  g.add(m);
  return m;
}
function ball(g, r, x, y, z, c, sy = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat(c));
  m.position.set(x, y, z);
  m.scale.y = sy;
  g.add(m);
  return m;
}
// A candy-striped column: stacked bands in two colours.
function striped(g, r, h, x, y, z, a, b, band = 1.6) {
  const n = Math.max(1, Math.round(h / band));
  for (let i = 0; i < n; i++) cyl(g, r, r, h / n, x, y + (i * h) / n, z, i % 2 ? b : a);
}
// A gumdrop / frosting roof: a cone with a drip ring and a cherry on top.
function candyRoof(g, r, h, x, y, z, c) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), mat(c));
  cone.position.set(x, y + h / 2, z);
  g.add(cone);
  cyl(g, r * 1.04, r * 1.04, 0.5, x, y, z, K.icing);
  ball(g, Math.max(0.5, r * 0.18), x, y + h + 0.3, z, K.cherry);
}
// A lollipop: a stick and a swirl disc facing x (seen from Seongsu).
let swirlTex = null;
function swirl() {
  if (swirlTex) return swirlTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#fff6fb'; x.fillRect(0, 0, 256, 256);
  x.lineWidth = 22; x.lineCap = 'round';
  const cols = ['#ff5f9e', '#8fe3c7', '#ffe27a', '#c9a8ff'];
  for (let k = 0; k < 4; k++) {
    x.strokeStyle = cols[k];
    x.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.05) {
      const r = (a / (Math.PI * 7)) * 120;
      const px = 128 + Math.cos(a + (k * Math.PI) / 2) * r, py = 128 + Math.sin(a + (k * Math.PI) / 2) * r;
      if (a === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
  }
  swirlTex = new THREE.CanvasTexture(c);
  swirlTex.colorSpace = THREE.SRGBColorSpace;
  return swirlTex;
}
function lollipop(g, r, stick, x, y, z) {
  cyl(g, r * 0.08, r * 0.08, stick, x, y, z, K.icing, 8);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.25, 28), [mat(K.hotPink), new THREE.MeshLambertMaterial({ map: swirl() }), new THREE.MeshLambertMaterial({ map: swirl() })]);
  disc.rotation.z = Math.PI / 2; // flat faces look east and west
  disc.position.set(x, y + stick + r * 0.9, z);
  g.add(disc);
}
// The park's name in frosting on a pink board.
function signBoard(w, h) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ff7fb0'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#fffaf3';
  for (let i = 0; i < 1024; i += 64) { x.beginPath(); x.arc(i + 32, 0, 30, 0, Math.PI); x.fill(); } // drips
  const dots = ['#8fe3c7', '#ffe27a', '#c9a8ff', '#8fd0ff'];
  for (let i = 0; i < 40; i++) { x.fillStyle = dots[i % 4]; x.fillRect(20 + ((i * 197) % 980), 200 + ((i * 53) % 40), 18, 7); } // sprinkles
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 128px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  x.lineWidth = 18; x.strokeStyle = '#c23d78'; x.strokeText('ANOTHER LAND', 512, 132);
  x.fillStyle = '#fffaf3'; x.fillText('ANOTHER LAND', 512, 132);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.rotation.y = -Math.PI / 2; // faces west
  return m;
}

// Pure motion (unit-tested), seconds → position along each ride.
export const WHEEL = { x: 78, z: -30, hub: 31, r: 26, cabins: 20, period: 90 };
export const DROP = { x: 112, z: 2, top: 50, low: 2.5, cycle: 16 };
export function dropHeight(t) {
  const p = ((t % DROP.cycle) + DROP.cycle) % DROP.cycle;
  if (p < 3) return DROP.low; // loading
  if (p < 11) return DROP.low + ((p - 3) / 8) * (DROP.top - DROP.low); // slow climb
  if (p < 13) return DROP.top; // hold at the top…
  if (p < 14) { const k = p - 13; return DROP.top - k * k * (DROP.top - DROP.low - 4); } // …and drop
  return DROP.low + 4 * (1 - (p - 14) / 2); // brakes, settle back down
}
// The coaster's closed track: hills and a big first drop around (90, 32).
export const COASTER = [
  [58, 4, 20], [66, 14, 16], [76, 26, 14], [86, 27, 14], [94, 6, 18], [104, 16, 24], [112, 6, 32],
  [110, 18, 44], [98, 9, 50], [84, 20, 52], [70, 7, 50], [60, 13, 42], [54, 5, 32],
];

export function buildAnotherLand(g) {
  // ── Main gate: gingerbread over the district's gate block (x 0..10,
  // z -6..6, 9 m), leaving the middle of the west face for the shop door.
  box(g, 10.05, 9, 12.3, 5.125, 4.5, 0, K.ginger);
  box(g, 0.08, 4.4, 12.2, -0.05, 6.8, 0, K.ginger);
  for (const s of [-1, 1]) box(g, 0.08, 4.6, 2.7, -0.05, 2.3, s * 4.75, K.gingerDark);
  box(g, 0.2, 0.35, 12.2, -0.12, 4.65, 0, K.icing); // icing line over the door
  for (let i = 0; i < 10; i++) ball(g, 0.32, -0.12, 5.6 + (i % 2) * 1.6, -5.2 + i * 1.15, CANDY[i % CANDY.length]); // candy buttons
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ball(g, 0.3, -0.12, 1 + i * 1.3, s * 4.75, K.icing);
  // Frosting on top, the name, two striped towers.
  box(g, 10.8, 1.4, 12.8, 5, 9.4, 0, K.icing);
  for (let i = 0; i < 7; i++) ball(g, 0.55, -0.35, 9.3, -5.4 + i * 1.8, K.icing, 1.4); // drips over the door
  for (let i = 0; i < 9; i++) ball(g, 0.5, 5, 10.4, -4.8 + i * 1.2, CANDY[i % CANDY.length]); // gumdrops on top
  const sign = signBoard(17, 4.25);
  sign.position.set(-0.6, 13.6, 0);
  g.add(sign);
  box(g, 0.6, 4.6, 17.6, -0.2, 13.6, 0, K.gingerDark);
  for (const s of [-1, 1]) {
    striped(g, 3.2, 16, 5, 0, s * 10, K.pink, K.icing, 2);
    cyl(g, 3.6, 3.6, 0.8, 5, 16, s * 10, K.ginger);
    candyRoof(g, 4, 7, 5, 16.8, s * 10, s < 0 ? K.mint : K.lilac);
    // Candy-cane posts at the door.
    striped(g, 0.45, 7, -1, 0, s * 7.5, K.cherry, K.icing, 0.7);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.45, 8, 12, Math.PI), mat(K.cherry));
    hook.position.set(-1, 7, s * 7.5 - s * 0.9);
    hook.rotation.y = Math.PI / 2;
    g.add(hook);
  }

  // ── Candy wall round the park: biscuit blocks with gumdrops on top.
  const wallSeg = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 4));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const b = box(g, 4, 3, 1.4, x, 1.5, z, i % 2 ? K.ginger : K.icing);
      b.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      ball(g, 0.75, x, 3.4, z, CANDY[i % CANDY.length], 0.8);
    }
  };
  wallSeg(1, -60, 1, -13.5); wallSeg(1, 13.5, 1, 60);
  wallSeg(1, -60, 130, -60); wallSeg(1, 60, 130, 60); wallSeg(130, -60, 130, 60);

  // ── Candy castle in the middle: a gingerbread keep with frosting.
  const CX = 40;
  box(g, 16, 13, 24, CX, 6.5, 0, K.ginger);
  box(g, 16.6, 1.2, 24.6, CX, 13, 0, K.icing);
  for (let i = 0; i < 12; i++) ball(g, 0.6, CX - 8.3, 12.3, -11 + i * 2, K.icing, 1.5);
  for (let i = 0; i < 24; i++) ball(g, 0.45, CX - 8.2, 2 + (i % 4) * 2.6, -10.5 + Math.floor(i / 4) * 4.2, CANDY[i % CANDY.length]); // candy buttons
  for (const z of [-6, 0, 6]) box(g, 0.3, 3, 2.4, CX - 8.1, 7, z, z ? K.lemon : K.choco); // windows, a chocolate door
  const roof = new THREE.Mesh(new THREE.ConeGeometry(15, 7, 4), mat(K.pink));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(0.8, 1, 1.15);
  roof.position.set(CX, 17.1, 0);
  g.add(roof);
  for (const [dx, dz, c] of [[-8, -12, K.mint], [-8, 12, K.lilac], [8, -12, K.lemon], [8, 12, K.sky]]) {
    striped(g, 2.4, 20, CX + dx, 0, dz, K.icing, c, 2.5);
    candyRoof(g, 3, 6, CX + dx, 20, dz, K.hotPink);
  }
  striped(g, 4.6, 30, CX + 1, 0, 0, K.mint, K.icing, 3);
  cyl(g, 5.2, 5.2, 1, CX + 1, 30, 0, K.ginger);
  candyRoof(g, 5.6, 11, CX + 1, 31, 0, K.choco);
  lollipop(g, 3.4, 4, CX + 1, 42, 0);

  // ── Giant Ferris wheel: the disc faces west so Seongsu sees it whole.
  const W = WHEEL;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(g, 1, Math.hypot(W.hub, 9) + 1, 1, W.x + sx * 2.5, W.hub / 2, W.z + sz * 4.5, K.icing);
    leg.rotation.x = -sz * Math.atan2(9, W.hub);
  }
  cyl(g, 1.4, 1.4, 6, W.x, W.hub - 3, W.z, K.hotPink).rotation.z = Math.PI / 2;
  const wheel = new THREE.Group();
  wheel.position.set(W.x, W.hub, W.z);
  g.add(wheel);
  for (const dx of [-1.6, 1.6]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(W.r, 0.35, 6, 64), mat(K.pink));
    rim.rotation.y = Math.PI / 2;
    rim.position.x = dx;
    wheel.add(rim);
  }
  for (let i = 0; i < W.cabins / 2; i++) {
    const s = box(wheel, 0.3, W.r * 2, 0.3, 0, 0, 0, K.icing);
    s.rotation.x = (i / (W.cabins / 2)) * Math.PI;
  }
  for (let i = 0; i < W.cabins; i++) { // twinkling bulbs on the rim
    const a = (i / W.cabins) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), new THREE.MeshBasicMaterial({ color: CANDY[i % CANDY.length] }));
    b.position.set(-1.9, Math.cos(a) * W.r, Math.sin(a) * W.r);
    wheel.add(b);
  }
  const cabins = [];
  for (let i = 0; i < W.cabins; i++) { // macaron gondolas that stay level
    const c = new THREE.Group();
    ball(c, 1.6, 0, -2.2, 0, CANDY[i % CANDY.length], 0.45);
    ball(c, 1.6, 0, -3.6, 0, CANDY[i % CANDY.length], 0.45);
    cyl(c, 1.5, 1.5, 0.5, 0, -3.2, 0, K.icing);
    cyl(c, 0.08, 0.08, 1.6, 0, -1.6, 0, K.icing, 6);
    g.add(c);
    cabins.push(c);
  }

  // ── Roller coaster: white icing rails on chocolate posts, a hot-pink
  // three-car train (the Cotton Candy Express you ride inside: coaster.js).
  const curve = new THREE.CatmullRomCurve3(COASTER.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'catmullrom', 0.4);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.45, 6, true), mat(K.icing)));
  for (let i = 0; i < 40; i++) {
    const p = curve.getPointAt(i / 40);
    if (p.y > 1.2) cyl(g, 0.22, 0.3, p.y - 0.4, p.x, 0, p.z, K.choco, 6);
  }
  const train = [];
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    box(car, 2.2, 0.9, 1.4, 0, 0.75, 0, K.hotPink);
    box(car, 2.3, 0.2, 1.5, 0, 1.2, 0, K.icing);
    g.add(car);
    train.push(car);
  }

  // ── Drop tower: a candy-striped pole, a ring of seats that climbs and drops.
  const D = DROP;
  striped(g, 1.6, D.top + 6, D.x, 0, D.z, K.icing, K.cherry, 3.2);
  cyl(g, 3.2, 3.2, 1.6, D.x, D.top + 6, D.z, K.lemon);
  candyRoof(g, 3.4, 5, D.x, D.top + 7.6, D.z, K.pink);
  const ring = new THREE.Group();
  ring.position.set(D.x, D.low, D.z);
  g.add(ring);
  cyl(ring, 3.6, 3.6, 1, 0, 0, 0, K.mint, 20);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(ring, 0.9, 1.3, 0.9, Math.cos(a) * 3.6, 0.3, Math.sin(a) * 3.6, CANDY[i % CANDY.length]);
  }
  cyl(g, 5, 5.4, 1.4, D.x, 0, D.z, K.ginger);

  // ── Lollipop trees and gumdrop bushes on the lawns.
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 22; i++) {
    const x = 6 + rnd() * 120, z = -56 + rnd() * 112;
    if (Math.abs(z) < 16 && x < 60) continue; // keep the castle and main path clear
    if (Math.hypot(x - W.x, z - W.z) < 12 || Math.hypot(x - D.x, z - D.z) < 7) continue;
    if (i % 2) lollipop(g, 1.6 + rnd(), 3 + rnd() * 2, x, 0, z);
    else ball(g, 2 + rnd() * 1.5, x, 0.8, z, CANDY[i % CANDY.length], 0.8);
  }
  // A path of biscuit tiles from the gate to the castle.
  const path = new THREE.Mesh(new THREE.PlaneGeometry(30, 7).rotateX(-Math.PI / 2), mat(K.lemon));
  path.position.set(17, 0.05, 0);
  g.add(path);

  const v = new THREE.Vector3(), ahead = new THREE.Vector3();
  return function tick(t) {
    const ang = (t / W.period) * Math.PI * 2;
    wheel.rotation.x = ang;
    cabins.forEach((c, i) => {
      const a = ang + (i / W.cabins) * Math.PI * 2;
      c.position.set(W.x - 3, W.hub + Math.cos(a) * W.r, W.z + Math.sin(a) * W.r);
    });
    train.forEach((car, i) => {
      const u = (((t / 26) - i * 0.012) % 1 + 1) % 1;
      curve.getPointAt(u, v);
      curve.getPointAt((u + 0.004) % 1, ahead);
      car.position.copy(v);
      car.lookAt(ahead);
      car.rotateY(Math.PI / 2);
    });
    ring.position.y = dropHeight(t);
  };
}
