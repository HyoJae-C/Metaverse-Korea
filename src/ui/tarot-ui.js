// Tarot reading at Starlight Tarot (별빛 타로), Hongdae: pay, the reader
// shuffles, you pick three face-down cards (past, present, future), they flip
// over and the reader explains each. Just for fun; the deck is in data/tarot.js.
import { TAROT_CARDS, TAROT_COST, POSITIONS, ROMAN, shuffleDeck } from '../data/tarot.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Tarot reading', ko: '타로 보기', ja: 'タロット占い', zh: '塔罗占卜' },
  howTo: {
    en: 'Think of a question, then pick three cards from the spread: your past, your present and your future. Just for fun!',
    ko: '궁금한 걸 떠올리고 펼쳐진 카드에서 세 장을 골라요. 과거, 현재, 미래 순서예요. 재미로 보는 거예요!',
    ja: '質問を思い浮かべて、並んだカードから3枚選んでください。過去、現在、未来の順です。お遊びです！',
    zh: '想好一个问题，从摊开的牌中选三张：过去、现在和未来。仅供娱乐！',
  },
  start: { en: 'Shuffle and read · 🪙 {n}', ko: '섞고 타로 보기 · 🪙 {n}', ja: 'シャッフルして占う · 🪙 {n}', zh: '洗牌占卜 · 🪙 {n}' },
  again: { en: 'Another reading · 🪙 {n}', ko: '한 번 더 · 🪙 {n}', ja: 'もう一度 · 🪙 {n}', zh: '再占一次 · 🪙 {n}' },
  pick: { en: 'Pick a card for your {pos} ({i}/3)', ko: '{pos} 카드를 골라 주세요 ({i}/3)', ja: '{pos}のカードを選んで（{i}/3）', zh: '请选一张代表{pos}的牌（{i}/3）' },
  done: { en: 'Your reading', ko: '타로 풀이', ja: 'あなたの占い結果', zh: '你的占卜结果' },
  noCoins: { en: 'You need 🪙 {n}.', ko: '🪙 {n}개가 필요해요.', ja: '🪙 {n}枚必要です。', zh: '需要 🪙 {n}。' },
  fun: { en: 'For fun only. The future is yours to make.', ko: '재미로만 봐 주세요. 미래는 직접 만드는 거예요.', ja: 'お遊びです。未来は自分でつくるもの。', zh: '仅供娱乐。未来由你自己创造。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const cardById = (n) => TAROT_CARDS[n];

// The face of a card: numeral, symbol and name (made here, not a scan of a deck).
export function cardFace(card) {
  const f = el('div', 'tarot-face');
  f.append(el('span', 'tarot-num', ROMAN[card.n]), el('span', 'tarot-icon', card.icon), el('span', 'tarot-name', L(card.name)));
  return f;
}

export class TarotUI {
  // wallet: { spend(n, note) }; onRead(cards): after the third card flips.
  constructor({ root, wallet, onRead, onPick, rand = Math.random }) {
    Object.assign(this, { root, wallet, onRead, onPick, rand });
    this.state = null; // { deck, picked: [card numbers] }
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.state = null; this.render(); }
  close() { this.root.hidden = true; this.state = null; }

  start() {
    if (!this.wallet.spend(TAROT_COST, { name: T.title })) { this.render(tt('noCoins', { n: TAROT_COST })); return; }
    this.state = { deck: shuffleDeck(this.rand), picked: [] };
    this.render();
  }

  pick(i) {
    const s = this.state;
    if (!s || s.picked.length >= 3 || s.picked.includes(s.deck[i])) return;
    s.picked.push(s.deck[i]);
    s.taken = [...(s.taken || []), i];
    this.onPick?.(s.picked.length);
    this.render();
    if (s.picked.length === 3) this.onRead?.(s.picked.map(cardById));
  }

  render(note) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const s = this.state;
    const parts = [x, el('h3', null, '🔮 ' + tt('title'))];
    if (!s) parts.push(el('p', 'order-hint', tt('howTo')));
    // The three slots: past, present, future.
    const slots = el('div', 'tarot-slots');
    POSITIONS.forEach((pos, k) => {
      const slot = el('div', 'tarot-slot');
      const n = s?.picked[k];
      const card = el('div', 'tarot-card' + (n != null ? ' up' : ''));
      if (n != null) card.append(cardFace(cardById(n)));
      slot.append(el('b', null, L(pos.name)), card);
      slots.append(slot);
    });
    parts.push(slots);
    if (s && s.picked.length < 3) {
      parts.push(el('p', 'order-hint', tt('pick', { pos: L(POSITIONS[s.picked.length].name), i: s.picked.length + 1 })));
      const spread = el('div', 'tarot-spread');
      s.deck.forEach((n, i) => {
        const b = el('button', 'tarot-back');
        b.setAttribute('aria-label', String(i + 1));
        b.style.setProperty('--tilt', `${(i - 10.5) * 1.6}deg`);
        if (s.taken?.includes(i)) b.disabled = true;
        b.onclick = () => this.pick(i);
        spread.append(b);
      });
      parts.push(spread);
    }
    if (s && s.picked.length === 3) {
      const list = el('div', 'tarot-reading');
      s.picked.forEach((n, k) => {
        const card = cardById(n);
        const row = el('p', null);
        row.append(el('b', null, `${L(POSITIONS[k].name)} · ${card.icon} ${L(card.name)}`), el('span', null, L(card.mean)));
        list.append(row);
      });
      parts.push(el('h4', null, tt('done')), list, el('p', 'fine', tt('fun')));
    }
    if (note) parts.push(el('p', 'order-hint claw-note', note));
    if (!s || s.picked.length === 3) {
      const go = el('button', 'primary', '🃏 ' + tt(s ? 'again' : 'start', { n: TAROT_COST }));
      go.onclick = () => this.start();
      const actions = el('div', 'order-actions');
      actions.append(go);
      parts.push(actions);
    }
    this.root.replaceChildren(...parts);
  }
}
