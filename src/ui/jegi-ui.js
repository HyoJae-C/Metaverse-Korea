// Jegichagi panel (rules in core/jegi-game.js, text in folk-text.js): keep
// the jegi in the air by tapping KICK as it reaches your foot; every kick is
// counted out in native Korean numbers (하나, 둘, 셋…). Medals as at the
// grill (onMedal); the best count is kept on this device.
import { t } from '../core/i18n.js';
import { Medals, medalIcon } from '../core/grill-game.js';
import { JEGI_GAME, JegiRound, jegiMedal, KICK_TOP, SWEET, REACH, FLOOR } from '../core/jegi-game.js';
import { FL, lineText, koCount } from './folk-text.js';

const W = 600, H = 380, FOOT_Y = 300, M = 200; // px per metre
const BEST_KEY = 'mk.folk.jegiBest';
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class JegiUI {
  constructor({ root, store = globalThis.localStorage, onSay, onMedal, onClose, rand = Math.random }) {
    Object.assign(this, { root, store, onSay, onMedal, onClose, rand });
    this.medals = new Medals();
    this.raf = 0;
    this.onKey = (e) => {
      if (!this.round || (e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
      e.preventDefault(); e.stopPropagation();
      this.kick();
    };
  }
  get open() { return !this.root.hidden; }
  get best() { try { return +this.store?.getItem(BEST_KEY) || 0; } catch { return 0; } }
  show() { this.root.hidden = false; this.renderStart(); this.say('jegiHello'); }
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
    this.root.replaceChildren(x, el('h3', null, '🪶 ' + FL('jegi.title')));
  }

  renderStart(note) {
    this._frame();
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const medal = this.medals.best(JEGI_GAME);
    this.root.append(
      el('p', 'order-hint', FL('jegi.howTo')),
      el('p', 'kimchi-fact', '🪙 ' + FL('jegi.fact')),
      el('p', 'grill-best', (medal ? t('grill.best', { medal: medalIcon(medal) + ' ' + t('grill.' + medal) }) : t('grill.noMedal')) + (this.best ? ' · ' + FL('jegi.best', { n: this.best }) : '')),
    );
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', '🪶 ' + FL('start'));
    go.onclick = () => this.play();
    actions.append(go);
    this.root.append(actions);
  }

  play() {
    this._frame();
    const cv = el('canvas', 'arcade-canvas');
    cv.width = W; cv.height = H;
    cv.onpointerdown = (e) => { e.preventDefault(); this.kick(); };
    const status = el('p', 'karaoke-status');
    const btn = el('button', 'primary karaoke-pad', '🦶 ' + FL('jegi.kick'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.kick(); };
    this.root.append(cv, status, btn);
    this.round = new JegiRound(this.rand);
    this.g = { cv, status, pop: null, kickAt: -9, trail: [] };
    status.textContent = FL('jegi.howTo').split('. ')[0] + '.';
    window.addEventListener('keydown', this.onKey, true);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = this.round;
      if (!r) return;
      r.step(dt);
      this.draw(now / 1000);
      if (r.over && !this.g.ended) { this.g.ended = true; this.timer = setTimeout(() => this.finish(), 900); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  kick() {
    const r = this.round, g = this.g;
    if (!r || r.over) return;
    const res = r.kick();
    g.kickAt = performance.now() / 1000;
    if (res.q) {
      const [ko, rom] = koCount(r.kicks);
      g.pop = { text: ko, sub: rom + ' · ' + r.kicks, at: g.kickAt };
      g.status.textContent = FL('jegi.' + res.label);
      if (r.kicks % 10 === 0) this.say('cheer');
    } else if (res.label === 'whiff') g.status.textContent = FL('jegi.whiff');
  }

  finish() {
    const r = this.round;
    if (!r) return;
    const kicks = r.kicks, perfects = r.perfects;
    if (kicks > this.best) { try { this.store?.setItem(BEST_KEY, String(kicks)); } catch { /* storage blocked */ } }
    const medal = jegiMedal(kicks);
    const coins = medal ? this.medals.add(JEGI_GAME, medal) : 0;
    this.onMedal?.(medal, coins);
    const [ko, rom] = koCount(kicks);
    const note = FL('jegi.fell', { n: kicks }) + (kicks ? ` (${ko}, ${rom})` : '') + ' · ' + FL('jegi.perfects', { n: perfects }) + (medal ? '  ' + medalIcon(medal) + ' ' + t('grill.' + medal) : '') + (coins ? '  🪙 +' + coins : '');
    this._frame();
    this.root.append(el('p', 'order-hint claw-note', note), el('p', 'grill-best', FL('jegi.best', { n: this.best })));
    const actions = el('div', 'order-actions');
    const back = el('button', null, FL('close'));
    back.onclick = () => this.close();
    const again = el('button', 'primary', '🪶 ' + FL('again'));
    again.onclick = () => this.play();
    actions.append(back, again);
    this.root.append(actions);
  }

  draw(now) {
    const g = this.g, r = this.round;
    if (!g || !r) return;
    const c = g.cv.getContext('2d');
    // A winter courtyard: pale sky, a stone wall, packed snow on the ground.
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#cfe3f2'); sky.addColorStop(1, '#eef4f8');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = '#8b8a86';
    for (let x = -10; x < W; x += 44) for (let row = 0; row < 3; row++) c.fillRect(x + (row % 2) * 22, 230 + row * 20, 40, 17);
    c.fillStyle = '#4a4440'; c.fillRect(0, 222, W, 9);
    c.fillStyle = '#f4f1ea'; c.fillRect(0, FOOT_Y + 26, W, H - FOOT_Y - 26);
    const cx = W / 2;
    // The kick zone above the foot, and how far you can reach sideways.
    c.fillStyle = 'rgba(255, 209, 102, 0.22)';
    c.fillRect(cx - REACH * M, FOOT_Y - KICK_TOP * M, REACH * 2 * M, KICK_TOP * M);
    c.strokeStyle = 'rgba(214, 69, 65, 0.6)'; c.setLineDash([6, 6]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx - REACH * M, FOOT_Y - SWEET * M); c.lineTo(cx + REACH * M, FOOT_Y - SWEET * M); c.stroke(); c.setLineDash([]);
    // You: a standing leg and a kicking leg in white baji trousers.
    const kickU = Math.max(0, 1 - (now - g.kickAt) / 0.22);
    const hipX = cx - 40, hipY = FOOT_Y - 120;
    c.lineCap = 'round';
    c.strokeStyle = '#f7f3ea'; c.lineWidth = 34;
    c.beginPath(); c.moveTo(hipX - 20, hipY); c.lineTo(hipX - 26, FOOT_Y + 16); c.stroke();
    const kneeX = hipX + 30 + kickU * 20, kneeY = hipY + 70 - kickU * 30;
    const footX = cx + r.x * M * 0.6 - 10, footY = FOOT_Y + 8 - kickU * 30;
    c.beginPath(); c.moveTo(hipX + 10, hipY); c.lineTo(kneeX, kneeY); c.lineTo(footX, footY); c.stroke();
    c.strokeStyle = '#d6cfc0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(hipX - 36, hipY + 20); c.lineTo(hipX + 26, hipY + 20); c.stroke();
    // Jeogori (jacket) with a tied ribbon, arms out for balance, a head.
    c.fillStyle = '#2f5fa8';
    c.beginPath(); c.moveTo(hipX - 40, hipY + 2); c.lineTo(hipX + 48, hipY + 2); c.lineTo(hipX + 36, hipY - 72); c.lineTo(hipX - 28, hipY - 72); c.closePath(); c.fill();
    c.strokeStyle = '#2f5fa8'; c.lineWidth = 16;
    c.beginPath(); c.moveTo(hipX - 24, hipY - 62); c.lineTo(hipX - 70, hipY - 30 + kickU * 10); c.moveTo(hipX + 32, hipY - 62); c.lineTo(hipX + 80, hipY - 40 - kickU * 10); c.stroke();
    c.fillStyle = '#f2d2b6';
    c.beginPath(); c.arc(hipX - 74, hipY - 26 + kickU * 10, 8, 0, Math.PI * 2); c.arc(hipX + 84, hipY - 42 - kickU * 10, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d64541'; c.fillRect(hipX - 2, hipY - 60, 12, 30);
    c.fillStyle = '#f2d2b6'; c.beginPath(); c.arc(hipX + 4, hipY - 98, 25, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2b2522'; c.beginPath(); c.arc(hipX + 4, hipY - 104, 25, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    c.fillStyle = '#2b2522'; c.beginPath(); c.arc(hipX + 14, hipY - 98, 3, 0, Math.PI * 2); c.fill(); // looking at the jegi
    c.fillStyle = '#3a2f2a';
    c.beginPath(); c.ellipse(hipX - 28, FOOT_Y + 22, 24, 10, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(footX + 8, footY + 10, 24, 10, -0.2 * kickU, 0, Math.PI * 2); c.fill();
    // The jegi: a coin with a tassel streaming up behind it as it falls.
    const jx = cx + r.x * M, jy = FOOT_Y - Math.max(FLOOR, r.y) * M;
    const tail = Math.max(-1, Math.min(1, -r.vy / 2.4));
    c.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      c.strokeStyle = i % 2 ? '#ffffff' : '#e94b6a';
      c.beginPath(); c.moveTo(jx, jy);
      c.quadraticCurveTo(jx + i * 5 - r.vx * 10, jy - tail * 28, jx + i * 8 - r.vx * 18, jy - tail * 52 + Math.abs(i) * 3);
      c.stroke();
    }
    c.fillStyle = '#c9a23a'; c.beginPath(); c.ellipse(jx, jy, 11, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a5f1c'; c.fillRect(jx - 2.5, jy - 1.5, 5, 3);
    // The count, called out in Korean.
    c.textAlign = 'center';
    c.fillStyle = '#2c2a33'; c.font = '900 44px system-ui';
    c.fillText(String(r.kicks), 60, 62);
    if (g.pop) {
      const k = Math.min(1, (now - g.pop.at) / 0.9);
      c.globalAlpha = 1 - k * 0.6;
      c.fillStyle = '#d64541'; c.font = `900 ${40 + (1 - k) * 12}px system-ui`;
      c.fillText(g.pop.text, W - 120, 70 - k * 14);
      c.fillStyle = '#5a5560'; c.font = 'italic 16px system-ui';
      c.fillText(g.pop.sub, W - 120, 94 - k * 14);
      c.globalAlpha = 1;
    }
  }
}
