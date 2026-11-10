// The Han River's banks from Mangwon to Seongsu, at 1/4 on their real
// lines (scripts/data/han-banks.json, from OpenStreetMap), and what follows
// them: the region's river water from x -1420 (west of Banpo Bridge) to
// Seongsu (region.json water[1]), with a gap in its blocker for Jamsu
// Bridge under Banpo Bridge. scripts/build-yeouido.mjs draws the river
// west of x -1420 (water[0]) from the same banks, scripts/build-banpo.mjs
// puts Banpo-Jamwon Han River Park on the south bank at the bridge, and
// scripts/build-bike-paths.mjs draws the Han River bike paths.
//
//   node scripts/han-bank.mjs   rewrites water[1] and the end of
//                               "To the Han River" in region.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const DATA = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'han-banks.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

export const NORTH = DATA.north; // west to east, the river on the right
export const SOUTH = DATA.south; // east to west (Apgujeong past Banpo Bridge to x -2020)
// Where water[0] (build-yeouido) ends and water[1] starts: straight across
// the river at this x, west of Banpo Bridge and east of Seorae Island.
export const RIVER_CUT = -1420;
// Banpo Bridge (Jamsu Bridge runs right under it), from OpenStreetMap: the
// middle of its two carriageways, from Noksapyeong-daero's junction with
// Seobinggo-ro's ramps on the north side, over the river (straight from the
// fourth point), to the south bank by the Olympic-daero junction.
export const BANPO_BRIDGE = [[-1371.2, 607.7], [-1359.8, 687.6], [-1355.5, 705], [-1348.9, 724.9], [-1258.5, 960.7]];

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

// The south bank between x0 and x1, east to west, cut exactly at both.
export function southBetween(x0, x1) {
  const out = [];
  for (let i = 1; i < SOUTH.length; i++) {
    const a = SOUTH[i - 1], b = SOUTH[i];
    if (b[0] > x1) continue;
    if (a[0] > x1) out.push([x1, r1(a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0]))]);
    if (b[0] < x0) { out.push([x0, r1(a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0]))]); break; }
    out.push(b);
  }
  return out;
}

// Where the bridges meet the north bank's bike path (scripts/build-bike-paths.mjs
// splices them into its real OpenStreetMap line, within 10 m of it):
// Seogang Bridge's north end, on the real bridge's line from where it lands
// on Yeouido's Gukhoe-daero towards Hapjeong (scripts/build-yeouido.mjs),
// and Jamsu Bridge's, on Banpo Bridge's line (scripts/build-banpo.mjs).
export const BRIDGE_NORTH = [-2797.7, 25.7];
export const JAMSU_NORTH = [-1353.5, 709.1];
// Where the south bank's bike path crosses the Saetgang's mouth, from
// Yeouido's east tip to the Dongjak bank (the real bike bridge's line,
// OpenStreetMap): scripts/build-yeouido.mjs cuts the Saetgang's blockers
// there, scripts/build-bike-paths.mjs runs the path through it.
export const SAETGANG_BIKE = [[-2517.9, 737.5], [-2501.6, 752]];

// The part of polygon p on one side of a line (Sutherland-Hodgman): keeps
// the points where side(q) >= 0, side being linear.
export function clip(p, side) {
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)]); }
  }
  return out;
}
// Metres east of Banpo Bridge's line over the river (negative: west).
const [BA, BB] = [BANPO_BRIDGE[3], BANPO_BRIDGE[4]];
const BL = Math.hypot(BB[0] - BA[0], BB[1] - BA[1]);
export const eastOfBanpo = (q) => ((q[0] - BA[0]) * (BB[1] - BA[1]) - (q[1] - BA[1]) * (BB[0] - BA[0])) / BL;
export const JAMSU_W = 14; // Jamsu Bridge's deck (the road), and the gap in the river's blocker round it
// The bridge's own frame on the south bank (Banpo-Jamwon Han River Park,
// scripts/build-banpo.mjs): BANPO_V along the bridge going south (inland),
// BANPO_U along the bank going east (towards Jamwon); BANPO_FOOT is where
// the bridge's line meets the real south bank.
export const BANPO_V = [(BB[0] - BA[0]) / BL, (BB[1] - BA[1]) / BL];
export const BANPO_U = [BANPO_V[1], -BANPO_V[0]];
export const BANPO_FOOT = (() => {
  for (let i = 1; i < SOUTH.length; i++) {
    const a = SOUTH[i - 1], b = SOUTH[i], ea = eastOfBanpo(a), eb = eastOfBanpo(b);
    if (ea >= 0 && eb < 0) { const t = ea / (ea - eb); return [r1(a[0] + (b[0] - a[0]) * t), r1(a[1] + (b[1] - a[1]) * t)]; }
  }
})();
export const fromBanpo = (u, v) => [r1(BANPO_FOOT[0] + u * BANPO_U[0] + v * BANPO_V[0]), r1(BANPO_FOOT[1] + u * BANPO_U[1] + v * BANPO_V[1])];
export const toBanpo = ([x, z]) => { const dx = x - BANPO_FOOT[0], dz = z - BANPO_FOOT[1]; return [dx * BANPO_U[0] + dz * BANPO_U[1], dx * BANPO_V[0] + dz * BANPO_V[1]]; };
// West of the bridge the real bank turns south-west round the bay where
// Sebitseom floats. Moonlight Square's stone steps, food trucks and kiosk
// need a straight bank facing the fountain, so the square stands out over
// the bay as a terrace: the bank runs on straight from the bridge's foot to
// u -52, then back to the real bank at u -60 (up to 16 m off it there).
export const TERRACE_U = [-52, -60];
export const TERRACE = (() => {
  const u = TERRACE_U[1];
  for (let i = 1; i < SOUTH.length; i++) {
    const [ua, va] = toBanpo(SOUTH[i - 1]), [ub, vb] = toBanpo(SOUTH[i]);
    if (Math.hypot(SOUTH[i][0] - BANPO_FOOT[0], SOUTH[i][1] - BANPO_FOOT[1]) > 200) continue;
    if (ua >= u && ub < u) return [fromBanpo(TERRACE_U[0], 0), fromBanpo(u, va + ((vb - va) * (u - ua)) / (ub - ua))];
  }
})();
// The south bank as the game draws it, east to west: the real one, with the
// terrace in front of Moonlight Square.
export function gameSouth(x0, x1) {
  const near = (q) => Math.hypot(q[0] - BANPO_FOOT[0], q[1] - BANPO_FOOT[1]) < 200;
  const out = [];
  for (const q of southBetween(x0, x1)) {
    const [u] = toBanpo(q);
    if (near(q) && u < 0 && u > TERRACE_U[1]) {
      if (!out.includes(TERRACE[1])) out.push(BANPO_FOOT, ...TERRACE);
      continue;
    }
    if (near(q) && u <= TERRACE_U[1] && !out.includes(TERRACE[1])) out.push(BANPO_FOOT, ...TERRACE);
    out.push(q);
  }
  return out;
}

// The river from x -1420 to Seongsu (region.json water[1]): the real north
// bank, across at Seongsu, back along the real south bank. Its blocker is
// cut either side of Jamsu Bridge. (Moonlight Square's terrace: gameSouth.)
export function waterEast() {
  // (meeting the Seongsu map's own river at x -465, z 126 … 300)
  const north = [...northBetween(RIVER_CUT, -465).slice(0, -1), [-465, 126]];
  const p = [...north, [-465, 300], ...gameSouth(RIVER_CUT, -465).slice(1)];
  const gap = JAMSU_W / 2 + 1;
  const blockers = [clip(p, (q) => -eastOfBanpo(q) - gap), clip(p, (q) => eastOfBanpo(q) - gap)];
  return { p, blockers, note: 'Han River from west of Banpo Bridge north-east to Seongsu (Ttukseom), on its real banks at 1/4 (scripts/han-bank.mjs, OpenStreetMap). Its blocker has a gap for Jamsu Bridge.' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let text = readFileSync(path.join(R, 'region.json'), 'utf8');
  const line = (re, make) => {
    const m = text.match(re);
    if (!m) throw new Error('not found: ' + re);
    text = text.replace(m[0], make(m[0]));
  };
  line(/\{"k": "walk", "w": 5, "p": \[[^\n]*"en": "To the Han River"[^\n]*\}/, (s) => s.replace(/"p": \[\[(.*?)\], \[.*?\]\]/, (_, a) => `"p": [[${a}], ${JSON.stringify(BRIDGE_NORTH)}]`));
  // water[1] is the second line of "water"
  const i = text.indexOf('"water": [\n') + '"water": [\n'.length;
  const j = text.indexOf('\n', i) + 1, k = text.indexOf('\n', j);
  const old = JSON.parse(text.slice(j, k).trim().replace(/,$/, ''));
  text = text.slice(0, j) + '    ' + JSON.stringify({ ...old, ...waterEast() }) + ',' + text.slice(k);
  writeFileSync(path.join(R, 'region.json'), text);
  console.log(`water[1] ${waterEast().p.length} points; Seogang Bridge north end ${BRIDGE_NORTH}`);
}
