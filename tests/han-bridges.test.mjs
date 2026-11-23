// The Han's bridges up off the water (Yozi 2026-11-18): core/han-bridges.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRegionMap } from '../src/core/districts.js';
import { bridgeY, deckHeight, TOP } from '../src/core/han-bridges.js';
import { boatPose, lineLengths } from '../src/core/boat-taxi.js';

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const map = await loadRegionMap(region, async (f) => JSON.parse(readFileSync(new URL(f, R))));
const bt = map.boatTaxi;

test('every big road over the boat line is a bridge up off the water', () => {
  const names = map.bridges.map((b) => b.name).sort();
  assert.deepEqual(names, ['동작대로', '동호로', '서강대교', '여의대로', '여의대방로', '잠수교', '한남대로'].sort());
  for (const b of map.bridges) {
    assert.ok(Math.abs(deckHeight(b, b.mid) - (b.jamsu ? 5 : TOP)) < 0.01, `${b.name} is up over the channel`);
    assert.ok(deckHeight(b, 0) <= 0.3 && deckHeight(b, b.len) <= 0.3, `${b.name} comes down to its road at each end`);
  }
  assert.ok(!map.landmarks.some((l) => l.type === 'jamsu'), 'Jamsu is drawn as a bridge now (no flat deck through it)');
});

test('the road is still one road for finding the way, but its stretch over the river is not drawn flat', () => {
  for (const [i, b] of map.bridges.entries()) {
    const mid = map.roads.find((r) => r.bridge === i + 1);
    assert.ok(mid, `${b.name}: its stretch`);
    const key = (p) => p[0] + ',' + p[1];
    for (const end of [mid.p[0], mid.p.at(-1)]) {
      const joined = map.roads.some((r) => r !== mid && (key(r.p[0]) === key(end) || key(r.p.at(-1)) === key(end)));
      const atEnd = deckHeight(b, 0) <= 0.3;
      assert.ok(joined || atEnd, `${b.name}: joined at ${end}`);
    }
  }
});

test('the boats pass under every bridge, both ways', () => {
  const lens = lineLengths(bt.route);
  let worst = Infinity;
  for (const dir of [1, -1]) {
    for (let s = 0; s <= lens.at(-1); s += 1) {
      const q = boatPose(bt.route, lens, bt.piers, s, dir), fx = Math.sin(q.ry), fz = Math.cos(q.ry);
      for (const [u, v] of [[0, 0], [6, 0], [-6, 0], [6, 2], [6, -2], [-6, 2], [-6, -2], [0, 2], [0, -2]]) {
        const y = bridgeY(map.bridges, q.x + fx * u + fz * v, q.z + fz * u - fx * v);
        if (y > 0) worst = Math.min(worst, y - 1.4);
      }
    }
  }
  assert.ok(worst > 3.4, `the deck's underside over a boat: ${worst.toFixed(2)} m (the wheelhouse is 3.1 m)`);
});

test('you walk up a bridge: no step on the way', () => {
  for (const b of map.bridges) {
    let prev = deckHeight(b, 0);
    for (let s = 0.5; s <= b.len; s += 0.5) {
      const y = deckHeight(b, s);
      assert.ok(Math.abs(y - prev) < 0.3, `${b.name} at ${s}`);
      prev = y;
    }
    const [x, z] = b.pts[Math.floor(b.pts.length / 2)];
    assert.ok(bridgeY(map.bridges, x, z) >= 0, 'on it');
  }
});
