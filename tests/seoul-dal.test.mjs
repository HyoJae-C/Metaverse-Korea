import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DAL, dalAt, gateOpen, opensIn, riderSpot, clock } from '../src/core/seoul-dal.js';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { inPolygon } from '../src/core/seoul-grid.js';
import { EN } from '../src/i18n/en.js';
import { STRINGS } from '../src/i18n/strings.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

test('Seoul Dal waits on the ground, rises, waits at the top and comes down, once a cycle', () => {
  assert.equal(DAL.cycle, 180);
  assert.deepEqual([dalAt(1).phase, dalAt(1).h], ['board', 0]);
  const mid = dalAt(DAL.board + DAL.rise / 2);
  assert.equal(mid.phase, 'up');
  assert.ok(Math.abs(mid.h - DAL.top / 2) < 1e-9);
  assert.deepEqual([dalAt(DAL.board + DAL.rise + 1).phase, dalAt(DAL.board + DAL.rise + 1).h], ['top', DAL.top]);
  assert.equal(dalAt(DAL.cycle - 1).phase, 'down');
  assert.equal(dalAt(DAL.cycle + 1).phase, 'board');
  assert.equal(dalAt(DAL.cycle + 1).n, dalAt(1).n + 1, 'a new flight');
  // Smooth: never jumps more than a little between frames.
  for (let t = 0; t < DAL.cycle * 2; t += 0.05) assert.ok(Math.abs(dalAt(t + 0.05).h - dalAt(t).h) < 0.2, `t=${t}`);
});

test('the gate shuts just before lift-off, and opensIn counts down to it opening', () => {
  assert.ok(gateOpen(dalAt(0)));
  assert.ok(!gateOpen(dalAt(DAL.board - DAL.close + 0.5)));
  assert.ok(!gateOpen(dalAt(DAL.board + 1)));
  assert.equal(opensIn(3), 0);
  for (let t = 0; t < DAL.cycle * 2; t += 0.7) {
    const w = opensIn(t);
    assert.ok(w >= 0 && w <= DAL.cycle, `t=${t}`);
    if (w > 0) { assert.ok(!gateOpen(dalAt(t))); assert.ok(gateOpen(dalAt(t + w + 0.01)), `t=${t} w=${w}`); }
  }
});

test('riders stand round the ring, inside the gondola, facing out', () => {
  assert.equal(DAL.max, 5, 'a quarter of the real 20, like the map');
  assert.ok(DAL.slots >= DAL.max * 2, 'room to spread out');
  assert.ok(DAL.turn < DAL.board - DAL.close, 'a called ticket can board before the gate shuts');
  const seen = new Set();
  for (let k = 0; k < DAL.slots; k++) {
    const s = riderSpot(k);
    assert.ok(Math.abs(Math.hypot(s.x, s.z) - DAL.ring) < 1e-9);
    assert.ok(DAL.ring > 1.6 + 0.5 && DAL.ring < 4.6 - 0.5, 'between the core and the glass');
    seen.add(`${s.x.toFixed(2)},${s.z.toFixed(2)}`);
  }
  assert.equal(seen.size, DAL.slots);
  assert.equal(clock(65.2), '1:06');
  assert.equal(clock(-3), '0:00');
});

test('the balloon stands on an open lawn in Yeouido Park, its gate on a path from the river park', async () => {
  const region = read('region.json');
  const joined = await loadRegionMap(region, async (f) => read(f));
  const solid = new CollisionMap(joined.buildings.concat(joined.blockers));
  const dal = joined.landmarks.filter((l) => l.type === 'seouldal');
  assert.equal(dal.length, 1, 'one Seoul Dal, only in Yeouido');
  const { x, z, ry } = dal[0];
  // Nothing solid under the pad, its fence or its sign.
  for (let a = 0; a < Math.PI * 2; a += 0.2) for (const r of [0, 4, 8, 10]) {
    assert.ok(!solid.blocked(x + Math.sin(a) * r, z + Math.cos(a) * r, 0.4), `open at r ${r}`);
  }
  // Clear of the tallest office towers: the balloon (radius 9) goes up 70 m.
  for (const b of joined.buildings) for (const [px, pz] of b.p) assert.ok(Math.hypot(px - x, pz - z) > 20, 'no tower in the way');
  // The gate (local +z) faces the river park, and the Yeouido Park path ends there.
  const gx = x + Math.sin(ry) * 8.6, gz = z + Math.cos(ry) * 8.6;
  const path = joined.roads.find((r) => r.n?.en === 'Yeouido Park path');
  const end = path.p.at(-1);
  assert.ok(Math.hypot(end[0] - gx, end[1] - gz) < 1, 'the path ends at the gate');
  const lawn = joined.roads.find((r) => r.n?.en === 'Han River path');
  assert.ok(Math.hypot(lawn.p[0][0] - gx, lawn.p[0][1] - gz) > Math.hypot(lawn.p[0][0] - x, lawn.p[0][1] - z) - 20, 'the gate is on the river side');
  assert.ok(joined.areas.some((a) => a.k === 'grass' && inPolygon(x, z, a.p)), 'on grass');
  assert.ok(joined.landmarks.some((l) => l.type === 'sign' && l.title?.en === 'Seoul Dal' && Math.hypot(l.x - x, l.z - z) < 25), 'a board with the real facts by the pad');
  assert.ok(read('zones.json').zones.some((zn) => zn.id === 'K-2' && Math.hypot(zn.at[0] - x, zn.at[1] - z) < 30), 'people already about');
});

test('every language has the Seoul Dal words', () => {
  const keys = Object.keys(EN).filter((k) => k.startsWith('dal.') || k === 'ledger.seoulDal');
  assert.equal(keys.length, 18);
  for (const [lang, table] of Object.entries(STRINGS)) {
    if (lang === 'hant') continue; // (made from zh)
    for (const k of keys) assert.ok(table[k], `${lang} ${k}`);
  }
});
