// Fish Book Bingo's screen inside the board games panel (ui/board-games-ui.js
// calls drawBingo when the game is bingo). The rules are core/board-games.js
// (Bingo): fill a board from the game's pool of fish book pictures, then call
// one fish each in turn. Loaded the first time the game is picked.
//
// Nothing here is a race: filling is by taps at your own pace (the host's
// long clock fills what is left at random), and a call is two taps, a pick
// and then the call button, so a slip of the finger calls nothing.
import { bingoCode, BINGO_POOL, BINGO_GOAL } from '../core/board-games.js';
import { FISH, FISH_SHEET } from '../core/fishing.js';
import { fishStampIcon } from './fishing-ui.js';
import { getLanguage, localName } from '../core/i18n.js';
import { BB } from './board-bingo-text.js';

export { BB };
const fishOf = (i) => FISH.find((f) => f.id === FISH_SHEET[i]);
// A short name for a small cell: Korean in Korean, the player's language otherwise (the book shows the long one).
export const bingoFishName = (i) => { const f = fishOf(i); return !f ? '?' : getLanguage() === 'ko' ? f.ko : localName(f.name, getLanguage()); };

const CSS = `
#bg-panel .bb-board { display: grid; gap: 3px; width: min(100%, 320px); margin: 8px auto; padding: 6px; border-radius: 14px; background: #2f6f8f; box-sizing: border-box; }
#bg-panel .bb-cell { position: relative; aspect-ratio: 1; border: 0; border-radius: 8px; background: #fffdf6; padding: 2px 1px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; min-width: 0; font: 600 9px system-ui, sans-serif; color: #2b2230; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
#bg-panel .bb-cell .fish-stamp-sprite { width: 70%; }
#bg-panel .bb-cell span.nm { display: block; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
#bg-panel .bb-cell.empty { background: #d9ecf3; }
#bg-panel .bb-cell.hit { background: #ffe08a; }
#bg-panel .bb-cell.hit::after { content: ''; position: absolute; inset: 12%; border: 3px solid rgba(214,52,40,.75); border-radius: 50%; pointer-events: none; }
#bg-panel .bb-cell.line { background: #ffb3a1; }
#bg-panel .bb-cell.pick { box-shadow: 0 0 0 3px #ffb800 inset; }
#bg-panel .bb-cell.new { animation: bb-pop .5s; }
@keyframes bb-pop { 40% { transform: scale(1.18); } }
#bg-panel .bb-pool { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; margin: 4px 0 6px; }
#bg-panel .bb-pool button { position: relative; aspect-ratio: 1; border: 0; border-radius: 7px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.18); padding: 0; display: flex; align-items: center; justify-content: center; min-width: 0; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
#bg-panel .bb-pool button .fish-stamp-sprite { width: 86%; }
#bg-panel .bb-pool button.used { opacity: .25; }
#bg-panel .bb-pool button.mine::after { content: ''; position: absolute; right: 2px; top: 2px; width: 6px; height: 6px; border-radius: 50%; background: #e8402a; }
#bg-panel .bb-pool button.pick { box-shadow: 0 0 0 3px #ffb800; }
#bg-panel .bb-last { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 800; margin: 4px 0; }
#bg-panel .bb-last .fish-stamp-sprite { width: 40px; }
#bg-panel .bb-shout { margin: 4px auto; padding: 8px 12px; border-radius: 12px; background: #e8402a; color: #fff; font-size: 18px; font-weight: 800; text-align: center; animation: bb-pop .5s; }
#bg-panel .bb-last small { color: #c2331d; font-size: 12px; }
@media (prefers-reduced-motion: reduce) { #bg-panel .bb-cell.new, #bg-panel .bb-shout { animation: none; } }
`;
let styled = false;

// What the last call came to, in words (the panel's status line).
export function saidBingo(g, names, L, me) {
  const l = g.last;
  if (!l) return '';
  const fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  return fill(BB.called, { name: names[l.p], fish: bingoFishName(l.fish) }) + (l.hit.includes(me) ? ' ' + L(BB.onMine) : '');
}
// Who has bingo, when two or more got there on the same call.
export function bingoTogether(g, names, L) {
  return L(BB.together).replace('{names}', g.winners.map((s) => names[s]).join(', '));
}
// Someone made a new line: "○○ 1 bingo!".
export function lineUp(name, n, L) {
  return L(BB.lineUp).replace('{name}', name).replace('{n}', n);
}
// The lobby's line under the size button.
export function sizeHow(n, L) {
  return L(BB.sizeHow).replace('{k}', BINGO_POOL[n]).replace('{g}', BINGO_GOAL[n]);
}

function cell(el, fish, cls) {
  const b = el('button', 'bb-cell' + cls);
  b.type = 'button';
  if (fish >= 0) {
    const f = fishOf(fish);
    if (f) b.append(fishStampIcon(f));
    const nm = bingoFishName(fish);
    b.append(el('span', 'nm', nm));
    b.title = nm;
    b.dataset.fish = String(fish);
  }
  return b;
}

// c: the card to draw into. p: the panel's game ({ g, seat, names }). act(a): my move. ui: the panel (render(), onEvent()).
export function drawBingo(c, { p, act, el, L, ui }) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
  const g = p.g, me = p.seat, n = g.size, playing = me >= 0 && !g.out[me];
  const fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const board = el('div', 'bb-board');
  board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  const pool = el('div', 'bb-pool');

  if (g.phase === 'setup') {
    // Filling my board: a fish from the pool goes into the first empty cell; a filled cell empties again.
    if (!playing || g.boards[me]) {
      c.append(el('div', 'bg-sub', L(BB.waiting)));
      if (g.boards[me]) { g.boards[me].forEach((f) => board.append(cell(el, f, ''))); c.append(board); }
      return;
    }
    p.bb ||= { cells: new Array(n * n).fill(-1) };
    const cells = p.bb.cells;
    c.append(el('div', 'bg-sub', `${L(BB.fillHow)} (${cells.filter((f) => f >= 0).length}/${n * n})`));
    cells.forEach((f, i) => {
      const b = cell(el, f, f < 0 ? ' empty' : '');
      b.dataset.cell = String(i);
      b.onclick = () => { if (cells[i] >= 0) { cells[i] = -1; ui.onEvent('move', 'bingo'); ui.render(); } };
      board.append(b);
    });
    board.dataset.filled = String(cells.filter((f) => f >= 0).length);
    c.append(board);
    const row = el('div', 'bg-row');
    row.style.justifyContent = 'center';
    const full = cells.every((f) => f >= 0);
    if (!full) {
      const r = el('button', 'bg-btn', L(BB.random));
      r.type = 'button';
      r.dataset.act = 'bb-random';
      r.onclick = () => { p.bb.cells = g.randomBoard(Math.random, cells); ui.onEvent('move', 'bingo'); ui.render(); };
      row.append(r);
    }
    if (cells.some((f) => f >= 0)) {
      const x = el('button', 'bg-btn', L(BB.clear));
      x.type = 'button';
      x.onclick = () => { cells.fill(-1); ui.render(); };
      row.append(x);
    }
    const go = el('button', 'bg-btn bg-go', L(BB.ready));
    go.type = 'button';
    go.dataset.act = 'bb-ready';
    go.disabled = !full;
    if (!full) go.style.opacity = '.45';
    go.onclick = () => { if (cells.every((f) => f >= 0)) act(['g', bingoCode(cells)]); };
    row.append(go);
    c.append(row);
    c.append(el('div', 'bg-sub', L(BB.pool)));
    for (const f of g.pool) {
      const b = el('button', cells.includes(f) ? 'used' : null);
      b.type = 'button';
      b.dataset.pool = String(f);
      b.title = bingoFishName(f);
      const fi = fishOf(f);
      if (fi) b.append(fishStampIcon(fi));
      b.onclick = () => {
        const at = cells.indexOf(-1);
        if (cells.includes(f) || at < 0) return;
        cells[at] = f;
        ui.onEvent('move', 'bingo');
        ui.render();
      };
      pool.append(b);
    }
    c.append(pool);
    return;
  }

  // Calling: my board with what has been called stamped, the lines done in red; the pool below.
  const myTurn = playing && !g.over && g.turn === me;
  if (!myTurn) p.bbPick = -1;
  const last = g.last;
  if (p.bbShout && performance.now() < p.bbShout.until) { const sh = el('div', 'bb-shout', p.bbShout.text); sh.dataset.shout = '1'; c.append(sh); }
  if (last) {
    const line = el('div', 'bb-last');
    const fi = fishOf(last.fish);
    if (fi) line.append(fishStampIcon(fi));
    line.append(el('span', null, fill(BB.called, { name: p.names[last.p], fish: bingoFishName(last.fish) })));
    if (last.hit.includes(me)) line.append(el('small', null, L(BB.onMine)));
    line.dataset.last = String(last.fish);
    c.append(line);
  }
  const pick = (f) => { if (!myTurn || g.called.includes(f)) return; p.bbPick = p.bbPick === f ? -1 : f; ui.onEvent('move', 'bingo'); ui.render(); };
  const mine = playing ? g.boards[me] : null;
  if (mine) {
    const marked = g.marked(me), inLine = new Set(g.doneLines(me).flatMap((i) => g.lines[i]));
    mine.forEach((f, i) => {
      const b = cell(el, f, (inLine.has(i) ? ' line' : marked[i] ? ' hit' : '') + (p.bbPick === f ? ' pick' : '') + (last?.fish === f ? ' new' : ''));
      b.dataset.cell = String(i);
      if (marked[i]) b.dataset.hit = '1';
      b.onclick = () => pick(f);
      board.append(b);
    });
    board.dataset.lines = String(g.linesOf(me));
    c.append(board);
  }
  if (g.over) return;
  if (myTurn) {
    c.append(el('div', 'bg-sub', L(BB.callHow)));
    const row = el('div', 'bg-row');
    row.style.justifyContent = 'center';
    const go = el('button', 'bg-btn bg-go', p.bbPick >= 0 ? fill(BB.call, { fish: bingoFishName(p.bbPick) }) : fill(BB.call, { fish: '…' }));
    go.type = 'button';
    go.dataset.act = 'bb-call';
    go.disabled = !(p.bbPick >= 0);
    if (go.disabled) go.style.opacity = '.45';
    go.onclick = () => { if (p.bbPick >= 0) { const f = p.bbPick; p.bbPick = -1; act(['w', f]); } };
    row.append(go);
    c.append(row);
  }
  c.append(el('div', 'bg-sub', `${L(BB.pool)} · ${g.called.length}/${g.pool.length}`));
  for (const f of g.pool) {
    const used = g.called.includes(f);
    const b = el('button', (used ? 'used' : '') + (mine?.includes(f) ? ' mine' : '') + (p.bbPick === f ? ' pick' : ''));
    b.type = 'button';
    b.dataset.pool = String(f);
    b.title = bingoFishName(f);
    const fi = fishOf(f);
    if (fi) b.append(fishStampIcon(fi));
    b.onclick = () => pick(f);
    pool.append(b);
  }
  c.append(pool);
}
