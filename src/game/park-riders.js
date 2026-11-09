// Guests already riding Another Land's rides (the carousel, the ship, the
// drop tower, two gondolas of the wheel, the swing ride, the teacups, the
// train and one seat of the log flume), so the
// rides aren't empty when you walk up: they sit in their seats on the
// shared clock (park-rides.js), arms up when the ship swings high, and
// stay on through every cycle. The player gets a seat none of them has.
import { RIDE_CYCLE, seatAt } from '../core/park-rides.js';
import { makeNpc } from '../core/npcs.js';

const ARMS_UP = () => ({ armR: [-2.9, 0.5, 0], armL: [-2.9, -0.5, 0], foreR: [-0.2, 0, 0], foreL: [-0.2, 0, 0] });
// Which seats the guests take (the ship's ends and middle, three horses).
export const GUEST_SEATS = { viking: [1, 2, 6], carousel: [2, 5, 9], drop: [1, 4, 6], wheel: [7, 10], swing: [3, 8, 13], teacups: [0, 7, 11], train: [1, 6, 9], flume: [3] };

export function createParkRiders(labels) {
  return {
    // Once per theme-park room: the guests, sitting. (`themepark`: a Han
    // River park, `hanRiver`, has no rides, and the guests would hang in the
    // air over the river on seats that aren't there.)
    spawn(built) {
      if (built.riderNpcs || !built.themepark || built.island) return built.riderNpcs; // (nor the island: its only ride is the coaster)
      built.riderNpcs = [];
      for (const [kind, seats] of Object.entries(GUEST_SEATS)) for (const seat of seats) {
        const o = makeNpc(labels, '');
        o.tag.style.visibility = 'hidden';
        o.ch.activity('sit');
        o.ch.root.rotation.order = 'ZYX';
        o.kind = kind; o.seat = seat; o.up = false;
        built.scene.add(o.ch.root);
        built.riderNpcs.push(o);
      }
      return built.riderNpcs;
    },
    tick(list) {
      if (!list) return;
      const now = Date.now() / 1000;
      for (const o of list) {
        const s = seatAt(o.kind, o.seat, now);
        o.ch.root.position.set(s.x, s.y, s.z);
        o.ch.root.rotation.set(s.pitch || 0, s.ry, s.roll);
        o.labelY = s.y + 1.45; // (the name tag rides up with them: up the drop tower, round the wheel)
        const up = (o.kind === 'viking' && Math.abs(s.roll) > 0.7) || (o.kind === 'drop' && s.y < 3 && s.y > 1) || (o.kind === 'flume' && s.pitch > 0.4) || (o.kind === 'swing' && s.y > 1.2);
        if (up !== o.up) { o.up = up; o.ch.setMoves?.(up ? ARMS_UP : null); }
      }
    },
    // A free seat for the player: one of n seats from `from` (a wheel
    // gondola's two), not a guest's (if every one is, the first).
    freeSeat(kind, n, from = 0) {
      const taken = new Set(GUEST_SEATS[kind] || []);
      const all = Array.from({ length: n }, (_, i) => from + i), free = all.filter((i) => !taken.has(i));
      return free.length ? free[Math.floor(Math.random() * free.length)] : all[0];
    },
    cycles: RIDE_CYCLE,
  };
}
