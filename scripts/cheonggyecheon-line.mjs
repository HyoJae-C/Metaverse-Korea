// Cheonggyecheon on its real line (scripts/data/cheonggyecheon-osm.json):
// the channel's path, the two Cheonggyecheon-ro roads either side of it and
// the bridges, in world metres. Shared by scripts/build-cheonggyecheon.mjs
// (the stream and the strip along it, in the Gyeongbokgung map) and
// scripts/build-euljiro.mjs (whose north edge is the south road).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { frameOf } from '../src/core/stream.js';
import { r1 } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CG = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'cheonggyecheon-osm.json'), 'utf8'));

export const W = 24; // the channel (game size: the real one is ~25-30 m, 7 m at 1/4; you walk down in it)
export const ROAD = { off: 22.5, w: 9 }; // Cheonggyecheon-ro either side: its middle, metres from the stream's
export const WEST = CG.places['Sejong-daero (south of Jongno)'].x; // the roads start at Sejong-daero
export const EAST_PAST = 14; // and go on past the stream's east end to a road across

// The stream as core/stream.js reads it (world `at`; the map writer moves it).
export const STREAM = { at: CG.path[0], path: CG.path.map(([x, z]) => [x - CG.path[0][0], z - CG.path[0][1]]), w: W };
export const F = frameOf(STREAM);
STREAM.len = Math.round(F.segs.reduce((m, S) => m + S.L, 0) * 100) / 100;
export const LEN = STREAM.len;
// u (metres along the stream) of a world point, and the point at (u, v).
export const uOf = (q) => F.toStream(q[0], q[1])[0];
export const at = (u, v = 0) => F.toWorld(u, v).map(r1);

// A line alongside the stream, v metres off its middle (+ south), from u0 to u1.
export function alongside(v, u0, u1) {
  return [at(u0, v), ...F.joints.filter((j) => j > u0 && j < u1).map((j) => at(j, v)), at(u1, v)];
}
// Where the roads start: level with Sejong-daero, on both sides.
const uWest = (v) => { let u = -40; while (F.toWorld(u, v)[0] < WEST) u += 0.1; return r1(u); };
export const U_WEST = Math.max(uWest(-ROAD.off), uWest(ROAD.off));
export const U_EAST = r1(LEN + EAST_PAST);
export const NORTH = alongside(-ROAD.off, uWest(-ROAD.off), U_EAST);
export const SOUTH = alongside(ROAD.off, uWest(ROAD.off), U_EAST);
// z of a road line at x (null if it doesn't reach).
export function zAt(line, x) {
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return r1(a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]));
  }
  return null;
}

// The bridges at their real spots along the stream; `nudge` (m along) moves
// one off it, to keep it clear of the stairs at the falls.
export const BRIDGES = CG.bridges.map((b) => {
  const u0 = r1(uOf(b.at)), u = r1(u0 + (b.nudge || 0));
  return { ...b, u, off: r1(Math.hypot(...at(u).map((v, i) => v - b.at[i]))) };
});
