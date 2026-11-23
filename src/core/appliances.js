// Home appliances (Yozi 2026-11-22: the basics every home has, a fridge and a
// washing machine): sold at an appliance shop on Teheran-ro in Gangnam and placed
// with Decorate like the Euljiro furniture (core/furniture-shop.js format).
// Their doors open on hinges: every door is a group turned about its hinge
// (userData.door: the angle it opens to), so game/appliances.js only turns
// it. The fridge is hollow, with shelves, so what you keep in it shows when
// the door opens (fridgeSlots). The washer's drum (userData.drum) spins and
// the microwave's window (userData.window) lights up while they run.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const hinge = (g, x, y, z, open) => { const h = new THREE.Group(); h.position.set(x, y, z); h.userData.door = open; g.add(h); return h; };

// The fridge: a side-by-side (양문형) one, 0.92 m wide and 1.8 m tall.
const FW = 0.92, FD = 0.75, FH = 1.8, FDOOR = 0.05;
const FRONT = FD / 2 - FDOOR; // where the cabinet ends and the doors begin
const SHELF_Y = [0.1, 0.5, 0.88, 1.26]; // (the floor, then three glass shelves)
export const FRIDGE_MAX = 24; // things it holds
// Where the things inside stand (the piece's own frame): three a shelf on
// each side, the lowest shelves first.
export function fridgeSlots() {
  const out = [];
  for (const y of SHELF_Y) for (const side of [1, -1]) for (const k of [0, 1, 2]) out.push([side * (0.1 + k * 0.11), y + 0.006, FRONT - 0.2]);
  return out.slice(0, FRIDGE_MAX);
}

// [id, emoji, footprint [w, d], seat, name, build(g, part, box, glow)], as in furniture-shop.js.
export const APPLIANCES = [
  ['f-fridge', '🧊', [FW, FD], false, { en: 'Side-by-side fridge', ko: '양문형 냉장고', ja: '両開き冷蔵庫', zh: '对开门冰箱' }, (g, part, _box, glow) => {
    const shell = '#e3e7ea', liner = '#f7f9fa', doorC = '#c9ddd5'; // a soft sage front
    const back = -FD / 2, cab = FRONT - back;
    box(g, FW, 0.06, cab, 0, 0.03, back + cab / 2, '#9aa3a8'); // plinth
    box(g, FW, 0.04, cab, 0, FH - 0.02, back + cab / 2, shell); // top
    box(g, FW, 0.04, cab, 0, 0.08, back + cab / 2, shell); // floor
    for (const s of [-1, 1]) box(g, 0.04, FH, cab, s * (FW / 2 - 0.02), FH / 2, back + cab / 2, shell); // sides
    box(g, FW, FH, 0.04, 0, FH / 2, back + 0.02, shell); // back
    box(g, FW - 0.08, FH - 0.16, 0.01, 0, FH / 2, back + 0.045, glow('#f2f8ff')); // the lit inside
    box(g, 0.03, FH - 0.12, cab - 0.04, 0, FH / 2, back + cab / 2, liner); // freezer | fridge
    const glass = new THREE.MeshLambertMaterial({ color: '#dff1f7', transparent: true, opacity: 0.7 });
    for (const y of SHELF_Y.slice(1)) for (const s of [-1, 1]) box(g, FW / 2 - 0.06, 0.012, cab - 0.1, s * FW / 4, y, back + cab / 2 - 0.02, glass);
    // The doors: hinged at the outside edges, opening out to the sides.
    for (const s of [-1, 1]) {
      const d = hinge(g, s * FW / 2, 0, FRONT, s * -1.8), x = -s * FW / 4; // (door middle, in the hinge's frame)
      box(d, FW / 2 - 0.006, FH - 0.08, FDOOR, x, FH / 2 + 0.02, FDOOR / 2, doorC);
      box(d, 0.025, 0.55, 0.035, -s * (FW / 2 - 0.06), 1.05, FDOOR + 0.02, '#aab4b8'); // handle
      for (const y of [0.55, 1.05, 1.45]) box(d, FW / 2 - 0.12, 0.08, 0.07, x, y, -0.035, liner); // door bins
      if (s > 0) box(d, 0.12, 0.07, 0.006, x, 1.38, FDOOR + 0.003, glow('#7fd8ff')); // the little display
    }
  }],
  ['f-washer', '🧺', [0.65, 0.68], false, { en: 'Front-loading washer', ko: '드럼 세탁기', ja: 'ドラム式洗濯機', zh: '滚筒洗衣机' }, (g, part, _box, glow) => {
    const front = 0.3;
    box(g, 0.64, 0.86, 0.64, 0, 0.45, front - 0.32, '#f4f5f7');
    box(g, 0.64, 0.03, 0.03, 0, 0.02, front - 0.02, '#c0c4ca'); // kick plate
    box(g, 0.6, 0.12, 0.01, 0, 0.8, front + 0.005, '#d9dde2'); // control strip
    part(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16).rotateX(Math.PI / 2), '#c0c4ca', 0.18, 0.8, front + 0.02); // dial
    box(g, 0.14, 0.05, 0.006, -0.12, 0.8, front + 0.012, glow('#7fd8ff')); // display
    box(g, 0.12, 0.04, 0.02, -0.22, 0.81, front + 0.01, '#e8eaed'); // soap drawer
    // The drum behind the round window, with a little laundry in it.
    part(new THREE.CircleGeometry(0.19, 24), '#3b4450', 0, 0.42, front + 0.003);
    const drum = new THREE.Group();
    drum.position.set(0, 0.42, front + 0.006);
    drum.userData.drum = true;
    g.add(drum);
    for (const [a, c] of [[0, '#e86a6a'], [2.1, '#6aa8e8'], [4.2, '#f2d36a']]) {
      const sock = new THREE.Mesh(new THREE.CircleGeometry(0.055, 10), mat(c));
      sock.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0);
      sock.scale.set(1.4, 0.8, 1);
      drum.add(sock);
    }
    const d = hinge(g, -0.22, 0.42, front + 0.01, -1.7);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 28), mat('#c0c4ca'));
    ring.position.set(0.22, 0, 0.02);
    d.add(ring);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), new THREE.MeshLambertMaterial({ color: '#9ec4dc', transparent: true, opacity: 0.35 }));
    win.position.set(0.22, 0, 0.025);
    d.add(win);
    box(d, 0.03, 0.08, 0.03, 0.42, 0, 0.03, '#aab4b8'); // handle
  }],
  ['f-microwave', '♨️', [0.5, 0.38], false, { en: 'Microwave', ko: '전자레인지', ja: '電子レンジ', zh: '微波炉' }, (g, part, _box, glow) => {
    const front = 0.17;
    box(g, 0.5, 0.3, 0.34, 0, 0.15, 0, '#f0efea');
    box(g, 0.33, 0.22, 0.004, -0.06, 0.15, front + 0.001, '#4a4a48'); // the cavity, seen with the door open
    part(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 18).rotateX(Math.PI / 2), '#cfd8dc', -0.06, 0.13, front + 0.004); // turntable
    box(g, 0.13, 0.26, 0.01, 0.18, 0.15, front + 0.005, '#d9d8d2'); // control panel
    box(g, 0.08, 0.035, 0.006, 0.18, 0.24, front + 0.012, glow('#7fe0a0')); // clock
    for (const y of [0.17, 0.11, 0.05]) part(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 12).rotateX(Math.PI / 2), '#8a8f94', 0.18, y, front + 0.012);
    const d = hinge(g, -0.25, 0, front + 0.006, -1.5);
    box(d, 0.37, 0.26, 0.02, 0.185, 0.15, 0.01, '#f0efea');
    const win = box(d, 0.27, 0.18, 0.004, 0.17, 0.15, 0.022, '#2e3438');
    win.userData.window = true;
    box(d, 0.02, 0.16, 0.025, 0.34, 0.15, 0.03, '#c0c4ca'); // handle
  }],
];
export const APPLIANCE_KIND = { 'f-fridge': 'fridge', 'f-washer': 'washer', 'f-microwave': 'microwave' };
