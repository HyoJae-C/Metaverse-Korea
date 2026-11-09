// Store interiors: a cosy room built from the store's data, with a display
// for each product. Each interior is its own scene.
import { listeningBar } from './listening-bar-model.js';
import { isDining } from './dining.js';
import * as THREE from 'three';
import { barStyleOf, decorateBar, seatPatron } from './bar-styles.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeAnimal } from './pets.js';
import { buildFurniture } from './furniture.js';
import { buildPark } from './park.js';
import { buildPoolHall } from './pool-hall.js';
import { POOL_ROOM } from './pool.js';
import { SHELF_SECTIONS } from './books.js';
import { buildHauntedHouse } from './haunted.js';
import { buildAquarium, AQUA_ROOM } from './aquarium.js';
import { SEA_ROOM, ZOO_PARK_ROOM, ZOO_PARK_EXIT } from './zoo-rooms.js';
import { buildCableCar, ROOM_CABLECAR } from './cablecar.js';
import { buildStation, buildTrainCar, HALL, CAR } from './subway.js';
import { PALETTES, LIP_FAMILIES } from '../data/appearance.js';
import { skirtDisplay } from './skirt-mesh.js';
import { buildGallery, ROOM_MUSEUM } from './museum.js';
import { buildCulture } from './culture.js';
import { buildMemorial, ROOM_MEMORIAL } from './war-memorial.js';
import { ROOM_DOME } from './dome-outside.js';
import { ACTIVITY_ROOMS, decorateActivityRoom } from './activity-rooms.js';

// Three lipsticks on each mirror shelf, from the shop's own colour family.
function lipProps(store) {
  const fam = LIP_FAMILIES[store.lipFamily] || ['camellia', 'pink', 'berry'];
  return [0, Math.floor(fam.length / 2), fam.length - 1].map((i) => '#' + PALETTES.lip[fam[i]].toString(16).padStart(6, '0'));
}

// Room sizes (metres). A store picks one with "size" in stores.json.
export const ROOM_SIZES = {
  small: { w: 9, d: 8, h: 3.6 },
  medium: { w: 14, d: 11, h: 4 },
  large: { w: 22, d: 16, h: 4.6 },
  runway: { w: 26, d: 40, h: 6 }, // Curve Runway (DDP): a long catwalk with seats either side
  hall: { w: 24, d: 20, h: 7 }, // DDP Hall: the bright lobby, the Curve Runway through its back door
  cinema: { w: 18, d: 18, h: 7 }, // a tall hall for the big screen
  park: { w: 52, d: 28, h: 8 }, // outdoor (see park.js)
  // Another Land (themepark.js): the rides round the central plaza, spread
  // out along walking paths, the roller coaster's land to the west and
  // north, the east promenade to the Ferris wheel and the drop tower, and
  // a longer Main Street from the gate. Not centred: x0..x1, z0..z1.
  themepark: { w: 132, d: 74, h: 8, x0: -70, x1: 62, z0: -40, z1: 34 },
  cablecar: ROOM_CABLECAR, // Namsan Sky Cable: lower station, slope and summit (see cablecar.js)
  station: HALL, // subway station hall (see subway.js)
  train: CAR, // inside a subway car
  museum: ROOM_MUSEUM, // the painting gallery (see museum.js)
  pool: POOL_ROOM, // Olympic Park Pool (see pool-hall.js)
  memorial: ROOM_MEMORIAL, // the War History Museum's exhibition floor (see war-memorial.js)
  dome: ROOM_DOME, // Seoul Another Dome, the baseball stadium (see dome.js)
  aquarium: AQUA_ROOM, // KONEXT Aquarium (see aquarium.js)
  zoosea: SEA_ROOM, // the zoo's Sea Animals hall (see zoo-sea-hall.js)
  zoo: ZOO_PARK_ROOM, // Children's Grand Park's zoo, the grounds (see zoo-park.js)
};
export const roomOf = (store) => ROOM_SIZES[store.size] || ROOM_SIZES.medium;
export const exitOf = (room) => ({ x: 0, z: (room.z1 ?? room.d / 2) - 0.9 });
// A room's walkable box (most rooms are centred on 0).
export const roomBox = (room) => ({ x0: room.x0 ?? -room.w / 2, x1: room.x1 ?? room.w / 2, z0: room.z0 ?? -room.d / 2, z1: room.z1 ?? room.d / 2 });
const SEAT_H = 0.38; // chair seat height, sized for the chibi characters
const COUNTER_H = 0.62; // shop counters: low enough to see the clerk's face over them
const BAR_H = 0.72; // bar counters (club, cocktail bar), with stools

const mats = {};
const mat = (c, opts) => (mats[c + JSON.stringify(opts || {})] ||= new THREE.MeshLambertMaterial({ color: c, ...opts }));

// The 2D cinema (Doodle Cinema): the hall looks hand-drawn, like a cartoon.
// Every surface gets one flat colour (no light or shade) and a black ink
// outline round each shape. `keep` (the screen) is left as it is.
const flatMats = new Map();
const INK = new THREE.LineBasicMaterial({ color: '#1b1820' });
const INK_RIM = new THREE.MeshBasicMaterial({ color: '#1b1820', side: THREE.BackSide });
function drawFlat(scene, keep) {
  const meshes = [];
  scene.traverse((o) => { if (o.isMesh && o !== keep) meshes.push(o); });
  for (const m of meshes) {
    const old = m.material;
    if (!old || Array.isArray(old) || old.isMeshBasicMaterial) continue; // (lights and screens already glow flat)
    const key = old.color?.getHexString() + (old.map?.uuid || '') + (old.transparent ? old.opacity : '') + old.side;
    // Pushed back a little in depth, so the ink lines on their edges always show.
    if (!flatMats.has(key)) flatMats.set(key, new THREE.MeshBasicMaterial({ color: old.color, map: old.map || null, transparent: old.transparent, opacity: old.opacity, side: old.side, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    m.material = flatMats.get(key);
    const g = m.geometry?.type;
    if (g === 'BoxGeometry') {
      // A bold outline: a slightly bigger black copy, seen only from inside
      // (its back faces), so it shows as a rim round the shape.
      const { width, height, depth } = m.geometry.parameters, t = 0.05;
      const rim = new THREE.Mesh(m.geometry, INK_RIM);
      rim.scale.set((width + 2 * t) / width, (height + 2 * t) / height, (depth + 2 * t) / depth);
      m.add(rim);
    }
    if (g === 'BoxGeometry' || g === 'PlaneGeometry') m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), INK));
  }
}

function floorTexture(base, room) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(90,60,40,0.18)';
  g.lineWidth = 2;
  for (let y = 0; y <= 128; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
    const off = (y / 32) % 2 ? 0 : 64;
    g.beginPath(); g.moveTo(off, y); g.lineTo(off, y + 32); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(room.w / 3, room.d / 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Small low-poly product models.
export function productModel(kind, color, product = null) {
  const g = new THREE.Group();
  const m = mat(color);
  const add = (geo, x = 0, y = 0, z = 0, mm = m) => {
    const mesh = new THREE.Mesh(geo, mm);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  switch (kind) {
    case 'tee': {
      add(new THREE.BoxGeometry(0.5, 0.55, 0.06), 0, 0.3);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.22, 0.18, 0.06), 0.3 * s, 0.48).rotation.z = 0.5 * s;
      add(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), 0, 0.6, 0, mat('#8a8f99'));
      break;
    }
    case 'jeans':
      add(new THREE.BoxGeometry(0.42, 0.12, 0.06), 0, 0.62);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.19, 0.55, 0.06), 0.11 * s, 0.3);
      break;
    case 'sneaker':
      add(new THREE.CapsuleGeometry(0.09, 0.2, 4, 8).rotateZ(Math.PI / 2), 0, 0.1);
      add(new THREE.BoxGeometry(0.38, 0.04, 0.16), 0, 0.03, 0, mat('#ffffff'));
      break;
    case 'bottle':
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 12), 0, 0.14);
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10), 0, 0.32, 0, mat('#ffffff'));
      break;
    case 'jar':
      add(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16), 0, 0.06);
      add(new THREE.CylinderGeometry(0.125, 0.125, 0.04, 16), 0, 0.14, 0, mat('#ffffff'));
      break;
    case 'lipstick':
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 10), 0, 0.07, 0, mat('#2b2230'));
      add(new THREE.CylinderGeometry(0.028, 0.03, 0.08, 10), 0, 0.18);
      break;
    case 'cap':
      add(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.02);
      add(new THREE.BoxGeometry(0.2, 0.02, 0.16), 0, 0.03, 0.18);
      break;
    case 'hat':
      add(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 14), 0, 0.08);
      add(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 18), 0, 0.02);
      break;
    case 'tote':
      add(new THREE.BoxGeometry(0.36, 0.4, 0.08), 0, 0.2);
      add(new THREE.TorusGeometry(0.1, 0.015, 4, 12, Math.PI), 0, 0.4);
      break;
    case 'plush':
      add(new THREE.SphereGeometry(0.15, 14, 10), 0, 0.15);
      for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.035, 0.12, 4, 8), 0.06 * s, 0.33);
      break;
    case 'ramyeon': // an instant-noodle pack: a red pillow bag with a yellow label
      add(new THREE.BoxGeometry(0.34, 0.07, 0.26), 0, 0.035);
      add(new THREE.BoxGeometry(0.16, 0.075, 0.12), -0.05, 0.036, 0.02, mat('#ffd166'));
      break;
    case 'picnicmat': // a rolled-up picnic mat with a white strap
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 12).rotateZ(Math.PI / 2), 0, 0.07);
      for (const sx of [-0.12, 0.12]) add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12).rotateZ(Math.PI / 2), sx, 0.07, 0, mat('#ffffff'));
      break;
    case 'frisbee': // a frisbee lying flat, with a white rim
      add(new THREE.CylinderGeometry(0.16, 0.14, 0.03, 20), 0, 0.03);
      add(new THREE.TorusGeometry(0.15, 0.014, 6, 20).rotateX(Math.PI / 2), 0, 0.04, 0, mat('#ffffff'));
      break;
    case 'egg': // a small tray of eggs
      add(new THREE.BoxGeometry(0.3, 0.04, 0.2), 0, 0.02, 0, mat('#d9c7a6'));
      for (const ex of [-0.09, 0, 0.09]) for (const ez of [-0.05, 0.05]) add(new THREE.SphereGeometry(0.04, 10, 8).scale(1, 1.3, 1), ex, 0.07, ez);
      break;
    case 'notebook':
      add(new THREE.BoxGeometry(0.3, 0.04, 0.4), 0, 0.02);
      add(new THREE.BoxGeometry(0.28, 0.035, 0.38), 0.01, 0.022, 0, mat('#ffffff'));
      break;
    case 'pen':
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8).rotateZ(Math.PI / 2), 0, 0.02, -0.06 + i * 0.06);
      break;
    case 'furniture': { // a lamp for your home (lighting shops), shrunk to fit the display
      const f = buildFurniture(product?.furniture);
      const box = new THREE.Box3().setFromObject(f), size = box.getSize(new THREE.Vector3());
      f.scale.setScalar(Math.min(1, 0.55 / Math.max(size.y, 0.01), 0.5 / Math.max(size.x, size.z, 0.01)));
      g.add(f);
      break;
    }
    case 'candle':
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), 0, 0.08, 0, mat('#ffffff', { transparent: true, opacity: 0.7 }));
      add(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16), 0, 0.06);
      break;
    case 'bread':
      add(new THREE.SphereGeometry(0.14, 12, 8).scale(1.3, 0.7, 1), 0, 0.08);
      break;
    case 'bowl': // a dish of food on a white plate
      add(new THREE.CylinderGeometry(0.17, 0.12, 0.08, 16), 0, 0.04, 0, mat('#ffffff'));
      add(new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), 0, 0.08);
      break;
    case 'bacon': // slices of raw meat on a plate
      add(new THREE.CylinderGeometry(0.19, 0.15, 0.04, 16), 0, 0.02, 0, mat('#ffffff'));
      for (let i = -1; i <= 1; i++) {
        add(new THREE.BoxGeometry(0.26, 0.03, 0.07), 0, 0.055 + (i + 1) * 0.012, i * 0.075);
        add(new THREE.BoxGeometry(0.26, 0.031, 0.015), 0, 0.055 + (i + 1) * 0.012, i * 0.075 + 0.01, mat('#fbeee4')); // fat stripe
      }
      break;
    case 'roll': // sliced gimbap
      for (let i = -1; i <= 1; i++) {
        add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12).rotateX(Math.PI / 2), i * 0.07, 0.06);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.052, 10).rotateX(Math.PI / 2), i * 0.07, 0.06, 0, mat('#fff8e8'));
      }
      break;
    case 'cup':
      add(new THREE.CylinderGeometry(0.08, 0.06, 0.2, 14), 0, 0.1);
      add(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 14), 0, 0.21, 0, mat('#ffffff'));
      break;
    case 'cocktail': // a stemmed glass with a coloured drink and a lemon slice
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 14), 0, 0.006, 0, mat('#e8f3f6', { transparent: true, opacity: 0.8 }));
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), 0, 0.07, 0, mat('#e8f3f6', { transparent: true, opacity: 0.8 }));
      add(new THREE.ConeGeometry(0.09, 0.11, 16).rotateX(Math.PI), 0, 0.185);
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10).rotateZ(Math.PI / 2), 0.085, 0.235, 0, mat('#f5d54a'));
      break;
    case 'skewer': // grilled skewers on a plate
      add(new THREE.CylinderGeometry(0.17, 0.12, 0.03, 16), 0, 0.015, 0, mat('#ffffff'));
      for (let i = -1; i <= 1; i++) {
        add(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6).rotateZ(Math.PI / 2), 0, 0.05, i * 0.07, mat('#d9c09a'));
        for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(0.06, 0.05, 0.05), k * 0.07, 0.05, i * 0.07);
      }
      break;
    case 'samgak': // triangle rice ball in its wrapper, a seaweed band
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 3).rotateX(Math.PI / 2), 0, 0.11, 0, mat('#fbfaf6'));
      add(new THREE.BoxGeometry(0.08, 0.1, 0.075), 0, 0.06);
      break;
    case 'milk': // a round little milk pot with a foil top
      add(new THREE.SphereGeometry(0.09, 12, 10).scale(1, 1.15, 1), 0, 0.1);
      add(new THREE.CylinderGeometry(0.035, 0.045, 0.06, 10), 0, 0.22);
      add(new THREE.CylinderGeometry(0.037, 0.037, 0.01, 10), 0, 0.255, 0, mat('#d9dde2'));
      break;
    case 'umbrella': // a furled umbrella standing on its tip
      add(new THREE.ConeGeometry(0.06, 0.5, 8).rotateX(Math.PI), 0, 0.3);
      add(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), 0, 0.6, 0, mat('#d9dde2'));
      add(new THREE.TorusGeometry(0.04, 0.012, 6, 10, Math.PI), 0.04, 0.66, 0, mat('#3b2a22'));
      break;
    case 'scarf':
      add(new THREE.TorusGeometry(0.13, 0.05, 8, 16), 0, 0.2).rotation.x = Math.PI / 2;
      break;
    case 'glasses': // round frames on a little stand
    case 'sunglasses': {
      const lens = kind === 'sunglasses' ? mat(color, { transparent: true, opacity: 0.85 }) : mat('#dff1f8', { transparent: true, opacity: 0.4 });
      const frame = kind === 'sunglasses' ? mat('#2b2230') : m;
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(0.07, 0.012, 6, 18), 0.085 * s, 0.14, 0, frame);
        add(new THREE.CircleGeometry(0.066, 18), 0.085 * s, 0.14, -0.002, lens);
        add(new THREE.BoxGeometry(0.012, 0.012, 0.16), 0.15 * s, 0.15, -0.08, frame); // arm
      }
      add(new THREE.BoxGeometry(0.04, 0.012, 0.012), 0, 0.15, 0, frame);
      add(new THREE.CylinderGeometry(0.02, 0.05, 0.08, 10), 0, 0.04, -0.06, mat('#fffaf0'));
      break;
    }
    case 'earrings': // a pair hanging from a small card
      add(new THREE.BoxGeometry(0.2, 0.22, 0.015), 0, 0.15, -0.02, mat('#fffaf0'));
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(0.035, 0.008, 6, 16), 0.05 * s, 0.13, 0.0);
        add(new THREE.SphereGeometry(0.014, 8, 6), 0.05 * s, 0.18, 0.0);
      }
      add(new THREE.CylinderGeometry(0.01, 0.05, 0.04, 10), 0, 0.02, -0.02, mat('#fffaf0'));
      break;
    case 'backpack':
      add(new THREE.CapsuleGeometry(0.13, 0.12, 4, 10).scale(1.1, 1, 0.7), 0, 0.22);
      add(new THREE.BoxGeometry(0.16, 0.1, 0.04), 0, 0.16, 0.1, mat('#fffaf0'));
      break;
    case 'beanie':
      add(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.02);
      add(new THREE.SphereGeometry(0.04, 8, 6), 0, 0.18, 0, mat('#fff8ec'));
      break;
    case 'beret':
      add(new THREE.SphereGeometry(0.17, 14, 8).scale(1, 0.32, 1), 0, 0.06);
      break;
    case 'skirt': { // the skirt itself, in its pattern (core/skirt-mesh.js)
      const sk = skirtDisplay(product?.skirt);
      if (sk) g.add(sk);
      else add(new THREE.CylinderGeometry(0.16, 0.26, 0.4, 16, 1, true), 0, 0.4);
      add(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), 0, 0.72, 0, mat('#8a8f99'));
      break;
    }
    case 'ribbon':
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 10, 8).scale(1.3, 0.9, 0.6), 0.07 * s, 0.1);
      add(new THREE.SphereGeometry(0.03, 8, 6), 0, 0.1);
      break;
    default:
      add(new THREE.BoxGeometry(0.25, 0.25, 0.25), 0, 0.12);
  }
  return g;
}

const HANGING = new Set(['tee', 'jeans', 'scarf', 'skirt']);

// Shrink the font until the text fits the canvas width (long shop names).
function fitText(g, text, size, maxW, weight = 800) {
  let px = size;
  const set = () => { g.font = `${weight} ${px}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`; };
  set();
  while (px > 18 && g.measureText(text).width > maxW) { px -= 2; set(); }
}

// A small sign: white text on a coloured plate.
function labelTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 84;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffffff';
  fitText(g, text, 52, c.width - 32);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A dartboard face: 20 black/cream wedges, red/green double and triple
// rings and the bull (the game itself is drawn in ui/darts-ui.js).
function dartboardTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), C = 128, R = 104;
  g.fillStyle = '#1b1b20'; g.fillRect(0, 0, 256, 256);
  const ring = (r0, r1, cols) => {
    for (let i = 0; i < 20; i++) {
      const a0 = -Math.PI / 2 - Math.PI / 20 + (i * Math.PI) / 10, a1 = a0 + Math.PI / 10;
      g.fillStyle = cols[i % 2];
      g.beginPath(); g.arc(C, C, r1 * R, a0, a1); g.arc(C, C, r0 * R, a1, a0, true); g.closePath(); g.fill();
    }
  };
  ring(0.95, 1, ['#d9473c', '#2f8f5b']);
  ring(0.63, 0.95, ['#1b1b20', '#f3e6c4']);
  ring(0.58, 0.63, ['#d9473c', '#2f8f5b']);
  ring(0.09, 0.58, ['#1b1b20', '#f3e6c4']);
  g.fillStyle = '#2f8f5b'; g.beginPath(); g.arc(C, C, 0.09 * R, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d9473c'; g.beginPath(); g.arc(C, C, 0.04 * R, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Seoul Another Dome's stadium (core/dome.js) is loaded on the first visit:
// main.js imports it, hands its builder over here, then builds the room.
let domeBuilder = null;
export const setDomeBuilder = (fn) => { domeBuilder = fn; };
export const needsDome = (store) => store?.workshop === 'dome' && !domeBuilder;
// Another Land (themepark.js, with its coaster and bumper rink) the same way.
let parkBuilder = null;
export const setParkBuilder = (fn) => { parkBuilder = fn; };
export const needsPark = (store) => store?.workshop === 'themepark' && !parkBuilder;
// The zoo (zoo-park.js: the grounds, and the Sea Animals hall inside) too.
let zooBuilders = null;
export const setZooBuilders = (m) => { zooBuilders = m; };
export const needsZoo = (store) => (store?.workshop === 'zoo' || store?.workshop === 'zoo-sea') && !zooBuilders;

// Builds the room. Returns { scene, products: [{ product, mesh, pos }],
// colliders, seats: [{ x, z, ry, stand: [x, z] }], room, exit }.
export function buildInterior(store) {
  const ROOM = roomOf(store);
  const EXIT = exitOf(ROOM);
  if (store.workshop === 'themepark') return parkBuilder(store, ROOM, EXIT);
  if (store.workshop === 'pool') return buildPoolHall(store, ROOM, EXIT);
  if (store.workshop === 'dome') return domeBuilder(store, ROOM, EXIT);
  if (store.workshop === 'haunted-house') return buildHauntedHouse(store, ROOM, EXIT);
  if (store.workshop === 'aquarium') return buildAquarium(store, ROOM, EXIT);
  if (store.workshop === 'zoo-sea') return zooBuilders.buildSeaHall(store, ROOM, EXIT);
  if (store.workshop === 'zoo') return zooBuilders.buildZooPark(store, ROOM, ZOO_PARK_EXIT);
  if (store.workshop === 'cablecar') return buildCableCar(store, ROOM, EXIT);
  if (store.category === 'park') return buildPark(store, ROOM, EXIT);
  if (store.category === 'station') return buildStation(store, ROOM);
  if (store.category === 'train') return buildTrainCar(store, ROOM);
  const scene = new THREE.Scene();
  const accent = new THREE.Color(store.colors.accent);
  // A club or a bar is dark inside, lit by its own lamps (added below).
  const night = store.category === 'club' || store.category === 'bar' || !!store.cinema || store.workshop === 'runway' || store.workshop === 'pcbang'; // (the runway: a dark show room; the PC방 glows with its screens)
  const cozy = store.workshop === 'tarot'; // a tarot café: dim and warm, lit by its table lamps
  scene.background = night ? new THREE.Color(store.category === 'club' ? '#0e0a18' : store.cinema ? '#0c0b10' : store.workshop === 'runway' ? '#16141c' : store.workshop === 'pcbang' ? '#0d0e17' : '#1a120d') : accent.clone().multiplyScalar(0.92);
  scene.add(night ? new THREE.HemisphereLight(0xc9b8ff, 0x2a2030, store.category === 'club' ? 0.9 : 0.8) : new THREE.HemisphereLight(0xfff6e8, 0xd9c7b0, cozy ? 1.05 : 1.7));
  scene.add(new THREE.AmbientLight(0xfff0e0, night ? 0.3 : 0.6));
  const lamp = new THREE.PointLight(0xffe2b8, night ? 6 : cozy ? 10 : 25, Math.max(18, ROOM.w * 1.2));
  lamp.position.set(0, ROOM.h - 0.4, 0);
  scene.add(lamp);

  const { w, d, h } = ROOM;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: floorTexture(store.category === 'fashion' ? '#e9e2d6' : store.cinema === 'doodle' ? '#6f62a8' : store.workshop === 'runway' ? '#2a2733' : store.workshop === 'ddp-hall' ? '#e4e6ea' : night ? '#3a2c26' : cozy ? '#9a6a48' : '#d9b48c', ROOM) }),
  );
  scene.add(floor);

  // Walls face inward (single-sided, so the camera can see in from outside).
  const wallMat = new THREE.MeshLambertMaterial({ color: store.colors.accent, side: THREE.FrontSide });
  const trimMat = mat(store.colors.awning);
  const wall = (len, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    scene.add(m);
    const trim = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.5), trimMat);
    trim.position.set(x, 0.25, z);
    trim.rotation.y = ry;
    trim.position.add(new THREE.Vector3(Math.sin(ry) * 0.01, 0, Math.cos(ry) * 0.01));
    scene.add(trim);
  };
  wall(w, 0, -d / 2, 0);
  wall(d, -w / 2, 0, Math.PI / 2);
  wall(d, w / 2, 0, -Math.PI / 2);
  wall(w, 0, d / 2, Math.PI);

  // Exit door on the front wall (none upstairs in the museums).
  const noExit = (store.category === 'museum' || store.category === 'memorial') && store.floor > 1;
  // One-sided and facing in, like the walls, so a camera behind the player
  // (outside the front wall) looks through it instead of at a dark slab.
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshLambertMaterial({ color: store.colors.sign }));
  door.rotation.y = Math.PI;
  door.position.set(EXIT.x, 1.2, d / 2 - 0.03);
  if (!noExit) scene.add(door);
  const mat2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1).rotateX(-Math.PI / 2), mat(store.colors.awning));
  mat2.position.set(EXIT.x, 0.01, d / 2 - 0.6);
  if (!noExit) scene.add(mat2);

  // Name on the back wall.
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = store.colors.sign;
  const nameText = `${store.name.ko} · ${store.name.en}`;
  fitText(g, nameText, 124, c.width - 40);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(nameText, 512, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const tw = Math.min(10, w - 1, (h - 2.55) * 6.4), th = tw / 6.4; // stays above the big mirrors
  const title = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  title.position.set(0, h - 0.15 - th / 2, -d / 2 + 0.02);
  if (store.category !== 'home' && store.category !== 'memorial' && !store.cinema) scene.add(title); // the cinema's back wall is its screen

  const colliders = [];
  const box = (sx, sy, sz, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const block = (x, z, sx, sz) => colliders.push({
    p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]],
  });

  // Product displays along the back and side walls.
  const products = [];
  // Back wall first, then the side walls; scaled to the room.
  const bz = -d / 2 + 1.3, sx = w / 2 - 0.8;
  const nBack = Math.max(2, Math.min(5, Math.floor((w - 2) / 3)));
  const spots = [];
  for (let i = 0; i < nBack; i++) spots.push([(i - (nBack - 1) / 2) * 3, bz, 0]);
  for (const sz of [-d * 0.1, d * 0.18]) spots.push([-sx, sz, Math.PI / 2], [sx, sz, -Math.PI / 2]);
  // Club and bar: the drinks stand on the bar counter instead (see below).
  const counterSpots = store.category === 'club'
    ? [-1.2, 0.3, 1.8, 3.3].map((z) => [w / 2 - 1.4, z, -Math.PI / 2])
    : store.category === 'bar' ? [-3.6, -1.2, 1.2, 3.6].map((x) => [x, -d / 2 + 2.2, 0]) : null;
  // Restaurants with a menu: nothing on display, you order at your table.
  // META COFFEE, bars and clubs: you order from the staff instead (no displays).
  const counterMenu = store.takeaway || store.category === 'bar' || store.category === 'club';
  // "displays": n puts each product on several stands (busy shops, so that
  // visitors spread out instead of crowding one table).
  const shown = store.displays > store.products?.length
    ? Array.from({ length: Math.min(spots.length, store.displays | 0) }, (_, i) => store.products[i % store.products.length])
    : store.products;
  (isDining(store) || counterMenu ? [] : shown).forEach((product, i) => {
    if (counterSpots) { // on the counter: just the drink, no table
      const [x, z, ry] = counterSpots[i % counterSpots.length];
      const spot = new THREE.Group();
      spot.position.set(x, BAR_H + 0.03, z);
      spot.rotation.y = ry;
      const model = productModel(product.model, product.color, product);
      model.scale.setScalar(1.6);
      spot.add(model);
      scene.add(spot);
      const front = new THREE.Vector3(0, 0, 1.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, 0, z));
      products.push({ product, mesh: spot, pos: front });
      return;
    }
    const [x, z, ry] = spots[i % spots.length];
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);
    stand.rotation.y = ry;
    scene.add(stand);
    const hanging = HANGING.has(product.model);
    if (hanging) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8).rotateZ(Math.PI / 2), mat('#8a8f99'));
      rail.position.y = 1.85;
      stand.add(rail);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.85, 8), mat('#8a8f99'));
        post.position.set(0.8 * s, 0.93, 0);
        stand.add(post);
      }
    } else {
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.8), mat('#fffaf0'));
      table.position.y = 0.45;
      stand.add(table);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.86), mat(store.colors.awning));
      top.position.y = 0.92;
      stand.add(top);
    }
    const petKind = product.model.startsWith('pet:') ? product.model.slice(4) : null;
    // Pet shop: one animal sitting on a cushion on the table.
    const model = petKind ? makeAnimal(petKind, product.color, product.accent || '#fff4e6').root : productModel(product.model, product.color, product);
    if (petKind) {
      model.rotation.y = 0;
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.06, 18), mat(store.colors.awning));
      cushion.position.y = 0.98;
      stand.add(cushion);
    }
    model.scale.setScalar(petKind ? 1 : hanging ? 1.4 : 1.8);
    model.position.y = petKind ? 1.01 : 0.95;
    stand.add(model);
    // A second and third copy make the display look stocked.
    if (!petKind) for (const s of [-1, 1]) {
      const copy = productModel(product.model, product.color, product);
      copy.scale.setScalar(hanging ? 1.3 : 1.4);
      copy.position.set(0.5 * s, 0.95, hanging ? -0.05 : 0.1);
      stand.add(copy);
    }
    const front = new THREE.Vector3(0, 0, 1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(stand.position);
    products.push({ product, mesh: stand, pos: front });
    const ext = hanging ? [1.8, 0.6] : [1.6, 0.9];
    const [cx, cz] = Math.abs(Math.sin(ry)) > 0.5 ? [ext[1], ext[0]] : ext;
    block(x, z, cx, cz);
  });

  // Category extras.
  const seats = [];
  let clerk = null; // where the shop clerk stands (behind the counter)
  let trainer = null; // the gym's personal trainer (an NPC to talk to)
  let barkeep = null; // a club's bartender (the clerk there is the DJ)
  const stations = {}; // minigame spots: { karaoke|photo|claw|sauna: [{ x, z }] }
  let animate = null; // per-frame animation (club lights), called while inside
  let see = null; // (x, z) each frame: rooms you can walk into turn see-through
  let camBlocked = null; // (x, z) → true where the camera must not go (main.js)
  if (store.category === 'library') {
    // Tall bookshelves along the back and side walls, reading tables in the
    // middle (seats below), and a "quiet please" sign. Study content comes later.
    const spines = ['#b5533c', '#3f6e8c', '#d9a441', '#5f8a4e', '#7a4f8c', '#e3d6c0', '#2f3e4f', '#c97b63'];
    // The shelves are split into sections (Learn Korean, children's
    // stories, short stories, poetry), each a run of neighbouring shelves
    // named on a board on top.
    const shelf = (x, z, ry, len, section) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      scene.add(g);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(len, 2.4, 0.45), mat('#8a5a3a'));
      frame.position.y = 1.2;
      g.add(frame);
      for (let row = 0; row < 4; row++) {
        let bx = -len / 2 + 0.12;
        let k = row * 3 + Math.round((x + z) * 7);
        while (bx < len / 2 - 0.15) {
          const bw = 0.07 + ((k * 37) % 5) * 0.015, bh = 0.34 + ((k * 13) % 4) * 0.04;
          const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.3), mat(spines[Math.abs(k) % spines.length]));
          b.position.set(bx + bw / 2, 0.22 + row * 0.56 + bh / 2, 0.1);
          g.add(b);
          bx += bw + 0.01;
          k++;
        }
      }
      const lc = document.createElement('canvas');
      lc.width = 512; lc.height = 112;
      const lg = lc.getContext('2d');
      lg.fillStyle = '#fffaf0'; lg.fillRect(0, 0, 512, 112);
      lg.fillStyle = '#4a3326'; lg.textAlign = 'center'; lg.textBaseline = 'middle';
      lg.font = '800 46px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
      lg.fillText(`${section.icon} ${section.name.ko}`, 256, 40);
      lg.font = '700 26px system-ui, sans-serif';
      lg.fillText(section.name.en, 256, 88);
      const ltex = new THREE.CanvasTexture(lc);
      ltex.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.48), new THREE.MeshBasicMaterial({ map: ltex }));
      label.position.set(0, 2.66, 0.2);
      g.add(label);
      const [cx, cz] = Math.abs(Math.sin(ry)) > 0.5 ? [0.6, len] : [len, 0.6];
      block(x, z, cx, cz);
    };
    // Going round the room: left wall (front to back), back wall (left to
    // right), right wall (back to front), so each section is one stretch.
    const nBack = Math.max(2, Math.floor((w - 2) / 2.6));
    const nSide = Math.max(1, Math.floor((d - 5) / 2.6));
    const spots = [];
    for (let i = nSide - 1; i >= 0; i--) spots.push({ x: -w / 2 + 0.45, z: -d / 2 + 2.2 + i * 2.6, ry: Math.PI / 2, sx: -(w / 2 - 1.3) });
    for (let i = 0; i < nBack; i++) spots.push({ x: (i - (nBack - 1) / 2) * 2.6, z: -d / 2 + 0.45, ry: 0, sz: -d / 2 + 1.3 });
    for (let i = 0; i < nSide; i++) spots.push({ x: w / 2 - 0.45, z: -d / 2 + 2.2 + i * 2.6, ry: -Math.PI / 2, sx: w / 2 - 1.3 });
    stations.books = []; // pick a book here: { x, z, section }
    spots.forEach((sp, i) => {
      const section = SHELF_SECTIONS[Math.floor((i * SHELF_SECTIONS.length) / spots.length)];
      shelf(sp.x, sp.z, sp.ry, 2.4, section);
      stations.books.push({ x: sp.sx ?? sp.x, z: sp.sz ?? sp.z, section: section.id });
    });
    // Long reading tables with chairs on both long sides.
    // Rows 3.4 m apart so there's an aisle between one row's chair backs
    // and the next table: you stand up into it without getting stuck.
    const ROW = 3.4;
    const rows = Math.max(1, Math.floor((d - 5) / ROW));
    for (let r = 0; r < rows; r++) {
      const tz = -d / 2 + 2.6 + r * ROW;
      const tl = Math.min(4.2, w - 4.5);
      box(tl, 0.06, 1.0, 0, 0.62, tz, '#c98b4f');
      for (const lx of [-tl / 2 + 0.2, tl / 2 - 0.2]) box(0.1, 0.62, 0.8, lx, 0.31, tz, '#8a5a3a');
      box(0.18, 0.3, 0.18, -tl / 4, 0.8, tz, '#f2d27a'); // reading lamps
      box(0.18, 0.3, 0.18, tl / 4, 0.8, tz, '#f2d27a');
      const n = Math.max(1, Math.floor(tl / 1.2));
      for (let i = 0; i < n; i++) {
        const cx = (i - (n - 1) / 2) * 1.2;
        for (const s of [-1, 1]) {
          const cz = tz + 0.8 * s;
          box(0.42, 0.06, 0.42, cx, SEAT_H - 0.03, cz, store.colors.awning);
          box(0.42, 0.5, 0.08, cx, SEAT_H + 0.22, cz + 0.2 * s, store.colors.awning);
          seats.push({ x: cx, z: cz + 0.04 * s, ry: s > 0 ? Math.PI : 0, stand: [cx, tz + 1.35 * s] });
        }
      }
      block(0, tz, tl + 0.2, 1.2); // the table itself; chairs can be walked past
    }
    // Front desk by the door, and the sign above it.
    const cx = Math.min(3.6, sx - 2), cz = d / 2 - 2.3;
    box(2.2, COUNTER_H, 0.8, cx, COUNTER_H / 2, cz, '#fffaf0');
    box(0.5, 0.06, 0.35, cx - 0.4, COUNTER_H + 0.03, cz, '#3f6e8c'); // a book on the desk
    block(cx, cz, 2.2, 0.8);
    clerk = { x: cx, z: cz + 0.75, ry: Math.PI };
    const sc = document.createElement('canvas');
    sc.width = 512; sc.height = 128;
    const sg = sc.getContext('2d');
    sg.fillStyle = '#fffaf0'; sg.fillRect(0, 0, 512, 128);
    sg.fillStyle = store.colors.sign;
    sg.font = '800 54px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillText('🤫 쉿! 조용히 · Quiet, please', 256, 66);
    const stex = new THREE.CanvasTexture(sc);
    stex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: stex }));
    sign.position.set(-w / 2 + 0.05, Math.max(2.9, h - 0.5), 0); // above the shelf boards
    sign.rotation.y = Math.PI / 2;
    scene.add(sign);
  } else if (store.category === 'museum') {
    // Old Korean paintings on the walls, benches, and a docent at the desk.
    const gallery = buildGallery(scene, ROOM, { box, block, mat }, store.floor || 1);
    stations.paintings = gallery.looks;
    stations.lift = gallery.lift;
    seats.push(...gallery.seats);
    clerk = gallery.clerk;
    see = gallery.see;
  } else if (store.category === 'memorial') {
    // The War History Museum: photos, the memorial room and its altar.
    const hall = buildMemorial(scene, ROOM, { box, block, mat }, store.floor || 1);
    stations.paintings = hall.looks;
    stations.lift = hall.lift;
    stations.panels = hall.panels;
    stations.flower = hall.flower;
    stations.layFlower = hall.layFlower;
    seats.push(...hall.seats);
    clerk = hall.clerk;
    see = hall.see;
  } else if (store.category === 'culture') {
    // Seoul Forest's culture center and forest galleries (core/culture.js).
    const room = buildCulture(scene, ROOM, { box, block, mat }, store);
    seats.push(...room.seats);
    clerk = room.clerk;
  } else if (store.category === 'school') {
    // 어학당 classroom: a blackboard on the back wall, the teacher's desk in
    // front of it, and rows of student desks facing the board. Sit at any
    // desk (or talk to the teacher) to open the course book.
    const bz = -d / 2;
    box(Math.min(7, w - 3), 2, 0.08, 0, 1.75, bz + 0.06, '#2f5d46'); // board
    box(Math.min(7, w - 3) + 0.2, 0.08, 0.2, 0, 0.72, bz + 0.12, '#c9935f'); // chalk ledge
    const bc = document.createElement('canvas');
    bc.width = 1024; bc.height = 256;
    const bg = bc.getContext('2d');
    bg.fillStyle = '#2f5d46'; bg.fillRect(0, 0, 1024, 256);
    bg.fillStyle = '#f4f1e6';
    bg.font = '800 84px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    bg.textAlign = 'center'; bg.textBaseline = 'middle';
    bg.fillText(store.name.ko, 512, 96);
    bg.font = '600 46px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    bg.fillText('가 나 다 라 · 안녕하세요!', 512, 190);
    const btex = new THREE.CanvasTexture(bc);
    btex.colorSpace = THREE.SRGBColorSpace;
    const writing = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6.6, w - 3.4), Math.min(6.6, w - 3.4) / 4), new THREE.MeshBasicMaterial({ map: btex }));
    writing.position.set(0, 1.8, bz + 0.11);
    scene.add(writing);
    block(0, bz + 0.1, Math.min(7.2, w - 2.8), 0.3);
    // Teacher's desk.
    const tz = bz + 1.9;
    box(1.8, 0.8, 0.7, 0, 0.4, tz, '#8a5a3a');
    box(0.3, 0.05, 0.22, 0.4, 0.83, tz, '#d8452f'); // a book
    block(0, tz, 1.9, 0.8);
    clerk = { x: 0, z: tz - 0.8, ry: 0 };
    stations.academy = [{ x: 0, z: tz + 1 }];
    // Student desks: rows of two-seat desks, an aisle down the middle.
    const cols = Math.max(2, Math.floor((w - 3) / 2.6));
    const rows = Math.max(1, Math.floor((d - 7) / 2.2));
    for (let r = 0; r < rows; r++) {
      const dz = tz + 2.2 + r * 2.2;
      for (let c = 0; c < cols; c++) {
        const dx = (c - (cols - 1) / 2) * 2.6;
        if (Math.abs(dx) < 0.9) continue; // aisle
        box(1.1, 0.06, 0.55, dx, 0.72, dz, '#e3c49a');
        for (const sx2 of [-0.48, 0.48]) box(0.05, 0.72, 0.5, dx + sx2, 0.36, dz, '#9ca9af');
        box(0.5, 0.05, 0.45, dx, 0.45, dz + 0.6, '#5f8a4e'); // chair seat
        box(0.5, 0.45, 0.05, dx, 0.7, dz + 0.83, '#5f8a4e'); // chair back
        block(dx, dz, 1.15, 0.6);
        seats.push({ x: dx, z: dz + 0.62, ry: Math.PI, stand: [dx + (dx > 0 ? -1.0 : 1.0), dz + 0.6], academy: true });
      }
    }
  } else if (store.category === 'club') {
    // A dance club: a stage with a DJ booth and a big LED wall at the back,
    // speaker stacks, a dance floor of glowing tiles, swinging light beams,
    // and a bar counter with stools on the right.
    const sz0 = -d / 2 + 1.9; // stage centre
    // Each club has its own colours: EDM neon, hip-hop gold, K-POP pink.
    const PAL = {
      edm: { tiles: ['#ff3fa4', '#7a5cff', '#2ad1ff', '#ffd23f', '#3fff9b'], edge: '#7a5cff', lights: [0xff3fa4, 0x2ad1ff] },
      hiphop: { tiles: ['#f2b705', '#e8452c', '#ffffff', '#ff8a1f', '#7a2b1a'], edge: '#f2b705', lights: [0xf2b705, 0xe8452c] },
      kpop: { tiles: ['#ff7ab8', '#b388ff', '#7fe3ff', '#fff07a', '#ff4f9a'], edge: '#ff7ab8', lights: [0xff7ab8, 0xb388ff] },
    }[store.genre] || null;
    const TC = PAL?.tiles || ['#ff3fa4', '#7a5cff', '#2ad1ff', '#ffd23f', '#3fff9b'];
    const EDGE = PAL?.edge || '#7a5cff';
    box(11, 0.3, 3.6, 0, 0.15, sz0, '#1c1a24');
    box(11, 0.06, 0.1, 0, 0.32, sz0 + 1.8, EDGE); // lit stage edge
    block(0, sz0, 11, 3.6);
    // DJ booth with two decks and a glowing front.
    box(3.2, 0.6, 0.9, 0, 0.6, sz0 + 0.6, '#15131c'); // low, so the DJ shows
    const boothGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.45), new THREE.MeshBasicMaterial({ color: TC[0] }));
    boothGlow.position.set(0, 0.6, sz0 + 1.06);
    scene.add(boothGlow);
    for (const dx of [-0.8, 0.8]) {
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24), mat('#2b2b30'));
      deck.position.set(dx, 0.92, sz0 + 0.6);
      scene.add(deck);
    }
    box(0.5, 0.06, 0.4, 0, 0.93, sz0 + 0.6, '#3a3a44'); // mixer
    clerk = { x: 0, y: 0.3, z: sz0 - 0.2, ry: 0 }; // the DJ, on the stage behind the booth
    // LED wall: moving equaliser bars.
    const lc = document.createElement('canvas');
    lc.width = 512; lc.height = 160;
    const lg = lc.getContext('2d');
    const ledTex = new THREE.CanvasTexture(lc);
    ledTex.colorSpace = THREE.SRGBColorSpace;
    const led = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.4), new THREE.MeshBasicMaterial({ map: ledTex }));
    led.position.set(0, h - 1.9, -d / 2 + 0.05);
    scene.add(led);
    for (const sx2 of [-6.6, 6.6]) { // speaker stacks
      box(1.3, 2.6, 1.0, sx2, 1.3, sz0, '#141218');
      for (const y of [0.7, 1.6, 2.3]) {
        const cone = new THREE.Mesh(new THREE.CircleGeometry(y > 2 ? 0.22 : 0.4, 18), mat('#2e2c36'));
        cone.position.set(sx2, y, sz0 + 0.51);
        scene.add(cone);
      }
      block(sx2, sz0, 1.4, 1.1);
    }
    // Dance floor tiles.
    const tiles = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: TC[(r + c) % TC.length] }));
      t.position.set((c - 2.5) * 1.6, 0.012, -0.6 + r * 1.6);
      scene.add(t);
      tiles.push(t);
    }
    // Light beams from the ceiling.
    const beams = [];
    for (const [bx, c] of [[-4.5, TC[0]], [-1.5, TC[2]], [1.5, TC[1]], [4.5, TC[3]]]) {
      const pivot = new THREE.Group();
      pivot.position.set(bx, h - 0.1, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, h - 0.3, 18, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      cone.position.y = -(h - 0.3) / 2;
      pivot.add(cone);
      box(0.4, 0.3, 0.4, bx, h - 0.15, 0, '#222028');
      scene.add(pivot);
      beams.push(pivot);
    }
    const party = (PAL?.lights || [0xff3fa4, 0x2ad1ff]).map((c) => new THREE.PointLight(c, 14, 14));
    party.forEach((l, i) => { l.position.set(i ? 4 : -4, 2.6, 1); scene.add(l); });
    // Bar counter with stools on the right wall (the drinks stand on it).
    const cx = w / 2 - 1.4;
    barkeep = { x: cx + 0.75, z: 1.05, ry: -Math.PI / 2 }; // the bartender, behind the counter
    box(0.9, BAR_H, 6.4, cx, BAR_H / 2, 1.05, '#1f1b26');
    box(1.0, 0.06, 6.5, cx, BAR_H + 0.01, 1.05, EDGE);
    block(cx, 1.05, 1.0, 6.5);
    for (const z of [-0.5, 1.05, 2.6]) {
      const sxx = cx - 1.15;
      box(0.38, 0.06, 0.38, sxx, SEAT_H + 0.1, z, TC[0]);
      box(0.06, SEAT_H + 0.1, 0.06, sxx, (SEAT_H + 0.1) / 2, z, '#9ca9af');
      seats.push({ x: sxx, z, ry: Math.PI / 2, stand: [sxx - 0.9, z] });
      block(sxx, z, 0.45, 0.45);
    }
    let t = 0, step = 0, ledT = 0;
    // pulse: the club music's beat (core/club-music.js), when it plays.
    animate = (dt, pulse) => {
      t += dt;
      const beat = pulse ? pulse.beat : Math.floor(t * 2.2);
      const energy = pulse ? pulse.energy : 1;
      const kick = pulse ? Math.max(0, 1 - pulse.phase * 3) : Math.max(0, Math.sin(t * 13.8));
      beams.forEach((b) => { b.children[0].material.opacity = 0.05 + 0.14 * energy; });
      if (beat !== step) {
        step = beat;
        tiles.forEach((tile, i) => tile.material.color.set(TC[(i * 7 + beat * 3 + (i % 3)) % TC.length]));
        boothGlow.material.color.set(TC[beat % TC.length]);
      }
      beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.55; b.rotation.x = Math.cos(t * 0.9 + i) * 0.35; });
      party[0].intensity = 6 + 14 * kick * energy;
      party[1].intensity = 6 + 14 * (pulse ? Math.max(0, 1 - Math.abs(pulse.phase - 0.5) * 3) : Math.max(0, Math.cos(t * 13.8))) * energy;
      ledT += dt;
      if (ledT > 1 / 15) {
        ledT = 0;
        lg.fillStyle = '#07050c'; lg.fillRect(0, 0, 512, 160);
        for (let k = 0; k < 32; k++) {
          const v = (Math.sin(t * 6 + k * 0.6) + Math.sin(t * 9.7 + k * 1.3) + 2) / 4;
          const bh = 20 + v * 130 * (0.45 + 0.55 * energy) * (0.75 + 0.25 * kick);
          lg.fillStyle = `hsl(${(k * 11 + t * 60) % 360}, 90%, 60%)`;
          lg.fillRect(k * 16 + 2, 160 - bh, 12, bh);
        }
        lg.fillStyle = '#fff';
        lg.font = '900 44px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
        lg.textAlign = 'center'; lg.textBaseline = 'middle';
        lg.globalAlpha = 0.9;
        lg.fillText(store.signLocal || store.name.en, 256, 44);
        if (pulse?.title) {
          lg.font = '700 22px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
          lg.fillText('♪ ' + pulse.title, 256, 84);
        }
        lg.globalAlpha = 1;
        ledTex.needsUpdate = true;
      }
    };
    animate(0.1);
  } else if (store.category === 'bar') {
    // A quiet cocktail bar: a long counter with stools, shelves of lit
    // bottles behind it, warm pendant lamps and two candle-lit tables.
    // The style (core/bar-styles.js) adds what makes each bar its own place.
    const style = barStyleOf(store);
    const cz = -d / 2 + 2.2;
    box(8.6, BAR_H, 0.8, 0, BAR_H / 2, cz, '#3b2418');
    box(8.8, 0.07, 0.95, 0, BAR_H + 0.01, cz, '#8a5a3a');
    block(0, cz, 8.8, 0.95);
    clerk = { x: 0.6, z: cz - 1.0, ry: 0 }; // the bartender
    // Back shelves with bottles (the taproom has its tap wall there instead).
    for (const y of style === 'taproom' ? [] : [1.25, 1.85, 2.45]) {
      box(9, 0.06, 0.35, 0, y, -d / 2 + 0.25, '#5a3a28');
      for (let i = 0; i < 16; i++) {
        const bc = ['#3f8f5f', '#c9a227', '#a33a2c', '#d8e4ea', '#6b3f8c', '#2f5d8c'][(i * 5 + Math.round(y * 10)) % 6];
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 10), new THREE.MeshLambertMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.25 }));
        bottle.position.set(-4.2 + i * 0.56, y + 0.18, -d / 2 + 0.25);
        scene.add(bottle);
      }
    }
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.08), new THREE.MeshBasicMaterial({ color: '#ffcf8a' }));
    strip.position.set(0, 2.95, -d / 2 + 0.06);
    scene.add(strip);
    // Stools in front of the counter.
    for (const x of [-2.4, 0, 2.4]) {
      box(0.4, 0.06, 0.4, x, SEAT_H + 0.12, cz + 0.95, '#8a5a3a');
      box(0.06, SEAT_H + 0.12, 0.06, x, (SEAT_H + 0.12) / 2, cz + 0.95, '#2b2b2e');
      seats.push({ x, z: cz + 0.95, ry: Math.PI, stand: [x, cz + 1.9] });
      block(x, cz + 0.95, 0.45, 0.45);
    }
    // Pendant lamps over the counter.
    for (const x of [-3, 0, 3]) {
      box(0.02, 1.0, 0.02, x, h - 0.5, cz, '#2b2b2e');
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.25, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#ffcf8a', side: THREE.DoubleSide }));
      shade.position.set(x, h - 1.1, cz);
      scene.add(shade);
      const pl = new THREE.PointLight(0xffc27a, 5, 6);
      pl.position.set(x, h - 1.3, cz + 0.2);
      scene.add(pl);
    }
    // Two small tables with candles (the quiet bars).
    for (const tx of style === 'hush' || style === 'speakeasy' ? [-w / 2 + 2.2, w / 2 - 2.2] : []) {
      const tz = d / 2 - 3.6;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), mat('#5a3a28'));
      top.position.set(tx, 0.72, tz);
      scene.add(top);
      box(0.08, 0.7, 0.08, tx, 0.35, tz, '#2b2b2e');
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
      flame.position.set(tx, 0.84, tz);
      scene.add(flame);
      box(0.07, 0.08, 0.07, tx, 0.78, tz, '#f3eee4');
      const glow = new THREE.PointLight(0xffb45a, 2.5, 3.5);
      glow.position.set(tx, 1.0, tz);
      scene.add(glow);
      for (const s2 of [-1, 1]) {
        // With darts, the chair against the left wall makes way for the
        // second dartboard's players.
        if (store.darts && tx < 0 && s2 < 0) continue;
        const chx = tx + 0.85 * s2;
        box(0.42, 0.06, 0.42, chx, SEAT_H - 0.03, tz, '#6b2f2f');
        box(0.08, 0.5, 0.42, chx + 0.2 * s2, SEAT_H + 0.22, tz, '#6b2f2f');
        seats.push({ x: chx + 0.04 * s2, z: tz, ry: s2 > 0 ? -Math.PI / 2 : Math.PI / 2, stand: [chx, tz + 0.9] });
      }
      block(tx, tz, 2.3, 0.95);
    }
    // Two dartboards side by side on the left wall (stores.json "darts":
    // true), each with its throw line on the floor in front of it. Darts
    // thrown there stick in the board for everyone in the bar to see
    // (core/dart-pins.js); dartboards[i] is board i's face.
    if (store.darts) {
      const bx = -w / 2 + 0.06;
      stations.darts = [];
      stations.dartboards = [];
      [-1.4, 0.4].forEach((dz, i) => {
        box(0.08, 1.5, 1.4, bx + 0.02, 1.55, dz, '#2b1d14'); // cabinet
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), new THREE.MeshLambertMaterial({ map: dartboardTexture() }));
        face.rotation.y = Math.PI / 2;
        face.position.set(bx + 0.08, 1.6, dz);
        scene.add(face);
        const spot = new THREE.PointLight(0xfff0d0, 2.5, 4); // (not 3.5: those are the candles that flicker)
        spot.position.set(bx + 0.9, 2.6, dz);
        scene.add(spot);
        box(0.05, 0.01, 1.2, bx + 2.37, 0.01, dz, '#c9a227'); // the oche (throw line)
        stations.darts.push({ x: bx + 2.7, z: dz, ry: -Math.PI / 2, board: i }); // facing the board
        // The scoring area (r = 1 in core/arcade.js) is 104/128 of the face.
        stations.dartboards.push({ x: bx + 0.08, y: 1.6, z: dz, ry: Math.PI / 2, r: 0.34 * 104 / 128 });
      });
    }
    const styled = decorateBar(style, { scene, box, block, mat, seats, stations, w, d, h, cz, store, BAR_H, SEAT_H });
    if (style === 'hush') seatPatron({ seats, stations }, -2.4, cz + 0.95); // a regular at the end of the bar
    let t = 0;
    const flames = [];
    scene.traverse((o) => { if (o.isPointLight && o.distance === 3.5) flames.push(o); });
    animate = (dt) => {
      t += dt;
      flames.forEach((f, i) => { f.intensity = 2.2 + Math.sin(t * 9 + i * 2) * 0.35 + Math.sin(t * 23 + i) * 0.15; });
      styled?.(dt);
    };
  } else if (store.category === 'cafe' || store.category === 'restaurant') {
    // Tables with a chair on each side, laid out in rows across the middle of
    // the room (more of them in a large café), keeping the door path clear.
    const cols = Math.max(1, Math.floor((w - 4) / 3.6));
    const rows = Math.max(1, Math.floor((d - 5.6) / 2.6));
    const z0 = bz + 2.4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = (c - (cols - 1) / 2) * 3.6;
        const tz = z0 + r * 2.6;
        if (Math.abs(tx) < 1.5 && tz > d / 2 - 3.2) continue; // door path
        box(0.9, 0.05, 0.9, tx, 0.62, tz, '#c98b4f');
        if (store.workshop === 'grill') { // a round grill plate on each table
          const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20), mat('#2b2b2e'));
          grill.position.set(tx, 0.67, tz);
          scene.add(grill);
          box(0.2, 0.012, 0.06, tx - 0.06, 0.695, tz, '#c98a4a');
          box(0.2, 0.012, 0.06, tx + 0.08, 0.695, tz + 0.1, '#f0b7a8');
        }
        box(0.1, 0.62, 0.1, tx, 0.31, tz, '#8a5a3a');
        for (const s of [-1, 1]) {
          const cx = tx + 0.8 * s;
          box(0.42, 0.06, 0.42, cx, SEAT_H - 0.03, tz, store.colors.awning); // seat
          box(0.08, 0.5, 0.42, cx + 0.2 * s, SEAT_H + 0.22, tz, store.colors.awning); // back
          for (const lx of [-0.16, 0.16]) for (const lz of [-0.16, 0.16]) box(0.05, SEAT_H - 0.06, 0.05, cx + lx, (SEAT_H - 0.06) / 2, tz + lz, '#8a5a3a');
          // Sit facing the table; stand up beside the chair, outside the collider.
          // plate: where a dish ordered from this seat is served on the table
          seats.push({ x: cx + 0.04 * s, z: tz, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2, stand: [tx + 1.55 * s, tz], plate: [tx + 0.24 * s, tz] });
        }
        block(tx, tz, 2.3, 0.95);
      }
    }
    // Counter by the side wall.
    box(2.4, COUNTER_H, 0.8, sx - 1.4, COUNTER_H / 2, d / 2 - 2.2, '#fffaf0');
    box(0.3, 0.35, 0.3, sx - 0.8, COUNTER_H + 0.17, d / 2 - 2.2, '#4a3f35'); // coffee machine
    block(sx - 1.4, d / 2 - 2.2, 2.4, 0.8);
    clerk = { x: sx - 1.4, z: d / 2 - 1.45, ry: Math.PI };
  } else if (store.category === 'home') {
    // Empty home: big windows on the back wall; the player decorates it.
    for (const wx of [-w / 4, w / 4]) {
      box(2.6, 1.6, 0.08, wx, 1.9, -d / 2 + 0.05, '#fffaf0');
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ color: '#bfe3f5' }));
      pane.position.set(wx, 1.9, -d / 2 + 0.1);
      scene.add(pane);
    }
  } else {
    if (store.workshop === 'salon' || store.workshop === 'lens' || store.workshop === 'lips') {
      // One big mirror across the back wall with a chair in front of each
      // place: sit down and watch yourself in the mirror while you choose.
      const n = Math.max(2, Math.min(4, Math.floor((w - 3) / 2.6)));
      const mw = Math.min(w - 2, n * 2.6), mz = -d / 2 + 0.12;
      box(mw + 0.2, 1.75, 0.08, 0, 1.55, mz, '#e9eef2'); // frame
      const glass = new Reflector(new THREE.PlaneGeometry(mw, 1.55), {
        textureWidth: 2048, textureHeight: Math.round(2048 * 1.55 / mw), color: 0xffffff, // clear glass
      });
      glass.position.set(0, 1.55, mz + 0.05);
      scene.add(glass);
      box(mw, 0.08, 0.42, 0, 0.72, mz + 0.25, '#fffaf0'); // shelf under the mirror
      const props = { salon: [store.colors?.sign || '#f29bb6', store.colors?.awning || '#4f7fd6', '#e8c27a'], lens: ['#3fc6d0', '#8a5cc9', '#4a9a5c'], lips: lipProps(store) }[store.workshop];
      stations.mirror = [];
      for (let i = 0; i < n; i++) {
        const mx = (i - (n - 1) / 2) * (mw / n);
        props.forEach((c, k) => {
          if (store.workshop === 'lips') { // lipsticks standing up
            box(0.05, 0.12, 0.05, mx - 0.3 + k * 0.12, 0.82, mz + 0.25, '#2b2230');
            box(0.04, 0.06, 0.04, mx - 0.3 + k * 0.12, 0.91, mz + 0.25, c);
          } else if (store.workshop === 'lens') box(0.14, 0.05, 0.1, mx - 0.3 + k * 0.2, 0.79, mz + 0.25, c); // lens cases
          else box(0.08, 0.18 + k * 0.03, 0.08, mx - 0.35 + k * 0.15, 0.85, mz + 0.25, c); // dye bottles
        });
        const cz = mz + 1.15;
        box(0.6, 0.12, 0.6, mx, SEAT_H, cz, '#2b2b2e');
        box(0.6, 0.6, 0.1, mx, SEAT_H + 0.35, cz + 0.28, '#2b2b2e');
        box(0.12, SEAT_H, 0.12, mx, SEAT_H / 2, cz, '#9ca9af');
        seats.push({ x: mx, z: cz, ry: Math.PI, stand: [mx, cz + 1], beauty: store.workshop, mirrorZ: mz });
        block(mx, cz, 0.7, 0.7);
      }
      block(0, mz + 0.25, mw, 0.5);
    } else if (store.workshop === 'clinic' || store.workshop === 'clinic2') {
      // Consultation beds along the back wall (lie down to choose), a waiting
      // sofa, and the operating room behind a glass wall on the right.
      const bedTop = 0.55;
      for (const bx of [-w / 2 + 1.8, -w / 2 + 4.3]) {
        const bz = -d / 2 + 1.45;
        box(0.9, bedTop, 2.1, bx, bedTop / 2, bz, '#f6f8fa');
        box(0.8, 0.1, 0.4, bx, bedTop + 0.05, bz - 0.8, '#ffffff'); // pillow
        box(0.92, 0.04, 1.2, bx, bedTop + 0.02, bz + 0.35, store.colors.awning); // blanket
        seats.push({ x: bx, z: bz + 0.15, ry: 0, stand: [bx + 0.95, bz + 0.3], beauty: store.workshop, lie: true });
        block(bx, bz, 1, 2.2);
      }
      // Operating room: x from ox0 to the right wall, z from the back wall to oz1.
      const ox0 = 0.6, oz1 = -0.4, oxm = (ox0 + w / 2) / 2, ozm = (-d / 2 + oz1) / 2;
      const glassMat = new THREE.MeshLambertMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.35, depthWrite: false });
      const pane = (len, x, z, ry) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.6), glassMat);
        m.position.set(x, 1.3, z);
        m.rotation.y = ry;
        scene.add(m);
      };
      const doorW = 1.6, frontLen = w / 2 - ox0;
      pane(oz1 + d / 2, ox0, ozm, Math.PI / 2); // left side
      pane(frontLen - doorW - 0.4, ox0 + 0.4 + doorW + (frontLen - doorW - 0.4) / 2, oz1, 0); // front, right of the door
      box(0.4, 2.6, 0.08, ox0 + 0.2, 1.3, oz1, '#9ca9af');
      box(frontLen, 0.3, 0.1, ox0 + frontLen / 2, 2.75, oz1, '#3f9a8a'); // header
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.26), new THREE.MeshBasicMaterial({ map: labelTexture('수술실 · OR', '#c8463c') }));
      sign.position.set(ox0 + 0.4 + doorW / 2, 2.75, oz1 + 0.06);
      scene.add(sign);
      block(ox0, ozm, 0.12, oz1 + d / 2);
      block(ox0 + 0.4 + doorW + (frontLen - doorW - 0.4) / 2, oz1, frontLen - doorW - 0.4, 0.12);
      block(ox0 + 0.2, oz1, 0.4, 0.12);
      // The operating table and its big round lamp.
      const tx = oxm + 0.4, tz = ozm;
      box(0.8, 0.85, 2, tx, 0.42, tz, '#7fa7b5');
      box(0.85, 0.06, 2.05, tx, 0.87, tz, '#e8f1f4');
      box(0.06, 1.6, 0.06, tx - 1.1, 2.6, tz, '#9ca9af');
      const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.18, 24), mat('#e9eef2'));
      lampHead.position.set(tx, 2.25, tz);
      scene.add(lampHead);
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.33, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fffbe6' }));
      bulb.position.set(tx, 2.15, tz);
      scene.add(bulb);
      const orLight = new THREE.PointLight(0xfff6e0, 8, 5);
      orLight.position.set(tx, 2.0, tz);
      scene.add(orLight);
      block(tx, tz, 0.9, 2.1);
      // Monitors and a trolley.
      box(0.5, 1.3, 0.4, tx + 1.5, 0.65, tz - 0.6, '#4a4f57');
      box(0.45, 0.32, 0.05, tx + 1.5, 1.45, tz - 0.6, '#1d2a2f');
      box(0.6, 0.06, 0.4, tx - 1.4, 0.85, tz + 0.7, '#c9ced3');
      block(tx + 1.5, tz - 0.6, 0.6, 0.5);
      // The surgery: the gurney rolls from the bed into the room and back out.
      stations.surgery = {
        table: [tx, tz], door: [ox0 + 0.4 + doorW / 2, oz1 + 0.9], bedTop, tableTop: 0.9,
        staff: [[tx - 0.9, tz - 0.4, Math.PI / 2], [tx + 0.9, tz - 0.5, -Math.PI / 2], [tx + 0.9, tz + 0.5, -Math.PI / 2], [tx - 0.9, tz + 0.6, Math.PI / 2]],
      };
      const fx = -w / 2 + 1.2, fz = d / 2 - 3.2; // waiting sofa
      box(0.8, 0.42, 2.2, fx, 0.21, fz, store.colors.awning);
      box(0.2, 0.5, 2.2, fx - 0.35, 0.6, fz, store.colors.awning);
      for (const o of [-0.5, 0.5]) seats.push({ x: fx, z: fz + o, ry: Math.PI / 2, stand: [fx + 1, fz + o] });
      block(fx, fz, 0.9, 2.3);
    } else if (store.workshop === 'ddp-hall') {
      // DDP Hall: DDP's bright lobby, entered from the plaza. White curving
      // forms (a few design pieces on plinths), benches, people already
      // looking round, and at the back a dark doorway to the Curve Runway
      // (its own room: main.js walks you in, its door brings you back).
      // The middle stays open from the front door to the back door.
      const dz = -d / 2 + 0.2;
      for (const sx2 of [-1.7, 1.7]) box(0.4, 3.4, 0.4, sx2, 1.7, dz + 0.1, '#c9ced6');
      box(3.8, 0.4, 0.4, 0, 3.6, dz + 0.1, '#c9ced6');
      box(3, 3.2, 0.06, 0, 1.6, dz - 0.08, '#24212b');
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.08).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe9c4' }));
      glow.position.set(0, 0.015, dz + 0.5);
      scene.add(glow);
      const runwaySign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.69), new THREE.MeshBasicMaterial({ map: labelTexture('커브 런웨이 · Curve Runway', '#24212b') }));
      runwaySign.position.set(0, 4.25, dz + 0.02);
      scene.add(runwaySign);
      stations.runwayDoor = [{ x: 0, z: dz + 1.1 }];
      // Design pieces on white plinths, along both sides.
      const pieces = [['torus', '#c9ced6'], ['sphere', '#f2b8a0'], ['cone', '#9fb7d9'], ['knot', '#e7d38a']];
      let n = 0;
      for (const side of [-1, 1]) {
        for (const pz of [-d * 0.22, d * 0.08]) {
          const px = side * (w / 2 - 3.2);
          box(1.2, 0.9, 1.2, px, 0.45, pz, '#f7f8fa');
          const [kind, col] = pieces[n++ % pieces.length];
          const geo = kind === 'torus' ? new THREE.TorusGeometry(0.42, 0.14, 12, 32)
            : kind === 'sphere' ? new THREE.SphereGeometry(0.42, 24, 16)
              : kind === 'cone' ? new THREE.ConeGeometry(0.38, 0.9, 24)
                : new THREE.TorusKnotGeometry(0.3, 0.1, 64, 10);
          const art = new THREE.Mesh(geo, mat(col));
          art.position.set(px, 1.4, pz);
          scene.add(art);
          block(px, pz, 1.4, 1.4);
        }
      }
      // A long curved white wall piece in each back corner, like DDP's skin.
      for (const side of [-1, 1]) {
        const arc = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3.2, 24, 1, true, side < 0 ? Math.PI : Math.PI / 2, Math.PI / 2), mat('#f4f5f7', { side: THREE.DoubleSide }));
        arc.position.set(side * (w / 2 - 3), 1.6, -d / 2 + 3);
        scene.add(arc);
        block(side * (w / 2 - 1.6), -d / 2 + 1.6, 3, 3);
      }
      // Benches in the middle of each side, facing the open floor.
      for (const side of [-1, 1]) {
        const bx = side * 4.6, bz = d * 0.28;
        box(0.7, 0.4, 2.4, bx, 0.2, bz, '#c9ced6');
        for (const o of [-0.6, 0.6]) seats.push({ x: bx, z: bz + o, ry: -side * Math.PI / 2, stand: [bx - side * 0.9, bz + o] });
        block(bx, bz, 0.8, 2.5);
      }
      // People already here, looking at the pieces (main.js stands them up).
      stations.visitors = [
        { x: -w / 2 + 4.9, z: -d * 0.22 + 0.3, ry: -Math.PI / 2 },
        { x: w / 2 - 4.9, z: d * 0.08 - 0.4, ry: Math.PI / 2 },
        { x: w / 2 - 4.7, z: -d * 0.22 + 0.9, ry: Math.PI / 2 + 0.4 },
        { x: -2.6, z: -d / 2 + 3.4, ry: Math.PI + 0.3 },
        { x: -w / 2 + 4.7, z: d * 0.08 + 0.8, ry: -Math.PI / 2 - 0.3 },
      ];
      for (const v of stations.visitors) block(v.x, v.z, 0.5, 0.5);
    } else if (store.workshop === 'runway') {
      // Curve Runway (DDP, its own big room size): a long lit catwalk from a
      // backstage arch at the back wall towards the door, rows of seats
      // either side facing it (some already taken by an audience, main.js),
      // and photographers either side of its end. The middle stays open from
      // the door to the catwalk: walk in, up the runway to backstage.
      // Flat (at floor height), so walking it needs no climbing.
      const z0 = -d / 2 + 1.8, z1 = d / 2 - 9, len = z1 - z0 + 1.4, mid = (z0 + z1) / 2;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#f4f1f8' }));
      strip.position.set(0, 0.012, mid);
      scene.add(strip);
      const glowMat = new THREE.MeshBasicMaterial({ color: '#ffe9c4' });
      for (const sx2 of [-1.35, 1.35]) {
        const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.1, len).rotateX(-Math.PI / 2), glowMat);
        edge.position.set(sx2, 0.016, mid);
        scene.add(edge);
      }
      // Backstage: a silver arch with a dark curtain. Its own materials, so
      // they turn see-through when the camera ends up behind them (waiting
      // by the start, the camera behind you looks back through the arch).
      const archMat = new THREE.MeshLambertMaterial({ color: '#c9ced6', transparent: true });
      const curtainMat = new THREE.MeshLambertMaterial({ color: '#2a2632', transparent: true });
      for (const sx2 of [-2, 2]) box(0.45, 4, 0.45, sx2, 2, -d / 2 + 0.5, '#c9ced6').material = archMat;
      box(4.5, 0.55, 0.45, 0, 4.1, -d / 2 + 0.5, '#c9ced6').material = archMat;
      box(3.6, 3.8, 0.06, 0, 1.9, -d / 2 + 0.12, '#2a2632').material = curtainMat;
      const archZ = -d / 2 + 0.9; // just in front of the pillars
      see = (px, pz, cx, cz) => {
        const behind = cz < archZ;
        for (const m of [archMat, curtainMat]) {
          const o = behind ? 0.15 : 1;
          if (m.opacity !== o) { m.opacity = o; m.depthWrite = !behind; }
        }
      };
      // And the camera stays in the room (it stops short of the back wall).
      camBlocked = (x, z) => z < -d / 2 + 0.6;
      // Seats: four rows each side, turned to the runway, in two blocks with
      // a cross aisle between them (and aisles at both ends) to get in.
      const audience = [];
      const rowZs = [];
      for (let z = z0 + 2; z <= z1 - 0.6; z += 1.15) rowZs.push(z);
      const aisle = Math.floor(rowZs.length / 2);
      const blocks = [rowZs.slice(0, aisle), rowZs.slice(aisle + 1)];
      let k = 0;
      for (const side of [-1, 1]) {
        for (let r = 0; r < 4; r++) {
          const sx2 = side * (2.9 + r * 1.25);
          for (const zs of blocks) {
            for (const z of zs) {
              box(0.62, 0.12, 0.62, sx2, SEAT_H - 0.06, z, store.colors.seat || store.colors.sign);
              box(0.12, 0.6, 0.62, sx2 + side * 0.3, SEAT_H + 0.28, z, store.colors.seat || store.colors.sign);
              const seat = { x: sx2, z, ry: -side * Math.PI / 2, stand: [sx2 - side * 0.62, z] };
              // About a third of the seats are taken already (the same ones
              // for everyone); the rest are for players.
              // (at most 40 people, for phones)
              if ((k++ * 7) % 3 === 0 && audience.length < 40) audience.push(seat); else seats.push(seat);
            }
            if (zs.length) block(sx2 + side * 0.12, (zs[0] + zs[zs.length - 1]) / 2, 0.45, zs[zs.length - 1] - zs[0] + 0.7);
          }
        }
      }
      // The photographers: cameras on tripods either side of the runway's
      // end, leaving the middle open.
      const flashes = [];
      for (const fx of [-3.4, -2.2, 2.2, 3.4]) {
        const pz = z1 + 1.4;
        box(0.05, 1.2, 0.05, fx, 0.6, pz, '#3a3a40');
        box(0.32, 0.22, 0.2, fx, 1.3, pz, '#1f1f24');
        box(0.12, 0.12, 0.18, fx, 1.3, pz - 0.18, '#55555c'); // lens
        block(fx, pz, 0.4, 0.4);
        const fl = new THREE.PointLight(0xffffff, 0, 8);
        fl.position.set(fx, 1.6, pz - 0.3);
        scene.add(fl);
        flashes.push(fl);
      }
      // Spotlights over the runway.
      for (const sz of [mid, z1 - 1]) {
        const spot = new THREE.PointLight(0xfff1dd, 14, 16);
        spot.position.set(0, h - 0.5, sz);
        scene.add(spot);
      }
      let flashT = 0;
      animate = (dt) => {
        flashT = Math.max(0, flashT - dt);
        const on = flashT > 0 && Math.sin(flashT * 60) > 0 ? 40 : 0;
        flashes.forEach((fl, i) => { fl.intensity = (i + Math.floor(flashT * 20)) % 2 ? on : 0; });
      };
      // Stand backstage to start; main.js walks you from z to z1 and back.
      stations.runway = [{ x: 0, z: z0, ry: 0, z1, audience, flash: () => { flashT = 0.5; } }];
    } else if (store.workshop === 'karaoke') {
      // A small stage with a big lyrics screen and a mic stand.
      box(5, 0.2, 2.4, 0, 0.1, -d / 2 + 1.4, '#2b2240');
      box(4.2, 2.2, 0.1, 0, 1.9, -d / 2 + 0.12, '#14101f');
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.9), new THREE.MeshBasicMaterial({ color: '#5b3fd0' }));
      scr.position.set(0, 1.9, -d / 2 + 0.18);
      scene.add(scr);
      box(0.04, 1.2, 0.04, 0, 0.8, -d / 2 + 1.8, '#9ca9af');
      box(0.1, 0.16, 0.1, 0, 1.45, -d / 2 + 1.8, '#2b2b2e'); // mic
      for (const sx2 of [-2.3, 2.3]) box(0.5, 0.9, 0.4, sx2, 0.65, -d / 2 + 0.6, '#1d1b22'); // speakers
      block(0, -d / 2 + 0.6, 5, 0.9);
      stations.karaoke = [{ x: 0, z: -d / 2 + 2.9 }];
      for (const o of [-1.6, 1.6]) { // sofas
        box(1.6, 0.42, 0.7, o, 0.21, 0.6, store.colors.awning);
        seats.push({ x: o, z: 0.6, ry: Math.PI, stand: [o, 1.5] });
        block(o, 0.6, 1.7, 0.8);
      }
    } else if (store.workshop === 'photo' || store.workshop === 'photobw') {
      // Two booths side by side: a box with a curtain opening and a lit
      // backdrop inside (메모리즈: dark wood and a grey backdrop).
      const bw = store.workshop === 'photobw';
      const bz = -d / 2 + 1.6, half = 1.45;
      stations.photo = [];
      for (const bx of [-w / 4, w / 4]) {
        box(half * 2, 2.4, 0.1, bx, 1.2, -d / 2 + 0.1, bw ? '#d9d9d9' : '#fffaf0'); // backdrop
        for (const s2 of [-1, 1]) box(0.1, 2.4, 2.6, bx + s2 * half, 1.2, bz, store.colors.sign);
        box(half * 2 + 0.1, 0.12, 2.6, bx, 2.45, bz, store.colors.sign);
        box(0.4, 0.3, 0.3, bx, 2.25, bz + 1.2, '#2b2b2e'); // camera, hung from the roof
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9), new THREE.MeshLambertMaterial({ color: store.colors.awning, side: THREE.DoubleSide }));
        curtain.position.set(bx - half + 0.5, 1.35, bz + 1.28);
        scene.add(curtain);
        for (const s2 of [-1, 1]) block(bx + s2 * half, bz, 0.2, 2.6);
        stations.photo.push({ x: bx, z: bz + 0.3, ry: 0, camZ: bz + 2.6, half });
      }
    } else if (store.workshop === 'photo1') {
      // 추억사진관: a portrait studio with a paper backdrop, two soft boxes
      // and a camera on a tripod. One person at a time.
      const sz = -d / 2 + 2.2;
      box(4.2, 2.8, 0.06, 0, 1.4, -d / 2 + 0.1, '#e9e1d2'); // backdrop paper
      const sweep = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.8).rotateX(-Math.PI / 2), mat('#e9e1d2'));
      sweep.position.set(0, 0.01, -d / 2 + 1.0);
      scene.add(sweep);
      box(4.4, 0.16, 0.16, 0, 2.86, -d / 2 + 0.16, '#2b2b2e'); // roll
      for (const s2 of [-1, 1]) {
        box(0.05, 1.7, 0.05, s2 * 2.1, 0.85, sz + 0.4, '#2b2b2e'); // light stands
        const soft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.35), new THREE.MeshBasicMaterial({ color: '#fffaf0' }));
        soft.position.set(s2 * 2.1, 1.85, sz + 0.4);
        soft.rotation.y = -s2 * 0.6;
        scene.add(soft);
        block(s2 * 2.1, sz + 0.4, 0.5, 0.5);
      }
      for (const a of [0, 2.1, 4.2]) box(0.04, 1.3, 0.04, Math.sin(a) * 0.25, 0.62, sz + 2.6 + Math.cos(a) * 0.25, '#2b2b2e'); // tripod
      box(0.36, 0.26, 0.22, 0, 1.36, sz + 2.6, '#1d1b22');
      block(0, sz + 2.6, 0.6, 0.6);
      stations.photo = [{ x: 0, z: sz, ry: 0, camZ: sz + 2.6, half: 0.4, solo: true }];
    } else if (store.workshop === 'tarot') {
      // A tarot café: dim and cosy, with one or two reading tables (store.readers),
      // each with a reader behind it and two cushioned stools in front (for you
      // and a friend). A curtain screens the tables from each other, and a sofa
      // by the door is where people wait for their turn.
      const cloth = store.tarotCloth || '#4b2f7a';
      const n = Math.max(1, Math.min(2, store.readers || 1));
      const tz = -d / 2 + 2.3;
      const TT = 0.62; // tabletop height: low, so you look down at the cards
      const xs = n === 2 ? [-w / 4 - 0.1, w / 4 + 0.1] : [0];
      stations.tarotReaders = [];
      stations.tarotTables = [];
      xs.forEach((tx, k) => {
        const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.02, 28), mat(k % 2 ? '#7a3b4f' : '#5a3a6e'));
        rug.position.set(tx, 0.01, tz + 0.2);
        scene.add(rug);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 24), mat(cloth));
        top.position.set(tx, TT, tz);
        scene.add(top);
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.87, 0.98, TT - 0.06, 24, 1, true), mat(cloth));
        skirt.position.set(tx, (TT - 0.06) / 2 + 0.02, tz);
        scene.add(skirt);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.85 }));
        ball.position.set(tx, TT + 0.2, tz - 0.3);
        scene.add(ball);
        box(0.18, 0.05, 0.18, tx, TT + 0.05, tz - 0.3, '#d4a73a'); // its stand
        for (const s2 of [-1, 1]) { // candles
          box(0.06, 0.16, 0.06, tx + s2 * 0.55, TT + 0.11, tz - 0.15, '#f7f1e3');
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd36e' }));
          flame.position.set(tx + s2 * 0.55, TT + 0.22, tz - 0.15);
          scene.add(flame);
        }
        for (let q = 0; q < 7; q++) { // a fanned deck, face down
          const card = box(0.12, 0.01, 0.2, tx + (q - 3) * 0.1, TT + 0.04, tz + 0.25, '#2a1f4f');
          card.rotation.y = (q - 3) * 0.12;
        }
        // A hanging lamp with a fabric shade, and a warm pool of light.
        box(0.02, 0.9, 0.02, tx, h - 0.45, tz, '#3b2a20');
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 16, 1, true), new THREE.MeshLambertMaterial({ color: store.colors.awning, side: THREE.DoubleSide, emissive: store.colors.awning, emissiveIntensity: 0.35 }));
        shade.position.set(tx, h - 1.05, tz);
        scene.add(shade);
        const glow = new THREE.PointLight(0xffc98a, 7, 5.5);
        glow.position.set(tx, h - 1.3, tz);
        scene.add(glow);
        // The reader's armchair, and two cushioned stools for you and a friend.
        box(0.7, 0.45, 0.6, tx, 0.22, tz - 1.05, '#4a2f3f');
        box(0.7, 0.7, 0.12, tx, 0.75, tz - 1.37, '#4a2f3f');
        stations.tarotReaders.push({ x: tx, z: tz - 0.95, ry: 0 });
        for (const [j, s2] of [[0, -1], [1, 1]]) {
          const cx = tx + s2 * 0.48;
          box(0.42, 0.42, 0.42, cx, 0.21, tz + 1.0, '#3a2c3f');
          box(0.44, 0.08, 0.44, cx, 0.46, tz + 1.0, k % 2 ? '#e6a3b8' : '#c9a6ff'); // cushion
          seats.push({ x: cx, z: tz + 1.0, ry: Math.PI, stand: [cx, tz + 1.85], tarot: true, table: k, side: j });
        }
        block(tx, tz, 1.8, 1.8);
        block(tx, tz - 1.15, 0.8, 0.7);
        stations.tarotTables.push({ x: tx, z: tz });
      });
      stations.tarotReader = stations.tarotReaders[0];
      if (n === 2) { // a velvet curtain between the two tables, for privacy
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(3.4, h - 0.3), new THREE.MeshLambertMaterial({ color: '#5a2340', side: THREE.DoubleSide }));
        curtain.rotation.y = Math.PI / 2;
        curtain.position.set(0, (h - 0.3) / 2, -d / 2 + 1.7);
        scene.add(curtain);
        box(0.06, 0.06, 3.5, 0, h - 0.3, -d / 2 + 1.7, '#d4a73a'); // its rail
        block(0, -d / 2 + 1.7, 0.2, 3.4);
      }
      // The waiting sofa by the door (left), armchairs on the right where a
      // shop counter would be, and a bookshelf. The space between is left open.
      const sofaX = -w / 2 + 0.75;
      box(0.75, 0.42, 2.4, sofaX, 0.21, 1.5, '#7a3b4f');
      box(0.2, 0.9, 2.4, sofaX - 0.33, 0.6, 1.5, '#6a2f42');
      for (const z of [0.7, 1.5, 2.3]) {
        box(0.5, 0.08, 0.62, sofaX + 0.05, 0.46, z, '#f0d9a8'); // cushions
        seats.push({ x: sofaX + 0.1, z, ry: Math.PI / 2, stand: [sofaX + 1.0, z], wait: true });
      }
      block(sofaX - 0.05, 1.5, 0.8, 2.5);
      const chairX = w / 2 - 0.7;
      for (const z of [1.0, 1.9, 2.8]) { // waiting armchairs on the right wall, facing the room
        box(0.62, 0.42, 0.62, chairX, 0.21, z, '#5a3a6e');
        box(0.14, 0.82, 0.62, chairX + 0.26, 0.61, z, '#4a2f5e'); // backrest
        for (const s2 of [-1, 1]) box(0.5, 0.18, 0.1, chairX + 0.02, 0.5, z + s2 * 0.29, '#4a2f5e'); // arms
        box(0.46, 0.08, 0.46, chairX - 0.04, 0.46, z, '#f0d9a8'); // cushion
        seats.push({ x: chairX - 0.1, z, ry: -Math.PI / 2, stand: [chairX - 1.0, z], wait: true });
      }
      block(chairX + 0.05, 1.9, 0.75, 2.6);
      box(0.4, 2.0, 1.4, -w / 2 + 0.25, 1.0, -0.6, '#4a3326'); // bookshelf
      for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) box(0.22, 0.32, 0.1, -w / 2 + 0.35, 0.3 + r * 0.48, -1.1 + q * 0.24, ['#c9a6ff', '#e6a3b8', '#ffd36e', '#7fb7a8', '#d98b5f'][(r + q) % 5]);
      block(-w / 2 + 0.25, -0.6, 0.4, 1.4);
      // Fairy lights along the back wall, and star stickers above them.
      for (let k = 0; k < 18; k++) {
        const x = -w / 2 + 0.5 + k * (w - 1) / 17;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial({ color: k % 3 ? '#ffd9a0' : '#ffb3c8' }));
        bulb.position.set(x, h - 0.7 - Math.sin((k % 6) / 5 * Math.PI) * 0.25, -d / 2 + 0.06);
        scene.add(bulb);
      }
      for (let k = 0; k < 14; k++) {
        const star = new THREE.Mesh(new THREE.CircleGeometry(0.06 + (k % 3) * 0.03, 5), new THREE.MeshBasicMaterial({ color: k % 2 ? '#ffd36e' : '#c9a6ff' }));
        star.position.set(-w / 2 + 0.6 + ((k * 37) % 100) / 100 * (w - 1.2), 1.4 + ((k * 53) % 100) / 100 * 1.2, -d / 2 + 0.03);
        scene.add(star);
      }
    } else if (ACTIVITY_ROOMS.has(store.workshop)) {
      // Bowling alley, climbing gym, PC방 (core/activity-rooms.js).
      animate = decorateActivityRoom(store, { scene, box, block, mat, stations, seats, w, d, h })?.animate || null;
    } else if (store.workshop === 'batting') {
      // 야구 연습장: three netted lanes, a pitching machine at the far end of
      // each, home plate at the open front where you stand to bat.
      stations.batting = [];
      const netMat = new THREE.MeshBasicMaterial({ color: '#2b2b2e', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
      const z0 = -d / 2 + 0.3, z1 = 0.6, lw = 4.4, nh = 3.4;
      for (const lx of [-6.5, 0, 6.5]) {
        const turf = new THREE.Mesh(new THREE.PlaneGeometry(lw, z1 - z0).rotateX(-Math.PI / 2), mat('#3f8f5a'));
        turf.position.set(lx, 0.012, (z0 + z1) / 2);
        scene.add(turf);
        for (const sx2 of [-lw / 2, lw / 2]) {
          const net = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, nh), netMat);
          net.rotation.y = Math.PI / 2;
          net.position.set(lx + sx2, nh / 2, (z0 + z1) / 2);
          scene.add(net);
          box(0.08, nh, 0.08, lx + sx2, nh / 2, z1, '#9ca9af'); // front posts
          block(lx + sx2, (z0 + z1) / 2, 0.15, z1 - z0);
        }
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(lw, z1 - z0).rotateX(Math.PI / 2), netMat);
        roof.position.set(lx, nh, (z0 + z1) / 2);
        scene.add(roof);
        box(lw, 0.08, 0.08, lx, nh, z1, '#9ca9af');
        // The pitching machine: a stand, two throwing wheels and a ball hopper.
        const mz = z0 + 1.4;
        box(0.8, 0.9, 0.8, lx, 0.45, mz, '#3a3f47');
        for (const wx of [-0.22, 0.22]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16), mat('#2b2b2e'));
          wheel.position.set(lx + wx, 1.05, mz);
          scene.add(wheel);
        }
        const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.15, 0.4, 12), mat('#c8463c'));
        hopper.position.set(lx, 1.45, mz - 0.25);
        scene.add(hopper);
        block(lx, mz, 0.9, 0.9);
        // Home plate.
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 5), mat('#f7f4ee'));
        plate.rotation.y = Math.PI / 2;
        plate.position.set(lx, 0.02, z1 - 1.3);
        scene.add(plate);
        stations.batting.push({ x: lx + 0.6, z: z1 - 1.1, ry: Math.PI }); // facing the machine
      }
      // A round HOME RUN target high on the back wall of the middle lane.
      const hr = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ map: labelTexture('HOME RUN', '#d9473c') }));
      hr.position.set(0, 2.7, -d / 2 + 0.05);
      scene.add(hr);
    } else if (store.workshop === 'claw') {
      // A row of claw machines along the back wall.
      const n = Math.max(2, Math.min(4, Math.floor((w - 2) / 1.6)));
      stations.claw = [];
      for (let i = 0; i < n; i++) {
        const mx = (i - (n - 1) / 2) * 1.6, mz = -d / 2 + 0.9;
        box(1.2, 0.9, 1.0, mx, 0.45, mz, store.colors.sign);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.9), new THREE.MeshLambertMaterial({ color: '#dff4ff', transparent: true, opacity: 0.35 }));
        glass.position.set(mx, 1.4, mz);
        scene.add(glass);
        box(1.2, 0.2, 1.0, mx, 2.0, mz, store.colors.sign);
        for (let k = 0; k < 4; k++) box(0.22, 0.22, 0.22, mx - 0.3 + (k % 2) * 0.5, 1.02, mz - 0.2 + Math.floor(k / 2) * 0.35, ['#ffd36e', '#ff9bb3', '#8fd3c7', '#b9a6f0'][k]);
        block(mx, mz, 1.3, 1.1);
        stations.claw.push({ x: mx, z: mz + 1.1 });
      }
    } else if (store.workshop === 'sauna') {
      // 찜질방: a dome-shaped hot kiln (불가마) on the left, an ice room on
      // the right, and warm wooden platforms with mats in the middle.
      const kx = -w / 2 + 3, kz = -d * 0.05;
      // Walls you can walk into: their own materials, so they turn see-through
      // while you're inside (see the `see` hook below).
      const seeMat = (c) => new THREE.MeshLambertMaterial({ color: c, transparent: true, side: THREE.DoubleSide });
      const wallSeg = (x1, z1, x2, z2, t = 0.3) => { // a thin collider from one point to another
        const len = Math.hypot(x2 - x1, z2 - z1), nx = -(z2 - z1) / len * t / 2, nz = (x2 - x1) / len * t / 2;
        colliders.push({ p: [[x1 + nx, z1 + nz], [x2 + nx, z2 + nz], [x2 - nx, z2 - nz], [x1 - nx, z1 - nz]] });
      };
      const R = 2.4, DOOR = 0.42; // dome radius; half the door opening (radians)
      const domeMat = seeMat('#9a6a45');
      // The dome, open at the doorway (facing +x, into the room).
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 10, DOOR - Math.PI / 2, Math.PI * 2 - DOOR * 2, 0, Math.PI / 2), domeMat);
      dome.position.set(kx, 0, kz);
      scene.add(dome);
      const lintel = new THREE.Mesh(new THREE.SphereGeometry(R, 8, 4, -Math.PI / 2 - DOOR, DOOR * 2, 0, 0.75), domeMat);
      lintel.position.set(kx, 0, kz);
      scene.add(lintel);
      for (let k = 0; k < 14; k++) { // round wall, leaving the doorway open
        const a0 = DOOR + (k / 14) * (Math.PI * 2 - DOOR * 2), a1 = DOOR + ((k + 1) / 14) * (Math.PI * 2 - DOOR * 2);
        wallSeg(kx + Math.cos(a0) * R, kz + Math.sin(a0) * R, kx + Math.cos(a1) * R, kz + Math.sin(a1) * R);
      }
      const ember = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), new THREE.MeshBasicMaterial({ color: '#ff7a2f' }));
      ember.rotation.x = -Math.PI / 2;
      ember.position.set(kx - 0.2, 0.012, kz);
      scene.add(ember); // glowing hot floor stones
      const heat = new THREE.PointLight(0xff8a3d, 6, 6);
      heat.position.set(kx, 1.2, kz);
      scene.add(heat);
      // Benches round the back of the kiln: no backs, you perch on the edge.
      const benches = [];
      const bench = (x, z, ry, color, kind) => {
        const b = new THREE.Group();
        b.position.set(x, 0, z);
        b.rotation.y = ry;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.42), mat(color));
        top.position.y = SEAT_H - 0.035;
        b.add(top);
        for (const lx of [-0.24, 0.24]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, SEAT_H - 0.07, 0.36), mat('#6b4428'));
          leg.position.set(lx, (SEAT_H - 0.07) / 2, 0);
          b.add(leg);
        }
        scene.add(b);
        // Sit facing out (ry), stand up a step in front.
        const fx = Math.sin(ry), fz = Math.cos(ry);
        seats.push({ x: x - fx * 0.04, z: z - fz * 0.04, ry, stand: [x + fx * 0.9, z + fz * 0.9], sauna: kind });
        benches.push(b);
      };
      for (const a of [-0.75, 0, 0.75]) { // angle round the back wall (facing the door)
        const bx = kx - Math.cos(a) * 1.75, bz2 = kz + Math.sin(a) * 1.75;
        bench(bx, bz2, Math.atan2(kx + 1 - bx, kz - bz2), '#c9935f', 'hot');
      }
      // Ice room: four walls of ice and a roof, door facing into the room.
      const ix = w / 2 - 2.4, IW = 3.4, ID = 3.6, IH = 2.8;
      const iceMat = seeMat('#dff4ff');
      const iceRoom = new THREE.Group();
      const slab = (sx, sy, sz, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), iceMat);
        m.position.set(x, y, z);
        iceRoom.add(m);
      };
      slab(0.2, IH, ID, ix + IW / 2, IH / 2, kz); // back
      for (const sz of [-1, 1]) slab(IW, IH, 0.2, ix, IH / 2, kz + sz * ID / 2); // sides
      for (const sz of [-1, 1]) slab(0.2, IH, (ID - 1.2) / 2, ix - IW / 2, IH / 2, kz + sz * (ID + 1.2) / 4); // front, with a door gap
      slab(0.2, IH - 2, 1.2, ix - IW / 2, 2 + (IH - 2) / 2, kz); // over the door
      slab(IW + 0.2, 0.2, ID + 0.2, ix, IH, kz); // roof
      scene.add(iceRoom);
      wallSeg(ix + IW / 2, kz - ID / 2, ix + IW / 2, kz + ID / 2, 0.25);
      for (const sz of [-1, 1]) {
        wallSeg(ix - IW / 2, kz + sz * ID / 2, ix + IW / 2, kz + sz * ID / 2, 0.25);
        wallSeg(ix - IW / 2, kz + sz * 0.6, ix - IW / 2, kz + sz * ID / 2, 0.25);
      }
      for (let i = 0; i < 6; i++) box(0.12, 0.35 + (i % 3) * 0.12, 0.12, ix - 1.6 + i * 0.6, 2.62 - (i % 3) * 0.06, kz - 1.85, '#ffffff'); // icicles
      // Frost: pale patches on the inside walls, and a cold blue light.
      const frostMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      for (let i = 0; i < 9; i++) {
        const f = new THREE.Mesh(new THREE.CircleGeometry(0.18 + (i % 3) * 0.08, 7), frostMat);
        const side = i % 3;
        if (side === 0) { f.position.set(ix + IW / 2 - 0.11, 0.4 + (i * 0.73) % 2.1, kz - 1.3 + (i * 0.61) % 2.6); f.rotation.y = -Math.PI / 2; }
        else { f.position.set(ix - 1.2 + (i * 0.53) % 2.4, 0.4 + (i * 0.47) % 2.1, kz + (side === 1 ? -1 : 1) * (ID / 2 - 0.11)); }
        iceRoom.add(f);
      }
      const cold = new THREE.PointLight(0x9fd8ff, 4, 5);
      cold.position.set(ix, 1.8, kz);
      scene.add(cold);
      for (const sz of [-0.8, 0.8]) bench(ix + IW / 2 - 0.45, kz + sz, -Math.PI / 2, '#bfe3f5', 'ice');
      // Steam in the kiln and cold mist in the ice room: soft puffs that
      // drift (up in the heat, slowly down in the cold) and fade.
      const puffTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      const puffs = [];
      const addPuffs = (n, cx, cz, rx, rz, color, kind) => {
        for (let i = 0; i < n; i++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, depthWrite: false, opacity: 0 }));
          sp.userData = { cx, cz, rx, rz, kind, t: i / n };
          scene.add(sp);
          puffs.push(sp);
        }
      };
      addPuffs(22, kx, kz, 1.6, 1.6, '#ffffff', 'steam');
      addPuffs(6, kx + R + 0.1, kz, 0.2, 0.5, '#ffffff', 'steam'); // escaping at the door
      addPuffs(16, ix, kz, 1.4, 1.5, '#e6f7ff', 'mist');
      let st = 0;
      animate = (dt) => {
        st += dt;
        heat.intensity = 6 + Math.sin(st * 3) * 0.6;
        for (const sp of puffs) {
          const u = sp.userData;
          u.t = (u.t + dt / (u.kind === 'steam' ? 3.2 : 6)) % 1;
          const seed = puffs.indexOf(sp) * 12.9898;
          const ox = Math.sin(seed) * u.rx, oz = Math.cos(seed * 1.7) * u.rz;
          const wob = Math.sin(st * 0.8 + seed) * 0.15;
          if (u.kind === 'steam') {
            sp.position.set(u.cx + ox * 0.7 + wob, 0.3 + u.t * 2, u.cz + oz * 0.7);
            sp.scale.setScalar(0.5 + u.t * 1.1);
            sp.material.opacity = Math.sin(u.t * Math.PI) * 0.5;
          } else {
            sp.position.set(u.cx + ox * 0.8 + wob, 2.3 - u.t * 1.9, u.cz + oz * 0.8);
            sp.scale.setScalar(0.7 + u.t * 0.6);
            sp.material.opacity = Math.sin(u.t * Math.PI) * 0.35;
          }
        }
      };
      // Inside a room: its walls turn see-through so the camera sees you.
      see = (px, pz) => {
        const inKiln = Math.hypot(px - kx, pz - kz) < R + 0.2;
        const inIce = Math.abs(px - ix) < IW / 2 + 0.2 && Math.abs(pz - kz) < ID / 2 + 0.2;
        for (const [m, on] of [[domeMat, inKiln], [iceMat, inIce]]) {
          const o = on ? 0.22 : 1;
          if (m.opacity !== o) { m.opacity = o; m.depthWrite = !on; }
        }
      };
      // Warm platforms (평상) with mats and wooden block pillows (목침).
      const mats = ['#f2a7a0', '#a7d8c0', '#f6d28b', '#b9c4f0'];
      [-4.5, -1.5, 1.5].forEach((px, i) => {
        const pz = d * 0.22;
        box(2, 0.42, 1.1, px, 0.21, pz, '#c9935f');
        box(1.9, 0.05, 1.0, px, 0.445, pz, mats[i % mats.length]);
        box(0.4, 0.14, 0.22, px, 0.53, pz - 0.38, '#8a5a3a');
        for (const o of [-0.5, 0.5]) seats.push({ x: px + o, z: pz, ry: 0, stand: [px + o, pz + 1.1] });
        block(px, pz, 2.1, 1.2);
      });
    } else if (store.workshop === 'gym') {
      // 헬스장: treadmills on the back wall, a bench press, a dumbbell rack,
      // push-up mats, and a long mirror.
      const bz = -d / 2 + 1.4;
      stations.gym = [];
      for (const tx of [-7, -4]) {
        box(1, 0.18, 2.2, tx, 0.09, bz, '#3a3f47'); // deck
        box(0.85, 0.02, 1.9, tx, 0.19, bz, '#1d1f24'); // belt
        for (const sx2 of [-0.45, 0.45]) box(0.08, 1.2, 0.08, tx + sx2, 0.7, bz - 0.9, '#9ca9af');
        box(1, 0.3, 0.35, tx, 1.35, bz - 0.9, '#3a3f47'); // console
        block(tx, bz - 0.9, 1.1, 0.5);
        stations.gym.push({ x: tx, z: bz + 0.2, kind: 'treadmill' });
      }
      // Bench press: bench, rack posts and a bar with plates.
      const px = 1.5, pz = bz + 0.6;
      box(0.45, 0.45, 1.6, px, 0.225, pz, '#c8463c');
      for (const sx2 of [-0.7, 0.7]) box(0.08, 1.3, 0.08, px + sx2, 0.65, pz - 0.6, '#9ca9af');
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2, 8), mat('#c9ced3'));
      bar.rotation.z = Math.PI / 2;
      bar.position.set(px, 1.2, pz - 0.6);
      scene.add(bar);
      const racked = [bar]; // (hidden while someone has the bar: model-pack.js gives them their own)
      for (const sx2 of [-0.85, 0.85]) {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 18), mat('#2b2b2e'));
        plate.rotation.z = Math.PI / 2;
        plate.position.set(px + sx2, 1.2, pz - 0.6);
        scene.add(plate);
        racked.push(plate);
      }
      block(px, pz, 1.6, 1.8);
      // You lie on the bench (head under the rack) while you lift.
      stations.gym.push({ x: px + 1.1, z: pz, kind: 'bench', lie: { x: px, z: pz, ry: 0 } });
      stations.benchBar = racked;
      // Dumbbell rack on the right wall.
      const rx = w / 2 - 0.8, rz = -d * 0.12;
      box(0.7, 0.8, 2.6, rx, 0.4, rz, '#4a4f57');
      for (let i = 0; i < 5; i++) {
        const dz = rz - 1 + i * 0.5;
        box(0.5, 0.06, 0.06, rx, 0.9, dz, '#c9ced3');
        for (const sx2 of [-0.22, 0.22]) box(0.1, 0.16 + i * 0.02, 0.16 + i * 0.02, rx + sx2, 0.9, dz, '#2b2b2e');
      }
      block(rx, rz, 0.8, 2.7);
      stations.gym.push({ x: rx - 1.3, z: rz, kind: 'dumbbell' });
      // Exercise mats (flat, you stand on them): two rows of push-up and
      // sit-up mats.
      for (const [row, mz] of [[0, d * 0.12], [1, d * 0.12 + 2.4]]) {
        [-8, -5.5, -3].forEach((mx, i) => {
          const kind = (i + row) % 2 ? 'situp' : 'pushup';
          box(1, 0.04, 1.9, mx, 0.02, mz, kind === 'pushup' ? '#8fd3c7' : '#b9a6f0');
          stations.gym.push({ x: mx, z: mz, kind });
        });
      }
      // Pull-up bars (철봉): two posts and a bar you hang from.
      for (const px2 of [4, 6.6]) {
        const pz2 = d * 0.06;
        for (const s2 of [-0.65, 0.65]) box(0.1, 2.3, 0.1, px2 + s2, 1.15, pz2, '#4a4f57');
        const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 10), mat('#c9ced3'));
        pb.rotation.z = Math.PI / 2;
        pb.position.set(px2, 2.05, pz2);
        scene.add(pb);
        box(1.4, 0.03, 0.9, px2, 0.015, pz2, '#2b2b2e'); // rubber floor
        for (const s2 of [-0.65, 0.65]) block(px2 + s2, pz2, 0.15, 0.15);
        stations.gym.push({ x: px2, z: pz2 + 0.05, kind: 'pullup', bar: true });
      }
      // The trainer, by the mats.
      trainer = { x: -1.2, z: d * 0.12 + 1.2, ry: -Math.PI / 2 };
      // A long mirror on the left wall.
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshLambertMaterial({ color: '#cfe6f2' }));
      mirror.position.set(-w / 2 + 0.03, 1.5, -d * 0.1);
      mirror.rotation.y = Math.PI / 2;
      scene.add(mirror);
    } else if (store.workshop === 'yoga') {
      // 숨 요가·필라테스: a yoga floor on the left (the instructor's mat at
      // the front by the mirror, rows of mats facing her) and pilates
      // reformers on the right. Some members are already in class; the
      // middle stays clear from the door.
      stations.studio = [];
      box(9.4, 0.012, 12, -5.75, 0.006, -0.6, '#e7dccb'); // the yoga floor (a soft rug)
      box(8.6, 0.012, 12, 5.9, 0.006, -0.6, '#dfe6e3'); // the pilates floor
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshLambertMaterial({ color: '#d4e8f1' }));
      mirror.position.set(-5.75, 1.4, -d / 2 + 0.03);
      scene.add(mirror);
      const yogaMat = (x, z, color) => {
        box(0.72, 0.03, 1.9, x, 0.015, z, color);
        box(0.6, 0.032, 0.04, x, 0.016, z - 0.85, '#ffffff'); // a stripe at the top end
      };
      // The instructor's mat, facing the class.
      yogaMat(-5.75, -6.1, '#9b7fd1');
      stations.instructor = { x: -5.75, z: -6.1, ry: 0 };
      const matColors = ['#8fc9b4', '#f2b8a2', '#a9c4ef', '#f3d78a', '#c8b3ea'];
      const members = new Set(['-8.5,-3', '-3,-3', '-5.75,-0.2', '-8.5,2.6']); // mats with someone on them
      let n = 0;
      for (const z of [-3, -0.2, 2.6]) {
        for (const x of [-8.5, -5.75, -3]) {
          yogaMat(x, z, matColors[n++ % matColors.length]);
          stations.studio.push({ x, z, kind: 'yoga', face: Math.PI, npc: members.has(`${x},${z}`) });
        }
      }
      // Reformers: a long frame, rails, a sliding padded carriage with
      // shoulder rests at the head end (-z) and a foot bar with springs.
      const reformer = (x, z) => {
        box(0.78, 0.22, 2.5, x, 0.11, z, '#efe9de');
        for (const s2 of [-0.33, 0.33]) box(0.06, 0.05, 2.5, x + s2, 0.245, z, '#b8bec4');
        box(0.62, 0.09, 1.1, x, 0.31, z - 0.3, '#3f7f82'); // carriage
        for (const s2 of [-0.17, 0.17]) box(0.1, 0.16, 0.1, x + s2, 0.43, z - 0.88, '#3f7f82'); // shoulder rests
        box(0.3, 0.06, 0.18, x, 0.38, z - 0.93, '#3f7f82'); // headrest
        for (const s2 of [-0.34, 0.34]) box(0.05, 0.5, 0.05, x + s2, 0.47, z + 1.05, '#b8bec4');
        const fb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.74, 10), mat('#d6dbe0'));
        fb.rotation.z = Math.PI / 2;
        fb.position.set(x, 0.72, z + 1.05);
        scene.add(fb);
        for (const s2 of [-0.18, -0.06, 0.06, 0.18]) { // springs
          const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), mat(s2 < 0 ? '#e0566b' : '#f2b84b'));
          sp.rotation.x = Math.PI / 2;
          sp.position.set(x + s2, 0.2, z + 0.62);
          scene.add(sp);
        }
        block(x, z, 0.85, 2.6);
      };
      const busy = new Set(['3.5,-4.2', '7.8,1.4']);
      for (const z of [-4.2, 1.4]) {
        for (const x of [3.5, 7.8]) {
          reformer(x, z);
          stations.studio.push({ x: x - 0.85, z, kind: 'reformer', lie: { x, z, ry: 0 }, npc: busy.has(`${x},${z}`) });
        }
      }
      // A shelf of rolled-up mats and foam blocks by the yoga floor, plants in
      // the corners, and the two room names on the side walls.
      box(0.5, 1.1, 2.2, -w / 2 + 0.3, 0.55, d / 2 - 3, '#c9a27a');
      block(-w / 2 + 0.3, d / 2 - 3, 0.6, 2.3);
      for (let i = 0; i < 5; i++) {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 12), mat(matColors[i]));
        roll.rotation.z = Math.PI / 2;
        roll.position.set(-w / 2 + 0.3, 1.2, d / 2 - 3.9 + i * 0.42);
        scene.add(roll);
      }
      for (let i = 0; i < 3; i++) box(0.22, 0.12, 0.3, -w / 2 + 0.3, 0.75, d / 2 - 3.6 + i * 0.6, '#9b7fd1');
      for (const [x, z] of [[-w / 2 + 0.7, d / 2 - 0.9], [-w / 2 + 0.7, -d / 2 + 0.7], [w / 2 - 0.7, -d / 2 + 0.7]]) {
        box(0.5, 0.5, 0.5, x, 0.25, z, '#d8cbb8');
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), mat('#6f9e6a'));
        leaf.position.set(x, 0.95, z);
        scene.add(leaf);
        block(x, z, 0.6, 0.6);
      }
      for (const [text, x, ry] of [['요가 · YOGA', -w / 2 + 0.03, Math.PI / 2], ['필라테스 · PILATES', w / 2 - 0.03, -Math.PI / 2]]) {
        const c2 = document.createElement('canvas');
        c2.width = 1024; c2.height = 160;
        const g2 = c2.getContext('2d');
        g2.fillStyle = store.colors.sign;
        fitText(g2, text, 110, 1000);
        g2.textAlign = 'center';
        g2.textBaseline = 'middle';
        g2.fillText(text, 512, 84);
        const tx2 = new THREE.CanvasTexture(c2);
        tx2.colorSpace = THREE.SRGBColorSpace;
        const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.66), new THREE.MeshBasicMaterial({ map: tx2, transparent: true }));
        sign2.position.set(x, 2.9, -1);
        sign2.rotation.y = ry;
        scene.add(sign2);
      }
    } else if (store.workshop === 'japchae') {
      // Suragan Cooking Class: a long cooking table with a burner and a pan
      // at each place, bowls of coloured vegetables down the middle, and a
      // big mixing bowl at the far end. The teacher stands at the head.
      const tz = -d * 0.06, tw = Math.min(7, w - 8);
      box(tw, 0.08, 1.6, 0, 0.7, tz, '#d9d2c4'); // stainless-look top
      box(tw, 0.62, 1.5, 0, 0.33, tz, '#8a5a3a');
      block(0, tz, tw, 1.6);
      const spots = [], rolls = [];
      const vegCol = ['#f08a2c', '#3f8f3f', '#d8402c', '#7a5236', '#f3e7c9', '#ffd23a'];
      for (let k = 0; k < 3; k++) {
        const x = (k - 1) * (tw / 3.2);
        // Back side: a burner and a pan (japchae).
        const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), mat('#2b2b2e'));
        burner.position.set(x, 0.76, tz - 0.42);
        scene.add(burner);
        const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.07, 18, 1, true), mat('#3a3a3e', { side: THREE.DoubleSide }));
        pan.position.set(x, 0.82, tz - 0.42);
        scene.add(pan);
        box(0.3, 0.025, 0.04, x + 0.36, 0.84, tz - 0.42, '#3a3a3e'); // handle
        spots.push({ x, z: tz - 1.3 });
        // Front side: a bamboo mat (김발) with a sheet of gim and rice (kimbap).
        box(0.5, 0.02, 0.44, x, 0.75, tz + 0.42, '#c9b27a');
        box(0.42, 0.012, 0.36, x, 0.767, tz + 0.42, '#1f2a1c');
        box(0.38, 0.03, 0.24, x, 0.782, tz + 0.37, '#f4f1e8');
        rolls.push({ x, z: tz + 1.3 });
        // Little bowls of sliced vegetables between the places.
        for (let j = 0; j < 2; j++) {
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.07, 12), mat('#f7f3ea'));
          bowl.position.set(x - 0.15 + j * 0.3, 0.78, tz);
          scene.add(bowl);
          const veg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), mat(vegCol[(k * 2 + j) % vegCol.length]));
          veg.position.set(x - 0.15 + j * 0.3, 0.82, tz);
          scene.add(veg);
        }
      }
      stations.japchae = spots;
      stations.kimbap = rolls;
      stations.classTeacher = { x: -tw / 2 - 0.7, z: tz, ry: Math.PI / 2 };
      // The big mixing bowl with glossy noodles at the far end.
      const big = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#e9e4da', { side: THREE.DoubleSide }));
      big.position.set(tw / 2 + 1.1, 1.0, tz);
      scene.add(big);
      const noodles = new THREE.Mesh(new THREE.CircleGeometry(0.38, 18).rotateX(-Math.PI / 2), mat('#9a6a45'));
      noodles.position.set(tw / 2 + 1.1, 0.88, tz);
      scene.add(noodles);
      box(0.9, 0.55, 0.9, tw / 2 + 1.1, 0.28, tz, '#8a5a3a'); // its stand
      block(tw / 2 + 1.1, tz, 1, 1);
      // A low stone ledge of sauce jars (간장 · soy sauce) by the front-left wall.
      const jx0 = -w / 2 + 1.2, jz = d / 2 - 1.9;
      box(5, 0.2, 1.1, jx0 + 2.1, 0.1, jz, '#9a9488');
      [0.42, 0.32, 0.46, 0.3].forEach((r, k) => {
        const jx = jx0 + k * 1.2;
        const pot = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat('#4a2c1c'));
        pot.scale.set(1, 1.15, 1);
        pot.position.set(jx, 0.2 + r * 1.1, jz);
        scene.add(pot);
      });
      block(jx0 + 2.1, jz, 5, 1.2);
    } else if (store.workshop === 'kimchi') {
      // Sonmat Kimchi School: a long low work table with cabbages, bowls of
      // red seasoning and a salt sack; a big red rubber tub (고무대야) of
      // salted cabbage; a row of onggi jars (장독) by the front wall. The
      // teacher stands at the head of the table; students stand along it.
      const tz = -d * 0.06, tw = Math.min(7, w - 8);
      box(tw, 0.08, 1.5, 0, 0.7, tz, '#c9955a'); // table top
      for (const lx of [-tw / 2 + 0.3, tw / 2 - 0.3]) for (const lz of [-0.55, 0.55]) box(0.1, 0.7, 0.1, lx, 0.35, tz + lz, '#8a5a3a');
      block(0, tz, tw, 1.5);
      const spots = [];
      for (let k = 0; k < 3; k++) {
        const x = (k - 1) * (tw / 3.2);
        // On the table at each place: a cabbage half, a bowl of seasoning.
        const cab = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat('#c8e6a0'));
        cab.scale.set(1.5, 0.7, 0.9);
        for (const sz of [-1, 1]) {
          const c2 = cab.clone();
          c2.position.set(x - 0.2, 0.86, tz + sz * 0.42);
          scene.add(c2);
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.12, 16), mat('#f3eee4'));
          bowl.position.set(x + 0.35, 0.8, tz + sz * 0.42);
          scene.add(bowl);
          const red = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), mat('#c8321f'));
          red.position.set(x + 0.35, 0.86, tz + sz * 0.42);
          scene.add(red);
          spots.push({ x, z: tz + sz * 1.25 });
        }
      }
      stations.kimchi = spots;
      stations.kimchiTeacher = { x: -tw / 2 - 0.7, z: tz, ry: Math.PI / 2 };
      // Salt sack at the far end.
      const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.55, 12), mat('#efe6d2'));
      sack.position.set(tw / 2 + 0.7, 0.28, tz - 0.4);
      scene.add(sack);
      // The red rubber tub with salted cabbages in it.
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 0.5, 24, 1, true), mat('#d8352a', { side: THREE.DoubleSide }));
      tub.position.set(tw / 2 + 1.6, 0.25, tz + 0.7);
      scene.add(tub);
      const brine = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24).rotateX(-Math.PI / 2), mat('#e6f0c8'));
      brine.position.set(tw / 2 + 1.6, 0.4, tz + 0.7);
      scene.add(brine);
      block(tw / 2 + 1.6, tz + 0.5, 1.8, 2.2);
      // Onggi jars of different sizes on a low stone ledge, front-left.
      const jx0 = -w / 2 + 1.2, jz = d / 2 - 1.9;
      box(Math.min(6, w / 2 - 2.5), 0.2, 1.1, jx0 + Math.min(6, w / 2 - 2.5) / 2 - 0.4, 0.1, jz, '#9a9488');
      [0.5, 0.38, 0.55, 0.32, 0.45].forEach((r, k) => {
        const jx = jx0 + k * 1.15;
        if (jx > -2.2) return; // keep the door path clear
        const pot = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat('#5a3422'));
        pot.scale.set(1, 1.15, 1);
        pot.position.set(jx, 0.2 + r * 1.1, jz);
        scene.add(pot);
        const lidM = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.6, 0.08, 16), mat('#4a2a1a'));
        lidM.position.set(jx, 0.2 + r * 2.2, jz);
        scene.add(lidM);
      });
      block(jx0 + 2.4, jz, 5.4, 1.2);
    } else if (store.workshop === 'emblem') {
      // Name tag workshops: the same emblems and name colours everywhere, a
      // different room. "leather": a craft bench and a pegboard of stitched
      // leather tags (Seongsu). "neon": glowing tube signs and a sticker wall
      // (Hongdae).
      const neon = store.theme === 'neon';
      const wz = -d / 2 + 0.06;
      if (neon) {
        box(w - 1.2, 2.2, 0.04, 0, 1.75, wz, '#1b1830'); // dark back panel
        const tubes = ['#ff3ea5', '#3ef0ff', '#ffe23e', '#9b5bff', '#3eff8b'];
        for (let i = 0; i < 5; i++) {
          const tube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: tubes[i] }));
          tube.position.set((i - 2) * 1.4, 1.3 + (i % 2) * 0.7, wz + 0.05);
          tube.rotation.z = (i % 2 ? 1 : -1) * 0.25;
          scene.add(tube);
        }
        for (let i = 0; i < 18; i++) { // stickers on the side walls
          const c = tubes[i % tubes.length];
          box(0.04, 0.3, 0.3, -w / 2 + 0.1, 0.9 + (i % 3) * 0.55, -d / 2 + 1.2 + Math.floor(i / 3) * 0.55, c);
        }
        const glow = new THREE.PointLight(0xff4fd8, 6, 7);
        glow.position.set(0, 2.2, -d / 2 + 1.2);
        scene.add(glow);
      } else {
        box(w - 2, 1.8, 0.05, 0, 1.6, wz, '#c89b6d'); // pegboard
        const hides = ['#8a5a3a', '#b5763c', '#5b3a26', '#d2a46c', '#3f2a1e'];
        for (let i = 0; i < 14; i++) { // leather tags hanging on pegs
          const tx = -w / 2 + 1.6 + (i % 7) * ((w - 3.2) / 6), ty = 1.15 + Math.floor(i / 7) * 0.8;
          box(0.36, 0.22, 0.03, tx, ty, wz + 0.05, hides[i % hides.length]);
          box(0.05, 0.05, 0.05, tx, ty + 0.16, wz + 0.05, '#d4b45a'); // brass ring
        }
        box(2.4, 0.08, 0.9, -w / 2 + 2, 0.82, -d / 2 + 1.6, '#9a6b42'); // craft bench
        for (const lx of [-w / 2 + 0.9, -w / 2 + 3.1]) box(0.1, 0.8, 0.8, lx, 0.4, -d / 2 + 1.6, '#6b4a34');
        block(-w / 2 + 2, -d / 2 + 1.6, 2.4, 0.9);
      }
    } else if (store.workshop === 'fishmarket') {
      // Ice tables with fish on them.
      const fish = ['#8fa6b8', '#c7d1d9', '#e07a5f', '#5f7f9f', '#d9824f'];
      for (const tx of [-w / 4, w / 4]) {
        const tz = -d / 6;
        box(2.6, 0.85, 1.2, tx, 0.42, tz, '#4f86b0');
        box(2.5, 0.08, 1.1, tx, 0.88, tz, '#eef7fb'); // ice
        for (let i = 0; i < 6; i++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(fish[i % fish.length]));
          f.scale.set(2.4, 0.6, 0.9);
          f.position.set(tx - 0.95 + (i % 3) * 0.95, 0.96, tz - 0.25 + Math.floor(i / 3) * 0.5);
          f.rotation.y = 0.3 * (i % 2 ? 1 : -1);
          scene.add(f);
        }
        block(tx, tz, 2.7, 1.3);
      }
    }
    if (store.workshop === 'info') {
      // Information Center: one long desk across the back of the room, right
      // in front of you as you come in, with two guides behind it facing the
      // door: game help on the left, the neighbourhood guide on the right.
      const dz = -d / 2 + 2.4, dw = Math.min(5.6, w - 3);
      box(dw, COUNTER_H + 0.1, 0.8, 0, (COUNTER_H + 0.1) / 2, dz, '#fffaf0');
      box(dw + 0.1, 0.06, 0.9, 0, COUNTER_H + 0.13, dz, store.colors.sign); // desk top
      for (const [gx, color] of [[-dw / 4, '#f2a33a'], [dw / 4, '#3fa66b']]) {
        box(0.5, 0.36, 0.04, gx, COUNTER_H + 0.42, dz + 0.3, color); // name plates on the desk
        box(0.42, 0.28, 0.3, gx + 0.55, COUNTER_H + 0.3, dz - 0.15, '#3a3f4a'); // screens
      }
      block(0, dz, dw, 0.8);
      clerk = { x: -dw / 4, z: dz - 0.85, ry: 0 }; // game guide
      stations.areaGuide = { x: dw / 4, z: dz - 0.85, ry: 0 }; // neighbourhood guide
      block(dw / 4, dz - 0.85, 0.6, 0.5);
    } else if (store.workshop === 'bank') {
      // Bank: three teller windows behind glass across the back, each with a
      // number display above it; the middle one is the open teller. Waiting
      // chairs on the left, a number ticket machine by the door, two ATMs on
      // the right wall, and a few customers already here.
      const dz = -d / 2 + 2.4, dw = Math.min(9, w - 4), win = dw / 3;
      box(dw, COUNTER_H + 0.1, 0.8, 0, (COUNTER_H + 0.1) / 2, dz, '#f4f6f5');
      box(dw + 0.1, 0.06, 0.9, 0, COUNTER_H + 0.13, dz, store.colors.sign); // counter top
      const glass = new THREE.MeshLambertMaterial({ color: '#d6efe8', transparent: true, opacity: 0.3, depthWrite: false });
      const plane = (pw, ph, tex) => new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex }));
      for (let i = 0; i < 3; i++) {
        const wx = (i - 1) * win;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(win - 0.5, 0.75), glass); // glass over the counter, a gap below to pass things
        pane.position.set(wx, COUNTER_H + 0.65, dz + 0.1);
        scene.add(pane);
        const num = plane(0.9, 0.22, labelTexture(String(127 + i * 38).padStart(4, '0'), '#1b1b1b'));
        num.position.set(wx, 2.05, dz + 0.1);
        scene.add(num);
        const tag = plane(0.8, 0.16, labelTexture(`${i + 1}번 창구 · Window ${i + 1}`, store.colors.sign));
        tag.position.set(wx, 1.8, dz + 0.1);
        scene.add(tag);
        box(0.42, 0.28, 0.3, wx + 0.5, COUNTER_H + 0.3, dz - 0.2, '#3a3f4a'); // screens
      }
      for (let i = 0; i <= 3; i++) box(0.06, 1.3, 0.8, -dw / 2 + i * win, COUNTER_H + 0.75, dz, '#c9d3cf'); // partitions
      box(dw, 0.12, 0.8, 0, 2.2, dz, store.colors.sign); // header over the windows
      block(0, dz, dw, 0.8);
      clerk = { x: 0, z: dz - 0.85, ry: 0 }; // the open window
      // Waiting chairs, two rows facing the windows.
      for (const rz of [-0.1, 1.3]) for (let i = 0; i < 4; i++) {
        const cx = -w / 2 + 1.6 + i * 0.95;
        box(0.7, SEAT_H, 0.6, cx, SEAT_H / 2, rz, store.colors.awning);
        box(0.7, 0.5, 0.1, cx, SEAT_H + 0.25, rz + 0.3, store.colors.awning);
        seats.push({ x: cx, z: rz, ry: Math.PI, stand: [cx, rz - 0.75] });
      }
      block(-w / 2 + 1.6 + 1.425, -0.1, 3.9, 0.7);
      block(-w / 2 + 1.6 + 1.425, 1.3, 3.9, 0.7);
      // Number ticket machine (번호표) by the door.
      const tx = 2, tz = d / 2 - 1.6;
      box(0.5, 1.2, 0.4, tx, 0.6, tz, '#e9edf0');
      box(0.36, 0.2, 0.02, tx, 1.0, tz - 0.21, '#d93a3a');
      const ticket = plane(0.9, 0.16, labelTexture('번호표 · Take a number', '#d93a3a'));
      ticket.position.set(tx, 1.45, tz - 0.21);
      ticket.rotation.y = Math.PI;
      scene.add(ticket);
      block(tx, tz, 0.6, 0.5);
      // ATMs on the right wall, facing into the room.
      for (const az of [-0.4, 1.0]) {
        const ax = w / 2 - 0.55;
        box(0.7, 1.5, 0.9, ax, 0.75, az, '#5f6b73');
        const screen = box(0.04, 0.32, 0.42, ax - 0.36, 1.2, az, '#2fb38a');
        screen.material = new THREE.MeshBasicMaterial({ color: '#2fb38a' });
        box(0.2, 0.06, 0.5, ax - 0.4, 0.95, az, '#3b444a'); // keypad shelf
        block(ax, az, 0.8, 1);
      }
      const atm = plane(1, 0.16, labelTexture('ATM', store.colors.sign));
      atm.position.set(w / 2 - 0.08, 2.0, 0.3);
      atm.rotation.y = -Math.PI / 2;
      scene.add(atm);
      // Customers already here: one at window 1, one at window 3, one at an ATM
      // (main.js stands them up). The middle window stays free for you.
      stations.visitors = [
        { x: -win, z: dz + 0.85, ry: Math.PI },
        { x: win, z: dz + 0.85, ry: Math.PI },
        { x: w / 2 - 1.45, z: -0.4, ry: Math.PI / 2 },
      ];
      for (const v of stations.visitors) block(v.x, v.z, 0.5, 0.5);
    } else if (store.workshop === 'tarot') {
      clerk = stations.tarotReader; // no shop counter: the reader sits at her table
    } else if (!store.cinema) { // (the cinema's clerk is at its popcorn stand, below)
      const cx = Math.min(4.2, sx - 2), cz = d / 2 - 2.3;
      box(2.2, COUNTER_H, 0.8, cx, COUNTER_H / 2, cz, '#fffaf0'); // counter
      box(0.35, 0.25, 0.25, cx + 0.4, COUNTER_H + 0.12, cz, '#4a3f35'); // till
      block(cx, cz, 2.2, 0.8);
      clerk = stations.kimchiTeacher || stations.classTeacher || { x: cx, z: cz + 0.75, ry: Math.PI };
    }
  }
  // Plants in the corners.
  if (store.category !== 'home' && !store.cinema) for (const [px, pz] of [[-w / 2 + 0.7, -d / 2 + 0.7], [w / 2 - 0.7, -d / 2 + 0.7], [-w / 2 + 0.7, d / 2 - 0.9]]) {
    box(0.5, 0.5, 0.5, px, 0.25, pz, '#c98b4f');
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat('#8fcf7a'));
    leaf.position.set(px, 1.0, pz);
    scene.add(leaf);
    block(px, pz, 0.7, 0.7);
  }

  // Room bounds as thin wall colliders.
  const t = 0.4;
  block(0, -d / 2 - t / 2 + 0.2, w, t);
  block(0, d / 2 + t / 2 - 0.2, w, t);
  block(-w / 2 + 0.2 - t / 2, 0, t, d);
  block(w / 2 - 0.2 + t / 2, 0, t, d);

  if (clerk) block(clerk.x, clerk.z, 0.6, 0.5); // don't walk through the clerk
  // Music café: a record player on a cabinet, with a crate of LPs beside it.
  let turntable = null;
  if (store.music) {
    const tx = -w / 2 + 1.3, tz = d / 2 - 2.6;
    box(1.4, 0.8, 0.7, tx, 0.4, tz, '#6b4a34'); // cabinet
    box(0.9, 0.12, 0.6, tx, 0.86, tz, '#2a2a2e'); // player
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24), mat('#111114'));
    platter.position.set(tx - 0.12, 0.93, tz);
    scene.add(platter);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.022, 16), mat(store.colors.sign));
    label.position.set(tx - 0.12, 0.932, tz);
    scene.add(label);
    box(0.03, 0.03, 0.34, tx + 0.28, 0.95, tz - 0.05, '#c9c9cf'); // tone arm
    const crate = ['#e0517a', '#2f8fb0', '#d9a441', '#6d5bd0', '#c0392b'];
    crate.forEach((c, i) => box(0.04, 0.42, 0.42, tx + 0.95 + i * 0.07, 0.31, tz, c)); // LP sleeves
    block(tx + 0.3, tz, 2.1, 0.8);
    turntable = { x: tx, z: tz + 0.9, platter };
    stations.listening = listeningBar(scene, store, w, d, h, box, block);
  }
  // K-POP café: a big TV on the back wall (the video plays in the corner of
  // the screen; this is the room's look). The cinema has a big screen.
  let tv = null;
  if (store.cinema) {
    // Cinema: a big 16:9 screen in a black frame on the back wall, rows of
    // red seats facing it (a middle aisle and a side aisle to walk), dim
    // step lights, and a film kiosk by the door where you pick what's on.
    const sw = Math.min(11.2, w - 3), sh = sw * 9 / 16, sy = h - 0.5 - sh / 2, sz = -d / 2 + 0.25;
    box(sw + 0.5, sh + 0.5, 0.2, 0, sy, sz - 0.05, '#050507');
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: '#2a2833' }));
    glow.position.set(0, sy, sz + 0.07);
    scene.add(glow);
    const seatC = store.colors.seat || store.colors.sign; // seats and curtains
    for (const sx2 of [-1, 1]) box(0.5, h, 0.4, sx2 * (sw / 2 + 0.9), h / 2, sz + 0.1, seatC); // curtains
    box(sw + 1, 0.5, 0.6, 0, 0.25, sz + 0.6, '#1a1820'); // stage step
    block(0, sz + 0.5, sw + 2.4, 1);
    const cols = [-6.4, -5.4, -4.4, -3.4, -2.4, -1.4, 1.4, 2.4, 3.4, 4.4, 5.4, 6.4];
    const rows = 5, z0 = -d / 2 + 5, rowGap = 1.7;
    for (let r = 0; r < rows; r++) {
      const rz = z0 + r * rowGap;
      for (const cx of cols) {
        box(0.78, 0.12, 0.62, cx, SEAT_H - 0.06, rz, seatC); // seat
        box(0.78, 0.66, 0.12, cx, SEAT_H + 0.3, rz + 0.33, seatC); // back
        box(0.08, SEAT_H + 0.18, 0.62, cx - 0.43, (SEAT_H + 0.18) / 2, rz, '#26232c'); // arm
        seats.push({ x: cx, z: rz - 0.02, ry: Math.PI, stand: [cx, rz - 0.85] });
      }
      box(0.08, SEAT_H + 0.18, 0.62, cols[5] + 0.43, (SEAT_H + 0.18) / 2, rz, '#26232c');
      box(0.08, SEAT_H + 0.18, 0.62, cols[cols.length - 1] + 0.43, (SEAT_H + 0.18) / 2, rz, '#26232c');
      // Each half-row is one collider, thin enough to leave a walkway in
      // front of it to stand up into.
      block((cols[0] + cols[5]) / 2, rz + 0.12, cols[5] - cols[0] + 0.95, 0.5);
      block((cols[6] + cols[cols.length - 1]) / 2, rz + 0.12, cols[cols.length - 1] - cols[6] + 0.95, 0.5);
    }
    // Step lights along the aisles.
    const stepMat = new THREE.MeshBasicMaterial({ color: '#ffb84a' });
    for (let r = 0; r <= rows; r++) for (const ax of [-0.55, 0.55, -w / 2 + 1.1, w / 2 - 1.1]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08).rotateX(-Math.PI / 2), stepMat);
      l.position.set(ax, 0.012, z0 - 0.9 + r * rowGap);
      scene.add(l);
    }
    // Film kiosk by the door, left side.
    const kx = -w / 2 + 2.2, kz = d / 2 - 2.4;
    box(1.1, 1.2, 0.6, kx, 0.6, kz, '#1d1b24');
    const kScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ color: store.colors.awning }));
    kScreen.position.set(kx, 1.05, kz + 0.31);
    kScreen.rotation.x = -0.35;
    scene.add(kScreen);
    block(kx, kz, 1.2, 0.7);
    // Popcorn stand on the right.
    const px = w / 2 - 2.4, pz = d / 2 - 2.6;
    box(1.6, COUNTER_H, 0.8, px, COUNTER_H / 2, pz, '#b3262e');
    box(0.6, 0.7, 0.5, px - 0.3, COUNTER_H + 0.35, pz, '#f3e3b0'); // popcorn machine
    box(0.62, 0.08, 0.52, px - 0.3, COUNTER_H + 0.74, pz, '#b3262e');
    block(px, pz, 1.7, 0.9);
    clerk = { x: px, z: pz + 0.75, ry: Math.PI };
    // A soft light over the seats, so people can find a seat in the dark.
    const hall = new THREE.PointLight(0xffd9b0, 10, 22);
    hall.position.set(0, h - 1, d / 4);
    scene.add(hall);
    tv = { x: kx, z: kz + 1.1, screen: glow, width: sw };
    if (store.cinema === 'doodle') drawFlat(scene, glow); // the 2D cinema
  } else if (store.kpop) {
    const tvz = -d / 2 + 0.3;
    box(5.2, 3, 0.2, 0, 2.3, tvz, '#1b1b20');
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.7), new THREE.MeshBasicMaterial({ color: store.colors.awning }));
    glow.position.set(0, 2.3, tvz + 0.11);
    scene.add(glow);
    for (const sx of [-3.2, 3.2]) box(0.6, 1.1, 0.5, sx, 0.55, tvz + 0.4, '#2b2b30'); // speakers
    block(0, tvz + 0.3, 7, 0.9);
    tv = { x: 0, z: tvz + 1.6, screen: glow, width: 4.9 };
  }
  return { scene, products, colliders, seats, clerk, trainer, barkeep, turntable, tv, stations, animate, see, camBlocked, room: ROOM, exit: EXIT, noExit };
}
