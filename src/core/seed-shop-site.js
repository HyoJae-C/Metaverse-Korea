// The seed shop's shape in its own metres: x across the front, z out of
// the front (the customers' side). The map's 'seedshop' landmark
// (scripts/build-seed-shop.mjs) says where it stands and which way it
// faces. Shared by the game (game/seed-shop.js), the map builder and the
// tests; no three.js here.
export const SEED_SHOP = { hw: 3.2, back: -1.9, front: 1.5, counter: 0.5, h: 2.7 }; // half width, the back wall, the awning's edge, the counter's z
export const SEED_STAND = [0, 2.1]; // where a customer stands
export const SEED_NEAR = 3.2; // m from there: the button
