// Items the player owns (saved on this device for now, like the wallet).
// Later items will come from the shop or an account service; for testing,
// the developer master code (typed in chat) adds every item.

import { WEARABLES } from '../data/wearables.js';
import { LAMP_IDS } from './furniture.js';

const PET_DESC = {
  en: 'Tap Walk to take your pet along. Pets sometimes poop: clean it up quickly or you get a fine.',
  ko: '"산책"을 누르면 함께 다녀요. 가끔 똥을 싸니 바로 치워 주세요. 안 치우면 과태료가 나와요.',
  ja: '「散歩」で一緒にお出かけ。たまにフンをするので、すぐ片付けないと罰金です。',
  zh: '点“散步”带宠物一起走。宠物偶尔会便便，要马上清理，否则会被罚款。',
};
function pets(defs) {
  const out = {};
  for (const [id, [price, emoji, pet, name]] of Object.entries(defs)) out[id] = { emoji, name, desc: PET_DESC, pet, price: price ? price * 1000 : null }; // listed in ₩1,000s
  return out;
}
export const isPet = (id) => !!ITEMS[id]?.pet;
const OUTFIT_DESC = {
  en: 'Clothes from the Daily Closet. Tap Wear to put them on, Take off to go back to your T-shirt.',
  ko: '데일리 클로젯에서 산 옷이에요. "입기"로 입고, "벗기"로 티셔츠로 돌아가요.',
  ja: 'デイリークローゼットの服。「着る」で着替え、「脱ぐ」でTシャツに戻ります。',
  zh: '日常衣橱买的衣服。点“穿上”换上，点“脱下”换回T恤。',
  es: 'Ropa de Armario Diario. Toca Poner para vestirla y Quitar para volver a tu camiseta.', ar: 'ملابس من خزانة يومية. اضغط ارتدِ لتلبسها، واخلع لتعود إلى قميصك.', vi: 'Quần áo từ Daily Closet. Chạm Mặc để mặc vào, Cởi ra để trở lại áo phông.', hi: 'डेली क्लोज़ेट के कपड़े। पहनने के लिए पहनें टैप करें, टी-शर्ट पर लौटने के लिए उतारें।', fr: 'Vêtements du Daily Closet. Touche Porter pour les mettre, Enlever pour revenir à ton t-shirt.', th: 'เสื้อผ้าจาก Daily Closet แตะ สวมใส่ เพื่อใส่ หรือ ถอด เพื่อกลับไปใส่เสื้อยืด', id: 'Baju dari Daily Closet. Ketuk Pakai untuk memakainya, Lepas untuk kembali ke kaosmu.',
};
// outfit: the character model it puts on; price: won at the clothes shop (listed in ₩1,000s).
// wear / off: the look it puts on and what taking it off changes back.
function outfits(defs) {
  const out = {};
  for (const [id, [price, emoji, name]] of Object.entries(defs)) out[id] = { emoji, name, desc: OUTFIT_DESC, outfit: id.slice(7), price: price * 1000, wear: { model: id.slice(7) }, off: { model: 'basic' } };
  return out;
}
// Is this item on (every part of its wear matches the look)? A null part
// doesn't count, except a skirt: trousers are only on when no skirt is.
export const isWorn = (it, look) => !!it?.wear && Object.entries(it.wear).every(([k, v]) => (v == null ? k !== 'skirt' || !look?.skirt : look?.[k] === v));
const PLUSH_DESC = {
  en: 'A prize from the claw machine. Put it in your home: Decorate at home, then pick it.',
  ko: '인형뽑기 경품이에요. 내 집에서 "꾸미기"를 누르고 골라서 놓을 수 있어요.',
  ja: 'クレーンゲームの景品。家の「模様替え」で置けます。',
  zh: '抓娃娃机的奖品。在家里点“装饰”就能摆放。',
};
const LAMP_DESC = {
  en: 'A lamp from the lighting shops on Cheonggyecheon-ro. Put it in your home: Decorate at home, then pick it.',
  ko: '청계천로 조명 가게에서 산 조명이에요. 내 집에서 "꾸미기"를 누르고 골라서 놓을 수 있어요.',
  ja: '清渓川路の照明店で買ったランプ。家の「模様替え」で置けます。',
  zh: '在清溪川路灯具店买的灯。在家里点“装饰”就能摆放。',
};
const lamps = () => Object.fromEntries(LAMP_IDS.map(([id, emoji, name]) => [id, { emoji, name, desc: LAMP_DESC, lamp: true }]));
function plushies(defs) {
  const out = {};
  for (const [id, [emoji, name]] of Object.entries(defs)) out[id] = { emoji, name, desc: PLUSH_DESC, plush: true };
  return out;
}

export const ITEMS = {
  tandem: {
    emoji: '🚲',
    name: { en: 'Tandem bike', ko: '2인 자전거', ja: '2人乗り自転車', zh: '双人自行车' },
    desc: {
      en: 'Two seats: you steer, a friend rides on the back. Ride it, walk up to someone and invite them.',
      ko: '두 명이 타는 자전거예요. 내가 운전하고 친구는 뒤에 타요. 타고 가서 옆 사람을 초대하세요.',
      ja: '2人乗り。あなたが運転して、友だちは後ろに乗ります。乗って近くの人を招待しましょう。',
      zh: '两个座位：你来骑，朋友坐后面。骑上车，走到别人旁边邀请他们。',
    },
  },
  car: {
    emoji: '🏎️',
    name: { en: 'Red open sports car', ko: '빨간 오픈 스포츠카', ja: '赤いオープンスポーツカー', zh: '红色敞篷跑车', es: 'Deportivo descapotable rojo', ar: 'سيارة رياضية حمراء مكشوفة', vi: 'Xe thể thao mui trần màu đỏ', hi: 'लाल खुली स्पोर्ट्स कार', fr: 'Voiture de sport rouge décapotable', th: 'รถสปอร์ตเปิดประทุนสีแดง', id: 'Mobil sport merah atap terbuka' },
    desc: {
      en: 'A low two-seater with the top down. Drive anywhere, alleys too, and invite one friend to the passenger seat.',
      ko: '지붕이 열린 낮은 2인승 스포츠카예요. 골목까지 어디든 달릴 수 있고, 옆자리에 친구 한 명을 태울 수 있어요.',
      ja: '屋根の開いた低い2人乗りスポーツカー。路地までどこでも走れて、助手席に友だちを1人乗せられます。',
      zh: '敞篷低趴双座跑车。哪里都能开，小巷也行，副驾驶可以邀请一位朋友。',
      es: 'Un biplaza bajo y descapotable. Conduce por todas partes, callejones incluidos, e invita a un amigo al asiento del copiloto.', ar: 'سيارة منخفضة بمقعدين وسقف مفتوح. قُدها إلى أي مكان، حتى الأزقة، وادعُ صديقًا إلى مقعد الراكب.', vi: 'Xe thể thao hai chỗ gầm thấp, mui trần. Lái đi đâu cũng được, kể cả hẻm, và mời một người bạn ngồi ghế phụ.', hi: 'खुली छत वाली नीची दो-सीटर। गलियों समेत कहीं भी चलाएँ, और एक दोस्त को बगल की सीट पर बुलाएँ।', fr: 'Une biplace basse, capote baissée. Roule partout, ruelles comprises, et invite un ami sur le siège passager.', th: 'รถสองที่นั่งเตี้ยๆ เปิดประทุน ขับได้ทุกที่รวมถึงในซอย และชวนเพื่อนหนึ่งคนนั่งข้างคนขับได้', id: 'Mobil dua kursi yang rendah dengan atap terbuka. Bisa ke mana saja, gang juga, dan ajak satu teman di kursi penumpang.',
    },
  },
  limo: {
    emoji: '🚘',
    name: { en: 'Grand limousine', ko: '럭셔리 리무진', ja: '高級リムジン', zh: '豪华轿车', es: 'Limusina de lujo', ar: 'ليموزين فاخرة', vi: 'Limousine sang trọng', hi: 'शानदार लिमोज़ीन', fr: 'Grande limousine', th: 'ลีมูซีนหรู', id: 'Limusin mewah' },
    desc: {
      en: 'A pearl-white four-seater with a tall chrome grille and a silver winged crest. Drive anywhere and invite three friends.',
      ko: '높은 크롬 그릴과 은색 날개 엠블럼의 진주색 4인승 리무진이에요. 어디든 달릴 수 있고 친구 세 명을 태울 수 있어요.',
      ja: '背の高いクロームグリルと銀の翼のエンブレムのパールホワイト4人乗り。どこでも走れて、友だち3人を乗せられます。',
      zh: '珍珠白四座豪华轿车，高耸的镀铬格栅和银色飞翼徽标。哪里都能开，可以载三位朋友。',
      es: 'Una limusina blanco perla de cuatro plazas con parrilla cromada y emblema alado plateado. Conduce por todas partes e invita a tres amigos.', ar: 'ليموزين بأربعة مقاعد بلون اللؤلؤ مع شبكة كروم عالية وشعار مجنّح فضي. قُدها إلى أي مكان وادعُ ثلاثة أصدقاء.', vi: 'Limousine bốn chỗ màu trắng ngọc trai với lưới tản nhiệt mạ crôm cao và biểu tượng đôi cánh bạc. Lái đi đâu cũng được và mời ba người bạn.', hi: 'मोती-सफ़ेद चार-सीटर, ऊँची क्रोम ग्रिल और चाँदी के पंखों वाले प्रतीक के साथ। कहीं भी चलाएँ और तीन दोस्तों को बुलाएँ।', fr: 'Une quatre places blanc nacré avec une haute calandre chromée et un emblème ailé argenté. Roule partout et invite trois amis.', th: 'รถสี่ที่นั่งสีขาวมุก กระจังหน้าโครเมียมสูงและตราปีกสีเงิน ขับได้ทุกที่และชวนเพื่อนได้สามคน', id: 'Limusin empat kursi putih mutiara dengan gril krom tinggi dan lambang sayap perak. Bisa ke mana saja dan ajak tiga teman.',
    },
  },
  moto: {
    emoji: '🏍️',
    name: { en: 'Red sports motorbike + helmet', ko: '빨간 스포츠 오토바이 + 헬멧', ja: '赤いスポーツバイク＋ヘルメット', zh: '红色运动摩托车＋头盔' },
    desc: {
      en: 'Fast and loud red. Ride it from the Vehicle button; the matching helmet goes on automatically.',
      ko: '빠르고 멋진 빨간 오토바이예요. "탈것" 버튼에서 타면 같은 색 헬멧을 자동으로 써요.',
      ja: '速くてかっこいい赤いバイク。「乗り物」ボタンから乗るとおそろいのヘルメットを自動でかぶります。',
      zh: '又快又酷的红色摩托车。点“交通工具”骑上，会自动戴上同色头盔。',
    },
  },
  // Printed T-shirts: worn from the bag (prints in core/tee-prints.js).
  'tee-simurugi': {
    emoji: '👕',
    tee: 'simurugi',
    name: { en: 'Simurugi tee', ko: '시무룩이 티셔츠', ja: 'シムルギTシャツ', zh: '闷闷鬼T恤' },
    desc: {
      en: 'A fluffy critter with a very sulky face. Tap Wear to put it on.',
      ko: '잔뜩 시무룩한 얼굴의 복슬복슬한 친구예요. "입기"를 누르면 입어요.',
      ja: 'すごくふてくされた顔のふわふわの子。「着る」で着られます。',
      zh: '一只一脸闷闷不乐的毛茸茸小家伙。点“穿上”即可穿上。',
    },
  },
  // Everyday clothes from the clothes shop (Daily Closet): wear them instead
  // of your T-shirt. The ids are the old costume ids, so bought items carry over.
  ...outfits({
    'outfit-rogue': [60, '🧥', { en: 'Denim jacket', ko: '청재킷', ja: 'デニムジャケット', zh: '牛仔夹克', es: 'Chaqueta vaquera', ar: 'سترة جينز', vi: 'Áo khoác jean', hi: 'डेनिम जैकेट', fr: 'Veste en jean', th: 'แจ็กเก็ตยีนส์', id: 'Jaket denim' }],
    'outfit-ranger': [60, '👔', { en: 'Linen shirt & bandana', ko: '린넨 셔츠와 반다나', ja: 'リネンシャツとバンダナ', zh: '亚麻衬衫和方巾', es: 'Camisa de lino y pañuelo', ar: 'قميص كتان ومنديل', vi: 'Áo sơ mi linen và khăn bandana', hi: 'लिनन शर्ट और बंदाना', fr: 'Chemise en lin et bandana', th: 'เสื้อเชิ้ตลินินและผ้าโพกหัว', id: 'Kemeja linen & bandana' }],
    'outfit-barbarian': [80, '🎽', { en: 'Sleeveless top & shorts', ko: '민소매와 반바지', ja: 'タンクトップと短パン', zh: '背心和短裤', es: 'Camiseta sin mangas y shorts', ar: 'قميص بلا أكمام وشورت', vi: 'Áo ba lỗ và quần short', hi: 'स्लीवलेस टॉप और शॉर्ट्स', fr: 'Débardeur et short', th: 'เสื้อกล้ามและกางเกงขาสั้น', id: 'Kaos tanpa lengan & celana pendek' }],
    'outfit-hooded': [100, '🩶', { en: 'Grey hoodie', ko: '회색 후드티', ja: 'グレーのパーカー', zh: '灰色连帽卫衣', es: 'Sudadera gris con capucha', ar: 'هودي رمادي', vi: 'Áo hoodie xám', hi: 'ग्रे हुडी', fr: 'Sweat à capuche gris', th: 'ฮู้ดดี้สีเทา', id: 'Hoodie abu-abu' }],
    'outfit-knight': [120, '🤍', { en: 'Puffer jacket', ko: '숏패딩', ja: 'ショートダウン', zh: '短款羽绒服', es: 'Chaqueta acolchada', ar: 'سترة منفوخة', vi: 'Áo phao ngắn', hi: 'पफ़र जैकेट', fr: 'Doudoune', th: 'เสื้อขนเป็ด', id: 'Jaket puffer' }],
    'outfit-mage': [150, '🖤', { en: 'Long padded coat', ko: '롱패딩', ja: 'ロングダウンコート', zh: '长款羽绒服', es: 'Abrigo acolchado largo', ar: 'معطف منفوخ طويل', vi: 'Áo phao dài', hi: 'लंबा पैडेड कोट', fr: 'Long manteau matelassé', th: 'เสื้อโค้ตบุนวมตัวยาว', id: 'Mantel puffer panjang' }],
  }),
  // The other clothes shops: clothes, trousers, shoes and accessories.
  ...WEARABLES,
  // Claw machine prizes (core/claw-game.js).
  ...plushies({
    'plush-simurugi': ['😑', { en: 'Simurugi plush', ko: '시무룩이 인형', ja: 'シムルギのぬいぐるみ', zh: '闷闷鬼玩偶' }],
    'plush-mongle': ['☁️', { en: 'Mongle plush', ko: '몽글이 인형', ja: 'モングルのぬいぐるみ', zh: '云朵羊玩偶' }],
    'plush-bear': ['🧸', { en: 'Teddy bear', ko: '곰돌이 인형', ja: 'くまのぬいぐるみ', zh: '泰迪熊' }],
    'plush-mandu': ['🥟', { en: 'Mandu plush', ko: '만두 인형', ja: 'マンドゥのぬいぐるみ', zh: '饺子玩偶' }],
  }),
  // Lamps for your home, from the lighting shops on Cheonggyecheon-ro (furniture.js).
  ...lamps(),
  // Pets: adopted for money (price), or by code only (no price).
  // Adopted at animal cafés (stores.json "adopt"): the Maltese and the poodle
  // at the retriever café, the two cats at the cat café, and the price is the
  // adoption fee. The shiba, chinchilla and guinea pig stay here so pets players
  // already own keep working (and the chinchilla / guinea pig codes still give them).
  // Prices follow Korean pet-shop prices, listed in ₩1,000s (a toy poodle is
  // about ₩400,000), so a pet costs far more than a perfume or a jacket.
  ...pets({
    'pet-maltese': [400, '🐶', { kind: 'dog', name: '몽이', rom: 'Mongi', color: '#fbf8f2', accent: '#efe6da', scale: 0.85 }, { en: 'Maltese · Mongi', ko: '말티즈 · 몽이', ja: 'マルチーズ · モンイ', zh: '马尔济斯 · 萌萌' }],
    'pet-poodle': [400, '🐩', { kind: 'dog', name: '보리', rom: 'Bori', color: '#d9a066', accent: '#f3d9b8', scale: 0.85 }, { en: 'Toy poodle · Bori', ko: '토이푸들 · 보리', ja: 'トイプードル · ボリ', zh: '玩具贵宾 · 大麦' }],
    'pet-shiba': [800, '🐕', { kind: 'dog', name: '콩떡', rom: 'Kongtteok', color: '#e39a4f', accent: '#fff3e3', scale: 0.95 }, { en: 'Shiba · Kongtteok', ko: '시바견 · 콩떡', ja: '柴犬 · コントク', zh: '柴犬 · 豆糕' }],
    'pet-cheesecat': [250, '🐱', { kind: 'cat', name: '레오', rom: 'Leo', color: '#ffc864', accent: '#fff4e6', scale: 0.9 }, { en: 'Cheese tabby · Leo', ko: '치즈 고양이 · 레오', ja: '茶トラ · レオ', zh: '橘猫 · 雷欧' }],
    'pet-bluecat': [500, '🐈', { kind: 'cat', name: '아톰', rom: 'Atom', color: '#8e98a6', accent: '#d9dee5', scale: 0.9 }, { en: 'Russian Blue · Atom', ko: '러시안블루 · 아톰', ja: 'ロシアンブルー · アトム', zh: '俄罗斯蓝猫 · 阿童木' }],
    'pet-chinchilla': [400, '🐭', { kind: 'chinchilla', name: '솜이', rom: 'Somi', color: '#b9b6b8', accent: '#f1eeee', scale: 0.8 }, { en: 'Chinchilla · Somi', ko: '친칠라 · 솜이', ja: 'チンチラ · ソミ', zh: '龙猫 · 棉棉' }],
    'pet-guineapig': [60, '🐹', { kind: 'guineapig', name: '꿀떡', rom: 'Kkultteok', color: '#b4733f', accent: '#fff4e6', scale: 0.8 }, { en: 'Guinea pig · Kkultteok', ko: '기니피그 · 꿀떡', ja: 'モルモット · クルトク', zh: '豚鼠 · 蜜糕' }],
    'pet-golden': [0, '🦮', { kind: 'dog', name: '누룽지', rom: 'Nurungji', color: '#e2a85a', accent: '#c98a3e', scale: 1.25, earStyle: 'golden' }, { en: 'Golden retriever · Nurungji', ko: '골든리트리버 · 누룽지', ja: 'ゴールデンレトリバー · ヌルンジ', zh: '金毛寻回犬 · 锅巴', es: 'Golden retriever · Nurungji', fr: 'Golden retriever · Nurungji', vi: 'Golden retriever · Nurungji', id: 'Golden retriever · Nurungji', th: 'โกลเดนรีทรีฟเวอร์ · นูรุงจี', hi: 'गोल्डन रिट्रीवर · नुरुंगजी', ar: 'غولدن ريتريفر · نورونغجي' }],
    'pet-monkey': [0, '🐵', { kind: 'monkey', name: '바나', rom: 'Bana', color: '#8a5a3a', accent: '#f0d2b0', scale: 0.9 }, { en: 'Little monkey · Bana', ko: '아기 원숭이 · 바나', ja: '子ザル · バナ', zh: '小猴子 · 巴纳' }],
  }),
};

const KEY = 'mk.items';

export class Inventory {
  constructor() {
    try { this.ids = new Set(JSON.parse(localStorage.getItem(KEY) || '[]').filter((id) => ITEMS[id])); } catch { this.ids = new Set(); }
  }
  has(id) { return this.ids.has(id); }
  list() { return [...this.ids]; }
  // Returns the ids that were new.
  add(...ids) {
    const added = ids.filter((id) => ITEMS[id] && !this.ids.has(id));
    added.forEach((id) => this.ids.add(id));
    try { localStorage.setItem(KEY, JSON.stringify([...this.ids])); } catch { /* storage blocked */ }
    return added;
  }
  // Take an item out (sold at a second-hand shop). Returns true if it was there.
  remove(id) {
    if (!this.ids.delete(id)) return false;
    try { localStorage.setItem(KEY, JSON.stringify([...this.ids])); } catch { /* storage blocked */ }
    return true;
  }
}

// Developer codes, typed in chat as "/<code>" (no keyword, and a wrong
// code looks like any unknown command, so nothing hints they exist). Only their SHA-256
// is in the code. This keeps them out of plain sight but is NOT security:
// anyone can change their own browser. Real paid items must be checked on
// a server.
const CODES = {
  f368f463b616dadfcdc26126130b67a47f6faad781488925bb175e2240a26e10: Object.keys(ITEMS), // master: every item
  '378fc355ed89c5e4b9ba305012dea3f4c739e2fbcd5accdbf6a19bfb53f3ac52': ['car'],
  '9db9efa6cfeea17db7046ae247534ec49bf53b49f8e953416db0037e44145c44': ['car', 'limo'], // open sports car + limousine
  '6a4ae2320b9c19a6c29ba13e9daeb1a1aad96880fa89d9b9dd813c0785b2446b': ['moto'], // the red sports motorbike and helmet
  '1ce34a27523c7405edbff33ab0e1ca61f755f21714248edd4895e63d98c2f001': ['tee-simurugi'],
  // Pet codes. Only two dogs and two cats can be adopted, so the
  // chinchilla and guinea pig come from these codes (the monkey is code only,
  // since monkeys are not sold as pets in Korean pet shops).
  '5f91cb75c870dad21a6e9625a81fe0a7077a7fbe6a5e97f26c4e8bda3452e23c': ['pet-chinchilla'],
  bb28a6154fa42b99d0562f75e5167c61e49b69697ab09c65fc6deef34c5dcd48: ['pet-guineapig'],
  '8580d0842fc4424e83d6dc7f6672a93e519a96ca7dd549afdb31fffbabb245da': ['pet-monkey'],
  '90398d4f6612bb38379cd693e3573dc5cffa193ad323ad6dd4dae5c7292a3d05': ['pet-golden'], // a golden retriever, code only (the café's retrievers are not for adoption)
};

// Developer coin codes: "/<word><number>" adds that many coins, every time
// it is used. Only a hash of the word is kept here (upper/lower case is
// ignored, so a phone capitalising the first letter still works).
const COIN_WORDS = new Set([
  '5777947ba432a8c77c12a0884efb8ca8cc05f800c5d99c9fb8de86da2fd5d7b3',
]);
export const COIN_CODE_MAX = 1000000;
// The coins a code gives with the given word hashes (0 when it is not one).
export async function coinsFor(code, words = COIN_WORDS) {
  const m = /^(\D+)(\d+)$/.exec(String(code).trim());
  if (!m || !globalThis.crypto?.subtle) return 0;
  const n = Math.min(Number(m[2]), COIN_CODE_MAX);
  if (!(n > 0)) return 0;
  return words.has(await sha256(m[1].toLowerCase())) ? n : 0;
}
export async function coinCode(code) {
  return coinsFor(code);
}

// Event codes for players: "./EVENTSTART1" (any letter case) gives coins,
// once per device. A separate, simple format from the developer codes.
const EVENT_CODES = {
  '47535964edcf32113829b020570df4d48917a2ae0e6d4f3cd2777e72ab5ef786': { id: 'eventstart1', coins: 100000 }, // early players
};
export const isEventCode = (text) => /^\.\/[A-Za-z0-9_-]{2,40}$/.test(String(text).trim());
export async function eventCode(text) {
  if (!isEventCode(text) || !globalThis.crypto?.subtle) return null;
  return EVENT_CODES[await sha256(String(text).trim().slice(2).toUpperCase())] || null;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text).trim()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The item ids a code unlocks, or null.
export async function redeemCode(code) {
  if (!globalThis.crypto?.subtle) return null;
  // A phone may capitalise the first letter, so lower case is tried too.
  return CODES[await sha256(code)] || CODES[await sha256(String(code).toLowerCase())] || null;
}

export async function isMasterCode(code) {
  return (await redeemCode(code))?.length === Object.keys(ITEMS).length;
}

// Ride messages (tandem bike and car) travel on the emote channel as
// 'tandem:<verb>:<target id>[:<seat>]'.
export function parseTandem(e) {
  const m = /^tandem:(invite|join|leave|end):([\w-]{1,64})(?::(\d))?$/.exec(String(e));
  return m ? { verb: m[1], target: m[2], seat: m[3] ? Number(m[3]) : 0 } : null;
}
export const tandemMsg = (verb, target, seat) => `tandem:${verb}:${target}${seat ? ':' + seat : ''}`;
