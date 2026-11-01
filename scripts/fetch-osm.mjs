#!/usr/bin/env node
// Downloads OpenStreetMap data for a region from the Overpass API and writes
// public/regions/<id>/map.json.
//
//   node scripts/fetch-osm.mjs seongsu
//
// Map data © OpenStreetMap contributors, available under the ODbL.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { osmToMap, overpassQuery } from './lib/osm-to-map.mjs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const regionId = process.argv[2] || 'seongsu';
const regionDir = path.join(root, 'public', 'regions', regionId);
const region = JSON.parse(await readFile(path.join(regionDir, 'region.json'), 'utf8'));

const query = overpassQuery(region.bbox);
let data;
for (const url of ENDPOINTS) {
  try {
    console.log(`Querying ${url} ...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'metaverse-korea/0.1 (https://github.com/HyoJae-C/Metaverse-Korea)',
      },
      body: 'data=' + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    break;
  } catch (err) {
    console.warn(`  failed: ${err.message}`);
  }
}
if (!data) {
  console.error('All Overpass endpoints failed.');
  process.exit(1);
}

const map = osmToMap(data, region);
const out = path.join(regionDir, region.mapFile || 'map.json');
await writeFile(out, JSON.stringify(map));
console.log(`Wrote ${path.relative(root, out)}`, map.meta.counts);
