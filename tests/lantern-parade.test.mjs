import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paradeAt, nextParade, paradeRoutes, paradeState, along, yardSpot, figureLitAt, SHOW_SECONDS, ALERT_SECONDS, ROWS, PER_ROW, FLOATS } from '../src/core/lantern-parade.js';
import { fireworksAt } from '../src/core/fireworks-show.js';
import { droneShowAt } from '../src/core/drone-show.js';
import { streamAt, frameOf } from '../src/core/stream.js';
import { JOGYESA as J } from '../src/data/jogyesa.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url), 'utf8'));
const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url), 'utf8'));
const off = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const s0 = map.streams.find((s) => s.id === 'cheonggyecheon');
const stream = { ...s0, at: [s0.at[0] + off[0], s0.at[1] + off[1]] };
const R = paradeRoutes(stream, off);
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const local = (w) => [w.x - off[0], w.z - off[1]];

test('once a day, 20:10 KST, every day', () => {
  const start = nextParade(Date.UTC(2026, 10, 12));
  assert.ok(paradeAt(start - ALERT_SECONDS * 1000 + 1000), 'the notice window');
  assert.equal(paradeAt(start - (ALERT_SECONDS + 5) * 1000), null);
  assert.ok(paradeAt(start + 60e3).on);
  assert.equal(fireworksAt(start + 60e3), null);
  assert.equal(droneShowAt(start + 60e3), null);
  assert.equal(nextParade(start + 1000) - start, 24 * 3600e3, 'once a day');
  assert.equal(new Date(start).toISOString().slice(11, 16), '11:10', '20:10 KST');
});

test('the column waits down on the Cheonggyecheon walkway, then climbs out', () => {
  const S = paradeState(R, off, -30);
  assert.equal(S.walkers.length, ROWS * PER_ROW);
  for (const w of S.walkers) {
    const at = streamAt([stream], w.x, w.z, true);
    assert.ok(at && at.low && w.y === -(stream.depth || 4), `down by the water: ${local(w)}`);
  }
  // Up the stairs: somewhere the way goes from the water to the street.
  const ys = R.walkers.pts.map((q) => q.p[1]);
  assert.ok(ys[0] < 0 && ys.at(-1) === 0);
});

test('the walk misses Bosingak and the gate\'s side bays, and ends inside Iljumun', () => {
  const avoid = map.blockers.filter((b) => /Bosingak|Iljumun/.test(b.why || ''));
  assert.ok(avoid.length >= 3);
  for (let s = 0; s < R.walkers.len; s += 0.5) {
    const [x, , z] = along(R.walkers, s), [lx, lz] = [x - off[0], z - off[1]];
    for (const b of avoid) assert.ok(!inPoly(lx, lz, b.p), `${b.why} at ${lx.toFixed(1)},${lz.toFixed(1)}`);
  }
  const [ex, , ez] = along(R.walkers, R.walkers.len);
  assert.ok(ex - off[0] < J.iljumun.x && Math.abs(ez - off[1] - J.iljumun.z) < 1);
});

test('everyone is in the yard well before the end, on free spots under the canopy', () => {
  const S = paradeState(R, off, SHOW_SECONDS - 300);
  const solid = map.blockers.filter((b) => b.jg).map((b) => b.p);
  S.walkers.forEach((w, i) => {
    const [x, z] = local(w), [sx, sz] = yardSpot(i);
    assert.ok(Math.hypot(x - sx, z - sz) < 0.01, `walker ${i} at its spot`);
    assert.ok(x > J.canopy.x0 && x < J.canopy.x1 && z > J.canopy.z0 - 1 && z < J.canopy.z1 + 2, 'under the canopy');
    for (const p of solid) assert.ok(!inPoly(x, z, p), `walker ${i} in a blocker`);
  });
  assert.ok(paradeState(R, off, SHOW_SECONDS * 0.6).lead <= 0, 'the first row is in by 12 minutes');
});

test('the floats queue on Ujeongguk-ro beside the walkers, not on them', () => {
  const S = paradeState(R, off, SHOW_SECONDS - 60);
  assert.equal(S.floats.length, FLOATS.length);
  S.floats.forEach((f, i) => {
    const [x, z] = local(f);
    assert.ok(Math.abs(x - J.road.x) < J.road.w / 2, `float ${i} on the road`);
    assert.ok(z > J.iljumun.z, 'south of the gate');
    if (i) assert.ok(Math.hypot(f.x - S.floats[i - 1].x, f.z - S.floats[i - 1].z) > 5, 'room between floats');
  });
  for (let t = 300; t < SHOW_SECONDS; t += 20) {
    const T = paradeState(R, off, t);
    for (const f of T.floats) for (const w of T.walkers) assert.ok(Math.hypot(f.x - w.x, f.z - w.z) > 1.6, `float on a walker at t ${t}`);
  }
});

test('twelve marchers; each Cheonggyecheon figure lights up as the first row passes it', () => {
  assert.equal(ROWS * PER_ROW, 12);
  const F = frameOf(stream);
  for (const f of s0.lanterns.figures) {
    const t = figureLitAt(f.u);
    assert.ok(t > 0 && t < SHOW_SECONDS * 0.5, `figure at u ${f.u} lit at ${t.toFixed(0)} s`);
    if (f.u < 113.5) continue; // (west of the stairs: the light runs on along the water)
    const lead = paradeState(R, off, t).walkers[0], [u] = F.toStream(lead.x, lead.z);
    assert.ok(Math.abs(u - f.u) < 3, `the first row at u ${u.toFixed(1)} when the figure at u ${f.u} lights`);
  }
});
