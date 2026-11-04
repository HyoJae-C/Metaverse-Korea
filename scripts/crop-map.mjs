#!/usr/bin/env node
// Crops and simplifies a map made from OpenStreetMap, so a district is a
// compact neighbourhood rather than a copy of the real city:
//   - only what lies inside a box (metres around the map origin) is kept;
//     roads and rail are cut at the edge, parks are clipped to it
//   - small buildings, service lanes and short dead-end alleys are dropped,
//     except buildings near a store, home, zone or bike station (shops sit on
//     their walls)
//
//   node scripts/crop-map.mjs seongsu -290 -130 290 500
//
// Writes public/regions/<id>/map.json (the original stays in git history).

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cropMap } from './lib/crop-map.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id = 'seongsu', ...nums] = process.argv.slice(2);
const box = nums.length === 4 ? nums.map(Number) : [-290, -130, 290, 500];
const dir = path.join(root, 'public', 'regions', id);
const json = async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8'));

const region = await json('region.json');
const map = await json(region.districts?.[0]?.map || region.mapFile || 'map.json');
// Points that must keep a building nearby: everything placed on this map.
const R = 6378137, c = region.center;
const mLat = (Math.PI / 180) * R, mLon = mLat * Math.cos((c.lat * Math.PI) / 180);
const pos = (s) => (Array.isArray(s.at) ? s.at : s.anchor ? [(s.anchor.lon - c.lon) * mLon, -(s.anchor.lat - c.lat) * mLat] : null);
const keepNear = [];
for (const [f, k] of [['stores.json', 'stores'], ['homes.json', 'homes'], ['zones.json', 'zones'], ['bikes.json', 'stations']]) {
  try { for (const s of (await json(f))[k] || []) { const p = pos(s); if (p) keepNear.push(p); } } catch { /* no such file */ }
}

const out = cropMap(map, box, { keepNear });
out.meta = { ...(map.meta || {}), cropped: { box, note: 'compact neighbourhood: scripts/crop-map.mjs' } };
await writeFile(path.join(dir, 'map.json'), JSON.stringify(out));
const n = (m) => Object.fromEntries(['roads', 'buildings', 'areas', 'rail'].map((k) => [k, (m[k] || []).length]));
console.log('before', n(map), '\nafter ', n(out));
