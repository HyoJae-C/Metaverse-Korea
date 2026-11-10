// The folk games yard in Namsangol Hanok Village (Jung-gu): where the four
// games' props stand and who is already there. Metres from the yard's
// centre (the "folkyard" landmark in districts/euljiro.json), before the
// yard's turn: every prop is turned half round (ry = PI) so you play facing
// the hanok houses at the back, with the gate behind you. The middle lane
// from the gate (|x| < 4) stays empty, so you walk straight in.
//
// The props' solid parts (SOLID) go into euljiro.json's blockers through
// scripts/build-euljiro.mjs, which places the yard at the plaza's centre.

// The yard is hidden for now (Yozi, 2026-11-10: hardly anyone goes in): no
// props, no locals, no "Play" buttons, and no solid parts on the plaza. The
// code stays as it is. To bring it back, set this to true and run
// node scripts/build-euljiro.mjs (it puts the props' blockers back).
export const FOLK_GAMES_ON = false;

export const FOLK_YARD = {
  ry: Math.PI,
  // Each game's prop, at [x, z] from the yard's centre.
  props: {
    yut: [-12, 2],
    tuho: [9, 4],
    jegi: [16, -3],
    neol: [-19, -3],
  },
  // The locals, in the prop's own frame (before ry), so they stay with it.
  // sit: on a floor cushion round the yut mat; on: standing on the board.
  people: [
    { id: 'grandma', game: 'yut', at: [1.34, -1.34], sit: true, look: 'elder' },
    { id: 'minjun', game: 'yut', at: [-1.34, -1.34], sit: true, look: 'young' },
    { id: 'seoyeon', game: 'yut', at: [1.34, 1.34], sit: true, look: 'young' },
    { id: 'teacher', game: 'tuho', at: [-1.1, 2.3], look: 'teacher' },
    { id: 'kid', game: 'jegi', at: [1.1, 1.3], look: 'kid' },
    { id: 'suni', game: 'neol', at: [1.32, 0], on: true, look: 'hanbok' },
  ],
  // Who answers for each game (FOLK_LINES through the panel's onSay).
  speaker: { yut: 'grandma', tuho: 'teacher', jegi: 'teacher', neol: 'suni' },
  // Inside this box (yard metres) you are in the yard: the first step in
  // says its name.
  box: [-24, -10, 24, 10],
  // Yutnori pays for a win, a few wins a day (the rest are just for fun).
  yutWin: 5000,
  yutWinsPerDay: 3,
};

// Solid parts of each prop, in its own frame: [x, z, half width, half depth].
// The yut mat is flat, so you can walk over it.
export const FOLK_SOLID = {
  tuho: [[0, 0, 0.35, 0.35], [0.95, 2.9, 0.15, 0.09]], // the jar, the arrow rack
  jegi: [[0, 0, 0.35, 0.23]], // the stool
  neol: [[0, 0, 1.6, 0.19]], // the board
};
// The blockers for a yard at { x, z }: one polygon per solid part.
export function folkBlockers(yard) {
  const r2 = (v) => Math.round(v * 100) / 100 + 0; // (+ 0: no -0)
  const out = [];
  for (const [game, parts] of Object.entries(FOLK_SOLID)) for (const [x, z, hx, hz] of parts) {
    out.push({ p: [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([a, b]) => propToWorld(yard, game, [x + a, z + b]).map(r2)) });
  }
  return out;
}

// A point in a prop's own frame to world metres.
export function propToWorld(yard, game, [lx, lz]) {
  const [px, pz] = FOLK_YARD.props[game];
  const c = Math.cos(FOLK_YARD.ry), s = Math.sin(FOLK_YARD.ry);
  return [yard.x + px + lx * c + lz * s, yard.z + pz - lx * s + lz * c];
}
