// Walking in the palaces (Yozi 2026-11-27: "my feet sink into the steps",
// "buildings overlap"): the throne hall's terraces, the big gates' bases and
// Yeongjegyo's deck lift your feet (core/temple-terrace.js palaceHeight), the
// terraces are entered by their steps only, a small gate is walked through
// across its short side with nothing in its middle, and no hall stands inside
// a gate that has a model of its own (scripts/lib/palace-plan.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { terraceY, throneTerraces, gateMid, GATE_BASE, bridgeDeck } from '../src/core/temple-terrace.js';

const district = (id) => JSON.parse(readFileSync(new URL(`../public/regions/another-seoul/districts/${id}.json`, import.meta.url)));
const inside = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
// A point of a landmark's own model (u across, v to the front, in the model's metres) on the map.
const at = (l, u, v) => { const k = l.sc?.[0] ?? 1, c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0); return [l.x + (u * c + v * s) * k, l.z + (-u * s + v * c) * k]; };
const PALACES = ['gyeongbokgung', 'changdeokgung'].map((id) => [id, district(id)]);
const near = (a, b, why) => assert.ok(Math.abs(a - b) < 0.02, `${why}: ${a} is not ${b}`);

test('the throne hall: your feet go up its terraces by the steps', () => {
  for (const [id, map] of PALACES) {
    const l = map.landmarks.find((q) => q.type === 'throne'), ky = l.sc?.[1] ?? 1;
    const { T1, T2, zT, run } = throneTerraces(l.hs || 1, l), y = (u, v) => terraceY(map.landmarks, ...at(l, u, v));
    near(y(0, zT), (T1.h + T2.h) * ky, `${id}: on the upper terrace`);
    near(y(T1.w / 2 - 0.5, 0), T1.h * ky, `${id}: on the lower terrace, beside the upper one`);
    const mid = y(0, T1.d / 2 + run / 2);
    assert.ok(mid > 0.1 && mid < T1.h * ky - 0.1, `${id}: half way up the first steps you stand half way up (${mid})`);
    const mid2 = y(0, zT + T2.d / 2 + run / 2);
    assert.ok(mid2 > T1.h * ky + 0.1 && mid2 < (T1.h + T2.h) * ky - 0.1, `${id}: and the same on the second steps (${mid2})`);
    near(y(0, T1.d / 2 + run + 1), 0, `${id}: the court before the steps`);
    near(y(T1.w / 2 + 1, 0), 0, `${id}: the court beside the terrace`);
  }
});

test('the terraces are shut along their edges and open at the steps', () => {
  for (const [id, map] of PALACES) {
    const l = map.landmarks.find((q) => q.type === 'throne'), { T1, T2, zT, sw } = throneTerraces(l.hs || 1, l);
    const shut = (u, v) => map.blockers.some((b) => inside(b.p, ...at(l, u, v)));
    for (const [T, v0, name] of [[T1, 0, 'lower'], [T2, zT, 'upper']]) {
      for (const s of [-1, 1]) assert.ok(shut((s * T.w) / 2, v0), `${id}: the ${name} terrace's side is a wall (you would pop up 0.8 m)`);
      for (const s of [-1, 1]) assert.ok(shut((s * (sw + T.w / 2)) / 2, v0 + T.d / 2), `${id}: so is its front beside the steps`);
      assert.ok(!shut(0, v0 + T.d / 2), `${id}: the ${name} terrace's steps are open`);
    }
  }
});

test('a big gate\'s base and Yeongjegyo\'s deck lift your feet', () => {
  for (const [id, map] of PALACES) {
    for (const l of map.landmarks.filter((q) => q.type === 'palacegate' && q.sc)) {
      const ky = l.sc[1] ?? 1, hd = ((l.d || 8) * (l.s || 1)) / 2;
      near(terraceY(map.landmarks, ...at(l, 0, 0)), GATE_BASE.top * ky, `${id} ${l.name.ko}: under the gate`);
      const step = terraceY(map.landmarks, ...at(l, 0, hd + 1.5 + GATE_BASE.run / 2));
      assert.ok(step > 0.05 && step < GATE_BASE.low * ky, `${id} ${l.name.ko}: on its steps (${step})`);
      near(terraceY(map.landmarks, ...at(l, 0, hd + 1.5 + GATE_BASE.run + 0.5)), 0, `${id} ${l.name.ko}: before its steps`);
    }
    const br = map.landmarks.find((q) => q.type === 'yeongjegyo');
    if (!br) continue;
    const { L, at: deck } = bridgeDeck(br);
    near(terraceY(map.landmarks, ...at(br, 0, 0)), deck[deck.length - 1][1] * (br.sc?.[1] ?? 1), `${id}: on the middle of the bridge`);
    near(terraceY(map.landmarks, ...at(br, 0, L / 2 + 1.5)), 0, `${id}: off the bridge`);
  }
});

test('a small gate opens across its short side, and nothing stands in its middle', () => {
  let gates = 0, three = 0;
  for (const [id, map] of PALACES) {
    const walls = map.landmarks.filter((q) => q.type === 'wall');
    for (const l of map.landmarks.filter((q) => q.type === 'palacehalls')) for (const [x, z, w, d, ry, kind] of l.halls) {
      if (kind !== 'g') continue;
      gates++;
      assert.ok(d <= w * 1.15, `${id}: the gate at ${x},${z} is ${w} wide and ${d} deep: it would open into the wall beside it`);
      const g = { x: l.x + x, z: l.z + z, ry }, shut = (u, v) => map.blockers.some((b) => inside(b.p, ...at(g, u, v)));
      // (not checked: a doorway under 2 m, which is one corridor's width; and a shut gate of the outer wall, which the wall runs through)
      const onWall = walls.some((wl) => wl.p.some(([px, pz]) => Math.hypot(px - g.x, pz - g.z) < 4));
      if (!onWall && w >= 2) for (const v of [-d / 2 - 0.3, 0, d / 2 + 0.3]) assert.ok(!shut(0, v), `${id}: the gate at ${x},${z} is blocked in its middle`);
      const mid = gateMid(w);
      if (mid < w) { three++; for (const s of [-1, 1]) assert.ok(shut((s * (w + mid)) / 4, 0), `${id}: the gate at ${x},${z}: its side bays are shut doors`); }
    }
  }
  assert.ok(gates >= 6 && three >= 3, `${gates} gates, ${three} of three bays`);
});

test('no hall stands inside a gate that has its own model, or inside another hall', () => {
  for (const [id, map] of PALACES) {
    const own = map.landmarks.filter((q) => q.type === 'palacegate' && q.sc);
    for (const l of map.landmarks.filter((q) => q.type === 'palacehalls')) {
      l.halls.forEach(([x, z, w, d, ry], i) => {
        for (const o of own) {
          const c = Math.cos(o.ry || 0), s = Math.sin(o.ry || 0), k = o.s || 1;
          for (const [u, v] of [[0, 0], [-w / 2, 0], [w / 2, 0], [0, -d / 2], [0, d / 2]]) {
            const [px, pz] = at({ x: l.x + x, z: l.z + z, ry }, u, v), dx = px - o.x, dz = pz - o.z;
            assert.ok(Math.abs(dx * c - dz * s) > ((o.w || 22) * k) / 2 - 0.05 || Math.abs(dx * s + dz * c) > ((o.d || 8) * k) / 2 - 0.05, `${id}: the hall at ${x},${z} runs into ${o.name.ko}`);
          }
        }
        if (id === 'gyeongbokgung') l.halls.forEach(([x2, z2, w2, d2, ry2], j) => { // (OSM maps a few of its buildings twice; Changdeokgung's wings stand in their halls on purpose)
          if (i === j) return;
          const c = Math.cos(ry2 || 0), s = Math.sin(ry2 || 0), dx = x - x2, dz = z - z2;
          assert.ok(Math.abs(dx * c - dz * s) > w2 / 2 || Math.abs(dx * s + dz * c) > d2 / 2, `${id}: the hall at ${x},${z} has its middle inside the one at ${x2},${z2}`);
        });
      });
    }
  }
});
