// Part-time job panel (rules in core/jobs.js): the convenience store counter
// and the restaurant hall. Shifts have no daily limit; the server times each
// one and pays by the time and how many answers were right, more when it is
// your job (game/career.js, core/career.js).
import {
  JOB_TEXT, won,
  MART_CUSTOMERS, MART_PATIENCE, MART_ASKS, MART_LINES, makeMartCustomer,
  SERVE_TURNS, SERVE_PATIENCE, TABLES, SERVE_DISHES, SERVE_ASKS, makeServeTurn, serveRight,
} from '../core/jobs.js';
import { L, fmt } from './pocha-ui.js';
import { t } from '../core/i18n.js';
import { bonusPct } from '../core/career.js';

const tt = (k, v) => fmt(L(JOB_TEXT[k]), v);
// A Korean answer button with a short meaning under it.
const answerBtn = (x) => {
  const b = el('button', 'chip job-answer', `${x.emoji} ${x.btn}`);
  b.append(el('small', null, L(x.short)));
  return b;
};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const FACES = ['🧑', '👩', '👨‍🦱', '👧', '🧓', '👩‍🦰', '🧔', '👱'];

export class JobUI {
  // career: game/career.js (begin/end a shift, my job and skill); onSay(line);
  // onPaid(coins, result).
  constructor({ root, career, onSay, onPaid, rand = Math.random }) {
    Object.assign(this, { root, career, onSay, onPaid, rand });
    this.timer = 0;
  }

  get open() { return !this.root.hidden; }
  // kind: 'mart' | 'serving'; store: the stores.json entry.
  show(kind, store) { this.kind = kind; this.store = store; this.root.hidden = false; this.renderStart(); }
  close() { clearInterval(this.timer); this.round = null; this.root.hidden = true; }

  _title() { return this.kind === 'mart' ? '🏪 ' + tt('martTitle') : '🍽️ ' + tt('serveTitle'); }
  _frame() {
    clearInterval(this.timer);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, this._title()));
  }

  // My job and skill for this kind of shift, or the base pay.
  _status() {
    const c = this.career;
    if (!c?.mine(this.kind)) return t('career.base');
    const sk = c.skill(this.kind);
    return t('career.status', { lv: sk.lv, p: bonusPct(sk.mult) });
  }

  renderStart(msg) {
    this._frame();
    const go = el('button', 'primary', '💼 ' + tt('start'));
    go.onclick = () => this.start();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(
      el('p', 'order-hint', tt(this.kind === 'mart' ? 'martHow' : 'serveHow')),
      el('p', 'grill-best', msg || this._status()),
      actions,
    );
  }

  async start() {
    if (this._starting) return;
    this._starting = true;
    const r = await this.career.begin(this.kind, this.store?.name?.en || this.store?.id);
    this._starting = false;
    if (this.root.hidden) return;
    if (r.error) { this.renderStart(t(r.error === 'busy' ? 'career.busy' : 'career.offline')); return; }
    this.run = r.run;
    this.round = { i: 0, ok: 0, all: this.kind === 'mart' ? MART_CUSTOMERS * 2 : SERVE_TURNS };
    if (this.kind === 'mart') this.onSay?.([MART_LINES.hello[0], MART_LINES.hello[1], L(MART_LINES.hello[2])]);
    this.next();
  }

  next() {
    const r = this.round;
    if (!r) return;
    if (this.kind === 'mart' ? r.i >= MART_CUSTOMERS : r.i >= SERVE_TURNS) { this.finish(); return; }
    if (this.kind === 'mart') this.martCustomer(); else this.serveTurn();
  }

  // A line said in Korean, with romanization and a meaning on request.
  _say(ko, rom, mean, aloud = true) {
    const say = el('div', 'pocha-say');
    const m = el('small', 'pocha-mean', '');
    const b = el('button', 'chip pocha-mean-btn', '❓ ' + tt('meaning'));
    b.onclick = () => { m.textContent = mean; b.hidden = true; };
    say.append(el('strong', null, '“' + ko + '”'), el('small', 'order-rom', rom), m, b);
    if (aloud) this.onSay?.([ko, rom, mean]);
    return say;
  }

  _patience(seconds, onOut) {
    const bar = el('div', 'fish-meter');
    const fill = el('i');
    bar.append(fill);
    let left = seconds;
    fill.style.width = '100%';
    this.timer = setInterval(() => {
      left -= 0.1;
      fill.style.width = Math.max(0, (left / seconds) * 100) + '%';
      if (left <= 0) { clearInterval(this.timer); onOut(); }
    }, 100);
    return bar;
  }

  _after(text, ok) {
    const r = this.round;
    this.root.append(el('p', 'order-hint pocha-result ' + (ok ? 'ok' : 'bad'), text));
    for (const b of this.root.querySelectorAll('.job-step button')) b.disabled = true;
    setTimeout(() => { if (this.open && this.round === r) { r.i++; this.next(); } }, 1300);
  }

  martCustomer() {
    this._frame();
    const r = this.round;
    const c = makeMartCustomer(this.rand);
    const who = el('div', 'pocha-customer');
    who.append(el('span', 'pocha-face', FACES[Math.floor(this.rand() * FACES.length)]), el('small', null, tt('customer', { n: r.i + 1, all: MART_CUSTOMERS })));
    const step = el('div', 'job-step');
    const timeOut = () => this._after(tt('timeUp'), false);
    const bar = this._patience(MART_PATIENCE, timeOut);
    this.root.append(who, bar, step);

    // 1. Scan every item.
    const scanned = new Set();
    const totalEl = el('p', 'pocha-bowl', `${tt('total')}: ${won(0)}`);
    const items = el('div', 'pocha-row');
    for (const it of c.items) {
      const b = el('button', 'chip', `${it.emoji} ${it.ko} · ${won(it.price)}`);
      b.title = L(it.name);
      b.onclick = () => {
        if (scanned.has(it.id)) return;
        scanned.add(it.id);
        b.setAttribute('aria-pressed', 'true');
        b.textContent = '✅ ' + b.textContent;
        totalEl.textContent = `${tt('total')}: ${won(c.items.filter((x) => scanned.has(x.id)).reduce((s, x) => s + x.price, 0))}`;
        if (scanned.size === c.items.length) ask();
      };
      items.append(b);
    }
    step.append(el('strong', 'pocha-label', '📟 ' + tt('scan')), items, totalEl);

    // 2. The customer's request.
    const ask = () => {
      const a = MART_ASKS.find((x) => x.id === c.ask);
      const row = el('div', 'pocha-row');
      for (const x of MART_ASKS) {
        const b = answerBtn(x);
        b.onclick = () => {
          const ok = x.id === c.ask;
          if (ok) r.ok++;
          for (const q of row.querySelectorAll('button')) q.disabled = true;
          b.setAttribute('aria-pressed', 'true');
          row.after(el('p', 'order-hint pocha-result ' + (ok ? 'ok' : 'bad'), ok ? tt('right') : tt('wrongWas', { a: `${a.emoji} ${a.btn}` })));
          pay();
        };
        row.append(b);
      }
      step.append(this._say(a.ko, a.rom, L(a.name), false), el('strong', 'pocha-label', tt('whatAsk')), row);
    };

    // 3. Change.
    const pay = () => {
      const row = el('div', 'pocha-row');
      for (const v of c.options) {
        const b = el('button', 'chip', won(v));
        b.onclick = () => {
          clearInterval(this.timer);
          const ok = v === c.change;
          if (ok) r.ok++;
          b.setAttribute('aria-pressed', 'true');
          if (ok) this.onSay?.([MART_LINES.thanks[0], MART_LINES.thanks[1], L(MART_LINES.thanks[2])]);
          this._after(ok ? tt('right') : tt('wrongWas', { a: won(c.change) }), ok);
        };
        row.append(b);
      }
      step.append(el('strong', 'pocha-label', `💵 ${tt('paysWith', { paid: won(c.paid) })}`), row);
      step.lastChild.scrollIntoView?.({ block: 'nearest' });
    };
  }

  serveTurn() {
    this._frame();
    const r = this.round;
    const turn = makeServeTurn(this.rand);
    const pick = { table: turn.kind === 'ask' ? turn.table : null, item: turn.kind === 'dish' ? turn.item : null };
    const step = el('div', 'job-step');
    const bar = this._patience(SERVE_PATIENCE, () => this._after(tt('timeUp'), false));
    this.root.append(el('small', 'order-rom', tt('turn', { n: r.i + 1, all: SERVE_TURNS })), this._say(turn.ko, turn.rom, L(turn.mean)), bar, step);

    const done = () => {
      clearInterval(this.timer);
      const ok = serveRight(turn, pick);
      if (ok) r.ok++;
      const right = turn.kind === 'dish' ? tt('table', { n: turn.table }) : (() => { const a = SERVE_ASKS.find((x) => x.id === turn.item); return `${a.emoji} ${a.btn}`; })();
      this._after(ok ? tt('right') : tt('wrongWas', { a: right }), ok);
    };
    if (turn.kind === 'dish') {
      const d = SERVE_DISHES.find((x) => x.id === turn.item);
      step.append(el('p', 'pocha-bowl', '🛎️ ' + d.emoji), el('strong', 'pocha-label', tt('whichTable')));
    } else {
      const row = el('div', 'pocha-row');
      for (const a of SERVE_ASKS) {
        const b = answerBtn(a);
        b.onclick = () => { pick.item = a.id; done(); b.setAttribute('aria-pressed', 'true'); };
        row.append(b);
      }
      step.append(el('strong', 'pocha-label', tt('whichItem', { n: turn.table })), row);
    }
    // The tables: guests at each; the one asking raises a hand.
    const tables = el('div', 'pocha-row job-tables');
    for (const n of TABLES) {
      const b = el('button', 'chip', `${turn.kind === 'ask' && n === turn.table ? '🙋' : '🪑'} ${tt('table', { n })}`);
      if (turn.kind === 'ask') b.disabled = true;
      else b.onclick = () => { pick.table = n; b.setAttribute('aria-pressed', 'true'); done(); };
      tables.append(b);
    }
    step.append(tables);
  }

  async finish() {
    const r = this.round, run = this.run;
    this.round = null; this.run = null;
    this._frame();
    this.root.append(el('p', 'order-hint', '…'));
    const got = await this.career.end(run, r.all ? r.ok / r.all : 0, { name: JOB_TEXT.ledger, at: this.store?.name });
    if (this.root.hidden) { this.onPaid?.(got.paid || 0, got); return; }
    this._frame();
    const coins = got.paid || 0;
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', this.kind === 'mart' ? '🏪' : '🍽️'),
      el('strong', null, got.error ? t(got.error === 'fast' ? 'career.fast' : 'career.offline') : tt('paid', { n: coins })),
      el('p', null, tt('result', { ok: r.ok, all: r.all })),
    );
    if (got.up) res.append(el('p', 'grill-best', t('career.levelUp', { job: L(JOB_TEXT.role[this.kind]), lv: got.lv })));
    const again = el('button', 'primary', tt('again'));
    again.onclick = () => this.start();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(res, el('p', 'order-hint', this._status()), actions);
    this.onPaid?.(coins, got);
  }
}
