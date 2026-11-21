// Full-screen things with nothing of the street showing round them: the
// textbook reader and the gallery's shooting game. While one is up the 3D view
// behind isn't drawn (the game keeps going), like with the full map, to keep
// phones cool (Yozi, 2026-11-21). Looked up four times a second, not every
// frame.
//
//   const covered = createScreenCovered();
//   if (covered(dt)) skip drawing;
export const COVERS = '#book-panel.book-full:not([hidden]), .gallery-fps';

export function createScreenCovered({ doc = globalThis.document, every = 0.25 } = {}) {
  let t = 0, on = false;
  return (dt) => {
    t -= dt;
    if (t > 0) return on;
    t = every;
    on = !!doc?.querySelector(COVERS);
    return on;
  };
}
