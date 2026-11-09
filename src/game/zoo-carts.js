// The zoo's four-seat carts (Children's Grand Park): rent one free at the
// station just inside the gate, drive it anywhere in the zoo, and offer
// friends nearby the other three seats (main.js's ride-together, as with
// the limousine). Carts stay in the zoo: drive out and it goes back to the
// station. The station is the map's "zoocarts" landmark (scripts/
// build-grand-park.mjs); the cart is vehicle kind 7 (core/bikes.js).
import { t } from '../core/i18n.js';

export const CART = 7; // riding kind
export const CART_SPEED = 10; // m/s: quicker than running (12 is a sprint with stamina), slower than a car

export function createZooCarts(game) {
  const st = game.station; // { x, z, carts: [[x, z]], area: [x0, z0, x1, z1] } or null
  const rel = (p) => [p.x - st.x, p.z - st.z];
  // Standing by the parked carts.
  function atStation(p) {
    if (!st) return false;
    const [x, z] = rel(p);
    return (st.carts || []).some(([cx, cz]) => Math.abs(x - cx) < 5 && Math.abs(z - cz) < 3.5);
  }
  function inZoo(p) {
    if (!st) return false;
    const [x, z] = rel(p), [x0, z0, x1, z1] = st.area;
    return x > x0 && x < x1 && z > z0 && z < z1;
  }
  return {
    atStation, inZoo,
    // At the station, on foot: take a cart.
    act(p) {
      if (game.riding || game.seated || !atStation(p)) return null;
      return { key: 'zoocart', label: t('zoocart.rent'), run: () => { game.setRiding(CART); if (game.riding === CART) game.shop.toast(t('zoocart.got')); } };
    },
    // Driving one: hand it back.
    offAct() { return { key: 'zoocart-off', label: '🛺 ' + t('zoocart.off'), run: () => game.setRiding(0) }; },
    // Each frame: a cart driven out of the zoo goes back to the station.
    tick(p) {
      if (game.riding !== CART || inZoo(p)) return;
      game.setRiding(0);
      game.shop.toast(t('zoocart.out'));
    },
  };
}
