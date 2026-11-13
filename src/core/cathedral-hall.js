// Inside Myeongdong Cathedral (명동대성당): a made-up nave, not a copy of the
// real one. A long nave between two rows of stone columns, side aisles with
// tall stained-glass windows, a ribbed vault, the sanctuary at the far end
// (-z) with the altar, the lectern and the windows of the round apse, and
// the organ loft over the door (+z). Pews on both sides of the middle aisle
// are seats (sit on one and watch). The Mass is core/cathedral-mass.js.
//
// Sizes are for the chibi characters (about 1.1 m tall): pews at the usual
// seat height, a low altar. Static parts are merged per colour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SEAT_H = 0.38; // the same seat height as every chair in the game

// The room: the nave and both aisles, door at +z, apse at -z.
export const ROOM_CATHEDRAL = { w: 15.2, d: 32, h: 12 };

// Where things are (room metres). Exported for the Mass and the tests.
export const HALL_LAYOUT = {
  nave: 4.6, // half the nave's width: the columns stand on this line
  aisle: 7.6, // the outer walls
  arcadeTop: 5, // the columns' height (where the arches spring)
  aisleCeil: 7, // the aisles' ceiling
  clerestory: 9.4, // the nave's upper walls, up to the vault
  bays: [-8.8, -5.6, -2.4, 0.8, 4, 7.2, 10.4], // columns along z
  sanctuary: -10.4, // the step up to the sanctuary (z); behind it is raised
  platform: 0.45, // how high the sanctuary floor is
  rail: -10.15, // the altar rail in front of it
  apseAt: -11.4, // the apse's centre (z); its wall is a half circle of radius `nave`
  altar: { x: 0, z: -12.2, w: 2.2, d: 0.9, h: 0.5 }, // (waist-high to the chibi priest, so you see him over it)
  priest: { x: 0, z: -12.95 }, // behind the altar, facing the people
  ambo: { x: -3, z: -11.1 }, // the lectern, left of the altar
  servers: [[-1.8, -12.7], [1.8, -12.7]], // the altar servers' places
  pews: { xs: [1.3, 2.1, 2.9, 3.7], z0: -8.2, gap: 1.6, rows: 12 }, // seats on each side (x and -x)
  loft: { z: 13.4, y: 4.2 }, // the organ loft's front edge and floor
  // The confessional: a wooden booth against the right aisle's wall, past
  // the last column by the door. Its curtain leads into the confession room
  // (core/confession-room.js), where you are alone.
  confessional: { x: 6.95, z: 12.4, w: 1.3, d: 2.7, h: 2.4 },
};

const C = {
  floorA: '#d9d2c4', floorB: '#bdb3a2', carpet: '#8e2a2e', stone: '#cfc6b4', stoneDark: '#a99f8c',
  plaster: '#efe6d3', vault: '#e9e1d0', rib: '#b9ab90', aisleCeil: '#5c6f93', wood: '#6b4630', woodDark: '#4a2f20',
  marble: '#f3efe6', gold: '#c9a640', cloth: '#fbf8f0', red: '#b8322c', pipe: '#c9ccd1', pipeDark: '#8d9198',
};

// Collects meshes and merges those that share a colour (a few draw calls).
// (Also the confession room's, core/confession-room.js.)
export class Batch {
  constructor() { this.parts = new Map(); }
  add(geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, basic = false, back = false, sx = 1, sy = 1, sz = 1 } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.clearGroups();
    const key = (basic ? 'b' : back ? 'k' : 'l') + color; // (k: seen from inside, like the vault)
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
  }
  box(w, h, d, x, y, z, color, o) { this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, o); }
  flush(parent) {
    for (const [key, geos] of this.parts) {
      const color = key.slice(1);
      const material = key[0] === 'b' ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, side: key[0] === 'k' ? THREE.BackSide : THREE.FrontSide });
      parent.add(new THREE.Mesh(mergeGeometries(geos), material));
    }
    this.parts.clear();
  }
}

// Stained glass: one 1 m tile of coloured diamonds in dark lead, repeated
// over every window (their UVs are in metres).
function glassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const cols = ['#2f5aa8', '#c23a3a', '#e3b341', '#3f8f5a', '#6a4aa0', '#3a86c8', '#d9763a'];
  g.fillStyle = '#1d1a22';
  g.fillRect(0, 0, 64, 64);
  let k = 0;
  for (let y = -16; y < 64; y += 16) {
    for (let x = -16; x < 80; x += 32) {
      const ox = (y / 16) % 2 ? 16 : 0;
      g.fillStyle = cols[(k++ * 3) % cols.length];
      g.beginPath();
      g.moveTo(x + ox, y + 1); g.lineTo(x + ox + 15, y + 16); g.lineTo(x + ox, y + 31); g.lineTo(x + ox - 15, y + 16);
      g.closePath();
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.5, 2.5); // (small panes: 40 cm tiles)
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The confessional's name board: gold letters on dark wood.
function confessionSign() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#3a2418';
  g.fillRect(0, 0, 512, 80);
  g.strokeStyle = '#c9a640';
  g.lineWidth = 3;
  g.strokeRect(4, 4, 504, 72);
  g.fillStyle = '#e9c964';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 38px sans-serif';
  g.fillText('고해성사실', 256, 32);
  g.font = '15px sans-serif';
  g.fillText('CONFESSION', 256, 63);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A rose window: petals round a centre, in the same glass colours.
function roseTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1d1a22';
  g.fillRect(0, 0, 128, 128);
  const ring = (n, r0, r1, colA, colB) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.fillStyle = i % 2 ? colA : colB;
      g.beginPath();
      g.ellipse(64 + Math.cos(a) * (r0 + r1) / 2, 64 + Math.sin(a) * (r0 + r1) / 2, (r1 - r0) / 2 - 1, Math.PI * (r0 + r1) / n / 2 - 1.5, a, 0, Math.PI * 2);
      g.fill();
    }
  };
  ring(16, 40, 62, '#2f5aa8', '#c23a3a');
  ring(8, 18, 40, '#e3b341', '#3f8f5a');
  g.fillStyle = '#e3b341';
  g.beginPath(); g.arc(64, 64, 14, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The floor: big stone tiles in two tones, laid diagonally.
function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = C.floorA;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = C.floorB;
  g.fillRect(0, 0, 32, 32);
  g.fillRect(32, 32, 32, 32);
  g.strokeStyle = 'rgba(80,70,60,0.25)';
  g.strokeRect(0.5, 0.5, 63, 63);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ROOM_CATHEDRAL.w / 2.4, ROOM_CATHEDRAL.d / 2.4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A lancet window's outline (w wide, h tall to the tip), standing on y = 0.
function lancet(w, h) {
  const s = new THREE.Shape(), r = w * 0.9, side = h - Math.sqrt(r * r - (r - w / 2) ** 2);
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, side);
  s.absarc(w / 2 - r, side, r, 0, Math.acos((r - w / 2) / r), false);
  s.absarc(-w / 2 + r, side, r, Math.PI - Math.acos((r - w / 2) / r), Math.PI, false);
  s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 6);
}

// The wall over an arch between two columns: a bay `span` wide, from the
// springing (y = 0) to `top`, with a pointed arch cut out of it.
function spandrel(span, open, top) {
  const r = open * 0.7, c = open / 2 - r, rise = Math.sqrt(r * r - c * c);
  const s = new THREE.Shape();
  s.moveTo(-span / 2, 0); s.lineTo(-open / 2, 0);
  s.absarc(-c, 0, r, Math.PI, Math.acos(c / r), true); // up the left side of the arch to its tip (centre right of the middle)
  s.absarc(c, 0, r, Math.PI - Math.acos(c / r), 0, true); // and down the right side
  s.lineTo(span / 2, 0); s.lineTo(span / 2, top); s.lineTo(-span / 2, top); s.lineTo(-span / 2, 0);
  return { geo: new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.25), rise };
}

export function buildCathedralHall(store, ROOM, EXIT) {
  const { w, d } = ROOM;
  const L = HALL_LAYOUT, NV = L.nave, AW = L.aisle;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2420');
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x6b5a48, 1.45));
  const altarLight = new THREE.PointLight(0xffd9a0, 14, 16);
  altarLight.position.set(0, 4.2, L.altar.z + 1.5);
  scene.add(altarLight);
  for (const z of [-2, 9]) { // a soft light down the nave
    const l = new THREE.PointLight(0xffe4bd, 6, 14);
    l.position.set(0, 5, z);
    scene.add(l);
  }
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();
  const glass = new THREE.MeshBasicMaterial({ map: glassTexture(), side: THREE.DoubleSide });
  const panes = []; // every window, one mesh
  const pane = (geo, x, y, z, ry) => panes.push(geo.rotateY(ry).translate(x, y, z));

  // Floor and the red carpet up the middle aisle.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: floorTexture() }));
  scene.add(floor);
  b.box(1.5, 0.012, L.loft.z + 2.2 - L.sanctuary, 0, 0.006, (L.loft.z + 2.2 + L.sanctuary) / 2, C.carpet);

  // The aisles' outer walls (facing in), a wooden wainscot, and a tall
  // window in each bay.
  for (const s of [-1, 1]) {
    const len = d, ry = -s * Math.PI / 2;
    b.add(new THREE.PlaneGeometry(len, L.aisleCeil), C.plaster, s * AW, L.aisleCeil / 2, 0, { ry });
    b.box(0.06, 1.1, len, s * (AW - 0.03), 0.55, 0, C.wood);
    for (let i = 0; i < L.bays.length - 1; i++) {
      const z = (L.bays[i] + L.bays[i + 1]) / 2;
      pane(lancet(1.1, 3.4), s * (AW - 0.02), 2.1, z, ry);
      b.box(0.08, 0.12, 1.3, s * (AW - 0.05), 2.05, z, C.stone); // the sill
    }
    // The aisle's ceiling (seen from below) with a rib across each bay.
    b.add(new THREE.PlaneGeometry(AW - NV, d).rotateX(Math.PI / 2), C.aisleCeil, s * (AW + NV) / 2, L.aisleCeil, 0);
    for (const z of L.bays) b.box(AW - NV, 0.14, 0.16, s * (AW + NV) / 2, L.aisleCeil - 0.07, z, C.rib);
  }

  // The arcades: columns, capitals, pointed arches, and the nave's upper
  // walls with a small window over each arch.
  const bay = L.bays[1] - L.bays[0];
  const arch = spandrel(bay, bay - 0.7, L.aisleCeil - L.arcadeTop);
  for (const s of [-1, 1]) {
    for (const z of L.bays) {
      b.add(new THREE.CylinderGeometry(0.3, 0.3, L.arcadeTop - 0.3, 12), C.stone, s * NV, (L.arcadeTop - 0.3) / 2 + 0.15, z);
      b.box(0.8, 0.3, 0.8, s * NV, 0.15, z, C.stoneDark); // base
      b.box(0.8, 0.28, 0.8, s * NV, L.arcadeTop - 0.14, z, C.stoneDark); // capital
      b.box(0.24, L.clerestory - L.aisleCeil, 0.3, s * (NV - 0.28), (L.clerestory + L.aisleCeil) / 2, z, C.stone); // the shaft up to the vault's rib
      block(s * NV, z, 0.8, 0.8);
    }
    for (let i = 0; i < L.bays.length - 1; i++) {
      const z = (L.bays[i] + L.bays[i + 1]) / 2;
      b.add(arch.geo.clone(), C.plaster, s * NV, L.arcadeTop, z, { ry: Math.PI / 2 });
      pane(lancet(0.8, 1.5), s * (NV - 0.26), L.aisleCeil + 0.45, z, -s * Math.PI / 2);
    }
    b.add(new THREE.PlaneGeometry(d, L.clerestory - L.aisleCeil), C.plaster, s * (NV - 0.25), (L.clerestory + L.aisleCeil) / 2, 0, { ry: -s * Math.PI / 2 });
    // Beyond the last column towards the door: plain wall up to the aisle ceiling.
    const z1 = L.bays[L.bays.length - 1], zEnd = d / 2;
    b.box(0.5, L.aisleCeil - L.arcadeTop, zEnd - z1, s * NV, (L.aisleCeil + L.arcadeTop) / 2, (z1 + zEnd) / 2, C.plaster);
  }

  // The vault over the nave: a low barrel with a rib at each column, resting
  // on the upper walls (VR: their inner face).
  const VR = NV - 0.25;
  // (A half cylinder along z, flattened; seen from inside, so its back faces.)
  const barrel = new THREE.CylinderGeometry(VR, VR, d / 2 - L.apseAt, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
  barrel.scale(1, 0.55, 1);
  b.add(barrel, C.vault, 0, L.clerestory, (d / 2 + L.apseAt) / 2, { back: true });
  for (const z of [...L.bays, L.apseAt]) b.add(new THREE.TorusGeometry(VR - 0.06, 0.07, 5, 20, Math.PI), C.rib, 0, L.clerestory, z, { sy: 0.55 });
  b.box(0.12, 0.1, d / 2 - L.apseAt, 0, L.clerestory + VR * 0.55 - 0.08, (d / 2 + L.apseAt) / 2, C.rib); // the ridge rib

  // The apse: a half circle of five wall panels behind the altar, each with
  // a tall window, under a half dome.
  const N = 5;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI + (i / N) * Math.PI, a1 = Math.PI + ((i + 1) / N) * Math.PI;
    const x0 = Math.cos(a0) * NV, z0 = L.apseAt + Math.sin(a0) * NV, x1 = Math.cos(a1) * NV, z1 = L.apseAt + Math.sin(a1) * NV;
    const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const ry = Math.atan2(-mx, L.apseAt - mz); // the panel faces the apse's centre
    const wall = new THREE.PlaneGeometry(len, L.clerestory).rotateY(ry).translate(mx, L.clerestory / 2, mz);
    b.add(wall, C.plaster);
    const inX = -mx / NV * 0.03, inZ = -(mz - L.apseAt) / NV * 0.03;
    pane(lancet(1.0, 3.8), mx + inX, 2.6, mz + inZ, ry);
  }
  const dome = new THREE.SphereGeometry(VR, 20, 8, Math.PI, Math.PI, 0, Math.PI / 2); // (the -z half)
  dome.scale(1, 0.55, 1);
  b.add(dome, C.vault, 0, L.clerestory, L.apseAt, { back: true });
  // The ends of the aisles beside the apse: a wall with a small side altar;
  // and the nave's walls from there to where the apse starts.
  for (const s of [-1, 1]) {
    b.add(new THREE.PlaneGeometry(L.sanctuary - L.apseAt, L.clerestory), C.plaster, s * (NV - 0.05), L.clerestory / 2, (L.sanctuary + L.apseAt) / 2, { ry: -s * Math.PI / 2 });
    b.add(new THREE.PlaneGeometry(AW - NV, L.aisleCeil), C.plaster, s * (AW + NV) / 2, L.aisleCeil / 2, L.sanctuary);
    const sx = s * (AW + NV) / 2;
    b.box(1.4, 0.62, 0.6, sx, 0.31, L.sanctuary + 0.35, C.marble);
    b.box(1.5, 0.04, 0.66, sx, 0.64, L.sanctuary + 0.35, C.cloth);
    b.box(0.5, 0.9, 0.1, sx, 1.6, L.sanctuary + 0.06, C.gold); // a small icon on the wall
    b.box(0.4, 0.75, 0.11, sx, 1.6, L.sanctuary + 0.06, s < 0 ? '#3a5fa0' : '#8a3a3a');
    for (const dx of [-0.5, 0.5]) {
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), C.cloth, sx + dx, 0.76, L.sanctuary + 0.4);
      b.add(new THREE.SphereGeometry(0.035, 5, 3).scale(1, 1.6, 1), '#ffc46b', sx + dx, 0.9, L.sanctuary + 0.4, { basic: true });
    }
  }

  // The sanctuary: one step up, raised floor, the altar rail in front.
  const P = L.platform;
  b.box(2 * NV, P, L.sanctuary - L.apseAt, 0, P / 2, (L.sanctuary + L.apseAt) / 2, C.marble);
  b.add(new THREE.CylinderGeometry(NV, NV, P, 20, 1, false, Math.PI / 2, Math.PI), C.marble, 0, P / 2, L.apseAt);
  b.box(2 * NV, P / 2, 0.4, 0, P / 4, L.sanctuary + 0.2, C.stone); // the step
  b.box(2 * NV, 0.08, 0.2, 0, 0.62, L.rail, C.marble); // the rail's top
  for (let x = -NV + 0.2; x <= NV - 0.15; x += 0.4) b.box(0.07, 0.56, 0.07, x, 0.3, L.rail, C.stoneDark);
  const zA = -d / 2, zB = L.rail + 0.15;
  block(0, (zA + zB) / 2, w, zB - zA); // the sanctuary is for the priest

  // The altar: white marble, a white cloth, two candles and a cross.
  const A = L.altar, top = P + A.h;
  b.box(A.w, A.h, A.d, A.x, P + A.h / 2, A.z, C.marble);
  b.box(A.w + 0.1, 0.03, A.d + 0.1, A.x, top + 0.015, A.z, C.cloth);
  b.box(A.w + 0.1, 0.24, 0.02, A.x, top - 0.1, A.z + A.d / 2 + 0.05, C.cloth); // the cloth hanging over the front
  b.box(A.w + 0.1, 0.03, 0.025, A.x, top - 0.23, A.z + A.d / 2 + 0.06, C.gold);
  b.box(0.5, 0.3, 0.02, A.x, P + 0.36, A.z + A.d / 2 + 0.01, C.gold); // a gold panel on its front
  const flames = [];
  for (const dx of [-0.85, 0.85]) {
    b.add(new THREE.CylinderGeometry(0.03, 0.06, 0.1, 8), C.gold, A.x + dx, top + 0.08, A.z - 0.25);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), C.cloth, A.x + dx, top + 0.29, A.z - 0.25);
    flames.push([A.x + dx, top + 0.5, A.z - 0.25]);
  }
  b.box(0.04, 0.36, 0.04, A.x + 0.5, top + 0.2, A.z - 0.32, C.gold); // a small altar cross (to one side: the priest's face stays in view)
  b.box(0.2, 0.04, 0.04, A.x + 0.5, top + 0.28, A.z - 0.32, C.gold);
  // A big wooden cross hanging over the altar, in front of the apse windows.
  const XZ = -14.3;
  b.box(0.2, 2.6, 0.1, 0, 4.6, XZ, C.wood);
  b.box(1.3, 0.2, 0.1, 0, 5.2, XZ, C.wood);
  b.box(0.06, 2.6, 0.12, 0, 4.6, XZ + 0.01, C.gold);
  for (const x of [-0.5, 0.5]) b.box(0.015, L.clerestory + 1.5 - 5.3, 0.015, x, (L.clerestory + 1.5 + 5.3) / 2, XZ, C.gold); // its chains
  // The lectern (ambo), with a book on its sloping top.
  const M = L.ambo;
  b.box(0.6, 0.72, 0.42, M.x, P + 0.36, M.z, C.wood);
  b.box(0.66, 0.05, 0.5, M.x, P + 0.76, M.z + 0.02, C.woodDark, { rx: -0.3 });
  b.box(0.36, 0.03, 0.26, M.x, P + 0.8, M.z + 0.04, C.red, { rx: -0.3 });
  b.box(0.3, 0.32, 0.02, M.x, P + 0.42, M.z + 0.22, C.gold);
  // Chairs for the priest and the servers by the apse wall.
  for (const [x, z] of [[0, -14.9], [-1.4, -14.5], [1.4, -14.5]]) {
    b.box(0.5, 0.06, 0.45, x, P + SEAT_H, z, C.wood);
    b.box(0.5, x === 0 ? 0.9 : 0.6, 0.06, x, P + SEAT_H + (x === 0 ? 0.45 : 0.3), z - 0.22, C.woodDark);
  }
  // The red sanctuary lamp, hanging on a chain.
  b.box(0.015, 3, 0.015, 2.6, P + 3.4, -12.4, C.gold);
  b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.18, 8), '#ff4a3a', 2.6, P + 1.85, -12.4, { basic: true });

  // The pews: on both sides of the middle aisle, facing the altar. Each row
  // half is one collider, thin enough to leave a walkway in front of it to
  // stand up into. A few already have people in them (the Mass, below).
  const seats = [], patrons = [];
  const PW = L.pews, len = PW.xs[PW.xs.length - 1] - PW.xs[0] + 0.8, xc = (PW.xs[0] + PW.xs[PW.xs.length - 1]) / 2;
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = 0; r < PW.rows; r++) {
    const rz = PW.z0 + r * PW.gap;
    for (const s of [-1, 1]) {
      const cx = s * xc;
      b.box(len, 0.07, 0.44, cx, SEAT_H - 0.035, rz, C.wood); // seat
      b.box(len, 0.5, 0.06, cx, SEAT_H + 0.27, rz + 0.25, C.wood); // back
      b.box(len, 0.05, 0.12, cx, SEAT_H + 0.53, rz + 0.25, C.woodDark); // the book shelf along its top
      for (const e of [-1, 1]) b.box(0.07, 0.86, 0.62, cx + e * len / 2, 0.43, rz + 0.06, C.woodDark); // the ends
      block(cx, rz + 0.1, len + 0.1, 0.5);
      for (const x of PW.xs) {
        const sx = s * x;
        // About one seat in five is taken (the front rows a little more).
        if (rand() < (r < 4 ? 0.3 : 0.18)) patrons.push({ x: sx, z: rz - 0.02, ry: Math.PI, sit: true });
        else seats.push({ x: sx, z: rz - 0.02, ry: Math.PI, stand: [sx, rz - 0.8] });
      }
    }
  }

  // The front: the door, the organ loft over it on two columns, the organ's
  // pipes against the wall, a rose window above, and holy water by the door.
  const F = d / 2;
  b.add(new THREE.PlaneGeometry(w, L.clerestory + NV * 0.55), C.plaster, 0, (L.clerestory + NV * 0.55) / 2, F, { ry: Math.PI });
  b.box(1.9, 2.5, 0.08, EXIT.x, 1.25, F - 0.05, C.woodDark);
  b.box(0.06, 2.4, 0.1, EXIT.x, 1.2, F - 0.1, C.wood);
  b.add(new THREE.CircleGeometry(0.95, 16, 0, Math.PI), C.woodDark, EXIT.x, 2.5, F - 0.05, { ry: Math.PI });
  const lz = L.loft.z, ly = L.loft.y;
  b.add(new THREE.PlaneGeometry(2 * NV + 0.4, F - lz).rotateX(Math.PI / 2), C.wood, 0, ly, (F + lz) / 2); // underside (seen from below)
  b.box(2 * NV + 0.4, 0.3, 0.12, 0, ly + 0.05, lz, C.woodDark); // its edge
  b.box(2 * NV + 0.4, 0.07, 0.12, 0, ly + 0.95, lz, C.woodDark); // the rail
  for (let x = -NV; x <= NV + 0.01; x += 0.46) b.box(0.05, 0.75, 0.05, x, ly + 0.55, lz, C.wood);
  for (const x of [-3.2, 3.2]) {
    b.add(new THREE.CylinderGeometry(0.2, 0.2, ly, 10), C.stone, x, ly / 2, lz + 0.3);
    block(x, lz + 0.3, 0.5, 0.5);
  }
  for (let i = 0; i < 17; i++) { // pipes: tallest in the middle, in two ranks
    const x = (i - 8) * 0.42, h = 3.6 - Math.abs(i - 8) * 0.28 + (i % 2) * 0.25;
    b.add(new THREE.CylinderGeometry(0.11, 0.11, h, 8), i % 2 ? C.pipe : C.pipeDark, x, ly + 0.9 + h / 2, F - 0.25 - (i % 2) * 0.25);
    b.add(new THREE.ConeGeometry(0.11, 0.18, 8), C.pipeDark, x, ly + 0.81, F - 0.25 - (i % 2) * 0.25, { rx: Math.PI });
  }
  b.box(4, 1.2, 0.5, 0, ly + 0.6, F - 0.6, C.woodDark); // the organ case's base
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshBasicMaterial({ map: roseTexture() }));
  rose.position.set(0, L.clerestory + 0.5, F - 0.04);
  rose.rotation.y = Math.PI;
  scene.add(rose);
  b.add(new THREE.TorusGeometry(1.36, 0.08, 5, 24), C.stone, 0, L.clerestory + 0.5, F - 0.05);
  for (const s of [-1, 1]) { // holy water fonts
    const x = s * 2.4, z = F - 2.6;
    b.add(new THREE.CylinderGeometry(0.08, 0.12, 0.62, 8), C.stone, x, 0.31, z);
    b.add(new THREE.CylinderGeometry(0.26, 0.14, 0.14, 12), C.marble, x, 0.68, z);
    b.add(new THREE.CircleGeometry(0.22, 12).rotateX(-Math.PI / 2), '#a9c6d8', x, 0.755, z);
    block(x, z, 0.5, 0.5);
  }
  // The confessional (L.confessional): a dark wooden booth, the priest's
  // door in the middle with a small cross over it, a purple curtain on
  // either side. You walk up to it (the station in front) to go in.
  const K = L.confessional, kf = K.x - K.w / 2; // kf: its front, facing the nave
  b.box(K.w, K.h, K.d, K.x, K.h / 2, K.z, C.woodDark);
  b.box(K.w + 0.12, 0.14, K.d + 0.16, K.x, K.h + 0.07, K.z, C.wood); // the cornice
  b.box(0.06, 0.46, 0.06, kf + 0.25, K.h + 0.37, K.z, C.gold); // the cross on top
  b.box(0.06, 0.06, 0.28, kf + 0.25, K.h + 0.46, K.z, C.gold);
  b.box(0.04, 1.95, 0.78, kf - 0.02, 0.975, K.z, C.wood); // the priest's door
  for (const dy of [0, 0.12, 0.24]) b.box(0.05, 0.03, 0.4, kf - 0.04, 1.45 + dy, K.z, C.woodDark); // its little grille
  b.box(0.05, 0.05, 0.03, kf - 0.05, 1.0, K.z - 0.28, C.gold); // its handle
  for (const e of [-1, 1]) {
    b.box(0.03, 1.85, 0.72, kf - 0.02, 1.0, K.z + e * 0.94, '#5b3a78'); // the curtains
    b.box(0.04, 0.04, 0.8, kf - 0.04, 1.95, K.z + e * 0.94, C.gold); // their rods
  }
  block(K.x, K.z, K.w, K.d);
  // Its name over the doors (Yozi: 고해성사실), with the English under it.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.36).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: confessionSign() }));
  sign.position.set(kf - 0.03, 2.17, K.z);
  scene.add(sign);

  // Brass lamps hanging down the nave, warm and glowing.
  for (const z of [-7.2, -1, 5.2]) for (const s of [-1, 1]) {
    const x = s * 2.2;
    b.box(0.02, 4, 0.02, x, L.clerestory + 0.5, z, C.gold);
    b.add(new THREE.CylinderGeometry(0.28, 0.14, 0.2, 8), C.gold, x, L.clerestory - 1.6, z);
    b.add(new THREE.SphereGeometry(0.16, 8, 5), '#ffe2a6', x, L.clerestory - 1.78, z, { basic: true });
  }

  b.flush(scene);
  scene.add(new THREE.Mesh(mergeGeometries(panes.map((g) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; })), glass));
  scene.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  // The two altar candles flicker (one small mesh each, not merged).
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffc46b' });
  const flameMeshes = flames.map(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4).scale(1, 1.8, 1), flameMat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  });
  let time = 0;
  const animate = (dt) => {
    time += dt;
    flameMeshes.forEach((m, i) => { m.scale.y = 1 + Math.sin(time * 9 + i * 2) * 0.12 + Math.sin(time * 23 + i) * 0.06; });
    altarLight.intensity = 14 + Math.sin(time * 7) * 0.6;
  };

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: EXIT,
    stations: { patrons, mass: { ...L }, confessional: [{ x: kf - 0.75, z: K.z }] },
    animate,
    // The camera stays inside the walls (and in front of the organ pipes).
    camBlocked: (x, z) => Math.abs(x) > AW - 0.3 || z > F - 0.8 || z < -d / 2 + 0.4,
    cathedral: true,
  };
}
