// Another Land's haunted house (귀신의 집): a small, cute ghost mansion in
// the theme park (outside: buildHauntedFacade, placed by themepark.js) and
// its own interior (buildHauntedHouse): a foyer, a portrait corridor whose
// eyes follow you, a ghost that rises at the corner, and the lantern room
// with the ghost-lantern game (ui/gallery-ui.js, haunt theme).
// Spooky but gentle: no gore, no flashes, no camera shake.
// Static parts are merged per colour to keep phones fast (see Batch).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Where the house stands in the park (themepark.js room metres). It faces
// -Z, into the park; you walk up to its door from the plaza side.
export const HAUNT = { x: -15, z: 24, w: 6.4, d: 4.4, h: 5.8, door: { w: 1.5, h: 2.2 } };
// Front wall at z ≈ 21.8; the door spot (and where you come back out) just
// in front of it, facing away from the house.
export const HAUNT_SPOT = { x: HAUNT.x, z: HAUNT.z - HAUNT.d / 2 - 1.4, ry: Math.PI };

// The interior as a virtual store (entered from the park, not the street).
export const HAUNT_STORE = {
  id: 'another-land-haunted-house',
  category: 'play',
  workshop: 'haunted-house',
  size: 'medium',
  name: { en: 'Haunted House', ko: '귀신의 집', ja: 'お化け屋敷', zh: '鬼屋', es: 'Casa encantada', id: 'Rumah Hantu', vi: 'Nhà ma', hi: 'भूतिया घर', fr: 'Maison hantée', th: 'บ้านผีสิง', ar: 'البيت المسكون' },
  tagline: {
    en: 'A cute ghost mansion in Another Land: portraits that watch you and a ghost-lantern game',
    ko: '어나더랜드의 귀여운 유령 저택: 나를 쳐다보는 초상화와 유령 랜턴 게임',
    ja: 'アナザーランドのかわいいお化け屋敷：見つめる肖像画とおばけランタンゲーム',
    zh: '另一乐园的可爱鬼屋：会盯着你的肖像画和幽灵灯笼游戏',
  },
  colors: { sign: '#8762ba', awning: '#d9c4ef', accent: '#3b2a52' },
  products: [],
};

// Sign text: Korean on the board by default, the player's language when
// signs are translated.
export const HAUNT_SIGN = HAUNT_STORE.name;

const C = {
  body: '#d9c4ef', base: '#735781', roofA: '#8762ba', roofB: '#a581d5', cream: '#fffaf3',
  door: '#4a2f5c', window: '#ffd5a0', ghost: '#fff6e6', pumpkin: '#f28a3a',
};

// Collects meshes and merges those that share a colour into one mesh, so a
// whole building is a handful of draw calls.
class Batch {
  constructor() { this.parts = new Map(); }
  add(geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, basic = false } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.clearGroups();
    const key = (basic ? 'b' : 'l') + color;
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
    return g;
  }
  box(sx, sy, sz, x, y, z, color, o) { return this.add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z, o); }
  flush(parent) {
    const meshes = [];
    for (const [key, geos] of this.parts) {
      const color = key.slice(1);
      const material = key[0] === 'b' ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, flatShading: true });
      const mesh = new THREE.Mesh(mergeGeometries(geos), material);
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

// A triangle (base w at y0, apex at (ax, y1)) extruded depth along z, centred.
function gable(w, y0, y1, depth, ax = 0) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, y0); s.lineTo(w / 2, y0); s.lineTo(ax, y1); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

// The sign over the door: one 512×128 canvas, high contrast, lilac border.
function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (text) => {
    const g = c.getContext('2d');
    g.fillStyle = '#c9a8ff'; g.fillRect(0, 0, 512, 128); // (opaque: no dark corners)
    g.fillStyle = '#5a3f86'; g.beginPath(); g.roundRect(10, 10, 492, 108, 32); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 70;
    const font = (s) => `900 ${s}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    g.font = font(size);
    while (g.measureText(text).width > 440 && size > 26) g.font = font(--size);
    g.lineWidth = 8; g.strokeStyle = '#2b1d40'; g.strokeText(text, 256, 68);
    g.fillStyle = '#fffaf3'; g.fillText(text, 256, 68);
    tex.needsUpdate = true;
  };
  return { tex, draw };
}
const signText = (lang) => (lang ? (HAUNT_SIGN[lang] || HAUNT_SIGN.en).toUpperCase() : HAUNT_SIGN.ko);

// A little ghost: ivory head and a skirt with a wavy hem, two dark eyes.
function ghostParts(b, x, y, z, s, ry = 0, eyeColor = C.door) {
  b.add(new THREE.SphereGeometry(0.5 * s, 10, 7), C.ghost, x, y + 0.45 * s, z, { basic: true });
  b.add(new THREE.CylinderGeometry(0.5 * s, 0.62 * s, 0.75 * s, 10, 1, true), C.ghost, x, y, z, { basic: true });
  for (let i = 0; i < 5; i++) { // wavy hem
    const a = (i / 5) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.16 * s, 6, 4), C.ghost, x + Math.sin(a) * 0.5 * s, y - 0.38 * s, z + Math.cos(a) * 0.5 * s, { basic: true });
  }
  for (const k of [-1, 1]) b.add(new THREE.SphereGeometry(0.075 * s, 6, 4), eyeColor, x + Math.cos(ry) * k * 0.17 * s + Math.sin(ry) * 0.44 * s, y + 0.52 * s, z + Math.cos(ry) * 0.44 * s - Math.sin(ry) * k * 0.17 * s, { basic: true });
}

// ── Outside: the little ghost mansion ────────────────────────────────────
// Root origin on the ground at the middle; local +Z is the front.
// Returns { group, setSignLang(lang|null) }.
export function buildHauntedFacade() {
  const group = new THREE.Group();
  const b = new Batch();
  const bw = 5.6, bd = 3.6, top = 3.2; // walls
  // Base and body.
  b.box(6, 0.3, 4, 0, 0.15, 0, C.base);
  b.box(bw, top - 0.3, bd, 0, 0.3 + (top - 0.3) / 2, 0, C.body);
  // Attic under the main roof: the ridge runs along x, pushed 0.25 m back.
  const RZ = -0.25, RY = 4.55;
  const attic = gable(bd, top, RY, bw, RZ).rotateY(Math.PI / 2); // (shape in z-y, extruded along x)
  attic.scale(1, 1, -1); // shape x → -z after the turn; flip back so the ridge sits at z = RZ
  b.add(attic, C.body);
  // Roof: two slabs, the front one lighter so the slope reads from above,
  // with two darker bands for the tiles.
  const slab = (z0, y0, z1, y1, color, bands) => {
    const len = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
    const zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
    b.box(6.6, 0.22, len + 0.1, 0, yc, zc, color, { rx: -a });
    let ny = Math.cos(a), nz = -Math.sin(a); // the slab's face normal…
    if (ny < 0) { ny = -ny; nz = -nz; } // …the one pointing up
    for (const f of bands) b.box(6.62, 0.08, 0.28, 0, y0 + (y1 - y0) * f + ny * 0.13, z0 + (z1 - z0) * f + nz * 0.13, color === C.roofB ? C.roofA : C.roofB, { rx: -a });
  };
  slab(2.35, 2.95, RZ, RY + 0.12, C.roofB, [0.3, 0.62]);
  slab(-2.35, 2.95, RZ, RY + 0.12, C.roofA, [0.3, 0.62]);
  b.box(6.7, 0.2, 0.3, 0, RY + 0.2, RZ, C.cream); // ridge cap
  // Cream eave band round the top of the walls.
  b.box(bw + 0.12, 0.22, bd + 0.12, 0, top - 0.05, 0, C.cream);

  // Front cross-gable over the door, a little proud of the wall.
  const GW = 3.1, GZ = bd / 2 + 0.25, GY = 4.85;
  b.box(GW - 0.2, top - 0.3, 0.5, 0, 0.3 + (top - 0.3) / 2, GZ - 0.25, C.body);
  b.add(gable(GW - 0.2, top - 0.1, GY - 0.15, 1.6).translate(0, 0, GZ - 0.8), C.body);
  const ga = Math.atan2(GY - top, GW / 2);
  for (const s of [-1, 1]) { // its roof: two short slabs and cream trim
    const len = Math.hypot(GW / 2 + 0.3, GY - top + 0.2);
    b.box(len, 0.2, 2.2, s * (GW / 4 + 0.08), (top + GY) / 2 + 0.12, GZ - 0.85, s < 0 ? C.roofB : C.roofA, { rz: -s * ga });
    b.box(len, 0.12, 0.14, s * (GW / 4 + 0.08), (top + GY) / 2 + 0.02, GZ + 0.26, C.cream, { rz: -s * ga });
  }
  // Door: an arch of short cream segments round a dark plum door.
  const DW = HAUNT.door.w, DH = HAUNT.door.h, R = DW / 2, DZ = GZ + 0.03, DS = DH - R;
  b.box(DW, DS, 0.08, 0, 0.3 + DS / 2, DZ, C.door);
  b.add(new THREE.CircleGeometry(R, 8, 0, Math.PI), C.door, 0, 0.3 + DS, DZ + 0.041);
  for (const s of [-1, 1]) b.box(0.24, DS, 0.2, s * (R + 0.12), 0.3 + DS / 2, DZ, C.cream);
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * Math.PI;
    b.box(0.24, (Math.PI * (R + 0.12)) / 6 + 0.04, 0.2, Math.cos(a) * (R + 0.12), 0.3 + DS + Math.sin(a) * (R + 0.12), DZ, C.cream, { rz: a });
  }
  b.box(0.08, 0.08, 0.06, 0.45, 0.3 + DS * 0.55, DZ + 0.06, C.window); // knob
  b.box(1.9, 0.12, 0.7, 0, 0.36, DZ + 0.25, C.cream); // step
  // Windows: a lit peach pane, dark bars, a cream frame and sill.
  const win = (x, y, z, ry = 0, w = 0.78, h = 0.95) => {
    const dx = Math.sin(ry) * 0.04, dz = Math.cos(ry) * 0.04;
    b.box(w + 0.2, h + 0.2, 0.08, x, y, z, C.cream, { ry });
    b.box(w, h, 0.08, x + dx, y, z + dz, C.window, { ry, basic: true });
    b.box(0.07, h, 0.06, x + dx * 2, y, z + dz * 2, C.door, { ry });
    b.box(w, 0.07, 0.06, x + dx * 2, y + 0.08, z + dz * 2, C.door, { ry });
    b.box(w + 0.36, 0.1, 0.2, x + dx, y - h / 2 - 0.12, z + dz, C.cream, { ry });
  };
  for (const s of [-1, 1]) win(s * 2.15, 1.75, bd / 2 + 0.02); // front, either side of the door
  for (const s of [-1, 1]) win(s * (bw / 2 + 0.02), 1.75, -0.2, s * Math.PI / 2); // one on each side
  for (const s of [-1, 1]) win(s * 1.4, 1.75, -bd / 2 - 0.02, Math.PI, 0.6, 0.75); // two small ones at the back

  // Sign over the door, the ghost beside it.
  const sign = signTexture();
  sign.draw(signText(null));
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.525), new THREE.MeshBasicMaterial({ map: sign.tex }));
  signMesh.position.set(0, 3.5, GZ + 0.09);
  group.add(signMesh);
  ghostParts(b, -0.8, 4.12, GZ + 0.3, 0.5);

  // The tower: an octagon at the back right, a little taller than the roof.
  const TX = 2.05, TZ = -1.25;
  b.add(new THREE.CylinderGeometry(0.72, 0.72, 2.4, 8), C.body, TX, 4, TZ);
  b.add(new THREE.CylinderGeometry(0.86, 0.86, 0.18, 8), C.cream, TX, 5.22, TZ);
  b.add(new THREE.ConeGeometry(0.95, 0.8, 8), C.roofA, TX, 5.7, TZ);
  b.add(new THREE.SphereGeometry(0.09, 6, 4), C.cream, TX, 6.1, TZ);
  win(TX, 4.8, TZ + 0.7, 0, 0.36, 0.48);

  // Two pumpkins by the door.
  for (const s of [-1, 1]) {
    const g = new THREE.SphereGeometry(0.34, 8, 5).scale(1.1, 0.72, 1.1);
    b.add(g, C.pumpkin, s * 1.45, 0.25, GZ + 0.55);
    b.box(0.07, 0.16, 0.07, s * 1.45, 0.55, GZ + 0.55, C.door);
  }
  b.flush(group);
  group.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });
  return { group, setSignLang: (lang) => sign.draw(signText(lang)) };
}

// ── Inside ───────────────────────────────────────────────────────────────
// 14 × 11 m (medium room). The way through: the foyer by the exit, round
// the end of a low partition into the portrait corridor, round the other
// end into the lantern room at the back.
export const PART_H = 1.5; // low partitions: the camera sees over them
export const LAYOUT = {
  a: { z: 1.5, x0: -7, x1: 3 }, // foyer | corridor, open on the right
  b: { z: -1.5, x0: -3, x1: 7 }, // corridor | lantern room, open on the left
  portraits: [4.6, 1.6, -1.4], // x, on partition b facing the corridor
  ghost: { x: -6.1, z: -2.7 }, // rises at the corner as you come round
  altar: { x: 0.5, z: -4.6 },
};

// Has the player reached the scare spots? (pure, unit-tested)
export const nearPortraits = (p) => p.z < LAYOUT.a.z && p.z > LAYOUT.b.z && p.x > -3.5;
export const ghostTrigger = (p) => p.z < LAYOUT.a.z - 0.3 && p.x < -2.4;

function boardTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lines) => {
    const g = c.getContext('2d');
    g.fillStyle = '#2b1d40'; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = '#c9a8ff'; g.lineWidth = 12; g.strokeRect(6, 6, 500, 308);
    // A ghost and a lantern.
    g.fillStyle = '#fff6e6';
    g.beginPath(); g.arc(110, 120, 52, Math.PI, 0); g.lineTo(162, 190);
    for (let i = 0; i < 4; i++) g.quadraticCurveTo(149 - i * 26, 210, 136 - i * 26, 190);
    g.closePath(); g.fill();
    g.fillStyle = '#2b1d40'; g.beginPath(); g.arc(92, 118, 8, 0, 7); g.arc(128, 118, 8, 0, 7); g.fill();
    g.fillStyle = '#ffd5a0'; g.fillRect(210, 110, 50, 70); g.fillStyle = '#4a2f5c'; g.fillRect(205, 100, 60, 12); g.fillRect(205, 178, 60, 12);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fffaf3';
    let ts = 44; do g.font = `900 ${ts--}px system-ui, sans-serif`; while (g.measureText(lines[0]).width > 210 && ts > 14);
    g.fillText(lines[0], 286, 145);
    g.textAlign = 'center';
    let s = 30; do g.font = `700 ${s--}px system-ui, sans-serif`; while (g.measureText(lines[1]).width > 470 && s > 12);
    g.fillText(lines[1], 256, 262);
    tex.needsUpdate = true;
  };
  return { tex, draw };
}
export const BOARD_TEXT = {
  title: HAUNT_SIGN,
  how: {
    en: 'Tap the ghosts your lantern finds →', ko: '랜턴에 나타나는 유령을 탭해요 →', ja: 'ランタンに現れるおばけをタップ →', zh: '点击灯笼照到的幽灵 →',
    es: 'Toca los fantasmas que encuentre tu farol →', id: 'Ketuk hantu yang ditemukan lenteramu →', vi: 'Chạm vào bóng ma mà đèn lồng tìm thấy →', hi: 'लालटेन में दिखे भूतों पर टैप करें →', fr: 'Touche les fantômes que ta lanterne trouve →', th: 'แตะผีที่โคมไฟส่องเจอ →', ar: '← انقر على الأشباح التي يجدها فانوسك',
  },
};

export function buildHauntedHouse(store, ROOM, EXIT) {
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#140f22');
  scene.add(new THREE.HemisphereLight(0xc6b2ff, 0x2a2038, 1.25));
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const lamp = new THREE.PointLight(0xffc98a, 9, 11);
  lamp.position.set(LAYOUT.altar.x, 2.2, LAYOUT.altar.z + 0.6);
  scene.add(lamp);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();

  // Floor: dark boards; walls face in (single-sided, like other rooms).
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), '#3a2a3e');
  for (let i = 1; i < 10; i++) b.box(w, 0.005, 0.03, 0, 0.003, -d / 2 + (i * d) / 10, '#2a1d2e');
  for (const [len, x, z, ry] of [[w, 0, -d / 2, 0], [d, -w / 2, 0, Math.PI / 2], [d, w / 2, 0, -Math.PI / 2], [w, 0, d / 2, Math.PI]]) {
    b.add(new THREE.PlaneGeometry(len, h), '#3b2a52', x, h / 2, z, { ry });
    b.add(new THREE.PlaneGeometry(len, 0.45), '#5a3f86', x + Math.sin(ry) * 0.01, 0.225, z + Math.cos(ry) * 0.01, { ry });
  }
  // Exit door and a green EXIT light over it.
  b.add(new THREE.PlaneGeometry(1.6, 2.4), C.door, EXIT.x, 1.2, d / 2 - 0.03, { ry: Math.PI });
  // (Flat and facing in, like the walls, so the camera behind you sees through.)
  b.add(new THREE.PlaneGeometry(1.1, 0.34), '#3ccf7a', EXIT.x, 2.75, d / 2 - 0.05, { ry: Math.PI, basic: true });
  b.add(new THREE.PlaneGeometry(0.7, 0.08), '#eafff1', EXIT.x, 2.75, d / 2 - 0.07, { ry: Math.PI, basic: true });

  // Low partitions with a cream cap.
  const part = ({ z, x0, x1 }) => {
    const len = x1 - x0, x = (x0 + x1) / 2;
    b.box(len, PART_H, 0.24, x, PART_H / 2, z, '#5a3f86');
    b.box(len + 0.06, 0.08, 0.32, x, PART_H + 0.04, z, '#d9c4ef');
    block(x, z, len, 0.3);
  };
  part(LAYOUT.a); part(LAYOUT.b);
  // Arrows on the floor: right in the foyer, left along the corridor, into the back room.
  const arrow = (x, z, ry) => b.add(new THREE.CircleGeometry(0.32, 3).rotateX(-Math.PI / 2), C.window, x, 0.02, z, { ry, basic: true });
  arrow(2.2, 3, 0); arrow(5, 1.9, Math.PI / 2); arrow(2, 0, Math.PI); arrow(-2, 0, Math.PI); arrow(-5, -1.2, Math.PI / 2); arrow(-3.4, -3.2, 0);
  // How-to board on the foyer side of partition a, facing the way in.
  const board = boardTexture();
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: board.tex }));
  boardMesh.position.set(-1.8, 1.6, LAYOUT.a.z + 0.3);
  scene.add(boardMesh);
  for (const x of [-2.8, -0.8]) b.box(0.1, 1.6, 0.1, x, 0.8, LAYOUT.a.z + 0.24, '#2a1d2e'); // posts behind the board

  // Portraits on the corridor side of partition b, sitting on the cap.
  const pc = document.createElement('canvas');
  pc.width = 128; pc.height = 160;
  const pg = pc.getContext('2d');
  pg.fillStyle = '#3d2a4f'; pg.fillRect(0, 0, 128, 160);
  pg.fillStyle = '#6c4e8a'; pg.beginPath(); pg.ellipse(64, 150, 50, 44, 0, Math.PI, 0); pg.fill(); // shoulders
  pg.fillStyle = '#e9d7c2'; pg.beginPath(); pg.ellipse(64, 72, 30, 36, 0, 0, 7); pg.fill(); // face
  pg.fillStyle = '#2b1d40'; pg.beginPath(); pg.ellipse(64, 46, 34, 20, 0, Math.PI, 0); pg.fill(); // hair
  pg.fillStyle = '#ffffff'; for (const ex of [52, 76]) { pg.beginPath(); pg.arc(ex, 72, 8, 0, 7); pg.fill(); } // eye whites (pupils are 3D)
  pg.strokeStyle = '#b4707a'; pg.lineWidth = 2; pg.beginPath(); pg.arc(64, 88, 7, 0.2, Math.PI - 0.2); pg.stroke();
  const ptex = new THREE.CanvasTexture(pc);
  ptex.colorSpace = THREE.SRGBColorSpace;
  const pgeo = [], PW = 0.8, PH = 1.0, PY = PART_H + 0.6, PZ = LAYOUT.b.z + 0.14;
  for (const x of LAYOUT.portraits) {
    b.box(PW + 0.18, PH + 0.18, 0.08, x, PY, PZ - 0.03, '#c79a45');
    b.box(0.08, 0.6, 0.08, x - 0.3, PART_H + 0.1, PZ - 0.06, '#c79a45');
    b.box(0.08, 0.6, 0.08, x + 0.3, PART_H + 0.1, PZ - 0.06, '#c79a45');
    pgeo.push(new THREE.PlaneGeometry(PW, PH).translate(x, PY, PZ + 0.015));
  }
  scene.add(new THREE.Mesh(mergeGeometries(pgeo), new THREE.MeshBasicMaterial({ map: ptex })));
  // Pupils: one mesh for all six, slid sideways to follow you.
  const pup = [];
  for (const x of LAYOUT.portraits) for (const ex of [-0.075, 0.075]) pup.push(new THREE.CircleGeometry(0.03, 8).translate(x + ex, PY + 0.05, PZ + 0.03));
  const pupils = new THREE.Mesh(mergeGeometries(pup), new THREE.MeshBasicMaterial({ color: '#1b1226' }));
  scene.add(pupils);

  // The lantern room: an altar with a big lantern and candles.
  const A = LAYOUT.altar;
  b.box(2.4, 0.9, 0.9, A.x, 0.45, A.z, '#4a3424');
  b.box(2.6, 0.08, 1.0, A.x, 0.94, A.z, '#6b4a33');
  block(A.x, A.z, 2.6, 1.1);
  b.box(0.5, 0.65, 0.5, A.x, 1.32, A.z, C.window, { basic: true }); // lantern glow
  b.box(0.62, 0.1, 0.62, A.x, 1.0, A.z, C.door);
  b.box(0.62, 0.1, 0.62, A.x, 1.69, A.z, C.door);
  for (const s of [-1, 1]) { b.box(0.06, 0.65, 0.06, A.x + s * 0.27, 1.32, A.z + 0.27, C.door); b.box(0.06, 0.65, 0.06, A.x + s * 0.27, 1.32, A.z - 0.27, C.door); }
  for (const dx of [-0.95, -0.7, 0.75, 1]) {
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6), C.cream, A.x + dx, 1.09, A.z + 0.15);
    b.add(new THREE.SphereGeometry(0.045, 5, 3).scale(1, 1.6, 1), '#ffc46b', A.x + dx, 1.25, A.z + 0.15, { basic: true });
  }
  // Pumpkins in the corners.
  for (const [x, z] of [[-6.2, -4.8], [6.2, -4.8], [6.2, 4.6], [-6.2, 4.6]]) {
    b.add(new THREE.SphereGeometry(0.34, 8, 5).scale(1.1, 0.72, 1.1), C.pumpkin, x, 0.25, z);
    b.box(0.07, 0.16, 0.07, x, 0.55, z, C.door);
    block(x, z, 0.8, 0.8);
  }
  b.flush(scene);
  scene.traverse((o) => { if (o.isMesh && o !== pupils) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  // The ghost at the corner: hidden under the floor until you come round.
  const gb = new Batch();
  ghostParts(gb, 0, 0, 0, 1.05, 0.3);
  const ghost = new THREE.Group();
  gb.flush(ghost);
  ghost.position.set(LAYOUT.ghost.x, -1.6, LAYOUT.ghost.z);
  scene.add(ghost);

  // One visit's scares (reset each time you come in; the scene is cached).
  const visit = { eyes: false, ghostAt: -1 };
  let time = 0;
  const built = {
    scene, products: [], colliders, seats: [], clerk: null, turntable: null, room: ROOM, exit: EXIT,
    stations: { hauntGallery: [{ x: A.x, z: A.z + 1.6, ry: Math.PI }] },
    haunted: true,
    onScare: null, // (kind) → sound, set by main.js
    resetVisit() { visit.eyes = false; visit.ghostAt = -1; ghost.position.y = -1.6; pupils.position.x = 0; },
    setSignLang(lang) { board.draw([signText(lang), BOARD_TEXT.how[lang || 'en'] || BOARD_TEXT.how.en]); },
    tick(dt, p) {
      time += dt;
      if (p) {
        if (nearPortraits(p)) {
          if (!visit.eyes) { visit.eyes = true; built.onScare?.('eyes'); }
          // Eyes follow you along the corridor (a few centimetres at most).
          const target = THREE.MathUtils.clamp((p.x - 1.6) * 0.01, -0.02, 0.02);
          pupils.position.x += (target - pupils.position.x) * Math.min(1, dt * 6);
        }
        if (visit.ghostAt < 0 && ghostTrigger(p)) { visit.ghostAt = time; built.onScare?.('ghost'); }
      }
      if (visit.ghostAt >= 0) {
        const k = Math.min(1, (time - visit.ghostAt) / 1.6), e = 1 - (1 - k) ** 3;
        ghost.position.y = -1.6 + e * 2.7 + (k >= 1 ? Math.sin(time * 1.8) * 0.12 : 0);
        ghost.rotation.y = Math.sin(time * 0.7) * 0.25;
      }
    },
  };
  built.setSignLang(null);
  return built;
}
