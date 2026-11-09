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
  const mid = fireworksAt(start + 1800e3);
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
  assert.ok(a.length > 2000 && a.length < 6000, `${a.length} bursts`);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i].t >= a[i - 1].t, 'in time order');
    assert.ok(a[i].t - a[i - 1].t < 10, `no gap over 10 s (at ${a[i].t})`);
  }
  assert.ok(a[0].t < 1 && a.at(-1).t < SHOW_SECONDS && a.at(-1).t > SHOW_SECONDS - 1);
  for (const x of a) assert.ok(KINDS.includes(x.kind) && LIFE[x.kind] && RADIUS[x.kind] && x.barge >= 0 && x.barge < BARGES.length && x.h > 25, JSON.stringify(x));
  const photo = a.filter((x) => x.t >= PHOTO_TIME[0] && x.t < PHOTO_TIME[1]);
  assert.ok(photo.length > 30 && photo.every((x) => x.kind === 'willow'), 'gold willows at photo time');
  const perMin = (t0) => a.filter((x) => x.t >= t0 && x.t < t0 + 60).length;
  assert.ok(perMin(3480) > 4 * perMin(60), `finale ${perMin(3480)}/min, act 1 ${perMin(60)}/min`);
  for (const x of a.filter((y) => ['heart', 'star', 'smile'].includes(y.kind))) assert.ok(x.t >= 840, 'shapes come in act 2 and later');
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
  const lawn = at(-16, 20);
  assert.equal(nearYeouido(lawn[0] + ORIGIN[0], lawn[1] + ORIGIN[1]), 1, 'night on the lawn');
  assert.equal(nearYeouido(-2776.7, -16.7), 1, 'night at the bridge\'s Hongdae end');
  assert.equal(nearYeouido(-2977, -216), 0, 'day in the middle of Hongdae');
  assert.equal(nearYeouido(0, 0), 0, 'day in Seongsu');
  assert.equal(nearYeouido(...atUV(-200, 300)), 1, 'night on the south side of the island too');
});
