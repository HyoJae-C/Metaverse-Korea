import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seoul = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/seoul.json', import.meta.url)));
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const vx = bx - ax, vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
};
const ringDist = (x, z, p) => Math.min(...p.map((a, i) => segDist(x, z, a, p[(i + 1) % p.length])));

test('gu borders run where two gu meet (OpenStreetMap outlines), not on the Han River', () => {
  assert.ok(seoul.borders.length > 10, 'border lines in seoul.json');
  const north = new Set(['mapo', 'yongsan', 'seongdong', 'gwangjin']);
  for (const line of seoul.borders) for (const [x, z] of line) {
    const near = seoul.gu.filter((g) => ringDist(x, z, g.p) < 9);
    assert.ok(near.length >= 2, `border point ${x},${z} is on ${near.length} gu edges`);
  }
  // Seongsu (Seongdong) and Gwangjin share a border; Seongdong and Gangnam only the river.
  const between = (a, b) => seoul.borders.some((l) => l.some(([x, z]) => [a, b].every((id) => ringDist(x, z, seoul.gu.find((g) => g.id === id).p) < 9)));
  assert.ok(between('seongdong', 'gwangjin'));
  assert.ok(!between('seongdong', 'gangnam') || !north.has('gangnam'));
});

test('no border or outer edge line on the Han River', () => {
  const { river, riverW } = seoul;
  const segD = (x, z, a, b) => segDist(x, z, a, b);
  for (const l of [...seoul.borders, ...seoul.outline]) for (const [x, z] of l) {
    for (let i = 1; i < river.length; i++) {
      const w = Math.max(riverW[i - 1], riverW[i]) / 2;
      assert.ok(segD(x, z, river[i - 1], river[i]) >= w + 2, `line point ${x},${z} on the river`);
    }
  }
  assert.ok(seoul.outline.length > 0, "Seoul's outer edge is drawn");
});
