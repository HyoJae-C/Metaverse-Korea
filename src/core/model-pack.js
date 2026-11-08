// Loads the active character model pack (src/data/characters) and puts a
// model on a character: one GLB load per model (shared by every player),
// a skeleton clone per character, and an AnimationMixer driven by our action
// names (idle, walk, run, sit, ride and the emotes).
import * as THREE from 'three';
import { FOLK_DANCES, folkHandProps } from './folk-dance.js';
import { SNOW_MOVES } from './snow-moves.js';
import { STUDIO_MOVES } from './studio-moves.js';
import { listenPose } from './headphones.js';
import { PUNGMUL_HANDS } from './pungmul-props.js';
import { SKATE_LIFT, RIDE_CLEAR } from './rides.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PACK } from '../data/characters/index.js';
import { PALETTES, accessory, shapeOf } from '../data/appearance.js';
import { buildHair, buildLips, isScalpHair, EYE_TRANSFORM } from './hair-styles.js';
import { buildOutfit } from './outfit-mesh.js';
import { addSkirt } from './skirt-mesh.js';
import { skirtById } from '../data/skirts.js';

// Kick scooter and inline skate strokes, added to the idle clip per bone
// (radians). pose(t, a): t the stroke phase, a 0 standing … 1 moving.
// rate: strokes per second, kept slow whatever the speed so skating reads as
// long glides rather than running.
const STRIDE = {
  kick: {
    rate: 0.8,
    pose(t, a) {
      // sin: the kicking foot from forward (-) to pushed back (+); it pushes
      // along the ground on the way back and lifts, knee bent, to come forward.
      const s = Math.sin(t), push = Math.max(0, Math.cos(t)), back = Math.max(0, -Math.cos(t));
      return {
        spine: [0.2, 0, 0], head: [-0.1, 0, 0],
        upperarml: [-1.05, 0, 0.12], upperarmr: [-1.05, 0, -0.12], lowerarml: [-0.3, 0, 0], lowerarmr: [-0.3, 0, 0],
        // the standing leg bends as the other one reaches down to the ground
        upperlegl: [-a * (0.1 + 0.25 * push), 0, 0], lowerlegl: [a * (0.2 + 0.5 * push), 0, 0], footl: [-a * (0.1 + 0.25 * push), 0, 0],
        upperlegr: [a * (0.15 + 0.6 * s), 0, 0.15 * a], lowerlegr: [a * (0.05 + 1.0 * back), 0, 0],
        y: -a * (0.015 + 0.05 * push),
      };
    },
  },
  board: {
    rate: 1 / 3.2, // one push every few seconds, gliding in between
    pose(t, a) {
      // u: where we are in the cycle. The first PUSH of it is one kick of the
      // back foot along the ground (like the scooter); then both feet on the
      // board, knees soft, arms out a little for balance.
      const PUSH = 0.32, u = (t / (Math.PI * 2)) % 1;
      const k = u < PUSH ? (u / PUSH) * Math.PI * 2 : 0, w = u < PUSH ? Math.sin((u / PUSH) * Math.PI) : 0;
      const s = -Math.cos(k), push = w * Math.max(0, Math.sin(k)), back = w * Math.max(0, -Math.sin(k));
      const glide = a * (1 - w);
      return {
        spine: [a * (0.08 + 0.12 * w), 0, 0],
        upperarml: [0, 0, -0.35 * glide], upperarmr: [0, 0, 0.35 * glide],
        upperlegl: [-a * (0.15 + 0.2 * push), 0, 0], lowerlegl: [a * (0.3 + 0.45 * push), 0, 0], footl: [-a * (0.15 + 0.25 * push), 0, 0],
        upperlegr: [a * (-0.15 * (1 - w) + w * (0.15 + 0.55 * s)), 0, 0.15 * a * w], lowerlegr: [a * (0.3 * (1 - w) + w * (0.05 + 0.9 * back)), 0, 0],
        footr: [-0.15 * glide, 0, 0],
        y: -a * (0.03 + 0.04 * push),
      };
    },
  },
  skates: {
    rate: 0.5,
    pose(t, a) {
      const s = Math.sin(t), pl = Math.max(0, s), pr = Math.max(0, -s); // which leg is pushing out
      const c = 0.5 * a; // knees bent
      const leg = (p, side) => ({ // side: -1 left, 1 right (z out)
        up: [-c + 0.55 * a * p, 0, side * 0.6 * a * p], low: [c * 1.7 - 0.5 * a * p, 0, 0], foot: [-c * 0.7, 0, 0],
      });
      const L = leg(pl, -1), R = leg(pr, 1);
      return {
        spine: [0.35 * a, 0.15 * a * s, 0],
        head: [-0.2 * a, -0.12 * a * s, 0],
        upperarml: [0.6 * a * s, 0, 0], upperarmr: [-0.6 * a * s, 0, 0],
        upperlegl: L.up, lowerlegl: L.low, footl: L.foot,
        upperlegr: R.up, lowerlegr: R.low, footr: R.foot,
        y: -0.05 * a,
      };
    },
  },
};

const LIE_MAT = { y: 0.16, z: 0.6 }; // lying on a picnic mat on the grass
const SIT_MAT = { y: 0.02, z: 0 }; // sitting on a picnic mat (the floor-sitting clip)
export const MODEL_IDS = Object.keys(PACK.models);
const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const loader = new GLTFLoader();
const cache = new Map();
// Clip files: the pack's animFiles (several files, one shared rig), or the
// clips inside one model's own file (animsFrom). Eager files are awaited
// before the model shows; the rest add their clips when they arrive.
const clips = new Map(); // clip name -> AnimationClip
let animsReady = null;
function loadAnims() {
  if (animsReady) return animsReady;
  const add = (g) => { for (const c of g?.animations || []) if (!clips.has(c.name)) clips.set(c.name, c); return g; };
  const files = PACK.animFiles || [{ model: PACK.animsFrom, eager: true }];
  const jobs = files.map((f) => (f.model ? load(f.model) : loader.loadAsync(BASE + f.url).catch(() => null)).then(add));
  const eager = jobs.filter((_, i) => files[i].eager);
  animsReady = Promise.all(eager).then((r) => r.every(Boolean));
  return animsReady;
}
function load(id) {
  if (!cache.has(id)) {
    // A failed load resolves to null and the character keeps its chibi body.
    const def = PACK.models[id];
    cache.set(id, loader.loadAsync(BASE + def.url)
      .then((g) => { if (def.recolor) recolor(g, def.recolor); if (def.wear) applyWear(g, def.wear); if (def.wear?.outfit) buildOutfit(g, def.wear.outfit, wearUv); return g; })
      .catch(() => null));
  }
  return cache.get(id);
}

// Everyday clothes on the adventurer models. Each model's texture is an
// 8×4 atlas of flat colour cells, and every part of the mesh points at one
// cell. A wear rule moves a part onto a cell of the unused bottom row, which
// dyedMaterial paints per look: the top in the T-shirt colour, the bottom in
// the trousers colour, plus the outfit's own fixed colours (shoes, accents).
// Moving a part to the skin cell bares it (short sleeves). The cell's
// light-to-dark shading is kept because only the cell changes, not the spot
// inside it.
//   wear: { rules: [[mesh, 'col,row', role, min?, max?, axis?], ...], colors: { role: 0xrrggbb } }
//   mesh: a regex source matched against the mesh name. min/max split a part
//   along the mesh's own axis (-1..1): 'y' (default) up the body or leg, to
//   cut a boot into trouser leg and shoe; 'hand' along an arm, 1 at the hand.
//   The first matching rule wins. Roles: top, bottom, shoes, accent,
//   accent2, accent3, skin (bared), cut (that part folded away), and hide
//   (with cell '*': the whole mesh).
export const WEAR_CELLS = { top: [0, 3], bottom: [1, 3], shoes: [2, 3], accent: [3, 3], accent2: [4, 3], accent3: [5, 3], sole: [6, 3], stitch: [7, 3], skin: null, hide: null, cut: null };
// The centre of the atlas cell a role is painted on (for outfit meshes).
function wearUv(role) {
  const A = PACK.atlas;
  const [cx, cy] = role === 'skin' ? A.skin : WEAR_CELLS[role] || WEAR_CELLS.top;
  return [(cx + 0.5) / A.cols, (cy + 0.5) / A.rows];
}
function applyWear(gltf, wear) {
  const A = PACK.atlas;
  const rules = wear.rules.map(([mesh, cell, role, min = -Infinity, max = Infinity, axis = 'y']) => ({ mesh: new RegExp(mesh, 'i'), cell, role, min, max, axis }));
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mine = rules.filter((r) => r.mesh.test(o.name));
    if (!mine.length) return;
    if (mine.some((r) => r.cell === '*' && r.role === 'hide')) { o.userData.wearHidden = true; return; }
    // One triangle, one cell: unshare the vertices so a split can't smear.
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (mine.some((r) => r.role === 'cut')) geo.setAttribute('position', geo.attributes.position.clone());
    const pos = geo.attributes.position;
    const uvSrc = geo.attributes.uv;
    const uv = new THREE.Float32BufferAttribute(uvSrc.count * 2, 2);
    for (let i = 0; i < uvSrc.count; i++) uv.setXY(i, uvSrc.getX(i), uvSrc.getY(i));
    for (let t = 0; t < pos.count; t += 3) {
      const u = (uv.getX(t) + uv.getX(t + 1) + uv.getX(t + 2)) / 3;
      const v = (uv.getY(t) + uv.getY(t + 1) + uv.getY(t + 2)) / 3;
      const cx = Math.floor(u * A.cols), cy = Math.floor(v * A.rows);
      const y = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
      const hand = ((pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3) * (/right/i.test(o.name) ? -1 : 1);
      const r = mine.find((q) => {
        const at = q.axis === 'hand' ? hand : y;
        return (q.cell === '*' || q.cell === cx + ',' + cy) && at >= q.min && at < q.max;
      });
      if (!r) continue;
      if (r.role === 'cut') { // fold the triangle away (furs, pouches)
        for (let k = t + 1; k < t + 3; k++) pos.setXYZ(k, pos.getX(t), pos.getY(t), pos.getZ(t));
        continue;
      }
      const to = r.role === 'skin' ? A.skin : WEAR_CELLS[r.role];
      if (!to) continue;
      for (let k = t; k < t + 3; k++) {
        const fu = uv.getX(k) * A.cols - cx, fv = uv.getY(k) * A.rows - cy;
        uv.setXY(k, (to[0] + Math.min(0.98, Math.max(0.02, fu))) / A.cols, (to[1] + Math.min(0.98, Math.max(0.02, fv))) / A.rows);
      }
    }
    geo.setAttribute('uv', uv);
    o.geometry = geo;
  });
}

// Repaints one colour family in the model's texture atlas, e.g. the hooded
// rogue's green outfit to black for the ninja. Runs once per loaded model.
// rule: { hue: [from, to] degrees, sat: min saturation, to: '#rrggbb' }
function recolor(gltf, rule) {
  gltf.scene.traverse((o) => {
    const mat = o.material;
    if (!o.isMesh || !mat?.map?.image || mat.userData.recolored) return;
    const img = mat.map.image;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    const target = new THREE.Color(rule.to);
    const hsl = {};
    const col = new THREE.Color();
    for (let i = 0; i < px.length; i += 4) {
      col.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
      col.getHSL(hsl);
      const h = hsl.h * 360;
      if (h < rule.hue[0] || h > rule.hue[1] || hsl.s < rule.sat) continue;
      const k = 0.55 + hsl.l * 0.9; // keep the atlas's light-to-dark gradient
      px[i] = Math.min(255, target.r * 255 * k);
      px[i + 1] = Math.min(255, target.g * 255 * k);
      px[i + 2] = Math.min(255, target.b * 255 * k);
    }
    g.putImageData(data, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.flipY = mat.map.flipY;
    tex.colorSpace = mat.map.colorSpace;
    tex.magFilter = mat.map.magFilter;
    tex.minFilter = mat.map.minFilter;
    mat.map = tex;
    mat.userData.recolored = true;
    mat.needsUpdate = true;
  });
}

// Hair dye, eye colour and skin tone (hair salon, clinic): a copy of the
// model's material whose atlas has those cells repainted, keeping each cell's
// light-to-dark shading. One copy per model and combination, shared.
const SMALL_HEAD = 0.88;
const BIG_HEAD = 1.12;
// Hanging from the gym's pull-up bar: the body is moved so both hands sit on
// the bar (2.05 m, minus its radius) whatever the arms are doing.
const PULLUP = { hang: 0.5, bar: 2.03 };
// Dumbbell curls: extra rotation (radians) on the upper arm and the forearm at the top of a curl.
const CURL = { foreL: [0, 0, -2], foreR: [0, 0, 2] };
const _hv = new THREE.Vector3(), _hv2 = new THREE.Vector3(), _hv3 = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
// The bench press bar: a long bar with a plate at each end, along its y axis.
function makeBarbell() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 8), new THREE.MeshLambertMaterial({ color: '#c9ced3' })));
  for (const y of [-0.6, 0.6]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 18), new THREE.MeshLambertMaterial({ color: '#2b2b2e' }));
    plate.position.y = y;
    g.add(plate);
  }
  return g;
}
// A small dumbbell for curls, held in each hand (hand bones scale things up 1.8x).
// Hairdresser's scissors, held in the right hand while snipping.
function makeScissors() {
  const g = new THREE.Group();
  const steel = new THREE.MeshLambertMaterial({ color: '#d7dde2' });
  for (const a of [-0.25, 0.25]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.006), steel);
    blade.position.y = 0.06;
    blade.rotation.z = a;
    g.add(blade);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), new THREE.MeshLambertMaterial({ color: '#e0566b' }));
  ring.position.y = -0.015;
  g.add(ring);
  g.scale.setScalar(0.8);
  return g;
}
function makeDumbbell() {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: '#3a3d44' });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), new THREE.MeshLambertMaterial({ color: '#9aa1a8' }));
  g.add(grip);
  for (const y of [-0.075, 0.075]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.045, 12), metal);
    plate.position.y = y;
    g.add(plate);
  }
  g.scale.setScalar(0.8);
  return g;
}
const dyed = new Map();
export const DYE_SIZE = 256; // px, the longer side of a dyed colour atlas
function dyedMaterial(id, src, look) {
  const A = PACK.atlas;
  const paint = [['hair', PALETTES.dye[look.dye]], ['eyes', PALETTES.eyes[look.eyes]], ['skin', PALETTES.skin[look.tone]]]
    .filter(([cell, c]) => A?.[cell] && c != null);
  const shirtRule = PACK.models[id]?.shirt;
  const shirt = shirtRule && PALETTES.shirt[look.shirt];
  const wear = PACK.models[id]?.wear;
  if (wear) { // everyday clothes: the top, bottom, shoes and accent cells
    const c = wear.colors || {};
    const top = c.top ?? PALETTES.shirt[look.shirt] ?? PALETTES.shirt.coral;
    const bottom = c.bottom ?? PALETTES.pants[look.pants] ?? PALETTES.pants.denim;
    for (const [role, cell] of Object.entries(WEAR_CELLS)) {
      if (!cell) continue;
      const hex = role === 'top' ? top : role === 'bottom' ? bottom : role === 'shoes' ? PALETTES.shoes[look.shoes] ?? c.shoes : c[role];
      if (hex != null) paint.push([cell, hex]);
    }
  }
  // Under a skirt the legs are bare: the trousers cells take the skin's.
  const bareLegs = !!(wear?.outfit && skirtById(look.skirt));
  if (!paint.length && shirt == null) return null;
  const key = [id, look.dye, look.eyes, look.tone, shirt || wear ? look.shirt : '', wear ? look.pants : '', wear ? look.shoes : '', bareLegs ? 'legs' : ''].join('|');
  if (dyed.has(key)) return dyed.get(key);
  let base = null;
  src.scene.traverse((o) => { if (!base && o.isMesh && o.material?.map?.image) base = o.material; });
  if (!base) return null;
  const img = base.map.image;
  // The atlas is flat colour bands (8x4 cells of soft vertical gradients), so
  // a small copy looks the same. Full size (1024x1024) cost 4 MB per dyed
  // look, ~400 MB with a street of passers-by: past iPhone Safari's canvas
  // memory limit, the city went blank and the page was closed.
  const c = document.createElement('canvas');
  const f = Math.min(1, DYE_SIZE / Math.max(img.width, img.height));
  c.width = Math.max(A.cols, Math.round(img.width * f)); c.height = Math.max(A.rows, Math.round(img.height * f));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, c.width, c.height);
  const cw = c.width / A.cols, ch = c.height / A.rows;
  const col = new THREE.Color(), hsl = {}, target = new THREE.Color();
  if (shirt != null) { // plain clothes: the outfit's colour family becomes the T-shirt colour
    const data = g.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    target.set(shirt);
    for (let i = 0; i < px.length; i += 4) {
      col.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
      col.getHSL(hsl);
      const h = hsl.h * 360;
      if (h < shirtRule.hue[0] || h > shirtRule.hue[1] || hsl.s < shirtRule.sat) continue;
      const k = 0.6 + hsl.l * 0.8;
      px[i] = Math.min(255, target.r * 255 * k);
      px[i + 1] = Math.min(255, target.g * 255 * k);
      px[i + 2] = Math.min(255, target.b * 255 * k);
    }
    g.putImageData(data, 0, 0);
  }
  for (const [cell, hex] of paint) {
    const [cx, cy] = Array.isArray(cell) ? cell : A[cell];
    const data = g.getImageData(cx * cw, cy * ch, cw, ch);
    const px = data.data;
    let mean = 0;
    for (let i = 0; i < px.length; i += 4) { col.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255); mean += col.getHSL(hsl).l; }
    mean /= px.length / 4;
    target.set(hex);
    for (let i = 0; i < px.length; i += 4) {
      col.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
      const k = Math.min(1.3, Math.max(0.55, 1 + (col.getHSL(hsl).l - mean) * 1.4));
      px[i] = Math.min(255, target.r * 255 * k);
      px[i + 1] = Math.min(255, target.g * 255 * k);
      px[i + 2] = Math.min(255, target.b * 255 * k);
    }
    g.putImageData(data, cx * cw, cy * ch);
  }
  if (bareLegs) {
    const [sx, sy] = A.skin, [bx, by] = WEAR_CELLS.bottom;
    g.putImageData(g.getImageData(sx * cw, sy * ch, cw, ch), bx * cw, by * ch);
  }
  const tex = new THREE.CanvasTexture(c);
  for (const k of ['flipY', 'colorSpace', 'magFilter', 'minFilter', 'wrapS', 'wrapT']) tex[k] = base.map[k];
  const m = base.clone();
  m.map = tex;
  dyed.set(key, m);
  return m;
}

// Hairstyle and lip tint on the model's head (core/hair-styles.js). The
// head's scalp hair is hidden (brows and beards stay), and the new hair and
// lips ride on the head bone. Eye shapes reshape the head's own eyes.
const headInfo = new Map(); // model id -> { ey, mouth, bald }
function headFacts(id, geo) {
  if (headInfo.has(id)) return headInfo.get(id);
  const A = PACK.atlas;
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const cell = (i) => [Math.floor(uv.getX(i) * A.cols), Math.floor(uv.getY(i) * A.rows)];
  const is = (i, c) => { const [x, y] = cell(i); return x === c[0] && y === c[1]; };
  let ey = 0, ne = 0;
  for (let i = 0; i < pos.count; i++) if (is(i, A.eyes)) { ey += pos.getY(i); ne++; }
  ey = ne ? ey / ne : 0;
  // The mouth: the darker band of the skin cell, front and below the eyes.
  const mouth = new THREE.Vector3();
  let nm = 0, front = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(x) < 0.15 && Math.abs(y - (ey - 0.36)) < 0.1) front = Math.max(front, z);
    if (Math.abs(x) < 0.2 && y < ey - 0.15 && y > ey - 0.7 && z > 0.55 && is(i, A.skin) && (uv.getY(i) * A.rows) % 1 > 0.78) { mouth.x += x; mouth.y += y; mouth.z = Math.max(mouth.z, z); nm++; }
  }
  if (nm) { mouth.x = 0; mouth.y /= nm; } else mouth.set(0, ey - 0.36, Number.isFinite(front) ? front : 0.8);
  // The head without its scalp hair.
  const idx = geo.index;
  const keep = [];
  const tri = (k) => idx ? idx.getX(k) : k;
  const n = idx ? idx.count : pos.count;
  for (let k = 0; k < n; k += 3) {
    const a = tri(k), b = tri(k + 1), c = tri(k + 2);
    const hair = is(a, A.hair) && is(b, A.hair) && is(c, A.hair);
    if (hair && isScalpHair((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3, ey)) continue;
    keep.push(a, b, c);
  }
  const bald = new THREE.BufferGeometry();
  for (const [k, attr] of Object.entries(geo.attributes)) bald.setAttribute(k, attr);
  bald.setIndex(keep);
  bald.boundingBox = geo.boundingBox;
  bald.boundingSphere = geo.boundingSphere;
  const eyes = [];
  for (let i = 0; i < pos.count; i++) if (is(i, A.eyes)) eyes.push(i);
  const info = { ey, mouth, bald, eyes, shaped: new Map() };
  headInfo.set(id, info);
  return info;
}
// The head with its eyes reshaped (clinics): each eye scaled and tilted
// round its own centre, in the face plane.
function shapedHead(facts, geo, shape, key) {
  const tf = EYE_TRANSFORM[shape];
  if (!tf) return geo;
  if (facts.shaped.has(key)) return facts.shaped.get(key);
  const src = geo.attributes.position;
  const pos = src.clone();
  for (const side of [-1, 1]) {
    const ids = facts.eyes.filter((i) => Math.sign(src.getX(i)) === side);
    if (!ids.length) continue;
    let cx = 0, cy = 0;
    for (const i of ids) { cx += src.getX(i); cy += src.getY(i); }
    cx /= ids.length; cy /= ids.length;
    const a = tf.tilt * side, c = Math.cos(a), sn = Math.sin(a);
    for (const i of ids) {
      const dx = (src.getX(i) - cx) * tf.sx, dy = (src.getY(i) - cy) * tf.sy;
      pos.setXYZ(i, cx + dx * c - dy * sn, cy + dx * sn + dy * c, src.getZ(i) + tf.dz);
    }
  }
  const out = new THREE.BufferGeometry();
  for (const [k, attr] of Object.entries(geo.attributes)) out.setAttribute(k, k === 'position' ? pos : attr);
  out.setIndex(geo.index);
  out.boundingBox = geo.boundingBox;
  out.boundingSphere = geo.boundingSphere;
  facts.shaped.set(key, out);
  return out;
}
const LIP_FWD = 0.035;
// Swimming (Olympic Park Pool): the body tips forward about the feet onto
// the water (tilt), lifted and pulled back so the middle stays on the spot;
// rate: strokes per second-ish; head: how far it lifts to look ahead.
const SWIM_POSE = { tilt: 1.35, lift: 0.74, back: 0.5, rate: 6.5, head: 0.5 };
// Sitting in a tube on the water (the chair clip, raised to the tube).
const TUBE_SIT = { y: 0.3, z: 0.05 };
function faceExtras(id, headMesh, headBone, look) {
  const A = PACK.atlas;
  const facts = headFacts(id, headMesh.geometry); // the model's own head
  // Head-mesh units -> head-bone space, from the skin's bind pose (exact
  // whatever pose the model was exported in).
  const extras = new THREE.Group();
  const bi = headMesh.skeleton?.bones.indexOf(headBone) ?? -1;
  if (bi >= 0) extras.matrix.multiplyMatrices(headMesh.skeleton.boneInverses[bi], headMesh.bindMatrix);
  else extras.matrix.copy(headBone.matrixWorld).invert().multiply(headMesh.matrixWorld);
  extras.matrix.decompose(extras.position, extras.quaternion, extras.scale);
  const material = Array.isArray(headMesh.material) ? headMesh.material[0] : headMesh.material;
  let geo = headMesh.geometry;
  const hair = look.hairStyle && !PACK.models[id]?.hood ? buildHair(look.hairStyle, material, A, facts.ey) : null;
  if (hair) geo = facts.bald;
  if (look.eyeShape) geo = shapedHead(facts, geo, look.eyeShape, (hair ? 'bald|' : '') + look.eyeShape);
  headMesh.geometry = geo;
  if (hair) extras.add(hair); // (the head is whole under its hair: no gap to fill)
  if (look.lip && PALETTES.lip[look.lip] != null) {
    extras.add(buildLips(PALETTES.lip[look.lip], facts.mouth.clone().add(new THREE.Vector3(0, 0, LIP_FWD - 0.04))));
  }
  headBone.add(extras);
  return hair;
}

// Hats (core/character.js addHat) are sized for the model's own head, so a
// big salon style (curly, afro, pompadour, mohawk, spikes...) poked through
// them. Under a hat the hair is tucked in: every point of it above the
// hat's lower edge and outside the crown is pulled back inside, so the hair
// still shows below the hat but not through it. In the head accessory
// group's units (a chibi head, radius ~0.33): c the crown's centre, r its
// radii, y0 the height above which hair is tucked.
const HAT_CROWNS = {
  cap: { c: [0, 0.05, -0.01], r: [0.33, 0.33, 0.33], y0: 0.11 },
  beanie: { c: [0, 0.04, -0.01], r: [0.34, 0.34, 0.34], y0: 0.08 },
  towel: { c: [0, 0.04, -0.01], r: [0.35, 0.35, 0.35], y0: 0.11 },
  bucket: { c: [0, 0.1, -0.02], r: [0.28, 0.28, 0.28], y0: 0.21 },
  beret: { c: [0.04, 0.24, -0.02], r: [0.36, 0.14, 0.36], y0: 0.2 },
};
const TUCK = 0.94; // how far inside the crown the hair goes
const TUCK_BAND = 0.14, TUCK_BULGE = 0.5; // below the edge: over what height, and how far out
const _tm = new THREE.Matrix4(), _ti = new THREE.Matrix4(), _tp = new THREE.Vector3();
function tuckHair(hair, headAcc, look) {
  const crown = HAT_CROWNS[shapeOf(accessory('head', look.head))];
  if (!hair || !crown) return;
  const { c, r, y0 } = crown;
  headAcc.updateMatrix();
  const toAcc = new THREE.Matrix4().copy(headAcc.matrix).invert(); // head bone -> hat space
  hair.parent.updateMatrix();
  hair.updateMatrix();
  for (const mesh of hair.children) {
    if (!mesh.isMesh) continue;
    mesh.updateMatrix();
    _tm.copy(toAcc).multiply(hair.parent.matrix).multiply(hair.matrix).multiply(mesh.matrix);
    _ti.copy(_tm).invert();
    const geo = mesh.geometry.clone();
    const pos = geo.attributes.position;
    let moved = false;
    for (let i = 0; i < pos.count; i++) {
      _tp.fromBufferAttribute(pos, i).applyMatrix4(_tm);
      // Fully inside above the edge; just under it the hair may bulge out
      // more and more (pressed flat by the hat), with no step at the edge.
      const below = (y0 - _tp.y) / TUCK_BAND;
      if (below >= 1) continue;
      const limit = TUCK + Math.max(0, below) * TUCK_BULGE;
      const dx = (_tp.x - c[0]) / r[0], dy = (_tp.y - c[1]) / r[1], dz = (_tp.z - c[2]) / r[2];
      const d = Math.hypot(dx, dy, dz);
      if (d <= limit) continue;
      const k = limit / d;
      _tp.set(c[0] + (_tp.x - c[0]) * k, c[1] + (_tp.y - c[1]) * k, c[2] + (_tp.z - c[2]) * k).applyMatrix4(_ti);
      pos.setXYZ(i, _tp.x, _tp.y, _tp.z);
      moved = true;
    }
    if (!moved) continue;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    mesh.geometry = geo;
  }
}

// The primitive chibi's head is ~0.65 m wide with its centre at the head
// group's origin. Accessories were made for those proportions.
const CHIBI_HEAD_W = 0.65, CHIBI_HEAD_D = 0.62;
const CHIBI_BODY_W = 0.42, CHIBI_BODY_D = 0.36, CHIBI_SHOULDER = 0.66;
const v = new THREE.Vector3();

// The beat dancers follow: () => { beat, phase } (the club's music), or null
// for a steady 120 bpm.
let beatSource = null;
export const setBeat = (fn) => { beatSource = fn; };
function beatNow() {
  const p = beatSource?.();
  if (p) return p;
  const s = performance.now() / 500;
  return { beat: Math.floor(s), phase: s % 1, energy: 0.7 };
}
// A little dance on top of the idle clip: a new move every 2 bars. Values are
// radians added per bone. Upper arms: -x swings the arm forward and up (to
// -2.8, overhead); y swings it out to the side (-y left, +y right).
const DANCE_MOVES = [
  (ph) => { // bounce with arm pumps
    const pump = Math.sin(ph * Math.PI * 2);
    return { bob: Math.abs(Math.sin(ph * Math.PI)) * 0.06, spine: [0.12 * Math.abs(pump), 0, 0], head: [0.18 * Math.abs(pump), 0, 0], armL: [-1.0 - 0.5 * pump, 0, 0], armR: [-1.0 + 0.5 * pump, 0, 0], foreL: [-1.2, 0, 0], foreR: [-1.2, 0, 0] };
  },
  (ph, b) => { // side to side, arms out
    const side = (b % 2 ? 1 : -1) * Math.sin(ph * Math.PI);
    return { bob: Math.abs(Math.sin(ph * Math.PI)) * 0.04, turn: side * 0.35, spine: [0, 0, 0.18 * side], head: [0, 0, -0.12 * side], armL: [-0.4, -1.0 + 0.4 * side, 0], armR: [-0.4, 1.0 + 0.4 * side, 0], foreL: [-0.5, 0, 0], foreR: [-0.5, 0, 0] };
  },
  (ph, b) => { // hands up!
    const w = Math.sin((b % 2 + ph) * Math.PI);
    return { bob: Math.abs(Math.sin(ph * Math.PI)) * 0.07, spine: [-0.08, 0, 0.1 * w], head: [-0.15, 0, 0], armL: [-2.8 + 0.2 * w, -0.3, 0], armR: [-2.8 - 0.2 * w, 0.3, 0] };
  },
  (ph, b) => { // the point: one arm up, then the other
    const r = b % 2 === 0;
    const k = Math.sin(ph * Math.PI);
    return { bob: k * 0.05, turn: (r ? -1 : 1) * 0.25, head: [0.1 * k, 0, 0], armL: r ? [-0.3, 0, 0] : [-2.6, -0.4, 0], armR: r ? [-2.6, 0.4, 0] : [-0.3, 0, 0], foreL: r ? [-1.0, 0, 0] : [0, 0, 0], foreR: r ? [0, 0, 0] : [-1.0, 0, 0] };
  },
];

// K-pop choreography for the busking dancers: sharper moves on the beat,
// a new one every bar (4 beats), the same for everyone in the group so they
// dance in unison. KPOP for the girl group, KPOP_B (heavier) for the boys.
const hit = (ph) => Math.pow(Math.sin(Math.min(1, ph * 1.6) * Math.PI / 2), 0.6); // snaps in, holds
const KPOP_ACTS = new Set(['kpop', 'kpopb', 'strum']);
const KPOP = [
  (ph, b) => { // point and hip: arm shoots up on 1 and 3
    const r = b % 2 === 0, k = hit(ph);
    return { bob: Math.abs(Math.sin(ph * Math.PI)) * 0.05, turn: (r ? 0.3 : -0.3), spine: [0, 0, (r ? -0.14 : 0.14) * k], head: [0, 0, (r ? 0.1 : -0.1)], armR: r ? [-2.7 * k, 0.3, 0] : [-0.2, 0.5, 0], armL: r ? [-0.2, -0.5, 0] : [-2.7 * k, -0.3, 0], foreL: [-0.6, 0, 0], foreR: [-0.6, 0, 0], legL: [r ? 0 : -0.3 * k, 0, 0], legR: [r ? -0.3 * k : 0, 0, 0] };
  },
  (ph, b) => { // hand hearts over the head, swaying
    const s = (b % 2 ? 1 : -1) * Math.sin(ph * Math.PI);
    return { bob: Math.abs(Math.sin(ph * Math.PI)) * 0.04, spine: [0, 0, 0.12 * s], head: [0, 0, -0.1 * s], armL: [-2.5, -0.6, 0], armR: [-2.5, 0.6, 0], foreL: [-1.5, 0, 0], foreR: [-1.5, 0, 0] };
  },
  (ph, b) => { // body wave, arms rolling forward
    const w = Math.sin((ph + b % 2) * Math.PI);
    return { bob: 0.04 + w * 0.04, spine: [0.25 * w, 0, 0], head: [-0.2 * w, 0, 0], armL: [-1.3 - 0.6 * w, -0.2, 0], armR: [-1.3 + 0.6 * w, 0.2, 0], foreL: [-0.8, 0, 0], foreR: [-0.8, 0, 0], kneeL: [0.3 * Math.max(0, w), 0, 0], kneeR: [0.3 * Math.max(0, w), 0, 0] };
  },
  (ph, b) => { // shoulder shimmy with a step to the side
    const side = b % 2 ? 1 : -1, sh = Math.sin(ph * Math.PI * 4);
    return { bob: Math.abs(sh) * 0.025, turn: side * 0.2, spine: [0, 0.15 * sh, 0], armL: [-0.5, -0.9 + 0.15 * sh, 0], armR: [-0.5, 0.9 + 0.15 * sh, 0], foreL: [-1.6, 0, 0], foreR: [-1.6, 0, 0], legL: [0, 0, side < 0 ? -0.25 : 0], legR: [0, 0, side > 0 ? 0.25 : 0] };
  },
];
const KPOP_B = [
  (ph, b) => { // power hits: both fists punch down on the beat
    const k = hit(ph);
    return { bob: -0.06 * k, spine: [0.2 * k, 0, 0], head: [0.15 * k, 0, 0], armL: [-0.6 + 0.4 * k, -0.7, 0], armR: [-0.6 + 0.4 * k, 0.7, 0], foreL: [-1.4 * (1 - k), 0, 0], foreR: [-1.4 * (1 - k), 0, 0], kneeL: [0.4 * k, 0, 0], kneeR: [0.4 * k, 0, 0], legL: [-0.25 * k, 0, 0], legR: [-0.25 * k, 0, 0] };
  },
  (ph, b) => { // arm sweep across the chest, turning
    const r = b % 2 === 0, k = hit(ph);
    return { bob: 0.03, turn: (r ? -0.45 : 0.45) * k, spine: [0, (r ? -0.25 : 0.25) * k, 0], armR: r ? [-1.5, 0.4 - 1.3 * k, 0] : [-0.3, 0.3, 0], armL: r ? [-0.3, -0.3, 0] : [-1.5, -0.4 + 1.3 * k, 0], foreL: [-0.3, 0, 0], foreR: [-0.3, 0, 0] };
  },
  (ph, b) => { // the bounce: knees and shoulders, one hand at the cap
    const k = Math.abs(Math.sin(ph * Math.PI));
    return { bob: -0.05 * k, spine: [0.12 * k, 0, 0], head: [0.2 * k, 0, 0], armR: [-2.6, 0.5, 0], foreR: [-1.9, 0, 0], armL: [-0.4, -0.6, 0], foreL: [-0.9 * k, 0, 0], kneeL: [0.35 * k, 0, 0], kneeR: [0.35 * k, 0, 0], legL: [-0.2 * k, 0, 0], legR: [-0.2 * k, 0, 0] };
  },
  (ph, b) => { // pointing out at the crowd, left then right
    const r = b % 2 === 0, k = hit(ph);
    return { bob: Math.abs(Math.sin(ph * Math.PI)) * 0.04, turn: r ? -0.3 : 0.3, armR: r ? [-1.6 * k, 0.5, 0] : [-0.2, 0.4, 0], armL: r ? [-0.2, -0.4, 0] : [-1.6 * k, -0.5, 0], foreL: [0, 0, 0], foreR: [0, 0, 0], head: [0, (r ? -0.2 : 0.2), 0] };
  },
];
// Strumming a guitar held across the body: the right hand strums at the
// sound hole, the left holds the neck up by the shoulder, the head nods.
function strumPose(t) {
  const st = Math.sin(t * Math.PI * 4); // two strums a second
  return { bob: 0, spine: [0.05, 0, 0], head: [0.08 + 0.06 * Math.abs(Math.sin(t * Math.PI * 2)), 0, 0.05], armR: [-0.7, 0.15, 0], foreR: [-1.0 + 0.3 * st, 0, 0], armL: [-1.2, -0.2, 0], foreL: [-1.3, 0, 0] };
}

// Resolves to { update, play } once the model is on, or null on failure.
export async function attachModel(look, { root, body, headAcc, bodyAcc }) {
  const id = PACK.models[look.model] ? look.model : MODEL_IDS[0];
  const [src, animsOk] = await Promise.all([load(id), loadAnims()]);
  if (!src || !animsOk) return null;

  const m = SkeletonUtils.clone(src.scene);
  m.scale.setScalar(PACK.scale);
  let headMesh = null, bodyMesh = null;
  const dyeMat = dyedMaterial(id, src, look);
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (dyeMat) o.material = dyeMat;
    if (PACK.hide.test(o.name) || o.userData.wearHidden) { o.visible = false; return; }
    o.castShadow = true;
    if (/head/i.test(o.name)) headMesh = o;
    else if (/body/i.test(o.name)) bodyMesh = o;
  });
  // A skirt over the everyday clothes (its own mesh and patterned material).
  const outfit = PACK.models[id].wear?.outfit;
  if (outfit && look.skirt) addSkirt(m, look.skirt, outfit);
  m.updateMatrixWorld(true);

  // Move hats, glasses and bags onto the model's head and chest bones,
  // scaled from the chibi's proportions (measured in the rest pose).
  const headBone = m.getObjectByName(PACK.bones.head);
  const chestBone = m.getObjectByName(PACK.bones.chest);
  if (headMesh && headBone) {
    headMesh.computeBoundingBox();
    const box = headMesh.boundingBox.clone().applyMatrix4(headMesh.matrixWorld);
    const size = box.getSize(new THREE.Vector3());
    box.getCenter(v);
    headAcc.removeFromParent();
    headAcc.position.copy(v);
    const s = size.x / CHIBI_HEAD_W;
    headAcc.scale.set(s, s, size.z / CHIBI_HEAD_D);
    headAcc.updateMatrixWorld(true);
    headBone.attach(headAcc);
    // Swimwear: a swim cap over the hair, in the suit's colour.
    if (PACK.models[id].cap) {
      const capMat = new THREE.MeshLambertMaterial({ color: PACK.models[id].wear?.colors?.top ?? 0x24407a });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
      cap.name = 'swimcap';
      cap.position.set(0, 0.03, -0.02);
      cap.rotation.x = -0.3;
      cap.scale.set(1.04, 0.98, 1.06);
      headAcc.add(cap);
    }
    if (chestBone && bodyMesh) {
      // Chibi torso: ~0.42 m wide, 0.36 m deep, scarf sits at ~0.6 m.
      bodyMesh.computeBoundingBox();
      const b = bodyMesh.boundingBox.clone().applyMatrix4(bodyMesh.matrixWorld);
      const bs = b.getSize(new THREE.Vector3());
      bodyAcc.removeFromParent();
      const ky = b.max.y / CHIBI_SHOULDER;
      bodyAcc.position.set(b.getCenter(v).x, 0, b.getCenter(v).z);
      bodyAcc.scale.set(bs.x / CHIBI_BODY_W, ky, bs.z / CHIBI_BODY_D);
      bodyAcc.updateMatrixWorld(true);
      chestBone.attach(bodyAcc);
    }
  }

  if (headMesh && headBone && (look.hairStyle || look.lip || look.eyeShape)) {
    const hair = faceExtras(id, headMesh, headBone, look);
    if (hair && look.head) tuckHair(hair, headAcc, look);
  }

  body.visible = false;
  root.add(m);
  const headScale = look.small === 'big' ? BIG_HEAD : look.small ? SMALL_HEAD : 1;

  const bonePose = (pose) => Object.entries(pose || {}).map(([name, r]) => [m.getObjectByName(name), r]).filter(([b]) => b);
  const ridePose = bonePose(PACK.ridePose);
  const carPose = bonePose(PACK.carPose);
  const mixer = new THREE.AnimationMixer(m);
  const actions = {};
  const action = (key) => {
    if (actions[key]) return actions[key];
    const clip = clips.get(PACK.anims[key]); // may not be loaded yet: try again later
    return (actions[key] = clip ? mixer.clipAction(clip) : null);
  };
  let current = null, currentKey = '';
  const to = (key, fade = 0.2) => {
    if (key === currentKey) return;
    const next = action(key) || action('idle');
    currentKey = key;
    if (!next) return;
    if (next === current) { next.reset(); return; }
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    current?.fadeOut(fade);
    current = next;
  };
  to('idle', 0);

  let emote = null; // { key, t, dur }
  let boardY = 0.11;
  let activity = null; // a looping pose while doing something (gym, fishing, dancing)
  let extMoves = null; // a scripted move (basketball shots): () => bone offsets
  let pullT = 0;
  let swimT = 0, swimPr = 0; // swimming: stroke phase, and how flat on the water (0 upright .. 1)
  const handL = m.getObjectByName('handl'), handR = m.getObjectByName('handr');
  let bells = null; // dumbbells, made the first time you do curls
  let barbell = null; // the bench press bar, made the first time you bench
  let scissors = null; // the hairdresser's
  let folkProps = null; // fans or long sleeves for the palace performers
  const slotL = m.getObjectByName('handslotl') || handL, slotR = m.getObjectByName('handslotr') || handR;
  const lBones = Object.fromEntries(['hips', 'spine', 'head', 'upperlegl', 'lowerlegl', 'footl', 'upperlegr', 'lowerlegr', 'footr', 'upperarml', 'upperarmr', 'lowerarml', 'lowerarmr'].map((n) => [n, m.getObjectByName(n)]));
  const lRest = new Map(Object.values(lBones).filter(Boolean).map((b) => [b, b.quaternion.clone()]));
  let strideT = 0, strideAmp = 0; // kick scooter / inline skates: stroke phase and how much of it shows
  const dBones = { spine: m.getObjectByName('spine'), head: headBone, armL: m.getObjectByName('upperarml'), armR: m.getObjectByName('upperarmr'), foreL: m.getObjectByName('lowerarml'), foreR: m.getObjectByName('lowerarmr') };
  return {
    // Where held things go. The loader drops dots from names (handslot.r → handslotr).
    hand: m.getObjectByName('handslotr') || m.getObjectByName('handslot.r') || m.getObjectByName('handr'),
    scale: PACK.scale,
    // Hold an activity pose while standing still: one of our anim names, or
    // 'dance'. null stops it.
    setActivity(name) { activity = name && (name === 'dance' || name === 'kpop' || name === 'kpopb' || name === 'strum' || name === 'pullup' || name === 'curl' || name === 'snip' || name === 'mat' || name === 'matsit' || name === 'swim' || name === 'tube' || name === 'dive' || name === 'listen' || FOLK_DANCES[name] || SNOW_MOVES[name] || STUDIO_MOVES[name] || PACK.anims[name]) ? name : null; },
    // A scripted move laid over the clip: fn() → bone offsets, or null.
    setMoves(fn) { extMoves = fn || null; },
    play(name) {
      if (!PACK.anims[name]) return;
      const clip = action(name)?.getClip();
      emote = { key: name, t: 0, dur: Math.max(1.6, clip?.duration || 0) };
      currentKey = ''; // restart even if the same clip is already playing
    },
    feet: [m.getObjectByName('footl'), m.getObjectByName('footr')],
    headMesh, headBone, // (a costume head hides them)
    // How high a board or scooter deck holds you up.
    setBoardHeight(y) { boardY = y; },
    update(dt, speed01, sit, riding) {
      if (emote) {
        emote.t += dt;
        if (emote.t >= emote.dur || (speed01 > 0.3 && !riding) || sit) emote = null;
      }
      let key;
      // On a skateboard: glide, with a push of the back foot every few seconds.
      // On a kick scooter: hands on the T-bar, one foot kicking the ground.
      // On inline skates: crouched, long slow side pushes (see STRIDE).
      const board = riding === 'board', kick = riding === 'kick', skates = riding === 'skates';
      const seated = riding && !board && !kick && !skates;
      // In the pool (core/pool-hall.js): swimming (flat on the water while
      // moving, treading water upright when still), floating in a tube
      // (sitting in it), or arms up for a dive.
      const swimming = activity === 'swim' && !riding && !sit;
      const tubing = activity === 'tube' && !riding;
      if (swimming || (activity === 'dive' && !riding)) key = 'idle';
      else if (tubing) key = 'sit';
      else if (emote && !seated && speed01 < 0.3) key = emote.key;
      else if (board || kick || skates) key = 'idle'; // the stride is posed on top
      else if (seated) key = 'ride';
      else if (sit && (activity === 'lie' || activity === 'mat')) key = 'lie'; // lying on a bed (clinic) or a picnic mat
      else if (sit && activity === 'matsit' && action('floor')) key = 'floor'; // sitting on a picnic mat
      else if (speed01 > 0.55) key = 'run';
      else if (speed01 > 0.01) key = 'walk';
      else if (activity && activity !== 'dance' && !KPOP_ACTS.has(activity) && action(activity)) key = activity;
      else key = 'idle';
      // Yoga poses, the pilates reformer and the bench press
      // (core/studio-moves.js): held while standing still.
      const studio = STUDIO_MOVES[activity] && key === 'idle' ? (globalThis.__studio?.[activity] || STUDIO_MOVES[activity])(performance.now() / 1000) : null; // (__studio: debug, tune live)
      if (studio?.clip && action(studio.clip)) key = studio.clip;
      const dancing = (activity === 'dance' || KPOP_ACTS.has(activity)) && key === 'idle';
      const listening = activity === 'listen' && key === 'idle'; // headphones on at the listening bar
      const hanging = activity === 'pullup' && key === 'idle'; // on the pull-up bar
      const curling = activity === 'curl' && key === 'idle'; // dumbbell curls
      if (curling && !bells && slotL && slotR) {
        bells = [makeDumbbell(), makeDumbbell()];
        slotL.add(bells[0]); slotR.add(bells[1]);
      }
      if (bells) for (const b of bells) b.visible = curling;
      const snipping = activity === 'snip' && key === 'idle'; // cutting hair
      if (snipping && !scissors && slotR) { scissors = makeScissors(); slotR.add(scissors); }
      if (scissors) scissors.visible = snipping;
      const folk = FOLK_DANCES[activity] && key === 'idle' ? activity : null; // fan or mask dance
      const snowy = SNOW_MOVES[activity] && (key === 'idle' || key === 'walk') ? activity : null; // making a snowball (core/snow-moves.js); walking one along: arms only
      if (folk && !folkProps && slotL && slotR) {
        folkProps = PUNGMUL_HANDS[folk] ? PUNGMUL_HANDS[folk]() : folkHandProps(folk);
        if (folkProps[0]) slotL.add(folkProps[0]);
        if (folkProps[1]) slotR.add(folkProps[1]);
      }
      if (folkProps) for (const f of folkProps) if (f) f.visible = !!folk;
      if (studio?.bar != null && !barbell && m.parent) { barbell = makeBarbell(); m.parent.add(barbell); }
      if (barbell) barbell.visible = studio?.bar != null;
      // Lying down: the pack's lying clip doesn't turn the hips on these
      // models (the body stayed upright, as if sitting), so the standing
      // idle is laid flat on its back instead: head towards -z, face up.
      to(key === 'lie' ? 'idle' : key);
      if (current && (key === 'walk' || key === 'run')) current.setEffectiveTimeScale(0.8 + speed01 * 0.5);
      let stroke = null;
      if (board || kick || skates) {
        const S = globalThis.__stride?.[riding] || STRIDE[riding]; // debug: tune live
        const moving = speed01 > 0.01 && !emote;
        strideAmp += ((moving ? 1 : 0) - strideAmp) * Math.min(1, dt * 3);
        if (strideAmp > 0.01) strideT += dt * S.rate * Math.PI * 2;
        else strideT = 0;
        stroke = S.pose(strideT, strideAmp);
      }
      swimPr += ((swimming && speed01 > 0.05 ? 1 : 0) - swimPr) * Math.min(1, dt * 4);
      const off = studio ? { y: studio.y || 0, z: studio.z || 0 } : tubing ? TUBE_SIT : swimming ? { y: SWIM_POSE.lift * swimPr, z: -SWIM_POSE.back * swimPr } : board || kick ? { y: boardY + (stroke?.y || 0) } : skates ? { y: RIDE_CLEAR + SKATE_LIFT + (stroke?.y || 0) } : seated ? PACK.ride : sit ? (key === 'lie' ? (activity === 'mat' ? PACK.lieMat || LIE_MAT : PACK.lie) : key === 'floor' ? PACK.sitMat || SIT_MAT : PACK.sit) : null;
      const k = Math.min(1, dt * 10);
      let bob = 0, turn = 0, moves = null;
      if (studio) {
        moves = studio;
        turn = studio.turn || 0;
      } else if (folk) {
        moves = FOLK_DANCES[folk](performance.now() / 1000);
        bob = moves.bob || 0;
        turn = moves.turn || 0;
      } else if (snowy) {
        moves = SNOW_MOVES[snowy](performance.now() / 1000);
        if (key === 'walk') moves = { spine: moves.spine, head: moves.head, armL: moves.armL, armR: moves.armR, foreL: moves.foreL, foreR: moves.foreR }; // (the walk clip keeps the legs)
        else { bob = moves.bob || 0; turn = moves.turn || 0; }
      } else if (listening) {
        moves = listenPose(performance.now() / 1000);
        bob = moves.bob || 0;
      } else if (dancing) {
        const { beat, phase } = beatNow();
        moves = globalThis.__dancePose // debug override
          || (activity === 'strum' ? strumPose(performance.now() / 1000)
            : activity === 'kpop' ? KPOP[Math.floor(beat / 4) % KPOP.length](phase, beat)
              : activity === 'kpopb' ? KPOP_B[Math.floor(beat / 4) % KPOP_B.length](phase, beat)
                : DANCE_MOVES[Math.floor(beat / 8) % DANCE_MOVES.length](phase, beat));
        bob = moves.bob || 0;
        turn = moves.turn || 0;
      }
      m.rotation.y += (turn - m.rotation.y) * Math.min(1, dt * 12);
      m.rotation.x += ((key === 'lie' ? -Math.PI / 2 : swimming ? SWIM_POSE.tilt * swimPr : studio?.pitch || 0) - m.rotation.x) * Math.min(1, dt * 12);
      let pull = 0;
      if (hanging) {
        pullT += dt;
        pull = 0.5 - 0.5 * Math.cos((pullT / 1.6) * Math.PI * 2); // 0 hanging .. 1 chin over the bar
        m.position.y = PULLUP.hang; // corrected below, once the arms are posed
      } else if (dancing || folk || snowy || listening) m.position.y = bob;
      else m.position.y += ((off?.y || 0) - m.position.y) * k;
      m.position.z += ((off?.z || 0) - m.position.z) * k;
      // The clips don't key every bone: start the stroke bones from rest so
      // the offsets below don't pile up frame after frame.
      for (const [b, q] of lRest) b.quaternion.copy(q);
      mixer.update(dt);
      // On a chair: thighs forward along the seat, shins down (the clip
      // leaves the legs hanging straight).
      if (key === 'sit' && !riding) {
        const S = globalThis.__sitPose || PACK.sitPose; // debug: tune live
        for (const [name, r] of Object.entries(S || {})) {
          const bone = lBones[name];
          if (bone) bone.rotation.set(bone.rotation.x + r[0], bone.rotation.y + r[1], bone.rotation.z + r[2]);
        }
      }
      // riding: true on a bike, 'car' driving, 'seat' a car passenger (the
      // plain sitting clip).
      if (seated && riding !== 'seat') {
        const tune = globalThis.__ridePose; // debug: tweak the pose live
        for (const [bone, r] of riding === 'car' ? carPose : ridePose) {
          const [x, y, z] = tune?.[bone.name] || r;
          bone.rotation.set(bone.rotation.x + x, bone.rotation.y + y, bone.rotation.z + z);
        }
      }
      if (stroke) {
        for (const [name, r] of Object.entries(stroke)) {
          const bone = lBones[name];
          if (bone && Array.isArray(r)) bone.rotation.set(bone.rotation.x + r[0], bone.rotation.y + r[1], bone.rotation.z + r[2]);
        }
      }
      if (swimming) { // front crawl while moving, treading water when still
        const S = globalThis.__swim || SWIM_POSE; // debug: tune live
        swimT += dt * (swimPr > 0.5 ? S.rate * (0.6 + 0.5 * speed01) : 2.2);
        const add = (b, x, y, z) => { if (b) b.rotation.set(b.rotation.x + x, b.rotation.y + y, b.rotation.z + z); };
        const crawl = swimPr, tread = 1 - swimPr;
        for (const [side, ph] of [['L', 0], ['R', Math.PI]]) {
          const a = ((swimT + ph) % (Math.PI * 2)); // one turn per stroke
          add(dBones['arm' + side], -a * crawl + tread * (-0.5 + 0.35 * Math.sin(swimT + ph)), 0, tread * (side === 'L' ? 0.5 : -0.5));
          add(dBones['fore' + side], tread * -0.6, 0, 0);
          add(lBones['upperleg' + side.toLowerCase()], Math.sin(swimT * 2 + ph) * (0.35 * crawl + 0.2 * tread), 0, 0);
        }
        add(dBones.head, -S.head * crawl, 0, 0);
      }
      if (activity === 'dive' && key === 'idle') { // arms straight up over the head
        for (const n of ['armL', 'armR']) { const b = dBones[n]; if (b) b.rotation.set(b.rotation.x - 2.95, b.rotation.y, b.rotation.z); }
      }
      if (hanging) { // arms up to the bar, elbows bending as you pull
        const bend = -1.5 * pull;
        for (const [name, r] of [['armL', [-2.95 - bend * 0.35, 0, 0]], ['armR', [-2.95 - bend * 0.35, 0, 0]], ['foreL', [bend, 0, 0]], ['foreR', [bend, 0, 0]]]) {
          const bone = dBones[name];
          if (bone) bone.rotation.set(bone.rotation.x + r[0], bone.rotation.y + r[1], bone.rotation.z + r[2]);
        }
        if (handL && handR && m.parent) { // lift the body until the hands reach the bar
          m.updateMatrixWorld(true);
          const y = (m.parent.worldToLocal(handL.getWorldPosition(_hv)).y + m.parent.worldToLocal(handR.getWorldPosition(_hv)).y) / 2;
          m.position.y += PULLUP.bar - y;
        }
      }
      if (snipping) { // right hand up by the client's head, snip snip
        pullT += dt;
        const a = dBones.armR, f = dBones.foreR, sn = Math.sin(pullT * 14);
        if (a) a.rotation.set(a.rotation.x - 1.3, a.rotation.y, a.rotation.z + 0.3 * Math.sin(pullT * 1.7));
        if (f) f.rotation.set(f.rotation.x, f.rotation.y, f.rotation.z + 1.2 + 0.25 * sn);
        if (scissors) scissors.children.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * (0.08 + 0.2 * Math.abs(sn)); });
      }
      if (curling) { // one arm curls up while the other lowers
        pullT += dt;
        const ph = Math.sin((pullT / 1.4) * Math.PI * 2);
        const C = globalThis.__curl || CURL; // debug: tune live
        for (const [side, c] of [['L', Math.max(0, ph)], ['R', Math.max(0, -ph)]]) {
          const f = dBones['fore' + side], r = C['fore' + side], amt = 0.15 + 0.85 * c;
          if (f) f.rotation.set(f.rotation.x + r[0] * amt, f.rotation.y + r[1] * amt, f.rotation.z + r[2] * amt);
        }
      }
      if (extMoves) moves = extMoves() || moves; // basketball shots and other scripted moves
      if (moves) {
        for (const [name, bone] of Object.entries(dBones)) {
          const r = moves[name];
          if (bone && r) bone.rotation.set(bone.rotation.x + r[0], bone.rotation.y + r[1], bone.rotation.z + r[2]);
        }
        for (const [name, bone] of [['legL', lBones.upperlegl], ['legR', lBones.upperlegr], ['kneeL', lBones.lowerlegl], ['kneeR', lBones.lowerlegr]]) {
          const r = moves[name];
          if (bone && r) bone.rotation.set(bone.rotation.x + r[0], bone.rotation.y + r[1], bone.rotation.z + r[2]);
        }
      }
      if (barbell?.visible && handL && handR) { // the bar runs from hand to hand
        m.updateMatrixWorld(true);
        const a = m.parent.worldToLocal(handL.getWorldPosition(_hv)), b = m.parent.worldToLocal(handR.getWorldPosition(_hv2));
        barbell.position.addVectors(a, b).multiplyScalar(0.5);
        barbell.quaternion.setFromUnitVectors(_up, _hv3.subVectors(b, a).normalize());
      }
      if (headScale !== 1 && headBone) headBone.scale.setScalar(headScale); // after the clip's pose
    },
  };
}
