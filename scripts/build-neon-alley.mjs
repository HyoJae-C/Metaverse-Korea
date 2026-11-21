#!/usr/bin/env node
// Adds Euljiro 3-ga's neon alley to the Euljiro district
// (public/regions/another-seoul/districts/euljiro.json, a part of its own):
// the narrow lane south of Euljiro 3-ga Station and the diagonal lane it
// meets, with one row of low, old buildings along each side (walls right on
// the lane, like the real one). The signs, wires, lanterns and people come
// with game/neon-alley.js when you come near.
//
// The lanes are in src/data/neon-alley.js (world metres, approx: traced from
// Yozi's Naver capture until an OSM export comes). Every building is
// fictional. What this adds is marked "neon": 1, so running it again
// replaces it.
//
//   node scripts/build-neon-alley.mjs
//
// Run it after scripts/build-euljiro.mjs (which rewrites the district), then
// scripts/build-closed.mjs so the land round it opens.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, rng, overlap, lineDist, name as N4 } from './street-rows.mjs';
import { NEON } from '../src/data/neon-alley.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const base = region.base ? JSON.parse(readFileSync(path.join(R, region.base), 'utf8')) : { roads: [] };

const file = path.join(R, 'districts', 'euljiro.json');
const district = JSON.parse(readFileSync(file, 'utf8'));
const [OX, OZ] = region.districts.find((d) => d.id === 'euljiro').offset;
const L = (q) => [r1(q[0] - OX), r1(q[1] - OZ)]; // world -> district metres
const ANCHOR = NEON.lane[1];
const PART = 'Euljiro 3-ga neon alley';

// Roads already there round it (the base map's Chungmu-ro, Eulji-ro, Mareunnae-ro).
const near = (r) => r.p.some(([x, z]) => Math.abs(x - ANCHOR[0]) < 90 && Math.abs(z - ANCHOR[1]) < 90);
const others = [...base.roads, ...(region.links || [])].filter(near);
const roads = [
  { k: 'walk', w: NEON.width, p: NEON.lane, n: N4('Euljiro Neon Alley', '을지로 네온 골목', '乙支路ネオン横丁', '乙支路霓虹小巷') },
  { k: 'walk', w: NEON.crossWidth, p: NEON.cross },
];

// One row of buildings along each side of a lane, fronts right on the lane.
const rand = rng(321);
const buildings = [];
const WALLS = ['#4d4650', '#5b4d47', '#433f4c', '#6a4c40', '#55504a', '#3e4654'];
const ROOFS = ['#2e2b31', '#35302d', '#2a2d33'];
function clear(p) {
  const probe = [...p, [p.reduce((m, q) => m + q[0], 0) / p.length, p.reduce((m, q) => m + q[1], 0) / p.length]];
  if (probe.some((q) => others.some((r) => lineDist(q, r.p) < r.w / 2 + 1.5))) return false;
  if (probe.some((q) => roads.some((r) => lineDist(q, r.p) < r.w / 2 - 0.05))) return false;
  return buildings.every((b) => !overlap(b.p, p));
}
function row(line, side, w, { from = 0, depth = [5, 7], h = [7, 11], gap = [0, 0.4] } = {}) {
  let s0 = 0;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], n = [-d[1] * side, d[0] * side];
    let s = Math.max(0, from - s0);
    while (s + 2.5 < len) {
      const bw = Math.min(3.2 + rand() * 2.6, len - s), dp = depth[0] + rand() * (depth[1] - depth[0]);
      const off = w / 2;
      const q = (t, o) => [r1(a[0] + d[0] * t + n[0] * o), r1(a[1] + d[1] * t + n[1] * o)];
      const p = [q(s, off), q(s + bw, off), q(s + bw, off + dp), q(s, off + dp)];
      if (bw > 2.4 && clear(p)) {
        const k = buildings.length;
        buildings.push({ h: Math.round(h[0] + rand() * (h[1] - h[0])), p, wall: WALLS[k % WALLS.length], roof: ROOFS[k % ROOFS.length] });
        s += bw + gap[0] + rand() * (gap[1] - gap[0]);
      } else s += 0.8;
    }
    s0 += len;
  }
}
// The neon lane: both sides, all along (its mouths stay open by the roads' margin).
row(NEON.lane, 1, NEON.width);
row(NEON.lane, -1, NEON.width);
// The diagonal lane: a row each side, a little taller (it is a wider lane).
row(NEON.cross, 1, NEON.crossWidth, { h: [8, 13] });
row(NEON.cross, -1, NEON.crossWidth, { h: [8, 13] });

const local = (o) => ({ ...o, p: o.p.map(L), neon: 1 });
const mine = (o) => o.neon === 1;
for (const k of ['roads', 'buildings', 'pois']) district[k] = (district[k] || []).filter((o) => !mine(o));
district.roads.push(...roads.map(local));
district.buildings.push(...buildings.map(local));
district.pois.push({ kind: 'landmark', x: r1(NEON.photo.x - OX), z: r1(NEON.photo.z - OZ), name: N4('Euljiro Neon Alley', '을지로 네온 골목', '乙支路ネオン横丁', '乙支路霓虹小巷'), neon: 1 });
// Its own part box (the district check keeps neighbours out of it).
const all = [...roads, ...buildings].flatMap((o) => o.p).map(L);
const box = [Math.min(...all.map((q) => q[0])), Math.min(...all.map((q) => q[1])), Math.max(...all.map((q) => q[0])), Math.max(...all.map((q) => q[1]))].map(r1);
district.meta.parts = district.meta.parts.filter((p) => !p.why.startsWith(PART)).concat({ why: `${PART} (scripts/build-neon-alley.mjs; lanes approx: ${NEON.why})`, box });
writeFileSync(file, JSON.stringify(district, null, 1) + '\n');
console.log(`neon alley: ${buildings.length} buildings, box ${box}`);
