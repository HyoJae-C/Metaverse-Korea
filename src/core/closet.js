// The wardrobe's sorting: which kind each piece of clothing is (top, bottom,
// dress, shoes, hat, accessory, bag) and the order to show them in.

import { PACK } from '../data/characters/index.js';
import { PALETTES, SLOTS, accessory } from '../data/appearance.js';
import { skirtById } from '../data/skirts.js';

// The kinds in tab order. An item can name its kind (kind: 'dress'); otherwise
// it comes from what the item changes on your look.
export const CLOSET_KINDS = ['top', 'bottom', 'dress', 'shoes', 'hat', 'acc', 'bag'];
export function closetKind(it) {
  if (!it) return null;
  if (it.kind && CLOSET_KINDS.includes(it.kind)) return it.kind;
  if (it.tee) return 'top';
  const w = it.wear || {};
  if (w.model) return 'top';
  if ('pants' in w || 'skirt' in w) return 'bottom';
  if ('shoes' in w) return 'shoes';
  if ('head' in w) return 'hat';
  if ('back' in w) return 'bag';
  if ('face' in w || 'ear' in w || 'neck' in w || 'hand' in w) return 'acc';
  return null;
}

// The colour dot beside a piece's icon (ui/closet-icons.js) tells two colours
// of one design apart.
// The main colour of a piece, as '#rrggbb' (null when it has none).
export function closetColor(it) {
  const hex = (n) => (typeof n === 'number' ? '#' + n.toString(16).padStart(6, '0') : null);
  if (!it) return null;
  const w = it.wear || {};
  if (w.model) return hex(PACK.models[w.model]?.wear?.colors?.top);
  if (w.skirt) return hex(skirtById(w.skirt)?.color);
  if (w.pants) return hex(PALETTES.pants[w.pants]);
  if (w.shoes) return hex(PALETTES.shoes[w.shoes]);
  for (const slot of SLOTS) if (w[slot]) return hex(accessory(slot, w[slot])?.color);
  return null;
}

// ids in the order bought (oldest first). sort: 'new' (last bought first),
// 'name' (by the shown name) or 'price' (dearest first; free ones last).
export function sortCloset(ids, sort, { nameOf, priceOf }) {
  if (sort === 'name') return [...ids].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  if (sort === 'price') return [...ids].sort((a, b) => (priceOf(b) || 0) - (priceOf(a) || 0));
  return [...ids].reverse();
}
export const CLOSET_SORTS = ['new', 'name', 'price'];
