// Looking up at Modu Tower (core/haneul.js, 278 m to the tip). The usual
// camera can't tilt above level (pitch 0.12 at the lowest), so near the tower
// its top was cut off by the top of the screen, even from 450 m away. Within
// RANGE of it, dragging the view up goes further: the camera sinks to the
// ground behind the character and tilts up, so the whole tower fits on the
// screen from about 160 m away. Elsewhere nothing changes (the drone show's
// -0.12 and the palace courts' -0.03 stay as they were: the tilt-up only
// starts below -0.12).
//   const towerLook = createTowerLook(() => towerPosition);
//   towerLook.min(p)                // the lowest pitch here, or null (the usual)
//   towerLook.lift(cam.pitch, dist) // m to raise the point the camera looks at
//   towerLook.tick(cam, p, dt)      // walked away still looking up: ease back
export const TOWER_LOOK = { range: 700, minPitch: -0.35, from: -0.12, gain: 3 };

// How far the look-at point rises for a pitch below `from` (0 above it): at
// the lowest pitch and the usual 9 m, about 6 m, so the view tilts up ~32°.
export function towerLift(pitch, dist) {
  return Math.max(0, TOWER_LOOK.from - pitch) * dist * TOWER_LOOK.gain;
}

export function createTowerLook(at) {
  return {
    min(p) {
      const t = at();
      return t && Math.hypot(p.x - t.x, p.z - t.z) < TOWER_LOOK.range ? TOWER_LOOK.minPitch : null;
    },
    lift: towerLift,
    tick(cam, p, dt) {
      if (cam.pitch < TOWER_LOOK.from && this.min(p) == null) cam.pitch += (TOWER_LOOK.from - cam.pitch) * Math.min(1, dt * 2);
    },
  };
}
