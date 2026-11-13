// The museum south of Itaewon (국립중앙미술관): three floors of old Korean
// paintings. Each floor has the same plan, seen from the door:
//
//        ┌──────────┬─[lift]──────────┬──────────┐
//        │          │                 │          │
//        │  Hall A  │   central hall  │  Hall B  │
//        │          ⌐  (benches, our  ⌐          │
//        │          │   own plinth)   │          │
//        ├──────────┴──────┐   ┌──────┴──────────┤
//        │      lobby: info desk, notice         │  (1F only; upstairs
//        └─────────────────[door]────────────────┘   the hall runs on)
//
// You come in to the lobby and the information desk, so the paintings are
// out of sight until you walk through to the central hall. Halls A and B
// open off the central hall, and the lift by its back wall goes to the
// other floors. Each hall shows one kind of painting (HALLS in
// src/data/paintings.js), with wide gaps between the frames.
// The painting images load only when you walk in, so they cost nothing on
// first load. Every floor is its own interior (museumFloorStore below).
import * as THREE from 'three';
import { PAINTINGS, CREDIT, DISCLAIMER, HALLS, FLOORS, COMING_SOON } from '../data/paintings.js';
import { canvasTex, wrapText as wrap } from './three-kit.js';
import { segmentsCross as crosses } from './collision.js';
import { COUNTER_H } from './counter-face.js';

export const ROOM_MUSEUM = { w: 52, d: 32, h: 6 };
const SPACING = 4.4; // metres between frame centres
const MAX_SIDE = 2.2; // the longer side of a painting on the wall
const MAX_W = 2.7; // and never wider than this (frames stay apart)
const CENTRE_Y = 2.05;
const HALL_X = 8; // the central hall runs from -8 to 8
const LOBBY_Z = 8; // the lobby (1F) is in front of this wall
const PART_H = 3.6; // inner walls: lower than the outer ones
const PART_T = 0.2;
const DOOR_Z = -4; // doorway from the central hall into Halls A and B
const DOOR_W = 3;
export const LIFT = { x: -5, z: -ROOM_MUSEUM.d / 2 + 1.5 }; // where you stand to call the lift

const byId = new Map(PAINTINGS.map((p) => [p.id, p]));
export const hallsOn = (floor) => HALLS.filter((h) => h.floor === floor);
export const hallPaintings = (hall) => hall.paintings.map((id) => byId.get(id)).filter(Boolean);

// A store for each floor: floor 1 is the museum itself, the others share
// its look under their own id (so each has its own interior and visitors).
const floorStores = new Map();
export function museumFloorStore(store, floor) {
  const base = store.base || store;
  if (floor === 1) return base;
  const key = base.id + '-' + floor;
  if (!floorStores.has(key)) {
    const name = Object.fromEntries(Object.entries(base.name).map(([l, n]) => [l, `${n} ${floor}F`]));
    floorStores.set(key, { ...base, id: `${base.id}-${floor}f`, name, floor, base });
  }
  return floorStores.get(key);
}
export const floorOf = (store) => store?.floor || 1;

// Display size (metres) for a w×h pixel image.
export function displaySize(p) {
  const a = p.w / p.h;
  let W = a >= 1 ? MAX_SIDE : MAX_SIDE * a, H = W / a;
  if (W > MAX_W) { W = MAX_W; H = W / a; }
  return { W, H };
}

// Wall spots for n paintings in Hall A (side 'A', left) or B (right).
// The outer wall fills first, then the back, the front, and the wall by the
// doorway. Each: centre on the wall, the wall's rotation (the way the
// painting faces), and where a visitor stands to look at it.
const centred = (n, mid) => Array.from({ length: n }, (_, i) => mid + (i - (n - 1) / 2) * SPACING);
export function hallSlots(side, n, room = ROOM_MUSEUM) {
  const s = side === 'A' ? -1 : 1;
  const { w, d } = room;
  const outerX = w / 2, midX = (outerX + HALL_X) / 2;
  const roomMid = (-d / 2 + LOBBY_Z) / 2;
  const walls = [
    (k) => centred(k, roomMid).map((z) => ({ x: s * (outerX - 0.06), z, ry: -s * Math.PI / 2 })),
    (k) => centred(k, s * midX).map((x) => ({ x, z: -d / 2 + 0.06, ry: 0 })),
    (k) => centred(k, s * midX).map((x) => ({ x, z: LOBBY_Z - PART_T / 2 - 0.06, ry: Math.PI })),
    (k) => [DOOR_Z - 9, DOOR_Z - 4.6, DOOR_Z + 4.6, DOOR_Z + 9].slice(0, k).map((z) => ({ x: s * (HALL_X + PART_T / 2 + 0.06), z, ry: s * Math.PI / 2 })),
  ];
  const caps = [5, 3, 3, 4];
  const slots = [];
  let left = n;
  walls.forEach((wall, i) => {
    const k = Math.min(left, caps[i]);
    left -= k;
    if (k > 0) slots.push(...wall(k));
  });
  for (const sl of slots) sl.look = { x: sl.x + Math.sin(sl.ry) * 1.7, z: sl.z + Math.cos(sl.ry) * 1.7 };
  return slots;
}
export const HALL_CAPACITY = 15;

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const paintingUrl = (p) => BASE + p.file;


const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

// A flat sign: a dark board with one or two centred lines of text.
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

// Hangs one framed painting with its wall label and a rope barrier.
function hang(scene, p, sl, { box, block }, loader) {
  const g = new THREE.Group();
  g.position.set(sl.x, CENTRE_Y, sl.z);
  g.rotation.y = sl.ry;
  scene.add(g);
  const { W, H } = displaySize(p);
  // Frame: a dark wooden border, then a silk mount, then the painting.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.34, H + 0.34, 0.06), new THREE.MeshLambertMaterial({ color: '#3b2a1e' }));
  frame.position.z = 0.03;
  g.add(frame);
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.2, H + 0.2), new THREE.MeshLambertMaterial({ color: '#e9e0cc' }));
  mount.position.z = 0.062;
  g.add(mount);
  const art = new THREE.MeshBasicMaterial({ color: '#d8cfba' }); // until the image arrives
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), art);
  pic.position.z = 0.064;
  g.add(pic);
  loader.load(paintingUrl(p), (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    art.map = tex;
    art.color.set('#ffffff');
    art.needsUpdate = true;
  });
  // Wall label to the right: title, artist, era, and the credit line.
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshBasicMaterial({
    map: canvasTex(372, 252, (c, cw, ch) => {
      c.fillStyle = '#fbf8f1'; c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#2b2622'; c.textBaseline = 'top';
      c.font = `800 26px ${FONT}`;
      let y = wrap(c, p.title.ko, 16, 14, cw - 32, 30);
      c.font = `600 19px ${FONT}`;
      y = wrap(c, p.title.en, 16, y, cw - 32, 23);
      c.fillStyle = '#5a5048';
      c.font = `500 18px ${FONT}`;
      y = wrap(c, `${p.artist.ko} · ${p.artist.en}`, 16, y + 6, cw - 32, 22);
      wrap(c, p.era.en, 16, y, cw - 32, 22);
      c.font = `500 14px ${FONT}`;
      c.fillText(CREDIT.ko, 16, ch - 26);
    }),
  }));
  label.position.set(W / 2 + 0.17 + 0.42, -0.55, 0.02);
  g.add(label);
  // A low rope barrier keeps visitors a step back from the wall.
  const nx = Math.sin(sl.ry), nz = Math.cos(sl.ry);
  const along = Math.abs(nz) > 0.5; // the wall runs along x
  const bx = sl.x + nx * 0.75, bz = sl.z + nz * 0.75;
  box(along ? W + 0.6 : 0.04, 0.04, along ? 0.04 : W + 0.6, bx, 0.75, bz, '#8a1f1f');
  for (const k of [-1, 1]) {
    const [px, pz] = along ? [bx + k * (W / 2 + 0.3), bz] : [bx, bz + k * (W / 2 + 0.3)];
    box(0.08, 0.8, 0.08, px, 0.4, pz, '#b8952e');
  }
  block(bx, bz, along ? W + 0.7 : 0.5, along ? 0.5 : W + 0.7);
}

// Builds one floor of the museum into an interior scene. `box`, `block`,
// `mat` are the interior's helpers. Returns the look-at spots
// ({ x, z, painting }), the bench seats, the docent (1F), the lift spot,
// and `see`, which fades an inner wall that stands between the camera and you.
export function buildGallery(scene, room, { box, block }, floor = 1) {
  const { w, d } = room;
  const looks = [];
  const loader = new THREE.TextureLoader();
  const walls = []; // { mesh, a: [x, z], b: [x, z] }

  // Inner walls (lower than the outer ones), each with its own material so
  // it can fade on its own.
  const wallColor = '#ece6da';
  const part = (x0, z0, x1, z1, y0 = 0, y1 = PART_H) => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : PART_T, y1 - y0, alongX ? PART_T : len),
      new THREE.MeshLambertMaterial({ color: wallColor, transparent: true }));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    scene.add(m);
    const wl = { mesh: m, a: [x0, z0], b: [x1, z1], signs: [] };
    walls.push(wl);
    if (y0 === 0) block((x0 + x1) / 2, (z0 + z1) / 2, alongX ? len : PART_T, alongX ? PART_T : len);
    return wl;
  };
  const dz0 = DOOR_Z - DOOR_W / 2, dz1 = DOOR_Z + DOOR_W / 2;
  const lintels = {};
  for (const s of [-1, 1]) {
    const x = s * HALL_X;
    part(x, -d / 2, x, dz0);
    part(x, dz1, x, LOBBY_Z);
    lintels[s] = part(x, dz0, x, dz1, 2.8); // lintel over the doorway
    // Front wall of the hall (the lobby side).
    part(s * w / 2, LOBBY_Z, s * (floor === 1 ? 2 : HALL_X), LOBBY_Z);
  }
  const way = floor === 1 ? part(-2, LOBBY_Z, 2, LOBBY_Z, 2.8) : null; // lintel over the way in

  // The halls: paintings, a name over each doorway, or "coming soon".
  for (const hall of hallsOn(floor)) {
    const s = hall.side === 'A' ? -1 : 1;
    const ps = hallPaintings(hall);
    hallSlots(hall.side, ps.length, room).forEach((sl, i) => {
      hang(scene, ps[i], sl, { box, block }, loader);
      looks.push({ x: sl.look.x, z: sl.look.z, painting: ps[i] });
    });
    // The hall's name, over its doorway on both sides of the wall.
    const x = s * HALL_X;
    lintels[s].signs.push(
      sign(scene, 3.4, 0.62, x - s * 0.11, 3.2, DOOR_Z, -s * Math.PI / 2, hall.name.ko, hall.name.en),
      sign(scene, 3.4, 0.62, x + s * 0.11, 3.2, DOOR_Z, s * Math.PI / 2, hall.name.ko, hall.name.en),
    );
    if (!ps.length) {
      sign(scene, 4.6, 1.3, s * (w / 2 - 0.05), 2.3, (-d / 2 + LOBBY_Z) / 2, -s * Math.PI / 2, COMING_SOON.ko, COMING_SOON.en, { bg: '#f7f2e8', fg: '#6b625a' });
    }
  }

  // Central hall: benches round an empty plinth, kept for the museum's own
  // works later on.
  const cz = (-d / 2 + LOBBY_Z) / 2;
  box(2.6, 0.3, 2.6, 0, 0.15, cz, '#d9cfbd');
  box(2.2, 0.02, 2.2, 0, 0.31, cz, '#efe8da');
  block(0, cz, 2.6, 2.6);
  sign(scene, 1.5, 0.42, 0, 0.6, cz + 1.31, 0, '우리 미술관 소장품 · 준비 중', 'Our own collection · coming soon', { bg: '#f7f2e8', fg: '#5a5048' });
  const seats = [];
  for (const s of [-1, 1]) {
    const x = s * 4.2;
    box(0.6, 0.08, 2.6, x, 0.4, cz, '#7a5638');
    for (const k of [-1, 1]) box(0.5, 0.4, 0.1, x, 0.2, cz + k * 1.15, '#4a3424');
    block(x, cz, 0.6, 2.6);
    for (const o of [-0.7, 0.7]) seats.push({ x, z: cz + o, ry: -s * Math.PI / 2, stand: [x - s, cz + o] });
  }
  for (const [px, pz] of [[-6.6, -d / 2 + 1], [6.6, -d / 2 + 1], [-6.6, LOBBY_Z - 1], [6.6, LOBBY_Z - 1]]) {
    if (floor !== 1 && pz > 0) continue;
    box(0.7, 0.6, 0.7, px, 0.3, pz, '#8a7a66');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshLambertMaterial({ color: '#5f8a4e' }));
    leaves.position.set(px, 1.2, pz);
    scene.add(leaves);
    block(px, pz, 0.8, 0.8);
  }
  if (floor !== 1) { // upstairs the hall runs to the front wall: more benches there
    for (const x of [-4, 4]) {
      const z = LOBBY_Z + 3;
      box(2.6, 0.08, 0.6, x, 0.4, z, '#7a5638');
      for (const k of [-1, 1]) box(0.1, 0.4, 0.5, x + k * 1.15, 0.2, z, '#4a3424');
      block(x, z, 2.6, 0.6);
      for (const o of [-0.7, 0.7]) seats.push({ x: x + o, z, ry: Math.PI, stand: [x + o, z - 1] });
    }
  }

  // The lift by the back wall, with a floor sign and a floor guide beside it.
  const lx = LIFT.x, lz = -d / 2;
  box(2.2, 2.8, 0.12, lx, 1.4, lz + 0.06, '#8d9399');
  box(0.9, 2.3, 0.02, lx - 0.46, 1.15, lz + 0.13, '#c7ccd1');
  box(0.9, 2.3, 0.02, lx + 0.46, 1.15, lz + 0.13, '#c7ccd1');
  block(lx, lz + 0.1, 2.2, 0.3);
  sign(scene, 1.1, 0.4, lx, 3.05, lz + 0.13, 0, `🛗 ${floor}F`, null, { bg: '#1e2326', fg: '#ffd36b' });
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({
    map: canvasTex(600, 450, (c, cw, ch) => {
      c.fillStyle = '#2f2a26'; c.fillRect(0, 0, cw, ch);
      c.textBaseline = 'top';
      c.fillStyle = '#f4efe2'; c.font = `800 34px ${FONT}`;
      c.fillText('층별 안내 · Floor guide', 24, 20);
      let y = 78;
      for (const f of [...FLOORS].reverse()) {
        c.fillStyle = f === floor ? '#ffd36b' : '#d9c9a3';
        c.font = `800 30px ${FONT}`;
        c.fillText(`${f}F`, 24, y);
        c.font = `600 19px ${FONT}`;
        for (const h of hallsOn(f)) {
          const soon = !h.paintings.length;
          c.fillText(`${h.side} · ${h.name.ko}${soon ? ' (준비 중)' : ''}`, 92, y);
          c.fillText(`    ${h.name.en}${soon ? ' (soon)' : ''}`, 92, y + 22);
          y += 50;
        }
        y += 14;
      }
    }),
  }));
  guide.position.set(lx + 3.1, 1.7, lz + 0.03);
  scene.add(guide);

  let clerk = null;
  if (floor === 1) {
    // Notice in the lobby: a game space, not the real museum, and the credit.
    const notice = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), new THREE.MeshBasicMaterial({
      map: canvasTex(960, 400, (c, cw, ch) => {
        c.fillStyle = '#2f2a26'; c.fillRect(0, 0, cw, ch);
        c.fillStyle = '#f4efe2'; c.textBaseline = 'top';
        c.font = `800 38px ${FONT}`;
        let y = wrap(c, DISCLAIMER.ko, 36, 32, cw - 72, 48);
        c.font = `500 30px ${FONT}`;
        y = wrap(c, DISCLAIMER.en, 36, y + 8, cw - 72, 38);
        c.fillStyle = '#d9c9a3';
        c.font = `600 28px ${FONT}`;
        wrap(c, `🖼️ ${CREDIT.ko} · ${CREDIT.en}`, 36, y + 14, cw - 72, 36);
      }),
    }));
    notice.position.set(-7, 2.2, d / 2 - 0.04);
    notice.rotation.y = Math.PI;
    scene.add(notice);
    // The way in to the galleries, behind the information desk.
    way.signs.push(sign(scene, 3.8, 0.62, 0, 3.2, LOBBY_Z + 0.11, 0, '전시실 · 1F 김홍도관', 'Galleries · Kim Hong-do Halls'));
    // Information desk with the docent, in front of the way in.
    const iz = LOBBY_Z + 3.2;
    box(4.2, COUNTER_H - 0.03, 0.8, 0, (COUNTER_H - 0.03) / 2, iz, '#e9e0cc'); // (COUNTER_H: the docent's face shows, core/counter-face.js)
    box(4.3, 0.06, 0.9, 0, COUNTER_H, iz, '#3b2a1e');
    block(0, iz, 4.2, 0.8);
    sign(scene, 1.8, 0.36, 0, 0.36, iz + 0.41, 0, 'ℹ️ 안내 · Information', null, { bg: '#3b2a1e' });
    clerk = { x: 0, z: iz - 0.75, ry: 0 };
  }

  const see = (px, pz, cx, cz2) => {
    for (const wl of walls) {
      const hide = cx != null && crosses(px, pz, cx, cz2, wl.a[0], wl.a[1], wl.b[0], wl.b[1]);
      const o = hide ? 0.18 : 1;
      if (wl.mesh.material.opacity !== o) {
        wl.mesh.material.opacity = o;
        wl.mesh.material.depthWrite = !hide;
        for (const sg of wl.signs) sg.visible = !hide;
      }
    }
  };
  return { looks, seats, clerk, lift: { ...LIFT }, see };
}

export const nearestPainting = (looks, x, z, r = 1.3) => {
  let best = null, bd = r;
  for (const l of looks || []) {
    const dd = Math.hypot(x - l.x, z - l.z);
    if (dd < bd) { bd = dd; best = l; }
  }
  return best;
};
