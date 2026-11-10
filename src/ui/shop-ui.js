// Shopping UI: store banner, product card, cart. Prices are virtual.
import { ITEMS } from '../core/inventory.js';
import { t, localName, getLanguage } from '../core/i18n.js';
import { STYLES, SPRAYS, onSale } from '../core/perfume.js';
import { hanbokById, RENT_HOURS } from '../data/hanbok.js';
import { formatLeft } from '../core/hanbok-rental.js';

const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const PERFUME_SNIFF = { en: 'Smell the tester (free)', ko: '시향하기 (무료)', ja: 'テスターを試す（無料）', zh: '试闻（免费）', es: 'Probar (gratis)', ar: 'جرّب العطر (مجانًا)', vi: 'Thử mùi (miễn phí)', hi: 'टेस्टर सूँघें (मुफ़्त)', fr: 'Sentir le testeur (gratuit)', th: 'ดมเทสเตอร์ (ฟรี)', id: 'Coba tester (gratis)' };
const LIMITED = {
  on: { en: '🗓️ Limited edition · {from} to {to}', ko: '🗓️ 기간 한정 · {from} ~ {to}', ja: '🗓️ 期間限定 · {from}〜{to}', zh: '🗓️ 限时发售 · {from} 至 {to}', es: '🗓️ Edición limitada · del {from} al {to}', ar: '🗓️ إصدار محدود · من {from} إلى {to}', vi: '🗓️ Phiên bản giới hạn · {from} đến {to}', hi: '🗓️ सीमित संस्करण · {from} से {to}', fr: '🗓️ Édition limitée · du {from} au {to}', th: '🗓️ รุ่นลิมิเต็ด · {from} ถึง {to}', id: '🗓️ Edisi terbatas · {from} sampai {to}' },
  off: { en: 'Not on sale now: this limited edition sells from {from} to {to}.', ko: '지금은 팔지 않아요. {from} ~ {to} 기간 한정 상품이에요.', ja: '今は販売していません。{from}〜{to}の期間限定です。', zh: '现在不卖。限时发售：{from} 至 {to}。', es: 'No está a la venta ahora: edición limitada del {from} al {to}.', ar: 'غير متاح للبيع الآن: إصدار محدود من {from} إلى {to}.', vi: 'Hiện không bán: phiên bản giới hạn từ {from} đến {to}.', hi: 'अभी बिक्री में नहीं: सीमित संस्करण {from} से {to}।', fr: 'Pas en vente maintenant : cette édition limitée est vendue du {from} au {to}.', th: 'ยังไม่วางขาย รุ่นลิมิเต็ดนี้ขายตั้งแต่ {from} ถึง {to}', id: 'Sedang tidak dijual: edisi terbatas {from} sampai {to}.' },
};
const PERFUME_INFO = { en: '🧴 {n} sprays · each lasts 3 minutes · people nearby see the effect too', ko: '🧴 {n}번 뿌릴 수 있어요 · 한 번에 3분 · 근처 사람들도 이펙트를 봐요', ja: '🧴 {n}回分 · 1回3分 · 近くの人にもエフェクトが見えます', zh: '🧴 可喷{n}次 · 每次3分钟 · 附近的人也能看到特效', es: '🧴 {n} usos · cada uno dura 3 min · los de cerca ven el efecto', ar: '🧴 {n} رشّات · كل رشّة 3 دقائق · يرى من حولك التأثير', vi: '🧴 Xịt được {n} lần · mỗi lần 3 phút · người gần bạn cũng thấy hiệu ứng', hi: '🧴 {n} बार · हर बार 3 मिनट · पास वाले भी असर देखते हैं', fr: '🧴 {n} vaporisations · chacune dure 3 minutes · les gens autour voient l\'effet aussi', th: '🧴 ฉีดได้ {n} ครั้ง · ครั้งละ 3 นาที · คนรอบๆ ก็เห็นเอฟเฟกต์ด้วย', id: '🧴 {n} semprotan · masing-masing 3 menit · orang di dekatmu ikut melihat efeknya' };

// Hanbok rental (data/hanbok.js): worn for a few hours, then your own clothes come back.
export const RENT = {
  rent: { en: 'Rent for {h} hours', ko: '{h}시간 대여하기', ja: '{h}時間レンタル', zh: '租{h}小时', es: 'Alquilar {h} horas', ar: 'استأجر لمدة {h} ساعات', vi: 'Thuê {h} giờ', hi: '{h} घंटे के लिए किराए पर लें', fr: 'Louer pour {h} heures', th: 'เช่า {h} ชั่วโมง', id: 'Sewa {h} jam' },
  back: { en: 'Return it now', ko: '지금 반납하기', ja: '今すぐ返却', zh: '现在归还', es: 'Devolver ahora', ar: 'أعِده الآن', vi: 'Trả ngay', hi: 'अभी लौटाएँ', fr: 'Le rendre maintenant', th: 'คืนตอนนี้', id: 'Kembalikan sekarang' },
  left: { en: '⏳ Rented · {t} left', ko: '⏳ 대여 중 · {t} 남음', ja: '⏳ レンタル中 · 残り{t}', zh: '⏳ 租借中 · 剩余{t}', es: '⏳ Alquilado · quedan {t}', ar: '⏳ مستأجَر · بقي {t}', vi: '⏳ Đang thuê · còn {t}', hi: '⏳ किराए पर · {t} बाकी', fr: '⏳ Loué · encore {t}', th: '⏳ เช่าอยู่ · เหลือ {t}', id: '⏳ Disewa · sisa {t}' },
  info: { en: '🪭 Rental: wear it for {h} hours, then your own clothes come back by themselves. Renting another one swaps it and starts the {h} hours again.', ko: '🪭 대여: {h}시간 동안 입을 수 있고, 시간이 지나면 원래 옷으로 자동으로 돌아와요. 다른 한복을 빌리면 바꿔 입고 {h}시간이 새로 시작돼요.', ja: '🪭 レンタル：{h}時間着られて、時間が過ぎると自動で元の服に戻ります。別の韓服を借りると着替えて{h}時間がまた始まります。', zh: '🪭 租借：可以穿{h}小时，时间到了会自动换回原来的衣服。租另一套会换上并重新计时{h}小时。', es: '🪭 Alquiler: llévalo {h} horas y luego vuelve tu ropa sola. Si alquilas otro, te lo cambias y las {h} horas empiezan de nuevo.', ar: '🪭 إيجار: ارتدِه {h} ساعات، ثم تعود ملابسك تلقائيًا. استئجار آخر يبدّله ويبدأ الساعات من جديد.', vi: '🪭 Thuê: mặc trong {h} giờ, sau đó quần áo của bạn tự trở lại. Thuê bộ khác sẽ đổi bộ và tính lại {h} giờ.', hi: '🪭 किराया: इसे {h} घंटे पहनें, फिर आपके अपने कपड़े अपने आप लौट आते हैं। दूसरा किराए पर लेने से बदल जाता है और {h} घंटे फिर शुरू होते हैं।', fr: '🪭 Location : porte-le pendant {h} heures, puis tes vêtements reviennent tout seuls. En louer un autre l\'échange et relance les {h} heures.', th: '🪭 เช่า: ใส่ได้ {h} ชั่วโมง แล้วชุดเดิมของคุณจะกลับมาเอง เช่าชุดอื่นจะเปลี่ยนชุดและเริ่มนับ {h} ชั่วโมงใหม่', id: '🪭 Sewa: pakai selama {h} jam, lalu bajumu sendiri kembali otomatis. Menyewa yang lain akan menggantinya dan {h} jam dimulai lagi.' },
  palace: { en: 'Tip: at Seoul\'s royal palaces, visitors wearing hanbok get in free.', ko: '팁: 서울의 고궁은 한복을 입으면 무료로 입장할 수 있어요.', ja: 'ヒント：ソウルの古宮は韓服を着ると無料で入れます。', zh: '提示：穿韩服可以免费参观首尔的古宫。', es: 'Consejo: en los palacios reales de Seúl, quien va en hanbok entra gratis.', ar: 'نصيحة: في قصور سيول الملكية، يدخل من يرتدي الهانبوك مجانًا.', vi: 'Mẹo: ở các cung điện Seoul, khách mặc hanbok được vào miễn phí.', hi: 'सुझाव: सियोल के शाही महलों में हानबोक पहनने वालों का प्रवेश मुफ़्त है।', fr: 'Astuce : dans les palais royaux de Séoul, les visiteurs en hanbok entrent gratuitement.', th: 'เคล็ดลับ: ที่พระราชวังในโซล ผู้ที่สวมฮันบกเข้าชมฟรี', id: 'Tips: di istana kerajaan Seoul, pengunjung berhanbok masuk gratis.' },
};

const WEARING = { en: 'Wearing', ko: '착용 중', ja: '着用中', zh: '穿着中', es: 'Puesto', ar: 'ترتديه', vi: 'Đang mặc', hi: 'पहना हुआ', fr: 'Porté', th: 'กำลังใส่', id: 'Dipakai' };
const OUTFIT_BUY = { en: 'Buy', ko: '사기', ja: '買う', zh: '购买', es: 'Comprar', ar: 'اشترِ', vi: 'Mua', hi: 'ख़रीदें', fr: 'Acheter', th: 'ซื้อ', id: 'Beli' };
const HOME_BUY = { en: 'Buy for your home', ko: '우리 집용으로 사기', ja: '家用に買う', zh: '买回家' };
const HOME_HAVE = { en: 'Yours: place it with Decorate at home', ko: '구매 완료: 집에서 꾸미기로 놓아요', ja: '購入済み：家の模様替えで置けます', zh: '已拥有：在家点装饰摆放' };
const UMB = {
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买' },
  have: { en: 'You have one', ko: '이미 있어요', ja: '持っています', zh: '已经有了' },
};
const L = (o) => localName(o, getLanguage());
// Everything is priced in game coins (1 coin per ₩1,000 of the sample
// price, rounded up). How you get a thing depends on the shop.
const HOW = {
  table: { en: '🍽️ Sit at a table and order from the menu.', ko: '🍽️ 자리에 앉아서 메뉴판으로 주문해요.', ja: '🍽️ 席に座ってメニューから注文してね。', zh: '🍽️ 找个座位坐下，用菜单点餐。', es: '🍽️ Siéntate a una mesa y pide desde la carta.', ar: '🍽️ اجلس إلى طاولة واطلب من القائمة.', vi: '🍽️ Ngồi vào bàn và gọi món theo thực đơn.', hi: '🍽️ मेज़ पर बैठें और मेन्यू से ऑर्डर करें।', fr: '🍽️ Assieds-toi à une table et commande sur le menu.', th: '🍽️ นั่งที่โต๊ะแล้วสั่งจากเมนู', id: '🍽️ Duduk di meja dan pesan dari menu.' },
  counter: { en: '🧾 Order from the staff at the counter.', ko: '🧾 카운터 점원에게 주문해요.', ja: '🧾 カウンターの店員に注文してね。', zh: '🧾 到柜台向店员点单。', es: '🧾 Pide al personal en el mostrador.', ar: '🧾 اطلب من الموظف عند المنضدة.', vi: '🧾 Gọi món với nhân viên ở quầy.', hi: '🧾 काउंटर पर कर्मचारी से ऑर्डर करें।', fr: '🧾 Commande auprès du personnel au comptoir.', th: '🧾 สั่งกับพนักงานที่เคาน์เตอร์', id: '🧾 Pesan ke staf di kasir.' },
  item: { en: '🚧 Coming soon: not on sale yet.', ko: '🚧 준비중이에요. 아직 팔지 않아요.', ja: '🚧 準備中です。まだ販売していません。', zh: '🚧 准备中，暂不出售。', es: '🚧 Próximamente: aún no está a la venta.', ar: '🚧 قريبًا: غير متاح للبيع بعد.', vi: '🚧 Sắp ra mắt: chưa bán.', hi: '🚧 जल्द आ रहा है: अभी बिक्री में नहीं।', fr: '🚧 Bientôt : pas encore en vente.', th: '🚧 เร็วๆ นี้: ยังไม่วางขาย', id: '🚧 Segera hadir: belum dijual.' },
  soon: { en: '🚧 Coming soon: this shop is getting ready.', ko: '🚧 현재 준비중입니다.', ja: '🚧 現在準備中です。', zh: '🚧 正在准备中。', es: '🚧 Próximamente: la tienda se está preparando.', ar: '🚧 قريبًا: المتجر قيد التجهيز.', vi: '🚧 Sắp ra mắt: cửa hàng này đang chuẩn bị.', hi: '🚧 जल्द आ रहा है: यह दुकान तैयार हो रही है।', fr: '🚧 Bientôt : cette boutique se prépare.', th: '🚧 เร็วๆ นี้: ร้านนี้กำลังเตรียมเปิด', id: '🚧 Segera hadir: toko sedang disiapkan.' },
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买', es: 'Comprar', ar: 'اشترِ', vi: 'Mua', hi: 'ख़रीदें', fr: 'Acheter', th: 'ซื้อ', id: 'Beli' },
  note: { en: 'Paid with game money (won) only. No real payment.', ko: '게임 속 돈(원)으로만 사요. 실제 결제는 없어요.', ja: 'ゲーム内のお金（ウォン）だけで買えます。実際の支払いはありません。', zh: '只用游戏里的钱（韩元）购买，不会真实付款。', es: 'Solo con dinero del juego (wones). Sin pagos reales.', ar: 'بمال اللعبة (الوون) فقط. لا دفع حقيقي.', vi: 'Chỉ thanh toán bằng tiền trong game (won). Không trả tiền thật.', hi: 'सिर्फ़ गेम के पैसे (वॉन) से भुगतान। असली भुगतान नहीं।', fr: 'Payé uniquement avec l\'argent du jeu (wons). Aucun vrai paiement.', th: 'ชำระด้วยเงินในเกม (วอน) เท่านั้น ไม่มีการชำระเงินจริง', id: 'Hanya pakai uang game (won). Tanpa pembayaran sungguhan.' },
};
// What a bought thing becomes in your hand: 'food' to eat, 'coffee' to drink,
// or 'gift' (a shopping bag that is only carried). "goods": true in
// stores.json marks a thing shaped like a cup or bowl that isn't food or a
// drink (a spray can, a ceramic mug, coffee beans).
const FOOD_MODELS = ['samgak', 'bread', 'bowl', 'roll', 'skewer', 'bacon', 'icecream', 'churro', 'hotdog'];
export const goodsKind = (product) => (product?.goods ? 'gift' : FOOD_MODELS.includes(product?.model) ? 'food' : product?.model === 'cup' || product?.model === 'milk' ? 'coffee' : 'gift');
// Can you do something with it once it's yours? Eat, drink, wear, rent,
// walk (pets), spray (perfume), cook with (ingredients), sit on (picnic
// mat), keep dry (umbrella). A thing you could only carry around is not
// sold: players felt they had wasted their coins.
export const usable = (product) => !!product && !!(product.outfit || product.item || product.furniture || product.rent || product.adopt || product.umbrella || product.perfume || product.ingredient || goodsKind(product) !== 'gift');
// Clothes, shoes and accessories are bought with coins and worn on the
// spot. A fashion shop or pop-up with nothing to wear yet is coming soon,
// and so is any shop whose goods could only be carried around (candles,
// stationery, records…). Workshops stay open for their activity.
const sellsOutfits = (store) => !!store.products?.some((p) => p.outfit || p.item || p.rent);
const baseHow = (store) => (store?.category === 'restaurant' ? 'table' : store?.takeaway || ['cafe', 'bar', 'club'].includes(store?.category) ? 'counter' : 'buy');
const onlyCarried = (store) => !store.workshop && !store.craft && !store.perfumery && baseHow(store) === 'buy' && store.products?.length > 0 && !store.products.some(usable);
export const comingSoon = (store) => !!store && ((store.category === 'fashion' || store.category === 'popup') && !sellsOutfits(store) && !store.perfumery || onlyCarried(store));
// Coming-soon shops are hidden from the street for now (Yozi, 2026-11):
// no front, sign, door, map pin, mission or billboard ad, so Seongsu draws
// less. Their data stays in stores.json (empty-lot posters still treat the
// spot as taken). Set to false to bring them all back.
export const HIDE_COMING_SOON = true;
export const shownStores = (stores) => (HIDE_COMING_SOON ? stores.filter((s) => !comingSoon(s)) : stores);
// How a shop sells: 'table' (restaurants), 'counter' (cafés, bars, clubs),
// 'soon' (getting ready) or 'buy' (take it home in a shopping bag).
export function howToGet(store) {
  return comingSoon(store) ? 'soon' : baseHow(store);
}
// One thing in an open shop that isn't sold yet (nothing to do with it).
export function itemSoon(store, product) {
  const how = howToGet(store);
  if (how === 'buy') return !usable(product);
  if (how === 'counter') return !!product?.goods;
  return false;
}
// Money is won: a thing costs its price tag (at least ₩100).
export const coinsFor = (krw) => Math.max(100, Math.round(Number(krw) || 0));
const MODEL_ICON = { samgak: '🍙', milk: '🍌', umbrella: '☂️', 'pet:dog': '🐶', 'pet:cat': '🐱', 'pet:chinchilla': '🐭', 'pet:guineapig': '🐹',
  tee: '👕', jeans: '👖', sneaker: '👟', bottle: '🧴', jar: '🫙', lipstick: '💄', cap: '🧢',
  hat: '👒', tote: '👜', plush: '🧸', notebook: '📓', pen: '🖊️', candle: '🕯️', bread: '🥐',
  cup: '🥤', scarf: '🧣', bowl: '🍲', roll: '🍙', glasses: '👓', sunglasses: '🕶️', earrings: '💎',
  backpack: '🎒', ears: '🐱', paws: '🐾', beanie: '🧶', beret: '🎨', ribbon: '🎀', skirt: '👗', skewer: '🍢', icecream: '🍦', churro: '🥖', hotdog: '🌭', ramyeon: '🍜', egg: '🥚', picnicmat: '🧺', frisbee: '🥏',
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
  // onRent(product): rent a hanbok, or give it back; rentLeft(product): ms
  // left on this hanbok's rental (0: not renting it).
  constructor({ cart, onTryOn, onExit, onTake, onAdopt, owns, onAdd, hasUmbrella, onUmbrella, onOutfit, wearing, onBuy, onSniff, canGift, onGift, giftLabel, onRent, rentLeft, onFurniture }) {
    Object.assign(this, { cart, onTryOn, onExit, onTake, onAdopt, owns, onAdd, hasUmbrella, onUmbrella, onOutfit, wearing, onBuy, onSniff, canGift, onGift, giftLabel, onRent, rentLeft, onFurniture });
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
    // (an open-air park has no door: you walk off its lawn, so no banner or Exit button)
    this.$('store-banner').hidden = !!store.open;
    this.$('store-name').textContent = localName(store.name, lang);
    this.$('store-name-ko').textContent = lang === 'ko' ? '' : store.name.ko;
    const tag = localName(store.tagline, lang) || '';
    this.$('store-tagline').textContent = comingSoon(store) ? `🚧 ${t('map.soon')}${tag ? ' · ' + tag : ''}` : tag;
    this.$('store-banner').style.setProperty('--store', store.colors.sign);
    this.$('store-banner').querySelector('.sample').hidden = store.category === 'home' || store.category === 'school' || store.category === 'station' || store.category === 'train' || store.category === 'museum' || store.category === 'memorial' || store.category === 'culture' || store.workshop === 'zoo' || store.workshop === 'zoo-sea'; // (the zoo is a real public place, not a made-up brand)
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
    this.$('product-icon').textContent = ITEMS[product.furniture]?.emoji || MODEL_ICON[product.model] || '🛍️';
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
    // Anything you can wear can be tried on: its own look is the try-on.
    const wearLook = ITEMS[product.item || product.outfit]?.wear;
    tryBtn.hidden = !product.tryOn && !wearLook && !product.perfume && !hanbokById(product.rent);
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
    // Lamps and other things for your home: bought once, then placed with Decorate.
    const home = product.furniture && ITEMS[product.furniture] ? product.furniture : null;
    if (home) {
      const mine = this.owns?.(home);
      ab.hidden = false;
      ab.disabled = !!mine;
      ab.textContent = mine ? '✅ ' + L(HOME_HAVE) : `🪙 ${coinsFor(product.price)} · ${L(HOME_BUY)}`;
      ab.onclick = () => { this.onFurniture?.(product); this.openProduct(product); };
      this.$('product-price').textContent = `🪙 ${coinsFor(product.price)}`;
    }
    // Hanbok rental: rent with coins for a few hours, or give it back early.
    const rent = hanbokById(product.rent);
    if (rent) {
      const left = this.rentLeft?.(product) || 0;
      ab.hidden = false;
      ab.disabled = false;
      ab.textContent = left ? '↩️ ' + L(RENT.back) : `🪙 ${rent.coins} · ${fmt(L(RENT.rent), { h: RENT_HOURS })}`;
      ab.onclick = () => { this.onRent?.(product); this.openProduct(product); };
      this.$('product-price').textContent = left ? fmt(L(RENT.left), { t: formatLeft(left) }) : `🪙 ${rent.coins}`;
      this.$('product-desc').textContent = `${localName(product.desc, lang) || ''}\n${fmt(L(RENT.info), { h: RENT_HOURS })}\n${L(RENT.palace)}`;
    }
    // No cart: restaurants take orders at the table, cafés at the counter,
    // fashion is coming soon, and other shops sell for coins to carry home.
    const how = howToGet(this.store);
    this.$('product-take').hidden = true;
    const special = adopt || product.umbrella || outfit || rent || home;
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
    if (itemSoon(this.store, product)) { // nothing to do with it yet: not sold
      add.hidden = true;
      ab.hidden = true;
      howEl.hidden = false;
      howEl.classList.add('soon');
      howEl.textContent = L(HOW.item);
      this.$('product-price').textContent = '';
    } else if (!onSale(product)) { // a limited edition outside its dates
      add.hidden = true;
      howEl.hidden = false;
      howEl.classList.add('soon');
      howEl.textContent = fmt(L(LIMITED.off), product.limited);
    }
    // Buy it for a friend in the shop instead.
    const gift = this.$('product-gift');
    gift.hidden = itemSoon(this.store, product) || !this.canGift?.(product);
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

  toast(text, ms = 1600) {
    const el = this.$('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { el.hidden = true; }, ms);
  }
}
