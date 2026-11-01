// Character customisation options. Everything is data so new colours and
// accessories (and later, shop items) can be added here.
//
// A "look" is what gets saved and sent to other players:
//   { shirt, pants, hair, skin, head, face, neck, back }
// colours are palette ids, accessories are ids or null. One accessory per
// slot, so at most four at once.

export const PALETTES = {
  shirt: {
    coral: 0xff9b85, mint: 0x8fd3c7, butter: 0xffd36e, lilac: 0xb9a6f0,
    leaf: 0xa6d97a, sky: 0x86b8f0, peach: 0xffb3c7, cream: 0xf6f1e7,
  },
  pants: {
    denim: 0x5b6c8f, navy: 0x34495e, cocoa: 0x7a5c4a, olive: 0x4f7a5a,
    charcoal: 0x55505e, sand: 0xc9b08f,
  },
  hair: {
    black: 0x1f1b1a, espresso: 0x3a2a22, chestnut: 0x7a4a2e, caramel: 0xc98b4f,
    rose: 0xe89aa8, ash: 0xb8b2ad,
  },
  skin: {
    light: 0xffe6d2, fair: 0xffd9bd, warm: 0xe8b48f, tan: 0xc98e66, deep: 0x8d5b3f,
  },
};

export const SLOTS = ['head', 'face', 'neck', 'back'];

export const ACCESSORIES = {
  head: [
    { id: 'bucket', emoji: '👒', color: 0xffd36e },
    { id: 'cap', emoji: '🧢', color: 0x86b8f0 },
    { id: 'ribbon', emoji: '🎀', color: 0xff9bb3 },
    { id: 'beanie', emoji: '🧶', color: 0xff9b85 },
  ],
  face: [
    { id: 'glasses', emoji: '👓', color: 0x4a3f35 },
    { id: 'sunglasses', emoji: '🕶️', color: 0x2b2230 },
  ],
  neck: [
    { id: 'scarf', emoji: '🧣', color: 0xe9735c },
  ],
  back: [
    { id: 'backpack', emoji: '🎒', color: 0x8fd3c7 },
    { id: 'tote', emoji: '👜', color: 0xf3e5c8 },
  ],
};

export const DEFAULT_LOOK = {
  shirt: 'coral', pants: 'denim', hair: 'espresso', skin: 'fair',
  head: null, face: null, neck: null, back: null,
};

const pick = (obj) => {
  const k = Object.keys(obj);
  return k[Math.floor(Math.random() * k.length)];
};

export function randomLook() {
  const look = {
    shirt: pick(PALETTES.shirt), pants: pick(PALETTES.pants),
    hair: pick(PALETTES.hair), skin: pick(PALETTES.skin),
  };
  for (const s of SLOTS) {
    const list = ACCESSORIES[s];
    look[s] = Math.random() < 0.35 ? list[Math.floor(Math.random() * list.length)].id : null;
  }
  return look;
}

// Validate a look from storage or the network; unknown values fall back.
export function sanitizeLook(raw) {
  const look = { ...DEFAULT_LOOK };
  if (!raw || typeof raw !== 'object') return look;
  for (const k of ['shirt', 'pants', 'hair', 'skin']) {
    if (typeof raw[k] === 'string' && Object.hasOwn(PALETTES[k], raw[k])) look[k] = raw[k];
  }
  for (const s of SLOTS) {
    if (ACCESSORIES[s].some((a) => a.id === raw[s])) look[s] = raw[s];
  }
  return look;
}

export function accessory(slot, id) {
  return ACCESSORIES[slot].find((a) => a.id === id) || null;
}
