// Ad posters on empty shop lots: every shop lot (a map building with `f`,
// the direction its front faces) that no store stands in front of gets a big
// "AD SPACE" poster with its spot number and a shutter covered in small
// posters at street level, so the wall can be sold to an advertiser later.
//
// Spot numbers ("L-07") count the shop lots of a district in map order, so
// they stay the same while shops come and go. A booked spot shows its ad
// from region.json:
//   "adPosters": { "L-07": { "image": "ads/brand.png" } }
//   "adPosters": { "L-07": { "text": "Grand opening", "sub": "Seongsu-ro 12", "color": "#e94e77" } }
// A shop's own building can carry a big poster on its upper floors too,
// above the shop front (region.json "storePosters"):
//   "storePosters": { "golmok-chicken": { "image": "ads/brand.webp" } }
import * as THREE from 'three';
import { placeOf } from './districts.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

// The front of a lot: middle of the facing side, the direction along it and
// half its width.
export function lotFront(b) {
  const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const [nx, nz] = b.f;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (nz) return { x: cx, z: nz > 0 ? z1 : z0, nx: 0, nz: Math.sign(nz), half: (x1 - x0) / 2 };
  return { x: nx > 0 ? x1 : x0, z: cz, nx: Math.sign(nx), nz: 0, half: (z1 - z0) / 2 };
}

// Shop lots with no store in front: [{ id, b, front }]. `points` are where
// the stores (and homes) stand.
export function emptyLots(buildings, points) {
  const out = [];
  const count = {};
  for (const b of buildings) {
    if (!b.f) continue;
    const d = b.d || 'map';
    count[d] = (count[d] || 0) + 1;
    const front = lotFront(b);
    const taken = points.some(([x, z]) => {
      const dx = x - front.x, dz = z - front.z;
      const ahead = dx * front.nx + dz * front.nz; // metres in front of the wall
      const along = Math.abs(dx * front.nz - dz * front.nx);
      return ahead > -1 && ahead < 7 && along <= front.half + 1.5;
    });
    if (!taken) out.push({ id: 'L-' + String(count[d]).padStart(2, '0'), b, front });
  }
  return out;
}

// The lot a store stands in front of (or null).
export function storeLot(buildings, [x, z]) {
  let best = null, bd = Infinity;
  for (const b of buildings) {
    if (!b.f) continue;
    const front = lotFront(b);
    const dx = x - front.x, dz = z - front.z;
    const ahead = dx * front.nx + dz * front.nz;
    const along = Math.abs(dx * front.nz - dz * front.nx);
    if (ahead > -1 && ahead < 7 && along <= front.half + 1.5 && ahead + along < bd) { bd = ahead + along; best = { b, front }; }
  }
  return best;
}

// ── Textures ────────────────────────────────────────────────────────────
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const BIG_COLORS = ['#ff5a5f', '#2d6cdf', '#11a37f', '#f2a900', '#8e44ad', '#ff7a00', '#e94e77', '#1b998b'];

function drawBig(g, W, H, id, k) {
  const c = BIG_COLORS[k % BIG_COLORS.length];
  g.fillStyle = c; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  for (let x = -H; x < W; x += 64) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.lineTo(x + H + 24, 0); g.lineTo(x + 24, H); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(18, 18, W - 36, H - 36);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.font = `900 120px ${FONT}`;
  g.fillText('AD SPACE', W / 2, H * 0.36);
  g.font = `700 44px ${FONT}`;
  g.fillText('Your brand here', W / 2, H * 0.6);
  g.fillStyle = '#fff'; g.fillRect(W / 2 - 120, H * 0.7, 240, 64);
  g.fillStyle = c; g.font = `900 44px ${FONT}`;
  g.fillText('Spot ' + id, W / 2, H * 0.7 + 34);
}

function drawBooked(g, W, H, ad) {
  g.fillStyle = ad.color || '#222'; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.font = `900 ${ad.text?.length > 12 ? 72 : 104}px ${FONT}`;
  g.fillText(ad.text || '', W / 2, H * (ad.sub ? 0.42 : 0.5));
  if (ad.sub) { g.font = `600 44px ${FONT}`; g.fillText(ad.sub, W / 2, H * 0.7); }
}

// Small street posters: a handful of designs, shared by every shutter.
const SMALL = [
  ['#ffd23f', '#222', 'POSTER', 'HERE'],
  ['#ff5a5f', '#fff', 'RENT', 'THIS WALL'],
  ['#2d6cdf', '#fff', 'YOUR', 'EVENT'],
  ['#111', '#ffd23f', 'AD', 'SPACE'],
  ['#11a37f', '#fff', 'POP-UP', 'SOON'],
  ['#f4f1ea', '#e94e77', 'YOUR', 'BRAND'],
];
let smallMats = null;
function smallMaterials() {
  return (smallMats ||= SMALL.map(([bg, fg, a, b]) => new THREE.MeshLambertMaterial({
    map: canvasTex(128, 192, (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${a.length > 4 ? 30 : 44}px ${FONT}`; g.fillText(a, W / 2, H * 0.36);
      g.font = `800 ${b.length > 5 ? 22 : 34}px ${FONT}`; g.fillText(b, W / 2, H * 0.6);
      g.fillRect(W * 0.2, H * 0.8, W * 0.6, 4);
    }),
  })));
}

// ── Meshes ──────────────────────────────────────────────────────────────
const shutterMat = () => new THREE.MeshLambertMaterial({
  map: canvasTex(64, 64, (g, W, H) => {
    g.fillStyle = '#8b9096'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6f747a';
    for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 3);
  }),
});

export class AdPosters {
  constructor(scene, buildings, stores, center, latLonToLocal, booked = {}, base = '/', storePosters = {}) {
    this.root = new THREE.Group();
    this.spots = emptyLots(buildings, stores.map((s) => placeOf(s, center, latLonToLocal)));
    const smalls = smallMaterials();
    const shutter = shutterMat();
    shutter.map.wrapS = shutter.map.wrapT = THREE.RepeatWrapping;
    const small = new THREE.PlaneGeometry(0.9, 1.3);
    this.spots.forEach(({ id, b, front }, k) => {
      const g = new THREE.Group();
      g.position.set(front.x + front.nx * 0.06, 0, front.z + front.nz * 0.06);
      g.rotation.y = Math.atan2(front.nx, front.nz);
      const wide = front.half * 2;
      // Shutter with posters pasted on it.
      const sw = wide - 1.2, sh = 3;
      const sTex = shutter.clone(); sTex.map = shutter.map.clone(); sTex.map.repeat.set(sw / 2, sh / 2); sTex.map.needsUpdate = true;
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sTex);
      sm.position.y = sh / 2;
      g.add(sm);
      const n = Math.max(3, Math.floor(sw / 1.25));
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(small, smalls[(i + k * 3) % smalls.length]);
        p.position.set(-sw / 2 + (i + 0.5) * (sw / n), 1.45 + ((i * 7 + k) % 3) * 0.12, 0.02);
        p.rotation.z = (((i * 13 + k * 5) % 7) - 3) * 0.02;
        g.add(p);
      }
      // The big poster above the shutter.
      const top = (b.h || 8) - 0.6, bottom = sh + 0.6;
      const bw = Math.min(wide - 2, 10, ((top - bottom) / 0.62));
      if (bw > 3) {
        const bh = bw * 0.62;
        const ad = booked[id];
        let map;
        if (ad?.image) {
          map = new THREE.TextureLoader().load(base + ad.image);
          map.colorSpace = THREE.SRGBColorSpace;
        } else map = canvasTex(640, 400, (c, W, H) => (ad ? drawBooked(c, W, H, ad) : drawBig(c, W, H, id, k)));
        const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.4, 0.12), new THREE.MeshLambertMaterial({ color: 0x24262b }));
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map }));
        const y = Math.min(bottom + bh / 2 + 0.4, top - bh / 2);
        frame.position.set(0, y, 0.06);
        poster.position.set(0, y, 0.13);
        g.add(frame, poster);
      }
      this.root.add(g);
    });
    // Big posters on the upper floors of shop buildings.
    for (const s of stores) {
      const ad = storePosters[s.id];
      if (!ad?.image) continue;
      const lot = storeLot(buildings, placeOf(s, center, latLonToLocal));
      if (!lot) continue;
      const { b, front } = lot;
      // Above the floating shop name (storefronts.js badge, up to ~7.2 m).
      const bottom = 8.2, top = (b.h || 8) - 0.5;
      const bw = Math.min(front.half * 2 - 1.2, 9, (top - bottom) / 0.62);
      if (bw < 3) continue;
      const bh = bw * 0.62;
      const g = new THREE.Group();
      g.position.set(front.x + front.nx * 0.06, 0, front.z + front.nz * 0.06);
      g.rotation.y = Math.atan2(front.nx, front.nz);
      const map = new THREE.TextureLoader().load(base + ad.image);
      map.colorSpace = THREE.SRGBColorSpace;
      const y = bottom + bh / 2;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, bh + 0.3, 0.1), new THREE.MeshLambertMaterial({ color: 0x24262b }));
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map }));
      frame.position.set(0, y, 0.05);
      poster.position.set(0, y, 0.11);
      g.add(frame, poster);
      this.root.add(g);
    }
    scene.add(this.root);
  }
}
