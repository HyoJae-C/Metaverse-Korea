// The museum south of Itaewon: one big gallery of old Korean paintings.
// Frames hang on the back and side walls, each with a small wall label
// (Korean and English). The painting images load only when you walk in
// (the interior is built on entering), so they cost nothing on first load.
// Paintings and their credits are data in src/data/paintings.js.
import * as THREE from 'three';
import { PAINTINGS, CREDIT, DISCLAIMER } from '../data/paintings.js';

export const ROOM_MUSEUM = { w: 30, d: 22, h: 6 };
const SPACING = 3.4; // metres between frame centres
const MAX_SIDE = 2.2; // the longer side of a painting on the wall
const MAX_W = 2.7; // and never wider than this (frames stay apart)
const CENTRE_Y = 2.05;

// Display size (metres) for a w×h pixel image.
export function displaySize(p) {
  const a = p.w / p.h;
  let W = a >= 1 ? MAX_SIDE : MAX_SIDE * a, H = W / a;
  if (W > MAX_W) { W = MAX_W; H = W / a; }
  return { W, H };
}

// Wall spots, back wall first (left to right), then the left and right walls
// from the back towards the door. Each: centre on the wall, the wall's
// inward rotation, and where a visitor stands to look at it.
export function gallerySlots(room = ROOM_MUSEUM) {
  const { w, d } = room;
  const slots = [];
  const nBack = Math.floor((w - 4) / SPACING);
  for (let i = 0; i < nBack; i++) {
    const x = (i - (nBack - 1) / 2) * SPACING;
    slots.push({ x, z: -d / 2 + 0.06, ry: 0, look: { x, z: -d / 2 + 1.7 } });
  }
  const nSide = Math.floor((d - 6) / SPACING);
  for (const s of [-1, 1]) for (let i = 0; i < nSide; i++) {
    const z = -d / 2 + 2.6 + i * SPACING;
    slots.push({ x: s * (w / 2 - 0.06), z, ry: -s * Math.PI / 2, look: { x: s * (w / 2 - 1.7), z } });
  }
  return slots;
}

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const paintingUrl = (p) => BASE + p.file;

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

// Builds the gallery into an interior scene. `box`, `block`, `mat` are the
// interior's helpers. Returns the look-at spots ({ x, z, painting }) and
// the bench seats.
export function buildGallery(scene, room, { box, block, mat }, paintings = PAINTINGS) {
  const { w, d } = room;
  const looks = [];
  const loader = new THREE.TextureLoader();
  const slots = gallerySlots(room);
  paintings.slice(0, slots.length).forEach((p, i) => {
    const s = slots[i];
    const g = new THREE.Group();
    g.position.set(s.x, CENTRE_Y, s.z);
    g.rotation.y = s.ry;
    scene.add(g);
    const { W, H } = displaySize(p);
    // Frame: a dark wooden border, then a silk mount, then the painting.
    const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.34, H + 0.34, 0.06), mat('#3b2a1e'));
    frame.position.z = 0.03;
    g.add(frame);
    const mount = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.2, H + 0.2), mat('#e9e0cc'));
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
    looks.push({ x: s.look.x, z: s.look.z, painting: p });
    // A low rope barrier keeps visitors a step back from the wall.
    const back = s.ry === 0;
    const [bx, bz] = back ? [s.x, s.z + 0.75] : [s.x + Math.sign(-s.x) * 0.75, s.z];
    box(back ? W + 0.6 : 0.04, 0.04, back ? 0.04 : W + 0.6, bx, 0.75, bz, '#8a1f1f');
    for (const k of [-1, 1]) {
      const [px, pz] = back ? [bx + k * (W / 2 + 0.3), bz] : [bx, bz + k * (W / 2 + 0.3)];
      box(0.08, 0.8, 0.08, px, 0.4, pz, '#b8952e');
    }
    block(bx, bz, back ? W + 0.7 : 0.5, back ? 0.5 : W + 0.7);
  });

  // Benches down the middle, facing the back wall.
  const seats = [];
  for (const x of [-6, 0, 6]) {
    const z = -1;
    box(2.6, 0.08, 0.6, x, 0.4, z, '#7a5638');
    for (const k of [-1, 1]) box(0.1, 0.4, 0.5, x + k * 1.15, 0.2, z, '#4a3424');
    block(x, z, 2.6, 0.6);
    for (const sx of [-0.7, 0.7]) seats.push({ x: x + sx, z, ry: Math.PI, stand: [x + sx, z - 1] });
  }

  // Notice by the door: a game space, not the real museum, and the credit.
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
  notice.position.set(-5.5, 2.2, d / 2 - 0.04);
  notice.rotation.y = Math.PI;
  scene.add(notice);

  // Information desk with the docent, to the right of the door.
  const cx = 6, cz = d / 2 - 2.6;
  box(3, 0.95, 0.8, cx, 0.475, cz, '#e9e0cc');
  box(3.1, 0.06, 0.9, cx, 0.98, cz, '#3b2a1e');
  block(cx, cz, 3, 0.8);
  const clerk = { x: cx, z: cz + 0.75, ry: Math.PI };
  return { looks, seats, clerk };
}

export const nearestPainting = (looks, x, z, r = 1.3) => {
  let best = null, bd = r;
  for (const l of looks || []) {
    const dd = Math.hypot(x - l.x, z - l.z);
    if (dd < bd) { bd = dd; best = l; }
  }
  return best;
};
