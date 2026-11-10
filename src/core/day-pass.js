// Day passes: places you pay once to get in, then come and go all day, like
// a real jjimjilbang or public pool in Seoul. Paid at the door (main.js
// enterStore); saved on this device by local day.

// won, by the store's workshop
export const DAY_PASS = { sauna: 12000, pool: 5000 };

export const DAY_PASS_TEXT = {
  sauna: { en: 'Jjimjilbang day pass', ko: '찜질방 1일 이용권', ja: 'チムジルバン1日券', zh: '汗蒸房一日券', es: 'Pase de un día al jjimjilbang', id: 'Tiket harian jjimjilbang', vi: 'Vé ngày jjimjilbang', hi: 'जिमजिलबांग डे पास', fr: 'Pass journée jjimjilbang', th: 'บัตรรายวันจิมจิลบัง', ar: 'تذكرة يوم للجيمجيلبانغ' },
  pool: { en: 'Pool day pass', ko: '수영장 1일 이용권', ja: 'プール1日券', zh: '游泳池一日券', es: 'Pase de un día a la piscina', id: 'Tiket harian kolam renang', vi: 'Vé ngày hồ bơi', hi: 'पूल डे पास', fr: 'Pass journée piscine', th: 'บัตรรายวันสระว่ายน้ำ', ar: 'تذكرة يوم للمسبح' },
  rides: { en: 'Ride-all day pass', ko: '자유이용권', ja: 'フリーパス', zh: '畅玩一日券', es: 'Pase de un día para todas las atracciones', id: 'Tiket terusan harian', vi: 'Vé chơi cả ngày', hi: 'सभी राइड्स का डे पास', fr: 'Pass journée toutes attractions', th: 'บัตรเล่นทุกเครื่องเล่นทั้งวัน', ar: 'تذكرة يوم لكل الألعاب' },
  ridesHeld: { en: '{name}: every ride free until 24 hours after you bought it ✓', ko: '{name}: 산 뒤 24시간 동안 모든 놀이기구 무제한 ✓', ja: '{name}：購入から24時間、全アトラクション乗り放題 ✓', zh: '{name}：购买后24小时内所有设施随便玩 ✓', es: '{name}: todas las atracciones durante 24 horas desde la compra ✓', id: '{name}: naik semua wahana sepuasnya selama 24 jam sejak dibeli ✓', vi: '{name}: chơi mọi trò trong 24 giờ kể từ khi mua ✓', hi: '{name}: ख़रीदने के 24 घंटे तक सभी राइड्स ✓', fr: '{name} : toutes les attractions pendant 24 h après l\'achat ✓', th: '{name}: เล่นได้ทุกเครื่อง 24 ชั่วโมงหลังซื้อ ✓', ar: '{name}: كل الألعاب لمدة 24 ساعة من الشراء ✓' },
  ridesPaid: { en: '🎫 {name}: 🪙 {n}. Every ride in the park, as often as you like, for 24 hours from now (the roller coaster and bumper cars too).', ko: '🎫 {name}: 🪙 {n}. 지금부터 24시간 동안 공원 안 모든 놀이기구를 마음껏 탈 수 있어요 (롤러코스터, 범퍼카 포함).', ja: '🎫 {name}：🪙 {n}。今から24時間、園内の全アトラクションに何度でも乗れます（ジェットコースター・バンパーカーも）。', zh: '🎫 {name}：🪙 {n}。从现在起24小时内园内所有设施随便玩（含过山车和碰碰车）。', es: '🎫 {name}: 🪙 {n}. Todas las atracciones del parque, las veces que quieras, durante 24 horas desde ahora (montaña rusa y autos de choque incluidos).', id: '🎫 {name}: 🪙 {n}. Semua wahana di taman, sepuasnya, selama 24 jam mulai sekarang (roller coaster dan bom-bom car juga).', vi: '🎫 {name}: 🪙 {n}. Chơi mọi trò trong công viên bao nhiêu lần tùy thích trong 24 giờ kể từ bây giờ (cả tàu lượn và xe điện đụng).', hi: '🎫 {name}: 🪙 {n}। अभी से 24 घंटे तक पार्क की हर राइड जितनी बार चाहें (रोलर कोस्टर और बंपर कार भी)।', fr: '🎫 {name} : 🪙 {n}. Toutes les attractions du parc, autant de fois que tu veux, pendant 24 heures à partir de maintenant (montagnes russes et autos tamponneuses comprises).', th: '🎫 {name}: 🪙 {n} เล่นได้ทุกเครื่องในสวนสนุกกี่รอบก็ได้ 24 ชั่วโมงนับจากนี้ (รวมรถไฟเหาะและรถบั๊มพ์)', ar: '🎫 {name}: 🪙 {n}. كل ألعاب الحديقة بقدر ما تريد لمدة 24 ساعة من الآن (بما فيها الأفعوانية وسيارات التصادم).' },
  paid: { en: '🎫 {name}: 🪙 {n}. Come and go all day today.', ko: '🎫 {name}: 🪙 {n}. 오늘 하루 자유롭게 드나들 수 있어요.', ja: '🎫 {name}：🪙 {n}。今日は一日出入り自由です。', zh: '🎫 {name}：🪙 {n}。今天可以随意进出。', es: '🎫 {name}: 🪙 {n}. Entra y sal todo el día.', id: '🎫 {name}: 🪙 {n}. Bebas keluar masuk hari ini.', vi: '🎫 {name}: 🪙 {n}. Ra vào tự do cả ngày hôm nay.', hi: '🎫 {name}: 🪙 {n}। आज पूरे दिन आ-जा सकते हैं।', fr: '🎫 {name} : 🪙 {n}. Entre et sors librement toute la journée.', th: '🎫 {name}: 🪙 {n} เข้าออกได้ตลอดทั้งวันนี้', ar: '🎫 {name}: 🪙 {n}. ادخل واخرج طوال اليوم.' },
  short: { en: '{name} costs 🪙 {n}. Not enough money.', ko: '{name}은 🪙 {n}이에요. 돈이 모자라요.', ja: '{name}は 🪙 {n} です。お金が足りません。', zh: '{name}需要 🪙 {n}。钱不够。', es: '{name} cuesta 🪙 {n}. No te alcanza.', id: '{name} seharga 🪙 {n}. Uangmu kurang.', vi: '{name} giá 🪙 {n}. Không đủ tiền.', hi: '{name} 🪙 {n} का है। पैसे कम हैं।', fr: '{name} coûte 🪙 {n}. Pas assez d\'argent.', th: '{name} ราคา 🪙 {n} เงินไม่พอ', ar: '{name} بسعر 🪙 {n}. المال لا يكفي.' },
};

const KEY = 'mk.daypass';
// The ride-all pass (and the ride tickets, core/ride-tickets.js): 24 hours from buying.
export const PASS_MS = 24 * 60 * 60 * 1000;
const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export class DayPasses {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    try { this.s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { this.s = {}; }
  }
  // The fee to get into a store today: 0 when it needs no pass or one is held.
  feeFor(store) {
    const fee = DAY_PASS[store?.workshop];
    return fee && this.s[store.workshop] !== today(this.now()) ? fee : 0;
  }
  // A pass that isn't a door fee (the theme park's ride-all pass, key
  // 'rides'): held now? It's good for PASS_MS from when it was bought (a
  // number: when it runs out); one saved as a day (before 2026-11-11) still
  // lasts that day.
  has(key) { const v = this.s[key]; return typeof v === 'number' ? this.now().getTime() < v : v === today(this.now()); }
  // When it runs out (ms), or 0 when not held.
  until(key) { const v = this.s[key]; return this.has(key) && typeof v === 'number' ? v : 0; }
  // Buy it through wallet.spend; true when held (now or already).
  buy(key, fee, wallet, note) {
    if (this.has(key)) return true;
    if (!wallet.spend(fee, note)) return false;
    this.s[key] = this.now().getTime() + PASS_MS;
    try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return true;
  }
  // Pay through wallet.spend; true when in (paid now, earlier today, or free).
  enter(store, wallet, note) {
    const fee = this.feeFor(store);
    if (!fee) return true;
    if (!wallet.spend(fee, note)) return false;
    this.s[store.workshop] = today(this.now());
    try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return true;
  }
}
