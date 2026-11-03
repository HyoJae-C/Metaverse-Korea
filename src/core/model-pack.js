// Loads the active character model pack (src/data/characters) and puts a
// model on a character: one GLB load per model (shared by every player),
// a skeleton clone per character, and an AnimationMixer driven by our action
// names (idle, walk, run, sit, ride and the emotes).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PACK } from '../data/characters/index.js';
import { PALETTES } from '../data/appearance.js';

export const MODEL_IDS = Object.keys(PACK.models);
export const modelEmoji = (id) => PACK.models[id]?.emoji || '🙂';

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
      .then((g) => { if (def.recolor) recolor(g, def.recolor); return g; })
      .catch(() => null));
  }
  return cache.get(id);
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
const dyed = new Map();
function dyedMaterial(id, src, look) {
  const A = PACK.atlas;
  const paint = [['hair', PALETTES.dye[look.dye]], ['eyes', PALETTES.eyes[look.eyes]], ['skin', PALETTES.skin[look.tone]]]
    .filter(([cell, c]) => A?.[cell] && c != null);
  const shirtRule = PACK.models[id]?.shirt;
  const shirt = shirtRule && PALETTES.shirt[look.shirt];
  if (!paint.length && shirt == null) return null;
  const key = [id, look.dye, look.eyes, look.tone, shirt ? look.shirt : ''].join('|');
  if (dyed.has(key)) return dyed.get(key);
  let base = null;
  src.scene.traverse((o) => { if (!base && o.isMesh && o.material?.map?.image) base = o.material; });
  if (!base) return null;
  const img = base.map.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
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
    const [cx, cy] = A[cell];
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
  const tex = new THREE.CanvasTexture(c);
  for (const k of ['flipY', 'colorSpace', 'magFilter', 'minFilter', 'wrapS', 'wrapT']) tex[k] = base.map[k];
  const m = base.clone();
  m.map = tex;
  dyed.set(key, m);
  return m;
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
    if (PACK.hide.test(o.name)) { o.visible = false; return; }
    o.castShadow = true;
    if (/head/i.test(o.name)) headMesh = o;
    else if (/body/i.test(o.name)) bodyMesh = o;
  });
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

  body.visible = false;
  root.add(m);
  const headScale = look.small ? SMALL_HEAD : 1;

  const ridePose = Object.entries(PACK.ridePose || {}).map(([name, r]) => [m.getObjectByName(name), r]).filter(([b]) => b);
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
  let activity = null; // a looping pose while doing something (gym, fishing, dancing)
  const dBones = { spine: m.getObjectByName('spine'), head: headBone, armL: m.getObjectByName('upperarml'), armR: m.getObjectByName('upperarmr'), foreL: m.getObjectByName('lowerarml'), foreR: m.getObjectByName('lowerarmr') };
  return {
    // Where held things go. The loader drops dots from names (handslot.r → handslotr).
    hand: m.getObjectByName('handslotr') || m.getObjectByName('handslot.r') || m.getObjectByName('handr'),
    scale: PACK.scale,
    // Hold an activity pose while standing still: one of our anim names, or
    // 'dance'. null stops it.
    setActivity(name) { activity = name && (name === 'dance' || PACK.anims[name]) ? name : null; },
    play(name) {
      if (!PACK.anims[name]) return;
      const clip = action(name)?.getClip();
      emote = { key: name, t: 0, dur: Math.max(1.6, clip?.duration || 0) };
      currentKey = ''; // restart even if the same clip is already playing
    },
    update(dt, speed01, sit, riding) {
      if (emote) {
        emote.t += dt;
        if (emote.t >= emote.dur || (speed01 > 0.3 && !riding) || sit) emote = null;
      }
      let key;
      if (emote && !riding) key = emote.key;
      else if (riding) key = 'ride';
      else if (sit) key = 'sit';
      else if (speed01 > 0.55) key = 'run';
      else if (speed01 > 0.01) key = 'walk';
      else if (activity && activity !== 'dance' && action(activity)) key = activity;
      else key = 'idle';
      const dancing = activity === 'dance' && key === 'idle';
      to(key);
      if (current && (key === 'walk' || key === 'run')) current.setEffectiveTimeScale(0.8 + speed01 * 0.5);
      const off = riding ? PACK.ride : sit ? PACK.sit : null;
      const k = Math.min(1, dt * 10);
      let bob = 0, turn = 0, moves = null;
      if (dancing) {
        const { beat, phase } = beatNow();
        moves = globalThis.__dancePose || DANCE_MOVES[Math.floor(beat / 8) % DANCE_MOVES.length](phase, beat); // debug override
        bob = moves.bob || 0;
        turn = moves.turn || 0;
      }
      m.rotation.y += (turn - m.rotation.y) * Math.min(1, dt * 12);
      if (dancing) m.position.y = bob;
      else m.position.y += ((off?.y || 0) - m.position.y) * k;
      m.position.z += ((off?.z || 0) - m.position.z) * k;
      mixer.update(dt);
      if (riding) {
        const tune = globalThis.__ridePose; // debug: tweak the pose live
        for (const [bone, r] of ridePose) {
          const [x, y, z] = tune?.[bone.name] || r;
          bone.rotation.set(bone.rotation.x + x, bone.rotation.y + y, bone.rotation.z + z);
        }
      }
      if (moves) {
        for (const [name, bone] of Object.entries(dBones)) {
          const r = moves[name];
          if (bone && r) bone.rotation.set(bone.rotation.x + r[0], bone.rotation.y + r[1], bone.rotation.z + r[2]);
        }
      }
      if (headScale !== 1 && headBone) headBone.scale.setScalar(headScale); // after the clip's pose
    },
  };
}
