// Inside Seoul Forest's forest galleries. With a show on (src/data/
// exhibitions.js): 4 works on each side wall and 2 on the back wall under
// the show's name, the info desk by the door, benches in the middle, and
// the walls in the show's look ('colorful' or 'dark'). With nothing booked:
// a white room with "coming soon" cards on the side and front walls, the
// poster and the desk at the back.
import * as THREE from 'three';
import { EXHIBITIONS, COMING_SOON, showWork } from '../data/exhibitions.js';
import { COUNTER_H } from './counter-face.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const PASTELS = ['#f6e3e8', '#e3eef6', '#e8f3e1', '#f6efdc', '#ece4f6', '#f3e6dc'];

function tex(cw, ch, draw) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  draw(c.getContext('2d'), cw, ch);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function card(work, i) {
  return tex(256, 320, (g, w, h) => {
    g.fillStyle = PASTELS[i % PASTELS.length]; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#7a6f66';
    g.font = `800 30px ${FONT}`;
    g.fillText(work ? work.title?.ko || '' : COMING_SOON.card.ko, w / 2, h / 2 - 18, w - 30);
    g.font = `500 20px ${FONT}`;
    g.fillText(work ? work.by?.ko || work.title?.en || '' : COMING_SOON.card.en, w / 2, h / 2 + 22, w - 30);
  });
}

// scene, room {w, d, h}, helpers { box, block, mat } from interior.js.
export function buildCulture(scene, room, helpers, store) {
  const show = EXHIBITIONS[store.id] || { works: [] };
  if (show.works.length) return buildShow(scene, room, helpers, store, show);
  const { box, block } = helpers;
  const { w, d } = room;
  // Frames: 3 on each side wall, 2 on the front wall either side of the door.
  const slots = [];
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) slots.push({ x: s * (w / 2 - 0.06), z: k * (d / 4), ry: -s * Math.PI / 2 });
  for (const s of [-1, 1]) slots.push({ x: s * (w / 4 + 0.6), z: d / 2 - 0.06, ry: Math.PI });
  const loader = new THREE.TextureLoader();
  slots.forEach((sl, i) => {
    const work = show.works[i] || null;
    const g = new THREE.Group();
    g.position.set(sl.x, 1.75, sl.z);
    g.rotation.y = sl.ry;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 0.06), new THREE.MeshLambertMaterial({ color: '#3a3330' }));
    g.add(frame);
    const m = new THREE.MeshBasicMaterial({ map: card(work, i) });
    if (work?.image) loader.load(BASE + work.image, (t) => { t.colorSpace = THREE.SRGBColorSpace; m.map.dispose(); m.map = t; m.needsUpdate = true; });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), m);
    pic.position.z = 0.035;
    g.add(pic);
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.3), new THREE.MeshLambertMaterial({ color: '#2b2b2b' })); // a little spotlight above
    spot.position.set(0, 1.15, 0.2);
    g.add(spot);
    scene.add(g);
  });
  // Back wall: the show's poster on the left, the info desk on the right.
  const title = show.title || COMING_SOON.title;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: tex(512, 256, (g, cw, ch) => {
    g.fillStyle = store.colors.sign; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 44px ${FONT}`; g.fillText(title.ko, cw / 2, ch / 2 - 30, cw - 40);
    g.font = `500 28px ${FONT}`; g.fillText(title.en, cw / 2, ch / 2 + 32, cw - 40);
  }) }));
  poster.position.set(-w / 4, 1.45, -d / 2 + 0.03);
  scene.add(poster);
  const dx = w / 4, dz = -d / 2 + 1.7;
  box(2.2, COUNTER_H - 0.03, 0.7, dx, (COUNTER_H - 0.03) / 2, dz, '#f2efe8'); // (COUNTER_H: the guide's face shows, core/counter-face.js)
  box(2.3, 0.05, 0.8, dx, COUNTER_H, dz, store.colors.sign);
  block(dx, dz, 2.3, 0.8);
  const clerk = { x: dx, z: dz - 0.75, ry: 0 };
  // Benches in the middle, back to back, facing the side walls.
  const seats = [];
  for (const s of [-1, 1]) {
    const x = s * 0.8;
    box(0.6, 0.08, 2.4, x, 0.4, 0.4, '#a9805a');
    for (const k of [-1, 1]) box(0.5, 0.4, 0.1, x, 0.2, 0.4 + k * 1.05, '#6b4f36');
    block(x, 0.4, 0.6, 2.4);
    for (const o of [-0.6, 0.6]) seats.push({ x, z: 0.4 + o, ry: s * Math.PI / 2, stand: [x + s, 0.4 + o] });
  }
  // A potted plant in each back corner: it is Seoul Forest after all.
  for (const s of [-1, 1]) {
    const px = s * (w / 2 - 0.8), pz = -d / 2 + 0.8;
    box(0.6, 0.55, 0.6, px, 0.28, pz, '#c9b49a');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshLambertMaterial({ color: '#5f8a4e' }));
    leaves.position.set(px, 1.1, pz);
    scene.add(leaves);
    block(px, pz, 0.7, 0.7);
  }
  return { seats, clerk, looks: [] };
}

// The looks of a show's room: wall colours (back, left, right, front), the
// frames' colours, and what lies on the floor.
const LOOKS = {
  colorful: { walls: ['#ffd166', '#ff8fab', '#7ad3f7', '#9be38a'], frames: ['#ff5d8f', '#ffb703', '#3ab0ff', '#57cc99', '#9b5de5'], floor: '#fff7ec', halo: null, board: '#ff5d8f' },
  dark: { walls: ['#18181b', '#18181b', '#18181b', '#18181b'], frames: ['#0b0b0d'], floor: '#26262a', halo: '#303036', board: '#18181b' },
};
const MAX_SIDE = 1.5; // the longer side of a work on the wall

// Wall spots for a show: 4 on each side wall, then 2 on the back wall.
export function showSlots(room) {
  const { w, d } = room;
  const slots = [];
  for (const s of [-1, 1]) for (const z of [-3.4, -1.15, 1.15, 3.4]) slots.push({ x: s * (w / 2 - 0.05), z: z * d / 11, ry: -s * Math.PI / 2 });
  for (const x of [-1.9, 1.9]) slots.push({ x, z: -d / 2 + 0.05, ry: 0, max: 1.3, y: 1.6 }); // (lower and smaller: the room's name is above)
  for (const sl of slots) sl.look = { x: sl.x + Math.sin(sl.ry) * 1.5, z: sl.z + Math.cos(sl.ry) * 1.5 };
  return slots;
}

function buildShow(scene, room, { box, block }, store, show) {
  const { w, d, h } = room;
  const look = LOOKS[show.theme] || LOOKS.dark;
  // The walls and floor in the show's look, just inside the room's own.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: look.floor }));
  floor.position.y = 0.006;
  scene.add(floor);
  [[w, 0, -d / 2 + 0.015, 0], [d, -w / 2 + 0.015, 0, Math.PI / 2], [d, w / 2 - 0.015, 0, -Math.PI / 2], [w, 0, d / 2 - 0.015, Math.PI]].forEach(([len, x, z, ry], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshLambertMaterial({ color: look.walls[i] }));
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    scene.add(m);
  });
  // The works, each in a frame (a coloured one in a colourful show) on a
  // white mat, under a little lamp; in a dark show a soft lit patch behind.
  const loader = new THREE.TextureLoader();
  const looks = [];
  showSlots(room).forEach((sl, i) => {
    const raw = show.works[i];
    if (!raw) return;
    const work = showWork(show, raw, i);
    const max = sl.max || MAX_SIDE;
    const W = work.w >= work.h ? max : max * work.w / work.h, H = W * work.h / work.w;
    const g = new THREE.Group();
    g.position.set(sl.x, sl.y || 1.75, sl.z);
    g.rotation.y = sl.ry;
    scene.add(g);
    if (look.halo) {
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.8, H + 0.9), new THREE.MeshBasicMaterial({ color: look.halo }));
      halo.position.set(0, 0.1, 0.01);
      g.add(halo);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.22, H + 0.22, 0.04), new THREE.MeshBasicMaterial({ color: look.frames[i % look.frames.length] }));
    frame.position.z = 0.03;
    g.add(frame);
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.12, H + 0.12), new THREE.MeshBasicMaterial({ color: '#f6f4ef' }));
    matte.position.z = 0.052;
    g.add(matte);
    const art = new THREE.MeshBasicMaterial({ color: '#cfcac2' }); // until the image arrives
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), art);
    pic.position.z = 0.054;
    g.add(pic);
    loader.load(work.url, (t) => { t.colorSpace = THREE.SRGBColorSpace; art.map = t; art.color.set('#ffffff'); art.needsUpdate = true; });
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.3), new THREE.MeshLambertMaterial({ color: '#2b2b2b' }));
    spot.position.set(0, H / 2 + 0.45, 0.2);
    g.add(spot);
    looks.push({ x: sl.look.x, z: sl.look.z, painting: work });
  });
  // The show's name, big at the top of the back wall, seen as you come in
  // (in place of the room's own name).
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.2), new THREE.MeshBasicMaterial({ map: tex(1040, 240, (g, cw, ch) => {
    g.fillStyle = look.board; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const name = show.title.en !== show.title.ko ? `${show.title.ko} · ${show.title.en}` : show.title.ko;
    g.font = `800 96px ${FONT}`; g.fillText(name, cw / 2, ch / 2 - 26, cw - 60);
    g.font = `600 44px ${FONT}`; g.fillText(`📷 ${show.artist.en}`, cw / 2, ch / 2 + 66, cw - 60);
  }) }));
  board.position.set(0, h - 0.85, -d / 2 + 0.03);
  scene.add(board);
  // The info desk by the door on the right, the guide between it and the wall.
  const dx = w / 4 + 0.6, dz = d / 2 - 1.7;
  box(2.2, COUNTER_H - 0.03, 0.7, dx, (COUNTER_H - 0.03) / 2, dz, '#f2efe8'); // (COUNTER_H: the guide's face shows, core/counter-face.js)
  box(2.3, 0.05, 0.8, dx, COUNTER_H, dz, store.colors.sign);
  block(dx, dz, 2.3, 0.8);
  const clerk = { x: dx, z: dz + 0.75, ry: Math.PI };
  // Benches in the middle, back to back, facing the side walls.
  const seats = [];
  for (const s of [-1, 1]) {
    const x = s * 0.8;
    box(0.6, 0.08, 2.4, x, 0.4, -0.4, '#a9805a');
    for (const k of [-1, 1]) box(0.5, 0.4, 0.1, x, 0.2, -0.4 + k * 1.05, '#6b4f36');
    block(x, -0.4, 0.6, 2.4);
    for (const o of [-0.6, 0.6]) seats.push({ x, z: -0.4 + o, ry: s * Math.PI / 2, stand: [x + s, -0.4 + o] });
  }
  return { seats, clerk, looks, hideName: true };
}
