// Yutnori panel (rules in core/yut-game.js, text in folk-text.js): you
// against one to three locals at a straw mat. Throw, then tap a piece and
// where it should go; the computer players take their turns on their own.
// Wins are kept on this device; a win pays coins through onWin.
import { YutGame, throwSticks, chooseMove, THROW_KO, STEPS, SPOT_XY, isBig, HOME, OUT } from '../core/yut-game.js';
import { FL, lineText } from './folk-text.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#d64541', '#2f5fa8', '#e2a72e', '#3f8a55'];
const ANIMAL = { do: 'a.pig', gae: 'a.dog', geol: 'a.sheep', yut: 'a.cow', mo: 'a.horse' };
const WINS_KEY = 'mk.folk.yutWins';
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const svg = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const P = (s) => [10 + SPOT_XY[s][0] * 80, 10 + SPOT_XY[s][1] * 80];

// "걸 geol · 🐑 sheep · 3 steps"
export function throwLabel(kind) {
  const [ko, rom, icon] = THROW_KO[kind];
  const steps = kind === 'backdo' ? FL('yut.back') : STEPS[kind] === 1 ? FL('yut.step1') : FL('yut.steps', { n: STEPS[kind] });
  return [ko, rom, (icon ? icon + ' ' + FL(ANIMAL[kind]) + ' · ' : '') + steps];
}

export class YutUI {
  // root: the sheet; store: localStorage; onSay(line) a local speaks;
  // onWin(): you won a game (returns coins paid, or 0); rand for tests.
  constructor({ root, store = globalThis.localStorage, onSay, onWin, onClose, rand = Math.random, speed = 1 }) {
    Object.assign(this, { root, store, onSay, onWin, onClose, rand, speed });
    this.players = 2;
    this.pieces = 4;
    this.timer = 0;
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
      if (this.canThrow()) { e.preventDefault(); e.stopPropagation(); this.doThrow(); }
    };
  }

  get open() { return !this.root.hidden; }
  get wins() { try { return +this.store?.getItem(WINS_KEY) || 0; } catch { return 0; } }

  show() {
    this.root.hidden = false;
    this.renderStart();
    this.say('yutHello');
  }
  close() {
    this._stop();
    this.root.hidden = true;
    this.onClose?.();
  }
  _stop() {
    clearTimeout(this.timer);
    this.timer = 0;
    window.removeEventListener('keydown', this.onKey, true);
    this.game = null;
  }
  say(key) { this.onSay?.(lineText(key)); }
  name(p) { return p === 0 ? FL('yut.you') : p === 1 ? FL('yut.grandma') : ['Minjun', 'Seoyeon'][p - 2]; }

  _frame() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', FL('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎲 ' + FL('yut.title')));
  }

  renderStart(note) {
    this._stop();
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    this.root.append(el('p', 'order-hint', FL('yut.howTo')), el('p', 'kimchi-fact', '🏮 ' + FL('yut.fact')));
    const pick = (label, values, cur, set) => {
      const row = el('div', 'folk-pick');
      row.append(el('span', 'order-label', label));
      for (const v of values) {
        const b = el('button', 'chip', String(v));
        b.setAttribute('aria-pressed', String(v === cur));
        b.onclick = () => { set(v); this.renderStart(note); };
        row.append(b);
      }
      return row;
    };
    this.root.append(
      pick(FL('yut.opponents'), [2, 3, 4], this.players, (v) => { this.players = v; }),
      pick(FL('yut.pieces'), [2, 4], this.pieces, (v) => { this.pieces = v; }),
      el('p', 'grill-best', FL('yut.wins', { n: this.wins })),
    );
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', '🎲 ' + FL('start'));
    go.onclick = () => this.begin();
    actions.append(go);
    this.root.append(actions);
  }

  begin() {
    this._stop();
    this.game = new YutGame({ players: this.players, pieces: this.pieces });
    this.sel = null; // the unit you picked
    this.anim = null;
    this.sticks = null;
    this.status = FL('yut.yourTurn');
    window.addEventListener('keydown', this.onKey, true);
    this._frame();
    this.ui = {
      players: el('div', 'yut-players'),
      board: svg('svg', { viewBox: '0 0 100 100', class: 'yut-board', role: 'img', 'aria-label': FL('yut.title') }),
      sticks: el('div', 'yut-sticks'),
      result: el('div', 'yut-result'),
      status: el('p', 'karaoke-status yut-status'),
      tray: el('div', 'yut-tray'),
      actions: el('div', 'order-actions yut-actions'),
    };
    const throwBtn = el('button', 'primary', '🥢 ' + FL('yut.throw'));
    throwBtn.onclick = () => this.doThrow();
    this.ui.throwBtn = throwBtn;
    this.ui.actions.append(throwBtn);
    const mid = el('div', 'yut-mid');
    mid.append(this.ui.sticks, this.ui.result);
    this.root.append(this.ui.players, this.ui.board, mid, this.ui.status, this.ui.tray, this.ui.actions);
    this.render();
  }

  canThrow() { const g = this.game; return !!g && !this.anim && g.turn === 0 && g.phase === 'throw'; }

  doThrow() {
    if (!this.canThrow()) return;
    this._throw();
  }
  _throw() {
    const g = this.game;
    const { sticks, kind } = throwSticks(this.rand);
    this.sticks = { sticks, kind, n: (this.sticks?.n || 0) + 1 };
    const who = g.turn;
    g.throw(kind);
    this.sel = null;
    if (g.last.lost) this.status = FL('yut.lost');
    else if (g.turn === who && g.phase === 'throw') this.status = FL('yut.oneMore');
    else if (g.turn === who) this.status = who === 0 ? FL('yut.pick') : FL('yut.theirTurn', { name: this.name(who) });
    if (g.turn === 0 && g.phase === 'move') this._autoSelect();
    this.render();
    this._afterAction(who);
  }

  // Only one thing you can move: pick it for you.
  _autoSelect() {
    const units = new Set(this.game.options().map((o) => o.from));
    if (units.size === 1) this.sel = [...units][0];
  }

  pickUnit(from) {
    const g = this.game;
    if (!g || this.anim || g.turn !== 0 || g.phase !== 'move') return;
    if (!g.options().some((o) => o.from === from)) return;
    this.sel = this.sel === from ? null : from;
    this.render();
  }

  pickDest(opt) {
    const g = this.game;
    if (!g || this.anim || g.turn !== 0) return;
    this._move(opt);
  }

  _move(opt) {
    const g = this.game, who = g.turn;
    const last = g.move(opt.i, opt.from);
    this.sel = null;
    if (last.caught) { this.status = who === 0 ? FL('yut.caught') : FL('yut.gotCaught', { name: this.name(who) }); this.say('caught'); }
    else if (last.joined) { this.status = FL('yut.stacked'); if (who === 0) this.say('stacked'); }
    else if (last.dest === OUT) this.status = FL('yut.out');
    else if (g.phase === 'move' && g.turn === 0) this.status = FL('yut.pick');
    else if (g.turn === 0 && g.phase === 'throw') this.status = g.last?.lost ? FL('yut.lost') : FL('yut.yourTurn');
    else this.status = FL('yut.theirTurn', { name: this.name(g.turn) });
    // Walk the piece along its path, one spot at a time.
    this.anim = { player: who, path: last.path, pieces: last.pieces, i: 0, dest: last.dest };
    const stepMs = 170 / this.speed;
    const tick = () => {
      if (!this.game) return;
      this.anim.i++;
      if (this.anim.i >= this.anim.path.length) {
        this.anim = null;
        if (g.turn === 0 && g.phase === 'move') this._autoSelect();
        this.render();
        if (g.phase === 'over') this._over();
        else this._afterAction(who);
        return;
      }
      this.render();
      this.timer = setTimeout(tick, stepMs);
    };
    this.render();
    this.timer = setTimeout(tick, stepMs);
  }

  // Computer players act after a short pause.
  _afterAction() {
    const g = this.game;
    if (!g || g.phase === 'over' || g.turn === 0) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.game || this.anim) return;
      if (g.phase === 'throw') this._throw(); else if (g.phase === 'move') {
        const o = chooseMove(g, this.rand);
        if (o) this._move(o);
      }
    }, 750 / this.speed);
  }

  _over() {
    const g = this.game;
    clearTimeout(this.timer);
    let note;
    if (g.winner === 0) {
      try { this.store?.setItem(WINS_KEY, String(this.wins + 1)); } catch { /* storage blocked */ }
      const coins = this.onWin?.() || 0;
      note = FL('yut.win') + (coins ? '  🪙 +' + coins : '');
      this.say('won');
    } else note = FL('yut.lose', { name: this.name(g.winner) });
    this.status = note;
    this.render();
    const actions = this.ui.actions;
    actions.replaceChildren();
    const again = el('button', 'primary', '🎲 ' + FL('again'));
    again.onclick = () => this.begin();
    const back = el('button', null, FL('close'));
    back.onclick = () => this.close();
    actions.append(back, again);
  }

  render() {
    const g = this.game, ui = this.ui;
    if (!g || !ui) return;
    // Players: colour, name, pieces waiting and out.
    ui.players.replaceChildren();
    g.players.forEach((pl, p) => {
      const c = el('div', 'yut-player' + (p === g.turn && g.phase !== 'over' ? ' on' : ''));
      c.style.setProperty('--c', COLORS[p]);
      const home = pl.pieces.filter((x) => x.at === HOME).length, out = g.piecesOut(p);
      c.append(el('i'), el('strong', null, this.name(p)), el('small', null, '⏳' + home + ' · 🏁' + out));
      ui.players.append(c);
    });
    // Board.
    const b = ui.board;
    b.replaceChildren();
    b.append(svg('rect', { x: 2, y: 2, width: 96, height: 96, rx: 6, class: 'yut-cloth' }));
    b.append(svg('path', { d: 'M10 10H90V90H10Z M10 10L90 90 M90 10L10 90', class: 'yut-lines' }));
    for (let s = 0; s < 29; s++) {
      const [x, y] = P(s);
      b.append(svg('circle', { cx: x, cy: y, r: isBig(s) ? 4.4 : 2.9, class: isBig(s) ? 'yut-spot big' : 'yut-spot' }));
    }
    const [sx, sy] = P(0);
    const startTxt = svg('text', { x: sx, y: sy + 8.6, class: 'yut-start' });
    startTxt.textContent = '출발 START';
    b.append(startTxt);
    const opts = g.turn === 0 && g.phase === 'move' && !this.anim ? g.options() : [];
    // Tokens.
    const drawToken = (p, s, n, extraCls = '') => {
      const [x, y] = P(s);
      const t = svg('g', { class: 'yut-token' + extraCls, transform: `translate(${x} ${y})` });
      t.append(svg('circle', { r: 3.8, fill: COLORS[p] }));
      if (n > 1) { const tx = svg('text', { y: 1.5, class: 'yut-count' }); tx.textContent = '×' + n; t.append(tx); }
      return t;
    };
    g.players.forEach((pl, p) => {
      const counts = new Map();
      for (const x of pl.pieces) if (x.at !== HOME && x.at !== OUT) counts.set(x.at, (counts.get(x.at) || 0) + 1);
      for (const [s, n0] of counts) {
        let n = n0;
        if (this.anim && this.anim.player === p && s === this.anim.dest) n -= this.anim.pieces;
        if (n <= 0) continue;
        const mine = p === 0 && opts.some((o) => o.from === s);
        const t = drawToken(p, s, n, (mine ? ' can' : '') + (this.sel === s ? ' sel' : ''));
        if (mine) t.addEventListener('click', () => this.pickUnit(s));
        b.append(t);
      }
    });
    if (this.anim) {
      const s = this.anim.path[this.anim.i];
      if (s !== OUT) b.append(drawToken(this.anim.player, s, this.anim.pieces, ' moving'));
    }
    // Where the picked piece can go.
    if (this.sel != null) {
      const seen = new Set();
      for (const o of opts.filter((q) => q.from === this.sel)) {
        if (seen.has(o.dest)) continue;
        seen.add(o.dest);
        const [x, y] = o.dest === OUT ? [sx + 0, sy - 0] : P(o.dest);
        const tgt = svg('g', { class: 'yut-dest', transform: `translate(${o.dest === OUT ? x - 6 : x} ${o.dest === OUT ? y + 0.5 : y})` });
        tgt.append(svg('circle', { r: 5.2 }));
        const tx = svg('text', { y: 1.6 });
        tx.textContent = o.dest === OUT ? '🏁' : THROW_KO[o.kind][0];
        tgt.append(tx);
        tgt.addEventListener('click', () => this.pickDest(o));
        b.append(tgt);
      }
    }
    // Sticks and what they count as.
    ui.sticks.replaceChildren();
    ui.result.replaceChildren();
    if (this.sticks) {
      this.sticks.sticks.forEach((flat, i) => {
        const s = el('i', 'yut-stick' + (flat ? ' flat' : '') + (i === 0 ? ' marked' : ''));
        s.style.setProperty('--r', ((i - 1.5) * 9 + (this.sticks.n % 3) * 4) + 'deg');
        ui.sticks.append(s);
      });
      ui.sticks.dataset.n = this.sticks.n; // restarts the toss animation
      const [ko, rom, meaning] = throwLabel(this.sticks.kind);
      ui.result.append(el('strong', null, ko + '!'), el('span', 'order-rom', rom), el('small', null, meaning));
    }
    ui.status.textContent = this.status || '';
    // Your saved throws and your waiting pieces.
    ui.tray.replaceChildren();
    if (g.turn === 0 && g.pending.length) {
      const row = el('div', 'yut-pending');
      for (const k of g.pending) row.append(el('span', 'chip yut-throw', THROW_KO[k][0] + ' ' + (k === 'backdo' ? '−1' : '+' + STEPS[k])));
      ui.tray.append(row);
    }
    const home = g.players[0].pieces.filter((x) => x.at === HOME).length;
    if (home && g.phase !== 'over') {
      const can = opts.some((o) => o.from === HOME);
      const h = el('button', 'chip yut-home' + (this.sel === HOME ? ' sel' : ''), '⏳ ' + FL('yut.home') + ' ×' + home);
      h.style.setProperty('--c', COLORS[0]);
      h.disabled = !can;
      h.onclick = () => this.pickUnit(HOME);
      ui.tray.append(h);
    }
    if (ui.throwBtn) ui.throwBtn.disabled = !this.canThrow();
  }
}
