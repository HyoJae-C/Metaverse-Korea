// Lipstick and blush (rules and text in core/lipstick.js): bought at a lip
// shop's mirror, kept in the wardrobe, put on anywhere.
//
// game: { me, shop, sfx, wallet, interior, bag, myLook } as getters, plus
// setLook, saveLook, refreshWallet, showBubble.
import { LIPSTICK_TEXT, LIPSTICK_USES, STICKS, applyLipstick, shadeHex, shadeName, stickEntry } from '../core/lipstick.js';
import { VANITY_MAX } from '../core/bag.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { t } from '../core/i18n.js';

// The ledger and wardrobe name in every language: 'Lipstick · Scarlet', 'Blush · Peach'.
const nameOf = (kind, c) => Object.fromEntries(Object.entries(kind === 'blush' ? LIPSTICK_TEXT.blushName : LIPSTICK_TEXT.name).map(([k, s]) => [k, fmt(s, { shade: shadeName(c) })]));

export function createLipstick(game) {
  const name = (kind, c) => L(nameOf(kind, c));
  const icon = (kind) => STICKS[kind]?.icon || '💄';
  // At the mirror: pay, and it goes into the wardrobe (bag.vanity). True if bought.
  function buy(kind, c, coins) {
    const e = stickEntry({ kind, c, sips: LIPSTICK_USES });
    if (!e) return false;
    if (game.bag.vanityList().length >= VANITY_MAX) { game.shop.toast(L(LIPSTICK_TEXT.full)); return false; }
    if (!game.wallet.spend(coins, { name: nameOf(kind, c), at: game.interior?.store?.name })) {
      game.shop.toast(t('pet.noCoins', { n: coins - game.wallet.coins }));
      return false;
    }
    game.refreshWallet();
    game.bag.addVanity(e);
    game.shop.toast(fmt(L(LIPSTICK_TEXT.got), { name: name(kind, c) }));
    return true;
  }
  // Put one on (from the hand or the wardrobe): the colour goes on and
  // stays. Returns what's left (null once used up).
  function apply(entry) {
    const r = applyLipstick(entry, game.myLook);
    if (!r) return null;
    const { kind, c } = entry;
    game.saveLook(r.look);
    game.setLook(r.look);
    game.me.play('clap');
    game.sfx.pop?.();
    game.showBubble(icon(kind) + ' ' + name(kind, c));
    const msg = fmt(L(r.left > 0 ? LIPSTICK_TEXT.applied : LIPSTICK_TEXT.last), { name: name(kind, c), n: r.left });
    game.shop.toast(kind === 'lipstick' ? msg : msg.replace('💄', icon(kind)));
    return r.held;
  }
  const describe = (e) => ({ emoji: icon(e.kind), dot: shadeHex(e.c, e.kind), name: name(e.kind, e.c), desc: fmt(L(LIPSTICK_TEXT.desc), { n: e.sips }).replace('💄', icon(e.kind)), canHold: true });
  return { buy, apply, describe, icon, label: () => L(LIPSTICK_TEXT.apply) };
}
