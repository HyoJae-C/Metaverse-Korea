// Can you see a shopkeeper's face from where you stand to buy? (Yozi
// 2026-11-13: every counter shows the face of the person behind it.) Casts
// rays from the camera of a player standing in front of them, at the usual
// zooms and tilts, to their eyes and mouth (core/counter-face.js), and says
// which views something hides the face in.
import * as THREE from 'three';
import { faceSpots, BUY_AHEAD } from '../src/core/counter-face.js';

// The street camera (main.js): pivot 1 m over your feet, `dist` back,
// tilted `pitch` up (from almost level to the default 0.42; from higher up a
// roof or an awning may hide anyone), looked at from a little to either side.
export const VIEWS = [];
for (const pitch of [0.12, 0.25, 0.42]) for (const dist of [4, 6, 9]) for (const yaw of [-0.35, 0, 0.35]) VIEWS.push({ pitch, dist, yaw });

const ray = new THREE.Raycaster();
// staff: { x, z, ry, y?, sit? } in the scene's own metres. Returns the views
// (and the thing in the way) where the face can't be seen.
export function hiddenFace(scene, staff, { ahead = BUY_AHEAD } = {}) {
  scene.updateMatrixWorld(true);
  const solid = [];
  scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && isShown(o) && !seeThrough(o.material)) solid.push(o); });
  const fx = Math.sin(staff.ry || 0), fz = Math.cos(staff.ry || 0);
  const me = new THREE.Vector3(staff.x + fx * ahead, staff.y || 0, staff.z + fz * ahead);
  const bad = [];
  for (const v of VIEWS) {
    const a = Math.atan2(fx, fz) + v.yaw; // the camera behind you, away from them
    const cam = new THREE.Vector3(me.x + Math.sin(a) * Math.cos(v.pitch) * v.dist, me.y + 1 + Math.sin(v.pitch) * v.dist, me.z + Math.cos(a) * Math.cos(v.pitch) * v.dist);
    for (const p of faceSpots(staff)) {
      if (p.what === 'chin' && v.pitch < 0.2) continue; // (from almost level, a counter's front edge may cover the very bottom of the chin)
      const to = new THREE.Vector3(p.x, p.y, p.z);
      const dir = to.clone().sub(cam), far = dir.length();
      ray.set(cam, dir.normalize());
      ray.far = far - 0.05;
      // Only what stands between them and you (the counter, its goods, the
      // stall's sign and awning): walls behind you are the camera's own job.
      const hit = ray.intersectObjects(solid, false).find((h) => Math.hypot(h.point.x - staff.x, h.point.z - staff.z) < ahead);
      if (hit) bad.push({ ...v, at: p.what, by: hit.object.name || hit.object.geometry?.type, y: +hit.point.y.toFixed(2) });
    }
  }
  return bad;
}
// Glass (a bank's teller window) doesn't hide anyone.
const seeThrough = (m) => [m].flat().every((x) => x?.transparent && x.opacity < 0.5);
// Hidden by a parent (an empty group switched off) counts as not there.
function isShown(o) { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; }
