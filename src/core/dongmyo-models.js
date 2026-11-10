// Dongmyo flea market's stalls (map landmarks "fleastall" in
// districts/dongmyo.json, scripts/build-dongmyo.mjs): a striped tarp on four
// poles over a table of folded clothes, a rail of hanging shirts behind and a
// heap of shoes on a sheet in front. Visual only (collision is the map's
// blockers); each stall is merged into a few meshes.
import * as THREE from 'three';
import { mergeStatic } from './bukchon-models.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function box(g, sx, sy, sz, x, y, z, c) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
const TARPS = [['#2f6fb5', '#f2f2f2'], ['#3b8a4a', '#f2f2f2'], ['#c43d3d', '#f5e9d6'], ['#e0a32e', '#f5f0e6'], ['#5a6fae', '#e8e2d6']];
const CLOTHES = ['#3c4a6b', '#b8443c', '#e3d6b8', '#5b7d4c', '#2b2b31', '#c98a3c', '#8a5a7a', '#9fb4c9', '#d9d2c4', '#6b4630'];

export const DONGMYO_BUILD = {
  fleastall(g, l) {
    const w = l.w || 3.2, d = 2, k = (l.c || 0) % TARPS.length, H = 2.3;
    const [c1, c2] = TARPS[k];
    // poles and the tarp (stripes)
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) box(g, 0.08, H, 0.08, x, H / 2, z, '#8a8f96');
    const n = 6;
    for (let i = 0; i < n; i++) box(g, w / n + 0.02, 0.06, d + 0.5, -w / 2 + (i + 0.5) * (w / n), H + 0.05 + (i % 2) * 0.01, 0.15, i % 2 ? c2 : c1);
    // the table and its folded piles
    box(g, w - 0.3, 0.06, 0.9, 0, 0.78, 0.1, '#a07a52');
    for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) box(g, 0.06, 0.76, 0.8, x, 0.38, 0.1, '#7a5a3a');
    for (let i = 0; i < 5; i++) {
      const x = -w / 2 + 0.5 + i * ((w - 1) / 4);
      for (let j = 0, y = 0.84; j < 2 + ((i + k) % 3); j++, y += 0.09) box(g, 0.42, 0.08, 0.32, x + ((j % 2) - 0.5) * 0.04, y, 0.1, CLOTHES[(i * 3 + j + k) % CLOTHES.length]);
    }
    // the rail of hanging shirts at the back
    box(g, w - 0.2, 0.04, 0.04, 0, 1.85, -d / 2 + 0.15, '#6b6f75');
    for (let i = 0; i < 7; i++) box(g, 0.34, 0.62, 0.05, -w / 2 + 0.4 + i * ((w - 0.8) / 6), 1.5, -d / 2 + 0.15, CLOTHES[(i * 7 + k * 2) % CLOTHES.length]);
    // shoes on a sheet in front
    box(g, w * 0.6, 0.02, 0.5, -w * 0.12, 0.01, d / 2 + 0.25, '#5b6a7a');
    for (let i = 0; i < 4; i++) box(g, 0.24, 0.12, 0.12, -w * 0.38 + i * 0.32, 0.08, d / 2 + 0.25, CLOTHES[(i + k * 3 + 4) % CLOTHES.length]);
  },
};
export const DONGMYO_MODELS = Object.fromEntries(Object.entries(DONGMYO_BUILD).map(([k, f]) => [k, (g, l) => { const t = f(g, l); mergeStatic(g); return t; }]));
