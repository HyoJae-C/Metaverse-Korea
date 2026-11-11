// Beauty shops, without DOM so the prices can be unit-tested: the hair salons
// (미용실), two cosmetic clinics (성형외과), the colour lens shop (렌즈마을)
// and the lip tint shop (꽃잎 립). Each option is a look field; null means
// "the model's own" (free to go back to). You pay once for each field you
// change. Choices: a fixed list of ids (labels in i18n), or a palette.
import { HAIR_STYLES, LIP_FAMILIES, NOSE_IDS, JAW_IDS } from '../data/appearance.js';

export const EYE_SHAPES = { clinic: ['big', 'round'], clinic2: ['cat', 'puppy'] };
export const SALON = [
  { key: 'hairStyle', choices: HAIR_STYLES, price: 40000, label: 'hair' },
  { key: 'dye', palette: 'dye', price: 30000 },
];
// Clinic prices: about 1/20 of the real thing in Seoul, eyes a little more (Yozi 2026-11-11;
// real, roughly: eyes ₩1.5M, skin ₩0.5M, nose ₩4M, jaw contouring ₩8M).
export const CLINIC = [
  { key: 'eyeShape', choices: EYE_SHAPES.clinic, price: 100000, label: 'eyeShape' },
  { key: 'tone', palette: 'skin', price: 250000 }, // skin tone (a big change: priced like the nose and jaw)
  { key: 'nose', choices: NOSE_IDS, price: 200000, label: 'nose' },
];
export const CLINIC2 = [
  { key: 'eyeShape', choices: EYE_SHAPES.clinic2, price: 100000, label: 'eyeShape' },
  { key: 'jaw', choices: JAW_IDS, price: 400000, label: 'jaw' }, // the jaw line (the head keeps its size)
];
export const LENS = [{ key: 'eyes', palette: 'eyes', price: 25000 }]; // colour lenses
export const LIPS = [{ key: 'lip', palette: 'lip', price: 15000 }]; // lip tint
export const MENUS = { salon: SALON, clinic: CLINIC, clinic2: CLINIC2, lens: LENS, lips: LIPS };
export const BEAUTY_SHOPS = Object.keys(MENUS);
// Every salon does the basic cuts; each one also has its own concept with a
// few signature styles ("hairStyles" in stores.json), listed first.
export const BASIC_HAIR = ['short', 'crop', 'bangs', 'bob', 'long', 'pony'];
export function salonStyles(store) {
  const sig = (store?.hairStyles || []).filter((s) => HAIR_STYLES.includes(s));
  return sig.length ? [...sig, ...BASIC_HAIR.filter((s) => !sig.includes(s))] : HAIR_STYLES;
}
// A shop's menu: lip shops sell only their colour family ("only" limits the
// palette to those shades); a salon its signature styles and the basics.
export function menuFor(kind, store) {
  const fam = kind === 'lips' && LIP_FAMILIES[store?.lipFamily || 'mixed'];
  if (fam) return MENUS.lips.map((o) => ({ ...o, only: fam }));
  if (kind === 'salon' && store?.hairStyles?.length) {
    return SALON.map((o) => (o.key === 'hairStyle' ? { ...o, choices: salonStyles(store), signature: store.hairStyles } : o));
  }
  return MENUS[kind];
}
// Clinics: you lie on a bed and go through to surgery; the others: a chair in
// front of a big mirror.
export const isClinic = (kind) => kind === 'clinic' || kind === 'clinic2';
export const BEAUTY_ICON = { salon: '💇', clinic: '✨', clinic2: '✨', lens: '👁️', lips: '💄' };

const val = (look, key) => look?.[key] || null;
export function beautyCost(menu, from, to) {
  let n = 0;
  for (const o of menu) {
    const a = val(from, o.key), b = val(to, o.key);
    if (a !== b && b !== null) n += o.price; // going back to your own is free
  }
  return n;
}
