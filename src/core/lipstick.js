// Lipstick: the lip shops' mirror is for trying colours on for free; to
// really wear one you buy a lipstick of that colour (5 uses), carry it in
// the bag and put it on anywhere. Each time uses one; the colour stays on
// until you put on another, so a few lipsticks let you switch between them.
// Going back to your own lips (at a lip shop's mirror) is free.
import { PALETTES } from '../data/appearance.js';

export const LIPSTICK_USES = 5;
// Road-shop prices (₩11,000-19,000); a shop sets its own with "lipPrice"
// (a department-store counter would be ₩40,000-50,000).
export const LIPSTICK_PRICE = 15000;
export const lipPrice = (store) => (Number.isFinite(store?.lipPrice) && store.lipPrice > 0 ? store.lipPrice : LIPSTICK_PRICE);

export const isShade = (c) => typeof c === 'string' && Object.hasOwn(PALETTES.lip, c);
export const shadeHex = (c) => '#' + (PALETTES.lip[c] ?? 0xd94c5f).toString(16).padStart(6, '0');

// A lipstick in the bag or the hand: { kind: 'lipstick', c: '<shade>', sips: uses left }.
export function lipstickEntry(e) {
  const sips = Math.min(LIPSTICK_USES, e?.sips | 0);
  return sips > 0 && isShade(e?.c) ? { kind: 'lipstick', c: e.c, sips } : null;
}

// Put it on: the new look, what's left in the hand (null once used up) and
// the uses left.
export function applyLipstick(entry, look) {
  const e = lipstickEntry(entry);
  if (!e) return null;
  const left = e.sips - 1;
  return { look: { ...look, lip: e.c }, held: left > 0 ? { ...e, sips: left } : null, left };
}

// The shade's name in the shop's words ('hotpink' → 'Hotpink').
export const shadeName = (c) => (isShade(c) ? c[0].toUpperCase() + c.slice(1) : '');

export const LIPSTICK_TEXT = {
  name: { en: 'Lipstick · {shade}', ko: '립스틱 · {shade}', ja: 'リップ · {shade}', zh: '口红 · {shade}', es: 'Labial · {shade}', ar: 'أحمر شفاه · {shade}', vi: 'Son môi · {shade}', hi: 'लिपस्टिक · {shade}', fr: 'Rouge à lèvres · {shade}', th: 'ลิปสติก · {shade}', id: 'Lipstik · {shade}' },
  apply: { en: 'Apply', ko: '바르기', ja: 'ぬる', zh: '涂', es: 'Aplicar', ar: 'ضعي', vi: 'Thoa', hi: 'लगाएँ', fr: 'Appliquer', th: 'ทา', id: 'Pakai' },
  buy: { en: 'Buy lipstick · 💄×{n} · 🪙 {coins}', ko: '립스틱 사기 · 💄×{n} · 🪙 {coins}', ja: 'リップを買う · 💄×{n} · 🪙 {coins}', zh: '买口红 · 💄×{n} · 🪙 {coins}', es: 'Comprar labial · 💄×{n} · 🪙 {coins}', ar: 'اشترِ أحمر الشفاه · 💄×{n} · 🪙 {coins}', vi: 'Mua son · 💄×{n} · 🪙 {coins}', hi: 'लिपस्टिक ख़रीदें · 💄×{n} · 🪙 {coins}', fr: 'Acheter le rouge · 💄×{n} · 🪙 {coins}', th: 'ซื้อลิป · 💄×{n} · 🪙 {coins}', id: 'Beli lipstik · 💄×{n} · 🪙 {coins}' },
  tryFree: { en: 'Try any colour for free · a lipstick has {n} uses', ko: '색은 무료로 테스트 · 립스틱 하나로 {n}번 발라요', ja: '色はタダで試せます · リップ1本で{n}回', zh: '颜色可免费试 · 一支口红能涂{n}次', es: 'Prueba colores gratis · un labial tiene {n} usos', ar: 'جرّبي الألوان مجانًا · أحمر الشفاه يكفي {n} مرات', vi: 'Thử màu miễn phí · mỗi thỏi son dùng {n} lần', hi: 'रंग मुफ़्त में आज़माएँ · एक लिपस्टिक {n} बार चलती है', fr: 'Essai gratuit · un rouge sert {n} fois', th: 'ลองสีได้ฟรี · ลิปหนึ่งแท่งทาได้ {n} ครั้ง', id: 'Coba warna gratis · satu lipstik bisa {n} kali' },
  got: { en: 'You bought {name}! It\'s in your 🎒 Bag › 👗 Wardrobe: put it on from there, any time, anywhere.', ko: '{name}을(를) 샀어요! 🎒 가방 › 👗 옷장에서 언제 어디서든 발라요.', ja: '{name}を買いました！🎒 バッグ › 👗 クローゼットからいつでもぬれます。', zh: '买了{name}！在🎒背包 › 👗衣橱里随时都能涂。', es: '¡Compraste {name}! Está en 🎒 Bolsa › 👗 Armario: aplícalo desde ahí cuando quieras.', ar: 'اشتريت {name}! إنه في 🎒 الحقيبة › 👗 الخزانة: ضعيه من هناك في أي وقت.', vi: 'Bạn đã mua {name}! Nó ở 🎒 Túi › 👗 Tủ đồ: thoa từ đó bất cứ lúc nào.', hi: 'आपने {name} ख़रीदी! यह 🎒 बैग › 👗 अलमारी में है: वहीं से कभी भी लगाएँ।', fr: 'Vous avez acheté {name} ! Il est dans 🎒 Sac › 👗 Garde-robe : appliquez-le de là, quand vous voulez.', th: 'ซื้อ {name} แล้ว! อยู่ใน 🎒 กระเป๋า › 👗 ตู้เสื้อผ้า ทาจากตรงนั้นได้ทุกเวลา', id: 'Kamu membeli {name}! Ada di 🎒 Tas › 👗 Lemari: pakai dari sana kapan saja.' },
  full: { en: 'Your wardrobe has no room for more perfume and lipstick.', ko: '옷장에 향수·립스틱 자리가 없어요.', ja: 'クローゼットに香水・リップの空きがありません。', zh: '衣橱放不下更多香水和口红了。' },
  applied: { en: '💄 {name} · stays on until you change it · {n} uses left', ko: '💄 {name} · 바꾸기 전까지 그대로예요 · {n}번 남음', ja: '💄 {name} · 変えるまでそのまま · 残り{n}回', zh: '💄 {name} · 换之前一直保持 · 还剩{n}次', es: '💄 {name} · dura hasta que lo cambies · quedan {n}', ar: '💄 {name} · يبقى حتى تغيّريه · بقي {n}', vi: '💄 {name} · giữ màu đến khi bạn đổi · còn {n} lần', hi: '💄 {name} · बदलने तक रहेगा · {n} बार बाक़ी', fr: '💄 {name} · reste jusqu\'au prochain · encore {n}', th: '💄 {name} · ติดอยู่จนกว่าจะเปลี่ยน · เหลือ {n} ครั้ง', id: '💄 {name} · bertahan sampai diganti · sisa {n}' },
  last: { en: '💄 {name} · stays on until you change it · that was the last use', ko: '💄 {name} · 바꾸기 전까지 그대로예요 · 마지막 한 번이었어요', ja: '💄 {name} · 変えるまでそのまま · 最後の1回でした', zh: '💄 {name} · 换之前一直保持 · 最后一次了', es: '💄 {name} · dura hasta que lo cambies · era el último', ar: '💄 {name} · يبقى حتى تغيّريه · كانت آخر مرة', vi: '💄 {name} · giữ màu đến khi bạn đổi · đó là lần cuối', hi: '💄 {name} · बदलने तक रहेगा · यह आख़िरी बार था', fr: '💄 {name} · reste jusqu\'au prochain · c\'était le dernier', th: '💄 {name} · ติดอยู่จนกว่าจะเปลี่ยน · ครั้งสุดท้ายแล้ว', id: '💄 {name} · bertahan sampai diganti · itu yang terakhir' },
  desc: { en: '{n} uses left. Hold it and tap 💄 Apply; the colour stays until you change it.', ko: '{n}번 남음. 손에 들고 💄 바르기를 눌러요. 바꾸기 전까지 색이 그대로예요.', ja: '残り{n}回。手に持って💄をタップ。変えるまで色はそのまま。', zh: '还剩{n}次。拿在手上点💄。换之前颜色一直保持。', es: 'Quedan {n}. Sostenlo y toca 💄; el color dura hasta que lo cambies.', ar: 'بقي {n}. أمسكيه واضغطي 💄؛ يبقى اللون حتى تغيّريه.', vi: 'Còn {n} lần. Cầm trên tay và bấm 💄; màu giữ đến khi bạn đổi.', hi: '{n} बार बाक़ी। हाथ में लेकर 💄 दबाएँ; रंग बदलने तक रहता है।', fr: 'Encore {n}. Tenez-le et touchez 💄 ; la couleur reste jusqu\'au prochain.', th: 'เหลือ {n} ครั้ง ถือไว้แล้วกด 💄 สีจะติดอยู่จนกว่าจะเปลี่ยน', id: 'Sisa {n}. Pegang dan ketuk 💄; warnanya bertahan sampai diganti.' },
};
