// Day passes: places you pay once to get in, then come and go all day, like
// a real jjimjilbang or public pool in Seoul. Paid at the door (main.js
// enterStore); saved on this device by local day.

// won, by the store's workshop
export const DAY_PASS = { sauna: 12000, pool: 5000 };

export const DAY_PASS_TEXT = {
  sauna: { en: 'Jjimjilbang day pass', ko: '찜질방 1일 이용권', ja: 'チムジルバン1日券', zh: '汗蒸房一日券', es: 'Pase de un día al jjimjilbang', id: 'Tiket harian jjimjilbang', vi: 'Vé ngày jjimjilbang', hi: 'जिमजिलबांग डे पास', fr: 'Pass journée jjimjilbang', th: 'บัตรรายวันจิมจิลบัง', ar: 'تذكرة يوم للجيمجيلبانغ' },
  pool: { en: 'Pool day pass', ko: '수영장 1일 이용권', ja: 'プール1日券', zh: '游泳池一日券', es: 'Pase de un día a la piscina', id: 'Tiket harian kolam renang', vi: 'Vé ngày hồ bơi', hi: 'पूल डे पास', fr: 'Pass journée piscine', th: 'บัตรรายวันสระว่ายน้ำ', ar: 'تذكرة يوم للمسبح' },
  rides: { en: 'Ride-all day pass', ko: '자유이용권', ja: 'フリーパス', zh: '畅玩一日券', es: 'Pase de un día para todas las atracciones', id: 'Tiket terusan harian', vi: 'Vé chơi cả ngày', hi: 'सभी राइड्स का डे पास', fr: 'Pass journée toutes attractions', th: 'บัตรเล่นทุกเครื่องเล่นทั้งวัน', ar: 'تذكرة يوم لكل الألعاب' },
  ridesHeld: { en: '{name}: ride everything all day today ✓', ko: '{name}: 오늘 하루 모든 놀이기구 무제한 ✓', ja: '{name}：今日は全アトラクション乗り放題 ✓', zh: '{name}：今天所有设施随便玩 ✓', es: '{name}: todas las atracciones, todo el día ✓', id: '{name}: naik semua wahana sepuasnya hari ini ✓', vi: '{name}: chơi mọi trò cả ngày hôm nay ✓', hi: '{name}: आज पूरे दिन सभी राइड्स ✓', fr: '{name} : toutes les attractions toute la journée ✓', th: '{name}: เล่นได้ทุกเครื่องทั้งวันนี้ ✓', ar: '{name}: كل الألعاب طوال اليوم ✓' },
  ridesPaid: { en: '🎫 {name}: 🪙 {n}. Every ride in the park, as often as you like, all day today (the roller coaster and bumper cars too).', ko: '🎫 {name}: 🪙 {n}. 오늘 하루 공원 안 모든 놀이기구를 마음껏 탈 수 있어요 (롤러코스터, 범퍼카 포함).', ja: '🎫 {name}：🪙 {n}。今日は一日、園内の全アトラクションに何度でも乗れます（ジェットコースター・バンパーカーも）。', zh: '🎫 {name}：🪙 {n}。今天园内所有设施随便玩（含过山车和碰碰车）。', es: '🎫 {name}: 🪙 {n}. Todas las atracciones del parque, las veces que quieras, todo el día (montaña rusa y autos de choque incluidos).', id: '🎫 {name}: 🪙 {n}. Semua wahana di taman, sepuasnya, seharian ini (roller coaster dan bom-bom car juga).', vi: '🎫 {name}: 🪙 {n}. Chơi mọi trò trong công viên bao nhiêu lần tùy thích cả ngày hôm nay (cả tàu lượn và xe điện đụng).', hi: '🎫 {name}: 🪙 {n}। आज पूरे दिन पार्क की हर राइड जितनी बार चाहें (रोलर कोस्टर और बंपर कार भी)।', fr: '🎫 {name} : 🪙 {n}. Toutes les attractions du parc, autant de fois que tu veux, toute la journée (montagnes russes et autos tamponneuses comprises).', th: '🎫 {name}: 🪙 {n} เล่นได้ทุกเครื่องในสวนสนุกกี่รอบก็ได้ทั้งวันนี้ (รวมรถไฟเหาะและรถบั๊มพ์)', ar: '🎫 {name}: 🪙 {n}. كل ألعاب الحديقة بقدر ما تريد طوال اليوم (بما فيها الأفعوانية وسيارات التصادم).' },
  paid: { en: '🎫 {name}: 🪙 {n}. Come and go all day today.', ko: '🎫 {name}: 🪙 {n}. 오늘 하루 자유롭게 드나들 수 있어요.', ja: '🎫 {name}：🪙 {n}。今日は一日出入り自由です。', zh: '🎫 {name}：🪙 {n}。今天可以随意进出。', es: '🎫 {name}: 🪙 {n}. Entra y sal todo el día.', id: '🎫 {name}: 🪙 {n}. Bebas keluar masuk hari ini.', vi: '🎫 {name}: 🪙 {n}. Ra vào tự do cả ngày hôm nay.', hi: '🎫 {name}: 🪙 {n}। आज पूरे दिन आ-जा सकते हैं।', fr: '🎫 {name} : 🪙 {n}. Entre et sors librement toute la journée.', th: '🎫 {name}: 🪙 {n} เข้าออกได้ตลอดทั้งวันนี้', ar: '🎫 {name}: 🪙 {n}. ادخل واخرج طوال اليوم.' },
  short: { en: '{name} costs 🪙 {n}. Not enough money.', ko: '{name}은 🪙 {n}이에요. 돈이 모자라요.', ja: '{name}は 🪙 {n} です。お金が足りません。', zh: '{name}需要 🪙 {n}。钱不够。', es: '{name} cuesta 🪙 {n}. No te alcanza.', id: '{name} seharga 🪙 {n}. Uangmu kurang.', vi: '{name} giá 🪙 {n}. Không đủ tiền.', hi: '{name} 🪙 {n} का है। पैसे कम हैं।', fr: '{name} coûte 🪙 {n}. Pas assez d\'argent.', th: '{name} ราคา 🪙 {n} เงินไม่พอ', ar: '{name} بسعر 🪙 {n}. المال لا يكفي.' },
};

const KEY = 'mk.daypass';
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
  // 'rides'): held today?
  has(key) { return this.s[key] === today(this.now()); }
  // Buy it for today through wallet.spend; true when held (now or already).
  buy(key, fee, wallet, note) {
    if (this.has(key)) return true;
    if (!wallet.spend(fee, note)) return false;
    this.s[key] = today(this.now());
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
