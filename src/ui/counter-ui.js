// Ordering at the counter (META COFFEE, the mocktail bar, the clubs): talk to
// the clerk or bartender, pick from the menu and pay coins. The drink is
// handed over to carry around.
import { localName, getLanguage } from '../core/i18n.js';
import { L, fmt } from './pocha-ui.js';

// Money is won: the menu price (like the restaurants).
export const coinPrice = (krw) => Math.max(100, Math.round(Number(krw) || 0));
// Which held thing a menu item becomes: a coffee cup to go (it refills your
// stamina), a snack box, or a glass from the bar.
export const heldFor = (product, store) => (['skewer', 'bread', 'samgak', 'bowl', 'roll'].includes(product.model) ? 'food' : store?.takeaway || store?.category === 'cafe' ? 'coffee' : 'glass');

const T = {
  title: { en: 'Menu', ko: '메뉴', ja: 'メニュー', zh: '菜单', es: 'Carta', ar: 'القائمة', vi: 'Thực đơn', hi: 'मेन्यू', fr: 'Menu', th: 'เมนู', id: 'Menu' },
  hint: { en: 'Order and pay at the counter.', ko: '카운터에서 주문하고 계산해요.', ja: 'カウンターで注文して支払います。', zh: '在柜台点单付款。', es: 'Pide y paga en el mostrador.', ar: 'اطلب وادفع عند الكاونتر.', vi: 'Gọi món và trả tiền ở quầy.', hi: 'काउंटर पर ऑर्डर करें और भुगतान करें।', fr: 'Commande et paie au comptoir.', th: 'สั่งและจ่ายเงินที่เคาน์เตอร์', id: 'Pesan dan bayar di kasir.' },
  coffeeHint: { en: 'Coffee to go: sip it while you walk and your stamina fills right up!', ko: '테이크아웃 커피: 들고 다니며 마시면 체력이 바로 가득 차요!', ja: 'テイクアウトコーヒー：飲むとスタミナがすぐ満タンに！', zh: '外带咖啡：边走边喝，体力马上回满！', es: 'Café para llevar: ¡bébelo y tu energía se llena al instante!', ar: 'قهوة للطريق: ارتشفها وأنت تمشي فتمتلئ طاقتك فورًا!', vi: 'Cà phê mang đi: vừa đi vừa nhấp, thể lực sẽ hồi đầy ngay!', hi: 'टेकअवे कॉफ़ी: चलते-चलते पिएँ और आपकी ताक़त तुरंत भर जाएगी!', fr: 'Café à emporter : bois-le en marchant et ton endurance remonte tout de suite !', th: 'กาแฟแบบเทคอะเวย์: จิบไปเดินไป ค่าพลังจะเต็มทันที!', id: 'Kopi bawa pulang: seruput sambil jalan dan staminamu langsung penuh!' },
  buy: { en: '🪙 {n}', ko: '🪙 {n}', ja: '🪙 {n}', zh: '🪙 {n}', es: '🪙 {n}', ar: '🪙 {n}', vi: '🪙 {n}', hi: '🪙 {n}', fr: '🪙 {n}', th: '🪙 {n}', id: '🪙 {n}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', ar: 'إغلاق', vi: 'Đóng', hi: 'बंद करें', fr: 'Fermer', th: 'ปิด', id: 'Tutup' },
};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const ICON = { cup: '🥤', cocktail: '🍹', skewer: '🍢', bread: '🥐', ramyeon: '🍜', egg: '🥚', picnicmat: '🧺' };

export class CounterUI {
  // onBuy(store, product, coins): pay and hand it over; true when done.
  // canGift() / onGift(store, product): buy a drink for a friend here.
  constructor({ root, onBuy, canGift, onGift }) {
    Object.assign(this, { root, onBuy, canGift, onGift });
  }
  get open() { return !this.root.hidden; }
  show(store) { this.store = store; this.root.hidden = false; this.render(); }
  close() { this.root.hidden = true; }
  render(note) {
    const s = this.store, lang = getLanguage();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', L(T.close));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, `🧾 ${localName(s.name, lang)} · ${L(T.title)}`), el('p', 'order-hint', L(s.takeaway || s.category === 'cafe' ? T.coffeeHint : T.hint)));
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const list = el('div', 'counter-list');
    const gifts = !!this.canGift?.();
    // Things that aren't a drink or a snack (a bag of beans) aren't on the menu yet.
    for (const p of s.products.filter((q) => !q.goods)) {
      const row = el('div', 'counter-row');
      const icon = el('span', 'counter-icon', ICON[p.model] || '🥤');
      icon.style.background = p.color;
      const txt = el('span', 'counter-text');
      txt.append(el('strong', null, localName(p.name, lang)), el('small', null, lang === 'ko' ? '' : p.name.ko || ''));
      const n = coinPrice(p.price);
      const buy = el('button', 'primary counter-buy', fmt(L(T.buy), { n }));
      buy.onclick = () => { if (this.onBuy?.(s, p, n)) this.close(); };
      row.append(icon, txt);
      if (gifts && !p.ingredient) { // (bag goods aren't a treat to hand over)
        const g = el('button', 'chip counter-gift', '🎁');
        g.setAttribute('aria-label', 'Gift');
        g.onclick = () => this.onGift?.(s, p);
        row.append(g);
      }
      row.append(buy);
      list.append(row);
    }
    this.root.append(list);
  }
}
