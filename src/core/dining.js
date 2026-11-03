// Eating out: sit at a restaurant table, open the menu, order. The food comes
// to your table a few seconds later and you eat it bite by bite; or order it
// to go and carry it (5 bites). Kept free of DOM code so it can be tested.

export const FOOD_BITES = 5; // bites to finish a dish (at the table or to go)
export const SERVE_MS = 4000; // order → on the table

// Menu prices are in won (like every shop); you pay game coins at
// 1 coin per 1,000 won, rounded (6,500원 → 7 coins), at least 1.
export const coinPrice = (won) => Math.max(1, Math.round((Number(won) || 0) / 1000));

// Restaurants where you order from the menu at your table (the food isn't
// laid out on display tables). The pocha has its own cooking game.
export const isDining = (store) => !!store && store.category === 'restaurant' && store.workshop !== 'pocha' && (store.products?.length || 0) > 0;

// Drinks go to the hand as a cup; everything else as a takeout box.
export const takeoutKind = (product) => (product?.model === 'cup' || product?.model === 'milk' || product?.model === 'cocktail' ? 'coffee' : 'food');

export const FOOD_ICON = { bowl: '🍲', roll: '🍣', bread: '🍞', skewer: '🍢', cup: '🥤', bacon: '🥓', samgak: '🍙', milk: '🥛', cocktail: '🍹' };
export const foodIcon = (model) => FOOD_ICON[model] || '🍽️';

// A dish on a table. order() → served after SERVE_MS → bite() until gone.
export class Meal {
  constructor(seat, product, now) {
    this.seat = seat;
    this.product = product;
    this.readyAt = now + SERVE_MS;
    this.bites = FOOD_BITES;
  }
  ready(now) { return now >= this.readyAt; }
  // One bite; returns the bites left (0 = finished). Not before it's served.
  bite(now) {
    if (!this.ready(now) || this.bites <= 0) return this.bites;
    this.bites -= 1;
    return this.bites;
  }
}

// Sharing a table: a served dish is sent with the player's state as
// "seat.product.bites" (indexes into this restaurant's seats and menu), so
// everyone in the room sees it, and anyone can tap it to take a bite (a friend
// with no coins gets a taste too). The owner's game counts the bite.
export const mealSync = (meal, seats, products) => {
  if (!meal || meal.bites <= 0) return undefined;
  const s = seats?.indexOf(meal.seat) ?? -1;
  const p = products?.indexOf(meal.product) ?? -1;
  return s >= 0 && p >= 0 ? `${s}.${p}.${meal.bites}` : undefined;
};
export function parseMealSync(v, seats, products) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d)$/.exec(String(v ?? ''));
  if (!m) return null;
  const seat = seats?.[+m[1]], product = products?.[+m[2]], bites = +m[3];
  if (!seat?.plate || !product || bites < 1 || bites > FOOD_BITES) return null;
  return { seatIndex: +m[1], seat, product, bites };
}
export const biteMsg = (to) => `bite:${to}`;
export function parseBite(e) {
  const m = /^bite:([\w-]{1,64})$/.exec(String(e));
  return m ? m[1] : null;
}
export const BITE_REACH = 3; // m from the plate a bite is accepted from
export const BITE_GAP_MS = 1000; // one bite per person per second at most
// Plate size as it is eaten (5 bites → small).
export const foodScale = (bites) => 1.5 * (0.45 + 0.55 * Math.max(0, bites) / FOOD_BITES);
