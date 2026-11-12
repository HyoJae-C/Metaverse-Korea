// Waits for you to come near Seoul Forest, then loads its tandem bike rental
// (game/tandem-rental.js: the booth, renting, the meter, the park's edge).
// A rental left behind when the page closed is settled here at the start,
// wherever you are: what the meter showed when you were last seen riding.
// Small on purpose: this is in the first download, the rental is not.
import { t } from '../core/i18n.js';
import { won } from '../core/money.js';
import { FOREST_BOX, leftOwed, loadRent, saveRent } from '../core/tandem-rental.js';

const NEAR = 60; // m round Seoul Forest's box: load the booth

// game: what createTandemRental needs (see game/tandem-rental.js), with
// `spot` the booth's { x, z, ry } and `ready` a promise that resolves once
// the wallet has asked the server.
export function createTandemRentalNear(game) {
  let rental = null, loading = null;
  const load = () => (loading ||= import('./tandem-rental.js')
    .then(({ createTandemRental }) => (rental = createTandemRental(game)))
    .catch((e) => { loading = null; console.warn('tandem rental', e); return null; }));
  const left = loadRent();
  if (left) Promise.resolve(game.ready).then(() => {
    const due = leftOwed(left);
    const k = Math.min(due, game.wallet.coins);
    if (k > 0) game.wallet.add(-k, { k: 'ledger.tandem' }, { kind: 'take', once: 'tandem:' + left.start });
    saveRent(null);
    game.refreshWallet();
    game.toast(t('tandemRent.settled', { n: won(k) }));
  }).catch(() => {});
  const [x0, z0, x1, z1] = FOREST_BOX;
  return {
    // Every frame (indoors too: the bike goes back when you leave the street).
    update(p, dt) {
      if (rental) { rental.update(p, dt); return; }
      if (game.spot && !loading && game.mode() === 'street' && p.x > x0 - NEAR && p.x < x1 + NEAR && p.z > z0 - NEAR && p.z < z1 + NEAR) load();
    },
    fence: (p, px0, pz0) => rental?.fence(p, px0, pz0),
    act: (p) => rental?.act(p) || null,
  };
}
