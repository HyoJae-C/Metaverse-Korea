// Bukchon Hanok Village: places in the district's own metres (x east, z south,
// (0, 0) on Yulgok-ro in front of Anguk Station). The game adds the district
// offset from region.json, so this file never changes when Bukchon moves.
//
// A small village on a hill, open on the field (seen from Yulgok-ro): the gate by Anguk Station, a street of
// shops and the Open House at the bottom, then hanok alleys climbing to the
// top (hill, ground()).
// - views: photo spots. The main one is the top of Bukchon-ro 11-gil, the
//   famous view down the alley (one of the city's Bukchon 8 Views).
// - quiet: the Quiet Zone, the hanok alleys up the hill where people live.
//   Walking only (no running, no riding).
// - openHouse: a hanok you can walk into, with five parts to learn.
// - welcome, signs: what Bukchon is, and how to visit (people live here).
//
// Real facts here were checked on 2026-11-07:
// - the Bukchon 8 Views (Bukchon-ro 11-gil is among them): Seoul
//   Metropolitan Government (mediahub.seoul.go.kr)
// - the Bukchon special management zone ("red zone", around Bukchon-ro
//   11-gil): visitors 10:00-17:00 since 1 Nov 2024, fines (100,000 won)
//   from 1 Mar 2025 (Seoul Metropolitan Government, Jongno-gu).

const T = (en, ko, ja, zh) => ({ en, ko, ja, zh });

export const BUKCHON = {
  district: 'bukchon',
  // The village (district metres): x0, z0 (the south edge, along
  // Yulgok-ro), x1, z1 (the north edge). A low granite retaining wall runs
  // round it; the welcome card shows the first time you walk in.
  area: [-10, -14.5, 130, -186],
  gates: [
    { at: [24, -14.5], w: 12, main: true }, // Bukchon-ro, by Anguk Station
  ],
  // The hill (언덕): flat by the gate and the shops, then the alleys climb
  // north to the top (y in metres at district z). ground(x, z) gives it.
  hill: { foot: -84, top: -160, h: 10 },
  // At each gate: a sign outside (sign: where it stands, ry: the way it reads),
  // and a card when you walk in. What Bukchon is, and how to visit it: real
  // people live in these hanok.
  welcome: {
    title: T('Bukchon Hanok Village', '북촌한옥마을', '北村韓屋村', '北村韩屋村'),
    text: T(
      'A neighbourhood of hanok, traditional Korean houses, between Gyeongbokgung and Changdeokgung. Since the Joseon era it has been home to families, and it still is today.',
      '경복궁과 창덕궁 사이, 조선 시대부터 사람들이 살아온 한옥 마을이에요. 지금도 실제 주민들이 살고 있어요.',
      '景福宮と昌徳宮の間にある、朝鮮時代から人々が暮らしてきた韓屋の町。今も実際に住民が暮らしています。',
      '位于景福宫和昌德宫之间的韩屋村，从朝鲜时代起就有人居住，现在也仍有居民生活在这里。'),
    rules: T(
      'Please keep your voice down: noise disturbs the people who live here. These are real homes, so never go through a gate or into a courtyard without asking first.',
      '주민들이 피해를 입지 않도록 조용히 다녀 주세요. 실제 사람이 사는 집이니 대문이나 마당에 함부로 들어가지 말고, 꼭 먼저 확인해 주세요.',
      '住民の迷惑にならないよう、静かにお歩きください。実際に人が住む家なので、門や庭に勝手に入らず、必ず先に確認してください。',
      '为了不打扰居民，请安静行走。这里是真实的住家，请勿擅自进入大门或院子，务必先确认。'),
  },
  signs: [
    { at: [36, -11.5], ry: 0 }, // beside the gate on Yulgok-ro
  ],
  // Where the villagers in hanbok stroll (two around each spot).
  villagers: [[60, -60], [60, -126], [24, -140], [100, -118]],
  // The Quiet Zone (polygon): the hanok alleys up the hill, and the top.
  quiet: [[-10, -84], [130, -84], [130, -186], [-10, -186]],
  // Open House compound [x0, z0 (south), x1, z1 (north)] and its gate.
  openHouse: {
    box: [84, -46, 124, -82],
    gate: [104, -46],
    // Five parts of a hanok: walk up to the glowing spot to read about it.
    parts: [
      { id: 'giwa', at: [104, -50], icon: '🏯',
        name: T('Giwa roof tiles', '기와', '瓦（キワ）', '瓦片'),
        text: T('Curved clay tiles in two kinds, concave and convex, laid in rows. The roof\'s ends lift a little at the corners, like the tips of a smile.', '오목한 암키와와 볼록한 수키와를 번갈아 얹어요. 지붕 끝이 살짝 들려 올라간 곡선이 한옥의 멋이에요.', '凹型と凸型の瓦を交互に並べます。軒先が少し反り上がる曲線が韓屋の美しさです。', '凹瓦和凸瓦交替铺成。屋檐四角微微上翘，是韩屋之美。') },
      { id: 'maru', at: [104, -67], icon: '🪵',
        name: T('Daecheong maru', '대청마루', 'テチョンマル（板の間）', '大厅地板'),
        text: T('The wooden-floored hall in the middle of the house, open to the courtyard. Cool in summer: the breeze runs through from front to back.', '집 한가운데 마당을 향해 열린 나무 마루예요. 앞뒤로 바람이 통해서 여름에 시원해요.', '家の真ん中にある、庭に開いた板張りの間。前後に風が抜けて夏は涼しい。', '房子中间朝院子敞开的木地板厅，前后通风，夏天很凉快。') },
      { id: 'ondol', at: [96, -62], icon: '🔥',
        name: T('Ondol floor heating', '온돌', 'オンドル（床暖房）', '火炕（地暖）'),
        text: T('Smoke from the kitchen fire runs through channels under the stone floor and warms the room. People sit and sleep on the warm floor.', '아궁이에서 불을 때면 연기와 열이 방바닥 아래 고래를 지나며 구들장을 데워요. 따뜻한 바닥에 앉고 잠을 자요.', 'かまどの煙と熱が床下の通り道を通って石の床を温めます。温かい床に座り、眠ります。', '灶火的烟和热经过地板下的烟道，把石板烧热。人们坐在暖和的地上，也睡在上面。') },
      { id: 'changhoji', at: [112, -62], icon: '🚪',
        name: T('Changhoji paper doors', '창호지 문', '障子紙の戸（チャンホジ）', '窗户纸门'),
        text: T('Lattice doors covered with hanji, mulberry paper. Light comes in soft, and the paper lets the room breathe.', '나무 창살에 닥나무로 만든 한지를 발라요. 빛은 부드럽게 들어오고 바람은 숨 쉬듯 통해요.', '木の格子に楮（こうぞ）の韓紙を貼った戸。光はやわらかく入り、紙が呼吸します。', '木格子上糊着用楮树做的韩纸，光线柔和，纸也能透气。') },
      { id: 'jangdok', at: [110, -50.5], icon: '🏺',
        name: T('Jangdokdae', '장독대', 'チャンドクテ（甕置き場）', '酱缸台'),
        text: T('A sunny stone platform for big onggi jars of soy sauce, soybean paste and chilli paste. The jars breathe, so the sauces age slowly.', '간장, 된장, 고추장을 담은 큰 옹기를 두는 볕 좋은 자리예요. 옹기가 숨을 쉬어서 장이 천천히 익어요.', '醤油、味噌、コチュジャンの大きな甕を置く日当たりのいい場所。甕が呼吸してゆっくり熟成します。', '放酱油、大酱、辣椒酱大瓮的向阳石台。瓮会呼吸，酱慢慢发酵。') },
    ],
    // The persimmon tree in the courtyard, with a magpie (까치밥).
    tree: { at: [97, -51], icon: '🐦',
      name: T('Magpie\'s share', '까치밥', 'カササギの分（カチバプ）', '喜鹊饭'),
      text: T('In autumn, families leave a few persimmons on the top branches when they pick the rest: food for the magpies and other birds through the winter.', '가을에 감을 딸 때 꼭대기에 몇 개를 남겨 둬요. 겨울을 나는 까치와 새들의 몫이에요.', '秋に柿を収穫するとき、てっぺんにいくつか残しておきます。冬を越す鳥たちの分です。', '秋天摘柿子时，会在树顶留几个，给过冬的喜鹊和小鸟吃。') },
  },
  // The main photo spot: the top of Bukchon-ro 11-gil (Gahoe-dong 31), the
  // view everyone takes: the alley stepping down between tiled roofs, with
  // the city beyond. (One of the city's Bukchon 8 Views.) The list keeps
  // room for more spots later.
  views: [
    { n: 1, at: [60, -165], face: [0, 1],
      name: T('Bukchon-ro 11-gil hilltop', '북촌로11길 언덕', '北村路11ギルの丘', '北村路11街坡顶'),
      text: T('The famous view of Bukchon: the narrow alley stepping down between tiled roofs, and the towers of the city beyond.', '북촌에서 가장 유명한 장면이에요. 기와지붕 사이로 좁은 골목이 층층이 내려가고, 그 너머로 도시의 빌딩이 보여요.', '北村でいちばん有名な景色。瓦屋根の間を細い路地が段々に下り、その先に街のビルが見えます。', '北村最有名的景色：窄窄的小巷在瓦顶之间层层而下，远处是城市的高楼。') },
  ],
};

export const VIEW_REWARD = 20000; // coins for each new photo spot
export const ALL_VIEWS_REWARD = 40000; // and for having them all

// Height of the ground at district (x, z): the hill inside the wall.
export function ground(x, z) {
  const [x0, , x1, z1] = BUKCHON.area, { foot, top, h } = BUKCHON.hill;
  if (x <= x0 || x >= x1 || z >= foot || z <= z1) return 0;
  return h * Math.min(1, (foot - z) / (foot - top));
}

// Point in polygon (x, z).
export function inside(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

// Which views you have photographed, saved on this device.
const KEY = 'mk.bukchonViews';
export class ViewBook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let s = [];
    try { s = JSON.parse(storage?.getItem(KEY) || '[]'); } catch { /* broken save */ }
    this.seen = new Set((Array.isArray(s) ? s : []).filter((n) => BUKCHON.views.some((v) => v.n === n)));
  }
  has(n) { return this.seen.has(n); }
  get count() { return this.seen.size; }
  get done() { return this.seen.size >= BUKCHON.views.length; }
  // Records a view; returns the coins it earns (0 if it was already taken).
  take(n) {
    if (this.seen.has(n) || !BUKCHON.views.some((v) => v.n === n)) return 0;
    this.seen.add(n);
    try { this.storage?.setItem(KEY, JSON.stringify([...this.seen].sort())); } catch { /* storage blocked */ }
    return VIEW_REWARD + (this.done ? ALL_VIEWS_REWARD : 0);
  }
}

// Which hanok parts you have read about (Hanok Explorer: all five).
const PARTS_KEY = 'mk.hanokParts';
export class PartBook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let s = [];
    try { s = JSON.parse(storage?.getItem(PARTS_KEY) || '[]'); } catch { /* broken save */ }
    const ids = new Set(BUKCHON.openHouse.parts.map((p) => p.id));
    this.seen = new Set((Array.isArray(s) ? s : []).filter((id) => ids.has(id)));
  }
  get done() { return this.seen.size >= BUKCHON.openHouse.parts.length; }
  // Records a part; true when this read finishes all five (the first time).
  read(id) {
    if (this.seen.has(id) || !BUKCHON.openHouse.parts.some((p) => p.id === id)) return false;
    this.seen.add(id);
    try { this.storage?.setItem(PARTS_KEY, JSON.stringify([...this.seen])); } catch { /* storage blocked */ }
    return this.done;
  }
}
export const EXPLORER_REWARD = 40000;

// The nearest spot within r of (x, z) among items with `at` (local metres),
// for a district at offset [ox, oz].
export function nearestAt(items, x, z, [ox, oz], r) {
  let best = null, bd = r;
  for (const it of items) {
    const d = Math.hypot(x - (it.at[0] + ox), z - (it.at[1] + oz));
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
