#!/usr/bin/env node
// Crops and simplifies a map made from OpenStreetMap, so a district is a
// compact neighbourhood rather than a copy of the real city:
//   - only what lies inside a box (metres around the map origin) is kept;
//     roads and rail are cut at the edge, parks are clipped to it
//   - small buildings, service lanes and short dead-end alleys are dropped,
//     except buildings near a store, home, zone or bike station (shops sit on
//     their walls)
//
//   node scripts/crop-map.mjs seongsu [x0 z0 x1 z1]
//
// The box defaults to region.json "crop", which scripts/fetch-osm.mjs also
// applies, so a fresh download stays compact. Writes public/regions/<id>/map.json.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cropMap, placedPoints } from './lib/crop-map.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id = 'seongsu', ...nums] = process.argv.slice(2);
const dir = path.join(root, 'public', 'regions', id);
const json = async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8'));
const opt = async (f) => { try { return await json(f); } catch { return null; } };

const region = await json('region.json');
const box = nums.length === 4 ? nums.map(Number) : region.crop;
if (!box) throw new Error('No box: pass x0 z0 x1 z1 or set "crop" in region.json');
const map = await json(region.districts?.[0]?.map || region.mapFile || 'map.json');
const docs = Object.fromEntries(await Promise.all(['stores', 'homes', 'zones', 'bikes'].map(async (f) => [f, await opt(`${f}.json`)])));
const out = cropMap(map, box, { keepNear: placedPoints(region, docs) });
out.meta = { ...(map.meta || {}), cropped: { box, note: 'compact neighbourhood: scripts/crop-map.mjs' } };
await writeFile(path.join(dir, 'map.json'), JSON.stringify(out));
const n = (m) => Object.fromEntries(['roads', 'buildings', 'areas', 'rail'].map((k) => [k, (m[k] || []).length]));
console.log('before', n(map), '\nafter ', n(out));
