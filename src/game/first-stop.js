// Where new players start (region.json spawn.first): a spot in a district's
// own metres, turned into street metres with that district's offset, and the
// way to face (heading: compass degrees, 0 = north; the character faces +z at
// rotation 0, and north is -z). Null when the region has no first stop or its
// district isn't on the map, and everyone starts at the square as before.
export function firstStopSpot(region) {
  const f = region?.spawn?.first;
  if (!f || !Array.isArray(f.at)) return null;
  const d = (region.districts || []).find((it) => it.id === f.district);
  if (!d?.offset) return null;
  const [x, z] = [f.at[0] + d.offset[0], f.at[1] + d.offset[1]];
  if (![x, z].every(Number.isFinite)) return null;
  return { district: f.district, x, z, ry: Math.PI - ((f.heading ?? 0) * Math.PI) / 180 };
}
