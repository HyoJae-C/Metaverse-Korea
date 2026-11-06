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
  fullSwap: { en: 'Your bag is full ({cap} slots), so {name} in your hand will be thrown away. Take this one anyway?', ko: '가방이 가득 차서 ({cap}칸) 손에 든 {name}은(는) 버려져요. 그래도 바꿀까요?', ja: 'バッグがいっぱい（{cap}枠）なので、手に持っている{name}は捨てられます。それでも交換しますか？', zh: '背包满了（{cap}格），手上的{name}会被丢掉。还要换吗？', es: 'Tu bolsa está llena ({cap} huecos), así que {name} que llevas en la mano se tirará. ¿Lo cambias igualmente?', ar: 'حقيبتك ممتلئة ({cap} خانة)، لذا سيُرمى {name} الذي في يدك. هل تبدّله على أي حال؟', vi: 'Túi đã đầy ({cap} ô) nên {name} trên tay sẽ bị bỏ đi. Vẫn đổi chứ?', hi: 'आपका बैग भरा है ({cap} खाने), इसलिए हाथ में रखा {name} फेंक दिया जाएगा। फिर भी बदलें?', id: 'Tasmu penuh ({cap} slot), jadi {name} di tanganmu akan dibuang. Tetap tukar?' },
  autoStow: { en: '🎒 {name} went into your bag ({n}/{cap}).', ko: '🎒 들고 있던 {name}은(는) 가방에 넣었어요 ({n}/{cap}).', ja: '🎒 持っていた{name}はバッグにしまいました（{n}/{cap}）。', zh: '🎒 手上的{name}已放进背包（{n}/{cap}）。', es: '🎒 {name} fue a tu bolsa ({n}/{cap}).', ar: '🎒 وُضع {name} في حقيبتك ({n}/{cap}).', vi: '🎒 Đã cất {name} vào túi ({n}/{cap}).', hi: '🎒 {name} आपके बैग में रख दिया ({n}/{cap})।', id: '🎒 {name} dimasukkan ke tasmu ({n}/{cap}).' },
  tabBag: { en: 'Bag', ko: '가방', ja: 'バッグ', zh: '背包', es: 'Bolsa', ar: 'الحقيبة', vi: 'Túi', hi: 'बैग', id: 'Tas' },
  tabCloset: { en: 'Wardrobe', ko: '옷장', ja: 'クローゼット', zh: '衣橱', es: 'Armario', ar: 'خزانة الملابس', vi: 'Tủ đồ', hi: 'अलमारी', id: 'Lemari' },
  closetEmpty: { en: 'No clothes yet. Buy some in a fashion shop and they will hang here.', ko: '아직 옷이 없어요. 옷 가게에서 사면 여기에 걸려요.', ja: 'まだ服がありません。服屋で買うとここに掛かります。', zh: '还没有衣服。在服装店买了就会挂在这里。', es: 'Aún no tienes ropa. Cómprala en una tienda de moda y aparecerá aquí.', ar: 'لا ملابس بعد. اشترِ من متجر أزياء وستظهر هنا.', vi: 'Chưa có quần áo. Mua ở cửa hàng thời trang thì sẽ treo ở đây.', hi: 'अभी कोई कपड़े नहीं। फ़ैशन दुकान से खरीदें, वे यहाँ टंगेंगे।', id: 'Belum ada pakaian. Beli di toko fesyen dan akan tergantung di sini.' },
  closetNote: { en: 'Clothes don\'t use bag slots.', ko: '옷은 가방 칸을 차지하지 않아요.', ja: '服はバッグの枠を使いません。', zh: '衣服不占背包格子。', es: 'La ropa no ocupa huecos de la bolsa.', ar: 'الملابس لا تشغل خانات الحقيبة.', vi: 'Quần áo không chiếm ô trong túi.', hi: 'कपड़े बैग के खाने नहीं लेते।', id: 'Pakaian tidak memakai slot tas.' },
  owned: { en: 'Collection (no slots used)', ko: '소장품 (칸 차지 안 함)', ja: 'コレクション（枠を使いません）', zh: '收藏（不占格子）' },
};

export class BagUI {
  // describe(entry) → { emoji, name, desc, canHold }
  // extra() → nodes shown under the bag slots (the collection);
  // closet() → { nodes, count } for the Wardrobe tab (clothes you own).
  constructor({ root, bag, describe, holding, onHold, onDrop, extra, closet }) {
    Object.assign(this, { root, bag, describe, holding, onHold, onDrop, extra, closet });
    this.sel = -1;
    this.tab = 'bag';
    bag.onChange(() => { if (!root.hidden) this.render(); });
  }

  show(tab = 'bag') { this.sel = -1; this.tab = tab; this.root.hidden = false; this.render(); }
  hide() { this.root.hidden = true; }

  render() {
    const { bag, root } = this;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.hide();
    const head = el('div', 'bag-head');
    head.append(el('strong', 'wallet-title', '🎒 ' + L(BAG_TEXT.title)), el('span', 'bag-count', fmt(L(BAG_TEXT.count), { n: bag.size, cap: bag.cap })));
    // Two tabs: the bag's slots, and the wardrobe (clothes you own).
    const closet = this.closet ? this.closet() : null;
    const tabs = el('div', 'bag-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [key, label] of [['bag', '🎒 ' + L(BAG_TEXT.tabBag)], ['closet', '👗 ' + L(BAG_TEXT.tabCloset) + (closet?.count ? ` ${closet.count}` : '')]]) {
      if (key === 'closet' && !closet) continue;
      const b = el('button', 'chip' + (this.tab === key ? ' on' : ''), label);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.tab === key));
      b.onclick = () => { if (this.tab !== key) { this.tab = key; this.sel = -1; this.render(); } };
      tabs.append(b);
    }
    if (this.tab === 'closet' && closet) {
      const body = closet.count ? closet.nodes : [el('p', 'fine bag-closet-empty', L(BAG_TEXT.closetEmpty))];
      root.replaceChildren(x, head, tabs, ...body, el('p', 'fine bag-more', L(BAG_TEXT.closetNote)));
      return;
    }
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
        if (e.kind === 'coffee' || e.kind === 'glass') b.append(el('small', '', String(e.sips)));
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
    root.replaceChildren(x, head, tabs, grid, info, el('p', 'fine bag-more', L(BAG_TEXT.more)), ...more);
  }
}
