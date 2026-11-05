// Japchae class panel at Suragan Cooking Class (rules in core/japchae-game.js,
// text in japchae-text.js). Eight steps from slicing the vegetables to the
// finished plate; each step ends with the teacher's verdict and its score,
// and the end shows a medal, the steps, the Korean words met on the way and
// a box of japchae for the bag. Styles are shared with the kimchi class.
import { t, getLanguage, localName } from '../core/i18n.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import {
  JAPCHAE_GAME, STEPS, VEG, SLICE_ZONE, sliceScore, sliceWord, MARINADE, MAX_SPOONS, beefScore,
  SPINACH_ZONE, SPINACH_MAX, spinachScore, spinachState, EGG_ZONE, eggScore, FRY_ORDER, FRY_ZONE, fryScore, fryState,
  NOODLE_ZONE, NOODLE_MAX, noodleScore, noodleState, PARTS, SAUCE, mixScore, mixNotes, plateScore, totalScore, WORDS,
} from '../core/japchae-game.js';
import { JT, JAPCHAE_LINES } from './japchae-text.js';

const STEP_ICON = { slice: '🔪', beef: '🥩', spinach: '🥬', egg: '🍳', fry: '🔥', noodles: '🍜', mix: '🥣', plate: '🍽️' };
const PART_ICON = { noodles: '🍜', spinach: '🥬', onion: '🧅', carrot: '🥕', pepper: '🫑', mushroom: '🍄', beef: '🥩' };
// The order the pan buttons are shown in (not the right order to fry them).
const FRY_SHOWN = ['carrot', 'beef', 'onion', 'mushroom', 'pepper'];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const L = (k, vars) => {
  let s = localName(JT[k], getLanguage()) ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};
const chip = (text, run, cls = 'chip') => {
  const b = el('button', cls, text);
  b.onclick = run;
  return b;
};
// A meter with a green "take it now" zone; max is the value at the right end.
function meter(zone, max = 1) {
  const m = el('div', 'kimchi-meter');
  const fill = el('i');
  const z = el('b');
  z.style.left = zone[0] / max * 100 + '%';
  z.style.width = (zone[1] - zone[0]) / max * 100 + '%';
  m.append(z, fill);
  m.set = (v) => { fill.style.width = Math.min(100, v / max * 100) + '%'; };
  return m;
}

export class JapchaeUI {
  // root: the sheet; wallet: { add(n) }; onSay(line): the teacher speaks;
  // onMedal(medal, coins); onBox(): put a box in the bag, false when full.
  constructor({ root, wallet, onSay, onMedal, onBox, onClose }) {
    Object.assign(this, { root, wallet, onSay, onMedal, onBox, onClose });
    this.medals = new Medals();
    this.raf = 0;
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
    const [ko, rom, tr] = JAPCHAE_LINES[key];
    this.onSay?.([ko, rom, localName(tr, getLanguage())]);
  }

  _frame(sub) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🍝 ' + L('title')));
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
    const best = this.medals.best(JAPCHAE_GAME);
    const steps = el('ol', 'kimchi-plan');
    for (const k of STEPS) steps.append(el('li', null, STEP_ICON[k] + ' ' + L('s.' + k)));
    const actions = el('div', 'order-actions');
    actions.append(chip(L('start'), () => this.begin(), 'primary'));
    this.root.append(
      el('p', 'fine', L('intro')),
      steps,
      el('p', 'kimchi-fact', '🏯 ' + L('fact')),
      el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')),
      actions,
    );
  }

  begin() {
    this.scores = {};
    this.i = 0;
    this.say('start');
    this.step();
  }

  step() {
    const key = STEPS[this.i];
    const head = el('div', 'kimchi-head');
    const dots = el('div', 'kimchi-dots');
    STEPS.forEach((k, j) => dots.append(el('i', j < this.i ? 'on' : j === this.i ? 'now' : null)));
    head.append(el('strong', null, L('step', { n: this.i + 1 }) + ' · ' + STEP_ICON[key] + ' ' + L('s.' + key)), dots);
    this._frame(head);
    this.root.append(el('p', 'order-hint', '👨‍🍳 ' + L('tip.' + key)));
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

  // A shelf of ingredients with − / + and a recipe card above it.
  _shelf(list, amounts, amountText) {
    const card = el('div', 'kimchi-recipe');
    card.append(el('strong', null, '📜 ' + L('card')));
    const ul = el('ul');
    for (const g of list.filter((q) => !q.decoy)) ul.append(el('li', null, `${g.emoji} ${g.ko} · ${L('g.' + g.id)} — ${amountText(g)}`));
    card.append(ul);
    const shelf = el('div', 'kimchi-shelf');
    for (const g of list) {
      amounts[g.id] = 0;
      const tile = el('div', 'kimchi-ing');
      const n = el('strong', 'n', '0');
      const set = (v) => { amounts[g.id] = v; n.textContent = v; tile.classList.toggle('in', v > 0); };
      const minus = chip('−', () => { if (amounts[g.id] > 0) set(amounts[g.id] - 1); });
      const plus = chip('+', () => {
        if (amounts[g.id] >= MAX_SPOONS) return;
        set(amounts[g.id] + 1);
        if (g.decoy && amounts[g.id] === 1) this.say('decoy');
      });
      const name = el('span', 'nm');
      name.append(el('b', null, g.emoji + ' ' + L('g.' + g.id)), el('small', null, getLanguage() === 'ko' ? g.rom : g.ko + ' · ' + g.rom));
      const ctl = el('span', 'ctl');
      ctl.append(minus, n, plus);
      tile.append(name, ctl);
      shelf.append(tile);
    }
    return [card, shelf];
  }

  // 1 · One cut per vegetable: stop the marker in the matchstick zone.
  r_slice() {
    const cuts = [];
    const list = el('div', 'kimchi-leaves');
    const bar = el('div', 'kimchi-halve japchae-slice');
    const zone = el('i', 'zone');
    zone.style.left = SLICE_ZONE[0] * 100 + '%';
    zone.style.width = (SLICE_ZONE[1] - SLICE_ZONE[0]) * 100 + '%';
    const knife = el('span', 'knife', '🔪');
    const veg = el('strong', 'japchae-veg');
    bar.append(zone, knife, el('small', 'l', L('thinEnd')), el('small', 'r', L('thickEnd')));
    this.body.append(veg, bar, list);
    let pos = 0, dir = 1;
    const showVeg = () => { const v = VEG[cuts.length]; veg.textContent = `${v.emoji} ${L('v.' + v.id)} · ${v.ko}`; };
    showVeg();
    const go = chip('🔪 ' + L('cut'), () => {
      const v = VEG[cuts.length];
      cuts.push(pos);
      const w = sliceWord(pos);
      list.append(el('div', 'kimchi-said', `${v.emoji} ${L('v.' + v.id)}: ${L('cut.' + w)}`));
      if (cuts.length === VEG.length) {
        veg.textContent = '';
        this.done(sliceScore(cuts));
      } else showVeg();
    }, 'primary');
    this.actions.append(go);
    this._loop((dt) => {
      if (cuts.length >= VEG.length) return false;
      pos += dir * dt * 0.8;
      if (pos > 1) { pos = 1; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      knife.style.left = pos * 100 + '%';
    });
  }

  // 2 · Beef marinade from the card.
  r_beef() {
    const amounts = {};
    const [card, shelf] = this._shelf(MARINADE, amounts, (g) => (g.ok[0] === 0 ? L('optional') : L(g.target === 1 ? 'spoon1' : 'spoons', { n: g.target })));
    this.body.append(el('div', 'kimchi-bowl', '🥩 소고기 채 · sogogi chae'), card, shelf);
    this.actions.append(chip('🥢 ' + L('marinate'), () => {
      const bad = MARINADE.some((g) => g.decoy && amounts[g.id]);
      this.done(beefScore(amounts), bad && 'decoy');
    }, 'primary'));
  }

  // 3 · Blanch, cool, squeeze, season.
  r_spinach() {
    const pot = el('div', 'kimchi-basin japchae-pot', '🫕');
    const clock = el('strong', 'kimchi-clock', L('secs', { s: 0 }));
    const m = meter(SPINACH_ZONE, SPINACH_MAX);
    const said = el('p', 'kimchi-said');
    this.body.append(pot, clock, m, el('small', 'kimchi-legend', '🟩 ' + L('takeOut')), said);
    const s = { secs: 0, cooled: false, squeezed: false, seasoned: false, running: false };
    const toggle = (key, b, text) => () => { s[key] = true; b().textContent = text + ' ✓'; b().disabled = true; };
    let cold, squeeze, season;
    const drop = chip('🥬 ' + L('dropIn'), () => {
      s.running = true;
      drop.remove();
      pot.textContent = '🥬';
      pot.classList.add('splash');
      this.actions.append(out);
      this._loop((dt) => {
        if (!s.running) return false;
        s.secs = Math.min(SPINACH_MAX, s.secs + dt * 10);
        clock.textContent = '⏱ ' + L('secs', { s: Math.round(s.secs) });
        m.set(s.secs);
        if (s.secs >= SPINACH_MAX) { out.click(); return false; }
      });
    }, 'primary');
    const out = chip('🙌 ' + L('takeOut'), () => {
      s.running = false;
      said.textContent = '🥬 ' + L('spinach.' + spinachState(s.secs));
      out.remove();
      cold = chip('🧊 ' + L('cold'), toggle('cooled', () => cold, '🧊 ' + L('cold')));
      squeeze = chip('✊ ' + L('squeeze'), toggle('squeezed', () => squeeze, '✊ ' + L('squeeze')));
      season = chip('🧂 ' + L('season'), toggle('seasoned', () => season, '🧂 ' + L('season')));
      const ok = chip('✅ ' + L('done'), () => {
        said.textContent = '';
        this.done(spinachScore(s), 'spinach.' + spinachState(s.secs), !s.cooled && 'spinach.noCold', !s.squeezed && 'spinach.wet');
      }, 'primary');
      this.actions.append(cold, squeeze, season, ok);
    }, 'primary');
    this.actions.append(drop);
  }

  // 4 · Two thin sheets, yolk then white: pour, flip, take out.
  r_egg() {
    const s = { separated: false, heat: null, sheets: [] };
    const pan = el('div', 'ramen-pot japchae-pan');
    const sheet = el('span', 'japchae-sheet');
    const label = el('p', null, '');
    pan.append(sheet, label);
    const m = meter(EGG_ZONE, 1.2);
    this.body.append(pan, m, el('small', 'kimchi-legend', `🟩 ${L('flip')} · ${L('takeOut')}`));
    const sep = chip('🥚 ' + L('separate'), () => { s.separated = true; sep.textContent = '🥚 ' + L('separated'); sep.disabled = true; });
    const heatRow = el('div', 'japchae-heat');
    const pick = (h) => () => {
      s.heat = h;
      low.classList.toggle('on', h === 'low'); high.classList.toggle('on', h === 'high');
      pour.disabled = false;
    };
    const low = chip('🔥 ' + L('low'), pick('low'));
    const high = chip('🔥🔥🔥 ' + L('high'), pick('high'));
    heatRow.append(low, high);
    this.body.insertBefore(heatRow, pan);
    let side = 0, v = 0, a = 0;
    const kinds = ['yolk', 'white'];
    const pour = chip('🫗 ' + L('pour') + ' · ' + L('yolk'), () => {
      const kind = kinds[s.sheets.length];
      low.disabled = high.disabled = sep.disabled = true;
      pour.remove();
      side = 0; v = 0;
      label.textContent = L(kind);
      sheet.className = 'japchae-sheet ' + (s.separated ? kind : 'mixed');
      this.actions.append(flip);
      flip.disabled = false;
      this._loop((dt) => {
        v += dt * (s.heat === 'high' ? 0.5 : 0.28);
        m.set(v);
        sheet.style.filter = `brightness(${1 - Math.max(0, v - 0.8) * 0.8})`;
        if (v >= 1.2) { const second = side === 1; flip.click(); if (second) return false; }
      });
    }, 'primary');
    pour.disabled = true;
    const flip = chip('🔄 ' + L('flip'), () => {
      if (side === 0) {
        a = v; side = 1; v = 0;
        flip.textContent = '🙌 ' + L('takeOut');
        sheet.classList.add('flipped');
        return;
      }
      s.sheets.push({ a, b: v });
      cancelAnimationFrame(this.raf);
      flip.remove();
      flip.textContent = '🔄 ' + L('flip');
      sheet.classList.remove('flipped');
      if (s.sheets.length < 2) {
        pour.textContent = '🫗 ' + L('pour') + ' · ' + L('white');
        this.actions.append(pour);
      } else {
        this.done(eggScore(s), s.heat === 'high' ? 'egg.high' : null, !s.separated ? 'egg.mixed' : null, s.heat === 'low' && s.separated ? 'egg.good' : null);
      }
    }, 'primary');
    this.actions.append(sep, pour);
  }

  // 5 · Pick what goes in the pan next, take it out when tender-crisp.
  r_fry() {
    const times = {}, order = [];
    const pan = el('div', 'ramen-pot japchae-pan');
    const what = el('span', 'ramen-bowl', '🍳');
    const state = el('p', null, L('fry.pick'));
    pan.append(what, state);
    const m = meter(FRY_ZONE, 1.2);
    const rack = el('div', 'kimchi-shelf japchae-rack');
    const log = el('div', 'kimchi-leaves');
    this.body.append(pan, m, el('small', 'kimchi-legend', '🟩 ' + L('takeOut')), rack, log);
    let cur = null, v = 0;
    const btns = {};
    const out = chip('🙌 ' + L('takeOut'), () => {
      if (!cur) return;
      cancelAnimationFrame(this.raf);
      times[cur] = v;
      log.append(el('div', 'kimchi-said', `${PART_ICON[cur]} ${L('v.' + cur)}: ${L('fry.' + fryState(v))}`));
      cur = null;
      out.disabled = true;
      what.textContent = '🍳';
      state.textContent = L('fry.pick');
      if (order.length === FRY_ORDER.length) {
        const s = fryScore({ times, order });
        const inOrder = order.every((id, i) => id === FRY_ORDER[i]);
        this.done(s, inOrder ? 'fry.order' : 'fry.wrong');
      } else for (const id of FRY_SHOWN) if (!order.includes(id)) btns[id].disabled = false;
    }, 'primary');
    out.disabled = true;
    for (const id of FRY_SHOWN) {
      const b = chip(`${PART_ICON[id]} ${L('v.' + id)}`, () => {
        if (cur) return;
        cur = id; v = 0;
        m.set(0);
        order.push(id);
        for (const k of FRY_SHOWN) btns[k].disabled = true;
        b.classList.add('used');
        out.disabled = false;
        what.textContent = PART_ICON[id];
        if (order.length === 1) this.say('sizzle');
        this._loop((dt) => {
          v += dt * 0.32;
          m.set(v);
          state.textContent = L('v.' + id) + ' · ' + L('fry.' + fryState(v));
          if (v >= 1.2) { out.click(); return false; }
        });
      });
      btns[id] = b;
      rack.append(b);
    }
    this.actions.append(out);
  }

  // 6 · Boil the noodles, drain, snip.
  r_noodles() {
    const pot = el('div', 'kimchi-basin japchae-pot', '🫕');
    const clock = el('strong', 'kimchi-clock', L('mins', { m: 0 }));
    const m = meter(NOODLE_ZONE, NOODLE_MAX);
    const said = el('p', 'kimchi-said');
    this.body.append(pot, clock, m, el('small', 'kimchi-legend', '🟩 ' + L('drain')), said);
    const s = { mins: 0, snips: 0, running: false };
    const snipCount = el('strong', 'kimchi-clock');
    const drop = chip('🍜 ' + L('dropIn'), () => {
      s.running = true;
      drop.remove();
      pot.textContent = '🍜';
      this.actions.append(drain);
      this._loop((dt) => {
        if (!s.running) return false;
        s.mins = Math.min(NOODLE_MAX, s.mins + dt);
        clock.textContent = '⏱ ' + L('mins', { m: s.mins.toFixed(1) });
        m.set(s.mins);
        if (s.mins >= NOODLE_MAX) { drain.click(); return false; }
      });
    }, 'primary');
    const drain = chip('🫗 ' + L('drain'), () => {
      s.running = false;
      drain.remove();
      said.textContent = '🍜 ' + L('noodles.' + noodleState(s.mins));
      snipCount.textContent = L('snips', { n: 0 });
      this.body.insertBefore(snipCount, said.nextSibling);
      const snip = chip(L('snip'), () => { s.snips++; snipCount.textContent = L('snips', { n: s.snips }); });
      const ok = chip('✅ ' + L('done'), () => {
        said.textContent = '';
        this.done(noodleScore(s), 'noodles.' + noodleState(s.mins), s.snips < 2 ? 'noodles.long' : s.snips > 3 ? 'noodles.short' : null);
      }, 'primary');
      this.actions.append(snip, ok);
    }, 'primary');
    this.actions.append(drop);
  }

  // 7 · Everything in the bowl, the seasoning, mix by hand.
  r_mix() {
    const added = [], amounts = {};
    const bowl = el('div', 'kimchi-bowl japchae-bowl', '🥣');
    const parts = el('div', 'kimchi-shelf japchae-rack');
    for (const p of PARTS) {
      const b = chip(`${PART_ICON[p]} ${L('v.' + p)}`, () => { added.push(p); b.disabled = true; bowl.textContent = '🥣 ' + added.map((q) => PART_ICON[q]).join(''); });
      parts.append(b);
    }
    const [card, shelf] = this._shelf(SAUCE, amounts, (g) => (g.ok[0] !== g.ok[1] ? L('range12') : L(g.target === 1 ? 'spoon1' : 'spoons', { n: g.target })));
    const mixCount = el('strong', 'kimchi-clock', L('mixes', { n: 0 }));
    this.body.append(el('p', 'fine', L('mix.add')), parts, bowl, card, shelf, mixCount);
    let mixes = 0;
    const mix = chip('🙌 ' + L('mixIt'), () => {
      mixes++;
      mixCount.textContent = L('mixes', { n: mixes });
      bowl.classList.remove('splash'); void bowl.offsetWidth; bowl.classList.add('splash');
    });
    const taste = chip('😋 ' + L('taste'), () => this.done(mixScore({ added, amounts, mixes }), ...mixNotes({ amounts, mixes }).map((k) => 'mix.' + k)), 'primary');
    this.actions.append(mix, taste);
  }

  // 8 · Mound, egg strips, sesame seeds.
  r_plate() {
    const s = { mound: false, yolk: false, white: false, seeds: false };
    const plate = el('div', 'japchae-plate');
    const food = el('div', 'food');
    const top = el('div', 'top');
    plate.append(food, top);
    this.body.append(plate);
    const paint = () => {
      food.hidden = !s.mound;
      top.replaceChildren();
      for (const k of ['yolk', 'white']) if (s[k]) for (let n = 0; n < 4; n++) top.append(el('i', k));
      top.classList.toggle('seeds', s.seeds);
    };
    paint();
    const step = (key, text) => {
      const b = chip(text, () => { s[key] = true; b.disabled = true; paint(); });
      return b;
    };
    const mound = step('mound', '🍝 ' + L('mound'));
    const yolk = step('yolk', '🟨 ' + L('yolkTop'));
    const white = step('white', '⬜ ' + L('whiteTop'));
    const seeds = step('seeds', '✨ ' + L('seeds'));
    const serve = chip('🍽️ ' + L('serve'), () => {
      const sc = plateScore(s);
      this.done(sc, sc === 100 ? 'plate.good' : null);
    }, 'primary');
    this.actions.append(mound, yolk, white, seeds, serve);
  }

  finish() {
    const score = totalScore(this.scores);
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(JAPCHAE_GAME, medal) : 0;
    if (coins) this.wallet?.add(coins);
    const boxed = this.onBox?.(score) !== false;
    this._frame();
    this.say('bye');
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', medal ? medalIcon(medal) : '🍝'),
      el('strong', null, L('result') + ' · ' + (medal ? t('grill.' + medal) : L('tryAgain'))),
      el('p', null, t('grill.score', { n: score }) + (coins ? ' · 🪙 +' + coins : '')),
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
    this.root.append(res, el('p', 'order-hint', boxed ? L('gift') : L('bagFull')), table, words, el('p', 'kimchi-fact', '🎉 ' + L('share')), actions);
    this.onMedal?.(medal, coins);
  }
}
