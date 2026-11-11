// Riding the Namsan cable car outdoors: get in at the lower station's door
// by Sopa-ro (its store front), ride the real line up the hill in one of the
// two cabins (core/cablecar.js: the shared clock, the line), and step out
// by the upper station onto the summit plaza (game/namsan-walk.js). The way
// down starts at the upper station's door and is on the same ticket.
//
//   const cable = createNamsanCable(game, { landmarks, low, top, topOut });
//   cable.act(p)    the button at a station door, or while riding
//   cable.update()  every frame: carries me in the cabin
//   cable.busy      riding (no walking)
//   cable.stop()    off at once (a teleport)
import { CABLE, cabinAt, doorsOpen, arrivesIn, cableClock, cableLine } from '../core/cablecar.js';
import { CABLE_TEXT } from '../i18n/game-text.js';

const NEAR = 3; // m from a station's door: the cabin bay

// game: me, mode, wallet, shop, t, L, fmt, missionEvent, resend, clearAction.
// low: the lower station's door {x, z}; top: the upper station's door [x, z];
// topOut: where you step out at the top {x, z, ry}.
export function createNamsanCable(game, { landmarks = [], low = null, top = null, topOut = null }) {
  const l = landmarks.find((q) => q.type === 'cablecar' && q.path?.length > 1);
  if (!l || !low || !top || !topOut) return { act: () => null, update() {}, stop() {}, busy: false };
  const line = cableLine(l);
  // Out at the bottom: in front of the door, away from the station.
  const [bx, bz] = line.path[0];
  const d = Math.hypot(low.x - bx, low.z - bz) || 1, ux = (low.x - bx) / d, uz = (low.z - bz) / d;
  const out = { low: { x: low.x + ux * 1.5, z: low.z + uz * 1.5, ry: Math.atan2(ux, uz) }, top: topOut };
  let ride = null; // { cabin, from: 'low' | 'top', dx, paid }
  const stationAt = (p) => (Math.hypot(p.x - low.x, p.z - low.z) < NEAR ? 'low' : Math.hypot(p.x - top[0], p.z - top[1]) < NEAR ? 'top' : null);
  const T = (k, n) => game.fmt(game.L(CABLE_TEXT[k]), { n });

  function stepOut(at) {
    const o = out[at], me = game.me;
    me.root.position.set(o.x, 0, o.z); // (the street puts you on the ground, the hill's height up top)
    me.root.rotation.y = o.ry;
    ride = null;
    game.resend();
    game.clearAction();
  }
  function board(i, st) {
    const c = cabinAt(i, cableClock());
    if (c.at !== st || !doorsOpen(c)) return;
    if (st === 'low' && !game.wallet.spend(CABLE.fare, { k: 'ledger.cable' })) { game.shop.toast(game.t('ride.noCoins', { n: CABLE.fare })); return; }
    ride = { cabin: i, from: st, dx: (Math.random() - 0.5) * 1.2, paid: st === 'low' ? game.wallet.lastOp : null };
    if (st === 'low') game.missionEvent('ride');
    game.resend();
    game.clearAction();
  }
  function getOff() { // before the doors close: back out where you got in, ticket refunded
    if (!ride) return;
    if (ride.from === 'low') game.wallet.refund(CABLE.fare, ride.paid, { k: 'ledger.cable' });
    stepOut(ride.from);
  }
  return {
    get busy() { return !!ride; },
    stop() { ride = null; }, // (a teleport or a taxi while riding)
    act(p) {
      const now = cableClock();
      if (ride) {
        const c = cabinAt(ride.cabin, now);
        // (the countdown is in the key so the button text updates every second)
        if (c.at === ride.from && doorsOpen(c)) { const n = Math.ceil(c.leaves); return { key: 'cable-off:' + n, label: '🚪 ' + T('leaves', n), run: getOff }; }
        const n = Math.ceil(c.next || c.leaves || 0);
        return { key: 'cable-ride:' + n, label: '🚡 ' + T(ride.from === 'low' ? 'toTop' : 'toLow', n), run: () => {} };
      }
      if (game.mode !== 'street') return null;
      const st = stationAt(p);
      if (!st) return null;
      // Whichever cabin pulls in here first (one comes every half cycle).
      const bay = [0, 1].map((i) => ({ i, wait: arrivesIn(i, st, now) })).sort((a, b) => a.wait - b.wait)[0];
      if (bay.wait > 0) { const n = Math.ceil(bay.wait); return { key: 'cable-wait:' + n, label: '🚡 ' + T('wait', n), run: () => {} }; }
      return { key: 'cable-board:' + st + bay.i, label: '🚡 ' + (st === 'low' ? T('board', CABLE.fare) : game.L(CABLE_TEXT.down)), run: () => board(bay.i, st) };
    },
    update() {
      if (!ride) return;
      if (game.mode !== 'street') { ride = null; return; }
      const c = cabinAt(ride.cabin, cableClock()), to = ride.from === 'low' ? 'top' : 'low';
      if (c.at === to) { // arrived
        stepOut(to);
        game.shop.toast(game.L(CABLE_TEXT[to]));
        if (to === 'top') game.me.play('cheer');
        return;
      }
      const s = line.cabin(ride.cabin, c.k), me = game.me;
      const ax = Math.cos(line.heading), az = -Math.sin(line.heading); // (across the cabin)
      me.root.position.set(s.x + ax * ride.dx, s.y + 0.02, s.z + az * ride.dx);
      me.root.rotation.y = ride.from === 'low' ? line.heading : line.heading + Math.PI; // face the way it goes
    },
  };
}
