// Bukchon Hanok Village: places in the district's own metres (x east, z south,
// (0, 0) at Anguk Station's anchor in region.json). The game adds the district
// offset from region.json, so this file never changes when Bukchon moves.
//
// Bukchon on its real streets at 1/4 (scripts/build-bukchon.mjs, from
// OpenStreetMap), on its real hill (ground(): the real height at 1/4, flat at
// the foot by Anguk Station where the shops are).
// - views: photo spots, four of the city's Bukchon 8 Views on their real
//   places (OpenStreetMap marks them).
// - quiet: the Quiet Zone, the Gahoe-dong alleys round Bukchon-ro 11-gil
//   (the real special management zone). Walking only (no running, no riding).
// - openHouse: a hanok you can walk into, with five parts to learn.
// - welcome, signs: what Bukchon is, and how to visit (people live here).
//
// Real facts here were checked on 2026-11-07:
// - the Bukchon 8 Views: Seoul Metropolitan Government (mediahub.seoul.go.kr)
// - the Bukchon special management zone ("red zone", around Bukchon-ro
//   11-gil): visitors 10:00-17:00 since 1 Nov 2024, fines (100,000 won)
//   from 1 Mar 2025 (Seoul Metropolitan Government, Jongno-gu).
import { GROUND } from './bukchon-ground.js';

const T = (en, ko, ja, zh) => ({ en, ko, ja, zh });
// The Open House's spots, given at full size round its middle (the compound
// is drawn at OH.sc of its full 40 x 36 m: core/bukchon-models.js openhouse).
const OH = { x: 12.6, z: -50.5, sc: 0.43 };
const ohAt = (dx, dz) => [Math.round((OH.x + dx * OH.sc) * 100) / 100, Math.round((OH.z + dz * OH.sc) * 100) / 100];

export const BUKCHON = {
  district: 'bukchon',
  // Bukchon's ground (district metres): x0, z0 (the south edge, by Yulgok-ro),
  // x1, z1 (the north edge, the top of Bukchon-ro). The welcome card shows the
  // first time you walk in.
  area: [-92, 6, 95, -240],
  // A sign at the foot of Bukchon-ro (sign: where it stands, ry: the way it
  // reads), and a card when you walk in. What Bukchon is, and how to visit it: real
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
    { at: [4, -2], ry: 0 }, // at the foot of Bukchon-ro, by Anguk Station's exit 2
  ],
  // Where the villagers in hanbok stroll (two around each spot).
  villagers: [[-12, -60], [-40, -170], [26, -120], [-11, -150]],
  // The Quiet Zone (polygon): the alleys of Gahoe-dong round Bukchon-ro 11-gil.
  quiet: [[-20, -128], [-6, -136], [-6, -222], [-80, -222], [-80, -140]],
  // Open House compound [x0, z0 (south), x1, z1 (north)] and its gate, on
  // the real Bukchon Culture Center's spot (Gyedong-gil, below Jaedong
  // Elementary School), the gate on Bukchon-ro 2-gil. sc: drawn at 43% of
  // the full 40 x 36 m (the real block at 1/4 is small).
  openHouse: {
    box: [OH.x - 20 * OH.sc, OH.z + 18 * OH.sc, OH.x + 20 * OH.sc, OH.z - 18 * OH.sc],
    gate: [OH.x, OH.z + 18 * OH.sc],
    sc: OH.sc,
    // Five parts of a hanok: walk up to the glowing spot to read about it.
    parts: [
      { id: 'giwa', at: ohAt(0, 14), icon: '🏯',
        name: T('Giwa roof tiles', '기와', '瓦（キワ）', '瓦片'),
        text: T('Curved clay tiles in two kinds, concave and convex, laid in rows. The roof\'s ends lift a little at the corners, like the tips of a smile.', '오목한 암키와와 볼록한 수키와를 번갈아 얹어요. 지붕 끝이 살짝 들려 올라간 곡선이 한옥의 멋이에요.', '凹型と凸型の瓦を交互に並べます。軒先が少し反り上がる曲線が韓屋の美しさです。', '凹瓦和凸瓦交替铺成。屋檐四角微微上翘，是韩屋之美。') },
      { id: 'maru', at: ohAt(0, -3), icon: '🪵',
        name: T('Daecheong maru', '대청마루', 'テチョンマル（板の間）', '大厅地板'),
        text: T('The wooden-floored hall in the middle of the house, open to the courtyard. Cool in summer: the breeze runs through from front to back.', '집 한가운데 마당을 향해 열린 나무 마루예요. 앞뒤로 바람이 통해서 여름에 시원해요.', '家の真ん中にある、庭に開いた板張りの間。前後に風が抜けて夏は涼しい。', '房子中间朝院子敞开的木地板厅，前后通风，夏天很凉快。') },
      { id: 'ondol', at: ohAt(-8, 2), icon: '🔥',
        name: T('Ondol floor heating', '온돌', 'オンドル（床暖房）', '火炕（地暖）'),
        text: T('Smoke from the kitchen fire runs through channels under the stone floor and warms the room. People sit and sleep on the warm floor.', '아궁이에서 불을 때면 연기와 열이 방바닥 아래 고래를 지나며 구들장을 데워요. 따뜻한 바닥에 앉고 잠을 자요.', 'かまどの煙と熱が床下の通り道を通って石の床を温めます。温かい床に座り、眠ります。', '灶火的烟和热经过地板下的烟道，把石板烧热。人们坐在暖和的地上，也睡在上面。') },
      { id: 'changhoji', at: ohAt(8, 2), icon: '🚪',
        name: T('Changhoji paper doors', '창호지 문', '障子紙の戸（チャンホジ）', '窗户纸门'),
        text: T('Lattice doors covered with hanji, mulberry paper. Light comes in soft, and the paper lets the room breathe.', '나무 창살에 닥나무로 만든 한지를 발라요. 빛은 부드럽게 들어오고 바람은 숨 쉬듯 통해요.', '木の格子に楮（こうぞ）の韓紙を貼った戸。光はやわらかく入り、紙が呼吸します。', '木格子上糊着用楮树做的韩纸，光线柔和，纸也能透气。') },
      { id: 'jangdok', at: ohAt(6, 13.5), icon: '🏺',
        name: T('Jangdokdae', '장독대', 'チャンドクテ（甕置き場）', '酱缸台'),
        text: T('A sunny stone platform for big onggi jars of soy sauce, soybean paste and chilli paste. The jars breathe, so the sauces age slowly.', '간장, 된장, 고추장을 담은 큰 옹기를 두는 볕 좋은 자리예요. 옹기가 숨을 쉬어서 장이 천천히 익어요.', '醤油、味噌、コチュジャンの大きな甕を置く日当たりのいい場所。甕が呼吸してゆっくり熟成します。', '放酱油、大酱、辣椒酱大瓮的向阳石台。瓮会呼吸，酱慢慢发酵。') },
    ],
    // The persimmon tree in the courtyard, with a magpie (까치밥).
    tree: { at: ohAt(-7, 13), icon: '🐦',
      name: T('Magpie\'s share', '까치밥', 'カササギの分（カチバプ）', '喜鹊饭'),
      text: T('In autumn, families leave a few persimmons on the top branches when they pick the rest: food for the magpies and other birds through the winter.', '가을에 감을 딸 때 꼭대기에 몇 개를 남겨 둬요. 겨울을 나는 까치와 새들의 몫이에요.', '秋に柿を収穫するとき、てっぺんにいくつか残しておきます。冬を越す鳥たちの分です。', '秋天摘柿子时，会在树顶留几个，给过冬的喜鹊和小鸟吃。') },
  },
  // Photo spots: four of the city's Bukchon 8 Views, on their real places
  // (OpenStreetMap). n: 10 + the view's number (an old save's 1 counts for none).
  // face: the way the picture looks.
  views: [
    { n: 11, at: [62.4, -73.6], face: [1, 0],
      name: T('View 1: Changdeokgung', '북촌1경 창덕궁 전경', '北村1景 昌徳宮の眺め', '北村1景 昌德宫全景'),
      text: T('The first of the Bukchon 8 Views: over the wall, the roofs of Changdeokgung Palace and the hills behind them.', '북촌 8경의 첫 번째예요. 담 너머로 창덕궁 지붕들과 그 뒤의 산이 보여요.', '北村八景の一つ目。塀の向こうに昌徳宮の屋根と、その奥の山が見えます。', '北村八景之一：越过院墙，可以看到昌德宫的屋顶和后面的山。') },
    { n: 13, at: [3.2, -168.5], face: [0, 1],
      name: T('View 3: Gahoe-dong museum alley', '북촌3경 가회동 박물관길', '北村3景 嘉会洞博物館通り', '北村3景 嘉会洞博物馆街'),
      text: T('A lane of small museums and workshops in hanok, between Bukchon-ro and Gyedong-gil.', '북촌로와 계동길 사이, 한옥 안에 작은 박물관과 공방이 모인 골목이에요.', '北村路と桂洞キルの間、韓屋の小さな博物館や工房が集まる路地です。', '北村路和桂洞街之间，韩屋里聚集着小博物馆和工坊的小巷。') },
    { n: 15, at: [-41.7, -164], face: [0.5, 0.866],
      name: T('View 5: Gahoe-dong alley, downhill', '북촌5경 가회동 골목길(내림)', '北村5景 嘉会洞の路地（下り）', '北村5景 嘉会洞小巷（下坡）'),
      text: T('The famous view of Bukchon: the narrow alley stepping down between tiled roofs, and the towers of the city beyond.', '북촌에서 가장 유명한 장면이에요. 기와지붕 사이로 좁은 골목이 층층이 내려가고, 그 너머로 도시의 빌딩이 보여요.', '北村でいちばん有名な景色。瓦屋根の間を細い路地が段々に下り、その先に街のビルが見えます。', '北村最有名的景色：窄窄的小巷在瓦顶之间层层而下，远处是城市的高楼。') },
    { n: 18, at: [-73.1, -214.4], face: [0, 1],
      name: T('View 8: Samcheong-dong stone steps', '북촌8경 삼청동 돌계단길', '北村8景 三清洞の石段', '北村8景 三清洞石阶路'),
      text: T('The last of the 8 Views: old stone steps cut into the rock, climbing between the houses to Samcheong-dong.', '북촌 8경의 마지막이에요. 바위를 깎아 만든 오래된 돌계단이 집들 사이로 삼청동까지 이어져요.', '北村八景の最後。岩を削った古い石段が家々の間を三清洞へ上っていきます。', '北村八景的最后一景：在岩石上凿出的老石阶，在房屋之间一直通到三清洞。') },
  ],
};

export const VIEW_REWARD = 20000; // coins for each new photo spot
export const ALL_VIEWS_REWARD = 40000; // and for having them all

// Height of the ground at district (x, z): the real hill at 1/4 (GROUND,
// written by scripts/build-bukchon.mjs), 0 outside Bukchon.
export function ground(x, z) {
  const { x0, z0, step, nx, nz, h } = GROUND;
  const fx = (x - x0) / step, fz = (z - z0) / step;
  if (!(fx >= 0 && fz >= 0 && fx <= nx - 1 && fz <= nz - 1)) return 0;
  const i = Math.min(nx - 2, Math.floor(fx)), j = Math.min(nz - 2, Math.floor(fz)), u = fx - i, v = fz - j, a = (ii, jj) => h[jj * nx + ii];
  return ((a(i, j) * (1 - u) + a(i + 1, j) * u) * (1 - v) + (a(i, j + 1) * (1 - u) + a(i + 1, j + 1) * u) * v) / 10;
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
