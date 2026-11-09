// Permanent 56-entry catalogue (14 a Han River park). Stable IDs preserve bags
// and lifetime records; kinds that were swapped out move over in RENAMED.
// ★1 and ★2 bite at every park; ★3 and up are split between the four parks
// (PARK_FISH).
import { takeForcedCatch } from './fish-luck.js';
export const FISH = [
  {
    "id": "loach",
    "emoji": "🐟",
    "ko": "미꾸라지",
    "rom": "mikkuraji",
    "name": {
      "en": "Loach"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "anchovy",
    "emoji": "🐟",
    "ko": "멸치",
    "rom": "myeolchi",
    "name": {
      "en": "Anchovy"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "minnow",
    "emoji": "🐟",
    "ko": "피라미",
    "rom": "pirami",
    "name": {
      "en": "Pale chub"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "crucian",
    "emoji": "🐟",
    "ko": "붕어",
    "rom": "bungeo",
    "name": {
      "en": "Crucian carp",
      "ja": "フナ",
      "zh": "鲫鱼"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "ricefish",
    "emoji": "🐟",
    "ko": "송사리",
    "rom": "songsari",
    "name": {
      "en": "Ricefish"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "carp",
    "emoji": "🐟",
    "ko": "잉어",
    "rom": "ingeo",
    "name": {
      "en": "Carp"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 200
  },
  {
    "id": "sardine",
    "emoji": "🐟",
    "ko": "정어리",
    "rom": "jeongeori",
    "name": {
      "en": "Sardine"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "herring",
    "emoji": "🐟",
    "ko": "청어",
    "rom": "cheongeo",
    "name": {
      "en": "Herring"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "wakame",
    "emoji": "🌿",
    "ko": "미역",
    "rom": "miyeok",
    "name": {
      "en": "Wakame seaweed"
    },
    "rarity": 1,
    "released": true,
    "page": 0,
    "price": 100
  },
  {
    "id": "mackerel",
    "emoji": "🐟",
    "ko": "고등어",
    "rom": "godeungeo",
    "name": {
      "en": "Mackerel",
      "ja": "サバ",
      "zh": "鲭鱼"
    },
    "rarity": 1,
    "released": true,
    "page": 1,
    "price": 200
  },
  {
    "id": "saury",
    "emoji": "🐟",
    "ko": "꽁치",
    "rom": "kkongchi",
    "name": {
      "en": "Pacific saury"
    },
    "rarity": 1,
    "released": true,
    "page": 1,
    "price": 200
  },
  {
    "id": "shrimp",
    "emoji": "🦐",
    "ko": "새우",
    "rom": "saeu",
    "name": {
      "en": "Shrimp"
    },
    "rarity": 1,
    "released": true,
    "page": 1,
    "price": 200
  },
  {
    "id": "kelp",
    "emoji": "🌿",
    "ko": "다시마",
    "rom": "dasima",
    "name": {
      "en": "Kelp"
    },
    "rarity": 1,
    "released": true,
    "page": 1,
    "price": 100
  },
  {
    "id": "scallop",
    "emoji": "🐚",
    "ko": "가리비",
    "rom": "garibi",
    "name": {
      "en": "Scallop"
    },
    "rarity": 1,
    "released": true,
    "page": 1,
    "price": 200
  },
  {
    "id": "gizzard-shad",
    "emoji": "🐟",
    "ko": "전어",
    "rom": "jeoneo",
    "name": {
      "en": "Gizzard shad",
      "ja": "コノシロ",
      "zh": "斑鰶"
    },
    "rarity": 1,
    "released": true,
    "page": 1,
    "price": 200
  },
  {
    "id": "seabream",
    "emoji": "🐟",
    "ko": "참돔",
    "rom": "chamdom",
    "name": {
      "en": "Red seabream"
    },
    "rarity": 2,
    "released": true,
    "page": 1,
    "price": 600
  },
  {
    "id": "catfish",
    "emoji": "🐟",
    "ko": "메기",
    "rom": "megi",
    "name": {
      "en": "Catfish",
      "ja": "ナマズ",
      "zh": "鲶鱼"
    },
    "rarity": 2,
    "released": true,
    "page": 1,
    "price": 300
  },
  {
    "id": "trout",
    "emoji": "🐟",
    "ko": "송어",
    "rom": "songeo",
    "name": {
      "en": "Trout",
      "ja": "マス",
      "zh": "鳟鱼"
    },
    "rarity": 2,
    "released": true,
    "page": 1,
    "price": 400
  },
  {
    "id": "salmon",
    "emoji": "🐟",
    "ko": "연어",
    "rom": "yeoneo",
    "name": {
      "en": "Salmon",
      "ja": "サケ",
      "zh": "三文鱼"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 500
  },
  {
    "id": "jellyfish",
    "emoji": "🪼",
    "ko": "해파리",
    "rom": "haepari",
    "name": {
      "en": "Jellyfish"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 300
  },
  {
    "id": "bluegill",
    "emoji": "🐟",
    "ko": "블루길",
    "rom": "beullugil",
    "name": {
      "en": "Bluegill"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 300
  },
  {
    "id": "crab",
    "emoji": "🦀",
    "ko": "꽃게",
    "rom": "kkotge",
    "name": {
      "en": "Swimming crab",
      "ja": "ワタリガニ",
      "zh": "梭子蟹"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 500
  },
  {
    "id": "rockfish",
    "emoji": "🐟",
    "ko": "우럭",
    "rom": "ureok",
    "name": {
      "en": "Rockfish"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 400
  },
  {
    "id": "flounder",
    "emoji": "🐟",
    "ko": "광어",
    "rom": "gwangeo",
    "name": {
      "en": "Olive flounder"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 500
  },
  {
    "id": "softshell-turtle",
    "emoji": "🐢",
    "ko": "자라",
    "rom": "jara",
    "name": {
      "en": "Softshell turtle",
      "ja": "スッポン",
      "zh": "鳖"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 500
  },
  {
    "id": "red-lionfish",
    "emoji": "🐠",
    "ko": "쏠배감펭",
    "rom": "ssolbaegampeng",
    "name": {
      "en": "Lionfish",
      "ja": "ミノカサゴ",
      "zh": "狮子鱼"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 600
  },
  {
    "id": "octopus",
    "emoji": "🐙",
    "ko": "문어",
    "rom": "muneo",
    "name": {
      "en": "Octopus"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 500
  },
  {
    "id": "sea-cucumber",
    "emoji": "🐟",
    "ko": "해삼",
    "rom": "haesam",
    "name": {
      "en": "Sea cucumber"
    },
    "rarity": 2,
    "released": true,
    "page": 3,
    "price": 500
  },
  {
    "id": "sea-urchin",
    "emoji": "🐟",
    "ko": "성게",
    "rom": "seongge",
    "name": {
      "en": "Sea urchin"
    },
    "rarity": 2,
    "released": true,
    "page": 3,
    "price": 500
  },
  {
    "id": "starfish",
    "emoji": "⭐",
    "ko": "불가사리",
    "rom": "bulgasari",
    "name": {
      "en": "Starfish",
      "ja": "ヒトデ",
      "zh": "海星"
    },
    "rarity": 2,
    "released": true,
    "page": 3,
    "price": 300
  },
  {
    "id": "yellowtail",
    "emoji": "🐟",
    "ko": "방어",
    "rom": "bangeo",
    "name": {
      "en": "Yellowtail",
      "ja": "ブリ",
      "zh": "鰤鱼"
    },
    "rarity": 2,
    "released": true,
    "page": 3,
    "price": 600
  },
  {
    "id": "cutlassfish",
    "emoji": "🐟",
    "ko": "갈치",
    "rom": "galchi",
    "name": {
      "en": "Cutlassfish"
    },
    "rarity": 2,
    "released": true,
    "page": 3,
    "price": 600
  },
  {
    "id": "sunfish",
    "emoji": "🐟",
    "ko": "개복치",
    "rom": "gaebokchi",
    "name": {
      "en": "Ocean sunfish"
    },
    "rarity": 3,
    "released": true,
    "page": 3,
    "price": 1400
  },
  {
    "id": "clownfish",
    "emoji": "🐠",
    "ko": "흰동가리",
    "rom": "huindonggari",
    "name": {
      "en": "Clownfish"
    },
    "rarity": 3,
    "released": true,
    "page": 3,
    "price": 1400
  },
  {
    "id": "puffer",
    "emoji": "🐡",
    "ko": "복어",
    "rom": "bogeo",
    "name": {
      "en": "Pufferfish"
    },
    "rarity": 3,
    "released": true,
    "page": 3,
    "price": 1400
  },
  {
    "id": "cuttlefish",
    "emoji": "🐟",
    "ko": "갑오징어",
    "rom": "gabojingeo",
    "name": {
      "en": "Cuttlefish"
    },
    "rarity": 3,
    "released": true,
    "page": 3,
    "price": 1400
  },
  {
    "id": "lobster",
    "emoji": "🦞",
    "ko": "바닷가재",
    "rom": "badatgajae",
    "name": {
      "en": "Lobster"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "blue-tang",
    "emoji": "🐠",
    "ko": "블루탱",
    "rom": "beullutaeng",
    "name": {
      "en": "Blue tang"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "seahorse",
    "emoji": "🐟",
    "ko": "해마",
    "rom": "haema",
    "name": {
      "en": "Seahorse"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "butterflyfish",
    "emoji": "🐠",
    "ko": "나비고기",
    "rom": "nabigogi",
    "name": {
      "en": "Butterflyfish"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "electric-eel",
    "emoji": "⚡",
    "ko": "전기뱀장어",
    "rom": "jeongi-baemjangeo",
    "name": {
      "en": "Electric eel",
      "ja": "デンキウナギ",
      "zh": "电鳗"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "moray",
    "emoji": "🐟",
    "ko": "곰치",
    "rom": "gomchi",
    "name": {
      "en": "Moray eel"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "dolphin",
    "emoji": "🐬",
    "ko": "돌고래",
    "rom": "dolgorae",
    "name": {
      "en": "Dolphin",
      "ja": "イルカ",
      "zh": "海豚"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "axolotl",
    "emoji": "🦎",
    "ko": "아홀로틀",
    "rom": "aholloteul",
    "name": {
      "en": "Axolotl",
      "ja": "ウーパールーパー",
      "zh": "六角恐龙"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 1400
  },
  {
    "id": "shark",
    "emoji": "🦈",
    "ko": "백상아리",
    "rom": "baeksangari",
    "name": {
      "en": "Great white shark",
      "ja": "ホホジロザメ",
      "zh": "大白鲨"
    },
    "rarity": 4,
    "released": true,
    "page": 4,
    "price": 6000
  },
  {
    "id": "marlin",
    "emoji": "🐟",
    "ko": "청새치",
    "rom": "cheongsaechi",
    "name": {
      "en": "Blue marlin"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "tuna",
    "emoji": "🐟",
    "ko": "참다랑어",
    "rom": "chamdarangeo",
    "name": {
      "en": "Bluefin tuna",
      "ja": "クロマグロ",
      "zh": "蓝鳍金枪鱼"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "sea-turtle",
    "emoji": "🐢",
    "ko": "바다거북",
    "rom": "badageobuk",
    "name": {
      "en": "Sea turtle"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "anglerfish",
    "emoji": "🐟",
    "ko": "초롱아귀",
    "rom": "chorongagwi",
    "name": {
      "en": "Football fish",
      "ja": "チョウチンアンコウ",
      "zh": "灯笼鮟鱇"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "beluga",
    "emoji": "🐋",
    "ko": "벨루가",
    "rom": "belluga",
    "name": {
      "en": "Beluga",
      "ja": "シロイルカ",
      "zh": "白鲸"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "orca",
    "emoji": "🐋",
    "ko": "범고래",
    "rom": "beomgorae",
    "name": {
      "en": "Orca"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "dugong",
    "emoji": "🐋",
    "ko": "듀공",
    "rom": "dyugong",
    "name": {
      "en": "Dugong",
      "ja": "ジュゴン",
      "zh": "儒艮"
    },
    "rarity": 4,
    "released": true,
    "page": 5,
    "price": 6000
  },
  {
    "id": "giant-squid",
    "emoji": "🦑",
    "ko": "대왕오징어",
    "rom": "daewangojingeo",
    "name": {
      "en": "Giant squid"
    },
    "rarity": 5,
    "released": true,
    "page": 6,
    "price": 50000
  },
  {
    "id": "blobfish",
    "emoji": "🐟",
    "ko": "블롭피시",
    "rom": "beullopisi",
    "name": {
      "en": "Blobfish"
    },
    "rarity": 5,
    "released": true,
    "page": 6,
    "price": 50000
  },
  {
    "id": "manta",
    "emoji": "🐟",
    "ko": "만타가오리",
    "rom": "mantagaori",
    "name": {
      "en": "Manta ray"
    },
    "rarity": 5,
    "released": true,
    "page": 6,
    "price": 50000
  },
  {
    "id": "whale",
    "emoji": "🐋",
    "ko": "흰수염고래",
    "rom": "huinsuyeomgorae",
    "name": {
      "en": "Blue whale",
      "ja": "シロナガスクジラ",
      "zh": "蓝鲸"
    },
    "rarity": 5,
    "released": true,
    "page": 6,
    "price": 50000
  }
];

export const AVAILABLE_FISH = FISH.filter(f => f.released);
// How often each rarity bites, in % of fish (trash comes on top). Each tier's
// share is fixed and split among its released kinds, so releasing a new kind
// never makes its whole tier more common.
// Each tier, and each kind in it, bites less often than the tier below, at
// every park: any ★2 kind (0.77% or more) above each of a park's three ★3
// (0.5%), those above its two ★4 (0.6% for the tier, at most about 0.35%),
// and the rarer ★4 above its ★5 legend (0.05%). Made stingier when all the
// kinds opened, so the fish book takes a while to fill.
export const TIER_SHARE = [0, 75.85, 22, 1.5, 0.6, 0.05];
// Within a tier, kinds weigh 1 unless listed: bigger or pricier ones bite
// less often. At a fish every 12 s this gives a park's ★3 kinds about every
// 40 min each, its ★4 kinds about every hour, and its legend about every
// 7 hours.
export const TIER_WEIGHT = {
  carp: 0.7, mackerel: 0.8, saury: 0.8, shrimp: 0.8, scallop: 0.8, seabream: 0.6, salmon: 0.8, crab: 0.8, flounder: 0.8,
  'sea-turtle': 1.1, tuna: 1.1, marlin: 1, shark: 0.9, orca: 0.8, anglerfish: 1,
  manta: 2, blobfish: 1.5, whale: 1, 'giant-squid': 0.7,
};
// What each rarity is called (the fish book and the odds table).
export const TIER_NAMES = [null,
  { ko: '흔함', en: 'Common', ja: 'ふつう', zh: '常见' },
  { ko: '특별', en: 'Special', ja: 'とくべつ', zh: '特别' },
  { ko: '진귀', en: 'Precious', ja: '珍しい', zh: '珍贵' },
  { ko: '신비', en: 'Mythic', ja: '神秘', zh: '神秘' },
  { ko: '전설', en: 'Legendary', ja: '伝説', zh: '传说' },
];
const weightOf = f => TIER_WEIGHT[f.id] ?? 1;
const tierTotals = {};
for (const f of AVAILABLE_FISH) tierTotals[f.rarity] = (tierTotals[f.rarity] || 0) + weightOf(f);
const sharesTotal = Object.keys(tierTotals).reduce((a, r) => a + TIER_SHARE[r], 0);
for (const f of FISH) f.chance = f.released ? TIER_SHARE[f.rarity] * weightOf(f) / tierTotals[f.rarity] / sharesTotal * 100 : 0;
export const fishById = id => FISH.find(f => f.id === id) || null;

// Fish by park: ★1 and ★2 bite at every park; from ★3 up each park has its
// own kinds (keyed by the park store's id): three ★3, two ★4 and one ★5
// legend, 14 a park with the commons counted in. Each tier keeps its whole
// share at every park and sells for one price (★3, ★4 and ★5 each), so no
// park pays better; parks only differ in which rare fish you can meet. A park
// not listed here gets every released kind.
export const PARK_TIER = 3;
export const PARK_FISH = {
  'ttukseom-hangang': { name: { ko: '뚝섬', en: 'Ttukseom', ja: 'トゥクソム', zh: '纛岛' },
    fish: ['sunfish', 'electric-eel', 'axolotl', 'shark', 'marlin', 'whale'] },
  'mangwon-hangang': { name: { ko: '망원', en: 'Mangwon', ja: '望遠', zh: '望远' },
    fish: ['cuttlefish', 'lobster', 'seahorse', 'tuna', 'orca', 'giant-squid'] },
  'banpo-jamwon-hangang': { name: { ko: '반포·잠원', en: 'Banpo-Jamwon', ja: '盤浦・蚕院', zh: '盘浦·蚕院' },
    fish: ['clownfish', 'blue-tang', 'butterflyfish', 'sea-turtle', 'beluga', 'manta'] },
  'yeouido-hangang': { name: { ko: '여의도', en: 'Yeouido', ja: '汝矣島', zh: '汝矣岛' },
    fish: ['puffer', 'moray', 'dolphin', 'anglerfish', 'dugong', 'blobfish'] },
};
// A park's own kinds of one rarity (released), or null when the park keeps
// every kind of it (★1-2, or a park not in PARK_FISH).
const parkKinds = (park, rarity) => {
  if (rarity < PARK_TIER || !PARK_FISH[park]) return null;
  const list = PARK_FISH[park].fish.map(fishById).filter(f => f?.released && f.rarity === rarity);
  return list.length ? list : null;
};
// The park a ★3+ kind bites at, or null (any park).
export const parkOf = id => Object.values(PARK_FISH).find(p => p.fish.includes(id)) || null;
// A fish's chance (in % of fish, like f.chance) at a park (null: any park).
// A park's kinds share their whole tier, so every tier adds up the same at every park.
export function chanceAt(f, park = null) {
  if (!f.released) return 0;
  const here = parkKinds(park, f.rarity);
  if (!here) return f.chance;
  if (!here.includes(f)) return 0;
  return f.chance * tierTotals[f.rarity] / here.reduce((a, q) => a + weightOf(q), 0);
}
// The picture sheet (public/assets/fishing/fish-icons.webp, 8×7, 64 px a
// cell): kinds in reading order, the same order as FISH. Every kind in FISH has exactly one picture here.
export const FISH_SHEET = [
  'loach', 'anchovy', 'minnow', 'crucian', 'ricefish', 'carp', 'sardine', 'herring',
  'wakame', 'mackerel', 'saury', 'shrimp', 'kelp', 'scallop', 'gizzard-shad', 'seabream',
  'catfish', 'trout', 'salmon', 'jellyfish', 'bluegill', 'crab', 'rockfish', 'flounder',
  'softshell-turtle', 'red-lionfish', 'octopus', 'sea-cucumber', 'sea-urchin', 'starfish', 'yellowtail', 'cutlassfish',
  'sunfish', 'clownfish', 'puffer', 'cuttlefish', 'lobster', 'blue-tang', 'seahorse', 'butterflyfish',
  'electric-eel', 'moray', 'dolphin', 'axolotl', 'shark', 'marlin', 'tuna', 'sea-turtle',
  'anglerfish', 'beluga', 'orca', 'dugong', 'giant-squid', 'blobfish', 'manta', 'whale',
];
export const SHEET_COLS = 8, SHEET_ROWS = 7;
export const FISH_SHEET_URL = '/assets/fishing/fish-icons.webp?v=5';
// Kinds swapped out of the catalogue (to match the fish book's pictures),
// each moved to the new kind of the same rarity in its place, so bags and
// fish books saved before keep their counts.
export const RENAMED = {
  mandarin: 'sea-turtle', bass: 'scallop', 'horse-mackerel': 'jellyfish', squid: 'marlin',
  filefish: 'wakame', parrotfish: 'kelp', lionfish: 'manta', mandarinfish: 'blobfish', ray: 'orca', swordfish: 'giant-squid',
  crayfish: 'starfish', // too close to the lobster
  'snow-crab': 'dolphin', // too close to the blue crab
  'webfoot-octopus': 'octopus', // left out of the 56
};
const migrate = (raw) => {
  const out = { ...raw };
  for (const [old, id] of Object.entries(RENAMED)) {
    if (Number.isInteger(out[old]) && out[old] > 0) out[id] = (Number.isInteger(out[id]) ? out[id] : 0) + out[old];
    delete out[old];
  }
  return out;
};
// The lucky spot (행운 포인트): one of the park's fishing spots, a different
// one picked at random every LUCKY_MINUTES. There ★2 and up bite LUCKY_BOOST
// times as often (shared out of the common tier) and the old boot half as
// often. It comes from the clock, so everyone in the park sees the same spot.
export const LUCKY_MINUTES = 5;
export const LUCKY_BOOST = 1.5;
const luckyWeight = (f, park = null) => chanceAt(f, park) * (f.rarity >= 2 ? LUCKY_BOOST : 1);
// The same at every park (each park's ★5 still adds up to the tier's share).
const luckyTotal = AVAILABLE_FISH.reduce((a, f) => a + luckyWeight(f), 0);
// A fish's chance (in % of fish) at the lucky spot.
export const luckyChance = (f, park = null) => (f.released ? luckyWeight(f, park) / luckyTotal * 100 : 0);
export function luckySpot(n, now = Date.now()) {
  if (n < 2) return 0;
  let x = Math.floor(now / (LUCKY_MINUTES * 60000)) | 0; // the time slot, hashed
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) % n;
}
export function rollFish(rand = Math.random, lucky = false, park = null) {
  let r = rand() * 100;
  let last = null;
  for (const f of AVAILABLE_FISH) {
    const c = lucky ? luckyChance(f, park) : chanceAt(f, park);
    if (!c) continue;
    last = f; r -= c; if (r < 0) return f;
  }
  return last;
}

export const TRASH = { id: 'old-boot', emoji: '🥾', image: '/assets/fishing/old-boot.png', trash: true };
export const TRASH_CHANCE = 0.04;
export const LUCKY_TRASH_CHANCE = TRASH_CHANCE / 2;
// A fish set up by a developer code (core/fish-luck.js) is the next bite,
// once: a copy marked `sure` (no fight, never slips off).
export function rollCatch(rand = Math.random, lucky = false, park = null) {
  const forced = fishById(takeForcedCatch());
  if (forced) return { ...forced, sure: true };
  const value = rand(), trash = lucky ? LUCKY_TRASH_CHANCE : TRASH_CHANCE;
  return value < trash ? TRASH : rollFish(() => (value - trash) / (1 - trash), lucky, park);
}
export const REEL_SECONDS = 5;
// How a bite feels before it's landed: 1 light (★1-2, and the old boot),
// 2 heavy (★3-4), 3 legendary (★5). The bite, the shout, the rod and the reel
// all go by this, so a heavy pull could still be either ★3 or ★4 and the
// stars only show once the fish is up.
export const feelOf = fish => (!fish || fish.trash || fish.rarity <= 2 ? 1 : fish.rarity <= 4 ? 2 : 3);
export const tapsFor = fish => [0, 6, 12, 18][feelOf(fish)];
// Chance a landed fish still slips off the hook at the end, by rarity
// (halved by reeling in with time to spare, and cut by a better rod's hold,
// see rod-skins.js).
export const ESCAPE = [0, 0.05, 0.08, 0.12, 0.2, 0.3];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export function escapeChance(fish, spare = 0, hold = 0) {
  if (fish.trash || fish.sure) return 0;
  return ESCAPE[fish.rarity] * (1 - 0.5 * clamp01(spare)) * (1 - clamp01(hold));
}

// Rare fish (★3 and up) fight back: the reel gauge drains by this many taps
// a second, so you have to keep reeling (two reel buttons, both thumbs).
export const isRare = fish => !fish.trash && fish.rarity >= 3;
export const drainFor = fish => (isRare(fish) && !fish.sure ? [0, 0, 1.6, 2.8][feelOf(fish)] : 0);

// What you shout when a fish bites, by feel (see feelOf): one line picked at
// random each bite. A heavy line never says which of ★3 or ★4 it is.
export const BITE_LINES = {
  1: [{ ko: '작은 녀석이 물었다!', en: 'A little one bit!', ja: '小さいのがかかった！', zh: '小家伙上钩了！' },
    { ko: '오, 입질이다!', en: 'Oh, a bite!', ja: 'おっ、アタリだ！', zh: '哦，有鱼咬钩！' },
    { ko: '귀여운 녀석이네!', en: 'A cute one!', ja: 'かわいいヤツだ！', zh: '可爱的小家伙！' },
    { ko: '제법인데?', en: 'Not bad at all!', ja: 'なかなかやるな！', zh: '还不错嘛！' },
    { ko: '손맛이 좋은데!', en: 'Nice pull!', ja: 'いい手応えだ！', zh: '手感不错！' }],
  2: [{ ko: '대단한 녀석이다!!', en: 'What a monster!!', ja: 'すごいヤツだ!!', zh: '好厉害的家伙!!' },
    { ko: '이건 보통 놈이 아니야!!', en: 'This is no ordinary fish!!', ja: 'こいつはただ者じゃない!!', zh: '这可不是普通的鱼!!' },
    { ko: '희귀종의 기운이 느껴진다!!', en: 'I can feel a rare one!!', ja: 'レアの気配がする!!', zh: '感觉到稀有鱼的气息!!' },
    { ko: '엄청난 놈이 걸렸다!!', en: 'Something huge is on!!', ja: 'とんでもないのがかかった!!', zh: '钓到了个大家伙!!' },
    { ko: '낚싯대가 부러질 것 같아!!', en: "The rod's about to snap!!", ja: '竿が折れそうだ!!', zh: '鱼竿快要断了!!' }],
  3: [{ ko: '강의 주인이 나타났다!!!!', en: 'The lord of the river appears!!!!', ja: '川の主が現れた!!!!', zh: '河之主出现了!!!!' },
    { ko: '이건… 전설의 그 녀석?!', en: 'Is this… the legend?!', ja: 'これは…伝説のアイツ?!', zh: '难道是…传说中的那家伙?!' },
    { ko: '온 힘을 다해 감아라!!!!', en: 'Reel with everything you’ve got!!!!', ja: '全力で巻け!!!!', zh: '使出全力收线!!!!' }],
};
// Auto fishing: catches on its own while you stay at the spot with the game
// open, but slowly (AUTO_RATE of hands-on fishing, which lands a fish about
// every MANUAL_SECONDS) and never a rare fish. Lower AUTO_RATE to slow it.
export const MANUAL_SECONDS = 10;
export const AUTO_RATE = 1 / 10;
export const AUTO_SECONDS = MANUAL_SECONDS / AUTO_RATE;
export const AUTO_FISH = AVAILABLE_FISH.filter(f => !isRare(f));
export function rollAutoCatch(rand = Math.random) {
  const total = AUTO_FISH.reduce((a, f) => a + f.chance, 0);
  let r = rand() * total;
  for (const f of AUTO_FISH) { r -= f.chance; if (r < 0) return f; }
  return AUTO_FISH.at(-1);
}

// Seconds to wait for a bite (anywhere from 2.5 to 8.5), and how long the bite lasts.
export const biteWait = (rand = Math.random) => 2.5 + rand() * 6;
export const BITE_WINDOW = 1.2;

// The fish bag: { id: count }, saved on this device (and in the cloud save).
const BAG_KEY = 'mk.fish';
export const BAG_MAX = 30;
export class FishBag {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(BAG_KEY) || '{}') || {}; } catch { /* ignore */ }
    raw = migrate(raw);
    this.c = {};
    for (const f of FISH) if (Number.isInteger(raw[f.id]) && raw[f.id] > 0) this.c[f.id] = Math.min(BAG_MAX, raw[f.id]);
  }
  get size() { return Object.values(this.c).reduce((a, b) => a + b, 0); }
  get full() { return this.size >= BAG_MAX; }
  count(id) { return this.c[id] || 0; }
  list() { return FISH.filter((f) => this.c[f.id]).map((f) => ({ fish: f, n: this.c[f.id] })); }
  get value() { return this.list().reduce((a, { fish, n }) => a + fish.price * n, 0); }
  add(id) {
    if (this.full || !fishById(id)) return false;
    this.c[id] = (this.c[id] || 0) + 1;
    this._save();
    return true;
  }
  // Sell n of a kind (all of it when n is omitted); returns the coins.
  sell(id, n = Infinity) {
    const k = Math.min(n, this.c[id] || 0);
    if (!k) return 0;
    this.c[id] -= k;
    if (!this.c[id]) delete this.c[id];
    this._save();
    return k * fishById(id).price;
  }
  sellAll() { return FISH.reduce((a, f) => a + this.sell(f.id), 0); }
  _save() { try { this.storage?.setItem(BAG_KEY, JSON.stringify(this.c)); } catch { /* storage blocked */ } }
}

// Fish book (낚시 도감): every fish you land is recorded, even after you sell
// it. { id: count }, saved on this device as mk.fishdex (so the cloud save,
// which copies every "mk." key, carries it too). A player who fished before
// the book existed starts with what is in their bag.
const DEX_KEY = 'mk.fishdex';
export class FishDex {
  constructor(storage = globalThis.localStorage, bag = null) {
    this.storage = storage;
    let saved = null;
    try { saved = storage?.getItem(DEX_KEY) ?? null; } catch { /* storage blocked */ }
    let raw = {};
    try { raw = JSON.parse(saved || '{}') || {}; } catch { /* broken save */ }
    raw = migrate(raw);
    this.c = {};
    for (const f of FISH) if (Number.isInteger(raw[f.id]) && raw[f.id] > 0) this.c[f.id] = raw[f.id];
    if (saved == null && bag) {
      for (const f of FISH) if (bag.count(f.id)) this.c[f.id] = bag.count(f.id);
      if (this.kinds) this._save();
    }
  }
  count(id) { return this.c[id] || 0; }
  has(id) { return !!this.c[id]; }
  get kinds() { return Object.keys(this.c).length; }
  get total() { return Object.values(this.c).reduce((a, b) => a + b, 0); }
  get complete() { return FISH.every(f => this.has(f.id)); }
  get availableComplete() { return AVAILABLE_FISH.every(f => this.has(f.id)); }
  // Record a catch; returns true the first time this kind is caught.
  add(id) {
    if (!fishById(id)) return false;
    const isNew = !this.c[id];
    this.c[id] = (this.c[id] || 0) + 1;
    this._save();
    return isNew;
  }
  _save() { try { this.storage?.setItem(DEX_KEY, JSON.stringify(this.c)); } catch { /* storage blocked */ } }
}

// Fishing counters (mk.fishstats), for balancing: what happens to each cast.
// The fish book only knows what was landed; these also count the casts, the
// bites missed, the fish lost while reeling and the ones that slipped off.
// Saved on this device, so the cloud save (every "mk." key) carries them.
//   cast: lines thrown by hand   early: hooked before a bite
//   bite: bites by rarity [trash, ★1…★5]   miss: bites not hooked in time
//   lost: fish that got away while reeling, by rarity
//   escape: fish that slipped off at the end, by rarity
//   land: fish landed by hand, by rarity [trash, ★1…★5]
//   lucky: bites at the lucky spot   auto: fish landed by auto fishing
//   got: fish landed by hand, by kind { id: n }   gotAuto: the same for auto fishing
//   since: when counting started (ms)
const STATS_KEY = 'mk.fishstats';
const tiers = () => [0, 0, 0, 0, 0, 0];
export class FishStats {
  constructor(storage = globalThis.localStorage, now = Date.now()) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(STATS_KEY) || '{}') || {}; } catch { raw = {}; }
    const num = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
    const arr = v => tiers().map((_, i) => num(Array.isArray(v) ? v[i] : 0));
    const kinds = v => Object.fromEntries(FISH.filter(f => num(v?.[f.id])).map(f => [f.id, num(v[f.id])]));
    this.s = {
      since: num(raw.since) || now,
      cast: num(raw.cast), early: num(raw.early), miss: num(raw.miss), lucky: num(raw.lucky), auto: num(raw.auto),
      bite: arr(raw.bite), lost: arr(raw.lost), escape: arr(raw.escape), land: arr(raw.land),
      got: kinds(raw.got), gotAuto: kinds(raw.gotAuto),
    };
  }
  // n: 'cast' | 'early' | 'miss' | 'lucky', a per-rarity counter
  // ('bite' | 'lost' | 'escape' | 'land') with the fish, or 'auto' with the fish.
  // Landing a fish (by hand or auto) also counts its kind in got / gotAuto.
  add(n, fish) {
    const v = this.s[n];
    const kind = (k) => { if (fish && !fish.trash && fishById(fish.id)) this.s[k][fish.id] = (this.s[k][fish.id] || 0) + 1; };
    if (n === 'land') kind('got');
    if (n === 'auto') kind('gotAuto');
    if (Array.isArray(v)) { if (!fish) return; v[fish.trash ? 0 : fish.rarity] += 1; }
    else if (typeof v === 'number' && n !== 'since') this.s[n] = v + 1;
    else return;
    try { this.storage?.setItem(STATS_KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
  }
  get(n) { return this.s[n]; }
}

export const rarityStars = f => f.rarity;
