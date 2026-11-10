// The camera eases round behind you while you walk, as in most mobile 3D
// games: slowly, only while you're moving, and never while you're steering
// the view yourself (a drag or the mouse waits WAIT seconds before it starts
// again). Walking toward the camera (pulling the stick back, S) doesn't spin
// it round. A Settings switch turns it off (the view then turns only when you
// drag it).
//
// Why slow and with the wait: the old follow swing turned at once on every
// small wobble of a thumb and fought the player's own drag, and players got
// lost (see main.js "Camera follow"). On phones with the joystick steering
// (game/touch-steer.js) the stick already turns the view, so this stays out
// of its way.
const KEY = 'mk.camFollow';
const WAIT = 1.5; // seconds after a drag before the camera follows again
const RATE = 1.3; // how fast it closes the gap (per second, at a run)
const FRONT = 2.3; // character facing the camera more than this (radians): leave it

export function createFollowCam(game) {
  const { cam, me } = game;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch { /* ignore */ }
  let hold = 0;
  const btn = document.getElementById('follow-btn');
  if (btn) {
    btn.setAttribute('aria-pressed', String(on));
    btn.onclick = () => {
      on = !on;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
      btn.setAttribute('aria-pressed', String(on));
      game.toast?.(game.t(on ? 'follow.on' : 'follow.off'));
    };
  }

  return {
    get on() { return on; },
    // After the character has turned this frame. dragged: the player moved
    // the view this frame; moving: walking or riding; can: not on a ride, a
    // bench, in first person or a close-up camera; pace: 0..1 (walk..run).
    update(dt, { dragged, moving, can, pace }) {
      if (dragged) hold = WAIT;
      else hold = Math.max(0, hold - dt);
      if (!on || !can || !moving || hold > 0) return false;
      const want = me.root.rotation.y + Math.PI;
      const d = Math.atan2(Math.sin(want - cam.yaw), Math.cos(want - cam.yaw));
      if (Math.abs(d) > FRONT) return false;
      cam.yaw += d * (1 - Math.exp(-dt * RATE * Math.min(1, 0.4 + pace)));
      return true;
    },
  };
}
