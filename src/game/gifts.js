// Gifts: buy something in a shop for a friend in the same shop (rules in
// core/gifts.js). Friends only (Yozi 2026-11-12: a list of everyone around is
// hard to pick from): the picker lists friends here, and offers to add the
// others; a game also turns down an offer from someone who isn't its friend. The giver pays now; the friend gets a card to accept, and
// it goes into their bag (or their items, for clothes). No, no answer, or
// someone leaving the shop gives the coins back. Clothes keep a receipt: the
// giver's game tells the server who got them, and the friend's game fetches
// it (core/gift-receipts.js), so the friend can sell them later.
// What a product becomes as a gift here, or null when it can't be one:
// { coins, icon, name, item } (clothes: an item id) or { ..., entry } (a bag entry).
import { COFFEE_SIPS } from '../core/held.js';
import { DINE_TEXT } from './dining.js';
import { FOOD_BITES, coinPrice } from '../core/dining.js';
import { GIFTS_PER_DAY, giftMsg } from '../core/gifts.js';
import { GIFT_TEXT } from '../ui/gift-ui.js';
import { ITEMS } from '../core/inventory.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { SPRAYS, onSale } from '../core/perfume.js';
import { coinsFor, goodsKind, howToGet, itemSoon } from '../ui/shop-ui.js';
import { getLanguage, localName } from '../core/i18n.js';
import { heldFor } from '../ui/counter-ui.js';

export function createGifts(game) {
  const { $, SHOP_ICON, bag, chat, counterUi, giftUi, gifts, inventory, myId, perfumes, refreshItems,
    refreshWallet, safety, shop, storeData } = game;
  function giftFor(store, product) {
    if (!store || !product || product.adopt || product.umbrella || product.rent || !onSale(product) || itemSoon(store, product)) return null;
    const name = product.name;
    const itemId = product.item || product.outfit;
    const it = itemId && ITEMS[itemId];
    if (it?.wear) return it.price > 0 ? { coins: it.price, icon: it.emoji || '👕', name, item: itemId } : null;
    const how = howToGet(store);
    if (how === 'counter') {
      const kind = heldFor(product, store);
      return { coins: coinPrice(product.price),
        icon: kind === 'food' ? '🥐' : kind === 'glass' ? '🍹' : '🥤', name, entry: { kind,
        sips: kind === 'food' ? FOOD_BITES : COFFEE_SIPS, name: localName(name, 'en') } };
    }
    if (how !== 'buy') return null;
    const coins = coinsFor(product.price);
    if (product.perfume) return perfumes.has(product.id) ? { coins, icon: '🧴', name, entry: { kind: 'perfume', p: product.id, sips: SPRAYS, name: localName(name, 'en') } } : null;
    const kind = goodsKind(product), icon = SHOP_ICON[product.model] || '🛍️';
    return { coins, icon, name, entry: kind === 'gift' ? { kind, sips: 1,
      name: localName(name, 'en'), icon } : { kind,
      sips: kind === 'food' ? FOOD_BITES : COFFEE_SIPS, name: localName(name, 'en') } };
  }
  // Everyone I can see in this shop, closest first.
  function peopleHere() {
    if (!game.interior || game.subway.metro) return [];
    const p = game.me.root.position, out = [];
    for (const [id, o] of game.others.players) {
      if (o.hidden) continue;
      const at = o.ch.root.position;
      out.push({ id, name: o.name || '?', d: Math.hypot(at.x - p.x, at.z - p.z) });
    }
    return out.sort((a, b) => a.d - b.d).slice(0, 12);
  }
  const isFriend = (name) => chat?.friendStatus?.(name) === 'friend';
  // The button shows with anyone here, so a player learns gifts are for friends.
  const canGift = (product) => !!giftFor(game.interior?.store, product) && peopleHere().length > 0;
  function startGift(store, product) {
    const g = giftFor(store, product);
    if (!g) return;
    const name = localName(g.name, getLanguage());
    shop.closeProduct();
    counterUi.close();
    const here = peopleHere().map((p) => ({ ...p, status: chat?.friendStatus?.(p.name) || null }));
    const onAdd = (p) => chat?.addFriend?.(p.name);
    giftUi.pick({ icon: g.icon, name, coins: g.coins }, here.filter((p) => p.status === 'friend'), here.filter((p) => p.status !== 'friend'), onAdd, (to) => {
      if (!isFriend(to.name)) { shop.toast(fmt(L(GIFT_TEXT.notFriend), { name: to.name })); return; }
      const why = gifts.why(to.id);
      if (why) { shop.toast(fmt(L(GIFT_TEXT[why]), { name: to.name, n: GIFTS_PER_DAY })); return; }
      if (!game.others.players.has(to.id)) { shop.toast(L(GIFT_TEXT.nobody)); return; }
      if (!game.wallet.spend(g.coins, { name: g.name, at: GIFT_TEXT.ledger })) { shop.toast(fmt(L(DINE_TEXT.poor), { n: g.coins })); return; }
      refreshWallet();
      const gid = gifts.send({ to: to.id, name: to.name, store: store.id, product: product.id, coins: g.coins, paid: game.wallet.lastOp });
      game.net.sendEmote(giftMsg('offer', to.id, gid, store.id, product.id));
      game.sfx.pop?.();
      shop.toast(fmt(L(GIFT_TEXT.sent), { name: to.name }));
    });
  }
  function refundGift(g, reason) {
    if (g.coins > 0) game.wallet.refund(g.coins, g.paid, { name: productById(g.store, g.product)?.name, at: GIFT_TEXT.refund });
    refreshWallet();
    shop.toast(fmt(L(GIFT_TEXT.back[reason] || GIFT_TEXT.back.no), { name: g.name, n: g.coins }));
  }
  const productById = (storeId, productId) => storeData.find((s) => s.id === storeId)?.products?.find((p) => p.id === productId) || null;
  function showGiftCards() {
    giftUi.showCards(gifts.cards().map((c) => {
      const g = giftFor(storeData.find((s) => s.id === c.store), productById(c.store, c.product));
      return { gid: c.gid, name: c.name, item: g ? localName(g.name, getLanguage()) : '?',
        icon: g?.icon || '🎁' };
    }));
  }
  function onGiftMsg(from, m) {
    if (m.to !== myId) return;
    const name = game.others.nameOf(from) || '?';
    if (m.verb === 'offer') {
      if (safety.isBlocked(from, name)) return; // blocked: as if it never came (their coins come back on time out)
      if (!isFriend(name)) { game.net.sendEmote(giftMsg('no', from, m.gid, 'no')); return; } // friends only (an older game may still send)
      const store = storeData.find((s) => s.id === m.store);
      if (!giftFor(store, productById(m.store, m.product))) return; // not something this game version sells
      const r = gifts.heard(from, name, m);
      if (r === 'show') { game.sfx.pop?.(); showGiftCards(); }
      else if (r) game.net.sendEmote(giftMsg('no', from, m.gid, r));
      return;
    }
    const r = gifts.answer(from, m.gid, m.verb);
    if (!r) return;
    if (m.verb === 'ok') {
      const g = giftFor(storeData.find((s) => s.id === r.gift.store), productById(r.gift.store, r.gift.product));
      if (g?.item) game.giftReceipts?.bind(r.gift.paid, from, g.item);
      game.sfx.pop?.();
      shop.toast(fmt(L(GIFT_TEXT.accepted), { name: r.gift.name, item: localName(productById(r.gift.store, r.gift.product)?.name, getLanguage()) || '🎁' }));
    } else refundGift(r.gift, m.reason);
  }
  // I tapped Accept or No thanks on a card.
  function answerGift(gid, ok) {
    const c = gifts.reply(gid, ok);
    showGiftCards();
    if (!c) return;
    const g = giftFor(storeData.find((s) => s.id === c.store), productById(c.store, c.product));
    if (!ok || !g) { game.net.sendEmote(giftMsg('no', c.from, gid, 'no')); return; }
    const item = localName(g.name, getLanguage());
    if (g.item) {
      if (inventory.has(g.item)) { game.net.sendEmote(giftMsg('no', c.from, gid, 'have')); shop.toast(fmt(L(GIFT_TEXT.mineHave), { item, name: c.name })); return; }
      inventory.add(g.item);
      // The receipt: once the giver's game has told the server (a few tries).
      for (const ms of [8000, 30000, 90000]) setTimeout(() => game.giftReceipts?.sync(inventory, game.receipts, ITEMS).catch(() => {}), ms);
      if (!$('wallet-panel').hidden || !$('bag-panel').hidden) refreshItems();
      shop.toast(fmt(L(GIFT_TEXT.gotItem), { item, name: c.name }));
    } else {
      if (!bag.add(g.entry)) { game.net.sendEmote(giftMsg('no', c.from, gid, 'full')); shop.toast(fmt(L(GIFT_TEXT.mineFull), { name: c.name })); return; }
      shop.toast(fmt(L(GIFT_TEXT.gotBag), { item, name: c.name }));
    }
    game.sfx.pop?.();
    game.net.sendEmote(giftMsg('ok', c.from, gid));
  }
  // Changing room (leaving a shop): every gift still waiting is called off.
  function dropGifts() {
    for (const g of gifts.cancelAll()) refundGift(g, 'gone');
    giftUi.close();
    showGiftCards();
  }
  setInterval(() => {
    const gone = (id) => !game.others.players.has(id);
    for (const g of gifts.expire(gone)) refundGift(g, gone(g.to) ? 'gone' : 'late');
    const stale = gifts.stale(gone);
    for (const c of stale) if (!gone(c.from)) game.net.sendEmote(giftMsg('no', c.from, c.gid, 'late'));
    if (stale.length) showGiftCards();
    if (giftUi.open && !game.interior) giftUi.close();
  }, 1000);
  return { answerGift, dropGifts, onGiftMsg, canGift, startGift, peopleHere };
}
