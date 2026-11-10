// A bowling pin's real outline, turned on a lathe: a narrow base, the wide
// belly a third of the way up, the thin neck with its two red stripes and
// the round head (USBC sizes, metres: 38.1 cm tall, 12.1 cm across the
// belly). One geometry with vertex colours, so a pin is one mesh (or one
// instance) in the room's racks (core/activity-rooms.js) and in a game
// (game/bowling-view.js). The origin is the middle of the base.
import * as THREE from 'three';

const WHITE = new THREE.Color('#fbfaf6'), RED = new THREE.Color('#d9473c');
// [radius, height, red] up the pin. A stripe's edges come twice (white and
// red at the same height) so the stripe stays sharp.
const OUTLINE = [
  [0, 0], [0.0258, 0], [0.036, 0.02], [0.046, 0.045], [0.054, 0.075], [0.0595, 0.105], [0.0605, 0.12],
  [0.059, 0.142], [0.054, 0.17], [0.045, 0.198], [0.035, 0.222],
  [0.0295, 0.234], [0.0295, 0.234, 1], [0.0255, 0.25, 1], [0.0255, 0.25],
  [0.0235, 0.258], [0.0232, 0.264], [0.0232, 0.264, 1], [0.024, 0.278, 1], [0.024, 0.278],
  [0.028, 0.298], [0.0315, 0.32], [0.0324, 0.335], [0.03, 0.352], [0.024, 0.367], [0.014, 0.377], [0, 0.381],
];

let geo = null;
export function pinGeometry() {
  if (geo) return geo;
  const pts = OUTLINE.map(([r, y]) => new THREE.Vector2(r, y));
  geo = new THREE.LatheGeometry(pts, 14);
  const n = pts.length, count = geo.attributes.position.count;
  const col = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) (OUTLINE[v % n][2] ? RED : WHITE).toArray(col, v * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
export const pinMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
