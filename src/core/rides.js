// Rides from the bike shop, drawn from a spec { type, tier, color, pattern }
// (see bike-garage.js): bikes, skateboards, inline skates and kick scooters.
// Tier 0 is the plain one, tier 1 adds a few sporty touches, tier 2 a little
// glow; each step is easy to tell apart without being loud. Front is +z,
// wheels on the ground (y = 0), sized for our ~1 m tall characters.
import * as THREE from 'three';
import { drawPatternTile } from './ride-patterns.js';

const DARK = '#2b2f36';
const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const glow = (c) => (mats['glow' + c] ||= new THREE.MeshBasicMaterial({ color: c }));

// Patterns drawn on a small tile (the shapes, not emoji, so they look the
// same everywhere). Hangul: a few jamo scattered across the tile.
const JAMO = ['ㄱ', 'ㄴ', 'ㅎ', 'ㅏ', 'ㅗ', 'ㅅ', 'ㅇ', 'ㅣ'];
function drawMotif(g, pattern, x, y, r, ink) {
  g.fillStyle = ink;
  g.strokeStyle = ink;
  if (pattern === 'flower') {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffe066';
    g.beginPath(); g.arc(x, y, r * 0.32, 0, Math.PI * 2); g.fill();
  } else if (pattern === 'bolt') {
    g.beginPath();
    g.moveTo(x + r * 0.2, y - r); g.lineTo(x - r * 0.5, y + r * 0.1); g.lineTo(x, y + r * 0.1);
    g.lineTo(x - r * 0.2, y + r); g.lineTo(x + r * 0.5, y - r * 0.1); g.lineTo(x, y - r * 0.1);
    g.closePath(); g.fill();
  } else if (pattern === 'heart') {
    g.beginPath();
    g.moveTo(x, y + r * 0.8);
    g.bezierCurveTo(x - r * 1.2, y - r * 0.1, x - r * 0.5, y - r, x, y - r * 0.35);
    g.bezierCurveTo(x + r * 0.5, y - r, x + r * 1.2, y - r * 0.1, x, y + r * 0.8);
    g.fill();
  } else if (pattern === 'star') {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? r * 0.42 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  } else if (pattern === 'hangul') {
    g.font = `900 ${Math.round(r * 2)}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(JAMO[(Math.abs(Math.round(x * 7 + y * 13))) % JAMO.length], x, y);
  }
}
// Light or dark ink, whichever stands out on the colour.
function inkFor(hex) {
  const c = new THREE.Color(hex);
  return c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.6 ? 'rgba(40,40,60,0.75)' : 'rgba(255,255,255,0.85)';
}
const skins = new Map();
export function skinMaterial(color, pattern) {
  if (!pattern || typeof document === 'undefined') return mat(color);
  const key = color + pattern;
  if (skins.has(key)) return skins.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  const ink = inkFor(color);
  if (!drawPatternTile(g, pattern, ink, color)) for (const [x, y, r] of [[32, 34, 20], [96, 30, 15], [64, 80, 17], [20, 104, 13], [104, 104, 19]]) drawMotif(g, pattern, x, y, r, ink);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshLambertMaterial({ map: tex });
  skins.set(key, m);
  return m;
}

// A darker or lighter shade of a colour, for trims.
const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

// Box UVs in metres, so a pattern keeps the same size on a thin tube and a
// wide deck (faces: +x -x +y -y +z -z, 4 corners each).
const TILE = 0.26; // metres per pattern tile
function worldUV(geo, sx, sy, sz) {
  const uv = geo.attributes.uv;
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] / TILE, uv.getY(i) * dims[f][1] / TILE);
  }
  return geo;
}
function boxer(g) {
  return (sx, sy, sz, x, y, z, m, rx = 0) => {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    if (m.map) worldUV(geo, sx, sy, sz);
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    b.rotation.x = rx;
    g.add(b);
    return b;
  };
}
function wheel(g, r, w, x, y, z, m) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2), m);
  c.position.set(x, y, z);
  g.add(c);
  return c;
}

// Bike: tier 0 is the familiar shop bike with a basket; tier 1 drops the
// basket for a bottle and coloured rims; tier 2 has deep dark rims with a
// colour stripe, a racing saddle and a small red tail light.
function makeBikeRide({ tier, color, pattern }) {
  const g = new THREE.Group();
  const frame = skinMaterial(color, pattern);
  const box = boxer(g);
  const rimGeo = new THREE.TorusGeometry(0.27, tier === 2 ? 0.06 : 0.045, 6, 18).rotateY(Math.PI / 2);
  for (const z of [-0.48, 0.48]) {
    const w = new THREE.Mesh(rimGeo, mat(DARK));
    w.position.set(0, 0.3, z);
    g.add(w);
    if (tier >= 1) { // a coloured inner rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(tier === 2 ? 0.2 : 0.22, 0.018, 6, 18).rotateY(Math.PI / 2), mat(tier === 2 ? color : shade(color, 1.2)));
      rim.position.set(0, 0.3, z);
      g.add(rim);
    }
  }
  box(0.06, tier === 2 ? 0.085 : 0.06, 0.8, 0, 0.5, 0, frame); // top tube
  box(0.06, 0.45, 0.06, 0, 0.42, -0.2, frame, 0.25); // seat tube
  box(0.06, 0.55, 0.06, 0, 0.55, 0.45, frame, -0.25); // fork
  box(tier === 2 ? 0.12 : 0.2, 0.06, 0.28, 0, 0.64, -0.24, mat(DARK)); // seat
  box(0.55, 0.05, 0.05, 0, 0.86, 0.5, mat(DARK)); // handlebar
  if (tier === 0) box(0.3, 0.16, 0.22, 0, 0.72, 0.62, mat('#ffffff')); // basket
  if (tier >= 1) box(0.05, 0.14, 0.05, 0, 0.47, 0.12, mat(tier === 2 ? '#e9eef2' : '#5fd0ff')); // water bottle
  if (tier >= 1) for (const s of [-1, 1]) box(0.05, 0.05, 0.09, s * 0.25, 0.86, 0.54, mat(shade(color, 0.7))); // grips
  if (tier === 2) box(0.07, 0.05, 0.03, 0, 0.58, -0.42, glow('#ff4040')); // tail light
  g.userData.pose = 'bike';
  return g;
}

// Skateboard: a deck with kicked-up tails. Tier 1: coloured wheels and a
// stripe of grip; tier 2: a longer longboard with a soft underglow.
function makeSkate({ tier, color, pattern }) {
  const g = new THREE.Group();
  const box = boxer(g);
  const len = tier === 2 ? 0.92 : 0.76, wid = tier === 2 ? 0.25 : 0.22, y = 0.1;
  const deck = skinMaterial(color, pattern);
  box(wid, 0.03, len, 0, y, 0, deck);
  for (const s of [-1, 1]) box(wid, 0.03, 0.12, 0, y + 0.03, s * (len / 2 + 0.04), deck, s * 0.45); // tails
  box(wid * 0.5, 0.006, len - 0.16, 0, y + 0.018, 0, mat('#2a2a2e')); // grip tape
  if (tier >= 1) box(0.05, 0.007, len - 0.1, 0, y + 0.02, 0, mat(shade(color, 1.25))); // stripe
  const wm = tier >= 1 ? mat(tier === 2 ? '#ffd93d' : '#ff8fc7') : mat('#f0ece2');
  for (const z of [-len * 0.33, len * 0.33]) {
    box(wid * 0.7, 0.025, 0.05, 0, y - 0.03, z, mat('#b8bcc4')); // truck
    for (const s of [-1, 1]) wheel(g, tier === 2 ? 0.042 : 0.035, 0.04, s * wid * 0.42, tier === 2 ? 0.042 : 0.035, z, wm);
  }
  if (tier === 2) {
    const under = new THREE.Mesh(new THREE.PlaneGeometry(wid * 0.8, len * 0.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
    under.position.y = 0.012;
    g.add(under);
  }
  g.userData.pose = 'board';
  g.userData.stand = y + 0.015;
  return g;
}

// Kick scooter: a deck, a stem and a T-bar. Tier 1: a front light and
// coloured grips; tier 2: a wider deck with an LED strip and fat wheels.
function makeKick({ tier, color, pattern }) {
  const g = new THREE.Group();
  const box = boxer(g);
  const body = skinMaterial(color, pattern);
  const wid = tier === 2 ? 0.17 : 0.14, y = 0.09, r = tier === 2 ? 0.07 : 0.06;
  box(wid, 0.035, 0.6, 0, y, -0.02, body); // deck
  box(wid * 0.45, 0.006, 0.44, 0, y + 0.02, -0.04, mat('#2a2a2e')); // grip
  wheel(g, r, 0.04, 0, r, -0.36, mat(tier >= 1 ? shade(color, 0.6) : DARK));
  wheel(g, r, 0.04, 0, r, 0.33, mat(tier >= 1 ? shade(color, 0.6) : DARK));
  box(0.04, 0.42, 0.04, 0, 0.31, 0.3, body, -0.12); // stem
  box(0.36, 0.035, 0.035, 0, 0.51, 0.28, mat(DARK)); // T-bar
  const grip = mat(tier >= 1 ? shade(color, 1.3) : '#3a3d44');
  for (const s of [-1, 1]) box(0.07, 0.04, 0.04, s * 0.16, 0.51, 0.28, grip);
  if (tier >= 1) box(0.06, 0.04, 0.03, 0, 0.42, 0.33, glow('#fff6c8')); // front light
  if (tier === 2) box(wid * 0.8, 0.01, 0.5, 0, y - 0.022, -0.02, glow(shade(color, 1.4))); // LED strip
  g.userData.pose = 'board';
  g.userData.stand = y + 0.02;
  return g;
}

// One inline skate, centred on the foot: a boot, the frame and four wheels
// in a line. Tier 1: coloured cuff and wheels; tier 2: a sleek low boot,
// silver frame and glowing wheels.
export function makeSkate1({ tier, color, pattern }) {
  const g = new THREE.Group();
  const box = boxer(g);
  const boot = skinMaterial(color, pattern);
  box(0.1, 0.07, 0.17, 0, 0.075, 0.01, boot); // boot
  box(0.105, 0.03, 0.08, 0, 0.12, -0.04, tier >= 1 ? mat(shade(color, 1.35)) : mat('#e9e4da')); // cuff
  box(0.03, 0.025, 0.2, 0, 0.032, 0.01, mat(tier === 2 ? '#d7dde2' : DARK)); // frame
  const wm = tier === 2 ? glow(shade(color, 1.5)) : mat(tier === 1 ? shade(color, 0.75) : '#3a3d44');
  for (let k = 0; k < 4; k++) wheel(g, 0.024, 0.025, 0, 0.024, -0.07 + k * 0.05, wm);
  return g;
}
export const SKATE_LIFT = 0.05; // how much skates lift you

export function makeRide(spec) {
  if (spec.type === 'skate') return makeSkate(spec);
  if (spec.type === 'kick') return makeKick(spec);
  if (spec.type === 'inline') { const g = new THREE.Group(); g.userData.pose = 'skates'; return g; } // the skates go on the feet
  return makeBikeRide(spec);
}
