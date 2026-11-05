// One icon per kind of shop, on the floating shop badges and the map: every
// clothes shop shows the same 👕, every restaurant the same 🍽️, and so on.
// Fewer different pictures make the street and the map easier to read.
export const CATEGORY_ICON = {
  club: '🎧', bar: '🍸', cafe: '☕', beauty: '💄', fashion: '👕', popup: '🎪', lifestyle: '🛍️',
  restaurant: '🍽️', workshop: '🛠️', home: '🏠', library: '📚', school: '🏫', petshop: '🐶',
  park: '🌳', market: '🛒', play: '🎮', info: 'ℹ️',
};
const PERFUME = '🧴';

export function storeIcon(store) {
  if (!store) return '🛍️';
  if (store.perfumery) return PERFUME; // perfume shops, workshops and pop-ups alike
  if (store.workshop === 'hat') return CATEGORY_ICON.fashion; // the hat workshop sells hats
  if (store.workshop === 'cablecar') return '🚡';
  if (store.workshop === 'bike') return '🚲'; // the ride shops
  if (store.workshop === 'salon') return '💇'; // hair salons stand out from the cosmetics shops
  return CATEGORY_ICON[store.category] || '🛍️';
}
