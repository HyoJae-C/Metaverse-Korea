// Ordering at the counter (META COFFEE, the cocktail bar, the clubs): talk to
// the clerk or bartender, pick from the menu and pay coins. The drink is
// handed over to carry around.
import { localName, getLanguage } from '../core/i18n.js';
import { L, fmt } from './pocha-ui.js';

// 1 coin per ₩1,000, rounded up (like the restaurants).
export const coinPrice = (krw) => Math.max(1, Math.ceil((Number(krw) || 0) / 1000));
// Which held thing a menu item becomes: a coffee cup to go (it refills your
// stamina), a snack box, or a glass from the bar.
export const heldFor = (product, store) => (['skewer', 'bread', 'samgak', 'bowl', 'roll'].includes(product.model) ? 'food' : store?.takeaway || store?.category === 'cafe' ? 'coffee' : 'glass');

const T = {
  title: { en: 'Menu', ko: '메뉴', ja: 'メニュー', zh: '菜单', es: 'Carta', ar: 'القائمة', id: 'Menu' },
  hint: { en: 'Order and pay with coins.', ko: '코인으로 주문해요.', ja: 'コインで注文できます。', zh: '用硬币点单。', es: 'Pide y paga con monedas.', ar: 'اطلب وادفع بالعملات.', id: 'Pesan dan bayar dengan koin.' },
  coffeeHint: { en: 'Coffee to go: sip it while you walk and your stamina fills right up!', ko: '테이크아웃 커피: 들고 다니며 마시면 체력이 바로 가득 차요!', ja: 'テイクアウトコーヒー：飲むとスタミナがすぐ満タンに！', zh: '外带咖啡：边走边喝，体力马上回满！', es: 'Café para llevar: ¡bébelo y tu energía se llena al instante!', ar: 'قهوة للطريق: ارتشفها وأنت تمشي فتمتلئ طاقتك فورًا!', id: 'Kopi bawa pulang: seruput sambil jalan dan staminamu langsung penuh!' },
  buy: { en: '🪙 {n}', ko: '🪙 {n}', ja: '🪙 {n}', zh: '🪙 {n}', es: '🪙 {n}', ar: '🪙 {n}', id: '🪙 {n}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭', es: 'Cerrar', ar: 'إغلاق', id: 'Tutup' },
};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const ICON = { cup: '🥤', cocktail: '🍹', skewer: '🍢', bread: '🥐' };

export class CounterUI {
  // onBuy(store, product, coins): pay and hand it over; true when done.
  constructor({ root, onBuy }) {
    Object.assign(this, { root, onBuy });
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
    for (const p of s.products) {
      const row = el('div', 'counter-row');
      const icon = el('span', 'counter-icon', ICON[p.model] || '🥤');
      icon.style.background = p.color;
      const txt = el('span', 'counter-text');
      txt.append(el('strong', null, localName(p.name, lang)), el('small', null, lang === 'ko' ? '' : p.name.ko || ''));
      const n = coinPrice(p.price);
      const buy = el('button', 'primary counter-buy', fmt(L(T.buy), { n }));
      buy.onclick = () => { if (this.onBuy?.(s, p, n)) this.close(); };
      row.append(icon, txt, buy);
      list.append(row);
    }
    this.root.append(list);
  }
}
