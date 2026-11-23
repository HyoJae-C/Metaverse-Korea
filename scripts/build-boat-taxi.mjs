// The Han River Boat Taxi (한강보트택시): its piers and the line the boats
// sail, from the real Han River Bus (한강버스) in OpenStreetMap at 1/4
// (scripts/data/hangang-bus-osm.json, © OpenStreetMap contributors).
// Writes public/regions/another-seoul/boat-taxi.json, which region.json
// names as "boatTaxi" (core/districts.js joins its decks to the map; the
// boats and piers are game/boat-taxi.js).
//
//   node scripts/build-boat-taxi.mjs
//
// Only the real piers in districts that are built are used (Yozi
// 2026-11-18: Mangwon, Yeouido, Apgujeong, Seoul Forest, Ttukseom, Jamsil;
// Magok added 2026-11-23 with the Seoul Botanic Park, Oksu the same day with
// Dalmaji Park). To add one when its district is built, add a line to PIERS
// in west-to-east order and run this again.
//
// Each pier: the real terminal's footprint (its centre and size at 1/4,
// turned along the river), a gangway straight to the nearest bank of the
// joined map, and a berth for the boat on the river side of it. The line is
// the real ferry route (Jamsil -> Apgujeong -> Yeouido -> Mangwon -> Magok) cut at the
// two end piers, with each berth spliced in.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toGame } from '../src/core/seoul-grid.js';
import { loadRegionMap } from '../src/core/districts.js';
import { pointInPoly } from '../src/core/collision.js';
import { BOAT_TAXI, timetable, boatAt, boatPose, lineLengths } from '../src/core/boat-taxi.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(HERE, '../public/regions/another-seoul');
const read = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
const osm = JSON.parse(readFileSync(path.join(HERE, 'data/hangang-bus-osm.json'), 'utf8'));

// West to east, the way the line runs.
export const PIERS = [
  // (across Olympic-daero from the Seoul Botanic Park's north-east corner)
  { id: 'magok', osm: 1418419406, name: { ko: '마곡', en: 'Magok', ja: '麻谷', zh: '麻谷' } },
  { id: 'mangwon', osm: 1418419420, name: { ko: '망원', en: 'Mangwon', ja: '望遠', zh: '望远' } },
  // (way 1441742055: the unnamed terminal the route lines end at; the named
  // node 13149390539 is 20 m off it, on the same pier)
  { id: 'yeouido', osm: 1441742055, name: { ko: '여의도', en: 'Yeouido', ja: '汝矣島', zh: '汝矣岛' } },
  // (really in Jamwon Han River Park, by Hannam Bridge's south end)
  { id: 'apgujeong', osm: 1418419409, name: { ko: '압구정', en: 'Apgujeong', ja: '狎鴎亭', zh: '狎鸥亭' } },
  // (below Oksu Station, for Dalmaji Park: added 2026-11-23 with the park)
  // (8 m west along the bank of the real spot, which is right beside Dongho
  // Bridge's north end: there the boat's bow would lie under the bridge's ramp)
  { id: 'oksu', osm: 1418419418, west: 8, name: { ko: '옥수', en: 'Oksu', ja: '玉水', zh: '玉水' } },
  { id: 'seoul-forest', osm: 1458956838, name: { ko: '서울숲', en: 'Seoul Forest', ja: 'ソウルの森', zh: '首尔林' } },
  { id: 'ttukseom', osm: 1418419412, name: { ko: '뚝섬', en: 'Ttukseom', ja: 'トゥクソム', zh: '纛岛' } },
  { id: 'jamsil', osm: 1418419415, name: { ko: '잠실', en: 'Jamsil', ja: '蚕室', zh: '蚕室' } },
];
// The real route, east to west, as OSM has it in pieces.
const ROUTE_WAYS = [1527378114, 1527717246, 1441742054, 1490035963];

export const BOAT = { l: 12, w: 4 }; // the boat (game/boat-taxi.js), for the berth
const MIN_L = 10, MIN_W = 4; // the pier deck at least this big (to walk on)
const BANK_GAP = 1.5; // at least this much water between the bank and the pier
const GANG_W = 2.2; // the gangway's width
const INLAND = 2.5; // the gangway's landing runs this far onto the bank (keeps park props off it)
const SPLICE = 22; // route points this close (along it) to a berth are replaced by it
const ALONG = 7; // m of line each side of a berth, alongside the deck
const KEEP = 12; // m the line keeps off the banks (a boat heading west sails 7 m to its side)
const KEEP_BERTH = 60; // m along the line from a berth, where it comes in to the bank

const r1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => [r1(p[0]), r1(p[1])];
const way = (id) => {
  const e = osm.elements.find((q) => q.id === id);
  if (!e?.geometry) throw new Error('not in the OSM file: ' + id);
  return e.geometry.map(([lat, lon]) => toGame(lat, lon));
};
const segNear = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return { q: [a[0] + dx * t, a[1] + dz * t], t, d: Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) };
};
// The nearest point on a polyline: { q, d, s (metres along), i, dir (unit) }.
export function nearestOn(line, x, z) {
  let best = null, s = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = segNear(x, z, a, b);
    if (!best || n.d < best.d) best = { ...n, s: s + n.t * len, i, dir: [(b[0] - a[0]) / (len || 1), (b[1] - a[1]) / (len || 1)] };
    s += len;
  }
  return best;
}
// Drop points closer than `tol` to the line between their neighbours.
function simplify(p, tol) {
  if (p.length < 3) return p;
  const keep = [p[0]];
  let a = p[0];
  for (let i = 1; i < p.length - 1; i++) {
    const b = p[i + 1];
    let far = false;
    for (let k = p.indexOf(a) + 1; k <= i; k++) if (segNear(p[k][0], p[k][1], a, b).d > tol) { far = true; break; }
    if (far) { keep.push(p[i]); a = p[i]; }
  }
  keep.push(p.at(-1));
  return keep;
}

// The west end's share of the waits at the two ends (core/boat-taxi.js
// timetable): the most even one with no two boats closer than APART m all
// round. (By a pier the boat heading west comes in beside the berth, off its
// 7 m passing lane, so where the line bends there two boats passing could touch.)
const APART = 5; // m between two boats' middles (a boat is 4 m wide)
export function westShare(piers, route, o = BOAT_TAXI) {
  const lens = lineLengths(route);
  const closest = (west) => {
    const tt = timetable(piers, o, west);
    if (tt.end < o.minEnd) return -Infinity;
    let min = Infinity;
    for (let t = 0; t < tt.round; t += 0.5) {
      const ps = [...Array(tt.boats).keys()].map((b) => { const st = boatAt(tt, piers, b, t); return boatPose(route, lens, piers, st.s, st.dir); });
      for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) min = Math.min(min, Math.hypot(ps[a].x - ps[b].x, ps[a].z - ps[b].z));
    }
    return min;
  };
  for (let d = 0; d <= 0.45; d += 0.01) for (const w of d ? [0.5 - d, 0.5 + d] : [0.5]) if (closest(w) > APART) return Math.round(w * 100) / 100;
  throw new Error('no split of the end waits keeps the boats apart');
}

export async function buildBoatTaxi() {
  const region = read('region.json');
  const map = await loadRegionMap({ ...region, boatTaxi: undefined }, async (f) => read(f));
  const water = map.areas.filter((a) => a.k === 'water');
  const inWater = (x, z) => water.some((w) => pointInPoly(x, z, w.p));
  // The nearest bank: the nearest edge of the water that has land behind it
  // (two stretches of river meet along a straight seam that is not a bank).
  const bankOf = (x, z) => {
    let best = null;
    for (const w of water) {
      for (let i = 0; i < w.p.length; i++) {
        const n = segNear(x, z, w.p[i], w.p[(i + 1) % w.p.length]);
        if (n.d < 0.01 || (best && n.d >= best.d)) continue;
        const ux = (n.q[0] - x) / n.d, uz = (n.q[1] - z) / n.d;
        if (inWater(n.q[0] + ux * 1.5, n.q[1] + uz * 1.5)) continue; // a seam
        best = { ...n, u: [ux, uz] };
      }
    }
    return best;
  };

  // The real line, east (Jamsil) to west (beyond Mangwon), then west to east.
  let line = [];
  for (const id of ROUTE_WAYS) { const w = way(id); line.push(...(line.length ? w.slice(1) : w)); }
  line.reverse();

  const piers = PIERS.map((pr) => {
    const g = way(pr.osm);
    const cx = g.reduce((s, p) => s + p[0], 0) / g.length, cz = g.reduce((s, p) => s + p[1], 0) / g.length;
    // Its size: the smallest box round the real footprint.
    let box = null;
    for (let a = 0; a < 180; a++) {
      const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [x, z] of g) { const u = (x - cx) * c + (z - cz) * s, v = -(x - cx) * s + (z - cz) * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      if (!box || (u1 - u0) * (v1 - v0) < box.a) box = { a: (u1 - u0) * (v1 - v0), L: Math.max(u1 - u0, v1 - v0), W: Math.min(u1 - u0, v1 - v0) };
    }
    const l = Math.max(MIN_L, r1(box.L)), w = Math.max(MIN_W, r1(box.W));
    // Along the river (the bank's direction), long side to the water.
    const bank = bankOf(cx, cz);
    const out = [-bank.u[0], -bank.u[1]]; // from the bank out over the water
    const along = [-out[1], out[0]];
    // Off the bank by at least BANK_GAP of water.
    const need = w / 2 + BANK_GAP, push = Math.max(0, need - bank.d);
    const wk = pr.west ? (along[0] < 0 ? pr.west : -pr.west) : 0; // (along the bank, to the west)
    const c = [cx + out[0] * push + along[0] * wk, cz + out[1] * push + along[1] * wk];
    const ry = Math.atan2(along[0], along[1]); // the deck's long side (local z) along the river
    const corner = (u, v) => [c[0] + along[0] * u + out[0] * v, c[1] + along[1] * u + out[1] * v];
    const dock = [corner(-l / 2, -w / 2), corner(l / 2, -w / 2), corner(l / 2, w / 2), corner(-l / 2, w / 2)].map(pt);
    // The gangway: from the deck's shore side straight to the bank, onto the land a little.
    const gap = bank.d + push - w / 2; // water between the deck and the bank
    const gang = [corner(-GANG_W / 2, -w / 2 + 0.3), corner(GANG_W / 2, -w / 2 + 0.3), corner(GANG_W / 2, -w / 2 - gap - INLAND), corner(-GANG_W / 2, -w / 2 - gap - INLAND)].map(pt);
    const berth = corner(0, w / 2 + BOAT.w / 2 + 0.25);
    return {
      id: pr.id, name: pr.name, osm: pr.osm,
      at: pt(c), ry: Math.round(ry * 1000) / 1000, l, w, gap: r1(gap),
      off: r1(Math.hypot(c[0] - cx, c[1] - cz)), // from the real terminal's middle (m)
      ...(pr.west ? { why: `Moved ${pr.west} m west along the bank from the real spot, clear of the bridge beside it.` } : push > 0.05 ? { why: `Moved ${r1(push)} m out from the real spot, so the deck clears the bank by ${BANK_GAP} m.` } : {}),
      dock, gang, berth: pt(berth), board: pt(corner(0, w / 2 - 1)), // where you stand to get on
      land: pt(corner(0, -w / 2 - gap - INLAND + 0.6)), // the gangway's foot, on the bank
    };
  });

  // Cut the line at the end piers, splice each berth in: the boat comes in
  // and pulls out alongside the deck (ALONG m each side, parallel to it).
  const ends = [nearestOn(line, ...piers[0].berth), nearestOn(line, ...piers.at(-1).berth)];
  line = simplify(line.slice(ends[0].i + 1, ends[1].i + 1).map(pt), 2);
  piers.forEach((p, k) => {
    const n = nearestOn(line, ...p.berth);
    let a = [Math.sin(p.ry), Math.cos(p.ry)];
    if (a[0] * n.dir[0] + a[1] * n.dir[1] < 0) a = [-a[0], -a[1]]; // (the way the line runs: east)
    p.bry = Math.round(Math.atan2(a[0], a[1]) * 1000) / 1000; // the boat's heading at the berth, bow east
    const ahead = pt([p.berth[0] + a[0] * ALONG, p.berth[1] + a[1] * ALONG]), behind = pt([p.berth[0] - a[0] * ALONG, p.berth[1] - a[1] * ALONG]);
    const put = k === 0 ? [p.berth, ahead] : k === piers.length - 1 ? [behind, p.berth] : [behind, p.berth, ahead];
    let s = 0;
    const keep = [];
    let done = false;
    for (let i = 0; i < line.length; i++) {
      if (i) s += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      const close = Math.abs(s - n.s) < SPLICE || (k === 0 && s < n.s) || (k === piers.length - 1 && s > n.s);
      if (!done && (close || s > n.s)) { keep.push(...put); done = true; }
      if (!close) keep.push(line[i]);
    }
    if (!done) keep.push(...put);
    line = keep;
  });
  // Off the banks: where the line runs closer than KEEP m to one (away from
  // the berths), a point is put in there, moved out to KEEP m.
  const berthAt = () => { const l = lineLengths(line); return piers.map((p) => l[line.findIndex((q) => q[0] === p.berth[0] && q[1] === p.berth[1])]); };
  for (let pass = 0; pass < 50; pass++) {
    const l = lineLengths(line), bs = berthAt();
    let worst = null;
    for (let i = 0; i + 1 < line.length; i++) {
      const len = l[i + 1] - l[i];
      for (let t = 2; t < len - 2; t += 2) {
        if (bs.some((b) => Math.abs(l[i] + t - b) < KEEP_BERTH)) continue;
        const x = line[i][0] + ((line[i + 1][0] - line[i][0]) * t) / len, z = line[i][1] + ((line[i + 1][1] - line[i][1]) * t) / len;
        const b = bankOf(x, z);
        if (b.d < KEEP && (!worst || b.d < worst.b.d)) worst = { i, x, z, b };
      }
    }
    if (!worst) break;
    const { i, x, z, b } = worst;
    line.splice(i + 1, 0, pt([x - b.u[0] * (KEEP - b.d), z - b.u[1] * (KEEP - b.d)]));
  }
  let s = 0;
  const route = line;
  const at = route.map((q, i) => (i ? (s += Math.hypot(q[0] - route[i - 1][0], q[1] - route[i - 1][1])) : 0));
  for (const p of piers) p.s = r1(at[route.findIndex((q) => q[0] === p.berth[0] && q[1] === p.berth[1])]);
  return {
    west: westShare(piers, route),
    note: "Han River Boat Taxi (한강보트택시): the real Han River Bus (한강버스) piers that are in built districts and its real route at 1/4 (scripts/build-boat-taxi.mjs). dock: the pier's deck; gang: the gangway to the bank; berth: where the boat ties up; s: metres along route.",
    credit: '© OpenStreetMap contributors',
    piers, route,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = await buildBoatTaxi();
  writeFileSync(path.join(R, 'boat-taxi.json'), JSON.stringify(out) + '\n');
  for (const p of out.piers) console.log(p.id.padEnd(13), 'at', p.at.join(', '), 'l', p.l, 'w', p.w, 'gap', p.gap, 'off', p.off, 's', p.s, p.why || '');
  console.log('route', out.route.length, 'points,', Math.round(out.piers.at(-1).s), 'm; west end waits', out.west, 'of the two ends\' waits');
}
