// Picnic mats (돗자리) in the Han River park and Seoul Forest. Bought at
// DAILY MART, kept in the bag, spread on the lawn. A mat fits four people
// side by side, lying down or sitting; anyone can take a free spot of
// anyone's mat. Only one mat per spot of
// lawn: a new one can't overlap a mat that's already there.
//
// The owner shares the mat in their state as "mt": "x,z,c" (centre, colour
// index), so everyone in the park draws it and its four spots.
import * as THREE from 'three';

export const MAT = { w: 2.6, d: 2.0 }; // metres; four people side by side (x)
export const MAT_SPOTS = 4;
export const MAT_GAP = 0.15; // space kept between two mats
// Blue-and-white, pink, yellow and green checks: the classic 한강 돗자리 look.
export const MAT_COLORS = [['#3f7fd0', '#f4f8ff'], ['#e8708f', '#fff3f6'], ['#f2b33a', '#fffaf0'], ['#4fae6a', '#f2fbf3']];

// A mat lies one of four ways (d: quarter turns, 0 = head towards -z), the
// way its owner was facing when they spread it (matDir).
export function matRect(x, z, gap = 0, d = 0) {
  const hw = (d % 2 ? MAT.d : MAT.w) / 2, hd = (d % 2 ? MAT.w : MAT.d) / 2;
  return { x0: x - hw - gap, x1: x + hw + gap, z0: z - hd - gap, z1: z + hd + gap };
}
export const matDir = (ry) => ((Math.round(ry / (Math.PI / 2)) % 4) + 4) % 4;
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
export const matsOverlap = (a, b) => overlaps(matRect(a.x, a.z, MAT_GAP / 2, a.d | 0), matRect(b.x, b.z, MAT_GAP / 2, b.d | 0));

// The four spots, side by side. Each one can be lain on (head at the mat's
// head) or sat on, facing its foot: the way the owner faced when spreading it.
export function matSpots(m) {
  const step = MAT.w / MAT_SPOTS, a = (m.d | 0) * Math.PI / 2;
  const c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  const at = (lx, lz) => [Math.round((m.x + lx * c + lz * s) * 1000) / 1000, Math.round((m.z - lx * s + lz * c) * 1000) / 1000];
  return Array.from({ length: MAT_SPOTS }, (_, i) => {
    const lx = -MAT.w / 2 + step * (i + 0.5);
    const [x, z] = at(lx, 0.15);
    return { x, z, ry: a, lie: true, mat: true, stand: at(lx, MAT.d / 2 + 0.5) };
  });
}

export function encodeMat(m) {
  return `${Math.round(m.x * 10) / 10},${Math.round(m.z * 10) / 10},${m.c | 0}` + (m.d ? `,${m.d}` : '');
}
// Another player's "mt" back into a mat, or null if it's not one (or off the lawn).
export function parseMat(v, lawns) {
  if (typeof v !== 'string' || v.length > 24) return null;
  const [x, z, c, d = 0] = v.split(',').map(Number); // (no d: an older game, head to -z)
  if (![x, z, c, d].every(Number.isFinite) || c < 0 || c >= MAT_COLORS.length || c % 1 || d < 0 || d > 3 || d % 1) return null;
  const m = d ? { x, z, c, d } : { x, z, c };
  return !lawns || onLawn(m, lawns) ? m : null;
}

export function onLawn(m, lawns) {
  const r = matRect(m.x, m.z, 0, m.d | 0);
  return lawns.some((l) => r.x0 >= l.x0 && r.x1 <= l.x1 && r.z0 >= l.z0 && r.z1 <= l.z1);
}

// Bounding box of a collider polygon ({ p: [[x, z], …] }).
function bbox(c) {
  const xs = c.p.map((q) => q[0]), zs = c.p.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

// Can a mat go down at (x, z)? 'ok', or why not: 'lawn' (not on the
// grass, or on a tree / bench / table) or 'taken' (someone's mat is there).
// blocked(rect): anything else in the way (a park path, a tree on the street).
export function canSpread(m, { lawns, colliders = [], mats = [], blocked = null }) {
  if (!onLawn(m, lawns)) return 'lawn';
  const r = matRect(m.x, m.z, 0, m.d | 0);
  if (colliders.some((c) => c.p && overlaps(r, bbox(c)))) return 'lawn';
  if (blocked?.(r)) return 'lawn';
  if (mats.some((o) => matsOverlap(m, o))) return 'taken';
  return 'ok';
}

// Where the mat goes when you spread it: just in front of you.
export function matInFront(x, z, ry, ahead = 1.4) {
  return { x: Math.round((x + Math.sin(ry) * ahead) * 10) / 10, z: Math.round((z + Math.cos(ry) * ahead) * 10) / 10 };
}

// Two people spread on the same spot at once: the lower id keeps it.
export const keepsMat = (myId, otherId) => String(myId) < String(otherId);

// A mat left alone doesn't stay forever: if its owner walks more than
// MAT_AWAY metres off, or nobody has been on or by it for MAT_IDLE_MS, the
// wind takes it (or the park keeper tidies it away) and it is gone from the
// bag. `lastUsed`: when the owner was last within MAT_NEAR metres of it.
export const MAT_AWAY = 50;
export const MAT_NEAR = 6;
export const MAT_IDLE_MS = 10 * 60 * 1000;
export function matLost(mat, x, z, lastUsed, now) {
  return Math.hypot(x - mat.x, z - mat.z) > MAT_AWAY || now - lastUsed > MAT_IDLE_MS;
}

// The mat's 3D model: a thin checked sheet (one canvas texture per colour)
// with stitched edges.
const texCache = {};
function checkTexture(c) {
  if (texCache[c]) return texCache[c];
  const [a, b] = MAT_COLORS[c];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = b; g.fillRect(0, 0, 64, 64);
  g.fillStyle = a;
  for (let i = 0; i < 4; i++) { g.globalAlpha = 0.85; g.fillRect(i * 16, 0, 8, 64); g.globalAlpha = 0.6; g.fillRect(0, i * 16, 64, 8); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(MAT.w * 1.2, MAT.d * 1.2);
  t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[c] = t);
}
const matMats = {};
export function makeMat(c) {
  const g = new THREE.Group();
  matMats[c] ||= new THREE.MeshLambertMaterial({ map: checkTexture(c) });
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(MAT.w, 0.02, MAT.d), matMats[c]);
  sheet.position.y = 0.02;
  g.add(sheet);
  matMats.edge ||= new THREE.MeshLambertMaterial({ color: '#f6f1e6' });
  for (const s of [-1, 1]) { // stitched edges at the head and foot
    const e = new THREE.Mesh(new THREE.BoxGeometry(MAT.w, 0.025, 0.06), matMats.edge);
    e.position.set(0, 0.022, s * (MAT.d / 2 - 0.03));
    g.add(e);
  }
  return g;
}
