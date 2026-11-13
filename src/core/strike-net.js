// NEON STRIKE between two people (rules in core/strike.js). The host's match
// decides everything: bots, hits, the score, who is down. The guest moves
// only their own player on their own screen, so walking and aiming never
// wait on the network, and tells the host where they are and what they shot;
// the host tells the guest how the whole match stands. Each side sends one
// small message SEND_EVERY ticks (under four a second), shots and events
// packed inside, so a five minute match is about 2,400 messages each way.
//
//   host → guest  { n, s: match.snapshot(), e: [events] }
//   guest → host  { n, g: [x, z, yaw, pitch, scoped, spawns, next gun], f: [shots] }
// events: ['k', by, to, zone, gun] a kill · ['h', by, to, zone, dmg] a hit on
// the guest · ['s', by, gun, x, y, z, wall] a shot to draw (players by index)
import { GUN_IDS, ZONES, aimFrom } from './strike.js';

export const SEND_EVERY = 8; // ticks (30 a second)
const MAX_SHOTS = 14; // shots drawn per message (a kill or a hit is never dropped)

const r2 = (v) => Math.round(v * 100) / 100;

// The host's side. peer: the guest's player id. send(msg).
export function createHost({ match, peer, send }) {
  let n = 0, tick = 0, shots = [], rest = [];
  const idx = (id) => match.players.findIndex((p) => p.id === id);
  // Keep what the guest's screen needs from this tick's events.
  function note(ev) {
    for (const e of ev) {
      if (e.k === 'kill') rest.push(['k', idx(e.by), idx(e.to), ZONES.indexOf(e.zone), GUN_IDS.indexOf(e.gun)]);
      else if (e.k === 'hit' && e.to === peer) rest.push(['h', idx(e.by), idx(e.to), ZONES.indexOf(e.zone), e.dmg]);
      else if (e.k === 'shot' && e.by !== peer) { shots.push(['s', idx(e.by), GUN_IDS.indexOf(e.gun), r2(e.to[0]), r2(e.to[1]), r2(e.to[2]), e.wall ? 1 : 0]); if (shots.length > MAX_SHOTS) shots.shift(); }
    }
  }
  return {
    // After each match.step(): its events. Sends when it is time (and at once when the match ends).
    tick(ev) {
      note(ev);
      tick++;
      if (tick % SEND_EVERY && !ev.some((e) => e.k === 'over')) return;
      send({ n: ++n, s: match.snapshot(), e: [...rest, ...shots] });
      shots = []; rest = [];
    },
    // A message from the guest → events for the host's screen (their shots, what they hit).
    receive(msg) {
      const ev = [];
      if (!msg || typeof msg !== 'object') return ev;
      if (Array.isArray(msg.g)) {
        const [x, z, yaw, pitch, scoped, spawns, next] = msg.g;
        match.setRemote(peer, { x, z, yaw, pitch, scoped: !!scoped, spawns, next: GUN_IDS[next] });
      }
      if (Array.isArray(msg.f)) for (const f of msg.f.slice(0, 40)) { const out = match.claim(peer, f); ev.push(...out); note(out); }
      return ev;
    },
  };
}

// The guest's side. match: createMatch({ …, guest: me }). send(msg).
export function createGuest({ match, me, send }) {
  let n = 0, tick = 0, last = 0;
  const id = (i) => match.players[i]?.id;
  return {
    // After each match.step().
    tick() {
      tick++;
      if (tick % SEND_EVERY) return;
      const p = match.byId(me);
      const f = match.out.splice(0).slice(-30).map(([o, d, t, ti, zi, wall]) => [o.map(r2), d.map((v) => Math.round(v * 1000) / 1000), r2(t), ti, zi, wall]);
      send({ n: ++n, g: [r2(p.x), r2(p.z), r2(p.yaw), r2(p.pitch), p.scoped ? 1 : 0, p.spawns, GUN_IDS.indexOf(p.nextGun || p.gun)], f });
    },
    // A message from the host → events for the guest's screen.
    receive(msg) {
      const ev = [];
      if (!msg || typeof msg !== 'object' || !msg.s) return ev;
      if (msg.n <= last) return ev; // (an old one arriving late)
      last = msg.n;
      ev.push(...match.apply(msg.s));
      const wire = [];
      for (const e of Array.isArray(msg.e) ? msg.e : []) {
        if (e[0] === 'k') wire.push({ k: 'kill', by: id(e[1]), to: id(e[2]), zone: ZONES[e[3]] || 'body', gun: GUN_IDS[e[4]] || 'magpie' });
        else if (e[0] === 'h') wire.push({ k: 'hit', by: id(e[1]), to: id(e[2]), zone: ZONES[e[3]] || 'body', dmg: e[4] });
        else if (e[0] === 's') { const p = match.players[e[1]]; if (p && p.id !== me) wire.push({ k: 'shot', by: p.id, gun: GUN_IDS[e[2]] || p.gun, from: aimFrom(p), to: [e[3], e[4], e[5]], wall: !!e[6] }); }
      }
      for (const e of wire) if (e.by && (e.k === 'shot' || e.to)) ev.push(e); // (a player index we do not have: dropped)
      return ev;
    },
  };
}
