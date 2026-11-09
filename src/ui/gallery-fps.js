// The balloon booth in first person (gallery-ui.js starts it): you stand at
// the counter with a cork air rifle. The booth's back wall (the same game as
// the panel: core/arcade.js Gallery, same rows, corks, time and medals) fills
// the screen and turns with your aim, so moving the mouse (or dragging, on a
// phone) is turning your head; the crosshair stays in the middle. Click,
// Space or the fire button shoots: the rifle kicks, a cork flies, and
// whatever is under the crosshair pops.
// Drawn on one 2D canvas: no second WebGL context.
import { GALLERY_SECONDS, GALLERY_ROWS } from '../core/arcade.js';

const W = 600, H = 360; // the wall's own canvas (gallery-ui.js draws it)
const Y0 = GALLERY_ROWS[0].y - 0.12, Y1 = GALLERY_ROWS.at(-1).y + 0.12; // how far up and down you can aim

// opts: wall (the wall canvas), drawWall(t), shoot(x, y, t) → hit or null,
// status(t) → HUD text, over(t) → true when the round is done, done(),
// hint (how to play), fireLabel, exitLabel.
export function startGalleryFps(opts) {
  const root = document.createElement('div');
  root.className = 'gallery-fps';
  const cv = document.createElement('canvas');
  const hud = document.createElement('div');
  hud.className = 'gallery-fps-hud';
  const hint = document.createElement('div');
  hint.className = 'gallery-fps-hint';
  hint.textContent = opts.hint;
  const fire = document.createElement('button');
  fire.className = 'gallery-fps-fire';
  fire.textContent = '🔫';
  fire.setAttribute('aria-label', opts.fireLabel);
  const x = document.createElement('button');
  x.className = 'sheet-x gallery-fps-x';
  x.textContent = '✕';
  x.setAttribute('aria-label', opts.exitLabel);
  root.append(cv, hud, hint, fire, x);
  document.body.append(root);

  const aim = { x: 0.5, y: GALLERY_ROWS[1].y }, view = { x: 0.5, y: aim.y };
  let kick = 0, t0 = performance.now() / 1000, raf = 0, ended = false, sway = 0;
  const corks = [], puffs = [];
  let sw = 0, sh = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    sw = root.clientWidth; sh = root.clientHeight;
    cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  };
  size();
  window.addEventListener('resize', size);
  // The wall's scale on screen: a bit taller than the screen, so you look round it.
  const scale = () => Math.min((sh * 1.25) / H, (sw * 1.9) / W); // (a phone held upright sees most of the width)
  const move = (dx, dy) => {
    const s = scale();
    aim.x = (((aim.x + dx / (W * s)) % 1) + 1) % 1; // (the rows wrap round: turn as far as you like)
    aim.y = Math.min(Y1, Math.max(Y0, aim.y + dy / (H * s)));
    if (Math.abs(aim.x - view.x) > 0.5) view.x += Math.sign(aim.x - view.x); // (keep the view's turn next to the aim's)
  };
  const shoot = () => {
    if (ended) return;
    const t = performance.now() / 1000 - t0;
    if (t > GALLERY_SECONDS) return;
    const hit = opts.shoot(aim.x, aim.y, t);
    kick = 1;
    corks.push({ t, hit: !!hit });
    puffs.push({ t });
    hint.hidden = true;
  };
  // Mouse: lock the pointer on the first click (true mouse look); without a
  // lock the mouse still turns you as it moves.
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement !== cv && cv.requestPointerLock) { try { cv.requestPointerLock(); } catch { /* ignore */ } }
      shoot();
    } else drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
  });
  let drag = null;
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { move(e.movementX || 0, e.movementY || 0); return; }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    move(dx * 1.2, dy * 1.2);
  });
  cv.addEventListener('pointerup', (e) => { if (drag?.id === e.pointerId) drag = null; });
  fire.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); shoot(); });
  const keys = new Set();
  const onKey = (e) => {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown' && !e.repeat) { if (e.code === 'Escape') stop(); else shoot(); }
      return;
    }
    const k = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' }[e.code];
    if (!k) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown') keys.add(k); else keys.delete(k);
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  x.onclick = () => stop();

  // The cork rifle, bottom right, pointing at the crosshair.
  const rifle = (c, gx, gy, ang, k) => {
    c.save();
    c.translate(gx, gy);
    c.rotate(ang);
    c.translate(-k * 26, 0); // recoil
    const u = Math.min(sw, sh) / 420;
    c.scale(u, u);
    c.fillStyle = '#8a5536'; // stock
    c.beginPath(); c.moveTo(-150, -14); c.lineTo(-40, -16); c.lineTo(-30, 14); c.lineTo(-150, 40); c.closePath(); c.fill();
    c.fillStyle = '#6b3f2a'; c.fillRect(-60, -12, 46, 30);
    c.fillStyle = '#c9c9d4'; c.fillRect(-30, -10, 150, 16); // barrel
    c.fillStyle = '#9aa0ab'; c.fillRect(-30, 2, 150, 4);
    c.fillStyle = '#ff5f9e'; c.fillRect(-8, -14, 30, 24); // candy band
    c.fillStyle = '#fffaf3'; c.fillRect(0, -14, 8, 24);
    c.fillStyle = '#d9a77c'; c.fillRect(120, -11, 14, 18); // the cork in the muzzle
    c.restore();
  };

  const frame = (now) => {
    if (ended) return;
    const t = now / 1000 - t0, dt = 1 / 60;
    if (keys.size) move(((keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0)) * 6, ((keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0)) * 6);
    // The view follows the aim a beat late (a head turning), the crosshair
    // drifts off the middle by the difference.
    view.x += (aim.x - view.x) * 0.25; view.y += (aim.y - view.y) * 0.25;
    kick = Math.max(0, kick - dt * 7);
    sway += dt;
    opts.drawWall(Math.min(t, GALLERY_SECONDS));
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = scale(), cx = sw / 2, cy = sh * 0.45;
    const ox = cx - view.x * W * s, oy = cy - view.y * H * s + kick * 6;
    c.fillStyle = '#ff7a8a'; c.fillRect(0, 0, sw, sh); // (above and below the wall: the booth)
    for (const k of [-1, 0, 1]) c.drawImage(opts.wall, ox + k * W * s, oy, W * s, H * s);
    // The booth's frame round you: dark sides, the counter under your hands.
    const g = c.createLinearGradient(0, 0, sw, 0);
    g.addColorStop(0, 'rgba(60,20,40,0.55)'); g.addColorStop(0.18, 'rgba(60,20,40,0)'); g.addColorStop(0.82, 'rgba(60,20,40,0)'); g.addColorStop(1, 'rgba(60,20,40,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, sw, sh);
    c.fillStyle = '#ffd36e'; c.fillRect(0, sh * 0.86, sw, sh * 0.14);
    c.fillStyle = '#e2a64a'; c.fillRect(0, sh * 0.86, sw, 6);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fffaf3' : '#ff5a5f'; c.fillRect((i * sw) / 6, 0, sw / 6 + 1, sh * 0.05); } // awning
    // Where the crosshair is (aim relative to the view).
    let ax = aim.x - view.x;
    if (ax > 0.5) ax -= 1; else if (ax < -0.5) ax += 1;
    const hx = cx + ax * W * s, hy = cy + (aim.y - view.y) * H * s;
    // Corks in flight: from the muzzle to the crosshair, shrinking with distance.
    const gx = sw * 0.84, gy = sh * 0.98 + Math.sin(sway * 1.7) * 3;
    for (const k of corks) {
      const f = (t - k.t) / 0.14;
      if (f > 1) continue;
      const px = gx + (hx - gx) * f, py = gy + (hy - gy) * f - Math.sin(f * Math.PI) * 18, r = 9 * (1 - f) + 2;
      c.fillStyle = '#d9a77c'; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
    }
    rifle(c, gx, gy, Math.atan2(hy - gy, hx - gx), kick);
    for (const p of puffs) {
      const f = (t - p.t) / 0.25;
      if (f > 1) continue;
      const ang = Math.atan2(hy - gy, hx - gx), u = Math.min(sw, sh) / 420, mx = gx + Math.cos(ang) * 135 * u, my = gy + Math.sin(ang) * 135 * u;
      c.fillStyle = `rgba(255,255,255,${0.8 * (1 - f)})`; c.beginPath(); c.arc(mx, my, 10 + f * 22, 0, Math.PI * 2); c.fill();
    }
    // Crosshair.
    c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 4;
    c.beginPath(); c.arc(hx, hy, 14, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#e2457a'; c.lineWidth = 2;
    c.beginPath(); c.arc(hx, hy, 14, 0, Math.PI * 2);
    for (const [a, b, d, e] of [[-24, 0, -8, 0], [8, 0, 24, 0], [0, -24, 0, -8], [0, 8, 0, 24]]) { c.moveTo(hx + a, hy + b); c.lineTo(hx + d, hy + e); }
    c.stroke();
    c.fillStyle = '#e2457a'; c.beginPath(); c.arc(hx, hy, 2.5, 0, Math.PI * 2); c.fill();
    hud.textContent = opts.status(t);
    if (opts.over(t)) { stop(true); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  function stop(finished = false) {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', size);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    if (document.pointerLockElement === cv) document.exitPointerLock?.();
    root.remove();
    opts.done(finished);
  }
  return { stop, aim, get root() { return root; } };
}
