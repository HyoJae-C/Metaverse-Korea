// Part-time jobs (알바): some shops hire. A store opts in with "job" in its
// stores.json entry:
//   "job": "delivery"  ride orders to nearby shops (core/delivery.js)
//   "job": "mart"      work the convenience store counter
//   "job": "serving"   carry dishes and requests to the right table
// Shifts are limited per day (all jobs together) so coins don't pile up too
// fast. Empty billboards advertise the jobs ("알바급구!", core/hiring-ads.js).
// No DOM here, so it can be unit-tested.

export const JOB_KINDS = ['delivery', 'mart', 'serving'];
export const SHIFTS_PER_DAY = 5;
export const MAX_PAY = 30000; // coins for a perfect shift (a delivery pays 4–8 too)
const SHIFT_KEY = 'mk.jobShifts';

// Shifts today: { day: 'YYYY-MM-DD', n }.
export function shiftsLeft(saved, day) {
  return saved?.day === day ? Math.max(0, SHIFTS_PER_DAY - (saved.n || 0)) : SHIFTS_PER_DAY;
}
export function takeShift(saved, day) {
  const n = saved?.day === day ? (saved.n || 0) : 0;
  return n >= SHIFTS_PER_DAY ? null : { day, n: n + 1 };
}
export function readShifts() { try { return JSON.parse(localStorage.getItem(SHIFT_KEY) || 'null'); } catch { return null; } }
export function writeShifts(v) { try { localStorage.setItem(SHIFT_KEY, JSON.stringify(v)); } catch { /* storage blocked */ } }

export const jobOf = (store) => (JOB_KINDS.includes(store?.job) ? store.job : null);

// ── Text ────────────────────────────────────────────────────────────────
// Short lines for posters in every UI language; game text in en/ko/ja/zh
// (others fall back to English, as in the other minigames).
export const JOB_TEXT = {
  flavor: '알바급구!',
  help: { en: 'HELP WANTED', ko: '알바 구해요', ja: 'アルバイト急募', zh: '急招兼职', es: 'SE BUSCA PERSONAL', id: 'DICARI PEKERJA', vi: 'CẦN TUYỂN GẤP', hi: 'तुरंत भर्ती', ar: 'مطلوب موظفون' },
  role: {
    delivery: { en: 'Delivery rider', ko: '배달 라이더', ja: '配達ライダー', zh: '外卖骑手', es: 'Repartidor/a', id: 'Kurir antar', vi: 'Shipper giao hàng', hi: 'डिलीवरी राइडर', ar: 'عامل توصيل' },
    mart: { en: 'Convenience store clerk', ko: '편의점 계산대', ja: 'コンビニのレジ', zh: '便利店收银员', es: 'Cajero/a de tienda 24 h', id: 'Kasir minimarket', vi: 'Thu ngân cửa hàng tiện lợi', hi: 'कन्वीनियंस स्टोर कैशियर', ar: 'كاشير متجر صغير' },
    serving: { en: 'Server (hall staff)', ko: '홀 서빙', ja: 'ホールスタッフ', zh: '餐厅服务员', es: 'Camarero/a', id: 'Pelayan restoran', vi: 'Phục vụ bàn', hi: 'वेटर', ar: 'نادل' },
  },
  pay: { en: 'Pay: up to 🪙 {n} a shift', ko: '시급: 한 번에 최대 🪙 {n}', ja: '給料：1回最大 🪙 {n}', zh: '报酬：每班最多 🪙 {n}', es: 'Paga: hasta 🪙 {n} por turno', id: 'Upah: maks 🪙 {n} per sif', vi: 'Lương: tối đa 🪙 {n} mỗi ca', hi: 'वेतन: हर शिफ़्ट 🪙 {n} तक', ar: 'الأجر: حتى 🪙 {n} للوردية' },
  away: { en: '{m} m from here', ko: '여기서 {m}m', ja: 'ここから{m}m', zh: '距此{m}米', es: 'a {m} m de aquí', id: '{m} m dari sini', vi: 'cách đây {m} m', hi: 'यहाँ से {m} मी', ar: 'على بعد {m} م' },
  walkIn: { en: 'Walk in and talk to the staff!', ko: '가게에 들어와서 직원에게 말 걸어 주세요!', ja: 'お店に入ってスタッフに声をかけてね！', zh: '进店和店员说一声吧！', es: '¡Entra y habla con el personal!', id: 'Masuk dan sapa stafnya!', vi: 'Vào quán và nói chuyện với nhân viên nhé!', hi: 'अंदर आइए और स्टाफ़ से बात कीजिए!', ar: 'ادخل وتحدّث إلى الموظفين!' },
  sticker: { en: 'Part-timer wanted', ko: '아르바이트 구함', ja: 'アルバイト募集', zh: '招兼职', es: 'Se busca', id: 'Lowongan', vi: 'Tuyển nhân viên', hi: 'भर्ती', ar: 'مطلوب' },
  // Game text.
  work: { en: 'Part-time job: {role}', ko: '알바하기: {role}', ja: 'アルバイト：{role}', zh: '打工：{role}' },
  shiftsLeft: { en: 'Shifts left today: {n}/{all}', ko: '오늘 남은 알바: {n}/{all}', ja: '今日の残りシフト：{n}/{all}', zh: '今天剩余班次：{n}/{all}' },
  noShifts: { en: "You've worked {all} shifts today. Rest up and come back tomorrow!", ko: '오늘은 알바를 {all}번 다 했어요. 푹 쉬고 내일 또 와요!', ja: '今日はもう{all}回働きました。ゆっくり休んで、また明日！', zh: '今天已经打了{all}次工，好好休息，明天再来！' },
  ledger: { en: 'Part-time pay', ko: '알바비', ja: 'バイト代', zh: '打工工资' },
  paid: { en: 'Shift done! Pay 🪙 +{n}', ko: '알바 끝! 알바비 🪙 +{n}', ja: 'シフト終了！バイト代 🪙 +{n}', zh: '下班啦！工资 🪙 +{n}' },
  start: { en: 'Start the shift', ko: '알바 시작', ja: 'シフト開始', zh: '开始上班' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  meaning: { en: 'Meaning', ko: '뜻', ja: '意味', zh: '意思' },
  again: { en: 'One more shift', ko: '한 번 더 하기', ja: 'もう一回働く', zh: '再上一班' },
  right: { en: 'Right!', ko: '맞아요!', ja: '正解！', zh: '对了！' },
  wrongWas: { en: 'Not quite. It was: {a}', ko: '아쉬워요. 정답: {a}', ja: '惜しい！正解：{a}', zh: '差一点，正确答案：{a}' },
  timeUp: { en: 'Too slow… the customer left.', ko: '너무 늦었어요… 손님이 가 버렸어요.', ja: '遅すぎて…お客さんが帰りました。', zh: '太慢了……客人走了。' },
  result: { en: '{ok} of {all} right', ko: '{all}개 중 {ok}개 정답', ja: '{all}問中{ok}問正解', zh: '{all}题中答对{ok}题' },
  // Convenience store.
  martTitle: { en: 'Convenience store shift', ko: '편의점 알바', ja: 'コンビニのバイト', zh: '便利店打工' },
  martHow: {
    en: 'Customers bring things to the counter. Tap each item to scan it, do what they ask in Korean (bag, heat it up, receipt…), then give the right change.',
    ko: '손님이 계산대에 물건을 올려요. 물건을 하나씩 눌러 바코드를 찍고, 손님의 한국어 요청(봉투, 데우기, 영수증…)을 들어준 뒤 거스름돈을 맞게 주세요.',
    ja: 'お客さんがレジに商品を置きます。商品をタップしてスキャンし、韓国語のお願い（袋、温め、レシート…）に応えて、おつりを正しく渡そう。',
    zh: '顾客把商品放到收银台。逐个点击商品扫码，按顾客的韩语要求（袋子、加热、小票……）处理，再找对零钱。',
  },
  customer: { en: 'Customer {n}/{all}', ko: '손님 {n}/{all}', ja: 'お客さん {n}/{all}', zh: '顾客 {n}/{all}' },
  scan: { en: 'Tap each item to scan it', ko: '물건을 눌러서 찍어요', ja: '商品をタップしてスキャン', zh: '点击商品扫码' },
  total: { en: 'Total', ko: '합계', ja: '合計', zh: '合计' },
  whatAsk: { en: 'What does the customer want?', ko: '손님이 뭐라고 했나요?', ja: 'お客さんは何と言った？', zh: '顾客想要什么？' },
  paysWith: { en: 'The customer pays {paid}. Change?', ko: '손님이 {paid}을 냈어요. 거스름돈은?', ja: 'お客さんが{paid}出しました。おつりは？', zh: '顾客付了{paid}，找零多少？' },
  // Serving.
  serveTitle: { en: 'Serving shift', ko: '서빙 알바', ja: 'ホールのバイト', zh: '服务员打工' },
  serveHow: {
    en: 'The kitchen calls out dishes in Korean with a table number, and guests ask for things in Korean. Listen, then take the right thing to the right table.',
    ko: '주방에서 테이블 번호와 요리를 한국어로 불러요. 손님도 한국어로 부탁해요. 잘 듣고 맞는 것을 맞는 테이블로 가져다주세요.',
    ja: '厨房が韓国語でテーブル番号と料理を呼び、お客さんも韓国語でお願いします。よく聞いて、正しい物を正しいテーブルへ運ぼう。',
    zh: '厨房用韩语喊出桌号和菜名，客人也用韩语提要求。仔细听，把对的东西送到对的桌子。',
  },
  turn: { en: 'Order {n}/{all}', ko: '주문 {n}/{all}', ja: '注文 {n}/{all}', zh: '订单 {n}/{all}' },
  whichTable: { en: 'Which table?', ko: '몇 번 테이블일까요?', ja: '何番テーブル？', zh: '几号桌？' },
  whichItem: { en: 'What does table {n} want?', ko: '{n}번 테이블은 뭘 원하나요?', ja: '{n}番テーブルは何が欲しい？', zh: '{n}号桌想要什么？' },
  table: { en: 'Table {n}', ko: '{n}번 테이블', ja: '{n}番テーブル', zh: '{n}号桌' },
};

export const DISTRICT_NAMES = {
  seongsu: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', vi: 'Seongsu', hi: 'सोंगसू', ar: 'سونغسو' },
  hongdae: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', vi: 'Hongdae', hi: 'होंगदे', ar: 'هونغدي' },
  itaewon: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', vi: 'Itaewon', hi: 'इटेवॉन', ar: 'إيتايوون' },
};

const pickL = (o, lang) => (o ? o[lang] || o.en : '');
const fill = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

// What a hiring poster says, in `lang` (signs show English until the
// player turns on sign translation). shopNames: the shop's { en, ko, … }
// names; meters: distance from the poster (left out when far).
export function hiringLines(job, lang, { shopNames, district, meters } = {}) {
  const where = [pickL(DISTRICT_NAMES[district], lang), meters != null && meters < 1000 ? fill(pickL(JOB_TEXT.away, lang), { m: Math.round(meters / 10) * 10 }) : ''].filter(Boolean).join(' · ');
  return {
    flavor: JOB_TEXT.flavor,
    head: pickL(JOB_TEXT.help, lang),
    shop: shopNames ? shopNames[lang] || shopNames.en || shopNames.ko : '',
    role: pickL(JOB_TEXT.role[job], lang),
    where: where ? '📍 ' + where : '',
    pay: fill(pickL(JOB_TEXT.pay, lang), { n: MAX_PAY }),
    cta: pickL(JOB_TEXT.walkIn, lang),
  };
}

// Pay for a counter or serving shift: 2 for showing up, the rest by answers.
export const MIN_PAY = 10000; // won for showing up
export const shiftPay = (ok, all) => (all ? MIN_PAY + Math.round(((MAX_PAY - MIN_PAY) * Math.max(0, Math.min(ok, all))) / all / 1000) * 1000 : 0);

// ── Convenience store counter ───────────────────────────────────────────
export const MART_CUSTOMERS = 4;
export const MART_PATIENCE = 30; // seconds per customer
export const MART_ITEMS = [
  { id: 'samgak', emoji: '🍙', ko: '삼각김밥', price: 1300, warm: true, name: { en: 'Rice ball', ja: 'おにぎり', zh: '三角饭团' } },
  { id: 'dosirak', emoji: '🍱', ko: '도시락', price: 4500, warm: true, name: { en: 'Lunch box', ja: 'お弁当', zh: '便当' } },
  { id: 'cupramen', emoji: '🍜', ko: '컵라면', price: 1500, name: { en: 'Cup ramen', ja: 'カップ麺', zh: '杯面' } },
  { id: 'bananamilk', emoji: '🥛', ko: '바나나우유', price: 1700, name: { en: 'Banana milk', ja: 'バナナ牛乳', zh: '香蕉牛奶' } },
  { id: 'snack', emoji: '🍪', ko: '과자', price: 2000, name: { en: 'Snack', ja: 'お菓子', zh: '零食' } },
  { id: 'icecream', emoji: '🍦', ko: '아이스크림', price: 1200, name: { en: 'Ice cream', ja: 'アイス', zh: '冰淇淋' } },
  { id: 'water', emoji: '💧', ko: '생수', price: 900, name: { en: 'Bottled water', ja: '水', zh: '矿泉水' } },
  { id: 'umbrella', emoji: '☂️', ko: '우산', price: 5000, name: { en: 'Umbrella', ja: '傘', zh: '雨伞' } },
];
// What customers ask for, and the button that does it.
export const MART_ASKS = [
  { id: 'bag', emoji: '🛍️', ko: '봉투 주세요.', rom: 'bongtu juseyo.', btn: '봉투', short: { en: 'bag', ja: '袋', zh: '袋子' }, name: { en: 'A bag, please.', ja: '袋をください。', zh: '请给我袋子。' } },
  { id: 'warm', emoji: '🔥', ko: '데워 주세요.', rom: 'dewo juseyo.', btn: '데우기', short: { en: 'heat up', ja: '温め', zh: '加热' }, name: { en: 'Heat it up, please.', ja: '温めてください。', zh: '请帮我加热。' } },
  { id: 'receipt', emoji: '🧾', ko: '영수증 주세요.', rom: 'yeongsujeung juseyo.', btn: '영수증', short: { en: 'receipt', ja: 'レシート', zh: '小票' }, name: { en: 'A receipt, please.', ja: 'レシートをください。', zh: '请给我小票。' } },
  { id: 'none', emoji: '👍', ko: '그냥 주세요.', rom: 'geunyang juseyo.', btn: '그대로', short: { en: 'as is', ja: 'そのまま', zh: '不用' }, name: { en: "It's fine as it is.", ja: 'そのままでいいです。', zh: '直接给我就行。' } },
];
export const MART_LINES = {
  hello: ['어서 오세요!', 'eoseo oseyo!', { en: 'Welcome!', ja: 'いらっしゃいませ！', zh: '欢迎光临！' }],
  thanks: ['감사합니다. 안녕히 가세요!', 'gamsahamnida. annyeonghi gaseyo!', { en: 'Thank you. Goodbye!', ja: 'ありがとうございました！', zh: '谢谢，慢走！' }],
};
const NOTES = [1000, 5000, 10000, 50000];
export const won = (n) => '₩' + n.toLocaleString('en-US');

// One customer: 1–3 items, one request ("warm" only with something to heat
// up), the note they pay with, and three change options (one right).
export function makeMartCustomer(rand = Math.random) {
  const n = 1 + Math.floor(rand() * 3);
  const pool = MART_ITEMS.slice();
  const items = [];
  for (let i = 0; i < n; i++) items.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  const asks = MART_ASKS.filter((a) => a.id !== 'warm' || items.some((it) => it.warm));
  const ask = asks[Math.floor(rand() * asks.length)].id;
  const total = items.reduce((s, it) => s + it.price, 0);
  const notes = NOTES.filter((v) => v > total);
  // Usually the next note up; sometimes a bigger one, for harder change.
  const paid = notes[Math.min(notes.length - 1, rand() < 0.7 ? 0 : 1)];
  const change = paid - total;
  const wrong = new Set();
  for (const d of [1000, -1000, 500, -500, 100, -100, 200]) {
    const v = change + d;
    if (v > 0 && v !== change) wrong.add(v);
  }
  const ws = [...wrong];
  const options = [change];
  while (options.length < 3 && ws.length) options.push(ws.splice(Math.floor(rand() * ws.length), 1)[0]);
  options.sort((a, b) => a - b);
  return { items, ask, total, paid, change, options };
}

// ── Serving ─────────────────────────────────────────────────────────────
export const SERVE_TURNS = 6;
export const SERVE_PATIENCE = 14; // seconds per turn
export const TABLES = [1, 2, 3, 4];
// Sino-Korean numbers for table numbers (일번, 이번, …).
export const TABLE_KO = { 1: ['일', 'il'], 2: ['이', 'i'], 3: ['삼', 'sam'], 4: ['사', 'sa'] };
export const SERVE_DISHES = [
  { id: 'pizza', emoji: '🍕', ko: '피자', rom: 'pija', name: { en: 'pizza', ja: 'ピザ', zh: '披萨' } },
  { id: 'pasta', emoji: '🍝', ko: '파스타', rom: 'paseuta', name: { en: 'pasta', ja: 'パスタ', zh: '意面' } },
  { id: 'salad', emoji: '🥗', ko: '샐러드', rom: 'saelleodeu', name: { en: 'salad', ja: 'サラダ', zh: '沙拉' } },
  { id: 'tiramisu', emoji: '🍰', ko: '티라미수', rom: 'tiramisu', name: { en: 'tiramisu', ja: 'ティラミス', zh: '提拉米苏' } },
];
export const SERVE_ASKS = [
  { id: 'water', emoji: '💧', ko: '물 좀 주세요.', rom: 'mul jom juseyo.', btn: '물', short: { en: 'water', ja: '水', zh: '水' }, name: { en: 'Some water, please.', ja: 'お水をください。', zh: '请给我水。' } },
  { id: 'fork', emoji: '🍴', ko: '포크 하나 더 주세요.', rom: 'pokeu hana deo juseyo.', btn: '포크', short: { en: 'fork', ja: 'フォーク', zh: '叉子' }, name: { en: 'One more fork, please.', ja: 'フォークをもう一本ください。', zh: '请再给我一把叉子。' } },
  { id: 'napkin', emoji: '🧻', ko: '휴지 좀 주세요.', rom: 'hyuji jom juseyo.', btn: '휴지', short: { en: 'napkins', ja: 'ティッシュ', zh: '纸巾' }, name: { en: 'Some napkins, please.', ja: 'ティッシュをください。', zh: '请给我纸巾。' } },
  { id: 'bill', emoji: '🧾', ko: '계산서 주세요.', rom: 'gyesanseo juseyo.', btn: '계산서', short: { en: 'bill', ja: '会計', zh: '账单' }, name: { en: 'The bill, please.', ja: 'お会計をお願いします。', zh: '请给我账单。' } },
];

// A turn is either a dish from the kitchen (find the table by its Korean
// number) or a guest's request (find the thing they asked for).
// Returns { kind: 'dish'|'ask', table, item, ko, rom, mean: { en, ja, zh } }.
export function makeServeTurn(rand = Math.random) {
  const table = TABLES[Math.floor(rand() * TABLES.length)];
  const [nk, nr] = TABLE_KO[table];
  if (rand() < 0.5) {
    const d = SERVE_DISHES[Math.floor(rand() * SERVE_DISHES.length)];
    return {
      kind: 'dish', table, item: d.id,
      ko: `${nk}번 테이블, ${d.ko} 나왔어요!`, rom: `${nr}-beon teibeul, ${d.rom} nawasseoyo!`,
      mean: { en: `Table ${table}, the ${d.name.en} is ready!`, ja: `${table}番テーブル、${d.name.ja}できました！`, zh: `${table}号桌，${d.name.zh}好了！` },
    };
  }
  const a = SERVE_ASKS[Math.floor(rand() * SERVE_ASKS.length)];
  return { kind: 'ask', table, item: a.id, ko: a.ko, rom: a.rom, mean: a.name };
}
export const serveRight = (turn, pick) => pick.table === turn.table && pick.item === turn.item;
