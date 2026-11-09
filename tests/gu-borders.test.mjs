import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createGuBorders, densify, guAt } from '../src/game/gu-borders.js';

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

test('the gu at a point', () => {
  assert.equal(guAt(seoul, 0, 0).id, 'seongdong'); // Seongsu Station
  assert.equal(guAt(seoul, 1e6, 0), null);
});

test('densify keeps the ends and puts a point every few metres', () => {
  const p = densify([[0, 0], [10, 0]], 4);
  assert.deepEqual(p[0], [0, 0]);
  assert.deepEqual(p.at(-1), [10, 0]);
  assert.equal(p.length, 4);
});

test('the purple line is built in tiles, and only the near ones are drawn', () => {
  const scene = new THREE.Scene();
  const me = { x: 0, z: 0 };
  let street = true;
  const b = createGuBorders({ scene, seoul, groundY: () => 0, getMe: () => me, onStreet: () => street });
  assert.ok(b.group.children.length > 5);
  b.update(1);
  const shown = b.group.children.filter((m) => m.visible).length;
  assert.ok(shown > 0 && shown < b.group.children.length, `${shown} tiles shown`);
  street = false;
  b.update(1);
  assert.equal(b.group.visible, false);
});
