// Han River ramen panel (rules in core/ramen-game.js): boil the water, add
// noodles and soup, toppings if you like, and take it off at "4:00". Medals
// as at the grill; each new tier pays coins once.
import { t, getLanguage } from '../core/i18n.js';
import { Medals, medalFor, medalIcon } from '../core/grill-game.js';
import { RAMEN_GAME, BOIL_SECONDS, COOK_MAX, ramenScore, noodleState, potClock } from '../core/ramen-game.js';

// Clerk lines: [Korean, romanization, { en, ja, zh }].
export const RAMEN_LINES = {
  start: ['물 올려 드릴게요!', 'mul ollyeo deurilgeyo!', { en: "I'll put the water on!", ja: 'お湯を沸かしますね！', zh: '我来烧水！' }],
  good: ['와, 꼬들꼬들 딱 좋아요!', 'wa, kkodeul-kkodeul ttak joayo!', { en: 'Wow, just the right chew!', ja: 'わあ、ちょうどいい歯ごたえ！', zh: '哇，面条劲道正好！' }],
  again: ['괜찮아요, 한 번 더 끓여 봐요!', 'gwaenchanayo, han beon deo kkeuryeo bwayo!', { en: "That's OK, cook another one!", ja: '大丈夫、もう一杯作りましょう！', zh: '没关系，再煮一碗吧！' }],
};

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const meaning = (tr) => tr[getLanguage()] || tr.en;

export class RamenUI {
  // root: the sheet; wallet: { add(n) }; onSay(line): the clerk speaks.
  constructor({ root, wallet, onSay, onMedal, onClose }) {
    Object.assign(this, { root, wallet, onSay, onMedal, onClose });
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

  say(key) {
    const [ko, rom, tr] = RAMEN_LINES[key];
    this.onSay?.([ko, rom, meaning(tr)]);
  }

  _frame() {
    cancelAnimationFrame(this.raf);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🍜 ' + t('ramen.title')));
  }

  renderStart() {
    this._frame();
    const best = this.medals.best(RAMEN_GAME);
    const go = el('button', 'primary', t('ramen.start'));
    go.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(go);
    this.root.append(
      el('p', 'order-hint', t('ramen.howTo')),
      el('p', 'grill-best', best ? t('grill.best', { medal: medalIcon(best) + ' ' + t('grill.' + best) }) : t('grill.noMedal')),
      actions,
    );
  }

  play() {
    this._frame();
    this.say('start');
    const s = { t: 0, noodlesAt: null, boiled: false, soup: false, toppings: new Set() };
    const pot = el('div', 'ramen-pot');
    const bowl = el('span', 'ramen-bowl', '🫕');
    const status = el('p', 'ramen-status');
    pot.append(bowl, status);
    const meter = el('div', 'fish-meter ramen-meter');
    const fill = el('i');
    meter.append(fill);
    const clock = el('p', 'ramen-clock', '⏱ 0:00');
    const btn = (icon, key, run) => {
      const b = el('button', 'chip', icon + ' ' + t('ramen.' + key));
      b.onclick = () => { run(b); paint(); };
      return b;
    };
    const noodles = btn('🍜', 'noodles', (b) => { s.noodlesAt = s.t; s.boiled = s.t >= BOIL_SECONDS; b.disabled = true; });
    const soup = btn('🧂', 'soup', (b) => { s.soup = true; b.disabled = true; });
    const egg = btn('🥚', 'egg', (b) => { s.toppings.add('egg'); b.disabled = true; });
    const onion = btn('🧅', 'onion', (b) => { s.toppings.add('onion'); b.disabled = true; });
    const done = el('button', 'primary', '✅ ' + t('ramen.done'));
    done.onclick = () => this.finish(s);
    const chips = el('div', 'ramen-steps');
    chips.append(noodles, soup, egg, onion);
    const actions = el('div', 'order-actions');
    actions.append(done);
    this.root.append(pot, meter, clock, chips, actions);

    const paint = () => {
      const cook = s.noodlesAt == null ? 0 : s.t - s.noodlesAt;
      const boil = Math.min(1, s.t / BOIL_SECONDS);
      const cooking = s.noodlesAt != null;
      pot.className = 'ramen-pot ' + (cooking ? 'cooking' : boil >= 1 ? 'boiling' : 'heating');
      bowl.textContent = cooking ? '🍜' : boil >= 1 ? '♨️' : '🫕';
      status.textContent = cooking ? t('ramen.cooking') : boil >= 1 ? t('ramen.boiling') : t('ramen.heating');
      // The meter: the water warming up, then the noodles towards 4:00 (the
      // mark at 4/7 of the bar).
      fill.style.width = (cooking ? Math.min(1, cook / COOK_MAX) : boil) * 100 + '%';
      meter.classList.toggle('cook', cooking);
      clock.textContent = '⏱ ' + potClock(cook) + (cooking ? '' : ' · ' + t('ramen.goal'));
      egg.disabled = onion.disabled = !cooking;
      if (s.toppings.has('egg')) egg.disabled = true;
      if (s.toppings.has('onion')) onion.disabled = true;
      done.disabled = !cooking;
    };
    paint();
    let last = performance.now();
    const loop = (now) => {
      s.t += Math.min(0.1, (now - last) / 1000);
      last = now;
      paint();
      if (s.noodlesAt != null && s.t - s.noodlesAt >= COOK_MAX) { this.finish(s); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  finish(s) {
    const cook = s.t - s.noodlesAt;
    const score = ramenScore({ boiled: s.boiled, soup: s.soup, cook, toppings: s.toppings.size });
    const medal = medalFor(score);
    const coins = medal ? this.medals.add(RAMEN_GAME, medal) : 0;
    if (coins) this.wallet.add(coins);
    this._frame();
    this.say(medal === 'gold' || medal === 'silver' ? 'good' : 'again');
    const res = el('div', 'grill-result');
    res.append(
      el('span', 'grill-medal', medal ? medalIcon(medal) : '🍜'),
      el('strong', null, medal ? t('grill.' + medal) : t('ramen.tryAgain')),
      el('p', null, t('grill.score', { n: score }) + ' · ⏱ ' + potClock(cook)),
      el('p', 'order-hint', [t('ramen.' + noodleState(cook)), !s.boiled && t('ramen.notBoiled'), !s.soup && t('ramen.noSoup')].filter(Boolean).join(' ')),
    );
    const again = el('button', 'primary', t('ramen.again'));
    again.onclick = () => this.play();
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(res, actions);
    this.onMedal?.(medal, coins);
  }
}
