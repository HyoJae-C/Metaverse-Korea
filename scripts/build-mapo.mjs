#!/usr/bin/env node
// Builds the two Mapo-gu districts west and north of Hongdae, and
// puts their shops on the street:
//
//   Yeonnam-dong (districts/yeonnam.json): drawn at 1/4 on its real
//     streets by scripts/build-yeonnam.mjs: the Gyeongui Line Forest Park
//     ("Yeontral Park") running north-north-west from Hongik Univ. Station,
//     with small shops, cafés and a Chinese restaurant either side.
//   Mangwon-dong (districts/mangwon.json): drawn at 1/4 on its real
//     streets by scripts/build-mangwon.mjs (Mangwon Market, Poeun-ro, the
//     Han River park); this script writes it and places its shops.
//
// Street names are the real ones; every shop is fictional (sample data).
//
//   node scripts/build-mapo.mjs   writes both maps and sets the "at" of the
//                                 shops listed in SHOPS in stores.json
//                                 (world metres, using each district's offset
//                                 in region.json)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mangwon, SHOPS as MANGWON_SHOPS } from './build-mangwon.mjs';
import { yeonnam, GROUPS as YEONNAM_GROUPS } from './build-yeonnam.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const readJson = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

// Which lot each shop takes: [row, index along the row] (Mangwon), or
// groups of shops taking their rows' lots in order (Yeonnam).
const SHOPS = {};

const mw = mangwon();
SHOPS.mangwon = MANGWON_SHOPS;
const FIXED = { mangwon: mw.fixed };
const region = readJson('region.json');
const built = { yeonnam: yeonnam(region.districts.find((x) => x.id === 'yeonnam').offset), mangwon: mw };
for (const [rows, ids] of YEONNAM_GROUPS) {
  const free = rows.flatMap((r) => (built.yeonnam.lots[r] || []).map((at, i) => [r, i]));
  if (free.length < ids.length) throw new Error(`${rows}: ${free.length} lots for ${ids.length} shops`);
  ids.forEach((sid, i) => { (SHOPS.yeonnam ||= {})[sid] = free[i]; });
}
// stores.json is hand-formatted, so only the "at" of each placed shop is
// rewritten in the text.
let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
function setAt(sid, at) {
  const i = stores.indexOf(`"id": "${sid}"`);
  if (i < 0) { console.log(`${sid}: not in stores.json`); return; }
  let end = stores.indexOf('\n    {', i);
  if (end < 0) end = stores.length;
  const part = stores.slice(i, end).replace(/"at": \[[^\]]*\]/, `"at": [${at[0]}, ${at[1]}]`);
  stores = stores.slice(0, i) + part + stores.slice(end);
}
for (const [id, { map, lots }] of Object.entries(built)) {
  writeFileSync(path.join(R, 'districts', id + '.json'), JSON.stringify(map) + '\n');
  const d = region.districts.find((x) => x.id === id);
  if (!d) { console.log(`${id}: not in region.json yet, shops not placed`); continue; }
  const [ox, oz] = d.offset;
  const spots = { ...FIXED[id] };
  for (const [sid, [rowId, i]] of Object.entries(SHOPS[id])) {
    const at = lots[rowId]?.[i];
    if (!at) throw new Error(`${sid}: no lot ${rowId}[${i}] (row has ${lots[rowId]?.length || 0})`);
    spots[sid] = at;
  }
  for (const [sid, [x, z]] of Object.entries(spots)) setAt(sid, [r1(x + ox), r1(z + oz)]);
  if (id === 'mangwon') console.log(`park stamp stand: [${r1(mw.stamp.at[0] + ox)}, ${r1(mw.stamp.at[1] + oz)}], ry ${mw.stamp.ry}; market south gate [${r1(mw.market.south[0] + ox)}, ${r1(mw.market.south[1] + oz)}]`);
  console.log(`${id}: ${map.buildings.length} buildings, ${Object.keys(spots).length} shops placed`);
  if (process.argv.includes('--lots')) for (const [k, v] of Object.entries(lots)) console.log('  ', k, v.length);
}
writeFileSync(path.join(R, 'stores.json'), stores);
