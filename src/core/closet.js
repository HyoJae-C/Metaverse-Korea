// The wardrobe's sorting: which kind each piece of clothing is (top, bottom,
// dress, shoes, hat, accessory, bag) and the order to show them in.

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
  if ('face' in w || 'ear' in w || 'neck' in w) return 'acc';
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
