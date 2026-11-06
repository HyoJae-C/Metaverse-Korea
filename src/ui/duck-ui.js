// Duck boat (rules in core/duck-boat.js): a short sheet before setting off,
// and a small clock at the top while out on the water. Steering uses the
// normal movement controls (joystick on phones, WASD / arrows on a PC).
import { RIDE_SECONDS, clock } from '../core/duck-boat.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Duck boat', ko: '한강 오리배', ja: 'アヒルボート', zh: '鸭子船', es: 'Bote pato', ar: 'قارب البطة', vi: 'Thuyền vịt', hi: 'बत्तख नाव', id: 'Perahu bebek' },
  howTo: {
    en: 'Free ride! Pedal anywhere on the river for up to 1 minute. Steer with the joystick (or WASD / arrow keys). When time is up, the boat brings you back to the dock.',
    ko: '무료예요! 최대 1분 동안 강 위를 자유롭게 다녀요. 조이스틱(또는 WASD·방향키)으로 움직이고, 시간이 끝나면 배가 선착장으로 돌아와요.',
    ja: '無料です！最大1分間、川の上を自由にこげます。ジョイスティック（またはWASD・矢印キー）で操作。時間になるとボートが乗り場に戻ります。',
    zh: '免费！在江面上自由踩船，最多1分钟。用摇杆（或WASD/方向键）掌舵，时间到了船会自己回到码头。',
    es: '¡Gratis! Pedalea por el río hasta 1 minuto. Dirige con el joystick (o WASD / flechas). Al acabar el tiempo, el bote vuelve solo al muelle.',
    ar: 'مجانًا! جدّف في النهر بحرّية لمدة دقيقة واحدة كحدّ أقصى. وجّه القارب بعصا التحكم (أو WASD / الأسهم). عند انتهاء الوقت يعود القارب إلى الرصيف.',
    vi: 'Miễn phí! Đạp thuyền tự do trên sông tối đa 1 phút. Điều khiển bằng cần điều khiển (hoặc WASD / phím mũi tên). Hết giờ, thuyền tự quay về bến.',
    hi: 'मुफ़्त! नदी पर 1 मिनट तक जहाँ चाहें पैडल मारें। जॉयस्टिक (या WASD / तीर कुंजियों) से चलाएँ। समय पूरा होने पर नाव आपको घाट पर वापस ले आएगी।',
    id: 'Gratis! Kayuh bebas di sungai hingga 1 menit. Kemudikan dengan joystick (atau WASD / tombol panah). Saat waktu habis, perahu kembali sendiri ke dermaga.',
  },
  go: { en: 'Set off (free · 1 min)', ko: '출발 (무료 · 1분)', ja: '出発（無料・1分）', zh: '出发（免费 · 1分钟）', es: 'Salir (gratis · 1 min)', ar: 'انطلق (مجانًا · دقيقة)', vi: 'Xuất phát (miễn phí · 1 phút)', hi: 'चलें (मुफ़्त · 1 मिनट)', id: 'Berangkat (gratis · 1 mnt)' },
  partner: { en: '{name} is steering. Enjoy the view!', ko: '{name}님이 운전 중이에요. 경치를 즐겨요!', ja: '{name}さんが運転中。景色を楽しんで！', zh: '{name}正在掌舵，欣赏风景吧！', es: '{name} lleva el timón. ¡Disfruta la vista!', ar: '{name} يقود القارب. استمتع بالمنظر!', vi: '{name} đang lái. Ngắm cảnh nhé!', hi: '{name} नाव चला रहे हैं। नज़ारे का मज़ा लीजिए!', id: '{name} sedang mengemudi. Nikmati pemandangannya!' },
  steer: { en: 'Steer with the joystick', ko: '조이스틱으로 움직여요', ja: 'ジョイスティックで操作', zh: '用摇杆掌舵', es: 'Dirige con el joystick', ar: 'وجّه بعصا التحكم', vi: 'Lái bằng cần điều khiển', hi: 'जॉयस्टिक से चलाएँ', id: 'Kemudikan dengan joystick' },
  steerKeys: { en: 'Steer with WASD / arrow keys', ko: 'WASD·방향키로 움직여요', ja: 'WASD・矢印キーで操作', zh: '用WASD/方向键掌舵', es: 'Dirige con WASD / flechas', ar: 'وجّه بـ WASD / الأسهم', vi: 'Lái bằng WASD / phím mũi tên', hi: 'WASD / तीर कुंजियों से चलाएँ', id: 'Kemudikan dengan WASD / panah' },
  riding: { en: 'Riding with {name}', ko: '{name}님과 같이 타는 중', ja: '{name}さんと乗っています', zh: '和{name}一起坐船', es: 'Paseando con {name}', ar: 'مع {name}', vi: 'Đang đi cùng {name}', hi: '{name} के साथ सवारी', id: 'Naik bersama {name}' },
  returning: { en: 'Heading back to the dock…', ko: '선착장으로 돌아가는 중…', ja: '乗り場に戻っています…', zh: '正在返回码头…', es: 'Volviendo al muelle…', ar: 'العودة إلى الرصيف…', vi: 'Đang quay về bến…', hi: 'घाट पर लौट रहे हैं…', id: 'Kembali ke dermaga…' },
  leave: { en: 'Get off', ko: '내리기', ja: '降りる', zh: '下船', es: 'Bajar', ar: 'انزل', vi: 'Xuống', hi: 'उतरें', id: 'Turun' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', ar: 'إغلاق', vi: 'Đóng', hi: 'बंद करें', id: 'Tutup' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export class DuckUI {
  // root: the sheet; hudRoot: the clock bar (heading back early is the
  // action button's job). onStart(): set off; onLeave(): get off at the dock.
  constructor({ root, hudRoot, onStart, onLeave }) {
    Object.assign(this, { root, hudRoot, onStart, onLeave });
    this._hudKey = '';
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }

  // The sheet at the dock. partner: name of a friend already steering this boat.
  show(partner) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const actions = el('div', 'order-actions');
    if (!partner) {
      const go = el('button', 'primary', '🚣 ' + tt('go'));
      go.onclick = () => { this.close(); this.onStart?.(); };
      actions.append(go);
    }
    const off = el('button', 'chip', '🧍 ' + tt('leave'));
    off.onclick = () => { this.close(); this.onLeave?.(); };
    actions.append(off);
    this.root.replaceChildren(x, el('h3', null, '🦆 ' + tt('title')),
      el('p', 'order-hint', partner ? tt('partner', { name: partner }) : tt('howTo')), actions);
    this.root.hidden = false;
  }

  // The clock while out: null hides it. s = { left, returning, driver } where
  // driver is a friend's name when they steer.
  hud(s) {
    const h = this.hudRoot;
    if (!s) { if (!h.hidden) { h.hidden = true; this._hudKey = ''; } return; }
    const t = s.returning ? '⚓' : clock(s.left);
    const key = [t, s.returning, s.driver || ''].join('|');
    if (key === this._hudKey && !h.hidden) return;
    this._hudKey = key;
    const time = el('b', 'duck-clock', '🦆 ' + t);
    time.classList.toggle('low', !s.returning && s.left <= 10);
    const note = el('span', 'duck-note', s.returning ? tt('returning') : s.driver ? tt('riding', { name: s.driver }) : tt(touch() ? 'steer' : 'steerKeys'));
    const bar = el('i', 'duck-bar');
    bar.style.width = `${s.returning ? 0 : Math.max(0, Math.min(1, s.left / RIDE_SECONDS)) * 100}%`;
    h.replaceChildren(time, note, bar);
    h.hidden = false;
  }
}
