// Ad posters on empty shop lots: every shop lot (a map building with `f`,
// the direction its front faces) that no store stands in front of gets a big
// "AD SPACE" poster with its spot number and a shutter covered in small
// posters at street level, so the wall can be sold to an advertiser later.
//
// Spot numbers ("L-07") count the shop lots of a district in map order, so
// they stay the same while shops come and go. A booked spot shows its ad
// from region.json:
//   "adPosters": { "L-07": { "image": "ads/brand.png", "credit": "Photographer Name" } }
//   "adPosters": { "L-07": { "text": "Grand opening", "sub": "Seongsu-ro 12", "color": "#e94e77" } }
// A shop's own building can carry a big poster on its upper floors too,
// above the shop front (region.json "storePosters"):
//   "storePosters": { "golmok-chicken": { "image": "ads/brand.webp" } }
// Any map building can carry a big photo on one wall (map file, on the
// building; "face" is the direction the wall faces):
//   { "h": 28, "p": [...], "wall": { "face": [1, 0], "image": "ads/x.webp", "credit": "Name" } }
import * as THREE from 'three';
import { placeOf } from './districts.js';
import { canvasTex as canvasTexture } from './three-kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

// The front of a lot: middle of the facing side (the side furthest out
// along `f`; lots can stand at a slant, like Seongsu's), the direction it
// faces and half its width.
export function lotFront(b) {
  const [fx, fz] = b.f, fl = Math.hypot(fx, fz) || 1;
  const nx = fx / fl, nz = fz / fl;
  const p = b.p, cx = p.reduce((a, q) => a + q[0], 0) / p.length, cz = p.reduce((a, q) => a + q[1], 0) / p.length;
  let best = null, bd = -Infinity;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], c = p[(i + 1) % p.length];
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, d = (mx - cx) * nx + (mz - cz) * nz;
    if (d > bd) { bd = d; best = { x: mx, z: mz, half: Math.hypot(c[0] - a[0], c[1] - a[1]) / 2 }; }
  }
  return { x: best.x, z: best.z, nx: nx || 0, nz: nz || 0, half: best.half };
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
const canvasTex = (w, h, draw) => canvasTexture(w, h, draw, { anisotropy: 4, farFree: true });

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
// All six on one sheet (3 across, 2 down, 128 × 192 each), so a shutter's
// row of small posters is one mesh (one draw call) instead of one each.
let smallSheet = null;
function smallMaterial() {
  return (smallSheet ||= new THREE.MeshLambertMaterial({
    map: canvasTex(384, 384, (g) => {
      SMALL.forEach(([bg, fg, a, b], i) => {
        const W = 128, H = 192, x0 = (i % 3) * W, y0 = Math.floor(i / 3) * H;
        g.fillStyle = bg; g.fillRect(x0, y0, W, H);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `900 ${a.length > 4 ? 30 : 44}px ${FONT}`; g.fillText(a, x0 + W / 2, y0 + H * 0.36);
        g.font = `800 ${b.length > 5 ? 22 : 34}px ${FONT}`; g.fillText(b, x0 + W / 2, y0 + H * 0.6);
        g.fillRect(x0 + W * 0.2, y0 + H * 0.8, W * 0.6, 4);
      });
    }),
  }));
}
// A small poster's plane, its picture cut from the sheet (design i).
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pz = new THREE.Vector3(0, 0, 1), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(1, 1, 1);
function smallPoster(i, x, y, z, rz) {
  const geo = new THREE.PlaneGeometry(0.9, 1.3);
  const uv = geo.attributes.uv, col = i % 3, row = Math.floor(i / 3);
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / 3, 1 - (row + 1 - uv.getY(k)) / 2);
  return geo.applyMatrix4(_pm.compose(_pv.set(x, y, z), _pq.setFromAxisAngle(_pz, rz), _ps));
}

// The photo's source in the poster's corner, small, like a magazine photo
// credit: "UNSPLASH : Name".
function creditTag(text, h = 0.26) {
  const H = 48;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `600 28px ${FONT}`;
  const W = Math.ceil(probe.measureText(text).width) + 28;
  const map = canvasTex(W, H, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.font = `600 28px ${FONT}`; g.textBaseline = 'middle';
    g.fillText(text, 14, H / 2 + 1);
  });
  const m = new THREE.Mesh(UNIT_PLANE, new THREE.MeshBasicMaterial({ map, transparent: true }));
  m.scale.set((h * W) / H, h, 1);
  return m;
}

// A photo poster in its own shape: fits a box of maxW × maxH metres
// (bottom edge at `bottom`), sized once the image has loaded. `credit`
// (optional) names the photographer in the bottom right corner.
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
function photoPoster(g, url, maxW, maxH, bottom, credit) {
  const frame = new THREE.Mesh(UNIT_BOX, new THREE.MeshLambertMaterial({ color: 0x24262b }));
  const poster = new THREE.Mesh(UNIT_PLANE, new THREE.MeshBasicMaterial());
  frame.visible = poster.visible = false;
  g.add(frame, poster);
  const map = new THREE.TextureLoader().load(url, (tex) => {
    const a = tex.image.width / tex.image.height;
    const w = Math.min(maxW, maxH * a), h = w / a;
    const y = bottom + h / 2;
    poster.scale.set(w, h, 1);
    poster.position.set(0, y, 0.12);
    frame.scale.set(w + 0.3, h + 0.3, 0.1);
    frame.position.set(0, y, 0.05);
    frame.visible = poster.visible = true;
    if (credit) {
      const tag = creditTag('UNSPLASH : ' + credit, Math.max(0.26, h * 0.028));
      const pad = tag.scale.y * 0.3;
      tag.position.set(w / 2 - tag.scale.x / 2 - pad, y - h / 2 + tag.scale.y / 2 + pad, 0.14);
      g.add(tag);
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  poster.material.map = map;
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
    this.posters = {}; // spot id -> the big poster mesh (for setPoster)
    const smalls = smallMaterial();
    const shutter = shutterMat();
    shutter.map.wrapS = shutter.map.wrapT = THREE.RepeatWrapping;
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
      const parts = [];
      for (let i = 0; i < n; i++) parts.push(smallPoster((i + k * 3) % SMALL.length, -sw / 2 + (i + 0.5) * (sw / n), 1.45 + ((i * 7 + k) % 3) * 0.12, 0.02, (((i * 13 + k * 5) % 7) - 3) * 0.02));
      g.add(new THREE.Mesh(mergeGeometries(parts), smalls));
      for (const q of parts) q.dispose();
      // The big poster above the shutter.
      const top = (b.h || 8) - 0.6, bottom = sh + 0.6;
      const bw = Math.min(wide - 2, 10, ((top - bottom) / 0.62));
      const ad = booked[id];
      if (ad?.image) photoPoster(g, base + ad.image, Math.min(wide - 2, 10), top - bottom - 0.4, bottom + 0.4, ad.credit);
      else if (bw > 3) {
        const bh = bw * 0.62;
        const map = canvasTex(640, 400, (c, W, H) => (ad ? drawBooked(c, W, H, ad) : drawBig(c, W, H, id, k)));
        const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.4, 0.12), new THREE.MeshLambertMaterial({ color: 0x24262b }));
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map }));
        const y = Math.min(bottom + bh / 2 + 0.4, top - bh / 2);
        frame.position.set(0, y, 0.06);
        poster.position.set(0, y, 0.13);
        g.add(frame, poster);
        this.posters[id] = poster;
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
      // Just above the shop sign, in the photo's own shape, as big as the
      // wall allows.
      const bottom = 5.6, top = (b.h || 8) - 0.5;
      if (front.half * 2 < 4 || top - bottom < 3) continue;
      const g = new THREE.Group();
      g.position.set(front.x + front.nx * 0.06, 0, front.z + front.nz * 0.06);
      g.rotation.y = Math.atan2(front.nx, front.nz);
      photoPoster(g, base + ad.image, front.half * 2 - 0.8, top - bottom, bottom, ad.credit);
      this.root.add(g);
    }
    // Big photos on the walls of ordinary buildings (e.g. round a square).
    for (const b of buildings) {
      const ad = b.wall;
      if (!ad?.image || !Array.isArray(ad.face)) continue;
      const front = lotFront({ ...b, f: ad.face });
      const bottom = 4, top = (b.h || 8) - 1;
      if (top - bottom < 3) continue;
      const g = new THREE.Group();
      g.position.set(front.x + front.nx * 0.06, 0, front.z + front.nz * 0.06);
      g.rotation.y = Math.atan2(front.nx, front.nz);
      photoPoster(g, base + ad.image, Math.min(front.half * 2 - 4, 26), top - bottom, bottom, ad.credit);
      this.root.add(g);
    }
    scene.add(this.root);
  }

  // Show another texture on a spot's big poster (e.g. a hiring ad). Returns
  // false when the spot has no big poster (too low a wall).
  setPoster(id, map) {
    const poster = this.posters[id];
    if (!poster) return false;
    poster.material.map?.dispose?.();
    poster.material.map = map;
    poster.material.needsUpdate = true;
    return true;
  }
}
