// Stairwells across the edge of a plaza or park: the paving is cut round
// them, so it doesn't cover the steps (Yozi 2026-11-11: an entrance looked
// flush with the ground).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { minusConvex } from '../src/core/world.js';
import { holeOf } from '../src/core/subway.js';

const area = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

test('minusConvex: an L-shaped plaza minus a square across its corner', () => {
  const L = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  const sq = [[3, 3], [6, 3], [6, 6], [3, 6]];
  const pieces = minusConvex(L, sq);
  // The square covers 1 x 1 + 1 x 2 + 2 x 1 of the L (from (3,3) to (4,6) and (6,4)): 5 m².
  assert.ok(Math.abs(pieces.reduce((s, p) => s + area(p), 0) - (area(L) - 5)) < 1e-6);
  for (const p of pieces) assert.ok(!inPoly(3.5, 3.5, p) && !inPoly(5, 3.5, p) && !inPoly(3.5, 5, p));
  // Either winding of the hole gives the same.
  const back = minusConvex(L, sq.slice().reverse());
  assert.ok(Math.abs(back.reduce((s, p) => s + area(p), 0) - (area(L) - 5)) < 1e-6);
});

test('every station stairwell that crosses a plaza or park edge gets cut out of it', () => {
  const R = new URL('../public/regions/another-seoul/', import.meta.url);
  const region = JSON.parse(readFileSync(new URL('region.json', R)));
  const areas = [];
  for (const d of region.districts) {
    const m = JSON.parse(readFileSync(new URL(d.map, R)));
    for (const a of m.areas || []) if (!a.sunk && a.k !== 'water') areas.push(a.p.map(([x, z]) => [x + d.offset[0], z + d.offset[1]]));
  }
  let crossing = 0;
  for (const st of region.subway.stations) for (const e of st.exits || []) {
    const h = holeOf(e), mid = [e.at[0], e.at[1]];
    for (const p of areas) {
      const n = h.filter(([x, z]) => inPoly(x, z, p)).length;
      if (!n || n === 4) continue;
      crossing++;
      const pieces = minusConvex(p, h);
      for (const q of pieces) for (const [x, z] of h.map(([x, z]) => [(x + 3 * mid[0]) / 4, (z + 3 * mid[1]) / 4])) assert.ok(!inPoly(x, z, q), `${st.id} exit ${e.n}`);
      const cut = area(p) - pieces.reduce((s, q) => s + area(q), 0);
      assert.ok(cut > 0 && cut <= area(h) + 1e-6, `${st.id} exit ${e.n}: cut ${cut}`);
    }
  }
  assert.ok(crossing >= 1); // (Dongmyo's exits are half on the market's paving)
});
