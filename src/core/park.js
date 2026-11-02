// Ttukseom Han River Park: an outdoor "room" entered like a shop. Grass and a
// riverside path in front, the river behind with a fishing pier, the far bank
// and a bridge in the distance, benches to sit on, and a convenience-store
// kiosk with a ramen machine (한강 라면). Same shape as buildInterior's result.
import * as THREE from 'three';

const mats = {};
const mat = (c, o) => (mats[c + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const SEAT_H = 0.38;

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
  for (const s of [-1, 1]) box(0.08, 0.9, pierLen, s * 1.5, 0.45, bank - pierLen / 2, '#7a5636');
  box(3, 0.9, 0.08, 0, 0.45, bank - pierLen, '#7a5636');
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

  // Trees on the grass.
  for (const [x, z] of [[-14, 6], [-10, 10], [12, 9], [15, 4], [-15, -1], [9, 12]]) {
    box(0.4, 1.6, 0.4, x, 0.8, z, '#8a5a3a');
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), mat('#5fae5a'));
    leaf.position.set(x, 2.6, z);
    scene.add(leaf);
    block(x, z, 0.8, 0.8);
  }

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

  // Convenience-store kiosk with the ramen machine (right side).
  const kx = w / 2 - 4, kz = 4;
  box(5, 3, 3, kx, 1.5, kz, '#f7f5f0');
  box(5.2, 0.5, 3.2, kx, 3.1, kz, '#2f8f5b'); // sign band
  const sc = document.createElement('canvas');
  sc.width = 512; sc.height = 96;
  const g = sc.getContext('2d');
  g.fillStyle = '#2f8f5b'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#fff';
  g.font = '800 54px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('한강 편의점 · 라면', 256, 52);
  const tex = new THREE.CanvasTexture(sc);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.94), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(kx - 2.62, 3.1, kz);
  sign.rotation.y = -Math.PI / 2;
  scene.add(sign);
  box(0.6, 1.2, 0.7, kx - 2.8, 0.6, kz - 0.6, '#d8452f'); // ramen machine
  box(0.4, 0.3, 0.05, kx - 2.8, 1.0, kz - 0.98, '#222');
  block(kx, kz, 5.4, 3.4);
  block(kx - 2.8, kz - 0.6, 0.8, 0.9);
  const clerk = { x: kx - 3.1, z: kz + 0.9, ry: -Math.PI / 2 };
  const ramen = { x: kx - 3.8, z: kz - 0.2 };

  // Fishing spots: the end of the pier and the railing on both sides.
  const fishing = [[0, bank - pierLen + 0.8], [-6, bank + 0.7], [7, bank + 0.7]].map(([x, z]) => ({ x, z }));
  for (const f of fishing) {
    const sign2 = box(0.5, 0.35, 0.05, f.x + 0.7, 1.1, f.z + 0.3, '#ffd166'); // little 🎣 board
    sign2.rotation.y = 0.2;
  }

  // Duck boats (오리배) moored to the right of the pier, with a ticket sign.
  const duck = { x: 11, z: bank + 0.9 };
  for (let i = 0; i < 3; i++) {
    const bx = 9 + i * 2.4, bz = bank - 1.6;
    box(1.6, 0.4, 1.1, bx, 0.05, bz, '#fffaf0'); // hull
    box(0.5, 0.8, 0.5, bx - 0.4, 0.55, bz, '#ffd166'); // the duck's neck and head
    box(0.3, 0.12, 0.2, bx - 0.75, 0.85, bz, '#f08a2c'); // beak
    box(1.0, 0.08, 1.0, bx + 0.25, 1.15, bz, ['#ff9bb3', '#86b8f0', '#a6d97a'][i]); // roof
  }
  const sign3 = box(0.9, 0.5, 0.05, duck.x + 1.2, 1.2, duck.z + 0.2, '#ffd166');
  sign3.rotation.y = -0.2;

  return {
    scene, products: [], colliders, seats, clerk, turntable: null, room: ROOM, exit: EXIT,
    fishing, ramen, river, duck, park: true,
  };
}
