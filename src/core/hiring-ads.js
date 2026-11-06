// "알바급구!" hiring posters for shops with part-time jobs (core/jobs.js):
// on empty "AD SPACE" lots near the shop (core/ad-posters.js), on a wall down
// the street where a district has no empty lots, as slides on the square's
// big screen, and as a small paper sign by the shop's own door.
// Posters show English (with the Korean "알바급구!" as flavour) and switch to
// the player's language with the sign-translate button.
import * as THREE from 'three';
import { hiringLines } from './jobs.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

const fitFont = (g, text, px, weight, maxW, min = 16) => {
  g.font = `${weight} ${px}px ${FONT}`;
  while (g.measureText(text).width > maxW && px > min) g.font = `${weight} ${(px -= 2)}px ${FONT}`;
};

// Draw a poster on any canvas size. ad: { job, shopName, district, meters,
// color }; lang: sign language ('en' unless translated).
export function drawHiring(g, ad, lang) {
  const { width: W, height: H } = g.canvas;
  const s = H / 400; // designed at 640×400
  const L = hiringLines(ad.job, lang, ad);
  // Yellow paper with a red band, like a real "알바" flyer.
  g.fillStyle = '#ffe14d'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8322b'; g.fillRect(0, 0, W, 132 * s);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = -H; x < W; x += 48 * s) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 40 * s, H); g.lineTo(x + 40 * s + 60 * s, 132 * s); g.lineTo(x + 60 * s, 132 * s); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  fitFont(g, L.flavor, 92 * s, 900, W - 40 * s);
  g.fillText(L.flavor, W / 2, 56 * s);
  fitFont(g, L.head, 34 * s, 800, W - 40 * s);
  g.fillStyle = '#ffe14d';
  g.fillText(L.head, W / 2, 110 * s);
  // Shop name on a dark plate.
  g.fillStyle = ad.color || '#222';
  g.fillRect(28 * s, 146 * s, W - 56 * s, 76 * s);
  g.fillStyle = '#fff';
  fitFont(g, L.shop, 50 * s, 900, W - 90 * s);
  g.fillText(L.shop, W / 2, 185 * s);
  g.fillStyle = '#1d1d1f';
  fitFont(g, '💼 ' + L.role, 40 * s, 800, W - 50 * s);
  g.fillText('💼 ' + L.role, W / 2, 250 * s);
  fitFont(g, L.where, 34 * s, 700, W - 50 * s);
  g.fillText(L.where, W / 2, 296 * s);
  fitFont(g, L.pay, 30 * s, 700, W - 50 * s);
  g.fillText(L.pay, W / 2, 338 * s);
  g.fillStyle = '#e8322b';
  fitFont(g, L.cta, 24 * s, 700, W - 50 * s);
  g.fillText(L.cta, W / 2, 376 * s);
  // Tear-off tabs along the right edge read as a flyer even from far.
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3 * s;
  g.strokeRect(6 * s, 6 * s, W - 12 * s, H - 12 * s);
}

// A canvas texture that can be redrawn when the language changes.
export function hiringTexture(ad, lang, w = 640, h = 400) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  drawHiring(g, ad, lang);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.redraw = (l) => { drawHiring(g, ad, l); tex.needsUpdate = true; };
  return tex;
}

// The small paper sign by the door: "아르바이트 구함".
function stickerTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  const draw = (sub) => {
    g.fillStyle = '#fffdf3'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#e8322b'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, '알바급구!', 54, 900, 230);
    g.fillText('알바급구!', 128, 50);
    g.fillStyle = '#1d1d1f';
    fitFont(g, '아르바이트', 40, 900, 230);
    g.fillText('아르바이트', 128, 150);
    g.fillText('구함', 128, 200);
    g.fillStyle = '#e8322b';
    fitFont(g, sub, 30, 800, 230);
    g.fillText(sub, 128, 272);
  };
  draw(text);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.redraw = (t) => { draw(t); tex.needsUpdate = true; };
  return tex;
}

// A poster mounted flat on a wall: { x, z, nx, nz } (outward normal).
export function wallPoster(tex, wall, y, w = 5.6) {
  const h = w * 0.625;
  const g = new THREE.Group();
  g.position.set(wall.x + wall.nx * 0.08, y, wall.z + wall.nz * 0.08);
  g.rotation.y = Math.atan2(wall.nx, wall.nz);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.1), new THREE.MeshLambertMaterial({ color: 0x24262b }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = 0.06;
  g.add(frame, face);
  return g;
}

// The door sign: on the shop's facade group (+z faces the street).
export function doorSticker(group, text) {
  const tex = stickerTexture(text);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.8), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(1.85, 1.45, 0.12);
  group.add(m);
  return tex;
}

// Pick empty ad spots for the hiring shops: the nearest free spot to each
// shop within `max` metres (one per shop, nearest shops first).
// shops: [{ id, x, z }]; spots: [{ id, front: { x, z } }].
export function assignSpots(shops, spots, max = 260) {
  const pairs = [];
  for (const s of shops) for (const p of spots) {
    const d = Math.hypot(p.front.x - s.x, p.front.z - s.z);
    if (d <= max) pairs.push({ shop: s.id, spot: p.id, d });
  }
  pairs.sort((a, b) => a.d - b.d);
  const out = {}, used = new Set();
  for (const q of pairs) {
    if (out[q.shop] || used.has(q.spot)) continue;
    out[q.shop] = { spot: q.spot, d: q.d };
    used.add(q.spot);
  }
  return out;
}
