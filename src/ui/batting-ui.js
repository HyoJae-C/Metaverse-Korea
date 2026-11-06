// Batting cage panel (rules in core/arcade.js): pick a pitch speed, then
// swing when the ball reaches the plate. 10 pitches a round; it's free and
// you only chase your own best (home runs, then hits) at each speed.
// Loaded on first use (see openArcade in main.js).
import { PITCH_SPEEDS, PITCHES, flightTime, judgeSwing, hitDistance, battingTally, loadRecords, saveRecord } from '../core/arcade.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Batting cage', ko: '야구 연습장', ja: 'バッティングセンター', zh: '棒球击球场', es: 'Jaula de bateo', id: 'Tempat latihan memukul', vi: 'Lồng tập đánh bóng chày', hi: 'बैटिंग केज', ar: 'قفص الضرب' },
  howTo: {
    en: 'Pick a pitch speed. Press SWING (or Space) just as the ball reaches the plate. Perfect timing is a home run. Free to play: beat your own best.',
    ko: '공 속도를 고르세요. 공이 홈플레이트에 닿는 순간 스윙(또는 스페이스)을 누르면 돼요. 타이밍이 완벽하면 홈런! 무료이고, 내 최고 기록에 도전해요.',
    ja: '球速を選んで、ボールがホームベースに来た瞬間にスイング（またはスペース）。タイミングが完璧ならホームラン！無料で、自己ベストに挑戦。',
    zh: '选择球速，在球到达本垒板的瞬间按挥棒（或空格）。时机完美就是全垒打！免费，挑战自己的最好成绩。',
    es: 'Elige la velocidad. Pulsa BATEAR (o Espacio) justo cuando la bola llegue al plato. Con el tiempo perfecto, ¡jonrón! Gratis: supera tu récord.',
    id: 'Pilih kecepatan bola. Tekan AYUN (atau Spasi) tepat saat bola sampai di home plate. Waktu yang pas = home run! Gratis: kalahkan rekormu sendiri.',
    vi: 'Chọn tốc độ bóng. Nhấn VUNG GẬY (hoặc Space) đúng lúc bóng tới chốt nhà. Đúng thời điểm là home run! Miễn phí: phá kỷ lục của bạn.',
    hi: 'पिच की स्पीड चुनें। गेंद जैसे ही प्लेट पर पहुँचे, स्विंग (या Space) दबाएँ। सही टाइमिंग = होम रन! मुफ़्त है: अपना ही रिकॉर्ड तोड़ें।',
    ar: 'اختر سرعة الرمية. اضغط «اضرب» (أو المسافة) لحظة وصول الكرة إلى القاعدة. التوقيت المثالي = ضربة كاملة! مجاني: حطّم رقمك.',
  },
  speed: { en: '{n} km/h', ko: '{n}km/h', ja: '{n}km/h', zh: '{n}公里/时' },
  best: { en: 'Best: {hr} HR · {hits} hits', ko: '최고: 홈런 {hr} · 안타 {hits}', ja: 'ベスト：HR {hr}・ヒット {hits}', zh: '最佳：全垒打 {hr} · 安打 {hits}', es: 'Récord: {hr} HR · {hits} hits', id: 'Terbaik: {hr} HR · {hits} pukulan', vi: 'Tốt nhất: {hr} HR · {hits} cú đánh', hi: 'बेस्ट: {hr} HR · {hits} हिट', ar: 'الأفضل: {hr} HR · {hits} ضربات' },
  noBest: { en: 'No record yet', ko: '아직 기록 없음', ja: '記録なし', zh: '还没有记录', es: 'Sin récord', id: 'Belum ada rekor', vi: 'Chưa có kỷ lục', hi: 'अभी कोई रिकॉर्ड नहीं', ar: 'لا رقم بعد' },
  start: { en: 'Start · {n} pitches', ko: '시작 · 공 {n}개', ja: 'スタート・{n}球', zh: '开始 · {n}球', es: 'Empezar · {n} lanzamientos', id: 'Mulai · {n} lemparan', vi: 'Bắt đầu · {n} quả', hi: 'शुरू · {n} गेंदें', ar: 'ابدأ · {n} رميات' },
  swing: { en: 'SWING', ko: '스윙', ja: 'スイング', zh: '挥棒', es: 'BATEAR', id: 'AYUN', vi: 'VUNG GẬY', hi: 'स्विंग', ar: 'اضرب' },
  ready: { en: 'Pitch {i}/{n}… get ready', ko: '{i}/{n}구… 준비', ja: '{i}/{n}球目… 構えて', zh: '第{i}/{n}球… 准备', es: 'Lanzamiento {i}/{n}… atento', id: 'Lemparan {i}/{n}… siap', vi: 'Quả {i}/{n}… chuẩn bị', hi: 'गेंद {i}/{n}… तैयार', ar: 'الرمية {i}/{n}… استعد' },
  homerun: { en: 'HOME RUN! {m} m', ko: '홈런! {m}m', ja: 'ホームラン！{m}m', zh: '全垒打！{m}米', es: '¡JONRÓN! {m} m', id: 'HOME RUN! {m} m', vi: 'HOME RUN! {m} m', hi: 'होम रन! {m} मी', ar: 'ضربة كاملة! {m} م' },
  hit: { en: 'Hit! {m} m', ko: '안타! {m}m', ja: 'ヒット！{m}m', zh: '安打！{m}米', es: '¡Hit! {m} m', id: 'Kena! {m} m', vi: 'Trúng! {m} m', hi: 'हिट! {m} मी', ar: 'إصابة! {m} م' },
  foulEarly: { en: 'Foul: a bit early', ko: '파울: 조금 빨랐어요', ja: 'ファウル：少し早い', zh: '界外：早了一点', es: 'Foul: un poco pronto', id: 'Foul: agak cepat', vi: 'Bóng hỏng: hơi sớm', hi: 'फ़ाउल: थोड़ा जल्दी', ar: 'خطأ: مبكر قليلًا' },
  foulLate: { en: 'Foul: a bit late', ko: '파울: 조금 늦었어요', ja: 'ファウル：少し遅い', zh: '界外：晚了一点', es: 'Foul: un poco tarde', id: 'Foul: agak telat', vi: 'Bóng hỏng: hơi muộn', hi: 'फ़ाउल: थोड़ा देर से', ar: 'خطأ: متأخر قليلًا' },
  strike: { en: 'Strike!', ko: '스트라이크!', ja: 'ストライク！', zh: '好球！没打到', es: '¡Strike!', id: 'Strike!', vi: 'Strike!', hi: 'स्ट्राइक!', ar: 'ضربة فائتة!' },
  done: { en: '{hr} home runs · {hits} hits out of {n}', ko: '{n}구 중 홈런 {hr} · 안타 {hits}', ja: '{n}球中 HR {hr}・ヒット {hits}', zh: '{n}球中 全垒打 {hr} · 安打 {hits}', es: '{hr} jonrones · {hits} hits de {n}', id: '{hr} home run · {hits} pukulan dari {n}', vi: '{hr} home run · {hits} cú trúng / {n}', hi: '{n} में {hr} होम रन · {hits} हिट', ar: '{hr} ضربات كاملة · {hits} إصابات من {n}' },
  record: { en: '🏆 New best at {s}!', ko: '🏆 {s} 신기록!', ja: '🏆 {s} 自己ベスト更新！', zh: '🏆 {s} 新纪录！', es: '🏆 ¡Nuevo récord a {s}!', id: '🏆 Rekor baru di {s}!', vi: '🏆 Kỷ lục mới ở {s}!', hi: '🏆 {s} पर नया रिकॉर्ड!', ar: '🏆 رقم جديد عند {s}!' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', ar: 'مرة أخرى' },
  change: { en: 'Change speed', ko: '속도 바꾸기', ja: '球速を変える', zh: '换球速', es: 'Cambiar velocidad', id: 'Ganti kecepatan', vi: 'Đổi tốc độ', hi: 'स्पीड बदलें', ar: 'غيّر السرعة' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', ar: 'إغلاق' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const W = 600, H = 340, PLATE_Y = 300, MOUND_Y = 92;

export class BattingUI {
  // store: localStorage (records); onResult(kind) after each pitch;
  // rand for tests.
  constructor({ root, store, onResult, rand = Math.random }) {
    Object.assign(this, { root, store, onResult, rand });
    this.raf = 0;
    this.speed = PITCH_SPEEDS[1];
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter')) return;
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) this.swing();
    };
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey, true);
    this.game = null;
  }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '⚾ ' + tt('title')));
  }

  renderStart(note) {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('howTo')));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const rec = loadRecords(this.store).batting || {};
    const row = el('div', 'arcade-speeds');
    for (const s of PITCH_SPEEDS) {
      const b = el('button', 'chip arcade-speed');
      b.setAttribute('aria-pressed', String(s === this.speed));
      b.append(el('strong', null, tt('speed', { n: s })), el('small', null, rec[s] ? tt('best', rec[s]) : tt('noBest')));
      b.onclick = () => { this.speed = s; this.renderStart(); };
      row.append(b);
    }
    this.root.append(row);
    const go = el('button', 'primary', '⚾ ' + tt('start', { n: PITCHES }));
    go.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(actions);
  }

  play() {
    this._frame();
    const cv = el('canvas', 'arcade-canvas');
    cv.width = W; cv.height = H;
    const status = el('p', 'karaoke-status');
    const btn = el('button', 'primary karaoke-pad', '🏏 ' + tt('swing'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.swing(); };
    this.root.append(cv, status, btn);
    this.game = { cv, status, results: [], pitch: null, after: null };
    window.addEventListener('keydown', this.onKey, true);
    this.nextPitch();
    const loop = (now) => { this.draw(now / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  nextPitch() {
    const g = this.game;
    if (!g) return;
    if (g.results.length >= PITCHES) { this.finish(); return; }
    g.after = null;
    g.status.textContent = tt('ready', { i: g.results.length + 1, n: PITCHES });
    // The machine winds up for a slightly different time each pitch.
    const release = performance.now() / 1000 + 1.1 + this.rand() * 0.9;
    const kmh = this.speed + Math.round((this.rand() - 0.5) * 4);
    g.pitch = { release, arrive: release + flightTime(kmh), swungAt: null };
  }

  swing() {
    const g = this.game, p = g?.pitch;
    if (!p || p.swungAt != null) return;
    const now = performance.now() / 1000;
    if (now < p.release) return; // nothing thrown yet
    p.swungAt = now;
    this.resolve(judgeSwing(now - p.arrive), now - p.arrive);
  }

  resolve(kind, err) {
    const g = this.game;
    const now = performance.now() / 1000;
    g.results.push(kind);
    const m = hitDistance(kind, err, this.rand);
    const label = kind === 'foul' ? (err < 0 ? 'foulEarly' : 'foulLate') : kind;
    g.status.textContent = (kind === 'homerun' ? '🎉 ' : '') + tt(label, { m });
    g.after = { kind, err, at: now };
    this.onResult?.(kind);
    this.timer = setTimeout(() => this.nextPitch(), kind === 'homerun' ? 1700 : 1200);
  }

  finish() {
    const g = this.game;
    const tally = battingTally(g.results);
    const rec = saveRecord(this.store, 'batting', tally, this.speed) && tally.hits > 0;
    const note = tt('done', { ...tally, n: PITCHES }) + (rec ? '  ' + tt('record', { s: tt('speed', { n: this.speed }) }) : '');
    this._frame();
    this.root.append(el('p', 'order-hint claw-note', note));
    const again = el('button', 'primary', '⚾ ' + tt('again'));
    again.onclick = () => this.play();
    const change = el('button', null, tt('change'));
    change.onclick = () => this.renderStart();
    const actions = el('div', 'order-actions');
    actions.append(change, again);
    this.root.append(actions);
  }

  draw(now) {
    const g = this.game;
    if (!g) return;
    const c = g.cv.getContext('2d'), p = g.pitch;
    // The cage: turf, the net and the pitching machine at the far end.
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1f3a2c'); sky.addColorStop(1, '#2f7a4a');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1;
    for (let x = 0; x <= W; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(W / 2 + (x - W / 2) * 0.25, MOUND_Y); c.stroke(); }
    for (let y = 10; y < MOUND_Y; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = '#c7a26b';
    c.beginPath(); c.moveTo(W / 2 - 40, MOUND_Y); c.lineTo(W / 2 + 40, MOUND_Y); c.lineTo(W / 2 + 150, H); c.lineTo(W / 2 - 150, H); c.closePath(); c.fill();
    c.fillStyle = '#3a3f47'; c.fillRect(W / 2 - 16, MOUND_Y - 30, 32, 26); // machine
    c.fillStyle = '#9ca9af'; c.beginPath(); c.arc(W / 2, MOUND_Y - 17, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 14px system-ui'; c.textAlign = 'center';
    c.fillText(tt('speed', { n: this.speed }), W / 2, MOUND_Y - 38);
    // Home plate and the strike zone.
    c.fillStyle = '#f7f4ee';
    c.beginPath(); c.moveTo(W / 2 - 34, PLATE_Y + 8); c.lineTo(W / 2 + 34, PLATE_Y + 8); c.lineTo(W / 2 + 34, PLATE_Y + 20); c.lineTo(W / 2, PLATE_Y + 34); c.lineTo(W / 2 - 34, PLATE_Y + 20); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.setLineDash([6, 6]); c.lineWidth = 2;
    c.strokeRect(W / 2 - 40, PLATE_Y - 46, 80, 52); c.setLineDash([]);
    // The ball: small at the machine, big at the plate (seen from the batter).
    let bat = 0; // swing progress 0..1
    if (p && now >= p.release) {
      const after = g.after;
      if (!after) {
        const u = (now - p.release) / (p.arrive - p.release);
        if (u > 1.35) { this.resolve('strike', Infinity); return; } // watched it go by
        if (g.status.dataset.p !== String(g.results.length)) { g.status.dataset.p = String(g.results.length); g.status.textContent = '⚾ ' + tt('swing') + '!'; }
        this.ball(c, u);
      } else if (after.kind === 'strike' || after.kind === 'foul') {
        const u = Math.min(1.3, (now - p.release) / (p.arrive - p.release));
        if (after.kind === 'strike') this.ball(c, u);
        else { // a foul: off to the side
          const k = Math.min(1, (now - after.at) / 0.6), side = after.err < 0 ? -1 : 1;
          this.dot(c, W / 2 + side * k * 320, PLATE_Y - 20 - k * 120, 16 - k * 8);
        }
      } else { // a hit: up and away; a home run goes over the net
        const k = Math.min(1, (now - after.at) / 1.1), hr = after.kind === 'homerun';
        const y = PLATE_Y - 20 - (hr ? 290 : 200) * Math.sin(k * Math.PI * (hr ? 0.5 : 0.75));
        this.dot(c, W / 2 + (after.err * 1200) * k, y, Math.max(2, 16 * (1 - k * 0.85)));
        if (hr && k > 0.6) { c.fillStyle = '#ffd36e'; c.font = '900 40px system-ui'; c.fillText('HOME RUN!', W / 2, 60); }
      }
      if (p.swungAt != null) bat = Math.min(1, (now - p.swungAt) / 0.16);
    }
    // The bat: from behind your right shoulder across the plate.
    const a = 0.35 - bat * 1.95; // upright, then level across the plate
    c.save(); c.translate(W / 2 + 110, PLATE_Y + 10); c.rotate(a);
    c.fillStyle = '#c98b4f'; c.fillRect(-6, -150, 12, 150);
    c.fillStyle = '#2b2b2e'; c.fillRect(-5, -22, 10, 22);
    c.restore();
    // Results so far.
    c.font = '18px system-ui'; c.textAlign = 'left';
    c.fillText(g.results.map((r) => (r === 'homerun' ? '💥' : r === 'hit' ? '⚾' : r === 'foul' ? '〰️' : '❌')).join(''), 10, 24);
  }
  ball(c, u) {
    const d = Math.max(-2, (1 - u) * 18.44), s = 2.2 / (2.2 + Math.max(0, d));
    const y = PLATE_Y - 20 - (PLATE_Y - 20 - MOUND_Y + 10) * (1 - s) + (u > 1 ? (u - 1) * 120 : 0);
    this.dot(c, W / 2, y, 3 + 15 * s);
  }
  dot(c, x, y, r) {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d9473c'; c.lineWidth = Math.max(1, r / 7);
    c.beginPath(); c.arc(x - r * 0.9, y, r * 0.75, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(x + r * 0.9, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
  }
}
