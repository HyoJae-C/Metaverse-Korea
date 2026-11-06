// Darts at the bar (rules in core/arcade.js): the aim sways over the board;
// tap THROW at the right moment. 5 rounds of 3 darts. Play alone, or
// challenge someone in the same bar: you both throw at the same time and
// see each other's running total. No drinks or coins needed.
// Loaded on first use (see openArcade in main.js).
import { DART_ROUNDS, DARTS_PER_ROUND, BOARD_ORDER, RING, dartScore, dartAim, dartLand, loadRecords, saveRecord } from '../core/arcade.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Darts', ko: '다트', ja: 'ダーツ', zh: '飞镖', es: 'Dardos', id: 'Dart', vi: 'Phi tiêu', hi: 'डार्ट्स', ar: 'رمي السهام' },
  howTo: {
    en: 'The aim sways over the board: press THROW (or Space) when it is where you want it. 5 rounds of 3 darts. Bull 50, the thin rings count double and triple.',
    ko: '조준점이 보드 위에서 흔들려요. 원하는 곳에 왔을 때 던지기(또는 스페이스)를 누르세요. 3발씩 5라운드. 정중앙 불은 50점, 얇은 링은 2배·3배예요.',
    ja: '狙いがボードの上で揺れます。狙った所で「投げる」（またはスペース）。3投×5ラウンド。ブル50点、細いリングは2倍・3倍。',
    zh: '准星会在靶上晃动，到想要的位置时按“投掷”（或空格）。每轮3镖，共5轮。靶心50分，细环是双倍和三倍。',
    es: 'La mira se mueve sobre la diana: pulsa LANZAR (o Espacio) cuando esté donde quieras. 5 rondas de 3 dardos. Diana 50; los anillos finos valen doble y triple.',
    id: 'Bidikan bergoyang di papan: tekan LEMPAR (atau Spasi) saat pas di tempat yang kamu mau. 5 ronde, 3 dart. Bull 50, cincin tipis bernilai ganda dan tiga kali.',
    vi: 'Tâm ngắm lắc lư trên bảng: nhấn NÉM (hoặc Space) khi nó ở đúng chỗ. 5 lượt, mỗi lượt 3 phi tiêu. Hồng tâm 50, vòng mảnh tính gấp đôi và gấp ba.',
    hi: 'निशाना बोर्ड पर हिलता है: जहाँ चाहें वहाँ आए तो फेंकें (या Space) दबाएँ। 3 डार्ट के 5 राउंड। बुल 50, पतली रिंग डबल और ट्रिपल।',
    ar: 'التصويب يتمايل فوق اللوحة: اضغط «ارمِ» (أو المسافة) عندما يكون في المكان الذي تريده. 5 جولات من 3 سهام. المركز 50، والحلقات الرفيعة مضاعفة وثلاثية.',
  },
  best: { en: 'Your best: {n}', ko: '내 최고 점수: {n}', ja: '自己ベスト：{n}', zh: '我的最高分：{n}', es: 'Tu récord: {n}', id: 'Skor terbaikmu: {n}', vi: 'Điểm cao nhất: {n}', hi: 'आपका बेस्ट: {n}', ar: 'أفضل نتيجة لك: {n}' },
  solo: { en: 'Play alone', ko: '혼자 하기', ja: 'ひとりで', zh: '一个人玩', es: 'Jugar solo', id: 'Main sendiri', vi: 'Chơi một mình', hi: 'अकेले खेलें', ar: 'العب وحدك' },
  challenge: { en: 'Challenge {name}', ko: '{name}님에게 대결 신청', ja: '{name}さんに挑戦', zh: '挑战{name}', es: 'Retar a {name}', id: 'Tantang {name}', vi: 'Thách đấu {name}', hi: '{name} को चुनौती दें', ar: 'تحدَّ {name}' },
  accept: { en: 'Play {name} (they challenged you)', ko: '{name}님의 대결 받기', ja: '{name}さんの挑戦を受ける', zh: '接受{name}的挑战', es: 'Jugar contra {name} (te retó)', id: 'Lawan {name} (dia menantangmu)', vi: 'Đấu với {name} (bạn ấy thách bạn)', hi: '{name} से खेलें (उन्होंने चुनौती दी)', ar: 'العب ضد {name} (تحدّاك)' },
  nobody: { en: 'Stand next to someone in the bar to challenge them.', ko: '바 안에서 다른 사람 옆에 서면 대결을 신청할 수 있어요.', ja: 'バーで誰かのそばに立つと挑戦できます。', zh: '站在酒吧里其他人旁边就能发起挑战。', es: 'Ponte al lado de alguien en el bar para retarle.', id: 'Berdiri di dekat orang lain di bar untuk menantangnya.', vi: 'Đứng cạnh ai đó trong quán để thách đấu.', hi: 'चुनौती देने के लिए बार में किसी के पास खड़े हों।', ar: 'قف بجانب شخص في البار لتتحداه.' },
  waiting: { en: 'Waiting for {name} to accept…', ko: '{name}님이 수락하길 기다리는 중…', ja: '{name}さんの返事を待っています…', zh: '等待{name}接受…', es: 'Esperando a que {name} acepte…', id: 'Menunggu {name} menerima…', vi: 'Đang chờ {name} đồng ý…', hi: '{name} के स्वीकार करने का इंतज़ार…', ar: 'بانتظار قبول {name}…' },
  noAnswer: { en: '{name} didn\'t answer. Try again or play alone.', ko: '{name}님이 응답하지 않았어요. 다시 신청하거나 혼자 해 보세요.', ja: '{name}さんから返事がありません。もう一度か、ひとりで。', zh: '{name}没有回应。再试一次或一个人玩。', es: '{name} no respondió. Reintenta o juega solo.', id: '{name} tidak menjawab. Coba lagi atau main sendiri.', vi: '{name} không trả lời. Thử lại hoặc chơi một mình.', hi: '{name} ने जवाब नहीं दिया। फिर कोशिश करें या अकेले खेलें।', ar: 'لم يردّ {name}. حاول مجددًا أو العب وحدك.' },
  cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消', es: 'Cancelar', id: 'Batal', vi: 'Hủy', hi: 'रद्द करें', ar: 'إلغاء' },
  throw: { en: 'THROW', ko: '던지기', ja: '投げる', zh: '投掷', es: 'LANZAR', id: 'LEMPAR', vi: 'NÉM', hi: 'फेंकें', ar: 'ارمِ' },
  hud: { en: 'Round {r}/{R} · total {p}', ko: '{r}/{R}라운드 · 합계 {p}', ja: '{r}/{R}ラウンド・合計 {p}', zh: '第{r}/{R}轮 · 合计 {p}', es: 'Ronda {r}/{R} · total {p}', id: 'Ronde {r}/{R} · total {p}', vi: 'Lượt {r}/{R} · tổng {p}', hi: 'राउंड {r}/{R} · कुल {p}', ar: 'الجولة {r}/{R} · المجموع {p}' },
  vs: { en: 'You {a} · {name} {b}', ko: '나 {a} · {name} {b}', ja: '自分 {a}・{name} {b}', zh: '我 {a} · {name} {b}', es: 'Tú {a} · {name} {b}', id: 'Kamu {a} · {name} {b}', vi: 'Bạn {a} · {name} {b}', hi: 'आप {a} · {name} {b}', ar: 'أنت {a} · {name} {b}' },
  waitEnd: { en: 'Waiting for {name} to finish…', ko: '{name}님이 끝나길 기다리는 중…', ja: '{name}さんが投げ終わるのを待っています…', zh: '等待{name}投完…', es: 'Esperando a que {name} termine…', id: 'Menunggu {name} selesai…', vi: 'Đang chờ {name} ném xong…', hi: '{name} के ख़त्म करने का इंतज़ार…', ar: 'بانتظار أن ينهي {name}…' },
  done: { en: '{p} points!', ko: '{p}점!', ja: '{p}点！', zh: '{p}分！', es: '¡{p} puntos!', id: '{p} poin!', vi: '{p} điểm!', hi: '{p} अंक!', ar: '{p} نقطة!' },
  won: { en: '🏆 You beat {name}, {a} to {b}!', ko: '🏆 {a} 대 {b}로 {name}님에게 이겼어요!', ja: '🏆 {a}対{b}で{name}さんに勝ちました！', zh: '🏆 {a}比{b}赢了{name}！', es: '🏆 ¡Ganaste a {name}, {a} a {b}!', id: '🏆 Kamu menang lawan {name}, {a} : {b}!', vi: '🏆 Bạn thắng {name}, {a} - {b}!', hi: '🏆 आपने {name} को {a}–{b} से हराया!', ar: '🏆 فزت على {name}، {a} مقابل {b}!' },
  lost: { en: '{name} wins, {b} to {a}. Rematch?', ko: '{b} 대 {a}로 {name}님 승리. 한 판 더?', ja: '{b}対{a}で{name}さんの勝ち。もう一戦？', zh: '{name}以{b}比{a}获胜。再来一局？', es: 'Gana {name}, {b} a {a}. ¿Revancha?', id: '{name} menang, {b} : {a}. Tanding ulang?', vi: '{name} thắng, {b} - {a}. Đấu lại?', hi: '{name} जीते, {b}–{a}। फिर से?', ar: 'فاز {name}، {b} مقابل {a}. جولة أخرى؟' },
  tie: { en: 'A tie, {a} each!', ko: '{a}점 동점이에요!', ja: '{a}点で引き分け！', zh: '{a}分平局！', es: '¡Empate a {a}!', id: 'Seri, masing-masing {a}!', vi: 'Hòa, mỗi người {a}!', hi: 'बराबरी, दोनों के {a}!', ar: 'تعادل، {a} لكلٍّ منكما!' },
  left: { en: '{name} left the game.', ko: '{name}님이 게임을 나갔어요.', ja: '{name}さんが抜けました。', zh: '{name}离开了游戏。', es: '{name} dejó la partida.', id: '{name} keluar dari permainan.', vi: '{name} đã rời trò chơi.', hi: '{name} ने खेल छोड़ दिया।', ar: 'غادر {name} اللعبة.' },
  record: { en: '🏆 New best!', ko: '🏆 신기록!', ja: '🏆 自己ベスト更新！', zh: '🏆 新纪录！', es: '🏆 ¡Nuevo récord!', id: '🏆 Rekor baru!', vi: '🏆 Kỷ lục mới!', hi: '🏆 नया रिकॉर्ड!', ar: '🏆 رقم جديد!' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次', es: 'Otra vez', id: 'Lagi', vi: 'Lần nữa', hi: 'फिर से', ar: 'مرة أخرى' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', id: 'Tutup', vi: 'Đóng', hi: 'बंद करें', ar: 'إغلاق' },
};
export const DARTS_TEXT = T;
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const S = 400, C = S / 2, R = 160; // canvas size, centre, board radius (r = 1) in px
const TOTAL = DART_ROUNDS * DARTS_PER_ROUND;
const WAIT_ACCEPT = 30000, WAIT_END = 60000;

function paintBoard() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#1b1b20'; c.beginPath(); c.arc(C, C, R * 1.22, 0, Math.PI * 2); c.fill();
  const ring = (r0, r1, colors) => {
    for (let i = 0; i < 20; i++) {
      const a0 = -Math.PI / 2 - Math.PI / 20 + (i * Math.PI) / 10, a1 = a0 + Math.PI / 10;
      c.fillStyle = colors[i % 2];
      c.beginPath(); c.arc(C, C, r1 * R, a0, a1); c.arc(C, C, r0 * R, a1, a0, true); c.closePath(); c.fill();
    }
  };
  ring(RING.doubleIn, 1, ['#d9473c', '#2f8f5b']);
  ring(RING.tripleOut, RING.doubleIn, ['#1b1b20', '#f3e6c4']);
  ring(RING.tripleIn, RING.tripleOut, ['#d9473c', '#2f8f5b']);
  ring(RING.outerBull, RING.tripleIn, ['#1b1b20', '#f3e6c4']);
  c.fillStyle = '#2f8f5b'; c.beginPath(); c.arc(C, C, RING.outerBull * R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d9473c'; c.beginPath(); c.arc(C, C, RING.bull * R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.font = 'bold 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
  BOARD_ORDER.forEach((n, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 10;
    c.fillText(String(n), C + Math.cos(a) * R * 1.11, C + Math.sin(a) * R * 1.11);
  });
  return cv;
}

export class DartsUI {
  // store: localStorage (records); friend(): { id, name } next to you or
  // null; invite(): a pending challenge { from, name } or null; clearInvite();
  // send(to, kind, thrown, total); onThrow(points); rand for tests.
  constructor({ root, store, friend, invite, clearInvite, send, onThrow, rand = Math.random }) {
    Object.assign(this, { root, store, friend, invite, clearInvite, send, onThrow, rand });
    this.raf = 0;
    this.onKey = (e) => {
      if (!this.game || (e.code !== 'Space' && e.code !== 'Enter')) return;
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) this.throwDart();
    };
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() {
    if (this.game?.vs && !this.game.over) this.send(this.game.vs.id, 'n');
    if (this.waitFor) this.send(this.waitFor.id, 'n');
    this._stop(); this.root.hidden = true;
  }
  _stop() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey, true);
    this.game = null; this.waitFor = null;
  }

  // A message from someone (see dartsMsg): accept, scores, leaving, or a
  // fresh invite (shown on the start screen).
  heard(from, m) {
    if (m.kind === 'i') { if (this.open && !this.game && !this.waitFor) this.renderStart(); return; }
    if (m.kind === 'a' && this.waitFor?.id === from) { const vs = this.waitFor; this.play(vs); return; }
    const g = this.game;
    if (!g?.vs || g.vs.id !== from) return;
    if (m.kind === 's') { g.vs.thrown = Math.max(g.vs.thrown, m.thrown); g.vs.total = m.total; this._vsLine(); if (g.over) this._maybeEnd(); }
    else if (m.kind === 'n') { g.vs.left = true; this._vsLine(); if (g.over) this._maybeEnd(); }
  }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎯 ' + tt('title')));
  }

  renderStart(note, rematch = null) {
    this._frame();
    this.root.append(el('p', 'order-hint', tt('howTo')));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = loadRecords(this.store).darts;
    if (best) this.root.append(el('p', 'order-hint', tt('best', { n: best })));
    const actions = el('div', 'order-actions arcade-actions');
    const inv = this.invite?.();
    if (inv) {
      const b = el('button', 'primary', '🤝 ' + tt('accept', { name: inv.name }));
      b.onclick = () => { this.clearInvite?.(); this.send(inv.from, 'a'); this.play({ id: inv.from, name: inv.name }); };
      actions.append(b);
    }
    const fr = rematch || this.friend?.();
    if (fr && fr.id !== inv?.from) {
      const b = el('button', null, '⚔️ ' + tt('challenge', { name: fr.name }));
      b.onclick = () => this.challenge(fr);
      actions.append(b);
    }
    const solo = el('button', inv ? null : 'primary', '🎯 ' + tt('solo'));
    solo.onclick = () => this.play(null);
    actions.append(solo);
    this.root.append(actions);
    if (!fr && !inv) this.root.append(el('p', 'order-hint', tt('nobody')));
  }

  challenge(fr) {
    this._frame();
    this.send(fr.id, 'i');
    this.waitFor = fr;
    this.root.append(el('p', 'order-hint claw-note', tt('waiting', { name: fr.name })));
    const cancel = el('button', null, tt('cancel'));
    cancel.onclick = () => { this.send(fr.id, 'n'); this.renderStart(); };
    const actions = el('div', 'order-actions');
    actions.append(cancel);
    this.root.append(actions);
    this.timer = setTimeout(() => { if (this.waitFor === fr) this.renderStart(tt('noAnswer', { name: fr.name })); }, WAIT_ACCEPT);
  }

  play(vs) {
    this._frame();
    this.board ||= paintBoard();
    const cv = el('canvas', 'arcade-canvas darts-board');
    cv.width = cv.height = S;
    const status = el('p', 'karaoke-status');
    const vsLine = el('p', 'order-hint claw-note darts-vs');
    vsLine.hidden = !vs;
    const btn = el('button', 'primary karaoke-pad', '🎯 ' + tt('throw'));
    btn.onpointerdown = (e) => { e.preventDefault(); this.throwDart(); };
    this.root.append(cv, status, vsLine, btn);
    this.game = {
      cv, status, vsLine, btn, darts: [], total: 0, flying: null, over: false,
      t0: performance.now() / 1000, sway: this.rand() * 20,
      vs: vs ? { id: vs.id, name: vs.name, thrown: 0, total: 0, left: false } : null,
    };
    window.addEventListener('keydown', this.onKey, true);
    this._hud(); this._vsLine();
    const loop = (now) => { this.draw(now / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  _hud() {
    const g = this.game;
    const r = Math.min(DART_ROUNDS, Math.floor(g.darts.length / DARTS_PER_ROUND) + 1);
    const last = g.darts.at(-1);
    const what = !last ? '' : last.label === 'miss' ? '✖' : last.label === String(last.points) ? `+${last.points}` : `${last.label} +${last.points}`;
    g.status.textContent = tt('hud', { r, R: DART_ROUNDS, p: g.total }) + (what ? '  ·  ' + what : '');
  }
  _vsLine() {
    const g = this.game;
    if (!g?.vs) return;
    g.vsLine.textContent = tt('vs', { a: g.total, name: g.vs.name, b: `${g.vs.total} (${g.vs.thrown}/${TOTAL})` }) + (g.vs.left ? ' · ' + tt('left', { name: g.vs.name }) : '');
  }

  throwDart() {
    const g = this.game;
    if (!g || g.over || g.flying) return;
    const now = performance.now() / 1000;
    const aim = dartAim(now - g.t0 + g.sway);
    const at = dartLand(aim, this.rand);
    g.flying = { at, t: now };
  }

  land() {
    const g = this.game;
    const { at } = g.flying;
    g.flying = null;
    const s = dartScore(at.x, at.y);
    g.darts.push({ ...s, x: at.x, y: at.y });
    g.total += s.points;
    this.onThrow?.(s.points);
    if (g.vs && !g.vs.left) this.send(g.vs.id, 's', g.darts.length, g.total);
    this._hud(); this._vsLine();
    if (g.darts.length >= TOTAL) {
      g.over = true;
      g.btn.disabled = true;
      this._maybeEnd();
    }
  }

  _maybeEnd() {
    const g = this.game;
    const vs = g.vs;
    if (vs && !vs.left && vs.thrown < TOTAL) {
      g.status.textContent = tt('waitEnd', { name: vs.name });
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { if (this.game === g) { vs.left = true; this._maybeEnd(); } }, WAIT_END);
      return;
    }
    clearTimeout(this.timer);
    const rec = saveRecord(this.store, 'darts', g.total) && g.total > 0;
    let note = tt('done', { p: g.total });
    if (vs && vs.left && vs.thrown < TOTAL) note += ' ' + tt('left', { name: vs.name });
    else if (vs) {
      const a = g.total, b = vs.total;
      note = a > b ? tt('won', { name: vs.name, a, b }) : a < b ? tt('lost', { name: vs.name, a, b }) : tt('tie', { a });
    }
    if (rec) note += '  ' + tt('record');
    const rematch = vs && !vs.left ? { id: vs.id, name: vs.name } : null;
    setTimeout(() => {
      if (this.game !== g) return;
      this.game = null; // the match is over: leaving now is not walking out on anyone
      this.renderStart(note, rematch);
    }, 900);
  }

  draw(now) {
    const g = this.game;
    if (!g) return;
    const c = g.cv.getContext('2d');
    c.fillStyle = '#3a2a20'; c.fillRect(0, 0, S, S);
    c.drawImage(this.board, 0, 0);
    // This round's darts stay on the board until the next round starts.
    const n = g.darts.length, k = n % DARTS_PER_ROUND;
    const shown = !n ? [] : k ? g.darts.slice(-k) : g.flying ? [] : g.darts.slice(-DARTS_PER_ROUND);
    for (const d of shown) this.dart(c, C + d.x * R, C + d.y * R, 1);
    if (g.flying) {
      const k = Math.min(1, (now - g.flying.t) / 0.22);
      const x = C + g.flying.at.x * R, y = C + g.flying.at.y * R;
      this.dart(c, x, y + (1 - k) * 180, 1 + (1 - k) * 1.5);
      if (k >= 1) this.land();
    } else if (!g.over) {
      const a = dartAim(now - g.t0 + g.sway);
      const x = C + a.x * R, y = C + a.y * R;
      c.strokeStyle = '#ffffff'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x - 6, y); c.moveTo(x + 6, y); c.lineTo(x + 18, y);
      c.moveTo(x, y - 18); c.lineTo(x, y - 6); c.moveTo(x, y + 6); c.lineTo(x, y + 18); c.stroke();
    }
  }
  dart(c, x, y, s) {
    c.strokeStyle = '#c9ced3'; c.lineWidth = 2 * s;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 * s, y + 16 * s); c.stroke();
    c.fillStyle = '#ffd36e';
    c.beginPath(); c.moveTo(x + 10 * s, y + 16 * s); c.lineTo(x + 18 * s, y + 20 * s); c.lineTo(x + 12 * s, y + 26 * s); c.closePath(); c.fill();
    c.fillStyle = '#e2457a'; c.beginPath(); c.arc(x, y, 2.5 * s, 0, Math.PI * 2); c.fill();
  }
}
