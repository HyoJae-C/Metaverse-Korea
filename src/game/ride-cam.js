// The camera on Another Land's carousel and pirate ship (the coaster has its
// own, in main.js): just behind and above you, riding with the seat, so the
// ship's swing tips the whole view; or from your seat (the action button
// switches, as on the coaster). The seat comes from park-rides.js seatAt():
// feet (x, y, z), facing ry, roll (the ship's tilt about the z axis).
import * as THREE from 'three';

export function createRideCam({ camera }) {
  const want = new THREE.Vector3(), at = new THREE.Vector3(), f = new THREE.Vector3(), up = new THREE.Vector3(), worldUp = new THREE.Vector3(0, 1, 0);
  let cam = null;
  return {
    reset() { cam = null; camera.up.set(0, 1, 0); },
    // s: the seat; first: from your seat; soft: no leaning (the gentle setting).
    update(dt, s, first, soft) {
      const c = Math.cos(s.roll || 0), sn = Math.sin(s.roll || 0);
      // The seat's forward and up, tipped by the roll (about z).
      f.set(Math.sin(s.ry) * c, Math.sin(s.ry) * sn, Math.cos(s.ry));
      up.set(-sn, c, 0);
      const back = first ? -0.1 : 1.6, high = first ? 1.15 : 2.5;
      want.set(s.x - f.x * back + up.x * high, s.y - f.y * back + up.y * high, s.z - f.z * back + up.z * high);
      if (!cam) cam = want.clone();
      cam.lerp(want, 1 - Math.exp(-dt * (first ? 30 : 8)));
      camera.position.copy(cam);
      camera.up.copy(worldUp).lerp(up, soft ? 0 : 0.7).normalize();
      const ahead = first ? 5 : 6, lift = first ? 1.0 : 0.6;
      at.set(s.x + f.x * ahead + up.x * lift, s.y + f.y * ahead + up.y * lift, s.z + f.z * ahead + up.z * lift);
      camera.lookAt(at);
    },
  };
}
