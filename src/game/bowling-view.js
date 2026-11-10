// Bowling in the world (ui/activity-ui.js BowlingUI): while you play, you
// stand on the approach of the lane you walked up to and the camera stands
// behind you; the ball rolls down the real lane, the camera follows it to the
// pins and the pins fall as core/bowling-physics.js says. The physics lane is
// full length (18.29 m) and the room's lane is shorter, so distances down the
// lane are squeezed to fit; the ball, the pins and the rack keep real sizes.
// Loaded with the bowling panel (game/arcade.js).
import * as THREE from 'three';
import { LANE_LEN, BALL_R, PIN_H, throwFrom } from '../core/bowling-physics.js';
import { freeSpace, applyView, restoreView } from './arcade-cam.js';

const FOV = 50; // on a wide screen…
const LANE_SHOWN = 1.6; // …and at least this many metres across the lane on a narrow one
const BACK = 2.8, HIGH = 1.85; // the camera this far behind the ball (m) and this high
const END = 3.4; // and no closer than this to the head pin (m, in the room)
const SIDE = 0.55; // you stand this far left of the ball (it is in your right hand)
const pinWhite = new THREE.MeshLambertMaterial({ color: '#fbfaf6' });
const pinRed = new THREE.MeshLambertMaterial({ color: '#d9473c' });
const bodyGeo = new THREE.CylinderGeometry(0.035, 0.06, PIN_H, 10).translate(0, PIN_H / 2, 0);
const neckGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.03, 10).translate(0, PIN_H * 0.79, 0);
const ballGeo = new THREE.SphereGeometry(BALL_R, 20, 14);
const ballMat = new THREE.MeshLambertMaterial({ color: '#3a64c8' });
const UP = new THREE.Vector3(0, 1, 0);

export function createBowlingView(game, stationOf) {
  let on = null;
  const dir = new THREE.Vector3();

  // Down the lane (physics z, from the foul line) to the room's z: squeezed
  // up to the head pin, real past it (the rack, the pit) and behind the line.
  const roomZ = (z) => (z < 0 ? on.st.foul - z : z <= LANE_LEN ? on.st.foul - z * on.squeeze : on.st.head - (z - LANE_LEN));

  function stop() {
    if (!on) return;
    for (const m of [on.ball, on.line, ...on.pins]) m.removeFromParent();
    on.line.geometry.dispose(); on.line.material.dispose();
    for (const p of on.st.pins || []) p.visible = true;
    on.st.busy = false;
    restoreView(game.camera, on.fov);
    if (on.me) game.me?.root.position.copy(on.me);
    on = null;
  }

  return {
    get active() { return !!on; },
    get surface() { return game.canvas; }, // swipe up on the world to throw
    // panel: the bowling panel (the lane is framed above it). False when you
    // are not at a lane (the panel then draws its own).
    start(panel) {
      stop();
      const st = stationOf();
      const scene = game.interior?.scene;
      if (!st || st.foul == null || !scene) return false;
      const pins = Array.from({ length: 10 }, () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(bodyGeo, pinWhite), new THREE.Mesh(neckGeo, pinRed));
        return g;
      });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffd36e', dashSize: 0.18, gapSize: 0.14, transparent: true, depthTest: false }));
      line.renderOrder = 10;
      scene.add(ball, line, ...pins);
      for (const p of st.pins || []) p.visible = false; // the lane's own rack makes way for ours
      st.busy = true;
      on = {
        st, scene, pins, ball, line, panel, space: {}, fov: game.camera.fov, interior: game.interior,
        squeeze: (st.foul - st.head) / LANE_LEN, me: game.me?.root.position.clone(), camZ: st.foul + BACK,
      };
      return true;
    },
    stop,
    // Each frame from the panel: ball { x, z, roll }, pins [{ x, z, tilt,
    // heading, gone }] (physics coordinates), aim (the line's -1..1 while you
    // aim, null when not aiming) and whether it is locked.
    show(ball, pins, aim, locked) {
      if (!on) return;
      const lx = on.st.x;
      on.ball.position.set(lx + ball.x, BALL_R + 0.012, roomZ(ball.z));
      on.ball.rotation.set(-ball.roll, 0, 0);
      on.ball.visible = ball.z < LANE_LEN + 1.05;
      on.pins.forEach((m, j) => {
        const p = pins[j];
        m.visible = !!p && !p.gone && p.z < LANE_LEN + 1.05;
        if (!m.visible) return;
        const tip = p.tilt * (Math.PI / 2) * 0.97;
        dir.set(Math.sin(tip) * Math.sin(p.heading), Math.cos(tip), -Math.sin(tip) * Math.cos(p.heading));
        m.quaternion.setFromUnitVectors(UP, dir);
        m.position.set(lx + p.x, 0.012 + (p.tilt > 0.9 ? 0.05 : 0), roomZ(p.z));
      });
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
      if (ball.z <= 0.01 && game.me) game.me.root.position.set(lx + ball.x - SIDE, 0, on.st.foul + 0.55);
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
