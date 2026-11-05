// Shopping UI: store banner, product card, cart. Prices are virtual.
import { ITEMS } from '../core/inventory.js';
import { t, localName, getLanguage } from '../core/i18n.js';
import { STYLES, SPRAYS, onSale } from '../core/perfume.js';

const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const PERFUME_SNIFF = { en: 'Smell the tester (free)', ko: '시향하기 (무료)', ja: 'テスターを試す（無料）', zh: '试闻（免费）', es: 'Probar (gratis)', ar: 'جرّب العطر (مجانًا)', vi: 'Thử mùi (miễn phí)', hi: 'टेस्टर सूँघें (मुफ़्त)', id: 'Coba tester (gratis)' };
const LIMITED = {
  on: { en: '🗓️ Limited edition · {from} to {to}', ko: '🗓️ 기간 한정 · {from} ~ {to}', ja: '🗓️ 期間限定 · {from}〜{to}', zh: '🗓️ 限时发售 · {from} 至 {to}', es: '🗓️ Edición limitada · del {from} al {to}', ar: '🗓️ إصدار محدود · من {from} إلى {to}', vi: '🗓️ Phiên bản giới hạn · {from} đến {to}', hi: '🗓️ सीमित संस्करण · {from} से {to}', id: '🗓️ Edisi terbatas · {from} sampai {to}' },
  off: { en: 'Not on sale now: this limited edition sells from {from} to {to}.', ko: '지금은 팔지 않아요. {from} ~ {to} 기간 한정 상품이에요.', ja: '今は販売していません。{from}〜{to}の期間限定です。', zh: '现在不卖。限时发售：{from} 至 {to}。', es: 'No está a la venta ahora: edición limitada del {from} al {to}.', ar: 'غير متاح للبيع الآن: إصدار محدود من {from} إلى {to}.', vi: 'Hiện không bán: phiên bản giới hạn từ {from} đến {to}.', hi: 'अभी बिक्री में नहीं: सीमित संस्करण {from} से {to}।', id: 'Sedang tidak dijual: edisi terbatas {from} sampai {to}.' },
};
const PERFUME_INFO = { en: '🧴 {n} sprays · each lasts 3 minutes · people nearby see the effect too', ko: '🧴 {n}번 뿌릴 수 있어요 · 한 번에 3분 · 근처 사람들도 이펙트를 봐요', ja: '🧴 {n}回分 · 1回3分 · 近くの人にもエフェクトが見えます', zh: '🧴 可喷{n}次 · 每次3分钟 · 附近的人也能看到特效', es: '🧴 {n} usos · cada uno dura 3 min · los de cerca ven el efecto', ar: '🧴 {n} رشّات · كل رشّة 3 دقائق · يرى من حولك التأثير', vi: '🧴 Xịt được {n} lần · mỗi lần 3 phút · người gần bạn cũng thấy hiệu ứng', hi: '🧴 {n} बार · हर बार 3 मिनट · पास वाले भी असर देखते हैं', id: '🧴 {n} semprotan · masing-masing 3 menit · orang di dekatmu ikut melihat efeknya' };

const WEARING = { en: 'Wearing', ko: '착용 중', ja: '着用中', zh: '穿着中', es: 'Puesto', ar: 'ترتديه', vi: 'Đang mặc', hi: 'पहना हुआ', id: 'Dipakai' };
const OUTFIT_BUY = { en: 'Buy', ko: '사기', ja: '買う', zh: '购买', es: 'Comprar', ar: 'اشترِ', vi: 'Mua', hi: 'ख़रीदें', id: 'Beli' };
const UMB = {
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买' },
  have: { en: 'You have one', ko: '이미 있어요', ja: '持っています', zh: '已经有了' },
};
const L = (o) => localName(o, getLanguage());
// Everything is priced in game coins (1 coin per ₩1,000 of the sample
// price, rounded up). How you get a thing depends on the shop.
const HOW = {
  table: { en: '🍽️ Sit at a table and order from the menu.', ko: '🍽️ 자리에 앉아서 메뉴판으로 주문해요.', ja: '🍽️ 席に座ってメニューから注文してね。', zh: '🍽️ 找个座位坐下，用菜单点餐。', es: '🍽️ Siéntate a una mesa y pide desde la carta.', ar: '🍽️ اجلس إلى طاولة واطلب من القائمة.', vi: '🍽️ Ngồi vào bàn và gọi món theo thực đơn.', hi: '🍽️ मेज़ पर बैठें और मेन्यू से ऑर्डर करें।', id: '🍽️ Duduk di meja dan pesan dari menu.' },
  counter: { en: '🧾 Order from the staff at the counter.', ko: '🧾 카운터 점원에게 주문해요.', ja: '🧾 カウンターの店員に注文してね。', zh: '🧾 到柜台向店员点单。', es: '🧾 Pide al personal en el mostrador.', ar: '🧾 اطلب من الموظف عند المنضدة.', vi: '🧾 Gọi món với nhân viên ở quầy.', hi: '🧾 काउंटर पर कर्मचारी से ऑर्डर करें।', id: '🧾 Pesan ke staf di kasir.' },
  soon: { en: '🚧 Coming soon: this shop is getting ready.', ko: '🚧 현재 준비중입니다.', ja: '🚧 現在準備中です。', zh: '🚧 正在准备中。', es: '🚧 Próximamente: la tienda se está preparando.', ar: '🚧 قريبًا: المتجر قيد التجهيز.', vi: '🚧 Sắp ra mắt: cửa hàng này đang chuẩn bị.', hi: '🚧 जल्द आ रहा है: यह दुकान तैयार हो रही है।', id: '🚧 Segera hadir: toko sedang disiapkan.' },
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买', es: 'Comprar', ar: 'اشترِ', vi: 'Mua', hi: 'ख़रीदें', id: 'Beli' },
  note: { en: 'Paid with game coins only. No real money.', ko: '게임 코인으로만 사요. 실제 결제는 없어요.', ja: 'ゲーム内コインだけで買えます。実際の支払いはありません。', zh: '只用游戏硬币购买，不会真实付款。', es: 'Solo con monedas del juego. Sin dinero real.', ar: 'بعملات اللعبة فقط. لا أموال حقيقية.', vi: 'Chỉ thanh toán bằng xu trong game. Không dùng tiền thật.', hi: 'सिर्फ़ गेम के सिक्कों से भुगतान। असली पैसा नहीं।', id: 'Hanya pakai koin game. Tanpa uang sungguhan.' },
};
// Clothes, shoes and accessories are bought with coins and worn on the
// spot. A fashion shop or pop-up with nothing to wear yet is coming soon.
const sellsOutfits = (store) => !!store.products?.some((p) => p.outfit || p.item);
export const comingSoon = (store) => !!store && (store.category === 'fashion' || store.category === 'popup') && !sellsOutfits(store) && !store.perfumery;
// How a shop sells: 'table' (restaurants), 'counter' (cafés, bars, clubs),
// 'soon' (fashion, for now) or 'buy' (take it home in a shopping bag).
export function howToGet(store) {
  if (comingSoon(store)) return 'soon';
  if (store?.category === 'restaurant') return 'table';
  if (store?.takeaway || ['cafe', 'bar', 'club'].includes(store?.category)) return 'counter';
  return 'buy';
}
export const coinsFor = (krw) => Math.max(1, Math.ceil((Number(krw) || 0) / 1000));
const MODEL_ICON = { samgak: '🍙', milk: '🍌', umbrella: '☂️', 'pet:dog': '🐶', 'pet:cat': '🐱',
  tee: '👕', jeans: '👖', sneaker: '👟', bottle: '🧴', jar: '🫙', lipstick: '💄', cap: '🧢',
  hat: '👒', tote: '👜', plush: '🧸', notebook: '📓', pen: '🖊️', candle: '🕯️', bread: '🥐',
  cup: '🥤', scarf: '🧣', bowl: '🍲', roll: '🍙', glasses: '👓', sunglasses: '🕶️', earrings: '💎',
  backpack: '🎒', beanie: '🧶', beret: '🎨', ribbon: '🎀',
};
const CART_KEY = 'mk.cart';

export function formatPrice(krw) {
  return '🪙 ' + coinsFor(krw);
}

export class Cart {
  constructor() {
    this.items = [];
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(raw)) this.items = raw.filter((i) => i && i.id && i.price >= 0).slice(0, 50);
    } catch { /* ignore */ }
    this.listeners = new Set();
  }
  _save() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch { /* ignore */ }
    this.listeners.forEach((fn) => fn());
  }
  add(store, product) {
    const key = `${store.id}/${product.id}`;
    const found = this.items.find((i) => i.key === key);
    if (found) found.qty += 1;
    else this.items.push({ key, id: product.id, store: store.id, storeName: store.name, name: product.name, price: product.price, model: product.model, qty: 1 });
    this._save();
  }
  remove(key) {
    this.items = this.items.filter((i) => i.key !== key);
    this._save();
  }
  count() { return this.items.reduce((n, i) => n + i.qty, 0); }
  total() { return this.items.reduce((n, i) => n + i.qty * i.price, 0); }
  onChange(fn) { this.listeners.add(fn); }
}

export class ShopUI {
  // onBuy(product, coins): pay and hold it (shops that sell to take home).
  // canGift(product): true when this can be bought for someone else here;
  // onGift(product): pick a friend and send it (see ui/gift-ui.js).
  constructor({ cart, onTryOn, onExit, onTake, onAdopt, owns, onAdd, hasUmbrella, onUmbrella, onOutfit, wearing, onBuy, onSniff, canGift, onGift, giftLabel }) {
    Object.assign(this, { cart, onTryOn, onExit, onTake, onAdopt, owns, onAdd, hasUmbrella, onUmbrella, onOutfit, wearing, onBuy, onSniff, canGift, onGift, giftLabel });
    this.$ = (id) => document.getElementById(id);
    this.store = null;
    this.$('product-close').onclick = () => this.closeProduct();
    this.$('cart-btn').onclick = () => this.openCart();
    this.$('cart-close').onclick = () => { this.$('cart-panel').hidden = true; };
    this.$('cart-checkout').onclick = () => { this.$('cart-note').hidden = false; };
    this.$('store-exit').onclick = () => this.onExit();
    cart.onChange(() => this.refreshCart());
    this.refreshCart();
  }

  enterStore(store) {
    this.store = store;
    const lang = getLanguage();
    this.$('store-banner').hidden = false;
    this.$('store-name').textContent = localName(store.name, lang);
    this.$('store-name-ko').textContent = lang === 'ko' ? '' : store.name.ko;
    this.$('store-tagline').textContent = localName(store.tagline, lang) || '';
    this.$('store-banner').style.setProperty('--store', store.colors.sign);
    this.$('store-banner').querySelector('.sample').hidden = store.category === 'home' || store.category === 'school' || store.category === 'station' || store.category === 'train';
  }

  leaveStore() {
    this.store = null;
    this.$('store-banner').hidden = true;
    this.closeProduct();
  }

  openProduct(product) {
    const lang = getLanguage();
    const p = this.$('product-panel');
    p.hidden = false;
    this.$('product-icon').textContent = MODEL_ICON[product.model] || '🛍️';
    this.$('product-icon').style.background = product.color;
    this.$('product-name').textContent = localName(product.name, lang);
    this.$('product-name-ko').textContent = lang === 'ko' ? '' : product.name.ko;
    this.$('product-price').textContent = formatPrice(product.price);
    this.$('product-desc').textContent = localName(product.desc, lang) || '';
    if (product.perfume) { // which style, and how a bottle works
      const st = STYLES[product.perfume];
      const lim = product.limited ? '\n' + fmt(L(LIMITED.on), product.limited) : '';
      this.$('product-desc').textContent = `${st ? st.icon + ' ' + L(st) + ' · ' : ''}${localName(product.desc, lang) || ''}${lim}\n${fmt(L(PERFUME_INFO), { n: SPRAYS })}`;
    }
    const tryBtn = this.$('product-try');
    tryBtn.hidden = !product.tryOn && !product.perfume;
    tryBtn.textContent = product.perfume ? '👃 ' + L(PERFUME_SNIFF) : '🪞 ' + t('shop.tryOn');
    tryBtn.onclick = () => (product.perfume ? this.onSniff?.(product) : this.onTryOn(product));
    // Restaurant dishes are a menu to read, not something to buy.
    // Takeaway shops (META COFFEE) hand you the drink to carry around.
    // Pet shop: adopt with coins (or walk a pet you already have).
    const adopt = product.adopt && ITEMS[product.adopt];
    const ab = this.$('product-adopt');
    ab.hidden = !adopt;
    if (adopt) {
      const mine = this.owns?.(product.adopt);
      ab.textContent = mine ? '🐾 ' + t('pet.walk') : `🪙 ${adopt.price} · ${t('pet.adopt')}`;
      ab.onclick = () => this.onAdopt?.(product);
      this.$('product-price').textContent = `🪙 ${adopt.price}`;
    }
    // Convenience store umbrella: bought with coins, kept for rainy days.
    if (product.umbrella) {
      const mine = this.hasUmbrella?.();
      ab.hidden = false;
      ab.disabled = !!mine;
      ab.textContent = mine ? '☂️ ' + L(UMB.have) : `🪙 ${product.coins} · ${L(UMB.buy)}`;
      ab.onclick = () => this.onUmbrella?.(product);
      this.$('product-price').textContent = `🪙 ${product.coins}`;
    } else ab.disabled = false;
    // Clothes and accessory shops: buy with coins, then wear it or take it off.
    const itemId = product.item || product.outfit;
    const outfit = itemId && ITEMS[itemId]?.wear ? ITEMS[itemId] : null;
    if (outfit) {
      const mine = this.owns?.(itemId), on = this.wearing?.(itemId);
      ab.hidden = false;
      ab.disabled = mine && on && !outfit.off; // trousers: swap, don't take off
      ab.textContent = mine ? (on ? (outfit.off ? '👕 ' + t('tee.off') : '✅ ' + L(WEARING)) : '✨ ' + t('tee.wear')) : `🪙 ${outfit.price} · ${L(OUTFIT_BUY)}`;
      ab.onclick = () => { this.onOutfit?.(product); this.openProduct(product); };
      this.$('product-price').textContent = `🪙 ${outfit.price}`;
      if (!product.desc) this.$('product-desc').textContent = localName(outfit.desc, lang) || '';
    }
    // No cart: restaurants take orders at the table, cafés at the counter,
    // fashion is coming soon, and other shops sell for coins to carry home.
    const how = howToGet(this.store);
    this.$('product-take').hidden = true;
    const special = adopt || product.umbrella || outfit;
    const howEl = this.$('product-how');
    howEl.hidden = special && how !== 'soon' || how === 'buy';
    howEl.textContent = L(HOW[how] || HOW.soon);
    howEl.classList.toggle('soon', how === 'soon');
    if (how === 'soon') { ab.hidden = true; this.$('product-price').textContent = ''; } // not for sale yet
    const coins = coinsFor(product.price);
    const add = this.$('product-add');
    add.hidden = special || how !== 'buy';
    add.textContent = `🪙 ${coins} · ${L(HOW.buy)}`;
    add.onclick = () => { if (this.onBuy?.(product, coins)) this.closeProduct(); };
    if (!onSale(product)) { // a limited edition outside its dates
      add.hidden = true;
      howEl.hidden = false;
      howEl.classList.add('soon');
      howEl.textContent = fmt(L(LIMITED.off), product.limited);
    }
    // Buy it for a friend in the shop instead.
    const gift = this.$('product-gift');
    gift.hidden = !this.canGift?.(product);
    gift.textContent = this.giftLabel?.() || '🎁';
    gift.onclick = () => this.onGift?.(product);
    this.$('product-note').textContent = L(HOW.note);
  }

  closeProduct() {
    this.$('product-panel').hidden = true;
  }

  openCart() {
    const lang = getLanguage();
    this.$('cart-panel').hidden = false;
    this.$('cart-note').hidden = true;
    const list = this.$('cart-list');
    list.innerHTML = '';
    if (!this.cart.items.length) {
      const e = document.createElement('p');
      e.className = 'cart-empty';
      e.textContent = t('cart.empty');
      list.appendChild(e);
    }
    for (const it of this.cart.items) {
      const row = document.createElement('div');
      row.className = 'cart-row';
      const icon = document.createElement('span');
      icon.className = 'cart-icon';
      icon.textContent = MODEL_ICON[it.model] || '🛍️';
      const txt = document.createElement('span');
      txt.className = 'cart-text';
      const n = document.createElement('strong');
      n.textContent = `${localName(it.name, lang)}${it.qty > 1 ? ' × ' + it.qty : ''}`;
      const s = document.createElement('small');
      s.textContent = localName(it.storeName, lang);
      txt.append(n, s);
      const price = document.createElement('span');
      price.className = 'cart-price';
      price.textContent = formatPrice(it.price * it.qty);
      const rm = document.createElement('button');
      rm.className = 'cart-remove';
      rm.setAttribute('aria-label', t('cart.remove'));
      rm.textContent = '✕';
      rm.onclick = () => { this.cart.remove(it.key); this.openCart(); };
      row.append(icon, txt, price, rm);
      list.appendChild(row);
    }
    this.$('cart-total').textContent = formatPrice(this.cart.total());
    this.$('cart-checkout').disabled = !this.cart.items.length;
  }

  refreshCart() {
    const n = this.cart.count();
    this.$('cart-count').textContent = n;
    this.$('cart-count').hidden = n === 0;
  }

  toast(text) {
    const el = this.$('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { el.hidden = true; }, 1600);
  }
}
