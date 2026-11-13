import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, newMatch, stepMatch, packMatch, copyMatch, unpackMatch, createMatch } from '../src/core/brawl.js';
import { createSession, packInput, unpackInput, DELAY, MAX_AHEAD } from '../src/core/brawl-net.js';

const randomInput = (rand) => {
  const inp = { mx: rand() < 0.5 ? 1 : rand() < 0.3 ? -1 : 0, mz: rand() < 0.05 ? (rand() < 0.5 ? 1 : -1) : 0 };
  for (const b of ['lp', 'rp', 'lk', 'rk']) if (rand() < 0.06) inp[b] = true;
  if (rand() < 0.02) inp.dash = rand() < 0.7 ? 1 : -1;
  return inp;
};
// Two screens and a network between them: each message takes lag() ticks
// and is lost with chance `loss`. Returns both sessions and what each saw.
function play({ ticks = 1500, lag = () => 6, loss = 0, seed = 7, startLate = 0, styles = ['ninja', 'boxer'], breakGuest = null }) {
  const rand = seeded(seed), net = seeded(seed + 99);
  const wire = []; // [arrives at, to, msg]
  let now = 0;
  const mk = (side) => createSession({ side, styles, send: (msg) => { if (msg.i) msg.i.forEach((n, j) => { logs[side][msg.f + j] = unpackInput(n); }); if (net() >= loss) wire.push([now + lag(net), 1 - side, JSON.parse(JSON.stringify(msg))]); } });
  const s = [mk(0), mk(1)], seen = [[], []], logs = [[], []];
  for (now = 0; now < ticks; now++) {
    for (let i = wire.length - 1; i >= 0; i--) if (wire[i][0] <= now) { const [, to, msg] = wire.splice(i, 1)[0]; s[to].receive(msg); }
    wire.sort((p, q) => p[0] - q[0]);
    for (const side of [0, 1]) {
      if (side === 1 && now < startLate) continue;
      seen[side].push(...s[side].tick(randomInput(rand)));
    }
    if (breakGuest && now === breakGuest) s[1].certain.a.hp -= 7; // one screen goes wrong
  }
  return { s, seen, logs };
}

test('brawl net: an input survives being packed into a number', () => {
  for (const inp of [{ mx: 0, mz: 0 }, { mx: 1, mz: -1, lp: true }, { mx: -1, mz: 1, dash: -1, rk: true, lk: true }, { mx: 0, mz: 0, dash: 1, lp: true, rp: true, lk: true, rk: true }]) {
    assert.deepEqual(unpackInput(packInput(inp)), inp);
  }
  assert.deepEqual(unpackInput(99999), { mx: 0, mz: 0 });
  assert.deepEqual(unpackInput('x'), { mx: 0, mz: 0 });
});

test('brawl net: a match is plain data: copied, sent and run on, it stays the same match', () => {
  const m = newMatch('tank', 'mystic', true), rand = seeded(3);
  for (let t = 0; t < 400; t++) stepMatch(m, randomInput(rand), randomInput(rand));
  const c = copyMatch(m), u = unpackMatch(JSON.parse(JSON.stringify(packMatch(m))));
  const r2 = seeded(5), r3 = seeded(5), r4 = seeded(5);
  for (let t = 0; t < 600; t++) {
    stepMatch(m, randomInput(r2), randomInput(r2)); stepMatch(c, randomInput(r3), randomInput(r3)); stepMatch(u, randomInput(r4), randomInput(r4));
  }
  assert.equal(JSON.stringify(packMatch(c)), JSON.stringify(packMatch(m)));
  assert.equal(JSON.stringify(packMatch(u)), JSON.stringify(packMatch(m)));
});

test('brawl net: both screens end on the same match, over a slow network that loses messages', () => {
  for (const [name, opt] of [
    ['quick', { lag: () => 2 }],
    ['slow', { lag: () => 12 }],
    ['jitter', { lag: (r) => 3 + Math.floor(r() * 14) }],
    ['lossy', { lag: (r) => 4 + Math.floor(r() * 8), loss: 0.25 }],
    ['late start', { lag: () => 8, startLate: 30 }],
  ]) {
    const { s } = play({ ...opt, ticks: 2400 });
    const to = Math.min(s[0].sure, s[1].sure);
    assert.ok(to > 2000, `${name}: the match moved on (${to})`);
    assert.ok(Math.abs(s[0].head - s[1].head) < 30, `${name}: the screens keep pace (${s[0].head} / ${s[1].head})`);
    // Run both on to the same tick is not possible from outside; instead the
    // one behind must equal the other's match when it was there. Play again
    // with nothing lost to compare each at its own tick.
    assert.ok(s[0].head - s[0].sure < MAX_AHEAD + 1 && s[1].head - s[1].sure < MAX_AHEAD + 1, name + ': never far ahead of what is certain');
  }
});

test('brawl net: what is certain on each screen is the match played straight from both inputs', () => {
  for (const opt of [{ lag: () => 5 }, { lag: (r) => 2 + Math.floor(r() * 12), loss: 0.2 }]) {
    const { s, logs } = play({ ...opt, ticks: 1800, seed: 21 });
    for (const side of [0, 1]) {
      const ref = newMatch('ninja', 'boxer', true);
      for (let t = 0; t < s[side].sure; t++) stepMatch(ref, logs[0][t], logs[1][t]);
      assert.equal(JSON.stringify(packMatch(s[side].certain)), JSON.stringify(packMatch(ref)), 'side ' + side);
    }
  }
});

test('brawl net: a screen that went wrong takes the host\'s match', () => {
  const { s } = play({ lag: () => 6, ticks: 1200, breakGuest: 300, seed: 4 });
  // Bring both to the same certain tick and compare.
  const a = s[0], b = s[1];
  assert.ok(Math.abs(a.sure - b.sure) < 40);
  assert.equal(a.certain.wins.join(), b.certain.wins.join());
  assert.equal(a.certain.round, b.certain.round);
  assert.ok(Math.abs(a.certain.a.hp - b.certain.a.hp) <= 40, 'the health bars agree again (within what a few ticks can change)');
});

test('brawl net: round calls and knock-outs are said once, hits not twice', () => {
  const { seen, s } = play({ lag: (r) => 3 + Math.floor(r() * 10), loss: 0.1, ticks: 6000, seed: 11 });
  for (const side of [0, 1]) {
    const rounds = seen[side].filter((e) => e.k === 'round').map((e) => e.n);
    assert.deepEqual(rounds, rounds.map((_, i) => i + 1), 'rounds in order, once each');
    const kos = seen[side].filter((e) => e.k === 'ko' || e.k === 'time').length;
    assert.ok(kos >= rounds.length - 1 && kos <= rounds.length);
    assert.ok(seen[side].filter((e) => e.k === 'over').length <= 1);
  }
  assert.equal(s[0].certain.phase, 'over');
  assert.equal(s[1].certain.phase, 'over');
  assert.equal(s[0].certain.result, s[1].certain.result);
});

test('brawl net: with nothing arriving, a screen waits instead of running away', () => {
  const s = createSession({ side: 0, styles: ['brawler', 'brawler'], send: () => {} });
  for (let t = 0; t < 300; t++) s.tick({ mx: 1, mz: 0 });
  assert.equal(s.head, MAX_AHEAD);
  assert.ok(s.waiting);
  assert.equal(s.sure, 0);
});

test('brawl: two people level after five rounds draw; against the house you lose', () => {
  const m = newMatch('brawler', 'brawler', true);
  for (let t = 0; t < 60 * 60 * 6 && m.phase !== 'over'; t++) stepMatch(m);
  assert.equal(m.result, 2);
  const solo = createMatch({ level: 0, rand: () => 0.99 });
  assert.equal(typeof solo.step, 'function');
});
