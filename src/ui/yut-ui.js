// Yutnori panel (rules in core/yut-game.js, text in folk-text.js): you
// against one to three locals at a straw mat, or with people standing round
// it (core/yut-net.js: the host invites them, empty seats stay locals).
// Hold the throw button and let go, then tap a piece and where it should
// go; the locals take their turns on their own. Wins are kept on this
// device; a win pays coins through onWin.
import { YutGame, throwSticks, chooseMove, THROW_KO, STEPS, SPOT_XY, isBig, HOME, OUT } from '../core/yut-game.js';
import { YUT_BOT, yutInvite, yutReply, yutGo, yutAct, yutKick, yutClose, yutRng, gaugeAt } from '../core/yut-net.js';
import { FL, lineText } from './folk-text.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#d64541', '#2f5fa8', '#e2a72e', '#3f8a55'];
const ANIMAL = { do: 'a.pig', gae: 'a.dog', geol: 'a.sheep', yut: 'a.cow', mo: 'a.horse' };
const WINS_KEY = 'mk.folk.yutWins';
const ASK_MS = 30000; // an invite not answered by then is dropped
const LOBBY_MS = 2500; // the start sheet looks again for people round the mat
const AWAY_MS = 40000; // a player who doesn't play their turn for this long gives the seat to a local
const LOCALS = [() => FL('yut.grandma'), () => 'Minjun', () => 'Seoyeon'];
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
  // net (in the yard, to play with people round the mat; core/yut-net.js):
  // { myId, nameOf(id), nearby() → [{ id, name }], send(msg) }.
  constructor({ root, store = globalThis.localStorage, onSay, onWin, onClose, net = null, rand = Math.random, speed = 1 }) {
    Object.assign(this, { root, store, onSay, onWin, onClose, net, rand, speed });
    this.players = 2;
    this.pieces = 4;
    this.timer = 0;
    this.seats = null; // a game with people: { gid, ids, host, mine, n, rng }
    this.lobby = new Map(); // (host) id → { name, yes, until }
    this.waitHost = null; // (guest) { id, name }: waiting for their game
    this.queue = []; // other players' moves that came during an animation
    this.hold = 0; // when the throw button was pressed (the gauge)
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter')) return;
      if (e.type === 'keydown') {
        if (e.repeat || !this.canThrow()) return;
        e.preventDefault(); e.stopPropagation();
        this.press();
      } else if (this.hold) { e.preventDefault(); e.stopPropagation(); this.release(); }
    };
  }

  get open() { return !this.root.hidden; }
  get wins() { try { return +this.store?.getItem(WINS_KEY) || 0; } catch { return 0; } }
  get busy() { return this.open && (!!this.seats || !!this.waitHost); }

  show() {
    this.root.hidden = false;
    this.renderStart();
    this.say('yutHello');
  }
  close() {
    this._leaveNet();
    this._stop();
    this.waitHost = null;
    this.root.hidden = true;
    this.onClose?.();
  }
  _stop() {
    clearTimeout(this.timer);
    clearTimeout(this.idleTimer);
    clearTimeout(this.lobbyTimer);
    cancelAnimationFrame(this.gaugeRaf);
    this.timer = this.idleTimer = this.hold = 0;
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.onKey, true);
    this.game = null;
    this.queue = [];
  }
  // Leaving a game with people (or the lobby): tell them.
  _leaveNet() {
    const s = this.seats, net = this.net;
    if (net) {
      if (s && s.host === net.myId) net.send(yutClose(s.gid));
      else if (s && s.mine >= 0 && this.game?.phase !== 'over') net.send(yutKick(s.gid, s.mine));
      if (this.waitHost && !s) net.send(yutReply(this.waitHost.id, false));
      for (const [id] of this.lobby) net.send(yutReply(id, false));
    }
    this.lobby.clear();
    this.seats = null;
  }
  say(key) { this.onSay?.(lineText(key)); }

  // Seats: 0 is you on your own; with people, seats.mine (-1 once a local took it).
  get mySeat() { return this.seats ? this.seats.mine : 0; }
  mine(p) { return p === this.mySeat; }
  // The seats this browser plays for the locals.
  playsFor(p) {
    const s = this.seats;
    if (!s) return p !== 0;
    return s.ids[p] === YUT_BOT && s.host === this.net.myId;
  }
  name(p) {
    const s = this.seats;
    if (!s) return p === 0 ? FL('yut.you') : LOCALS[p - 1]();
    const id = s.ids[p];
    if (id === this.net.myId && p === s.mine) return FL('yut.you');
    if (id === YUT_BOT) return LOCALS[s.ids.slice(0, p).filter((x) => x === YUT_BOT).length]();
    return this.net.nameOf(id) || '?';
  }

  _frame() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', FL('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎲 ' + FL('yut.title')));
  }

  renderStart(note) {
    this._stop();
    this.seats = null;
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    this.root.append(el('p', 'order-hint', FL('yut.howTo')), el('p', 'kimchi-fact', '🏮 ' + FL('yut.fact')));
    const yes = [...this.lobby.values()].filter((q) => q.yes).length;
    const pick = (label, values, cur, set) => {
      const row = el('div', 'folk-pick');
      row.append(el('span', 'order-label', label));
      for (const v of values) {
        const b = el('button', 'chip', String(v));
        b.setAttribute('aria-pressed', String(v === cur));
        b.disabled = v < yes + 1;
        b.onclick = () => { set(v); this.renderStart(note); };
        row.append(b);
      }
      return row;
    };
    this.root.append(
      pick(FL('yut.opponents'), [2, 3, 4], Math.max(this.players, yes + 1), (v) => { this.players = v; }),
      pick(FL('yut.pieces'), [2, 4], this.pieces, (v) => { this.pieces = v; }),
    );
    if (this.net) this.root.append(this._lobbyList());
    this.root.append(el('p', 'grill-best', FL('yut.wins', { n: this.wins })));
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', '🎲 ' + FL('start'));
    go.onclick = () => this.begin();
    actions.append(go);
    this.root.append(actions);
    // People come and go round the mat: look again in a moment.
    clearTimeout(this.lobbyTimer);
    if (this.net) this.lobbyTimer = setTimeout(() => { if (this.open && !this.game && !this.waitHost) this.renderStart(note); }, LOBBY_MS);
  }

  // (host) The people round the mat, to invite; who said yes.
  _lobbyList() {
    const box = el('div', 'yut-lobby');
    box.append(el('span', 'order-label', '👥 ' + FL('yut.people')));
    const now = Date.now();
    for (const [id, q] of this.lobby) if (!q.yes && q.until < now) this.lobby.delete(id);
    const near = this.net.nearby().filter((p) => !this.lobby.has(p.id)).slice(0, 6);
    if (!near.length && !this.lobby.size) { box.append(el('p', 'order-hint', FL('yut.nobody'))); return box; }
    for (const q of this.lobby.values()) {
      const row = el('div', 'yut-person');
      row.append(el('strong', null, q.name), el('small', null, q.yes ? FL('yut.joined') : FL('yut.asked')));
      box.append(row);
    }
    for (const p of near) {
      const row = el('div', 'yut-person');
      const b = el('button', 'chip', FL('yut.invite'));
      b.disabled = this.lobby.size >= 3;
      b.onclick = () => this.invite(p);
      row.append(el('strong', null, p.name), b);
      box.append(row);
    }
    return box;
  }
  invite(p) {
    if (!this.net || this.lobby.size >= 3 || this.lobby.has(p.id)) return;
    this.lobby.set(p.id, { name: p.name, yes: false, until: Date.now() + ASK_MS });
    this.net.send(yutInvite(p.id));
    this.renderStart();
  }

  // (guest) Said yes to someone's invite: wait for them to start.
  join(host) {
    this._leaveNet();
    this._stop();
    this.root.hidden = false;
    this.waitHost = host;
    this.net.send(yutReply(host.id, true));
    this.renderWait();
  }
  renderWait(note) {
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    this.root.append(el('p', 'order-hint', FL('yut.waiting', { name: this.waitHost.name })), el('p', 'kimchi-fact', '🏮 ' + FL('yut.howTo')));
    const actions = el('div', 'order-actions');
    const back = el('button', null, FL('yut.leave'));
    back.onclick = () => this.close();
    actions.append(back);
    this.root.append(actions);
  }

  // A room message (parsed by core/yut-net.js) from someone here.
  onNet(from, m) {
    const net = this.net;
    if (!net || from === net.myId) return;
    const s = this.seats;
    if (m.k === 'a' || m.k === 'n') {
      if (m.host !== net.myId) return;
      if (m.k === 'n' && !s && this.waitHost?.id === from) { const name = this.waitHost.name; this.waitHost = null; this.renderStart(FL('yut.hostLeft', { name })); return; }
      if (m.k === 'n' && s && s.ids.includes(from)) { this._toLocal(s.ids.indexOf(from)); return; } // (left after the game)
      const q = this.lobby.get(from);
      if (!q) return;
      if (m.k === 'n') this.lobby.delete(from); else q.yes = true;
      if (this.open && !this.game) this.renderStart();
      return;
    }
    if (m.k === 'g') {
      if (!this.waitHost || from !== this.waitHost.id) return;
      const mine = m.ids.indexOf(net.myId);
      if (mine < 0) { this.waitHost = null; this.renderStart(FL('yut.without')); return; }
      this.pieces = m.pieces;
      this._beginNet({ gid: m.gid, ids: m.ids, host: from, mine, seed: m.seed });
      return;
    }
    if (!s || m.gid !== s.gid) return;
    if (m.k === 'c') { if (from === s.host) this._hostGone(); return; }
    if (m.k === 'k') {
      if (from !== s.host && s.ids[m.seat] !== from) return;
      this._toLocal(m.seat);
      return;
    }
    if (m.k === 'x') {
      const id = s.ids[m.seat];
      if (id !== from && !(id === YUT_BOT && from === s.host)) return;
      this.queue.push(m);
      this._drain();
    }
  }
  // Someone left the area.
  peerGone(id) {
    const s = this.seats;
    if (this.lobby.delete(id) && this.open && !this.game) this.renderStart();
    if (this.waitHost?.id === id && !s) { this.waitHost = null; this.renderStart(FL('yut.hostLeft', { name: this.net.nameOf(id) || '?' })); return; }
    if (!s) return;
    if (id === s.host) { this._hostGone(); return; }
    const seat = s.ids.indexOf(id);
    if (seat >= 0) this._toLocal(seat);
  }
  _hostGone() {
    const name = this.waitHost?.name || '?';
    this.seats = null;
    this.waitHost = null;
    this.renderStart(FL('yut.hostLeft', { name }));
  }
  // A seat whose player left (or was away too long): the locals play it.
  _toLocal(seat) {
    const s = this.seats;
    if (!s || s.ids[seat] === YUT_BOT) return;
    const left = s.ids[seat];
    const name = this.name(seat);
    s.ids[seat] = YUT_BOT;
    if (!this.game || this.game.phase === 'over') return;
    if (seat === s.mine) { s.mine = -1; this.status = FL('yut.youAway'); }
    else this.status = FL('yut.tookOver', { name });
    void left;
    this.render();
    this._afterAction();
  }

  begin() {
    const yes = [...this.lobby.entries()].filter(([, q]) => q.yes);
    if (this.net && yes.length) {
      const ids = [this.net.myId, ...yes.map(([id]) => id)];
      while (ids.length < Math.max(this.players, ids.length)) ids.push(YUT_BOT);
      const gid = Math.random().toString(36).slice(2, 8), seed = Math.floor(Math.random() * 1e9);
      this.lobby.clear();
      this.net.send(yutGo(gid, seed, this.pieces, ids));
      this._beginNet({ gid, ids, host: this.net.myId, mine: 0, seed });
      return;
    }
    for (const [id] of this.lobby) this.net?.send(yutReply(id, false));
    this.lobby.clear();
    this._stop();
    this.seats = null;
    this._start(this.players);
  }
  _beginNet({ gid, ids, host, mine, seed }) {
    this._stop();
    this.seats = { gid, ids: ids.slice(), host, mine, n: 0, rng: yutRng(seed) };
    this.waitHost = host === this.net.myId ? null : { id: host, name: this.net.nameOf(host) || '?' };
    this._start(ids.length);
  }
  _start(players) {
    this.game = new YutGame({ players, pieces: this.pieces });
    this.sel = null; // the unit you picked
    this.anim = null;
    this.sticks = null;
    this.status = this.mine(0) ? FL('yut.yourTurn') : FL('yut.theirTurn', { name: this.name(0) });
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
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
    // Throw: hold the button, let go when the gauge is high (it only
    // changes how high the sticks fly; what they show is luck).
    const throwBtn = el('button', 'primary yut-throw-btn');
    throwBtn.append(el('span', null, '🥢 ' + FL('yut.throw')), el('small', null, FL('yut.hold')));
    const gauge = el('i', 'yut-gauge');
    gauge.append(el('b'));
    throwBtn.append(gauge);
    throwBtn.addEventListener('pointerdown', (e) => { if (this.canThrow()) { e.preventDefault(); throwBtn.setPointerCapture?.(e.pointerId); this.press(); } });
    throwBtn.addEventListener('pointerup', () => { if (this.hold) this.release(); });
    throwBtn.addEventListener('pointercancel', () => { if (this.hold) this.release(); });
    throwBtn.oncontextmenu = (e) => e.preventDefault();
    this.ui.throwBtn = throwBtn;
    this.ui.gauge = gauge;
    this.ui.actions.append(throwBtn);
    const mid = el('div', 'yut-mid');
    mid.append(this.ui.sticks, this.ui.result);
    this.root.append(this.ui.players, this.ui.board, mid, this.ui.status, this.ui.tray, this.ui.actions);
    this.render();
    this._afterAction();
  }

  canThrow() { const g = this.game; return !!g && !this.anim && this.mine(g.turn) && g.phase === 'throw' && !this.queue.length; }

  // The gauge: press, then let go.
  press() {
    if (!this.canThrow() || this.hold) return;
    this.hold = performance.now();
    const step = () => {
      if (!this.hold || !this.ui) return;
      this.ui.gauge.style.setProperty('--p', gaugeAt(performance.now() - this.hold).toFixed(3));
      this.gaugeRaf = requestAnimationFrame(step);
    };
    this.ui.throwBtn.classList.add('holding');
    step();
  }
  release() {
    const power = Math.round(gaugeAt(performance.now() - this.hold) * 9);
    cancelAnimationFrame(this.gaugeRaf);
    this.hold = 0;
    this.ui?.throwBtn.classList.remove('holding');
    this.doThrow(power);
  }
  doThrow(power = 5) {
    if (!this.canThrow()) return;
    this._do({ k: 't', power });
  }

  // Something this browser does on a turn (mine, or a local's): send it to
  // the people playing, then do it.
  _do(act) {
    const s = this.seats, seat = this.game.turn;
    if (s) this.net.send(yutAct(s.gid, s.n, seat, act));
    this._apply(seat, act);
  }
  // A move from the room, in order, once the board is still.
  _drain() {
    const g = this.game, s = this.seats;
    while (g && s && !this.anim && this.queue.length) {
      const m = this.queue[0];
      if (m.n > s.n) return; // (an earlier one is still on its way)
      this.queue.shift();
      if (m.n < s.n || m.seat !== g.turn) continue;
      this._apply(m.seat, m.act);
    }
  }
  _apply(seat, act) {
    const g = this.game;
    if (!g || g.turn !== seat || g.phase === 'over') return;
    if (act.k === 't') {
      if (g.phase !== 'throw') return;
      if (this.seats) this.seats.n++;
      this._throw(act.power);
    } else {
      if (g.phase !== 'move' || g.pending[act.i] == null || !g.destination(act.from, g.pending[act.i])) return;
      if (this.seats) this.seats.n++;
      this._move({ i: act.i, from: act.from });
    }
  }

  _throw(power = 5) {
    const g = this.game;
    const { sticks, kind } = throwSticks(this.seats ? this.seats.rng : this.rand);
    this.sticks = { sticks, kind, n: (this.sticks?.n || 0) + 1, power };
    const who = g.turn;
    g.throw(kind);
    this.sel = null;
    if (g.last.lost) this.status = FL('yut.lost');
    else if (g.turn === who && g.phase === 'throw') this.status = FL('yut.oneMore');
    else if (g.turn === who) this.status = this.mine(who) ? FL('yut.pick') : FL('yut.theirTurn', { name: this.name(who) });
    else this.status = this.mine(g.turn) ? FL('yut.yourTurn') : FL('yut.theirTurn', { name: this.name(g.turn) });
    if (this.mine(g.turn) && g.phase === 'move') this._autoSelect();
    this.render();
    this._afterAction();
    this._drain();
  }

  // Only one thing you can move: pick it for you.
  _autoSelect() {
    const units = new Set(this.game.options().map((o) => o.from));
    if (units.size === 1) this.sel = [...units][0];
  }

  pickUnit(from) {
    const g = this.game;
    if (!g || this.anim || !this.mine(g.turn) || g.phase !== 'move') return;
    if (!g.options().some((o) => o.from === from)) return;
    this.sel = this.sel === from ? null : from;
    this.render();
  }

  pickDest(opt) {
    const g = this.game;
    if (!g || this.anim || !this.mine(g.turn) || g.phase !== 'move') return;
    this._do({ k: 'm', i: opt.i, from: opt.from });
  }

  _move(opt) {
    const g = this.game, who = g.turn, me = this.mySeat;
    const onBoard = () => (me >= 0 ? g.players[me].pieces.filter((x) => x.at !== HOME).length : 0);
    const before = onBoard();
    const last = g.move(opt.i, opt.from);
    this.sel = null;
    if (last.caught) {
      this.status = this.mine(who) ? FL('yut.caught') : onBoard() < before ? FL('yut.gotCaught', { name: this.name(who) }) : FL('yut.theirTurn', { name: this.name(g.turn) });
      this.say('caught');
    }
    else if (last.joined) { this.status = FL('yut.stacked'); if (this.mine(who)) this.say('stacked'); }
    else if (last.dest === OUT) this.status = FL('yut.out');
    else if (g.phase === 'move' && this.mine(g.turn)) this.status = FL('yut.pick');
    else if (this.mine(g.turn) && g.phase === 'throw') this.status = g.last?.lost ? FL('yut.lost') : FL('yut.yourTurn');
    else this.status = FL('yut.theirTurn', { name: this.name(g.turn) });
    // Walk the piece along its path, one spot at a time.
    this.anim = { player: who, path: last.path, pieces: last.pieces, i: 0, dest: last.dest };
    const stepMs = 170 / this.speed;
    const tick = () => {
      if (!this.game) return;
      this.anim.i++;
      if (this.anim.i >= this.anim.path.length) {
        this.anim = null;
        if (this.mine(g.turn) && g.phase === 'move') this._autoSelect();
        this.render();
        if (g.phase === 'over') this._over();
        else { this._afterAction(); this._drain(); }
        return;
      }
      this.render();
      this.timer = setTimeout(tick, stepMs);
    };
    this.render();
    this.timer = setTimeout(tick, stepMs);
  }

  // The locals act after a short pause. With people, the host also watches
  // the clock: someone who doesn't play for a long while gives their seat to
  // a local, so the others are not stuck.
  _afterAction() {
    const g = this.game, s = this.seats;
    clearTimeout(this.idleTimer);
    if (!g || g.phase === 'over' || this.anim) return;
    if (this.playsFor(g.turn)) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (!this.game || this.anim || !this.playsFor(g.turn) || g.phase === 'over') return;
        if (g.phase === 'throw') this._do({ k: 't', power: Math.floor(this.rand() * 10) });
        else if (g.phase === 'move') {
          const o = chooseMove(g, this.rand);
          if (o) this._do({ k: 'm', i: o.i, from: o.from });
        }
      }, 750 / this.speed);
      return;
    }
    if (s && s.host === this.net.myId && !this.mine(g.turn) && s.ids[g.turn] !== YUT_BOT) {
      const seat = g.turn, n = s.n;
      this.idleTimer = setTimeout(() => {
        if (this.seats !== s || s.n !== n || this.game?.turn !== seat) return;
        this.net.send(yutKick(s.gid, seat));
        this._toLocal(seat);
      }, AWAY_MS);
    }
  }

  _over() {
    const g = this.game, s = this.seats;
    clearTimeout(this.timer);
    clearTimeout(this.idleTimer);
    let note;
    if (this.mine(g.winner)) {
      try { this.store?.setItem(WINS_KEY, String(this.wins + 1)); } catch { /* storage blocked */ }
      const coins = this.onWin?.() || 0;
      note = FL('yut.win') + (coins ? '  🪙 +' + coins : '');
      this.say('won');
    } else note = FL('yut.lose', { name: this.name(g.winner) });
    this.status = note;
    this.render();
    const actions = this.ui.actions;
    actions.replaceChildren();
    const back = el('button', null, FL('close'));
    back.onclick = () => this.close();
    actions.append(back);
    // With people: the host starts the next game with whoever is still here;
    // the others wait for it.
    if (s && s.host !== this.net.myId) {
      if (s.mine >= 0) { this.seats = null; this.waitHost = { id: s.host, name: this.net.nameOf(s.host) || '?' }; }
      return;
    }
    const again = el('button', 'primary', '🎲 ' + FL('again'));
    again.onclick = () => {
      if (s) {
        const ids = s.ids.slice(), gid = Math.random().toString(36).slice(2, 8), seed = Math.floor(Math.random() * 1e9);
        if (ids.some((id, i) => i > 0 && id !== YUT_BOT)) {
          this.net.send(yutGo(gid, seed, this.pieces, ids));
          this._beginNet({ gid, ids, host: this.net.myId, mine: 0, seed });
          return;
        }
        this.seats = null;
      }
      this.begin();
    };
    actions.append(again);
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
    const opts = this.mine(g.turn) && g.phase === 'move' && !this.anim ? g.options() : [];
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
        const mine = this.mine(p) && opts.some((o) => o.from === s);
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
        s.style.setProperty('--h', -(14 + this.sticks.power * 5) + 'px'); // (a harder throw flies higher)
        ui.sticks.append(s);
      });
      ui.sticks.dataset.n = this.sticks.n; // restarts the toss animation
      const [ko, rom, meaning] = throwLabel(this.sticks.kind);
      ui.result.append(el('strong', null, ko + '!'), el('span', 'order-rom', rom), el('small', null, meaning));
    }
    ui.status.textContent = this.status || '';
    // Your saved throws and your waiting pieces.
    ui.tray.replaceChildren();
    if (this.mine(g.turn) && g.pending.length) {
      const row = el('div', 'yut-pending');
      for (const k of g.pending) row.append(el('span', 'chip yut-throw', THROW_KO[k][0] + ' ' + (k === 'backdo' ? '−1' : '+' + STEPS[k])));
      ui.tray.append(row);
    }
    const me = this.mySeat;
    const home = me >= 0 ? g.players[me].pieces.filter((x) => x.at === HOME).length : 0;
    if (home && g.phase !== 'over') {
      const can = opts.some((o) => o.from === HOME);
      const h = el('button', 'chip yut-home' + (this.sel === HOME ? ' sel' : ''), '⏳ ' + FL('yut.home') + ' ×' + home);
      h.style.setProperty('--c', COLORS[me]);
      h.disabled = !can;
      h.onclick = () => this.pickUnit(HOME);
      ui.tray.append(h);
    }
    if (ui.throwBtn) ui.throwBtn.disabled = !this.canThrow() && !this.hold;
  }
}
