// The animal and ride costumes of the sky view (core/sky-costume.js), loaded
// the first time someone wears one:
//   albatross, eagle   the whole character turns into the bird; it carries
//                      someone by the shoulders in its talons
//   carpet             a flying carpet you sit on; it ripples in the wind and
//                      others sit behind you
//   cloud + Monkey King the cloud he stands on (others ride behind him), his
//                      golden headband, his staff, monkey ears, muzzle and tail
// Sizes are in metres; everything faces +z.
import * as THREE from 'three';

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.min(1, Math.max(0, u));

// A flat shape from [x, forward] points, lying in the xz plane (+z forward).
function flat(points, side = 1) {
  const s = new THREE.Shape();
  points.forEach(([x, f], i) => (i ? s.lineTo(side * x, -f) : s.moveTo(side * x, -f)));
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);
}

export function disposeObj(o) {
  o.traverse((m) => {
    m.geometry?.dispose();
    for (const x of [m.material].flat()) { x?.map?.dispose(); x?.dispose?.(); }
  });
}

// ---------- Birds ----------
// body: the body's radii (x, y, z); leg: leg length; inner / outer: the wing
// halves as [out, forward] points; flap: how it flies (rate: flaps a
// second, cruise / hover: how far it flaps then, bursty: flaps in bursts and
// glides, dihedral: wings held up a little, sway: rocking while soaring).
export const BIRDS = {
  // Big and white with long, narrow dark wings; it hardly flaps at all.
  albatross: {
    body: [0.36, 0.32, 0.95], leg: 0.42, head: 0.25, bill: [0.07, 0.48], tail: [0.34, 0.42],
    inner: [[0, 0.18], [1.5, 0.16], [1.5, -0.2], [0, -0.32]],
    outer: [[0, 0.16], [1.2, 0.1], [1.75, -0.02], [1.15, -0.13], [0, -0.2]],
    colors: { body: 0xfbfbf8, head: 0xffffff, wing: 0x3b3a40, under: 0xf1f1ee, tail: 0x4a4950, bill: 0xf2b5a3, hook: 0xe5a03c, feet: 0xeab3b3, talon: 0x8a6f6f, eye: 0x1d1b22, brow: 0x6e6d73 },
    flap: { rate: 1.0, cruise: 0.06, hover: 0.6, bursty: false, dihedral: 0.03, sway: 0.12 },
  },
  // Dark brown with a white head and tail, a yellow hooked beak and talons;
  // the wing tips spread like fingers.
  eagle: {
    body: [0.3, 0.3, 0.62], leg: 0.4, head: 0.22, bill: [0.08, 0.26], tail: [0.32, 0.5],
    inner: [[0, 0.22], [0.85, 0.2], [0.85, -0.42], [0, -0.42]],
    outer: [[0, 0.2], [0.55, 0.16], [0.9, 0.06], [1.02, -0.02], [0.8, -0.08], [0.97, -0.13], [0.76, -0.19], [0.88, -0.25], [0.6, -0.31], [0.66, -0.37], [0.3, -0.42], [0, -0.42]],
    colors: { body: 0x4b3322, head: 0xf7f5ee, wing: 0x3e2a1b, tail: 0xf4f2ea, bill: 0xf2c230, hook: 0xe0a91c, feet: 0xf2c230, talon: 0x1d1b22, eye: 0x1d1b22, pants: 0x4b3322 },
    flap: { rate: 1.6, cruise: 0.4, hover: 0.75, bursty: true, dihedral: 0.12, sway: 0 },
  },
};

// The bird: obj has its origin at the feet; anchor is where the talons hold
// someone's shoulders.
export function makeBird(kind) {
  const B = BIRDS[kind], c = B.colors;
  const mat = (col) => lambert(col, { side: THREE.DoubleSide });
  const obj = new THREE.Group();
  const belly = B.body[1] * 0.6;
  const h = belly + B.leg + 0.03;
  const pivot = new THREE.Group(); // turns about the middle of the body
  pivot.position.y = h;
  obj.add(pivot);
  const ball = new THREE.SphereGeometry(1, 16, 12);
  const body = new THREE.Mesh(ball, mat(c.body));
  body.scale.set(...B.body);
  pivot.add(body);
  // Head, beak (hooked at the tip), eyes.
  const head = new THREE.Group();
  head.position.set(0, B.body[1] * 0.55, B.body[2] * 0.88);
  pivot.add(head);
  const skull = new THREE.Mesh(ball, mat(c.head));
  skull.scale.set(B.head * 0.9, B.head * 0.92, B.head * 1.1);
  head.add(skull);
  const [br, bl] = B.bill;
  const bill = new THREE.Mesh(new THREE.ConeGeometry(br, bl, 8).rotateX(Math.PI / 2), mat(c.bill));
  bill.position.set(0, -B.head * 0.18, B.head * 0.85 + bl / 2);
  head.add(bill);
  const hook = new THREE.Mesh(ball, mat(c.hook));
  hook.scale.set(br * 0.6, br * 0.9, br * 0.7);
  hook.position.set(0, -B.head * 0.18 - br * 0.35, B.head * 0.85 + bl * 0.94);
  head.add(hook);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(ball, mat(c.eye));
    eye.scale.setScalar(B.head * 0.13);
    eye.position.set(s * B.head * 0.62, B.head * 0.22, B.head * 0.55);
    head.add(eye);
    if (c.brow) {
      const brow = new THREE.Mesh(ball, mat(c.brow));
      brow.scale.set(B.head * 0.08, B.head * 0.1, B.head * 0.3);
      brow.position.set(s * B.head * 0.66, B.head * 0.3, B.head * 0.42);
      head.add(brow);
    }
  }
  // Tail: a fan behind, spreading when slow.
  const [tw, tl] = B.tail;
  const tail = new THREE.Mesh(flat([[-tw * 0.4, 0], [tw * 0.4, 0], [tw * 0.6, -tl], [-tw * 0.6, -tl]]), mat(c.tail));
  tail.position.set(0, 0.02, -B.body[2] * 0.82);
  pivot.add(tail);
  // Wings: shoulder (folds back) > flapper (beats) > elbow (the outer half
  // beats a little after).
  const wingMat = mat(c.wing), underMat = c.under ? mat(c.under) : null;
  const wings = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * B.body[0] * 0.65, B.body[1] * 0.4, B.body[2] * 0.15);
    pivot.add(shoulder);
    const flapper = new THREE.Group();
    shoulder.add(flapper);
    flapper.add(new THREE.Mesh(flat(B.inner, side), wingMat));
    if (underMat) { const u = new THREE.Mesh(flat(B.inner, side), underMat); u.position.y = -0.012; flapper.add(u); }
    const elbow = new THREE.Group();
    elbow.position.x = side * B.inner[1][0];
    flapper.add(elbow);
    elbow.add(new THREE.Mesh(flat(B.outer, side), wingMat));
    wings.push({ shoulder, flapper, elbow, side });
  }
  // Legs with toes and black claws; they swing back under the tail in flight.
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.035, 0.03, B.leg, 6).translate(0, -B.leg / 2, 0);
  const toeGeo = new THREE.BoxGeometry(0.035, 0.03, 0.14).translate(0, 0, 0.07);
  const clawGeo = new THREE.ConeGeometry(0.018, 0.06, 5).rotateX(Math.PI / 2 + 0.6);
  const feet = mat(c.feet), claw = mat(c.talon);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.11, -belly + 0.02, 0.02);
    pivot.add(hip);
    if (c.pants) { // the eagle's feathered legs
      const p = new THREE.Mesh(ball, mat(c.pants));
      p.scale.set(0.09, 0.14, 0.09);
      p.position.y = -0.06;
      hip.add(p);
    }
    hip.add(new THREE.Mesh(legGeo, feet));
    const foot = new THREE.Group();
    foot.position.y = -B.leg;
    hip.add(foot);
    for (const a of [-0.45, 0, 0.45, Math.PI]) {
      const toe = new THREE.Group();
      toe.rotation.y = a;
      toe.add(new THREE.Mesh(toeGeo, feet));
      const cl = new THREE.Mesh(clawGeo, claw);
      cl.position.set(0, -0.01, 0.15);
      toe.add(cl);
      foot.add(toe);
    }
    legs.push(hip);
  }
  const anchor = new THREE.Object3D();
  anchor.position.set(0, -belly - B.leg + 0.08, 0.02);
  pivot.add(anchor);
  return { obj, pivot, wings, legs, tail, anchor, B, flapT: 0, swayT: 0, g: 1 };
}

// Each frame. s: the costume's state (sky-costume.js), y: height over the
// ground it took off from.
export function poseBird(b, s, dt) {
  const F = b.B.flap;
  const grounded = s.y < 0.3 && s.phase !== 'fly';
  b.g += ((grounded ? 1 : 0) - b.g) * Math.min(1, dt * 6); // 1 standing .. 0 in the air
  const g = b.g, air = 1 - g, hover = 1 - s.hf;
  b.swayT += dt;
  // Nose up while hovering or climbing, level when flying fast; banking.
  b.pivot.rotation.x = (-0.3 * hover - s.climb * 0.18) * air - 0.08 * g;
  b.pivot.rotation.z = (s.roll * 1.4 + Math.sin(b.swayT * 0.7) * F.sway * s.hf) * air;
  // Hard work (hovering, climbing) flaps big; cruising the eagle flaps in
  // bursts and glides, the albatross just soars.
  const work = Math.max(hover, s.climb > 0 ? 1 : 0);
  b.flapT += dt * F.rate * (1 + work * 0.8) * Math.PI * 2;
  const burst = F.bursty ? smooth(clamp01(Math.sin(b.swayT * 0.9) * 1.5 + 0.3)) : 1;
  const amp = air * (F.cruise * burst * (1 - work) + F.hover * work);
  const beat = Math.sin(b.flapT) * amp;
  for (const w of b.wings) {
    w.shoulder.rotation.y = w.side * 1.4 * g;
    w.shoulder.scale.setScalar(1 - 0.5 * g);
    w.flapper.rotation.z = w.side * (F.dihedral * air + 0.2 * g + beat);
    w.elbow.rotation.z = w.side * (Math.sin(b.flapT - 0.7) * amp * 0.6 - 0.3 * g);
  }
  // Legs down when standing, hovering or holding someone; tucked back in flight.
  const down = Math.max(g, s.carry === 'talons' ? 1 : 0, hover * 0.6);
  for (const leg of b.legs) leg.rotation.x = (1 - down) * 1.3;
  b.tail.scale.x = 1 + 0.6 * hover * air;
}

// ---------- The flying carpet ----------
export const CARPET = { w: 1.3, l: 2.1, y: 0.42, z: -0.3 }; // size; where its middle is under the rider

function carpetTexture() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const x = cv.getContext('2d');
  if (!x) return null;
  x.fillStyle = '#efe2c4'; // fringe threads at both ends (gaps see-through)
  for (let i = 1; i < 128; i += 6) { x.fillRect(i, 0, 3, 12); x.fillRect(i, 244, 3, 12); }
  x.fillStyle = '#a3202f';
  x.fillRect(0, 12, 128, 232);
  x.lineWidth = 8; x.strokeStyle = '#e8b64c'; x.strokeRect(8, 20, 112, 216);
  x.lineWidth = 4; x.strokeStyle = '#1f2f5c'; x.strokeRect(18, 30, 92, 196);
  x.fillStyle = '#e8b64c';
  for (let v = 40; v < 220; v += 14) { x.fillRect(4, v, 4, 4); x.fillRect(120, v, 4, 4); }
  const diamond = (cx, cy, rx, ry, col) => {
    x.fillStyle = col;
    x.beginPath(); x.moveTo(cx, cy - ry); x.lineTo(cx + rx, cy); x.lineTo(cx, cy + ry); x.lineTo(cx - rx, cy); x.closePath(); x.fill();
  };
  diamond(64, 128, 36, 62, '#1f2f5c');
  diamond(64, 128, 26, 46, '#e8b64c');
  diamond(64, 128, 16, 28, '#a3202f');
  diamond(64, 128, 6, 10, '#efe2c4');
  for (const [cx, cy] of [[30, 44], [98, 44], [30, 212], [98, 212]]) diamond(cx, cy, 8, 10, '#e8b64c');
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCarpet() {
  const obj = new THREE.Group(); // (the piece that flies in)
  obj.position.set(0, CARPET.y, CARPET.z);
  const tilt = new THREE.Group();
  obj.add(tilt);
  const geo = new THREE.PlaneGeometry(CARPET.w, CARPET.l, 8, 16).rotateX(-Math.PI / 2);
  const map = carpetTexture();
  const mesh = new THREE.Mesh(geo, lambert(map ? 0xffffff : 0xa3202f, { map, side: THREE.DoubleSide, alphaTest: 0.5 }));
  tilt.add(mesh);
  return { obj, tilt, geo, base: Float32Array.from(geo.attributes.position.array), time: 0 };
}

// The ripple: the front edge stays put, waves run back and grow towards
// the back edge; stronger the faster we fly. Still on the ground.
export function waveCarpet(c, dt, hf, up) {
  c.time += dt;
  const pos = c.geo.attributes.position, base = c.base, t = c.time;
  const amp = up * (0.035 + 0.07 * hf);
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], z = base[i * 3 + 2];
    const k = (CARPET.l / 2 - z) / CARPET.l; // 0 front .. 1 back
    pos.setY(i, amp * k * Math.sin(t * (5 + 4 * hf) - k * 7 + x * 1.2) + up * 0.012 * Math.sin(t * 2.3 + x * 3 + z));
  }
  pos.needsUpdate = true;
  c.geo.computeVertexNormals();
}

// ---------- The Monkey King's cloud ----------
export const CLOUD = { y: -0.08, z: -0.3 };
export function makeCloud() {
  const obj = new THREE.Group();
  obj.position.set(0, CLOUD.y, CLOUD.z);
  const tilt = new THREE.Group();
  obj.add(tilt);
  const geo = new THREE.SphereGeometry(1, 12, 9);
  const white = lambert(0xfffaf0, { emissive: 0x2a2410 }), gold = lambert(0xffe6a0, { emissive: 0x3a2a00 });
  const puffs = [];
  const add = (x, y, z, r, m, flatY = 0.6) => {
    const p = new THREE.Mesh(geo, m);
    p.position.set(x, y, z);
    p.userData.r = [r, r * flatY, r];
    p.userData.ph = puffs.length * 1.7;
    p.scale.set(...p.userData.r);
    tilt.add(p);
    puffs.push(p);
  };
  // The bed you stand on.
  add(0, 0, 0.55, 0.42, white); add(0.42, -0.02, 0.25, 0.38, white); add(-0.42, -0.02, 0.25, 0.38, white);
  add(0, 0.03, -0.05, 0.48, white); add(0.36, 0, -0.38, 0.36, white); add(-0.36, 0, -0.38, 0.36, white);
  add(0, -0.03, -0.62, 0.4, white); add(0, -0.2, 0.1, 0.45, gold, 0.5); add(0, -0.18, -0.45, 0.38, gold, 0.5);
  // The curling tail behind it, rising and thinning.
  for (let i = 1; i <= 6; i++) {
    const k = i / 6;
    add(Math.sin(k * Math.PI * 2) * 0.28, 0.05 + Math.sin(k * Math.PI) * 0.45, -0.9 - k * 0.85, 0.32 * (1 - k * 0.65), i % 2 ? gold : white, 0.9);
  }
  return { obj, tilt, puffs, time: 0 };
}
export function puffCloud(c, dt, hf) {
  c.time += dt;
  const t = c.time;
  c.tilt.position.y = 0.04 * Math.sin(t * 1.6);
  for (const p of c.puffs) {
    const [rx, ry, rz] = p.userData.r, k = 1 + 0.07 * Math.sin(t * 2.2 + p.userData.ph);
    p.scale.set(rx * k, ry * k, rz * k * (1 + 0.25 * hf * (p.position.z < -0.8 ? 1 : 0)));
  }
}

// ---------- The Monkey King ----------
// Pieces in sky-costume.js's form: { obj, at, from, delay, dur }; 'head'
// and 'body' are the character's accessory spaces (chibi units), a bone
// name is metres along that bone.
export function wukongPieces() {
  const fur = lambert(0x9a6a3a), face = lambert(0xf0cfa6), pink = lambert(0xf2b2a0), dark = lambert(0x3a2418);
  const goldM = lambert(0xf2c94c, { emissive: 0x3a2a00 }), red = lambert(0xb3261e);
  const ball = new THREE.SphereGeometry(1, 14, 10);
  const out = [];
  // The golden headband (긴고아) with a little ornament at the front.
  const band = new THREE.Group();
  band.position.y = 0.14;
  band.add(new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.026, 6, 28).rotateX(Math.PI / 2), goldM));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), goldM);
  gem.scale.set(1, 1.3, 0.5);
  gem.position.set(0, 0.02, 0.34);
  band.add(gem);
  out.push({ obj: band, at: 'head', from: [0, 1.6, 0], delay: 0.7, dur: 0.4 });
  // Monkey ears.
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.37, -0.02, 0);
    const outer = new THREE.Mesh(ball, fur);
    outer.scale.set(0.035, 0.11, 0.1);
    const inner = new THREE.Mesh(ball, pink);
    inner.scale.set(0.02, 0.07, 0.065);
    inner.position.x = s * 0.02;
    ear.add(outer, inner);
    out.push({ obj: ear, at: 'head', from: [s * 1.2, 0, 0], delay: 0.35, dur: 0.35 });
  }
  // The muzzle with nostrils, and furry cheeks.
  const muzzle = new THREE.Group();
  muzzle.position.set(0, -0.16, 0.28);
  const snout = new THREE.Mesh(ball, face);
  snout.scale.set(0.14, 0.085, 0.09);
  muzzle.add(snout);
  for (const s of [-1, 1]) {
    const n = new THREE.Mesh(ball, dark);
    n.scale.setScalar(0.014);
    n.position.set(s * 0.025, 0.035, 0.085);
    muzzle.add(n);
    const cheek = new THREE.Mesh(ball, fur);
    cheek.scale.set(0.05, 0.08, 0.05);
    cheek.position.set(s * 0.26, 0.06, -0.1);
    muzzle.add(cheek);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 4, 10, Math.PI).rotateZ(Math.PI), dark);
  mouth.position.set(0, -0.015, 0.088);
  muzzle.add(mouth);
  out.push({ obj: muzzle, at: 'head', from: [0, 0, 1.2], delay: 0.45, dur: 0.35 });
  // The tail, curling up behind.
  const curve = new THREE.CatmullRomCurve3([[0, 0.32, -0.12], [0, 0.18, -0.38], [0, 0.32, -0.62], [0, 0.6, -0.6], [0, 0.7, -0.42], [0, 0.6, -0.34]].map((p) => new THREE.Vector3(...p)));
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.032, 6), fur);
  out.push({ obj: tail, at: 'body', from: [0, -0.6, -1], delay: 0.55, dur: 0.4 });
  // The staff (여의봉): red with gold caps, across the right hand.
  const staff = new THREE.Group();
  staff.position.y = 0.05;
  staff.add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.5, 8), red));
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.13, 8), goldM);
    cap.position.y = s * 0.69;
    staff.add(cap);
  }
  staff.rotation.x = Math.PI / 2;
  out.push({ obj: staff, at: 'handr', from: [0, 1.5, 0], delay: 0.9, dur: 0.45 });
  return out;
}
