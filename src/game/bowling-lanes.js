// The other bowlers in the room: every ball someone throws comes as a
// message (core/activities.js bowlThrowMsg); here it rolls down that lane
// with the same seed, so you see the ball and the pins fall as they did, and
// their score goes on the lane's screen (core/bowling-screen.js). Your own
// game draws itself (ui/activity-ui.js) and sets its lane's screen through
// setLocal. Loaded with the first bowling message in the bowling alley
// (game/arcade.js).
import { simulateRoll, throwFrom, rackSpot, seeded } from '../core/bowling-physics.js';
import { bowlingTurn } from '../core/activities.js';

const HOLD = 1.6; // seconds the fallen pins stay before the sweep
const STALE = 180; // a bowler who has thrown nothing for this long is taken off the screen

const now = () => performance.now() / 1000;
// The pins standing (ids) at their spots, or nudged where a ball left them.
export function rackFor(ids, left) {
  const at = new Map((left || []).map((p) => [p.i, p]));
  return ids.map((i) => at.get(i) || { i, ...rackSpot(i) });
}
// A thrown ball rolled again from its message.
export const replay = (m, rack) => simulateRoll(throwFrom(m), rack, seeded(m.seed));
// The pins as lane.show wants them (all standing).
export const standing = (rack) => rack.map((p) => ({ x: p.x, z: p.z, tilt: 0, heading: 0, gone: 0 }));
// One playback frame of a roll: { ball, pins } (pins in rack order).
export function frameAt(sim, rack, k) {
  const f = sim.frames[Math.max(0, Math.min(sim.frames.length - 1, k))];
  return {
    ball: { x: f.b[0], z: f.b[1], roll: f.b[2] },
    pins: rack.map((_, j) => ({ x: f.p[j][0], z: f.p[j][1], tilt: f.p[j][2], heading: f.p[j][3], gone: f.p[j][4] })),
  };
}
// What is left standing for the next ball after a roll: the pins the
// message says still stand, where this roll left them.
export function leftAfter(sim, m) {
  const down = new Set(m.down);
  return rackFor(m.rack.filter((i) => !down.has(i)), sim.left);
}

export function createBowlingLanes(game) {
  const rows = new Map(); // lane → Map(id → { name, rolls, at, left })
  const plays = new Map(); // lane → { sim, rack, t0, after }
  const local = new Map(); // lane → { rows, turn }: your own game
  const lanes = () => game.interior?.stations?.bowling || [];
  let sweep = 0;

  function refresh(lane) {
    const st = lanes()[lane];
    if (!st) return;
    const mine = local.get(lane);
    if (mine) { st.screen.set(mine.rows, mine.turn); return; }
    const list = [...(rows.get(lane)?.values() || [])];
    let turn = -1, last = 0;
    list.forEach((r, k) => { if (r.at > last) { last = r.at; turn = k; } });
    st.screen.set(list.map((r) => ({ name: r.name, rolls: r.rolls })), turn);
  }
  const rowOf = (lane, id) => {
    if (!rows.has(lane)) rows.set(lane, new Map());
    const m = rows.get(lane);
    if (!m.has(id)) m.set(id, { name: game.others.nameOf(id) || '?', rolls: [], at: now(), left: null });
    return m.get(id);
  };

  return {
    // A bowling message from someone in the room.
    heard(from, m) {
      const st = lanes()[m.lane];
      if (!st) return;
      if (m.kind === 'o') { rows.get(m.lane)?.delete(from); rowOf(m.lane, from); }
      else if (m.kind === 'x') rows.get(m.lane)?.delete(from);
      else if (m.kind === 't') {
        const r = rowOf(m.lane, from);
        const rack = rackFor(m.rack, bowlingTurn(m.rolls).fresh ? null : r.left);
        const sim = replay(m, rack);
        r.rolls = [...m.rolls, m.down.length];
        r.at = now();
        const t = bowlingTurn(r.rolls);
        r.left = t.over || t.fresh ? null : leftAfter(sim, m);
        if (!st.busy) plays.set(m.lane, { sim, rack, t0: now(), after: r.left || rackFor(PIN_IDS) });
      }
      refresh(m.lane);
    },
    // Your own game on a lane (rows as on the screen), or null when it ends.
    setLocal(lane, list, turn = -1) {
      if (list) local.set(lane, { rows: list, turn });
      else local.delete(lane);
      refresh(lane);
    },
    // Someone left the room: off the screens.
    gone(id) { for (const [lane, m] of rows) if (m.delete(id)) refresh(lane); },
    // Each frame: the others' balls roll.
    update() {
      const sts = lanes();
      const t = now();
      for (const [lane, p] of plays) {
        const st = sts[lane];
        if (!st || st.busy) { plays.delete(lane); continue; }
        const k = Math.floor((t - p.t0) * 60);
        if (k < p.sim.frames.length + HOLD * 60) {
          const f = frameAt(p.sim, p.rack, k);
          st.show(f.ball, f.pins, '#c83a7a');
        } else {
          st.show(null, standing(p.after));
          plays.delete(lane);
        }
      }
      if (t - sweep > 5) { // now and then: drop bowlers who left or went quiet
        sweep = t;
        for (const [lane, m] of rows) {
          let changed = false;
          for (const [id, r] of m) if (!game.others.nameOf(id) || t - r.at > STALE) { m.delete(id); changed = true; }
          if (changed) refresh(lane);
        }
      }
    },
    // A new room (or the same one built again): nothing carried over.
    reset() { rows.clear(); plays.clear(); local.clear(); },
  };
}
const PIN_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
