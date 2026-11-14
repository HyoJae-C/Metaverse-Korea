// Saves a picture as a PNG off the main thread (core/far-textures.js): the
// page's own canvas.toBlob reads back and encodes on the main thread, and a
// few of those a second stalled walking (about 0.4 s each in a test browser).
self.onmessage = async ({ data: { id, bmp } }) => {
  let blob = null;
  try {
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    c.getContext('2d').drawImage(bmp, 0, 0);
    blob = await c.convertToBlob({ type: 'image/png' });
  } catch { /* the main thread falls back to toBlob */ }
  bmp.close?.();
  self.postMessage({ id, blob });
};
