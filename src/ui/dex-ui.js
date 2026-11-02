// Food dex panel (rules in core/food-dex.js): kinds tried out of all the
// food in town, the total bought, and a card for each food.
import { allFoods } from '../core/food-dex.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Food dex', ko: '음식 도감', ja: '食べ物図鑑', zh: '美食图鉴' },
  summary: { en: 'Kinds tried {k} / {all} · {n} bought in total', ko: '먹어본 음식 {k}종 / 전체 {all}종 · 총 {n}개', ja: '食べた種類 {k} / {all} · 合計 {n}個', zh: '吃过 {k} / {all} 种 · 共 {n} 个' },
  how: { en: 'Food you buy goes in here, even if you take it away.', ko: '산 음식은 가게에서 먹지 않아도 여기에 등록돼요.', ja: '買った食べ物は、店で食べなくてもここに登録されます。', zh: '买过的食物即使没在店里吃也会登记在这里。' },
  unknown: { en: 'Not tried yet', ko: '아직 안 먹어봄', ja: 'まだ食べていない', zh: '还没吃过' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
export const DEX_TEXT = T;
const tt = (k, v) => fmt(L(T[k]), v);
const EMOJI = { cup: '🥤', bread: '🍞', bowl: '🍲', bacon: '🥓', roll: '🍙' };
export const foodEmoji = (p) => (p.model === 'cup' && /coffee|americano|latte|drip|mocha/i.test(p.id) ? '☕' : EMOJI[p.model] || '🍽️');
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class DexUI {
  constructor({ root, dex, stores, localName }) {
    Object.assign(this, { root, dex, stores, localName });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  summary() {
    return tt('summary', { k: this.dex.kinds, all: allFoods(this.stores()).length, n: this.dex.total });
  }
  show() {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const grid = el('div', 'dex-grid');
    for (const f of allFoods(this.stores())) {
      const n = this.dex.count(f.key);
      const card = el('div', 'dex-card' + (n ? '' : ' locked'));
      card.append(
        el('span', 'dex-emoji', n ? foodEmoji(f.product) : '❔'),
        el('strong', null, n ? this.localName(f.product.name) : '???'),
        el('small', null, this.localName(f.store.name)),
        el('em', null, n ? `× ${n}` : tt('unknown')),
      );
      grid.append(card);
    }
    this.root.replaceChildren(x, el('h3', null, '🍽️ ' + tt('title')), el('p', 'dex-summary', this.summary()), el('p', 'order-hint', tt('how')), grid);
  }
}
