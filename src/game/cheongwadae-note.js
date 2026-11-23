// Cheong Wa Dae is the president's office again (since 2025-12-29), a
// security facility: the grounds are built from the street only and you
// cannot go in (scripts/build-cheongwadae.mjs). Coming up to the main gate
// (the map's `bluegate` landmark; l.note: how near, m) says so, once each
// time you come up (again after walking 2.5 times as far away).
//   const note = createCheongwadaeNote({ landmarks: map.landmarks, toast, text: () => t('cheongwadae.note'), busy });
//   note.tick(p);   // each frame on the street
export function createCheongwadaeNote({ landmarks = [], toast, text, busy = () => false }) {
  const g = landmarks.find((l) => l.type === 'bluegate');
  if (!g) return { tick() {} };
  const x = g.x + Math.sin(g.ry || 0) * 4, z = g.z + Math.cos(g.ry || 0) * 4, r = g.note || 9; // (just in front of it)
  let shown = false;
  return {
    tick(p) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < r) { if (!shown && !busy()) { shown = true; toast(text()); } }
      else if (shown && d > r * 2.5) shown = false;
    },
  };
}
