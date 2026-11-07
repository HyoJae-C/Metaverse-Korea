// Bukchon Hanok Village: places in the district's own metres (x east, z south,
// (0, 0) on Yulgok-ro in front of Anguk Station). The game adds the district
// offset from region.json, so this file never changes when Bukchon moves.
//
// - views: the Bukchon 8 Views (북촌8경), photo spots chosen by the Seoul
//   Metropolitan Government. Take a photo at all eight for a reward.
// - quiet: the Quiet Zone, the hanok alleys of Gahoe-dong where people live.
//   Walking only (no running, no riding).
// - openHouse: a hanok you can walk into, with five parts to learn.
//
// Real facts here were checked on 2026-11-07:
// - the 8 Views and their order: Seoul Metropolitan Government (mediahub.seoul.go.kr)
// - the Bukchon special management zone ("red zone", around Bukchon-ro
//   11-gil): visitors 10:00-17:00 since 1 Nov 2024, fines (100,000 won)
//   from 1 Mar 2025 (Seoul Metropolitan Government, Jongno-gu).

const T = (en, ko, ja, zh) => ({ en, ko, ja, zh });

export const BUKCHON = {
  district: 'bukchon',
  // The Quiet Zone (polygon): the Gahoe-dong alleys and the rooftop view.
  quiet: [[92, -207], [238, -207], [238, -352], [92, -352]],
  // Open House compound [x0, z0 (south), x1, z1 (north)] and its gate.
  openHouse: {
    box: [140, -102, 190, -150],
    gate: [165, -102],
    // Five parts of a hanok: walk up to the glowing spot to read about it.
    parts: [
      { id: 'giwa', at: [165, -106], icon: '🏯',
        name: T('Giwa roof tiles', '기와', '瓦（キワ）', '瓦片'),
        text: T('Curved clay tiles in two kinds, concave and convex, laid in rows. The roof\'s ends lift a little at the corners, like the tips of a smile.', '오목한 암키와와 볼록한 수키와를 번갈아 얹어요. 지붕 끝이 살짝 들려 올라간 곡선이 한옥의 멋이에요.', '凹型と凸型の瓦を交互に並べます。軒先が少し反り上がる曲線が韓屋の美しさです。', '凹瓦和凸瓦交替铺成。屋檐四角微微上翘，是韩屋之美。') },
      { id: 'maru', at: [165, -134], icon: '🪵',
        name: T('Daecheong maru', '대청마루', 'テチョンマル（板の間）', '大厅地板'),
        text: T('The wooden-floored hall in the middle of the house, open to the courtyard. Cool in summer: the breeze runs through from front to back.', '집 한가운데 마당을 향해 열린 나무 마루예요. 앞뒤로 바람이 통해서 여름에 시원해요.', '家の真ん中にある、庭に開いた板張りの間。前後に風が抜けて夏は涼しい。', '房子中间朝院子敞开的木地板厅，前后通风，夏天很凉快。') },
      { id: 'ondol', at: [151, -122], icon: '🔥',
        name: T('Ondol floor heating', '온돌', 'オンドル（床暖房）', '火炕（地暖）'),
        text: T('Smoke from the kitchen fire runs through channels under the stone floor and warms the room. People sit and sleep on the warm floor.', '아궁이에서 불을 때면 연기와 열이 방바닥 아래 고래를 지나며 구들장을 데워요. 따뜻한 바닥에 앉고 잠을 자요.', 'かまどの煙と熱が床下の通り道を通って石の床を温めます。温かい床に座り、眠ります。', '灶火的烟和热经过地板下的烟道，把石板烧热。人们坐在暖和的地上，也睡在上面。') },
      { id: 'changhoji', at: [179, -122], icon: '🚪',
        name: T('Changhoji paper doors', '창호지 문', '障子紙の戸（チャンホジ）', '窗户纸门'),
        text: T('Lattice doors covered with hanji, mulberry paper. Light comes in soft, and the paper lets the room breathe.', '나무 창살에 닥나무로 만든 한지를 발라요. 빛은 부드럽게 들어오고 바람은 숨 쉬듯 통해요.', '木の格子に楮（こうぞ）の韓紙を貼った戸。光はやわらかく入り、紙が呼吸します。', '木格子上糊着用楮树做的韩纸，光线柔和，纸也能透气。') },
      { id: 'jangdok', at: [176, -110], icon: '🏺',
        name: T('Jangdokdae', '장독대', 'チャンドクテ（甕置き場）', '酱缸台'),
        text: T('A sunny stone platform for big onggi jars of soy sauce, soybean paste and chilli paste. The jars breathe, so the sauces age slowly.', '간장, 된장, 고추장을 담은 큰 옹기를 두는 볕 좋은 자리예요. 옹기가 숨을 쉬어서 장이 천천히 익어요.', '醤油、味噌、コチュジャンの大きな甕を置く日当たりのいい場所。甕が呼吸してゆっくり熟成します。', '放酱油、大酱、辣椒酱大瓮的向阳石台。瓮会呼吸，酱慢慢发酵。') },
    ],
    // The persimmon tree in the courtyard, with a magpie (까치밥).
    tree: { at: [155, -110], icon: '🐦',
      name: T('Magpie\'s share', '까치밥', 'カササギの分（カチバプ）', '喜鹊饭'),
      text: T('In autumn, families leave a few persimmons on the top branches when they pick the rest: food for the magpies and other birds through the winter.', '가을에 감을 딸 때 꼭대기에 몇 개를 남겨 둬요. 겨울을 나는 까치와 새들의 몫이에요.', '秋に柿を収穫するとき、てっぺんにいくつか残しておきます。冬を越す鳥たちの分です。', '秋天摘柿子时，会在树顶留几个，给过冬的喜鹊和小鸟吃。') },
  },
  // The Bukchon 8 Views, in their official order.
  views: [
    { n: 1, at: [298, -150], face: [1, 0],
      name: T('Changdeokgung view', '창덕궁 전경', '昌徳宮の全景', '昌德宫全景'),
      text: T('Over the wall to the roofs of Changdeokgung Palace, right next to Bukchon.', '담장 너머로 북촌 바로 옆 창덕궁의 지붕들이 보여요.', '塀の向こうに、北村のすぐ隣の昌徳宮の屋根が見えます。', '越过围墙，可以看到北村旁边昌德宫的屋顶。') },
    { n: 2, at: [272, -250], face: [1, 0],
      name: T('Wonseo-dong craft alley', '원서동 공방길', '苑西洞 工房通り', '苑西洞工坊街'),
      text: T('A quiet alley of small workshops, where craftspeople still work in hanok.', '장인들이 지금도 한옥에서 작업하는 작은 공방들이 모인 조용한 골목이에요.', '職人たちが今も韓屋で仕事をする、小さな工房が集まる静かな路地。', '小工坊聚集的安静小巷，工匠们至今仍在韩屋里工作。') },
    { n: 3, at: [112, -170], face: [1, 0],
      name: T('Gahoe-dong 11', '가회동 11번지 일대', '嘉会洞11番地一帯', '嘉会洞11号一带'),
      text: T('Rows of hanok with tiled roofs, by Bukchon-ro.', '북촌로 옆으로 기와지붕 한옥이 줄지어 있어요.', '北村路沿いに瓦屋根の韓屋が並びます。', '北村路旁一排排瓦顶韩屋。') },
    { n: 4, at: [160, -324], face: [0, 1],
      name: T('Gahoe-dong 31 hill', '가회동 31번지 언덕', '嘉会洞31番地の丘', '嘉会洞31号山坡'),
      text: T('The top of the hill, where the alleys meet.', '골목들이 만나는 언덕 꼭대기예요.', '路地が出会う丘のてっぺん。', '小巷交汇的坡顶。') },
    { n: 5, at: [134, -296], face: [0, -1],
      name: T('Gahoe-dong alley (uphill)', '가회동 골목길 (오르막)', '嘉会洞の路地（上り坂）', '嘉会洞小巷（上坡）'),
      text: T('Looking up the narrow alley, hanok walls on both sides.', '양쪽에 한옥 담장이 이어지는 좁은 골목을 올려다봐요.', '両側に韓屋の塀が続く細い路地を見上げます。', '抬头看两边都是韩屋围墙的窄巷。') },
    { n: 6, at: [184, -232], face: [0, 1],
      name: T('Gahoe-dong alley (downhill)', '가회동 골목길 (내리막)', '嘉会洞の路地（下り坂）', '嘉会洞小巷（下坡）'),
      text: T('Down the alley, the roofs step down towards the city.', '골목 아래로 기와지붕들이 도시 쪽으로 층층이 내려가요.', '路地の下へ、屋根が街に向かって段々に下ります。', '顺着小巷往下，屋顶一层层向城市延伸。') },
    { n: 7, at: [160, -342], face: [0, 1],
      name: T('Gahoe-dong 31 rooftops', '가회동 31번지', '嘉会洞31番地', '嘉会洞31号'),
      text: T('A sea of tiled roofs, with the city and Namsan beyond.', '기와지붕의 바다, 그 너머로 도시와 남산이 보여요.', '瓦屋根の海、その向こうに街と南山。', '瓦顶的海洋，远处是城市和南山。') },
    { n: 8, at: [-40, -188], face: [-1, 0],
      name: T('Samcheong-dong stone stairs', '삼청동 돌계단길', '三清洞 石段の道', '三清洞石阶路'),
      text: T('Stairs cut from one big rock, down to Samcheong-dong.', '큰 바위 하나를 깎아 만든 계단이 삼청동으로 이어져요.', '大きな岩ひとつを削った石段が三清洞へ続きます。', '用一整块大石凿成的台阶，通往三清洞。') },
  ],
};

export const VIEW_REWARD = 5; // coins for each new view
export const ALL_VIEWS_REWARD = 60; // and for all eight

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
    this.seen = new Set((Array.isArray(s) ? s : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 8));
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
export const EXPLORER_REWARD = 20;

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
