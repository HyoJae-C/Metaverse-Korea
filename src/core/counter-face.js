// Seeing the face of the person behind a counter (Yozi 2026-11-13: at every
// shop and stall with a counter, you can see the seller's face). The rule
// for anything built with someone standing behind it:
//   - the counter (and whatever stands on it) is no higher than COUNTER_H;
//   - signs and awnings go above the head (SIGN_ABOVE), not in front of it;
//   - when a counter has to be taller (a truck's hatch, a bar), the seller
//     stands or sits higher (lift) so the chin stays over it.
// tests/counter-faces.test.mjs checks every one of them from the camera of a
// player standing where you buy.

// Where a standing character's face is, from the feet (the KayKit models at
// the pack's scale with the head at HEAD_SCALE, core/model-pack.js): the
// chin, mouth and eyes; the head's top (hair) is at about 1.18 m.
export const FACE = { chin: 0.63, mouth: 0.72, eyes: 0.85, top: 1.18, front: 0.24 };
// Sitting (on a stool whose top is `y` + 0.38) puts the face this much higher
// than standing at `y`.
export const SIT_RISE = 0.08;

// The highest a counter may be in front of someone standing on the floor:
// under the chin with room to spare, so from close by (where a counter's
// front edge looks higher) the whole face still shows. (0.62 showed the
// eyes but hid the chin: the bait stall, 2026-11-13.)
export const COUNTER_H = 0.55;
// The lowest edge of a sign or awning hung in front of them: over the head.
export const SIGN_ABOVE = 1.3;
// How far in front of the seller you stand to buy.
export const BUY_AHEAD = 1.4;

// The Han River kiosks (core/han-park.js, core/park.js): where the goods
// stand along the counter (by how many kinds), and the clerk behind it, in
// the widest gap, so the goods don't hide the face.
export const KIOSK_GOODS_X = { 0: [], 1: [-0.6], 2: [-0.8, 0.8], 3: [-1.05, -0.35, 1.05] };
export const KIOSK_CLERK_X = { 0: 0, 1: 0.4, 2: 0, 3: 0.35 };

// How high to stand someone (a step or a platform behind the counter) so
// their chin clears a counter `top` metres high. 0 when it already does.
export const liftFor = (top) => Math.max(0, +(top - COUNTER_H).toFixed(3));

// The points of a face to see: { x, y, z, what }. staff: { x, z, ry, y?, sit? }
// (ry: the way they face, like a character's rotation.y).
export function faceSpots({ x, z, ry = 0, y = 0, sit = false }) {
  const fx = Math.sin(ry), fz = Math.cos(ry), base = y + (sit ? SIT_RISE : 0);
  return [['eyes', FACE.eyes], ['mouth', FACE.mouth], ['chin', FACE.chin + 0.03]].map(([what, h]) => ({ x: x + fx * FACE.front, y: base + h, z: z + fz * FACE.front, what }));
}
