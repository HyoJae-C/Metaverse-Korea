// The season the city's trees wear. One switch: change SEASON and every
// leafy tree, wood and bush picks its colour from here (pines and other
// evergreens keep their green whatever the season).
//
// Autumn (Yozi 2026-11-20): most trees yellow (ginkgo) and red (maple),
// some orange, a green one here and there; the big parks (Seoul Forest)
// the most colourful. Only colours change: no new geometry, so it costs
// nothing in download, triangles or draw calls.
import * as THREE from 'three';

export const SEASON = 'autumn'; // 'summer' | 'autumn'

const C = (list) => list.map((c) => new THREE.Color(c));
const YELLOW = C(['#f2c230', '#f5d24a', '#e8ad1c', '#f7dc6a']); // ginkgo
const RED = C(['#d6402a', '#c3302b', '#e2552f', '#b02a2e']); // maple
const ORANGE = C(['#ec8a28', '#dd7424', '#f0a03a']); // zelkova, cherry
const BROWN = C(['#b8803a', '#a8743a']); // oak, late plane trees

// How each kind of planting mixes its colours in autumn (weights, any sum).
// Every round (broadleaf) tree turns; the green left in the city is the
// pointed trees, which are conifers (Yozi 2026-11-20: tell the kinds apart
// by shape). Ginkgos have their own shape and are always yellow (ginkgoColor).
//   street: the round trees on the avenues, zelkova and plane trees.
//   park:   a big wood (Seoul Forest), maples among them: the most red.
//   wood:   a hillside wood seen from afar (Bugaksan, Naksan, Jongmyo).
//   bush:   shrubs stay mostly green, a few going red.
export const MIX = {
  street: { green: 0, yellow: 0.3, orange: 0.34, red: 0.2, brown: 0.16 },
  park: { green: 0, yellow: 0.3, orange: 0.24, red: 0.38, brown: 0.08 },
  wood: { green: 0, yellow: 0.3, orange: 0.28, red: 0.3, brown: 0.12 },
  bush: { green: 0.55, yellow: 0.05, orange: 0.12, red: 0.28, brown: 0 },
};

// A steady 0-1 number for an index or a spot (the same tree always gets the
// same colour, on every computer).
export function leafHash(a, b = 0) {
  const h = Math.sin(a * 12.9898 + b * 78.233 + 0.5) * 43758.5453;
  return h - Math.floor(h);
}

// The colour for one leafy tree: its summer green, or in autumn a colour
// picked by h (0-1) from the mix. Returns a shared Color: don't change it.
export function leafColor(green, h, mix = MIX.street, season = SEASON) {
  if (season !== 'autumn') return green;
  const total = mix.green + mix.yellow + mix.orange + mix.red + mix.brown;
  let t = (((h % 1) + 1) % 1) * total;
  for (const [w, list] of [[mix.green, null], [mix.yellow, YELLOW], [mix.orange, ORANGE], [mix.red, RED], [mix.brown, BROWN]]) {
    if (t < w) return list ? list[Math.floor(leafHash(h * 1000) * list.length) % list.length] : green;
    t -= w;
  }
  return green;
}

// The same as a '#rrggbb' string, for models that pick materials by colour.
const greenCache = new Map();
export function leafHex(greenHex, h, mix = MIX.street, season = SEASON) {
  if (season !== 'autumn') return greenHex;
  if (!greenCache.has(greenHex)) greenCache.set(greenHex, new THREE.Color(greenHex));
  return '#' + leafColor(greenCache.get(greenHex), h, mix, season).getHexString();
}

// A ginkgo (은행나무): bright yellow in autumn, its green otherwise.
export function ginkgoColor(green, h, season = SEASON) {
  return season === 'autumn' ? YELLOW[Math.floor(leafHash(h * 1000) * YELLOW.length) % YELLOW.length] : green;
}
