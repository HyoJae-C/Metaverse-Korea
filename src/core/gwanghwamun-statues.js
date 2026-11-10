// The two statues on Gwanghwamun Square, more detailed than the rest of the
// city (they are the square's whole point):
//   - King Sejong (2009, gilt bronze): seated on his throne, the right hand
//     raised, an open book (Hunminjeongeum) on his knee, the winged crown
//     (익선관) and the dragon robe (곤룡포). On a stepped granite base with
//     "세종대왕" on the front and the letters he made on its sides. In front:
//     the armillary sphere, the rain gauge and the sundial of his reign.
//   - Admiral Yi Sun-sin (1968, bronze): standing in armour with his long
//     sword in its scabbard in the right hand, on a tall pedestal with
//     bronze reliefs of his fleet. In front: the turtle ship.
// Loaded with import() by the "statue" landmark (core/landmarks.js), so it
// is not in the first download. Every plain part is baked into one mesh per
// statue (core/merge-static.js bakeColors): two or three draw calls each
// with the plaques, however many parts.
import * as THREE from 'three';
import { bakeColors } from './merge-static.js';
import { farFree } from './far-textures.js';

const mats = {};
const mat = (c, side = THREE.FrontSide) => (mats[c + side] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true, side }));

const STONE = '#cfc4ae', STONE_DARK = '#b3a78f', PLINTH = '#8f8a80', GRANITE = '#9c9488';
const G0 = '#e3c35f', G1 = '#cfa53c', G2 = '#b48c2e', G3 = '#8d6c24'; // gilt, light to dark
const B0 = '#6b786d', B1 = '#556157', B2 = '#434d46', B3 = '#323a35'; // bronze, light to dark

// --- small geometry helpers -------------------------------------------------
function add(g, geo, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, c?.isMaterial ? c : mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const box = (g, sx, sy, sz, x, y, z, c) => add(g, new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
// A box narrower at the top: bottom wb × db, top wt × dt, height h.
function taper(g, wb, db, wt, dt, h, x, y, z, c) {
  const geo = new THREE.BoxGeometry(1, h, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    p.setX(i, p.getX(i) * (top ? wt : wb));
    p.setZ(i, p.getZ(i) * (top ? dt : db));
  }
  return add(g, geo, c, x, y, z);
}
const cyl = (g, rt, rb, h, x, y, z, c, seg = 10) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z);
function ball(g, r, x, y, z, c, sx = 1, sy = 1, sz = 1, w = 10, hs = 7) {
  const m = add(g, new THREE.SphereGeometry(r, w, hs), c, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
const disc = (g, r, x, y, z, c, seg = 14) => { const m = cyl(g, r, r, 0.08, x, y, z, c, seg); m.rotation.x = Math.PI / 2; return m; };
const ring = (g, R, t, x, y, z, c, seg = 18) => add(g, new THREE.TorusGeometry(R, t, 4, seg), c, x, y, z);
// A limb from a to b ([x, y, z]), radius ra at a and rb at b.
const UP = new THREE.Vector3(0, 1, 0);
function limb(g, a, b, ra, rb, c, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = add(g, new THREE.CylinderGeometry(rb, ra, d.length(), seg), c);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// --- the letters of Hunminjeongeum, as raised strokes ------------------------
// In a unit square: [x0, y0, x1, y1] bars, ['d', x0, y0, x1, y1] slanted
// strokes, ['o', cx, cy, r] circles, ['.', cx, cy, r] dots.
const T = [0.12, 0.86, 0.88, 1], BOT = [0.12, 0, 0.88, 0.14], L = [0.12, 0, 0.26, 1], R = [0.74, 0, 0.88, 1];
const MID = [0.12, 0.43, 0.88, 0.57], TICK = [0.44, 0.88, 0.56, 1];
export const GLYPHS = {
  ㄱ: [T, [0.74, 0.1, 0.88, 1]],
  ㄴ: [[0.12, 0, 0.26, 0.92], BOT],
  ㄷ: [T, L, BOT],
  ㄹ: [T, [0.74, 0.5, 0.88, 1], MID, [0.12, 0, 0.26, 0.5], BOT],
  ㅁ: [T, BOT, L, R],
  ㅂ: [L, R, MID, BOT],
  ㅅ: [['d', 0.5, 1, 0.1, 0], ['d', 0.5, 0.58, 0.9, 0]],
  ㅇ: [['o', 0.5, 0.5, 0.38]],
  ㅈ: [T, ['d', 0.5, 0.9, 0.1, 0], ['d', 0.5, 0.5, 0.9, 0]],
  ㅊ: [TICK, [0.16, 0.74, 0.84, 0.86], ['d', 0.5, 0.78, 0.1, 0], ['d', 0.5, 0.42, 0.9, 0]],
  ㅋ: [T, [0.74, 0.1, 0.88, 1], MID],
  ㅌ: [T, MID, L, BOT],
  ㅍ: [[0.04, 0.86, 0.96, 1], [0.04, 0, 0.96, 0.14], [0.28, 0.14, 0.4, 0.86], [0.6, 0.14, 0.72, 0.86]],
  ㅎ: [TICK, [0.16, 0.72, 0.84, 0.84], ['o', 0.5, 0.32, 0.25]],
  'ㆍ': [['.', 0.5, 0.5, 0.2]],
  ㅡ: [[0, 0.43, 1, 0.57]],
  ㅣ: [[0.43, 0, 0.57, 1]],
};
// Raised letters on a wall: `place(u, v)` turns unit-square spots into a
// position, `turn` faces them out of the wall. s: size.
function letter(g, ch, s, place, turn, c) {
  const k = new THREE.Group(), t = 0.12 * s;
  for (const st of GLYPHS[ch]) {
    if (st[0] === 'd') {
      const [, x0, y0, x1, y1] = st, len = Math.hypot(x1 - x0, y1 - y0) * s;
      const m = box(k, t, len, 0.06, ((x0 + x1) / 2 - 0.5) * s, ((y0 + y1) / 2 - 0.5) * s, 0, c);
      m.rotation.z = Math.atan2(x0 - x1, y1 - y0);
    } else if (st[0] === 'o') ring(k, st[3] * s, t * 0.45, (st[1] - 0.5) * s, (st[2] - 0.5) * s, 0, c, 16);
    else if (st[0] === '.') disc(k, st[3] * s, (st[1] - 0.5) * s, (st[2] - 0.5) * s, 0, c, 12);
    else { const [x0, y0, x1, y1] = st; box(k, (x1 - x0) * s, (y1 - y0) * s, 0.06, ((x0 + x1) / 2 - 0.5) * s, ((y0 + y1) / 2 - 0.5) * s, 0, c); }
  }
  k.position.copy(place);
  k.rotation.y = turn;
  g.add(k);
}
// A row of letters on one face of a block (centre [x, y, z], facing angle
// `turn`: 0 is +z, π/2 is +x), `gap` apart.
function letterRow(g, chars, s, gap, [x, y, z], turn, c) {
  const right = new THREE.Vector3(Math.cos(turn), 0, -Math.sin(turn));
  chars.forEach((ch, i) => {
    const off = (i - (chars.length - 1) / 2) * gap;
    letter(g, ch, s, new THREE.Vector3(x, y, z).addScaledVector(right, off), turn, c);
  });
}

// --- canvas plaques ------------------------------------------------------------
function textPlane(w, h, cw, ch, draw, basic = false) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  draw(c.getContext('2d'), cw, ch);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  farFree(tex);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex }));
  m.userData.noShadow = true;
  return m;
}
const SERIF = '"Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Batang", serif';
const SANS = '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
// Carved letters: a darker stone face, gilt letters with a thin shadow.
function carve(x, text, font, cx, cy) {
  x.font = font;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillText(text, cx + 3, cy + 4);
  x.fillStyle = '#e6c463'; x.fillText(text, cx, cy);
}

export const STATUE_INFO = {
  king: {
    title: '세종대왕 동상 · King Sejong the Great',
    ko: ['조선의 제4대 왕 (1397–1450).', '1443년 백성이 쉽게 쓰는 글자 훈민정음(한글)을', '만들었어요. 측우기·해시계 같은 과학 기구도', '이때 만들어졌어요. 손에 든 책이 훈민정음이에요.'],
    en: ['4th king of Joseon. In 1443 he created Hangeul,', 'the Korean alphabet. In front: his armillary sphere,', 'rain gauge and sundial.'],
  },
  admiral: {
    title: '이순신 장군 동상 · Admiral Yi Sun-sin',
    ko: ['조선의 장군 (1545–1598). 임진왜란 때 바다에서', '23번 싸워 한 번도 지지 않았다고 전해져요.', '앞에 있는 배가 등에 쇠못을 박은 거북선이에요.', '광화문광장에서 남쪽 바다를 바라보고 서 있어요.'],
    en: ['Joseon admiral who led the navy in the Imjin War', '(1592–1598). In front: the armoured turtle ship.'],
  },
};
// The information stone in front: a title, Korean lines, English lines.
function infoStone(g, info, x, z, ry) {
  const s = new THREE.Group();
  box(s, 3.6, 0.4, 0.9, 0, 0.2, 0, PLINTH);
  box(s, 3.2, 2.2, 0.4, 0, 1.5, 0, STONE_DARK);
  box(s, 3.4, 0.16, 0.5, 0, 2.66, 0, PLINTH);
  const face = textPlane(2.9, 1.9, 768, 504, (x) => {
    x.fillStyle = '#2b2a28'; x.fillRect(0, 0, 768, 504);
    x.strokeStyle = '#c9a23a'; x.lineWidth = 6; x.strokeRect(10, 10, 748, 484);
    x.fillStyle = '#e8c56a'; x.textAlign = 'center'; x.textBaseline = 'top';
    x.font = `800 40px ${SANS}`;
    x.fillText(info.title, 384, 30);
    x.fillStyle = '#f4efe4'; x.font = `500 30px ${SANS}`;
    info.ko.forEach((line, i) => x.fillText(line, 384, 98 + i * 42));
    x.fillStyle = '#c9c2b4'; x.font = 'italic 24px sans-serif';
    info.en.forEach((line, i) => x.fillText(line, 384, 98 + info.ko.length * 42 + 20 + i * 32));
  }, true); // (lit like before, readable at night)
  face.position.set(0, 1.5, 0.21);
  s.add(face);
  s.position.set(x, 0, z);
  s.rotation.y = ry;
  g.add(s);
}

// --- King Sejong -----------------------------------------------------------------
function sejong(g) {
  // Granite base: two steps, a block with mouldings, the name on the front
  // and Hunminjeongeum's letters raised on the sides and back.
  box(g, 8.6, 0.35, 10.6, 0, 0.525, 0, STONE_DARK);
  box(g, 7.9, 0.2, 9.7, 0, 0.8, 0, PLINTH);
  box(g, 7.6, 2.3, 9.4, 0, 1.85, 0, STONE);
  box(g, 8.0, 0.22, 9.8, 0, 3.1, 0, STONE_DARK);
  box(g, 8.3, 0.2, 10.1, 0, 3.3, 0, PLINTH);
  for (const sx of [-1, 1]) {
    box(g, 0.06, 1.6, 7.6, sx * 3.82, 1.85, 0, GRANITE); // panel
    box(g, 0.1, 0.12, 7.8, sx * 3.84, 2.7, 0, STONE_DARK); // its frame
    box(g, 0.1, 0.12, 7.8, sx * 3.84, 1.0, 0, STONE_DARK);
    letterRow(g, sx > 0 ? ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ'] : ['ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'], 0.85, 1.05, [sx * 3.86, 1.85, 0], sx * Math.PI / 2, G2);
  }
  box(g, 5.6, 1.6, 0.06, 0, 1.85, -4.72, GRANITE);
  letterRow(g, ['ㆍ', 'ㅡ', 'ㅣ'], 1.0, 1.7, [0, 1.85, -4.76], Math.PI, G2); // heaven, earth, man: the vowels' roots
  box(g, 5.0, 1.55, 0.06, 0, 1.9, 4.72, '#5d5850'); // the name panel
  const name = textPlane(4.8, 1.4, 1024, 300, (x, w, h) => {
    x.fillStyle = '#5d5850'; x.fillRect(0, 0, w, h);
    carve(x, '세종대왕', `900 170px ${SERIF}`, w / 2, 128);
    x.globalAlpha = 0.85;
    carve(x, 'KING SEJONG THE GREAT  ·  1397 – 1450', `700 40px ${SERIF}`, w / 2, 254);
  });
  name.position.set(0, 1.9, 4.76);
  g.add(name);

  const y0 = 3.4;
  // The throne: a dais, the seat, a footstool, arm rests with scrolled ends
  // and a tall back with a cloud-shaped crest.
  box(g, 5.6, 0.3, 4.8, 0, y0 + 0.15, -0.1, G3);
  box(g, 4.6, 1.5, 3.4, 0, y0 + 1.05, -0.5, G2);
  box(g, 3.8, 0.9, 0.08, 0, y0 + 1.0, 1.24, G3); // carved front panel
  disc(g, 0.3, 0, y0 + 1.0, 1.3, G1, 10);
  box(g, 3.2, 0.35, 1.0, 0, y0 + 0.47, 1.75, G3); // footstool
  const back = new THREE.Shape();
  back.moveTo(-2.4, 0); back.lineTo(2.4, 0); back.lineTo(2.4, 3.3);
  back.quadraticCurveTo(2.5, 4.2, 1.2, 4.25); back.quadraticCurveTo(0.35, 4.3, 0, 4.9);
  back.quadraticCurveTo(-0.35, 4.3, -1.2, 4.25); back.quadraticCurveTo(-2.5, 4.2, -2.4, 3.3); back.closePath();
  const ext = { depth: 0.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1, curveSegments: 4 };
  add(g, new THREE.ExtrudeGeometry(back, ext), G2, 0, y0 + 1.8, -2.45);
  const inner = add(g, new THREE.ExtrudeGeometry(back, { ...ext, depth: 0.05 }), G3, 0, y0 + 2.15, -2.0);
  inner.scale.set(0.78, 0.78, 1);
  disc(g, 0.42, 0, y0 + 5.4, -1.98, G1, 14); // a sun on the crest
  for (const sx of [-1, 1]) {
    box(g, 0.45, 0.25, 2.9, sx * 2.15, y0 + 2.75, -0.6, G2);
    cyl(g, 0.17, 0.2, 0.95, sx * 2.15, y0 + 2.25, 0.7, G2, 8);
    const scroll = cyl(g, 0.24, 0.24, 0.5, sx * 2.15, y0 + 2.85, 0.85, G1, 10);
    scroll.rotation.z = Math.PI / 2;
  }

  // The king. Robe over the knees falling to the footstool, boots under the hem.
  taper(g, 3.1, 2.5, 3.0, 2.3, 0.85, 0, y0 + 2.25, -0.05, G1); // lap
  taper(g, 3.3, 0.95, 2.9, 0.75, 1.4, 0, y0 + 1.35, 1.3, G1); // robe front
  for (const sx of [-0.9, 0, 0.9]) box(g, 0.12, 1.3, 0.06, sx, y0 + 1.35, 1.72, G2); // folds
  for (const sx of [-1, 1]) ball(g, 0.36, sx * 0.6, y0 + 0.78, 1.9, G3, 1, 0.55, 1.4);
  // Body, shoulders, round collar, belt (옥대) worn low, the dragon roundels.
  taper(g, 2.7, 1.75, 2.4, 1.4, 2.3, 0, y0 + 3.25, -0.6, G1);
  ball(g, 1, 0, y0 + 4.35, -0.6, G1, 1.35, 0.55, 0.8, 12, 6);
  const collar = ring(g, 0.5, 0.11, 0, y0 + 4.72, -0.5, G2, 14);
  collar.rotation.x = Math.PI / 2 - 0.25;
  const belt = ring(g, 1.0, 0.1, 0, y0 + 2.85, -0.45, G3, 18);
  belt.rotation.x = Math.PI / 2 - 0.22; belt.scale.set(1.38, 1, 0.95);
  for (let i = -2; i <= 2; i++) box(g, 0.24, 0.24, 0.1, i * 0.42, y0 + 2.72 - Math.abs(i) * 0.04, 0.4 - Math.abs(i) * 0.08, G0);
  disc(g, 0.55, 0, y0 + 3.85, 0.2, G3).rotation.x = Math.PI / 2 - 0.08;
  disc(g, 0.38, 0, y0 + 3.85, 0.25, G0).rotation.x = Math.PI / 2 - 0.08;
  for (const sx of [-1, 1]) { const r = disc(g, 0.36, sx * 1.12, y0 + 4.5, -0.25, G3, 12); r.rotation.set(Math.PI / 2 - 0.6, 0, sx * -0.5); }
  // Right hand raised, palm forward; left hand holding the open book.
  limb(g, [1.2, y0 + 4.35, -0.6], [1.5, y0 + 3.15, -0.3], 0.45, 0.42, G1);
  limb(g, [1.5, y0 + 3.15, -0.3], [1.3, y0 + 3.75, 0.8], 0.42, 0.55, G1); // forearm in a wide sleeve
  taper(g, 0.25, 0.95, 0.7, 0.85, 0.9, 1.45, y0 + 2.75, 0.2, G2).rotation.x = -0.35; // the sleeve hanging
  const hand = new THREE.Group(); // palm open, fingers up, a little tilted
  ball(hand, 0.24, 0, 0, 0, G0, 0.9, 1, 0.42, 8, 6);
  for (let i = 0; i < 4; i++) box(hand, 0.08, 0.24 - Math.abs(i - 1.5) * 0.04, 0.09, -0.13 + i * 0.087, 0.3 - Math.abs(i - 1.5) * 0.02, 0, G0);
  box(hand, 0.08, 0.2, 0.09, -0.22, 0.04, 0.02, G0).rotation.z = 0.7; // thumb
  hand.position.set(1.32, y0 + 4.05, 1.0);
  hand.rotation.set(-0.3, -0.35, -0.1);
  g.add(hand);
  limb(g, [-1.2, y0 + 4.35, -0.6], [-1.5, y0 + 3.05, -0.25], 0.45, 0.42, G1);
  limb(g, [-1.5, y0 + 3.05, -0.25], [-0.85, y0 + 2.85, 0.75], 0.42, 0.55, G1);
  taper(g, 0.25, 0.9, 0.7, 0.85, 0.75, -1.5, y0 + 2.5, 0.25, G2).rotation.x = -0.3;
  ball(g, 0.22, -0.7, y0 + 2.9, 0.95, G0);
  const book = new THREE.Group();
  box(book, 1.5, 0.06, 1.05, 0, -0.06, 0, G3); // cover
  for (const sx of [-1, 1]) {
    const page = box(book, 0.7, 0.1, 0.95, sx * 0.37, 0, 0, '#ecd88f');
    page.rotation.z = sx * 0.12;
    for (let i = 0; i < 4; i++) box(book, 0.06, 0.02, 0.75, sx * (0.16 + i * 0.13), 0.06 + (0.16 + i * 0.13) * 0.12, 0, G2); // columns of writing
  }
  book.position.set(-0.45, y0 + 2.9, 0.95);
  book.rotation.set(-0.5, 0.25, 0.1);
  g.add(book);
  // Head: the face, a trimmed beard, the winged crown.
  cyl(g, 0.32, 0.38, 0.35, 0, y0 + 4.92, -0.55, G1, 8);
  ball(g, 0.7, 0, y0 + 5.55, -0.5, G1, 0.95, 1.08, 0.95, 14, 10);
  for (const sx of [-1, 1]) {
    ball(g, 0.16, sx * 0.67, y0 + 5.55, -0.55, G1, 0.5, 1, 0.8, 8, 6); // ears
    box(g, 0.28, 0.06, 0.08, sx * 0.25, y0 + 5.8, 0.12, G3).rotation.z = sx * 0.06; // brows
    box(g, 0.16, 0.05, 0.06, sx * 0.24, y0 + 5.68, 0.14, G3); // eyes
    box(g, 0.26, 0.07, 0.08, sx * 0.14, y0 + 5.33, 0.16, G2).rotation.z = sx * 0.3; // moustache
  }
  taper(g, 0.18, 0.2, 0.16, 0.22, 0.3, 0, y0 + 5.52, 0.18, G1); // nose
  taper(g, 0.14, 0.18, 0.5, 0.34, 0.55, 0, y0 + 5.0, 0.02, G2); // beard
  cyl(g, 0.74, 0.74, 0.3, 0, y0 + 6.08, -0.52, G3, 16); // crown band
  ball(g, 0.7, 0, y0 + 6.2, -0.45, G2, 1, 0.42, 0.95, 14, 6);
  cyl(g, 0.6, 0.68, 0.55, 0, y0 + 6.45, -0.78, G3, 14); // the high back part
  ball(g, 0.6, 0, y0 + 6.72, -0.78, G2, 1, 0.35, 0.85, 14, 6);
  for (const sx of [-1, 1]) {
    const wing = disc(g, 0.33, sx * 0.33, y0 + 7.02, -1.18, G2, 10);
    wing.scale.set(0.85, 1, 1.3); wing.rotation.z = sx * -0.25;
  }

  // His inventions in front, on low granite plinths: the rain gauge
  // (측우기), the armillary sphere (혼천의) and the sundial (앙부일구).
  const sci = new THREE.Group();
  sci.position.set(0, 0, 7.6);
  g.add(sci);
  box(sci, 1.2, 0.3, 1.2, -2.7, 0.15, 0, PLINTH);
  box(sci, 0.85, 0.7, 0.85, -2.7, 0.65, 0, STONE); // 측우대
  cyl(sci, 0.24, 0.24, 0.8, -2.7, 1.4, 0, B1, 12);
  for (const y of [1.12, 1.4, 1.68]) cyl(sci, 0.27, 0.27, 0.06, -2.7, y, 0, B3, 12);
  box(sci, 1.5, 0.3, 1.5, 0, 0.15, 0, PLINTH);
  for (const r of [0, Math.PI / 2]) { const leg = box(sci, 1.3, 0.12, 0.16, 0, 0.36, 0, B2); leg.rotation.y = r; }
  cyl(sci, 0.09, 0.14, 0.9, 0, 0.85, 0, B2, 8);
  const arm = new THREE.Group();
  arm.position.set(0, 1.85, 0);
  sci.add(arm);
  ring(arm, 0.72, 0.05, 0, 0, 0, B1, 22);
  ring(arm, 0.72, 0.05, 0, 0, 0, B1, 22).rotation.y = Math.PI / 2;
  ring(arm, 0.72, 0.05, 0, 0, 0, B0, 22).rotation.x = Math.PI / 2;
  ring(arm, 0.6, 0.04, 0, 0, 0, B0, 20).rotation.set(Math.PI / 2 - 0.41, 0, 0.3);
  ball(arm, 0.14, 0, 0, 0, B3, 1, 1, 1, 8, 6);
  limb(arm, [0, -0.85, -0.3], [0, 0.85, 0.3], 0.03, 0.03, B3, 5); // the polar axis
  box(sci, 1.2, 0.3, 1.2, 2.7, 0.15, 0, PLINTH);
  box(sci, 0.7, 0.6, 0.7, 2.7, 0.6, 0, STONE);
  for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) limb(sci, [2.7 + lx * 0.25, 0.9, lz * 0.25], [2.7 + lx * 0.42, 1.3, lz * 0.42], 0.04, 0.04, B2, 5);
  const bowl = add(sci, new THREE.SphereGeometry(0.55, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(B1, THREE.DoubleSide), 2.7, 1.55, 0);
  bowl.userData.bowl = true;
  ring(sci, 0.55, 0.04, 2.7, 1.55, 0, B3, 16).rotation.x = Math.PI / 2;
  limb(sci, [2.7, 1.05, -0.35], [2.7, 1.6, 0.42], 0.025, 0.025, B3, 4); // the gnomon
}

// --- Admiral Yi Sun-sin --------------------------------------------------------------
function relief(g, face, x, y, z, turn) {
  // A bronze panel with a ship of his fleet on the waves.
  const p = new THREE.Group();
  box(p, 3.7, 1.7, 0.1, 0, 0, 0, B2);
  box(p, 3.9, 0.14, 0.16, 0, 0.88, 0, B3); box(p, 3.9, 0.14, 0.16, 0, -0.88, 0, B3);
  for (let i = 0; i < 7; i++) { const w = cyl(p, 0.22, 0.22, 0.12, -1.5 + i * 0.5, -0.6, 0.06, B1, 8); w.rotation.x = Math.PI / 2; w.scale.set(1, 1, 0.6); }
  if (face === 'turtle') {
    ball(p, 0.9, 0, -0.15, 0.06, B0, 1.3, 0.35, 0.15, 10, 5);
    taper(p, 1.6, 0.12, 2.4, 0.12, 0.35, 0, -0.42, 0.08, B1);
    ball(p, 0.16, 1.3, -0.08, 0.1, B0, 1.2, 1, 0.5, 8, 5);
  } else {
    taper(p, 1.5, 0.12, 2.2, 0.12, 0.4, face === 'b' ? 0.3 : -0.3, -0.38, 0.08, B1);
    for (const sx of [-0.5, 0.25]) box(p, 0.6, 0.75, 0.06, (face === 'b' ? 0.3 : -0.3) + sx, 0.25, 0.1, B0); // sails
    for (let i = 0; i < 3; i++) box(p, 0.06, 0.5, 0.06, -1.6 + i * 0.12, -0.05, 0.1, B0); // banners on the shore
  }
  p.position.set(x, y, z);
  p.rotation.y = turn;
  g.add(p);
}
function admiralYi(g) {
  // A tall stepped pedestal: bronze reliefs round its lower block, a tapering
  // shaft with his title written down the front.
  box(g, 6.6, 0.5, 6.6, 0, 0.65, 0, STONE_DARK);
  box(g, 5.6, 0.4, 5.6, 0, 1.1, 0, STONE);
  box(g, 4.8, 2.4, 4.8, 0, 2.5, 0, STONE);
  relief(g, 'turtle', 0, 2.5, 2.42, 0);
  relief(g, 'a', 2.42, 2.5, 0, Math.PI / 2);
  relief(g, 'b', -2.42, 2.5, 0, -Math.PI / 2);
  relief(g, 'a', 0, 2.5, -2.42, Math.PI);
  box(g, 5.1, 0.3, 5.1, 0, 3.85, 0, STONE_DARK);
  taper(g, 3.8, 3.8, 3.3, 3.3, 5.2, 0, 6.6, 0, STONE);
  box(g, 4.0, 0.3, 4.0, 0, 9.35, 0, STONE_DARK);
  box(g, 3.7, 0.25, 3.7, 0, 9.62, 0, PLINTH);
  const title = textPlane(1.05, 4.2, 256, 1024, (x, w, h) => {
    x.fillStyle = '#5d5850'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#8a8070'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    [...'충무공이순신장군상'].forEach((ch, i) => carve(x, ch, `900 92px ${SERIF}`, w / 2, 70 + i * 110));
  });
  title.position.set(0, 6.6, 1.82);
  title.rotation.x = -0.05; // (the shaft leans in a little)
  g.add(title);

  const y0 = 9.75;
  // Boots apart, the long armoured skirt in rows of scales, split in front.
  for (const sx of [-1, 1]) {
    taper(g, 0.6, 0.95, 0.5, 0.7, 0.45, sx * 0.55, y0 + 0.22, 0.15, B3);
    limb(g, [sx * 0.55, y0 + 0.4, 0.05], [sx * 0.5, y0 + 1.6, 0], 0.28, 0.32, B2, 7);
  }
  const skirt = cyl(g, 1.0, 1.4, 2.2, 0, y0 + 2.3, 0, B1, 12);
  skirt.scale.z = 0.82;
  for (let i = 0; i < 5; i++) {
    const r = 1.04 + i * 0.085;
    const band = cyl(g, r, r + 0.03, 0.14, 0, y0 + 3.2 - i * 0.48, 0, i % 2 ? B2 : B0, 12);
    band.scale.z = 0.83;
  }
  box(g, 0.16, 2.1, 0.1, 0, y0 + 2.25, 1.0, B3); // the front split
  // Body armour with studs and two round breast mirrors, the belt, a long
  // battle robe falling behind.
  cyl(g, 1.22, 1.0, 1.9, 0, y0 + 4.2, 0, B1, 10).scale.z = 0.62;
  const front = (x, y) => Math.sqrt(Math.max(0, (1.0 + 0.22 * (y - 3.25) / 1.9) ** 2 - x * x)) * 0.6; // the chest's surface
  for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) if (r < 2 || Math.abs(c) !== 1) box(g, 0.08, 0.08, 0.08, c * 0.36, y0 + 3.55 + r * 0.36, front(c * 0.36, 3.55 + r * 0.36) + 0.02, B0); // studs
  for (const sx of [-1, 1]) {
    const z = front(0.4, 4.6) + 0.03;
    disc(g, 0.22, sx * 0.4, y0 + 4.6, z, B0, 12).rotation.set(Math.PI / 2, 0, sx * -0.5);
    ring(g, 0.22, 0.035, sx * 0.4, y0 + 4.6, z + 0.03, B3, 12).rotation.y = sx * 0.5;
  }
  const belt = ring(g, 1.0, 0.11, 0, y0 + 3.3, 0, B3, 16);
  belt.rotation.x = Math.PI / 2; belt.scale.set(1.12, 0.78, 1);
  box(g, 0.4, 0.3, 0.12, 0, y0 + 3.3, 0.8, B0); // buckle
  const robe = taper(g, 3.1, 0.2, 2.4, 0.16, 4.6, 0, y0 + 2.85, -0.82, B2);
  robe.rotation.x = 0.1;
  // Shoulder guards in layers, then the arms. The right hand holds the long
  // sword upright in its scabbard; the left hangs by his side.
  for (const sx of [-1, 1]) {
    ball(g, 0.58, sx * 1.25, y0 + 5.0, 0, B0, 1, 0.6, 1, 10, 6);
    taper(g, 0.95, 1.2, 0.8, 1.0, 0.35, sx * 1.4, y0 + 4.65, 0, B2).rotation.z = sx * 0.25;
  }
  limb(g, [1.3, y0 + 4.85, 0.05], [1.55, y0 + 3.95, 0.4], 0.32, 0.28, B1);
  limb(g, [1.55, y0 + 3.95, 0.4], [0.95, y0 + 3.85, 1.2], 0.28, 0.24, B1);
  cyl(g, 0.3, 0.3, 0.16, 1.55, y0 + 3.95, 0.4, B3, 8);
  ball(g, 0.24, 0.85, y0 + 3.85, 1.35, B0, 1, 1.1, 1, 8, 6); // fist round the grip
  limb(g, [-1.3, y0 + 4.85, 0.05], [-1.55, y0 + 3.9, 0.05], 0.32, 0.28, B1);
  limb(g, [-1.55, y0 + 3.9, 0.05], [-1.3, y0 + 3.15, 0.4], 0.28, 0.24, B1);
  ball(g, 0.22, -1.25, y0 + 3.05, 0.48, B0, 1, 1.1, 1, 8, 6);
  // The sword (장검): scabbard with metal bands, a round guard, a long grip.
  const sx = 0.85, sz = 1.38;
  cyl(g, 0.11, 0.13, 3.2, sx, y0 + 1.7, sz, B2, 6);
  for (const y of [0.25, 1.2, 2.3, 3.15]) cyl(g, 0.15, 0.15, 0.1, sx, y0 + y, sz, B0, 6);
  cyl(g, 0.3, 0.3, 0.07, sx, y0 + 3.36, sz, B0, 10); // guard
  cyl(g, 0.08, 0.09, 1.0, sx, y0 + 3.9, sz, B3, 6); // grip
  ball(g, 0.12, sx, y0 + 4.44, sz, B0, 1, 0.8, 1, 8, 5); // pommel
  // Head: the face with a full beard, the helmet with its brim, neck guard,
  // spike and tassel.
  cyl(g, 0.34, 0.4, 0.4, 0, y0 + 5.35, 0, B2, 8);
  ball(g, 0.62, 0, y0 + 5.9, 0.02, B1, 0.95, 1.08, 0.95, 14, 10);
  for (const s of [-1, 1]) {
    box(g, 0.26, 0.07, 0.08, s * 0.22, y0 + 6.08, 0.58, B3).rotation.z = s * 0.2; // stern brows
    box(g, 0.14, 0.05, 0.06, s * 0.22, y0 + 5.96, 0.6, B3);
    box(g, 0.24, 0.07, 0.08, s * 0.13, y0 + 5.68, 0.62, B2).rotation.z = s * 0.35;
  }
  taper(g, 0.16, 0.18, 0.14, 0.2, 0.28, 0, y0 + 5.84, 0.64, B1);
  taper(g, 0.16, 0.2, 0.55, 0.36, 0.6, 0, y0 + 5.32, 0.42, B2); // beard
  add(g, new THREE.SphereGeometry(0.7, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), B2, 0, y0 + 6.22, 0).scale.set(1, 0.9, 1);
  cyl(g, 0.86, 0.86, 0.08, 0, y0 + 6.22, 0, B3, 18); // brim
  taper(g, 1.5, 0.12, 1.3, 0.1, 0.8, 0, y0 + 5.8, -0.62, B2).rotation.x = 0.15; // neck guard
  for (const s of [-1, 1]) taper(g, 0.1, 0.6, 0.08, 0.5, 0.6, s * 0.68, y0 + 5.88, -0.28, B2).rotation.z = s * 0.12; // ear flaps
  cyl(g, 0.12, 0.2, 0.25, 0, y0 + 6.95, 0, B0, 8);
  cyl(g, 0.02, 0.06, 0.6, 0, y0 + 7.35, 0, B3, 6); // spike
  ball(g, 0.16, 0, y0 + 7.05, -0.12, B1, 1, 1.5, 1, 8, 5); // tassel

  // The turtle ship (거북선) in front: hull, gun ports, a spiked shell roof,
  // oars, the dragon head at the bow and a tail at the stern.
  const ship = new THREE.Group();
  ship.position.set(0, 0, 8.5);
  g.add(ship);
  box(ship, 4.6, 0.4, 9, 0, 0.2, 0, PLINTH);
  taper(ship, 2.8, 7.0, 3.6, 7.8, 0.9, 0, 0.85, 0, '#6b4a2e');
  box(ship, 3.8, 0.22, 8.0, 0, 1.4, 0, '#5a3d25');
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) box(ship, 0.05, 0.22, 0.3, s * 1.86, 1.1, -2.5 + i, '#2a1e14');
  ball(ship, 1.9, 0, 1.45, 0, B1, 1, 0.55, 2.0, 12, 6);
  for (let i = 0; i < 7; i++) for (const s of [-1, 0, 1]) cyl(ship, 0.02, 0.07, 0.35, s * 0.85, 2.38 - Math.abs(s) * 0.25, -3 + i, B3, 5);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const oar = box(ship, 0.08, 0.08, 1.4, s * 2.1, 0.75, -2.5 + i, '#5a3d25'); oar.rotation.z = s * 0.5; }
  limb(ship, [0, 1.5, 3.7], [0, 2.3, 4.6], 0.36, 0.3, B1, 8); // neck
  ball(ship, 0.5, 0, 2.45, 4.85, B1, 1, 0.85, 1.3, 10, 6); // dragon head
  for (const s of [-1, 1]) { ball(ship, 0.1, s * 0.28, 2.65, 5.2, '#d4a73a', 1, 1, 1, 6, 4); limb(ship, [s * 0.2, 2.8, 4.7], [s * 0.35, 3.25, 4.4], 0.06, 0.03, B3, 5); }
  box(ship, 0.45, 0.14, 0.5, 0, 2.2, 5.4, '#7d3b33'); // mouth
  limb(ship, [0, 1.6, -3.8], [0, 2.0, -4.5], 0.25, 0.1, B1, 6); // tail
}

// Called by the "statue" landmark with its group: builds the model, puts the
// information stone in front and bakes the plain parts into one mesh.
export function buildStatue(g, l) {
  if (l.kind === 'king') sejong(g);
  else admiralYi(g);
  const info = STATUE_INFO[l.kind];
  if (info) infoStone(g, info, l.kind === 'king' ? 5.5 : -5.5, l.kind === 'king' ? 6.5 : 11, l.kind === 'king' ? -0.35 : 0.35);
  bakeColors(g);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
}
