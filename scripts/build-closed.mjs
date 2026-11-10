#!/usr/bin/env node
// Closes the parts of Seocho-gu and Gangnam-gu that are not built yet
// (region.json "closed"): you can't walk there, the street draws that land
// grey, and the maps draw it grey like a gu that is "coming soon".
//
// What stays open: everything within MARGIN of something built (a road, a
// building, a park or plaza, a landmark, a shop, a subway exit, a meeting
// zone; any point in region.json, stores.json, zones.json or homes.json),
// and the water (the river has its own blockers, with gaps for bridges).
// So Banpo Han River Park, Samseong (KONEXT, Bongeunsa) and the roads to
// them stay as they are; the empty land between and south of them closes.
//
// The closed land is a grid of CELL m squares joined into rectangles, so the
// blockers are simple and quick for collision and the walking grid. Run it
// again after building something new in Seocho or Gangnam (or to open
// another gu's empty land: add it to GU).
//
//   node scripts/build-closed.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mergeDistricts } from '../src/core/districts.js';
import { inPoly } from '../src/core/geom.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const read = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));

export const GU = ['seocho', 'gangnam', 'dongjak']; // (Dongjak: its empty bank was reachable from Banpo past Seocho's edge)
export const CELL = 10; // m
export const MARGIN = 30; // m of open land around anything built
export const BIKE_MARGIN = 6; // m each side of a bike path (scripts/build-bike-paths.mjs): it runs through the closed land, open

export function buildClosed({ region, seoul, maps, extraPoints = [] }) {
  const parts = region.districts.map((d) => ({ ...d, map: maps[d.map] }));
  const map = mergeDistricts(parts, region.links || [], region.water || []);
  const gu = seoul.gu.filter((g) => GU.includes(g.id));
  const water = map.areas.filter((a) => a.k === 'water').map((a) => a.p);
  // (A blocker in the water is the river's, not something built.)
  const mid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  const wet = (p) => { const [x, z] = mid(p); return water.some((w) => inPoly(x, z, w)); };
  const land = map.areas.filter((a) => a.k !== 'water').map((a) => a.p).concat(map.buildings.map((b) => b.p), (map.blockers || []).filter((b) => b.d !== 'link' && !wet(b.p)).map((b) => b.p));

  // Box of the cells: the whole gu, also past the end of the ground, so the
  // map shows all of it closed (out there the fog hides the grey).
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const g of gu) for (const [x, z] of g.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const c0 = Math.floor(x0 / CELL), c1 = Math.ceil(x1 / CELL), r0 = Math.floor(z0 / CELL), r1 = Math.ceil(z1 / CELL);
  const W = c1 - c0, H = r1 - r0;
  const open = new Uint8Array(W * H); // 1: near something built

  // Stamp a disc of open cells around each built point.
  const stamp = (x, z, r) => {
    const rr = r + CELL * 0.71; // (to the cell's farthest corner)
    for (let cz = Math.floor((z - rr) / CELL); cz <= Math.floor((z + rr) / CELL); cz++) {
      for (let cx = Math.floor((x - rr) / CELL); cx <= Math.floor((x + rr) / CELL); cx++) {
        const i = cx - c0, j = cz - r0;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const mx = (cx + 0.5) * CELL, mz = (cz + 0.5) * CELL;
        if (Math.hypot(mx - x, mz - z) <= rr) open[j * W + i] = 1;
      }
    }
  };
  const along = (p, r, closed) => {
    const n = p.length;
    for (let k = 0; k < (closed ? n : n - 1); k++) {
      const [ax, az] = p[k], [bx, bz] = p[(k + 1) % n];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL / 2)));
      for (let s = 0; s <= steps; s++) stamp(ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps, r);
    }
  };
  for (const r of map.roads) along(r.p, (r.bike ? BIKE_MARGIN : MARGIN) + (r.w || 6) / 2, false);
  for (const r of map.rail || []) along(r.p, MARGIN, false);
  for (const p of land) along(p, MARGIN, true);
  for (const p of map.pois) stamp(p.x, p.z, MARGIN);
  for (const l of map.landmarks) if (l.p) along(l.p, MARGIN, true); else if (Number.isFinite(l.x)) stamp(l.x, l.z, MARGIN + (l.r || 0));
  for (const [x, z] of extraPoints) stamp(x, z, MARGIN);

  const inAny = (x, z, polys) => polys.some((p) => inPoly(x, z, p));
  const closed = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (open[j * W + i]) continue;
      const x = (c0 + i + 0.5) * CELL, z = (r0 + j + 0.5) * CELL;
      if (!gu.some((g) => inPoly(x, z, g.p))) continue;
      if (inAny(x, z, water) || inAny(x, z, land)) continue;
      closed[j * W + i] = 1;
    }
  }

  // Runs along each row, then the same run on the rows below joins it.
  const rects = [];
  let prev = new Map(); // "i0,i1" → rect of the row above
  for (let j = 0; j < H; j++) {
    const row = new Map();
    for (let i = 0; i < W;) {
      if (!closed[j * W + i]) { i++; continue; }
      let e = i;
      while (e < W && closed[j * W + e]) e++;
      const key = i + ',' + e;
      const up = prev.get(key);
      if (up) { up[3] = (r0 + j + 1) * CELL; row.set(key, up); } else {
        const r = [(c0 + i) * CELL, (r0 + j) * CELL, (c0 + e) * CELL, (r0 + j + 1) * CELL];
        rects.push(r);
        row.set(key, r);
      }
      i = e;
    }
    prev = row;
  }
  return { rects, cells: closed.reduce((s, v) => s + v, 0) };
}

// Every [x, z] pair (two numbers) and { x, z } anywhere in a JSON value.
export function pointsIn(v, out = []) {
  if (Array.isArray(v)) {
    if (v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n))) out.push(v);
    else for (const e of v) pointsIn(e, out);
  } else if (v && typeof v === 'object') {
    if (Number.isFinite(v.x) && Number.isFinite(v.z)) out.push([v.x, v.z]);
    for (const e of Object.values(v)) pointsIn(e, out);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const region = read('region.json');
  const seoul = read('seoul.json');
  const maps = Object.fromEntries(region.districts.map((d) => [d.map, read(d.map)]));
  const { closed: _old, water: _water, ...rest } = region; // (the river's outline is not something built)
  const extraPoints = pointsIn([rest, read('stores.json'), read('zones.json'), read('homes.json')]);
  const { rects, cells } = buildClosed({ region, seoul, maps, extraPoints });
  const line = `  "closed": { "note": "Not built yet in Seocho, Gangnam and Dongjak (scripts/build-closed.mjs): rectangles [x0, z0, x1, z1] you can't walk into, drawn grey.", "rects": ${JSON.stringify(rects)} },\n`;
  const file = path.join(R, 'region.json');
  let text = readFileSync(file, 'utf8');
  text = text.replace(/^ {2}"closed": .*\n/m, '');
  text = text.replace(/^( {2}"note": )/m, line + '$1');
  JSON.parse(text);
  writeFileSync(file, text);
  console.log(`${rects.length} rectangles, ${((cells * CELL * CELL) / 1e6).toFixed(2)} km² of game land closed`);
}
