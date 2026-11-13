#!/usr/bin/env node
// Builds the Dongmyo district (public/regions/another-seoul/districts/dongmyo.json):
// Dongmyo Shrine (동관왕묘) and the flea market beside it, where Potato Market
// (감자마켓, src/game/potato-market.js) lets players spread a mat and sell
// clothes to each other.
//
// The streets, the shrine's wall and its halls are OpenStreetMap's at 1/4
// (scripts/data/dongmyo-osm.json, from Yozi's export of 2026-11-10,
// © OpenStreetMap contributors, ODbL): Jong-ro running west to Heunginjimun
// and east-south-east to Sinseol-dong, Jibong-ro crossing it at Dongmyo-ap
// Station, the walled shrine on Jong-ro's south side with its main gate on
// the south-east end, and the flea market in the block between Jibong-ro,
// Jong-ro and the shrine's west wall (the real one spreads through those
// lanes). Buildings are one row along the big streets (fictional).
//
//   node scripts/build-dongmyo.mjs   (then scripts/build-naksan.mjs, if its data changed;
//                                     Naksan's items, marked nk, are kept)
//
// The district's (0, 0) is the shrine's main gate (its anchor in
// region.json); the data file is in world metres (x east, z south) and this
// script subtracts the district's offset.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DONGMYO } from '../src/data/dongmyo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'dongmyo-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const [OX, OZ] = region.districts.find((d) => d.id === 'dongmyo')?.offset || [-818, -778];
const L = ([x, z]) => [Math.round((x - OX) * 10) / 10, Math.round((z - OZ) * 10) / 10];
const LP = (pts) => pts.map(L);
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// Point on a polyline at distance s, with its direction.
function along(p, s) {
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
    if (s <= len || i === p.length - 1) {
      const t = Math.min(1, s / len);
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux: (bx - ax) / len, uz: (bz - az) / len };
    }
    s -= len;
  }
  return null;
}
const lengthOf = (p) => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
const inPoly = (x, z, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));

// --- Roads (world metres, OSM centre lines) ---
const road = (name, k, w) => {
  const r = OSM.roads.find((x) => x.en === name);
  if (!r) throw new Error('no road ' + name);
  return { k, w, p: r.p, n: r.n };
};
const ROADS = [
  road('Jong-ro', 'primary', 14),
  road('Jibong-ro', 'secondary', 10),
  road('Jong-ro 58-gil', 'tertiary', 6), // the lane along the shrine's west wall: the market's east side
];
const roads = ROADS.map((r) => ({ k: r.k, w: r.w, p: LP(r.p), n: r.n }));

// --- The shrine ---
const S = OSM.shrine;
const wallPts = [...S.wall, S.wall[0]];
const blockers = [];
const landmarks = [];
// The wall, as 1.2 m thick blockers along each run, with a gap for the gate.
const gate = S.gate; // [x, z] world: the main gate
for (let i = 1; i < wallPts.length; i++) {
  const a = wallPts[i - 1], b = wallPts[i];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
  // Gap: where the gate sits on this run.
  const t = ((gate[0] - a[0]) * ux + (gate[1] - a[1]) * uz);
  const off = Math.abs((gate[0] - a[0]) * uz - (gate[1] - a[1]) * ux);
  const parts = off < 1.5 && t > 0 && t < len ? [[0, t - DONGMYO.gateW / 2], [t + DONGMYO.gateW / 2, len]] : [[0, len]];
  for (const [s0, s1] of parts) {
    if (s1 - s0 < 0.5) continue;
    const p0 = [a[0] + ux * s0, a[1] + uz * s0], p1 = [a[0] + ux * s1, a[1] + uz * s1];
    const nx = -uz * 0.6, nz = ux * 0.6;
    blockers.push({ p: LP([[p0[0] + nx, p0[1] + nz], [p1[0] + nx, p1[1] + nz], [p1[0] - nx, p1[1] - nz], [p0[0] - nx, p0[1] - nz]]) });
    landmarks.push({ type: 'wall', p: LP([p0, p1]), h: 2.6 });
  }
}
// The shrine's axis: from the main gate to the main hall (Jeongjeon).
const hall = S.hall, ax = hall[0] - gate[0], az = hall[1] - gate[1], alen = Math.hypot(ax, az);
const ux = ax / alen, uz = az / alen; // gate -> hall (into the shrine)
// A landmark facing back down the axis: its front (+z in its own metres) towards the gate.
const ry = Math.atan2(-ux, -uz);
const at = (s, side = 0) => L([gate[0] + ux * s - uz * side, gate[1] + uz * s + ux * side]);
const rotRect = (s0, s1, half) => LP([
  [gate[0] + ux * s0 - uz * half, gate[1] + uz * s0 + ux * half], [gate[0] + ux * s1 - uz * half, gate[1] + uz * s1 + ux * half],
  [gate[0] + ux * s1 + uz * half, gate[1] + uz * s1 - ux * half], [gate[0] + ux * s0 + uz * half, gate[1] + uz * s0 - ux * half],
]);
const H = DONGMYO.hall;
const [gx, gz] = at(0);
const [ix, iz] = at(DONGMYO.innerGateAt);
const [hx, hz] = at(alen);
landmarks.push(
  { type: 'jongmyogate', x: gx, z: gz, ry, w: DONGMYO.gateW - 0.6, small: true },
  { type: 'jongmyogate', x: ix, z: iz, ry, w: 3, small: true }, // 내삼문
  { type: 'shrinehall', x: hx, z: hz, ry, w: H.w, d: H.d, bays: 5, name: '正殿' },
);
blockers.push({ p: rotRect(alen - H.d / 2 - 0.6, alen + H.d / 2 + 0.6, H.w / 2 + 0.8) });
// Main gate posts, either side of the opening.
for (const side of [-1, 1]) blockers.push({ p: rotRect(-0.7, 0.7, 0.7).map(([x, z]) => [Math.round((x - uz * side * (DONGMYO.gateW / 2 + 0.3)) * 10) / 10, Math.round((z + ux * side * (DONGMYO.gateW / 2 + 0.3)) * 10) / 10]) });
// Inner gate posts.
for (const side of [-1, 1]) blockers.push({ p: rotRect(DONGMYO.innerGateAt - 0.5, DONGMYO.innerGateAt + 0.5, 0.5).map(([x, z]) => [Math.round((x - uz * side * 1.8) * 10) / 10, Math.round((z + ux * side * 1.8) * 10) / 10]) });
// The east and west side halls (동무, 서무) beside the yard.
for (const side of [-1, 1]) {
  const [sx, sz] = at(DONGMYO.sideHallAt, side * DONGMYO.sideHallOff);
  landmarks.push({ type: 'shrinehall', x: sx, z: sz, ry: ry + side * Math.PI / 2, w: 5, d: 2.6, bays: 3, name: '' });
  const c = [sx + OX, sz + OZ];
  const hw = 3.3, hd = 2.2;
  blockers.push({ p: LP([[c[0] - ux * hw - uz * hd, c[1] - uz * hw + ux * hd], [c[0] + ux * hw - uz * hd, c[1] + uz * hw + ux * hd], [c[0] + ux * hw + uz * hd, c[1] + uz * hw - ux * hd], [c[0] - ux * hw + uz * hd, c[1] - uz * hw - ux * hd]]) });
}
const areas = [
  { k: 'sand', p: LP(S.wall) }, // the shrine's yard: fine gravel
];
// Old trees in the shrine yard, off the axis.
const trees = [];
for (const [s, side] of [[3, -4.5], [3, 4.5], [9, -5], [9, 5], [16, -5.2], [16, 5.2]]) trees.push(at(s, side));
landmarks.push({ type: 'shrinetrees', x: 0, z: 0, spots: trees });

// --- The flea market ---
const M = DONGMYO.market;
areas.push({ k: 'plaza', p: LP(M.plaza) });
// Market stalls round the edge (tarps over tables of clothes, a rack).
for (const s of M.stalls) {
  const [x, z] = L(s.at);
  landmarks.push({ type: 'fleastall', x, z, ry: s.ry, w: s.w || 3.2, c: s.c });
  const c = Math.cos(s.ry), sn = Math.sin(s.ry), hw = (s.w || 3.2) / 2 + 0.2, hd = 1.0;
  const corner = (u, v) => [Math.round((x + u * c + v * sn) * 10) / 10, Math.round((z - u * sn + v * c) * 10) / 10];
  blockers.push({ p: [corner(-hw, -hd), corner(hw, -hd), corner(hw, hd * 0.2), corner(-hw, hd * 0.2)] });
}
// Potato Market: where players' mats go (src/game/potato-market.js draws
// them; spots are relative to the landmark).
const [mx, mz] = L(M.center);
landmarks.push({ type: 'potatomarket', x: mx, z: mz, spots: M.mats.map(([x, z, r]) => [Math.round((x - M.center[0]) * 10) / 10, Math.round((z - M.center[1]) * 10) / 10, r]) });
// The market's sign on the plaza.
landmarks.push({ type: 'sign', x: L(M.sign.at)[0], z: L(M.sign.at)[1], ry: M.sign.ry, ...(M.sign.sc ? { sc: [M.sign.sc] } : {}), ...(M.sign.fs ? { fs: M.sign.fs } : {}), title: M.sign.title, text: M.sign.text });

// --- Buildings: one row along the big streets ---
// Keep clear of: the roads, the shrine, the market.
const keepOut = [S.wall.map(([x, z]) => [x, z]), M.plaza];
// Other districts' streets here: Cheonggyecheon-ro's north road (the
// Gyeongbokgung map's, scripts/build-cheonggyecheon.mjs) and Jongno round
// Heunginjimun (Euljiro's), and their buildings. (The four Cheonggyecheon
// buildings that stood on the shrine, the market and Jibong-ro were taken
// out; build-cheonggyecheon.mjs keeps its row off other districts.)
const near = (p) => p.some(([x, z]) => x > -960 && x < -740 && z > -870 && z < -700);
const others = region.districts.filter((d) => d.id !== 'dongmyo').map((d) => ({ d, m: JSON.parse(readFileSync(path.join(R, d.map), 'utf8')) }));
const world = (d, p) => p.map(([x, z]) => [x + d.offset[0], z + d.offset[1]]);
const OTHER = others.flatMap(({ d, m }) => (m.roads || []).map((r) => ({ w: r.w, p: world(d, r.p) })).filter((r) => near(r.p)));
const OTHER_B = others.flatMap(({ d, m }) => (m.buildings || []).map((b) => world(d, b.p)).filter(near));
const buildings = [];
const clashes = (poly) => poly.some(([x, z]) => keepOut.some((k) => inPoly(x, z, k))) || keepOut.some((k) => k.some(([x, z]) => inPoly(x, z, poly)))
  || [...ROADS, ...OTHER].some((r) => poly.some(([x, z]) => lineDist(x, z, r.p) < r.w / 2 + 1.2))
  || [...buildings.map((b) => b.w), ...OTHER_B].some((w) => w.some(([x, z]) => inPoly(x, z, poly)) || poly.some(([x, z]) => inPoly(x, z, w)));
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const row of DONGMYO.rows) {
  const r = ROADS.find((x) => x.n.en === row.road);
  const p = r.p, total = lengthOf(p);
  for (let s = row.from; s + row.width <= Math.min(total, row.to); s += row.width + row.gap) {
    const a = along(p, s), b = along(p, s + row.width);
    const nx = -a.uz * row.side, nz = a.ux * row.side; // outward from the road
    const set = r.w / 2 + 2.2, d = row.depth + Math.round(rnd() * 2);
    const poly = [[a.x + nx * set, a.z + nz * set], [b.x + nx * set, b.z + nz * set], [b.x + nx * (set + d), b.z + nz * (set + d)], [a.x + nx * (set + d), a.z + nz * (set + d)]];
    if (clashes(poly)) continue;
    buildings.push({ w: poly, h: row.h[0] + Math.round(rnd() * (row.h[1] - row.h[0])) });
  }
}
const out = buildings.map((b) => ({ h: b.h, p: LP(b.w) }));

const pois = [
  { kind: 'landmark', ...Object.fromEntries([['x', at(alen / 2)[0]], ['z', at(alen / 2)[1]]]), name: N('동묘', 'Dongmyo Shrine', '東廟', '东庙') },
  { kind: 'landmark', x: mx, z: mz, name: N('감자마켓', 'Potato Market', 'ポテトマーケット', '土豆市场') },
];

const xs = [], zs = [];
for (const q of [...out.flatMap((b) => b.p), ...areas.flatMap((a) => a.p), ...roads.flatMap((r) => r.p)]) { xs.push(q[0]); zs.push(q[1]); }
const map = {
  meta: {
    district: 'dongmyo',
    parts: [{ why: 'Dongmyo Shrine, the flea market and Jong-ro between Heunginjimun and Sinseol-dong', box: [Math.floor(Math.min(...xs)), Math.floor(Math.min(...zs)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...zs))] }],
    source: 'OpenStreetMap streets, shrine wall and halls at 1/4 (© OpenStreetMap contributors, ODbL; scripts/data/dongmyo-osm.json); buildings fictional. Built by scripts/build-dongmyo.mjs',
  },
  roads, buildings: out, rail: [], areas, blockers, pois, landmarks,
};
// Naksan and its city wall (items marked nk) are scripts/build-naksan.mjs's: keep them.
{
  let prev = null;
  try { prev = JSON.parse(readFileSync(path.join(R, 'districts', 'dongmyo.json'), 'utf8')); } catch { /* first build */ }
  if (prev) {
    for (const k of ['roads', 'buildings', 'blockers', 'pois']) map[k].push(...(prev[k] || []).filter((it) => it.nk));
    map.meta.parts.push(...(prev.meta?.parts || []).filter((p) => p.nk));
    if (prev.meta?.ridge) map.meta.ridge = prev.meta.ridge;
    if (prev.meta?.source?.includes('Naksan')) map.meta.source = prev.meta.source;
  }
}
writeFileSync(path.join(R, 'districts', 'dongmyo.json'), JSON.stringify(map, null, 1) + '\n');
console.log(`dongmyo.json: ${roads.length} roads, ${out.length} buildings, ${M.stalls.length} stalls, ${M.mats.length} mat spots`);
