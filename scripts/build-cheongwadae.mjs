#!/usr/bin/env node
// Builds the outside of Cheong Wa Dae (청와대) into districts/gyeongbokgung.json,
// north of the palace, from OpenStreetMap (scripts/data/cheongwadae-osm.json,
// © OpenStreetMap contributors, ODbL) at 1/4 like the rest of the game's Seoul.
//
// It is the president's office again (back from Yongsan on 2025-12-29; the
// public tours ended on 2025-08-01), a security facility: you cannot go in.
// What is built is what a visitor sees from the street (Yozi, 2026-11-23):
//
//   - Hyoja-ro, Cheongwadae-ro and Changuimun-ro on their real lines. The
//     hand-drawn Hyoja-ro (130 m west of the real one) is renamed
//     Jahamun-ro, which it stands in for, and the hand-drawn Cheongwadae-ro
//     at the foot of Bugaksan (240 m north of the real one) goes.
//   - The fountain plaza at the Hyoja-dong junction, Sarangchae beside it.
//   - The grounds' fence on OSM's line (a low stone wall with railings you
//     see through), the main gate in its recess on Cheongwadae-ro, the big
//     lawn and the main hall (본관) with its blue roof, Bugaksan behind.
//   - Not drawn: anything behind or beside the main hall (offices, the
//     residence, guard posts); the grounds are woods there. Nothing inside
//     is walkable: the fence is a blocker all round, and at the gate a note
//     says why (game/cheongwadae-note.js).
//
// Sizes: the site, the roads, the lawn, the plaza and Sarangchae at 1/4; the
// main hall and the gate at HALL (2 = 50%: twice the 1/4 map across, heights
// half the real ones), like Gyeongbokgung's halls.
//
// Roads are drawn at game widths (8 m), wider than a quarter of the real
// ones, so where the real line runs right along the palace wall the road is
// pushed off it, and the grounds' fence off the road; how far is written in
// meta.cheongwadae.moved. Pieces OSM does not have (the lawn's edge, most of
// Sarangchae's outline, the links to the game's own roads) are marked
// `approx`.
//
// Run after scripts/build-gyeongbokgung.mjs (it redraws the park round the
// palace). What it writes is marked "cw": 1, so it can be run again.
//
//   node scripts/build-cheongwadae.mjs            rewrites the Cheong Wa Dae part
//   node scripts/build-cheongwadae.mjs --svg F    also draws the plan on the real map to F
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame } from '../src/core/seoul-grid.js';
import { obb, inside } from './lib/palace-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const FILE = path.join(R, 'districts', 'gyeongbokgung.json');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'cheongwadae-osm.json'), 'utf8'));
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const [OX, OZ] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });

export const CW = {
  HALL: 2, // the main hall and the gate across: 2 × the 1/4 map = 50% of the real size
  UP: 0.5, // their heights: half the real ones
  roadW: 8, // m: Hyoja-ro, Cheongwadae-ro, Changuimun-ro
  roadGap: 1.5, // m: kept between a road's edge and the palace wall
  fenceGap: 1.3, // m: kept between a road's edge and the grounds' fence (the pavement)
  gateW: 13.5, // m: the gate's opening at 50% (the recess is ~27 m across on the real map)
  note: 9, // m: how near the gate the note comes up
};

export const local = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const els = (k) => osm.elements.filter((e) => e.kind === k);
const one = (k) => els(k)[0];
const centre = (P) => { const Q = P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1] ? P.slice(0, -1) : P; return Q.reduce((a, p) => [a[0] + p[0] / Q.length, a[1] + p[1] / Q.length], [0, 0]); };
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return [Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t), a[0] + dx * t, a[1] + dz * t]; };
const nearest = (x, z, P) => { let best = [Infinity, 0, 0]; for (let i = 1; i < P.length; i++) { const s = segDist(x, z, P[i - 1], P[i]); if (s[0] < best[0]) best = s; } return best; };
const dense = (P, step) => { const out = []; for (let i = 1; i < P.length; i++) { const [ax, az] = P[i - 1], [bx, bz] = P[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step)); for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); } out.push(P.at(-1)); return out; };
function simplify(P, tol) { // Douglas-Peucker
  if (P.length < 3) return P;
  const a = P[0], b = P.at(-1);
  let best = 0, k = 0;
  for (let i = 1; i < P.length - 1; i++) { const d = segDist(P[i][0], P[i][1], a, b)[0]; if (d > best) { best = d; k = i; } }
  return best > tol ? [...simplify(P.slice(0, k + 1), tol).slice(0, -1), ...simplify(P.slice(k), tol)] : [a, b];
}

const gb = JSON.parse(readFileSync(FILE, 'utf8'));
// Drop what this script wrote before.
for (const k of ['roads', 'areas', 'blockers', 'landmarks', 'pois', 'buildings']) gb[k] = (gb[k] || []).filter((it) => !it.cw);
// The hand-drawn roads it replaces (see the top).
gb.roads = gb.roads.filter((r) => !(r.n?.ko === '청와대로' && r.p.every(([, z]) => z === -460)));
for (const r of gb.roads) if (r.n?.ko === '삼청로' && r.p.every(([x]) => x === 125)) { // (the real Samcheong-ro is drawn below, 50 m west)
  delete r.n;
  r.approx = 1;
  r.why = 'hand-drawn between the palace and Bukchon; was named Samcheong-ro, whose real line (scripts/build-cheongwadae.mjs) is about 50 m west';
}
for (const r of gb.roads) if (r.n?.ko === '효자로' && r.p.every(([x]) => x === -200)) {
  r.n = N('자하문로', 'Jahamun-ro', '紫霞門路', '紫霞门路');
  r.approx = 1;
  r.why = 'hand-drawn; stands in for the real Jahamun-ro, about 55 m east (the real Hyoja-ro is scripts/build-cheongwadae.mjs)';
}

// ---------- The palace wall (to keep the roads off it) ----------
const palace = gb.landmarks.find((l) => l.type === 'wall' && l.gb).p;
const moved = {}; // how far things were pushed off their real line, m (the most)
const note = (k, d) => { moved[k] = Math.max(moved[k] || 0, r1(d)); };
function offWall(x, z, clear) {
  const [d, nx, nz] = nearest(x, z, palace), inP = inside(palace, x, z);
  if (!inP && d >= clear) return [x, z];
  let ux = x - nx, uz = z - nz;
  const l = Math.hypot(ux, uz) || 1;
  ux /= l; uz /= l;
  if (inP) { ux = -ux; uz = -uz; }
  return [nx + ux * clear, nz + uz * clear];
}

// ---------- Roads, on their real lines ----------
const path_ = (ids) => { // chain OSM ways (by id) into one line, each in whichever direction joins
  let out = [];
  for (const id of ids) {
    const rev = id < 0, e = osm.elements.find((x) => x.id === Math.abs(id));
    let P = e.pts.map(local);
    if (rev) P = P.reverse();
    out = out.length ? out.concat(P.slice(1)) : P;
  }
  return out;
};
const W = CW.roadW, clearWall = W / 2 + CW.roadGap;
const realLine = (P, key) => {
  const D = dense(P, 2.5).map(([x, z]) => { const q = offWall(x, z, clearWall); note(key, Math.hypot(q[0] - x, q[1] - z)); return q; });
  return simplify(D, 0.35).map(([x, z]) => [r1(x), r1(z)]);
};
const ROADS = [];
const road = (key, n, P, extra = {}) => { const p = realLine(P, key); ROADS.push({ k: 'tertiary', w: W, p, n, cw: 1, ...extra }); return p; };
const HYOJA = N('효자로', 'Hyoja-ro', '孝子路', '孝子路'), CHEONG = N('청와대로', 'Cheongwadae-ro', '青瓦台路', '青瓦台路'), CHANGUI = N('창의문로', 'Changuimun-ro', '彰義門路', '彰义门路');
// Hyoja-ro: up the palace's west wall from Sajik-ro to the Hyoja-dong junction, then west to Jahamun-ro.
// (it starts on the game's Sajik-ro, z 20: 15 m south of the real one, which makes room for Cheonggyecheon)
const hyP = path_([1147603101, 636449776, 1147603094, 1147603093, 799583673]);
const hy = road('hyoja', HYOJA, [[hyP[0][0], 20], ...hyP]);
const hyW = road('hyoja', HYOJA, path_([799583672, 1147356354, 799583675]));
// (on to the game's Jahamun-ro, the hand-drawn road 55 m west of the real one)
ROADS.push({ k: 'tertiary', w: W, p: [hyW.at(-1), [-200, r1(hyW.at(-1)[1])]], n: HYOJA, approx: 1, why: 'joins the game\'s Jahamun-ro (hand-drawn, x -200)', cw: 1 });
// Cheongwadae-ro: along the palace's north wall, past Sinmumun and the main gate, down to Samcheong-ro.
const cr = road('cheongwadae', CHEONG, path_([799583674, 840875189, -840875185, 840875186, 1505423769].map((id, i) => (i === 0 ? -id : id))));
// Samcheong-ro: on down the palace's east wall to Yulgok-ro (the game's, z 20), so the three roads go round the palace.
const sp = path_([196079109]);
road('samcheong', N('삼청로', 'Samcheong-ro', '三清路', '三清路'), [cr.at(-1), ...sp.slice(1), [sp.at(-1)[0], 20]]);
// Changuimun-ro: from the junction up the grounds' west side to Changuimun.
{ // (it ends where it meets the game's Jahamun-ro, x -200, below Changuimun: the real one runs on beside the gate)
  const P = path_([1147356351, 1532894887, 1532894488, 222018530]), k = P.findIndex(([x]) => x < -200);
  const [a, b] = [P[k - 1], P[k]], t = (-200 - a[0]) / (b[0] - a[0]);
  road('changuimun', CHANGUI, [...P.slice(0, k), [-200, a[1] + (b[1] - a[1]) * t]]);
}
// (the junction: every road that meets there ends on the same point)
const J = hy.at(-1);
for (const r of ROADS) for (const k of [0, r.p.length - 1]) if (Math.hypot(r.p[k][0] - J[0], r.p[k][1] - J[1]) < 6) r.p[k] = [...J];
// (Changuimun-ro leaves Hyoja-ro's west stretch at a bend: start it on that bend)
{ const c = ROADS.find((r) => r.n === CHANGUI), [x, z] = c.p[0]; let k = 0; hyW.forEach((q, i) => { if (Math.hypot(q[0] - x, q[1] - z) < Math.hypot(hyW[k][0] - x, hyW[k][1] - z)) k = i; }); c.p[0] = [...hyW[k]]; }
const roadsOnly = ROADS.filter((r) => !r.approx);
const offRoads = (x, z, clear) => { // push a point off every road, keeping `clear` from its middle line
  for (let it = 0; it < 4; it++) {
    let moved = false;
    for (const r of roadsOnly) {
      const [d, nx, nz] = nearest(x, z, r.p);
      if (d >= clear) continue;
      const ux = (x - nx) / (d || 1), uz = (z - nz) / (d || 1);
      x = nx + ux * clear; z = nz + uz * clear; moved = true;
    }
    if (!moved) break;
  }
  return [x, z];
};

// ---------- The main hall ----------
const hallOut = one('mainhall').pts.map(local);
const HC = centre(hallOut), HB = obb(hallOut.slice(0, -1).map(([x, z]) => [x - HC[0], z - HC[1]]));
// its axes: across (u) along HB.a, and the front facing south (+v)
const ha = HB.a, cs = Math.cos(ha), sn = Math.sin(ha);
const toHall = ([x, z]) => { const dx = x - HC[0], dz = z - HC[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
const fromHall = ([u, v]) => [HC[0] + u * cs - v * sn, HC[1] + u * sn + v * cs];
const S = CW.HALL;
const partBox = (e) => { // its box in the hall's frame at 50%: [u, v, w, d]
  const P = e.pts.map(local).map(toHall), us = P.map((p) => p[0]), vs = P.map((p) => p[1]);
  return [r2(((Math.min(...us) + Math.max(...us)) / 2) * S), r2(((Math.min(...vs) + Math.max(...vs)) / 2) * S), r2((Math.max(...us) - Math.min(...us)) * S), r2((Math.max(...vs) - Math.min(...vs)) * S)];
};
const parts = els('mainhall-part');
const byId = (id) => parts.find((p) => p.id === id);
const H = (m) => r2(m * CW.UP);
const hall = {
  type: 'bluehouse', x: r1(HC[0]), z: r1(HC[1]), ry: r2(-ha), cw: 1, clear: 0,
  outline: hallOut.slice(0, -1).map(toHall).map(([u, v]) => [r2(u * S), r2(v * S)]), // the ground floor's footprint
  base: H(byId(636449773).height), // the ground floor's top
  upper: [...partBox(byId(1222729683)), H(byId(1222729683).min), H(byId(1222729683).height)], // the upper hall: u, v, w, d, y0, y1
  roof: [...partBox(byId(1222729682)), H(byId(1222729682).min), H(byId(1222729682).height)], // its hipped-and-gabled roof
  wings: [1222729684, 1222729685].map((id) => [...partBox(byId(id)), H(byId(id).min), H(byId(id).height)]), // the two wings' roofs
  porch: [...partBox(byId(1413179875)), H(byId(1413179875).min), H(byId(1413179875).height)], // the entrance porch's roof
  colour: byId(1222729682).colour, // the blue tiles (OSM roof:colour)
  name: N('청와대 본관', 'Cheong Wa Dae Main Hall', '青瓦台 本館', '青瓦台 本馆'),
};
const hallFoot = hall.outline.map(fromHall).map(([x, z]) => [r1(x), r1(z)]);
const hallFront = Math.max(...hall.outline.map((p) => p[1])); // v of its front

// ---------- The grounds' fence and the gate ----------
let fence = one('compound').pts.map(local);
fence = fence.slice(0, -1);
// the gate's recess: the four points of the notch on Cheongwadae-ro, widened for the 50% gate
const notch = fence.map((p, i) => [i, p]).filter(([, [x, z]]) => x > -39 && x < -28.5 && z > -241 && z < -223).map(([i]) => i);
const [nA, nB] = [fence[notch[0]], fence[notch.at(-1)]]; // the two front corners (on the street line)
const back = notch.slice(1, -1).map((i) => fence[i]);
const backMid = centre(back), frontMid = [(nA[0] + nB[0]) / 2, (nA[1] + nB[1]) / 2];
let gax = frontMid[0] - backMid[0], gaz = frontMid[1] - backMid[1];
const gl = Math.hypot(gax, gaz); gax /= gl; gaz /= gl; // out of the gate, towards the street
const gu = [-gaz, gax], hw = CW.gateW / 2; // across the gate
const sideOf = (p) => Math.sign((p[0] - backMid[0]) * gu[0] + (p[1] - backMid[1]) * gu[1]);
const wideNotch = [[1, nA], [1, back[0]], [-1, back.at(-1)], [-1, nB]].map(([, p]) => p) // in fence order
  .map((p, k) => { const s = sideOf(p), depth = (p[0] - backMid[0]) * gax + (p[1] - backMid[1]) * gaz; return [backMid[0] + gu[0] * s * hw + gax * depth, backMid[1] + gu[1] * s * hw + gaz * depth, k]; })
  .map(([x, z]) => [x, z]);
fence.splice(notch[0], notch.length, ...wideNotch);
note('gate recess', Math.max(...wideNotch.map((p, k) => Math.hypot(p[0] - [nA, back[0], back.at(-1), nB][k][0], p[1] - [nA, back[0], back.at(-1), nB][k][1]))));
// the fence as one open line from one gate post round to the other (the gate stands in the gap),
// pushed off the roads (the pavement)
const post2 = fence.indexOf(fence.find((p) => p === wideNotch[2]));
const open0 = fence.slice(post2).concat(fence.slice(0, post2)); // post 2 ... post 1
const clearFence = W / 2 + CW.fenceGap;
let loop = dense(open0, 3).map(([x, z]) => offRoads(x, z, clearFence));
loop = simplify(loop, 0.3).map(([x, z]) => [r1(x), r1(z)]);
for (const p of loop) note('fence', nearest(p[0], p[1], [...open0, open0[0]])[0]);
const gate = { type: 'bluegate', x: r1(backMid[0]), z: r1(backMid[1]), ry: r2(Math.atan2(gax, gaz)), w: CW.gateW, up: CW.UP, note: CW.note, cw: 1, name: N('청와대 정문', 'Cheong Wa Dae Main Gate', '青瓦台 正門', '青瓦台 正门') };
const fenceLine = { type: 'bhfence', x: 0, z: 0, line: loop, cw: 1, why: 'Cheong Wa Dae grounds on OSM\'s line (way 539791492), pushed off the roads where they run along it (meta.cheongwadae.moved)' };

// ---------- The lawn, the woods ----------
const gateV = toHall(backMid)[1]; // the gate in the hall's frame
// The lawn: everything in front of the hall, so from the street (through the
// railings) and from the gate the hall stands in the open; woods only behind
// and beside the hall.
const lawnHall = [[-400, hallFront + 3], [400, hallFront + 3], [400, gateV + 400], [-400, gateV + 400]];
const fencePoly = [[...loop.map((p) => [p[0], p[1]]), loop[0]]];
const clip = (A) => polygonClipping.intersection([A], fencePoly)[0][0];
let lawn = clip([...lawnHall.map(fromHall), fromHall(lawnHall[0])]).slice(0, -1).map(([x, z]) => [r1(x), r1(z)]);
const upperFront = hall.upper[1] + hall.upper[3] / 2; // (the front of the upper hall: the forecourt reaches in between the wings to it)
const apron = [[-hall.roof[2] / 2 - 2, hallFront + 3], [hall.roof[2] / 2 + 2, hallFront + 3], [hall.roof[2] / 2 + 2, upperFront - 0.5], [-hall.roof[2] / 2 - 2, upperFront - 0.5]].map(fromHall).map(([x, z]) => [r1(x), r1(z)]);
const drive = [[-2.2, gateV - 1], [2.2, gateV - 1], [2.2, hallFront + 3], [-2.2, hallFront + 3]].map(fromHall).map(([x, z]) => [r1(x), r1(z)]);
// The gate's recess off Cheongwadae-ro: paved, from the gate out to the street.
const recess = [[backMid[0] + gu[0] * hw, backMid[1] + gu[1] * hw], [backMid[0] - gu[0] * hw, backMid[1] - gu[1] * hw], [frontMid[0] - gu[0] * hw, frontMid[1] - gu[1] * hw], [frontMid[0] + gu[0] * hw, frontMid[1] + gu[1] * hw]].map(([x, z]) => [r1(x), r1(z)]);
const ring = (P) => [[...P, P[0]]];
const open = (R) => R.slice(0, -1).map(([x, z]) => [r1(x), r1(z)]);
const woods = polygonClipping.difference(fencePoly, ring(lawn), ring(apron), ring(drive), ring(hallFoot)).map((poly) => ({ p: open(poly[0]), holes: poly.slice(1).map(open) }));

// ---------- The fountain plaza and Sarangchae ----------
const roadClear = (P, clear) => { // cut a polygon back from every road (keep `clear` from its middle line); its biggest piece
  const bands = [];
  for (const r of ROADS) for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], l = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / l, uz = (bz - az) / l, nx = -uz * clear, nz = ux * clear, ex = ux * clear, ez = uz * clear;
    bands.push([[[ax - ex + nx, az - ez + nz], [bx + ex + nx, bz + ez + nz], [bx + ex - nx, bz + ez - nz], [ax - ex - nx, az - ez - nz], [ax - ex + nx, az - ez + nz]]]);
  }
  const out = polygonClipping.difference(ring(P), ...bands);
  const A = (R) => { let s = 0; for (let i = 0; i < R.length - 1; i++) s += R[i][0] * R[i + 1][1] - R[i + 1][0] * R[i][1]; return Math.abs(s / 2); };
  return open(out.sort((a, b) => A(b[0]) - A(a[0]))[0][0]);
};
const plazaReal = one('plaza').pts.map(local);
const plaza = roadClear(plazaReal.slice(0, -1), W / 2 + 0.6);
const fReal = centre(one('fountain').pts.map(local));
const fr = r2(Math.max(...one('fountain').pts.map(local).map(([x, z]) => Math.hypot(x - fReal[0], z - fReal[1])))); // its basin, 1/4
const fAt = (() => { // on its real spot, or as near as keeps the basin on the plaza with a step round it
  let best = null;
  for (let dx = -8; dx <= 8; dx += 0.5) for (let dz = -8; dz <= 8; dz += 0.5) {
    const x = fReal[0] + dx, z = fReal[1] + dz;
    if (!inside(plaza, x, z) || nearest(x, z, [...plaza, plaza[0]])[0] < fr + 1.5) continue;
    const d = Math.hypot(dx, dz);
    if (!best || d < best[2]) best = [x, z, d];
  }
  return best;
})();
note('fountain', fAt[2]);
const fountain = { type: 'bhfountain', x: r1(fAt[0]), z: r1(fAt[1]), r: fr, cw: 1, name: N('청와대 분수대', 'Cheong Wa Dae Fountain', '青瓦台 噴水台', '青瓦台 喷水台') };
// Sarangchae: OSM has only one corner of it. Its outline is drawn from the
// aerial view (Naver/Kakao, 2026-11-23): a boomerang between the plaza and
// its car park, cut back from Hyoja-ro.
const SARANG_APPROX = [[-97, -194], [-90, -195.5], [-86, -191.5], [-80, -191.5], [-80, -178.5], [-88, -178.5], [-93, -182], [-99, -186]];
const sarang = roadClear(SARANG_APPROX, W / 2 + 1.2);
const sarangPart = centre(one('sarangchae').pts.map(local));

// ---------- Write ----------
gb.roads.push(...ROADS);
gb.areas.push({ k: 'plaza', p: plaza, cw: 1, why: 'the fountain plaza at the Hyoja-dong junction (OSM way 222969855, cut back from the roads)' });
gb.areas.push({ k: 'plaza', p: recess, cw: 1, why: 'the main gate\'s recess off Cheongwadae-ro' });
gb.areas.push({ k: 'grass', p: lawn, cw: 1, approx: 1, why: 'Cheong Wa Dae\'s big lawn (대정원) and gardens in front of the main hall (not in OSM: everything in front of the hall)' });
gb.areas.push({ k: 'stone', p: apron, cw: 1, approx: 1, why: 'the forecourt in front of the main hall' });
gb.areas.push({ k: 'stone', p: drive, cw: 1, approx: 1, why: 'the drive from the gate to the main hall' });
for (const w of woods) gb.areas.push({ k: 'park', p: w.p, ...(w.holes.length ? { holes: w.holes } : {}), trees: true, cw: 1, why: 'Cheong Wa Dae\'s grounds behind and beside the main hall: woods (what stands there is not drawn)' });
gb.buildings.push({ h: 7, p: sarang, cw: 1, approx: 1, why: 'Cheong Wa Dae Sarangchae (OSM has one part of it, at ' + sarangPart.map(r1) + '; the rest from the aerial view)' });
// An information board on the pavement beside the gate (Korean, or the player's language: core/park-signs.js).
const signAt = [backMid[0] + gax * 5 + gu[0] * (hw - 1.6), backMid[1] + gaz * 5 + gu[1] * (hw - 1.6)]; // (inside the recess, by its side)
const sign = { type: 'sign', x: r1(signAt[0]), z: r1(signAt[1]), ry: r2(Math.atan2(gax, gaz)), cw: 1,
  title: N('청와대', 'Cheong Wa Dae', '青瓦台', '青瓦台'),
  text: N('대통령이 일하는 곳이에요. 2022년부터 시민에게 열렸다가, 2025년 12월 대통령실이 다시 들어와 지금은 보안 시설이라 들어갈 수 없어요. 정문 앞에서 본관과 북악산을 구경해 주세요.',
    'The president\'s office. It was open to the public from 2022, and the office moved back in December 2025: it is a security facility again, so visitors cannot go in. Enjoy the main hall and Bugaksan from the gate.',
    '大統領が働く場所です。2022年から一般公開されていましたが、2025年12月に大統領室が戻り、今は保安施設のため中には入れません。正門の前から本館と北岳山を眺めてください。',
    '这里是总统办公的地方。2022年起曾向市民开放，2025年12月总统办公室迁回后，现在是安保设施，不能入内。请在正门前欣赏本馆和北岳山。'),
};
gb.landmarks.push(hall, gate, fenceLine, fountain, sign);
// The fence all round (you cannot go in), the gate's leaves, the hall.
const seg = (a, b, t = 0.9) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; return [[-L / 2 - 0.2, -t / 2], [L / 2 + 0.2, -t / 2], [L / 2 + 0.2, t / 2], [-L / 2 - 0.2, t / 2]].map(([u, v]) => [r2(mx + u * c - v * s), r2(mz + u * s + v * c)]); };
for (let i = 1; i < loop.length; i++) gb.blockers.push({ p: seg(loop[i - 1], loop[i]), cw: 1 });
const gL = [backMid[0] + gu[0] * hw, backMid[1] + gu[1] * hw], gR = [backMid[0] - gu[0] * hw, backMid[1] - gu[1] * hw];
gb.blockers.push({ p: seg(gL, gR, 1.4), cw: 1 }); // the gate (shut)
gb.blockers.push({ p: hallFoot, cw: 1 });
gb.blockers.push({ p: Array.from({ length: 12 }, (_, i) => [r2(fountain.x + Math.cos((i / 12) * Math.PI * 2) * (fr + 0.3)), r2(fountain.z + Math.sin((i / 12) * Math.PI * 2) * (fr + 0.3))]), cw: 1 });
gb.blockers.push({ p: sarang, cw: 1 });
gb.pois.push({ kind: 'landmark', x: r1(backMid[0] + gax * 6), z: r1(backMid[1] + gaz * 6), name: N('청와대', 'Cheong Wa Dae', '青瓦台', '青瓦台'), cw: 1 });
gb.pois.push({ kind: 'landmark', x: r1(sarangPart[0] - 4), z: r1(sarangPart[1] + 5), name: N('청와대 사랑채', 'Cheong Wa Dae Sarangchae', '青瓦台 サランチェ', '青瓦台 舍廊房'), cw: 1 });
// The park round the palace (scripts/build-gyeongbokgung.mjs) would cover the plaza (a park is drawn over paving): cut it out.
gb.areas = gb.areas.flatMap((a) => {
  if (!a.gb || a.k !== 'park' || a.cw) return [a];
  const out = polygonClipping.difference([[...a.p, a.p[0]]], ring(plaza), ring(recess));
  return out.map((poly) => ({ ...a, p: open(poly[0]), ...(poly.length > 1 ? { holes: poly.slice(1).map(open) } : {}) })); // (the plaza is inside it: a hole)
});
gb.meta.cheongwadae = {
  why: 'Cheong Wa Dae from the street only: a security facility (the president\'s office since 2025-12-29), no way in; the main hall and the gate at 50%, the rest at 1/4 (Yozi 2026-11-23). scripts/build-cheongwadae.mjs',
  hall: { real: [r1(HC[0]), r1(HC[1])], scale: S, size: [r1(HB.w * S), r1(HB.d * S)] },
  moved: Object.fromEntries(Object.entries(moved).map(([k, v]) => [k, r1(v)])),
  approx: ['the lawn, the forecourt and the drive (not in OSM)', 'Sarangchae\'s outline beyond OSM\'s one part', 'the link from Hyoja-ro to the game\'s Jahamun-ro (x -200)'],
};
const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']');
writeFileSync(FILE, pretty(gb) + '\n');
console.log('moved (m):', JSON.stringify(gb.meta.cheongwadae.moved), '| hall', gb.meta.cheongwadae.hall.size, '| fence pts', loop.length, '| woods', woods.length, '| plaza', plaza.length, '| sarangchae', sarang.length);

// ---------- A plan on the real map (OSM at 1/4) ----------
const si = process.argv.indexOf('--svg');
if (si > 0) {
  const X0 = -215, Z0 = -470, X1 = 135, Z1 = -90, K = 3, P = ([x, z]) => `${r1((x - X0) * K)},${r1((z - Z0) * K)}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${(X1 - X0) * K}" height="${(Z1 - Z0) * K + 60}" font-family="sans-serif"><rect width="100%" height="100%" fill="#f4f1ea"/>`;
  s += `<polygon points="${palace.map(P).join(' ')}" fill="#e9dcc0" stroke="#7a6a50" stroke-width="3"/>`;
  for (const w of woods) s += `<polygon points="${w.p.map(P).join(' ')}" fill="#bcd9a8"/>`;
  s += `<polygon points="${lawn.map(P).join(' ')}" fill="#9fd486"/>`;
  s += `<polygon points="${plaza.map(P).join(' ')}" fill="#d8d0e8"/>`;
  s += `<polygon points="${sarang.map(P).join(' ')}" fill="#888"/>`;
  for (const r of gb.roads) if (r.p.some(([x, z]) => z < -90 && z > -470 && x > X0 && x < X1)) s += `<polyline points="${r.p.map(P).join(' ')}" fill="none" stroke="${r.cw ? (r.approx ? '#e0a040' : '#555') : '#aaa'}" stroke-width="${r.w * K}" stroke-opacity="0.55"/>`;
  s += `<polyline points="${[...loop].map(P).join(' ')}" fill="none" stroke="#1d3d1d" stroke-width="3"/>`;
  s += `<polygon points="${hallFoot.map(P).join(' ')}" fill="${hall.colour}"/>`;
  s += `<circle cx="${(fountain.x - X0) * K}" cy="${(fountain.z - Z0) * K}" r="${fr * K}" fill="#5b9fc4"/>`;
  // the real map on top, in red (OSM at 1/4)
  s += `<polygon points="${one('compound').pts.map(local).map(P).join(' ')}" fill="none" stroke="#d1403a" stroke-width="2" stroke-dasharray="6 4"/>`;
  s += `<polygon points="${hallOut.map(P).join(' ')}" fill="none" stroke="#d1403a" stroke-width="2"/>`;
  for (const e of els('road')) s += `<polyline points="${e.pts.map(local).map(P).join(' ')}" fill="none" stroke="#d1403a" stroke-width="2"/>`;
  s += `<polygon points="${plazaReal.map(P).join(' ')}" fill="none" stroke="#d1403a" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${(fReal[0] - X0) * K}" cy="${(fReal[1] - Z0) * K}" r="${fr * K}" fill="none" stroke="#d1403a" stroke-width="2"/>`;
  s += `<text x="10" y="${(Z1 - Z0) * K + 24}" font-size="17">red = real (OSM at 1/4) · grey roads = game · orange = made-up links · dark line = the fence · blue = main hall at 50%</text>`;
  s += `<text x="10" y="${(Z1 - Z0) * K + 48}" font-size="17">moved off the real line (m): ${Object.entries(gb.meta.cheongwadae.moved).map(([k, v]) => `${k} ${v}`).join(', ')}</text>`;
  writeFileSync(process.argv[si + 1], s + '</svg>');
}
