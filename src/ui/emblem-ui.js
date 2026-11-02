// Nickname shop panel: buy an emblem for your name tag and a colour for your
// name, then wear them. Tap an item to preview it on your own tag first.
import { TIERS, EMBLEMS, NAME_COLORS, priceOf, styleNameTag } from '../core/emblems.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  title: { en: 'Nickname Studio', ko: '닉네임 꾸미기 공방', ja: 'ニックネーム工房', zh: '昵称工坊' },
  howTo: {
    en: 'Put an emblem in front of your name and colour your name. Everyone sees it on your name tag.',
    ko: '이름 앞에 엠블럼을 달고 이름에 색을 입혀요. 다른 사람들 화면의 내 이름표에도 보여요.',
    ja: '名前の前にエンブレムを付けて、名前に色を付けよう。みんなの画面の名札に表示されます。',
    zh: '在名字前加徽章、给名字上色，大家都能在你的名牌上看到。',
  },
  emblems: { en: 'Emblems', ko: '엠블럼', ja: 'エンブレム', zh: '徽章' },
  colors: { en: 'Name colour', ko: '이름 색상', ja: '名前の色', zh: '名字颜色' },
  preview: { en: 'Preview', ko: '미리보기', ja: 'プレビュー', zh: '预览' },
  buy: { en: 'Buy · 🪙 {n}', ko: '구매 · 🪙 {n}', ja: '購入 · 🪙 {n}', zh: '购买 · 🪙 {n}' },
  wear: { en: 'Wear', ko: '달기', ja: '付ける', zh: '佩戴' },
  off: { en: 'Take off', ko: '빼기', ja: '外す', zh: '取下' },
  owned: { en: 'Owned', ko: '보유', ja: '所持', zh: '已有' },
  wearing: { en: 'Wearing', ko: '착용 중', ja: '着用中', zh: '佩戴中' },
  poor: { en: 'You need 🪙 {n}.', ko: '🪙 {n}개가 필요해요.', ja: '🪙 {n}枚必要です。', zh: '需要 🪙 {n}。' },
  bought: { en: 'Bought! It is on your name tag now.', ko: '구매 완료! 이름표에 달았어요.', ja: '購入しました！名札に付けました。', zh: '购买成功！已戴在名牌上。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class EmblemUI {
  // owned: EmblemCollection; wallet; name; getLook(); wearLook(patch) saves
  // and shows it; preview(look|null) shows a look without saving.
  constructor({ root, owned, wallet, name, getLook, wearLook }) {
    Object.assign(this, { root, owned, wallet, name, getLook, wearLook });
    this.tab = 'emblem';
    this.pick = null; // id being previewed
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.pick = null; this.render(); }
  close() { this.root.hidden = true; }

  render(note) {
    const kind = this.tab;
    const key = kind === 'emblem' ? 'emblem' : 'nameColor';
    const look = this.getLook();
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🏷️ ' + tt('title')), el('p', 'order-hint', tt('howTo')));

    // Preview of my tag with the picked item.
    const prev = el('div', 'emblem-preview');
    const tag = el('div', 'nametag me');
    styleNameTag(tag, this.name, this.pick ? { ...look, [key]: this.pick } : look);
    prev.append(el('small', null, tt('preview')), tag);
    this.root.append(prev);

    const tabs = el('div', 'beauty-row');
    for (const k of ['emblem', 'color']) {
      const b = el('button', 'chip' + (k === kind ? ' on' : ''), tt(k === 'emblem' ? 'emblems' : 'colors'));
      b.setAttribute('aria-pressed', String(k === kind));
      b.onclick = () => { this.tab = k; this.pick = null; this.render(); };
      tabs.append(b);
    }
    this.root.append(tabs);

    const list = kind === 'emblem' ? EMBLEMS : NAME_COLORS;
    for (const tier of Object.keys(TIERS)) {
      this.root.append(el('strong', 'emblem-tier', `${L(TIERS[tier].name)} · 🪙 ${TIERS[tier].price}`));
      const grid = el('div', 'emblem-grid');
      for (const it of list.filter((i) => i.tier === tier)) {
        const b = el('button', 'emblem-opt' + (this.pick === it.id ? ' picked' : ''));
        const sample = el('span');
        if (kind === 'emblem') styleNameTag(sample, '', { emblem: it.id });
        else styleNameTag(sample, 'Aa', { nameColor: it.id });
        const has = this.owned.has(kind, it.id);
        const on = look[key] === it.id;
        b.append(sample, el('small', null, L(it.name)), el('em', null, on ? tt('wearing') : has ? tt('owned') : `🪙 ${priceOf(it)}`));
        b.onclick = () => { this.pick = it.id; this.render(); };
        grid.append(b);
      }
      this.root.append(grid);
    }

    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const actions = el('div', 'order-actions');
    if (this.pick) {
      const it = list.find((i) => i.id === this.pick);
      if (!this.owned.has(kind, it.id)) {
        const buy = el('button', 'primary', tt('buy', { n: priceOf(it) }));
        buy.onclick = () => {
          const r = this.owned.buy(kind, it.id, this.wallet);
          if (r === 'poor') { this.render(tt('poor', { n: priceOf(it) })); return; }
          this.wearLook({ [key]: it.id });
          this.render('🎉 ' + tt('bought'));
        };
        actions.append(buy);
      } else if (look[key] !== it.id) {
        const wear = el('button', 'primary', tt('wear'));
        wear.onclick = () => { this.wearLook({ [key]: it.id }); this.render(); };
        actions.append(wear);
      }
    }
    if (look[key]) {
      const off = el('button', 'chip', tt('off'));
      off.onclick = () => { this.pick = null; this.wearLook({ [key]: null }); this.render(); };
      actions.append(off);
    }
    this.root.append(actions);
  }
}
