// Jongmyo and Seosunra-gil landmarks (map "landmarks" in districts/jongmyo.json,
// built by scripts/build-jongmyo.mjs): the gates, the two long shrine halls
// on their stone terraces (woldae), the three-strip stone path (samdo), the
// square pond, the ritual orchestra's instruments, the janggi tables on
// Jongmyo Square, the lanterns along the wall on Seosunra-gil and the
// shrine's woods. Visual only: collision comes from the map's blockers.
import * as THREE from 'three';
import { curvedRoof } from './hanok.js';
import { mergeStatic } from './bukchon-models.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const glow = (c) => (mats['glow' + c] ||= new THREE.MeshBasicMaterial({ color: c }));
function box(g, sx, sy, sz, x, y, z, c, m) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m || mat(c));
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
const tileMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
function tiles(g, w, d, h, y, o, x = 0, z = 0) {
  for (const geo of curvedRoof(w, d, h, o)) {
    const m = new THREE.Mesh(geo, tileMat);
    m.position.set(x, y, z);
    g.add(m);
  }
}
// Jongmyo's colours: red-brown posts and doors, restrained painted beams
// (dancheong green), pale granite, dark grey tiles.
const C = {
  stone: '#cdc5b3', stoneDark: '#a99f8b', stoneLight: '#ddd6c6', post: '#7a2e22', door: '#6a2a20', beam: '#2f7a62', beamRed: '#9a3a2c',
  wall: '#c9b9a0', roof: new THREE.Color('#4a4f57'), roofEnd: new THREE.Color('#8a3a2c'), bronze: '#7d6a3e', wood: '#6b4630',
};

const BUILD = {
  // A shrine gate: a stone step, posts, three (or one) open red doors, a
  // painted beam and a tiled roof. l.w: the opening; l.small: a hall's gate.
  jongmyogate(g, l) {
    const w = l.w, hw = w / 2, H = l.small ? 3.6 : 4.6, D = l.small ? 3 : 4;
    box(g, w + 3, 0.35, D + 1.2, 0, 0.17, 0, C.stone);
    const posts = l.small ? [-hw, hw] : [-hw, -hw / 3, hw / 3, hw];
    for (const x of posts) for (const z of [-D / 2, D / 2]) box(g, 0.45, H, 0.45, x, H / 2 + 0.3, z, C.post);
    // The doors stand open, folded back against the posts.
    const bays = posts.length - 1;
    for (let i = 0; i < bays; i++) {
      const x0 = posts[i], x1 = posts[i + 1], bw = x1 - x0;
      for (const s of [0, 1]) {
        const dd = box(g, 0.08, H - 1.1, bw / 2 - 0.1, s ? x1 - 0.3 : x0 + 0.3, (H - 1.1) / 2 + 0.35, D / 2 - bw / 4, C.door);
        dd.rotation.y = 0;
      }
    }
    box(g, w + 1.2, 0.5, D + 0.6, 0, H + 0.3, 0, C.beam);
    box(g, w + 1.0, 0.25, D + 0.4, 0, H - 0.05, 0, C.beamRed);
    tiles(g, w + 3.6, D + 3.4, l.small ? 1.6 : 2.0, H + 0.55, { hip: false, lift: 0.35, seg: 4, rows: 3, color: C.roof, end: C.roofEnd });
  },
  // A long shrine hall (Jeongjeon, Yeongnyeongjeon): a high stone base, a
  // row of red posts in front of the spirit chambers' doors, solid walls at
  // the back and the ends, and one long gabled roof (맞배지붕). l.bays: the
  // chambers; l.mid: the middle chambers stand under a taller roof.
  shrinehall(g, l) {
    const w = l.w, d = l.d, B = 1.1, H = 4.2, bay = w / l.bays;
    box(g, w + 1.6, B, d + 1.2, 0, B / 2, 0, C.stone); // the base (기단)
    box(g, w + 1.8, 0.12, d + 1.4, 0, B + 0.06, 0, C.stoneDark);
    for (let i = 0; i < 3; i++) box(g, 3.2, 0.36, 0.7, 0, 0.18 + i * 0.36, d / 2 + 0.6 + (2 - i) * 0.7, C.stone); // steps up
    // walls: back and both ends, the doors set back behind the colonnade
    box(g, w, H, 0.5, 0, B + H / 2, -d / 2 + 0.25, C.wall);
    for (const sx of [-1, 1]) box(g, 0.5, H, d - 0.5, sx * (w / 2 - 0.25), B + H / 2, 0, C.wall);
    box(g, w - 0.6, H, 0.2, 0, B + H / 2, d / 2 - 2.4, C.door); // the chambers' doors
    for (let i = 0; i <= l.bays; i++) {
      const x = -w / 2 + i * bay;
      box(g, 0.5, H, 0.5, x, B + H / 2, d / 2 - 0.5, C.post); // front posts (the open corridor)
      box(g, 0.32, H, 0.24, x, B + H / 2, d / 2 - 2.3, C.post); // and the posts between the doors
    }
    box(g, w + 0.6, 0.55, 0.6, 0, B + H + 0.2, d / 2 - 0.5, C.beam);
    box(g, w + 0.6, 0.55, 0.6, 0, B + H + 0.2, -d / 2 + 0.25, C.beam);
    const y = B + H + 0.45;
    if (l.mid) {
      // Yeongnyeongjeon: the middle chambers' roof stands taller than the wings'.
      const mw = bay * l.mid, sw = (w - mw) / 2;
      box(g, mw, 1.4, d - 0.4, 0, y + 0.7, 0, C.wall);
      box(g, mw + 0.4, 0.4, d, 0, y + 1.2, 0, C.beam);
      tiles(g, mw + 2.6, d + 5, 3.8, y + 1.4, { hip: false, lift: 0.4, seg: 4, rows: 3, color: C.roof, end: C.roofEnd });
      for (const sx of [-1, 1]) tiles(g, sw + 1.6, d + 4.4, 3.2, y, { hip: false, lift: 0.3, seg: 6, rows: 3, color: C.roof, end: C.roofEnd }, sx * (mw / 2 + sw / 2 + 0.2), 0);
    } else {
      tiles(g, w + 3, d + 5, 4.2, y, { hip: false, lift: 0.3, seg: 16, rows: 3, color: C.roof, end: C.roofEnd });
    }
  },
  // The stone terrace (월대) in front of a hall: pale granite slabs, a
  // darker edge, a raised walk up the middle to the hall's steps.
  woldae(g, l) {
    box(g, l.w, 0.12, l.d, 0, 0.06, 0, C.stoneLight);
    for (const sx of [-1, 1]) box(g, 0.5, 0.18, l.d, sx * (l.w / 2 - 0.25), 0.09, 0, C.stoneDark);
    for (const sz of [-1, 1]) box(g, l.w, 0.18, 0.5, 0, 0.09, sz * (l.d / 2 - 0.25), C.stoneDark);
    box(g, 1.4, 0.2, l.d - 1, 0, 0.1, 0, C.stone); // the spirits' way up the middle
    for (let x = -l.w / 2 + 3; x < l.w / 2 - 1; x += 3) box(g, 0.05, 0.13, l.d - 1.2, x, 0.065, 0, C.stone); // slab joints
  },
  // The stone path (삼도): three strips; the middle one, for the spirits,
  // rougher and raised. l.segs: [[a, b], ...] in the landmark's metres.
  samdo(g, l) {
    for (const [[ax, az], [bx, bz]] of l.segs) {
      const len = Math.hypot(bx - ax, bz - az) + l.w * 0.5, ry = -Math.atan2(bz - az, bx - ax);
      const k = new THREE.Group();
      k.position.set((ax + bx) / 2, 0, (az + bz) / 2);
      k.rotation.y = ry;
      box(k, len, 0.08, l.w, 0, 0.04, 0, C.stone);
      box(k, len, 0.2, l.mid, 0, 0.1, 0, C.stoneDark);
      for (let u = -len / 2 + 0.6; u < len / 2; u += 1.2) box(k, 0.06, 0.21, l.mid - 0.05, u, 0.105, 0, C.stone); // the rough blocks
      g.add(k);
    }
  },
  // The square pond with a round island (천원지방: a round sky over a square
  // earth), a juniper on the island.
  squarepond(g, l) {
    const w = l.w, d = l.d;
    for (const sz of [-1, 1]) box(g, w + 1, 0.5, 0.6, 0, 0.1, sz * (d / 2 + 0.3), C.stoneDark);
    for (const sx of [-1, 1]) box(g, 0.6, 0.5, d + 1, sx * (w / 2 + 0.3), 0.1, 0, C.stoneDark);
    const isle = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 18), mat('#8fae6a'));
    isle.position.y = 0.2;
    g.add(isle);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), mat('#6b4a32'));
    trunk.position.y = 1.6;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 7), mat('#3f6b3a'));
    crown.position.y = 3.6;
    g.add(trunk, crown);
  },
  // The ritual orchestra on the terrace (등가): bronze bells (편종) and stone
  // chimes (편경) on painted frames at both ends, a big drum in the middle,
  // and straw mats where the musicians sit. l.w: how wide.
  jeryeband(g, l) {
    const hw = l.w / 2;
    box(g, l.w, 0.04, 2.2, 0, 0.14, 0, '#c9b07a'); // mats
    const rack = (x, stones) => {
      for (const sx of [-1, 1]) box(g, 0.18, 2.4, 0.4, x + sx * 1.1, 1.2, 0, C.post);
      for (const y of [1.5, 2.3]) box(g, 2.5, 0.14, 0.18, x, y, 0, C.beam);
      for (const y of [1.15, 1.95]) for (let i = 0; i < 8; i++) {
        const px = x - 0.95 + i * 0.27;
        if (stones) { const s = box(g, 0.2, 0.26, 0.05, px, y, 0, '#9aa3a0'); s.rotation.z = 0.5; } // ㄱ-shaped stones
        else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.28, 8), mat(C.bronze)); b.position.set(px, y, 0); g.add(b); }
      }
      box(g, 0.6, 0.4, 0.6, x + 1.1, 2.6, 0, '#d4a73a'); // the carved birds on top (stand-ins)
      box(g, 0.6, 0.4, 0.6, x - 1.1, 2.6, 0, '#d4a73a');
    };
    rack(-hw + 1.6, false);
    rack(-hw + 5.2, true);
    rack(hw - 1.6, false);
    rack(hw - 5.2, true);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.1, 18), mat('#9a3a2c'));
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 1.4, 0);
    g.add(drum);
    for (const sx of [-1, 1]) box(g, 0.12, 1.2, 0.12, sx * 0.6, 0.6, 0, C.wood);
  },
  // A low table with a janggi (Korean chess) board and two stools, where
  // grandpas play on Jongmyo Square.
  janggitable(g) {
    box(g, 1.1, 0.06, 1.0, 0, 0.62, 0, '#c9a46a');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.08, 0.6, 0.08, sx * 0.45, 0.3, sz * 0.4, C.wood);
    box(g, 0.62, 0.05, 0.56, 0, 0.67, 0, '#e6c88a');
    for (let i = 0; i < 9; i++) box(g, 0.006, 0.052, 0.5, -0.27 + i * 0.0675, 0.68, 0, '#5a3a20');
    for (let i = 0; i < 10; i++) box(g, 0.56, 0.052, 0.006, 0, 0.68, -0.25 + i * 0.0555, '#5a3a20');
    const pc = (c, x, z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), mat(c)); p.position.set(x, 0.71, z); g.add(p); };
    for (const [x, z] of [[-0.2, -0.22], [0, -0.2], [0.13, -0.11], [-0.07, -0.05]]) pc('#2f6b4f', x, z);
    for (const [x, z] of [[0.2, 0.22], [0, 0.2], [-0.13, 0.11], [0.07, 0.05]]) pc('#b0283a', x, z);
    for (const sx of [-1, 1]) box(g, 0.5, 0.42, 0.4, sx * 0.95, 0.21, 0, '#8a6446');
  },
  // Lanterns along the wall on Seosunra-gil: a stone post with a warm light
  // box, every l.gap metres over l.len.
  walllamps(g, l) {
    for (let z = -l.len / 2; z <= l.len / 2; z += l.gap) {
      box(g, 0.35, 1.0, 0.35, 0, 0.5, z, C.stoneDark);
      box(g, 0.42, 0.42, 0.42, 0, 1.2, z, null, glow('#ffd58a'));
      box(g, 0.6, 0.12, 0.6, 0, 1.47, z, '#3d4450');
    }
  },
  // The shrine's woods: old pines and broadleaf trees. One instanced mesh
  // for the trunks and one for each kind of crown.
  shrinetrees(g, l) {
    const n = l.spots.length;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 4, 6).translate(0, 2, 0), mat('#6b4a32'), n);
    const pines = l.spots.filter((_, i) => i % 3 === 0), leafy = l.spots.filter((_, i) => i % 3 !== 0);
    const pineM = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 4.6, 7).translate(0, 6, 0), mat('#3c6b3e'), pines.length);
    const leafM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.8, 0).translate(0, 5.6, 0), mat('#5d8f4a'), leafy.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const greens = ['#5d8f4a', '#6f9a52', '#4f8045', '#7aa35a'].map((c) => new THREE.Color(c));
    l.spots.forEach(([x, z], i) => {
      const s = 0.85 + ((i * 37) % 10) / 25;
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, i * 1.3), sc.set(s, s * 1.1, s));
      trunks.setMatrixAt(i, m4);
    });
    pines.forEach(([x, z], i) => { const s = 0.9 + ((i * 13) % 7) / 18; pineM.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, i), sc.set(s, s * 1.15, s))); });
    leafy.forEach(([x, z], i) => {
      const s = 0.85 + ((i * 29) % 9) / 20;
      leafM.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, i * 0.7), sc.set(s, s * 0.9, s)));
      leafM.setColorAt(i, greens[i % greens.length]);
    });
    g.add(trunks, pineM, leafM);
  },
};

// Each builder's boxes merged into a few meshes (fewer draw calls); the
// trees are already instanced.
export const JONGMYO_BUILD = Object.fromEntries(Object.entries(BUILD).map(([k, f]) => [k, k === 'shrinetrees' ? f : (g, l) => { const t = f(g, l); mergeStatic(g); return t; }]));
