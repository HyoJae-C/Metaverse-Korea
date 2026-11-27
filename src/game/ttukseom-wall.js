// Ttukseom's outdoor climbing wall, the whole place at 50% of the real one
// (real: 15 m high, 40 m wide; here 7.5 m and 20 m): the tall grey tower
// with its prow leaning out over the floor and a flat roof on top, the
// rock-shaped face beside it, the low wings with blue roofs, the dark rubber
// floor in a half circle and the red brick plaza round it. A thing to look
// at for now (game/climb-wall-near.js says so). In its own metres: the
// wall's back along x at z 0, its front towards +z.
import * as THREE from 'three';
import { mergeStatic } from '../core/merge-static.js';

const SHOW = 280; // m: drawn from here
const HOLD_COLORS = ['#e2533f', '#f2b632', '#3f8fd2', '#4caf6e', '#8e5bd0', '#f08a2c', '#f4f1e8', '#2b2d30'];

function rand(seed) { // (mulberry32: the same wall for everyone)
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The tower's front at height y (z), and its prow's (the darker panel that leans out most).
const towerZ = (y) => (y < 3 ? 1.4 + (0.2 * y) / 3 : y < 3.6 ? 1.6 + (0.8 * (y - 3)) / 0.6 : 2.4 + (2 * (y - 3.6)) / 3.4);
const prowZ = (y) => 1.5 + (3.4 * (y - 2.6)) / 4.4;
const TOWER = [-6, 2], PROW = [-4.5, 0.5], TOP = 7;

// A wall section: its side view (z, y) pulled along x from x0 to x1.
function prism(side, x0, x1) {
  const sh = new THREE.Shape(side.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); // (shape x → z, pulled towards −x)
  g.translate(x1, 0, 0);
  return g;
}

function rockGeometry(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d, 5, 12, 5);
  const p = g.attributes.position;
  const n = (x, y, z) => Math.sin(x * 5.1 + y * 2.3) * Math.cos(z * 4.7 - y * 3.1) + 0.5 * Math.sin(y * 7.3 + x * 3.9 + z * 2.1);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.16 * n(x, y, z);
    const taper = 1 - 0.18 * Math.max(0, y / h + 0.5 - 0.6); // (a little narrower near the top)
    p.setXYZ(i, (x + (Math.abs(x) > w / 2 - 0.01 ? Math.sign(x) * k : 0)) * taper, y + (y > h / 2 - 0.01 ? 0.5 * k + 0.25 * Math.sin(x * 3 + z * 2) : 0), z + (z > d / 2 - 0.01 ? k + 0.12 : 0));
  }
  const out = g.toNonIndexed();
  out.computeVertexNormals();
  return out;
}

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#2f6fa8'; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.strokeRect(8, 8, 496, 240);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 58px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  x.fillText('뚝섬 인공암벽장', 256, 70);
  x.font = '600 28px system-ui, sans-serif';
  x.fillText('Ttukseom Climbing Wall', 256, 128);
  x.fillStyle = '#ffe27a';
  x.font = '700 40px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  x.fillText('🚧 준비 중 · Opening soon', 256, 196);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeTtukseomWall() {
  const g = new THREE.Group();
  const mats = {};
  const m = (c, o) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(geo, mat); b.position.set(x, y, z); g.add(b); return b; };
  const box = (sx, sy, sz, x, y, z, c) => add(new THREE.BoxGeometry(sx, sy, sz), m(c), x, y, z);
  const PANEL = '#cdd0d4', PANEL2 = '#b3b8be', ROOF = '#7fa3bd', FASCIA = '#dcdee0', DARK = '#4a4d52';

  // The long low wall and the roofs of its two wings.
  box(20, 3.4, 1.4, 0, 1.7, 0.7, PANEL);
  box(4.6, 0.25, 2.4, -8.1, 3.52, 1.1, ROOF);
  box(6.6, 0.25, 2.4, 7.1, 3.52, 1.1, ROOF);
  box(4.7, 0.12, 2.5, -8.1, 3.36, 1.1, FASCIA);
  box(6.7, 0.12, 2.5, 7.1, 3.36, 1.1, FASCIA);
  // The tower, leaning out more the higher it goes, and the prow on its face.
  add(prism([[0, 0], [1.4, 0], [1.6, 3], [2.4, 3.6], [towerZ(TOP), TOP], [0, TOP]], TOWER[0], TOWER[1]), m(PANEL));
  add(prism([[1.5, 2.6], [prowZ(TOP), TOP], [1.5, TOP]], PROW[0], PROW[1]), m(PANEL2));
  // Its flat roof, wider than the tower.
  box(9.2, 0.36, 6, -2, TOP + 0.18, 2.6, FASCIA);
  box(9, 0.07, 5.8, -2, TOP + 0.4, 2.6, ROOF);
  // The rock face beside the tower.
  add(rockGeometry(2.3, 6.7, 2.3), m('#a4a9ad', { flatShading: true }), 3.2, 3.35, 1.25);
  // The dark rooms at the two ends, and the solar panels past the west one.
  box(1.8, 3.6, 2, 10.9, 1.8, 1, DARK);
  box(0.8, 1.9, 0.06, 10.9, 0.95, 2.03, '#eceef0');
  box(1.6, 3.4, 1.8, -10.8, 1.7, 0.9, DARK);
  const solar = box(4.2, 0.08, 2.4, -14.4, 1.7, 1.3, '#2c4a7a');
  solar.rotation.x = 0.5;
  for (const px of [-16, -12.8]) box(0.1, 1.7, 0.1, px, 0.85, 1.3, '#8a8f94');

  // The floor: red brick plaza, the dark rubber half circle under the wall
  // with its yellow line, and the low fence round it (open at the front).
  const half = (rx, rz, y, c) => { const d = add(new THREE.CircleGeometry(1, 40, Math.PI, Math.PI).rotateX(-Math.PI / 2), m(c, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0, y, 1.4); d.scale.set(rx, 1, rz); return d; };
  half(17, 12, 0.03, '#b9655a');
  half(10.5, 6.5, 0.05, '#3a3d42');
  const ring = (r0, r1, rx, rz, y, c) => { const d = add(new THREE.RingGeometry(r0, r1, 40, 1, Math.PI, Math.PI).rotateX(-Math.PI / 2), m(c, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0, y, 1.4); d.scale.set(rx, 1, rz); };
  ring(0.8, 0.83, 10.5, 6.5, 0.06, '#e8c531');
  ring(0.8, 0.83, 17, 12, 0.04, '#d79a8d'); // (a paler band in the bricks)
  const FENCE = '#2b2d30', N = 26;
  const at = (i) => { const a = (Math.PI * i) / N; return [10.9 * Math.cos(a), 1.4 + 6.9 * Math.sin(a)]; };
  for (let i = 0; i <= N; i++) {
    if (i === N / 2) continue; // the way in
    const [x, z] = at(i);
    box(0.07, 0.8, 0.07, x, 0.4, z, FENCE);
    if (i < N && i !== N / 2 - 1) {
      const [x1, z1] = at(i + 1), rail = box(Math.hypot(x1 - x, z1 - z), 0.05, 0.05, (x + x1) / 2, 0.76, (z + z1) / 2, FENCE);
      rail.rotation.y = -Math.atan2(z1 - z, x1 - x);
    }
  }
  // The small booth by the plaza, and the board that says it isn't open yet.
  box(1.6, 1.9, 1.4, 12.6, 0.95, 4.4, '#70757b');
  box(1.9, 0.14, 1.7, 12.6, 1.97, 4.4, '#8a8f94');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: signTexture() }));
  sign.position.set(-8.5, 1.5, 9.2);
  g.add(sign);
  box(2.3, 1.2, 0.06, -8.5, 1.5, 9.16, '#eceef0');
  for (const px of [-9.5, -7.5]) box(0.08, 1, 0.08, px, 0.5, 9.16, '#8a8f94');

  mergeStatic(g, [sign]);

  // The holds: one small shape, many colours, over the wall, the tower and the prow.
  const R = rand(8979), spots = [];
  for (let i = 0; i < 150; i++) { // the long wall (not behind the tower or the rock)
    const x = -9.6 + R() * 19.2, y = 0.35 + R() * 2.85;
    if ((x > TOWER[0] - 0.2 && x < TOWER[1] + 0.2) || (x > 1.9 && x < 4.5)) continue;
    spots.push([x, y, 1.42]);
  }
  for (let i = 0; i < 230; i++) { // the tower's face
    const x = TOWER[0] + 0.25 + R() * (TOWER[1] - TOWER[0] - 0.5), y = 0.35 + R() * (TOP - 0.7);
    const onProw = x > PROW[0] && x < PROW[1] && y > 2.6 && prowZ(y) > towerZ(y);
    spots.push([x, y, (onProw ? prowZ(y) : towerZ(y)) + 0.02]);
  }
  const holds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshLambertMaterial({ flatShading: true }), spots.length);
  const o = new THREE.Object3D(), col = new THREE.Color();
  spots.forEach(([x, y, z], i) => {
    o.position.set(x, y, z);
    o.rotation.set(R() * 3, R() * 3, R() * 3);
    o.scale.setScalar(0.7 + R() * 0.9);
    o.updateMatrix();
    holds.setMatrixAt(i, o.matrix);
    holds.setColorAt(i, col.set(HOLD_COLORS[Math.floor(R() * HOLD_COLORS.length)]));
  });
  g.add(holds);
  return g;
}

// What's in the way, as boxes in the wall's metres ([x0, z0, x1, z1], low: the camera sees over).
export const WALL_BLOCKS = [
  { r: [-11.6, 0, 11.8, 1.6] }, { r: [1.9, 1.6, 4.5, 2.6] }, // the wall, its end rooms, the rock's foot
  { r: [-16.6, 0.2, -12.2, 2.4], low: true }, { r: [11.8, 3.7, 13.4, 5.1], low: true }, { r: [-9.7, 9, -7.3, 9.4], low: true },
];

// game: { scene, collision, spot: { x, z, ry } }.
export function createTtukseomWall(game) {
  const { x, z, ry } = game.spot;
  const g = makeTtukseomWall();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  game.scene.add(g);
  const s = Math.sin(ry), c = Math.cos(ry);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  game.collision.add(WALL_BLOCKS.map(({ r: [x0, z0, x1, z1], low }) => ({ p: [W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1)], low })));
  return { group: g, update(d) { g.visible = d < SHOW; } };
}
