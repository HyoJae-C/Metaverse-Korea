// Ttukseom Han River Park: an outdoor "room" entered like a shop. Grass and a
// riverside path in front, the river behind with a fishing pier, the far bank
// and a bridge in the distance, benches to sit on, a DAILY MART kiosk that
// sells ramyeon and eggs for the ramen machine next to it (한강 라면), parasol
// tables, and a little outdoor market in the left corner (riverside-market.js). Same shape as buildInterior's result.
import * as THREE from 'three';
import { buildMarket, parasolTable, signBoard, PARASOLS } from './riverside-market.js';
import { productModel } from './interior.js';
import { localName } from './i18n.js';
import { luckySpot } from './fishing.js';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import * as droneShow from './drone-show.js';
import { mergeStatic } from './merge-static.js';
const { droneShowAt, nextDroneShow, BARGE, LIFT_SECONDS } = droneShow;

const mats = {};
const mat = (c, o) => (mats[c + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const SEAT_H = 0.38;
const RAMEN_SIGN = { ko: '한강 라면', en: 'Han River Ramen', ja: '漢江ラーメン', zh: '汉江拉面' };
const FISH_SIGN = { ko: '물고기 삽니다', en: 'We buy fish', ja: '魚、買います', zh: '收购鲜鱼' };
const FISHING_OK = { ko: '낚시 가능', en: 'Fishing OK', ja: '釣りOK', zh: '可以钓鱼' };
const LUCKY_SIGN = { ko: '행운 포인트', en: 'Lucky spot', ja: 'ラッキースポット', zh: '幸运钓点' };
const SPOT_COLOR = '#2f78b0', LUCKY_COLOR = '#e0a020';
const DRONE_SIGN = { ko: '드론 라이트쇼', en: 'Drone Light Show', ja: 'ドローンライトショー', zh: '无人机灯光秀' };
const DRONE_NEXT = { ko: '다음 공연', en: 'Next show', ja: '次の公演', zh: '下一场' };
const DRONE_NOW = { ko: '지금 공연 중!', en: 'On now!', ja: '公演中！', zh: '正在演出！' };
const DRONE_COLOR = '#2b3a7a';
// Night during the drone show (drone-show.js): the park's own sky only.
const DAY_SKY = new THREE.Color('#bfe0f4'), NIGHT_SKY = new THREE.Color('#141d3f');
const DAY_RIVER = new THREE.Color('#4f9ccf'), NIGHT_RIVER = new THREE.Color('#1a2a52');

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
  // Ttukseom has the drone show (drone-show.js); the other Han River parks
  // (Mangwon, Banpo-Jamwon) are built from the same code without it.
  const drones = store.id === 'ttukseom-hangang';
  // Open to the street (store.open): the park lies on the real bank of the
  // world's Han River, drawn over the street (main.js openParks), so it has
  // no sky, fog, river, far bank or bridge of its own and no walls round
  // the lawn; its lights follow the street's.
  const open = !!store.open;
  const scene = new THREE.Scene();
  scene.background = open ? null : new THREE.Color('#bfe0f4');
  scene.fog = open ? null : new THREE.Fog('#bfe0f4', 40, 140);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fbf7a, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({
    p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]],
  });
  let target = scene; // (the far bank of an open park goes nowhere: the street has its own)
  const box = (sx, sy, sz, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color));
    m.position.set(x, y, z);
    target.add(m);
    return m;
  };
  const plane = (sx, sz, x, y, z, color, o) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), mat(color, o));
    m.position.set(x, y, z);
    target.add(m);
    return m;
  };

  const bank = -4; // where the land ends and the river starts (z)
  // Grass, a riverside path, and the river (wide, past the room's back).
  // Open: just the park's own lawn and path, over the street's grass and
  // its riverside walk (0.06 m up); the street's river is the water.
  const gy = open ? 0.07 : 0;
  // (pulled towards the camera harder than the street's roads, world.js, so
  // the walk under the lawn never shows through it)
  if (open) plane(w, d / 2 - bank, 0, gy, (d / 2 + bank) / 2, store.open.grass ?? '#8fcf7a', { polygonOffset: true, polygonOffsetFactor: -4 });
  else plane(w + 80, d / 2 - bank + 40, 0, 0, (d / 2 + bank) / 2 + 20, '#8fcf7a');
  plane(open ? w : w + 80, 3, 0, gy + 0.01, bank + 1.6, '#d9c7a6', open ? { polygonOffset: true, polygonOffsetFactor: -5 } : undefined); // path along the river
  const river = open ? { position: new THREE.Vector3(0, 0.03, 0), material: { color: new THREE.Color() } } // (the street's water, world.js)
    : plane(w + 300, 160, 0, -0.25, bank - 80, '#4f9ccf');
  if (!open) river.material = river.material.clone(); // (darkens at night on its own)
  box(open ? w : w + 80, 0.4, 0.4, 0, -0.05, bank, '#b9b2a6'); // embankment edge
  // Railing along the bank, with gaps for the pier.
  for (const s of [-1, 1]) {
    const len = w / 2 - 2;
    box(len, 0.06, 0.06, s * (1.8 + len / 2), 0.9, bank + 0.15, '#7a8691');
    for (let x = 1.8; x < w / 2; x += 2) box(0.06, 0.9, 0.06, s * x, 0.45, bank + 0.15, '#7a8691');
  }
  // Fishing pier into the river.
  const pierLen = 8;
  box(3, 0.2, pierLen, 0, open ? 0.02 : -0.1, bank - pierLen / 2, '#a8794f'); // (open: above the street's water)
  // A low wooden fence on the pier (posts and two rails, knee-to-hip high),
  // so the river is in view over it while you fish.
  const FENCE_H = 0.55;
  for (const s of [-1, 1]) {
    for (const y of [FENCE_H, FENCE_H * 0.5]) box(0.07, 0.07, pierLen, s * 1.5, y, bank - pierLen / 2, '#7a5636');
    for (let z = 0; z <= pierLen; z += 2) box(0.1, FENCE_H + 0.05, 0.1, s * 1.5, FENCE_H / 2, bank - z, '#6b4a2e');
  }
  for (const y of [FENCE_H, FENCE_H * 0.5]) box(3, 0.07, 0.07, 0, y, bank - pierLen, '#7a5636');
  // Far bank skyline (Cheongdam across the river) and a bridge. Its windows
  // light up during the drone show.
  // (an open park keeps only the skyline, and only where the street has
  // nothing across the water: store.open.skyline)
  const discard = new THREE.Group();
  if (open && !store.open.skyline) target = discard;
  const lit = []; // [x, y] of each lit window
  for (let i = 0; i < 26; i++) {
    const h = 6 + ((i * 37) % 11) * 2.2, bw = 5 + (i % 3), bx = -95 + i * 7.6;
    box(bw, h, 5, bx, h / 2 - 0.2, bank - 150, ['#c9d3dc', '#b7c3cf', '#dfe5ea'][i % 3]);
    for (let fy = 2; fy < h - 1; fy += 2.2) for (let c = 0; c < 3; c++) if ((i * 7 + c * 3 + Math.round(fy) * 5) % 5 > 1) lit.push([bx + (c - 1) * bw * 0.28, fy]);
  }
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 1.1),
    new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0, fog: false, depthWrite: false }), lit.length);
  const m4w = new THREE.Matrix4();
  lit.forEach(([x, y], k) => windows.setMatrixAt(k, m4w.makeTranslation(x, y, bank - 147.4)));
  windows.visible = false;
  target.add(windows);
  // Ttukseom: a low, flat two-deck girder bridge, like Cheongdam Bridge
  // across from the real Ttukseom (road on top, the Line 7 subway inside the
  // lower deck), low enough to leave the sky open for the drones. The other
  // parks keep the arched bridge.
  if (open) target = discard;
  const bz = bank - 70;
  if (drones) {
    box(260, 0.7, 5, 40, 6.2, bz, '#d6dbe0'); // road deck
    box(260, 0.3, 5.2, 40, 6.7, bz, '#c4cad1'); // its railing band
    box(260, 1.8, 4.2, 40, 4.6, bz, '#b9c1ca'); // the subway deck below
    for (let x = -80; x <= 160; x += 24) box(2.2, 4, 2.2, x, 1.6, bz, '#aab2bc'); // piers
  } else {
    box(260, 1.2, 4, 40, 7, bz, '#d6dbe0'); // bridge deck
    for (let x = -60; x <= 140; x += 25) box(2, 7, 2, x, 3.2, bz, '#c4cad1');
    for (let x = -60; x < 140; x += 25) { // arches
      const arch = new THREE.Mesh(new THREE.TorusGeometry(12.5, 0.35, 6, 24, Math.PI), mat('#e07a5f'));
      arch.position.set(x + 12.5, 7.4, bz);
      target.add(arch);
    }
  }
  // Lamps along the road deck and the subway's lit window band (at night).
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0, fog: false, depthWrite: false });
  const lampN = 44;
  const bridgeLamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 6, 4), glowMat, lampN);
  for (let k = 0; k < lampN; k++) bridgeLamps.setMatrixAt(k, m4w.makeTranslation(-88 + k * 6, 7.3, bz + 2.6));
  const trainBand = new THREE.Mesh(new THREE.PlaneGeometry(260, 0.5), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0, fog: false, depthWrite: false }));
  trainBand.position.set(40, 4.6, bz + 2.12);
  const bridgeLights = new THREE.Group();
  bridgeLights.add(bridgeLamps, trainBand);
  bridgeLights.visible = false;
  target.add(bridgeLights);

  // The drone show's launch barge (drone-show.js BARGE), out past where the
  // duck boats go: a flat deck with a grid of landing pads. It floats there
  // all day, a hint that something happens here at night.
  if (drones) {
    box(BARGE.w, 0.8, BARGE.d, BARGE.x, 0.1, BARGE.z, '#3b4048');
    box(BARGE.w - 0.4, 0.06, BARGE.d - 0.4, BARGE.x, BARGE.deck - 0.02, BARGE.z, '#5d636c');
    const padN = 12 * 4;
    const pads = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), mat('#8a93a0'), padN);
    for (let k = 0; k < padN; k++) pads.setMatrixAt(k, m4w.makeTranslation(BARGE.x + ((k % 12) - 5.5) * 1.15, BARGE.deck + 0.02, BARGE.z + (Math.floor(k / 12) - 1.5) * 1.25));
    target.add(pads);
    for (const sx of [-1, 1]) box(0.2, 1.2, 0.2, BARGE.x + sx * (BARGE.w / 2 - 0.3), BARGE.deck + 0.6, BARGE.z + BARGE.d / 2 - 0.3, '#e05a3a'); // marker posts
  }

  target = scene;

  // Walls of the play area: the river (except the pier) and the room edges.
  // The river starts just past the railing (bank + 0.3); the path in front stays walkable.
  const rz0 = -d / 2 - 0.5, rz1 = bank + 0.3;
  block(-(w / 2 + 1.5) / 2 - 0.75, (rz0 + rz1) / 2, w / 2 - 1.5, rz1 - rz0); // river left of pier
  block((w / 2 + 1.5) / 2 + 0.75, (rz0 + rz1) / 2, w / 2 - 1.5, rz1 - rz0); // river right
  block(0, bank - pierLen - 0.5, 3.4, 1); // pier end
  for (const s of [-1, 1]) block(s * 1.62, bank - pierLen / 2, 0.2, pierLen); // pier sides
  const t = 0.4;
  if (!open) { // (open: you walk off the lawn onto the street)
    block(0, d / 2 + t / 2 - 0.2, w, t);
    block(-w / 2 + 0.2 - t / 2, 0, t, d);
    block(w / 2 - 0.2 + t / 2, 0, t, d);
  }

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
  const lamps = decorate(scene, box, block, bank);

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
  const kioskWindow = box(0.05, 1.6, 3.6, kx - 1.52, 1.25, kz, '#cfe8f5').material = mat('#cfe8f5').clone(); // shop window (lit at night: its own material)
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

  // Four fishing spots spread along the water: two on the left railing, the
  // end of the pier, and the right railing past the duck boats. Each has a
  // low "낚시 가능" board on a short post, facing the path.
  const fishing = [[-20, bank + 0.7], [-8, bank + 0.7], [0, bank - pierLen + 0.8], [20, bank + 0.7]].map(([x, z]) => ({ x, z }));
  const spotSigns = fishing.map((f) => {
    const sx = f.x + 0.9, sz = f.z + 0.35;
    box(0.06, 0.5, 0.06, sx, 0.25, sz - 0.02, '#55504a'); // post
    const sign = signBoard(0.86, 0.4, SPOT_COLOR);
    sign.mesh.position.set(sx, 0.66, sz);
    scene.add(sign.mesh);
    return sign;
  });
  // The lucky spot (행운 포인트, see luckySpot in fishing.js): a gold sign,
  // a glowing ring on the ground and a clover spinning over it.
  const luckRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.7, depthWrite: false }));
  const luckGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), mat('#7ed957', { emissive: '#3fae2a', emissiveIntensity: 0.6 }));
  scene.add(luckRing, luckGem);
  let signLang = null, lucky = -1, luckT = 0;
  const drawSpotSigns = () => spotSigns.forEach((sign, i) => {
    const luck = i === lucky;
    if (signLang) sign.draw('🎣 ' + localName(FISHING_OK, signLang), luck ? '🍀 ' + localName(LUCKY_SIGN, signLang) : '', luck ? LUCKY_COLOR : SPOT_COLOR);
    else sign.draw('🎣 ' + FISHING_OK.ko, luck ? '🍀 ' + LUCKY_SIGN.ko + ' · ' + LUCKY_SIGN.en : FISHING_OK.en, luck ? LUCKY_COLOR : SPOT_COLOR);
  });
  const updateLucky = (now = Date.now()) => {
    const i = luckySpot(fishing.length, now);
    fishing.forEach((f, k) => { f.lucky = k === i; });
    if (i === lucky) return;
    lucky = i;
    luckRing.position.set(fishing[i].x, 0.03, fishing[i].z);
    drawSpotSigns();
  };
  updateLucky();
  let tickShowRef = null; // (set below, once the boards are up)
  const tick = (dt) => {
    tickShowRef?.(dt);
    luckT += dt;
    if (luckT > 1e4) luckT = 0;
    updateLucky();
    const f = fishing[lucky];
    luckGem.position.set(f.x, 1.9 + Math.sin(luckT * 2.4) * 0.12, f.z);
    luckGem.rotation.y = luckT * 1.8;
    luckRing.material.opacity = 0.45 + Math.sin(luckT * 3) * 0.25;
  };
  tick(0);

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

  // The drone show's board by the railing, left of the pier: the next show
  // time in your own time zone (or "On now!").
  const dsx = -4.6, dsz = bank + 0.75;
  const droneSign = signBoard(1.7, 0.62, DRONE_COLOR);
  if (drones) {
    for (const sx of [-0.75, 0.75]) box(0.07, 1.5, 0.07, dsx + sx, 0.75, dsz, '#3d4650');
    droneSign.mesh.position.set(dsx, 1.55, dsz + 0.04);
    scene.add(droneSign.mesh);
    block(dsx, dsz, 1.7, 0.2);
  }
  const showTime = (ms) => {
    try { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
  };
  let droneSignKey = '';
  const drawDroneSign = (now = Date.now()) => {
    if (!drones) return;
    const s = droneShowAt(now), on = !!s?.on;
    const when = on ? null : showTime(nextDroneShow(now));
    const key = `${signLang}|${on}|${when}`;
    if (key === droneSignKey) return;
    droneSignKey = key;
    const title = '🛸 ' + (signLang ? localName(DRONE_SIGN, signLang) : DRONE_SIGN.ko);
    const sub = on ? (signLang ? localName(DRONE_NOW, signLang) : DRONE_NOW.ko + ' · ' + DRONE_NOW.en) : `${signLang ? localName(DRONE_NEXT, signLang) : DRONE_NEXT.en} ${when}`;
    droneSign.draw(title, sub);
  };

  // The riverside market: stalls with sellers, and parasol tables.
  const market = buildMarket(scene, store, block, seats);
  const setSignLang = (lang) => {
    signLang = lang;
    drawSpotSigns();
    market.setSignLang(lang);
    martSign.draw(lang ? localName(mart.name, lang) : mart.name.ko || mart.name.en, lang ? '' : mart.name.ko ? mart.name.en : '');
    rSign.draw(lang ? localName(RAMEN_SIGN, lang) : RAMEN_SIGN.ko);
    fSign.draw(lang ? localName(FISH_SIGN, lang) : FISH_SIGN.ko, lang ? '' : FISH_SIGN.en);
    drawDroneSign();
  };
  setSignLang(null);

  // The drone show (drone-show.js): the park's sky turns to night, the
  // lights come on, and the drones (drone-sky.js, downloaded only now) rise
  // from the barge. Everything else in the park carries on as usual.
  const show = { now: null, night: 0 };
  let nightShown = -1, sky = null, watchers = null, skyLoading = false, signT = 0;
  const setNight = (k) => {
    if (Math.abs(k - nightShown) < 0.002) return;
    nightShown = k;
    if (!open) { // (open to the street: the sky, light and river are the street's, main.js)
      scene.background.copy(DAY_SKY).lerp(NIGHT_SKY, k);
      scene.fog.color.copy(scene.background);
      scene.fog.near = 40 + 30 * k; scene.fog.far = 140 + 200 * k;
      hemi.intensity = 1.6 - 1.25 * k; sun.intensity = 1.2 - 1.05 * k; ambient.intensity = 0.35 - 0.1 * k;
      river.material.color.copy(DAY_RIVER).lerp(NIGHT_RIVER, k);
    }
    lamps.glowMat.emissiveIntensity = 0.5 + 2 * k;
    lamps.poolMat.opacity = 0.32 * k; lamps.pools.visible = k > 0.01;
    kioskWindow.emissive.set('#fff1c8'); kioskWindow.emissiveIntensity = 0.9 * k;
    windows.material.opacity = k; windows.visible = k > 0.01;
    glowMat.opacity = k; trainBand.material.opacity = 0.75 * k; bridgeLights.visible = k > 0.01;
  };
  const tickShow = (dt) => {
    const now = Date.now(), s = droneShowAt(now);
    show.now = s;
    show.night = s ? s.night : 0;
    setNight(show.night);
    if ((signT -= dt) <= 0) { signT = 5; drawDroneSign(now); }
    if (s && s.t > -LIFT_SECONDS - 60 && !sky && !skyLoading) {
      skyLoading = true;
      const phone = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      import('./drone-sky.js').then((m) => {
        m.useShow(droneShow);
        sky = m.createDroneSky(scene, { count: phone ? 400 : 600 });
        show.photo = m.PHOTO_TIME;
        show.sky = sky;
        watchers = m.createWatchers(scene, { createCharacter, randomLook });
      }).catch(() => { skyLoading = false; }); // (offline: try again later)
    }
    if (sky) sky.update(s?.start, s?.t ?? 0, show.night);
    watchers?.update(dt, show.night);
  };

  if (drones) tickShowRef = tickShow;
  // Open to the street: its still boxes baked together (core/merge-static.js),
  // so the park costs a few draw calls on top of the city, not hundreds.
  if (open) mergeStatic(scene, [luckRing, luckGem, ...ducks.map((d) => d.g)]);
  return {
    scene, products: [...products, ...market.products], colliders, seats, clerk, turntable: null, room: ROOM, exit: EXIT,
    lights: { hemi, sun, ambient }, // (an open park's follow the street's: main.js)
    fishing, fishBuy, ramen, river, duck, ducks, park: true, vendors: market.vendors, setSignLang, tick,
    show, // the drone show right now: { now: droneShowAt(), night, photo } (main.js: camera, notices, music)
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

  // Lamp posts along the river path (just shapes; no light sources). At
  // night (the drone show) the lamp glows and a soft pool of light shows on
  // the ground below it.
  const glowMat = new THREE.MeshLambertMaterial({ color: '#fff4cf', emissive: '#ffe9a8', emissiveIntensity: 0.5 }); // (each park its own: it glows brighter at night)
  const poolMat = new THREE.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: 0, depthWrite: false });
  const poolGeo = new THREE.CircleGeometry(2.4, 24).rotateX(-Math.PI / 2);
  const pools = new THREE.Group();
  for (const x of [-17, -11, 11, 18]) {
    const z = bank + 2.9;
    box(0.1, 2.6, 0.1, x, 1.3, z, '#3d4650');
    box(0.34, 0.08, 0.34, x, 2.62, z, '#3d4650');
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), glowMat);
    glow.position.set(x, 2.45, z);
    scene.add(glow);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(x, 0.03, z);
    pools.add(pool);
    block(x, z, 0.25, 0.25);
  }
  pools.visible = false;
  scene.add(pools);
  return { glowMat, poolMat, pools };
}
