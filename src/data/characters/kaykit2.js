// Character model pack: KayKit "Adventurers" 2.0 with the "Character
// Animations" 1.1 pack, both by Kay Lousberg (CC0, https://kaylousberg.com).
// Capes, hats, helmets and the quiver are stripped from the GLBs, and only
// the clips we use are kept (scripts/models/build-kaykit2.mjs).
// Everyday clothes: each model's own torso, legs and sleeves are swapped for
// modern clothes built in code (core/outfit-mesh.js), keeping its head.
// outfit: the shape (hem height, sleeve length, collar, pockets...);
// colors: fixed colours for roles ("top" and "bottom" default to the look's
// T-shirt and trouser colours); wear: atlas rules for what is left of the
// model's head (core/model-pack.js, applyWear), e.g. no earrings.
const HANDS = [['Head', '3,0', 'cut']]; // no earrings
const wear = ({ outfit, colors, rules = [] }) => ({
  outfit,
  rules: [...rules, ...HANDS],
  colors: { shoes: 0xffffff, sole: 0x5d5952, accent: 0x3b3a40, stitch: 0x1d1d22, ...colors },
});
// A crew-neck T-shirt, jeans and sneakers.
const TEE = { outfit: { hem: 0.6, sleeve: 0.42, collar: 'top' } };
// A denim jacket, open over a white T-shirt.
const JACKET = { outfit: { hem: 0.58, sleeve: 0.84, cuff: 'top', panel: 'accent', collar: 'top', bulk: 0.012 }, colors: { top: 0x7f9fcc, accent: 0xf4f1ea } };
// A grey hoodie with a front pocket, hood up.
const HOODIE = { outfit: { hem: 0.56, sleeve: 0.84, cuff: 'top', pocket: 'accent', bulk: 0.012 }, colors: { top: 0x9d9fa6, accent: 0x8a8c93 }, rules: [['Head', '1,1', 'top']] };
// A black long padded coat (롱패딩) down to the knees.
const LONG_PADDING = { outfit: { hem: 0.6, coat: 0.2, sleeve: 0.84, cuff: 'top', quilt: true, bulk: 0.03, zip: 'accent', collar: 'top' }, colors: { top: 0x2b2b31, accent: 0x55565e, stitch: 0x111114 } };
// A short cream puffer jacket.
const PUFFER = { outfit: { hem: 0.5, sleeve: 0.84, cuff: 'top', quilt: true, bulk: 0.045, zip: 'accent', collar: 'top' }, colors: { top: 0xe8e2d6, accent: 0x8d8a84, stitch: 0xb9b2a5 } };
// A sleeveless sports top, shorts and white socks.
const TANK = { outfit: { hem: 0.6, sleeve: 0, shorts: 0.3, socks: 'accent2' }, colors: { accent2: 0xf4f1ea } };
// A short-sleeved shirt with a collar and a button placket.
const SHIRT = { outfit: { hem: 0.6, sleeve: 0.5, cuff: 'top', collar: 'top', placket: 'accent' }, colors: { accent: 0xf4f1ea } };

export default {
  id: 'kaykit2',
  models: {
    // Everyone wears everyday clothes: the adventurer outfits repainted part
    // by part (core/model-pack.js, applyWear). "top" takes the T-shirt
    // colour picked at the start (look.shirt), "bottom" the trousers colour.
    // basic: a T-shirt, jeans and sneakers on the rogue.
    basic: { url: 'models/kaykit2/rogue.glb', emoji: '👕', wear: wear(TEE) },
    // The rest are sold at the clothes shop (the old costume ids are kept so
    // bought items and saved looks still work).
    rogue: { url: 'models/kaykit2/rogue.glb', emoji: '🧥', wear: wear(JACKET) },
    hooded: { url: 'models/kaykit2/rogue_hooded.glb', emoji: '🧢', wear: wear(HOODIE), hood: true },
    mage: { url: 'models/kaykit2/mage.glb', emoji: '🧥', wear: wear(LONG_PADDING) },
    knight: { url: 'models/kaykit2/knight.glb', emoji: '🧥', wear: wear(PUFFER) },
    barbarian: { url: 'models/kaykit2/barbarian.glb', emoji: '🎽', wear: wear(TANK) },
    ranger: { url: 'models/kaykit2/ranger.glb', emoji: '👔', wear: wear(SHIRT) },
  },
  // Every model shares one rig ("Rig_Medium"); the clips are in these files.
  // The first ones are needed right away, the rest load in the background.
  animFiles: [
    { url: 'models/kaykit2/anims-general.glb', eager: true },
    { url: 'models/kaykit2/anims-movementbasic.glb', eager: true },
    { url: 'models/kaykit2/anims-simulation.glb', eager: true },
    { url: 'models/kaykit2/anims-tools.glb' },
    { url: 'models/kaykit2/anims-combatmelee.glb' },
  ],
  scale: 0.57, // model is ~2.2 units tall; our characters are ~1.25 m
  sit: { y: -0.02, z: 0.24 }, // offset on a café chair (metres, after scale)
  ride: { y: 0.24, z: 0.16 }, // offset on a bike
  lie: { y: 0.6, z: 0 }, // offset lying on a clinic bed
  // On a bike the sitting clip is bent a little more: lean forward, head down,
  // arms reaching for the handlebar (radians added to the clip, per bone).
  ridePose: { spine: [0.35, 0, 0], head: [0.15, 0, 0], upperarml: [-1.25, 0, 0], upperarmr: [-1.25, 0, 0], lowerarml: [-0.25, 0, 0], lowerarmr: [-0.25, 0, 0] },
  // Driving a car: sit upright, only the arms reach forward to the wheel.
  carPose: { upperarml: [-1.15, 0, 0], upperarmr: [-1.15, 0, 0], lowerarml: [-0.35, 0, 0], lowerarmr: [-0.35, 0, 0] },
  hide: /Cape|Hat|Helmet|Visor|Quiver/i, // any leftover non-body meshes
  bones: { head: 'head', chest: 'chest' },
  // Cells of the 8×4 colour atlas (column, row from the top) that the hair
  // salon and the clinic repaint: hair (and beards), skin, and eyes.
  atlas: { cols: 8, rows: 4, hair: [1, 0], skin: [0, 0], eyes: [2, 0] },
  // Our action names -> clip names in the pack.
  anims: {
    idle: 'Idle_A', walk: 'Walking_A', run: 'Running_A', sit: 'Sit_Chair_Idle', ride: 'Sit_Chair_Idle',
    wave: 'Waving', cheer: 'Cheering', laugh: 'Jump_Full_Short', clap: 'Use_Item', bow: 'PickUp',
    angry: 'Melee_Unarmed_Attack_Punch_A', shrug: 'Interact', cry: 'Sit_Floor_Idle',
    // Activities: held as a pose while doing them (gym, fishing, sauna).
    pushup: 'Push_Ups', situp: 'Sit_Ups', fish: 'Fishing_Idle', cast: 'Fishing_Cast', reel: 'Fishing_Reeling', catch: 'Fishing_Catch', lie: 'Lie_Idle', floor: 'Sit_Floor_Idle',
  },
};
