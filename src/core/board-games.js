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
//  - mafia     마피아: night and day, the town votes the mafia out, 4-8.
//  - gimbap    김밥의 달인: two dice say how many fillings; press them in the
//    order's order, fastest hands take the roll, 2-4 (our own game).
//  - bingo     물고기 도감 빙고: fill a 5×5 or 4×4 board from the fish book's
//    pictures, call one fish each in turn; lines win, 2-6.

export const GAMES = {
  omok: { min: 2, max: 2, icon: '⚫', price: 30000 },
  onecard: { min: 2, max: 4, icon: '🃏', price: 30000 },
  fruitbell: { min: 2, max: 4, icon: '🔔', price: 30000 },
  croc: { min: 2, max: 6, icon: '🐊', price: 20000, spots: 13 },
  pirate: { min: 2, max: 6, icon: '🏴‍☠️', price: 20000, spots: 24 },
  bulldog: { min: 2, max: 6, icon: '🐶', price: 20000, spots: 12 },
  thief: { min: 2, max: 6, icon: '💀', price: 30000 },
  ladders: { min: 2, max: 4, icon: '🐍', price: 30000 },
  tower: { min: 2, max: 6, icon: '🧱', price: 30000, spots: 30 },
  mafia: { min: 4, max: 8, icon: '🌙', price: 30000 },
  gimbap: { min: 2, max: 4, icon: '🥢', price: 30000 },
  bingo: { min: 2, max: 6, icon: '🐟', price: 30000 },
};
export const GAME_IDS = Object.keys(GAMES);
export const ROULETTE = ['croc', 'pirate', 'bulldog'];
export const FACES = ['😏', '😱', '😇', '🤫', '😂', '👀']; // the faces a player can pull (the 'e' move)
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
  // no33: black (who goes first) may not make two open threes at once; white
  // may (the host turns the rule on or off, Yozi 2026-11-23).
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
      && !this.banned(x, y, p);
  }

  // A double three that the rule forbids this player.
  banned(x, y, p) { return this.no33 && p === 0 && this.doubleThree(x, y, p); }

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
    this.lastMove = [x, y];
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
        if (this.board[y * OMOK_SIZE + x] >= 0 || this.banned(x, y, p)) continue;
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
    this.final = false; // the last call for the bell (advance())
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
    // (the last call for the bell, and I have nothing left to turn: that was the game)
    if (!c) { if (!this.final) return false; this.final = false; this.finishByCount(); return true; }
    this.final = false;
    this.up[p].push(c);
    this.flips++;
    this.last = { p, flip: c };
    this.advance(p);
    return true;
  }

  // Who turns a card next. A game needs two people who still have cards to
  // turn: with one or none left it ends, the one with the most cards winning.
  // But the last card turned may have made five, and then the bell comes
  // first (`final`): the game waits for a ring, or for the turn player to
  // pass by turning (or by having nothing to turn; the host's clock does it
  // for them), and only then is it counted. (Before 2026-11-23 it ended the
  // moment the last card was turned, so that five could never be rung.)
  advance(from) {
    const can = (t) => !this.out[t] && this.down[t].length > 0;
    const left = [];
    for (let k = 1; k <= this.n; k++) { const t = (from + k) % this.n; if (can(t)) left.push(t); }
    if (left.length >= 2) { this.turn = left[0]; return; }
    if (this.bellRight() && this.rungAt !== this.flips) {
      this.final = true;
      this.turn = left.length ? left[0] : this.out[from] ? this.out.findIndex((o) => !o) : from;
      return;
    }
    this.finishByCount();
  }

  cardsOf(p) { return this.down[p].length + this.up[p].length; }

  // The most cards wins; the same number at the top is a draw (winner -1).
  finishByCount() {
    const alive = [];
    for (let p = 0; p < this.n; p++) if (!this.out[p]) alive.push(p);
    const top = Math.max(...alive.map((p) => this.cardsOf(p)));
    const best = alive.filter((p) => this.cardsOf(p) === top);
    this.winner = best.length === 1 ? best[0] : -1;
    this.final = false;
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
    // Whose turn now; and with fewer than two people left who can turn a card, the game is counted (advance()).
    const turners = alive.filter((p) => this.down[p].length > 0).length;
    if (this.out[this.turn] || !this.down[this.turn].length || turners < 2) this.advance(this.out[this.turn] || !this.down[this.turn].length ? this.turn : (this.turn + this.n - 1) % this.n);
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
    this.tip = -1; // the card the holder pushes up: "take this one" (true or a bluff)
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
    this.tip = -1;
    this.mixed = false; // (the holder may shuffle once each turn)
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

  // The one being picked from shuffles their hand, once a turn (Yozi
  // 2026-11-23): the picker cannot follow where the joker went.
  mix(p) {
    if (this.over || p !== this.from || this.mixed || this.hands[p].length < 2) return false;
    this.hands[p] = shuffle(this.hands[p], this.rand);
    this.mixed = true;
    this.sel = -1;
    this.tip = -1;
    return true;
  }

  // The one being picked from pushes one card up, as if to say "take this
  // one" (Yozi 2026-11-24). Everyone sees which card stands up, nobody what
  // it is. One card at a time; i = -1 puts it back down.
  suggest(p, i) {
    if (this.over || p !== this.from) return false;
    if (i < -1 || i >= this.hands[p].length || i === this.tip) return false;
    this.tip = i;
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

// With `custom` on (the host's choice), the board starts empty and the
// players lay it out first (Yozi 2026-11-23): each gets a share of ladders
// and snakes (LADDERS_SHARE) and they take turns putting one down, any two
// squares in different rows, up to LADDERS_REACH rows apart. Then the dice.
export const LADDERS_SHARE = { 2: [3, 3], 3: [2, 2], 4: [1, 1] }; // by players: [ladders, snakes] each
export const LADDERS_REACH = 4;
// A game can be given an end (Yozi 2026-11-24: with enough snakes a game need
// never finish): each player gets this many rolls, a 6's extra roll included,
// and when they are all used whoever is furthest ahead wins. 0 = no limit.
// The host picks one by its place in this list.
export const LADDERS_ROLLS = [0, 20, 30, 50];
// A ladders game's option as one small number: 1 = the players lay the board
// out themselves, plus twice the place of the roll limit in LADDERS_ROLLS.
export const laddersOpt = (custom, rolls = 0) => (custom ? 1 : 0) + 2 * (LADDERS_ROLLS[rolls] ? rolls : 0);
const ladderRow = (k) => Math.floor((k - 1) / LADDERS_SIZE);

export class Ladders {
  constructor({ players = 2, seed = 1, custom = false, max = 0 } = {}) {
    if (players < GAMES.ladders.min || players > GAMES.ladders.max) throw new Error('bad player count');
    this.max = Math.max(0, max | 0); // rolls each player gets (0: as many as it takes)
    this.used = new Array(players).fill(0); // rolls each player has made
    this.ranks = null; // when the game is over: each seat's place (1 = first; the same square shares a place; 0 = left the game)
    this.n = players;
    this.rand = rng(seed);
    this.pos = new Array(players).fill(0); // 0 = not on the board yet
    this.out = new Array(players).fill(false);
    this.turn = 0;
    this.rolls = 0;
    this.winner = -1;
    this.over = false;
    this.last = null;
    this.setup = !!custom; // still laying the board out
    this.up = custom ? {} : { ...LADDERS_UP };
    this.down = custom ? {} : { ...LADDERS_DOWN };
    // What each player still has to put down: [ladders, snakes].
    this.stock = Array.from({ length: players }, () => (custom ? [...LADDERS_SHARE[players]] : [0, 0]));
    // The finish wants the exact number the first time; a player who has
    // rolled past it once gets in with any roll that reaches (Yozi 2026-11-23).
    this.tried = new Array(players).fill(false);
  }

  // Squares a ladder or snake already starts or ends on.
  taken() { return new Set([...Object.entries(this.up), ...Object.entries(this.down)].flat().map(Number)); }

  // Can a ladder (kind 0) or a snake (kind 1) go between squares a and b?
  // (Either order: a ladder climbs from the lower, a snake bites at the higher.)
  canPlace(p, kind, a, b) {
    if (!this.setup || this.over || p !== this.turn || (kind !== 0 && kind !== 1) || !(this.stock[p][kind] > 0)) return false;
    if (!Number.isInteger(a) || !Number.isInteger(b) || Math.min(a, b) < 2 || Math.max(a, b) >= LADDERS_END) return false;
    const rows = Math.abs(ladderRow(a) - ladderRow(b));
    if (rows < 1 || rows > LADDERS_REACH) return false;
    const t = this.taken();
    return !t.has(a) && !t.has(b);
  }

  place(p, kind, a, b) {
    if (!this.canPlace(p, kind, a, b)) return false;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (kind === 0) this.up[lo] = hi; else this.down[hi] = lo;
    this.stock[p][kind]--;
    this.last = { p, placed: kind, from: kind === 0 ? lo : hi, to: kind === 0 ? hi : lo };
    this.nextPlacer(p);
    return true;
  }

  // The next player with something left to put down; nobody: the game starts.
  nextPlacer(p) {
    for (let k = 1; k <= this.n; k++) {
      const t = (p + k) % this.n;
      if (!this.out[t] && this.stock[t][0] + this.stock[t][1] > 0) { this.turn = t; return; }
    }
    this.setup = false;
    this.turn = this.out[0] ? this.nextIn(0) : 0;
  }

  // The computer's piece: any place that is allowed.
  botPlace(rand = Math.random) {
    const p = this.turn, kind = this.stock[p][0] > 0 && (this.stock[p][1] === 0 || rand() < 0.5) ? 0 : 1;
    for (let tries = 0; tries < 400; tries++) {
      const a = 2 + Math.floor(rand() * (LADDERS_END - 2)), b = 2 + Math.floor(rand() * (LADDERS_END - 2));
      if (this.canPlace(p, kind, a, b)) return [kind, a, b];
    }
    return null;
  }

  // Rolls a player still has (Infinity when the game has no limit).
  rollsLeft(p) { return this.max ? Math.max(0, this.max - this.used[p]) : Infinity; }
  canRoll(p) { return !this.out[p] && this.rollsLeft(p) > 0; }

  // The game is over: everyone still in is placed by how far they got. The
  // one who reached the last square (first) is ahead of all; the same square
  // shares a place, and a shared first place has no single winner.
  finish(first = -1) {
    this.over = true;
    const score = (s) => (s === first ? LADDERS_END + 1 : this.pos[s]);
    this.ranks = this.pos.map((_, s) => (this.out[s] ? 0 : 1 + this.pos.filter((__, t) => !this.out[t] && score(t) > score(s)).length));
    const top = this.ranks.map((r, s) => (r === 1 ? s : -1)).filter((s) => s >= 0);
    this.winner = top.length === 1 ? top[0] : -1;
  }

  roll(p) {
    if (this.over || this.setup || p !== this.turn || !this.canRoll(p)) return false;
    const dice = 1 + Math.floor(this.rand() * 6);
    const from = this.pos[p];
    const past = from + dice > LADDERS_END && !this.tried[p]; // too many, the first time: stay put
    if (past) this.tried[p] = true;
    const mid = past ? from : Math.min(LADDERS_END, from + dice);
    const to = past ? from : this.up[mid] ?? this.down[mid] ?? mid;
    this.pos[p] = to;
    this.rolls++;
    this.used[p]++;
    this.last = { p, dice, from, mid, to, past, via: to > mid ? 'ladder' : to < mid ? 'snake' : null };
    if (to === LADDERS_END) { this.finish(p); return true; }
    if (dice === 6 && this.canRoll(p)) return true; // (a 6 rolls again, while they have a roll left)
    const next = this.nextIn(p);
    if (next < 0) this.finish(); // (every roll has been used: the furthest ahead wins)
    else this.turn = next;
    return true;
  }

  // The next player after p who can still roll (p again, if they are the only one); nobody: -1.
  nextIn(p) {
    for (let k = 1; k <= this.n; k++) {
      const t = (p + k) % this.n;
      if (this.canRoll(t)) return t;
    }
    return -1;
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    this.stock[p] = [0, 0]; // (what they had not put down stays in the box)
    const left = this.out.map((o, s) => (o ? -1 : s)).filter((s) => s >= 0);
    if (left.length < 2) { this.finish(); return; }
    if (this.setup) { if (this.turn === p || this.stock.every((k) => k[0] + k[1] === 0)) this.nextPlacer(p); } else if (this.turn === p) {
      const next = this.nextIn(p);
      if (next < 0) this.finish(); // (the ones left have no rolls)
      else this.turn = next;
    }
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
// opt: a game's own choice, a small number (omok: 1 = no double threes for
// Black; ladders: laddersOpt, the board laid out by the players and the roll limit).
export function newGame(id, players, seed, opt = 0) {
  if (id === 'omok') return new Omok({ players, no33: opt === 1 });
  if (id === 'onecard') return new OneCard({ players, seed });
  if (id === 'fruitbell') return new FruitBell({ players, seed });
  if (ROULETTE.includes(id)) return new Roulette({ game: id, players, seed });
  if (id === 'thief') return new Thief({ players, seed });
  if (id === 'ladders') return new Ladders({ players, seed, custom: (opt & 1) === 1, max: LADDERS_ROLLS[opt >> 1] || 0 });
  if (id === 'tower') return new Tower({ players, seed });
  if (id === 'gimbap') return new Gimbap({ players, seed });
  if (id === 'bingo') return new Bingo({ players, seed, size: BINGO_SIZES[opt] || BINGO_SIZES[0] });
  if (id === 'mafia') return new Mafia({ players, seed, talk: MAFIA_TALK[opt] || MAFIA_TALK[0] });
  throw new Error('unknown game ' + id);
}

// Apply one action message to a game. Actions are tiny arrays so they fit a
// room message: ['o', x, y] omok, ['c', card, suit] / ['d'] one card,
// ['f'] flip / ['r'] ring, ['p', spot] roulette, ['s', i] point at / ['t', i]
// take a card / ['m'] shuffle my hand in the joker game, ['d'] roll the dice / ['a', kind, from, to]
// put a ladder (0) or snake (1) down in snakes and ladders,
// ['k', seat] the mafia's pick / ['h', seat] the doctor's / ['q', seat] the
// police officer's at night, ['z'] done talking, ['v', seat or 9] a vote,
// ['n', step] the host moves the game on when the clock runs out in mafia,
// ['d'] roll the two dice / ['b', round, ms] my roll is made, in so many
// milliseconds / ['n', round] the host calls the round in the gimbap game,
// ['g', board] my filled bingo board / ['w', fish] I call a fish / ['n'] the
// host's clock ends the filling in bingo,
// ['l'] leave. (['e', n] is a face a player
// pulls: the screen shows it, the rules never see it.)
export function applyAction(game, p, a) {
  if (!Array.isArray(a)) return false;
  switch (a[0]) {
    case 'o': return game instanceof Omok && game.play(p, a[1] | 0, a[2] | 0);
    case 'c': return game instanceof OneCard && game.put(p, String(a[1]), a[2] ?? null);
    case 'd': return game instanceof Ladders || game instanceof Gimbap ? game.roll(p) : game instanceof OneCard && game.draw(p);
    case 'b': return game instanceof Gimbap && game.done(p, a[1] | 0, a[2] | 0);
    case 'f': return game instanceof FruitBell && game.flip(p);
    case 'r': return game instanceof FruitBell && game.ring(p, a[1] ?? game.flips);
    case 'p': return (game instanceof Roulette || game instanceof Tower) && game.press(p, a[1] | 0);
    case 's': return game instanceof Thief && game.select(p, a[1] | 0);
    case 't': return game instanceof Thief && game.take(p, a[1] | 0);
    case 'm': return game instanceof Thief && game.mix(p);
    case 'u': return game instanceof Thief && game.suggest(p, a[1] == null ? -1 : a[1] | 0);
    case 'a': return game instanceof Ladders && game.place(p, a[1] | 0, a[2] | 0, a[3] | 0);
    case 'k': return game instanceof Mafia && game.kill(p, a[1] | 0);
    case 'h': return game instanceof Mafia && game.heal(p, a[1] | 0);
    case 'q': return game instanceof Mafia && game.check(p, a[1] | 0);
    case 'z': return game instanceof Mafia && game.done(p);
    case 'v': return game instanceof Mafia && game.vote(p, a[1] | 0);
    case 'n': return game instanceof Gimbap ? game.close(p, a[1] | 0) : game instanceof Bingo ? game.close() : game instanceof Mafia && game.next(p, a[1] | 0);
    case 'g': return game instanceof Bingo && game.setBoard(p, a[1]);
    case 'w': return game instanceof Bingo && game.call(p, a[1] | 0);
    case 'l': game.leave(p); return true;
    default: return false;
  }
}

// ---------------------------------------------------------------- mafia
// 마피아 (Yozi 2026-11-23): 4 to 8 people, no computer players (it is a game
// of talking). One mafia for 4-5, two for 6-8; one doctor, one police
// officer, the rest townspeople. It starts at night:
//  night  the mafia pick someone (with two, the last pick stands), the doctor
//         picks someone to save, the officer asks about one person and gets
//         the answer at once. The host's clock ends the night ('n').
//  talk   who died is told; everyone alive talks (alive × `talk` seconds, or
//         until everyone alive pressed "done").
//  vote   everyone alive votes for someone or passes (9). Most votes goes
//         out; a tie, or nobody voted for, and nobody goes.
// The town wins when no mafia is left; the mafia when they are as many as
// the others. A role is shown when the game is over, not at a death.
//
// As with the other games here every screen holds the whole game (the roles
// come from the seed): the screen shows a player only their own, and nothing
// is won, so there is nothing worth digging in the page for.
export const MAFIA_TALK = [15, 10, 15, 20]; // seconds each, by the host's option digit (0: not chosen)
export const MAFIA_NIGHT = 20, MAFIA_VOTE = 20, MAFIA_PASS = 9;
export class Mafia {
  constructor({ players = 4, seed = 1, talk = 15 } = {}) {
    if (players < GAMES.mafia.min || players > GAMES.mafia.max) throw new Error('mafia is for 4-8');
    this.n = players;
    this.talk = talk;
    const mafia = players >= 6 ? 2 : 1;
    const roles = [...new Array(mafia).fill('mafia'), 'doctor', 'police'];
    while (roles.length < players) roles.push('town');
    this.roles = shuffle(roles, rng(seed));
    this.alive = new Array(players).fill(true);
    this.out = new Array(players).fill(false); // left the table
    this.phase = 'night';
    this.round = 1;
    this.step = 0; // goes up with every change of phase (the host's 'n' names the one it ends)
    this.checks = []; // what the officer learned: { round, target, mafia }
    this.winner = null; // 'town' | 'mafia'
    this.over = false;
    this.last = null; // { died, saved } after a night, { voted, tie } after a vote
    this.clear();
  }

  clear() {
    this.pick = { kill: -1, heal: -1, check: -1 };
    this.votes = new Array(this.n).fill(-1);
    this.dones = new Array(this.n).fill(false);
  }

  get turn() { return -1; } // (nobody's turn: the phases run on the host's clock)
  living() { return this.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0); }
  can(p, role) { return !this.over && this.alive[p] && this.roles[p] === role; }
  // Seconds the phase lasts on the host's clock.
  seconds() { return this.phase === 'night' ? MAFIA_NIGHT : this.phase === 'vote' ? MAFIA_VOTE : this.living().length * this.talk; }

  kill(p, t) {
    if (this.phase !== 'night' || !this.can(p, 'mafia') || !this.alive[t] || this.roles[t] === 'mafia') return false;
    this.pick.kill = t;
    return true;
  }

  heal(p, t) {
    if (this.phase !== 'night' || !this.can(p, 'doctor') || !this.alive[t]) return false;
    this.pick.heal = t;
    return true;
  }

  // One question a night; the answer is kept for the officer's screen.
  check(p, t) {
    if (this.phase !== 'night' || !this.can(p, 'police') || !this.alive[t] || t === p || this.pick.check >= 0) return false;
    this.pick.check = t;
    this.checks.push({ round: this.round, target: t, mafia: this.roles[t] === 'mafia' });
    return true;
  }

  done(p) {
    if (this.phase !== 'talk' || this.over || !this.alive[p] || this.dones[p]) return false;
    this.dones[p] = true;
    if (this.living().every((i) => this.dones[i])) this.advance();
    return true;
  }

  vote(p, t) {
    if (this.phase !== 'vote' || this.over || !this.alive[p] || this.votes[p] >= 0) return false;
    if (t !== MAFIA_PASS && (!this.alive[t] || t === p)) return false;
    this.votes[p] = t;
    if (this.living().every((i) => this.votes[i] >= 0)) this.advance();
    return true;
  }

  // The host's clock ran out on phase number `step`. (Who the host is can
  // change when one leaves, so the panel checks the sender, not the rules.)
  next(p, step) {
    if (this.over || !(p >= 0 && p < this.n) || step !== this.step) return false;
    this.advance();
    return true;
  }

  advance() {
    this.step++;
    if (this.phase === 'night') {
      const t = this.pick.kill, saved = t >= 0 && t === this.pick.heal;
      if (t >= 0 && !saved) this.alive[t] = false;
      this.last = { died: t >= 0 && !saved ? t : -1, saved };
      this.phase = 'talk';
    } else if (this.phase === 'talk') {
      this.phase = 'vote';
    } else {
      const count = new Array(this.n).fill(0);
      for (const i of this.living()) if (this.votes[i] >= 0 && this.votes[i] !== MAFIA_PASS) count[this.votes[i]]++;
      const top = Math.max(...count), tops = count.filter((c) => c === top).length;
      const voted = top > 0 && tops === 1 ? count.indexOf(top) : -1;
      if (voted >= 0) this.alive[voted] = false;
      this.last = { voted, tie: top > 0 && tops > 1, count };
      this.phase = 'night';
      this.round++;
    }
    this.clear();
    this.judge();
  }

  judge() {
    const mafia = this.living().filter((i) => this.roles[i] === 'mafia').length, rest = this.living().length - mafia;
    if (mafia === 0) this.winner = 'town';
    else if (mafia >= rest) this.winner = 'mafia';
    if (this.winner) { this.over = true; this.phase = 'over'; }
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    this.alive[p] = false;
    if (this.pick.kill === p) this.pick.kill = -1;
    if (this.pick.heal === p) this.pick.heal = -1;
    for (let i = 0; i < this.n; i++) if (this.votes[i] === p) this.votes[i] = -1;
    this.judge();
    if (this.over) return;
    // (the ones still here may all be done already)
    if (this.phase === 'talk' && this.living().every((i) => this.dones[i])) this.advance();
    else if (this.phase === 'vote' && this.living().every((i) => this.votes[i] >= 0)) this.advance();
  }
}

// ---------------------------------------------------------------- gimbap
// 김밥의 달인 (Yozi 2026-11-24; our own game). In turn one player rolls two
// dice: their sum (2-12) is how many fillings this roll of gimbap takes. The
// order then shows that many of the twelve fillings, each once, in a row:
// everyone presses seaweed, rice, then the fillings in that order, and the
// fastest takes it. A small roll (2-5 fillings) counts 1, 6-9 counts 2,
// 10-12 counts 3; the first to 7 wins.
//
// Speed is each player's own: a screen times its player from the moment the
// order showed there and sends the time with 'b', so a slow line costs
// nobody the round. The host's clock ends the round ('n') a moment after the
// first finish, and the shortest time has it. (Nothing is won here, so a
// made-up time gains nothing but a hollow win; one too short for the hand is
// raised to the least a hand could do.)
export const GIMBAP_FILLINGS = ['danmuji', 'spinach', 'carrot', 'egg', 'ham', 'burdock', 'tuna', 'cheese', 'cucumber', 'crab', 'fishcake', 'perilla'];
export const GIMBAP_BASE = ['kim', 'rice']; // pressed first, every time
export const GIMBAP_GOAL = 7;
export const GIMBAP_PRESS_MS = 90; // the least one press takes
export const gimbapWorth = (n) => (n >= 10 ? 3 : n >= 6 ? 2 : 1);
export class Gimbap {
  constructor({ players = 2, seed = 1 } = {}) {
    if (players < GAMES.gimbap.min || players > GAMES.gimbap.max) throw new Error('gimbap is for 2-4');
    this.n = players;
    this.rand = rng(seed);
    this.score = new Array(players).fill(0);
    this.out = new Array(players).fill(false);
    this.times = new Array(players).fill(-1); // ms each took this round (-1: not done)
    this.roller = 0;
    this.phase = 'roll'; // 'roll' | 'make'
    this.round = 0;
    this.dice = null;
    this.order = []; // this round's fillings, as indexes into GIMBAP_FILLINGS
    this.winner = -1;
    this.over = false;
    this.last = null; // { roll: true, p, dice } after the dice; { round, won, ms, worth, times, order } after a round
  }

  get turn() { return this.phase === 'roll' ? this.roller : -1; } // (making is a race: nobody's turn)
  // What to press, in order: names from GIMBAP_BASE and GIMBAP_FILLINGS.
  seq() { return [...GIMBAP_BASE, ...this.order.map((i) => GIMBAP_FILLINGS[i])]; }

  roll(p) {
    if (this.over || this.phase !== 'roll' || p !== this.roller) return false;
    this.dice = [1 + Math.floor(this.rand() * 6), 1 + Math.floor(this.rand() * 6)];
    this.order = shuffle(GIMBAP_FILLINGS.map((_, i) => i), this.rand).slice(0, this.dice[0] + this.dice[1]);
    this.times.fill(-1);
    this.phase = 'make';
    this.round++;
    this.last = { roll: true, p, dice: this.dice };
    return true;
  }

  done(p, round, ms) {
    if (this.over || this.phase !== 'make' || round !== this.round || !(p >= 0 && p < this.n) || this.out[p] || this.times[p] >= 0) return false;
    this.times[p] = Math.max((this.order.length + GIMBAP_BASE.length) * GIMBAP_PRESS_MS, Math.min(600000, ms | 0));
    if (this.times.every((t, s) => this.out[s] || t >= 0)) this.settle();
    return true;
  }

  // The host's clock called the round (the panel checks it was the host).
  close(p, round) {
    if (this.over || this.phase !== 'make' || round !== this.round) return false;
    this.settle();
    return true;
  }

  settle() {
    let won = -1;
    this.times.forEach((t, s) => { if (t >= 0 && !this.out[s] && (won < 0 || t < this.times[won])) won = s; });
    const worth = gimbapWorth(this.order.length);
    if (won >= 0) this.score[won] += worth;
    this.last = { round: this.round, won, ms: won >= 0 ? this.times[won] : -1, worth, times: this.times.slice(), order: this.order.slice() };
    this.phase = 'roll';
    if (won >= 0 && this.score[won] >= GIMBAP_GOAL) { this.winner = won; this.over = true; return; }
    this.roller = this.nextIn(this.roller);
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
    if (left.length < 2) { this.winner = left[0] ?? -1; this.over = true; return; }
    if (this.phase === 'roll') { if (this.roller === p) this.roller = this.nextIn(p); } else if (this.times.every((t, s) => this.out[s] || t >= 0)) this.settle();
    if (!this.over && this.out[this.roller]) this.roller = this.nextIn(this.roller);
  }
}

// ---------------------------------------------------------------- bingo
// 물고기 도감 빙고 (Yozi 2026-11-24; the fish book's pictures). The game
// draws a pool of fish out of the book's 56 (30 for a 5×5 board, 20 for a
// 4×4: a little more than the cells, so a call is often, not always, on
// your board). Everyone fills their own board from the pool at once, in
// any order (or lets the rest fill at random), then in turn each calls one
// fish of the pool nobody has called yet: it is marked on every board that
// has it. Rows, columns and the two diagonals count; 3 lines on a 5×5 (2 on
// a 4×4) is bingo. Whoever gets there on a call wins; two at once share it.
// No hurry anywhere: a turn has the table's usual clock, and filling the
// board has its own long one (BINGO_SETUP_S).
//
// A board travels as one string, a letter a fish (BINGO_ABC[fish index in
// the book's picture sheet, core/fishing.js FISH_SHEET]). Every screen holds
// every board, as with every game here (nothing is won, so a peek gains
// nothing but a hollow win).
export const BINGO_KINDS = 56; // the fish book's pictures (core/fishing.js FISH_SHEET)
export const BINGO_SIZES = [5, 4]; // opt 0 / 1 (the host picks in the lobby)
export const BINGO_POOL = { 5: 30, 4: 20 };
export const BINGO_GOAL = { 5: 3, 4: 2 };
export const BINGO_SETUP_S = { 5: 120, 4: 90 }; // seconds to fill a board; then the empty cells fill at random
export const BINGO_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123';
export const bingoCode = (cells) => cells.map((f) => BINGO_ABC[f]).join('');
export const bingoCells = (code) => (typeof code === 'string' ? [...code].map((ch) => BINGO_ABC.indexOf(ch)) : []);
// Every line of an n×n board, as lists of cell indexes: rows, columns, the two diagonals.
export function bingoLines(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Array.from({ length: n }, (_, k) => i * n + k));
    out.push(Array.from({ length: n }, (_, k) => k * n + i));
  }
  out.push(Array.from({ length: n }, (_, k) => k * n + k));
  out.push(Array.from({ length: n }, (_, k) => k * n + n - 1 - k));
  return out;
}
export class Bingo {
  constructor({ players = 2, seed = 1, size = 5 } = {}) {
    if (players < GAMES.bingo.min || players > GAMES.bingo.max) throw new Error('bingo is for 2-6');
    if (!BINGO_SIZES.includes(size)) throw new Error('bingo is 5×5 or 4×4');
    this.n = players;
    this.size = size;
    this.goal = BINGO_GOAL[size];
    this.rand = rng(seed);
    this.pool = shuffle(Array.from({ length: BINGO_KINDS }, (_, i) => i), this.rand).slice(0, BINGO_POOL[size]).sort((a, b) => a - b);
    this.first = Math.floor(this.rand() * players); // who calls first
    this.lines = bingoLines(size);
    this.boards = new Array(players).fill(null); // each: size² fish, cell by cell
    this.out = new Array(players).fill(false);
    this.called = []; // fish, in the order called
    this.phase = 'setup'; // 'setup' | 'call'
    this.caller = this.first;
    this.winners = [];
    this.winner = -1;
    this.over = false;
    this.last = null; // { p, fish, hit: [seats whose board has it] } after a call
  }

  get turn() { return this.phase === 'call' ? this.caller : -1; } // (filling the boards: everyone at once)

  // My board, filled: size² different fish of the pool.
  setBoard(p, code) {
    if (this.over || this.phase !== 'setup' || !(p >= 0 && p < this.n) || this.out[p] || this.boards[p]) return false;
    const cells = bingoCells(code);
    if (!this.fits(cells)) return false;
    this.boards[p] = cells;
    if (this.boards.every((b, s) => b || this.out[s])) this.begin();
    return true;
  }

  fits(cells) {
    return cells.length === this.size * this.size && new Set(cells).size === cells.length && cells.every((f) => this.pool.includes(f));
  }

  // The host's clock ran out on the filling: whoever is not done gets the rest at random (the same everywhere).
  close() {
    if (this.over || this.phase !== 'setup') return false;
    this.boards = this.boards.map((b, s) => b || (this.out[s] ? null : this.randomBoard(this.rand)));
    this.begin();
    return true;
  }

  begin() {
    this.phase = 'call';
    if (this.out[this.caller]) this.caller = this.nextIn(this.caller);
  }

  randomBoard(rand, keep = null) {
    const cells = keep ? keep.slice() : new Array(this.size * this.size).fill(-1);
    const rest = shuffle(this.pool.filter((f) => !cells.includes(f)), rand);
    return cells.map((f) => (f >= 0 ? f : rest.pop()));
  }

  call(p, fish) {
    if (this.over || this.phase !== 'call' || p !== this.caller || !this.pool.includes(fish) || this.called.includes(fish)) return false;
    this.called.push(fish);
    this.last = { p, fish, hit: this.boards.map((b, s) => (b && !this.out[s] && b.includes(fish) ? s : -1)).filter((s) => s >= 0) };
    this.winners = this.boards.map((_, s) => s).filter((s) => !this.out[s] && this.linesOf(s) >= this.goal);
    if (this.winners.length) { this.winner = this.winners.length === 1 ? this.winners[0] : -1; this.over = true; return true; }
    this.caller = this.nextIn(this.caller);
    return true;
  }

  marked(s) { return (this.boards[s] || []).map((f) => this.called.includes(f)); }
  // The lines a board has done, as indexes into this.lines.
  doneLines(s) { const m = this.marked(s); return m.length ? this.lines.map((l, i) => (l.every((c) => m[c]) ? i : -1)).filter((i) => i >= 0) : []; }
  linesOf(s) { return this.doneLines(s).length; }

  // The computer's call (and a call made for someone whose clock ran out): the fish that brings its own board
  // nearest a line; with nothing of its own left, any fish.
  botCall(s, rand = Math.random) {
    const left = this.pool.filter((f) => !this.called.includes(f));
    const b = this.boards[s] || [], m = this.marked(s);
    let best = [], top = -1;
    for (const f of left) {
      const c = b.indexOf(f);
      const v = c < 0 ? 0 : 1 + this.lines.filter((l) => l.includes(c)).reduce((a, l) => a + l.filter((k) => m[k]).length ** 2, 0);
      if (v > top) { top = v; best = [f]; } else if (v === top) best.push(f);
    }
    return best[Math.floor(rand() * best.length)] ?? -1;
  }

  nextIn(p) {
    let t = p;
    do t = (t + 1) % this.n; while (this.out[t] && t !== p);
    return t;
  }

  leave(p) {
    if (this.over || this.out[p]) return;
    this.out[p] = true;
    const left = this.out.map((o, s) => (o ? -1 : s)).filter((s) => s >= 0);
    if (left.length < 2) { this.winner = left[0] ?? -1; this.winners = left.slice(0, 1); this.over = true; return; }
    if (this.phase === 'setup') { if (this.boards.every((b, s) => b || this.out[s])) this.begin(); } else if (this.caller === p) this.caller = this.nextIn(p);
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
//   bg:w:<gid>:<1|0>            a player's page went out of sight (1) / is back (0), to everyone
// <act> is an action with dots: o.7.7, f, r, p.5, d, c.7♥.♠, s.3, t.3, e.2, l.
export const BG_ID = /^[\w-]{1,64}$/;
export const packAct = (a) => a.map((v) => (v == null ? '' : String(v))).join('.');
export function unpackAct(s) {
  const p = String(s).split('.');
  if (!/^[ofrpdclsteakhqzvnmubgw]$/.test(p[0]) || p.length > (p[0] === 'a' ? 4 : 3)) return null;
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
  if (k === 'w' && p.length === 4 && BG_ID.test(p[2]) && /^[01]$/.test(p[3])) return { k, gid: p[2], away: p[3] === '1' };
  return null;
}
export const bgInvite = (to, game) => `bg:i:${to}:${game}`;
export const bgReply = (host, yes) => `bg:${yes ? 'a' : 'n'}:${host}`;
export const bgGo = (gid, game, seed, ids, opt = 0) => `bg:g:${gid}:${game}:${seed}:${ids.join(',')}${opt ? ':' + opt : ''}`;
export const bgMove = (gid, act) => `bg:x:${gid}:${packAct(act)}`;
export const bgPass = (gid, seat, act) => `bg:y:${gid}:${seat}:${packAct(act)}`;
export const bgClose = (gid) => `bg:c:${gid}`;
export const bgAway = (gid, away) => `bg:w:${gid}:${away ? 1 : 0}`;
// Away from the table (Yozi 2026-11-24): a player whose page is out of sight (another tab, another app, the
// screen off) may stay away as long as it is not their turn. When their turn comes they have the turn's clock
// to come back; if it runs out while they are away they are out of the game, and the rest play on.
// (ui/board-games-ui.js onSight, onTick.)

// Whose turn it is in any game (-1 when nobody's: the bell is a race).
export const turnOf = (g) => (g.over ? -1 : g.turn);
