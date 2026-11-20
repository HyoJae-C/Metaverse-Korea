#!/usr/bin/env node
// Seoul Arts Center (예술의전당, Seocho-gu), south of Nambusunhwan-ro at the
// foot of Umyeonsan: the Opera House (the round hall under its 갓, the
// horsehair hat's roof), the Music Hall (the fan), Hangaram Art Museum,
// Hangaram Design Museum, the Calligraphy Museum and the lawn and fountain
// between them.
//
// The whole place is one piece at 50% of the real one (Yozi 2026-11-21:
// Seocho has little else to see, so it is big on purpose): the site, every
// building and the gaps between them are the OpenStreetMap outlines at 1/4,
// doubled about the district's anchor, the crossing of Banpo-daero and
// Nambusunhwan-ro in front of the gate. A point on a road through the anchor
// stays on that road, so the front still runs along Nambusunhwan-ro (which is
// the base map's, at 1/4: scripts/build-base.mjs) and the site grows away
// from it, towards the hill. Heights are 50% of estimates (meta.approx).
//
// Data: scripts/data/arts-center-osm.json (© OpenStreetMap contributors, ODbL).
//
//   node scripts/build-arts-center.mjs           writes districts/arts-center.json
//   node scripts/build-arts-center.mjs --check   prints the numbers only
// then: node scripts/build-base.mjs && node scripts/build-closed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import polygonClipping from 'polygon-clipping';
import { toGame, anchorOffset } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const osm = JSON.parse(readFileSync(path.join(root, 'scripts/data/arts-center-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const R1 = (p) => p.map(([x, z]) => [r1(x), r1(z)]);

export const ANCHOR = { place: 'The crossing of Banpo-daero and Nambusunhwan-ro, in front of Seoul Arts Center (Seocho-gu)', lat: 37.4805396, lon: 127.012969, local: [0, 0] };
export const OFFSET = anchorOffset(ANCHOR);
export const GROW = 2; // the place is 50% of the real one: the 1/4 outlines, doubled about the anchor
const [AX, AZ] = toGame(ANCHOR.lat, ANCHOR.lon);
// (real lat/lon -> this map's metres) at 1/4, and grown about the anchor
const Q = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OFFSET[0], z - OFFSET[1]]; };
const G = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [(x - AX) * GROW + AX - OFFSET[0], (z - AZ) * GROW + AZ - OFFSET[1]]; };

export const ARTS = {
  roadClear: 9.5, // m from Nambusunhwan-ro's middle to the site's edge (the base road is 14 m wide)
  // Heights (m), 50% of the real buildings as estimated from photos:
  opera: { eave: 9.6, top: 22 }, // real: about 100 m across (OSM), the hat's tip about 44 m up
  operaBack: 15, // the stage house behind the round hall
  music: { wall: 10.5, top: 14 },
  hangaram: 8, design: 6, calligraphy: 8, practice: 7,
};

// --- Helpers ---------------------------------------------------------------
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [a, b] = p[i], [c, d] = p[(i + 1) % p.length]; s += a * d - c * b; } return s / 2; };
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const open = (p) => (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p.slice());
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineDist = (x, z, p) => { let d = Infinity; for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(x, z, p[i - 1], p[i])); return d; };
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);
export const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
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
// (a closed ring: the two halves either side of the point farthest from the first)
function simplifyRing(p, tol) {
  const q = open(p);
  let far = 0, fd = -1; q.forEach(([x, z], i) => { const d = Math.hypot(x - q[0][0], z - q[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplify(q.slice(0, far + 1), tol), b = simplify(q.slice(far).concat([q[0]]), tol);
  return a.concat(b.slice(1, -1));
}
const band = (p, w) => p.slice(1).map((q, i) => { const a = p[i], len = Math.hypot(q[0] - a[0], q[1] - a[1]) || 1, ux = (q[0] - a[0]) / len, uz = (q[1] - a[1]) / len, nx = -uz * w, nz = ux * w, ex = ux * w, ez = uz * w; return [[[a[0] - ex + nx, a[1] - ez + nz], [q[0] + ex + nx, q[1] + ez + nz], [q[0] + ex - nx, q[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz], [a[0] - ex + nx, a[1] - ez + nz]]]; });
const grown = (p, m) => { const [cx, cz] = centroid(p); return p.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz) || 1; return [x + ((x - cx) / d) * m, z + ((z - cz) / d) * m]; }); };

const A = osm.areas;
const ring = (k) => open(A[k].p.map(G));

// --- The roads in front (real lines at 1/4: the base map draws them) --------
const nambu = osm.roads.filter((r) => r.name === '남부순환로').map((r) => r.p.map(Q));
const banpo = osm.roads.filter((r) => r.name === '반포대로').map((r) => r.p.map(Q));
const roadDist = (x, z) => Math.min(...nambu.map((p) => lineDist(x, z, p)), ...banpo.map((p) => lineDist(x, z, p)));

// --- The site ----------------------------------------------------------------
// OSM's outline grown about the anchor, kept clear of the two roads.
const siteRaw = ring('site');
const cut = polygonClipping.difference([siteRaw.concat([siteRaw[0]])], ...nambu.flatMap((p) => band(p, ARTS.roadClear)), ...banpo.flatMap((p) => band(p, ARTS.roadClear)));
const site = R1(simplifyRing(cut.sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))[0][0], 0.4));

// --- The buildings -------------------------------------------------------------
// The Opera House's round hall: a circle through OSM's ring.
const operaRing = ring('opera');
const [ocx, ocz] = centroid(operaRing);
const operaR = operaRing.reduce((s, [x, z]) => s + Math.hypot(x - ocx, z - ocz), 0) / operaRing.length;
const circle = (cx, cz, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const operaBack = R1(simplifyRing(ring('operaBack'), 0.5));
const music = R1(simplifyRing(ring('music'), 0.4));
const hangaram = R1(ring('hangaram'));
const design = R1(ring('design'));
const practice = R1(simplifyRing(ring('practice'), 0.6));
// The Calligraphy Museum: OSM has it in three slices; one outline round them.
const calligraphy = (() => {
  const u = polygonClipping.union(...['calligraphy', 'calligraphyB', 'calligraphyC'].map((k) => [grown(ring(k), 0.6).concat([grown(ring(k), 0.6)[0]])]));
  return R1(simplifyRing(u.sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))[0][0], 0.6));
})();

// The Music Fountain (세계음악분수) and the lawn in front of the Opera House.
const fountain = R1(ring('fountain'));
const [fcx, fcz] = centroid(fountain);
// The front of the Opera House: it looks across the lawn towards the
// fountain and the Music Hall (Yozi's photos: the lawn lies before the
// round hall, the pool beside it).
// Its door looks out between the fountain and the open middle: turned from
// the fountain's direction towards the middle until the lawn clears the pool.
const LAWN = { from: 3.6, depth: 9, half: 11, gap: 2.6 }; // m: from the wall, its depth, its half width, half the path between the halves
const lawnAt = (fx, fz) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const d = operaR + LAWN.from + LAWN.depth / 2 + (a * LAWN.depth) / 2 + (a > 0 ? 4.5 : 0), w = b * LAWN.half; return [ocx + fx * d - fz * w, ocz + fz * d + fx * w]; }); // (with the room before it for the way round)
const polyGap = (p, q) => Math.min(...p.map(([x, z]) => (inPoly(x, z, q) ? 0 : ringDist(x, z, q))), ...q.map(([x, z]) => (inPoly(x, z, p) ? 0 : ringDist(x, z, p))));
const [fx, fz] = (() => {
  const a0 = Math.atan2(fcx - ocx, fcz - ocz), mid = Math.atan2(-4 - ocx, 73 - ocz);
  const turn = Math.sign(Math.atan2(Math.sin(mid - a0), Math.cos(mid - a0))) || 1;
  for (let k = 0; k <= 90; k += 2) { const a = a0 + (turn * k * Math.PI) / 180, v = [Math.sin(a), Math.cos(a)]; if (polyGap(lawnAt(v[0], v[1]), fountain) > 2.5) return v; }
  throw new Error('no room for the lawn');
})();
const operaDoor = [ocx + fx * (operaR + 1.6), ocz + fz * (operaR + 1.6)];
// The lawn: grass right before the round hall, in two halves either side of
// the way up to its door.
const lawns = [-1, 1].map((s) => { const px = -fz, pz = fx, d0 = operaR + LAWN.from, d1 = d0 + LAWN.depth; return R1([[d0, LAWN.gap], [d1, LAWN.gap], [d1, LAWN.half], [d0, LAWN.half]].map(([d, w]) => [ocx + fx * d + px * w * s, ocz + fz * d + pz * w * s])); });
const lawn = R1([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const d = operaR + LAWN.from + LAWN.depth / 2 + a * LAWN.depth / 2, w = b * LAWN.half; return [ocx + fx * d - fz * w, ocz + fz * d + fx * w]; })); // (both halves and the path: trees keep off it)
// The Music Hall's door: the middle of its curved front, which faces the plaza (east).
const [mcx, mcz] = centroid(music);
const musicDoor = (() => {
  // the point of the outline nearest the fountain, pushed 1.6 m out
  let best = null, bd = Infinity;
  for (let i = 0; i < music.length; i++) { const a = music[i], b = music[(i + 1) % music.length]; for (let t = 0; t <= 1; t += 0.1) { const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d = Math.hypot(q[0] - fcx, q[1] - fcz); if (d < bd) { bd = d; best = q; } } }
  const d = Math.hypot(best[0] - mcx, best[1] - mcz);
  return [best[0] + ((best[0] - mcx) / d) * 1.6, best[1] + ((best[1] - mcz) / d) * 1.6];
})();

const buildings = [
  { n: 'opera-house', custom: true, h: ARTS.opera.top, p: R1(circle(ocx, ocz, operaR)) },
  { n: 'opera-stage', custom: true, h: ARTS.operaBack, p: operaBack },
  { n: 'music-hall', custom: true, h: ARTS.music.top, p: music },
  { n: 'hangaram-art', custom: true, h: ARTS.hangaram, p: hangaram },
  { n: 'hangaram-design', custom: true, h: ARTS.design, p: design },
  { n: 'calligraphy', custom: true, h: ARTS.calligraphy, p: calligraphy },
  { n: 'practice-hall', custom: true, h: ARTS.practice, p: practice },
];

// --- Walks: OSM's footways inside the site, grown with it ------------------------
const solid = (x, z, m = 0) => buildings.some((b) => inPoly(x, z, b.p) || ringDist(x, z, b.p) < m);
const hitsWall = (p, m = 2.2) => { for (let i = 1; i < p.length; i++) for (let t = 0; t <= 1; t += 0.04) { const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, z = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t; if (solid(x, z, m)) return [r1(x), r1(z)]; } return null; };
const wet = (p, m = 2.4) => { for (let i = 1; i < p.length; i++) for (let t = 0; t <= 1; t += 0.05) { const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, z = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t; if (inPoly(x, z, fountain) || ringDist(x, z, fountain) < m || lawns.some((l) => inPoly(x, z, l))) return true; } return false; };
const walks = [];
for (const w of osm.paths) {
  if (w.k === 'path') continue; // (the hill trails behind: not built)
  const p = R1(simplify(w.p.map(G), 0.5));
  if (p.some(([x, z]) => !inPoly(x, z, site)) || hitsWall(p) || wet(p)) continue;
  walks.push({ k: 'walk', w: 4, p });
}
// From the gate on Nambusunhwan-ro in to the plaza, on to the lawn, and to
// both halls' doors (made up: the real way in climbs steps and terraces).
const gate = (() => { // the site's edge nearest the anchor
  let best = null, bd = Infinity;
  for (let i = 0; i < site.length; i++) { const a = site[i], b = site[(i + 1) % site.length]; for (let t = 0; t <= 1; t += 0.05) { const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d = Math.hypot(q[0], q[1]); if (d < bd) { bd = d; best = q; } } }
  return best;
})();
const plazaMid = [-4, 73]; // the open middle, between the Design Museum, the round hall and the Music Hall
const od = [operaDoor[0] + fx * 2.5, operaDoor[1] + fz * 2.5], md = [musicDoor[0] + (musicDoor[0] - mcx) / Math.hypot(musicDoor[0] - mcx, musicDoor[1] - mcz) * 2.5, musicDoor[1] + (musicDoor[1] - mcz) / Math.hypot(musicDoor[0] - mcx, musicDoor[1] - mcz) * 2.5];
const way = (pts, n) => walks.push({ k: 'walk', w: 5, approx: true, p: R1(pts), n });
way([[0, 0], gate, [18, 31], [5, 60], plazaMid], { ko: '예술의전당 들어가는 길', en: 'Into Seoul Arts Center' });
const before = [ocx + fx * (operaR + LAWN.from + LAWN.depth + 2.2), ocz + fz * (operaR + LAWN.from + LAWN.depth + 2.2)]; // past the lawn, before the fountain
way([plazaMid, before, od], { ko: '오페라하우스 가는 길', en: 'To the Opera House' });
way([plazaMid, md], { ko: '음악당 가는 길', en: 'To the Music Hall' });

// --- The Information Center: a small kiosk beside the way in (made up) -------------
const info = (() => {
  const a = gate, b = [18, 31], len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  for (const side of [-1, 1]) for (const along of [16, 13, 19, 10]) {
    const n = [-d[1] * side, d[0] * side], c = [a[0] + d[0] * along + n[0] * 6.4, a[1] + d[1] * along + n[1] * 6.4];
    const corner = (u, v) => [c[0] + d[0] * u + n[0] * v, c[1] + d[1] * u + n[1] * v];
    const p = [corner(-3.5, -2.5), corner(3.5, -2.5), corner(3.5, 2.5), corner(-3.5, 2.5)];
    if (p.every(([x, z]) => inPoly(x, z, site) && ringDist(x, z, site) > 3 && !solid(x, z, 4)) && walks.every((w) => p.every(([x, z]) => lineDist(x, z, w.p) > w.w / 2 + 0.8)))
      return { p: R1(p), door: R1([[c[0] - n[0] * 2.8, c[1] - n[1] * 2.8]])[0] }; // (the side on the walk)
  }
  throw new Error('no room for the Information Center');
})();
buildings.push({ n: 'info', h: 3.6, p: info.p });

// --- Trees: along the site's hill side and round the lawn ---------------------------
const trees = [];
{
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ok = (x, z) => inPoly(x, z, site) && ringDist(x, z, site) > 2.5 && !solid(x, z, 3.5) && !inPoly(x, z, lawn) && ringDist(x, z, lawn) > 2 && ringDist(x, z, fountain) > 3 && !inPoly(x, z, fountain) && walks.every((w) => lineDist(x, z, w.p) > w.w / 2 + 1.8) && Math.hypot(x - operaDoor[0], z - operaDoor[1]) > 9 && Math.hypot(x - musicDoor[0], z - musicDoor[1]) > 9;
  // along the edge, on the sides away from the road
  const edge = [...site, site[0]];
  for (let i = 1; i < edge.length; i++) {
    const a = edge[i - 1], b = edge[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 4; s < len; s += 9) {
      const q = [a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len];
      if (roadDist(q[0], q[1]) < 30) continue;
      const [cx, cz] = centroid(site), d = Math.hypot(cx - q[0], cz - q[1]);
      const x = q[0] + ((cx - q[0]) / d) * (5 + rnd() * 3), z = q[1] + ((cz - q[1]) / d) * (5 + rnd() * 3);
      if (ok(x, z)) trees.push([r1(x), r1(z)]);
    }
  }
  // round the lawn
  const lr = [...grown(lawn, 4.5), grown(lawn, 4.5)[0]];
  for (let i = 1; i < lr.length; i++) { const a = lr[i - 1], b = lr[i]; for (let t = 0.12; t < 1; t += 0.25) { const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; if (ok(x, z)) trees.push([r1(x), r1(z)]); } }
}

const N = {
  site: { ko: '예술의전당', en: 'Seoul Arts Center', ja: '芸術の殿堂', zh: '艺术殿堂' },
  opera: { ko: '오페라하우스', en: 'Opera House', ja: 'オペラハウス', zh: '歌剧院' },
  music: { ko: '음악당', en: 'Music Hall', ja: '音楽堂', zh: '音乐堂' },
  hangaram: { ko: '한가람미술관', en: 'Hangaram Art Museum', ja: 'ハンガラム美術館', zh: '韩佳蓝美术馆' },
  design: { ko: '한가람디자인미술관', en: 'Hangaram Design Museum', ja: 'ハンガラムデザイン美術館', zh: '韩佳蓝设计美术馆' },
  calligraphy: { ko: '서울서예박물관', en: 'Seoul Calligraphy Art Museum', ja: 'ソウル書芸博物館', zh: '首尔书艺博物馆' },
  fountain: { ko: '세계음악분수', en: 'World Music Fountain', ja: '世界音楽噴水', zh: '世界音乐喷泉' },
};
const doorRy = (dx, dz) => r1(Math.atan2(dx, dz) * 100) / 100; // the way a door faces (out of the building)

const map = {
  meta: {
    district: 'arts-center',
    source: 'scripts/build-arts-center.mjs: Seoul Arts Center at 50% of the real place (Yozi 2026-11-21), its site, buildings, fountain and footways from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/arts-center-osm.json) at 1/4, doubled about the crossing in front of its gate. Nambusunhwan-ro and Banpo-daero are the base map\'s, at 1/4.',
    scale: { grow: GROW, why: 'The whole place at 50% (site, buildings, gaps), on purpose: Yozi 2026-11-21, "Seocho is mostly offices otherwise, so make it big". The roads in front stay 1/4; it grows towards Umyeonsan and over its real neighbours (the Korea National University of Arts, the Gugak Center, The Seoul Institute), which are not built.' },
    approx: [
      { what: 'heights', why: 'OSM has no heights here: 50% of estimates from photos (Opera House about 44 m to the hat\'s tip, Music Hall about 28 m).' },
      { what: 'the ground', why: 'The real site climbs the foot of Umyeonsan in terraces and steps; here it is level.' },
      { what: 'the lawn before the Opera House', why: 'Placed from photos and the Naver map (between the round hall and the fountain), not in OSM.' },
      { what: 'the ways from the gate to the halls\' doors', why: 'Made up (roads marked approx): the real way in is steps and terraces.' },
      { what: 'trees', why: 'Made up, along the hill side and round the lawn.' },
      { what: 'the Information Center', why: 'Made up: a kiosk beside the way in (every district has one).' },
      { what: 'doors', why: 'The Opera House\'s faces the lawn and fountain, the Music Hall\'s the plaza, as in the photos; their exact spots are not in OSM.' },
    ],
    parts: [{ box: [Math.floor(Math.min(...site.map((p) => p[0])) - 2), Math.floor(Math.min(...site.map((p) => p[1])) - 2), Math.ceil(Math.max(...site.map((p) => p[0])) + 2), Math.ceil(Math.max(...site.map((p) => p[1])) + 2)] }],
  },
  roads: walks,
  buildings,
  areas: [
    { k: 'plaza', p: site, n: N.site },
    ...lawns.map((p) => ({ k: 'grass', p })),
    { k: 'water', p: fountain, n: N.fountain },
  ],
  blockers: [{ p: fountain, low: true }],
  pois: [
    { kind: 'landmark', x: r1(ocx), z: r1(ocz), name: N.opera },
    { kind: 'landmark', x: r1(mcx), z: r1(mcz), name: N.music },
    { kind: 'landmark', x: r1(centroid(hangaram)[0]), z: r1(centroid(hangaram)[1]), name: N.hangaram },
  ],
  landmarks: [
    {
      type: 'artscenter', x: 0, z: 0,
      opera: { at: [r1(ocx), r1(ocz)], r: r1(operaR), eave: ARTS.opera.eave, top: ARTS.opera.top, face: doorRy(fx, fz), back: operaBack, backH: ARTS.operaBack },
      music: { p: music, wall: ARTS.music.wall, top: ARTS.music.top, door: R1([musicDoor])[0], face: doorRy(musicDoor[0] - mcx, musicDoor[1] - mcz) },
      halls: [
        { n: 'hangaram-art', p: hangaram, h: ARTS.hangaram },
        { n: 'hangaram-design', p: design, h: ARTS.design },
        { n: 'calligraphy', p: calligraphy, h: ARTS.calligraphy },
        { n: 'practice-hall', p: practice, h: ARTS.practice },
      ],
      fountain, lawns, trees,
    },
    { type: 'sign', x: r1(gate[0] + (plazaMid[0] - gate[0]) * 0.25 + 4), z: r1(gate[1] + (plazaMid[1] - gate[1]) * 0.25), ry: doorRy(-plazaMid[0] + gate[0], -plazaMid[1] + gate[1]),
      title: N.site,
      text: {
        ko: '1988년에 문을 연 한국의 대표 공연·전시 공간이에요. 갓 모양 지붕의 오페라하우스, 부채 모양의 음악당, 미술관과 서예박물관이 우면산 자락에 모여 있어요. 오페라하우스에서는 오페라와 발레를, 음악당에서는 오케스트라 연주를 만나 보세요.',
        en: 'Korea\'s best-known home for the performing arts, opened in 1988 at the foot of Umyeonsan. The Opera House wears a roof shaped like a gat, the traditional horsehair hat; the Music Hall is shaped like a folding fan. Opera and ballet play in the Opera House, orchestras in the Music Hall.',
        ja: '1988年に開館した韓国を代表する公演・展示空間です。伝統の帽子「カッ」の形の屋根を持つオペラハウス、扇の形の音楽堂、美術館や書芸博物館が牛眠山のふもとに集まっています。オペラハウスではオペラとバレエ、音楽堂ではオーケストラを楽しめます。',
        zh: '1988年开馆的韩国代表性演出与展览空间，坐落在牛眠山脚下。歌剧院的屋顶形似韩国传统纱帽“笠”，音乐堂则像一把折扇。歌剧院上演歌剧和芭蕾，音乐堂有管弦乐演出。',
      } },
  ],
  doors: { opera: R1([operaDoor])[0], music: R1([musicDoor])[0], gate: R1([gate])[0], plaza: R1([plazaMid])[0], info: info.door },
};

// --- Checks --------------------------------------------------------------------
const real = { site: Math.abs(area(open(A.site.p.map(Q)))) };
const out = {
  OFFSET,
  site: `${site.length} pts, ${Math.round(Math.abs(area(site)))} m² (the real one at 1/4: ${Math.round(real.site)} m², x${(Math.abs(area(site)) / real.site).toFixed(2)})`,
  box: map.meta.parts[0].box,
  opera: `centre ${r1(ocx)}, ${r1(ocz)}, radius ${r1(operaR)} m (real about ${Math.round(operaR * 2 * 2)} m across)`,
  music: `${music.length} pts, ${Math.round(Math.abs(area(music)))} m²`,
  roadClear: r1(Math.min(...site.map(([x, z]) => roadDist(x, z)))),
  walks: walks.length, madeUpWalks: walks.filter((w) => w.approx).length, trees: trees.length,
  doors: map.doors,
  walkOnWater: walks.filter((w) => { for (let i = 1; i < w.p.length; i++) for (let t = 0; t <= 1; t += 0.05) { const x = w.p[i - 1][0] + (w.p[i][0] - w.p[i - 1][0]) * t, z = w.p[i - 1][1] + (w.p[i][1] - w.p[i - 1][1]) * t; if (inPoly(x, z, fountain) || ringDist(x, z, fountain) < w.w / 2 + 0.3) return true; } return false; }).map((w) => w.n?.en || 'osm walk'),
  walkThroughWall: walks.map((w) => { const h = hitsWall(w.p.slice(), 1); const ends = [operaDoor, musicDoor]; return h && ends.every((e) => Math.hypot(h[0] - e[0], h[1] - e[1]) > 4) ? `${w.n?.en || 'osm walk'} at ${h}` : null; }).filter(Boolean),
};
console.log(out);
if (!process.argv.includes('--check')) {
  writeFileSync(path.join(R, 'districts', 'arts-center.json'), JSON.stringify(map) + '\n');
  console.log('wrote districts/arts-center.json', Math.round(JSON.stringify(map).length / 1024), 'KB');
}
