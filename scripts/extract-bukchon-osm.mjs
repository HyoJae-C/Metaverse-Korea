#!/usr/bin/env node
// Pulls Bukchon's streets, its big (non-hanok) buildings, the Bukchon 8 Views
// and the ground height out of Yozi's exports (2026-11-13: OpenStreetMap via
// Overpass, © OpenStreetMap contributors, ODbL; heights: SRTM 30 m via
// OpenTopoData) into scripts/data/bukchon-osm.json, in Bukchon's own metres
// at 1/4 (x east, z south, (0, 0) at Anguk Station's anchor in region.json).
//   node scripts/extract-bukchon-osm.mjs [osm.json] [elevation.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || '/mnt/project-files/bukchon-real/data/bukchon-osm.json';
const srcE = process.argv[3] || '/mnt/project-files/bukchon-real/data/bukchon-elevation.json';
const osm = JSON.parse(readFileSync(src, 'utf8'));
const ele = JSON.parse(readFileSync(srcE, 'utf8').replace(/^﻿/, ''));
const region = JSON.parse(readFileSync(path.join(root, 'public/regions/another-seoul/region.json'), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'bukchon').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const L = (g) => { const [x, z] = toGame(g.lat, g.lon); return [r1(x - ox), r1(z - oz)]; };
// The box Bukchon takes (district metres), a little more for the streets.
const BOX = [-100, -250, 160, 20];
const inBox = ([x, z], m = 0) => x > BOX[0] - m && x < BOX[2] + m && z > BOX[1] - m && z < BOX[3] + m;
const len = (p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const area = (p) => Math.abs(p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2;

const roads = [], big = [], views = [];
const SKIP_SERVICE = new Set(['parking_aisle', 'driveway', 'drive-through']);
for (const e of osm.elements) {
  const t = e.tags || {};
  if (e.type === 'node' && /^북촌\d경/.test(t.name || '')) {
    const [n, rest] = t.name.split(/경\s*:\s*/);
    views.push({ n: Number(n.replace('북촌', '')), ko: rest.trim(), at: L(e) });
    continue;
  }
  if (e.type !== 'way' || !e.geometry) continue;
  const p = e.geometry.map(L);
  if (!p.some((q) => inBox(q))) continue;
  if (t.highway) {
    if (['sidewalk', 'crossing'].includes(t.footway) || t.highway === 'cycleway' || t.highway === 'platform') continue;
    if (t.highway === 'service' && SKIP_SERVICE.has(t.service)) continue;
    if (!t.name && len(p) < 12) continue;
    roads.push({ k: t.highway, n: t.name || '', p });
  } else if (t.building) {
    const ring = p.slice(0, p.length - 1);
    // Big modern buildings and halls (a hanok lot at 1/4 is far smaller):
    // kept as they are, the rest of the blocks get game-size hanok.
    if (area(ring) >= 70 || ['school', 'university', 'church', 'hotel', 'office', 'apartments', 'civic', 'public'].includes(t.building)) {
      big.push({ k: t.building, n: t.name || '', lv: Number(t['building:levels']) || 0, p: ring });
    }
  }
}
// Heights: metres above Anguk Station's street (40 m above sea level), lightly
// smoothed (SRTM is 30 m cells and picks up roofs and trees).
const pts = ele.map((q) => ({ p: L(q), e: q.ele }));
const G = 8; // grid step (district metres)
const grid = { x0: BOX[0], z0: BOX[1], step: G, nx: Math.round((BOX[2] - BOX[0]) / G) + 1, nz: Math.round((BOX[3] - BOX[1]) / G) + 1, h: [] };
for (let j = 0; j < grid.nz; j++) for (let i = 0; i < grid.nx; i++) {
  const x = grid.x0 + i * G, z = grid.z0 + j * G;
  let num = 0, den = 0;
  for (const q of pts) { const d2 = (q.p[0] - x) ** 2 + (q.p[1] - z) ** 2; if (d2 > 30 * 30) continue; const w = Math.exp(-d2 / (2 * 12 * 12)); num += w * q.e; den += w; }
  grid.h.push(den ? r1(num / den - 40) : 0);
}
roads.sort((a, b) => (a.n || '~').localeCompare(b.n || '~'));
views.sort((a, b) => a.n - b.n);
const out = {
  note: 'Bukchon from OpenStreetMap (© OpenStreetMap contributors, ODbL, exported 2026-11-13) and SRTM 30 m heights (OpenTopoData), at 1/4 in Bukchon\'s district metres (x east, z south). h: real metres above Anguk Station (40 m). Made by scripts/extract-bukchon-osm.mjs.',
  roads, big, views, grid,
};
writeFileSync(path.join(root, 'scripts', 'data', 'bukchon-osm.json'), JSON.stringify(out) + '\n');
console.log(`${roads.length} roads, ${big.length} big buildings, ${views.length} views, grid ${grid.nx}x${grid.nz}, h ${Math.min(...grid.h)}..${Math.max(...grid.h)}`);
