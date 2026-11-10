// Where Gyeongbokgung's fan dance stands and how far visitors keep back:
// main.js needs this for the collision map at start, before the performers
// (palace-show.js) are downloaded.

// The fan dance is a group dance (군무): the formation matters, so an
// unseen ring keeps visitors this far from its centre (main.js makes it a
// blocker). Closer than FAN_NOTE to the centre, a note asks for a few steps back.
export const FAN_KEEP = 10;
export const FAN_NOTE = FAN_KEEP + 2.5;
// Where they dance, in the palace district's metres (x east, z south;
// Gwanghwamun at (0, 0)): the middle of the lawn west of the corridors round
// Heungnyemun and Geunjeongjeon, which stood empty (Yozi, 2026-11-10).
export const FAN_AT = [-37, -52];
// A circle as a polygon (for the collision map).
export function ringPoly(x, z, r, n = 24) {
  return Array.from({ length: n }, (_, i) => [x + Math.sin((i / n) * Math.PI * 2) * r, z + Math.cos((i / n) * Math.PI * 2) * r]);
}
