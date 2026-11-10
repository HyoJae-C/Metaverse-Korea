// Phone steering: the joystick turns the view as you walk, so one thumb is
// enough. Pushing the stick to the side turns the camera that way (a gentle,
// eased turn); pulling it back walks toward the camera without spinning the
// view round. A drag with the other thumb turns the view too, also while
// walking or running (a second Settings switch, on by default; off, the view's
// left and right stay fixed while the stick is held and a drag only tilts it
// up and down). Phones only, on by default, with a Settings switch back to the
// old controls (the stick never turns the view, drags turn it freely).
//
// Why the dead zone: the old follow camera swung the view on every small
// wobble of the thumb and players got lost (see game/follow-cam.js).
// Only a clear sideways push turns it.
const KEY = 'mk.touchSteer';
const DRAG_KEY = 'mk.dragTurn'; // '0': no sideways drag while the stick is held
const DEAD = 0.28; // sideways push (of 1) that does nothing
const RATE = 1.5; // radians a second at full sideways push
const BACK = 2.1; // stick pointing further back than this (radians from forward): no turn

export function createTouchSteer(game) {
  const { input, cam } = game;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch { /* ignore */ }
  let dragTurn = true;
  try { dragTurn = localStorage.getItem(DRAG_KEY) !== '0'; } catch { /* ignore */ }
  let rate = 0; // eased turn speed
  const btn = document.getElementById('steer-btn');
  const dragBtn = document.getElementById('dragturn-btn');
  // The drag switch only matters with stick steering on (classic controls
  // always turn on a drag), so it shows only then.
  const showDrag = () => { if (dragBtn) dragBtn.hidden = !(input.isTouch && on); };
  if (btn) {
    btn.hidden = !input.isTouch;
    btn.setAttribute('aria-pressed', String(on));
    btn.onclick = () => {
      on = !on;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
      btn.setAttribute('aria-pressed', String(on));
      showDrag();
      game.toast?.(game.t(on ? 'steer.on' : 'steer.off'));
    };
  }
  if (dragBtn) {
    dragBtn.setAttribute('aria-pressed', String(dragTurn));
    dragBtn.onclick = () => {
      dragTurn = !dragTurn;
      try { localStorage.setItem(DRAG_KEY, dragTurn ? '1' : '0'); } catch { /* ignore */ }
      dragBtn.setAttribute('aria-pressed', String(dragTurn));
      game.toast?.(game.t(dragTurn ? 'dragTurn.on' : 'dragTurn.off'));
    };
  }
  showDrag();
  const active = () => on && input.isTouch;
  const stickHeld = () => !!input.stick;

  return {
    get on() { return active(); },
    // Before the camera takes the drag: with the drag switch off, no
    // sideways turn while walking.
    look(look) {
      if (active() && !dragTurn && stickHeld()) look.dx = 0;
      return look;
    },
    // Turn the camera with the stick. `can` is false on rides, benches, in
    // first person and the close-up cameras. Returns true when steering, so
    // the walk follows the camera as it turns.
    turn(dt, mx, my, can) {
      if (!active() || !can || !stickHeld() || Math.hypot(mx, my) < 0.05) { rate = 0; return false; }
      const back = Math.abs(Math.atan2(mx, my)) > BACK;
      const s = Math.abs(mx) < DEAD || back ? 0 : Math.sign(mx) * (Math.abs(mx) - DEAD) / (1 - DEAD);
      rate += (s * RATE - rate) * Math.min(1, dt * 8);
      cam.yaw -= rate * dt;
      return true;
    },
  };
}
