// Samseong-dong (Gangnam-gu): KONEXT, a fictional shopping mall by Samseong
// Station, seen from outside only (the map's custom buildings give the walls
// you bump into; scripts/build-samseong.mjs).
//   konext:        the mall: a long, low box (its d side runs north from
//                  KONEXT Square, w faces Yeongdong-daero), a light stone
//                  ground floor and glass floors above with white bands, a
//                  glass skylight on the roof that rises and falls like a
//                  wave, the main entrance with a deep canopy facing the
//                  plaza, and a tall KONEXT pylon by it. The media wall round
//                  its corner is a pair of region.json "screens" (wave).
//   aquarium:      the small glass pavilion of KONEXT Aquarium on the plaza:
//                  the way down to the aquarium (core/aquarium.js), its door
//                  is the "konext-aquarium" storefront.
//   samseongbridge: kerbs, railings and lamps of Samseong Bridge, where
//                  Teheran-ro crosses Tancheon (along x).
import * as THREE from 'three';
import { matCache, addBox, canvasTex } from './three-kit.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

export const KONEXT_BLUE = '#1d5fa8';
const STONE = '#e9dfca', GLASS = '#8eb4cc', BAND = '#f6f4ee';

// A flat sign with text drawn on a canvas, w × h metres, facing +z.
function textSign(w, h, draw, px = 512) {
  const tex = canvasTex(px, Math.round((px * h) / w), draw, { farFree: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

// The KONEXT word: bold letters, the O drawn as a ring with a wave through it.
function drawLogo(g, W, H, color = '#ffffff', vertical = false) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = color;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (vertical) {
    const letters = 'KONEXT'.split('');
    const step = H / (letters.length + 0.4);
    g.font = `900 ${Math.round(step * 0.82)}px ${FONT}`;
    letters.forEach((c, i) => g.fillText(c, W / 2, step * (i + 0.7)));
    return;
  }
  g.font = `900 ${Math.round(H * 0.62)}px ${FONT}`;
  g.fillText('KONEXT', W / 2, H * 0.54);
}

export function konext(g, l) {
  const w = l.w || 160, d = l.d || 90, h = l.h || 22;
  const base = 5.5;
  // Stone ground floor, glass above (a little inset), white bands at each floor.
  box(g, w, base, d, 0, base / 2, 0, STONE);
  const glass = new THREE.MeshLambertMaterial({ color: GLASS });
  box(g, w - 0.6, h - base, d - 0.6, 0, base + (h - base) / 2, 0, glass);
  for (let y = base; y < h - 1; y += 4.2) {
    box(g, w + 0.2, 0.45, d + 0.2, 0, y, 0, BAND);
  }
  box(g, w + 0.8, 1.2, d + 0.8, 0, h - 0.4, 0, BAND); // the roof edge
  // Thin mullions on the glass, so it reads as curtain wall.
  for (let x = -w / 2 + 6; x < w / 2; x += 6) for (const s of [-1, 1]) box(g, 0.25, h - base, 0.3, x, base + (h - base) / 2, s * (d / 2 - 0.15), '#d8e2ea');
  for (let z = -d / 2 + 6; z < d / 2; z += 6) for (const s of [-1, 1]) box(g, 0.3, h - base, 0.25, s * (w / 2 - 0.15), base + (h - base) / 2, z, '#d8e2ea');
  // Shop windows along the ground floor (dark glass between stone piers).
  for (let x = -w / 2 + 8; x < w / 2 - 4; x += 10) box(g, 7, 3.6, 0.2, x, 2.2, d / 2 + 0.05, '#3c4a57');
  // The wave skylight: glass ribs along the roof whose height rises and falls.
  const skylight = new THREE.MeshLambertMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.85 });
  const ribs = 30, sw = w * 0.7;
  for (let i = 0; i < ribs; i++) {
    const x = -sw / 2 + (i + 0.5) * (sw / ribs);
    const k = 1.2 + 2.2 * (0.5 + 0.5 * Math.sin((i / ribs) * Math.PI * 3));
    box(g, sw / ribs - 0.3, k, d * 0.36, x, h + k / 2, 0, skylight);
  }
  // The main entrance on the plaza side (+x): a deep white canopy over glass doors.
  const ez = l.entranceZ ?? -8;
  box(g, 10, 0.8, 26, w / 2 + 5, 7, ez, BAND);
  for (const s of [-1, 1]) box(g, 0.5, 7, 0.5, w / 2 + 9.6, 3.5, ez + s * 12.4, BAND);
  box(g, 0.2, 5.2, 18, w / 2 + 0.1, 2.6, ez, '#2b3945');
  const front = textSign(30, 6, (c, W, H) => drawLogo(c, W, H, KONEXT_BLUE));
  front.rotation.y = Math.PI / 2;
  front.position.set(w / 2 + 0.5, 13.5, ez);
  g.add(front);
  const ko = textSign(14, 2.6, (c, W, H) => { c.fillStyle = KONEXT_BLUE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.round(H * 0.7)}px ${FONT}`; c.fillText('코넥스트', W / 2, H / 2); });
  ko.rotation.y = Math.PI / 2;
  ko.position.set(w / 2 + 0.5, 9.4, ez);
  g.add(ko);
  // The square / Teheran-ro side (+z): the word along the top (kept to the
  // west part of a narrow wall, clear of the media wall by the corner).
  const sw0 = Math.min(40, w * 0.6);
  const side = textSign(sw0, sw0 * 7 / 40, (c, W, H) => drawLogo(c, W, H, KONEXT_BLUE));
  side.position.set(-w / 4, h - 4.4, d / 2 + 0.5);
  g.add(side);
  // A tall pylon at the plaza-side corner away from the street, the word running down it.
  const px = w / 2 + 2.5, pz = -d / 2 + 4;
  box(g, 4, 30, 4, px, 15, pz, KONEXT_BLUE);
  for (const s of [-1, 1]) {
    const v = textSign(3.2, 26, (c, W, H) => drawLogo(c, W, H, '#ffffff', true), 128);
    v.rotation.y = s > 0 ? Math.PI / 2 : 0;
    if (s > 0) v.position.set(px + 2.05, 15.5, pz);
    else v.position.set(px, 15.5, pz + 2.05);
    g.add(v);
  }
}

export function aquariumPavilion(g, l) {
  const w = l.w || 20, d = l.d || 16, h = l.h || 6;
  // A glass box in a blue frame, its door on the plaza side (+x).
  const glass = new THREE.MeshLambertMaterial({ color: '#7fc4e3', transparent: true, opacity: 0.8 });
  box(g, w, h, d, 0, h / 2, 0, glass);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.5, h, 0.5, (sx * w) / 2, h / 2, (sz * d) / 2, KONEXT_BLUE);
  box(g, w + 0.6, 0.6, d + 0.6, 0, h, 0, KONEXT_BLUE);
  // A roof of glass ribs in a little wave, like the mall's skylight.
  const sky = new THREE.MeshLambertMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.85 });
  for (let i = 0; i < 8; i++) {
    const z = -d / 2 + (i + 0.5) * (d / 8), k = 0.6 + 1.2 * (0.5 + 0.5 * Math.sin((i / 8) * Math.PI * 2));
    box(g, w * 0.8, k, d / 8 - 0.2, 0, h + 0.3 + k / 2, z, sky);
  }
  // Fish swimming round inside the glass, so it already feels like the sea.
  const fishes = [];
  const fishCol = ['#ff9a3c', '#ffd23f', '#4fc3f7', '#ff6f91', '#7ee081'];
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 6), mat(fishCol[i % fishCol.length]));
    f.rotation.z = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(f);
    g.add(holder);
    fishes.push({ holder, r: 2 + (i % 4) * 1.2, y: 1.2 + (i % 3) * 1.3, sp: 0.35 + (i % 5) * 0.08, ph: i * 1.7 });
  }
  // The big sign over the door (facing +x); the door itself is the
  // storefront's (stores.json "konext-aquarium": walk in to the aquarium).
  const sign = textSign(14, 2.8, (c, W, H) => {
    c.fillStyle = KONEXT_BLUE; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${Math.round(H * 0.4)}px ${FONT}`; c.fillText('KONEXT AQUARIUM', W / 2, H * 0.36);
    c.font = `800 ${Math.round(H * 0.28)}px ${FONT}`; c.fillText('코넥스트 아쿠아리움', W / 2, H * 0.76);
  });
  sign.rotation.y = Math.PI / 2;
  sign.position.set(w / 2 + 0.3, h + 1.6, 0);
  g.add(sign);
  return (t) => {
    for (const f of fishes) {
      const a = t * f.sp + f.ph;
      f.holder.position.set(Math.cos(a) * f.r * 0.6, f.y + Math.sin(a * 1.7) * 0.2, Math.sin(a) * f.r * 0.45);
      f.holder.rotation.y = -a;
    }
  };
}

export function samseongBridge(g, l) {
  const len = l.len || 50, w = l.w || 20, half = w / 2;
  for (const s of [-1, 1]) {
    box(g, len, 0.35, 0.6, 0, 0.175, s * (half + 0.3), '#c9cdd2'); // kerb
    box(g, len, 0.08, 0.08, 0, 1.15, s * (half + 0.3), '#5a6470'); // hand rail
    for (let x = -len / 2; x <= len / 2 + 0.01; x += 2.5) box(g, 0.08, 0.8, 0.08, x, 0.75, s * (half + 0.3), '#5a6470');
    for (const x of [-len / 4, len / 4]) {
      box(g, 0.14, 5, 0.14, x, 2.85, s * (half + 0.3), '#5a6470');
      box(g, 0.36, 0.18, 1, x, 5.3, s * (half - 0.2), '#f4f1e6');
    }
  }
}
