// Gyeongbokgung's view: inside the palace the camera drops a little and
// looks up, so the gate towers and the throne hall's roofs (and Bugaksan
// behind) fit on a phone screen instead of being cut off at the top. In the
// courts behind Heungnyemun, where the halls stand close, it looks up more.
// It only eases the view while the player isn't steering it, and gives the
// usual street view back on the way out.
//   const view = createPalaceView({ cam, at: palaceAt, steering: () => manualCamT > 0 });
//   view.tick(p, dt);   // each frame on the street
export const PALACE_VIEW = {
  palace: { pitch: 0.16, dist: 10 }, // inside the wall
  court: { pitch: -0.03, dist: 8 }, // Heungnyemun's yard and Geunjeongjeon's court
  street: { pitch: 0.42, dist: 9 }, // the usual view (main.js)
};
// Where p is, in the palace district's metres: 'court', 'palace' or null.
export function palaceZone(x, z) {
  if (x < -62 || x > 53 || z > 0 || z < -264) return null;
  return z < -36 && z > -90 && Math.abs(x) < 16 ? 'court' : 'palace';
}

export function createPalaceView({ cam, at, steering }) {
  let zone = null, own = false, back = 0;
  return {
    tick(p, dt) {
      if (!at) return;
      const k = palaceZone(p.x - at[0], p.z - at[1]);
      if (k !== zone) {
        if (!k && zone && own) back = 1.5; // walked out: ease back to the street view
        zone = k;
        own = !!k;
      }
      if (steering()) { own = false; back = 0; return; } // the player's view is theirs until the next zone
      const want = own ? PALACE_VIEW[zone] : back > 0 ? PALACE_VIEW.street : null;
      if (!want) return;
      back -= dt;
      const f = Math.min(1, dt * 2.5);
      cam.pitch += (want.pitch - cam.pitch) * f;
      cam.dist += (want.dist - cam.dist) * f;
    },
  };
}
