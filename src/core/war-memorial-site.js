// The War History Museum (전쟁역사박물관) from outside: the game's made-up
// museum, modelled loosely on the War Memorial of Korea (map landmarks on the Itaewon map,
// west along Itaewon-ro, where the real one stands at 29 Itaewon-ro).
//
// warMemorial: drawn round the main building's centre, which faces south
// onto the Peace Plaza and the road. The building block itself is a map
// building (so the entrance can sit on its front); this adds the granite
// front with its columns, the dome, the steps, the two memorial corridors
// (회랑) that line the plaza, the Peace Plaza's paving and its words, and the
// name stone by the road. The spot west of the gate where the Statue of
// Brothers stands in real life is left empty on purpose.
//
// outdoorExhibits: the outdoor exhibition (옥외전시장): retired tanks and
// aircraft on plinths. Simplified, generic game shapes, not copies of any
// particular model.
//
// Low-poly and not to scale; collision comes from the map's blockers.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';

const mat = matCache({ flatShading: true });
const GRANITE = '#cfcac0', GRANITE_DARK = '#a9a49a', NAMES = '#3a3d40', BRONZE = '#6f6a5a';
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif';

const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
function cyl(g, rt, rb, h, x, y, z, c, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function textTex(cw, ch, draw) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  draw(c.getContext('2d'), cw, ch);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Rows of tiny carved marks: names on a dark stone wall, seen from afar.
// No real names are written; the texture only suggests the carving.
let namesTex = null;
function namesTexture() {
  if (namesTex) return namesTex;
  namesTex = textTex(256, 128, (c, w, h) => {
    c.fillStyle = NAMES; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(220,214,200,0.55)';
    for (let y = 8; y < h - 4; y += 9) for (let x = 6; x < w - 10; x += 22) c.fillRect(x, y, 12 + ((x * 7 + y * 3) % 5), 2);
  });
  namesTex.wrapS = namesTex.wrapT = THREE.RepeatWrapping;
  return namesTex;
}

// A flat panel of text (a stone sign, an inscription, an information board).
function panel(w, h, draw, px = 128) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(Math.round(w * px), Math.round(h * px), draw), transparent: true }));
}

// One memorial corridor along z: a granite roof on columns, open to the
// plaza, its back wall carved with names. side: -1 west, +1 east (the back
// wall is on the outer side).
function corridor(g, x, z0, z1, side) {
  const len = z1 - z0, zc = (z0 + z1) / 2, depth = 7, H = 6.4;
  const back = x + side * depth / 2;
  box(g, 0.8, H, len, back, H / 2, zc, GRANITE); // back wall
  const names = new THREE.Mesh(new THREE.PlaneGeometry(len - 2, H - 2.2), new THREE.MeshBasicMaterial({ map: namesTexture().clone() }));
  names.material.map.repeat.set(len / 12, 2);
  names.material.map.needsUpdate = true;
  names.position.set(back - side * 0.42, H / 2 - 0.2, zc);
  names.rotation.y = -side * Math.PI / 2;
  g.add(names);
  box(g, depth + 1.2, 0.8, len + 1.2, x, H + 0.4, zc, GRANITE); // roof slab
  box(g, depth + 1.6, 0.3, len + 1.6, x, H + 0.95, zc, GRANITE_DARK);
  for (let z = z0; z <= z1 + 0.01; z += 6) box(g, 0.7, H, 0.7, x - side * depth / 2, H / 2, z, GRANITE); // columns on the plaza side
  box(g, depth, 0.2, len, x, 0.1, zc, GRANITE_DARK); // floor
}

export function warMemorial(g) {
  // The main building (a map building) runs x -70..70, z -20..20, 16 m high,
  // with the entrance block stepped forward to z = 26 in the middle
  // (x -17..17). The game's entrance door sits on that front; this adds the
  // block's taller top, a tall glass front and six columns, with a wide gap
  // in the middle for the door.
  const FRONT = 26;
  box(g, 34, 6, 6, 0, 19, FRONT - 3, GRANITE); // the entrance block rises above the rest
  box(g, 36, 1.4, 8.6, 0, 22.7, FRONT - 1.7, GRANITE_DARK); // cornice
  box(g, 16, 12, 0.04, 0, 7.6, FRONT + 0.02, '#3f4a52'); // tall glass over the door
  for (const x of [-15.5, -10, -4.5, 4.5, 10, 15.5]) cyl(g, 0.8, 0.9, 20, x, 10, FRONT + 1.6, GRANITE, 14); // columns
  box(g, 34, 1.2, 2.6, 0, 20.6, FRONT + 1.4, GRANITE); // beam over the columns
  // The dome over the central hall, on a drum, with a slim lantern on top.
  cyl(g, 15, 15, 4, 0, 18, 0, GRANITE, 28);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(14.5, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#9aa3a6'));
  dome.position.y = 20;
  g.add(dome);
  cyl(g, 1.6, 2, 3, 0, 36, 0, GRANITE, 12);
  // A band of darker stone along the long front, and windows.
  box(g, 140.4, 1.2, 40.4, 0, 16.2, 0, GRANITE_DARK); // roof edge
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) box(g, 5, 7, 0.2, s * (24 + i * 7.6), 7, 20.1, '#5d6a72');

  // The memorial corridors either side of the plaza.
  corridor(g, -74, 24, 98, -1);
  corridor(g, 74, 24, 98, 1);

  // Peace Plaza: rings of paving and the words at its centre (from the
  // memorial: "평화를 원하거든 전쟁을 기억하라").
  const pz = 62;
  const ring = (r0, r1, c, y) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: c }));
    m.position.set(0, y, pz);
    m.userData.noShadow = true;
    g.add(m);
  };
  ring(22, 30, '#bdb6a8', 0.05);
  ring(12, 22, '#d8d2c6', 0.05);
  ring(0, 12, '#b9b1a1', 0.05);
  const words = panel(20, 4, (c, w, h) => {
    c.fillStyle = '#5a5246'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${h * 0.34}px ${FONT}`;
    c.fillText('평화를 원하거든 전쟁을 기억하라', w / 2, h * 0.33, w - 20);
    c.font = `600 ${h * 0.22}px ${FONT}`;
    c.fillText('If you want peace, remember war', w / 2, h * 0.75, w - 20);
  });
  words.rotation.x = -Math.PI / 2;
  words.position.set(0, 0.07, pz);
  words.userData.noShadow = true;
  g.add(words);

  // The name stone by the road, east of the way in (the west side, where
  // the Statue of Brothers stands in real life, stays empty).
  const sz = 106;
  box(g, 22, 2.6, 2.4, 28, 1.3, sz, GRANITE_DARK);
  box(g, 22.6, 0.3, 2.8, 28, 2.75, sz, GRANITE);
  for (const side of [1, -1]) {
    const name = panel(20, 2.2, (c, w, h) => {
      c.fillStyle = BRONZE; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `800 ${h * 0.42}px ${FONT}`;
      c.fillText('전쟁역사박물관', w / 2, h * 0.34, w - 16);
      c.font = `700 ${h * 0.24}px ${FONT}`;
      c.fillText('WAR HISTORY MUSEUM', w / 2, h * 0.76, w - 16);
    });
    name.position.set(28, 1.35, sz + side * 1.22);
    if (side < 0) name.rotation.y = Math.PI;
    g.add(name);
  }
}

// ── Outdoor exhibition ──
function tank(g, x, z, ry, c) {
  const t = new THREE.Group();
  for (const s of [-1, 1]) box(t, 1.1, 1.2, 7.2, s * 1.75, 0.6, 0, '#2e3128'); // tracks
  box(t, 3.4, 1.1, 6.6, 0, 1.55, 0, c); // hull
  box(t, 3, 0.4, 1.2, 0, 1.6, 3.6, c); // sloped front (simplified)
  const turret = cyl(t, 1.35, 1.6, 1.0, 0, 2.6, -0.4, c, 10);
  turret.scale.z = 1.25;
  const gun = cyl(t, 0.13, 0.15, 4.6, 0, 2.6, 2.6, '#3a3d33', 8);
  gun.rotation.x = Math.PI / 2;
  box(t, 4.6, 0.5, 8.6, 0, 0.25 - 0.5, 0, GRANITE_DARK); // plinth (sunk a little)
  t.position.set(x, 0.5, z);
  t.rotation.y = ry;
  g.add(t);
}
function aircraft(g, x, z, ry, c) {
  const a = new THREE.Group();
  const body = cyl(a, 0.7, 0.9, 11, 0, 0, 0, c, 10);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 10), mat(c));
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 6.6;
  a.add(nose);
  box(a, 10, 0.18, 2.6, 0, -0.1, 0.6, c); // wings
  box(a, 3.8, 0.14, 1.3, 0, 0.2, -4.8, c); // tail plane
  box(a, 0.16, 2, 1.6, 0, 1.1, -4.8, c); // fin
  box(a, 0.9, 0.5, 1.6, 0, 0.75, 2.6, '#4f6470'); // canopy
  a.position.y = 3.2;
  const g2 = new THREE.Group();
  g2.add(a);
  for (const pz of [-2.5, 2.5]) cyl(g2, 0.25, 0.3, 2.3, 0, 1.15, pz, GRANITE_DARK, 8); // display stands
  box(g2, 5, 0.3, 9, 0, 0.15, 0, GRANITE_DARK);
  g2.position.set(x, 0, z);
  g2.rotation.y = ry;
  g.add(g2);
}

export function outdoorExhibits(g) {
  // Drawn round a spot 130 m north of the road; the exhibits stand on the
  // lawn near the front, either side of the path from the road.
  tank(g, -14, 25, 0.5, '#5f6b45');
  tank(g, -14, 50, 0.5, '#66704a');
  tank(g, -14, 75, 0.5, '#58633f');
  aircraft(g, 12, 32, -0.4, '#8d969c');
  aircraft(g, 12, 68, -0.4, '#7f8a73');
  // The information board at the front, facing the road.
  const sign = panel(6, 3, (c, w, h) => {
    c.fillStyle = '#2d3133'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e6d3a3'; c.textAlign = 'center'; c.textBaseline = 'top';
    c.font = `800 ${h * 0.12}px ${FONT}`;
    c.fillText('옥외전시장 · Outdoor Exhibition', w / 2, h * 0.08, w - 20);
    c.fillStyle = '#f1ede4'; c.font = `600 ${h * 0.075}px ${FONT}`;
    c.fillText('실제 전쟁기념관에는 퇴역한 전차와 항공기가 전시되어 있어요.', w / 2, h * 0.32, w - 20);
    c.fillText('여기 있는 것은 간단하게 만든 게임 모형이에요.', w / 2, h * 0.43, w - 20);
    c.fillStyle = '#c9c4ba'; c.font = `500 ${h * 0.07}px ${FONT}`;
    c.fillText('Retired tanks and aircraft are shown outdoors at the real War Memorial of Korea.', w / 2, h * 0.62, w - 20);
    c.fillText('These are simplified game models, not exact replicas.', w / 2, h * 0.73, w - 20);
  });
  sign.position.set(0, 1.9, 92);
  g.add(sign);
  box(g, 6.3, 3.3, 0.2, 0, 1.9, 91.88, '#2d3133');
}
