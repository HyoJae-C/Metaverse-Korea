// Tarot reading at the tarot cafés: pick a kind of reading (past/present/
// future, dating luck, love luck or money luck), pay, the reader shuffles the
// 78 cards, you pick three face-down cards, they flip over and the reader
// explains each. Dating and love readings can be done with a friend sitting at
// the same table: you pick the first card, they pick the second on their
// screen, you pick the third for the two of you. Just for fun; the deck is in
// data/tarot.js, the messages in core/tarot-queue.js.
import { TAROT_CARDS, TAROT_COST, TOPICS, PAIR_POSITIONS, topicById, cardText, cardMark, shuffleDeck, seeded } from '../data/tarot.js';
import { L, fmt } from './pocha-ui.js';

export const SPREAD = 22; // face-down cards fanned out to pick from (the top of the shuffled deck)

export const TAROT_UI_TEXT = {
  title: { en: 'Tarot reading', ko: '타로 보기', ja: 'タロット占い', zh: '塔罗占卜' },
  howTo: {
    en: 'Choose a reading, think of your question, then pick three cards from the 78-card deck.',
    ko: '보고 싶은 운세를 고르고, 질문을 떠올린 뒤 78장 덱에서 카드 세 장을 골라요.',
    ja: '占いの種類を選び、質問を思い浮かべて、78枚のデッキから3枚選んでください。',
    zh: '选择占卜类型，想好问题，然后从78张牌中选三张。',
  },
  fun: {
    en: 'Just for fun! These readings are not real fortune-telling and have no scientific basis at all. Your future is yours to make.',
    ko: '재미로만 봐 주세요! 실제 운세와는 다르며 과학적 근거가 전혀 없어요. 미래는 직접 만드는 거예요.',
    ja: 'お遊びとして楽しんでください！本当の占いとは違い、科学的根拠はまったくありません。未来は自分でつくるもの。',
    zh: '仅供娱乐！这些占卜不是真正的算命，完全没有科学依据。未来由你自己创造。',
  },
  pick: { en: 'Pick a card: {pos} ({i}/3)', ko: '카드를 골라 주세요: {pos} ({i}/3)', ja: 'カードを選んで：{pos}（{i}/3）', zh: '请选一张牌：{pos}（{i}/3）' },
  theirPick: { en: '{name} is picking: {pos} ({i}/3)', ko: '{name} 님이 고르는 중: {pos} ({i}/3)', ja: '{name}さんが選んでいます：{pos}（{i}/3）', zh: '{name}正在选：{pos}（{i}/3）' },
  done: { en: 'Your reading', ko: '타로 풀이', ja: 'あなたの占い結果', zh: '你的占卜结果' },
  noCoins: { en: 'You need 🪙 {n}.', ko: '🪙 {n}개가 필요해요.', ja: '🪙 {n}枚必要です。', zh: '需要 🪙 {n}。' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  again: { en: 'Another reading', ko: '다른 운세 보기', ja: '別の占い', zh: '再占一次' },
  together: { en: '👫 Read together with {name}', ko: '👫 {name} 님과 같이 보기', ja: '👫 {name}さんと一緒に占う', zh: '👫 和{name}一起占' },
  togetherHint: {
    en: 'Dating and love luck can be read together with a friend sitting beside you.',
    ko: '연애운과 애정운은 옆자리에 앉은 친구와 같이 볼 수 있어요.',
    ja: '恋愛運と愛情運は、隣に座った友達と一緒に占えます。',
    zh: '恋爱运和爱情运可以和坐在旁边的朋友一起占。',
  },
  waiting: { en: 'Asking {name} to join…', ko: '{name} 님에게 같이 보자고 했어요…', ja: '{name}さんを誘っています…', zh: '正在邀请{name}…' },
  cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消' },
  offer: { en: '{name} wants to read {topic} with you. It\'s their treat!', ko: '{name} 님이 {topic}을 같이 보자고 해요. {name} 님이 낼게요!', ja: '{name}さんが{topic}を一緒に占おうと誘っています。おごりです！', zh: '{name}想和你一起占{topic}。TA请客！' },
  join: { en: 'Join', ko: '같이 보기', ja: '参加する', zh: '加入' },
  decline: { en: 'No thanks', ko: '괜찮아요', ja: '遠慮する', zh: '不了' },
  declined: { en: '{name} can\'t join right now.', ko: '{name} 님은 지금 같이 볼 수 없대요.', ja: '{name}さんは今は参加できません。', zh: '{name}现在不能加入。' },
  left: { en: '{name} left the reading. You can pick the rest.', ko: '{name} 님이 자리를 떠났어요. 남은 카드는 직접 골라요.', ja: '{name}さんが席を離れました。残りはあなたが選んで。', zh: '{name}离开了。剩下的牌由你来选。' },
  pairDone: { en: 'Your reading together', ko: '두 사람의 타로 풀이', ja: 'ふたりの占い結果', zh: '你们俩的占卜结果' },
};
const T = TAROT_UI_TEXT;
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const cardById = (n) => TAROT_CARDS[n];
const button = (cls, text, onclick) => { const b = el('button', cls, text); b.onclick = onclick; return b; };

// The face of a card: numeral or rank, symbol and name (made here, not a scan of a deck).
export function cardFace(card) {
  const f = el('div', 'tarot-face' + (card.suit ? ' minor ' + card.suit : ''));
  f.append(el('span', 'tarot-num', cardMark(card)), el('span', 'tarot-icon', card.icon), el('span', 'tarot-name', L(card.name)));
  return f;
}

// Who picks the k-th card in a reading together: the host the 1st and 3rd,
// the friend the 2nd.
export const pairTurnIsHost = (k) => k !== 1;

export class TarotUI {
  // wallet: { spend(n, note) }; onRead(cards, topic): after the third card
  // flips; partner(): { id, name } of a friend at the same table, or null;
  // send(verb, to, a, b): a message to them; myName(): our own name.
  constructor({ root, wallet, onRead, onPick, partner = () => null, send = () => {}, myName = () => '', toast = () => {}, rand = Math.random }) {
    Object.assign(this, { root, wallet, onRead, onPick, partner, send, myName, toast, rand });
    this.state = null; // { topic, deck, picked, taken, pair?: { host, other, a, b } }
    this.inviting = null; // { to, name, topic }: waiting for a friend to join
    this.offer = null; // { from, name, topic }: a friend asked us
  }
  get open() { return !this.root.hidden; }
  show() {
    this.root.hidden = false;
    if (this.state?.picked.length === 3) this.state = null;
    this.render();
  }
  close() {
    this.root.hidden = true;
    this.leave();
  }
  // Stop any reading together (we stood up, closed the panel, left the shop).
  leave() {
    const s = this.state;
    if (s?.pair && s.picked.length < 3) this.send('bye', s.pair.other);
    if (this.inviting) this.send('bye', this.inviting.to);
    if (this.offer) this.send('no', this.offer.from);
    this.state = this.inviting = this.offer = null;
  }

  start(topic) {
    if (!this.wallet.spend(TAROT_COST, { name: T.title })) { this.render(tt('noCoins', { n: TAROT_COST })); return; }
    this.state = { topic, deck: shuffleDeck(this.rand), picked: [], taken: [] };
    this.render();
  }

  // Reading together: ask the friend beside us.
  invite(topic) {
    const p = this.partner();
    if (!p) return;
    this.inviting = { to: p.id, name: p.name, topic };
    this.send('invite', p.id, topic);
    this.render();
  }

  // A message from another player (already checked to be addressed to us).
  heard(from, name, { verb, a, b }) {
    if (verb === 'invite' && topicById(a).pairable && a === topicById(a).id) {
      if (this.state && this.state.picked.length < 3) { this.send('no', from); return false; }
      this.offer = { from, name, topic: a };
      if (this.open) this.render();
      return true; // (main shows a toast and the action button)
    }
    if (verb === 'no' && this.inviting?.to === from) {
      this.inviting = null;
      this.render(tt('declined', { name }));
    } else if (verb === 'join' && this.inviting?.to === from) {
      const topic = this.inviting.topic;
      this.inviting = null;
      if (!this.wallet.spend(TAROT_COST, { name: T.title })) { this.send('no', from); this.render(tt('noCoins', { n: TAROT_COST })); return false; }
      const seed = Math.floor(this.rand() * 1e9);
      this.state = { topic, deck: shuffleDeck(seeded(seed)), picked: [], taken: [], pair: { host: true, other: from, a: this.myName(), b: name } };
      this.send('deal', from, topic, seed);
      this.render();
    } else if (verb === 'deal' && this.offer?.from === from && this.offer.accepted) {
      this.offer = null;
      this.state = { topic: topicById(a).id, deck: shuffleDeck(seeded(b || 0)), picked: [], taken: [], pair: { host: false, other: from, a: name, b: this.myName() } };
      this.root.hidden = false;
      this.render();
    } else if (verb === 'pick' && this.state?.pair?.other === from) {
      const k = this.state.picked.length;
      if (k < 3 && pairTurnIsHost(k) !== this.state.pair.host) this.pick(Number(a), true);
    } else if (verb === 'bye') {
      if (this.offer?.from === from) { this.offer = null; if (this.open) this.render(); }
      if (this.inviting?.to === from) { this.inviting = null; this.render(tt('declined', { name })); }
      const s = this.state;
      if (s?.pair?.other === from && s.picked.length < 3) { s.pair.gone = true; this.render(tt('left', { name })); }
    }
    return false;
  }

  accept() {
    if (!this.offer) return;
    this.offer.accepted = true;
    this.send('join', this.offer.from);
    this.render();
  }
  decline() {
    if (this.offer) this.send('no', this.offer.from);
    this.offer = null;
    this.render();
  }

  myTurn() {
    const s = this.state;
    if (!s || s.picked.length >= 3) return false;
    return !s.pair || s.pair.gone || pairTurnIsHost(s.picked.length) === s.pair.host;
  }

  pick(i, remote = false) {
    const s = this.state;
    if (!s || s.picked.length >= 3 || !(i >= 0 && i < SPREAD) || s.taken.includes(i)) return;
    if (!remote && !this.myTurn()) return;
    s.picked.push(s.deck[i]);
    s.taken.push(i);
    if (!remote && s.pair && !s.pair.gone) this.send('pick', s.pair.other, String(i));
    this.onPick?.(s.picked.length);
    this.render();
    if (s.picked.length === 3) this.onRead?.(s.picked.map(cardById), s.topic, !!s.pair);
  }

  positions() {
    const s = this.state;
    if (s?.pair) return PAIR_POSITIONS.map((p) => ({ id: p.id, label: fmt(L(p.name), { a: s.pair.a, b: s.pair.b }) }));
    return topicById(s?.topic).positions.map((p) => ({ id: p.id, label: L(p.name) }));
  }

  menu(parts) {
    parts.push(el('p', 'order-hint', tt('howTo')));
    if (this.offer) {
      const t = topicById(this.offer.topic);
      const box = el('div', 'tarot-offer');
      box.append(el('p', null, tt('offer', { name: this.offer.name, topic: L(t.name) })));
      if (!this.offer.accepted) {
        const row = el('div', 'order-actions');
        row.append(button('primary', '💞 ' + tt('join'), () => this.accept()), button('', tt('decline'), () => this.decline()));
        box.append(row);
      } else box.append(el('p', 'fine', '…'));
      parts.push(box);
      return;
    }
    if (this.inviting) {
      const box = el('div', 'tarot-offer');
      box.append(el('p', null, tt('waiting', { name: this.inviting.name })), button('', tt('cancel'), () => { this.send('bye', this.inviting.to); this.inviting = null; this.render(); }));
      parts.push(box);
      return;
    }
    const friend = this.partner();
    const list = el('div', 'tarot-topics');
    for (const t of TOPICS) {
      const row = el('div', 'tarot-topic');
      row.append(button('primary', `${t.icon} ${L(t.name)} · 🪙 ${TAROT_COST}`, () => this.start(t.id)));
      if (t.pairable && friend) row.append(button('tarot-together', tt('together', { name: friend.name }), () => this.invite(t.id)));
      list.append(row);
    }
    parts.push(list);
    if (!friend) parts.push(el('p', 'fine', tt('togetherHint')));
  }

  render(note) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const s = this.state;
    const topic = topicById(s?.topic);
    const parts = [x, el('h3', null, (s ? topic.icon + ' ' + L(topic.name) : '🔮 ' + tt('title')))];
    if (!s) {
      this.menu(parts);
      parts.push(el('p', 'fine tarot-fun', tt('fun')));
      if (note) parts.push(el('p', 'order-hint claw-note', note));
      this.root.replaceChildren(...parts);
      return;
    }
    const pos = this.positions();
    // The three slots.
    const slots = el('div', 'tarot-slots');
    pos.forEach((p, k) => {
      const slot = el('div', 'tarot-slot');
      const n = s.picked[k];
      const card = el('div', 'tarot-card' + (n != null ? ' up' : ''));
      if (n != null) card.append(cardFace(cardById(n)));
      slot.append(el('b', null, p.label), card);
      slots.append(slot);
    });
    parts.push(slots);
    if (s.picked.length < 3) {
      const k = s.picked.length;
      const mine = this.myTurn();
      parts.push(el('p', 'order-hint', mine ? tt('pick', { pos: pos[k].label, i: k + 1 }) : tt('theirPick', { name: s.pair.host ? s.pair.b : s.pair.a, pos: pos[k].label, i: k + 1 })));
      const spread = el('div', 'tarot-spread' + (mine ? '' : ' wait'));
      for (let i = 0; i < SPREAD; i++) {
        const b = el('button', 'tarot-back');
        b.setAttribute('aria-label', String(i + 1));
        b.style.setProperty('--tilt', `${(i - (SPREAD - 1) / 2) * 1.6}deg`);
        if (s.taken.includes(i)) b.classList.add('taken');
        b.disabled = s.taken.includes(i) || !mine;
        b.onclick = () => this.pick(i);
        spread.append(b);
      }
      parts.push(spread);
    } else {
      const list = el('div', 'tarot-reading');
      s.picked.forEach((n, k) => {
        const card = cardById(n);
        const row = el('p', null);
        row.append(el('b', null, `${pos[k].label} · ${card.icon} ${L(card.name)}`), el('span', null, L(cardText(card, s.topic))));
        list.append(row);
      });
      parts.push(el('h4', null, tt(s.pair ? 'pairDone' : 'done')), list);
    }
    parts.push(el('p', 'fine tarot-fun', tt('fun')));
    if (note) parts.push(el('p', 'order-hint claw-note', note));
    if (s.picked.length === 3) {
      const actions = el('div', 'order-actions');
      actions.append(button('primary', '🃏 ' + tt('again'), () => { this.state = null; this.render(); }));
      parts.push(actions);
    }
    this.root.replaceChildren(...parts);
  }
}
