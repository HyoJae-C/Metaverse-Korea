#!/usr/bin/env node
// The base map: all of Seoul's big roads, water and green at 1/4, under the
// districts (public/regions/another-seoul/base.json, joined into the map by
// core/districts.js). Where nothing is built yet it is all there is: the big
// roads only, on their real lines (docs/WORLD.md "The base map").
//
// From OpenStreetMap, trimmed by scripts/city/prep-seoul-osm.mjs
// (scripts/data/seoul/). What it does:
//  - Roads: the two carriageways of one road become one line; a stretch that
//    runs along a road a district already has, or through its buildings, is
//    left out, and the cut end is joined to the district's road.
//  - Water and green: left out inside the districts' boxes and where the
//    region already has the Han (region.json "water").
//  - Bridges: where a base road crosses water you walk across (decks).
//
//   node scripts/build-base.mjs        then  node scripts/build-closed.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { mergeDistricts } from '../src/core/districts.js';
import { toGame, mapParts, inPolygon } from '../src/core/seoul-grid.js';
import { simplify, polyArea, polyLength, segDist } from './city/geom.mjs';
import { northHeight } from '../src/core/north-ground.js';
import { onNamsan } from '../src/core/namsan-shape.js';
import { hillGround } from '../src/core/hill-ground.js';
import { ridgeGround } from '../src/core/ridge-ground.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const D = path.join(root, 'scripts', 'data', 'seoul');
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const g2 = ([lat, lon]) => toGame(lat, lon);

export const WIDTH = { primary: 14, secondary: 10 };
const RANK = { primary: 2, secondary: 3 };
const STEP = 3; // m between samples along a road
const NEAR_BASE = 11; // m: a carriageway this near another base road going the same way is the same road
const NEAR_OLD = 16; // m: ... and this near a district's road
const NEAR_WALL = 8; // m from a district's building
const MIN_RUN = 30; // m: shorter leftovers are dropped
const JOIN = 45; // m: a cut end reaches this far for a district road to join
const STREAM_PAD = 8; // m from a sunken stream's edge where base roads stop
const BOX_PAD = 12; // m round a district's box where base water and green stop

// Segments in a grid, to ask "what runs near here?".
class SegGrid {
  constructor(cell = 20) { this.cell = cell; this.m = new Map(); }
  add(a, b, tag) {
    const c = this.cell, s = { a, b, tag, dx: b[0] - a[0], dz: b[1] - a[1] };
    const l = Math.hypot(s.dx, s.dz) || 1; s.ux = s.dx / l; s.uz = s.dz / l;
    for (let i = Math.floor(Math.min(a[0], b[0]) / c); i <= Math.floor(Math.max(a[0], b[0]) / c); i++) for (let j = Math.floor(Math.min(a[1], b[1]) / c); j <= Math.floor(Math.max(a[1], b[1]) / c); j++) {
      const k = i + ',' + j; let l2 = this.m.get(k); if (!l2) this.m.set(k, (l2 = [])); l2.push(s);
    }
  }
  near(p, r, fn) {
    const c = this.cell;
    for (let i = Math.floor((p[0] - r) / c); i <= Math.floor((p[0] + r) / c); i++) for (let j = Math.floor((p[1] - r) / c); j <= Math.floor((p[1] + r) / c); j++) {
      for (const s of this.m.get(i + ',' + j) || []) if (fn(s) === true) return true;
    }
    return false;
  }
}
const resample = (p, step) => {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
    for (let s = 1; s <= n; s++) out.push([ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n]);
  }
  return out;
};
const nearestOn = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return [a[0] + t * dx, a[1] + t * dz];
};

// The base is made only near what is built: within REACH metres (800 m real)
// of a district's box. Farther land has no roads or green and is all closed,
// whether its gu has a district or not (Yozi 2026-11-15: nothing to walk to
// there; left out until something is built). Rivers are kept whole. Adding a
// district brings the base round it on the next run.
export const REACH = 200;
export const baseBoxes = (region, maps) => region.districts.flatMap((d) => mapParts(maps[d.map], d.offset || [0, 0])).filter((b) => Number.isFinite(b.x0)).map((b) => ({ x0: b.x0 - REACH, z0: b.z0 - REACH, x1: b.x1 + REACH, z1: b.z1 + REACH }));

export function buildBase({ region, maps, data }) {
  const kept = baseBoxes(region, maps);
  const inKept = ([x, z]) => kept.some((g) => x >= g.x0 && x <= g.x1 && z >= g.z0 && z <= g.z1);
  const keptArea = polygonClipping.union(...kept.map((g) => [[[g.x0, g.z0], [g.x1, g.z0], [g.x1, g.z1], [g.x0, g.z1], [g.x0, g.z0]]]));
  const parts = region.districts.map((d) => ({ ...d, map: maps[d.map] }));
  const city = mergeDistricts(parts, region.links || [], region.water || []);

  // --- Roads ---------------------------------------------------------------
  // Ways of one road joined end to end.
  const ways = data.roads.roads.map((w) => ({ ...w, p: w.p.map(g2) })).filter((w) => w.p.length > 1);
  const key = (p) => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);
  const groups = new Map();
  for (const w of ways) { const k = w.k + '|' + (w.n || w.id); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(w); }
  const chains = [];
  for (const list of groups.values()) {
    const ends = new Map();
    const put = (w) => { for (const e of [key(w.p[0]), key(w.p[w.p.length - 1])]) { if (!ends.has(e)) ends.set(e, new Set()); ends.get(e).add(w); } };
    const drop = (w) => { for (const e of [key(w.p[0]), key(w.p[w.p.length - 1])]) ends.get(e)?.delete(w); };
    list.forEach(put);
    const left = new Set(list);
    while (left.size) {
      const w = left.values().next().value; left.delete(w); drop(w);
      let p = w.p.slice(), bridge = !!w.b;
      for (let grew = true; grew;) {
        grew = false;
        for (const tail of [true, false]) {
          const e = key(tail ? p[p.length - 1] : p[0]);
          const nx = [...(ends.get(e) || [])][0];
          if (!nx) continue;
          left.delete(nx); drop(nx);
          const q = key(nx.p[0]) === e ? nx.p : nx.p.slice().reverse();
          p = tail ? p.concat(q.slice(1)) : q.slice().reverse().slice(0, -1).concat(p);
          grew = true;
        }
      }
      chains.push({ k: w.k, n: w.n, en: w.en, p, len: polyLength(p), bridge });
    }
  }
  chains.sort((a, b) => RANK[a.k] - RANK[b.k] || b.len - a.len);

  const old = new SegGrid(), walls = new SegGrid(), base = new SegGrid();
  for (const r of city.roads) if (r.k !== 'walk') for (let i = 1; i < r.p.length; i++) old.add(r.p[i - 1], r.p[i], r);
  const solid = city.buildings.map((b) => b.p).concat((city.blockers || []).filter((b) => b.d !== 'link').map((b) => b.p));
  const solidBox = solid.map((p) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { p, x0, x1, z0, z1 }; });
  solidBox.forEach((s, id) => { for (let i = 0; i < s.p.length; i++) walls.add(s.p[i], s.p[(i + 1) % s.p.length], id); });
  // The hills the game has (Namsan, Inwangsan and Bugaksan, Naksan, the
  // slope of Gyeongnidan-gil): base roads keep off them, the city is flat.
  const hills = [];
  for (const l of city.landmarks) {
    if (l.type === 'northwall') hills.push((x, z) => northHeight(l, x, z) > 0);
    if (l.type === 'namsan') hills.push((x, z) => onNamsan(l, x - l.x, z - l.z, 8));
  }
  for (const d of city.meta.districts) {
    if (d.hill) { const y = hillGround(d.hill, d.offset); hills.push((x, z) => y(x, z) > 0); }
    if (d.ridge) { const y = ridgeGround(d.ridge, d.offset); hills.push((x, z) => y(x, z) > 0); }
  }
  // The Seoul City Wall off the hills (a landmark's runs) is a wall too.
  const runs = new SegGrid();
  for (const l of city.landmarks) for (const p of l.runs || l.wall?.runs || []) for (let i = 1; i < p.length; i++) runs.add([l.x + p[i - 1][0], l.z + p[i - 1][1]], [l.x + p[i][0], l.z + p[i][1]], l);
  const HILL_PAD = [[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9]];
  // A place a district draws bigger than 1/4 (Seoul Plaza at 37.5%: scripts/build-city-hall.mjs) covers the real
  // lines of the roads round it: its meta.<place>.noBase polygons (district metres) keep base roads out.
  const noBase = parts.flatMap((d) => Object.values(d.map.meta || {}).flatMap((m) => m?.noBase || []).map((p) => p.map(([x, z]) => [x + (d.offset?.[0] || 0), z + (d.offset?.[1] || 0)])));
  // (Is the point in or near a district's building or wall, or on a hill?)
  const streamLines = (city.streams || []).map((st) => ({ p: st.path.map(([x, z]) => [st.at[0] + x, st.at[1] + z]), r: (st.w || 20) / 2 + STREAM_PAD }));
  const inWall = (pt) => {
    if (hills.some((h) => HILL_PAD.some(([dx, dz]) => h(pt[0] + dx, pt[1] + dz)))) return true;
    if (runs.near(pt, 13, (s) => segDist(pt, s.a, s.b) < 13)) return true;
    if (noBase.some((p) => inPolygon(pt[0], pt[1], p))) return true;
    if (walls.near(pt, NEAR_WALL, (s) => segDist(pt, s.a, s.b) < NEAR_WALL)) return true;
    // on or beside a sunken stream (Cheonggyecheon, core/stream.js): its trench, banks and bridges are the district's
    for (const st of streamLines) for (let i = 1; i < st.p.length; i++) if (segDist(pt, st.p[i - 1], st.p[i]) < st.r) return true;
    // inside a big footprint, far from its edges
    for (const s of solidBox) if (pt[0] > s.x0 && pt[0] < s.x1 && pt[1] > s.z0 && pt[1] < s.z1 && inPolygon(pt[0], pt[1], s.p)) return true;
    return false;
  };
  const along = (grid, pt, ux, uz, r) => grid.near(pt, r, (s) => Math.abs(s.ux * ux + s.uz * uz) > 0.82 && segDist(pt, s.a, s.b) < r);

  const rawWater = data.water.water.map((a) => a.o.map(g2)).concat(city.areas.filter((a) => a.k === 'water').map((a) => a.p)).map((p) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { p, x0, x1, z0, z1 }; });
  const inRawWater = ([x, z]) => rawWater.some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && inPolygon(x, z, w.p));
  const roads = [];
  for (const c of chains) {
    const s = resample(c.p, STEP);
    const state = s.map((pt, i) => {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
      if (along(base, pt, ux, uz, NEAR_BASE)) return 1; // the other carriageway
      if (along(old, pt, ux, uz, NEAR_OLD)) return 2; // a district's road
      if (inWall(pt)) return 3;
      if (!inKept(pt)) return 4; // far from everything built
      return 0;
    });
    // A bridge into a gu with nothing built stops at this bank, not mid-river.
    // (A chain that ends at such a gu's border, a bridge that is its own road: its end counts as cut.)
    for (const [e, f] of [[0, 1], [s.length - 1, s.length - 2]]) {
      if (state[e] !== 0 || !s[f]) continue;
      const l = Math.hypot(s[e][0] - s[f][0], s[e][1] - s[f][1]) || 1, ux = (s[e][0] - s[f][0]) / l, uz = (s[e][1] - s[f][1]) / l;
      if ([10, 25].some((d) => !inKept([s[e][0] + ux * d, s[e][1] + uz * d]))) state[e] = 4;
    }
    for (let i = 0; i < s.length; i++) {
      if (state[i] !== 4) continue;
      // (and 12 m on, off the water's edge)
      const nearWater = (k) => [0, 1, 2, 3, 4].some((d) => (s[k - d] && inRawWater(s[k - d])) || (s[k + d] && inRawWater(s[k + d])));
      for (let k = i - 1; k >= 0 && state[k] === 0 && nearWater(k); k--) state[k] = 4;
      for (let k = i + 1; k < s.length && state[k] === 0 && nearWater(k); k++) state[k] = 5;
    }
    for (let i = 0; i < s.length; i++) if (state[i] === 5) state[i] = 4;
    // Close short gaps (a few samples that happen to pass something).
    for (let i = 0; i < s.length;) {
      if (!state[i]) { i++; continue; }
      let e = i; while (e < s.length && state[e]) e++;
      if (i > 0 && e < s.length && (e - i) * STEP < 9 && !state.slice(i, e).includes(3)) for (let k = i; k < e; k++) state[k] = 0;
      i = e;
    }
    for (let i = 0; i < s.length;) {
      if (state[i]) { i++; continue; }
      let e = i; while (e < s.length && !state[e]) e++;
      let run = s.slice(i, e);
      if ((run.length - 1) * STEP >= MIN_RUN) {
        // A cut end joins the district road it met, if one is near.
        const join = (pt, why) => {
          if (why !== 2 && why !== 3) return null;
          let best = null, bd = JOIN;
          old.near(pt, JOIN, (sg) => { const q = nearestOn(pt, sg.a, sg.b), d = Math.hypot(q[0] - pt[0], q[1] - pt[1]); if (d < bd) { bd = d; best = q; } });
          // (Not through a building on the way there.)
          if (best && resample([pt, best], 2).slice(2).some((q) => inWall(q))) return null;
          return best;
        };
        const head = i > 0 ? join(run[0], state[i - 1]) : null, tail = e < s.length ? join(run[run.length - 1], state[e]) : null;
        let p = simplify(run, 0.8);
        if (head) p = [head, ...p];
        if (tail) p = [...p, tail];
        for (let k = 1; k < run.length; k++) base.add(run[k - 1], run[k], c);
        roads.push({ k: c.k, w: WIDTH[c.k], p: p.map(([x, z]) => [r1(x), r1(z)]), ...(c.n ? { n: { ko: c.n, ...(c.en ? { en: c.en } : {}) } } : {}), base: true });
      }
      i = e;
    }
  }

  // One bridge, one road: two base roads that end on the water within 16 m
  // of each other (a bridge whose name changes halfway, like Dongho Bridge:
  // Dongho-ro and Nonhyeon-ro) are joined, so the bridge is whole from bank
  // to bank (core/han-bridges.js raises a road that crosses the boat line).
  for (let again = true; again;) {
    again = false;
    for (let i = 0; i < roads.length && !again; i++) for (let j = 0; j < roads.length && !again; j++) {
      if (i === j || roads[i].k !== roads[j].k) continue;
      const a = roads[i].p.at(-1);
      for (const rev of [false, true]) {
        const q = rev ? roads[j].p.slice().reverse() : roads[j].p, b = q[0];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 16 || !inRawWater(a) || !inRawWater(b)) continue;
        roads[i] = { ...roads[i], p: roads[i].p.concat(q) };
        roads.splice(j, 1);
        again = true;
        break;
      }
    }
  }

  // --- Water and green -----------------------------------------------------
  const boxes = [];
  for (const d of parts) for (const b of mapParts(d.map, d.offset || [0, 0])) if (Number.isFinite(b.x0)) boxes.push([[[b.x0 - BOX_PAD, b.z0 - BOX_PAD], [b.x1 + BOX_PAD, b.z0 - BOX_PAD], [b.x1 + BOX_PAD, b.z1 + BOX_PAD], [b.x0 - BOX_PAD, b.z1 + BOX_PAD]]]);
  // (Where the region or a district already has water: its bounding box, a little wider.)
  for (const a of city.areas.filter((q) => q.k === 'water')) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of a.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    if (polyArea(a.p) > 20000) boxes.push([[[x0, z0 - 40], [x1, z0 - 40], [x1, z1 + 40], [x0, z1 + 40]]]);
  }
  const taken = polygonClipping.union(...boxes);
  // (tol: how far, in game metres, an outline may be smoothed; parks and woods
  // are only a colour on the ground, so they are kept coarse and whole metres.)
  const cut = (list, minArea, tol, everywhere = false) => {
    const rd = tol >= 2 ? Math.round : r1;
    const out = [];
    for (const a of list) {
      const poly = [a.o.map(g2), ...(a.h || []).map((h) => h.map(g2))];
      let res;
      let cutByGu = false;
      try {
        const whole = polygonClipping.difference([poly], taken);
        res = everywhere ? whole : polygonClipping.intersection(whole, keptArea);
        const sum = (m) => m.reduce((t, q) => t + polyArea(q[0]), 0);
        cutByGu = sum(res) < sum(whole) * 0.99;
      } catch { continue; }
      for (const q of res) {
        // (Cut at a gu's border, a stream along the border leaves a sliver: dropped.)
        if (cutByGu && (2 * polyArea(q[0])) / polyLength(q[0]) < 6) continue;
        const [o, ...h] = q.map((ring) => simplify(ring.slice(0, -1), tol, true).map(([x, z]) => [rd(x), rd(z)]));
        if (o.length < 3 || polyArea(o) < minArea) continue;
        const holes = h.filter((ring) => ring.length > 2 && polyArea(ring) > 60);
        out.push({ p: o, ...(holes.length ? { holes } : {}), ...(a.n ? { n: { ko: a.n, ...(a.en ? { en: a.en } : {}) } } : {}) });
      }
    }
    return out;
  };
  const water = cut(data.water.water, 300, 1, true) // (rivers whole: a gu's border runs down the middle of the Han);
  const park = cut(data.green.park, 2000, 3);
  const wood = cut(data.green.wood, 3000, 4);

  // --- Bridges -------------------------------------------------------------
  // Where a base road is over water, a deck you walk on: the road's ribbon
  // over the water and a little onto each bank.
  const wet = city.areas.filter((a) => a.k === 'water').map((a) => ({ p: a.p, holes: a.holes || [] })).concat(water.map((w) => ({ p: w.p, holes: w.holes || [] })));
  const wetBox = wet.map((w) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of w.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { ...w, x0, x1, z0, z1 }; });
  const inWater = (x, z) => wetBox.some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && inPolygon(x, z, w.p) && !w.holes.some((h) => inPolygon(x, z, h)));
  // (A district's road or a link, a bike path too, gets one where it crosses the base map's water.)
  const baseBox = wetBox.slice(wetBox.length - water.length);
  const inBaseWater = (x, z) => baseBox.some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && inPolygon(x, z, w.p) && !w.holes.some((h) => inPolygon(x, z, h)));
  const decks = [];
  for (const r of roads.concat(city.roads.map((q) => ({ ...q, w: q.w || 6, old: true })))) {
    const wetXZ = r.old ? inBaseWater : inWater;
    const s = resample(r.p, 2);
    // (Wet anywhere across the road's width, so a stream that only touches its edge is covered too.)
    const side = r.w / 2 + 1;
    const wet = s.map((pt, i) => {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
      return [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].some((o) => wetXZ(pt[0] + nx * o * side, pt[1] + nz * o * side)); // (every 2 m: a brook 3 m wide beside the road counts)
    });
    const wetAt = (_x, _z, i) => wet[i];
    for (let i = 0; i < s.length;) {
      if (!wetAt(0, 0, i)) { i++; continue; }
      let e = i; while (e < s.length && wetAt(0, 0, e)) e++;
      const a = Math.max(0, i - 4), b = Math.min(s.length - 1, e + 3); // (8 m onto each bank)
      const line = simplify(s.slice(a, b + 1), 0.5);
      // (Where the road itself ends on the water, at a joint with the next
      // stretch of the bridge, the deck runs 8 m on past its end.)
      const push = (end, from) => { const l = Math.hypot(end[0] - from[0], end[1] - from[1]) || 1; return [end[0] + ((end[0] - from[0]) / l) * 8, end[1] + ((end[1] - from[1]) / l) * 8]; };
      if (i - 4 < 0) line.unshift(push(line[0], line[1]));
      if (e + 3 > s.length - 1) line.push(push(line[line.length - 1], line[line.length - 2]));
      const half = r.w / 2 + 1.5, L = [], Rt = [];
      for (let k = 0; k < line.length; k++) {
        const p0 = line[Math.max(0, k - 1)], p1 = line[Math.min(line.length - 1, k + 1)];
        const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, nx = -(p1[1] - p0[1]) / l, nz = (p1[0] - p0[0]) / l;
        L.push([r1(line[k][0] + nx * half), r1(line[k][1] + nz * half)]); Rt.push([r1(line[k][0] - nx * half), r1(line[k][1] - nz * half)]);
      }
      decks.push({ p: L.concat(Rt.reverse()), ...(r.n ? { n: r.n } : {}) });
      i = e;
    }
  }
  return { roads, water, park, wood, decks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const region = read(path.join(R, 'region.json'));
  const maps = Object.fromEntries(region.districts.map((d) => [d.map, read(path.join(R, d.map))]));
  const data = { roads: read(path.join(D, 'roads.json')), water: read(path.join(D, 'water.json')), green: read(path.join(D, 'green.json')) };
  const b = buildBase({ region, maps, data });
  const json = { note: 'All of Seoul under the districts: big roads, water and green at 1/4 (scripts/build-base.mjs, from OpenStreetMap).', credit: '© OpenStreetMap contributors (ODbL)', roads: b.roads, areas: [...b.water.map((w) => ({ k: 'water', ...w }))], decks: b.decks };
  // Parks and woods: a colour only, fetched after the start (src/game/base-green.js).
  const green = { note: 'Seoul\'s big parks and woods at 1/4 (scripts/build-base.mjs, from OpenStreetMap); region.json "baseGreen".', credit: json.credit, areas: [...b.park.map((w) => ({ k: 'park', ...w })), ...b.wood.map((w) => ({ k: 'park', wood: true, ...w }))] };
  writeFileSync(path.join(R, 'base-green.json'), JSON.stringify(green));
  writeFileSync(path.join(R, 'base.json'), JSON.stringify(json));
  const km = b.roads.reduce((s, r) => s + polyLength(r.p), 0) / 1000;
  console.log(`roads ${b.roads.length} (${km.toFixed(1)} km), water ${b.water.length}, park ${b.park.length}, wood ${b.wood.length}, decks ${b.decks.length}`);
}
