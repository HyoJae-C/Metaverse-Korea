#!/usr/bin/env node
// The Namsan trail (남산 산책로): a way to walk up Namsan from Sowol-ro,
// above Gyeongnidan-gil, to the summit plaza round the look-out tower
// (game/namsan-walk.js walks it, core/landmarks.js draws it).
//
//   - The hill gets a foot you can walk onto (namsan landmark e = 1.5,
//     core/namsan-shape.js): it was a round dome, as steep as a wall at its
//     foot. Its top, height and foot stay where they were.
//   - The trail: the namsan landmark's `trail`, [x, z] from the hill's foot
//     centre, from the end of the Namsan trail from Itaewon up to the
//     summit plaza's back gate. Also a walk road (marked "nw", `hill`), for
//     the map, the road graph and guides.
//   - The cable car's pylons stand on the new ground.
//
// Run after scripts/build-namsan.mjs and scripts/build-itaewon.mjs (they
// write the hill and the trail from Itaewon):
//   node scripts/build-namsan-walk.mjs   rewrites districts/itaewon.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { namsanGround } from '../src/core/namsan-shape.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = path.join(root, 'public', 'regions', 'another-seoul', 'districts', 'itaewon.json');
const itaewon = JSON.parse(readFileSync(MAP, 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;

export const E = 1.5; // the hill's profile (0.5 was the dome)
export const TRAIL_W = 3; // m
// PLACEHOLDER line (hill metres) until the real trail from OpenStreetMap is
// in: zig-zags up the south slope to the summit.
const LINE = [[45, 128], [105, 110], [110, 92], [30, 95], [-20, 100], [-30, 85], [40, 70], [60, 55], [20, 45], [-40, 60], [-70, 50], [-82, 29]];

const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
hill.e = E;
hill.trailW = TRAIL_W;
const fromItaewon = itaewon.roads.find((r) => r.n?.en === 'Namsan trail' && !r.nw);
const start = fromItaewon.p.at(-1); // where the trail from Itaewon meets the hill
hill.trail = [[r1(start[0] - hill.x), r1(start[1] - hill.z)], ...LINE];

// The walk road: on the map and the road graph (drawn by the landmark, on the slope).
itaewon.roads = itaewon.roads.filter((r) => !r.nw);
itaewon.roads.push({
  k: 'walk', w: TRAIL_W, hill: 1, nw: 1,
  p: hill.trail.map(([x, z]) => [r1(hill.x + x), r1(hill.z + z)]),
  n: { ko: '남산 산책로 (정상 가는 길)', en: 'Namsan trail to the summit', ja: '南山散策路（山頂へ）', zh: '南山步道（往山顶）' },
});

// The cable car's pylons on the new ground; the top station keeps its height over it.
const cable = itaewon.landmarks.find((l) => l.type === 'cablecar');
cable.path.forEach((q, i) => {
  if (!i) return;
  const g = r1(namsanGround(hill, cable.x + q[0] - hill.x, cable.z + q[1] - hill.z));
  if (i === cable.path.length - 1) { q[2] = r1(g + 7.5); q[3] = g; } else q[3] = g;
});
writeFileSync(MAP, JSON.stringify(itaewon));

// ---------- Checks ----------
let len = 0, steep = 0;
const P = hill.trail;
for (let i = 1; i < P.length; i++) {
  const [a, b] = [P[i - 1], P[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  len += L;
  for (let s = 0; s + 2 <= L; s += 2) {
    const q = (t) => [a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L];
    steep = Math.max(steep, Math.abs(namsanGround(hill, ...q(s + 2)) - namsanGround(hill, ...q(s))) / 2);
  }
}
const top = P.at(-1), tower = [hill.px, hill.pz];
console.log(`Namsan trail: ${Math.round(len)} m (real ${Math.round(len * 4)} m), climbs ${Math.round(namsanGround(hill, ...top))} m, steepest ${Math.round(steep * 100)}%, top ${Math.round(Math.hypot(top[0] - tower[0], top[1] - tower[1]))} m from the tower`);
