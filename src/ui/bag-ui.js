// The bag panel: a grid of slots (filled and empty), and for the picked slot
// what it is with "Hold" (take it into your hand) and "Throw away".

import { L, fmt } from './pocha-ui.js';
import { CLOSET_KINDS, CLOSET_SORTS, sortCloset } from '../core/closet.js';
import { t } from '../core/i18n.js';

// The kind icons (ui/closet-icons.js) load the first time the wardrobe opens;
// until then a piece shows its own emoji.
let closetSvg = null, svgLoad = null;
const loadClosetSvgs = (redraw) => (svgLoad ||= import('./closet-icons.js').then((m) => { closetSvg = m.closetSvg; redraw(); }));
// A piece's icon in the wardrobe: its kind's icon with a dot of its colour.
function closetIcon(d, el) {
  const icon = el('span', 'closet-icon');
  const svg = closetSvg?.(d.kind);
  if (svg) icon.innerHTML = svg;
  else icon.textContent = d.emoji;
  if (d.color) {
    const dot = el('i', 'closet-dot');
    dot.style.background = d.color;
    icon.append(dot);
  }
  return icon;
}

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
  fullSwap: { en: 'Your bag is full ({cap} slots), so {name} in your hand will be thrown away. Take this one anyway?', ko: '가방이 가득 차서 ({cap}칸) 손에 든 {name}은(는) 버려져요. 그래도 바꿀까요?', ja: 'バッグがいっぱい（{cap}枠）なので、手に持っている{name}は捨てられます。それでも交換しますか？', zh: '背包满了（{cap}格），手上的{name}会被丢掉。还要换吗？', es: 'Tu bolsa está llena ({cap} huecos), así que {name} que llevas en la mano se tirará. ¿Lo cambias igualmente?', ar: 'حقيبتك ممتلئة ({cap} خانة)، لذا سيُرمى {name} الذي في يدك. هل تبدّله على أي حال؟', vi: 'Túi đã đầy ({cap} ô) nên {name} trên tay sẽ bị bỏ đi. Vẫn đổi chứ?', hi: 'आपका बैग भरा है ({cap} खाने), इसलिए हाथ में रखा {name} फेंक दिया जाएगा। फिर भी बदलें?', fr: 'Ton sac est plein ({cap} places), donc {name} dans ta main sera jeté. Prendre celui-ci quand même ?', th: 'กระเป๋าเต็มแล้ว ({cap} ช่อง) {name} ที่ถืออยู่จะถูกทิ้ง รับอันนี้อยู่ดีไหม?', id: 'Tasmu penuh ({cap} slot), jadi {name} di tanganmu akan dibuang. Tetap tukar?' },
  autoStow: { en: '🎒 {name} went into your bag ({n}/{cap}).', ko: '🎒 들고 있던 {name}은(는) 가방에 넣었어요 ({n}/{cap}).', ja: '🎒 持っていた{name}はバッグにしまいました（{n}/{cap}）。', zh: '🎒 手上的{name}已放进背包（{n}/{cap}）。', es: '🎒 {name} fue a tu bolsa ({n}/{cap}).', ar: '🎒 وُضع {name} في حقيبتك ({n}/{cap}).', vi: '🎒 Đã cất {name} vào túi ({n}/{cap}).', hi: '🎒 {name} आपके बैग में रख दिया ({n}/{cap})।', fr: '🎒 {name} est dans ton sac ({n}/{cap}).', th: '🎒 ใส่ {name} ในกระเป๋าแล้ว ({n}/{cap})', id: '🎒 {name} dimasukkan ke tasmu ({n}/{cap}).' },
  tabBag: { en: 'Bag', ko: '가방', ja: 'バッグ', zh: '背包', es: 'Bolsa', ar: 'الحقيبة', vi: 'Túi', hi: 'बैग', fr: 'Sac', th: 'กระเป๋า', id: 'Tas' },
  tabItems: { en: 'Items', ko: '소지품', ja: '持ち物', zh: '随身物品', es: 'Objetos', ar: 'الأغراض', vi: 'Đồ dùng', hi: 'सामान', fr: 'Affaires', th: 'ของใช้', id: 'Barang' },
  closetPick: { en: 'Tap clothes to put them on or take them off.', ko: '옷을 누르면 입거나 벗을 수 있어요.', ja: '服を押すと着たり脱いだりできます。', zh: '点衣服可以穿上或脱下。', es: 'Toca una prenda para ponértela o quitártela.', ar: 'اضغط على قطعة لترتديها أو تخلعها.', vi: 'Chạm vào quần áo để mặc hoặc cởi.', hi: 'पहनने या उतारने के लिए कपड़े पर टैप करें।', fr: 'Touche un vêtement pour le mettre ou l\'enlever.', th: 'แตะเสื้อผ้าเพื่อใส่หรือถอด', id: 'Ketuk pakaian untuk memakai atau melepasnya.' },
  wearing: { en: 'Wearing', ko: '착용 중', ja: '着用中', zh: '穿着中', es: 'Puesto', ar: 'ترتديه', vi: 'Đang mặc', hi: 'पहना हुआ', fr: 'Porté', th: 'กำลังใส่', id: 'Dipakai' },
  kindAll: { en: 'All', ko: '전체', ja: 'すべて', zh: '全部', es: 'Todo', ar: 'الكل', vi: 'Tất cả', hi: 'सभी', fr: 'Tout', th: 'ทั้งหมด', id: 'Semua' },
  kind: {
    top: { en: 'Tops', ko: '상의', ja: 'トップス', zh: '上衣', es: 'Partes de arriba', ar: 'قطع علوية', vi: 'Áo', hi: 'ऊपर के कपड़े', fr: 'Hauts', th: 'เสื้อ', id: 'Atasan' },
    bottom: { en: 'Bottoms', ko: '하의', ja: 'ボトムス', zh: '下装', es: 'Partes de abajo', ar: 'قطع سفلية', vi: 'Quần · váy', hi: 'नीचे के कपड़े', fr: 'Bas', th: 'กางเกง · กระโปรง', id: 'Bawahan' },
    dress: { en: 'Dresses', ko: '원피스', ja: 'ワンピース', zh: '连衣裙', es: 'Vestidos', ar: 'فساتين', vi: 'Đầm', hi: 'ड्रेस', fr: 'Robes', th: 'เดรส', id: 'Gaun' },
    shoes: { en: 'Shoes', ko: '신발', ja: '靴', zh: '鞋', es: 'Zapatos', ar: 'أحذية', vi: 'Giày', hi: 'जूते', fr: 'Chaussures', th: 'รองเท้า', id: 'Sepatu' },
    hat: { en: 'Hats', ko: '모자', ja: '帽子', zh: '帽子', es: 'Gorros', ar: 'قبعات', vi: 'Mũ', hi: 'टोपी', fr: 'Chapeaux', th: 'หมวก', id: 'Topi' },
    acc: { en: 'Accessories', ko: '액세서리', ja: 'アクセサリー', zh: '配饰', es: 'Accesorios', ar: 'إكسسوارات', vi: 'Phụ kiện', hi: 'एक्सेसरी', fr: 'Accessoires', th: 'เครื่องประดับ', id: 'Aksesori' },
    bag: { en: 'Bags', ko: '가방', ja: 'バッグ', zh: '包', es: 'Bolsos', ar: 'حقائب', vi: 'Túi', hi: 'बैग', fr: 'Sacs', th: 'กระเป๋า', id: 'Tas' },
  },
  sort: {
    new: { en: 'Newest', ko: '최근 산 순', ja: '新しい順', zh: '最新购买', es: 'Más recientes', ar: 'الأحدث', vi: 'Mới mua', hi: 'नए पहले', fr: 'Plus récents', th: 'ซื้อล่าสุด', id: 'Terbaru' },
    name: { en: 'Name', ko: '이름 순', ja: '名前順', zh: '按名称', es: 'Nombre', ar: 'الاسم', vi: 'Tên', hi: 'नाम', fr: 'Nom', th: 'ชื่อ', id: 'Nama' },
    price: { en: 'Price', ko: '비싼 순', ja: '高い順', zh: '价格从高到低', es: 'Precio', ar: 'السعر', vi: 'Giá cao', hi: 'कीमत', fr: 'Prix', th: 'ราคาสูง', id: 'Harga' },
  },
  tabCloset: { en: 'Wardrobe', ko: '옷장', ja: 'クローゼット', zh: '衣橱', es: 'Armario', ar: 'خزانة الملابس', vi: 'Tủ đồ', hi: 'अलमारी', fr: 'Garde-robe', th: 'ตู้เสื้อผ้า', id: 'Lemari' },
  closetEmpty: { en: 'No clothes yet. Buy some in a fashion shop and they will hang here.', ko: '아직 옷이 없어요. 옷 가게에서 사면 여기에 걸려요.', ja: 'まだ服がありません。服屋で買うとここに掛かります。', zh: '还没有衣服。在服装店买了就会挂在这里。', es: 'Aún no tienes ropa. Cómprala en una tienda de moda y aparecerá aquí.', ar: 'لا ملابس بعد. اشترِ من متجر أزياء وستظهر هنا.', vi: 'Chưa có quần áo. Mua ở cửa hàng thời trang thì sẽ treo ở đây.', hi: 'अभी कोई कपड़े नहीं। फ़ैशन दुकान से खरीदें, वे यहाँ टंगेंगे।', fr: 'Pas encore de vêtements. Achètes-en dans une boutique de mode et ils seront suspendus ici.', th: 'ยังไม่มีเสื้อผ้า ซื้อที่ร้านแฟชั่นแล้วจะแขวนไว้ที่นี่', id: 'Belum ada pakaian. Beli di toko fesyen dan akan tergantung di sini.' },
  closetNote: { en: 'Clothes, perfume and lipstick don\'t use bag slots.', ko: '옷·향수·립스틱은 가방 칸을 차지하지 않아요.', ja: '服・香水・リップはバッグの枠を使いません。', zh: '衣服、香水和口红不占背包格子。', es: 'La ropa, el perfume y el labial no ocupan huecos de la bolsa.', ar: 'الملابس والعطور وأحمر الشفاه لا تشغل خانات الحقيبة.', vi: 'Quần áo, nước hoa và son không chiếm ô trong túi.', hi: 'कपड़े, परफ़्यूम और लिपस्टिक बैग के खाने नहीं लेते।', fr: 'Vêtements, parfums et rouges à lèvres n\'occupent pas de place dans le sac.', th: 'เสื้อผ้า น้ำหอม และลิปสติกไม่กินช่องกระเป๋า', id: 'Pakaian, parfum, dan lipstik tidak memakai slot tas.' },
  beauty: { en: 'Perfume & lipstick', ko: '향수·립스틱', ja: '香水・リップ', zh: '香水·口红', es: 'Perfume y labial', ar: 'العطور وأحمر الشفاه', vi: 'Nước hoa & son', hi: 'परफ़्यूम और लिपस्टिक', fr: 'Parfums et rouges', th: 'น้ำหอม·ลิปสติก', id: 'Parfum & lipstik' },
  beautyPick: { en: 'Tap one to use it straight from here.', ko: '누르면 여기서 바로 쓸 수 있어요.', ja: '押すとここからすぐ使えます。', zh: '点一下就能直接在这里用。', es: 'Toca uno para usarlo desde aquí.', ar: 'اضغط على واحد لتستخدمه من هنا مباشرة.', vi: 'Chạm để dùng ngay tại đây.', hi: 'यहीं से इस्तेमाल करने के लिए टैप करें।', fr: 'Touche-en un pour l\'utiliser d\'ici.', th: 'แตะเพื่อใช้ได้เลยจากตรงนี้', id: 'Ketuk untuk langsung memakainya dari sini.' },
  toCloset: { en: '👗 {name} went into your wardrobe.', ko: '👗 {name}은(는) 옷장에 넣었어요.', ja: '👗 {name}はクローゼットにしまいました。', zh: '👗 {name}已放进衣橱。', es: '👗 {name} fue a tu armario.', ar: '👗 وُضع {name} في خزانة ملابسك.', vi: '👗 Đã cất {name} vào tủ đồ.', hi: '👗 {name} आपकी अलमारी में रख दिया।', fr: '👗 {name} est dans ta garde-robe.', th: '👗 ใส่ {name} ในตู้เสื้อผ้าแล้ว', id: '👗 {name} dimasukkan ke lemari.' },
  tabRides: { en: 'Rides', ko: '탈것', ja: '乗り物', zh: '车', es: 'Vehículos', ar: 'المركبات', vi: 'Xe', hi: 'सवारी', fr: 'Véhicules', th: 'ยานพาหนะ', id: 'Kendaraan' },
  ridesNote: { en: 'Switch between rides you own here. Buy, repair and upgrade them at a ride shop.', ko: '산 탈것은 여기서 바로 바꿔 탈 수 있어요. 구매·수리·업그레이드는 탈것 가게에서 해요.', ja: '持っている乗り物はここで切り替えられます。購入・修理・アップグレードは乗り物店で。', zh: '已拥有的车可以在这里切换。购买、修理和升级请去车店。', es: 'Cambia aquí entre los vehículos que tienes. Cómpralos, repáralos y mejóralos en una tienda de vehículos.', ar: 'بدّل هنا بين المركبات التي تملكها. الشراء والإصلاح والترقية في متجر المركبات.', vi: 'Đổi qua lại các xe bạn có ở đây. Mua, sửa và nâng cấp ở cửa hàng xe.', hi: 'अपनी सवारियाँ यहाँ बदलें। खरीदना, मरम्मत और अपग्रेड सवारी की दुकान पर।', fr: 'Change de véhicule parmi ceux que tu possèdes. Achète-les, répare-les et améliore-les dans un magasin.', th: 'สลับยานพาหนะที่คุณมีได้ที่นี่ ซื้อ ซ่อม และอัปเกรดได้ที่ร้าน', id: 'Ganti kendaraan milikmu di sini. Beli, perbaiki, dan tingkatkan di toko kendaraan.' },
  owned: { en: 'Collection (no slots used)', ko: '소장품 (칸 차지 안 함)', ja: 'コレクション（枠を使いません）', zh: '收藏（不占格子）' },
};

export class BagUI {
  // describe(entry) → { emoji, name, desc, canHold }
  // extra() → nodes shown under the bag slots (the collection);
  // closet() → { ids (in the order bought), describe(id) → { emoji, name,
  // desc, worn, kind, price },
  // actions(id, redraw) → buttons } for the Wardrobe tab (clothes you own),
  // shown as a grid like the bag's slots;
  // rides() → { nodes, count } for the Rides tab (bikes, boards, scooters you
  // own), or null to leave the tab out (only the basic bike).
  // vanity: the wardrobe's perfume and lipsticks (bag.vanityList()):
  // { useLabel(entry), onUse(i), onHold(i), onDrop(i) }.
  constructor({ root, bag, describe, holding, onHold, onDrop, extra, closet, rides, vanity }) {
    Object.assign(this, { root, bag, describe, holding, onHold, onDrop, extra, closet, rides, vanity });
    this.vanSel = -1;
    this.sel = -1;
    this.tab = 'bag';
    this.closetSel = null;
    this.closetKind = 'all';
    this.closetSort = 'new';
    bag.onChange(() => { if (!root.hidden) this.render(); });
  }

  show(tab = 'bag') { this.sel = -1; this.vanSel = -1; this.closetSel = null; this.tab = tab; this.root.hidden = false; this.render(); }
  hide() { this.root.hidden = true; }
  get open() { return !this.root.hidden; }

  render() {
    const { bag, root } = this;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.hide();
    const head = el('div', 'bag-head');
    head.append(el('strong', 'wallet-title', '🎒 ' + L(BAG_TEXT.title)), el('span', 'bag-count', fmt(L(BAG_TEXT.count), { n: bag.size, cap: bag.cap })));
    // Tabs: your things (the bag's slots), the wardrobe (clothes you own) and the rides
    // you own (to switch without going back to a ride shop).
    const closet = this.closet ? this.closet() : null;
    const rides = this.rides ? this.rides() : null;
    if (this.tab === 'rides' && !rides) this.tab = 'bag';
    const tabs = el('div', 'bag-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [key, label] of [['bag', '🎒 ' + L(BAG_TEXT.tabItems)], ['closet', '👗 ' + L(BAG_TEXT.tabCloset) + ((closet?.ids.length || 0) + this.vanityCount() ? ` ${(closet?.ids.length || 0) + this.vanityCount()}` : '')], ['rides', '🛹 ' + L(BAG_TEXT.tabRides) + (rides?.count ? ` ${rides.count}` : '')]]) {
      if (key === 'closet' && !closet) continue;
      if (key === 'rides' && !rides) continue;
      const b = el('button', 'chip' + (this.tab === key ? ' on' : ''), label);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.tab === key));
      b.onclick = () => { if (this.tab !== key) { this.tab = key; this.sel = -1; this.closetSel = null; this.render(); } };
      tabs.append(b);
    }
    if (this.tab === 'closet' && closet) {
      root.replaceChildren(x, head, tabs, ...this.vanityBody(el), ...this.closetBody(closet, el), el('p', 'fine bag-more', L(BAG_TEXT.closetNote)));
      return;
    }
    if (this.tab === 'rides' && rides) {
      root.replaceChildren(x, head, tabs, ...rides.nodes, el('p', 'fine bag-more', L(BAG_TEXT.ridesNote)));
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

  vanityCount() { return this.vanity && this.bag.vanityList ? this.bag.vanityList().length : 0; }

  // The wardrobe's perfume and lipsticks, above the clothes: a cell each
  // (uses left in the corner); the picked one can be used right here, held,
  // or thrown away.
  vanityBody(el) {
    const list = this.vanityCount() ? this.bag.vanityList() : [];
    if (!list.length) return [];
    if (this.vanSel >= list.length) this.vanSel = -1;
    const grid = el('div', 'bag-grid bag-vanity-grid');
    const cells = Math.max(5, Math.ceil(list.length / 5) * 5);
    for (let i = 0; i < cells; i++) {
      const e = list[i];
      const b = el('button', 'bag-slot' + (e ? '' : ' empty') + (e && i === this.vanSel ? ' on' : ''));
      if (e) {
        const d = this.describe(e);
        b.textContent = d.emoji;
        if (d.dot) { const dot = el('i', 'closet-dot'); dot.style.background = d.dot; b.append(dot); }
        b.append(el('small', '', String(e.sips)));
        b.title = d.name;
        b.setAttribute('aria-label', d.name);
        b.onclick = () => { this.vanSel = i === this.vanSel ? -1 : i; this.render(); };
      } else b.disabled = true;
      grid.append(b);
    }
    const box = el('div', 'bag-info');
    if (this.vanSel >= 0) {
      const i = this.vanSel, e = list[i], d = this.describe(e);
      box.append(el('strong', '', `${d.emoji} ${d.name}`), el('small', 'fine', d.desc));
      const row = el('div', 'bag-actions');
      const use = el('button', 'chip on', this.vanity.useLabel(e));
      use.onclick = () => { this.vanity.onUse(i); this.render(); };
      const hold = el('button', 'chip', '✋ ' + L(this.holding() ? BAG_TEXT.swap : BAG_TEXT.hold));
      hold.onclick = () => { this.vanSel = -1; this.vanity.onHold(i); this.render(); };
      const drop = el('button', 'chip', '🗑️ ' + L(BAG_TEXT.drop));
      drop.onclick = () => {
        if (!confirm(fmt(L(BAG_TEXT.dropAsk), { name: d.name }))) return;
        this.vanSel = -1; this.vanity.onDrop(i); this.render();
      };
      row.append(use, hold, drop);
      box.append(row);
    } else box.append(el('small', 'fine', L(BAG_TEXT.beautyPick)));
    return [el('strong', 'bag-vanity-title', '💄 ' + L(BAG_TEXT.beauty)), grid, box];
  }

  // The wardrobe as a grid like the bag: chips to show one kind (tops,
  // bottoms, hats, ...; only kinds you own), a sort chip, then one cell per
  // piece (worn ones ticked) padded to a full row; the picked one shows what
  // it is with Wear / Take off.
  closetBody(closet, el) {
    const all = closet.ids;
    if (!closetSvg) loadClosetSvgs(() => { if (this.tab === 'closet') this.render(); });
    if (!all.length) return [el('p', 'fine bag-closet-empty', L(BAG_TEXT.closetEmpty))];
    const info = new Map(all.map((id) => [id, closet.describe(id)]));
    const kinds = CLOSET_KINDS.filter((k) => all.some((id) => info.get(id).kind === k));
    if (!kinds.includes(this.closetKind)) this.closetKind = 'all';
    const bar = el('div', 'closet-bar');
    const chip = (label, on, onclick) => {
      const b = el('button', 'chip' + (on ? ' on' : ''), label);
      b.setAttribute('aria-pressed', String(on));
      b.onclick = onclick;
      return b;
    };
    const filters = el('div', 'closet-kinds');
    for (const k of ['all', ...kinds]) {
      const n = k === 'all' ? all.length : all.filter((id) => info.get(id).kind === k).length;
      filters.append(chip(`${L(k === 'all' ? BAG_TEXT.kindAll : BAG_TEXT.kind[k])} ${n}`, this.closetKind === k, () => { this.closetKind = k; this.render(); }));
    }
    const next = CLOSET_SORTS[(CLOSET_SORTS.indexOf(this.closetSort) + 1) % CLOSET_SORTS.length];
    const sortBtn = chip('↕ ' + L(BAG_TEXT.sort[this.closetSort]), false, () => { this.closetSort = next; this.render(); });
    sortBtn.className = 'chip closet-sort';
    bar.append(filters, sortBtn);
    const shown = sortCloset(all.filter((id) => this.closetKind === 'all' || info.get(id).kind === this.closetKind), this.closetSort,
      { nameOf: (id) => info.get(id).name, priceOf: (id) => info.get(id).price });
    if (!shown.includes(this.closetSel)) this.closetSel = null;
    const grid = el('div', 'bag-grid bag-closet-grid');
    const cells = Math.max(5, Math.ceil(shown.length / 5) * 5);
    for (let i = 0; i < cells; i++) {
      const id = shown[i];
      const b = el('button', 'bag-slot' + (id ? '' : ' empty') + (id && id === this.closetSel ? ' on' : ''));
      if (id) {
        const d = info.get(id);
        b.append(closetIcon(d, el));
        b.title = d.name;
        b.setAttribute('aria-label', d.name);
        if (d.worn) { b.classList.add('worn'); b.append(el('small', '', '✓')); }
        b.onclick = () => { this.closetSel = id === this.closetSel ? null : id; this.render(); };
      } else b.disabled = true;
      grid.append(b);
    }
    const box = el('div', 'bag-info');
    if (this.closetSel) {
      const d = info.get(this.closetSel);
      const row = el('div', 'bag-actions');
      row.append(...closet.actions(this.closetSel, () => this.render()));
      const title = el('strong', 'closet-title');
      title.append(closetIcon(d, el), ' ' + d.name);
      if (d.retired) title.append(' ', el('span', 'closet-retired', t('closet.retired')));
      box.append(title, el('small', 'fine', d.desc), row);
    } else box.append(el('small', 'fine', L(BAG_TEXT.closetPick)));
    return [bar, grid, box];
  }
}
