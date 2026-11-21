// Inside Mokdong Ice Rink (목동아이스링크, stores.json "icerink"): a made-up
// hall, not a copy of the real one, and bigger than the building's 1/4
// outline on the map so there is room to skate (Yozi 2026-11-21). The ice
// (core/ice-skate.js ICE) with hockey lines, white boards with two gates on
// the lobby side, stands along the far wall to sit and watch from, a score
// cube over the ice, and by the door the skate counter, benches and a board
// that shows the trick keys. A few skaters are already going round.
//
// The skating is game/ice-rink.js. Built by core/interior.js (store.workshop
// 'icerink'), loaded with the room builder, not in the first download.
import * as THREE from 'three';
import { Batch } from './cathedral-hall.js';
import { canvasTex } from './three-kit.js';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import { ICE, GATES, MOVES, TURN_PTS } from './ice-skate.js';
import { COUNTER_H } from './counter-face.js';

// The hall: the door at +z, the stands at -z (room metres).
export const ROOM_RINK = { w: 56, d: 40, h: 10 };
export const ICE_SKATES = { type: 'inline', tier: 3, color: '#f4f6fb', pattern: null }; // white ice skates (core/rides.js)
const SEAT_H = 0.38;
const BOARD_H = 1.05, BOARD_T = 0.16;
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const C = {
  floor: '#3d4a5c', walk: '#56657a', board: '#f7f8fa', kick: '#2f6fb5', rail: '#f2c230', wall: '#dfe7ef', band: '#2f6fb5',
  ceiling: '#eef2f6', truss: '#aab6c4', step: '#b9c2cc', seatA: '#2f6fb5', seatB: '#e2574c', seatC: '#f2c230', counter: '#f4efe6',
  wood: '#c98b4f', steel: '#8a94a0', mat: '#2b3340',
};

// The boards as straight pieces round the ice: [x0, z0, x1, z1], with the
// gates left open. Corners are five pieces each.
export function boardPieces(ice = ICE, gates = GATES) {
  const out = [];
  const { x, z, hw, hd, r } = ice;
  const cx = hw - r, cz = hd - r;
  const arc = (sx, sz, a0) => { // a quarter circle round the corner (sx, sz)
    for (let i = 0; i < 5; i++) {
      const a = a0 + (i / 5) * Math.PI / 2, b = a0 + ((i + 1) / 5) * Math.PI / 2;
      out.push([x + sx * cx + Math.cos(a) * r, z + sz * cz + Math.sin(a) * r, x + sx * cx + Math.cos(b) * r, z + sz * cz + Math.sin(b) * r]);
    }
  };
  out.push([x - cx, z - hd, x + cx, z - hd]); // north
  arc(1, -1, -Math.PI / 2);
  out.push([x + hw, z - cz, x + hw, z + cz]); // east
  arc(1, 1, 0);
  let from = x + cx; // south, east to west, with the gates open
  for (const g of [...gates].sort((a, b) => b.x - a.x)) {
    out.push([from, z + hd, g.x + g.w / 2, z + hd]);
    from = g.x - g.w / 2;
  }
  out.push([from, z + hd, x - cx, z + hd]);
  arc(-1, 1, Math.PI / 2);
  out.push([x - hw, z + cz, x - hw, z - cz]); // west
  arc(-1, -1, Math.PI);
  return out;
}

// The ice from above: pale blue-white, hockey lines, the rink's name.
function iceTexture() {
  const S = 22; // px per metre
  const w = ICE.hw * 2 * S, h = ICE.hd * 2 * S;
  return canvasTex(w, h, (g) => {
    g.beginPath();
    g.roundRect(0, 0, w, h, ICE.r * S);
    g.clip();
    g.fillStyle = '#eaf4fb'; g.fillRect(0, 0, w, h);
    // Faint marks the blades left.
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const x = (i * 97) % w, y = (i * 53) % h;
      g.beginPath(); g.ellipse(x, y, 60 + (i * 37) % 160, 30 + (i * 23) % 90, (i * 0.7) % 3, 0, 1.3 + (i % 5) * 0.4); g.stroke();
    }
    const line = (x, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); };
    line(w / 2, '#d9463c', 7); line(w / 2 - 7.5 * S, '#2f6fb5', 7); line(w / 2 + 7.5 * S, '#2f6fb5', 7);
    line(2.6 * S, '#d9463c', 3); line(w - 2.6 * S, '#d9463c', 3);
    const ring = (x, y, r) => { g.strokeStyle = '#d9463c'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#d9463c'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); };
    g.strokeStyle = '#2f6fb5'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, 3.2 * S, 0, Math.PI * 2); g.stroke();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ring(w / 2 + sx * 15 * S, h / 2 + sy * 6.2 * S, 2.6 * S);
    g.fillStyle = 'rgba(47,111,181,0.5)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${1.5 * S}px ${FONT}`; g.fillText('MOKDONG', w / 2, h / 2 - 0.2 * S);
    g.font = `800 ${0.8 * S}px ${FONT}`; g.fillText('목동아이스링크', w / 2, h / 2 + 1.2 * S);
  }, { anisotropy: 4 });
}

// A sign with a Korean line and an English one.
function signMesh(ko, en, w, h, bg = '#2f6fb5', fg = '#ffffff') {
  const tex = canvasTex(512, Math.round(512 * h / w), (g, cw, chh) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, chh);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${chh * 0.4}px ${FONT}`; g.fillText(ko, cw / 2, chh * 0.34, cw - 20);
    g.font = `700 ${chh * 0.24}px ${FONT}`; g.fillText(en, cw / 2, chh * 0.74, cw - 20);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

// The board that shows the keys (drawn again when the language changes:
// game/ice-rink.js hands in the words).
export function drawHowTo(g, w, h, T) {
  g.fillStyle = '#16233a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = `800 44px ${FONT}`; g.fillText(T.title, w / 2, 44, w - 30);
  g.font = `600 24px ${FONT}`; g.fillStyle = '#bcd3ee'; g.fillText(T.sub, w / 2, 92, w - 30);
  const rows = [
    ['←', T.turn[0], TURN_PTS[1]], ['← →', T.turn[1], TURN_PTS[2]], ['← → ←', T.turn[2], TURN_PTS[3]], ['← → ← →', T.turn[3], TURN_PTS[4]],
    ['↑ ↓', T.UD, MOVES.UD.pts], ['↓ ↑', T.DU, MOVES.DU.pts], ['↑ ↑', T.UU, MOVES.UU.pts], ['↓ ↓', T.DD, MOVES.DD.pts],
  ];
  rows.forEach(([keys, name, pts], i) => {
    const y = 150 + i * 46;
    g.textAlign = 'left'; g.font = `800 30px ${FONT}`; g.fillStyle = '#f2c230'; g.fillText(keys, 34, y);
    g.fillStyle = '#ffffff'; g.font = `700 28px ${FONT}`; g.fillText(name, 240, y, 250);
    g.textAlign = 'right'; g.fillStyle = '#9fe0b0'; g.fillText('+' + pts, w - 30, y);
  });
  g.textAlign = 'center'; g.fillStyle = '#bcd3ee'; g.font = `600 22px ${FONT}`;
  g.fillText(T.foot, w / 2, h - 30, w - 30);
}
export const HOWTO_EN = {
  title: 'Jump, then arrows!', sub: 'Start with → to turn the other way · faster = longer in the air',
  turn: ['Single', 'Double', 'Triple', 'Quad'], UD: 'Butterfly', DU: 'Backflip', UU: 'Cartwheel', DD: 'Death Drop',
  foot: 'Press Jump again just before landing: PERFECT ×1.5',
};

export function buildIceRinkHall(store, ROOM = ROOM_RINK, EXIT = { x: 0, z: ROOM.d / 2 - 0.9 }) {
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfdbe6');
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc4d8ea, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(-8, 30, 14);
  scene.add(sun);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();
  const iz0 = ICE.z - ICE.hd, iz1 = ICE.z + ICE.hd;

  // ---- floor, walls, roof ----
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), C.walk, 0, 0, 0);
  b.add(new THREE.PlaneGeometry(w, d / 2 - iz1 - 0.6).rotateX(-Math.PI / 2), C.floor, 0, 0.005, (iz1 + 0.6 + d / 2) / 2); // the lobby's rubber floor
  for (const s of [-1, 1]) {
    b.add(new THREE.PlaneGeometry(d, h), C.wall, s * w / 2, h / 2, 0, { ry: -s * Math.PI / 2 });
    b.box(0.06, 1.2, d, s * (w / 2 - 0.03), 3.2, 0, C.band);
  }
  b.add(new THREE.PlaneGeometry(w, h), C.wall, 0, h / 2, -d / 2);
  b.add(new THREE.PlaneGeometry(w, h), C.wall, 0, h / 2, d / 2, { ry: Math.PI });
  b.box(w, 1.2, 0.06, 0, 5.4, -d / 2 + 0.03, C.band);
  b.add(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), C.ceiling, 0, h, 0);
  for (let x = -w / 2 + 4; x < w / 2; x += 8) b.box(0.3, 0.5, d, x, h - 0.4, 0, C.truss); // roof trusses
  for (let x = -w / 2 + 8; x < w / 2; x += 8) for (const z of [ICE.z - 6, ICE.z + 6]) b.box(1.8, 0.08, 0.5, x, h - 0.75, z, '#ffffff', { basic: true }); // lamps
  // The doors out (the way you came in).
  b.box(3.4, 2.7, 0.08, EXIT.x, 1.35, d / 2 - 0.05, '#9fc4e4');
  b.box(3.7, 0.2, 0.12, EXIT.x, 2.8, d / 2 - 0.06, C.band);
  b.box(0.1, 2.7, 0.1, EXIT.x, 1.35, d / 2 - 0.08, C.band);

  // ---- the ice ----
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(ICE.hw * 2, ICE.hd * 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: iceTexture(), transparent: true, alphaTest: 0.5 }));
  ice.position.set(ICE.x, 0.02, ICE.z);
  scene.add(ice);

  // ---- the boards ----
  for (const [x0, z0, x1, z1] of boardPieces()) {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    // (outside the ice's edge: the normal points away from the middle)
    let nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    if (nx * (mx - ICE.x) + nz * (mz - ICE.z) < 0) { nx = -nx; nz = -nz; }
    const ox = mx + nx * BOARD_T / 2, oz = mz + nz * BOARD_T / 2;
    b.box(len + 0.06, BOARD_H, BOARD_T, ox, BOARD_H / 2, oz, C.board, { ry });
    b.box(len + 0.07, 0.2, BOARD_T + 0.02, ox, 0.1, oz, C.kick, { ry });
    b.box(len + 0.07, 0.06, BOARD_T + 0.04, ox, BOARD_H + 0.03, oz, C.rail, { ry });
    // The wall you can't pass: a thick piece outside the ice's edge.
    const T = 0.7, ux = (x1 - x0) / len, uz = (z1 - z0) / len, e = 0.05;
    colliders.push({ p: [[x0 - ux * e, z0 - uz * e], [x1 + ux * e, z1 + uz * e], [x1 + ux * e + nx * T, z1 + uz * e + nz * T], [x0 - ux * e + nx * T, z0 - uz * e + nz * T]] });
  }
  for (const g of GATES) { // gate posts and a mat to step on
    for (const s of [-1, 1]) b.box(0.2, BOARD_H + 0.25, 0.2, g.x + s * g.w / 2, (BOARD_H + 0.25) / 2, iz1 + BOARD_T / 2, C.kick);
    b.box(g.w, 0.02, 2.2, g.x, 0.012, iz1 + 1.2, C.mat);
  }

  // ---- the stands (north), four steps ----
  const seats = [];
  const stand0 = iz0 - 1.5; // the front of the first step
  const TIERS = 4, STEP_D = 1.05, STEP_H = 0.45;
  for (let t = 0; t < TIERS; t++) {
    const zc = stand0 - t * STEP_D - STEP_D / 2, top = (t + 1) * STEP_H;
    b.box(w - 8, top, STEP_D, 0, top / 2, zc, C.step);
    const col = [C.seatA, C.seatB, C.seatC, C.seatA][t];
    for (let x = -w / 2 + 5; x <= w / 2 - 5; x += 0.8) {
      if (Math.abs(x) < 0.9 || Math.abs(Math.abs(x) - 12) < 0.9) continue; // aisles
      b.box(0.6, 0.08, 0.5, x, top + SEAT_H - 0.04, zc - 0.05, col);
      b.box(0.6, 0.45, 0.07, x, top + SEAT_H + 0.2, zc - 0.33, col);
      if (t < 2 && Math.round(x / 0.8) % 2 === 0) seats.push({ x, z: zc - 0.05, y: top + SEAT_H - 0.38, ry: 0, stand: [x, stand0 + 0.6] });
    }
  }
  block(0, stand0 - (TIERS * STEP_D) / 2 - 0.1, w - 8, TIERS * STEP_D);
  b.box(w - 8, 0.9, 0.08, 0, 0.45, stand0 + 0.02, C.board); // the rail in front

  // ---- the lobby: skate counter, benches, racks ----
  const cx = -w / 2 + 9, cz = d / 2 - 3.2;
  b.box(8, COUNTER_H - 0.06, 0.9, cx, (COUNTER_H - 0.06) / 2, cz, C.counter); // (low: the clerk's face shows, core/counter-face.js)
  b.box(8.2, 0.06, 1.1, cx, COUNTER_H - 0.03, cz, C.band);
  block(cx, cz, 8.2, 1.1);
  for (let i = 0; i < 4; i++) { // shelves of skates behind it
    b.box(1.7, 2.2, 0.5, cx - 3 + i * 2, 1.1, d / 2 - 0.4, C.wood);
    for (let y = 0.5; y < 2.2; y += 0.55) for (let k = -0.6; k <= 0.61; k += 0.4) {
      b.box(0.14, 0.2, 0.3, cx - 3 + i * 2 + k, y + 0.1, d / 2 - 0.62, '#f4f6fb');
      b.box(0.03, 0.05, 0.34, cx - 3 + i * 2 + k, y - 0.02, d / 2 - 0.62, C.steel);
    }
  }
  const clerk = { x: cx, z: cz + 1.1, y: 0, ry: Math.PI };
  for (const [bx, bz] of [[6, d / 2 - 4.5], [12, d / 2 - 4.5], [6, d / 2 - 7.5], [12, d / 2 - 7.5], [20, d / 2 - 4.5], [20, d / 2 - 7.5]]) {
    b.box(3, 0.1, 0.55, bx, SEAT_H, bz, C.wood);
    for (const s of [-1, 1]) b.box(0.1, SEAT_H, 0.5, bx + s * 1.3, SEAT_H / 2, bz, C.steel);
    block(bx, bz, 3, 0.55);
    for (const k of [-1, 0, 1]) seats.push({ x: bx + k * 0.9, z: bz, y: 0, ry: Math.PI, stand: [bx + k * 0.9, bz - 0.7] });
  }
  b.flush(scene);
  scene.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  const put = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  put(signMesh('스케이트 대여 · 무료', 'SKATE RENTAL · FREE', 6, 1.2), cx, 3.2, d / 2 - 0.1, Math.PI);
  put(signMesh('목동아이스링크', 'MOKDONG ICE RINK', 12, 2.2, '#ffffff', '#2f6fb5'), 0, 7.6, -d / 2 + 0.08);
  // The board with the keys, on a stand between the gates, facing the lobby.
  const howCanvas = document.createElement('canvas');
  howCanvas.width = 640; howCanvas.height = 580;
  const howTex = new THREE.CanvasTexture(howCanvas);
  howTex.colorSpace = THREE.SRGBColorSpace;
  const drawHow = (T) => { drawHowTo(howCanvas.getContext('2d'), 640, 580, T); howTex.needsUpdate = true; };
  drawHow(HOWTO_EN);
  const howAt = { x: 0, z: iz1 + 1.6 };
  const howMat = new THREE.MeshBasicMaterial({ map: howTex });
  // Up above the boards, and the same on its back, so it reads from the lobby and from the ice (Yozi 2026-11-21).
  put(new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.8), howMat), howAt.x, 3.5, howAt.z + 0.06);
  put(new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.8).rotateY(Math.PI), howMat), howAt.x, 3.5, howAt.z - 0.06);
  put(new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.0, 0.1), new THREE.MeshLambertMaterial({ color: C.band })), howAt.x, 3.5, howAt.z);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), new THREE.MeshLambertMaterial({ color: C.steel })), howAt.x, 0.75, howAt.z);
  block(howAt.x, howAt.z, 0.4, 0.3);

  // The score cube over the middle of the ice: game/ice-rink.js writes on it.
  const cubeCanvas = document.createElement('canvas');
  cubeCanvas.width = 512; cubeCanvas.height = 256;
  const cubeTex = new THREE.CanvasTexture(cubeCanvas);
  cubeTex.colorSpace = THREE.SRGBColorSpace;
  const drawCube = (top, big, small = '') => {
    const g = cubeCanvas.getContext('2d');
    g.fillStyle = '#0d1420'; g.fillRect(0, 0, 512, 256);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#9fc4e4'; g.font = `700 34px ${FONT}`; g.fillText(top, 256, 44, 480);
    g.fillStyle = '#ffd84a'; g.font = `800 92px ${FONT}`; g.fillText(big, 256, 132, 480);
    g.fillStyle = '#ffffff'; g.font = `700 34px ${FONT}`; g.fillText(small, 256, 218, 480);
    cubeTex.needsUpdate = true;
  };
  drawCube('MOKDONG ICE RINK', '⛸', '목동아이스링크');
  const face = new THREE.MeshBasicMaterial({ map: cubeTex }), dark = new THREE.MeshLambertMaterial({ color: '#1b2533' });
  put(new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 5), [face, face, dark, dark, face, face]), ICE.x, h - 2.6, ICE.z);

  // ---- skaters already on the ice ----
  // They go round on ovals, each at their own pace; now and then one turns in the air.
  const skaters = [0, 1, 2, 3].map((i) => {
    const ch = createCharacter(randomLook());
    ch.setBike(1, { ...ICE_SKATES, color: ['#f4f6fb', '#1d1b22', '#f4f6fb', '#ff9ec4'][i] });
    scene.add(ch.root);
    return { ch, a: i * 1.7, rx: ICE.hw - 3.5 - i * 2.6, rz: ICE.hd - 3 - i * 1.7, pace: (i % 2 ? -1 : 1) * (0.42 - i * 0.05), jump: 3 + i * 4.3, t: 0 };
  });
  const animate = (dt) => {
    for (const s of skaters) {
      s.a += s.pace * dt;
      const x = ICE.x + Math.cos(s.a) * s.rx, z = ICE.z + Math.sin(s.a) * s.rz;
      const vx = -Math.sin(s.a) * s.rx * s.pace, vz = Math.cos(s.a) * s.rz * s.pace;
      let y = 0, pose = null;
      s.jump -= dt;
      if (s.jump < 0) { // a double, every so often
        s.t += dt;
        const p = s.t / 0.62;
        if (p >= 1) { s.t = 0; s.jump = 9 + (Math.abs(s.rx * 7) % 8); } else { y = Math.sin(Math.PI * p) * 0.75; pose = { spin: Math.PI * 4 * p, tuck: 0.5 }; }
      }
      s.ch.root.position.set(x, y, z);
      s.ch.root.rotation.y = Math.atan2(vx, vz);
      s.ch.setTrick(pose, y);
      s.ch.animate(dt, 0.75, false);
    }
  };
  animate(0);

  return {
    scene, products: [], colliders, seats, clerk, trainer: null, barkeep: null, turntable: null, tv: null, room: ROOM, exit: EXIT, noExit: false,
    stations: {},
    animate,
    camBlocked: (x, z) => Math.abs(x) > w / 2 - 0.3 || Math.abs(z) > d / 2 - 0.3,
    iceRink: { drawCube, drawHow, howAt, npcs: skaters },
  };
}
