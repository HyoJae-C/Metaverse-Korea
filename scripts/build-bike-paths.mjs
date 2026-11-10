#!/usr/bin/env node
// The Han River bike paths on their real lines at 1/4, from OpenStreetMap's
// cycleways (scripts/data/han-bike-osm.json; © OpenStreetMap contributors,
// ODbL). They are region.json links drawn red (bike: true, core/world.js):
//
//   north: Mangwon's river path → Seogang Bridge's north end → Jamsu Bridge's
//          north end → Seongsu's Han River Path (the Han River Bike Path)
//   south: from the Saetgang's mouth (by Yeouido's east tip) east along the
//          south bank to Banpo-Jamwon park's river path, and from its east
//          end on past Apgujeong and Cheongdam, over Tancheon's mouth, to
//          Jamsil Bridge (Songpa-daero)
//
// Most of the south bank is closed land (scripts/build-closed.mjs); the
// bike path stays open through it, with a narrow verge (build-closed.mjs BIKE_MARGIN).
//
// The cycleways are the shortest way along OpenStreetMap's cycleway network
// between the legs' ends, preferring the ones named 한강 (Han River) over
// unnamed ones and access ramps. Where the real path turns inland to cross a
// stream the game doesn't draw (Jungnangcheon) or draws narrower
// (Tancheon), the loop is cut straight across (LOOP). Then it is simplified
// to SIMPLIFY m.
//
//   node scripts/build-bike-paths.mjs                    rewrites the links in region.json
//   node scripts/build-bike-paths.mjs --osm bike-osm.json   first re-reads an Overpass export:
//     [out:json];(way["highway"="cycleway"](37.49,126.88,37.57,127.14);
//     way["cycleway"](…);way["bicycle"="designated"](…););out geom;
//
// Run scripts/build-closed.mjs after it, so the closed land opens along them.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { BRIDGE_NORTH, JAMSU_NORTH } from './han-bank.mjs';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const DATA = path.join(root, 'scripts', 'data', 'han-bike-osm.json');
const r1 = (v) => Math.round(v * 10) / 10;

export const BIKE_W = 6;
const SIMPLIFY = 0.6; // m
const LOOP = { gap: 100, ratio: 2.5 }; // cut a detour whose ends are < gap m apart and it is > ratio × longer

// The ends of each leg, kept exactly: other roads end there.
const MANGWON_JOIN = [-3224.8, -8.4]; // Mangwon's river path (scripts/build-mangwon.mjs)
const SEONGSU_JOIN = [-465, 119]; // Seongsu's Han River Path
const BANPO_WEST = [-1372.8, 995]; // Banpo-Jamwon park's river path, its two ends
const BANPO_EAST = [-1154.6, 828.9];
const SONGPA_DAERO = [[754.8, 501.4], [907, 749]]; // Jamsil Bridge, over the river
// Where each leg starts and ends (the OpenStreetMap node nearest to it), and
// the points it must pass (spliced into the line where it comes nearest).
export const LEGS = {
  north: { from: MANGWON_JOIN, to: SEONGSU_JOIN, via: [BRIDGE_NORTH, JAMSU_NORTH] },
  southWest: { from: [-2440, 835], to: BANPO_WEST, via: [] },
  southEast: { from: BANPO_EAST, to: [870, 650], via: [] },
};

// ---- OpenStreetMap → legs (only with --osm) ----
function fromOsm(file) {
  const osm = JSON.parse(readFileSync(file, 'utf8'));
  const pos = new Map(), adj = new Map();
  const cost = (t) => { const n = t.name || ''; if (/출입로|나들목/.test(n)) return 4; if (/한강/.test(n)) return 1; return n ? 2.5 : 1.6; };
  for (const e of osm.elements) {
    if (e.type !== 'way' || e.tags?.highway !== 'cycleway') continue;
    const c = cost(e.tags);
    e.nodes.forEach((id, i) => pos.set(id, toGame(e.geometry[i].lat, e.geometry[i].lon)));
    for (let i = 1; i < e.nodes.length; i++) {
      const a = e.nodes[i - 1], b = e.nodes[i], p = pos.get(a), q = pos.get(b), L = Math.hypot(p[0] - q[0], p[1] - q[1]) * c;
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push([b, L]);
      adj.get(b).push([a, L]);
    }
  }
  const near = ([x, z]) => { let best, bd = Infinity; for (const id of adj.keys()) { const p = pos.get(id), d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = id; } } return best; };
  const route = (a, b) => {
    const s = near(a), t = near(b), dist = new Map([[s, 0]]), prev = new Map(), done = new Set(), heap = [[0, s]];
    while (heap.length) {
      let mi = 0;
      for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[mi][0]) mi = i;
      const [d, u] = heap.splice(mi, 1)[0];
      if (done.has(u)) continue;
      done.add(u);
      if (u === t) break;
      for (const [v, w] of adj.get(u)) if (d + w < (dist.get(v) ?? Infinity)) { dist.set(v, d + w); prev.set(v, u); heap.push([d + w, v]); }
    }
    const out = [];
    for (let u = t; u !== undefined; u = prev.get(u)) out.push(pos.get(u).map(r1));
    return out.reverse();
  };
  const legs = Object.fromEntries(Object.entries(LEGS).map(([k, l]) => [k, route(l.from, l.to)]));
  writeFileSync(DATA, JSON.stringify({
    note: 'The Han River bike paths: OpenStreetMap cycleways (highway=cycleway), the shortest way along them between each leg\'s ends (scripts/build-bike-paths.mjs LEGS), in game metres at 1/4 (toGame). Overpass export of 2026-11-10, bbox 37.49,126.88,37.57,127.14.',
    credit: '© OpenStreetMap contributors (ODbL)',
    legs,
  }) + '\n');
  return legs;
}

// ---- legs → game paths ----
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function cutLoops(p) {
  const out = p.slice();
  for (let i = 0; i < out.length; i++) {
    let along = 0, cut = -1;
    for (let j = i + 1; j < out.length; j++) {
      along += dist(out[j - 1], out[j]);
      const d = dist(out[i], out[j]);
      if (j > i + 2 && d < LOOP.gap && along > d * LOOP.ratio + 40) cut = j;
      if (along > 1200) break;
    }
    if (cut > 0) out.splice(i + 1, cut - i - 1);
  }
  return out;
}
function project(q, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L)) : 0;
  return { t, d: Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz) };
}
// Put q into the line where it comes nearest (it must be within 20 m).
function splice(p, q) {
  let bi = 1, bd = Infinity;
  for (let i = 1; i < p.length; i++) { const { d } = project(q, p[i - 1], p[i]); if (d < bd) { bd = d; bi = i; } }
  if (bd > 20) throw new Error(`${q} is ${bd.toFixed(1)} m off the bike path`);
  p.splice(bi, 0, q);
  // (the real points just either side would make a kink round it)
  while (bi + 1 < p.length - 1 && dist(p[bi + 1], q) < 8) p.splice(bi + 1, 1);
  while (bi - 1 > 0 && dist(p[bi - 1], q) < 8) { p.splice(bi - 1, 1); bi--; }
  return bd;
}
// Drop the first real points while they lead back past the end that joins
// another path (the nearest cycleway node can lie a little beyond it).
function trimEnds(p) {
  while (p.length > 2 && dist(p[0], p[2]) < dist(p[0], p[1])) p.splice(1, 1);
  while (p.length > 2 && dist(p.at(-1), p.at(-3)) < dist(p.at(-1), p.at(-2))) p.splice(-2, 1);
  return p;
}
function simplify(p, eps, keep) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p.at(-1)];
  let md = -1, mi = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = keep.has(p[i]) ? Infinity : project(p[i], a, b).d;
    if (d > md) { md = d; mi = i; }
  }
  return md > eps ? [...simplify(p.slice(0, mi + 1), eps, keep).slice(0, -1), ...simplify(p.slice(mi), eps, keep)] : [a, b];
}
// Where segment a-b crosses c-d (the point), or null.
function crossAt(a, b, c, d) {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (!den) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { at: [r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)], t } : null;
}

// Every STEP m along p, and off whatever is solid: where the game's bank
// (simplified) or a district's water comes over the real path, the point
// moves straight across the path to the nearest spot CLEAR m from it (at
// most MAX_NUDGE m; the moves are listed in `nudged`).
const STEP = 4, CLEAR = 2, MAX_NUDGE = 20;
function keepClear(p, solid, keep, nudged) {
  const out = [];
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], L = dist(a, b), n = Math.max(1, Math.ceil(L / STEP));
    const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    if (keep.has(a)) out.push(a);
    for (let k = keep.has(a) ? 1 : 0; k < n; k++) {
      const q = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      if (!solid.blocked(q[0], q[1], CLEAR)) { out.push(q); continue; }
      let moved = null;
      for (let d = 0.5; d <= MAX_NUDGE && !moved; d += 0.5) {
        for (const s of [1, -1]) {
          const x = q[0] + nx * d * s, z = q[1] + nz * d * s;
          if (!solid.blocked(x, z, CLEAR)) { moved = [x, z]; break; }
        }
      }
      if (!moved) throw new Error(`the bike path at ${q.map(Math.round)} is more than ${MAX_NUDGE} m into something solid`);
      nudged.push({ d: dist(q, moved), at: q.map(Math.round) });
      out.push(moved);
    }
  }
  out.push(p.at(-1));
  return out;
}

export function bikePaths(legs, solid = { blocked: () => false }) {
  const nudged = [];
  const make = (raw, { from, via = [], ends = [from] }) => {
    let p = trimEnds(cutLoops(raw));
    const keep = new Set();
    for (const q of via) { splice(p, q); keep.add(q); }
    for (const q of ends) keep.add(q);
    p = keepClear(p, solid, keep, nudged);
    p = simplify(p, SIMPLIFY, keep).map((q) => (keep.has(q) ? q : q.map(r1)));
    return p;
  };
  // north: exactly from Mangwon's path to Seongsu's
  const north = make([MANGWON_JOIN, ...legs.north, SEONGSU_JOIN], { from: MANGWON_JOIN, via: [BRIDGE_NORTH, JAMSU_NORTH], ends: [MANGWON_JOIN, SEONGSU_JOIN] });
  const southWest = make([...legs.southWest, BANPO_WEST], { from: legs.southWest[0], ends: [BANPO_WEST] });
  // south-east: from Banpo's path to where it meets Jamsil Bridge
  let se = [BANPO_EAST, ...legs.southEast];
  for (let i = 1; i < se.length; i++) {
    const c = crossAt(se[i - 1], se[i], ...SONGPA_DAERO);
    if (c) { se = [...se.slice(0, i), c.at]; break; }
  }
  const southEast = make(se, { from: BANPO_EAST, ends: [BANPO_EAST, se.at(-1)] });
  return { paths: { north, southWest, southEast }, nudged };
}

const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });
export const NAMES = {
  north: name('Han River Bike Path', '한강 자전거길', '漢江自転車道', '汉江自行车道'),
  southWest: name('Han River Bike Path (south bank)', '한강 남쪽 자전거길', '漢江自転車道（南岸）', '汉江自行车道（南岸）'),
  southEast: name('Han River Bike Path (south bank)', '한강 남쪽 자전거길', '漢江自転車道（南岸）', '汉江自行车道（南岸）'),
};
const NOTES = {
  north: 'The north-bank Han River bike path on its real line at 1/4 (OpenStreetMap cycleways, scripts/build-bike-paths.mjs): from Mangwon Han River Park\'s path past the north ends of Seogang Bridge and Jamsu Bridge to Seongsu\'s Han River Path.',
  southWest: 'The south-bank Han River bike path on its real line at 1/4 (OpenStreetMap, scripts/build-bike-paths.mjs): from the Saetgang\'s mouth by Yeouido east through Dongjak and Seocho to Banpo-Jamwon park\'s river path. Open through the closed land.',
  southEast: 'The south-bank Han River bike path on its real line at 1/4 (OpenStreetMap, scripts/build-bike-paths.mjs): from Banpo-Jamwon park east past Apgujeong and Cheongdam, over Tancheon\'s mouth, to Jamsil Bridge. Open through the closed land. Why off the real line: by Apgujeong (x -155..-20) Seongsu\'s river cuts the real bank straight, so the path keeps up to 20 m south of its real line there.',
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const i = process.argv.indexOf('--osm');
  const legs = i > 0 ? fromOsm(process.argv[i + 1]) : JSON.parse(readFileSync(DATA, 'utf8')).legs;
  const file = path.join(R, 'region.json');
  let text = readFileSync(file, 'utf8');
  // What is solid: everything but the bike paths themselves and the closed land.
  const region = JSON.parse(text);
  region.links = region.links.filter((l) => !l.bike);
  delete region.closed;
  const map = await loadRegionMap(region, async (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8')));
  const { paths, nudged } = bikePaths(legs, new CollisionMap(map.buildings.concat(map.blockers || [])));
  nudged.sort((a, b) => a.d - b.d);
  const far = nudged.filter((n) => n.d > 10);
  console.log(`${nudged.length} points moved off the water's edge or a blocker: median ${(nudged[nudged.length >> 1]?.d || 0).toFixed(1)} m, most ${(nudged.at(-1)?.d || 0).toFixed(1)} m; over 10 m: ${far.map((n) => `${n.at} (${n.d.toFixed(1)})`).join(", ") || "none"}`);
  // Drop the old bike-path links, then add these after "To the Han River".
  text = text.replace(/^ {4}\{"k": "walk", "w": \d+, ("bike": true, )?"p": \[[^\n]*"en": "Han River Bike Path[^"]*"[^\n]*\},?\n/gm, '');
  const lines = Object.entries(paths).map(([k, p]) => '    ' + JSON.stringify({ k: 'walk', w: BIKE_W, bike: true, p, n: NAMES[k], note: NOTES[k] }).replace(/,"/g, ', "').replace(/":/g, '": '));
  const at = text.match(/^ {4}\{"k": "walk", "w": 5, "p": \[[^\n]*"en": "To the Han River"[^\n]*\n/m);
  if (!at) throw new Error('"To the Han River" not found');
  const before = at[0].endsWith(',\n') ? at[0] : at[0].replace(/\n$/, ',\n');
  const last = text.indexOf(at[0]) + at[0].length;
  const tail = text.slice(last);
  const closesList = /^ {2}\]/.test(tail);
  text = text.slice(0, text.indexOf(at[0])) + before + lines.join(',\n') + (closesList ? '\n' : ',\n') + tail;
  writeFileSync(file, text);
  for (const [k, p] of Object.entries(paths)) {
    let L = 0;
    for (let j = 1; j < p.length; j++) L += dist(p[j - 1], p[j]);
    console.log(`${k}: ${p.length} points, ${Math.round(L)} m (real ${(L * 4 / 1000).toFixed(1)} km)`);
  }
}
