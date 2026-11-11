// The mini hoop's size, shared by the court model (basketball-court.js) and
// the shot rules (basketball-game.js, downloaded with the court's panel).
export const HOOP = {
  h: 1.9, // rim height: a mini hoop for chibi players (about 1.1 m tall)
  r: 0.21, // rim radius
  ball: 0.09, // ball radius
  board: { z: -0.33, w: 1.1, h: 0.68, y0: 1.78, t: 0.04 }, // backboard: plane z, width, height, bottom edge, thickness
};
