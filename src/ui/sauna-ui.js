// Jjimjilbang panel (rules in core/sauna.js): sit out the hot kiln or the
// ice room while a meter fills. Also the sheep-towel hat (양머리), free.
import { HOT_SECONDS, ICE_SECONDS, COMBO_WINDOW, DAILY_ROUNDS } from '../core/sauna.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  hot: { en: 'Hot kiln (불가마)', ko: '불가마', ja: '汗蒸幕（プルガマ）', zh: '火窑汗蒸' },
  ice: { en: 'Ice room', ko: '얼음방', ja: '氷の部屋', zh: '冰屋' },
  hotHow: {
    en: 'Sit in the heat for {s} seconds until the sweat meter is full. Then go to the ice room within {w} seconds for a hot-cold bonus!',
    ko: '{s}초 동안 버텨서 땀 게이지를 채워요. 그다음 {w}초 안에 얼음방에 가면 온냉 보너스!',
    ja: '{s}秒がまんして汗ゲージを満タンに。その後{w}秒以内に氷の部屋へ行くと温冷ボーナス！',
    zh: '坚持{s}秒，把汗水条填满。之后{w}秒内去冰屋，就有冷热交替奖励！',
  },
  iceHow: {
    en: 'Cool down for {s} seconds. Straight after the kiln, you get a bonus.',
    ko: '{s}초 동안 몸을 식혀요. 불가마 바로 다음이면 보너스가 있어요.',
    ja: '{s}秒間クールダウン。汗蒸幕のすぐ後ならボーナス。',
    zh: '降温{s}秒。刚从火窑出来就有奖励。',
  },
  left: { en: 'Paid rounds left today: {n}/{max}', ko: '오늘 남은 보상 횟수: {n}/{max}', ja: '今日の残り報酬回数: {n}/{max}', zh: '今天剩余奖励次数：{n}/{max}' },
  start: { en: 'Go in', ko: '들어가기', ja: '入る', zh: '进去' },
  out: { en: 'Come out', ko: '나오기', ja: '出る', zh: '出来' },
  hotDone: { en: 'All sweaty and refreshed! 🪙 +{n}', ko: '땀 쫙 빼고 개운해요! 🪙 +{n}', ja: '汗をかいてスッキリ！🪙 +{n}', zh: '出了一身汗，好舒服！🪙 +{n}' },
  hotDoneFree: { en: 'All sweaty and refreshed!', ko: '땀 쫙 빼고 개운해요!', ja: '汗をかいてスッキリ！', zh: '出了一身汗，好舒服！' },
  iceCombo: { en: 'Hot then cold: the best! 🪙 +{n}', ko: '뜨겁고 차갑게, 최고예요! 🪙 +{n}', ja: '温冷交代、最高！🪙 +{n}', zh: '先热后冷，太爽了！🪙 +{n}' },
  iceComboFree: { en: 'Hot then cold: the best!', ko: '뜨겁고 차갑게, 최고예요!', ja: '温冷交代、最高！', zh: '先热后冷，太爽了！' },
  iceDone: { en: 'Brr, nicely cooled down.', ko: '으슬으슬, 시원해졌어요.', ja: 'ブルッ、涼しくなりました。', zh: '好冷，凉快了。' },
  gaveUp: { en: 'Too hot already? Try again!', ko: '벌써 나왔어요? 다시 도전!', ja: 'もう出ちゃった？もう一回！', zh: '这么快就出来了？再试一次！' },
  towelOn: { en: 'Wear a sheep towel', ko: '양머리 수건 쓰기', ja: '羊巻きタオルをかぶる', zh: '戴羊角毛巾' },
  towelOff: { en: 'Take off the towel', ko: '양머리 수건 벗기', ja: 'タオルを外す', zh: '摘下毛巾' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class SaunaUI {
  // log: SaunaLog; wallet; onEnter(kind) / onLeave(kind, finished) for
  // emotes; towel: { on(): bool, toggle() }.
  constructor({ root, wallet, log, onEnter, onLeave, towel }) {
    Object.assign(this, { root, wallet, log, onEnter, onLeave, towel });
    this.timer = 0;
  }
  get open() { return !this.root.hidden; }
  show(kind) { this.kind = kind; this.root.hidden = false; this.render(); }
  close() { this._stop(false); this.root.hidden = true; }
  _stop(finished) {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = 0;
    this.onLeave?.(this.kind, finished);
  }

  render(note) {
    this._stop(false);
    const hot = this.kind === 'hot';
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, (hot ? '🔥 ' : '🧊 ') + tt(hot ? 'hot' : 'ice')),
      el('p', 'order-hint', hot ? tt('hotHow', { s: HOT_SECONDS, w: COMBO_WINDOW }) : tt('iceHow', { s: ICE_SECONDS })),
      el('p', 'order-hint', tt('left', { n: this.log.left, max: DAILY_ROUNDS })));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const actions = el('div', 'order-actions');
    const go = el('button', 'primary', (hot ? '🥵 ' : '🥶 ') + tt('start'));
    go.onclick = () => this.run();
    const towel = el('button', 'chip', '🐑 ' + tt(this.towel.on() ? 'towelOff' : 'towelOn'));
    towel.onclick = () => { this.towel.toggle(); this.render(note); };
    actions.append(go, towel);
    this.root.append(actions);
  }

  run() {
    const hot = this.kind === 'hot';
    const total = hot ? HOT_SECONDS : ICE_SECONDS;
    let t = 0;
    const bar = el('div', 'sauna-meter ' + (hot ? 'hot' : 'ice'));
    const fill = el('div', 'sauna-fill');
    bar.append(fill);
    const label = el('p', 'karaoke-status', `0 / ${total}s`);
    const out = el('button', 'chip', tt('out'));
    out.onclick = () => this.render(tt('gaveUp'));
    const actions = el('div', 'order-actions');
    actions.append(out);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, (hot ? '🔥 ' : '🧊 ') + tt(hot ? 'hot' : 'ice')), bar, label, actions);
    this.onEnter?.(this.kind);
    this.timer = setInterval(() => {
      t += 0.25;
      fill.style.width = `${Math.min(100, (t / total) * 100)}%`;
      label.textContent = `${Math.min(total, Math.floor(t))} / ${total}s`;
      if (t >= total) this.finish();
    }, 250);
  }

  finish() {
    this._stop(true);
    let note;
    if (this.kind === 'hot') {
      const n = this.log.finishHot();
      if (n) this.wallet.add(n, undefined, { r: 'sauna' });
      note = '🎉 ' + (n ? tt('hotDone', { n }) : tt('hotDoneFree'));
    } else {
      const r = this.log.finishIce();
      if (r.coins) this.wallet.add(r.coins, undefined, { r: 'sauna' });
      note = r.combo ? '🎉 ' + (r.coins ? tt('iceCombo', { n: r.coins }) : tt('iceComboFree')) : tt('iceDone');
    }
    this.render(note);
  }
}
