// Board games for the board game cafe and home parties: rules only, no DOM.
//
// Every game is a small state machine driven by actions. All players start
// from the same seed (the host picks it and sends it with "go"), then every
// screen applies the same actions in the same order, so the games stay the
// same everywhere without a server. The host decides the order of races
// (who rang the bell first) and forwards each action to everyone.
//
// The games use public, generic rules only; names and looks are our own.
//  - omok      오목: five in a row on a 15×15 board, 2 players.
//  - onecard   원카드: Korean "one card" (match suit or rank, attack cards), 2-4.
//  - fruitbell 과일 종치기: flip cards; ring when one fruit shows exactly 5, 2-4.
//  - thief     도둑잡기: pair up and discard, draw from your neighbour; whoever
//    is left holding the joker loses, 2-6.
//  - croc / pirate / bulldog: press one spot each in turn; whoever finds the
//    hidden one loses (악어 이빨 / 통 속 해적 / 잠꾸러기 불독), 2-6.

export const GAMES = {
  omok: { min: 2, max: 2, icon: '⚫', price: 30000 },
  onecard: { min: 2, max: 4, icon: '🃏', price: 30000 },
  fruitbell: { min: 2, max: 4, icon: '🔔', price: 30000 },
  croc: { min: 2, max: 6, icon: '🐊', price: 20000, spots: 13 },
  pirate: { min: 2, max: 6, icon: '🏴‍☠️', price: 20000, spots: 24 },
  bulldog: { min: 2, max: 6, icon: '🐶', price: 20000, spots: 12 },
  thief: { min: 2, max: 6, icon: '🕵️', price: 30000 },
  ladders: { min: 2, max: 4, icon: '🐍', price: 30000 },
  tower: { min: 2, max: 6, icon: '🧱', price: 30000, spots: 30 },
};
export const GAME_IDS = Object.keys(GAMES);
export const ROULETTE = ['croc', 'pirate', 'bulldog'];
export const TOYS = [...ROULETTE, 'tower']; // press one spot in turn until it goes off

// mulberry32: a small seeded random, the same on every device.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- omok
export const OMOK_SIZE = 15;

export class Omok {
  // no33: a move that makes two open threes at once is not allowed, for
  // either colour (the host chooses, Yozi 2026-11-23).
  constructor({ players = 2, no33 = false } = {}) {
    if (players !== 2) throw new Error('omok is for 2');
    this.n = 2;
    this.no33 = !!no33;
    this.board = new Array(OMOK_SIZE * OMOK_SIZE).fill(-1);
    this.turn = 0; // player 0 is black and goes first
    this.winner = -1;
    this.line = null;
    this.moves = 0;
    this.over = false;
  }

  canPlay(p, x, y) {
    return !this.over && p === this.turn && x >= 0 && y >= 0 && x < OMOK_SIZE && y < OMOK_SIZE && this.board[y * OMOK_SIZE + x] < 0
      && !(this.no33 && this.doubleThree(x, y, p));
  }

  // Would a stone at (x, y) make two or more open threes (a three that one
  // more stone turns into an open four: _XXXX_)? A move that makes five is
  // always fine.
  doubleThree(x, y, p) {
    const i = y * OMOK_SIZE + x;
    if (this.board[i] >= 0) return false;
    this.board[i] = p;
    let threes = 0;
    if (!this.fiveFrom(x, y, p)) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        // The line through the stone, five cells each way: X mine, _ empty, O the rest.
        let line = '';
        for (let s = -5; s <= 5; s++) { const v = this.at(x + dx * s, y + dy * s); line += v === p ? 'X' : v === -1 ? '_' : 'O'; }
        let open = false;
        for (let k = 0; k < line.length && !open; k++) {
          if (line[k] !== '_') continue;
          const t = line.slice(0, k) + 'X' + line.slice(k + 1);
          // An open four made with that stone, and holding the new stone (index 5).
          for (let a = Math.max(1, k - 3); a <= Math.min(k, line.length - 5) && !open; a++) {
            if (t.slice(a, a + 4) === 'XXXX' && t[a - 1] === '_' && t[a + 4] === '_' && a <= 5 && a + 3 >= 5) open = true;
          }
        }
        if (open) threes++;
      }
    }
    this.board[i] = -1;
    return threes >= 2;
  }

  // Returns true if the move was taken.
  play(p, x, y) {
    if (!this.canPlay(p, x, y)) return false;
    this.board[y * OMOK_SIZE + x] = p;
    this.moves++;
    const line = this.fiveFrom(x, y, p);
    if (line) { this.winner = p; this.line = line; this.over = true; }
    else if (this.moves === OMOK_SIZE * OMOK_SIZE) this.over = true; // a full board is a draw
    else this.turn = 1 - p;
    return true;
  }

  at(x, y) {
    return x < 0 || y < 0 || x >= OMOK_SIZE || y >= OMOK_SIZE ? -2 : this.board[y * OMOK_SIZE + x];
  }

  // Five or more in a row through (x, y): the cells of that line, or null.
  fiveFrom(x, y, p) {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [[x, y]];
      for (let s = 1; this.at(x + dx * s, y + dy * s) === p; s++) cells.push([x + dx * s, y + dy * s]);
      for (let s = 1; this.at(x - dx * s, y - dy * s) === p; s++) cells.unshift([x - dx * s, y - dy * s]);
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  leave(p) {
    if (this.over) return;
    this.winner = 1 - p;
    this.over = true;
  }

  // A simple computer player: win now, else block, else play next to the
  // longest lines, close to the middle.
  botMove(rand = Math.random) {
    const p = this.turn;
    let best = null; let bestScore = -1;
    for (let y = 0; y < OMOK_SIZE; y++) {
      for (let x = 0; x < OMOK_SIZE; x++) {
        if (this.board[y * OMOK_SIZE + x] >= 0 || (this.no33 && this.doubleThree(x, y, p))) continue;
        const s = this.cellScore(x, y, p) * 1.1 + this.cellScore(x, y, 1 - p) + rand() * 0.5
          - (Math.abs(x - 7) + Math.abs(y - 7)) * 0.05;
        if (s > bestScore) { bestScore = s; best = [x, y]; }
      }
    }
    return best;
  }

  cellScore(x, y, p) {
    let score = 0;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let run = 0; let open = 0;
      for (const sgn of [1, -1]) {
        let s = 1;
        while (this.at(x + dx * s * sgn, y + dy * s * sgn) === p) { run++; s++; }
        if (this.at(x + dx * s * sgn, y + dy * s * sgn) === -1) open++;
      }
      if (run >= 4) score += 10000;
      else score += [0, 2, 12, 80][run] * (open + 1) ** 2;
    }
    return score;
  }
}

// ---------------------------------------------------------------- one card
// 52 cards and 2 jokers. Cards are strings: rank + suit, 'A♠', '10♥', 'JB'
// (black joker) and 'JC' (colour joker).
export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const ONECARD_HAND = 7;
export const ONECARD_BUST = 20; // holding more than this knocks you out

export const cardSuit = (c) => (c === 'JB' || c === 'JC' ? null : c.slice(-1));
export const cardRank = (c) => (c === 'JB' || c === 'JC' ? 'JK' : c.slice(0, -1));
export const isJoker = (c) => c === 'JB' || c === 'JC';
export const isRed = (c) => c === 'JC' || cardSuit(c) === '♥' || cardSuit(c) === '♦';

// How many cards an attack card makes the next player draw (0 = not one).
export function attackOf(c) {
  if (c === 'JC') return 7;
  if (c === 'JB') return 5;
  if (c === 'A♠') return 5;
  const r = cardRank(c);
  if (r === 'A') return 3;
  if (r === '2') return 2;
  return 0;
}

export function oneCardDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  d.push('JB', 'JC');
  return d;
}

export class OneCard {
  constructor({ players = 2, seed = 1 } = {}) {
    if (players < 2 || players > 4) throw new Error('one card is for 2-4');
    this.n = players;
    this.rand = rng(seed);
    const deck = shuffle(oneCardDeck(), this.rand);
    this.hands = [];
    for (let p = 0; p < players; p++) this.hands.push(deck.splice(0, ONECARD_HAND));
    // The first face-up card is never a joker or an attack card.
    let i = deck.findIndex((c) => !isJoker(c) && !attackOf(c) && !'JQK7'.includes(cardRank(c)));
    if (i < 0) i = 0;
    this.pile = deck.splice(i, 1);
    this.stock = deck;
    this.suit = cardSuit(this.pile[0]); // the suit to follow (7 can change it)
    this.turn = 0;
    this.dir = 1;
    this.attack = 0; // cards waiting for whoever can't defend
    this.out = new Array(players).fill(false); // bust or left
    this.winner = -1;
    this.over = false;
    this.last = null; // what just happened, for the screen
  }

  get top() { return this.pile[this.pile.length - 1]; }

  // Can card c go on the pile now?
  canPut(c) {
    const top = this.top;
    if (this.attack) {
      // Under attack only an attack card at least as strong defends (2 ← 2,
      // A ← A or 2 of the same suit is not enough; jokers beat everything).
      const a = attackOf(c);
      if (!a) return false;
      if (isJoker(c)) return true;
      if (isJoker(top)) return false;
      return cardRank(c) === cardRank(top) || (cardSuit(c) === this.suit && a >= attackOf(top));
    }
    if (isJoker(c)) return true;
    if (isJoker(top)) return isRed(c) === isRed(top); // after a joker: same colour
    return cardSuit(c) === this.suit || cardRank(c) === cardRank(top);
  }

  playable(p) {
    return p === this.turn && !this.over ? this.hands[p].filter((c) => this.canPut(c)) : [];
  }

  draw1() {
    if (!this.stock.length) {
      // Shuffle the pile back under, keeping the top card.
      const top = this.pile.pop();
      this.stock = shuffle(this.pile, this.rand);
      this.pile = [top];
    }
    return this.stock.pop();
  }

  next(from = this.turn, skip = 0) {
    let t = from;
    for (let k = 0; k <= skip; k++) {
      do t = (t + this.dir + this.n) % this.n; while (this.out[t]);
    }
    return t;
  }

  alive() { return this.out.map((o, p) => (o ? -1 : p)).filter((p) => p >= 0); }

  // Put card c (suit: the new suit when c is a 7). Returns true if taken.
  put(p, c, suit = null) {
    if (this.over || p !== this.turn) return false;
    const h = this.hands[p];
    const i = h.indexOf(c);
    if (i < 0 || !this.canPut(c)) return false;
    h.splice(i, 1);
    this.pile.push(c);
    this.suit = cardSuit(c) ?? this.suit;
    const r = cardRank(c);
    this.attack += attackOf(c);
    this.last = { p, put: c };
    if (!h.length) { this.winner = p; this.over = true; return true; }
    if (r === '7') {
      this.suit = SUITS.includes(suit) ? suit : this.suit;
      this.last.suit = this.suit;
    }
    if (r === 'K') return true; // one more turn
    if (r === 'Q') {
      this.dir = -this.dir;
      if (this.alive().length === 2) return true; // with two left, Q is like K
    }
    this.turn = this.next(p, r === 'J' ? 1 : 0);
    return true;
  }

  // Draw: 1 card, or the whole attack when you can't (or won't) defend.
  draw(p) {
    if (this.over || p !== this.turn) return false;
    const k = this.attack || 1;
    this.attack = 0;
    for (let i = 0; i < k; i++) this.hands[p].push(this.draw1());
    this.last = { p, drew: k };
    if (this.hands[p].length > ONECARD_BUST) {
      this.last.bust = true;
      this.knockOut(p);
      return true;
    }
    this.turn = this.next(p);
    return true;
  }

  knockOut(p) {
    this.out[p] = true;
    this.stock.unshift(...this.hands[p]);
    this.hands[p] = [];
    const alive = this.alive();
    if (alive.length === 1) { this.winner = alive[0]; this.over = true; return; }
    if (this.turn === p) { this.turn = this.next(p); }
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.knockOut(p);
  }

  // Computer player: defend if it can, keep jokers for attacks, pick the
  // suit it holds most of for a 7.
  botMove() {
    const p = this.turn;
    const can = this.playable(p);
    if (!can.length) return { draw: true };
    const order = can.slice().sort((a, b) => (isJoker(a) - isJoker(b)) || (attackOf(b) - attackOf(a)));
    const c = order[0];
    let suit = null;
    if (cardRank(c) === '7') {
      const count = Object.fromEntries(SUITS.map((s) => [s, 0]));
      for (const x of this.hands[p]) if (x !== c && cardSuit(x)) count[cardSuit(x)]++;
      suit = SUITS.reduce((a, b) => (count[b] > count[a] ? b : a));
    }
    return { card: c, suit };
  }
}

// ---------------------------------------------------------------- fruit bell
export const FRUITS = ['strawberry', 'tangerine', 'grape', 'peach'];
export const FRUIT_EMOJI = { strawberry: '🍓', tangerine: '🍊', grape: '🍇', peach: '🍑' };
// Per fruit: five 1s, three 2s, three 3s, two 4s, one 5 = 14, 56 in all.
const FRUIT_COUNTS = [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5];
export const BELL_TARGET = 5;

export function fruitDeck() {
  const d = [];
  for (const f of FRUITS) for (const n of FRUIT_COUNTS) d.push({ f, n });
  return d;
}

export class FruitBell {
  constructor({ players = 2, seed = 1 } = {}) {
    if (players < 2 || players > 4) throw new Error('fruit bell is for 2-4');
    this.n = players;
    const deck = shuffle(fruitDeck(), rng(seed));
    this.down = Array.from({ length: players }, () => []); // face down, top = last
    deck.forEach((c, i) => this.down[i % players].push(c));
    this.up = Array.from({ length: players }, () => []); // face up, top = last
    this.turn = 0;
    this.out = new Array(players).fill(false);
    this.winner = -1;
    this.over = false;
    this.last = null;
    this.flips = 0; // cards turned so far: a ring says which table it saw
    this.rungAt = -1; // the table a right ring already took
  }

  // Fruit totals over the top face-up card of everyone still in.
  totals() {
    const t = Object.fromEntries(FRUITS.map((f) => [f, 0]));
    this.up.forEach((pile, p) => {
      if (this.out[p] || !pile.length) return;
      const c = pile[pile.length - 1];
      t[c.f] += c.n;
    });
    return t;
  }

  bellRight() { return Object.values(this.totals()).some((v) => v === BELL_TARGET); }

  flip(p) {
    if (this.over || p !== this.turn || this.out[p]) return false;
    const c = this.down[p].pop();
    if (!c) return false;
    this.up[p].push(c);
    this.flips++;
    this.last = { p, flip: c };
    this.advance(p);
    return true;
  }

  advance(from) {
    // Next player who still has a card to flip. If nobody does, the one with
    // the most cards in total wins.
    for (let k = 1; k <= this.n; k++) {
      const t = (from + k) % this.n;
      if (!this.out[t] && this.down[t].length) { this.turn = t; return; }
    }
    this.finishByCount();
  }

  cardsOf(p) { return this.down[p].length + this.up[p].length; }

  finishByCount() {
    let best = -1;
    for (let p = 0; p < this.n; p++) if (!this.out[p] && (best < 0 || this.cardsOf(p) > this.cardsOf(best))) best = p;
    this.winner = best;
    this.over = true;
  }

  // A bell ring, in the order the host received them. Right: take every
  // face-up card. Wrong: give one card to each other player still in.
  // `at` is the flip count the ringer saw: a ring for a table somebody
  // already took (two hands on the bell at once) is dropped, not punished.
  ring(p, at = this.flips) {
    if (this.over || this.out[p] || at !== this.flips || this.rungAt === this.flips) return false;
    if (this.bellRight()) {
      this.rungAt = this.flips;
      const won = [];
      for (const pile of this.up) won.push(...pile.splice(0));
      // Won cards go face down under your pile.
      this.down[p].unshift(...won);
      this.last = { p, ring: true, got: won.length };
      this.turn = p;
    } else {
      let paid = 0;
      for (let q = 0; q < this.n; q++) {
        if (q === p || this.out[q]) continue;
        const c = this.down[p].shift() ?? this.up[p].shift();
        if (!c) break;
        this.down[q].unshift(c);
        paid++;
      }
      this.last = { p, ring: false, paid };
    }
    this.checkOut();
    return true;
  }

  checkOut() {
    for (let p = 0; p < this.n; p++) if (!this.out[p] && !this.cardsOf(p)) this.out[p] = true;
    const alive = this.out.map((o, p) => (o ? -1 : p)).filter((p) => p >= 0);
    if (alive.length === 1) { this.winner = alive[0]; this.over = true; return; }
    if (this.out[this.turn] || !this.down[this.turn].length) this.advance(this.turn);
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    this.up[p] = []; this.down[p] = [];
    this.checkOut();
  }
}

// ---------------------------------------------------------------- roulette
// Croc teeth, pirate barrel holes, bulldog bones: one hidden spot is the bad
// one. Players press one free spot each, in turn; who finds it loses and
// everyone else wins.
export class Roulette {
  constructor({ game = 'croc', players = 2, seed = 1 } = {}) {
    const g = GAMES[game];
    if (!g?.spots) throw new Error('not a roulette game');
    if (players < g.min || players > g.max) throw new Error('bad player count');
    this.game = game;
    this.n = players;
    this.spots = g.spots;
    this.bad = Math.floor(rng(seed)() * g.spots);
    this.pressed = [];
    this.turn = 0;
    this.out = new Array(players).fill(false);
    this.loser = -1;
    this.over = false;
    this.last = null;
  }

  free() {
    const f = [];
    for (let i = 0; i < this.spots; i++) if (!this.pressed.includes(i)) f.push(i);
    return f;
  }

  press(p, spot) {
    if (this.over || p !== this.turn || this.pressed.includes(spot) || spot < 0 || spot >= this.spots) return false;
    this.pressed.push(spot);
    const bang = spot === this.bad;
    this.last = { p, spot, bang };
    if (bang) { this.loser = p; this.over = true; return true; }
    this.turn = this.nextIn(p);
    return true;
  }

  nextIn(p) {
    let t = p;
    do t = (t + 1) % this.n; while (this.out[t]);
    return t;
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    if (this.out.filter((o) => !o).length < 2) { this.over = true; return; }
    if (this.turn === p) this.turn = this.nextIn(p);
  }

  botMove(rand = Math.random) {
    const f = this.free();
    return f[Math.floor(rand() * f.length)];
  }
}

// ---------------------------------------------------------------- thief
// 도둑잡기 (the joker game): 52 cards and one joker, all dealt out. Pairs of
// the same number are thrown away at once. On your turn you take one card,
// unseen, from the next player who still holds cards; a new pair is thrown
// away. Out of cards and you are safe. Whoever is left with the joker loses.
//
// Picking is two steps (Yozi 2026-11-23): 's' points at a card (everyone
// sees which one is lifted, so its holder can bluff with a face), 't' takes
// it. Every screen holds every hand, as with the other games here: nothing
// is won, so there is nothing worth peeking for.
export class Thief {
  constructor({ players = 2, seed = 1 } = {}) {
    if (players < 2 || players > 6) throw new Error('the joker game is for 2-6');
    this.n = players;
    this.rand = rng(seed);
    const deck = oneCardDeck().filter((c) => c !== 'JC');
    const cards = shuffle(deck, this.rand);
    this.hands = Array.from({ length: players }, () => []);
    cards.forEach((c, i) => this.hands[i % players].push(c));
    this.out = new Array(players).fill(false); // left the table
    this.pairs = new Array(players).fill(0);
    for (let p = 0; p < players; p++) this.dropPairs(p);
    this.turn = 0;
    this.sel = -1; // the card the turn player points at
    this.loser = -1;
    this.over = false;
    this.last = null;
    this.settle(0);
  }

  // Throw away every pair in a hand; returns the numbers thrown.
  dropPairs(p) {
    const h = this.hands[p];
    const thrown = [];
    for (let i = 0; i < h.length; i++) {
      if (isJoker(h[i])) continue;
      const j = h.findIndex((c, k) => k > i && !isJoker(c) && cardRank(c) === cardRank(h[i]));
      if (j < 0) continue;
      thrown.push(cardRank(h[i]));
      h.splice(j, 1);
      h.splice(i, 1);
      i--;
    }
    this.pairs[p] += thrown.length;
    return thrown;
  }

  holding(p) { return !this.out[p] && this.hands[p].length > 0; }
  holders() { const l = []; for (let p = 0; p < this.n; p++) if (this.holding(p)) l.push(p); return l; }
  nextHolder(p) {
    for (let k = 1; k <= this.n; k++) { const q = (p + k) % this.n; if (this.holding(q)) return q; }
    return -1;
  }
  // Who the turn player takes from.
  get from() { return this.over ? -1 : this.nextHolder(this.turn); }

  // After anything changes: is it over, and whose turn is it?
  settle(turn) {
    const left = this.holders();
    this.sel = -1;
    if (left.length <= 1) {
      this.over = true;
      this.loser = left.length === 1 && this.hands[left[0]].some(isJoker) ? left[0] : -1;
      return;
    }
    this.turn = this.holding(turn) ? turn : this.nextHolder(turn);
  }

  select(p, i) {
    if (this.over || p !== this.turn) return false;
    const q = this.from;
    if (i < 0 || i >= this.hands[q].length) return false;
    this.sel = i;
    return true;
  }

  take(p, i) {
    if (this.over || p !== this.turn) return false;
    const q = this.from;
    const h = this.hands[q];
    if (i < 0 || i >= h.length) return false;
    const [card] = h.splice(i, 1);
    const mine = this.hands[p];
    mine.splice(Math.floor(this.rand() * (mine.length + 1)), 0, card); // slipped in anywhere
    const thrown = this.dropPairs(p);
    this.last = { p, from: q, card, pair: thrown[0] ?? null };
    this.settle(this.nextHolder(p) < 0 ? p : (p + 1) % this.n);
    return true;
  }

  // Someone walks off: their cards are dealt round the others, so every
  // number can still find its pair.
  leave(p) {
    if (this.over || this.out[p]) return;
    const cards = this.hands[p];
    this.hands[p] = [];
    this.out[p] = true;
    const rest = this.holders();
    if (rest.length) cards.forEach((c, i) => this.hands[rest[i % rest.length]].push(c));
    for (const q of rest) this.dropPairs(q);
    this.last = null;
    this.settle(this.turn);
  }

  botMove(rand = Math.random) { return Math.floor(rand() * this.hands[this.from].length); }
}

// ---------------------------------------------------------------- ladders
// 뱀사다리 (snakes and ladders): an 8 x 8 board of our own, 64 squares.
// Roll one dice and walk; the foot of a ladder takes you up, a snake's head
// takes you down to its tail. First to the last square wins (a roll that is
// more than needed still gets there, so games stay short). A 6 rolls again.
// The dice come from the game's seed, so every screen rolls the same.
export const LADDERS_SIZE = 8;
export const LADDERS_END = LADDERS_SIZE * LADDERS_SIZE;
export const LADDERS_UP = { 3: 18, 8: 25, 21: 40, 29: 46, 36: 53, 43: 58 };
export const LADDERS_DOWN = { 62: 39, 55: 34, 49: 31, 44: 23, 27: 9, 16: 5 };

export class Ladders {
  constructor({ players = 2, seed = 1 } = {}) {
    if (players < GAMES.ladders.min || players > GAMES.ladders.max) throw new Error('bad player count');
    this.n = players;
    this.rand = rng(seed);
    this.pos = new Array(players).fill(0); // 0 = not on the board yet
    this.out = new Array(players).fill(false);
    this.turn = 0;
    this.rolls = 0;
    this.winner = -1;
    this.over = false;
    this.last = null;
  }

  roll(p) {
    if (this.over || p !== this.turn) return false;
    const dice = 1 + Math.floor(this.rand() * 6);
    const from = this.pos[p];
    const mid = Math.min(LADDERS_END, from + dice);
    const to = LADDERS_UP[mid] ?? LADDERS_DOWN[mid] ?? mid;
    this.pos[p] = to;
    this.rolls++;
    this.last = { p, dice, from, mid, to, via: to > mid ? 'ladder' : to < mid ? 'snake' : null };
    if (to === LADDERS_END) { this.winner = p; this.over = true; return true; }
    if (dice !== 6) this.turn = this.nextIn(p);
    return true;
  }

  nextIn(p) {
    let t = p;
    do t = (t + 1) % this.n; while (this.out[t]);
    return t;
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    const left = this.out.map((o, s) => (o ? -1 : s)).filter((s) => s >= 0);
    if (left.length < 2) { this.over = true; this.winner = left[0] ?? -1; return; }
    if (this.turn === p) this.turn = this.nextIn(p);
  }
}

// ---------------------------------------------------------------- tower
// 탑 쌓기 (a block tower): ten layers of three blocks, each layer turned a
// quarter from the one below. Take one block out in turn (it goes on top).
// A layer stands on its middle block or on both its side blocks: leave it
// less than that and the tower falls. Even a safe block may bring it down,
// as it comes out or as it goes on top:
// the tower wobbles a little more (1 to 4%) with every block taken (risk()), and the game's
// seeded dice decide, the same on every screen. Who knocks it over loses.
// Spot = layer * 3 + place (0 and 2 the sides, 1 the middle), layer 0 at the
// bottom. Same shape as Roulette (press, pressed, last.bang, loser), so the
// table screen treats it as one more toy.
export const TOWER_LAYERS = 10;
export const TOWER_RISK_STEPS = [0.01, 0.02, 0.03, 0.04]; // each block taken adds one of these, at random (Yozi 2026-11-23)
export const TOWER_RISK_MAX = 0.6;

export class Tower {
  constructor({ players = 2, seed = 1 } = {}) {
    const g = GAMES.tower;
    if (players < g.min || players > g.max) throw new Error('bad player count');
    this.game = 'tower';
    this.n = players;
    this.spots = g.spots;
    this.rand = rng(seed);
    this.pressed = [];
    this.wobble = 0; // the chance that the next block brings it down
    this.turn = 0;
    this.out = new Array(players).fill(false);
    this.loser = -1;
    this.over = false;
    this.last = null;
  }

  free() {
    const f = [];
    for (let i = 0; i < this.spots; i++) if (!this.pressed.includes(i)) f.push(i);
    return f;
  }

  // Would the layer still stand with this block gone?
  stands(spot) {
    const base = spot - (spot % 3);
    const has = (k) => base + k !== spot && !this.pressed.includes(base + k);
    return has(1) || (has(0) && has(2));
  }

  risk() { return Math.min(TOWER_RISK_MAX, this.wobble); }

  press(p, spot) {
    if (this.over || p !== this.turn || this.pressed.includes(spot) || spot < 0 || spot >= this.spots) return false;
    // Two chances to fall, each half the wobble: taking the block out, and
    // putting it on top (Yozi 2026-11-23). (Three throws every time, so
    // every screen's dice stay in step.)
    const half = this.risk() / 2;
    const pull = !this.stands(spot) || this.rand() < half, place = this.rand() < half;
    const more = TOWER_RISK_STEPS[Math.floor(this.rand() * TOWER_RISK_STEPS.length)];
    const bang = pull || place;
    this.pressed.push(spot);
    // The first time round the table is safe (Yozi 2026-11-23: with four
    // players it fell on the second round): wobble builds from the next block.
    if (this.pressed.length >= this.n) this.wobble = Math.round((this.wobble + more) * 100) / 100;
    this.last = { p, spot, bang, placing: bang && !pull }; // (placing: it fell as the block went on top)
    if (bang) { this.loser = p; this.over = true; return true; }
    this.turn = this.nextIn(p);
    return true;
  }

  nextIn(p) {
    let t = p;
    do t = (t + 1) % this.n; while (this.out[t]);
    return t;
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    if (this.out.filter((o) => !o).length < 2) { this.over = true; return; }
    if (this.turn === p) this.turn = this.nextIn(p);
  }

  // The computer takes a block the layer can spare (any block if none is left).
  botMove(rand = Math.random) {
    const f = this.free();
    const ok = f.filter((i) => this.stands(i));
    const from = ok.length ? ok : f;
    return from[Math.floor(rand() * from.length)];
  }
}

// One way to make any game, used by the table screen.
// opt: a game's own choice, a small number (omok: 1 = no double threes).
export function newGame(id, players, seed, opt = 0) {
  if (id === 'omok') return new Omok({ players, no33: opt === 1 });
  if (id === 'onecard') return new OneCard({ players, seed });
  if (id === 'fruitbell') return new FruitBell({ players, seed });
  if (ROULETTE.includes(id)) return new Roulette({ game: id, players, seed });
  if (id === 'thief') return new Thief({ players, seed });
  if (id === 'ladders') return new Ladders({ players, seed });
  if (id === 'tower') return new Tower({ players, seed });
  throw new Error('unknown game ' + id);
}

// Apply one action message to a game. Actions are tiny arrays so they fit a
// room message: ['o', x, y] omok, ['c', card, suit] / ['d'] one card,
// ['f'] flip / ['r'] ring, ['p', spot] roulette, ['s', i] point at / ['t', i]
// take a card in the joker game, ['d'] roll the dice in snakes and ladders,
// ['l'] leave. (['e', n] is a face a player
// pulls: the screen shows it, the rules never see it.)
export function applyAction(game, p, a) {
  if (!Array.isArray(a)) return false;
  switch (a[0]) {
    case 'o': return game instanceof Omok && game.play(p, a[1] | 0, a[2] | 0);
    case 'c': return game instanceof OneCard && game.put(p, String(a[1]), a[2] ?? null);
    case 'd': return game instanceof Ladders ? game.roll(p) : game instanceof OneCard && game.draw(p);
    case 'f': return game instanceof FruitBell && game.flip(p);
    case 'r': return game instanceof FruitBell && game.ring(p, a[1] ?? game.flips);
    case 'p': return (game instanceof Roulette || game instanceof Tower) && game.press(p, a[1] | 0);
    case 's': return game instanceof Thief && game.select(p, a[1] | 0);
    case 't': return game instanceof Thief && game.take(p, a[1] | 0);
    case 'l': game.leave(p); return true;
    default: return false;
  }
}

// ---------------------------------------------------------------- messages
// Room messages (game.net.sendEmote), all starting with "bg:":
//   bg:i:<to>:<game>            the host invites <to>
//   bg:a:<host> / bg:n:<host>   yes / no (or "I left") back to the host
//   bg:g:<gid>:<game>:<seed>:<ids>[:<opt>]   the start, to everyone: the line-up in
//                               seat order, host first; "~" is a computer
//   bg:x:<gid>:<act>            a player's move, to the host
//   bg:y:<gid>:<seat>:<act>     the host passes a move on, to everyone
//   bg:c:<gid>                  the host closed the game
// <act> is an action with dots: o.7.7, f, r, p.5, d, c.7♥.♠, s.3, t.3, e.2, l.
export const BG_ID = /^[\w-]{1,64}$/;
export const packAct = (a) => a.map((v) => (v == null ? '' : String(v))).join('.');
export function unpackAct(s) {
  const p = String(s).split('.');
  if (!/^[ofrpdclste]$/.test(p[0]) || p.length > 3) return null;
  return p.map((v, i) => (i === 0 || v === '' || !/^\d+$/.test(v) ? (v === '' ? null : v) : +v));
}
export function parseBg(e) {
  if (typeof e !== 'string' || !e.startsWith('bg:') || e.length > 600) return null;
  const p = e.split(':');
  const k = p[1];
  if (k === 'i' && p.length === 4 && BG_ID.test(p[2]) && GAMES[p[3]]) return { k, to: p[2], game: p[3] };
  if ((k === 'a' || k === 'n') && p.length === 3 && BG_ID.test(p[2])) return { k, to: p[2] };
  if (k === 'g' && (p.length === 6 || (p.length === 7 && /^\d$/.test(p[6]))) && BG_ID.test(p[2]) && GAMES[p[3]] && /^\d{1,10}$/.test(p[4])) {
    const ids = p[5].split(',');
    const g = GAMES[p[3]];
    if (ids.length < g.min || ids.length > g.max || ids.some((id) => id !== '~' && !BG_ID.test(id))) return null;
    if (new Set(ids.filter((id) => id !== '~')).size !== ids.filter((id) => id !== '~').length) return null;
    return { k, gid: p[2], game: p[3], seed: +p[4], ids, opt: +(p[6] || 0) };
  }
  if (k === 'x' && p.length === 4 && BG_ID.test(p[2]) && unpackAct(p[3])) return { k, gid: p[2], act: unpackAct(p[3]) };
  if (k === 'y' && p.length === 5 && BG_ID.test(p[2]) && /^\d$/.test(p[3]) && unpackAct(p[4])) return { k, gid: p[2], seat: +p[3], act: unpackAct(p[4]) };
  if (k === 'c' && p.length === 3 && BG_ID.test(p[2])) return { k, gid: p[2] };
  return null;
}
export const bgInvite = (to, game) => `bg:i:${to}:${game}`;
export const bgReply = (host, yes) => `bg:${yes ? 'a' : 'n'}:${host}`;
export const bgGo = (gid, game, seed, ids, opt = 0) => `bg:g:${gid}:${game}:${seed}:${ids.join(',')}${opt ? ':' + opt : ''}`;
export const bgMove = (gid, act) => `bg:x:${gid}:${packAct(act)}`;
export const bgPass = (gid, seat, act) => `bg:y:${gid}:${seat}:${packAct(act)}`;
export const bgClose = (gid) => `bg:c:${gid}`;

// Whose turn it is in any game (-1 when nobody's: the bell is a race).
export const turnOf = (g) => (g.over ? -1 : g.turn);
