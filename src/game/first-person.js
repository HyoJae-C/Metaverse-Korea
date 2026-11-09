// First-person view, like a shooter: the camera at your eyes, your own body
// hidden, the mouse turning your head (pointer lock on a computer: click the
// world to grab the mouse, Esc to let go) and WASD walking and strafing
// where you look. Only your own screen changes: other players see you as
// always, just facing where you look.
//
// On and off with V, the Settings switch, or the zoom: zoom in past the
// closest view to step in, zoom out to step back out. Rides, the cable car,
// flying and the close-up cameras (mirror, hat workshop, fishing, runway)
// keep their own views and pause it.
import * as THREE from 'three';

const KEY = 'mk.firstPerson';
const EYE = 1.35, EYE_SEATED = 0.95; // above the chibi head (1.2 m), so the world isn't seen from the knees
const PITCH = 1.35; // up and down as far as this (radians)
const SENS = 0.0028; // per pixel of mouse or finger
const ENTER_ZOOM = 2.4; // this much more zooming in at the closest view steps in

export function createFirstPerson(game) {
  const { camera, canvas, cam } = game;
  let on = false;
  try { on = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
  let pitch = 0, wasActive = false, pushIn = 0, hid = false;
  const dir = new THREE.Vector3();
  const btn = document.getElementById('fp-btn');

  const dot = document.createElement('div');
  dot.id = 'fp-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.cssText = 'position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;box-shadow:0 0 0 1.5px rgba(0,0,0,.55);pointer-events:none;z-index:5;display:none';
  document.body.appendChild(dot);

  const locked = () => document.pointerLockElement === canvas;
  const unlock = () => { if (locked()) document.exitPointerLock?.(); };
  const active = () => on && game.canUse();

  function set(v, quiet) {
    on = !!v;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
    btn?.setAttribute('aria-pressed', String(on));
    pushIn = 0;
    if (!on) unlock();
    if (!quiet) game.toast(game.t(on ? 'fp.on' : 'fp.off'));
  }
  btn?.setAttribute('aria-pressed', String(on));
  if (btn) btn.onclick = () => set(!on);

  // Click the world to grab the mouse (a computer only; on a phone you drag).
  canvas.addEventListener('pointerdown', (e) => {
    if (active() && e.pointerType === 'mouse' && !locked()) canvas.requestPointerLock?.()?.catch?.(() => {});
  });
  const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable;
  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if (e.code === 'KeyV' && !e.repeat) { set(!on); return; }
    // Keys that open a panel or a chat: give the mouse back to click in it.
    if (['KeyE', 'Enter', 'Space', 'KeyB', 'KeyM', 'KeyT', 'Slash', 'Tab'].includes(e.code)) unlock();
  });

  return {
    get on() { return on; },
    active,
    set,
    // The mouse and the zoom, instead of the orbiting camera. Returns false
    // when not in first person (the normal camera takes them).
    look(look) {
      if (!active()) {
        // Zoomed all the way in and still zooming in: step into first person.
        if (on || !game.canUse() || look.zoom >= 0 || cam.dist > 4.01) { if (look.zoom > 0) pushIn = 0; return false; }
        pushIn -= look.zoom;
        if (pushIn >= ENTER_ZOOM) set(true);
        return false;
      }
      cam.yaw -= look.dx * SENS;
      pitch = THREE.MathUtils.clamp(pitch + look.dy * SENS, -PITCH, PITCH);
      if (look.zoom > 0) { set(false); cam.dist = 4; } // zooming out: back behind your shoulder
      return true;
    },
    // Walk where you look, and face it (others see you turn your head).
    steer(moveRef) { if (active()) moveRef.yaw = cam.yaw; },
    face(root) { if (active()) root.rotation.y = cam.yaw + Math.PI; },
    // After the normal follow camera: put the camera in your eyes.
    update(p, seated) {
      const a = active();
      if (a !== wasActive) {
        wasActive = a;
        dot.style.display = a ? 'block' : 'none';
        if (a) pitch = 0;
        else unlock();
      }
      if (!a) {
        if (hid) { game.me.root.visible = true; hid = false; }
        return;
      }
      const eye = p.y + (seated ? EYE_SEATED : EYE);
      camera.position.set(p.x, eye, p.z);
      const c = Math.cos(pitch);
      dir.set(-Math.sin(cam.yaw) * c, -Math.sin(pitch), -Math.cos(cam.yaw) * c);
      camera.up.set(0, 1, 0);
      camera.lookAt(p.x + dir.x, eye + dir.y, p.z + dir.z);
      game.me.root.visible = false;
      hid = true;
    },
  };
}
