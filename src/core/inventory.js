// Items the player owns (saved on this device for now, like the wallet).
// Later items will come from the shop or an account service; for testing,
// the developer master code (typed in chat) adds every item.

const PET_DESC = {
  en: 'Tap Walk to take your pet along. Pets sometimes poop: clean it up quickly or you get a fine.',
  ko: '"산책"을 누르면 함께 다녀요. 가끔 똥을 싸니 바로 치워 주세요. 안 치우면 과태료가 나와요.',
  ja: '「散歩」で一緒にお出かけ。たまにフンをするので、すぐ片付けないと罰金です。',
  zh: '点“散步”带宠物一起走。宠物偶尔会便便，要马上清理，否则会被罚款。',
};
function pets(defs) {
  const out = {};
  for (const [id, [price, emoji, pet, name]] of Object.entries(defs)) out[id] = { emoji, name, desc: PET_DESC, pet, price: price || null };
  return out;
}
export const isPet = (id) => !!ITEMS[id]?.pet;
const OUTFIT_DESC = {
  en: 'A costume from the costume shop. Tap Wear to put it on, Take off to go back to your T-shirt.',
  ko: '코스튬 가게에서 산 옷이에요. "입기"로 입고, "벗기"로 티셔츠로 돌아가요.',
  ja: 'コスチューム店の服。「着る」で着替え、「脱ぐ」でTシャツに戻ります。',
  zh: '服装店买的服装。点“穿上”换上，点“脱下”换回T恤。',
  es: 'Un disfraz de la tienda de disfraces. Toca Poner para vestirlo y Quitar para volver a tu camiseta.',
};
// outfit: the character model it puts on; price: coins at the costume shop.
function outfits(defs) {
  const out = {};
  for (const [id, [price, emoji, name]] of Object.entries(defs)) out[id] = { emoji, name, desc: OUTFIT_DESC, outfit: id.slice(7), price };
  return out;
}
const PLUSH_DESC = {
  en: 'A prize from the claw machine. Put it in your home: Decorate at home, then pick it.',
  ko: '인형뽑기 경품이에요. 내 집에서 "꾸미기"를 누르고 골라서 놓을 수 있어요.',
  ja: 'クレーンゲームの景品。家の「模様替え」で置けます。',
  zh: '抓娃娃机的奖品。在家里点“装饰”就能摆放。',
};
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
    emoji: '🚗',
    name: { en: 'Convertible car', ko: '오픈카', ja: 'オープンカー', zh: '敞篷车' },
    desc: {
      en: 'Fast, but only on the big roads: cars can’t go into the narrow alleys. Get out to walk the alleys.',
      ko: '빠르지만 큰길만 달릴 수 있어요. 좁은 골목에는 못 들어가니 내려서 걸어가세요.',
      ja: '速いけれど大通りだけ。細い路地には入れないので、降りて歩きましょう。',
      zh: '速度快，但只能走大路，进不了小巷。下车步行去逛小巷吧。',
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
  // Costumes from the costume shop: wear one instead of your plain clothes.
  ...outfits({
    'outfit-rogue': [60, '🧝', { en: 'Ranger costume', ko: '레인저 옷', ja: 'レンジャーの服', zh: '游侠服装', es: 'Traje de explorador' }],
    'outfit-ranger': [60, '🧭', { en: 'Explorer costume', ko: '탐험가 옷', ja: '探検家の服', zh: '探险家服装', es: 'Traje de aventurero' }],
    'outfit-barbarian': [80, '🧔', { en: 'Viking costume', ko: '바이킹 옷', ja: 'バイキングの服', zh: '维京服装', es: 'Traje de vikingo' }],
    'outfit-hooded': [100, '🥷', { en: 'Ninja costume', ko: '닌자 옷', ja: '忍者の服', zh: '忍者服装', es: 'Traje de ninja' }],
    'outfit-knight': [120, '💂', { en: 'Knight armour', ko: '기사 갑옷', ja: '騎士の鎧', zh: '骑士盔甲', es: 'Armadura de caballero' }],
    'outfit-mage': [150, '🧙', { en: 'Mage robe', ko: '마법사 로브', ja: '魔法使いのローブ', zh: '法师长袍', es: 'Túnica de mago' }],
  }),
  // Claw machine prizes (core/claw-game.js).
  ...plushies({
    'plush-simurugi': ['😑', { en: 'Simurugi plush', ko: '시무룩이 인형', ja: 'シムルギのぬいぐるみ', zh: '闷闷鬼玩偶' }],
    'plush-mongle': ['☁️', { en: 'Mongle plush', ko: '몽글이 인형', ja: 'モングルのぬいぐるみ', zh: '云朵羊玩偶' }],
    'plush-bear': ['🧸', { en: 'Teddy bear', ko: '곰돌이 인형', ja: 'くまのぬいぐるみ', zh: '泰迪熊' }],
    'plush-mandu': ['🥟', { en: 'Mandu plush', ko: '만두 인형', ja: 'マンドゥのぬいぐるみ', zh: '饺子玩偶' }],
  }),
  // Pets: adopted at the pet shop for coins (price), or by code only (no price).
  ...pets({
    'pet-maltese': [30, '🐶', { kind: 'dog', name: '몽이', rom: 'Mongi', color: '#fbf8f2', accent: '#efe6da', scale: 0.85 }, { en: 'Maltese · Mongi', ko: '말티즈 · 몽이', ja: 'マルチーズ · モンイ', zh: '马尔济斯 · 萌萌' }],
    'pet-shiba': [30, '🐕', { kind: 'dog', name: '콩떡', rom: 'Kongtteok', color: '#e39a4f', accent: '#fff3e3', scale: 0.95 }, { en: 'Shiba · Kongtteok', ko: '시바견 · 콩떡', ja: '柴犬 · コントク', zh: '柴犬 · 豆糕' }],
    'pet-cheesecat': [30, '🐱', { kind: 'cat', name: '레오', rom: 'Leo', color: '#ffc864', accent: '#fff4e6', scale: 0.9 }, { en: 'Cheese tabby · Leo', ko: '치즈 고양이 · 레오', ja: '茶トラ · レオ', zh: '橘猫 · 雷欧' }],
    'pet-bluecat': [30, '🐈', { kind: 'cat', name: '아톰', rom: 'Atom', color: '#8e98a6', accent: '#d9dee5', scale: 0.9 }, { en: 'Russian Blue · Atom', ko: '러시안블루 · 아톰', ja: 'ロシアンブルー · アトム', zh: '俄罗斯蓝猫 · 阿童木' }],
    'pet-chinchilla': [0, '🐭', { kind: 'chinchilla', name: '솜이', rom: 'Somi', color: '#b9b6b8', accent: '#f1eeee', scale: 0.8 }, { en: 'Chinchilla · Somi', ko: '친칠라 · 솜이', ja: 'チンチラ · ソミ', zh: '龙猫 · 棉棉' }],
    'pet-guineapig': [0, '🐹', { kind: 'guineapig', name: '꿀떡', rom: 'Kkultteok', color: '#b4733f', accent: '#fff4e6', scale: 0.8 }, { en: 'Guinea pig · Kkultteok', ko: '기니피그 · 꿀떡', ja: 'モルモット · クルトク', zh: '豚鼠 · 蜜糕' }],
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
}

// Developer codes, typed in chat as "/master <code>". Only their SHA-256
// is in the code. This keeps them out of plain sight but is NOT security:
// anyone can change their own browser. Real paid items must be checked on
// a server.
const CODES = {
  f368f463b616dadfcdc26126130b67a47f6faad781488925bb175e2240a26e10: Object.keys(ITEMS), // master: every item
  '378fc355ed89c5e4b9ba305012dea3f4c739e2fbcd5accdbf6a19bfb53f3ac52': ['car'],
  '6a4ae2320b9c19a6c29ba13e9daeb1a1aad96880fa89d9b9dd813c0785b2446b': ['moto'], // the red sports motorbike and helmet
  '1ce34a27523c7405edbff33ab0e1ca61f755f21714248edd4895e63d98c2f001': ['tee-simurugi'],
  // Pets not sold yet: one code each.
  '5f91cb75c870dad21a6e9625a81fe0a7077a7fbe6a5e97f26c4e8bda3452e23c': ['pet-chinchilla'],
  bb28a6154fa42b99d0562f75e5167c61e49b69697ab09c65fc6deef34c5dcd48: ['pet-guineapig'],
  '8580d0842fc4424e83d6dc7f6672a93e519a96ca7dd549afdb31fffbabb245da': ['pet-monkey'],
};

// Coin codes: "/master <code>" adds coins, once per device.
const COIN_CODES = {
  '74cefd55ed30ad232b9cf41f598821c27ccb3fec18edfeeefb03780f12604248': 1000,
};
export async function coinCode(code) {
  return COIN_CODES[await sha256(code)] || 0;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text).trim()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The item ids a code unlocks, or null.
export async function redeemCode(code) {
  if (!globalThis.crypto?.subtle) return null;
  return CODES[await sha256(code)] || null;
}

export async function isMasterCode(code) {
  return (await redeemCode(code))?.length === Object.keys(ITEMS).length;
}

// Ride messages (tandem bike and car) travel on the emote channel as
// 'tandem:<verb>:<target id>[:<seat>]'.
export const TANDEM_VERBS = ['invite', 'join', 'leave', 'end'];
export function parseTandem(e) {
  const m = /^tandem:(invite|join|leave|end):([\w-]{1,64})(?::(\d))?$/.exec(String(e));
  return m ? { verb: m[1], target: m[2], seat: m[3] ? Number(m[3]) : 0 } : null;
}
export const tandemMsg = (verb, target, seat) => `tandem:${verb}:${target}${seat ? ':' + seat : ''}`;
