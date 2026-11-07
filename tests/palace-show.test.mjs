import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAN_KEEP, ROYAL_ROUTE, ROYAL_PAUSE, nextStop, ringPoly } from '../src/core/palace-show.js';
import { CollisionMap, pointInPoly } from '../src/core/collision.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/seongsu/districts/gyeongbokgung.json', import.meta.url)));
const FAN = [0, -150]; // main.js: the palace offset + (0, -150)

test('the fan dance has a rope ring you cannot walk into', () => {
  const ring = ringPoly(FAN[0], FAN[1], FAN_KEEP);
  const solid = new CollisionMap([{ p: ring }]);
  assert.ok(FAN_KEEP >= 9, 'clear of the outer ring of dancers (about 7 m)');
  assert.ok(pointInPoly(FAN[0], FAN[1] + FAN_KEEP - 1, ring));
  assert.ok(solid.blocked(FAN[0], FAN[1] + FAN_KEEP - 0.5, 0.3));
  assert.ok(!solid.blocked(FAN[0], FAN[1] + FAN_KEEP + 1, 0.3));
  // walking straight at the dancers stops at the rope
  let [x, z] = [FAN[0], FAN[1] + 20];
  for (let i = 0; i < 200; i++) [x, z] = solid.move(x, z, 0, -0.1, 0.3);
  assert.ok(Math.hypot(x - FAN[0], z - FAN[1]) > FAN_KEEP - 0.5);
});

test('the royal procession walks paths clear of halls, walls and the fan dance', () => {
  const walls = new CollisionMap(map.buildings.concat(map.blockers));
  const { stops, links } = ROYAL_ROUTE;
  for (const [a, b] of links) {
    const [ax, az] = stops[a], [bx, bz] = stops[b], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      // the walkers go two abreast, 0.9 m either side of the line
      for (const s of [-1.2, 0, 1.2]) {
        const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
        assert.ok(!walls.blocked(x + (dz / l) * s, z - (dx / l) * s, 0.3), `path ${a}-${b} hits a wall near ${x.toFixed(0)},${z.toFixed(0)}`);
      }
      assert.ok(Math.hypot(x - FAN[0], z - FAN[1]) > FAN_KEEP + 3, `path ${a}-${b} goes through the fan dance`);
    }
  }
  // every stop can be reached from every other
  const seen = new Set([0]), todo = [0];
  while (todo.length) { const s = todo.pop(); for (const l of links) for (const [p, q] of [l, [...l].reverse()]) if (p === s && !seen.has(q)) { seen.add(q); todo.push(q); } }
  assert.equal(seen.size, stops.length);
});

test('the procession picks a new way on, pausing about 10 s for photos', () => {
  assert.ok(ROYAL_PAUSE >= 8 && ROYAL_PAUSE <= 12);
  for (let i = 0; i < 50; i++) assert.notEqual(nextStop(ROYAL_ROUTE, 1, 0, Math.random), 0); // stop 1 has other ways on
  assert.equal(nextStop(ROYAL_ROUTE, 14, 0, Math.random), 0); // a dead end turns back
});
