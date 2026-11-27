// Ttukseom's outdoor climbing wall (game/ttukseom-wall.js): on its real spot,
// on land, clear of the buildings and the river path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { pointInPoly } from '../src/core/collision.js';
import { WALL_BLOCKS } from '../src/game/ttukseom-wall.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/map.json', import.meta.url)));
const wall = map.landmarks.find((l) => l.type === 'climbwall');
const W = (lx, lz) => [wall.x + lx * Math.cos(wall.ry) + lz * Math.sin(wall.ry), wall.z - lx * Math.sin(wall.ry) + lz * Math.cos(wall.ry)];

test('the wall stands on its real spot', () => {
  const [x, z] = toGame(...wall.real);
  assert.ok(Math.hypot(wall.x - x, wall.z - z) < 2, `${Math.hypot(wall.x - x, wall.z - z).toFixed(1)} m from the real one`);
});

test('the wall, its floor and its plaza are on land, off the buildings and the river path', () => {
  const pts = [];
  for (const { r: [x0, z0, x1, z1] } of WALL_BLOCKS) pts.push(W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1));
  for (let i = 0; i <= 20; i++) pts.push(W(17 * Math.cos((Math.PI * i) / 20), 1.4 + 12 * Math.sin((Math.PI * i) / 20))); // the plaza's edge
  const water = map.areas.filter((a) => a.k === 'water');
  const path = map.roads.find((r) => r.n?.en === 'Han River Path');
  const segDist = ([px, pz], [ax, az], [bx, bz]) => { const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2))); return Math.hypot(px - ax - t * (bx - ax), pz - az - t * (bz - az)); };
  for (const q of pts) {
    assert.ok(!map.buildings.some((b) => pointInPoly(q[0], q[1], b.p)), `in a building: ${q}`);
    assert.ok(!water.some((a) => pointInPoly(q[0], q[1], a.p)), `in the water: ${q}`);
    for (let i = 1; i < path.p.length; i++) assert.ok(segDist(q, path.p[i - 1], path.p[i]) > path.w / 2 + 1, `on the river path: ${q}`);
  }
});
