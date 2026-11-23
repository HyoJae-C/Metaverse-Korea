// Limited-time clothes (core/timed-wear.js): the clock starts when you buy
// one; when its days are up it leaves the closet (taken off first if worn),
// with a note. Checked now and every 5 seconds.
import { loadTimed, saveTimed, startTimed, dueTimed, daysLeft } from '../core/timed-wear.js';
import { ITEMS, isWorn, unownedWorn } from '../core/inventory.js';
import { saveLook } from '../core/look-editor.js';
import { t, getLanguage, localName } from '../core/i18n.js';

export function createTimedWear(game) {
  const { inventory, receipts, setLook, shop } = game;
  let map = loadTimed();
  function tick(now = Date.now()) {
    const r = dueTimed(map, inventory.list(), ITEMS, now);
    if (r.map !== map) { map = r.map; saveTimed(map); }
    // Worn but not in the closet any more (the server took it out of the
    // account's save, supabase/058_timed_clothes.sql): take it off.
    for (const [id, it] of Object.entries(ITEMS)) {
      if (it.secs && it.off && !inventory.has(id) && isWorn(it, game.myLook)) {
        game.myLook = { ...game.myLook, ...it.off };
        saveLook(game.myLook);
        setLook(game.myLook);
      }
    }
    for (const id of r.gone) {
      const it = ITEMS[id];
      if (isWorn(it, game.myLook) && it.off) {
        game.myLook = { ...game.myLook, ...it.off };
        saveLook(game.myLook);
        setLook(game.myLook);
      }
      inventory.remove(id);
      receipts.forget(id);
      shop.closeProduct?.(); // (an open shop card would still say Take off)
      shop.toast(t('timed.gone', { name: localName(it.name, getLanguage()) }));
      game.refreshItems?.();
    }
  }
  setTimeout(() => tick(), 0);
  // Once, after the save and any returned clothes have come in: a bag or a
  // hat worn but not in the closet comes off (it had no Take off button).
  setTimeout(() => {
    const ids = unownedWorn(game.myLook, ITEMS, (id) => inventory.has(id));
    if (!ids.length) return;
    game.myLook = ids.reduce((look, id) => ({ ...look, ...ITEMS[id].off }), game.myLook);
    saveLook(game.myLook);
    setLook(game.myLook);
  }, 15000);
  setInterval(() => tick(), 5000);
  return {
    // (main.js: a limited item was just bought)
    bought(id) {
      const secs = ITEMS[id]?.secs;
      if (!secs) return;
      map = startTimed(map, id, secs);
      saveTimed(map);
    },
    left: (id) => daysLeft(map, id),
    tick,
  };
}
