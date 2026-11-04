// Character model pack: KayKit "Adventurers" 2.0 with the "Character
// Animations" 1.1 pack, both by Kay Lousberg (CC0, https://kaylousberg.com).
// Capes, hats, helmets and the quiver are stripped from the GLBs, and only
// the clips we use are kept (scripts/models/build-kaykit2.mjs).
// Everyday outfits: [mesh, 'col,row' atlas cell ('*' any), role, yMin, yMax].
// Roles are listed in core/model-pack.js (WEAR_CELLS).
const wear = ({ rules, colors }) => ({ rules, colors: { shoes: 0xf1eee8, accent: 0x3b3a40, ...colors } });
// The rogue's legs: trousers down to the ankle, then sneakers.
const ROGUE_LEGS = [['Leg', '7,1', 'bottom'], ['Leg', '3,2', 'bottom', -0.45], ['Leg', '3,2', 'shoes']];
// A T-shirt and jeans: short sleeves (gloves and bracers bared), the tunic's
// hem and belt become the top of the trousers.
const TEE = {
  rules: [
    ['Arm', '0,1', 'top'], ['Arm', '5,0', 'top'], ['Arm', '1,1', 'skin'], ['Arm', '7,2', 'skin'], ['Arm', '3,0', 'skin'],
    ['Body', '0,1', 'top', -0.45], ['Body', '0,1', 'bottom'], ['Body', '1,1', 'top'], ['Body', '5,0', 'top'],
    ['Body', '6,0', 'bottom'], ['Body', '3,0', 'bottom'], ['Body', '7,1', 'bottom'],
    ...ROGUE_LEGS,
  ],
};
// A denim jacket with a white T-shirt collar showing.
const JACKET = {
  colors: { top: 0x7f9fcc, accent: 0xf4f1ea },
  rules: [
    ['Arm', '0,1', 'top'], ['Arm', '5,0', 'top'], ['Arm', '1,1', 'top'], ['Arm', '7,2', 'top'], ['Arm', '3,0', 'top'],
    ['Body', '0,1', 'top', -0.45], ['Body', '0,1', 'bottom'], ['Body', '1,1', 'accent'], ['Body', '5,0', 'top'],
    ['Body', '6,0', 'bottom'], ['Body', '3,0', 'bottom'], ['Body', '7,1', 'bottom'],
    ...ROGUE_LEGS,
  ],
};
// A grey hoodie, hood up (the ninja's mask is left off).
const HOODIE = {
  colors: { top: 0x9d9fa6 },
  rules: [
    ['Mask', '*', 'hide'],
    ['Head', '1,1', 'top'],
    ...JACKET.rules.map((r) => (r[0] === 'Body' && r[1] === '1,1' ? ['Body', '1,1', 'top'] : r)),
  ],
};
// A black long padded coat (롱패딩) over the mage's robe, sneakers below.
const LONG_PADDING = {
  colors: { top: 0x2b2b31, accent: 0x55565e },
  rules: [
    ['Arm', '0,1', 'top'], ['Arm', '4,0', 'top'],
    ['Body', '0,1', 'top'], ['Body', '4,0', 'top'], ['Body', '5,0', 'top'], ['Body', '0,2', 'top'], ['Body', '2,2', 'top'],
    ['Body', '7,1', 'accent'], ['Body', '3,0', 'accent'],
    ...ROGUE_LEGS,
  ],
};
// A short puffer jacket on the knight: the plates become the padding.
const PUFFER = {
  colors: { top: 0xe8e2d6, accent: 0x6b6a70 },
  rules: [
    ['Arm', '*', 'skin', 0.72, Infinity, 'hand'], ['Arm', '*', 'top'],
    ['Body', '3,0', 'top', -0.5], ['Body', '3,0', 'bottom'], ['Body', '7,0', 'top'], ['Body', '7,1', 'accent'],
    ['Body', '0,1', 'cut'], ['Body', '1,1', 'cut'], ['Body', '2,1', 'bottom'], ['Body', '6,0', 'bottom'], // (no rosette)
    ['Leg', '7,0', 'cut'], ['Leg', '3,0', 'bottom', -0.55], ['Leg', '3,0', 'shoes'], ['Leg', '*', 'bottom'], // (no knee plates)
  ],
};
// A sleeveless sports top and shorts on the barbarian, bare calves.
const TANK = {
  rules: [
    ['Arm', '2,1', 'skin'], ['Arm', '3,0', 'skin'], ['Arm', '5,1', 'skin'], ['Arm', '6,0', 'skin'], ['Arm', '7,2', 'skin'],
    ['Body', '0,0', 'top'], ['Body', '7,0', 'cut'], ['Body', '6,1', 'top'], ['Body', '1,3', 'top'],
    ['Body', '2,1', 'bottom'], ['Body', '3,0', 'bottom'], ['Body', '6,0', 'bottom'], ['Body', '7,1', 'bottom'],
    ['Leg', '2,1', 'bottom'], ['Leg', '7,1', 'bottom'], ['Leg', '6,1', 'accent2'], ['Leg', '3,1', 'shoes'],
    ['Leg', '3,2', 'skin', -0.45], ['Leg', '3,2', 'shoes'],
  ],
  colors: { accent2: 0xf4f1ea },
};
// A casual shirt with a bandana on the ranger.
const SHIRT = {
  rules: [
    ['Arm', '1,1', 'top'], ['Arm', '3,0', 'top'], ['Arm', '6,0', 'top'], ['Arm', '7,0', 'top'], ['Arm', '7,2', 'skin'],
    ['Body', '5,0', 'top'], ['Body', '6,0', 'top'], ['Body', '3,0', 'bottom'], ['Body', '7,0', 'bottom'], ['Body', '7,1', 'bottom'],
    ...ROGUE_LEGS,
  ],
};

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
