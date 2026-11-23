// The board games panel (rules: core/board-games.js; words:
// ui/board-games-text.js). Loaded the first time someone opens a game or is
// invited to one (game/board-games.js), never in the first download.
//
// Pick a game, invite the people near you (they get a card and say yes or
// no), then Start: seats nobody took are played by the computer. The one who
// started the table (the host) keeps the game: every move goes to the host,
// who checks it and passes it on to everyone in the same order, and runs the
// computer players. So every screen shows the same game.
//
// net: { myId, nameOf(id), nearby(): [{ id, name }], send(msg), here(): still at the table's room }
// games: () => the game ids this table has (all of them at the café).
// onEvent(kind): 'move' | 'win' | 'lose' | 'bang' | 'ring', for sounds.
import {
  GAMES, ROULETTE, OMOK_SIZE, FRUIT_EMOJI, newGame, applyAction,
  bgInvite, bgReply, bgGo, bgMove, bgPass, bgClose, turnOf, parseBg,
} from '../core/board-games.js';
import { localName, getLanguage } from '../core/i18n.js';
import { T, GAME_NAME, GAME_HOW } from './board-games-text.js';

const L = (o) => localName(o, getLanguage());
const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const tt = (k, v) => fmt(L(T[k]), v);
const BOT = '~';
const INVITE_WAIT = 30000; // an invite nobody answers is dropped after this
const BOT_THINK = [650, 1300]; // ms a computer player takes for a move
const BOT_BELL = [900, 1900]; // ms a computer takes to see five on the bell table

const CSS = `
#bg-panel { position: fixed; inset: 0; z-index: 55; display: none; align-items: center; justify-content: center; background: rgba(20,14,10,.45); font: 600 15px system-ui, sans-serif; color: #2b2230; }
#bg-panel.on { display: flex; }
#bg-panel .bg-card { position: relative; width: min(520px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; background: #fffaf0; border-radius: 18px; padding: 16px; box-shadow: 0 10px 40px rgba(0,0,0,.35); box-sizing: border-box; }
#bg-panel h2 { margin: 0 34px 10px 0; font-size: 20px; }
#bg-panel .bg-x { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border: 0; border-radius: 50%; background: #eee3cf; font-size: 18px; cursor: pointer; }
#bg-panel button { font: inherit; color: inherit; cursor: pointer; }
#bg-panel .bg-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
#bg-panel .bg-game { border: 0; border-radius: 14px; padding: 12px 8px; background: #f3e6cc; text-align: center; }
#bg-panel .bg-game b { display: block; font-size: 28px; margin-bottom: 4px; }
#bg-panel .bg-game small { display: block; opacity: .7; font-weight: 500; }
#bg-panel .bg-how { font-weight: 500; line-height: 1.45; margin: 0 0 10px; }
#bg-panel .bg-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
#bg-panel .bg-btn { border: 0; border-radius: 12px; padding: 10px 14px; background: #eee3cf; }
#bg-panel .bg-go { background: #ffd36b; }
#bg-panel .bg-line { padding: 6px 0; }
#bg-panel .bg-status { min-height: 22px; margin: 8px 0; text-align: center; }
#bg-panel .bg-seats { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 8px; }
#bg-panel .bg-seat { padding: 4px 10px; border-radius: 999px; background: #efe4cf; font-size: 13px; }
#bg-panel .bg-seat.on { background: #ffd36b; }
#bg-panel .bg-seat.gone { opacity: .45; text-decoration: line-through; }
#bg-panel canvas.bg-omok { display: block; margin: 0 auto; width: min(100%, 420px); aspect-ratio: 1; touch-action: manipulation; border-radius: 8px; }
#bg-panel .bg-fruits { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
#bg-panel .bg-pile { background: #f6ecd8; border-radius: 12px; padding: 8px; text-align: center; }
#bg-panel .bg-pile.on { outline: 3px solid #ffb800; }
#bg-panel .bg-pile.gone { opacity: .4; }
#bg-panel .bg-fcard { height: 74px; margin: 6px auto; width: 64px; border-radius: 8px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); display: flex; flex-wrap: wrap; align-content: center; justify-content: center; font-size: 18px; line-height: 1.1; }
#bg-panel .bg-fcard.back { background: repeating-linear-gradient(45deg, #e07a5f 0 6px, #f2a07b 6px 12px); }
#bg-panel .bg-bell { display: block; margin: 10px auto 0; width: 120px; height: 120px; border-radius: 50%; border: 0; background: radial-gradient(circle at 40% 35%, #fff2a8, #f2c230 60%, #c99412); font-size: 30px; box-shadow: 0 6px 0 #9b7210; }
#bg-panel .bg-bell:active { transform: translateY(4px); box-shadow: 0 2px 0 #9b7210; }
#bg-panel .bg-toy { position: relative; margin: 6px auto; max-width: 420px; }
#bg-panel .bg-spots { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; padding: 14px; border-radius: 22px; }
#bg-panel .bg-spot { width: 44px; height: 48px; border: 0; border-radius: 10px; font-size: 22px; }
#bg-panel .bg-spot:disabled { opacity: .3; cursor: default; }
#bg-panel .bg-face { text-align: center; font-size: 64px; line-height: 1; transition: transform .25s; }
#bg-panel .bg-face.bang { transform: scale(1.35) rotate(-8deg); }
#bg-panel .bg-croc .bg-spots { background: #4f9a5c; }
#bg-panel .bg-croc .bg-spot { background: #fffdf4; border-radius: 6px 6px 18px 18px; }
#bg-panel .bg-pirate .bg-spots { background: repeating-linear-gradient(90deg, #8a5a33 0 18px, #7a4c2a 18px 20px); border-radius: 40%; }
#bg-panel .bg-pirate .bg-spot { background: #2b1d14; color: #ffd36b; border-radius: 50%; width: 40px; height: 40px; }
#bg-panel .bg-bulldog .bg-spots { background: #e9dcc4; }
#bg-panel .bg-bulldog .bg-spot { background: #fff; }
`;

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const between = ([a, b], rand) => a + (b - a) * rand();

export class BoardGamesUI {
  constructor({ net, games = () => Object.keys(GAMES).filter((id) => id !== 'onecard'), onEvent = () => {}, rand = Math.random }) {
    Object.assign(this, { net, games, onEvent, rand });
    if (!document.getElementById('bg-css')) {
      const st = el('style');
      st.id = 'bg-css';
      st.textContent = CSS;
      document.head.append(st);
    }
    this.root = document.getElementById('bg-panel') || el('div');
    this.root.id = 'bg-panel';
    document.body.append(this.root);
    this.card = el('div', 'bg-card');
    this.root.replaceChildren(this.card);
    this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
    this.state = 'menu';
    this.lobby = null; // host: { game, list: [{ id, name, ready, at }] }
    this.host = null; // guest: { id, name, game } of the table I joined
    this.play = null; // { gid, game, g, ids, seat, hostId }
    this.status = '';
    this.timer = 0;
    this.tick = setInterval(() => this.onTick(), 250);
  }

  get open() { return this.root.classList.contains('on'); }
  parse(e) { return parseBg(e); }
  get busy() { return !!(this.lobby || this.host || (this.play && !this.play.g.over)); }

  show() {
    this.root.classList.add('on');
    this.render();
  }

  close() {
    this.leaveAll();
    this.root.classList.remove('on');
  }

  destroy() {
    this.close();
    clearInterval(this.tick);
    this.root.remove();
  }

  // ------------------------------------------------------------ lobby (host)
  choose(game) {
    this.leaveAll();
    this.lobby = { game, list: [] };
    this.state = 'lobby';
    this.status = '';
    this.render();
  }

  inviteOne(p) {
    const lob = this.lobby;
    if (!lob || lob.list.some((q) => q.id === p.id) || lob.list.length + 1 >= GAMES[lob.game].max) return;
    lob.list.push({ id: p.id, name: p.name, ready: false, at: performance.now() });
    this.net.send(bgInvite(p.id, lob.game));
    this.render();
  }

  start() {
    const lob = this.lobby;
    if (!lob) return;
    const g = GAMES[lob.game];
    const ready = lob.list.filter((q) => q.ready);
    for (const q of lob.list) if (!q.ready) this.net.send(bgReply(q.id, false)); // (stop waiting for them)
    const ids = [this.net.myId, ...ready.map((q) => q.id)];
    while (ids.length < g.min) ids.push(BOT);
    if (lob.bots) while (ids.length < Math.min(g.max, ids.length + lob.bots)) { ids.push(BOT); lob.bots--; }
    this.lobby = null;
    this.begin(lob.game, ids, this.net.myId);
  }

  addBot() {
    const lob = this.lobby;
    if (!lob) return;
    const g = GAMES[lob.game];
    const seats = 1 + lob.list.length + (lob.bots || 0);
    if (seats < g.max) lob.bots = (lob.bots || 0) + 1;
    this.render();
  }

  // Start (or restart) a game. Only the host calls this with a new seed.
  begin(game, ids, hostId, seed = Math.floor(this.rand() * 1e9), gid = null) {
    const humans = ids.filter((id) => id !== BOT && id !== this.net.myId);
    gid ||= (seed % 1e9).toString(36);
    if (hostId === this.net.myId && humans.length) this.net.send(bgGo(gid, game, seed, ids));
    this.play = { gid, game, g: newGame(game, ids.length, seed), ids, seat: ids.indexOf(this.net.myId), hostId, seed, names: ids.map((id) => this.nameFor(id)) };
    this.host = null;
    this.state = 'play';
    this.status = '';
    this.timer = 0;
    this.render();
  }

  nameFor(id) {
    if (id === BOT) return L(T.computer);
    if (id === this.net.myId) return L(T.you);
    return this.net.nameOf(id) || '?';
  }

  // ------------------------------------------------------------ guest side
  // The player said yes on the invite card.
  accept(hostId, game) {
    this.leaveAll();
    this.host = { id: hostId, name: this.net.nameOf(hostId) || '?', game };
    this.state = 'waiting';
    this.net.send(bgReply(hostId, true));
    this.show();
  }

  // ------------------------------------------------------------ messages
  onMsg(from, m) {
    const me = this.net.myId;
    if (m.k === 'a' && m.to === me && this.lobby) {
      const q = this.lobby.list.find((x) => x.id === from);
      if (q) { q.ready = true; this.render(); }
      return;
    }
    if (m.k === 'n' && m.to === me) {
      if (this.lobby) {
        const q = this.lobby.list.find((x) => x.id === from);
        if (q) { this.lobby.list.splice(this.lobby.list.indexOf(q), 1); this.status = tt('declined', { name: q.name }); this.render(); }
      } else if (this.play && this.play.hostId === me) this.seatLeft(from);
      return;
    }
    if (m.k === 'g' && this.host && from === this.host.id && m.ids.includes(me)) {
      this.begin(m.game, m.ids, from, m.seed, m.gid);
      return;
    }
    if (m.k === 'g' && this.play && from === this.play.hostId && m.ids.includes(me) && this.play.g.over) {
      this.begin(m.game, m.ids, from, m.seed, m.gid); // the host's "Play again"
      return;
    }
    const p = this.play;
    if (!p || m.gid !== p.gid) return;
    if (m.k === 'x' && p.hostId === me) {
      const seat = p.ids.indexOf(from);
      if (seat >= 0) this.hostApply(seat, m.act);
    } else if (m.k === 'y' && from === p.hostId && p.hostId !== me) {
      this.applyNow(m.seat, m.act);
    } else if (m.k === 'c' && from === p.hostId) {
      this.status = tt('closed', { name: this.nameFor(from) });
      if (!p.g.over) { p.g.over = true; p.closed = true; }
      this.render();
    }
  }

  // Someone left the room (or the game).
  peerGone(id) {
    if (this.lobby) {
      const q = this.lobby.list.find((x) => x.id === id);
      if (q) { this.lobby.list.splice(this.lobby.list.indexOf(q), 1); this.render(); }
    }
    if (this.host?.id === id) { this.status = tt('closed', { name: this.host.name }); this.host = null; this.state = 'menu'; this.render(); }
    const p = this.play;
    if (!p || p.g.over) return;
    if (p.hostId === id) { this.status = tt('closed', { name: this.nameFor(id) }); p.g.over = true; p.closed = true; this.render(); }
    else if (p.hostId === this.net.myId) this.seatLeft(id);
  }

  seatLeft(id) {
    const p = this.play;
    const seat = p?.ids.indexOf(id) ?? -1;
    if (seat < 0 || p.gone?.[seat]) return;
    this.hostApply(seat, ['l']);
  }

  // My own move: the host applies it at once, a guest sends it to the host.
  myMove(act) {
    const p = this.play;
    if (!p || p.g.over) return;
    if (p.hostId === this.net.myId) this.hostApply(p.seat, act);
    else this.net.send(bgMove(p.gid, act));
  }

  hostApply(seat, act) {
    const p = this.play;
    if (!applyAction(p.g, seat, act)) return;
    if (p.ids.some((id) => id !== BOT && id !== this.net.myId)) this.net.send(bgPass(p.gid, seat, act));
    this.after(seat, act);
  }

  applyNow(seat, act) {
    if (!applyAction(this.play.g, seat, act)) return;
    this.after(seat, act);
  }

  after(seat, act) {
    const p = this.play;
    if (act[0] === 'l') {
      (p.gone ||= [])[seat] = true;
      if (seat !== p.seat) this.status = tt('left', { name: p.names[seat] });
    }
    const g = p.g;
    if (g.last?.ring != null) {
      this.status = tt(g.last.ring ? 'ringRight' : 'ringWrong', { name: p.names[seat], n: g.last.ring ? g.last.got : g.last.paid });
      this.onEvent('ring');
    } else if (act[0] !== 'l') this.onEvent('move');
    if (g.over && !p.done) {
      p.done = true;
      if (g.last?.bang) this.onEvent('bang');
      else if (g.winner === p.seat) this.onEvent('win');
      else if (g.winner >= 0) this.onEvent('lose');
    }
    this.timer = 0;
    this.render();
  }

  // ------------------------------------------------------------ leaving
  leaveAll() {
    const me = this.net.myId;
    if (this.lobby) for (const q of this.lobby.list) this.net.send(bgReply(q.id, false));
    this.lobby = null;
    if (this.host) this.net.send(bgReply(this.host.id, false));
    this.host = null;
    const p = this.play;
    if (p) {
      const humans = p.ids.some((id) => id !== BOT && id !== me);
      if (p.hostId === me) { if (humans) this.net.send(bgClose(p.gid)); }
      else if (!p.g.over) this.net.send(bgReply(p.hostId, false));
    }
    this.play = null;
    this.state = 'menu';
    this.status = '';
  }

  // ------------------------------------------------------------ the clock
  onTick() {
    const now = performance.now();
    // Walked away from the café (or the party): the game ends for me.
    if ((this.open || this.busy) && this.net.here && !this.net.here()) { this.close(); return; }
    if (this.lobby) {
      const late = this.lobby.list.filter((q) => !q.ready && now - q.at > INVITE_WAIT);
      for (const q of late) { this.lobby.list.splice(this.lobby.list.indexOf(q), 1); this.net.send(bgReply(q.id, false)); }
      if (late.length && this.open) this.render();
    }
    const p = this.play;
    if (!p || p.g.over || p.hostId !== this.net.myId) return;
    // The computer players (the host runs them).
    const g = p.g;
    this.timer += 250;
    if (p.game === 'fruitbell' && g.bellRight()) {
      p.bellAt ??= between(BOT_BELL, this.rand);
      if (this.timer >= p.bellAt) {
        const bots = p.ids.map((id, s) => (id === BOT && !g.out[s] ? s : -1)).filter((s) => s >= 0);
        p.bellAt = null;
        if (bots.length) { this.hostApply(bots[Math.floor(this.rand() * bots.length)], ['r', g.flips]); return; }
      }
    } else if (p.game === 'fruitbell') p.bellAt = null;
    const turn = turnOf(g);
    if (turn < 0 || p.ids[turn] !== BOT) return;
    p.thinkAt ??= between(BOT_THINK, this.rand);
    if (this.timer < p.thinkAt) return;
    p.thinkAt = null;
    if (p.game === 'omok') { const [x, y] = g.botMove(this.rand); this.hostApply(turn, ['o', x, y]); }
    else if (p.game === 'fruitbell') this.hostApply(turn, ['f']);
    else if (ROULETTE.includes(p.game)) this.hostApply(turn, ['p', g.botMove(this.rand)]);
  }

  // ------------------------------------------------------------ drawing
  render() {
    if (!this.open) return;
    const c = this.card;
    c.replaceChildren();
    const x = el('button', 'bg-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', L(T.close));
    x.onclick = () => this.close();
    c.append(x);
    if (this.state === 'menu') this.drawMenu(c);
    else if (this.state === 'lobby') this.drawLobby(c);
    else if (this.state === 'waiting') this.drawWaiting(c);
    else if (this.state === 'play') this.drawPlay(c);
  }

  drawMenu(c) {
    c.append(el('h2', null, '🎲 ' + L(T.title)), el('p', 'bg-how', L(T.pick)));
    const list = el('div', 'bg-list');
    for (const id of this.games()) {
      const g = GAMES[id];
      const b = el('button', 'bg-game');
      b.type = 'button';
      b.dataset.game = id;
      b.append(el('b', null, g.icon), document.createTextNode(L(GAME_NAME[id])), el('small', null, g.min === g.max ? L(T.two) : tt('players', { a: g.min, b: g.max })));
      b.onclick = () => this.choose(id);
      list.append(b);
    }
    c.append(list);
    if (this.status) c.append(el('div', 'bg-status', this.status));
  }

  drawLobby(c) {
    const lob = this.lobby;
    const g = GAMES[lob.game];
    c.append(el('h2', null, g.icon + ' ' + L(GAME_NAME[lob.game])), el('p', 'bg-how', L(GAME_HOW[lob.game])), el('p', 'bg-how', L(T.lobbyHow)));
    for (const q of lob.list) c.append(el('div', 'bg-line', tt(q.ready ? 'joined' : 'inviting', { name: q.name })));
    const row = el('div', 'bg-row');
    const near = this.net.nearby().filter((p) => !lob.list.some((q) => q.id === p.id));
    if (lob.list.length + 1 < g.max) {
      for (const p of near.slice(0, 6)) {
        const b = el('button', 'bg-btn', tt('invite', { name: p.name }));
        b.type = 'button';
        b.onclick = () => this.inviteOne(p);
        row.append(b);
      }
    }
    if (!near.length && !lob.list.length) c.append(el('div', 'bg-line', L(T.nobody)));
    c.append(row);
    const seats = Math.max(g.min, 1 + lob.list.filter((q) => q.ready).length + (lob.bots || 0));
    c.append(el('div', 'bg-line', tt('seats', { n: seats })));
    const act = el('div', 'bg-row');
    if (g.max > 2 && seats < g.max) {
      const add = el('button', 'bg-btn', '➕ ' + L(T.computer));
      add.type = 'button';
      add.onclick = () => this.addBot();
      act.append(add);
    }
    const go = el('button', 'bg-btn bg-go', L(T.start));
    go.type = 'button';
    go.dataset.act = 'start';
    go.onclick = () => this.start();
    const back = el('button', 'bg-btn', L(T.back));
    back.type = 'button';
    back.onclick = () => { this.leaveAll(); this.render(); };
    act.append(go, back);
    c.append(act);
    if (this.status) c.append(el('div', 'bg-status', this.status));
  }

  drawWaiting(c) {
    const h = this.host;
    c.append(el('h2', null, GAMES[h.game].icon + ' ' + L(GAME_NAME[h.game])), el('p', 'bg-how', L(GAME_HOW[h.game])), el('div', 'bg-status', tt('waitHost', { name: h.name })));
  }

  drawPlay(c) {
    const p = this.play;
    const g = p.g;
    c.append(el('h2', null, GAMES[p.game].icon + ' ' + L(GAME_NAME[p.game])));
    const seats = el('div', 'bg-seats');
    p.names.forEach((n, s) => {
      const out = p.gone?.[s] || g.out?.[s];
      const label = p.game === 'omok' ? `${s === 0 ? '⚫' : '⚪'} ${n}` : n;
      seats.append(el('span', 'bg-seat' + (turnOf(g) === s ? ' on' : '') + (out ? ' gone' : ''), label));
    });
    c.append(seats);
    if (p.game === 'omok') this.drawOmok(c);
    else if (p.game === 'fruitbell') this.drawBell(c);
    else this.drawToy(c);
    c.append(el('div', 'bg-status', this.headline()));
    if (g.over) {
      const row = el('div', 'bg-row');
      row.style.justifyContent = 'center';
      if (p.hostId === this.net.myId && !p.closed) {
        const again = el('button', 'bg-btn bg-go', L(T.again));
        again.type = 'button';
        again.dataset.act = 'again';
        again.onclick = () => {
          const ids = p.ids.map((id, s) => (p.gone?.[s] ? null : id)).filter(Boolean);
          while (ids.length < GAMES[p.game].min) ids.push(BOT);
          this.begin(p.game, ids, this.net.myId);
        };
        row.append(again);
      }
      const back = el('button', 'bg-btn', L(T.back));
      back.type = 'button';
      back.onclick = () => { this.leaveAll(); this.render(); };
      row.append(back);
      c.append(row);
    }
  }

  headline() {
    const p = this.play;
    const g = p.g;
    if (g.over) {
      if (p.closed) return this.status;
      if (g.last?.bang) return g.loser === p.seat ? L(T.bangMe) : tt('bangThem', { name: p.names[g.loser] });
      if (ROULETTE.includes(p.game)) return this.status;
      if (g.winner < 0) return L(T.draw);
      return g.winner === p.seat ? L(T.won) : tt('winner', { name: p.names[g.winner] });
    }
    const turn = turnOf(g);
    const whose = turn === p.seat ? L(T.yourTurn) : tt('theirTurn', { name: p.names[turn] });
    return this.status ? `${this.status} · ${whose}` : whose;
  }

  drawOmok(c) {
    const p = this.play;
    const g = p.g;
    const cv = el('canvas', 'bg-omok');
    const N = OMOK_SIZE;
    const px = 30;
    cv.width = cv.height = px * (N + 1);
    const x = cv.getContext('2d');
    x.fillStyle = '#e8c27a';
    x.fillRect(0, 0, cv.width, cv.height);
    x.strokeStyle = '#6b4a22';
    x.lineWidth = 1;
    for (let i = 1; i <= N; i++) {
      x.beginPath(); x.moveTo(px, i * px); x.lineTo(N * px, i * px); x.stroke();
      x.beginPath(); x.moveTo(i * px, px); x.lineTo(i * px, N * px); x.stroke();
    }
    for (const [a, b] of [[4, 4], [4, 12], [12, 4], [12, 12], [8, 8]]) { x.beginPath(); x.arc(a * px, b * px, 3, 0, Math.PI * 2); x.fillStyle = '#6b4a22'; x.fill(); }
    const win = new Set((g.line || []).map(([a, b]) => a + ',' + b));
    for (let yy = 0; yy < N; yy++) {
      for (let xx = 0; xx < N; xx++) {
        const v = g.board[yy * N + xx];
        if (v < 0) continue;
        x.beginPath();
        x.arc((xx + 1) * px, (yy + 1) * px, px * 0.43, 0, Math.PI * 2);
        x.fillStyle = v === 0 ? '#1d1b22' : '#fbfaf6';
        x.fill();
        x.strokeStyle = win.has(xx + ',' + yy) ? '#e8402a' : '#3a3530';
        x.lineWidth = win.has(xx + ',' + yy) ? 3 : 1;
        x.stroke();
      }
    }
    cv.onclick = (e) => {
      const r = cv.getBoundingClientRect();
      const gx = Math.round(((e.clientX - r.left) / r.width) * (N + 1)) - 1;
      const gy = Math.round(((e.clientY - r.top) / r.height) * (N + 1)) - 1;
      if (g.canPlay(p.seat, gx, gy)) this.myMove(['o', gx, gy]);
    };
    c.append(cv);
  }

  drawBell(c) {
    const p = this.play;
    const g = p.g;
    const grid = el('div', 'bg-fruits');
    p.names.forEach((n, s) => {
      const pile = el('div', 'bg-pile' + (turnOf(g) === s ? ' on' : '') + (g.out[s] ? ' gone' : ''));
      pile.append(el('div', null, n));
      const top = g.up[s][g.up[s].length - 1];
      const card = el('div', 'bg-fcard' + (top ? '' : ' back'), top ? FRUIT_EMOJI[top.f].repeat(top.n) : '');
      pile.append(card, el('small', null, g.out[s] ? L(T.out) : tt('cards', { n: g.down[s].length })));
      grid.append(pile);
    });
    c.append(grid);
    if (g.over || g.out[p.seat]) return;
    const row = el('div', 'bg-row');
    row.style.justifyContent = 'center';
    const flip = el('button', 'bg-btn bg-go', L(T.flip));
    flip.type = 'button';
    flip.dataset.act = 'flip';
    flip.disabled = turnOf(g) !== p.seat;
    flip.onclick = () => this.myMove(['f']);
    row.append(flip);
    c.append(row);
    const bell = el('button', 'bg-bell', L(T.ring));
    bell.type = 'button';
    bell.dataset.act = 'ring';
    bell.onpointerdown = (e) => { e.preventDefault(); this.myMove(['r', g.flips]); };
    c.append(bell);
  }

  drawToy(c) {
    const p = this.play;
    const g = p.g;
    const box = el('div', 'bg-toy bg-' + p.game);
    const bang = g.last?.bang;
    const face = { croc: bang ? '🐊💥' : '🐊', pirate: bang ? '🏴‍☠️💥' : '🏴‍☠️', bulldog: bang ? '🐶💢' : '🐶💤' }[p.game];
    box.append(el('div', 'bg-face' + (bang ? ' bang' : ''), face));
    const spots = el('div', 'bg-spots');
    const icon = { croc: '🦷', pirate: '🗡️', bulldog: '🦴' }[p.game];
    for (let i = 0; i < g.spots; i++) {
      const b = el('button', 'bg-spot', g.pressed.includes(i) ? (p.game === 'pirate' ? '🗡️' : '·') : (p.game === 'pirate' ? '' : icon));
      b.type = 'button';
      b.dataset.spot = String(i);
      b.disabled = g.over || g.pressed.includes(i) || turnOf(g) !== p.seat;
      b.onclick = () => this.myMove(['p', i]);
      spots.append(b);
    }
    box.append(spots);
    c.append(box);
  }
}

