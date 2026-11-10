// People (skinned characters) further than FAR_PEOPLE metres from the camera
// are a few pixels tall but still cost a full skinned draw each: dozens of
// street NPCs, palace guards, zoo keepers and other players across the map.
// Skip drawing them until they come closer. Their own code keeps running and
// their .visible is left alone (other code uses it), so this only takes them
// off the camera's layer, and puts them back when they're near again.
//
// Call it after the frame is drawn: drawing brings matrixWorld up to date.
// Before it, a character that just moved (out of a park, a taxi, a teleport)
// still has its old spot, and the local player was taken for far away and
// stayed bodiless (only hats, glasses and lips showing) when the next step
// was straight into a park or a room, where this doesn't run.
export const FAR_PEOPLE = 150;

export class FarPeople {
  constructor({ far = FAR_PEOPLE, every = 0.25 } = {}) {
    this.far2 = far * far;
    this.every = every;
    this.t = 0;
  }

  // Call once a frame; it only looks every `every` seconds. keep: a
  // character that is always drawn (your own: the camera is always near it).
  update(dt, root, camera, keep = null) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.every;
    const kept = new Set();
    keep?.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      kept.add(o);
      if (o.userData.farHidden) { o.layers.enable(0); o.userData.farHidden = false; }
    });
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, far2 = this.far2;
    root.traverse((o) => {
      if (!o.isSkinnedMesh || kept.has(o)) return;
      const e = o.matrixWorld.elements;
      const dx = e[12] - cx, dy = e[13] - cy, dz = e[14] - cz;
      const far = dx * dx + dy * dy + dz * dz > far2;
      if (far && !o.userData.farHidden && o.layers.isEnabled(0)) { o.layers.disable(0); o.userData.farHidden = true; }
      else if (!far && o.userData.farHidden) { o.layers.enable(0); o.userData.farHidden = false; }
    });
  }
}
