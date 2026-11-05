// Character customisation options. Everything is data so new colours and
// accessories (and later, shop items) can be added here.
//
// A "look" is what gets saved and sent to other players:
//   { shirt, pants, hair, skin, head, face, ear, neck, back }
// plus hatColor/hatPatch (hat workshop), dye and hairStyle (hair salon), lip
// (Petal Lip), and eyes, tone and
// small (clinic: eye colour, skin tone, a smaller head).
// colours are palette ids, accessories are ids or null. One accessory per
// slot, so at most five at once.

import { PACK } from './characters/index.js';
import { emblemById, nameColorById } from '../core/emblems.js';

// Hairstyles from the hair salon (built in core/hair-styles.js).
export const HAIR_STYLES = ['short', 'crop', 'bangs', 'bob', 'long', 'pony', 'twin', 'bun', 'curly', 'pomp',
  'slick', 'buzz', 'comma', 'dandy', 'asperm', 'side', 'center', 'hippie', 'wave', 'hime', 'hush', 'mohawk', 'spiky', 'mullet', 'wolf', 'manbun', 'layered', 'afro', 'braids', 'dreads'];
// Eye shapes from the two cosmetic clinics (core/hair-styles.js shapes them).
export const EYE_SHAPE_IDS = ['big', 'round', 'cat', 'puppy'];

// Printed T-shirts (drawn in core/tee-prints.js).
export const TEE_IDS = ['simurugi', 'mongle', 'mandu', 'ddeok'];

// Body models from the active model pack (src/data/characters).
export const MODELS = Object.keys(PACK.models);

export const PALETTES = {
  shirt: {
    coral: 0xff9b85, mint: 0x8fd3c7, butter: 0xffd36e, lilac: 0xb9a6f0,
    leaf: 0xa6d97a, sky: 0x86b8f0, peach: 0xffb3c7, cream: 0xf6f1e7,
  },
  pants: {
    denim: 0x5b6c8f, navy: 0x34495e, cocoa: 0x7a5c4a, olive: 0x4f7a5a,
    charcoal: 0x55505e, sand: 0xc9b08f,
    // Only from the shops (Denim Lab, Wide Pants Club).
    black: 0x2b2b31, cream: 0xeee6d6, indigo: 0x2f3f6e, lightwash: 0x9db4d2,
  },
  // Sneakers and shoes from the shoe shops (null: plain white sneakers).
  shoes: {
    white: 0xffffff, black: 0x2b2b31, pink: 0xff9bb3, sky: 0x86b8f0, butter: 0xffd36e,
    red: 0xe0402f, lime: 0xb5e04a, brown: 0x6b4a2f, tan: 0xc49a6c, burgundy: 0x7a2a3a,
  },
  hair: {
    black: 0x1f1b1a, espresso: 0x3a2a22, chestnut: 0x7a4a2e, caramel: 0xc98b4f,
    rose: 0xe89aa8, ash: 0xb8b2ad,
  },
  skin: {
    light: 0xffe6d2, fair: 0xffd9bd, warm: 0xe8b48f, tan: 0xc98e66, deep: 0x8d5b3f,
  },
  // Hair salon dyes and clinic options (null = the model's own colours).
  dye: {
    black: 0x1f1b1a, brown: 0x6b4026, ash: 0x8a8580, blonde: 0xe8c27a, pink: 0xf29bb6,
    red: 0xc8463c, blue: 0x4f7fd6, purple: 0x8a5cc9, mint: 0x6fcdb8, silver: 0xd6d9de,
  },
  eyes: {
    black: 0x1c1c22, brown: 0x7a4a2e, gray: 0x8c97a3, blue: 0x3f7fd0, green: 0x4a9a5c, violet: 0x8a5cc9,
    hazel: 0xa0703a, honey: 0xd9a441, aqua: 0x3fc6d0, emerald: 0x1f9e6e, pink: 0xe87fae, red: 0xc23b3b,
    silver: 0xc8ced6, gold: 0xe0b43a,
  },
  // Lip tints from Petal Lip (꽃잎 립).
  // The colour-family lip shops on Yeonmujang-gil add their own shades
  // (LIP_FAMILIES below says which shop sells which).
  lip: {
    camellia: 0xd94c5f, cherry: 0xc21f3a, coral: 0xff6f61, peach: 0xf7957a, rose: 0xe8798f,
    pink: 0xff8fb1, berry: 0xa8325e, plum: 0x7d2f52, nude: 0xc98a78, mauve: 0xb07489,
    scarlet: 0xe0162b, tomato: 0xf0442e, ruby: 0xb3123f, brick: 0xa5302a, wine: 0x7b1e2b,
    tangerine: 0xff7a2f, apricot: 0xffa067, mango: 0xffab3d, salmon: 0xf2836b, persimmon: 0xe8572a,
    bubblegum: 0xff6fb5, hotpink: 0xff2e8a, sakura: 0xffb3c9, fuchsia: 0xd6247f, babypink: 0xf7a1c4,
    lavender: 0xb48ae0, lilac: 0xc9a2e8, orchid: 0xc24fb0, violet: 0x8a3fc9, grape: 0x5e2a84,
    mint: 0x7fdcb0, matcha: 0x8db255, emerald: 0x1f9e6e, olive: 0x6b7a2f, forest: 0x2f6b3f,
    ice: 0xb8d9f0, sky: 0x7fb8f0, teal: 0x2a9a9a, cobalt: 0x2f5fd6, navy: 0x2b3f7a,
  },
  // Hat colours from the hat workshop.
  hat: {
    butter: 0xffd36e, sky: 0x86b8f0, coral: 0xff9b85, mint: 0x8fd3c7, lilac: 0xb9a6f0,
    black: 0x2b2230, cream: 0xf6f1e7, denim: 0x5b6c8f, olive: 0x6f8a55, berry: 0xc2456b,
  },
};

// Which lip shades each lip shop sells (a store's "lipFamily"; Petal Lip,
// with no family, has the first ten).
export const LIP_FAMILIES = {
  mixed: ['camellia', 'cherry', 'coral', 'peach', 'rose', 'pink', 'berry', 'plum', 'nude', 'mauve'],
  red: ['scarlet', 'tomato', 'cherry', 'ruby', 'brick', 'wine'],
  coral: ['tangerine', 'apricot', 'mango', 'salmon', 'persimmon', 'coral'],
  pink: ['bubblegum', 'hotpink', 'sakura', 'fuchsia', 'babypink', 'pink'],
  purple: ['lavender', 'lilac', 'orchid', 'violet', 'grape', 'plum'],
  green: ['mint', 'matcha', 'emerald', 'olive', 'forest'],
  blue: ['ice', 'sky', 'teal', 'cobalt', 'navy'],
};

// Embroidered patches for workshop hats (drawn as a small badge on the front).
export const PATCHES = {
  heart: '♥', star: '★', flower: '✿', smile: '☺', hangul: '한', moon: '☾',
};
export const HAT_SHAPES = ['bucket', 'cap', 'beanie', 'beret'];

export const SLOTS = ['head', 'face', 'ear', 'neck', 'back'];

// Each accessory is drawn by its `shape` (the id when there is none), in its
// own colour. The plain ids (bucket, cap, ...) are the hat workshop's shapes,
// worn with a chosen hatColor; the coloured variants come from the shops.
// Glasses: `lens` is the lens colour and `tint` its opacity.
export const ACCESSORIES = {
  head: [
    { id: 'bucket', emoji: '👒', color: 0xffd36e },
    { id: 'cap', emoji: '🧢', color: 0x86b8f0 },
    { id: 'ribbon', emoji: '🎀', color: 0xff9bb3 },
    { id: 'beanie', emoji: '🧶', color: 0xff9b85 },
    { id: 'beret', emoji: '🎨', color: 0xc2456b },
    { id: 'towel', emoji: '🐑', color: 0xf7c6d0 }, // 양머리 수건 from the jjimjilbang
    // Hat and accessory shops (data/wearables.js)
    { id: 'cap-red', shape: 'cap', emoji: '🧢', color: 0xd8452f },
    { id: 'cap-sky', shape: 'cap', emoji: '🧢', color: 0x86b8f0 },
    { id: 'cap-black', shape: 'cap', emoji: '🧢', color: 0x2b2230 },
    { id: 'cap-orange', shape: 'cap', emoji: '🧢', color: 0xff7a00 },
    { id: 'bucket-cream', shape: 'bucket', emoji: '👒', color: 0xf6f1e7 },
    { id: 'bucket-denim', shape: 'bucket', emoji: '👒', color: 0x5b6c8f },
    { id: 'beanie-grey', shape: 'beanie', emoji: '🧶', color: 0x8e8a92 },
    { id: 'beanie-cream', shape: 'beanie', emoji: '🧶', color: 0xefe6d2 },
    { id: 'beanie-mustard', shape: 'beanie', emoji: '🧶', color: 0xd9a43a },
    { id: 'beret-black', shape: 'beret', emoji: '🎨', color: 0x2b2230 },
    { id: 'ribbon-red', shape: 'ribbon', emoji: '🎀', color: 0xe0405a },
  ],
  face: [
    { id: 'glasses', emoji: '👓', color: 0x4a3f35 },
    { id: 'sunglasses', emoji: '🕶️', color: 0x2b2230 },
    // Ttoryeot Optical and Ear Candy
    { id: 'glasses-black', shape: 'glasses', emoji: '👓', color: 0x1f1b22 },
    { id: 'glasses-gold', shape: 'glasses', emoji: '👓', color: 0xd4a640 },
    { id: 'glasses-pink', shape: 'glasses', emoji: '👓', color: 0xf08bb0 },
    { id: 'sunglasses-brown', shape: 'sunglasses', emoji: '🕶️', color: 0x6b4a2f, lens: 0x8a5a32, tint: 0.85 },
    { id: 'sunglasses-pink', shape: 'sunglasses', emoji: '🕶️', color: 0xf6f1e7, lens: 0xff6fa8, tint: 0.8 },
    { id: 'sunglasses-blue', shape: 'sunglasses', emoji: '🕶️', color: 0xd9dde2, lens: 0x3f7fd6, tint: 0.8 },
  ],
  // Earrings (the earring shops): a pair, one on each ear.
  ear: [
    { id: 'hoops-gold', shape: 'hoops', emoji: '💛', color: 0xe8b84a },
    { id: 'hoops-silver', shape: 'hoops', emoji: '🩶', color: 0xd9dde2 },
    { id: 'pearls', shape: 'studs', emoji: '🤍', color: 0xfbf6ec },
    { id: 'stars', shape: 'star', emoji: '⭐', color: 0xf5c842 },
    { id: 'hearts', shape: 'heart', emoji: '💗', color: 0xff5c8a },
    { id: 'cherries', shape: 'cherry', emoji: '🍒', color: 0xd8203a },
  ],
  neck: [
    { id: 'scarf', emoji: '🧣', color: 0xe9735c },
    { id: 'scarf-mint', shape: 'scarf', emoji: '🧣', color: 0x8fd3c7 },
    { id: 'scarf-cream', shape: 'scarf', emoji: '🧣', color: 0xefe6d2 },
  ],
  back: [
    { id: 'backpack', emoji: '🎒', color: 0x8fd3c7 },
    { id: 'tote', emoji: '👜', color: 0xf3e5c8 },
    { id: 'tote-forest', shape: 'tote', emoji: '👜', color: 0x3f7a5a },
    { id: 'tote-river', shape: 'tote', emoji: '👜', color: 0x5b8fb9 },
    { id: 'tote-brick', shape: 'tote', emoji: '👜', color: 0xb5523b },
    { id: 'backpack-graffiti', shape: 'backpack', emoji: '🎒', color: 0xff7a00 },
  ],
};
// What an accessory is drawn as.
export const shapeOf = (a) => a?.shape || a?.id || null;

export const DEFAULT_LOOK = {
  model: MODELS[0],
  shirt: 'coral', pants: 'denim', hair: 'espresso', skin: 'fair',
  head: null, face: null, ear: null, neck: null, back: null,
  hatColor: null, hatPatch: null, // set in the hat workshop
  dye: null, hairStyle: null, // hair salon
  lip: null, // lip tint from Petal Lip
  eyeShape: null, // cosmetic clinics
  eyes: null, tone: null, small: false, // clinic
  tee: null, // printed T-shirt (an item from the bag)
  shoes: null, // shoe colour from the shoe shops
};

// A new player's trousers: the first six colours (the rest are sold).
const START_PANTS = Object.fromEntries(Object.entries(PALETTES.pants).slice(0, 6));
const pick = (obj) => {
  const k = Object.keys(obj);
  return k[Math.floor(Math.random() * k.length)];
};

// A new player: plain clothes in a random T-shirt colour. Costumes and
// accessories come later, from the shops.
export function randomLook() {
  return {
    ...DEFAULT_LOOK,
    model: 'basic',
    shirt: pick(PALETTES.shirt), pants: pick(START_PANTS),
    hair: pick(PALETTES.hair), skin: pick(PALETTES.skin),
  };
}
// Costumes sold at the costume shop: model id -> item id (core/inventory.js).
export const OUTFIT_ITEM = (model) => (model && model !== 'basic' ? 'outfit-' + model : null);

// Validate a look from storage or the network; unknown values fall back.
export function sanitizeLook(raw) {
  const look = { ...DEFAULT_LOOK };
  if (!raw || typeof raw !== 'object') return look;
  if (MODELS.includes(raw.model)) look.model = raw.model;
  for (const k of ['shirt', 'pants', 'hair', 'skin']) {
    if (typeof raw[k] === 'string' && Object.hasOwn(PALETTES[k], raw[k])) look[k] = raw[k];
  }
  for (const s of SLOTS) {
    if (ACCESSORIES[s].some((a) => a.id === raw[s])) look[s] = raw[s];
  }
  if (typeof raw.hatColor === 'string' && Object.hasOwn(PALETTES.hat, raw.hatColor)) look.hatColor = raw.hatColor;
  if (typeof raw.hatPatch === 'string' && Object.hasOwn(PATCHES, raw.hatPatch)) look.hatPatch = raw.hatPatch;
  if (typeof raw.dye === 'string' && Object.hasOwn(PALETTES.dye, raw.dye)) look.dye = raw.dye;
  if (typeof raw.hairStyle === 'string' && HAIR_STYLES.includes(raw.hairStyle)) look.hairStyle = raw.hairStyle;
  if (typeof raw.eyeShape === 'string' && EYE_SHAPE_IDS.includes(raw.eyeShape)) look.eyeShape = raw.eyeShape;
  if (typeof raw.lip === 'string' && Object.hasOwn(PALETTES.lip, raw.lip)) look.lip = raw.lip;
  if (typeof raw.eyes === 'string' && Object.hasOwn(PALETTES.eyes, raw.eyes)) look.eyes = raw.eyes;
  if (typeof raw.tone === 'string' && Object.hasOwn(PALETTES.skin, raw.tone)) look.tone = raw.tone;
  // Head size: 'small' or 'big' (true: an older save's small head).
  if (raw.small === true || raw.small === 'small') look.small = 'small';
  else if (raw.small === 'big') look.small = 'big';
  if (typeof raw.tee === 'string' && TEE_IDS.includes(raw.tee)) look.tee = raw.tee;
  if (typeof raw.shoes === 'string' && Object.hasOwn(PALETTES.shoes, raw.shoes)) look.shoes = raw.shoes;
  if (typeof raw.emblem === 'string' && emblemById(raw.emblem)) look.emblem = raw.emblem; // name tag
  if (typeof raw.nameColor === 'string' && nameColorById(raw.nameColor)) look.nameColor = raw.nameColor;
  return look;
}

export function accessory(slot, id) {
  return ACCESSORIES[slot].find((a) => a.id === id) || null;
}
