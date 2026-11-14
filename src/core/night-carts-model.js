// Night food carts (야시장 노점 수레), e.g. down the middle of Myeongdong's
// shopping street from sunset to morning (game/night-carts.js puts them out
// and takes them in; map landmark "nightcarts" says where). Downloaded the
// first time you come near one in the evening.
//
// Every cart is the same shape, so each part is one InstancedMesh for all of
// them (a body, a counter in the cart's colour, wheels, posts, a roof, a
// small lamp and its glow on the ground): about a dozen draw calls for all
// sixteen carts, plus their goods baked together and one sign texture. The lamp is a
// bulb that glows by itself and a soft pool of light under it, not a real
// light: sixteen real lights would be heavy on a phone. (Yozi 2026-11-11: a
// small lamp on each cart.)
//
// A cart's own metres: its long side along x, its counter facing +z (the
// customers stand there), its seller inside behind the counter.
import * as THREE from 'three';
import { productModel } from './product-model.js';
import { localName } from './i18n.js';
import { mergeStatic } from './merge-static.js';
import { COUNTER_H } from './counter-face.js';

export const CART = { len: 2.2, depth: 1.3, counter: COUNTER_H }; // (the counter low enough to see the seller's face over it, core/counter-face.js) // (scripts/build-myeongdong.mjs CART)
export const SELLER_Z = -0.3; // where the seller stands
export const BUY_Z = 1.3; // where you stand to look at its food
// The lamp hangs off the front corner post on a short arm, out past the end
// of the name board (in the middle it hid the board: Yozi 2026-11-11).
const LAMP = { x: 1.42, y: 1.84, z: 1.0 }, ARM_FROM = { x: 1.05, y: 2.0, z: 0.62 };
const SIGN = { w: 1.9, h: 0.34, px: 72 }; // its name board, and its row in the shared texture (px high)

const lambert = (color) => new THREE.MeshLambertMaterial({ color });

// spots: [[x, z, ry], …] in the scene's metres. store: the stores.json entry
// (its "market" stalls, one per cart, and the products with their "stall").
export function buildNightCarts(store, spots) {
  const group = new THREE.Group();
  group.name = 'nightcarts:' + store.id;
  const stalls = (store.market?.stalls || []).slice(0, spots.length);
  const n = stalls.length;
  const m4 = new THREE.Matrix4(), part = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const carts = spots.slice(0, n).map(([x, z, ry]) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q.setFromEuler(e.set(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
  // One InstancedMesh for a part on every cart: at(i, k) gives its place on cart i (k: which one on it).
  const inst = (geo, mat, per, at, color) => {
    const mesh = new THREE.InstancedMesh(geo, mat, n * per);
    for (let i = 0; i < n; i++) for (let k = 0; k < per; k++) {
      mesh.setMatrixAt(i * per + k, m4.multiplyMatrices(carts[i], at(part, k)));
      if (color) mesh.setColorAt(i * per + k, new THREE.Color(color(i)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    return mesh;
  };
  const place = (x, y, z, rx = 0) => (m) => m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, 0, 0)), new THREE.Vector3(1, 1, 1));
  const { len, counter } = CART;
  // The cart: a steel body at the front with the counter on top, the seller's
  // space behind it, two wheels, four posts and a sloping roof.
  inst(new THREE.BoxGeometry(len, counter - 0.05, 0.5), lambert('#c3c8cf'), 1, place(0, (counter - 0.05) / 2, 0.4));
  inst(new THREE.BoxGeometry(len + 0.1, 0.06, 0.62), lambert('#ffffff'), 1, place(0, counter, 0.4), (i) => stalls[i].color || '#c8402a');
  inst(new THREE.BoxGeometry(len - 0.2, 0.5, 0.25), lambert('#8f969e'), 1, place(0, 0.5, -0.5)); // the back shelf (the gas, the boxes)
  inst(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14).rotateZ(Math.PI / 2), lambert('#2b2b2e'), 2, (m, k) => place(k ? len / 2 + 0.06 : -len / 2 - 0.06, 0.2, 0.4)(m));
  inst(new THREE.BoxGeometry(0.05, 2.1, 0.05), lambert('#5c5f66'), 4, (m, k) => place((k & 1 ? 1 : -1) * (len / 2 - 0.05), 1.05, k & 2 ? 0.62 : -0.6)(m));
  inst(new THREE.BoxGeometry(len + 0.5, 0.05, 1.75), lambert('#ffffff'), 1, place(0, 2.15, 0.05, 0.12), (i) => stalls[i].awning || '#fff1e0'); // (lower at the front)
  inst(new THREE.BoxGeometry(len + 0.52, 0.12, 0.04), lambert('#ffffff'), 1, place(0, 2.02, 0.93, 0.12), (i) => stalls[i].color || '#c8402a'); // its front edge in the cart's colour
  // The small lamp: an arm from the corner post, a bulb, and its light on the ground.
  const armDir = new THREE.Vector3(LAMP.x - ARM_FROM.x, LAMP.y + 0.1 - ARM_FROM.y, LAMP.z - ARM_FROM.z);
  const armLen = armDir.length(), armQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), armDir.normalize());
  const armMid = new THREE.Vector3(ARM_FROM.x, ARM_FROM.y, ARM_FROM.z).addScaledVector(armDir, armLen / 2);
  inst(new THREE.BoxGeometry(0.025, armLen, 0.025), lambert('#2b2b2e'), 1, (m) => m.compose(armMid, armQ, new THREE.Vector3(1, 1, 1)));
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffe2a8' });
  const bulbs = inst(new THREE.SphereGeometry(0.1, 12, 8).scale(1, 1.2, 1), bulbMat, 1, place(LAMP.x, LAMP.y, LAMP.z));
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,190,110,1)'); grad.addColorStop(0.45, 'rgba(255,160,80,0.4)'); grad.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glows = inst(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), glowMat, 1, place(0.7, 0.12, 1.0));
  glows.renderOrder = 1;

  // The name boards: one texture, a row for each cart, on one mesh.
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = SIGN.px * Math.max(1, n);
  const signTex = new THREE.CanvasTexture(canvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const boards = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.PlaneGeometry(SIGN.w, SIGN.h);
    const uv = g.attributes.uv, v0 = 1 - (i + 1) / n, v1 = 1 - i / n;
    for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) > 0.5 ? v1 : v0);
    g.applyMatrix4(m4.multiplyMatrices(carts[i], place(0, 1.78, 0.95, 0.12)(part)));
    boards.push(g);
  }
  const signGeo = boards.length ? mergeBoards(boards) : new THREE.BufferGeometry();
  group.add(new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: signTex })));
  const drawSigns = (lang) => {
    const g = canvas.getContext('2d'), H = SIGN.px;
    stalls.forEach((s, i) => {
      const y = i * H;
      g.fillStyle = s.color || '#c8402a'; g.fillRect(0, y, canvas.width, H);
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 4; g.strokeRect(6, y + 6, canvas.width - 12, H - 12);
      const text = lang ? localName(s.name, lang) : s.name.ko || s.name.en;
      let px = 40;
      const font = () => `800 ${px}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
      g.font = font();
      while (g.measureText(text).width > canvas.width - 40 && px > 14) { px--; g.font = font(); }
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, canvas.width / 2, y + H / 2 + 2);
    });
    signTex.needsUpdate = true;
  };
  drawSigns(null);

  // Its food on the counter (one kind a cart), and where you stand to look.
  const products = [], vendors = [], colliders = [];
  const goods = new THREE.Group();
  group.add(goods);
  const up = new THREE.Vector3(0, 1, 0);
  stalls.forEach((stall, i) => {
    const [x, z, ry] = spots[i];
    const product = store.products.find((p) => p.stall === stall.id);
    if (product) {
      const model = productModel(product.model, product.color, product);
      model.scale.setScalar(1.5);
      const at = new THREE.Vector3(0.6, 0, 0.42).applyAxisAngle(up, ry); // (beside the seller, not in front of the face)
      model.position.set(x + at.x, counter + 0.04, z + at.z);
      model.rotation.y = ry;
      goods.add(model);
      const pos = new THREE.Vector3(0, 0, BUY_Z).applyAxisAngle(up, ry).add(new THREE.Vector3(x, 0, z));
      products.push({ product, pos });
    }
    const v = new THREE.Vector3(0, 0, SELLER_Z).applyAxisAngle(up, ry).add(new THREE.Vector3(x, 0, z));
    vendors.push({ x: v.x, z: v.z, ry, stall: stall.id });
    // Its footprint (low: the camera looks over it).
    const c = Math.cos(ry), s = Math.sin(ry), hx = (len + 0.1) / 2, hz = CART.depth / 2 + 0.05, oz = 0.15;
    colliders.push([[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([a, b]) => [x + a * c + (b + oz) * s, z - a * s + (b + oz) * c]));
  });
  mergeStatic(goods);

  // Dusk to night (0..1): the bulbs warm up and their light spreads on the ground.
  let shown = -1;
  const lit = new THREE.Color('#fff2c0'), unlit = new THREE.Color('#d9cdb8');
  const setNight = (k) => {
    if (Math.abs(k - shown) < 0.01) return;
    shown = k;
    bulbMat.color.copy(unlit).lerp(lit, Math.min(1, k * 1.5));
    glowMat.opacity = 0.5 * k;
    glows.visible = k > 0.02;
  };
  setNight(0);
  return { group, products, vendors, colliders, setNight, setSignLang: drawSigns, bulbs };
}

// The boards' planes as one geometry (they share one texture).
function mergeBoards(list) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (const g of list) {
    const p = g.attributes.position, u = g.attributes.uv;
    for (let k = 0; k < p.count; k++) { pos.push(p.getX(k), p.getY(k), p.getZ(k)); uv.push(u.getX(k), u.getY(k)); }
    for (const k of g.index.array) idx.push(base + k);
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}
