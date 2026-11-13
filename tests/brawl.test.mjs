import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVES, moveTicks, newFighter, stepFight, createMatch, createAi, seeded, RING_R, MAX_HP, ROUNDS_TO_WIN, RIVALS, AI_LEVELS, loadBrawl, afterMatch, BRAWL_KEY, STYLES, STYLE_IDS, movesFor, saveStyle, newMatch, stepMatch } from '../src/core/brawl.js';

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
  assert.deepEqual(loadBrawl(st), { stage: 0, best: 0, crowns: 0, style: null });
  assert.deepEqual(afterMatch(st, 0, false), { stage: 0, best: 0, crowns: 0, style: null });
  assert.deepEqual(afterMatch(st, 0, true), { stage: 1, best: 1, crowns: 0, style: null });
  for (let i = 1; i < RIVALS - 1; i++) afterMatch(st, i, true);
  assert.deepEqual(afterMatch(st, RIVALS - 1, true), { stage: 0, best: RIVALS, crowns: 1, style: null });
  st.setItem(BRAWL_KEY, '{"stage":99,"best":-3,"crowns":"x"}');
  assert.deepEqual(loadBrawl(st), { stage: RIVALS - 1, best: 0, crowns: 0, style: null });
  st.setItem(BRAWL_KEY, 'not json');
  assert.deepEqual(loadBrawl(st), { stage: 0, best: 0, crowns: 0, style: null });
});

// ── Styles, dashes and strings ───────────────────────────────────────────
const duel = (sa, sb, gap = 0.8) => { const a = newFighter(0, sa), b = newFighter(1, sb); a.x = -gap / 2; b.x = gap / 2; return [a, b]; };
const SIG = (id) => (STYLES[id].slot === 'palm' ? { lp: true, rp: true } : { lk: true, rk: true });

test('brawl styles: eight, each with its own health, moves and two strings', () => {
  assert.equal(STYLE_IDS.length, 8);
  for (const id of STYLE_IDS) {
    const st = STYLES[id], f = newFighter(0, id);
    assert.equal(f.hp, st.hp);
    assert.equal(f.maxHp, st.hp);
    assert.equal(st.combos.length, 2);
    for (const c of st.combos) assert.ok(c.length >= 2 && c.every((k) => ['lp', 'rp', 'lk', 'rk'].includes(k)), id + ' string');
    for (const m of Object.values(movesFor(id))) assert.ok(m.startup >= 4 && m.recover > 0 && m.dmg >= 0);
  }
  assert.deepEqual(movesFor('brawler'), MOVES, 'the brawler is the plain move list');
  assert.ok(STYLES.tank.hp > STYLES.brawler.hp && STYLES.brawler.hp > STYLES.ninja.hp);
  assert.ok(movesFor('boxer').lp.startup < MOVES.lp.startup && movesFor('kicker').rk.startup < MOVES.rk.startup);
  assert.equal(newFighter(0, 'nobody').style, 'brawler');
});

test('brawl styles: every signature move does its job', () => {
  for (const id of STYLE_IDS.filter((s) => STYLES[s].sig)) {
    const [a, b] = duel(id, 'brawler', id === 'mystic' ? 2.5 : 0.8);
    const ev = run(a, b, [SIG(id)], [], 160);
    assert.ok(b.hp < b.maxHp, id + ' signature hurts');
    assert.equal(a.st, 'idle', id + ' signature ends');
    assert.ok(ev.some((e) => e.k === 'hit'), id);
  }
});

test('brawl styles: the ninja ends up behind, the mystic hits from across the ring, the grab beats a guard', () => {
  const [n, t] = duel('ninja', 'brawler', 2.2);
  const ev = run(n, t, [SIG('ninja')], [], 30);
  assert.ok(ev.some((e) => e.k === 'blink'));
  assert.ok(n.x > t.x, 'on the far side now');
  const [m, u] = duel('mystic', 'brawler', 3.5);
  run(m, u, [SIG('mystic')], [], 25);
  assert.ok(m.shot, 'a ball of light is in the air');
  assert.equal(u.hp, u.maxHp);
  run(m, u, [], [], 60);
  assert.ok(u.hp < u.maxHp && !m.shot, 'it arrived');
  const [m2, u2] = duel('mystic', 'brawler', 3.5);
  const ev2 = run(m2, u2, [SIG('mystic')], { hold: { mx: -1 } }, 120);
  assert.ok(ev2.some((e) => e.k === 'block' && e.move === 'shot') || !ev2.some((e) => e.k === 'hit'), 'a guard stops the ball');
  const [g, v] = duel('grappler', 'brawler');
  v.x = RING_R - 0.34; g.x = v.x - 0.75;
  run(g, v, [SIG('grappler')], { hold: { mx: -1 } }, 60);
  assert.ok(v.hp < v.maxHp, 'the throw goes through a guard');
});

test('brawl styles: the whirlwind kick hits three times; the tank\'s charge shrugs off a jab', () => {
  const [k, d] = duel('kicker', 'tank');
  const hits = run(k, d, [SIG('kicker')], [], 80).filter((e) => e.k === 'hit' && e.move === 'fly');
  assert.equal(hits.length, 3);
  const [t, j] = duel('tank', 'brawler', 1.6);
  const it = []; it[0] = SIG('tank');
  const ij = []; ij[6] = { lp: true };
  const ev = run(t, j, it, ij, 60);
  assert.ok(ev.some((e) => e.k === 'hit' && e.by === 1 && e.armor), 'the jab lands on armour');
  assert.ok(ev.some((e) => e.k === 'hit' && e.by === 0), 'and the charge still arrives');
  assert.ok(t.hp < t.maxHp, 'armour still hurts');
});

test('brawl styles: a style\'s own string chains where the usual rule would not, and its last hit is a finisher', () => {
  // The kicker's lk → rk → rk: the second roundhouse is not "heavier".
  const [a, b] = duel('kicker', 'tank');
  b.x = RING_R - 0.34; a.x = b.x - 0.8;
  const ia = []; ia[0] = { lk: true };
  for (let t = 10; t < 120; t += 3) ia[t] = { rk: true };
  ia.hold = { mx: 1 };
  const ev = run(a, b, ia, [], 70);
  const hits = ev.filter((e) => e.k === 'hit');
  assert.deepEqual(hits.slice(0, 3).map((e) => e.move), ['lk', 'rk', 'rk']);
  assert.ok(hits[2].fin && ev.some((e) => e.k === 'combo' && e.n === 3));
  assert.ok(hits[2].dmg > hits[1].dmg, 'the finisher is worth more');
  // The same buttons as a brawler: the second roundhouse does not chain.
  const [c, d] = duel('brawler', 'tank');
  d.x = RING_R - 0.34; c.x = d.x - 0.8;
  const ev2 = run(c, d, ia, [], 62).filter((e) => e.k === 'hit');
  assert.ok(!ev2.some((e) => e.fin));
});

test('brawl: a dash covers ground fast, stops at the other fighter, and an attack cuts it short', () => {
  const [a, b] = duel('brawler', 'brawler', 3);
  const x0 = a.x;
  const ev = run(a, b, [{ dash: 1 }], [], 10);
  assert.ok(ev.some((e) => e.k === 'dash'));
  assert.ok(a.x - x0 > 1.2, 'further than nine ticks of walking');
  const [c, d] = duel('brawler', 'brawler', 1.0);
  run(c, d, [{ dash: 1 }], [], 12);
  assert.ok(d.x - c.x >= 0.67, 'no running through');
  const [e, f] = duel('boxer', 'brawler', 2.2);
  const ie = [{ dash: 1 }]; ie[8] = { lp: true };
  const hit = run(e, f, ie, [], 30).find((q) => q.k === 'hit');
  assert.ok(hit && hit.move === 'lp', 'a dash into a jab lands');
  const [g, h] = duel('brawler', 'brawler', 1.0);
  const gx = g.x;
  run(g, h, [{ dash: -1 }], [], 10);
  assert.ok(g.x < gx - 0.8, 'a back dash gets away');
});

test('brawl styles: any style against any style ends, and none is hopeless', () => {
  const score = Object.fromEntries(STYLE_IDS.map((id) => [id, 0]));
  let n = 0;
  for (const a of STYLE_IDS) for (const b of STYLE_IDS) {
    if (a === b) continue;
    for (let s = 1; s <= 3; s++) {
      const rand = seeded(s * 53 + n++);
      const m = createMatch({ level: 2, rand, style: a, rivalStyle: b }), me = createAi(2, rand);
      let t = 0;
      while (m.phase !== 'over') { m.step(m.phase === 'fight' ? me(m.a, m.b) : undefined); assert.ok(++t < 60 * 60 * 6, `${a} v ${b} ends`); }
      score[m.result === 0 ? a : b]++;
    }
  }
  for (const [id, w] of Object.entries(score)) assert.ok(w >= 8 && w <= 34, `${id} won ${w} of 42`);
});

test('brawl: the picked style is remembered with the ladder', () => {
  const st = memStore();
  assert.equal(saveStyle(st, 'ninja').style, 'ninja');
  assert.equal(afterMatch(st, 0, true).style, 'ninja');
  assert.equal(saveStyle(st, 'wizard').style, null);
});

test("every style's strings land in full, from close and from the edge of a jab's reach", () => {
  for (const style of STYLE_IDS) {
    for (const combo of STYLES[style].combos) {
      for (const dist of [0.7, 1.05]) {
        const m = newMatch(style, 'brawler', true);
        for (let t = 0; m.phase !== 'fight' && t < 600; t++) stepMatch(m, {}, {});
        m.a.x = -dist / 2; m.b.x = dist / 2; m.a.z = m.b.z = 0;
        let i = 0, hits = 0, fin = false, started = false;
        for (let t = 0; t < 300; t++) {
          const inp = i < combo.length && (i === 0 || m.a.landed) ? { [combo[i]]: true } : {};
          for (const e of stepMatch(m, inp, {})) if (e.k === 'hit' && e.by === 0) { hits++; fin = fin || !!e.fin; }
          if (m.a.st === 'atk') { started = true; i = Math.max(i, m.a.seq.length); }
          else if (started) break;
        }
        assert.equal(hits, combo.length, `${style} ${combo.join(' ')} from ${dist} m`);
        assert.ok(fin, `${style} ${combo.join(' ')} ends in its finisher`);
      }
    }
  }
});
