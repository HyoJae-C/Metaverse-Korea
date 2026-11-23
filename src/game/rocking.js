// Rocking chairs (Yozi 2026-11-22): sat in one, tap Rock and the chair rolls
// back and forth on its curved rockers with you in it; tap again to stop.
// Others see it too (the "rk" flag): the chair under them rocks on their
// screen. Downloaded the first time you sit in a rocking chair, or see
// someone rocking. The seat comes from core/furniture.js furnitureSeats
// (seat.rock: { piece, r, y }: the piece with its mesh, the rockers' radius
// and the height of their centre).

const AMP = 0.13; // how far it tips each way (radians, about 7.5°)
const PERIOD = 2.4; // seconds for one rock back and forth
const EASE = 2.5; // how quickly the swing grows when you start and dies when you stop

// The chair rolling on its rockers by angle a: tipped about its floor point
// and moved so the rockers' centre stays over the point they touch (a roll,
// not a slide). Returns [ty, tz]: the move in the chair's own frame.
export function rollOffset(a, r, y) {
  return [y - y * Math.cos(a), r * a - y * Math.sin(a)];
}

// Tip the chair (its mesh) and the person sat in it (their character) by a.
function tip(rock, ch, root, a) {
  const { piece, r, y } = rock;
  const g = piece.mesh;
  if (!g) return;
  const ry = piece.ry || 0, s = Math.sin(ry), c = Math.cos(ry), py = piece.y || 0;
  const [ty, tz] = rollOffset(a, r, y);
  g.rotation.order = 'YXZ'; // (turned round first, then tipped forward)
  g.rotation.set(a, ry, 0);
  g.position.set(piece.x + s * tz, py + ty, piece.z + c * tz);
  if (!ch) return;
  // The character's feet in the chair's frame (o), carried round the same
  // way: rig = Rx(a)·o + t - o.
  const dx = root.position.x - piece.x, dz = root.position.z - piece.z;
  const oy = root.position.y - py, oz = dx * s + dz * c;
  const ca = Math.cos(a), sa = Math.sin(a);
  ch.setRock(a, oy * ca - oz * sa + ty - oy, oy * sa + oz * ca + tz - oz);
}

export function createRocking(game) {
  let on = false, phase = 0, amp = 0, mine = null; // mine: the rock I'm tipping
  const peers = new Map(); // a player (core/players.js) -> { rock, phase, amp }

  // The rocking seat someone at (x, z) is sat in, in this room.
  const seatAt = (x, z) => (game.interior?.seats || []).find((s) => s.rock && Math.hypot(s.x - x, s.z - z) < 0.5);

  function stop() {
    on = false;
    if (mine) { tip(mine, game.me, game.me.root, 0); mine = null; }
    amp = 0;
    game.resend();
  }

  return {
    get rocking() { return on; },
    // The button while sat in a rocking chair: Rock, or Stop rocking.
    action() {
      return on
        ? { key: 'rock-off', label: '🪑 ' + game.t('rock.off'), run: () => { on = false; game.resend(); } }
        : { key: 'rock-on', label: '🪑 ' + game.t('rock.on'), run: () => { on = true; game.resend(); } };
    },
    stop, // stood up
    state(st) { if (on && game.seated?.rock) st.rk = 1; },
    tick(dt) {
      if (peers.size) { // (someone left while rocking: their chair stops)
        const here = new Set(game.others.players.values());
        for (const [q, pr] of peers) if (!here.has(q)) { tip(pr.rock, null, null, 0); peers.delete(q); }
      }
      const seat = game.seated?.rock ? game.seated : null;
      if (!seat && (on || mine)) stop();
      if (seat) {
        mine = seat.rock;
        amp += ((on ? AMP : 0) - amp) * Math.min(1, dt * EASE);
        if (on || amp > 0.002) phase += dt * Math.PI * 2 / PERIOD;
        else { amp = 0; phase = 0; }
        tip(mine, game.me, game.me.root, amp * Math.sin(phase));
      }
    },
    // Each other player, every frame (core/players.js tick).
    peer(q, dt) {
      let pr = peers.get(q);
      const rocking = q.target?.rk === 1 && q.target.sit;
      if (rocking && !pr) {
        const s = seatAt(q.ch.root.position.x, q.ch.root.position.z);
        if (!s) return;
        pr = { rock: s.rock, phase: 0, amp: 0 };
        peers.set(q, pr);
      }
      if (!pr) return;
      pr.amp += ((rocking ? AMP : 0) - pr.amp) * Math.min(1, dt * EASE);
      pr.phase += dt * Math.PI * 2 / PERIOD;
      if (!q.target?.sit || (!rocking && pr.amp < 0.002) || !pr.rock.piece.mesh?.parent) { // (got up: at once)
        tip(pr.rock, q.ch, q.ch.root, 0);
        peers.delete(q);
        return;
      }
      tip(pr.rock, q.ch, q.ch.root, pr.amp * Math.sin(pr.phase));
    },
  };
}
