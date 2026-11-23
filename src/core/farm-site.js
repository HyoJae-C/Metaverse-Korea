// The weekend farm's glasshouse, in its own metres: x across, z along, the
// door at +z. The map's 'farm' landmark (scripts/build-farm.mjs) says where
// it stands and which way it turns. No DOM, no three.js.
import { FARM_BEDS } from './farm.js';

export const FARM_HOUSE = { hw: 2.7, hl: 6.9, wall: 2.3, ridge: 3.4, door: 1.7 }; // half width, half length, eaves, ridge, door width
export const BED = { w: 1.45, l: 1.65 }; // one bed's soil
// Two rows of six with the aisle between them, bed 0 by the door on the left.
export const bedSpot = (i) => {
  const row = i % 2, k = Math.floor(i / 2);
  return [row ? 1.5 : -1.5, 4.9 - k * 1.96];
};
export const BED_SPOTS = Array.from({ length: FARM_BEDS }, (_, i) => bedSpot(i));
export const STALL = { x: 2.3, z: 8.3 }; // the stand, outside by the door
export const STALL_STAND = [2.3, 10]; // where you stand at it

// World metres from the house's own: spot { x, z, ry }.
export function farmToWorld(spot, lx, lz) {
  const s = Math.sin(spot.ry || 0), c = Math.cos(spot.ry || 0);
  return [spot.x + lx * c + lz * s, spot.z - lx * s + lz * c];
}
// The other way.
export function farmToLocal(spot, x, z) {
  const s = Math.sin(spot.ry || 0), c = Math.cos(spot.ry || 0), dx = x - spot.x, dz = z - spot.z;
  return [dx * c - dz * s, dx * s + dz * c];
}
// The bed you stand at (in the aisle or beside it): its number, or -1.
export function bedNear(lx, lz, reach = 1.5) {
  let best = -1, bd = reach;
  BED_SPOTS.forEach(([bx, bz], i) => {
    const d = Math.hypot(lx - bx * 0.55, lz - bz); // (measured from the bed's aisle side: you stand in the aisle)
    if (d < bd && Math.sign(lx || -1) === Math.sign(bx)) { bd = d; best = i; }
  });
  return best;
}
