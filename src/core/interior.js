// Store interiors: a cosy room built from the store's data, with a display
// for each product. Each interior is its own scene.
import * as THREE from 'three';
import { makeAnimal } from './pets.js';
import { buildPark } from './park.js';

// Room sizes (metres). A store picks one with "size" in stores.json.
export const ROOM_SIZES = {
  small: { w: 9, d: 8, h: 3.6 },
  medium: { w: 14, d: 11, h: 4 },
  large: { w: 22, d: 16, h: 4.6 },
  park: { w: 36, d: 28, h: 8 }, // outdoor (see park.js)
};
export const roomOf = (store) => ROOM_SIZES[store.size] || ROOM_SIZES.medium;
export const exitOf = (room) => ({ x: 0, z: room.d / 2 - 0.9 });
const SEAT_H = 0.38; // chair seat height, sized for the chibi characters

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
    case 'scarf':
      add(new THREE.TorusGeometry(0.13, 0.05, 8, 16), 0, 0.2).rotation.x = Math.PI / 2;
      break;
    default:
      add(new THREE.BoxGeometry(0.25, 0.25, 0.25), 0, 0.12);
  }
  return g;
}

const HANGING = new Set(['tee', 'jeans', 'scarf']);

// Builds the room. Returns { scene, products: [{ product, mesh, pos }],
// colliders, seats: [{ x, z, ry, stand: [x, z] }], room, exit }.
export function buildInterior(store) {
  const ROOM = roomOf(store);
  const EXIT = exitOf(ROOM);
  if (store.category === 'park') return buildPark(store, ROOM, EXIT);
  const scene = new THREE.Scene();
  const accent = new THREE.Color(store.colors.accent);
  scene.background = accent.clone().multiplyScalar(0.92);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd9c7b0, 1.7));
  scene.add(new THREE.AmbientLight(0xfff0e0, 0.6));
  const lamp = new THREE.PointLight(0xffe2b8, 25, Math.max(18, ROOM.w * 1.2));
  lamp.position.set(0, ROOM.h - 0.4, 0);
  scene.add(lamp);

  const { w, d, h } = ROOM;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: floorTexture(store.category === 'fashion' ? '#e9e2d6' : '#d9b48c', ROOM) }),
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
  g.font = '800 92px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`${store.name.ko} · ${store.name.en}`, 512, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(8, w - 1), Math.min(8, w - 1) / 6.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  title.position.set(0, h - 0.9, -d / 2 + 0.02);
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
  store.products.forEach((product, i) => {
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
  const stations = {}; // minigame spots: { karaoke|photo|claw|sauna: [{ x, z }] }
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
    }
    // Long reading tables with chairs on both long sides.
    const rows = Math.max(1, Math.floor((d - 6) / 2.8));
    for (let r = 0; r < rows; r++) {
      const tz = -d / 2 + 3 + r * 2.8;
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
          seats.push({ x: cx, z: cz + 0.04 * s, ry: s > 0 ? Math.PI : 0, stand: [cx, tz + 1.5 * s] });
        }
      }
      block(0, tz, tl + 0.2, 2.1);
    }
    // Front desk by the door, and the sign above it.
    const cx = Math.min(3.6, sx - 2), cz = d / 2 - 2.3;
    box(2.2, 1.0, 0.8, cx, 0.5, cz, '#fffaf0');
    box(0.5, 0.06, 0.35, cx - 0.4, 1.03, cz, '#3f6e8c'); // a book on the desk
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
          seats.push({ x: cx + 0.04 * s, z: tz, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2, stand: [tx + 1.55 * s, tz] });
        }
        block(tx, tz, 2.3, 0.95);
      }
    }
    // Counter by the side wall.
    box(2.4, 1.0, 0.8, sx - 1.4, 0.5, d / 2 - 2.2, '#fffaf0');
    box(0.3, 0.35, 0.3, sx - 0.8, 1.17, d / 2 - 2.2, '#4a3f35'); // coffee machine
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
    if (store.workshop === 'salon' || store.workshop === 'clinic') {
      // Mirrors on the back wall with a chair in front of each (salon), or
      // mirrors with a white treatment bed and a waiting sofa (clinic).
      const n = Math.max(2, Math.min(4, Math.floor((w - 3) / 2.6)));
      for (let i = 0; i < n; i++) {
        const mx = (i - (n - 1) / 2) * 2.6, mz = -d / 2 + 0.25;
        box(1.1, 1.5, 0.06, mx, 1.6, mz, '#e9eef2');
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), new THREE.MeshBasicMaterial({ color: '#cfe6f2' }));
        glass.position.set(mx, 1.6, mz + 0.04);
        scene.add(glass);
        box(1.3, 0.08, 0.4, mx, 0.8, mz + 0.3, '#fffaf0'); // shelf
        if (store.workshop === 'salon') {
          box(0.18, 0.12, 0.08, mx - 0.35, 0.9, mz + 0.3, '#f29bb6'); // dye bottles
          box(0.08, 0.2, 0.08, mx + 0.3, 0.94, mz + 0.3, '#4f7fd6');
          const cz = mz + 1.3;
          box(0.6, 0.12, 0.6, mx, SEAT_H, cz, '#2b2b2e');
          box(0.6, 0.6, 0.1, mx, SEAT_H + 0.35, cz + 0.28, '#2b2b2e');
          box(0.12, SEAT_H, 0.12, mx, SEAT_H / 2, cz, '#9ca9af');
          seats.push({ x: mx, z: cz, ry: Math.PI, stand: [mx, cz + 1] });
          block(mx, cz, 0.7, 0.7);
        } else {
          box(0.7, 0.55, 1.9, mx, 0.28, mz + 1.6, '#f6f8fa'); // treatment bed
          box(0.6, 0.1, 0.4, mx, 0.6, mz + 0.85, '#ffffff'); // pillow
          block(mx, mz + 1.6, 0.8, 2);
        }
        block(mx, mz + 0.3, 1.3, 0.5);
      }
      if (store.workshop === 'clinic') { // waiting sofa
        const fx = -w / 2 + 1.2, fz = d / 2 - 3.2;
        box(0.8, 0.42, 2.2, fx, 0.21, fz, store.colors.awning);
        box(0.2, 0.5, 2.2, fx - 0.35, 0.6, fz, store.colors.awning);
        for (const o of [-0.5, 0.5]) seats.push({ x: fx, z: fz + o, ry: Math.PI / 2, stand: [fx + 1, fz + o] });
        block(fx, fz, 0.9, 2.3);
      }
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
    } else if (store.workshop === 'photo') {
      // The booth: a box with a curtain opening and a lit backdrop inside.
      const bz = -d / 2 + 1.6;
      box(3.4, 2.4, 0.1, 0, 1.2, -d / 2 + 0.1, '#fffaf0'); // backdrop
      box(0.1, 2.4, 2.6, -1.7, 1.2, bz, store.colors.sign);
      box(0.1, 2.4, 2.6, 1.7, 1.2, bz, store.colors.sign);
      box(3.5, 0.12, 2.6, 0, 2.45, bz, store.colors.sign);
      box(0.4, 0.3, 0.3, 0, 2.25, bz + 1.2, '#2b2b2e'); // camera, hung from the roof
      block(-1.7, bz, 0.2, 2.6);
      block(1.7, bz, 0.2, 2.6);
      stations.photo = [{ x: 0, z: bz + 0.3, ry: 0, camZ: bz + 2.6 }];
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
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#9a6a45'));
      dome.position.set(kx, 0, kz);
      scene.add(dome);
      box(0.3, 1.7, 1.2, kx + 2.25, 0.85, kz, '#3a2216'); // doorway
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshBasicMaterial({ color: '#ff8a3d' }));
      glow.position.set(kx + 2.42, 0.75, kz);
      glow.rotation.y = Math.PI / 2;
      scene.add(glow);
      const heat = new THREE.PointLight(0xff8a3d, 6, 6);
      heat.position.set(kx + 3, 1, kz);
      scene.add(heat);
      block(kx, kz, 4.8, 4.8);
      const ix = w / 2 - 2.4;
      box(3.4, 2.8, 3.6, ix, 1.4, kz, '#dff4ff'); // ice room
      box(0.1, 1.9, 1.2, ix - 1.72, 0.95, kz, '#7fb8e0'); // its door
      for (let i = 0; i < 6; i++) box(0.12, 0.35 + (i % 3) * 0.12, 0.12, ix - 1.6 + i * 0.6, 2.62 - (i % 3) * 0.06, kz - 1.85, '#ffffff'); // icicles
      block(ix, kz, 3.5, 3.7);
      stations.sauna = [{ x: kx + 3.2, z: kz, kind: 'hot' }, { x: ix - 2.5, z: kz, kind: 'ice' }];
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
      // Push-up mats (flat, you stand on them).
      for (const [mx, c] of [[-5.5, '#8fd3c7'], [-3, '#b9a6f0']]) {
        box(1, 0.04, 1.9, mx, 0.02, d * 0.12, c);
        stations.gym.push({ x: mx, z: d * 0.12, kind: 'pushup' });
      }
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
    box(2.2, 1.0, 0.8, cx, 0.5, cz, '#fffaf0'); // counter
    box(0.35, 0.25, 0.25, cx + 0.4, 1.12, cz, '#4a3f35'); // till
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
  return { scene, products, colliders, seats, clerk, turntable, tv, stations, room: ROOM, exit: EXIT };
}
