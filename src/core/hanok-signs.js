// Signs for hanok shops (store.front 'hanok': Bukchon, Jongmyo). The street's
// big boards stand above the door, where a hanok's eaves are, so they cut
// through the curved roof. These stay under the eaves, the way real hanok
// shops sign themselves:
// - plaque (현판): a wooden board above the door, the frame dark wood.
// - board (세로 간판): a narrow upright wooden board on the front beside
//   the door.
// - banner (천 간판): a cloth hanging from a wooden pole by the door.
// Korean runs top to bottom on the tall ones; other scripts turn sideways.
import * as THREE from 'three';

export const HANOK_SIGNS = {
  plaque: { w: 3.0, h: 0.6 },
  board: { w: 0.55, h: 1.6 },
  banner: { w: 0.7, h: 1.5 },
};
const MIX = ['plaque', 'board', 'banner', 'plaque'];

export function hanokSignStyle(store) {
  const want = store.sign?.hanok;
  if (want && HANOK_SIGNS[want]) return want;
  if (store.category === 'info') return 'plaque'; // (the info centres all look alike)
  let h = 0;
  for (const ch of String(store.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MIX[h % MIX.length];
}

const WOOD = '#4a3020', INK = '#f6e7c1';
const FONT = (s) => `800 ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "PingFang SC", "Noto Sans Thai", "Leelawadee UI", "Tahoma", system-ui, sans-serif`;
const isCJK = (s) => /^[぀-ヿ㐀-鿿가-힯\s]+$/.test(s);
function fit(g, text, maxW, max, min = 14) {
  let size = max;
  g.font = FONT(size);
  while (g.measureText(text).width > maxW && size > min) g.font = FONT((size -= 2));
  return size;
}

// The face: bg the shop's colour, text in the shop's language (sub: a
// smaller second line or column).
export function hanokSignTexture(style, text, bg, sub = '') {
  const { w, h } = HANOK_SIGNS[style];
  const k = 512 / Math.max(w, h);
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  if (style === 'banner') { // cloth: a darker hem top and bottom
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, W, H * 0.06); g.fillRect(0, H * 0.94, W, H * 0.06);
    g.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < W; x += 18) g.fillRect(x, 0, 2, H); // the weave
  } else { // wood: a dark frame round the shop's colour
    const f = Math.round(Math.min(W, H) * (style === 'plaque' ? 0.12 : 0.1));
    g.fillStyle = WOOD; g.fillRect(0, 0, W, H);
    g.fillStyle = bg; g.fillRect(f, f, W - 2 * f, H - 2 * f);
    g.fillStyle = 'rgba(40,24,12,0.18)'; for (let y = f; y < H - f; y += 9) g.fillRect(f, y, W - 2 * f, 2); // grain
    g.strokeStyle = '#c9a25a'; g.lineWidth = 3; g.strokeRect(f + 6, f + 6, W - 2 * f - 12, H - 2 * f - 12);
  }
  g.fillStyle = style === 'banner' ? '#ffffff' : INK;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (style === 'plaque') {
    if (!sub) { fit(g, text, W * 0.82, Math.floor(H * 0.52)); g.fillText(text, W / 2, H / 2 + 3); }
    else {
      fit(g, text, W * 0.82, Math.floor(H * 0.4)); g.fillText(text, W / 2, H * 0.4);
      fit(g, sub, W * 0.8, Math.floor(H * 0.22)); g.fillText(sub, W / 2, H * 0.74);
    }
  } else {
    const main = text.replace(/\s+/g, '');
    if (isCJK(text) && main.length <= 7) { // a letter per line
      const cols = sub && isCJK(sub) ? [[[...main], 0.4, 1], [[...sub.replace(/\s+/g, '')], 0.8, 0.55]] : [[[...main], 0.5, 1]];
      for (const [chars, cx, s] of cols) {
        const step = Math.min((H * 0.84) / chars.length, W * 0.62);
        g.font = FONT(Math.floor(step * 0.86 * s));
        chars.forEach((ch, n) => g.fillText(ch, W * cx, H / 2 + (n - (chars.length - 1) / 2) * step + 3));
      }
    } else {
      g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI / 2);
      fit(g, text, H * 0.84, Math.floor(W * 0.5));
      g.fillText(text, 0, 3);
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
function box(g, sx, sy, sz, x, y, z, m) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}

// Builds the sign into the storefront's group (+z out to the street, the
// door at x 0, the front 5.2 m wide and 2.6 m high). Returns the material
// whose map setTranslated swaps, and the sign's top (for the badge).
export function addHanokSign(group, style, face) {
  const { w, h } = HANOK_SIGNS[style];
  const faceMat = new THREE.MeshBasicMaterial({ map: face });
  const wood = mat(WOOD);
  if (style === 'plaque') { // above the door, under the eaves (they start near 2.9 m)
    const y = 2.5;
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), [wood, wood, wood, wood, faceMat, wood]);
    p.position.set(0, y, 0.2);
    group.add(p);
    return { faceMat, top: y + h / 2 };
  }
  if (style === 'board') { // flat on the front beside the door, over the lattice
    const x = 2.0, y = 1.45;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [wood, wood, wood, wood, faceMat, wood]);
    b.position.set(x, y, 0.22);
    group.add(b);
    return { faceMat, top: y + h / 2 };
  }
  // banner: a pole out by the door, the cloth facing the street
  const x = 3.05, z = 1.35, top = 2.75;
  box(group, 0.1, top + 0.1, 0.1, x, (top + 0.1) / 2, z, wood); // pole
  box(group, w + 0.2, 0.06, 0.06, x - w / 2, top - 0.05, z, wood); // crossbar
  box(group, 0.36, 0.08, 0.36, x, 0.04, z, mat('#8c8577')); // stone foot
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  faceMat.side = THREE.DoubleSide;
  cloth.position.set(x - w / 2 - 0.05, top - 0.1 - h / 2, z);
  group.add(cloth);
  return { faceMat, top };
}
