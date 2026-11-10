// Minimap: a small round map in the top-left corner of the street, turned
// with the camera so "up" is the way you are looking (the stick walks that
// way too). Streets, parks, water, your arrow, a north mark, and the place
// you are being guided to (on the rim when it is farther). Tap it for the
// full map.
//
// Light on purpose: the streets are drawn at most 5 times a second into a
// small canvas; between drawings only CSS turns it, and your arrow is a DOM
// element that turns every frame. A grid of 64 m cells finds what is near.
import { t } from '../core/i18n.js';

const CELL = 64;
export const VIEW_M = 75; // metres from the centre to the rim

// Cells (64 m) each shape's bounding box touches, for a quick look-up.
export function gridIndex(shapes) {
  const grid = new Map();
  shapes.forEach((s, i) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of s.p) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    for (let a = Math.floor(x0 / CELL); a <= Math.floor(x1 / CELL); a++) {
      for (let b = Math.floor(z0 / CELL); b <= Math.floor(z1 / CELL); b++) {
        const k = a + ',' + b;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
    }
  });
  return grid;
}
// Shapes with a part within r metres (by cell) of (x, z), each once.
export function nearShapes(grid, shapes, x, z, r) {
  const seen = new Set(), out = [];
  for (let a = Math.floor((x - r) / CELL); a <= Math.floor((x + r) / CELL); a++) {
    for (let b = Math.floor((z - r) / CELL); b <= Math.floor((z + r) / CELL); b++) {
      for (const i of grid.get(a + ',' + b) || []) if (!seen.has(i)) { seen.add(i); out.push(shapes[i]); }
    }
  }
  return out;
}
// Where a target at (dx, dz) from you sits on a map of radius r (pixels,
// s px per metre): itself when inside, else on the rim, pulled in by `pad`.
export function rimPoint(dx, dz, s, r, pad) {
  const d = Math.hypot(dx, dz) * s;
  if (d <= r - pad) return { x: dx * s, y: dz * s, inside: true };
  const k = (r - pad) / (d || 1);
  return { x: dx * s * k, y: dz * s * k, inside: false };
}

const AREA = { plaza: '#e3dccd', sand: '#efe2c2', stone: '#e6e1d6', water: '#9fd2ee' }; // the rest: green
export const CLOSED_FILL = '#d9d4ca'; // land not built yet (map.closed): the map's "coming soon" grey
const ORDER = { plaza: 0, sand: 0, stone: 0, water: 2 };

// game: { hud, map, getMe() → { x, z, ry } , getYaw(), getGuide() → { x, z } | null,
//         getRoute() → [[x, z], …] | null,
//         visible() → bool, open() }
export function createMinimap(game) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'minimap';
  el.hidden = true;
  const canvas = document.createElement('canvas');
  const me = document.createElement('span');
  me.className = 'minimap-me';
  me.innerHTML = '<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M10 1.5 18 20 10 15.5 2 20Z" fill="#ff6f5b" stroke="#fffaf0" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  el.append(canvas, me);
  el.onclick = () => game.open();
  game.hud.append(el);

  const map = game.map;
  const areas = [...(map.areas || [])].sort((a, b) => (ORDER[a.k] ?? 1) - (ORDER[b.k] ?? 1));
  const closed = (map.closed || []).map((p) => ({ p }));
  const idx = {
    areas: gridIndex(areas), closed: gridIndex(closed), roads: gridIndex(map.roads || []),
    buildings: gridIndex(map.buildings || []), rail: gridIndex(map.rail || []),
  };
  let size = 0, dpr = 1, timer = 0, lastYaw = null, lastMe = null, shown = false;

  function resize() {
    const css = el.clientWidth || 88;
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = Math.round(css * dpr);
    canvas.width = canvas.height = size;
  }

  function draw(p) {
    if (!size) resize();
    const g = canvas.getContext('2d');
    const r = size / 2, s = r / VIEW_M;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.save();
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#f3ecdc';
    g.fillRect(0, 0, size, size);
    g.translate(r, r);
    const near = (k, list) => nearShapes(idx[k], list, p.x, p.z, VIEW_M * 1.5);
    const poly = (pts) => {
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const sx = (pts[i][0] - p.x) * s, sy = (pts[i][1] - p.z) * s;
        if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy);
      }
    };
    g.fillStyle = CLOSED_FILL;
    g.beginPath(); // (one path, so no seams between the rectangles)
    for (const c of near('closed', closed)) c.p.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo']((x - p.x) * s, (z - p.z) * s));
    g.fill();
    for (const a of near('areas', areas)) { g.fillStyle = AREA[a.k] || '#bfe3a8'; poly(a.p); g.fill(); }
    g.lineCap = g.lineJoin = 'round';
    for (const rd of near('roads', map.roads || [])) {
      poly(rd.p);
      g.strokeStyle = rd.k === 'walk' ? '#e6dcc8' : '#ffffff';
      g.lineWidth = Math.max(1.5 * dpr, rd.w * s);
      g.stroke();
    }
    g.fillStyle = '#d8c8ab';
    for (const b of near('buildings', map.buildings || [])) { poly(b.p); g.closePath(); g.fill(); }
    g.strokeStyle = '#b8bcc4';
    g.lineWidth = Math.max(2 * dpr, 6 * s);
    for (const rl of near('rail', map.rail || [])) { poly(rl.p); g.stroke(); }
    // North: a small "N" just inside the rim.
    g.fillStyle = '#ff6f5b';
    g.font = `900 ${10 * dpr}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', 0, -r + 9 * dpr);
    // Where the guide is taking you: the route along the streets, and the place.
    const gd = game.getGuide();
    const route = gd && game.getRoute?.();
    if (route?.length > 1) {
      poly([[p.x, p.z], ...route]);
      g.strokeStyle = '#fffaf0';
      g.lineWidth = 6 * dpr;
      g.stroke();
      g.strokeStyle = '#3d7bff';
      g.lineWidth = 3.5 * dpr;
      g.stroke();
    }
    if (gd) {
      const q = rimPoint(gd.x - p.x, gd.z - p.z, s, r, 9 * dpr);
      g.fillStyle = '#ffd23f';
      g.strokeStyle = '#4a3f35';
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.arc(q.x, q.y, (q.inside ? 6 : 5) * dpr, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.restore();
    // The rim.
    g.strokeStyle = 'rgba(255,250,240,0.95)';
    g.lineWidth = 3 * dpr;
    g.beginPath();
    g.arc(r, r, r - 1.5 * dpr, 0, Math.PI * 2);
    g.stroke();
  }

  // Every frame: turn with the camera; draw the streets again when you have
  // moved or turned enough, at most 5 times a second.
  function update(dt) {
    const want = game.visible();
    if (want !== shown) {
      shown = want;
      el.hidden = !want;
      if (want) { el.ariaLabel = el.title = t('hud.map'); resize(); lastMe = null; }
    }
    if (!shown) return;
    const p = game.getMe(), yaw = game.getYaw();
    timer -= dt;
    if (timer <= 0 && (!lastMe || Math.hypot(p.x - lastMe.x, p.z - lastMe.z) > 0.5 || game.getGuide() !== lastMe.guide || game.getRoute?.() !== lastMe.route)) {
      timer = 0.2;
      draw(p);
      lastMe = { x: p.x, z: p.z, guide: game.getGuide(), route: game.getRoute?.() };
    }
    if (lastYaw === null || Math.abs(yaw - lastYaw) > 0.004) {
      lastYaw = yaw;
      canvas.style.transform = `rotate(${yaw}rad)`;
    }
    me.style.transform = `translate(-50%, -50%) rotate(${yaw - p.ry + Math.PI}rad)`;
  }

  addEventListener('resize', () => { if (shown) { resize(); lastMe = null; } });
  return { el, update };
}
