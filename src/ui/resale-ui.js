// Second-hand shop panel: sell clothes you bought for coins (rules in
// core/resale.js). Tap a row's Sell button, confirm, get the coins.
import { L, fmt } from './pocha-ui.js';
import { ITEMS } from '../core/inventory.js';

export const RESALE_TEXT = {
  open: { en: 'Sell clothes', ko: '옷 팔기', ja: '服を売る', zh: '卖衣服', es: 'Vender ropa', ar: 'بيع الملابس', vi: 'Bán quần áo', hi: 'कपड़े बेचें', id: 'Jual baju' },
  title: { en: 'Sell your clothes', ko: '내 옷 팔기', ja: '服を売る', zh: '卖掉你的衣服', es: 'Vende tu ropa', ar: 'بِع ملابسك', vi: 'Bán quần áo của bạn', hi: 'अपने कपड़े बेचें', id: 'Jual bajumu' },
  rule: {
    en: 'We pay half of what you paid. Only clothes you bought yourself: gifts and code items can\'t be sold.',
    ko: '산 가격의 절반을 드려요. 내가 직접 산 옷만 팔 수 있어요. 선물받은 옷과 코드로 받은 옷은 팔 수 없어요.',
    ja: '買った値段の半額で買い取ります。自分で買った服だけ売れます。プレゼントやコードでもらった服は売れません。',
    zh: '按你买入价格的一半回收。只能卖自己买的衣服，收到的礼物和用代码得到的衣服不能卖。',
    es: 'Pagamos la mitad de lo que pagaste. Solo ropa que compraste tú: los regalos y los artículos de códigos no se pueden vender.',
    ar: 'ندفع نصف ما دفعته. فقط الملابس التي اشتريتها بنفسك: لا يمكن بيع الهدايا وعناصر الرموز.',
    vi: 'Chúng tôi trả một nửa giá bạn đã mua. Chỉ bán được đồ bạn tự mua: quà tặng và đồ nhận từ mã không bán được.',
    hi: 'आपने जितने में ख़रीदा, उसका आधा देते हैं। सिर्फ़ आपके ख़ुद ख़रीदे कपड़े: तोहफ़े और कोड वाले आइटम नहीं बिकते।',
    id: 'Kami bayar setengah dari harga belimu. Hanya baju yang kamu beli sendiri: hadiah dan item dari kode tidak bisa dijual.',
  },
  empty: {
    en: 'Nothing to sell yet. Clothes you buy go in your bag 🎒; bring them here when you are done with them.',
    ko: '아직 팔 옷이 없어요. 산 옷은 가방 🎒에 들어가요. 다 입은 옷을 가져와 주세요.',
    ja: 'まだ売れる服がありません。買った服はバッグ 🎒 に入ります。着なくなったら持ってきてね。',
    zh: '还没有可以卖的衣服。买的衣服会放进背包 🎒，不穿了就拿来吧。',
    es: 'Aún no hay nada que vender. La ropa que compras va a tu bolsa 🎒; tráela cuando ya no la uses.',
    ar: 'لا شيء للبيع بعد. الملابس التي تشتريها تذهب إلى حقيبتك 🎒؛ أحضرها هنا عندما تنتهي منها.',
    vi: 'Chưa có gì để bán. Đồ bạn mua sẽ vào túi 🎒; mang đến đây khi không mặc nữa.',
    hi: 'अभी बेचने को कुछ नहीं। ख़रीदे कपड़े आपके बैग 🎒 में जाते हैं; जब मन भर जाए तो यहाँ ले आइए।',
    id: 'Belum ada yang bisa dijual. Baju yang kamu beli masuk ke tas 🎒; bawa ke sini kalau sudah tidak dipakai.',
  },
  paid: { en: 'Paid 🪙 {n}', ko: '산 가격 🪙 {n}', ja: '購入 🪙 {n}', zh: '买入 🪙 {n}', es: 'Pagaste 🪙 {n}', ar: 'دفعت 🪙 {n}', vi: 'Giá mua 🪙 {n}', hi: 'ख़रीदा 🪙 {n}', id: 'Dibeli 🪙 {n}' },
  sell: { en: 'Sell 🪙 {n}', ko: '🪙 {n}에 팔기', ja: '🪙 {n}で売る', zh: '🪙 {n} 卖出', es: 'Vender 🪙 {n}', ar: 'بِع 🪙 {n}', vi: 'Bán 🪙 {n}', hi: '🪙 {n} में बेचें', id: 'Jual 🪙 {n}' },
  wearing: { en: 'wearing', ko: '착용 중', ja: '着用中', zh: '穿着中', es: 'puesto', ar: 'ترتديه', vi: 'đang mặc', hi: 'पहना हुआ', id: 'dipakai' },
  ask: { en: 'Sell {name} for 🪙 {n}?', ko: '{name}을(를) 🪙 {n}에 팔까요?', ja: '{name}を🪙 {n}で売りますか？', zh: '要以 🪙 {n} 卖掉{name}吗？', es: '¿Vender {name} por 🪙 {n}?', ar: 'هل تبيع {name} مقابل 🪙 {n}؟', vi: 'Bán {name} với giá 🪙 {n}?', hi: '{name} को 🪙 {n} में बेचें?', id: 'Jual {name} seharga 🪙 {n}?' },
  sold: { en: 'Sold! +🪙 {n}', ko: '팔았어요! +🪙 {n}', ja: '売れました！ +🪙 {n}', zh: '卖掉了！+🪙 {n}', es: '¡Vendido! +🪙 {n}', ar: 'تم البيع! +🪙 {n}', vi: 'Đã bán! +🪙 {n}', hi: 'बिक गया! +🪙 {n}', id: 'Terjual! +🪙 {n}' },
  thanks: { en: 'Thank you! Someone will love it.', ko: '감사해요! 좋은 주인 만날 거예요.', ja: 'ありがとう！きっと新しい持ち主が見つかります。', zh: '谢谢！它会遇到喜欢它的人。', es: '¡Gracias! A alguien le encantará.', ar: 'شكرًا! سيحبها شخص ما.', vi: 'Cảm ơn! Sẽ có người thích nó.', hi: 'धन्यवाद! किसी को यह ज़रूर पसंद आएगा।', id: 'Terima kasih! Pasti ada yang suka.' },
};

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export class ResaleUI {
  // list() → [{ id, paid, coins }]; wearing(id) → bool; onSell(row) → sells it.
  constructor({ root, list, wearing, onSell }) {
    Object.assign(this, { root, list, wearing, onSell });
  }

  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() { this.root.hidden = false; this.render(); }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '♻️ ' + L(RESALE_TEXT.title)), el('p', 'fine', L(RESALE_TEXT.rule)));
    const rows = this.list();
    if (!rows.length) { this.root.append(el('p', 'fine', L(RESALE_TEXT.empty))); return; }
    const list = el('div', 'fish-list');
    for (const r of rows) {
      const it = ITEMS[r.id];
      const name = L(it.name);
      const row = el('div', 'fish-row');
      const label = el('span', 'fish-name', name);
      label.append(el('small', 'resale-paid', ` · ${fmt(L(RESALE_TEXT.paid), { n: r.paid })}${this.wearing(r.id) ? ' · ' + L(RESALE_TEXT.wearing) : ''}`));
      const sell = el('button', 'chip', fmt(L(RESALE_TEXT.sell), { n: r.coins }));
      sell.onclick = () => {
        if (!confirm(fmt(L(RESALE_TEXT.ask), { name, n: r.coins }))) return;
        this.onSell(r);
        this.render();
      };
      row.append(el('span', 'fish-emoji', it.emoji || '👕'), label, sell);
      list.append(row);
    }
    this.root.append(list);
  }
}
