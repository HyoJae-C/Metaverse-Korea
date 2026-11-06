// Darts at the bar (rules in core/arcade.js): the aim sways over the board;
// tap THROW at the right moment, within 7 seconds per dart. Alone: 5 rounds
// of 3 darts. Or challenge someone in the same bar: you take turns, one dart
// each, 10 darts each, and both screens show every throw live (the thrower
// sends the sway's phase and where each dart lands). No drinks or coins.
// Loaded on first use (see openArcade in main.js).
import {
  DART_ROUNDS, DARTS_PER_ROUND, DART_SECONDS, DARTS_EACH, BOARD_ORDER, RING, dartScore, dartAim, dartLand,
  dartPack, dartUnpack, swayPack, swayUnpack, challengerThrows, loadRecords, saveRecord,
} from '../core/arcade.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Darts', ko: '다트', ja: 'ダーツ', zh: '飞镖', es: 'Dardos', id: 'Dart', vi: 'Phi tiêu', hi: 'डार्ट्स', ar: 'رمي السهام' },
  howTo: {
    en: 'The aim sways over the board: press THROW (or Space) when it is where you want it. 5 rounds of 3 darts. Bull 50, the thin rings count double and triple. You have {s} seconds for each dart.',
    ko: '조준점이 보드 위에서 흔들려요. 원하는 곳에 왔을 때 던지기(또는 스페이스)를 누르세요. 3발씩 5라운드. 정중앙 불은 50점, 얇은 링은 2배·3배예요. 한 발마다 {s}초 안에 던져야 해요.',
    ja: '狙いがボードの上で揺れます。狙った所で「投げる」（またはスペース）。3投×5ラウンド。ブル50点、細いリングは2倍・3倍。1投ごとに{s}秒以内に投げてください。',
    zh: '准星会在靶上晃动，到想要的位置时按“投掷”（或空格）。每轮3镖，共5轮。靶心50分，细环是双倍和三倍。每一镖要在{s}秒内投出。',
    es: 'La mira se mueve sobre la diana: pulsa LANZAR (o Espacio) cuando esté donde quieras. 5 rondas de 3 dardos. Diana 50; los anillos finos valen doble y triple. Tienes {s} segundos para cada dardo.',
    id: 'Bidikan bergoyang di papan: tekan LEMPAR (atau Spasi) saat pas di tempat yang kamu mau. 5 ronde, 3 dart. Bull 50, cincin tipis bernilai ganda dan tiga kali. Kamu punya {s} detik untuk setiap dart.',
    vi: 'Tâm ngắm lắc lư trên bảng: nhấn NÉM (hoặc Space) khi nó ở đúng chỗ. 5 lượt, mỗi lượt 3 phi tiêu. Hồng tâm 50, vòng mảnh tính gấp đôi và gấp ba. Mỗi phi tiêu phải ném trong {s} giây.',
    hi: 'निशाना बोर्ड पर हिलता है: जहाँ चाहें वहाँ आए तो फेंकें (या Space) दबाएँ। 3 डार्ट के 5 राउंड। बुल 50, पतली रिंग डबल और ट्रिपल। हर डार्ट के लिए {s} सेकंड हैं।',
    ar: 'التصويب يتمايل فوق اللوحة: اضغط «ارمِ» (أو المسافة) عندما يكون في المكان الذي تريده. 5 جولات من 3 سهام. المركز 50، والحلقات الرفيعة مضاعفة وثلاثية. لديك {s} ثوانٍ لكل سهم.',
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
  vsHow: {
    en: 'With a friend: take turns, one dart each, {n} darts each. You both watch every throw.',
    ko: '친구와 하면 한 발씩 번갈아 던져요. 1인당 {n}발이고, 서로 던지는 화면을 함께 봐요.',
    ja: '友だちとなら1投ずつ交代で、1人{n}投。相手が投げる様子も見られます。',
    zh: '和朋友一起：轮流每人投一镖，每人{n}镖，彼此都能看到对方投掷。',
    es: 'Con un amigo: por turnos, un dardo cada uno, {n} dardos cada uno. Los dos veis cada tiro.',
    id: 'Dengan teman: bergantian satu dart, masing-masing {n} dart. Kalian berdua melihat setiap lemparan.',
    vi: 'Chơi với bạn: lần lượt mỗi người ném một phi tiêu, mỗi người {n} phi tiêu. Cả hai cùng xem từng cú ném.',
    hi: 'दोस्त के साथ: बारी-बारी से एक-एक डार्ट, हर किसी के {n} डार्ट। दोनों हर थ्रो देखते हैं।',
    ar: 'مع صديق: تتناوبان سهمًا بسهم، {n} سهام لكلٍّ منكما، وتشاهدان كل رمية معًا.',
  },
  yourTurn: { en: 'Your turn · dart {k}/{n}', ko: '내 차례 · {k}/{n}번째', ja: '自分の番・{k}/{n}投目', zh: '轮到你 · 第{k}/{n}镖', es: 'Tu turno · dardo {k}/{n}', id: 'Giliranmu · dart {k}/{n}', vi: 'Lượt của bạn · phi tiêu {k}/{n}', hi: 'आपकी बारी · डार्ट {k}/{n}', ar: 'دورك · السهم {k}/{n}' },
  theirTurn: { en: '{name}\'s turn · dart {k}/{n}', ko: '{name}님 차례 · {k}/{n}번째', ja: '{name}さんの番・{k}/{n}投目', zh: '轮到{name} · 第{k}/{n}镖', es: 'Turno de {name} · dardo {k}/{n}', id: 'Giliran {name} · dart {k}/{n}', vi: 'Lượt của {name} · phi tiêu {k}/{n}', hi: '{name} की बारी · डार्ट {k}/{n}', ar: 'دور {name} · السهم {k}/{n}' },
  timeUp: { en: '⏱ Time\'s up', ko: '⏱ 시간 초과', ja: '⏱ 時間切れ', zh: '⏱ 时间到', es: '⏱ Se acabó el tiempo', id: '⏱ Waktu habis', vi: '⏱ Hết giờ', hi: '⏱ समय ख़त्म', ar: '⏱ انتهى الوقت' },
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
const TOTAL = DART_ROUNDS * DARTS_PER_ROUND; // alone
const MATCH = DARTS_EACH * 2; // with a friend, both players' darts
const WAIT_ACCEPT = 30000;
const LATE = 8; // s past a friend's 7 seconds (or waiting for their turn to start) before we call it a dropout
const FLY = 0.22; // s a dart takes to reach the board

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
  // send(to, kind, thrown, total, extra); onThrow(points); rand for tests.
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
    clearInterval(this.tick); this.tick = 0;
    window.removeEventListener('keydown', this.onKey, true);
    this.game = null; this.waitFor = null;
  }

  // A message from someone (see dartsMsg): accept, a turn starting, a dart
  // landing, time running out, leaving, or a fresh invite (shown on the
  // start screen).
  heard(from, m) {
    if (m.kind === 'i') { if (this.open && !this.game && !this.waitFor) this.renderStart(); return; }
    if (m.kind === 'a' && this.waitFor?.id === from) { const vs = this.waitFor; this.play(vs, true); return; }
    const g = this.game;
    if (!g?.vs || g.vs.id !== from || g.over) return;
    if (m.kind === 'n') { g.vs.left = true; this._end(); return; }
    if ('thx'.includes(m.kind)) { g.inbox.push(m); this._read(); }
  }
  // Act on the friend's messages for the dart being thrown now. One for a
  // later dart waits (their turn can start before our dart has landed here).
  _read() {
    const g = this.game;
    if (!g?.vs || g.over || g.flying || !g.turn || g.turn.mine) return;
    for (;;) {
      const i = g.inbox.findIndex((m) => m.thrown === g.n);
      if (i < 0) break;
      const [m] = g.inbox.splice(i, 1);
      const now = performance.now() / 1000, turn = g.turn;
      if (m.kind === 't') {
        if (!turn.started) Object.assign(turn, { started: true, t0: now, sway: swayUnpack(m.total), deadline: now + DART_SECONDS });
      } else if (m.kind === 'h') {
        g.turn = null;
        g.flying = { at: { x: dartUnpack(m.total), y: dartUnpack(m.extra ?? 0) }, t: now, mine: false };
        break;
      } else if (m.kind === 'x') {
        g.turn = null;
        this._record(false, { points: 0, label: 'time' });
        break;
      }
    }
    if (this.game === g) g.inbox = g.inbox.filter((m) => m.thrown >= g.n);
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
    this.root.append(el('p', 'order-hint', tt('howTo', { s: DART_SECONDS })));
    this.root.append(el('p', 'order-hint', tt('vsHow', { n: DARTS_EACH })));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const best = loadRecords(this.store).darts;
    if (best) this.root.append(el('p', 'order-hint', tt('best', { n: best })));
    const actions = el('div', 'order-actions arcade-actions');
    const inv = this.invite?.();
    if (inv) {
      const b = el('button', 'primary', '🤝 ' + tt('accept', { name: inv.name }));
      b.onclick = () => { this.clearInvite?.(); this.send(inv.from, 'a'); this.play({ id: inv.from, name: inv.name }, false); };
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

  // vs: the friend, or null to play alone; first: we challenged them, so we
  // throw first.
  play(vs, first = false) {
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
      cv, status, vsLine, btn, darts: [], total: 0, flying: null, over: false, turn: null, last: null,
      n: 0, inbox: [], first, t0: performance.now() / 1000, sway: this.rand() * 20,
      vs: vs ? { id: vs.id, name: vs.name, darts: [], total: 0, left: false } : null,
    };
    window.addEventListener('keydown', this.onKey, true);
    this._startTurn();
    this.tick = setInterval(() => this._clock(), 200);
    const loop = (now) => { this.draw(now / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  // The next dart: ours (the clock starts; a friend is told the sway's
  // phase so their screen sways the same) or the friend's (we wait for
  // their 't').
  _startTurn() {
    const g = this.game;
    const now = performance.now() / 1000;
    const mine = !g.vs || challengerThrows(g.n) === g.first;
    if (mine) {
      // Alone the aim keeps swaying from dart to dart, as before.
      const sway = g.vs ? swayUnpack(swayPack(this.rand() * 20)) : g.sway;
      g.turn = { mine, started: true, t0: g.vs ? now : g.t0, sway, deadline: now + DART_SECONDS };
      if (g.vs) this.send(g.vs.id, 't', g.n, swayPack(sway));
    } else g.turn = { mine, started: false, since: now };
    g.btn.disabled = !mine;
    this._hud();
    if (!mine) this._read();
  }

  // 7 seconds per dart: out of time is a miss. A friend who stays silent
  // well past their 7 seconds has dropped out.
  _clock() {
    const g = this.game;
    if (!g || g.over || g.flying || !g.turn) return;
    const now = performance.now() / 1000, t = g.turn;
    if (t.mine && now >= t.deadline) {
      g.turn = null;
      if (g.vs) this.send(g.vs.id, 'x', g.n);
      this._record(true, { points: 0, label: 'time' });
    } else if (!t.mine && now >= (t.started ? t.deadline : t.since + DART_SECONDS) + LATE) {
      g.vs.left = true;
      this._end();
    }
  }

  _hud() {
    const g = this.game;
    const last = g.last?.d;
    const what = !last ? '' : last.label === 'time' ? tt('timeUp') : last.label === 'miss' ? '✖' : last.label === String(last.points) ? `+${last.points}` : `${last.label} +${last.points}`;
    let line = '';
    if (!g.vs) {
      const r = Math.min(DART_ROUNDS, Math.floor(g.darts.length / DARTS_PER_ROUND) + 1);
      line = tt('hud', { r, R: DART_ROUNDS, p: g.total });
    } else if (!g.over) {
      const k = Math.floor(g.n / 2) + 1;
      line = g.turn?.mine ? tt('yourTurn', { k, n: DARTS_EACH }) : tt('theirTurn', { name: g.vs.name, k, n: DARTS_EACH });
    }
    const who = g.vs && g.last && !g.last.mine ? g.vs.name + ' ' : '';
    g.status.textContent = line + (what ? (line ? '  ·  ' : '') + who + what : '');
    if (g.vs) g.vsLine.textContent = tt('vs', { a: g.total, name: g.vs.name, b: g.vs.total }) + (g.vs.left ? ' · ' + tt('left', { name: g.vs.name }) : '');
  }

  throwDart() {
    const g = this.game;
    if (!g || g.over || g.flying || !g.turn?.mine) return;
    const now = performance.now() / 1000, t = g.turn;
    const hit = dartLand(dartAim(now - t.t0 + t.sway), this.rand);
    // Rounded the way the message carries it, so both screens score the same.
    const at = { x: dartUnpack(dartPack(hit.x)), y: dartUnpack(dartPack(hit.y)) };
    g.turn = null;
    g.btn.disabled = true;
    g.flying = { at, t: now, mine: true };
    if (g.vs) this.send(g.vs.id, 'h', g.n, dartPack(at.x), dartPack(at.y));
  }

  land() {
    const g = this.game;
    const { at, mine } = g.flying;
    g.flying = null;
    this._record(mine, { ...dartScore(at.x, at.y), x: at.x, y: at.y });
  }

  _record(mine, d) {
    const g = this.game;
    const who = mine ? g : g.vs;
    who.darts.push(d);
    who.total += d.points;
    g.last = { mine, d };
    if (mine) this.onThrow?.(d.points);
    if (g.vs) g.n++;
    if (g.vs ? g.n >= MATCH : g.darts.length >= TOTAL) this._end();
    else this._startTurn();
  }

  _end() {
    const g = this.game;
    if (!g || g.ended) return;
    Object.assign(g, { ended: true, over: true, turn: null });
    g.btn.disabled = true;
    this._hud();
    const vs = g.vs;
    let note;
    if (!vs) {
      note = tt('done', { p: g.total });
      if (saveRecord(this.store, 'darts', g.total) && g.total > 0) note += '  ' + tt('record');
    } else if (vs.left) note = tt('left', { name: vs.name }) + ' ' + tt('vs', { a: g.total, name: vs.name, b: vs.total });
    else {
      const a = g.total, b = vs.total;
      note = a > b ? tt('won', { name: vs.name, a, b }) : a < b ? tt('lost', { name: vs.name, a, b }) : tt('tie', { a });
    }
    const rematch = vs && !vs.left ? { id: vs.id, name: vs.name } : null;
    setTimeout(() => {
      if (this.game !== g) return;
      this.game = null; // the match is over: leaving now is not walking out on anyone
      this.renderStart(note, rematch);
    }, 1200);
  }

  draw(now) {
    const g = this.game;
    if (!g) return;
    const c = g.cv.getContext('2d');
    c.fillStyle = '#3a2a20'; c.fillRect(0, 0, S, S);
    c.drawImage(this.board, 0, 0);
    const pin = (list, theirs) => { for (const d of list) if (d.x != null) this.dart(c, C + d.x * R, C + d.y * R, 1, theirs); };
    if (g.vs) {
      // Each player's last three darts, theirs in blue.
      pin(g.vs.darts.slice(-3), true);
      pin(g.darts.slice(-3), false);
    } else {
      // This round's darts stay on the board until the next round starts.
      const n = g.darts.length, k = n % DARTS_PER_ROUND;
      pin(!n ? [] : k ? g.darts.slice(-k) : g.flying ? [] : g.darts.slice(-DARTS_PER_ROUND), false);
    }
    if (g.flying) {
      const k = Math.min(1, (now - g.flying.t) / FLY);
      const x = C + g.flying.at.x * R, y = C + g.flying.at.y * R;
      this.dart(c, x, y + (1 - k) * 180, 1 + (1 - k) * 1.5, !g.flying.mine);
      if (k >= 1) this.land();
    } else if (g.turn?.started && !g.over) {
      const t = g.turn;
      const a = dartAim(now - t.t0 + t.sway);
      const x = C + a.x * R, y = C + a.y * R;
      c.strokeStyle = t.mine ? '#ffffff' : '#8fd3ff'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 18, y); c.lineTo(x - 6, y); c.moveTo(x + 6, y); c.lineTo(x + 18, y);
      c.moveTo(x, y - 18); c.lineTo(x, y - 6); c.moveTo(x, y + 6); c.lineTo(x, y + 18); c.stroke();
      // The 7-second clock: a bar along the top and the seconds left.
      const left = Math.max(0, Math.min(DART_SECONDS, t.deadline - now));
      const hot = left <= 3;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, S, 10);
      c.fillStyle = hot ? '#ff5a4e' : t.mine ? '#ffd36e' : '#8fd3ff';
      c.fillRect(0, 0, (S * left) / DART_SECONDS, 10);
      c.font = 'bold 26px system-ui'; c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillText('⏱ ' + Math.ceil(left), S - 10, 16);
    }
  }
  // A dart stuck at (x, y); a friend's (theirs) has blue flights.
  dart(c, x, y, s, theirs = false) {
    c.strokeStyle = '#c9ced3'; c.lineWidth = 2 * s;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 * s, y + 16 * s); c.stroke();
    c.fillStyle = theirs ? '#6ec8ff' : '#ffd36e';
    c.beginPath(); c.moveTo(x + 10 * s, y + 16 * s); c.lineTo(x + 18 * s, y + 20 * s); c.lineTo(x + 12 * s, y + 26 * s); c.closePath(); c.fill();
    c.fillStyle = theirs ? '#3a7bd5' : '#e2457a'; c.beginPath(); c.arc(x, y, 2.5 * s, 0, Math.PI * 2); c.fill();
  }
}
