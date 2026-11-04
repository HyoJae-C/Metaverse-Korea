// Store interiors: a cosy room built from the store's data, with a display
// for each product. Each interior is its own scene.
import { isDining } from './dining.js';
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeAnimal } from './pets.js';
import { buildPark } from './park.js';
import { buildThemePark } from './themepark.js';
import { buildStation, buildTrainCar, HALL, CAR } from './subway.js';

// Room sizes (metres). A store picks one with "size" in stores.json.
export const ROOM_SIZES = {
  small: { w: 9, d: 8, h: 3.6 },
  medium: { w: 14, d: 11, h: 4 },
  large: { w: 22, d: 16, h: 4.6 },
  park: { w: 36, d: 28, h: 8 }, // outdoor (see park.js)
  station: HALL, // subway station hall (see subway.js)
  train: CAR, // inside a subway car
};
export const roomOf = (store) => ROOM_SIZES[store.size] || ROOM_SIZES.medium;
export const exitOf = (room) => ({ x: 0, z: room.d / 2 - 0.9 });
const SEAT_H = 0.38; // chair seat height, sized for the chibi characters
const COUNTER_H = 0.62; // shop counters: low enough to see the clerk's face over them
const BAR_H = 0.72; // bar counters (club, cocktail bar), with stools

const mats = {};
const mat = (c, opts) => (mats[c + JSON.stringify(opts || {})] ||= new THREE.MeshLambertMaterial({ color: c, ...opts }));

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
export function productModel(kind, color) {
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
    case 'notebook':
      add(new THREE.BoxGeometry(0.3, 0.04, 0.4), 0, 0.02);
      add(new THREE.BoxGeometry(0.28, 0.035, 0.38), 0.01, 0.022, 0, mat('#ffffff'));
      break;
    case 'pen':
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8).rotateZ(Math.PI / 2), 0, 0.02, -0.06 + i * 0.06);
      break;
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
    default:
      add(new THREE.BoxGeometry(0.25, 0.25, 0.25), 0, 0.12);
  }
  return g;
}

const HANGING = new Set(['tee', 'jeans', 'scarf']);

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

// Builds the room. Returns { scene, products: [{ product, mesh, pos }],
// colliders, seats: [{ x, z, ry, stand: [x, z] }], room, exit }.
export function buildInterior(store) {
  const ROOM = roomOf(store);
  const EXIT = exitOf(ROOM);
  if (store.workshop === 'themepark') return buildThemePark(store, ROOM, EXIT);
  if (store.category === 'park') return buildPark(store, ROOM, EXIT);
  if (store.category === 'station') return buildStation(store, ROOM);
  if (store.category === 'train') return buildTrainCar(store, ROOM);
  const scene = new THREE.Scene();
  const accent = new THREE.Color(store.colors.accent);
  // A club or a bar is dark inside, lit by its own lamps (added below).
  const night = store.category === 'club' || store.category === 'bar';
  scene.background = night ? new THREE.Color(store.category === 'club' ? '#0e0a18' : '#1a120d') : accent.clone().multiplyScalar(0.92);
  scene.add(night ? new THREE.HemisphereLight(0xc9b8ff, 0x2a2030, store.category === 'club' ? 0.9 : 0.8) : new THREE.HemisphereLight(0xfff6e8, 0xd9c7b0, 1.7));
  scene.add(new THREE.AmbientLight(0xfff0e0, night ? 0.3 : 0.6));
  const lamp = new THREE.PointLight(0xffe2b8, night ? 6 : 25, Math.max(18, ROOM.w * 1.2));
  lamp.position.set(0, ROOM.h - 0.4, 0);
  scene.add(lamp);

  const { w, d, h } = ROOM;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: floorTexture(store.category === 'fashion' ? '#e9e2d6' : night ? '#3a2c26' : '#d9b48c', ROOM) }),
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

  // Exit door on the front wall.
  // One-sided and facing in, like the walls, so a camera behind the player
  // (outside the front wall) looks through it instead of at a dark slab.
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshLambertMaterial({ color: store.colors.sign }));
  door.rotation.y = Math.PI;
  door.position.set(EXIT.x, 1.2, d / 2 - 0.03);
  scene.add(door);
  const mat2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1).rotateX(-Math.PI / 2), mat(store.colors.awning));
  mat2.position.set(EXIT.x, 0.01, d / 2 - 0.6);
  scene.add(mat2);

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
  if (store.category !== 'home') scene.add(title);

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
  (isDining(store) || counterMenu ? [] : store.products).forEach((product, i) => {
    if (counterSpots) { // on the counter: just the drink, no table
      const [x, z, ry] = counterSpots[i % counterSpots.length];
      const spot = new THREE.Group();
      spot.position.set(x, BAR_H + 0.03, z);
      spot.rotation.y = ry;
      const model = productModel(product.model, product.color);
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
    const model = petKind ? makeAnimal(petKind, product.color, product.accent || '#fff4e6').root : productModel(product.model, product.color);
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
      const copy = productModel(product.model, product.color);
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
  if (store.category === 'library') {
    // Tall bookshelves along the back and side walls, reading tables in the
    // middle (seats below), and a "quiet please" sign. Study content comes later.
    const spines = ['#b5533c', '#3f6e8c', '#d9a441', '#5f8a4e', '#7a4f8c', '#e3d6c0', '#2f3e4f', '#c97b63'];
    const shelf = (x, z, ry, len) => {
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
      const [cx, cz] = Math.abs(Math.sin(ry)) > 0.5 ? [0.6, len] : [len, 0.6];
      block(x, z, cx, cz);
    };
    const nBack = Math.max(2, Math.floor((w - 2) / 2.6));
    for (let i = 0; i < nBack; i++) shelf((i - (nBack - 1) / 2) * 2.6, -d / 2 + 0.45, 0, 2.4);
    const nSide = Math.max(1, Math.floor((d - 5) / 2.6));
    for (let i = 0; i < nSide; i++) {
      const z = -d / 2 + 2.2 + i * 2.6;
      shelf(-w / 2 + 0.45, z, Math.PI / 2, 2.4);
      shelf(w / 2 - 0.45, z, -Math.PI / 2, 2.4);
      for (const sgn of [-1, 1]) (stations.books ||= []).push({ x: sgn * (w / 2 - 1.3), z }); // pick a book here
    }
    for (let i = 0; i < nBack; i++) stations.books.push({ x: (i - (nBack - 1) / 2) * 2.6, z: -d / 2 + 1.3 });
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
    sign.position.set(-w / 2 + 0.05, 2.9, 0);
    sign.rotation.y = Math.PI / 2;
    scene.add(sign);
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
    const cz = -d / 2 + 2.2;
    box(8.6, BAR_H, 0.8, 0, BAR_H / 2, cz, '#3b2418');
    box(8.8, 0.07, 0.95, 0, BAR_H + 0.01, cz, '#8a5a3a');
    block(0, cz, 8.8, 0.95);
    clerk = { x: 0.6, z: cz - 1.0, ry: 0 }; // the bartender
    // Back shelves with bottles.
    for (const y of [1.25, 1.85, 2.45]) {
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
    // Two small tables with candles.
    for (const tx of [-w / 2 + 2.2, w / 2 - 2.2]) {
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
        const chx = tx + 0.85 * s2;
        box(0.42, 0.06, 0.42, chx, SEAT_H - 0.03, tz, '#6b2f2f');
        box(0.08, 0.5, 0.42, chx + 0.2 * s2, SEAT_H + 0.22, tz, '#6b2f2f');
        seats.push({ x: chx + 0.04 * s2, z: tz, ry: s2 > 0 ? -Math.PI / 2 : Math.PI / 2, stand: [chx, tz + 0.9] });
      }
      block(tx, tz, 2.3, 0.95);
    }
    let t = 0;
    const flames = [];
    scene.traverse((o) => { if (o.isPointLight && o.distance === 3.5) flames.push(o); });
    animate = (dt) => {
      t += dt;
      flames.forEach((f, i) => { f.intensity = 2.2 + Math.sin(t * 9 + i * 2) * 0.35 + Math.sin(t * 23 + i) * 0.15; });
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
      const props = { salon: ['#f29bb6', '#4f7fd6', '#e8c27a'], lens: ['#3fc6d0', '#8a5cc9', '#4a9a5c'], lips: ['#d94c5f', '#ff8fb1', '#a8325e'] }[store.workshop];
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
      for (const sx2 of [-0.85, 0.85]) {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 18), mat('#2b2b2e'));
        plate.rotation.z = Math.PI / 2;
        plate.position.set(px + sx2, 1.2, pz - 0.6);
        scene.add(plate);
      }
      block(px, pz, 1.6, 1.8);
      stations.gym.push({ x: px + 1.1, z: pz, kind: 'bench' });
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
    const cx = Math.min(4.2, sx - 2), cz = d / 2 - 2.3;
    box(2.2, COUNTER_H, 0.8, cx, COUNTER_H / 2, cz, '#fffaf0'); // counter
    box(0.35, 0.25, 0.25, cx + 0.4, COUNTER_H + 0.12, cz, '#4a3f35'); // till
    block(cx, cz, 2.2, 0.8);
    clerk = { x: cx, z: cz + 0.75, ry: Math.PI };
  }
  // Plants in the corners.
  if (store.category !== 'home') for (const [px, pz] of [[-w / 2 + 0.7, -d / 2 + 0.7], [w / 2 - 0.7, -d / 2 + 0.7], [-w / 2 + 0.7, d / 2 - 0.9]]) {
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
  }
  // K-POP café: a big TV on the back wall (the video plays in the corner of
  // the screen; this is the room's look).
  let tv = null;
  if (store.kpop) {
    const tvz = -d / 2 + 0.3;
    box(5.2, 3, 0.2, 0, 2.3, tvz, '#1b1b20');
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.7), new THREE.MeshBasicMaterial({ color: store.colors.awning }));
    glow.position.set(0, 2.3, tvz + 0.11);
    scene.add(glow);
    for (const sx of [-3.2, 3.2]) box(0.6, 1.1, 0.5, sx, 0.55, tvz + 0.4, '#2b2b30'); // speakers
    block(0, tvz + 0.3, 7, 0.9);
    tv = { x: 0, z: tvz + 1.6, screen: glow, width: 4.9 };
  }
  return { scene, products, colliders, seats, clerk, trainer, barkeep, turntable, tv, stations, animate, see, room: ROOM, exit: EXIT };
}
