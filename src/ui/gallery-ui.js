// Shooting gallery panel in Another Land (rules in core/arcade.js): a toy
// cork gun and three rows of sliding balloons, ducks and stars. Tap a target
// to pop it. Free to play: chase your own best score.
// The haunted house's ghost lantern is the same game in another theme
// (HAUNT_THEME): same rules, its own look, words and record.
// Loaded on first use (see openArcade in main.js).
import { Gallery, GALLERY_SHOTS, GALLERY_SECONDS, GALLERY_ROWS, TARGETS, loadRecords, saveRecord } from '../core/arcade.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Balloon shooting gallery', ko: '풍선 사격', ja: '風船射的', zh: '气球射击', es: 'Tiro al globo', id: 'Tembak balon', vi: 'Bắn bóng bay', hi: 'गुब्बारा निशानेबाज़ी', fr: 'Stand de tir aux ballons', th: 'ซุ้มยิงลูกโป่ง', ar: 'رماية البالونات' },
  howTo: {
    en: 'A toy cork gun: tap the targets to pop them. 🎈 10 · 🦆 20 · ⭐ 50 points. {n} corks, {s} seconds. Free to play.',
    ko: '장난감 코르크 총이에요. 과녁을 탭해서 맞혀요. 🎈 10 · 🦆 20 · ⭐ 50점. 코르크 {n}발, {s}초. 무료예요.',
    ja: 'おもちゃのコルク銃です。的をタップして当てよう。🎈10・🦆20・⭐50点。コルク{n}発、{s}秒。無料。',
    zh: '玩具软木塞枪：点击靶子打中它。🎈10 · 🦆20 · ⭐50分。{n}发，{s}秒。免费。',
    es: 'Una escopeta de corcho de juguete: toca los blancos. 🎈 10 · 🦆 20 · ⭐ 50 puntos. {n} corchos, {s} segundos. Gratis.',
    id: 'Pistol gabus mainan: ketuk target untuk menembaknya. 🎈 10 · 🦆 20 · ⭐ 50 poin. {n} gabus, {s} detik. Gratis.',
    vi: 'Súng nút bần đồ chơi: chạm vào mục tiêu để bắn. 🎈 10 · 🦆 20 · ⭐ 50 điểm. {n} viên, {s} giây. Miễn phí.',
    hi: 'खिलौना कॉर्क गन: निशानों पर टैप करें। 🎈 10 · 🦆 20 · ⭐ 50 अंक। {n} कॉर्क, {s} सेकंड। मुफ़्त।',
    fr: 'Un pistolet à bouchon : touche les cibles pour les faire éclater. 🎈 10 · 🦆 20 · ⭐ 50 points. {n} bouchons, {s} secondes. Gratuit.',
    th: 'ปืนจุกก๊อกของเล่น แตะเป้าเพื่อยิงให้แตก 🎈 10 · 🦆 20 · ⭐ 50 คะแนน มี {n} นัด {s} วินาที เล่นฟรี',
    ar: 'بندقية فلين لعبة: انقر على الأهداف لإصابتها. 🎈 10 · 🦆 20 · ⭐ 50 نقطة. {n} طلقات، {s} ثانية. مجاني.',
  },
  best: { en: 'Your best: {n}', ko: '내 최고 점수: {n}', ja: '自己ベスト：{n}', zh: '我的最高分：{n}', es: 'Tu récord: {n}', id: 'Skor terbaikmu: {n}', vi: 'Điểm cao nhất: {n}', hi: 'आपका बेस्ट: {n}', fr: 'Ton record : {n}', th: 'สถิติดีที่สุด: {n}', ar: 'أفضل نتيجة لك: {n}' },
  start: { en: 'Start', ko: '시작', ja: 'スタート', zh: '开始', es: 'Empezar', id: 'Mulai', vi: 'Bắt đầu', hi: 'शुरू', fr: 'Commencer', th: 'เริ่ม', ar: 'ابدأ' },
  hud: { en: 'Score {p} · corks {n} · {s} s', ko: '점수 {p} · 코르크 {n} · {s}초', ja: '得点 {p}・残り {n}発・{s}秒', zh: '得分 {p} · 剩 {n} 发 · {s}秒', es: 'Puntos {p} · corchos {n} · {s} s', id: 'Skor {p} · gabus {n} · {s} dtk', vi: 'Điểm {p} · còn {n} viên · {s} giây', hi: 'स्कोर {p} · कॉर्क {n} · {s} से', fr: 'Score {p} · bouchons {n} · {s} s', th: 'คะแนน {p} · กระสุน {n} · {s} วิ', ar: 'النقاط {p} · الطلقات {n} · {s} ث' },
  done: { en: '{p} points · {h} hits out of {n}', ko: '{p}점 · {n}발 중 {h}발 명중', ja: '{p}点・{n}発中{h}発命中', zh: '{p}分 · {n}发中{h}发', es: '{p} puntos · {h} aciertos de {n}', id: '{p} poin · {h} kena dari {n}', vi: '{p} điểm · trúng {h}/{n}', hi: '{p} अंक · {n} में {h} निशाने', fr: '{p} points · {h} touchés sur {n}', th: '{p} คะแนน · ยิงโดน {h} จาก {n}', ar: '{p} نقطة · {h} إصابات من {n}' },
  record: { en: '🏆 New best!', ko: '🏆 신기록!', ja: '🏆 自己ベスト更新！', zh: '🏆 新纪录！', es: '🏆 ¡Nuevo récord!', id: '🏆 Rekor baru!', vi: '🏆 Kỷ lục mới!', hi: '🏆 नया रिकॉर्ड!', fr: '🏆 Nouveau record !', th: '🏆 สถิติใหม่!', ar: '🏆 رقم جديد!' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', fr: 'Rejouer', th: 'อีกครั้ง', ar: 'مرة أخرى' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', fr: 'Fermer', th: 'ปิด', ar: 'إغلاق' },
};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const W = 600, H = 360;
const COLORS = ['#ff5a5f', '#ffd36e', '#8fd0ff', '#c9a8ff', '#8fe3c7'];

export class GalleryUI {
  // store: localStorage (records); onPop(kind) on each hit; theme: another
  // look for the same game (default: the balloon booth).
  constructor({ root, store, onPop, theme = BALLOON_THEME }) {
    Object.assign(this, { root, store, onPop, theme });
    this.raf = 0;
  }
  tt(k, v) { return fmt(L(this.theme.text?.[k] || T[k]), v); }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.game = null; }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', this.tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, this.theme.icon + ' ' + this.tt('title')));
  }

  renderStart(note) {
    this._frame();
    this.root.append(el('p', 'order-hint', this.tt('howTo', { n: GALLERY_SHOTS, s: GALLERY_SECONDS })));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = loadRecords(this.store)[this.theme.record];
    if (best) this.root.append(el('p', 'order-hint', this.tt('best', { n: best })));
    const go = el('button', 'primary', this.theme.icon + ' ' + (note ? this.tt('again') : this.tt('start')));
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
    const g = { cv, status, gal: new Gallery(), t0: performance.now() / 1000, pops: [], shots: [], light: { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 } };
    this.game = g;
    const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.onpointermove = (e) => { if (this.game === g && e.pointerType === 'mouse') [g.light.tx, g.light.ty] = toCanvas(e); }; // the lantern follows the mouse…
    cv.onpointerdown = (e) => {
      e.preventDefault();
      if (this.game !== g) return;
      const [x, y] = toCanvas(e);
      [g.light.tx, g.light.ty] = [x, y]; // …or your last tap
      const t = performance.now() / 1000 - g.t0;
      if (t > GALLERY_SECONDS) return; // too late
      g.shots.push({ x, y, t });
      const hit = g.gal.shoot(x, y, t, W / H);
      if (hit) { g.pops.push({ ...g.gal.at(hit, t), t, kind: hit.kind }); this.onPop?.(hit.kind); }
    };
    const loop = (now) => {
      if (this.game !== g) return;
      const t = now / 1000 - g.t0;
      const left = Math.max(0, GALLERY_SECONDS - t);
      g.status.textContent = this.tt('hud', { p: g.gal.score, n: g.gal.shots, s: Math.ceil(left) });
      this.draw(g, t);
      if (left <= 0 || (g.gal.shots <= 0 && t - (g.shots.at(-1)?.t ?? 0) > 0.6)) { this.finish(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  finish() {
    const gal = this.game.gal;
    const rec = saveRecord(this.store, this.theme.record, gal.score) && gal.score > 0;
    this.renderStart(this.tt('done', { p: gal.score, h: gal.hits, n: GALLERY_SHOTS }) + (rec ? '  ' + this.tt('record') : ''));
  }

  draw(g, t) {
    const c = g.cv.getContext('2d');
    this.theme.back(c);
    for (const tg of g.gal.targets) {
      if (!g.gal.visible(tg, t)) continue;
      const p = g.gal.at(tg, t), r = TARGETS[tg.kind].r * H;
      for (const dx of [0, -W, W]) this.theme.target(c, tg, p.x * W + dx, p.y * H, r, t);
    }
    if (this.theme.lantern) { // darkness everywhere but round the lantern
      const L0 = g.light, k = 0.18;
      L0.x += (L0.tx - L0.x) * k; L0.y += (L0.ty - L0.y) * k;
      const lx = L0.x * W, ly = L0.y * H;
      const grad = c.createRadialGradient(lx, ly, 40, lx, ly, 170);
      grad.addColorStop(0, 'rgba(12,8,24,0)');
      grad.addColorStop(1, 'rgba(12,8,24,0.74)');
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,213,160,0.10)';
      c.beginPath(); c.arc(lx, ly, 60, 0, Math.PI * 2); c.fill();
    }
    // Pops and cork marks.
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const pop of g.pops) {
      const k = (t - pop.t) / 0.5;
      if (k > 1) continue;
      c.globalAlpha = 1 - k;
      c.font = `900 ${18 + k * 14}px system-ui`;
      c.fillStyle = this.theme.popColor;
      c.fillText('+' + TARGETS[pop.kind].points, pop.x * W, pop.y * H - k * 30);
      c.globalAlpha = 1;
    }
    for (const s of g.shots) {
      const k = (t - s.t) / 0.4;
      if (k > 1) continue;
      c.strokeStyle = this.theme.lantern ? `rgba(255,213,160,${1 - k})` : `rgba(43,43,46,${1 - k})`; c.lineWidth = 3;
      c.beginPath(); c.arc(s.x * W, s.y * H, 6 + k * 14, 0, Math.PI * 2); c.stroke();
    }
  }
}

// The balloon booth: striped back wall, a shelf under each row; balloons,
// ducks and stars.
function balloonTarget(c, tg, x, y, r) {
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
export const BALLOON_THEME = {
  icon: '🎯', record: 'gallery', popColor: '#e2457a', lantern: false,
  back(c) {
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#fff3d6' : '#ffd0e0'; c.fillRect((i * W) / 12, 0, W / 12 + 1, H); }
    c.fillStyle = '#ff7a8a';
    for (let i = 0; i < 15; i++) { c.beginPath(); c.arc((i + 0.5) * (W / 15), 0, W / 30, 0, Math.PI); c.fill(); } // awning
    for (const row of GALLERY_ROWS) { c.fillStyle = '#b8743f'; c.fillRect(0, row.y * H + 26, W, 8); }
  },
  target: balloonTarget,
};

// ── The haunted house's ghost lantern ───────────────────────────────────
// Same rows, speeds, sizes and points; a dark wallpapered room lit by your
// lantern. Big ghosts 10, bats 20, little cursed stars 50. Each shape fills
// the same hit circle as the target it replaces.
const HT = {
  title: { en: 'Ghost lantern', ko: '유령 랜턴', ja: 'おばけランタン', zh: '幽灵灯笼', es: 'Farol de fantasmas', id: 'Lentera hantu', vi: 'Đèn lồng ma', hi: 'भूत लालटेन', fr: 'Lanterne à fantômes', th: 'โคมไฟล่าผี', ar: 'فانوس الأشباح' },
  howTo: {
    en: 'Tap the ghosts your lantern finds! Your lantern shines where you last tapped. 👻 10 · 🦇 20 · ✴️ 50 points. {n} taps, {s} seconds. Free to play.',
    ko: '랜턴에 나타나는 유령을 탭해요! 랜턴은 마지막으로 탭한 곳을 비춰요. 👻 10 · 🦇 20 · ✴️ 50점. {n}번 탭, {s}초. 무료예요.',
    ja: 'ランタンに現れるおばけをタップ！ランタンは最後にタップした所を照らします。👻10・🦇20・✴️50点。{n}回、{s}秒。無料。',
    zh: '点击灯笼照到的幽灵！灯笼会照亮你最后点击的地方。👻10 · 🦇20 · ✴️50分。{n}次，{s}秒。免费。',
    es: '¡Toca los fantasmas que encuentre tu farol! El farol alumbra donde tocaste por última vez. 👻 10 · 🦇 20 · ✴️ 50 puntos. {n} toques, {s} segundos. Gratis.',
    id: 'Ketuk hantu yang ditemukan lenteramu! Lentera menyinari tempat ketukan terakhirmu. 👻 10 · 🦇 20 · ✴️ 50 poin. {n} ketukan, {s} detik. Gratis.',
    vi: 'Chạm vào bóng ma mà đèn lồng tìm thấy! Đèn lồng chiếu sáng chỗ bạn chạm lần cuối. 👻 10 · 🦇 20 · ✴️ 50 điểm. {n} lần chạm, {s} giây. Miễn phí.',
    hi: 'लालटेन में दिखे भूतों पर टैप करें! लालटेन वहाँ चमकती है जहाँ आपने आख़िरी बार टैप किया। 👻 10 · 🦇 20 · ✴️ 50 अंक। {n} टैप, {s} सेकंड। मुफ़्त।',
    fr: 'Touche les fantômes que ta lanterne trouve ! Ta lanterne éclaire là où tu as touché en dernier. 👻 10 · 🦇 20 · ✴️ 50 points. {n} touches, {s} secondes. Gratuit.',
    th: 'แตะผีที่โคมไฟส่องเจอ! โคมจะส่องตรงจุดที่คุณแตะล่าสุด 👻 10 · 🦇 20 · ✴️ 50 คะแนน แตะได้ {n} ครั้ง {s} วินาที เล่นฟรี',
    ar: 'انقر على الأشباح التي يجدها فانوسك! يضيء الفانوس حيث نقرت آخر مرة. 👻 10 · 🦇 20 · ✴️ 50 نقطة. {n} نقرات، {s} ثانية. مجاني.',
  },
  hud: { en: 'Score {p} · taps {n} · {s} s', ko: '점수 {p} · 남은 탭 {n} · {s}초', ja: '得点 {p}・残り {n}回・{s}秒', zh: '得分 {p} · 剩 {n} 次 · {s}秒', es: 'Puntos {p} · toques {n} · {s} s', id: 'Skor {p} · ketukan {n} · {s} dtk', vi: 'Điểm {p} · còn {n} lần · {s} giây', hi: 'स्कोर {p} · टैप {n} · {s} से', fr: 'Score {p} · touches {n} · {s} s', th: 'คะแนน {p} · แตะ {n} · {s} วิ', ar: 'النقاط {p} · النقرات {n} · {s} ث' },
  done: { en: '{p} points · {h} ghosts caught out of {n} taps', ko: '{p}점 · {n}번 중 {h}번 명중', ja: '{p}点・{n}回中{h}回命中', zh: '{p}分 · {n}次中{h}次', es: '{p} puntos · {h} aciertos de {n}', id: '{p} poin · {h} kena dari {n}', vi: '{p} điểm · trúng {h}/{n}', hi: '{p} अंक · {n} में {h} निशाने', fr: '{p} points · {h} fantômes attrapés en {n} touches', th: '{p} คะแนน · จับผีได้ {h} ตัวจาก {n} ครั้ง', ar: '{p} نقطة · {h} إصابات من {n}' },
};
function hauntTarget(c, tg, x, y, r, t) {
  if (tg.kind === 'balloon') { // a big friendly ghost, bobbing
    const b = Math.sin(t * 3 + tg.off * 9) * r * 0.12;
    y += b;
    c.fillStyle = '#fff6e6';
    c.beginPath();
    c.arc(x, y - r * 0.15, r * 0.85, Math.PI, 0);
    c.lineTo(x + r * 0.85, y + r * 0.85);
    for (let i = 0; i < 4; i++) c.quadraticCurveTo(x + r * (0.64 - i * 0.425), y + r * (i % 2 ? 0.7 : 1.1), x + r * (0.425 - i * 0.425), y + r * 0.85);
    c.closePath(); c.fill();
    c.fillStyle = '#2b1d40';
    c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.15, r * 0.12, r * 0.18, 0, 0, Math.PI * 2); c.ellipse(x + r * 0.3, y - r * 0.15, r * 0.12, r * 0.18, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,143,184,0.6)';
    c.beginPath(); c.arc(x - r * 0.52, y + r * 0.12, r * 0.12, 0, Math.PI * 2); c.arc(x + r * 0.52, y + r * 0.12, r * 0.12, 0, Math.PI * 2); c.fill();
  } else if (tg.kind === 'duck') { // a little purple bat, flapping
    const f = Math.sin(t * 14 + tg.off * 20) * 0.5;
    c.fillStyle = '#7a52b3';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + s * r * 1.2, y - r * (0.5 + f));
      c.lineTo(x + s * r * 1.0, y + r * 0.25);
      c.lineTo(x + s * r * 0.65, y + r * 0.05);
      c.closePath(); c.fill();
    }
    c.beginPath(); c.arc(x, y, r * 0.7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.4); c.lineTo(x - r * 0.3, y - r * 1.05); c.lineTo(x - r * 0.05, y - r * 0.5); c.moveTo(x + r * 0.5, y - r * 0.4); c.lineTo(x + r * 0.3, y - r * 1.05); c.lineTo(x + r * 0.05, y - r * 0.5); c.fill();
    c.fillStyle = '#ffe27a';
    c.beginPath(); c.arc(x - r * 0.25, y - r * 0.1, r * 0.14, 0, Math.PI * 2); c.arc(x + r * 0.25, y - r * 0.1, r * 0.14, 0, Math.PI * 2); c.fill();
  } else { // a small cursed star: green-glowing, spinning
    c.save();
    c.translate(x, y); c.rotate(t * 2.5 + tg.off * 6);
    c.fillStyle = '#9dff8a'; c.strokeStyle = '#2e7d4f'; c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.5 : r * 1.15;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath(); c.fill(); c.stroke();
    c.restore();
    c.fillStyle = '#2b1d40';
    c.beginPath(); c.arc(x - r * 0.2, y - r * 0.05, r * 0.1, 0, Math.PI * 2); c.arc(x + r * 0.2, y - r * 0.05, r * 0.1, 0, Math.PI * 2); c.fill();
  }
}
export const HAUNT_THEME = {
  icon: '🏮', record: 'hauntGallery', popColor: '#ffd5a0', lantern: true, text: HT,
  back(c) {
    // Old wallpaper with faint stripes, a dusty shelf under each row.
    c.fillStyle = '#2b1d40'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) if (i % 2) { c.fillStyle = '#33244c'; c.fillRect((i * W) / 12, 0, W / 12, H); }
    c.fillStyle = '#4a2f5c';
    for (let i = 0; i < 15; i++) { c.beginPath(); c.arc((i + 0.5) * (W / 15), 0, W / 30, 0, Math.PI); c.fill(); } // ragged curtain
    for (const row of GALLERY_ROWS) { c.fillStyle = '#5a3f2e'; c.fillRect(0, row.y * H + 26, W, 8); }
  },
  target: hauntTarget,
};
