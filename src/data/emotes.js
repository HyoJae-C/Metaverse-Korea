// Emote packs. Each pack is data so new (later, paid) packs can be added
// without touching game code. `price: 0` packs are owned by everyone.
//
// An emote's `id` is what goes over the network, so keep ids stable and
// globally unique (prefix with the pack id for non-basic packs).

export const EMOTE_PACKS = [
  {
    id: 'basic',
    name: { en: 'Basics', ko: '기본', ja: 'ベーシック', zh: '基础' },
    price: 0,
    emotes: [
      { id: 'wave', emoji: '👋', anim: 'wave' },
      { id: 'smile', emoji: '😊' },
      { id: 'heart', emoji: '💖' },
      { id: 'photo', emoji: '📸' },
    ],
  },
];

const BY_ID = new Map(EMOTE_PACKS.flatMap((p) => p.emotes.map((e) => [e.id, { ...e, pack: p.id }])));

export function getEmote(id) {
  return BY_ID.get(id) || null;
}

// Which packs the player owns. Free packs for now; a shop/account service
// will supply purchased pack ids later.
export function ownedPacks(purchased = []) {
  return EMOTE_PACKS.filter((p) => p.price === 0 || purchased.includes(p.id));
}
