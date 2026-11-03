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
