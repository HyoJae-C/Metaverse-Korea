import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sunsetAt } from '../src/core/sunset-sky.js';
import { sunsetIn } from '../src/game/sunset-spot.js';
import { CYCLE, CYCLE_MS, gameHour } from '../src/core/show-clock.js';
import { toGame } from '../src/core/seoul-grid.js';

// The sunset seen from Mangwon Han River Park (core/sunset-sky.js,
// game/sunset-spot.js, scripts/build-mangwon.mjs).
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const mangwon = read('districts/mangwon.json');
const off = region.districts.find((d) => d.id === 'mangwon').offset;
const RIVER = JSON.parse(readFileSync(new URL('../scripts/data/mangwon-river-osm.json', import.meta.url)));
const MIN = 60e3;

test('the sunset look is on only around sunset and sunrise, the sun going down in the west', () => {
  assert.equal(sunsetAt(12).k, 0, 'noon: the plain sky');
  assert.equal(sunsetAt(23).k, 0, 'night');
  assert.equal(sunsetAt(17.5).k, 1, 'sunset');
  assert.ok(sunsetAt(16.5).elev > 10 && Math.abs(sunsetAt(18).elev) < 0.01, 'low, then on the horizon at 18:00');
  assert.equal(sunsetAt(17.5).side, 1);
  assert.equal(sunsetAt(6.2).side, -1, 'sunrise in the east');
  // The game's sunset (show-clock.js) is inside the look (its last minutes fade into the night).
  const from = (CYCLE.morning + CYCLE.day) * MIN;
  for (let m = 3; m <= 18; m += 3) assert.ok(sunsetAt(gameHour(from + m * MIN)).k > 0.4, `minute ${m} of the sunset`);
});

test('the steps say how long until the sunset', () => {
  const from = (CYCLE.morning + CYCLE.day) * MIN;
  assert.equal(sunsetIn(from + 5 * MIN), 0, 'on now');
  assert.equal(sunsetIn(from - 30 * MIN), 30);
  assert.equal(sunsetIn(from + CYCLE.sunset * MIN), Math.ceil((CYCLE_MS - CYCLE.sunset * MIN) / MIN), 'just over: the next one');
});

// Distance from a point to a polyline.
const segDist = (q, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L)) : 0;
  return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz);
};
const lineDist = (q, p) => p.reduce((m, _, i) => (i ? Math.min(m, segDist(q, p[i - 1], p[i])) : m), Infinity);

test('Seongsan and Yanghwa Bridges are on their real lines (within 10 m) and the sunset steps face the sun', () => {
  for (const [which, ko] of [['seongsan', '성산대교'], ['yanghwa', '양화대교']]) {
    const b = mangwon.landmarks.find((l) => l.type === 'banpobridge' && l.which === which);
    assert.ok(b, which);
    const real = RIVER.bridges[ko].map((w) => w.p.map(([lat, lon]) => toGame(lat, lon)));
    for (const [dx, dz] of b.pts) {
      const q = [b.x + dx + off[0], b.z + dz + off[1]];
      const d = Math.min(...real.map((p) => lineDist(q, p)));
      assert.ok(d < 10, `${which} ${d.toFixed(1)} m off the real carriageways`);
    }
    assert.ok(b.arches.length && typeof b.noPiers[0][2] === 'number', 'arches; no piers on the park');
  }
  const park = mangwon.landmarks.find((l) => l.type === 'hanpark');
  const steps = park.layout.steps.find((s) => s.sunset);
  assert.ok(steps, 'the sunset steps');
  // The way the seats face, in world metres, and the sun's way (west, a little south).
  const ry = park.ry + (steps.ry || 0) + Math.PI; // (core/han-park.js: a seat faces (sin ry, cos ry))
  const face = [Math.sin(ry), Math.cos(ry)], sun = [-Math.cos(0.18), Math.sin(0.18)];
  assert.ok(face[0] * sun[0] + face[1] * sun[1] > 0.9, 'facing the sunset');
});

test('Seonyudo and the south bank are drawn across the river', () => {
  const parks = mangwon.areas.filter((a) => a.k === 'park' && a.trees);
  assert.ok(parks.length >= 3, 'the park behind the path, Seonyudo and Yanghwa Han River Park');
  const water = mangwon.areas.find((a) => a.k === 'water');
  assert.ok(water.p.length > 12 && water.holes?.length === 1, 'the real banks, not a rectangle, with Seonyudo cut out');
});
