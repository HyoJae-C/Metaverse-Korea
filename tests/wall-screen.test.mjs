import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wallNear, screenSpot, SCREEN_LOW, SCREEN_ROOF } from '../src/core/wall-screen.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const buildings = [];
for (const d of region.districts) {
  const [dx, dz] = d.offset || [0, 0];
  for (const b of read(d.map).buildings || []) buildings.push({ ...b, p: b.p.map(([x, z]) => [x + dx, z + dz]) });
}
const along = (wall, s) => (s.x - wall.x1) * wall.ax + (s.z - wall.z1) * wall.az;

test('a screen stays inside its wall and under the roof', () => {
  const b = { h: 20, p: [[0, 0], [30, 0], [30, 10], [0, 10]] };
  const wall = wallNear([b], 29, -1); // near the corner
  const s = screenSpot(wall, { w: 20, h: 30, y: 22 });
  assert.ok(along(wall, s) - s.w / 2 >= 0 && along(wall, s) + s.w / 2 <= wall.len, 'inside the ends');
  assert.ok(s.y >= SCREEN_LOW && s.y + s.h <= b.h - SCREEN_ROOF + 1e-9, 'under the roof');
  assert.ok(Math.abs(s.w / s.h - 20 / 30) < 1e-9, 'shrunk whole, same shape');
});

test('every big screen in town hangs on a real wall (none in the air)', () => {
  const placed = [];
  for (const sc of region.screens) {
    const wall = wallNear(buildings, sc.at[0], sc.at[1]);
    const name = sc.note || String(sc.at);
    assert.ok(wall.d < 1.5, `${name}: ${wall.d.toFixed(1)} m from the nearest wall`);
    const s = screenSpot(wall, sc), t = along(wall, s);
    assert.ok(t - s.w / 2 >= 0 && t + s.w / 2 <= wall.len, `${name}: past the wall's end`);
    assert.ok(s.y + s.h <= wall.h - SCREEN_ROOF + 1e-9, `${name}: over the roof`);
    for (const o of placed) {
      if (o.wall.b !== wall.b || o.wall.x1 !== wall.x1 || o.wall.z1 !== wall.z1) continue;
      const apart = Math.abs(o.t - t) >= (o.s.w + s.w) / 2 || o.s.y >= s.y + s.h || s.y >= o.s.y + o.s.h;
      assert.ok(apart, `${name}: on top of another screen`);
    }
    placed.push({ wall, s, t });
  }
});
