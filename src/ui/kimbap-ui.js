// Free-style kimbap class panel at Suragan Cooking Class (rules in
// core/kimbap-game.js, text in kimbap-text.js). Seven steps from seasoning
// the rice to slicing the roll. Players fill it with anything on the shelf;
// a classic roll is shown as an idea only. How well-liked each filling is
// stays hidden: the teacher only reacts in words. Styles are shared with the
// kimchi and japchae classes.
import { t, getLanguage, localName } from '../core/i18n.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import {
  KIMBAP_GAME, STEPS, RICE, MAX_SPOONS, riceScore, riceNote, FILLINGS, MIN_FILL, MAX_FILL, CLASSIC,
  fillScore, fillNote, gimScore, ROWS, COLS, spreadScore, ROLL_ZONE, ROLL_TURNS, rollScore, rollWord,
  finishScore, sliceScore, totalScore, WORDS,
} from '../core/kimbap-game.js';
import { BT, KIMBAP_LINES } from './kimbap-text.js';

const STEP_ICON = { rice: '🍚', fill: '🥕', gim: '🟩', spread: '🍙', roll: '🌀', finish: '✨', slice: '🔪' };
// The colour each filling shows in a cut slice.
const FILL_COLOR = {
  danmuji: '#f4d03f', egg: '#ffe28a', spinach: '#2e8b3a', carrot: '#f08a2c', fishcake: '#e2b98a', ham: '#e88a8a',
  burdock: '#7a4e2c', cucumber: '#6fbf4a', crab: '#e5533d', tuna: '#d8c8a8', bulgogi: '#6b3a22', perilla: '#3f7a2f',
  cheese: '#ffcf3a', kimchi: '#d9402c', tempura: '#e8a84a', avocado: '#9ccc65', mala: '#b3261e', cilantro: '#4caf50',
  durian: '#e6d98a', ketchup: '#c62828', chips: '#f2c14e', choco: '#4e2a1a', gummy: '#ff6fae',
};
const ODD = new Set(['durian', 'ketchup', 'chips', 'choco', 'gummy', 'mala', 'cilantro']);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const L = (k, vars) => {
  let s = localName(BT[k], getLanguage()) ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};
const chip = (text, run, cls = 'chip') => {
  const b = el('button', cls, text);
  b.onclick = run;
  return b;
};
// One slice of the roll: black gim edge, white rice, the fillings in the middle.
export function kimbapPiece(picks, cls = 'kimbap-piece') {
  const p = el('span', cls);
  const mid = el('i');
  const cols = (picks.length ? picks : ['danmuji']).map((id) => FILL_COLOR[id] || '#ccc');
  const step = 100 / cols.length;
  mid.style.background = `conic-gradient(${cols.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')})`;
  p.append(mid);
  return p;
}

export class KimbapUI {
  // root: the sheet; wallet: { add(n) }; onSay(line): the teacher speaks;
  // onMedal(medal, coins); onBox(score, picks): a roll into the bag, false when full.
  constructor({ root, wallet, onSay, onMedal, onBox, onClose }) {
    Object.assign(this, { root, wallet, onSay, onMedal, onBox, onClose });
    this.medals = new Medals();
    this.raf = 0;
    this.picks = [];
  }

  get open() { return !this.root.hidden; }

  show() {
    this.root.hidden = false;
    this.renderStart();
    this.say('hello');
  }

  close() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.root.hidden = true;
    this.onClose?.();
  }

  say(key) {
    const [ko, rom, tr] = KIMBAP_LINES[key];
    this.onSay?.([ko, rom, localName(tr, getLanguage())]);
  }

  _frame(sub) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🍙 ' + L('title')));
    if (sub) this.root.append(sub);
  }

  _loop(fn) {
    cancelAnimationFrame(this.raf);
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (fn(dt) === false || !this.open) { this.raf = 0; return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  renderStart() {
    this._frame();
    const best = this.medals.best(KIMBAP_GAME);
    const steps = el('ol', 'kimchi-plan');
    for (const k of STEPS) steps.append(el('li', null, STEP_ICON[k] + ' ' + L('s.' + k)));
    const actions = el('div', 'order-actions');
    actions.append(chip(L('start'), () => this.begin(), 'primary'));
    this.root.append(
      el('p', 'fine', L('intro')),
      el('p', 'kimbap-free', L('free')),
      steps,
      el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')),
      actions,
    );
  }

  begin() {
    this.scores = {};
    this.picks = [];
    this.i = 0;
    this.step();
  }

  step() {
    const key = STEPS[this.i];
    const head = el('div', 'kimchi-head');
    const dots = el('div', 'kimchi-dots');
    STEPS.forEach((k, j) => dots.append(el('i', j < this.i ? 'on' : j === this.i ? 'now' : null)));
    head.append(el('strong', null, L('step', { n: this.i + 1 }) + ' · ' + STEP_ICON[key] + ' ' + L('s.' + key)), dots);
    this._frame(head);
    this.root.append(el('p', 'order-hint', '👩‍🍳 ' + L('tip.' + key)));
    this.body = el('div', 'kimchi-body');
    this.actions = el('div', 'order-actions');
    this.root.append(this.body, this.actions);
    this['r_' + key]();
  }

  done(score, ...noteKeys) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.scores[STEPS[this.i]] = score;
    this.body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const box = el('div', 'kimchi-verdict ' + (score >= 85 ? 'good' : score >= 55 ? 'ok' : 'bad'));
    box.append(el('strong', null, (score >= 85 ? '⭐ ' : score >= 55 ? '👍 ' : '💦 ') + t('grill.score', { n: score })));
    for (const k of noteKeys.filter(Boolean)) box.append(el('span', null, L(k)));
    this.body.append(box);
    this.say(score >= 85 ? 'great' : score >= 55 ? 'ok' : 'oops');
    const last = this.i === STEPS.length - 1;
    this.actions.replaceChildren(chip(last ? L('finish') : L('next') + ' →', () => {
      if (last) this.finish();
      else { this.i++; this.step(); }
    }, 'primary'));
    this.root.scrollTop = this.root.scrollHeight;
  }

  // 1 · Season the rice from the card (sugar and vinegar sit on the shelf too).
  r_rice() {
    const amounts = {};
    const card = el('div', 'kimchi-recipe');
    card.append(el('strong', null, '📜 ' + L('card')));
    const ul = el('ul');
    const amountText = (g) => (g.id === 'salt' ? L('pinch') : g.ok[0] === 0 ? L('optional') : L('spoon12'));
    for (const g of RICE.filter((q) => !q.decoy)) ul.append(el('li', null, `${g.emoji} ${g.ko} · ${L('g.' + g.id)} — ${amountText(g)}`));
    card.append(ul);
    const shelf = el('div', 'kimchi-shelf');
    for (const g of RICE) {
      amounts[g.id] = 0;
      const tile = el('div', 'kimchi-ing');
      const n = el('strong', 'n', '0');
      const set = (v) => { amounts[g.id] = v; n.textContent = v; tile.classList.toggle('in', v > 0); };
      const minus = chip('−', () => { if (amounts[g.id] > 0) set(amounts[g.id] - 1); });
      const plus = chip('+', () => {
        if (amounts[g.id] >= MAX_SPOONS) return;
        set(amounts[g.id] + 1);
        if (g.decoy && amounts[g.id] === 1) this.say('hmm');
      });
      const name = el('span', 'nm');
      name.append(el('b', null, g.emoji + ' ' + L('g.' + g.id)), el('small', null, getLanguage() === 'ko' ? g.rom : g.ko + ' · ' + g.rom));
      const ctl = el('span', 'ctl');
      ctl.append(minus, n, plus);
      tile.append(name, ctl);
      shelf.append(tile);
    }
    this.body.append(el('div', 'kimchi-bowl', '🍚 밥 · bap'), card, shelf);
    this.actions.append(chip('🥄 ' + L('mixRice'), () => this.done(riceScore(amounts), 'rice.' + riceNote(amounts)), 'primary'));
  }

  // 2 · Free choice of 3-8 fillings. The classic roll is only an idea.
  r_fill() {
    const picks = [];
    const idea = el('div', 'kimchi-recipe');
    idea.append(el('strong', null, '💡 ' + L('classicCard')));
    idea.append(el('p', null, CLASSIC.map((id) => FILLINGS.find((f) => f.id === id).emoji + ' ' + L('f.' + id)).join(' · ')));
    const count = el('strong', 'kimchi-clock');
    const grid = el('div', 'kimbap-fill');
    const ko = getLanguage() === 'ko';
    const btns = {};
    const ready = chip('✅ ' + L('putIn'), () => {
      this.picks = [...picks];
      this.done(fillScore(picks), 'fill.' + fillNote(picks));
    }, 'primary');
    const refresh = () => {
      count.textContent = L('picked', { n: picks.length });
      ready.disabled = picks.length < MIN_FILL;
      for (const f of FILLINGS) btns[f.id].disabled = !picks.includes(f.id) && picks.length >= MAX_FILL;
      preview.replaceWith(preview = kimbapPiece(picks, 'kimbap-piece big'));
    };
    let preview = kimbapPiece([], 'kimbap-piece big');
    let hmmSaid = false;
    for (const f of FILLINGS) {
      const b = el('button', 'chip');
      b.append(el('span', null, f.emoji), el('b', null, L('f.' + f.id)));
      if (!ko) b.append(el('small', null, f.ko));
      b.onclick = () => {
        const at = picks.indexOf(f.id);
        if (at >= 0) picks.splice(at, 1);
        else if (picks.length < MAX_FILL) {
          picks.push(f.id);
          if (ODD.has(f.id) && !hmmSaid) { hmmSaid = true; this.say('hmm'); }
        }
        b.classList.toggle('on', picks.includes(f.id));
        refresh();
      };
      btns[f.id] = b;
      grid.append(b);
    }
    const top = el('div', 'kimbap-top');
    top.append(preview, count);
    this.body.append(el('p', 'kimbap-free', L('free')), idea, top, grid);
    this.actions.append(ready);
    refresh();
    this.say('free');
  }

  // 3 · Which way up does the seaweed go?
  r_gim() {
    const sheet = el('div', 'kimbap-sheet shiny');
    sheet.append(el('span', null, '🎋 김발 · gimbal'));
    this.body.append(sheet);
    const pick = (down) => () => {
      sheet.classList.toggle('shiny', !down);
      this.done(gimScore(down), down ? 'gim.good' : 'gim.bad');
    };
    this.actions.append(chip('⬇️ ' + L('shinyDown'), pick(true)), chip('⬆️ ' + L('shinyUp'), pick(false)));
  }

  // 4 · Tap the cells of the sheet to spread rice; the top row stays bare.
  r_spread() {
    const cells = new Set();
    const grid = el('div', 'kimbap-sheet kimbap-grid');
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    for (let r = ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < COLS; c++) {
        const key = `${r},${c}`;
        const b = el('button', 'cell' + (r === ROWS - 1 ? ' edge' : ''));
        b.setAttribute('aria-label', key);
        b.onclick = () => {
          if (cells.has(key)) cells.delete(key); else cells.add(key);
          b.classList.toggle('on', cells.has(key));
        };
        grid.append(b);
      }
    }
    this.body.append(grid);
    this.actions.append(chip('✅ ' + L('spreadDone'), () => {
      const top = [...cells].some((k) => k.startsWith(`${ROWS - 1},`));
      const gaps = [...cells].filter((k) => !k.startsWith(`${ROWS - 1},`)).length < (ROWS - 1) * COLS;
      this.done(spreadScore(cells), top && 'spread.top', gaps && 'spread.gaps', !top && !gaps && 'spread.good');
    }, 'primary'));
  }

  // 5 · Three turns of the mat: stop the pressure in the green zone each time.
  r_roll() {
    const presses = [];
    const roll = el('div', 'kimbap-mat');
    const log = el('div', 'kimchi-leaves');
    const m = el('div', 'kimchi-meter');
    const fill = el('i');
    const z = el('b');
    z.style.left = ROLL_ZONE[0] * 100 + '%';
    z.style.width = (ROLL_ZONE[1] - ROLL_ZONE[0]) * 100 + '%';
    m.append(z, fill);
    const turn = el('strong', 'kimchi-clock', L('turn', { n: 1 }));
    roll.append(kimbapPiece(this.picks, 'kimbap-piece'));
    this.body.append(roll, turn, m, el('small', 'kimchi-legend', '🟩 ' + L('roll.firm')), log);
    let v = 0, dir = 1;
    const press = chip('✊ ' + L('press'), () => {
      presses.push(v);
      log.append(el('div', 'kimchi-said', `${L('turn', { n: presses.length })}: ${L('roll.' + rollWord(v))}`));
      roll.style.setProperty('--turns', presses.length);
      if (presses.length >= ROLL_TURNS) this.done(rollScore(presses));
      else { turn.textContent = L('turn', { n: presses.length + 1 }); v = 0; dir = 1; }
    }, 'primary');
    this.actions.append(press);
    this._loop((dt) => {
      if (presses.length >= ROLL_TURNS) return false;
      v += dir * dt * 0.9;
      if (v > 1) { v = 1; dir = -1; }
      if (v < 0) { v = 0; dir = 1; }
      fill.style.width = v * 100 + '%';
    });
  }

  // 6 · Sesame oil on top, then rest it seam side down (or up).
  r_finish() {
    const s = { oil: false };
    const roll = el('div', 'kimbap-mat rolled');
    roll.append(kimbapPiece(this.picks, 'kimbap-piece'));
    this.body.append(roll);
    const oil = chip('🫒 ' + L('oil'), () => { s.oil = true; oil.disabled = true; oil.textContent = '🫒 ' + L('oil') + ' ✓'; roll.classList.add('oiled'); });
    const rest = (down) => () => this.done(finishScore({ oil: s.oil, seamDown: down }), !s.oil && 'finish.dry', !down && 'finish.open');
    this.actions.append(oil, chip('⬇️ ' + L('seamDown'), rest(true), 'primary'), chip('⬆️ ' + L('seamUp'), rest(false)));
  }

  // 7 · Wet the knife, cut, count the slices.
  r_slice() {
    const s = { wet: false, slices: 1 };
    const board = el('div', 'kimbap-board');
    const count = el('strong', 'kimchi-clock', L('slices', { n: 1 }));
    const paint = () => {
      board.replaceChildren();
      for (let k = 0; k < Math.min(s.slices, 16); k++) board.append(kimbapPiece(this.picks, 'kimbap-piece small'));
      count.textContent = L('slices', { n: s.slices });
    };
    paint();
    this.body.append(board, count);
    const wet = chip('💧 ' + L('wet'), () => { s.wet = true; wet.disabled = true; wet.textContent = '💧 ' + L('wet') + ' ✓'; });
    const cut = chip('🔪 ' + L('cut'), () => { if (s.slices < 16) { s.slices++; paint(); } });
    const ok = chip('✅ ' + L('done'), () => {
      const n = s.slices;
      this.done(sliceScore(s), !s.wet && 'slice.sticky', n < 8 ? 'slice.big' : n > 10 ? 'slice.thin' : 'slice.good');
    }, 'primary');
    this.actions.append(wet, cut, ok);
  }

  finish() {
    const score = totalScore(this.scores);
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(KIMBAP_GAME, medal) : 0;
    if (coins) this.wallet?.add(coins, undefined, { r: 'medal', once: 'medal:' + KIMBAP_GAME + ':' + medal });
    const boxed = this.onBox?.(score, this.picks) !== false;
    this._frame();
    this.say('bye');
    const res = el('div', 'grill-result');
    res.append(
      kimbapPiece(this.picks, 'kimbap-piece big'),
      el('strong', null, (medal ? medalIcon(medal) + ' ' : '') + L('result') + ' · ' + (medal ? t('grill.' + medal) : L('tryAgain'))),
      el('p', null, t('grill.score', { n: score }) + (coins ? ' · 🪙 +' + coins : '')),
      el('p', 'fine', L('inside', { list: this.picks.map((id) => FILLINGS.find((f) => f.id === id).emoji + ' ' + L('f.' + id)).join(', ') })),
    );
    const table = el('ol', 'kimchi-scores');
    for (const k of STEPS) {
      const v = this.scores[k] ?? 0;
      const li = el('li', null, STEP_ICON[k] + ' ' + L('s.' + k));
      li.append(el('b', v >= 85 ? 'good' : v >= 55 ? 'ok' : 'bad', String(v)));
      table.append(li);
    }
    const words = el('div', 'kimchi-words');
    words.append(el('strong', null, '📝 ' + L('words')));
    for (const w of WORDS) {
      const row = el('div');
      row.append(el('b', null, w.ko), el('small', null, w.rom), el('span', null, L('w.' + w.key)));
      words.append(row);
    }
    const actions = el('div', 'order-actions');
    actions.append(chip(L('quit'), () => this.close()), chip(L('again'), () => this.begin(), 'primary'));
    this.root.append(res, el('p', 'order-hint', boxed ? L('gift') : L('bagFull')), boxed ? el('p', 'order-hint', L('canSell')) : '', table, words, el('p', 'kimchi-fact', '🎉 ' + L('share')), actions);
    this.onMedal?.(medal, coins);
  }
}

