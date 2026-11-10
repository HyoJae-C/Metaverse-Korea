// Darts in the world (ui/darts-ui.js): while you play, the camera stands at
// the throw line looking at the bar's real wall board, zoomed in just enough
// that the rings are clear on a phone, and the board sits in the space above
// the darts panel. The swaying aim is drawn on the board itself and each
// dart flies in and sticks there. How hard it is to hit a treble stays the
// sway's job (core/arcade.js dartAim), not the screen's size.
// Loaded with the darts panel (game/arcade.js).
import * as THREE from 'three';
import { DartPins, dartMesh } from '../core/dart-pins.js';
import { DART_COLORS } from '../core/arcade.js';
import { freeSpace, applyView, restoreView } from './arcade-cam.js';

const FROM = 2.25; // m from the board face to the camera (at the throw line, a little in front of you)
const EYE = 1.5; // camera height (the board's centre is at 1.6 m)
const FACE = 0.8; // the board with its number ring is this many metres across on screen…
const FILL = 0.88; // …filling this much of the free space (the smaller side)
const FLY_FROM = 1.3; // m from the board where a flying dart comes into view

// The aim: a ring and four ticks, white with a dark edge, tinted per player.
function aimTexture() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const draw = (col, w) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.arc(64, 64, 36, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(64 + dx * 18, 64 + dy * 18); g.lineTo(64 + dx * 56, 64 + dy * 56); }
    g.stroke();
  };
  draw('rgba(0,0,0,.6)', 12);
  draw('#fff', 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDartsView(game, boardOf) {
  let on = null; // { interior, b, overlay, aim, fly, flyColor, fov, hid, panel, space }
  const v = new THREE.Vector3();

  // A point on the board face (core/arcade.js coordinates: y down, r = 1 the scoring edge).
  function onBoard(b, x, y, out = 0) {
    const nx = Math.sin(b.ry), nz = Math.cos(b.ry), rx = Math.cos(b.ry), rz = -Math.sin(b.ry);
    return v.set(b.x + rx * x * b.r + nx * out, b.y - y * b.r, b.z + rz * x * b.r + nz * out);
  }

  function stop() {
    if (!on) return;
    const { camera } = game;
    on.aim.removeFromParent(); on.fly.removeFromParent();
    on.aim.geometry.dispose(); on.aim.material.map.dispose(); on.aim.material.dispose();
    on.overlay.clearAll();
    restoreView(camera, on.fov);
    if (on.hid && game.me) game.me.root.visible = true;
    on = null;
  }

  return {
    get active() { return !!on; },
    // panel: the darts panel (the board is framed above it). False when this
    // room has no wall board to look at (the panel then draws its own).
    start(panel) {
      stop();
      const interior = game.interior, pins = interior?.dartPins;
      const b = pins?.boards[boardOf()];
      if (!b) return false;
      const aim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: aimTexture(), transparent: true, depthTest: false }));
      aim.renderOrder = 10;
      aim.rotation.y = b.ry;
      aim.scale.setScalar((2 * 56 / 36) * 0.075 * b.r); // the ring is 0.075 of the board's radius, as on the old panel
      aim.visible = false;
      const fly = dartMesh(0);
      fly.visible = false;
      pins.scene.add(aim, fly);
      const me = game.me;
      const hid = !!me?.root.visible;
      if (hid) me.root.visible = false; // the camera is in front of your face
      // Friends' darts in our game also land in our board on our screen,
      // even if they stand at the other one (their own board gets them for
      // the room as usual).
      on = { interior, b, flyColor: 0, overlay: new DartPins(pins.scene, [b]), aim, fly, fov: game.camera.fov, hid, panel, space: {} };
      return true;
    },
    stop,
    // Each frame from the panel: the aim (board x, y and a DART_COLORS index,
    // or white for ours) and the dart in the air ({ x, y, k: 0…1, color }).
    show(aimAt, aimColor, flying) {
      if (!on) return;
      const { b, aim } = on;
      if (flying && on.flyColor !== flying.color) { // a dart in the thrower's flight colour
        on.fly.removeFromParent();
        on.fly = dartMesh(flying.color);
        on.flyColor = flying.color;
        on.interior.dartPins.scene.add(on.fly);
      }
      const fly = on.fly;
      aim.visible = !!aimAt;
      if (aimAt) {
        aim.position.copy(onBoard(b, aimAt.x, aimAt.y, 0.01));
        aim.material.color.set(aimColor == null ? '#ffffff' : DART_COLORS[aimColor] || '#ffffff');
      }
      fly.visible = !!flying;
      if (flying) {
        const k = flying.k, e = 1 - (1 - k) * (1 - k); // fast out of the hand, slowing in
        const end = onBoard(b, flying.x, flying.y, 0.004).clone();
        fly.position.lerpVectors(onBoard(b, flying.x * 0.3 + 0.35, flying.y * 0.3 + 1.1, FLY_FROM), end, e);
        fly.position.y += Math.sin(Math.PI * e) * 0.06; // a little arc
        fly.rotation.set(0, b.ry - Math.PI / 2, 0.15 * (1 - e));
      }
    },
    // A friend's dart has landed: it stays in our board on our screen.
    pin(who, color, x, y) { on?.overlay.add(who, 0, color, x, y); },
    // After the normal camera: stand at the throw line and look at the board.
    update() {
      if (!on) return;
      if (game.interior !== on.interior) { stop(); return; }
      const { camera } = game, { b } = on;
      const sp = freeSpace(on.space, on.panel);
      const px = Math.min(sp.room, sp.w) * FILL; // the board's size on screen
      const nx = Math.sin(b.ry), nz = Math.cos(b.ry);
      camera.position.set(b.x + nx * FROM, EYE, b.z + nz * FROM);
      camera.lookAt(b.x, b.y, b.z);
      const dist = Math.hypot(FROM, b.y - EYE);
      applyView(camera, THREE.MathUtils.clamp(2 * THREE.MathUtils.radToDeg(Math.atan((FACE / 2) * sp.h / (dist * px))), 8, 62), sp);
    },
  };
}
