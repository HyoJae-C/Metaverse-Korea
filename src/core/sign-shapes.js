// Shop sign shapes, so a street isn't a row of identical boards: wide and
// short boards, pills, circles, triangles, arches and the tall blade signs
// (돌출 간판) that stick out from the wall. A store can ask for one in
// stores.json ("sign": { "shape": "circle" }); otherwise its id picks one.
// One geometry per shape is shared by every sign that uses it, and the
// texture is drawn on a canvas the shape's size (longest side 512 px).
import * as THREE from 'three';

// w, h in metres. blade: hangs at right angles to the wall, by the door.
export const SIGN_SHAPES = {
  board: { w: 6.4, h: 1.2 },
  wide: { w: 7.2, h: 1.5 },
  short: { w: 4.6, h: 1.0 },
  pill: { w: 5.8, h: 1.4 },
  circle: { w: 2.6, h: 2.6 },
  triangle: { w: 3.2, h: 2.7 },
  arch: { w: 3.6, h: 2.4 },
  tall: { w: 1.3, h: 3.0, blade: true },
};
// The id picks from this list when a store doesn't choose (boards twice as
// often, so the street still reads as shops).
const MIX = ['board', 'board', 'wide', 'short', 'pill', 'circle', 'arch', 'triangle', 'tall', 'board', 'pill', 'short'];

export function signShape(store) {
  const want = store.sign?.shape;
  if (want && SIGN_SHAPES[want]) return want;
  if (store.category === 'home') return 'board';
  let h = 0;
  for (const ch of String(store.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MIX[h % MIX.length];
}

// The outline, centred on (0, 0) with y up, drawn with any path API that has
// moveTo / lineTo / quadraticCurveTo / arc (THREE.Shape or a canvas adapter).
// i: inset in metres (the inner white line).
function outline(P, shape, i = 0) {
  const { w, h } = SIGN_SHAPES[shape];
  const hw = w / 2 - i, hh = h / 2 - i;
  const round = (r) => {
    r = Math.min(r, hw, hh);
    P.moveTo(-hw + r, -hh);
    P.lineTo(hw - r, -hh); P.quadraticCurveTo(hw, -hh, hw, -hh + r);
    P.lineTo(hw, hh - r); P.quadraticCurveTo(hw, hh, hw - r, hh);
    P.lineTo(-hw + r, hh); P.quadraticCurveTo(-hw, hh, -hw, hh - r);
    P.lineTo(-hw, -hh + r); P.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  };
  switch (shape) {
    case 'circle': P.moveTo(hw, 0); P.arc(0, 0, hw, 0, Math.PI * 2, false); break;
    case 'pill': round(hh); break;
    case 'triangle': { // rounded corners, point up
      const k = i * 1.8, top = h / 2 - k, bot = -h / 2 + i, side = w / 2 - k;
      P.moveTo(-side + 0.2, bot);
      P.lineTo(side - 0.2, bot); P.quadraticCurveTo(side, bot, side - 0.1, bot + 0.18);
      P.lineTo(0.12, top - 0.2); P.quadraticCurveTo(0, top, -0.12, top - 0.2);
      P.lineTo(-side + 0.1, bot + 0.18); P.quadraticCurveTo(-side, bot, -side + 0.2, bot);
      break;
    }
    case 'arch': { // a half circle on top of a box
      const r = hw, cy = h / 2 - w / 2;
      P.moveTo(-hw, -hh);
      P.lineTo(hw, -hh); P.lineTo(hw, cy);
      P.arc(0, cy, r, 0, Math.PI, false);
      P.lineTo(-hw, -hh);
      break;
    }
    default: round(shape === 'tall' ? 0.3 : 0.28);
  }
}

// Where the text goes, in fractions of the canvas: centre x, centre y (from
// the top), max width, max height, and how many lines it may wrap to.
const TEXT_BOX = {
  circle: [0.5, 0.5, 0.74, 0.5, 2],
  triangle: [0.5, 0.7, 0.5, 0.34, 2],
  arch: [0.5, 0.58, 0.78, 0.5, 2],
};

const geos = {};
export function signGeometry(shape) {
  if (geos[shape]) return geos[shape];
  const { w, h } = SIGN_SHAPES[shape];
  const s = new THREE.Shape();
  outline({
    moveTo: (x, y) => s.moveTo(x, y), lineTo: (x, y) => s.lineTo(x, y),
    quadraticCurveTo: (a, b, x, y) => s.quadraticCurveTo(a, b, x, y),
    arc: (cx, cy, r, a0, a1, cw) => s.absarc(cx, cy, r, a0, a1, cw),
  }, shape);
  const depth = 0.22;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  // Map the caps (group 0) onto the texture; the back cap is mirrored so a
  // blade sign reads right from both sides.
  const pos = g.attributes.position, uv = g.attributes.uv;
  const cap = g.groups.find((gr) => gr.materialIndex === 0);
  for (let k = cap.start; k < cap.start + cap.count; k++) {
    const u = pos.getX(k) / w + 0.5, v = pos.getY(k) / h + 0.5;
    uv.setXY(k, pos.getZ(k) < 0 ? 1 - u : u, v);
  }
  uv.needsUpdate = true;
  return (geos[shape] = g);
}

const FONT = (s) => `800 ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "PingFang SC", "Noto Sans Thai", "Leelawadee UI", "Tahoma", system-ui, sans-serif`;
const isCJK = (s) => /^[぀-ヿ㐀-鿿가-힯\s]+$/.test(s);

// Largest font size (≤ max) at which `text` fits in maxW.
function fit(g, text, maxW, max, min = 16) {
  let size = max;
  g.font = FONT(size);
  while (g.measureText(text).width > maxW && size > min) g.font = FONT((size -= 2));
  return size;
}

// Splits text into at most n lines at spaces, as evenly as it can.
function wrap(text, n) {
  const words = text.split(/\s+/).filter(Boolean);
  if (n < 2 || words.length < 2) return [text];
  let best = [text], score = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const sc = Math.max(a.length, b.length);
    if (sc < score) { score = sc; best = [a, b]; }
  }
  return best;
}

// sub: a second, smaller line under the name (Itaewon signs: the name in the
// shop's own language on top, Korean below).
export function signTexture(text, bg, fg = '#ffffff', sub = '', shape = 'board') {
  const { w, h } = SIGN_SHAPES[shape];
  const c = document.createElement('canvas');
  const k = shape === 'board' ? 100 : 512 / Math.max(w, h); // px per metre
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height); // the geometry cuts the outline
  // The inner line, along the shape.
  const X = (x) => c.width / 2 + x * k, Y = (y) => c.height / 2 - y * k;
  g.beginPath();
  outline({
    moveTo: (x, y) => g.moveTo(X(x), Y(y)), lineTo: (x, y) => g.lineTo(X(x), Y(y)),
    quadraticCurveTo: (a, b, x, y) => g.quadraticCurveTo(X(a), Y(b), X(x), Y(y)),
    arc: (cx, cy, r, a0, a1, cw) => g.arc(X(cx), Y(cy), r * k, -a0, -a1, !cw),
  }, shape, 0.1);
  g.closePath();
  g.strokeStyle = 'rgba(255,255,255,0.65)';
  g.lineWidth = 5;
  g.stroke();
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  if (shape === 'tall') { // vertical: Korean stacks a letter per line, the rest turns sideways
    const main = text.replace(/\s+/g, '');
    if (isCJK(text) && main.length <= 7) {
      const lines = [...main];
      const cols = sub ? [[lines, 0.42], [[...sub.replace(/\s+/g, '')], 0.8]] : [[lines, 0.5]];
      for (const [chars, cx] of cols) {
        const step = Math.min((c.height - 70) / chars.length, c.width * (sub ? 0.42 : 0.66));
        g.font = FONT(Math.floor(step * (cx === 0.8 ? 0.6 : 0.88)));
        chars.forEach((ch, n) => g.fillText(ch, c.width * (sub ? cx - 0.1 : cx), c.height / 2 + (n - (chars.length - 1) / 2) * step + 3));
      }
    } else {
      g.save();
      g.translate(c.width / 2, c.height / 2);
      g.rotate(Math.PI / 2);
      const size = fit(g, text, c.height - 60, Math.floor(c.width * 0.5));
      g.font = FONT(size);
      g.fillText(text, 0, 3);
      g.restore();
    }
    return finish(c);
  }

  const box = TEXT_BOX[shape];
  if (!box) { // boards: one line, a smaller second line under it
    let size = sub ? c.height * 0.42 : c.height * 0.53;
    size = fit(g, text, c.width - 70, Math.floor(size), 22);
    if (!sub) g.fillText(text, c.width / 2, c.height / 2 + 3);
    else {
      g.fillText(text, c.width / 2, c.height * 0.4);
      fit(g, sub, c.width - 90, Math.floor(c.height * 0.25));
      g.globalAlpha = 0.9;
      g.fillText(sub, c.width / 2, c.height * 0.74);
      g.globalAlpha = 1;
    }
    return finish(c);
  }
  const [bx, by, bw, bh, maxLines] = box;
  const maxW = c.width * bw, maxH = c.height * bh;
  let lines = [text];
  let size = fit(g, text, maxW, Math.floor(maxH * (sub ? 0.5 : 0.62)));
  if (size < maxH * 0.34 && maxLines > 1) { // too small on one line: wrap
    const two = wrap(text, maxLines);
    if (two.length > 1) {
      lines = two;
      size = Math.min(...two.map((l) => fit(g, l, maxW, Math.floor(maxH * (sub ? 0.34 : 0.44)))));
    }
  }
  const subSize = sub ? Math.min(Math.floor(size * 0.6), fit(g, sub, maxW, Math.floor(size * 0.6))) : 0;
  const lineH = size * 1.08;
  const total = lines.length * lineH + (sub ? subSize * 1.2 : 0);
  let y = c.height * by - total / 2 + lineH / 2 + 3;
  g.font = FONT(size);
  for (const l of lines) { g.fillText(l, c.width * bx, y); y += lineH; }
  if (sub) {
    g.font = FONT(subSize);
    g.globalAlpha = 0.9;
    g.fillText(sub, c.width * bx, y - lineH / 2 + subSize * 0.75);
    g.globalAlpha = 1;
  }
  return finish(c);
}

function finish(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
