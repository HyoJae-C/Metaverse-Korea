#!/usr/bin/env node
// The Han in front of Nanji, where no map had it: a strip about 40 m wide
// right across the river (the base map, scripts/build-base.mjs, stops its
// water 40 m short of Nanji's own river, which ends on a straight line) and
// the south bank's stretch the base map left out round the district boxes.
// The boats from Magok to Mangwon sail through here (scripts/build-boat-taxi.mjs).
//
// What it writes: region.json "water" entries (id "nanji-gap"): the real Han
// from OpenStreetMap at 1/4 (scripts/data/seoul/water.json) inside BOX, less
// the water the map already has there and anything built on the land (roads
// with their pavements, buildings). Each piece is kept under 20,000 m2, so
// build-base does not treat it as a big river and cut its own water round it.
//
//   node scripts/han-gap-nanji.mjs   then  node scripts/build-closed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame } from '../src/core/seoul-grid.js';
import { loadRegionMap } from '../src/core/districts.js';
import { simplify } from './city/geom.mjs';
import { pointInPoly } from '../src/core/collision.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const read = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

export const ID = 'nanji-gap';
export const BOX = [-4480, -780, -3700, -410]; // x0, z0, x1, z1: Nanji's stretch of the Han, and west to Gayang Bridge
export const SPLIT = [-4140, -3950]; // cut across here, to keep each piece under MAX_AREA
const MAX_AREA = 20000; // m2 (build-base cuts its water round any bigger region water)
const MIN_AREA = 20; // m2: smaller slivers are left out (a spike's wedge in the base water, about 30 m2, is kept)
const PAD = 2; // m of land kept beside a road's edge
const SEAM = 1.5; // m the real river is widened by, to close the seams between its OSM parts

const ring = (p) => [...p, p[0]];
// A band h m each side of the segment a-b (squared ends), as a polygon.
const band = ([ax, az], [bx, bz], h) => {
  const L = Math.hypot(bx - ax, bz - az) || 1, ux = ((bx - ax) / L) * h, uz = ((bz - az) / L) * h;
  return [ring([[ax - ux - uz, az - uz + ux], [bx + ux - uz, bz + uz + ux], [bx + ux + uz, bz + uz - ux], [ax - ux + uz, az - uz - ux]])];
};
// A ring's inside as the game sees it (collision's pointInPoly, even-odd):
// the xor of the fan of triangles from its first point.
const evenOdd = (p) => polygonClipping.xor(...p.slice(1, -1).map((q, i) => [ring([p[0], q, p[i + 2]])]).filter((t) => polyArea(t[0].slice(0, -1)) > 1e-6));
export const polyArea = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };

export async function buildNanjiGap() {
  const region = read('region.json');
  const map = await loadRegionMap({ ...region, water: (region.water || []).filter((w) => w.id !== ID), boatTaxi: undefined }, async (f) => read(f));
  const [X0, Z0, X1, Z1] = BOX;
  const box = [ring([[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]])];
  const near = (p) => p.some(([x, z]) => x > X0 - 50 && x < X1 + 50 && z > Z0 - 50 && z < Z1 + 50);
  const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'seoul', 'water.json'), 'utf8')).water;
  const polys = osm.map((a) => [ring(a.o.map((q) => toGame(...q))), ...(a.h || []).map((h) => ring(h.map((q) => toGame(...q))))]).filter((p) => near(p[0]));
  const real = [];
  for (const poly of polys) {
    // (Its seams widened by SEAM: OSM draws the river in parts, and two
    // parts' edges, simplified apart, leave a thin dry line between them. A
    // seam: an edge with another part of the river just outside it.)
    const others = polys.filter((q) => q !== poly);
    const seam = (a, b) => {
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      return [1, -1].every((k) => [poly, ...others].some((q) => pointInPoly(mx + nx * k * 2, mz + nz * k * 2, q[0])));
    };
    const edges = poly.flatMap((r) => r.slice(1).map((b, i) => [r[i], b])).filter(([a, b]) => seam(a, b)).map(([a, b]) => band(a, b, SEAM));
    real.push(...polygonClipping.intersection(edges.length ? polygonClipping.union([poly], ...edges) : [poly], box));
  }
  // (Even-odd: one base outline runs out to a spike and back, and the thin
  // wedge beside it is dry in the game though polygon-clipping alone would
  // call it water.)
  const have = map.areas.filter((a) => a.k === 'water' && near(a.p)).map((a) => evenOdd(a.p));
  const built = [];
  for (const r of map.roads) {
    for (let i = 1; i < r.p.length; i++) { const q = band(r.p[i - 1], r.p[i], (r.w || 6) / 2 + PAD); if (near(q[0])) built.push(q); }
  }
  for (const b of map.buildings) if (b.p && near(b.p)) built.push([ring(b.p)]);
  const gap = polygonClipping.difference(polygonClipping.union(...real.map((p) => [p])), ...have, ...built);
  // Cut into strips at SPLIT.
  const xs = [X0, ...SPLIT, X1];
  const out = [];
  for (let k = 0; k + 1 < xs.length; k++) {
    const strip = [ring([[xs[k], Z0], [xs[k + 1], Z0], [xs[k + 1], Z1], [xs[k], Z1]])];
    for (const q of polygonClipping.intersection(gap, [strip])) {
      const p = simplify(q[0].slice(0, -1), 0.3, true).map(([x, z]) => [r1(x), r1(z)]);
      if (p.length < 3 || polyArea(p) < MIN_AREA) continue;
      if (polyArea(p) >= MAX_AREA) throw new Error(`a piece is ${Math.round(polyArea(p))} m2: add a SPLIT`);
      out.push(p);
    }
  }
  return out.map((p) => ({
    id: ID, p,
    note: "Han River in front of Nanji, which no map had (a strip right across the river, and the south bank's edge): the real river at 1/4 (OpenStreetMap), less the water already there and the roads (scripts/han-gap-nanji.mjs).",
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const pieces = await buildNanjiGap();
  // region.json is hand-formatted, one river per line: this one's lines go last.
  const file = path.join(R, 'region.json');
  let text = readFileSync(file, 'utf8');
  const i = text.indexOf('"water": [\n') + '"water": [\n'.length, k = text.indexOf('\n  ],', i);
  if (i < 20 || k < 0) throw new Error('region.json "water" not found');
  const lines = text.slice(i, k).split('\n').map((l) => l.replace(/,$/, '')).filter((l) => !l.includes(`"id":"${ID}"`));
  const all = [...lines, ...pieces.map((w) => '    ' + JSON.stringify(w))];
  text = text.slice(0, i) + all.join(',\n') + text.slice(k);
  JSON.parse(text);
  writeFileSync(file, text);
  for (const p of pieces) console.log('piece', Math.round(polyArea(p.p)), 'm2,', p.p.length, 'points');
}
