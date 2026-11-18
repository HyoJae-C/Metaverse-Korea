// Waits for you to come near a Han River Boat Taxi pier (or for someone near
// you to sail by on one), then loads the piers, the boats and the ride
// (game/boat-taxi.js). Small on purpose: this is in the first download, the
// boats are not. The piers come from the map (map.boatTaxi, core/districts.js).
import { BOAT_TAXI, nearestPier } from '../core/boat-taxi.js';

// game: what createBoatTaxi needs (see game/boat-taxi.js), with `data` the map's boatTaxi.
export function createBoatTaxiNear(game) {
  const data = game.data;
  let boats = null, loading = false, look = 0;
  const someoneAboard = () => { for (const [, o] of game.others.players) if (o.target?.bt) return true; return false; };
  return {
    // Every frame, after walking.
    update(p, dt) {
      if (boats) { boats.update(dt, p); return; }
      if (!data?.piers?.length || loading || game.mode !== 'street') return;
      if ((look -= dt) > 0) return;
      look = 0.5;
      if (nearestPier(data.piers, p.x, p.z) > BOAT_TAXI.load && !someoneAboard()) return;
      loading = true;
      import('./boat-taxi.js')
        .then(({ createBoatTaxi }) => { boats = createBoatTaxi(game, data); })
        .catch((e) => { loading = false; console.warn('boat-taxi', e); });
    },
    act: (p) => boats?.act(p) || null,
    state: (st) => boats?.state(st),
    stop: () => boats?.stop(),
    get busy() { return !!boats?.busy; },
    get openView() { return !!boats?.openView; }, // (on a boat or a pier: the river behind doesn't pull the camera in)
  };
}
