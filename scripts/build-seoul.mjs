#!/usr/bin/env node
// Builds the Seoul overview for the map (public/regions/another-seoul/seoul.json):
// the 25 districts (gu) with their real outlines, the Han River, and which gu
// are open. Everything is on the Seoul grid (src/core/seoul-grid.js): real
// Seoul at 1/4 around Seongsu Station, game metres (x east, z south).
//
// The outlines come from OpenStreetMap (scripts/data/seoul-gu-osm.geojson,
// admin_level=6, simplified; © OpenStreetMap contributors, ODbL). The map
// shows that credit in its corner. The Han River is the line where the gu
// north of the river meet the ones south of it.
//
// A gu is open when a game district's anchor (region.json) is inside it.
// Each gu is that area's budget: its districts have to fit in its outline
// (scripts/place-districts.mjs checks it).
//
// Seongsu is the one full-size district (its streets are not shrunk), so
// around it the river and the gu edges near it are pushed a little south to
// make room. Everything else is where the 1/4 map puts it.
//
//   node scripts/build-seoul.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame, anchorOffset, inPolygon, SCALE } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');

// [id, ko, en, ja, zh]
const GU = [
  ['jongno', '종로구', 'Jongno-gu', '鍾路区', '钟路区'],
  ['jung', '중구', 'Jung-gu', '中区', '中区'],
  ['yongsan', '용산구', 'Yongsan-gu', '龍山区', '龙山区'],
  ['seongdong', '성동구', 'Seongdong-gu', '城東区', '城东区'],
  ['gwangjin', '광진구', 'Gwangjin-gu', '広津区', '广津区'],
  ['dongdaemun', '동대문구', 'Dongdaemun-gu', '東大門区', '东大门区'],
  ['jungnang', '중랑구', 'Jungnang-gu', '中浪区', '中浪区'],
  ['seongbuk', '성북구', 'Seongbuk-gu', '城北区', '城北区'],
  ['gangbuk', '강북구', 'Gangbuk-gu', '江北区', '江北区'],
  ['dobong', '도봉구', 'Dobong-gu', '道峰区', '道峰区'],
  ['nowon', '노원구', 'Nowon-gu', '蘆原区', '芦原区'],
  ['eunpyeong', '은평구', 'Eunpyeong-gu', '恩平区', '恩平区'],
  ['seodaemun', '서대문구', 'Seodaemun-gu', '西大門区', '西大门区'],
  ['mapo', '마포구', 'Mapo-gu', '麻浦区', '麻浦区'],
  ['gangseo', '강서구', 'Gangseo-gu', '江西区', '江西区'],
  ['yangcheon', '양천구', 'Yangcheon-gu', '陽川区', '阳川区'],
  ['guro', '구로구', 'Guro-gu', '九老区', '九老区'],
  ['geumcheon', '금천구', 'Geumcheon-gu', '衿川区', '衿川区'],
  ['yeongdeungpo', '영등포구', 'Yeongdeungpo-gu', '永登浦区', '永登浦区'],
  ['dongjak', '동작구', 'Dongjak-gu', '銅雀区', '铜雀区'],
  ['gwanak', '관악구', 'Gwanak-gu', '冠岳区', '冠岳区'],
  ['seocho', '서초구', 'Seocho-gu', '瑞草区', '瑞草区'],
  ['gangnam', '강남구', 'Gangnam-gu', '江南区', '江南区'],
  ['songpa', '송파구', 'Songpa-gu', '松坡区', '松坡区'],
  ['gangdong', '강동구', 'Gangdong-gu', '江東区', '江东区'],
];
// The gu on each bank of the Han River.
const NORTH_BANK = ['mapo', 'yongsan', 'seongdong', 'gwangjin'];
const SOUTH_BANK = ['gangseo', 'yangcheon', 'yeongdeungpo', 'dongjak', 'seocho', 'gangnam', 'songpa', 'gangdong'];

// The game's river, west to east, where it differs from the real one: centre
// line [x, z] and how wide to draw it (m), inside the game's water. Both ends
// are points on the real river, so the bend fades in and out there.
export const GAME_RIVER = [
  [-1103, 584, 220], // Banpo-Jamwon (real river)
  [-1026, 540, 190], // region.json water[1] from Banpo-Jamwon…
  [-465, 213, 174], // …to Seongsu's river by Seoul Forest (its real bank)
  [-300, 281, 172],
  [-240, 300, 174],
  [-150, 336, 186],
  [-30, 388, 200],
  // From here the map draws the river about the real Han's width (200 m) down
  // from the north bank, a smooth line with no bulge: the game's water reaches
  // further south (to Songpa's bank strip, z 556..611), but the map keeps the
  // real look. Past Ttukseom Han River Park it fills the water to Songpa's land.
  [18, 407, 200],
  [100, 459, 200],
  [160, 496, 200],
  [260, 518, 185], // Ttukseom Han River Park's straight bank…
  [430, 532, 156], // …to Jamsil Bridge
  [858, 533, 154], // Songpa's bank strip ends
  [975, 305, 220], // back on the real river, turning north-east
];
const interp = (pts, x, k) => {
  if (x <= pts[0][0]) return pts[0][k];
  for (let i = 1; i < pts.length; i++) {
    const [x0] = pts[i - 1], [x1] = pts[i];
    if (x <= x1) return pts[i - 1][k] + ((pts[i][k] - pts[i - 1][k]) * (x - x0)) / (x1 - x0 || 1);
  }
  return pts.at(-1)[k];
};
export function riverWidth(x) {
  return x < GAME_RIVER[0][0] || x > GAME_RIVER.at(-1)[0] ? 220 : Math.round(interp(GAME_RIVER, x, 2));
}
// A point moves north or south by how far the game's river is from the real
// one at its x: all the way within 120 m of the river, fading out by 520 m.
export function bankWarp(real, game) {
  const x0 = game[0][0], x1 = game.at(-1)[0];
  return ([x, z]) => {
    if (x <= x0 || x >= x1) return [x, z];
    const rz = interp(real, x, 1), dz = interp(game, x, 1) - rz;
    const w = Math.max(0, Math.min(1, (520 - Math.abs(z - rz)) / 400));
    return [x, z + dz * w];
  };
}

// Drop points closer than `eps` metres to the line between their neighbours.
function simplify(p, eps) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p[p.length - 1]];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
  let best = 0, at = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs(dz * (p[i][0] - a[0]) - dx * (p[i][1] - a[1])) / L;
    if (d > best) { best = d; at = i; }
  }
  return best > eps ? [...simplify(p.slice(0, at + 1), eps).slice(0, -1), ...simplify(p.slice(at), eps)] : [a, b];
}
const round = (p) => p.map(([x, z]) => [Math.round(x), Math.round(z)]);
const area = (p) => p.reduce((s, [x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; return s + x * z2 - x2 * z; }, 0) / 2;

// Where to write a gu's name: the inside point farthest from its edges, on a
// coarse grid (a centroid can fall outside a crescent-shaped gu).
function labelSpot(p) {
  const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const edge = (x, z) => {
    let m = Infinity;
    for (let i = 0; i < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length], vx = bx - ax, vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
      m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return m;
  };
  let best = [(x0 + x1) / 2, (z0 + z1) / 2], bd = -1;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) {
    const x = x0 + ((x1 - x0) * i) / 24, z = z0 + ((z1 - z0) * j) / 24;
    if (!inPolygon(x, z, p)) continue;
    const d = edge(x, z);
    if (d > bd) { bd = d; best = [x, z]; }
  }
  return best.map(Math.round);
}

const osm = JSON.parse(await readFile(path.join(root, 'scripts', 'data', 'seoul-gu-osm.geojson'), 'utf8'));
const region = JSON.parse(await readFile(path.join(R, 'region.json'), 'utf8'));
const byEn = Object.fromEntries(osm.features.map((f) => [f.properties['name:en'], f]));
const projectRaw = (ring) => ring.map(([lon, lat]) => toGame(lat, lon));

// The river: points on a north-bank gu's edge that a south-bank gu shares
// (within 20 real metres), west to east, thinned to one every ~60 m.
const ll = (id) => byEn[GU.find((g) => g[0] === id)[2]].geometry.coordinates[0];
const near = 20 / 111000;
const southRings = SOUTH_BANK.map(ll);
const onSouth = ([lon, lat]) => southRings.some((r) => r.some(([x, y]) => Math.abs(x - lon) < near * 1.3 && Math.abs(y - lat) < near));
let riverLL = NORTH_BANK.flatMap(ll).filter(onSouth).sort((a, b) => a[0] - b[0]);
const riverRaw = [];
for (const q of projectRaw(riverLL)) if (!riverRaw.length || Math.hypot(q[0] - riverRaw.at(-1)[0], q[1] - riverRaw.at(-1)[1]) > 60) riverRaw.push(q);

// From Banpo-Jamwon east to Jamsil the game's own river (region.json water,
// Seongsu's river and Songpa's Han River bank) is not where the 1/4 map puts
// the real one, so the map showed strips of land in the middle of the river
// and Seoul Another Dome in the water. Bend the map's river (and the gu edges
// along it) onto the game's water there.
const bend = bankWarp(projectRaw(riverLL), GAME_RIVER); // (every shared edge point, so the gu edges land on the line)
const project = (ring) => projectRaw(ring).map(bend);
const [gx0, gx1] = [GAME_RIVER[0][0], GAME_RIVER.at(-1)[0]];
const gameLine = [];
for (let i = 1; i < GAME_RIVER.length; i++) { // one point every ~30 m along the game's river
  const [ax, az] = GAME_RIVER[i - 1], [bx, bz] = GAME_RIVER[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 30));
  for (let k = i === 1 ? 0 : 1; k <= n; k++) gameLine.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
}
const river = [...riverRaw.filter(([x]) => x < gx0), ...gameLine, ...riverRaw.filter(([x]) => x > gx1)];
// Line width per river point: the game's water is narrower than the real Han
// in places (Songpa's bank), so the map's river line must not spill onto land.
const riverW = river.map(([x]) => riverWidth(x));

const gu = GU.map(([id, ko, en, ja, zh]) => {
  const f = byEn[en];
  if (!f) throw new Error(`No outline for ${en} in seoul-gu-osm.geojson`);
  // A closed ring: simplify its two halves (one line from a point back to itself has no direction).
  const ring = project(f.geometry.coordinates[0]), h = Math.floor(ring.length / 2);
  let p = round([...simplify(ring.slice(0, h + 1), 3).slice(0, -1), ...simplify(ring.slice(h), 3)]);
  if (p.length > 3 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1]) p.pop();
  const districts = region.districts.filter((d) => {
    const [ox, oz] = d.anchor ? anchorOffset(d.anchor) : d.offset || [0, 0];
    const [ax, az] = d.anchor?.local || [0, 0];
    return inPolygon(ox + ax, oz + az, p);
  }).map((d) => d.id);
  return {
    id, name: { ko, en, ja, zh }, open: districts.length > 0, ...(districts.length ? { district: districts[0], districts } : {}),
    osm: f.properties.osm, label: labelSpot(p), area: Math.round(Math.abs(area(p))), p,
  };
});

// The lines where two gu meet, for the purple border on the street and the
// map (game/gu-borders.js). Each shared stretch is drawn once, from the gu
// listed first; the outlines were simplified on their own, so a neighbour's
// edge counts as shared when it runs within 8 m. Edges between a north-bank
// and a south-bank gu are the Han River, and Seoul's own outer edge has no
// neighbour: neither gets a line.
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const vx = bx - ax, vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
};
const nearRing = (x, z, p, d) => p.some((a, i) => segDist(x, z, a, p[(i + 1) % p.length]) < d);
const acrossRiver = (a, b) => (NORTH_BANK.includes(a) && SOUTH_BANK.includes(b)) || (SOUTH_BANK.includes(a) && NORTH_BANK.includes(b));
const borders = [];
gu.forEach((g, gi) => {
  const others = gu.filter((o, oi) => oi > gi && !acrossRiver(g.id, o.id));
  const p = g.p, n = p.length;
  const shared = p.map((a, i) => {
    const b = p[(i + 1) % n];
    // Both ends and the middle near the same neighbour.
    return others.some((o) => [a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]].every(([x, z]) => nearRing(x, z, o.p, 8)));
  });
  // Chain shared edges into lines, starting after an unshared one so a line
  // never breaks at the ring's first point.
  const start = shared.indexOf(false);
  if (start < 0) return;
  let line = null;
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (shared[i]) {
      if (!line) line = [p[i]];
      line.push(p[(i + 1) % n]);
    } else if (line) { borders.push(line); line = null; }
  }
  if (line) borders.push(line);
});

// Seoul's own outer edge: gu edges with no neighbour at all (not even across
// the river), chained the same way.
const outline = [];
gu.forEach((g) => {
  const others = gu.filter((o) => o !== g), p = g.p, n = p.length;
  const outer = p.map((a, i) => {
    const b = p[(i + 1) % n];
    return ![a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]].every(([x, z]) => others.some((o) => nearRing(x, z, o.p, 8)));
  });
  const start = outer.indexOf(false);
  if (start < 0) return;
  let line = null;
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (outer[i]) {
      if (!line) line = [p[i]];
      line.push(p[(i + 1) % n]);
    } else if (line) { outline.push(line); line = null; }
  }
  if (line) outline.push(line);
});

// No line on the Han River: a border or the outer edge stops at the bank of
// the river as the map draws it (its centre line and width), plus 4 m.
// The game's own Han River counts too (region.json water, and a district's
// big water areas: Seongsu's and Mangwon's river), which the map draws over
// the gu. Ponds and streams (under 5 ha) keep their line.
const waters = [...(region.water || []).map((w) => w.p)];
for (const d of region.districts) {
  const m = JSON.parse(await readFile(path.join(R, d.map), 'utf8'));
  const [ox, oz] = d.offset || [0, 0];
  for (const a of m.areas || []) if (a.k === 'water' && Math.abs(area(a.p)) > 50000) waters.push(a.p.map(([x, z]) => [x + ox, z + oz]));
}
const onRiver = (x, z) => river.some((a, i) => i > 0 && segDist(x, z, river[i - 1], a) < Math.max(riverW[i - 1], riverW[i]) / 2 + 4)
  || waters.some((w) => inPolygon(x, z, w) || nearRing(x, z, w, 3));
function offRiver(lines) {
  const out = [];
  for (const l of lines) {
    let run = [];
    for (const [x, z] of densifyLine(l, 3)) {
      if (onRiver(x, z)) { if (run.length > 1) out.push(run); run = []; } else run.push([x, z]);
    }
    if (run.length > 1) out.push(run);
  }
  return out.map((l) => round(simplify(l, 1))).filter((l) => l.length > 1 && Math.hypot(l.at(-1)[0] - l[0][0], l.at(-1)[1] - l[0][1]) > 8);
}
function densifyLine(line, step) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}
const bordersDry = offRiver(borders), outlineDry = offRiver(outline);

const out = {
  note: 'Seoul at 1/4 around Seongsu Station (scripts/build-seoul.mjs). Gu outlines © OpenStreetMap contributors (ODbL), simplified.',
  credit: '© OpenStreetMap contributors',
  scale: SCALE, gu, river: round(river), riverW, borders: bordersDry, outline: outlineDry,
};
await writeFile(path.join(R, 'seoul.json'), JSON.stringify(out));
console.log(gu.map((g) => `${g.id}${g.open ? `*(${g.districts})` : ''} ${(g.area / 1e6).toFixed(2)} km²`).join('\n'));
console.log(`river: ${river.length} points`);
console.log(`borders: ${bordersDry.length} lines, ${bordersDry.reduce((s, l) => s + l.length, 0)} points; outline: ${outlineDry.length} lines`);
