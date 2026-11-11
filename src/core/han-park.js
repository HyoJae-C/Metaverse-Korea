// A Han River park laid straight on the street (game/han-parks.js): the
// lawn, paths, trees and benches are the district's own map; this builds
// the things the map can't draw. That means the railing on the bank, a
// fishing pier, the kiosk with its ramen machine, the fish buyer, the
// fishing spots (one of them lucky), the duck boats at their dock, the food
// stalls, parasol tables, stone steps facing the river, lamps, flower beds
// and trees. Each park puts them where its map says (`layout`, the park's
// `hanpark` landmark), so no two parks look alike.
//
// Everything is in the park's own metres: x along the bank, z away from the
// river (inland), the bank's edge at z = 0 and the water at z < 0. Its group
// is set on the street at the landmark's spot and turn.
import * as THREE from 'three';
import { buildMarket, parasolTable, signBoard, PARASOLS } from './riverside-market.js';
import { productModel } from './product-model.js';
import { localName } from './i18n.js';
import { luckySpot } from './fishing.js';
import { makeDuckBoat, DUCK_BOATS, RAMEN_SIGN, FISH_SIGN, FISHING_OK, LUCKY_SIGN, SPOT_COLOR, LUCKY_COLOR } from './park.js';
import { BOAT_R } from './duck-boat.js';
import { mergeStatic } from './merge-static.js';
import * as droneShow from './drone-show.js';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
const { droneShowAt, nextDroneShow, BARGE, LIFT_SECONDS } = droneShow;
const DRONE_SIGN = { ko: '드론 라이트쇼', en: 'Drone Light Show', ja: 'ドローンライトショー', zh: '无人机灯光秀' };
const DRONE_NEXT = { ko: '다음 공연', en: 'Next show', ja: '次の公演', zh: '下一场' };
const DRONE_NOW = { ko: '지금 공연 중!', en: 'On now!', ja: '公演中！', zh: '正在演出！' };
const DRONE_COLOR = '#2b3a7a';

const mats = {};
const mat = (c, o) => (mats[c + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const SEAT_H = 0.38;
const FLOWERS = ['#ff8fab', '#ffd166', '#ffffff', '#c9a6f0'];
// Paving over the street's grass (pulled towards the camera, so the grass
// under it never shows through).
const PAVE = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };

// A turned spot inside the park: its own little frame at (x, z), turned by
// ry like a three.js rotation.y, so `at(lx, lz)` is that frame's point in the
// park's metres.
function frame(x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x, z, ry, at: (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c] };
}

export function buildHanPark(store, L) {
  const group = new THREE.Group();
  group.name = 'hanpark:' + store.id;
  const colliders = [], decks = [], seats = [];
  // A keep-out box, axis-aligned in the frame f (the park's own by default).
  const blockIn = (f, x0, z0, x1, z1) => colliders.push({ p: [f.at(x0, z0), f.at(x1, z0), f.at(x1, z1), f.at(x0, z1)] });
  const flat = frame(0, 0, 0);
  const block = (x, z, sx, sz) => blockIn(flat, x - sx / 2, z - sz / 2, x + sx / 2, z + sz / 2);
  const box = (sx, sy, sz, x, y, z, color, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof color === 'string' ? mat(color) : color);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const plane = (sx, sz, x, y, z, color, o, parent = group) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), mat(color, o));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // A turned group in the park (the kiosk, the fish buyer, a bench).
  const sub = (x, z, ry) => {
    const f = frame(x, z, ry);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    group.add(g);
    return { ...f, g };
  };

  // Paving: plazas and paths over the street's grass.
  for (const [x0, z0, x1, z1, c] of L.paving || []) plane(x1 - x0, z1 - z0, (x0 + x1) / 2, 0.08, (z0 + z1) / 2, c || '#d9c7a6', PAVE);

  // The pier: a wooden deck out over the river, with a low fence so the
  // water stays in view while you fish.
  const pier = L.pier ? { x: L.pier.x, len: L.pier.len || 8 } : null;
  if (pier) {
    const { x: px, len } = pier, FENCE_H = 0.55;
    box(3, 0.2, len, px, 0.02, -len / 2, '#a8794f');
    for (const s of [-1, 1]) {
      for (const y of [FENCE_H, FENCE_H * 0.5]) box(0.07, 0.07, len, px + s * 1.5, y, -len / 2, '#7a5636');
      for (let z = 0; z <= len; z += 2) box(0.1, FENCE_H + 0.05, 0.1, px + s * 1.5, FENCE_H / 2, -z, '#6b4a2e');
    }
    for (const y of [FENCE_H, FENCE_H * 0.5]) box(3, 0.07, 0.07, px, y, -len, '#7a5636');
    for (const s of [-1, 1]) block(px + s * 1.62, -len / 2, 0.2, len); // its sides
    block(px, -len - 0.5, 3.4, 1); // its end
    // (from a step back on the bank out to its end: the river's edge doesn't stop you here)
    decks.push([[px - 1.5, 0.8], [px + 1.5, 0.8], [px + 1.5, -len], [px - 1.5, -len]]);
  }

  // The duck boats' dock: four boats moored side by side on the water.
  const dock = L.dock != null ? { x: L.dock } : null;

  // The railing along the bank, with gaps onto the pier and at the dock.
  if (L.rail) {
    const [r0, r1] = L.rail;
    const gaps = (L.railGaps || []).map((g) => g.slice());
    if (pier) gaps.push([pier.x - 1.8, pier.x + 1.8]);
    if (dock) gaps.push([dock.x - 5.6, dock.x + 5.6]);
    gaps.sort((a, b) => a[0] - b[0]);
    const runs = [];
    let from = r0;
    for (const [g0, g1] of gaps) { if (g0 > from) runs.push([from, Math.min(g0, r1)]); from = Math.max(from, g1); }
    if (from < r1) runs.push([from, r1]);
    box(r1 - r0, 0.36, 0.4, (r0 + r1) / 2, 0.08, -0.05, '#b9b2a6'); // the embankment's edge
    for (const [a, b] of runs) {
      if (b - a < 0.5) continue;
      box(b - a, 0.06, 0.06, (a + b) / 2, 0.9, 0.15, '#7a8691');
      for (let x = a; x <= b + 0.01; x += 2) box(0.06, 0.9, 0.06, Math.min(x, b), 0.45, 0.15, '#7a8691');
      block((a + b) / 2, 0.15, b - a, 0.14);
    }
  }

  // Trees (a trunk and a round crown) and round bushes.
  const crown = new THREE.IcosahedronGeometry(1.4, 1);
  for (const [x, z] of L.trees || []) {
    box(0.4, 1.6, 0.4, x, 0.8, z, '#8a5a3a');
    const leaf = new THREE.Mesh(crown, mat('#5fae5a'));
    leaf.position.set(x, 2.6, z);
    group.add(leaf);
    block(x, z, 0.8, 0.8);
  }
  const m4 = new THREE.Matrix4();
  if (L.bushes?.length) {
    const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 1).scale(1.2, 0.8, 1), mat('#6dbb5f'), L.bushes.length);
    L.bushes.forEach(([x, z], i) => { bush.setMatrixAt(i, m4.makeTranslation(x, 0.38, z)); block(x, z, 1.2, 1); });
    group.add(bush);
  }

  // Flower beds: one InstancedMesh per colour.
  if (L.beds?.length) {
    const spots = FLOWERS.map(() => []);
    for (const [x, z, len] of L.beds) {
      box(len, 0.18, 0.6, x, 0.09, z, '#9a6b47');
      box(len - 0.1, 0.02, 0.5, x, 0.185, z, '#6b4a32');
      const n = Math.max(2, Math.round(len * 5));
      for (let i = 0; i < n; i++) spots[i % FLOWERS.length].push([x - len / 2 + 0.12 + (i / (n - 1)) * (len - 0.24), z + ((i * 7) % 3 - 1) * 0.14]);
      block(x, z, len, 0.6);
    }
    const head = new THREE.IcosahedronGeometry(0.09, 0);
    FLOWERS.forEach((c, k) => {
      if (!spots[k].length) return;
      const inst = new THREE.InstancedMesh(head, mat(c), spots[k].length);
      spots[k].forEach(([x, z], i) => inst.setMatrixAt(i, m4.makeTranslation(x, 0.3, z)));
      group.add(inst);
    });
  }

  // Lamp posts (just shapes, no light sources): the lamp glows at night.
  const glowMat = new THREE.MeshLambertMaterial({ color: '#fff4cf', emissive: '#ffe9a8', emissiveIntensity: 0.5 });
  const glowGeo = new THREE.SphereGeometry(0.17, 10, 8);
  for (const [x, z] of L.lamps || []) {
    box(0.1, 2.6, 0.1, x, 1.3, z, '#3d4650');
    box(0.34, 0.08, 0.34, x, 2.62, z, '#3d4650');
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, 2.45, z);
    group.add(glow);
    block(x, z, 0.25, 0.25);
  }

  // Benches, facing the way they're turned (ry 0: the river).
  for (const [x, z, ry = 0] of L.benches || []) {
    const b = sub(x, z, ry);
    box(1.8, 0.08, 0.5, 0, SEAT_H, 0, '#b07a4a', b.g);
    box(1.8, 0.5, 0.08, 0, SEAT_H + 0.3, 0.25, '#b07a4a', b.g);
    for (const lx of [-0.8, 0.8]) box(0.08, SEAT_H, 0.4, lx, SEAT_H / 2, 0, '#55504a', b.g);
    blockIn(b, -0.95, -0.3, 0.95, 0.3);
    for (const sx of [-0.45, 0.45]) { const [qx, qz] = b.at(sx, -0.02), [tx, tz] = b.at(sx, -0.8); seats.push({ x: qx, z: qz, ry: ry + Math.PI, stand: [tx, tz] }); }
  }

  // Stone steps facing the river (Banpo's, for the fountain; Mangwon's, turned
  // to the sunset: `sunset`, game/sunset-spot.js): long low rows one behind
  // the other, a seat every metre.
  for (const st of L.steps || []) {
    const b = sub(st.x, st.z, st.ry || 0);
    for (let k = 0; k < (st.rows || 3); k++) {
      const rz = k * (st.gap || 1.4); // (a little wider on turned steps: room to stand between rows)
      box(st.w, SEAT_H, 0.55, 0, SEAT_H / 2, rz, '#cfc8bb', b.g);
      box(st.w, 0.04, 0.6, 0, SEAT_H + 0.02, rz, '#e2dccf', b.g);
      blockIn(b, -st.w / 2, rz - 0.3, st.w / 2, rz + 0.3);
      for (let sx = -st.w / 2 + 0.6; sx <= st.w / 2 - 0.6; sx += 1) {
        const [qx, qz] = b.at(sx, rz), [tx, tz] = b.at(sx, rz - 0.75);
        seats.push({ x: qx, z: qz, ry: (st.ry || 0) + Math.PI, stand: [tx, tz], sunset: st.sunset || undefined });
      }
    }
  }

  // The kiosk (its front, +z in its own frame, faces its customers): the
  // goods on the counter, the clerk behind it, the ramen machine beside it.
  const mart = store.kiosk || { name: { ko: '편의점', en: 'Convenience store' }, color: '#2f9e6e' };
  const products = [];
  let martSign = null, rSign = null, kioskWindow = null, clerk = null, ramen = null;
  if (L.kiosk) {
    const k = sub(...L.kiosk);
    box(5, 3, 3, 0, 1.5, 0, '#f7f5f0', k.g);
    box(5.2, 0.6, 3.2, 0, 3.1, 0, mart.color, k.g);
    martSign = signBoard(5, 0.6, mart.color);
    martSign.mesh.position.set(0, 3.1, 1.62);
    k.g.add(martSign.mesh);
    kioskWindow = mat('#cfe8f5').clone(); // (lit at night: its own material)
    box(3.6, 1.6, 0.05, 0, 1.25, 1.52, kioskWindow, k.g);
    box(2.8, 0.62, 0.45, 0, 0.31, 2.3, '#f5efe4', k.g);
    box(2.85, 0.05, 0.5, 0, 0.64, 2.3, mart.color, k.g);
    blockIn(k, -2.6, -1.6, 2.6, 2.6);
    colliders[colliders.length - 1].tall = true; // (a building: the camera stops at it)
    const goods = store.products.filter((p) => p.kiosk).slice(0, 3);
    goods.forEach((product, i) => {
      const lx = (i - (goods.length - 1) / 2) * 0.9;
      const g = new THREE.Group();
      g.position.set(lx, 0.67, 2.3);
      for (const dx of [-0.28, 0, 0.28]) { // three of each, stocked
        const m = productModel(product.model, product.color, product);
        m.scale.setScalar(dx ? 1.3 : 1.6);
        m.position.x = dx;
        g.add(m);
      }
      k.g.add(g);
      const [x, z] = k.at(lx, 3.5);
      products.push({ product, mesh: g, pos: new THREE.Vector3(x, 0, z) });
    });
    const [cx, cz] = k.at(0, 1.65);
    clerk = { x: cx, z: cz, ry: k.ry };
    // The ramen machine: water is free, the ramyeon (and an egg) come from the bag.
    box(0.8, 1.3, 0.7, 3.3, 0.65, 1.8, '#d8452f', k.g);
    box(0.45, 0.35, 0.05, 3.3, 1.05, 2.16, '#222', k.g);
    box(0.5, 0.06, 0.5, 3.3, 1.33, 1.8, '#9aa0a8', k.g);
    rSign = signBoard(1.2, 0.36, '#d8452f');
    rSign.mesh.position.set(3.3, 1.6, 2.17);
    k.g.add(rSign.mesh);
    blockIn(k, 2.85, 1.4, 3.75, 2.2);
    const [rx, rz] = k.at(3.3, 3);
    ramen = { x: rx, z: rz };
  }
  for (const [i, [tx, tz]] of (L.tables || []).entries()) parasolTable(group, block, seats, tx, tz, PARASOLS[(i + 1) % PARASOLS.length]);

  // Fishing spots, each with a low "낚시 가능" board facing inland, and the
  // lucky one (luckySpot in fishing.js): a gold board, a glowing ring on the
  // ground and a clover spinning over it.
  const fishing = (L.fishing || []).map(([x, z]) => ({ x, z }));
  const spotSigns = fishing.map((f) => {
    box(0.06, 0.5, 0.06, f.x + 0.9, 0.25, f.z + 0.33, '#55504a');
    const sign = signBoard(0.86, 0.4, SPOT_COLOR);
    sign.mesh.position.set(f.x + 0.9, 0.66, f.z + 0.35);
    group.add(sign.mesh);
    return sign;
  });
  const luckRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.7, depthWrite: false }));
  const luckGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), mat('#7ed957', { emissive: '#3fae2a', emissiveIntensity: 0.6 }));
  if (fishing.length) group.add(luckRing, luckGem);
  let signLang = null, lucky = -1, luckT = 0;
  const drawSpotSigns = () => spotSigns.forEach((sign, i) => {
    const luck = i === lucky;
    if (signLang) sign.draw('🎣 ' + localName(FISHING_OK, signLang), luck ? '🍀 ' + localName(LUCKY_SIGN, signLang) : '', luck ? LUCKY_COLOR : SPOT_COLOR);
    else sign.draw('🎣 ' + FISHING_OK.ko, luck ? '🍀 ' + LUCKY_SIGN.ko + ' · ' + LUCKY_SIGN.en : FISHING_OK.en, luck ? LUCKY_COLOR : SPOT_COLOR);
  });
  const updateLucky = (now = Date.now()) => {
    if (!fishing.length) return;
    const i = luckySpot(fishing.length, now);
    fishing.forEach((f, k) => { f.lucky = k === i; });
    if (i === lucky) return;
    lucky = i;
    luckRing.position.set(fishing[i].x, 0.1, fishing[i].z);
    drawSpotSigns();
  };
  updateLucky();

  // The fish buyer: an ice-box stand where your catch sells at the fish
  // market's prices. Its front (+z) faces whoever comes to sell.
  let fSign = null, fishBuy = null;
  if (L.fishBuy) {
    const f = sub(...L.fishBuy);
    box(1.5, 0.8, 0.7, 0, 0.4, 0, '#2f78b0', f.g);
    box(1.3, 0.32, 0.5, 0, 0.96, 0, '#f2f7fb', f.g);
    box(1.32, 0.06, 0.52, 0, 1.14, 0, '#5fb0de', f.g);
    for (const sx of [-0.7, 0.7]) box(0.07, 1.6, 0.07, sx, 1.4, -0.3, '#55504a', f.g);
    fSign = signBoard(1.6, 0.48, '#2f78b0');
    fSign.mesh.position.set(0, 2.2, -0.28);
    f.g.add(fSign.mesh);
    const fish = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mat('#9aa7b4'));
    fish.scale.set(1.6, 0.7, 0.45);
    fish.position.set(-0.25, 1.27, 0.05);
    f.g.add(fish);
    blockIn(f, -0.8, -0.4, 0.8, 0.4);
    const [x, z] = f.at(0, 1.1);
    fishBuy = { x, z };
  }

  // The duck boats wait at the dock until someone gets in; they face the
  // river (-z), so riders look out over the water.
  const ducks = [];
  let duckArea = null;
  if (dock) {
    for (let i = 0; i < DUCK_BOATS; i++) {
      const g = makeDuckBoat(['#ff9bb3', '#86b8f0', '#a6d97a', '#c9a6f0'][i]);
      const home = { x: dock.x - 3.9 + i * 2.6, z: -1.7 };
      g.position.set(home.x, 0, home.z);
      group.add(g);
      ducks.push({ g, home, i });
    }
    const sg = box(0.9, 0.5, 0.05, dock.x + 5.4, 1.2, 0.4, '#ffd166');
    sg.rotation.y = -0.2;
    const w = L.duckWater || { minX: dock.x - 24, maxX: dock.x + 24, minZ: -40 };
    duckArea = {
      water: { minX: w.minX, maxX: w.maxX, minZ: w.minZ, maxZ: -1.5 },
      pier: pier && pier.x > w.minX - BOAT_R && pier.x < w.maxX + BOAT_R ? { minX: pier.x - 1.6, maxX: pier.x + 1.6, minZ: -pier.len - 0.6, maxZ: 0 } : null,
    };
  }

  // A grey warship moored off the bank (Mangwon's Seoul Battleship Park): a
  // hull, its deck, the bridge, a mast and a gun at the bow. Just to look at.
  for (const [x, z, len = 40] of L.ships || []) {
    const beam = 7;
    box(len, 2.6, beam, x, 0.6, z, '#7d8790'); // hull
    box(len * 0.92, 0.12, beam - 0.4, x, 1.96, z, '#9aa3ab'); // deck
    box(len * 0.06, 1.2, beam * 0.7, x - len * 0.45, 1.4, z, '#7d8790'); // the bow, a step up
    box(len * 0.22, 3, beam * 0.6, x + len * 0.05, 3.5, z, '#a9b2ba'); // the bridge
    box(len * 0.2, 0.5, beam * 0.62, x + len * 0.05, 4.9, z, '#56606a'); // its windows
    box(0.25, 6, 0.25, x + len * 0.12, 7.5, z, '#56606a'); // mast
    box(2.4, 0.18, 0.18, x + len * 0.12, 9.2, z, '#56606a');
    box(len * 0.08, 1, len * 0.08, x - len * 0.3, 2.5, z, '#8c959d'); // the gun's turret
    const gun = box(len * 0.12, 0.25, 0.25, x - len * 0.37, 2.7, z, '#56606a');
    gun.rotation.z = -0.08;
    box(len, 0.4, beam + 0.1, x, -0.55, z, '#3d464e'); // the waterline
  }

  // A far-bank skyline across the water (where the street has nothing
  // there): its windows light up at night.
  const lit = [];
  let windows = null;
  if (L.skyline) {
    const { z, x0, n = 26 } = L.skyline;
    for (let i = 0; i < n; i++) {
      const h = 6 + ((i * 37) % 11) * 2.2, bw = 5 + (i % 3), bx = x0 + i * 7.6;
      box(bw, h, 5, bx, h / 2 - 0.2, z, ['#c9d3dc', '#b7c3cf', '#dfe5ea'][i % 3]);
      for (let fy = 2; fy < h - 1; fy += 2.2) for (let c = 0; c < 3; c++) if ((i * 7 + c * 3 + Math.round(fy) * 5) % 5 > 1) lit.push([bx + (c - 1) * bw * 0.28, fy]);
    }
    windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 1.1),
      new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0, fog: false, depthWrite: false }), lit.length);
    lit.forEach(([x, y], k) => windows.setMatrixAt(k, m4.makeTranslation(x, y, z + 2.6)));
    windows.visible = false;
    group.add(windows);
  }

  // The drone light show (Ttukseom: core/drone-show.js has the schedule and
  // its spots in the old park room's metres, whose bank was at z = -4; here
  // they sit in `showG`, set on the park at the drones' x and 4 m inland).
  // The launch barge floats out on the water all day; at show time the
  // drones (drone-sky.js, downloaded only then) rise from it and a few people
  // watch from mats on the lawn and at the railing.
  const D = L.drones || null;
  const showG = new THREE.Group();
  const show = D ? { now: null, night: 0 } : null;
  let droneSign = null;
  if (D) {
    showG.position.set(D.x, 0, 4);
    const bx = D.x + BARGE.x, bz = BARGE.z + 4;
    box(BARGE.w, 0.8, BARGE.d, bx, 0.1, bz, '#3b4048');
    box(BARGE.w - 0.4, 0.06, BARGE.d - 0.4, bx, BARGE.deck - 0.02, bz, '#5d636c');
    const padN = 12 * 4;
    const pads = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), mat('#8a93a0'), padN);
    for (let k = 0; k < padN; k++) pads.setMatrixAt(k, m4.makeTranslation(bx + ((k % 12) - 5.5) * 1.15, BARGE.deck + 0.02, bz + (Math.floor(k / 12) - 1.5) * 1.25));
    group.add(pads);
    for (const sx of [-1, 1]) box(0.2, 1.2, 0.2, bx + sx * (BARGE.w / 2 - 0.3), BARGE.deck + 0.6, bz + BARGE.d / 2 - 0.3, '#e05a3a'); // marker posts
    // Its board by the railing: the next show in your own time (or "On now!").
    if (D.sign) {
      const f = sub(...D.sign);
      for (const sx of [-0.75, 0.75]) box(0.07, 1.5, 0.07, sx, 0.75, 0, '#3d4650', f.g);
      droneSign = signBoard(1.7, 0.62, DRONE_COLOR);
      droneSign.mesh.position.set(0, 1.55, 0.04);
      f.g.add(droneSign.mesh);
      blockIn(f, -0.85, -0.1, 0.85, 0.1);
    }
  }
  const showTime = (ms) => {
    try { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
  };
  let droneSignKey = '';
  const drawDroneSign = (now = Date.now()) => {
    if (!droneSign) return;
    const s = droneShowAt(now), on = !!s?.on;
    const when = on ? null : showTime(nextDroneShow(now));
    const key = `${signLang}|${on}|${when}`;
    if (key === droneSignKey) return;
    droneSignKey = key;
    const title = '🛸 ' + (signLang ? localName(DRONE_SIGN, signLang) : DRONE_SIGN.ko);
    const sub2 = on ? (signLang ? localName(DRONE_NOW, signLang) : DRONE_NOW.ko + ' · ' + DRONE_NOW.en) : `${signLang ? localName(DRONE_NEXT, signLang) : DRONE_NEXT.en} ${when}`;
    droneSign.draw(title, sub2);
  };
  let sky = null, watchers = null, skyLoading = false, signT = 0;
  const tickShow = (dt) => {
    const now = Date.now(), s = droneShowAt(now);
    show.now = s;
    show.night = s ? s.night : 0;
    if ((signT -= dt) <= 0) { signT = 5; drawDroneSign(now); }
    if (s && s.t > -LIFT_SECONDS - 60 && !sky && !skyLoading) {
      skyLoading = true;
      import('./drone-sky.js').then((m) => {
        m.useShow(droneShow);
        sky = m.createDroneSky(showG, { count: 900 } /* 900 drones on every device (one draw call) */);
        show.photo = m.PHOTO_TIME;
        show.sky = sky;
        watchers = m.createWatchers(showG, { createCharacter, randomLook, mats: D.mats, rail: D.rail });
      }).catch(() => { skyLoading = false; }); // (offline: try again later)
    }
    if (sky) sky.update(s?.start, s?.t ?? 0, show.night);
    watchers?.update(dt, show.night);
  };

  // The food stalls, their tables and the market's name board.
  const market = L.market ? buildMarket(group, store, block, seats, L.market) : { products: [], vendors: [], setSignLang() {} };

  const setSignLang = (lang) => {
    signLang = lang;
    drawSpotSigns();
    market.setSignLang(lang);
    martSign?.draw(lang ? localName(mart.name, lang) : mart.name.ko || mart.name.en, lang ? '' : mart.name.ko ? mart.name.en : '');
    rSign?.draw(lang ? localName(RAMEN_SIGN, lang) : RAMEN_SIGN.ko);
    fSign?.draw(lang ? localName(FISH_SIGN, lang) : FISH_SIGN.ko, lang ? '' : FISH_SIGN.en);
    drawDroneSign();
  };
  setSignLang(null);

  // Each frame (while near): the lucky spot moves on now and then, its clover spins.
  const tick = (dt) => {
    if (show) tickShow(dt);
    if (!fishing.length) return;
    luckT = (luckT + dt) % 1e4;
    updateLucky();
    const f = fishing[lucky];
    luckGem.position.set(f.x, 1.9 + Math.sin(luckT * 2.4) * 0.12, f.z);
    luckGem.rotation.y = luckT * 1.8;
    luckRing.material.opacity = 0.45 + Math.sin(luckT * 3) * 0.25;
  };
  tick(0);
  // Dusk to night (0..1): the lamps and the kiosk's window light up.
  let nightShown = -1;
  const setNight = (k) => {
    if (Math.abs(k - nightShown) < 0.01) return;
    nightShown = k;
    glowMat.emissiveIntensity = 0.5 + 2 * k;
    if (kioskWindow) { kioskWindow.emissive.set('#fff1c8'); kioskWindow.emissiveIntensity = 0.9 * k; }
    if (windows) { windows.material.opacity = k; windows.visible = k > 0.01; }
  };

  // Its still boxes baked together: a few draw calls on top of the city.
  mergeStatic(group, [luckRing, luckGem, ...ducks.map((d) => d.g)]);
  if (D) group.add(showG); // (the drones and their watchers come later: never baked)
  return {
    group, colliders, decks, seats, products: [...products, ...market.products], vendors: market.vendors, clerk,
    fishing, fishBuy, ramen, ducks, duckArea, setSignLang, tick, setNight,
    show, // the drone show right now, or null: { now: droneShowAt(), night, photo, sky } (main.js: camera, notices, music)
  };
}
