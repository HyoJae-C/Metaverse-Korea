// Wrapped gifts: buy it gift-wrapped in a shop, carry the box in the bag, and
// hand it to a friend standing next to you (rules in core/wrap.js). A letter
// on letter paper (stationery shops) can go in the box.
//
// game: { $, bag, chat, gifts (game/gifts.js: giftFor, productById), inventory,
//   receipts, giftReceipts, myId, safety, shop, storeData, refreshItems(),
//   refreshWallet() } and getters me, others, net, wallet, sfx, subway, interior.
import { ITEMS } from '../core/inventory.js';
import { LETTER_MARK, SHEETS_MAX, WRAP_RANGE, WrapDesk, cleanLetter, newWrapId, wrapMsg } from '../core/wrap.js';
import { getLanguage, localName, t } from '../core/i18n.js';
import { lazyPanel } from '../core/lazy-panel.js';

// The ledger note's place: 🎁 lets the server bind it as a gift (gift_bind), 🎀 says it was wrapped.
const WRAP_AT = { en: '🎁🎀 Gift-wrapped' };

export function createWrapGifts(game) {
  const { bag, chat, inventory, myId, safety, shop, storeData } = game;
  const desk = new WrapDesk();
  const ui = lazyPanel(() => import('../ui/wrap-ui.js').then(({ WrapUI }) => new WrapUI({ onAnswer: (wid, ok) => answer(wid, ok) })));
  const storeOf = (id) => storeData.find((s) => s.id === id);
  const inside = (e) => game.gifts.giftFor(storeOf(e.s), game.gifts.productById(e.s, e.p));
  const nameOf = (g) => (g ? localName(g.name, getLanguage()) : '?');
  const isFriend = (name) => chat?.friendStatus?.(name) === 'friend';
  const boxAt = (wid) => bag.list().findIndex((e) => e.kind === 'wrap' && e.w === wid);
  const letterAt = () => bag.list().findIndex((e) => e.kind === 'letter');

  // Friends standing next to me (anywhere but on the subway), closest first.
  function friendsNear() {
    if (game.subway?.metro) return [];
    const p = game.me.root.position, out = [];
    for (const [id, o] of game.others.players) {
      if (o.hidden || !isFriend(o.name)) continue;
      const at = o.ch.root.position, d = Math.hypot(at.x - p.x, at.z - p.z);
      if (d <= WRAP_RANGE) out.push({ id, name: o.name, d });
    }
    return out.sort((a, b) => a.d - b.d).slice(0, 8);
  }

  // A sheet of letter paper used for a letter: the slot loses one.
  function useSheet() {
    const i = letterAt();
    if (i < 0) return false;
    const e = bag.list()[i];
    if (e.sips > 1) bag.swap(i, { kind: 'letter', sips: e.sips - 1 });
    else bag.take(i);
    return true;
  }
  const sheets = () => bag.list()[letterAt()]?.sips || 0;

  // ---- In the shop ----
  const canWrap = (product) => !!game.gifts.giftFor(game.interior?.store, product);
  function wrap(store, product) {
    const g = game.gifts.giftFor(store, product);
    if (!g) return;
    if (bag.full) { shop.toast(t('wrap.bagFull')); return; }
    const pay = (lt) => {
      if (bag.full) { shop.toast(t('wrap.bagFull')); return; }
      if (!game.wallet.spend(g.coins, { name: localName(g.name, 'en').slice(0, 40), at: WRAP_AT })) { shop.toast(t('wrap.poor', { n: g.coins })); return; }
      game.refreshWallet();
      const box = { kind: 'wrap', w: newWrapId(), s: store.id, p: product.id, c: g.coins, op: game.wallet.lastOp || null };
      if (lt && useSheet()) box.lt = lt;
      bag.add(box);
      game.sfx.pop?.();
      shop.toast(t(box.lt ? 'wrap.boughtLetter' : 'wrap.bought', { item: nameOf(g) }));
    };
    shop.closeProduct();
    if (!sheets()) { pay(''); return; }
    ui.write({ item: nameOf(g), icon: g.icon, coins: g.coins, sheets: sheets() }, (lt) => pay(cleanLetter(lt)));
  }
  // Letter paper from a stationery shop: sheets in one bag slot.
  function buyLetter(product, coins) {
    const i = letterAt(), have = sheets(), n = Math.max(1, product.letter | 0);
    if (have + n > SHEETS_MAX) { shop.toast(t('wrap.paperMax', { n: SHEETS_MAX })); return false; }
    if (i < 0 && bag.full) { shop.toast(t('wrap.bagFull')); return false; }
    if (!game.wallet.spend(coins, { name: product.name, at: game.interior?.store.name })) { shop.toast(t('wrap.poor', { n: coins })); return false; }
    game.refreshWallet();
    if (i >= 0) bag.swap(i, { kind: 'letter', sips: have + n });
    else bag.add({ kind: 'letter', sips: n });
    game.sfx.pop?.();
    shop.toast(t('wrap.paperGot', { n: have + n }));
    return true;
  }

  // ---- In the bag ----
  function describe(e) {
    if (e.kind === 'letter') return { emoji: '✉️', name: t('wrap.paperName'), desc: t('wrap.paperDesc', { n: e.sips }), canHold: false };
    const g = inside(e);
    return { emoji: '🎁', name: t('wrap.boxName'), desc: t('wrap.boxDesc', { item: nameOf(g) }) + (e.lt ? ' ' + t('wrap.hasLetter') : ''), canHold: false, keep: true };
  }
  // The box's buttons in the bag: hand it over, add a letter, open it myself.
  // done(): close the bag panel; redraw(): draw it again.
  function actions(e, done, redraw) {
    if (e.kind !== 'wrap') return [];
    const btn = (label, fn, on) => { const b = document.createElement('button'); b.className = 'chip' + (on ? ' on' : ''); b.textContent = label; b.onclick = fn; return b; };
    const out = [btn('🎁 ' + t('wrap.give'), () => { done(); give(e.w); }, true)];
    if (!e.lt && sheets()) out.push(btn('💌 ' + t('wrap.addLetter'), () => { done(); addLetter(e.w); }));
    out.push(btn('📦 ' + t('wrap.open'), () => { if (confirm(t('wrap.openAsk'))) { openMine(e.w); redraw(); } }));
    if (desk.pending(e.w)) for (const b of out) b.disabled = true;
    return out;
  }
  function addLetter(wid) {
    const e = bag.list()[boxAt(wid)];
    if (!e || e.lt || !sheets()) return;
    const g = inside(e);
    ui.write({ item: nameOf(g), icon: '🎁', sheets: sheets() }, (text) => {
      const lt = cleanLetter(text), i = boxAt(wid);
      if (!lt || i < 0 || !useSheet()) return;
      bag.swap(boxAt(wid), { ...bag.list()[boxAt(wid)], lt });
      shop.toast(t('wrap.letterIn'));
    });
  }
  // Open it myself: what's inside is mine (clothes keep my purchase as their receipt).
  function openMine(wid) {
    const i = boxAt(wid), e = bag.list()[i];
    if (!e || desk.pending(wid)) return;
    const g = inside(e);
    if (!g) { shop.toast(t('wrap.gone')); return; }
    if (g.item) {
      if (inventory.has(g.item)) { shop.toast(t('wrap.openHave', { item: nameOf(g) })); return; }
      bag.take(i);
      inventory.add(g.item);
      game.receipts.record(g.item, e.c, e.op, { name: localName(g.name, 'en').slice(0, 40), at: WRAP_AT });
      game.refreshItems();
    } else if (!bag.swap(i, g.entry)) return;
    game.sfx.pop?.();
    shop.toast(t('wrap.opened', { item: nameOf(g) }));
  }
  function give(wid) {
    const e = bag.list()[boxAt(wid)];
    if (!e) return;
    ui.pick(friendsNear(), (to) => {
      if (!isFriend(to.name) || !game.others.players.has(to.id)) { shop.toast(t('wrap.nobody')); return; }
      if (desk.why(wid, to.id)) { shop.toast(t('wrap.waiting', { name: to.name })); return; }
      if (boxAt(wid) < 0) return;
      desk.offer(wid, to.id, to.name);
      game.net.sendEmote(wrapMsg('offer', to.id, wid, e.s, e.p, !!e.lt));
      game.me.wave?.();
      game.sfx.pop?.();
      shop.toast(t('wrap.offered', { name: to.name }));
    });
  }

  // ---- Messages ----
  const showCards = () => { if (desk.cards().length || ui.loaded) ui.showCards(desk.cards().map((c) => ({ wid: c.wid, name: c.name, letter: c.letter }))); };
  const expecting = new Map(); // giver name -> until (ms): their letter is on its way
  function onMsg(from, m) {
    if (m.to !== myId) return;
    const name = game.others.nameOf(from) || '?';
    if (m.verb === 'offer') {
      if (safety.isBlocked(from, name)) return;
      if (!isFriend(name)) { game.net.sendEmote(wrapMsg('no', from, m.wid, 'no')); return; }
      if (!game.gifts.giftFor(storeOf(m.store), game.gifts.productById(m.store, m.product))) return; // not sold in this game version
      const r = desk.heard(from, name, m);
      if (r === 'show') { game.sfx.pop?.(); showCards(); } else if (r) game.net.sendEmote(wrapMsg('no', from, m.wid, r));
      return;
    }
    const g = desk.answer(from, m.wid);
    if (!g) return;
    if (m.verb === 'no') { shop.toast(t('wrap.no.' + m.reason, { name: g.name })); return; }
    // Taken: the box leaves my bag, clothes get their receipt, and the letter goes.
    const i = boxAt(m.wid), e = bag.list()[i];
    if (!e) return;
    bag.take(i);
    const what = inside(e);
    if (what?.item && e.op) game.giftReceipts?.bind(e.op, from, what.item);
    if (e.lt) {
      const uid = chat?.friendUid?.(g.name);
      if (uid) chat.sendLetter(uid, LETTER_MARK + e.lt);
    }
    game.sfx.pop?.();
    shop.toast(t('wrap.taken', { name: g.name, item: nameOf(what) }));
  }
  function answer(wid, ok) {
    const c = desk.reply(wid, ok);
    showCards();
    if (!c) return;
    const g = game.gifts.giftFor(storeOf(c.store), game.gifts.productById(c.store, c.product));
    if (!ok || !g) { game.net.sendEmote(wrapMsg('no', c.from, wid, 'no')); return; }
    const item = nameOf(g);
    if (g.item) {
      if (inventory.has(g.item)) { game.net.sendEmote(wrapMsg('no', c.from, wid, 'have')); shop.toast(t('wrap.mineHave', { item, name: c.name })); return; }
      inventory.add(g.item);
      for (const ms of [8000, 30000, 90000]) setTimeout(() => game.giftReceipts?.sync(inventory, game.receipts, ITEMS).catch(() => {}), ms); // (the receipt, once the giver's game has told the server)
      game.refreshItems();
    } else if (!bag.add(g.entry)) { game.net.sendEmote(wrapMsg('no', c.from, wid, 'full')); shop.toast(t('wrap.mineFull', { name: c.name })); return; }
    game.net.sendEmote(wrapMsg('ok', c.from, wid));
    game.sfx.pop?.();
    if (c.letter) expecting.set(c.name, Date.now() + 2 * 60 * 1000);
    ui.unwrap({ icon: g.icon, item, name: c.name, letter: c.letter, clothes: !!g.item });
  }
  // A friend message came in (game/chat.js): a letter from someone whose box I just opened opens on screen.
  function onLetter(name, body) {
    const until = expecting.get(name);
    if (!until || until < Date.now() || !String(body).startsWith(LETTER_MARK)) return;
    expecting.delete(name);
    ui.letter(name, String(body).slice(LETTER_MARK.length));
  }
  setInterval(() => {
    const gone = (id) => !game.others.players.has(id);
    for (const g of desk.expire(gone)) shop.toast(t(gone(g.to) ? 'wrap.no.gone' : 'wrap.no.late', { name: g.name }));
    const stale = desk.stale(gone);
    for (const c of stale) if (!gone(c.from)) game.net.sendEmote(wrapMsg('no', c.from, c.wid, 'late'));
    if (stale.length) showCards();
  }, 1000);
  return { canWrap, wrap, buyLetter, describe, actions, onMsg, onLetter, friendsNear };
}
