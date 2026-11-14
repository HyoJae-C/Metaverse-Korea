// The base map's parks and woods (region.json "baseGreen", scripts/build-base.mjs):
// only a colour on closed land, so they are not in the download the game
// waits for. Fetched once the street is up, then painted and put on the map.
import { makeBaseAreas } from '../core/world.js';

export function createBaseGreen({ region, fetchJson, map, scene, lowSpec }) {
  if (!region.baseGreen) return Promise.resolve(0);
  return fetchJson(region.baseGreen).then((green) => {
    const areas = (green.areas || []).map((a) => ({ ...a, d: 'base' }));
    const world = scene.getObjectByName('world') || scene;
    world.add(...makeBaseAreas(areas, lowSpec));
    map.areas.push(...areas); // (the map and the minimap see the list grow)
    return areas.length;
  }).catch(() => 0); // (no green: the land stays grey)
}
