// Lipstick (rules and text in core/lipstick.js): bought at a lip shop's
// mirror, carried in the bag, put on anywhere from the hand.
//
// game: { me, shop, sfx, wallet, interior, bag, myLook } as getters, plus
// setLook, saveLook, refreshWallet, showBubble.
import { LIPSTICK_TEXT, LIPSTICK_USES, applyLipstick, lipstickEntry, shadeHex, shadeName } from '../core/lipstick.js';
import { VANITY_MAX } from '../core/bag.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { t } from '../core/i18n.js';

// The ledger and bag name in every language: 'Lipstick · Scarlet'.
const nameOf = (c) => Object.fromEntries(Object.entries(LIPSTICK_TEXT.name).map(([k, s]) => [k, fmt(s, { shade: shadeName(c) })]));

export function createLipstick(game) {
  const name = (c) => L(nameOf(c));
  // At the mirror: pay, and the lipstick goes into your hand (what you held
  // goes into the bag). True if bought.
  // At the mirror: pay, and the lipstick goes into the wardrobe (bag.vanity).
  // True if bought.
  function buy(c, coins) {
    const e = lipstickEntry({ c, sips: LIPSTICK_USES });
    if (!e) return false;
    if (game.bag.vanityList().length >= VANITY_MAX) { game.shop.toast(L(LIPSTICK_TEXT.full)); return false; }
    if (!game.wallet.spend(coins, { name: nameOf(c), at: game.interior?.store?.name })) {
      game.shop.toast(t('pet.noCoins', { n: coins - game.wallet.coins }));
      return false;
    }
    game.refreshWallet();
    game.bag.addVanity(e);
    game.shop.toast(fmt(L(LIPSTICK_TEXT.got), { name: name(c) }));
    return true;
  }
  // Put one on (from the hand or the wardrobe): the colour goes on and
  // stays. Returns what's left of the lipstick (null once used up).
  function apply(entry) {
    const r = applyLipstick(entry, game.myLook);
    if (!r) return null;
    const c = entry.c;
    game.saveLook(r.look);
    game.setLook(r.look);
    game.me.play('clap');
    game.sfx.pop?.();
    game.showBubble('💄 ' + name(c));
    game.shop.toast(fmt(L(r.left > 0 ? LIPSTICK_TEXT.applied : LIPSTICK_TEXT.last), { name: name(c), n: r.left }));
    return r.held;
  }
  const describe = (e) => ({ emoji: '💄', dot: shadeHex(e.c), name: name(e.c), desc: fmt(L(LIPSTICK_TEXT.desc), { n: e.sips }), canHold: true });
  return { buy, apply, describe, label: () => L(LIPSTICK_TEXT.apply) };
}
