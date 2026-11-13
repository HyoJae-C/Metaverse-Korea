// The panel for the cooking classes made of shared steps (core/cook-class.js):
// the Tteok Making Class and the Bibimbap Making Class. Each class gives its
// steps (core/tteok-game.js, core/bibimbap-game.js) and its text
// (tteok-text.js, bibimbap-text.js); the step kinds, the medals and the
// result card are the same. Styles are shared with the kimchi, japchae and
// kimbap classes.
import { t, getLanguage, localName } from '../core/i18n.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import { amountsScore, amountsNote, pickScore, pickNote, meterScore, meterWord, choiceScore, checksScore, totalScore } from '../core/cook-class.js';
import { CT, CLASS_LINES } from './cook-class-text.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const chip = (text, run, cls = 'chip') => {
  const b = el('button', cls, text);
  b.onclick = run;
  return b;
};

export class CookClassUI {
  // game: { id, icon, steps, words, stepIcon: { id: emoji } }; text: the
  // class's own text table; lines: { hello, bye } of [ko, rom, { lang: … }].
  // wallet: { add(n) }; onSay(line): the teacher speaks; onMedal(medal, coins);
  // onBox(score, picks): the dish into the bag, false when full.
  constructor({ root, game, text, lines, wallet, onSay, onMedal, onBox, onClose }) {
    Object.assign(this, { root, game, text, lines: { ...CLASS_LINES, ...lines }, wallet, onSay, onMedal, onBox, onClose });
    this.medals = new Medals();
    this.raf = 0;
    this.picks = [];
  }

  get open() { return !this.root.hidden; }

  L(k, vars) {
    let s = localName(this.text[k] || CT[k], getLanguage()) ?? k;
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
    return s;
  }

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
    const [ko, rom, tr] = this.lines[key];
    this.onSay?.([ko, rom, localName(tr, getLanguage())]);
  }

  _frame(sub) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, this.game.icon + ' ' + this.L('title')));
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

  // The name of a thing on the shelf, with its Korean (or romanised) name.
  _name(item) {
    const name = el('span', 'nm');
    name.append(el('b', null, item.emoji + ' ' + this.L('i.' + item.id)), el('small', null, getLanguage() === 'ko' ? item.rom : item.ko + ' · ' + item.rom));
    return name;
  }

  renderStart() {
    this._frame();
    const best = this.medals.best(this.game.id);
    const steps = el('ol', 'kimchi-plan');
    for (const st of this.game.steps) steps.append(el('li', null, this.game.stepIcon[st.id] + ' ' + this.L('s.' + st.id)));
    const actions = el('div', 'order-actions');
    actions.append(chip(this.L('start'), () => this.begin(), 'primary'));
    this.root.append(
      el('p', 'fine', this.L('intro')),
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
    const st = this.game.steps[this.i];
    const head = el('div', 'kimchi-head');
    const dots = el('div', 'kimchi-dots');
    this.game.steps.forEach((k, j) => dots.append(el('i', j < this.i ? 'on' : j === this.i ? 'now' : null)));
    head.append(el('strong', null, this.L('step', { n: this.i + 1, t: this.game.steps.length }) + ' · ' + this.game.stepIcon[st.id] + ' ' + this.L('s.' + st.id)), dots);
    this._frame(head);
    this.root.append(el('p', 'order-hint', '🧑‍🍳 ' + this.L('tip.' + st.id)));
    this.body = el('div', 'kimchi-body');
    this.actions = el('div', 'order-actions');
    this.root.append(this.body, this.actions);
    this['r_' + st.type](st);
  }

  done(score, ...noteKeys) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.scores[this.game.steps[this.i].id] = score;
    this.body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const box = el('div', 'kimchi-verdict ' + (score >= 85 ? 'good' : score >= 55 ? 'ok' : 'bad'));
    box.append(el('strong', null, (score >= 85 ? '⭐ ' : score >= 55 ? '👍 ' : '💦 ') + t('grill.score', { n: score })));
    for (const k of noteKeys.filter(Boolean)) box.append(el('span', null, this.L(k)));
    this.body.append(box);
    this.say(score >= 85 ? 'great' : score >= 55 ? 'ok' : 'oops');
    const last = this.i === this.game.steps.length - 1;
    this.actions.replaceChildren(chip(last ? this.L('finish') : this.L('next') + ' →', () => {
      if (last) this.finish();
      else { this.i++; this.step(); }
    }, 'primary'));
    this.root.scrollTop = this.root.scrollHeight;
  }

  // Spoons of each thing, as on the recipe card (decoys sit on the shelf too).
  r_amounts(st) {
    const amounts = {};
    const card = el('div', 'kimchi-recipe');
    card.append(el('strong', null, '📜 ' + this.L('card')));
    const ul = el('ul');
    for (const g of st.items.filter((q) => !q.decoy)) {
      const amount = g.ok[0] === 0 ? this.L('optional') : '🥄 ' + (g.ok[0] === g.ok[1] ? g.ok[0] : g.ok[0] + '–' + g.ok[1]);
      ul.append(el('li', null, `${g.emoji} ${g.ko} · ${this.L('i.' + g.id)} — ${amount}`));
    }
    card.append(ul);
    const shelf = el('div', 'kimchi-shelf');
    for (const g of st.items) {
      amounts[g.id] = 0;
      const tile = el('div', 'kimchi-ing');
      const n = el('strong', 'n', '0');
      const set = (v) => { amounts[g.id] = v; n.textContent = v; tile.classList.toggle('in', v > 0); };
      const minus = chip('−', () => { if (amounts[g.id] > 0) set(amounts[g.id] - 1); });
      const plus = chip('+', () => {
        if (amounts[g.id] >= st.max) return;
        set(amounts[g.id] + 1);
        if (g.decoy && amounts[g.id] === 1) this.say('hmm');
      });
      const ctl = el('span', 'ctl');
      ctl.append(minus, n, plus);
      tile.append(this._name(g), ctl);
      shelf.append(tile);
    }
    this.body.append(card, shelf);
    this.actions.append(chip(this.L('act.' + st.id), () => this.done(amountsScore(st, amounts), amountsNote(st, amounts)), 'primary'));
  }

  // Free choice of min-max things. The classic ones are shown as an idea.
  r_pick(st) {
    const picks = [];
    const idea = el('div', 'kimchi-recipe');
    idea.append(el('strong', null, '💡 ' + this.L('idea')));
    idea.append(el('p', null, st.items.filter((f) => f.classic).map((f) => f.emoji + ' ' + this.L('i.' + f.id)).join(' · ')));
    const count = el('strong', 'kimchi-clock');
    const grid = el('div', 'kimbap-fill');
    const ko = getLanguage() === 'ko';
    const btns = {};
    const ready = chip('✅ ' + this.L('putIn'), () => {
      this.picks = [...picks];
      this.done(pickScore(st, picks), pickNote(st, picks));
    }, 'primary');
    const refresh = () => {
      count.textContent = this.L('picked', { n: picks.length, max: st.max });
      ready.disabled = picks.length < st.min;
      for (const f of st.items) btns[f.id].disabled = !picks.includes(f.id) && picks.length >= st.max;
    };
    let hmmSaid = false;
    for (const f of st.items) {
      const b = el('button', 'chip');
      b.append(el('span', null, f.emoji), el('b', null, this.L('i.' + f.id)));
      if (!ko) b.append(el('small', null, f.ko));
      b.onclick = () => {
        const at = picks.indexOf(f.id);
        if (at >= 0) picks.splice(at, 1);
        else if (picks.length < st.max) {
          picks.push(f.id);
          if (f.pref < 50 && !hmmSaid) { hmmSaid = true; this.say('hmm'); }
        }
        b.classList.toggle('on', picks.includes(f.id));
        refresh();
      };
      btns[f.id] = b;
      grid.append(b);
    }
    this.body.append(el('p', 'kimbap-free', this.L('free')), idea, count, grid);
    this.actions.append(ready);
    refresh();
  }

  // Stop the moving bar in the green zone, `times` times.
  r_meter(st) {
    const presses = [];
    const log = el('div', 'kimchi-leaves');
    const m = el('div', 'kimchi-meter');
    const fill = el('i');
    const z = el('b');
    z.style.left = st.zone[0] * 100 + '%';
    z.style.width = (st.zone[1] - st.zone[0]) * 100 + '%';
    m.append(z, fill);
    const turn = el('strong', 'kimchi-clock', st.times > 1 ? this.L('turn', { n: 1, t: st.times }) : '');
    this.body.append(el('div', 'kimchi-bowl', this.game.stepIcon[st.id]), turn, m, el('small', 'kimchi-legend', '🟩 ' + this.L(st.id + '.ok')), log);
    let v = 0, dir = 1;
    const press = chip(this.game.stepIcon[st.id] + ' ' + this.L('act.' + st.id), () => {
      presses.push(v);
      log.append(el('div', 'kimchi-said', (st.times > 1 ? this.L('turn', { n: presses.length, t: st.times }) + ': ' : '') + this.L(st.id + '.' + meterWord(st, v))));
      if (presses.length >= st.times) this.done(meterScore(st, presses));
      else { turn.textContent = this.L('turn', { n: presses.length + 1, t: st.times }); v = 0; dir = 1; }
    }, 'primary');
    this.actions.append(press);
    this._loop((dt) => {
      if (presses.length >= st.times) return false;
      v += dir * dt * st.speed;
      if (v > 1) { v = 1; dir = -1; }
      if (v < 0) { v = 0; dir = 1; }
      fill.style.width = v * 100 + '%';
    });
  }

  // One of a few ways to do it.
  r_choice(st) {
    for (const o of st.options) {
      this.actions.append(chip(o.emoji + ' ' + this.L('i.' + o.id), () => {
        const s = choiceScore(st, o.id);
        this.done(s, s >= 85 ? 'c.best' : s >= 55 ? 'c.ok' : 'c.bad');
      }));
    }
  }

  // Tick the things you do, then done.
  r_checks(st) {
    const on = new Set();
    for (const c of st.items) {
      const b = chip(c.emoji + ' ' + this.L('i.' + c.id), () => {
        if (on.has(c.id)) on.delete(c.id); else { on.add(c.id); if (c.pts < 0) this.say('hmm'); }
        b.classList.toggle('on', on.has(c.id));
      });
      this.body.append(b);
    }
    this.actions.append(chip('✅ ' + this.L('done'), () => {
      const s = checksScore(st, [...on]);
      this.done(s, s >= 85 ? 'c.best' : s >= 55 ? 'c.ok' : 'c.bad');
    }, 'primary'));
  }

  finish() {
    const { id, steps, words, icon } = this.game;
    const score = totalScore(steps, this.scores);
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(id, medal) : 0;
    if (coins) this.wallet?.add(coins, undefined, { r: 'medal', once: 'medal:' + id + ':' + medal });
    const boxed = this.onBox?.(score, this.picks) !== false;
    this._frame();
    this.say('bye');
    const pick = steps.find((st) => st.type === 'pick');
    const res = el('div', 'grill-result');
    res.append(
      el('div', 'kimchi-bowl', icon),
      el('strong', null, (medal ? medalIcon(medal) + ' ' : '') + this.L('result') + ' · ' + (medal ? t('grill.' + medal) : this.L('tryAgain'))),
      el('p', null, t('grill.score', { n: score }) + (coins ? ' · 🪙 +' + coins : '')),
      el('p', 'fine', this.picks.map((p) => pick.items.find((f) => f.id === p).emoji + ' ' + this.L('i.' + p)).join(', ')),
    );
    const table = el('ol', 'kimchi-scores');
    for (const st of steps) {
      const v = this.scores[st.id] ?? 0;
      const li = el('li', null, this.game.stepIcon[st.id] + ' ' + this.L('s.' + st.id));
      li.append(el('b', v >= 85 ? 'good' : v >= 55 ? 'ok' : 'bad', String(v)));
      table.append(li);
    }
    const list = el('div', 'kimchi-words');
    list.append(el('strong', null, '📝 ' + this.L('words')));
    for (const w of words) {
      const row = el('div');
      row.append(el('b', null, w.ko), el('small', null, w.rom), el('span', null, this.L('w.' + w.key)));
      list.append(row);
    }
    const actions = el('div', 'order-actions');
    actions.append(chip(this.L('quit'), () => this.close()), chip(this.L('again'), () => this.begin(), 'primary'));
    this.root.append(res, el('p', 'order-hint', boxed ? this.L('gift') : this.L('bagFull')), table, list, el('p', 'kimchi-fact', '🎉 ' + this.L('share')), actions);
    this.onMedal?.(medal, coins);
  }
}
