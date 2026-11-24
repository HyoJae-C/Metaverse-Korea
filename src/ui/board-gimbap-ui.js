// Gimbap Master's screen inside the board games panel (ui/board-games-ui.js
// calls drawGimbap when the game is gimbap). The rules are core/board-games.js
// (Gimbap): two dice say how many fillings; the order shows them in a row;
// press seaweed, rice, then the fillings in that order. Each screen times its
// own player from the moment the order shows (p.gbAt), so a slow line costs
// nobody the round.
import { GIMBAP_BASE, GIMBAP_FILLINGS, GIMBAP_GOAL, gimbapWorth } from '../core/board-games.js';
import { GB, GB_NAME } from './board-gimbap-text.js';

// [emoji, colour] of each thing that goes in. (No pictures of their own yet: a colour and an emoji tell them apart.)
const LOOK = {
  kim: ['⬛', '#1d2b22'], rice: ['🍚', '#f4f1e8'], danmuji: ['🟡', '#f6d21f'], spinach: ['🥬', '#2f8f3e'], carrot: ['🥕', '#f08a24'],
  egg: ['🥚', '#ffe58a'], ham: ['🥓', '#f29aa6'], burdock: ['🪵', '#8a5a2b'], tuna: ['🐟', '#b9c6d8'], cheese: ['🧀', '#ffb52e'],
  cucumber: ['🥒', '#8fd06a'], crab: ['🦀', '#ff6b57'], fishcake: ['🍢', '#d9a86a'], perilla: ['🍃', '#3d7a4a'],
};
const PAD = [...GIMBAP_BASE, ...GIMBAP_FILLINGS]; // my buttons, always in the same places

const CSS = `
#bg-panel .gb-dice { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0; }
#bg-panel .gb-dice .bg-dice.spin { animation: gb-spin .28s linear infinite; }
@keyframes gb-spin { to { transform: rotate(360deg); } }
#bg-panel .gb-sum { font-size: 22px; font-weight: 800; }
#bg-panel .gb-order { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 8px; border-radius: 12px; background: #1d2b22; margin: 6px 0; }
#bg-panel .gb-chip { position: relative; border-radius: 8px; background: #fffdf6; text-align: center; font-size: 22px; line-height: 1; padding: 6px 0 9px; overflow: hidden; }
#bg-panel .gb-chip i, #bg-panel .gb-pad button i { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: var(--c); }
#bg-panel .gb-chip.done { opacity: .35; }
#bg-panel .gb-chip.next { box-shadow: 0 0 0 3px #ffb800; }
#bg-panel .gb-pad { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 8px 0 4px; }
#bg-panel .gb-pad button { position: relative; border: 0; border-radius: 12px; background: #fff; box-shadow: 0 2px 0 #d8c9ad, 0 1px 4px rgba(0,0,0,.2); padding: 7px 2px 11px; min-height: 58px; overflow: hidden; font-size: 11px; font-weight: 700; line-height: 1.15; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; }
#bg-panel .gb-pad button b { display: block; font-size: 24px; line-height: 1.1; font-weight: 400; }
#bg-panel .gb-pad button:active { transform: translateY(2px); box-shadow: 0 0 0 #d8c9ad; }
#bg-panel .gb-pad.oops { animation: gb-oops .3s; }
@keyframes gb-oops { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
#bg-panel .gb-roll { width: 64px; height: 64px; margin: 6px auto; border-radius: 50%; border: 6px solid #1d2b22; background: #fffdf6; box-sizing: border-box; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 2px; padding: 8px; }
#bg-panel .gb-roll i { width: 9px; height: 9px; border-radius: 3px; background: var(--c); }
#bg-panel .gb-times { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 12px; font-size: 13px; color: #6b5d4a; }
#bg-panel .gb-times .won { color: #c2331d; font-weight: 800; }
@media (prefers-reduced-motion: reduce) { #bg-panel .gb-dice .bg-dice.spin, #bg-panel .gb-pad.oops { animation: none; } }
`;
let styled = false;
const secs = (ms) => (ms / 1000).toFixed(2);

// What the last round came to, in words (the panel's status line).
export function saidGimbap(g, names, L) {
  const l = g.last;
  if (!l || l.roll) return '';
  const fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  return l.won < 0 ? L(GB.nobody) : fill(GB.took, { name: names[l.won], t: secs(l.ms), w: l.worth });
}

// One press of my pad. Right: one further along (the last one sends my time). Wrong: from the seaweed again.
function press(id, { p, act, ui }) {
  const g = p.g, st = p.gb;
  if (g.over || g.phase !== 'make' || !st || st.round !== g.round || st.sent) return;
  const seq = g.seq();
  if (id === seq[st.pos]) {
    st.pos++;
    st.oops = 0;
    ui.onEvent('move', 'gimbap');
    if (st.pos === seq.length) { st.sent = Math.max(1, Math.round(performance.now() - p.gbAt)); act(['b', g.round, st.sent]); }
  } else {
    st.pos = 0;
    st.oops = performance.now();
    ui.onEvent('wrong', 'gimbap');
  }
  ui.render();
}

// c: the card to draw into. p: the panel's game ({ g, seat, names, dice, gbAt }). act(a): my move.
// ui: the panel (rollButton(), render(), onEvent()).
export function drawGimbap(c, { p, act, el, L, ui }) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
  const g = p.g, me = p.seat, now = performance.now();
  const fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const tumbling = !!p.dice && now - p.dice.at < p.dice.ms;
  const chip = (id, cls = '') => {
    const d = el('div', 'gb-chip' + cls, LOOK[id][0]);
    d.dataset.item = id;
    d.title = L(GB_NAME[id]);
    const bar = el('i');
    bar.style.setProperty('--c', LOOK[id][1]);
    d.append(bar);
    return d;
  };

  // The two dice, and what they add up to.
  const dice = el('div', 'gb-dice');
  dice.dataset.dice = g.dice && !tumbling ? g.dice.join(',') : '';
  for (const k of [0, 1]) dice.append(el('span', 'bg-dice' + (tumbling ? ' spin' : ''), g.dice && !tumbling ? '⚀⚁⚂⚃⚄⚅'[g.dice[k] - 1] : '🎲'));
  if (g.dice && !tumbling) dice.append(el('span', 'gb-sum', `= ${g.dice[0] + g.dice[1]}`));
  c.append(dice);

  if (g.phase === 'make' && !tumbling) {
    // The order: what goes in, first to last. What I have pressed fades; the next one is ringed.
    if (p.gb?.round !== g.round) p.gb = { round: g.round, pos: 0, sent: 0, oops: 0 };
    const st = p.gb, seq = g.seq(), n = g.order.length, playing = me >= 0 && !g.out[me];
    c.append(el('div', 'bg-sub', (n >= 10 ? L(GB.big) + ' ' : n <= 3 ? L(GB.mini) + ' ' : '') + fill(GB.count, { n, w: gimbapWorth(n) })));
    const order = el('div', 'gb-order');
    order.dataset.seq = seq.join(',');
    order.dataset.pos = String(st.pos);
    seq.forEach((id, i) => order.append(chip(id, playing && i < st.pos ? ' done' : playing && i === st.pos && !st.sent ? ' next' : '')));
    c.append(order);
    if (!playing) { c.append(el('div', 'bg-sub', L(GB.making))); return; }
    if (st.sent || g.times[me] >= 0) { const w = el('div', 'bg-sub', fill(GB.mine, { t: secs(g.times[me] >= 0 ? g.times[me] : st.sent) })); w.dataset.mine = '1'; c.append(w); return; }
    c.append(el('div', 'bg-sub', L(st.oops && now - st.oops < 1500 ? GB.oops : GB.go)));
    const pad = el('div', 'gb-pad' + (st.oops && now - st.oops < 300 ? ' oops' : ''));
    for (const id of PAD) {
      const b = el('button');
      b.type = 'button';
      b.dataset.gb = id;
      b.append(el('b', null, LOOK[id][0]), document.createTextNode(L(GB_NAME[id])));
      const bar = el('i');
      bar.style.setProperty('--c', LOOK[id][1]);
      b.append(bar);
      // (on the way down, not on the click: every tenth of a second counts)
      b.onpointerdown = (e) => { e.preventDefault(); press(id, { p, act, ui }); };
      b.onclick = (e) => { if (e.detail === 0) press(id, { p, act, ui }); }; // (the keyboard)
      pad.append(b);
    }
    c.append(pad);
    return;
  }

  // Between rounds: the last roll of gimbap, cut open, and everyone's time.
  const l = g.last && !g.last.roll ? g.last : null;
  if (l && !tumbling) {
    const res = el('div', 'gb-result');
    res.dataset.won = String(l.won);
    if (l.won >= 0) {
      const roll = el('div', 'gb-roll');
      for (const i of l.order) { const dot = el('i'); dot.style.setProperty('--c', LOOK[GIMBAP_FILLINGS[i]][1]); roll.append(dot); }
      res.append(roll);
    }
    const times = el('div', 'gb-times');
    l.times.map((t, s) => [t, s]).filter(([t]) => t >= 0).sort((a, b) => a[0] - b[0]).forEach(([t, s]) => times.append(el('span', s === l.won ? 'won' : null, `${p.names[s]} ${secs(t)}`)));
    res.append(times);
    c.append(res);
  }
  if (g.over || tumbling) return;
  c.append(el('div', 'bg-sub', `${L(GB.rollHow)} (🏁 ${GIMBAP_GOAL})`));
  if (me >= 0 && g.turn === me) {
    const row = el('div', 'bg-row');
    row.style.justifyContent = 'center';
    row.append(ui.rollButton());
    c.append(row);
  }
}
