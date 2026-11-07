// Tuho panel (rules in core/tuho-game.js, text in folk-text.js): ten arrows,
// two taps each (direction, then power), seen from the throwing line.
// Medals as at the grill; each new tier pays once (onMedal).
import { t } from '../core/i18n.js';
import { Medals, medalIcon } from '../core/grill-game.js';
import { TUHO_GAME, ARROWS, JAR_AT, NEAR, FAR, SPREAD, MOUTH_R, EAR_X, EAR_R, aimAt, powerAt, toss, tuhoMedal, TuhoRound } from '../core/tuho-game.js';
import { FL, lineText } from './folk-text.js';

const W = 600, H = 380, HORIZON = 64, CAM_H = 1.45, F = 500, MOUTH_H = 0.84;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
// Screen position of a point x (sideways), d (ahead), h (up), in metres.
const proj = (x, d, h) => [W / 2 + (x * F) / d, HORIZON + ((CAM_H - h) * F) / d];

export class TuhoUI {
  constructor({ root, onSay, onMedal, onClose, rand = Math.random }) {
    Object.assign(this, { root, onSay, onMedal, onClose, rand });
    this.medals = new Medals();
    this.raf = 0;
    this.onKey = (e) => {
      if (!this.round || (e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
      e.preventDefault(); e.stopPropagation();
      this.tap();
    };
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); this.say('tuhoHello'); }
  close() { this._stop(); this.root.hidden = true; this.onClose?.(); }
  say(k) { this.onSay?.(lineText(k)); }
  _stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey, true);
    this.round = null;
  }
  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', FL('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🏺 ' + FL('tuho.title')));
  }

  renderStart(note) {
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = this.medals.best(TUHO_GAME);
    this.root.append(
      el('p', 'order-hint', FL('tuho.howTo')),
      el('p', 'kimchi-fact', '🏛️ ' + FL('tuho.fact')),
      el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')),
    );
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', '🏹 ' + FL('start'));
    go.onclick = () => this.play();
    actions.append(go);
    this.root.append(actions);
  }

  play() {
    this._frame();
    const cv = el('canvas', 'arcade-canvas');
    cv.width = W; cv.height = H;
    cv.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
    const status = el('p', 'karaoke-status');
    const btn = el('button', 'primary karaoke-pad', '👆 ' + FL('tuho.tap'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.tap(); };
    this.root.append(cv, status, btn);
    this.round = new TuhoRound();
    this.g = { cv, status, phase: 'aim', t0: performance.now() / 1000, aim: 0, power: 0, fly: null, stuck: [], fallen: [], msg: '' };
    window.addEventListener('keydown', this.onKey, true);
    this._status();
    const loop = (now) => { this.draw(now / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  _status() {
    const g = this.g, r = this.round;
    const head = FL('tuho.arrow', { i: Math.min(ARROWS, r.k + 1), n: ARROWS }) + ' · ' + FL('tuho.score', { score: r.score, n: r.inJar });
    g.status.textContent = head + '\n' + (g.msg || (g.phase === 'aim' ? FL('tuho.aim') : g.phase === 'power' ? FL('tuho.power') : ''));
  }

  tap() {
    const g = this.g, r = this.round;
    if (!r || r.done) return;
    const now = performance.now() / 1000;
    if (g.phase === 'aim') {
      g.aim = aimAt(now - g.t0, r.k);
      g.phase = 'power';
      g.t0 = now;
      g.msg = '';
    } else if (g.phase === 'power') {
      g.power = powerAt(now - g.t0, r.k);
      const res = r.add(toss(g.aim, g.power, this.rand));
      g.phase = 'fly';
      g.fly = { res, at: now };
    } else return;
    this._status();
  }

  _landed(res) {
    const g = this.g, r = this.round;
    g.msg = FL('tuho.' + (res.kind === 'mouth' || res.kind === 'ear' || res.kind === 'rim' ? res.kind : res.tip));
    if (res.points) { g.stuck.push(res); if (res.kind === 'ear' || r.inJar % 3 === 1) this.say(res.kind === 'ear' ? 'cheer' : 'inJar'); } else g.fallen.push(res);
    this._status();
    this.timer = setTimeout(() => {
      if (!this.round) return;
      if (r.done) { this.finish(); return; }
      g.phase = 'aim'; g.t0 = performance.now() / 1000; g.fly = null; g.msg = '';
      this._status();
    }, 1100);
  }

  finish() {
    const r = this.round, score = r.score, inJar = r.inJar;
    const medal = tuhoMedal(score);
    const coins = medal ? this.medals.add(TUHO_GAME, medal) : 0;
    this.onMedal?.(medal, coins);
    const note = FL('tuho.score', { score, n: inJar }) + (medal ? '  ' + medalIcon(medal) + ' ' + t('grill.' + medal) : '') + (coins ? '  🪙 +' + coins : '');
    this._frame();
    this.root.append(el('p', 'order-hint claw-note', note));
    const actions = el('div', 'order-actions');
    const back = el('button', null, FL('close'));
    back.onclick = () => this.close();
    const again = el('button', 'primary', '🏹 ' + FL('again'));
    again.onclick = () => this.play();
    actions.append(back, again);
    this.root.append(actions);
  }

  // Where an arrow is u (0..1) of the way through its flight.
  _flight(res, u) {
    const sx = 0.18, sd = 0.55, sh = 1.05; // from your hand
    const endH = res.points ? MOUTH_H - 0.12 : res.kind === 'rim' ? MOUTH_H : 0;
    const x = sx + (res.x - sx) * u, d = sd + (res.d - sd) * u;
    const h = sh + (endH - sh) * u + 1.0 * 4 * u * (1 - u);
    return [x, d, h];
  }

  draw(now) {
    const g = this.g, r = this.round;
    if (!g || !r) return;
    const c = g.cv.getContext('2d');
    // A courtyard: hanok wall, packed earth, a straw mat under the jar.
    c.fillStyle = '#f4e9d3'; c.fillRect(0, 0, W, HORIZON);
    c.fillStyle = '#4a4440'; c.fillRect(0, HORIZON - 26, W, 8); // roof tiles on the wall
    c.fillStyle = '#e9dcc0'; c.fillRect(0, HORIZON - 18, W, 18);
    const ground = c.createLinearGradient(0, HORIZON, 0, H);
    ground.addColorStop(0, '#d9c49a'); ground.addColorStop(1, '#c9ae7c');
    c.fillStyle = ground; c.fillRect(0, HORIZON, W, H - HORIZON);
    const mat = [[-0.6, JAR_AT - 0.45], [0.6, JAR_AT - 0.45], [0.6, JAR_AT + 0.45], [-0.6, JAR_AT + 0.45]].map(([x, d]) => proj(x, d, 0));
    c.fillStyle = '#c29a5c'; c.beginPath(); mat.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
    // Arrows that missed lie on the ground.
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 2;
    for (const f of g.fallen) {
      const [x1, y1] = proj(f.x - 0.2, f.d, 0), [x2, y2] = proj(f.x + 0.2, f.d + 0.1, 0);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }
    // The jar.
    const [jx, jy] = proj(0, JAR_AT, 0);
    const s = F / JAR_AT;
    const body = (y0, r0) => [jx, jy - y0 * s, r0 * s];
    c.fillStyle = '#6b4a2e'; c.fillRect(jx - 0.32 * s, jy - 0.12 * s, 0.64 * s, 0.12 * s);
    c.fillStyle = '#9c7a3c';
    c.beginPath();
    const prof = [[0.16, 0.12], [0.24, 0.24], [0.26, 0.42], [0.2, 0.58], [0.1, 0.68], [0.075, 0.78], [0.09, 0.84]];
    prof.forEach(([rr, yy], i) => { const [x, y] = [jx + rr * s, jy - yy * s]; i ? c.lineTo(x, y) : c.moveTo(x, y); });
    for (let i = prof.length - 1; i >= 0; i--) c.lineTo(jx - prof[i][0] * s, jy - prof[i][1] * s);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(jx - 0.18 * s, jy - 0.5 * s, 0.05 * s, 0.25 * s);
    // Mouth and ears (dark openings, seen from a little above).
    const [, my] = proj(0, JAR_AT, MOUTH_H);
    const hole = (x, rx, top) => { c.fillStyle = '#7d6130'; c.beginPath(); c.ellipse(jx + x * s, top, rx * s + 3, rx * s * 0.42 + 2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a2016'; c.beginPath(); c.ellipse(jx + x * s, top, rx * s, rx * s * 0.42, 0, 0, Math.PI * 2); c.fill(); };
    for (const sd of [-1, 1]) {
      c.fillStyle = '#9c7a3c'; c.fillRect(jx + sd * EAR_X * s - EAR_R * s, my - 0.02 * s, EAR_R * 2 * s, 0.16 * s);
      hole(sd * EAR_X, EAR_R, my - 0.02 * s);
    }
    hole(0, MOUTH_R, my);
    // Arrows in the jar stick up out of it.
    for (const a of g.stuck) {
      const [x0, y0] = proj(a.x, JAR_AT, MOUTH_H);
      const lean = (a.x / 0.1) * 0.25;
      this._arrow(c, x0, y0, x0 + Math.sin(lean) * 0.6 * s, y0 - Math.cos(lean) * 0.6 * s);
    }
    // Aim: a swinging marker across the jar, then a power bar.
    const tt = now - g.t0;
    const aim = g.phase === 'aim' ? aimAt(tt, r.k) : g.aim;
    if (g.phase === 'aim' || g.phase === 'power') {
      const [ax, ay] = proj(aim * SPREAD, JAR_AT, MOUTH_H);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.setLineDash([8, 8]); c.lineWidth = 3;
      c.beginPath(); c.moveTo(W / 2 + 40, H - 4); c.lineTo(ax, ay); c.stroke(); c.setLineDash([]);
      const [lx] = proj(-SPREAD, JAR_AT, MOUTH_H), [rx] = proj(SPREAD, JAR_AT, MOUTH_H);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(lx, ay + 0.3 * s, rx - lx, 6);
      c.fillStyle = g.phase === 'aim' ? '#ffd166' : '#ffffff';
      c.beginPath(); c.moveTo(ax, ay + 0.3 * s - 4); c.lineTo(ax - 9, ay + 0.3 * s + 16); c.lineTo(ax + 9, ay + 0.3 * s + 16); c.closePath(); c.fill();
    }
    if (g.phase === 'power') {
      const p = powerAt(tt, r.k);
      const bx = W - 46, by = 40, bh = H - 80;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx, by, 22, bh);
      const zone = (JAR_AT - NEAR) / (FAR - NEAR), zr = MOUTH_R / (FAR - NEAR);
      c.fillStyle = 'rgba(80,190,110,0.55)'; c.fillRect(bx, by + bh * (1 - zone - zr), 22, bh * zr * 2);
      c.fillStyle = '#ffd166'; c.fillRect(bx - 6, by + bh * (1 - p) - 4, 34, 8);
    }
    // The arrow in flight.
    if (g.fly) {
      const u = Math.min(1, (now - g.fly.at) / 0.75);
      const res = g.fly.res;
      const [x, d, h] = this._flight(res, u), [x0, d0, h0] = this._flight(res, Math.max(0, u - 0.08));
      const [p1x, p1y] = proj(x, d, h), [p0x, p0y] = proj(x0, d0, h0);
      const k = Math.hypot(p1x - p0x, p1y - p0y) || 1, len = 0.75 * F / d;
      this._arrow(c, p1x - ((p1x - p0x) / k) * len, p1y - ((p1y - p0y) / k) * len, p1x, p1y);
      if (u >= 1 && !g.fly.done) { g.fly.done = true; this._landed(res); }
    }
    // Arrows left.
    c.fillStyle = '#5a3c25'; c.font = 'bold 16px system-ui'; c.textAlign = 'left';
    c.fillText('🏹 ' + (ARROWS - r.k), 12, H - 14);
  }
  _arrow(c, x0, y0, x1, y1) {
    c.strokeStyle = '#d8c08e'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = '#c0392b'; c.lineWidth = 6;
    const k = 0.12;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); c.stroke();
  }
}
