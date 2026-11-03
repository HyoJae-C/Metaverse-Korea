// The bag panel: a grid of slots (filled and empty), and for the picked slot
// what it is with "Hold" (take it into your hand) and "Throw away".

import { L, fmt } from './pocha-ui.js';

export const BAG_TEXT = {
  title: { en: 'Bag', ko: '가방', ja: 'バッグ', zh: '背包' },
  count: { en: '{n}/{cap} slots', ko: '{n}/{cap}칸', ja: '{n}/{cap}枠', zh: '{n}/{cap}格' },
  empty: { en: 'Your bag is empty. While holding a drink or a book, tap 📥 Put away.', ko: '가방이 비어 있어요. 음료나 책을 들고 있을 때 📥 넣기를 누르세요.', ja: 'バッグは空です。飲み物や本を持っているときに 📥 しまう を押してください。', zh: '背包是空的。拿着饮料或书时点 📥 放入。' },
  pick: { en: 'Tap an item to use it.', ko: '물건을 누르면 꺼내거나 버릴 수 있어요.', ja: 'アイテムを押すと取り出したり捨てたりできます。', zh: '点物品可以拿出或丢掉。' },
  hold: { en: 'Hold', ko: '손에 들기', ja: '手に持つ', zh: '拿在手上' },
  swap: { en: 'Swap with hand', ko: '손에 든 것과 바꾸기', ja: '手の物と交換', zh: '和手上的交换' },
  drop: { en: 'Throw away', ko: '버리기', ja: '捨てる', zh: '丢掉' },
  dropAsk: { en: 'Throw away {name}?', ko: '{name}을(를) 버릴까요?', ja: '{name}を捨てますか？', zh: '要丢掉{name}吗？' },
  put: { en: 'Put away', ko: '넣기', ja: 'しまう', zh: '放入' },
  stored: { en: 'Put in your bag ({n}/{cap}).', ko: '가방에 넣었어요 ({n}/{cap}).', ja: 'バッグにしまいました（{n}/{cap}）。', zh: '已放入背包（{n}/{cap}）。' },
  full: { en: 'Your bag is full ({cap} slots). Throw something away first.', ko: '가방이 가득 찼어요 ({cap}칸). 먼저 하나를 버려 주세요.', ja: 'バッグがいっぱいです（{cap}枠）。先に何か捨ててください。', zh: '背包满了（{cap}格）。请先丢掉一样东西。' },
  more: { en: 'Bigger bags are coming later.', ko: '가방 칸 늘리기는 나중에 열려요.', ja: 'バッグの拡張は今後追加予定です。', zh: '扩充背包以后开放。' },
  owned: { en: 'Collection (no slots used)', ko: '소장품 (칸 차지 안 함)', ja: 'コレクション（枠を使いません）', zh: '收藏（不占格子）' },
};

export class BagUI {
  // describe(entry) → { emoji, name, desc, canHold }
  constructor({ root, bag, describe, holding, onHold, onDrop, extra }) {
    Object.assign(this, { root, bag, describe, holding, onHold, onDrop, extra });
    this.sel = -1;
    bag.onChange(() => { if (!root.hidden) this.render(); });
  }

  show() { this.sel = -1; this.root.hidden = false; this.render(); }
  hide() { this.root.hidden = true; }

  render() {
    const { bag, root } = this;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.hide();
    const head = el('div', 'bag-head');
    head.append(el('strong', 'wallet-title', '🎒 ' + L(BAG_TEXT.title)), el('span', 'bag-count', fmt(L(BAG_TEXT.count), { n: bag.size, cap: bag.cap })));
    const grid = el('div', 'bag-grid');
    const items = bag.list();
    if (this.sel >= items.length) this.sel = -1;
    for (let i = 0; i < bag.cap; i++) {
      const e = items[i];
      const b = el('button', 'bag-slot' + (e ? '' : ' empty') + (i === this.sel ? ' on' : ''));
      if (e) {
        const d = this.describe(e);
        b.textContent = d.emoji;
        b.title = d.name;
        b.setAttribute('aria-label', d.name);
        if (e.kind === 'coffee') b.append(el('small', '', String(e.sips)));
        b.onclick = () => { this.sel = i === this.sel ? -1 : i; this.render(); };
      } else b.disabled = true;
      grid.append(b);
    }
    const info = el('div', 'bag-info');
    if (this.sel >= 0) {
      const e = items[this.sel], d = this.describe(e);
      info.append(el('strong', '', `${d.emoji} ${d.name}`), el('small', 'fine', d.desc));
      const row = el('div', 'bag-actions');
      if (d.canHold) {
        const h = el('button', 'chip', '✋ ' + L(this.holding() ? BAG_TEXT.swap : BAG_TEXT.hold));
        h.onclick = () => { const i = this.sel; this.sel = -1; this.onHold(i); };
        row.append(h);
      }
      const t = el('button', 'chip', '🗑️ ' + L(BAG_TEXT.drop));
      t.onclick = () => {
        if (!confirm(fmt(L(BAG_TEXT.dropAsk), { name: d.name }))) return;
        const i = this.sel; this.sel = -1; this.onDrop(i);
      };
      row.append(t);
      info.append(row);
    } else info.append(el('small', 'fine', L(items.length ? BAG_TEXT.pick : BAG_TEXT.empty)));
    const more = this.extra ? this.extra() : []; // before replaceChildren detaches them
    root.replaceChildren(x, head, grid, info, el('p', 'fine bag-more', L(BAG_TEXT.more)), ...more);
  }
}
