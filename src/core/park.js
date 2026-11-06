// Ttukseom Han River Park: an outdoor "room" entered like a shop. Grass and a
// riverside path in front, the river behind with a fishing pier, the far bank
// and a bridge in the distance, benches to sit on, a DAILY MART kiosk that
// sells ramyeon and eggs for the ramen machine next to it (한강 라면), parasol
// tables, and a little outdoor market in the left corner (riverside-market.js). Same shape as buildInterior's result.
import * as THREE from 'three';
import { buildMarket, parasolTable, signBoard, PARASOLS } from './riverside-market.js';
import { productModel } from './interior.js';
import { localName } from './i18n.js';

const mats = {};
const mat = (c, o) => (mats[c + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const SEAT_H = 0.38;
const RAMEN_SIGN = { ko: '한강 라면', en: 'Han River Ramen', ja: '漢江ラーメン', zh: '汉江拉面' };
const FISH_SIGN = { ko: '물고기 삽니다', en: 'We buy fish', ja: '魚、買います', zh: '收购鲜鱼' };

export const DUCK_BOATS = 4;
// Where the two riders sit, in the boat's own space (it faces -z).
export const DUCK_SEATS = [[-0.3, 0.15], [0.3, 0.15]];
// A pedal boat shaped like a duck: white hull, yellow neck and head with an
// orange beak at the front, a coloured canopy on four posts, a bench.
export function makeDuckBoat(roof) {
  const g = new THREE.Group();
  const add = (sx, sy, sz, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(1.4, 0.42, 1.9, 0, -0.02, 0, '#fffaf0'); // hull
  add(1.2, 0.06, 1.5, 0, 0.2, 0.05, '#e9e2d4'); // floor
  add(1.1, 0.1, 0.4, 0, 0.36, 0.3, '#86b8f0'); // bench
  add(1.1, 0.4, 0.08, 0, 0.55, 0.52, '#86b8f0'); // backrest
  add(0.5, 0.75, 0.5, 0, 0.55, -0.72, '#ffd166'); // the duck's neck
  add(0.56, 0.42, 0.62, 0, 1.08, -0.78, '#ffd166'); // head
  add(0.3, 0.12, 0.28, 0, 1.0, -1.18, '#f08a2c'); // beak
  for (const s of [-1, 1]) add(0.06, 0.06, 0.04, s * 0.2, 1.16, -1.1, '#2b2230'); // eyes
  for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.75], [0.6, 0.75]]) add(0.05, 1.45, 0.05, x, 0.9, z, '#d9dde2'); // posts (tall enough for a seated rider's head)
  add(1.35, 0.08, 1.3, 0, 1.64, 0.2, roof); // canopy
  return g;
}

export function buildPark(store, ROOM, EXIT) {
  const { w, d } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe0f4');
  scene.fog = new THREE.Fog('#bfe0f4', 40, 140);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbf7a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({
    p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]],
  });
  const box = (sx, sy, sz, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const plane = (sx, sz, x, y, z, color, o) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), mat(color, o));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  const bank = -4; // where the land ends and the river starts (z)
  // Grass, a riverside path, and the river (wide, past the room's back).
  plane(w + 80, d / 2 - bank + 40, 0, 0, (d / 2 + bank) / 2 + 20, '#8fcf7a');
  plane(w + 80, 3, 0, 0.01, bank + 1.6, '#d9c7a6'); // path along the river
  const river = plane(w + 300, 160, 0, -0.25, bank - 80, '#4f9ccf');
  box(w + 80, 0.4, 0.4, 0, -0.05, bank, '#b9b2a6'); // embankment edge
  // Railing along the bank, with gaps for the pier.
  for (const s of [-1, 1]) {
    const len = w / 2 - 2;
    box(len, 0.06, 0.06, s * (1.8 + len / 2), 0.9, bank + 0.15, '#7a8691');
    for (let x = 1.8; x < w / 2; x += 2) box(0.06, 0.9, 0.06, s * x, 0.45, bank + 0.15, '#7a8691');
  }
  // Fishing pier into the river.
  const pierLen = 8;
  box(3, 0.2, pierLen, 0, -0.1, bank - pierLen / 2, '#a8794f');
  // A low wooden fence on the pier (posts and two rails, knee-to-hip high),
  // so the river is in view over it while you fish.
  const FENCE_H = 0.55;
  for (const s of [-1, 1]) {
    for (const y of [FENCE_H, FENCE_H * 0.5]) box(0.07, 0.07, pierLen, s * 1.5, y, bank - pierLen / 2, '#7a5636');
    for (let z = 0; z <= pierLen; z += 2) box(0.1, FENCE_H + 0.05, 0.1, s * 1.5, FENCE_H / 2, bank - z, '#6b4a2e');
  }
  for (const y of [FENCE_H, FENCE_H * 0.5]) box(3, 0.07, 0.07, 0, y, bank - pierLen, '#7a5636');
  // Far bank skyline and a bridge.
  for (let i = 0; i < 26; i++) {
    const h = 6 + ((i * 37) % 11) * 2.2;
    box(5 + (i % 3), h, 5, -95 + i * 7.6, h / 2 - 0.2, bank - 150, ['#c9d3dc', '#b7c3cf', '#dfe5ea'][i % 3]);
  }
  box(260, 1.2, 4, 40, 7, bank - 70, '#d6dbe0'); // bridge deck
  for (let x = -60; x <= 140; x += 25) box(2, 7, 2, x, 3.2, bank - 70, '#c4cad1');
  for (let x = -60; x < 140; x += 25) { // arches
    const arch = new THREE.Mesh(new THREE.TorusGeometry(12.5, 0.35, 6, 24, Math.PI), mat('#e07a5f'));
    arch.position.set(x + 12.5, 7.4, bank - 70);
    scene.add(arch);
  }

  // Walls of the play area: the river (except the pier) and the room edges.
  // The river starts just past the railing (bank + 0.3); the path in front stays walkable.
  const rz0 = -d / 2 - 0.5, rz1 = bank + 0.3;
  block(-(w / 2 + 1.5) / 2 - 0.75, (rz0 + rz1) / 2, w / 2 - 1.5, rz1 - rz0); // river left of pier
  block((w / 2 + 1.5) / 2 + 0.75, (rz0 + rz1) / 2, w / 2 - 1.5, rz1 - rz0); // river right
  block(0, bank - pierLen - 0.5, 3.4, 1); // pier end
  for (const s of [-1, 1]) block(s * 1.62, bank - pierLen / 2, 0.2, pierLen); // pier sides
  const t = 0.4;
  block(0, d / 2 + t / 2 - 0.2, w, t);
  block(-w / 2 + 0.2 - t / 2, 0, t, d);
  block(w / 2 - 0.2 + t / 2, 0, t, d);

  // Trees on the grass (the left corner is the market's).
  for (const [x, z] of [[-4, 12.2], [9, 12], [24.6, 12], [-15, -1], [4, 9]]) {
    box(0.4, 1.6, 0.4, x, 0.8, z, '#8a5a3a');
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), mat('#5fae5a'));
    leaf.position.set(x, 2.6, z);
    scene.add(leaf);
    block(x, z, 0.8, 0.8);
  }

  // A few light touches (all plain boxes and low-poly shapes, no extra
  // lights): flower beds along the path, round bushes and lamp posts.
  decorate(scene, box, block, bank);

  // Benches facing the river.
  const seats = [];
  for (const bx of [-9, -5, 5, 9]) {
    const bz = bank + 3.6;
    box(1.8, 0.08, 0.5, bx, SEAT_H, bz, '#b07a4a');
    box(1.8, 0.5, 0.08, bx, SEAT_H + 0.3, bz + 0.25, '#b07a4a');
    for (const lx of [-0.8, 0.8]) box(0.08, SEAT_H, 0.4, bx + lx, SEAT_H / 2, bz, '#55504a');
    block(bx, bz, 1.9, 0.6);
    for (const sx of [-0.45, 0.45]) seats.push({ x: bx + sx, z: bz - 0.02, ry: Math.PI, stand: [bx + sx, bz - 0.8] });
  }

  // DAILY MART kiosk (right side): ramyeon packs and eggs on the counter,
  // the ramen machine beside it, and parasol tables to eat at.
  const mart = store.kiosk || { name: { ko: '편의점', en: 'Convenience store' }, color: '#2f9e6e' };
  const kx = 22, kz = 5;
  box(3, 3, 5, kx, 1.5, kz, '#f7f5f0');
  box(3.2, 0.6, 5.2, kx, 3.1, kz, mart.color); // sign band
  const martSign = signBoard(5, 0.6, mart.color);
  martSign.mesh.position.set(kx - 1.62, 3.1, kz);
  martSign.mesh.rotation.y = -Math.PI / 2;
  scene.add(martSign.mesh);
  box(0.05, 1.6, 3.6, kx - 1.52, 1.25, kz, '#cfe8f5'); // shop window
  // The counter in front, with the goods on it.
  const cx = kx - 2.8;
  box(0.45, 0.62, 2.8, cx, 0.31, kz, '#f5efe4');
  box(0.5, 0.05, 2.85, cx, 0.64, kz, mart.color);
  block(kx - 0.5, kz, 4.4, 5.4); // kiosk, clerk's corner and counter
  const products = [];
  const goods = store.products.filter((p) => p.kiosk).slice(0, 3);
  goods.forEach((product, i) => {
    const z = kz + (i - (goods.length - 1) / 2) * 0.9;
    const g = new THREE.Group();
    g.position.set(cx, 0.67, z);
    g.rotation.y = -Math.PI / 2;
    for (const dz of [-0.28, 0, 0.28]) { // three of each, stocked
      const m = productModel(product.model, product.color, product);
      m.scale.setScalar(dz ? 1.3 : 1.6);
      m.position.x = dz;
      g.add(m);
    }
    scene.add(g);
    products.push({ product, mesh: g, pos: new THREE.Vector3(cx - 1.2, 0, z) });
  });
  const clerk = { x: kx - 2.15, z: kz, ry: -Math.PI / 2 };
  // The ramen machine, at the kiosk's river-side corner. Water is free; the
  // ramyeon pack (and an egg) come from the bag.
  const rmx = kx - 2.1, rmz = kz - 3.3;
  box(0.7, 1.3, 0.8, rmx, 0.65, rmz, '#d8452f');
  box(0.05, 0.35, 0.45, rmx - 0.36, 1.05, rmz, '#222'); // the hot plate's panel
  box(0.5, 0.06, 0.5, rmx, 1.33, rmz, '#9aa0a8'); // the pot
  const rSign = signBoard(1.2, 0.36, '#d8452f');
  rSign.mesh.position.set(rmx - 0.41, 1.6, rmz);
  rSign.mesh.rotation.y = -Math.PI / 2;
  scene.add(rSign.mesh);
  block(rmx, rmz, 0.9, 1.0);
  const ramen = { x: rmx - 1.1, z: rmz };
  // Parasol tables next to the shop.
  for (const [i, [tx, tz]] of [[14.6, 8.4], [18.4, 10.2], [14.6, 12]].entries()) parasolTable(scene, block, seats, tx, tz, PARASOLS[(i + 1) % PARASOLS.length]);

  // Fishing spots: the end of the pier and the railing on both sides.
  const fishing = [[0, bank - pierLen + 0.8], [-6, bank + 0.7], [7, bank + 0.7]].map(([x, z]) => ({ x, z }));
  for (const f of fishing) {
    const sign2 = box(0.5, 0.35, 0.05, f.x + 0.7, 1.1, f.z + 0.3, '#ffd166'); // little 🎣 board
    sign2.rotation.y = 0.2;
  }

  // Fish buyer by the pier: an ice-box stand where your catch can be sold
  // without going back to the fish market (same prices).
  const fbx = 2.7, fbz = bank + 3.7;
  box(1.5, 0.8, 0.7, fbx, 0.4, fbz, '#2f78b0'); // counter
  box(1.3, 0.32, 0.5, fbx, 0.96, fbz, '#f2f7fb'); // ice box
  box(1.32, 0.06, 0.52, fbx, 1.14, fbz, '#5fb0de'); // its lid
  for (const sx of [-0.7, 0.7]) box(0.07, 1.6, 0.07, fbx + sx, 1.4, fbz + 0.3, '#55504a'); // sign posts
  const fSign = signBoard(1.6, 0.48, '#2f78b0');
  fSign.mesh.position.set(fbx, 2.2, fbz + 0.32);
  fSign.mesh.rotation.y = Math.PI; // faces the path and the river
  scene.add(fSign.mesh);
  const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mat('#9aa7b4'));
  fishBody.scale.set(1.6, 0.7, 0.45);
  fishBody.position.set(fbx - 0.25, 1.27, fbz - 0.05);
  scene.add(fishBody);
  block(fbx, fbz, 1.6, 0.8);
  const fishBuy = { x: fbx, z: fbz - 1.1 };

  // Four duck boats (오리배) moored to the right of the pier. Each waits at
  // the dock until someone gets in; two people fit side by side. They face
  // the river (-z), so riders look out over the water.
  const duck = { x: 12, z: bank + 0.9 };
  const ducks = [];
  for (let i = 0; i < DUCK_BOATS; i++) {
    const g = makeDuckBoat(['#ff9bb3', '#86b8f0', '#a6d97a', '#c9a6f0'][i]);
    const home = { x: 7.6 + i * 2.6, z: bank - 1.7 };
    g.position.set(home.x, 0, home.z);
    scene.add(g);
    ducks.push({ g, home, i });
  }
  const sign3 = box(0.9, 0.5, 0.05, duck.x + 4.4, 1.2, bank + 0.4, '#ffd166');
  sign3.rotation.y = -0.2;

  // The riverside market: stalls with sellers, and parasol tables.
  const market = buildMarket(scene, store, block, seats);
  const setSignLang = (lang) => {
    market.setSignLang(lang);
    martSign.draw(lang ? localName(mart.name, lang) : mart.name.ko || mart.name.en, lang ? '' : mart.name.ko ? mart.name.en : '');
    rSign.draw(lang ? localName(RAMEN_SIGN, lang) : RAMEN_SIGN.ko);
    fSign.draw(lang ? localName(FISH_SIGN, lang) : FISH_SIGN.ko, lang ? '' : FISH_SIGN.en);
  };
  setSignLang(null);

  return {
    scene, products: [...products, ...market.products], colliders, seats, clerk, turntable: null, room: ROOM, exit: EXIT,
    fishing, fishBuy, ramen, river, duck, ducks, park: true, vendors: market.vendors, setSignLang,
    // Grass where a picnic mat can go (core/picnic-mat.js): the lawn between
    // the benches and the back, right of the market and left of DAILY MART.
    lawns: [{ x0: -12.6, x1: 17, z0: 0.5, z1: 13.6 }],
  };
}

// Flower beds, bushes and lamp posts. Flowers are one InstancedMesh per
// colour, so the whole lot is a handful of draw calls (light on phones).
const FLOWERS = ['#ff8fab', '#ffd166', '#ffffff', '#c9a6f0'];
function decorate(scene, box, block, bank) {
  const bedZ = bank + 3.6; // in line with the benches, between the path and the lawn
  const beds = [[-13.5, 3], [-7, 1.6], [-2.6, 1.6], [7, 1.6], [14.6, 2.8]].map(([x, len]) => ({ x, len }));
  const spots = FLOWERS.map(() => []);
  for (const b of beds) {
    box(b.len, 0.18, 0.6, b.x, 0.09, bedZ, '#9a6b47'); // the bed's edge
    box(b.len - 0.1, 0.02, 0.5, b.x, 0.185, bedZ, '#6b4a32'); // soil
    const n = Math.round(b.len * 5);
    for (let i = 0; i < n; i++) {
      const fx = b.x - b.len / 2 + 0.12 + (i / (n - 1)) * (b.len - 0.24);
      const fz = bedZ + ((i * 7) % 3 - 1) * 0.14;
      spots[i % FLOWERS.length].push([fx, fz]);
    }
    block(b.x, bedZ, b.len, 0.6);
  }
  const head = new THREE.IcosahedronGeometry(0.09, 0);
  const m4 = new THREE.Matrix4();
  FLOWERS.forEach((c, k) => {
    const inst = new THREE.InstancedMesh(head, mat(c), spots[k].length);
    spots[k].forEach(([x, z], i) => inst.setMatrixAt(i, m4.makeTranslation(x, 0.3, z)));
    scene.add(inst);
  });
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0).scale(1.4, 0.6, 1.4), mat('#4f9a4c'), beds.length * 6);
  let li = 0;
  for (const b of beds) for (let i = 0; i < 6; i++) leaves.setMatrixAt(li++, m4.makeTranslation(b.x - b.len / 2 + 0.25 + (i / 5) * (b.len - 0.5), 0.22, bedZ));
  scene.add(leaves);

  // Round bushes at the edges of the lawn.
  const bushes = [[-12, 13.2], [-7.5, 13.4], [13.5, 13.3], [19.6, 13.2], [-11.8, 6.5]];
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 1).scale(1.2, 0.8, 1), mat('#6dbb5f'), bushes.length);
  bushes.forEach(([x, z], i) => { bush.setMatrixAt(i, m4.makeTranslation(x, 0.38, z)); block(x, z, 1.2, 1); });
  scene.add(bush);

  // Lamp posts along the river path (just shapes; no light sources).
  for (const x of [-17, -11, 11, 18]) {
    const z = bank + 2.9;
    box(0.1, 2.6, 0.1, x, 1.3, z, '#3d4650');
    box(0.34, 0.08, 0.34, x, 2.62, z, '#3d4650');
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#fff4cf', { emissive: '#ffe9a8', emissiveIntensity: 0.5 }));
    glow.position.set(x, 2.45, z);
    scene.add(glow);
    block(x, z, 0.25, 0.25);
  }
}
