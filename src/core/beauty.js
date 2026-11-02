// Hair salon (미용실) and cosmetic clinic (성형외과) menus, without DOM so the
// prices can be unit-tested. Each option is a look field; null means "the
// model's own" (free to go back to). You pay once for each field you change.
export const SALON = [
  { key: 'dye', palette: 'dye', price: 10 },
];
export const CLINIC = [
  { key: 'eyes', palette: 'eyes', price: 8 }, // colour lenses
  { key: 'tone', palette: 'skin', price: 12 }, // skin tone
  { key: 'small', toggle: true, price: 15 }, // a smaller head
];
export const MENUS = { salon: SALON, clinic: CLINIC };

const val = (look, key) => look?.[key] ?? null;
export function beautyCost(menu, from, to) {
  let n = 0;
  for (const o of menu) {
    const a = o.toggle ? !!val(from, o.key) : val(from, o.key);
    const b = o.toggle ? !!val(to, o.key) : val(to, o.key);
    if (a !== b && (o.toggle ? b : b !== null)) n += o.price; // going back to your own is free
  }
  return n;
}
