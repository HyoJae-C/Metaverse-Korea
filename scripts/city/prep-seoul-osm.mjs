#!/usr/bin/env node
// Whole-Seoul layers out of OpenStreetMap, trimmed to what the base map needs
// (scripts/build-base.mjs): scripts/data/seoul/{roads,water,green}.json, in
// lat/lon, cut to Seoul's outline.
//
// The input is a folder of extracts made from Geofabrik's south-korea
// .osm.pbf by extract.py (kept with the raw file in the project's shared
// folder, seoul-master-plan/osm/extract/; the pbf is too big for the repo):
//
//   node scripts/city/prep-seoul-osm.mjs <extract folder>
//
// © OpenStreetMap contributors (ODbL).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, toLatLon, inPolygon } from '../../src/core/seoul-grid.js';
import { simplify, polyArea } from './geom.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = process.argv[2];
if (!src) { console.error('usage: node scripts/city/prep-seoul-osm.mjs <extract folder>'); process.exit(1); }
const read = (f) => JSON.parse(readFileSync(path.join(src, f), 'utf8'));
const seoul = JSON.parse(readFileSync(path.join(root, 'public/regions/another-seoul/seoul.json'), 'utf8'));
const out = path.join(root, 'scripts/data/seoul');
mkdirSync(out, { recursive: true });

const gus = seoul.gu.map((g) => g.p);
const inSeoul = (x, z) => gus.some((p) => inPolygon(x, z, p));
const city = polygonClipping.union(...gus.map((p) => [[p]])); // all of Seoul, one outline (game metres)
const g2 = ([lat, lon]) => toGame(lat, lon);
const ll = ([x, z]) => { const { lat, lon } = toLatLon(x, z); return [+lat.toFixed(5), +lon.toFixed(5)]; };

// Roads: the big ones only, above ground, the stretches inside Seoul.
// Not the expressways: in Seoul nearly every motorway and trunk road is for
// cars only (Olympic-daero, Gangbyeonbuk-ro, the ring and trunk expressways),
// and along the river they run where the game has its parks. The few trunk
// roads that are ordinary streets come in as primary.
const RANK = { primary: 2, secondary: 3 };
const STREET_TRUNKS = ['성산로', '양재대로', '능동로'];
const roads = [];
for (const w of read('roads.json')) {
  let k = w.t.highway;
  if (k === 'trunk' && STREET_TRUNKS.includes(w.t.name)) k = 'primary';
  if (!(k in RANK)) continue;
  if (w.t.tunnel && w.t.tunnel !== 'no') continue;
  const p = w.p.map(g2);
  // Runs of points inside Seoul (with the point just outside, so a road ends at the border).
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      const s = simplify(run, 1.2);
      roads.push({ id: w.id, k, ...(w.t.name ? { n: w.t.name } : {}), ...(w.t['name:en'] ? { en: w.t['name:en'] } : {}), ...(w.t.bridge && w.t.bridge !== 'no' ? { b: 1 } : {}), ...(w.t.oneway === 'yes' ? { o: 1 } : {}), p: s.map(ll) });
    }
    run = [];
  };
  for (let i = 0; i < p.length; i++) {
    if (inSeoul(p[i][0], p[i][1])) { if (!run.length && i > 0) run.push(p[i - 1]); run.push(p[i]); } else if (run.length) { run.push(p[i]); flush(); }
  }
  flush();
}
writeFileSync(path.join(out, 'roads.json'), JSON.stringify({ credit: '© OpenStreetMap contributors (ODbL)', roads }));

// Water and green: areas of some size, cut to Seoul's outline.
const areas = read('areas.json');
const cut = (kind, minArea, tol) => {
  const res = [];
  for (const a of areas) {
    if (a.k !== kind) continue;
    for (const q of a.polys) {
      const o = q.o.map(g2);
      if (polyArea(o) < minArea) continue;
      const holes = q.h.map((h) => h.map(g2)).filter((h) => polyArea(h) >= 150);
      let clipped;
      try { clipped = polygonClipping.intersection([[o, ...holes]], city); } catch { continue; }
      for (const poly of clipped) {
        const [outer, ...inner] = poly.map((r) => simplify(r.slice(0, -1), tol, true));
        if (outer.length < 3 || polyArea(outer) < minArea) continue;
        res.push({ id: a.id, ...(a.t.name ? { n: a.t.name } : {}), ...(a.t['name:en'] ? { en: a.t['name:en'] } : {}), ...(kind === 'water' && a.t.water ? { w: a.t.water } : {}), o: outer.map(ll), ...(inner.filter((h) => h.length > 2).length ? { h: inner.filter((h) => h.length > 2).map((h) => h.map(ll)) } : {}) });
      }
    }
  }
  return res;
};
const water = cut('water', 300, 1.2); // (game m²: 300 = about 70 x 70 m of real water)
const park = cut('park', 2500, 2);
const wood = cut('wood', 4000, 3);
writeFileSync(path.join(out, 'water.json'), JSON.stringify({ credit: '© OpenStreetMap contributors (ODbL)', water }));
writeFileSync(path.join(out, 'green.json'), JSON.stringify({ credit: '© OpenStreetMap contributors (ODbL)', park, wood }));

// Peaks and stations, for later (hills, the subway).
const nodes = read('nodes.json').filter((n) => { const [x, z] = g2(n.p); return inSeoul(x, z); });
const peaks = nodes.filter((n) => n.t.natural === 'peak' && n.t.name).map((n) => ({ n: n.t.name, ...(n.t['name:en'] ? { en: n.t['name:en'] } : {}), ele: +n.t.ele || null, p: n.p.map((v) => +v.toFixed(5)) }));
const stations = nodes.filter((n) => n.t.railway === 'station' && n.t.name).map((n) => ({ n: n.t.name, ...(n.t['name:en'] ? { en: n.t['name:en'] } : {}), p: n.p.map((v) => +v.toFixed(5)) }));
writeFileSync(path.join(out, 'points.json'), JSON.stringify({ credit: '© OpenStreetMap contributors (ODbL)', peaks, stations }));
const pts = (l) => l.reduce((s, r) => s + (r.p || r.o).length, 0);
console.log(`roads ${roads.length} (${pts(roads)} points), water ${water.length} (${pts(water)}), park ${park.length} (${pts(park)}), wood ${wood.length} (${pts(wood)}), peaks ${peaks.length}, stations ${stations.length}`);
