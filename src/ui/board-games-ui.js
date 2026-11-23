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
// onEvent(kind, game, info): 'move' | 'pair' | 'dice' | 'ring' | 'wrong' | 'bang' | 'win' | 'lose', for sounds.
// onGame(id | null): a game started / the table was left, for its music.
//
// The croc and the bulldog are little 3D toys (ui/board-toy-3d.js, loaded
// when one of them starts); their buttons stay in the page, out of sight,
// for the keyboard and the tests. The chat stays in reach while you play:
// the card has the last few chat lines and a box to type in at the bottom
// (it sends through the game's own chat bar, so the same rules apply).
import {
  GAMES, TOYS, OMOK_SIZE, FRUIT_EMOJI, LADDERS_SIZE, LADDERS_END, newGame, applyAction,
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
const TURN_MS = 30000; // a turn nobody takes is played for them after this (the host's clock)
const TURN_WARN = 10; // the last seconds are counted down on screen
const PAWN = ['#e8402a', '#2f7de1', '#27a35a', '#f0a81c']; // snakes and ladders pieces, by seat
const PAWN_DOT = ['🔴', '🔵', '🟢', '🟡'];
const WALK_STEP = 150; // ms a piece takes for one square
const RIDE_MS = 650; // ms to climb a ladder or slide down a snake
const DICE_MS = 750; // ms the dice tumbles in the middle of the board before the piece walks
const BOT_BELL = [900, 1900]; // ms a computer takes to see five on the bell table

const CSS = `
#bg-panel { position: fixed; inset: 0; z-index: 55; display: none; align-items: center; justify-content: center; background: rgba(20,14,10,.25); font: 600 15px system-ui, sans-serif; color: #2b2230; }
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
#bg-panel .bg-clock { text-align: center; font-size: 18px; font-weight: 800; color: #e8402a; }
#bg-panel .bg-seats { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 8px; }
#bg-panel .bg-seat { padding: 4px 10px; border-radius: 999px; background: #efe4cf; font-size: 13px; }
#bg-panel .bg-seat.on { background: #ffd36b; }
#bg-panel .bg-seat.gone { opacity: .45; text-decoration: line-through; }
#bg-panel canvas.bg-omok { display: block; margin: 0 auto; width: min(100%, 420px); aspect-ratio: 1; touch-action: manipulation; border-radius: 8px; }
#bg-panel canvas.bg-ladders { display: block; margin: 0 auto; width: min(100%, 420px, 50vh); border-radius: 10px; }
#bg-panel .bg-dice { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 10px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); font-size: 30px; line-height: 1; }
#bg-panel .bg-fruits { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
#bg-panel .bg-pile { background: #f6ecd8; border-radius: 12px; padding: 8px; text-align: center; }
#bg-panel .bg-pile.on { outline: 3px solid #ffb800; }
#bg-panel .bg-pile.gone { opacity: .4; }
#bg-panel .bg-fcard { height: 74px; margin: 6px auto; width: 64px; border-radius: 8px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); display: flex; flex-wrap: wrap; align-content: center; justify-content: center; font-size: 18px; line-height: 1.1; }
#bg-panel .bg-fcard.back { background: repeating-linear-gradient(45deg, #e07a5f 0 6px, #f2a07b 6px 12px); }
#bg-panel .bg-bell { display: block; margin: 10px auto 0; width: 120px; height: 120px; border-radius: 50%; border: 0; background: radial-gradient(circle at 40% 35%, #fff2a8, #f2c230 60%, #c99412); font-size: 30px; box-shadow: 0 6px 0 #9b7210; }
#bg-panel .bg-fcard.new { animation: bg-flip .32s ease-out; }
@keyframes bg-flip { from { transform: translateY(-26px) rotateY(180deg) scale(1.15); background: #f2a07b; color: transparent; } 55% { color: transparent; } to { transform: none; } }
#bg-panel .bg-pile.got { animation: bg-got .6s ease-out; }
@keyframes bg-got { 30% { transform: scale(1.08); background: #ffe28a; } }
#bg-panel .bg-pile.oops { animation: bg-oops .45s; }
@keyframes bg-oops { 20%, 60% { transform: translateX(-7px); background: #ffc9bd; } 40%, 80% { transform: translateX(7px); } }
#bg-panel .bg-bell.rung { animation: bg-rung .5s; }
@keyframes bg-rung { 15% { transform: translateY(6px) rotate(-9deg); } 35% { transform: rotate(8deg); } 55% { transform: rotate(-5deg); } 75% { transform: rotate(3deg); } }
#bg-panel .bg-omok-wrap { position: relative; width: min(100%, 420px); margin: 0 auto; }
#bg-panel .bg-drop { position: absolute; width: 5.4%; aspect-ratio: 1; margin: -2.7% 0 0 -2.7%; border-radius: 50%; pointer-events: none; animation: bg-drop .38s ease-out forwards; }
@keyframes bg-drop { from { transform: scale(2.1); opacity: .9; box-shadow: 0 10px 14px rgba(0,0,0,.35); } 70% { transform: scale(.92); opacity: 1; } to { transform: scale(1); opacity: 0; box-shadow: 0 0 0 9px rgba(232,64,42,0); } }
@media (prefers-reduced-motion: reduce) { #bg-panel .bg-fcard.new, #bg-panel .bg-pile.got, #bg-panel .bg-pile.oops, #bg-panel .bg-bell.rung, #bg-panel .bg-drop { animation: none; } #bg-panel .bg-drop { display: none; } }
#bg-panel .bg-bell:active { transform: translateY(4px); box-shadow: 0 2px 0 #9b7210; }
#bg-panel .bg-toy { position: relative; margin: 6px auto; max-width: 420px; }
#bg-panel .bg-spots { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; padding: 14px; border-radius: 22px; }
#bg-panel .bg-spot { width: 44px; height: 48px; border: 0; border-radius: 10px; font-size: 22px; }
#bg-panel .bg-spot:disabled { opacity: .3; cursor: default; }
#bg-panel .bg-face { text-align: center; font-size: 64px; line-height: 1; transition: transform .25s; }
#bg-panel .bg-face.bang { transform: scale(1.35) rotate(-8deg); }
#bg-panel canvas.bg-toy3d { display: block; width: 100%; aspect-ratio: 4 / 3; max-height: 46vh; border-radius: 16px; background: radial-gradient(circle at 50% 35%, #fff6dc, #f1dcb4); touch-action: manipulation; }
#bg-panel .bg-toy.has3d .bg-spots, #bg-panel .bg-toy.has3d .bg-face { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); padding: 0; }
#bg-panel .bg-shout { position: absolute; left: 0; right: 0; top: 8px; text-align: center; font-size: 34px; font-weight: 900; color: #e8402a; text-shadow: 0 2px 0 #fff; pointer-events: none; animation: bg-shout .5s ease-out; }
@keyframes bg-shout { from { transform: scale(.3); opacity: 0; } 60% { transform: scale(1.25); opacity: 1; } to { transform: scale(1); } }
#bg-panel .bg-card.bang { animation: bg-flash .45s; }
#bg-panel .bg-party { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: 18px; }
#bg-panel .bg-party i { position: absolute; top: -16px; width: 9px; height: 14px; border-radius: 2px; animation: bg-fall 1.9s ease-in forwards; }
@keyframes bg-fall { to { transform: translateY(560px) rotate(540deg); opacity: 0; } }
@keyframes bg-flash { 0%, 100% { background: #fffaf0; } 30% { background: #ffd0c4; } }
#bg-panel .bg-chat { margin-top: 12px; border-top: 2px dashed #eadbbd; padding-top: 8px; }
#bg-panel .bg-chat-lines { max-height: 84px; overflow-y: auto; font-weight: 500; font-size: 14px; line-height: 1.35; scrollbar-width: thin; }
#bg-panel .bg-chat-lines div { padding: 1px 0; overflow-wrap: anywhere; }
#bg-panel .bg-chat form { display: flex; gap: 6px; margin-top: 6px; }
#bg-panel .bg-chat input { flex: 1; min-width: 0; font: inherit; font-size: 16px; padding: 8px 12px; border-radius: 999px; border: 2px solid #eadbbd; background: #fff; }
#bg-panel .bg-chat button { border: 0; border-radius: 999px; padding: 0 14px; background: #ffd36b; }
#bg-panel .bg-hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; padding: 14px 4px 6px; }
#bg-panel .bg-card1 { width: 40px; height: 58px; border: 0; border-radius: 7px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); font-size: 15px; font-weight: 800; line-height: 1.05; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; transition: transform .12s; }
#bg-panel .bg-card1.red { color: #d43d3d; }
#bg-panel .bg-card1.back { background: repeating-linear-gradient(45deg, #3f6fb5 0 6px, #5a8ad0 6px 12px); border: 2px solid #fff; box-sizing: border-box; }
#bg-panel .bg-card1.joker { background: #fff3c4; font-size: 24px; }
#bg-panel .bg-card1.sel { transform: translateY(-12px); box-shadow: 0 0 0 3px #ffb800, 0 6px 10px rgba(0,0,0,.3); }
#bg-panel .bg-card1:disabled { cursor: default; }
#bg-panel .bg-fp { border-radius: 16px; padding: 10px 8px 12px; background: linear-gradient(#f6e7c8 0 46%, #c98d55 46% 48%, #b97b45 48% 100%); overflow: hidden; }
#bg-panel .bg-who { text-align: center; }
#bg-panel.mini { align-items: flex-end; background: none; pointer-events: none; }
#bg-panel.mini .bg-card { pointer-events: auto; width: min(440px, calc(100vw - 16px)); max-height: 52vh; margin-bottom: 8px; padding: 10px 12px; background: rgba(255,250,240,.96); }
#bg-panel.mini h2 { font-size: 15px; margin-bottom: 4px; }
#bg-panel.mini .bg-x { top: 6px; right: 6px; width: 30px; height: 30px; }
#bg-panel.mini .bg-chat, #bg-panel.mini .bg-who { display: none; }
#bg-panel.mini .bg-seats { margin-bottom: 4px; }
#bg-panel.mini .bg-fp { padding: 2px 6px 6px; }
#bg-panel.mini .bg-fan { padding: 16px 0 6px; }
#bg-panel .bg-fp.has3d { background: #b97b45; padding-top: 0; }
#bg-panel .bg-fp.has3d canvas.bg-thief3d { border-radius: 0; margin: 0 -8px; width: calc(100% + 16px); max-height: 40vh; background: linear-gradient(#f6e7c8, #ecd6ae); }
#bg-panel .bg-fp.has3d .bg-who, #bg-panel .bg-fp.has3d [data-hand="from"]:not(.mine) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); padding: 0; }
#bg-panel .bg-fp.has3d .bg-row { margin-top: 8px; }
#bg-panel .bg-head { font-size: 56px; line-height: 1.05; transition: transform .15s; }
#bg-panel .bg-head.pull { transform: scale(1.35); }
#bg-panel .bg-fan { display: flex; justify-content: center; padding: 22px 0 10px; }
#bg-panel .bg-fan .bg-card1 { flex: none; transform-origin: 50% 120%; transform: translateY(var(--drop, 0)) rotate(var(--tilt, 0)); }
#bg-panel .bg-fan.big .bg-card1 { width: 50px; height: 72px; }
#bg-panel .bg-fan .bg-card1.sel { box-shadow: 0 0 0 3px #ffb800, 0 8px 12px rgba(0,0,0,.35); z-index: 2; }
#bg-panel .bg-fan .bg-card1 { position: relative; }
#bg-panel .bg-point { position: absolute; left: 50%; top: -34px; margin-left: -14px; font-size: 28px; line-height: 1; animation: bg-bob .7s ease-in-out infinite alternate; }
@keyframes bg-bob { to { transform: translateY(6px); } }
#bg-panel .bg-mine { margin-top: 6px; }
#bg-panel .bg-mine .bg-sub { color: #fff; opacity: .9; }
#bg-panel .bg-sub { text-align: center; font-size: 13px; opacity: .75; margin-top: 6px; }
#bg-panel .bg-faces { display: flex; justify-content: center; gap: 6px; margin: 6px 0 0; }
#bg-panel .bg-faces button { border: 0; background: #f3e6cc; border-radius: 50%; width: 38px; height: 38px; font-size: 20px; padding: 0; }
#bg-panel .bg-seat { position: relative; }
#bg-panel .bg-pop { position: absolute; left: 50%; top: -30px; transform: translateX(-50%); font-size: 34px; line-height: 1; pointer-events: none; z-index: 2; animation: bg-shout .35s ease-out; filter: drop-shadow(0 2px 2px rgba(0,0,0,.3)); }
#bg-panel .bg-seats { margin-top: 26px; }
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
// Faces to pull at each other (bluffing over the joker, gloating over a win).
export const FACES = ['😏', '😱', '😇', '🤫', '😂', '👀'];
const FACE_MS = 2600, FACE_GAP = 1200;
// What the toys shout when you find the bad spot.
const SHOUT = {
  croc: { en: 'CHOMP!', ko: '콱!', ja: 'ガブッ！', zh: '咔嚓！', es: '¡ÑAM!', fr: 'CROC !', th: 'งับ!', vi: 'NGOẠM!', id: 'HAP!', hi: 'चप!', ar: 'هَم!' },
  pirate: { en: 'YARRR!', ko: '으악!', ja: 'うわあ！', zh: '哇啊！', es: '¡ARRR!', fr: 'ARRR !', th: 'ว้าก!', vi: 'ÁÁÁ!', id: 'ARRR!', hi: 'अरे!', ar: 'آآآه!' },
  tower: { en: 'CRASH!', ko: '와르르!', ja: 'ガラガラ！', zh: '哗啦！', es: '¡CATAPLUM!', fr: 'PATATRAS !', th: 'โครม!', vi: 'RẦM!', id: 'BRUK!', hi: 'धड़ाम!', ar: 'طاخ!' },
  bulldog: { en: 'WOOF! WOOF!', ko: '왈! 왈!', ja: 'ワン！ワン！', zh: '汪！汪！', es: '¡GUAU! ¡GUAU!', fr: 'OUAF ! OUAF !', th: 'โฮ่ง! โฮ่ง!', vi: 'GÂU! GÂU!', id: 'GUK! GUK!', hi: 'भौं! भौं!', ar: 'هَو! هَو!' },
};

export class BoardGamesUI {
  constructor({ net, games = () => Object.keys(GAMES).filter((id) => id !== 'onecard'), onEvent = () => {}, onGame = () => {}, figureOf = null, table = null, rand = Math.random }) {
    Object.assign(this, { net, games, onEvent, onGame, figureOf, table, rand });
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
    this.makeChat();
  }

  // The chat, inside the card: the game's last chat lines (copied as they
  // come) and a box that sends through the game's own chat bar.
  makeChat() {
    const log = document.getElementById('chat-log'), bar = document.getElementById('chat-bar'), real = document.getElementById('chat-input');
    if (!log || !bar || !real || document.getElementById('chat-btn')?.hidden) return;
    const box = el('div', 'bg-chat');
    const lines = el('div', 'bg-chat-lines');
    const form = el('form');
    const inp = el('input');
    inp.type = 'text';
    inp.maxLength = real.maxLength > 0 ? real.maxLength : 80;
    inp.autocomplete = 'off';
    inp.enterKeyHint = 'send';
    inp.placeholder = '💬 ' + (real.placeholder || '');
    for (const ev of ['keydown', 'keyup']) inp.addEventListener(ev, (e) => e.stopPropagation()); // don't walk while typing
    const send = el('button', null, '➤');
    send.type = 'submit';
    form.append(inp, send);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!inp.value.trim()) return;
      real.value = inp.value;
      inp.value = '';
      bar.requestSubmit();
    };
    const copy = () => {
      lines.replaceChildren(...[...log.querySelectorAll('.chat-line')].slice(-6).map((l) => el('div', null, l.textContent)));
      lines.scrollTop = lines.scrollHeight;
    };
    this.chatWatch = new MutationObserver(copy);
    this.chatWatch.observe(log, { childList: true });
    copy();
    box.append(lines, form);
    this.chatBox = box;
    this.chatInput = inp;
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
    this.chatWatch?.disconnect();
    clearInterval(this.tick);
    this.root.remove();
  }

  // ------------------------------------------------------------ lobby (host)
  choose(game) {
    this.leaveAll();
    this.lobby = { game, list: [], opt: game === 'ladders' ? 1 : 0 }; // (ladders: the players lay the board out, unless the host says no)
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
    // Catch the Thief is played at a real table in the café when one is free (its number is the option).
    this.begin(lob.game, ids, this.net.myId, undefined, null, lob.game === 'thief' ? this.table?.pick(ids.length) || 0 : lob.opt || 0);
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
  begin(game, ids, hostId, seed = Math.floor(this.rand() * 1e9), gid = null, opt = 0) {
    const humans = ids.filter((id) => id !== BOT && id !== this.net.myId);
    gid ||= (seed % 1e9).toString(36);
    if (hostId === this.net.myId && humans.length) this.net.send(bgGo(gid, game, seed, ids, opt));
    this.play = { gid, game, opt, g: newGame(game, ids.length, seed, opt), ids, seat: ids.indexOf(this.net.myId), hostId, seed, names: ids.map((id) => this.nameFor(id)) };
    this.play.turnAt = performance.now();
    this.host = null;
    this.onGame(game);
    this.state = 'play';
    this.status = '';
    this.timer = 0;
    this.dropView();
    if (TOYS.includes(game)) {
      // The 3D toy (the plain buttons show until it is here, or if there is no WebGL).
      const p = this.play;
      import('./board-toy-3d.js').then((m) => {
        if (this.play !== p) return;
        this.view = m.createToyView(game, { spots: p.g.spots, onPick: (i) => this.myMove(['p', i]), figure: game === 'pirate' ? this.figureOf?.(hostId) ?? null : null }); // (the host sits in the pirate's barrel)
        this.render();
      }).catch(() => {});
    }
    this.table?.end();
    if (game === 'thief' && opt > 0 && this.table?.start({ ids, seat: this.play.seat, table: opt, names: this.play.names, bot: BOT, onPick: (i) => this.myMove(['s', i]) })) {
      this.play.world = true; // at a table in the café: the panel is only my own hand
    } else if (game === 'thief') {
      // Seen from my seat, in 3D (the flat cards show until it is here, or with no WebGL).
      const p = this.play;
      import('./board-thief-3d.js').then((m) => {
        if (this.play !== p || p.seat < 0) return;
        this.view = m.createThiefView({ n: ids.length, seat: p.seat, figures: ids.map((id, s) => (s === p.seat ? null : this.figureOf?.(id) ?? null)), names: p.names, onPick: (i) => this.myMove(['s', i]) });
        this.render();
      }).catch(() => {});
    }
    this.render();
  }

  // Time since the last move, for the computer players' thinking. By the
  // clock, not by counting ticks: on a slow device the tick comes late, and
  // the computer then took several times as long over a move.
  get timer() { return performance.now() - (this.t0 ?? 0); }
  set timer(v) { this.t0 = performance.now() - v; }

  dropView() { this.view?.dispose(); this.view = null; }

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
      this.begin(m.game, m.ids, from, m.seed, m.gid, m.opt);
      return;
    }
    if (m.k === 'g' && this.play && from === this.play.hostId && m.ids.includes(me) && this.play.g.over) {
      this.begin(m.game, m.ids, from, m.seed, m.gid, m.opt); // the host's "Play again"
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

  showFace(seat, n) {
    const p = this.play;
    (p.faces ||= [])[seat] = { n, until: performance.now() + FACE_MS };
    this.render();
  }

  myFace(n) {
    const now = performance.now();
    if (!this.play || now - (this.faceAt || 0) < FACE_GAP) return;
    this.faceAt = now;
    this.myMove(['e', n]);
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
    if (act[0] === 'e') {
      if (!(act[1] >= 0 && act[1] < FACES.length)) return;
      if (p.ids.some((id) => id !== BOT && id !== this.net.myId)) this.net.send(bgPass(p.gid, seat, act));
      this.showFace(seat, act[1]);
      return;
    }
    if (!applyAction(p.g, seat, act)) return;
    if (p.ids.some((id) => id !== BOT && id !== this.net.myId)) this.net.send(bgPass(p.gid, seat, act));
    this.after(seat, act);
  }

  applyNow(seat, act) {
    if (act[0] === 'e') { if (act[1] >= 0 && act[1] < FACES.length) this.showFace(seat, act[1]); return; }
    if (!applyAction(this.play.g, seat, act)) return;
    this.after(seat, act);
  }

  after(seat, act) {
    const p = this.play;
    if (act[0] !== 's') p.turnAt = performance.now() + (act[0] === 'd' && p.game === 'ladders' ? DICE_MS + 1200 : 0); // (a new turn's clock; pointing at a card does not buy time)
    if (act[0] === 'l') {
      (p.gone ||= [])[seat] = true;
      if (seat !== p.seat) this.status = tt('left', { name: p.names[seat] });
    }
    const g = p.g;
    if (g.last?.ring != null) {
      this.status = tt(g.last.ring ? 'ringRight' : 'ringWrong', { name: p.names[seat], n: g.last.ring ? g.last.got : g.last.paid });
      this.onEvent(g.last.ring ? 'ring' : 'wrong', p.game);
    } else if (act[0] === 't') {
      const l = g.last;
      this.status = l.p === p.seat && l.card === 'JB' ? L(T.drewJoker) : l.pair ? tt('pairGone', { name: p.names[l.p], r: l.pair }) : tt('drewOnly', { name: p.names[l.p] });
      this.onEvent(l.pair ? 'pair' : 'move', p.game);
    } else if (act[0] === 'd' && p.game === 'ladders') {
      const l = g.last;
      // (said once the dice has stopped tumbling, not before)
      const said = tt('rolled', { name: p.names[l.p], n: l.dice }) + (l.past ? ' ' + L(T.pastEnd) : '') + (l.via ? ' ' + tt(l.via === 'ladder' ? 'ladderUp' : 'snakeDown', { to: l.to }) : '') + (l.dice === 6 && !g.over ? ' ' + L(T.again6) : '');
      this.status = '';
      setTimeout(() => { if (this.play === p && g.last === l) { this.status = said; this.render(); } }, DICE_MS);
      this.startWalk(l);
      this.onEvent('dice', p.game);
    } else if (act[0] === 'a') { this.status = ''; p.pick = null; this.onEvent('move', p.game); }
    else if (act[0] === 's') { this.render(); return; } // (pointing at a card: no sound, the clock keeps running)
    else if (act[0] !== 'l' && !g.last?.bang) this.onEvent('move', p.game);
    if (g.over && !p.done) {
      p.done = true;
      // Who is glad about it: the winner, or everyone but the one who lost.
      const lostIt = g.loser === p.seat || (g.winner >= 0 && g.winner !== p.seat), wonIt = !lostIt && p.seat >= 0 && (g.winner === p.seat || g.loser >= 0);
      if (g.last?.bang) this.onEvent('bang', p.game, { placing: !!g.last.placing });
      const late = g.last?.bang ? (g.last.placing ? 1500 : 1000) : p.game === 'ladders' ? DICE_MS + 900 : 0; // (after the crash, or the last walk)
      setTimeout(() => { if (this.play !== p) return; if (wonIt) { this.onEvent('win', p.game); p.party = true; this.render(); } else if (lostIt) this.onEvent('lose', p.game); }, late);
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
    if (this.play) this.onGame(null);
    this.play = null;
    this.table?.end();
    this.dropView();
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
    if (p?.faces?.some((f) => f && f.until < now)) { p.faces = p.faces.map((f) => (f && f.until >= now ? f : null)); if (this.open) this.render(); }
    if (p && this.clockEl?.isConnected) {
      const left = p.g.over || turnOf(p.g) < 0 ? 99 : Math.ceil((TURN_MS - (now - p.turnAt)) / 1000);
      const text = left <= TURN_WARN ? `⏳ ${Math.max(0, left)}` : '';
      if (this.clockEl.textContent !== text) this.clockEl.textContent = text;
    }
    if (!p || p.g.over || p.hostId !== this.net.myId) return;
    // The computer players (the host runs them).
    const g = p.g;
    if (p.game === 'fruitbell' && g.bellRight()) {
      p.bellAt ??= between(BOT_BELL, this.rand);
      if (this.timer >= p.bellAt) {
        const bots = p.ids.map((id, s) => (id === BOT && !g.out[s] ? s : -1)).filter((s) => s >= 0);
        p.bellAt = null;
        if (bots.length) { this.hostApply(bots[Math.floor(this.rand() * bots.length)], ['r', g.flips]); return; }
      }
    } else if (p.game === 'fruitbell') p.bellAt = null;
    const turn = turnOf(g);
    if (turn < 0) return;
    if (p.ids[turn] !== BOT) {
      // A person who lets the clock run out: the move is made for them, so
      // one player stepping away cannot hold the table up.
      if (now - p.turnAt > TURN_MS + 1500) {
        if (p.game === 'thief' && g.sel < 0) this.hostApply(turn, ['s', g.botMove(this.rand)]);
        this.moveFor(turn);
      }
      return;
    }
    p.thinkAt ??= between(BOT_THINK, this.rand);
    if (this.timer < p.thinkAt) return;
    p.thinkAt = null;
    this.moveFor(turn);
  }

  // A move made by the host for a seat: the computer's, or a person's whose time ran out.
  moveFor(turn) {
    const p = this.play, g = p.g;
    if (p.game === 'omok') { const [x, y] = g.botMove(this.rand); this.hostApply(turn, ['o', x, y]); }
    else if (p.game === 'fruitbell') this.hostApply(turn, ['f']);
    else if (TOYS.includes(p.game)) this.hostApply(turn, ['p', g.botMove(this.rand)]);
    else if (p.game === 'ladders' && g.setup) { const m = g.botPlace(this.rand); this.hostApply(turn, m ? ['a', ...m] : ['l']); }
    else if (p.game === 'ladders') { this.hostApply(turn, ['d']); p.thinkAt = between(BOT_THINK, this.rand) + 1100 + DICE_MS; } // (lets the piece finish walking)
    else if (p.game === 'thief') {
      // Point at a card, think again, then take it.
      if (g.sel < 0) { this.hostApply(turn, ['s', g.botMove(this.rand)]); this.timer = 0; } else this.hostApply(turn, ['t', g.sel]);
    }
  }

  // ------------------------------------------------------------ drawing
  render() {
    if (!this.open) return;
    this.root.classList.toggle('mini', this.state === 'play' && !!this.play?.world);
    const c = this.card;
    const typing = document.activeElement === this.chatInput;
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
    if (this.chatBox) { c.append(this.chatBox); if (typing) this.chatInput.focus(); }
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
    if (lob.game === 'omok' || lob.game === 'ladders') {
      // The host's choice: double threes allowed or not / a board of our own.
      const r = el('button', 'bg-btn', `${L(lob.game === 'omok' ? T.rule33 : T.ownBoard)}: ${L(lob.opt ? T.on : T.off)}`);
      r.type = 'button';
      r.dataset.act = lob.game === 'omok' ? 'rule33' : 'ownboard';
      r.setAttribute('aria-pressed', lob.opt ? 'true' : 'false');
      if (lob.opt) r.style.background = '#c9ecc0';
      r.onclick = () => { lob.opt = lob.opt ? 0 : 1; this.render(); };
      const line = el('div', 'bg-row');
      line.append(r);
      c.append(line);
    }
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
      let label = p.game === 'omok' ? `${s === 0 ? '⚫' : '⚪'} ${n}` : p.game === 'ladders' ? `${PAWN_DOT[s]} ${n} · ${g.setup ? `🪜${g.stock[s][0]} 🐍${g.stock[s][1]}` : g.pos[s]}` : n;
      if (p.game === 'thief' && !out) label += g.hands[s].length ? ` · ${g.hands[s].length}` : ` · ✓ ${L(T.safe)}`;
      const chip = el('span', 'bg-seat' + (turnOf(g) === s ? ' on' : '') + (out ? ' gone' : ''), label);
      chip.dataset.seat = String(s);
      const face = p.faces?.[s];
      if (face) chip.append(el('span', 'bg-pop', FACES[face.n]));
      seats.append(chip);
    });
    c.append(seats);
    if (p.game === 'omok') this.drawOmok(c);
    else if (p.game === 'fruitbell') this.drawBell(c);
    else if (p.game === 'thief') this.drawThief(c);
    else if (p.game === 'ladders') this.drawLadders(c);
    else this.drawToy(c);
    c.append(el('div', 'bg-status', this.headline()));
    this.clockEl = el('div', 'bg-clock');
    c.append(this.clockEl);
    if (!g.over && p.ids.some((id) => id !== BOT && id !== this.net.myId)) {
      const faces = el('div', 'bg-faces');
      FACES.forEach((f, n) => {
        const b = el('button', null, f);
        b.type = 'button';
        b.dataset.face = String(n);
        b.onclick = () => this.myFace(n);
        faces.append(b);
      });
      c.append(faces);
    }
    if (p.party) {
      // I won: paper falls over the card, once.
      p.party = false;
      const party = el('div', 'bg-party');
      const COLOURS = ['#ffd36b', '#e8402a', '#2f7de1', '#27a35a', '#e06aa0', '#8d6ad0'];
      for (let i = 0; i < 36; i++) { const b = document.createElement('i'); b.style.cssText = `left:${(i * 37) % 100}%;background:${COLOURS[i % 6]};animation-delay:${(i % 9) * 0.07}s;transform:rotate(${i * 40}deg)`; party.append(b); }
      this.card.append(party);
      setTimeout(() => party.remove(), 2800);
    }
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
          this.begin(p.game, ids, this.net.myId, undefined, null, p.opt);
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
      if (TOYS.includes(p.game)) return this.status;
      if (p.game === 'thief') return g.loser < 0 ? this.status : g.loser === p.seat ? L(T.jokerMe) : tt('jokerThem', { name: p.names[g.loser] });
      if (g.winner < 0) return L(T.draw);
      return g.winner === p.seat ? L(T.won) : tt('winner', { name: p.names[g.winner] });
    }
    const turn = turnOf(g);
    let whose = turn === p.seat ? L(T.yourTurn) : tt('theirTurn', { name: p.names[turn] });
    if (p.game === 'ladders' && g.setup) whose = turn === p.seat ? L(T.placeHow) : tt('placing', { name: p.names[turn] });
    if (p.game === 'thief') {
      const from = g.from;
      whose = turn === p.seat ? tt('pickFrom', { name: p.names[from] }) : from === p.seat ? tt('choosingMine', { name: p.names[turn] }) : tt('choosing', { name: p.names[turn], from: p.names[from] });
    }
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
    if (g.lastMove) { // the stone just played: a red dot on it
      x.beginPath(); x.arc((g.lastMove[0] + 1) * px, (g.lastMove[1] + 1) * px, 4, 0, Math.PI * 2); x.fillStyle = '#e8402a'; x.fill();
    }
    cv.onclick = (e) => {
      const r = cv.getBoundingClientRect();
      const gx = Math.round(((e.clientX - r.left) / r.width) * (N + 1)) - 1;
      const gy = Math.round(((e.clientY - r.top) / r.height) * (N + 1)) - 1;
      if (g.canPlay(p.seat, gx, gy)) this.myMove(['o', gx, gy]);
      else if (!g.over && g.turn === p.seat && g.at(gx, gy) === -1 && g.banned(gx, gy, p.seat)) { this.status = L(T.no33Here); this.render(); }
    };
    const wrap = el('div', 'bg-omok-wrap');
    wrap.append(cv);
    if (g.lastMove && this.fresh(g.lastMove)) { // the stone drops onto the board
      const d = el('div', 'bg-drop');
      d.style.left = ((g.lastMove[0] + 1) / (N + 1)) * 100 + '%';
      d.style.top = ((g.lastMove[1] + 1) / (N + 1)) * 100 + '%';
      d.style.background = g.at(g.lastMove[0], g.lastMove[1]) === 0 ? '#1d1b22' : '#fbfaf6';
      wrap.append(d);
    }
    c.append(wrap);
    if (g.no33) c.append(el('div', 'bg-sub', L(T.rule33)));
  }

  // True the first time a move is drawn, so its little motion plays once and
  // not again on every redraw.
  fresh(move) {
    const p = this.play;
    if (!move || p.drawn === move) return false;
    p.drawn = move;
    return true;
  }

  drawBell(c) {
    const p = this.play;
    const g = p.g;
    const l = this.fresh(g.last) ? g.last : null;
    const grid = el('div', 'bg-fruits');
    p.names.forEach((n, s) => {
      const pile = el('div', 'bg-pile' + (turnOf(g) === s ? ' on' : '') + (g.out[s] ? ' gone' : '') + (l?.ring != null && l.p === s ? (l.ring ? ' got' : ' oops') : ''));
      pile.append(el('div', null, n));
      const top = g.up[s][g.up[s].length - 1];
      const card = el('div', 'bg-fcard' + (top ? '' : ' back') + (l?.flip && l.p === s ? ' new' : ''), top ? FRUIT_EMOJI[top.f].repeat(top.n) : '');
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
    const bell = el('button', 'bg-bell' + (l?.ring != null ? ' rung' : ''), L(T.ring));
    bell.type = 'button';
    bell.dataset.act = 'ring';
    bell.onpointerdown = (e) => { e.preventDefault(); this.myMove(['r', g.flips]); };
    c.append(bell);
  }

  // Snakes and ladders: the board is drawn on a canvas; a piece that just
  // moved walks there square by square, then rides its ladder or snake.
  startWalk(l) {
    const p = this.play;
    const path = [];
    for (let k = l.from + 1; k <= l.mid; k++) path.push(k);
    if (l.to !== l.mid) path.push(l.to);
    const now = performance.now();
    p.dice = { n: l.dice, at: now };
    p.walk = path.length ? { seat: l.p, from: l.from, path, at: now + DICE_MS } : null; // (the piece waits for the dice; none to walk when it rolled past the end)
    clearInterval(this.walkTimer);
    this.walkTimer = setInterval(() => {
      const w = this.play?.walk || (this.play?.dice && { at: this.play.dice.at + DICE_MS, path: [] });
      if (!w || !this.open || !this.ladCv?.isConnected) { clearInterval(this.walkTimer); return; }
      this.paintLadders(this.ladCv);
      if (performance.now() - w.at > (w.path.length + 1) * WALK_STEP + RIDE_MS + 400) { this.play.walk = null; this.play.dice = null; clearInterval(this.walkTimer); this.paintLadders(this.ladCv); }
    }, 50);
  }

  drawLadders(c) {
    const p = this.play;
    const g = p.g;
    const cv = el('canvas', 'bg-ladders');
    cv.width = 480; cv.height = 520;
    this.ladCv = cv;
    this.paintLadders(cv);
    c.append(cv);
    const row = el('div', 'bg-row');
    row.style.cssText = 'justify-content:center;align-items:center';
    if (g.setup) {
      // Laying the board out: choose a ladder or a snake, then two squares.
      if (g.over || g.turn !== p.seat) return;
      const have = g.stock[p.seat];
      p.pick ||= { kind: have[0] > 0 ? 0 : 1, first: 0 };
      if (!(have[p.pick.kind] > 0)) p.pick.kind = 1 - p.pick.kind;
      ['🪜', '🐍'].forEach((icon, kind) => {
        const b = el('button', 'bg-btn' + (p.pick.kind === kind ? ' bg-go' : ''), `${icon} ×${have[kind]}`);
        b.type = 'button';
        b.dataset.piece = String(kind);
        b.disabled = !(have[kind] > 0);
        b.onclick = () => { p.pick = { kind, first: 0 }; this.status = ''; this.render(); };
        row.append(b);
      });
      c.append(row);
      cv.style.cursor = 'pointer';
      cv.onclick = (e) => {
        const r = cv.getBoundingClientRect(), N = LADDERS_SIZE;
        const col = Math.floor(((e.clientX - r.left) / r.width) * N), up = N - 1 - Math.floor(((e.clientY - r.top) / r.width) * N);
        if (col < 0 || col >= N || up < 0 || up >= N) return;
        this.ladderTap(up * N + (up % 2 ? N - 1 - col : col) + 1);
      };
      return;
    }
    const dice = el('span', 'bg-dice', g.last?.dice && !(p.dice && performance.now() - p.dice.at < DICE_MS) ? '⚀⚁⚂⚃⚄⚅'[g.last.dice - 1] : '🎲');
    dice.dataset.dice = String(g.last?.dice ?? 0);
    row.append(dice);
    if (!g.over && !g.out[p.seat]) {
      const roll = el('button', 'bg-btn bg-go', L(T.roll));
      roll.type = 'button';
      roll.dataset.act = 'roll';
      roll.disabled = turnOf(g) !== p.seat;
      roll.onclick = () => this.myMove(['d']);
      row.append(roll);
    }
    c.append(row);
  }

  // A square tapped while laying the board out (also what the tests call).
  ladderTap(k) {
    const p = this.play, g = p?.g;
    if (!g?.setup || g.turn !== p.seat || !p.pick) return;
    if (!p.pick.first) {
      if (g.taken().has(k) || k < 2 || k >= LADDERS_END) { this.status = L(T.placeBad); this.render(); return; }
      p.pick.first = k; this.status = ''; this.render(); return;
    }
    const { kind, first } = p.pick;
    if (k === first) { p.pick.first = 0; this.render(); return; }
    if (!g.canPlace(p.seat, kind, first, k)) { p.pick.first = 0; this.status = L(T.placeBad); this.render(); return; }
    this.myMove(['a', kind, first, k]);
  }

  paintLadders(cv) {
    const p = this.play;
    if (!p) return;
    const g = p.g;
    const N = LADDERS_SIZE, S = cv.width / N, H = N * S;
    const x = cv.getContext('2d');
    // (square 1 is bottom left; rows run left-right, then right-left)
    const at = (k) => {
      if (k <= 0) return [S * 0.5, H + 20];
      const r = Math.floor((k - 1) / N), i = (k - 1) % N;
      return [((r % 2 ? N - 1 - i : i) + 0.5) * S, H - (r + 0.5) * S];
    };
    x.clearRect(0, 0, cv.width, cv.height);
    x.textAlign = 'left'; x.textBaseline = 'top';
    for (let k = 1; k <= LADDERS_END; k++) {
      const [cx, cy] = at(k);
      x.fillStyle = k === LADDERS_END ? '#ffd36b' : Math.round((cx + cy) / S) % 2 ? '#f6ecd8' : '#e9f3df';
      x.fillRect(cx - S / 2, cy - S / 2, S, S);
      x.fillStyle = 'rgba(43,34,48,.55)';
      x.font = '600 13px system-ui, sans-serif';
      x.fillText(k === LADDERS_END ? '🏁' : String(k), cx - S / 2 + 4, cy - S / 2 + 4);
    }
    x.lineCap = 'round';
    for (const [a, b] of Object.entries(g.up)) {
      const [x1, y1] = at(+a), [x2, y2] = at(b);
      const len = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / len * 8, ny = (x2 - x1) / len * 8;
      x.strokeStyle = '#a8703a'; x.lineWidth = 4;
      for (const m of [1, -1]) { x.beginPath(); x.moveTo(x1 + nx * m, y1 + ny * m); x.lineTo(x2 + nx * m, y2 + ny * m); x.stroke(); }
      x.lineWidth = 3;
      for (let t = 14; t < len - 6; t += 16) {
        const px = x1 + (x2 - x1) * t / len, py = y1 + (y2 - y1) * t / len;
        x.beginPath(); x.moveTo(px + nx, py + ny); x.lineTo(px - nx, py - ny); x.stroke();
      }
    }
    const SNAKE = ['#4caf6a', '#e06aa0', '#5a8ad0', '#e39b3a', '#8d6ad0', '#3fb0a8'];
    Object.entries(g.down).forEach(([a, b], n) => {
      const [x1, y1] = at(+a), [x2, y2] = at(b);
      const len = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      x.strokeStyle = SNAKE[n % SNAKE.length]; x.lineWidth = 9;
      x.beginPath(); x.moveTo(x1, y1);
      const waves = Math.max(2, Math.round(len / 60));
      for (let t = 1; t <= 24; t++) {
        const f = t / 24, w = Math.sin(f * Math.PI * waves) * 12 * (1 - f * 0.4);
        x.lineTo(x1 + (x2 - x1) * f + nx * w, y1 + (y2 - y1) * f + ny * w);
      }
      x.stroke();
      x.fillStyle = SNAKE[n % SNAKE.length];
      x.beginPath(); x.arc(x1, y1, 10, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff';
      for (const m of [1, -1]) { x.beginPath(); x.arc(x1 + nx * 4 * m, y1 + ny * 4 * m - 2, 2.6, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#2b2230';
      for (const m of [1, -1]) { x.beginPath(); x.arc(x1 + nx * 4 * m, y1 + ny * 4 * m - 2, 1.3, 0, Math.PI * 2); x.fill(); }
    });
    if (g.setup && p.pick?.first) { const [hx, hy] = at(p.pick.first); x.strokeStyle = '#ffb800'; x.lineWidth = 5; x.strokeRect(hx - S / 2 + 3, hy - S / 2 + 3, S - 6, S - 6); }
    // The pieces (several on one square stand side by side).
    const w = p.walk;
    const spot = g.pos.map((k, s) => {
      if (!w || w.seat !== s) return at(k);
      // (the last step of a ride, up a ladder or down a snake, takes longer)
      const rides = w.path.length && Math.abs(w.path[w.path.length - 1] - (w.path[w.path.length - 2] ?? w.from)) > 1 && (g.up[w.path[w.path.length - 2] ?? w.from] || g.down[w.path[w.path.length - 2] ?? w.from]);
      const el2 = performance.now() - w.at, walked = (w.path.length - (rides ? 1 : 0)) * WALK_STEP;
      const f = Math.max(0, Math.min(w.path.length, rides && el2 > walked ? w.path.length - 1 + (el2 - walked) / RIDE_MS : el2 / WALK_STEP));
      const i = Math.min(Math.floor(f), Math.max(0, w.path.length - 1)), t = f - i;
      const a = at(i === 0 ? w.from : w.path[i - 1]), b = at(w.path[Math.min(i, w.path.length - 1)]);
      const ride = rides && i === w.path.length - 1; // (a ladder or a snake: no hop)
      if (ride && b[1] > a[1]) { // down a snake: along its wiggle, the same curve it is drawn with
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), waves = Math.max(2, Math.round(len / 60));
        const e = t * t * (3 - 2 * t), wv = Math.sin(e * Math.PI * waves) * 12 * (1 - e * 0.4);
        return [a[0] + (b[0] - a[0]) * e - (b[1] - a[1]) / len * wv, a[1] + (b[1] - a[1]) * e + (b[0] - a[0]) / len * wv];
      }
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - (ride ? 0 : Math.sin(t * Math.PI) * 10)];
    });
    g.pos.forEach((k, s) => {
      if (g.out[s] || p.gone?.[s]) return;
      const same = g.pos.filter((v, q) => v === k && q < s && !(w && (w.seat === q || w.seat === s))).length;
      const [cx, cy] = [spot[s][0] + (k <= 0 ? s * 30 : same * 9), spot[s][1] + (k <= 0 ? 0 : 6)];
      x.fillStyle = 'rgba(0,0,0,.2)';
      x.beginPath(); x.ellipse(cx, cy + 11, 11, 4, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = PAWN[s]; x.strokeStyle = '#fff'; x.lineWidth = 2.5;
      x.beginPath(); x.arc(cx, cy, 11, 0, Math.PI * 2); x.fill(); x.stroke();
      if (s === p.seat) { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, 4, 0, Math.PI * 2); x.fill(); }
    });
    // The dice, thrown into the middle of the board: it tumbles, bounces,
    // and comes to rest on the number rolled.
    const d = p.dice;
    if (d) {
      const now = performance.now(), t = Math.min(1, (now - d.at) / DICE_MS), rest = t >= 1;
      const face = rest ? d.n : 1 + (Math.floor(now / 70) * 5 + d.n) % 6;
      const k = 1 - t, D = 92;
      const cx = cv.width / 2 + Math.sin(t * 9) * 60 * k * k - 90 * k * k, cy = H / 2 - Math.abs(Math.sin(t * Math.PI * 3)) * 70 * k;
      x.save();
      x.globalAlpha = rest ? Math.max(0, 1 - Math.max(0, now - d.at - DICE_MS - 900) / 300) : 1;
      x.translate(cx, cy);
      x.rotate(k * k * 7);
      x.fillStyle = 'rgba(0,0,0,.18)';
      x.beginPath(); x.roundRect(-D / 2 + 5, -D / 2 + 9, D, D, 16); x.fill();
      x.fillStyle = '#fff'; x.strokeStyle = '#d9cbb0'; x.lineWidth = 3;
      x.beginPath(); x.roundRect(-D / 2, -D / 2, D, D, 16); x.fill(); x.stroke();
      x.fillStyle = face === 1 ? '#e8402a' : '#2b2230';
      const o = D * 0.27, PIPS = [[[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
      for (const [px, py] of PIPS[face - 1]) { x.beginPath(); x.arc(px * o, py * o, face === 1 ? 12 : 8, 0, Math.PI * 2); x.fill(); }
      x.restore();
    }
  }

  cardFace(card, cls = '') {
    const joker = card === 'JB';
    const suit = joker ? '' : card.slice(-1);
    const b = el('button', 'bg-card1' + (joker ? ' joker' : suit === '♥' || suit === '♦' ? ' red' : '') + cls);
    b.type = 'button';
    if (joker) b.textContent = '🃏';
    else b.append(el('span', null, card.slice(0, -1)), el('span', null, suit));
    return b;
  }

  // The joker game: the cards being picked from on top (backs, unless they
  // are mine), my own hand below.
  drawThief(c) {
    const p = this.play;
    const g = p.g;
    // Seen from my seat (Yozi 2026-11-23): the other player sits across the
    // table holding their cards up in a fan, their face (and the faces they
    // pull) above it; my own cards are fanned in my hands at the bottom.
    const scene = el('div', 'bg-fp' + (this.view ? ' has3d' : '') + (p.world ? ' world' : ''));
    if (this.view || p.world) {
      (p.world ? this.table : this.view).sync({
        counts: g.hands.map((h) => h.length), from: g.over ? -1 : g.from, turn: g.turn, sel: g.sel, over: g.over,
        faces: p.ids.map((_, s) => (p.faces?.[s] ? FACES[p.faces[s].n] : '')), gone: p.ids.map((_, s) => !!p.gone?.[s]),
        canPick: !g.over && g.turn === p.seat,
      });
      if (this.view) scene.append(this.view.el);
    }
    // A hand of cards as a fan: each card turned a little more, on an arc.
    const fanOf = (cards, { faces, sel = -1, big = false, onTap = null, point = false }) => {
      const fan = el('div', 'bg-fan' + (big ? ' big' : ''));
      const n = cards.length, w = big ? 50 : 40, room = Math.min(420, (this.card.clientWidth || 480) - 64);
      const step = n > 1 ? Math.min(w - 8, (room - w) / (n - 1)) : 0, turn = Math.min(6, 44 / Math.max(1, n - 1));
      cards.forEach((card, i) => {
        const b = faces ? this.cardFace(card) : el('button', 'bg-card1 back');
        b.type = 'button';
        b.dataset.card = String(i);
        const k = i - (n - 1) / 2;
        b.style.marginLeft = i ? `${step - w}px` : '0';
        b.style.setProperty('--tilt', `${k * turn}deg`);
        b.style.setProperty('--drop', `${Math.abs(k) ** 1.6 * (big ? 2.2 : 1.6) - (sel === i ? 20 : 0)}px`);
        if (sel === i) { b.classList.add('sel'); if (point) b.append(el('span', 'bg-point', '👇')); }
        b.disabled = !onTap;
        if (onTap) b.onclick = () => onTap(i);
        fan.append(b);
      });
      return fan;
    };
    const who = (s) => {
      const box = el('div', 'bg-who');
      const face = p.faces?.[s];
      box.append(el('div', 'bg-head' + (face ? ' pull' : ''), face ? FACES[face.n] : p.ids[s] === BOT ? '🤖' : '🙂'), el('div', 'bg-sub', p.names[s]));
      return box;
    };
    if (!g.over) {
      const from = g.from, mine = from === p.seat, myTurn = g.turn === p.seat;
      // Across the table: whoever I am dealing with. I am being picked from:
      // the picker; otherwise the one holding the cards being picked.
      if (p.world && !mine && !myTurn) { /* (not my business just now: only my own cards, below) */ } else {
      scene.append(who(mine ? g.turn : from));
      if (mine) {
        // Their finger hovers over my cards: I hold them up and see which one.
        const fan = fanOf(g.hands[p.seat], { faces: true, sel: g.sel, big: true, point: true });
        fan.dataset.hand = 'from';
        fan.classList.add('mine');
        scene.append(fan);
        c.append(scene);
        return;
      }
      const fan = fanOf(g.hands[from], { faces: false, sel: g.sel, big: true, onTap: myTurn ? (i) => this.myMove(['s', i]) : null });
      fan.dataset.hand = 'from';
      scene.append(fan);
      if (myTurn) {
        const row = el('div', 'bg-row');
        row.style.justifyContent = 'center';
        const draw = el('button', 'bg-btn bg-go', L(T.drawCard));
        draw.type = 'button';
        draw.dataset.act = 'draw';
        draw.disabled = g.sel < 0;
        draw.onclick = () => this.myMove(['t', g.sel]);
        row.append(draw);
        scene.append(row);
      }
      }
    }
    if (g.hands[p.seat].length) {
      const table = el('div', 'bg-mine');
      table.append(el('div', 'bg-sub', L(T.myHand)));
      const hand = fanOf(g.hands[p.seat], { faces: true });
      hand.dataset.hand = 'mine';
      table.append(hand);
      scene.append(table);
    }
    if (scene.childNodes.length) c.append(scene);
  }

  drawToy(c) {
    const p = this.play;
    const g = p.g;
    const box = el('div', 'bg-toy bg-' + p.game + (this.view ? ' has3d' : ''));
    const bang = g.last?.bang;
    if (this.view) {
      this.view.sync({ pressed: g.pressed, bang: !!bang, canPick: !g.over && turnOf(g) === p.seat, wobble: g.risk?.() ?? 0, placing: !!g.last?.placing });
      box.append(this.view.el);
      if (bang) {
        box.append(el('div', 'bg-shout', L(SHOUT[p.game])));
        if (!p.flashed) { p.flashed = true; this.card.classList.remove('bang'); void this.card.offsetWidth; this.card.classList.add('bang'); }
      }
    }
    const face = { croc: bang ? '🐊💥' : '🐊', pirate: bang ? '🏴‍☠️💥' : '🏴‍☠️', bulldog: bang ? '🐶💢' : '🐶💤', tower: bang ? '🧱💥' : '🧱' }[p.game];
    box.append(el('div', 'bg-face' + (bang ? ' bang' : ''), face));
    const spots = el('div', 'bg-spots');
    const icon = { croc: '🦷', pirate: '🗡️', bulldog: '🦴', tower: '🧱' }[p.game];
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
    if (p.game === 'tower' && !g.over) { const w = el('div', 'bg-sub', tt('wobble', { n: Math.round(g.risk() * 100) })); w.dataset.wobble = '1'; c.append(w); }
  }
}

