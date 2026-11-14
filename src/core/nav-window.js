// The walking grid (core/nav-grid.js) for a window of the map round the
// walker, not the whole map: all of Seoul at 1/4 is about 9 x 7.6 km, which as
// one grid of 1.5 m cells is 31 million cells (over 100 MB). The window is
// built again when the walker has moved `slack` metres from its middle. A
// destination outside the window has no cell, so NavGrid.route gives null and
// the caller falls back to the road graph, as it already did for far places;
// the grid takes over once the destination is inside the window.
//
// make(bounds) builds a grid for { minX, minZ, maxX, maxZ }.
export function createNavWindow(make, bounds, { half = 700, slack = 200 } = {}) {
  let grid = null, cx = 0, cz = 0;
  const whole = bounds.maxX - bounds.minX <= half * 2 && bounds.maxZ - bounds.minZ <= half * 2;
  return (x, z) => {
    if (whole) return (grid ||= make(bounds));
    if (!grid || Math.abs(x - cx) > slack || Math.abs(z - cz) > slack) {
      cx = x; cz = z;
      grid = make({ minX: Math.max(bounds.minX, x - half), minZ: Math.max(bounds.minZ, z - half), maxX: Math.min(bounds.maxX, x + half), maxZ: Math.min(bounds.maxZ, z + half) });
    }
    return grid;
  };
}
