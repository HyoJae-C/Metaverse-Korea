// Maeum Knot Studio (Bukchon) used to make a "knot charm" that went in the
// bag (kind 'gift', "<colour> <knot> knot charm") and couldn't be worn.
// The studio makes bracelets now, worn like gloves (data/wearables.js
// acc-knot-<colour>-<knot>, look.hand). Each charm still in a bag becomes
// its bracelet, with a receipt for the studio's ₩8,000 payment so it can be
// resold like anything else bought (the server finds the payment in its
// ledger by the note and price: supabase/034_player_market.sql).
import { noteText } from '../core/wallet.js';

export const OLD_CHARM_NOTE = { name: { en: 'Tie a maedeup knot charm' }, at: { en: 'Maeum Knot Studio' } };
const CHARM = /^(red|green|blue|yellow|purple) (butterfly|chrysanthemum|double coin) knot charm$/;

// The bracelet a bag entry was, or null.
export function charmBracelet(e) {
  const m = e?.kind === 'gift' && CHARM.exec(e.name || '');
  return m ? `acc-knot-${m[1]}-${m[2].replace(' ', '-')}` : null;
}

// Swap the charms in the bag for bracelets (one of each; a second charm of
// the same kind stays in the bag as a keepsake). log: the budget book, to
// find each payment's own note. Returns the bracelets added.
export function braceletsFromCharms({ bag, inventory, receipts, log = [], price }) {
  const want = noteText(OLD_CHARM_NOTE), used = new Set(), added = [];
  const items = bag.list();
  for (let i = items.length - 1; i >= 0; i--) {
    const id = charmBracelet(items[i]);
    if (!id || inventory.has(id)) continue;
    bag.take(i);
    inventory.add(id);
    added.push(id);
    const k = log.findIndex((e, j) => !used.has(j) && e?.n === -price && noteText(e.note) === want);
    if (k >= 0) used.add(k);
    receipts.record(id, price, null, k >= 0 ? log[k].note : OLD_CHARM_NOTE);
  }
  return added;
}
