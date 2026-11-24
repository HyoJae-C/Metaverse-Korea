// The Han River's bridges, up off the water (core/han-bridges.js finds them
// and their heights): a deck on piers, with parapets, the big roads' colour on
// top, for each; y(x, z) is how high you stand on one. Built at the start
// (they are seen from all along the river); one mesh per colour per bridge.
import * as THREE from 'three';
import { banpoBridge } from '../core/banpo-bridge.js';
import { bridgeY, deckHeight } from '../core/han-bridges.js';

export function createHanBridges({ scene, bridges = [] }) {
  const group = new THREE.Group();
  group.name = 'han-bridges';
  for (const b of bridges) {
    const g = new THREE.Group();
    banpoBridge(g, { pts: b.pts, w: b.w, top: b.top, ramp: b.ramp, pipes: false, y: (s) => deckHeight(b, s), deckColor: '#7f7c84', piers: !b.under, mid: b.track, arches: b.arches, archColor: b.archColor }); // (under: Jamsu, carried by Banpo Bridge's piers; mid, arches: Dongjak Bridge's subway and arches)
    group.add(g);
  }
  if (bridges.length) scene.add(group);
  return {
    group,
    y: (x, z) => (bridges.length ? bridgeY(bridges, x, z) : 0),
  };
}
