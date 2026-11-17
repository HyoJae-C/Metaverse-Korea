// Fish tanks for your home (Yozi 2026-11-17): bought at the KONEXT Aquarium
// shop, placed with Decorate like other furniture, then filled with fish
// from your fish bag. Each tank holds so many "spaces"; a fish takes 1, 2,
// 4 or 8 by its real length (S, M, L, XL), and a tank takes fish up to its
// own size class. Fish can go back into the bag (when there's room) and are
// sold from there; the fish book keeps every catch either way.
//
// Contents live in mk.tanks ({ tankId: [fishId, ...] }), apart from the room
// layout, so a tank put away keeps its fish. Pure logic: no three.js here.
import { BAG_MAX, fishById } from './fishing.js';

// [id, emoji, footprint [w, d], stand height, tank height, spaces, biggest
// class, home level needed (1: none, Yozi 2026-11-18), price, name]. Homes come from
// core/home-stages.js (its own thread): level 2 is the home everyone has
// now, 1 a new player's smaller first home.
// At most so many fish a tank, whatever their size (Yozi 2026-11-18), on
// top of the spaces (big fish take more, so a wall tank holds 15 orcas).
const MAX_FISH = { 'tank-s': 10, 'tank-m': 25, 'tank-l': 40, 'tank-wall': 60 };
export const TANKS = [
  ['tank-s', '🐟', [0.8, 0.4], 0.7, 0.45, 20, 'S', 1, 30000, { en: 'Small fish tank', ko: '작은 어항', ja: '小さな水槽', zh: '小鱼缸' }],
  ['tank-m', '🐠', [1.3, 0.5], 0.6, 0.7, 50, 'M', 1, 80000, { en: 'Fish tank', ko: '중간 어항', ja: '中くらいの水槽', zh: '中型鱼缸' }],
  ['tank-l', '🐡', [2.1, 0.6], 0.5, 1.0, 80, 'L', 1, 250000, { en: 'Large fish tank', ko: '대형 어항', ja: '大きな水槽', zh: '大型鱼缸' }],
  ['tank-wall', '🐋', [3.6, 0.8], 0.3, 1.9, 120, 'XL', 1, 600000, { en: 'Wall aquarium', ko: '벽 수조', ja: '壁一面の水槽', zh: '墙面水族箱' }],
].map(([id, emoji, size, stand, h, spaces, max, needsHomeLevel, price, name]) => ({ id, emoji, size, stand, h, spaces, max, needsHomeLevel, price, name, fish: MAX_FISH[id] }));
// The water inside a tank, in the piece's own frame: x and z half-widths,
// and the floor (top of the sand) and surface heights.
export const waterOf = (t) => ({ hx: t.size[0] / 2 - 0.05, hz: t.size[1] / 2 - 0.05, y0: t.stand + 0.07, y1: t.stand + t.h - 0.06 });
export const tankById = (id) => TANKS.find((t) => t.id === id) || null;
export const isTank = (id) => !!tankById(id);

// Typical adult length in metres (a manta: its width; plants: their own
// rule below). Drives the size class and how long the fish is drawn.
export const REAL_LENGTH = {
  loach: 0.15, anchovy: 0.12, minnow: 0.12, crucian: 0.2, ricefish: 0.035, carp: 0.6, sardine: 0.2, herring: 0.3,
  wakame: 0.6, mackerel: 0.35, saury: 0.3, shrimp: 0.08, kelp: 0.6, scallop: 0.12, 'gizzard-shad': 0.25,
  seabream: 0.4, catfish: 0.6, trout: 0.5, salmon: 0.7, jellyfish: 0.3, bluegill: 0.2, crab: 0.15, rockfish: 0.3,
  flounder: 0.5, 'softshell-turtle': 0.3, 'red-lionfish': 0.35, octopus: 0.6, 'sea-cucumber': 0.25, 'sea-urchin': 0.08,
  starfish: 0.2, yellowtail: 1.0, cutlassfish: 1.2, sunfish: 2.5, clownfish: 0.09, puffer: 0.3, cuttlefish: 0.35,
  lobster: 0.5, 'blue-tang': 0.25, seahorse: 0.12, butterflyfish: 0.2, 'electric-eel': 2.0, moray: 1.5, dolphin: 2.6,
  tuna: 2.0, shark: 4.5, marlin: 3.5, axolotl: 0.23, 'sea-turtle': 1.0, anglerfish: 0.6, beluga: 4.5, orca: 7,
  dugong: 3, 'giant-squid': 10, blobfish: 0.3, manta: 5, whale: 25,
};
export const CLASSES = ['S', 'M', 'L', 'XL'];
export const SPACES = { S: 1, M: 2, L: 4, XL: 8 };
// S under 25 cm, M under 70 cm, L under 2 m, XL from 2 m.
export function sizeClass(id) {
  const m = REAL_LENGTH[id];
  if (!m) return null;
  return m < 0.25 ? 'S' : m < 0.7 ? 'M' : m < 2 ? 'L' : 'XL';
}
export const spacesOf = (id) => SPACES[sizeClass(id)] || 0;
// Drawn length in the tank (metres): the square root of the real length, so
// four times longer looks twice as long (Yozi 2026-11-17: in proportion,
// but a whale can't be 800 ricefish), as big as the tanks allow (Yozi: the
// tanks are big enough for bigger fish). The XL ones (only in the wall
// aquarium) a third bigger again (Yozi: leave the small ones, grow orcas and
// the like). A 3.5 cm ricefish is 8 cm, a carp 33 cm, a salmon 36 cm, an
// orca 1.5 m. (Yozi 2026-11-18 tried a quarter of the real length, like the
// map: too small to see in the aquarium, and the home tanks looked empty.)
export const shownLength = (id) => Math.min(2.8, (sizeClass(id) === 'XL' ? 1.3 : 1) * 0.08 * Math.sqrt((REAL_LENGTH[id] || 0.1) / 0.035));
// Too big for any home tank (Yozi 2026-11-18): the blue whale and the giant
// squid stay in the aquarium and the fish book.
export const NO_TANK = new Set(['whale', 'giant-squid']);

// Where in the tank it lives: swimming, on the sand, or planted.
const FLOOR = new Set(['flounder', 'crab', 'lobster', 'starfish', 'sea-urchin', 'sea-cucumber', 'scallop', 'octopus', 'seahorse']);
const PLANT = new Set(['wakame', 'kelp']);
export const zoneOf = (id) => (PLANT.has(id) ? 'plant' : FLOOR.has(id) ? 'floor' : 'swim');

export const fits = (tank, id) => !!tank && !!sizeClass(id) && !NO_TANK.has(id) && CLASSES.indexOf(sizeClass(id)) <= CLASSES.indexOf(tank.max);
export const used = (list) => list.reduce((a, id) => a + spacesOf(id), 0);
// Why a fish can't go in (null: it can): 'size' too big for the tank,
// 'one' that big (XL) kind is in already, 'full' no room left.
export function blockedBy(tank, list, id) {
  if (!fits(tank, id)) return 'size';
  if (sizeClass(id) === 'XL' && list.includes(id)) return 'one'; // one of each big kind a tank (Yozi 2026-11-18)
  if (list.length >= tank.fish || used(list) + spacesOf(id) > tank.spaces) return 'full';
  return null;
}

// A tank's list from storage or from another player's game: known fish that
// fit, inside its spaces.
export function cleanList(tankId, a) {
  const tank = tankById(tankId);
  if (!tank || !Array.isArray(a)) return [];
  const out = [];
  for (const id of a) {
    if (typeof id !== 'string' || !fishById(id)) continue;
    const why = blockedBy(tank, out, id);
    if (!why || why === 'one') out.push(id); // (two of a big kind put in before that rule stay)
  }
  return out;
}

const KEY = 'mk.tanks';
export class TankStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* ignore */ }
    this.c = {};
    for (const t of TANKS) { const l = cleanList(t.id, raw[t.id]); if (l.length) this.c[t.id] = l; }
  }
  list(tankId) { return this.c[tankId] || []; }
  // Bag → tank. Returns null when done, or why not ('size', 'full', 'none').
  put(bag, tankId, fishId) {
    const tank = tankById(tankId), list = this.list(tankId);
    if (!bag.count(fishId)) return 'none';
    const why = blockedBy(tank, list, fishId);
    if (why) return why;
    bag.sell(fishId, 1); // (out of the bag; sell() here only takes it out, the coins are ignored)
    this.c[tankId] = [...list, fishId];
    this._save();
    return null;
  }
  // Tank → bag. Returns null when done, or 'bagFull' / 'none'.
  take(bag, tankId, fishId) {
    const list = this.list(tankId), i = list.lastIndexOf(fishId);
    if (i < 0) return 'none';
    if (bag.size >= BAG_MAX || !bag.add(fishId)) return 'bagFull';
    this.c[tankId] = list.filter((_, k) => k !== i);
    if (!this.c[tankId].length) delete this.c[tankId];
    this._save();
    return null;
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.c)); } catch { /* storage blocked */ } }
}
