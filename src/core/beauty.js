// Beauty shops, without DOM so the prices can be unit-tested: the hair salon
// (미용실), two cosmetic clinics (성형외과), the colour lens shop (렌즈마을)
// and the lip tint shop (꽃잎 립). Each option is a look field; null means
// "the model's own" (free to go back to). You pay once for each field you
// change. Choices: a fixed list of ids (labels in i18n), or a palette.
import { HAIR_STYLES, LIP_FAMILIES } from '../data/appearance.js';

export const EYE_SHAPES = { clinic: ['big', 'round'], clinic2: ['cat', 'puppy'] };
export const SALON = [
  { key: 'hairStyle', choices: HAIR_STYLES, price: 40, label: 'hair' },
  { key: 'dye', palette: 'dye', price: 30 },
];
export const CLINIC = [
  { key: 'eyeShape', choices: EYE_SHAPES.clinic, price: 50, label: 'eyeShape' },
  { key: 'tone', palette: 'skin', price: 35 }, // skin tone
  { key: 'small', choices: ['small', 'big'], price: 45, label: 'face' }, // a smaller or bigger head
];
export const CLINIC2 = [
  { key: 'eyeShape', choices: EYE_SHAPES.clinic2, price: 50, label: 'eyeShape' },
];
export const LENS = [{ key: 'eyes', palette: 'eyes', price: 25 }]; // colour lenses
export const LIPS = [{ key: 'lip', palette: 'lip', price: 15 }]; // lip tint
export const MENUS = { salon: SALON, clinic: CLINIC, clinic2: CLINIC2, lens: LENS, lips: LIPS };
export const BEAUTY_SHOPS = Object.keys(MENUS);
// A shop's menu: lip shops sell only their colour family ("only" limits the
// palette to those shades).
export function menuFor(kind, store) {
  const fam = kind === 'lips' && LIP_FAMILIES[store?.lipFamily || 'mixed'];
  return fam ? MENUS.lips.map((o) => ({ ...o, only: fam })) : MENUS[kind];
}
// Clinics: you lie on a bed and go through to surgery; the others: a chair in
// front of a big mirror.
export const isClinic = (kind) => kind === 'clinic' || kind === 'clinic2';
export const BEAUTY_ICON = { salon: '💇', clinic: '✨', clinic2: '✨', lens: '👁️', lips: '💄' };

const val = (look, key) => look?.[key] || null; // false (no head size change) = own
export function beautyCost(menu, from, to) {
  let n = 0;
  for (const o of menu) {
    const a = o.toggle ? !!val(from, o.key) : val(from, o.key);
    const b = o.toggle ? !!val(to, o.key) : val(to, o.key);
    if (a !== b && (o.toggle ? b : b !== null)) n += o.price; // going back to your own is free
  }
  return n;
}
