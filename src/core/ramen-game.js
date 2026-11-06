// Han River ramen (한강 라면) at the park's DAILY MART, without DOM so it can
// be unit-tested. You bring the ingredients from the shop in your bag (a
// ramyeon pack, and an egg if you like); the water is free. Put the pot on,
// then cheer the noodles on ("꼬들꼬들해져라~") until they're nice and chewy.
// Nothing can go wrong: every pot turns into a bowl of ramen to eat at a
// parasol table.
export const BOIL_SECONDS = 2; // the water comes to the boil by itself
export const RAMEN_TAPS = 6; // cheers until the noodles are chewy

// What the machine takes from your bag (gift entries with g: <id>).
export const INGREDIENTS = {
  ramyeon: { icon: '🍜', need: true }, // noodles and the soup powder
  egg: { icon: '🥚', need: false },
};

// Slot of the first bag entry that is this ingredient (-1 if none).
export const ingredientAt = (items, g) => items.findIndex((e) => e?.kind === 'gift' && e.g === g);
export const ingredientCount = (items, g) => items.filter((e) => e?.kind === 'gift' && e.g === g).length;
export const canCook = (items) => Object.entries(INGREDIENTS).every(([g, i]) => !i.need || ingredientAt(items, g) >= 0);

// 0..1 for the chewiness bar after n cheers.
export const chewy = (taps) => Math.max(0, Math.min(1, taps / RAMEN_TAPS));
