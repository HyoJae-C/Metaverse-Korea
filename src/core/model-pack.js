// Loads the active character model pack (src/data/characters) and puts a
// model on a character: one GLB load per model (shared by every player),
// a skeleton clone per character, and an AnimationMixer driven by our action
// names (idle, walk, run, sit, ride and the emotes).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PACK } from '../data/characters/index.js';

export const MODEL_IDS = Object.keys(PACK.models);
export const modelEmoji = (id) => PACK.models[id]?.emoji || '🙂';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const loader = new GLTFLoader();
const cache = new Map();
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

// The primitive chibi's head is ~0.65 m wide with its centre at the head
// group's origin. Accessories were made for those proportions.
const CHIBI_HEAD_W = 0.65, CHIBI_HEAD_D = 0.62;
const CHIBI_BODY_W = 0.42, CHIBI_BODY_D = 0.36, CHIBI_SHOULDER = 0.66;
const v = new THREE.Vector3();

// Resolves to { update, play } once the model is on, or null on failure.
export async function attachModel(look, { root, body, headAcc, bodyAcc }) {
  const id = PACK.models[look.model] ? look.model : MODEL_IDS[0];
  const [src, animSrc] = await Promise.all([load(id), load(PACK.animsFrom)]);
  if (!src || !animSrc) return null;

  const m = SkeletonUtils.clone(src.scene);
  m.scale.setScalar(PACK.scale);
  let headMesh = null, bodyMesh = null;
  m.traverse((o) => {
    if (!o.isMesh) return;
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

  const mixer = new THREE.AnimationMixer(m);
  const actions = {};
  const action = (key) => {
    if (key in actions) return actions[key];
    const clip = animSrc.animations.find((a) => a.name === PACK.anims[key]);
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
  return {
    // Where held things go. The loader drops dots from names (handslot.r → handslotr).
    hand: m.getObjectByName('handslotr') || m.getObjectByName('handslot.r') || m.getObjectByName('handr'),
    scale: PACK.scale,
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
      else key = 'idle';
      to(key);
      if (current && (key === 'walk' || key === 'run')) current.setEffectiveTimeScale(0.8 + speed01 * 0.5);
      const off = riding ? PACK.ride : sit ? PACK.sit : null;
      const k = Math.min(1, dt * 10);
      m.position.y += ((off?.y || 0) - m.position.y) * k;
      m.position.z += ((off?.z || 0) - m.position.z) * k;
      mixer.update(dt);
    },
  };
}
