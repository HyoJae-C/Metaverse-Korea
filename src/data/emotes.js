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
      { id: 'bow', emoji: '🙇', anim: 'bow' },
      { id: 'laugh', emoji: '😂', anim: 'laugh' },
      { id: 'angry', emoji: '😠', anim: 'angry' },
      { id: 'shrug', emoji: '🤷', anim: 'shrug' },
      { id: 'cheer', emoji: '🙌', anim: 'cheer' },
      { id: 'clap', emoji: '👏', anim: 'clap' },
      { id: 'cry', emoji: '😢', anim: 'cry' },
      { id: 'smile', emoji: '😊' },
      { id: 'heart', emoji: '💖' },
      { id: 'photo', emoji: '📸' },
    ],
  },
];

// In some rooms a few emotes are swapped for ones that suit the place, only
// while you are inside (keyed by the room's store.workshop). Inside
// Myeongdong Cathedral (Yozi 2026-11-11): no crying, anger or laughing;
// a book, praying hands and a dove instead.
export const ROOM_EMOTES = {
  cathedral: {
    cry: { id: 'book', emoji: '📖' },
    angry: { id: 'pray', emoji: '🙏', anim: 'bow' },
    laugh: { id: 'dove', emoji: '🕊️' },
  },
};

// The emote in that slot in this room (the basic one where nothing is swapped).
export function emoteIn(room, em) {
  return ROOM_EMOTES[room]?.[em.id] || em;
}

const BY_ID = new Map([
  ...EMOTE_PACKS.flatMap((p) => p.emotes.map((e) => [e.id, { ...e, pack: p.id }])),
  ...Object.entries(ROOM_EMOTES).flatMap(([room, swaps]) => Object.values(swaps).map((e) => [e.id, { ...e, pack: 'room', room }])),
]);

export function getEmote(id) {
  return BY_ID.get(id) || null;
}

// Which packs the player owns. Free packs for now; a shop/account service
// will supply purchased pack ids later.
export function ownedPacks(purchased = []) {
  return EMOTE_PACKS.filter((p) => p.price === 0 || purchased.includes(p.id));
}
