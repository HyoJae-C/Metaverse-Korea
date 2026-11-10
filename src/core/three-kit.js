// Small 3D and canvas helpers shared by the model files.
import * as THREE from 'three';
import { farFree } from './far-textures.js';

// One Lambert material per colour. Each caller gets its own cache, so a file
// that tweaks one of its materials never changes another file's.
export function matCache(opts = {}) {
  const mats = {};
  return (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, ...opts }));
}

// A box of size sx × sy × sz centred at (x, y, z), added to g. `c` is a colour
// for `mat` or a ready material.
export function addBox(g, mat, sx, sy, sz, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), c?.isMaterial ? c : mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// A texture drawn once on a canvas: draw(ctx, w, h).
// opts.anisotropy, opts.repeat ([x, y], also turns on repeat wrapping),
// opts.farFree (let go of the canvas when far away: core/far-textures.js).
export function canvasTex(w, h, draw, { anisotropy = 0, repeat = null, farFree: free = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (anisotropy) t.anisotropy = anisotropy;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return free ? farFree(t) : t;
}

// Draws `text` word-wrapped to maxW at (x, y), lh apart, on a 2D canvas
// context; returns the y of the line after the last.
export function wrapText(g, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (g.measureText(next).width > maxW && line) { g.fillText(line, x, y); y += lh; line = word; } else line = next;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}
