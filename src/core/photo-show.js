// A photo gallery on several floors: Gallery A (Seoul Forest's culture
// center, three floors) and Gallery D (forest gallery 3, two floors)
// (stores.json workshop "photo-show"; the shows in data/photo-show.js).
// Each floor, seen from the door:
//
//        ┌───────────────────────────────────┐
//        │ ▢     ▢    (dark gallery)  ▢    ▢ │  back wall: 4 photos
//        │▢                                 ▢│  side walls: 3 each
//        │▢       [main photo, 1F only]     ▢│
//        │▢        (benches upstairs)       ▢│
//        ├────[lift]──────┐   ┌─────────────┤  partition with a wide way in
//        │  foyer: floor guide · info desk  │  (bright; the desk on 1F)
//        └───────────────[door]─────────────┘
//
// The artist asked for dark walls where the photos hang, so only the
// gallery is dark; the foyer keeps the building's light colours. The photos
// glow (unlit materials) under a lamp each. Every floor is its own interior
// (core/museum.js museumFloorStore), and you change floors by the lift.
import * as THREE from 'three';
import { showOf, floorsOf, photosOn, mainPhoto } from '../data/photo-show.js';
import { canvasTex } from './three-kit.js';
import { segmentsCross as crosses } from './collision.js';
import { COUNTER_H } from './counter-face.js';

export const ROOM_PHOTO = { w: 28, d: 24, h: 5 };
const PART_Z = 6; // the partition between the foyer (in front) and the gallery
const WAY = 2.6; // half the way in through it
const PART_T = 0.2;
const DARK_WALL = '#1f1f23';
// The gallery's colours, by the show's `look` (data/photo-show.js): 'dark' (the
// default: Sai e asked for dark walls) or 'pastel' (bright pastel walls, one
// colour each, for JH's screenshots of the game itself).
const LOOKS = {
  dark: {
    back: DARK_WALL, left: DARK_WALL, right: DARK_WALL, rear: DARK_WALL, floor: '#2b2b2f', centre: DARK_WALL,
    glow: '#36363c', frames: ['#0d0d0f'], pad: 0.26, matte: '#f3f1ec', lamp: '#141416', sign: '#1f1f23', ink: '#f4efe2',
  },
  pastel: {
    back: '#f9d9e4', left: '#cdeedf', right: '#d5e5fb', rear: '#e6ddf6', floor: '#f6efe4', centre: '#ffe2c8',
    // (the coloured frames of Gallery B's "colorful", core/culture.js, one colour after another)
    glow: null, frames: ['#ff5d8f', '#ffb703', '#3ab0ff', '#57cc99', '#9b5de5'], pad: 0.34, matte: '#f6f4ef', lamp: '#f2e9dc', sign: '#fff4e6', ink: '#5a4a63', lit: true,
  },
};
const CENTRE_Y = 1.85;
const MAX_SIDE = 2.1; // the longer side of a photo on the wall
export const PHOTO_LIFT = { x: -8, z: PART_Z + 1.5 }; // where you stand to call the lift

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

// The main photo: at most 3 m wide and 2.3 m tall; its centre's height, so
// its label (0.5 m tall, 0.55 m under the photo) stays on the wall.
export const MAIN_WALL_H = 4.1; // (its lamp, 0.7 m over the photo, stays on it)
export function mainSize(p) {
  const s = photoSize(p, 3);
  return s.H > 2.3 ? photoSize(p, 3 * 2.3 / s.H) : s;
}
export const mainY = (H) => Math.max(CENTRE_Y, 0.15 + 0.25 + 0.55 + H / 2);
export const photoSize = (p, max = MAX_SIDE) => (p.w >= p.h ? { W: max, H: max * p.h / p.w } : { W: max * p.w / p.h, H: max });

// Wall spots for the 10 photos on a floor: 4 on the back wall, 3 on each
// side wall. Each: centre on the wall, the way it faces, where you stand.
export function photoSlots(room = ROOM_PHOTO) {
  const { w, d } = room;
  const slots = [];
  for (const x of [-9, -3, 3, 9]) slots.push({ x, z: -d / 2 + 0.05, ry: 0 });
  for (const s of [-1, 1]) for (const z of [-8, -3, 2]) slots.push({ x: s * (w / 2 - 0.05), z, ry: -s * Math.PI / 2 });
  for (const sl of slots) sl.look = { x: sl.x + Math.sin(sl.ry) * 1.8, z: sl.z + Math.cos(sl.ry) * 1.8 };
  return slots;
}

function sign(scene, wd, ht, x, y, z, ry, top, bottom, { bg = '#2f2a26', fg = '#f4efe2' } = {}) {
  const px = 220;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({
    map: canvasTex(Math.round(wd * px), Math.round(ht * px), (c, cw, ch) => {
      c.fillStyle = bg; c.fillRect(0, 0, cw, ch);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      const big = Math.min(ch * (bottom ? 0.36 : 0.5), 64);
      c.font = `800 ${big}px ${FONT}`;
      c.fillText(top, cw / 2, bottom ? ch * 0.36 : ch / 2, cw - 24);
      if (bottom) {
        c.font = `600 ${big * 0.62}px ${FONT}`;
        c.fillText(bottom, cw / 2, ch * 0.72, cw - 24);
      }
    }),
  }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

// One photo in a thin black frame with a white mat, a soft lit patch on the
// dark wall behind it and a small lamp above.
function hang(scene, p, sl, loader, max = MAX_SIDE, c = LOOKS.dark, k = 0) {
  const g = new THREE.Group();
  g.position.set(sl.x, sl.y ?? CENTRE_Y, sl.z);
  g.rotation.y = sl.ry;
  scene.add(g);
  const { W, H } = photoSize(p, max);
  if (c.glow) { // (the lit patch on a dark wall; bright walls need none)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.1, H + 1.3), new THREE.MeshBasicMaterial({ color: c.glow }));
    glow.position.set(0, 0.15, 0.01);
    g.add(glow);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + c.pad, H + c.pad, 0.04), new THREE.MeshBasicMaterial({ color: c.frames[k % c.frames.length] }));
  frame.position.z = 0.04;
  g.add(frame);
  const matte = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.14, H + 0.14), new THREE.MeshBasicMaterial({ color: c.matte }));
  matte.position.z = 0.062;
  g.add(matte);
  const art = new THREE.MeshBasicMaterial({ color: '#3a3a3e' }); // until the image arrives
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), art);
  pic.position.z = 0.064;
  g.add(pic);
  loader.load(p.url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    art.map = tex;
    art.color.set('#ffffff');
    art.needsUpdate = true;
  });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.34), new THREE.MeshLambertMaterial({ color: c.lamp }));
  lamp.position.set(0, H / 2 + 0.7, 0.2);
  g.add(lamp);
  return { W, H };
}

// Builds one floor into an interior scene; `box`, `block` are the
// interior's helpers. Returns the look-at spots ({ x, z, painting }), the
// bench seats, the guide at the desk (1F), the lift spot, and `see`, which
// fades the partition when it stands between the camera and you.
export function buildPhotoShow(scene, room, { box, block }, floor = 1, store) {
  const { w, d, h } = room;
  const loader = new THREE.TextureLoader();
  const looks = [];
  const show = showOf(store);
  const c = LOOKS[show.look] || LOOKS.dark;
  const artist = show.artist.ko === show.artist.en ? show.artist.en : `${show.artist.ko} · ${show.artist.en}`; // (JH once, not "JH · JH")
  const Wall = c.lit ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial; // (pastel walls stay bright, day or night)

  // The dark gallery: its floor and walls laid just inside the room's own.
  const gd = PART_Z + d / 2; // the gallery's depth
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(w, gd).rotateX(-Math.PI / 2), new Wall({ color: c.floor }));
  gFloor.position.set(0, 0.006, (PART_Z - d / 2) / 2);
  scene.add(gFloor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new Wall({ color: c.back }));
  back.position.set(0, h / 2, -d / 2 + 0.02);
  scene.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(gd, h), new Wall({ color: s < 0 ? c.left : c.right }));
    side.position.set(s * (w / 2 - 0.02), h / 2, (PART_Z - d / 2) / 2);
    side.rotation.y = -s * Math.PI / 2;
    scene.add(side);
  }

  // The partition: light on the foyer side, dark on the gallery side, each
  // half with its own materials so it can fade.
  const walls = [];
  for (const s of [-1, 1]) {
    const x0 = s * WAY, x1 = s * w / 2, len = Math.abs(x1 - x0), cx = (x0 + x1) / 2;
    const front = new THREE.Mesh(new THREE.BoxGeometry(len, h, PART_T / 2), new THREE.MeshLambertMaterial({ color: '#ece6da', transparent: true }));
    front.position.set(cx, h / 2, PART_Z + PART_T / 4);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(len, h, PART_T / 2), new Wall({ color: c.rear, transparent: true }));
    rear.position.set(cx, h / 2, PART_Z - PART_T / 4);
    scene.add(front, rear);
    block(cx, PART_Z, len, PART_T);
    walls.push({ meshes: [front, rear], a: [x0, PART_Z], b: [x1, PART_Z], signs: [] });
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(WAY * 2, h - 3, PART_T), new THREE.MeshLambertMaterial({ color: '#ece6da', transparent: true }));
  lintel.position.set(0, 3 + (h - 3) / 2, PART_Z);
  scene.add(lintel);
  const way = { meshes: [lintel], a: [-WAY, PART_Z], b: [WAY, PART_Z], signs: [] };
  walls.push(way);
  // Over the way in: the show's title, on the foyer side.
  way.signs.push(sign(scene, WAY * 2 - 0.2, 0.9, 0, 3.6, PART_Z + PART_T / 2 + 0.01, 0, `${show.title.ko} · ${floor}F`, `${show.title.en} · ${show.artist.en}`, { bg: c.sign, fg: c.ink }));

  // The photos on this floor.
  const ps = photosOn(show, floor);
  photoSlots(room).forEach((sl, i) => {
    if (!ps[i]) return;
    hang(scene, ps[i], sl, loader, MAX_SIDE, c, i);
    looks.push({ x: sl.look.x, z: sl.look.z, painting: ps[i] });
  });

  const seats = [];
  const cz = (PART_Z - d / 2) / 2 - 0.5; // the middle of the gallery
  if (floor === 1) {
    // The main photo on a freestanding dark wall in the middle, facing the
    // way in, with the show's title and the artist's name under it.
    const mp = mainPhoto(show);
    box(4.6, MAIN_WALL_H, 0.3, 0, MAIN_WALL_H / 2, cz, c.centre);
    block(0, cz, 4.8, 0.5);
    // At most 3 m wide and 2.3 m tall, set high enough that the label fits
    // under it on the wall (Gallery D's main photo is almost square).
    const ms = mainSize(mp);
    const my = mainY(ms.H);
    hang(scene, mp, { x: 0, y: my, z: cz + 0.15, ry: 0 }, loader, Math.max(ms.W, ms.H), c);
    looks.push({ x: 0, z: cz + 2, painting: mp });
    sign(scene, 3.6, 0.5, 0, my - ms.H / 2 - 0.55, cz + 0.16, 0, show.title.ko, `${show.title.en} · ${artist}`, { bg: c.centre, fg: c.ink });
  } else {
    // Upstairs: two benches back to back in the middle, facing the side walls.
    for (const s of [-1, 1]) {
      const x = s * 0.8;
      box(0.6, 0.08, 2.6, x, 0.4, cz, '#6d5440');
      for (const k of [-1, 1]) box(0.5, 0.4, 0.1, x, 0.2, cz + k * 1.15, '#3e3028');
      block(x, cz, 0.6, 2.6);
      for (const o of [-0.7, 0.7]) seats.push({ x, z: cz + o, ry: s * Math.PI / 2, stand: [x + s, cz + o] });
    }
  }

  // The foyer: the lift on the partition, the floor guide beside it.
  const lx = PHOTO_LIFT.x, lz = PART_Z + PART_T / 2;
  walls[0].signs.push( // (they hide with the partition's left half)
    box(2.2, 2.8, 0.12, lx, 1.4, lz + 0.06, '#8d9399'),
    box(0.9, 2.3, 0.02, lx - 0.46, 1.15, lz + 0.13, '#c7ccd1'),
    box(0.9, 2.3, 0.02, lx + 0.46, 1.15, lz + 0.13, '#c7ccd1'),
    sign(scene, 1.1, 0.4, lx, 3.05, lz + 0.14, 0, `🛗 ${floor}F`, null, { bg: '#1e2326', fg: '#ffd36b' }),
  );
  block(lx, lz + 0.1, 2.2, 0.3);
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({
    map: canvasTex(560, 380, (c) => {
      c.fillStyle = '#1f1f23'; c.fillRect(0, 0, 560, 380);
      c.textBaseline = 'top';
      c.fillStyle = '#f4efe2'; c.font = `800 32px ${FONT}`;
      c.fillText('층별 안내 · Floor guide', 24, 20);
      let y = 84;
      for (const f of floorsOf(show).reverse()) {
        c.fillStyle = f === floor ? '#ffd36b' : '#d9c9a3';
        c.font = `800 30px ${FONT}`;
        c.fillText(`${f}F`, 24, y);
        c.font = `600 21px ${FONT}`;
        c.fillText(f === 1 ? '대표작 · 사진 10점' : '사진 10점', 96, y);
        c.fillText(f === 1 ? 'Main photo · 10 photos' : '10 photos', 96, y + 26);
        y += 92;
      }
    }),
  }));
  guide.position.set(lx + 3, 1.7, lz + 0.02);
  scene.add(guide);
  walls[0].signs.push(guide);

  let clerk = null;
  if (floor === 1) {
    // The exhibition's board and the information desk on the right.
    walls[1].signs.push(sign(scene, 3.4, 1.5, 8, 2.2, lz + 0.02, 0, show.title.ko, `${show.title.en} · ${artist}`, { bg: c.sign, fg: c.ink }));
    const dz = PART_Z + 3;
    box(2.4, COUNTER_H - 0.03, 0.7, 8, (COUNTER_H - 0.03) / 2, dz, '#f2efe8'); // (COUNTER_H: the guide's face shows, core/counter-face.js)
    box(2.5, 0.05, 0.8, 8, COUNTER_H, dz, '#2f6b3f');
    block(8, dz, 2.5, 0.8);
    clerk = { x: 8, z: dz - 0.75, ry: 0 };
  } else {
    for (const x of [6, 10]) {
      const z = PART_Z + 3;
      box(2.4, 0.08, 0.6, x, 0.4, z, '#a9805a');
      for (const k of [-1, 1]) box(0.1, 0.4, 0.5, x + k * 1.05, 0.2, z, '#6b4f36');
      block(x, z, 2.4, 0.6);
      for (const o of [-0.6, 0.6]) seats.push({ x: x + o, z, ry: Math.PI, stand: [x + o, z + 1] });
    }
  }
  // A potted plant either side of the door: it is Seoul Forest after all.
  for (const s of [-1, 1]) {
    const px = s * (w / 2 - 0.9), pz = d / 2 - 0.9;
    box(0.6, 0.55, 0.6, px, 0.28, pz, '#c9b49a');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshLambertMaterial({ color: '#5f8a4e' }));
    leaves.position.set(px, 1.1, pz);
    scene.add(leaves);
    block(px, pz, 0.7, 0.7);
  }

  const see = (px, pz, cx, cz2) => {
    for (const wl of walls) {
      const hide = cx != null && crosses(px, pz, cx, cz2, wl.a[0], wl.a[1], wl.b[0], wl.b[1]);
      const o = hide ? 0.18 : 1;
      for (const m of wl.meshes) {
        if (m.material.opacity === o) continue;
        m.material.opacity = o;
        m.material.depthWrite = !hide;
      }
      for (const sg of wl.signs) sg.visible = !hide;
    }
  };
  return { looks, seats, clerk, lift: { ...PHOTO_LIFT }, see };
}

// The lift's floor list (ui/museum-ui.js showLift).
export const photoFloors = (ko, store) => floorsOf(showOf(store)).map((floor) => ({
  floor,
  lines: [floor === 1 ? (ko ? '대표작 · 사진 10점' : 'Main photo · 10 photos') : (ko ? '사진 10점' : '10 photos')],
}));
