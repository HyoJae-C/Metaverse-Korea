import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';

// Streets must stay walkable. When a district is moved or a road is re-drawn
// (Songpa-daero across the Han River once ran straight through three towers),
// the old buildings can end up standing on the new road: the map shows a
// street, but you walk into a wall. This checks every street of the joined
// Seoul map (districts and link roads) against what you collide with.
//
// Only the middle half of each street is checked, so a building that reaches
// the kerb is fine; footpaths ("walk") and overhangs you walk under are left
// out. If a street is blocked on purpose, add it to ALLOWED with the reason.
const ALLOWED = [
  // { d: 'district-id', name: 'Street name (en)', why: '...' },
];

const R = new URL('../public/regions/seongsu/', import.meta.url);
const readJson = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));

test('no building or blocker stands on a street', async () => {
  const map = await loadRegionMap(readJson('region.json'), async (f) => readJson(f));
  const solid = new CollisionMap(map.buildings.concat(map.blockers || []));
  const blocked = [];
  for (const r of map.roads) {
    if (r.k === 'walk') continue;
    const name = r.n?.en || '';
    if (ALLOWED.some((a) => a.d === r.d && a.name === name)) continue;
    let hit = null;
    for (let i = 1; i < r.p.length && !hit; i++) {
      const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (!len) continue;
      const nx = -(z2 - z1) / len, nz = (x2 - x1) / len;
      for (let s = 0; s <= len && !hit; s += 1) {
        for (const o of [-r.w / 4, 0, r.w / 4]) {
          const x = x1 + ((x2 - x1) * s) / len + nx * o, z = z1 + ((z2 - z1) * s) / len + nz * o;
          if (solid.blocked(x, z, 0.4)) { hit = [Math.round(x), Math.round(z)]; break; }
        }
      }
    }
    if (hit) blocked.push(`${r.d} ${r.k} "${name}" at ${hit.join(', ')}`);
  }
  assert.deepEqual(blocked, [], 'streets with a building or blocker on them:\n' + blocked.join('\n'));
});
