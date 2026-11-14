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

// Routes with a window grid. A place on the grid: the grid's route round the
// walls. A place beyond it: the road graph says which streets lead there, the
// grid takes you round the walls to where that line leaves the window, and
// the rest follows the streets until the window has moved on (stale: plan
// again then). Without this a far route was the road graph's alone, which
// starts and ends with a straight line through whatever stands in the way.
//
// nav: createNavWindow's function; roadGraph: core/route.js RoadGraph, of the
// streets that join up (not the base map's roads, which share no junctions).
export function createRoutePlanner(nav, roadGraph, { margin = 40 } = {}) {
  let far = null; // the grid the last far route was planned on
  const within = (g, [x, z]) => g.inside(x - margin, z - margin) && g.inside(x + margin, z + margin);
  function plan(ax, az, bx, bz) {
    const grid = nav(ax, az);
    far = null;
    if (grid.inside(bx, bz)) {
      const near = grid.route(ax, az, bx, bz);
      if (near) return near;
    }
    const streets = roadGraph.route(ax, az, bx, bz);
    if (!grid.inside(bx, bz)) far = grid;
    // Points along the street line in 20 m steps, as far as it stays well
    // inside the window; the grid leads to the farthest of them it can reach
    // (one may be in a river or in closed land, when the "street line" is only
    // a straight line to a place no street joins up with).
    const steps = []; // [index of the segment's first point, fraction, x, z]
    walk: for (let i = 1; i < streets.length; i++) {
      const [px, pz] = streets[i - 1], [qx, qz] = streets[i], n = Math.max(1, Math.ceil(Math.hypot(qx - px, qz - pz) / 20));
      for (let t = 1; t <= n; t++) {
        const x = px + ((qx - px) * t) / n, z = pz + ((qz - pz) * t) / n;
        if (!within(grid, [x, z])) break walk;
        steps.push([i - 1, t / n, x, z]);
      }
    }
    for (let k = steps.length - 1, tries = 0; k >= 0 && tries < 6; k -= 3, tries++) {
      const [i, f, x, z] = steps[k];
      if (Math.hypot(x - ax, z - az) < 30) break;
      const head = grid.route(ax, az, x, z);
      if (head) return head.concat(streets.slice(f < 1 ? i + 1 : i + 2));
    }
    return streets;
  }
  // A far route was planned on a window the walker has since left.
  const stale = (x, z) => !!far && nav(x, z) !== far;
  return { plan, stale };
}
