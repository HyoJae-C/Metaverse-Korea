import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FIREWORKS_HOURS_KST, SHOW_SECONDS, ALERT_SECONDS, DUSK_SECONDS, fireworksAt, nextFireworks, nightAt, program, PHOTO_TIME,
  KINDS, LIFE, RADIUS, BARGES, nearYeouido, atUV, ORIGIN as FW_ORIGIN, U as FW_U,
} from '../src/core/fireworks-show.js';
import { DRONE_SHOW_HOURS_KST } from '../src/core/drone-show.js';
import { ORIGIN, U, at } from '../scripts/build-yeouido.mjs';

const KST = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);

test('twice a day, at 9:00 and 21:00 Korean time, never near the drone show', () => {
  assert.deepEqual(FIREWORKS_HOURS_KST, [9, 21]);
  for (const f of FIREWORKS_HOURS_KST) for (const d of DRONE_SHOW_HOURS_KST) {
    const gap = Math.min(Math.abs(f - d), 24 - Math.abs(f - d));
    assert.ok(gap >= 3, `fireworks ${f}:00 and drones ${d}:00 are ${gap} h apart`);
  }
  const start = KST(2026, 11, 9, 21);
  assert.equal(fireworksAt(start - (ALERT_SECONDS + 5) * 1000), null, 'nothing before the notice');
  assert.equal(fireworksAt(start - ALERT_SECONDS * 1000 + 1000).start, start, 'the 10-minute notice');
  const mid = fireworksAt(start + 600e3);
  assert.ok(mid.on && mid.night === 1);
  assert.equal(fireworksAt(KST(2026, 11, 9, 15)), null, 'no show in the afternoon');
  assert.equal(nextFireworks(KST(2026, 11, 9, 10)), start);
  assert.equal(nextFireworks(KST(2026, 11, 9, 22, 30)), KST(2026, 11, 10, 9));
});

test('Yeouido\'s sky darkens before the show and brightens after it, smoothly', () => {
  assert.equal(nightAt(-DUSK_SECONDS - 1), 0);
  assert.equal(nightAt(0), 1);
  assert.equal(nightAt(SHOW_SECONDS + DUSK_SECONDS + 1), 0);
  let prev = 0;
  for (let t = -DUSK_SECONDS; t <= 0; t += 5) { const k = nightAt(t); assert.ok(k >= prev && k - prev < 0.08, `t ${t}`); prev = k; }
});

test('the program: the same for everyone, no long waits, a photo time and a finale', () => {
  const start = KST(2026, 11, 9, 21);
  const a = program(start), b = JSON.parse(JSON.stringify(program(start)));
  assert.deepEqual(a, b, 'one program per show');
  assert.notDeepEqual(program(KST(2026, 11, 10, 9)).slice(0, 5), a.slice(0, 5), 'each show is a little different');
  assert.ok(a.length > 1500 && a.length < 5000, `${a.length} bursts`);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i].t >= a[i - 1].t, 'in time order');
    assert.ok(a[i].t - a[i - 1].t < 2.5, `no gap over 2.5 s (at ${a[i].t})`);
  }
  assert.equal(SHOW_SECONDS, 1200, '20 minutes');
  for (const k of KINDS) assert.ok(a.some((x) => x.kind === k), `${k} comes up`);
  assert.ok(a[0].t < 1 && a.at(-1).t < SHOW_SECONDS && a.at(-1).t > SHOW_SECONDS - 1);
  for (const x of a) assert.ok(KINDS.includes(x.kind) && LIFE[x.kind] && RADIUS[x.kind] && x.barge >= 0 && x.barge < BARGES.length && x.h > 25, JSON.stringify(x));
  const photo = a.filter((x) => x.t >= PHOTO_TIME[0] && x.t < PHOTO_TIME[1]);
  assert.ok(photo.length > 30 && photo.every((x) => x.kind === 'willow'), 'gold willows at photo time');
  const perMin = (t0) => a.filter((x) => x.t >= t0 && x.t < t0 + 60).length;
  assert.ok(perMin(1130) > 4 * perMin(30), `finale ${perMin(1130)}/min, opening ${perMin(30)}/min`);
  for (const x of a.filter((y) => ['heart', 'star', 'smile'].includes(y.kind))) assert.ok(x.t >= 150, 'shapes come after the opening');
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

test('operators can move the fireworks; the drones and the fountain keep clear', async () => {
  const fw = await import('../src/core/fireworks-show.js');
  const { DRONE_SPAN } = await import('../src/core/drone-show.js');
  const { timesOverlap, clockText } = await import('../src/core/show-clock.js');
  const fountain = await import('../src/core/rainbow-fountain.js');
  assert.equal(fw.checkFireworksTimes([540, 590]).error, 'close', 'at least an hour apart');
  assert.deepEqual(fw.checkFireworksTimes([1230]), { minutes: [1230] });
  // The defaults never overlap; a drone show 33 minutes before is fine, 32 is not.
  const defaults = (h) => h.map((x) => x * 60);
  assert.equal(timesOverlap(defaults(DRONE_SHOW_HOURS_KST), DRONE_SPAN, defaults(FIREWORKS_HOURS_KST), fw.FIREWORKS_SPAN), false);
  assert.equal(timesOverlap([507], DRONE_SPAN, [540], fw.FIREWORKS_SPAN), false);
  assert.equal(timesOverlap([508], DRONE_SPAN, [540], fw.FIREWORKS_SPAN), true);
  assert.equal(timesOverlap([573], DRONE_SPAN, [540], fw.FIREWORKS_SPAN), false);
  assert.equal(timesOverlap([572], DRONE_SPAN, [540], fw.FIREWORKS_SPAN), true);
  assert.equal(timesOverlap([1430], DRONE_SPAN, [20], fw.FIREWORKS_SPAN), true, 'round midnight too');
  assert.equal(clockText(1230), '20:30');
  try {
    fw.setFireworksTimes([1230]); // 20:30
    assert.equal(fireworksAt(KST(2026, 11, 9, 20, 40)).start, KST(2026, 11, 9, 20, 30));
    assert.equal(fireworksAt(KST(2026, 11, 9, 9, 10)), null, 'no morning show');
    assert.deepEqual(fountain.skipHours(), [20], 'the fountain sits out 20:30');
    assert.ok(!fountain.fountainAt(KST(2026, 11, 9, 20, 40))?.on);
    assert.ok(fountain.fountainAt(KST(2026, 11, 9, 9, 40))?.on, 'and plays at 9:30 again');
  } finally {
    fw.setFireworksTimes(null);
  }
  assert.deepEqual(fountain.skipHours(), []);
});

test('volleys: now and then several shells burst at the same moment, across the barges', () => {
  const a = program(KST(2026, 11, 9, 21));
  const at = new Map();
  for (const x of a) at.set(x.t, [...(at.get(x.t) || []), x]);
  const volleys = [...at.values()].filter((v) => v.length >= 3);
  assert.ok(volleys.length > 150, `${volleys.length} volleys`);
  for (const v of volleys) {
    assert.ok(v.every((x) => x.kind === v[0].kind), 'one kind per volley');
    assert.ok(new Set(v.map((x) => x.barge)).size >= 2, 'from more than one barge');
  }
  const salvo = volleys.filter((v) => v[0].t >= 540 && v[0].t < 600);
  assert.ok(salvo.length > 30 && salvo.every((v) => v.length >= 5), 'the salvo is all volleys of 5 to 7');
  assert.ok(volleys.some((v) => v[0].t >= 1110 && v.length >= 7), 'big volleys in the finale');
});
