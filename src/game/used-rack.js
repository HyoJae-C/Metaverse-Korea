// The second-hand rack at the two vintage shops (core/resale.js UsedRack,
// supabase/034_player_market.sql): clothes players sold to a shop, for
// anyone to buy at 40% of the new price. Shown under the selling list in
// the shop's panel (ui/resale-ui.js).
//
// game: { wallet, inventory, receipts, items, shop, sfx, refreshWallet,
// refreshItems, newOpId } plus `interior` as a getter.
import { UsedRack, USED_PCT, rackRows } from '../core/resale.js';
import { t } from '../core/i18n.js';
import { L } from '../ui/pocha-ui.js';

export function createUsedRack(game) {
  const rack = new UsedRack(game.wallet);
  let busy = false;
  return {
    // For the panel: { pct, rows } or null (no server wallet, or the SQL isn't run).
    view() {
      if (!game.wallet.server || !rack.rows) return null;
      return { pct: USED_PCT, rows: rackRows(rack.rows, game.items, (id) => game.inventory.has(id)) };
    },
    refresh: () => rack.browse(),
    // A shop just paid for clothes: they go on the rack (nothing happens if
    // this doesn't reach the server: the sale is paid either way).
    sold(op, item) { rack.add(op, item).catch(() => {}); },
    async buy(row) {
      const it = game.items[row.item];
      if (!it || busy || game.inventory.has(row.item)) return null;
      busy = true;
      try {
        const op = game.newOpId();
        const note = { name: it.name, at: game.interior?.store.name };
        const res = await rack.buy(row, op, note);
        if (!res.ok) {
          if (res.why === 'gone') { await rack.browse(); return t('used.gone'); }
          if (res.why === 'poor') return t('pet.noCoins', { n: Math.max(0, row.price - game.wallet.coins) });
          return t(res.why === 'closed' ? 'used.closed' : 'used.offline');
        }
        game.inventory.add(row.item);
        // Its receipt: it can go back to a shop (25% of what I paid) or on a
        // Potato Market mat (priced from its new price).
        game.receipts.record(row.item, res.n, op, note, res.list);
        game.refreshWallet();
        game.sfx.pop?.();
        const msg = t('used.bought');
        game.shop.toast(msg + ' ' + (it.emoji || '👕') + ' ' + L(it.name));
        game.refreshItems?.();
        await rack.browse();
        return msg;
      } finally { busy = false; }
    },
  };
}
