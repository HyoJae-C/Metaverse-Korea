#!/usr/bin/env node
// Gimpo Airport (김포국제공항, Gangseo-gu) at 1/4 on its real place (Yozi
// 2026-11-21). What it is for: watching planes (from the domestic
// terminal's roof deck) and the feeling of landing in Seoul.
//
//   The airfield: OSM's fence (relation 7363469) at 1/4, about 1,006 x 913 m,
//     grass you can't walk into, with the aprons paved.
//   The runways: OSM's centre lines and lengths at 1/4 (900 and 800 m), but
//     half the real width (22.5 and 30 m) so the half-size planes fit (Yozi's
//     card 2026-11-21: planes and runway width 50%).
//   The terminals: OSM's outlines at 1/4 (domestic 154 x 27 m, international
//     153 x 33 m), "custom" buildings drawn by game/gimpo-site.js.
//   The roof deck: on the domestic terminal where OSM has the real one, made
//     bigger so people fit, reached by a stair on the kerb side (made up).
//   Flights: core/gimpo-flights.js (taxi paths, stands) from what is here.
//
// Data: scripts/data/gimpo-osm.json (© OpenStreetMap contributors, ODbL).
// Made-up things are listed in meta.approx.
//
//   node scripts/build-gimpo.mjs           writes districts/gimpo.json
//   node scripts/build-gimpo.mjs --check   prints the numbers only
// then: place-districts.mjs, build-base.mjs, build-closed.mjs, build-seoul.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame, anchorOffset } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/gimpo-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

// The district's anchor: the middle of the domestic terminal (its OSM outline's corners averaged).
const domReal = osm.ways.domestic.p.slice(0, -1);
const mid = [domReal.reduce((s, q) => s + q[0], 0) / domReal.length, domReal.reduce((s, q) => s + q[1], 0) / domReal.length];
export const ANCHOR = { place: 'Gimpo Airport, the middle of the domestic terminal (Gangseo-gu)', lat: Math.round(mid[0] * 1e6) / 1e6, lon: Math.round(mid[1] * 1e6) / 1e6, local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
const [OX, OZ] = OFFSET;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const way = (k) => osm.ways[k].p.map(L);
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);
const open = (p) => (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p);

function simplify(p, tol) { // Douglas-Peucker (open line)
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, az] = p[a], [bx, bz] = p[b], dx = bx - ax, dz = bz - az, ll = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / ll; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
const ring = (p, tol) => { // a closed ring, simplified in two halves
  const q = open(p);
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
};

// --- The airport's own frame ---------------------------------------------------
// u along the runways (towards the north-west, the way planes take off on
// 32L/32R), v across them (towards the north-east: the kerb side). The
// terminal's middle is (0, 0).
const rwL = way('runwayL'), rwR = way('runwayR');
const ang = Math.atan2(rwL.at(-1)[0] - rwL[0][0], rwL.at(-1)[1] - rwL[0][1]); // radians from +z towards +x
const U = [Math.sin(ang), Math.cos(ang)], V = [-U[1], U[0]];
if (V[0] < 0) throw new Error('v should point north-east');
const toUV = ([x, z]) => [x * U[0] + z * U[1], x * V[0] + z * V[1]];
const fromUV = ([u, v]) => [u * U[0] + v * V[0], u * U[1] + v * V[1]];
const UV = (pts) => R1(pts.map(fromUV));
const rect = (u0, v0, u1, v1) => UV([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);

// Runways: OSM's ends, half the real width (the decided 50%).
const runway = (p, realW) => {
  const a = toUV(p[0]), b = toUV(p.at(-1));
  return { a: R1([fromUV(a)])[0], b: R1([fromUV(b)])[0], v: r1((a[1] + b[1]) / 2), u0: r1(Math.min(a[0], b[0])), u1: r1(Math.max(a[0], b[0])), w: realW / 2, len: r1(Math.hypot(b[0] - a[0], b[1] - a[1])) };
};
const runwayL = runway(rwL, +osm.ways.runwayL.tags.width), runwayR = runway(rwR, +osm.ways.runwayR.tags.width);

// --- Buildings -------------------------------------------------------------------------
const domestic = ring(way('domestic'), 0.5), intl = ring(way('intl'), 0.5);
const cargo = ring(way('cargo'), 1), kac = ring(way('kac'), 1), hangarCargo = ring(way('hangarCargo'), 1), hangarMaint = ring(way('hangarMaint'), 1);
export const TERMINAL_H = 6.5; // m: a 4-storey hall at 1/4 (about 26 m real)
const domUV = domestic.map(toUV);
const domU = [Math.min(...domUV.map((q) => q[0])), Math.max(...domUV.map((q) => q[0]))];
const domV = [Math.min(...domUV.map((q) => q[1])), Math.max(...domUV.map((q) => q[1]))];

// --- The roof deck -------------------------------------------------------------------
// OSM's deck (way 781291816) is 32 x 6 m real, 8 x 1.5 m at 1/4: too small
// to stand on. Here it is a balcony along the airside edge around that spot,
// a walk across the roof to the kerb side, and a stair down beside the
// front door (all made up; Gimpo's real deck is reached from inside).
const deckReal = way('deck').map(toUV);
const deckU = (Math.min(...deckReal.map((q) => q[0])) + Math.max(...deckReal.map((q) => q[0]))) / 2;
export const DECK = {
  y: TERMINAL_H,
  balcony: [deckU - 22, -10, deckU + 12, -3], // u0, v0, u1, v1: 34 x 7 m, 4 m out past the airside wall (v -6)
  walk: [deckU - 22, -10, deckU - 14, 17], // across the roof to the kerb side
  stair: [deckU - 44, 13, deckU - 18, 17], // down along the front, its foot at u0 (ground) and top at u0 + 20
  run: 20, // m of stair (an 18° slope)
};

// --- Stands and taxiing ---------------------------------------------------------------
// Half-size planes (about 22 m long, 18 m across) nose-in at the terminal's
// airside wall, with a jet bridge each. The middle (in front of the deck) is
// left open so the runways show. Made up: OSM has no stand numbers here.
export const PLANE = { len: 22.3, span: 17.9, h: 5.9 }; // an A321-sized jet at 50%
const STAND_V = -6 - 3.5 - PLANE.len / 2; // plane's middle: the wall, 3.5 m of jet bridge, half the plane
const stands = [-98, -74, -50, 32, 54].map((u, i) => ({ n: i + 1, at: UV([[u, STAND_V]])[0], u, v: r1(STAND_V), bridge: u - 2.6 > domU[0] + 1 && u - 2.6 < domU[1] - 1, ry: r3(Math.atan2(V[0], V[1])) })); // facing +v (the terminal)
// Two more on the international terminal's airside (it faces +u, the
// apron north-west of it), nose-in with a jet bridge each, where its wall
// is straight. They stay parked: flights use the domestic stands.
const intlUV = intl.map(toUV);
const wallAt = (v) => Math.max(...intlUV.filter((q) => Math.abs(q[1] - v) < 10).map((q) => q[0])); // the airside wall near v
const intlStands = [52, 168].map((v, i) => { const wall = wallAt(v), u = wall + 3.5 + PLANE.len / 2; return { n: stands.length + i + 1, at: UV([[u, v]])[0], u: r1(u), v, wall: r1(wall), bridge: true, ry: r3(Math.atan2(-U[0], -U[1])) }; }); // facing -u (the terminal)
const TAXI_V = -62; // the taxilane along the apron
const HOLD_U = runwayL.u0 + 12; // departures line up near the south-east end of runway 32R (OSM 14L/32R)
const EXIT_U = 262; // landings leave runway 32L here and taxi back across 32R
export const FLY = {
  // In the airport frame (u, v); core/gimpo-flights.js turns them into paths.
  taxiV: TAXI_V, holdU: r1(HOLD_U), exitU: EXIT_U,
  depart: { runway: 'L', rotateU: 190, outU: 1700, climbTo: 160 },
  land: { runway: 'R', fromU: -1600, fromY: 120, touchU: runwayR.u0 + 60 },
};

// --- The kerb side ---------------------------------------------------------------
// One road along the front of the terminal and a paved forecourt between it
// and the wall, on to Gimpo Airport Station's exits (made up: the real
// kerbside is two decks of lanes).
const FRONT_V = domV[1] + 9;
const front = UV([[domU[0] - 12, FRONT_V], [domU[1] - 8, FRONT_V]]);
// A road from the kerb straight out to where Gonghang-daero, Gaehwadong-ro
// and Nambusunhwan-ro meet (OSM), so the forecourt joins the city's roads (made up).
const JUNCTION = L([37.561848, 126.807056]); // (the base map's Gonghang-daero ends there: scripts/build-base.mjs)
const access = R1([fromUV([toUV(JUNCTION)[0], FRONT_V]), JUNCTION]);
const forecourt = rect(domU[0] - 16, domV[1] - 1, domU[1] + 70, FRONT_V + 40);
// The international terminal's kerb: its front door is the middle of the
// landside wall (u 163, v 88-128 in OSM); a road runs on from 하늘길 along
// its front (made up), with a canopy over the door (game/gimpo-site.js).
const intlU0 = Math.min(...intlUV.map((q) => q[0]));
const intlV = [Math.min(...intlUV.map((q) => q[1])), Math.max(...intlUV.map((q) => q[1]))];
const INTL_KERB_U = intlU0 - 11;
const INTL_LINK_V = 100; // off the access road, clear of the station's exits (1-4 are on the domestic forecourt)
const intlFront = UV([[toUV(JUNCTION)[0], INTL_LINK_V], [INTL_KERB_U, INTL_LINK_V], [INTL_KERB_U, intlV[1]]]);
const intlFrontS = UV([[INTL_KERB_U, INTL_LINK_V], [INTL_KERB_U, intlV[0]]]);
const intlKerb = rect(INTL_KERB_U + 4, intlV[0] - 1, intlU0 + 0.5, intlV[1]);
const intlDoor = { u: r1(intlU0), v0: 92, v1: 124 }; // the canopy over the front door

// --- The airfield -------------------------------------------------------------------
// OSM's fence is the blocker; the terminals sit across it (half in, half
// out), so the forecourt is cut out of it on the kerb side.
const fence = ring(way('aerodrome'), 2);
const aprons = Object.keys(osm.ways).filter((k) => k.startsWith('apron')).map((k) => ring(way(k), 1.5));

const nameOf = { ko: '김포국제공항', en: 'Gimpo International Airport', ja: '金浦国際空港', zh: '金浦国际机场' };
const map = {
  meta: {
    district: 'gimpo',
    source: 'scripts/build-gimpo.mjs, at 1/4 on the real place: the airfield fence, runways, aprons, terminals, cargo terminal and hangars from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/gimpo-osm.json).',
    approx: [
      { what: 'runway width', why: 'Half the real width (22.5 and 30 m, not 11 and 15 m at 1/4) so the half-size planes fit (Yozi 2026-11-21). Centre lines and lengths are OSM at 1/4.' },
      { what: 'the roof deck', why: 'OSM has the real deck (8 x 1.5 m at 1/4) on the domestic terminal; drawn as a 34 x 7 m balcony around that spot, a walk across the roof and a stair down the front so people fit and can get up.' },
      { what: 'the stands and jet bridges', why: 'Five nose-in stands on the domestic terminal airside, left open in front of the deck, and two (always parked) on the international terminal airside; OSM has no stand positions here.' },
      { what: 'the kerbside road and forecourt', why: 'One road and one paved forecourt along the domestic terminal, one road on along the international terminal front with a kerb and a door canopy, and one road straight out to the Gonghang-daero junction; the real kerbside is a two-level road with ramps.' },
      { what: 'taxi paths', why: 'Planes taxi along a made-up lane 62 m out from the terminal and cross to the runways on made-up links; OSM taxiways are not drawn.' },
      { what: 'airline', why: 'MODU AIR is made up (Yozi 2026-11-21); no real airline is drawn.' },
    ],
  },
  roads: [
    { k: 'tertiary', w: 8, p: front, n: { ko: '하늘길', en: 'Haneul-gil', ja: 'ハヌル路', zh: '天空路' } },
    { k: 'tertiary', w: 8, p: access },
    { k: 'tertiary', w: 8, p: intlFront },
    { k: 'tertiary', w: 8, p: intlFrontS },
  ],
  buildings: [
    { h: TERMINAL_H, p: R1(domestic), n: { ko: '김포국제공항 국내선', en: 'Gimpo International Airport Domestic Terminal' }, custom: true },
    { h: TERMINAL_H, p: R1(intl), n: { ko: '김포국제공항 국제선', en: 'Gimpo International Airport International Terminal' }, custom: true },
    { h: 5, p: R1(cargo) },
    { h: 6, p: R1(kac) },
    { h: 8, p: R1(hangarCargo) },
    { h: 8, p: R1(hangarMaint) },
  ],
  areas: [
    { k: 'grass', p: R1(fence), holes: aprons.map(R1) }, // (the aprons are paving)
    ...aprons.map((p) => ({ k: 'plaza', p: R1(p) })),
    { k: 'plaza', p: forecourt, n: nameOf },
    { k: 'plaza', p: intlKerb },
  ],
  blockers: [{ p: R1(fence) }],
  pois: [
    { kind: 'landmark', x: 0, z: 0, name: nameOf },
  ],
  landmarks: [
    {
      type: 'gimpoairport', x: 0, z: 0, u: [r3(U[0]), r3(U[1])], v: [r3(V[0]), r3(V[1])],
      runways: { L: runwayL, R: runwayR },
      domestic: R1(domestic), intl: R1(intl), h: TERMINAL_H,
      deck: DECK, stands, intlStands, intlDoor, fly: FLY, plane: PLANE,
      forecourt, aprons: aprons.map(R1),
    },
  ],
};

// The forecourt (and the stair's foot) must be outside the fence, or you can't stand there.
function inPoly(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
const fenceCut = (() => { // the fence with the forecourt's strip cut out (only where they overlap: the kerb side of the terminals)
  // Points of the fence inside the forecourt's box are pushed back to its airside edge.
  const out = fence.map(([x, z]) => { const [u, v] = toUV([x, z]); if (u > domU[0] - 16 && u < domU[1] + 70 && v > domV[1] - 1) return fromUV([u, domV[1] - 1]); return [x, z]; });
  return out;
})();
map.blockers = [{ p: R1(fenceCut) }];
const foot = fromUV([DECK.stair[0], (DECK.stair[1] + DECK.stair[3]) / 2]);
if (inPoly(foot[0], foot[1], fenceCut)) throw new Error('the deck stair starts inside the fence');

const span = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [r1(Math.max(...xs) - Math.min(...xs)), r1(Math.max(...zs) - Math.min(...zs))]; };
console.log({
  OFFSET, ANCHOR, runwayHeadingDeg: r1(((ang * 180) / Math.PI + 360) % 360), fence: span(fence), fencePts: fence.length,
  runwayL: [runwayL.len, runwayL.w, runwayL.v], runwayR: [runwayR.len, runwayR.w, runwayR.v],
  domesticUV: [domU.map(r1), domV.map(r1)], domesticPts: domestic.length, intlPts: intl.length, deckU: r1(deckU), stands: stands.map((s) => s.u),
  intlStands: intlStands.map((s) => [s.u, s.v, s.wall]), intlU0: r1(intlU0), intlV: intlV.map(r1),
});
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'gimpo.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/gimpo.json', Math.round((JSON.stringify(map).length / 1024) * 10) / 10, 'KB');
}
