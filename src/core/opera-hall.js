// Inside the Opera House: the Opera Theater (오페라극장), a made-up hall in
// the real one's colours (Yozi's photos, 2026-11-21): a horseshoe of three
// balconies in red and gold, cream box fronts that bulge out like shells,
// rows of blue-violet seats, rings of lights in a round ceiling. The stage
// is at the far end (-z) behind a gold frame and a red curtain; before it is
// the orchestra pit behind a low wall, the conductor on a podium in the
// middle of it. The show is core/stage-show.js.
//
// You walk in at the back (+z) and sit in the stalls. About half of the
// seats are taken already (the house is never empty): those people, and
// the ones along the balconies, are drawn as one instanced crowd, not as
// characters. Sizes are for the chibi characters (about 1.1 m tall).
// Static parts are merged per colour: about 45k triangles, 20 draw calls.
import * as THREE from 'three';
import { Batch } from './cathedral-hall.js';

const SEAT_H = 0.38; // the same seat height as every chair in the game

export const ROOM_OPERA = { w: 34, d: 46, h: 16 };

// Where things are (room metres). Exported for the show and the tests.
export const OPERA_LAYOUT = {
  stage: { front: -11, back: -22, y: 1.15, open: 18, high: 9.5 }, // the stage floor: its front edge (z), back wall, height; the frame's opening
  pit: { z0: -10.8, z1: -6.6, half: 9.5, wall: 0.8 }, // the orchestra pit: from the stage to its low wall, half its width
  podium: { x: 0, z: -7.4, y: 0.3 }, // the conductor, by the pit's wall, facing the stage
  rows: { z0: -3.6, gap: 1.55, n: 13, pitch: 0.72 }, // the stalls: first row (z), row to row, rows, seat to seat
  blocks: [[-13.2, -6.3], [-4.7, 4.7], [6.3, 13.2]], // each block's x range (A, B, C); the aisles run between them
  tiers: [4.3, 7.5, 10.7], // the balconies' floors (y)
  side: { depth: 2.6, z0: -8.5 }, // the side balconies: how far they reach in from the wall, where they start (z)
  back: { depth: 5.2 }, // the balcony over the door
};

export const C = {
  red: '#8f2326', redDark: '#6e1a1e', gold: '#d9b45c', goldDark: '#b08a3a', cream: '#f1e6c9', creamDark: '#d8c9a2', seat: '#5b55a6', seatDark: '#3d3a78',
  floor: '#7a2a2c', aisle: '#a33b35', wood: '#8a5a36', woodDark: '#5c3a22', black: '#17151a', light: '#ffe9b0', curtain: '#a01d27', curtainDark: '#7c151e', pit: '#2a2422', stand: '#1d1b20',
};

// A steady 0-1 number for a place (the same seat always has the same person).
export const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// Every seat of a hall: a cushion, a back, dark arms (three instanced meshes).
// places: [x, z, y = 0, ry = 0] (ry 0: facing -z, the stage).
export function addSeats(scene, places, pitch, color, dark) {
  const n = places.length, dm = new THREE.Object3D();
  const cushion = new THREE.InstancedMesh(new THREE.BoxGeometry(pitch - 0.14, 0.1, 0.42).translate(0, SEAT_H - 0.05, 0), new THREE.MeshLambertMaterial({ color }), n);
  const back = new THREE.InstancedMesh(new THREE.BoxGeometry(pitch - 0.1, 0.62, 0.09).translate(0, SEAT_H + 0.27, 0.25), new THREE.MeshLambertMaterial({ color }), n);
  const frame = new THREE.InstancedMesh(new THREE.BoxGeometry(pitch - 0.02, SEAT_H - 0.1, 0.4).translate(0, (SEAT_H - 0.1) / 2, 0.02), new THREE.MeshLambertMaterial({ color: dark }), n);
  places.forEach(([x, z, y = 0, ry = 0], i) => { dm.position.set(x, y, z); dm.rotation.y = ry; dm.updateMatrix(); cushion.setMatrixAt(i, dm.matrix); back.setMatrixAt(i, dm.matrix); frame.setMatrixAt(i, dm.matrix); });
  scene.add(cushion, back, frame);
}

// The house: everyone seated, as one crowd (a body, a head and hair each;
// clothes, skin and hair colours vary). crowd: [{ x, y, z, ry, k }], k a
// steady 0-1 number. Returns clap(k) (0 still … 1 a full ovation: the heads
// bob) and animate(dt).
export function addCrowd(scene, crowd) {
  const CLOTHES = ['#2b2f45', '#4a2f3a', '#3a4a5c', '#6b2f38', '#2f4a3c', '#544a6e', '#1f2024', '#7a5a3a', '#8a8fa0', '#b0453f'];
  const SKIN = ['#f3d2b3', '#e8bf9b', '#d9a67e', '#c58f68', '#f6dcc4'];
  const HAIR = ['#1c1a1d', '#2e2320', '#4a3324', '#6b4a2e', '#8a8580', '#c9a25a'];
  const n = crowd.length, dm = new THREE.Object3D(), col = new THREE.Color();
  const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 0.42, 7).translate(0, SEAT_H + 0.2, 0), new THREE.MeshLambertMaterial(), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6).translate(0, SEAT_H + 0.6, 0), new THREE.MeshLambertMaterial(), n);
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.215, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, SEAT_H + 0.615, 0.02), new THREE.MeshLambertMaterial(), n);
  const place = (c, up) => { dm.position.set(c.x, c.y + up, c.z); dm.rotation.y = c.ry; const s = 0.92 + c.k * 0.16; dm.scale.set(s, s, s); dm.updateMatrix(); };
  crowd.forEach((c, i) => {
    place(c, 0);
    for (const m of [body, head, hair]) m.setMatrixAt(i, dm.matrix);
    body.setColorAt(i, col.set(CLOTHES[Math.floor(c.k * 97) % CLOTHES.length]));
    head.setColorAt(i, col.set(SKIN[Math.floor(c.k * 53) % SKIN.length]));
    hair.setColorAt(i, col.set(HAIR[Math.floor(c.k * 31) % HAIR.length]));
  });
  scene.add(body, head, hair);
  let clapK = 0, time = 0, wasClapping = false;
  const bob = (t) => {
    crowd.forEach((c, i) => { place(c, clapK ? Math.abs(Math.sin(t * (7 + c.k * 3) + c.k * 40)) * 0.035 * clapK : 0); head.setMatrixAt(i, dm.matrix); hair.setMatrixAt(i, dm.matrix); });
    head.instanceMatrix.needsUpdate = hair.instanceMatrix.needsUpdate = true;
  };
  return {
    clap: (k) => { clapK = k; },
    animate: (dt) => { time += dt; if (clapK > 0.01 || wasClapping) { bob(time); wasClapping = clapK > 0.01; } },
  };
}

// The night scene behind the dancers: a moonlit lake.
function backdrop() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#0f1a3d'); sky.addColorStop(0.55, '#2c4a86'); sky.addColorStop(0.56, '#1a2c57'); sky.addColorStop(1, '#0d1731');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#f6f1d6'; g.beginPath(); g.arc(380, 60, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(246,241,214,0.25)'; for (let y = 150; y < 250; y += 9) g.fillRect(380 - (y - 140) * 0.5, y, (y - 140), 3); // the moon on the water
  g.fillStyle = '#0a1226'; // trees on both sides
  for (const [x0, dir] of [[0, 1], [512, -1]]) for (let i = 0; i < 6; i++) { const x = x0 + dir * (10 + i * 26), h = 150 - i * 16; g.beginPath(); g.moveTo(x - 30, 146); g.lineTo(x, 146 - h); g.lineTo(x + 30, 146); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % 512, (i * 53) % 120, 2, 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildOperaHall(store, ROOM, EXIT) {
  const { w, d, h } = ROOM, L = OPERA_LAYOUT, S = L.stage, P = L.pit;
  const HW = w / 2, F = d / 2, B = -d / 2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1c1214');
  const house = new THREE.HemisphereLight(0xffe8c4, 0x5a3a30, 1.5);
  scene.add(house);
  const fill = new THREE.PointLight(0xffd9a0, 30, 40);
  fill.position.set(0, h - 2, 4);
  scene.add(fill);
  const stageLight = new THREE.PointLight(0xdfe8ff, 26, 26);
  stageLight.position.set(0, S.y + 7, S.front - 3);
  scene.add(stageLight);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();

  // --- Floor, walls, ceiling ---------------------------------------------------
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), C.floor, 0, 0, 0);
  for (let i = 0; i < L.blocks.length - 1; i++) { // the two aisles' carpet, and one across the back
    const x = (L.blocks[i][1] + L.blocks[i + 1][0]) / 2;
    b.add(new THREE.PlaneGeometry(L.blocks[i + 1][0] - L.blocks[i][1], F - P.z1).rotateX(-Math.PI / 2), C.aisle, x, 0.01, (F + P.z1) / 2);
  }
  for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(d, h), C.red, s * HW, h / 2, 0, { ry: -s * Math.PI / 2 }); // side walls
  b.add(new THREE.PlaneGeometry(w, h), C.red, 0, h / 2, F, { ry: Math.PI }); // the back wall (the door's)
  b.add(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), C.cream, 0, h, 0); // the ceiling
  // The round ceiling: rings stepping up to a glowing middle, lights round each.
  const cz = 5;
  for (const [r, y, col] of [[13, h - 0.25, C.creamDark], [10, h - 0.55, C.cream], [7, h - 0.85, C.creamDark], [4.2, h - 1.15, C.cream]]) b.add(new THREE.RingGeometry(r - 2.6, r, 40).rotateX(Math.PI / 2), col, 0, y, cz);
  b.add(new THREE.CircleGeometry(2.4, 32).rotateX(Math.PI / 2), C.light, 0, h - 1.2, cz, { basic: true });
  for (const [r, n] of [[11.8, 28], [8.8, 22], [5.8, 16]]) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.add(new THREE.SphereGeometry(0.13, 6, 4), C.light, Math.cos(a) * r, h - 0.5 - (12 - r) * 0.1, cz + Math.sin(a) * r, { basic: true }); }

  // --- The stage -----------------------------------------------------------------
  const SW = S.open + 3; // the stage floor is a little wider than the opening
  b.box(SW, S.y, S.front - S.back, 0, S.y / 2, (S.front + S.back) / 2, C.woodDark);
  b.add(new THREE.PlaneGeometry(SW, S.front - S.back).rotateX(-Math.PI / 2), C.wood, 0, S.y + 0.005, (S.front + S.back) / 2);
  block(0, (S.front + B) / 2, w, S.front - B); // (nobody walks onto the stage)
  // The proscenium: the wall round the opening, a gold frame, a red valance.
  const top = S.y + S.high;
  for (const s of [-1, 1]) b.box(HW - S.open / 2, h, 0.5, s * (HW + S.open / 2) / 2, h / 2, S.front + 0.25, C.redDark);
  b.box(S.open, h - top, 0.5, 0, (h + top) / 2, S.front + 0.25, C.redDark);
  for (const s of [-1, 1]) b.box(0.55, top, 0.7, s * (S.open / 2 + 0.25), top / 2, S.front + 0.4, C.gold);
  b.box(S.open + 1.6, 0.6, 0.7, 0, top + 0.3, S.front + 0.4, C.gold);
  b.box(S.open + 2.2, 0.22, 0.8, 0, top + 0.72, S.front + 0.4, C.goldDark);
  for (let i = 0; i < 12; i++) { const x = -S.open / 2 + (i + 0.5) * (S.open / 12); b.add(new THREE.CylinderGeometry(S.open / 24, S.open / 24, 0.3, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), i % 2 ? C.curtain : C.curtainDark, x, top - 0.1, S.front + 0.12); } // the valance's scallops
  b.box(S.open, 1.3, 0.12, 0, top - 0.55, S.front + 0.1, C.curtain);
  // Wings and the back wall behind the scene.
  for (const s of [-1, 1]) for (const k of [0, 1, 2]) b.box(0.15, S.high, 2.2, s * (S.open / 2 + 0.2 - k * 0.0), S.y + S.high / 2, S.front - 2.2 - k * 2.9, C.black, { ry: s * 0.35 });
  b.box(w, h, 0.3, 0, h / 2, S.back - 0.3, C.black);
  const scenery = new THREE.Mesh(new THREE.PlaneGeometry(S.open + 2, S.high), new THREE.MeshBasicMaterial({ map: backdrop() }));
  scenery.position.set(0, S.y + S.high / 2, S.back + 0.2);
  scene.add(scenery);

  // The curtain: two halves that draw apart (curtain(k): 0 shut, 1 open).
  const curtainMat = new THREE.MeshLambertMaterial({ color: C.curtain });
  const halves = [-1, 1].map((s) => {
    const geo = new THREE.PlaneGeometry(S.open / 2 + 0.3, S.high, 14, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 5.2) * 0.16); // folds
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, curtainMat);
    m.position.set(s * (S.open / 4 + 0.15), S.y + S.high / 2, S.front - 0.25);
    m.userData.side = s;
    scene.add(m);
    return m;
  });
  let curtainK = 0;
  const curtain = (k) => {
    curtainK = Math.min(1, Math.max(0, k));
    for (const m of halves) { m.scale.x = 1 - curtainK * 0.84; m.position.x = m.userData.side * (S.open / 4 + 0.15 + curtainK * (S.open / 4) * 0.86); }
  };

  // --- The orchestra pit -----------------------------------------------------------
  b.add(new THREE.PlaneGeometry(P.half * 2, P.z1 - P.z0).rotateX(-Math.PI / 2), C.pit, 0, 0.012, (P.z0 + P.z1) / 2);
  b.box(P.half * 2 + 0.3, P.wall, 0.16, 0, P.wall / 2, P.z1, C.woodDark);
  b.box(P.half * 2 + 0.3, 0.06, 0.26, 0, P.wall + 0.03, P.z1, C.gold);
  for (const s of [-1, 1]) { b.box(0.16, P.wall, P.z1 - P.z0, s * (P.half + 0.08), P.wall / 2, (P.z0 + P.z1) / 2, C.woodDark); b.box(0.26, 0.06, P.z1 - P.z0, s * (P.half + 0.08), P.wall + 0.03, (P.z0 + P.z1) / 2, C.gold); }
  block(0, (P.z0 + P.z1) / 2 - 0.2, P.half * 2 + 0.5, P.z1 - P.z0 + 0.5);
  b.box(1, L.podium.y, 1, L.podium.x, L.podium.y / 2, L.podium.z, C.wood); // the podium
  b.box(0.5, 0.04, 0.34, L.podium.x, L.podium.y + 0.72, L.podium.z - 0.62, C.stand, { rx: 0.5 }); // the conductor's stand
  b.box(0.04, 0.72, 0.04, L.podium.x, L.podium.y + 0.36, L.podium.z - 0.66, C.stand);
  // The players' places: strings to the left and right, winds in the middle
  // behind them, brass and the kettledrums at the far side (seen from the house).
  const players = [];
  const seatsPit = [
    ...[-7.6, -6.3, -5, -3.7, -2.4].flatMap((x, i) => [{ x, z: -7.6 - (i % 2) * 0.15, k: 'violin' }, { x: x - 0.3, z: -8.9, k: 'violin' }]),
    ...[2.4, 3.7, 5].flatMap((x) => [{ x, z: -7.7, k: 'viola' }]),
    ...[6.3, 7.6].flatMap((x) => [{ x, z: -7.7, k: 'cello' }, { x: x - 0.4, z: -9, k: 'cello' }]),
    { x: 8.6, z: -9.9, k: 'bass' },
    ...[-1.6, -0.5, 0.6, 1.7].map((x) => ({ x, z: -9.2, k: 'wind' })),
    ...[2.9, 4, 5.1].map((x) => ({ x, z: -9.9, k: 'brass' })),
    { x: -5.6, z: -10, k: 'timpani' },
  ];
  for (const s of seatsPit) {
    const ry = Math.atan2(L.podium.x - s.x, L.podium.z - s.z); // facing the conductor
    players.push({ ...s, ry });
    if (s.k !== 'bass' && s.k !== 'timpani') b.box(0.34, 0.05, 0.34, s.x, SEAT_H - 0.1, s.z, C.stand);
    // a music stand before each
    const mx = s.x + Math.sin(ry) * 0.5, mz = s.z + Math.cos(ry) * 0.5;
    b.box(0.03, 0.62, 0.03, mx, 0.31, mz, C.stand);
    b.box(0.34, 0.24, 0.02, mx, 0.7, mz, C.stand, { ry, rx: -0.35 });
    b.box(0.3, 0.2, 0.01, mx - Math.sin(ry) * 0.012, 0.705, mz - Math.cos(ry) * 0.012, '#f4efe2', { ry, rx: -0.35, basic: true }); // the sheet, lit by its lamp
  }

  // --- The stalls --------------------------------------------------------------------
  const seats = [], crowd = [];
  const R = L.rows, places = [];
  for (let r = 0; r < R.n; r++) {
    const z = R.z0 + r * R.gap;
    L.blocks.forEach(([x0, x1], bi) => {
      const n = Math.floor((x1 - x0) / R.pitch), start = (x0 + x1) / 2 - ((n - 1) * R.pitch) / 2;
      block((x0 + x1) / 2, z + 0.12, x1 - x0 + 0.1, 0.5);
      for (let i = 0; i < n; i++) {
        const x = start + i * R.pitch;
        places.push([x, z]);
        // More of the front and the middle is taken; the ends of rows stay free to walk in.
        const edge = i === 0 || i === n - 1, taken = !edge && hash(x * 3.1 + bi, z * 1.7) < (r < 5 ? 0.62 : 0.48);
        if (taken) crowd.push({ x, y: 0, z, ry: Math.PI, sit: true, k: hash(x, z) });
        else seats.push({ x, z: z - 0.02, ry: Math.PI, stand: [x, z - 0.72] });
      }
    });
  }
  addSeats(scene, places, R.pitch, C.seat, C.seatDark);

  // --- The balconies ---------------------------------------------------------------------
  // Each tier: a slab along both side walls and across the back, a cream
  // front with a gold rail, shell-like boxes bulging out of it, and a row of
  // little lights under its edge. People sit along the front.
  const SD = L.side.depth, BD = L.back.depth, sx = HW - SD, bz = F - BD;
  L.tiers.forEach((y, ti) => {
    const z0 = L.side.z0 + ti * 0.6, len = bz - z0; // (the upper tiers start a little farther from the stage)
    for (const s of [-1, 1]) {
      b.box(SD, 0.3, len, s * (HW - SD / 2), y - 0.15, (z0 + bz) / 2, C.creamDark);
      b.box(0.14, 0.95, len, s * sx, y + 0.42, (z0 + bz) / 2, C.cream);
      b.box(0.2, 0.07, len, s * sx, y + 0.93, (z0 + bz) / 2, C.gold);
      b.box(0.16, 0.12, len, s * sx, y - 0.24, (z0 + bz) / 2, C.gold);
      for (let z = z0 + 1.6; z < bz - 1; z += 3.2) { // the boxes
        b.add(new THREE.CylinderGeometry(1.25, 0.95, 1.05, 14, 1, false, 0, Math.PI), C.cream, s * sx, y + 0.36, z, { ry: s > 0 ? Math.PI : 0 });
        b.add(new THREE.CylinderGeometry(1.3, 1.3, 0.08, 14, 1, false, 0, Math.PI), C.gold, s * sx, y + 0.93, z, { ry: s > 0 ? Math.PI : 0 });
        b.add(new THREE.SphereGeometry(0.11, 6, 4), C.light, s * (sx - 0.9), y - 0.3, z, { basic: true });
        for (const dz of [-0.45, 0.45]) crowd.push({ x: s * (sx - 0.55), y: y + 0.02, z: z + dz, ry: -s * 1.15, sit: true, k: hash(z + dz, y + s) });
      }
      for (let z = z0 + 0.3; z < bz; z += 1.6) b.add(new THREE.SphereGeometry(0.08, 6, 4), C.light, s * (sx + 0.05), y - 0.33, z, { basic: true });
    }
    // across the back
    b.box(w - 2 * SD, 0.3, BD, 0, y - 0.15, F - BD / 2, C.creamDark);
    b.box(w - 2 * SD, 0.95, 0.14, 0, y + 0.42, bz, C.cream);
    b.box(w - 2 * SD, 0.07, 0.2, 0, y + 0.93, bz, C.gold);
    b.box(w - 2 * SD, 0.12, 0.16, 0, y - 0.24, bz, C.gold);
    for (let x = -sx + 0.8; x < sx; x += 1.6) b.add(new THREE.SphereGeometry(0.08, 6, 4), C.light, x, y - 0.33, bz - 0.05, { basic: true });
    for (let row = 0; row < 2; row++) for (let x = -sx + 1; x < sx - 0.6; x += 0.74) {
      const z = bz + 0.6 + row * 1.2, yy = y + row * 0.45;
      if (row) b.box(0.6, 0.45, 0.5, x, y + 0.225, z + 0.1, C.seatDark); // the second row sits a step higher
      if (hash(x + ti * 7, z) < 0.72) crowd.push({ x, y: yy, z, ry: Math.PI, sit: true, k: hash(x * 2 + ti, z + ti) });
    }
  });
  // The door, under the back balcony.
  b.box(2.4, 2.7, 0.1, EXIT.x, 1.35, F - 0.06, C.woodDark);
  b.box(0.06, 2.6, 0.12, EXIT.x, 1.3, F - 0.1, C.gold);
  for (const s of [-1, 1]) b.box(0.6, 3.2, 0.3, EXIT.x + s * 1.6, 1.6, F - 0.15, C.gold);

  b.flush(scene);
  scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !halves.includes(o)) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  const house$ = addCrowd(scene, crowd);
  const n = crowd.length, clap = house$.clap;
  // The house lights: lights(k) 1 = up (between pieces), 0 = down (the show).
  let lightK = 1;
  const lights = (k) => { lightK = k; house.intensity = 0.55 + 0.95 * k; fill.intensity = 6 + 24 * k; stageLight.intensity = 34 - 8 * k; };
  const animate = house$.animate;
  curtain(0);

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: EXIT,
    stations: { stage: { ...L, players, curtain, clap, lights, crowd: n } },
    animate,
    camBlocked: (x, z) => Math.abs(x) > HW - 0.4 || z > F - 0.5 || z < S.front + 0.6,
    opera: true,
    get curtainK() { return curtainK; }, get lightK() { return lightK; },
  };
}
