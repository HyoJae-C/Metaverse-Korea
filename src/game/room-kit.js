// What main.js needs only while inside a particular room (the museums' lift
// and paintings, the war memorial's guide, the haunted house's door, the
// pool's lifeguard, the runway's and the vintage rack's words): it comes with the room builder (game/interior-loader.js),
// not in the first download. Read through roomKit() there.
export { nearestPainting, museumFloorStore, floorOf } from '../core/museum.js';
export { MUSEUM_TEXT } from '../ui/museum-ui.js';
export { GUIDE_LOOK, MEMORIAL_TEXT, MEMORIAL_FLOORS, HALLS as MEMORIAL_HALLS, DONATED } from '../data/war-memorial.js';
export { HAUNT_STORE, HAUNT_SPOT } from '../core/haunted.js';
export { LIFEGUARD_LOOK } from '../core/pool-hall.js';
export { RUNWAY_TEXT } from '../ui/runway-ui.js';
export { RESALE_TEXT } from '../ui/resale-ui.js';
export { CathedralMass, CATHEDRAL_TEXT } from '../core/cathedral-mass.js';
