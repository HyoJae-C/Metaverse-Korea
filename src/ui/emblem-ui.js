// Nickname shop panel: buy an emblem for your name tag and a colour for your
// name, then wear them. Tap an item to preview it on your own tag first.
import { TIERS, EMBLEMS, NAME_COLORS, priceOf, styleNameTag } from '../core/emblems.js';
import { L, fmt } from './pocha-ui.js';
import { t } from '../core/i18n.js';

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
  nameTab: { en: 'Change name', ko: '이름 바꾸기', ja: '名前変更', zh: '改名', es: 'Cambiar nombre', ar: 'غيّر الاسم', vi: 'Đổi tên', hi: 'नाम बदलें', id: 'Ganti nama' },
  nameHow: {
    en: 'Type a new name (Korean or English letters and numbers). Everyone sees it right away.',
    ko: '새 이름을 적어요 (한글, 영어, 숫자). 바꾸면 다른 사람들에게도 바로 보여요.',
    ja: '新しい名前を入力（ハングル・英字・数字）。変えるとすぐみんなに表示されます。',
    zh: '输入新名字（韩文、英文字母和数字），改完大家马上就能看到。',
    es: 'Escribe un nombre nuevo (letras coreanas o inglesas y números). Todos lo verán al instante.', ar: 'اكتب اسمًا جديدًا (حروف كورية أو إنجليزية وأرقام). يراه الجميع فورًا.', vi: 'Nhập tên mới (chữ Hàn hoặc chữ Latinh và số). Mọi người sẽ thấy ngay.', hi: 'नया नाम लिखें (कोरियाई या अंग्रेज़ी अक्षर और अंक)। सबको तुरंत दिखेगा।', id: 'Ketik nama baru (huruf Korea atau Inggris dan angka). Semua orang langsung melihatnya.',
  },
  rename: { en: 'Change name · 🪙 {n}', ko: '이름 바꾸기 · 🪙 {n}', ja: '名前を変える · 🪙 {n}', zh: '改名 · 🪙 {n}', es: 'Cambiar nombre · 🪙 {n}', ar: 'غيّر الاسم · 🪙 {n}', vi: 'Đổi tên · 🪙 {n}', hi: 'नाम बदलें · 🪙 {n}', id: 'Ganti nama · 🪙 {n}' },
  renamed: { en: 'Your name is now {name}!', ko: '이름이 「{name}」(으)로 바뀌었어요!', ja: '名前が{name}になりました！', zh: '你的名字现在是{name}！', es: '¡Ahora te llamas {name}!', ar: 'اسمك الآن {name}!', vi: 'Tên của bạn giờ là {name}!', hi: 'अब आपका नाम {name} है!', id: 'Namamu sekarang {name}!' },
  same: { en: 'That is already your name.', ko: '지금 이름과 같아요.', ja: '今の名前と同じです。', zh: '和现在的名字一样。', es: 'Ya te llamas así.', ar: 'هذا اسمك بالفعل.', vi: 'Đó đã là tên của bạn rồi.', hi: 'यह पहले से आपका नाम है।', id: 'Itu sudah namamu.' },
  empty: { en: 'Type a name first.', ko: '이름을 먼저 적어 주세요.', ja: '先に名前を入力してください。', zh: '请先输入名字。', es: 'Escribe un nombre primero.', ar: 'اكتب اسمًا أولًا.', vi: 'Hãy nhập tên trước.', hi: 'पहले कोई नाम लिखें।', id: 'Ketik nama dulu.' },
};
const RESERVED_NAME = { en: 'Names that look official (operator, admin…) can\'t be used.', ko: '운영자·관리자처럼 공식으로 보이는 이름은 쓸 수 없어요.', ja: '運営・管理者のような公式に見える名前は使えません。', zh: '不能使用像运营、管理员这样看起来官方的名字。' };
export const RENAME_COST = 30;
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
  // rename(text) → 'ok' | 'same' | 'empty' | 'poor' changes my name.
  constructor({ root, owned, wallet, name, rename, getLook, wearLook }) {
    Object.assign(this, { root, owned, wallet, name, rename, getLook, wearLook });
    this.tab = 'emblem';
    this.pick = null; // id being previewed
  }
  get open() { return !this.root.hidden; }
  show() { this.root.hidden = false; this.pick = null; this.confirming = null; this.render(); }
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
    for (const k of ['emblem', 'color', 'name']) {
      if (k === 'name' && !this.rename) continue;
      const b = el('button', 'chip' + (k === kind ? ' on' : ''), tt(k === 'emblem' ? 'emblems' : k === 'color' ? 'colors' : 'nameTab'));
      b.setAttribute('aria-pressed', String(k === kind));
      b.onclick = () => { this.tab = k; this.pick = null; this.confirming = null; this.render(); };
      tabs.append(b);
    }
    this.root.append(tabs);
    if (kind === 'name') { this._renderName(note); return; }

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

  _renderName(note) {
    this.root.append(el('p', 'order-hint', tt('nameHow')));
    const input = el('input', 'rename-input');
    input.maxLength = 16;
    input.autocomplete = 'off';
    input.value = this.draft ?? this.name;
    const tidy = (e) => {
      if (e?.isComposing) return;
      const v = input.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]/g, '').replace(/ {2,}/g, ' ');
      if (v !== input.value) input.value = v;
      this.draft = input.value;
    };
    input.addEventListener('input', tidy);
    input.addEventListener('compositionend', tidy);
    this.root.append(input);
    if (note) this.root.append(el('p', 'order-hint claw-note', note));
    const actions = el('div', 'order-actions');
    if (!this.confirming) this.root.append(el('p', 'order-hint name-rule', t('name.rule')));
    const go = el('button', 'primary', tt('rename', { n: RENAME_COST }));
    go.onclick = async () => {
      // A warning first: the name rules, and are you sure?
      if (!this.confirming) {
        this.confirming = input.value.trim() || ' ';
        this.render();
        return;
      }
      const r = await this.rename(input.value);
      this.confirming = null;
      if (r === 'ok') { this.draft = null; this.render('🎉 ' + tt('renamed', { name: this.name })); return; }
      this.render(r === 'poor' ? tt('poor', { n: RENAME_COST }) : r === 'taken' ? t('name.taken') : r === 'reserved' ? L(RESERVED_NAME) : tt(r === 'same' ? 'same' : 'empty'));
    };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) go.click(); };
    if (this.confirming) {
      const box = el('div', 'name-confirm');
      box.append(el('strong', null, t('name.confirm', { name: this.confirming.trim() })), el('p', null, t('name.rule')));
      const yes = el('button', 'primary', t('name.confirmGo'));
      yes.onclick = () => go.click();
      const no = el('button', 'chip', t('name.cancel'));
      no.onclick = () => { this.confirming = null; this.render(); };
      const row = el('div', 'order-actions');
      row.append(no, yes);
      box.append(row);
      this.root.append(box);
      input.disabled = true;
      return;
    }
    actions.append(go);
    this.root.append(actions);
  }
}
