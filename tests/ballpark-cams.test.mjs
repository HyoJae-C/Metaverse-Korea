import { test } from 'node:test';
import assert from 'node:assert/strict';
import { camsOf, camAt, waveAt, waveGap, seatPairs, pickPair, pickOne, parseBp, bpMsg, KissCam, CAMS } from '../src/core/ballpark-cams.js';
import { playGame, gameAt, GAME_CYCLE, GAME_LEN, OUTRO } from '../src/core/ballgame.js';

test('every game has the wave, then the Dance Cam, then the Kiss Cam, before the final score', () => {
  for (let k = 0; k < 200; k++) {
    const cams = camsOf(playGame(k));
    assert.deepEqual(cams.map((c) => c.kind), ['wave', 'dance', 'kiss']);
    for (let i = 0; i < cams.length; i++) {
      const c = cams[i];
      assert.equal(c.dur, CAMS[c.kind].dur);
      assert.ok(c.t0 + c.dur <= GAME_LEN - OUTRO + 1e-6, `game ${k} ${c.kind} ends before the final score`);
      if (i) assert.ok(c.t0 >= cams[i - 1].t0 + cams[i - 1].dur, `game ${k}: never two at once`);
    }
  }
});

test('camAt follows the clock: the same moment for everyone, nothing between games', () => {
  const k = 4321, base = k * GAME_CYCLE;
  const kiss = camsOf(playGame(k)).find((c) => c.kind === 'kiss');
  const on = camAt(gameAt(base + kiss.t0 + 1));
  assert.equal(on.kind, 'kiss');
  assert.equal(on.k, k);
  assert.ok(on.u > 0 && on.u < 0.2);
  assert.equal(camAt(gameAt(base + kiss.t0 + kiss.dur + 0.5))?.kind ?? null, null);
  assert.equal(camAt(gameAt(base + GAME_LEN + 10)), null, 'between games');
  assert.equal(camAt(gameAt(base + 2)), null, 'before the first pitch');
});

test('the wave goes round the bowl and builds up and dies down', () => {
  const st = (u) => waveAt({ kind: 'wave', u });
  assert.equal(st(0).strength, 0);
  assert.equal(st(0.5).strength, 1);
  assert.ok(st(0.99).strength < 0.1);
  assert.ok(waveGap(st(0.25).angle, st(0.25).angle) < 1e-9);
  assert.ok(Math.abs(waveGap(0, Math.PI) - Math.PI) < 1e-9);
  assert.ok(waveGap(Math.PI - 0.1, -Math.PI + 0.1) < 0.21, 'wraps round');
  assert.equal(waveAt(null).strength, 0);
});

test('a Kiss Cam pair is two people side by side in one row', () => {
  const people = [
    { id: 'a', x: 0, z: 40, row: 2 }, { id: 'b', x: 0.95, z: 40, row: 2 }, // next to each other
    { id: 'c', x: 3, z: 40, row: 2 }, // three seats away
    { id: 'd', x: 0, z: 41.3, row: 3 }, // the row behind a
  ];
  const pairs = seatPairs(people);
  assert.deepEqual(pairs.map(([p, q]) => p.id + q.id), ['ab']);
  assert.deepEqual(pickPair(people, 7).map((p) => p.id), ['a', 'b']);
  assert.equal(pickPair([people[0], people[2]], 7), null, 'nobody side by side');
});

test('every screen picks the same pair and the same dancer, whatever order it lists people in', () => {
  const people = [];
  for (let i = 0; i < 12; i++) people.push({ id: 'p' + i, x: i * 0.95, z: 40, row: 0 });
  for (let k = 0; k < 30; k++) {
    const a = pickPair(people, k), b = pickPair([...people].reverse(), k);
    assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id));
    assert.equal(pickOne(people, k).id, pickOne([...people].reverse(), k).id);
  }
  const chosen = new Set(Array.from({ length: 40 }, (_, k) => pickPair(people, k)[0].id));
  assert.ok(chosen.size > 4, 'different games pick different pairs');
});

test('messages', () => {
  assert.deepEqual(parseBp(bpMsg('k', 'user-1')), { kind: 'k', to: 'user-1' });
  assert.deepEqual(parseBp(bpMsg('n', 'x')), { kind: 'n', to: 'x' });
  assert.deepEqual(parseBp(bpMsg('d')), { kind: 'd', to: null });
  assert.deepEqual(parseBp(bpMsg('w')), { kind: 'w', to: null });
  for (const bad of ['bp:k', 'bp:d:x', 'bp:k:a b', 'bp:z:x', 'hi5:x', 'bp:k:' + 'x'.repeat(65)]) assert.equal(parseBp(bad), null, bad);
});

test('a cheek kiss only when both press it', () => {
  const kc = new KissCam(1);
  assert.equal(kc.add('a', 'b', 'k'), null, 'one asks');
  assert.ok(kc.asked('a', 'b'));
  assert.ok(!kc.asked('b', 'a'));
  assert.deepEqual(kc.add('b', 'a', 'k'), { what: 'kiss' }, 'the other kisses back');
  assert.equal(kc.add('a', 'b', 'k'), null, 'once per pair');
  assert.deepEqual(kc.outcome('b', 'a'), { what: 'kiss' });
  assert.deepEqual(kc.end(), [], 'nothing left open');
});

test('saying no leaves the one who asked sheepish', () => {
  const kc = new KissCam(1);
  kc.add('a', 'b', 'k');
  assert.deepEqual(kc.add('b', 'a', 'n'), { what: 'no', shy: 'a', by: 'b' });
  assert.equal(kc.add('b', 'a', 'k'), null, 'too late to change your mind');
  assert.ok(!kc.asked('a', 'b'));
  // No before anyone asked: the other one is turned down all the same.
  const kc2 = new KissCam(2);
  assert.deepEqual(kc2.add('c', 'd', 'n'), { what: 'no', shy: 'd', by: 'c' });
});

test('an ask nobody answers is a no when the Kiss Cam ends', () => {
  const kc = new KissCam(1);
  kc.add('a', 'b', 'k');
  kc.add('c', 'd', 'k'); kc.add('d', 'c', 'k');
  assert.deepEqual(kc.end(), [{ what: 'no', shy: 'a', by: null, other: 'b' }]);
  assert.deepEqual(kc.end(), [], 'once');
});

test('clapping along: each beat once, only near it', async () => {
  const { clapAt, CLAP_BEATS, CLAP_WINDOW } = await import('../src/core/ballpark-cams.js');
  assert.equal(clapAt(CLAP_BEATS[0]), 0);
  assert.equal(clapAt(CLAP_BEATS[2] + CLAP_WINDOW * 0.9), 2);
  assert.equal(clapAt(CLAP_BEATS[0], [0]), -1, 'a beat counts once');
  assert.equal(clapAt(0.2), -1, 'too early');
  assert.equal(clapAt(5), -1, 'too late');
});

test('foul balls: a few a game, the same everywhere, onto a free seat', async () => {
  const { foulsOf, foulAt, FOUL_T } = await import('../src/core/ballpark-cams.js');
  let n = 0;
  for (let k = 0; k < 200; k++) {
    const g = playGame(k), fs = foulsOf(g, 400);
    n += fs.length;
    assert.deepEqual(foulsOf(g, 400), fs);
    for (const f of fs) {
      assert.ok(f.seat >= 0 && f.seat < 400);
      assert.ok(f.t0 + FOUL_T < GAME_LEN);
      assert.equal(foulAt(g, 400, f.t0 + 1).seat, f.seat);
    }
  }
  assert.ok(n / 200 > 1.5 && n / 200 < 6, `about 3 a game (${n / 200})`);
  assert.deepEqual(foulsOf(playGame(1), 0), [], 'no seats, no foul balls');
});
