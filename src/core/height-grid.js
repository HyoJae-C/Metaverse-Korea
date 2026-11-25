// A hill's ground mesh is a grid of square cells, and each corner is shared
// by four cells. Asking the ground's height four times for every corner made
// building Haneul Park, the cemetery's hill and Dalmaji Park take 0.4-0.6 s in
// one frame, a stop you feel when the Han River Boat Taxi sails past (Yozi
// 2026-11-25). This asks once per corner, only for the corners used.
//
//   const g = heightGrid(x0, z0, x1, z1, c, y);
//   g.xs, g.zs   the cells' corners: the same numbers as
//                for (let x = x0; x < x1; x += c) (and one more, x + c)
//   g.y(i, j)    y(xs[i], zs[j]), worked out the first time it is asked

const steps = (a, b, c) => {
  const out = [];
  for (let v = a; v < b; v += c) out.push(v);
  out.push(out.length ? out[out.length - 1] + c : a + c); // (the far corner of the last cell)
  return out;
};

export function heightGrid(x0, z0, x1, z1, c, y) {
  const xs = steps(x0, x1, c), zs = steps(z0, z1, c), nx = xs.length;
  const h = new Float64Array(nx * zs.length).fill(NaN);
  return {
    xs, zs,
    y(i, j) {
      const k = j * nx + i;
      const v = h[k];
      return v === v ? v : (h[k] = y(xs[i], zs[j])); // (v !== v: not asked yet)
    },
  };
}

// Inside the ring p, along the row z: (x) => the same as inPoly(x, z, p),
// with the row's crossings of the ring found once (a ground grid asks it
// for every cell of the row).
export function polyRow(p, z) {
  const cross = [];
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z)) cross.push(((xj - xi) * (z - zi)) / (zj - zi) + xi);
  }
  return (x) => { let r = false; for (const c of cross) if (x < c) r = !r; return r; };
}
