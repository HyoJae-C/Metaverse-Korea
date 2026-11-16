// Food on a picnic mat (돗자리): dishes you made at the cooking classes
// (kimchi, japchae, kimbap, songpyeon, bibimbap) set out on your spread mat
// for everyone in the park to see, on a plate rimmed in the dish's medal.
// The dishes never leave the bag (like the mat itself): they only show
// while they're still in it.
//
// The owner shares them in their state as "mf": "kimbap.g,kimchi.s" (dish
// and medal: g gold, s silver, b bronze, n none), at most MAT_FOOD_MAX.
import * as THREE from 'three';
import { makeHeld } from './held.js';
import { medalFor } from './grill-game.js';
import { isKimchi, kimchiScore } from './kimchi-market.js';

export const MAT_FOOD_MAX = 3;
export const MAT_DISHES = ['kimchi', 'japchae', 'kimbap', 'tteok', 'bibimbap'];
const CODE = { gold: 'g', silver: 's', bronze: 'b' };
const RANK = { g: 3, s: 2, b: 1, n: 0 };
export const MEDAL_ICON = { g: '🥇', s: '🥈', b: '🥉', n: '' };

// A bag entry as a dish for the mat ({ g, m }), or null if it isn't one.
export function matDish(e) {
  const g = isKimchi(e) ? 'kimchi' : e?.kind === 'gift' && MAT_DISHES.includes(e.g) ? e.g : null;
  return g ? { g, m: CODE[medalFor(kimchiScore(e))] || 'n' } : null;
}
const key = (d) => d.g + '.' + d.m;

export const encodeFood = (list) => list.map(key).join(',');
// Another player's "mf" back into dishes ([] if there's nothing valid).
export function parseFood(v) {
  if (typeof v !== 'string' || !v || v.length > 64) return [];
  const out = [];
  for (const s of v.split(',').slice(0, MAT_FOOD_MAX)) {
    const [g, m] = s.split('.');
    if (MAT_DISHES.includes(g) && Object.hasOwn(RANK, m)) out.push({ g, m });
  }
  return out;
}

// The bag's dishes, minus the ones already on the mat (one bag entry each).
function spare(bagList, shown) {
  const left = new Map();
  for (const d of shown) left.set(key(d), (left.get(key(d)) || 0) + 1);
  const out = [];
  for (const e of bagList) {
    const d = matDish(e);
    if (!d) continue;
    const n = left.get(key(d)) || 0;
    if (n) left.set(key(d), n - 1); else out.push(d);
  }
  return out;
}

// The next dish to set out: one not on the mat yet if there is one, the best
// medal first. Null when the mat is full or the bag has no more.
export function nextDish(bagList, shown) {
  if (shown.length >= MAT_FOOD_MAX) return null;
  const has = new Set(shown.map((d) => d.g));
  const pick = spare(bagList, shown).sort((a, b) => (has.has(a.g) - has.has(b.g)) || (RANK[b.m] - RANK[a.m]));
  return pick[0] || null;
}

// The dishes still in the bag (one eaten, sold or given away leaves the mat).
export function foodInBag(shown, bagList) {
  const avail = new Map();
  for (const e of bagList) { const d = matDish(e); if (d) avail.set(key(d), (avail.get(key(d)) || 0) + 1); }
  return shown.filter((d) => { const n = avail.get(key(d)) || 0; if (!n) return false; avail.set(key(d), n - 1); return true; });
}

// Where the dishes sit on the mat, in its own space: along the foot (+z,
// the way people sitting on it face), spread across its width.
export function foodSpots(n) {
  const xs = n === 1 ? [0] : n === 2 ? [-0.45, 0.45] : [-0.8, 0, 0.8];
  return xs.map((x) => [x, 0.72]);
}

// The dishes' 3D models: each dish as it looks in the hand, a little bigger,
// on a white plate whose rim shows its medal.
const RIM = { g: '#e8b923', s: '#9aa3ad', b: '#c27c3a', n: '#f6f1e6' };
const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
let plateGeo = null, rimGeo = null;
export function makeFood(list) {
  const g = new THREE.Group();
  g.name = 'mat-food';
  plateGeo ||= new THREE.CylinderGeometry(0.2, 0.17, 0.025, 20);
  rimGeo ||= new THREE.TorusGeometry(0.19, 0.014, 6, 24).rotateX(Math.PI / 2);
  foodSpots(list.length).forEach(([x, z], i) => {
    const d = list[i], spot = new THREE.Group();
    spot.position.set(x, 0.035, z);
    const plate = new THREE.Mesh(plateGeo, mat('#ffffff'));
    plate.position.y = 0.012;
    spot.add(plate);
    const rim = new THREE.Mesh(rimGeo, mat(RIM[d.m]));
    rim.position.y = 0.026;
    spot.add(rim);
    const dish = makeHeld('gift:' + d.g);
    dish.scale.setScalar(2);
    dish.position.y = 0.025;
    spot.add(dish);
    g.add(spot);
  });
  return g;
}
