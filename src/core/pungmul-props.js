// The pungmul troupe's (풍물패) costumes, instruments and moves
// (core/pungmul.js places them on the map).
//
// Moves work like the folk dances in folk-dance.js: radians added per bone
// on top of the idle clip, from a shared clock t (seconds), so the whole
// troupe keeps the same beat. Every player steps on the beat (오금질: a
// little dip of the knees), plays their instrument, and the sangmo players
// roll their heads round so the ribbon on the hat whirls (상모 돌리기).
//
// Props are merged into one mesh each (vertex colours, one material), and
// the same geometry is shared by everyone who plays the same part: 75
// people with a hat, an instrument and sashes each would otherwise cost
// hundreds of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const BEAT = 0.5; // seconds per beat (자진모리, brisk)
// The sangmo spins once every two beats. Every 8 spins the ribbon changes
// from turning flat round the head (외사) to swinging from side to side
// (양사), and back.
export const SPIN = BEAT * 2;
export const SPIN_MODE = SPIN * 8;

// The sangmo's turn at time t: yaw (radians round the head) and tilt (how
// far the circle leans to one side; 0 flat).
export function sangmoSpin(t, phase = 0) {
  const yaw = ((t + phase) / SPIN) * Math.PI * 2;
  const m = (((t + phase) % (SPIN_MODE * 2)) + SPIN_MODE * 2) % (SPIN_MODE * 2); // 0..2 modes
  const side = m < SPIN_MODE ? 0 : 1;
  // In the side-to-side mode the circle leans left for one spin, right for the next.
  const lean = side ? Math.sin(((t + phase) / (SPIN * 2)) * Math.PI * 2) : 0;
  // ease in and out of the mode over half a second
  const into = side ? Math.min(1, (m - SPIN_MODE) / 0.5, (SPIN_MODE * 2 - m) / 0.5) : 0;
  return { yaw, tilt: 0.85 * lean * Math.max(0, into) };
}

const pos = (v) => Math.max(0, v);
// The step every player takes on the beat: one knee up, a dip on the other.
function step(t, lift = 1) {
  const s = Math.sin((t / BEAT) * Math.PI);
  return {
    bob: 0.045 * Math.abs(s) - 0.025,
    legL: [-0.5 * lift * pos(s), 0, 0], kneeL: [0.85 * lift * pos(s), 0, 0],
    legR: [-0.5 * lift * pos(-s), 0, 0], kneeR: [0.85 * lift * pos(-s), 0, 0],
  };
}
// A strike: 1 at the moment of the hit, falling away (every `every` beats).
const hit = (t, every = 1, off = 0) => { const k = (((t / BEAT + off) / every) % 1 + 1) % 1; return Math.max(0, 1 - k * 3); };
// The head rolling round with the sangmo (forward/back and side to side).
function roll(t, amp) {
  const { yaw } = sangmoSpin(t);
  return [amp * Math.cos(yaw), 0, amp * Math.sin(yaw)];
}

export const PUNGMUL_MOVES = {
  // 기수: the flag held up in front with both hands
  pm_flag: (t) => ({ ...step(t, 0.7), spine: [-0.06, 0, 0.04 * Math.sin(t * 1.3)], armL: [-1.25, -0.15, 0], armR: [-1.05, 0.2, 0], foreL: [-0.9, 0, 0], foreR: [-0.7, 0, 0] }),
  // 태평소: both hands at the pipe, the head rising and dipping with the tune
  pm_taepyeongso: (t) => ({ ...step(t, 0.6), armL: [-1.1, -0.1, 0], armR: [-1.0, 0.1, 0], foreL: [-1.45, 0, 0], foreR: [-1.25, 0, 0], head: [0.05 + 0.1 * Math.sin(t * 1.4), 0, 0.05 * Math.sin(t * 0.7)], spine: [0.04, 0, 0] }),
  // 나발: the long horn raised high
  pm_nabal: (t) => ({ ...step(t, 0.6), armL: [-2.0, -0.1, 0], armR: [-1.85, 0.12, 0], foreL: [-0.9, 0, 0], foreR: [-0.8, 0, 0], head: [-0.32, 0, 0], spine: [-0.1, 0, 0] }),
  // 꽹과리: the gong up at the chest in the left hand, the right beating
  // fast; the head nodding so the feather on the hat (부포) flips
  pm_kkwaenggwari: (t) => {
    const h = hit(t, 0.5);
    return { ...step(t), armL: [-1.45, -0.3, 0], foreL: [-0.8, 0, 0], armR: [-0.9 - 0.25 * h, 0.35, 0], foreR: [-1.1 - 0.5 * h, 0, 0], head: [0.18 * Math.sin((t / BEAT) * Math.PI * 2), 0, 0], spine: [0.06, 0, 0] };
  },
  // 징: held out on its cord, one big swing every two beats
  pm_jing: (t) => {
    const h = hit(t, 2);
    return { ...step(t, 0.7), armL: [-1.3, -0.3, 0], foreL: [-0.5, 0, 0], armR: [-0.6 - 0.8 * h, 0.3, 0], foreR: [-0.8 - 0.4 * h, 0, 0], spine: [0.04, 0, 0.05 * h] };
  },
  // 장구: across the waist, a stick in each hand, left and right in turn
  pm_janggu: (t) => {
    const r = hit(t, 0.5), l = hit(t, 1, 0.5);
    return { ...step(t), armL: [-0.65 - 0.25 * l, -0.4, 0], foreL: [-1.0 - 0.35 * l, 0, 0], armR: [-0.65 - 0.3 * r, 0.4, 0], foreR: [-1.0 - 0.45 * r, 0, 0], spine: [0.08, 0, 0.05 * Math.sin((t / BEAT) * Math.PI)], head: [0.08, 0, 0] };
  },
  // 북: the drum at the chest, a big overhead stroke on the beat
  pm_buk: (t) => {
    const h = hit(t, 1);
    return { ...step(t), armL: [-1.0, -0.25, 0], foreL: [-1.25, 0, 0], armR: [-1.0 - 1.1 * (1 - h), 0.45, 0], foreR: [-0.5, 0, 0], spine: [0.06 * h, 0, 0] };
  },
  // 소고: the little drum raised in the left hand and struck, knees high
  // (까치걸음), the head rolling the sangmo
  pm_sogo: (t) => {
    const h = hit(t, 1), s = Math.sin((t / BEAT) * Math.PI);
    return { ...step(t, 1.35), armL: [-1.7 + 0.5 * s, -0.55, 0], foreL: [-0.45, 0, 0], armR: [-1.1 - 0.4 * h, 0.45, 0], foreR: [-0.9 - 0.5 * h, 0, 0], head: roll(t, 0.26), spine: roll(t, 0.06) };
  },
  // 상모꾼: arms out for balance, big head rolls
  pm_sangmo: (t) => {
    const s = Math.sin((t / BEAT) * Math.PI);
    return { ...step(t, 1.2), armL: [-0.45, -1.15 + 0.2 * s, 0], armR: [-0.45, 1.15 + 0.2 * s, 0], foreL: [-0.35, 0, 0], foreR: [-0.35, 0, 0], head: roll(t, 0.32), spine: roll(t, 0.08) };
  },
  // 잡색: a comic shoulder dance (어깨춤), swaying from side to side
  pm_japsaek: (t) => {
    const s = Math.sin((t / BEAT) * Math.PI), side = Math.sin(t * 0.9);
    return { ...step(t, 0.9), turn: 0.35 * side, armL: [-0.6, -1.0 + 0.25 * s, 0], armR: [-1.9, 0.5, 0], foreR: [-1.2, 0, 0], foreL: [-0.6, 0, 0], spine: [0.1, 0.12 * s, 0.1 * side], head: [0.12 * Math.abs(s), 0, -0.1 * side] };
  },
};

// --- merged, vertex-coloured props -------------------------------------
const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const solidMat2 = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// A piece of a prop: geometry, colour and where it sits.
function piece(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  _c.set(color);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const geoCache = new Map();
function solid(key, build, double = false) {
  if (!geoCache.has(key)) geoCache.set(key, mergeGeometries(build()));
  const m = new THREE.Mesh(geoCache.get(key), double ? solidMat2 : solidMat);
  m.name = 'pm:' + key;
  return m;
}
const cyl = (rt, rb, h, n = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
const sph = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const BLACK = '#1d1b22', BRASS = '#d9a640', RED = '#c8323a', BLUE = '#2f5fb0', YELLOW = '#f2c230', WHITE = '#fbf8f0', WOOD = '#8a5a34', PINK = '#f08aa8';

// --- hats (head units: the head ~0.65 wide, centred, facing +z) -------
// The sangmo hat (전립 style): a black dome with a brim and a little
// swivel on top (꼭지) the ribbon or the feather turns on.
function sangmoHatParts() {
  return [
    piece(cyl(0.42, 0.42, 0.03, 20), BLACK, 0, 0.29, 0),
    piece(sph(0.3, 14, 8), BLACK, 0, 0.3, 0, 0, 0, 0, 1, 0.7, 1),
    piece(cyl(0.035, 0.05, 0.14, 8), BLACK, 0, 0.6, 0),
    piece(sph(0.055, 8, 6), BRASS, 0, 0.68, 0),
    // the coloured beads on the brim (구슬)
    ...[-1, 1].map((s) => piece(sph(0.06, 8, 6), RED, 0.3 * s, 0.32, 0.1)),
  ];
}
export function makeSangmoHat() { return solid('sangmo-hat', sangmoHatParts); }
// 고깔: a tall white cone with big paper flowers on the front and sides.
export function makeGokkal() {
  return solid('gokkal', () => {
    const parts = [piece(new THREE.ConeGeometry(0.36, 0.82, 16), WHITE, 0, 0.62, -0.02), piece(cyl(0.37, 0.37, 0.06, 16), RED, 0, 0.25, -0.02)];
    const flowers = [[0, 0.48, 0.25, RED], [-0.2, 0.42, 0.2, YELLOW], [0.2, 0.42, 0.2, BLUE], [-0.27, 0.6, 0.0, PINK], [0.27, 0.6, 0.0, YELLOW], [-0.1, 0.72, 0.12, BLUE], [0.1, 0.72, 0.12, PINK], [0, 0.86, 0.06, RED]];
    for (const [x, y, z, c] of flowers) {
      parts.push(piece(new THREE.IcosahedronGeometry(0.1, 0), c, x, y, z, 0.4, x * 2, 0));
      parts.push(piece(sph(0.035, 6, 4), YELLOW, x, y, z + 0.08));
    }
    return parts;
  });
}
// The gat (갓) for the yangban, a fur hat for the hunter, a bun for the granny.
export function makeGat() {
  return solid('gat', () => [piece(cyl(0.6, 0.6, 0.025, 22), BLACK, 0, 0.3, 0), piece(cyl(0.16, 0.18, 0.3, 14), BLACK, 0, 0.46, 0)]);
}
export function makeFurHat() {
  return solid('fur', () => [piece(cyl(0.34, 0.36, 0.3, 14), '#7a5434', 0, 0.38, 0), piece(cyl(0.38, 0.38, 0.08, 14), '#a8845a', 0, 0.24, 0), piece(sph(0.1), '#a8845a', 0.1, 0.56, -0.1)]);
}
export function makeBun() {
  return solid('bun', () => [piece(sph(0.17), '#c9c9cc', 0, 0.12, -0.33), piece(cyl(0.02, 0.02, 0.5, 6), BRASS, 0, 0.12, -0.36, 0, 0, Math.PI / 2)]);
}
// The bride's mask (각시탈): a pale face with red dots on the cheeks and
// brow (연지곤지), black hair parted in the middle, a small red mouth.
export function makeGaksiMask() {
  return solid('gaksi', () => {
    const p = [
      piece(sph(0.42, 16, 12), '#f6efe4', 0, 0, 0.06, 0, 0, 0, 1, 1.12, 0.85),
      piece(new THREE.SphereGeometry(0.46, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), BLACK, 0, 0.06, -0.02, -0.2),
      piece(sph(0.07), RED, 0, 0.27, 0.38), // 곤지
      ...[-1, 1].map((s) => piece(sph(0.07), RED, 0.2 * s, -0.12, 0.34)), // 연지
      ...[-1, 1].map((s) => piece(new THREE.BoxGeometry(0.12, 0.022, 0.02), BLACK, 0.14 * s, 0.07, 0.42, 0, 0, -0.15 * s)), // narrow eyes
      piece(sph(0.04), '#b8202a', 0, -0.2, 0.42, 0, 0, 0, 1.3, 0.8, 0.6),
    ];
    return p;
  });
}
// The feather tuft (부포) on the kkwaenggwari players' hats: a white puff on
// a short stalk, turning on the swivel.
export function makeBupo() {
  const g = new THREE.Group();
  g.position.y = 0.66;
  const stalk = solid('bupo', () => [
    piece(cyl(0.012, 0.012, 0.32, 5), BLACK, 0, 0.16, 0),
    piece(sph(0.17, 10, 8), WHITE, 0, 0.36, 0, 0, 0, 0, 1, 0.8, 1),
    piece(sph(0.1, 8, 6), '#f3f0e6', 0.1, 0.42, 0.06),
    piece(sph(0.1, 8, 6), '#f3f0e6', -0.08, 0.44, -0.05),
  ]);
  g.add(stalk);
  g.userData.stalk = stalk;
  return g;
}

// The sangmo ribbon (채): a long strip of white paper on the swivel. While
// it whirls it trails back in a curve, sagging a little at the tip. One
// geometry shared by all; each hat turns its own copy (spin.rotation.y)
// and leans it (lean.rotation.z).
export const RIBBON_LEN = 3.4; // head units (about 2 m on the chibi)
let ribbonGeo = null;
function ribbonGeometry() {
  if (ribbonGeo) return ribbonGeo;
  const n = 28, w = 0.09, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, r = 0.08 + RIBBON_LEN * s, a = -1.25 * s * s; // trailing back
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = -0.25 * s * s;
    // the width across the strip: upright near the hat, twisting towards
    // flat (outwards) along its length
    const tw = 0.6 * s, nx = Math.cos(a), nz = Math.sin(a);
    const wx = Math.sin(tw) * nx * w, wy = Math.cos(tw) * w, wz = Math.sin(tw) * nz * w;
    pos.push(x + wx, y + wy, z + wz, x - wx, y - wy, z - wz);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  ribbonGeo.setIndex(idx);
  ribbonGeo.computeVertexNormals();
  return ribbonGeo;
}
const ribbonMat = new THREE.MeshBasicMaterial({ color: '#fffdf4', side: THREE.DoubleSide });
export function makeRibbon() {
  const lean = new THREE.Group();
  lean.position.y = 0.68;
  const spin = new THREE.Group();
  lean.add(spin);
  spin.add(new THREE.Mesh(ribbonGeometry(), ribbonMat));
  lean.userData.spin = spin;
  return lean;
}

// Wind instruments at the mouth (head units: the mouth at about y -0.15, z 0.42).
export function makeTaepyeongso() {
  // a conical wooden pipe pointing down and forward, a brass bell at the end
  return solid('taepyeongso', () => {
    const tilt = Math.PI / 2 + 0.55, len = 0.62;
    const dy = -Math.sin(0.55) * len, dz = Math.cos(0.55) * len;
    return [
      piece(cyl(0.035, 0.05, len, 8), WOOD, 0, -0.15 + dy / 2, 0.42 + dz / 2, tilt, 0, 0),
      piece(cyl(0.05, 0.16, 0.16, 12, true), BRASS, 0, -0.15 + dy * 1.07, 0.42 + dz * 1.07, tilt, 0, 0),
      piece(cyl(0.012, 0.012, 0.06, 6), BRASS, 0, -0.14, 0.41, tilt, 0, 0),
    ];
  }, true);
}
export function makeNabal() {
  // a long thin brass horn pointing forward and up
  return solid('nabal', () => {
    const up = 0.75, len = 1.9, tilt = Math.PI / 2 - up;
    const dy = Math.sin(up) * len, dz = Math.cos(up) * len;
    return [
      piece(cyl(0.025, 0.035, len, 8), BRASS, 0, -0.15 + dy / 2, 0.42 + dz / 2, tilt, 0, 0),
      piece(cyl(0.035, 0.17, 0.22, 12, true), BRASS, 0, -0.15 + dy * 1.05, 0.42 + dz * 1.05, tilt, 0, 0),
    ];
  }, true);
}

// --- body props (0 at the feet, shoulders at ~0.66, torso ~0.42 wide) --
// 삼색띠: a blue sash and a red sash crossed over the shoulders, a yellow
// one round the waist.
export function makeSashes() {
  return solid('sashes', () => [
    // each a ring round the body, tipped up over one shoulder
    piece(new THREE.TorusGeometry(0.235, 0.022, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.88).rotateZ(0.62), BLUE, 0, 0.47, 0),
    piece(new THREE.TorusGeometry(0.235, 0.022, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.88).rotateZ(-0.62), RED, 0, 0.47, 0),
    piece(new THREE.TorusGeometry(0.225, 0.03, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.88), YELLOW, 0, 0.33, 0),
    // the waist sash's ends hanging at the side
    piece(new THREE.BoxGeometry(0.06, 0.26, 0.015), YELLOW, -0.17, 0.2, 0.12, 0, 0, 0.12),
    piece(new THREE.BoxGeometry(0.06, 0.22, 0.015), YELLOW, -0.12, 0.21, 0.15, 0, 0, -0.08),
  ]);
}
// 장구: the hourglass drum slung across the front of the waist (along x).
export function makeJanggu() {
  return solid('janggu', () => {
    const p = [];
    for (const s of [-1, 1]) {
      p.push(piece(cyl(0.05, 0.16, 0.24, 14), RED, 0.15 * s, 0, 0, 0, 0, s * Math.PI / 2)); // narrow end in the middle
      p.push(piece(cyl(0.2, 0.2, 0.03, 18), WHITE, 0.285 * s, 0, 0, 0, 0, Math.PI / 2));
      p.push(piece(cyl(0.205, 0.205, 0.012, 18), RED, 0.27 * s, 0, 0, 0, 0, Math.PI / 2));
    }
    for (let i = 0; i < 6; i++) { // the cords between the heads
      const a = (i / 6) * Math.PI * 2;
      p.push(piece(cyl(0.008, 0.008, 0.56, 4), BLUE, 0, Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0, 0, Math.PI / 2));
    }
    p.push(piece(new THREE.TorusGeometry(0.27, 0.012, 4, 16, Math.PI), BLUE, 0, 0.0, -0.05, 0, 0, 0)); // the strap over the shoulder
    return p.map((g) => g.translate(0.02, 0.37, 0.27));
  });
}
// 북: a barrel drum held at the chest, its face turned to the right hand,
// painted with a red and blue taegeuk.
export function makeBuk() {
  return solid('buk', () => {
    const p = [piece(cyl(0.2, 0.2, 0.2, 16), RED, 0, 0, 0, 0, 0, Math.PI / 2, 1.08, 1, 1.08)];
    for (const s of [-1, 1]) {
      p.push(piece(cyl(0.2, 0.2, 0.012, 18), WHITE, 0.106 * s, 0, 0, 0, 0, Math.PI / 2));
      p.push(piece(new THREE.CircleGeometry(0.14, 16, 0, Math.PI), RED, 0.114 * s, 0, 0, 0, s * Math.PI / 2, 0));
      p.push(piece(new THREE.CircleGeometry(0.14, 16, Math.PI, Math.PI), BLUE, 0.114 * s, 0, 0, 0, s * Math.PI / 2, 0));
    }
    for (let i = 0; i < 10; i++) { // tacks round the rims
      const a = (i / 10) * Math.PI * 2;
      for (const s of [-1, 1]) p.push(piece(sph(0.015, 4, 3), BRASS, 0.09 * s, Math.sin(a) * 0.205, Math.cos(a) * 0.205));
    }
    return p.map((g) => g.rotateY(-0.5).translate(0.02, 0.5, 0.3));
  });
}
// The hunter's (포수) wooden gun over the shoulder.
export function makeGun() {
  return solid('gun', () => [
    piece(cyl(0.025, 0.03, 0.9, 6), WOOD, 0.16, 0.6, -0.18, 0.5, 0, -0.3),
    piece(new THREE.BoxGeometry(0.07, 0.2, 0.05), '#5c3a20', 0.24, 0.3, 0.02, 0.5, 0, -0.3),
  ]);
}

// Flags (기수): the farmers' flag (농기) with 農者天下之大本 ("farming is
// the great root of the world") and two command flags (영기) with 令. A
// pole held up in front (body units), the cloth as its own textured mesh
// that sways (userData.cloth).
function flagTexture(kind) {
  const c = document.createElement('canvas');
  const big = kind === 'nonggi';
  c.width = big ? 128 : 128; c.height = big ? 256 : 128;
  const g = c.getContext('2d');
  if (big) {
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 128, 256);
    // a border of coloured teeth (지네발)
    const cols = ['#c8323a', '#2f5fb0', '#f2c230', '#3c9a5a'];
    for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(112, i * 16); g.lineTo(128, i * 16 + 8); g.lineTo(112, i * 16 + 16); g.fill(); }
    for (let i = 0; i < 7; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(i * 16, 240); g.lineTo(i * 16 + 8, 256); g.lineTo(i * 16 + 16, 240); g.fill(); }
    g.fillStyle = '#1d1b22'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 30px serif';
    [...'農者天下之大本'].forEach((ch, i) => g.fillText(ch, 56, 22 + i * 31));
  } else {
    const blue = kind === 'yeonggi-blue';
    g.fillStyle = blue ? '#2f5fb0' : '#c8323a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = blue ? '#c8323a' : '#2f5fb0';
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(112, i * 16); g.lineTo(128, i * 16 + 8); g.lineTo(112, i * 16 + 16); g.fill(); }
    g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(56, 64, 36, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1b22'; g.font = 'bold 50px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('令', 56, 66);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const flagMats = {};
export function makeFlag(kind = 'nonggi') {
  const big = kind === 'nonggi';
  const h = big ? 3.4 : 2.5, w = big ? 0.75 : 0.62, fh = big ? 1.5 : 0.62;
  const g = new THREE.Group();
  g.position.set(0.12, 0, 0.28);
  g.add(solid('pole-' + (big ? 'big' : 'small'), () => {
    const p = [piece(cyl(0.025, 0.03, h, 6), big ? '#2b2b31' : WOOD, 0, h / 2, 0)];
    if (big) { // the pheasant plume on top (꿩장목) and the crossbar
      p.push(piece(new THREE.ConeGeometry(0.12, 0.4, 8), '#3a3a40', 0, h + 0.15, 0, Math.PI, 0, 0));
      p.push(piece(sph(0.07), RED, 0, h + 0.38, 0));
    } else p.push(piece(new THREE.ConeGeometry(0.05, 0.18, 6), BRASS, 0, h + 0.09, 0));
    p.push(piece(cyl(0.015, 0.015, w + 0.1, 5), WOOD, w / 2, h - 0.04, 0, 0, 0, Math.PI / 2));
    return p;
  }));
  const cloth = new THREE.Group();
  cloth.position.y = h - 0.05;
  const m = flagMats[kind] ||= new THREE.MeshLambertMaterial({ map: flagTexture(kind), side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, fh), m);
  plane.position.set(w / 2 + 0.03, -fh / 2, 0);
  cloth.add(plane);
  g.add(cloth);
  g.userData.cloth = cloth;
  return g;
}

// --- hand props (in the hand slot; +y out of the fist) -----------------
const stick = (key, len, head = null, color = '#c9a66b') => solid(key, () => {
  const p = [piece(cyl(0.018, 0.022, len, 6), color, 0, len / 2 - 0.08, 0)];
  if (head) p.push(piece(sph(head.r, 8, 6), head.c, 0, len - 0.08, 0));
  return p;
});
function gong(key, r, cord) {
  return solid(key, () => [
    piece(cyl(r, r, 0.05, 20), BRASS, 0, cord + r, 0, Math.PI / 2, 0, 0),
    piece(cyl(r * 1.02, r * 1.02, 0.08, 20, true), '#b8862e', 0, cord + r, -0.02, Math.PI / 2, 0, 0),
    piece(cyl(0.012, 0.012, cord + 0.05, 4), RED, 0, cord / 2, 0),
  ]);
}
// [left, right] for each part (empty hands for the rest: the flags, the
// horns and the sangmo players).
const EMPTY = () => [null, null];
export const PUNGMUL_HANDS = {
  pm_flag: EMPTY, pm_taepyeongso: EMPTY, pm_nabal: EMPTY, pm_sangmo: EMPTY,
  pm_kkwaenggwari: () => [gong('kkwaeng', 0.24, 0.08), stick('kkwaeng-mallet', 0.42, { r: 0.05, c: '#b8862e' })],
  pm_jing: () => [gong('jing', 0.5, 0.22), stick('jing-mallet', 0.5, { r: 0.1, c: RED })],
  pm_janggu: () => [stick('gungchae', 0.42, { r: 0.05, c: '#e8d8b0' }), stick('yeolchae', 0.46)],
  pm_buk: () => [null, stick('buk-stick', 0.46, null, WOOD)],
  pm_sogo: () => [solid('sogo', () => [
    piece(cyl(0.2, 0.2, 0.09, 16), RED, 0, 0.32, 0, Math.PI / 2, 0, 0),
    piece(cyl(0.2, 0.2, 0.012, 16), WHITE, 0, 0.32, 0.05, Math.PI / 2, 0, 0),
    piece(new THREE.CircleGeometry(0.12, 12, 0, Math.PI), BLUE, 0, 0.32, 0.057),
    piece(new THREE.CircleGeometry(0.12, 12, Math.PI, Math.PI), RED, 0, 0.32, 0.057),
    piece(cyl(0.02, 0.02, 0.26, 6), WOOD, 0, 0.05, 0),
  ]), stick('sogo-stick', 0.4)],
  pm_japsaek: () => [null, solid('hapjukseon', () => [ // a folding fan (합죽선), half open
    piece(new THREE.CircleGeometry(0.34, 14, Math.PI / 4, Math.PI / 2), '#efe4c8', 0, 0, 0),
    piece(new THREE.BoxGeometry(0.03, 0.12, 0.02), WOOD, 0, 0.02, 0),
  ], true)],
};
