// Seoul Dal (서울달): the tethered gas balloon in Yeouido Park. A big pale
// "moon" on a cable, with a ring-shaped gondola hanging under it: you board
// on the ground, it winches up over Yeouido, waits at the top so you can
// look down on the Han River, and comes back down.
//
// One shared clock (the wall clock), like the Namsan cable car: every player
// sees the balloon at the same height at the same moment, and everyone who
// boards in the same window rides up together.
//
// The real one (checked 2026-11-09, Seoul city and news reports): opened in
// 2024, rises to about 130 m for about 15 minutes, up to 20 people a flight,
// open every day 12:00-22:00 since April 2026, adults 25,000 won. The game's
// is shorter (a 3-minute cycle), lower (DAL.top) and smaller (DAL.max), so it
// fits the game map.
//
// Pure: no three.js here (the model and the ride are game/seoul-dal.js).

export const DAL = {
  fare: 25000, // won, the same as the real adult ticket
  top: 70, // metres up at the top (the 63 tower is about 135 m in the game)
  board: 40, // seconds on the ground with the gate open
  rise: 45, // seconds going up
  hover: 50, // seconds at the top: time for the view and a photo
  sink: 45, // seconds coming down
  close: 5, // the gate shuts this many seconds before lift-off
  deck: 0.25, // the gondola's floor above the pad when it's down
  ring: 3.3, // riders stand this far from the cable, round the ring
  max: 5, // people a flight (the real one takes 20; a quarter here, like the map,
  //         so the gondola stays roomy and a chat up top isn't crowded); the rest take a waiting ticket
  slots: 10, // places round the ring (twice the riders: two who board at once rarely share one)
  turn: 15, // seconds a called ticket has to board
  load: 650, // m: the balloon is loaded and drawn within this of it
};
DAL.cycle = DAL.board + DAL.rise + DAL.hover + DAL.sink;

const ease = (u) => u * u * (3 - 2 * u); // start and stop gently

// Where the balloon is at time t (seconds): h is the gondola floor's height
// above the pad; phase is 'board', 'up', 'top' or 'down'; left is how many
// seconds that phase has to go; n counts flights (it goes up once per cycle).
export function dalAt(t) {
  const { board, rise, hover, sink, cycle, top } = DAL;
  const n = Math.floor(t / cycle);
  const p = t - n * cycle;
  if (p < board) return { phase: 'board', h: 0, left: board - p, n };
  if (p < board + rise) { const u = (p - board) / rise; return { phase: 'up', h: top * ease(u), left: board + rise - p, n }; }
  if (p < board + rise + hover) return { phase: 'top', h: top, left: board + rise + hover - p, n };
  const u = (p - board - rise - hover) / sink;
  return { phase: 'down', h: top * (1 - ease(u)), left: cycle - p, n };
}
// The gate is open while it waits on the ground, until just before it goes.
export const gateOpen = (s) => s.phase === 'board' && s.left > DAL.close;
// Seconds until the gate next opens (0: open now).
export function opensIn(t) {
  const s = dalAt(t);
  if (gateOpen(s)) return 0;
  return s.phase === 'board' ? s.left + DAL.cycle - DAL.board : s.left + (s.phase === 'up' ? DAL.hover + DAL.sink : s.phase === 'top' ? DAL.sink : 0);
}
export const dalClock = () => Date.now() / 1000;

// A rider's place in the gondola, in the balloon's own frame (x, z from the
// cable): slot k of DAL.slots round the ring, facing out.
export function riderSpot(k) {
  const a = ((k % DAL.slots) / DAL.slots) * Math.PI * 2;
  return { x: Math.sin(a) * DAL.ring, z: Math.cos(a) * DAL.ring, ry: a };
}
// m:ss for the buttons.
export const clock = (s) => { const n = Math.max(0, Math.ceil(s)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
