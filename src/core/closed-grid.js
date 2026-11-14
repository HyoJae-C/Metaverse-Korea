// Land not built yet (region.json "closed", scripts/build-closed.mjs) is
// stored as a picture: one bit per `cell`-metre square, `w` squares a row
// from (x0, z0), base64 in `bits`. Thousands of rectangles as numbers were
// the biggest part of region.json; the same land as bits is under half.
// closedRects turns it back into rectangles [x0, z0, x1, z1]: a run along
// each row, joined to the same run on the row above.

export function packClosed(cells, w, h, x0, z0, cell) {
  const bytes = new Uint8Array(Math.ceil((w * h) / 8));
  for (let i = 0; i < w * h; i++) if (cells[i]) bytes[i >> 3] |= 1 << (i & 7);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return { cell, x0, z0, w, h, bits: btoa(s) };
}

export function closedRects(closed) {
  if (!closed) return [];
  if (closed.rects) return closed.rects; // (the older form)
  const { cell, x0, z0, w, h } = closed;
  const s = atob(closed.bits);
  const on = (i) => (s.charCodeAt(i >> 3) >> (i & 7)) & 1;
  const rects = [];
  let prev = new Map(); // "i0,i1" → rect of the row above
  for (let j = 0; j < h; j++) {
    const row = new Map();
    for (let i = 0; i < w;) {
      if (!on(j * w + i)) { i++; continue; }
      let e = i;
      while (e < w && on(j * w + e)) e++;
      const key = i + ',' + e;
      const up = prev.get(key);
      if (up) { up[3] = z0 + (j + 1) * cell; row.set(key, up); } else {
        const r = [x0 + i * cell, z0 + j * cell, x0 + e * cell, z0 + (j + 1) * cell];
        rects.push(r);
        row.set(key, r);
      }
      i = e;
    }
    prev = row;
  }
  return rects;
}
