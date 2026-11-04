// Duck boat panel (rules in core/duck-boat.js): tap the left and right pedals
// in turn to reach the buoy. With a friend next to you, both pedal the same
// boat: strokes are sent to each other a few times a second.
import { COURSE, RACE_SECONDS, FRIEND_BONUS, DuckBoat, duckPay } from '../core/duck-boat.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Duck boat', ko: '한강 오리배', ja: 'アヒルボート', zh: '鸭子船' },
  howTo: {
    en: 'Tap ◀ and ▶ in turn to pedal to the buoy in 30 seconds. With a friend next to you, pick "Ride together": your pedalling adds up!',
    ko: '◀ ▶를 번갈아 눌러 30초 안에 부표까지 가요. 옆에 친구가 있으면 "같이 타기"를 고르세요. 둘의 페달이 합쳐져요!',
    ja: '◀ ▶を交互に押して30秒以内にブイまで。そばに友だちがいれば「一緒に乗る」を選ぶと、2人のペダルが合わさります！',
    zh: '交替按 ◀ ▶ 踩踏板，30秒内到达浮标。旁边有朋友就选“一起坐”，两人的踩踏会叠加！',
  },
  solo: { en: 'Ride alone', ko: '혼자 타기', ja: 'ひとりで乗る', zh: '一个人坐' },
  together: { en: 'Ride together with {name}', ko: '{name}님과 같이 타기', ja: '{name}さんと一緒に乗る', zh: '和{name}一起坐' },
  left: { en: '{m} m to the buoy · {s} s', ko: '부표까지 {m}m · {s}초', ja: 'ブイまで {m}m · {s}秒', zh: '距浮标 {m}米 · {s}秒' },
  partner: { en: 'Pedalling with {name}', ko: '{name}님과 함께 페달 중', ja: '{name}さんと一緒にこいでいます', zh: '正和{name}一起踩' },
  win: { en: 'You reached the buoy! 🪙 +{n}', ko: '부표 도착! 🪙 +{n}', ja: 'ブイに到着！🪙 +{n}', zh: '到达浮标！🪙 +{n}' },
  winTogether: { en: 'Together bonus 🪙 +{n}', ko: '같이 타기 보너스 🪙 +{n}', ja: '一緒ボーナス 🪙 +{n}', zh: '一起奖励 🪙 +{n}' },
  lose: { en: "Time's up! {m} m to go.", ko: '시간 끝! {m}m 남았어요.', ja: '時間切れ！あと {m}m。', zh: '时间到！还差{m}米。' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次' },
  leave: { en: 'Get off', ko: '내리기', ja: '降りる', zh: '下船', es: 'Bajar', ar: 'انزل', vi: 'Xuống', id: 'Turun' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class DuckUI {
  // friend(): { id, name } of someone right next to you, or null;
  // send(msg) to the room; wallet; onDone(finished, together).
  // onProgress(k): 0 at the dock … 1 at the buoy, as you pedal.
  // onLeave(): get off the boat (shown when set).
  constructor({ root, wallet, friend, send, onDone, onProgress, onLeave }) {
    Object.assign(this, { root, wallet, friend, send, onDone, onProgress, onLeave });
    this.timer = 0;
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { this._stop(); this.root.hidden = true; }
  _stop() { clearInterval(this.timer); this.timer = 0; this.race = null; }

  // A partner's strokes ('duck:<me>:<n>').
  heard(from, strokes) {
    if (this.race?.partner?.id === from) this.race.boat.heard(strokes);
  }

  _frame() {
    this._stop();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🦆 ' + tt('title')));
  }

  renderStart() {
    this._frame();
    const f = this.friend?.();
    const actions = el('div', 'order-actions');
    const solo = el('button', f ? 'chip' : 'primary', '🦆 ' + tt('solo'));
    solo.onclick = () => this.play(null);
    actions.append(solo);
    if (f) {
      const two = el('button', 'primary', '👫 ' + tt('together', { name: f.name }));
      two.onclick = () => this.play(f);
      actions.append(two);
    }
    if (this.onLeave) {
      const off = el('button', 'chip', '🧍 ' + tt('leave'));
      off.onclick = () => { this.close(); this.onLeave(); };
      actions.append(off);
    }
    this.root.append(el('p', 'order-hint', tt('howTo')), actions);
  }

  play(partner) {
    this._frame();
    const boat = new DuckBoat();
    const race = (this.race = { boat, partner, left: RACE_SECONDS, sent: -1 });
    const cv = el('canvas', 'duck-lane');
    cv.width = 640; cv.height = 150;
    const info = el('p', 'karaoke-status');
    const pads = el('div', 'duck-pads');
    const pedal = (side) => (e) => { e.preventDefault(); if (this.race === race && race.left > 0) { boat.pedal(side); paint(); } };
    const lb = el('button', 'primary duck-pad', '◀');
    const rb = el('button', 'primary duck-pad', '▶');
    lb.onpointerdown = pedal('L');
    rb.onpointerdown = pedal('R');
    pads.append(lb, rb);
    this.root.append(cv, info);
    if (partner) this.root.append(el('p', 'order-hint', '👫 ' + tt('partner', { name: partner.name })));
    this.root.append(pads);
    const paint = () => {
      const c = cv.getContext('2d');
      const g = c.createLinearGradient(0, 0, 0, cv.height);
      g.addColorStop(0, '#7cc4e8'); g.addColorStop(1, '#3d8fc4');
      c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 8; i++) { const wx = ((i * 97 - boat.dist * 6) % 700 + 700) % 700 - 30; c.beginPath(); c.arc(wx, 40 + (i % 3) * 35, 10, 0, Math.PI); c.stroke(); }
      const x = 40 + (Math.min(boat.dist, COURSE) / COURSE) * (cv.width - 120);
      c.font = '44px system-ui'; c.textAlign = 'center';
      c.fillText('🛟', cv.width - 40, 95);
      c.fillText('🦆', x, 95);
      this.onProgress?.(Math.min(boat.dist, COURSE) / COURSE);
      info.textContent = tt('left', { m: Math.max(0, Math.ceil(COURSE - boat.dist)), s: Math.max(0, race.left).toFixed(1) });
      if (boat.done) this.finish(race);
    };
    paint();
    this.timer = setInterval(() => {
      if (this.race !== race) return;
      race.left -= 0.1;
      // Tell the partner my stroke count a few times a second.
      if (partner && boat.mine !== race.sent && Math.round(race.left * 10) % 3 === 0) { race.sent = boat.mine; this.send(partner.id, boat.mine); }
      paint();
      if (race.left <= 0 && this.race === race) this.finish(race);
    }, 100);
  }

  finish(race) {
    if (this.race !== race) return;
    if (race.partner) this.send(race.partner.id, race.boat.mine);
    const ok = race.boat.done;
    const coins = duckPay(ok, race.left) + (ok && race.partner ? FRIEND_BONUS : 0);
    if (coins) this.wallet.add(coins);
    this._frame();
    const res = el('div', 'grill-result');
    res.append(el('span', 'grill-medal', ok ? '🛟' : '🦆'), el('strong', null, ok ? tt('win', { n: coins }) : tt('lose', { m: Math.ceil(COURSE - race.boat.dist) })));
    if (ok && race.partner) res.append(el('p', 'order-hint', tt('winTogether', { n: FRIEND_BONUS })));
    const again = el('button', 'primary', tt('again'));
    again.onclick = () => this.renderStart();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(res, actions);
    this.onDone?.(ok, !!race.partner);
  }
}
