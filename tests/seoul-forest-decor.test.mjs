// Seoul Forest's deer meadow, wildflower patches and Family Lawn
// (scripts/build-seongsu.mjs): inside the park, out of its ponds, off the roads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/map.json', import.meta.url)));
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
const parks = map.areas.filter((a) => a.k === 'park' && a.trees).map((a) => a.p);
const ponds = map.areas.filter((a) => a.k === 'water' && a.p.length < 40).map((a) => a.p);
const roads = map.roads.filter((r) => r.k !== 'walk');
const offRoads = (x, z, r) => roads.every((rd) => rd.p.every((q, i) => i === 0 || segDist(x, z, rd.p[i - 1], q) > rd.w / 2 + r));

test('the deer meadow: a fenced paddock in the park, with deer, off the ponds and roads', () => {
  const pen = map.landmarks.find((l) => l.type === 'deerpen');
  assert.ok(pen && pen.deer >= 3 && pen.label?.en);
  for (const [x, z] of pen.p) {
    assert.ok(parks.some((p) => inPoly(x, z, p)), `fence corner ${x},${z} in the park`);
    assert.ok(!ponds.some((p) => inPoly(x, z, p)), `fence corner ${x},${z} out of the ponds`);
    assert.ok(offRoads(x, z, 1), `fence corner ${x},${z} off the roads`);
  }
  assert.ok(map.landmarks.some((l) => l.type === 'sign' && l.title?.en === 'Deer Meadow'), 'a sign');
});

test('wildflower patches and the Family Lawn sit in the park, not in a pond or on a road', () => {
  const list = map.landmarks.filter((l) => l.type === 'meadow' || l.type === 'lawn');
  assert.ok(list.filter((l) => l.type === 'meadow').length >= 10);
  for (const l of list) {
    assert.ok(parks.some((p) => inPoly(l.x, l.z, p)), `${l.type} ${l.x},${l.z} in the park`);
    assert.ok(!ponds.some((p) => inPoly(l.x, l.z, p)), `${l.type} ${l.x},${l.z} out of the ponds`);
    assert.ok(offRoads(l.x, l.z, l.r || 3), `${l.type} ${l.x},${l.z} off the roads`);
  }
  assert.ok(map.areas.some((a) => a.lawn && a.k === 'grass' && inPoly(-566, 14, a.p)), 'the Family Lawn is a picnic lawn');
});
