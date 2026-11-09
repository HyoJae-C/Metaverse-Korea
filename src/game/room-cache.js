// Rooms (shop interiors, station halls, the train…) are built the first time
// you walk in and kept, so walking back in is instant. Kept forever, every
// room a player ever opened stayed in memory: after 60 shops a phone held
// about 300 MB of GPU textures more than at the start, and phones drop the
// page ("graphics context lost", iPhone's "A problem repeatedly occurred").
//
// So only the last few rooms are kept. An older one is let go: its name tags
// leave the page and its meshes, materials and textures are freed, except
// ones still shown somewhere else (the street, another kept room). Walking
// back in builds it again, as on the first visit.

/** Everything in `root` the GPU holds: geometries, materials, textures. */
export function gpuParts(root, out = { geo: new Set(), mat: new Set(), tex: new Set() }) {
  root?.traverse?.((o) => {
    if (o.geometry) out.geo.add(o.geometry);
    for (const m of [o.material].flat()) {
      if (!m) continue;
      out.mat.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) out.tex.add(v);
      for (const u of Object.values(m.uniforms || {})) if (u?.value?.isTexture) out.tex.add(u.value);
    }
  });
  if (root?.background?.isTexture) out.tex.add(root.background);
  return out;
}

// Name tags and speech bubbles a room's people put on the page (makeNpc):
// one level down the room's own fields (clerkNpc, vendorNpcs, rideStaff…).
export function roomPeople(built) {
  const out = [];
  const take = (o) => { if (o && typeof o === 'object' && o.ch && o.tag) out.push(o); };
  for (const v of Object.values(built || {})) {
    if (Array.isArray(v)) v.forEach(take);
    else if (v && typeof v === 'object' && !v.isObject3D) { take(v); if (!v.ch) Object.values(v).forEach((x) => (Array.isArray(x) ? x.forEach(take) : take(x))); }
  }
  return [...new Set(out)];
}

/**
 * build(store): a new room. keep(id): true for rooms that must stay (the one
 * you're in, a park you'll go back to, open-air parks seen from the street).
 * shown(): the scenes on screen besides the rooms (the street). onDrop(id).
 */
export function createRoomCache({ max, build, keep = () => false, shown = () => [], onDrop = () => {} }) {
  const rooms = new Map(); // id -> built, oldest first
  function drop(id) {
    const built = rooms.get(id);
    if (!built) return;
    rooms.delete(id);
    for (const o of roomPeople(built)) { o.tag.remove?.(); o.bubble?.remove?.(); o.bubble = null; }
    built.dispose?.();
    // Objects with GPU parts of their own: a mirror's render target
    // (Reflector), an InstancedMesh's instance buffers.
    built.scene?.traverse?.((o) => { if (o !== built.scene && typeof o.dispose === 'function') o.dispose(); });
    // Free what only this room used.
    const mine = gpuParts(built.scene);
    const used = { geo: new Set(), mat: new Set(), tex: new Set() };
    for (const s of shown()) gpuParts(s, used);
    for (const b of rooms.values()) gpuParts(b.scene, used);
    for (const g of mine.geo) if (!used.geo.has(g)) g.dispose();
    for (const m of mine.mat) if (!used.mat.has(m)) m.dispose();
    for (const t of mine.tex) if (!used.tex.has(t)) t.dispose();
    onDrop(id);
  }
  return {
    get(id) { return rooms.get(id); },
    values: () => rooms.values(),
    get size() { return rooms.size; },
    /** The room for store, built if needed; the oldest let go past max. */
    room(store) {
      let built = rooms.get(store.id);
      if (built) { rooms.delete(store.id); rooms.set(store.id, built); return built; } // (most recent last)
      built = build(store);
      rooms.set(store.id, built);
      for (const id of [...rooms.keys()]) {
        if (rooms.size <= max) break;
        if (id !== store.id && !keep(id)) drop(id);
      }
      return built;
    },
    drop,
  };
}
