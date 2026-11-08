// Day passes: places you pay once to get in, then come and go all day, like
// a real jjimjilbang or public pool in Seoul. Paid at the door (main.js
// enterStore); saved on this device by local day.

// won, by the store's workshop
export const DAY_PASS = { sauna: 12000, pool: 5000 };

export const DAY_PASS_TEXT = {
  sauna: { en: 'Jjimjilbang day pass', ko: '찜질방 1일 이용권', ja: 'チムジルバン1日券', zh: '汗蒸房一日券', es: 'Pase de un día al jjimjilbang', id: 'Tiket harian jjimjilbang', vi: 'Vé ngày jjimjilbang', hi: 'जिमजिलबांग डे पास', fr: 'Pass journée jjimjilbang', th: 'บัตรรายวันจิมจิลบัง', ar: 'تذكرة يوم للجيمجيلبانغ' },
  pool: { en: 'Pool day pass', ko: '수영장 1일 이용권', ja: 'プール1日券', zh: '游泳池一日券', es: 'Pase de un día a la piscina', id: 'Tiket harian kolam renang', vi: 'Vé ngày hồ bơi', hi: 'पूल डे पास', fr: 'Pass journée piscine', th: 'บัตรรายวันสระว่ายน้ำ', ar: 'تذكرة يوم للمسبح' },
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
