// Korean folk dance poses for the palace performers (core/palace-show.js):
// 부채춤 (fan dance) and 탈춤 (mask dance). Like the club dance moves in
// model-pack.js: radians added per bone on top of the idle clip. Upper arms:
// -x swings the arm forward and up, y swings it out to the side (-y left,
// +y right). t is seconds, shared, so a troupe moves together.
import * as THREE from 'three';
import { PUNGMUL_MOVES } from './pungmul-props.js';

const smooth = (a, b, k) => a + (b - a) * (k * k * (3 - 2 * k));
function mix(p, q, k) {
  const out = {};
  for (const key of new Set([...Object.keys(p), ...Object.keys(q)])) {
    const a = p[key] ?? (Array.isArray(q[key]) ? [0, 0, 0] : 0), b = q[key] ?? (Array.isArray(p[key]) ? [0, 0, 0] : 0);
    out[key] = Array.isArray(a) ? a.map((v, i) => smooth(v, b[i], k)) : smooth(a, b, k);
  }
  return out;
}
// Cycle through poses, holding each and easing into the next.
function cycle(poses, t, hold) {
  const n = poses.length, s = t / hold, i = Math.floor(s) % n, f = s % 1;
  const k = f < 0.7 ? 0 : (f - 0.7) / 0.3;
  return mix(poses[i](t), poses[(i + 1) % n](t), k);
}

const FAN = [
  (t) => { // wings: arms out to the sides, fans fluttering
    const w = Math.sin(t * 1.8);
    return { bob: 0.02 * Math.abs(w), armL: [-0.6, -1.25 + 0.25 * w, 0], armR: [-0.6, 1.25 - 0.25 * w, 0], foreL: [-0.3, 0, 0], foreR: [-0.3, 0, 0], spine: [0, 0, 0.08 * w], head: [0, 0, -0.06 * w] };
  },
  (t) => { // the flower: both fans together overhead
    const w = Math.sin(t * 1.2);
    return { bob: -0.03, armL: [-2.6, -0.3, 0], armR: [-2.6, 0.3, 0], foreL: [-0.5, 0, 0], foreR: [-0.5, 0, 0], spine: [-0.08, 0, 0.04 * w], head: [-0.14, 0, 0] };
  },
  (t) => { // waves: one fan up, the other down, rolling
    const w = Math.sin(t * 2.2);
    return { bob: 0.03 * Math.abs(w), armL: [-1.3 - 0.7 * w, -0.7, 0], armR: [-1.3 + 0.7 * w, 0.7, 0], spine: [0.06, 0, 0.12 * w], head: [0.08, 0, -0.08 * w] };
  },
  (t) => { // bow low with the fans held out in front
    const w = Math.sin(t * 1.5);
    return { bob: -0.08, armL: [-1.0, -0.5, 0], armR: [-1.0, 0.5, 0], foreL: [-0.6, 0, 0], foreR: [-0.6, 0, 0], spine: [0.35 + 0.05 * w, 0, 0], head: [0.2, 0, 0] };
  },
];

const TAL = [
  (t) => { // the big step: knee up high, both sleeves flung up
    const s = Math.sin(t * 3.2), up = Math.max(0, s), dn = Math.max(0, -s);
    return { bob: 0.08 * Math.abs(s), armL: [-2.4 + 0.5 * dn, -0.6, 0], armR: [-2.4 + 0.5 * up, 0.6, 0], legL: [-1.1 * up, 0, 0], kneeL: [1.3 * up, 0, 0], legR: [-1.1 * dn, 0, 0], kneeR: [1.3 * dn, 0, 0], spine: [0.1, 0, 0.15 * s], head: [-0.1, 0, -0.1 * s] };
  },
  (t) => { // shoulders bouncing, one sleeve over the shoulder
    const s = Math.sin(t * 4.4);
    return { bob: 0.05 * Math.abs(s), turn: 0.4 * Math.sin(t * 1.1), armL: [-0.4, -1.2, 0], armR: [-2.2, 0.2, 0], foreR: [-1.4, 0, 0], spine: [0.12, 0, 0.1 * s], head: [0.15 * s, 0, 0] };
  },
  (t) => { // the squat-and-spring
    const s = Math.sin(t * 3.0), k = (s + 1) / 2;
    return { bob: -0.12 + 0.2 * k, armL: [-1.6 - 1.0 * k, -0.9, 0], armR: [-1.6 - 1.0 * k, 0.9, 0], legL: [-0.8 * (1 - k), 0, 0], kneeL: [1.4 * (1 - k), 0, 0], legR: [-0.8 * (1 - k), 0, 0], kneeR: [1.4 * (1 - k), 0, 0], spine: [0.2 * (1 - k), 0, 0] };
  },
];

// 줄타기 (tightrope): arms out for balance, the fan in the right hand,
// small steps along the rope, and a springy bounce now and then.
function rope(t) {
  const step = Math.sin(t * 3.2), sway = Math.sin(t * 0.9);
  const c = t % 9, hop = c > 7.6 ? Math.sin(((c - 7.6) / 1.4) * Math.PI) : 0; // bounce on the rope
  return {
    bob: 0.35 * hop, turn: 0,
    armL: [-0.3, -1.3 + 0.25 * sway, 0], armR: [-0.7, 1.15 - 0.25 * sway, 0], foreR: [-0.4, 0, 0],
    legL: [-0.3 * Math.max(0, step) - 0.9 * hop, 0, 0], kneeL: [0.4 * Math.max(0, step) + 1.4 * hop, 0, 0],
    legR: [-0.3 * Math.max(0, -step) - 0.9 * hop, 0, 0], kneeR: [0.4 * Math.max(0, -step) + 1.4 * hop, 0, 0],
    spine: [0, 0, 0.1 * sway], head: [0, 0, -0.08 * sway],
  };
}

// 일무 (ilmu), the dance in rows at the royal ancestral rite (Jongmyo
// Jeryeak), as the civil dance (문무): a short flute (약) in the left hand, a
// feathered staff (적) in the right. Slow, solemn moves held long, the
// whole troupe as one.
const ILMU = [
  (t) => { // hold the flute and the staff together before the chest
    const w = Math.sin(t * 0.6);
    return { bob: 0, armL: [-1.0, -0.15, 0], armR: [-1.0, 0.15, 0], foreL: [-1.0, 0, 0], foreR: [-1.0, 0, 0], spine: [0.02 * w, 0, 0], head: [0.05, 0, 0] };
  },
  (t) => { // a slow, deep bow
    const w = Math.sin(t * 0.5);
    return { bob: -0.05, armL: [-0.7, -0.1, 0], armR: [-0.7, 0.1, 0], foreL: [-1.1, 0, 0], foreR: [-1.1, 0, 0], spine: [0.45 + 0.03 * w, 0, 0], head: [0.25, 0, 0] };
  },
  (t) => { // the staff raised high on the right, the flute held out to the left
    const w = Math.sin(t * 0.7);
    return { bob: 0, turn: 0.25, armL: [-0.9, -0.7, 0], armR: [-2.5, 0.2, 0], foreL: [-0.6, 0, 0], foreR: [-0.3, 0, 0], spine: [0, 0, -0.06 + 0.02 * w], head: [-0.08, 0, -0.06] };
  },
  (t) => { // and turned the other way, the staff swept down and across
    const w = Math.sin(t * 0.7);
    return { bob: -0.02, turn: -0.25, armL: [-1.4, -0.4, 0], armR: [-1.1, -0.3, 0], foreL: [-0.8, 0, 0], foreR: [-0.9, 0, 0], spine: [0.1, 0, 0.06 + 0.02 * w], head: [0.06, 0, 0.06], legL: [-0.15, 0, 0], kneeL: [0.2, 0, 0] };
  },
];

export const FOLK_DANCES = {
  fan: (t) => cycle(FAN, t, 4),
  tal: (t) => cycle(TAL, t, 5),
  ilmu: (t) => cycle(ILMU, t, 4.5),
  rope,
  ...PUNGMUL_MOVES, // the pungmul troupe (core/pungmul.js)
};

const mats = {};
const mat = (c, side) => (mats[c + side] ||= new THREE.MeshLambertMaterial({ color: c, side: side ? THREE.DoubleSide : THREE.FrontSide }));
let fanTex = null;
function fanTexture() {
  if (fanTex) return fanTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, '#ffe7a8'); grd.addColorStop(0.45, '#ff8fb0'); grd.addColorStop(0.8, '#e3335a'); grd.addColorStop(1, '#ffd34d');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 64);
  fanTex = new THREE.CanvasTexture(c);
  fanTex.colorSpace = THREE.SRGBColorSpace;
  return fanTex;
}

// A big feathered fan (부채), opened, in the hand: a half disc, pink with
// a red and gold edge. Size in the hand slot's units.
export function makeFan(size = 1) {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(0.34 * size, 24, 0, Math.PI);
  // CircleGeometry UVs go 0..1 across the full disc; the half disc uses the top half.
  const face = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: fanTexture(), side: THREE.DoubleSide }));
  g.add(face);
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03 * size, 0.08 * size, 0.02 * size), mat('#7a3b22'));
  rib.position.y = -0.02 * size;
  g.add(rib);
  return g;
}

// The long white sleeves (한삼) mask dancers wear over their hands.
export function makeSleeve(size = 1) {
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.12 * size, 0.5 * size, 0.01 * size), mat('#fbfaf3', true));
  cloth.position.y = -0.25 * size;
  g.add(cloth);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.13 * size, 0.04 * size, 0.02 * size), mat('#d23a3a'));
  g.add(band);
  return g;
}

// The civil dancers' props at the royal rite (일무): the yak, a short
// bamboo flute held in the left hand, and the jeok, a staff with a plume of
// pheasant feathers and a red tassel, in the right.
export function makeYak(size = 1) {
  const g = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * size, 0.018 * size, 0.42 * size, 6), mat('#b48a4a'));
  pipe.position.y = 0.12 * size;
  g.add(pipe);
  return g;
}
export function makeJeok(size = 1) {
  const g = new THREE.Group();
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * size, 0.016 * size, 0.55 * size, 6), mat('#7a4b2a'));
  staff.position.y = 0.2 * size;
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.06 * size, 0.24 * size, 7), mat('#e9dfc8'));
  plume.position.y = 0.58 * size;
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.035 * size, 0.1 * size, 6), mat('#c8323a'));
  tassel.position.y = 0.43 * size;
  tassel.rotation.x = Math.PI;
  g.add(staff, plume, tassel);
  return g;
}
