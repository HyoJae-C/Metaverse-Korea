// Bukchon landmarks (map "landmarks" in districts/bukchon.json): the Open
// House (a ㄷ-shaped hanok round a courtyard, with a persimmon tree and a
// magpie), the rooftop view terrace, the stone stairs down to Samcheong-dong,
// and Changdeokgung's roofs seen from the east edge. Visual only: collision
// comes from the map's blockers.
import * as THREE from 'three';
import { hipRoofGeometry } from './landmarks.js';
import { HANOK } from './hanok.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function box(g, sx, sy, sz, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const C = { base: '#b9ae98', wall: '#f1e7d2', wood: '#6b4630', lattice: '#8a6446', roof: '#4a5059', ridge: '#30353c', stone: '#cfc6b4', dark: '#9c927f' };

function roof(g, w, d, h, y, x = 0, z = 0, ry = 0) {
  const r = new THREE.Mesh(hipRoofGeometry(w, d, h), new THREE.MeshLambertMaterial({ color: C.roof, flatShading: true, side: THREE.DoubleSide }));
  r.position.set(x, y, z);
  r.rotation.y = ry;
  g.add(r);
  const ridge = Math.max(1, w - d * 0.9);
  const b = box(g, ridge + 0.6, h * 0.16, h * 0.16, x, y + h * 1.04, z, C.ridge);
  b.rotation.y = ry;
}

// One wing: base, walls, frame, lattice doors on the courtyard side (+z
// before turning), a roof. Centre (x, z), size w × d, turned ry.
function wing(g, x, z, w, d, ry, { maru = false } = {}) {
  const k = new THREE.Group();
  k.position.set(x, 0, z);
  k.rotation.y = ry;
  const B = HANOK.base, Wh = HANOK.wall + 0.3;
  box(k, w + 0.8, B, d + 0.8, 0, B / 2, 0, C.base);
  if (maru) {
    // The middle bays are the open wooden hall: a floor and posts, no wall in front.
    box(k, w, Wh, d * 0.45, 0, B + Wh / 2, -d * 0.275, C.wall); // back wall half
    box(k, w * 0.3, Wh, d * 0.55, -w * 0.35, B + Wh / 2, d * 0.225, C.wall);
    box(k, w * 0.3, Wh, d * 0.55, w * 0.35, B + Wh / 2, d * 0.225, C.wall);
    box(k, w * 0.4, 0.2, d * 0.55, 0, B + 0.1, d * 0.225, '#b07a4a'); // the maru floor
    for (const sx of [-0.2, 0.2]) box(k, 0.32, Wh, 0.32, sx * w, B + Wh / 2, d / 2, C.wood);
  } else box(k, w, Wh, d, 0, B + Wh / 2, 0, C.wall);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(k, 0.34, Wh, 0.34, sx * w / 2, B + Wh / 2, sz * d / 2, C.wood);
  box(k, w + 0.3, 0.34, d + 0.3, 0, B + Wh - 0.17, 0, C.wood);
  const bays = Math.max(2, Math.round(w / 3));
  for (let i = 0; i < bays; i++) {
    const bx = -w / 2 + ((i + 0.5) * w) / bays;
    if (maru && Math.abs(bx) < w * 0.2) continue;
    box(k, Math.min(1.8, (w / bays) * 0.7), 1.9, 0.06, bx, B + 1.2, d / 2 + 0.04, C.lattice); // paper doors
  }
  roof(k, w + 2.2, d + 2.4, HANOK.roof + 0.3, B + Wh);
  g.add(k);
}

export const BUKCHON_BUILD = {
  // The Open House: l.w × l.d compound centred on (x, z). North: the main
  // hall with the maru; west and east wings; a south wall with a gate.
  openhouse(g, l) {
    const w = l.w, d = l.d, hw = w / 2, hd = d / 2;
    wing(g, 0, -hd + 6, w, 11, 0, { maru: true }); // main hall (faces the courtyard, south)
    wing(g, -hw + 4.5, 2, 32, 8, Math.PI / 2); // west wing, doors facing east
    wing(g, hw - 4.5, 2, 32, 8, -Math.PI / 2); // east wing, doors facing west
    // South wall with a tiled cap, and the gate (대문)
    for (const sx of [-1, 1]) {
      const len = hw - 2.5;
      box(g, len, 2.2, 0.6, sx * (2.5 + len / 2), 1.1, hd - 0.5, C.stone);
      box(g, len + 0.4, 0.3, 1.2, sx * (2.5 + len / 2), 2.35, hd - 0.5, C.roof);
    }
    for (const sx of [-1, 1]) box(g, 0.4, 3.2, 0.4, sx * 2.3, 1.6, hd - 0.5, C.wood);
    box(g, 5.2, 0.4, 0.6, 0, 3.1, hd - 0.5, C.wood);
    roof(g, 6.4, 3, 1.2, 3.3, 0, hd - 0.5);
    // Persimmon tree (감나무) with fruit, a magpie on top, near the west wing.
    const tx = -hw + 15, tz = -hd + 40;
    box(g, 0.5, 3.4, 0.5, tx, 1.7, tz, '#6b4a33');
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 0), mat('#7d9a4a'));
    crown.position.set(tx, 4.6, tz);
    crown.scale.set(1, 0.8, 1);
    g.add(crown);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, r = 1.6 + (i % 3) * 0.5;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), mat('#f07a1a'));
      fruit.position.set(tx + Math.cos(a) * r, 3.8 + (i % 4) * 0.6, tz + Math.sin(a) * r);
      g.add(fruit);
    }
    const bird = new THREE.Group(); // a magpie (까치): black and white, long tail
    box(bird, 0.5, 0.32, 0.28, 0, 0, 0, '#1f2328');
    box(bird, 0.3, 0.22, 0.3, 0.05, -0.04, 0, '#f3f3f3');
    box(bird, 0.22, 0.22, 0.22, 0.32, 0.12, 0, '#1f2328');
    box(bird, 0.6, 0.08, 0.14, -0.52, 0.06, 0, '#24314a');
    bird.position.set(tx, 6.7, tz);
    g.add(bird);
    // Jangdokdae: a stone platform with onggi jars in the south-east corner.
    const jx = hw - 14, jz = hd - 8;
    box(g, 5, 0.5, 3.2, jx, 0.25, jz, C.stone);
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? 1 : 0.75;
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 10, 8), mat('#5a3422'));
      jar.scale.set(1, 1.15, 1);
      jar.position.set(jx - 1.7 + (i % 3) * 1.7, 0.5 + 0.6 * s, jz + (i < 3 ? -0.6 : 0.8));
      g.add(jar);
      box(g, 0.7 * s, 0.12, 0.7 * s, jar.position.x, 0.5 + 1.25 * s, jar.position.z, '#3d2418'); // lid
    }
  },
  // The rooftop view: a stone terrace with a railing on the south side and a
  // coin telescope.
  terrace(g) {
    box(g, 82, 0.3, 22, 0, 0.15, 0, C.stone);
    for (let x = -40; x <= 40; x += 4) if (Math.abs(x) > 6) box(g, 0.25, 1.1, 0.25, x, 0.85, 10.6, C.wood); // (a gap in the middle: the way in)
    for (const sx of [-1, 1]) box(g, 34, 0.15, 0.3, sx * 23, 1.4, 10.6, C.wood);
    box(g, 0.5, 1.1, 0.5, 0, 0.85, -8, '#3a5a7a'); // telescope post
    box(g, 0.4, 0.4, 1.0, 0, 1.6, -7.8, '#3a5a7a');
  },
  // The stone stairs (돌계단길): steps cut from one rock, down to the west.
  stonestairs(g, l) {
    const len = l.len || 30, n = 14;
    for (let i = 0; i < n; i++) {
      const s = box(g, len / n + 0.1, 0.12, 4.4, -len / 2 + (i + 0.5) * (len / n), 0.06 + (i % 2) * 0.03, 0, i % 2 ? C.stone : C.dark);
      s.userData.noShadow = true;
    }
    for (const sz of [-1, 1]) box(g, len, 0.8, 0.6, 0, 0.4, sz * 2.6, '#a59c8a'); // rock edges
  },
  // Changdeokgung beyond the east edge: a palace wall and two hall roofs.
  farpalace(g) {
    box(g, 2, 3.5, 70, -8, 1.75, 0, '#d9c9b0');
    box(g, 2.8, 0.5, 71, -8, 3.7, 0, C.roof);
    for (const [z, w] of [[-12, 24], [16, 18]]) {
      box(g, w, 6, 10, 16, 3.6, z, '#a23a2c');
      box(g, w + 1, 1, 11, 16, 6.4, z, '#2f8f6b');
      roof(g, w * 1.35, 16, 5, 6.8, 16, z);
    }
  },
};
