// Ttukseom Riverside Market (뚝섬 강변장터): a little outdoor market in the
// north-west corner of the Han River park. A row of stalls faces the lawn,
// two more stand along the left edge, and parasol tables sit in between so
// you can eat what you bought. The stalls and their goods come from the
// park's stores.json entry ("market" and each product's "stall"), so a new
// region can bring its own market with no code change.
//
// Signs are drawn in Korean; with sign translation on they switch to the
// player's language (setSignLang).
import * as THREE from 'three';
import { productModel } from './interior.js';
import { localName } from './i18n.js';

const mats = {};
const mat = (c, o) => (mats[c + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const glow = (c) => (mats['glow' + c] ||= new THREE.MeshBasicMaterial({ color: c }));

const SEAT_H = 0.38;
const COUNTER_H = 0.62; // low enough to see the seller's face over it
export const STALL = { w: 2.4, d: 1.4 };

// Where each stall stands: [x, z, ry]. ry 0 faces the lawn (+z), π/2 faces
// right (+x). Front row along the top of the lawn, two along the left edge.
export const STALL_SPOTS = [
  [-23.2, 4.2, 0], [-20.4, 4.2, 0], [-17.6, 4.2, 0], [-14.8, 4.2, 0],
  [-24.6, 8.4, Math.PI / 2], [-24.6, 11.2, Math.PI / 2],
];
// Parasol tables with four stools each (between the two rows).
export const TABLES = [[-20, 10.4], [-16.4, 12.2]]; // (back from the stalls, so the parasols don't hide them)

// A picnic table under a parasol, with four stools (seats marked parasol:
// true, where you can eat the Han River ramen).
export const PARASOLS = ['#e85d5d', '#3fa7d6', '#f2b33a', '#7cc47c'];
export function parasolTable(scene, block, seats, tx, tz, color) {
  const add = (geo, px, py, pz, m) => { const mesh = new THREE.Mesh(geo, mat(m)); mesh.position.set(px, py, pz); scene.add(mesh); return mesh; };
  add(new THREE.BoxGeometry(1.5, 0.05, 0.8), tx, 0.56, tz, '#f4f1ea');
  for (const sx of [-0.65, 0.65]) add(new THREE.BoxGeometry(0.06, 0.56, 0.6), tx + sx, 0.28, tz, '#8a8f99');
  add(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8), tx, 1.0, tz, '#d9dde2');
  add(new THREE.ConeGeometry(1.25, 0.42, 8), tx, 2.12, tz, color);
  block(tx, tz, 1.6, 0.9);
  for (const side of [-1, 1]) for (const sx of [-0.4, 0.4]) {
    const sz = tz + side * 0.75;
    add(new THREE.CylinderGeometry(0.17, 0.15, SEAT_H, 10), tx + sx, SEAT_H / 2, sz, '#3f8fd6');
    // Facing the table: the stool on the near (+z) side looks towards -z.
    seats.push({ x: tx + sx, z: sz, ry: side > 0 ? Math.PI : 0, stand: [tx + sx, sz + side * 0.7], parasol: true });
  }
}

// A sign whose text can be redrawn (Korean, or translated).
export function signBoard(w, h, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round(512 * h / w);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  const draw = (text, sub = '', color = bg) => {
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 6;
    g.strokeRect(8, 8, c.width - 16, c.height - 16);
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const font = (px) => `800 ${px}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    let px = Math.round(c.height * (sub ? 0.36 : 0.52));
    g.font = font(px);
    while (g.measureText(text).width > c.width - 44 && px > 14) g.font = font(--px); // long names in some languages
    g.fillText(text, c.width / 2, c.height * (sub ? 0.38 : 0.53));
    if (sub) {
      let sp = Math.round(c.height * 0.2);
      g.font = `600 ${sp}px system-ui, sans-serif`;
      while (g.measureText(sub).width > c.width - 44 && sp > 12) g.font = `600 ${--sp}px system-ui, sans-serif`;
      g.fillText(sub, c.width / 2, c.height * 0.75);
    }
    tex.needsUpdate = true;
  };
  return { mesh, draw };
}

// Builds the market into the park scene. block(x, z, sx, sz) adds a collider;
// seats is the park's seat list (stools are added to it).
// Returns { products: [{ product, mesh, pos }], vendors: [{ x, z, ry }], setSignLang }.
export function buildMarket(scene, store, block, seats) {
  const market = store.market;
  if (!market?.stalls?.length) return { products: [], vendors: [], setSignLang() {} };
  const products = [], vendors = [], signs = [];
  const up = new THREE.Vector3(0, 1, 0);

  market.stalls.slice(0, STALL_SPOTS.length).forEach((stall, i) => {
    const [x, z, ry] = STALL_SPOTS[i];
    const color = stall.color || '#d8452f';
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
    const box = (sx, sy, sz, px, py, pz, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof m === 'string' ? mat(m) : m);
      mesh.position.set(px, py, pz);
      g.add(mesh);
      return mesh;
    };
    const { w, d } = STALL;
    // Frame, counter at the front, a shelf at the back, a sloping awning.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.07, 2.3, 0.07, sx * (w / 2 - 0.05), 1.15, sz * (d / 2 - 0.05), '#6b5a4a');
    box(w, COUNTER_H, 0.5, 0, COUNTER_H / 2, d / 2 - 0.3, '#f5efe4');
    box(w + 0.04, 0.05, 0.56, 0, COUNTER_H + 0.02, d / 2 - 0.3, color);
    box(w - 0.1, 0.9, 0.3, 0, 0.45, -d / 2 + 0.2, '#c9b08a');
    box(w - 0.1, 0.9, 0.04, 0, 1.7, -d / 2 + 0.05, stall.awning || '#fff6e6'); // back cloth
    const awn = box(w + 0.3, 0.06, d + 0.5, 0, 2.35, 0.1, stall.awning || '#fff6e6');
    awn.rotation.x = 0.18; // lower at the front
    for (let k = 0; k < 4; k++) { // stripes in the stall colour
      const s = box(w / 8, 0.065, d + 0.5, -w / 2 + w / 8 + k * (w / 4) - 0.02, 2.355, 0.1, color);
      s.rotation.x = 0.18;
    }
    // Name board across the front, under the awning.
    const sign = signBoard(w, 0.42, color);
    sign.mesh.position.set(0, 2.0, d / 2 + 0.02);
    g.add(sign.mesh);
    signs.push({ draw: sign.draw, name: stall.name });
    // Paper lanterns hanging off the front edge.
    for (const lx of [-0.85, 0, 0.85]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8).scale(1, 1.25, 1), glow(stall.lantern || '#ff9b54'));
      lamp.position.set(lx, 1.72, d / 2 + 0.3);
      g.add(lamp);
    }
    // Its goods on the counter: up to two kinds, side by side.
    const goods = store.products.filter((p) => p.stall === stall.id).slice(0, 2);
    goods.forEach((product, k) => {
      const lx = goods.length === 1 ? 0 : k ? 0.55 : -0.55;
      const model = productModel(product.model, product.color, product);
      model.scale.setScalar(1.6);
      model.position.set(lx, COUNTER_H + 0.05, d / 2 - 0.3);
      g.add(model);
      const pos = new THREE.Vector3(lx, 0, d / 2 + 0.85).applyAxisAngle(up, ry).add(g.position);
      products.push({ product, mesh: g, pos });
    });
    // The seller stands between the counter and the shelf.
    const v = new THREE.Vector3(0, 0, -0.05).applyAxisAngle(up, ry).add(g.position);
    vendors.push({ x: v.x, z: v.z, ry, stall: stall.id });
    const turned = Math.abs(Math.sin(ry)) > 0.5;
    block(x, z, turned ? d + 0.1 : w + 0.1, turned ? w + 0.1 : d + 0.1);
  });

  // Parasol tables with stools.
  TABLES.forEach(([tx, tz], i) => parasolTable(scene, block, seats, tx, tz, PARASOLS[i % PARASOLS.length]));

  // The market's name board at the corner of the lawn.
  const BX = -12.4; // the name board, at the corner of the lawn
  const board = signBoard(3, 0.9, market.color || '#7a3b2e');
  board.mesh.position.set(BX, 2.2, 6.6);
  scene.add(board.mesh);
  for (const sx of [-1.4, 1.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 0.1), mat('#6b5a4a'));
    post.position.set(BX + sx, 1.35, 6.58);
    scene.add(post);
    block(BX + sx, 6.58, 0.2, 0.2);
  }
  for (const sx of [-1.1, -0.37, 0.37, 1.1]) { // lanterns along the top
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8).scale(1, 1.25, 1), glow('#ff7a59'));
    lamp.position.set(BX + sx, 2.85, 6.66);
    scene.add(lamp);
  }

  const setSignLang = (lang) => {
    // Korean signs by default; translated ones in the player's language.
    const name = (n) => (lang ? localName(n, lang) : n.ko || n.en);
    for (const s of signs) s.draw(name(s.name));
    board.draw(name(market.name), lang ? '' : market.name.en || '');
  };
  setSignLang(null);
  return { products, vendors, setSignLang };
}
