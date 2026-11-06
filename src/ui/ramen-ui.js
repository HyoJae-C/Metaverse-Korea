// Han River ramen panel (rules in core/ramen-game.js): the ramyeon pack (and
// an egg) come out of your bag, the water is free. The pot boils by itself,
// then you cheer the noodles on — "꼬들꼬들해져라~" — until they're chewy.
// No score and no failing: you always get a bowl to eat at a parasol table.
import { buzz } from '../core/haptics.js';
import { t, getLanguage, localName } from '../core/i18n.js';
import { BOIL_SECONDS, RAMEN_TAPS, INGREDIENTS, ingredientAt, ingredientCount, canCook, chewy } from '../core/ramen-game.js';

// Clerk lines: [Korean, romanization, { en, ja, zh }].
export const RAMEN_LINES = {
  start: ['물 올려 드릴게요!', 'mul ollyeo deurilgeyo!', { en: "I'll put the water on!", ja: 'お湯を沸かしますね！', zh: '我来烧水！' }],
  good: ['와, 꼬들꼬들 딱 좋아요!', 'wa, kkodeul-kkodeul ttak joayo!', { en: 'Wow, just the right chew!', ja: 'わあ、ちょうどいい歯ごたえ！', zh: '哇，面条劲道正好！' }],
  need: ['라면은 저희 데일리마트에서 사 오세요!', 'ramyeoneun jeohui deillimateueseo sa oseyo!', { en: 'Grab a ramyeon pack here at DAILY MART!', ja: 'ラーメンはうちのデイリーマートで買ってきてね！', zh: '拉面请在我们DAILY MART买哦！' }],
};

// Panel text (a language without its own line shows English).
export const RAMEN_TEXT = {
  howTo: {
    en: 'Buy a ramyeon pack at DAILY MART (and an egg if you like). The water is free. Put the pot on, then cheer the noodles on until they turn chewy!',
    ko: '데일리마트에서 라면(원하면 계란도)을 사 오세요. 물은 무료예요. 냄비를 올리고, 면이 꼬들꼬들해질 때까지 응원해 주세요!',
    ja: 'デイリーマートでラーメン（お好みで卵も）を買ってきてね。水は無料。鍋をかけたら、麺がシコシコになるまで応援しよう！',
    zh: '在DAILY MART买一包拉面（想加蛋也可以买鸡蛋）。水免费。把锅放上，然后给面条加油，直到变得筋道！',
  },
  inBag: { en: 'In your bag', ko: '가방에 있는 재료', ja: 'バッグの中', zh: '包里的食材' },
  ramyeon: { en: 'Ramyeon', ko: '라면', ja: 'ラーメン', zh: '拉面' },
  egg: { en: 'Egg', ko: '계란', ja: '卵', zh: '鸡蛋' },
  water: { en: 'Water: free', ko: '물: 무료', ja: '水：無料', zh: '水：免费' },
  need: { en: 'You need a ramyeon pack. DAILY MART is right next to the machine.', ko: '라면이 필요해요. 기계 바로 옆 데일리마트에서 살 수 있어요.', ja: 'ラーメンが必要です。機械のすぐ隣のデイリーマートで買えます。', zh: '需要一包拉面。机器旁边的DAILY MART就有卖。' },
  start: { en: 'Put the pot on', ko: '냄비 올리기', ja: '鍋をかける', zh: '把锅放上' },
  heating: { en: 'Heating the water…', ko: '물을 끓이는 중…', ja: 'お湯を沸かしています…', zh: '正在烧水…' },
  inPot: { en: 'Noodles and soup are in! Cheer them on!', ko: '면이랑 스프를 넣었어요! 응원해 주세요!', ja: '麺とスープを入れたよ！応援しよう！', zh: '面和汤料下锅了！给它们加油！' },
  addEgg: { en: 'Add an egg', ko: '계란 넣기', ja: '卵を入れる', zh: '加鸡蛋' },
  noEgg: { en: 'No egg in your bag', ko: '가방에 계란이 없어요', ja: 'バッグに卵がありません', zh: '包里没有鸡蛋' },
  chant: { en: 'Get nice and chewy!', ko: '꼬들꼬들해져라~', ja: 'シコシコになれ〜', zh: '变筋道吧～' },
  done: { en: 'Your Han River ramen is ready!', ko: '한강 라면 완성!', ja: '漢江ラーメンの完成！', zh: '汉江拉面做好啦！' },
  withEgg: { en: 'with an egg', ko: '계란 추가', ja: '卵入り', zh: '加了鸡蛋' },
  eatAt: { en: 'Carry it to a parasol table and sit down to eat.', ko: '파라솔 테이블로 가져가서 앉아서 먹어요.', ja: 'パラソルのテーブルに持って行って、座って食べよう。', zh: '端到遮阳伞桌那边，坐下来吃吧。' },
  ok: { en: 'OK', ko: '좋아요', ja: 'OK', zh: '好的' },
};
const L = (o) => localName(o, getLanguage()) || o.en;

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class RamenUI {
  // root: the sheet; bag: the player's bag (list/take); onSay(line): the
  // clerk speaks; beforeCook(): false to stop (e.g. hands full);
  // onCooked({ egg }): the bowl is ready.
  constructor({ root, bag, onSay, beforeCook, onCooked, onClose }) {
    Object.assign(this, { root, bag, onSay, beforeCook, onCooked, onClose });
    this.raf = 0;
  }

  get open() { return !this.root.hidden; }

  show() {
    this.root.hidden = false;
    this.renderStart();
  }

  close() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.root.hidden = true;
    this.onClose?.();
  }

  say(key) {
    const [ko, rom, tr] = RAMEN_LINES[key];
    this.onSay?.([ko, rom, localName(tr, getLanguage()) || tr.en]);
  }

  _frame() {
    cancelAnimationFrame(this.raf);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🍜 ' + t('ramen.title')));
  }

  _pantry() {
    const items = this.bag.list();
    const n = (g) => ingredientCount(items, g);
    return el('p', 'ramen-pantry', `${L(RAMEN_TEXT.inBag)}: ${INGREDIENTS.ramyeon.icon} ${L(RAMEN_TEXT.ramyeon)} × ${n('ramyeon')} · ${INGREDIENTS.egg.icon} ${L(RAMEN_TEXT.egg)} × ${n('egg')} · 💧 ${L(RAMEN_TEXT.water)}`);
  }

  renderStart() {
    this._frame();
    const ok = canCook(this.bag.list());
    const go = el('button', 'primary', '🔥 ' + L(RAMEN_TEXT.start));
    go.disabled = !ok;
    go.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(el('p', 'order-hint', L(RAMEN_TEXT.howTo)), this._pantry());
    if (!ok) { this.root.append(el('p', 'ramen-need', '🏪 ' + L(RAMEN_TEXT.need))); this.say('need'); }
    this.root.append(actions);
  }

  play() {
    if (this.beforeCook?.() === false) return;
    const at = ingredientAt(this.bag.list(), 'ramyeon');
    if (at < 0) { this.renderStart(); return; }
    this.bag.take(at); // the pack goes in the pot (noodles and soup powder)
    this._frame();
    this.say('start');
    const s = { t: 0, taps: 0, egg: false, done: false };
    const pot = el('div', 'ramen-pot heating');
    const bowl = el('span', 'ramen-bowl', '🫕');
    const status = el('p', 'ramen-status', L(RAMEN_TEXT.heating));
    pot.append(bowl, status);
    const meter = el('div', 'fish-meter ramen-meter');
    const fill = el('i');
    meter.append(fill);
    const egg = el('button', 'chip', '🥚 ' + L(RAMEN_TEXT.addEgg));
    egg.onclick = () => {
      const i = ingredientAt(this.bag.list(), 'egg');
      if (i < 0 || s.egg) return;
      this.bag.take(i);
      s.egg = true;
      paint();
    };
    const chips = el('div', 'ramen-steps');
    chips.append(egg);
    const chant = el('button', 'primary ramen-chant');
    chant.append(el('span', null, '✨ 꼬들꼬들해져라~'));
    if (getLanguage() !== 'ko') chant.append(el('small', null, L(RAMEN_TEXT.chant)));
    chant.onclick = () => {
      if (s.t < BOIL_SECONDS || s.done) return;
      s.taps++;
      bowl.classList.remove('cheer'); void bowl.offsetWidth; bowl.classList.add('cheer'); // replay the bounce
      buzz(15);
      paint();
      if (s.taps >= RAMEN_TAPS) { s.done = true; setTimeout(() => this.finish(s), 350); }
    };
    const actions = el('div', 'order-actions');
    actions.append(chant);
    this.root.append(pot, meter, chips, actions);

    const paint = () => {
      const boiled = s.t >= BOIL_SECONDS;
      pot.className = 'ramen-pot ' + (boiled ? 'cooking' : 'heating');
      bowl.textContent = boiled ? '🍜' : '🫕';
      status.textContent = !boiled ? L(RAMEN_TEXT.heating) : s.taps ? `꼬들꼬들~ ${'✨'.repeat(s.taps)}` : L(RAMEN_TEXT.inPot);
      fill.style.width = (boiled ? chewy(s.taps) : s.t / BOIL_SECONDS) * 100 + '%';
      meter.classList.toggle('cook', boiled);
      const eggs = ingredientCount(this.bag.list(), 'egg');
      egg.disabled = s.egg || !eggs || s.done;
      egg.textContent = s.egg ? '🥚 ✅' : eggs ? `🥚 ${L(RAMEN_TEXT.addEgg)} (${eggs})` : '🥚 ' + L(RAMEN_TEXT.noEgg);
      chant.disabled = !boiled || s.done;
    };
    paint();
    let last = performance.now();
    const loop = (now) => {
      s.t += Math.min(0.1, (now - last) / 1000);
      last = now;
      paint();
      if (s.t < BOIL_SECONDS) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  finish(s) {
    this._frame();
    this.say('good');
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', s.egg ? '🍜🥚' : '🍜'),
      el('strong', null, L(RAMEN_TEXT.done)),
      el('p', null, s.egg ? '🥚 ' + L(RAMEN_TEXT.withEgg) : ''),
      el('p', 'order-hint', '⛱️ ' + L(RAMEN_TEXT.eatAt)),
    );
    const ok = el('button', 'primary', L(RAMEN_TEXT.ok));
    ok.onclick = () => this.close();
    const actions = el('div', 'order-actions');
    actions.append(ok);
    this.root.append(res, actions);
    this.onCooked?.({ egg: s.egg });
  }
}
