// Part-time job panel (rules in core/jobs.js): the convenience store counter
// and the restaurant hall. Each shift uses one of the day's shifts and pays
// by how many answers were right.
import {
  JOB_TEXT, SHIFTS_PER_DAY, shiftPay, won,
  MART_CUSTOMERS, MART_PATIENCE, MART_ASKS, MART_LINES, makeMartCustomer,
  SERVE_TURNS, SERVE_PATIENCE, TABLES, SERVE_DISHES, SERVE_ASKS, makeServeTurn, serveRight,
} from '../core/jobs.js';
import { L, fmt } from './pocha-ui.js';

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
  // wallet: { add(n, note) }; shifts: { left(), take() } (take() false when
  // none are left); onSay(line); onPaid(coins).
  constructor({ root, wallet, shifts, onSay, onPaid, rand = Math.random }) {
    Object.assign(this, { root, wallet, shifts, onSay, onPaid, rand });
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

  renderStart() {
    this._frame();
    const left = this.shifts.left();
    const go = el('button', 'primary', '💼 ' + tt('start'));
    go.disabled = !left;
    go.onclick = () => this.start();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(
      el('p', 'order-hint', tt(this.kind === 'mart' ? 'martHow' : 'serveHow')),
      el('p', 'grill-best', left ? tt('shiftsLeft', { n: left, all: SHIFTS_PER_DAY }) : tt('noShifts', { all: SHIFTS_PER_DAY })),
      actions,
    );
  }

  start() {
    if (!this.shifts.take()) { this.renderStart(); return; }
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

  finish() {
    this._frame();
    const r = this.round;
    const coins = shiftPay(r.ok, r.all);
    if (coins) this.wallet.add(coins, { name: JOB_TEXT.ledger, at: this.store?.name }, { r: 'job' });
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', this.kind === 'mart' ? '🏪' : '🍽️'),
      el('strong', null, tt('paid', { n: coins })),
      el('p', null, tt('result', { ok: r.ok, all: r.all })),
    );
    const left = this.shifts.left();
    const again = el('button', 'primary', tt('again'));
    again.disabled = !left;
    again.onclick = () => this.start();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(res, el('p', 'order-hint', left ? tt('shiftsLeft', { n: left, all: SHIFTS_PER_DAY }) : tt('noShifts', { all: SHIFTS_PER_DAY })), actions);
    this.round = null;
    this.onPaid?.(coins);
  }
}
