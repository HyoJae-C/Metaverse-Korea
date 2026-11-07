// Cheonggyecheon's lantern festival panel (core/lanterns.js):
//   show('wish'):  pick a colour and a wish, pay and float a wish lantern.
//   show('mural'): a few lines about King Jeongjo's royal procession, and the painting's credit.
// Wishes come from a fixed list, so they show in each player's language and
// need no moderation.
import { L, fmt } from './pocha-ui.js';
import { WISH, WISHES, WISH_COLORS } from '../core/lanterns.js';

export const WISH_TEXT = {
  float: { en: 'Float a wish lantern', ko: '소원등 띄우기', ja: '願いの灯籠を流す', zh: '放许愿灯' },
  pickColor: { en: 'Pick a colour', ko: '색 고르기', ja: '色を選ぶ', zh: '选颜色' },
  pickWish: { en: 'Pick your wish', ko: '소원 고르기', ja: '願いを選ぶ', zh: '选心愿' },
  go: { en: 'Pay 🪙 {n} and float it', ko: '🪙 {n} 내고 띄우기', ja: '🪙 {n} 払って流す', zh: '支付 🪙 {n} 放灯' },
  have: { en: 'You have 🪙 {n}', ko: '보유 🪙 {n}', ja: '所持 🪙 {n}', zh: '持有 🪙 {n}' },
  poor: { en: 'Not enough coins: a lantern costs 🪙 {n}.', ko: '코인이 부족해요. 소원등은 🪙 {n}이에요.', ja: 'コインが足りません。灯籠は 🪙 {n} です。', zh: '金币不够，一盏灯要 🪙 {n}。' },
  how: { en: 'It floats down to the end of the stream and joins the other lanterns. Everyone nearby sees it, with your wish in their own language.', ko: '물길을 따라 끝까지 흘러가 다른 소원등들과 모여요. 근처 사람들에게도 보이고, 소원은 각자의 언어로 보여요.', ja: '流れに乗って川の端まで行き、ほかの灯籠と集まります。近くの人にも見えて、願いはそれぞれの言語で表示されます。', zh: '它会顺流漂到尽头，和其他许愿灯聚在一起。附近的人都能看到，心愿会显示成他们自己的语言。' },
  done: { en: '🏮 Your lantern is on its way!', ko: '🏮 소원등이 떠내려가요!', ja: '🏮 灯籠が流れていきます！', zh: '🏮 许愿灯漂走啦！' },
  wait: { en: 'Wait a moment before floating another one.', ko: '잠깐 뒤에 하나 더 띄울 수 있어요.', ja: '少し待ってからもう一つ流せます。', zh: '稍等一下才能再放一盏。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  mural: { en: 'About the mural', ko: '벽화 이야기', ja: '壁画について', zh: '关于壁画' },
  muralTitle: { en: "King Jeongjo's royal procession", ko: '정조대왕 화성행차', ja: '正祖大王の華城行幸', zh: '正祖大王华城行幸' },
  muralText: {
    en: "In 1795 King Jeongjo of Joseon travelled from Seoul to Hwaseong in Suwon with his mother, Lady Hyegyeong, for her 60th birthday and to visit his father's tomb. Court painters recorded the long procession of guards, officials, musicians, horses and palanquins in a painting called a banchado. On the real Cheonggyecheon a long wall of painted tiles shows it. The panels on this wall are parts of the real painting.",
    ko: '1795년 조선의 정조대왕은 어머니 혜경궁 홍씨의 회갑을 맞아, 아버지의 묘소가 있는 수원 화성까지 어머니와 함께 행차했어요. 호위 군사와 관리, 악대, 말과 가마가 이어진 긴 행렬을 궁중 화원들이 반차도로 그려 남겼어요. 실제 청계천에는 이 행렬을 담은 긴 타일 벽화가 있어요. 이 벽의 그림은 실제 반차도의 일부예요.',
    ja: '1795年、朝鮮の正祖大王は母・恵慶宮の還暦を祝い、父の墓がある水原の華城まで母と共に行幸しました。護衛の兵士や官僚、楽隊、馬や輿が続く長い行列を、宮廷画家が班次図に描き残しました。本物の清渓川にはこの行列を描いた長いタイル壁画があります。この壁の絵は本物の班次図の一部です。',
    zh: '1795年，朝鲜正祖大王为庆祝母亲惠庆宫的六十大寿，陪母亲前往父亲陵墓所在的水原华城。宫廷画师把由护卫、官员、乐队、马匹和轿子组成的长长队伍画成了班次图。真实的清溪川上有一面描绘这支队伍的长瓷砖壁画。这面墙上的画是真实班次图的一部分。',
  },
  // The painting's credit (KOGL Type 1 asks for the source, and not to suggest the museum endorses the game).
  muralCredit: {
    en: 'Image: "King Jeongjo\'s Procession to Hwaseong" (Deoksu 2507), National Museum of Korea, KOGL Type 1. Not linked to or endorsed by the museum.',
    ko: '그림: 「정조의 화성행차」(덕수 2507), 국립중앙박물관, 공공누리 제1유형. 게임은 박물관과 관계없어요.',
    ja: '画像:「正祖の華城行幸」(徳寿2507)、国立中央博物館、公共ヌリ第1類型。博物館とは関係ありません。',
    zh: '图片：《正祖的华城行幸》（德寿2507），国立中央博物馆，公共努里第1类。与博物馆无关。',
  },
};

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class WishUI {
  // onFloat(c, w) -> true when paid and floated
  constructor({ root, wallet, onFloat }) {
    Object.assign(this, { root, wallet, onFloat });
    this.c = 0;
    this.w = 0;
    this.view = 'wish';
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show(view = 'wish') {
    this.view = view;
    this.root.hidden = false;
    this.render();
  }
  _head(icon, text) {
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    return [x, el('strong', 'wallet-title', icon + ' ' + text)];
  }
  render() {
    const parts = this.view === 'mural' ? this._mural() : this._wish();
    this.root.replaceChildren(...parts);
  }
  _mural() {
    const parts = this._head('📜', L(WISH_TEXT.muralTitle));
    parts.push(el('p', 'wish-mural', L(WISH_TEXT.muralText)));
    parts.push(el('small', 'fine', L(WISH_TEXT.muralCredit)));
    const ok = el('button', 'primary', L(WISH_TEXT.close));
    ok.type = 'button';
    ok.onclick = () => this.close();
    parts.push(ok);
    return parts;
  }
  _wish() {
    const parts = this._head('🏮', L(WISH_TEXT.float));
    parts.push(el('p', 'fine', L(WISH_TEXT.how)));
    parts.push(el('b', 'lock-sub', L(WISH_TEXT.pickColor)));
    const colors = el('div', 'wish-colors');
    colors.setAttribute('role', 'radiogroup');
    WISH_COLORS.forEach((c, i) => {
      const b = el('button', 'wish-color' + (i === this.c ? ' on' : ''));
      b.type = 'button';
      b.style.setProperty('--c', c);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.c));
      b.setAttribute('aria-label', c);
      b.onclick = () => { this.c = i; this.render(); };
      colors.append(b);
    });
    parts.push(colors);
    parts.push(el('b', 'lock-sub', L(WISH_TEXT.pickWish)));
    const list = el('div', 'wish-list');
    list.setAttribute('role', 'radiogroup');
    WISHES.forEach((w, i) => {
      const b = el('button', 'wish-item' + (i === this.w ? ' on' : ''), L(w));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.w));
      b.onclick = () => { this.w = i; this.render(); };
      list.append(b);
    });
    parts.push(list);
    const poor = this.wallet.coins < WISH.price;
    parts.push(el('small', 'fine', fmt(L(WISH_TEXT.have), { n: this.wallet.coins })));
    if (poor) parts.push(el('p', 'lock-warn', fmt(L(WISH_TEXT.poor), { n: WISH.price })));
    const go = el('button', 'primary', fmt(L(WISH_TEXT.go), { n: WISH.price }));
    go.type = 'button';
    go.disabled = poor;
    go.onclick = () => { if (this.onFloat?.(this.c, this.w)) this.close(); else this.render(); };
    parts.push(go);
    return parts;
  }
}
