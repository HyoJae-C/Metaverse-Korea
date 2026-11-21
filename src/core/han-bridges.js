// The Han River's bridges, up off the water (Yozi 2026-11-18: they lay flat
// on the river, and the boat taxi sailed through them). A big road that
// crosses the boat taxi's line (map.boatTaxi.route: the Han's channel) is a
// bridge over the stretch of it that is over water: there it rises on a
// ramp from each bank to TOP metres, high enough for the boats to pass
// under, and comes down again. Its flat road over the water is no longer
// drawn (the stretch keeps `bridge` set: still a road for finding the way,
// game/han-bridges.js draws the deck), and you walk up it: y(x, z).
//
// Jamsu Bridge stays low, as it really is (Banpo Bridge passes over it): it
// rises only in the middle, where the boats go through (the real one's
// raised span), JAMSU.top metres over JAMSU.flat metres either side.
import { inPoly } from './geom.js';

export const TOP = 5.5; // m: the deck's top over the river (underside 1.4 m lower)
export const RAMP = 60; // m: up from each bank
export const JAMSU = { top: 5, flat: 16, ramp: 34, low: 0.3 };
const MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary']);
const LAND_GAP = 150; // m of land along it that still counts as one bridge (an island it crosses)
const smooth = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

function cross(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (!den) return -1;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}

// The deck's height s metres along a bridge.
export function deckHeight(b, s) {
  if (s <= 0 || s >= b.len) return b.low;
  if (b.jamsu) {
    const d = Math.abs(s - b.mid) - JAMSU.flat;
    return b.low + (JAMSU.top - b.low) * smooth(1 - d / JAMSU.ramp);
  }
  return b.low + (b.top - b.low) * Math.min(smooth(s / b.ramp[0]), smooth((b.len - s) / b.ramp[1]));
}

// Finds the bridges in a joined map (core/districts.js), splits each road at
// its bridge's ends and marks the middle stretch. paths: the lines the boats
// keep to (both ways): a ramp ends short of them, so they pass under the top.
// Returns the bridges:
// [{ name, w, pts (its middle line over the water), len, top, ramp: [from a, from b], low, jamsu, mid }].
export function raiseHanBridges(map, route, paths = [route]) {
  if (!route?.length) return [];
  const water = (map.areas || []).filter((a) => a.k === 'water' && !a.sunk).map((a) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of a.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return { p: a.p, holes: a.holes, x0, x1, z0, z1 };
  });
  const wet = (x, z) => water.some((w) => x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1 && inPoly(x, z, w.p) && !(w.holes || []).some((h) => inPoly(x, z, h)));
  const bridges = [], add = [];
  for (const r of map.roads) {
    if (!MAJOR.has(r.k) || r.bridge || r.p.length < 2) continue;
    const lens = [0];
    for (let i = 1; i < r.p.length; i++) lens.push(lens[i - 1] + Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1]));
    const len = lens.at(-1);
    let sc = -1;
    for (let i = 1; i < r.p.length && sc < 0; i++) {
      for (let j = 1; j < route.length; j++) {
        const t = cross(r.p[i - 1], r.p[i], route[j - 1], route[j]);
        if (t >= 0) { sc = lens[i - 1] + t * (lens[i] - lens[i - 1]); break; }
      }
    }
    if (sc < 0) continue;
    const at = (s) => {
      let i = 1;
      while (i < lens.length - 1 && lens[i] < s) i++;
      const t = (s - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
      return [r.p[i - 1][0] + (r.p[i][0] - r.p[i - 1][0]) * t, r.p[i - 1][1] + (r.p[i][1] - r.p[i - 1][1]) * t];
    };
    // Out from the crossing each way, to the last water before a long stretch of land.
    const reach = (dir) => {
      let last = sc, s = sc;
      while (true) {
        s += dir * 2;
        if (s <= 0 || s >= len) return dir < 0 ? Math.max(0, last) : Math.min(len, last);
        if (wet(...at(s))) last = s;
        else if (Math.abs(s - last) > LAND_GAP) return last;
      }
    };
    const a = Math.max(0, reach(-1) - 2), b = Math.min(len, reach(1) + 2);
    if (b - a < 30) continue;
    const name = r.n?.ko || '';
    const jamsu = name === '잠수교';
    const pts = [at(a)];
    for (let i = 1; i < r.p.length - 1; i++) if (lens[i] > a && lens[i] < b) pts.push(r.p[i]);
    pts.push(at(b));
    const round = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
    const ends = [round(pts[0]), round(pts.at(-1))];
    pts[0] = ends[0]; pts[pts.length - 1] = ends[1];
    const blen = b - a;
    // Where the boats cross it (s from a), the nearest to each end: the ramp
    // is up (80% of it, 91% high) a boat's half width + 4 m before.
    const hits = [];
    for (const path of paths) {
      for (let i = 1; i < r.p.length; i++) {
        for (let j = 1; j < path.length; j++) {
          const t = cross(r.p[i - 1], r.p[i], path[j - 1], path[j]);
          if (t >= 0) hits.push(lens[i - 1] + t * (lens[i] - lens[i - 1]) - a);
        }
      }
    }
    const first = Math.min(...hits.filter((h) => h > 0 && h < blen)), last = Math.max(...hits.filter((h) => h > 0 && h < blen));
    const ramp = [Math.max(14, Math.min(RAMP, blen / 3, (first - 6) / 0.8)), Math.max(14, Math.min(RAMP, blen / 3, (blen - last - 6) / 0.8))];
    bridges.push({ name, en: r.n?.en || '', w: (r.w || 14) + 1, pts, len: blen, top: TOP, ramp, low: jamsu ? JAMSU.low : 0, jamsu, mid: sc - a, d: r.d });
    // The road: the land before, the bridge (not drawn flat), the land after.
    const before = r.p.filter((_, i) => lens[i] < a), after = r.p.filter((_, i) => lens[i] > b);
    // (split: an extra piece of a road cut in three; the first piece stays the road itself)
    const mid = { ...r, p: pts, bridge: bridges.length, split: before.length > 0 };
    if (after.length) add.push({ ...r, p: [ends[1], ...after], split: true });
    r.p = before.length ? [...before, ends[0]] : null;
    add.push(mid);
  }
  map.roads = map.roads.filter((r) => r.p).concat(add);
  if (bridges.length) {
    map.landmarks = (map.landmarks || []).filter((l) => !(l.type === 'jamsu' && bridges.some((b) => b.jamsu))); // (its deck is drawn as a bridge now)
    for (const l of map.landmarks) if (l.type === 'seogang' && bridges.some((b) => b.name === '서강대교')) l.lift = TOP; // (only its arch, up on the deck: core/yeouido-models.js)
  }
  return bridges;
}

// How high you stand at (x, z): on a bridge's deck, or 0.
export function bridgeY(bridges, x, z) {
  for (const b of bridges) {
    if (!b.box) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const [px, pz] of b.pts) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); z0 = Math.min(z0, pz); z1 = Math.max(z1, pz); }
      const m = b.w / 2 + 2;
      b.box = [x0 - m, x1 + m, z0 - m, z1 + m];
    }
    if (x < b.box[0] || x > b.box[1] || z < b.box[2] || z > b.box[3]) continue;
    let s0 = 0;
    for (let i = 1; i < b.pts.length; i++) {
      const [ax, az] = b.pts[i - 1], [bx, bz] = b.pts[i];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
      const t = ((x - ax) * dx + (z - az) * dz) / (L * L);
      if (t >= -0.02 && t <= 1.02) {
        const off = Math.abs((x - ax) * dz - (z - az) * dx) / L;
        if (off <= b.w / 2 + 1.5) return deckHeight(b, s0 + Math.max(0, Math.min(1, t)) * L);
      }
      s0 += L;
    }
  }
  return 0;
}
