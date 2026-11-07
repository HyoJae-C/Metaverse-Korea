// 3D props for the folk games (윷놀이, 투호, 제기차기, 널뛰기), ready to set
// in a courtyard when the games get a place on the map (docs/FOLK-GAMES.md).
// Each builder returns a THREE.Group standing on y = 0, facing +z, with
// low-poly parts in a few shared materials. Preview: dev/folk-games.html.
import * as THREE from 'three';
import { SPOT_XY, isBig } from './yut-game.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
function part(g, geo, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

// The yut board drawn on cloth: 29 spots, the corners and centre bigger.
let boardTex = null;
export function yutBoardTexture() {
  if (boardTex || typeof document === 'undefined') return boardTex;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#f3e6c4'; x.fillRect(0, 0, 512, 512);
  const P = (s) => [64 + SPOT_XY[s][0] * 384, 64 + SPOT_XY[s][1] * 384];
  x.strokeStyle = '#7a4b2a'; x.lineWidth = 6;
  x.strokeRect(64, 64, 384, 384);
  x.beginPath(); x.moveTo(64, 64); x.lineTo(448, 448); x.moveTo(448, 64); x.lineTo(64, 448); x.stroke();
  for (let s = 0; s < 29; s++) {
    const [px, py] = P(s), big = isBig(s);
    x.fillStyle = big ? '#b8322a' : '#2c2a33';
    x.beginPath(); x.arc(px, py, big ? 24 : 15, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f3e6c4';
    x.beginPath(); x.arc(px, py, big ? 13 : 7, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = '#7a4b2a'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center';
  x.fillText('출발', 448, 500);
  boardTex = new THREE.CanvasTexture(c);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  return boardTex;
}

// One yut stick: a split round stick, flat side up or down.
export function makeYutStick(flatUp = true, marked = false) {
  const g = new THREE.Group();
  const half = new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10, 1, false, 0, Math.PI);
  const s = part(g, half, '#d9b07a', 0, 0.002, 0);
  s.rotation.set(Math.PI / 2, flatUp ? -Math.PI / 2 : Math.PI / 2, 0); // roll on its long axis, then lay it down
  s.position.y = flatUp ? 0.035 : 0.0;
  if (flatUp) {
    part(g, new THREE.PlaneGeometry(0.07, 0.3), '#f0d7a8', 0, 0.036, 0).rotation.x = -Math.PI / 2;
    if (marked) part(g, new THREE.PlaneGeometry(0.04, 0.04), '#2a2622', 0, 0.037, 0).rotation.x = -Math.PI / 2;
  }
  return g;
}

// A round straw mat (멍석) with the board cloth, four sticks and four floor
// cushions (방석) round it.
export function makeYutMat() {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(1.5, 1.5, 0.04, 28), '#c9a467', 0, 0.02, 0);
  for (let r = 0.3; r < 1.5; r += 0.3) {
    const ring = part(g, new THREE.TorusGeometry(r, 0.012, 4, 36), '#a9864c', 0, 0.041, 0);
    ring.rotation.x = Math.PI / 2;
  }
  const tex = yutBoardTexture();
  const cloth = part(g, new THREE.PlaneGeometry(1.2, 1.2), tex ? new THREE.MeshLambertMaterial({ map: tex }) : '#f3e6c4', 0, 0.045, 0);
  cloth.rotation.x = -Math.PI / 2;
  [[true, true], [false, false], [true, false], [false, false]].forEach(([up, mark], i) => {
    const s = makeYutStick(up, mark);
    s.position.set(-0.25 + i * 0.16, 0.045, 0.95);
    s.rotation.y = (i - 1.5) * 0.25;
    g.add(s);
  });
  const cushions = ['#b8322a', '#2f5fa8', '#e2a72e', '#3f8a55'];
  cushions.forEach((c, i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(g, new THREE.BoxGeometry(0.55, 0.08, 0.55), c, Math.sin(a) * 1.9, 0.04, Math.cos(a) * 1.9).rotation.y = a;
  });
  return g;
}

// A bronze tuho jar on a low stand, with its two ears and a few arrows in
// it, and a rack of arrows at the throwing line (JAR_AT metres in front).
export function makeTuhoJar(lineAt = 2.6) {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.3, 0.34, 0.12, 16), '#6b4a2e', 0, 0.06, 0);
  const prof = [[0.0, 0], [0.16, 0], [0.24, 0.12], [0.26, 0.3], [0.2, 0.46], [0.1, 0.56], [0.075, 0.66], [0.09, 0.72], [0.075, 0.72]].map(([r, y]) => new THREE.Vector2(r, y));
  part(g, new THREE.LatheGeometry(prof, 18), '#9c7a3c', 0, 0.12, 0);
  for (const s of [-1, 1]) {
    part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10, 1, true), '#9c7a3c', s * 0.13, 0.8, 0);
    part(g, new THREE.BoxGeometry(0.06, 0.03, 0.03), '#9c7a3c', s * 0.1, 0.74, 0);
  }
  const arrow = (x, z, tilt) => {
    const a = new THREE.Group();
    part(a, new THREE.CylinderGeometry(0.008, 0.008, 0.75, 5), '#d8c08e', 0, 0.37, 0);
    part(a, new THREE.ConeGeometry(0.03, 0.12, 6), '#c0392b', 0, 0.72, 0);
    a.position.set(x, 0.5, z);
    a.rotation.z = tilt;
    g.add(a);
  };
  arrow(0.02, 0, 0.12); arrow(-0.03, 0.02, -0.1); arrow(0.13, 0, 0.05);
  part(g, new THREE.BoxGeometry(1.4, 0.01, 0.06), '#f2efe6', 0, 0.006, lineAt); // throwing line
  part(g, new THREE.BoxGeometry(0.3, 0.5, 0.18), '#5a3c25', 0.95, 0.25, lineAt + 0.3); // arrow rack
  for (let i = 0; i < 6; i++) {
    const a = part(g, new THREE.CylinderGeometry(0.008, 0.008, 0.75, 5), '#d8c08e', 0.86 + i * 0.035, 0.75, lineAt + 0.3);
    a.rotation.z = (i - 2.5) * 0.04;
  }
  return g;
}

// A jegi: a coin wrapped in paper with a long tassel.
export function makeJegi(color = '#e94b6a') {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12), '#c9a23a', 0, 0.006, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const strip = part(g, new THREE.BoxGeometry(0.012, 0.16, 0.003), i % 2 ? '#ffffff' : color, Math.cos(a) * 0.012, 0.085, Math.sin(a) * 0.012);
    strip.rotation.set(Math.sin(a) * 0.35, -a, Math.cos(a) * 0.35);
  }
  return g;
}
// The jegi spot: a low stool with a basket of jegis on it.
export function makeJegiStand() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.7, 0.05, 0.45), '#8a5a35', 0, 0.38, 0);
  for (const [x, z] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) part(g, new THREE.BoxGeometry(0.05, 0.38, 0.05), '#6b4528', x, 0.19, z);
  part(g, new THREE.CylinderGeometry(0.2, 0.15, 0.1, 14, 1, true), '#c79a5a', 0, 0.46, 0);
  ['#e94b6a', '#3a7bd5', '#f2b632', '#4caf6a'].forEach((c, i) => {
    const j = makeJegi(c);
    j.position.set(Math.cos(i * 1.6) * 0.08, 0.44, Math.sin(i * 1.6) * 0.08);
    j.rotation.z = (i - 1.5) * 0.4;
    g.add(j);
  });
  return g;
}

// A neolttwigi board (3.2 m) over a rolled straw bundle. The board is
// g.userData.board: rotate it on z (setNeolTilt) to show who is down.
export function makeNeolBoard() {
  const g = new THREE.Group();
  const bundle = part(g, new THREE.CylinderGeometry(0.18, 0.18, 0.7, 14), '#caa35e', 0, 0.18, 0);
  bundle.rotation.x = Math.PI / 2;
  for (const z of [-0.22, 0, 0.22]) {
    const band = part(g, new THREE.TorusGeometry(0.185, 0.015, 4, 16), '#7a5a2e', 0, 0.18, z);
    band.rotation.y = 0;
  }
  const board = new THREE.Group();
  board.position.y = 0.38;
  part(board, new THREE.BoxGeometry(3.2, 0.06, 0.38), '#b3854f', 0, 0, 0);
  for (const s of [-1, 1]) part(board, new THREE.BoxGeometry(0.42, 0.012, 0.36), s < 0 ? '#c0392b' : '#2f5fa8', s * 1.32, 0.036, 0);
  g.add(board);
  g.userData.board = board;
  // Someone sits on the middle to hold the board steady (a cushion marks it).
  part(g, new THREE.BoxGeometry(0.4, 0.06, 0.4), '#e2a72e', 0, 0.44, 0);
  return g;
}
export const NEOL_TILT = Math.atan2(0.38 - 0.03, 1.6);
export function setNeolTilt(neol, side) { // side: -1 left end down, 1 right end down, 0 level
  neol.userData.board.rotation.z = side * NEOL_TILT;
}

// The games and where you stand to play each one, relative to its prop
// (for main.js when the courtyard is placed; see docs/FOLK-GAMES.md).
export const FOLK_GAMES = [
  { id: 'yut', icon: '🎲', build: makeYutMat, stand: [0, 1.9], radius: 2.4 },
  { id: 'tuho', icon: '🏺', build: makeTuhoJar, stand: [0, 2.6], radius: 1.4 },
  { id: 'jegi', icon: '🪶', build: makeJegiStand, stand: [0, 0.9], radius: 1.4 },
  { id: 'neol', icon: '🪵', build: makeNeolBoard, stand: [-1.35, 0.6], radius: 1.4 },
];
