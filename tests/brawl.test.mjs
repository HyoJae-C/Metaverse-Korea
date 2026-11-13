import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVES, moveTicks, newFighter, stepFight, createMatch, createAi, seeded, RING_R, MAX_HP, ROUNDS_TO_WIN, RIVALS, AI_LEVELS, loadBrawl, afterMatch, BRAWL_KEY } from '../src/core/brawl.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const pair = (gap = 0.8) => { const a = newFighter(0), b = newFighter(1); a.x = -gap / 2; b.x = gap / 2; return [a, b]; };
// Run until nothing more happens for a while; all the events.
const run = (a, b, ia = [], ib = [], ticks = 120) => {
  const ev = [];
  for (let t = 0; t < ticks; t++) ev.push(...stepFight(a, b, ia[t] || ia.hold || {}, ib[t] || ib.hold || {}));
  return ev;
};

test('brawl: every move reaches a fighter standing close, and the heavier the slower', () => {
  for (const [id, m] of Object.entries(MOVES)) {
    const [a, b] = pair();
    const press = id === 'palm' ? { lp: true, rp: true } : id === 'fly' ? { lk: true, rk: true } : id === 'upper' ? { rp: true, mx: 1 } : { [id]: true };
    const ev = run(a, b, [press], [], moveTicks(m) + 80);
    assert.ok(ev.some((e) => e.k === 'hit' && e.move === id), id + ' hits');
    assert.ok(b.hp < MAX_HP, id + ' hurts');
    assert.equal(a.st, 'idle', id + ' ends');
  }
  assert.ok(MOVES.lp.startup < MOVES.rp.startup && MOVES.rp.startup < MOVES.lk.startup && MOVES.lk.startup < MOVES.rk.startup);
  assert.ok(MOVES.lp.dmg < MOVES.rp.dmg && MOVES.rp.dmg < MOVES.lk.dmg && MOVES.lk.dmg < MOVES.rk.dmg);
});

test('brawl: a punch from too far away misses', () => {
  const [a, b] = pair(2.4);
  const ev = run(a, b, [{ lp: true }]);
  assert.ok(!ev.some((e) => e.k === 'hit'));
  assert.equal(b.hp, MAX_HP);
});

test('brawl: holding away guards everything but the two-hand push', () => {
  for (const id of ['lp', 'rp', 'lk', 'rk']) {
    const [a, b] = pair();
    const ev = run(a, b, [{ [id]: true }], { hold: { mx: -1 } }, 30);
    assert.ok(ev.some((e) => e.k === 'block'), id + ' is guarded');
    assert.equal(b.hp, MAX_HP);
  }
  const [a, b] = pair();
  b.x = RING_R - 0.34; a.x = b.x - 0.8; // their back to the edge: nowhere to walk away to
  run(a, b, [{ lp: true, rp: true }], { hold: { mx: -1 } }, 60);
  assert.ok(b.hp < MAX_HP, 'the push goes through a guard');
});

test('brawl: the second button a moment late still makes the special', () => {
  const [a, b] = pair();
  const ev = run(a, b, [{ lk: true }, {}, { rk: true }], [], 120);
  assert.ok(ev.some((e) => e.k === 'hit' && e.move === 'fly'));
});

test('brawl: a side-step slips a straight punch, but not the roundhouse', () => {
  const [a, b] = pair(0.95);
  const ev = run(a, b, [{ rp: true }], [{ mz: 1 }, { mz: 1 }], 40);
  assert.ok(!ev.some((e) => e.k === 'hit'), 'the straight misses');
  const [c, d] = pair(0.95);
  const ev2 = run(c, d, [{ rk: true }], [{}, {}, {}, {}, { mz: 1 }], 60);
  assert.ok(ev2.some((e) => e.k === 'hit' && e.move === 'rk'), 'the roundhouse follows');
});

test('brawl: light hits chain into heavier ones, never back down', () => {
  const [a, b] = pair();
  const ia = []; ia[0] = { lp: true };
  ia[12] = { rp: true }; ia[30] = { rk: true }; ia[60] = { lp: true }; // (the jab after the roundhouse is a new move, not a chain)
  const ev = run(a, b, ia, [], 160).filter((e) => e.k === 'hit');
  assert.deepEqual(ev.slice(0, 3).map((e) => e.move), ['lp', 'rp', 'rk']);
  assert.equal(ev[2].combo, 3);
  const [c, d] = pair();
  const ic = []; ic[0] = { rk: true };
  for (let t = 20; t < 40; t += 2) ic[t] = { lp: true };
  const first = run(c, d, ic, [], 30).filter((e) => e.k === 'hit');
  assert.equal(first.length, 1, 'no jab cancels a roundhouse');
});

test('brawl: the launcher lifts them, hits in the air count for less, then they get up', () => {
  const [a, b] = pair();
  const ia = []; ia[0] = { rp: true, mx: 1 }; ia.hold = { mx: 1 }; // (walk in under them)
  for (let t = 36; t < 110; t += 3) ia[t] = { lp: true };
  const ev = run(a, b, ia, [], 110);
  const hits = ev.filter((e) => e.k === 'hit');
  assert.ok(hits[0].launch, 'launched');
  const air = hits.filter((e) => e.air);
  assert.ok(air.length >= 1 && air.length <= 3, `${air.length} hits in the air`);
  assert.ok(air[0].dmg < MOVES.lp.dmg, 'a juggle hit is weaker');
  run(a, b, [], [], 200);
  assert.equal(b.st, 'idle');
  assert.equal(b.y, 0);
});

test('brawl: nobody can be hit lying down, and nobody leaves the ring or overlaps', () => {
  const [a, b] = pair();
  run(a, b, [{ rk: true }], [], 50);
  assert.ok(['air', 'down'].includes(b.st));
  while (b.st !== 'down') stepFight(a, b);
  const hp = b.hp;
  const ev = run(a, b, [{ lp: true }], [], 12);
  assert.ok(!ev.some((e) => e.k === 'hit'));
  assert.equal(b.hp, hp);
  const [c, d] = pair();
  run(c, d, { hold: { mx: 1 } }, { hold: { mx: -1 } }, 600);
  assert.ok(Math.hypot(d.x, d.z) <= RING_R + 1e-9 && Math.hypot(c.x, c.z) <= RING_R + 1e-9);
  assert.ok(Math.hypot(d.x - c.x, d.z - c.z) >= 0.67);
});

test('brawl: low on health hits harder; hitting a swing in its startup is a counter', () => {
  const [a, b] = pair(); a.rage = true;
  const ev = run(a, b, [{ lk: true }], [], 40);
  assert.equal(ev.find((e) => e.k === 'hit').dmg, Math.round(MOVES.lk.dmg * 1.2));
  const [c, d] = pair();
  const ev2 = run(c, d, [{ lp: true }], [{ rk: true }], 40);
  const h = ev2.find((e) => e.k === 'hit');
  assert.ok(h.counter && h.by === 0 && h.dmg > MOVES.lp.dmg);
});

test('brawl: a match is best of three and always ends; a stronger rival wins more', () => {
  const tally = (mine, rival) => {
    let wins = 0;
    for (let s = 1; s <= 12; s++) {
      const rand = seeded(s * 91);
      const m = createMatch({ level: rival, rand }), me = createAi(mine, rand);
      let n = 0;
      while (m.phase !== 'over') { m.step(m.phase === 'fight' ? me(m.a, m.b) : undefined); assert.ok(++n < 60 * 60 * 6, 'the match ends'); }
      assert.ok(m.wins[m.result] >= m.wins[1 - m.result]);
      assert.ok(Math.max(...m.wins) <= ROUNDS_TO_WIN + 1);
      wins += m.result === 0;
    }
    return wins;
  };
  assert.equal(AI_LEVELS.length, RIVALS);
  assert.ok(tally(2, 0) > tally(2, 4), 'the champion is harder than the first rival');
  assert.ok(tally(2, 0) >= 9, 'a fair player beats the first rival');
});

test('brawl: standing still loses on time, not forever', () => {
  const m = createMatch({ level: 0, rand: seeded(5) });
  let n = 0;
  while (m.phase !== 'over' && n++ < 60 * 60 * 6) m.step({});
  assert.equal(m.result, 1);
});

test('brawl: the ladder moves up on a win, stays on a loss, starts again after the champion', () => {
  const st = memStore();
  assert.deepEqual(loadBrawl(st), { stage: 0, best: 0, crowns: 0 });
  assert.deepEqual(afterMatch(st, 0, false), { stage: 0, best: 0, crowns: 0 });
  assert.deepEqual(afterMatch(st, 0, true), { stage: 1, best: 1, crowns: 0 });
  for (let i = 1; i < RIVALS - 1; i++) afterMatch(st, i, true);
  assert.deepEqual(afterMatch(st, RIVALS - 1, true), { stage: 0, best: RIVALS, crowns: 1 });
  st.setItem(BRAWL_KEY, '{"stage":99,"best":-3,"crowns":"x"}');
  assert.deepEqual(loadBrawl(st), { stage: RIVALS - 1, best: 0, crowns: 0 });
  st.setItem(BRAWL_KEY, 'not json');
  assert.deepEqual(loadBrawl(st), { stage: 0, best: 0, crowns: 0 });
});
