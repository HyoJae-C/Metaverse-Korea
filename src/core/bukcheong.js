// 북청사자놀음 (Bukcheong lion dance) on Gwanghwamun Square: fourteen
// people. Two big shaggy brown lions with red masks (two dancers inside
// each), four musicians (two tungso flutes, a drum, a janggu), the yangban
// and his servant Kkoksoe, and four more roles: the doctor (의원), the monk
// (스님), the hunchback (꼽추) and the boy dancer (무동).
// The lions prowl round the ring and now and then rear up on their hind
// legs. Once a round one lion falls ill and lies down; the doctor and the
// monk come to it, it springs back up, and both lions rear up together
// facing the square while everyone cheers (a moment for photos).
// Like the other palace performers they only move while you're near, and
// nothing blocks you: you can walk right up to the lions.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';

const NEAR = 110; // metres: closer than this, they perform
const BAND = new Set(['tungso', 'buk', 'janggu']);

// Who is in the troupe and how many people each part takes (a lion is
// played by two). Fourteen in all.
export const TROUPE = [
  { role: 'lion', n: 2, people: 2 },
  { role: 'tungso', n: 2 }, { role: 'buk', n: 1 }, { role: 'janggu', n: 1 },
  { role: 'yangban', n: 1 }, { role: 'kkoksoe', n: 1 },
  { role: 'doctor', n: 1 }, { role: 'monk', n: 1 }, { role: 'hunchback', n: 1 }, { role: 'boy', n: 1 },
];
export const TROUPE_PEOPLE = TROUPE.reduce((s, r) => s + r.n * (r.people || 1), 0);

// The square is the audience's side (-x, towards the middle of the
// square); the performers face it. Places in metres from the ring's centre.
const FACE = -Math.PI / 2; // facing -x
export const LION_RING = 2.6; // the lions prowl round this circle
export const SICK_RING = 3.9; // the other lion, while one lies sick in the middle
export const SLOTS = {
  tungso: [[7.2, -3], [7.6, -1]], buk: [[7.6, 1]], janggu: [[7.2, 3]], // the band, behind
  yangban: [[-4.2, -1.6]], kkoksoe: [[-4.2, 1.6]], // in front, nearest the audience
  doctor: [[2.6, -5]], monk: [[2.6, 5]], hunchback: [[-1, -5.2]], boy: [[-1, 5.2]], // round the ring
};
// The round, in seconds. Dance, then the sick lion (SICK..UP), then both
// lions up on their hind legs together (UP..UP+HOLD), then dance again.
export const CYCLE = 60;
export const SICK = 24; // a lion tires and lies down
export const UP = 36; // ...and springs up again
export const HOLD = 6; // both reared up, facing the square
export const SICK_SPOT = [-0.4, 0]; // where the sick lion lies, facing the square
export const HEAL = { doctor: [-0.9, -1.35], monk: [-0.9, 1.35] }; // at its side
export const REAR_SPOTS = [[-0.4, -1.6], [-0.4, 1.6]]; // side by side for the photo
export const REAR_EVERY = [7, 13]; // seconds between a lion's rear-ups while dancing
export const REAR_LEN = 2.8;

// What part of the round it is at time u (0..CYCLE).
export function phaseAt(u) {
  if (u >= SICK && u < UP) return 'sick';
  if (u >= UP && u < UP + HOLD) return 'rear';
  return 'dance';
}

const mat = matCache();
const furMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const ball = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c));
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  return o;
};
const box = (g, sx, sy, sz, x, y, z, c) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  o.position.set(x, y, z);
  g.add(o);
  return o;
};

// The lion's coat: long threads of browns, rust and olive, like the costume
// of dyed hemp. Each strand hangs from its top (x, y, z) down `len`, tilted
// outward; all of a part's strands are merged into one mesh.
const FUR = ['#6e4329', '#8a5532', '#a5703f', '#5a3a26', '#7d6a3c', '#94432d', '#b3834c'];
function strands(list, rand) {
  const geos = list.map(([x, y, z, len, tx = 0, tz = 0, w = 0.055]) => {
    const g = new THREE.BoxGeometry(w, len, 0.04);
    g.deleteAttribute('uv');
    g.translate(0, -len / 2, 0);
    g.rotateX(tx); g.rotateZ(tz);
    g.translate(x, y, z);
    const c = new THREE.Color(FUR[Math.floor(rand() * FUR.length)]);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return new THREE.Mesh(mergeGeometries(geos), furMat);
}
// A small seeded random, so both lions get the same shag every time.
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// 북청 사자탈: the red mask with bulging eyes, a white band of teeth, a big
// open mouth and a red tongue, framed by a shaggy mane. Facing +z.
function lionHead(rand) {
  const head = new THREE.Group();
  const red = '#c42d27', dark = '#7a1c18';
  // the mane, hanging behind and round the mask
  const mane = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    mane.push([Math.cos(a) * 0.5, 0.15 + Math.sin(a) * 0.42, -0.12, 0.55 + rand() * 0.3, -0.15, Math.cos(a) * 0.35, 0.09]);
  }
  for (let i = 0; i < 12; i++) mane.push([-0.45 + i * 0.08, 0.5, -0.22, 0.9 + rand() * 0.2, -0.35, 0, 0.09]);
  head.add(strands(mane, rand));
  head.add(ball(0.42, red, 0, 0.08, 0.1, 1.08, 0.82, 0.95)); // the upper face
  head.add(ball(0.3, red, 0, 0.0, 0.3, 1.1, 0.6, 0.8)); // the snout
  for (const s of [-1, 1]) {
    head.add(ball(0.13, red, 0.18 * s, 0.3, 0.32)); // the brow bulge
    head.add(ball(0.1, '#ffffff', 0.18 * s, 0.3, 0.41, 1, 0.85, 0.6)); // eye
    head.add(ball(0.05, '#1d1b22', 0.18 * s, 0.3, 0.47, 1, 1, 0.6)); // pupil
    const brow = box(head, 0.2, 0.05, 0.05, 0.2 * s, 0.43, 0.38, '#ffffff');
    brow.rotation.z = -0.4 * s;
    head.add(ball(0.08, red, 0.38 * s, 0.38, 0.02, 1, 1.4, 0.7)); // ear
    head.add(ball(0.07, red, 0.08 * s, 0.1, 0.53)); // nostril bump
    head.add(ball(0.03, '#3a0f0d', 0.08 * s, 0.08, 0.59));
    // the white curls on the cheeks
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12, Math.PI * 1.5), mat('#ffffff'));
    curl.position.set(0.3 * s, 0.05, 0.36); curl.rotation.y = 0.5 * s;
    head.add(curl);
  }
  // the upper teeth: a white band along the mouth
  for (let i = 0; i < 7; i++) box(head, 0.07, 0.07, 0.05, -0.27 + i * 0.09, -0.13, 0.46 - Math.abs(i - 3) * 0.025, '#fbf8ee');
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.17, 0.12);
  head.add(jaw);
  jaw.add(ball(0.3, red, 0, -0.06, 0.12, 1.1, 0.38, 1.05)); // the lower jaw
  jaw.add(ball(0.24, dark, 0, -0.01, 0.16, 1.05, 0.2, 0.95)); // inside the mouth
  for (let i = 0; i < 6; i++) box(jaw, 0.06, 0.05, 0.04, -0.22 + i * 0.088, 0.02, 0.4 - Math.abs(i - 2.5) * 0.03, '#fbf8ee');
  const tongue = box(jaw, 0.2, 0.04, 0.3, 0, 0.01, 0.34, '#e8524a');
  tongue.rotation.x = 0.25;
  return { head, jaw };
}

// A lion: two dancers under one shaggy coat (only their feet show below the
// fringe). The front half turns about the back dancer's hips so it can
// rear up. Body ~2 m long, facing +z.
export function makeShaggyLion(seed = 7) {
  const rand = seeded(seed);
  const root = new THREE.Group();
  const HIP = [0, 0.62, -0.95];
  const pivot = new THREE.Group(); // the back dancer's hips
  pivot.position.set(...HIP);
  root.add(pivot);
  const body = new THREE.Group(); // everything that rears, in the lion's metres
  body.position.set(-HIP[0], -HIP[1], -HIP[2]);
  pivot.add(body);
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.3, 6, 12), mat('#6e4329'));
  back.rotation.x = Math.PI / 2; back.position.set(0, 1.0, -0.3);
  body.add(back);
  // the coat: rows of threads over the back, hanging down the sides to just
  // above the feet
  const coat = [];
  for (let zz = -1.3; zz <= 0.62; zz += 0.11) {
    for (let k = -6; k <= 6; k++) {
      const a = (k / 6) * 1.75, px = Math.sin(a) * 0.6, py = 1.02 + Math.cos(a) * 0.48;
      coat.push([px + (rand() - 0.5) * 0.04, py, zz + (rand() - 0.5) * 0.05, Math.max(0.25, py - 0.2 + (rand() - 0.5) * 0.08), (rand() - 0.5) * 0.12, a * 0.18]);
    }
  }
  // the rump and the chest, so no gap shows at the ends
  for (let k = -5; k <= 5; k++) {
    coat.push([k * 0.11, 1.35 - Math.abs(k) * 0.03, -1.4, 1.05, -0.12, 0]);
    coat.push([k * 0.11, 1.15, 0.7, 0.85, 0.15, 0]);
  }
  body.add(strands(coat, rand));
  const { head, jaw } = lionHead(rand);
  head.position.set(0, 1.32, 0.78);
  body.add(head);
  // the four legs: shaggy trousers and black shoes
  const legs = [];
  const leg = (x, z, parent) => {
    const g = new THREE.Group();
    g.position.set(x, 0.62, z);
    const ring = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ring.push([Math.sin(a) * 0.11, 0.05, Math.cos(a) * 0.11, 0.56, Math.cos(a) * 0.15, -Math.sin(a) * 0.15, 0.08]);
    }
    g.add(strands(ring, rand));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.26), mat('#1d1b22'));
    shoe.position.set(0, -0.58, 0.04);
    g.add(shoe);
    parent.add(g);
    legs.push(g);
  };
  leg(-0.22, 0.35, body); leg(0.22, 0.35, body); // the front dancer (rears with the body)
  leg(-0.22, -0.95, root); leg(0.22, -0.95, root); // the back dancer
  root.userData = { pivot, body, head, jaw, legs };
  return root;
}

// Pose a lion: walk (0..1 how fast), rear (0..1 up on the hind legs),
// down (0..1 lying on the ground), t seconds (for the cycles).
export function poseLion(lion, { walk = 0, rear = 0, down = 0, t = 0, i = 0 }) {
  const { pivot, body, head, jaw, legs } = lion.userData;
  const step = t * 7.5;
  pivot.rotation.x = -1.05 * rear + Math.sin(t * 2.2) * 0.04 * (1 - down);
  pivot.position.y = 0.62 - 0.42 * down + Math.abs(Math.sin(step)) * 0.05 * walk;
  body.scale.y = 1 + Math.sin(t * (down ? 1.6 : 0)) * 0.03 * down; // breathing while it lies there
  legs.forEach((l, k) => {
    const front = k < 2, swing = Math.sin(step + (k % 2 ? Math.PI : 0) + (front ? 0 : Math.PI / 2)) * 0.5 * walk;
    // reared: the front feet paw the air; lying down: legs folded flat
    const paw = front ? (0.9 + Math.sin(t * 6 + k) * 0.35) * rear : -0.2 * rear;
    l.rotation.x = swing + paw + (front ? -1.35 : 1.35) * down;
    l.position.y = 0.62 - (front ? 0 : 0.3 * down);
  });
  head.rotation.y = Math.sin(t * 1.3 + i) * 0.45 * (1 - down);
  head.rotation.x = Math.sin(t * 2.1 + i) * 0.15 + 0.35 * down + 0.8 * rear; // reared: still looking ahead
  jaw.rotation.x = Math.max(0, Math.sin(t * (3.4 + rear * 3) + i)) * (0.35 + 0.25 * rear) * (1 - down);
}

// Costume pieces, in the chibi's head units (~0.65 m wide, centred) or body
// units (0 at the feet, shoulders at ~0.66).
// The yangban's mask: a pale face, narrow eyes, a long black beard, and the
// tall white crown hat with pointed tips.
function yangbanMask() {
  const g = new THREE.Group();
  g.add(ball(0.42, '#f3e7cc', 0, 0, 0.08, 0.92, 1.08, 0.82));
  for (const s of [-1, 1]) {
    const eye = box(g, 0.14, 0.035, 0.04, 0.15 * s, 0.08, 0.42, '#1d1b22');
    eye.rotation.z = 0.25 * s;
    const brow = box(g, 0.16, 0.04, 0.04, 0.15 * s, 0.2, 0.4, '#1d1b22');
    brow.rotation.z = -0.2 * s;
  }
  box(g, 0.12, 0.03, 0.04, 0, -0.14, 0.42, '#a8242c'); // the mouth
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 10), mat('#3a3530'));
  beard.rotation.x = Math.PI; beard.position.set(0, -0.6, 0.24);
  g.add(beard);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.36, 16), mat('#fbfaf4'));
  hat.position.y = 0.52;
  g.add(hat);
  for (let i = 0; i < 6; i++) { // the pointed tips round the top
    const a = (i / 6) * Math.PI * 2, tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 4), mat('#fbfaf4'));
    tip.position.set(Math.sin(a) * 0.28, 0.84, Math.cos(a) * 0.28);
    tip.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
    g.add(tip);
  }
  for (const s of [-1, 1]) { // the black marks on its front
    const mark = box(g, 0.12, 0.06, 0.02, 0.12 * s, 0.56, 0.39, '#1d1b22');
    mark.rotation.z = 0.5 * s;
  }
  return g;
}
// Kkoksoe (꼭쇠), the servant: a ruddy mask with thick brows and a grin, and
// a black hat with paper flowers.
function kkoksoeMask() {
  const g = new THREE.Group();
  g.add(ball(0.42, '#ead2ad', 0, 0, 0.08, 0.95, 1.05, 0.82));
  for (const s of [-1, 1]) {
    g.add(ball(0.06, '#1d1b22', 0.15 * s, 0.08, 0.42, 1, 0.7, 0.5));
    const brow = box(g, 0.18, 0.06, 0.05, 0.15 * s, 0.22, 0.4, '#1d1b22');
    brow.rotation.z = 0.25 * s;
    g.add(ball(0.07, '#e07a6a', 0.25 * s, -0.08, 0.36, 1, 0.7, 0.5));
  }
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12, Math.PI), mat('#8a1c22'));
  grin.position.set(0, -0.1, 0.42); grin.rotation.z = Math.PI;
  g.add(grin);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 18), mat('#1d1b22'));
  brim.position.y = 0.32;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.26, 14), mat('#1d1b22'));
  crown.position.y = 0.46;
  g.add(brim, crown);
  ['#e8443a', '#ffd34d', '#4f8de0', '#ff8fb0', '#e8443a'].forEach((c, i) => g.add(ball(0.08, c, -0.24 + i * 0.12, 0.55, 0.12 + Math.abs(i - 2) * -0.04)));
  return g;
}
// A plain wooden-look mask for the hunchback: a crooked face.
function hunchMask() {
  const g = new THREE.Group();
  g.add(ball(0.42, '#d9b58a', 0, 0, 0.08, 0.95, 1.05, 0.82));
  g.add(ball(0.06, '#1d1b22', -0.15, 0.1, 0.42, 1, 0.7, 0.5));
  g.add(ball(0.05, '#1d1b22', 0.15, 0.05, 0.42, 1, 0.7, 0.5));
  const mouth = box(g, 0.16, 0.035, 0.04, 0.03, -0.14, 0.41, '#5a2a1e');
  mouth.rotation.z = 0.3;
  g.add(ball(0.07, '#c89870', 0, -0.02, 0.48));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 20), mat('#f4f0e6'));
  band.rotation.x = Math.PI / 2; band.position.y = 0.22;
  g.add(band);
  return g;
}
// A white cloth headband (the musicians), or a red one (the boy).
function headband(c = '#fbfaf4') {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 6, 20), mat(c));
  band.rotation.x = Math.PI / 2; band.position.y = 0.16;
  const knot = ball(0.06, c, 0, 0.16, -0.34);
  g.add(band, knot);
  return g;
}
// The tungso player's flute, from the lips down to the hands in front.
function tungsoHead() {
  const g = headband();
  const pipe = new THREE.Group();
  pipe.position.set(0, 0.06, 0.3);
  pipe.rotation.x = 0.12; // the foot of the flute towards the hands // leaning forward from the mouth
  const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.95, 8), mat('#c9a464'));
  cane.position.y = -0.47;
  pipe.add(cane);
  for (const y of [-0.22, -0.5, -0.78]) {
    const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), mat('#8a6a34'));
    knot.position.y = y;
    pipe.add(knot);
  }
  g.add(pipe);
  return g;
}
function gat() {
  const g = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.025, 22), mat('#1d1b22'));
  brim.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.32, 16), mat('#1d1b22'));
  crown.position.y = 0.47;
  g.add(brim, crown);
  return g;
}
// The monk's white peaked hood (고깔).
function goggal() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.7, 4), mat('#fbfaf4'));
  cone.position.y = 0.48; cone.rotation.y = Math.PI / 4;
  g.add(cone);
  return g;
}
// Kkoksoe's red sash across the chest and blue vest (body units).
function kkoksoeVest() {
  const g = new THREE.Group();
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.25, 0.22, 14), mat('#2c3f86'));
  vest.position.y = 0.55;
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 6, 18), mat('#d0332e'));
  sash.position.y = 0.52; sash.rotation.set(Math.PI / 2, 0.5, 0);
  g.add(vest, sash);
  return g;
}
// The drum (북) at the left hip, its heads facing front and back.
function bukDrum() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 16), mat('#b8402e'));
  shell.rotation.x = Math.PI / 2;
  g.add(shell);
  for (const s of [-1, 1]) {
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.01, 16), mat('#efe6cf'));
    skin.rotation.x = Math.PI / 2; skin.position.z = 0.085 * s;
    g.add(skin);
  }
  g.position.set(-0.12, 0.4, 0.3);
  const o = new THREE.Group();
  o.add(g);
  return o;
}
// The janggu (장구): an hourglass drum lying across the waist.
function janggu() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.13, 0.24, 14), mat('#b8402e'));
    cone.rotation.z = (s * Math.PI) / 2; cone.position.x = 0.12 * s;
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 14), mat('#efe6cf'));
    skin.rotation.z = Math.PI / 2; skin.position.x = 0.25 * s;
    g.add(cone, skin);
  }
  g.position.set(0, 0.4, 0.3);
  const o = new THREE.Group();
  o.add(g);
  return o;
}
function hump() {
  const g = new THREE.Group();
  g.add(ball(0.17, '#efe6d6', 0, 0.58, -0.2, 1.2, 1, 1));
  return g;
}

// The people, by role: their look, costume, dance and size.
const WHITE = { model: 'hanbok-baji-white', skirt: null, tee: null, hair: 'black', dye: 'black', hairStyle: 'short' };
export const ROLE_LOOKS = {
  tungso: { look: WHITE, dance: 'tungso', head: tungsoHead },
  buk: { look: WHITE, dance: 'buk', head: () => headband(), body: bukDrum },
  janggu: { look: WHITE, dance: 'janggu', head: () => headband(), body: janggu },
  yangban: { look: { ...WHITE, model: 'hanbok-durumagi-white' }, dance: 'yangban', mask: yangbanMask },
  kkoksoe: { look: WHITE, dance: 'bukchum', mask: kkoksoeMask, body: kkoksoeVest },
  doctor: { look: { ...WHITE, model: 'hanbok-durumagi-navy' }, dance: 'bukchum', head: gat },
  monk: { look: { ...WHITE, model: 'hanbok-durumagi-gray' }, dance: 'bukchum', head: goggal },
  hunchback: { look: { ...WHITE, model: 'hanbok-baji-ivory' }, dance: 'bukchum', mask: hunchMask, body: hump },
  boy: { look: { ...WHITE, model: 'hanbok-baji-jade' }, dance: 'bukchum', head: () => headband('#d0332e'), scale: 0.8 },
};

const turnTo = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const WALK = 1.4; // m/s, the people walking to and from the sick lion
const LION_W = 0.42; // rad/s round the ring
const LION_FAST = 2.2; // m/s at most, catching up with its place

export class BukcheongTroupe {
  // at: [x, z] the ring's centre on the square.
  constructor(scene, at) {
    this.x = at[0]; this.z = at[1];
    this.t = 0;
    this.people = [];
    for (const [role, slots] of Object.entries(SLOTS)) {
      const R = ROLE_LOOKS[role];
      for (const [sx, sz] of slots) {
        const ch = createCharacter({ ...randomLook(), ...R.look });
        if (R.mask) ch.setMascot(R.mask());
        if (R.head) ch.addProp('head', R.head());
        if (R.body) ch.addProp('body', R.body());
        if (R.scale) ch.root.scale.setScalar(R.scale);
        ch.activity(R.dance);
        const x = this.x + sx, z = this.z + sz;
        ch.root.position.set(x, 0, z);
        ch.root.rotation.y = FACE;
        scene.add(ch.root);
        this.people.push({ role, ch, home: [sx, sz], x, z });
      }
    }
    this.lions = [0, 1].map((i) => {
      const obj = makeShaggyLion(7 + i * 13);
      scene.add(obj);
      const a = i * Math.PI;
      const x = this.x + Math.sin(a) * LION_RING, z = this.z + Math.cos(a) * LION_RING;
      obj.position.set(x, 0, z);
      return { i, obj, a, x, z, ry: 0, rear: 0, down: 0, walk: 0, rearT: 0, nextRear: 3 + i * 5 };
    });
    this.phase = 'dance';
  }
  // Where the ring is (for the debug hook and tests).
  spot() { return [this.x, this.z]; }
  // Lions' state now (debug).
  lionState() { return this.lions.map((L) => ({ x: +L.x.toFixed(2), z: +L.z.toFixed(2), rear: +L.rear.toFixed(2), down: +L.down.toFixed(2) })); }
  update(dt, me) {
    const on = Math.hypot(me.x - this.x, me.z - this.z) < NEAR;
    for (const p of this.people) p.ch.root.visible = on;
    for (const L of this.lions) L.obj.visible = on;
    if (!on) return;
    this.t += dt;
    const u = this.t % CYCLE, phase = phaseAt(u), was = this.phase;
    this.phase = phase;
    // the moment the sick lion springs up: everyone cheers
    if (phase === 'rear' && was !== 'rear') for (const p of this.people) if (!BAND.has(p.role)) p.ch.play('cheer');
    // for the photo, each lion takes the nearer of the two places side by
    // side (the one still prowling doesn't walk through the other)
    if (phase === 'rear' && was !== 'rear') {
      const [A, B] = this.lions, d = (L, [x, z]) => Math.hypot(this.x + x - L.x, this.z + z - L.z);
      const keep = d(B, REAR_SPOTS[1]) + d(A, REAR_SPOTS[0]) <= d(B, REAR_SPOTS[0]) + d(A, REAR_SPOTS[1]);
      A.spot = REAR_SPOTS[keep ? 0 : 1]; B.spot = REAR_SPOTS[keep ? 1 : 0];
    }
    this.lions.forEach((L) => this.updateLion(L, dt, phase));
    for (const p of this.people) this.updatePerson(p, dt, phase, u);
  }
  updateLion(L, dt, phase) {
    let target, face = null, wantRear = 0, wantDown = 0;
    if (phase === 'dance' || (phase === 'sick' && L.i === 1)) {
      // prowling round the ring; now and then it stops and rears up
      if (L.rearT > 0) { L.rearT -= dt; wantRear = 1; } else {
        L.a += LION_W * dt;
        if (phase === 'dance' && (L.nextRear -= dt) <= 0) { L.rearT = REAR_LEN; L.nextRear = REAR_EVERY[0] + Math.random() * (REAR_EVERY[1] - REAR_EVERY[0]); }
      }
      // (round the sick one and the healers, a wider ring)
      const r = phase === 'sick' ? SICK_RING : LION_RING;
      target = [Math.sin(L.a) * r, Math.cos(L.a) * r];
      if (L.rearT > 0) face = FACE; // rearing up towards the audience
    } else if (phase === 'sick') { // lion 0 lies down in the middle
      target = SICK_SPOT; face = FACE;
      L.rearT = 0;
      if (Math.hypot(this.x + target[0] - L.x, this.z + target[1] - L.z) < 0.3) wantDown = 1;
    } else { // both up on their hind legs, side by side, facing the square
      target = L.spot || REAR_SPOTS[L.i]; face = FACE;
      L.rearT = 0;
      if (Math.hypot(this.x + target[0] - L.x, this.z + target[1] - L.z) < 0.4) wantRear = 1;
      L.a = Math.atan2(target[0], target[1]); // carry on round the ring from here
    }
    const tx = this.x + target[0], tz = this.z + target[1], dx = tx - L.x, dz = tz - L.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, LION_FAST * dt * (L.down > 0.05 || L.rear > 0.3 ? 0 : 1));
    let moving = 0;
    if (d > 0.02 && step > 0) { L.x += (dx / d) * step; L.z += (dz / d) * step; moving = step / dt; }
    if (moving > 0.2) L.ry = turnTo(L.ry, Math.atan2(dx, dz), Math.min(1, dt * 5));
    else if (face != null) L.ry = turnTo(L.ry, face, Math.min(1, dt * 3));
    L.walk += (Math.min(1, moving / 1.2) - L.walk) * Math.min(1, dt * 6);
    L.rear += (wantRear - L.rear) * Math.min(1, dt * 4);
    L.down += (wantDown - L.down) * Math.min(1, dt * 2.5);
    L.obj.position.set(L.x, 0, L.z);
    L.obj.rotation.y = L.ry;
    poseLion(L.obj, { walk: L.walk, rear: L.rear, down: L.down, t: this.t, i: L.i });
  }
  updatePerson(p, dt, phase, u) {
    let [hx, hz] = p.home;
    const healer = (p.role === 'doctor' || p.role === 'monk') && phase === 'sick' && u > SICK + 2;
    if (healer) [hx, hz] = HEAL[p.role];
    else if (p.role === 'yangban' || p.role === 'kkoksoe') { // roaming a little in front
      const s = p.role === 'yangban' ? 0 : 2;
      hx += Math.sin(this.t * 0.3 + s) * 0.8; hz += Math.sin(this.t * 0.45 + s) * 0.9;
    }
    const tx = this.x + hx, tz = this.z + hz, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const roam = p.role === 'yangban' || p.role === 'kkoksoe';
    const walking = d > (roam ? 1.2 : 0.15);
    const ch = p.ch;
    if (walking || roam) {
      const v = walking ? WALK : 0.5, step = Math.min(d, v * dt);
      if (d > 0.01) { p.x += (dx / d) * step; p.z += (dz / d) * step; }
    }
    ch.root.position.set(p.x, 0, p.z);
    if (walking) ch.root.rotation.y = turnTo(ch.root.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
    else {
      // the band faces the square; the dancers watch the lions; the healers
      // face the sick lion
      const toRing = Math.atan2(this.x - p.x, this.z - p.z);
      const face = BAND.has(p.role) ? FACE : healer ? Math.atan2(this.x + SICK_SPOT[0] - p.x, this.z + SICK_SPOT[1] - p.z) : roam ? turnTo(toRing, FACE, 0.5) : toRing;
      ch.root.rotation.y = turnTo(ch.root.rotation.y, face, Math.min(1, dt * 4));
    }
    // the healers bow over the sick lion now and then (taking its pulse,
    // praying); the dance pose stops while they tend it
    if (healer && !walking) {
      ch.activity(null);
      p.bowT = (p.bowT || 0) - dt;
      if (p.bowT <= 0) { p.bowT = 2.2; ch.play('bow'); }
    } else ch.activity(ROLE_LOOKS[p.role].dance);
    ch.animate(dt, walking ? 0.15 : 0);
  }
}
