// The Han's bridges up off the water (Yozi 2026-11-18): core/han-bridges.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRegionMap } from '../src/core/districts.js';
import * as THREE from 'three';
import { bridgeY, deckHeight, onLine, TOP } from '../src/core/han-bridges.js';
import { banpoBridge } from '../src/core/banpo-bridge.js';
import { boatPose, lineLengths } from '../src/core/boat-taxi.js';

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const map = await loadRegionMap(region, async (f) => JSON.parse(readFileSync(new URL(f, R))));
const bt = map.boatTaxi;

test('every big road over the boat line is a bridge up off the water', () => {
  const names = map.bridges.map((b) => b.name).sort();
  assert.deepEqual(names, ['동작대로', '동호로', '서강대교', '성수대교', '여의대로', '여의대방로', '영동대교', '잠수교', '한남대로'].sort());
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

// Yozi 2026-11-24: the bridges were "뒤죽박죽": decks of boxes stepped where
// they narrowed or bent, and two decks stood in each other.
const meshes = (l) => { const g = new THREE.Group(); banpoBridge(g, l); return g.children; };
const banpoLM = map.landmarks.find((l) => l.type === 'banpobridge' && l.w === 22);
const abs = (l) => l.pts.map(([x, z]) => [l.x + x, l.z + z]);

test('Dongjak Bridge is one deck: the road\'s, with the subway down the middle and its arches', () => {
  const dj = map.bridges.find((b) => b.name === '동작대로');
  assert.ok(dj.track, 'the subway strip');
  assert.equal(dj.arches.length, 3);
  for (const [s0, s1] of dj.arches) assert.ok(s0 > 0 && s1 < dj.len && s1 > s0, `arch ${s0}-${s1} on the deck`);
  for (const l of map.landmarks.filter((o) => o.type === 'banpobridge' && o !== banpoLM)) {
    const line = abs(l);
    assert.ok(!dj.pts.every(([x, z]) => onLine(line, x, z)[0] < 6), 'no second deck along it');
  }
});

test('Banpo Bridge carries Jamsu: no piers of Jamsu\'s own, Banpo\'s stand clear of its deck', () => {
  const j = map.bridges.find((b) => b.jamsu);
  assert.ok(j.under && banpoLM.lower === j);
  assert.ok(deckHeight(j, 0.01) < 0.01 && deckHeight(j, j.len - 0.01) < 0.01, 'down to its road at the ends (no kerb)');
  const piers = meshes(banpoLM).at(-1).geometry.attributes.position;
  let feet = 0;
  for (let i = 0; i < piers.count; i++) {
    if (Math.abs(piers.getY(i)) > 0.01) continue;
    const [d] = onLine(j.pts, piers.getX(i) + banpoLM.x, piers.getZ(i) + banpoLM.z);
    assert.ok(d > j.w / 2 + 0.3, `a pier's foot ${d.toFixed(2)} m from Jamsu's middle`);
    feet++;
  }
  assert.ok(feet > 20, 'piers under the river span');
});

test('a bridge deck\'s edge has no steps where it narrows or bends', () => {
  const line = banpoLM.pts;
  const deck = meshes(banpoLM)[0].geometry;
  const pos = deck.attributes.position, nrm = deck.attributes.normal, edge = new Map();
  for (let i = 0; i < pos.count; i++) {
    if (nrm.getY(i) < 0.9) continue; // (the top)
    const [d, s] = onLine(line, pos.getX(i), pos.getZ(i)), k = Math.round(s);
    edge.set(k, Math.max(edge.get(k) || 0, d));
  }
  const ks = [...edge.keys()].sort((a, b) => a - b);
  assert.ok(ks.length > 40, 'sampled along it');
  for (let i = 1; i < ks.length; i++) {
    const step = Math.abs(edge.get(ks[i]) - edge.get(ks[i - 1])) / Math.max(1, ks[i] - ks[i - 1]);
    assert.ok(step < 0.5, `half width jumps ${step.toFixed(2)} m at ${ks[i]} m`);
  }
});
