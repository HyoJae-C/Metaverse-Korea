// Tteokbokki stall panel (rules in core/pocha-game.js): customers order in
// Korean, you pick the spice and toppings and serve. The start screen also
// offers a delivery run (core/delivery.js, driven from main.js).
import { getLanguage } from '../core/i18n.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import { POCHA_GAME, CUSTOMERS, PATIENCE, SPICE, TOPPINGS, makeOrder, orderLine, rightBowl, servePoints, tipFor } from '../core/pocha-game.js';

export const L = (o) => o[getLanguage()] || o.en;
const T = {
  title: { en: 'Tteokbokki stall', ko: '떡볶이 포장마차', ja: 'トッポッキ屋台', zh: '炒年糕小摊' },
  howTo: {
    en: 'Customers order out loud in Korean. Pick how spicy and the toppings they asked for, then serve before they get tired of waiting. Right bowls earn tips.',
    ko: '손님이 한국어로 주문해요. 맵기와 토핑을 주문대로 골라서, 손님이 지치기 전에 내주세요. 맞게 내면 팁을 받아요.',
    ja: 'お客さんが韓国語で注文します。辛さとトッピングを注文どおりに選んで、待ちくたびれる前に出しましょう。正解ならチップがもらえます。',
    zh: '顾客用韩语点单。按点单选好辣度和配料，在顾客等不及之前端上。做对了能拿小费。',
  },
  cook: { en: 'Open the stall', ko: '장사 시작', ja: '営業スタート', zh: '开始营业' },
  deliver: { en: 'Delivery run (bike)', ko: '따릉이 배달하기', ja: '自転車で配達', zh: '骑车送外卖' },
  deliverHow: {
    en: 'Take an order to another shop before time runs out. Grab a bike at a bike station!',
    ko: '시간 안에 다른 가게로 배달해요. 자전거 대여소에서 따릉이를 타면 빨라요!',
    ja: '時間内にほかのお店へ届けます。自転車ステーションで自転車を借りると速い！',
    zh: '在时限内把外卖送到另一家店。去自行车站骑车会更快！',
  },
  customer: { en: 'Customer {n}/{all}', ko: '손님 {n}/{all}', ja: 'お客さん {n}/{all}', zh: '顾客 {n}/{all}' },
  spice: { en: 'How spicy', ko: '맵기', ja: '辛さ', zh: '辣度' },
  toppings: { en: 'Toppings', ko: '토핑', ja: 'トッピング', zh: '配料' },
  serve: { en: 'Serve', ko: '내기', ja: '出す', zh: '上菜' },
  right: { en: 'Thank you! 🪙 +{n} tip', ko: '감사합니다! 팁 🪙 +{n}', ja: 'ありがとう！チップ 🪙 +{n}', zh: '谢谢！小费 🪙 +{n}' },
  wrong: { en: "That's not what I ordered…", ko: '이거 제가 시킨 거 아닌데요…', ja: 'これ、頼んだのと違います…', zh: '这不是我点的……' },
  left: { en: 'The customer gave up and left.', ko: '손님이 기다리다 가 버렸어요.', ja: 'お客さんは待ちきれずに帰りました。', zh: '顾客等不及走了。' },
  meaning: { en: 'Meaning', ko: '뜻', ja: '意味', zh: '意思' },
  score: { en: 'Score {n} · tips 🪙 {tips}', ko: '점수 {n} · 팁 🪙 {tips}', ja: 'スコア {n} · チップ 🪙 {tips}', zh: '得分 {n} · 小费 🪙 {tips}' },
  again: { en: 'Again', ko: '한 번 더', ja: 'もう一回', zh: '再来一次' },
  best: { en: 'Best: {m}', ko: '최고 기록: {m}', ja: 'ベスト: {m}', zh: '最佳：{m}' },
  noMedal: { en: 'No medal yet', ko: '아직 메달 없음', ja: 'まだメダルなし', zh: '还没有奖牌' },
  medal: { en: '{m} medal! 🪙 +{n}', ko: '{m} 메달! 🪙 +{n}', ja: '{m}メダル！🪙 +{n}', zh: '{m}奖牌！🪙 +{n}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
export const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const tt = (k, v) => fmt(L(T[k]), v);
const MEDAL = { gold: { en: 'Gold', ko: '금', ja: '金', zh: '金' }, silver: { en: 'Silver', ko: '은', ja: '銀', zh: '银' }, bronze: { en: 'Bronze', ko: '동', ja: '銅', zh: '铜' } };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class PochaUI {
  // wallet: { add(n) }; onSay(line); onDeliver(): start a delivery run;
  // onMedal(medal, coins).
  constructor({ root, wallet, onSay, onDeliver, onMedal, rand = Math.random }) {
    Object.assign(this, { root, wallet, onSay, onDeliver, onMedal, rand });
    this.medals = new Medals();
    this.timer = 0;
  }

  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.renderStart(); }
  close() { clearInterval(this.timer); this.root.hidden = true; }

  _frame() {
    clearInterval(this.timer);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🌶️ ' + tt('title')));
  }

  renderStart() {
    this._frame();
    const best = this.medals.best(POCHA_GAME);
    const cook = el('button', 'primary', '🥘 ' + tt('cook'));
    cook.onclick = () => this.play();
    const go = el('button', 'chip', '🚲 ' + tt('deliver'));
    go.onclick = () => { this.close(); this.onDeliver?.(); };
    const actions = el('div', 'order-actions');
    actions.append(go, cook);
    this.root.append(
      el('p', 'order-hint', tt('howTo')),
      el('p', 'grill-best', best ? tt('best', { m: medalIcon(best) + ' ' + L(MEDAL[best]) }) : tt('noMedal')),
      el('p', 'order-hint', '🚲 ' + tt('deliverHow')),
      actions,
    );
  }

  play() {
    this.round = { i: 0, score: 0, tips: 0 };
    this.next();
  }

  next() {
    const r = this.round;
    if (r.i >= CUSTOMERS) { this.finish(); return; }
    this._frame();
    const order = makeOrder(this.rand);
    const line = orderLine(order);
    const bowl = { spice: null, toppings: new Set() };
    let left = PATIENCE;
    const faces = ['🧑', '👩', '👨‍🦱', '👧', '🧓', '👩‍🦰'];
    const who = el('div', 'pocha-customer');
    who.append(el('span', 'pocha-face', faces[Math.floor(this.rand() * faces.length)]), el('small', null, tt('customer', { n: r.i + 1, all: CUSTOMERS })));
    const say = el('div', 'pocha-say');
    const mean = el('small', 'pocha-mean', '');
    const showMean = el('button', 'chip pocha-mean-btn', '❓ ' + tt('meaning'));
    showMean.onclick = () => {
      const s = SPICE.find((x) => x.id === order.spice);
      mean.textContent = [L(s.name), ...order.toppings.map((id) => L(TOPPINGS.find((x) => x.id === id).name))].join(' + ');
      showMean.hidden = true;
    };
    say.append(el('strong', null, '“' + line.ko + '”'), el('small', 'order-rom', line.rom), mean, showMean);
    const patience = el('div', 'fish-meter');
    const fill = el('i');
    patience.append(fill);
    this.onSay?.([line.ko, line.rom, '']);

    const spiceRow = el('div', 'pocha-row');
    const spiceBtns = SPICE.map((s) => {
      const b = el('button', 'chip', `${s.emoji} ${s.ko}`);
      b.onclick = () => { bowl.spice = s.id; paint(); };
      spiceRow.append(b);
      return [s.id, b];
    });
    const topRow = el('div', 'pocha-row');
    const topBtns = TOPPINGS.map((x) => {
      const b = el('button', 'chip', `${x.emoji} ${x.ko}`);
      b.onclick = () => { bowl.toppings.has(x.id) ? bowl.toppings.delete(x.id) : bowl.toppings.add(x.id); paint(); };
      topRow.append(b);
      return [x.id, b];
    });
    const pot = el('p', 'pocha-bowl', '🥘');
    const serve = el('button', 'primary', '🥢 ' + tt('serve'));
    const paint = () => {
      for (const [id, b] of spiceBtns) b.setAttribute('aria-pressed', String(bowl.spice === id));
      for (const [id, b] of topBtns) b.setAttribute('aria-pressed', String(bowl.toppings.has(id)));
      pot.textContent = '🥘' + [...bowl.toppings].map((id) => TOPPINGS.find((x) => x.id === id).emoji).join('') + (bowl.spice ? ' ' + SPICE.find((s) => s.id === bowl.spice).emoji : '');
      serve.disabled = !bowl.spice;
      fill.style.width = (left / PATIENCE) * 100 + '%';
    };
    const done = (ok, timedOut = false) => {
      clearInterval(this.timer);
      r.score += servePoints(ok, left);
      const tip = tipFor(ok, left);
      if (tip) { r.tips += tip; this.wallet.add(tip); }
      this.onSay?.(ok ? ['감사합니다! 맛있겠다!', 'gamsahamnida! masitgetda!', tt('right', { n: tip })] : timedOut ? ['너무 오래 걸리네요…', 'neomu orae geollineyo…', tt('left')] : ['이거 제가 시킨 거 아닌데요…', 'igeo jega sikin geo anindeyo…', tt('wrong')]);
      r.i++;
      this.root.append(el('p', 'order-hint pocha-result ' + (ok ? 'ok' : 'bad'), ok ? tt('right', { n: tip }) : timedOut ? tt('left') : tt('wrong')));
      serve.disabled = true;
      setTimeout(() => { if (this.open && this.round === r) this.next(); }, 1100);
    };
    serve.onclick = () => done(rightBowl(order, { spice: bowl.spice, toppings: [...bowl.toppings] }));
    const actions = el('div', 'order-actions');
    actions.append(serve);
    this.root.append(who, say, patience, el('strong', 'pocha-label', tt('spice')), spiceRow, el('strong', 'pocha-label', tt('toppings')), topRow, pot, actions);
    paint();
    this.timer = setInterval(() => {
      left -= 0.1;
      paint();
      if (left <= 0) done(false, true);
    }, 100);
  }

  finish() {
    this._frame();
    const r = this.round;
    const medal = medalFor(r.score);
    const coins = medal ? this.medals.add(POCHA_GAME, medal) : 0;
    if (coins) this.wallet.add(coins);
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', medal ? medalIcon(medal) : '🥘'),
      el('strong', null, medal ? L(MEDAL[medal]) : tt('noMedal')),
      el('p', null, tt('score', { n: r.score, tips: r.tips })),
    );
    if (coins) res.append(el('p', 'order-hint', tt('medal', { m: L(MEDAL[medal]), n: coins })));
    const again = el('button', 'primary', tt('again'));
    again.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(res, actions);
    this.onMedal?.(medal, coins);
  }
}
