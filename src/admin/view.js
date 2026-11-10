// Small helpers for the operators' live player map (admin.html), kept apart
// so they can be tested without a browser.

// "On the street", "In Ongi Café" or the raw id for a place we don't know.
export function describePlace(place, stores) {
  if (!place || place === 'street') return 'On the street';
  const s = stores.get(place);
  return 'In ' + (s?.name?.en || s?.name?.ko || place);
}

// "now", "12 s ago", "4 min ago", "3 h ago", "2 d ago".
export function agoText(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 5) return 'now';
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

// A view ({ cx, cz, scale }) that shows every point with a margin, on a
// canvas w×h device pixels. One point (or all in one spot) zooms to street
// level around it. Null without points.
export function fitView(points, w, h, dpr = 1) {
  if (!points?.length || !w || !h) return null;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const pad = 60 * dpr;
  const spanX = Math.max(x1 - x0, 1), spanZ = Math.max(z1 - z0, 1);
  const scale = Math.min(1.5 * dpr, (w - pad * 2) / spanX, (h - pad * 2) / spanZ);
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, scale: Math.max(0.02, scale) };
}

// Groups points that sit close together on screen, for the live map's
// "counts" mode. pts: [{ sx, sy, ... }] in screen pixels; radius in the same
// pixels. Greedy: each point joins the first group whose centre is within
// the radius, and the centre moves to the group's average. Returns
// [{ sx, sy, items }], biggest group first.
export function clusterPoints(pts, radius) {
  const groups = [];
  for (const p of pts) {
    let g = null;
    for (const c of groups) if (Math.hypot(c.sx - p.sx, c.sy - p.sy) <= radius) { g = c; break; }
    if (!g) { groups.push({ sx: p.sx, sy: p.sy, items: [p] }); continue; }
    g.items.push(p);
    g.sx += (p.sx - g.sx) / g.items.length;
    g.sy += (p.sy - g.sy) / g.items.length;
  }
  return groups.sort((a, b) => b.items.length - a.items.length);
}
