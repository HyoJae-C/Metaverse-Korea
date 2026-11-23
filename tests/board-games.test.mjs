import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES, Omok, OMOK_SIZE, OneCard, attackOf, oneCardDeck, FruitBell, fruitDeck, BELL_TARGET,
  Roulette, newGame, applyAction, rng, shuffle,
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
  assert.deepEqual(parseBg(bgGo('g7', 'omok', 123, ['h1', '~'])), { k: 'g', gid: 'g7', game: 'omok', seed: 123, ids: ['h1', '~'] });
  assert.equal(parseBg(bgGo('g7', 'omok', 1, ['a', 'b', 'c'])), null); // omok is for 2
  assert.equal(parseBg(bgGo('g7', 'croc', 1, ['a', 'a'])), null);
  assert.deepEqual(parseBg(bgMove('g7', ['o', 7, 3])), { k: 'x', gid: 'g7', act: ['o', 7, 3] });
  assert.deepEqual(parseBg(bgPass('g7', 2, ['r'])), { k: 'y', gid: 'g7', seat: 2, act: ['r'] });
  assert.deepEqual(parseBg(bgClose('g7')), { k: 'c', gid: 'g7' });
  assert.deepEqual(unpackAct(packAct(['c', '7♥', '♠'])), ['c', '7♥', '♠']);
  assert.equal(parseBg('bg:x:g7:z.1'), null);
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
