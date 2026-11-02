// Han River ramen (한강 라면) at the park's convenience store, without DOM so
// it can be unit-tested. Wait for the water to boil, put in the noodles and
// the soup powder, maybe an egg and green onion, and take it off at about
// "4 minutes" (one second of play = one minute on the pot timer).
// Medals and coins work as at the samgyeopsal grill (Medals in grill-game.js).
export const RAMEN_GAME = 'ramen';
export const BOIL_SECONDS = 3; // water to a rolling boil
export const COOK_TARGET = 4; // perfect noodles
export const COOK_MAX = 7; // the pot boils over: done for you
export const TOPPINGS = ['egg', 'onion'];

// 0..100. 0.25 s off the target costs 10 points; unboiled water or no soup
// cost a lot; each topping adds a little.
export function ramenScore({ boiled, soup, cook, toppings = 0 }) {
  let s = 100 - Math.abs(cook - COOK_TARGET) * 40;
  if (!boiled) s -= 35;
  if (!soup) s -= 30;
  s += Math.min(TOPPINGS.length, toppings) * 3;
  return Math.max(0, Math.min(100, Math.round(s)));
}

// How the noodles turned out: firm (꼬들), perfect, soggy (불었어요).
export function noodleState(cook) {
  if (cook < COOK_TARGET - 0.6) return 'firm';
  if (cook > COOK_TARGET + 0.6) return 'soggy';
  return 'perfect';
}

// Pot timer text, one second = one minute: 4.5 → "4:30".
export function potClock(cook) {
  const sec = Math.max(0, Math.round(cook * 60));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
