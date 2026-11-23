// The mafia game's screen inside the board games panel (ui/board-games-ui.js
// calls drawMafia when the game is mafia). The rules are core/board-games.js
// (Mafia). Every screen holds the whole game, so this file is what keeps a
// secret: it shows a player their own role, the mafia each other, the officer
// their own answers, and everyone everything once the game is over (Yozi
// 2026-11-23: roles are shown at the end, not at a death).
import { MAFIA_PASS } from '../core/board-games.js';
import { M, ROLE, ROLE_ICON } from './board-mafia-text.js';

const CSS = `
#bg-panel .mf-phase { font-weight: 800; font-size: 17px; text-align: center; margin: 2px 0 6px; }
#bg-panel .mf-phase small { font-weight: 700; margin-left: 8px; color: #b3542e; }
#bg-panel .mf-night { background: #262a44; color: #f4f1ff; border-radius: 14px; padding: 10px; }
#bg-panel .mf-role { text-align: center; font-weight: 700; margin: 4px 0; }
#bg-panel .mf-news { text-align: center; background: #fff3d6; color: #2b2230; border-radius: 10px; padding: 6px 8px; margin: 6px 0; font-size: 14px; }
#bg-panel .mf-hint { text-align: center; font-size: 14px; opacity: .85; margin: 4px 0; }
#bg-panel .mf-people { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 8px 0; }
#bg-panel .mf-who { border: 2px solid transparent; border-radius: 12px; padding: 10px 8px; min-height: 48px; font: 600 15px system-ui, sans-serif; background: #f4efe6; color: #2b2230; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 6px; text-align: left; }
#bg-panel .mf-who:disabled { cursor: default; opacity: .75; }
#bg-panel .mf-who.dead { opacity: .4; text-decoration: line-through; }
#bg-panel .mf-who.sel { border-color: #e8402a; background: #ffe2d9; }
#bg-panel .mf-who.me { background: #e3f0ff; }
#bg-panel .mf-who span:last-child { white-space: nowrap; font-size: 13px; }
`;
let styled = false;

// c: the card to draw into. p: the panel's game ({ g, seat, names, gone }).
// act(a): my move. L(row): the row in my language. left: seconds left in the phase.
export function drawMafia(c, { p, act, el, L, left }) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
  const fmt = (row, v = {}) => L(row).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const g = p.g, me = p.seat, role = g.roles[me], alive = g.alive[me], names = p.names;
  const box = el('div', 'mf' + (g.phase === 'night' ? ' mf-night' : ''));
  box.dataset.phase = g.phase;

  if (g.over) {
    box.append(el('div', 'mf-phase', L(g.winner === 'town' ? M.townWin : M.mafiaWin)));
  } else {
    const head = el('div', 'mf-phase', fmt(M[g.phase], { n: g.round }));
    const clock = el('small', null, left > 0 ? `⏳ ${left}` : '');
    clock.dataset.clock = '1';
    head.append(clock);
    box.append(head);
  }

  // What everyone was told last: the night's news in the morning, the vote's at nightfall.
  if (g.last && !g.over) {
    let news = '';
    if (g.phase === 'talk' || g.phase === 'vote') news = g.last.died >= 0 ? fmt(M.died, { name: names[g.last.died] }) : L(g.last.saved ? M.saved : M.quiet);
    else if (g.last.voted != null) news = g.last.voted >= 0 ? fmt(M.votedOut, { name: names[g.last.voted] }) : L(M.noVote);
    if (news) box.append(el('div', 'mf-news', news));
  }

  box.append(el('div', 'mf-role', fmt(M.youAre, { role: `${ROLE_ICON[role]} ${L(ROLE[role])}` })));
  if (role === 'mafia') for (let s = 0; s < g.n; s++) if (s !== me && g.roles[s] === 'mafia') box.append(el('div', 'mf-hint', fmt(M.partner, { name: names[s] })));
  // The officer's notebook: every answer so far.
  if (role === 'police') for (const k of g.checks) box.append(el('div', 'mf-hint', fmt(k.mafia ? M.isMafia : M.notMafia, { name: names[k.target] })));

  // What tapping a person does now, and who I have tapped.
  let tap = null, mine = -1, hint = '';
  if (!g.over && !alive) hint = L(M.dead);
  else if (g.phase === 'night') {
    if (role === 'mafia') { tap = (s) => g.alive[s] && g.roles[s] !== 'mafia' && ['k', s]; mine = g.pick.kill; hint = L(M.hintMafia); }
    else if (role === 'doctor') { tap = (s) => g.alive[s] && ['h', s]; mine = g.pick.heal; hint = L(M.hintDoctor); }
    else if (role === 'police') { tap = g.pick.check < 0 ? (s) => g.alive[s] && s !== me && ['q', s] : null; mine = g.pick.check; hint = L(M.hintPolice); }
    else hint = L(M.hintTown);
  } else if (g.phase === 'talk') hint = L(M.talkHow);
  else if (g.phase === 'vote') { tap = g.votes[me] < 0 ? (s) => g.alive[s] && s !== me && ['v', s] : null; mine = g.votes[me]; hint = L(M.voteHow); }
  if (hint) box.append(el('div', 'mf-hint', hint));

  const people = el('div', 'mf-people');
  const tally = g.phase === 'night' && g.last?.count ? g.last.count : null; // (the vote just counted)
  for (let s = 0; s < g.n; s++) {
    const b = el('button', 'mf-who' + (g.alive[s] ? '' : ' dead') + (mine === s ? ' sel' : '') + (s === me ? ' me' : ''));
    b.type = 'button';
    b.dataset.seat = String(s);
    // A role shows when the game is over; before that, only my own and my fellow mafia's.
    const known = g.over || s === me || (role === 'mafia' && g.roles[s] === 'mafia');
    const notes = [];
    if (known) notes.push(ROLE_ICON[g.roles[s]] + (g.over ? ' ' + L(ROLE[g.roles[s]]) : ''));
    if (!g.alive[s]) notes.push('💀');
    if (g.phase === 'vote' && g.alive[s] && g.votes[s] >= 0) notes.push('✓');
    if (g.phase === 'talk' && g.alive[s] && g.dones[s]) notes.push('✓');
    if (tally?.[s]) notes.push(fmt(M.votes, { n: tally[s] }));
    b.append(el('span', null, names[s]), el('span', null, notes.join(' ')));
    const a = tap && tap(s);
    b.disabled = !a;
    if (a) b.onclick = () => act(a);
    people.append(b);
  }
  box.append(people);

  const living = g.living().length;
  if (!g.over && g.phase === 'talk') {
    box.append(el('div', 'mf-hint', fmt(M.doneCount, { a: g.dones.filter(Boolean).length, b: living })));
    if (alive && !g.dones[me]) {
      const d = el('button', 'bg-btn bg-go', L(M.done));
      d.type = 'button';
      d.dataset.act = 'mf-done';
      d.onclick = () => act(['z']);
      const row = el('div', 'bg-row');
      row.style.justifyContent = 'center';
      row.append(d);
      box.append(row);
    }
  }
  if (!g.over && g.phase === 'vote') {
    box.append(el('div', 'mf-hint', fmt(M.votedCount, { a: g.living().filter((i) => g.votes[i] >= 0).length, b: living })));
    if (alive && g.votes[me] < 0) {
      const d = el('button', 'bg-btn', L(M.pass));
      d.type = 'button';
      d.dataset.act = 'mf-pass';
      d.onclick = () => act(['v', MAFIA_PASS]);
      const row = el('div', 'bg-row');
      row.style.justifyContent = 'center';
      row.append(d);
      box.append(row);
    }
  }
  c.append(box);
}

export { M as MAFIA_TEXT };
