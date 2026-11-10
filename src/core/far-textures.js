// Far-away canvas textures let go of their canvas. iPhone Safari closes the
// page once all canvases together pass its memory limit, and every district
// adds park boards, gate titles, posters and graffiti, most of them far from
// wherever you are. A texture marked with farFree() keeps the full drawing
// only within NEAR of the player: past FAR its canvas is saved as a small
// PNG and the texture shows a 32 px copy (the same colours, blurred, which
// is all the fog lets you see at that distance); coming back within NEAR
// draws the full canvas again from the PNG.
//
// Works on a texture's source, so clones sharing one canvas (tiled walls,
// fences) change together. Only for textures drawn once: something that
// redraws its canvas later (screens, translated text drawn in place) must
// not be marked.
import * as THREE from 'three';

export const NEAR = 170, FAR = 220; // m
const SMALL = 32; // px, the longer side of the stand-in
const SWEEP_MS = 1000;
export const PER_SWEEP = { grow: 12, shrink: 8 }; // textures changed per sweep, at most

export function farFree(tex) {
  tex.userData.farFree = true;
  return tex;
}

const states = new WeakMap(); // source -> { full, busy, blob, w, h }
const pos = new THREE.Vector3();
let lastSweep = 0;

// Call every frame on the street; checks distances once a second.
export function updateFarTextures(scene, x, z, now = performance.now()) {
  if (now - lastSweep < SWEEP_MS) return;
  lastSweep = now;
  const seen = new Map(); // source -> { d, textures }
  scene.traverse((o) => {
    const mats = o.material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      const t = m?.map;
      if (!t?.userData.farFree) continue;
      o.getWorldPosition(pos);
      const d = Math.hypot(pos.x - x, pos.z - z);
      const e = seen.get(t.source);
      if (e) { e.d = Math.min(e.d, d); e.textures.add(t); } else seen.set(t.source, { d, textures: new Set([t]) });
    }
  });
  // A few each second, nearest first: after a taxi ride hundreds of signs
  // change sides at once, and saving each one as a PNG stalls the page
  // (about 2 s on a slow phone when they all went in one go).
  const grows = [], shrinks = [];
  for (const [source, { d, textures }] of seen) {
    let s = states.get(source);
    if (!s) states.set(source, (s = { full: true, busy: false }));
    if (s.busy) continue;
    if (s.full && d > FAR) shrinks.push({ source, textures, s, d });
    else if (!s.full && d < NEAR) grows.push({ source, textures, s, d });
  }
  grows.sort((a, b) => a.d - b.d).slice(0, PER_SWEEP.grow).forEach((g) => grow(g.source, g.textures, g.s));
  shrinks.sort((a, b) => b.d - a.d).slice(0, PER_SWEEP.shrink).forEach((g) => shrink(g.source, g.textures, g.s));
}

function swap(source, textures, image) {
  for (const t of textures) t.dispose(); // (the GPU copy is remade at the new size)
  source.data = image;
  source.needsUpdate = true;
}

function shrink(source, textures, s) {
  const c = source.data;
  if (!(c instanceof HTMLCanvasElement) || !c.width || !c.height) return;
  s.busy = true;
  c.toBlob((blob) => {
    s.busy = false;
    if (!blob || source.data !== c) return;
    const k = Math.min(1, SMALL / Math.max(c.width, c.height));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(c.width * k));
    small.height = Math.max(1, Math.round(c.height * k));
    small.getContext('2d').drawImage(c, 0, 0, small.width, small.height);
    Object.assign(s, { blob, w: c.width, h: c.height, full: false });
    swap(source, textures, small);
    c.width = c.height = 0; // let the big canvas go now, not whenever it's collected
  }, 'image/png');
}

function grow(source, textures, s) {
  s.busy = true;
  createImageBitmap(s.blob).then((bmp) => {
    const c = document.createElement('canvas');
    c.width = s.w; c.height = s.h;
    c.getContext('2d').drawImage(bmp, 0, 0);
    bmp.close?.();
    s.full = true;
    s.busy = false;
    swap(source, textures, c);
  }, () => { s.busy = false; });
}
