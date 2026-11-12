import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHOW_SECONDS, ALERT_SECONDS, DUSK_SECONDS, fireworksAt, nextFireworks, nightAt, program, PHOTO_TIME,
  KINDS, LIFE, RADIUS, BARGES, nearYeouido, atUV, ORIGIN as FW_ORIGIN, U as FW_U,
} from '../src/core/fireworks-show.js';
import { droneShowAt } from '../src/core/drone-show.js';
import { CYCLE_MS, SHOW_FROM, cycleNumber } from '../src/core/show-clock.js';
import { ORIGIN, U, at } from '../scripts/build-yeouido.mjs';

// A fireworks show's start: the fireworks are on the even cycles.
const N = cycleNumber(Date.UTC(2026, 10, 9)) & ~1;
const FW = (k = 0) => (N + 2 * k) * CYCLE_MS + SHOW_FROM;

test('every other night of the game\'s 3-hour day, four a real day, never with the drone show', () => {
  const start = FW();
  assert.equal(fireworksAt(start - (ALERT_SECONDS + 5) * 1000), null, 'nothing before the notice');
  assert.equal(fireworksAt(start - ALERT_SECONDS * 1000 + 1000).start, start, 'the 10-minute notice');
  const mid = fireworksAt(start + 600e3);
  assert.ok(mid.on && mid.night === 1);
  assert.equal(droneShowAt(start + 600e3), null, 'no drones the same night');
  assert.equal(fireworksAt(start - 60 * 60e3), null, 'no show in the day');
  assert.equal(nextFireworks(start - 60 * 60e3), start);
  assert.equal(nextFireworks(start + 30 * 60e3), FW(1), 'the next one 6 hours later');
  assert.equal(FW(1) - start, 2 * CYCLE_MS);
  let n = 0;
  for (let s = nextFireworks(start - 1); s < start + 24 * 3600e3; s = nextFireworks(s)) n++;
  assert.equal(n, 4);
});

test('Yeouido\'s sky darkens before the show and brightens after it, smoothly', () => {
  assert.equal(nightAt(-DUSK_SECONDS - 1), 0);
  assert.equal(nightAt(0), 1);
  assert.equal(nightAt(SHOW_SECONDS + DUSK_SECONDS + 1), 0);
  let prev = 0;
  for (let t = -DUSK_SECONDS; t <= 0; t += 5) { const k = nightAt(t); assert.ok(k >= prev && k - prev < 0.08, `t ${t}`); prev = k; }
});

test('the program: the same for everyone, no long waits, a photo time and a finale', () => {
  const start = FW();
  const a = program(start), b = JSON.parse(JSON.stringify(program(start)));
  assert.deepEqual(a, b, 'one program per show');
  assert.notDeepEqual(program(FW(1)).slice(0, 5), a.slice(0, 5), 'each show is a little different');
  assert.ok(a.length > 1500 && a.length < 5000, `${a.length} bursts`);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i].t >= a[i - 1].t, 'in time order');
    assert.ok(a[i].t - a[i - 1].t < 2.5, `no gap over 2.5 s (at ${a[i].t})`);
  }
  assert.equal(SHOW_SECONDS, 1200, '20 minutes');
  for (const k of KINDS) assert.ok(a.some((x) => x.kind === k), `${k} comes up`);
  assert.ok(a[0].t < 1 && a.at(-1).t < SHOW_SECONDS && a.at(-1).t > SHOW_SECONDS - 1);
  for (const x of a) assert.ok(KINDS.includes(x.kind) && LIFE[x.kind] && RADIUS[x.kind] && x.barge >= 0 && x.barge < BARGES.length && (x.kind === 'fan' ? x.h < 10 : x.h > 25), JSON.stringify(x));
  const photo = a.filter((x) => x.t >= PHOTO_TIME[0] && x.t < PHOTO_TIME[1]);
  assert.ok(photo.length > 30 && photo.every((x) => x.kind === 'willow'), 'gold willows at photo time');
  const perMin = (t0) => a.filter((x) => x.t >= t0 && x.t < t0 + 60).length;
  assert.ok(perMin(1130) > 4 * perMin(30), `finale ${perMin(1130)}/min, opening ${perMin(30)}/min`);
  assert.ok(!a.some((x) => ['heart', 'star', 'smile'].includes(x.kind)), 'no hearts, stars or smiles: those are the drone show\'s');
});

test('barges in the river between the island and Hongdae; the night only around Yeouido', () => {
  assert.deepEqual(FW_ORIGIN, ORIGIN, 'the same frame as the island map');
  assert.deepEqual(FW_U, U);
  const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
  const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/yeouido.json', import.meta.url)));
  const inPoly = (x, z, p) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r; } return r; };
  for (const [u, v] of BARGES) {
    const [x, z] = atUV(u, v);
    assert.ok(inPoly(x, z, region.water[0].p), `barge at ${u},${v} floats on the Han`);
    assert.ok(map.landmarks.some((l) => l.type === 'fwbarge' && Math.hypot(l.x + ORIGIN[0] - x, l.z + ORIGIN[1] - z) < 0.5), 'its model is on the map');
  }
  const lawn = at(13, 20);
  assert.equal(nearYeouido(lawn[0] + ORIGIN[0], lawn[1] + ORIGIN[1]), 1, 'night on the lawn');
  assert.equal(nearYeouido(-2776.7, -16.7), 1, 'night at the bridge\'s Hongdae end');
  assert.equal(nearYeouido(-2977, -216), 0, 'day in the middle of Hongdae');
  assert.equal(nearYeouido(0, 0), 0, 'day in Seongsu');
  assert.equal(nearYeouido(...atUV(-300, 400)), 1, 'night on the south side of the island too');
});

test('volleys: now and then several shells burst at the same moment, across the barges', () => {
  const a = program(FW());
  const at = new Map();
  for (const x of a) if (x.kind !== 'fan') at.set(x.t, [...(at.get(x.t) || []), x]);
  const volleys = [...at.values()].filter((v) => v.length >= 3 && new Set(v.map((x) => x.barge)).size >= 2); // (a cluster is one barge)
  assert.ok(volleys.length > 150, `${volleys.length} volleys`);
  // (a sweep's later shells can land on the same moment as the next shot,
  // so now and then two kinds share one)
  assert.ok(volleys.filter((v) => v.every((x) => x.kind === v[0].kind)).length > volleys.length * 0.95, 'one kind per volley');
  const salvo = volleys.filter((v) => v[0].t >= 540 && v[0].t < 600);
  assert.ok(salvo.length > 30 && salvo.every((v) => v.length >= 5), 'the salvo is all volleys of 5 to 7');
  assert.ok(volleys.some((v) => v[0].t >= 1110 && v.length >= 7), 'big volleys in the finale');
});

test('rings are rare, no saturns; the basic peony leads the mix', () => {
  const c = {}; let n = 0;
  for (let d = 0; d < 12; d++) for (const b of program(1.8e12 + d * 6 * 3600e3)) { c[b.kind] = (c[b.kind] || 0) + 1; n++; }
  assert.ok((c.ring || 0) / n < 0.04 && !c.saturn, JSON.stringify(c));
  assert.ok(Object.entries(c).every(([k, v]) => k === 'peony' || k === 'fan' || v < c.peony), JSON.stringify(c));
});

test('built like a festival: stacked clusters, fans on the water, a beat every minute, a gold curtain to end', () => {
  const a = program(FW());
  const together = (x) => a.filter((y) => y.barge === x.barge && Math.abs(y.t - x.t) < 0.3 && y.kind !== 'fan').length;
  assert.ok(a.filter((x) => x.kind !== 'fan' && together(x) >= 2).length > a.length / 3, 'most shots come several at once from one barge');
  assert.ok(a.some((x) => x.kind === 'fan') && a.filter((x) => x.kind === 'fan').every((x) => x.h < 10), 'low fans on the barges');
  for (let t0 = 12; t0 < PHOTO_TIME[0] - 60; t0 += 60) assert.ok(a.some((x) => x.t >= t0 && x.t < t0 + 60 && x.kind === 'fan'), `a highlight with fans in the minute from ${t0} s`);
  const last = a.filter((x) => x.t >= 1191 && x.kind !== 'fan');
  assert.ok(last.length >= 14 && last.every((x) => x.kind === 'kamuro'), 'the gold curtain at the end');
  const high = a.filter((x) => x.h > 80).length;
  assert.ok(high > 100 && high < a.length / 5, `${high} high shells: now and then, not always`);
  const swept = a.filter((x, i) => x.kind !== 'fan' && i > 0 && a[i - 1].kind === x.kind && Math.abs(x.t - a[i - 1].t - 0.14) < 0.011).length;
  assert.ok(swept > 100, `${swept} shells in sweeps along the river`);
  assert.ok(a.slice(0, 3).every((x) => x.kind === 'willow') && new Set(a.slice(0, 3).map((x) => x.barge)).size === 3, 'curtain up: a willow from each barge');
});
