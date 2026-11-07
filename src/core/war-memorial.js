// Inside the War Memorial of Korea (전쟁기념관): one quiet exhibition floor.
//
//        ┌───────────┬──────[ memorial room ]─────┬───────────┐
//        │  Hall A   │   altar, flowers, names    │  Hall B   │
//        │ Korean War⌐      benches               ⌐ Wartime   │
//        │           │                            │   life    │
//        ├───────────┴──────┐          ┌──────────┴───────────┤
//        │ notice   lobby: info desk, two photos   visit info │
//        └─────────────────────[door]───────────────────────────┘
//
// Photos (src/data/war-memorial.js) hang in Halls A and B and on the lobby
// wall; each frame shows a "photo coming soon" card until its file is in
// public/memorial/. At the back, the memorial room: a dark stone wall, an
// altar where you can lay a white chrysanthemum, and benches. No games, no
// music: a place to look and remember.
import * as THREE from 'three';
import { EXHIBITS, HALLS, CREDIT, DISCLAIMER, VISIT, COMING, MEMORIAL_TEXT } from '../data/war-memorial.js';

export const ROOM_MEMORIAL = { w: 44, d: 30, h: 7 };
const PART_H = 4.2;
const PART_T = 0.24;
const HALL_X = 8; // the central space runs from -8 to 8
const LOBBY_Z = 6; // the lobby is in front of this wall
const DOOR_Z0 = -1, DOOR_Z1 = 3; // doorways from the central space into the halls
const ALTAR_Z = -12;
const MAX_W = 2.4, MAX_H = 1.8; // a photo's largest size on the wall
const CENTRE_Y = 2.1;
export const FLOWER_SPOT = { x: 0, z: ALTAR_Z + 1.9 };

const byId = new Map(EXHIBITS.map((p) => [p.id, p]));
export const hallPhotos = (key) => (HALLS[key]?.photos || []).map((id) => byId.get(id)).filter(Boolean);

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const photoUrl = (p) => BASE + p.file;

// Wall spots: centre on the wall, the way the photo faces (ry), and where a
// visitor stands to look at it.
export function photoSlots() {
  const { w, d } = ROOM_MEMORIAL;
  const out = [];
  for (const [key, s] of [['A', -1], ['B', 1]]) {
    const outer = [-10, -4.5, 1].map((z) => ({ x: s * (w / 2 - 0.06), z, ry: -s * Math.PI / 2 }));
    const back = [s * 18.2, s * 12.2].map((x) => ({ x, z: -d / 2 + 0.06, ry: 0 }));
    hallPhotos(key).forEach((p, i) => { const sl = [...outer, ...back][i]; if (sl) out.push({ ...sl, photo: p }); });
  }
  hallPhotos('lobby').forEach((p, i) => out.push({ x: i ? 5.5 : -5.5, z: LOBBY_Z + PART_T / 2 + 0.06, ry: 0, photo: p }));
  hallPhotos('memorial').forEach((p) => out.push({ x: 0, z: -d / 2 + 0.3, ry: 0, y: 3.3, photo: p, far: true }));
  for (const sl of out) {
    const k = sl.far ? 6.5 : 1.7;
    sl.look = { x: sl.x + Math.sin(sl.ry) * k, z: sl.z + Math.cos(sl.ry) * k };
  }
  return out;
}

function canvasTex(cw, ch, draw) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  draw(c.getContext('2d'), cw, ch);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
function wrap(g, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (g.measureText(next).width > maxW && line) { g.fillText(line, x, y); y += lh; line = word; } else line = next;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}

function sign(scene, wd, ht, x, y, z, ry, top, bottom, { bg = '#2d3133', fg = '#f1ede4' } = {}) {
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

// A text board: a title and lines of Korean and English.
function board(scene, wd, ht, x, y, z, ry, title, ko, en) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({
    map: canvasTex(Math.round(wd * 260), Math.round(ht * 260), (c, cw, ch) => {
      c.fillStyle = '#2d3133'; c.fillRect(0, 0, cw, ch);
      c.textBaseline = 'top';
      c.fillStyle = '#e6d3a3'; c.font = `800 34px ${FONT}`;
      let yy = wrap(c, title, 30, 26, cw - 60, 42);
      c.fillStyle = '#f1ede4'; c.font = `600 25px ${FONT}`;
      for (const line of ko) yy = wrap(c, line, 30, yy + 4, cw - 60, 31);
      c.fillStyle = '#c9c4ba'; c.font = `500 23px ${FONT}`;
      yy += 10;
      for (const line of en) yy = wrap(c, line, 30, yy + 4, cw - 60, 29);
    }),
  }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

// The card shown in a frame until the photo's file is there.
const comingCard = (p) => canvasTex(400, 300, (c, cw, ch) => {
  c.fillStyle = '#e4e0d7'; c.fillRect(0, 0, cw, ch);
  c.fillStyle = '#6a655d'; c.textAlign = 'center'; c.textBaseline = 'top';
  c.font = `800 26px ${FONT}`;
  let y = wrap(c, p.title.ko, cw / 2, 70, cw - 40, 32);
  c.font = `600 20px ${FONT}`;
  y = wrap(c, p.title.en, cw / 2, y + 4, cw - 40, 25);
  c.font = `500 18px ${FONT}`;
  c.fillText(`📷 ${COMING.ko} · ${COMING.en}`, cw / 2, ch - 46);
});

// Fits a w×h image inside the largest frame.
export function fitSize(w, h) {
  const a = w / h;
  let W = MAX_W, H = W / a;
  if (H > MAX_H) { H = MAX_H; W = H * a; }
  return { W, H };
}

// Hangs one framed photo with its label and a low rope barrier.
function hang(scene, sl, { box, block }, loader) {
  const p = sl.photo;
  const g = new THREE.Group();
  g.position.set(sl.x, sl.y || CENTRE_Y, sl.z);
  g.rotation.y = sl.ry;
  scene.add(g);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.06), new THREE.MeshLambertMaterial({ color: '#2a2a2a' }));
  frame.position.z = 0.03;
  g.add(frame);
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#f4f1ea' }));
  mount.position.z = 0.062;
  g.add(mount);
  const art = new THREE.MeshBasicMaterial({ map: comingCard(p) });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), art);
  pic.position.z = 0.064;
  g.add(pic);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshBasicMaterial({
    map: canvasTex(372, 252, (c, cw, ch) => {
      c.fillStyle = '#fbf9f4'; c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#2b2b2b'; c.textBaseline = 'top';
      c.font = `800 23px ${FONT}`;
      let y = wrap(c, p.title.ko, 16, 14, cw - 32, 27);
      c.font = `600 17px ${FONT}`;
      y = wrap(c, p.title.en, 16, y, cw - 32, 21);
      c.fillStyle = '#5c5850';
      c.font = `500 16px ${FONT}`;
      wrap(c, p.era.en, 16, y + 4, cw - 32, 20);
      c.font = `500 13px ${FONT}`;
      c.fillText(CREDIT.ko, 16, ch - 24);
    }),
  }));
  g.add(label);
  const size = (W, H) => {
    frame.scale.set(W + 0.26, H + 0.26, 1);
    mount.scale.set(W + 0.14, H + 0.14, 1);
    pic.scale.set(W, H, 1);
    label.position.set(W / 2 + 0.13 + 0.4, sl.far ? -H / 2 + 0.21 : -0.5, 0.02);
  };
  const first = fitSize(4, 3);
  size(first.W, first.H);
  loader.load(photoUrl(p), (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    art.map?.dispose();
    art.map = tex;
    art.needsUpdate = true;
    const { W, H } = fitSize(tex.image.width, tex.image.height);
    size(W, H);
  }, undefined, () => {}); // (no file yet: the card stays)
  if (sl.far) return; // (the memorial room's photo hangs high above the altar)
  const nx = Math.sin(sl.ry), nz = Math.cos(sl.ry);
  const along = Math.abs(nz) > 0.5;
  const bx = sl.x + nx * 0.75, bz = sl.z + nz * 0.75, len = MAX_W + 0.6;
  box(along ? len : 0.04, 0.04, along ? 0.04 : len, bx, 0.75, bz, '#3b3b3b');
  for (const k of [-1, 1]) {
    const [px, pz] = along ? [bx + k * len / 2, bz] : [bx, bz + k * len / 2];
    box(0.08, 0.8, 0.08, px, 0.4, pz, '#8c8a84');
  }
  block(bx, bz, along ? len + 0.1 : 0.5, along ? 0.5 : len + 0.1);
}

function crosses(ax, az, bx, bz, cx, cz, dx, dz) {
  const o = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
  const d1 = o(cx, cz, dx, dz, ax, az), d2 = o(cx, cz, dx, dz, bx, bz);
  const d3 = o(ax, az, bx, bz, cx, cz), d4 = o(ax, az, bx, bz, dx, dz);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// A white chrysanthemum lying on the altar.
function chrysanthemum() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), new THREE.MeshLambertMaterial({ color: '#4f7a3a' }));
  stem.rotation.z = Math.PI / 2;
  stem.position.x = -0.2;
  g.add(stem);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 6), new THREE.MeshLambertMaterial({ color: '#fbfaf5' }));
  head.scale.set(1, 0.6, 1);
  g.add(head);
  return g;
}

// Builds the hall into an interior scene. Returns the look-at spots
// ({ x, z, painting }), benches, the guide at the desk, the flower spot and
// `layFlower`, and `see` (fades a wall between the camera and you).
export function buildMemorial(scene, room, { box, block }) {
  const { w, d } = room;
  const loader = new THREE.TextureLoader();
  const walls = [];
  const part = (x0, z0, x1, z1, y0 = 0, y1 = PART_H, color = '#e3dfd6') => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : PART_T, y1 - y0, alongX ? PART_T : len),
      new THREE.MeshLambertMaterial({ color, transparent: true }));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    scene.add(m);
    const wl = { mesh: m, a: [x0, z0], b: [x1, z1], signs: [] };
    walls.push(wl);
    if (y0 === 0) block((x0 + x1) / 2, (z0 + z1) / 2, alongX ? len : PART_T, alongX ? PART_T : len);
    return wl;
  };
  // Hall walls with a doorway each, the lobby wall with the way in.
  const lintels = {};
  for (const s of [-1, 1]) {
    const x = s * HALL_X;
    part(x, -d / 2, x, DOOR_Z0);
    part(x, DOOR_Z1, x, LOBBY_Z);
    lintels[s] = part(x, DOOR_Z0, x, DOOR_Z1, 3);
    part(s * w / 2, LOBBY_Z, s * 3, LOBBY_Z);
  }
  const way = part(-3, LOBBY_Z, 3, LOBBY_Z, 3);

  // Photos, and the hall names over the doorways.
  const looks = [];
  for (const sl of photoSlots()) {
    hang(scene, sl, { box, block }, loader);
    looks.push({ x: sl.look.x, z: sl.look.z, painting: sl.photo });
  }
  for (const [key, s] of [['A', -1], ['B', 1]]) {
    const { ko, en } = HALLS[key].name;
    const x = s * HALL_X, zc = (DOOR_Z0 + DOOR_Z1) / 2;
    lintels[s].signs.push(
      sign(scene, 3.6, 0.62, x - s * 0.13, 3.5, zc, -s * Math.PI / 2, ko, en),
      sign(scene, 3.6, 0.62, x + s * 0.13, 3.5, zc, s * Math.PI / 2, ko, en),
    );
  }
  way.signs.push(sign(scene, 4.4, 0.62, 0, 3.5, LOBBY_Z + 0.13, 0, '전시실 · 추모실', 'Exhibition Halls · Memorial Room'));

  // The memorial room at the back: dark stone, the words of remembrance,
  // an altar with candles, and two benches facing it.
  const stone = '#33363a';
  box(16, 0.02, 7.4, 0, 0.011, -d / 2 + 3.7, '#4a4d50'); // dark floor
  box(15.6, 5.6, 0.1, 0, 2.8, -d / 2 + 0.1, stone); // stone wall
  sign(scene, 9.6, 0.9, 0, 5.75, -d / 2 + 0.16, 0, MEMORIAL_TEXT.remember.ko, MEMORIAL_TEXT.remember.en, { bg: stone, fg: '#e6d3a3' });
  box(4.4, 0.95, 1.1, 0, 0.475, ALTAR_Z, '#2a2c2f'); // altar
  box(4.5, 0.05, 1.2, 0, 0.975, ALTAR_Z, '#1d1f21');
  block(0, ALTAR_Z, 4.4, 1.1);
  const glow = new THREE.MeshBasicMaterial({ color: '#ffe2a6' });
  for (const x of [-1.9, 1.9]) {
    box(0.1, 0.32, 0.1, x, 1.16, ALTAR_Z - 0.3, '#f4f1ea');
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), glow);
    flame.position.set(x, 1.36, ALTAR_Z - 0.3);
    scene.add(flame);
  }
  const candle = new THREE.PointLight(0xffd9a0, 6, 9);
  candle.position.set(0, 2, ALTAR_Z + 0.5);
  scene.add(candle);
  sign(scene, 1.6, 0.36, 0, 0.6, ALTAR_Z + 0.56, 0, `💐 ${MEMORIAL_TEXT.flower.ko} · ${MEMORIAL_TEXT.flower.en}`, null, { bg: '#1d1f21', fg: '#e6d3a3' });
  const flowers = new THREE.Group();
  scene.add(flowers);
  let laid = 0;
  const layFlower = () => { // up to 14 on the altar, then the oldest makes room
    const f = chrysanthemum();
    const i = laid++ % 14;
    f.position.set(-1.5 + (i % 7) * 0.5, 1.03, ALTAR_Z + (i < 7 ? 0.05 : 0.32));
    f.rotation.y = (i * 0.7) % 0.6 - 0.3;
    if (flowers.children.length >= 14) flowers.remove(flowers.children[0]);
    flowers.add(f);
  };
  const seats = [];
  for (const x of [-3.2, 3.2]) {
    const z = ALTAR_Z + 5.4;
    box(2.8, 0.08, 0.6, x, 0.42, z, '#5b4a3a');
    for (const k of [-1, 1]) box(0.1, 0.42, 0.5, x + k * 1.25, 0.21, z, '#3a2f25');
    block(x, z, 2.8, 0.6);
    for (const o of [-0.7, 0.7]) seats.push({ x: x + o, z, ry: Math.PI, stand: [x + o, z + 1] });
  }

  // Lobby: the notice and the visitor board either side of the door, the
  // information desk in front of the way in.
  board(scene, 4.2, 1.9, -w / 2 + 6, 2.3, d / 2 - 0.05, Math.PI, '안내 · Notice', [DISCLAIMER.ko, `📷 ${CREDIT.ko}`], [DISCLAIMER.en, `📷 ${CREDIT.en}`]);
  board(scene, 4.2, 1.9, w / 2 - 6, 2.3, d / 2 - 0.05, Math.PI, '방문 정보 · Plan a visit', VISIT.ko, VISIT.en);
  const iz = LOBBY_Z + 3.4;
  box(4.2, 0.95, 0.8, 0, 0.475, iz, '#d9d4c9');
  box(4.3, 0.06, 0.9, 0, 0.98, iz, '#3a3d40');
  block(0, iz, 4.2, 0.8);
  sign(scene, 1.8, 0.42, 0, 0.55, iz + 0.41, 0, 'ℹ️ 안내 · Information', null, { bg: '#3a3d40' });
  const clerk = { x: 0, z: iz - 0.75, ry: 0 };

  const see = (px, pz, cx, cz) => {
    for (const wl of walls) {
      const hide = cx != null && crosses(px, pz, cx, cz, wl.a[0], wl.a[1], wl.b[0], wl.b[1]);
      const o = hide ? 0.18 : 1;
      if (wl.mesh.material.opacity !== o) {
        wl.mesh.material.opacity = o;
        wl.mesh.material.depthWrite = !hide;
        for (const sg of wl.signs) sg.visible = !hide;
      }
    }
  };
  return { looks, seats, clerk, flower: [{ ...FLOWER_SPOT }], layFlower, see };
}
