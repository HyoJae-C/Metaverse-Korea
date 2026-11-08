// Samgyeopsal grilling panel (rules in core/grill-game.js). Tap a slice to
// flip it, serve it when both sides are golden. The score gives a gold,
// silver or bronze medal; the best medal is kept, and each new tier pays coins
// once. The clerk says short Korean lines with romanization and a meaning.
import { t, getLanguage, localName } from '../core/i18n.js';
import { Grill, Medals, doneness, medalFor, medalIcon, GOLDEN, BURNT } from '../core/grill-game.js';

const GAME = 'grill';

// Clerk lines: [Korean, romanization, { en, ja, zh }].
export const GRILL_LINES = {
  start: ['고기 올려 드릴게요!', 'gogi ollyeo deurilgeyo!', { en: "I'll put the meat on the grill!", ja: 'お肉を載せますね！', zh: '我来把肉放上去！' }],
  flip: ['지금 뒤집으세요!', 'jigeum dwijibeuseyo!', { en: 'Flip it now!', ja: '今ひっくり返して！', zh: '现在翻面！' }],
  burnt: ['앗, 탔어요!', 'at, tasseoyo!', { en: 'Oops, it burnt!', ja: 'あっ、焦げました！', zh: '哎呀，烤焦了！' }],
  good: ['잘 구우셨네요! 맛있게 드세요!', 'jal guusyeonneyo! masitge deuseyo!', { en: 'Nicely grilled! Enjoy!', ja: '上手に焼けましたね！召し上がれ！', zh: '烤得真好！请慢用！' }],
  again: ['괜찮아요, 다시 해 봐요!', 'gwaenchanayo, dasi hae bwayo!', { en: "That's OK, let's try again!", ja: '大丈夫、もう一度やってみましょう！', zh: '没关系，再试一次吧！' }],
};

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const meaning = (tr) => localName(tr, getLanguage());

// Raw pink → golden brown → charred, by doneness.
const STOPS = [[0, [244, 182, 176]], [GOLDEN, [201, 138, 74]], [BURNT, [120, 72, 40]], [1.4, [48, 30, 22]]];
export function meatColor(c) {
  for (let i = 1; i < STOPS.length; i++) {
    const [c1, a] = STOPS[i - 1], [c2, b] = STOPS[i];
    if (c <= c2 || i === STOPS.length - 1) {
      const u = Math.max(0, Math.min(1, (c - c1) / (c2 - c1)));
      return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * u)).join(',')})`;
    }
  }
  return 'rgb(48,30,22)';
}

export class GrillUI {
  // root: the sheet; wallet: { add(n) }; onSay(line): the clerk speaks.
  constructor({ root, wallet, onSay, onClose, onMedal }) {
    Object.assign(this, { root, wallet, onSay, onClose, onMedal });
    this.medals = new Medals();
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

  _say(key) {
    const [ko, rom, tr] = GRILL_LINES[key];
    this.onSay?.([ko, rom, meaning(tr)]);
  }

  _frame(title) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, title));
  }

  renderStart() {
    cancelAnimationFrame(this.raf);
    this._frame('🥓 ' + t('grill.title'));
    this.root.append(el('p', 'fine', t('grill.howTo')));
    const best = this.medals.best(GAME);
    this.root.append(el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')));
    const legend = el('p', 'fine grill-legend', `🥇 90+ · 🥈 75+ · 🥉 55+`);
    const go = el('button', 'primary', t('grill.start'));
    go.onclick = () => this.start();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(legend, actions);
  }

  start() {
    this.game = new Grill();
    this.warned = new Set(); // slices the clerk already warned about
    this._say('start');
    this._frame('🥓 ' + t('grill.title'));
    const grid = el('div', 'grill-grid');
    this.cards = this.game.slices.map((s, i) => {
      const card = el('div', 'grill-slice');
      const meat = el('button', 'grill-meat');
      meat.setAttribute('aria-label', t('grill.flip'));
      meat.onclick = () => { this.game.flip(i); meat.classList.remove('flipped'); void meat.offsetWidth; meat.classList.add('flipped'); };
      const bar = el('div', 'grill-bar');
      const fill = el('i');
      bar.append(fill);
      const state = el('small', 'grill-state');
      const serve = el('button', 'chip grill-serve', '🍽️ ' + t('grill.serve'));
      serve.onclick = () => this.serve(i);
      card.append(meat, bar, state, serve);
      grid.append(card);
      return { card, meat, fill, state, serve };
    });
    this.root.append(el('p', 'fine', t('grill.tip')), grid);
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.game.step(dt);
      this._paint();
      if (!this.game.done && this.open) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  _paint() {
    this.game.slices.forEach((s, i) => {
      const c = this.cards[i];
      const up = s.sides[1 - s.down], down = s.sides[s.down];
      c.meat.style.background = `linear-gradient(180deg, ${meatColor(up)} 0 62%, #f6e6d6 62% 70%, ${meatColor(up)} 70%)`;
      c.fill.style.width = Math.min(100, (down / 1.2) * 100) + '%';
      c.fill.style.background = meatColor(down);
      const d = doneness(down);
      c.state.textContent = s.served ? `✅ ${Math.round(s.score * 100)}` : t('grill.' + d);
      c.card.classList.toggle('served', s.served);
      c.card.classList.toggle('hot', !s.served && d === 'golden');
      c.serve.disabled = s.served;
      if (!s.served && d === 'golden' && !this.warned.has(i + ':g' + s.down)) { this.warned.add(i + ':g' + s.down); this._say('flip'); }
      if (!s.served && d === 'burnt' && !this.warned.has(i + ':b')) { this.warned.add(i + ':b'); this._say('burnt'); }
    });
  }

  serve(i) {
    this.game.serve(i);
    this._paint();
    if (this.game.done) this.finish();
  }

  finish() {
    cancelAnimationFrame(this.raf);
    const score = this.game.score;
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(GAME, medal) : 0;
    if (coins) this.wallet?.add(coins, undefined, { r: 'medal', once: 'medal:' + GAME + ':' + medal });
    this._say(medal ? 'good' : 'again');
    this._frame('🥓 ' + t('grill.title'));
    const big = el('div', 'grill-result');
    big.append(el('span', 'grill-medal', medal ? medalIcon(medal) : '🔥'), el('strong', null, t('grill.score', { n: score })));
    big.append(el('p', null, medal ? t('grill.' + medal) + (coins ? ` · 🪙 +${coins}` : '') : t('grill.tryAgain')));
    this.root.append(big);
    const actions = el('div', 'order-actions');
    const again = el('button', 'primary', t('grill.again'));
    again.onclick = () => this.start();
    actions.append(again);
    this.root.append(actions);
    this.onMedal?.(medal, coins);
  }
}
