// Kimjang class panel at Sonmat Kimchi School (rules in core/kimchi-game.js,
// text in kimchi-text.js). Ten steps from picking the cabbage to letting the
// jar ripen; each step ends with the teacher's feedback and its score, and
// the end shows a medal, the steps, the Korean words met on the way and a
// jar of kimchi for the bag. Medals as at the grill; each new tier pays once.
import { t, getLanguage, localName } from '../core/i18n.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import {
  KIMCHI_GAME, STEPS, TRAITS, makeCabbages, pickScore, SLIT_ZONE, halveScore, halveResult,
  LEAVES, MAX_PINCH, saltScore, saltVerdict, SOAK_ZONE, SOAK_MAX, soakScore, bendTest, TURN_ZONE,
  rinseScore, rinseVerdict, PASTE_RATE, PASTE_ZONE, PASTE_BURN, LUMP_EVERY, MAX_LUMPS, pasteScore, pasteState,
  INGREDIENTS, MAX_SCOOPS, seasonScore, tasteNotes, stuffScore, BUBBLES, packScore, RIPEN, ripenScore, totalScore, WORDS,
} from '../core/kimchi-game.js';
import { KT, KIMCHI_LINES } from './kimchi-text.js';

const STEP_ICON = { pick: '🥬', halve: '🔪', salt: '🧂', soak: '⏳', rinse: '💧', paste: '🥣', season: '🌶️', stuff: '🖐️', pack: '🏺', ripen: '❄️' };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const L = (k, vars) => {
  let s = localName(KT[k], getLanguage()) ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};
const chip = (text, run, cls = 'chip') => {
  const b = el('button', cls, text);
  b.onclick = run;
  return b;
};

export class KimchiUI {
  // root: the sheet; wallet: { add(n) }; onSay(line): the teacher speaks;
  // onMedal(medal, coins); onJar(): put a jar in the bag, returns false when full.
  constructor({ root, wallet, onSay, onMedal, onJar, onClose }) {
    Object.assign(this, { root, wallet, onSay, onMedal, onJar, onClose });
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
    const [ko, rom, tr] = KIMCHI_LINES[key];
    this.onSay?.([ko, rom, localName(tr, getLanguage())]);
  }

  _frame(sub) {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🥬 ' + L('title')));
    if (sub) this.root.append(sub);
  }

  // A loop on requestAnimationFrame: fn(dt) returns false to stop.
  _loop(fn) {
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
    const best = this.medals.best(KIMCHI_GAME);
    const steps = el('ol', 'kimchi-plan');
    for (const k of STEPS) steps.append(el('li', null, STEP_ICON[k] + ' ' + L('s.' + k)));
    const actions = el('div', 'order-actions');
    actions.append(chip(L('start'), () => this.begin(), 'primary'));
    this.root.append(
      el('p', 'fine', L('intro')),
      steps,
      el('p', 'kimchi-fact', '🏛️ ' + L('fact')),
      el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')),
      actions,
    );
  }

  begin() {
    this.scores = {};
    this.notes = {};
    this.i = 0;
    this.say('start');
    this.step();
  }

  // The current step: a header (step n/10 + dots), the teacher's tip, then
  // the step's own controls from the renderer.
  step() {
    const key = STEPS[this.i];
    const head = el('div', 'kimchi-head');
    const dots = el('div', 'kimchi-dots');
    STEPS.forEach((k, j) => dots.append(el('i', j < this.i ? 'on' : j === this.i ? 'now' : null)));
    head.append(el('strong', null, L('step', { n: this.i + 1 }) + ' · ' + STEP_ICON[key] + ' ' + L('s.' + key)), dots);
    this._frame(head);
    this.root.append(el('p', 'order-hint', '👵 ' + L('tip.' + key)));
    this.body = el('div', 'kimchi-body');
    this.actions = el('div', 'order-actions');
    this.root.append(this.body, this.actions);
    this['r_' + key]();
  }

  // End a step: show the teacher's verdict and the score, and the Next button.
  done(score, ...noteKeys) {
    const key = STEPS[this.i];
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.scores[key] = score;
    this.notes[key] = noteKeys.filter(Boolean);
    this.body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const box = el('div', 'kimchi-verdict ' + (score >= 85 ? 'good' : score >= 55 ? 'ok' : 'bad'));
    box.append(el('strong', null, (score >= 85 ? '⭐ ' : score >= 55 ? '👍 ' : '💦 ') + t('grill.score', { n: score })));
    for (const k of this.notes[key]) box.append(el('span', null, L(k)));
    this.body.append(box);
    this.say(score >= 85 ? 'great' : score >= 55 ? 'ok' : 'oops');
    const last = this.i === STEPS.length - 1;
    this.actions.replaceChildren(chip(last ? L('finish') : L('next') + ' →', () => {
      if (last) this.finish();
      else { this.i++; this.step(); }
    }, 'primary'));
    this.root.scrollTop = this.root.scrollHeight; // the verdict sits just above the button
  }

  // 1 · Pick one of three cabbages.
  r_pick() {
    const list = makeCabbages();
    const row = el('div', 'kimchi-cabbages');
    for (const c of list) {
      const b = el('button', 'kimchi-cabbage');
      const icon = el('span', 'kimchi-cab-icon', '🥬');
      icon.style.fontSize = Math.round(30 + c.kg * 7) + 'px';
      if (!c.traits.green) icon.style.filter = 'sepia(0.7) saturate(0.8)';
      b.append(icon, el('strong', null, L('kg', { kg: c.kg })));
      for (const k of TRAITS) b.append(el('small', c.traits[k] ? 'yes' : 'no', L('pick.' + k + (c.traits[k] ? 1 : 0))));
      b.onclick = () => {
        b.classList.add('picked');
        const s = pickScore(c);
        this.done(s, s === 100 ? 'pick.r4' : 'pick.r');
      };
      row.append(b);
    }
    this.body.append(el('p', 'fine', L('pick.choose')), row);
  }

  // 2 · A knife slides along the cabbage; stop it at the root end.
  r_halve() {
    const bar = el('div', 'kimchi-halve');
    const zone = el('i', 'zone');
    zone.style.left = SLIT_ZONE[0] * 100 + '%';
    zone.style.width = (SLIT_ZONE[1] - SLIT_ZONE[0]) * 100 + '%';
    const knife = el('span', 'knife', '🔪');
    const cut = el('i', 'cut');
    bar.append(zone, cut, knife, el('small', 'l', L('halve.root')), el('small', 'r', L('halve.tips')));
    this.body.append(bar);
    let pos = 0, dir = 1, stopped = false;
    const go = chip('🔪 ' + L('halve.cut'), () => {
      if (stopped) return;
      stopped = true;
      cut.style.width = pos * 100 + '%';
      bar.classList.add('split');
      this.done(halveScore(pos), 'halve.' + halveResult(pos));
    }, 'primary');
    this.actions.append(go);
    this._loop((dt) => {
      if (stopped) return false;
      pos += dir * dt * 0.75;
      if (pos > 1) { pos = 1; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      knife.style.left = pos * 100 + '%';
    });
  }

  // 3 / 8 · Six leaf rows, each with a stem and a leaf button. mode 'salt'
  // adds pinches of salt; 'stuff' spreads red filling.
  _leafRows(mode, onChange) {
    const rows = [];
    const wrap = el('div', 'kimchi-leaves ' + mode);
    for (let i = 0; i < LEAVES; i++) {
      const s = { stem: 0, leaf: 0, stemFirst: false };
      const row = el('div', 'kimchi-leaf');
      const label = el('small', null, L('leafN', { n: i + 1 }) + (i === 0 ? ' · ' + L('outer') : i === LEAVES - 1 ? ' · ' + L('inner') : ''));
      const stem = el('button', 'part stem');
      const leaf = el('button', 'part leaf');
      const paint = () => {
        const mark = mode === 'salt' ? '•' : '';
        stem.textContent = L('stem') + ' ' + mark.repeat(s.stem);
        leaf.textContent = L('leaf') + ' ' + mark.repeat(s.leaf);
        if (mode === 'stuff') {
          stem.style.setProperty('--red', Math.min(1, s.stem / 2));
          leaf.style.setProperty('--red', Math.min(1, s.leaf));
        }
      };
      stem.onclick = () => { if (s.stem < MAX_PINCH) { if (!s.stem && !s.leaf) s.stemFirst = true; s.stem++; paint(); onChange(); } };
      leaf.onclick = () => { if (s.leaf < MAX_PINCH) { s.leaf++; paint(); onChange(); } };
      paint();
      row.append(label, stem, leaf);
      wrap.append(row);
      rows.push({ s, paint });
    }
    const reset = () => { for (const r of rows) { r.s.stem = r.s.leaf = 0; r.s.stemFirst = false; r.paint(); } onChange(); };
    return { wrap, rows, reset };
  }

  r_salt() {
    let ok;
    const leaves = this._leafRows('salt', () => { ok.disabled = !leaves.rows.some((r) => r.s.stem || r.s.leaf); });
    this.body.append(el('div', 'kimchi-bowl', '🧂 천일염 · cheonillyeom'), leaves.wrap);
    ok = chip('✅ ' + L('done'), () => {
      const layers = leaves.rows.map((r) => r.s);
      this.done(saltScore(layers), 'salt.' + saltVerdict(layers));
    }, 'primary');
    ok.disabled = true;
    this.actions.append(chip(L('reset'), () => leaves.reset()), ok);
  }

  // 4 · The tub clock runs; turn once, bend-test, take it out.
  r_soak() {
    const tub = el('div', 'kimchi-tub');
    const cab = el('span', 'kimchi-tub-cab', '🥬');
    const clock = el('strong', 'kimchi-clock', L('hours', { h: 0 }));
    const meter = el('div', 'kimchi-meter');
    const fill = el('i');
    const zone = el('b');
    zone.style.left = SOAK_ZONE[0] / SOAK_MAX * 100 + '%';
    zone.style.width = (SOAK_ZONE[1] - SOAK_ZONE[0]) / SOAK_MAX * 100 + '%';
    const turnMark = el('b', 'turn');
    turnMark.style.left = TURN_ZONE[0] / SOAK_MAX * 100 + '%';
    turnMark.style.width = (TURN_ZONE[1] - TURN_ZONE[0]) / SOAK_MAX * 100 + '%';
    meter.append(turnMark, zone, fill);
    const said = el('p', 'kimchi-said');
    tub.append(cab, clock);
    this.body.append(tub, meter, el('small', 'kimchi-legend', `🟦 ${L('soak.turn')} · 🟩 ${L('soak.out')}`), said);
    const s = { hours: 0, turnedAt: null, running: false };
    const finish = (extra) => {
      s.running = false;
      said.textContent = '';
      const notes = [];
      const b = bendTest(s.hours);
      notes.push('soak.' + b);
      if (s.turnedAt == null) notes.push('soak.noTurn');
      if (extra) notes.push(extra);
      this.done(soakScore(s), ...notes);
    };
    const begin = chip('🛁 ' + L('soak.begin'), () => {
      s.running = true;
      begin.remove();
      this.actions.append(turn, bend, out);
      this._loop((dt) => {
        if (!s.running) return false;
        s.hours = Math.min(SOAK_MAX, s.hours + dt);
        clock.textContent = '⏱ ' + L('hours', { h: s.hours.toFixed(1) });
        fill.style.width = s.hours / SOAK_MAX * 100 + '%';
        cab.style.transform = `scaleY(${1 - Math.min(0.25, s.hours / 40)})`;
        if (s.hours >= SOAK_MAX) { finish('soak.long'); return false; }
      });
    }, 'primary');
    const turn = chip('🔄 ' + L('soak.turn'), () => {
      if (s.turnedAt != null) return;
      s.turnedAt = s.hours;
      turn.textContent = L('soak.turned');
      turn.disabled = true;
      cab.classList.add('flip');
    });
    const bend = chip('🤏 ' + L('soak.bend'), () => { said.textContent = '🥬 ' + L('soak.' + bendTest(s.hours)); });
    const out = chip('🙌 ' + L('soak.out'), () => finish(), 'primary');
    this.actions.append(begin);
  }

  // 5 · Rinse n times, then pick how to drain.
  r_rinse() {
    let n = 0;
    const basin = el('div', 'kimchi-basin', '🥬');
    const count = el('strong', 'kimchi-clock', L('rinse.n', { n: 0 }));
    this.body.append(basin, count);
    const rinse = chip('💧 ' + L('rinse.do'), () => {
      n++;
      count.textContent = L('rinse.n', { n });
      basin.classList.remove('splash'); void basin.offsetWidth; basin.classList.add('splash');
      down.disabled = up.disabled = false;
    });
    const drain = (cutDown) => {
      rinse.disabled = down.disabled = up.disabled = true;
      this.done(rinseScore({ rinses: n, cutDown }), 'rinse.' + rinseVerdict(n), !cutDown && 'rinse.upBad');
    };
    const down = chip('⬇️ ' + L('rinse.down'), () => drain(true));
    const up = chip('⬆️ ' + L('rinse.up'), () => drain(false));
    down.disabled = up.disabled = true;
    this.actions.append(rinse, down, up);
  }

  // 6 · Heat the pot, keep stirring, take it off when it's ready.
  r_paste() {
    const pot = el('div', 'ramen-pot kimchi-pot');
    const bowl = el('span', 'ramen-bowl', '🍲');
    const state = el('p', null, L('paste.watery'));
    const lumps = el('small', null, L('paste.lumps', { n: 0 }));
    pot.append(bowl, state, lumps);
    const meter = el('div', 'kimchi-meter');
    const fill = el('i');
    const zone = el('b');
    zone.style.left = PASTE_ZONE[0] / 1.3 * 100 + '%';
    zone.style.width = (PASTE_ZONE[1] - PASTE_ZONE[0]) / 1.3 * 100 + '%';
    meter.append(zone, fill);
    this.body.append(pot, meter, el('small', 'kimchi-legend', '🟩 ' + L('paste.off')));
    const s = { thick: 0, lumps: 0, since: 0, on: false };
    const end = () => {
      s.on = false;
      this.done(pasteScore(s), 'paste.' + pasteState(s.thick), s.lumps ? 'paste.lumps' : null);
      // The lump note needs its number.
      const spans = this.body.querySelectorAll('.kimchi-verdict span');
      if (s.lumps && spans.length) spans[spans.length - 1].textContent = L('paste.lumps', { n: s.lumps });
    };
    const heat = chip('🔥 ' + L('paste.heat'), () => {
      s.on = true;
      heat.remove();
      this.actions.append(stir, off);
      pot.classList.add('boiling');
      this._loop((dt) => {
        if (!s.on) return false;
        s.thick += dt * PASTE_RATE;
        s.since += dt;
        if (s.since >= LUMP_EVERY && s.lumps < MAX_LUMPS) { s.lumps++; s.since = 0; }
        fill.style.width = Math.min(100, s.thick / 1.3 * 100) + '%';
        state.textContent = L('paste.' + pasteState(s.thick));
        lumps.textContent = L('paste.lumps', { n: s.lumps }) + ' ' + '⚪'.repeat(s.lumps);
        bowl.textContent = s.thick >= PASTE_BURN ? '♨️' : '🍲';
        if (s.thick >= PASTE_BURN + 0.1) { end(); return false; }
      });
    }, 'primary');
    const stir = chip('🥄 ' + L('paste.stir'), () => {
      s.since = 0;
      bowl.classList.remove('stir'); void bowl.offsetWidth; bowl.classList.add('stir');
    });
    const off = chip('🧯 ' + L('paste.off'), () => end(), 'primary');
    this.actions.append(heat);
  }

  // 7 · Scoop ingredients into the bowl from the shelf; gloves; mix.
  r_season() {
    const amounts = {};
    const card = el('div', 'kimchi-recipe');
    card.append(el('strong', null, '📜 ' + L('recipe')));
    const list = el('ul');
    for (const g of INGREDIENTS.filter((q) => !q.decoy)) {
      const amt = g.id === 'gochugaru' ? L('toTaste') : g.id === 'pear' ? L('optional') : L('scoops', { n: g.target });
      list.append(el('li', null, `${g.emoji} ${g.ko} · ${L('g.' + g.id)} — ${amt}`));
    }
    card.append(list);
    const shelf = el('div', 'kimchi-shelf');
    for (const g of INGREDIENTS) {
      amounts[g.id] = 0;
      const tile = el('div', 'kimchi-ing');
      const n = el('strong', 'n', '0');
      const minus = chip('−', () => { if (amounts[g.id] > 0) { amounts[g.id]--; n.textContent = amounts[g.id]; tile.classList.toggle('in', amounts[g.id] > 0); } });
      const plus = chip('+', () => {
        if (amounts[g.id] >= MAX_SCOOPS) return;
        amounts[g.id]++;
        n.textContent = amounts[g.id];
        tile.classList.add('in');
        if (g.decoy && amounts[g.id] === 1) {
          this.say('decoy');
          if (g.id === 'vinegar') said.textContent = '👵 ' + L('decoy.vinegar');
        }
      });
      const name = el('span', 'nm');
      name.append(el('b', null, g.emoji + ' ' + L('g.' + g.id)), el('small', null, getLanguage() === 'ko' ? g.rom : g.ko + ' · ' + g.rom));
      const ctl = el('span', 'ctl');
      ctl.append(minus, n, plus);
      tile.append(name, ctl);
      shelf.append(tile);
    }
    const said = el('p', 'kimchi-said');
    this.body.append(card, shelf, said);
    let gloves = false;
    const glove = chip('🧤 ' + L('gloves'), () => { gloves = true; glove.textContent = L('glovesOn'); glove.disabled = true; });
    const mix = chip('🥣 ' + L('mix'), () => {
      if (!gloves) this.say('gloves');
      const notes = tasteNotes(amounts).map((k) => 'taste.' + k);
      if (!gloves) notes.unshift('noGloves');
      this.done(seasonScore(amounts, { gloves }), ...notes);
      setTimeout(() => this.open && this.say('taste'), 1600);
    }, 'primary');
    this.actions.append(glove, mix);
  }

  r_stuff() {
    let ok;
    const leaves = this._leafRows('stuff', () => { ok.disabled = !leaves.rows.some((r) => r.s.stem || r.s.leaf); });
    this.body.append(el('div', 'kimchi-bowl red', '🌶️ 양념 속 · yangnyeom sok'), leaves.wrap);
    ok = chip('✅ ' + L('done'), () => this.done(stuffScore(leaves.rows.map((r) => r.s))), 'primary');
    ok.disabled = true;
    this.actions.append(chip(L('reset'), () => leaves.reset()), ok);
  }

  // 9 · Wrap both halves into the jar, press the bubbles out, cover, lid.
  r_pack() {
    const s = { wrapped: 0, bubblesLeft: BUBBLES, covered: false };
    const jar = el('div', 'kimchi-jar');
    const fillLine = el('i', 'line');
    fillLine.title = L('pack.line');
    const content = el('div', 'content');
    const bubbles = el('div', 'bubbles');
    jar.append(content, bubbles, fillLine, el('small', 'line-label', L('pack.line')));
    const count = el('strong', 'kimchi-clock', L('pack.wrapped', { n: 0 }));
    const hint = el('p', 'fine', '');
    this.body.append(jar, count, hint);
    const paintJar = () => { content.style.height = s.wrapped * 38 + (s.covered ? 6 : 0) + '%'; content.classList.toggle('covered', s.covered); };
    const wrap = chip('🌯 ' + L('pack.wrap'), () => {
      if (s.wrapped >= 2) return;
      s.wrapped++;
      count.textContent = L('pack.wrapped', { n: s.wrapped });
      paintJar();
      if (s.wrapped === 2) {
        wrap.disabled = true;
        hint.textContent = '👇 ' + L('pack.press');
        for (let i = 0; i < BUBBLES; i++) {
          const b = el('button', 'bubble', '');
          b.style.left = 12 + ((i * 41) % 70) + '%';
          b.style.top = 34 + ((i * 23) % 50) + '%';
          b.setAttribute('aria-label', L('pack.press'));
          b.onclick = () => { b.remove(); s.bubblesLeft--; };
          bubbles.append(b);
        }
        cover.disabled = false;
      }
    }, 'primary');
    const cover = chip('🥬 ' + L('pack.cover'), () => { s.covered = true; cover.textContent = L('pack.covered'); cover.disabled = true; paintJar(); });
    cover.disabled = true;
    const lid = chip('🏺 ' + L('pack.lid'), () => { jar.classList.add('lid'); bubbles.replaceChildren(); this.done(packScore(s)); }, 'primary');
    this.actions.append(wrap, cover, lid);
  }

  // 10 · Choose how it ripens.
  r_ripen() {
    const icons = { room: '🏠➡️❄️', fridge: '❄️', sun: '☀️🔥' };
    const opts = el('div', 'kimchi-ripen');
    for (const r of RIPEN) {
      opts.append(chip(icons[r.id] + ' ' + L('ripen.' + r.id), () => this.done(ripenScore(r.id), 'ripen.r.' + r.id), 'chip kimchi-opt'));
    }
    this.body.append(opts);
  }

  finish() {
    const score = totalScore(this.scores);
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(KIMCHI_GAME, medal) : 0;
    if (coins) this.wallet?.add(coins);
    const jar = this.onJar?.(score) !== false;
    this._frame();
    this.say('bye');
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', medal ? medalIcon(medal) : '🫙'),
      el('strong', null, L('result') + ' · ' + (medal ? t('grill.' + medal) : L('tryAgain'))),
      el('p', null, t('grill.score', { n: score }) + (coins ? ' · 🪙 +' + coins : '')),
    );
    const table = el('ol', 'kimchi-scores');
    for (const k of STEPS) {
      const li = el('li', null, STEP_ICON[k] + ' ' + L('s.' + k));
      li.append(el('b', (this.scores[k] ?? 0) >= 85 ? 'good' : (this.scores[k] ?? 0) >= 55 ? 'ok' : 'bad', String(this.scores[k] ?? 0)));
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
    this.root.append(res, el('p', 'order-hint', jar ? L('gift') : L('bagFull')), table, words, el('p', 'kimchi-fact', '🧡 ' + L('share')), actions);
    this.onMedal?.(medal, coins);
  }
}
