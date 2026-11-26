// The view from Baegundae (북한산 백운대, 836 m): a painted panorama you can
// turn all the way round, opened from the flag at the top
// (game/bukhansan-walk.js). The game's Seoul is not drawn that far, so the
// view is a drawing in the game's flat style; it is not a photo and says so
// on the screen (Yozi 2026-11-27).
//
// Its shapes are the real ones: regions/another-seoul/bukhansan-view.json
// (scripts/build-bukhansan.mjs, from scripts/data/bukhansan-horizon.json)
// holds, for every half degree round the compass, how high the ground of
// each band of distance stands against the sky from the top, how much of it
// is lowland (the city), where the Han River's water shows, and where named
// places stand. Loaded with import() when asked for.
//
//   const v = openBukhanView({ text, lang, onClose });
//   v.open        true until closed
//   v.close()

export const VIEW = {
  px: 12, // strip pixels per degree
  top: 13, // degrees above level at the strip's top
  bottom: -35, // degrees below level at its bottom
  facet: 3, // bearing steps (1.5°) per facet of a far ridge
  start: 162, // the bearing you face first: Seoul, Namsan and the Han
  drift: 2.2, // degrees a second it turns by itself until you touch it
};

// A band's colours, far to near: [ridge, foot] (it pales towards the horizon).
const BAND_COLORS = [
  ['#5d8a55', '#6f9a5c'], // under 1.5 km: the mountain's own ridges
  ['#6b9566', '#86a878'],
  ['#7fa283', '#9bb592'],
  ['#93b0a0', '#aec3ae'],
  ['#a9c0bd', '#bfd0c6'],
  ['#bfd0d6', '#cfdcdc'], // 35-75 km
];

const pickName = (n, lang) => n[lang] || (lang === 'zht' ? n.zh : null) || n.en;
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// The whole turn as one strip (a canvas 360° wide).
export function paintStrip(data, makeCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })) {
  const V = VIEW, N = data.n, W = 360 * V.px, H = (V.top - V.bottom) * V.px;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const X = (i) => (i / N) * W, Y = (deg) => (V.top - deg) * V.px;
  const rnd = mulberry(836);
  // The sky.
  const sky = g.createLinearGradient(0, 0, 0, Y(-2));
  sky.addColorStop(0, '#5fa8e6'); sky.addColorStop(0.7, '#a9d3f2'); sky.addColorStop(1, '#dcecf4');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = 0; k < 16; k++) { // clouds: a few flat puffs (drawn twice at the seam)
    const x = rnd() * W, y = Y(3 + rnd() * 8), w = 60 + rnd() * 110;
    for (const dx of [0, -W, W]) for (let q = 0; q < 4; q++) { g.beginPath(); g.ellipse(x + dx + (q - 1.5) * w * 0.24, y - (q % 2) * 5, w * 0.2, 9 + (q % 2) * 5, 0, 0, Math.PI * 2); g.fill(); }
  }
  const ridge = (b, i) => data.ridge[b][((i % N) + N) % N] / 100;
  // each band's line: far bands in facets (the highest of each facet's bearings), near ones as they are
  const line = (b) => {
    const step = b >= 2 ? V.facet : 1, pts = [];
    for (let i = 0; i <= N; i += step) { let m = -90; for (let k = 0; k < step; k++) m = Math.max(m, ridge(b, i + k)); pts.push([X(i + (step - 1) / 2), Y(m), m]); }
    pts[0][0] = 0; pts[pts.length - 1][0] = W; pts[pts.length - 1][1] = pts[0][1];
    return pts;
  };
  const lines = data.ridge.map((_, b) => line(b));
  const lineY = (b, x) => { const p = lines[b]; let k = 1; while (k < p.length - 1 && p[k][0] < x) k++; const a = p[k - 1], q = p[k]; return a[1] + ((q[1] - a[1]) * (x - a[0])) / (q[0] - a[0] || 1); };
  for (let b = data.ridge.length - 1; b >= 0; b--) {
    const p = lines[b], [top, foot] = BAND_COLORS[b];
    const fill = g.createLinearGradient(0, Y(b ? 1 : 0), 0, Y(b ? -12 : V.bottom));
    fill.addColorStop(0, top); fill.addColorStop(1, foot);
    g.fillStyle = fill;
    g.beginPath(); g.moveTo(0, H); for (const [x, y] of p) g.lineTo(x, y); g.lineTo(W, H); g.closePath(); g.fill();
    // facets: on the far ridges, the slopes that face the sun (from the left) a little lighter
    if (b >= 2) for (let k = 1; k < p.length; k++) {
      const a = p[k - 1], q = p[k], d = q[1] - a[1];
      if (Math.abs(d) < 1.5) continue;
      g.fillStyle = d < 0 ? 'rgba(255,255,255,0.12)' : 'rgba(20,40,60,0.08)';
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(q[0], q[1]); g.lineTo(d < 0 ? q[0] : a[0], Math.max(a[1], q[1]) + 10); g.closePath(); g.fill();
    }
    // The woods on the near slopes: crowns in the season's colours.
    if (b <= 1) {
      const leaf = b ? ['#5d8f4a', '#6a9550', '#c9a23a', '#c9722e', '#4f8045', '#b8482c'] : ['#4f8a43', '#6fae55', '#e0b23a', '#e07a2c', '#3f6f3a', '#cc4a2a', '#5f9a4a'];
      for (let i = 0; i < N; i++) {
        const x = X(i), y0 = lineY(b, x) + 2, y1 = b ? Math.min(H, lineY(0, x)) : H;
        const n = Math.round((y1 - y0) / (b ? 26 : 15));
        for (let k = 0; k < n; k++) {
          const yy = y0 + rnd() * (y1 - y0), s = (b ? 2.2 : 3.4) * (0.6 + (yy - y0) / Math.max(40, y1 - y0)) * (0.7 + rnd() * 0.6);
          g.fillStyle = leaf[Math.floor(rnd() * leaf.length)];
          g.globalAlpha = b ? 0.55 : 0.8;
          g.beginPath(); g.moveTo(x - s, yy); g.lineTo(x, yy - s * 1.3); g.lineTo(x + s, yy); g.lineTo(x + s * 0.5, yy + s * 0.7); g.lineTo(x - s * 0.5, yy + s * 0.7); g.closePath(); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    // The city: where what you see of this band is lowland, little pale blocks.
    if (b >= 1) {
      for (let i = 0; i < N; i++) {
        const low = +data.low[b][i];
        if (low < 3) continue;
        const x = X(i), y0 = lineY(b, x) + 3, y1 = Math.min(H, lineY(b - 1, x)) - 2;
        if (y1 - y0 < 4) continue;
        const n = Math.round(((y1 - y0) / 14) * (low / 9) * (b <= 3 ? 2.2 : 1.2));
        for (let k = 0; k < n; k++) {
          const yy = y0 + rnd() * (y1 - y0), s = b <= 2 ? 2.6 : b === 3 ? 2 : 1.4, tall = rnd() < 0.16;
          g.fillStyle = ['rgba(246,243,236,0.85)', 'rgba(226,231,236,0.8)', 'rgba(250,236,214,0.8)'][Math.floor(rnd() * 3)];
          g.fillRect(x + rnd() * (W / N), yy - (tall ? s * 2.2 : s), s * (0.8 + rnd()), tall ? s * 2.2 : s);
        }
      }
    }
  }
  // The Han River, where its water shows.
  g.fillStyle = 'rgba(142,196,228,0.95)';
  for (const [i, lo, hi] of data.han || []) g.fillRect(X(i) - 1, Y(hi / 100) - 1, W / N + 2, Math.max(2.5, Y(lo / 100) - Y(hi / 100) + 2));
  // The bare granite of the peaks next door (Insubong, Mangyeongdae): the
  // nearest band's own outline round each, in flat rock colours.
  for (const pl of data.places) {
    if (pl.km > 1) continue;
    const i0 = Math.round((pl.az / 360) * N), half = 26, base = Y(pl.an - 7.5);
    const pts = [];
    for (let k = -half; k <= half; k++) { const r = Y(ridge(0, i0 + k)), e = Math.min(1, (half - Math.abs(k)) / 10), yy = base + (r - base) * e; if (yy < base) pts.push([X(i0 + k), yy]); } // (the rock runs out to both sides)
    if (pts.length < 3) continue;
    for (const dx of [0, -W, W]) {
      g.fillStyle = '#cfc8ba';
      g.beginPath(); g.moveTo(pts[0][0] + dx, base); for (const [x, y] of pts) g.lineTo(x + dx, y); g.lineTo(pts.at(-1)[0] + dx, base);
      for (let k = pts.length - 1; k >= 0; k -= 4) g.lineTo(pts[k][0] + dx, base + (10 + ((k * 7) % 5) * 5) * Math.min(1, Math.min(k, pts.length - 1 - k) / 8)); // (a broken lower edge, into the woods)
      g.closePath(); g.fill();
      const top = pts.reduce((m, q) => (q[1] < m[1] ? q : m)), end = pts.at(-1);
      g.fillStyle = 'rgba(120,110,96,0.2)'; // the shaded side: one facet from the top down its right shoulder
      g.beginPath(); g.moveTo(top[0] + dx, top[1]); for (const [x, y] of pts.filter((q) => q[0] >= top[0])) g.lineTo(x + dx, y); g.lineTo(top[0] + (end[0] - top[0]) * 0.3 + dx, base); g.closePath(); g.fill();
    }
  }
  // Under your feet: the top's own rock, all the way round.
  const edge = (x) => Y(-27.5) + Math.round((Math.sin((x / W) * Math.PI * 2 * 7) * 12 + Math.sin((x / W) * Math.PI * 2 * 19) * 6) / 6) * 6;
  g.fillStyle = '#c9c2b4';
  g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 36) g.lineTo(x, edge(x)); g.lineTo(W, H); g.closePath(); g.fill();
  g.fillStyle = '#b8b0a2';
  g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 36) g.lineTo(x, edge(x + 400) + 34); g.lineTo(W, H); g.closePath(); g.fill();
  return c;
}

export function openBukhanView({ text = (k) => k, lang = 'en', onClose = () => {}, url = 'regions/another-seoul/bukhansan-view.json' } = {}) {
  const V = VIEW;
  const root = document.createElement('div');
  root.id = 'bukhan-view';
  root.style.cssText = 'position:fixed;inset:0;z-index:60;background:#a9d3f2;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;font-family:inherit';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  const bar = (css) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;left:0;right:0;text-align:center;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;${css}`; return d; };
  const title = bar('top:calc(env(safe-area-inset-top, 0px) + 12px);font-size:20px;font-weight:700');
  title.textContent = text('bukhan.viewTitle');
  const hint = bar('top:calc(env(safe-area-inset-top, 0px) + 40px);font-size:14px');
  hint.textContent = text('bukhan.viewHint');
  const note = bar('bottom:calc(env(safe-area-inset-bottom, 0px) + 10px);font-size:12px;padding:0 12px;color:#3d3a36;text-shadow:0 1px 2px rgba(255,255,255,.7)');
  note.textContent = text('bukhan.viewNote');
  const close = document.createElement('button');
  close.type = 'button';
  close.id = 'bukhan-view-close';
  close.textContent = `✕ ${text('bukhan.viewClose')}`;
  close.style.cssText = 'position:absolute;right:12px;top:calc(env(safe-area-inset-top, 0px) + 10px);padding:8px 14px;border:0;border-radius:18px;background:rgba(0,0,0,.55);color:#fff;font-size:15px;cursor:pointer';
  root.append(canvas, title, hint, note, close);
  document.body.append(root);

  const api = { open: true, yaw: V.start, data: null, close: null };
  let strip = null, raf = 0, last = 0, touched = false, drag = null, dirty = true;
  const draw = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(root.clientWidth * dpr), h = Math.round(root.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const g = canvas.getContext('2d');
    if (!strip) { g.fillStyle = '#a9d3f2'; g.fillRect(0, 0, w, h); return; }
    const s = h / strip.height, per = V.px * s, span = w / per; // (pixels per degree on the screen; degrees across it)
    const left = (((api.yaw - span / 2) % 360) + 360) % 360, sx = left * V.px;
    for (let off = 0, x = sx; off < w;) { // (the strip, wrapped round at north)
      const part = Math.min(strip.width - x, (w - off) / s);
      g.drawImage(strip, x, 0, part, strip.height, off, 0, part * s, h);
      off += part * s; x = 0;
    }
    // The compass, and the named places' tags (drawn here, so they stay sharp).
    const at = (az) => { let d = (((az - api.yaw) % 360) + 540) % 360 - 180; return w / 2 + d * per; };
    const Y = (deg) => (V.top - deg) * per;
    g.textAlign = 'center';
    g.font = `700 ${Math.round(13 * dpr)}px sans-serif`;
    for (const [az, ch] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const x = at(az); if (x < -20 || x > w + 20) continue; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 0.5 * dpr, Y(11), dpr, 8 * dpr); g.fillStyle = '#fff'; g.fillText(ch, x, Y(11) - 4 * dpr); }
    g.font = `600 ${Math.round(13 * dpr)}px sans-serif`;
    const taken = []; // [x0, x1, row]
    for (const pl of api.data.places.filter((q) => !q.hidden).map((q) => ({ ...q, x: at(q.az) })).sort((a, b) => a.x - b.x)) {
      const x = pl.x;
      if (x < -80 || x > w + 80) continue;
      const y = Y(pl.an), label = `${pickName(pl.name, lang)}${pl.km >= 2 ? ` · ${Math.round(pl.km)} km` : ''}`, tw = g.measureText(label).width + 14 * dpr;
      let row = 0; while (taken.some((q) => q[2] === row && x - tw / 2 < q[1] + 6 * dpr && x + tw / 2 > q[0] - 6 * dpr)) row++;
      taken.push([x - tw / 2, x + tw / 2, row]);
      const ty = Math.max(Y(10.5), y - (34 + row * 24) * dpr);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(x, y - 3 * dpr); g.lineTo(x, ty + 6 * dpr); g.stroke();
      g.fillStyle = 'rgba(20,30,40,.62)';
      g.beginPath(); g.roundRect(x - tw / 2, ty - 14 * dpr, tw, 20 * dpr, 10 * dpr); g.fill();
      g.fillStyle = '#fff'; g.fillText(label, x, ty + 1 * dpr);
    }
  };
  const tick = (ms) => {
    if (!api.open) return;
    const dt = Math.min(0.1, (ms - last) / 1000 || 0); last = ms;
    if (!touched && strip) { api.yaw = (api.yaw + V.drift * dt) % 360; dirty = true; }
    if (dirty) { dirty = false; draw(); }
    raf = requestAnimationFrame(tick);
  };
  const onDown = (e) => { if (e.target === close) return; touched = true; drag = { x: e.clientX, yaw: api.yaw }; root.style.cursor = 'grabbing'; root.setPointerCapture?.(e.pointerId); hint.style.display = 'none'; };
  const onMove = (e) => {
    if (!drag || !strip) return;
    const per = V.px * (root.clientHeight / strip.height);
    api.yaw = (((drag.yaw - (e.clientX - drag.x) / per) % 360) + 360) % 360; dirty = true;
  };
  const onUp = () => { drag = null; root.style.cursor = 'grab'; };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { touched = true; api.yaw = (api.yaw + (e.key === 'ArrowLeft' ? -6 : 6) + 360) % 360; dirty = true; e.preventDefault(); e.stopPropagation(); }
    else e.stopPropagation(); // (no walking off the top while you look)
  };
  const onResize = () => { dirty = true; };
  api.close = () => {
    if (!api.open) return;
    api.open = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    root.remove();
    onClose();
  };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  close.addEventListener('click', api.close);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  raf = requestAnimationFrame(tick);
  api.ready = fetch(url).then((r) => { if (!r.ok) throw new Error(`view ${r.status}`); return r.json(); }).then((data) => {
    if (!api.open) return;
    api.data = data; strip = paintStrip(data); dirty = true;
  }).catch((e) => { console.warn('bukhansan view', e); hint.textContent = '…'; });
  return api;
}
