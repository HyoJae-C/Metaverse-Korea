// Second-hand shop panel: sell clothes you bought for coins (rules in
// core/resale.js). Tap a row's Sell button, confirm, wait for the shop to
// check the receipt, get the coins. Below, the second-hand rack: what other
// players sold to the shops, to buy.
import { L, fmt } from './pocha-ui.js';
import { ITEMS } from '../core/inventory.js';
import { t } from '../core/i18n.js';

export const RESALE_TEXT = {
  open: { en: 'Sell clothes', ko: '옷 팔기', ja: '服を売る', zh: '卖衣服', es: 'Vender ropa', ar: 'بيع الملابس', vi: 'Bán quần áo', hi: 'कपड़े बेचें', fr: 'Vendre des vêtements', th: 'ขายเสื้อผ้า', id: 'Jual baju' },
  title: { en: 'Sell your clothes', ko: '내 옷 팔기', ja: '服を売る', zh: '卖掉你的衣服', es: 'Vende tu ropa', ar: 'بِع ملابسك', vi: 'Bán quần áo của bạn', hi: 'अपने कपड़े बेचें', fr: 'Vends tes vêtements', th: 'ขายเสื้อผ้าของคุณ', id: 'Jual bajumu' },
  rule: {
    en: 'We pay {p}% of what you paid. Only clothes you bought yourself: gifts and code items can\'t be sold.',
    ko: '산 가격의 {p}%를 드려요. 내가 직접 산 옷만 팔 수 있어요. 선물받은 옷과 코드로 받은 옷은 팔 수 없어요.',
    ja: '買った値段の{p}%で買い取ります。自分で買った服だけ売れます。プレゼントやコードでもらった服は売れません。',
    zh: '按你买入价格的{p}%回收。只能卖自己买的衣服，收到的礼物和用代码得到的衣服不能卖。',
    es: 'Pagamos el {p}% de lo que pagaste. Solo ropa que compraste tú: los regalos y los artículos de códigos no se pueden vender.',
    ar: 'ندفع {p}% مما دفعته. فقط الملابس التي اشتريتها بنفسك: لا يمكن بيع الهدايا وعناصر الرموز.',
    vi: 'Chúng tôi trả {p}% giá bạn đã mua. Chỉ bán được đồ bạn tự mua: quà tặng và đồ nhận từ mã không bán được.',
    hi: 'आपने जितने में ख़रीदा, उसका {p}% देते हैं। सिर्फ़ आपके ख़ुद ख़रीदे कपड़े: तोहफ़े और कोड वाले आइटम नहीं बिकते।',
    fr: 'Nous payons {p} % de ce que tu as payé. Seulement les vêtements achetés toi-même : les cadeaux et les objets de code ne peuvent pas être vendus.',
    th: 'เรารับซื้อ {p}% ของราคาที่คุณจ่าย เฉพาะเสื้อผ้าที่ซื้อเองเท่านั้น ของขวัญและไอเทมจากโค้ดขายไม่ได้',
    id: 'Kami bayar {p}% dari harga belimu. Hanya baju yang kamu beli sendiri: hadiah dan item dari kode tidak bisa dijual.',
  },
  empty: {
    en: 'Nothing to sell yet. Bring clothes you bought here when you are done with them.',
    ko: '아직 팔 옷이 없어요. 직접 산 옷을 다 입으면 가져와 주세요.',
    ja: 'まだ売れる服がありません。買った服を着なくなったら持ってきてね。',
    zh: '还没有可以卖的衣服。自己买的衣服不穿了就拿来吧。',
    es: 'Aún no hay nada que vender. Trae la ropa que compraste cuando ya no la uses.',
    ar: 'لا شيء للبيع بعد. أحضر الملابس التي اشتريتها عندما تنتهي منها.',
    vi: 'Chưa có gì để bán. Mang đồ bạn đã mua đến đây khi không mặc nữa.',
    hi: 'अभी बेचने को कुछ नहीं। ख़रीदे कपड़ों से मन भर जाए तो यहाँ ले आइए।',
    fr: 'Rien à vendre pour l\'instant. Apporte les vêtements achetés ici quand tu n\'en veux plus.',
    th: 'ยังไม่มีอะไรให้ขาย นำเสื้อผ้าที่ซื้อมาเมื่อไม่ใช้แล้ว',
    id: 'Belum ada yang bisa dijual. Bawa baju yang kamu beli ke sini kalau sudah tidak dipakai.',
  },
  closed: {
    en: 'We aren\'t buying clothes yet. Come back soon!',
    ko: '아직 옷을 사들이지 않아요. 곧 다시 와 주세요!',
    ja: 'まだ服の買い取りをしていません。また来てね！',
    zh: '我们还没开始收衣服，过阵子再来吧！',
    es: 'Todavía no compramos ropa. ¡Vuelve pronto!',
    ar: 'لا نشتري الملابس بعد. عُد قريبًا!',
    vi: 'Chúng tôi chưa thu mua quần áo. Hãy quay lại sau nhé!',
    hi: 'हम अभी कपड़े नहीं ख़रीदते। जल्द फिर आइए!',
    fr: 'Nous n\'achetons pas encore de vêtements. Reviens bientôt !',
    th: 'เรายังไม่รับซื้อเสื้อผ้า แวะมาใหม่เร็วๆ นี้นะ!',
    id: 'Kami belum membeli baju. Datang lagi nanti ya!',
  },
  offline: {
    en: 'We can\'t check your receipt right now. Please try again in a moment.',
    ko: '지금은 영수증을 확인할 수 없어요. 잠시 후 다시 해 주세요.',
    ja: '今はレシートを確認できません。少ししてからもう一度どうぞ。',
    zh: '现在无法核对你的收据，请稍后再试。',
    es: 'Ahora no podemos revisar tu recibo. Inténtalo de nuevo en un momento.',
    ar: 'لا يمكننا التحقق من إيصالك الآن. حاول مرة أخرى بعد قليل.',
    vi: 'Hiện chưa kiểm tra được hóa đơn. Vui lòng thử lại sau giây lát.',
    hi: 'अभी आपकी रसीद नहीं देख सकते। थोड़ी देर बाद फिर कोशिश करें।',
    fr: 'Impossible de vérifier ton reçu pour l\'instant. Réessaie dans un moment.',
    th: 'ตอนนี้ตรวจใบเสร็จไม่ได้ โปรดลองใหม่อีกสักครู่',
    id: 'Kami belum bisa memeriksa struknya sekarang. Coba lagi sebentar lagi.',
  },
  noref: {
    en: 'We couldn\'t find the receipt for {name}, so we can\'t buy it.',
    ko: '{name}의 영수증을 찾지 못해서 살 수 없어요.',
    ja: '{name}のレシートが見つからないので、買い取れません。',
    zh: '找不到{name}的收据，所以没法回收。',
    es: 'No encontramos el recibo de {name}, así que no podemos comprarlo.',
    ar: 'لم نجد إيصال {name}، لذا لا يمكننا شراؤه.',
    vi: 'Không tìm thấy hóa đơn của {name} nên chúng tôi không mua được.',
    hi: '{name} की रसीद नहीं मिली, इसलिए हम इसे नहीं ख़रीद सकते।',
    fr: 'Impossible de trouver le reçu de {name}, donc nous ne pouvons pas l\'acheter.',
    th: 'ไม่พบใบเสร็จของ {name} จึงรับซื้อไม่ได้',
    id: 'Struk {name} tidak ditemukan, jadi kami tidak bisa membelinya.',
  },
  checking: { en: 'Checking…', ko: '확인 중…', ja: '確認中…', zh: '核对中…', es: 'Revisando…', ar: 'جارٍ التحقق…', vi: 'Đang kiểm tra…', hi: 'जाँच हो रही है…', fr: 'Vérification…', th: 'กำลังตรวจสอบ…', id: 'Memeriksa…' },
  paid: { en: 'Paid 🪙 {n}', ko: '산 가격 🪙 {n}', ja: '購入 🪙 {n}', zh: '买入 🪙 {n}', es: 'Pagaste 🪙 {n}', ar: 'دفعت 🪙 {n}', vi: 'Giá mua 🪙 {n}', hi: 'ख़रीदा 🪙 {n}', fr: 'Payé 🪙 {n}', th: 'จ่ายไป 🪙 {n}', id: 'Dibeli 🪙 {n}' },
  sell: { en: 'Sell 🪙 {n}', ko: '🪙 {n}에 팔기', ja: '🪙 {n}で売る', zh: '🪙 {n} 卖出', es: 'Vender 🪙 {n}', ar: 'بِع 🪙 {n}', vi: 'Bán 🪙 {n}', hi: '🪙 {n} में बेचें', fr: 'Vendre 🪙 {n}', th: 'ขาย 🪙 {n}', id: 'Jual 🪙 {n}' },
  wearing: { en: 'wearing', ko: '착용 중', ja: '着用中', zh: '穿着中', es: 'puesto', ar: 'ترتديه', vi: 'đang mặc', hi: 'पहना हुआ', fr: 'porté', th: 'กำลังใส่', id: 'dipakai' },
  ask: { en: 'Sell {name} for 🪙 {n}?', ko: '{name}을(를) 🪙 {n}에 팔까요?', ja: '{name}を🪙 {n}で売りますか？', zh: '要以 🪙 {n} 卖掉{name}吗？', es: '¿Vender {name} por 🪙 {n}?', ar: 'هل تبيع {name} مقابل 🪙 {n}؟', vi: 'Bán {name} với giá 🪙 {n}?', hi: '{name} को 🪙 {n} में बेचें?', fr: 'Vendre {name} pour 🪙 {n} ?', th: 'ขาย {name} ในราคา 🪙 {n} ไหม?', id: 'Jual {name} seharga 🪙 {n}?' },
  sold: { en: 'Sold! +🪙 {n}', ko: '팔았어요! +🪙 {n}', ja: '売れました！ +🪙 {n}', zh: '卖掉了！+🪙 {n}', es: '¡Vendido! +🪙 {n}', ar: 'تم البيع! +🪙 {n}', vi: 'Đã bán! +🪙 {n}', hi: 'बिक गया! +🪙 {n}', fr: 'Vendu ! +🪙 {n}', th: 'ขายแล้ว! +🪙 {n}', id: 'Terjual! +🪙 {n}' },
  thanks: { en: 'Thank you! Someone will love it.', ko: '감사해요! 좋은 주인 만날 거예요.', ja: 'ありがとう！きっと新しい持ち主が見つかります。', zh: '谢谢！它会遇到喜欢它的人。', es: '¡Gracias! A alguien le encantará.', ar: 'شكرًا! سيحبها شخص ما.', vi: 'Cảm ơn! Sẽ có người thích nó.', hi: 'धन्यवाद! किसी को यह ज़रूर पसंद आएगा।', fr: 'Merci ! Quelqu\'un va l\'adorer.', th: 'ขอบคุณ! ต้องมีคนชอบแน่นอน', id: 'Terima kasih! Pasti ada yang suka.' },
};

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export class ResaleUI {
  // pct() → the share shops pay (null: not buying yet); list() → [{ id,
  // paid, coins }]; wearing(id) → bool; onSell(row) → Promise of a message
  // to show in the panel (or nothing). The rack: rack() → { pct, rows: [{
  // item, price, n, have }] } or null (closed); onOpen() → Promise (fetch the
  // rack); onBuy(row) → Promise of a message.
  constructor({ root, pct, list, wearing, onSell, rack = () => null, onOpen = null, onBuy = null }) {
    Object.assign(this, { root, pct, list, wearing, onSell, rack, onOpen, onBuy });
    this.busy = false;
  }

  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    this.root.hidden = false;
    this.render();
    this.onOpen?.()?.then(() => { if (this.open && !this.busy) this.render(); }).catch(() => {});
  }

  render(msg) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const pct = this.pct();
    this.root.replaceChildren(x, el('h3', null, '♻️ ' + L(RESALE_TEXT.title)));
    if (pct == null || pct <= 0) { this.root.append(el('p', 'fine', L(RESALE_TEXT.closed))); this.renderRack(); return; }
    this.root.append(el('p', 'fine', fmt(L(RESALE_TEXT.rule), { p: pct })));
    if (msg) this.root.append(el('p', 'fine resale-msg', msg));
    const rows = this.list();
    if (!rows.length) { this.root.append(el('p', 'fine', L(RESALE_TEXT.empty))); this.renderRack(); return; }
    const list = el('div', 'fish-list');
    for (const r of rows) {
      const it = ITEMS[r.id];
      const name = L(it.name);
      const row = el('div', 'fish-row');
      const label = el('span', 'fish-name', name);
      label.append(el('small', 'resale-paid', ` · ${fmt(L(RESALE_TEXT.paid), { n: r.paid })}${this.wearing(r.id) ? ' · ' + L(RESALE_TEXT.wearing) : ''}`));
      const sell = el('button', 'chip', fmt(L(RESALE_TEXT.sell), { n: r.coins }));
      sell.disabled = this.busy;
      sell.onclick = async () => {
        if (this.busy || !confirm(fmt(L(RESALE_TEXT.ask), { name, n: r.coins }))) return;
        this.busy = true;
        list.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        sell.textContent = L(RESALE_TEXT.checking);
        let out;
        try { out = await this.onSell(r); } finally { this.busy = false; }
        if (this.open) this.render(out);
      };
      row.append(el('span', 'fish-emoji', it.emoji || '👕'), label, sell);
      list.append(row);
    }
    this.root.append(list);
    this.renderRack();
  }

  // The second-hand rack, under the selling list.
  renderRack() {
    const rack = this.rack();
    if (!rack) return;
    this.root.append(el('h4', 'resale-rack', '👗 ' + t('used.rack')), el('p', 'fine', t('used.rule', { p: rack.pct })));
    if (!rack.rows.length) { this.root.append(el('p', 'fine', t('used.empty'))); return; }
    const list = el('div', 'fish-list');
    for (const r of rack.rows) {
      const it = ITEMS[r.item];
      const name = L(it.name);
      const row = el('div', 'fish-row');
      const label = el('span', 'fish-name', name);
      label.append(el('small', 'resale-paid', ` · ${r.have ? t('used.have') : t('used.left', { n: r.n })}`));
      const buy = el('button', 'chip', t('used.buy', { n: r.price }));
      buy.disabled = this.busy || r.have;
      buy.onclick = async () => {
        if (this.busy || !confirm(t('used.ask', { name, n: r.price }))) return;
        this.busy = true;
        this.root.querySelectorAll('button.chip').forEach((b) => { b.disabled = true; });
        buy.textContent = L(RESALE_TEXT.checking);
        let out;
        try { out = await this.onBuy?.(r); } finally { this.busy = false; }
        if (this.open) this.render(out);
      };
      row.append(el('span', 'fish-emoji', it.emoji || '👕'), label, buy);
      list.append(row);
    }
    this.root.append(list);
  }
}
