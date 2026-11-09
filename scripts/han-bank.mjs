// The Han River's north bank from Mangwon to Seongsu, at 1/4 on its real
// line (scripts/data/han-banks.json, from OpenStreetMap), and what follows
// it: the region's river water east of Banpo-Jamwon (region.json water[1])
// and the Han River Bike Path along the bank. scripts/build-yeouido.mjs
// draws the river west of Banpo-Jamwon (water[0]) from the same bank.
//
//   node scripts/han-bank.mjs   rewrites water[1], the Han River Bike Path
//                               and the end of "To the Han River" in region.json
//
// Where districts draw the river themselves (Banpo-Jamwon, x -1296 … -961,
// and Mangwon's park west of x -3182), the bike path keeps to the points
// they join it at.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const DATA = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'han-banks.json'), 'utf8'));
const YEOUIDO = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'yeouido-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

export const NORTH = DATA.north; // west to east, the river on the right
export const SOUTH = DATA.south; // east to west (Apgujeong to Jamwon)

// The north bank between x0 and x1 (west to east), cut exactly at both.
export function northBetween(x0, x1) {
  const out = [];
  for (let i = 1; i < NORTH.length; i++) {
    const a = NORTH[i - 1], b = NORTH[i];
    if (b[0] < x0) continue;
    if (a[0] < x0) out.push([x0, r1(a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0]))]);
    if (b[0] > x1) { out.push([x1, r1(a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0]))]); break; }
    out.push(b);
  }
  return out;
}

// A line along the bank `off` metres inland (to the left going east).
function inland(p, off) {
  return p.map((q, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [q[0] + ((b[1] - a[1]) / L) * off, q[1] - ((b[0] - a[0]) / L) * off];
  });
}
function simplify(p, eps) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p.at(-1)];
  let md = 0, mi = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const d = Math.abs(dx * (p[i][1] - a[1]) - dz * (p[i][0] - a[0])) / L;
    if (d > md) { md = d; mi = i; }
  }
  return md > eps ? [...simplify(p.slice(0, mi + 1), eps).slice(0, -1), ...simplify(p.slice(mi), eps)] : [a, b];
}
// Where segment a-b crosses the polyline p (the first crossing), or null.
function cross(a, b, p) {
  for (let i = 1; i < p.length; i++) {
    const c = p[i - 1], d = p[i];
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (!den) continue;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { at: [r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)], i };
  }
  return null;
}

export const PATH_OFF = 14; // the bike path, metres in from the water's edge
// Points other roads meet the path at (kept exactly).
export const MANGWON_JOIN = [-3182, -64]; // Mangwon's river path
export const JAMSU_JOIN = [-1307.8, 705.8]; // Jamsu Bridge (Banpo-Jamwon's map)
export const SEONGSU_JOIN = [-465, 119]; // Seongsu's Han River Path

// Cut out the loops an offset line makes round an inlet's mouth.
function unloop(p) {
  const out = p.slice();
  for (let i = 1; i < out.length; i++) {
    for (let j = out.length - 1; j > i + 1; j--) {
      const c = cross(out[i - 1], out[i], [out[j - 1], out[j]]);
      if (c) { out.splice(i, j - i, c.at); break; }
    }
  }
  return out;
}
// The bank every 10 m, averaged over 80 m: the piers and the little docks
// by Mapo and Banpo would make the path zigzag.
function smooth(p) {
  const q = [];
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
    for (let k = 0; k < n; k++) q.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  q.push(p.at(-1));
  return q.map((_, i) => {
    const w = q.slice(Math.max(0, i - 4), i + 5);
    return [w.reduce((s, v) => s + v[0], 0) / w.length, w.reduce((s, v) => s + v[1], 0) / w.length];
  });
}
// Signed distance from the real bank (positive inland, on the left going east).
function fromBank(q) {
  let best = Infinity, side = 1;
  for (let i = 1; i < NORTH.length; i++) {
    const a = NORTH[i - 1], b = NORTH[i], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
    const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L)) : 0;
    const d = Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz);
    if (d < best) { best = d; side = dx * (q[1] - a[1]) - dz * (q[0] - a[0]) < 0 ? 1 : -1; }
  }
  return best * side;
}
// Every 5 m, at least `min` metres inland of the real bank (pushed straight in).
function keepOff(p, min) {
  const out = [];
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 5));
    const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
    for (let k = 0; k < n; k++) {
      const q = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      for (let s = 0; s < 40 && fromBank(q) < min; s++) { q[0] += nx; q[1] += nz; }
      out.push(q);
    }
  }
  out.push(p.at(-1));
  return out;
}
const along = (x0, x1) => simplify(keepOff(unloop(inland(smooth(northBetween(x0 - 60, x1 + 60)), PATH_OFF)), 8), 2.5).filter(([x]) => x >= x0 && x <= x1).map(([x, z]) => [r1(x), r1(z)]);
const west = along(-3120, -1335); // Mangwon to just short of Jamsu Bridge
const east = along(-1200, -490); // past Banpo-Jamwon to Seongsu

// Seogang Bridge's north end: the real bridge's line (from where it lands
// on Yeouido's Gukhoe-daero, towards Hapjeong) where it meets the path.
const gukhoe = YEOUIDO.roads.filter((r) => r.en === 'Gukhoe-daero').flatMap((r) => r.p);
const BRIDGE_SOUTH = gukhoe.reduce((a, q) => (q[1] < a[1] ? q : a));
const toward = [-2776.7, -16.7]; // (the bridge's old north end, on its line)
const far = [BRIDGE_SOUTH[0] + (toward[0] - BRIDGE_SOUTH[0]) * 2, BRIDGE_SOUTH[1] + (toward[1] - BRIDGE_SOUTH[1]) * 2];
const hit = cross(BRIDGE_SOUTH, far, west);
export const BRIDGE_NORTH = hit.at;
west.splice(hit.i, 0, BRIDGE_NORTH);

// (from Mangwon's river path it first goes east, clear of Mangwon's own river)
export const BIKE_PATH = [MANGWON_JOIN, [-3135, -64], ...west, JAMSU_JOIN, ...east, SEONGSU_JOIN];

// The river east of Banpo-Jamwon to Seongsu (region.json water[1]): the
// real north bank, across at Seongsu, back along the real south bank.
export function waterEast() {
  // (meeting the Seongsu map's own river at x -465, z 126 … 300)
  const north = [...northBetween(-1070, -465).slice(0, -1), [-465, 126]];
  return { p: [...north, [-465, 300], ...SOUTH.filter(([x]) => x >= -1000 && x < -465)], note: 'Han River from Banpo-Jamwon north-east to Seongsu (Ttukseom), on its real banks at 1/4 (scripts/han-bank.mjs, OpenStreetMap).' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let text = readFileSync(path.join(R, 'region.json'), 'utf8');
  const line = (re, make) => {
    const m = text.match(re);
    if (!m) throw new Error('not found: ' + re);
    text = text.replace(m[0], make(m[0]));
  };
  line(/\{"k": "walk", "w": 6, "p": \[[^\n]*"en": "Han River Bike Path"[^\n]*\}/, (s) => s.replace(/"p": \[\[.*?\]\]/, `"p": ${JSON.stringify(BIKE_PATH)}`));
  line(/\{"k": "walk", "w": 5, "p": \[[^\n]*"en": "To the Han River"[^\n]*\}/, (s) => s.replace(/"p": \[\[(.*?)\], \[.*?\]\]/, (_, a) => `"p": [[${a}], ${JSON.stringify(BRIDGE_NORTH)}]`));
  // water[1] is the second line of "water"
  const i = text.indexOf('"water": [\n') + '"water": [\n'.length;
  const j = text.indexOf('\n', i) + 1, k = text.indexOf('\n', j);
  const old = JSON.parse(text.slice(j, k).trim().replace(/,$/, ''));
  text = text.slice(0, j) + '    ' + JSON.stringify({ ...old, ...waterEast() }) + ',' + text.slice(k);
  writeFileSync(path.join(R, 'region.json'), text);
  console.log(`bike path ${BIKE_PATH.length} points; Seogang Bridge north end ${BRIDGE_NORTH}`);
}
