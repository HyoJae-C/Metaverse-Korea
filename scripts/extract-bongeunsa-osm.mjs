#!/usr/bin/env node
// Pulls Bongeunsa's outline and its named halls out of Yozi's OpenStreetMap
// export round Samseong (/mnt/project-files/osm/coex-samseong.json, 2026-11-09;
// © OpenStreetMap contributors, ODbL) into scripts/data/bongeunsa-osm.json,
// in world metres at 1/4 (src/core/seoul-grid.js toGame).
//   node scripts/extract-bongeunsa-osm.mjs [export.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || '/mnt/project-files/osm/coex-samseong.json';
const osm = JSON.parse(readFileSync(src, 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const ring = (e) => {
  const p = e.geometry.map((g) => toGame(g.lat, g.lon).map(r1));
  const [a, b] = [p[0], p.at(-1)];
  if (a[0] === b[0] && a[1] === b[1]) p.pop();
  return p;
};
const out = { note: 'Bongeunsa (Samseong-dong) from OpenStreetMap at 1/4, world metres (x east, z south). © OpenStreetMap contributors, ODbL. Made by scripts/extract-bongeunsa-osm.mjs.', grounds: null, halls: {} };
for (const e of osm.elements) {
  const t = e.tags || {};
  if (e.type !== 'way' || !e.geometry || t.highway) continue;
  if (e.id === 74010857) out.grounds = ring(e);
  else if ((t.name || '').startsWith('봉은사 ') && t.building) out.halls[t.name.slice(4)] = ring(e);
}
writeFileSync(path.join(root, 'scripts', 'data', 'bongeunsa-osm.json'), JSON.stringify(out, null, 1) + '\n');
console.log('grounds', out.grounds.length, 'points;', Object.keys(out.halls).join(', '));
