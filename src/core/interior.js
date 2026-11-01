// Store interiors: a cosy room built from the store's data, with a display
// for each product. Each interior is its own scene.
import * as THREE from 'three';

// Room sizes (metres). A store picks one with "size" in stores.json.
export const ROOM_SIZES = {
  small: { w: 9, d: 8, h: 3.6 },
  medium: { w: 14, d: 11, h: 4 },
  large: { w: 22, d: 16, h: 4.6 },
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
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), mat(store.colors.sign));
  door.position.set(EXIT.x, 1.2, d / 2 - 0.05);
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
  scene.add(title);

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
    const model = productModel(product.model, product.color);
    model.scale.setScalar(hanging ? 1.4 : 1.8);
    model.position.y = hanging ? 0.95 : 0.95;
    stand.add(model);
    // A second and third copy make the display look stocked.
    for (const s of [-1, 1]) {
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
  if (store.category === 'cafe') {
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
  } else {
    const cx = Math.min(4.2, sx - 2), cz = d / 2 - 2.3;
    box(2.2, 1.0, 0.8, cx, 0.5, cz, '#fffaf0'); // counter
    box(0.35, 0.25, 0.25, cx + 0.4, 1.12, cz, '#4a3f35'); // till
    block(cx, cz, 2.2, 0.8);
  }
  // Plants in the corners.
  for (const [px, pz] of [[-w / 2 + 0.7, -d / 2 + 0.7], [w / 2 - 0.7, -d / 2 + 0.7], [-w / 2 + 0.7, d / 2 - 0.9]]) {
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

  return { scene, products, colliders, seats, room: ROOM, exit: EXIT };
}
