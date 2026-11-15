// Inside the temples' Daeungjeon (대웅전): Jogyesa's and Bongeunsa's main
// halls as silent dharma halls (Yozi 2026-11-15: "금색 불상 앞에서 방에
// 들어가면 기도 이모티콘 말고는 아무 말도 안 하는 장소"). Made up, not a copy
// of either real hall: a wooden floor, red posts and white walls, a green
// coffered ceiling, and the three golden Buddhas (삼존불) seated on lotus
// thrones on a red altar (수미단) under a canopy. Rows of cushions (방석)
// face them: sit on one, or stand in front of the altar and pray
// (game/prayer.js). Everyone in the hall sees everyone else, but nothing
// can be said here except 🙏 (game/chat.js game.silent; data/emotes.js
// leaves only the praying hands).
//
// Built by core/interior.js (store.workshop 'dharmahall'), loaded with the
// room builder, not in the first download. Static parts merge per colour.
import * as THREE from 'three';
import { Batch } from './cathedral-hall.js';
import { statueFace } from './statue-face.js';

// The hall: the door at +z, the altar at -z (room metres).
export const ROOM_DHARMA = { w: 12, d: 10, h: 4.6 };

export const DHARMA_LAYOUT = {
  altar: { z: -3.6, w: 8.4, d: 1.7, h: 0.9 }, // the red altar the Buddhas sit on
  buddhas: [[0, 1], [-2.7, 0.8], [2.7, 0.8]], // [x, scale]: Sakyamuni in the middle, two beside him
  pray: { x: 0, z: -1.7, r: 1.5 }, // stand here to pray (in front of the altar)
  cushions: { xs: [-4.3, -3.2, -2.1, -1.0, 1.0, 2.1, 3.2, 4.3], zs: [-0.2, 0.9, 2.0, 3.0] }, // an aisle down the middle
};

const SEAT_Y = 0.08; // a cushion's top (you sit on the floor: core/model-pack.js 'floor')

const C = {
  floorA: '#b88a57', floorB: '#a97b4a', post: '#a8392b', panel: '#7a2c22', wall: '#efe6d2', ceiling: '#2f6f5a',
  grid: '#c9a640', red: '#8e2a26', gold: '#d9ac3e', goldDark: '#a77d26', halo: '#c98f2e', haloRed: '#b2402f',
  cushion: '#c8762b', cushionEdge: '#8e2a26', lattice: '#c9a640', candle: '#fbf6ea', flame: '#ffc46b', lotus: '#e98aa6',
  fruit: ['#e8483f', '#f2c14e', '#7ab55c'],
};

// A golden Buddha seated cross-legged on a lotus throne, facing +z, about
// 2.3 m tall at scale 1 (throne included).
function seatedBuddha(parent, s) {
  const g = new THREE.Group();
  const gold = new THREE.MeshLambertMaterial({ color: C.gold, emissive: '#3a2604', flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: C.goldDark, flatShading: true });
  const lotus = new THREE.MeshLambertMaterial({ color: C.lotus, flatShading: true });
  const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  // The throne: a drum and two rings of petals, the seat on top.
  add(new THREE.CylinderGeometry(0.62, 0.72, 0.3, 14), dark, 0, 0.15, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = add(new THREE.SphereGeometry(0.22, 8, 6), lotus, Math.sin(a) * 0.68, 0.42, Math.cos(a) * 0.68, 1, 1.1, 0.45);
    p.rotation.y = a;
    p.rotateX(-0.4);
  }
  add(new THREE.CylinderGeometry(0.66, 0.6, 0.12, 16), dark, 0, 0.56, 0);
  // Crossed legs, the robe over them, hands one on the other in the lap.
  add(new THREE.SphereGeometry(0.5, 14, 8), gold, 0, 0.74, 0.08, 1.35, 0.42, 0.9);
  add(new THREE.CylinderGeometry(0.34, 0.5, 0.95, 12), gold, 0, 1.2, 0); // the body in its robe
  add(new THREE.SphereGeometry(0.36, 12, 8), gold, 0, 1.6, 0, 1.35, 0.6, 1); // the shoulders
  add(new THREE.SphereGeometry(0.13, 10, 6), gold, 0, 0.86, 0.42, 1.4, 0.55, 0.9); // the hands
  for (const sx of [-1, 1]) { // the arms down the sides to the lap
    const arm = add(new THREE.CylinderGeometry(0.1, 0.12, 0.62, 8), gold, sx * 0.42, 1.15, 0.12);
    arm.rotation.set(0.45, 0, sx * 0.2);
  }
  // The head: our characters' face, cast in gilt (core/statue-face.js), with
  // the curls' cap and the ushnisha (the bump of wisdom) on top.
  statueFace(g, { width: 0.5, at: [0, 2.0, 0.03], colors: { skin: C.gold, hair: '#7a5a1c', eyes: '#5a4416' } });
  add(new THREE.SphereGeometry(0.12, 10, 8), dark, 0, 2.26, 0);
  // The halo behind the head and the larger one behind the body.
  const haloMat = new THREE.MeshLambertMaterial({ color: C.halo, side: THREE.DoubleSide });
  const redMat = new THREE.MeshLambertMaterial({ color: C.haloRed, side: THREE.DoubleSide });
  add(new THREE.CircleGeometry(0.42, 24), haloMat, 0, 2.0, -0.42);
  add(new THREE.RingGeometry(0.42, 0.5, 24), redMat, 0, 2.0, -0.43);
  add(new THREE.CircleGeometry(0.95, 28), haloMat, 0, 1.35, -0.47, 1, 1.25, 1);
  add(new THREE.RingGeometry(0.95, 1.05, 28), redMat, 0, 1.35, -0.48, 1, 1.25, 1);
  g.scale.setScalar(s);
  parent.add(g);
  return g;
}

export function buildDharmaHall(store, ROOM, EXIT) {
  const { w, d, h } = ROOM;
  const Lo = DHARMA_LAYOUT, A = Lo.altar;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1410');
  scene.add(new THREE.HemisphereLight(0xffeccc, 0x5a3a24, 1.25));
  const glow = new THREE.PointLight(0xffd08a, 9, 12); // candlelight on the Buddhas
  glow.position.set(0, 3.2, A.z + 2.4);
  scene.add(glow);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();

  // The floor: long boards (마루), two shades.
  for (let i = 0, x = -w / 2; x < w / 2 - 0.01; x += 0.5, i++) b.box(0.5, 0.02, d, x + 0.25, 0.01, 0, i % 2 ? C.floorA : C.floorB);
  // The walls, seen from inside: a dark red dado, white plaster above, red
  // posts along them; the front wall's lattice doors (the way out).
  for (const s of [-1, 1]) {
    b.add(new THREE.PlaneGeometry(d, h), C.wall, s * w / 2, h / 2, 0, { ry: -s * Math.PI / 2 });
    b.box(0.05, 1.0, d, s * (w / 2 - 0.025), 0.5, 0, C.panel);
    for (let z = -d / 2; z <= d / 2 + 0.01; z += 2.5) b.box(0.3, h, 0.3, s * (w / 2 - 0.15), h / 2, Math.max(-d / 2 + 0.15, Math.min(d / 2 - 0.15, z)), C.post);
  }
  b.add(new THREE.PlaneGeometry(w, h), C.wall, 0, h / 2, -d / 2);
  b.box(w, 1.0, 0.05, 0, 0.5, -d / 2 + 0.025, C.panel);
  b.add(new THREE.PlaneGeometry(w, h), C.panel, 0, h / 2, d / 2, { ry: Math.PI });
  for (let x = -w / 2 + 1; x < w / 2 - 0.5; x += 1.25) { // the doors: lattice panels
    b.box(1.15, 2.6, 0.04, x + 0.1, 1.3, d / 2 - 0.04, C.post);
    for (let k = 0.25; k < 2.6; k += 0.22) b.box(1.0, 0.025, 0.02, x + 0.1, k, d / 2 - 0.07, C.lattice);
    for (let k = -0.4; k <= 0.41; k += 0.2) b.box(0.025, 2.4, 0.02, x + 0.1 + k, 1.35, d / 2 - 0.07, C.lattice);
  }
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 3) b.box(0.3, h, 0.3, Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, x)), h / 2, -d / 2 + 0.15, C.post);
  // The coffered ceiling: green with gold lines.
  b.add(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), C.ceiling, 0, h, 0);
  for (let x = -w / 2 + 1; x < w / 2; x += 1) b.box(0.05, 0.05, d, x, h - 0.03, 0, C.grid);
  for (let z = -d / 2 + 1; z < d / 2; z += 1) b.box(w, 0.05, 0.05, 0, h - 0.03, z, C.grid);
  b.box(w, 0.35, 0.3, 0, h - 0.18, -d / 2 + 0.15, C.red); // the beam over the altar

  // The altar: red, gold trim, candles and offerings along its front.
  b.box(A.w, A.h, A.d, 0, A.h / 2, A.z, C.red);
  b.box(A.w + 0.1, 0.08, A.d + 0.1, 0, A.h + 0.04, A.z, C.gold);
  b.box(A.w + 0.1, 0.1, A.d + 0.1, 0, 0.05, A.z, C.goldDark);
  for (const x of [-3.6, -1.35, 1.35, 3.6]) b.box(0.5, 0.5, 0.04, x, A.h / 2, A.z + A.d / 2 + 0.01, C.goldDark); // carved panels on its face
  block(0, A.z, A.w + 0.3, A.d + 0.3);
  const front = A.z + A.d / 2;
  // A low offering table in front, an incense burner and two candles on it.
  b.box(2.4, 0.5, 0.6, 0, 0.25, front + 0.45, C.red);
  b.box(2.5, 0.05, 0.7, 0, 0.52, front + 0.45, C.gold);
  b.add(new THREE.CylinderGeometry(0.16, 0.12, 0.18, 10), C.goldDark, 0, 0.64, front + 0.45);
  for (const x of [-0.9, 0.9]) {
    b.add(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 8), C.gold, x, 0.6, front + 0.45);
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), C.candle, x, 0.81, front + 0.45);
  }
  for (const [i, x] of [-0.5, 0.5].entries()) { // fruit on two plates
    b.add(new THREE.CylinderGeometry(0.18, 0.12, 0.05, 12), C.gold, x, 0.58, front + 0.45);
    for (let k = 0; k < 3; k++) b.add(new THREE.SphereGeometry(0.07, 8, 6), C.fruit[(i + k) % 3], x + (k - 1) * 0.09, 0.66 + (k === 1 ? 0.06 : 0), front + 0.45);
  }
  block(0, front + 0.45, 2.6, 0.8);
  // The canopy (닫집) over the middle Buddha.
  b.box(3.2, 0.3, 1.8, 0, h - 0.7, A.z, C.red);
  b.box(3.4, 0.08, 2.0, 0, h - 0.86, A.z, C.gold);
  for (const sx of [-1, 1]) b.box(0.08, 0.5, 0.08, sx * 1.55, h - 1.1, A.z + 0.85, C.gold); // its tassels
  // The cushions (방석), in rows facing the altar.
  const seats = [];
  for (const z of Lo.cushions.zs) {
    for (const x of Lo.cushions.xs) {
      b.box(0.62, 0.07, 0.62, x, 0.035, z, C.cushion);
      b.box(0.66, 0.02, 0.66, x, 0.01, z, C.cushionEdge);
      seats.push({ x, z, y: SEAT_Y, ry: Math.PI, mat: true, cushion: true, stand: [x, z + 0.55] }); // (mat: sit on the floor)
    }
  }
  b.flush(scene);
  scene.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  // The three Buddhas on the altar, facing the door.
  for (const [x, s] of Lo.buddhas) {
    const bud = seatedBuddha(scene, s);
    bud.position.set(x, A.h, A.z);
  }
  // The candle flames flicker.
  const flames = [-0.9, 0.9].map((x) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({ color: C.flame }));
    f.position.set(x, 1.0, front + 0.45);
    scene.add(f);
    return f;
  });
  let time = 0;
  const animate = (dt) => {
    time += dt;
    flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(time * 9 + i * 2) * 0.12 + Math.sin(time * 23 + i) * 0.06; });
    glow.intensity = 9 + Math.sin(time * 7) * 0.4;
  };

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: EXIT,
    stations: { pray: [{ x: Lo.pray.x, z: Lo.pray.z, r: Lo.pray.r, face: Math.PI, pose: 'pray' }] },
    animate,
    // The camera stays inside the walls and in front of the altar.
    camBlocked: (x, z) => Math.abs(x) > w / 2 - 0.3 || z > d / 2 - 0.3 || z < A.z + A.d / 2,
    dharmaHall: true,
  };
}
