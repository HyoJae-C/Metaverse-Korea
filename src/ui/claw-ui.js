// Claw machine panel (rules in core/claw-game.js): pay, watch the claw swing,
// press DROP over a prize. Prizes are plushies (for your home), never money.
import { CLAW_COST, clawX, layPrizes, drop } from '../core/claw-game.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Claw machine', ko: '인형뽑기', ja: 'クレーンゲーム', zh: '抓娃娃机' },
  howTo: {
    en: 'The claw swings left and right. Press DROP when it is right above a prize. Plushies you win can be placed in your home.',
    ko: '집게가 좌우로 움직여요. 경품 바로 위에 왔을 때 내리기를 누르세요. 뽑은 인형은 내 집에 놓을 수 있어요.',
    ja: 'アームが左右に動きます。景品の真上に来たら「落とす」を押して。取ったぬいぐるみは家に飾れます。',
    zh: '爪子会左右摆动。在奖品正上方时按“放下”。抓到的玩偶可以摆在家里。',
  },
  play: { en: 'Play · 🪙 {n}', ko: '한 판 · 🪙 {n}', ja: '1回 · 🪙 {n}', zh: '玩一次 · 🪙 {n}' },
  drop: { en: 'DROP', ko: '내리기', ja: '落とす', zh: '放下' },
  noCoins: { en: 'You need 🪙 {n}.', ko: '🪙 {n}이 필요해요.', ja: '🪙 {n} 必要です。', zh: '需要 🪙 {n}。' },
  miss: { en: 'Missed! Nothing under the claw.', ko: '꽝! 집게 밑에 아무것도 없었어요.', ja: 'ハズレ！アームの下に何もありませんでした。', zh: '没抓到！爪子下面什么都没有。' },
  slip: { en: 'So close! It slipped out of the claw.', ko: '아깝다! 집게에서 미끄러졌어요.', ja: '惜しい！アームから落ちました。', zh: '好可惜！从爪子里滑掉了。' },
  gotTee: { en: 'You got the {name}! It\'s in your bag.', ko: '{name} 획득! 가방에 넣었어요.', ja: '{name}をゲット！バッグに入れました。', zh: '抓到{name}！已放进背包。' },
  gotPlush: { en: 'You got the {name}! Put it in your home with Decorate.', ko: '{name} 획득! 내 집 꾸미기에서 놓을 수 있어요.', ja: '{name}をゲット！家の模様替えで置けます。', zh: '抓到{name}！可以在家里装饰时摆放。' },
  hadTee: { en: 'You already have the {name}, so it goes back in the machine.', ko: '{name}는 이미 있어서 기계에 다시 넣었어요.', ja: '{name}はもう持っているので、機械に戻しました。', zh: '你已经有{name}了，放回机器里。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class ClawUI {
  // wallet: { coins, spend(n), add(n) }; give(itemId): true if new;
  // itemName(itemId); onWin(prize).
  constructor({ root, wallet, give, itemName, onWin, rand = Math.random }) {
    Object.assign(this, { root, wallet, give, itemName, onWin, rand });
    this.raf = 0;
    this.tries = 0;
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.pit = layPrizes(this.rand); this.render(); }
  close() { cancelAnimationFrame(this.raf); this.root.hidden = true; }

  render(note) {
    cancelAnimationFrame(this.raf);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🧸 ' + tt('title')), el('p', 'order-hint', tt('howTo')));
    const cv = el('canvas', 'claw-pit');
    cv.width = 600; cv.height = 300;
    this.root.append(cv);
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const play = el('button', 'primary', '🕹️ ' + tt('play', { n: CLAW_COST }));
    play.onclick = () => this.play(cv, play);
    const actions = el('div', 'order-actions');
    actions.append(play);
    this.root.append(actions);
    this.draw(cv, 0.5, 0);
  }

  draw(cv, x, depth, held = null) {
    const c = cv.getContext('2d');
    c.fillStyle = '#ffe3f1'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#ffc2e0'; c.fillRect(0, 230, cv.width, 70); // the pit floor
    c.font = '46px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const p of this.pit) if (p !== held) c.fillText(p.prize.emoji, p.x * cv.width, 240);
    const cx = x * cv.width, cy = 30 + depth * 190;
    c.strokeStyle = '#6b6478'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 18); c.lineTo(cv.width, 18); c.stroke(); // rail
    c.beginPath(); c.moveTo(cx, 18); c.lineTo(cx, cy); c.stroke(); // cable
    c.beginPath(); c.moveTo(cx - 22, cy + 18); c.lineTo(cx, cy); c.lineTo(cx + 22, cy + 18); c.stroke(); // claw
    if (held) c.fillText(held.prize.emoji, cx, cy + 34);
  }

  play(cv, btn) {
    if (!this.wallet.spend(CLAW_COST)) { this.render(tt('noCoins', { n: CLAW_COST })); return; }
    this.tries++;
    btn.textContent = '⬇️ ' + tt('drop');
    const t0 = performance.now();
    const speed = 1 + Math.min(0.6, this.tries * 0.05);
    let x = 0.5;
    const swing = (now) => {
      x = clawX((now - t0) / 1000, speed);
      this.draw(cv, x, 0);
      this.raf = requestAnimationFrame(swing);
    };
    this.raf = requestAnimationFrame(swing);
    btn.onclick = () => {
      cancelAnimationFrame(this.raf);
      btn.disabled = true;
      const res = drop(this.pit, x, this.rand);
      this.animateDrop(cv, x, res);
    };
  }

  animateDrop(cv, x, res) {
    const t0 = performance.now();
    const step = (now) => {
      const u = (now - t0) / 1000;
      // down 0.8 s, then up 0.8 s (holding the prize unless it slips halfway)
      const depth = u < 0.8 ? u / 0.8 : Math.max(0, 1 - (u - 0.8) / 0.8);
      const holding = res && u >= 0.8 && !(res.slipped && u > 1.2);
      this.draw(cv, x, depth, holding ? res.at : null);
      if (u < 1.7) { this.raf = requestAnimationFrame(step); return; }
      this.result(res);
    };
    this.raf = requestAnimationFrame(step);
  }

  result(res) {
    if (!res) { this.render(tt('miss')); return; }
    if (res.slipped) { this.render(tt('slip')); return; }
    const p = res.prize;
    this.pit = this.pit.filter((q) => q !== res.at);
    if (this.pit.length < 3) this.pit = layPrizes(this.rand);
    const name = this.itemName(p.item);
    const note = this.give(p.item) ? '🎉 ' + tt('gotPlush', { name }) : tt('hadTee', { name });
    this.onWin?.(p);
    this.render(note);
  }
}
