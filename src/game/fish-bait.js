// Fishing bait (core/bait.js): bought at the bait stall by a Han River
// park's fish buyer, carried in the bag, taken in the hand and put on the
// hook with the use button (like perfume). Fishing then uses one a bite.
// Small on purpose: this is in the first download; the stall's panel and
// its till load the first time it opens.
//
// game: { root (the panel's element), cloud, wallet, bag, toast(m),
// refreshWallet(), me, sfx, showBubble(text) } as getters where they change.
import { t } from '../core/i18n.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { BaitHook, baitById, baitEntry } from '../core/bait.js';
import { DEFAULT_LOOK } from '../data/appearance.js';

// The bait stall's old fisherman: silver hair, glasses, a grey bucket hat
// and a zipped fishing vest with pockets (Yozi 2026-11-13).
const SELLER_LOOK = { ...DEFAULT_LOOK, model: 'vest-fishing', shirt: 'leaf', pants: 'olive', hair: 'ash', dye: 'silver', hairStyle: 'buzz', skin: 'warm', head: 'bucket-grey', face: 'glasses' };
// What he says when you come to the stall.
const SELLER_LINES = [
  ['좋은 미끼가 좋은 손맛을 부르지!', 'joeun mikkiga joeun sonmaseul bureuji!', 'bait.hi1'],
  ['오늘은 물때가 좋아!', 'oneureun multtaega joa!', 'bait.hi2'],
];

export function createFishBait(game) {
  const hook = new BaitHook();
  const name = (b) => t('bait.' + b.id);

  // The till: in Supabase when signed in, else in this browser.
  let mod = null, till = null;
  const store = () => {
    const live = game.cloud.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(till instanceof mod.SupabaseBaitShop)) till = new mod.SupabaseBaitShop(game.cloud, game.wallet);
    if (!live && !till) till = new mod.LocalBaitShop(game.wallet);
    return till;
  };
  const ui = lazyPanel(() => Promise.all([import('../core/bait-shop.js'), import('../ui/bait-ui.js')]).then(([m, { BaitUI }]) => {
    mod = m;
    return new BaitUI({
      root: game.root, store, wallet: game.wallet, toast: game.toast, name,
      room: () => !game.bag.full,
      onBought: (b, n) => {
        game.bag.add({ kind: 'bait', b: b.id, sips: n });
        game.refreshWallet();
        game.sfx.pop?.();
        game.toast(t('bait.bought', { name: name(b) }));
      },
    });
  }), { busy: false });

  // Put the bait in the hand on the hook. What was on the hook before goes
  // back into the bag (if it fits). Returns what's left in the hand (null).
  function apply(entry) {
    const e = baitEntry(entry);
    if (!e) return entry;
    const b = baitById(e.b);
    const was = hook.bait;
    if (was && was.id !== e.b && game.bag.full) { game.toast(t('bait.bagFull')); return entry; }
    if (was && was.id === e.b) { // the same kind: topped up (the leftover stays in the hand)
      const room = 5 - hook.left, add = Math.min(room, e.sips);
      if (!add) { game.toast(t('bait.on', { name: name(b), n: hook.left, p: b.rare })); return entry; }
      hook.put({ kind: 'bait', b: e.b, sips: hook.left + add });
      done(b);
      return e.sips - add > 0 ? { ...e, sips: e.sips - add } : null;
    }
    const old = hook.put(e);
    if (old) game.bag.add(old);
    done(b);
    return null;
  }
  function done(b) {
    game.me.play('clap');
    game.sfx.pop?.();
    game.showBubble('🪱 ' + name(b));
    game.toast(t('bait.put', { name: name(b), n: hook.left }));
  }
  // One bite (the fishing panel): uses one; says so when the last one goes.
  function use() {
    const b = hook.use();
    if (b && !hook.left) setTimeout(() => game.toast(t('bait.out', { name: name(b) })), 2500);
    return b;
  }
  const describe = (e) => {
    const b = baitById(e.b);
    return { emoji: '🪱', dot: b?.color, name: b ? name(b) : '?', desc: t('bait.desc', { n: e.sips, p: b?.rare ?? 0 }), canHold: true };
  };
  return {
    ui, apply, describe, name,
    label: () => t('bait.use'),
    // What the fishing panel sees.
    fishing: { get bait() { return hook.bait; }, get left() { return hook.left; }, use, name },
    shop: () => ui.show(),
    seller: () => ({ name: '🎣 ' + t('bait.grandpa'), look: SELLER_LOOK }),
    // A line for him to say: [Korean, romanised, in your language].
    hello: () => { const [ko, rom, k] = SELLER_LINES[Math.floor(Math.random() * SELLER_LINES.length)]; return [ko, rom, t(k)]; },
  };
}
