// Han River duck boat (오리배) race, no DOM so it can be unit-tested.
// Pedal by tapping left and right in turn: each alternating tap pushes the
// boat; tapping the same side twice does little. Ride with a friend next to
// you and your pedalling adds up. Reach the buoy before time runs out.

export const COURSE = 160; // metres to the buoy (100 good strokes alone, 50 each with a friend)
export const RACE_SECONDS = 30;
export const PUSH = 1.6; // metres per good stroke
export const WEAK = 0.4; // same pedal twice in a row
export const FRIEND_BONUS = 4; // coins for finishing together
export const duckMsg = (to, strokes) => `duck:${to}:${strokes | 0}`;
export function parseDuck(e) {
  const m = /^duck:([\w-]{1,64}):(\d{1,5})$/.exec(String(e));
  return m ? { to: m[1], strokes: +m[2] } : null;
}

export class DuckBoat {
  constructor() {
    this.dist = 0;
    this.last = null; // 'L' or 'R'
    this.mine = 0; // good strokes by me (sent to a partner)
    this.partner = 0; // their good strokes, as last heard
    this.fromPartner = 0; // distance already added from them
  }
  // A pedal tap; returns the metres it moved.
  pedal(side) {
    const good = side !== this.last;
    this.last = side;
    const m = good ? PUSH : WEAK;
    if (good) this.mine++;
    this.dist += m;
    return m;
  }
  // The partner's stroke count arrived: add what's new.
  heard(strokes) {
    if (strokes <= this.partner) return 0;
    const add = (strokes - this.partner) * PUSH;
    this.partner = strokes;
    this.dist += add;
    return add;
  }
  get done() { return this.dist >= COURSE; }
}

// Coins: 3 for reaching the buoy, +1 per 5 seconds to spare (up to +3).
export function duckPay(finished, secondsLeft) {
  if (!finished) return 0;
  return 3 + Math.min(3, Math.floor(Math.max(0, secondsLeft) / 5));
}
