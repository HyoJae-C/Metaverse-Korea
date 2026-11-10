// The mini basketball court (rules and moves: core/basketball-game.js).
// Built in the hoop frame: the origin is on the floor under the rim, the
// court runs out along +z, the backboard stands at -z.
//
//   const court = makeCourt();   court.group → add to the scene
//   court.shake(); court.swish(); court.update(dt)   rim and net reactions
//   const ball = makeBall();     a basketball (HOOP.ball radius)
import * as THREE from 'three';
import { HOOP } from './basketball-hoop.js';

export const COURT = { hx: 5.5, z0: -1.6, z1: 8.4 }; // half width, back and front edges (hoop frame)
// Where you stand to start a game, and how close counts (hoop frame).
export const COURT_STAND = [0, 3.4];
export const COURT_RADIUS = 2.4;
// Solid bits for the map's blockers: the hoop's pole (hoop frame, half size).
export const COURT_POLE = { at: [0, -0.95], half: 0.18 };

const mats = {};
const mat = (c, o = {}) => (mats[c + JSON.stringify(o)] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));

// The court surface with its lines, drawn once on a canvas.
function courtTexture() {
  const W = 512, Hh = Math.round(512 * (COURT.z1 - COURT.z0) / (COURT.hx * 2));
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  const s = W / (COURT.hx * 2); // px per metre
  const X = (x) => (x + COURT.hx) * s, Z = (z) => (z - COURT.z0) * s;
  g.fillStyle = '#3f6fae'; g.fillRect(0, 0, W, Hh); // blue outer court
  g.fillStyle = '#d9663f'; // terracotta key
  g.fillRect(X(-1.1), Z(-0.9), 2.2 * s, (2.75 + 0.9) * s);
  g.strokeStyle = '#ffffff'; g.lineWidth = 5;
  g.strokeRect(X(-COURT.hx) + 6, Z(-0.9), (COURT.hx * 2) * s - 12, (COURT.z1 - 0.3 + 0.9) * s); // boundary
  g.strokeRect(X(-1.1), Z(-0.9), 2.2 * s, (2.75 + 0.9) * s); // the key
  g.beginPath(); g.arc(X(0), Z(2.75 - 0.05), 1.1 * s, 0, Math.PI); g.stroke(); // free throw circle
  g.beginPath(); g.arc(X(0), Z(0), 0.75 * s, 0, Math.PI); g.stroke(); // no-charge arc
  // Three-point line: straight in the corners, then an arc (scaled to the mini hoop).
  const r3 = 4.4, cx = 4.1;
  const zc = Math.sqrt(r3 * r3 - cx * cx);
  g.beginPath();
  g.moveTo(X(-cx), Z(-0.9)); g.lineTo(X(-cx), Z(zc));
  g.arc(X(0), Z(0), r3 * s, Math.PI - Math.atan2(zc, cx), Math.atan2(zc, cx), true);
  g.lineTo(X(cx), Z(-0.9));
  g.stroke();
  // Half-court circle at the front edge.
  g.beginPath(); g.arc(X(0), Z(COURT.z1 - 0.3), 1.1 * s, Math.PI, 0); g.stroke();
  // A little name painted near the front.
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `900 ${Math.round(0.42 * s)}px system-ui, sans-serif`; g.textAlign = 'center';
  g.fillText('PEACE PLAZA COURT', X(0), Z(6.2));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A basketball: orange with dark seams.
let ballTex = null;
function ballTexture() {
  if (ballTex) return ballTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#e2742b'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#3a2216'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 32); g.lineTo(128, 32); g.stroke(); // equator
  for (const x of [32, 96]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
  for (const x of [0, 64, 128]) { g.beginPath(); g.ellipse(x, 32, 18, 34, 0, 0, Math.PI * 2); g.stroke(); }
  ballTex = new THREE.CanvasTexture(c);
  ballTex.colorSpace = THREE.SRGBColorSpace;
  return ballTex;
}
export function makeBall() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(HOOP.ball, 18, 12), new THREE.MeshLambertMaterial({ map: ballTexture() }));
  m.name = 'basketball';
  return m;
}

// The net: loops of cord hanging from the rim, narrower at the bottom.
function makeNet() {
  const pts = [];
  const N = 12, rows = 4, len = 0.34;
  const ring = (k) => { const u = k / rows; return { r: HOOP.r * (1 - 0.38 * u), y: -len * u }; };
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < rows; k++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 0.5) / N) * Math.PI * 2, a2 = ((i + 1) / N) * Math.PI * 2;
      const p = ring(k), q = ring(k + 1);
      // a diamond mesh: zig-zag down between neighbours
      pts.push(Math.cos(a0) * p.r, p.y, Math.sin(a0) * p.r, Math.cos(a1) * q.r, q.y, Math.sin(a1) * q.r);
      pts.push(Math.cos(a2) * p.r, p.y, Math.sin(a2) * p.r, Math.cos(a1) * q.r, q.y, Math.sin(a1) * q.r);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const net = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#f7f7f2' }));
  net.name = 'net';
  return net;
}

export function makeCourt() {
  const group = new THREE.Group();
  group.name = 'basketball-court';
  // Surface (just above the ground) with a low kerb round it.
  const w = COURT.hx * 2, d = COURT.z1 - COURT.z0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: courtTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.03, (COURT.z0 + COURT.z1) / 2);
  group.add(floor);
  const kerb = mat('#c9c4ba');
  for (const [x, z, sx, sz] of [[0, COURT.z0, w + 0.3, 0.15], [0, COURT.z1, w + 0.3, 0.15], [-COURT.hx, (COURT.z0 + COURT.z1) / 2, 0.15, d], [COURT.hx, (COURT.z0 + COURT.z1) / 2, 0.15, d]]) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), kerb);
    k.position.set(x, 0.03, z);
    group.add(k);
  }
  // Pole, arm, backboard, rim and net.
  const steel = mat('#3a4250');
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, HOOP.board.y0 + 0.5, 12), steel);
  pole.position.set(COURT_POLE.at[0], (HOOP.board.y0 + 0.5) / 2, COURT_POLE.at[1]);
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Math.abs(HOOP.board.z - COURT_POLE.at[1])), steel);
  arm.position.set(0, HOOP.board.y0 + 0.3, (HOOP.board.z + COURT_POLE.at[1]) / 2);
  group.add(arm);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 12), mat('#d64541'));
  pad.position.set(COURT_POLE.at[0], 0.45, COURT_POLE.at[1]);
  group.add(pad);
  const hoop = new THREE.Group(); // shakes after a dunk
  hoop.position.set(0, 0, 0);
  group.add(hoop);
  const B = HOOP.board;
  const board = new THREE.Mesh(new THREE.BoxGeometry(B.w, B.h, B.t), mat('#eef4f8', { transparent: true, opacity: 0.88 }));
  board.position.set(0, B.y0 + B.h / 2, B.z - B.t / 2);
  hoop.add(board);
  const red = mat('#d64541');
  // Board edge and the small square over the rim.
  for (const [x, y, sx, sy] of [
    [0, B.y0 + B.h - 0.02, B.w, 0.04], [0, B.y0 + 0.02, B.w, 0.04], [-B.w / 2 + 0.02, B.y0 + B.h / 2, 0.04, B.h], [B.w / 2 - 0.02, B.y0 + B.h / 2, 0.04, B.h],
    [0, HOOP.h + 0.3, 0.42, 0.03], [0, HOOP.h + 0.02, 0.42, 0.03], [-0.2, HOOP.h + 0.16, 0.03, 0.3], [0.2, HOOP.h + 0.16, 0.03, 0.3],
  ]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.012), red);
    e.position.set(x, y, B.z + 0.006);
    hoop.add(e);
  }
  const rimG = new THREE.Group();
  rimG.position.set(0, HOOP.h, 0);
  hoop.add(rimG);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(HOOP.r, 0.014, 8, 28), mat('#e8572a'));
  rim.rotation.x = Math.PI / 2;
  rimG.add(rim);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, Math.abs(B.z) - HOOP.r), mat('#e8572a'));
  bracket.position.set(0, -0.01, (B.z - HOOP.r) / 2 + 0.0);
  bracket.position.z = -(HOOP.r + (Math.abs(B.z) - HOOP.r) / 2);
  rimG.add(bracket);
  const net = makeNet();
  rimG.add(net);
  // A bench at the side for watchers.
  const wood = mat('#b98a5a');
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2.2), wood);
  seat.position.set(COURT.hx + 0.7, 0.42, 3.4);
  group.add(seat);
  for (const z of [2.5, 4.3]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.08), steel);
    leg.position.set(COURT.hx + 0.7, 0.21, z);
    group.add(leg);
  }
  // A ball rack by the pole, with two spare balls.
  for (const [x, z] of [[0.9, -1.1], [1.12, -1.1]]) {
    const b = makeBall();
    b.position.set(x, HOOP.ball + 0.02, z);
    group.add(b);
  }

  let shakeT = 0, swishT = 0, swishAmp = 0;
  return {
    group,
    rim: rimG, net,
    // The rim shakes after a dunk.
    shake() { shakeT = 0.7; },
    // The net flicks up as the ball goes through (soft: a rim-in or bank).
    swish(strong = true) { swishT = 0.6; swishAmp = strong ? 1 : 0.6; },
    update(dt) {
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const k = shakeT / 0.7;
        rimG.rotation.x = Math.sin(shakeT * 40) * 0.12 * k;
        rimG.position.y = HOOP.h - 0.03 * k;
        hoop.rotation.z = Math.sin(shakeT * 33) * 0.012 * k;
      } else { rimG.rotation.x = 0; rimG.position.y = HOOP.h; hoop.rotation.z = 0; }
      if (swishT > 0) {
        swishT = Math.max(0, swishT - dt);
        const k = swishT / 0.6;
        net.scale.set(1 + 0.08 * k * swishAmp, 1 - 0.35 * Math.sin(k * Math.PI) * swishAmp, 1 + 0.08 * k * swishAmp);
        net.rotation.y = Math.sin(swishT * 18) * 0.15 * k * swishAmp;
      } else { net.scale.set(1, 1, 1); net.rotation.y = 0; }
    },
  };
}
