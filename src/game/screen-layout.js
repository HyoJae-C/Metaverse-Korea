// Screen layout (Settings › Game settings):
// - Hide buttons: the top chips, tool buttons, emotes, minimap, chat and
//   quest bars go away for a clean view; the joystick, the action button and
//   whatever is open stay, so you can still walk and go into shops. The eye
//   button in the top-left corner (or the U key) hides and shows them; the
//   map button sits beside it and stays; the 📷 shows under it then. On
//   iPhones held upright the 📅 check-in joins the bag's row.
// - Minimap: shown while you are being guided somewhere (its route line is
//   what the guide arrow lacks), or always with a switch here.
// - Joystick (phones): "Fixed" (bottom left, as before), "Under your thumb"
//   (invisible until a thumb touches the lower left; it appears there), or
//   "My spot" (drag it where you like, e.g. the right side for left-handers).
// Loaded after the street is up, so none of it is in the first download.
const HIDE_KEY = 'mk.hideUi';
const MINIMAP_KEY = 'mk.minimap'; // '1': always on
const JOY_KEY = 'mk.joyMode'; // 'fixed' | 'float' | 'custom'
const POS_KEY = 'mk.joyPos'; // { x, y }: the stick's centre, as a share of the screen
const MODES = ['fixed', 'float', 'custom'];
const HALF = 62; // half the stick's size (px) plus its rim: keeps it on screen

const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

// The stick's centre in px for a saved { x, y } on a w × h screen, kept on it.
export function placeOnScreen(pos, w, h) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  return { x: clamp(pos.x * w, HALF, w - HALF), y: clamp(pos.y * h, HALF, h - HALF) };
}

// game: { input, hud, t, toast(text), isTouch, onMinimap(always) }
export function createScreenLayout(game) {
  const { t } = game;
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;

  // ---------- Hide buttons ----------
  const hideBtn = $('hideui-btn');
  const eye = document.createElement('button');
  eye.type = 'button';
  eye.className = 'ui-eye';
  eye.textContent = '👁️';
  game.hud.append(eye);
  let hidden = false;
  const setHidden = (on, say) => {
    hidden = on;
    root.classList.toggle('ui-hidden', on);
    hideBtn?.setAttribute('aria-pressed', String(on));
    eye.ariaLabel = eye.title = t(on ? 'hideUi.show' : 'hideUi.hide');
    eye.setAttribute('aria-pressed', String(on));
    save(HIDE_KEY, on ? '1' : '0');
    if (on && say) game.toast(t(game.isTouch ? 'hideUi.onTouch' : 'hideUi.on'));
  };
  setHidden(load(HIDE_KEY) === '1', false);
  if (hideBtn) hideBtn.onclick = () => {
    setHidden(!hidden, true);
    if (hidden) $('settings-panel').hidden = true; // (see the clean screen at once)
  };
  eye.onclick = () => setHidden(!hidden, true);
  // Phones and tablets: the map button moves from the tool row to beside the
  // eye (Android: out of the bottom bar too). PC keeps it in the tool row on
  // the right (Yozi). Either way it stays when the rest is hidden.
  const corner = $('map-btn');
  if (corner && game.isTouch) { corner.classList.add('corner-map'); game.hud.append(corner); }
  // iPhones held upright (tools at the top, 📒 beside the map): the 📅
  // check-in moves from the top chips to the second row, left of the bag, so
  // a long wallet or a narrow phone can't push it under the 📒 (Yozi
  // 2026-11-21). Back with the chips when the phone turns.
  const daily = $('daily-btn'), chips = $('coin-btn')?.parentElement;
  const upright = typeof matchMedia === 'function' ? matchMedia('(max-width: 700px) and (orientation: portrait)') : null;
  const placeDaily = () => {
    if (!daily || !chips || !game.isTouch) return;
    const row = upright?.matches && !root.classList.contains('android');
    if (row && daily.parentElement !== $('bag-btn')?.parentElement) { daily.className = 'tool daily-chip'; $('bag-btn').before(daily); }
    else if (!row && daily.parentElement !== chips) { daily.className = 'online coin-chip daily-chip'; $('coin-btn').before(daily); }
  };
  placeDaily();
  upright?.addEventListener?.('change', placeDaily);
  const mapBtn = $('minimap-btn');
  const setMinimap = (on) => {
    mapBtn?.setAttribute('aria-pressed', String(on));
    game.onMinimap?.(on);
  };
  setMinimap(load(MINIMAP_KEY) === '1');
  if (mapBtn) mapBtn.onclick = () => {
    const on = mapBtn.getAttribute('aria-pressed') !== 'true';
    save(MINIMAP_KEY, on ? '1' : '0');
    setMinimap(on);
  };
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyU' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable) return;
    setHidden(!hidden, true);
  });

  // ---------- Joystick ----------
  const stick = $('joystick');
  const knob = stick?.querySelector('.knob');
  const joyBtn = $('joy-btn'), joyVal = $('joy-val'), placeBtn = $('joy-place-btn');
  if (!stick || !knob || !game.isTouch) return { get hidden() { return hidden; }, setHidden };
  // A ring round the knob: the part that shows and moves in "Under your thumb".
  const ring = document.createElement('div');
  ring.className = 'joy-ring';
  stick.append(ring);
  ring.append(knob);

  let mode = MODES.includes(load(JOY_KEY)) ? load(JOY_KEY) : 'fixed';
  let pos = null;
  try { pos = JSON.parse(load(POS_KEY) || 'null'); } catch { pos = null; }
  if (!(pos && Number.isFinite(pos.x) && Number.isFinite(pos.y))) pos = null;

  const place = () => {
    if (mode === 'custom' && pos) {
      const p = placeOnScreen(pos, innerWidth, innerHeight);
      stick.style.left = p.x + 'px';
      stick.style.top = p.y + 'px';
    } else {
      stick.style.left = stick.style.top = '';
    }
  };
  const apply = () => {
    stick.classList.toggle('float', mode === 'float');
    stick.classList.toggle('custom', mode === 'custom' && !!pos);
    place();
    joyVal.textContent = t('joy.' + mode);
    placeBtn.hidden = mode !== 'custom';
  };
  joyBtn.hidden = false;
  apply();
  addEventListener('resize', place);

  // "My spot": drag the stick, then Done (or Reset to bottom left).
  const bar = document.createElement('div');
  bar.className = 'joy-place-bar';
  bar.hidden = true;
  const tip = document.createElement('p');
  const done = document.createElement('button');
  done.className = 'primary';
  const reset = document.createElement('button');
  reset.className = 'chip';
  bar.append(tip, reset, done);
  game.hud.append(bar);
  let drag = null;
  const startPlacing = () => {
    $('settings-panel').hidden = true;
    if (!pos) { // (from where it shows now: the ring, also in "Under your thumb")
      const r = ring.getBoundingClientRect();
      pos = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
    }
    mode = 'custom';
    apply();
    tip.textContent = t('joy.placeTip');
    done.textContent = t('joy.done');
    reset.textContent = t('joy.reset');
    stick.classList.add('placing');
    bar.hidden = false;
  };
  const stopPlacing = () => {
    stick.classList.remove('placing');
    bar.hidden = true;
    drag = null;
    save(JOY_KEY, mode);
    if (pos) save(POS_KEY, JSON.stringify({ x: +pos.x.toFixed(4), y: +pos.y.toFixed(4) }));
  };
  // Caught before the walking stick sees it (capture phase).
  stick.addEventListener('pointerdown', (e) => {
    if (!stick.classList.contains('placing')) return;
    e.stopImmediatePropagation();
    drag = e.pointerId;
    stick.setPointerCapture(drag);
  }, true);
  stick.addEventListener('pointermove', (e) => {
    if (drag !== e.pointerId) return;
    e.stopImmediatePropagation();
    pos = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
    place();
  }, true);
  const lift = (e) => { if (drag === e.pointerId) { drag = null; e.stopImmediatePropagation(); } };
  stick.addEventListener('pointerup', lift, true);
  stick.addEventListener('pointercancel', lift, true);
  done.onclick = stopPlacing;
  reset.onclick = () => { pos = null; mode = 'fixed'; save(POS_KEY, ''); apply(); stopPlacing(); };

  joyBtn.onclick = () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    if (mode === 'custom') { startPlacing(); return; }
    save(JOY_KEY, mode);
    apply();
    if (mode === 'float') game.toast(t('joy.floatTip'));
  };
  placeBtn.onclick = startPlacing;

  return { get hidden() { return hidden; }, setHidden, get joyMode() { return mode; } };
}
