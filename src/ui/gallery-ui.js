// Shooting gallery panel in Another Land (rules in core/arcade.js): a toy
// cork gun and three rows of sliding balloons, ducks and stars. Tap a target
// to pop it. Free to play: chase your own best score.
// Loaded on first use (see openArcade in main.js).
import { Gallery, GALLERY_SHOTS, GALLERY_SECONDS, GALLERY_ROWS, TARGETS, loadRecords, saveRecord } from '../core/arcade.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Balloon shooting gallery', ko: '풍선 사격', ja: '風船射的', zh: '气球射击', es: 'Tiro al globo', id: 'Tembak balon', vi: 'Bắn bóng bay', hi: 'गुब्बारा निशानेबाज़ी', ar: 'رماية البالونات' },
  howTo: {
    en: 'A toy cork gun: tap the targets to pop them. 🎈 10 · 🦆 20 · ⭐ 50 points. {n} corks, {s} seconds. Free to play.',
    ko: '장난감 코르크 총이에요. 과녁을 탭해서 맞혀요. 🎈 10 · 🦆 20 · ⭐ 50점. 코르크 {n}발, {s}초. 무료예요.',
    ja: 'おもちゃのコルク銃です。的をタップして当てよう。🎈10・🦆20・⭐50点。コルク{n}発、{s}秒。無料。',
    zh: '玩具软木塞枪：点击靶子打中它。🎈10 · 🦆20 · ⭐50分。{n}发，{s}秒。免费。',
    es: 'Una escopeta de corcho de juguete: toca los blancos. 🎈 10 · 🦆 20 · ⭐ 50 puntos. {n} corchos, {s} segundos. Gratis.',
    id: 'Pistol gabus mainan: ketuk target untuk menembaknya. 🎈 10 · 🦆 20 · ⭐ 50 poin. {n} gabus, {s} detik. Gratis.',
    vi: 'Súng nút bần đồ chơi: chạm vào mục tiêu để bắn. 🎈 10 · 🦆 20 · ⭐ 50 điểm. {n} viên, {s} giây. Miễn phí.',
    hi: 'खिलौना कॉर्क गन: निशानों पर टैप करें। 🎈 10 · 🦆 20 · ⭐ 50 अंक। {n} कॉर्क, {s} सेकंड। मुफ़्त।',
    ar: 'بندقية فلين لعبة: انقر على الأهداف لإصابتها. 🎈 10 · 🦆 20 · ⭐ 50 نقطة. {n} طلقات، {s} ثانية. مجاني.',
  },
  best: { en: 'Your best: {n}', ko: '내 최고 점수: {n}', ja: '自己ベスト：{n}', zh: '我的最高分：{n}', es: 'Tu récord: {n}', id: 'Skor terbaikmu: {n}', vi: 'Điểm cao nhất: {n}', hi: 'आपका बेस्ट: {n}', ar: 'أفضل نتيجة لك: {n}' },
  start: { en: 'Start', ko: '시작', ja: 'スタート', zh: '开始', es: 'Empezar', id: 'Mulai', vi: 'Bắt đầu', hi: 'शुरू', ar: 'ابدأ' },
  hud: { en: 'Score {p} · corks {n} · {s} s', ko: '점수 {p} · 코르크 {n} · {s}초', ja: '得点 {p}・残り {n}発・{s}秒', zh: '得分 {p} · 剩 {n} 发 · {s}秒', es: 'Puntos {p} · corchos {n} · {s} s', id: 'Skor {p} · gabus {n} · {s} dtk', vi: 'Điểm {p} · còn {n} viên · {s} giây', hi: 'स्कोर {p} · कॉर्क {n} · {s} से', ar: 'النقاط {p} · الطلقات {n} · {s} ث' },
  done: { en: '{p} points · {h} hits out of {n}', ko: '{p}점 · {n}발 중 {h}발 명중', ja: '{p}点・{n}発中{h}発命中', zh: '{p}分 · {n}发中{h}发', es: '{p} puntos · {h} aciertos de {n}', id: '{p} poin · {h} kena dari {n}', vi: '{p} điểm · trúng {h}/{n}', hi: '{p} अंक · {n} में {h} निशाने', ar: '{p} نقطة · {h} إصابات من {n}' },
  record: { en: '🏆 New best!', ko: '🏆 신기록!', ja: '🏆 自己ベスト更新！', zh: '🏆 新纪录！', es: '🏆 ¡Nuevo récord!', id: '🏆 Rekor baru!', vi: '🏆 Kỷ lục mới!', hi: '🏆 नया रिकॉर्ड!', ar: '🏆 رقم جديد!' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', ar: 'مرة أخرى' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', ar: 'إغلاق' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const W = 600, H = 360;
const COLORS = ['#ff5a5f', '#ffd36e', '#8fd0ff', '#c9a8ff', '#8fe3c7'];

export class GalleryUI {
  // store: localStorage (records); onPop(kind) on each hit.
  constructor({ root, store, onPop }) {
    Object.assign(this, { root, store, onPop });
    this.raf = 0;
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.game = null; }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎯 ' + tt('title')));
  }

  renderStart(note) {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('howTo', { n: GALLERY_SHOTS, s: GALLERY_SECONDS })));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = loadRecords(this.store).gallery;
    if (best) this.root.append(el('p', 'order-hint', tt('best', { n: best })));
    const go = el('button', 'primary', '🎯 ' + (note ? tt('again') : tt('start')));
    go.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  play() {
    this._frame();
    const cv = el('canvas', 'arcade-canvas gallery-canvas');
    cv.width = W; cv.height = H;
    const status = el('p', 'karaoke-status');
    this.root.append(cv, status);
    const g = { cv, status, gal: new Gallery(), t0: performance.now() / 1000, pops: [], shots: [] };
    this.game = g;
    cv.onpointerdown = (e) => {
      e.preventDefault();
      if (this.game !== g) return;
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const t = performance.now() / 1000 - g.t0;
      g.shots.push({ x, y, t });
      const hit = g.gal.shoot(x, y, t, W / H);
      if (hit) { g.pops.push({ ...g.gal.at(hit, t), t, kind: hit.kind }); this.onPop?.(hit.kind); }
    };
    const loop = (now) => {
      if (this.game !== g) return;
      const t = now / 1000 - g.t0;
      const left = Math.max(0, GALLERY_SECONDS - t);
      g.status.textContent = tt('hud', { p: g.gal.score, n: g.gal.shots, s: Math.ceil(left) });
      this.draw(g, t);
      if (left <= 0 || (g.gal.shots <= 0 && t - (g.shots.at(-1)?.t ?? 0) > 0.6)) { this.finish(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  finish() {
    const gal = this.game.gal;
    const rec = saveRecord(this.store, 'gallery', gal.score) && gal.score > 0;
    this.renderStart(tt('done', { p: gal.score, h: gal.hits, n: GALLERY_SHOTS }) + (rec ? '  ' + tt('record') : ''));
  }

  draw(g, t) {
    const c = g.cv.getContext('2d');
    // The booth: striped back wall and a shelf under each row.
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#fff3d6' : '#ffd0e0'; c.fillRect((i * W) / 12, 0, W / 12 + 1, H); }
    c.fillStyle = '#ff7a8a';
    for (let i = 0; i < 15; i++) { c.beginPath(); c.arc((i + 0.5) * (W / 15), 0, W / 30, 0, Math.PI); c.fill(); } // awning
    for (const row of GALLERY_ROWS) { c.fillStyle = '#b8743f'; c.fillRect(0, row.y * H + 26, W, 8); }
    for (const tg of g.gal.targets) {
      if (!g.gal.visible(tg, t)) continue;
      const p = g.gal.at(tg, t), r = TARGETS[tg.kind].r * H;
      for (const dx of [0, -W, W]) this.target(c, tg, p.x * W + dx, p.y * H, r);
    }
    // Pops and cork marks.
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const pop of g.pops) {
      const k = (t - pop.t) / 0.5;
      if (k > 1) continue;
      c.globalAlpha = 1 - k;
      c.font = `900 ${18 + k * 14}px system-ui`;
      c.fillStyle = '#e2457a';
      c.fillText('+' + TARGETS[pop.kind].points, pop.x * W, pop.y * H - k * 30);
      c.globalAlpha = 1;
    }
    for (const s of g.shots) {
      const k = (t - s.t) / 0.4;
      if (k > 1) continue;
      c.strokeStyle = `rgba(43,43,46,${1 - k})`; c.lineWidth = 3;
      c.beginPath(); c.arc(s.x * W, s.y * H, 6 + k * 14, 0, Math.PI * 2); c.stroke();
    }
  }
  target(c, tg, x, y, r) {
    if (tg.kind === 'balloon') {
      c.strokeStyle = '#6b6478'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y + r); c.lineTo(x, y + r + 22); c.stroke();
      c.fillStyle = COLORS[Math.round(tg.off * 10) % COLORS.length];
      c.beginPath(); c.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.35, r * 0.18, r * 0.28, -0.5, 0, Math.PI * 2); c.fill();
    } else if (tg.kind === 'duck') {
      const dir = GALLERY_ROWS[tg.row].speed > 0 ? 1 : -1;
      c.fillStyle = '#ffd34d';
      c.beginPath(); c.ellipse(x, y + r * 0.25, r * 1.1, r * 0.7, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + dir * r * 0.7, y - r * 0.45, r * 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2913a'; c.beginPath(); c.moveTo(x + dir * r * 1.1, y - r * 0.5); c.lineTo(x + dir * r * 1.5, y - r * 0.35); c.lineTo(x + dir * r * 1.1, y - r * 0.25); c.fill();
      c.fillStyle = '#2b2b2e'; c.beginPath(); c.arc(x + dir * r * 0.85, y - r * 0.55, r * 0.09, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = '#ffc93a'; c.strokeStyle = '#e2457a'; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.5 : r * 1.15;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath(); c.fill(); c.stroke();
    }
  }
}
