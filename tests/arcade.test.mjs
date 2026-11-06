import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PITCH_SPEEDS, flightTime, judgeSwing, hitDistance, battingTally, betterBatting,
  Gallery, GALLERY_ROWS, GALLERY_SHOTS, TARGETS,
  dartScore, dartAim, dartLand, RING, dartsMsg, parseDarts,
  loadRecords, saveRecord, RECORD_KEY,
} from '../src/core/arcade.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('batting: faster pitches arrive sooner; timing decides the hit', () => {
  assert.ok(flightTime(140) < flightTime(80));
  assert.ok(Math.abs(flightTime(100) - 0.664) < 0.01);
  assert.equal(judgeSwing(0.01), 'homerun');
  assert.equal(judgeSwing(-0.05), 'hit');
  assert.equal(judgeSwing(0.1), 'foul');
  assert.equal(judgeSwing(-0.3), 'strike');
  assert.ok(hitDistance('homerun', 0, () => 0) >= 100);
  assert.ok(hitDistance('hit', 0.07, () => 0) < 100);
  assert.equal(hitDistance('foul', 0.1), 0);
  assert.deepEqual(battingTally(['homerun', 'hit', 'foul', 'strike', 'hit']), { hr: 1, hits: 3 });
  assert.ok(betterBatting({ hr: 2, hits: 3 }, { hr: 1, hits: 9 }));
  assert.ok(!betterBatting({ hr: 1, hits: 3 }, { hr: 1, hits: 3 }));
  assert.deepEqual(PITCH_SPEEDS, [80, 100, 120, 140]);
});

test('gallery: a tap on a target pops it for points; misses still use a cork', () => {
  const g = new Gallery();
  const tg = g.targets.find((x) => x.kind === 'star');
  const p = g.at(tg, 2);
  assert.equal(g.shoot(p.x, p.y, 2), tg);
  assert.equal(g.score, TARGETS.star.points);
  assert.ok(!g.visible(tg, 2.5) && g.visible(tg, 4));
  assert.equal(g.shoot(p.x, 0.99, 2.1), null); // under the bottom row
  assert.equal(g.shots, GALLERY_SHOTS - 2);
  for (const row of GALLERY_ROWS) assert.ok(row.y > 0 && row.y < 1);
  while (g.shots) g.shoot(0, 0, 3);
  assert.equal(g.shoot(p.x, p.y, 9), null); // out of corks
});

test('darts: the standard board', () => {
  assert.equal(dartScore(0, 0).points, 50);
  assert.equal(dartScore(0.06, 0).points, 25);
  assert.deepEqual(dartScore(0, -0.3), { points: 20, label: '20' }); // straight up
  assert.equal(dartScore(0, -(RING.tripleIn + 0.01)).points, 60); // treble 20
  assert.equal(dartScore(0, 0.97).points, 6); // double 3, straight down
  assert.equal(dartScore(0.3, 0).label, '6'); // right
  assert.equal(dartScore(-0.3, 0).label, '11'); // left
  assert.equal(dartScore(1.1, 0).points, 0);
  for (let t = 0; t < 60; t += 0.37) { const a = dartAim(t); assert.ok(Math.hypot(a.x, a.y) < 0.95); }
  const l = dartLand({ x: 0, y: 0 }, () => 0.5);
  assert.ok(Math.hypot(l.x, l.y) <= 0.05);
});

test('darts with a friend: messages round-trip and junk is ignored', () => {
  assert.deepEqual(parseDarts(dartsMsg('ab-1', 's', 7, 140)), { to: 'ab-1', kind: 's', thrown: 7, total: 140 });
  assert.deepEqual(parseDarts(dartsMsg('ab-1', 'i')), { to: 'ab-1', kind: 'i', thrown: 0, total: 0 });
  assert.equal(parseDarts('darts:ab:x:0:0'), null);
  assert.equal(parseDarts('darts:ab:s:0:99999'), null);
  assert.equal(parseDarts('wave'), null);
});

test('records: only a better result is kept', () => {
  const s = memStore();
  assert.ok(saveRecord(s, 'darts', 120));
  assert.ok(!saveRecord(s, 'darts', 90));
  assert.ok(saveRecord(s, 'batting', { hr: 1, hits: 4 }, 100));
  assert.ok(!saveRecord(s, 'batting', { hr: 0, hits: 9 }, 100));
  assert.ok(saveRecord(s, 'batting', { hr: 0, hits: 2 }, 140)); // each speed has its own
  assert.deepEqual(loadRecords(s), { darts: 120, batting: { 100: { hr: 1, hits: 4 }, 140: { hr: 0, hits: 2 } } });
  s.setItem(RECORD_KEY, '{broken');
  assert.deepEqual(loadRecords(s), {});
});

test('no betting: the arcade games never touch the wallet', () => {
  for (const f of ['src/core/arcade.js', 'src/ui/batting-ui.js', 'src/ui/gallery-ui.js', 'src/ui/darts-ui.js']) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.ok(!/wallet|spend\(|coins?\b/i.test(src.replace(/^\/\/.*$/gm, '')), f);
  }
});

test('the batting cage, the gallery booth and the dartboard exist in the data', () => {
  const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url))).stores;
  assert.ok(stores.find((s) => s.workshop === 'batting'));
  assert.ok(stores.find((s) => s.id === 'bar-hush')?.darts);
  assert.ok(stores.find((s) => s.workshop === 'themepark'));
});
