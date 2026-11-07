#!/usr/bin/env node
// Puts each Seoul district on its real place at the Seoul scale (1/4 around
// Seongsu Station, src/core/seoul-grid.js) and checks the layout.
//
// Each district in region.json names an anchor: a real spot (lat/lon) and
// where that spot is in the district's own map ("local", metres):
//
//   { "id": "hongdae", "map": "districts/hongdae.json", "offset": [-2961, -248],
//     "anchor": { "place": "Hongdae busking zone", "lat": 37.5535, "lon": 126.9215, "local": [0, 0] } }
//
//   node scripts/place-districts.mjs           check: offsets match anchors, no two
//                                              districts overlap, each sits in its gu
//   node scripts/place-districts.mjs --apply   move districts whose offset is off, and
//                                              everything placed in world metres with
//                                              them (stores, zones, bikes, homes,
//                                              screens, subway exits, busking, stamps,
//                                              the ends of link roads)
//
// After --apply, look at the link roads between districts on the map: only
// their points near a district move.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { anchorOffset, mapBox, mapParts, boxOverlap, inPolygon, toLatLon } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const read = (f) => readFileSync(f, 'utf8');
const NUM = '(-?\\d+(?:\\.\\d+)?)';
const fmt = (v) => String(Math.round(v * 10) / 10);

// The layout as it is now, and where each district should be.
export function layout(region, maps, seoul) {
  return region.districts.map((d) => {
    const map = maps[d.id];
    const want = d.anchor ? anchorOffset(d.anchor) : d.offset || [0, 0];
    const gu = seoul?.gu?.find((g) => g.district === d.id || (g.districts || []).includes(d.id));
    return { id: d.id, offset: d.offset || [0, 0], want, anchor: d.anchor, box: mapBox(map, d.offset), wantBox: mapBox(map, want), wantParts: mapParts(map, want), gu };
  });
}

// Neighbours may touch: a road or bridge running into the next district's
// edge overlaps by a few metres.
const TOUCH = 30;

// Problems with a layout (at the wanted offsets): districts off their anchor,
// overlapping districts, anchors outside their gu.
export function problems(rows) {
  const out = [];
  for (const r of rows) {
    if (!r.anchor && r.id !== 'seongsu') out.push(`${r.id}: no anchor (add "anchor": { lat, lon, local } in region.json)`);
    const dx = r.want[0] - r.offset[0], dz = r.want[1] - r.offset[1];
    if (Math.hypot(dx, dz) > 1) out.push(`${r.id}: offset ${r.offset} should be ${r.want} (run with --apply)`);
    if (r.gu?.p && r.anchor) {
      const [ax, az] = r.anchor.local || [0, 0];
      if (!inPolygon(ax + r.want[0], az + r.want[1], r.gu.p)) out.push(`${r.id}: anchor is outside ${r.gu.name?.en || r.gu.id}`);
    }
  }
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    let worst = [0, 0];
    for (const a of rows[i].wantParts || [rows[i].wantBox]) for (const b of rows[j].wantParts || [rows[j].wantBox]) {
      const o = boxOverlap(a, b);
      if (Math.min(...o) > Math.min(...worst)) worst = o;
    }
    const [w, d] = worst;
    if (Math.min(w, d) > TOUCH) out.push(`${rows[i].id} and ${rows[j].id} overlap by ${Math.round(w)} x ${Math.round(d)} m`);
  }
  return out;
}

// Which district a world point belongs to: the smallest box holding it, else
// one within 40 m, else none (it stays where it is).
export function ownerOf(rows, x, z) {
  const hold = (m) => rows.filter((r) => x >= r.box.x0 - m && x <= r.box.x1 + m && z >= r.box.z0 - m && z <= r.box.z1 + m);
  const area = (r) => (r.box.x1 - r.box.x0) * (r.box.z1 - r.box.z0);
  const inside = hold(0);
  const pick = inside.length ? inside : hold(40);
  return pick.sort((a, b) => area(a) - area(b))[0] || null;
}

// Shift every [x, z] that `re` finds (groups: before, x, between, z) by the
// move of the district the point is in.
function shiftText(text, re, rows, moved, log, file) {
  return text.replace(re, (all, a, x, b, z) => {
    const r = ownerOf(rows, +x, +z);
    const mv = r && moved[r.id];
    if (!mv) return all;
    log.push(`${file}: [${x}, ${z}] -> [${fmt(+x + mv[0])}, ${fmt(+z + mv[1])}] (${r.id})`);
    return `${a}${fmt(+x + mv[0])}${b}${fmt(+z + mv[1])}`;
  });
}

function apply(rows) {
  const moved = {};
  for (const r of rows) if (Math.hypot(r.want[0] - r.offset[0], r.want[1] - r.offset[1]) > 1) moved[r.id] = [r.want[0] - r.offset[0], r.want[1] - r.offset[1]];
  if (!Object.keys(moved).length) return console.log('Every district is in place.');
  const log = [];
  const AT = new RegExp(`("at"\\s*:\\s*\\[\\s*)${NUM}(\\s*,\\s*)${NUM}`, 'g');
  for (const f of ['stores.json', 'zones.json', 'bikes.json', 'homes.json']) {
    const file = path.join(R, f);
    writeFileSync(file, shiftText(read(file), AT, rows, moved, log, f));
  }
  // region.json: "at" everywhere, the points of link roads, and the offsets.
  const file = path.join(R, 'region.json');
  let t = shiftText(read(file), AT, rows, moved, log, 'region.json');
  const s = t.indexOf('"links"');
  if (s >= 0) {
    let i = t.indexOf('[', s), depth = 0, e = i;
    for (; e < t.length; e++) { if (t[e] === '[') depth++; else if (t[e] === ']' && --depth === 0) break; }
    const PAIR = new RegExp(`(\\[\\s*)${NUM}(\\s*,\\s*)${NUM}(?=\\s*\\])`, 'g');
    t = t.slice(0, i) + shiftText(t.slice(i, e + 1), PAIR, rows, moved, log, 'region.json links') + t.slice(e + 1);
  }
  for (const r of rows) {
    if (!moved[r.id]) continue;
    const at = t.indexOf('"offset"', t.indexOf(`"id": "${r.id}"`));
    const OFF = new RegExp(`("offset"\\s*:\\s*\\[\\s*)${NUM}(\\s*,\\s*)${NUM}`);
    t = t.slice(0, at) + t.slice(at).replace(OFF, (all, a, x, b, z) => `${a}${r.want[0]}${b}${r.want[1]}`);
    log.push(`region.json: ${r.id} offset ${r.offset} -> ${r.want}`);
  }
  writeFileSync(file, t);
  // Stamps (src/data/stamps.js): place: { at: [x, z] }.
  const stamps = path.join(root, 'src', 'data', 'stamps.js');
  writeFileSync(stamps, shiftText(read(stamps), new RegExp(`(\\bat:\\s*\\[\\s*)${NUM}(\\s*,\\s*)${NUM}`, 'g'), rows, moved, log, 'stamps.js'));
  console.log(log.join('\n'));
  console.log(`\nMoved: ${Object.entries(moved).map(([id, [dx, dz]]) => `${id} by [${dx}, ${dz}]`).join(', ')}`);
}

export function loadAll() {
  const region = JSON.parse(read(path.join(R, 'region.json')));
  const maps = Object.fromEntries(region.districts.map((d) => [d.id, JSON.parse(read(path.join(R, d.map)))]));
  let seoul = null;
  try { seoul = JSON.parse(read(path.join(R, 'seoul.json'))); } catch { /* no overview yet */ }
  return { region, maps, seoul };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { region, maps, seoul } = loadAll();
  const rows = layout(region, maps, seoul);
  for (const r of rows) {
    const c = toLatLon((r.wantBox.x0 + r.wantBox.x1) / 2, (r.wantBox.z0 + r.wantBox.z1) / 2);
    console.log(`${r.id.padEnd(14)} offset ${String(r.offset).padEnd(12)} want ${String(r.want).padEnd(12)} ${Math.round(r.wantBox.x1 - r.wantBox.x0)} x ${Math.round(r.wantBox.z1 - r.wantBox.z0)} m  centre ≈ ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}  ${r.gu ? r.gu.name.en : ''}`);
  }
  if (process.argv.includes('--apply')) apply(rows);
  else {
    const p = problems(rows);
    console.log(p.length ? `\n${p.join('\n')}` : '\nLayout OK.');
    process.exitCode = p.length ? 1 : 0;
  }
}
