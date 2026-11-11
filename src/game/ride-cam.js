// The camera on Modu Land's carousel and pirate ship (the coaster has its
// own, in main.js): just behind and above you, riding with the seat, so the
// ship's swing tips the whole view; or from your seat (the action button
// switches, as on the coaster). The seat comes from park-rides.js seatAt():
// feet (x, y, z), facing ry, roll (the ship's tilt about the z axis).
import * as THREE from 'three';

export function createRideCam({ camera }) {
  const want = new THREE.Vector3(), seat = new THREE.Vector3(), at = new THREE.Vector3(), f = new THREE.Vector3(), up = new THREE.Vector3(), worldUp = new THREE.Vector3(0, 1, 0);
  let cam = null;
  return {
    reset() { cam = null; camera.up.set(0, 1, 0); },
    // s: the seat; first: from your seat; soft: no leaning (the gentle
    // setting); face: the camera out in front looking back at you (the drop
    // tower and the wheel, where behind you is the tower or the gondola);
    // down: look down (at the top of the drop tower); scenic: the Ferris
    // wheel's view from outside the gondola, well behind and above the
    // rider, looking out over the park beyond them.
    update(dt, s, first, soft, face = 0, down = 0, scenic = false) {
      const c = Math.cos(s.roll || 0), sn = Math.sin(s.roll || 0);
      // The seat's forward and up, tipped by the roll (about z).
      f.set(Math.sin(s.ry) * c, Math.sin(s.ry) * sn, Math.cos(s.ry));
      up.set(-sn, c, 0);
      const back = scenic ? 9 : first ? -0.1 : face ? -face : 1.6, high = scenic ? 4.5 : first ? 1.15 : face ? 1.5 : 2.5;
      // Ease the camera's offset from the seat, not its place: the camera
      // moves with the seat exactly (easing its place left it trailing the
      // seat by an amount that changed with every frame's length, and the
      // view shook on the drop tower and the wheel); only switching views or
      // the ship's tilt is eased.
      want.set(-f.x * back + up.x * high, -f.y * back + up.y * high, -f.z * back + up.z * high);
      if (!cam) cam = want.clone();
      cam.lerp(want, 1 - Math.exp(-dt * (first ? 30 : scenic ? 3 : 8)));
      camera.position.copy(seat.set(s.x, s.y, s.z)).add(cam);
      camera.up.copy(worldUp).lerp(up, soft ? 0 : 0.7).normalize();
      const ahead = scenic ? 30 : first ? 5 : face ? 0 : 6, lift = scenic ? -4 : first ? 1.0 - down * 4 : face ? 0.9 : 0.6;
      at.set(s.x + f.x * ahead + up.x * lift, s.y + f.y * ahead + up.y * lift, s.z + f.z * ahead + up.z * lift);
      camera.lookAt(at);
    },
  };
}
