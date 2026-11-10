// Bowling in the world (ui/activity-ui.js BowlingUI): while you play, you
// stand on the approach of the lane you walked up to and the camera stands
// behind you; the ball rolls down the real lane (the lane's own ball and
// pins: lane.show in core/activity-rooms.js, so the others in the room see it
// too), the camera follows it to the pins and the pins fall as
// core/bowling-physics.js says. The physics lane is full length (18.29 m)
// and the room's lane is shorter, so distances down the lane are squeezed to
// fit; the ball, the pins and the rack keep real sizes.
// Loaded with the bowling panel (game/arcade.js).
import * as THREE from 'three';
import { throwFrom } from '../core/bowling-physics.js';
import { freeSpace, applyView, restoreView } from './arcade-cam.js';

const FOV = 50; // on a wide screen…
const LANE_SHOWN = 1.6; // …and at least this many metres across the lane on a narrow one
const BACK = 2.8, HIGH = 1.85; // the camera this far behind the ball (m) and this high
const END = 3.8; // and no closer than this to the head pin (m, in the room: the lane's screen stays in view)
const SIDE = 0.55; // you stand this far left of the ball (it is in your right hand)

export function createBowlingView(game, stationOf) {
  let on = null;
  const roomZ = (z) => on.st.roomZ(z);

  function stop() {
    if (!on) return;
    on.line.removeFromParent();
    on.line.geometry.dispose(); on.line.material.dispose();
    on.st.rest();
    on.st.busy = false;
    document.body.classList.remove('lane-cam');
    restoreView(game.camera, on.fov);
    if (on.me) game.me?.root.position.copy(on.me);
    on = null;
  }

  return {
    get active() { return !!on; },
    lane: () => on?.st || stationOf(), // the lane you play on (or stand at)
    get surface() { return game.canvas; }, // swipe up on the world to throw
    // panel: the bowling panel (the lane is framed above it). False when you
    // are not at a lane (the panel then draws its own).
    start(panel) {
      stop();
      const st = stationOf();
      const scene = game.interior?.scene;
      if (!st || !st.roomZ || !scene) return false;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffd36e', dashSize: 0.18, gapSize: 0.14, transparent: true, depthTest: false }));
      line.renderOrder = 10;
      scene.add(line);
      document.body.classList.add('lane-cam'); // (the store's name card makes way for the lane's screen)
      st.busy = true; // (someone else's game on this lane stops showing: game/bowling-lanes.js)
      on = { st, scene, line, panel, space: {}, fov: game.camera.fov, interior: game.interior, me: game.me?.root.position.clone(), camZ: st.foul + BACK };
      return true;
    },
    stop,
    // Each frame from the panel: ball { x, z, roll }, pins [{ x, z, tilt,
    // heading, gone }] (physics coordinates), aim (the line's -1..1 while you
    // aim, null when not aiming) and whether it is locked.
    // stand: false while a friend bowls (you watch from behind them).
    show(ball, pins, aim, locked, stand = true) {
      if (!on) return;
      const lx = on.st.x;
      on.st.show(ball, pins, '#3a64c8');
      // Your line, out to the arrows.
      on.line.visible = aim != null;
      if (aim != null) {
        const th = throwFrom({ aim }).angle, a = on.line.geometry.attributes.position;
        a.setXYZ(0, lx + ball.x, 0.02, roomZ(0.15));
        a.setXYZ(1, lx + ball.x + Math.tan(th) * 6, 0.02, roomZ(6));
        a.needsUpdate = true;
        on.line.computeLineDistances();
        on.line.material.opacity = locked ? 0.5 : 0.95;
      }
      // You stand behind the ball, a step to its left (the ball in your right hand).
      if (stand && ball.z <= 0.01 && game.me) game.me.root.position.set(lx + ball.x - SIDE, 0, on.st.foul + 0.55);
      on.target = ball;
    },
    // After the normal camera: behind the ball, following it to the pins.
    update(dt = 1 / 60) {
      if (!on) return;
      if (game.interior !== on.interior) { stop(); return; }
      const { camera } = game, b = on.target || { x: 0, z: 0 };
      // In room metres (z falls down the lane): behind the ball, stopping
      // short of the rack so all ten pins stay in view as they fall.
      const z0 = on.st.foul + BACK, z1 = on.st.head + END;
      const want = Math.min(z0, Math.max(z1, roomZ(Math.max(0, b.z)) + BACK));
      on.camZ += (want - on.camZ) * Math.min(1, dt * 8);
      const u = (z0 - on.camZ) / (z0 - z1);
      // Waiting: over your right shoulder, beside you; rolling: over the ball.
      const x = on.st.x + (b.z <= 0.01 && u < 0.01 ? b.x + 0.15 : b.x * 0.35 * u);
      camera.position.set(x, HIGH - 0.6 * u, on.camZ);
      camera.lookAt(on.st.x + b.x * (u < 0.01 ? 1 : 0.2 * u), 0.1, on.camZ - 6);
      const sp = freeSpace(on.space, on.panel);
      const aspect = sp.w / sp.h;
      // Narrow screens: widen until the lane and its gutters fit across.
      const need = 2 * THREE.MathUtils.radToDeg(Math.atan((LANE_SHOWN / 2) / BACK / aspect));
      applyView(camera, Math.min(70, Math.max(FOV, need)), sp);
    },
  };
}
