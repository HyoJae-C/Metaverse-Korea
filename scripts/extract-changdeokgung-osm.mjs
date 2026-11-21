#!/usr/bin/env node
// Pulls Changdeokgung (the palace and Huwon, its rear garden) out of the
// OpenStreetMap cut round it (/mnt/project-files/changdeokgung/osm-changdeokgung.json:
// ways of the Korea extract inside 37.576..37.5915 N, 126.985..126.9985 E, made with
// pyosmium by cut.py beside it; © OpenStreetMap contributors, ODbL) into
// scripts/data/changdeokgung-osm.json: the palace outline, and what lies
// inside it: buildings, ponds and streams, paths, walls.
//   node scripts/extract-changdeokgung-osm.mjs [cut.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame, inPolygon } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || '/mnt/project-files/changdeokgung/osm-changdeokgung.json';
const osm = JSON.parse(readFileSync(src, 'utf8'));
const palace = osm.find((o) => o.tags.name === '창덕궁' && o.tags.historic === 'castle');
const P = palace.pts.map(([a, b]) => toGame(a, b));
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const elements = [{ id: palace.id, kind: 'palace', name: '창덕궁', pts: palace.pts.map((p) => p.map(r6)) }];
for (const o of osm) {
  if (o === palace || o.pts.length < 2) continue;
  const t = o.tags, g = o.pts.map(([a, b]) => toGame(a, b));
  const n = g.filter(([x, z]) => inPolygon(x, z, P)).length;
  if (!n) continue;
  const kind = t.building ? 'building' : t.natural === 'water' ? 'water' : t.waterway ? 'stream' : t.highway ? 'path' : /wall/.test(t.barrier || '') ? 'wall' : t.natural === 'sand' ? 'sand' : null;
  if (!kind) continue;
  if (kind === 'building' && n < g.length / 2) continue; // (a neighbour's house on the wall line)
  const e = { id: o.id, kind, pts: o.pts.map((p) => p.map(r6)) };
  if (t.name) e.name = t.name;
  if (t.highway) e.highway = t.highway;
  if (t.building === 'roof') e.roof = 1;
  if (t.barrier) e.barrier = t.barrier;
  elements.push(e);
}
const out = { source: 'OpenStreetMap, © OpenStreetMap contributors, ODbL. Changdeokgung and Huwon, Jongno-gu. Made by scripts/extract-changdeokgung-osm.mjs.', elements };
writeFileSync(path.join(root, 'scripts', 'data', 'changdeokgung-osm.json'), JSON.stringify(out).replace(/\{"id"/g, '\n{"id"') + '\n');
const count = {};
for (const e of elements) count[e.kind] = (count[e.kind] || 0) + 1;
console.log(count);
