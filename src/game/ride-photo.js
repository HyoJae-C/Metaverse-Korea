// The Jelly Flume's ride photo (Yozi 2026-11-18): partway down the big drop
// a camera by the splash pool takes your picture, free, with a film
// camera's look (faded colours, a dark edge, the orange date in the corner).
// It goes in your bag (core/ride-photos.js) and can stand in a frame in your
// home (core/furniture.js 'ph:<id>'). Loaded the first time you board the
// flume (main.js), so none of it is in the first download.
//
// The picture is drawn once, off screen: the same scenes the game draws
// (renderScenes: the park, and the street round it), from the photo camera,
// into a render target at twice the size, then shrunk (smooth edges).
import * as THREE from 'three';
import { PHOTO_CAM, PHOTO_H, PHOTO_W, atSnap, filmDate, filmLook } from '../core/ride-photos.js';

// game: { renderer, camera, renderScenes, me, bag, photos, cloud, t, toast,
//   sfx, hud, newId, onPhoto(photo) }
export function createRidePhoto(game) {
  const { renderer, camera, t } = game;
  let want = null, card = null;

  // Copy the photo camera's view now (right after the frame was drawn).
  function draw(look) {
    const W = PHOTO_W * 2, H = PHOTO_H * 2;
    const rt = new THREE.WebGLRenderTarget(W, H, { colorSpace: THREE.SRGBColorSpace });
    const keep = { p: camera.position.clone(), q: camera.quaternion.clone(), up: camera.up.clone(), fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far };
    const shown = game.me.root.visible;
    game.me.root.visible = true; // (from your seat your own body is hidden)
    try {
      camera.position.set(PHOTO_CAM.x, PHOTO_CAM.y, PHOTO_CAM.z);
      const far = camera.position.distanceTo(look);
      camera.position.lerp(look, 0.32 / far); // (just in front of the camera on the pole, not inside it)
      camera.up.set(0, 1, 0);
      camera.fov = PHOTO_CAM.fov;
      camera.aspect = W / H;
      camera.near = 0.1;
      camera.updateProjectionMatrix();
      camera.lookAt(look.x, look.y, look.z);
      renderer.setRenderTarget(rt);
      renderer.clear();
      game.renderScenes();
      const px = new Uint8Array(W * H * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      return { px, W, H };
    } finally {
      renderer.setRenderTarget(null);
      rt.dispose();
      game.me.root.visible = shown;
      camera.position.copy(keep.p); camera.quaternion.copy(keep.q); camera.up.copy(keep.up);
      Object.assign(camera, { fov: keep.fov, aspect: keep.aspect, near: keep.near, far: keep.far });
      camera.updateProjectionMatrix();
    }
  }

  // The print: shrink, the film look, the date. Returns a JPEG data: URL.
  function develop({ px, W, H }, at) {
    const big = document.createElement('canvas');
    big.width = W; big.height = H;
    const bg = big.getContext('2d'), img = bg.createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); // (rows come bottom first)
    bg.putImageData(img, 0, 0);
    const c = document.createElement('canvas');
    c.width = PHOTO_W; c.height = PHOTO_H;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(big, 0, 0, PHOTO_W, PHOTO_H);
    const d = g.getImageData(0, 0, PHOTO_W, PHOTO_H);
    filmLook(d.data, PHOTO_W, PHOTO_H);
    g.putImageData(d, 0, 0);
    // The date, in a film camera's orange, glowing a little.
    g.font = `700 ${Math.round(PHOTO_H * 0.07)}px "Courier New", monospace`;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.shadowColor = 'rgba(255, 120, 30, 0.8)';
    g.shadowBlur = 4;
    g.fillStyle = '#ff9a3c';
    g.fillText(filmDate(at), PHOTO_W - 12, PHOTO_H - 9);
    return c.toDataURL('image/jpeg', 0.78);
  }

  function hideCard() { card?.remove(); card = null; }
  function showCard(p) {
    hideCard();
    card = document.createElement('div');
    card.className = 'ride-photo-card';
    card.setAttribute('role', 'dialog');
    const x = document.createElement('button');
    x.className = 'sheet-x';
    x.textContent = '✕';
    x.ariaLabel = 'Close';
    x.onclick = hideCard;
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = t('photo.name');
    const note = document.createElement('p');
    note.textContent = p.kept ? t('photo.kept') : p.why;
    card.append(x, img, note);
    game.hud.append(card);
    setTimeout(() => { if (card?.contains(img)) hideCard(); }, 9000);
  }

  // Send receipts the server doesn't have yet (055_ride_photos.sql).
  async function sendReceipts() {
    for (const p of game.photos.unsent()) {
      const r = await game.cloud.call('photo_receipt', { p_id: p.id, p_ride: p.ride, p_op: p.op });
      if (r.data === 'ok') game.photos.markSent(p.id);
      else break; // (offline, or the SQL not run yet: next time)
    }
  }

  let last = null; // the photo of the ride I'm on
  function snap() {
    const w = want;
    want = null;
    let src;
    try { src = develop(draw(w.look), w.at); } catch { return; }
    game.sfx.tock?.(0.8, 1400); // the shutter
    const p = { id: game.newId(), src, ride: 'flume', at: w.at, op: w.op, kept: false, why: '' };
    if (game.photos.full) p.why = t('photo.tooMany', { n: game.photos.all().length });
    else if (game.bag.full) p.why = t('photo.bagFull');
    else if (game.photos.add(p) && game.bag.add({ kind: 'photo', ph: p.id })) { p.kept = true; game.onPhoto?.(p); sendReceipts(); }
    else { game.photos.remove(p.id); p.why = t('photo.bagFull'); }
    last = p;
    game.toast(t('photo.snap'));
  }

  return {
    // Each frame on the flume (main.js updateRide): the moment on the drop.
    update(ride, pose) {
      if (ride.kind !== 'flume' || ride.snapped || !atSnap(pose)) return;
      ride.snapped = true;
      last = null;
      // Look at the log's middle: 0.5 m down the drop from the back row, up it from the front row.
      const off = ride.seat >> 1 ? 0.5 : -0.5;
      want = { at: Date.now(), op: ride.op || null, look: { x: 58, y: pose.y + 0.7 - off * Math.sin(pose.pitch), z: pose.z + off * Math.cos(pose.pitch) } };
    },
    // After the frame is drawn (main.js render loop).
    afterRender() { if (want) snap(); },
    // Off the ride: the print, as at a real ride's exit.
    rideEnded() { if (last) showCard(last); last = null; },
    sendReceipts,
    hideCard,
  };
}
