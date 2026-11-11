// Bukchon's panel (data/bukchon.js):
//   card(item, extra):  a short card about a place (the photo spot, a part of
//                       the Open House, the magpie's persimmons, the welcome)
//   views(book):        the photo spots: which ones you have
//   craft(kind):        the workshops (Maeum Knot Studio, Saekji Paper
//                       Studio, and Gahoe Silver Studio):
//                       pick a colour and a pattern, pay, take it home
import { L, fmt } from './pocha-ui.js';
import { BUKCHON, VIEW_REWARD, ALL_VIEWS_REWARD } from '../data/bukchon.js';
import { PENDANT_CHARMS } from '../data/appearance.js';

export const BK_TEXT = {
  photo: { en: 'Take a photo · {name}', ko: '사진 찍기 · {name}', ja: '写真を撮る · {name}', zh: '拍照 · {name}' },
  views: { en: 'Bukchon photo spot', ko: '북촌 포토스팟', ja: '北村のフォトスポット', zh: '北村拍照点' },
  viewsHow: { en: 'Climb the alley to the top of the hill and stand on the footprint mark: the famous view down Bukchon-ro 11-gil. 🪙 {a} for your first photo there.', ko: '골목을 따라 언덕 꼭대기까지 올라가 발자국 표시에 서 보세요. 북촌로11길을 내려다보는 그 유명한 장면이에요. 처음 찍으면 🪙 {a}를 받아요.', ja: '路地を丘のてっぺんまで登り、足あとマークに立とう。北村路11ギルを見下ろすあの有名な景色。初めて撮ると🪙 {a}。', zh: '沿着小巷爬到坡顶，站在脚印标记上：就是俯瞰北村路11街的那个有名景色。第一次拍照得 🪙 {a}。' },
  got: { en: '📸 {name} (+🪙 {c})', ko: '📸 {name} (+🪙 {c})', ja: '📸 {name}（+🪙 {c}）', zh: '📸 {name}（+🪙 {c}）' },
  again: { en: '📸 Another nice shot.', ko: '📸 한 장 더 찍었어요.', ja: '📸 もう一枚。', zh: '📸 又拍了一张。' },
  allDone: { en: '🎉 Every Bukchon photo spot!', ko: '🎉 북촌 포토스팟을 다 찍었어요!', ja: '🎉 北村のフォトスポット制覇！', zh: '🎉 北村拍照点全部拍完！' },
  ledger: { en: 'Bukchon photo spot', ko: '북촌 포토스팟 사진', ja: '北村フォトスポットの写真', zh: '北村拍照点照片' },
  count: { en: '{n} / {all} taken', ko: '{n} / {all} 찍음', ja: '{n} / {all} 撮影', zh: '已拍 {n} / {all}' },
  explorer: { en: '🏯 Hanok Explorer: you know all five parts of a hanok! (+🪙 {c})', ko: '🏯 한옥 탐험가: 한옥의 다섯 부분을 다 알게 됐어요! (+🪙 {c})', ja: '🏯 韓屋探検家：韓屋の5つの部分をすべて知りました！（+🪙 {c}）', zh: '🏯 韩屋探险家：认识了韩屋的全部五个部分！（+🪙 {c}）' },
  explorerLedger: { en: 'Hanok Explorer', ko: '한옥 탐험가', ja: '韓屋探検家', zh: '韩屋探险家' },
  quiet: { en: '🤫 Quiet Zone: people live in these hanok. Walking only.', ko: '🤫 조용한 골목: 주민이 사는 한옥이에요. 걸어서만 다닐 수 있어요.', ja: '🤫 静かな路地：人が暮らす韓屋です。歩いてのみ通れます。', zh: '🤫 安静小巷：这里住着居民，只能步行。' },
  noRide: { en: '🚲 Rides stay outside the Quiet Zone. Walk in and enjoy the alleys.', ko: '🚲 탈것은 조용한 골목 밖에 두고 걸어서 구경해요.', ja: '🚲 乗り物は静かな路地の外に置いて、歩いて楽しもう。', zh: '🚲 交通工具请停在安静小巷外，步行游览吧。' },
  shh: { en: 'Shh! 🤫 No running in the alleys, please.', ko: '쉿! 🤫 골목에서는 뛰지 말아 주세요.', ja: 'しーっ！🤫 路地では走らないでね。', zh: '嘘！🤫 小巷里请不要奔跑。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  real: { en: 'Real Bukchon: people live here. In the Bukchon-ro 11-gil area, visitors are welcome 10:00 to 17:00 (since Nov 2024; fines from Mar 2025). Check before you go.', ko: '실제 북촌은 주민이 사는 동네예요. 북촌로11길 일대는 관광객 방문 시간이 오전 10시~오후 5시예요(2024년 11월부터, 2025년 3월부터 과태료). 가기 전에 확인하세요.', ja: '実際の北村は人が暮らす町です。北村路11ギル一帯の観光客の訪問時間は10時〜17時（2024年11月から、2025年3月から過料）。行く前に確認を。', zh: '真实的北村是居民生活的街区。北村路11街一带游客参观时间为10:00至17:00（2024年11月起，2025年3月起罚款）。出发前请确认。' },
  // workshops
  knot: { en: 'Tie a maedeup knot charm', ko: '매듭 노리개 만들기', ja: 'メドゥプのお守りを結ぶ', zh: '编一个韩式绳结挂饰' },
  hanji: { en: 'Make a hanji lantern', ko: '한지 등 만들기', ja: '韓紙の灯りを作る', zh: '做一盏韩纸灯' },
  knotHow: { en: 'Maedeup is Korean decorative knotting: one silk cord tied into a symmetrical knot, finished with a tassel. Pick the cord colour and the knot.', ko: '매듭은 비단 끈 한 가닥을 좌우 대칭으로 엮고 술을 다는 우리 전통 공예예요. 끈 색과 매듭 모양을 골라요.', ja: 'メドゥプは一本の絹紐を左右対称に結び、房をつける韓国の伝統工芸。紐の色と結び方を選んで。', zh: '韩式绳结是用一根丝绳编成左右对称的结，再系上流苏的传统工艺。选绳子颜色和结的样式。' },
  hanjiHow: { en: 'Hanji is paper made from mulberry bark: strong, soft and see-through when lit. Pick the paper colour and the pattern cut into it.', ko: '한지는 닥나무 껍질로 만든 종이예요. 질기고 부드러우며 불을 켜면 은은하게 비쳐요. 종이 색과 무늬를 골라요.', ja: '韓紙は楮の皮から作る紙。丈夫でやわらかく、灯すとほのかに透けます。紙の色と模様を選んで。', zh: '韩纸用楮树皮制成，结实柔软，点灯后透出柔光。选纸的颜色和花纹。' },
  pickColor: { en: 'Colour', ko: '색', ja: '色', zh: '颜色' },
  pickShape: { en: 'Pattern', ko: '모양', ja: '模様', zh: '样式' },
  master: { en: 'Craftsman', ko: '장인', ja: '職人', zh: '工匠' },
  make: { en: 'Make it · 🪙 {n}', ko: '만들기 · 🪙 {n}', ja: '作る · 🪙 {n}', zh: '制作 · 🪙 {n}' },
  have: { en: 'You have 🪙 {n}', ko: '보유 🪙 {n}', ja: '所持 🪙 {n}', zh: '持有 🪙 {n}' },
  poor: { en: 'Not enough money: it costs 🪙 {n}.', ko: '돈이 부족해요. 🪙 {n}이 필요해요.', ja: 'お金が足りません。🪙 {n} 必要です。', zh: '钱不够，需要 🪙 {n}。' },
  made: { en: '{icon} You made a {name}! It is in your bag.', ko: '{icon} {name} 완성! 가방에 넣었어요.', ja: '{icon} {name}が完成！かばんに入れました。', zh: '{icon} 做好了{name}！已放进包里。' },
  bagFull: { en: 'Your bag is full.', ko: '가방이 가득 찼어요.', ja: 'かばんがいっぱいです。', zh: '包满了。' },
  // Gahoe Silver Studio (Bukchon): the necklace is a wearable accessory.
  pendant: { en: 'Make a necklace', ko: '목걸이 만들기', ja: 'ネックレスを作る', zh: '做一条项链' },
  pendantHow: { en: 'Seoul\'s jewellery quarter is just south, round Jongno 3-ga, and here in Bukchon you can make your own piece. Pick the metal, then a charm or a Korean word to engrave (its hanja goes under it); the craftsman saws, files and polishes it with you.', ko: '서울의 귀금속 골목은 바로 남쪽 종로3가 일대예요. 여기 북촌 공방에서는 직접 장신구를 만들 수 있어요. 금속을 고르고, 모양이나 새길 글자를 고르면 장인이 함께 자르고 다듬고 광을 내 줘요.', ja: 'ソウルの貴金属街はすぐ南の鍾路3街一帯。ここ北村の工房では自分でアクセサリーを作れます。金属を選んで、モチーフか刻む言葉（ハングルと漢字）を選ぶと、職人が一緒に切って削って磨いてくれます。', zh: '首尔的首饰街就在南边的钟路3街一带，在北村这家工坊可以亲手做饰品。选好金属，再选造型或要刻的字（韩文和汉字），工匠会陪你一起切割、打磨、抛光。' },
  pickMetal: { en: 'Metal', ko: '금속', ja: '金属', zh: '金属' },
  pickCharm: { en: 'Charm', ko: '모양', ja: 'モチーフ', zh: '造型' },
  madeWear: { en: '{icon} You made a {name}! Wear it from your items.', ko: '{icon} {name} 완성! 내 아이템에서 착용할 수 있어요.', ja: '{icon} {name}が完成！アイテムから身につけられます。', zh: '{icon} 做好了{name}！可以在物品里戴上。' },
  haveIt: { en: 'You already have this one: pick another metal or charm.', ko: '이미 가지고 있어요. 다른 금속이나 모양을 골라 보세요.', ja: 'もう持っています。別の金属かモチーフを選んで。', zh: '你已经有这个了，换一种金属或造型吧。' },
};

// Workshop choices. Names are in English for the bag (like other goods).
export const CRAFT = {
  knot: {
    icon: '🎀', price: 8000,
    colors: [['#c8323f', 'red', '다홍'], ['#2f6b4f', 'green', '초록'], ['#2d4f8a', 'blue', '쪽빛'], ['#e3b23c', 'yellow', '노랑'], ['#8b5aa8', 'purple', '보라']],
    shapes: [['butterfly', '나비매듭', { en: 'Butterfly', ko: '나비', ja: '蝶', zh: '蝴蝶' }], ['chrysanthemum', '국화매듭', { en: 'Chrysanthemum', ko: '국화', ja: '菊', zh: '菊花' }], ['double-coin', '도래매듭', { en: 'Double coin', ko: '도래', ja: '二つ輪', zh: '双钱' }]],
    item: (c, s) => `${c} ${s} knot charm`,
  },
  hanji: {
    icon: '🏮', price: 10000,
    colors: [['#f6efe0', 'white', '흰'], ['#f2b8c6', 'pink', '분홍'], ['#a9c9e8', 'sky', '하늘'], ['#f0d27a', 'yellow', '노랑'], ['#9fd0a8', 'green', '연두']],
    shapes: [['plum', '매화', { en: 'Plum blossom', ko: '매화', ja: '梅', zh: '梅花' }], ['butterfly', '나비', { en: 'Butterflies', ko: '나비', ja: '蝶', zh: '蝴蝶' }], ['cloud', '구름', { en: 'Clouds', ko: '구름', ja: '雲', zh: '云纹' }]],
    item: (c, s) => `${c} hanji lantern (${s})`,
  },
  // Gahoe Silver Studio: what you make is worn (an accessory item,
  // data/wearables.js acc-pendant-<metal>-<charm>), not put in the bag.
  pendant: {
    icon: '📿', price: 25000, labels: ['pickMetal', 'pickCharm'],
    colors: [['#d9dde2', 'silver', '은'], ['#e8b84a', 'gold', '금']],
    shapes: Object.entries(PENDANT_CHARMS).filter(([, c]) => !c.retired).map(([id, c]) => [id, c.name.ko, c.name, c.hanja ? [c.letter, c.hanja] : [c.emoji, c.name.ko]]),
    grid: true, // 5 shapes and 20 words: a 5 × 5 grid of tiles, the Hangul large: a grid of tiles, the Hangul large
    wear: (c, s) => `acc-pendant-${c}-${s}`,
  },
};
// The item a wearable craft makes (null for bag crafts).
export function craftWear(kind, ci, si) {
  const k = CRAFT[kind];
  const c = k?.colors[ci], s = k?.shapes[si];
  return k?.wear && c && s ? k.wear(c[1], s[0]) : null;
}
// The bag entry for a made piece (kind 'gift', like a shop bag).
export function craftEntry(kind, ci, si) {
  const k = CRAFT[kind];
  const c = k?.colors[ci], s = k?.shapes[si];
  if (!c || !s || !k.item) return null;
  return { kind: 'gift', sips: 1, name: k.item(c[1], s[0].replace('-', ' ')).slice(0, 40), icon: k.icon };
}

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class BukchonUI {
  // onMake(kind, ci, si) -> true when paid and made
  constructor({ root, wallet, onMake }) {
    Object.assign(this, { root, wallet, onMake });
    this.view = null;
    this.ci = 0;
    this.si = 0;
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; this.view = null; }
  _head(icon, text) {
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    return [x, el('strong', 'wallet-title', icon + ' ' + text)];
  }
  _ok() {
    const ok = el('button', 'primary', L(BK_TEXT.close));
    ok.type = 'button';
    ok.onclick = () => this.close();
    return ok;
  }
  card(item, { sub = '', note = '' } = {}) {
    this.view = 'card';
    const parts = this._head(item.icon || (item.n ? '📸' : 'ℹ️'), item.n ? `${item.n}. ${L(item.name)}` : L(item.name));
    if (sub) parts.push(el('b', 'lock-sub', sub));
    parts.push(el('p', 'wish-mural', L(item.text)));
    if (note) parts.push(el('small', 'fine', note));
    parts.push(this._ok());
    this.root.replaceChildren(...parts);
    this.root.hidden = false;
  }
  views(book, just = 0) {
    this.view = 'views';
    const parts = this._head('📸', L(BK_TEXT.views));
    parts.push(el('p', 'fine', fmt(L(BK_TEXT.viewsHow), { a: VIEW_REWARD + ALL_VIEWS_REWARD })));
    const list = el('div', 'wish-list');
    for (const v of BUKCHON.views) {
      const b = el('div', 'wish-item' + (book.has(v.n) ? ' on' : ''), `${book.has(v.n) ? '✅' : '⬜'} ${v.n}. ${L(v.name)}`);
      if (v.n === just) b.append(el('small', 'fine', ' ' + L(v.text)));
      list.append(b);
    }
    parts.push(list);
    parts.push(el('b', 'lock-sub', book.done ? L(BK_TEXT.allDone) : fmt(L(BK_TEXT.count), { n: book.count, all: BUKCHON.views.length })));
    parts.push(this._ok());
    this.root.replaceChildren(...parts);
    this.root.hidden = false;
  }
  craft(kind) {
    this.view = 'craft:' + kind;
    this.kind = kind;
    this.render();
    this.root.hidden = false;
  }
  render() {
    if (!this.view?.startsWith('craft:')) return;
    const k = CRAFT[this.kind];
    const parts = this._head(k.icon, L(BK_TEXT[this.kind]));
    parts.push(el('p', 'fine', L(BK_TEXT[this.kind + 'How'])));
    parts.push(el('b', 'lock-sub', L(BK_TEXT[k.labels?.[0] || 'pickColor'])));
    const colors = el('div', 'wish-colors');
    colors.setAttribute('role', 'radiogroup');
    k.colors.forEach(([c, en], i) => {
      const b = el('button', 'wish-color' + (i === this.ci ? ' on' : ''));
      b.type = 'button';
      b.style.setProperty('--c', c);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.ci));
      b.setAttribute('aria-label', en);
      b.onclick = () => { this.ci = i; this.render(); };
      colors.append(b);
    });
    parts.push(colors);
    parts.push(el('b', 'lock-sub', L(BK_TEXT[k.labels?.[1] || 'pickShape'])));
    const list = el('div', 'wish-list' + (k.grid ? ' wish-grid' : ''));
    list.setAttribute('role', 'radiogroup');
    k.shapes.forEach(([, , name, tile], i) => {
      const b = el('button', 'wish-item' + (i === this.si ? ' on' : ''), k.grid ? '' : L(name));
      if (k.grid) {
        b.append(el('span', 'wish-big', tile[0]), el('small', '', tile[1]));
        b.setAttribute('aria-label', L(name));
        b.title = L(name);
      }
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.si));
      b.onclick = () => { this.si = i; this.render(); };
      list.append(b);
    });
    parts.push(list);
    // The pick and the Make button stay pinned to the bottom: on a phone the
    // 25-tile necklace grid is taller than the screen, and the button below it
    // was easy to miss.
    const foot = el('div', 'wish-foot');
    if (k.grid) foot.append(el('p', 'wish-pick', L(k.shapes[this.si][2])));
    const poor = this.wallet.coins < k.price;
    foot.append(el('small', 'fine', fmt(L(BK_TEXT.have), { n: this.wallet.coins })));
    if (poor) foot.append(el('p', 'lock-warn', fmt(L(BK_TEXT.poor), { n: k.price })));
    const go = el('button', 'primary', fmt(L(BK_TEXT.make), { n: k.price }));
    go.type = 'button';
    go.disabled = poor;
    go.onclick = () => { if (this.onMake?.(this.kind, this.ci, this.si)) this.close(); else this.render(); };
    foot.append(go);
    parts.push(foot);
    const top = this.root.scrollTop;
    this.root.replaceChildren(...parts);
    this.root.scrollTop = top; // (picking a tile re-renders: stay where you were)
  }
}
