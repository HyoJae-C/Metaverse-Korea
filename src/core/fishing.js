// Permanent 49-entry catalogue. Stable IDs preserve bags and lifetime records.
// Twenty-seven species are available in the first release.
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
    "price": 1
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
    "price": 1
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
    "price": 1
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
    "price": 1
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
    "price": 1
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
    "price": 2
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
    "price": 1
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
    "price": 1
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
    "price": 1
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
    "price": 2
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
    "price": 2
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
    "price": 2
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
    "released": false,
    "page": 1,
    "price": 1
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
    "price": 2
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
    "price": 6
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
    "price": 3
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
    "price": 4
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
    "page": 1,
    "price": 5
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
    "price": 3
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
    "price": 3
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
    "price": 5
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
    "price": 4
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
    "price": 5
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
    "released": false,
    "page": 2,
    "price": 5
  },
  {
    "id": "webfoot-octopus",
    "emoji": "🐙",
    "ko": "주꾸미",
    "rom": "jukkumi",
    "name": {
      "en": "Webfoot octopus"
    },
    "rarity": 2,
    "released": true,
    "page": 2,
    "price": 4
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
    "released": false,
    "page": 2,
    "price": 5
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
    "released": false,
    "page": 2,
    "price": 5
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
    "price": 3
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
    "released": false,
    "page": 3,
    "price": 15
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
    "released": false,
    "page": 3,
    "price": 10
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
    "price": 12
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
    "price": 10
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
    "released": false,
    "page": 3,
    "price": 18
  },
  {
    "id": "snow-crab",
    "emoji": "🦀",
    "ko": "대게",
    "rom": "daege",
    "name": {
      "en": "Snow crab"
    },
    "rarity": 3,
    "released": false,
    "page": 3,
    "price": 18
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
    "released": false,
    "page": 3,
    "price": 10
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
    "page": 3,
    "price": 14
  },
  {
    "id": "cutlassfish",
    "emoji": "🐟",
    "ko": "갈치",
    "rom": "galchi",
    "name": {
      "en": "Cutlassfish"
    },
    "rarity": 3,
    "released": true,
    "page": 4,
    "price": 10
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
    "released": false,
    "page": 4,
    "price": 10
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
    "released": false,
    "page": 4,
    "price": 12
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
    "released": false,
    "page": 4,
    "price": 150
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
    "price": 70
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
    "page": 4,
    "price": 30
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
    "page": 4,
    "price": 22
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
    "page": 4,
    "price": 20
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
    "released": false,
    "page": 4,
    "price": 50
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
    "released": false,
    "page": 5,
    "price": 500
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
    "page": 5,
    "price": 500
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
    "page": 5,
    "price": 500
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
    "released": false,
    "page": 5,
    "price": 500
  }
];

export const AVAILABLE_FISH = FISH.filter(f => f.released);
// How often each rarity bites, in % of fish (trash comes on top). Each tier's
// share is fixed and split among its released kinds, so releasing a new kind
// never makes its whole tier more common.
// Each tier, and each kind in it, bites less often than the tier below:
// every ★3 kind (1.25% each of four) stays below any single ★2 kind, and
// ★4 (3% for the tier, at most about 1.1% a kind) below ★3. Every park
// shares this one table, so none pays better than another.
export const TIER_SHARE = [0, 63.6, 28, 5, 3, 0.4];
// Within a tier, kinds weigh 1 unless listed: bigger or pricier ones bite
// less often. At a fish every 12 s this gives bluefin tuna about every
// 20 min, the great white about every 80 min, the blue whale about every hour.
export const TIER_WEIGHT = {
  carp: 0.7, mackerel: 0.8, saury: 0.8, shrimp: 0.8, scallop: 0.8, seabream: 0.6, salmon: 0.8, crab: 0.8, flounder: 0.8,
  'sea-turtle': 2, tuna: 2, marlin: 1, shark: 0.5, orca: 0.4, anglerfish: 0.8,
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

// Legends by park: every park shares the whole table except ★5, where each
// park has its own legends (keyed by the park store's id). The ★5 tier keeps
// its 0.4% at every park and every legend sells for the same price, so no park
// pays better; parks only differ in which legend you can meet. A park not
// listed here (or whose legends aren't out yet) gets every released legend.
export const PARK_LEGENDS = {
  'ttukseom-hangang': { name: { ko: '뚝섬', en: 'Ttukseom', ja: 'トゥクソム', zh: '纛岛' }, legends: ['whale'] },
  'mangwon-hangang': { name: { ko: '망원', en: 'Mangwon', ja: '望遠', zh: '望远' }, legends: ['giant-squid'] },
};
const legendsAt = park => {
  const list = (PARK_LEGENDS[park]?.legends || []).map(fishById).filter(f => f?.released);
  return list.length ? list : null;
};
// The park a legend bites at, or null (any park).
export const legendPark = id => Object.values(PARK_LEGENDS).find(p => p.legends.includes(id)) || null;
// A fish's chance (in % of fish, like f.chance) at a park (null: any park).
export function chanceAt(f, park = null) {
  if (!f.released) return 0;
  const here = f.rarity === 5 && legendsAt(park);
  if (!here) return f.chance;
  if (!here.includes(f)) return 0;
  return f.chance * tierTotals[5] / here.reduce((a, q) => a + weightOf(q), 0);
}
// The picture sheet (public/assets/fishing/fish-icons.webp, 7×7): kinds in
// reading order. Every kind in FISH has exactly one picture here.
export const FISH_SHEET = [
  'loach', 'anchovy', 'minnow', 'crucian', 'ricefish', 'carp', 'sardine',
  'herring', 'wakame', 'mackerel', 'saury', 'shrimp', 'kelp', 'scallop',
  'seabream', 'catfish', 'trout', 'salmon', 'jellyfish', 'bluegill', 'crab',
  'rockfish', 'flounder', 'octopus', 'webfoot-octopus', 'sea-cucumber', 'sea-urchin', 'starfish',
  'sunfish', 'clownfish', 'puffer', 'cuttlefish', 'lobster', 'snow-crab', 'blue-tang',
  'seahorse', 'cutlassfish', 'butterflyfish', 'moray', 'orca', 'shark', 'marlin',
  'tuna', 'sea-turtle', 'anglerfish', 'manta', 'whale', 'giant-squid', 'blobfish',
];
export const FISH_SHEET_URL = '/assets/fishing/fish-icons.webp?v=2';
// Kinds swapped out of the catalogue (to match the fish book's pictures),
// each moved to the new kind of the same rarity in its place, so bags and
// fish books saved before keep their counts.
export const RENAMED = {
  mandarin: 'sea-turtle', bass: 'scallop', 'horse-mackerel': 'jellyfish', squid: 'marlin',
  filefish: 'wakame', parrotfish: 'kelp', lionfish: 'manta', mandarinfish: 'blobfish', ray: 'orca', swordfish: 'giant-squid',
  crayfish: 'starfish', // too close to the lobster
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
export const tapsFor = fish => fish.trash ? 5 : [0, 5, 7, 10, 14, 18][fish.rarity];
// Chance a landed fish still slips off the hook at the end, by rarity
// (halved by reeling in with time to spare).
export const ESCAPE = [0, 0.05, 0.08, 0.12, 0.2, 0.3];
export function escapeChance(fish, spare = 0) {
  if (fish.trash || fish.sure) return 0;
  return ESCAPE[fish.rarity] * (1 - 0.5 * Math.min(1, Math.max(0, spare)));
}

// Rare fish (★3 and up) fight back: the reel gauge drains by this many taps
// a second, so you have to keep reeling (two reel buttons, both thumbs).
export const isRare = fish => !fish.trash && fish.rarity >= 3;
export const drainFor = fish => (isRare(fish) && !fish.sure ? [0, 0, 0, 1.2, 2, 2.8][fish.rarity] : 0);

// What you shout when a fish bites: three lines per rarity (★1–★5), one
// picked at random each bite. ★3 and up are the rare ones.
export const BITE_LINES = {
  1: [{ ko: '작은 녀석이 물었다!', en: 'A little one bit!', ja: '小さいのがかかった！', zh: '小家伙上钩了！' },
    { ko: '오, 입질이다!', en: 'Oh, a bite!', ja: 'おっ、アタリだ！', zh: '哦，有鱼咬钩！' },
    { ko: '귀여운 녀석이네!', en: 'A cute one!', ja: 'かわいいヤツだ！', zh: '可爱的小家伙！' }],
  2: [{ ko: '제법인데?', en: 'Not bad at all!', ja: 'なかなかやるな！', zh: '还不错嘛！' },
    { ko: '손맛이 좋은데!', en: 'Nice pull!', ja: 'いい手応えだ！', zh: '手感不错！' },
    { ko: '꽤 묵직하다!', en: 'Pretty heavy!', ja: 'けっこう重いぞ！', zh: '还挺沉的！' }],
  3: [{ ko: '대단한 녀석이다!!', en: 'What a monster!!', ja: 'すごいヤツだ!!', zh: '好厉害的家伙!!' },
    { ko: '이건 보통 놈이 아니야!!', en: 'This is no ordinary fish!!', ja: 'こいつはただ者じゃない!!', zh: '这可不是普通的鱼!!' },
    { ko: '희귀종의 기운이 느껴진다!!', en: 'I can feel a rare one!!', ja: 'レアの気配がする!!', zh: '感觉到稀有鱼的气息!!' }],
  4: [{ ko: '엄청난 놈이 걸렸다!!!', en: 'Something huge is on!!!', ja: 'とんでもないのがかかった!!!', zh: '钓到了个大家伙!!!' },
    { ko: '낚싯대가 부러질 것 같아!!!', en: "The rod's about to snap!!!", ja: '竿が折れそうだ!!!', zh: '鱼竿快要断了!!!' },
    { ko: '신비로운 놈이 걸렸다!!!', en: 'Something mythic is on!!!', ja: '神秘的なヤツがかかった!!!', zh: '钓到了神秘的家伙!!!' }],
  5: [{ ko: '강의 주인이 나타났다!!!!', en: 'The lord of the river appears!!!!', ja: '川の主が現れた!!!!', zh: '河之主出现了!!!!' },
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
