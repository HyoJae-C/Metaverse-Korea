// Another Land's gate where its bridge lands on the island: a candy castle.
// A gingerbread keep with icing piped along its battlements, a round tower
// in the middle under a pink cone, two smaller towers either side under mint
// and coral cones, a heart cookie over the way in, candy-cane posts round the
// archway the walk goes through, giant swirl lollipops on its front corners,
// and the park's name over the arch in raised icing letters, 어나더랜드 over
// ANOTHER LAND, front and back. At night its windows, the letters and the
// bulbs along its battlements light up (setNight).
// park-island.js places it (store.open.house) and bakes it with the rest of
// the island's still parts; what glows is one more mesh (`glow`).
import * as THREE from 'three';
import { bakeColors } from './merge-static.js';

const ICING = '#fffaf3', GINGER = '#f0b45e', DARK = '#9a5a2c', CHOC = '#6b3f2a', PINK = '#ff9cc0', HOT = '#ff5f9e', MINT = '#8fe3c7', TEAL = '#5fd0ad', CORAL = '#ff8a8a', LEMON = '#ffe27a', SUN = '#ffd23f', BISCUIT = '#e9c48a';
// Its size: 8.4 m across, 4.6 m deep, walls 4.2 m high, the middle tower's
// tip at about 11 m; the archway 3 m wide and 3.4 m high.
export const HOUSE = { w: 8.4, d: 4.6, wall: 4.2, ridge: 11, arch: 3, archH: 3.4 };
export const GATE_NAME = { ko: '어나더랜드', en: 'ANOTHER LAND' };

// Raised letters: the text drawn on a small canvas, then every run of inked
// pixels in a row turned into a box (rows with the same runs stacked into
// one), all in one geometry; each line's `g` (or `e`, for the edge) makes it bolder. `wide` is the width in metres; the result is
// centred on (0, 0) and faces +z, `depth` deep from z = 0. Null where there
// is no canvas to read (tests).
function raisedText(lines, wide, depth, grow = 'g') {
  const W = 400, H = 112, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  if (!g?.getImageData) return null;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#000'; g.strokeStyle = '#000'; g.lineJoin = 'round';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const l of lines) {
    g.font = `900 ${l.px}px "Arial Rounded MT Bold", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
    g.fillText(l.text, W / 2, l.y, W - 16);
    if (l[grow]) { g.lineWidth = l[grow]; g.strokeText(l.text, W / 2, l.y, W - 16); } // (each line its own boldness: g for the icing, e for the pink edge)
  }
  const px = g.getImageData(0, 0, W, H)?.data;
  if (!px) return null;
  const k = wide / W, geos = [];
  let open = new Map(); // "x0:x1" → first row of a stack of the same run
  const flush = (key, y0, y1) => {
    const [x0, x1] = key.split(':').map(Number);
    const b = new THREE.BoxGeometry((x1 - x0) * k, (y1 - y0) * k, depth);
    b.translate(((x0 + x1) / 2 - W / 2) * k, -(((y0 + y1) / 2) - H / 2) * k, depth / 2);
    geos.push(b);
  };
  for (let y = 0; y <= H; y++) {
    const runs = new Set();
    if (y < H) {
      let x0 = -1;
      for (let x = 0; x <= W; x++) {
        const on = x < W && px[(y * W + x) * 4 + 3] > 110;
        if (on && x0 < 0) x0 = x;
        if (!on && x0 >= 0) { runs.add(x0 + ':' + x); x0 = -1; }
      }
    }
    const next = new Map();
    for (const [key, y0] of open) if (runs.has(key)) next.set(key, y0); else flush(key, y0, y);
    for (const key of runs) if (!next.has(key)) next.set(key, y);
    open = next;
  }
  if (!geos.length) return null;
  return mergeAll(geos);
}
function mergeAll(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), idx = [];
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (const i of g.index.array) idx.push(i + o);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

// at: { x, z, ry } (its front, with the archway, faces -z: the bridge).
export function buildCandyHouse(scene, block, mat, at) {
  const { w, d, wall, arch, archH } = HOUSE;
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.z);
  g.rotation.y = at.ry || 0;
  scene.add(g);
  const lit = new THREE.Group(); // (what glows at night: one mesh in the end)
  g.add(lit);
  const part = (geo, c, x, y, z, to = g) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); to.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, c, to) => part(new THREE.BoxGeometry(sx, sy, sz), c, x, y, z, to);
  const ball = (r, x, y, z, c, to) => part(new THREE.SphereGeometry(r, 10, 8), c, x, y, z, to);
  const cyl = (rt, rb, h, x, y, z, c, seg = 16, to) => part(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, to);
  // Blocked ground, given in the castle's own metres.
  const c = Math.cos(at.ry || 0), s = Math.sin(at.ry || 0), turned = Math.abs(s) > 0.7;
  const solid = (lx, lz, sx, sz) => block(at.x + lx * c + lz * s, at.z - lx * s + lz * c, turned ? sz : sx, turned ? sx : sz);

  // An arched window: lemon panes (lit at night) in a chocolate frame, on
  // the face at z looking out along `out` (±1).
  const win = (x, y, z, out, ww = 1.1, wh = 1.1) => {
    box(ww, wh, 0.05, x, y, z + out * 0.02, LEMON, lit);
    const top = part(new THREE.CylinderGeometry(ww / 2, ww / 2, 0.05, 14, 1, false, -Math.PI / 2, Math.PI), LEMON, x, y + wh / 2, z + out * 0.02, lit);
    top.rotation.x = Math.PI / 2;
    for (const [fw, fh, fx, fy] of [[ww + 0.16, 0.12, 0, -wh / 2], [0.1, wh, 0, 0], [ww, 0.08, 0, 0.05], [0.12, wh, -ww / 2 - 0.02, 0], [0.12, wh, ww / 2 + 0.02, 0]]) box(fw, fh, 0.08, x + fx, y + fy, z + out * 0.05, CHOC);
    part(new THREE.TorusGeometry(ww / 2 + 0.02, 0.06, 5, 14, Math.PI), CHOC, x, y + wh / 2, z + out * 0.05);
  };
  // A row of battlements (merlons) along x at height y, on the face at z.
  const battlements = (x0, x1, y, z, depth = 0.5) => {
    const n = Math.max(2, Math.round((x1 - x0) / 0.75));
    for (let i = 0; i <= n; i += 2) box(Math.min(0.45, (x1 - x0) / n), 0.42, depth, x0 + ((x1 - x0) * i) / n, y + 0.21, z, ICING);
    box(x1 - x0 + 0.2, 0.2, depth + 0.06, (x0 + x1) / 2, y - 0.1, z, ICING); // the band under them
  };
  // A tower: a gingerbread drum, a chocolate band with icing scallops on
  // it, a cone and a ball on top; the cone's foot hung with little bulbs.
  const tower = (x, z, r, y0, h, cone, cap, coneH) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    g.add(t);
    const tp = (geo, col, px, py, pz, to = t) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(px, py, pz); to.add(m); return m; };
    tp(new THREE.CylinderGeometry(r, r, h, 20), GINGER, 0, y0 + h / 2, 0);
    tp(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.32, 20), DARK, 0, y0 + h - 0.16, 0);
    tp(new THREE.CylinderGeometry(r + 0.22, r + 0.22, 0.2, 20), ICING, 0, y0 + h + 0.1, 0);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; tp(new THREE.SphereGeometry(0.17, 8, 6), ICING, Math.sin(a) * (r + 0.18), y0 + h - 0.08 - (i % 2) * 0.1, Math.cos(a) * (r + 0.18)); }
    tp(new THREE.ConeGeometry(r + 0.32, coneH, 20), cone, 0, y0 + h + 0.2 + coneH / 2, 0);
    tp(new THREE.SphereGeometry(Math.max(0.26, r * 0.26), 12, 10), cap, 0, y0 + h + 0.2 + coneH + 0.18, 0);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; tp(new THREE.SphereGeometry(0.07, 6, 4), SUN, x + Math.sin(a) * (r + 0.3), y0 + h + 0.26, z + Math.cos(a) * (r + 0.3), lit); } // (lit isn't in the tower: its own metres)
    return t;
  };

  // ── The keep: gingerbread either side of the archway and over it, on a
  // chocolate plinth, its walls 4.2 m high under battlements of icing.
  const side = (w - arch) / 2, sx = arch / 2 + side / 2;
  for (const k of [-1, 1]) {
    box(side, wall, d, k * sx, wall / 2, 0, GINGER);
    box(side + 0.2, 0.45, d + 0.2, k * sx, 0.22, 0, DARK);
    for (const z of [-1, 1]) win(k * sx, 1.9, z * (d / 2 + 0.02), z, 1.2, 1.0); // a window each side, front and back
    for (let i = 0; i < 3; i++) solid(k * sx, -d / 2 + d / 6 + (i * d) / 3, side, d / 3 + 0.1);
  }
  box(arch, wall - archH, d, 0, (wall + archH) / 2, 0, GINGER); // over the way through
  box(arch, 0.05, d, 0, archH - 0.02, 0, CHOC); // (its ceiling)
  for (const z of [-1, 1]) {
    battlements(-w / 2, w / 2, wall, z * (d / 2 - 0.25));
    for (let i = 0; i < 22; i++) { const x = -w / 2 + 0.2 + (i * (w - 0.4)) / 21; if (Math.abs(x) > 2.2) ball(0.07, x, wall - 0.32, z * (d / 2 + 0.09), SUN, lit); } // bulbs along the top (but behind the name)
  }
  for (const k of [-1, 1]) for (let i = 0; i <= 4; i += 2) box(0.5, 0.42, 0.45, k * (w / 2 - 0.25), wall + 0.21, -d / 2 + 0.4 + (i * (d - 0.8)) / 4, ICING);
  for (const k of [-1, 1]) for (const z of [-1, 1]) ball(0.36, k * (w / 2 - 0.2), wall + 0.75, z * (d / 2 - 0.25), k * z > 0 ? HOT : PINK); // candy balls on the corners

  // ── The middle: a raised gable of gingerbread over the arch, piped round
  // its edge, with a heart cookie in it (front and back), and the round
  // tower behind it under the pink cone.
  const gable = new THREE.Shape();
  gable.moveTo(-2.4, 0); gable.lineTo(2.4, 0); gable.lineTo(2.4, 0.5); gable.lineTo(0, 2.1); gable.lineTo(-2.4, 0.5); gable.closePath();
  const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.4, bevelEnabled: false });
  for (const z of [-1, 1]) {
    part(gGeo, GINGER, 0, wall, z < 0 ? -d / 2 - 0.05 : d / 2 - 0.35);
    const zf = z * (d / 2 + 0.12);
    for (const sg of [-1, 1]) { const e = box(Math.hypot(2.4, 1.6) + 0.1, 0.24, 0.16, sg * 1.2, wall + 1.3, zf, ICING); e.rotation.z = -sg * Math.atan2(1.6, 2.4); }
    // The heart cookie: a scalloped biscuit with icing round it and a pink heart.
    const cookie = part(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 20), BISCUIT, 0, wall + 1.05, zf + z * 0.04);
    cookie.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ball(0.13, Math.sin(a) * 0.72, wall + 1.05 + Math.cos(a) * 0.72, zf + z * 0.04, BISCUIT); }
    part(new THREE.TorusGeometry(0.58, 0.05, 5, 20), ICING, 0, wall + 1.05, zf + z * 0.12);
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.38); hs.bezierCurveTo(-0.5, 0.0, -0.36, 0.38, 0, 0.18); hs.bezierCurveTo(0.36, 0.38, 0.5, 0.0, 0, -0.38);
    const heart = part(new THREE.ExtrudeGeometry(hs, { depth: 0.12, bevelEnabled: false }), HOT, 0, wall + 1.05, zf + z * 0.1);
    if (z < 0) heart.rotation.y = Math.PI;
  }
  tower(0, 0.5, 1.45, wall, 3.2, PINK, SUN, 3.1);
  for (const z of [-1, 1]) win(0, wall + 2.3, 0.5 + z * 1.47, z, 0.75, 0.75);
  tower(3.15, 0.45, 0.95, wall, 1.9, MINT, TEAL, 2.1);
  tower(-3.15, 0.45, 0.95, wall, 1.9, CORAL, HOT, 2.1);
  for (const x of [3.15, -3.15]) for (const z of [-1, 1]) win(x, wall + 1.05, 0.45 + z * 0.97, z, 0.5, 0.5);

  // ── The archway: candy-cane posts with their hooks curling in, front and back.
  for (const z of [-1, 1]) {
    const zf = z * (d / 2 + 0.18);
    for (const k of [-1, 1]) {
      const x = k * (arch / 2 - 0.05);
      for (let i = 0; i < 6; i++) cyl(0.15, 0.15, archH / 6, x, (i * archH) / 6, zf, i % 2 ? ICING : HOT, 10);
      part(new THREE.TorusGeometry(0.34, 0.15, 8, 12, Math.PI), HOT, x + k * 0.34, archH, zf); // (curling out, clear of the name)
    }
  }
  // ── Giant swirl lollipops on the keep's front corners (and its back ones).
  for (const z of [-1, 1]) for (const k of [-1, 1]) {
    const col = k > 0 ? MINT : PINK, x = k * (w / 2 + 0.05), zf = z * (d / 2 + 0.15), y = 3.0;
    const disc = part(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 22), ICING, x, y, zf);
    disc.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) part(new THREE.TorusGeometry(0.2 + i * 0.25, 0.09, 5, 20), col, x, y, zf + z * 0.11);
  }

  // ── The name over the arch in raised icing letters on a raised pink
  // outline, front and back: 어나더랜드 over ANOTHER LAND.
  const lines = [{ text: GATE_NAME.ko, px: 66, y: 42, g: 4, e: 15 }, { text: GATE_NAME.en, px: 32, y: 93, g: 0, e: 8 }];
  const words = raisedText(lines, 3.4, 0.16, 'g'), edge = raisedText(lines, 3.4, 0.1, 'e'); // (the icing a little bolder than the font, the pink edge round it)
  for (const z of [-1, 1]) {
    const zf = z * (d / 2 + 0.03), y = archH + 0.55;
    if (edge) { const m = part(edge, HOT, 0, y, zf); if (z < 0) m.rotation.y = Math.PI; }
    if (words) { const m = part(words, ICING, 0, y, zf + z * 0.06, lit); if (z < 0) m.rotation.y = Math.PI; }
  }

  // What glows at night, baked into one mesh with a light of its own.
  bakeColors(lit);
  const glowMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: '#ffe7b0', emissiveIntensity: 0.05 });
  lit.traverse((o) => { if (o.isMesh) o.material = glowMat; });
  const glow = lit.children.filter((o) => o.isMesh);
  const setNight = (k) => { glowMat.emissiveIntensity = 0.05 + 0.85 * k; };
  return { group: g, glow, setNight, sign: { draw() {} }, boards: [] };
}
