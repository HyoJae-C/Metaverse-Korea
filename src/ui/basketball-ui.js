// Mini basketball panel (rules in core/basketball-game.js, text in
// basketball-text.js). Pick a shot, play its gauge, and the panel steps
// aside while your character does the move:
//
//   onShot({ shot, tier, points, made }) is called when the gauge is done;
//   the panel is hidden then. Play the move (shotMove), and call resume()
//   when it is over: the panel comes back for the next shot or the result.
//
// Medals as at the grill (coins go to `wallet`, then onMedal); the best
// score is kept on this device.
import { t } from '../core/i18n.js';
import { Medals, medalIcon } from '../core/grill-game.js';
import { BASKET_GAME, SHOTS, SHOT_BY_ID, SHOTS_PER_ROUND, BasketRound, ShotMeter, basketMedal, NEEDLE, DOUBLE, RHYTHM, MASH } from '../core/basketball-game.js';
import { BL } from './basketball-text.js';

const W = 600, H = 300;
const BEST_KEY = 'mk.basket.best';
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class BasketballUI {
  constructor({ root, store = globalThis.localStorage, wallet, onShot, onMedal, onClose }) {
    Object.assign(this, { root, store, wallet, onShot, onMedal, onClose });
    this.medals = new Medals(store);
    this.raf = 0;
    this.round = null;
    this.waiting = false; // a move is playing; resume() brings the panel back
    this.onKey = (e) => {
      if (!this.meter || (e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
      e.preventDefault(); e.stopPropagation();
      this.tap();
    };
  }
  get open() { return !this.root.hidden; }
  // Busy with a round (the panel may be hidden while a move plays).
  get playing() { return !!this.round && !this.round.over; }
  get best() { try { return +this.store?.getItem(BEST_KEY) || 0; } catch { return 0; } }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.round = null; this.waiting = false; this.root.hidden = true; this.onClose?.(); }
  _stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey, true);
    this.meter = null;
  }
  _frame(sub) {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', BL('close'));
    x.onclick = () => this.close();
    const h = el('h3', null, '🏀 ' + BL('title'));
    this.root.replaceChildren(x, h);
    if (sub) this.root.append(el('p', 'grill-best bb-sub', sub));
  }

  renderStart(note) {
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const medal = this.medals.best(BASKET_GAME);
    this.root.append(
      el('p', 'order-hint', BL('howTo')),
      el('p', 'grill-best', (medal ? t('grill.best', { medal: medalIcon(medal) + ' ' + t('grill.' + medal) }) : t('grill.noMedal')) + (this.best ? ' · ' + BL('best', { n: this.best }) : '')),
    );
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', '🏀 ' + BL('start'));
    go.onclick = () => { this.round = new BasketRound(); this.renderPick(); };
    actions.append(go);
    this.root.append(actions);
  }

  _status() {
    const r = this.round;
    return BL('shotN', { i: r.n + 1, n: SHOTS_PER_ROUND }) + ' · ' + BL('score', { n: r.points });
  }

  renderPick() {
    this._frame(this._status());
    this.root.append(el('p', 'order-hint', BL('pick')));
    const grid = el('div', 'bb-shots');
    for (const s of SHOTS) {
      const b = el('button', 'bb-shot');
      b.dataset.shot = s.id;
      const top = el('span', 'bb-shot-name', s.icon + ' ' + BL('shot.' + s.id));
      const pts = el('span', 'bb-shot-pts', BL('pts', { n: s.pts }));
      const tiers = el('span', 'bb-shot-tiers', s.tiers.map((x, i) => (i + 1) + '. ' + BL(s.id + '.' + x.id)).join('\n'));
      b.append(top, pts, tiers);
      b.onclick = () => this.play(s.id);
      grid.append(b);
    }
    this.root.append(grid);
  }

  // The gauge for one shot.
  play(shotId) {
    const s = SHOT_BY_ID[shotId];
    this._frame(this._status() + ' · ' + s.icon + ' ' + BL('shot.' + shotId));
    const cv = el('canvas', 'arcade-canvas');
    cv.width = W; cv.height = H;
    cv.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
    const hint = el('p', 'order-hint', BL('mode.' + s.mode));
    const btn = el('button', 'primary karaoke-pad', '🏀 ' + BL('tap'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
    this.root.append(hint, cv, btn, el('p', 'grill-best', BL('keys')));
    this.meter = new ShotMeter(s.mode);
    this.g = { cv, shot: s, pops: [], ended: false };
    window.addEventListener('keydown', this.onKey, true);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = this.meter;
      if (!m) return;
      const was = m.marks.length;
      m.step(dt);
      if (m.marks.length > was) this._pop(m.marks[m.marks.length - 1]);
      this.draw();
      if (m.done && !this.g.ended) this._done();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tap() {
    const m = this.meter;
    if (!m || m.done) return;
    const mark = m.tap();
    if (mark && m.mode !== 'mash') this._pop(mark);
    if (m.done && !this.g.ended) this._done();
  }
  _pop(mark) { this.g.pops.push({ text: BL(mark.q === 2 ? 'great' : mark.q === 1 ? 'good' : 'off'), q: mark.q, at: this.meter.t }); }

  // Gauge over: show the level for a moment, then step aside for the move.
  _done() {
    const g = this.g, m = this.meter, s = g.shot;
    g.ended = true;
    const tier = m.tier;
    const res = this.round.add(s.id, tier);
    g.result = { tier, name: BL(s.id + '.' + s.tiers[tier - 1].id) };
    this.draw();
    this.timer = setTimeout(() => {
      this._stop();
      this.waiting = true;
      this.root.hidden = true;
      this.onShot?.({ shot: s.id, tier, points: res.points, made: res.made });
    }, 900);
  }

  // The move is over: next shot, or the round's result.
  resume() {
    if (!this.waiting) return;
    this.waiting = false;
    this.root.hidden = false;
    if (this.round?.over) this.finish();
    else if (this.round) this.renderPick();
    else this.renderStart();
  }

  finish() {
    const r = this.round;
    const pts = r.points, made = r.made;
    if (pts > this.best) { try { this.store?.setItem(BEST_KEY, String(pts)); } catch { /* storage blocked */ } }
    const medal = basketMedal(pts);
    const coins = medal ? this.medals.add(BASKET_GAME, medal) : 0;
    if (coins) this.wallet?.add(coins, undefined, { r: 'medal', once: 'medal:' + BASKET_GAME + ':' + medal });
    this.onMedal?.(medal, coins);
    this._frame();
    const note = BL('done', { n: pts, m: made }) + (medal ? '  ' + medalIcon(medal) + ' ' + t('grill.' + medal) : '') + (coins ? '  🪙 +' + coins : '');
    const list = el('ol', 'bb-list');
    for (const s of r.shots) {
      const sh = SHOT_BY_ID[s.shot];
      list.append(el('li', s.made ? 'in' : 'out', sh.icon + ' ' + BL(s.shot + '.' + sh.tiers[s.tier - 1].id) + ' · ' + (s.made ? '+' + s.points : '0')));
    }
    this.root.append(el('p', 'order-hint claw-note', note), list, el('p', 'grill-best', BL('best', { n: this.best })));
    const actions = el('div', 'order-actions');
    const back = el('button', null, BL('close'));
    back.onclick = () => this.close();
    const again = el('button', 'primary', '🏀 ' + BL('again'));
    again.onclick = () => { this.round = new BasketRound(); this.renderPick(); };
    actions.append(back, again);
    this.root.append(actions);
    this.round = null;
  }

  // --- Drawing ---
  draw() {
    const g = this.g, m = this.meter;
    if (!g || !m) return;
    const c = g.cv.getContext('2d');
    // An evening court: blue floor, a wooden-board stripe, the hoop's glow.
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#24365c'); bg.addColorStop(1, '#3f6fae');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (m.mode === 'needle' || m.mode === 'double') this._drawBar(c, m);
    else if (m.mode === 'mash') this._drawMash(c, m);
    else this._drawRhythm(c, m);
    // Pops: Great / Good / Off rising and fading.
    for (const p of g.pops) {
      const k = (m.t - p.at) / 0.8;
      if (k > 1) continue;
      c.globalAlpha = 1 - k;
      c.fillStyle = p.q === 2 ? '#7ee081' : p.q === 1 ? '#ffd166' : '#ff8a80';
      c.font = '900 34px system-ui';
      c.fillText(p.text, W / 2, 60 - k * 24);
      c.globalAlpha = 1;
    }
    if (g.result) {
      c.fillStyle = 'rgba(16, 22, 40, 0.72)'; c.fillRect(0, 0, W, H);
      c.fillStyle = ['#ff8a80', '#ffd166', '#7ee081'][g.result.tier - 1];
      c.font = '900 30px system-ui';
      c.fillText(BL('level', { n: g.result.tier }) + ' ' + '★'.repeat(g.result.tier) + '☆'.repeat(3 - g.result.tier), W / 2, H / 2 - 26);
      c.fillStyle = '#fff'; c.font = '800 34px system-ui';
      c.fillText(g.result.name, W / 2, H / 2 + 20);
    }
  }

  // A swinging needle over red, yellow and green zones.
  _drawBar(c, m) {
    const dbl = m.mode === 'double';
    const great = dbl ? DOUBLE.great : NEEDLE.great, good = dbl ? DOUBLE.good : NEEDLE.good;
    const x0 = 40, x1 = W - 40, y = 170, h = 46, w = x1 - x0;
    const X = (u) => x0 + u * w;
    c.fillStyle = '#e26d5a'; c.fillRect(x0, y - h / 2, w, h);
    c.fillStyle = '#f2c14e'; c.fillRect(X(0.5 - good), y - h / 2, w * good * 2, h);
    c.fillStyle = '#58c26b'; c.fillRect(X(0.5 - great), y - h / 2, w * great * 2, h);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(x0, y - h / 2, w, h);
    if (dbl) {
      c.fillStyle = '#fff'; c.font = '800 24px system-ui';
      c.fillText(m.phase === 0 ? '1 · ' + BL('phase.jump') : '2 · ' + BL('phase.release'), W / 2, 112);
      // where the first tap stopped
      if (m.marks[0]) { c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = '700 16px system-ui'; c.fillText('1 ✓', W / 2, 240); }
    }
    const nx = X(m.pos); // (the needle stops where you tapped)
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(nx, y - h / 2 - 4); c.lineTo(nx - 12, y - h / 2 - 24); c.lineTo(nx + 12, y - h / 2 - 24); c.closePath(); c.fill();
    c.fillRect(nx - 3, y - h / 2 - 4, 6, h + 8);
    // A little hoop above the middle.
    c.strokeStyle = '#ff8c42'; c.lineWidth = 4;
    c.beginPath(); c.ellipse(W / 2, y + h / 2 + 34, 26, 7, 0, 0, Math.PI * 2); c.stroke();
  }

  // Mash: a jump gauge that fills with taps, and the time left.
  _drawMash(c, m) {
    const left = Math.max(0, MASH.time - m.t);
    const x = W / 2 - 40, y0 = 270, hh = 210, w = 80;
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x, y0 - hh, w, hh);
    const mark = (n, col) => { const yy = y0 - hh * Math.min(1, n / MASH.great); c.fillStyle = col; c.fillRect(x - 10, yy - 2, w + 20, 4); };
    const f = m.fill;
    const col = m.taps >= MASH.great ? '#58c26b' : m.taps >= MASH.good ? '#f2c14e' : '#e26d5a';
    c.fillStyle = col; c.fillRect(x, y0 - hh * f, w, hh * f);
    mark(MASH.good, '#f2c14e'); mark(MASH.great, '#58c26b');
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(x, y0 - hh, w, hh);
    c.fillStyle = '#fff'; c.font = '900 44px system-ui';
    c.fillText(String(m.taps), W / 2 - 160, 150);
    c.font = '800 22px system-ui';
    c.fillText(left.toFixed(1) + 's', W / 2 + 160, 150);
    // stars beside the gauge for each level
    c.font = '700 18px system-ui';
    c.fillText('★★', x + w + 50, y0 - hh * (MASH.good / MASH.great));
    c.fillText('★★★', x + w + 50, y0 - hh + 4);
  }

  // Rhythm: three rings closing onto three dots, one for each beat.
  _drawRhythm(c, m) {
    const xs = [W / 2 - 170, W / 2, W / 2 + 170], y = 170, r0 = 30;
    m.beats.forEach((bt, i) => {
      const mark = m.marks[i];
      const col = mark ? (mark.q === 2 ? '#58c26b' : mark.q === 1 ? '#f2c14e' : '#e26d5a') : 'rgba(255,255,255,0.25)';
      c.fillStyle = col;
      c.beginPath(); c.arc(xs[i], y, r0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.arc(xs[i], y, r0, 0, Math.PI * 2); c.stroke();
      if (!mark) {
        const left = bt - m.t; // seconds until the beat
        if (left < 0.9 && left > -RHYTHM.good) {
          c.strokeStyle = '#ffd166'; c.lineWidth = 4;
          c.beginPath(); c.arc(xs[i], y, r0 + Math.max(0, left) * 110, 0, Math.PI * 2); c.stroke();
        }
      }
      c.fillStyle = '#fff'; c.font = '800 20px system-ui';
      c.fillText(BL('beat.' + i), xs[i], y + r0 + 30);
    });
  }
}
