// The look-out tower on Namsan (N Seoul Tower), redrawn after Yozi's photo
// (2026-11-19): a terrace and a round foot building, a lower pylon ringed
// with bands that glow green at night, a slim shaft lit violet to pink, the
// round deck in tiers with two glass bands and pink rings of light, and the
// tall antenna in red and white bands with a red light on top. White by day;
// the lights come on after dark (weather.js glowAtNight).
//
// Heights follow the real tower's OSM parts (scripts/data/namsan-osm.json
// towerParts: the glass deck 88–100 m up, the top 112 m, the antenna to
// 236.7 m), in units of 3 real metres: the landmark draws it at 0.75
// (core/landmarks.js), so it stands at a quarter of the real size.
// One mesh per material (8 draw calls).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowAtNight } from './weather.js';

// y (units above the summit) of each part: the deck's glass and the top.
export const NAMSAN_TOWER = {
  unit: 3, // real metres per unit (× the landmark's 0.75 = a quarter)
  foot: 9, // the terrace (2) and the foot building (7)
  pylon: 15, // the green-lit lower pylon, to here
  head: 28.5, // the deck starts (the real 88 m is 29.3)
  glass: [30.3, 32.5], // the main glass band
  top: 38, // the deck's cap (the real 112 m is 37.3)
  tip: 79, // the antenna's top (the real 236.7 m is 78.9)
  deckR: 3.95, // the deck's radius (the real 23.5 m across / 2 / 3)
  // The terrace (radius 13 at its foot, 12 on top, 2 high) stands 0.5 m over
  // the plaza (the tower is set 1 m into it: core/landmarks.js); a step ring
  // halfway up lets you walk onto it (Yozi 2026-11-19: "턱 올라갈 수 있게").
  // game/namsan-walk.js NAMSAN_WALK.terrace is the same in metres.
  step: { r: 13.6, h: 5 / 3 },
  // The way in, on the foot building's east side (the deck's door, stores.json
  // namsan-deck, is in front of it): its width and height.
  door: { w: 3.2, h: 3.6 },
};

let mats = null;
function towerMats() {
  if (mats) return mats;
  const lam = (color, emissive, night, day = 0) => {
    const m = new THREE.MeshLambertMaterial({ color, emissive: emissive || '#000000', flatShading: true });
    if (emissive) glowAtNight(m, night, day);
    return m;
  };
  mats = {
    stone: lam('#cfc7b8'),
    white: lam('#ece9e2'),
    green: lam('#e3e8de', '#2fd27a', 0.9), // the lower pylon's bands
    violet: lam('#e6e2ea', '#9a6bff', 0.8), // the shaft, low
    pink: lam('#eee2ea', '#ff5fb6', 0.85), // the shaft, high
    glass: lam('#3f5470', '#ffb3d9', 0.45, 0.05), // the deck's windows
    ring: lam('#f4dbe8', '#ff3fa0', 1.1, 0.1), // the rings of light round the deck
    red: lam('#d0463b', '#ff2a1a', 0.35), // the antenna's red bands
  };
  return mats;
}

export function namsanTower(g, y0 = 0) {
  const M = towerMats(), T = NAMSAN_TOWER;
  const parts = {};
  const put = (k, geo) => (parts[k] ||= []).push(geo);
  const cyl = (k, rt, rb, h, y, seg = 20) => put(k, new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, y0 + y + h / 2, 0));

  cyl('stone', 12, 13, 2, 0, 24); // the terrace on the summit
  cyl('stone', T.step.r, T.step.r + 0.2, T.step.h, 0, 24); // a step up onto it
  cyl('white', 7, 8, 7, 2, 24); // the foot building
  // Its door, facing east (+x): a stone frame, glass doors with a bar down
  // the middle, and a little canopy over them.
  const box = (k, sx, sy, sz, x, y) => put(k, new THREE.BoxGeometry(sx, sy, sz).translate(x, y0 + y, 0));
  const D = T.door, sx = (y) => 8 - (y - 2) / 7; // (the foot building's radius at y)
  box('stone', 0.6, D.h + 0.5, D.w + 0.8, sx(2 + D.h / 2) + 0.05, 2 + (D.h + 0.5) / 2);
  box('glass', 0.5, D.h, D.w, sx(2 + D.h / 2) + 0.25, 2 + D.h / 2);
  box('stone', 0.12, D.h, 0.16, sx(2 + D.h / 2) + 0.52, 2 + D.h / 2);
  box('white', 2, 0.35, D.w + 1.4, sx(2 + D.h) + 0.9, 2 + D.h + 0.6);
  // The lower pylon, with three bands that glow green at night.
  cyl('white', 2.3, 2.7, T.pylon - T.foot, T.foot);
  for (const y of [10.2, 12.2, 14.2]) cyl('green', 3, 3, 0.55, y);
  cyl('green', 2.35, 2.35, T.pylon - T.foot - 0.4, T.foot + 0.2, 12); // (a glow between the bands too)
  // The shaft: violet low, pink high.
  const mid = (T.pylon + T.head) / 2;
  cyl('violet', 1.75, 2.1, mid - T.pylon, T.pylon);
  cyl('pink', 1.55, 1.75, T.head - mid, mid);
  // The deck in tiers.
  let y = T.head;
  const tier = (k, rt, rb, h) => { cyl(k, rt, rb, h, y, 28); y += h; };
  tier('white', T.deckR - 0.2, 1.55, 1.2); // its underside
  tier('white', T.deckR, T.deckR - 0.2, 0.6);
  tier('glass', T.deckR + 0.05, T.deckR + 0.05, T.glass[1] - T.glass[0]); // the main glass band
  tier('white', T.deckR - 0.1, T.deckR, 0.6);
  tier('glass', T.deckR - 0.35, T.deckR - 0.35, 1.5); // the upper glass band
  tier('white', T.deckR - 0.6, T.deckR - 0.35, 0.8);
  tier('white', 1.5, T.deckR - 0.6, T.top - y); // the cap
  // Rings of light round the deck.
  cyl('ring', T.deckR + 0.25, T.deckR + 0.25, 0.28, T.glass[0] - 0.3, 28);
  cyl('ring', T.deckR + 0.25, T.deckR + 0.25, 0.28, T.glass[1] + 0.05, 28);
  cyl('ring', T.deckR - 0.1, T.deckR - 0.1, 0.22, T.glass[1] + 2.25, 28);
  // The antenna: a white foot, then red and white bands narrowing to the tip.
  cyl('white', 1.05, 1.3, 5, T.top, 12);
  cyl('white', 1.5, 1.5, 0.4, T.top + 5, 12); // a little platform
  const n = 8, from = T.top + 5.4, len = (T.tip - from) / n;
  for (let i = 0; i < n; i++) {
    const rb = 0.95 - i * 0.09, rt = 0.95 - (i + 1) * 0.09;
    cyl(i % 2 ? 'white' : 'red', rt, rb, len, from + i * len, 10);
  }
  put('red', new THREE.SphereGeometry(0.45, 8, 6).translate(0, y0 + T.tip + 0.2, 0)); // the light on top

  for (const [k, list] of Object.entries(parts)) {
    const mesh = new THREE.Mesh(mergeGeometries(list.map((q) => (q.index ? q.toNonIndexed() : q))), M[k]);
    mesh.name = `namsan-tower-${k}`;
    g.add(mesh);
  }
}
