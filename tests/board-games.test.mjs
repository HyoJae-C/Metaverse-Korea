import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES, Omok, OMOK_SIZE, OneCard, attackOf, oneCardDeck, FruitBell, fruitDeck, BELL_TARGET,
  Roulette, newGame, applyAction, rng, shuffle, Mafia, MAFIA_PASS, packAct, unpackAct,
} from '../src/core/board-games.js';

test('board games: seeded random is the same everywhere', () => {
  const a = rng(42); const b = rng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], rng(7)), shuffle([1, 2, 3, 4, 5], rng(7)));
});

test('omok: five in a row wins, turns alternate, taken cells are refused', () => {
  const g = new Omok();
  assert.ok(!g.play(1, 0, 0)); // not your turn
  for (let i = 0; i < 4; i++) {
    assert.ok(g.play(0, 3 + i, 7));
    assert.ok(!g.play(1, 3 + i, 7)); // taken
    assert.ok(g.play(1, 3 + i, 9));
  }
  assert.ok(!g.over);
  assert.ok(g.play(0, 7, 7));
  assert.equal(g.winner, 0);
  assert.equal(g.line.length, 5);
  assert.ok(!g.play(1, 0, 0));
});

test('omok: diagonals count and the bot blocks a four', () => {
  const g = new Omok();
  for (let i = 0; i < 4; i++) { g.play(0, i, i); g.play(1, 14, i); }
  // Black has four on the diagonal; white (bot) to move would block, but it's
  // black's turn: it wins at (4,4).
  assert.deepEqual(g.botMove(() => 0), [4, 4]);
  const h = new Omok();
  for (let i = 0; i < 4; i++) { h.play(0, 2 + i, 0); if (i < 3) h.play(1, 2 + i, 5); }
  // Now it is white's turn and black threatens (1,0) or (6,0).
  const [x, y] = h.botMove(() => 0);
  assert.equal(y, 0);
  assert.ok(x === 1 || x === 6);
  assert.equal(OMOK_SIZE, 15);
});

test('roulette: the hidden spot ends it, others take turns', () => {
  for (const id of ['croc', 'pirate', 'bulldog']) {
    const g = new Roulette({ game: id, players: 3, seed: 9 });
    assert.equal(g.spots, GAMES[id].spots);
    let guard = 0;
    while (!g.over && guard++ < 100) {
      const spot = g.free().find((s) => s !== g.bad) ?? g.bad;
      const p = g.turn;
      assert.ok(!g.press((p + 1) % 3, spot) || g.n === 1);
      assert.ok(g.press(p, spot));
    }
    assert.ok(g.over);
    assert.equal(g.last.bang, true);
    assert.equal(g.pressed.length, g.spots);
  }
  const same = [new Roulette({ game: 'croc', seed: 5 }).bad, new Roulette({ game: 'croc', seed: 5 }).bad];
  assert.equal(same[0], same[1]);
});

test('roulette: someone leaving skips their turn; two leaving ends it', () => {
  const g = new Roulette({ game: 'pirate', players: 3, seed: 1 });
  g.leave(0);
  assert.equal(g.turn, 1);
  g.leave(1);
  assert.ok(g.over);
  assert.equal(g.loser, -1);
});

test('fruit bell: 56 cards, ringing right takes the face-up cards', () => {
  assert.equal(fruitDeck().length, 56);
  const g = new FruitBell({ players: 2, seed: 3 });
  assert.equal(g.cardsOf(0) + g.cardsOf(1), 56);
  // Force a known table.
  g.up[0].push({ f: 'grape', n: 2 });
  g.up[1].push({ f: 'grape', n: 3 });
  assert.equal(g.totals().grape, BELL_TARGET);
  const before = g.cardsOf(1);
  g.ring(1);
  assert.equal(g.last.ring, true);
  assert.equal(g.cardsOf(1), before + 1); // took player 0's card
  assert.equal(g.up[0].length + g.up[1].length, 0);
  // A second hand on the same table is dropped, not punished.
  assert.equal(g.ring(0), false);
  // Ringing wrong pays one card to the other player.
  g.flip(g.turn);
  if (g.bellRight()) g.up[0].length = 0;
  const a = g.cardsOf(0); const b = g.cardsOf(1);
  g.ring(0);
  assert.equal(g.last.ring, false);
  assert.equal(g.cardsOf(0), a - 1);
  assert.equal(g.cardsOf(1), b + 1);
});

test('fruit bell: a whole game ends with one winner', () => {
  const g = new FruitBell({ players: 3, seed: 11 });
  let guard = 0;
  while (!g.over && guard++ < 5000) {
    if (g.bellRight()) g.ring(guard % 3 === 0 ? 0 : 2);
    else g.flip(g.turn);
  }
  assert.ok(g.over);
  assert.ok(g.winner >= 0);
});

test('one card: attacks stack and must be defended or drawn', () => {
  assert.equal(oneCardDeck().length, 54);
  assert.equal(attackOf('2♥'), 2);
  assert.equal(attackOf('A♠'), 5);
  assert.equal(attackOf('JC'), 7);
  const g = new OneCard({ players: 2, seed: 4 });
  g.pile = ['5♥']; g.suit = '♥';
  g.hands[0] = ['2♥', '9♣']; g.hands[1] = ['2♠', '3♦', 'K♦'];
  assert.ok(g.put(0, '2♥'));
  assert.equal(g.attack, 2);
  assert.ok(!g.canPut('3♦'));
  assert.ok(g.put(1, '2♠')); // same rank defends and passes it on
  assert.equal(g.attack, 4);
  assert.ok(g.draw(0));
  assert.equal(g.hands[0].length, 5);
  assert.equal(g.attack, 0);
});

test('every game can be made and fed actions', () => {
  const r = newGame('bulldog', 2, 1);
  assert.ok(applyAction(r, 0, ['p', r.bad === 0 ? 1 : 0]));
  const o = newGame('omok', 2, 1);
  assert.ok(applyAction(o, 0, ['o', 7, 7]));
  assert.ok(!applyAction(o, 0, ['o', 8, 8]));
  const f = newGame('fruitbell', 2, 1);
  assert.ok(applyAction(f, 0, ['f']));
  assert.ok(!applyAction(f, 0, ['nope']));
  assert.ok(applyAction(f, 1, ['l']));
  assert.ok(f.over);
});

test('board game messages round-trip and refuse junk', async () => {
  const { parseBg, bgInvite, bgReply, bgGo, bgMove, bgPass, bgClose, unpackAct, packAct } = await import('../src/core/board-games.js');
  assert.deepEqual(parseBg(bgInvite('abc', 'croc')), { k: 'i', to: 'abc', game: 'croc' });
  assert.deepEqual(parseBg(bgReply('h1', true)), { k: 'a', to: 'h1' });
  assert.deepEqual(parseBg(bgGo('g7', 'omok', 123, ['h1', '~'])), { k: 'g', gid: 'g7', game: 'omok', seed: 123, ids: ['h1', '~'], opt: 0 });
  assert.equal(parseBg(bgGo('g7', 'omok', 1, ['a', 'b', 'c'])), null); // omok is for 2
  assert.equal(parseBg(bgGo('g7', 'croc', 1, ['a', 'a'])), null);
  assert.deepEqual(parseBg(bgMove('g7', ['o', 7, 3])), { k: 'x', gid: 'g7', act: ['o', 7, 3] });
  assert.deepEqual(parseBg(bgPass('g7', 2, ['r'])), { k: 'y', gid: 'g7', seat: 2, act: ['r'] });
  assert.deepEqual(parseBg(bgClose('g7')), { k: 'c', gid: 'g7' });
  assert.deepEqual(unpackAct(packAct(['c', '7♥', '♠'])), ['c', '7♥', '♠']);
  assert.equal(parseBg('bg:x:g7:w.1'), null);
  assert.equal(parseBg('darts:x'), null);
});

test('the joker game: pairs go at once, two steps to take a card, the joker holder loses', async () => {
  const { Thief, cardRank, isJoker } = await import('../src/core/board-games.js');
  for (const players of [2, 3, 6]) {
    const g = new Thief({ players, seed: 20 + players });
    // 53 cards: what is held plus two for every pair thrown.
    const held = () => g.hands.reduce((n, h) => n + h.length, 0);
    assert.equal(held() + g.pairs.reduce((a, b) => a + b, 0) * 2, 53);
    for (const h of g.hands) assert.equal(new Set(h.filter((c) => !isJoker(c)).map(cardRank)).size, h.filter((c) => !isJoker(c)).length); // no pair left in a hand
    let guard = 0;
    while (!g.over && guard++ < 2000) {
      const p = g.turn, q = g.from;
      assert.notEqual(q, p);
      assert.ok(!g.take((p + 1) % players === p ? p : (p + 1) % players, 0) || players === 1); // not your turn
      assert.ok(!g.select(p, 99));
      assert.ok(g.select(p, 0));
      assert.equal(g.sel, 0);
      const n = g.hands[q].length;
      assert.ok(g.take(p, g.botMove(() => 0.5)));
      assert.equal(g.hands[q].length, n - 1);
      assert.equal(g.sel, -1);
    }
    assert.ok(g.over, `${players} players finish`);
    assert.ok(g.loser >= 0);
    assert.deepEqual(g.hands[g.loser], ['JB']);
    assert.equal(g.pairs.reduce((a, b) => a + b, 0), 26);
  }
});

test('the joker game: someone leaving hands their cards round, and the game still ends', async () => {
  const { Thief, applyAction, newGame } = await import('../src/core/board-games.js');
  const g = newGame('thief', 4, 5);
  assert.ok(g instanceof Thief);
  applyAction(g, 1, ['l']);
  assert.equal(g.hands[1].length, 0);
  assert.equal(g.hands.reduce((n, h) => n + h.length, 0) + g.pairs.reduce((a, b) => a + b, 0) * 2, 53);
  let guard = 0;
  while (!g.over && guard++ < 2000) { assert.ok(applyAction(g, g.turn, ['s', 0])); assert.ok(applyAction(g, g.turn, ['t', 0])); }
  assert.ok(g.over && g.loser >= 0 && g.loser !== 1);
});

test('snakes and ladders: same dice everywhere, ladders up, snakes down, a 6 rolls again, someone wins', async () => {
  const { Ladders, LADDERS_UP, LADDERS_DOWN, LADDERS_END, newGame, applyAction } = await import('../src/core/board-games.js');
  // No ladder or snake starts where another ends, and none starts on the last square.
  const starts = [...Object.keys(LADDERS_UP), ...Object.keys(LADDERS_DOWN)].map(Number);
  const ends = [...Object.values(LADDERS_UP), ...Object.values(LADDERS_DOWN)];
  assert.equal(new Set(starts).size, starts.length);
  for (const e of ends) assert.ok(!starts.includes(e) && e >= 1 && e < LADDERS_END);
  for (const [a, b] of Object.entries(LADDERS_UP)) assert.ok(b > +a);
  for (const [a, b] of Object.entries(LADDERS_DOWN)) assert.ok(b < +a);
  for (const players of [2, 4]) {
    const g = newGame('ladders', players, 77), h = new Ladders({ players, seed: 77 });
    let guard = 0;
    const pasts = {};
    while (!g.over && guard++ < 3000) {
      const p = g.turn;
      assert.ok(!applyAction(g, (p + 1) % players, ['d'])); // not your turn
      assert.ok(applyAction(g, p, ['d']));
      h.roll(p);
      const l = g.last;
      if (l.past) { assert.ok(l.from + l.dice > LADDERS_END && l.to === l.from); pasts[l.p] = (pasts[l.p] || 0) + 1; assert.equal(pasts[l.p], 1, 'rolling past the end holds a player back only once'); }
      else assert.equal(l.mid, Math.min(LADDERS_END, l.from + l.dice));
      assert.equal(l.to, LADDERS_UP[l.mid] ?? LADDERS_DOWN[l.mid] ?? l.mid);
      if (!g.over) assert.equal(g.turn === p, l.dice === 6);
    }
    assert.ok(g.over && g.winner >= 0);
    assert.equal(g.pos[g.winner], LADDERS_END);
    assert.deepEqual(g.pos, h.pos);
  }
  const g = new Ladders({ players: 3, seed: 2 });
  g.leave(0);
  assert.equal(g.turn, 1);
  g.leave(2);
  assert.ok(g.over);
  assert.equal(g.winner, 1);
});

test('the block tower: a layer needs its middle or both sides; it wobbles more each block; someone knocks it over', async () => {
  const { Tower, TOWER_RISK_STEPS, newGame, applyAction } = await import('../src/core/board-games.js');
  const g = new Tower({ players: 2, seed: 3 });
  assert.equal(g.risk(), 0);
  assert.ok(g.stands(1) && g.stands(0));
  assert.ok(!g.press(1, 0)); // not your turn
  assert.ok(g.press(0, 1)); // the first block never falls: no wobble yet
  assert.equal(g.last.bang, false);
  assert.ok(!g.stands(0) && !g.stands(2)); // the sides hold that layer now
  assert.equal(g.risk(), 0); // the first round is safe
  const w = new Tower({ players: 2, seed: 3 });
  w.press(0, 1); w.press(1, 4);
  assert.ok(TOWER_RISK_STEPS.includes(w.risk())); // then 1 to 4% more for each block
  assert.ok(!g.press(1, 1)); // taken
  assert.ok(g.press(1, 0));
  assert.ok(g.over && g.last.bang);
  assert.equal(g.loser, 1);
  // Whole games, bots only: the same on two devices, and always an end.
  const falls = [0, 0]; // taking a block out / putting it on top
  for (let seed = 1; seed <= 40; seed++) {
    const a = newGame('tower', 3, seed), b = newGame('tower', 3, seed);
    assert.ok(a instanceof Tower);
    let guard = 0;
    while (!a.over && guard++ < 40) {
      const spot = a.botMove(() => 0.3);
      const p = a.turn;
      assert.ok(applyAction(a, p, ['p', spot]));
      assert.ok(applyAction(b, p, ['p', spot]));
    }
    assert.ok(a.over && a.loser >= 0);
    assert.equal(b.loser, a.loser);
    assert.deepEqual(b.pressed, a.pressed);
    assert.equal(b.last.placing, a.last.placing);
    falls[a.last.placing ? 1 : 0]++;
  }
  assert.ok(falls[0] > 0 && falls[1] > 0);
});

test('omok: with the 3-3 rule on, Black may not make two open threes (five still wins); White may', async () => {
  const { Omok, newGame, parseBg, bgGo } = await import('../src/core/board-games.js');
  const set = (g, list, p) => { for (const [x, y] of list) g.board[y * 15 + x] = p; };
  const g = newGame('omok', 2, 1, 1);
  assert.ok(g.no33);
  // Black has two in a row across and two down, meeting at (7,7).
  set(g, [[5, 7], [6, 7], [7, 5], [7, 6]], 0);
  assert.ok(g.doubleThree(7, 7, 0));
  assert.ok(!g.canPlay(0, 7, 7));
  assert.ok(!g.play(0, 7, 7));
  assert.ok(!g.doubleThree(8, 7, 0)); // one three only
  assert.ok(g.canPlay(0, 8, 7));
  // A three with a gap counts too: X_XX across.
  const h = new Omok({ no33: true });
  set(h, [[4, 7], [6, 7], [7, 5], [7, 6]], 0);
  assert.ok(h.doubleThree(7, 7, 0));
  // A three shut on one side by white is not open.
  const k = new Omok({ no33: true });
  set(k, [[5, 7], [6, 7], [7, 5], [7, 6]], 0);
  set(k, [[4, 7]], 1);
  assert.ok(!k.doubleThree(7, 7, 0));
  // Five beats the rule; with the rule off anything goes.
  const f = new Omok({ no33: true });
  set(f, [[3, 7], [4, 7], [5, 7], [6, 7], [7, 5], [7, 6], [7, 8]], 0);
  assert.ok(f.play(0, 7, 7));
  assert.equal(f.winner, 0);
  const off = newGame('omok', 2, 1);
  set(off, [[5, 7], [6, 7], [7, 5], [7, 6]], 0);
  assert.ok(off.play(0, 7, 7));
  // The computer never plays one, and the start message carries the choice.
  const b = new Omok({ no33: true });
  set(b, [[5, 7], [6, 7], [7, 5], [7, 6]], 0);
  assert.notDeepEqual(b.botMove(() => 0), [7, 7]);
  // White is free to.
  const w = new Omok({ no33: true });
  set(w, [[5, 7], [6, 7], [7, 5], [7, 6]], 1);
  w.turn = 1;
  assert.ok(w.doubleThree(7, 7, 1) && !w.banned(7, 7, 1));
  assert.ok(w.play(1, 7, 7));
  assert.equal(parseBg(bgGo('g7', 'omok', 5, ['a', 'b'], 1)).opt, 1);
  assert.equal(parseBg(bgGo('g7', 'omok', 5, ['a', 'b'])).opt, 0);
});

test('board game tunes: every game on the menu has a playable recipe', async () => {
  const { BOARD_TRACKS } = await import('../src/ui/board-games-music.js');
  for (const id of Object.keys(GAMES)) {
    const tr = BOARD_TRACKS[id];
    assert.ok(tr, `${id} has a tune`);
    assert.ok(tr.bpm >= 50 && tr.bpm <= 150 && tr.swing >= 1 && tr.swing < 2);
    assert.equal(tr.bass.length, tr.chords.length);
    assert.ok(Array.isArray(tr.kick) && Array.isArray(tr.snare) && tr.scale.length >= 5);
    assert.ok(tr.walk || tr.octaveBass || Array.isArray(tr.bassHits));
    for (const m of [...tr.chords.flat(), ...tr.bass, ...tr.scale]) assert.ok(Number.isInteger(m) && m >= 24 && m <= 96);
  }
});

test('snakes and ladders: the players lay the board out first, a share each, then roll', async () => {
  const { Ladders, LADDERS_SHARE, LADDERS_END, newGame, applyAction, unpackAct, packAct } = await import('../src/core/board-games.js');
  assert.deepEqual(unpackAct(packAct(['a', 1, 40, 12])), ['a', 1, 40, 12]);
  const g = newGame('ladders', 2, 5, 1);
  assert.ok(g.setup);
  assert.deepEqual(g.stock, [[3, 3], [3, 3]]);
  assert.ok(!applyAction(g, 0, ['d'])); // no dice yet
  assert.ok(!applyAction(g, 1, ['a', 0, 3, 20])); // not your turn
  assert.ok(!applyAction(g, 0, ['a', 0, 3, 6])); // same row
  assert.ok(!applyAction(g, 0, ['a', 0, 3, 60])); // too far
  assert.ok(!applyAction(g, 0, ['a', 0, 1, 20]) && !applyAction(g, 0, ['a', 1, 64, 40])); // not the first or last square
  assert.ok(applyAction(g, 0, ['a', 0, 20, 3])); // either order: a ladder goes up
  assert.equal(g.up[3], 20);
  assert.equal(g.turn, 1);
  assert.ok(!applyAction(g, 1, ['a', 1, 20, 30])); // that square is taken
  assert.ok(applyAction(g, 1, ['a', 1, 22, 41])); // a snake comes down
  assert.equal(g.down[41], 22);
  // The computer fills the rest; then the dice work and somebody wins.
  let guard = 0;
  while (g.setup && guard++ < 50) { const m = g.botPlace(Math.random); assert.ok(m); assert.ok(applyAction(g, g.turn, ['a', ...m])); }
  assert.ok(!g.setup);
  assert.equal(Object.keys(g.up).length, 6);
  assert.equal(Object.keys(g.down).length, 6);
  assert.equal(g.turn, 0);
  guard = 0;
  while (!g.over && guard++ < 5000) assert.ok(applyAction(g, g.turn, ['d']));
  assert.ok(g.over && g.pos[g.winner] === LADDERS_END);
  // Shares by table size; someone leaving mid-layout does not hold it up.
  for (const n of [2, 3, 4]) assert.deepEqual(new Ladders({ players: n, custom: true }).stock[0], LADDERS_SHARE[n]);
  const h = new Ladders({ players: 3, custom: true });
  h.leave(0);
  assert.equal(h.turn, 1);
  guard = 0;
  while (h.setup && guard++ < 50) applyAction(h, h.turn, ['a', ...h.botPlace(Math.random)]);
  assert.ok(!h.setup && h.turn === 1);
  assert.ok(!newGame('ladders', 2, 5).setup); // the ready-made board
});

// ---------------------------------------------------------------- mafia
const seatOf = (g, role) => g.roles.indexOf(role);
const seatsOf = (g, role) => g.roles.map((r, i) => (r === role ? i : -1)).filter((i) => i >= 0);

test('mafia: roles by table size, the same for one seed', () => {
  for (const [n, mafia] of [[4, 1], [5, 1], [6, 2], [8, 2]]) {
    const g = new Mafia({ players: n, seed: 3 });
    assert.equal(seatsOf(g, 'mafia').length, mafia);
    assert.equal(seatsOf(g, 'doctor').length, 1);
    assert.equal(seatsOf(g, 'police').length, 1);
    assert.equal(seatsOf(g, 'town').length, n - mafia - 2);
    assert.deepEqual(g.roles, new Mafia({ players: n, seed: 3 }).roles);
  }
  assert.throws(() => new Mafia({ players: 3 }));
  assert.throws(() => new Mafia({ players: 9 }));
});

test('mafia: a night (pick, save, ask), then talk, then the vote', () => {
  const g = new Mafia({ players: 6, seed: 11 });
  const [m1, m2] = seatsOf(g, 'mafia'), doc = seatOf(g, 'doctor'), cop = seatOf(g, 'police'), [t1, t2] = seatsOf(g, 'town');
  assert.equal(g.phase, 'night');
  assert.equal(g.seconds(), 20);
  assert.ok(!g.kill(t1, t2)); // not the mafia
  assert.ok(!g.kill(m1, m2)); // not one of their own
  assert.ok(g.kill(m1, t1));
  assert.ok(g.kill(m2, t2)); // (the last pick stands)
  assert.ok(g.heal(doc, t1)); // the wrong one
  assert.ok(!g.check(cop, cop));
  assert.ok(g.check(cop, m1));
  assert.ok(!g.check(cop, m2)); // one question a night
  assert.deepEqual(g.checks, [{ round: 1, target: m1, mafia: true }]);
  assert.ok(!g.next(0, 5)); // not this phase
  assert.ok(g.next(0, 0));
  assert.equal(g.phase, 'talk');
  assert.deepEqual(g.last, { died: t2, saved: false });
  assert.ok(!g.alive[t2]);
  assert.equal(g.seconds(), 5 * 15);
  assert.ok(!g.done(t2)); // the dead say nothing
  for (const i of g.living()) assert.ok(g.done(i));
  assert.equal(g.phase, 'vote'); // everyone done: on to the vote
  assert.ok(!g.vote(t2, m1));
  assert.ok(!g.vote(t1, t1));
  assert.ok(g.vote(t1, m1));
  assert.ok(!g.vote(t1, m2)); // once
  assert.ok(g.vote(doc, m1));
  assert.ok(g.vote(cop, m1));
  assert.ok(g.vote(m1, t1));
  assert.ok(g.vote(m2, MAFIA_PASS));
  assert.equal(g.phase, 'night'); // everyone voted
  assert.equal(g.last.voted, m1);
  assert.ok(!g.alive[m1] && !g.over);
  assert.equal(g.round, 2);
});

test('mafia: a save, a tied vote, and both ways of winning', () => {
  const g = new Mafia({ players: 4, seed: 5 });
  const m = seatOf(g, 'mafia'), doc = seatOf(g, 'doctor'), cop = seatOf(g, 'police'), t = seatOf(g, 'town');
  g.kill(m, t); g.heal(doc, t);
  g.next(0, g.step);
  assert.deepEqual(g.last, { died: -1, saved: true });
  g.next(0, g.step); // talk ran out
  g.vote(m, t); g.vote(t, m);
  g.next(0, g.step); // the others never voted
  assert.equal(g.last.voted, -1);
  assert.ok(g.last.tie);
  assert.equal(g.living().length, 4);
  // Night 2: the town player dies; then the mafia gets the doctor voted out: 1 mafia, 1 other.
  g.kill(m, t); g.next(0, g.step);
  g.next(0, g.step);
  g.vote(m, doc); g.vote(cop, MAFIA_PASS); g.vote(doc, MAFIA_PASS);
  assert.ok(g.over);
  assert.equal(g.winner, 'mafia');
  assert.ok(!g.next(0, g.step));

  const h = new Mafia({ players: 5, seed: 9 });
  const hm = seatOf(h, 'mafia');
  h.next(0, h.step); h.next(0, h.step);
  for (const i of h.living()) h.vote(i, i === hm ? MAFIA_PASS : hm);
  assert.equal(h.winner, 'town');
});

test('mafia: someone leaving counts as gone; moves go through room messages', () => {
  const g = newGame('mafia', 5, 21, 3);
  assert.equal(g.talk, 20);
  const m = seatOf(g, 'mafia'), t = seatsOf(g, 'town')[0];
  assert.ok(applyAction(g, m, unpackAct(packAct(['k', t]))));
  assert.equal(g.pick.kill, t);
  applyAction(g, t, ['l']);
  assert.equal(g.pick.kill, -1);
  assert.ok(applyAction(g, 0, unpackAct(packAct(['n', 0]))));
  assert.equal(g.last.died, -1);
  applyAction(g, m, ['l']);
  assert.equal(g.winner, 'town');
});

test('the joker game: the one picked from may shuffle once a turn', async () => {
  const { Thief } = await import('../src/core/board-games.js');
  const g = new Thief({ players: 2, seed: 12 });
  const holder = g.from, picker = g.turn, before = g.hands[holder].slice();
  assert.ok(!applyAction(g, picker, ['m'])); // not the one being picked from
  g.select(picker, 0);
  assert.ok(applyAction(g, holder, unpackAct(packAct(['m']))));
  assert.equal(g.sel, -1); // the finger comes off
  assert.deepEqual(g.hands[holder].slice().sort(), before.slice().sort());
  assert.ok(!g.mix(holder)); // once
  g.take(picker, 0);
  if (!g.over) assert.ok(!g.mixed); // a new turn
});
