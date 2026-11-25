// One Card's screen inside the board games panel (ui/board-games-ui.js calls
// drawOneCard when the game is onecard). The rules are core/board-games.js
// (OneCard): match the top card by suit or number; 2, A and the jokers make
// the next player draw; J skips, Q turns the table round, K plays again, a 7
// names the next suit. The cards carry the café's animal suits.
import { cardRank, cardSuit, isJoker, attackOf, SUITS, ONECARD_BUST } from '../core/board-games.js';
import { suitArt } from './board-card-suits.js';
import { OC } from './board-onecard-text.js';

const CSS = `
#bg-panel .oc-mid { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 8px 0 4px; }
#bg-panel .oc-stock { position: relative; }
#bg-panel .oc-stock small { position: absolute; left: 0; right: 0; bottom: -18px; text-align: center; font-size: 12px; font-weight: 700; color: #8a7a66; }
#bg-panel .oc-card { width: 56px; height: 80px; border: 0; border-radius: 9px; background: #fff; box-shadow: 0 1px 5px rgba(0,0,0,.28); font: 800 18px system-ui, sans-serif; line-height: 1.05; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; color: #2b2230; }
#bg-panel .oc-card.red { color: #d43d3d; }
#bg-panel .oc-card svg { width: 26px; height: 26px; }
#bg-panel .oc-card.back { background: repeating-linear-gradient(45deg, #3f6fb5 0 6px, #5a8ad0 6px 12px); border: 2px solid #fff; box-sizing: border-box; }
#bg-panel .oc-card.joker { font-size: 34px; }
#bg-panel .oc-card.joker.dark { background: #2b2230; }
#bg-panel .oc-card.joker.bright { background: linear-gradient(135deg, #ffe08a, #ff9ec4 55%, #9ecbff); }
#bg-panel .oc-now { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; font-weight: 700; color: #8a7a66; min-width: 44px; }
#bg-panel .oc-now svg { width: 30px; height: 30px; }
#bg-panel .oc-now .oc-dir { font-size: 20px; line-height: 1; }
#bg-panel .oc-hit { text-align: center; font-weight: 800; color: #c2331d; margin: 4px 0; }
#bg-panel .oc-hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; margin: 22px 0 6px; max-height: 190px; overflow-y: auto; padding: 8px 2px 2px; }
#bg-panel .oc-hand .oc-card { width: 44px; height: 64px; font-size: 15px; transition: transform .12s; cursor: pointer; }
#bg-panel .oc-hand .oc-card svg { width: 20px; height: 20px; }
#bg-panel .oc-hand .oc-card.joker { font-size: 26px; }
#bg-panel .oc-hand .oc-card.can { transform: translateY(-7px); box-shadow: 0 0 0 3px #ffb800, 0 5px 9px rgba(0,0,0,.3); }
#bg-panel .oc-hand .oc-card:disabled { opacity: .55; cursor: default; }
#bg-panel .oc-suits { display: flex; justify-content: center; gap: 10px; margin: 6px 0; }
#bg-panel .oc-suits button { width: 56px; height: 56px; border: 0; border-radius: 14px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); cursor: pointer; display: flex; align-items: center; justify-content: center; }
#bg-panel .oc-suits svg { width: 38px; height: 38px; }
#bg-panel .oc-help { margin: 6px 0; border-radius: 12px; background: #f3e6cc; font-size: 13px; font-weight: 600; }
#bg-panel .oc-help summary { padding: 8px 12px; cursor: pointer; font-weight: 800; }
#bg-panel .oc-help ul { list-style: none; margin: 0; padding: 0 12px 10px; display: grid; gap: 5px; }
#bg-panel .oc-help li { display: flex; align-items: center; gap: 8px; line-height: 1.25; }
#bg-panel .oc-help li > b { flex: 0 0 44px; height: 26px; border-radius: 6px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); display: flex; align-items: center; justify-content: center; gap: 1px; font-size: 14px; }
#bg-panel .oc-help li > b svg { width: 16px; height: 16px; }
#bg-panel .oc-help li > b.dark { background: #2b2230; }
#bg-panel .oc-help li > b.bright { background: linear-gradient(135deg, #ffe08a, #ff9ec4 55%, #9ecbff); }
#bg-panel .oc-help p { margin: 0; padding: 0 12px 10px; font-weight: 500; opacity: .85; }
`;
let styled = false;

function face(el, card, cls = '') {
  const joker = isJoker(card), suit = cardSuit(card);
  const b = el('button', 'oc-card' + (joker ? ` joker ${card === 'JB' ? 'dark' : 'bright'}` : suit === '♥' || suit === '♦' ? ' red' : '') + cls);
  b.type = 'button';
  b.dataset.card = card;
  if (joker) b.textContent = '🃏';
  else b.append(el('span', null, cardRank(card)), suitArt(suit));
  return b;
}

// What the last move was, in words (the panel's status line).
export function saidOneCard(g, names, L, tt) {
  const l = g.last;
  if (!l) return '';
  const name = names[l.p], fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  if (l.bust) return fill(OC.bust, { name });
  if (l.drew) return fill(OC.drew, { name, n: l.drew });
  const parts = [];
  const r = cardRank(l.put);
  if (r === 'J') parts.push(L(OC.jump)); else if (r === 'Q') parts.push(L(OC.turnBack)); else if (r === 'K') parts.push(L(OC.again));
  if (!g.over && g.hands[l.p].length === 1) parts.push(fill(OC.oneLeft, { name }));
  return parts.join(' ');
}

// What each special card does, folded away until it is wanted (Yozi 2026-11-25). The panel keeps it open or
// shut across redraws (ui.ocHelp).
function help(el, L, ui) {
  const fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const d = el('details', 'oc-help');
  d.open = !!ui.ocHelp;
  d.addEventListener('toggle', () => { ui.ocHelp = d.open; });
  const sum = el('summary', null, L(OC.help));
  // The toggle event comes a moment after the tap; a redraw in between must not fold it shut again.
  sum.addEventListener('click', () => { ui.ocHelp = !d.open; });
  d.append(sum);
  const list = el('ul');
  const row = (label, text, cls = null) => {
    const li = el('li'), b = el('b', cls);
    for (const part of label) b.append(typeof part === 'string' ? document.createTextNode(part) : part);
    li.append(b, el('span', null, text));
    list.append(li);
  };
  row(['2'], fill(OC.helpDraw, { n: attackOf('2♥') }));
  row(['A'], fill(OC.helpDraw, { n: attackOf('A♥') }));
  row(['A', suitArt('♠')], fill(OC.helpDraw, { n: attackOf('A♠') }));
  row(['🃏'], fill(OC.helpDraw, { n: attackOf('JB') }), 'dark');
  row(['🃏'], fill(OC.helpDraw, { n: attackOf('JC') }), 'bright');
  row(['7'], L(OC.helpSeven));
  row(['J'], L(OC.helpJ));
  row(['Q'], L(OC.helpQ));
  row(['K'], L(OC.helpK));
  d.append(list, el('p', null, `${L(OC.helpBlock)} ${fill(OC.helpBust, { n: ONECARD_BUST })}`));
  return d;
}

// c: the card to draw into. p: the panel's game ({ g, seat, names }). act(a): my move.
// ui: the panel (it keeps which 7 waits for its suit across redraws).
export function drawOneCard(c, { p, act, el, L, ui }) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
  const g = p.g, me = p.seat, mine = !g.over && g.turn === me;
  const fill = (row, v) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  if (ui.ocSeven && (!mine || !g.hands[me]?.includes(ui.ocSeven))) ui.ocSeven = null;

  const mid = el('div', 'oc-mid');
  const stock = el('div', 'oc-stock');
  stock.append(el('div', 'oc-card back'), el('small', null, String(g.stock.length)));
  const top = face(el, g.top);
  top.disabled = true;
  top.dataset.top = g.top;
  // The suit to follow (a 7 may have changed it; after a joker, its colour), and which way the turn goes.
  const now = el('div', 'oc-now');
  now.dataset.suit = g.suit || '';
  if (g.suit) now.append(suitArt(g.suit));
  now.append(el('span', 'oc-dir', g.dir > 0 ? '↻' : '↺'));
  mid.append(stock, top, now);
  c.append(mid);
  c.append(help(el, L, ui));
  if (g.attack && !g.over) { const hit = el('div', 'oc-hit', fill(OC.attacked, { n: g.attack })); hit.dataset.attack = String(g.attack); c.append(hit); }

  if (me < 0 || g.out[me] || g.over) return;
  if (ui.ocSeven) {
    // A 7 is in my fingers: which suit next?
    c.append(el('div', 'bg-sub', L(OC.pickSuit)));
    const row = el('div', 'oc-suits');
    for (const s of SUITS) {
      const b = el('button');
      b.type = 'button';
      b.dataset.suit = s;
      b.append(suitArt(s));
      b.onclick = () => { const card = ui.ocSeven; ui.ocSeven = null; act(['c', card, s]); };
      row.append(b);
    }
    c.append(row);
  }
  const can = new Set(g.playable(me));
  const hand = el('div', 'oc-hand');
  hand.dataset.hand = 'mine';
  // (sorted for the eye: by suit, then number; the rules keep their own order)
  const order = g.hands[me].slice().sort((a, b) => (isJoker(a) - isJoker(b)) || SUITS.indexOf(cardSuit(a)) - SUITS.indexOf(cardSuit(b)) || attackOf(b) - attackOf(a) || cardRank(a).localeCompare(cardRank(b), 'en', { numeric: true }));
  for (const card of order) {
    const b = face(el, card, can.has(card) ? ' can' : '');
    b.disabled = !can.has(card);
    b.onclick = () => {
      if (cardRank(card) === '7' && g.hands[me].length > 1) { ui.ocSeven = ui.ocSeven === card ? null : card; ui.render(); } else act(['c', card]);
    };
    hand.append(b);
  }
  c.append(hand);
  if (mine) {
    const row = el('div', 'bg-row');
    row.style.justifyContent = 'center';
    const draw = el('button', 'bg-btn' + (can.size ? '' : ' bg-go'), g.attack ? fill(OC.drawN, { n: g.attack }) : fill(OC.drawN, { n: 1 }));
    draw.type = 'button';
    draw.dataset.act = 'draw';
    draw.onclick = () => act(['d']);
    row.append(draw);
    c.append(row);
    if (!can.size && !g.attack) c.append(el('div', 'bg-sub', L(OC.cant)));
  }
}
