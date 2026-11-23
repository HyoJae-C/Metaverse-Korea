// Wrapped gift screens (game/wrap-gifts.js), downloaded the first time one is
// used: writing a letter, picking a friend next to you, the card a friend
// sees, the box opening, and reading a letter. Looks like the shop gifts'
// screens (ui/gift-ui.js, .gift-* in style.css).
import { LETTER_MAX } from '../core/wrap.js';
import { t } from '../core/i18n.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const CSS = `
.wrap-letter-in { width: 100%; box-sizing: border-box; min-height: 92px; margin-top: 10px; padding: 10px 12px; border: 0; border-radius: 14px; resize: none;
  font: inherit; font-size: 15px; background: repeating-linear-gradient(#fffaf2 0 26px, #f1e3cf 26px 27px); }
.wrap-row { display: flex; gap: 8px; margin-top: 10px; } .wrap-row button { flex: 1; margin: 0; }
.wrap-paper { margin: 10px 0 0; padding: 14px 16px; border-radius: 14px; font-size: 16px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
  background: repeating-linear-gradient(#fffaf2 0 26px, #f1e3cf 26px 27px); }
.wrap-big { font-size: 46px; text-align: center; margin: 4px 0; animation: gift-pop .4s ease-out; }
.wrap-panel { z-index: 9; }
`;

export class WrapUI {
  constructor({ onAnswer }) {
    this.onAnswer = onAnswer;
    const style = el('style');
    style.textContent = CSS;
    document.head.append(style);
    this.panel = el('div', 'sheet gift-panel wrap-panel');
    this.panel.hidden = true;
    this.cardsEl = el('div', 'gift-cards');
    this.cardsEl.style.marginTop = '0';
    const host = document.getElementById('hud') || document.body;
    host.append(this.panel, this.cardsEl);
  }
  get open() { return !this.panel.hidden; }
  close() { this.panel.hidden = true; }
  _show(title, ...parts) {
    const x = el('button', 'sheet-x', '✕');
    x.onclick = () => this.close();
    this.panel.replaceChildren(x, el('h3', null, title), ...parts);
    this.panel.hidden = false;
  }

  // Write a letter for the box ({ item, icon, coins?, sheets }); done(text)
  // ('' to wrap it without one when coins is given: buying in the shop).
  write(info, done) {
    const head = el('div', 'gift-thing');
    head.append(el('span', 'gift-icon', info.icon), el('strong', null, info.item));
    if (info.coins) head.append(el('b', null, `🪙 ${info.coins}`));
    const box = el('textarea', 'wrap-letter-in');
    box.maxLength = LETTER_MAX;
    box.placeholder = t('wrap.letterHint');
    const count = el('small', 'fine', `0 / ${LETTER_MAX}`);
    box.oninput = () => { count.textContent = `${box.value.length} / ${LETTER_MAX}`; };
    const row = el('div', 'wrap-row');
    const ok = el('button', 'primary', '💌 ' + t(info.coins ? 'wrap.wrapLetter' : 'wrap.addLetter'));
    ok.onclick = () => { if (!box.value.trim()) { box.focus(); return; } this.close(); done(box.value); };
    if (info.coins) {
      const plain = el('button', 'chip', '🎀 ' + t('wrap.wrapPlain'));
      plain.onclick = () => { this.close(); done(''); };
      row.append(plain);
    }
    row.append(ok);
    this._show('🎀 ' + t('wrap.title'), head, box, count, row, el('p', 'fine', t('wrap.letterNote', { n: info.sheets })));
  }

  // Friends next to me [{ id, name }]; onPick(person).
  pick(people, onPick) {
    const list = el('div', 'gift-people');
    if (!people.length) list.append(el('p', 'order-hint', t('wrap.nobody')));
    for (const p of people) {
      const b = el('button', 'chip gift-person', '🎁 ' + p.name);
      b.onclick = () => { this.close(); onPick(p); };
      list.append(b);
    }
    this._show(t('wrap.pick'), list, el('p', 'fine', t('wrap.pickHint')));
  }

  // Boxes friends are handing me: [{ wid, name, letter }].
  showCards(cards) {
    this.cardsEl.replaceChildren(...cards.map((c) => {
      const card = el('div', 'gift-card');
      const txt = el('div', 'gift-card-text');
      txt.append(el('strong', null, t('wrap.card', { name: c.name })), el('span', null, t(c.letter ? 'wrap.cardLetter' : 'wrap.cardSub')));
      const yes = el('button', 'primary', t('wrap.accept'));
      yes.onclick = () => this.onAnswer(c.wid, true);
      const no = el('button', 'chip', t('wrap.decline'));
      no.onclick = () => this.onAnswer(c.wid, false);
      const btns = el('div', 'gift-card-btns');
      btns.append(no, yes);
      card.append(el('span', 'gift-card-icon', '🎀'), txt, btns);
      return card;
    }));
  }

  // I opened a friend's box: { icon, item, name, letter, clothes }.
  unwrap(info) {
    const parts = [el('div', 'wrap-big', info.icon), el('p', null, t(info.clothes ? 'wrap.gotItem' : 'wrap.gotBag', { item: info.item, name: info.name }))];
    if (info.letter) parts.push(el('p', 'fine', t('wrap.letterComing', { name: info.name })));
    this._show('🎁 ' + t('wrap.unwrapped'), ...parts);
  }

  // A letter from a friend.
  letter(name, text) {
    this._show('💌 ' + t('wrap.letterFrom', { name }), el('div', 'wrap-paper', text), el('p', 'fine', t('wrap.letterKept')));
  }
}
