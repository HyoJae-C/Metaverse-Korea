// The room builder (core/interior.js and all it draws: shelves and counters,
// bars, the pool hall, the aquarium, the subway hall, the museum …) is not
// part of the first download. It comes the first time a door is near
// (warmInterior) or a room is walked into (loadInterior), and stays.
let mod = null;
let kit = null;
let loading = null;

// The module once it's here, else null.
export const interiorLoaded = () => mod;
// Room-only bits of main.js (game/room-kit.js): there whenever a room is.
export const roomKit = () => kit;

export function loadInterior() {
  loading ||= Promise.all([import('../core/interior.js'), import('./room-kit.js')])
    .then(([m, k]) => { kit = k; return (mod = m); })
    .catch((e) => { loading = null; throw e; });
  return loading;
}

// Start the download early (standing at a door): no error if it fails, the
// next try is when the room is walked into.
export function warmInterior() {
  if (!mod && !loading) loadInterior().catch(() => {});
}
