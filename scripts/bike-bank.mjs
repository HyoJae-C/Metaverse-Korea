// Two stretches of the Han's banks drawn from the real bike path beside them
// (scripts/data/han-bike-osm.json, OpenStreetMap), where the game had no real
// bank: the river's own outline from OpenStreetMap could not be fetched
// (2026-11-10), and the old banks there were straight lines up to 30 m off.
//
//   TTUKSEOM: the north bank from east of Ttukseom Han River Park (x 520)
//             to Jamsil Bridge, 8 m south of the real bike path (the park
//             itself keeps its straight bank, up to 40 m north of the real one)
//   APGUJEONG: the south bank from Seongsu's edge (x -465) to x 0, 11 m north
//
// 8 m and 11 m are the median gaps between the real bike path and the real
// banks where both are known (north bank Hongdae–Seongsu, south bank by
// Banpo), so the banks are within about 5 m of the real ones.
// scripts/build-seongsu.mjs (Seongsu's river, Apgujeong) and
// scripts/build-bike-paths.mjs (region.json water[2], Ttukseom) draw them.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGS = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'han-bike-osm.json'), 'utf8')).legs;
const r1 = (v) => Math.round(v * 10) / 10;

export const TTUKSEOM_OFF = -8; // (to the right going east: south)
export const APGUJEONG_OFF = 11; // (to the left going east: north)

// The line `off` m to the left of p (going east), between x0 and x1 (west
// to east), cut exactly at both, every point at least 4 m from the last.
function beside(p, off, x0, x1) {
  const q = p.map((a, i) => {
    const b = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)], L = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
    return [a[0] + ((c[1] - b[1]) / L) * off, a[1] - ((c[0] - b[0]) / L) * off];
  });
  const out = [];
  for (let i = 1; i < q.length; i++) {
    const a = q[i - 1], b = q[i];
    if (b[0] < x0 || a[0] > x1) continue;
    if (a[0] < x0) out.push([x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]);
    if (b[0] > x1) { out.push([x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]); break; }
    if (!out.length || Math.hypot(b[0] - out.at(-1)[0], b[1] - out.at(-1)[1]) >= 4) out.push(b);
  }
  return out.map(([x, z]) => [r1(x), r1(z)]);
}

// West to east.
export const ttukseomBank = (x0, x1) => beside(LEGS.northEast, TTUKSEOM_OFF, x0, x1);
export const apgujeongBank = (x0, x1) => beside(LEGS.southEast, APGUJEONG_OFF, x0, x1);
