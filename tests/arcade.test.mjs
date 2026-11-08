import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PITCH_SPEEDS, flightTime, judgeSwing, hitDistance, battingTally, betterBatting,
  Gallery, GALLERY_ROWS, GALLERY_SHOTS, TARGETS,
  dartScore, dartAim, dartLand, RING, dartsMsg, parseDarts,
  dartPack, dartUnpack, swayPack, swayUnpack, challengerThrows, DART_SECONDS, DARTS_EACH,
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
  assert.deepEqual(parseDarts(dartsMsg('ab-1', 't', 7, 1400)), { to: 'ab-1', kind: 't', thrown: 7, total: 1400, extra: null });
  assert.deepEqual(parseDarts(dartsMsg('ab-1', 'i')), { to: 'ab-1', kind: 'i', thrown: 0, total: 0, extra: null });
  assert.deepEqual(parseDarts(dartsMsg('ab-1', 'h', 19, 2000, 3999)), { to: 'ab-1', kind: 'h', thrown: 19, total: 2000, extra: 3999 });
  assert.equal(parseDarts('darts:ab:q:0:0'), null);
  assert.equal(parseDarts('darts:ab:h:0:99999'), null);
  assert.equal(parseDarts('darts:ab:h:0:1:99999'), null);
  assert.equal(parseDarts('wave'), null);
});

test('darts with a friend: turns, 10 each, 7 seconds, and the same dart on both screens', () => {
  assert.equal(DART_SECONDS, 7);
  assert.equal(DARTS_EACH, 10);
  // The challenger throws darts 0, 2, 4 ... and the friend 1, 3, 5 ...
  const mine = [...Array(DARTS_EACH * 2).keys()].filter(challengerThrows);
  assert.deepEqual(mine, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  for (const v of [-1.234567, 0, 0.0371, 0.999, 1.5]) {
    const back = dartUnpack(dartPack(v));
    assert.ok(Math.abs(back - v) <= 0.0005, String(v));
    assert.equal(dartPack(back), dartPack(v)); // rounded once, stays put
  }
  assert.equal(dartUnpack(dartPack(9)), 2); // clamped, still fits the message
  assert.ok(parseDarts(dartsMsg('a', 'h', 3, dartPack(-9), dartPack(9))));
  for (const s of [0, 3.3333, 19.99]) assert.ok(Math.abs(swayUnpack(swayPack(s)) - s) <= 0.001);
  assert.ok(parseDarts(dartsMsg('a', 't', 0, swayPack(19.99))));
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
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  assert.ok(stores.find((s) => s.workshop === 'batting'));
  assert.ok(stores.find((s) => s.id === 'bar-hush')?.darts);
  assert.ok(stores.find((s) => s.workshop === 'themepark'));
});

test('balloon booth medals: gold wins the small teddy bear, a plush for your home', async () => {
  const { galleryMedal, GALLERY_MEDALS, GALLERY_GOLD_PRIZE, TARGETS: TG, GALLERY_SHOTS: N } = await import('../src/core/arcade.js');
  const { ITEMS } = await import('../src/core/inventory.js');
  assert.equal(galleryMedal(0), null);
  assert.equal(galleryMedal(149), null);
  assert.equal(galleryMedal(150), 'bronze');
  assert.equal(galleryMedal(250), 'silver');
  assert.equal(galleryMedal(349), 'silver');
  assert.equal(galleryMedal(350), 'gold');
  // Gold is reachable with the corks you have, but needs more than balloons and ducks.
  assert.ok(GALLERY_MEDALS[0][1] <= N * TG.star.points);
  assert.ok(GALLERY_MEDALS[0][1] > N * TG.duck.points);
  assert.ok(ITEMS[GALLERY_GOLD_PRIZE]?.plush);
  assert.equal(ITEMS[GALLERY_GOLD_PRIZE].name.ko, '작은 곰인형');
});
