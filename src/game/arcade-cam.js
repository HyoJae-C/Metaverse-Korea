// The camera of an arcade game played in the world (game/darts-view.js,
// game/bowling-view.js): framed in the free space above the game's panel.

const TOP = 64; // px kept clear at the top (the online count, the room's name)

// The free space above the panel: { w, h, room (its height in px), shift
// (px to lift the picture so its centre sits in the middle of that space) }.
// s keeps the panel's height, measured a few times a second.
export function freeSpace(s, panel) {
  const w = innerWidth, h = innerHeight;
  if (!(performance.now() - (s.at || 0) < 400)) { s.reserve = panel?.offsetHeight || 0; s.at = performance.now(); }
  const bottom = Math.min(h * 0.55, (s.reserve || 0) + 24);
  return { w, h, room: Math.max(120, h - TOP - bottom), shift: Math.round(h / 2 - (TOP + (h - bottom)) / 2) };
}

export function applyView(camera, fov, { w, h, shift }) {
  if (Math.abs(camera.fov - fov) > 0.01 || camera.view?.offsetY !== shift || camera.view?.fullWidth !== w || camera.view?.fullHeight !== h) {
    camera.fov = fov;
    camera.setViewOffset(w, h, 0, shift, w, h); // (also updates the projection)
  }
}

// Put the camera back as the game found it.
export function restoreView(camera, fov) {
  camera.clearViewOffset();
  camera.fov = fov;
  camera.updateProjectionMatrix();
}
