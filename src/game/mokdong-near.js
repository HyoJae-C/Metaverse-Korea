// Mokdong Ice Rink and the stadiums beside it (Yangcheon-gu,
// scripts/build-mokdong.mjs): their footprints are "custom" buildings in the
// map (walls, nothing drawn); what you see is game/mokdong-site.js, loaded
// with import() when you come near. The rink's door is its store's
// (stores.json mokdong-ice-rink, front 'landmark').
// Small on purpose: this is in the first download, the buildings are not.
//
//   const mokdong = createMokdongNear({ landmarks, scene });
//   mokdong.update(p)   every frame on the street
//   mokdong.group       what loaded (main.js FarCull), or null
export const MOKDONG_NEAR = 480; // m: past the fog, so it is there before you see it

export function createMokdongNear({ landmarks = [], scene = null }) {
  const l = landmarks.find((q) => q.type === 'mokdongrink');
  let group = null, loading = false;
  return {
    landmark: l || null,
    update(p) {
      if (!l || group || loading || !scene || Math.hypot(p.x - l.x - 40, p.z - l.z) > MOKDONG_NEAR) return;
      loading = true;
      import('./mokdong-site.js')
        .then(({ buildMokdongSite }) => { group = buildMokdongSite(l); scene.add(group); })
        .catch((e) => { loading = false; console.warn('mokdong', e); });
    },
    get group() { return group; },
  };
}
