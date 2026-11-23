// Seonjeongneung's visitors (districts/seonjeongneung.json, the map's
// "tombvisitors" landmark): a few people stand in front of the shrine halls
// looking up at the tombs and two walk the long paths through the wood, so
// the grounds don't look empty. Made when you first come near, drawn only
// from close by. Small on purpose: this is in the first download.
//
//   const tombs = createSeonjeongneungNear({ landmarks, scene, makeNpc });
//   tombs.update(p, dt)   every frame on the street
export const VISITORS_NEAR = 90; // m from the nearest visitor spot: they are drawn
const WALK = 0.9; // m/s: a stroll

export function createSeonjeongneungNear({ landmarks = [], scene = null, makeNpc = null }) {
  const l = landmarks.find((q) => q.type === 'tombvisitors');
  if (!l || !scene || !makeNpc) return { update() {}, list: [] };
  const W = ([x, z]) => [l.x + x, l.z + z];
  const spots = l.spots.map((s) => ({ at: W(s.at), look: W(s.look) }));
  const walks = (l.walks || []).map((p) => p.map(W));
  const all = [...spots.map((s) => s.at), ...walks.flat()];
  const xs = all.map((q) => q[0]), zs = all.map((q) => q[1]);
  const box = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  const near = (p) => Math.hypot(Math.max(box[0] - p.x, 0, p.x - box[2]), Math.max(box[1] - p.z, 0, p.z - box[3]));
  let list = null;
  const make = () => {
    list = [];
    for (const s of spots) {
      const n = makeNpc('');
      n.tag.style.display = 'none';
      n.ch.root.position.set(s.at[0], 0, s.at[1]);
      n.ch.root.rotation.y = Math.atan2(s.look[0] - s.at[0], s.look[1] - s.at[1]);
      scene.add(n.ch.root);
      list.push({ n, walk: null });
    }
    walks.forEach((p, i) => {
      const n = makeNpc('');
      n.tag.style.display = 'none';
      scene.add(n.ch.root);
      const len = p.slice(1).map((q, k) => Math.hypot(q[0] - p[k][0], q[1] - p[k][1]));
      list.push({ n, walk: { p, len, total: len.reduce((a, b) => a + b, 0), s: (i * 37) % 20, dir: 1 } });
    });
  };
  // Where along a path: position and heading.
  const along = (w) => {
    let s = w.s, k = 0;
    while (k < w.len.length - 1 && s > w.len[k]) { s -= w.len[k]; k++; }
    const a = w.p[k], b = w.p[k + 1], t = w.len[k] ? Math.min(1, s / w.len[k]) : 0;
    const dx = (b[0] - a[0]) * w.dir, dz = (b[1] - a[1]) * w.dir;
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ry: Math.atan2(dx, dz) };
  };
  return {
    get list() { return list || []; },
    update(p, dt) {
      const close = near(p) < VISITORS_NEAR;
      if (!list) { if (!close) return; make(); }
      for (const { n, walk } of list) {
        n.ch.root.visible = close;
        if (!close) continue;
        if (walk) {
          walk.s += WALK * dt * walk.dir;
          if (walk.s > walk.total) { walk.s = walk.total; walk.dir = -1; } else if (walk.s < 0) { walk.s = 0; walk.dir = 1; }
          const q = along(walk);
          n.ch.root.position.set(q.x, 0, q.z);
          n.ch.root.rotation.y = q.ry;
          n.ch.animate(dt, 0.3);
        } else n.ch.animate(dt, 0);
      }
    },
  };
}
