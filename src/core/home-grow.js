// When a home grows (core/home-stages.js), the furniture moves with the
// walls, so a bed in the back corner stays in the back corner:
//   - everything moves back as far as the back wall did (the door wall stays);
//   - a piece in the left or right third of the room moves out with that
//     side wall (the middle third stays, so a sofa and its TV keep together);
//   - small pieces on a table go with their table.
// A piece that would then bump into another stays off the side wall
// (moved back only), which always fits: the whole room just moved back.
import { pieceBlocked, topUnder } from './furniture.js';

export function growLayout(items, from, to) {
  const dz = (to.d - from.d) / 2, dw = (to.w - from.w) / 2;
  if (dz <= 0 && dw <= 0) return items.map((i) => ({ ...i }));
  const out = items.map((i) => ({ ...i }));
  const sideOf = (i) => (i.x < -from.w / 6 ? -1 : i.x > from.w / 6 ? 1 : 0);
  // Who stands on what (worked out before anything moves).
  const under = out.map((i) => (i.y ? out.indexOf(topUnder(i, out)?.on) : -1));
  const side = out.map((i, k) => (i.y ? 0 : sideOf(items[k])));
  const place = () => out.forEach((i, k) => {
    const base = items[k], host = under[k] >= 0 ? under[k] : k;
    i.x = base.x + side[host] * dw;
    i.z = base.z - dz;
  });
  place();
  for (let guard = 0; guard < out.length; guard++) {
    const bad = out.findIndex((i, k) => side[k] && pieceBlocked(i, out));
    if (bad < 0) break;
    side[bad] = 0;
    place();
  }
  return out;
}
