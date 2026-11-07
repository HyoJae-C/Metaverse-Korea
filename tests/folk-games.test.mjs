import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YutGame, sticksKind, throwOdds, walk, stepsToGoal, nextSpot, chooseMove, SPOT_XY, HOME, OUT, CENTER, THROWS } from '../src/core/yut-game.js';
import { toss, aimAt, powerAt, TuhoRound, tuhoMedal, ARROWS, JAR_AT, NEAR, FAR, EAR_X, SPREAD } from '../src/core/tuho-game.js';
import { JegiRound, kickQuality, jegiMedal, SWEET, KICK_TOP } from '../src/core/jegi-game.js';
import { NeolRound, pushQuality, neolMedal, JUMPS, WINDOW } from '../src/core/neol-game.js';
import { FT, FOLK_LINES, koCount } from '../src/ui/folk-text.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar'];
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

// ---------- Yutnori ----------
test('sticks: count the flat sides; the marked stick alone is back-do', () => {
  assert.equal(sticksKind([false, false, false, false]), 'mo');
  assert.equal(sticksKind([true, false, false, false]), 'backdo');
  assert.equal(sticksKind([false, true, false, false]), 'do');
  assert.equal(sticksKind([true, true, false, false]), 'gae');
  assert.equal(sticksKind([true, true, true, false]), 'geol');
  assert.equal(sticksKind([true, true, true, true]), 'yut');
  const odds = throwOdds();
  assert.ok(Math.abs(Object.values(odds).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(odds.gae > odds.yut && odds.yut > odds.mo);
});

test('board: 29 spots, corners lead into the short cuts', () => {
  assert.equal(SPOT_XY.length, 29);
  assert.deepEqual(walk(HOME, null, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(walk(5, 4, 3), [20, 21, CENTER]); // from the corner: the diagonal
  assert.deepEqual(walk(4, 3, 3), [5, 6, 7]); // passing the corner: keep going round
  assert.deepEqual(walk(CENTER, 21, 3), [27, 28, 0]); // stopped on the centre: straight home
  assert.deepEqual(walk(21, 20, 3), [CENTER, 23, 24]); // passing the centre: straight on
  assert.deepEqual(walk(10, 9, 3), [25, 26, CENTER]);
  assert.deepEqual(walk(26, 25, 4), [CENTER, 27, 28, 0]);
  assert.deepEqual(walk(18, 17, 3), [19, 0, OUT]); // past the start: out
  assert.equal(nextSpot(0, 19), OUT);
  assert.equal(stepsToGoal(HOME, null), 21);
  assert.equal(stepsToGoal(5, 4), 12); // 20,21,22,23,24,15,16,17,18,19,0,out
});

test('yutnori: yut and mo throw again, then moves are used one by one', () => {
  const g = new YutGame({ players: 2, pieces: 2 });
  g.throw('yut');
  assert.equal(g.phase, 'throw');
  g.throw('geol');
  assert.equal(g.phase, 'move');
  assert.deepEqual(g.pending, ['yut', 'geol']);
  const o = g.options().find((x) => x.kind === 'yut' && x.from === HOME);
  assert.equal(o.dest, 4);
  g.move(o.i, HOME);
  // Now geol: the piece on 4 can go to 7, or a new piece to 3.
  const dests = g.options().map((x) => x.dest).sort((a, b) => a - b);
  assert.deepEqual(dests, [3, 7]);
  g.move(0, 4);
  assert.equal(g.turn, 1);
  assert.equal(g.players[0].pieces[0].at, 7);
});

test('yutnori: stacking moves pieces together; catching sends them home and throws again', () => {
  const g = new YutGame({ players: 2, pieces: 2 });
  g.throw('gae'); g.move(0, HOME); // P0 on 2
  g.throw('gae'); g.move(0, HOME); // P1 on 2: catches P0
  assert.equal(g.players[0].pieces[0].at, HOME);
  assert.equal(g.last.caught, 1);
  assert.equal(g.turn, 1);
  assert.equal(g.phase, 'throw'); // one more throw for the catch
  g.throw('do'); // new P1 piece to 1, or the one on 2 to 3
  g.move(0, HOME);
  assert.equal(g.turn, 0);
  g.throw('mo'); g.throw('geol');
  g.move(g.pending.indexOf('mo'), HOME); // to 5
  g.move(0, HOME); // second piece to 3
  // P1: do moves 1 → 2 (joins its own piece)
  g.throw('do');
  g.move(0, 1);
  assert.equal(g.stackAt(1, 2).length, 2);
  assert.equal(g.last.joined, 1);
});

test('yutnori: back-do with nothing on the board is lost; back from 1 reaches the start', () => {
  const g = new YutGame({ players: 2, pieces: 2 });
  g.throw('backdo');
  assert.equal(g.turn, 1);
  assert.deepEqual(g.last.lost, ['backdo']);
  g.throw('do'); g.move(0, HOME);
  g.throw('do'); g.move(0, HOME); // P0 on 1 catches P1 (P0 throws again)
  g.throw('backdo');
  g.move(0, 1);
  assert.equal(g.players[0].pieces[0].at, 0);
  g.throw('do'); // P1's turn: enters
  g.move(0, HOME);
  g.throw('do'); // P0: the piece on the start goes out, or a new one enters
  const out = g.options().find((o) => o.from === 0);
  assert.equal(out.dest, OUT);
});

test('yutnori: a game between two computer players always ends', () => {
  for (let s = 1; s <= 20; s++) {
    let x = s;
    const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const g = YutGame.restore(new YutGame({ players: 2 + (s % 3), pieces: s % 2 ? 4 : 2 }).snapshot());
    let n = 0;
    while (g.phase !== 'over' && n++ < 5000) {
      if (g.phase === 'throw') {
        const k = THROWS[Math.floor(rand() * 6)];
        g.throw(k);
      } else {
        const o = chooseMove(g, rand);
        g.move(o.i, o.from);
      }
    }
    assert.equal(g.phase, 'over', 'seed ' + s);
    assert.ok(g.players[g.winner].pieces.every((p) => p.at === OUT));
  }
});

test('yutnori AI: takes a catch when it can', () => {
  const g = new YutGame({ players: 2, pieces: 2 });
  g.throw('geol'); g.move(0, HOME); // P0 on 3
  g.throw('do'); g.move(0, HOME); // P1 on 1
  g.throw('do'); g.move(0, 3); // P0 to 4
  g.throw('geol'); // P1: from 1 → 4 catches; a new piece → 3 doesn't
  const o = chooseMove(g, () => 0.5);
  assert.equal(o.from, 1);
  assert.equal(o.catches, 1);
});

// ---------- Tuho ----------
test('tuho: the middle goes in the mouth, the sides in the ears, misses say why', () => {
  const still = () => 0.5; // no wobble
  const mid = (JAR_AT - NEAR) / (FAR - NEAR);
  assert.equal(toss(0, mid, still).kind, 'mouth');
  assert.equal(toss(EAR_X / SPREAD, mid, still).kind, 'ear');
  assert.equal(toss(-EAR_X / SPREAD, mid, still).points, 3);
  assert.equal(toss(0, 0, still).tip, 'short');
  assert.equal(toss(0, 1, still).tip, 'long');
  assert.equal(toss(-0.9, mid, still).tip, 'left');
  assert.equal(toss(0, mid + 0.075, still).kind, 'rim');
  for (let tt = 0; tt < 20; tt += 0.37) {
    assert.ok(Math.abs(aimAt(tt, 5)) <= 1);
    const p = powerAt(tt, 5);
    assert.ok(p >= 0 && p <= 1);
  }
});

test('tuho: a round is ten arrows; medals by score', () => {
  const r = new TuhoRound();
  for (let i = 0; i < 12; i++) r.add({ points: 2 });
  assert.equal(r.throws.length, ARROWS);
  assert.equal(r.score, 20);
  assert.equal(tuhoMedal(20), 'silver');
  assert.equal(tuhoMedal(22), 'gold');
  assert.equal(tuhoMedal(4), null);
});

// ---------- Jegichagi ----------
test('jegi: a kick at the sweet spot is perfect, too high or out of reach whiffs', () => {
  assert.ok(kickQuality(SWEET, 0) > 0.95);
  assert.equal(kickQuality(KICK_TOP + 0.05, 0), 0);
  assert.equal(kickQuality(SWEET, 0.5), 0);
  const r = new JegiRound(() => 0.5);
  // Let it fall to the sweet spot, then kick.
  while (r.y > SWEET) r.step(0.01);
  assert.equal(r.kick().label, 'perfect');
  assert.equal(r.kicks, 1);
  assert.ok(r.vy > 3);
  assert.equal(r.kick().label, 'whiff'); // going up: can't kick again at once
});

test('jegi: never kicking lets it fall; perfect kicks keep it going', () => {
  const lazy = new JegiRound();
  for (let i = 0; i < 1000 && !lazy.over; i++) lazy.step(0.01);
  assert.ok(lazy.over);
  assert.equal(lazy.kicks, 0);
  const pro = new JegiRound(Math.random);
  for (let i = 0; i < 20000 && !pro.over && pro.kicks < 45; i++) {
    pro.step(0.005);
    if (pro.vy < 0 && Math.abs(pro.y - SWEET) < 0.02) pro.kick();
  }
  assert.ok(pro.kicks >= 45, 'kicks ' + pro.kicks);
  assert.equal(jegiMedal(pro.kicks), 'gold');
  assert.equal(jegiMedal(3), null);
});

// ---------- Neolttwigi ----------
test('neolttwigi: good timing climbs, missed pushes sink; medals by total height', () => {
  assert.equal(pushQuality(0), 1);
  assert.equal(pushQuality(WINDOW + 0.01), 0);
  assert.equal(pushQuality(null), 0);
  const good = new NeolRound(), bad = new NeolRound(), ok = new NeolRound();
  for (let i = 0; i < JUMPS + 2; i++) { good.land(0); bad.land(null); ok.land(0.1); }
  assert.equal(good.jumps.length, JUMPS);
  assert.ok(good.best > 1.5, 'best ' + good.best);
  assert.ok(good.metres > ok.metres && ok.metres > bad.metres);
  assert.equal(neolMedal(good.metres), 'gold');
  assert.equal(neolMedal(bad.metres), null);
  assert.ok(neolMedal(ok.metres), 'ok timing still earns a medal: ' + ok.metres);
});

// ---------- Text ----------
test('folk text: every entry in every language; lines have Korean, romanization and a meaning', () => {
  for (const [k, v] of Object.entries(FT)) for (const l of LANGS) assert.ok(v[l], `${k} ${l}`);
  for (const [k, [ko, rom, tr]] of Object.entries(FOLK_LINES)) {
    assert.match(ko, /[가-힣]/, k);
    assert.ok(rom && !/[가-힣]/.test(rom), k);
    for (const l of LANGS.filter((x) => x !== 'ko')) assert.ok(tr[l], `${k} ${l}`);
  }
});

test('jegi count in native Korean numbers', () => {
  assert.deepEqual(koCount(1), ['하나', 'hana']);
  assert.deepEqual(koCount(10), ['열', 'yeol']);
  assert.deepEqual(koCount(12), ['열둘', 'yeol-dul']);
  assert.deepEqual(koCount(20), ['스물', 'seumul']);
  assert.deepEqual(koCount(47), ['마흔일곱', 'maheun-ilgop']);
  assert.deepEqual(koCount(120), ['120', '120']);
});

test('folk props are ready to be placed', async () => {
  const { FOLK_GAMES } = await import('../src/core/folk-props.js');
  assert.deepEqual(FOLK_GAMES.map((g) => g.id), ['yut', 'tuho', 'jegi', 'neol']);
  for (const g of FOLK_GAMES) {
    const o = g.build();
    assert.ok(o.children.length > 2, g.id);
    assert.equal(g.stand.length, 2);
  }
});
