// Neolttwigi panel (rules in core/neol-game.js, text in folk-text.js): you
// and Suni take turns flying up off a long board. Tap PUSH just as you land
// to send her higher; she sends you back just as high. A hanok wall stands
// behind, so a good jump lets you peek over it. Medals as at the grill.
import { t } from '../core/i18n.js';
import { Medals, medalIcon } from '../core/grill-game.js';
import { NEOL_GAME, NeolRound, JUMPS, WINDOW, airTime, heightOf, neolMedal } from '../core/neol-game.js';
import { FL, lineText } from './folk-text.js';

const W = 600, H = 380, PIVOT_Y = 318, HALF = 190, M = 100; // px per metre
const TILT = 26; // px the low end sits below the pivot
const WALL_M = 1.6;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class NeolUI {
  constructor({ root, onSay, onMedal, onClose }) {
    Object.assign(this, { root, onSay, onMedal, onClose });
    this.medals = new Medals();
    this.raf = 0;
    this.onKey = (e) => {
      if (!this.round || (e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
      e.preventDefault(); e.stopPropagation();
      this.push();
    };
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); this.say('neolHello'); }
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
    this.root.replaceChildren(x, el('h3', null, '🪵 ' + FL('neol.title')));
  }

  renderStart(note) {
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = this.medals.best(NEOL_GAME);
    this.root.append(
      el('p', 'order-hint', FL('neol.howTo')),
      el('p', 'kimchi-fact', '🧱 ' + FL('neol.fact')),
      el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')),
    );
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', '🪵 ' + FL('start'));
    go.onclick = () => this.play();
    actions.append(go);
    this.root.append(actions);
  }

  play() {
    this._frame();
    const cv = el('canvas', 'arcade-canvas');
    cv.width = W; cv.height = H;
    cv.onpointerdown = (e) => { e.preventDefault(); this.push(); };
    const status = el('p', 'karaoke-status');
    const btn = el('button', 'primary karaoke-pad', '🦶 ' + FL('neol.push'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.push(); };
    this.root.append(cv, status, btn);
    this.round = new NeolRound();
    const now = performance.now() / 1000;
    // Suni goes first: she lands and you fly up.
    this.g = { cv, status, who: 'you', t0: now + 0.8, v: this.round.v, tap: null, label: '', labelAt: 0 };
    this._status();
    window.addEventListener('keydown', this.onKey, true);
    const loop = (ms) => { this.tick(ms / 1000); this.draw(ms / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  _status() {
    const r = this.round, g = this.g;
    g.status.textContent = FL('neol.jump', { i: Math.min(JUMPS, r.jumps.length + 1), n: JUMPS }) + ' · ' + FL('neol.total', { m: r.metres.toFixed(1), b: r.best.toFixed(1) }) + (g.label ? '\n' + g.label : '');
  }

  push() {
    const g = this.g, r = this.round;
    if (!r || r.done || g.who !== 'you' || g.tap != null) return;
    const now = performance.now() / 1000, land = g.t0 + airTime(g.v);
    if (now < land - 0.6) return; // still flying high: wait for the way down
    g.tap = now - land;
  }

  tick(now) {
    const g = this.g, r = this.round;
    if (!g || !r) return;
    if (g.who === 'you') {
      const land = g.t0 + airTime(g.v);
      const late = now > land + WINDOW;
      if (now >= land && (g.tap != null || late)) {
        const jump = r.land(g.tap);
        g.label = FL('neol.' + jump.label) + ' · ' + jump.h.toFixed(1) + ' m';
        g.labelAt = now;
        if (jump.label === 'perfect' && r.jumps.length % 3 === 0) this.say('high');
        this._status();
        if (r.done) { g.who = 'end'; this.timer = setTimeout(() => this.finish(), 900); return; }
        g.who = 'partner'; g.t0 = now; g.v = r.partnerV; g.tap = null;
      }
    } else if (g.who === 'partner') {
      if (now >= g.t0 + airTime(g.v)) { g.who = 'you'; g.t0 = now; g.v = r.v; g.tap = null; }
    }
  }

  finish() {
    const r = this.round;
    if (!r) return;
    const metres = r.metres, best = r.best;
    const medal = neolMedal(metres);
    const coins = medal ? this.medals.add(NEOL_GAME, medal) : 0;
    this.onMedal?.(medal, coins);
    const note = FL('neol.total', { m: metres.toFixed(1), b: best.toFixed(1) }) + (medal ? '  ' + medalIcon(medal) + ' ' + t('grill.' + medal) : '') + (coins ? '  🪙 +' + coins : '');
    this._frame();
    this.root.append(el('p', 'order-hint claw-note', note));
    const actions = el('div', 'order-actions');
    const back = el('button', null, FL('close'));
    back.onclick = () => this.close();
    const again = el('button', 'primary', '🪵 ' + FL('again'));
    again.onclick = () => this.play();
    actions.append(back, again);
    this.root.append(actions);
  }

  // Height (m) of someone flying since t0 with launch speed v.
  _height(now, t0, v) {
    const tt = Math.max(0, now - t0);
    return Math.max(0, v * tt - 4.9 * tt * tt);
  }

  draw(now) {
    const g = this.g, r = this.round;
    if (!g || !r) return;
    const c = g.cv.getContext('2d');
    const cx = W / 2;
    // Sky, the far hills, a hanok wall (WALL_M high) and the yard.
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#9fd0f0'); sky.addColorStop(1, '#e9f5fb');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9ab89a';
    c.beginPath(); c.moveTo(0, 150); c.quadraticCurveTo(160, 90, 300, 140); c.quadraticCurveTo(450, 80, W, 130); c.lineTo(W, 200); c.lineTo(0, 200); c.fill();
    c.fillStyle = '#c9a77a'; c.fillRect(0, 200, W, 30); // village roofs peeking over
    const wallTop = PIVOT_Y + 20 - WALL_M * M;
    c.fillStyle = '#ece3cf'; c.fillRect(0, wallTop, W, PIVOT_Y + 20 - wallTop);
    c.fillStyle = '#b9ad94';
    for (let x = 10; x < W; x += 70) c.fillRect(x, wallTop + 30, 40, 26);
    c.fillStyle = '#3f3b38'; c.fillRect(-10, wallTop - 14, W + 20, 16);
    c.fillStyle = '#d9c49a'; c.fillRect(0, PIVOT_Y + 20, W, H);
    // Who is in the air and who is on the board.
    const youH = g.who === 'you' ? this._height(now, g.t0, g.v) : 0;
    const herH = g.who === 'partner' ? this._height(now, g.t0, g.v) : 0;
    const youDown = g.who !== 'you' || youH === 0; // your end is low when you stand on it
    const tilt = g.who === 'you' ? (youH === 0 ? -1 : 1) : g.who === 'partner' ? (herH === 0 ? 1 : -1) : -1;
    // tilt -1: your (left) end down; 1: Suni's (right) end down.
    const leftY = PIVOT_Y + (tilt < 0 ? TILT : -TILT), rightY = PIVOT_Y + (tilt < 0 ? -TILT : TILT);
    // The straw bundle and the board.
    c.fillStyle = '#caa35e'; c.beginPath(); c.ellipse(cx, PIVOT_Y + 8, 24, 16, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7a5a2e'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 8, PIVOT_Y - 6); c.lineTo(cx - 8, PIVOT_Y + 22); c.moveTo(cx + 8, PIVOT_Y - 6); c.lineTo(cx + 8, PIVOT_Y + 22); c.stroke();
    c.strokeStyle = '#b3854f'; c.lineWidth = 10; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(cx - HALF, leftY); c.lineTo(cx + HALF, rightY); c.stroke();
    // The timing ring closes on your end as you come down.
    if (g.who === 'you' && g.tap == null) {
      const left = g.t0 + airTime(g.v) - now;
      if (left < 0.6 && left > -WINDOW) {
        c.strokeStyle = left > WINDOW ? 'rgba(255,255,255,0.8)' : '#ffd166'; c.lineWidth = 4;
        c.beginPath(); c.ellipse(cx - HALF + 20, leftY, 18 + Math.max(0, left) * 90, 6 + Math.max(0, left) * 30, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    this._person(c, cx - HALF + 20, (youDown && youH === 0 ? leftY : PIVOT_Y - TILT) - youH * M, '#2f5fa8', '#d64541', youH > 0);
    this._person(c, cx + HALF - 20, (herH === 0 ? rightY : PIVOT_Y - TILT) - herH * M, '#f2c94c', '#c0392b', herH > 0);
    c.fillStyle = '#2c2a33'; c.font = 'bold 15px system-ui'; c.textAlign = 'center';
    c.fillText(FL('yut.you'), cx - HALF + 20, H - 10);
    c.fillText(FL('neol.partner'), cx + HALF - 20, H - 10);
    // Peeking over the wall.
    if (youH > WALL_M - 0.9) { c.font = '22px system-ui'; c.fillText('👀', cx - HALF + 54, PIVOT_Y - TILT - youH * M - 70); }
    if (g.label && now - g.labelAt < 1.4) {
      c.globalAlpha = 1 - (now - g.labelAt) / 1.4;
      c.fillStyle = '#d64541'; c.font = '900 26px system-ui'; c.fillText(g.label, cx, 48);
      c.globalAlpha = 1;
    }
    c.fillStyle = '#2c2a33'; c.font = 'bold 14px system-ui'; c.textAlign = 'left';
    c.fillText(heightOf(r.v).toFixed(1) + ' m ↑', 10, 22);
  }

  // A small figure in hanbok: feet at (x, y). In the air the skirt flares.
  _person(c, x, y, top, skirt, flying) {
    c.fillStyle = skirt;
    c.beginPath(); c.moveTo(x - (flying ? 24 : 18), y - 4); c.lineTo(x + (flying ? 24 : 18), y - 4); c.lineTo(x + 9, y - 46); c.lineTo(x - 9, y - 46); c.closePath(); c.fill();
    c.fillStyle = top; c.fillRect(x - 12, y - 66, 24, 22);
    c.strokeStyle = top; c.lineWidth = 6; c.lineCap = 'round';
    const arm = flying ? -18 : 6;
    c.beginPath(); c.moveTo(x - 10, y - 60); c.lineTo(x - 24, y - 50 + arm); c.moveTo(x + 10, y - 60); c.lineTo(x + 24, y - 50 + arm); c.stroke();
    c.fillStyle = '#f2d2b6'; c.beginPath(); c.arc(x, y - 78, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2b2522'; c.beginPath(); c.arc(x, y - 82, 12, Math.PI, 0); c.fill();
    c.fillRect(x + 8, y - 84, 6, 18); // braid
    c.fillStyle = '#ffffff'; c.fillRect(x - 10, y - 6, 8, 5); c.fillRect(x + 2, y - 6, 8, 5);
  }
}
